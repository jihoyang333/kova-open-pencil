/**
 * Playwright config — visual-diff gate (Mandate 4).
 *
 * Per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §6:
 *   - Per-component diff (gallery): ≤ 0.1% pixel ratio
 *   - Per-screen diff (full hi-fi):  ≤ 0.5% pixel ratio
 *
 * Defaults below set the screen-level threshold. Per-component specs override
 * via `await expect(page).toHaveScreenshot('...', { maxDiffPixelRatio: 0.001 })`.
 *
 * Threshold semantics:
 *   - `maxDiffPixelRatio` — fraction of total pixels that may differ.
 *   - `threshold` — per-pixel color difference tolerance (0–1). 0.2 absorbs
 *     anti-aliasing noise between mockup font rendering + Vue build rendering.
 *
 * Determinism:
 *   - Fonts + icons rerouted to local copies via `fixtures/ci-deterministic.ts`.
 *   - Animations disabled via injected stylesheet + Playwright config.
 *   - `await waitForStable(page)` before every screenshot.
 *
 * Run via `bun run test:visual`.
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.visual\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005, // 0.5% screen-level default
      threshold: 0.2, // per-pixel color tolerance — anti-aliasing absorber
      animations: 'disabled',
    },
  },
  use: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    baseURL: process.env['VISUAL_DIFF_BASE_URL'] ?? 'http://localhost:1420',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'visual-diff-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
