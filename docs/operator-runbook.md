# Kova Operator Runbook — Pre-Launch Activation Checklist

**Status:** READY (B-LOW5 / A-LOW3 closure 2026-05-19)
**Owner:** Founder (account provisioning) + Cluster 11 (code wiring)
**Trigger:** Before first production deploy
**Source of truth for stub→live transitions** (founder lock #14 — external accounts deferred to pre-launch).

This runbook collects every `TODO(pre-launch §11)` marker scattered across
the codebase into a single linear checklist. Each row links the marker
location, the activation action, and the verification step. Do not delete
this file once activated — it doubles as the disaster-recovery activation
script if any of these accounts need to be re-provisioned.

---

## 0. Pre-flight (verify accounts exist)

- [ ] Sentry organisation `kova` provisioned with two projects: `kova-browser` + `kova-server`. Generate two DSNs.
- [ ] Resend organisation `kova` provisioned. Domain `kova.app` DNS records verified (SPF / DKIM / DMARC). Generate API key with `emails.send` scope.
- [ ] Vercel Pro plan active. Cron Jobs feature enabled. Generate `CRON_SECRET` via `openssl rand -hex 32`.
- [ ] Stripe live-mode account active (separate from test mode). API keys + webhook signing secret in hand.

---

## 1. Sentry — browser SDK

**Markers to clear:**
- `src/sentry.ts` line ~31 — `// TODO(pre-launch §11): Sentry.init({...})`
- `tests/unit/sentry.test.ts` line ~14 — `// TODO(pre-launch §11): assert Sentry.init called with expected config when DSN present.`

**Actions:**
1. `bun add @sentry/vue`
2. Replace the no-op `installSentry` body with the real `Sentry.init({ app, dsn, router-tracing, replaysOnErrorSampleRate: 1.0, tracesSampleRate: 0.1 })` call. See Plan 11 Task 1.4 Step 3 for the exact config.
3. Set `VITE_SENTRY_DSN_BROWSER` in Vercel project env for `production` + `preview` environments. Leave unset for `development` (keeps stub mode locally).
4. Update the stub test to assert the live invocation (mock `@sentry/vue`'s `init` export).

**Verification:**
- [ ] `bun test tests/unit/sentry.test.ts` — both stub-mode and live-mode tests pass.
- [ ] Open a preview deployment, deliberately throw an error in DevTools, confirm event appears in Sentry within 60 s.

---

## 2. Sentry — server SDK (Edge Functions + Vercel Functions)

**Markers to clear:**
- `api/_shared/sentry.ts` line ~7 — `// TODO(pre-launch §11): import + init @sentry/node here once DSN provisioned`
- `api/_shared/sentry.ts` line ~16 — `// TODO(pre-launch §11): Sentry.captureException(err, { extra: context })`
- `api/_shared/audit.ts` line ~31 — `// TODO(pre-launch §11): Sentry.captureException(error, { tags: ... })`

**Actions:**
1. `bun add @sentry/node`
2. Wire `Sentry.init({ dsn: process.env.SENTRY_DSN_SERVER })` at the top of `api/_shared/sentry.ts` behind an env guard.
3. Replace every `captureException(err, ctx)` stub body with the real `Sentry.captureException` + tag-application call.
4. Set `SENTRY_DSN_SERVER` in Vercel project env (production + preview).

**Verification:**
- [ ] Hit a known-failing Edge Function endpoint; confirm the server-side Sentry project receives the event.

---

## 3. Resend — both runtimes

**Markers to clear:**
- `api/_shared/email.ts` line ~17 — `// TODO(pre-launch §11): import { Resend } from 'resend' + resend.emails.send(payload)` (Cluster 11 / Vercel Functions wrapper)
- `api/_shared/email.ts` line ~13 — `// TODO(pre-launch §11): Sentry.captureMessage('resend_skipped_no_api_key', 'warning')`
- `supabase/functions/_shared/resend-client.ts` lines ~10–20 — same TODO block in the Cluster 01 / Supabase Edge Functions wrapper
- `tests/unit/email.test.ts` line ~17 — `// TODO(pre-launch §11): assert resend.emails.send invocation with List-Unsubscribe header.`

**Actions:**
1. `bun add resend juice` (juice is for CSS inlining in `<EmailShell>`).
2. Drop the stub fallback in both wrappers — they now actually call `resend.emails.send({ to, from, subject, html, headers: { 'X-Idempotency-Key': … } })`.
3. Keep the env-guarded breadcrumb branch as a defensive null check; the breadcrumb now upgrades to `Sentry.captureMessage('resend_skipped_no_api_key', 'warning')` so any missing-env in prod pages on-call.
4. Set `RESEND_API_KEY` in both Vercel project env AND Supabase Edge Function secrets (the two runtimes don't share env).
5. Set `PUBLIC_APP_URL=https://kova.app` in Vercel `production`; preview environments get the per-branch Vercel URL automatically.

**Verification:**
- [ ] Send a real transactional email to a known inbox. Confirm wordmark image loads from `https://kova.app/email/wordmark-light@2x.png` (production) or the preview URL (preview deployment).
- [ ] Confirm the literal `{{email}}` + `{{settings_url}}` are substituted by Resend (not present in the delivered email).

---

## 4. Vercel Cron

**Markers to clear:**
- `vercel.json` cron entries — already present but `CRON_SECRET` env var must be set for the verifier to accept incoming requests.
- `api/_shared/cron.ts` (or equivalent verify-cron-secret helper, Cluster 01 Plan 01 Task 2) — `// TODO(pre-launch §11): assert prod secret match`

**Actions:**
1. Generate `CRON_SECRET` via `openssl rand -hex 32`.
2. Set in Vercel project env (production only — preview cron jobs are noisy and not needed at this stage).
3. Confirm `vercel.json` `crons` array contains at least: idempotency cleanup (Plan 11), Stripe webhook reconciler (Plan 04), deletion sweep (Plan 01), session cleanup (Plan 12 Task 16 — once it ships).

**Verification:**
- [ ] Trigger one cron manually via Vercel dashboard. Confirm 200 response + log entry.
- [ ] Confirm a request without the `Authorization: Bearer <CRON_SECRET>` header returns 401.

---

## 5. Stripe (Cluster 04)

**Markers to clear:** none in this runbook — Cluster 04's plan owns the Stripe activation sub-runbook. This row is a forward pointer.

**Actions:** see `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md` Tasks 9–12.

---

## 6. M9 Realtime channel migration (C-MED-11.6)

**Markers to clear:**
- `src/composables/use-shopify-connection.ts:155` — legacy `sync-progress-${brandId}` channel name.

**Actions:** see Plan 11 Task 9.5. Single-file rename; safe at the wire (Supabase Realtime delivers postgres_changes by filter, not channel name).

**Verification:**
- [ ] `grep -rnE "channel\\(['\"]sync-progress" kova-open-pencil-1/src/` returns zero hits.
- [ ] Connect a Shopify store in a preview deployment, watch sync progress flow through to the dashboard UI without regression.

---

## 7. Final gate (do not deploy to prod before)

- [ ] All §1–§5 markers above cleared.
- [ ] `bun run check` passes (no `as any`, no `process.env.X!`, no `jest.mock` / `vi.mock`, no raw `<icon-lucide-*>` dynamic-name, all DEFINER RPCs have `SET search_path`).
- [ ] `bun run test:unit` green.
- [ ] `bun run test` (Playwright E2E) green.
- [ ] `bun run test:dupes` < 3 %.
- [ ] Browser smoke-test golden path: sign-in → onboarding → dashboard → brand modal → canvas → export (per `feedback_browser_smoke_test_before_done`).
- [ ] One manual transactional email delivered + opened.
- [ ] One Sentry error captured + acknowledged in dashboard.
- [ ] One cron job fires + logs.

---

## 8. Disaster recovery

If any of these accounts need to be re-provisioned (e.g. Sentry org loses access, Resend API key rotation), this runbook is the activation script — re-walk the relevant section.
