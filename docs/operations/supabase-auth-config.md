# Supabase Auth Configuration Checklist

**Owner:** Operations
**Apply to:** local dev, staging, production (every environment)
**Source:** PRD 01 §5.4.1

Apply each setting via Supabase Studio → Authentication → Providers / Settings. Or via the Supabase CLI for repeatable provisioning (recommended for staging/prod).

## Email Auth provider

- [ ] Confirm email enabled: **YES**
- [ ] Secure email change enabled: **YES**
- [ ] Magic Link expiry: **1800 seconds** (30 min) — matches B4.1 "magic links last 30 minutes" copy
- [ ] OTP expiry: **300 seconds** (5 min)
- [ ] OTP length: **6 digits** — matches A15.04 cell count
- [ ] Max OTP attempts (server-side): **5** — matches B4.4 lockout copy

## Sessions

- [ ] JWT expiry: **3600 seconds** (1 hour)
- [ ] Refresh token rotation: **enabled**
- [ ] Refresh token lifetime — "Keep me signed in" toggled ON: **30 days** (per A15.06 toggle copy)
- [ ] Refresh token lifetime — toggled OFF: **1 day**

## Rate limits

- [ ] Email send rate limit: **4 per hour per recipient** (Supabase default; do NOT override)

## Email templates

Customize via Supabase Studio → Authentication → Email Templates. Default Supabase templates are too generic AND only include the magic link — Kova surfaces the 6-digit code on the same page where the user submitted their email (Notion pattern), so the email MUST include `{{ .Token }}`.

- [ ] **Magic Link** template (used by `signInWithOtp` — both signup AND login) — Inter font, Kova branding, BOTH `{{ .Token }}` (6-digit code) AND `{{ .ConfirmationURL }}` (link), plain-text fallback
- [ ] **Confirm signup** template — same dual code + link content as Magic Link
- [ ] **Change Email Address** verify template (to NEW address)
- [ ] Email change confirmation token expiry: **86400 seconds** (24 hours) — matches `EMAIL_CHANGE_LINK_TTL_HOURS=24` env var consumed by `api/auth/email-change-request.ts` and surfaced in B5.2 "expired link" copy
- [ ] Reset password template — for Phase 2 (email+password upgrade); ship as draft now, activate later

### Magic Link + Confirm signup template HTML (W8a Cluster 01)

Paste the following into BOTH "Magic Link" and "Confirm signup" email-template fields in Supabase Studio. The token-box styling matches A15 hi-fi auth chrome (light theme tokens: `--ink #18181b`, `--ink-2 #5a5a60`, `--ink-3 #8a8a8f`, `--fill #f4f4f3`, `--line #e4e4e1`).

```html
<h2>Sign in to Kova</h2>

<p>Your 6-digit code:</p>

<p style="font-size: 28px; font-weight: 600; letter-spacing: 6px; font-family: 'SF Mono', Menlo, monospace; background: #f4f4f3; padding: 12px 16px; border-radius: 6px; display: inline-block;">{{ .Token }}</p>

<p style="color: #5a5a60;">This code expires in 5 minutes.</p>

<p>Or click the link to sign in:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 10px 16px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">Sign in to Kova</a></p>

<hr style="border: 0; border-top: 1px solid #e4e4e1; margin: 24px 0;">

<p style="color: #8a8a8f; font-size: 12px;">If you didn't request this, you can safely ignore this email. Your account stays secure.</p>
```

## Redirect URLs

- [ ] Site URL: `https://app.kova.io` (production) / `http://localhost:1420` (dev)
- [ ] Additional redirect URLs:
  - `https://app.kova.io/auth/callback`
  - `https://app.kova.io/auth/email-change/verify`
  - `http://localhost:1420/auth/callback`
  - `http://localhost:1420/auth/email-change/verify`

## Verification

After applying, smoke-test on each environment:

- [ ] Signup with a real email → magic link arrives in inbox within 30 s → click → routes to `/auth/callback` with session in localStorage
- [ ] Login via OTP → 6-digit code arrives → enter → routes to `/auth/callback`
- [ ] Wrong OTP code → observe B4.3 inline error → enter correct code → success
- [ ] 5 wrong OTP attempts → observe B4.4 locked state → "Request new code" button works
- [ ] Email change → verify-link arrives at NEW address → click → routes to B5.1 success
- [ ] Old address receives notification email within 30 s
- [ ] Wait 24 hours → click stale email-change verify-link → routes to B5.2 expired

## CLI provisioning (staging / prod)

For repeatable environment setup, prefer `supabase secrets set` + the GoTrue admin API over Studio clicks. Sample provisioning script:

```bash
# Example — adapt per environment
supabase link --project-ref <prod-ref>
supabase secrets set --env-file .env.production
# Email template HTML can be set via the Supabase Management API:
# https://api.supabase.com/v1/projects/{ref}/config/auth
```

Document the exact provisioning command used per environment in the ops runbook.

## Env vars referenced

This configuration interacts with these env vars (server-only — NEVER `VITE_` prefix):

| Env var | Purpose | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Browser-safe |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role for Edge Functions | Server-only |
| `RESEND_API_KEY` | Resend API key | Server-only; absent → stub mode |
| `CRON_SECRET` | Cron handler authorization | Server-only |
| `EMAIL_CHANGE_LINK_TTL_HOURS` | Documentation env (matches Supabase setting) | Server-only; default 24 |
| `PUBLIC_APP_URL` | Outbound email link base | Server-only |

---

## OAuth providers

### Google OAuth (W8a Cluster 01 amendment §3.6)

Configure via Supabase Studio → Authentication → Providers → Google.

#### Google Cloud Console pre-flight (founder, one-time per environment)

1. Create or select a project at https://console.cloud.google.com/
2. APIs & Services → OAuth consent screen → publish app (External, with brand + support contact)
3. Credentials → Create OAuth 2.0 Client ID → Application type: **Web application**
4. Authorized JavaScript origins:
   - `https://app.kova.io` (production)
   - `http://localhost:1420` (local dev)
5. Authorized redirect URIs (paste the Supabase callback URL — the one
   shown in the Supabase Studio Google provider settings; it looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`).
6. Copy the **Client ID** + **Client secret** into the Supabase Studio
   Google provider configuration. Do **NOT** put either value in `.env`
   or in `src/` — Supabase stores the secret server-side.

#### Supabase Studio checklist (per environment)

- [ ] Google provider enabled (toggle on)
- [ ] Client ID populated from the Cloud Console
- [ ] Client Secret populated from the Cloud Console
- [ ] "Skip nonce checks" stays **off** (PKCE handles this)
- [ ] Redirect allowlist (Authentication → URL Configuration → Redirect URLs)
      contains `https://app.kova.io/auth/callback` and
      `http://localhost:1420/auth/callback`

#### Verification

- [ ] On `/signup`, the "Sign up with Google" button opens the Google consent
      screen, completes the round-trip, and lands at `/onboarding` for new
      users (or `/dashboard` for returning users with brands).
- [ ] On `/login`, the "Sign in with Google" button routes a returning user
      to `/dashboard`.
- [ ] No `client_secret` or `GOOGLE_CLIENT_SECRET` literal exists in `src/`
      (`grep -r 'client_secret\\|GOOGLE_CLIENT' src/` returns nothing).

---

**Last applied — local:** TODO
**Last applied — staging:** TODO
**Last applied — production:** TODO
