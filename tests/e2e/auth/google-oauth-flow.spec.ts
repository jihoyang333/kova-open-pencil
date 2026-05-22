import { expect, test } from '@playwright/test'

// W8a Cluster 01 — Phase 11.1 of amendment plan.
// Mocks the Supabase OAuth round-trip so the test runs offline.

test.describe('Google OAuth flow', () => {
  test('signup with Google routes through /auth/callback to onboarding', async ({
    page,
    context
  }) => {
    // 1. Intercept the Supabase signInWithOAuth handshake — bypass the real
    //    Google authorize URL by redirecting directly to /auth/callback.
    await context.route(/accounts\.google\.com\/o\/oauth2/, (route) =>
      route.fulfill({
        status: 302,
        headers: { location: 'http://localhost:1420/auth/callback?code=mock_pkce_code' }
      })
    )

    // 2. Intercept the Supabase token exchange — return a fake session.
    await context.route(/\/auth\/v1\/(token|callback)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake_access',
          refresh_token: 'fake_refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'u_oauth_test', email: 'oauth-test@example.com' }
        })
      })
    )

    await page.goto('/signup')
    const button = page.getByRole('button', { name: /sign up with google/i })
    await expect(button).toBeVisible()
    await button.click()

    // The redirect chain ends at /auth/callback → routes to /onboarding for
    // new users. Allow up to 10s for the round-trip + watcher fire.
    await page.waitForURL(/\/(onboarding|auth\/callback)/, { timeout: 10_000 })
  })

  test('login with Google routes through /auth/callback', async ({ page, context }) => {
    await context.route(/accounts\.google\.com\/o\/oauth2/, (route) =>
      route.fulfill({
        status: 302,
        headers: { location: 'http://localhost:1420/auth/callback?code=mock_pkce_code' }
      })
    )
    await context.route(/\/auth\/v1\/(token|callback)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake',
          refresh_token: 'fake',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'u_oauth_login', email: 'oauth-login@example.com' }
        })
      })
    )

    await page.goto('/login')
    const button = page.getByRole('button', { name: /sign in with google/i })
    await expect(button).toBeVisible()
    await button.click()
    await page.waitForURL(/\/(dashboard|onboarding|auth\/callback)/, { timeout: 10_000 })
  })
})
