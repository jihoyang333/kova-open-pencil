/**
 * Cluster 01 — auth surface visual-diff.
 *
 * Per-screen + per-element diff for A15.01 Signup + A15.02 Login.
 * Tightens IMPLEMENTATION_PROMPT.md §6 screen-level threshold to 0.5%.
 *
 * Run: `bun run test:visual` (regression).
 *      `bun run test:visual --update-snapshots` (regen baselines).
 *
 * Pre-req: dev server up on localhost:1420.
 */

import { expect, test, waitForStable } from '../fixtures/ci-deterministic'

const HIFI_AUTH = '/dev/hifi/auth/Kova%20Hi-Fi%20A15%20Auth%20-%20Light.html?ci=1'

test('A15.01 Signup card — hi-fi baseline', async ({ ciPage }) => {
  await ciPage.goto(HIFI_AUTH)
  await waitForStable(ciPage)
  const card = ciPage.locator('[data-screen-label="01 Signup"] .auth-card').first()
  await expect(card).toHaveScreenshot('c01-a15-01-signup-card-mockup.png', {
    maxDiffPixelRatio: 0.001,
  })
})

test('Vue impl /signup card matches A15.01 mockup', async ({ ciPage }) => {
  await ciPage.goto('/signup')
  await waitForStable(ciPage)
  const card = ciPage.locator('section[class*="rounded-"][class*="border-line"][class*="bg-page"]').first()
  await expect(card).toHaveScreenshot('c01-vue-signup-card-impl.png', {
    maxDiffPixelRatio: 0.001,
  })
})

test('A15.02 Login card — hi-fi baseline', async ({ ciPage }) => {
  await ciPage.goto(HIFI_AUTH)
  await waitForStable(ciPage)
  const card = ciPage.locator('[data-screen-label="02 Login"] .auth-card').first()
  await expect(card).toHaveScreenshot('c01-a15-02-login-card-mockup.png', {
    maxDiffPixelRatio: 0.001,
  })
})

test('Vue impl /login card matches A15.02 mockup', async ({ ciPage }) => {
  await ciPage.goto('/login')
  await waitForStable(ciPage)
  const card = ciPage.locator('section[class*="rounded-"][class*="border-line"][class*="bg-page"]').first()
  await expect(card).toHaveScreenshot('c01-vue-login-card-impl.png', {
    maxDiffPixelRatio: 0.001,
  })
})
