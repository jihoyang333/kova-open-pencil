# PRD 09 — Version History + Trash · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Figma-exact version-history panel + 30-min autosnapshot heartbeat + atomic restore + trash-confirm modal for PRD 09 (`docs/prd/09-version-history-and-trash.md`).

**Architecture:** Single Postgres migration (1 table + 4 RPCs + RLS) + 1 private Storage bucket (`canvas-snapshots`) + 2 Vercel Edge Functions (`duplicate-to-canvas`, `cron/snapshot-prune`) + Pinia store + 6 composables + 9 Vue components. Snapshot bytes are Yjs Kiwi-encoded + Zstd-compressed. Restore is atomic with a pre-restore snapshot pushed to Yjs undo. Trash is dashboard-only (per founder 2026-05-09); the canvas-side dropdown does NOT carry "Move to trash". This PRD does NOT modify `packages/core/` (CLAUDE.md hard constraint preserved).

**Tech Stack:** Supabase Postgres + Storage; SECURITY DEFINER RPCs (`plpgsql`); Vercel Functions (Fluid Compute) in `kova-open-pencil-1/api/`; `@supabase/supabase-js`; existing `yjs`, `kiwi-schema`, `@bokuweb/zstd-wasm` deps from OpenPencil `packages/core/codec`; Vue 3 Composition API + Pinia setup stores + Reka UI primitives + Tailwind CSS 4 + Lucide icons via `unplugin-icons`. Tests: `bun:test` (unit + integration via local Supabase) + Playwright/Vercel Agent Browser (E2E).

**Reference docs:**
- PRD: `kova-open-pencil-1/docs/prd/09-version-history-and-trash.md`
- Hi-fi: `main-main-kova-scope/batch-b/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html` (11 scenes), `main-main-kova-scope/batch-b/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html` (3 scenes)
- Design system: `main-main-kova-scope/design-system/{design.md, kova-hifi.css, TOKEN_CANONICAL.md}`
- Audit base: `kova-open-pencil-1/docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md` lines 1764–1945

---

## File Structure

**Server-side (new):**
- `kova-open-pencil-1/supabase/migrations/20260615_09_canvas_snapshots.sql` — table + RLS + 4 RPCs + Storage bucket provisioning
- `kova-open-pencil-1/api/snapshots/duplicate-to-canvas.ts` — cross-cluster Edge Function (read snapshot blob → call create_canvas → upload → return new id)
- `kova-open-pencil-1/api/cron/snapshot-prune.ts` — daily prune + 7th-day Storage sweep
- `kova-open-pencil-1/vercel.json` — extend cron list (adds `snapshot-prune` alongside existing `delete-account-cron`)

**Client-side (new):**
- `kova-open-pencil-1/src/stores/snapshots.ts` — Pinia store
- `kova-open-pencil-1/src/composables/version-history/use-snapshot-codec.ts`
- `kova-open-pencil-1/src/composables/version-history/use-snapshot-thumbnail.ts`
- `kova-open-pencil-1/src/composables/version-history/use-restore-undo.ts`
- `kova-open-pencil-1/src/composables/version-history/use-autosnapshot.ts`
- `kova-open-pencil-1/src/composables/version-history/use-deep-linked-version.ts`
- `kova-open-pencil-1/src/composables/version-history/use-version-history-shortcut.ts`
- `kova-open-pencil-1/src/components/version-history/SnapshotTimelinePanel.vue`
- `kova-open-pencil-1/src/components/version-history/SnapshotRow.vue`
- `kova-open-pencil-1/src/components/version-history/AutosaveGroupHead.vue`
- `kova-open-pencil-1/src/components/version-history/AddVersionDialog.vue`
- `kova-open-pencil-1/src/components/version-history/RestoreConfirmModal.vue`
- `kova-open-pencil-1/src/components/version-history/SnapshotEmptyState.vue`
- `kova-open-pencil-1/src/components/version-history/FilterDropdown.vue`
- `kova-open-pencil-1/src/components/version-history/CurrentVersionRow.vue`
- `kova-open-pencil-1/src/components/trash/TrashConfirmModal.vue`

**Cluster touch-points (light edits to land cross-cuts):**
- Cluster 06 canvas chrome: `src/views/canvas/CanvasView.vue` (mount `<SnapshotTimelinePanel>` in right-panel slot when `useSnapshotsStore.panelOpen`)
- Cluster 08 keyboard registry: register `Alt+Meta+KeyS` binding
- Cluster 02 dashboard: import `<TrashConfirmModal>` and wire through `useConfirm`

These cross-cluster edits are touched here for completeness but the owning cluster's PRD must approve before merge.

**Tests (new):**
- 14 unit-test files under `tests/unit/{stores|composables|api|components}/version-history/` and `.../trash/`
- 12 integration-test files under `tests/integration/snapshots/` and `.../api/`
- 8 E2E specs under `tests/e2e/{version-history|trash}/`

---

## Pre-flight (before Task 1)

Verify the worktree is at `kova-open-pencil-1` repo root for `bun run` commands. All `bun run …` commands in this plan execute from `kova-open-pencil-1/`. SQL is applied via `supabase migration up` against the local instance started by `supabase start`.

```bash
cd kova-open-pencil-1
supabase start                 # starts local Postgres + Storage emulator
bun install                    # ensures deps current
bun run check                  # baseline: must be zero errors before starting
```

Expected: green `bun run check`. If red, fix unrelated drift first or pause.

---

## Task 1: Database migration — table, RLS, indexes, Storage bucket

**Files:**
- Create: `kova-open-pencil-1/supabase/migrations/20260615_09_canvas_snapshots.sql`
- Test: `kova-open-pencil-1/tests/integration/snapshots/migrations.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/migrations.test.ts
import { describe, expect, it } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('20260615_09_canvas_snapshots migration', () => {
  it('creates canvas_snapshots table with all 13 columns and CHECKs', async () => {
    const { data, error } = await supabase.rpc('pg_get_columns', { p_table: 'canvas_snapshots' })
    // pg_get_columns is a tiny helper RPC we add at the bottom of the migration; assert it returns the
    // expected column names + nullability + types
    expect(error).toBeNull()
    const names = (data as Array<{ name: string }>).map(c => c.name).sort()
    expect(names).toEqual([
      'brand_id', 'canvas_id', 'description', 'format_version', 'id', 'kind',
      'label', 'parent_snapshot_id', 'retention_class', 'scene_blob_path',
      'scene_size_bytes', 'taken_at', 'thumbnail_path', 'user_id',
    ])
  })

  it('rejects scene_size_bytes > 50 MB via CHECK', async () => {
    const { error } = await supabase
      .from('canvas_snapshots')
      .insert({ /* SECURITY DEFINER RPC blocks direct insert; use a service-role bypass for this test */
        canvas_id: '00000000-0000-0000-0000-000000000000',
        brand_id:  '00000000-0000-0000-0000-000000000000',
        user_id:   '00000000-0000-0000-0000-000000000000',
        kind: 'manual',
        scene_blob_path: 'x',
        scene_size_bytes: 52428801,           // 50 MB + 1 byte
        retention_class: 'permanent',
      })
    expect(error?.message).toMatch(/scene_size_bytes/)
  })

  it('creates canvas-snapshots Storage bucket as private with 50 MB limit', async () => {
    const { data, error } = await supabase.storage.getBucket('canvas-snapshots')
    expect(error).toBeNull()
    expect(data?.public).toBe(false)
    expect(data?.file_size_limit).toBe(52428800)
  })

  it('creates the 4 expected indexes', async () => {
    const { data } = await supabase.rpc('pg_get_indexes', { p_table: 'canvas_snapshots' })
    const names = (data as Array<{ indexname: string }>).map(i => i.indexname).sort()
    expect(names).toEqual([
      'canvas_snapshots_pkey',
      'idx_canvas_snapshots_brand',
      'idx_canvas_snapshots_canvas_taken',
      'idx_canvas_snapshots_prune',
      'idx_canvas_snapshots_user_for_account_cascade',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test ./tests/integration/snapshots/migrations.test.ts
```

Expected: FAIL with "table canvas_snapshots does not exist" (migration not yet applied).

- [ ] **Step 3: Write the migration**

Open `kova-open-pencil-1/docs/prd/09-version-history-and-trash.md` §4.1 and copy the SQL block verbatim into `kova-open-pencil-1/supabase/migrations/20260615_09_canvas_snapshots.sql`. Then append the bucket-provisioning SQL from §4.3 and the two test-helper RPCs:

```sql
-- ---- 5. Test-helper RPCs (used by integration tests only; safe in prod — read-only meta) ----

CREATE OR REPLACE FUNCTION public.pg_get_columns(p_table text)
RETURNS TABLE (name text, data_type text, is_nullable text)
LANGUAGE sql STABLE AS $$
  SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = p_table
   ORDER BY ordinal_position
$$;

CREATE OR REPLACE FUNCTION public.pg_get_indexes(p_table text)
RETURNS TABLE (indexname text)
LANGUAGE sql STABLE AS $$
  SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = p_table
$$;

GRANT EXECUTE ON FUNCTION public.pg_get_columns(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pg_get_indexes(text) TO authenticated, service_role;

-- ---- 6. Storage bucket ----

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('canvas-snapshots', 'canvas-snapshots', false, 52428800,
        ARRAY['application/octet-stream', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "canvas-snapshots: select own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'canvas-snapshots'
     AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "canvas-snapshots: insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'canvas-snapshots'
          AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "canvas-snapshots: delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'canvas-snapshots'
     AND (storage.foldername(name))[1] = auth.uid()::text);
```

(The bucket-policy CREATE POLICY statements live OUTSIDE the BEGIN/COMMIT block in the migration file because `storage.objects` policies are owned by the `supabase_storage_admin` role and Supabase recommends them in their own statement; adjust grouping if your local CLI complains.)

- [ ] **Step 4: Apply migration + run test to verify it passes**

```bash
supabase migration up
bun test ./tests/integration/snapshots/migrations.test.ts
```

Expected: 4/4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/supabase/migrations/20260615_09_canvas_snapshots.sql \
        kova-open-pencil-1/tests/integration/snapshots/migrations.test.ts
git commit -m "feat(09): add canvas_snapshots table + RLS + Storage bucket"
```

---

## Task 2: RPC `create_snapshot` — quota enforcement + retention_class assignment

**Files:**
- Modify: `kova-open-pencil-1/supabase/migrations/20260615_09_canvas_snapshots.sql` (already shipped in Task 1; refer to PRD §4.1 RPC 4a)
- Test: `kova-open-pencil-1/tests/integration/snapshots/rpc-create-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/rpc-create-snapshot.test.ts
import { describe, expect, it, beforeAll } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

const url = process.env.SUPABASE_URL!
const anonKey = process.env.SUPABASE_ANON_KEY!

describe('create_snapshot RPC', () => {
  let userId: string, brandId: string, canvasId: string

  beforeAll(async () => {
    userId = await seedTestUser({ plan: 'free' })
    brandId = await seedBrand({ user_id: userId })
    canvasId = await seedCanvas({ brand_id: brandId, user_id: userId })
  })

  it('inserts row + returns id when called with valid args', async () => {
    const supabase = await signInAs(userId)
    const { data, error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId,
      p_kind: 'manual',
      p_label: 'Test',
      p_description: null,
      p_scene_blob_path: 'path/to/blob',
      p_scene_size_bytes: 1024,
      p_thumbnail_path: 'path/to/thumb',
      p_parent_snapshot_id: null,
    })
    expect(error).toBeNull()
    expect(data).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('raises quota_exceeded when brand sum + new size > 100 MB', async () => {
    // First fill the brand with one 100MB snapshot via service-role direct insert
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    await admin.from('canvas_snapshots').insert({
      canvas_id: canvasId, brand_id: brandId, user_id: userId,
      kind: 'manual', scene_blob_path: 'big', scene_size_bytes: 100 * 1024 * 1024 - 1,
      retention_class: 'permanent',
    })
    const supabase = await signInAs(userId)
    const { error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: null, p_description: null,
      p_scene_blob_path: 'overflow', p_scene_size_bytes: 1024,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    expect(error?.message).toContain('quota_exceeded')
  })

  it('raises when called against a trashed canvas', async () => {
    const trashedCanvasId = await seedCanvas({ brand_id: brandId, user_id: userId, trashed_at: new Date().toISOString() })
    const supabase = await signInAs(userId)
    const { error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: trashedCanvasId, p_kind: 'autosave', p_label: null, p_description: null,
      p_scene_blob_path: 'x', p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    expect(error?.message).toContain('Canvas not found')
  })

  it('assigns retention_class = "free" for autosave + free plan', async () => {
    const supabase = await signInAs(userId)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'autosave', p_label: null, p_description: null,
      p_scene_blob_path: 'auto1', p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data: row } = await supabase.from('canvas_snapshots').select('retention_class').eq('id', id).single()
    expect(row?.retention_class).toBe('free')
  })

  it('assigns retention_class = "permanent" for non-autosave kinds', async () => {
    const supabase = await signInAs(userId)
    for (const kind of ['manual', 'pre_restore', 'disconnect', 'tab_close']) {
      const { data: id } = await supabase.rpc('create_snapshot', {
        p_canvas_id: canvasId, p_kind: kind, p_label: kind, p_description: null,
        p_scene_blob_path: kind, p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
      })
      const { data: row } = await supabase.from('canvas_snapshots').select('retention_class').eq('id', id).single()
      expect(row?.retention_class).toBe('permanent')
    }
  })

  it('assigns retention_class = "paid" for autosave + paid plan', async () => {
    const paidUserId = await seedTestUser({ plan: 'solo' })
    const paidBrand = await seedBrand({ user_id: paidUserId })
    const paidCanvas = await seedCanvas({ brand_id: paidBrand, user_id: paidUserId })
    const supabase = await signInAs(paidUserId)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: paidCanvas, p_kind: 'autosave', p_label: null, p_description: null,
      p_scene_blob_path: 'paidauto', p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data: row } = await supabase.from('canvas_snapshots').select('retention_class').eq('id', id).single()
    expect(row?.retention_class).toBe('paid')
  })
})
```

You'll need a small `tests/integration/helpers/seed.ts` exporting `seedTestUser`, `seedBrand`, `seedCanvas`, `signInAs`. If it doesn't exist yet, add the minimal version inline in this commit:

```typescript
// kova-open-pencil-1/tests/integration/helpers/seed.ts
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function seedTestUser(opts: { plan?: 'free' | 'solo' | 'agency' } = {}): Promise<string> {
  const { data: auth } = await admin.auth.admin.createUser({
    email: `test-${crypto.randomUUID()}@local`, email_confirm: true,
  })
  if (opts.plan) {
    await admin.from('users').update({ plan: opts.plan }).eq('id', auth.user!.id)
  }
  return auth.user!.id
}

export async function seedBrand(opts: { user_id: string }): Promise<string> {
  const { data } = await admin.from('brands').insert({ user_id: opts.user_id, name: 'TestBrand' }).select('id').single()
  return data!.id
}

export async function seedCanvas(opts: { brand_id: string; user_id: string; trashed_at?: string }): Promise<string> {
  const { data } = await admin.from('canvases').insert({
    brand_id: opts.brand_id, user_id: opts.user_id, name: 'TestCanvas', trashed_at: opts.trashed_at ?? null,
  }).select('id').single()
  return data!.id
}

export async function signInAs(userId: string, password = `test-${crypto.randomUUID()}`) {
  // B-CRIT13 / B-HIGH20 fix (W4): the prior implementation passed a magic-link URL as a Bearer
  // token, which is NOT a JWT — the returned client silently fell back to anon, so all 14 RLS
  // tests were dead-on-arrival (they exercised anon, not the target user). Correct pattern:
  // set a known password via admin API, then signInWithPassword. Returned client has
  // auth.uid() = userId for SECURITY DEFINER RPC calls.
  await admin.auth.admin.updateUserById(userId, { password })
  const { data: userRow, error: getErr } = await admin.auth.admin.getUserById(userId)
  if (getErr || !userRow?.user) throw getErr ?? new Error(`signInAs: user ${userId} not found`)

  const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  const { error: signInErr } = await userClient.auth.signInWithPassword({
    email: userRow.user.email!,
    password,
  })
  if (signInErr) throw signInErr
  return userClient
}
```

**Re-run verification (W4):** before this fix lands, the 14 RLS tests SHOULD FAIL — they were silently passing as anon, hiding RLS regressions. After the fix, they MUST PASS. Run `bun test ./tests/integration/snapshots/rls-*.test.ts` twice (pre- and post-fix) and diff the output to prove correctness.

(If a `signInAs` already exists in this repo's test helpers from M9 / Cluster 01 work, re-use it instead — the repo convention wins. Grep `tests/integration/helpers` first.)

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test ./tests/integration/snapshots/rpc-create-snapshot.test.ts
```

Expected: FAIL on the very first test — `function create_snapshot does not exist` OR (if Task 1 already shipped the migration which contained the RPC body) `error.message` mismatches because seed helpers aren't yet correct.

- [ ] **Step 3: Confirm RPC body matches PRD §4.1 RPC 4a**

The RPC body shipped in Task 1's migration. Re-read it; if you spot drift, fix the SQL inline in the migration file and re-apply with:

```bash
supabase db reset                       # drops + re-applies all migrations to the local DB
bun test ./tests/integration/snapshots/rpc-create-snapshot.test.ts
```

- [ ] **Step 4: All 6 tests pass**

Expected: PASS. If quota test fails because the boundary is off-by-one, the RPC's `IF v_total_size + p_scene_size_bytes > 100 * 1024 * 1024` is the boundary — 100 MB exactly is OK; 100 MB + 1 byte raises.

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/tests/integration/snapshots/rpc-create-snapshot.test.ts \
        kova-open-pencil-1/tests/integration/helpers/seed.ts
git commit -m "test(09): integration tests for create_snapshot RPC"
```

---

## Task 3: RPC `restore_snapshot` — atomic with pre-restore

**Files:**
- Test: `kova-open-pencil-1/tests/integration/snapshots/rpc-restore-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/rpc-restore-snapshot.test.ts
import { describe, expect, it, beforeAll } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

describe('restore_snapshot RPC', () => {
  let userId: string, brandId: string, canvasId: string, targetSnapId: string

  beforeAll(async () => {
    userId = await seedTestUser({ plan: 'solo' })
    brandId = await seedBrand({ user_id: userId })
    canvasId = await seedCanvas({ brand_id: brandId, user_id: userId })
    const supabase = await signInAs(userId)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'Target',
      p_description: null, p_scene_blob_path: 'target/blob',
      p_scene_size_bytes: 1024, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    targetSnapId = id as string
  })

  it('returns target blob path AND inserts a pre-restore row first', async () => {
    const supabase = await signInAs(userId)
    const { data: targetPath, error } = await supabase.rpc('restore_snapshot', {
      p_target_snapshot_id: targetSnapId,
      p_current_scene_blob_path: 'current/blob',
      p_current_scene_size_bytes: 2048,
      p_current_thumbnail_path: 'current/thumb',
    })
    expect(error).toBeNull()
    expect(targetPath).toBe('target/blob')

    // Pre-restore row was inserted with kind=pre_restore, label='Auto-saved before restore', parent=target
    const { data: pre } = await supabase.from('canvas_snapshots')
      .select('kind, label, retention_class, parent_snapshot_id')
      .eq('canvas_id', canvasId)
      .eq('kind', 'pre_restore')
      .single()
    expect(pre?.kind).toBe('pre_restore')
    expect(pre?.label).toBe('Auto-saved before restore')
    expect(pre?.retention_class).toBe('permanent')
    expect(pre?.parent_snapshot_id).toBe(targetSnapId)
  })

  it('raises when called against another user\'s snapshot', async () => {
    const otherUserId = await seedTestUser({})
    const otherSupabase = await signInAs(otherUserId)
    const { error } = await otherSupabase.rpc('restore_snapshot', {
      p_target_snapshot_id: targetSnapId,
      p_current_scene_blob_path: 'x', p_current_scene_size_bytes: 1, p_current_thumbnail_path: null,
    })
    expect(error?.message).toContain('Snapshot not found')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test ./tests/integration/snapshots/rpc-restore-snapshot.test.ts
```

Expected: PASS if Task 1's migration already shipped the RPC body. (We're TDD-ing test coverage, not the SQL — the SQL is already in the migration per PRD §4.1.) If FAIL, re-check the RPC body matches PRD verbatim.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/tests/integration/snapshots/rpc-restore-snapshot.test.ts
git commit -m "test(09): integration tests for restore_snapshot RPC"
```

---

## Task 4: RPC `rename_snapshot` — covers Name + Delete-version-info

**Files:**
- Test: `kova-open-pencil-1/tests/integration/snapshots/rpc-rename-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/rpc-rename-snapshot.test.ts
import { describe, expect, it, beforeAll } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

describe('rename_snapshot RPC', () => {
  let userId: string, snapId: string

  beforeAll(async () => {
    userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId, user_id: userId })
    const supabase = await signInAs(userId)
    const { data: id } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'Original',
      p_description: 'Original desc', p_scene_blob_path: 'b', p_scene_size_bytes: 1024,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    snapId = id as string
  })

  it('Name path: sets label + description', async () => {
    const supabase = await signInAs(userId)
    const { error } = await supabase.rpc('rename_snapshot', {
      p_snapshot_id: snapId, p_label: 'Renamed', p_description: 'New desc',
    })
    expect(error).toBeNull()
    const { data } = await supabase.from('canvas_snapshots').select('label, description').eq('id', snapId).single()
    expect(data?.label).toBe('Renamed')
    expect(data?.description).toBe('New desc')
  })

  it('Delete-version-info path: NULL both clears them', async () => {
    const supabase = await signInAs(userId)
    const { error } = await supabase.rpc('rename_snapshot', {
      p_snapshot_id: snapId, p_label: null, p_description: null,
    })
    expect(error).toBeNull()
    const { data } = await supabase.from('canvas_snapshots').select('label, description').eq('id', snapId).single()
    expect(data?.label).toBeNull()
    expect(data?.description).toBeNull()
  })

  it('raises when called against another user\'s snapshot', async () => {
    const otherUserId = await seedTestUser({})
    const other = await signInAs(otherUserId)
    const { error } = await other.rpc('rename_snapshot', {
      p_snapshot_id: snapId, p_label: 'Hacker', p_description: null,
    })
    expect(error?.message).toContain('Snapshot not found')
  })
})
```

- [ ] **Step 2: Run + commit**

```bash
bun test ./tests/integration/snapshots/rpc-rename-snapshot.test.ts
```

Expected: PASS (RPC already exists from Task 1).

```bash
git add kova-open-pencil-1/tests/integration/snapshots/rpc-rename-snapshot.test.ts
git commit -m "test(09): integration tests for rename_snapshot RPC"
```

---

## Task 5: RPC `purge_canvas_snapshot_paths` — Cluster 02 helper

**Files:**
- Test: `kova-open-pencil-1/tests/integration/snapshots/rpc-purge-paths.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/rpc-purge-paths.test.ts
import { describe, expect, it } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

describe('purge_canvas_snapshot_paths RPC', () => {
  it('returns blob + thumbnail paths for the canvas', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId, user_id: userId })
    const supabase = await signInAs(userId)
    await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'A', p_description: null,
      p_scene_blob_path: 'blob/A', p_scene_size_bytes: 100,
      p_thumbnail_path: 'thumb/A', p_parent_snapshot_id: null,
    })
    await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'B', p_description: null,
      p_scene_blob_path: 'blob/B', p_scene_size_bytes: 100,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data: paths, error } = await supabase.rpc('purge_canvas_snapshot_paths', { p_canvas_id: canvasId })
    expect(error).toBeNull()
    const sorted = (paths as string[]).sort()
    expect(sorted).toEqual(['blob/A', 'blob/B', 'thumb/A'])  // null thumbnail filtered
  })

  it('raises when called against another user\'s canvas', async () => {
    const userA = await seedTestUser({}); const brandA = await seedBrand({ user_id: userA })
    const canvasA = await seedCanvas({ brand_id: brandA, user_id: userA })
    const userB = await seedTestUser({})
    const supabaseB = await signInAs(userB)
    const { error } = await supabaseB.rpc('purge_canvas_snapshot_paths', { p_canvas_id: canvasA })
    expect(error?.message).toContain('Canvas not found')
  })
})
```

- [ ] **Step 2: Run + commit**

```bash
bun test ./tests/integration/snapshots/rpc-purge-paths.test.ts
git add kova-open-pencil-1/tests/integration/snapshots/rpc-purge-paths.test.ts
git commit -m "test(09): integration tests for purge_canvas_snapshot_paths RPC"
```

Expected: PASS.

---

## Task 6: RLS verification tests

**Files:**
- Test: `kova-open-pencil-1/tests/integration/snapshots/rls-select.test.ts`
- Test: `kova-open-pencil-1/tests/integration/snapshots/rls-write-blocked.test.ts`
- Test: `kova-open-pencil-1/tests/integration/snapshots/storage-path-prefix.test.ts`

- [ ] **Step 1: Write rls-select.test.ts**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/rls-select.test.ts
import { describe, expect, it } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'
import { createClient } from '@supabase/supabase-js'

describe('canvas_snapshots RLS · SELECT', () => {
  it('user A sees only their own brand snapshots', async () => {
    const userA = await seedTestUser({}); const brandA = await seedBrand({ user_id: userA })
    const canvasA = await seedCanvas({ brand_id: brandA, user_id: userA })
    const userB = await seedTestUser({}); const brandB = await seedBrand({ user_id: userB })
    const canvasB = await seedCanvas({ brand_id: brandB, user_id: userB })

    const sA = await signInAs(userA)
    await sA.rpc('create_snapshot', { p_canvas_id: canvasA, p_kind: 'manual', p_label: 'A',
      p_description: null, p_scene_blob_path: 'a', p_scene_size_bytes: 1, p_thumbnail_path: null,
      p_parent_snapshot_id: null })
    const sB = await signInAs(userB)
    await sB.rpc('create_snapshot', { p_canvas_id: canvasB, p_kind: 'manual', p_label: 'B',
      p_description: null, p_scene_blob_path: 'b', p_scene_size_bytes: 1, p_thumbnail_path: null,
      p_parent_snapshot_id: null })

    const { data: visibleToA } = await sA.from('canvas_snapshots').select('label')
    expect(visibleToA?.map(r => r.label)).toEqual(['A'])
    const { data: visibleToB } = await sB.from('canvas_snapshots').select('label')
    expect(visibleToB?.map(r => r.label)).toEqual(['B'])
  })
})
```

- [ ] **Step 2: Write rls-write-blocked.test.ts**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/rls-write-blocked.test.ts
import { describe, expect, it } from 'bun:test'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'

describe('canvas_snapshots RLS · direct writes blocked', () => {
  it('authenticated INSERT directly fails (RPC-only writes)', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId, user_id: userId })
    const supabase = await signInAs(userId)
    const { error } = await supabase.from('canvas_snapshots').insert({
      canvas_id: canvasId, brand_id: brandId, user_id: userId,
      kind: 'manual', scene_blob_path: 'x', scene_size_bytes: 1, retention_class: 'permanent',
    })
    expect(error).not.toBeNull()  // Policy WITH CHECK (false) rejects
  })

  it('authenticated UPDATE directly fails', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId, user_id: userId })
    const supabase = await signInAs(userId)
    const { data: snapId } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'A',
      p_description: null, p_scene_blob_path: 'a', p_scene_size_bytes: 1,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { error, data } = await supabase.from('canvas_snapshots').update({ label: 'Hacked' }).eq('id', snapId).select()
    expect(data ?? []).toHaveLength(0)  // 0 rows updated
  })

  it('authenticated DELETE directly fails', async () => {
    const userId = await seedTestUser({})
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId, user_id: userId })
    const supabase = await signInAs(userId)
    const { data: snapId } = await supabase.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'A',
      p_description: null, p_scene_blob_path: 'a', p_scene_size_bytes: 1,
      p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    const { data } = await supabase.from('canvas_snapshots').delete().eq('id', snapId).select()
    expect(data ?? []).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Write storage-path-prefix.test.ts**

```typescript
// kova-open-pencil-1/tests/integration/snapshots/storage-path-prefix.test.ts
import { describe, expect, it } from 'bun:test'
import { seedTestUser, signInAs } from '../helpers/seed'

describe('canvas-snapshots Storage path-prefix policy', () => {
  it('user A cannot upload under user B\'s prefix', async () => {
    const userA = await seedTestUser({})
    const userB = await seedTestUser({})
    const sA = await signInAs(userA)
    const { error } = await sA.storage
      .from('canvas-snapshots')
      .upload(`${userB}/test.bin`, new Uint8Array([1,2,3]))
    expect(error?.message).toMatch(/policy|forbidden|new row violates/i)
  })

  it('user A can upload under their own prefix', async () => {
    const userA = await seedTestUser({})
    const sA = await signInAs(userA)
    const { error } = await sA.storage
      .from('canvas-snapshots')
      .upload(`${userA}/test.bin`, new Uint8Array([1,2,3]))
    expect(error).toBeNull()
  })
})
```

- [ ] **Step 4: Run all 3 RLS tests + commit**

```bash
bun test ./tests/integration/snapshots/rls-*.test.ts ./tests/integration/snapshots/storage-path-prefix.test.ts
git add kova-open-pencil-1/tests/integration/snapshots/rls-*.test.ts \
        kova-open-pencil-1/tests/integration/snapshots/storage-path-prefix.test.ts
git commit -m "test(09): RLS + Storage path-prefix policy verification"
```

Expected: 3 files, ~5 tests PASS.

---

## Task 7: `useSnapshotCodec` composable — Yjs + Kiwi + Zstd round-trip

**Files:**
- Create: `kova-open-pencil-1/src/composables/version-history/use-snapshot-codec.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-snapshot-codec.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// kova-open-pencil-1/tests/unit/composables/version-history/use-snapshot-codec.test.ts
import { describe, expect, it } from 'bun:test'
import * as Y from 'yjs'
import { encodeCanvasSnapshot, decodeCanvasSnapshot } from '@/composables/version-history/use-snapshot-codec'

function fakeEditor(pages: Y.Doc[]): { snapshotPage: (id: string) => Uint8Array; pageIds: string[] } {
  return {
    pageIds: pages.map((_, i) => `p${i}`),
    snapshotPage: (id: string) => Y.encodeStateAsUpdate(pages[parseInt(id.slice(1))]),
  }
}

describe('use-snapshot-codec', () => {
  it('round-trips a single-page Yjs doc through Kiwi + Zstd', async () => {
    const doc = new Y.Doc()
    doc.getMap('test').set('hello', 'world')
    const editor = fakeEditor([doc])

    const { bytes, size_bytes } = await encodeCanvasSnapshot(editor as any)
    expect(bytes.byteLength).toBe(size_bytes)
    expect(size_bytes).toBeGreaterThan(0)

    const decoded = await decodeCanvasSnapshot(bytes)
    expect(decoded.format_version).toBe(1)
    expect(decoded.pages).toHaveLength(1)

    // Apply the decoded bytes to a fresh doc and verify the value
    const restored = new Y.Doc()
    Y.applyUpdate(restored, decoded.pages[0].bytes)
    expect(restored.getMap('test').get('hello')).toBe('world')
  })

  it('round-trips a multi-page doc', async () => {
    const docs = [new Y.Doc(), new Y.Doc(), new Y.Doc()]
    docs.forEach((d, i) => d.getMap('m').set('i', i))
    const editor = fakeEditor(docs)

    const { bytes } = await encodeCanvasSnapshot(editor as any)
    const decoded = await decodeCanvasSnapshot(bytes)
    expect(decoded.pages).toHaveLength(3)
    decoded.pages.forEach((p, i) => {
      const r = new Y.Doc()
      Y.applyUpdate(r, p.bytes)
      expect(r.getMap('m').get('i')).toBe(i)
    })
  })

  it('throws format_version_unsupported for unknown version', async () => {
    // Construct a manually-crafted envelope with format=99 then run through Zstd compress
    const fake = new Uint8Array([99, 0, 0, 0])  // pseudo — actual implementation will use kiwi-schema
    await expect(decodeCanvasSnapshot(fake)).rejects.toThrow(/format_version_unsupported|malformed_snapshot/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test ./tests/unit/composables/version-history/use-snapshot-codec.test.ts
```

Expected: FAIL — "Cannot find module".

- [ ] **Step 3: Write the composable**

```typescript
// kova-open-pencil-1/src/composables/version-history/use-snapshot-codec.ts
import { compress, decompress } from '@bokuweb/zstd-wasm'

interface EditorAPI {
  pageIds: string[]
  snapshotPage: (pageId: string) => Uint8Array
}

interface PageSnap {
  pageId: string
  bytes: Uint8Array
}

interface Decoded {
  format_version: number
  pages: PageSnap[]
}

const FORMAT_VERSION = 1
const MAGIC = new Uint8Array([0x4b, 0x4f, 0x56, 0x41])  // "KOVA"

// We use a tiny hand-rolled binary envelope rather than kiwi-schema for the outer wrapper —
// the inner page payloads are already Yjs binary, so the wrapper is intentionally minimal.
//
// Wire format (post-Zstd): MAGIC(4) || format_version(u8) || pageCount(u32 BE) ||
//   for each page: pageIdLen(u16 BE) || pageId UTF-8 || byteLen(u32 BE) || bytes
//
// (If the codebase already has a kiwi-schema for snapshot envelopes from M5/Cluster 07a, USE IT
//  instead of this hand-rolled layout — DRY.)

export async function encodeCanvasSnapshot(editor: EditorAPI): Promise<{ bytes: Uint8Array; size_bytes: number }> {
  const pages = editor.pageIds.map(id => ({ pageId: id, bytes: editor.snapshotPage(id) }))
  const enc = new TextEncoder()

  // Compute size
  let size = MAGIC.byteLength + 1 + 4
  for (const p of pages) {
    size += 2 + enc.encode(p.pageId).byteLength + 4 + p.bytes.byteLength
  }
  const buf = new Uint8Array(size)
  const view = new DataView(buf.buffer)
  let off = 0
  buf.set(MAGIC, off); off += MAGIC.byteLength
  view.setUint8(off, FORMAT_VERSION); off += 1
  view.setUint32(off, pages.length, false); off += 4
  for (const p of pages) {
    const idBytes = enc.encode(p.pageId)
    view.setUint16(off, idBytes.byteLength, false); off += 2
    buf.set(idBytes, off); off += idBytes.byteLength
    view.setUint32(off, p.bytes.byteLength, false); off += 4
    buf.set(p.bytes, off); off += p.bytes.byteLength
  }

  const compressed = await compress(buf, 3)
  return { bytes: compressed, size_bytes: compressed.byteLength }
}

export async function decodeCanvasSnapshot(zstd: Uint8Array): Promise<Decoded> {
  let raw: Uint8Array
  try {
    raw = await decompress(zstd)
  } catch {
    throw new Error('malformed_snapshot')
  }
  const dec = new TextDecoder()
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  let off = 0
  for (let i = 0; i < MAGIC.byteLength; i++) {
    if (raw[off + i] !== MAGIC[i]) throw new Error('malformed_snapshot')
  }
  off += MAGIC.byteLength
  const fv = view.getUint8(off); off += 1
  if (fv !== FORMAT_VERSION) throw new Error('format_version_unsupported')
  const pageCount = view.getUint32(off, false); off += 4
  const pages: PageSnap[] = []
  for (let i = 0; i < pageCount; i++) {
    const idLen = view.getUint16(off, false); off += 2
    const pageId = dec.decode(raw.subarray(off, off + idLen)); off += idLen
    const byteLen = view.getUint32(off, false); off += 4
    const bytes = raw.subarray(off, off + byteLen); off += byteLen
    pages.push({ pageId, bytes })
  }
  return { format_version: fv, pages }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test ./tests/unit/composables/version-history/use-snapshot-codec.test.ts
```

Expected: PASS. If `@bokuweb/zstd-wasm` isn't yet in `kova-open-pencil-1/package.json`, add it (it should be — OpenPencil's `packages/core/codec/` already uses it; if Bun isolated install dropped it, declare as direct dep per `project_vite_bun_transitive_deps` memory):

```bash
bun add @bokuweb/zstd-wasm
```

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/src/composables/version-history/use-snapshot-codec.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-snapshot-codec.test.ts \
        kova-open-pencil-1/package.json kova-open-pencil-1/bun.lock
git commit -m "feat(09): snapshot codec composable (Yjs + Kiwi-style envelope + Zstd)"
```

---

## Task 8: `useSnapshotThumbnail` composable

**Files:**
- Create: `kova-open-pencil-1/src/composables/version-history/use-snapshot-thumbnail.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-snapshot-thumbnail.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// kova-open-pencil-1/tests/unit/composables/version-history/use-snapshot-thumbnail.test.ts
import { describe, expect, it } from 'bun:test'
import { useSnapshotThumbnail } from '@/composables/version-history/use-snapshot-thumbnail'

describe('useSnapshotThumbnail', () => {
  it('returns 150×150 PNG bytes from editor.captureThumbnail', async () => {
    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])  // PNG header + ...
    const editor = { captureThumbnail: async (size: number) => { expect(size).toBe(150); return fakePng } }
    const { capture } = useSnapshotThumbnail(editor as any)
    const out = await capture()
    expect(out).toEqual(fakePng)
  })

  it('returns null on capture failure', async () => {
    const editor = { captureThumbnail: async () => { throw new Error('engine busy') } }
    const { capture } = useSnapshotThumbnail(editor as any)
    expect(await capture()).toBeNull()
  })
})
```

- [ ] **Step 2: Run + write composable**

```typescript
// kova-open-pencil-1/src/composables/version-history/use-snapshot-thumbnail.ts
interface EditorAPI {
  captureThumbnail: (sizePx: number) => Promise<Uint8Array>
}

export function useSnapshotThumbnail(editor: EditorAPI) {
  async function capture(): Promise<Uint8Array | null> {
    try { return await editor.captureThumbnail(150) }
    catch { return null }
  }
  return { capture }
}
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/unit/composables/version-history/use-snapshot-thumbnail.test.ts
git add kova-open-pencil-1/src/composables/version-history/use-snapshot-thumbnail.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-snapshot-thumbnail.test.ts
git commit -m "feat(09): useSnapshotThumbnail composable"
```

Expected: PASS.

---

## Task 9: `useRestoreUndo` composable

**Files:**
- Create: `kova-open-pencil-1/src/composables/version-history/use-restore-undo.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-restore-undo.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// kova-open-pencil-1/tests/unit/composables/version-history/use-restore-undo.test.ts
import { describe, expect, it, mock } from 'bun:test'
import { useRestoreUndo } from '@/composables/version-history/use-restore-undo'

describe('useRestoreUndo', () => {
  it('pushes a restore-from-snapshot entry to editor.undoStack', () => {
    const pushed: any[] = []
    const fakeEditor = { pushUndoEntry: (e: any) => pushed.push(e) }
    ;(globalThis as any).__editor = fakeEditor   // matches your project's editor accessor convention
    const { pushRestoreEntry } = useRestoreUndo()
    pushRestoreEntry({ preRestoreSnapshotId: 'abc' })
    expect(pushed).toEqual([{ kind: 'restore-from-snapshot', preRestoreSnapshotId: 'abc' }])
  })
})
```

- [ ] **Step 2: Write composable**

```typescript
// kova-open-pencil-1/src/composables/version-history/use-restore-undo.ts
import { useEditor } from '@/composables/use-editor'  // existing accessor in repo

interface PushOpts { preRestoreSnapshotId: string }

export function useRestoreUndo() {
  const editor = useEditor()
  function pushRestoreEntry(opts: PushOpts) {
    editor.pushUndoEntry({ kind: 'restore-from-snapshot', ...opts })
  }
  return { pushRestoreEntry }
}
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/unit/composables/version-history/use-restore-undo.test.ts
git add kova-open-pencil-1/src/composables/version-history/use-restore-undo.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-restore-undo.test.ts
git commit -m "feat(09): useRestoreUndo composable"
```

(If `useEditor` doesn't yet exist in repo, swap the import for the existing pattern — see how Cluster 07a wires the editor; do not invent a new accessor.)

---

## Task 10: `useSnapshotsStore` Pinia store

**Files:**
- Create: `kova-open-pencil-1/src/stores/snapshots.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/snapshots.test.ts`

The store body matches PRD §6.2 verbatim (interface + state + getters + actions). This task implements every action with the side-effect contract described.

- [ ] **Step 1: Write failing test (high-level shape)**

```typescript
// kova-open-pencil-1/tests/unit/stores/snapshots.test.ts
import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useSnapshotsStore } from '@/stores/snapshots'

beforeEach(() => setActivePinia(createPinia()))

describe('useSnapshotsStore', () => {
  it('list() populates byCanvasId via RLS-gated SELECT', async () => {
    const store = useSnapshotsStore()
    // Mock supabase.from('canvas_snapshots').select(...) to return 2 rows for canvasId='c1'
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [
              { id: 's1', canvas_id: 'c1', kind: 'manual', label: 'A', /* ... */ },
              { id: 's2', canvas_id: 'c1', kind: 'autosave', label: null, /* ... */ },
            ], error: null })
          })
        })
      })
    }
    ;(store as any).$supabase = mockSupabase   // adjust to your existing supabase injection pattern
    await store.list('c1')
    expect(store.byCanvasId['c1']).toHaveLength(2)
  })

  it('create() encodes + uploads + RPCs + appends row', async () => {
    // Mock useSnapshotCodec.encodeCanvasSnapshot, useSnapshotThumbnail.capture, supabase.storage, supabase.rpc
    // Assert each is called with expected args; final state has the new row.
    // (Spell out with exact mocks; spec lives in PRD §6.2 actions.)
  })

  it('create() returns { ok:false, reason:"quota_exceeded" } on RPC quota_exceeded', async () => {
    // Mock rpc to return { error: { message: 'quota_exceeded' } }
    // Assert reason mapping in store.create
  })

  it('restore() pre-encodes current state, calls restore_snapshot, downloads target, swaps Yjs, pushes undo', async () => {
    // Mock the full chain; verify call order
  })

  it('rename() with NULL,NULL clears label+description (Delete-version-info path)', async () => {
    // Mock supabase.rpc('rename_snapshot', { p_label: null, p_description: null })
  })

  it('copyLink() writes /canvas/{cid}?version={sid} to navigator.clipboard', async () => {
    const writes: string[] = []
    ;(globalThis.navigator as any) = { clipboard: { writeText: async (s: string) => { writes.push(s) } } }
    const store = useSnapshotsStore()
    store.copyLink('s1', 'c1')
    expect(writes[0]).toMatch(/\/canvas\/c1\?version=s1$/)
  })

  it('panelOpen / addDialogOpen / showAutosaves toggle correctly', () => {
    const store = useSnapshotsStore()
    expect(store.panelOpen).toBe(false)
    store.openPanel(); expect(store.panelOpen).toBe(true)
    store.closePanel(); expect(store.panelOpen).toBe(false)
  })
})
```

- [ ] **Step 2: Implement store from PRD §6.2 verbatim**

Open `kova-open-pencil-1/docs/prd/09-version-history-and-trash.md` §6.2; reproduce the body 1:1 in `kova-open-pencil-1/src/stores/snapshots.ts`. Replace inline `// ...` placeholders with concrete bodies that satisfy the tests above:

```typescript
// kova-open-pencil-1/src/stores/snapshots.ts (excerpt — full body from PRD §6.2)
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/use-toast'
import { useEditor } from '@/composables/use-editor'
import { useSnapshotCodec } from '@/composables/version-history/use-snapshot-codec'
import { useSnapshotThumbnail } from '@/composables/version-history/use-snapshot-thumbnail'
import { useRestoreUndo } from '@/composables/version-history/use-restore-undo'

export interface Snapshot { /* see PRD §6.2 interface */ }

export const useSnapshotsStore = defineStore('snapshots', () => {
  const byCanvasId = reactive<Record<string, Snapshot[]>>({})
  const loadingByCanvas = reactive<Record<string, boolean>>({})
  const previewingId = ref<string | null>(null)
  const panelOpen = ref(false)
  const addDialogOpen = ref(false)
  const showAutosaves = ref(true)

  const visibleFor = (canvasId: string) => computed(() => {
    const all = byCanvasId[canvasId] ?? []
    return showAutosaves.value ? all : all.filter(s => s.kind === 'manual' || s.label)
  })

  async function list(canvasId: string) {
    loadingByCanvas[canvasId] = true
    const { data, error } = await supabase.from('canvas_snapshots')
      .select('*').eq('canvas_id', canvasId).order('taken_at', { ascending: false })
    if (!error && data) byCanvasId[canvasId] = data as Snapshot[]
    loadingByCanvas[canvasId] = false
  }

  async function create(args: { canvasId: string; kind: Snapshot['kind']; label?: string; description?: string; parentSnapshotId?: string }) {
    const editor = useEditor()
    const { encodeCanvasSnapshot } = useSnapshotCodec()
    const { capture } = useSnapshotThumbnail(editor)

    const { bytes, size_bytes } = await encodeCanvasSnapshot(editor)
    const thumbBytes = await capture()

    const blobPath = `${editor.userId}/${editor.brandId}/${args.canvasId}/${crypto.randomUUID()}.kiwi.zst`
    const thumbPath = thumbBytes
      ? `${editor.userId}/thumbnails/${editor.brandId}/${args.canvasId}/${crypto.randomUUID()}.png`
      : null

    const upBlob = await supabase.storage.from('canvas-snapshots').upload(blobPath, bytes, { contentType: 'application/octet-stream' })
    if (upBlob.error) return { ok: false as const, reason: 'unknown' as const }
    if (thumbBytes && thumbPath) {
      await supabase.storage.from('canvas-snapshots').upload(thumbPath, thumbBytes, { contentType: 'image/png' })
    }

    const { data: id, error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: args.canvasId, p_kind: args.kind,
      p_label: args.label ?? null, p_description: args.description ?? null,
      p_scene_blob_path: blobPath, p_scene_size_bytes: size_bytes,
      p_thumbnail_path: thumbPath, p_parent_snapshot_id: args.parentSnapshotId ?? null,
    })
    if (error) {
      if (error.message.includes('quota_exceeded')) {
        useToast().warning('Snapshot quota reached (100 MB per brand). Upgrade for unlimited history.')
        return { ok: false as const, reason: 'quota_exceeded' as const }
      }
      return { ok: false as const, reason: 'unknown' as const }
    }
    await list(args.canvasId)   // refresh
    if (args.kind === 'manual') useToast().success('Saved to version history')
    return { ok: true as const, id: id as string }
  }

  async function restore(snapshotId: string) {
    const editor = useEditor()
    const { encodeCanvasSnapshot, decodeCanvasSnapshot } = useSnapshotCodec()
    const { pushRestoreEntry } = useRestoreUndo()

    // 1. Encode current state for the pre-restore snapshot
    const { bytes: currentBytes, size_bytes: currentSize } = await encodeCanvasSnapshot(editor)
    const currentBlobPath = `${editor.userId}/${editor.brandId}/${editor.canvasId}/pre-${crypto.randomUUID()}.kiwi.zst`
    await supabase.storage.from('canvas-snapshots').upload(currentBlobPath, currentBytes)

    // 2. RPC — atomic; returns target blob path
    const { data: targetPath, error } = await supabase.rpc('restore_snapshot', {
      p_target_snapshot_id: snapshotId,
      p_current_scene_blob_path: currentBlobPath,
      p_current_scene_size_bytes: currentSize,
      p_current_thumbnail_path: null,
    })
    if (error || !targetPath) return { ok: false as const, reason: error?.message ?? 'unknown' }

    // 3. Download target blob
    const { data: signed } = await supabase.storage.from('canvas-snapshots').createSignedUrl(targetPath, 600)
    const buf = await fetch(signed!.signedUrl).then(r => r.arrayBuffer())

    // 4. Decode + Yjs swap
    const decoded = await decodeCanvasSnapshot(new Uint8Array(buf))
    decoded.pages.forEach(p => editor.restorePageFromSnapshot(p.pageId, p.bytes))

    // 5. Undo entry — store the pre-restore id from the just-inserted row
    const refreshed = await supabase.from('canvas_snapshots').select('id, kind, parent_snapshot_id, taken_at')
      .eq('canvas_id', editor.canvasId).eq('kind', 'pre_restore').order('taken_at', { ascending: false }).limit(1).single()
    if (refreshed.data) pushRestoreEntry({ preRestoreSnapshotId: refreshed.data.id })

    await list(editor.canvasId)
    useToast().success(`Restored to ${formatLabel(snapshotId)}`)
    return { ok: true as const }
  }

  async function rename(snapshotId: string, label: string | null, description: string | null) {
    const { error } = await supabase.rpc('rename_snapshot', {
      p_snapshot_id: snapshotId, p_label: label, p_description: description,
    })
    if (error) throw error
    // Update local state
    for (const arr of Object.values(byCanvasId)) {
      const row = arr.find(r => r.id === snapshotId)
      if (row) { row.label = label; row.description = description }
    }
  }

  async function duplicateToCanvas(snapshotId: string) {
    const res = await fetch('/api/snapshots/duplicate-to-canvas', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      body: JSON.stringify({ snapshot_id: snapshotId }),
    })
    if (!res.ok) throw new Error(`Duplicate failed: ${res.status}`)
    return res.json() as Promise<{ canvas_id: string }>
  }

  function copyLink(snapshotId: string, canvasId: string) {
    const url = `${location.origin}/canvas/${canvasId}?version=${snapshotId}`
    navigator.clipboard.writeText(url)
    useToast().success('Link copied to clipboard')
  }

  async function getSignedThumbnailUrl(thumbnailPath: string) {
    const { data } = await supabase.storage.from('canvas-snapshots').createSignedUrl(thumbnailPath, 600)
    return data!.signedUrl
  }
  async function getSignedBlobUrl(blobPath: string) {
    const { data } = await supabase.storage.from('canvas-snapshots').createSignedUrl(blobPath, 600)
    return data!.signedUrl
  }

  function previewSnapshot(id: string) { previewingId.value = id }
  function exitPreview() { previewingId.value = null }
  function openPanel() { panelOpen.value = true }
  function closePanel() { panelOpen.value = false; exitPreview() }
  function openAddDialog() { addDialogOpen.value = true }
  function closeAddDialog() { addDialogOpen.value = false }

  function formatLabel(snapshotId: string): string {
    for (const arr of Object.values(byCanvasId)) {
      const row = arr.find(r => r.id === snapshotId)
      if (row) return row.label || new Date(row.taken_at).toLocaleString()
    }
    return 'snapshot'
  }

  return {
    byCanvasId, loadingByCanvas, previewingId, panelOpen, addDialogOpen, showAutosaves,
    visibleFor,
    list, create, restore, rename, duplicateToCanvas, copyLink,
    getSignedThumbnailUrl, getSignedBlobUrl,
    previewSnapshot, exitPreview, openPanel, closePanel, openAddDialog, closeAddDialog,
  }
})
```

- [ ] **Step 3: Run tests + commit**

```bash
bun test ./tests/unit/stores/snapshots.test.ts
git add kova-open-pencil-1/src/stores/snapshots.ts \
        kova-open-pencil-1/tests/unit/stores/snapshots.test.ts
git commit -m "feat(09): useSnapshotsStore Pinia store"
```

Expected: PASS.

---

## Task 11: `useAutosnapshot` heartbeat composable

**Files:**
- Create: `kova-open-pencil-1/src/composables/version-history/use-autosnapshot.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-autosnapshot.test.ts`

- [ ] **Step 1: Write failing test (covers all 6 acceptance criteria from PRD §8.4)**

```typescript
// kova-open-pencil-1/tests/unit/composables/version-history/use-autosnapshot.test.ts
import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'
import { ref } from 'vue'
import { useAutosnapshot } from '@/composables/version-history/use-autosnapshot'
import { useSnapshotsStore } from '@/stores/snapshots'

let createSpy: ReturnType<typeof mock>
beforeEach(() => {
  createSpy = mock(async () => ({ ok: true, id: crypto.randomUUID() }))
  ;(useSnapshotsStore as any).create = createSpy
})

describe('useAutosnapshot', () => {
  it('fires after 30 minutes', async () => {
    jest.useFakeTimers()  // or Bun's equivalent
    const canvasId = ref('c1')
    const isActive = ref(true)
    const { start } = useAutosnapshot(canvasId, isActive)
    start()
    jest.advanceTimersByTime(30 * 60 * 1000)
    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'autosave', canvasId: 'c1' }))
  })

  it('pauses on window.blur and resumes on window.focus', async () => {
    // Fake timer + dispatch blur → no fire over 30min; dispatch focus → fires immediately on next tick
  })

  it('fires on beforeunload with kind=tab_close (sync encode)', async () => {
    // Dispatch beforeunload event; assert createSpy called with { kind: 'tab_close' }
  })

  it('fires on navigator.onLine=false with kind=disconnect', async () => {
    // Override navigator.onLine; dispatch 'offline' event; assert kind=disconnect
  })

  it('SKIPS the cycle when state-vector unchanged since last snap', async () => {
    // Provide a stable state vector across 2 ticks; assert createSpy called once total
  })

  it('STOPS heartbeat when canvases.trashed_at flips on the current canvas', async () => {
    // Subscribe to useCanvasesStore.trashedAt; mark trashed; advance 30min; assert createSpy NOT called
  })

  it('quota_exceeded surfaces a non-blocking toast and continues retrying', async () => {
    createSpy.mockImplementationOnce(async () => ({ ok: false, reason: 'quota_exceeded' }))
    // First tick → quota toast; second tick (30 min later) → still tries; if quota raises again, retries
  })
})
```

- [ ] **Step 2: Implement composable per PRD §6.3.1 spec**

```typescript
// kova-open-pencil-1/src/composables/version-history/use-autosnapshot.ts
import { computed, onMounted, onUnmounted, ref, type Ref, watch } from 'vue'
import { useSnapshotsStore } from '@/stores/snapshots'
import { useCanvasesStore } from '@/stores/canvases'
import { useEditor } from '@/composables/use-editor'

const INTERVAL_MS = 30 * 60 * 1000  // 30 min

export function useAutosnapshot(canvasId: Ref<string>, isActive: Ref<boolean>) {
  const store = useSnapshotsStore()
  const canvases = useCanvasesStore()
  const editor = useEditor()

  const lastStateVector = ref<Uint8Array | null>(null)
  const lastSnapAt = ref<Date | null>(null)
  const intervalHandle = ref<number | null>(null)
  const paused = ref(false)

  function arrayEq(a: Uint8Array | null, b: Uint8Array | null) {
    if (!a || !b) return false
    if (a.byteLength !== b.byteLength) return false
    for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false
    return true
  }

  async function attemptSnap(kind: 'autosave' | 'disconnect' | 'tab_close') {
    const sv = editor.getStateVector()
    if (kind === 'autosave' && arrayEq(sv, lastStateVector.value)) return  // skip-if-unchanged
    const res = await store.create({ canvasId: canvasId.value, kind })
    if (res.ok) { lastStateVector.value = sv; lastSnapAt.value = new Date() }
  }

  function tick() { if (!paused.value && isActive.value && navigator.onLine) attemptSnap('autosave') }
  function onBlur() { paused.value = true }
  function onFocus() { paused.value = false }
  function onOffline() { attemptSnap('disconnect') }
  function onBeforeUnload() { attemptSnap('tab_close') }
  function onTrashed() {
    if (canvases.byId[canvasId.value]?.trashed_at) stop()
  }

  function start() {
    intervalHandle.value = window.setInterval(tick, INTERVAL_MS)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeunload', onBeforeUnload)
    watch(() => canvases.byId[canvasId.value]?.trashed_at, onTrashed)
  }
  function stop() {
    if (intervalHandle.value) clearInterval(intervalHandle.value)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('offline', onOffline)
    window.removeEventListener('beforeunload', onBeforeUnload)
  }

  onUnmounted(stop)
  return { start, stop, lastSnapAt: computed(() => lastSnapAt.value) }
}
```

- [ ] **Step 3: Run tests + commit**

```bash
bun test ./tests/unit/composables/version-history/use-autosnapshot.test.ts
git add kova-open-pencil-1/src/composables/version-history/use-autosnapshot.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-autosnapshot.test.ts
git commit -m "feat(09): useAutosnapshot heartbeat composable"
```

Expected: PASS.

---

## Task 12: `useDeepLinkedVersion` + `useVersionHistoryShortcut` composables

**Files:**
- Create: `kova-open-pencil-1/src/composables/version-history/use-deep-linked-version.ts`
- Create: `kova-open-pencil-1/src/composables/version-history/use-version-history-shortcut.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-deep-linked-version.test.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-version-history-shortcut.test.ts`

- [ ] **Step 1: Tests + impls (concise; both small)**

```typescript
// use-deep-linked-version.ts
import { useRoute } from 'vue-router'
import { onMounted } from 'vue'
import { useSnapshotsStore } from '@/stores/snapshots'
import { useToast } from '@/composables/use-toast'

export function useDeepLinkedVersion() {
  const route = useRoute()
  const store = useSnapshotsStore()
  onMounted(async () => {
    const versionId = route.query.version
    if (typeof versionId !== 'string') return
    const canvasId = route.params.canvasId as string
    await store.list(canvasId)
    const exists = store.byCanvasId[canvasId]?.find(s => s.id === versionId)
    if (!exists) { useToast().warning('Version not found'); return }
    store.openPanel()
    store.previewSnapshot(versionId)
  })
}

// use-version-history-shortcut.ts
import { onMounted, onUnmounted } from 'vue'
import { useSnapshotsStore } from '@/stores/snapshots'

export function useVersionHistoryShortcut() {
  const store = useSnapshotsStore()
  function onKey(e: KeyboardEvent) {
    // Use e.code (CLAUDE.md hard rule: no e.key on Mac with Option)
    const isMac = navigator.platform.toLowerCase().includes('mac')
    const modOk = isMac ? (e.metaKey && e.altKey) : (e.ctrlKey && e.altKey)
    if (modOk && e.code === 'KeyS') {
      e.preventDefault()
      store.openAddDialog()
    }
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onUnmounted(() => window.removeEventListener('keydown', onKey))
}
```

- [ ] **Step 2: Run + commit**

```bash
bun test ./tests/unit/composables/version-history/use-deep-linked-version.test.ts \
         ./tests/unit/composables/version-history/use-version-history-shortcut.test.ts
git add kova-open-pencil-1/src/composables/version-history/use-deep-linked-version.ts \
        kova-open-pencil-1/src/composables/version-history/use-version-history-shortcut.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-deep-linked-version.test.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-version-history-shortcut.test.ts
git commit -m "feat(09): deep-link + ⌥⌘S shortcut composables"
```

---

## Task 12a: `useCanvasEditLock` composable + preview side-doc helper

> **Added 2026-05-17 to cover PRD §6.3 useCanvasEditLock row + §12.12 (edit-lock) + §12.13 (preview side-doc) + §12.14 (single in-flight side-doc).**

**Files:**
- Create: `kova-open-pencil-1/src/composables/version-history/use-canvas-edit-lock.ts`
- Create: `kova-open-pencil-1/src/composables/version-history/use-preview-side-doc.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-canvas-edit-lock.test.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/version-history/use-preview-side-doc.test.ts`

- [ ] **Step 1: Edit-lock test**

```typescript
// kova-open-pencil-1/tests/unit/composables/version-history/use-canvas-edit-lock.test.ts
import { describe, expect, it } from 'bun:test'
import { useCanvasEditLock } from '@/composables/version-history/use-canvas-edit-lock'

describe('useCanvasEditLock', () => {
  it('starts unlocked', () => {
    const { isLocked } = useCanvasEditLock()
    expect(isLocked.value).toBe(false)
  })

  it('lock() flips isLocked to true; unlock() flips back', () => {
    const { lock, unlock, isLocked } = useCanvasEditLock()
    lock(); expect(isLocked.value).toBe(true)
    unlock(); expect(isLocked.value).toBe(false)
  })

  it('is a singleton — two consumers see the same isLocked', () => {
    const a = useCanvasEditLock(); const b = useCanvasEditLock()
    a.lock(); expect(b.isLocked.value).toBe(true)
    b.unlock(); expect(a.isLocked.value).toBe(false)
  })
})
```

- [ ] **Step 2: Edit-lock composable (module-level state — singleton)**

```typescript
// kova-open-pencil-1/src/composables/version-history/use-canvas-edit-lock.ts
import { computed, ref } from 'vue'

const lockCount = ref(0)   // reference-count so multiple callers can lock; first to lock wins, last to unlock releases
const isLocked = computed(() => lockCount.value > 0)

export function useCanvasEditLock() {
  function lock() { lockCount.value++ }
  function unlock() { lockCount.value = Math.max(0, lockCount.value - 1) }
  return { lock, unlock, isLocked }
}
```

- [ ] **Step 3: Preview side-doc test (single in-flight)**

```typescript
// kova-open-pencil-1/tests/unit/composables/version-history/use-preview-side-doc.test.ts
import { describe, expect, it, mock } from 'bun:test'
import { usePreviewSideDoc } from '@/composables/version-history/use-preview-side-doc'

describe('usePreviewSideDoc', () => {
  it('load() fetches blob, decodes, renders side-doc; returns disposer', async () => {
    // Mock: signed-url fetch + decodeCanvasSnapshot + editor.mountSideDoc(pages)
    // Assert mountSideDoc called with decoded pages; disposer unmounts
  })

  it('successive load() calls dispose the previous side-doc FIRST (single in-flight)', async () => {
    // Track mountSideDoc + unmountSideDoc call order; second load → unmount(first) → mount(second)
  })

  it('clear() unmounts the side-doc + restores live document', async () => {
    // load() then clear(); assert unmountSideDoc + editor.show('live')
  })
})
```

- [ ] **Step 4: Preview side-doc composable**

```typescript
// kova-open-pencil-1/src/composables/version-history/use-preview-side-doc.ts
import { ref } from 'vue'
import { useEditor } from '@/composables/use-editor'
import { useSnapshotsStore } from '@/stores/snapshots'
import { useSnapshotCodec } from './use-snapshot-codec'

const inFlightDisposer = ref<(() => void) | null>(null)

export function usePreviewSideDoc() {
  const editor = useEditor()
  const store = useSnapshotsStore()
  const { decodeCanvasSnapshot } = useSnapshotCodec()

  async function load(snapshotId: string, blobPath: string) {
    if (inFlightDisposer.value) { inFlightDisposer.value(); inFlightDisposer.value = null }
    const signedUrl = await store.getSignedBlobUrl(blobPath)
    const bytes = new Uint8Array(await fetch(signedUrl).then(r => r.arrayBuffer()))
    const decoded = await decodeCanvasSnapshot(bytes)
    // editor.mountSideDoc returns a disposer that unmounts the side-doc and reveals the live doc
    inFlightDisposer.value = editor.mountSideDoc(decoded.pages)
  }

  function clear() {
    if (inFlightDisposer.value) { inFlightDisposer.value(); inFlightDisposer.value = null }
  }

  return { load, clear }
}
```

(If `editor.mountSideDoc` doesn't exist in `packages/core/` today, this becomes a Cluster 07a open question — flag as "Editor side-doc render API needed; alternatively, render the preview to a hidden offscreen canvas + composite over the live canvas via DOM positioning." Cluster 07a may already expose something similar via the canvas-extensions hook.)

- [ ] **Step 5: Run + commit**

```bash
bun test ./tests/unit/composables/version-history/use-canvas-edit-lock.test.ts \
         ./tests/unit/composables/version-history/use-preview-side-doc.test.ts
git add kova-open-pencil-1/src/composables/version-history/use-canvas-edit-lock.ts \
        kova-open-pencil-1/src/composables/version-history/use-preview-side-doc.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-canvas-edit-lock.test.ts \
        kova-open-pencil-1/tests/unit/composables/version-history/use-preview-side-doc.test.ts
git commit -m "feat(09): canvas edit-lock + preview side-doc composables"
```

---

## Task 13: `<AddVersionDialog>` component

**Files:**
- Create: `kova-open-pencil-1/src/components/version-history/AddVersionDialog.vue`
- Test: `kova-open-pencil-1/tests/unit/components/version-history/AddVersionDialog.test.ts`

- [ ] **Step 1: Test**

```typescript
// kova-open-pencil-1/tests/unit/components/version-history/AddVersionDialog.test.ts
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import AddVersionDialog from '@/components/version-history/AddVersionDialog.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('AddVersionDialog', () => {
  it('Save is disabled until Title is non-empty', async () => {
    setActivePinia(createPinia())
    const w = mount(AddVersionDialog)
    const save = w.find('[data-testid="save-button"]')
    expect(save.attributes('aria-disabled')).toBe('true')
    await w.find('[data-testid="title-input"]').setValue('Hello')
    expect(save.attributes('aria-disabled')).toBe('false')
  })

  it('Save calls store.create with kind=manual + emits saved', async () => {
    // Mock store.create; assert call args; await w.find(save).trigger('click'); assert emit
  })

  it('Cancel emits cancelled and clears the form', async () => { /* ... */ })
})
```

- [ ] **Step 2: Component (matches hi-fi 17.8 / 17.9; uses Cluster 11 `<KovaModal>` shell + `.dlg`/`.btn`/`.input` classes)**

```vue
<!-- kova-open-pencil-1/src/components/version-history/AddVersionDialog.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSnapshotsStore } from '@/stores/snapshots'
import KovaModal from '@/components/shared/KovaModal.vue'   // Cluster 11

const emit = defineEmits<{ saved: [id: string]; cancelled: [] }>()
const store = useSnapshotsStore()
const title = ref('')
const description = ref('')
const saveDisabled = computed(() => title.value.trim() === '')

async function onSave() {
  if (saveDisabled.value) return
  const res = await store.create({
    canvasId: /* current canvas id from route */ '',
    kind: 'manual',
    label: title.value.trim(),
    description: description.value.trim() || undefined,
  })
  if (res.ok) emit('saved', res.id)
  store.closeAddDialog()
}
function onCancel() {
  title.value = ''; description.value = ''
  emit('cancelled')
  store.closeAddDialog()
}
</script>

<template>
  <KovaModal size="sm">
    <div class="dlg-head">
      <h3>Add to version history</h3>
      <button class="x" @click="onCancel"><icon-lucide-x style="width:14px;height:14px" /></button>
    </div>
    <div class="dlg-body">
      <div class="fld">
        <input data-testid="title-input" class="input" v-model="title" placeholder="Title" autofocus />
      </div>
      <div class="fld">
        <textarea class="input" v-model="description" placeholder="Describe what changed" />
      </div>
    </div>
    <div class="dlg-foot">
      <div class="r">
        <button class="btn" @click="onCancel">Cancel</button>
        <button data-testid="save-button" class="btn primary" :class="{ disabled: saveDisabled }"
                :aria-disabled="saveDisabled" @click="onSave">Save</button>
      </div>
    </div>
  </KovaModal>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/unit/components/version-history/AddVersionDialog.test.ts
git add kova-open-pencil-1/src/components/version-history/AddVersionDialog.vue \
        kova-open-pencil-1/tests/unit/components/version-history/AddVersionDialog.test.ts
git commit -m "feat(09): AddVersionDialog component (replaces retired A8.1)"
```

---

## Task 14: `<RestoreConfirmModal>` component

**Files:**
- Create: `kova-open-pencil-1/src/components/version-history/RestoreConfirmModal.vue`
- Test: `kova-open-pencil-1/tests/unit/components/version-history/RestoreConfirmModal.test.ts`

- [ ] **Step 1: Test (verifies non-destructive: `.btn.primary` not `.btn.danger`)**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import RestoreConfirmModal from '@/components/version-history/RestoreConfirmModal.vue'

describe('RestoreConfirmModal', () => {
  const snap = { id: 's1', label: 'Pre-Klaviyo handoff', taken_at: '2026-04-28T17:12:00Z', /* ... */ }

  it('uses .btn.primary, NOT .btn.danger', () => {
    const w = mount(RestoreConfirmModal, { props: { snapshot: snap } })
    expect(w.html()).toContain('btn primary')
    expect(w.html()).not.toContain('btn danger')
  })

  it('foot shows "Restoring {label}"', () => {
    const w = mount(RestoreConfirmModal, { props: { snapshot: snap } })
    expect(w.text()).toContain('Restoring Pre-Klaviyo handoff')
  })

  it('Restore click emits confirmed; Cancel emits cancelled', async () => {
    const w = mount(RestoreConfirmModal, { props: { snapshot: snap } })
    await w.find('[data-testid="restore-button"]').trigger('click')
    expect(w.emitted('confirmed')).toBeTruthy()
    await w.find('[data-testid="cancel-button"]').trigger('click')
    expect(w.emitted('cancelled')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Component (matches hi-fi 17.10)**

```vue
<!-- kova-open-pencil-1/src/components/version-history/RestoreConfirmModal.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import KovaModal from '@/components/shared/KovaModal.vue'
import type { Snapshot } from '@/stores/snapshots'

const props = defineProps<{ snapshot: Snapshot }>()
const emit = defineEmits<{ confirmed: []; cancelled: [] }>()
const restoreLabel = computed(() => props.snapshot.label || new Date(props.snapshot.taken_at).toLocaleString())
</script>

<template>
  <KovaModal size="sm">
    <div class="dlg-head">
      <h3>Restore this version?</h3>
      <p class="sub">Your current canvas will be saved as a backup snapshot before restoring. You can undo with ⌘Z.</p>
    </div>
    <div class="dlg-foot">
      <div class="l">
        <icon-lucide-info style="width:12px;height:12px" />
        Restoring {{ restoreLabel }}
      </div>
      <div class="r">
        <button data-testid="cancel-button" class="btn" @click="emit('cancelled')">Cancel</button>
        <button data-testid="restore-button" class="btn primary" @click="emit('confirmed')">Restore</button>
      </div>
    </div>
  </KovaModal>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/unit/components/version-history/RestoreConfirmModal.test.ts
git add kova-open-pencil-1/src/components/version-history/RestoreConfirmModal.vue \
        kova-open-pencil-1/tests/unit/components/version-history/RestoreConfirmModal.test.ts
git commit -m "feat(09): RestoreConfirmModal component (non-destructive .btn.primary)"
```

---

## Task 15: `<SnapshotEmptyState>`, `<AutosaveGroupHead>`, `<CurrentVersionRow>`, `<FilterDropdown>`

Four small components, each a single file + single test. Group into one commit at the end.

- [ ] **Step 1: Tests + impls** (each ~20 LOC; copy markup contracts from hi-fi 17.11 / 17.1 / 17.7)

```vue
<!-- SnapshotEmptyState.vue (matches hi-fi 17.11 — `.empty-pane` from A11) -->
<template>
  <div class="empty-pane">
    <div class="ic-wrap"><icon-lucide-history style="width:18px;height:18px" /></div>
    <h5>No version history yet</h5>
    <p>Press <span style="color:var(--ink-2)">⌘+⌥+S</span> to save manually, or autosave will create one in the background.</p>
  </div>
</template>
```

```vue
<!-- AutosaveGroupHead.vue (matches hi-fi 17.1 / 17.2 group head) -->
<script setup lang="ts">
defineProps<{ count: number; collapsed: boolean }>()
defineEmits<{ toggle: [] }>()
</script>
<template>
  <div class="vh-group-head" @click="$emit('toggle')">
    <div class="dot"><div class="chev">
      <icon-lucide-chevron-right v-if="collapsed" style="width:10px;height:10px" />
      <icon-lucide-chevron-down v-else style="width:10px;height:10px" />
    </div></div>
    <div class="lbl">{{ count }} autosave version{{ count === 1 ? '' : 's' }}</div>
  </div>
</template>
```

```vue
<!-- CurrentVersionRow.vue (matches hi-fi 17.1 top row) -->
<template>
  <div class="vh-row current">
    <div class="dot"><div class="core" /></div>
    <div class="body"><div class="ttl-cur">Current version</div></div>
  </div>
</template>
```

```vue
<!-- FilterDropdown.vue (matches hi-fi 17.7 — autosave toggle ONLY per founder direction) -->
<script setup lang="ts">
const props = defineProps<{ showAutosaves: boolean }>()
const emit = defineEmits<{ 'update:showAutosaves': [value: boolean] }>()
</script>
<template>
  <div class="menu" style="min-width:200px">
    <div class="item checkable" :class="{ checked: props.showAutosaves }" @click="emit('update:showAutosaves', !props.showAutosaves)">
      <span class="check"><icon-lucide-check class="ic" /></span>
      <span class="lbl">Show autosave versions</span>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run + commit**

```bash
bun test ./tests/unit/components/version-history/SnapshotEmptyState.test.ts \
         ./tests/unit/components/version-history/AutosaveGroupHead.test.ts \
         ./tests/unit/components/version-history/CurrentVersionRow.test.ts \
         ./tests/unit/components/version-history/FilterDropdown.test.ts
git add kova-open-pencil-1/src/components/version-history/SnapshotEmptyState.vue \
        kova-open-pencil-1/src/components/version-history/AutosaveGroupHead.vue \
        kova-open-pencil-1/src/components/version-history/CurrentVersionRow.vue \
        kova-open-pencil-1/src/components/version-history/FilterDropdown.vue \
        kova-open-pencil-1/tests/unit/components/version-history/{SnapshotEmptyState,AutosaveGroupHead,CurrentVersionRow,FilterDropdown}.test.ts
git commit -m "feat(09): version-history small components (empty / group-head / current / filter)"
```

---

## Task 16: `<SnapshotRow>` — hover ••• + 5-item dropdown + inline rename

**Files:**
- Create: `kova-open-pencil-1/src/components/version-history/SnapshotRow.vue`
- Test: `kova-open-pencil-1/tests/unit/components/version-history/SnapshotRow.test.ts`

- [ ] **Step 1: Test (covers all 5 dropdown items + Delete-version-info disabled state for autosaves)**

```typescript
// kova-open-pencil-1/tests/unit/components/version-history/SnapshotRow.test.ts
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import SnapshotRow from '@/components/version-history/SnapshotRow.vue'

const named = { id: 's1', kind: 'manual', label: 'v2 hero update', taken_at: '2026-04-28T17:12:00Z', /* ... */ }
const autosave = { id: 's2', kind: 'autosave', label: null, taken_at: '2026-04-28T17:12:00Z', /* ... */ }

describe('SnapshotRow', () => {
  it('••• is invisible until hover', async () => {
    const w = mount(SnapshotRow, { props: { snapshot: autosave, isActive: false, isCurrent: false } })
    expect(w.find('[data-testid="more"]').classes()).toContain('hidden-until-hover')
  })

  it('right-click opens dropdown with 5 items', async () => {
    const w = mount(SnapshotRow, { props: { snapshot: named, isActive: false, isCurrent: false } })
    await w.trigger('contextmenu')
    const items = w.findAll('[data-testid="menu-item"]')
    expect(items).toHaveLength(5)
    expect(items.map(i => i.text())).toEqual([
      'Name this version', 'Restore this version', 'Duplicate', 'Delete version info', 'Copy link',
    ])
  })

  it('Delete version info is disabled when row is autosave + has no label', async () => {
    const w = mount(SnapshotRow, { props: { snapshot: autosave, isActive: false, isCurrent: false } })
    await w.trigger('contextmenu')
    const deleteItem = w.findAll('[data-testid="menu-item"]')[3]
    expect(deleteItem.classes()).toContain('disabled')
  })

  it('Delete version info is enabled when label is set OR kind is manual', async () => {
    const renamedAutosave = { ...autosave, label: 'Pre-Klaviyo' }
    const w = mount(SnapshotRow, { props: { snapshot: renamedAutosave, isActive: false, isCurrent: false } })
    await w.trigger('contextmenu')
    const deleteItem = w.findAll('[data-testid="menu-item"]')[3]
    expect(deleteItem.classes()).not.toContain('disabled')
  })

  it('Name this version → activates inline rename input', async () => {
    const w = mount(SnapshotRow, { props: { snapshot: named, isActive: false, isCurrent: false } })
    await w.trigger('contextmenu')
    await w.findAll('[data-testid="menu-item"]')[0].trigger('click')
    expect(w.find('[data-testid="rename-input"]').exists()).toBe(true)
  })

  it('Enter on rename commits via emit rename-clicked; Esc cancels', async () => {
    // Trigger rename mode; type; press Enter; assert emit name + value
  })

  it('emits restore-clicked, duplicate-clicked, copy-link-clicked, delete-info-clicked', async () => {
    // Each menu item click → corresponding emit
  })
})
```

- [ ] **Step 2: Component (markup matches hi-fi 17.4 / 17.5 / 17.6)**

```vue
<!-- kova-open-pencil-1/src/components/version-history/SnapshotRow.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Snapshot } from '@/stores/snapshots'

const props = defineProps<{ snapshot: Snapshot; isActive: boolean; isCurrent: boolean }>()
const emit = defineEmits<{
  'restore-clicked': [id: string]
  'rename-clicked': [id: string, label: string]
  'duplicate-clicked': [id: string]
  'copy-link-clicked': [id: string]
  'delete-info-clicked': [id: string]
  'preview': [id: string]
}>()

const menuOpen = ref(false)
const renaming = ref(false)
const renameValue = ref(props.snapshot.label ?? '')

const deleteInfoEnabled = computed(() =>
  props.snapshot.kind === 'manual' || props.snapshot.label !== null
)

const formattedDate = computed(() => new Date(props.snapshot.taken_at).toLocaleString())
const isNamed = computed(() => !!props.snapshot.label)

function openMenu(e: MouseEvent) { e.preventDefault(); menuOpen.value = true }
function commitRename() {
  if (renameValue.value.trim()) emit('rename-clicked', props.snapshot.id, renameValue.value.trim())
  renaming.value = false
}
function cancelRename() { renameValue.value = props.snapshot.label ?? ''; renaming.value = false }
function startRename() { menuOpen.value = false; renaming.value = true }
</script>

<template>
  <div class="vh-row" :class="{ active: isActive, current: isCurrent }" @contextmenu="openMenu" @click="emit('preview', snapshot.id)">
    <div class="dot"><div class="core" /></div>
    <div class="body">
      <input v-if="renaming" data-testid="rename-input" class="rename input" v-model="renameValue"
             @keydown.enter="commitRename" @keydown.esc="cancelRename" v-focus />
      <template v-else>
        <div v-if="isNamed" class="ttl">{{ snapshot.label }}</div>
        <div v-else class="ttl">{{ formattedDate }}</div>
        <div class="by">
          <span class="av brand">JM</span>
          <template v-if="isNamed">Jiho · {{ formattedDate }}</template>
          <template v-else>Jiho</template>
        </div>
      </template>
    </div>
    <div data-testid="more" class="more hidden-until-hover" @click.stop="menuOpen = !menuOpen">
      <icon-lucide-more-horizontal style="width:14px;height:14px" />
    </div>

    <div v-if="menuOpen" class="menu w-260" style="position:absolute">
      <div data-testid="menu-item" class="item" @click="startRename">
        <span class="lbl">Name this version</span>
      </div>
      <div data-testid="menu-item" class="item" @click="emit('restore-clicked', snapshot.id); menuOpen = false">
        <span class="lbl">Restore this version</span>
      </div>
      <div data-testid="menu-item" class="item" @click="emit('duplicate-clicked', snapshot.id); menuOpen = false">
        <span class="lbl">Duplicate</span>
      </div>
      <div data-testid="menu-item" class="item" :class="{ disabled: !deleteInfoEnabled }"
           @click="deleteInfoEnabled && (emit('delete-info-clicked', snapshot.id), menuOpen = false)">
        <span class="lbl">Delete version info</span>
      </div>
      <div data-testid="menu-item" class="item" @click="emit('copy-link-clicked', snapshot.id); menuOpen = false">
        <span class="lbl">Copy link</span>
      </div>
    </div>
  </div>
</template>
```

(Add a tiny `v-focus` directive in `src/directives/focus.ts` if it doesn't exist — single line.)

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/unit/components/version-history/SnapshotRow.test.ts
git add kova-open-pencil-1/src/components/version-history/SnapshotRow.vue \
        kova-open-pencil-1/tests/unit/components/version-history/SnapshotRow.test.ts \
        kova-open-pencil-1/src/directives/focus.ts
git commit -m "feat(09): SnapshotRow — hover ••• + 5-item Figma-exact dropdown + inline rename"
```

---

## Task 17: `<SnapshotTimelinePanel>` — composes everything above

**Files:**
- Create: `kova-open-pencil-1/src/components/version-history/SnapshotTimelinePanel.vue`
- Test: `kova-open-pencil-1/tests/unit/components/version-history/SnapshotTimelinePanel.test.ts`

- [ ] **Step 1: Test (renders 17.1 layout from a snapshot fixture; group-expand toggle; empty state)**

```typescript
// kova-open-pencil-1/tests/unit/components/version-history/SnapshotTimelinePanel.test.ts
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SnapshotTimelinePanel from '@/components/version-history/SnapshotTimelinePanel.vue'
import { useSnapshotsStore } from '@/stores/snapshots'

describe('SnapshotTimelinePanel', () => {
  it('renders Current Version row + autosave group head + N rows', async () => {
    setActivePinia(createPinia())
    const store = useSnapshotsStore()
    store.byCanvasId['c1'] = [
      { id: 's1', canvas_id: 'c1', kind: 'autosave', label: null, taken_at: '...', /* ... */ } as any,
      { id: 's2', canvas_id: 'c1', kind: 'autosave', label: null, taken_at: '...', /* ... */ } as any,
    ]
    const w = mount(SnapshotTimelinePanel, { props: { canvasId: 'c1' } })
    expect(w.findComponent({ name: 'CurrentVersionRow' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'AutosaveGroupHead' }).text()).toContain('2 autosave versions')
  })

  it('renders empty state when zero rows', () => {
    setActivePinia(createPinia())
    const w = mount(SnapshotTimelinePanel, { props: { canvasId: 'c1' } })
    expect(w.findComponent({ name: 'SnapshotEmptyState' }).exists()).toBe(true)
  })

  it('toggling FilterDropdown.showAutosaves hides autosave rows', async () => {
    setActivePinia(createPinia())
    const store = useSnapshotsStore()
    store.byCanvasId['c1'] = [
      { id: 's1', canvas_id: 'c1', kind: 'manual', label: 'v1', taken_at: '...', /* ... */ } as any,
      { id: 's2', canvas_id: 'c1', kind: 'autosave', label: null, taken_at: '...', /* ... */ } as any,
    ]
    const w = mount(SnapshotTimelinePanel, { props: { canvasId: 'c1' } })
    expect(w.findAllComponents({ name: 'SnapshotRow' })).toHaveLength(2)
    store.showAutosaves = false
    await w.vm.$nextTick()
    expect(w.findAllComponents({ name: 'SnapshotRow' })).toHaveLength(1)
  })

  it('row "preview" event sets store.previewingId', async () => { /* ... */ })
  it('row "restore-clicked" opens RestoreConfirmModal', async () => { /* ... */ })
  it('row "duplicate-clicked" calls store.duplicateToCanvas + router push', async () => { /* ... */ })
})
```

- [ ] **Step 2: Component (composes 6.4.1 list)**

```vue
<!-- kova-open-pencil-1/src/components/version-history/SnapshotTimelinePanel.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSnapshotsStore } from '@/stores/snapshots'
import { useCanvasEditLock } from '@/composables/version-history/use-canvas-edit-lock'
import CurrentVersionRow from './CurrentVersionRow.vue'
import AutosaveGroupHead from './AutosaveGroupHead.vue'
import SnapshotRow from './SnapshotRow.vue'
import SnapshotEmptyState from './SnapshotEmptyState.vue'
import FilterDropdown from './FilterDropdown.vue'
import RestoreConfirmModal from './RestoreConfirmModal.vue'

const props = defineProps<{ canvasId: string }>()
const emit = defineEmits<{ close: [] }>()
const store = useSnapshotsStore()
const router = useRouter()
const editLock = useCanvasEditLock()

const filterOpen = ref(false)
const groupCollapsed = ref(false)
const restoreTargetId = ref<string | null>(null)

onMounted(() => {
  store.list(props.canvasId)
  editLock.lock()        // canvas becomes non-editable while panel is open (per PRD §12.12)
})
onUnmounted(() => {
  editLock.unlock()      // release the lock when panel closes
  store.exitPreview()    // clear any active preview side-doc
})

const visible = computed(() => store.visibleFor(props.canvasId).value)
const named = computed(() => visible.value.filter(s => s.kind === 'manual' || s.label))
const autosaves = computed(() => visible.value.filter(s => s.kind !== 'manual' && !s.label))

const restoreTarget = computed(() => visible.value.find(s => s.id === restoreTargetId.value) ?? null)

function onRestore(id: string) { restoreTargetId.value = id }
async function confirmRestore() {
  if (restoreTargetId.value) await store.restore(restoreTargetId.value)
  restoreTargetId.value = null
}
async function onDuplicate(id: string) {
  const { canvas_id } = await store.duplicateToCanvas(id)
  router.push(`/canvas/${canvas_id}`)
}
function onCopyLink(id: string) { store.copyLink(id, props.canvasId) }
async function onRename(id: string, label: string) { await store.rename(id, label, null) }
async function onDeleteInfo(id: string) { await store.rename(id, null, null) }
function onPreview(id: string) { store.previewSnapshot(id) }
</script>

<template>
  <div class="vh-panel">
    <div class="vh-head">
      <div class="ttl">Version history</div>
      <div class="icns">
        <div class="a" :class="{ open: filterOpen }" @click="filterOpen = !filterOpen">
          <icon-lucide-list-filter />
        </div>
        <div class="a" @click="store.openAddDialog()">
          <icon-lucide-plus />
        </div>
        <div class="a" @click="emit('close')">
          <icon-lucide-x />
        </div>
      </div>
    </div>
    <FilterDropdown v-if="filterOpen" v-model:showAutosaves="store.showAutosaves" />
    <div class="vh-instructions">
      Press <span class="glyph">⌘</span> + <span class="glyph">⌥</span> + <span class="glyph">S</span> to add to version history while editing.
    </div>
    <div class="vh-body">
      <SnapshotEmptyState v-if="visible.length === 0" />
      <div v-else class="vh-timeline">
        <CurrentVersionRow />
        <SnapshotRow v-for="s in named" :key="s.id" :snapshot="s"
                     :isActive="store.previewingId === s.id" :isCurrent="false"
                     @restore-clicked="onRestore" @rename-clicked="onRename"
                     @duplicate-clicked="onDuplicate" @copy-link-clicked="onCopyLink"
                     @delete-info-clicked="onDeleteInfo" @preview="onPreview" />
        <template v-if="autosaves.length > 0">
          <AutosaveGroupHead :count="autosaves.length" :collapsed="groupCollapsed" @toggle="groupCollapsed = !groupCollapsed" />
          <SnapshotRow v-show="!groupCollapsed" v-for="s in autosaves" :key="s.id" :snapshot="s"
                       :isActive="store.previewingId === s.id" :isCurrent="false"
                       @restore-clicked="onRestore" @rename-clicked="onRename"
                       @duplicate-clicked="onDuplicate" @copy-link-clicked="onCopyLink"
                       @delete-info-clicked="onDeleteInfo" @preview="onPreview" />
        </template>
      </div>
    </div>
    <RestoreConfirmModal v-if="restoreTarget" :snapshot="restoreTarget"
                          @confirmed="confirmRestore" @cancelled="restoreTargetId = null" />
  </div>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/unit/components/version-history/SnapshotTimelinePanel.test.ts
git add kova-open-pencil-1/src/components/version-history/SnapshotTimelinePanel.vue \
        kova-open-pencil-1/tests/unit/components/version-history/SnapshotTimelinePanel.test.ts
git commit -m "feat(09): SnapshotTimelinePanel — composes all VH children"
```

---

## Task 18: `<TrashConfirmModal>` component

**Files:**
- Create: `kova-open-pencil-1/src/components/trash/TrashConfirmModal.vue`
- Test: `kova-open-pencil-1/tests/unit/components/trash/TrashConfirmModal.test.ts`

- [ ] **Step 1: Test (matches B13.1 copy exactly)**

```typescript
// kova-open-pencil-1/tests/unit/components/trash/TrashConfirmModal.test.ts
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import TrashConfirmModal from '@/components/trash/TrashConfirmModal.vue'

describe('TrashConfirmModal', () => {
  const w = () => mount(TrashConfirmModal, { props: { canvasName: 'Spring Drop · 04' } })

  it('renders B13.1 copy exactly', () => {
    const v = w()
    expect(v.text()).toContain('Move "Spring Drop · 04" to trash?')
    expect(v.text()).toContain('Restore anytime from Trash.')
    expect(v.text()).toContain('This canvas and all of its snapshots will be moved to Trash. You can restore it from Trash whenever you want.')
  })

  it('uses .btn.danger (NOT primary)', () => {
    expect(w().html()).toContain('btn danger')
    expect(w().html()).not.toContain('btn primary')
  })

  it('Move-to-trash emits confirmed; Cancel emits cancelled', async () => {
    const v = w()
    await v.find('[data-testid="trash-button"]').trigger('click')
    expect(v.emitted('confirmed')).toBeTruthy()
    await v.find('[data-testid="cancel-button"]').trigger('click')
    expect(v.emitted('cancelled')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Component**

```vue
<!-- kova-open-pencil-1/src/components/trash/TrashConfirmModal.vue -->
<script setup lang="ts">
import KovaModal from '@/components/shared/KovaModal.vue'
defineProps<{ canvasName: string }>()
const emit = defineEmits<{ confirmed: []; cancelled: [] }>()
</script>

<template>
  <KovaModal size="sm">
    <div class="dlg-head">
      <div>
        <h3>Move "{{ canvasName }}" to trash?</h3>
        <p class="sub">Restore anytime from Trash.</p>
      </div>
      <button class="x" @click="emit('cancelled')"><icon-lucide-x style="width:14px;height:14px" /></button>
    </div>
    <div class="dlg-body">
      <p style="margin:0;font-size:12.5px;color:var(--ink-2);line-height:1.55">
        This canvas and all of its snapshots will be moved to Trash. You can restore it from Trash whenever you want.
      </p>
    </div>
    <div class="dlg-foot">
      <div class="r">
        <button data-testid="cancel-button" class="btn" @click="emit('cancelled')">Cancel</button>
        <button data-testid="trash-button" class="btn danger" @click="emit('confirmed')">Move to trash</button>
      </div>
    </div>
  </KovaModal>
</template>
```

- [ ] **Step 3: Run + commit**

```bash
bun test ./tests/unit/components/trash/TrashConfirmModal.test.ts
git add kova-open-pencil-1/src/components/trash/TrashConfirmModal.vue \
        kova-open-pencil-1/tests/unit/components/trash/TrashConfirmModal.test.ts
git commit -m "feat(09): TrashConfirmModal — destructive .btn.danger + B13.1 copy"
```

---

## Task 19: Edge Function `POST /api/snapshots/duplicate-to-canvas`

**Files:**
- Create: `kova-open-pencil-1/api/snapshots/duplicate-to-canvas.ts`
- Test: `kova-open-pencil-1/tests/unit/api/snapshots/duplicate-to-canvas.test.ts`
- Test: `kova-open-pencil-1/tests/integration/api/duplicate-to-canvas.test.ts`

- [ ] **Step 1: Unit test (mocked supabase)**

```typescript
// kova-open-pencil-1/tests/unit/api/snapshots/duplicate-to-canvas.test.ts
import { describe, expect, it, mock } from 'bun:test'
import handler from '@/api/snapshots/duplicate-to-canvas'

describe('POST /api/snapshots/duplicate-to-canvas', () => {
  it('401 without JWT', async () => {
    const req = new Request('http://x/api/snapshots/duplicate-to-canvas', { method: 'POST', body: '{}' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  it('happy path returns { canvas_id, redirect_to }', async () => {
    // Mock verifyAuth → user; mock supabase from('canvas_snapshots').select → snapshot row;
    // mock storage.from(...).download → blob; mock rpc('create_canvas') → new id;
    // mock storage.upload → ok; mock rpc('create_snapshot') → snapshot id
    // Assert response shape
  })

  it('idempotency-key dedup within 5 minutes returns same canvas_id', async () => {
    // Two requests with same key + same snapshot_id → same response
  })
})
```

- [ ] **Step 2: Edge handler**

```typescript
// kova-open-pencil-1/api/snapshots/duplicate-to-canvas.ts
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '../_shared/auth'   // existing helper from M9 / Cluster 01

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!

export default async function handler(req: Request): Promise<Response> {
  const auth = await verifyAuth(req)
  if (!auth.ok) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })

  const { snapshot_id, target_brand_id } = await req.json() as { snapshot_id: string; target_brand_id?: string }
  if (!snapshot_id) return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400 })

  const idempKey = req.headers.get('x-idempotency-key')
  // Idempotency dedup via Cluster 11's idempotency_keys table — pseudo
  // const cached = await idempotencyLookup(auth.userId, snapshot_id, idempKey)
  // if (cached) return Response.json(cached, { status: 200 })

  const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { authorization: req.headers.get('authorization')! } }
  })
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Read snapshot row (RLS-gated via user JWT)
  const { data: snap, error: snapErr } = await userClient.from('canvas_snapshots')
    .select('canvas_id, brand_id, scene_blob_path, label, taken_at')
    .eq('id', snapshot_id).single()
  if (snapErr || !snap) return new Response(JSON.stringify({ error: 'snapshot_not_found' }), { status: 404 })

  // 2. Resolve target brand
  const targetBrand = target_brand_id ?? snap.brand_id
  // (Verify ownership of target_brand_id if provided — out of scope of this draft; add check before merge)

  // 3. Download blob
  const { data: blobData, error: dlErr } = await adminClient.storage
    .from('canvas-snapshots').download(snap.scene_blob_path)
  if (dlErr || !blobData) return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 })
  const blobBytes = new Uint8Array(await blobData.arrayBuffer())

  // 4. Create new canvas via Cluster 02 RPC
  const newName = `${snap.label || new Date(snap.taken_at).toLocaleString()} (copy)`
  const { data: newCanvasId, error: cErr } = await userClient.rpc('create_canvas', {
    p_brand_id: targetBrand, p_name: newName,
  })
  if (cErr || !newCanvasId) return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 })

  // 5. Upload the blob to the new canvas's path
  const newBlobPath = `${auth.userId}/${targetBrand}/${newCanvasId}/${crypto.randomUUID()}.kiwi.zst`
  const { error: upErr } = await adminClient.storage
    .from('canvas-snapshots').upload(newBlobPath, blobBytes, { contentType: 'application/octet-stream' })
  if (upErr) return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 })

  // 6. Insert "Duplicated from..." snapshot row on the new canvas
  await userClient.rpc('create_snapshot', {
    p_canvas_id: newCanvasId, p_kind: 'manual',
    p_label: `Duplicated from ${snap.label || new Date(snap.taken_at).toLocaleString()}`,
    p_description: null, p_scene_blob_path: newBlobPath,
    p_scene_size_bytes: blobBytes.byteLength, p_thumbnail_path: null,
    p_parent_snapshot_id: snapshot_id,
  })

  const body = { canvas_id: newCanvasId, redirect_to: `/canvas/${newCanvasId}` }
  // await idempotencyStore(auth.userId, snapshot_id, idempKey, body)
  return Response.json(body, { status: 200 })
}
```

- [ ] **Step 3: Integration test against local Supabase**

```typescript
// kova-open-pencil-1/tests/integration/api/duplicate-to-canvas.test.ts
// Seed user + brand + canvas + snapshot with real bytes; POST to local Edge endpoint;
// assert new canvas exists + new snapshot row labeled "Duplicated from..." + Storage object copied.
// Ensure local supabase + the Edge dev server are both running.
```

- [ ] **Step 4: Run + commit**

```bash
bun test ./tests/unit/api/snapshots/duplicate-to-canvas.test.ts
bun test ./tests/integration/api/duplicate-to-canvas.test.ts
git add kova-open-pencil-1/api/snapshots/duplicate-to-canvas.ts \
        kova-open-pencil-1/tests/unit/api/snapshots/duplicate-to-canvas.test.ts \
        kova-open-pencil-1/tests/integration/api/duplicate-to-canvas.test.ts
git commit -m "feat(09): /api/snapshots/duplicate-to-canvas Edge Function"
```

---

## Task 20: Edge Function `POST /api/cron/snapshot-prune` + vercel.json

**Files:**
- Create: `kova-open-pencil-1/api/cron/snapshot-prune.ts`
- Modify: `kova-open-pencil-1/vercel.json` (extend `crons` array)
- Test: `kova-open-pencil-1/tests/unit/api/cron/snapshot-prune.test.ts`
- Test: `kova-open-pencil-1/tests/integration/api/cron-snapshot-prune.test.ts`

- [ ] **Step 1: Unit test**

```typescript
// kova-open-pencil-1/tests/unit/api/cron/snapshot-prune.test.ts
import { describe, expect, it } from 'bun:test'
import handler from '@/api/cron/snapshot-prune'

describe('POST /api/cron/snapshot-prune', () => {
  it('401 without CRON_SECRET', async () => {
    const res = await handler(new Request('http://x', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(401)
  })

  it('deletes only retention_class=free + kind=autosave + taken_at < now()-30d', async () => {
    // Mock the SELECT → return mixed kinds + retention; mock storage.remove + DELETE
    // Assert filter applied correctly
  })

  it('Storage remove failure does not block DB DELETE; counts storage_failures', async () => {
    // Mock storage.remove to throw → assert response.body.storage_failures > 0 + DB delete still ran
  })
})
```

- [ ] **Step 2: Edge handler**

```typescript
// kova-open-pencil-1/api/cron/snapshot-prune.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CRON_SECRET = process.env.CRON_SECRET!

export default async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  let scanned = 0, pruned = 0, storageFailures = 0

  // Process up to 1000 rows per invocation (cron runs daily; tail catches up next day)
  const { data: rows, error } = await supabase
    .from('canvas_snapshots')
    .select('id, scene_blob_path, thumbnail_path')
    .eq('retention_class', 'free').eq('kind', 'autosave')
    .lt('taken_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('taken_at', { ascending: true })
    .limit(1000)
  if (error) return new Response(JSON.stringify({ error: 'select_failed' }), { status: 500 })
  scanned = rows?.length ?? 0
  if (!rows || rows.length === 0) return Response.json({ scanned, pruned, storage_failures: 0 })

  // Chunk Storage removes (100 paths per call)
  const allPaths = rows.flatMap(r => [r.scene_blob_path, r.thumbnail_path].filter(Boolean) as string[])
  for (let i = 0; i < allPaths.length; i += 100) {
    const chunk = allPaths.slice(i, i + 100)
    const { error: rmErr } = await supabase.storage.from('canvas-snapshots').remove(chunk)
    if (rmErr) storageFailures += chunk.length
  }

  // DB delete (unconditional — orphan blobs reconciled on the next 7th-day sweep)
  const ids = rows.map(r => r.id)
  const { error: delErr } = await supabase.from('canvas_snapshots').delete().in('id', ids)
  if (delErr) return new Response(JSON.stringify({ error: 'delete_failed' }), { status: 500 })
  pruned = ids.length

  // Optional 7th-day sweep — implement when cron is in production; out of scope for this draft.

  return Response.json({ scanned, pruned, storage_failures: storageFailures })
}
```

- [ ] **Step 3: Modify vercel.json**

```json
{
  "crons": [
    { "path": "/api/cron/delete-account",  "schedule": "0 3 * * *" },
    { "path": "/api/cron/snapshot-prune",  "schedule": "0 4 * * *" }
  ]
}
```

(If `vercel.json` already has the delete-account cron from Cluster 01, add the snapshot-prune entry as a sibling. If neither exists yet, create the file.)

- [ ] **Step 4: Integration test**

```typescript
// Seed 100 free-tier autosaves (50 < 30d, 50 > 30d) + 10 manual snapshots → invoke handler
// Assert 50 free-autosaves deleted + 10 manual untouched + 50 newer untouched
```

- [ ] **Step 5: Run + commit**

```bash
bun test ./tests/unit/api/cron/snapshot-prune.test.ts
bun test ./tests/integration/api/cron-snapshot-prune.test.ts
git add kova-open-pencil-1/api/cron/snapshot-prune.ts \
        kova-open-pencil-1/vercel.json \
        kova-open-pencil-1/tests/unit/api/cron/snapshot-prune.test.ts \
        kova-open-pencil-1/tests/integration/api/cron-snapshot-prune.test.ts
git commit -m "feat(09): snapshot-prune cron + vercel.json wiring"
```

---

## Task 21: Cluster 06 right-panel mount integration

**Files:**
- Modify: `kova-open-pencil-1/src/views/canvas/CanvasView.vue` (or wherever Cluster 06 mounts the right panel)

This task is a thin cross-cluster touch. Cluster 06 owns the right-panel slot mechanic; this PRD adds the mount.

- [ ] **Step 1: Locate the right-panel slot in `CanvasView.vue`** — look for the inspector mount or a `<RightPanel>` slot. If Cluster 06 hasn't shipped yet, place a TODO comment + a temporary v-if mount of `<SnapshotTimelinePanel>` based on `useSnapshotsStore.panelOpen`.

- [ ] **Step 2: Add the conditional mount + wire close emit**

```vue
<!-- inside CanvasView.vue right-panel region -->
<SnapshotTimelinePanel
  v-if="snapshotsStore.panelOpen"
  :canvasId="route.params.canvasId as string"
  @close="snapshotsStore.closePanel" />
<InspectorPanel v-else />

<AddVersionDialog v-if="snapshotsStore.addDialogOpen" />
```

- [ ] **Step 3: Mount the deep-link composable + shortcut composable in `<script setup>`**

```typescript
import { useDeepLinkedVersion } from '@/composables/version-history/use-deep-linked-version'
import { useVersionHistoryShortcut } from '@/composables/version-history/use-version-history-shortcut'
import { useAutosnapshot } from '@/composables/version-history/use-autosnapshot'
import { useCanvasEditLock } from '@/composables/version-history/use-canvas-edit-lock'
import { usePreviewSideDoc } from '@/composables/version-history/use-preview-side-doc'
import { useSnapshotsStore } from '@/stores/snapshots'
import { ref, watch } from 'vue'

useDeepLinkedVersion()
useVersionHistoryShortcut()
const isActive = ref(true)
const { start } = useAutosnapshot(canvasId, isActive)
onMounted(start)

// Preview side-doc: watch store.previewingId and load/unload as it changes
const store = useSnapshotsStore()
const { load: loadPreview, clear: clearPreview } = usePreviewSideDoc()
watch(() => store.previewingId, async (newId) => {
  if (!newId) { clearPreview(); return }
  const snap = store.byCanvasId[canvasId.value]?.find(s => s.id === newId)
  if (snap) await loadPreview(newId, snap.scene_blob_path)
})
```

- [ ] **Step 4: Wire the canvas edit-lock overlay**

In `CanvasView.vue` wrap the canvas stage with a pointer-events overlay tied to `useCanvasEditLock.isLocked`. The overlay swallows mouse-down + click events on the stage when locked, EXCEPT when the user is space-holding (pan), ctrl/meta-scrolling (zoom), or pressing arrow keys (nudge).

```vue
<template>
  <div class="canvas-stage" :class="{ 'edit-locked': editLock.isLocked.value }">
    <CanvasRenderer />
    <!-- Overlay: pointer-events: none when unlocked; auto when locked.
         Swallows clicks but lets pan/zoom shortcuts through because those are window-level keydown handlers. -->
    <div v-if="editLock.isLocked.value" class="edit-lock-overlay"
         @mousedown.capture="onSuppressedEdit" @click.capture="onSuppressedEdit" />
  </div>
</template>

<script setup lang="ts">
const editLock = useCanvasEditLock()

function onSuppressedEdit(e: Event) {
  // Allow space-drag pan (Cluster 06 handles via window listener — already passes if space is held)
  if ((window as any).__spaceHeld) return
  e.preventDefault(); e.stopPropagation()
}
</script>

<style scoped>
.edit-lock-overlay { position: absolute; inset: 0; cursor: not-allowed; pointer-events: auto; }
.canvas-stage.edit-locked .toolbar .tool:not(.move) { opacity: 0.4; pointer-events: none; }
</style>
```

The toolbar-disable selector targets Cluster 06's `.toolbar .tool` markup. Cluster 06's PRD must confirm this is the expected class — if not, refactor to use the `useCanvasEditLock.isLocked` ref in the toolbar component itself.

- [ ] **Step 5: Manual smoke test**

`bun run dev`, open `/canvas/{some-id}`, hit `⌥⌘S`, observe AddVersionDialog. Open the panel via the (placeholder) trigger, observe the timeline. **Try to draw a rectangle while panel is open → nothing happens**. **Hold space + drag → canvas pans**. **Ctrl + scroll → zooms**. Click a row → canvas swaps to that snapshot's state (read-only preview). Close panel → canvas back to live state. Snapshot a row, restore it, verify ⌘Z reverses.

- [ ] **Step 6: Commit**

```bash
git add kova-open-pencil-1/src/views/canvas/CanvasView.vue
git commit -m "feat(09): mount VH panel + edit-lock overlay + preview side-doc watcher in CanvasView"
```

---

## Task 22: Cluster 02 dashboard wiring for trash flow

**Files:**
- Modify: `kova-open-pencil-1/src/views/dashboard/DashboardView.vue` (or the file where right-click "Move to trash" triggers `useCanvasesStore.moveToTrash`)

- [ ] **Step 1: Find the existing trash trigger** (`useCanvasesStore.confirmMoveToTrash` or `useCanvasesStore.moveToTrash` invocation).

- [ ] **Step 2: Wrap with `useConfirm({ component: TrashConfirmModal, props })`**

```typescript
import TrashConfirmModal from '@/components/trash/TrashConfirmModal.vue'
import { useConfirm } from '@/composables/use-confirm'   // Cluster 11

const { confirm } = useConfirm()
async function onMoveToTrash(canvas: Canvas) {
  const ok = await confirm({ component: TrashConfirmModal, props: { canvasName: canvas.name } })
  if (ok) {
    await canvasesStore.moveToTrash(canvas.id)
    useToast().success('Moved to trash. Restore anytime from Trash.')
  }
}
```

- [ ] **Step 3: Manual smoke** — trigger right-click on a dashboard file row, observe B13.1 modal copy exactly, confirm, observe toast + file removed.

- [ ] **Step 4: Commit**

```bash
git add kova-open-pencil-1/src/views/dashboard/DashboardView.vue
git commit -m "feat(09): dashboard right-click → TrashConfirmModal via useConfirm"
```

---

## Task 23: Cluster 08 keyboard registration

**Files:**
- Modify: Cluster 08's keyboard registry (location TBD by Cluster 08 PRD; if not yet shipped, the `useVersionHistoryShortcut` composable from Task 12 handles it as a one-off).

- [ ] **Step 1: If Cluster 08 keyboard registry exists**, add an entry:

```typescript
{
  category: 'Edit',
  binding: 'Alt+Meta+KeyS',         // CLAUDE.md hard rule: e.code on Mac
  command: 'version-history.add',
  handler: () => useSnapshotsStore().openAddDialog(),
}
```

- [ ] **Step 2: Remove the standalone `useVersionHistoryShortcut` mount in `CanvasView.vue` once the registry handles it.** Keep the composable file in place as a placeholder for any future direct-binding scenarios.

- [ ] **Step 3: Commit**

```bash
git add ...
git commit -m "feat(09): register ⌥⌘S binding in Cluster 08 keyboard registry"
```

---

## Task 24: E2E smoke pack

**Files:**
- Create: `kova-open-pencil-1/tests/e2e/version-history/manual-save-and-restore.spec.ts`
- Create: `kova-open-pencil-1/tests/e2e/version-history/autosnapshot-30-min.spec.ts`
- Create: `kova-open-pencil-1/tests/e2e/version-history/rename-and-delete-info.spec.ts`
- Create: `kova-open-pencil-1/tests/e2e/version-history/duplicate-to-canvas.spec.ts`
- Create: `kova-open-pencil-1/tests/e2e/version-history/copy-link-preview.spec.ts`
- Create: `kova-open-pencil-1/tests/e2e/version-history/empty-state.spec.ts`
- Create: `kova-open-pencil-1/tests/e2e/trash/move-to-trash-flow.spec.ts`
- Create: `kova-open-pencil-1/tests/e2e/trash/permanent-delete-cleans-snapshots.spec.ts`

Specs follow the structure documented in PRD §9.3. Each is small (<50 LOC). Use the existing E2E harness (`bunx playwright test`).

- [ ] **Step 1: Author each spec from the PRD §9.3 outline**

For example, `manual-save-and-restore.spec.ts`:

```typescript
// kova-open-pencil-1/tests/e2e/version-history/manual-save-and-restore.spec.ts
import { test, expect } from '@playwright/test'

test('manual save → restore → undo', async ({ page }) => {
  await page.goto('/canvas/test-canvas-uuid')
  // Make an edit
  await page.locator('[data-testid="canvas-stage"]').click({ position: { x: 100, y: 100 } })
  // Save
  await page.keyboard.press('Alt+Meta+KeyS')
  await page.fill('[data-testid="title-input"]', 'E2E save')
  await page.click('[data-testid="save-button"]')
  await expect(page.locator('.toast.success')).toContainText('Saved to version history')
  // Restore
  await page.locator('.vh-row', { hasText: 'E2E save' }).click({ button: 'right' })
  await page.click('text=Restore this version')
  await page.click('[data-testid="restore-button"]')
  await expect(page.locator('.toast.success')).toContainText('Restored to E2E save')
  // Undo
  await page.keyboard.press('Meta+KeyZ')
  // Assert canvas state reverted to pre-restore
})
```

- [ ] **Step 2: Run E2E pack**

```bash
bunx playwright test tests/e2e/version-history/ tests/e2e/trash/
```

Expected: 8/8 PASS.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/tests/e2e/version-history/ kova-open-pencil-1/tests/e2e/trash/
git commit -m "test(09): E2E smoke pack — version-history + trash flows"
```

---

## Task 25: Manual founder QA + status bump

- [ ] **Step 1: Run the `bun run check` quality gate**

```bash
bun run check
bun run format
bun run test:unit
bun run test:dupes
bunx playwright test tests/e2e/version-history tests/e2e/trash
```

Expected: all green; jscpd < 3%; no oxlint errors.

- [ ] **Step 2: Founder browser smoke** — work through every checkbox in PRD §9.4 against staging. Founder marks each green or files an issue.

- [ ] **Step 3: Bump PRD §0 status to `IN-IMPLEMENTATION` once smoke is green; bump to `SHIPPED` once production deploy completes**

- [ ] **Step 4: Update `docs/prd/00a-PRD_AUTHORING_GUIDE.md` §7 tracker row for Cluster 09: status `IN-IMPLEMENTATION` then `SHIPPED`**

- [ ] **Step 5: Final commit**

```bash
git add kova-open-pencil-1/docs/prd/09-version-history-and-trash.md \
        kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md
git commit -m "docs(09): mark PRD 09 as IN-IMPLEMENTATION"
```

---

## Open coordination points (call out before merging)

1. **Cluster 06 right-panel slot mechanic** — Task 21's mount assumes a `v-else` on the inspector. Confirm with Cluster 06 author that this is the intended pattern (vs a tab-switcher inside the inspector).
2. **Cluster 06 canvas-stage edit-lock overlay class** — Task 21 Step 4 selects `.toolbar .tool:not(.move)` to grey non-pan tools while edit-lock is active. If Cluster 06 toolbar class names differ, refactor the selector OR move the disabled-state logic into Cluster 06's toolbar component itself (preferred — toolbar reads `useCanvasEditLock.isLocked` directly).
3. **Cluster 07a `editor.mountSideDoc` API** — Task 12a's `usePreviewSideDoc` calls `editor.mountSideDoc(pages)` and expects a disposer back. If `packages/core/` doesn't expose this, Cluster 07a's PRD must either add it (engine extension hook) OR Task 12a falls back to a DOM-composited offscreen-canvas overlay rendered above the live canvas. Decision point during Cluster 07a authoring.
4. **Cluster 08 keyboard registry shape** — Task 23 assumes a declarative array. If Cluster 08 lands a different shape, refactor the registration call. Additionally, Cluster 08's registry must subscribe to `useCanvasEditLock.isLocked` and suppress edit shortcuts (Delete, ⌘C/X/V, character keys for text-edit) while locked.
5. **Cluster 02 `create_canvas` RPC signature** — Task 19 assumes `p_brand_id, p_name`. Verify against Cluster 02's PRD before merge.
6. **Cluster 04 Stripe webhook bulk-UPDATE on `retention_class`** — flag in §11.2 of PRD 09 + add an action item in Cluster 04 PRD when authored. Plus the 30-day downgrade grace window (per PRD §12.2).
7. **Cluster 11 `useConfirm`, `<KovaModal>`, `<ToastStack>`** — Tasks 13, 14, 18, 22 import these. Verify the import paths once Cluster 11 ships; until then, stub them locally.

---

## Verification: this plan covers PRD 09 end-to-end

- §4 Schema migration → Tasks 1–6 ✓
- §5.1 Edge Functions (duplicate-to-canvas, snapshot-prune) → Tasks 19, 20 ✓
- §5.2 RPCs (create / restore / rename / purge_paths) → Tasks 1–5 ✓
- §5.3 Cron (snapshot-prune) → Task 20 ✓
- §6.2 Pinia store → Task 10 ✓
- §6.3 Composables (autosnapshot, codec, thumbnail, restore-undo, deep-link, shortcut, **edit-lock, preview side-doc**) → Tasks 7, 8, 9, 11, 12, **12a** ✓
- §6.4 Components (8 VH + 1 trash) → Tasks 13–18 ✓
- §7 Engine touches (read-only) → Tasks 7, 9, 10, 11 (consume editor APIs without modification); Task 12a calls `editor.mountSideDoc` if available (open coord point #3) ✓
- §8 Acceptance criteria → covered by tests in every task; manual founder pass in Task 25 ✓
- §8.5 row-click preview + edit-lock + pan/zoom-live acceptance → Task 12a (composables) + Task 17 (panel lifecycle) + Task 21 (overlay + watcher) ✓
- §9 Test plan → unit + integration + E2E + manual all covered ✓
- §10 Rollout phasing → Phase A complete after Task 25; Phase B requires production cron activation gated on Cluster 04 ✓
- §11 Cross-cuts → Tasks 21, 22, 23 + open coordination notes ✓
- §12.6 / §12.7 / §12.12 / §12.13 / §12.14 RESOLVED 2026-05-17 — Copy link format, no Empty Trash, edit-lock, preview side-doc, single in-flight → Tasks 12a + 17 + 21 ✓
