import { expect, test } from '@playwright/test'

// W8a Cluster 01 — Phase 11.2 of amendment plan.
// Happy-path magic-link flow: signup → email submit → code surface renders.
// We intercept the Supabase OTP send + verify so the test runs offline.

test.describe('Magic-link flow', () => {
  test('signup submits email and reveals the code-entry surface', async ({ page, context }) => {
    await context.route(/\/auth\/v1\/otp/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    )

    await page.goto('/signup')
    const email = page.getByPlaceholder('you@example.com')
    await expect(email).toBeVisible()
    await email.fill('test+signup@kova.io')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await expect(page.getByText('Check your email for a 6-digit code')).toBeVisible({
      timeout: 10_000
    })
    await expect(page.getByText('test+signup@kova.io')).toBeVisible()
  })

  test('login submits email and reveals the code-entry surface', async ({ page, context }) => {
    await context.route(/\/auth\/v1\/otp/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    )

    await page.goto('/login')
    const email = page.getByPlaceholder('you@example.com')
    await email.fill('test+login@kova.io')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await expect(page.getByText('Check your email for a 6-digit code')).toBeVisible({
      timeout: 10_000
    })
  })
})
