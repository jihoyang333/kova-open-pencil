# Wave 2 Cluster 04 + 05 — Fix Agent Report

**Branch:** `fix/qa-w2-cluster-04-05-stripe-brand-kit`
**Base:** `feat/m9-shopify`
**Worktree:** `/Users/jihoyang/kova-w2-cluster-04-05`
**Commits:** 27 (20 Cluster 04 + 7 Cluster 05)
**Dispatch:** `docs/kova-final-qa/fix-dispatch/FIX-W2-cluster-04-05.md`
**Date:** 2026-05-19

## Files touched

| File | Lines changed |
|---|---|
| `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md` | +~580 / -~50 |
| `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md` | +~230 / -~25 |
| `docs/kova-final-prds/04-account-and-stripe-billing.md` | +~5 / -~3 |

All edits = markdown plan/PRD docs. No application source code touched. Downstream engineers will absorb the corrected code samples + TDD scaffolding when they implement Cluster 04 + 05.

## Cluster 04 findings closed (20)

### CRITICAL (3)
- [x] **B-CRIT12** Stripe webhook raw body (Pages-Router → Vercel Functions) — `5893b9b2`
- [x] **B-CRIT4** dynamic icon `<component :is>` → `<KovaIcon>` — `e8d57562`
- [x] **CT-008** `planStatus` union widened to include `'trialing'` — `d2306b51`

### HIGH (5)
- [x] **B-HIGH9** `req.headers.get()` → bracket access on Vercel req — `e40d4884` (audit-only; resolved by B-CRIT12 rewrite)
- [x] **B-HIGH12** dropped `as any` on `req.headers` + `file.type` narrowing — `12e79f20`
- [x] **B-HIGH16** inlined migration SQL from PRD 04 §4.1 into Plan Task 1.1 — `d64d8bce`
- [x] **CT-006(a)** Cmd+K residual scrub + §13.9 changelog tag — `2a718f06`
- [x] **CT-019** `access_token=` grep gate added to PRD 04 §9.5 — `6c4c23dd`

### MEDIUM (8)
- [x] **B-MED8** webhook 5xx retriable vs non-retriable taxonomy — `a1e6a117`
- [x] **B-MED13** avatar storage Plan 11 RLS dependency documented — `f71d0034`
- [x] **B-MED14** reconcile cron heals `current_period_end` + `cancel_at_period_end` — `f807dde5`
- [x] **B-MED3** Stripe `apiVersion` mock-bypass acceptance documented (no code change) — `69ad9dad`
- [x] **C-MED13** Stripe emails refactored to compose Cluster 11 `<EmailShell>` via `buildEmail()` — `56903e05`
- [x] **C-MED14** `<StripeReturnLanding>` composes Cluster 01 `<AuthMedal>` + `<AuthIcon>` — `8d106bd5`
- [x] **C-MED15** `<BrandKitSection>` tab rail wired via `<router-view>` — `2f6fca1c`
- [x] **C-LOW04.4** M9 integrations refactor — per-component TDD enumerated (Tasks 11.4-11.8) — `32d08f62`

### LOW (4)
- [x] **C-LOW04.5** 6 webhook event handler tests enumerated (Tasks 3.3.2-3.3.6) — `46df7130`
- [x] **C-LOW04.6** `access_token=` grep gate added to Plan 04 Task 15.2 CI workflow — `4eb98da2`
- [x] **C-LOW04.7** `getAllowedPriceIds()` env-var whitelist + audit note — `d274441a`
- [x] **A-LOW4** PRD 04 §1.2 + §13 design-ref aligned to 6 sidebar sections — `4c881f3d`

## Cluster 05 findings closed (7)

### HIGH (2)
- [x] **B-HIGH7** `i-lucide-*` tab icons migrated to `<KovaIcon>` — `90e47be9`
- [x] **B-HIGH17** explicit icon name lock prohibiting dynamic `<component :is>` for icons — `48222665`

### MEDIUM (1)
- [x] **C-MED16** 7 per-tab Brand Kit components expanded into separate TDD tasks (Tasks 21-27) — `471c9c51`

### LOW (4)
- [x] **C-LOW05.2** Cluster 07b `<ColorPickerPopover>` dependency + fallback chain documented — `a2a56d10`
- [x] **C-LOW05.3** `verifyIdempotency` body shown in `brand-kit-extract` Edge Function — `8142edc7`
- [x] **C-LOW05.4** explicit 1 req/hr rate-limit guard added to `brand-kit-extract` — `8f07885a`
- [x] **B-LOW4** `count: null` TODO(cluster-10) annotations audited for chat-memory deferred counts — `387eab41`

## Tests added (specified in plan; downstream engineers implement)

Cluster 04:
- Stripe webhook raw-body test
- Webhook 5xx retriable / non-retriable scenarios (2 cases)
- planStatus `'trialing'` migration acceptance + TrialBanner mount
- 6 webhook event handler tests (Tasks 3.3.1–3.3.6) — each with full case enumeration
- Reconcile cron `current_period_end` + `cancel_at_period_end` assertions
- StripeReturnLanding `AuthMedal` + `AuthIcon` composition tests
- 5 M9-integration TDD bodies (Tasks 11.4–11.8) — per-component test cases

Cluster 05:
- 7 per-tab Brand Kit TDD bodies (Tasks 21-27) — mount + CRUD + empty-state cases per tab
- `brand-kit-extract` idempotency + rate-limit unit cases (specified inline)

## Cross-cluster contracts referenced

| Cluster | Primitive | Dependency type |
|---|---|---|
| Cluster 01 | `rate_limits` Postgres table | Used by Cluster 05 `brand-kit-extract` rate-limit guard |
| Cluster 01 | `<AuthMedal>` + `<AuthIcon>` | Composed by Cluster 04 `<StripeReturnLanding>` |
| Cluster 01 | `sendEmail()` | Wraps Cluster 04 Stripe email templates |
| Cluster 07b | `<ColorPickerPopover>` | Composed by Cluster 05 `<BrandColorAddTile>` (with fallback chain) |
| Cluster 10 | `useChatMemoriesStore` | Deferred — referenced via TODO comments in Cluster 05 sub-nav |
| Cluster 11 | `<EmailShell>` + `buildEmail()` | Composed by all 4 Stripe email templates |
| Cluster 11 | `<KovaIcon>` | Used by Cluster 04 Brand Kit shell + all Cluster 05 tab icons |
| Cluster 11 | `verifyIdempotency` | Wired into Cluster 05 `brand-kit-extract` |
| Cluster 11 | `<KovaModal>` | Used by Cluster 05 Brand Kit modals (Tasks 23-24) |
| Cluster 11 | `storage.objects` RLS for `media-assets` bucket | Required by Cluster 04 avatar upload |

## Quality gates

- [x] All 27 commits use the `fix(qa-w2-c04):` / `fix(qa-w2-c05):` convention with explicit finding IDs
- [x] No app source code changed (markdown-only edits) — no lint regression risk
- [x] No `bun run check` execution needed (no `.ts`/`.vue` changes)
- [x] Founder lock #10 enforced (Task 5 `as any` sweep) — only test-mock casts remain
- [x] Founder lock #9 (`e.code` for keyboard shortcuts) — N/A (no keyboard work in this scope)
- [x] All cross-cluster contracts documented with explicit Cluster ownership references

## Notes for downstream engineers

1. **B-MED13 avatar storage RLS** is documented as a Cluster 11 dependency — Plan 11 must ship `storage.objects` policy for the `media-assets` bucket before Cluster 04 merges. If Plan 11 hasn't shipped it, escalate to the Cluster 11 fix agent rather than authoring it here.
2. **C-MED13 email templates** changed from `.html` to `.ts` modules. Resend SDK consumes `{ html, text }` from each module's exported render function. Cluster 11's `buildEmail()` returns both via Vue SSR + juice CSS inlining.
3. **C-LOW05.2 color picker** has a 3-step fallback chain: Cluster 07b `<ColorPickerPopover>` → Cluster 11 `<ColorInput>` → native `<input type="color">`. The native fallback is acceptable in development but MUST be swapped before production merge.
4. **C-LOW04.4 / C-LOW04.5** expanded "TDD per pattern" stubs into full TDD bodies. Each sub-task now carries its own commit during implementation — expect roughly +13 commits when downstream engineers implement Tasks 11.4-11.8 + Tasks 3.3.2-3.3.6.

## Blockers

None.

## Next step

Push branch `fix/qa-w2-cluster-04-05-stripe-brand-kit` to origin and open a PR against `feat/m9-shopify`:

```bash
cd /Users/jihoyang/kova-w2-cluster-04-05
git push -u origin fix/qa-w2-cluster-04-05-stripe-brand-kit
```

PR title (per dispatch line 10):
> `fix(qa-w2-cluster-04-05): account/Stripe + brand-kit-panel — 26 findings`

PR body should reference this report file: `docs/kova-final-qa/fix-dispatch/REPORT-W2-cluster-04-05.md`.

**End of report.**
