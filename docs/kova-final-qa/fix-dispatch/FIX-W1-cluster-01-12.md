# Wave 1 — Cluster 01 (Auth/Onboarding/Shopify) + Cluster 12 (Settings/Prefs) Bundle Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Prerequisite:** Wave 0 contracts merged. Coordinate with Wave 1 Cluster 11 agent (run in parallel; do NOT consume audit_log until Cluster 11 ships the table).
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/`
**Branch to create:** `fix/qa-w1-cluster-01-12-auth-settings`
**Estimated wall-clock:** 1 day
**Output PR title:** `fix(qa-w1-cluster-01-12): auth/onboarding/shopify + settings — 23 findings`

---

## Mission

You are the **Wave 1 Cluster 01 + 12 bundle fix agent.** Both clusters are foundation: Cluster 01 (auth, identity, Shopify OAuth, deletion-restore cron) sets up the user-identity + Shopify integration that everything else consumes. Cluster 12 (settings + user preferences) is small (6 findings) and depends on Cluster 01's `users` table.

Your job: close **23 findings total** (17 Cluster 01 + 6 Cluster 12).

---

## Required reading

1. `kova-open-pencil-1/docs/kova-final-qa/CONSOLIDATED-TRIAGE.md` — Cluster 01 + Cluster 12 sections in full
2. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-A-findings.md` — A-MED2, A-LOW2
3. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-B-findings.md` — B-CRIT7, B-CRIT8, B-HIGH5, B-HIGH15, B-MED1, B-MED2, B-MED10, B-NOTE1
4. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-C-findings.md` — Pair 01 + Pair 12 matrices; HIGH-1, HIGH-13, HIGH-14, MEDIUM-1, MEDIUM-2, MEDIUM-3, MEDIUM-12.3, MEDIUM-12.4
5. `kova-open-pencil-1/docs/kova-final-qa/fix-dispatch/README.md` — 23 frozen decisions
6. `kova-open-pencil-1/docs/kova-final-qa/fix-dispatch/FIX-W0-contracts.md`
7. `kova-open-pencil-1/CLAUDE.md`
8. Post-W0 state of: PRDs 01 + 12, Plans 01 + 12
9. Check Cluster 11's branch (`fix/qa-w1-cluster-11-shared-infra`) — coordinate timing on `audit_log` consumption

---

## Cluster 01 findings (17 total)

### CRITICAL (3 — B-CRIT7, B-CRIT8 standalone; CT-007 is HIGH after dedup)

1. **B-CRIT7 Shopify revoke URL** — Plan 01:1280.
   - Current code: `POST .../admin/api/2024-01/access_tokens/:id/revoke` — does NOT exist in Shopify Admin API.
   - Fix: use `DELETE https://{shop}.myshopify.com/admin/api_permissions/current.json` with the per-shop access token in `X-Shopify-Access-Token` header.
   - Update the GDPR cron + the `disconnect-shopify` Edge Function. Verify against Shopify's official docs (see https://shopify.dev/docs/api/admin-rest/access/access-tokens — confirm via WebFetch).
   - Add integration test that the revoke call hits the correct endpoint (mock Shopify API).
   - Plan 01 line 1280 — replace the URL + add a comment citing the Shopify doc.

2. **B-CRIT8 in-memory rate-limit Map** — Plan 01:715-727.
   - `const rateLimitMap = new Map<string, number>()` at module scope. Serverless cold-starts blow away the cap.
   - Fix: persist rate-limit state in Postgres (new table `rate_limits` with composite key `(user_id, endpoint, window_start)`) OR Upstash Redis `INCR` + `EXPIRE`.
   - Recommend Postgres path for MVP (no new vendor). Migration:
     ```sql
     CREATE TABLE public.rate_limits (
       user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       endpoint text NOT NULL,
       window_start timestamptz NOT NULL,
       count int NOT NULL DEFAULT 1,
       PRIMARY KEY (user_id, endpoint, window_start)
     );
     CREATE INDEX idx_rate_limits_window ON public.rate_limits (window_start);
     -- 1-day TTL via cron
     ```
   - Edge Function uses `INSERT ... ON CONFLICT (user_id, endpoint, window_start) DO UPDATE SET count = count + 1`. If count > limit, reject.
   - Test with concurrent requests (simulated via Promise.all).

### HIGH (3)

3. **CT-007 audit_log writes in Edge Functions** — Plan 01 Tasks 3.3/4.3/5.3/6e.
   - **Depends on Cluster 11 shipping `audit_log` table + `writeAudit()` helper.** Do not start until that branch lands.
   - Add `writeAudit()` call to each Edge Function body:
     - Task 3.3 `deletion-request`: `writeAudit(supabase, { userId, eventType: 'deletion_requested', payload: { reason }, clusterOwner: '01' })`
     - Task 4.3 `deletion-restore`: same with `eventType: 'account_restored'`
     - Task 5.3 `email-change-request`: same with `eventType: 'email_change_requested'`
     - Task 6e `delete-account-cron`: same with `eventType: 'account_hard_deleted'`
   - Tests: verify each Edge Function inserts an audit row + that the row's `cluster_owner = '01'`.

4. **B-HIGH5 Stripe customers.del idempotencyKey arg slot** — Plan 01:1163-1164.
   - Current: `await stripe.customers.del(customerId, { idempotencyKey: '...' })` — wrong; second arg is `params`, not options.
   - Fix: `await stripe.customers.del(customerId, undefined, { idempotencyKey: '...' })`.
   - Verify against `@stripe/node` SDK docs (use Context7 — `mcp__context7__resolve-library-id` for `stripe-node`).

5. **B-HIGH15 audit_log error matching by string** — Plan 01:1392.
   - `if (logErr && !logErr.message.includes('does not exist'))` — locale-/version-fragile.
   - Fix: match on PostgreSQL SQLSTATE `42P01` (undefined_table):
     ```ts
     if (logErr && (logErr as { code?: string }).code !== '42P01') {
       throw logErr
     }
     ```
   - Note: after Cluster 11 ships `audit_log`, this defense becomes unreachable — but keep it for now as belt-and-suspenders; remove in a later cleanup pass.

### MEDIUM (7)

6. **B-MED1 SET search_path style** — Plan 01:278, 314, 1774.
   - Founder spec uses `SET search_path = 'public'` (single quote literal); plan uses `SET search_path = public, pg_temp`.
   - Recommendation: keep `public, pg_temp` (more secure — denies pg_temp injection). Update PRD 01 §5.1.1 to align if needed.
   - Document in CLAUDE.md `## Code Conventions` section: "SECURITY DEFINER RPCs use `SET search_path = public, pg_temp` (founder lock #15)."

7. **B-MED2 gdpr_queue_service_only RLS policy redundant** — Plan 01:266-270.
   - `CREATE POLICY ... FOR ALL TO service_role USING (true) WITH CHECK (true)` — no-op (service_role bypasses RLS).
   - Choose one: (a) remove the policy + add `COMMENT ON TABLE ... IS 'Service-role-only access; RLS bypassed by role'`, OR (b) keep as DDL-documentation.
   - Recommend option (a) — cleaner. Add the COMMENT.

8. **B-MED10 claim_deletion_queue_row TABLE shape** — Plan 01:1740.
   - RPC returns `TABLE (id uuid, attempts int)`; consumer reads `claim.attempts` (undefined on Array).
   - Fix per source recommendation:
     ```ts
     const row = Array.isArray(claim) ? claim[0] : claim
     if (!row) continue
     const newStatus = result.retriable && row.attempts < MAX_ATTEMPTS ? 'pending' : 'failed_terminal'
     ```
   - Add test exercising both single-row and empty-array returns.

9. **C-MED1 claim_pending_deletion_users RPC referenced but not defined** — Plan 01:1707.
   - Either author the RPC migration (preferred):
     ```sql
     CREATE OR REPLACE FUNCTION public.claim_pending_deletion_users(p_batch_size int DEFAULT 100)
     RETURNS TABLE (user_id uuid, deletion_requested_at timestamptz)
     LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
     AS $$
     BEGIN
       RETURN QUERY
       SELECT u.id, u.deletion_requested_at
       FROM public.users u
       WHERE u.deleted_at IS NULL
         AND u.deletion_requested_at IS NOT NULL
         AND u.deletion_requested_at < now() - interval '30 days'
       LIMIT p_batch_size
       FOR UPDATE SKIP LOCKED;
     END;
     $$;
     ```
   - OR replace cron's RPC call with explicit `service_role` SQL via supabase-js. RPC path is preferred (locks correctly).

10. **C-MED2 idempotency_keys not consulted by Edge Functions** — Plan 01 Tasks 3/4/5.
    - Import `verifyIdempotency` from `api/_shared/idempotency.ts` (Plan 11 Task 1.3).
    - Wire at the top of each Edge Function:
      ```ts
      const idempotencyKey = req.headers['x-idempotency-key']
      if (idempotencyKey) {
        const { cached, conflict } = await verifyIdempotency(supabase, {
          key: idempotencyKey,
          method: req.method,
          path: req.url,
          bodyText: await readBody(req),
        })
        if (conflict) return res.status(422).json({ error: 'idempotency_key_reused_with_different_body' })
        if (cached) return res.status(cached.status).json(cached.body)
      }
      ```
    - Tests verify 200 → replay → 200 + same body.

11. **C-MED3 inline HTML email templates** — Plan 01 Task 21.
    - 4 email templates currently inline HTML (sign-in magic link, deletion request, deletion restore, email-change).
    - Refactor to compose `<EmailShell>` from Plan 11 Task 8.2:
      ```ts
      // api/emails/magic-link.ts
      import { renderEmail } from '@/api/_shared/render-email'
      import { EmailShell } from '@/components/email/EmailShell.vue'
      export async function magicLinkEmail({ email, signInUrl }: Args) {
        return renderEmail(EmailShell, {
          headline: 'Sign in to Kova',
          body: `<p>Click the link below to sign in.</p>`,
          ctaText: 'Sign in',
          ctaUrl: signInUrl,
        })
      }
      ```
    - Coordinate with Cluster 11 agent re: C-MED-X.3 (which runtime ships the Resend wrapper).

12. **A-MED2 PRD 01 §12 OPEN QUESTIONS** — PRD 01 §12.8, §12.10.
    - Founder ratifies inline. Tag each with `RESOLVED 2026-05-19: <rationale>`.

### LOW (3)

13. **A-LOW2 cron dead-branch predicate** — PRD 01 §5.1.4:426.
    - `failed_terminal AND attempts < 5` is unreachable. Remove the predicate from PRD pseudocode.

14. **C-LOW01.5 rls-users-deleted-at.test.ts** — not added.
    - Author the test file. Verify: authenticated user CANNOT update `users.deleted_at`; service_role CAN. Verify column not in Supabase REST select results for authenticated session.

15. **C-LOW01.6 DangerZoneCard inline modal shell** — Plan 01 Task 14.
    - Refactor to use Plan 11 `<KovaModal>` primitive. Verify visual + accessibility parity.

16. **C-LOW01.7 EMAIL_CHANGE_LINK_TTL_HOURS=24** — Plan 01 Task 23.
    - Add to env defaults in `vercel.json` + `.env.example`. Document in PRD 01 §10.

### NOTE (1)

17. **B-NOTE1 Zod in Edge Function** — Plan 01:978, 982.
    - Verify Zod is imported in `api/auth/email-change-request.ts` (Edge Function, NOT tool layer). No change needed. Document in commit message that this is per founder lock #3.

---

## Cluster 12 findings (6 total)

### HIGH→CRITICAL (1)

18. **C-HIGH13 update_user_pref JSON.stringify double-encode** — PRD 12 §6.2.1:361 + Plan 12 Task 4.
    - Current: `supabase.rpc('update_user_pref', { p_path, p_value: JSON.stringify(value) })`.
    - supabase-js auto-JSON-encodes RPC args. Pre-stringifying double-encodes (`'large'` → `'"large"'`).
    - Fix: drop the `JSON.stringify` wrapper:
      ```ts
      supabase.rpc('update_user_pref', { p_path, p_value: value })
      ```
    - Update PRD 12 line 361 + Plan 12 Task 4 code blocks.
    - **Verify by writing a test that round-trips a string preference and asserts the stored value equals the input (not double-quoted).**

### HIGH (1)

19. **C-HIGH14 Resend stub task** — Plan 12:2035 + Plan 12 §92.
    - Plan 12 imports `_shared/resend-client.ts` from Cluster 01. PFC says "stub if Cluster 01 not landed" but provides no stub task.
    - Add a Plan 12 Task 16.0: stub `sendEmail()` returning `{ id: 'stub', skipped: true }` if `RESEND_API_KEY` unset. Document that this stub is removed once Cluster 01 ships the real client.
    - Coordinate with Cluster 11 (CT-015 Resend env-guard breadcrumb).

### MEDIUM (2)

20. **C-MED12.3 Recent colors cap** — PRD 12 §6.2.2:465 vs §2.1:81.
    - PRD-internal contradiction: §6.2.2 caps at 24, §2.1 caps at 12 (founder lock 2026-05-17).
    - Fix: edit §6.2.2 line 465 to read 12. Update §6.2.2 comment that says "24-color" to "12-color".
    - Add a Plan 12 test that asserts the FIFO buffer caps at 12.

21. **C-MED12.4 env-var guards missing** — Plan 12 Task 16 lines 2068-2070.
    - `createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)` crashes if env vars unset.
    - Fix with `loadEnvOrSkip()` helper (per QA-C Pattern 4 recommendation) or `requireEnv()` from Plan 11 Task 1.x:
      ```ts
      const supabaseUrl = requireEnv('SUPABASE_URL')
      const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY')
      ```
    - If the function should noop when env is missing (stub mode), use `loadEnvOrSkip` pattern instead.

### LOW (2)

22. **C-LOW12.5 sendEmail cross-cluster contract** — Plan 12 Task 16.
    - `sendEmail({ idempotencyKey })` signature is shared with Cluster 01. Document the contract in PRD 01 §5.4 (sendEmail signature reference). Coordinate with Cluster 01's email refactor (C-MED3).

23. **C-LOW12.6 Task 14 handoff note vs real code** — Plan 12 Task 14.
    - Currently an appended handoff note to Plan 04, not actual Plan 12 code. Convert to a real task body (Cluster 04 mounts `<AccessibilityPanel>` + `<NotificationsPanel>`) or remove from Plan 12 entirely and reference Plan 04.

---

## Combined output report

```markdown
## Wave 1 Cluster 01 + 12 — Fix Agent Report

**Branch:** fix/qa-w1-cluster-01-12-auth-settings
**Commits:** N

### Cluster 01 findings closed (17)
- [x] B-CRIT7 Shopify revoke URL — commit <hash>
- [x] B-CRIT8 rate-limit in-memory → Postgres — commit <hash>
- [x] CT-007 audit_log writes in 4 Edge Functions — commit <hash>
- [x] B-HIGH5 Stripe customers.del idempotencyKey — commit <hash>
- [x] B-HIGH15 SQLSTATE matching — commit <hash>
- [x] B-MED1 search_path style — commit <hash>
- [x] B-MED2 RLS policy → COMMENT — commit <hash>
- [x] B-MED10 claim row TABLE shape — commit <hash>
- [x] C-MED1 claim_pending_deletion_users RPC — commit <hash>
- [x] C-MED2 idempotency_keys integration — commit <hash>
- [x] C-MED3 EmailShell composition — commit <hash>
- [x] A-MED2 PRD §12 closures — commit <hash>
- [x] A-LOW2 cron dead-branch — commit <hash>
- [x] C-LOW01.5 RLS deleted_at test — commit <hash>
- [x] C-LOW01.6 KovaModal refactor — commit <hash>
- [x] C-LOW01.7 EMAIL_CHANGE_LINK_TTL_HOURS — commit <hash>
- [x] B-NOTE1 verified — no change

### Cluster 12 findings closed (6)
- [x] C-HIGH13 JSON.stringify double-encode — commit <hash>
- [x] C-HIGH14 Resend stub task — commit <hash>
- [x] C-MED12.3 recent-colors cap — commit <hash>
- [x] C-MED12.4 env-var guards — commit <hash>
- [x] C-LOW12.5 sendEmail contract documented — commit <hash>
- [x] C-LOW12.6 Task 14 cleanup — commit <hash>

### Migrations shipped
- `supabase/migrations/YYYYMMDDHHMMSS_create_rate_limits.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_claim_pending_deletion_users.sql`

### Tests added/modified
- `tests/api/shopify-revoke.test.ts`
- `tests/api/rate-limit-concurrent.test.ts`
- `tests/api/audit-writes-cluster-01.test.ts`
- `tests/db/rls-users-deleted-at.test.ts`
- `tests/api/idempotency-cluster-01.test.ts`
- `tests/stores/preferences-double-encode.test.ts`
- ...

### Cross-cluster dependencies satisfied
- audit_log consumption (CT-007) — Cluster 11 dependency confirmed before commit
- KovaIcon refactor (CT-003) — N icon migrations applied
- Resend wrapper (CT-015 + C-MED-X.3) — Cluster 11/12 coordination documented

### Quality gates
- [x] `bun run check` passes
- [x] `bun run test:unit` passes
- [x] All W0 CI gates green
- [x] No `as any`, no `process.env.X!`, no `jest.mock`/`vi.mock`, no `e.key`

### Blockers
None / list any blocked findings.
```

---

## Hard rules

1. **Wait for Cluster 11's `audit_log` table to be merged** before implementing CT-007 audit writes. If Cluster 11 hasn't merged, complete every OTHER finding first; come back to CT-007 last.
2. **Do NOT edit Cluster 11 files** except `api/_shared/audit.ts` IMPORT (not its definition).
3. **No `as any`. No `process.env.X!`. No `jest.mock`/`vi.mock`. No `e.key`. No `Math.random`.**
4. **All SECURITY DEFINER RPCs include `SET search_path = public, pg_temp`.**
5. **TDD per finding.** RED → GREEN → REFACTOR → COMMIT.

---

## When done

Push branch + open PR. Reply to founder with output report.

---

**End of W1 Cluster 01+12 dispatch prompt.**
