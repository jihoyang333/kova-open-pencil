# Wave 2 — Cluster 04 (Account + Stripe Billing) + Cluster 05 (Brand Kit Panel) Bundle Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Prerequisite:** Wave 1 merged. Verify with `git log --oneline feat/m9-shopify | grep "Merge W1"`.
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/` — the INNER repo. Do NOT work in the outer `~/kova-main/` repo.
**Base branch:** `feat/m9-shopify` — branch off its CURRENT HEAD. Do NOT branch off `master` or `main`.
**Worktrees:** FORBIDDEN. Do NOT run `git worktree add`. Work directly in `kova-open-pencil-1/` on a new branch off `feat/m9-shopify`.
**Branch to create:** `fix/qa-w2-cluster-04-05-stripe-brand-kit`
**Estimated wall-clock:** 1 day
**Output PR title:** `fix(qa-w2-cluster-04-05): account/Stripe + brand-kit-panel — 26 findings`

---

## Mission

Cluster 04 = Account page + Stripe Billing + integrations refactor + GDPR cascade. Cluster 05 = canvas-side Brand Kit panel + drag-drop + voice draft + brand-kit-extract pipeline. Both consume Cluster 11 primitives + Cluster 01 auth + Cluster 03 brand schema.

Your job: close **26 findings** (19 Cluster 04 + 7 Cluster 05).

---

## Required reading

1. CONSOLIDATED-TRIAGE.md — Cluster 04 + Cluster 05 sections
2. QA-A — A-LOW4
3. QA-B — B-CRIT4, B-CRIT12, B-HIGH7, B-HIGH9, B-HIGH12, B-HIGH16, B-HIGH17, B-MED3, B-MED8, B-MED13, B-MED14
4. QA-C — Pair 04 + Pair 05 matrices; HIGH-... (covered in cluster sections), MEDIUM-04.1/2/3, MEDIUM-05.1, LOW-04.4-7, LOW-05.2-4
5. CT-006 (Cmd+K residual in PRD 04), CT-008 (trialing union), CT-019 (M9 access_token grep)
6. Frozen decisions
7. PRDs 04 + 05, Plans 04 + 05

---

## Cluster 04 findings (19)

### CRITICAL (2)

1. **B-CRIT12 Stripe webhook Next.js Pages-Router config** — Plan 04:1251, 1313-1317.
   - `export const config = { api: { bodyParser: false } }` is Next.js Pages-Router syntax. Project uses standalone Vercel Functions (no Next.js).
   - Fix: read raw body via Buffer:
     ```ts
     import type { VercelRequest, VercelResponse } from '@vercel/node'
     async function readRawBody(req: VercelRequest): Promise<Buffer> {
       const chunks: Buffer[] = []
       for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
       return Buffer.concat(chunks)
     }
     export default async function handler(req: VercelRequest, res: VercelResponse) {
       const rawBody = await readRawBody(req)
       const sig = req.headers['stripe-signature']
       const event = stripe.webhooks.constructEvent(rawBody, sig as string, process.env.STRIPE_WEBHOOK_SECRET!)
       // ...
     }
     ```
   - **Validate against Stripe test webhook** (`stripe trigger checkout.session.completed --api-key sk_test_...`) — must verify signature.
   - Remove the bogus `export const config` line.

2. **B-CRIT4 / CT-003 Dynamic `<component :is="\`icon-lucide-${...}\`">`** — Plan 04:2332.
   - unplugin-icons cannot resolve dynamic icon names. Migrate to `<KovaIcon :name="iconName">`.

### HIGH→CRITICAL (1)

3. **CT-008 planStatus union missing 'trialing'** — Plan 04:1882-1883.
   - DB CHECK constraint includes `'trialing'`. Store type union has `'active' | 'past_due' | 'canceled' | 'unpaid'` (missing `'trialing'`).
   - Fix:
     ```ts
     type PlanStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'
     ```
   - Update `<TrialBanner>` predicate — should now work after type extension. Test that trialing users see the banner.

### HIGH (5)

4. **B-HIGH9 req.headers.get on Vercel req** — Plan 04:1268, 1318.
   - Vercel's `VercelRequest.headers` is a plain object, NOT a Headers instance. `.get()` doesn't exist.
   - Fix: `req.headers['stripe-signature']` (bracket access). Note multi-value headers: `Array.isArray(sig) ? sig[0] : sig`.

5. **B-HIGH12 req.headers as any** — Plan 04:901, 1008.
   - Founder lock #10 violation. Fix:
     ```ts
     const authHeader = req.headers['authorization']
     const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader
     if (!auth) return res.status(401).json({ error: 'missing_auth' })
     ```

6. **B-HIGH16 Migration SQL "copy verbatim from PRD" not inlined** — Plan 04:109, 222.
   - Plan says "copy verbatim from PRD §4.1" but doesn't inline. Fix agent (you) inlines the SQL now.
   - Open PRD 04 §4.1, copy the migration DDL, paste into Plan 04 Task 1.1.

7. **CT-006 (a) Cmd+K residual in §13.8 "What is NOT" list** — PRD 04:1625.
   - Remove `Command-K /` substring. Tag §13.8 changelog: "Cmd+K dropped 2026-05-17 per 00g — see PRD 02 §12.13."

8. **CT-019 M9 access_token grep guard in PRD 04** — PRD 04 §6.4.5.
   - PRD 02 has §9.5 grep check that `?access_token=` not present in URLs post-M9. PRD 04 IntegrationsCard refactor lacks same check.
   - Add §9.5 grep guard mirroring PRD 02:
     ```sh
     ! grep -rnE "access_token=" kova-open-pencil-1/src/ kova-open-pencil-1/api/
     ```
   - Tie to CI.

### MEDIUM (8)

9. **B-MED8 webhook 5xx semantics** — Plan 04:1298-1309.
   - Current: catch returns 200. Stripe doesn't retry on 200. Idempotency dedupe permanently silences retriable errors.
   - Fix:
     ```ts
     try {
       await eventHandler(event, supabase)
       return res.status(200).json({ received: true })
     } catch (err) {
       const isRetriable = !(err instanceof NonRetriableError) // define your taxonomy
       if (isRetriable) {
         // Do NOT write idempotency row; let Stripe retry
         return res.status(500).json({ error: 'handler_failed', retriable: true })
       }
       // Non-retriable: write idempotency row with outcome 'error', return 200 (suppress retries)
       await supabase.from('idempotency_keys').upsert({ key, outcome: 'error', ... })
       return res.status(200).json({ received: true, error: 'handler_failed', retriable: false })
     }
     ```
   - Tests: simulate retriable (e.g., DB connection drop) and non-retriable (e.g., invalid event payload) and assert correct status codes.

10. **B-MED13 avatar storage RLS** — Plan 04:1610.
    - `users/{user_id}/avatar.png` path; Plan 04 doesn't author the bucket RLS.
    - Fix: tighten storage path check on write — `storage_path === expected` exact match. Verify Plan 11 ships bucket RLS (`storage.objects` policy for `bucket_id = 'avatars'` and `auth.uid()::text = (storage.foldername(name))[1]`).
    - If Plan 11 doesn't ship it, add migration here OR coordinate with Cluster 11 fix agent.

11. **B-MED14 reconcile cron past_due → active healing** — Plan 04:1464-1467.
    - When healing `past_due → active`, also reset `current_period_end` + `cancel_at_period_end` to current Stripe values.
    - Fix:
      ```ts
      await supabase.from('users').update({
        plan_status: 'active',
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
      }).eq('id', userId)
      ```

12. **B-MED3 STRIPE_SECRET_KEY apiVersion test paths** — Plan 04 multiple.
    - Production code at L527 has `apiVersion: '2024-10-28.acacia'`. Test mocks bypass real Stripe construction. **Acceptable.**
    - No change. Document in commit message that this was verified.

13. **C-MED13 email templates not extending `<EmailShell>`** — PRD 04 §5.4.3 + Plan Task 14.4.
    - Refactor receipt + cancellation + reactivation emails to compose `<EmailShell>`. Coordinate with Cluster 01 fix agent (C-MED3) on the wrapper pattern.

14. **C-MED14 `<StripeReturnLanding>` Cluster 01 component reuse** — Plan 04 Task 12.2.
    - Import `<AuthMedal>` + `<AuthIcon>` from Cluster 01.
    - Update Task 12.2 to compose Cluster 01 auth-page primitives.

15. **C-MED15 Brand Kit shell `?tab=` sub-route** — Plan 04 Task 10.1.
    - Currently `<Skeleton>` placeholder. Wire `<router-view>` reading the `?tab=` query param. Each tab (`?tab=colors`, `?tab=fonts`, etc.) renders a different brand-kit pane.

16. **C-LOW04.4 M9 integrations refactor stubs** — Plan 04 Tasks 11.4-11.8.
    - 8 transforms collapsed to "TDD per pattern" stubs. Enumerate per-component test cases. Each transform = its own TDD body.

### LOW (3)

17. **C-LOW04.5 6 webhook event handler tests not enumerated** — Plan 04 Task 3.7.
    - Enumerate 6 scenarios: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed. Each = its own test case.

18. **C-LOW04.6 access_token grep** — Plan 04 Task 15.2.
    - Grep gate is currently theme-drift-only; doesn't check access_token. Resolves with CT-019 above.

19. **C-LOW04.7 price_id server validation** — Plan 04 Task 3.1.
    - Uses inline values from Task 2.3 price map. Move to env-var whitelist per PRD §5.1.1:
      ```ts
      const ALLOWED_PRICE_IDS = [
        process.env.STRIPE_PRICE_ID_SOLO,
        process.env.STRIPE_PRICE_ID_AGENCY,
      ].filter(Boolean)
      if (!ALLOWED_PRICE_IDS.includes(req.body.price_id)) return res.status(400).json({ error: 'invalid_price' })
      ```

20. **A-LOW4 sidebar count 5 vs 6** — PRD 04 §1.1, §1.2.
    - Narrative says "5 sidebar sections"; §2.1/§3.1/§8.1 say 6 (post-B12 reversal Brands ships visible).
    - Update §1.1 + §1.2 to say 6.

---

## Cluster 05 findings (7)

### HIGH (2)

21. **B-HIGH7 i-lucide class-strings + dynamic `<component :is>`** — Plan 05:2230-2236, 2253.
    - Migrate to `<KovaIcon name="...">`. Same fix as Cluster 06 row B-HIGH7 (06).

22. **B-HIGH17 dynamic `<component :is="'i-lucide-palette'">`** — Plan 05:2253.
    - Literal component name `'i-lucide-palette'` doesn't exist as a registered Vue component.
    - Resolves with `<KovaIcon name="palette">`.

### MEDIUM (1)

23. **C-MED16 per-tab components compressed** — Plan 05 Tasks 21-27.
    - 7 per-tab components (colors / fonts / logo / saved-blocks / tone-snippets / voice / product-references) compressed into one block.
    - Expand each task into its own TDD body. Each tab: 1 test for mount, 1 for CRUD action, 1 for empty-state.

### LOW (4)

24. **C-LOW05.2 Color picker popover Cluster 07b dependency** — Plan 05 Task 21.
    - Cross-cluster dependency mention is thin. Add: "Color picker popover provided by Cluster 07b `<ColorPickerPopover>`. If Cluster 07b not yet shipped at integration time, use temporary `<input type='color'>` fallback (see Plan 11 `<ColorInput>` primitive if available)."

25. **C-LOW05.3 Edge Function crypto.randomUUID body not shown** — Plan 05 Task 12.
    - Show the idempotency body in plan:
      ```ts
      const idempotencyKey = crypto.randomUUID()
      const { cached } = await verifyIdempotency(supabase, { key: idempotencyKey, method: 'POST', path: '/api/brand-kit/extract', bodyText })
      if (cached) return res.json(cached.body)
      // ... actual extraction
      ```

26. **C-LOW05.4 brand-kit-extract rate-limit guard** — Plan 05 Task 17.
    - 1 req/hour/brand. Add explicit guard using `rate_limits` table (from Cluster 01 fix B-CRIT8 above):
      ```ts
      const windowStart = new Date()
      windowStart.setMinutes(0, 0, 0)
      const { count, error } = await supabase.from('rate_limits').select('count', { count: 'exact' })
        .eq('user_id', userId).eq('endpoint', `/api/brand-kit/extract/${brandId}`).eq('window_start', windowStart.toISOString())
      if ((count?.[0]?.count ?? 0) >= 1) return res.status(429).json({ error: 'rate_limited' })
      ```

27. **B-LOW4 count: null TODO** — Plan 05 (already noted, low priority).
    - Acceptable cross-cluster stitch. Add reference: `// TODO(cluster-10): wire real count once useChatMemoriesStore is shipped`.

---

## Output report (template)

```markdown
## Wave 2 Cluster 04 + 05 — Fix Agent Report

**Branch:** fix/qa-w2-cluster-04-05-stripe-brand-kit
**Commits:** N

### Cluster 04 findings closed (19)
- [x] B-CRIT12 Stripe webhook raw body — commit <hash>
- [x] B-CRIT4 KovaIcon migration — commit <hash>
- [x] CT-008 planStatus 'trialing' — commit <hash>
- [x] B-HIGH9 req.headers bracket access — commit <hash>
- [x] B-HIGH12 req.headers narrowing — commit <hash>
- [x] B-HIGH16 SQL inlined — commit <hash>
- [x] CT-006(a) Cmd+K residual — commit <hash>
- [x] CT-019 access_token grep gate — commit <hash>
- [x] B-MED8 webhook 5xx — commit <hash>
- [x] B-MED13 avatar storage RLS — commit <hash>
- [x] B-MED14 reconcile current_period_end — commit <hash>
- [x] B-MED3 verified — no change
- [x] C-MED13 EmailShell composition — commit <hash>
- [x] C-MED14 AuthMedal/AuthIcon reuse — commit <hash>
- [x] C-MED15 router-view sub-route — commit <hash>
- [x] C-LOW04.4 per-transform tests — commit <hash>
- [x] C-LOW04.5 6 webhook tests — commit <hash>
- [x] C-LOW04.6 access_token grep — commit <hash>
- [x] C-LOW04.7 env-var whitelist — commit <hash>
- [x] A-LOW4 sidebar count fix — commit <hash>

### Cluster 05 findings closed (7)
- [x] B-HIGH7 KovaIcon migration — commit <hash>
- [x] B-HIGH17 dynamic :is removed — commit <hash>
- [x] C-MED16 per-tab TDD — commit <hash>
- [x] C-LOW05.2 cross-cluster reference — commit <hash>
- [x] C-LOW05.3 idempotency body shown — commit <hash>
- [x] C-LOW05.4 rate-limit guard — commit <hash>
- [x] B-LOW4 TODO reference — commit <hash>

### Tests added
- Stripe webhook raw-body test
- Webhook 5xx retriable/non-retriable scenarios
- planStatus 'trialing' E2E
- ...

### Cross-cluster
- KovaIcon (Cluster 11)
- audit_log via writeAudit
- rate_limits table (from Cluster 01 fix)
- EmailShell (Cluster 11) + sendEmail signature (Cluster 01)
- 6-sidebar-section narrative consistent across PRD 02 + 04

### Quality gates
- [x] All checks pass
- [x] CI gates green

### Blockers
None / list.
```

---

## Hard rules

Same. Particular focus for this dispatch:
- **Stripe webhook signature verification** must pass `stripe trigger` test before merge.
- **All Edge Functions** consume `verifyIdempotency` + `writeAudit` from Cluster 11.
- **No founder-lock violations**.

---

**End of W2 Cluster 04+05 dispatch prompt.**
