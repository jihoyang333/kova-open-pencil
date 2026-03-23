# M4: Brand Kit & Media Library — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a brand settings page, media library with upload/browse/place-on-canvas, a new-client dialog, and a brand-kit formatting utility for AI prompt injection.

**Architecture:** Phase 4.1 delivers brand management UI (settings page, new-client dialog, format utility). Phase 4.2 delivers media library (Supabase storage + Pinia store, dashboard page, editor floating panel). All dashboard UI uses light theme. Editor panel follows Figma's floating panel pattern. Media images are placed on canvas via `placeImageFiles(File[])` which handles decoding, sizing, and undo internally.

**Tech Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Pinia (composition stores), Reka UI (Dialog, Popover, Tabs), Tailwind CSS 4, Supabase (Postgres + Storage), bun:test, @vueuse/core (watchDebounced, useFileDialog)

**Working directory:** All paths relative to `kova-open-pencil-1/`. All commands run from `kova-open-pencil-1/`.

**Spec:** `docs/superpowers/specs/2026-03-22-m4-brand-kit-media-library-design.md`

---

## File Structure

### New Files (14)

| File | Lines | Responsibility |
|------|-------|---------------|
| `src/types/kova/media.ts` | ~30 | MediaAsset interface, MEDIA_ACCEPTED_TYPES, MEDIA_MAX_SIZE_BYTES |
| `supabase/migrations/20260322_m4_media.sql` | ~40 | media table, media-assets bucket, RLS, brands.url column |
| `src/utils/format-brand-prompt.ts` | ~50 | Pure function: Brand → structured prompt string |
| `tests/unit/utils/format-brand-prompt.test.ts` | ~80 | 6 tests, 100% coverage |
| `src/stores/media.ts` | ~140 | Pinia store: fetchImages, uploadImage, uploadImageFromUrl, deleteImage, getPublicUrl |
| `tests/unit/stores/media.test.ts` | ~100 | 8 tests, mock Supabase (same pattern as brands.test.ts) |
| `src/components/brand/BrandColorPicker.vue` | ~80 | Light-themed color picker (Reka UI Popover + native color input) |
| `src/views/dashboard/BrandSettingsView.vue` | ~280 | Two-column settings page with auto-save |
| `src/components/dashboard/NewClientDialog.vue` | ~150 | Create brand modal (Reka UI Dialog, name + optional URL) |
| `src/components/media/MediaCard.vue` | ~120 | Image card with hover overlay (select + delete) |
| `src/components/media/MediaGrid.vue` | ~180 | Reusable grid with density prop + search filtering |
| `src/components/media/UploadDialog.vue` | ~200 | Upload via drag-drop or URL (Reka UI Dialog + Tabs) |
| `src/components/media/MediaLibraryPanel.vue` | ~200 | Floating editor panel (z-30, right side) |
| `tests/unit/components/new-client-dialog.test.ts` | ~60 | 4 tests: name-only, name+URL, validation, loading |

### Modified Files (8)

| File | Change |
|------|--------|
| `src/types/kova/database.ts` | Add `url: string \| null` to Brand interface |
| `src/router.ts` | Add BrandSettingsView route before `:brandId` catch-all |
| `src/views/DashboardView.vue` | Update heading computed for `/settings` path |
| `src/stores/brands.ts` | Persist `url` in createBrandFull, cleanup media on brand delete |
| `src/components/dashboard/BrandList.vue` | Replace inline input with NewClientDialog trigger + settings link |
| `src/views/dashboard/BrandAssetsView.vue` | Replace 14-line stub with full media library page |
| `src/views/EditorView.vue` | Add showMediaPanel ref + MediaLibraryPanel render |
| `src/components/Toolbar.vue` | Add media library toggle button (icon-lucide-image) |

### Parallelism (Execution Waves)

| Wave | Tasks | Can run in parallel |
|------|-------|-------------------|
| 1 | Tasks 1, 2, 3 | Yes — types, migration, format utility are independent |
| 2 | Tasks 4, 5 | Yes — media store and color picker are independent |
| 3 | Tasks 6, 7, 8 | Partially — router (6) before settings page (7); dialog (8) independent |
| 4 | Tasks 9, 10, 11 | Yes — MediaCard, MediaGrid, UploadDialog are independent |
| 5 | Tasks 12, 13 | Yes — dashboard page and editor panel are independent |
| 6 | Task 14 | Sequential — toolbar depends on EditorView changes |

---

## Chunk 1: Foundation — Types, Migration, Format Utility

### Task 1: Media Types & Brand URL Type

**Files:**
- Create: `src/types/kova/media.ts`
- Modify: `src/types/kova/database.ts`

- [ ] **Step 1: Create media types file**

Create `src/types/kova/media.ts`:

```ts
export interface MediaAsset {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly file_name: string
  readonly file_type: string
  readonly file_size: number
  readonly storage_path: string
  readonly created_at: string
}

export const MEDIA_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const

export type MediaAcceptedType = (typeof MEDIA_ACCEPTED_TYPES)[number]

export const MEDIA_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const MEDIA_ACCEPT_STRING = MEDIA_ACCEPTED_TYPES.join(',')
```

- [ ] **Step 2: Add url field to Brand interface**

In `src/types/kova/database.ts`, add `url: string | null` to the Brand interface after `industry`:

```ts
// Add to Brand interface:
url: string | null
```

- [ ] **Step 3: Verify types compile**

Run: `bun run check`
Expected: No type errors from the new/modified files.

- [ ] **Step 4: Commit**

```bash
git add src/types/kova/media.ts src/types/kova/database.ts
git commit -m "feat(m4): add MediaAsset types and Brand.url field"
```

---

### Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260322_m4_media.sql`

**Reference:** Existing migration pattern at `supabase/migrations/20260317_m2_dashboard.sql` — uses `CREATE TABLE IF NOT EXISTS`, per-operation RLS policies, storage bucket with user-scoped object policies.

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/20260322_m4_media.sql`:

```sql
-- M4: Brand Kit & Media Library
-- Adds media table, media-assets storage bucket, and brands.url column

-- 1. Add url column to brands
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS url TEXT;

-- 2. Media table
CREATE TABLE IF NOT EXISTS public.media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_size   INT  NOT NULL,
  storage_path TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS: per-operation policies (matches brands/canvases pattern)
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_select ON public.media FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY media_insert ON public.media FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY media_update ON public.media FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY media_delete ON public.media FOR DELETE
  USING (user_id = auth.uid());

-- 4. Index for common query pattern (list media by brand)
CREATE INDEX IF NOT EXISTS idx_media_brand_id ON public.media(brand_id);

-- 5. Storage bucket for media assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-assets', 'media-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage object policies (user-scoped via folder path)
CREATE POLICY media_assets_select ON storage.objects FOR SELECT
  USING (bucket_id = 'media-assets');
CREATE POLICY media_assets_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_assets_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'media-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY media_assets_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'media-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `bunx supabase db push` (or use the Supabase MCP `apply_migration` tool)
Expected: Migration applies without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260322_m4_media.sql
git commit -m "feat(m4): add media table, storage bucket, and brands.url column"
```

---

### Task 3: Brand Kit Formatting Utility (TDD)

**Files:**
- Create: `tests/unit/utils/format-brand-prompt.test.ts`
- Create: `src/utils/format-brand-prompt.ts`

**Reference:** Test patterns from `tests/unit/stores/brands.test.ts` — uses `bun:test` (describe, test, expect, beforeEach).

- [ ] **Step 1: Write failing tests**

Create `tests/unit/utils/format-brand-prompt.test.ts`:

```ts
import { describe, test, expect } from 'bun:test'
import { formatBrandKitPrompt } from '@/utils/format-brand-prompt'
import type { Brand } from '@/types/kova/database'

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    user_id: 'u1',
    name: 'TestBrand',
    colors: { primary: '#FF0000', secondary: '#00FF00', accent: '#0000FF', background: '#FFFFFF' },
    fonts: { heading: 'Montserrat', body: 'Open Sans' },
    logo_url: 'https://example.com/logo.png',
    voice: 'Professional and friendly',
    industry: 'Technology',
    url: 'https://example.com',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('formatBrandKitPrompt', () => {
  test('formats complete brand with all fields', () => {
    const result = formatBrandKitPrompt(makeBrand())

    expect(result).toContain('## Brand Kit: TestBrand')
    expect(result).toContain('primary: #FF0000')
    expect(result).toContain('secondary: #00FF00')
    expect(result).toContain('accent: #0000FF')
    expect(result).toContain('background: #FFFFFF')
    expect(result).toContain('heading: Montserrat')
    expect(result).toContain('body: Open Sans')
    expect(result).toContain('Professional and friendly')
    expect(result).toContain('Technology')
  })

  test('omits colors section when colors is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ colors: null }))

    expect(result).toContain('## Brand Kit: TestBrand')
    expect(result).not.toContain('**Colors:**')
    expect(result).toContain('**Fonts:**')
  })

  test('omits fonts section when fonts is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ fonts: null }))

    expect(result).not.toContain('**Fonts:**')
    expect(result).toContain('**Colors:**')
  })

  test('omits voice section when voice is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ voice: null }))

    expect(result).not.toContain('**Voice:**')
  })

  test('omits industry section when industry is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ industry: null }))

    expect(result).not.toContain('**Industry:**')
  })

  test('returns only header when all optional fields are null', () => {
    const result = formatBrandKitPrompt(
      makeBrand({ colors: null, fonts: null, voice: null, industry: null })
    )

    expect(result).toBe('## Brand Kit: TestBrand')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/utils/format-brand-prompt.test.ts`
Expected: FAIL — module `@/utils/format-brand-prompt` not found.

- [ ] **Step 3: Implement the formatting utility**

Create `src/utils/format-brand-prompt.ts`:

```ts
import type { Brand } from '@/types/kova/database'

/**
 * Formats a brand's profile data into a structured text block
 * for injection into the AI system prompt.
 *
 * Omits sections where values are null/empty.
 * Pure function — no side effects.
 */
export function formatBrandKitPrompt(brand: Brand): string {
  const sections: string[] = [`## Brand Kit: ${brand.name}`]

  if (brand.colors) {
    const { primary, secondary, accent, background } = brand.colors
    sections.push(
      `**Colors:** primary: ${primary}, secondary: ${secondary}, accent: ${accent}, background: ${background}`
    )
  }

  if (brand.fonts) {
    sections.push(`**Fonts:** heading: ${brand.fonts.heading}, body: ${brand.fonts.body}`)
  }

  if (brand.voice) {
    sections.push(`**Voice:** ${brand.voice}`)
  }

  if (brand.industry) {
    sections.push(`**Industry:** ${brand.industry}`)
  }

  return sections.join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/utils/format-brand-prompt.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 5: Run lint/typecheck**

Run: `bun run check`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/format-brand-prompt.ts tests/unit/utils/format-brand-prompt.test.ts
git commit -m "feat(m4): add brand kit formatting utility with tests"
```

---

## Chunk 2: Stores & Picker — Media Store, BrandColorPicker

### Task 4: Media Store (TDD)

**Files:**
- Create: `tests/unit/stores/media.test.ts`
- Create: `src/stores/media.ts`
- Modify: `src/stores/brands.ts`

**Reference:** `src/stores/brands.ts` for Pinia composition pattern, `tests/unit/stores/brands.test.ts` for mock setup.

- [ ] **Step 1: Write failing tests for media store**

Create `tests/unit/stores/media.test.ts`:

```ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// --- Supabase mocks ---
const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  remove: mock(() => Promise.resolve({ error: null })),
  getPublicUrl: mock(() => ({ data: { publicUrl: 'https://cdn.example.com/img.png' } })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
      getSession: mock(() =>
        Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
      ),
    },
  },
}))

// Must import AFTER mock.module
const { useMediaStore } = await import('@/stores/media')
const { useAuthStore } = await import('@/stores/auth')

describe('media store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as any
  })

  const sampleMedia = {
    id: 'm1',
    user_id: 'user-1',
    brand_id: 'b1',
    file_name: 'hero.png',
    file_type: 'image/png',
    file_size: 102400,
    storage_path: 'user-1/b1/1711100000000-hero.png',
    created_at: '2026-03-22T00:00:00Z',
  }

  test('fetchImages loads media for a brand', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [sampleMedia], error: null }),
        }),
      }),
    })

    const store = useMediaStore()
    await store.fetchImages('b1')
    expect(store.images).toContainEqual(sampleMedia)
  })

  test('fetchImages replaces existing images', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [sampleMedia], error: null }),
        }),
      }),
    })

    const store = useMediaStore()
    await store.fetchImages('b1')
    expect(store.images).toHaveLength(1)

    const second = { ...sampleMedia, id: 'm2', file_name: 'second.png' }
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [second], error: null }),
        }),
      }),
    })
    await store.fetchImages('b1')
    expect(store.images).toHaveLength(1)
    expect(store.images[0].id).toBe('m2')
  })

  test('uploadImage validates file type', async () => {
    const store = useMediaStore()
    const badFile = new File(['x'], 'test.txt', { type: 'text/plain' })
    await expect(store.uploadImage('b1', badFile)).rejects.toThrow('File type not accepted')
  })

  test('uploadImage validates file size', async () => {
    const store = useMediaStore()
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await expect(store.uploadImage('b1', bigFile)).rejects.toThrow('File too large')
  })

  test('uploadImage uploads to storage and inserts record', async () => {
    mockStorageFrom.mockReturnValueOnce({
      upload: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleMedia, error: null }),
        }),
      }),
    })

    const store = useMediaStore()
    const file = new File(['pixels'], 'hero.png', { type: 'image/png' })
    const result = await store.uploadImage('b1', file)
    expect(result).toEqual(sampleMedia)
    expect(store.images).toContainEqual(sampleMedia)
  })

  test('deleteImage removes from storage and DB', async () => {
    const store = useMediaStore()
    // Seed the store
    store.images = [sampleMedia]

    mockStorageFrom.mockReturnValueOnce({
      remove: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.deleteImage(sampleMedia)
    expect(store.images).toHaveLength(0)
  })

  test('getPublicUrl returns public URL for storage path', () => {
    mockStorageFrom.mockReturnValueOnce({
      getPublicUrl: mock(() => ({
        data: { publicUrl: 'https://cdn.example.com/img.png' },
      })),
    })

    const store = useMediaStore()
    const url = store.getPublicUrl('user-1/b1/hero.png')
    expect(url).toBe('https://cdn.example.com/img.png')
  })

  test('isLoading is true during fetchImages', async () => {
    let resolveQuery: (v: any) => void = () => {}
    const pending = new Promise((r) => { resolveQuery = r })

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => pending,
        }),
      }),
    })

    const store = useMediaStore()
    const fetchPromise = store.fetchImages('b1')
    expect(store.isLoading).toBe(true)
    resolveQuery({ data: [], error: null })
    await fetchPromise
    expect(store.isLoading).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/stores/media.test.ts`
Expected: FAIL — module `@/stores/media` not found.

- [ ] **Step 3: Implement media store**

Create `src/stores/media.ts`:

```ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/use-toast'
import { MEDIA_ACCEPTED_TYPES, MEDIA_MAX_SIZE_BYTES } from '@/types/kova/media'
import type { MediaAsset, MediaAcceptedType } from '@/types/kova/media'

export const useMediaStore = defineStore('media', () => {
  const images = ref<MediaAsset[]>([])
  const isLoading = ref(false)

  async function fetchImages(brandId: string): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (error) throw error
      images.value = data ?? []
    } catch (e) {
      toast.show('Failed to load media', 'error')
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  async function uploadImage(brandId: string, file: File): Promise<MediaAsset> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    if (!MEDIA_ACCEPTED_TYPES.includes(file.type as MediaAcceptedType)) {
      throw new Error('File type not accepted')
    }
    if (file.size > MEDIA_MAX_SIZE_BYTES) {
      throw new Error('File too large (max 5 MB)')
    }

    const storagePath = `${userId}/${brandId}/${Date.now()}-${sanitizeFilename(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from('media-assets')
      .upload(storagePath, file)
    if (uploadError) throw uploadError

    const { data, error: insertError } = await supabase
      .from('media')
      .insert({
        user_id: userId,
        brand_id: brandId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (insertError) throw insertError

    images.value = [data, ...images.value]
    return data as MediaAsset
  }

  async function uploadImageFromUrl(brandId: string, url: string): Promise<MediaAsset> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)

    const blob = await response.blob()
    const filename = url.split('/').pop() ?? 'image'
    const file = new File([blob], filename, { type: blob.type })
    return uploadImage(brandId, file)
  }

  async function deleteImage(asset: MediaAsset): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from('media-assets')
      .remove([asset.storage_path])
    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('media')
      .delete()
      .eq('id', asset.id)
    if (dbError) throw dbError

    images.value = images.value.filter((img) => img.id !== asset.id)
  }

  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from('media-assets').getPublicUrl(storagePath)
    return data.publicUrl
  }

  return {
    images,
    isLoading,
    fetchImages,
    uploadImage,
    uploadImageFromUrl,
    deleteImage,
    getPublicUrl,
  }
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/stores/media.test.ts`
Expected: 8 tests PASS.

- [ ] **Step 5: Update brands store — persist url, media cleanup on delete**

In `src/stores/brands.ts`:

1. In `createBrandFull()`: ensure the `url` field from input is inserted into the brands table alongside other fields.

2. In `deleteBrand()`: before deleting the brand, fetch all media records for that brand and delete their storage files:

```ts
// Add to deleteBrand, before the existing delete logic:
const { data: mediaRows } = await supabase
  .from('media')
  .select('storage_path')
  .eq('brand_id', id)

if (mediaRows?.length) {
  const paths = mediaRows.map((r) => r.storage_path)
  await supabase.storage.from('media-assets').remove(paths)
}
// DB rows cascade-delete via FK, but storage files need manual cleanup
```

- [ ] **Step 6: Run lint/typecheck**

Run: `bun run check`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/stores/media.ts tests/unit/stores/media.test.ts src/stores/brands.ts
git commit -m "feat(m4): add media store with upload/delete/fetch and brand media cleanup"
```

---

### Task 5: BrandColorPicker Component

**Files:**
- Create: `src/components/brand/BrandColorPicker.vue`

**Reference:** Existing dark-themed `src/components/onboarding/ColorPicker.vue` (88 lines) — same structure but light theme colors.

- [ ] **Step 1: Create BrandColorPicker**

Create `src/components/brand/BrandColorPicker.vue`:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'

const props = defineProps<{
  modelValue: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const hexInput = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    hexInput.value = v
  }
)

function applyHexInput(): void {
  const cleaned = hexInput.value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    emit('update:modelValue', cleaned)
  } else {
    hexInput.value = props.modelValue
  }
}

function handleNativeChange(e: Event): void {
  const value = (e.target as HTMLInputElement).value
  hexInput.value = value
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <label class="text-sm font-medium text-gray-700">{{ label }}</label>
    <PopoverRoot>
      <PopoverTrigger as-child>
        <button
          :data-test-id="`brand-color-${label.toLowerCase()}`"
          class="size-8 rounded-lg border border-gray-300 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          :style="{ backgroundColor: modelValue }"
          :aria-label="`Pick ${label} color`"
        />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          class="z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          :side-offset="8"
        >
          <input
            type="color"
            :value="modelValue"
            class="mb-2 h-20 w-30 cursor-pointer"
            @input="handleNativeChange"
          />
          <input
            v-model="hexInput"
            data-test-id="brand-color-hex-input"
            type="text"
            placeholder="#000000"
            maxlength="7"
            class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
            @keydown.enter="applyHexInput"
            @blur="applyHexInput"
          />
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
```

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/BrandColorPicker.vue
git commit -m "feat(m4): add light-themed BrandColorPicker component"
```

---

## Chunk 3: Brand Kit UI — Router, Settings Page, New Client Dialog

### Task 6: Router & Dashboard Heading Updates

**Files:**
- Modify: `src/router.ts`
- Modify: `src/views/DashboardView.vue`

- [ ] **Step 1: Add BrandSettingsView route**

In `src/router.ts`, add a new child route under the dashboard parent. It must appear **before** the `:brandId` catch-all to prevent route shadowing:

```ts
// Add this route BEFORE the existing { path: ':brandId', ... } route:
{
  path: ':brandId/settings',
  name: 'BrandSettings',
  component: () => import('@/views/dashboard/BrandSettingsView.vue'),
},
```

- [ ] **Step 2: Update dashboard heading computed**

In `src/views/DashboardView.vue`, update the `heading` computed to handle the `/settings` path. Current logic (around line 14):

```ts
const heading = computed(() => {
  if (route.path.endsWith('/trash')) return 'Trash'
  const brand = brandsStore.selectedBrand
  if (route.path.endsWith('/assets')) return brand ? `${brand.name} › Assets` : 'Brand Assets'
  return brand?.name ?? 'Dashboard'
})
```

Add a settings check:

```ts
const heading = computed(() => {
  if (route.path.endsWith('/trash')) return 'Trash'
  const brand = brandsStore.selectedBrand
  if (route.path.endsWith('/settings'))
    return brand ? `${brand.name} › Settings` : 'Brand Settings'
  if (route.path.endsWith('/assets'))
    return brand ? `${brand.name} › Assets` : 'Brand Assets'
  return brand?.name ?? 'Dashboard'
})
```

- [ ] **Step 3: Verify routing works**

Run: `bun run check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/router.ts src/views/DashboardView.vue
git commit -m "feat(m4): add brand settings route and dashboard heading"
```

---

### Task 7: Brand Settings Page

**Files:**
- Create: `src/views/dashboard/BrandSettingsView.vue`

**Reference:** Design spec section 4.1.1. Two-column layout, auto-save on blur/change with `watchDebounced(500ms)`. Uses existing `useBrandsStore` for persistence and `BrandColorPicker` for color fields.

**Important patterns:**
- `watchDebounced` from `@vueuse/core` (already used in `EditorView.vue:82`)
- `toast.show()` from `@/composables/use-toast`
- Brand data loaded from `useBrandsStore().selectedBrand`
- Immutable updates: create new objects, never mutate

- [ ] **Step 1: Create BrandSettingsView**

Create `src/views/dashboard/BrandSettingsView.vue` (~280 lines). Key structure:

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { useBrandsStore } from '@/stores/brands'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/composables/use-toast'
import BrandColorPicker from '@/components/brand/BrandColorPicker.vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const brandId = computed(() => route.params.brandId as string)
const brand = computed(() => brandsStore.selectedBrand)

// --- Local form state (initialized from brand, auto-saved on change) ---
const name = ref('')
const url = ref('')
const voice = ref('')
const industry = ref('')
const primaryColor = ref('#000000')
const secondaryColor = ref('#000000')
const accentColor = ref('#000000')
const backgroundColor = ref('#FFFFFF')
const headingFont = ref('')
const bodyFont = ref('')

// Sync local state when brand changes (e.g. navigation or extraction)
watch(brand, (b) => {
  if (!b) return
  name.value = b.name
  url.value = b.url ?? ''
  voice.value = b.voice ?? ''
  industry.value = b.industry ?? ''
  primaryColor.value = b.colors?.primary ?? '#000000'
  secondaryColor.value = b.colors?.secondary ?? '#000000'
  accentColor.value = b.colors?.accent ?? '#000000'
  backgroundColor.value = b.colors?.background ?? '#FFFFFF'
  headingFont.value = b.fonts?.heading ?? ''
  bodyFont.value = b.fonts?.body ?? ''
}, { immediate: true })

// --- Auto-save with debounce ---
const formSnapshot = computed(() => ({
  name: name.value,
  url: url.value || null,
  voice: voice.value || null,
  industry: industry.value || null,
  colors: {
    primary: primaryColor.value,
    secondary: secondaryColor.value,
    accent: accentColor.value,
    background: backgroundColor.value,
  },
  fonts: {
    heading: headingFont.value || '',
    body: bodyFont.value || '',
  },
}))

let initialSnapshot = ''
watch(brand, (b) => {
  if (b) initialSnapshot = JSON.stringify(formSnapshot.value)
}, { immediate: true })

watchDebounced(
  formSnapshot,
  async (snapshot) => {
    if (!brand.value) return
    if (JSON.stringify(snapshot) === initialSnapshot) return
    try {
      await brandsStore.updateBrand(brand.value.id, snapshot)
      initialSnapshot = JSON.stringify(snapshot)
      toast.show('Saved')
    } catch {
      toast.show('Failed to save', 'error')
    }
  },
  { debounce: 500, deep: true }
)

// --- Re-extract ---
const showReExtractDialog = ref(false)
const isExtracting = ref(false)

async function confirmReExtract(): Promise<void> {
  if (!brand.value?.url) return
  isExtracting.value = true
  showReExtractDialog.value = false
  try {
    const res = await fetch('/api/extract-brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: brand.value.url }),
    })
    if (!res.ok) throw new Error('Extraction failed')
    const data = await res.json()

    // Map extraction response to brand fields
    if (data.colors) {
      primaryColor.value = data.colors.primary ?? primaryColor.value
      secondaryColor.value = data.colors.secondary ?? secondaryColor.value
      accentColor.value = data.colors.accent ?? accentColor.value
      backgroundColor.value = data.colors.background ?? backgroundColor.value
    }
    if (data.fonts) {
      headingFont.value = data.fonts.heading ?? headingFont.value
      bodyFont.value = data.fonts.body ?? bodyFont.value
    }
    if (data.writing_style) {
      voice.value = data.writing_style
    }
    toast.show('Brand data re-extracted')
  } catch {
    toast.show('Extraction failed', 'error')
  } finally {
    isExtracting.value = false
  }
}

// --- Logo upload ---
const logoPreviewUrl = ref(brand.value?.logo_url ?? '')
watch(brand, (b) => {
  logoPreviewUrl.value = b?.logo_url ?? ''
}, { immediate: true })

async function handleLogoUpload(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !brand.value) return

  // Revoke old blob URL if any
  if (logoPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(logoPreviewUrl.value)
  }

  // Show preview immediately
  logoPreviewUrl.value = URL.createObjectURL(file)

  try {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${userId}/${brand.value.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(path)
    await brandsStore.updateBrand(brand.value.id, { logo_url: urlData.publicUrl })
    toast.show('Logo updated')
  } catch {
    toast.show('Failed to upload logo', 'error')
  }
}

function goBack(): void {
  void router.push(`/dashboard/${brandId.value}`)
}
</script>

<template>
  <div
    v-if="brand"
    data-test-id="brand-settings-view"
    class="mx-auto max-w-2xl space-y-8 px-6 py-8"
  >
    <!-- Back link -->
    <button
      data-test-id="brand-settings-back"
      class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      @click="goBack"
    >
      <icon-lucide-arrow-left class="size-4" />
      Back to canvases
    </button>

    <!-- Section 1: Brand Identity -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Brand Identity</h2>
      <div class="grid grid-cols-[160px_1fr] items-start gap-4">
        <label class="pt-2 text-sm font-medium text-gray-700">Name</label>
        <input
          v-model="name"
          data-test-id="brand-settings-name"
          type="text"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <label class="pt-2 text-sm font-medium text-gray-700">Website URL</label>
        <div class="flex gap-2">
          <input
            v-model="url"
            data-test-id="brand-settings-url"
            type="url"
            placeholder="https://example.com"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            v-if="url"
            data-test-id="brand-settings-reextract"
            class="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            :disabled="isExtracting"
            @click="showReExtractDialog = true"
          >
            {{ isExtracting ? 'Extracting…' : 'Re-extract' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Section 2: Logo -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Logo</h2>
      <div class="flex items-center gap-4">
        <div
          class="flex size-20 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        >
          <img
            v-if="logoPreviewUrl"
            :src="logoPreviewUrl"
            alt="Brand logo"
            class="size-full object-contain"
          />
          <icon-lucide-image v-else class="size-8 text-gray-300" />
        </div>
        <label
          data-test-id="brand-settings-logo-upload"
          class="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Replace logo
          <input
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleLogoUpload"
          />
        </label>
      </div>
    </section>

    <!-- Section 3: Colors -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Colors</h2>
      <div class="grid grid-cols-2 gap-4">
        <BrandColorPicker v-model="primaryColor" label="Primary" />
        <BrandColorPicker v-model="secondaryColor" label="Secondary" />
        <BrandColorPicker v-model="accentColor" label="Accent" />
        <BrandColorPicker v-model="backgroundColor" label="Background" />
      </div>
    </section>

    <!-- Section 4: Fonts -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Fonts</h2>
      <div class="grid grid-cols-[160px_1fr] items-start gap-4">
        <label class="pt-2 text-sm font-medium text-gray-700">Heading</label>
        <input
          v-model="headingFont"
          data-test-id="brand-settings-heading-font"
          type="text"
          placeholder="e.g. Montserrat"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <label class="pt-2 text-sm font-medium text-gray-700">Body</label>
        <input
          v-model="bodyFont"
          data-test-id="brand-settings-body-font"
          type="text"
          placeholder="e.g. Open Sans"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </section>

    <!-- Section 5: Voice -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Voice</h2>
      <textarea
        v-model="voice"
        data-test-id="brand-settings-voice"
        rows="3"
        placeholder="Describe this brand's tone and voice…"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </section>

    <!-- Section 6: Industry -->
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Industry</h2>
      <input
        v-model="industry"
        data-test-id="brand-settings-industry"
        type="text"
        placeholder="e.g. Technology, Fashion, Food & Beverage"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </section>

    <!-- Re-extract confirmation dialog -->
    <DialogRoot :open="showReExtractDialog" @update:open="showReExtractDialog = $event">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
        >
          <DialogTitle class="text-base font-semibold text-gray-900">
            Re-extract brand data?
          </DialogTitle>
          <DialogDescription class="mt-2 text-sm text-gray-600">
            This will overwrite your current colors, fonts, and voice with fresh data from {{ url }}.
          </DialogDescription>
          <div class="mt-6 flex justify-end gap-3">
            <DialogClose as-child>
              <button
                data-test-id="brand-settings-reextract-cancel"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              data-test-id="brand-settings-reextract-confirm"
              class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              @click="confirmReExtract"
            >
              Re-extract
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
```

**Implementation note:** The `handleLogoUpload` function uploads to the `brand-logos` storage bucket (same pattern as `src/stores/brands.ts:121-143`), shows a blob URL preview immediately, then persists via `updateBrand`. Always revoke old blob URLs to prevent memory leaks.

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 3: Manual test — navigate to `/dashboard/{brandId}/settings`**

Run: `bun run dev`
Verify: Page loads with brand data populated. Edit a field → wait 500ms → see toast "Saved". Navigate away and back → values persist.

- [ ] **Step 4: Commit**

```bash
git add src/views/dashboard/BrandSettingsView.vue
git commit -m "feat(m4): add brand settings page with auto-save"
```

---

### Task 8: New Client Dialog & BrandList Update

**Files:**
- Create: `src/components/dashboard/NewClientDialog.vue`
- Create: `tests/unit/components/new-client-dialog.test.ts`
- Modify: `src/components/dashboard/BrandList.vue`

**Reference:** Reka UI Dialog pattern from `src/components/dashboard/MoveToTrashDialog.vue`. Brand creation via `useBrandsStore().createBrand()` and `createBrandFull()`.

- [ ] **Step 1: Write failing tests for NewClientDialog**

Create `tests/unit/components/new-client-dialog.test.ts`:

```ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// Mock stores
const mockCreateBrand = mock(() => Promise.resolve({ id: 'b1', name: 'Test' }))
const mockCreateBrandFull = mock(() => Promise.resolve({ id: 'b2', name: 'Test' }))

mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({
    createBrand: mockCreateBrand,
    createBrandFull: mockCreateBrandFull,
  }),
}))

mock.module('vue-router', () => ({
  useRouter: () => ({
    push: mock(() => Promise.resolve()),
  }),
}))

const { default: NewClientDialog } = await import(
  '@/components/dashboard/NewClientDialog.vue'
)

describe('NewClientDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCreateBrand.mockClear()
    mockCreateBrandFull.mockClear()
  })

  test('create button is disabled when name is empty', () => {
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    const btn = wrapper.find('[data-test-id="new-client-create"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('calls createBrand with name only when URL is empty', async () => {
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    await wrapper.find('[data-test-id="new-client-name"]').setValue('My Brand')
    await wrapper.find('[data-test-id="new-client-create"]').trigger('click')
    expect(mockCreateBrand).toHaveBeenCalledWith('My Brand')
  })

  test('calls createBrandFull with name and URL when URL is provided', async () => {
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    await wrapper.find('[data-test-id="new-client-name"]').setValue('My Brand')
    await wrapper.find('[data-test-id="new-client-url"]').setValue('https://example.com')
    await wrapper.find('[data-test-id="new-client-create"]').trigger('click')
    expect(mockCreateBrandFull).toHaveBeenCalled()
  })

  test('shows loading state during submission', async () => {
    let resolveCreate: (v: any) => void = () => {}
    mockCreateBrand.mockImplementationOnce(
      () => new Promise((r) => { resolveCreate = r })
    )
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    await wrapper.find('[data-test-id="new-client-name"]').setValue('My Brand')
    await wrapper.find('[data-test-id="new-client-create"]').trigger('click')
    expect(wrapper.find('[data-test-id="new-client-create"]').attributes('disabled')).toBeDefined()
    resolveCreate({ id: 'b1', name: 'My Brand' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/unit/components/new-client-dialog.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create NewClientDialog component**

Create `src/components/dashboard/NewClientDialog.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import { useBrandsStore } from '@/stores/brands'
import { toast } from '@/composables/use-toast'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const brandsStore = useBrandsStore()

const name = ref('')
const url = ref('')
const isSubmitting = ref(false)

function resetForm(): void {
  name.value = ''
  url.value = ''
  isSubmitting.value = false
}

async function handleCreate(): Promise<void> {
  if (!name.value.trim()) return
  isSubmitting.value = true

  try {
    const brand = url.value.trim()
      ? await brandsStore.createBrandFull({
          name: name.value.trim(),
          url: url.value.trim(),
        })
      : await brandsStore.createBrand(name.value.trim())

    emit('update:open', false)
    resetForm()

    if (brand) {
      void router.push(`/dashboard/${brand.id}`)
    }
  } catch {
    toast.show('Failed to create brand', 'error')
  } finally {
    isSubmitting.value = false
  }
}

function handleOpenChange(open: boolean): void {
  emit('update:open', open)
  if (!open) resetForm()
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
      >
        <DialogTitle class="text-base font-semibold text-gray-900">
          New Client
        </DialogTitle>
        <DialogDescription class="mt-1 text-sm text-gray-500">
          Create a new brand profile. Optionally provide a website URL to auto-extract brand data.
        </DialogDescription>

        <div class="mt-4 space-y-3">
          <div>
            <label for="new-client-name" class="mb-1 block text-sm font-medium text-gray-700">
              Brand Name <span class="text-red-500">*</span>
            </label>
            <input
              id="new-client-name"
              v-model="name"
              data-test-id="new-client-name"
              type="text"
              placeholder="e.g. Acme Corp"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              @keydown.enter="handleCreate"
            />
          </div>

          <div>
            <label for="new-client-url" class="mb-1 block text-sm font-medium text-gray-700">
              Website URL
              <span class="text-xs text-gray-400">(optional)</span>
            </label>
            <input
              id="new-client-url"
              v-model="url"
              data-test-id="new-client-url"
              type="url"
              placeholder="https://example.com"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              @keydown.enter="handleCreate"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <DialogClose as-child>
            <button
              data-test-id="new-client-cancel"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            data-test-id="new-client-create"
            class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            :disabled="!name.trim() || isSubmitting"
            @click="handleCreate"
          >
            {{ isSubmitting ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/unit/components/new-client-dialog.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Update BrandList.vue — replace inline input with dialog trigger + settings link**

In `src/components/dashboard/BrandList.vue`:

1. Replace the `v-if="isCreating"` inline input block with a button that opens the dialog:

```vue
<!-- Replace inline input with: -->
<NewClientDialog v-model:open="showNewClientDialog" />

<!-- In the "+ New Brand" button area, change to: -->
<button
  data-test-id="brand-new-button"
  class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
  @click="showNewClientDialog = true"
>
  <icon-lucide-plus class="size-4" />
  Add Client
</button>
```

2. Add a settings gear icon to each brand item:

```vue
<!-- Inside the brand list item, after the brand name: -->
<router-link
  :to="`/dashboard/${brand.id}/settings`"
  data-test-id="brand-settings-link"
  class="opacity-0 group-hover:opacity-100 transition-opacity"
  @click.stop
>
  <icon-lucide-settings class="size-3.5 text-gray-400 hover:text-gray-600" />
</router-link>
```

3. Update the script: replace `isCreating`, `newBrandName`, `submitNewBrand`, `cancelCreating` refs/functions with:

```ts
import NewClientDialog from './NewClientDialog.vue'
const showNewClientDialog = ref(false)
```

Remove the old inline creation logic.

- [ ] **Step 6: Run lint/typecheck**

Run: `bun run check`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/NewClientDialog.vue tests/unit/components/new-client-dialog.test.ts src/components/dashboard/BrandList.vue
git commit -m "feat(m4): add new client dialog and settings link in brand list"
```

---

## Chunk 4: Media Library Components — MediaCard, MediaGrid, UploadDialog, Dashboard Page

### Task 9: MediaCard Component

**Files:**
- Create: `src/components/media/MediaCard.vue`

- [ ] **Step 1: Create MediaCard**

Create `src/components/media/MediaCard.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { MediaAsset } from '@/types/kova/media'

const props = defineProps<{
  image: MediaAsset
  publicUrl: string
  density: 'compact' | 'comfortable'
  isPlacing?: boolean
}>()

const emit = defineEmits<{
  select: [image: MediaAsset]
  delete: [image: MediaAsset]
}>()

const aspectClass = computed(() =>
  props.density === 'compact' ? 'aspect-square' : 'aspect-[4/3]'
)
</script>

<template>
  <div
    :data-test-id="`media-card-${image.id}`"
    class="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-shadow hover:shadow-md"
    :class="[aspectClass, { 'pointer-events-none opacity-60': isPlacing }]"
    @click="emit('select', image)"
  >
    <!-- Thumbnail -->
    <img
      :src="publicUrl"
      :alt="image.file_name"
      class="size-full object-cover"
      loading="lazy"
    />

    <!-- Hover overlay -->
    <div
      class="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30"
    >
      <!-- Delete button (top-right) -->
      <button
        :data-test-id="`media-card-delete-${image.id}`"
        class="absolute right-2 top-2 rounded-full bg-white/90 p-1 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100"
        @click.stop="emit('delete', image)"
      >
        <icon-lucide-trash-2 class="size-3.5 text-red-500" />
      </button>

      <!-- Placing spinner -->
      <div v-if="isPlacing" class="rounded-full bg-white/90 p-2">
        <icon-lucide-loader-2 class="size-5 animate-spin text-gray-600" />
      </div>
    </div>

    <!-- Filename label -->
    <div
      class="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-4 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
    >
      {{ image.file_name }}
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/media/MediaCard.vue
git commit -m "feat(m4): add MediaCard component with hover actions"
```

---

### Task 10: MediaGrid Component

**Files:**
- Create: `src/components/media/MediaGrid.vue`

- [ ] **Step 1: Create MediaGrid**

Create `src/components/media/MediaGrid.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import MediaCard from './MediaCard.vue'
import type { MediaAsset } from '@/types/kova/media'

const props = defineProps<{
  images: MediaAsset[]
  density: 'compact' | 'comfortable'
  searchQuery?: string
  placingId?: string | null
}>()

const emit = defineEmits<{
  select: [image: MediaAsset]
  delete: [image: MediaAsset]
}>()

const mediaStore = useMediaStore()

const filteredImages = computed(() => {
  if (!props.searchQuery?.trim()) return props.images
  const query = props.searchQuery.toLowerCase()
  return props.images.filter((img) =>
    img.file_name.toLowerCase().includes(query)
  )
})

const gridClass = computed(() =>
  props.density === 'compact'
    ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
    : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
)
</script>

<template>
  <div
    v-if="filteredImages.length > 0"
    data-test-id="media-grid"
    class="grid gap-3"
    :class="gridClass"
  >
    <MediaCard
      v-for="image in filteredImages"
      :key="image.id"
      :image="image"
      :public-url="mediaStore.getPublicUrl(image.storage_path)"
      :density="density"
      :is-placing="placingId === image.id"
      @select="emit('select', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
  <div
    v-else
    data-test-id="media-grid-empty"
    class="flex flex-col items-center justify-center py-12 text-center"
  >
    <icon-lucide-image class="mb-3 size-10 text-gray-300" />
    <p class="text-sm text-gray-500">
      {{ searchQuery ? 'No images match your search' : 'No images yet' }}
    </p>
  </div>
</template>
```

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/media/MediaGrid.vue
git commit -m "feat(m4): add MediaGrid component with density and search"
```

---

### Task 11: UploadDialog Component

**Files:**
- Create: `src/components/media/UploadDialog.vue`

**Reference:** Reka UI Dialog + Tabs patterns. File upload via `useFileDialog` from `@vueuse/core` (same pattern as `FillPicker.vue:249`).

- [ ] **Step 1: Create UploadDialog**

Create `src/components/media/UploadDialog.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFileDialog } from '@vueuse/core'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui'
import { useMediaStore } from '@/stores/media'
import { toast } from '@/composables/use-toast'
import { MEDIA_ACCEPT_STRING, MEDIA_MAX_SIZE_BYTES, MEDIA_ACCEPTED_TYPES } from '@/types/kova/media'
import type { MediaAcceptedType } from '@/types/kova/media'

const props = defineProps<{
  open: boolean
  brandId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const mediaStore = useMediaStore()
const activeTab = ref('upload')
const isUploading = ref(false)
const urlInput = ref('')
const urlPreview = ref<string | null>(null)
const dragOver = ref(false)

// File picker
const { open: openFilePicker, onChange } = useFileDialog({
  accept: MEDIA_ACCEPT_STRING,
  multiple: true,
})

onChange(async (files) => {
  if (!files?.length) return
  await uploadFiles(Array.from(files))
})

async function uploadFiles(files: File[]): Promise<void> {
  isUploading.value = true
  try {
    for (const file of files) {
      await mediaStore.uploadImage(props.brandId, file)
    }
    toast.show(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`)
    emit('update:open', false)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    toast.show(msg, 'error')
  } finally {
    isUploading.value = false
  }
}

// Drag-and-drop
function handleDrop(e: DragEvent): void {
  e.preventDefault()
  dragOver.value = false
  const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
    MEDIA_ACCEPTED_TYPES.includes(f.type as MediaAcceptedType)
  )
  if (files.length) {
    void uploadFiles(files)
  }
}

// URL upload
async function uploadFromUrl(): Promise<void> {
  if (!urlInput.value.trim()) return
  isUploading.value = true
  try {
    await mediaStore.uploadImageFromUrl(props.brandId, urlInput.value.trim())
    toast.show('Image uploaded from URL')
    urlInput.value = ''
    urlPreview.value = null
    emit('update:open', false)
  } catch {
    toast.show('Failed to upload from URL', 'error')
  } finally {
    isUploading.value = false
  }
}

function previewUrl(): void {
  urlPreview.value = urlInput.value.trim() || null
}

function handleOpenChange(open: boolean): void {
  emit('update:open', open)
  if (!open) {
    urlInput.value = ''
    urlPreview.value = null
    activeTab.value = 'upload'
  }
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
      >
        <DialogTitle class="text-base font-semibold text-gray-900">
          Upload Images
        </DialogTitle>

        <TabsRoot v-model="activeTab" class="mt-4">
          <TabsList class="flex gap-1 rounded-lg bg-gray-100 p-1">
            <TabsTrigger
              value="upload"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="url"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              From URL
            </TabsTrigger>
          </TabsList>

          <!-- Upload tab -->
          <TabsContent value="upload" class="mt-4">
            <div
              data-test-id="upload-dropzone"
              class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors"
              :class="
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              "
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop="handleDrop"
            >
              <icon-lucide-upload-cloud class="mb-3 size-10 text-gray-400" />
              <p class="text-sm text-gray-600">
                Drag & drop images here, or
              </p>
              <button
                data-test-id="upload-pick-files"
                class="mt-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                :disabled="isUploading"
                @click="openFilePicker"
              >
                {{ isUploading ? 'Uploading…' : 'Browse Files' }}
              </button>
              <p class="mt-2 text-xs text-gray-400">
                JPEG, PNG, GIF, WEBP, SVG — max 5 MB
              </p>
            </div>
          </TabsContent>

          <!-- URL tab -->
          <TabsContent value="url" class="mt-4 space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Image URL
              </label>
              <input
                v-model="urlInput"
                data-test-id="upload-url-input"
                type="url"
                placeholder="https://example.com/image.png"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                @blur="previewUrl"
                @keydown.enter="uploadFromUrl"
              />
            </div>

            <!-- URL preview -->
            <div
              v-if="urlPreview"
              class="flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              <img
                :src="urlPreview"
                alt="Preview"
                class="max-h-40 object-contain"
                @error="urlPreview = null"
              />
            </div>

            <button
              data-test-id="upload-url-confirm"
              class="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              :disabled="!urlInput.trim() || isUploading"
              @click="uploadFromUrl"
            >
              {{ isUploading ? 'Uploading…' : 'Upload from URL' }}
            </button>
          </TabsContent>
        </TabsRoot>

        <div class="mt-4 flex justify-end">
          <DialogClose as-child>
            <button
              data-test-id="upload-cancel"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/media/UploadDialog.vue
git commit -m "feat(m4): add upload dialog with drag-drop and URL tabs"
```

---

### Task 12: Dashboard Media Page (Replace BrandAssetsView Stub)

**Files:**
- Modify: `src/views/dashboard/BrandAssetsView.vue`

- [ ] **Step 1: Replace BrandAssetsView stub with full media library page**

Replace the entire contents of `src/views/dashboard/BrandAssetsView.vue`:

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaStore } from '@/stores/media'
import { toast } from '@/composables/use-toast'
import MediaGrid from '@/components/media/MediaGrid.vue'
import UploadDialog from '@/components/media/UploadDialog.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import type { MediaAsset } from '@/types/kova/media'

const route = useRoute()
const mediaStore = useMediaStore()

const brandId = computed(() => route.params.brandId as string)
const searchQuery = ref('')
const showUploadDialog = ref(false)

// Fetch images when brand changes
watch(brandId, (id) => {
  if (id) void mediaStore.fetchImages(id)
}, { immediate: true })

async function handleDelete(image: MediaAsset): Promise<void> {
  try {
    await mediaStore.deleteImage(image)
    toast.show('Image deleted')
  } catch {
    toast.show('Failed to delete image', 'error')
  }
}
</script>

<template>
  <div data-test-id="brand-assets-view" class="space-y-4">
    <!-- No media yet -->
    <template v-if="!mediaStore.isLoading && mediaStore.images.length === 0">
      <EmptyState
        title="Upload your first brand asset"
        description="Build your brand image library to use in email designs."
        action-label="Upload Images"
        @action="showUploadDialog = true"
      />
    </template>

    <!-- Has media -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="relative">
          <icon-lucide-search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            data-test-id="media-search"
            type="text"
            placeholder="Search images…"
            class="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          data-test-id="media-upload-button"
          class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          @click="showUploadDialog = true"
        >
          <icon-lucide-upload class="mr-1.5 inline-block size-4" />
          Upload
        </button>
      </div>

      <!-- Grid -->
      <MediaGrid
        :images="mediaStore.images"
        density="comfortable"
        :search-query="searchQuery"
        @delete="handleDelete"
      />
    </template>

    <!-- Upload dialog -->
    <UploadDialog
      v-model:open="showUploadDialog"
      :brand-id="brandId"
    />
  </div>
</template>
```

**Note:** The `EmptyState` component needs to emit an `@action` event. Check if it already does — if not, add a `@click` handler on the action button that emits `'action'`. If `EmptyState` uses `action-disabled` prop to disable the button, remove that prop since we now have a real action.

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 3: Manual test — navigate to `/dashboard/{brandId}/assets`**

Run: `bun run dev`
Verify: Empty state shows with "Upload Images" button. Upload an image → it appears in the grid. Delete → it disappears. Search filters by filename.

- [ ] **Step 4: Commit**

```bash
git add src/views/dashboard/BrandAssetsView.vue
git commit -m "feat(m4): replace brand assets stub with full media library page"
```

---

## Chunk 5: Editor Integration — Media Panel, Toolbar

### Task 13: MediaLibraryPanel + EditorView Integration

**Files:**
- Create: `src/components/media/MediaLibraryPanel.vue`
- Modify: `src/views/EditorView.vue`

**Reference:** Image placement flow from spec section 4.2.3. Uses the public `placeImageFiles(files: File[], cx, cy)` API (editor.ts:1764) which handles decoding, sizing, and undo. Viewport center via `screenToCanvas`.

- [ ] **Step 1: Create MediaLibraryPanel**

Create `src/components/media/MediaLibraryPanel.vue`:

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import { useBrandsStore } from '@/stores/brands'
import { useEditorStore } from '@/stores/editor'
import { toast } from '@/composables/use-toast'
import MediaGrid from './MediaGrid.vue'
import UploadDialog from './UploadDialog.vue'
import type { MediaAsset } from '@/types/kova/media'

const emit = defineEmits<{
  close: []
}>()

const mediaStore = useMediaStore()
const brandsStore = useBrandsStore()
const store = useEditorStore()

const searchQuery = ref('')
const showUploadDialog = ref(false)
const placingId = ref<string | null>(null)

const brandId = computed(() => brandsStore.selectedBrandId)

// Fetch images when panel opens or brand changes
watch(brandId, (id) => {
  if (id) void mediaStore.fetchImages(id)
}, { immediate: true })

async function handleSelect(image: MediaAsset): Promise<void> {
  if (placingId.value) return // already placing

  placingId.value = image.id
  try {
    const publicUrl = mediaStore.getPublicUrl(image.storage_path)

    // Fetch image bytes and wrap as File for placeImageFiles API
    const response = await fetch(publicUrl)
    if (!response.ok) throw new Error('Failed to fetch image')
    const blob = await response.blob()
    const file = new File([blob], image.file_name, { type: image.file_type })

    // Calculate viewport center in screen coordinates
    const canvasEl = document.querySelector('canvas')
    if (!canvasEl) throw new Error('Canvas not found')
    const rect = canvasEl.getBoundingClientRect()
    const screenCx = rect.left + rect.width / 2
    const screenCy = rect.top + rect.height / 2
    const { x: cx, y: cy } = store.screenToCanvas(screenCx, screenCy)

    // placeImageFiles handles decoding, sizing, and undo
    await store.placeImageFiles([file], cx, cy)

    emit('close')
  } catch {
    toast.show('Failed to place image', 'error')
  } finally {
    placingId.value = null
  }
}

async function handleDelete(image: MediaAsset): Promise<void> {
  try {
    await mediaStore.deleteImage(image)
    toast.show('Image deleted')
  } catch {
    toast.show('Failed to delete image', 'error')
  }
}
</script>

<template>
  <div
    data-test-id="media-library-panel"
    class="absolute right-4 top-14 z-30 flex h-[calc(100vh-80px)] w-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-900">Media</h3>
      <button
        data-test-id="media-panel-close"
        class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        @click="emit('close')"
      >
        <icon-lucide-x class="size-4" />
      </button>
    </div>

    <!-- Search -->
    <div class="border-b border-gray-200 px-4 py-2">
      <div class="relative">
        <icon-lucide-search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          data-test-id="media-panel-search"
          type="text"
          placeholder="Search…"
          class="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- Grid (scrollable) -->
    <div class="flex-1 overflow-y-auto p-3">
      <MediaGrid
        :images="mediaStore.images"
        density="compact"
        :search-query="searchQuery"
        :placing-id="placingId"
        @select="handleSelect"
        @delete="handleDelete"
      />
    </div>

    <!-- Upload button -->
    <div class="border-t border-gray-200 px-4 py-3">
      <button
        data-test-id="media-panel-upload"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="showUploadDialog = true"
      >
        <icon-lucide-upload class="mr-1.5 inline-block size-4" />
        Upload Images
      </button>
    </div>

    <!-- Upload dialog -->
    <UploadDialog
      v-if="brandId"
      v-model:open="showUploadDialog"
      :brand-id="brandId"
    />
  </div>
</template>
```

**Implementation note:** The editor store exposes `placeImageFiles(files: File[], cx, cy)` which internally calls `decodeImageDimensions` and `placeImageNode` (both private). We construct a `File` from the fetched blob and pass it to `placeImageFiles` — no need to access private functions.

- [ ] **Step 2: Add MediaLibraryPanel to EditorView**

In `src/views/EditorView.vue`:

1. Add import and ref:

```ts
import MediaLibraryPanel from '@/components/media/MediaLibraryPanel.vue'

const showMediaPanel = ref(false)
```

2. Add the panel to the template, positioned after the canvas area (inside the main editor section, after `<Toolbar />`):

```vue
<!-- After Toolbar, inside the central panel area: -->
<MediaLibraryPanel
  v-if="showMediaPanel"
  @close="showMediaPanel = false"
/>
```

3. Expose `showMediaPanel` so the Toolbar can toggle it. Either:
   - Use `provide('showMediaPanel', showMediaPanel)` in EditorView
   - Or pass a callback prop to Toolbar
   - Or emit an event from Toolbar

Recommended: Use `provide/inject` pattern:

```ts
// In EditorView.vue script:
import { provide } from 'vue'
provide('toggleMediaPanel', () => { showMediaPanel.value = !showMediaPanel.value })
```

- [ ] **Step 3: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/media/MediaLibraryPanel.vue src/views/EditorView.vue
git commit -m "feat(m4): add media library floating panel in editor"
```

---

### Task 14: Toolbar Integration

**Files:**
- Modify: `src/components/Toolbar.vue`

**Reference:** Toolbar uses Lucide icons (`icon-lucide-*`), Reka UI DropdownMenu for flyouts, and has a `CATEGORY_COUNT = 3` constant for mobile categories. The media button should be a desktop-only button placed outside the mobile category system.

- [ ] **Step 1: Add media library toggle button to Toolbar**

In `src/components/Toolbar.vue`:

1. Inject the toggle function:

```ts
import { inject } from 'vue'
const toggleMediaPanel = inject<() => void>('toggleMediaPanel')
```

2. Add a button in the desktop toolbar area (the section with other tool buttons, not inside mobile categories). Place it near other icon buttons:

```vue
<!-- Media library button (desktop only) -->
<button
  v-if="!isMobile"
  data-test-id="toolbar-media-library"
  class="rounded-md p-2 text-[#ccc] hover:bg-hover hover:text-white"
  title="Media Library"
  @click="toggleMediaPanel?.()"
>
  <icon-lucide-image class="size-4" />
</button>
```

**Note:** The Toolbar is in dark theme (editor context), so use `text-[#ccc] hover:bg-hover hover:text-white` classes matching existing toolbar buttons.

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: No type errors.

- [ ] **Step 3: Manual test — click media library button in toolbar**

Run: `bun run dev`
Navigate to editor. Click the media library icon in the toolbar → panel opens. Click X → panel closes. Click again → re-opens. Upload an image → click it → image appears on canvas → panel closes.

- [ ] **Step 4: Run full test suite**

Run: `bun run test:unit && bun run check`
Expected: All existing tests pass + new tests pass. No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.vue
git commit -m "feat(m4): add media library toggle button to toolbar"
```

---

## Final Verification

After all tasks are complete:

- [ ] **Run full quality gate**

```bash
bun run check && bun run test:unit && bun run test:dupes
```

Expected: All checks pass. Lint clean. Tests pass. Duplication < 3%.

- [ ] **Manual smoke test**

1. Dashboard: Navigate to brand → gear icon → settings page loads with brand data
2. Dashboard: Edit brand name → wait → toast "Saved" appears
3. Dashboard: Click "Add Client" → dialog opens → create brand with name only → navigates to new brand
4. Dashboard: Click "Add Client" → enter name + URL → brand created, extraction runs in background
5. Dashboard: Navigate to brand → "Assets" tab → empty state → upload image → appears in grid → delete → disappears
6. Editor: Open canvas → click media library icon → panel opens → search works → click image → image placed on canvas → panel closes
7. Editor: Re-open panel → upload from URL → image appears in grid

- [ ] **Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore(m4): final cleanup and verification"
```
