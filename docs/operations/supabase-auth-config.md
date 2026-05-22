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

Customize via Supabase Studio → Authentication → Email Templates. Default Supabase templates are too generic.

- [ ] Magic link sign-in template — Inter font, Kova branding, plain-text fallback
- [ ] Magic link signup confirmation template
- [ ] Email change verify template (to NEW address)
- [ ] Email change confirmation token expiry: **86400 seconds** (24 hours) — matches `EMAIL_CHANGE_LINK_TTL_HOURS=24` env var consumed by `api/auth/email-change-request.ts` and surfaced in B5.2 "expired link" copy
- [ ] Reset password template — for Phase 2 (email+password upgrade); ship as draft now, activate later

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

**Last applied — local:** TODO
**Last applied — staging:** TODO
**Last applied — production:** TODO
