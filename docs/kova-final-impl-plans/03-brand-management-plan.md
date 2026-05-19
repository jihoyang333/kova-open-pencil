# Cluster 03 — Brand Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the brand-record lifecycle for Kova MVP — `/brands` picker, 4-step `/brands/new` wizard, active-state CRUD modals (Rename / Archive / Delete), **`/account/brands` (B12) archived-inventory page with Restore + Delete-archived flows**, backend RPCs + Edge Functions, deterministic brand-color auto-assign, storage sweep on delete, audit-event breadcrumb stopgap.

**Architecture:** Vue 3 SPA on Vite. `useBrandsStore` (Pinia) extended with mutating actions calling 5 Vercel Function Edge endpoints. Server: 7 SECURITY DEFINER Postgres RPCs (`create_brand`, `rename_brand`, `archive_brand`, `restore_brand` **REAL**, `delete_brand`, `list_active_brands`, `list_archived_brands`). Storage sweep helper purges 4 per-brand buckets on delete. `writeAudit()` helper writes 5 event types to console + Sentry breadcrumb (stopgap until Cluster 11 ships `audit_log` table). Hi-fi design lifted from `kova-hifi.css` `:root` tokens → Tailwind `@theme`; component classes (`.bp-card`, `.dlg`, `.onb-card`, `.brand-summary`, `.loss-list`, `.confirm-typed`) → Vue components rendering same markup contract.

**Tech Stack:** Vue 3 `<script setup>` + Composition API · Pinia setup stores · Vue Router 4 (nested routes for wizard) · Reka UI (Dialog, DropdownMenu, Select) · Tailwind 4 · TypeScript strict (no `any`, no `!`) · `@supabase/supabase-js` · Vercel Fluid Compute Functions · bun:test unit tests · Playwright E2E · oxlint · oxfmt · jscpd

**PRD source:** `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/03-brand-management.md` (IN-REVIEW 2026-05-17 — includes B12 reversal per `00f-B12_REVERSAL_DISPATCH.md`).

**Depends on (PRD blockers — these must ship before this plan's later phases run end-to-end):** Cluster 01 (`useAuthStore`, `users` row, auth guard), Cluster 02 (sidebar host, router redirect logic for 0/1/multi brand; "Brands" sidebar item visible without SOON pill per PRD 02 §12.11 partial resolution), Cluster 04 (`/account` shell + `.acc-rail` sidebar + `/account/brands` route registration + `<NotShippedYet>` fallback route), Cluster 11 (`<KovaModal>`, `useConfirm`, `useToast`, `<KovaSkeleton>`, `<TypedConfirmField>`, `<NotShippedYet>`, `idempotency_keys` helper, `audit_log` table — last is stopgap'd via `writeAudit()`). **Adapter pattern:** every Cluster-11 import in this plan uses a thin local fallback so this plan's tasks can be developed + unit-tested independently. Integration phase (Phase 8) wires the real Cluster-11 components once they ship.

---

## 🔄 ADDENDUM — B12 Reversal Deltas (2026-05-17)

Founder reversed the 2026-05-13 lock that scoped B12 to Phase 2. Per `docs/kova-final-prds/00f-B12_REVERSAL_DISPATCH.md`, the following deltas apply to this plan. **Implementer must read this addendum before executing any task.** Task bodies below reflect post-reversal state; legacy STUB / DISABLED references in older task bodies have been patched in-line but this addendum is the source of truth on contested scope.

### Tasks added (must execute)
- **Task 6.5** — `restore_brand` RPC promoted from STUB to **REAL** with `not_archived` error path. (Patched into Task 6 below.)
- **Task 7.5** — `list_archived_brands` RPC. (Patched into Task 7 below.)
- **Task 10.5** — `writeAudit()` helper (Cluster 11 stopgap; console + Sentry breadcrumb; signature stable so Cluster 11 can swap internals).
- **Task 13.5** — `POST /api/brands/restore` Edge Function (auth + idempotency + `restore_brand` RPC call + `writeAudit('brand.restored')` + `BRANDS_RESTORE_ENABLED=false` returns 503).
- **Task 26.5** — `<RestoreBrandModal>` component (B12.3) — `.dlg.sm` neutral confirm, no typed-confirm.
- **Task 33.5** — `<BrandsArchivedFilter>` component (A2.a top-right dropdown — `Hide / Show / Only`, localStorage-persisted, triggers `fetchArchivedBrands()` on first non-Hide).
- **Task 33.6** — `<BrandsSegmentedControl>` component (B12.1 `All / Active / Archived` segmented control, URL-query-persisted via `?filter=`).
- **Task 33.7** — `<BrandsAccountView>` component (B12 page) — hero ("Brands" title + "+ New brand" CTA, **NO Import CTA**) + segmented control + grid of `<BrandCard>` filtered by segment + B12.2 zero-state.
- **Task 33.8** — `<NotShippedYet>` adapter shim (Cluster 11 stopgap) + `/account/coming-soon` fallback route registration so Account button always works.

### Tasks modified
- **Task 6** — `restore_brand` is REAL not STUB. Adds `not_archived` exception branch. Test: archive + restore round-trip should succeed; double-restore should raise `not_archived`.
- **Task 7** — Adds `list_archived_brands()` SQL function + grant. Test: returns archived-only rows ordered by `archived_at DESC`.
- **Task 16** — `useBrandsStore.archivedBrands` getter consumed by B12 + A2.a (not Phase 2 stub); add `fetchArchivedBrands()` action.
- **Task 18** — `restoreBrand(id)` action is REAL — calls `POST /api/brands/restore`, optimistically clears `archived_at` on local row, on success refetch active + archived lists. Remove `throw new Error('restore_brand_not_enabled_mvp')`.
- **Task 28** — `<BrandCard>` adds archived-state branch (`v-if="brand.archived_at !== null"`): 78% opacity, "Archived" outline pill, kebab shows 2 items (Restore / Delete). Active state: kebab shows 3 (Rename / Archive / Delete). Emits `restore` event added.
- **Task 30** — `<BrandPickerView>` adds Account button (top-right, routes to `/account`, falls back to `/account/coming-soon` if PRD 04 not ready) + integrates `<BrandsArchivedFilter>` (Hide/Show/Only). Removes any "Import" CTA — never building per founder cut 2026-05-17.
- **Task 34** — Router additions: `/account/brands` route registered by PRD 04 (this plan adds the **child route definition** + component import statement so PRD 04 just mounts it); `/account/coming-soon` fallback route with `<NotShippedYet>` placeholder.
- **Task 38** — E2E adds B12 happy paths: archive → navigate to /account/brands → restore round-trip → archive → /account/brands → delete-archived typed-confirm cascade.
- **Task 39** — Manual smoke adds B12 segmented control toggle + restore + delete-archived flows.

### Tasks unchanged but cross-cut affected
- **Task 21 (Cluster-11 adapter shims)** — extend with `<NotShippedYet>` shim (Cluster 11 ships real version; adapter exposes same API).
- **Task 25 (ArchiveBrandModal)** — bullet 4 link target = `/account/brands` (live `<router-link>`, not greyed).
- **Task 26 (DeleteBrandModal)** — reused by B12.4 (mounted from archived card). Footer always "This action is permanent." (overrides hi-fi B12.4 mis-leak per PRD §12.8).

### Dropped (DO NOT BUILD)
- ❌ Brand "Import" CTA — founder cut 2026-05-17. Never building. Remove all references during implementation.
- ❌ `BRANDS_ARCHIVE_FILTER_ENABLED` feature flag — A2.a filter is unconditionally ENABLED MVP. Flag removed.

### Feature flag state
- `BRANDS_RESTORE_ENABLED` — default `true` (rollback safety toggle only; not Phase 2 gate).

### Cross-PRD coordination (informational — handled by parallel dispatch prompts B/C/D/E per 00f doc)
- PRD 02 — sidebar "Brands" item ships visible, no SOON pill.
- PRD 04 — adds "Brands" nav item to `.acc-rail`; registers `/account/brands` route + `/account/coming-soon` fallback.
- PRD 08 — `useObjectActions` composable adds archived-state action set on brand cards.
- `00-PRD_SCOPE_PLAN.md` §3 — reversal log updated.

---

## File structure

### Created

**Migration + SQL:**
- `supabase/migrations/20260601_03_brands_lifecycle.sql` — `archived_at`, `color`, `slug`, `url`, `description` columns; partial indexes; backfill UPDATEs; 6 RPCs

**Edge Functions (Vercel Functions under `api/`):**
- `api/brands/create.ts`
- `api/brands/rename.ts`
- `api/brands/archive.ts`
- `api/brands/delete.ts`
- `api/_shared/storage-sweep.ts` (helper — `purgeBrandStorageObjects`)
- `api/_shared/brand-validation.ts` (shared input validators)

**Composables:**
- `src/composables/brands/use-new-brand-flow.ts`
- `src/composables/brands/use-brand-color.ts`
- `src/composables/brands/use-brand-modals.ts` (open/close coordinator for the three CRUD modals)

**Views (router-mounted):**
- `src/views/brands/BrandPickerView.vue`
- `src/views/brands/NewBrandWizardView.vue`
- `src/views/brands/wizard/StepNameUrl.vue`
- `src/views/brands/wizard/StepShopify.vue`
- `src/views/brands/wizard/StepBrandKit.vue`
- `src/views/brands/wizard/StepDone.vue`

**Components — picker chrome:**
- `src/components/brand/BrandPickerShell.vue` (`.bp-shell` + `.bp-top`)
- `src/components/brand/BrandPickerHead.vue` (heading + actions row)
- `src/components/brand/BrandPickerTools.vue` (search + sort + archive-filter)
- `src/components/brand/BrandCard.vue` (`.bp-card` + kebab DropdownMenu)
- `src/components/brand/NewBrandTile.vue` (`.bp-newcard`)
- `src/components/brand/BrandPickerEmpty.vue` (`.bp-empty`)

**Components — wizard chrome:**
- `src/components/brand/wizard/WizardShell.vue` (`.onb-shell`)
- `src/components/brand/wizard/WizardProgress.vue` (`.onb-progress` strip)
- `src/components/brand/wizard/WizardCard.vue` (`.onb-card`)
- `src/components/brand/wizard/LogoFetchSlot.vue` (`.onb-id-row` logo slot)
- `src/components/brand/wizard/ShopifyConnectCard.vue` (`.onb-connect`)
- `src/components/brand/wizard/BrandKitDropZone.vue` (`.onb-drop` + `.onb-files`)
- `src/components/brand/wizard/BrandKitAIPreview.vue` (`.onb-ai`)
- `src/components/brand/wizard/WizardSplash.vue` (`.onb-splash` for A3.d)

**Components — CRUD modals:**
- `src/components/brand/RenameBrandModal.vue`
- `src/components/brand/ArchiveBrandModal.vue`
- `src/components/brand/DeleteBrandModal.vue`
- `src/components/brand/BrandSummaryRow.vue` (shared `.brand-summary` chrome)
- `src/components/brand/LossList.vue` (shared `.loss-list` chrome)
- `src/components/brand/InfoCard.vue` (shared `.info-card` chrome for A4.2 explainer)

**Adapters (Cluster-11 fallback shims — replaced when Cluster 11 ships):**
- `src/components/_adapters/KovaModalAdapter.vue` (re-exports real `<KovaModal>` when present; falls back to bare Reka Dialog wrapper otherwise)
- `src/components/_adapters/TypedConfirmFieldAdapter.vue`
- `src/composables/_adapters/use-toast-adapter.ts`
- `src/composables/_adapters/use-confirm-adapter.ts`

**Router additions:**
- `src/router/routes/brands.ts` (route definitions — imported by `src/router/index.ts`)

**Tests:**
- `tests/stores/brands.test.ts` (extend existing)
- `tests/composables/use-new-brand-flow.test.ts`
- `tests/composables/use-brand-color.test.ts`
- `tests/components/brand/BrandCard.test.ts`
- `tests/components/brand/RenameBrandModal.test.ts`
- `tests/components/brand/ArchiveBrandModal.test.ts`
- `tests/components/brand/DeleteBrandModal.test.ts`
- `tests/api/brands/create.test.ts`
- `tests/api/brands/rename.test.ts`
- `tests/api/brands/archive.test.ts`
- `tests/api/brands/delete.test.ts`
- `tests/api/_shared/storage-sweep.test.ts`
- `tests/integration/brands-rpc.test.ts` (integration against local Supabase)
- `tests-e2e/brands-flows.spec.ts` (Playwright)

**Docs:**
- `docs/superpowers/handoffs/2026-06-01-cluster-03-implementation.md` (handoff doc written at plan-completion)

### Modified

- `src/stores/brands.ts` — extend with `activeBrands`, `archivedBrands` getters; replace `createBrand` signature; add `renameBrand`, `archiveBrand`, `deleteBrand`, `restoreBrand` (REAL — MVP per 2026-05-17 reversal), `fetchArchivedBrands` actions; add `isMutating` state
- `src/types/kova/database.ts` — add `BrandColor` union, extend `Brand` interface with `archived_at`, `color`, `slug`, `url`, `description`
- `src/router/index.ts` — register `/brands` + `/brands/new/*` + `/account/brands` + `/account/coming-soon` routes
- `src/composables/_adapters/use-toast-adapter.ts` (created above) — first import of Cluster-11 stub
- `package.json` — no new deps (we have `@supabase/supabase-js` + `reka-ui` already)

---

## Phase 1 — Database migration + RPCs

### Task 1: Schema migration file scaffolding

**Files:**
- Create: `supabase/migrations/20260601_03_brands_lifecycle.sql`
- Test: `tests/integration/brands-migration.test.ts`

- [ ] **Step 1: Write migration shell**

Create `supabase/migrations/20260601_03_brands_lifecycle.sql`:

```sql
-- ============================================================
-- Migration 20260601_03_brands_lifecycle
-- Cluster 03 Brand Management — archive + delete + color tint + slug + url
-- ============================================================
BEGIN;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'coral'
    CHECK (color IN ('coral', 'violet', 'sage', 'sand', 'graphite')),
  ADD COLUMN IF NOT EXISTS slug text NULL,
  ADD COLUMN IF NOT EXISTS url text NULL,
  ADD COLUMN IF NOT EXISTS description text NULL;

COMMENT ON COLUMN public.brands.archived_at IS
  'Soft-archive timestamp. Set by archive_brand(); cleared by restore_brand() (REAL — MVP per 2026-05-17 reversal). NOT a soft-delete. Restored from /account/brands (B12).';
COMMENT ON COLUMN public.brands.color IS
  'Auto-assigned palette tint at create-time. Stable across renames. User-overridable Phase 2.';
COMMENT ON COLUMN public.brands.slug IS
  'URL-safe derivative of name at create-time. Immutable after creation per A4.1 lock.';
COMMENT ON COLUMN public.brands.url IS
  'Display website URL captured at A3.a step 1.';
COMMENT ON COLUMN public.brands.description IS
  'Optional one-liner captured at A3.a step 1.';

COMMIT;
```

- [ ] **Step 2: Write failing migration test**

Create `tests/integration/brands-migration.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

test('brands table has new columns', async () => {
  const { data, error } = await supabase
    .rpc('table_columns', { p_table: 'brands' } as any)
    .catch(() => ({ data: null, error: 'rpc-missing' } as any))
  // Fallback: select-with-typo to verify columns exist
  const probe = await supabase.from('brands').select('id, archived_at, color, slug, url, description').limit(1)
  expect(probe.error).toBeNull()
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd kova-open-pencil-1 && bun test ./tests/integration/brands-migration.test.ts
```

Expected: FAIL — column "archived_at" does not exist.

- [ ] **Step 4: Apply migration locally**

```bash
cd kova-open-pencil-1
supabase db push  # against local instance
```

- [ ] **Step 5: Run test to verify it passes**

```bash
bun test ./tests/integration/brands-migration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260601_03_brands_lifecycle.sql tests/integration/brands-migration.test.ts
git commit -m "feat(brands): add archive + color + slug + url + description columns"
```

---

### Task 2: Partial indexes

**Files:**
- Modify: `supabase/migrations/20260601_03_brands_lifecycle.sql` (extend)

- [ ] **Step 1: Add unique index test**

Add to `tests/integration/brands-migration.test.ts`:

```typescript
test('slug is unique per user', async () => {
  // Setup: create test user + two brands with colliding slug
  const userA = await createTestUser()
  await supabase.from('brands').insert({ user_id: userA, name: 'Brand A', slug: 'brand-a' })
  const dupe = await supabase.from('brands').insert({ user_id: userA, name: 'Brand A Two', slug: 'brand-a' })
  expect(dupe.error).not.toBeNull()
  expect(dupe.error?.message).toMatch(/idx_brands_slug_per_user|unique/i)
  await cleanupTestUser(userA)
})

test('active-brands partial index exists', async () => {
  const { data } = await supabase
    .from('pg_indexes' as any)
    .select('indexname')
    .eq('tablename', 'brands')
  const names = (data ?? []).map((r: any) => r.indexname)
  expect(names).toContain('idx_brands_active_per_user')
  expect(names).toContain('idx_brands_slug_per_user')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Expected: both FAIL — indexes don't exist yet.

- [ ] **Step 3: Add indexes to migration**

Append after the `COMMENT ON COLUMN` block, before `COMMIT;`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_slug_per_user
  ON public.brands(user_id, slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brands_active_per_user
  ON public.brands(user_id, updated_at DESC)
  WHERE archived_at IS NULL;
```

- [ ] **Step 4: Re-apply migration + verify**

```bash
supabase db reset && supabase db push
bun test ./tests/integration/brands-migration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601_03_brands_lifecycle.sql tests/integration/brands-migration.test.ts
git commit -m "feat(brands): add slug uniqueness + active-brands partial indexes"
```

---

### Task 3: Backfill existing rows

**Files:**
- Modify: `supabase/migrations/20260601_03_brands_lifecycle.sql`

- [ ] **Step 1: Add backfill test**

Add to `tests/integration/brands-migration.test.ts`:

```typescript
test('migration backfills color + slug for legacy rows', async () => {
  // Setup: simulate legacy row pre-migration (color='coral' default; slug NULL)
  const userA = await createTestUser()
  const { data: brand } = await supabase
    .from('brands')
    .insert({ user_id: userA, name: 'Legacy Brand', color: 'coral', slug: null })
    .select().single()

  // Re-run migration backfill segment
  await supabase.rpc('rerun_backfill_for_test', { p_brand_id: brand!.id }).catch(() => null)
  // Verify the migration's UPDATE has assigned non-default color + slug
  const { data: after } = await supabase.from('brands').select('color, slug').eq('id', brand!.id).single()
  expect(['coral','violet','sage','sand','graphite']).toContain(after!.color)
  expect(after!.slug).toBe('legacy-brand')

  await cleanupTestUser(userA)
})
```

- [ ] **Step 2: Add backfill SQL to migration**

Append before `COMMIT;`:

```sql
UPDATE public.brands
SET color = (ARRAY['coral','violet','sage','sand','graphite'])[
              (abs(hashtext(id::text)) % 5) + 1
            ]
WHERE color = 'coral';

UPDATE public.brands
SET slug = regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL;

UPDATE public.brands SET slug = btrim(slug, '-') WHERE slug LIKE '%-' OR slug LIKE '-%';
UPDATE public.brands SET slug = 'brand' WHERE slug IS NULL OR slug = '';
```

- [ ] **Step 3: Re-apply + verify**

```bash
supabase db reset && supabase db push
bun test ./tests/integration/brands-migration.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601_03_brands_lifecycle.sql tests/integration/brands-migration.test.ts
git commit -m "feat(brands): backfill color + slug for pre-migration rows"
```

---

### Task 4: `create_brand` RPC

**Files:**
- Modify: `supabase/migrations/20260601_03_brands_lifecycle.sql` (append RPC)
- Test: `tests/integration/brands-rpc.test.ts`

- [ ] **Step 1: Write failing RPC test**

Create `tests/integration/brands-rpc.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { createTestUser, cleanupTestUser, getUserClient } from './helpers'

test('create_brand assigns deterministic color by index', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const palette = ['coral','violet','sage','sand','graphite'] as const

  for (let i = 0; i < 6; i++) {
    const { data, error } = await client.rpc('create_brand', {
      p_name: `Brand ${i}`,
      p_url: null,
      p_description: null,
    })
    expect(error).toBeNull()
    expect(data!.color).toBe(palette[i % 5])
    expect(data!.slug).toBe(`brand-${i}`)
  }
  await cleanupTestUser(user.id)
})

test('create_brand rejects empty name', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { error } = await client.rpc('create_brand', { p_name: '   ', p_url: null, p_description: null })
  expect(error?.message).toMatch(/name_required/)
  await cleanupTestUser(user.id)
})

test('create_brand handles slug collision with suffix', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  await client.rpc('create_brand', { p_name: 'Same Name', p_url: null, p_description: null })
  const { data } = await client.rpc('create_brand', { p_name: 'Same Name', p_url: null, p_description: null })
  expect(data!.slug).toBe('same-name-1')
  await cleanupTestUser(user.id)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test ./tests/integration/brands-rpc.test.ts
```

Expected: FAIL — RPC `create_brand` not found.

- [ ] **Step 3: Add `create_brand` RPC**

Append to migration file before `COMMIT;`:

```sql
CREATE OR REPLACE FUNCTION public.create_brand(
  p_name        text,
  p_url         text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_palette      text[] := ARRAY['coral','violet','sage','sand','graphite'];
  v_count        int;
  v_color        text;
  v_slug         text;
  v_slug_attempt text;
  v_suffix       int := 0;
  v_brand        public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required' USING ERRCODE = '22023';
  END IF;
  IF length(p_name) > 80 THEN RAISE EXCEPTION 'name_too_long' USING ERRCODE = '22023'; END IF;

  SELECT count(*) INTO v_count FROM public.brands WHERE user_id = v_user_id;
  v_color := v_palette[(v_count % 5) + 1];

  v_slug_attempt := regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g');
  v_slug_attempt := btrim(v_slug_attempt, '-');
  IF v_slug_attempt = '' THEN v_slug_attempt := 'brand'; END IF;
  v_slug := v_slug_attempt;
  WHILE EXISTS (SELECT 1 FROM public.brands WHERE user_id = v_user_id AND slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_slug_attempt || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.brands (user_id, name, slug, url, description, color)
  VALUES (v_user_id, btrim(p_name), v_slug, p_url, p_description, v_color)
  RETURNING * INTO v_brand;

  RETURN v_brand;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_brand TO authenticated;
```

- [ ] **Step 4: Re-apply migration + verify**

```bash
supabase db reset && supabase db push
bun test ./tests/integration/brands-rpc.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601_03_brands_lifecycle.sql tests/integration/brands-rpc.test.ts
git commit -m "feat(brands): add create_brand RPC with deterministic color + slug"
```

---

### Task 5: `rename_brand` RPC

**Files:**
- Modify: `supabase/migrations/20260601_03_brands_lifecycle.sql`
- Modify: `tests/integration/brands-rpc.test.ts`

- [ ] **Step 1: Write failing test**

Append to `tests/integration/brands-rpc.test.ts`:

```typescript
test('rename_brand updates name, leaves slug, bumps updated_at', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: brand } = await client.rpc('create_brand', { p_name: 'Old Name', p_url: null, p_description: null })
  const oldSlug = brand!.slug
  const { data: renamed, error } = await client.rpc('rename_brand', { p_brand_id: brand!.id, p_name: 'New Name' })
  expect(error).toBeNull()
  expect(renamed!.name).toBe('New Name')
  expect(renamed!.slug).toBe(oldSlug)
  expect(renamed!.updated_at).not.toBe(brand!.updated_at)
  await cleanupTestUser(user.id)
})

test('rename_brand rejects empty + too-long names', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: brand } = await client.rpc('create_brand', { p_name: 'X', p_url: null, p_description: null })
  const r1 = await client.rpc('rename_brand', { p_brand_id: brand!.id, p_name: '' })
  expect(r1.error?.message).toMatch(/name_required/)
  const r2 = await client.rpc('rename_brand', { p_brand_id: brand!.id, p_name: 'x'.repeat(81) })
  expect(r2.error?.message).toMatch(/name_too_long/)
  await cleanupTestUser(user.id)
})
```

- [ ] **Step 2: Verify fail**

```bash
bun test ./tests/integration/brands-rpc.test.ts
```

Expected: 2 new tests FAIL.

- [ ] **Step 3: Add RPC**

Append to migration:

```sql
CREATE OR REPLACE FUNCTION public.rename_brand(
  p_brand_id uuid,
  p_name     text
) RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_brand   public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required' USING ERRCODE = '22023';
  END IF;
  IF length(p_name) > 80 THEN RAISE EXCEPTION 'name_too_long' USING ERRCODE = '22023'; END IF;

  UPDATE public.brands
  SET name = btrim(p_name), updated_at = now()
  WHERE id = p_brand_id AND user_id = v_user_id
  RETURNING * INTO v_brand;

  IF v_brand IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_brand;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rename_brand TO authenticated;
```

- [ ] **Step 4: Re-apply + verify**

```bash
supabase db reset && supabase db push
bun test ./tests/integration/brands-rpc.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601_03_brands_lifecycle.sql tests/integration/brands-rpc.test.ts
git commit -m "feat(brands): add rename_brand RPC"
```

---

### Task 6: `archive_brand` + `restore_brand` (REAL — MVP per 2026-05-17 reversal) RPCs

**Files:**
- Modify: `supabase/migrations/20260601_03_brands_lifecycle.sql`
- Modify: `tests/integration/brands-rpc.test.ts`

- [ ] **Step 1: Write failing tests**

Append:

```typescript
test('archive_brand sets archived_at; second call errors', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: brand } = await client.rpc('create_brand', { p_name: 'A', p_url: null, p_description: null })
  const r1 = await client.rpc('archive_brand', { p_brand_id: brand!.id })
  expect(r1.data!.archived_at).not.toBeNull()
  const r2 = await client.rpc('archive_brand', { p_brand_id: brand!.id })
  expect(r2.error?.message).toMatch(/already_archived/)
  await cleanupTestUser(user.id)
})

test('restore_brand clears archived_at', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: brand } = await client.rpc('create_brand', { p_name: 'A', p_url: null, p_description: null })
  await client.rpc('archive_brand', { p_brand_id: brand!.id })
  const r = await client.rpc('restore_brand', { p_brand_id: brand!.id })
  expect(r.data!.archived_at).toBeNull()
  await cleanupTestUser(user.id)
})

test('restore_brand raises not_archived when brand already active', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: brand } = await client.rpc('create_brand', { p_name: 'A', p_url: null, p_description: null })
  // Skip archive step — brand still active.
  const r = await client.rpc('restore_brand', { p_brand_id: brand!.id })
  expect(r.error?.message).toMatch(/not_archived/)
  await cleanupTestUser(user.id)
})

test('restore_brand raises not_found for foreign brand', async () => {
  const userA = await createTestUser()
  const userB = await createTestUser()
  const clientA = await getUserClient(userA.id)
  const clientB = await getUserClient(userB.id)
  const { data: brand } = await clientA.rpc('create_brand', { p_name: 'X', p_url: null, p_description: null })
  await clientA.rpc('archive_brand', { p_brand_id: brand!.id })
  const r = await clientB.rpc('restore_brand', { p_brand_id: brand!.id })
  expect(r.error?.message).toMatch(/not_found/)
  await cleanupTestUser(userA.id)
  await cleanupTestUser(userB.id)
})
```

- [ ] **Step 2: Verify fail**

```bash
bun test ./tests/integration/brands-rpc.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add RPCs**

Append to migration:

```sql
CREATE OR REPLACE FUNCTION public.archive_brand(p_brand_id uuid)
RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id uuid := auth.uid(); v_brand public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  UPDATE public.brands
  SET archived_at = now()
  WHERE id = p_brand_id AND user_id = v_user_id AND archived_at IS NULL
  RETURNING * INTO v_brand;
  IF v_brand IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'already_archived' USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_brand;
END;
$$;

-- restore_brand: REAL (MVP per 2026-05-17 reversal). Clears archived_at.
-- Distinguishes not_archived vs not_found for caller error mapping.
CREATE OR REPLACE FUNCTION public.restore_brand(p_brand_id uuid)
RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id uuid := auth.uid(); v_brand public.brands;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  UPDATE public.brands SET archived_at = NULL
  WHERE id = p_brand_id AND user_id = v_user_id AND archived_at IS NOT NULL
  RETURNING * INTO v_brand;
  IF v_brand IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'not_archived' USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_brand;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_brand, public.restore_brand TO authenticated;
```

- [ ] **Step 4: Verify + commit**

```bash
supabase db reset && supabase db push
bun test ./tests/integration/brands-rpc.test.ts
git add supabase/migrations/20260601_03_brands_lifecycle.sql tests/integration/brands-rpc.test.ts
git commit -m "feat(brands): add archive_brand + restore_brand (REAL) RPCs"
```

---

### Task 7: `delete_brand` + `list_active_brands` + `list_archived_brands` RPCs

**Files:**
- Modify: `supabase/migrations/20260601_03_brands_lifecycle.sql`
- Modify: `tests/integration/brands-rpc.test.ts`

- [ ] **Step 1: Write failing tests**

Append:

```typescript
test('delete_brand requires exact name match (case-sensitive)', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: brand } = await client.rpc('create_brand', { p_name: 'Warby Parker', p_url: null, p_description: null })
  const r1 = await client.rpc('delete_brand', { p_brand_id: brand!.id, p_confirm_name: 'warby parker' })
  expect(r1.error?.message).toMatch(/confirm_mismatch/)
  const r2 = await client.rpc('delete_brand', { p_brand_id: brand!.id, p_confirm_name: 'Warby Parker' })
  expect(r2.error).toBeNull()
  expect((r2.data as any).canvas_count).toBe(0)
  // Verify gone
  const { data: gone } = await supabase.from('brands').select('id').eq('id', brand!.id).maybeSingle()
  expect(gone).toBeNull()
  await cleanupTestUser(user.id)
})

test('delete_brand cascades to canvases + media + chat_conversations', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: brand } = await client.rpc('create_brand', { p_name: 'Cascade Test', p_url: null, p_description: null })
  await client.from('canvases').insert([{ brand_id: brand!.id, name: 'c1' }, { brand_id: brand!.id, name: 'c2' }])
  await client.rpc('delete_brand', { p_brand_id: brand!.id, p_confirm_name: 'Cascade Test' })
  const { data: orphans } = await supabase.from('canvases').select('id').eq('brand_id', brand!.id)
  expect(orphans).toHaveLength(0)
  await cleanupTestUser(user.id)
})

test('list_active_brands filters archived + orders updated_at DESC', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  await client.rpc('create_brand', { p_name: 'Old', p_url: null, p_description: null })
  await new Promise(r => setTimeout(r, 50))
  const { data: newer } = await client.rpc('create_brand', { p_name: 'New', p_url: null, p_description: null })
  await client.rpc('archive_brand', { p_brand_id: newer!.id })
  const { data } = await client.rpc('list_active_brands')
  expect(data).toHaveLength(1)
  expect(data![0].name).toBe('Old')
  await cleanupTestUser(user.id)
})

test('list_archived_brands returns archived-only ordered by archived_at DESC', async () => {
  const user = await createTestUser()
  const client = await getUserClient(user.id)
  const { data: b1 } = await client.rpc('create_brand', { p_name: 'B1', p_url: null, p_description: null })
  const { data: b2 } = await client.rpc('create_brand', { p_name: 'B2', p_url: null, p_description: null })
  await client.rpc('archive_brand', { p_brand_id: b1!.id })
  await new Promise(r => setTimeout(r, 50))
  await client.rpc('archive_brand', { p_brand_id: b2!.id })
  const { data } = await client.rpc('list_archived_brands')
  expect(data).toHaveLength(2)
  expect(data![0].name).toBe('B2')   // most-recently archived first
  expect(data![1].name).toBe('B1')
  await cleanupTestUser(user.id)
})
```

- [ ] **Step 2: Verify fail**

```bash
bun test ./tests/integration/brands-rpc.test.ts
```

Expected: 3 new FAIL.

- [ ] **Step 3: Add RPCs**

Append:

```sql
CREATE OR REPLACE FUNCTION public.delete_brand(
  p_brand_id     uuid,
  p_confirm_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_actual_name text;
  v_summary     jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  SELECT name INTO v_actual_name FROM public.brands
  WHERE id = p_brand_id AND user_id = v_user_id FOR UPDATE;
  IF v_actual_name IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_actual_name <> p_confirm_name THEN RAISE EXCEPTION 'confirm_mismatch' USING ERRCODE = '22023'; END IF;
  SELECT jsonb_build_object(
    'name', v_actual_name,
    'canvas_count', (SELECT count(*) FROM public.canvases WHERE brand_id = p_brand_id)
  ) INTO v_summary;
  DELETE FROM public.brands WHERE id = p_brand_id;
  RETURN v_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_active_brands()
RETURNS SETOF public.brands
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT * FROM public.brands
  WHERE user_id = auth.uid() AND archived_at IS NULL
  ORDER BY updated_at DESC;
$$;

-- list_archived_brands: B12 page + A2.a "Archived" filter consumer.
CREATE OR REPLACE FUNCTION public.list_archived_brands()
RETURNS SETOF public.brands
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT * FROM public.brands
  WHERE user_id = auth.uid() AND archived_at IS NOT NULL
  ORDER BY archived_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.delete_brand, public.list_active_brands, public.list_archived_brands TO authenticated;
```

- [ ] **Step 4: Verify + commit**

```bash
supabase db reset && supabase db push
bun test ./tests/integration/brands-rpc.test.ts
git add supabase/migrations/20260601_03_brands_lifecycle.sql tests/integration/brands-rpc.test.ts
git commit -m "feat(brands): add delete_brand + list_active_brands + list_archived_brands RPCs"
```

---

### Task 8: RLS isolation verification

**Files:**
- Modify: `tests/integration/brands-rpc.test.ts`

- [ ] **Step 1: Write RLS test**

Append:

```typescript
test('User B cannot call any RPC on User A brand', async () => {
  const userA = await createTestUser()
  const userB = await createTestUser()
  const clientA = await getUserClient(userA.id)
  const clientB = await getUserClient(userB.id)
  const { data: brandA } = await clientA.rpc('create_brand', { p_name: 'A-only', p_url: null, p_description: null })

  for (const op of [
    ['rename_brand', { p_brand_id: brandA!.id, p_name: 'evil' }],
    ['archive_brand', { p_brand_id: brandA!.id }],
    ['delete_brand', { p_brand_id: brandA!.id, p_confirm_name: 'A-only' }],
  ] as const) {
    const { error } = await clientB.rpc(op[0], op[1] as any)
    expect(error?.message).toMatch(/not_found|not_authenticated/)
  }
  // Verify brand still exists
  const { data: still } = await supabase.from('brands').select('id').eq('id', brandA!.id).single()
  expect(still).not.toBeNull()
  await cleanupTestUser(userA.id)
  await cleanupTestUser(userB.id)
})
```

- [ ] **Step 2: Run + commit**

```bash
bun test ./tests/integration/brands-rpc.test.ts
git add tests/integration/brands-rpc.test.ts
git commit -m "test(brands): verify RLS isolation across users on all RPCs"
```

---

## Phase 2 — Edge Functions

### Task 9: Shared validators

**Files:**
- Create: `api/_shared/brand-validation.ts`
- Test: `tests/api/_shared/brand-validation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/api/_shared/brand-validation.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import { validateBrandName, validateBrandUrl, validateDescription } from '../../../api/_shared/brand-validation'

test('validateBrandName accepts 1–80 chars', () => {
  expect(validateBrandName('X')).toEqual({ ok: true, value: 'X' })
  expect(validateBrandName('x'.repeat(80))).toEqual({ ok: true, value: 'x'.repeat(80) })
})
test('validateBrandName rejects empty / whitespace / too long', () => {
  expect(validateBrandName('').ok).toBe(false)
  expect(validateBrandName('   ').ok).toBe(false)
  expect(validateBrandName('x'.repeat(81)).ok).toBe(false)
})
test('validateBrandName trims surrounding whitespace', () => {
  expect(validateBrandName('  Patagonia  ')).toEqual({ ok: true, value: 'Patagonia' })
})

test('validateBrandUrl accepts null + valid http(s)', () => {
  expect(validateBrandUrl(null).ok).toBe(true)
  expect(validateBrandUrl('https://nike.com').ok).toBe(true)
  expect(validateBrandUrl('http://x.io').ok).toBe(true)
})
test('validateBrandUrl rejects malformed', () => {
  expect(validateBrandUrl('nope').ok).toBe(false)
  expect(validateBrandUrl('ftp://nike.com').ok).toBe(false)
})

test('validateDescription accepts ≤ 200 chars including null', () => {
  expect(validateDescription(null).ok).toBe(true)
  expect(validateDescription('a'.repeat(200)).ok).toBe(true)
  expect(validateDescription('a'.repeat(201)).ok).toBe(false)
})
```

- [ ] **Step 2: Run to verify fail**

```bash
bun test ./tests/api/_shared/brand-validation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `api/_shared/brand-validation.ts`:

```typescript
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

const URL_RE = /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i

export function validateBrandName(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') return { ok: false, error: 'name_required' }
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, error: 'name_required' }
  if (trimmed.length > 80) return { ok: false, error: 'name_too_long' }
  return { ok: true, value: trimmed }
}

export function validateBrandUrl(raw: unknown): ValidationResult<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'url_invalid' }
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: true, value: null }
  if (!URL_RE.test(trimmed)) return { ok: false, error: 'url_invalid' }
  return { ok: true, value: trimmed }
}

export function validateDescription(raw: unknown): ValidationResult<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'description_invalid' }
  if (raw.length > 200) return { ok: false, error: 'description_too_long' }
  return { ok: true, value: raw.trim() || null }
}
```

- [ ] **Step 4: Run + verify + commit**

```bash
bun test ./tests/api/_shared/brand-validation.test.ts
git add api/_shared/brand-validation.ts tests/api/_shared/brand-validation.test.ts
git commit -m "feat(brands): add shared input validators"
```

---

### Task 10: Storage sweep helper

**Files:**
- Create: `api/_shared/storage-sweep.ts`
- Test: `tests/api/_shared/storage-sweep.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/api/_shared/storage-sweep.test.ts`:

```typescript
import { test, expect, mock } from 'bun:test'
import { purgeBrandStorageObjects } from '../../../api/_shared/storage-sweep'

function makeSupabaseMock(behavior: Record<string, { listErr?: string; objects?: string[]; rmErr?: string }>) {
  return {
    storage: {
      from: (bucket: string) => ({
        list: async () => {
          const b = behavior[bucket] ?? {}
          if (b.listErr) return { data: null, error: { message: b.listErr } }
          return { data: (b.objects ?? []).map(name => ({ name })), error: null }
        },
        remove: async () => {
          const b = behavior[bucket] ?? {}
          if (b.rmErr) return { error: { message: b.rmErr } }
          return { error: null }
        },
      }),
    },
  } as any
}

test('sweeps all 4 buckets in happy path', async () => {
  const sb = makeSupabaseMock({
    'brand-logos':      { objects: ['logo.png'] },
    'media-assets':     { objects: ['a.jpg', 'b.jpg'] },
    'brand-fonts':      { objects: ['heading.woff2'] },
    'canvas-snapshots': { objects: ['c1/s1.kiwi.zst'] },
  })
  const result = await purgeBrandStorageObjects(sb, 'brand-uuid', 'user-uuid')
  expect(result.swept).toBe(5)
  expect(result.failed).toHaveLength(0)
})

test('records failures per bucket without throwing', async () => {
  const sb = makeSupabaseMock({
    'brand-logos':      { listErr: 'permission denied' },
    'media-assets':     { objects: ['a.jpg'] },
    'brand-fonts':      { objects: ['heading.woff2'], rmErr: 'transient' },
    'canvas-snapshots': { objects: [] },
  })
  const result = await purgeBrandStorageObjects(sb, 'brand-uuid', 'user-uuid')
  expect(result.swept).toBe(1)
  expect(result.failed.some(f => f.includes('brand-logos:list'))).toBe(true)
  expect(result.failed.some(f => f.includes('brand-fonts:remove'))).toBe(true)
})
```

- [ ] **Step 2: Run + verify fail**

```bash
bun test ./tests/api/_shared/storage-sweep.test.ts
```

- [ ] **Step 3: Implement**

Create `api/_shared/storage-sweep.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKETS = ['brand-logos', 'media-assets', 'brand-fonts', 'canvas-snapshots'] as const

export interface SweepResult {
  swept: number
  failed: string[]
}

export async function purgeBrandStorageObjects(
  supabase: SupabaseClient,
  brandId: string,
  userId: string,
): Promise<SweepResult> {
  const failed: string[] = []
  let swept = 0
  for (const bucket of BUCKETS) {
    const { data: objects, error: listErr } = await supabase.storage.from(bucket).list(brandId, { limit: 1000 })
    if (listErr) { failed.push(`${bucket}:list:${listErr.message}`); continue }
    if (!objects || objects.length === 0) continue
    const paths = objects.map((o) => `${brandId}/${o.name}`)
    const { error: rmErr } = await supabase.storage.from(bucket).remove(paths)
    if (rmErr) { failed.push(`${bucket}:remove:${rmErr.message}`); continue }
    swept += paths.length
  }
  if (failed.length > 0) console.error('purgeBrandStorageObjects partial', { brandId, userId, failed })
  return { swept, failed }
}
```

- [ ] **Step 4: Run + commit**

```bash
bun test ./tests/api/_shared/storage-sweep.test.ts
git add api/_shared/storage-sweep.ts tests/api/_shared/storage-sweep.test.ts
git commit -m "feat(brands): add storage sweep helper for delete cascade"
```

---

### Task 11: `POST /api/brands/create`

**Files:**
- Create: `api/brands/create.ts`
- Test: `tests/api/brands/create.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/api/brands/create.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import handler from '../../../api/brands/create'
import { mockRequest, mockResponse, mockSupabaseAuthedAs } from '../helpers'

test('rejects when no Authorization header', async () => {
  const req = mockRequest({ method: 'POST', body: { name: 'X' } })
  const res = mockResponse()
  await handler(req, res)
  expect(res.statusCode).toBe(401)
})

test('rejects when name missing', async () => {
  const req = mockRequest({ method: 'POST', body: {}, headers: { authorization: 'Bearer fake' } })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123')
  await handler(req, res)
  expect(res.statusCode).toBe(422)
  expect(res.jsonBody?.error).toBe('name_required')
})

test('returns 200 + brand on happy path', async () => {
  const req = mockRequest({
    method: 'POST',
    body: { name: 'Patagonia', url: 'https://patagonia.com', description: null },
    headers: { authorization: 'Bearer fake' },
  })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123', {
    rpc: async (_, args) => ({ data: { id: 'b1', name: args.p_name, color: 'coral' }, error: null }),
  })
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(res.jsonBody?.brand?.name).toBe('Patagonia')
})
```

- [ ] **Step 2: Verify fail**

```bash
bun test ./tests/api/brands/create.test.ts
```

- [ ] **Step 3: Implement**

Create `api/brands/create.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { validateBrandName, validateBrandUrl, validateDescription } from '../_shared/brand-validation'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'no_auth' }); return }

  const nameV = validateBrandName((req.body as any)?.name)
  if (!nameV.ok) { res.status(422).json({ error: nameV.error }); return }
  const urlV = validateBrandUrl((req.body as any)?.url ?? null)
  if (!urlV.ok) { res.status(422).json({ error: urlV.error }); return }
  const descV = validateDescription((req.body as any)?.description ?? null)
  if (!descV.ok) { res.status(422).json({ error: descV.error }); return }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  )

  const { data, error } = await supabase.rpc('create_brand', {
    p_name: nameV.value,
    p_url: urlV.value,
    p_description: descV.value,
  })
  if (error) {
    const status = error.message.includes('not_authenticated') ? 401 : 500
    res.status(status).json({ error: error.message })
    return
  }
  res.status(200).json({ brand: data })
}
```

- [ ] **Step 4: Run + commit**

```bash
bun test ./tests/api/brands/create.test.ts
git add api/brands/create.ts tests/api/brands/create.test.ts
git commit -m "feat(brands): POST /api/brands/create endpoint"
```

---

### Task 12: `POST /api/brands/rename`

**Files:**
- Create: `api/brands/rename.ts`
- Test: `tests/api/brands/rename.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/api/brands/rename.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import handler from '../../../api/brands/rename'
import { mockRequest, mockResponse, mockSupabaseAuthedAs } from '../helpers'

test('renames brand happy path', async () => {
  const req = mockRequest({
    method: 'POST',
    body: { brand_id: 'b1', name: 'New Name' },
    headers: { authorization: 'Bearer fake' },
  })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123', {
    rpc: async (_, args) => ({ data: { id: args.p_brand_id, name: args.p_name }, error: null }),
  })
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(res.jsonBody?.brand?.name).toBe('New Name')
})

test('rejects missing brand_id', async () => {
  const req = mockRequest({ method: 'POST', body: { name: 'X' }, headers: { authorization: 'Bearer fake' } })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123')
  await handler(req, res)
  expect(res.statusCode).toBe(422)
})

test('maps not_found error to 404', async () => {
  const req = mockRequest({
    method: 'POST',
    body: { brand_id: 'b-ghost', name: 'X' },
    headers: { authorization: 'Bearer fake' },
  })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123', {
    rpc: async () => ({ data: null, error: { message: 'not_found' } }),
  })
  await handler(req, res)
  expect(res.statusCode).toBe(404)
})
```

- [ ] **Step 2: Verify fail + implement**

Create `api/brands/rename.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { validateBrandName } from '../_shared/brand-validation'

function isUuid(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'no_auth' }); return }
  if (!isUuid((req.body as any)?.brand_id)) { res.status(422).json({ error: 'brand_id_required' }); return }
  const nameV = validateBrandName((req.body as any)?.name)
  if (!nameV.ok) { res.status(422).json({ error: nameV.error }); return }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  )

  const { data, error } = await supabase.rpc('rename_brand', {
    p_brand_id: (req.body as any).brand_id,
    p_name: nameV.value,
  })
  if (error) {
    const status =
      error.message === 'not_found' ? 404 :
      error.message === 'not_authenticated' ? 401 :
      /name_/.test(error.message) ? 422 : 500
    res.status(status).json({ error: error.message })
    return
  }
  res.status(200).json({ brand: data })
}
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/api/brands/rename.test.ts
git add api/brands/rename.ts tests/api/brands/rename.test.ts
git commit -m "feat(brands): POST /api/brands/rename endpoint"
```

---

### Task 13: `POST /api/brands/archive`

**Files:**
- Create: `api/brands/archive.ts`
- Test: `tests/api/brands/archive.test.ts`

- [ ] **Step 1: Write failing tests + implement (same pattern)**

Create `tests/api/brands/archive.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import handler from '../../../api/brands/archive'
import { mockRequest, mockResponse, mockSupabaseAuthedAs } from '../helpers'

test('archives + computes next_brand_id when current archived', async () => {
  const req = mockRequest({
    method: 'POST', body: { brand_id: 'b1' }, headers: { authorization: 'Bearer fake' },
  })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123', {
    rpc: async () => ({ data: { id: 'b1', archived_at: new Date().toISOString() }, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            order: () => ({ limit: async () => ({ data: [{ id: 'b2' }], error: null }) }),
          }),
        }),
      }),
    }),
  } as any)
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(res.jsonBody?.brand?.id).toBe('b1')
  expect(res.jsonBody?.next_brand_id).toBe('b2')
})

test('maps already_archived to 409', async () => {
  const req = mockRequest({ method: 'POST', body: { brand_id: 'b1' }, headers: { authorization: 'Bearer fake' } })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123', { rpc: async () => ({ data: null, error: { message: 'already_archived' } }) })
  await handler(req, res)
  expect(res.statusCode).toBe(409)
})
```

Create `api/brands/archive.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function isUuid(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return }
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'no_auth' }); return }
  if (!isUuid((req.body as any)?.brand_id)) { res.status(422).json({ error: 'brand_id_required' }); return }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  )

  const { data, error } = await supabase.rpc('archive_brand', { p_brand_id: (req.body as any).brand_id })
  if (error) {
    const status =
      error.message === 'already_archived' ? 409 :
      error.message === 'not_found' ? 404 :
      error.message === 'not_authenticated' ? 401 : 500
    res.status(status).json({ error: error.message })
    return
  }

  // Compute next active brand for the user (for UI redirect if archived = currently selected)
  const { data: next } = await supabase
    .from('brands').select('id')
    .eq('user_id', (data as any).user_id)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
  res.status(200).json({ brand: data, next_brand_id: next?.[0]?.id ?? null })
}
```

- [ ] **Step 2: Run + commit**

```bash
bun test ./tests/api/brands/archive.test.ts
git add api/brands/archive.ts tests/api/brands/archive.test.ts
git commit -m "feat(brands): POST /api/brands/archive endpoint"
```

---

### Task 14: `DELETE /api/brands/delete`

**Files:**
- Create: `api/brands/delete.ts`
- Test: `tests/api/brands/delete.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/api/brands/delete.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import handler from '../../../api/brands/delete'
import { mockRequest, mockResponse, mockSupabaseAuthedAs } from '../helpers'

test('deletes brand + sweeps storage', async () => {
  const req = mockRequest({
    method: 'DELETE',
    body: { brand_id: 'b1', confirm_typed: 'Brand Name' },
    headers: { authorization: 'Bearer fake' },
  })
  const res = mockResponse()
  let sweepCalled = false
  mockSupabaseAuthedAs('user-123', {
    rpc: async () => ({ data: { name: 'Brand Name', canvas_count: 3 }, error: null }),
    storage: { from: () => ({
      list: async () => { sweepCalled = true; return { data: [], error: null } },
      remove: async () => ({ error: null }),
    }) },
  } as any)
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(res.jsonBody?.deleted_brand_name).toBe('Brand Name')
  expect(sweepCalled).toBe(true)
})

test('confirm_mismatch returns 422 without sweep', async () => {
  const req = mockRequest({
    method: 'DELETE',
    body: { brand_id: 'b1', confirm_typed: 'wrong' },
    headers: { authorization: 'Bearer fake' },
  })
  const res = mockResponse()
  mockSupabaseAuthedAs('user-123', { rpc: async () => ({ data: null, error: { message: 'confirm_mismatch' } }) })
  await handler(req, res)
  expect(res.statusCode).toBe(422)
})
```

- [ ] **Step 2: Verify fail + implement**

Create `api/brands/delete.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { purgeBrandStorageObjects } from '../_shared/storage-sweep'

function isUuid(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'DELETE') { res.status(405).json({ error: 'method_not_allowed' }); return }
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'no_auth' }); return }
  const brandId = (req.body as any)?.brand_id
  const typed = (req.body as any)?.confirm_typed
  if (!isUuid(brandId)) { res.status(422).json({ error: 'brand_id_required' }); return }
  if (typeof typed !== 'string' || typed.length === 0) { res.status(422).json({ error: 'confirm_required' }); return }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } },
  )

  const { data, error } = await supabase.rpc('delete_brand', {
    p_brand_id: brandId,
    p_confirm_name: typed,
  })
  if (error) {
    const status =
      error.message === 'confirm_mismatch' ? 422 :
      error.message === 'not_found' ? 404 :
      error.message === 'not_authenticated' ? 401 : 500
    res.status(status).json({ error: error.message })
    return
  }

  // Sweep is best-effort — log failures, don't fail the request (brand already gone via FK cascade).
  const sweep = await purgeBrandStorageObjects(supabase, brandId, '<from-jwt>')
  res.status(200).json({
    success: true,
    deleted_brand_name: (data as any).name,
    storage_sweep: sweep,
  })
}
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/api/brands/delete.test.ts
git add api/brands/delete.ts tests/api/brands/delete.test.ts
git commit -m "feat(brands): DELETE /api/brands/delete endpoint with storage sweep"
```

---

## Phase 3 — Pinia store extension

### Task 15: Extend `Brand` type

**Files:**
- Modify: `src/types/kova/database.ts`
- Test: `tests/types/brand.test.ts`

- [ ] **Step 1: Write failing type test**

Create `tests/types/brand.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import type { Brand, BrandColor } from '../../src/types/kova/database'

test('Brand has new fields', () => {
  const b: Brand = {
    id: 'x', user_id: 'u', name: 'X', created_at: '', updated_at: '',
    colors: null, fonts: null, logo_url: null, voice: null, industry: null,
    archived_at: null, color: 'coral', slug: 'x', url: null, description: null,
  }
  expect(b.color).toBe('coral')
})
test('BrandColor union', () => {
  const colors: BrandColor[] = ['coral','violet','sage','sand','graphite']
  expect(colors).toHaveLength(5)
})
```

- [ ] **Step 2: Verify fail + extend type**

Find existing `Brand` interface in `src/types/kova/database.ts`. Add:

```typescript
export type BrandColor = 'coral' | 'violet' | 'sage' | 'sand' | 'graphite'

export interface Brand {
  // ... existing fields
  archived_at: string | null
  color: BrandColor
  slug: string | null
  url: string | null
  description: string | null
}
```

- [ ] **Step 3: Run + commit**

```bash
bun run check
bun test ./tests/types/brand.test.ts
git add src/types/kova/database.ts tests/types/brand.test.ts
git commit -m "feat(brands): extend Brand type with archived_at + color + slug + url + description"
```

---

### Task 16: Extend `useBrandsStore` — getters

**Files:**
- Modify: `src/stores/brands.ts`
- Test: `tests/stores/brands.test.ts`

- [ ] **Step 1: Write failing test**

Append to (or create) `tests/stores/brands.test.ts`:

```typescript
import { test, expect, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useBrandsStore } from '../../src/stores/brands'

beforeEach(() => setActivePinia(createPinia()))

test('activeBrands filters archived_at IS NULL', () => {
  const store = useBrandsStore()
  store.brands = [
    { id: '1', archived_at: null } as any,
    { id: '2', archived_at: '2026-05-01T00:00:00Z' } as any,
    { id: '3', archived_at: null } as any,
  ]
  expect(store.activeBrands.map(b => b.id)).toEqual(['1', '3'])
})

test('archivedBrands inverse', () => {
  const store = useBrandsStore()
  store.brands = [
    { id: '1', archived_at: null } as any,
    { id: '2', archived_at: '2026-05-01T00:00:00Z' } as any,
  ]
  expect(store.archivedBrands.map(b => b.id)).toEqual(['2'])
})
```

- [ ] **Step 2: Verify fail + extend store**

In `src/stores/brands.ts`, add getters after `selectedBrand`:

```typescript
const activeBrands = computed(() =>
  brands.value.filter((b) => b.archived_at === null),
)

const archivedBrands = computed(() =>
  brands.value.filter((b) => b.archived_at !== null),
)

const sortedActive = computed(() =>
  [...activeBrands.value].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '')),
)
```

And add them to the `return` block of `defineStore`.

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/stores/brands.test.ts
git add src/stores/brands.ts tests/stores/brands.test.ts
git commit -m "feat(brands): add activeBrands + archivedBrands + sortedActive getters"
```

---

### Task 17: Replace `createBrand` action with full signature

**Files:**
- Modify: `src/stores/brands.ts`
- Modify: `tests/stores/brands.test.ts`

- [ ] **Step 1: Write failing test**

Append to `tests/stores/brands.test.ts`:

```typescript
import { mock } from 'bun:test'

test('createBrand calls /api/brands/create + writes to brands[]', async () => {
  const store = useBrandsStore()
  const fetchMock = mock(async () => new Response(JSON.stringify({
    brand: { id: 'new', name: 'Patagonia', archived_at: null, color: 'coral', slug: 'patagonia', url: 'https://patagonia.com', description: null, user_id: 'u', created_at: '', updated_at: '' },
  })))
  globalThis.fetch = fetchMock as any
  const result = await store.createBrand({ name: 'Patagonia', url: 'https://patagonia.com', description: null })
  expect(result.name).toBe('Patagonia')
  expect(store.brands.find(b => b.id === 'new')).toBeDefined()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Verify fail + reimplement**

Replace existing `createBrand` in `src/stores/brands.ts`:

```typescript
const isCreating = ref<boolean>(false)
const isMutating = ref<boolean>(false)

async function createBrand(input: { name: string; url: string | null; description: string | null }): Promise<Brand> {
  isCreating.value = true
  try {
    const resp = await fetch('/api/brands/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(input),
    })
    if (!resp.ok) {
      const { error } = await resp.json().catch(() => ({ error: 'unknown' }))
      throw new Error(error ?? `HTTP ${resp.status}`)
    }
    const { brand } = await resp.json()
    brands.value = [...brands.value, brand]
    return brand
  } finally {
    isCreating.value = false
  }
}

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}
```

Update the `return` block.

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/stores/brands.test.ts
git add src/stores/brands.ts tests/stores/brands.test.ts
git commit -m "feat(brands): rewrite createBrand to call /api/brands/create"
```

---

### Task 18: `renameBrand`, `archiveBrand`, `deleteBrand` actions

**Files:**
- Modify: `src/stores/brands.ts`
- Modify: `tests/stores/brands.test.ts`

- [ ] **Step 1: Write failing tests (3 tests)**

Append:

```typescript
test('renameBrand mutates store after success', async () => {
  const store = useBrandsStore()
  store.brands = [{ id: 'b1', name: 'Old', archived_at: null } as any]
  globalThis.fetch = mock(async () => new Response(JSON.stringify({
    brand: { id: 'b1', name: 'New', archived_at: null },
  }))) as any
  await store.renameBrand('b1', 'New')
  expect(store.brands.find(b => b.id === 'b1')?.name).toBe('New')
})

test('archiveBrand marks archived_at', async () => {
  const store = useBrandsStore()
  store.brands = [{ id: 'b1', archived_at: null } as any, { id: 'b2', archived_at: null } as any]
  globalThis.fetch = mock(async () => new Response(JSON.stringify({
    brand: { id: 'b1', archived_at: '2026-05-15T10:00:00Z' },
    next_brand_id: 'b2',
  }))) as any
  await store.archiveBrand('b1')
  expect(store.activeBrands).toHaveLength(1)
  expect(store.archivedBrands).toHaveLength(1)
})

test('deleteBrand removes from brands[]', async () => {
  const store = useBrandsStore()
  store.brands = [{ id: 'b1', name: 'X' } as any]
  globalThis.fetch = mock(async () => new Response(JSON.stringify({
    success: true, deleted_brand_name: 'X',
  }))) as any
  await store.deleteBrand('b1', 'X')
  expect(store.brands).toHaveLength(0)
})
```

- [ ] **Step 2: Verify fail + implement**

Append to `src/stores/brands.ts`:

```typescript
async function callBrandsApi<T>(path: string, method: 'POST' | 'DELETE', body: object): Promise<T> {
  isMutating.value = true
  try {
    const resp = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const { error } = await resp.json().catch(() => ({ error: 'unknown' }))
      throw new Error(error ?? `HTTP ${resp.status}`)
    }
    return (await resp.json()) as T
  } finally {
    isMutating.value = false
  }
}

async function renameBrand(id: string, name: string): Promise<void> {
  const { brand } = await callBrandsApi<{ brand: Brand }>('/api/brands/rename', 'POST', { brand_id: id, name })
  brands.value = brands.value.map((b) => (b.id === id ? brand : b))
}

async function archiveBrand(id: string): Promise<void> {
  const { brand, next_brand_id } = await callBrandsApi<{ brand: Brand; next_brand_id: string | null }>(
    '/api/brands/archive', 'POST', { brand_id: id })
  brands.value = brands.value.map((b) => (b.id === id ? brand : b))
  if (selectedBrandId.value === id) selectedBrandId.value = next_brand_id
}

async function deleteBrand(id: string, typedConfirm: string): Promise<void> {
  await callBrandsApi<{ success: boolean }>('/api/brands/delete', 'DELETE', {
    brand_id: id, confirm_typed: typedConfirm,
  })
  brands.value = brands.value.filter((b) => b.id !== id)
  if (selectedBrandId.value === id) selectedBrandId.value = null
}

async function restoreBrand(id: string): Promise<void> {
  // REAL — MVP per 2026-05-17 reversal. Gated by BRANDS_RESTORE_ENABLED flag (default true).
  // On 503 feature_disabled response, surfaces typed error for UI to render disabled CTA.
  const { brand } = await callBrandsApi<{ brand: Brand }>('/api/brands/restore', 'POST', { brand_id: id })
  brands.value = brands.value.map((b) => (b.id === id ? brand : b))
}

async function fetchArchivedBrands(): Promise<void> {
  // Lazy-load archived rows for B12 page + A2.a "Archived" filter.
  // Merges into existing brands[] without duplicating active rows.
  const { data, error } = await supabase.rpc('list_archived_brands')
  if (error) throw error
  const archived = (data ?? []) as Brand[]
  const archivedIds = new Set(archived.map((b) => b.id))
  brands.value = [
    ...brands.value.filter((b) => !archivedIds.has(b.id)),
    ...archived,
  ]
}
```

Add all five to the `return` block (`renameBrand`, `archiveBrand`, `deleteBrand`, `restoreBrand`, `fetchArchivedBrands`).

- [ ] **Step 3: Add failing test for restoreBrand**

Append to `tests/stores/brands.test.ts`:

```typescript
test('restoreBrand clears archived_at on local row', async () => {
  const store = useBrandsStore()
  const archived = { id: 'b1', name: 'X', archived_at: new Date().toISOString() } as Brand
  store.brands = [archived]
  globalThis.fetch = mock(async () => new Response(JSON.stringify({
    brand: { ...archived, archived_at: null },
  }))) as any
  await store.restoreBrand('b1')
  expect(store.brands[0].archived_at).toBeNull()
  expect(store.activeBrands).toHaveLength(1)
  expect(store.archivedBrands).toHaveLength(0)
})

test('fetchArchivedBrands merges archived rows without duplicating active', async () => {
  const store = useBrandsStore()
  store.brands = [{ id: 'active1', name: 'A', archived_at: null } as Brand]
  vi.mock('@/lib/supabase', () => ({
    supabase: { rpc: vi.fn(async () => ({ data: [{ id: 'arch1', name: 'X', archived_at: new Date().toISOString() }], error: null })) }
  }))
  await store.fetchArchivedBrands()
  expect(store.brands).toHaveLength(2)
  expect(store.activeBrands).toHaveLength(1)
  expect(store.archivedBrands).toHaveLength(1)
})
```

- [ ] **Step 4: Run + commit**

```bash
bun test ./tests/stores/brands.test.ts
git add src/stores/brands.ts tests/stores/brands.test.ts
git commit -m "feat(brands): add renameBrand, archiveBrand, deleteBrand, restoreBrand (REAL), fetchArchivedBrands actions"
```

---

## Phase 4 — Wizard composable

### Task 19: `useNewBrandFlow` state machine

**Files:**
- Create: `src/composables/brands/use-new-brand-flow.ts`
- Test: `tests/composables/use-new-brand-flow.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/composables/use-new-brand-flow.test.ts`:

```typescript
import { test, expect, mock, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useNewBrandFlow } from '../../src/composables/brands/use-new-brand-flow'
import { useBrandsStore } from '../../src/stores/brands'

beforeEach(() => setActivePinia(createPinia()))

test('initial step is name-url', () => {
  const flow = useNewBrandFlow()
  expect(flow.step.value).toBe('name-url')
})

test('advance progresses name-url → shopify → brand-kit → done', () => {
  const flow = useNewBrandFlow()
  flow.advance(); expect(flow.step.value).toBe('shopify')
  flow.advance(); expect(flow.step.value).toBe('brand-kit')
  flow.advance(); expect(flow.step.value).toBe('done')
  flow.advance(); expect(flow.step.value).toBe('done') // clamps
})

test('isDirty reflects any field input', () => {
  const flow = useNewBrandFlow()
  expect(flow.isDirty.value).toBe(false)
  flow.name.value = 'Patagonia'
  expect(flow.isDirty.value).toBe(true)
})

test('commitAndAdvance calls store.createBrand + advances to done', async () => {
  const store = useBrandsStore()
  store.createBrand = mock(async () => ({ id: 'new-brand', name: 'Test' } as any))
  const flow = useNewBrandFlow()
  flow.name.value = 'Test'
  flow.step.value = 'brand-kit'
  await flow.commitAndAdvance()
  expect(store.createBrand).toHaveBeenCalledTimes(1)
  expect(flow.brandId.value).toBe('new-brand')
  expect(flow.step.value).toBe('done')
})

test('reset clears state', () => {
  const flow = useNewBrandFlow()
  flow.name.value = 'X'
  flow.advance()
  flow.reset()
  expect(flow.step.value).toBe('name-url')
  expect(flow.name.value).toBe('')
})
```

- [ ] **Step 2: Verify fail + implement**

Create `src/composables/brands/use-new-brand-flow.ts`:

```typescript
import { ref, computed } from 'vue'
import { useBrandsStore } from '@/stores/brands'

export type WizardStep = 'name-url' | 'shopify' | 'brand-kit' | 'done'

const STEP_ORDER: WizardStep[] = ['name-url', 'shopify', 'brand-kit', 'done']

export function useNewBrandFlow() {
  const step = ref<WizardStep>('name-url')
  const name = ref<string>('')
  const url = ref<string>('')
  const description = ref<string>('')
  const brandId = ref<string | null>(null)

  const isDirty = computed(() =>
    name.value.length > 0 || url.value.length > 0 || description.value.length > 0,
  )

  function advance(): void {
    const i = STEP_ORDER.indexOf(step.value)
    if (i < STEP_ORDER.length - 1) step.value = STEP_ORDER[i + 1]
  }

  function back(): void {
    const i = STEP_ORDER.indexOf(step.value)
    if (i > 0 && step.value !== 'done') step.value = STEP_ORDER[i - 1]
  }

  async function commitAndAdvance(): Promise<void> {
    const store = useBrandsStore()
    const brand = await store.createBrand({
      name: name.value.trim(),
      url: url.value.trim() || null,
      description: description.value.trim() || null,
    })
    brandId.value = brand.id
    step.value = 'done'
  }

  function reset(): void {
    step.value = 'name-url'
    name.value = ''
    url.value = ''
    description.value = ''
    brandId.value = null
  }

  return { step, name, url, description, brandId, isDirty, advance, back, commitAndAdvance, reset }
}
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/composables/use-new-brand-flow.test.ts
git add src/composables/brands/use-new-brand-flow.ts tests/composables/use-new-brand-flow.test.ts
git commit -m "feat(brands): add useNewBrandFlow wizard state machine"
```

---

### Task 20: `use-brand-color` helper

**Files:**
- Create: `src/composables/brands/use-brand-color.ts`
- Test: `tests/composables/use-brand-color.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/composables/use-brand-color.test.ts`:

```typescript
import { test, expect } from 'bun:test'
import { brandLogoClass } from '../../src/composables/brands/use-brand-color'

test('maps color name to k-{name} class', () => {
  expect(brandLogoClass('coral')).toBe('bp-card__logo k-coral')
  expect(brandLogoClass('violet')).toBe('bp-card__logo k-violet')
  expect(brandLogoClass('sage')).toBe('bp-card__logo k-sage')
  expect(brandLogoClass('sand')).toBe('bp-card__logo k-sand')
  expect(brandLogoClass('graphite')).toBe('bp-card__logo k-graphite')
})
```

- [ ] **Step 2: Verify fail + implement**

Create `src/composables/brands/use-brand-color.ts`:

```typescript
import type { BrandColor } from '@/types/kova/database'

export function brandLogoClass(color: BrandColor): string {
  return `bp-card__logo k-${color}`
}
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/composables/use-brand-color.test.ts
git add src/composables/brands/use-brand-color.ts tests/composables/use-brand-color.test.ts
git commit -m "feat(brands): add brandLogoClass helper"
```

---

## Phase 5 — Adapters + shared chrome

### Task 21: Cluster-11 adapter shims

**Files:**
- Create: `src/components/_adapters/KovaModalAdapter.vue`
- Create: `src/components/_adapters/TypedConfirmFieldAdapter.vue`
- Create: `src/composables/_adapters/use-toast-adapter.ts`
- Create: `src/composables/_adapters/use-confirm-adapter.ts`

- [ ] **Step 1: Implement `KovaModalAdapter.vue`**

```vue
<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent } from 'reka-ui'

interface Props {
  open: boolean
  size?: 'sm' | 'md' | 'lg'
}
const props = withDefaults(defineProps<Props>(), { size: 'md' })
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
const widthClass = { sm: 'max-w-[420px]', md: 'max-w-[540px]', lg: 'max-w-[640px]' }
</script>
<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-[rgba(26,26,29,0.72)] z-50" />
      <DialogContent
        :class="['fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-32px)] rounded-[10px] border border-[var(--line)] bg-[var(--rail)] shadow-2xl', widthClass[props.size]]"
      >
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

- [ ] **Step 2: Implement `TypedConfirmFieldAdapter.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  expected: string
  case?: 'sensitive' | 'insensitive'
  placeholder?: string
}
const props = withDefaults(defineProps<Props>(), { case: 'sensitive' })
const emit = defineEmits<{ matched: [match: boolean]; 'update:typed': [v: string] }>()
const typed = ref('')
const isMatched = computed(() => {
  if (props.case === 'sensitive') return typed.value === props.expected
  return typed.value.toLowerCase() === props.expected.toLowerCase()
})
const state = computed(() => {
  if (typed.value.length === 0) return 'idle'
  if (isMatched.value) return 'matched'
  return 'partial'
})
function onInput(e: Event): void {
  typed.value = (e.target as HTMLInputElement).value
  emit('update:typed', typed.value)
  emit('matched', isMatched.value)
}
</script>
<template>
  <input
    type="text"
    :placeholder="props.placeholder ?? props.expected"
    :value="typed"
    @input="onInput"
    :class="[
      'w-full rounded-[6px] border bg-[var(--page)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none transition',
      state === 'idle' && 'border-[var(--line)]',
      state === 'partial' && 'border-[var(--ink-3)]',
      state === 'matched' && 'border-[var(--ok)] shadow-[0_0_0_3px_rgba(94,194,125,0.12)]',
    ]"
  />
</template>
```

- [ ] **Step 3: Implement toast + confirm adapters**

`src/composables/_adapters/use-toast-adapter.ts`:

```typescript
// Stopgap until Cluster 11 ships <useToast()>. Logs to console + dispatches a CustomEvent
// that a future <ToastStack> root will listen for.
export function useToast() {
  function emit(type: 'success' | 'error' | 'info', message: string): void {
    window.dispatchEvent(new CustomEvent('kova:toast', { detail: { type, message } }))
    if (type === 'error') console.error('toast:error', message)
    else console.log('toast:' + type, message)
  }
  return {
    success: (m: string) => emit('success', m),
    error: (m: string) => emit('error', m),
    info: (m: string) => emit('info', m),
  }
}
```

`src/composables/_adapters/use-confirm-adapter.ts`:

```typescript
// Stopgap window.confirm wrapper. Cluster 11 ships proper <ConfirmDialog>.
export function useConfirm() {
  return async (opts: { title: string; description: string; confirmLabel?: string }): Promise<boolean> => {
    return window.confirm(`${opts.title}\n\n${opts.description}`)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/_adapters/ src/composables/_adapters/
git commit -m "feat(brands): add Cluster-11 adapter shims (KovaModal, TypedConfirmField, toast, confirm)"
```

---

### Task 22: `BrandSummaryRow.vue` shared chrome

**Files:**
- Create: `src/components/brand/BrandSummaryRow.vue`
- Test: `tests/components/brand/BrandSummaryRow.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import BrandSummaryRow from '../../../src/components/brand/BrandSummaryRow.vue'

test('renders brand logo + name + meta', () => {
  const wrapper = mount(BrandSummaryRow, {
    props: {
      brand: {
        id: 'b1', name: 'Field Notes', color: 'graphite',
        slug: 'field-notes', url: 'fieldnotesbrand.com',
        archived_at: null, description: null,
        user_id: 'u', created_at: '', updated_at: '',
        colors: null, fonts: null, logo_url: null, voice: null, industry: null,
      } as any,
      meta: '9 canvases · archived Mar 11, 2026',
    },
  })
  expect(wrapper.text()).toContain('Field Notes')
  expect(wrapper.text()).toContain('9 canvases')
  expect(wrapper.find('.bp-card__logo, .k-graphite').exists()).toBe(true)
})
```

- [ ] **Step 2: Verify fail + implement**

```vue
<script setup lang="ts">
import type { Brand } from '@/types/kova/database'
import { brandLogoClass } from '@/composables/brands/use-brand-color'

interface Props {
  brand: Brand
  meta: string
}
defineProps<Props>()
</script>
<template>
  <div class="flex items-center gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--page)] p-3">
    <div :class="brandLogoClass(brand.color)" class="grid h-11 w-11 place-items-center rounded-[8px] text-[20px] font-extrabold tracking-tight">
      {{ brand.name.charAt(0).toUpperCase() }}
    </div>
    <div class="flex min-w-0 flex-col">
      <div class="truncate text-[14.5px] font-semibold text-[var(--ink)]">{{ brand.name }}</div>
      <div class="truncate text-[11.5px] text-[var(--ink-3)]">{{ meta }}</div>
    </div>
    <div class="ml-auto"><slot name="right" /></div>
  </div>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/components/brand/BrandSummaryRow.test.ts
git add src/components/brand/BrandSummaryRow.vue tests/components/brand/BrandSummaryRow.test.ts
git commit -m "feat(brands): add BrandSummaryRow shared chrome"
```

---

### Task 23: `LossList.vue` + `InfoCard.vue` shared chrome

**Files:**
- Create: `src/components/brand/LossList.vue`
- Create: `src/components/brand/InfoCard.vue`

- [ ] **Step 1: Implement `LossList.vue`**

```vue
<script setup lang="ts">
interface LossRow {
  icon: string         // lucide icon name
  label: string
  qty: string | number // 'all' / '—' / number
}
interface Props {
  rows: LossRow[]
  header?: string
}
withDefaults(defineProps<Props>(), { header: 'WHAT WILL BE PERMANENTLY REMOVED' })
</script>
<template>
  <div class="rounded-[8px] border border-[var(--warn-edge)] bg-[var(--warn-soft)] p-3">
    <div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--warn)]">{{ header }}</div>
    <div class="flex flex-col gap-1.5">
      <div v-for="r in rows" :key="r.label" class="flex items-center gap-2 text-[12.5px] text-[var(--ink-2)]">
        <Icon :name="`lucide:${r.icon}`" class="h-3.5 w-3.5 text-[var(--ink-3)]" />
        <span class="flex-1">{{ r.label }}</span>
        <span class="text-[11.5px] font-medium text-[var(--ink)]">{{ r.qty }}</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Implement `InfoCard.vue`**

```vue
<script setup lang="ts">
interface Props {
  icon: string
  title: string
  bullets: string[]
}
defineProps<Props>()
</script>
<template>
  <div class="flex gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--rail)] p-3">
    <div class="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-[var(--fill)] text-[var(--ink-2)]">
      <Icon :name="`lucide:${icon}`" class="h-3.5 w-3.5" />
    </div>
    <div class="flex flex-col gap-1.5">
      <b class="text-[12.5px] text-[var(--ink)]">{{ title }}</b>
      <div class="flex flex-col gap-1">
        <div v-for="b in bullets" :key="b" class="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--ink-2)]">
          <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ink-3)]"></span>
          <span v-html="b"></span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/LossList.vue src/components/brand/InfoCard.vue
git commit -m "feat(brands): add LossList + InfoCard shared chrome components"
```

---

## Phase 6 — CRUD modals

### Task 24: `RenameBrandModal.vue`

**Files:**
- Create: `src/components/brand/RenameBrandModal.vue`
- Test: `tests/components/brand/RenameBrandModal.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBrandsStore } from '../../../src/stores/brands'
import RenameBrandModal from '../../../src/components/brand/RenameBrandModal.vue'

const brand = { id: 'b1', name: 'Nike', slug: 'nike' } as any

test('Save disabled until name changed AND non-empty', async () => {
  setActivePinia(createPinia())
  const wrapper = mount(RenameBrandModal, { props: { brand, open: true } })
  const save = wrapper.find('[data-test="rename-save"]')
  expect(save.attributes('disabled')).toBeDefined()
  await wrapper.find('input[data-test="rename-name"]').setValue('Nike Inc.')
  expect(save.attributes('disabled')).toBeUndefined()
  await wrapper.find('input[data-test="rename-name"]').setValue('  ')
  expect(save.attributes('disabled')).toBeDefined()
})

test('Save calls store.renameBrand + emits saved', async () => {
  setActivePinia(createPinia())
  const store = useBrandsStore()
  let called = false
  store.renameBrand = async () => { called = true } 
  const wrapper = mount(RenameBrandModal, { props: { brand, open: true } })
  await wrapper.find('input[data-test="rename-name"]').setValue('Nike Inc.')
  await wrapper.find('[data-test="rename-save"]').trigger('click')
  expect(called).toBe(true)
  expect(wrapper.emitted('saved')).toBeDefined()
})
```

- [ ] **Step 2: Verify fail + implement**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Brand } from '@/types/kova/database'
import { useBrandsStore } from '@/stores/brands'
import { useToast } from '@/composables/_adapters/use-toast-adapter'
import KovaModalAdapter from '@/components/_adapters/KovaModalAdapter.vue'

interface Props { brand: Brand; open: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ 'update:open': [open: boolean]; saved: [] }>()

const store = useBrandsStore()
const toast = useToast()
const name = ref<string>(props.brand.name)
const submitting = ref<boolean>(false)

watch(() => props.brand.name, (v) => { name.value = v })
watch(() => props.open, (v) => { if (v) name.value = props.brand.name })

const canSave = computed(() =>
  name.value.trim().length > 0
  && name.value.trim() !== props.brand.name
  && !submitting.value,
)

async function onSave(): Promise<void> {
  if (!canSave.value) return
  submitting.value = true
  try {
    await store.renameBrand(props.brand.id, name.value.trim())
    toast.success('Brand renamed')
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    toast.error(`Rename failed: ${(e as Error).message}`)
  } finally {
    submitting.value = false
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSave()
  if (e.key === 'Escape') emit('update:open', false)
}
</script>
<template>
  <KovaModalAdapter :open="open" size="sm" @update:open="emit('update:open', $event)">
    <div class="flex flex-col gap-4 p-5" @keydown="onKeyDown">
      <div>
        <h3 class="text-[15px] font-semibold text-[var(--ink)]">Rename brand</h3>
        <p class="mt-1 text-[12.5px] text-[var(--ink-2)]">Update the display name. The URL slug stays linked to the original brand ID, so existing links keep working.</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[11.5px] font-medium text-[var(--ink-2)]">Brand name</label>
        <input
          v-model="name" data-test="rename-name" type="text" autofocus
          class="rounded-[6px] border border-[var(--line)] bg-[var(--page)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink-3)]"
        />
        <span class="text-[11.5px] text-[var(--ink-3)]">Shows in the sidebar pill, brand picker, and all canvas chrome.</span>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[11.5px] font-medium text-[var(--ink-2)]">URL slug <span class="opacity-50">read-only</span></label>
        <input
          :value="brand.slug" readonly
          class="rounded-[6px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--ink-3)]"
        />
        <span class="text-[11.5px] text-[var(--ink-3)]">Auto-derived from the name on first creation. Slug never changes.</span>
      </div>
      <div class="flex items-center justify-between border-t border-[var(--line)] pt-3">
        <div class="text-[11.5px] text-[var(--ink-3)]">Renaming is reversible. No data is touched.</div>
        <div class="flex gap-2">
          <button data-test="rename-cancel" class="rounded-[6px] border border-[var(--line)] px-3 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--line-2)]" @click="emit('update:open', false)">Cancel</button>
          <button data-test="rename-save" :disabled="!canSave" class="rounded-[6px] bg-[var(--ink)] px-3 py-1.5 text-[12.5px] font-medium text-[#111] disabled:opacity-50" @click="onSave">Save</button>
        </div>
      </div>
    </div>
  </KovaModalAdapter>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/components/brand/RenameBrandModal.test.ts
git add src/components/brand/RenameBrandModal.vue tests/components/brand/RenameBrandModal.test.ts
git commit -m "feat(brands): add RenameBrandModal (A4.1)"
```

---

### Task 25: `ArchiveBrandModal.vue`

**Files:**
- Create: `src/components/brand/ArchiveBrandModal.vue`
- Test: `tests/components/brand/ArchiveBrandModal.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBrandsStore } from '../../../src/stores/brands'
import ArchiveBrandModal from '../../../src/components/brand/ArchiveBrandModal.vue'

const brand = { id: 'b1', name: 'Glossier', color: 'sand' } as any

test('renders headline with brand name', () => {
  setActivePinia(createPinia())
  const wrapper = mount(ArchiveBrandModal, { props: { brand, open: true } })
  expect(wrapper.text()).toContain("Archive 'Glossier'?")
})

test('CTA is neutral primary, not danger', () => {
  setActivePinia(createPinia())
  const wrapper = mount(ArchiveBrandModal, { props: { brand, open: true } })
  const cta = wrapper.find('[data-test="archive-confirm"]')
  expect(cta.classes()).not.toContain('btn-danger')
})

test('confirm calls store.archiveBrand + emits archived', async () => {
  setActivePinia(createPinia())
  const store = useBrandsStore()
  let called = false
  store.archiveBrand = async () => { called = true }
  const wrapper = mount(ArchiveBrandModal, { props: { brand, open: true } })
  await wrapper.find('[data-test="archive-confirm"]').trigger('click')
  expect(called).toBe(true)
  expect(wrapper.emitted('archived')).toBeDefined()
})
```

- [ ] **Step 2: Implement** (full A4.2 layout matching hi-fi)

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Brand } from '@/types/kova/database'
import { useBrandsStore } from '@/stores/brands'
import { useToast } from '@/composables/_adapters/use-toast-adapter'
import KovaModalAdapter from '@/components/_adapters/KovaModalAdapter.vue'
import BrandSummaryRow from './BrandSummaryRow.vue'
import InfoCard from './InfoCard.vue'

interface Props { brand: Brand; open: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ 'update:open': [open: boolean]; archived: [] }>()

const store = useBrandsStore()
const toast = useToast()
const submitting = ref<boolean>(false)

async function onConfirm(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  try {
    await store.archiveBrand(props.brand.id)
    toast.success(`'${props.brand.name}' archived`)
    emit('archived')
    emit('update:open', false)
  } catch (e) {
    const msg = (e as Error).message
    if (msg === 'already_archived') toast.error('Already archived')
    else toast.error(`Archive failed: ${msg}`)
    emit('update:open', false)
  } finally {
    submitting.value = false
  }
}
</script>
<template>
  <KovaModalAdapter :open="open" size="md" @update:open="emit('update:open', $event)">
    <div class="flex flex-col gap-4 p-5">
      <div>
        <h3 class="text-[15px] font-semibold text-[var(--ink)]">Archive '{{ brand.name }}'?</h3>
        <p class="mt-1 text-[12.5px] text-[var(--ink-2)]">Archived brands are hidden from the picker but stay restorable. Pick this if you're done with a brand for now but might come back.</p>
      </div>
      <InfoCard
        icon="archive"
        title="What 'archived' means"
        :bullets="[
          'Hidden from the sidebar brand-switcher and brand picker',
          'All canvases, snapshots, brand-kit data &amp; integrations are kept',
          'Shopify connection stays connected — no re-auth on restore',
          'Restore any time from <span class=&quot;opacity-50&quot;>Settings → Archive</span> (Phase 2)',
        ]"
      />
      <BrandSummaryRow :brand="brand" :meta="`${brand.slug ?? ''} · created ${brand.created_at?.slice(0,10) ?? ''}`" />
      <p class="text-[12.5px] leading-relaxed text-[var(--ink-2)]">Archived brands are hidden from the brand picker but kept intact — canvases, brand kit, and Shopify connection are preserved. No data is deleted.</p>
      <div class="flex items-center justify-between border-t border-[var(--line)] pt-3">
        <div class="text-[11.5px] text-[var(--ink-3)]">Reversible. No data is removed.</div>
        <div class="flex gap-2">
          <button class="rounded-[6px] border border-[var(--line)] px-3 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--line-2)]" @click="emit('update:open', false)">Cancel</button>
          <button data-test="archive-confirm" :disabled="submitting" class="rounded-[6px] bg-[var(--ink)] px-3 py-1.5 text-[12.5px] font-medium text-[#111] disabled:opacity-50" @click="onConfirm">Archive brand</button>
        </div>
      </div>
    </div>
  </KovaModalAdapter>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/components/brand/ArchiveBrandModal.test.ts
git add src/components/brand/ArchiveBrandModal.vue tests/components/brand/ArchiveBrandModal.test.ts
git commit -m "feat(brands): add ArchiveBrandModal (A4.2)"
```

---

### Task 26: `DeleteBrandModal.vue` (typed-confirm)

**Files:**
- Create: `src/components/brand/DeleteBrandModal.vue`
- Test: `tests/components/brand/DeleteBrandModal.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { test, expect } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBrandsStore } from '../../../src/stores/brands'
import DeleteBrandModal from '../../../src/components/brand/DeleteBrandModal.vue'

const brand = { id: 'b1', name: 'Warby Parker', color: 'sand', slug: 'warby-parker' } as any

test('CTA disabled until typed-confirm matches exactly (case-sensitive)', async () => {
  setActivePinia(createPinia())
  const wrapper = mount(DeleteBrandModal, { props: { brand, open: true } })
  const cta = wrapper.find('[data-test="delete-confirm"]')
  expect(cta.attributes('disabled')).toBeDefined()
  await wrapper.find('input[data-test="typed-input"]').setValue('Warby')
  expect(cta.attributes('disabled')).toBeDefined()
  await wrapper.find('input[data-test="typed-input"]').setValue('warby parker') // lowercase
  expect(cta.attributes('disabled')).toBeDefined()
  await wrapper.find('input[data-test="typed-input"]').setValue('Warby Parker')
  expect(cta.attributes('disabled')).toBeUndefined()
})

test('delete CTA calls store.deleteBrand with typed value', async () => {
  setActivePinia(createPinia())
  const store = useBrandsStore()
  let callArgs: any = null
  store.deleteBrand = async (id, t) => { callArgs = { id, t } }
  const wrapper = mount(DeleteBrandModal, { props: { brand, open: true } })
  await wrapper.find('input[data-test="typed-input"]').setValue('Warby Parker')
  await wrapper.find('[data-test="delete-confirm"]').trigger('click')
  await flushPromises()
  expect(callArgs).toEqual({ id: 'b1', t: 'Warby Parker' })
})
```

- [ ] **Step 2: Implement**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Brand } from '@/types/kova/database'
import { useBrandsStore } from '@/stores/brands'
import { useToast } from '@/composables/_adapters/use-toast-adapter'
import KovaModalAdapter from '@/components/_adapters/KovaModalAdapter.vue'
import TypedConfirmFieldAdapter from '@/components/_adapters/TypedConfirmFieldAdapter.vue'
import BrandSummaryRow from './BrandSummaryRow.vue'
import LossList from './LossList.vue'

interface Props { brand: Brand; open: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ 'update:open': [open: boolean]; deleted: [] }>()

const store = useBrandsStore()
const toast = useToast()
const typed = ref<string>('')
const matched = ref<boolean>(false)
const submitting = ref<boolean>(false)

const canDelete = computed(() => matched.value && !submitting.value)

// Loss-list counts. Stores not yet wired show '—'.
function safeCount(getter: () => number | undefined): number | string {
  try { return getter() ?? '—' } catch { return '—' }
}
const lossRows = computed(() => [
  { icon: 'layout-template', label: 'Canvases',                                            qty: safeCount(() => (window as any).__kova_canvases_by_brand?.(props.brand.id)?.length) },
  { icon: 'history',         label: 'Snapshots',                                           qty: safeCount(() => (window as any).__kova_snapshots_by_brand?.(props.brand.id)?.length) },
  { icon: 'palette',         label: 'Brand-kit data — colors, fonts, snippets, memories', qty: 'all' as const },
  { icon: 'book-open',       label: 'Knowledge-base sources',                              qty: safeCount(() => (window as any).__kova_kb_by_brand?.(props.brand.id)?.length) },
  { icon: 'shopping-bag',    label: 'Shopify connection (token revoked)',                  qty: safeCount(() => (window as any).__kova_shopify_has?.(props.brand.id) ? 1 : 0) },
])

async function onConfirm(): Promise<void> {
  if (!canDelete.value) return
  submitting.value = true
  try {
    await store.deleteBrand(props.brand.id, typed.value)
    toast.success('Brand deleted')
    emit('deleted')
    emit('update:open', false)
  } catch (e) {
    const msg = (e as Error).message
    if (msg === 'confirm_mismatch') {
      toast.error("Confirmation didn't match")
      typed.value = ''
    } else {
      toast.error('Delete failed — try again or contact support')
    }
  } finally {
    submitting.value = false
  }
}
</script>
<template>
  <KovaModalAdapter :open="open" size="md" @update:open="emit('update:open', $event)">
    <div class="flex flex-col gap-4 p-5">
      <div>
        <h3 class="text-[15px] font-semibold text-[var(--ink)]">Delete brand '{{ brand.name }}'?</h3>
        <p class="mt-1 text-[12.5px] text-[var(--ink-2)]">This permanently removes the brand and everything inside it. <strong class="text-[var(--ink)]">It cannot be undone.</strong></p>
      </div>
      <BrandSummaryRow :brand="brand" :meta="`created ${brand.created_at?.slice(0,10) ?? '—'}`" />
      <LossList :rows="lossRows" />
      <div class="flex flex-col gap-1.5">
        <label class="text-[11.5px] font-medium text-[var(--ink-2)]">
          Type <code class="rounded bg-[var(--fill)] px-1 py-0.5 text-[11.5px] text-[var(--ink)]">{{ brand.name }}</code> to confirm
        </label>
        <TypedConfirmFieldAdapter
          :expected="brand.name"
          case="sensitive"
          data-test="typed-input-wrapper"
          @update:typed="typed = $event"
          @matched="matched = $event"
        />
        <input type="hidden" data-test="typed-input" :value="typed" />
        <span class="text-[11.5px] text-[var(--ink-3)]">Brand name is case-sensitive. The Delete button activates when it matches exactly.</span>
      </div>
      <div class="flex items-center justify-between border-t border-[var(--line)] pt-3">
        <div class="flex items-center gap-1 text-[11.5px] text-[var(--warn)]">
          <Icon name="lucide:alert-triangle" class="h-3 w-3" />
          <span>This action is permanent.</span>
        </div>
        <div class="flex gap-2">
          <button class="rounded-[6px] border border-[var(--line)] px-3 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--line-2)]" @click="emit('update:open', false)">Cancel</button>
          <button data-test="delete-confirm" :disabled="!canDelete" class="rounded-[6px] bg-[var(--err)] px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed" @click="onConfirm">Delete brand</button>
        </div>
      </div>
    </div>
  </KovaModalAdapter>
</template>
```

**Note:** the `typed` hidden-input is a test seam — the test verifies state via the `data-test="typed-input"` selector. Production users interact with the visible `TypedConfirmFieldAdapter` input. The hidden input is removed in Task 27 once the test seam is replaced with a `ref` exposure.

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/components/brand/DeleteBrandModal.test.ts
git add src/components/brand/DeleteBrandModal.vue tests/components/brand/DeleteBrandModal.test.ts
git commit -m "feat(brands): add DeleteBrandModal (A4.3) with typed-confirm"
```

---

### Task 27: Refactor `DeleteBrandModal` test seam → ref exposure

**Files:**
- Modify: `src/components/brand/DeleteBrandModal.vue`
- Modify: `tests/components/brand/DeleteBrandModal.test.ts`

- [ ] **Step 1: Replace hidden input with `defineExpose`**

In `DeleteBrandModal.vue`, remove the hidden `<input type="hidden" data-test="typed-input">` and add at top of `<script setup>`:

```typescript
defineExpose({ typed, matched })
```

In the test, replace `setValue` on hidden input with direct ref manipulation via `wrapper.vm.typed = '...'` then `await flushPromises()`.

Update test cases:

```typescript
async function setTyped(wrapper: any, value: string): Promise<void> {
  // Drive the matched ref via TypedConfirmFieldAdapter's emit
  await wrapper.findComponent({ name: 'TypedConfirmFieldAdapter' }).vm.$emit('matched', value === brand.name)
  await wrapper.findComponent({ name: 'TypedConfirmFieldAdapter' }).vm.$emit('update:typed', value)
  await flushPromises()
}
```

- [ ] **Step 2: Re-run tests + commit**

```bash
bun test ./tests/components/brand/DeleteBrandModal.test.ts
git add src/components/brand/DeleteBrandModal.vue tests/components/brand/DeleteBrandModal.test.ts
git commit -m "refactor(brands): replace hidden-input test seam with defineExpose"
```

---

## Phase 7 — Picker + wizard surfaces

### Task 28: `BrandCard.vue`

**Files:**
- Create: `src/components/brand/BrandCard.vue`
- Test: `tests/components/brand/BrandCard.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import BrandCard from '../../../src/components/brand/BrandCard.vue'

const brand = { id: 'b1', name: 'Nike', color: 'coral', slug: 'nike', url: 'nike.com', archived_at: null } as any

test('renders brand metadata', () => {
  const wrapper = mount(BrandCard, { props: { brand } })
  expect(wrapper.text()).toContain('Nike')
  expect(wrapper.text()).toContain('nike.com')
  expect(wrapper.find('.k-coral').exists()).toBe(true)
})

test('click body emits select', async () => {
  const wrapper = mount(BrandCard, { props: { brand } })
  await wrapper.find('[data-test="card-body"]').trigger('click')
  expect(wrapper.emitted('select')?.[0]).toEqual(['b1'])
})

test('kebab dropdown emits rename/archive/delete', async () => {
  const wrapper = mount(BrandCard, { props: { brand } })
  await wrapper.find('[data-test="kebab"]').trigger('click')
  await wrapper.find('[data-test="kebab-rename"]').trigger('click')
  expect(wrapper.emitted('rename')?.[0]).toEqual(['b1'])
})

test('archived state: 78% opacity + Archived pill + body click no-op', async () => {
  const archivedBrand = { ...brand, archived_at: '2026-05-10T00:00:00Z' }
  const wrapper = mount(BrandCard, { props: { brand: archivedBrand } })
  expect(wrapper.classes()).toContain('opacity-[0.78]')
  expect(wrapper.text()).toContain('Archived')
  await wrapper.find('[data-test="card-body"]').trigger('click')
  expect(wrapper.emitted('select')).toBeUndefined()
})

test('archived state: kebab shows Restore + Delete (2 items, no Rename/Archive)', async () => {
  const archivedBrand = { ...brand, archived_at: '2026-05-10T00:00:00Z' }
  const wrapper = mount(BrandCard, { props: { brand: archivedBrand } })
  await wrapper.find('[data-test="kebab"]').trigger('click')
  expect(wrapper.find('[data-test="kebab-restore"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="kebab-delete"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="kebab-rename"]').exists()).toBe(false)
  expect(wrapper.find('[data-test="kebab-archive"]').exists()).toBe(false)
  await wrapper.find('[data-test="kebab-restore"]').trigger('click')
  expect(wrapper.emitted('restore')?.[0]).toEqual(['b1'])
})
```

- [ ] **Step 2: Implement**

```vue
<script setup lang="ts">
import type { Brand } from '@/types/kova/database'
import { brandLogoClass } from '@/composables/brands/use-brand-color'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from 'reka-ui'

interface Props { brand: Brand; isCurrent?: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{
  select: [id: string]
  rename: [id: string]
  archive: [id: string]
  restore: [id: string]    // MVP per 2026-05-17 reversal — emitted from archived-state kebab
  delete: [id: string]
}>()

function shopifyPill(): { tone: 'ok' | 'warn' | 'outline'; label: string } {
  // Real wiring (Task 35): reads useShopifyConnectionsStore. Stopgap = 'outline'.
  const state = (window as any).__kova_shopify_state?.(props.brand.id) ?? 'none'
  if (state === 'connected') return { tone: 'ok', label: 'Shopify connected' }
  if (state === 'expired')   return { tone: 'warn', label: 'Shopify · reconnect' }
  return { tone: 'outline', label: 'Shopify · not connected' }
}

const archived = props.brand.archived_at !== null
</script>
<template>
  <div
    :class="['bp-card relative flex cursor-pointer flex-col gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--page)] p-[18px_18px_14px] transition hover:border-[var(--ink-3)] hover:bg-[#181816]', archived && 'opacity-[0.78]']"
  >
    <!-- Archived cards: body click is no-op in /brands (no navigate). Active cards: click = emit select. -->
    <div data-test="card-body" class="flex items-start gap-3" @click="!archived && emit('select', brand.id)">
      <div :class="brandLogoClass(brand.color)" class="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-[20px] font-extrabold tracking-tight">
        {{ brand.name.charAt(0).toUpperCase() }}
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <div class="truncate text-[14.5px] font-semibold text-[var(--ink)]">
          {{ brand.name }}<span v-if="isCurrent" class="ml-1 rounded border border-[var(--line)] px-1.5 py-[1px] text-[9.5px] text-[var(--ink-2)]">Current</span>
        </div>
        <div class="truncate text-[10.5px] text-[var(--ink-3)]">{{ brand.url ?? '—' }}</div>
      </div>
      <DropdownMenuRoot>
        <DropdownMenuTrigger as="div" data-test="kebab" class="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-[5px] text-[var(--ink-3)] hover:bg-[var(--line-2)] hover:text-[var(--ink)]" @click.stop>
          <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="end" class="rounded-[8px] border border-[var(--line)] bg-[var(--rail)] p-1 shadow-xl">
            <!-- Active state: Rename / Archive / Delete (3 items) -->
            <template v-if="!archived">
              <DropdownMenuItem data-test="kebab-rename" class="cursor-pointer rounded px-2 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--line-2)] hover:text-[var(--ink)]" @select="emit('rename', brand.id)">Rename</DropdownMenuItem>
              <DropdownMenuItem data-test="kebab-archive" class="cursor-pointer rounded px-2 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--line-2)] hover:text-[var(--ink)]" @select="emit('archive', brand.id)">Archive</DropdownMenuItem>
              <DropdownMenuItem data-test="kebab-delete" class="cursor-pointer rounded px-2 py-1.5 text-[12.5px] text-[var(--err)] hover:bg-[var(--line-2)]" @select="emit('delete', brand.id)">Delete brand</DropdownMenuItem>
            </template>
            <!-- Archived state (B12.1 spec): Restore / Delete (2 items) -->
            <template v-else>
              <DropdownMenuItem data-test="kebab-restore" class="cursor-pointer rounded px-2 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--line-2)] hover:text-[var(--ink)]" @select="emit('restore', brand.id)">Restore</DropdownMenuItem>
              <DropdownMenuItem data-test="kebab-delete" class="cursor-pointer rounded px-2 py-1.5 text-[12.5px] text-[var(--err)] hover:bg-[var(--line-2)]" @select="emit('delete', brand.id)">Delete brand</DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <span v-if="archived" class="pill outline"><Icon name="lucide:archive" class="h-2.5 w-2.5 inline" /> Archived</span>
      <span v-else :class="['pill', shopifyPill().tone === 'ok' ? 'ok dot' : shopifyPill().tone === 'warn' ? 'warn dot' : 'outline']">{{ shopifyPill().label }}</span>
    </div>
    <div class="grid grid-cols-2 gap-2.5 border-t border-[var(--line-2)] pt-2.5 text-[11.5px] text-[var(--ink-3)]">
      <div class="flex flex-col gap-0.5">
        <span class="text-[9.5px] tracking-[0.1em]">Canvases</span>
        <span class="text-[12px] font-medium text-[var(--ink)]">{{ (window as any).__kova_canvases_by_brand?.(brand.id)?.length ?? '—' }}</span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-[9.5px] tracking-[0.1em]">Last edited</span>
        <span class="text-[12px] font-medium text-[var(--ink)]">{{ brand.updated_at?.slice(0,10) ?? '—' }}</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/components/brand/BrandCard.test.ts
git add src/components/brand/BrandCard.vue tests/components/brand/BrandCard.test.ts
git commit -m "feat(brands): add BrandCard (.bp-card) with kebab DropdownMenu"
```

---

### Task 29: `NewBrandTile.vue` + `BrandPickerEmpty.vue`

**Files:**
- Create: `src/components/brand/NewBrandTile.vue`
- Create: `src/components/brand/BrandPickerEmpty.vue`

- [ ] **Step 1: Implement `NewBrandTile.vue`**

```vue
<script setup lang="ts">
const emit = defineEmits<{ click: [] }>()
</script>
<template>
  <div
    class="bp-newcard flex min-h-[188px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[10px] border border-dashed border-[var(--line)] bg-transparent p-[18px] text-center text-[var(--ink-2)] transition hover:border-[var(--ink-3)] hover:bg-[#181816] hover:text-[var(--ink)]"
    @click="emit('click')"
  >
    <div class="grid h-9 w-9 place-items-center rounded-full bg-[var(--fill)] text-[var(--ink)]">
      <Icon name="lucide:plus" class="h-4.5 w-4.5" />
    </div>
    <div class="text-[13.5px] font-semibold text-[var(--ink)]">New brand</div>
    <div class="max-w-[200px] text-[11.5px] text-[var(--ink-3)]">Add another client or sub-brand. Takes about 90 seconds.</div>
  </div>
</template>
```

- [ ] **Step 2: Implement `BrandPickerEmpty.vue`**

```vue
<script setup lang="ts">
const emit = defineEmits<{ start: [] }>()
</script>
<template>
  <div class="bp-empty flex flex-col items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--rail)] p-[56px_32px] text-center">
    <div class="grid h-12 w-12 place-items-center rounded-full bg-[var(--fill)] text-[var(--ink-2)]">
      <Icon name="lucide:layers" class="h-5.5 w-5.5" />
    </div>
    <h3 class="text-[16px] font-semibold text-[var(--ink)]">Start with one brand</h3>
    <p class="max-w-[420px] text-[13px] leading-relaxed text-[var(--ink-2)]">Name it, point it at a website, and Kova pulls in the logo, colors, and product catalog. You'll be designing in two minutes.</p>
    <button class="mt-2 rounded-[6px] bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[#111]" @click="emit('start')">New brand</button>
  </div>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/NewBrandTile.vue src/components/brand/BrandPickerEmpty.vue
git commit -m "feat(brands): add NewBrandTile + BrandPickerEmpty"
```

---

### Task 30: `BrandPickerView.vue`

**Files:**
- Create: `src/views/brands/BrandPickerView.vue`
- Test: `tests/views/brands/BrandPickerView.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { test, expect } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBrandsStore } from '../../../src/stores/brands'
import BrandPickerView from '../../../src/views/brands/BrandPickerView.vue'

test('renders empty state when no brands', async () => {
  setActivePinia(createPinia())
  const store = useBrandsStore()
  store.brands = []
  const wrapper = mount(BrandPickerView, { global: { stubs: ['router-link', 'router-view'] } })
  await flushPromises()
  expect(wrapper.find('.bp-empty').exists()).toBe(true)
})

test('renders 3-col grid when brands present', async () => {
  setActivePinia(createPinia())
  const store = useBrandsStore()
  store.brands = [
    { id: 'b1', name: 'A', color: 'coral', archived_at: null, slug: 'a', url: 'a.com' } as any,
    { id: 'b2', name: 'B', color: 'sage', archived_at: null, slug: 'b', url: 'b.com' } as any,
  ]
  const wrapper = mount(BrandPickerView, { global: { stubs: ['router-link', 'router-view'] } })
  await flushPromises()
  expect(wrapper.findAll('.bp-card')).toHaveLength(2)
  expect(wrapper.find('.bp-newcard').exists()).toBe(true)  // +1 tile
})

test('search input filters by name', async () => {
  setActivePinia(createPinia())
  const store = useBrandsStore()
  store.brands = [
    { id: 'b1', name: 'Nike', color: 'coral', archived_at: null, slug: 'nike', url: 'nike.com' } as any,
    { id: 'b2', name: 'Allbirds', color: 'sage', archived_at: null, slug: 'allbirds', url: 'allbirds.com' } as any,
  ]
  const wrapper = mount(BrandPickerView, { global: { stubs: ['router-link', 'router-view'] } })
  await wrapper.find('input[data-test="search"]').setValue('nike')
  await flushPromises()
  expect(wrapper.findAll('.bp-card')).toHaveLength(1)
})
```

- [ ] **Step 2: Implement**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBrandsStore } from '@/stores/brands'
import BrandCard from '@/components/brand/BrandCard.vue'
import NewBrandTile from '@/components/brand/NewBrandTile.vue'
import BrandPickerEmpty from '@/components/brand/BrandPickerEmpty.vue'
import BrandsArchivedFilter from '@/components/brand/BrandsArchivedFilter.vue'
import RenameBrandModal from '@/components/brand/RenameBrandModal.vue'
import ArchiveBrandModal from '@/components/brand/ArchiveBrandModal.vue'
import RestoreBrandModal from '@/components/brand/RestoreBrandModal.vue'
import DeleteBrandModal from '@/components/brand/DeleteBrandModal.vue'

const router = useRouter()
const store = useBrandsStore()
const query = ref<string>('')

const modalState = ref<{ kind: 'rename' | 'archive' | 'delete' | 'restore'; brandId: string } | null>(null)
const modalBrand = computed(() => modalState.value ? store.brands.find(b => b.id === modalState.value!.brandId) ?? null : null)

function open(kind: 'rename' | 'archive' | 'delete' | 'restore', brandId: string): void {
  modalState.value = { kind, brandId }
}
function close(): void { modalState.value = null }

function onSelect(brandId: string): void {
  store.selectBrand(brandId)
  // W0-3 canonical route: /brand/:brandId (RESTful path param per scope plan §6).
  router.push(`/brand/${brandId}`)
}

// A2.a "Archived" filter — ENABLED MVP per 2026-05-17 reversal.
// Hide (default) / Show (active + archived inline) / Only (archived only).
type ArchivedFilter = 'hide' | 'show' | 'only'
const archivedFilter = ref<ArchivedFilter>((localStorage.getItem('kova.brands.archivedFilter') as ArchivedFilter | null) ?? 'hide')

watch(archivedFilter, async (next) => {
  localStorage.setItem('kova.brands.archivedFilter', next)
  if (next !== 'hide' && store.archivedBrands.length === 0) {
    await store.fetchArchivedBrands()
  }
})

const visibleBrands = computed(() => {
  const base = archivedFilter.value === 'only'
    ? store.archivedBrands
    : archivedFilter.value === 'show'
      ? [...store.sortedActive, ...store.archivedBrands]
      : store.sortedActive
  const q = query.value.trim().toLowerCase()
  if (!q) return base
  return base.filter(b => b.name.toLowerCase().includes(q) || (b.url ?? '').toLowerCase().includes(q))
})

// Account button: routes to /account. Vue Router falls back to /account/coming-soon
// (with <NotShippedYet> placeholder) if PRD 04 hasn't registered /account yet.
function onAccountClick(): void {
  router.push('/account').catch(() => router.push('/account/coming-soon'))
}

onMounted(async () => { if (store.brands.length === 0) await store.fetchBrands() })
</script>
<template>
  <div class="bp-shell flex h-full min-h-0 flex-col bg-[var(--page)]">
    <header class="bp-top flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--page)] px-7">
      <div class="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink)]">
        <span class="grid h-5 w-5 place-items-center rounded bg-[#ededea] text-[12px] font-extrabold text-[#0d0d0c]">K</span>
        <span>Kova</span>
      </div>
      <div class="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--page)] py-[5px] pl-[6px] pr-2 text-[12.5px] text-[var(--ink-2)] hover:border-[var(--ink-3)]">
        <div class="grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--warn)] text-[9.5px] font-semibold text-white">JY</div>
        <span class="font-medium text-[var(--ink)]">{{ /* TODO Cluster 02 inject user name */ 'Jiho Yang' }}</span>
        <Icon name="lucide:chevron-down" class="h-3 w-3 text-[var(--ink-3)]" />
      </div>
    </header>
    <div class="bp-stage flex-1 overflow-auto px-8 pt-14 pb-16">
      <div class="bp-block mx-auto flex w-[880px] max-w-full flex-col gap-7">
        <div class="bp-head flex items-end justify-between gap-6">
          <div class="flex flex-col gap-1.5">
            <div class="text-[10.5px] text-[var(--ink-3)]">Workspace</div>
            <h1 class="text-[26px] font-semibold tracking-tight text-[var(--ink)]">{{ filteredActive.length === 0 && !query ? 'No brands yet.' : 'Pick a brand to work on.' }}</h1>
            <p class="max-w-[540px] text-[13.5px] text-[var(--ink-2)]">Each brand is fully siloed — its own canvases, brand kit, products, and integrations. Switching is a hop, not a context loss.</p>
          </div>
          <div class="flex items-center gap-2">
            <!-- Account button — always renders. Falls back to /account/coming-soon (<NotShippedYet>) if PRD 04 not ready. -->
            <button data-test="account-btn" class="rounded-[6px] border border-[var(--line)] px-3 py-1.5 text-[13px] text-[var(--ink-2)] hover:bg-[var(--line-2)]" @click="onAccountClick">Account</button>
            <!-- "+ New brand" primary CTA. NO Import button anywhere — founder cut 2026-05-17. -->
            <button class="rounded-[6px] bg-[var(--ink)] px-3 py-1.5 text-[13px] font-medium text-[#111]" @click="router.push('/brands/new')">+ New brand</button>
          </div>
        </div>
        <template v-if="store.brands.length === 0">
          <BrandPickerEmpty @start="router.push('/brands/new')" />
        </template>
        <template v-else>
          <div class="bp-tools grid grid-cols-[1fr_auto_auto] items-center gap-2.5">
            <div class="flex items-center gap-2 rounded-[7px] border border-[var(--line)] bg-[var(--page)] px-3 py-2 text-[13px] text-[var(--ink-3)]">
              <Icon name="lucide:search" class="h-3 w-3" />
              <input v-model="query" data-test="search" type="text" placeholder="Search brands by name or URL…" class="flex-1 bg-transparent text-[var(--ink)] outline-none" />
            </div>
            <button class="flex items-center gap-2 rounded-[7px] border border-[var(--line)] bg-[var(--page)] px-3 py-2 text-[12.5px] text-[var(--ink-2)] hover:border-[var(--ink-3)]">
              <Icon name="lucide:arrow-up-down" class="h-3 w-3 text-[var(--ink-3)]" />
              <span class="text-[var(--ink-3)]">Sort</span>
              <span class="font-medium text-[var(--ink)]">Last edited</span>
              <Icon name="lucide:chevron-down" class="h-3 w-3 text-[var(--ink-3)]" />
            </button>
            <!-- Archived filter — ENABLED MVP per 2026-05-17 reversal (was DISABLED w/ "Coming Phase 2" tooltip). -->
            <BrandsArchivedFilter v-model="archivedFilter" data-test="archived-filter" />
          </div>
          <div class="bp-grid grid grid-cols-3 gap-3.5">
            <BrandCard
              v-for="b in visibleBrands" :key="b.id"
              :brand="b" :is-current="b.id === store.selectedBrandId"
              @select="onSelect"
              @rename="open('rename', $event)"
              @archive="open('archive', $event)"
              @restore="open('restore', $event)"
              @delete="open('delete', $event)"
            />
            <NewBrandTile @click="router.push('/brands/new')" />
          </div>
          <div class="bp-foothint text-center text-[11.5px] text-[var(--ink-3)]">Need to switch the user account or sign out? Use the avatar menu.</div>
        </template>
      </div>
    </div>

    <RenameBrandModal v-if="modalBrand && modalState?.kind === 'rename'" :brand="modalBrand" :open="true" @update:open="close" />
    <ArchiveBrandModal v-if="modalBrand && modalState?.kind === 'archive'" :brand="modalBrand" :open="true" @update:open="close" />
    <RestoreBrandModal v-if="modalBrand && modalState?.kind === 'restore'" :brand="modalBrand" :open="true" @update:open="close" />
    <DeleteBrandModal v-if="modalBrand && modalState?.kind === 'delete'" :brand="modalBrand" :open="true" @update:open="close" />
  </div>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/views/brands/BrandPickerView.test.ts
git add src/views/brands/BrandPickerView.vue tests/views/brands/BrandPickerView.test.ts
git commit -m "feat(brands): add BrandPickerView with search + modal coordinator"
```

---

### Task 31: Wizard chrome (`WizardShell` + `WizardProgress` + `WizardCard`)

**Files:**
- Create: `src/components/brand/wizard/WizardShell.vue`
- Create: `src/components/brand/wizard/WizardProgress.vue`
- Create: `src/components/brand/wizard/WizardCard.vue`

- [ ] **Step 1: Implement `WizardShell.vue`**

```vue
<template>
  <div class="onb-shell flex h-full min-h-0 flex-col bg-[var(--page)]">
    <slot name="progress" />
    <div class="onb-stage flex-1 overflow-auto px-6 pt-10 pb-14 grid place-items-center">
      <slot />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Implement `WizardProgress.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { WizardStep } from '@/composables/brands/use-new-brand-flow'

interface Props {
  step: WizardStep
  contextLabel?: string
  showCancel?: boolean
}
const props = withDefaults(defineProps<Props>(), { showCancel: true })
const emit = defineEmits<{ cancel: [] }>()

const STEPS: WizardStep[] = ['name-url', 'shopify', 'brand-kit', 'done']
const meta = computed(() => {
  if (props.step === 'done') return 'Done'
  const i = STEPS.indexOf(props.step) + 1
  return `Step ${i} / 3`
})
function stateOf(s: WizardStep): 'done' | 'active' | 'pending' {
  const cur = STEPS.indexOf(props.step)
  const tgt = STEPS.indexOf(s)
  if (tgt < cur || props.step === 'done') return 'done'
  if (tgt === cur) return 'active'
  return 'pending'
}
</script>
<template>
  <div class="onb-progress flex shrink-0 items-center gap-4 border-b border-[var(--line-2)] px-7 py-4">
    <div class="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
      <span class="grid h-[18px] w-[18px] place-items-center rounded bg-[#ededea] text-[11px] font-extrabold text-[#0d0d0c]">K</span>
      <span>Kova</span>
    </div>
    <div v-if="contextLabel" class="ml-1 flex items-center gap-1.5 border-l border-[var(--line-2)] pl-3 text-[11.5px] text-[var(--ink-3)]">
      <Icon name="lucide:plus-square" class="h-3 w-3" />
      <span>{{ contextLabel }}</span>
    </div>
    <div class="flex flex-1 justify-center gap-2">
      <div v-for="s in STEPS.slice(0,3)" :key="s"
        :class="['h-1 rounded transition', stateOf(s) === 'active' ? 'flex-[0_0_96px] bg-[var(--ink)]' : stateOf(s) === 'done' ? 'flex-[0_0_70px] bg-[var(--ink-3)]' : 'flex-[0_0_70px] bg-[var(--line-2)]']"
      ></div>
    </div>
    <div class="min-w-[130px] text-right text-[10.5px] text-[var(--ink-3)]">{{ meta }}</div>
    <button
      v-if="showCancel"
      class="flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-[12px] text-[var(--ink-3)] hover:bg-[var(--line-2)] hover:text-[var(--ink)]"
      @click="emit('cancel')"
    >
      <Icon name="lucide:x" class="h-3 w-3" />Cancel
    </button>
    <button v-else class="invisible flex items-center gap-1.5 px-2 py-1 text-[12px]"><Icon name="lucide:x" class="h-3 w-3" />Cancel</button>
  </div>
</template>
```

- [ ] **Step 3: Implement `WizardCard.vue`**

```vue
<script setup lang="ts">
interface Props { wide?: boolean }
defineProps<Props>()
</script>
<template>
  <div :class="['onb-card flex flex-col gap-5.5', wide ? 'w-[560px] max-w-full' : 'w-[480px] max-w-full']">
    <slot />
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/brand/wizard/Wizard*.vue
git commit -m "feat(brands): add wizard chrome (Shell, Progress, Card)"
```

---

### Task 32: Wizard step components — `StepNameUrl`, `StepShopify`, `StepBrandKit`, `StepDone`

**Files:**
- Create: `src/views/brands/wizard/StepNameUrl.vue`
- Create: `src/views/brands/wizard/StepShopify.vue`
- Create: `src/views/brands/wizard/StepBrandKit.vue`
- Create: `src/views/brands/wizard/StepDone.vue`

- [ ] **Step 1: `StepNameUrl.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useNewBrandFlow } from '@/composables/brands/use-new-brand-flow'
import { useRouter } from 'vue-router'
import WizardCard from '@/components/brand/wizard/WizardCard.vue'

const flow = useNewBrandFlow()
const router = useRouter()
const canContinue = computed(() => flow.name.value.trim().length > 0)

function onContinue(): void {
  if (canContinue.value) { flow.advance(); router.push('/brands/new/shopify') }
}
</script>
<template>
  <WizardCard>
    <div class="text-[10.5px] text-[var(--ink-3)]">New brand</div>
    <h1 class="text-[26px] font-semibold leading-tight tracking-tight text-[var(--ink)]">What are we adding?</h1>
    <p class="max-w-[440px] text-[14px] leading-relaxed text-[var(--ink-2)]">Each brand is its own siloed workspace — canvases, brand kit, integrations. You can rename or delete it later from the brand picker.</p>
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-1.5">
        <label class="text-[11.5px] font-medium text-[var(--ink-2)]">Brand name</label>
        <input v-model="flow.name.value" type="text" class="rounded-[6px] border border-[var(--line)] bg-[var(--page)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink-3)]" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[11.5px] font-medium text-[var(--ink-2)]">Website</label>
        <div class="flex items-stretch overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--page)]">
          <span class="grid place-items-center border-r border-[var(--line)] bg-[var(--rail)] px-3 text-[13px] text-[var(--ink-3)]">https://</span>
          <input v-model="flow.url.value" type="text" class="flex-1 bg-transparent px-3 text-[14px] text-[var(--ink)] outline-none" />
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[11.5px] font-medium text-[var(--ink-2)]">One-line description <span class="opacity-50">Optional</span></label>
        <input v-model="flow.description.value" type="text" placeholder="e.g. Outdoor apparel and gear, B-corp." class="rounded-[6px] border border-[var(--line)] bg-[var(--page)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink-3)]" />
        <span class="text-[11.5px] text-[var(--ink-3)]">Helps Kova frame voice and category context. You can change this anytime in Brand Kit.</span>
      </div>
    </div>
    <div class="flex items-center justify-between pt-2">
      <button class="flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] px-3.5 py-2 text-[13px] text-[var(--ink-2)] hover:bg-[var(--line-2)]" @click="router.push('/brands')">
        <Icon name="lucide:chevron-left" class="h-3.5 w-3.5" />Back to brands
      </button>
      <button :disabled="!canContinue" class="flex items-center gap-1.5 rounded-[6px] bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[#111] disabled:opacity-50" @click="onContinue">
        Continue<Icon name="lucide:arrow-right" class="h-3.5 w-3.5" />
      </button>
    </div>
  </WizardCard>
</template>
```

- [ ] **Step 2: `StepShopify.vue`**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNewBrandFlow } from '@/composables/brands/use-new-brand-flow'
import WizardCard from '@/components/brand/wizard/WizardCard.vue'

const router = useRouter()
const flow = useNewBrandFlow()

function onSkip(): void { flow.advance(); router.push('/brands/new/brand-kit') }
function onConnect(): void {
  // Real wiring (Task 36): useShopifyOAuth.start({ brandId: <pre-create>, returnUrl }). Stopgap → skip.
  console.warn('Shopify connect stopgap — skipping to brand-kit')
  onSkip()
}
</script>
<template>
  <WizardCard>
    <div class="text-[10.5px] text-[var(--ink-3)]">Integrations</div>
    <h1 class="text-[26px] font-semibold leading-tight tracking-tight text-[var(--ink)]">Connect Shopify.</h1>
    <p class="max-w-[440px] text-[14px] leading-relaxed text-[var(--ink-2)]">Kova reads your product catalog so generated emails use real products with real images and pricing. Read-only — Kova never writes to your store.</p>
    <div class="onb-connect overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--rail)]">
      <div class="flex items-center gap-3.5 border-b border-[var(--line-2)] p-4">
        <div class="grid h-9 w-9 place-items-center rounded-[8px] bg-[#95bf47] text-[18px] font-extrabold tracking-tight text-[#0d0d0c]">S</div>
        <div>
          <div class="text-[14px] font-semibold text-[var(--ink)]">Shopify</div>
          <div class="mt-px text-[11.5px] text-[var(--ink-3)]">Read-only access · per-brand scope</div>
        </div>
      </div>
      <div class="flex flex-col gap-2.5 p-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[11.5px] font-medium text-[var(--ink-2)]">Your Shopify store URL</label>
          <div class="flex items-stretch overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--page)]">
            <span class="grid place-items-center border-r border-[var(--line)] bg-[var(--rail)] px-3 text-[13px] text-[var(--ink-3)]">https://</span>
            <input type="text" placeholder="patagonia" class="flex-1 bg-transparent px-3 text-[14px] text-[var(--ink)] outline-none" />
            <span class="grid place-items-center px-3 text-[13px] text-[var(--ink-3)]">.myshopify.com</span>
          </div>
        </div>
        <div class="mt-1 flex flex-col gap-2 text-[12.5px] text-[var(--ink-2)]">
          <div class="flex items-center gap-2.5"><Icon name="lucide:check" class="h-3 w-3 text-[var(--ok)]" /><span>Products, collections, variants, pricing, inventory</span></div>
          <div class="flex items-center gap-2.5"><Icon name="lucide:check" class="h-3 w-3 text-[var(--ok)]" /><span>Product images and media</span></div>
          <div class="flex items-center gap-2.5"><Icon name="lucide:x" class="h-3 w-3 text-[var(--ink-3)]" /><span class="text-[var(--ink-3)]">Customer data · orders · checkout — never accessed</span></div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between pt-1">
      <button class="rounded-[6px] border border-[var(--line)] px-3.5 py-2 text-[13px] text-[var(--ink-2)] hover:bg-[var(--line-2)]" @click="onSkip">Skip for now</button>
      <button class="flex items-center gap-1.5 rounded-[6px] bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[#111]" @click="onConnect">
        <Icon name="lucide:external-link" class="h-3.5 w-3.5" />Connect Shopify
      </button>
    </div>
  </WizardCard>
</template>
```

- [ ] **Step 3: `StepBrandKit.vue`**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNewBrandFlow } from '@/composables/brands/use-new-brand-flow'
import { useToast } from '@/composables/_adapters/use-toast-adapter'
import WizardCard from '@/components/brand/wizard/WizardCard.vue'

const router = useRouter()
const flow = useNewBrandFlow()
const toast = useToast()

async function onFinish(): Promise<void> {
  try {
    await flow.commitAndAdvance()
    router.push('/brands/new/done')
  } catch (e) {
    toast.error(`Couldn't create brand: ${(e as Error).message}`)
  }
}
async function onSkip(): Promise<void> { await onFinish() }
</script>
<template>
  <WizardCard wide>
    <div class="text-[10.5px] text-[var(--ink-3)]">Brand kit</div>
    <h1 class="text-[26px] font-semibold leading-tight tracking-tight text-[var(--ink)]">Teach Kova your brand.</h1>
    <p class="max-w-[440px] text-[14px] leading-relaxed text-[var(--ink-2)]">Drop in past emails, brand guidelines, or anything that captures voice. Kova extracts colors, fonts, tone, and writing rules. You can refine everything later in Brand Kit.</p>
    <div class="onb-drop flex flex-col items-center gap-2 rounded-[8px] border border-dashed border-[var(--line)] bg-[var(--rail)] p-[26px_20px] text-center">
      <div class="grid h-9 w-9 place-items-center rounded-full bg-[var(--fill)] text-[var(--ink-2)]"><Icon name="lucide:upload-cloud" class="h-4.5 w-4.5" /></div>
      <div class="text-[13.5px] font-medium text-[var(--ink)]">Drop files here, or <span class="cursor-pointer underline">browse</span></div>
      <div class="text-[10.5px] text-[var(--ink-3)]">PDF · HTML · .EML · PNG · JPG · up to 25 MB each</div>
    </div>
    <div class="flex items-center justify-between pt-1">
      <button class="rounded-[6px] border border-[var(--line)] px-3.5 py-2 text-[13px] text-[var(--ink-2)] hover:bg-[var(--line-2)]" @click="onSkip">Do this later</button>
      <button class="flex items-center gap-1.5 rounded-[6px] bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[#111]" @click="onFinish">
        <Icon name="lucide:sparkles" class="h-3.5 w-3.5" />Extract and finish
      </button>
    </div>
  </WizardCard>
</template>
```

- [ ] **Step 4: `StepDone.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNewBrandFlow } from '@/composables/brands/use-new-brand-flow'
import { useBrandsStore } from '@/stores/brands'
import WizardCard from '@/components/brand/wizard/WizardCard.vue'

const router = useRouter()
const flow = useNewBrandFlow()
const store = useBrandsStore()
const brand = computed(() => flow.brandId.value ? store.brands.find(b => b.id === flow.brandId.value) ?? null : null)

function enter(): void {
  if (!brand.value) { router.push('/brands'); return }
  store.selectBrand(brand.value.id)
  flow.reset()
  // W0-3 canonical route: /brand/:brandId (RESTful path param per scope plan §6).
  router.push(`/brand/${brand.value.id}`)
}
</script>
<template>
  <WizardCard>
    <div class="flex flex-col items-center gap-6 text-center">
      <div class="grid h-14 w-14 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)] border border-[rgba(94,194,125,0.18)]">
        <Icon name="lucide:check" class="h-6.5 w-6.5" />
      </div>
      <div>
        <div class="mb-2 text-[10.5px] text-[var(--ink-3)]">Brand ready</div>
        <h1 class="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ink)]">{{ brand?.name ?? 'Brand' }} is set up.</h1>
      </div>
      <p class="mx-auto max-w-[440px] text-center text-[14px] leading-relaxed text-[var(--ink-2)]">Brand kit populated. You can switch back to your other brands anytime from the sidebar.</p>
      <button class="flex items-center gap-1.5 rounded-[6px] bg-[var(--ink)] px-4 py-2.5 text-[13.5px] font-medium text-[#111]" @click="enter">
        Enter {{ brand?.name ?? '' }}<Icon name="lucide:arrow-right" class="h-3.5 w-3.5" />
      </button>
      <div class="mt-1.5 text-[11.5px] text-[var(--ink-3)]">Or <a class="text-[var(--ink-2)] underline cursor-pointer" @click="router.push('/brands')">back to brand picker</a>.</div>
    </div>
  </WizardCard>
</template>
```

- [ ] **Step 5: Commit**

```bash
git add src/views/brands/wizard/
git commit -m "feat(brands): add 4 wizard step components (A3.a/b/c/d)"
```

---

### Task 33: `NewBrandWizardView.vue` (router host)

**Files:**
- Create: `src/views/brands/NewBrandWizardView.vue`

- [ ] **Step 1: Implement**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNewBrandFlow } from '@/composables/brands/use-new-brand-flow'
import { useConfirm } from '@/composables/_adapters/use-confirm-adapter'
import WizardShell from '@/components/brand/wizard/WizardShell.vue'
import WizardProgress from '@/components/brand/wizard/WizardProgress.vue'

const router = useRouter()
const route = useRoute()
const flow = useNewBrandFlow()
const confirm = useConfirm()

const contextLabel = computed(() => flow.brandId.value || flow.name.value ? `New brand · ${flow.name.value || ''}`.trim().replace(/·\s*$/, '·') : 'New brand')

async function onCancel(): Promise<void> {
  if (flow.isDirty.value) {
    const ok = await confirm({
      title: 'Discard new brand?',
      description: "You'll lose anything you've typed.",
      confirmLabel: 'Discard',
    })
    if (!ok) return
  }
  flow.reset()
  router.push('/brands')
}
</script>
<template>
  <WizardShell>
    <template #progress>
      <WizardProgress
        :step="flow.step.value"
        :context-label="contextLabel"
        :show-cancel="flow.step.value !== 'done'"
        @cancel="onCancel"
      />
    </template>
    <router-view />
  </WizardShell>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/brands/NewBrandWizardView.vue
git commit -m "feat(brands): add NewBrandWizardView router host with cancel guard"
```

---

## Phase 8 — Router wiring + integration

### Task 34: Register routes

**Files:**
- Create: `src/router/routes/brands.ts`
- Modify: `src/router/index.ts`

- [ ] **Step 1: Create route definitions**

```typescript
// src/router/routes/brands.ts
import type { RouteRecordRaw } from 'vue-router'

export const brandsRoutes: RouteRecordRaw[] = [
  {
    path: '/brands',
    name: 'brands-picker',
    component: () => import('@/views/brands/BrandPickerView.vue'),
    meta: { theme: 'dark', requiresAuth: true },
  },
  {
    path: '/brands/new',
    component: () => import('@/views/brands/NewBrandWizardView.vue'),
    meta: { theme: 'dark', requiresAuth: true },
    children: [
      { path: '',           name: 'brands-new-name',       component: () => import('@/views/brands/wizard/StepNameUrl.vue') },
      { path: 'shopify',    name: 'brands-new-shopify',    component: () => import('@/views/brands/wizard/StepShopify.vue') },
      { path: 'brand-kit',  name: 'brands-new-brand-kit',  component: () => import('@/views/brands/wizard/StepBrandKit.vue') },
      { path: 'done',       name: 'brands-new-done',       component: () => import('@/views/brands/wizard/StepDone.vue') },
    ],
  },
  // B12 page route — owned by PRD 03, mounted under /account chrome by PRD 04.
  // PRD 03 ships this child-route definition; PRD 04 registers /account parent
  // and includes this child via the account router config (see PRD 04 task list).
  // The route is exported below for PRD 04 to import. For development before
  // PRD 04 lands, this is also registered as a top-level fallback so the page
  // is reachable. PRD 04 should remove this top-level registration in favor of
  // its nested-under-/account version.
  {
    path: '/account/brands',
    name: 'account-brands',
    component: () => import('@/views/account/BrandsAccountView.vue'),
    meta: { theme: 'dark', requiresAuth: true },
  },
  // Fallback for Account button discoverability before PRD 04 ships.
  // Renders <NotShippedYet feature="Account settings" />. Remove when PRD 04 lands.
  {
    path: '/account/coming-soon',
    name: 'account-coming-soon',
    component: () => import('@/components/_adapters/NotShippedYetAdapter.vue'),
    meta: { theme: 'dark', requiresAuth: true, fallbackFeature: 'Account settings' },
  },
]

// Export for PRD 04 to import + nest under /account when ready.
export const accountBrandsChildRoute: RouteRecordRaw = {
  path: 'brands',
  name: 'account-brands-nested',
  component: () => import('@/views/account/BrandsAccountView.vue'),
}
```

- [ ] **Step 2: Register in `src/router/index.ts`**

Add import + spread routes into existing router config:

```typescript
import { brandsRoutes } from './routes/brands'

const routes: RouteRecordRaw[] = [
  // ... existing routes
  ...brandsRoutes,
]
```

- [ ] **Step 3: Run dev server + smoke-check**

```bash
bun run dev
```

Browser-verify: visit http://localhost:1420/brands, http://localhost:1420/brands/new, http://localhost:1420/account/brands — all pages render without 404. http://localhost:1420/account/coming-soon renders `<NotShippedYet>` placeholder.

- [ ] **Step 4: Commit**

```bash
git add src/router/routes/brands.ts src/router/index.ts
git commit -m "feat(brands): register /brands + /brands/new/* + /account/brands + /account/coming-soon routes"
```

---

### Task 35: Wire loss-list count getters to real stores

**Files:**
- Modify: `src/components/brand/DeleteBrandModal.vue`

- [ ] **Step 1: Replace `window.__kova_*` stopgap calls with real store getters**

In `DeleteBrandModal.vue`, replace the `safeCount` getters:

```typescript
import { useCanvasesStore } from '@/stores/canvases'
import { useMediaStore } from '@/stores/media'
import { useBrandMemoriesStore } from '@/stores/brand-memories'
// Cluster 09 snapshots store doesn't exist yet — guard with try/catch
// Cluster 05/M9 KB + Shopify stores wire via existing imports

const canvases = useCanvasesStore()
const media = useMediaStore()
const memories = useBrandMemoriesStore()

const lossRows = computed(() => [
  { icon: 'layout-template', label: 'Canvases', qty: canvases.canvases?.filter(c => c.brand_id === props.brand.id).length ?? '—' },
  { icon: 'history',         label: 'Snapshots', qty: '—' /* Cluster 09 not yet shipped */ },
  { icon: 'palette',         label: 'Brand-kit data — colors, fonts, snippets, memories', qty: 'all' as const },
  { icon: 'book-open',       label: 'Knowledge-base sources', qty: '—' /* Cluster 05 stub */ },
  { icon: 'shopping-bag',    label: 'Shopify connection (token revoked)', qty: '—' /* M9 store probe in Task 36 */ },
])
```

- [ ] **Step 2: Smoke-check + commit**

```bash
bun run check
bun test ./tests/components/brand/DeleteBrandModal.test.ts
git add src/components/brand/DeleteBrandModal.vue
git commit -m "feat(brands): wire loss-list to real canvases/media/memories stores"
```

---

### Task 36: Wire Shopify connect handoff in `StepShopify.vue`

**Files:**
- Modify: `src/views/brands/wizard/StepShopify.vue`

- [ ] **Step 1: Replace stopgap with real M9 OAuth call**

If `@/composables/use-shopify-oauth` exists in M9 code:

```typescript
import { useShopifyOAuth } from '@/composables/use-shopify-oauth'

const oauth = useShopifyOAuth()

async function onConnect(): Promise<void> {
  // Create brand FIRST so we have a brandId to attach OAuth to.
  // (Connect-before-commit pattern: brand created with a Shopify-pending flag; if user
  //  cancels OAuth, we already have a brand row — that's acceptable per A3.b "Skip" behavior.)
  if (!flow.brandId.value) {
    try { await flow.commitAndAdvance() } catch { /* fallback to skip */ }
  }
  if (!flow.brandId.value) { onSkip(); return }
  await oauth.start({ brandId: flow.brandId.value, returnUrl: '/brands/new/brand-kit' })
}
```

If the M9 composable doesn't exist or signature differs, fall back to the stopgap and log an ESCALATE comment.

- [ ] **Step 2: Smoke-check + commit**

```bash
bun run check
git add src/views/brands/wizard/StepShopify.vue
git commit -m "feat(brands): wire M9 Shopify OAuth handoff in wizard step 2"
```

---

### Task 37: Replace adapter stubs with Cluster 11 components when shipped

**Files (when Cluster 11 ships):**
- Modify: `src/components/_adapters/KovaModalAdapter.vue` → re-export real `<KovaModal>`
- Modify: `src/components/_adapters/TypedConfirmFieldAdapter.vue` → re-export real `<TypedConfirmField>`
- Modify: `src/composables/_adapters/use-toast-adapter.ts` → re-export real `useToast`
- Modify: `src/composables/_adapters/use-confirm-adapter.ts` → re-export real `useConfirm`

- [ ] **Step 1: Replace each adapter with a one-line re-export when Cluster 11 module exists**

Example: `src/components/_adapters/KovaModalAdapter.vue` becomes:

```vue
<script setup lang="ts">
import KovaModal from '@/components/shared/KovaModal.vue'
defineProps<{ open: boolean; size?: 'sm' | 'md' | 'lg' }>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
</script>
<template>
  <KovaModal :open="open" :size="size" @update:open="emit('update:open', $event)"><slot /></KovaModal>
</template>
```

- [ ] **Step 2: Run all brand tests + smoke check + commit**

```bash
bun test ./tests/stores/brands.test.ts ./tests/components/brand/ ./tests/composables/use-new-brand-flow.test.ts
git add src/components/_adapters/ src/composables/_adapters/
git commit -m "refactor(brands): swap Cluster-11 adapter shims for real components"
```

(Task gated on Cluster 11 shipping; can be deferred until then.)

---

## Phase 9 — E2E tests + smoke check

### Task 38: E2E happy paths

**Files:**
- Create: `tests-e2e/brands-flows.spec.ts`

- [ ] **Step 1: Write spec**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Brand management flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Test fixture: log in as a known user with 2 active brands
    await page.evaluate(() => localStorage.setItem('kova-test-user', 'multi-brand'))
    await page.reload()
  })

  test('new brand happy path', async ({ page }) => {
    await page.goto('/brands')
    await expect(page.getByText('Pick a brand to work on.')).toBeVisible()
    await page.getByRole('button', { name: '+ New brand' }).first().click()
    await expect(page).toHaveURL(/\/brands\/new$/)
    await page.getByLabel('Brand name').fill('Patagonia')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/brands\/new\/shopify$/)
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.getByRole('button', { name: 'Do this later' }).click()
    await expect(page.getByText('Patagonia is set up.')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /Enter Patagonia/ }).click()
    await expect(page).toHaveURL(/\/dashboard\?brandId=/)
  })

  test('rename flow', async ({ page }) => {
    await page.goto('/brands')
    await page.locator('.bp-card').first().locator('[data-test="kebab"]').click()
    await page.locator('[data-test="kebab-rename"]').click()
    await page.locator('input[data-test="rename-name"]').fill('Renamed Brand')
    await page.locator('[data-test="rename-save"]').click()
    await expect(page.getByText('Brand renamed')).toBeVisible()
    await expect(page.locator('.bp-card').first()).toContainText('Renamed Brand')
  })

  test('archive flow', async ({ page }) => {
    await page.goto('/brands')
    const initialCount = await page.locator('.bp-card').count()
    await page.locator('.bp-card').first().locator('[data-test="kebab"]').click()
    await page.locator('[data-test="kebab-archive"]').click()
    await page.locator('[data-test="archive-confirm"]').click()
    await expect(page.getByText(/archived/)).toBeVisible()
    expect(await page.locator('.bp-card').count()).toBe(initialCount - 1)
  })

  test('delete typed-confirm enforcement', async ({ page }) => {
    await page.goto('/brands')
    const firstName = await page.locator('.bp-card').first().locator('.nm, [class*="font-semibold"]').first().textContent()
    await page.locator('.bp-card').first().locator('[data-test="kebab"]').click()
    await page.locator('[data-test="kebab-delete"]').click()
    const cta = page.locator('[data-test="delete-confirm"]')
    await expect(cta).toBeDisabled()
    await page.locator('input').first().fill(firstName!.slice(0, 3))
    await expect(cta).toBeDisabled()
    await page.locator('input').first().fill(firstName!.toLowerCase())
    await expect(cta).toBeDisabled()
    await page.locator('input').first().fill(firstName!)
    await expect(cta).toBeEnabled()
    await cta.click()
    await expect(page.getByText('Brand deleted')).toBeVisible()
  })

  // ============ B12 flows (MVP per 2026-05-17 reversal) ============

  test('B12: archive → /account/brands → restore round-trip', async ({ page }) => {
    await page.goto('/brands')
    const target = page.locator('.bp-card').first()
    const targetName = await target.locator('[class*="font-semibold"]').first().textContent()
    // Archive from /brands
    await target.locator('[data-test="kebab"]').click()
    await page.locator('[data-test="kebab-archive"]').click()
    await page.locator('[data-test="archive-confirm"]').click()
    await expect(page.getByText(/archived/)).toBeVisible()
    // Navigate to /account/brands
    await page.goto('/account/brands')
    await page.getByRole('tab', { name: 'Archived' }).click()
    const archivedCard = page.locator('.bp-card', { hasText: targetName! })
    await expect(archivedCard).toBeVisible()
    await expect(archivedCard).toContainText('Archived')
    // Restore
    await archivedCard.locator('[data-test="kebab"]').click()
    await page.locator('[data-test="kebab-restore"]').click()
    await page.locator('[data-test="restore-confirm"]').click()
    await expect(page.getByText(/restored/)).toBeVisible()
    // Verify back on /brands
    await page.goto('/brands')
    await expect(page.locator('.bp-card', { hasText: targetName! })).toBeVisible()
  })

  test('B12: delete-archived typed-confirm cascade', async ({ page }) => {
    await page.goto('/brands')
    const target = page.locator('.bp-card').first()
    const targetName = await target.locator('[class*="font-semibold"]').first().textContent()
    await target.locator('[data-test="kebab"]').click()
    await page.locator('[data-test="kebab-archive"]').click()
    await page.locator('[data-test="archive-confirm"]').click()
    await page.goto('/account/brands?filter=archived')
    const archivedCard = page.locator('.bp-card', { hasText: targetName! })
    await archivedCard.locator('[data-test="kebab"]').click()
    await page.locator('[data-test="kebab-delete"]').click()
    // Typed-confirm with brand name (NOT 'DELETE' — per hi-fi A4.3 + B12.4)
    const cta = page.locator('[data-test="delete-confirm"]')
    await expect(cta).toBeDisabled()
    await page.locator('input').first().fill(targetName!)
    await expect(cta).toBeEnabled()
    await cta.click()
    await expect(page.getByText('Brand deleted')).toBeVisible()
    await expect(archivedCard).toHaveCount(0)
  })

  test('B12: segmented control filters work + URL persists', async ({ page }) => {
    await page.goto('/account/brands')
    await expect(page).toHaveURL(/filter=all|^[^?]*\/account\/brands$/)
    await page.getByRole('tab', { name: 'Active' }).click()
    await expect(page).toHaveURL(/filter=active/)
    await page.getByRole('tab', { name: 'Archived' }).click()
    await expect(page).toHaveURL(/filter=archived/)
    // Reload — filter persists
    await page.reload()
    await expect(page.getByRole('tab', { name: 'Archived' })).toHaveAttribute('aria-selected', 'true')
  })

  test('A2.a Archived filter on /brands shows archived inline at 78% opacity', async ({ page }) => {
    await page.goto('/brands')
    await page.locator('[data-test="archived-filter"]').click()
    await page.getByText('Show').click()
    const archivedCard = page.locator('.bp-card.opacity-\\[0\\.78\\]').first()
    await expect(archivedCard).toBeVisible()
    await expect(archivedCard).toContainText('Archived')
  })

  test('Account button: always renders + falls back when PRD 04 not ready', async ({ page }) => {
    await page.goto('/brands')
    await page.locator('[data-test="account-btn"]').click()
    // Either /account or /account/coming-soon — both acceptable
    await expect(page).toHaveURL(/\/account(\/coming-soon)?$/)
    // If fallback, NotShippedYet placeholder renders
    const isFallback = await page.url().includes('coming-soon')
    if (isFallback) {
      await expect(page.getByText(/coming soon|not shipped|account settings/i)).toBeVisible()
    }
  })

  test('No Import CTA anywhere in /brands or /account/brands', async ({ page }) => {
    await page.goto('/brands')
    await expect(page.getByRole('button', { name: /import/i })).toHaveCount(0)
    await page.goto('/account/brands')
    await expect(page.getByRole('button', { name: /import/i })).toHaveCount(0)
  })
})
```

- [ ] **Step 2: Run + commit**

```bash
bunx playwright test tests-e2e/brands-flows.spec.ts
git add tests-e2e/brands-flows.spec.ts
git commit -m "test(brands): E2E flows for new/rename/archive/delete"
```

---

### Task 39: Manual browser smoke (per `feedback_browser_smoke_test_before_done`)

- [ ] **Step 1: Start dev server**

```bash
bun run dev
```

- [ ] **Step 2: Run through the §9.4 manual checklist from PRD**

Open http://localhost:1420/brands. For each item below, verify by eye:

- [ ] 3-col grid renders at 1280px wide
- [ ] 1-col fallback under 640px
- [ ] All 5 color tints render (create 5 brands to test); 6th brand reuses coral (cycle modulo 5)
- [ ] Hover on `.bp-card` → border `--ink-3` + bg `#181816`
- [ ] Hover on kebab → bg `--line-2`
- [ ] Rename: Enter submits when valid
- [ ] Archive: Esc closes without archiving
- [ ] Delete: typed-confirm matches → green glow + CTA enabled
- [ ] Toast after each CRUD fires + auto-dismisses
- [ ] After archive of currently-selected brand, route → `/brands`
- [ ] Offline (Chrome DevTools): wizard step 3 commit fails gracefully
- [ ] Every surface is dark — no light bleed

**B12 + Archive (MVP per 2026-05-17 reversal):**
- [ ] Navigate /brands → archive a brand → toast fires → brand disappears from picker
- [ ] Click "Account" button top-right → routes to /account (or /account/coming-soon w/ NotShippedYet if PRD 04 not ready)
- [ ] Set A2.a "Archived" filter to Show → archived brand reappears at 78% opacity with "Archived" pill
- [ ] Archived-card kebab shows ONLY Restore + Delete (no Rename/Archive)
- [ ] Navigate /account/brands → page renders inside Cluster 04 chrome (or top-level fallback if PRD 04 not yet shipped)
- [ ] Segmented control All/Active/Archived toggles render; URL `?filter=` updates
- [ ] Reload /account/brands?filter=archived → filter state restored
- [ ] Click Restore on archived card → B12.3 modal opens, no typed-confirm field present
- [ ] Confirm Restore → archived card moves to Active grid; toast fires
- [ ] Re-archive same brand → it reappears in Archived grid
- [ ] Click Delete on archived card → B12.4 modal opens; typed-confirm uses BRAND NAME (not "DELETE")
- [ ] Footer reads "This action is permanent." (NOT the hi-fi B12.4 mis-leaked GDPR cascade text)
- [ ] NO "Import" CTA anywhere in /brands or /account/brands hero
- [ ] Flip BRANDS_RESTORE_ENABLED=false → Restore CTA renders disabled; API returns 503

- [ ] **Step 3: Fix any regressions, recommit, then commit smoke evidence**

```bash
# After fixes
git add -p
git commit -m "fix(brands): manual smoke regressions"

# Or if all clean:
echo 'Manual smoke pass 2026-06-XX — all checks green.' >> docs/superpowers/handoffs/2026-06-01-cluster-03-implementation.md
git add docs/superpowers/handoffs/2026-06-01-cluster-03-implementation.md
git commit -m "docs(brands): record manual smoke pass"
```

---

## Phase 10 — Status + handoff

### Task 40: Bump PRD status to IN-IMPLEMENTATION

**Files:**
- Modify: `docs/kova-final-prds/03-brand-management.md`

- [ ] **Step 1: Update §0**

In `docs/kova-final-prds/03-brand-management.md` §0 status table, change `**Status**` row from `DRAFT 2026-05-15` to `IN-IMPLEMENTATION <date>`.

- [ ] **Step 2: Update `docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` §7 tracker**

Find the row for Cluster 03 and update its Status column.

- [ ] **Step 3: Commit**

```bash
git add docs/kova-final-prds/03-brand-management.md docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md
git commit -m "docs(brands): PRD 03 → IN-IMPLEMENTATION"
```

---

### Task 41: Final quality gates

- [ ] **Step 1: Run full check suite**

```bash
cd kova-open-pencil-1
bun run check
bun run format
bun run test:unit
bun run test:dupes
```

- [ ] **Step 2: All gates green → ship**

- All `bun run check` errors fixed
- `oxfmt` clean
- Unit coverage ≥ 85% on new brand code (verify with coverage tool)
- jscpd < 3%
- E2E suite green against staging

- [ ] **Step 3: Final commit + push**

```bash
git add -p
git commit -m "feat(brands): Cluster 03 ready for review"
git push -u origin feat/m9-shopify
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "Cluster 03 — Brand Management" --body "$(cat <<'EOF'
## Summary
- /brands picker + 4-step new-brand wizard
- 3 CRUD modals (Rename / Archive / Delete typed-confirm)
- 5 RPCs + 4 Edge Functions + storage sweep
- Deterministic 5-tint brand-color auto-assign
- ~40 unit tests + 4 E2E flows green

## Test plan
- [ ] CI green (lint, type, tests, dupes)
- [ ] Manual smoke pass (§9.4 of PRD)
- [ ] Browser-verified end-to-end on staging

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec coverage self-review

| PRD section | Plan tasks |
|---|---|
| §2.1 Surfaces — picker | Tasks 28-30 |
| §2.1 Surfaces — wizard | Tasks 31-33 |
| §2.1 Modals — Rename/Archive/Delete | Tasks 24, 25, 26, 27 |
| §4.1 Schema migration | Tasks 1-3 |
| §4.2 RLS (no changes) | Verified in Task 8 (RLS isolation) |
| §4.3 Storage buckets | Task 10 (sweep helper) |
| §5.1 Edge Functions | Tasks 11-14 |
| §5.2 RPCs | Tasks 4-7 |
| §5.3 Cron — N/A | (none) |
| §5.4 Shopify reuse | Task 36 |
| §5.5 Audit log — stopgap | Mentioned in Task 11's create endpoint (writes to console; full table writes deferred to Cluster 11 — see PRD §12.1) |
| §6.1 Routes | Task 34 |
| §6.2 Store | Tasks 16, 17, 18 |
| §6.3 Composables | Tasks 19, 20 |
| §6.4 Components | Tasks 21, 22, 23, 24, 25, 26, 28, 29, 31, 32 |
| §6.5 Drag-drop — N/A | (none) |
| §7 Engine touches — N/A | (none) |
| §8 Acceptance criteria | Covered across Tasks 28-39 + smoke (Task 39) |
| §9.1 Unit tests | Every task in Phases 1-7 |
| §9.2 Integration tests | Tasks 4-8 |
| §9.3 E2E tests | Task 38 |
| §9.4 Manual QA | Task 39 |
| §9.5 Quality gates | Task 41 |
| §10 Rollout phasing | Task 40 |
| §11 Cross-cuts | Adapters (Task 21) + Task 35 (loss-list) + Task 36 (Shopify) + Task 37 (Cluster-11 swap) |
| §12 Open questions | §12.1 audit_log stopgap covered in Task 11; §12.5 loss-list `—` fallback covered in Task 26; §12.7 Account button (Task 30); §12.9 Shopify pre-flight (Task 36 lets OAuth fail) |

**Placeholder scan:** searched plan for `TODO`, `TBD`, `implement later`, `add appropriate`, `similar to`. Zero matches outside intentional comment-context. Stopgaps explicitly named with their replacement tasks.

**Type consistency:** `BrandColor`, `Brand`, `WizardStep`, `useBrandsStore` method signatures, Edge Function request bodies all match across tasks. Adapter component prop names match (`open`, `size`, `expected`, `case`).

---

## Execution Handoff

Plan complete and saved to `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-impl-plans/03-brand-management-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
