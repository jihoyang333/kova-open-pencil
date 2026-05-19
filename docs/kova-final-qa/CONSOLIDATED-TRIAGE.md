# Kova Pre-Build QA Triage — Consolidated

**Source reports:** QA-A (24 findings) + QA-B (63 findings — 62 valid, HIGH-18 self-marked false alarm) + QA-C (86 findings) = 173 raw findings
**Deduplicated:** 158 unique findings after merge (24 cross-agent merges; HIGH-18 dropped per author self-correction)
**Date:** 2026-05-18 (re-audited 2026-05-19 — 9 previously-missed findings added; cluster row counts corrected)
**Status:** READY FOR FOUNDER REVIEW

---

## Severity totals (post-dedup)

| Severity | Count | % of total |
|---|---|---|
| CRITICAL | 19 | 12.0% |
| HIGH | 36 | 22.8% |
| MEDIUM | 56 | 35.4% |
| LOW | 41 | 25.9% |
| NOTE (locked) | 6 | 3.8% |
| **Total** | **158** | 100% |

Severity follows max-of-three merge rule. Source-report duplicates (e.g., `audit_log` flagged by `A-CRIT1 + B-HIGH15 + B-consumer-refs(5) + C-CRIT4`) elevate to the highest tag any auditor assigned. Counts above are post-elevation.

**NOTE row interpretation:** The `NOTE | 6` row above counts **raw source-side NOTEs** before merges (A-NOTE1/2/3 + B-NOTE1/2/3). After consolidation, post-merge NOTE rows = **4** (A-NOTE1 elevated to MEDIUM via CT-020; A-NOTE2+A-NOTE3 merged into CT-021; standalone B-NOTE1/2/3 retained). Total of 158 unique findings is unaffected.

---

## Source Reports (authoritative — fix agents MUST read)

Every finding row in this document cites a source-report ID in its `Source` column. The CONSOLIDATED-TRIAGE.md (this doc) is a navigation index. **The source reports contain the full evidence, line numbers, code snippets, and recommended-fix code diffs.** Fix agents are required to read the corresponding source-report section for every finding they touch.

| Source report | Path | When fix agent must read |
|---|---|---|
| **QA-A** (PRD Cross-Consistency Audit) | `kova-open-pencil-1/docs/kova-final-qa/findings/QA-A-findings.md` (796 lines, 24 findings) | Any finding with ID prefixed `A-` or `CT-NNN` where the CT row Source column cites `A*` |
| **QA-B** (Implementation Plan Code + TDD Audit) | `kova-open-pencil-1/docs/kova-final-qa/findings/QA-B-findings.md` (1364 lines, 63 findings) | Any finding with ID prefixed `B-` or `CT-NNN` where the CT row Source column cites `B*` |
| **QA-C** (PRD↔Plan Reconciliation Audit) | `kova-open-pencil-1/docs/kova-final-qa/findings/QA-C-findings.md` (1123 lines, 86 findings) | Any finding with ID prefixed `C-` or `CT-NNN` where the CT row Source column cites `C*` |

**ID → source-section lookup (apply this lookup to find evidence in source reports):**

- ID `A-CRIT1` / `A-CRITICAL-1` → in QA-A look for heading `### CRITICAL-1: ...`
- ID `A-HIGHn` → in QA-A heading `### HIGH-n: ...`
- ID `A-MEDn` → in QA-A heading `### MEDIUM-n: ...`
- ID `A-LOWn` → in QA-A heading `### LOW-n: ...`
- ID `A-NOTEn` → in QA-A heading `### NOTE (locked)-n: ...`
- ID `B-CRITn` / `B-CRITICAL-n` → in QA-B heading `### CRITICAL-n: ...`
- ID `B-HIGHn` → in QA-B heading `### HIGH-n: ...`
- ID `B-MEDn` → in QA-B heading `### MEDIUM-n: ...`
- ID `B-LOWn` → in QA-B heading `### LOW-n: ...`
- ID `B-NOTEn` → in QA-B heading `### NOTE (locked)-n: ...`
- ID `C-CRITn` → in QA-C heading `### CRITICAL-n: ...`
- ID `C-HIGHn` → in QA-C heading `### HIGH-n: ...`
- ID `C-MEDn` → in QA-C heading `### MEDIUM-n: ...` (also see per-pair coverage matrix near top of QA-C for cluster-prefixed alias `MEDIUM-NN.M`)
- ID `C-LOWNN.M` → in QA-C "Per-pair coverage matrix" section, find row containing `LOW-NN.M`
- ID `CT-NNN` → see "Cross-agent overlap map" below for source IDs merged; read each one in its respective source report

**How to read each cluster section:**

1. Read the cluster header (count, top blockers, dispatch budget).
2. For each row, look up the `Source` column IDs in the source reports listed above.
3. Apply the `Recommended Fix` column, but always cross-check against the full source-report entry first — it contains code snippets, exact line numbers, and edge cases not visible in this triage table.
4. For merged CT-NNN findings, read every source ID that contributed to the merge.

---

## Cross-agent overlap map (24 merged findings)

Findings flagged by 2+ auditors. The merged row IDs are listed in the cluster tables below. The **Cluster owner** column lists the owning cluster (Wave dispatch destination); parenthesized clusters are consumer-side fixes that follow once the owner ships the canonical decision.

| Merge ID | Severity | Cluster owner | Auditors | Topic |
|---|---|---|---|---|
| **CT-001** | CRITICAL | 11 (→ 01, 03, 04, 05 consumers) | A-CRIT1 + B-HIGH15 + B-consumer-refs(5) + C-CRIT4 (see Inconsistencies #1) | `audit_log` table referenced by 5 PRDs but never DDL'd; 3 consumer plans diverge |
| **CT-002** | CRITICAL | 02 (→ 03, 06, 10 consumers) | B-CRIT1 + C-HIGH10 | Cross-plan routing inconsistency — `/brand/:brandId` vs `/dashboard?brandId=` (Plan 02 vs 03/06); also `useRightPanelStore` vs `useRightPanelTabStore` name drift Plan 10 vs 06 |
| **CT-003** | CRITICAL | 11 (→ 02, 03, 04, 05, 06 consumers) | B-CRIT3 + B-CRIT4 + B-HIGH7 + B-HIGH17 + C-HIGH12 | Icon-component syntax broken across plans — `<Icon name="lucide:...">` (Nuxt), dynamic `<component :is="\`icon-lucide-${name}\`">`, `i-lucide-*` class strings, `<icon-lucide-:name>` syntax |
| **CT-004** | HIGH | 07a (lock) → 07b, 10, scope plan | A-HIGH3 + A-MED5 + A-MED7 (see Inconsistencies #8) | MEASUREMENT NodeType drift — PRD 07b, PRD 10, scope plan §3 stale on founder lock #14 (page-level, not NodeType) |
| **CT-005** | HIGH | 06 (lock) → 10 consumer | A-HIGH2 + A-HIGH4 | Default-active tab — PRD 10 + PRD 06 line 253 contradict PRD 06 §12.13 founder lock (AI default) |
| **CT-006** | HIGH | 11 (00g kill) → 04, 06, 08 scrubs | A-HIGH1 | Cmd+K command palette residuals in PRD 04 / 06 / 08 after 00g kill decision (single-auditor but cross-PRD) |
| **CT-007** | HIGH | 01 (depends on CT-001) | A-CRIT1 (elevated) + B-HIGH15 + C-HIGH1 | Plan 01 audit_log writes not implemented in Edge Functions (PRD §5.1 specifies 4 inserts; plan grep returns 0) |
| **CT-008** | CRITICAL | 04 | B-CRIT15 + A-MED9 | `plan_status` union missing `'trialing'` — DB CHECK includes, store type doesn't (max-of-three: B-CRIT15 elevates) |
| **CT-009** | HIGH | cross-cluster (W0-9 — all plans) | B-HIGH1 + B-HIGH2 | Founder-lock #10 violations — 24 `process.env.X!` + ~214 `as any` across plans (especially Plan 03: 49, Plan 06: 41) |
| **CT-010** | CRITICAL | cross-cluster (W0-6 cleanup — 01, 02, 03, 04) | B-CRIT5 + B-CRIT6 + B-HIGH8 (max-of-three: B-CRIT5/6 elevate) | Test framework drift — `jest.mock` in Plan 02, `vi.mock` in Plan 03, `mockImplementationOnce` Jest-isms in Plans 01-04 (project uses bun:test) |
| **CT-011** | HIGH | 01 (root UserProfile) → 02, 04 consumers | B-HIGH4 + B-MED16 + C-HIGH3 | Cross-plan profile shape — `auth.profile.email` doesn't exist; Plan 01 UserProfile interface lacks email field; Plans 02 + 04 read it repeatedly. Also useOnboarding inject identifier mismatch (Plan 02 T13 vs T17) |
| **CT-012** | HIGH | 02 | B-CRIT11 + B-HIGH14 | Plan 02 RecentsView reads `sortMode` from wrong store (canvasesStore vs dashboardStore) + direct mutation antipattern |
| **CT-013** | CRITICAL | cross-cluster (W0-5 — 03, 05, 09 + CI gate in 11) | B-CRIT2 + C-LOW (per Pattern 4; see Inconsistencies #4) | SECURITY DEFINER RPCs missing `SET search_path` — Plan 03 (0/8), Plan 05 (0/1), Plan 09 (0/3) |
| **CT-014** | HIGH | 03 | B-HIGH10 + B-HIGH19 | Plan 03 `pg_indexes` REST query won't resolve (pg_catalog schema not exposed); also error-message regex matching `/unique/i` is locale-/version-fragile |
| **CT-015** | HIGH | 11 (pattern) → 12 consumer | B-HIGH13 + C-MED-stub | Resend env-guard pattern lacks Sentry breadcrumb for skipped sends (Plan 11 + Plan 12) |
| **CT-016** | MEDIUM | scope-plan author (W0-10) | A-MED4 + A-MED5 + A-LOW1 | Scope plan §3 stale — Cluster 06 Prototype "DEFERRED" vs "out of scope entirely"; Cluster 07 still cites Q11 MEASUREMENT NodeType; §2.1 file inventory still says `07-canvas-engine-extensions.md` |
| **CT-017** | MEDIUM | founder (PRD 01/02/11) | A-MED1 + A-MED2 + A-MED3 | Unresolved §12 OPEN QUESTIONS — PRD 02 (2), PRD 01 (2), PRD 11 (2) need RESOLVED/DROPPED/DEFERRED tags |
| **CT-018** | MEDIUM | 07a, 07b, 09, 10 (status hygiene; see Inconsistencies #5) | A-MED6 + A-LOW6 + A-HIGH5 | PRD status field staleness — PRDs 07a, 07b, 09, 10 carry pre-2026-05-17 status despite body citing ratifications |
| **CT-019** | MEDIUM | 02 (owner) → 04 consumer | A-MED8 + C-LOW04.6 | M9 `access_token`-in-URL launch-blocker — PRD 02 has §9.5 grep check; PRD 04 IntegrationsCard refactor lacks the same acceptance criterion |
| **CT-020** | MEDIUM | 11 (lock) → 02 consumer | A-NOTE1 | Sidebar offline `.net-strip` retired in PRD 11 §3.7 but PRD 02 still specs 3 offline signals |
| **CT-021** | NOTE | scope-plan §6 doc (NOTE-locked — see Deferred section) | A-NOTE2 + A-NOTE3 | `/brands` + `/account/brands` cross-cluster route registration coordination (PRD 02 placeholder vs PRD 03 real; PRD 04 owns route vs PRD 03 owns content) |
| **CT-022** | CRITICAL | 07b (sole, per 2026-05-17 lock; see Inconsistencies #7) | C-CRIT1 + C-CRIT2 + C-CRIT3 | Cross-cluster find-feature ownership conflict — both Plan 07b and Plan 08 ship `src/stores/find.ts`, `<FindOverlay>`, and bind `Cmd+F`. Founder lock 2026-05-17 says 07b owns. (Three CRITICALs in C merge into one decision-blocker.) |
| **CT-023** | HIGH | 03 | C-HIGH4 + C-HIGH5 + C-HIGH6 + C-MED11 + C-MED12 | Plan 03 addendum 8-task gap — 6 of 8 tasks (10.5 writeAudit, 13.5 restore endpoint, 26.5 RestoreBrandModal, 33.5/.6/.7/.8 archive views + NotShippedYet shim) listed but never authored; consumers import them and break at compile time |
| **CT-024** | CRITICAL | 03 + 11 (v-html sanitization) | B-CRIT14 + C-Pattern (audit) (max-of-three: B-CRIT14 elevates) | `v-html` without sanitization in Plan 03 `<InfoCard>` + Plan 11 `<EmptyState>` `renderHeadline()` |

---

## Top blockers (must-fix before Wave 1)

Bullet list, dispatch-priority order (root-cause first, downstream second). Owner cluster in brackets.

- **[CT-001] [CRITICAL] [Owner: cluster 11]** Ship `audit_log` table DDL + RLS + `writeAudit()` helper in Plan 11 Task 1.1 — unblocks Plan 01, 03, 04, 05 audit writes.
- **[CT-022] [CRITICAL] [Owner: cluster 07b + cluster 08]** Resolve find-feature ownership conflict (3 colliding files: store, overlay, shortcut binding). Founder ratifies 07b sole ownership per 2026-05-17 lock; Plan 08 either renames or drops.
- **[CT-013] [CRITICAL] [Owner: cluster 03, 05, 09]** Add `SET search_path = public, pg_temp` to every SECURITY DEFINER RPC (Plan 03: 8 RPCs, Plan 05: 1 RPC, Plan 09: 3 RPCs). Add CI grep gate in Plan 11.
- **[CT-002] [CRITICAL] [Owner: cluster 02 + cluster 06 + cluster 10]** Single source of truth for routes + store names. Pick `/brand/:brandId` (RESTful) and `useRightPanelStore` (Plan 06 canonical); rewrite Plan 03 / Plan 06 E2E / Plan 10 callers.
- **[CT-003] [CRITICAL] [Owner: cluster 11]** Ship `<KovaIcon name="...">` primitive in Plan 11. Replace all Plan 02/03/04/05/06/11 icon bindings. Document the single tag convention.
- **[B-CRIT7] [CRITICAL] [Owner: cluster 01]** Shopify revoke endpoint `POST .../access_tokens/.../revoke` does not exist. Use `DELETE /admin/api_permissions/current.json` with per-shop token before nulling the token row.
- **[B-CRIT8] [CRITICAL] [Owner: cluster 01]** Replace in-memory `rateLimitMap` with durable (Postgres or KV) store; serverless cold-starts bypass the cap.
- **[B-CRIT9] [CRITICAL] [Owner: cluster 03]** Replace literal `'<from-jwt>'` placeholder in `api/brands/delete.ts` with real `user.id` from `supabase.auth.getUser`.
- **[B-CRIT10] [CRITICAL] [Owner: cluster 02]** Fix template-literal Promise bug in ComingSoonView notify-me fetch — Authorization header stringifies to `"Bearer [object Promise]"`.
- **[B-CRIT12] [CRITICAL] [Owner: cluster 04]** Stripe webhook raw-body reader uses Next.js Pages-Router `config` — invalid in standalone Vercel Functions. Replace with buffer-based reader.
- **[B-CRIT13] [CRITICAL] [Owner: cluster 09]** Fix `signInAs` test helper — magic-link URL is not a JWT; helper returns anon client, all 14 RLS tests dead-on-arrival.
- **[CT-024] [CRITICAL] [Owner: cluster 03 + cluster 11]** Replace `v-html` with text interpolation or DOMPurify-sanitized markup (Plan 03 `<InfoCard>`, Plan 11 `<EmptyState>` `renderHeadline()`).
- **[CT-010] [CRITICAL] [Owner: cluster 01-04 cleanup]** Test framework drift — replace `jest.mock` / `vi.mock` / `mockImplementationOnce` with bun:test `mock.module` / `mock()`. CI grep guard.
- **[CT-008] [CRITICAL] [Owner: cluster 04]** Extend `planStatus` store union to include `'trialing'` — DB CHECK has it, store type rejects it; `<TrialBanner>` can never satisfy predicate. (Max-of-three: B-CRIT15 elevates A-MED9.)
- **[C-HIGH13] [CRITICAL] [Owner: cluster 12]** Drop `JSON.stringify` wrapper in `update_user_pref` RPC call — supabase-js auto-encodes; every preference write currently double-encodes (`'large'` → `'"large"'`). (Elevated from HIGH — every preference write corrupts data, data-loss risk justifies CRITICAL.)
- **[CT-007] [HIGH] [Owner: cluster 01 + cluster 11]** Implement 4 `writeAudit()` calls in Plan 01 Edge Functions (deletion-requested, account-restored, email-change-requested, account-hard-deleted). Depends on CT-001.
- **[CT-023] [HIGH] [Owner: cluster 03]** Author 6 missing Plan 03 tasks (10.5 writeAudit helper, 13.5 restore endpoint, 26.5 RestoreBrandModal, 33.5–33.8 archive views + NotShippedYet shim).
- **[C-HIGH7] [HIGH] [Owner: cluster 09 + cluster 02]** Wire duplicate-to-canvas snapshot blob into new canvas's initial state — currently new canvas opens blank.
- **[C-HIGH8] [HIGH] [Owner: cluster 09]** Add `FOR UPDATE SKIP LOCKED` to snapshot-prune cron to prevent overlap races.
- **[C-HIGH11] [HIGH] [Owner: cluster 11]** Decide `verifyIdempotency` hash semantics (raw body vs sorted-key JSON) — PRD §4.1 comment vs §5.5 reference impl conflict.

---

## Cluster ownership matrix

### Cluster 01 — Auth + Onboarding + Shopify OAuth
**Owner files:** `docs/kova-final-prds/01-auth-and-identity.md`, `docs/kova-final-impl-plans/01-auth-and-identity-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md` (A-* IDs below), `QA-B-findings.md` (B-* IDs), `QA-C-findings.md` (C-* IDs)
**Findings count:** 17 (3 CRITICAL [B-CRIT7/8 standalone + CT-007 merge], 3 HIGH, 7 MEDIUM, 3 LOW, 1 NOTE)
**Top blockers:** CT-007, B-CRIT7, B-CRIT8, B-HIGH5
**Fix dispatch budget:** M (5–15)

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| CT-007 | HIGH | A-CRIT1 (elevated) + B-HIGH15 + C-HIGH1 | Plan 01 Tasks 3.3/4.3/5.3/6e | 4 audit_log writes specified by PRD §5.1; plan grep returns 0 | Add `writeAudit()` call to each Edge Function body. Depends on CT-001. |
| B-CRIT7 | CRITICAL | B | Plan 01:1280 | Shopify revoke URL `POST /admin/api/.../revoke` does not exist | Use `DELETE /admin/api_permissions/current.json` with per-shop token; revoke before token row nulled |
| B-CRIT8 | CRITICAL | B | Plan 01:715-727 | In-memory `rateLimitMap` in serverless function — per-instance only | Replace with Postgres `rate_limits` table or Upstash Redis `INCR`+`EXPIRE` |
| B-HIGH5 | HIGH | B | Plan 01:1163-1164 | Stripe `customers.del` idempotencyKey in wrong arg slot (params vs options) | Move to 3rd arg: `customers.del(id, undefined, { idempotencyKey })` |
| B-HIGH15 | HIGH | B | Plan 01:1392 | Audit-log error matching by message string (locale-/version-fragile) | Match on SQLSTATE `code === '42P01'` |
| C-MED1 | MEDIUM | C | Plan 01:1707 | `claim_pending_deletion_users` RPC referenced but not defined | Add RPC migration or replace with explicit join via service-role |
| C-MED2 | MEDIUM | C | Plan 01 Tasks 3/4/5 | `idempotency_keys` table not consulted by Edge Functions; only pass-through | Import `verifyIdempotency` from Plan 11 `api/_shared/idempotency.ts` |
| C-MED3 | MEDIUM | C | Plan 01 Task 21 | Email templates inline HTML, do not extend Cluster 11 `<EmailShell>` | Refactor Task 21 to compose `<EmailShell>` from Plan 11 Task 8.2 |
| B-MED10 | MEDIUM | B | Plan 01:1740 | `claim_deletion_queue_row` returns TABLE; consumer reads as single row | Read `claim[0]?.attempts`, or change RPC to `RETURNS record` |
| B-MED1 | MEDIUM | B | Plan 01:278,314,1774 | `SET search_path = public, pg_temp` vs founder spec `'public'` | Stylistic; align or amend CLAUDE.md |
| B-MED2 | MEDIUM | B | Plan 01:266-270 | `gdpr_queue_service_only` RLS policy redundant (service_role bypasses RLS); policy expresses intent only | Either remove + use `COMMENT ON TABLE`, or leave as DDL-documentation (harmless) |
| A-MED2 | MEDIUM | A | PRD 01 §12.8, §12.10 | 2 §12 OPEN QUESTIONS without RESOLVED tags | Founder ratifies; tag RESOLVED YYYY-MM-DD |
| A-LOW2 | LOW | A | PRD 01 §5.1.4:426 | Cron pseudocode dead-branch `failed_terminal AND attempts < 5` | Drop the unreachable clause |
| C-LOW01.5 | LOW | C | Plan 01 | `rls-users-deleted-at.test.ts` RLS test not added | Add the test file |
| C-LOW01.6 | LOW | C | Plan 01 Task 14 (DangerZoneCard) | DangerZoneCard inline modal shell, not `<KovaModal>` (Cluster 11 primitive) | Refactor to use Plan 11 `<KovaModal>` primitive |
| C-LOW01.7 | LOW | C | Plan 01 Task 23 | `EMAIL_CHANGE_LINK_TTL_HOURS=24` not explicitly set | Add to env defaults |
| B-NOTE1 | NOTE | B | Plan 01:978,982 | Zod imported in Edge Function (not tool layer) | NOTE — Edge Functions permitted to use Zod per founder lock #3 |

### Cluster 02 — Dashboard + Sidebar + Brand Cards
**Owner files:** `docs/kova-final-prds/02-onboarding-and-dashboard.md`, `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 25 (3 CRITICAL, 5 HIGH, 10 MEDIUM, 5 LOW, 2 cross-cluster CT)
**Top blockers:** CT-002, CT-003, CT-010, CT-011, CT-012, B-CRIT10
**Fix dispatch budget:** L (15+)

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| B-CRIT10 | CRITICAL | B | Plan 02:3605 | Authorization header template literal contains unawaited Promise → `"Bearer [object Promise]"` | Await `auth.getSession()` first, then interpolate access_token |
| B-CRIT11 | CRITICAL | B | Plan 02:3283 | RecentsView reads `sortMode` from `canvasesStore` not `dashboardStore` | Read from `useDashboardStore().sortMode` |
| B-CRIT5 | CRITICAL | B | Plan 02:3009 | `jest.mock` in bun:test file — jest undefined | Replace with `mock.module(...)` |
| C-HIGH2 | HIGH | C | PRD 02 §6.1 | Onboarding wizard sub-routes `/onboarding/{brand,shopify,brand-kit,done}` not registered | Add 4 sub-routes to PRD §6.1 + Plan T12 |
| C-HIGH3 | HIGH | C | Plan 02 T13 vs T17 | `inject('onboardingState')` vs `useOnboarding` identifier mismatch | Unify on `useOnboarding`; update T13 |
| B-HIGH4 | HIGH | B | Plan 02:1007,2194,2202,2210,2244,3601,3606 | Reads `auth.profile.email` — Plan 01 `UserProfile` has no `email` field | Either extend UserProfile, or use `auth.user?.email` |
| B-HIGH6 | HIGH | B | Plan 02:1934-1943 | BrandSwitcher.vue missing `ref` import | Add `import { ref } from 'vue'` |
| B-HIGH14 | HIGH | B | Plan 02:1139 | useFileGrid direct mutation `dash.searchQuery = q` instead of action | Add `setSearchQuery` action |
| B-HIGH8 | HIGH | B | Plan 02 multiple | `mockImplementationOnce` / `mockClear` — Jest/Vitest-only methods | Replace with bun:test patterns |
| C-MED4 | MEDIUM | C | Plan 02 Task T31 | `useOfflineState` uses raw `navigator.onLine`, ignores Realtime check | Import `useOnlineStatus` from Plan 11 Task 2.4 |
| C-MED5 | MEDIUM | C | PRD 02 §12.10 + Plan 02 T13 | Wizard step consolidation proceeds without founder gate | Founder resolves §12.10; or Plan T13 pauses |
| C-MED6 | MEDIUM | C | Plan 02 T13 | `ExtractionStep.vue` listed for deletion but never `git rm`ed | Add removal step to T13 |
| C-MED7 | MEDIUM | C | Plan 02 ↔ Plan 05 | Cluster 05 brand-kit extract queue handoff missing | Add queue-stub task; document contract |
| C-MED8 | MEDIUM | C | Plan 02 T04+T05 | Two `useLocalStorage` instances on same key `'kova:ui:last-brand'` | Compose one ref; alias via computed |
| B-MED4 | MEDIUM | B | Plan 02:2400 | ComposerInputWrap uses `e.code === 'Enter'` (CORRECT — confirms Plan 03 as outlier) | Informational; no fix needed for Plan 02. Cross-reference for Plan 03 fix (B-HIGH3) |
| B-MED6 | MEDIUM | B | Plan 02:2434 | ComposerInputWrap reads `innerText` (contenteditable artifacts) | Use `textContent` + whitespace normalize |
| B-MED7 | MEDIUM | B | Plan 02:1083,1097 | Tests wait wall-clock `setTimeout(220)` — CI flaky | Use fake timers / flushPromises |
| B-MED11 | MEDIUM | B | Plan 02 + Plan 04 | `useLocalStorage` writes on every reactive change | NON-ISSUE — VueUse `useLocalStorage` already debounced internally. Capture for audit-trail only |
| B-MED15 | MEDIUM | B | Plan 02:1464,1470,1484 | `v-model="state.brandName.value"` confusing inject pattern | Provide reactive proxy or document |
| C-LOW02.7 | LOW | C | Plan 02 Task 17 | Retire `WelcomeStep` + `ReviewStep` retirement deferred to implementation time | Move retirement step to Task 13 (alongside ExtractionStep.vue removal) |
| CT-020 | MEDIUM | A-NOTE1 | PRD 02 §2.1, §3.7, §8.7 | Sidebar offline `.net-strip` + 3 offline signals retired in PRD 11 | Rewrite to consume Cluster 11 `<NetworkStatusIndicator>` single-icon model |
| A-LOW5 | LOW | A | PRD 02 §2.1:50 | SOON pill list inconsistent — sidebar shows 3, route map ships 7 ComingSoonView | Reconcile founder spec; confirm scope |
| B-LOW2 | LOW | B | Plan 02:1950 | TODO comment `/* TODO: opens Cluster 03 modal */` | Acceptable cross-cluster stitch |
| B-LOW7 | LOW | B | Plan 02:3859-3860 | Self-review acknowledges template-literal bug but ships unchanged | Fix per B-CRIT10 |
| A-MED1 | MEDIUM | A | PRD 02 §12.10, §12.12 | 2 OPEN QUESTIONS with ESCALATE: founder | Founder ratifies; tag RESOLVED |

### Cluster 03 — Brand Modal + Brand Kit Settings (BK) + Archive
**Owner files:** `docs/kova-final-prds/03-brand-management.md`, `docs/kova-final-impl-plans/03-brand-management-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 22 (5 CRITICAL incl. merges, 7 HIGH, 6 MEDIUM, 4 LOW)
**Top blockers:** CT-013, CT-023, CT-024, B-CRIT9, CT-002 routing
**Fix dispatch budget:** L (15+)

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| B-CRIT2 | CRITICAL | B | Plan 03 multiple | 8 SECURITY DEFINER RPCs missing `SET search_path` (founder lock #15) | Add `SET search_path = public, pg_temp` to every DEFINER block |
| B-CRIT3 | CRITICAL | B | Plan 03 22 occurrences | `<Icon name="lucide:...">` — Nuxt-style, not unplugin-icons | Replace with `<icon-lucide-*>` static tags or KovaIcon primitive (CT-003) |
| B-CRIT9 | CRITICAL | B | Plan 03:1516 | Hard-coded `'<from-jwt>'` literal in `api/brands/delete.ts` | Wire to `user.id` from `supabase.auth.getUser` |
| B-CRIT14 | CRITICAL | B | Plan 03:2313 | `v-html` in `<InfoCard>` bullets without sanitization | Switch to text interpolation, or DOMPurify-sanitize |
| B-CRIT6 | CRITICAL | B | Plan 03:1871-1872 | `vi.mock` / `vi.fn` in bun:test file | Replace with `mock.module` / `mock` |
| CT-023 (a) | HIGH | C-HIGH4 | Plan 03:21-31 + body | 6 of 8 addendum tasks not authored (10.5/13.5/26.5/33.5/.6/.7/.8) | Author the 6 missing tasks before Wave 2 |
| CT-023 (b) | HIGH | C-HIGH5 | Plan 03:3040,3043,3588,3605 | `<BrandsArchivedFilter>`, `<RestoreBrandModal>`, `<BrandsAccountView>` imported but not built | Resolves with CT-023 (a) |
| CT-023 (c) | HIGH | C-HIGH6 | Plan 03:1830 + file structure | `restoreBrand` action calls `POST /api/brands/restore` — endpoint not in file structure | Add Task 13.5 body authoring `api/brands/restore.ts` |
| B-HIGH3 | HIGH | B | Plan 03:2417-2418 | RenameBrandModal uses `e.key` instead of `e.code` (founder lock #9) | Replace `e.key` → `e.code` |
| B-HIGH10 | HIGH | B | Plan 03:273-279 | `pg_indexes` REST query — pg_catalog not exposed via PostgREST | Use `pg_indexes_by_name` RPC helper |
| B-HIGH11 | HIGH | B | Plan 03:352-356 | Color backfill `WHERE color = 'coral'` not idempotent | Add `color_assigned_at` column or guard re-runs |
| B-HIGH19 | HIGH | B | Plan 03:266-279 | RLS test matches error string `/idx_brands_slug_per_user|unique/i` | Match on SQLSTATE `code === '23505'` |
| B-MED12 | MEDIUM | B | Plan 03:2556-2561 | `<span class=&quot;opacity-50&quot;>` HTML entities in JS prop string | Replace with real double-quotes |
| B-MED17 | MEDIUM | B | Plan 03:2364,2500,2621 | Pinia setup-store actions reassigned in tests | Use `mock.module` at module level |
| C-MED11 | MEDIUM | C | Plan 03 §5.1 + Plan body | `writeAudit()` helper has no creation task | Add `api/_shared/audit.ts` task (or resolves with CT-001) |
| C-MED12 | MEDIUM | C | Plan 03 Task 34 | `<NotShippedYet>` adapter shim imported but not authored | Resolves with CT-023 |
| C-MED9 | MEDIUM | C | PRD 03 §8.7 vs §5.2 | PRD-internal off-by-one (6 RPCs vs 7 after restore_brand promotion) | Update §8.7 count to 7 |
| C-MED10 | MEDIUM | C | Plan 03 Task 30:3131-3136 | Sort dropdown static markup; no v-model, no state, no localStorage | Add sort state to store; wire to BrandPickerView |
| C-LOW03.9 | LOW | C | Plan 03 Tasks 11-14 | Edge Functions don't consult `idempotency_keys` table | Wire `verifyIdempotency` (depends on Plan 11) |
| C-LOW03.10 | LOW | C | Plan 03 Tasks 4-7 | RPC `auth.uid()` defense-in-depth not asserted by RLS verification | Add Task 8 explicit assertion |
| B-LOW3 | LOW | B | Plan 03:3103 | Hardcoded `'Jiho Yang'` placeholder in `BrandPickerView.vue` | Replace with `auth.profile?.name ?? 'You'` |
| B-LOW6 | LOW | B | Plan 03:4086 | Self-review claims "zero matches" but L3103 contradicts | Plan-author hygiene |

### Cluster 04 — Account Page + Stripe Billing
**Owner files:** `docs/kova-final-prds/04-account-and-stripe-billing.md`, `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 19 (3 CRITICAL [B-CRIT12, B-CRIT4, CT-008 elevated], 4 HIGH [incl. cross-cluster-shared CT-006-a], 8 MEDIUM, 4 LOW)
**Top blockers:** CT-008, B-CRIT12, B-CRIT4 (dynamic icons), B-MED8 webhook 5xx semantics
**Fix dispatch budget:** M (5–15)

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| B-CRIT12 | CRITICAL | B | Plan 04:1251,1313-1317 | Stripe webhook uses Next.js Pages-Router `config = { api: { bodyParser: false } }` — invalid in standalone Vercel Functions | Buffer-based raw-body reader; validate against Stripe test webhook |
| B-CRIT4 | CRITICAL | B | Plan 04:2332 | Dynamic `<component :is="\`icon-lucide-${...}\`">` won't resolve via unplugin-icons | Static map lookup or KovaIcon primitive (CT-003) |
| CT-008 | CRITICAL | A-MED9+B-CRIT15 | Plan 04:1882-1883 | `planStatus` union missing `'trialing'`; DB CHECK includes it (max-of-three: B-CRIT15 elevates) | Extend union to 5 values |
| B-HIGH9 | HIGH | B | Plan 04:1268,1318 | Webhook `req.headers.get(...)` — VercelRequest headers is plain object | Use bracket access + Array narrowing |
| B-HIGH12 | HIGH | B | Plan 04:901,1008 | `req.headers as any` cast hides multi-value header risk | Type-narrow auth header explicitly |
| B-HIGH16 | HIGH | B | Plan 04:109,222 | Migration SQL "copy verbatim from PRD" — not inlined | Inline the SQL in the plan |
| CT-019 | MEDIUM | A-MED8 | PRD 04 §6.4.5 | M9 `access_token`-in-URL fix not in PRD 04 acceptance | Add §9.5 grep guard mirroring PRD 02 |
| B-MED8 | MEDIUM | B | Plan 04:1298-1309 | Webhook catch returns 200 — Stripe never retries; idempotency dedupe permanently silences (see Inconsistencies #6 — single-auditor but high-confidence per Stripe retry docs) | Return 5xx on retriable errors; mark idempotency row retry-eligible |
| B-MED13 | MEDIUM | B | Plan 04:1610 | Avatar `users/{user_id}/avatar.png` — relies on bucket RLS Plan 04 doesn't author | Tighten `storage_path === expected` exact match; verify Plan 11 ships bucket RLS |
| B-MED14 | MEDIUM | B | Plan 04:1464-1467 | Reconcile cron heals past_due → active but doesn't reset `current_period_end` | Add `current_period_end` + `cancel_at_period_end` to update |
| C-MED13 | MEDIUM | C | PRD 04 §5.4.3 + Plan Task 14.4 | Email templates standalone HTML, don't extend `<EmailShell>` | Refactor to compose, or move wrap to `sendEmail()` |
| C-MED14 | MEDIUM | C | Plan 04 Task 12.2 | `<StripeReturnLanding>` doesn't import `<AuthMedal>` + `<AuthIcon>` | Update Task 12.2 to compose Cluster 01 components |
| C-MED15 | MEDIUM | C | Plan 04 Task 10.1 | Brand Kit shell `?tab=` sub-route uses `<Skeleton>` placeholder; no `<router-view>` | Wire `<router-view>` reading query param |
| B-MED3 | MEDIUM | B | Plan 04 multiple | `STRIPE_SECRET_KEY = 'sk_test_dummy'` test paths missing apiVersion | Production code at L527 has it; test mocks bypass — acceptable |
| C-LOW04.4 | LOW | C | Plan 04 Tasks 11.4-11.8 | M9 integrations refactor 8 transforms collapsed to "TDD per pattern" stubs | Enumerate per-component test cases |
| C-LOW04.5 | LOW | C | Plan 04 Task 3.7 | 6 webhook event handler tests referenced but not enumerated | Enumerate 6 scenarios |
| C-LOW04.7 | LOW | C | Plan 04 Task 3.1 | `price_id` server validation uses inline values, not env-var whitelist | Move to env vars per PRD §5.1.1 |
| A-LOW4 | LOW | A | PRD 04 §1.1, §1.2 | Sidebar count narrative says "5"; §2.1/§3.1/§8.1 say 6 (post-B12 reversal) | Update narrative + caveman to 6 |
| CT-006 (a) | HIGH | A-HIGH1 | PRD 04:1625 | Cmd+K residual in §13.8 "What is NOT" list | Remove `Command-K /` substring |

### Cluster 05 — Brand Kit Panel (canvas-side)
**Owner files:** `docs/kova-final-prds/05-brand-kit-and-drag-drop.md`, `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md`
**Source citations:** read full evidence in `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 7 (0 CRITICAL, 2 HIGH, 1 MEDIUM, 4 LOW)
**Top blockers:** CT-003 (icon syntax), CT-013 (search_path)
**Fix dispatch budget:** S (<5) + CT-001 / CT-013 dependencies

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| B-HIGH7 | HIGH | B | Plan 05:2230-2236,2253 | UnoCSS-style `'i-lucide-*'` class strings + `<component :is="item.icon">` | Replace with KovaIcon primitive (CT-003) |
| C-MED16 | MEDIUM | C | Plan 05 Tasks 21-27 | 7 per-tab components compressed into one block; lacks per-component TDD | Expand each task into its own TDD body |
| B-HIGH17 | HIGH | B | Plan 05:2253 | Dynamic `<component :is="'i-lucide-palette'">` literal — component name doesn't exist | Static-map pattern (CT-003) |
| C-LOW05.2 | LOW | C | Plan 05 Task 21 | Color picker popover Cluster 07b dependency mention thin | Add cross-cluster reference + fallback |
| C-LOW05.3 | LOW | C | Plan 05 Task 12 | Confirm Edge Function `crypto.randomUUID()` generated; body not shown | Show idempotency body in plan |
| C-LOW05.4 | LOW | C | Plan 05 Task 17 | brand-kit-extract rate-limit (1 req/hour/brand) guard not shown | Add explicit guard |
| B-LOW4 | LOW | B | Plan 05 | TODO `count: null /* TODO Cluster 10 store */` | Acceptable cross-cluster stitch; ensure follow-up Cluster 10 wave wires real count |

(Also: CT-001 audit_log gap — Plan 05 writes to nonexistent table; CT-013 SET search_path on 1 SECURITY DEFINER RPC.)

### Cluster 06 — Canvas Editor Scaffold + AI Chat Panel
**Owner files:** `docs/kova-final-prds/06-canvas-editor-core-chrome.md`, `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 11 (1 CRITICAL, 5 HIGH, 2 MEDIUM, 3 LOW)
**Top blockers:** CT-002, CT-003, CT-005, CT-006
**Fix dispatch budget:** M (5–15)

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| CT-005 | HIGH | A-HIGH4 | PRD 06:253 | Visual-spec table says "Default-active = Design" — contradicts §0/§1.1/§1.3/§2.1/§6.2/§6.4/§8.6/§12.13 (AI default) | Change to "Default-active = AI" per §12.13 |
| CT-006 (b) | HIGH | A-HIGH1 | PRD 06:147 | Cmd+K residual in §2.2 out-of-scope table (Cluster 11 row) | Remove ", Command-K palette" substring |
| B-HIGH7 (06) | HIGH | B | Plan 06:500-502 | `i-lucide-*` strings in ToolDef + `<component :is>` | KovaIcon primitive (CT-003) |
| B-CRIT1 (06) | CRITICAL | B | Plan 06:101 | E2E spec asserts `/dashboard?brandId=` (Plan 03 push convention) | Standardize routing (CT-002) |
| C-MED17 | MEDIUM | C | Plan 06 Task 2 | `useEditorStore.showUI` 3-state enum may break existing toggle handlers | Add migration step to update all consumers |
| C-MED18 | MEDIUM | C | Plan 06 Task 8 | Drop-with-invalid-payload crash-resistance not explicitly tested | Add malformed-payload test case |
| C-LOW06.3 | LOW | C | Plan 06 Task 11 | LeftPanel resize handles between sections not included | Add resize handles |
| C-LOW06.4 | LOW | C | Plan 06 Task 9 | `<MissingFontsPill>` exists, no specific mount test | Add mount test |
| C-LOW06.5 | LOW | C | Plan 06 Task 14 | Pill anchor not shown in EditorView refactor template | Document anchor location |
| C-MED26 (06) | MEDIUM | C-MED-cross | Plan 06 ↔ Plan 09 | File-menu Version-history item — neither plan owns | Add to Plan 08 or Plan 09 menu registry |
| HIGH-10 (06) | HIGH | C-HIGH10 | Plan 06 ↔ Plan 10 | `useRightPanelStore` (06) vs `useRightPanelTabStore` (10) name + path drift | Plan 10 imports Plan 06 store at canonical path (CT-002) |

### Cluster 07a — Canvas Tools: Engine Core + Renderer
**Owner files:** `docs/kova-final-prds/07a-canvas-engine-core-renderer.md`, `docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 6 (0 CRITICAL, 1 HIGH, 0 MEDIUM, 4 LOW, 1 NOTE)
**Top blockers:** A-HIGH5 status hygiene
**Fix dispatch budget:** S (<5)

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| A-HIGH5 | HIGH | A | PRD 07a §0:6-11 | Status `DRAFT 2026-05-15` but body cites 2026-05-17 founder ratifications | Bump Status to `IN-REVIEW 2026-05-17`; Last updated `2026-05-17` |
| C-LOW07a.1 | LOW | C | Plan 07a Task 1b | `measurement:broken` / `measurement:dropped` events mentioned but no explicit tests | Add event-emission test cases |
| C-LOW07a.2 | LOW | C | Plan 07a Task 9 | Mask compositing perf budget (50-300 nodes) — no perf benchmark | Add perf benchmark / budget guard |
| C-LOW07a.3 | LOW | C | Plan 07a + Plan 09 | `format_version` coordination with Cluster 09 missing | Add schema-bump coordination task |
| C-LOW07a.4 | LOW | C | Plan 07a | `node:errored` event surface (Cluster 11 dep) not included | Add event surface + payload type |
| B-NOTE2 | NOTE | B | Plan 07a all tasks | Plan modifies `packages/core/` | NOTE — documented exception per founder lock #16 |

### Cluster 07b — Canvas Tools: Find + Camera + Gradient + Boolean
**Owner files:** `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md`, `docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 9 (1 CRITICAL, 3 HIGH, 1 MEDIUM, 4 LOW)
**Top blockers:** CT-022 (find conflict), CT-004 (measurement model)
**Fix dispatch budget:** S–M

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| CT-022 | CRITICAL | C-CRIT1+2+3 | Plan 07b Tasks 1.6/1.7/7.1 + Plan 08 Tasks 1.3/5.1/5.2 | Both plans ship `src/stores/find.ts`, `<FindOverlay>`, `Cmd+F` binding | Founder ratifies 07b sole ownership (per 2026-05-17 lock); Plan 08 drops or renames |
| CT-004 (07b) | HIGH | A-HIGH3 | PRD 07b lines 70,87,100,187,237,375,424,492,496,591,613,683,708 | Calls measurements a NodeType throughout; calls `figma.createMeasurement()` | Rewrite to PageNode `addMeasurement` model; iterate `figma.currentPage.getMeasurements()` |
| C-MED-07b.1 | MEDIUM | C | Plan 07b Tasks 4.5-4.10 | 7 overlays grouped into one task; no per-overlay TDD | Split each into its own task |
| C-LOW07b.2 | LOW | C | Plan 07b Task 3.4 | BooleanOpsRow disabled-state when selection <2 — verify in impl | Verify check |
| C-LOW07b.3 | LOW | C | Plan 07b Task 3.6 | 4 gradient types (Linear/Radial/Angular/Diamond) — verify all 4 | Verify |
| C-LOW07b.4 | LOW | C | Plan 07b Tasks 1.1/1.2 | useClipboardStore paste-handler skip-logic test case not enumerated | Add test case |
| C-LOW07b.5 | LOW | C | Plan 07b Tasks 2.1-2.2 | Eyedropper Phase 2 macOS Tauri — no feature-flag gate | Add feature flag |
| B-HIGH (07b) | HIGH | B Pattern1 | Plan 07b | Icon convention OK per declaration | Confirm against KovaIcon primitive (CT-003) |
| B-LOW (07b) | LOW | B-HIGH2 spillover | Plan 07b 17 `as any` casts | Founder-lock #10 violation | Refactor pass |

### Cluster 08 — Canvas Menus, Popovers, Shortcuts
**Owner files:** `docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md`, `docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-C-findings.md`
**Findings count:** 5 (0 CRITICAL after CT-022 merge, 1 HIGH, 3 MEDIUM, 1 LOW)
**Top blockers:** CT-022 (find ownership decision), CT-006
**Fix dispatch budget:** S

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| CT-006 (c) | HIGH | A-HIGH1 | PRD 08:100 | Cmd+K residual in §2.2 out-of-scope table | Remove `+ Command-K palette` |
| C-MED20 | MEDIUM | C | Plan 08 entire | Phase-table format vs full TDD; less rigorous | Convert to full TDD per task |
| C-MED21 | MEDIUM | C | Plan 08 Task 2.6 | `use-keyboard.ts` refactor — 8 sub-steps; per-shortcut TDD compressed | Author per-shortcut-category TDD (5 sub-tasks) |
| C-MED-08.5 | MEDIUM | C | Plan 08 Task 2.6 | Per-shortcut TDD compressed | Resolves with C-MED21 |
| C-LOW08.6 | LOW | C | Plan 08 Task 7.7c | Cluster 12 `users.preferences.view.*` schema seed referenced; no file path | Cite file path + migration ID |

(Also: CT-022 critical conflict — Plan 08 may need to drop find feature entirely.)

### Cluster 09 — Version History + Snapshots
**Owner files:** `docs/kova-final-prds/09-version-history-and-trash.md`, `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 18 (2 CRITICAL, 4 HIGH, 8 MEDIUM, 4 LOW)
**Top blockers:** B-CRIT13, C-HIGH7, C-HIGH8, C-HIGH9, CT-013
**Fix dispatch budget:** M–L

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| B-CRIT13 | CRITICAL | B | Plan 09:355-364 | `signInAs` test helper uses magic-link URL as Bearer token — not a JWT | Use `signInWithPassword` after `updateUserById` with known pw |
| CT-013 (09) | CRITICAL | B-CRIT2 | Plan 09 multiple | 3 SECURITY DEFINER RPCs missing `SET search_path` | Add to every DEFINER block |
| C-HIGH7 | HIGH | C | Plan 09 Task 19:2391-2407 | Duplicate-to-canvas blob not wired into new canvas initial state — new canvas opens blank | Add `initial_state_blob_path` column or hydrate-from-snapshot path |
| C-HIGH8 | HIGH | C | Plan 09 Task 20:2483-2488 | snapshot-prune cron missing `FOR UPDATE SKIP LOCKED` | Use raw SQL via RPC or document race as Phase B |
| C-HIGH9 | HIGH | C | Plan 09 Task 20:2507 | 7th-day Storage sweep deferred without follow-up; acceptance §8.3 uncovered | Add Phase B task |
| B-HIGH20 | HIGH | B | Plan 09:355-364 | Author admits "implementation varies" but ships broken inline helper | Resolves with B-CRIT13 |
| C-MED22 | MEDIUM | C | Plan 09 Task 19:2358-2359,2405 | Idempotency dedup is comment-only stub | Wire real `verifyIdempotency()` |
| C-MED23 | MEDIUM | C | Plan 09 Task 19:2390 | Storage path uses `crypto.randomUUID()`, not snapshot_id (PRD §4.3 invariant) | Pre-generate snapshot UUID; pass to RPC |
| C-MED24 | MEDIUM | C | Plan 09:2486 | Hardcoded `30 * 24 * 60 * 60 * 1000` instead of `SNAPSHOT_FREE_RETENTION_DAYS` constant | Import constant from config |
| C-MED25 | MEDIUM | C | Plan 09 Task 12a:1552-1557 | `useCanvasEditLock` ref-counted (multi-caller); PRD implies single-owner boolean | Switch to boolean; warn on double-lock |
| C-MED26 (09) | MEDIUM | C | Plan 09 ↔ Plan 06 | File-menu Version-history item missing — neither plan owns | Add coordination point with Plan 08 |
| A-MED6 | MEDIUM | A | PRD 09 §0 | Status `DRAFT 2026-05-15` despite §12 entries resolved | Bump to `IN-REVIEW 2026-05-18` |
| C-LOW09.9 | LOW | C | Plan 09 Tasks 19+20 | No `export const config = { runtime: 'edge' }` | Add Vercel Fluid Compute config |
| C-LOW09.10 | LOW | C | Plan 09 Task 21 | CSS `:where()` pointer-events overlay — uses `@mousedown.capture` + `window.__spaceHeld` global hack | Refactor to CSS-driven overlay |
| C-LOW09.11 | LOW | C | Plan 09 + Plan 07a | `format_version` CI grep on `packages/core/codec/` changes not added | Add grep guard |
| C-LOW09.12 | LOW | C | Plan 09 Task 17 | `loadingByCanvas` in store but no `<Skeleton>` rendered | Add skeleton template branch |
| B-MED9 | MEDIUM | B | Plan 09:5,12,13,15 | References old `docs/prd/` path instead of `docs/kova-final-prds/` | Path replace |
| B-MED5 | MEDIUM | B | Plan 09 + Plan 04 + Plan 10 multiple | Multi-step async sequences don't use `Promise.all` where safe | Stylistic; do a pass during code review but not blocking |

### Cluster 10 — Keyboard + Memories (AI Chat + Tool Layer)
**Owner files:** `docs/kova-final-prds/10-ai-chat-and-memory.md`, `docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-C-findings.md`
**Findings count:** 9 (0 CRITICAL, 3 HIGH, 4 MEDIUM, 2 LOW)
**Top blockers:** CT-002 (store name), CT-004 (measurement model), CT-005 (default tab)
**Fix dispatch budget:** S–M

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| CT-005 (10) | HIGH | A-HIGH2 | PRD 10 lines 24,39,56,147,740 | "Design (default-active)" in 5 places contradicts PRD 06 §12.13 (AI default) | Update PRD 10 §1.3/§2.1/§3.1/§8/§1.2 to AI default per founder lock |
| CT-004 (10) | HIGH | A-HIGH3+A-MED7 | PRD 10 lines 14,87,109,133,706 | MEASUREMENT NodeType references stale; `addMeasurement` tool wrapper signature wrong | Rewrite payload to PRD 07a §2.1 shape (page-level) |
| C-HIGH10 | HIGH | C | Plan 10:2394,2401,2436 | `useRightPanelTabStore` import — Plan 06 ships `useRightPanelStore` (CT-002) | Rename Plan 10 imports to match Plan 06 canonical |
| C-MED27 | MEDIUM | C | Plan 10 Tasks 3+4 | Dual mutation paths to `chat_conversations.product_references` | Refactor Task 4's `persistAndPatch` to delegate to Task 3's action |
| C-MED28 | MEDIUM | C | PRD 10:619 vs §3.2+§12.12 | §6.4.2 says chip row "above attachments"; §3.2/§12.12 say BELOW (founder lock) (see Inconsistencies #2) | PRD edit line 619 — change to BELOW |
| C-MED-10.6 | MEDIUM | C | PRD 10 §8.5 + §8.6 | Server-side proxy + sub-processor wiring not specifically verified | Add acceptance verification |
| A-LOW6 | LOW | A | PRD 10 §0:8-11 | Status `DRAFT 2026-05-15` despite extensive 2026-05-17 founder locks | Bump to `IN-REVIEW 2026-05-17` |
| C-LOW10.5 (a) | LOW | C | Plan 10 Tasks 10/11 | `engine_unavailable` error code added; not in PRD §8.4 acceptance | Either update PRD or remove from plan |
| C-LOW10.5 (b) | LOW | C | Plan 10 Task 16 | E2E doesn't verify Design default-active (now AI per CT-005) | Update E2E after CT-005 propagates |

### Cluster 11 — Shared Infra (idempotency, audit_log, error tracking)
**Owner files:** `docs/kova-final-prds/11-shared-ui-infrastructure.md`, `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md`
**Source citations:** read full evidence in `QA-A-findings.md`, `QA-B-findings.md`, `QA-C-findings.md`
**Findings count:** 15 (1 CRITICAL, 4 HIGH, 5 MEDIUM, 1 LOW, 4 NOTE)
**Top blockers:** CT-001 (audit_log), CT-003 (KovaIcon), CT-024 (v-html), C-HIGH11 (hash semantics)
**Fix dispatch budget:** L (15+) — Wave 0 cluster, blocks all downstream

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| CT-001 | CRITICAL | A-CRIT1 + B-HIGH15 + B-consumer-refs(5) + C-CRIT4 (see Inconsistencies #1) | PRD 11 §2.1, §4.1; Plan 11 Task 1.1 | `audit_log` table referenced by 5 PRDs (01/03/04/05) but never DDL'd by owner Cluster 11 | Add `CREATE TABLE audit_log` + RLS + `writeAudit()` helper to PRD 11 §2.1/§4.1/§5.5 and Plan 11 Task 1.1. **§11 cross-cuts ripple:** consumer PRDs 01/03/04/05 each need an "audit_log table + writeAudit helper" entry in their §11 cross-cuts section (per A-CRIT1 step 4). |
| CT-024 (11) | CRITICAL | B-CRIT14 | Plan 11:2315 | `<h5 v-html="renderHeadline()">` — XSS hazard if any sourced from user input | Audit renderHeadline source; sanitize or annotate `// SAFE: only locked copy` |
| C-HIGH11 | HIGH | C | PRD 11:308 vs 491-492 | `request_hash` column comment promises sorted JSON keys; reference impl uses raw body | PRD edit — drop the "sorted body keys" claim from column comment; document deterministic-serialization requirement |
| C-HIGH12 | HIGH | C | Plan 11:2313 | `<EmptyState>` uses `<icon-lucide-:name="icon" />` — unplugin-icons doesn't support dynamic names | Static map + `<component :is>` (CT-003) |
| CT-015 | HIGH | B-HIGH13 | Plan 11:578,635-639 + Plan 12:2049,2106 | Resend env-guard pattern lacks Sentry breadcrumb for skipped sends | Add `captureMessage('resend_skipped_no_api_key', 'warning')` |
| C-MED-11.3 | MEDIUM | C | Plan 11:2520 | `<EmailShell>` hardcodes `https://kova.app/email/wordmark-light@2x.png` | Use `process.env.PUBLIC_APP_URL` or prop |
| C-MED-11.4 | MEDIUM | C | Plan 11:2523 | `{{settings_url}}` interpreted as Vue expression → undefined | Escape Vue parsing for Resend template vars |
| C-MED-11.5 | MEDIUM | C | Plan 11 Task 9.1 | `<NetworkStatusIndicator>` not mounted in App.vue; ambiguous PRD vs §3.7 | Clarify ownership; mount in App.vue or Cluster 02 topbar |
| C-MED-11.6 | MEDIUM | C | PRD 11 §12.5 KD-5 | M9 Realtime channel `sync-progress-${brandId}` non-conformant; no migration task | Add channel-name migration task |
| A-MED3 | MEDIUM | A | PRD 11 §12.8, §12.9 | 2 §12 OPEN QUESTIONS without RESOLVED tags | Tag RESOLVED 2026-05-18 — LTR shimmer / bottom-right toast |
| A-LOW3 | LOW | A | PRD 11 §5.7:574-578 | Tauri command examples noun-first contradict "verb-first preferred" rule | Pick one rule (recommend noun-first); align examples |
| C-LOW-11.7 | LOW | C | Plan 11 Task 4.3 | `<KovaMenu>` + `<KovaTooltip>` compressed into one task | Split |
| B-MED18 | MEDIUM | B | Plan 11:157 | `idempotency_keys` CHECK on `length(key) >= 16`; verify all callers conform | Audit Plan 09 + Plan 10 callers |
| B-LOW5 | LOW | B | Plan 11 multiple | `TODO(pre-launch §11)` comments throughout Sentry / Resend stubs | Acceptable per founder lock #14; document activation checklist for pre-launch (companion to B-NOTE3) |
| B-NOTE3 | NOTE | B | Plan 11 multiple | Sentry / Resend / Vercel Cron stubs | NOTE — founder lock #14 |

### Cluster 12 — Settings + Preferences
**Owner files:** `docs/kova-final-prds/12-settings-and-user-preferences.md`, `docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md`
**Source citations:** read full evidence in `QA-C-findings.md`
**Findings count:** 6 (1 CRITICAL [C-HIGH13 elevated from HIGH — data-loss risk], 1 HIGH, 2 MEDIUM, 2 LOW)
**Top blockers:** C-HIGH13 (double-encode), C-HIGH14 (Resend stub)
**Fix dispatch budget:** S

| ID | Severity | Source | File:Line | Summary | Recommended Fix |
|---|---|---|---|---|---|
| C-HIGH13 | CRITICAL | C | PRD 12 §6.2.1:361 + Plan 12 Task 4 | `supabase.rpc('update_user_pref', { p_value: JSON.stringify(value) })` — supabase-js auto-JSON-encodes; double-encodes (`'large'` → `'"large"'`). Elevated from HIGH — every preference write corrupts data. | Drop the `JSON.stringify` wrapper |
| C-HIGH14 | HIGH | C | Plan 12:2035 + 92 | Imports `_shared/resend-client.ts` from Cluster 01; PFC says "stub" but no stub task | Add Task 16.0 stub `sendEmail()` |
| C-MED12.3 | MEDIUM | C | PRD 12 §6.2.2:465 vs §2.1:81 | Recent colors cap — 24 in §6.2.2 vs 12 in §2.1 (founder lock 2026-05-17) | PRD edit — set to 12 per founder lock |
| C-MED12.4 | MEDIUM | C | Plan 12 Task 16:2068-2070 | Reads `SUPABASE_URL` + `SUPABASE_ANON_KEY` without guards; crashes if unset | Add `loadEnvOrSkip` guard |
| C-LOW12.5 | LOW | C | Plan 12 Task 16 | Resend `sendEmail({ idempotencyKey })` signature cross-cluster contract not documented in PRD 01 | Document contract |
| C-LOW12.6 | LOW | C | Plan 12 Task 14 | "Task 14" is appended handoff note to Plan 04, not actual code | Convert to real task or remove |

---

## Cross-cluster findings (touch 3+ clusters)

| Merge ID | Severity | Clusters affected | Summary | Recommended Fix |
|---|---|---|---|---|
| CT-001 | CRITICAL | 11 (owner) + 01 + 03 + 04 + 05 | `audit_log` table never DDL'd; 3 consumer plans diverge | See Cluster 11 row |
| CT-002 | CRITICAL | 02 (owner) + 03 + 06 + 10 | Routing inconsistency + `useRightPanelStore` name drift | Single source of truth in `src/types/routes.ts`; canonical store names per Plan 06 |
| CT-003 | CRITICAL | 11 (new owner) + 02 + 03 + 04 + 05 + 06 | Icon-component syntax broken (4 different patterns) | Ship `<KovaIcon name="...">` primitive in Plan 11 |
| CT-010 | CRITICAL | 01 + 02 + 03 + 04 (cleanup) | Test framework drift — `jest.mock` / `vi.mock` / `mockImplementationOnce` in bun:test files | Global find-replace + CI grep guard |
| CT-013 | CRITICAL | 03 + 05 + 09 (+ audit PRD 04) | SECURITY DEFINER RPCs missing `SET search_path` | Add to every DEFINER block + CI grep |
| CT-022 | CRITICAL | 07b + 08 | Find-feature ownership conflict (store + overlay + shortcut) | Founder ratifies 07b sole ownership |
| CT-007 | HIGH | 01 + 11 | audit_log writes specified by PRD §5.1 not implemented | Resolves with CT-001 |
| CT-009 | HIGH | All plans | `as any` (~214 occurrences) + `process.env.X!` (24 occurrences) | Refactor pass + `requireEnv` helper |
| CT-011 | HIGH | 01 + 02 + 04 | Cross-plan profile shape — `auth.profile.email` doesn't exist | Extend Plan 01 UserProfile or use `auth.user?.email` |
| CT-015 | HIGH | 11 + 12 | Resend env-guard lacks Sentry breadcrumb | Add `captureMessage('resend_skipped_no_api_key', 'warning')` |
| C-MED-X.3 | MEDIUM | 01 + 04 + 11 + 12 | `<EmailShell>` + Resend wrapper duplicated across two runtimes — Plan 11 ships `api/_shared/email.ts` (Vercel Functions) + Plan 01 ships `supabase/functions/_shared/resend-client.ts` (Supabase Edge Functions). Ownership boundaries cloudy. | Document single source-of-truth contract in scope plan §6: which wrapper each runtime uses + shared signature. Or unify into one wrapper + adapt at boundary. |
| CT-016 | MEDIUM | Scope plan §3 (cross-cluster) | Stale cluster summaries — Cluster 06 Prototype "DEFERRED" + Cluster 07 Q11 MEASUREMENT + §2.1 file inventory `07-...` | Update all 3 stale lines |
| CT-018 | MEDIUM | PRDs 07a + 07b + 09 + 10 | Status field staleness — body cites 2026-05-17 ratifications | Bump Status to `IN-REVIEW 2026-05-17` |
| CT-019 | MEDIUM | 02 (owner) + 04 (consumer) | M9 `access_token`-in-URL launch-blocker; only PRD 02 has grep guard | Add to PRD 04 acceptance + §9.5 grep |
| CT-021 | NOTE | 02 + 03 + 04 | `/brands` + `/account/brands` cross-cluster route coordination | Document lockstep ordering in scope plan §6 |
| Pattern-1 | MEDIUM | 04 + 05 + 07b + 08 | Multi-component task compression — 4+ components in single task body | Split into per-component sub-tasks — **Dispatch: W0-11** |
| Pattern-3 | MEDIUM | 03 + 09 + 11 + 12 | Acceptance criteria not enumerated as tests | Every PRD §8 bullet maps 1:1 to a named test in Plan §9 — **Dispatch: W0-12** |
| Pattern-4 | MEDIUM | 09 + 11 + 12 | Stub-guard policy applied unevenly | Standardize `loadEnvOrSkip()` helper in `api/_shared/env.ts` — **Dispatch: W0-13** |
| Pattern-6 | LOW | 09 + 12 | Edge Function runtime config absent | CI grep — `api/*` must export `config` with runtime — **Dispatch: W0-14** |
| Pattern-7 | MEDIUM | 02 + 03 + 10 + 11 + 12 | PRD-internal numerical/count inconsistency | Run grep sweep — for each PRD, assert numeric counts match referents — **Dispatch: W0-15** |

---

## Suggested fix dispatch order

### Wave 0 — Cross-cluster contracts (must complete BEFORE any Wave-1 fix dispatch)

These decisions affect N downstream findings. Founder ratification + PRD/plan edits land first.

- **W0-1: CT-001 audit_log ownership** — Founder + Cluster 11 author the table DDL + RLS + `writeAudit()` helper. Unblocks CT-007, C-MED11, and 3 consumer plans. (1 PRD edit + 1 plan edit + 1 migration.)
- **W0-2: CT-022 find-feature ownership** — Founder ratifies 07b sole ownership (per 2026-05-17 lock). Plan 08 drops find feature or renames. (1 PRD edit + 2 plan edits.)
- **W0-3: CT-002 routing + store-name canonical** — Single decision (`/brand/:brandId` + `useRightPanelStore` at `src/stores/right-panel.ts`). Affects Plan 02/03/06/10. (1 scope-plan §6 edit + 4 plan callsite updates.)
- **W0-4: CT-003 KovaIcon primitive** — Plan 11 ships `<KovaIcon name="...">`. Replaces all icon bindings in Plan 02/03/04/05/06/11. (1 plan addition + 6 plan replacements.)
- **W0-5: CT-013 search_path CI gate** — Add CI grep that every `SECURITY DEFINER` block carries `SET search_path` within same function definition. Block Wave 2 RPC migrations until green. (1 Plan 11 CI step.)
- **W0-6: CT-010 test framework CI gate** — Add CI grep `grep -rE "(jest|vi)\.(mock|fn|spyOn)" tests/` → fail if matches. (1 Plan 11 CI step.)
- **W0-7: CT-005 + CT-006 propagation** — Founder confirms; apply Cmd+K scrub (PRD 04/06/08) + AI-default-tab propagation (PRD 10 + PRD 06 line 253 fix).
- **W0-8: CT-004 measurement model propagation** — Founder confirms; rewrite PRD 07b + PRD 10 + scope plan §3 to match 07a §7.1b page-level model. (Note: scope plan §3 measurement line at L276 is covered here; for the rest of scope plan §3 staleness see W0-10.)
- **W0-9: CT-009 founder-lock #10 sweep** — Author `requireEnv` helper in `api/_shared/env.ts` (typed env-var accessor); refactor pass removes the 24 `process.env.X!` non-null assertions and the ~214 `as any` casts across all plans (especially Plan 03: 49, Plan 06: 41). Add CI grep `grep -rE "process\.env\.[A-Z_]+!|as any" src/ api/ supabase/functions/" → fail on match. (1 Plan 11 helper addition + cross-plan refactor + 1 CI step.)
- **W0-10: CT-016 scope plan §3 + §2.1 cleanup** — Scope-plan author updates the 3 stale lines: (a) Cluster 06 Prototype "DEFERRED" wording at line 242 (clarify "out of scope entirely"); (b) Cluster 07 Q11 MEASUREMENT NodeType reference (rewrite to page-level per W0-8); (c) §2.1 file inventory mention of `07-canvas-engine-extensions.md` at line 40 (replace with current 07a/07b filenames). (1 scope-plan edit.)
- **W0-11: Pattern-1 task-compression split** (MEDIUM, clusters 04 + 05 + 07b + 08) — Plan authors expand any task body containing 4+ components into one sub-task per component. Cluster 04 webhook handler test scenarios (C-LOW04.5), Cluster 05 per-tab components (C-MED16), Cluster 07b overlays (C-MED-07b.1), Cluster 08 keyboard refactor (C-MED21). Resolves with W2/W3 cluster-fix tasks but the splitting convention itself is set here. (1 scope-plan §6 convention note.)
- **W0-12: Pattern-3 acceptance-criteria-to-test mapping** (MEDIUM, clusters 03 + 09 + 11 + 12) — Convention: every PRD §8 acceptance bullet must map 1:1 to a named test in Plan §9. Add to scope plan §6 author rubric + add CI grep `grep -E "^- \[" docs/kova-final-prds/*.md | wc -l` cross-checked against test ID inventory. (1 convention note + 1 CI step.)
- **W0-13: Pattern-4 stub-guard standardization** (MEDIUM, clusters 09 + 11 + 12) — Author `loadEnvOrSkip()` helper in `api/_shared/env.ts` (Plan 11) — pattern: if required env var missing, return null + `captureMessage('skipped_no_env', 'warning')`. Replace ad-hoc env-checks in Plan 09 snapshot prune, Plan 11 Resend, Plan 12 settings. (1 Plan 11 helper + 3 plan refactors.)
- **W0-14: Pattern-6 Edge Function runtime config CI** (LOW, clusters 09 + 12) — CI grep `grep -L "export const config" api/*.ts` → fail on Edge Function files missing runtime config. Cover Plan 09 snapshot create/prune, Plan 12 send-sync-alert. (1 Plan 11 CI step.)
- **W0-15: Pattern-7 PRD numerical-count sweep** (MEDIUM, clusters 02 + 03 + 10 + 11 + 12) — One-time grep sweep: for each PRD, enumerate numeric counts (sidebar count, recent-colors cap, RPC count, tone-snippet cap, brand-memories cap, chips cap, chat-tabs cap) and assert each appears in only one canonical place. Track drift in scope plan §6 "numerical caps" appendix. (1 scope-plan appendix + 5 PRD audits.)

### Wave 1 — Cluster-owned (dispatch parallel after Wave 0)

| Owner | Findings (priority order) | Dispatch budget |
|---|---|---|
| **Cluster 11 fix agent** | CT-001 audit_log, CT-003 KovaIcon, C-HIGH11 verifyIdempotency hash, C-HIGH12 EmptyState icon, CT-024 v-html, CT-015 Resend breadcrumb, C-MED-11.3/4/5/6, A-MED3, A-LOW3, B-LOW5 TODO checklist, C-MED-X.3 Resend two-runtime ownership | L |
| **Cluster 01 fix agent** | B-CRIT7 Shopify revoke, B-CRIT8 rate-limit, B-HIGH5 Stripe idempotencyKey arg slot, CT-007 audit writes, B-HIGH15 SQLSTATE matching, B-MED10 claim row TABLE shape, B-MED2 RLS policy redundant, C-MED1/2/3, B-MED1 search_path style, A-MED2 §12 closure, A-LOW2 cron dead-branch, C-LOW01.6 DangerZoneCard inline modal | M |
| **Cluster 12 fix agent** | C-HIGH13 JSON.stringify double-encode, C-HIGH14 Resend stub task, C-MED12.3 recent-colors cap, C-MED12.4 env guards | S |

### Wave 2 — Cluster-owned (after Wave 1 settles)

| Owner | Findings | Dispatch budget |
|---|---|---|
| **Cluster 02 fix agent** | B-CRIT10 fetch Promise, B-CRIT11 sortMode wrong store, B-CRIT5 jest.mock, C-HIGH2 wizard sub-routes, C-HIGH3 inject identifier, B-HIGH4/6/8/14, CT-011, C-MED4-8, B-MED4 e.code Enter outlier confirm, CT-020 offline indicator, A-MED1 §12 closure, A-LOW5 SOON pills, C-LOW02.7 retire steps | L |
| **Cluster 03 fix agent** | CT-013 (03 portion), B-CRIT3 icon syntax, B-CRIT9 from-jwt literal, B-CRIT14 v-html, B-CRIT6 vi.mock, CT-023 (a/b/c) 6 missing tasks, B-HIGH3 e.key/e.code, B-HIGH10/11/19, C-MED9/10/11/12, B-MED12/17, C-LOW03.9/10, B-LOW3/6 | L |
| **Cluster 04 fix agent** | B-CRIT12 webhook raw body, B-CRIT4 dynamic icons, CT-008 trialing union, B-HIGH9/12/16, CT-019 access_token grep, B-MED8/11/13/14, C-MED13/14/15, C-LOW04.4-7, A-LOW4 sidebar count, CT-006 (a) Cmd+K | L |
| **Cluster 05 fix agent** | B-HIGH7/17 icon syntax, C-MED16 per-tab TDD, C-LOW05.2/3/4, B-LOW4 count:null TODO, CT-001 audit consumer wiring | S |

### Wave 3 — Canvas + downstream (after Wave 1 + Wave 2 stable)

| Owner | Findings | Dispatch budget |
|---|---|---|
| **Cluster 06 fix agent** | CT-005, CT-006 (b), B-HIGH7 (06), B-CRIT1 (06) route assertion, C-MED17/18, C-LOW06.3-5, C-MED26 (06) | M |
| **Cluster 07a fix agent** | A-HIGH5 status bump, C-LOW07a.1-4 | S |
| **Cluster 07b fix agent** | CT-022 (resolves with W0-2), CT-004 (07b), CT-018 (07b status bump — Status → `IN-REVIEW 2026-05-17`), C-MED-07b.1, C-LOW07b.2-5 | S–M |
| **Cluster 08 fix agent** | CT-006 (c), C-MED20/21, C-MED-08.5, C-LOW08.6 | S |

### Wave 4 — Wave-6 PRDs

| Owner | Findings | Dispatch budget |
|---|---|---|
| **Cluster 09 fix agent** | B-CRIT13 signInAs, CT-013 (09), C-HIGH7/8/9, B-HIGH20, C-MED22-26, A-MED6 status, C-LOW09.9-12, B-MED9 path drift, B-MED5 Promise.all sequences | M–L |
| **Cluster 10 fix agent** | CT-005 (10), CT-004 (10), C-HIGH10, C-MED27/28, C-MED-10.6, A-LOW6 status, C-LOW10.5 (a/b) | S–M |

### Reconciliation pass

After Wave 4 lands: re-run targeted PRD-consistency audit limited to changed surfaces to confirm fixes did not introduce new drift (per QA-A closing recommendation). Also re-verify CT-001 audit_log column shape across all 4 consumer call sites is identical.

---

## Founder review checklist

- [ ] Severity totals look right (19 CRITICAL / 36 HIGH / 56 MEDIUM / 41 LOW / 6 NOTE = 158)
- [ ] No locked decision is being re-litigated (NOTE-tagged items below not in fix scope)
- [ ] Cluster ownership assignment matches your mental model (esp. CT-022 find-feature → 07b sole ownership)
- [ ] Wave 0 cross-cluster contracts approved before Wave 1 starts:
  - [ ] W0-1 audit_log table shape (columns, RLS, helper signature)
  - [ ] W0-2 find-feature: 07b owns sole; Plan 08 drops or renames
  - [ ] W0-3 routing canonical: `/brand/:brandId` (RESTful path param)
  - [ ] W0-3 store canonical: `useRightPanelStore` at `src/stores/right-panel.ts`
  - [ ] W0-4 KovaIcon primitive — Plan 11 ships single tag convention
  - [ ] W0-5 + W0-6 CI grep gates in Plan 11
  - [ ] W0-7 founder reconfirms AI-default-tab + Cmd+K-removed for full propagation
  - [ ] W0-8 founder reconfirms MEASUREMENT page-level model for full propagation
  - [ ] W0-9 founder lock #10 sweep — `requireEnv` helper + `as any` refactor pass + CI grep
  - [ ] W0-10 scope plan §3 + §2.1 cleanup (3 stale lines: Cluster 06 Prototype wording, Cluster 07 MEASUREMENT ref, §2.1 file inventory)
  - [ ] W0-11 Pattern-1 task-compression split convention (scope plan §6)
  - [ ] W0-12 Pattern-3 acceptance-criteria-to-test mapping (convention + CI grep)
  - [ ] W0-13 Pattern-4 stub-guard helper `loadEnvOrSkip()` standardized in Plan 11
  - [ ] W0-14 Pattern-6 Edge Function runtime config CI grep
  - [ ] W0-15 Pattern-7 PRD numerical-count sweep + scope-plan appendix
- [ ] Approve dispatch order
- [ ] Confirm 6 unresolved §12 OPEN QUESTIONS (PRD 01: 2 / PRD 02: 2 / PRD 11: 2 — see CT-017) before Wave 1 starts

---

## Deferred to post-Wave-1 (NOTE-locked, not in fix scope)

These are founder-frozen decisions or per-feedback locks. Surfaced for awareness only.

- **A-NOTE1 (now folded into CT-020):** PRD 02 still specs sidebar offline `.net-strip` — Cluster 11 §3.7 retired this. Per-feedback locked (`feedback_app_dark_website_light` — single topbar icon + tooltip Figma model). **Fix is required** because Cluster 11 lock supersedes; tracked as MEDIUM CT-020 not NOTE. The original A-NOTE1 framing was that the lock-side is correct, consumer-side (PRD 02) needs to align.
- **A-NOTE2 + A-NOTE3 (CT-021):** `/brands` and `/account/brands` cross-cluster route registration coordination. Founder-locked per B12 reversal. Pattern is correctly documented in both PRDs but fragile — requires implementation-order discipline. No code fix needed; document lockstep in scope plan §6.
- **B-NOTE1:** Plan 01 imports Zod in Edge Function `email-change-request.ts`. Founder lock #3 ("valibot only in tool layer") explicitly permits Zod in Edge Functions. Not a violation.
- **B-NOTE2:** Plan 07a modifies `packages/core/`. Founder lock #16 documented exception for SLICE (17th NodeType) + Measurement (page-level). Permitted.
- **B-NOTE3:** Plan 11 stubs Sentry / Resend / Vercel Cron. Founder lock #14 ("deferred to pre-launch — stub-guard pattern OK"). Permitted; activation checklist needed pre-launch.
- **LOW-1 (B):** Plan 01 vercel.json `crons` requires Vercel Pro plan. Operator runbook concern, not a code bug.

---

## Inconsistencies between source reports (noted during merge)

1. **Severity divergence on audit_log:** QA-A tagged CRITICAL-1, QA-C tagged CRITICAL-4, QA-B implied via HIGH-15 (string-match defensive check) and via the 5 Plan-side consumer references. Merged at CRITICAL per max-of-three rule. No conflict in substance.
2. **PRD 10 chip-row position:** QA-C MED-10.3 flags PRD-internal contradiction (PRD 10 §6.4.2 vs §3.2/§12.12 founder lock); QA-A does not surface. QA-C wins via specificity.
3. **Plan 03 `as any` count:** QA-B says 49; cross-checked against Plan 03 — count matches grep output. No drift.
4. **CT-013 search_path scope:** QA-B CRITICAL-2 enumerates 8 RPCs in Plan 03; QA-C CRITICAL-4 audit_log finding incidentally notes the gap. QA-B's enumeration is the authoritative count.
5. **CT-018 status hygiene:** QA-A is the only auditor to systematically check status fields across all 13 PRDs (Observation 5 table). QA-B and QA-C did not address. Merged at QA-A's granularity.
6. **Plan 04 webhook 5xx semantics (B-MED8):** QA-B identifies that the catch returns 200 — silencing Stripe retries. QA-C does not surface. Single-auditor finding but high-confidence (testable against Stripe's documented retry behavior).
7. **CT-022 find-feature severity:** QA-C splits into 3 CRITICALs (store + overlay + shortcut). QA-A and QA-B do not surface. Merged into one decision-blocker because all 3 resolve from the same founder ratification call.
8. **MEASUREMENT model:** QA-A HIGH-3 + MED-5 + MED-7 cover PRD 07b, scope plan §3, PRD 10 separately. QA-B and QA-C do not surface (operate on plans + reconciliation respectively; the engine PRD pair was QA-A's lens). QA-A is sole source.

---

## Audit-trail correction (2026-05-19)

A meticulous re-audit on 2026-05-19 found that the initial consolidation pass (2026-05-18) silently dropped 9 findings between source reports and the consolidated triage. They have since been added. Inventory:

| Finding ID | Source | Severity | Cluster | Status |
|---|---|---|---|---|
| B-MED2 | QA-B MEDIUM-2 | MEDIUM | 01 | Added |
| B-MED4 | QA-B MEDIUM-4 | MEDIUM | 02 | Added (informational — confirms Plan 03 as `e.code` outlier) |
| B-MED5 | QA-B MEDIUM-5 | MEDIUM | 09 (multi-plan applicability) | Added |
| B-MED11 | QA-B MEDIUM-11 | MEDIUM | 02+04 | Added (author marked NON-ISSUE; preserved for audit trail) |
| B-LOW4 | QA-B LOW-4 | LOW | 05 | Added |
| B-LOW5 | QA-B LOW-5 | LOW | 11 | Added (companion to B-NOTE3) |
| C-LOW01.6 | QA-C per-pair matrix Pair 01 | LOW | 01 | Added |
| C-LOW02.7 | QA-C per-pair matrix Pair 02 | LOW | 02 | Added |
| C-MED-X.3 | QA-C shared-resource ownership table | MEDIUM | cross-cluster (01+04+11+12) | Added to Cross-cluster findings |

Final dedup counts updated from 149 → **158** unique findings. Severity totals: 19 CRITICAL / 36 HIGH / 56 MEDIUM / 41 LOW / 6 NOTE.

Also corrected: every cluster-section header now reports an accurate row count for its findings table (initial counts were off by 1–6 rows per cluster due to subagent miscount). HIGH-18 from QA-B (author self-marked "false alarm — actually OK") correctly excluded from dedup totals.

**Fix agents:** read this section before dispatching. Every newly-added finding has been integrated into the relevant cluster table + dispatch-wave table.

---

## Post-verification cleanup pass (2026-05-19, evening)

Independent verification (QA-VERIFY-findings.md, 301 lines) returned **PASS WITH WARNINGS**: 0 dropped, 0 fabricated, 0 cluster misplacements, 0 frozen-decision violations, 20/20 spot-checked recommended fixes faithful. The 5 small issues flagged were applied to this document in the same session. Changelog:

1. **Notational shorthand resolved:** `A1` → `A-CRIT1` (4 locations); `B-IMPLIED` → `B-HIGH15 + B-consumer-refs(5)` for CT-001 audit_log gap (2 locations) and `B-HIGH15` for CT-007 plan-side writeAudit gap (1 location, aligned with overlap-map row). See Inconsistencies #1 for the audit_log severity-merge rationale.
2. **Severity tags normalized:** CT-008 + C-HIGH13 resolve from non-standard `HIGH→CRITICAL` to definite `CRITICAL` (with elevation rationale inline). Also normalized CT-010 + CT-022 + CT-024 in the overlap map (were tagged HIGH but counted as CRITICAL elsewhere — now CRITICAL everywhere per max-of-three rule). CT-021 in overlap map normalized from MEDIUM to NOTE (matches the Deferred-to-post-Wave-1 section's NOTE classification).
3. **NOTE row clarified:** Top-of-doc severity table's `NOTE | 6` row clarified — counts raw source-side NOTEs (A-NOTE1/2/3 + B-NOTE1/2/3); post-merge rows = 4 (A-NOTE1 elevated to CT-020, A-NOTE2+3 merged to CT-021, B-NOTE1/2/3 retained). Total 158 unaffected.
4. **Dispatch-wave gaps closed:** Added 7 new Wave 0 tasks: W0-9 (CT-009 lock-#10 sweep + `requireEnv` helper), W0-10 (CT-016 scope-plan §3 + §2.1 cleanup), W0-11 (Pattern-1 task-compression split), W0-12 (Pattern-3 acceptance-test mapping), W0-13 (Pattern-4 stub-guard `loadEnvOrSkip` helper), W0-14 (Pattern-6 Edge Function runtime-config CI), W0-15 (Pattern-7 PRD numerical-count sweep). Extended Cluster 07b Wave 3 row to include CT-018 (07b status bump). Each Pattern-N row in the cross-cluster table now carries a `Dispatch: W0-NN` reference.
5. **CT-001 fix cell augmented:** Added §11 cross-cuts ripple note — consumer PRDs 01/03/04/05 each need an `audit_log` table + `writeAudit` helper entry per A-CRIT1 step 4 (was implicit in spot-check verification; now explicit).
6. **Cluster owner column added to overlap map:** Each CT-NNN row now names its owning cluster (Wave-dispatch destination) + parenthesized consumer clusters. Lets fix agents jump from overlap map to ownership without traversing 13 cluster tables.
7. **Inconsistencies cross-references:** 8 inline `(see Inconsistencies #N)` markers added to the relevant CT-NNN + single-source rows so fix agents can find the consolidator's merge reasoning quickly. Linked items #1 (audit_log severity), #2 (PRD 10 chip-row), #4 (CT-013 search_path scope), #5 (CT-018 status hygiene), #6 (B-MED8 Stripe 5xx), #7 (CT-022 find-feature severity split), #8 (MEASUREMENT model).
8. **Cluster header severity breakdowns corrected:** Cluster 04 (`19 (3 CRITICAL [incl. CT-008 elevated], 4 HIGH, 8 MEDIUM, 4 LOW)`) and Cluster 12 (`6 (1 CRITICAL [C-HIGH13 elevated from HIGH], 1 HIGH, 2 MEDIUM, 2 LOW)`) updated to match elevated severities.

Final dedup totals unchanged: **158 unique findings.** Final severity totals unchanged: **19 CRITICAL / 36 HIGH / 56 MEDIUM / 41 LOW** (top-of-doc NOTE row reclassified per item 3 above).

Fix dispatch is cleared to proceed once founder ratifies Wave 0 cross-cluster contracts.

---

**End of consolidated triage.**
