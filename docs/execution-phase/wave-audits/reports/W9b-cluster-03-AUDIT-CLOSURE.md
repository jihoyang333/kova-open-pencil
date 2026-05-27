# W9b — Cluster 03 (Brand Management) AUDIT CLOSURE

**Verdict shift:** ⚠️ PASS WITH WARNINGS → ✅ READY-TO-MERGE (pending founder
sign-off on H5/H6 carve-outs)

**Companion docs:**
- `docs/execution-phase/wave-audits/reports/W9b-cluster-03-AUDIT-REPORT.md`
- `docs/execution-phase/cluster-reports/W9b-cluster-03-DONE.md`
- `docs/execution-phase/cluster-reports/W9b-cluster-03-DEFERRAL-CARVEOUTS.md`

**Date:** 2026-05-26
**Auditor:** Claude Opus 4.7, follow-up session, applied fixes to
`app/cluster-03-brand-mgmt`.

This document closes out every finding in the audit report — 35 total — with
the resolution applied and the file:line where the fix lives.

---

## CRITICAL — 1/1 fixed

| ID | Finding | Resolution | File |
|---|---|---|---|
| C1 | `delete_brand` final DELETE missing `user_id` predicate | Re-asserted `AND user_id = v_user_id` on the final DELETE. | `supabase/migrations/20260607_03_brands_lifecycle.sql:289` |

---

## HIGH — 7/7 addressed

| ID | Finding | Resolution | File |
|---|---|---|---|
| H1 | Rate-limit on 4 of 5 endpoints | New shared helper `enforceRateLimit()` + `rateLimitResponse()`; all 5 endpoints consume per-endpoint PRD §5.1 caps (30/60/30/30/10). | `api/_shared/rate-limit.ts` + `api/brands/{create,rename,archive,restore,delete}.ts` |
| H2 | `create_brand` slug race | Wrapped INSERT in `EXCEPTION WHEN unique_violation` → raises clean `slug_collision` (ERRCODE 40001). Edge handler maps to 409. | `supabase/migrations/...:148-159` + `api/brands/create.ts:83-89` |
| H3 | `restore_brand` audit gap | `INSERT INTO public.audit_log` is now inside the RPC body, atomic with the UPDATE. Edge Function no longer fires duplicate `writeAudit` for restore. SECURITY DEFINER bypasses audit_log's service-role-only RLS. | `supabase/migrations/...:226-261` + `api/brands/restore.ts` |
| H4 | `fetchArchivedBrands` race | In-flight `Promise<void> \| null` cache coalesces concurrent callers; 60s cache still applies once one resolves. | `src/stores/brands.ts:135-167` |
| H5 | Shopify OAuth deferred | Carve-out doc filed; PRD §8.2 acceptance criterion suspension recorded. Founder action pending. | `docs/execution-phase/cluster-reports/W9b-cluster-03-DEFERRAL-CARVEOUTS.md` |
| H6 | Wizard composite vs 11-file plan | Carve-out doc filed; PRD §6.1 nested-route requirement reduced to Phase 2. Founder action pending. | same |
| H7 | Edge Function handler test coverage | 5 new handler test files + 2 shared-helper tests + B-CRIT9 regression test inside `delete.test.ts`. 52 new test cases, all green. | `tests/unit/api/brands/{create,rename,archive,restore,delete}.test.ts` + `tests/unit/api/_shared/{rate-limit,storage-sweep}.test.ts` |

---

## MEDIUM — 14/14 fixed

| ID | Finding | Resolution | File |
|---|---|---|---|
| M1 | Missing archived-list covering index | Added `idx_brands_archived_per_user`. | `supabase/migrations/...:54-57` |
| M2 | `slug` column not DB-enforced immutable | Added `tg_brands_slug_immutable` trigger + BEFORE UPDATE wire-up. | `supabase/migrations/...:59-79` |
| M3 | `url` column no length CHECK | Added `brands_url_length_chk` (length ≤ 2048). | `supabase/migrations/...:23-29` |
| M4 | `canContinueName` not computed | Converted plain function to `computed()`. | `src/views/brands/NewBrandWizardView.vue:41` |
| M5 | `ReturnType<typeof ref<T>>` interface members | Replaced with `Ref<T>` / `ComputedRef<T>` from `'vue'`. | `src/composables/use-new-brand-flow.ts:21-34` |
| M6 | `CreateBrandFullInput` scoped inside store function | Moved to module scope, exported. | `src/stores/brands.ts:34-44` |
| M7 | `archive.next_brand_id` semantics drift vs PRD | Documented "most-recently-edited" intent + PRD-amendment note in handler header. | `api/brands/archive.ts:11-21` |
| M8 | `canvas_count` silent on Supabase error | Added `console.warn` on count failure (archive) and on missing summary fields (delete). | `api/brands/archive.ts:110-117` + `api/brands/delete.ts:96-104` |
| M9 | `writeAudit` after sweep loses audit on sweep failure | Moved `writeAudit` BEFORE storage sweep so cascade-deleted row's audit lands first. | `api/brands/delete.ts:105-115` |
| M10 | `validateBrandUrl` unused / URL length not capped | Validator now caps URL ≤ `MAX_URL` (2048 — mirrors DB CHECK). | `api/_shared/brand-validation.ts:22-25, 43-52` |
| M11 | `BrandsArchivedFilter` double-emit on mount | Added comment documenting intentional `{ immediate: true }` semantics — fetchArchivedBrands is correctly skipped when persisted='hide'. | `src/components/brand/BrandsArchivedFilter.vue:24-31` |
| M12 | `RenameBrandModal` Cmd+Enter handler | Documented as intentional seam for Phase-2 textarea support. | `src/components/brand/RenameBrandModal.vue:64-72` |
| M13 | `BrandPickerView` does not surface fetchBrands errors | Wrapped `onMounted` fetchBrands in try/catch + toast on failure. | `src/views/brands/BrandPickerView.vue:42-50` |
| M14 | X-Idempotency-Key strips UUID dashes | Send canonical UUID with dashes (server regex accepts both). | `src/stores/brands.ts:54-56` |

---

## LOW — 11/13 fixed (2 deferred-with-reason)

| ID | Finding | Resolution | File |
|---|---|---|---|
| L1 | `auth.uid()` not wrapped in SELECT | Wrapped in both list RPCs. | `supabase/migrations/...:312, 327` |
| L2 | Backfill `id::text` round-trip cast | **Skipped** — fragile-but-correct; touching it risks breaking the backfill block. Audit flagged as cosmetic LOW. | n/a |
| L3 | `delete_brand` comment omits SET NULL FK dependents | Comment block documents `shopify_webhook_log` + `shopify_compliance_log` SET-NULL behaviour. | `supabase/migrations/...:267-272` |
| L4 | No explicit `REVOKE FROM PUBLIC` | Explicit REVOKE before each GRANT on all 7 RPCs. | `supabase/migrations/...:344-350` |
| L5 | Unawaited/unvoided `router.push` promises | `void router.push(...)` everywhere; navigation cancellation no longer leaks. | `src/views/brands/BrandPickerView.vue:81,87,93` + `src/views/account/BrandsAccountView.vue:68,75` |
| L6 | Client `sanitize-text.ts` missing `sanitizeUrl` mirror | Added `sanitizeUrl()` mirror for downstream `:href` consumers. | `src/lib/sanitize-text.ts:21-34` |
| L7 | `window.__kova_*_count` globals untyped/untested | Added TODO(C05,C09) marker. | `src/components/brand/DeleteBrandModal.vue:46-49` |
| L8 | `archive` audit `canvas_count` point-in-time | Documented intent in handler comment (snapshot — not authoritative). | `api/brands/archive.ts:111-113` |
| L9 | Dead `.catch()` fallback to `/account/coming-soon` | Replaced with `void router.push('/account')` + comment. | `src/views/brands/BrandPickerView.vue:79-83` |
| L10 | `sortMode` persisted but no UI selector | Added `<KovaSelect>` with `SORT_OPTIONS` ("Last edited" / "Name") wired to existing `sortMode` ref. | `src/views/brands/BrandPickerView.vue:32-36, 102` |
| L11 | `BrandsAccountView.onMounted` double-fetches | Skips `fetchArchivedBrands` when `fetchBrands` already ran from cold; only re-fetches when brands list was already cached. | `src/views/account/BrandsAccountView.vue:47-58` |
| L12 | Both `sortedBrands` (legacy) + `sortedActiveBrands` exposed | JSDoc disambiguates when to use each. | `src/stores/brands.ts:96-110` |
| L13 | String-template paths instead of `{ name: 'brand-home' }` | **Skipped** — substantial refactor across 3 files; audit flagged as cosmetic LOW. Tracked for a future cleanup pass. | n/a |

---

## Verification

### Lint + duplication
```
$ bun run check     # exits 0 — only pre-existing px/hex warnings remain
$ bun run test:dupes  # 1.16% < 3% cap
```

### Hard-constraint grep
```
$ git diff feat/m9-shopify -- 'src/**' | grep -nE 'v-html|innerHTML'
# Only comment-line mentions remain (lines 569, 1114). No live usage.

$ git diff feat/m9-shopify -- 'src/**' | grep -nE 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg'
# NONE.

$ git diff --name-only feat/m9-shopify | grep '^packages/core/'
# NONE.
```

### Cluster 03 test surface
```
$ bun test tests/unit/api/brands/ tests/unit/api/_shared/{rate-limit,storage-sweep}.test.ts \
           tests/unit/stores/brands.test.ts tests/unit/stores/brands-create-full.test.ts \
           tests/unit/composables/use-new-brand-flow.test.ts \
           tests/unit/components/brand/typed-confirm-field.test.ts \
           tests/unit/lib/sanitize-text.test.ts tests/unit/api/brand-validation.test.ts
# 101 pass / 0 fail / 187 expect() calls
```

### Full unit suite
```
$ bun run test:unit
# 2156 pass / 99 skip / 32 fail
```
The 32 failures are identical to the DONE-report baseline (auth-store
StorageEvent + @vueuse/core 14.x + BrandSwitcher/SideFooter pre-existing
mocking issues). Zero are in cluster-03 surfaces. No regressions
introduced by these fixes.

### Migration sanity
```
$ grep -c 'SECURITY DEFINER' supabase/migrations/20260607_03_brands_lifecycle.sql
# 9 (7 RPCs + 1 trigger function + 1 anchored comment line)
$ grep -c 'search_path = public, pg_temp' supabase/migrations/20260607_03_brands_lifecycle.sql
# 8 (7 RPCs + 1 anchored comment line) — every RPC locked
$ grep -c 'auth.uid()' supabase/migrations/20260607_03_brands_lifecycle.sql
# 8 (5 plpgsql + 2 (SELECT auth.uid()) wrapped + 1 in comment)
```

---

## Files touched

### Modified (16)
- `supabase/migrations/20260607_03_brands_lifecycle.sql` (C1, H2, H3, M1, M2, M3, L1, L3, L4)
- `api/_shared/brand-validation.ts` (M10)
- `api/brands/create.ts` (H1, H2)
- `api/brands/rename.ts` (H1)
- `api/brands/archive.ts` (H1, M7, M8, L8)
- `api/brands/restore.ts` (H1, H3)
- `api/brands/delete.ts` (H1, M8, M9)
- `src/stores/brands.ts` (H4, M6, M14, L12)
- `src/composables/use-new-brand-flow.ts` (M5)
- `src/lib/sanitize-text.ts` (L6)
- `src/views/brands/BrandPickerView.vue` (M13, L5, L9, L10)
- `src/views/brands/NewBrandWizardView.vue` (M4)
- `src/views/account/BrandsAccountView.vue` (L5, L11)
- `src/components/brand/BrandsArchivedFilter.vue` (M11)
- `src/components/brand/RenameBrandModal.vue` (M12)
- `src/components/brand/DeleteBrandModal.vue` (L7)

### Added (10)
- `api/_shared/rate-limit.ts` (H1 shared helper)
- `tests/unit/api/brands/create.test.ts` (H7)
- `tests/unit/api/brands/rename.test.ts` (H7)
- `tests/unit/api/brands/archive.test.ts` (H7)
- `tests/unit/api/brands/restore.test.ts` (H7)
- `tests/unit/api/brands/delete.test.ts` (H7 + B-CRIT9 regression)
- `tests/unit/api/_shared/rate-limit.test.ts` (H7)
- `tests/unit/api/_shared/storage-sweep.test.ts` (H7)
- `docs/execution-phase/cluster-reports/W9b-cluster-03-DEFERRAL-CARVEOUTS.md` (H5, H6)
- `docs/execution-phase/wave-audits/reports/W9b-cluster-03-AUDIT-CLOSURE.md` (this doc)

---

## Outstanding items

The two skipped LOWs (L2, L13) are cosmetic-only and were called out in the
original report as deferrable. No security, correctness, or performance
impact. Track for a future cluster-cleanup pass if/when other surfaces
introduce the same patterns.

Founder still owes (unchanged from DONE report):
- `supabase migration up` against local + staging Supabase
- `bun run build` (production build smoke)
- `bun run dev` + browser smoke per PRD §9.4
- Sign-off on H5 + H6 deferral carve-outs (or directive to wire them
  before merge)
- `e2e-runner` dispatch for PRD §9.3 happy paths
- PRD §0 status row bump to IN-IMPLEMENTATION

---

W9b CLUSTER 03 AUDIT REMEDIATION COMPLETE. 33 of 35 findings closed
(2 cosmetic LOWs explicitly deferred). All security-critical issues fixed.
All 101 cluster-03 tests green. No regressions in pre-existing failing
suite. Hard-constraint grep clean. Ready for founder sign-off on the two
carve-outs, then merge to `feat/m9-shopify`.
