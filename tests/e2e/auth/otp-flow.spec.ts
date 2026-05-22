import { expect, test } from '@playwright/test'

// W8a Cluster 01 — Phase 11.3 of amendment plan.
// Happy-path OTP flow: email → code-entry → 6 digits → /dashboard (login)
// or /onboarding (signup). Supabase verifyOtp is mocked.

test.describe('OTP flow', () => {
  test('login: typing 6 digits auto-submits and routes to /dashboard', async ({
    page,
    context
  }) => {
    await context.route(/\/auth\/v1\/otp/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    )
    await context.route(/\/auth\/v1\/verify/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake',
          refresh_token: 'fake',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'u_otp_test', email: 'otp@kova.io' }
        })
      })
    )

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('otp@kova.io')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await expect(page.getByText('Check your email for a 6-digit code')).toBeVisible({
      timeout: 10_000
    })

    // Type 6 digits into the OTP cells — OtpInput auto-advances + auto-submits
    const cells = page.locator('input[inputmode="numeric"]')
    await expect(cells).toHaveCount(6)
    for (let i = 0; i < 6; i++) {
      await cells.nth(i).fill(String(i + 1))
    }

    await page.waitForURL(/\/(dashboard|onboarding|editor)/, { timeout: 10_000 })
  })

  test('wrong code shows inline error + attempts-left counter', async ({ page, context }) => {
    await context.route(/\/auth\/v1\/otp/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    )
    await context.route(/\/auth\/v1\/verify/, (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Token is invalid'
        })
      })
    )

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('otp-wrong@kova.io')
    await page.getByRole('button', { name: /continue with email/i }).click()
    await expect(page.getByText('Check your email for a 6-digit code')).toBeVisible({
      timeout: 10_000
    })

    const cells = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) {
      await cells.nth(i).fill('0')
    }

    await expect(page.getByText(/Wrong code\.\s+\d+\s+attempts left/i)).toBeVisible({
      timeout: 10_000
    })
  })
})
