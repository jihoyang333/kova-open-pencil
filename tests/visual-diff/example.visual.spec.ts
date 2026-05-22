/**
 * Example visual-diff spec — Mandate 4 gate.
 *
 * Demonstrates the per-screen flow:
 *   1. Snapshot the in-repo hi-fi mockup → becomes the baseline.
 *   2. Snapshot the Vue impl at the same viewport → diffed against the
 *      mockup baseline.
 *
 * Run via `bun run test:visual` (NOT enabled until the dev-server static-serve
 * for `/dev/hifi/**` is wired — see TODO in `fixtures/ci-deterministic.ts`).
 *
 * Per IMPLEMENTATION_PROMPT.md §6:
 *   - This spec uses the cluster-level threshold (0.5% screen).
 *   - Per-component specs (e.g. `KovaToast` in the component gallery) should
 *     tighten to `maxDiffPixelRatio: 0.001` (0.1%).
 *
 * Replace `cluster-xx` + filename with the real cluster + surface when
 * authoring a real spec. This file's filename ends in `.visual.spec.ts` so it
 * IS picked up by `tests/visual-diff/playwright.config.ts`; rename if you do
 * not want this example running in CI.
 */

import { test, expect, waitForStable } from './fixtures/ci-deterministic'

test.skip('example — Cluster XX <surface> matches hi-fi', async ({ ciPage }) => {
  // 1. Snapshot the in-repo mockup as baseline.
  await ciPage.goto(
    '/dev/hifi/states/chunk-b2/Kova%20Hi-Fi%2016%20Toasts%20%2B%20Missing%20Fonts%20-%20Dark.html?ci=1',
  )
  await waitForStable(ciPage)
  await expect(ciPage).toHaveScreenshot('cluster-xx-surface-mockup.png', {
    maxDiffPixelRatio: 0.005,
    mask: [ciPage.locator('[data-test-volatile="avatar"]')],
  })

  // 2. Snapshot the Vue impl, diffed against the mockup baseline.
  await ciPage.goto('/dev/cluster-xx/surface')
  await waitForStable(ciPage)
  await expect(ciPage).toHaveScreenshot('cluster-xx-surface-impl.png', {
    maxDiffPixelRatio: 0.005,
    mask: [ciPage.locator('[data-test-volatile="avatar"]')],
  })
})
