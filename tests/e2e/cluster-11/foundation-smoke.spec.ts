/**
 * Cluster 11 — Foundation golden-path smoke.
 *
 * Covers every section of /dev/cluster-11:
 *   1. Page load
 *   2. Toast variants (auto-dismiss vs sticky)
 *   3. Modal open / close
 *   4. Menu / Popover / Tooltip
 *   5. Segmented control
 *   6. Confirm modal (destructive typed-confirm)
 *   7. Error pages (404 / 500 / network-unreachable)
 *   8. Theme attribute on <html>
 *
 * Missing data-testid callouts are flagged inline with TODO comments.
 */

import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = 'http://localhost:1420'
const SHOWCASE = `${BASE}/dev/cluster-11`

/** Navigate to the showcase, bypassing any possible auth redirect. */
async function gotoShowcase(page: Page): Promise<void> {
  await page.goto(SHOWCASE, { waitUntil: 'networkidle' })
  // If the router redirected away (e.g. to /login), force-navigate back.
  if (!page.url().includes('/dev/cluster-11')) {
    await page.goto(SHOWCASE, { waitUntil: 'networkidle' })
  }
}

/** Returns all toasts currently visible in the toast stack. */
function toastStack(page: Page) {
  // ToastStack renders a fixed div with class "toast-stack" (no data-testid).
  // Each KovaToast has role="status" and data-variant=<variant>.
  // TODO: add data-testid="toast-stack" to ToastStack.vue for a stable anchor.
  return page.locator('[role="status"]')
}

/** Returns the toast with the given variant. */
function toastByVariant(page: Page, variant: string) {
  return page.locator(`[role="status"][data-variant="${variant}"]`)
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Cluster 11 — Foundation smoke', () => {
  test.describe.configure({ mode: 'serial' })

  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    await page.close()
  })

  // -------------------------------------------------------------------------
  // 1. Page load
  // -------------------------------------------------------------------------
  test('1 — page loads, heading visible, no critical console errors', async () => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await gotoShowcase(page)

    // Heading — the showcase h1 says "Cluster 11 Showcase"
    await expect(page.locator('h1')).toContainText('Cluster 11')

    // Filter out expected Supabase / network breadcrumb warnings — only fail
    // on unexpected JS errors.
    const unexpected = consoleErrors.filter(
      (e) =>
        !e.includes('supabase') &&
        !e.includes('GoTrueClient') &&
        !e.includes('network') &&
        !e.includes('fetch') &&
        !e.includes('Failed to fetch') &&
        !e.includes('ERR_NAME_NOT_RESOLVED')
    )
    expect(unexpected, `Unexpected console errors: ${unexpected.join('\n')}`).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // 2. Toast section — each variant fires and appears
  // -------------------------------------------------------------------------

  // Auto-dismiss variants: success, error, info, warning, ai-gen (aiGen button)
  // Per store.ts: STICKY_VARIANTS = Set(['action', 'progress'])
  // Showcase buttons (from Cluster11Showcase.vue):
  //   "Success" → toast.success  → variant="success"
  //   "Error"   → toast.error    → variant="error"
  //   "Info"    → toast.info     → variant="info"
  //   "Warning" → toast.warning  → variant="warning"
  //   "AI"      → toast.aiGen    → variant="ai-gen"
  //   "Action"  → toast.action   → variant="action" (sticky)

  test('2a — success toast appears and auto-dismisses', async () => {
    await gotoShowcase(page)
    const btn = page.getByRole('button', { name: 'Success' })
    await btn.click()
    const t = toastByVariant(page, 'success')
    await expect(t).toBeVisible()
    // Should auto-dismiss within 6s (5s + 1s grace)
    await expect(t).not.toBeVisible({ timeout: 7000 })
  })

  test('2b — error toast appears and auto-dismisses', async () => {
    const btn = page.getByRole('button', { name: 'Error' })
    await btn.click()
    const t = toastByVariant(page, 'error')
    await expect(t).toBeVisible()
    await expect(t).not.toBeVisible({ timeout: 7000 })
  })

  test('2c — info toast appears and auto-dismisses', async () => {
    const btn = page.getByRole('button', { name: 'Info' })
    await btn.click()
    const t = toastByVariant(page, 'info')
    await expect(t).toBeVisible()
    await expect(t).not.toBeVisible({ timeout: 7000 })
  })

  test('2d — warning toast appears and auto-dismisses', async () => {
    const btn = page.getByRole('button', { name: 'Warning' })
    await btn.click()
    const t = toastByVariant(page, 'warning')
    await expect(t).toBeVisible()
    await expect(t).not.toBeVisible({ timeout: 7000 })
  })

  test('2e — AI toast (ai-gen) appears and auto-dismisses', async () => {
    const btn = page.getByRole('button', { name: 'AI' })
    await btn.click()
    const t = toastByVariant(page, 'ai-gen')
    await expect(t).toBeVisible()
    await expect(t).not.toBeVisible({ timeout: 7000 })
  })

  test('2f — action toast is sticky and must be dismissed manually', async () => {
    const btn = page.getByRole('button', { name: 'Action' })
    await btn.click()
    const t = toastByVariant(page, 'action')
    await expect(t).toBeVisible()
    // Wait 6s — sticky variant must NOT have auto-dismissed
    await page.waitForTimeout(6000)
    await expect(t).toBeVisible()
    // Now dismiss it explicitly via the X button
    await t.locator('[data-test="dismiss"]').click()
    await expect(t).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 3. Modal — open / close
  // -------------------------------------------------------------------------
  test('3 — modal opens on trigger click, closes on X button', async () => {
    await gotoShowcase(page)
    // TODO: add data-testid="modal-trigger" to the "Open modal (md)" button in
    // Cluster11Showcase.vue so the locator is unambiguous.
    const trigger = page.getByRole('button', { name: 'Open modal (md)' })
    await trigger.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()

    // Close via the X button (data-test="close" on DialogClose in KovaModal)
    await dialog.locator('[data-test="close"]').click()
    await expect(dialog).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 4. Menu / Popover / Tooltip
  // -------------------------------------------------------------------------
  test('4a — menu trigger opens menu with items', async () => {
    await gotoShowcase(page)
    // KovaMenu renders a DropdownMenuContent with class "menu" and role="menu"
    // TODO: add data-testid="menu-trigger" to the Menu button in showcase.
    const menuTrigger = page.getByRole('button', { name: 'Menu' })
    await menuTrigger.click()

    // Reka DropdownMenuContent uses role="menu"
    const menu = page.locator('[role="menu"]')
    await expect(menu).toBeVisible()

    // Should have at least the "Undo" and "Redo" items
    await expect(menu.getByRole('menuitem', { name: 'Undo' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Redo' })).toBeVisible()

    // Close by pressing Escape
    await page.keyboard.press('Escape')
    await expect(menu).not.toBeVisible()
  })

  test('4b — popover opens and is visible', async () => {
    // KovaPopover wraps Reka PopoverContent — no explicit role on the content,
    // but it should contain "Popover content slot." text.
    // TODO: add data-testid="popover-trigger" and data-testid="popover-content"
    // to KovaPopover / Cluster11Showcase so selectors are unambiguous.
    const popoverTrigger = page.getByRole('button', { name: 'Open popover' })
    await popoverTrigger.click()

    const popoverContent = page.locator('text=Popover content slot.')
    await expect(popoverContent).toBeVisible()

    // Close by clicking somewhere else
    await page.keyboard.press('Escape')
  })

  test('4c — tooltip content visible on hover', async () => {
    const tooltipTrigger = page.getByRole('button', { name: 'Hover me' })
    await tooltipTrigger.hover()

    // KovaTooltip renders TooltipContent with class "tooltip"; 500ms default delay
    // TODO: add data-testid="tooltip-content" to KovaTooltip.vue
    const tooltip = page.locator('.tooltip', { hasText: 'Tooltip text' })
    await expect(tooltip).toBeVisible({ timeout: 1500 })
  })

  // -------------------------------------------------------------------------
  // 5. Segmented control
  // -------------------------------------------------------------------------
  test('5 — segmented control tracks active segment on click', async () => {
    await gotoShowcase(page)
    const seg = page.locator('[role="radiogroup"]')
    await expect(seg).toBeVisible()

    // Buttons: Left / Center / Right
    const leftBtn = seg.getByRole('radio', { name: /Left/i })
    const centerBtn = seg.getByRole('radio', { name: /Center/i })
    const rightBtn = seg.getByRole('radio', { name: /Right/i })

    // Default active value is "left"
    await expect(leftBtn).toHaveAttribute('aria-checked', 'true')
    await expect(centerBtn).toHaveAttribute('aria-checked', 'false')

    // Click Center
    await centerBtn.click()
    await expect(centerBtn).toHaveAttribute('aria-checked', 'true')
    await expect(leftBtn).toHaveAttribute('aria-checked', 'false')
    // Active segment should carry the "active" class (bg-input-hi text-ink)
    await expect(centerBtn).toHaveClass(/active/)

    // Click Right
    await rightBtn.click()
    await expect(rightBtn).toHaveAttribute('aria-checked', 'true')
    await expect(rightBtn).toHaveClass(/active/)
    await expect(centerBtn).toHaveAttribute('aria-checked', 'false')

    // Return to Left
    await leftBtn.click()
    await expect(leftBtn).toHaveAttribute('aria-checked', 'true')
    await expect(leftBtn).toHaveClass(/active/)
  })

  // -------------------------------------------------------------------------
  // 6. Confirm modal (destructive, typed-confirm)
  // -------------------------------------------------------------------------
  test('6 — destructive confirm: type DELETE enables button; cancel closes modal', async () => {
    await gotoShowcase(page)
    // TODO: add data-testid="confirm-trigger" to the "Destructive confirm" button
    const trigger = page.getByRole('button', { name: /Destructive confirm/i })
    await trigger.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()

    // The ConfirmModal has a typed-confirm input
    const input = dialog.locator('input[type="text"]')
    await expect(input).toBeVisible()

    // Confirm button should be disabled before typing
    const confirmBtn = dialog.getByRole('button', { name: /Delete/i })
    await expect(confirmBtn).toBeDisabled()

    // Type DELETE — confirm button should enable
    await input.fill('DELETE')
    await expect(confirmBtn).toBeEnabled()

    // Click Cancel — modal should close, no side effect
    const cancelBtn = dialog.getByRole('button', { name: /Cancel/i })
    await cancelBtn.click()
    await expect(dialog).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 7. Error pages — navigate and assert h1
  // -------------------------------------------------------------------------
  test('7a — 404 page renders "Page not found"', async () => {
    await page.goto(`${BASE}/not-a-real-route-12345`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('Page not found')
  })

  test('7b — /500 renders "Something broke"', async () => {
    await page.goto(`${BASE}/500`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('Something broke')
  })

  test("7c — /network-unreachable renders \"Can't reach Kova\"", async () => {
    await page.goto(`${BASE}/network-unreachable`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText("Can't reach Kova")
  })

  // -------------------------------------------------------------------------
  // 8. Theme — <html data-theme="dark">
  // -------------------------------------------------------------------------
  test('8 — html element has data-theme="dark" on /dev/cluster-11', async () => {
    await gotoShowcase(page)
    const theme = await page.evaluate(
      () => document.documentElement.dataset['theme'] ?? null
    )
    // The route should set dark theme (Kova app = dark everywhere).
    // If meta.theme is not wired yet, we still assert the attribute exists.
    // TODO: wire meta.theme = 'dark' on /dev/cluster-11 route if not yet done.
    expect(
      theme,
      `Expected data-theme to be "dark" but got: ${JSON.stringify(theme)}`
    ).toBe('dark')
  })
})
