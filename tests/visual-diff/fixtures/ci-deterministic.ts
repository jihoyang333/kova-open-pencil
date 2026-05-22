/**
 * CI-deterministic Playwright fixture for visual-diff gate (Mandate 4).
 *
 * Per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §10:
 * the hi-fi HTML mockups under `design-system/hifi/<cluster>/` are NOT edited
 * to bake fonts or icons inline. Instead, this fixture makes any page (mockup
 * OR Vue impl) render deterministically at gate-run-time:
 *
 *   1. Intercept Google Fonts + Lucide CDN network requests, serve local copies.
 *   2. Disable animations + transitions via injected stylesheet.
 *   3. Add a `.ci` class to <html> so mockups that key hover-state CSS off
 *      `:not(.ci)` neutralize hover.
 *   4. `waitForStable(page)` helper awaits `document.fonts.ready` + networkidle
 *      before screenshot.
 *
 * --------------------------------------------------------------------------
 * Dev-server static-serve: wired via `src/dev/hifi-serve-plugin.ts` (option b).
 * Vite serves `design-system/hifi/**` at `/dev/hifi/**` and
 * `design-system/canonical/**` at `/dev/canonical/**`. Dev-only.
 * --------------------------------------------------------------------------
 *
 * Local fixture assets (create these as part of Phase 2 token setup per
 * IMPLEMENTATION_PROMPT.md §4 step 3):
 *
 *   public/fonts/inter/Inter-Variable.woff2     (Inter 400/500/600/700 variable)
 *   public/vendor/lucide-sprite.svg             (Lucide icon SVG sprite)
 *
 * If either is missing the fixture aborts the network request so the test
 * fails loudly rather than silently rendering a non-deterministic fallback
 * font / icon.
 */

import { test as base, type Page } from '@playwright/test'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

// Resolve fixture asset roots relative to the repo root (process.cwd() when
// Playwright is launched from `kova-open-pencil-1/`).
const REPO_ROOT = process.cwd()
const FONT_DIR = path.join(REPO_ROOT, 'public/fonts/inter')
const LUCIDE_SPRITE = path.join(REPO_ROOT, 'public/vendor/lucide-sprite.svg')

interface CiFixtures {
  ciPage: Page
}

export const test = base.extend<CiFixtures>({
  ciPage: async ({ page }, use) => {
    // Route Google Fonts requests to local Inter
    await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, async (route) => {
      const url = route.request().url()
      if (url.includes('Inter')) {
        const fontFile = path.join(FONT_DIR, 'Inter-Variable.woff2')
        try {
          const body = await fs.readFile(fontFile)
          await route.fulfill({ status: 200, contentType: 'font/woff2', body })
          return
        } catch {
          await route.abort()
          return
        }
      }
      // CSS import requests (fonts.googleapis.com/css2?family=Inter:...)
      if (url.includes('googleapis.com') && url.includes('css')) {
        const css = `
          @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 100 900;
            font-display: swap;
            src: url('/fonts/inter/Inter-Variable.woff2') format('woff2');
          }
        `
        await route.fulfill({ status: 200, contentType: 'text/css', body: css })
        return
      }
      await route.continue()
    })

    // Route Lucide CDN to local sprite
    await page.route(/unpkg\.com.*lucide|cdn\.jsdelivr\.net.*lucide/, async (route) => {
      try {
        const body = await fs.readFile(LUCIDE_SPRITE)
        await route.fulfill({ status: 200, contentType: 'image/svg+xml', body })
      } catch {
        await route.abort()
      }
    })

    // Tag the document so mockup CSS can neutralize hover-dependent state
    // via `body:not(.ci) .selector:hover { ... }`.
    await page.addInitScript(() => {
      document.documentElement.classList.add('ci')
    })

    // Disable animations + transitions + caret blink globally.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `,
    })

    await use(page)
  },
})

export { expect } from '@playwright/test'

/**
 * Await font + network stability before screenshotting. Belt-and-suspenders
 * one-frame wait to absorb late layout commits.
 */
export async function waitForStable(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(50)
}
