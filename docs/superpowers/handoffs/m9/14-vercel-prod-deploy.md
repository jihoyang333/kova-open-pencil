# M9 — Vercel Production Deployment Handoff

**Status:** Not started. M9 code is functionally complete on `feat/m9-shopify` after the 2026-04-25 polling fallback. This handoff covers the production deploy to Vercel + Shopify Partner switch from dev-store to prod URLs.

**Owner:** Mixed — AI handles code/config. Jiho handles dashboards (Vercel UI, Shopify Partners), DNS, and final smoke. Each task labels its owner.

**Pre-req:** M9 manual smoke (Task D from `12-phase-7-followup.md`) green on local dev against dev store. Do NOT deploy to prod until local smoke passes — you'd be deploying broken code.

---

## Context — what changed in the sync architecture (read before touching)

The original M9 design used Shopify's `bulk_operations/finish` webhook as the only path to trigger JSONL processing. That broke locally and in CI because Shopify cannot POST to localhost or to GitHub-runner private IPs. On 2026-04-25, polling was added as a backup path:

- **`api/shopify/sync/poll.ts`** — new endpoint. Browser polls every 5 sec while `sync_progress.phase` is `running` or `parsing`. Endpoint queries Shopify's `node($id)` GraphQL for the bulk op status, calls `processBulkFinish` when status = COMPLETED.
- **`api/_shared/shopify-bulk-processor.ts`** — new shared module. Contains `processBulkJsonl()` which fetches the JSONL, parses it, and upserts to Supabase. Called inline (no QStash) so it works in dev/CI/prod uniformly.
- **`api/shopify/sync/bulk-finish.ts`** — refactored. `processBulkFinish` now calls `processBulkJsonl` directly instead of publishing to QStash. Idempotent via DB upserts.
- **`api/shopify/sync/worker.ts`** — still exists for QStash-driven chunked processing of very large stores (>100k SKUs). Currently unused by the live sync path. Will become relevant only if/when a customer hits Vercel's function-timeout cap.

**Implication for prod:** webhook becomes the *primary* path (fast, public URL works). Polling continues to run as a silent backstop for the ~1% of webhooks Shopify drops. Both converge on the same `processBulkFinish` function. Race-safe via idempotent upserts.

---

## State snapshot (as of 2026-04-25)

**Inner repo (`kova-open-pencil-1`) — branch `feat/m9-shopify`:**

Modified or new files since handoff 13:
- `api/_shared/shopify-bulk-processor.ts` (NEW — extracted JSONL processor)
- `api/shopify/sync/poll.ts` (NEW — polling endpoint)
- `api/shopify/sync/bulk-finish.ts` (refactored to inline processing)
- `api/shopify/sync/bulk-start.ts` (GraphQL fixes: `productsCount { count }`, `discount { ... }` wrapper)
- `api/shopify/sync/worker.ts` (deduped — re-exports `resolveFks` from shared module)
- `src/composables/use-shopify-connection.ts` (added client-side poll loop)
- `src/dev/api-plugin.ts` (registered `/api/shopify/sync/poll`)
- `tests/api/shopify/sync-finish.test.ts` (rewritten for inline architecture)
- `tests/api/shopify/webhook-worker.test.ts` (assertion updated — no QStash)
- `tests/api/shopify/oauth-callback.test.ts` (assertion updated — popup-close HTML, not 302)
- `supabase/migrations/20260423_m9_06_grant_sync_progress.sql` (NEW — column grant fix)

Unit tests: 1484 pass / 99 skip / 0 fail.

**Outer repo (`kova-main`):** unchanged since handoff 12 Task A revert.

**Shopify Partner state:** `the-official-kova-test` app currently configured for **localhost** dev. `application_url = "http://localhost:1420"`, `redirect_urls = ["http://localhost:1420/api/shopify/oauth/callback"]`. No production URLs set.

---

## Task 1 — Choose and provision the production domain (Jiho-owned)

Pick the prod domain. Recommend `app.kova.com` to keep marketing site (`kova.com`) and app separated.

- [ ] **Step 1.1:** Decide domain. Default suggestion: `app.kova.com`.
- [ ] **Step 1.2:** Add the domain in Vercel dashboard → Project → Settings → Domains. Configure DNS (CNAME or A record per Vercel's wizard).
- [ ] **Step 1.3:** Wait for SSL provisioning (automatic, ~1 min). Verify HTTPS works on the bare domain.

**Exit criteria:** `curl -I https://app.kova.com` returns 200 (or whatever the Kova SPA returns at `/`) with a valid Let's Encrypt cert.

---

## Task 2 — Vercel project linkage (mixed; Jiho dashboard + AI vercel.json)

If the repo isn't already linked to a Vercel project:

- [ ] **Step 2.1 (Jiho):** From `kova-open-pencil-1/`, run `bunx vercel link`. Pick the right org and project (or create new).
- [ ] **Step 2.2 (Jiho):** Confirm `vercel.json` is checked in and current. Already present at `kova-open-pencil-1/vercel.json` with cron jobs for inventory/orders/product-delta/purge.
- [ ] **Step 2.3 (AI):** Verify the Vercel build picks up `api/` as serverless functions. Vercel auto-detects `api/*.ts` files and treats each as a function. Check `vercel.json` doesn't shadow this. Current `vercel.json` does NOT define `functions`, so default behavior applies — confirmed correct.
- [ ] **Step 2.4 (AI):** If any function exceeds 60 sec (default Hobby cap), upgrade to Pro and bump `maxDuration`. The bulk-finish path runs `processBulkJsonl` inline — for stores under ~5000 products this should fit within 60 sec, but for safety set `maxDuration = 300` on `api/shopify/sync/bulk-finish.ts` and `api/shopify/sync/poll.ts`. Worker.ts already has `maxDuration = 300`. Add via `export const maxDuration = 300` after the existing `export const config = ...` lines.

**Exit criteria:** `vercel deploy --prod` completes a successful build (in a separate task — not yet).

---

## Task 3 — Environment variables (Jiho-owned)

All keys live in Vercel dashboard → Project → Settings → Environment Variables. Set for **Production** environment (and Preview if you want preview deploys to also work against the dev store).

### Browser-safe (VITE_ prefix — exposed to client)

- [ ] `VITE_SUPABASE_URL` — `https://rqnyxkfdtvjgfsvdfutw.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` — anon key from Supabase project settings

### Server-only (no VITE_ prefix — never exposed to browser)

- [ ] `SUPABASE_URL` — same value as `VITE_SUPABASE_URL` (api/* code reads this without the VITE prefix)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — service role key from Supabase project settings (DANGEROUS: full admin)
- [ ] `KOVA_SHOPIFY_CLIENT_ID` — Shopify Partner app client_id
- [ ] `KOVA_SHOPIFY_CLIENT_SECRET` — Shopify Partner app client_secret
- [ ] `SHOPIFY_WEBHOOK_SECRET` — webhook HMAC signing key (NOT the same as client_secret; configured per-app in Shopify Partners)
- [ ] `KOVA_INTERNAL_KEY` — internal request signing key (used by callback.ts → bulk-start.ts handoff). Generate fresh: `openssl rand -hex 32`. Same value must be set everywhere.
- [ ] `ANTHROPIC_API_KEY` — for AI chat (M5)
- [ ] `STRIPE_SECRET_KEY` — billing (if M9 ships before M-billing, can defer)
- [ ] `STRIPE_WEBHOOK_SECRET` — billing (if applicable)

### QStash (only if you keep `worker.ts` for very-large-store chunking)

If `worker.ts` is dead-code-cleaned (recommended once it's confirmed unused — see Task 7), skip these. Otherwise:

- [ ] `QSTASH_TOKEN`
- [ ] `QSTASH_CURRENT_SIGNING_KEY`
- [ ] `QSTASH_NEXT_SIGNING_KEY`

**Exit criteria:** `bunx vercel env pull` from local `kova-open-pencil-1/` produces a `.env.local` with all the above keys present and non-empty.

---

## Task 4 — Shopify Partner dashboard updates (Jiho-owned)

The dev-store config currently uses localhost. Production needs prod URLs. Decide whether to (a) reuse the existing `the-official-kova-test` app for prod, or (b) create a fresh `kova` Partner app for prod and keep dev separate. Recommend (b) — separation keeps dev iteration safe.

### Recommended path: separate prod app

- [ ] **Step 4.1:** Partners dashboard → Apps → Create app → Name `kova` (or `Kova Production`). Distribution = Custom or Public per launch plan; M9 spec says Custom only for now.
- [ ] **Step 4.2:** App setup → Embedded = false. Match dev config.
- [ ] **Step 4.3:** App URL = `https://app.kova.com`
- [ ] **Step 4.4:** Allowed redirection URLs = `https://app.kova.com/api/shopify/oauth/callback`
- [ ] **Step 4.5:** Compliance webhooks (GDPR endpoints) → set all four to:
  - `https://app.kova.com/api/shopify/compliance/customer-redact`
  - `https://app.kova.com/api/shopify/compliance/data-request`
  - `https://app.kova.com/api/shopify/compliance/shop-redact`
  - `https://app.kova.com/api/shopify/compliance/app-uninstalled` (this one may be set by the partner UI as `app/uninstalled` — depends on Shopify's current UI)
- [ ] **Step 4.6:** Scopes: `read_products,read_themes,read_online_store_pages,read_orders,read_inventory,read_discounts` (matches `SHOPIFY_SCOPES` in `api/_shared/shopify-client.ts`).
- [ ] **Step 4.7:** Copy the new app's client_id and client_secret into Vercel env vars (Task 3) — replacing dev values for Production environment.
- [ ] **Step 4.8:** Generate webhook signing key in Partners → Configuration → set `SHOPIFY_WEBHOOK_SECRET` in Vercel.
- [ ] **Step 4.9:** API version: confirm `2026-07` (matches dev `shopify.app.toml`). If Shopify has deprecated this version by deploy time, bump to current and also bump `SHOPIFY_API_VERSION` in `api/_shared/shopify-client.ts` (currently `2024-10` — there is a known mismatch flagged in handoff 12 follow-ups).

### Alternative: reuse dev app for prod

Skip 4.1. Keep using `b854bcbd8166cfabb42fe158ef267049`. Update App URL + redirect URLs in 4.3/4.4. Risk: any dev iteration that breaks the app config also breaks prod.

**Exit criteria:** Partners dashboard shows app with all four GDPR webhooks configured against prod URLs and scopes matching the code.

---

## Task 5 — Update `shopify.app.toml` for prod (AI)

Two paths depending on Task 4 choice:

### If you created a separate prod app (recommended)

Don't touch `the-official-kova-test/shopify.app.toml` — keep it pointing at localhost for dev iteration. Create a sibling toml or use a separate app directory. Shopify CLI supports `shopify app config use` to switch which toml is active.

- [ ] **Step 5.1 (Jiho, in `the-official-kova-test/` or wherever the new app lives):** `shopify app config link` against the new prod app, which generates `shopify.app.kova.toml` (or similar).
- [ ] **Step 5.2:** In the prod toml, set:
  ```toml
  application_url = "https://app.kova.com"
  embedded = false

  [auth]
  redirect_urls = [ "https://app.kova.com/api/shopify/oauth/callback" ]

  [webhooks]
  api_version = "2026-07"

  [access_scopes]
  scopes = "read_products,read_themes,read_online_store_pages,read_orders,read_inventory,read_discounts"
  use_legacy_install_flow = true
  ```
- [ ] **Step 5.3:** `shopify app deploy --config kova` (or whatever the config name became).

### If you reused the dev app

- [ ] **Step 5.1:** Edit `the-official-kova-test/shopify.app.toml`:
  ```toml
  application_url = "https://app.kova.com"
  redirect_urls = [ "https://app.kova.com/api/shopify/oauth/callback" ]
  ```
- [ ] **Step 5.2:** `shopify app deploy`.

**Exit criteria:** Partners dashboard reflects the toml values exactly. `shopify app deploy` reports `Configuration: <changes>` and exits 0.

---

## Task 6 — First deploy + smoke (Jiho + AI)

- [ ] **Step 6.1 (Jiho):** From `kova-open-pencil-1/`, `bunx vercel --prod`. Wait for build green.
- [ ] **Step 6.2 (Jiho):** Visit `https://app.kova.com` — should load the Kova SPA. Sign in with existing account.
- [ ] **Step 6.3 (Jiho):** Navigate to Settings → Brand → Integrations.
- [ ] **Step 6.4 (Jiho):** Click "Connect Shopify". Enter dev-store domain (`kova-dev-store.myshopify.com` or whichever store is the prod test target). Use a real merchant store later for true smoke.
- [ ] **Step 6.5 (Jiho):** OAuth flow completes. Popup auto-closes. Kova UI flips to "Connected".
- [ ] **Step 6.6 (Jiho + AI):** Inspect Vercel function logs for `/api/shopify/oauth/callback`:
  - Token exchange succeeded.
  - Vault RPC succeeded.
  - **`registerWebhooks` ran** (this skipped on localhost; in prod, origin is `app.kova.com`, so callback.ts:269 path runs registration).
  - `kickOffBulkSync` fired.
- [ ] **Step 6.7 (Jiho + AI):** Watch `/api/shopify/sync/bulk-start` log — returns 200 with `bulk_op_id`.
- [ ] **Step 6.8 (Jiho + AI):** Within ~30 sec, Shopify POSTs to `https://app.kova.com/api/shopify/webhook-worker` with topic `bulk_operations/finish`. Verify in Vercel function logs. This is the path that didn't work in dev — confirm it works in prod.
- [ ] **Step 6.9 (Jiho + AI):** Verify polling fallback also works as backstop. Open browser DevTools → Network tab → see `/api/shopify/sync/poll` fire every 5 sec. One of webhook-or-poll wins the race. Either way, `sync_progress.phase` flips to `done` and products appear in `shopify_products`.
- [ ] **Step 6.10 (Jiho):** UI shows "Connected" with last_synced_at timestamp, product count, and active scopes.

**Exit criteria:** All 9 §2 success criteria from `docs/superpowers/specs/2026-04-18-m9-shopify-design.md` pass against prod.

---

## Task 7 — Post-deploy cleanup (AI, after Task 6 green)

### Cleanup A — Remove dead QStash code if confirmed unused

Polling now drives sync. `worker.ts` runs only via QStash, which is no longer invoked from anywhere in the live code path (`bulk-finish.ts` calls `processBulkJsonl` directly). If a 30-day production smoke shows no large-store timeouts, delete:

- [ ] `api/shopify/sync/worker.ts`
- [ ] QStash signing-key env vars in Vercel
- [ ] QStash references in `tests/api/shopify/sync-worker.test.ts` (whole file becomes dead)

If you keep it as future-proofing for >100k product stores, document the trigger condition (e.g., "switch processBulkFinish to QStash if `objectCount > 50000`") and leave a TODO in `bulk-finish.ts`.

### Cleanup B — Sentry / observability sweep

- [ ] Confirm `logShopifyError` calls reach Sentry (or whatever logging backend was wired in handoff 10 — observability work).
- [ ] Set up alerts on:
  - 5xx rate on `/api/shopify/*`
  - `sync_progress.phase = 'error'` count per hour
  - Missed webhook delivery (Shopify reports retries via `X-Shopify-Webhook-Id` header — alert if same id retried > 3 times)

### Cleanup C — Shopify API version reconciliation

`api/_shared/shopify-client.ts` says `2024-10`. `shopify.app.toml` says `2026-07`. Pick one — preferably the latest stable Shopify version at deploy time — and update both. The webhook API version in toml controls webhook payload shape; the client-code version controls Admin API GraphQL queries. They don't have to match but should both be current.

### Cleanup D — Increase polling interval for prod

5-second polling is aggressive — fine for dev, wasteful in prod where webhook usually wins the race. After 30 days of prod data showing webhook reliability:

- [ ] Bump `POLL_INTERVAL_MS` in `src/composables/use-shopify-connection.ts` from `5000` to `15000` or `30000`.
- [ ] Polling becomes pure backstop, not primary signal.

---

## Task 8 — CI updates after prod is live (AI)

The current `.github/workflows/shopify-e2e.yml` runs E2E against dev-store via storageState. For full confidence, add a smoke job that runs against prod after every prod deploy.

- [ ] **Step 8.1:** Add a `vercel-prod-smoke.yml` workflow triggered by `deployment_status` webhook from Vercel (Vercel sends `repository_dispatch` to GitHub on prod deploy success).
- [ ] **Step 8.2:** Workflow runs a tiny Playwright smoke (login → load dashboard → assert no console errors). Don't OAuth — that touches real Shopify and creates noise.
- [ ] **Step 8.3:** On smoke fail → auto-rollback via `vercel rollback`. Discuss with Jiho before wiring auto-rollback — usually a manual step.

---

## Open questions / decisions deferred

These don't block deploy but should be resolved before public launch:

1. **Custom distribution vs Public app on Shopify App Store.** M9 spec locks Custom only. Public requires Shopify review (~weeks). Decide post-MVP.
2. **Multi-region Vercel deploy.** Default is `us-east-1`. For EU customers, add region pins. Not urgent for v1.
3. **Webhook secret rotation policy.** Shopify allows rotating via Partners. Decide cadence — quarterly?
4. **Vercel Pro tier needed?** Hobby = 60 sec function timeout, 100GB bandwidth. Pro = 800 sec, 1TB. Bulk-finish path inlines JSONL processing — large stores will hit 60 sec on Hobby. Recommend Pro at launch.
5. **Dev-store + prod-store env separation.** Currently dev uses Supabase project `rqnyxkfdtvjgfsvdfutw`. Should prod use the same project or a fresh one? Same-project is cheaper and simpler; fresh project gives clean isolation. Default: same project for v1, split later if needed.

---

## Reference files

- Master plan: `docs/superpowers/plans/2026-04-18-m9-shopify.md`
- Master spec: `docs/superpowers/specs/2026-04-18-m9-shopify-design.md` (§2 success criteria, §10 rate limits, §15 DoD)
- E2E spec: `tests/e2e/m9-shopify.spec.ts`
- E2E helper: `tests/e2e/helpers/shopify-auth.ts`
- Webhook handler: `api/shopify/webhook-worker.ts`
- Sync entry: `api/shopify/sync/bulk-start.ts` → `api/shopify/sync/bulk-finish.ts` → `api/_shared/shopify-bulk-processor.ts`
- Polling: `api/shopify/sync/poll.ts`
- Composable poll loop: `src/composables/use-shopify-connection.ts`
- Migrations: `supabase/migrations/20260418_m9_*.sql` + `20260423_m9_06_grant_sync_progress.sql`

---

## Notes for the next AI

- **Don't deploy if local smoke isn't green.** Manual smoke per spec §2 items 1–9 must pass on `localhost:1420` against the dev store first.
- **Don't change `processBulkFinish` to write phase=done** — `processBulkJsonl` does that internally as its last step. Double-write is harmless but wastes a query.
- **Webhook + polling race is intentional.** Both run. Whichever finishes first wins. Idempotent upserts make duplicate processing a non-issue, just wasted work.
- **Don't reintroduce QStash to the live path** unless customer feedback proves Vercel function timeout is hit. The original architecture had it; we removed it to simplify and to make local dev work without hosted infra.
- **Outer-repo CI** (`.github/workflows/` at `/Users/jihoyang/kova-main/.github/`) was reverted in handoff 12 Task A. Don't add Shopify CI there — keep it inner-repo only.
- **`SUPABASE_URL` vs `VITE_SUPABASE_URL`** — both must be set with the same value. The api/ code reads `SUPABASE_URL` (no prefix). The browser code reads `VITE_SUPABASE_URL`. Forgetting one breaks half the system silently.
