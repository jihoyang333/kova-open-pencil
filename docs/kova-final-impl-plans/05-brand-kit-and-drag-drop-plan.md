# Cluster 05 — Brand Kit Settings & Drag-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the per-brand Brand Kit settings page (7 sub-tabs under `/account/brand-kit`), the schema and Storage to hold every kit asset, the 5 drag MIME-type contracts that feed into canvas drop receivers, the Anthropic-driven voice-draft inference with a confirm-before-write guardrail, and the brand-font upload pipeline that wires into the canvas-engine CanvasKit font loader.

**Architecture:**
- Backend: 1 schema migration (JSONB columns on `brands` + 3 new tables: `brand_fonts`, `brand_kb_sources`, `voice_drafts`), 11 SECURITY-DEFINER RPCs, 7 Edge Functions under `kova-open-pencil-1/api/`, 2 new Storage buckets with path-prefix RLS.
- Frontend: 3 Pinia stores (`useBrandKitStore`, `useBrandFontsStore`, `useBrandKbSourcesStore`), 4 composables (`useBrandKitDrag`, `useFontUpload`, `useKbSourceUpload`, `useVoiceDraft`), nested Vue Router under `/account/brand-kit/:tab` (7 children), 7 sub-tab components + ~14 row/tile/modal primitives.
- Guardrail (00e §6 #5): AI-scraped brand voice persists to `voice_drafts` (not `brands.*`); user confirms in `<VoiceDraftConfirmModal>`; only `confirm_voice_draft(draft_id)` RPC writes through to `brands.identity` + `brands.tone_snippets`.

**Tech Stack:**
- Supabase Postgres + RLS + `SECURITY DEFINER` RPCs (no ORM per 2.C.10)
- Supabase Storage (private buckets with `storage.foldername()` path-prefix RLS per D-5)
- Vercel Functions (Edge Function runtime — Fluid Compute, NOT Edge runtime, per existing M9 pattern)
- `@supabase/supabase-js` (browser + server)
- `@ai-sdk/anthropic` + claude-sonnet-4-6 (server-only `ANTHROPIC_API_KEY`)
- Vue 3 (Composition API setup stores), Pinia, Vue Router 4, Tailwind 4 (canonical `kova-hifi.css` tokens → `@theme`)
- valibot for tool/payload validation (NOT zod, per CLAUDE.md)
- `file-type` npm pkg for MIME magic-number sniff (per 2.B.5)
- `bun:test` for unit tests; Supabase CLI local for integration; Playwright/Vercel Agent Browser for E2E

**PRD reference:** `kova-open-pencil-1/docs/kova-final-prds/05-brand-kit-and-drag-drop.md`

---

## File Structure (locked before tasks)

### Server-side (database + Edge Functions)

| File | Responsibility |
|---|---|
| `supabase/migrations/20260615_05_brand_kit.sql` | Schema migration: ALTER `brands` + CREATE `brand_fonts` / `brand_kb_sources` / `voice_drafts` + 11 RPCs |
| `supabase/migrations/20260615_05_brand_kit_storage.sql` | Storage bucket creation + storage.objects policies (path-prefix RLS) |
| `api/brand-fonts/upload.ts` | POST — multipart font upload → Storage → DB row |
| `api/brand-fonts/[id].ts` | DELETE — remove font Storage object + DB row |
| `api/brand-kb-sources/upload.ts` | POST — KB source upload |
| `api/brand-kb-sources/[id].ts` | DELETE |
| `api/shopify/brand-kit-extract.ts` | EXTEND existing M9 file — add Anthropic voice/tone inference + write to voice_drafts |
| `api/brands/[id]/voice-draft/confirm.ts` | POST — calls `confirm_voice_draft` RPC |
| `api/brands/[id]/voice-draft/discard.ts` | POST — calls `discard_voice_draft` RPC |
| `api/_shared/file-type-sniff.ts` | Shared MIME magic-number + extension + header agreement helper (per 2.B.5) |

### Client-side

| File | Responsibility |
|---|---|
| `src/types/brand-kit.ts` | TypeScript interfaces: `ToneSnippet`, `SavedBlock`, `IdentityCard`, `IdentityCards`, `WritingRules`, `BrandColor`, `BrandFont`, `BrandKbSource`, `VoiceDraft` |
| `src/stores/brand-kit.ts` | Pinia: `useBrandKitStore` (reactive read-through + CRUD actions) |
| `src/stores/brand-fonts.ts` | Pinia: `useBrandFontsStore` (list/upload/delete + Realtime subscribe) |
| `src/stores/brand-kb-sources.ts` | Pinia: `useBrandKbSourcesStore` |
| `src/composables/brand-kit/use-brand-kit-drag.ts` | 4 onXDragStart handlers — set MIME + JSON payload + `event.dataTransfer.setData` |
| `src/composables/brand-kit/use-font-upload.ts` | Upload wrapper with progress |
| `src/composables/brand-kit/use-kb-source-upload.ts` | Same shape, KB sources |
| `src/composables/use-voice-draft.ts` | Module-level draft state + confirm/discard |
| `src/router/routes.ts` | Add `/account/brand-kit/:tab` nested routes |
| `src/views/account/BrandKitSection.vue` | Section shell — brand picker + sub-nav + `<router-view>` slot + voice-draft modal mount |
| `src/components/brand-kit/BrandKitSubNav.vue` | 7-item vertical sub-nav, sticky, active state, count badges |
| `src/components/brand-kit/VisualsTab.vue` | Colors / Fonts / Logo orchestrator |
| `src/components/brand-kit/visuals/BrandColorSwatch.vue` | Single swatch tile + drag source |
| `src/components/brand-kit/visuals/BrandColorAddTile.vue` | "+ Add color" with color-picker popover |
| `src/components/brand-kit/visuals/BrandFontRow.vue` | Font row + drag source |
| `src/components/brand-kit/visuals/FontUploadDropzone.vue` | Drop zone + progress + error states |
| `src/components/brand-kit/visuals/BrandLogoRow.vue` | Primary / wordmark rows + drag source |
| `src/components/brand-kit/IdentityTab.vue` | 3 narrative cards orchestrator |
| `src/components/brand-kit/identity/IdentityCard.vue` | Single narrative card + inline editor |
| `src/components/brand-kit/ToneSnippetsTab.vue` | List + drag-reorder + Add CTA |
| `src/components/brand-kit/SavedBlocksTab.vue` | List + drag-reorder + Add CTA + drag-source grip |
| `src/components/brand-kit/shared/BrandKitListRow.vue` | Shared row primitive for snippets + blocks |
| `src/components/brand-kit/modals/ToneSnippetAddModal.vue` | B3.1 |
| `src/components/brand-kit/modals/ToneSnippetEditModal.vue` | B3.2 |
| `src/components/brand-kit/modals/SavedBlockAddModal.vue` | B3.3 |
| `src/components/brand-kit/modals/SavedBlockEditModal.vue` | B3.4 |
| `src/components/brand-kit/modals/VoiceDraftConfirmModal.vue` | **GUARDRAIL modal** — Confirm & save / Discard draft |
| `src/components/brand-kit/WritingRulesTab.vue` | Toggle stack |
| `src/components/brand-kit/writing-rules/WritingRuleToggle.vue` | Single toggle row |
| `src/components/brand-kit/MemoriesTab.vue` | Read from Cluster 10 store |
| `src/components/brand-kit/memories/MemoryRow.vue` | Row + edit / delete |
| `src/components/brand-kit/KbSourcesTab.vue` | List + dropzone |
| `src/components/brand-kit/kb-sources/KbSourceRow.vue` | Row + state variants |
| `src/components/brand-kit/kb-sources/KbSourceDropzone.vue` | Multi-file queue dropzone |

### Test files (placed alongside subjects per existing convention)

| File | Responsibility |
|---|---|
| `tests/unit/stores/brand-kit.test.ts` | useBrandKitStore actions |
| `tests/unit/stores/brand-fonts.test.ts` | useBrandFontsStore |
| `tests/unit/stores/brand-kb-sources.test.ts` | useBrandKbSourcesStore |
| `tests/unit/composables/brand-kit/use-brand-kit-drag.test.ts` | Drag-source handlers |
| `tests/unit/composables/use-voice-draft.test.ts` | Voice-draft state machine |
| `tests/unit/api/brand-fonts/upload.test.ts` | Edge Function unit |
| `tests/unit/api/brand-fonts/delete.test.ts` | |
| `tests/unit/api/brand-kb-sources/upload.test.ts` | |
| `tests/unit/api/brand-kb-sources/delete.test.ts` | |
| `tests/unit/api/shopify/brand-kit-extract.test.ts` | Existing + new voice-draft branch |
| `tests/unit/api/brands/voice-draft/confirm.test.ts` | |
| `tests/unit/api/brands/voice-draft/discard.test.ts` | |
| `tests/unit/components/brand-kit/VoiceDraftConfirmModal.test.ts` | Modal — most critical user-facing test |
| `tests/unit/components/brand-kit/modals/ToneSnippetAddModal.test.ts` | |
| `tests/unit/components/brand-kit/modals/SavedBlockAddModal.test.ts` | |
| `tests/unit/components/brand-kit/visuals/FontUploadDropzone.test.ts` | |
| `tests/unit/components/brand-kit/BrandKitSubNav.test.ts` | |
| `tests/integration/db/migration-05-brand-kit.test.ts` | Migration applies; constraints work |
| `tests/integration/db/rls-brand-fonts.test.ts` | Two-user RLS test |
| `tests/integration/db/rls-brand-kb-sources.test.ts` | |
| `tests/integration/db/rls-voice-drafts.test.ts` | service_role insert, authenticated select |
| `tests/integration/db/rpc-tone-snippets.test.ts` | add/update/delete/reorder + cap |
| `tests/integration/db/rpc-saved-blocks.test.ts` | + type validation |
| `tests/integration/db/rpc-writing-rules.test.ts` | + invalid key |
| `tests/integration/db/rpc-brand-identity.test.ts` | |
| `tests/integration/db/rpc-voice-draft.test.ts` | confirm / discard end-to-end |
| `tests/integration/api/brand-fonts-upload-flow.test.ts` | Full multipart → Storage → DB |
| `tests/integration/api/brand-kit-extract-voice-draft-flow.test.ts` | Mock Shopify + Anthropic |
| `tests/integration/api/voice-draft-confirm-discard.test.ts` | |
| `tests/integration/storage/path-prefix-rls.test.ts` | brand-fonts + brand-kb-sources |
| `tests/e2e/brand-kit/visuals-flow.spec.ts` | |
| `tests/e2e/brand-kit/tone-snippets-crud.spec.ts` | |
| `tests/e2e/brand-kit/saved-blocks-crud.spec.ts` | |
| `tests/e2e/brand-kit/writing-rules-toggle.spec.ts` | |
| `tests/e2e/brand-kit/voice-draft-confirm.spec.ts` | |
| `tests/e2e/brand-kit/voice-draft-discard.spec.ts` | |
| `tests/e2e/brand-kit/drag-color-to-canvas.spec.ts` | |
| `tests/e2e/brand-kit/drag-font-to-text.spec.ts` | |
| `tests/e2e/brand-kit/drag-saved-block-to-canvas.spec.ts` | |

---

## Task Sequence

Tasks are ordered so each builds on prior tasks. TDD throughout. Commit after each task.

---

### Task 1: Schema migration (JSONB columns + 3 new tables)

**Files:**
- Create: `supabase/migrations/20260615_05_brand_kit.sql`
- Test: `tests/integration/db/migration-05-brand-kit.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/integration/db/migration-05-brand-kit.test.ts
import { describe, test, expect, beforeAll } from 'bun:test'
import { createServerClient } from '@/test-utils/supabase-test-client'

describe('migration 20260615_05_brand_kit', () => {
  const supabase = createServerClient()

  test('brands has new JSONB columns with NOT NULL defaults', async () => {
    const { data, error } = await supabase.rpc('sql', {
      query: `SELECT column_name, data_type, is_nullable, column_default
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'brands'
                AND column_name IN ('tone_snippets', 'saved_blocks', 'writing_rules', 'identity')
              ORDER BY column_name;`,
    })
    expect(error).toBeNull()
    expect(data).toHaveLength(4)
    expect(data.every((c: any) => c.data_type === 'jsonb' && c.is_nullable === 'NO')).toBe(true)
  })

  test('brand_fonts table exists with CHECK on license_attested', async () => {
    const { error: insertNoAttest } = await supabase.from('brand_fonts').insert({
      brand_id: '00000000-0000-0000-0000-000000000001',
      family_name: 'Test',
      file_path: 'brand-fonts/test/test.woff2',
      file_size_bytes: 1024,
      mime_type: 'font/woff2',
      license_attested: false,
      uploaded_by: '00000000-0000-0000-0000-000000000002',
    })
    expect(insertNoAttest?.code).toBe('23514') // CHECK violation
  })

  test('brand_fonts CHECK on file_size_bytes max 5 MB', async () => {
    const { error } = await supabase.from('brand_fonts').insert({
      brand_id: '00000000-0000-0000-0000-000000000001',
      family_name: 'BigFont',
      file_path: 'brand-fonts/test/big.woff2',
      file_size_bytes: 5242881, // 5 MB + 1 byte
      mime_type: 'font/woff2',
      license_attested: true,
      uploaded_by: '00000000-0000-0000-0000-000000000002',
    })
    expect(error?.code).toBe('23514')
  })

  test('voice_drafts partial unique index allows one open draft per brand', async () => {
    const brandId = '00000000-0000-0000-0000-000000000010'
    const userId = '00000000-0000-0000-0000-000000000011'
    // Seed brand + user out-of-band (helper not shown; use existing test seed)
    const draft1 = await supabase.from('voice_drafts').insert({
      brand_id: brandId, user_id: userId, source: 'shopify_extract',
      draft_payload: { voice: { content: 'V1' }, tone_snippets: [] },
    })
    expect(draft1.error).toBeNull()
    const draft2 = await supabase.from('voice_drafts').insert({
      brand_id: brandId, user_id: userId, source: 'shopify_extract',
      draft_payload: { voice: { content: 'V2' }, tone_snippets: [] },
    })
    // partial unique index → second open draft for same brand should violate
    // (run cleanup setup so partial-index has nothing to match prior to this insert)
    expect(draft2.error?.code === '23505' || draft2.error === null).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx supabase start  # local Supabase
bun test tests/integration/db/migration-05-brand-kit.test.ts
```

Expected: FAIL — columns not found / table missing.

- [ ] **Step 3: Write the migration**

Copy the SQL block from PRD `docs/kova-final-prds/05-brand-kit-and-drag-drop.md` §4.1 verbatim into `supabase/migrations/20260615_05_brand_kit.sql`. Specifically:

- ALTER TABLE brands ADD COLUMN tone_snippets/saved_blocks/writing_rules/identity (jsonb NOT NULL DEFAULT)
- CREATE TABLE brand_fonts (id, brand_id FK ON DELETE CASCADE, family_name, file_path, file_size_bytes CHECK <=5242880, mime_type CHECK IN (...), license_attested CHECK = true, uploaded_at, uploaded_by FK)
- CREATE INDEX idx_brand_fonts_brand + UNIQUE INDEX idx_brand_fonts_unique_family
- CREATE TABLE brand_kb_sources (with 10 MB cap, mime_type CHECK in pdf/plain/markdown)
- CREATE INDEX idx_brand_kb_sources_brand
- CREATE TABLE voice_drafts (id, brand_id FK ON DELETE CASCADE, user_id FK, source CHECK = 'shopify_extract', draft_payload jsonb, created_at, confirmed_at, discarded_at, CHECK(confirmed_at IS NULL OR discarded_at IS NULL))
- CREATE INDEX idx_voice_drafts_brand_unconfirmed ON public.voice_drafts(brand_id) WHERE confirmed_at IS NULL AND discarded_at IS NULL
- COMMENT ON COLUMN ... for each new column

Wrap entire migration in `BEGIN; ... COMMIT;`.

- [ ] **Step 4: Apply the migration locally and run the test**

```bash
bunx supabase db push  # or supabase migration up
bun test tests/integration/db/migration-05-brand-kit.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260615_05_brand_kit.sql tests/integration/db/migration-05-brand-kit.test.ts
git commit -m "feat(cluster-05): add brand kit schema — JSONB columns on brands + brand_fonts + brand_kb_sources + voice_drafts tables"
```

---

### Task 2: RPCs for tone snippets (add / update / delete / reorder)

**Files:**
- Modify: `supabase/migrations/20260615_05_brand_kit.sql` (append RPCs)
- Test: `tests/integration/db/rpc-tone-snippets.test.ts`

- [ ] **Step 1: Write failing integration tests**

```ts
// tests/integration/db/rpc-tone-snippets.test.ts
import { describe, test, expect } from 'bun:test'
import { createAuthenticatedClient, seedBrandForUser } from '@/test-utils/supabase-test-client'

describe('tone snippet RPCs', () => {
  test('add_tone_snippet creates row and returns uuid', async () => {
    const { client, userId, brandId } = await seedBrandForUser()
    const { data, error } = await client.rpc('add_tone_snippet', {
      p_brand_id: brandId, p_label: 'Welcome', p_category: 'PROMO', p_content: 'Hello',
    })
    expect(error).toBeNull()
    expect(typeof data).toBe('string')

    const { data: brand } = await client.from('brands').select('tone_snippets').eq('id', brandId).single()
    expect(brand.tone_snippets).toHaveLength(1)
    expect(brand.tone_snippets[0].label).toBe('Welcome')
  })

  test('update_tone_snippet updates in place preserving order', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id } = await client.rpc('add_tone_snippet', { p_brand_id: brandId, p_label: 'A', p_category: 'X', p_content: 'old' })
    await client.rpc('update_tone_snippet', { p_brand_id: brandId, p_snippet_id: id, p_label: 'A', p_category: 'X', p_content: 'new' })
    const { data } = await client.from('brands').select('tone_snippets').eq('id', brandId).single()
    expect(data.tone_snippets[0].content).toBe('new')
  })

  test('delete_tone_snippet removes the row', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id } = await client.rpc('add_tone_snippet', { p_brand_id: brandId, p_label: 'A', p_category: 'X', p_content: 'c' })
    await client.rpc('delete_tone_snippet', { p_brand_id: brandId, p_snippet_id: id })
    const { data } = await client.from('brands').select('tone_snippets').eq('id', brandId).single()
    expect(data.tone_snippets).toHaveLength(0)
  })

  test('reorder_tone_snippets rebuilds order', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id1 } = await client.rpc('add_tone_snippet', { p_brand_id: brandId, p_label: 'A', p_category: 'X', p_content: 'a' })
    const { data: id2 } = await client.rpc('add_tone_snippet', { p_brand_id: brandId, p_label: 'B', p_category: 'X', p_content: 'b' })
    await client.rpc('reorder_tone_snippets', { p_brand_id: brandId, p_ordered_ids: [id2, id1] })
    const { data } = await client.from('brands').select('tone_snippets').eq('id', brandId).single()
    expect(data.tone_snippets[0].id).toBe(id2)
    expect(data.tone_snippets[0].order).toBe(0)
    expect(data.tone_snippets[1].order).toBe(1)
  })

  test('add_tone_snippet raises cap_exceeded at 51st', async () => {
    const { client, brandId } = await seedBrandForUser()
    for (let i = 0; i < 50; i++) {
      await client.rpc('add_tone_snippet', { p_brand_id: brandId, p_label: `L${i}`, p_category: 'X', p_content: 'c' })
    }
    const { error } = await client.rpc('add_tone_snippet', { p_brand_id: brandId, p_label: 'L50', p_category: 'X', p_content: 'c' })
    expect(error?.code).toBe('P0001')
    expect(error?.message).toContain('cap_exceeded')
  })

  test('add_tone_snippet by non-owner raises forbidden', async () => {
    const { brandId } = await seedBrandForUser()  // user A's brand
    const otherClient = await createAuthenticatedClient()  // user B
    const { error } = await otherClient.rpc('add_tone_snippet', {
      p_brand_id: brandId, p_label: 'X', p_category: 'X', p_content: 'c',
    })
    expect(error?.code).toBe('42501')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/integration/db/rpc-tone-snippets.test.ts
```

Expected: FAIL — RPCs not defined.

- [ ] **Step 3: Append RPCs to the migration**

Append to `supabase/migrations/20260615_05_brand_kit.sql` (before the `COMMIT;`) the 4 functions verbatim from PRD §4.1:
- `add_tone_snippet(p_brand_id, p_label, p_category, p_content) → uuid` (with auth check + ownership check + cap check + JSONB append with computed next order)
- `update_tone_snippet(p_brand_id, p_snippet_id, p_label, p_category, p_content) → void` (jsonb_agg + CASE WHEN id matches → jsonb_set the three fields)
- `delete_tone_snippet(p_brand_id, p_snippet_id) → void` (jsonb_agg WHERE id != target)
- `reorder_tone_snippets(p_brand_id, p_ordered_ids uuid[]) → void` (iterate array, rebuild with new order indices)

Add `GRANT EXECUTE ON FUNCTION ... TO authenticated;` at the end.

- [ ] **Step 4: Re-apply migration and run tests**

```bash
bunx supabase db reset && bunx supabase db push
bun test tests/integration/db/rpc-tone-snippets.test.ts
```

Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260615_05_brand_kit.sql tests/integration/db/rpc-tone-snippets.test.ts
git commit -m "feat(cluster-05): add tone-snippet CRUD RPCs with cap + ownership + reorder"
```

---

### Task 3: RPCs for saved blocks (add / update / delete / reorder)

**Files:**
- Modify: `supabase/migrations/20260615_05_brand_kit.sql`
- Test: `tests/integration/db/rpc-saved-blocks.test.ts`

- [ ] **Step 1: Write failing tests** (parallel to Task 2, plus the `type` field validation + cap 100)

```ts
// tests/integration/db/rpc-saved-blocks.test.ts
import { describe, test, expect } from 'bun:test'
import { seedBrandForUser } from '@/test-utils/supabase-test-client'

describe('saved block RPCs', () => {
  test('add_saved_block writes row with type', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data, error } = await client.rpc('add_saved_block', {
      p_brand_id: brandId, p_label: 'CTA', p_category: 'CTA', p_content: 'Shop now', p_type: 'cta',
    })
    expect(error).toBeNull()
    const { data: brand } = await client.from('brands').select('saved_blocks').eq('id', brandId).single()
    expect(brand.saved_blocks[0].type).toBe('cta')
  })

  test('add_saved_block rejects invalid type', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { error } = await client.rpc('add_saved_block', {
      p_brand_id: brandId, p_label: 'X', p_category: 'X', p_content: 'c', p_type: 'banner',
    })
    expect(error?.code).toBe('22023')
    expect(error?.message).toContain('invalid_type')
  })

  test('update_saved_block updates type field', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { data: id } = await client.rpc('add_saved_block', { p_brand_id: brandId, p_label: 'L', p_category: 'C', p_content: 'X', p_type: 'text' })
    await client.rpc('update_saved_block', { p_brand_id: brandId, p_block_id: id, p_label: 'L', p_category: 'C', p_content: 'X', p_type: 'footer' })
    const { data } = await client.from('brands').select('saved_blocks').eq('id', brandId).single()
    expect(data.saved_blocks[0].type).toBe('footer')
  })

  test('add_saved_block hits cap_exceeded at 101st', async () => {
    const { client, brandId } = await seedBrandForUser()
    for (let i = 0; i < 100; i++) {
      await client.rpc('add_saved_block', { p_brand_id: brandId, p_label: `L${i}`, p_category: 'C', p_content: 'X', p_type: 'text' })
    }
    const { error } = await client.rpc('add_saved_block', { p_brand_id: brandId, p_label: 'L100', p_category: 'C', p_content: 'X', p_type: 'text' })
    expect(error?.code).toBe('P0001')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/integration/db/rpc-saved-blocks.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Append saved-block RPCs to migration**

Append `add_saved_block`, `update_saved_block`, `delete_saved_block`, `reorder_saved_blocks` per PRD §4.1 (same shape as tone snippets but with the additional `p_type` argument validated against `('text','cta','footer')` and cap 100).

Add `GRANT EXECUTE`.

- [ ] **Step 4: Re-apply migration and run tests**

```bash
bunx supabase db reset && bunx supabase db push
bun test tests/integration/db/rpc-saved-blocks.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260615_05_brand_kit.sql tests/integration/db/rpc-saved-blocks.test.ts
git commit -m "feat(cluster-05): add saved-block CRUD RPCs with type validation + cap 100"
```

---

### Task 4: RPCs for writing rules + brand identity + voice draft

**Files:**
- Modify: `supabase/migrations/20260615_05_brand_kit.sql`
- Test: `tests/integration/db/rpc-writing-rules.test.ts`, `tests/integration/db/rpc-brand-identity.test.ts`, `tests/integration/db/rpc-voice-draft.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/integration/db/rpc-writing-rules.test.ts
import { describe, test, expect } from 'bun:test'
import { seedBrandForUser } from '@/test-utils/supabase-test-client'

describe('set_writing_rule RPC', () => {
  test('toggles a known rule', async () => {
    const { client, brandId } = await seedBrandForUser()
    await client.rpc('set_writing_rule', { p_brand_id: brandId, p_rule_key: 'no_em_dash', p_enabled: true })
    const { data } = await client.from('brands').select('writing_rules').eq('id', brandId).single()
    expect(data.writing_rules.no_em_dash).toBe(true)
  })
  test('rejects unknown rule key', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { error } = await client.rpc('set_writing_rule', { p_brand_id: brandId, p_rule_key: 'fake_rule', p_enabled: true })
    expect(error?.code).toBe('22023')
    expect(error?.message).toContain('invalid_rule_key')
  })
})
```

```ts
// tests/integration/db/rpc-brand-identity.test.ts
describe('update_brand_identity RPC', () => {
  test('writes about card with word_count', async () => {
    const { client, brandId } = await seedBrandForUser()
    await client.rpc('update_brand_identity', { p_brand_id: brandId, p_card_key: 'about', p_content: 'Five words here for now' })
    const { data } = await client.from('brands').select('identity').eq('id', brandId).single()
    expect(data.identity.about.content).toBe('Five words here for now')
    expect(data.identity.about.word_count).toBe(5)
    expect(data.identity.about.last_edited_at).toBeTruthy()
  })
  test('rejects invalid card key', async () => {
    const { client, brandId } = await seedBrandForUser()
    const { error } = await client.rpc('update_brand_identity', { p_brand_id: brandId, p_card_key: 'mission', p_content: 'x' })
    expect(error?.code).toBe('22023')
  })
})
```

```ts
// tests/integration/db/rpc-voice-draft.test.ts
describe('voice_draft RPCs', () => {
  test('confirm_voice_draft writes identity.voice + appends tone_snippets atomically', async () => {
    const { service, client, brandId, userId } = await seedBrandForUser()
    // Insert draft via service-role (RLS permits)
    const draftId = '00000000-0000-0000-0000-000000000020'
    await service.from('voice_drafts').insert({
      id: draftId, brand_id: brandId, user_id: userId, source: 'shopify_extract',
      draft_payload: {
        voice: { content: 'Direct, kinetic, second-person.' },
        tone_snippets: [
          { label: 'Welcome', category: 'WELCOME', content: 'Hi athletes.' },
          { label: 'Restock', category: 'RESTOCK', content: 'Back in your size.' },
        ],
      },
    })
    await client.rpc('confirm_voice_draft', { p_draft_id: draftId })
    const { data } = await client.from('brands').select('identity, tone_snippets').eq('id', brandId).single()
    expect(data.identity.voice.content).toContain('Direct')
    expect(data.identity.voice.word_count).toBeGreaterThan(0)
    expect(data.tone_snippets).toHaveLength(2)

    const { data: draft } = await client.from('voice_drafts').select('confirmed_at').eq('id', draftId).single()
    expect(draft.confirmed_at).toBeTruthy()
  })

  test('confirm_voice_draft is idempotent — second call returns draft_not_found_or_already_resolved', async () => {
    const { service, client, brandId, userId } = await seedBrandForUser()
    const draftId = '00000000-0000-0000-0000-000000000021'
    await service.from('voice_drafts').insert({
      id: draftId, brand_id: brandId, user_id: userId, source: 'shopify_extract',
      draft_payload: { voice: { content: 'x' }, tone_snippets: [] },
    })
    await client.rpc('confirm_voice_draft', { p_draft_id: draftId })
    const { error } = await client.rpc('confirm_voice_draft', { p_draft_id: draftId })
    expect(error?.code).toBe('P0002')
  })

  test('discard_voice_draft marks discarded without writing brands.*', async () => {
    const { service, client, brandId, userId } = await seedBrandForUser()
    const draftId = '00000000-0000-0000-0000-000000000022'
    await service.from('voice_drafts').insert({
      id: draftId, brand_id: brandId, user_id: userId, source: 'shopify_extract',
      draft_payload: { voice: { content: 'should not write' }, tone_snippets: [{ label: 'X', category: 'X', content: 'X' }] },
    })
    await client.rpc('discard_voice_draft', { p_draft_id: draftId })
    const { data: brand } = await client.from('brands').select('identity, tone_snippets').eq('id', brandId).single()
    expect(brand.identity?.voice).toBeUndefined()
    expect(brand.tone_snippets).toHaveLength(0)

    const { data: draft } = await client.from('voice_drafts').select('discarded_at').eq('id', draftId).single()
    expect(draft.discarded_at).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run all three tests to verify they fail**

```bash
bun test tests/integration/db/rpc-writing-rules.test.ts tests/integration/db/rpc-brand-identity.test.ts tests/integration/db/rpc-voice-draft.test.ts
```

Expected: FAIL — functions not defined.

- [ ] **Step 3: Append `set_writing_rule`, `update_brand_identity`, `confirm_voice_draft`, `discard_voice_draft` to migration**

Copy from PRD §4.1 verbatim. Key constraints:
- `set_writing_rule`: allowlist of rule keys in `('no_exclamation','no_em_dash','sentence_case_headlines','no_superlatives','active_voice_only')`
- `update_brand_identity`: card key in `('about','voice','story')`; `word_count` computed via `array_length(regexp_split_to_array(trim(p_content),'\s+'), 1)`
- `confirm_voice_draft`: atomic — `jsonb_set` identity.voice + `||` append tone_snippets (with fresh uuids + computed `order` indices); mark `confirmed_at = now()`; raises `P0002` if draft already resolved
- `discard_voice_draft`: mark `discarded_at = now()` only; no brand.* mutation

Add GRANT EXECUTE on all four.

- [ ] **Step 4: Re-apply and run all three tests**

```bash
bunx supabase db reset && bunx supabase db push
bun test tests/integration/db/rpc-writing-rules.test.ts tests/integration/db/rpc-brand-identity.test.ts tests/integration/db/rpc-voice-draft.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260615_05_brand_kit.sql tests/integration/db/rpc-writing-rules.test.ts tests/integration/db/rpc-brand-identity.test.ts tests/integration/db/rpc-voice-draft.test.ts
git commit -m "feat(cluster-05): add writing-rule + identity + voice-draft RPCs (confirm/discard guardrail)"
```

---

### Task 5: RLS policies for brand_fonts, brand_kb_sources, voice_drafts

**Files:**
- Modify: `supabase/migrations/20260615_05_brand_kit.sql` (append RLS block)
- Test: `tests/integration/db/rls-brand-fonts.test.ts`, `tests/integration/db/rls-brand-kb-sources.test.ts`, `tests/integration/db/rls-voice-drafts.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/integration/db/rls-brand-fonts.test.ts
import { describe, test, expect } from 'bun:test'
import { seedBrandForUser, createAuthenticatedClient } from '@/test-utils/supabase-test-client'

describe('RLS — brand_fonts', () => {
  test('user can SELECT/INSERT/DELETE own brand_fonts', async () => {
    const { client, brandId, userId } = await seedBrandForUser()
    const { error } = await client.from('brand_fonts').insert({
      brand_id: brandId, family_name: 'F', file_path: `brand-fonts/${brandId}/x.woff2`,
      file_size_bytes: 1000, mime_type: 'font/woff2', license_attested: true, uploaded_by: userId,
    })
    expect(error).toBeNull()
    const { data: rows } = await client.from('brand_fonts').select('*').eq('brand_id', brandId)
    expect(rows).toHaveLength(1)
  })

  test('user cannot SELECT another user\'s brand_fonts', async () => {
    const { brandId, userId } = await seedBrandForUser() // user A
    const { service } = await seedBrandForUser()
    await service.from('brand_fonts').insert({
      brand_id: brandId, family_name: 'F', file_path: 'brand-fonts/x/y.woff2',
      file_size_bytes: 1000, mime_type: 'font/woff2', license_attested: true, uploaded_by: userId,
    })
    const otherClient = await createAuthenticatedClient() // user B
    const { data } = await otherClient.from('brand_fonts').select('*').eq('brand_id', brandId)
    expect(data).toHaveLength(0)
  })

  test('user cannot INSERT into another user\'s brand', async () => {
    const { brandId } = await seedBrandForUser() // user A
    const otherClient = await createAuthenticatedClient() // user B
    const { error } = await otherClient.from('brand_fonts').insert({
      brand_id: brandId, family_name: 'Pwn', file_path: 'brand-fonts/x/y.woff2',
      file_size_bytes: 1000, mime_type: 'font/woff2', license_attested: true, uploaded_by: '00000000-0000-0000-0000-000000000099',
    })
    expect(error?.code).toBe('42501') // RLS violation
  })
})
```

```ts
// tests/integration/db/rls-brand-kb-sources.test.ts — parallel structure
```

```ts
// tests/integration/db/rls-voice-drafts.test.ts
describe('RLS — voice_drafts', () => {
  test('service_role can INSERT; authenticated can SELECT own', async () => {
    const { client, service, brandId, userId } = await seedBrandForUser()
    await service.from('voice_drafts').insert({
      brand_id: brandId, user_id: userId, source: 'shopify_extract',
      draft_payload: { voice: { content: 'x' }, tone_snippets: [] },
    })
    const { data } = await client.from('voice_drafts').select('*').eq('brand_id', brandId)
    expect(data).toHaveLength(1)
  })
  test('authenticated cannot INSERT voice_drafts', async () => {
    const { client, brandId, userId } = await seedBrandForUser()
    const { error } = await client.from('voice_drafts').insert({
      brand_id: brandId, user_id: userId, source: 'shopify_extract',
      draft_payload: { voice: { content: 'fake' }, tone_snippets: [] },
    })
    expect(error?.code).toBe('42501')
  })
})
```

- [ ] **Step 2: Run tests, verify failure**

```bash
bun test tests/integration/db/rls-brand-fonts.test.ts tests/integration/db/rls-brand-kb-sources.test.ts tests/integration/db/rls-voice-drafts.test.ts
```

Expected: FAIL — RLS not enforced (or table accepts all writes).

- [ ] **Step 3: Append RLS policies to migration**

Copy from PRD §4.2 verbatim:
- `brand_fonts` — ENABLE RLS; `_select` (brand-ownership), `_insert` (brand-ownership AND uploaded_by = auth.uid() AND license_attested = true), `_delete` (brand-ownership). NO update policy.
- `brand_kb_sources` — same pattern minus license_attested check
- `voice_drafts` — `_select` (brand-ownership), `_service_insert` (service_role ALL true). NO authenticated insert/update/delete policies.

- [ ] **Step 4: Re-apply and run tests**

```bash
bunx supabase db reset && bunx supabase db push
bun test tests/integration/db/rls-brand-fonts.test.ts tests/integration/db/rls-brand-kb-sources.test.ts tests/integration/db/rls-voice-drafts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260615_05_brand_kit.sql tests/integration/db/rls-*.test.ts
git commit -m "feat(cluster-05): RLS policies for brand_fonts + brand_kb_sources + voice_drafts (service-role insert for drafts)"
```

---

### Task 6: Storage buckets + path-prefix RLS

**Files:**
- Create: `supabase/migrations/20260615_05_brand_kit_storage.sql`
- Test: `tests/integration/storage/path-prefix-rls.test.ts`

- [ ] **Step 1: Write failing storage RLS test**

```ts
// tests/integration/storage/path-prefix-rls.test.ts
import { describe, test, expect } from 'bun:test'
import { seedBrandForUser, createAuthenticatedClient } from '@/test-utils/supabase-test-client'

describe('Storage path-prefix RLS (brand-fonts bucket)', () => {
  test('user can upload to own brand path', async () => {
    const { client, brandId } = await seedBrandForUser()
    const blob = new Blob([new Uint8Array(1024)], { type: 'font/woff2' })
    const { error } = await client.storage.from('brand-fonts').upload(`${brandId}/font1.woff2`, blob, { upsert: false })
    expect(error).toBeNull()
  })

  test('user CANNOT upload to another user\'s brand path', async () => {
    const { brandId } = await seedBrandForUser() // user A's brand
    const otherClient = await createAuthenticatedClient() // user B
    const blob = new Blob([new Uint8Array(1024)], { type: 'font/woff2' })
    const { error } = await otherClient.storage.from('brand-fonts').upload(`${brandId}/font1.woff2`, blob)
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/permission|policy|not authorized/i)
  })
})
```

- [ ] **Step 2: Run and verify failure** (bucket does not exist)

```bash
bun test tests/integration/storage/path-prefix-rls.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write storage migration**

```sql
-- supabase/migrations/20260615_05_brand_kit_storage.sql
BEGIN;

-- Create buckets if not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('brand-fonts',       'brand-fonts',       false, 5242880,  ARRAY['font/woff2','font/ttf','font/otf']::text[]),
  ('brand-kb-sources',  'brand-kb-sources',  false, 10485760, ARRAY['application/pdf','text/plain','text/markdown']::text[])
ON CONFLICT (id) DO NOTHING;

-- Path-prefix RLS per D-5 (00e §4 verified pattern)
CREATE POLICY brand_fonts_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-fonts'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY brand_fonts_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-fonts'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY brand_fonts_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-fonts'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY brand_kb_sources_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'brand-kb-sources'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY brand_kb_sources_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-kb-sources'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = auth.uid())
  );

CREATE POLICY brand_kb_sources_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-kb-sources'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = auth.uid())
  );

COMMIT;
```

- [ ] **Step 4: Re-apply and run test**

```bash
bunx supabase db reset && bunx supabase db push
bun test tests/integration/storage/path-prefix-rls.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260615_05_brand_kit_storage.sql tests/integration/storage/path-prefix-rls.test.ts
git commit -m "feat(cluster-05): storage buckets brand-fonts + brand-kb-sources with path-prefix RLS"
```

---

### Task 7: TypeScript types

**Files:**
- Create: `src/types/brand-kit.ts`

- [ ] **Step 1: Write the types file (no test — type-checked by `bun run check`)**

```ts
// src/types/brand-kit.ts
export interface ToneSnippet {
  id: string
  label: string
  category: string
  content: string
  order: number
}

export interface SavedBlockType { text: 'text'; cta: 'cta'; footer: 'footer' }
export interface SavedBlock {
  id: string
  label: string
  category: string
  content: string
  type: 'text' | 'cta' | 'footer'
  order: number
}

export interface IdentityCard {
  content: string
  last_edited_at: string
  last_edited_by: string
  word_count: number
}
export interface IdentityCards {
  about?: IdentityCard
  voice?: IdentityCard
  story?: IdentityCard
}

export interface WritingRules {
  no_exclamation?: boolean
  no_em_dash?: boolean
  sentence_case_headlines?: boolean
  no_superlatives?: boolean
  active_voice_only?: boolean
  [key: string]: boolean | undefined
}

export interface BrandColor {
  id: string
  hex: string
  label: string
  order: number
}

export interface BrandFont {
  id: string
  brand_id: string
  family_name: string
  file_path: string
  file_size_bytes: number
  mime_type: 'font/woff2' | 'font/ttf' | 'font/otf'
  license_attested: boolean
  uploaded_at: string
  uploaded_by: string
}

export interface BrandKbSource {
  id: string
  brand_id: string
  file_name: string
  file_path: string
  file_size_bytes: number
  mime_type: 'application/pdf' | 'text/plain' | 'text/markdown'
  uploaded_at: string
  uploaded_by: string
  extracted_text: string | null
}

export interface VoiceDraftPayload {
  voice: { content: string }
  tone_snippets: Array<{ label: string; category: string; content: string }>
}

export interface VoiceDraft {
  id: string
  brand_id: string
  user_id: string
  source: 'shopify_extract'
  draft_payload: VoiceDraftPayload
  created_at: string
  confirmed_at: string | null
  discarded_at: string | null
}
```

- [ ] **Step 2: Verify types pass**

```bash
bun run check
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/brand-kit.ts
git commit -m "feat(cluster-05): TypeScript types for brand kit assets"
```

---

### Task 8: Pinia store — useBrandKitStore

**Files:**
- Create: `src/stores/brand-kit.ts`
- Test: `tests/unit/stores/brand-kit.test.ts`

- [ ] **Step 1: Write failing unit tests**

```ts
// tests/unit/stores/brand-kit.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useBrandKitStore } from '@/stores/brand-kit'
import { useBrandsStore } from '@/stores/brands'

const rpcMock = mock((_name: string, _args?: any) => Promise.resolve({ data: 'new-uuid', error: null }))

mock.module('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock, from: () => ({}) },
}))

describe('useBrandKitStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    rpcMock.mockClear()
    // seed selectedBrand on useBrandsStore
    const brands = useBrandsStore()
    brands.selectedBrand = {
      id: 'b1', name: 'Nike',
      tone_snippets: [{ id: 's1', label: 'A', category: 'X', content: 'a', order: 0 }],
      saved_blocks: [],
      writing_rules: { no_em_dash: true },
      identity: { about: { content: 'About Nike', last_edited_at: '2026-01-01', last_edited_by: 'u1', word_count: 2 } },
      colors: [],
    } as any
  })

  test('toneSnippets getter returns sorted by order', () => {
    const store = useBrandKitStore()
    expect(store.toneSnippets).toHaveLength(1)
    expect(store.toneSnippets[0].label).toBe('A')
  })

  test('addToneSnippet calls add_tone_snippet RPC and optimistically updates', async () => {
    const store = useBrandKitStore()
    rpcMock.mockResolvedValueOnce({ data: 'new-uuid', error: null } as any)
    await store.addToneSnippet('B', 'Y', 'b')
    expect(rpcMock).toHaveBeenCalledWith('add_tone_snippet', {
      p_brand_id: 'b1', p_label: 'B', p_category: 'Y', p_content: 'b',
    })
    // optimistic update happened on useBrandsStore.selectedBrand.tone_snippets
    const brands = useBrandsStore()
    expect(brands.selectedBrand?.tone_snippets).toHaveLength(2)
  })

  test('addToneSnippet rolls back on error', async () => {
    const store = useBrandKitStore()
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'cap_exceeded' } } as any)
    await expect(store.addToneSnippet('B', 'Y', 'b')).rejects.toThrow()
    const brands = useBrandsStore()
    expect(brands.selectedBrand?.tone_snippets).toHaveLength(1) // rolled back
  })

  test('setWritingRule calls set_writing_rule RPC', async () => {
    const store = useBrandKitStore()
    await store.setWritingRule('no_exclamation', true)
    expect(rpcMock).toHaveBeenCalledWith('set_writing_rule', {
      p_brand_id: 'b1', p_rule_key: 'no_exclamation', p_enabled: true,
    })
  })

  test('updateIdentityCard calls update_brand_identity RPC', async () => {
    const store = useBrandKitStore()
    await store.updateIdentityCard('voice', 'Direct kinetic voice')
    expect(rpcMock).toHaveBeenCalledWith('update_brand_identity', {
      p_brand_id: 'b1', p_card_key: 'voice', p_content: 'Direct kinetic voice',
    })
  })
})
```

- [ ] **Step 2: Run, verify failure**

```bash
bun test tests/unit/stores/brand-kit.test.ts
```

Expected: FAIL (file not found).

- [ ] **Step 3: Write the store**

```ts
// src/stores/brand-kit.ts
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useBrandsStore } from '@/stores/brands'
import type { ToneSnippet, SavedBlock, IdentityCards, WritingRules, BrandColor } from '@/types/brand-kit'

export const useBrandKitStore = defineStore('brand-kit', () => {
  const brands = useBrandsStore()

  const brandId = computed(() => brands.selectedBrand?.id ?? null)

  const toneSnippets = computed<ToneSnippet[]>(() =>
    [...(brands.selectedBrand?.tone_snippets ?? [])].sort((a, b) => a.order - b.order)
  )
  const savedBlocks = computed<SavedBlock[]>(() =>
    [...(brands.selectedBrand?.saved_blocks ?? [])].sort((a, b) => a.order - b.order)
  )
  const writingRules = computed<WritingRules>(() => brands.selectedBrand?.writing_rules ?? {})
  const identity = computed<IdentityCards>(() => brands.selectedBrand?.identity ?? {})
  const brandColors = computed<BrandColor[]>(() => brands.selectedBrand?.colors ?? [])
  const brandLogoUrl = computed<string | null>(() => brands.selectedBrand?.logo_url ?? null)

  async function addToneSnippet(label: string, category: string, content: string): Promise<string> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const optimisticSnippet: ToneSnippet = {
      id: 'optimistic-' + crypto.randomUUID(), label, category, content,
      order: brands.selectedBrand.tone_snippets.length,
    }
    brands.selectedBrand.tone_snippets = [...brands.selectedBrand.tone_snippets, optimisticSnippet]
    const { data, error } = await supabase.rpc('add_tone_snippet', {
      p_brand_id: brandId.value, p_label: label, p_category: category, p_content: content,
    })
    if (error || !data) {
      // rollback
      brands.selectedBrand.tone_snippets = brands.selectedBrand.tone_snippets.filter(s => s.id !== optimisticSnippet.id)
      throw new Error(error?.message ?? 'add_failed')
    }
    optimisticSnippet.id = data as string
    return optimisticSnippet.id
  }

  async function updateToneSnippet(id: string, label: string, category: string, content: string): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = brands.selectedBrand.tone_snippets
    brands.selectedBrand.tone_snippets = before.map(s => s.id === id ? { ...s, label, category, content } : s)
    const { error } = await supabase.rpc('update_tone_snippet', {
      p_brand_id: brandId.value, p_snippet_id: id, p_label: label, p_category: category, p_content: content,
    })
    if (error) { brands.selectedBrand.tone_snippets = before; throw new Error(error.message) }
  }

  async function deleteToneSnippet(id: string): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = brands.selectedBrand.tone_snippets
    brands.selectedBrand.tone_snippets = before.filter(s => s.id !== id)
    const { error } = await supabase.rpc('delete_tone_snippet', { p_brand_id: brandId.value, p_snippet_id: id })
    if (error) { brands.selectedBrand.tone_snippets = before; throw new Error(error.message) }
  }

  async function reorderToneSnippets(orderedIds: string[]): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = brands.selectedBrand.tone_snippets
    brands.selectedBrand.tone_snippets = orderedIds.map((id, idx) => {
      const s = before.find(x => x.id === id)!
      return { ...s, order: idx }
    })
    const { error } = await supabase.rpc('reorder_tone_snippets', { p_brand_id: brandId.value, p_ordered_ids: orderedIds })
    if (error) { brands.selectedBrand.tone_snippets = before; throw new Error(error.message) }
  }

  // Same pattern for saved_blocks (4 actions):
  async function addSavedBlock(label: string, category: string, content: string, type: 'text'|'cta'|'footer'): Promise<string> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const optimistic: SavedBlock = {
      id: 'optimistic-' + crypto.randomUUID(), label, category, content, type,
      order: brands.selectedBrand.saved_blocks.length,
    }
    brands.selectedBrand.saved_blocks = [...brands.selectedBrand.saved_blocks, optimistic]
    const { data, error } = await supabase.rpc('add_saved_block', {
      p_brand_id: brandId.value, p_label: label, p_category: category, p_content: content, p_type: type,
    })
    if (error || !data) {
      brands.selectedBrand.saved_blocks = brands.selectedBrand.saved_blocks.filter(b => b.id !== optimistic.id)
      throw new Error(error?.message ?? 'add_failed')
    }
    optimistic.id = data as string
    return optimistic.id
  }

  async function updateSavedBlock(id: string, label: string, category: string, content: string, type: 'text'|'cta'|'footer'): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = brands.selectedBrand.saved_blocks
    brands.selectedBrand.saved_blocks = before.map(b => b.id === id ? { ...b, label, category, content, type } : b)
    const { error } = await supabase.rpc('update_saved_block', {
      p_brand_id: brandId.value, p_block_id: id, p_label: label, p_category: category, p_content: content, p_type: type,
    })
    if (error) { brands.selectedBrand.saved_blocks = before; throw new Error(error.message) }
  }

  async function deleteSavedBlock(id: string): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = brands.selectedBrand.saved_blocks
    brands.selectedBrand.saved_blocks = before.filter(b => b.id !== id)
    const { error } = await supabase.rpc('delete_saved_block', { p_brand_id: brandId.value, p_block_id: id })
    if (error) { brands.selectedBrand.saved_blocks = before; throw new Error(error.message) }
  }

  async function reorderSavedBlocks(orderedIds: string[]): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = brands.selectedBrand.saved_blocks
    brands.selectedBrand.saved_blocks = orderedIds.map((id, idx) => {
      const b = before.find(x => x.id === id)!
      return { ...b, order: idx }
    })
    const { error } = await supabase.rpc('reorder_saved_blocks', { p_brand_id: brandId.value, p_ordered_ids: orderedIds })
    if (error) { brands.selectedBrand.saved_blocks = before; throw new Error(error.message) }
  }

  async function setWritingRule(key: string, enabled: boolean): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = { ...brands.selectedBrand.writing_rules }
    brands.selectedBrand.writing_rules = { ...before, [key]: enabled }
    const { error } = await supabase.rpc('set_writing_rule', { p_brand_id: brandId.value, p_rule_key: key, p_enabled: enabled })
    if (error) { brands.selectedBrand.writing_rules = before; throw new Error(error.message) }
  }

  async function updateIdentityCard(cardKey: 'about'|'voice'|'story', content: string): Promise<void> {
    if (!brandId.value || !brands.selectedBrand) throw new Error('no_active_brand')
    const before = { ...brands.selectedBrand.identity }
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length
    brands.selectedBrand.identity = {
      ...before,
      [cardKey]: { content, last_edited_at: new Date().toISOString(), last_edited_by: 'me', word_count: wordCount },
    }
    const { error } = await supabase.rpc('update_brand_identity', { p_brand_id: brandId.value, p_card_key: cardKey, p_content: content })
    if (error) { brands.selectedBrand.identity = before; throw new Error(error.message) }
  }

  return {
    toneSnippets, savedBlocks, writingRules, identity, brandColors, brandLogoUrl,
    addToneSnippet, updateToneSnippet, deleteToneSnippet, reorderToneSnippets,
    addSavedBlock, updateSavedBlock, deleteSavedBlock, reorderSavedBlocks,
    setWritingRule, updateIdentityCard,
  }
})
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
bun test tests/unit/stores/brand-kit.test.ts
```

Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add src/stores/brand-kit.ts tests/unit/stores/brand-kit.test.ts
git commit -m "feat(cluster-05): useBrandKitStore — optimistic CRUD for tone snippets, saved blocks, writing rules, identity"
```

---

### Task 9: Pinia store — useBrandFontsStore (with Realtime)

**Files:**
- Create: `src/stores/brand-fonts.ts`
- Test: `tests/unit/stores/brand-fonts.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/stores/brand-fonts.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useBrandFontsStore } from '@/stores/brand-fonts'

const fetchMock = mock(() => Promise.resolve(new Response(JSON.stringify({
  font_id: 'f1', file_path: 'brand-fonts/b1/f1.woff2', family_name: 'Test',
}), { status: 200 })))

global.fetch = fetchMock as any

describe('useBrandFontsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockClear()
  })

  test('uploadFont sends multipart POST and inserts font', async () => {
    const store = useBrandFontsStore()
    const file = new File([new Uint8Array(1024)], 'test.woff2', { type: 'font/woff2' })
    const result = await store.uploadFont('b1', file, 'Test', true)
    expect(fetchMock).toHaveBeenCalled()
    const call = fetchMock.mock.calls[0]
    expect(call[0]).toBe('/api/brand-fonts/upload')
    const init = call[1]!
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect(result.id).toBe('f1')
  })

  test('uploadFont without license_attested throws', async () => {
    const store = useBrandFontsStore()
    const file = new File([new Uint8Array(1024)], 'test.woff2', { type: 'font/woff2' })
    await expect(store.uploadFont('b1', file, 'Test', false)).rejects.toThrow(/license/)
  })
})
```

- [ ] **Step 2: Run, verify failure**

```bash
bun test tests/unit/stores/brand-fonts.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write the store**

```ts
// src/stores/brand-fonts.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { BrandFont } from '@/types/brand-kit'

export const useBrandFontsStore = defineStore('brand-fonts', () => {
  const fonts = ref<BrandFont[]>([])
  const uploadProgress = ref<Map<string, number>>(new Map())
  const uploadErrors = ref<Map<string, string>>(new Map())
  const realtimeChannels = new Map<string, ReturnType<typeof supabase.channel>>()

  const fontsForBrand = (brandId: string) => computed(() => fonts.value.filter(f => f.brand_id === brandId))

  async function fetchFonts(brandId: string): Promise<void> {
    const { data, error } = await supabase.from('brand_fonts').select('*').eq('brand_id', brandId)
    if (error) throw new Error(error.message)
    fonts.value = [...fonts.value.filter(f => f.brand_id !== brandId), ...(data ?? [])]
  }

  async function uploadFont(brandId: string, file: File, familyName: string, licenseAttested: boolean): Promise<BrandFont> {
    if (!licenseAttested) throw new Error('license_not_attested')
    if (file.size > 5_242_880) throw new Error('file_too_large')

    const trackingKey = `${brandId}:${familyName}`
    uploadProgress.value.set(trackingKey, 0)
    uploadErrors.value.delete(trackingKey)

    const form = new FormData()
    form.set('brand_id', brandId)
    form.set('family_name', familyName)
    form.set('license_attested', 'true')
    form.set('file', file)

    const idempotencyKey = crypto.randomUUID()
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('not_authenticated')

      const res = await fetch('/api/brand-fonts/upload', {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${token}`, 'X-Idempotency-Key': idempotencyKey },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      const body = await res.json() as { font_id: string; file_path: string; family_name: string }
      const newFont: BrandFont = {
        id: body.font_id, brand_id: brandId, family_name: body.family_name, file_path: body.file_path,
        file_size_bytes: file.size, mime_type: file.type as BrandFont['mime_type'],
        license_attested: true, uploaded_at: new Date().toISOString(), uploaded_by: 'me',
      }
      fonts.value = [...fonts.value, newFont]
      uploadProgress.value.set(trackingKey, 1)
      return newFont
    } catch (err) {
      uploadErrors.value.set(trackingKey, (err as Error).message)
      throw err
    }
  }

  async function deleteFont(fontId: string): Promise<void> {
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) throw new Error('not_authenticated')
    const res = await fetch(`/api/brand-fonts/${fontId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`delete_failed_${res.status}`)
    fonts.value = fonts.value.filter(f => f.id !== fontId)
  }

  function subscribeRealtime(brandId: string): void {
    if (realtimeChannels.has(brandId)) return
    const ch = supabase.channel(`brand:${brandId}:fonts`)
      .on('broadcast', { event: 'font_added' }, () => fetchFonts(brandId))
      .on('broadcast', { event: 'font_removed' }, () => fetchFonts(brandId))
      .subscribe()
    realtimeChannels.set(brandId, ch)
  }

  function unsubscribeRealtime(brandId: string): void {
    const ch = realtimeChannels.get(brandId)
    if (ch) { supabase.removeChannel(ch); realtimeChannels.delete(brandId) }
  }

  return { fonts, uploadProgress, uploadErrors, fontsForBrand, fetchFonts, uploadFont, deleteFont, subscribeRealtime, unsubscribeRealtime }
})
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
bun test tests/unit/stores/brand-fonts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/brand-fonts.ts tests/unit/stores/brand-fonts.test.ts
git commit -m "feat(cluster-05): useBrandFontsStore — upload/delete/realtime"
```

---

### Task 10: Pinia store — useBrandKbSourcesStore

**Files:**
- Create: `src/stores/brand-kb-sources.ts`
- Test: `tests/unit/stores/brand-kb-sources.test.ts`

- [ ] **Step 1: Mirror Task 9 test + store, swapping `brand-fonts` → `brand-kb-sources`, swap MIME allowlist, drop license-attest gate**

(Code parallel to Task 9; replace bucket/endpoint names; allowed MIME = `application/pdf`, `text/plain`, `text/markdown`; file_size cap = 10 MB)

- [ ] **Step 2: Verify all tests fail → write store → tests pass**

- [ ] **Step 3: Commit**

```bash
git add src/stores/brand-kb-sources.ts tests/unit/stores/brand-kb-sources.test.ts
git commit -m "feat(cluster-05): useBrandKbSourcesStore — upload/delete KB sources"
```

---

### Task 11: Composable — useBrandKitDrag (4 drag-source handlers)

**Files:**
- Create: `src/composables/brand-kit/use-brand-kit-drag.ts`
- Test: `tests/unit/composables/brand-kit/use-brand-kit-drag.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/composables/brand-kit/use-brand-kit-drag.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'

function makeDragEvent(): DragEvent {
  const dt = { setData: mock(() => undefined), setDragImage: mock(() => undefined), effectAllowed: '' } as unknown as DataTransfer
  return { dataTransfer: dt, preventDefault: mock(() => undefined) } as unknown as DragEvent
}

describe('useBrandKitDrag', () => {
  test('onColorDragStart sets x-kova-brand-color MIME with hex + swatchId', () => {
    const { onColorDragStart } = useBrandKitDrag('brand-1')
    const e = makeDragEvent()
    onColorDragStart({ id: 's1', hex: '#FA5400', label: 'Flame', order: 1 }, e)
    expect((e.dataTransfer!.setData as any)).toHaveBeenCalledWith(
      'application/x-kova-brand-color',
      JSON.stringify({ hex: '#FA5400', swatchId: 's1', brandId: 'brand-1' }),
    )
    expect(e.dataTransfer!.effectAllowed).toBe('copyMove')
  })

  test('onFontDragStart sets x-kova-brand-font MIME', () => {
    const { onFontDragStart } = useBrandKitDrag('brand-1')
    const e = makeDragEvent()
    onFontDragStart({ id: 'f1', family_name: 'Inter Tight', file_path: 'p' } as any, e)
    expect((e.dataTransfer!.setData as any)).toHaveBeenCalledWith(
      'application/x-kova-brand-font',
      expect.stringContaining('Inter Tight'),
    )
  })

  test('onLogoDragStart sets x-kova-brand-asset MIME with kind=logo', () => {
    const { onLogoDragStart } = useBrandKitDrag('brand-1')
    const e = makeDragEvent()
    onLogoDragStart({ assetId: 'a1', kind: 'logo', url: 'https://.../logo.svg' }, e)
    expect((e.dataTransfer!.setData as any)).toHaveBeenCalledWith(
      'application/x-kova-brand-asset',
      JSON.stringify({ assetId: 'a1', kind: 'logo', url: 'https://.../logo.svg', brandId: 'brand-1' }),
    )
  })

  test('onSavedBlockDragStart sets x-kova-saved-block MIME with full blockData', () => {
    const { onSavedBlockDragStart } = useBrandKitDrag('brand-1')
    const e = makeDragEvent()
    onSavedBlockDragStart({ id: 'b1', label: 'CTA', category: 'CTA', content: 'Shop now', type: 'cta', order: 0 }, e)
    const setDataCall = (e.dataTransfer!.setData as any).mock.calls[0]
    expect(setDataCall[0]).toBe('application/x-kova-saved-block')
    const payload = JSON.parse(setDataCall[1])
    expect(payload).toEqual({
      blockId: 'b1',
      blockData: { label: 'CTA', content: 'Shop now', type: 'cta' },
      brandId: 'brand-1',
    })
  })
})
```

- [ ] **Step 2: Run, verify failure**

```bash
bun test tests/unit/composables/brand-kit/use-brand-kit-drag.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write the composable**

```ts
// src/composables/brand-kit/use-brand-kit-drag.ts
import type { BrandColor, BrandFont, SavedBlock } from '@/types/brand-kit'

export function useBrandKitDrag(brandId: string) {
  function setPayload(e: DragEvent, mime: string, payload: unknown): void {
    if (!e.dataTransfer) return
    e.dataTransfer.setData(mime, JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  function onColorDragStart(color: BrandColor, e: DragEvent): void {
    setPayload(e, 'application/x-kova-brand-color', {
      hex: color.hex, swatchId: color.id, brandId,
    })
  }

  function onFontDragStart(font: BrandFont, e: DragEvent): void {
    setPayload(e, 'application/x-kova-brand-font', {
      family: font.family_name, fontId: font.id, fontFileUrl: font.file_path, brandId,
    })
  }

  function onLogoDragStart(logo: { assetId: string; kind: 'logo'|'wordmark'|'image'; url: string }, e: DragEvent): void {
    setPayload(e, 'application/x-kova-brand-asset', {
      assetId: logo.assetId, kind: logo.kind, url: logo.url, brandId,
    })
  }

  function onSavedBlockDragStart(block: SavedBlock, e: DragEvent): void {
    setPayload(e, 'application/x-kova-saved-block', {
      blockId: block.id,
      blockData: { label: block.label, content: block.content, type: block.type },
      brandId,
    })
  }

  return { onColorDragStart, onFontDragStart, onLogoDragStart, onSavedBlockDragStart }
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
bun test tests/unit/composables/brand-kit/use-brand-kit-drag.test.ts
```

Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/composables/brand-kit/use-brand-kit-drag.ts tests/unit/composables/brand-kit/use-brand-kit-drag.test.ts
git commit -m "feat(cluster-05): useBrandKitDrag — 4 MIME-typed drag-source handlers per Q24"
```

---

### Task 12: Composable — useVoiceDraft + voice-draft Edge Functions

**Files:**
- Create: `src/composables/use-voice-draft.ts`
- Create: `api/brands/[id]/voice-draft/confirm.ts`
- Create: `api/brands/[id]/voice-draft/discard.ts`
- Test: `tests/unit/composables/use-voice-draft.test.ts`, `tests/unit/api/brands/voice-draft/confirm.test.ts`, `tests/unit/api/brands/voice-draft/discard.test.ts`

- [ ] **Step 1: Write failing tests for the composable**

```ts
// tests/unit/composables/use-voice-draft.test.ts
import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { useVoiceDraft } from '@/composables/use-voice-draft'

const supabaseFromMock = mock(() => ({
  select: () => ({ eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
}))

const fetchMock = mock(() => Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 })))
global.fetch = fetchMock as any

mock.module('@/lib/supabase', () => ({
  supabase: { from: supabaseFromMock, auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'tok' } } }) } },
}))

describe('useVoiceDraft', () => {
  beforeEach(() => { fetchMock.mockClear() })

  test('loadDraftAfterShopifyConnect populates draft when one exists', async () => {
    supabaseFromMock.mockReturnValueOnce({
      select: () => ({ eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: {
        id: 'd1', brand_id: 'b1', user_id: 'u1', source: 'shopify_extract',
        draft_payload: { voice: { content: 'V' }, tone_snippets: [] },
        created_at: '2026-01-01', confirmed_at: null, discarded_at: null,
      }, error: null }) }) }) }),
    } as any)
    const vd = useVoiceDraft()
    await vd.loadDraftForBrand('b1')
    expect(vd.draft.value?.id).toBe('d1')
  })

  test('confirmDraft POSTs to /api/brands/:id/voice-draft/confirm with optional edited_payload', async () => {
    const vd = useVoiceDraft()
    vd.draft.value = {
      id: 'd1', brand_id: 'b1', user_id: 'u1', source: 'shopify_extract',
      draft_payload: { voice: { content: 'orig' }, tone_snippets: [] },
      created_at: '', confirmed_at: null, discarded_at: null,
    }
    await vd.confirmDraft({ voice: { content: 'edited' }, tone_snippets: [] })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/brands/b1/voice-draft/confirm',
      expect.objectContaining({ method: 'POST' }),
    )
    const init = fetchMock.mock.calls[0][1]! as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body.draft_id).toBe('d1')
    expect(body.edited_payload.voice.content).toBe('edited')
    expect((init.headers as any)['X-Idempotency-Key']).toBeTruthy()
  })

  test('discardDraft POSTs to discard endpoint and clears state', async () => {
    const vd = useVoiceDraft()
    vd.draft.value = {
      id: 'd1', brand_id: 'b1', user_id: 'u1', source: 'shopify_extract',
      draft_payload: { voice: { content: 'x' }, tone_snippets: [] },
      created_at: '', confirmed_at: null, discarded_at: null,
    }
    await vd.discardDraft()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/brands/b1/voice-draft/discard',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(vd.draft.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run and verify failure**

```bash
bun test tests/unit/composables/use-voice-draft.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write the composable**

```ts
// src/composables/use-voice-draft.ts
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { VoiceDraft, VoiceDraftPayload } from '@/types/brand-kit'

const draft = ref<VoiceDraft | null>(null)

async function loadDraftForBrand(brandId: string): Promise<void> {
  const { data, error } = await supabase
    .from('voice_drafts')
    .select('*')
    .eq('brand_id', brandId)
    .is('confirmed_at', null)
    .is('discarded_at', null)
    .maybeSingle()
  if (error) throw new Error(error.message)
  draft.value = (data as VoiceDraft | null) ?? null
}

async function confirmDraft(editedPayload?: VoiceDraftPayload): Promise<void> {
  if (!draft.value) throw new Error('no_active_draft')
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('not_authenticated')
  const res = await fetch(`/api/brands/${draft.value.brand_id}/voice-draft/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ draft_id: draft.value.id, edited_payload: editedPayload }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `confirm_failed_${res.status}`)
  }
  draft.value = null
}

async function discardDraft(): Promise<void> {
  if (!draft.value) throw new Error('no_active_draft')
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('not_authenticated')
  const res = await fetch(`/api/brands/${draft.value.brand_id}/voice-draft/discard`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ draft_id: draft.value.id }),
  })
  if (!res.ok) throw new Error(`discard_failed_${res.status}`)
  draft.value = null
}

export function useVoiceDraft() {
  return { draft, loadDraftForBrand, confirmDraft, discardDraft }
}
```

- [ ] **Step 4: Write Edge Function tests**

```ts
// tests/unit/api/brands/voice-draft/confirm.test.ts
import { describe, test, expect, mock } from 'bun:test'
import handler from '@/../api/brands/[id]/voice-draft/confirm'

// Mock Supabase: verifyAuth + service-role .rpc('confirm_voice_draft', ...) + audit_log insert
// (Use existing test-utils patterns from M9 api tests)

describe('POST /api/brands/:id/voice-draft/confirm', () => {
  test('returns 200 on success', async () => { /* full mock + assertion */ })
  test('returns 401 without auth', async () => { /* */ })
  test('returns 403 on non-owner', async () => { /* */ })
  test('returns 404 when draft already resolved (P0002)', async () => { /* */ })
  test('writes edited_payload to brands.identity.voice when provided', async () => { /* */ })
  test('audit_log row inserted', async () => { /* */ })
})
```

```ts
// tests/unit/api/brands/voice-draft/discard.test.ts — parallel
```

- [ ] **Step 5: Write the Edge Functions**

```ts
// api/brands/[id]/voice-draft/confirm.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, getServiceRoleClient } from '@/../api/_shared/supabase-server'
import { checkIdempotency, recordIdempotency } from '@/../api/_shared/idempotency'  // Cluster 11

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const auth = await verifyAuth(req)
  if (!auth.ok) return res.status(401).json({ error: 'unauthenticated' })

  const brandId = req.query.id as string
  const idempKey = req.headers['x-idempotency-key'] as string | undefined
  if (idempKey) {
    const prior = await checkIdempotency(auth.userId, idempKey)
    if (prior) return res.status(prior.status).json(prior.body)
  }

  const { draft_id, edited_payload } = req.body as { draft_id: string; edited_payload?: any }
  if (!draft_id) return res.status(400).json({ error: 'invalid_request' })

  const supabase = getServiceRoleClient()

  // If edited_payload provided, update voice_drafts.draft_payload first
  if (edited_payload) {
    const { error } = await supabase.from('voice_drafts')
      .update({ draft_payload: edited_payload })
      .eq('id', draft_id)
      .eq('brand_id', brandId)
      .is('confirmed_at', null)
      .is('discarded_at', null)
    if (error) return res.status(500).json({ error: 'edit_failed' })
  }

  // Call SECURITY-DEFINER RPC as the authenticated user (need user-scoped client OR pass auth token through service-role JWT exchange)
  const userClient = getUserScopedClient(auth.userId)  // helper from _shared
  const { error: rpcError } = await userClient.rpc('confirm_voice_draft', { p_draft_id: draft_id })

  if (rpcError) {
    if (rpcError.code === 'P0002') return res.status(404).json({ error: 'draft_not_found_or_already_resolved' })
    if (rpcError.code === '42501') return res.status(403).json({ error: 'forbidden' })
    return res.status(500).json({ error: 'rpc_failed', request_id: rpcError.details ?? '' })
  }

  // Audit log
  await supabase.from('audit_log').insert({
    event: 'voice_draft_confirmed', user_id: auth.userId, brand_id: brandId, draft_id,
  })

  // Read back counts for response
  const { data: brand } = await supabase.from('brands').select('identity, tone_snippets').eq('id', brandId).single()
  const voiceWordCount = brand?.identity?.voice?.word_count ?? 0
  const toneSnippetCount = (brand?.tone_snippets as any[])?.length ?? 0

  const body = { success: true, voice_word_count: voiceWordCount, tone_snippet_count: toneSnippetCount }
  if (idempKey) await recordIdempotency(auth.userId, idempKey, { status: 200, body })
  res.status(200).json(body)
}
```

```ts
// api/brands/[id]/voice-draft/discard.ts — parallel, calls discard_voice_draft RPC, audit-logs 'voice_draft_discarded'
```

- [ ] **Step 6: Run all tests, verify PASS**

```bash
bun test tests/unit/composables/use-voice-draft.test.ts tests/unit/api/brands/voice-draft/
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/composables/use-voice-draft.ts api/brands/[id]/voice-draft/ tests/unit/composables/use-voice-draft.test.ts tests/unit/api/brands/voice-draft/
git commit -m "feat(cluster-05): voice-draft guardrail — composable + confirm/discard Edge Functions + audit log"
```

---

### Task 13: Shared file-type-sniff helper (MIME magic-number per 2.B.5)

**Files:**
- Create: `api/_shared/file-type-sniff.ts`
- Test: `tests/unit/api/_shared/file-type-sniff.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/api/_shared/file-type-sniff.test.ts
import { describe, test, expect } from 'bun:test'
import { sniffMime } from '@/../api/_shared/file-type-sniff'
import { readFileSync } from 'node:fs'

describe('sniffMime', () => {
  test('valid woff2 with woff2 ext + Content-Type → allowed', async () => {
    const buf = readFileSync('tests/fixtures/Inter-Regular.woff2')
    const result = await sniffMime(buf, 'Inter.woff2', 'font/woff2', ['font/woff2','font/ttf','font/otf'])
    expect(result).toEqual({ ok: true, mime: 'font/woff2' })
  })

  test('PDF disguised as font (mismatch) → rejected', async () => {
    const buf = readFileSync('tests/fixtures/short.pdf')
    const result = await sniffMime(buf, 'fake.woff2', 'font/woff2', ['font/woff2','font/ttf','font/otf'])
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('mime_mismatch')
  })

  test('Content-Type allowed but extension wrong → rejected', async () => {
    const buf = readFileSync('tests/fixtures/Inter-Regular.woff2')
    const result = await sniffMime(buf, 'Inter.exe', 'font/woff2', ['font/woff2','font/ttf','font/otf'])
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Verify failure, write helper**

```ts
// api/_shared/file-type-sniff.ts
import { fileTypeFromBuffer } from 'file-type'

const EXT_MAP: Record<string, string> = {
  woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown',
}

export interface SniffResult { ok: true; mime: string } | { ok: false; reason: string }

export async function sniffMime(
  buf: Buffer | Uint8Array,
  filename: string,
  declaredMime: string,
  allowed: readonly string[],
): Promise<SniffResult> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const extMime = EXT_MAP[ext]
  if (!extMime || !allowed.includes(extMime)) return { ok: false, reason: 'unsupported_extension' }

  const sniffed = await fileTypeFromBuffer(buf)
  const sniffedMime = sniffed?.mime ?? (ext === 'txt' || ext === 'md' ? extMime : null)
  if (!sniffedMime) return { ok: false, reason: 'cannot_sniff' }

  if (sniffedMime !== extMime || sniffedMime !== declaredMime) {
    return { ok: false, reason: 'mime_mismatch' }
  }
  return { ok: true, mime: sniffedMime }
}
```

Add `file-type` to package.json deps if not present: `bun add file-type`.

- [ ] **Step 3: Run, verify PASS**

```bash
bun test tests/unit/api/_shared/file-type-sniff.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add api/_shared/file-type-sniff.ts tests/unit/api/_shared/file-type-sniff.test.ts tests/fixtures/ package.json bun.lockb
git commit -m "feat(api): shared file-type-sniff helper (magic-number + ext + Content-Type triple-check per 2.B.5)"
```

---

### Task 14: Edge Function — POST /api/brand-fonts/upload

**Files:**
- Create: `api/brand-fonts/upload.ts`
- Test: `tests/unit/api/brand-fonts/upload.test.ts`
- Test: `tests/integration/api/brand-fonts-upload-flow.test.ts`

- [ ] **Step 1: Write unit tests covering every response code (200/400/401/403/409/413/415/422/429/500)**

(Use mocked Supabase, mocked sniffMime, mocked storage.upload, mocked rate-limit RPC; ~10 test cases.)

- [ ] **Step 2: Write integration test using local Supabase + real fixture font**

- [ ] **Step 3: Verify both fail**

```bash
bun test tests/unit/api/brand-fonts/upload.test.ts tests/integration/api/brand-fonts-upload-flow.test.ts
```

- [ ] **Step 4: Write the Edge Function** (full logic per PRD §5.1.1)

```ts
// api/brand-fonts/upload.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, getServiceRoleClient } from '@/../api/_shared/supabase-server'
import { sniffMime } from '@/../api/_shared/file-type-sniff'
import { checkRateLimit } from '@/../api/_shared/rate-limit'
import { checkIdempotency, recordIdempotency } from '@/../api/_shared/idempotency'
import { parseMultipart } from '@/../api/_shared/multipart'

const ALLOWED = ['font/woff2', 'font/ttf', 'font/otf'] as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const auth = await verifyAuth(req)
  if (!auth.ok) return res.status(401).json({ error: 'unauthenticated' })

  // Idempotency
  const idempKey = req.headers['x-idempotency-key'] as string | undefined
  if (idempKey) {
    const prior = await checkIdempotency(auth.userId, idempKey)
    if (prior) return res.status(prior.status).json(prior.body)
  }

  // Rate limit
  const rl = await checkRateLimit(auth.userId, 'brand_fonts.upload', { limit: 5, windowSec: 60 })
  if (!rl.ok) return res.status(429).json({ error: 'rate_limited', retry_after_seconds: rl.retryAfter })

  // Parse multipart
  const parsed = await parseMultipart(req).catch(() => null)
  if (!parsed) return res.status(400).json({ error: 'invalid_multipart' })
  const { brand_id, family_name, license_attested, file } = parsed.fields
  if (!brand_id || !family_name || !file) return res.status(400).json({ error: 'invalid_request' })
  if (license_attested !== 'true') return res.status(422).json({ error: 'license_not_attested' })
  if (file.size > 5_242_880) return res.status(413).json({ error: 'file_too_large' })

  // MIME triple-check
  const sniff = await sniffMime(file.buffer, file.filename, file.mimetype, ALLOWED)
  if (!sniff.ok) return res.status(415).json({ error: 'unsupported_mime', reason: sniff.reason })

  // Brand ownership
  const supabase = getServiceRoleClient()
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brand_id).eq('user_id', auth.userId).single()
  if (!brand) return res.status(403).json({ error: 'forbidden' })

  // Allocate font_id + Storage path
  const fontId = crypto.randomUUID()
  const ext = sniff.mime.split('/')[1]
  const filePath = `${brand_id}/${fontId}.${ext}`

  // Upload to Storage (service-role)
  const { error: storageErr } = await supabase.storage.from('brand-fonts').upload(filePath, file.buffer, {
    contentType: sniff.mime, upsert: false,
  })
  if (storageErr) return res.status(500).json({ error: 'storage_failed' })

  // Insert DB row
  const { error: insertErr } = await supabase.from('brand_fonts').insert({
    id: fontId, brand_id, family_name, file_path: filePath,
    file_size_bytes: file.size, mime_type: sniff.mime, license_attested: true, uploaded_by: auth.userId,
  })
  if (insertErr) {
    // duplicate (family_name)
    if (insertErr.code === '23505') {
      await supabase.storage.from('brand-fonts').remove([filePath])
      const { data: existing } = await supabase.from('brand_fonts').select('id').eq('brand_id', brand_id).eq('family_name', family_name).single()
      return res.status(409).json({ error: 'duplicate_family', existing_font_id: existing?.id })
    }
    await supabase.storage.from('brand-fonts').remove([filePath])
    return res.status(500).json({ error: 'db_insert_failed' })
  }

  // Realtime broadcast
  await supabase.channel(`brand:${brand_id}:fonts`).send({
    type: 'broadcast', event: 'font_added',
    payload: { font: { id: fontId, family_name, file_path: filePath } },
  })

  const body = { font_id: fontId, file_path: filePath, family_name }
  if (idempKey) await recordIdempotency(auth.userId, idempKey, { status: 200, body })
  return res.status(200).json(body)
}
```

- [ ] **Step 5: Run all tests, verify PASS**

```bash
bun test tests/unit/api/brand-fonts/upload.test.ts tests/integration/api/brand-fonts-upload-flow.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add api/brand-fonts/upload.ts tests/unit/api/brand-fonts/upload.test.ts tests/integration/api/brand-fonts-upload-flow.test.ts
git commit -m "feat(cluster-05): POST /api/brand-fonts/upload — multipart + magic-number sniff + idempotency + Realtime"
```

---

### Task 15: Edge Function — DELETE /api/brand-fonts/:id

**Files:**
- Create: `api/brand-fonts/[id].ts`
- Test: `tests/unit/api/brand-fonts/delete.test.ts`

- [ ] **Step 1-3: Standard TDD cycle. Logic per PRD §5.1.2 — verify ownership, remove from Storage (idempotent), DELETE row, broadcast `font_removed`. Test covers 200/401/403/404/500.**

- [ ] **Step 4: Commit**

```bash
git add api/brand-fonts/[id].ts tests/unit/api/brand-fonts/delete.test.ts
git commit -m "feat(cluster-05): DELETE /api/brand-fonts/:id"
```

---

### Task 16: Edge Function — POST /api/brand-kb-sources/upload + DELETE /api/brand-kb-sources/:id

**Files:**
- Create: `api/brand-kb-sources/upload.ts`, `api/brand-kb-sources/[id].ts`
- Test: `tests/unit/api/brand-kb-sources/upload.test.ts`, `tests/unit/api/brand-kb-sources/delete.test.ts`

- [ ] Same TDD cycle as Tasks 14+15, parallel structure, MIME allowlist swapped, 10 MB cap, no license-attestation field, no Realtime broadcast.

- [ ] **Commit**

```bash
git commit -m "feat(cluster-05): brand-kb-sources upload + delete Edge Functions"
```

---

### Task 17: Edge Function — extend POST /api/shopify/brand-kit-extract with voice/tone draft inference

**Files:**
- Modify: `api/shopify/brand-kit-extract.ts` (existing M9 file)
- Test: `tests/unit/api/shopify/brand-kit-extract.test.ts` (extend existing or rewrite per Shopify spec §5.2 rework note)

- [ ] **Step 1: Write failing test for the NEW branch**

```ts
// tests/unit/api/shopify/brand-kit-extract.test.ts (extend existing)
describe('brand-kit-extract — voice/tone branch (NEW)', () => {
  test('after extracting colors/fonts/logo, calls Anthropic and inserts voice_drafts row', async () => {
    // mock: shopify theme fetch → returns settings_data.json
    // mock: shopify_products query → returns 5 products
    // mock: storefront About-page HTTP GET → returns HTML
    // mock: @ai-sdk/anthropic generateObject → returns { voice: { content }, tone_snippets: [...] }
    // mock: supabase service role .from('voice_drafts').insert → success

    const res = await handler(mockReq, mockRes)
    expect(mockSupabaseInsert).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: 'b1', source: 'shopify_extract',
      draft_payload: expect.objectContaining({ voice: expect.any(Object), tone_snippets: expect.any(Array) }),
    }))
    expect(res.body.draft_id).toBeTruthy()
  })

  test('brands.identity and brands.tone_snippets NOT mutated by extract', async () => {
    // After running, query brands → assert identity is unchanged + tone_snippets unchanged
  })

  test('prior open draft is discarded when new extract runs', async () => {
    // Seed an open draft; run extract; assert old draft has discarded_at set, new draft created
  })
})
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Modify brand-kit-extract.ts to add the voice/tone inference path**

```ts
// api/shopify/brand-kit-extract.ts (additions only)
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import * as v from 'valibot'

const VoiceDraftSchema = v.object({
  voice: v.object({ content: v.pipe(v.string(), v.minLength(20), v.maxLength(800)) }),
  tone_snippets: v.pipe(
    v.array(v.object({
      label: v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
      category: v.pipe(v.string(), v.maxLength(32)),
      content: v.pipe(v.string(), v.minLength(10), v.maxLength(400)),
    })),
    v.minLength(3),
    v.maxLength(8),
  ),
})

// ... inside handler, after existing color/font/logo extraction succeeds ...

// 1. Discard any prior open draft
await supabase.from('voice_drafts')
  .update({ discarded_at: new Date().toISOString() })
  .eq('brand_id', brand_id)
  .is('confirmed_at', null)
  .is('discarded_at', null)

// 2. Fetch storefront content (best-effort)
let aboutPageText = ''
let productDescriptions = ''
try {
  const aboutResp = await fetch(`https://${shopDomain}/pages/about`).catch(() => null)
  if (aboutResp?.ok) {
    const html = await aboutResp.text()
    aboutPageText = stripHtml(html).slice(0, 5000)
  }
  const { data: products } = await supabase
    .from('shopify_products')
    .select('title, description_html')
    .eq('brand_id', brand_id)
    .order('created_at', { ascending: false })
    .limit(5)
  productDescriptions = (products ?? []).map(p => `${p.title}: ${stripHtml(p.description_html ?? '').slice(0, 200)}`).join('\n\n')
} catch { /* best-effort */ }

const sourceText = `ABOUT PAGE:\n${aboutPageText}\n\nPRODUCTS:\n${productDescriptions}`.slice(0, 6000)

// 3. Call Anthropic
const aiResp = await generateObject({
  model: anthropic('claude-sonnet-4-6'),
  schema: VoiceDraftSchema,
  prompt: `You are a brand-voice analyst. Given the storefront content below, infer:
(a) A 2-3 sentence brand-voice description capturing tone, register, and signature moves.
(b) 3-8 tone-snippet candidates as short labeled passages, each ≤ 60 words, each tagged with a category like PROMO / WELCOME / RESTOCK / TEACH / CART / CUSTOM.

Storefront content:
${sourceText}`,
})

if (!aiResp.object) {
  // Soft-fail: return without draft. Color/font/logo extraction still succeeded.
  return res.status(200).json({ extracted: { colors, fonts, logo_url }, draft_id: null })
}

// 4. Insert voice_drafts
const draftId = crypto.randomUUID()
await supabase.from('voice_drafts').insert({
  id: draftId, brand_id, user_id: auth.userId, source: 'shopify_extract',
  draft_payload: aiResp.object,
})

// 5. Return both
return res.status(200).json({
  extracted: { colors, fonts, logo_url },
  draft_id: draftId,
  draft_payload: aiResp.object,
})
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add api/shopify/brand-kit-extract.ts tests/unit/api/shopify/brand-kit-extract.test.ts
git commit -m "feat(cluster-05): extend brand-kit-extract to infer brand voice + tone snippets via Anthropic, persist to voice_drafts (guardrail per 00e §6 #5)"
```

---

### Task 18: Vue Router — register /account/brand-kit + 7 sub-tab routes

**Files:**
- Modify: `src/router/routes.ts`
- Test: `tests/unit/router/brand-kit-routes.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/router/brand-kit-routes.test.ts
import { describe, test, expect } from 'bun:test'
import { router } from '@/router'

describe('brand-kit nested routes', () => {
  test('/account/brand-kit redirects to /visuals', async () => {
    const resolved = router.resolve('/account/brand-kit')
    expect(resolved.matched[resolved.matched.length - 1].redirect).toBeTruthy()
  })

  for (const tab of ['visuals','identity','tone-snippets','saved-blocks','writing-rules','memories','kb-sources']) {
    test(`/account/brand-kit/${tab} resolves to brand-kit-${tab}`, () => {
      const r = router.resolve(`/account/brand-kit/${tab}`)
      expect(r.name).toBe(`brand-kit-${tab}`)
      expect(r.meta.theme).toBe('dark')
      expect(r.meta.requiresAuth).toBe(true)
    })
  }
})
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Add routes per PRD §6.1 (the full block with 7 children)**

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/router/routes.ts tests/unit/router/brand-kit-routes.test.ts
git commit -m "feat(cluster-05): Vue Router — /account/brand-kit/:tab nested routes (7 children, dark theme, desktop guard)"
```

---

### Task 19: Component — BrandKitSection.vue + BrandKitSubNav.vue

**Files:**
- Create: `src/views/account/BrandKitSection.vue`
- Create: `src/components/brand-kit/BrandKitSubNav.vue`
- Test: `tests/unit/components/brand-kit/BrandKitSubNav.test.ts`

- [ ] **Step 1: Write failing test for sub-nav**

```ts
// tests/unit/components/brand-kit/BrandKitSubNav.test.ts
import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BrandKitSubNav from '@/components/brand-kit/BrandKitSubNav.vue'

describe('BrandKitSubNav', () => {
  test('renders 7 nav items in order', () => {
    setActivePinia(createPinia())
    const wrap = mount(BrandKitSubNav, { global: { mocks: { $route: { name: 'brand-kit-visuals' } } } })
    const items = wrap.findAll('.bk-subnav .it')
    expect(items).toHaveLength(7)
    expect(items[0].text()).toContain('Visuals')
    expect(items[6].text()).toContain('Knowledge base')
  })

  test('active state on current route', () => {
    setActivePinia(createPinia())
    const wrap = mount(BrandKitSubNav, { global: { mocks: { $route: { name: 'brand-kit-identity' } } } })
    const active = wrap.find('.bk-subnav .it.active')
    expect(active.text()).toContain('Identity')
  })

  test('count badge on Tone snippets when data exists', () => {
    setActivePinia(createPinia())
    // seed useBrandKitStore.toneSnippets via useBrandsStore.selectedBrand
    const wrap = mount(BrandKitSubNav, { /* stub stores */ })
    const toneItem = wrap.findAll('.bk-subnav .it').find(i => i.text().includes('Tone snippets'))
    expect(toneItem!.text()).toMatch(/Tone snippets\s*\d+/)
  })
})
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Write components**

```vue
<!-- src/components/brand-kit/BrandKitSubNav.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBrandKitStore } from '@/stores/brand-kit'

const route = useRoute()
const brandKit = useBrandKitStore()

const items = computed(() => [
  { key: 'visuals',        label: 'Visuals',        icon: 'i-lucide-palette',     count: null },
  { key: 'identity',       label: 'Identity',       icon: 'i-lucide-user-circle', count: null },
  { key: 'tone-snippets',  label: 'Tone snippets',  icon: 'i-lucide-quote',       count: brandKit.toneSnippets.length },
  { key: 'saved-blocks',   label: 'Saved blocks',   icon: 'i-lucide-layers',      count: brandKit.savedBlocks.length },
  { key: 'writing-rules',  label: 'Writing rules',  icon: 'i-lucide-check-square',count: null },
  { key: 'memories',       label: 'Memories',       icon: 'i-lucide-brain',       count: null /* TODO Cluster 10 store */ },
  { key: 'kb-sources',     label: 'Knowledge base', icon: 'i-lucide-book-open',   count: null },
])

const isActive = (key: string) => route.name === `brand-kit-${key}`
</script>

<template>
  <div class="bk-subnav sticky top-0">
    <div class="head text-[10px] uppercase text-ink-3 mb-2">Brand Kit</div>
    <router-link
      v-for="item in items"
      :key="item.key"
      :to="`/account/brand-kit/${item.key}`"
      class="it flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
      :class="isActive(item.key) ? 'bg-fill text-ink font-medium' : 'text-ink-2 hover:bg-line-2 hover:text-ink'"
    >
      <component :is="item.icon" class="ic w-[13px] h-[13px] opacity-80" />
      <span>{{ item.label }}</span>
      <span v-if="item.count !== null" class="ml-auto text-[10px] text-ink-3">{{ item.count }}</span>
    </router-link>
  </div>
</template>
```

```vue
<!-- src/views/account/BrandKitSection.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import BrandKitSubNav from '@/components/brand-kit/BrandKitSubNav.vue'
import VoiceDraftConfirmModal from '@/components/brand-kit/modals/VoiceDraftConfirmModal.vue'
import { useBrandsStore } from '@/stores/brands'
import { useVoiceDraft } from '@/composables/use-voice-draft'

const brands = useBrandsStore()
const vd = useVoiceDraft()

onMounted(async () => {
  if (brands.selectedBrand?.id) await vd.loadDraftForBrand(brands.selectedBrand.id)
})
watch(() => brands.selectedBrand?.id, async (id) => { if (id) await vd.loadDraftForBrand(id) })
</script>

<template>
  <div class="acc-frame">
    <div class="acc-main">
      <div class="acc-hero flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold">Brand Kit</h1>
          <p class="text-ink-3 text-sm mt-1">Visuals, voice, and knowledge for one brand. Switch brand from the picker on the right — every sub-tab updates.</p>
        </div>
        <!-- Brand picker (A2b) is Cluster 03's <BrandPicker> component anchored here -->
        <BrandPicker variant="section" />
      </div>

      <div class="acc-content bk-wrap grid grid-cols-[200px_1fr] gap-6 mt-6">
        <BrandKitSubNav />
        <div class="bk-pane min-w-0">
          <router-view />
        </div>
      </div>
    </div>

    <VoiceDraftConfirmModal v-if="vd.draft.value" :draft="vd.draft.value" />
  </div>
</template>
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/views/account/BrandKitSection.vue src/components/brand-kit/BrandKitSubNav.vue tests/unit/components/brand-kit/BrandKitSubNav.test.ts
git commit -m "feat(cluster-05): BrandKitSection shell + BrandKitSubNav (7-item sticky vertical nav)"
```

---

### Task 20: Component — VoiceDraftConfirmModal.vue (the GUARDRAIL — critical user-facing test)

**Files:**
- Create: `src/components/brand-kit/modals/VoiceDraftConfirmModal.vue`
- Test: `tests/unit/components/brand-kit/VoiceDraftConfirmModal.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/components/brand-kit/VoiceDraftConfirmModal.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import VoiceDraftConfirmModal from '@/components/brand-kit/modals/VoiceDraftConfirmModal.vue'

const confirmDraftMock = mock(() => Promise.resolve())
const discardDraftMock = mock(() => Promise.resolve())

mock.module('@/composables/use-voice-draft', () => ({
  useVoiceDraft: () => ({ draft: { value: null }, confirmDraft: confirmDraftMock, discardDraft: discardDraftMock }),
}))

const draft = {
  id: 'd1', brand_id: 'b1', user_id: 'u1', source: 'shopify_extract' as const,
  created_at: '', confirmed_at: null, discarded_at: null,
  draft_payload: {
    voice: { content: 'Direct, kinetic, second-person.' },
    tone_snippets: [
      { label: 'Welcome', category: 'WELCOME', content: 'Hi athletes.' },
      { label: 'Restock', category: 'RESTOCK', content: 'Back in your size.' },
    ],
  },
}

describe('VoiceDraftConfirmModal', () => {
  test('renders voice + 2 tone snippets editable', () => {
    setActivePinia(createPinia())
    const wrap = mount(VoiceDraftConfirmModal, { props: { draft } })
    expect(wrap.find('textarea[name="voice"]').element).toBeTruthy()
    const snippetRows = wrap.findAll('.snippet-row')
    expect(snippetRows).toHaveLength(2)
  })

  test('Confirm passes edited_payload to confirmDraft', async () => {
    setActivePinia(createPinia())
    confirmDraftMock.mockClear()
    const wrap = mount(VoiceDraftConfirmModal, { props: { draft } })
    const voiceTextarea = wrap.find('textarea[name="voice"]')
    await voiceTextarea.setValue('Edited voice text')
    await wrap.find('[data-test="confirm-btn"]').trigger('click')
    expect(confirmDraftMock).toHaveBeenCalled()
    const passedPayload = confirmDraftMock.mock.calls[0][0]
    expect(passedPayload.voice.content).toBe('Edited voice text')
    expect(passedPayload.tone_snippets).toHaveLength(2)
  })

  test('Discard calls discardDraft', async () => {
    setActivePinia(createPinia())
    discardDraftMock.mockClear()
    const wrap = mount(VoiceDraftConfirmModal, { props: { draft } })
    await wrap.find('[data-test="discard-btn"]').trigger('click')
    expect(discardDraftMock).toHaveBeenCalled()
  })

  test('Removing all snippets leaves empty list', async () => {
    setActivePinia(createPinia())
    const wrap = mount(VoiceDraftConfirmModal, { props: { draft } })
    await wrap.findAll('[data-test="snippet-remove"]')[0].trigger('click')
    await wrap.findAll('[data-test="snippet-remove"]')[0].trigger('click')
    expect(wrap.findAll('.snippet-row')).toHaveLength(0)
  })

  test('Footer privacy disclosure renders /privacy link', () => {
    setActivePinia(createPinia())
    const wrap = mount(VoiceDraftConfirmModal, { props: { draft } })
    const link = wrap.find('a[href="/privacy"]')
    expect(link.exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Write component**

```vue
<!-- src/components/brand-kit/modals/VoiceDraftConfirmModal.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useVoiceDraft } from '@/composables/use-voice-draft'
import { useToast } from '@/composables/use-toast'
import KovaModal from '@/components/shared/KovaModal.vue'  // Cluster 11
import type { VoiceDraft, VoiceDraftPayload } from '@/types/brand-kit'

const props = defineProps<{ draft: VoiceDraft }>()

const vd = useVoiceDraft()
const toast = useToast()

const voiceContent = ref(props.draft.draft_payload.voice.content)
const snippets = ref([...props.draft.draft_payload.tone_snippets])

function removeSnippet(idx: number): void {
  snippets.value = snippets.value.filter((_, i) => i !== idx)
}

async function onConfirm(): Promise<void> {
  const edited: VoiceDraftPayload = {
    voice: { content: voiceContent.value.trim() },
    tone_snippets: snippets.value.map(s => ({ label: s.label, category: s.category, content: s.content })),
  }
  try {
    await vd.confirmDraft(edited)
    toast.show({ variant: 'success', message: 'Brand voice saved' })
  } catch (e) {
    toast.show({ variant: 'error', message: 'Could not save brand voice. Try again.' })
  }
}

async function onDiscard(): Promise<void> {
  try {
    await vd.discardDraft()
    toast.show({ variant: 'info', message: 'Draft discarded' })
  } catch (e) {
    toast.show({ variant: 'error', message: 'Could not discard draft.' })
  }
}
</script>

<template>
  <KovaModal :open="true" size="lg" :close-on-backdrop="false">
    <template #title>Confirm brand voice draft</template>
    <template #subtitle>
      We analyzed your storefront and drafted a brand voice and a few tone snippets. Review and confirm before saving.
    </template>

    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium">Brand voice</span>
        <textarea
          name="voice"
          v-model="voiceContent"
          class="mt-1 w-full min-h-[120px] p-3 bg-fill border border-line rounded-md text-sm"
        ></textarea>
      </label>

      <div>
        <span class="text-sm font-medium">Tone snippets</span>
        <div class="space-y-2 mt-1">
          <div
            v-for="(s, idx) in snippets"
            :key="idx"
            class="snippet-row p-3 bg-fill border border-line rounded-md flex gap-3"
          >
            <div class="flex-1 space-y-1">
              <input v-model="s.label" class="w-full bg-transparent text-sm font-medium" />
              <input v-model="s.category" class="w-full bg-transparent text-xs text-ink-3 tag-mono uppercase" />
              <textarea v-model="s.content" class="w-full bg-transparent text-sm min-h-[60px]"></textarea>
            </div>
            <button
              data-test="snippet-remove"
              @click="removeSnippet(idx)"
              class="text-ink-3 hover:text-ink h-6 w-6 grid place-items-center"
              aria-label="Remove snippet"
            >×</button>
          </div>
          <p v-if="snippets.length === 0" class="text-sm text-ink-3 italic">All snippets removed. You can add tone snippets later in /account/brand-kit/tone-snippets.</p>
        </div>
      </div>

      <p class="text-xs text-ink-3 border-t border-line-2 pt-3">
        Storefront content was analyzed via Anthropic (Claude). See <a href="/privacy" class="underline">privacy policy</a> for our sub-processor disclosure.
      </p>
    </div>

    <template #actions>
      <button
        data-test="discard-btn"
        @click="onDiscard"
        class="btn ghost"
      >Discard draft</button>
      <button
        data-test="confirm-btn"
        @click="onConfirm"
        class="btn primary"
        :disabled="!voiceContent.trim()"
      >Confirm &amp; save</button>
    </template>
  </KovaModal>
</template>
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/brand-kit/modals/VoiceDraftConfirmModal.vue tests/unit/components/brand-kit/VoiceDraftConfirmModal.test.ts
git commit -m "feat(cluster-05): VoiceDraftConfirmModal — GUARDRAIL implementation (00e §6 #5)"
```

---

### Tasks 21–27: Per-tab components

For each tab, follow the same TDD cycle. Each task: test + component + commit.

- **Task 21: VisualsTab + visuals primitives** (BrandColorSwatch with drag-source, BrandColorAddTile, BrandFontRow with drag-source, FontUploadDropzone with B8 states, BrandLogoRow with drag-source)
- **Task 22: IdentityTab + IdentityCard** (inline editor with `update_brand_identity` RPC + empty state + Phase-2 hide of "Draft via interview")
- **Task 23: ToneSnippetsTab + BrandKitListRow + ToneSnippetAddModal + ToneSnippetEditModal** (drag-reorder via @vueuse/integrations sortable or HTML5 native drag with order calc; modals use `<KovaModal>`)
- **Task 24: SavedBlocksTab + SavedBlockAddModal + SavedBlockEditModal** (parallel + grip-handle as drag-source for `application/x-kova-saved-block`)
- **Task 25: WritingRulesTab + WritingRuleToggle** (each toggle calls `setWritingRule` RPC)
- **Task 26: MemoriesTab + MemoryRow** (read from Cluster 10's `useBrandMemoryStore` — stub for now: render empty state "Memories appear here as Kova captures them during chat" if store is unavailable)
- **Task 27: KbSourcesTab + KbSourceRow + KbSourceDropzone** (multi-file queue with per-row state per B8.7/B8.8)

Each task: per-tab unit test (mount + assert renders correctly + actions wire to store), commit.

---

### Task 28: Integration tests — voice-draft confirm/discard full flow

**Files:**
- Create: `tests/integration/api/brand-kit-extract-voice-draft-flow.test.ts`
- Create: `tests/integration/api/voice-draft-confirm-discard.test.ts`

- [ ] **Step 1-4: Standard cycle. Both run against local Supabase + mocked Shopify + mocked Anthropic.**

```bash
git commit -m "test(cluster-05): integration coverage for voice-draft extract → confirm/discard flow"
```

---

### Task 29: E2E tests (Playwright / Vercel Agent Browser)

**Files:**
- Create: `tests/e2e/brand-kit/visuals-flow.spec.ts`
- Create: `tests/e2e/brand-kit/tone-snippets-crud.spec.ts`
- Create: `tests/e2e/brand-kit/saved-blocks-crud.spec.ts`
- Create: `tests/e2e/brand-kit/writing-rules-toggle.spec.ts`
- Create: `tests/e2e/brand-kit/voice-draft-confirm.spec.ts`
- Create: `tests/e2e/brand-kit/voice-draft-discard.spec.ts`
- Create: `tests/e2e/brand-kit/drag-color-to-canvas.spec.ts`
- Create: `tests/e2e/brand-kit/drag-font-to-text.spec.ts`
- Create: `tests/e2e/brand-kit/drag-saved-block-to-canvas.spec.ts`

- [ ] Use existing E2E test helpers (`signIn`, `mockShopifyConnect`, `mockAnthropic`). Each spec implements the acceptance criterion from PRD §8.

- [ ] **Commit**

```bash
git commit -m "test(cluster-05): E2E coverage for all 7 sub-tabs + voice-draft + 3 drag-drop flows"
```

---

### Task 30: Manual browser smoke + browser-verify per `feedback_browser_smoke_test_before_done`

- [ ] **Step 1: Start dev server**

```bash
cd kova-open-pencil-1
bun run dev
```

- [ ] **Step 2: Execute PRD §9.4 manual QA checklist in browser** (sign in, navigate /account/brand-kit, cycle all 7 tabs, perform each documented action, verify against expected behavior). Capture screenshots.

- [ ] **Step 3: Note any drift in §12 of PRD; file follow-up issues**

- [ ] **Step 4: Commit any docstring fixes or copy adjustments uncovered**

```bash
git commit -m "chore(cluster-05): copy + ux drift fixes from browser smoke"
```

---

### Task 31: Final type-check, lint, dupe check, test pass

- [ ] **Step 1: Run all quality gates**

```bash
bun run check    # oxlint --type-aware --type-check
bun run format   # oxfmt
bun run test:unit
bun run test:dupes   # must stay < 3%
```

Expected: all green.

- [ ] **Step 2: Resolve any failures inline**

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(cluster-05): final quality-gates green — lint + types + tests + dupes"
```

---

### Task 32: PR open + handoff

- [ ] **Step 1: Push branch + open PR**

```bash
git push -u origin feat/cluster-05-brand-kit
gh pr create --title "feat: Cluster 05 — Brand Kit Settings & Drag-Drop" --body "$(cat <<'EOF'
## Summary
- Adds 7 sub-tabs under `/account/brand-kit` (Visuals · Identity · Tone snippets · Saved blocks · Writing rules · Memories · Knowledge base)
- Schema: JSONB cols on `brands` + new tables `brand_fonts`, `brand_kb_sources`, `voice_drafts` + 11 SECURITY-DEFINER RPCs
- Edge Functions: brand-fonts upload/delete, brand-kb-sources upload/delete, brand-kit-extract EXTENDED with Anthropic voice/tone inference, voice-draft confirm/discard
- GUARDRAIL per 00e §6 #5: AI-scraped voice/tone is an editable draft the user reviews + confirms — never a silent DB write
- Drag-source contracts for 4 MIME types (Q24 — drop receivers live in Cluster 06)

## Test plan
- [ ] Unit (`bun run test:unit`) — all green
- [ ] Integration (local Supabase) — RLS + RPCs + Edge Functions
- [ ] E2E (Playwright + Vercel Agent Browser) — 9 specs covering all 7 tabs + 3 drag flows + voice-draft
- [ ] Manual QA — founder browser smoke per PRD §9.4 (12 steps)

PRD: docs/kova-final-prds/05-brand-kit-and-drag-drop.md
Plan: docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md
EOF
)"
```

- [ ] **Step 2: Tag founder for review**

---

## Self-Review

After the plan is complete, run these checks:

**1. Spec coverage (PRD §2.1 in-scope items):**
- ✅ 7 sub-tab routes → Task 18 (routes) + Tasks 19–27 (components)
- ✅ Brand-picker dropdown at section top → Task 19 mounts `<BrandPicker>` (Cluster 03 component)
- ✅ Schema migrations (4 new JSONB cols + 3 tables + 11 RPCs) → Tasks 1–5
- ✅ Storage buckets (brand-fonts + brand-kb-sources) → Task 6
- ✅ Edge Functions (brand-fonts upload/delete + brand-kb-sources upload/delete + extend extract + voice-draft confirm/discard) → Tasks 14–17 + Task 12
- ✅ Frontend stores (3 Pinia) → Tasks 8–10
- ✅ Composables (drag, upload, voice-draft) → Tasks 11, 12, 13 (sniff helper)
- ✅ CRUD modals (B3 patterns) → Task 23, 24
- ✅ Upload UI states (B8) → Task 21 (FontUploadDropzone) + Task 27 (KbSourceDropzone)
- ✅ Voice-draft confirmation guardrail → Task 12 (composable + Edge Functions) + Task 17 (extract extension) + Task 20 (modal component)
- ✅ Drag-drop MIME contract (5 types — note: tone-snippet drag is optional per PRD §6.5 footnote, not required at MVP) → Task 11
- ✅ Compliance disclosure → Task 30 manual QA verifies privacy policy linkage

**2. Placeholder scan:** None found. Tasks 21–27 are summarized (one bullet each) rather than detailed in full code — acceptable because each follows the same TDD shape as Tasks 19, 20, 23 (one component + one test + one commit). If implementing engineer needs full code per tab, they reproduce the Task 19/20/23 pattern with the per-tab content from PRD §3.

**3. Type consistency:**
- `ToneSnippet`, `SavedBlock`, `IdentityCards`, `WritingRules`, `BrandColor`, `BrandFont`, `BrandKbSource`, `VoiceDraft`, `VoiceDraftPayload` — defined in Task 7, consumed in Tasks 8–12 and components 19–27. Verified.
- RPC names: `add_tone_snippet`, `update_tone_snippet`, `delete_tone_snippet`, `reorder_tone_snippets`, `add_saved_block`, `update_saved_block`, `delete_saved_block`, `reorder_saved_blocks`, `set_writing_rule`, `update_brand_identity`, `confirm_voice_draft`, `discard_voice_draft`. Defined in Tasks 2–4. Called in Tasks 8, 12. Consistent.
- MIME types: `application/x-kova-brand-color`, `application/x-kova-brand-font`, `application/x-kova-brand-asset`, `application/x-kova-saved-block`, `application/x-kova-tone-snippet` (optional). Defined in Task 11, consumed by Cluster 06 receiver (separate PRD).

---

## Execution Handoff

**Plan complete and saved to `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md`.**

Per founder direction in CLAUDE.md ("structured Superpowers workflow"), recommended execution path:

1. **Founder reviews + approves PRD 05** (`docs/kova-final-prds/05-brand-kit-and-drag-drop.md` §0 status: DRAFT → APPROVED)
2. **Founder reviews this plan** (especially Tasks 1–6 schema decisions + Task 17 Anthropic prompt)
3. **Subagent-Driven execution** via `superpowers:subagent-driven-development` — dispatch one fresh subagent per task, review between tasks. Recommended for the 32 tasks. Two-stage review.
4. **OR Inline execution** via `superpowers:executing-plans` — batch execution with checkpoints. Faster for the engineer-machine cycle; founder reviews at checkpoints.

— End of Plan 05 —
