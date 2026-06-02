/**
 * Cluster 09 — Version-history + Trash visual-diff.
 *
 * Impl-baseline regression gate against /dev/cluster-09 (hi-fi 17 + 15). Each
 * surface is screenshotted at 1440px; volatile regions (brand avatar initials,
 * relative timestamps) are masked per IMPLEMENTATION_PROMPT.md §6/§10.
 *
 *   bun run test:visual                     # regression
 *   bun run test:visual --update-snapshots  # regen baselines after design change
 *
 * Pre-req: Vite dev server on localhost:1420.
 */

import { test, expect, waitForStable } from '../fixtures/ci-deterministic'

const SHOWCASE = '/dev/cluster-09'
const COMPONENT = { maxDiffPixelRatio: 0.001, threshold: 0.2 }

test.describe('Cluster 09 — version-history + trash', () => {
  test('populated timeline panel (17.1 / 17.3)', async ({ ciPage }) => {
    await ciPage.goto(SHOWCASE)
    await waitForStable(ciPage)
    const rail = ciPage.locator('[data-testid="rail-populated"]')
    await expect(rail).toBeVisible()
    await expect(rail).toHaveScreenshot('panel-populated.png', {
      ...COMPONENT,
      mask: [rail.locator('.av'), rail.locator('.by')],
    })
  })

  test('empty state (17.11)', async ({ ciPage }) => {
    await ciPage.goto(SHOWCASE)
    await waitForStable(ciPage)
    const rail = ciPage.locator('[data-testid="rail-empty"]')
    await expect(rail.locator('.empty-pane')).toBeVisible()
    await expect(rail).toHaveScreenshot('panel-empty.png', COMPONENT)
  })

  test('add-version dialog (17.8 / 17.9)', async ({ ciPage }) => {
    await ciPage.goto(SHOWCASE)
    await waitForStable(ciPage)
    await ciPage.getByText('Open Add dialog').click()
    // Two panels are mounted in the showcase; each hosts an AddVersionDialog
    // bound to the shared store flag. Screenshot the first instance.
    const dlg = ciPage.locator('.dlg.sm').first()
    await expect(dlg).toBeVisible()
    await expect(dlg).toHaveScreenshot('dialog-add.png', COMPONENT)
  })

  test('restore confirm (17.10)', async ({ ciPage }) => {
    await ciPage.goto(SHOWCASE)
    await waitForStable(ciPage)
    await ciPage.getByText('Open Restore confirm').click()
    const dlg = ciPage.locator('.dlg.sm')
    await expect(dlg).toBeVisible()
    await expect(dlg).toHaveScreenshot('dialog-restore.png', {
      ...COMPONENT,
      mask: [dlg.locator('.dlg-foot .l')],
    })
  })

  test('trash confirm (B13.1) — destructive red CTA', async ({ ciPage }) => {
    await ciPage.goto(SHOWCASE)
    await waitForStable(ciPage)
    await ciPage.getByText('Open Trash confirm').click()
    const dlg = ciPage.locator('.dlg.sm')
    await expect(dlg).toBeVisible()
    await expect(dlg).toHaveScreenshot('dialog-trash.png', COMPONENT)
  })
})
