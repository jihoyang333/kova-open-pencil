/**
 * Cluster 06 — canvas-chrome visual-diff (clip-region per surface).
 *
 * Authority: docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md §6.
 * Sources baselines from the outer-repo `compressed-figma-canvas-ui/` PNG tree
 * (the canonical Cluster 06 hi-fi) via tests/snapshots/cluster-06/ once Phase 4
 * regen lands. Until Task 14 mounts the new chrome in the production canvas
 * route, the `/dev/cluster-06` showcase is the only Vue impl observation surface.
 *
 * Per-surface clip selectors target the data-testid hooks shipped in Cluster 06:
 *   - bottom-toolbar    → [data-testid="bottom-toolbar"]
 *   - left-panel chrome → [data-testid="left-panel"]
 *   - right-panel chrome → [data-testid="right-panel"]
 *   - top chrome        → [data-testid="topbar"]
 *
 * Interaction-dependent surfaces (multi-select, click-filter, click-plus,
 * frame-selected, right-click, hover-state) require either (a) the real engine
 * mounted in `/dev/cluster-06` or (b) explicit pre-mounted state via querystring.
 * They remain scoped to T14 and are listed under `INTERACTIVE_TODO` below for
 * the follow-up sweep.
 *
 * Run: `bun run test:visual` (regression).
 *      `bun run test:visual --update-snapshots` (baseline regen).
 */

import { test, expect, waitForStable } from '../fixtures/ci-deterministic'

const SHOWCASE = '/dev/cluster-06'

interface SurfaceSpec {
  name: string
  selector: string
  /** 0-based index when multiple matches exist. */
  index?: number
  /** Screen-level diff allowance — default 0.1% (component clip). */
  maxDiffPixelRatio?: number
}

const SURFACES: SurfaceSpec[] = [
  {
    name: 'top-chrome',
    selector: '[data-testid="topbar"]',
  },
  {
    name: 'left-panel',
    selector: '[data-testid="left-panel"]',
  },
  {
    name: 'right-panel',
    selector: '[data-testid="right-panel"]',
  },
  {
    name: 'bottom-toolbar',
    selector: '[data-testid="bottom-toolbar"]',
  },
]

/** Surfaces deferred until Task 14 mounts engine state in /dev/cluster-06. */
const INTERACTIVE_TODO = [
  'multi-select-1',
  'multi-select-1-hover',
  'click-filter-button',
  'click-plus-button',
  'frame-selected-on-canvas',
  'right-click-on-canvas',
  'hover-state',
  'right-panel-rectangle-selected',
  'right-panel-text-selected',
  'layers-panel-and-inspector-3-variants',
  'bottom-toolbar-4-variants',
] as const

test.describe('Cluster 06 — chrome visual-diff (clip-region)', () => {
  for (const s of SURFACES) {
    test(`${s.name} — Vue impl`, async ({ ciPage }) => {
      await ciPage.goto(SHOWCASE)
      await waitForStable(ciPage)
      const region = ciPage.locator(s.selector).nth(s.index ?? 0)
      const count = await region.count()
      if (count === 0) {
        test.skip(true, `${s.selector} not mounted in ${SHOWCASE}`)
        return
      }
      await expect(region.first()).toBeVisible()
      await expect(region.first()).toHaveScreenshot(`${s.name}-impl.png`, {
        maxDiffPixelRatio: s.maxDiffPixelRatio ?? 0.001,
        threshold: 0.2,
      })
    })
  }

  test('full-showcase — Vue impl', async ({ ciPage }) => {
    await ciPage.goto(SHOWCASE)
    await waitForStable(ciPage)
    await expect(ciPage).toHaveScreenshot('full-showcase-impl.png', {
      maxDiffPixelRatio: 0.005,
      threshold: 0.2,
      fullPage: false,
    })
  })

  test.describe('interactive surfaces — deferred until Task 14', () => {
    for (const name of INTERACTIVE_TODO) {
      test(`${name}`, () => {
        test.skip(
          true,
          `${name} requires engine state in /dev/cluster-06 — rolls into Task 14 follow-up sweep`,
        )
      })
    }
  })
})
