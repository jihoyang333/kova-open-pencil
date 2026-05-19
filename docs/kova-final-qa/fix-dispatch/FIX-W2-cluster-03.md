# Wave 2 — Cluster 03 (Brand Management) Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Prerequisite:** Wave 1 merged.
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/`
**Branch to create:** `fix/qa-w2-cluster-03-brand-management`
**Estimated wall-clock:** 1 day
**Output PR title:** `fix(qa-w2-cluster-03): brand-management — 22 findings`

---

## Mission

Cluster 03 owns brand CRUD modal, Brand Kit settings page, archived brands view + restore flow, brand sort + filter, 5 Edge Functions, 8 SECURITY DEFINER RPCs, brand-card UI. Consumes Cluster 11 primitives + Cluster 01 auth.

Your job: close **22 findings** (5 CRITICAL, 7 HIGH, 6 MEDIUM, 4 LOW).

---

## Required reading

1. CONSOLIDATED-TRIAGE.md — Cluster 03 section in full
2. QA-B-findings.md — B-CRIT2, B-CRIT3, B-CRIT6, B-CRIT9, B-CRIT14, B-HIGH3, B-HIGH10, B-HIGH11, B-HIGH19, B-MED12, B-MED17, B-LOW3, B-LOW6
3. QA-C-findings.md — Pair 03 matrix; HIGH-4, HIGH-5, HIGH-6, MEDIUM-9, MEDIUM-10, MEDIUM-11, MEDIUM-12, LOW-03.9, LOW-03.10
4. fix-dispatch/README.md (frozen decisions)
5. Cluster 11 PR — KovaIcon + audit_log helper
6. PRD 03 + Plan 03 (post-W0 + post-W1 state)

---

## Findings to close

### CRITICAL (5)

1. **B-CRIT2 / CT-013 SECURITY DEFINER `SET search_path`** — Plan 03 multiple (8 RPCs).
   - Add `SET search_path = public, pg_temp` to every `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER` block.
   - 8 RPCs: `create_brand`, `rename_brand`, `archive_brand`, `restore_brand`, `delete_brand`, plus 3 others (verify by grep).
   - W0-5 CI gate (added in Wave 0) will block your PR if any DEFINER block lacks the setting. Run the grep locally before pushing.

2. **B-CRIT3 / CT-003 Nuxt-style `<Icon name="lucide:...">`** — Plan 03 22 occurrences.
   - Replace every `<Icon name="lucide:foo">` with `<KovaIcon name="foo">` (primitive from Cluster 11).
   - Grep `<Icon name="lucide:` in Plan 03 — should return 0 after fix.

3. **B-CRIT9 hard-coded `'<from-jwt>'` literal** — Plan 03:1516.
   - `api/brands/delete.ts` uses `userId: '<from-jwt>'` as a string literal placeholder.
   - Fix:
     ```ts
     const { data: { user }, error } = await supabase.auth.getUser()
     if (!user || error) return res.status(401).json({ error: 'unauthorized' })
     // ... use user.id
     ```
   - Add test that an unauthenticated request returns 401 before reaching the delete logic.

4. **B-CRIT14 / CT-024 v-html in `<InfoCard>` bullets** — Plan 03:2313.
   - Current: `<li v-html="bullet">` in `<InfoCard>`.
   - If bullets are statically defined locked copy: switch to text interpolation `<li>{{ bullet }}</li>` and use Vue slots for any markup (bold/em).
   - If bullets allow markup: import DOMPurify and sanitize:
     ```ts
     import DOMPurify from 'dompurify'
     const safeBullet = computed(() => DOMPurify.sanitize(bullet, { ALLOWED_TAGS: ['strong', 'em', 'a'] }))
     ```
     Then `<li v-html="safeBullet">`.
   - Tests: pass a string containing `<script>alert(1)</script>` and verify it's stripped.

5. **B-CRIT6 vi.mock / vi.fn** — Plan 03:1871-1872.
   - Replace with `mock.module(...)` / `mock(() => ...)` from bun:test. CI gate W0-6 catches.

### HIGH (7)

6. **CT-023(a) 6 of 8 addendum tasks not authored** — Plan 03:21-31 + body.
   - Author the missing 6 task bodies:
     - **Task 10.5 `writeAudit()` helper consumption** — wire `writeAudit()` (Cluster 11) into the 4 brand-CRUD Edge Functions. Verify cluster_owner = '03'.
     - **Task 13.5 `api/brands/restore.ts` Edge Function** — calls the `restore_brand` RPC; mirrors the `delete.ts` structure.
     - **Task 26.5 `<RestoreBrandModal>`** — Vue modal component matching `<DeleteBrandModal>` shape, calls `restoreBrand` action.
     - **Task 33.5 `<BrandsArchivedFilter>`** — segmented control for All / Active / Archived.
     - **Task 33.6 `<BrandsSegmentedControl>`** — generic segmented control (if not already in Cluster 11; otherwise reference).
     - **Task 33.7 `<BrandsAccountView>`** — account-page Brands list view.
     - **Task 33.8 `<NotShippedYet>` adapter shim** — generic "this feature isn't shipped yet" placeholder; used by Task 30 router for feature-flagged routes.
   - Each task: 30-60 lines of impl + 1-2 tests.

7. **CT-023(b) `<BrandsArchivedFilter>`, `<RestoreBrandModal>`, `<BrandsAccountView>` imported but not built** — Plan 03:3040, 3043, 3588, 3605.
   - Resolves with CT-023(a) above.

8. **CT-023(c) `restoreBrand` action calls 404** — Plan 03:1830.
   - `restoreBrand` calls `POST /api/brands/restore` — endpoint not built.
   - Resolves with Task 13.5 in CT-023(a).

9. **B-HIGH3 RenameBrandModal e.key not e.code** — Plan 03:2417-2418.
   - `e.key === 'Enter'` and `e.key === 'Escape'` — switch to `e.code === 'Enter'` and `e.code === 'Escape'`.
   - Founder lock #9: `e.code` ALWAYS, never `e.key`. Mac Option key transforms characters and `e.key` is unreliable.

10. **B-HIGH10 pg_indexes REST query** — Plan 03:273-279.
    - `supabase.from('pg_indexes').select()` won't work — pg_catalog schema not exposed via PostgREST.
    - Fix: create an RPC helper `pg_indexes_by_name(p_name text)` that wraps the catalog query:
      ```sql
      CREATE OR REPLACE FUNCTION public.pg_indexes_by_name(p_name text)
      RETURNS TABLE (indexname text, tablename text, indexdef text)
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp, pg_catalog
      AS $$
        SELECT indexname, tablename, indexdef FROM pg_indexes WHERE indexname = p_name;
      $$;
      ```
    - Update Plan 03 test to call the RPC instead of the catalog directly.

11. **B-HIGH11 color backfill 'coral' not idempotent** — Plan 03:352-356.
    - `UPDATE brands SET color = '...' WHERE color = 'coral'` — re-runs assign random colors.
    - Fix: add `color_assigned_at timestamptz` column. Backfill only `WHERE color = 'coral' AND color_assigned_at IS NULL`.

12. **B-HIGH19 RLS test matches error string** — Plan 03:266-279.
    - `if (err.message.match(/idx_brands_slug_per_user|unique/i))` — fragile.
    - Match on SQLSTATE: `if ((err as { code?: string }).code === '23505')`.

### MEDIUM (6)

13. **B-MED12 HTML entities in JS prop string** — Plan 03:2556-2561.
    - `<span class=&quot;opacity-50&quot;>` — HTML entity escapes inside JS prop array. Wrong literal type.
    - Fix: use real double-quotes (escape with `\"` if inside a single-quoted JS string, or use template literal):
      ```ts
      const html = `<span class="opacity-50">...</span>`
      ```

14. **B-MED17 Pinia setup-store actions reassigned in tests** — Plan 03:2364, 2500, 2621.
    - `store.archiveBrand = async () => {...}` reassigns the action. Pinia setup-stores can't intercept this; only the module level can.
    - Fix: use `mock.module()` at module level:
      ```ts
      mock.module('@/stores/brands', () => ({
        useBrandsStore: () => ({
          archiveBrand: mock(async () => ({ ok: true })),
          // ... other store methods
        }),
      }))
      ```

15. **C-MED11 writeAudit() helper has no creation task** — Plan 03 §5.1 + body.
    - Resolves with CT-023(a) Task 10.5 above + Cluster 11's `api/_shared/audit.ts`. Plan 03 just imports + calls.

16. **C-MED12 `<NotShippedYet>` adapter shim** — Plan 03 Task 34.
    - Resolves with CT-023(a) Task 33.8.

17. **C-MED9 PRD §8.7 RPC count off-by-one** — PRD 03 §8.7 vs §5.2.
    - §8.7 says "6 RPCs error-codes documented"; should be 7 after `restore_brand` promotion (B12 reversal).
    - Update §8.7 to 7.

18. **C-MED10 Sort dropdown static markup** — Plan 03 Task 30:3131-3136.
    - No v-model, no state, no localStorage persistence.
    - Add sort state to `useDashboardStore` (or `useBrandsStore` — whichever owns the sort affordance). Wire `<select v-model="sortMode">`. Persist to localStorage via Vueuse `useLocalStorage` (shared with Cluster 02 — coordinate to avoid C-MED8 dual-instance issue).

### LOW (4)

19. **C-LOW03.9 Edge Functions don't consult idempotency_keys** — Plan 03 Tasks 11-14.
    - Wire `verifyIdempotency` from Plan 11 — same pattern as Cluster 01 Edge Functions.

20. **C-LOW03.10 RPC auth.uid() defense not asserted** — Plan 03 Tasks 4-7.
    - Add explicit assertion in Task 8 RLS verification: each DEFINER RPC body MUST start with `IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;` OR a `WHERE user_id = auth.uid()` predicate.
    - Add a test that calls each RPC anonymously and asserts 401/exception.

21. **B-LOW3 Hardcoded 'Jiho Yang' placeholder** — Plan 03:3103.
    - Replace with `auth.profile?.name ?? 'You'` (or `auth.user?.email?.split('@')[0]` if profile.name not yet shipped).

22. **B-LOW6 self-review hygiene** — Plan 03:4086.
    - Self-review says "zero matches outside intentional comment-context" but L3103 contradicts. After B-LOW3 fix, this self-review claim becomes true. Update or remove the self-review note.

---

## Output report (template)

```markdown
## Wave 2 Cluster 03 — Fix Agent Report

**Branch:** fix/qa-w2-cluster-03-brand-management
**Commits:** N

### Findings closed (22 total)
- [x] B-CRIT2 search_path on 8 RPCs — commit <hash>
- [x] B-CRIT3 KovaIcon migration (22 occurrences) — commit <hash>
- [x] B-CRIT9 from-jwt literal → supabase.auth.getUser — commit <hash>
- [x] B-CRIT14 v-html sanitized — commit <hash>
- [x] B-CRIT6 vi.mock → bun:test — commit <hash>
- [x] CT-023(a) 6 missing tasks authored — commit <hash> (or N commits, one per task)
- [x] CT-023(b/c) imports/restore endpoint — resolved
- [x] B-HIGH3 e.key → e.code — commit <hash>
- [x] B-HIGH10 pg_indexes RPC helper — commit <hash>
- [x] B-HIGH11 color backfill idempotent — commit <hash>
- [x] B-HIGH19 SQLSTATE matching — commit <hash>
- [x] B-MED12 HTML entity fix — commit <hash>
- [x] B-MED17 mock.module pattern — commit <hash>
- [x] C-MED11 writeAudit consumption — commit <hash>
- [x] C-MED12 NotShippedYet shim — commit <hash>
- [x] C-MED9 §8.7 count fix — commit <hash>
- [x] C-MED10 sort dropdown state — commit <hash>
- [x] C-LOW03.9 idempotency_keys integration — commit <hash>
- [x] C-LOW03.10 auth.uid() RLS test — commit <hash>
- [x] B-LOW3 'Jiho Yang' placeholder removed — commit <hash>
- [x] B-LOW6 self-review hygiene — commit <hash>

### Migrations shipped
- `supabase/migrations/YYYYMMDDHHMMSS_add_color_assigned_at_brands.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_pg_indexes_by_name.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_restore_brand.sql` (if not already migrated)

### Tests added
- `tests/api/brands/restore-endpoint.test.ts`
- `tests/api/brands/v-html-sanitization.test.ts`
- `tests/db/rls-defense-in-depth.test.ts`
- ...

### Cross-cluster
- audit_log writeAudit consumed (Cluster 11)
- KovaIcon migrated (22 callsites)
- /brand/:brandId routing (W0-3)

### Quality gates
- [x] All checks pass
- [x] CI gates W0-5/6/9 green

### Blockers
None / list.
```

---

## Hard rules

Same as other dispatches: TDD per finding, no founder-lock violations, no edits outside Cluster 03 files + the shared migrations.

**Specific to Cluster 03:** the 8 SECURITY DEFINER RPCs are the biggest risk surface. Verify the W0-5 CI grep passes after every migration edit. If the grep fails, the founder will reject the PR.

---

**End of W2 Cluster 03 dispatch prompt.**
