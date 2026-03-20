# M2: Dashboard & Brand Management — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dashboard layout with brand management, canvas CRUD with trash system, and editor ↔ dashboard navigation.

**Architecture:** Nested Vue Router routes under `/dashboard` with Pinia stores for `brands` and `canvases` backed by Supabase Postgres + Storage. Dashboard uses a 3-region light-themed layout (sidebar + top bar + content). Editor integration adds canvas loading, name sync, and thumbnail capture on navigate-away.

**Tech Stack:** Vue 3 (Composition API), Pinia 3, Vue Router 5, Supabase (Postgres + Storage), Reka UI (Dialog, ContextMenu, DropdownMenu), Tailwind CSS 4, bun:test

**Spec:** `kova-open-pencil-1/docs/superpowers/specs/2026-03-17-m2-dashboard-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260317_m2_dashboard.sql` | brands + canvases tables, RLS policies, storage bucket |
| `src/types/kova/database.ts` | Brand, Canvas, BrandColors, BrandFonts DB row interfaces |
| `src/stores/brands.ts` | Pinia store — brand CRUD + selection |
| `src/stores/canvases.ts` | Pinia store — canvas CRUD + trash |
| `src/views/dashboard/CanvasGrid.vue` | Child route `/dashboard/:brandId` — canvas cards grid |
| `src/views/dashboard/TrashView.vue` | Child route `/dashboard/trash` — trashed canvases grid |
| `src/views/dashboard/BrandAssetsView.vue` | Child route `/dashboard/:brandId/assets` — M2 placeholder |
| `src/components/dashboard/BrandList.vue` | Sidebar — brand list, new brand form, trash link |
| `src/components/dashboard/AccountMenu.vue` | Top-right avatar dropdown (sign out) |
| `src/components/dashboard/CanvasCard.vue` | Canvas thumbnail card + context menu |
| `src/components/dashboard/EmptyState.vue` | Zero canvases CTA |
| `src/components/dashboard/TrashCard.vue` | Trashed canvas card + restore/delete menu |
| `src/components/dashboard/MoveToTrashDialog.vue` | Trash confirmation dialog (Reka UI Dialog) |
| `src/utils/capture-thumbnail.ts` | Canvas element → blob → resize → upload to Supabase Storage |
| `tests/unit/stores/brands.test.ts` | Brand store unit tests |
| `tests/unit/stores/canvases.test.ts` | Canvas store unit tests |
| `tests/unit/utils/capture-thumbnail.test.ts` | Thumbnail utility tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/router.ts` | Restructure `/dashboard` with `children` array, add lazy imports |
| `src/views/DashboardView.vue` | Replace placeholder with 3-region layout shell |
| `src/views/EditorView.vue` | Load canvas from store, sync name, redirect if invalid/trashed, thumbnail on leave |
| `src/components/AppMenu.vue` | Add "Back to Dashboard" as first File menu item |

---

## Chunk 1: Foundation (Database + Types + Stores)

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260317_m2_dashboard.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- M2: Dashboard & Brand Management
-- brands + canvases tables, RLS, triggers, thumbnails storage bucket

-- brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  colors JSONB,
  fonts JSONB,
  logo_url TEXT,
  voice TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own brands" ON public.brands
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own brands" ON public.brands
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own brands" ON public.brands
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own brands" ON public.brands
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER set_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- canvases table
CREATE TABLE IF NOT EXISTS public.canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  thumbnail_url TEXT,
  trashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own canvases" ON public.canvases
  FOR SELECT USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own canvases" ON public.canvases
  FOR INSERT WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own canvases" ON public.canvases
  FOR UPDATE USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own canvases" ON public.canvases
  FOR DELETE USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE TRIGGER set_canvases_updated_at
  BEFORE UPDATE ON public.canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- thumbnails storage bucket
-- Intentionally public: thumbnails are non-sensitive preview images. Public URLs avoid
-- per-request auth overhead for grid rendering (same pattern as Figma, Canva).
-- Write access is still scoped to the user's own prefix via RLS policies below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `m2_dashboard` and the SQL above. Project ID: `moiuzrkxtkgienykxuio`.

- [ ] **Step 3: Verify migration applied**

Use `mcp__supabase__list_tables` to confirm `brands` and `canvases` tables exist.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260317_m2_dashboard.sql
git commit -m "feat: add brands and canvases tables with RLS and thumbnail storage"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/kova/database.ts`

- [ ] **Step 1: Create database row interfaces**

```ts
export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
}

export interface BrandFonts {
  heading: string
  body: string
}

export interface Brand {
  id: string
  user_id: string
  name: string
  colors: BrandColors | null
  fonts: BrandFonts | null
  logo_url: string | null
  voice: string | null
  industry: string | null
  created_at: string
  updated_at: string
}

export interface Canvas {
  id: string
  brand_id: string
  name: string
  thumbnail_url: string | null
  trashed_at: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors related to new types.

- [ ] **Step 3: Commit**

```bash
git add src/types/kova/database.ts
git commit -m "feat: add Brand and Canvas database row types"
```

---

### Task 3: Brands Store (TDD)

**Files:**
- Create: `tests/unit/stores/brands.test.ts`
- Create: `src/stores/brands.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Mock supabase
const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  remove: mock(() => Promise.resolve({ error: null })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}))

// Mock auth store — provide a test user
const mockAuthStore = { user: { id: 'user-1', email: 'test@test.com' } }
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const { useBrandsStore } = await import('@/stores/brands')

describe('brands store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
  })

  test('starts with empty brands and isLoading false', () => {
    const store = useBrandsStore()
    expect(store.brands).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  test('fetchBrands loads all brands', async () => {
    const testBrands = [
      { id: 'b1', user_id: 'user-1', name: 'Zeta', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 'b2', user_id: 'user-1', name: 'Alpha', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]

    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: testBrands, error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    expect(store.brands).toEqual(testBrands)
    expect(mockFrom).toHaveBeenCalledWith('brands')
  })

  test('sortedBrands returns brands alphabetically', async () => {
    const testBrands = [
      { id: 'b1', user_id: 'user-1', name: 'Zeta', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 'b2', user_id: 'user-1', name: 'Alpha', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]

    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: testBrands, error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    expect(store.sortedBrands[0].name).toBe('Alpha')
    expect(store.sortedBrands[1].name).toBe('Zeta')
  })

  test('createBrand adds brand to store', async () => {
    const newBrand = { id: 'b3', user_id: 'user-1', name: 'New Brand', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newBrand, error: null }),
        }),
      }),
    })

    const store = useBrandsStore()
    const result = await store.createBrand('New Brand')

    expect(result).toEqual(newBrand)
    expect(store.brands).toContainEqual(newBrand)
  })

  test('updateBrand updates brand in store', async () => {
    const original = { id: 'b1', user_id: 'user-1', name: 'Old Name', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' }
    const updated = { ...original, name: 'New Name', updated_at: '2026-01-02' }

    // Seed store
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: [original], error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    // Update
    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: updated, error: null }),
          }),
        }),
      }),
    })

    await store.updateBrand('b1', { name: 'New Name' })
    expect(store.brands[0].name).toBe('New Name')
  })

  test('deleteBrand removes brand and cleans up thumbnails', async () => {
    const brand = { id: 'b1', user_id: 'user-1', name: 'Brand', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' }

    // Seed store
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: [brand], error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    // Mock canvas lookup for thumbnail cleanup
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ id: 'c1' }, { id: 'c2' }], error: null }),
      }),
    })

    // Mock brand delete
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.deleteBrand('b1')

    expect(store.brands).toEqual([])
    expect(mockStorageFrom).toHaveBeenCalledWith('thumbnails')
  })

  test('selectBrand sets selectedBrandId', () => {
    const store = useBrandsStore()
    store.selectBrand('b1')
    expect(store.selectedBrandId).toBe('b1')
  })

  test('selectedBrand returns brand matching selectedBrandId', async () => {
    const testBrands = [
      { id: 'b1', user_id: 'user-1', name: 'Alpha', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]

    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: testBrands, error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()
    store.selectBrand('b1')

    expect(store.selectedBrand?.name).toBe('Alpha')
  })

  test('fetchBrands sets isLoading false on error', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: null, error: { message: 'Network error' } }),
    })

    const store = useBrandsStore()
    await expect(store.fetchBrands()).rejects.toThrow()
    expect(store.isLoading).toBe(false)
  })

  test('createBrand throws when not authenticated', async () => {
    const originalUser = mockAuthStore.user
    mockAuthStore.user = null as any

    const store = useBrandsStore()
    await expect(store.createBrand('Test')).rejects.toThrow('Not authenticated')

    mockAuthStore.user = originalUser
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/brands.test.ts`
Expected: FAIL — `@/stores/brands` module not found.

- [ ] **Step 3: Implement brands store**

```ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { Brand } from '@/types/kova/database'

export const useBrandsStore = defineStore('brands', () => {
  const brands = ref<Brand[]>([])
  const isLoading = ref(false)
  const selectedBrandId = ref<string | null>(null)

  const sortedBrands = computed(() =>
    [...brands.value].sort((a, b) => a.name.localeCompare(b.name))
  )

  const selectedBrand = computed(() =>
    brands.value.find((b) => b.id === selectedBrandId.value) ?? null
  )

  function selectBrand(id: string): void {
    selectedBrandId.value = id
  }

  async function fetchBrands(): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase.from('brands').select('*')
      if (error) throw error
      brands.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  async function createBrand(name: string): Promise<Brand> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('brands')
      .insert({ user_id: userId, name })
      .select()
      .single()

    if (error) throw error
    brands.value = [...brands.value, data]
    return data
  }

  async function updateBrand(
    id: string,
    updates: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    brands.value = brands.value.map((b) => (b.id === id ? data : b))
  }

  async function deleteBrand(id: string): Promise<void> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    // Delete thumbnails for all canvases under this brand
    const { data: canvasRows } = await supabase
      .from('canvases')
      .select('id')
      .eq('brand_id', id)

    if (canvasRows && canvasRows.length > 0) {
      const paths = canvasRows.map((c) => `${userId}/${c.id}.png`)
      await supabase.storage.from('thumbnails').remove(paths)
    }

    // Delete brand (cascades to canvases via FK)
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) throw error

    brands.value = brands.value.filter((b) => b.id !== id)
    if (selectedBrandId.value === id) {
      selectedBrandId.value = null
    }
  }

  return {
    brands,
    isLoading,
    selectedBrandId,
    sortedBrands,
    selectedBrand,
    selectBrand,
    fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand,
  }
})
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/brands.test.ts`
Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/brands.ts tests/unit/stores/brands.test.ts
git commit -m "feat: add brands Pinia store with TDD tests"
```

---

### Task 4: Canvases Store (TDD)

**Files:**
- Create: `tests/unit/stores/canvases.test.ts`
- Create: `src/stores/canvases.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  remove: mock(() => Promise.resolve({ error: null })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}))

const mockAuthStore = { user: { id: 'user-1' } }
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const { useCanvasesStore } = await import('@/stores/canvases')

const makeCanvas = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  brand_id: 'b1',
  name: 'Untitled',
  thumbnail_url: null,
  trashed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('canvases store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
  })

  test('starts with empty canvases', () => {
    const store = useCanvasesStore()
    expect(store.canvases).toEqual([])
    expect(store.trashedCanvases).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  test('fetchCanvases loads active canvases for brand', async () => {
    const canvases = [makeCanvas({ id: 'c1' }), makeCanvas({ id: 'c2' })]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: canvases, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    expect(store.canvases).toEqual(canvases)
  })

  test('createCanvas creates with defaults and adds to store', async () => {
    const newCanvas = makeCanvas({ id: 'c-new', name: 'Untitled' })

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newCanvas, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    const result = await store.createCanvas('b1')

    expect(result).toEqual(newCanvas)
    expect(store.canvases).toContainEqual(newCanvas)
  })

  test('createCanvas uses provided name', async () => {
    const newCanvas = makeCanvas({ id: 'c-new', name: 'My Email' })

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newCanvas, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.createCanvas('b1', 'My Email')

    expect(mockFrom).toHaveBeenCalledWith('canvases')
  })

  test('renameCanvas updates name in store', async () => {
    // Seed
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: [makeCanvas()], error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: makeCanvas({ name: 'Renamed' }),
              error: null,
            }),
          }),
        }),
      }),
    })

    await store.renameCanvas('c1', 'Renamed')
    expect(store.canvases[0].name).toBe('Renamed')
  })

  test('duplicateCanvas creates copy with " (Copy)" suffix', async () => {
    const original = makeCanvas({ name: 'Original' })
    const copy = makeCanvas({ id: 'c-copy', name: 'Original (Copy)' })

    // Seed
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: [original], error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    // Duplicate — first call reads original, second call inserts
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: copy, error: null }),
        }),
      }),
    })

    const result = await store.duplicateCanvas('c1')
    expect(result.name).toBe('Original (Copy)')
    expect(store.canvases).toHaveLength(2)
  })

  test('moveToTrash sets trashed_at and removes from canvases', async () => {
    const canvas = makeCanvas()
    const trashed = makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: [canvas], error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: trashed, error: null }),
          }),
        }),
      }),
    })

    await store.moveToTrash('c1')
    expect(store.canvases).toEqual([])
    expect(store.trashedCanvases).toContainEqual(trashed)
  })

  test('restoreCanvas clears trashed_at and removes from trashedCanvases', async () => {
    const trashed = makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })

    // Seed trashed
    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: [trashed], error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: makeCanvas({ trashed_at: null }), error: null }),
          }),
        }),
      }),
    })

    await store.restoreCanvas('c1')
    expect(store.trashedCanvases).toEqual([])
    // Does NOT add to canvases — let fetchCanvases(brandId) pick it up
    expect(store.canvases).toEqual([])
  })

  test('permanentlyDelete removes canvas and deletes thumbnail', async () => {
    const trashed = makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })

    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: [trashed], error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.permanentlyDelete('c1')
    expect(store.trashedCanvases).toEqual([])
    expect(mockStorageFrom).toHaveBeenCalledWith('thumbnails')
  })

  test('fetchTrashed loads trashed canvases', async () => {
    const trashed = [makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: trashed, error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    expect(store.trashedCanvases).toEqual(trashed)
  })

  test('sortedCanvases sorts by updated_at descending', async () => {
    const canvases = [
      makeCanvas({ id: 'c1', updated_at: '2026-01-01T00:00:00Z' }),
      makeCanvas({ id: 'c2', updated_at: '2026-03-01T00:00:00Z' }),
    ]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: canvases, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    expect(store.sortedCanvases[0].id).toBe('c2')
    expect(store.sortedCanvases[1].id).toBe('c1')
  })

  test('sortedTrashed sorts by trashed_at descending', async () => {
    const trashed = [
      makeCanvas({ id: 'c1', trashed_at: '2026-01-01T00:00:00Z' }),
      makeCanvas({ id: 'c2', trashed_at: '2026-03-01T00:00:00Z' }),
    ]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: trashed, error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    expect(store.sortedTrashed[0].id).toBe('c2')
    expect(store.sortedTrashed[1].id).toBe('c1')
  })

  test('fetchCanvases sets isLoading false on error', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: null, error: { message: 'Network error' } }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await expect(store.fetchCanvases('b1')).rejects.toThrow()
    expect(store.isLoading).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/canvases.test.ts`
Expected: FAIL — `@/stores/canvases` module not found.

- [ ] **Step 3: Implement canvases store**

```ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { Canvas } from '@/types/kova/database'

export const useCanvasesStore = defineStore('canvases', () => {
  const canvases = ref<Canvas[]>([])
  const trashedCanvases = ref<Canvas[]>([])
  const isLoading = ref(false)

  const sortedCanvases = computed(() =>
    [...canvases.value].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
  )

  const sortedTrashed = computed(() =>
    [...trashedCanvases.value].sort(
      (a, b) =>
        new Date(b.trashed_at ?? 0).getTime() - new Date(a.trashed_at ?? 0).getTime(),
    )
  )

  async function fetchCanvases(brandId: string): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('brand_id', brandId)
        .is('trashed_at', null)

      if (error) throw error
      canvases.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  async function createCanvas(brandId: string, name?: string): Promise<Canvas> {
    const row: { brand_id: string; name?: string } = { brand_id: brandId }
    if (name) row.name = name

    const { data, error } = await supabase
      .from('canvases')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    canvases.value = [...canvases.value, data]
    return data
  }

  async function renameCanvas(id: string, name: string): Promise<void> {
    const { data, error } = await supabase
      .from('canvases')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    canvases.value = canvases.value.map((c) => (c.id === id ? data : c))
  }

  async function duplicateCanvas(id: string): Promise<Canvas> {
    const original = canvases.value.find((c) => c.id === id)
    if (!original) throw new Error(`Canvas ${id} not found`)

    const { data, error } = await supabase
      .from('canvases')
      .insert({ brand_id: original.brand_id, name: `${original.name} (Copy)` })
      .select()
      .single()

    if (error) throw error
    canvases.value = [...canvases.value, data]
    return data
  }

  async function moveToTrash(id: string): Promise<void> {
    const { data, error } = await supabase
      .from('canvases')
      .update({ trashed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    canvases.value = canvases.value.filter((c) => c.id !== id)
    trashedCanvases.value = [...trashedCanvases.value, data]
  }

  async function restoreCanvas(id: string): Promise<void> {
    const { error } = await supabase
      .from('canvases')
      .update({ trashed_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    // Only remove from trashed list — don't add to canvases since it's brand-scoped.
    // The next fetchCanvases(brandId) call will pick it up in the correct brand's grid.
    trashedCanvases.value = trashedCanvases.value.filter((c) => c.id !== id)
  }

  async function permanentlyDelete(id: string): Promise<void> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    await supabase.storage.from('thumbnails').remove([`${userId}/${id}.png`])

    const { error } = await supabase.from('canvases').delete().eq('id', id)
    if (error) throw error

    trashedCanvases.value = trashedCanvases.value.filter((c) => c.id !== id)
  }

  async function fetchTrashed(): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .not('trashed_at', 'is', null)

      if (error) throw error
      trashedCanvases.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  return {
    canvases,
    trashedCanvases,
    isLoading,
    sortedCanvases,
    sortedTrashed,
    fetchCanvases,
    createCanvas,
    renameCanvas,
    duplicateCanvas,
    moveToTrash,
    restoreCanvas,
    permanentlyDelete,
    fetchTrashed,
  }
})
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/canvases.test.ts`
Expected: All 13 tests PASS.

- [ ] **Step 5: Run all existing tests to verify nothing broke**

Run: `cd kova-open-pencil-1 && bun run test:unit`
Expected: All tests pass (existing 23 + new brands 10 + new canvases 13 = 46).

- [ ] **Step 6: Commit**

```bash
git add src/stores/canvases.ts tests/unit/stores/canvases.test.ts
git commit -m "feat: add canvases Pinia store with TDD tests"
```

---

## Chunk 2: Routing & Layout

### Task 5: Router Restructuring

**Files:**
- Modify: `src/router.ts`

**Important:** Vue Router 4+ does NOT merge parent meta into child routes. Each child needs its own `meta` for the existing `resolveGuard` function to work correctly.

- [ ] **Step 1: Update router with nested dashboard routes**

Add lazy imports for the new child route components and restructure the `/dashboard` route with a `children` array. Static routes (`trash`) must be defined before dynamic (`:brandId`) to avoid param capture.

Changes to `src/router.ts`:

1. Add new lazy imports:
```ts
const CanvasGrid = () => import('./views/dashboard/CanvasGrid.vue')
const TrashView = () => import('./views/dashboard/TrashView.vue')
const BrandAssetsView = () => import('./views/dashboard/BrandAssetsView.vue')
```

2. Replace the flat `/dashboard` route with:
```ts
{
  path: '/dashboard',
  component: DashboardView,
  meta: { requiresAuth: true, requiresOnboarding: true },
  children: [
    {
      path: 'trash',
      component: TrashView,
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      path: ':brandId',
      component: CanvasGrid,
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
    {
      path: ':brandId/assets',
      component: BrandAssetsView,
      meta: { requiresAuth: true, requiresOnboarding: true },
    },
  ],
},
```

- [ ] **Step 2: Create stub child route components**

Create minimal stubs so the router compiles. These will be replaced in later tasks.

`src/views/dashboard/CanvasGrid.vue`:
```vue
<template>
  <div data-test-id="canvas-grid">Canvas Grid (stub)</div>
</template>
```

`src/views/dashboard/TrashView.vue`:
```vue
<template>
  <div data-test-id="trash-view">Trash View (stub)</div>
</template>
```

`src/views/dashboard/BrandAssetsView.vue`:
```vue
<template>
  <div data-test-id="brand-assets-view">Brand Assets (stub)</div>
</template>
```

- [ ] **Step 3: Run existing router guard tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/router/guards.test.ts`
Expected: All 10 tests PASS (resolveGuard function unchanged).

- [ ] **Step 4: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/router.ts src/views/dashboard/
git commit -m "feat: restructure dashboard routing with nested children"
```

---

### Task 6: DashboardView Layout Shell

**Files:**
- Modify: `src/views/DashboardView.vue`

- [ ] **Step 1: Replace placeholder with layout shell**

```vue
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AccountMenu from '@/components/dashboard/AccountMenu.vue'
import BrandList from '@/components/dashboard/BrandList.vue'
import { useBrandsStore } from '@/stores/brands'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const heading = computed(() => {
  if (route.path.endsWith('/trash')) return 'Trash'
  const brand = brandsStore.selectedBrand
  if (route.path.endsWith('/assets')) return brand ? `${brand.name} › Assets` : 'Brand Assets'
  return brand?.name ?? 'Dashboard'
})

onMounted(async () => {
  await brandsStore.fetchBrands()
  redirectToFirstBrandIfNeeded()
})

watch(() => route.params.brandId, (brandId) => {
  if (typeof brandId === 'string') {
    brandsStore.selectBrand(brandId)
  }
}, { immediate: true })

function redirectToFirstBrandIfNeeded(): void {
  const atDashboardRoot = route.path === '/dashboard' || route.path === '/dashboard/'
  if (atDashboardRoot && brandsStore.sortedBrands.length > 0) {
    void router.replace(`/dashboard/${brandsStore.sortedBrands[0].id}`)
  }
}
</script>

<template>
  <div data-test-id="dashboard-view" class="flex h-screen bg-white">
    <!-- Sidebar -->
    <aside class="flex w-60 shrink-0 flex-col border-r border-gray-200">
      <div class="flex items-center gap-2 px-4 py-3">
        <img src="/favicon-32.png" class="size-6 rounded" alt="Kova" />
        <span class="text-sm font-semibold text-gray-900">Kova</span>
      </div>
      <BrandList />
    </aside>

    <!-- Main area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 class="text-lg font-semibold text-gray-900">{{ heading }}</h1>
        <AccountMenu />
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-auto p-6">
        <div
          v-if="brandsStore.isLoading"
          class="flex h-full items-center justify-center"
        >
          <div class="size-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
        <router-view v-else />
      </main>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create stub components for BrandList and AccountMenu**

`src/components/dashboard/BrandList.vue`:
```vue
<template>
  <nav data-test-id="brand-list" class="flex-1 overflow-auto px-2 py-1">
    <p class="px-2 py-1 text-xs text-gray-400">Brands (stub)</p>
  </nav>
</template>
```

`src/components/dashboard/AccountMenu.vue`:
```vue
<template>
  <div data-test-id="account-menu">
    <div class="size-8 rounded-full bg-gray-200" />
  </div>
</template>
```

- [ ] **Step 3: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/DashboardView.vue src/components/dashboard/BrandList.vue src/components/dashboard/AccountMenu.vue
git commit -m "feat: add dashboard layout shell with sidebar, top bar, and router-view"
```

---

### Task 7: BrandList Sidebar

**Files:**
- Modify: `src/components/dashboard/BrandList.vue`

- [ ] **Step 1: Implement full BrandList component**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBrandsStore } from '@/stores/brands'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const isCreating = ref(false)
const newBrandName = ref('')

function isSelected(brandId: string): boolean {
  return route.params.brandId === brandId
}

function navigateToBrand(brandId: string): void {
  void router.push(`/dashboard/${brandId}`)
}

function navigateToAssets(brandId: string): void {
  void router.push(`/dashboard/${brandId}/assets`)
}

function navigateToTrash(): void {
  void router.push('/dashboard/trash')
}

function startCreating(): void {
  isCreating.value = true
  newBrandName.value = ''
}

async function submitNewBrand(): Promise<void> {
  const name = newBrandName.value.trim()
  if (!name) {
    isCreating.value = false
    return
  }
  const brand = await brandsStore.createBrand(name)
  isCreating.value = false
  newBrandName.value = ''
  navigateToBrand(brand.id)
}

function cancelCreating(): void {
  isCreating.value = false
  newBrandName.value = ''
}
</script>

<template>
  <nav data-test-id="brand-list" class="flex flex-1 flex-col overflow-auto">
    <div class="flex-1 space-y-0.5 px-2 py-1">
      <div v-for="brand in brandsStore.sortedBrands" :key="brand.id">
        <button
          :data-test-id="`brand-item-${brand.id}`"
          class="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors"
          :class="isSelected(brand.id)
            ? 'bg-gray-100 font-medium text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          @click="navigateToBrand(brand.id)"
        >
          <span class="truncate">{{ brand.name }}</span>
        </button>
        <button
          v-if="isSelected(brand.id)"
          :data-test-id="`brand-assets-link-${brand.id}`"
          class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 pl-6 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          @click="navigateToAssets(brand.id)"
        >
          <icon-lucide-image class="size-3" />
          Assets
        </button>
      </div>
    </div>

    <!-- New Brand form -->
    <div v-if="isCreating" class="px-2 pb-2">
      <input
        data-test-id="brand-new-name-input"
        v-model="newBrandName"
        class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
        placeholder="Brand name"
        autofocus
        @keydown.enter="submitNewBrand"
        @keydown.escape="cancelCreating"
        @blur="submitNewBrand"
      />
    </div>

    <!-- Bottom actions -->
    <div class="border-t border-gray-200 px-2 py-2 space-y-0.5">
      <button
        data-test-id="brand-new-button"
        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        @click="startCreating"
      >
        <icon-lucide-plus class="size-4" />
        New Brand
      </button>
      <button
        data-test-id="trash-link"
        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
        :class="route.path.endsWith('/trash')
          ? 'bg-gray-100 font-medium text-gray-900'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        @click="navigateToTrash"
      >
        <icon-lucide-trash-2 class="size-4" />
        Trash
      </button>
    </div>
  </nav>
</template>
```

- [ ] **Step 2: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/BrandList.vue
git commit -m "feat: add brand list sidebar with create and trash navigation"
```

---

### Task 8: AccountMenu Component

**Files:**
- Modify: `src/components/dashboard/AccountMenu.vue`

- [ ] **Step 1: Implement account menu with dropdown**

```vue
<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const initials = (() => {
  const email = authStore.user?.email ?? ''
  return email.charAt(0).toUpperCase()
})()

async function handleSignOut(): Promise<void> {
  await authStore.signOut()
}
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      data-test-id="account-menu-trigger"
      class="flex size-8 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white transition-opacity hover:opacity-90"
    >
      {{ initials }}
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="8"
        align="end"
        class="z-50 min-w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      >
        <div class="px-2 py-1.5 text-xs text-gray-500">
          {{ authStore.user?.email }}
        </div>
        <div class="mx-1 my-1 h-px bg-gray-100" />
        <DropdownMenuItem
          data-test-id="account-menu-sign-out"
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
          @select="handleSignOut"
        >
          <icon-lucide-log-out class="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
```

- [ ] **Step 2: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/AccountMenu.vue
git commit -m "feat: add account menu dropdown with sign out"
```

---

## Chunk 3: Canvas Management & Trash

### Task 9: CanvasGrid + EmptyState

**Files:**
- Modify: `src/views/dashboard/CanvasGrid.vue`
- Create: `src/components/dashboard/EmptyState.vue`

- [ ] **Step 1: Create EmptyState component**

```vue
<script setup lang="ts">
defineProps<{
  title: string
  description: string
  actionLabel?: string
  actionDisabled?: boolean
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div data-test-id="empty-state" class="flex flex-col items-center justify-center py-20 text-center">
    <div class="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-100">
      <icon-lucide-file-plus class="size-6 text-gray-400" />
    </div>
    <h2 class="text-base font-semibold text-gray-900">{{ title }}</h2>
    <p class="mt-1 max-w-sm text-sm text-gray-500">{{ description }}</p>
    <button
      v-if="actionLabel"
      data-test-id="empty-state-action"
      class="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="actionDisabled"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
```

- [ ] **Step 2: Implement CanvasGrid**

```vue
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CanvasCard from '@/components/dashboard/CanvasCard.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import MoveToTrashDialog from '@/components/dashboard/MoveToTrashDialog.vue'
import { useCanvasesStore } from '@/stores/canvases'

import type { Canvas } from '@/types/kova/database'

const route = useRoute()
const router = useRouter()
const canvasesStore = useCanvasesStore()

const brandId = () => route.params.brandId as string

onMounted(() => {
  void canvasesStore.fetchCanvases(brandId())
})

watch(() => route.params.brandId, (newBrandId) => {
  if (typeof newBrandId === 'string') {
    void canvasesStore.fetchCanvases(newBrandId)
  }
})

async function handleNewCanvas(): Promise<void> {
  const canvas = await canvasesStore.createCanvas(brandId())
  void router.push(`/editor/${canvas.id}`)
}

function handleOpenCanvas(canvas: Canvas): void {
  void router.push(`/editor/${canvas.id}`)
}

async function handleRename(id: string, name: string): Promise<void> {
  await canvasesStore.renameCanvas(id, name)
}

async function handleDuplicate(id: string): Promise<void> {
  await canvasesStore.duplicateCanvas(id)
}
</script>

<template>
  <div data-test-id="canvas-grid-view">
    <EmptyState
      v-if="!canvasesStore.isLoading && canvasesStore.canvases.length === 0"
      title="Create your first canvas"
      description="Design beautiful emails with AI-powered tools. Start by creating a new canvas."
      action-label="Create canvas"
      @action="handleNewCanvas"
    />

    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))"
    >
      <!-- New Canvas card -->
      <button
        data-test-id="canvas-new-card"
        class="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
        @click="handleNewCanvas"
      >
        <icon-lucide-plus class="mb-2 size-8" />
        <span class="text-sm font-medium">New Canvas</span>
      </button>

      <!-- Existing canvas cards -->
      <CanvasCard
        v-for="canvas in canvasesStore.sortedCanvases"
        :key="canvas.id"
        :canvas="canvas"
        @open="handleOpenCanvas(canvas)"
        @rename="handleRename"
        @duplicate="handleDuplicate"
      />
    </div>

    <MoveToTrashDialog />
  </div>
</template>
```

- [ ] **Step 3: Create stub CanvasCard and MoveToTrashDialog**

`src/components/dashboard/CanvasCard.vue` (stub — implemented in Task 10):
```vue
<script setup lang="ts">
import type { Canvas } from '@/types/kova/database'

defineProps<{ canvas: Canvas }>()
defineEmits<{
  open: []
  rename: [id: string, name: string]
  duplicate: [id: string]
}>()
</script>

<template>
  <div data-test-id="canvas-card" class="rounded-xl border border-gray-200 p-2">
    <div class="h-32 rounded-lg bg-gray-100" />
    <p class="mt-2 truncate text-sm text-gray-900">{{ canvas.name }}</p>
  </div>
</template>
```

`src/components/dashboard/MoveToTrashDialog.vue` (stub — implemented in Task 11):
```vue
<template>
  <div />
</template>
```

- [ ] **Step 4: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`

- [ ] **Step 5: Commit**

```bash
git add src/views/dashboard/CanvasGrid.vue src/components/dashboard/EmptyState.vue src/components/dashboard/CanvasCard.vue src/components/dashboard/MoveToTrashDialog.vue
git commit -m "feat: add canvas grid with empty state and new canvas card"
```

---

### Task 10: CanvasCard with Context Menu

**Files:**
- Modify: `src/components/dashboard/CanvasCard.vue`

- [ ] **Step 1: Implement full CanvasCard with both ContextMenu and DropdownMenu**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useTimeAgo } from '@vueuse/core'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

import { useCanvasesStore } from '@/stores/canvases'

import type { Canvas } from '@/types/kova/database'

const props = defineProps<{ canvas: Canvas }>()

const emit = defineEmits<{
  open: []
  rename: [id: string, name: string]
  duplicate: [id: string]
}>()

const canvasesStore = useCanvasesStore()
const timeAgo = useTimeAgo(() => new Date(props.canvas.updated_at))

const isRenaming = ref(false)
const renameValue = ref('')

function startRename(): void {
  renameValue.value = props.canvas.name
  isRenaming.value = true
}

function commitRename(): void {
  const name = renameValue.value.trim()
  if (name && name !== props.canvas.name) {
    emit('rename', props.canvas.id, name)
  }
  isRenaming.value = false
}

function cancelRename(): void {
  isRenaming.value = false
}

function handleDuplicate(): void {
  emit('duplicate', props.canvas.id)
}

function handleMoveToTrash(): void {
  void canvasesStore.moveToTrash(props.canvas.id)
}
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <div
        :data-test-id="`canvas-card-${canvas.id}`"
        class="group cursor-pointer rounded-xl border border-gray-200 transition-shadow hover:shadow-md"
        @click="emit('open')"
      >
        <!-- Thumbnail -->
        <div class="relative h-36 overflow-hidden rounded-t-xl bg-gray-50">
          <img
            v-if="canvas.thumbnail_url"
            :src="canvas.thumbnail_url"
            :alt="canvas.name"
            class="size-full object-cover"
          />
          <div
            v-else
            class="flex size-full items-center justify-center text-sm text-gray-400"
          >
            <icon-lucide-file class="size-8" />
          </div>

          <!-- Kebab menu -->
          <DropdownMenuRoot>
            <DropdownMenuTrigger
              :data-test-id="`canvas-card-menu-${canvas.id}`"
              class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              @click.stop
            >
              <icon-lucide-more-horizontal class="size-4 text-gray-600" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                :side-offset="4"
                align="end"
                class="z-50 min-w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
              >
                <DropdownMenuItem
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
                  @select="emit('open')"
                >
                  <icon-lucide-external-link class="size-4" /> Open
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
                  @select="startRename"
                >
                  <icon-lucide-pencil class="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
                  @select="handleDuplicate"
                >
                  <icon-lucide-copy class="size-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
                <DropdownMenuItem
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 outline-none select-none data-[highlighted]:bg-red-50"
                  @select="handleMoveToTrash"
                >
                  <icon-lucide-trash-2 class="size-4" /> Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>

        <!-- Info -->
        <div class="px-3 py-2">
          <input
            v-if="isRenaming"
            :data-test-id="`canvas-card-rename-input-${canvas.id}`"
            v-model="renameValue"
            class="w-full rounded border border-gray-300 px-1 py-0.5 text-sm text-gray-900 outline-none focus:border-blue-500"
            autofocus
            @keydown.enter="commitRename"
            @keydown.escape="cancelRename"
            @blur="commitRename"
            @click.stop
          />
          <p
            v-else
            class="truncate text-sm font-medium text-gray-900"
          >
            {{ canvas.name }}
          </p>
          <p class="mt-0.5 text-xs text-gray-500">
            Edited {{ timeAgo }}
          </p>
        </div>
      </div>
    </ContextMenuTrigger>

    <!-- Right-click context menu (same items) -->
    <ContextMenuPortal>
      <ContextMenuContent class="z-50 min-w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
        <ContextMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
          @select="emit('open')"
        >
          <icon-lucide-external-link class="size-4" /> Open
        </ContextMenuItem>
        <ContextMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
          @select="startRename"
        >
          <icon-lucide-pencil class="size-4" /> Rename
        </ContextMenuItem>
        <ContextMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100"
          @select="handleDuplicate"
        >
          <icon-lucide-copy class="size-4" /> Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
        <ContextMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 outline-none select-none data-[highlighted]:bg-red-50"
          @select="handleMoveToTrash"
        >
          <icon-lucide-trash-2 class="size-4" /> Move to trash
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
```

- [ ] **Step 2: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CanvasCard.vue
git commit -m "feat: add canvas card with thumbnail, context menu, and inline rename"
```

---

### Task 11: MoveToTrashDialog

**Files:**
- Modify: `src/components/dashboard/MoveToTrashDialog.vue`

The dialog is triggered by setting a reactive canvas ref. CanvasGrid or CanvasCard can call a shared `confirmTrash(canvas)` function exposed via provide/inject or a composable. For simplicity, we use a Pinia-like pattern: the canvases store holds a `canvasToTrash` ref that the dialog watches.

- [ ] **Step 1: Add dialog state to canvases store**

Add these to `src/stores/canvases.ts`:

```ts
// After existing refs
const canvasToTrash = ref<Canvas | null>(null)

function confirmMoveToTrash(canvas: Canvas): void {
  canvasToTrash.value = canvas
}

function cancelMoveToTrash(): void {
  canvasToTrash.value = null
}

async function executeMoveToTrash(): Promise<void> {
  if (!canvasToTrash.value) return
  await moveToTrash(canvasToTrash.value.id)
  canvasToTrash.value = null
}
```

Add `canvasToTrash`, `confirmMoveToTrash`, `cancelMoveToTrash`, `executeMoveToTrash` to the store's return.

- [ ] **Step 2: Update CanvasCard to use confirmMoveToTrash**

In `src/components/dashboard/CanvasCard.vue`, change `handleMoveToTrash`:

```ts
function handleMoveToTrash(): void {
  canvasesStore.confirmMoveToTrash(props.canvas)
}
```

- [ ] **Step 3: Implement the dialog**

```vue
<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

import { useCanvasesStore } from '@/stores/canvases'

const canvasesStore = useCanvasesStore()
</script>

<template>
  <DialogRoot :open="!!canvasesStore.canvasToTrash" @update:open="canvasesStore.cancelMoveToTrash">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <DialogContent
        data-test-id="move-to-trash-dialog"
        class="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
      >
        <DialogTitle class="text-base font-semibold text-gray-900">
          Move file to trash
        </DialogTitle>
        <DialogDescription class="mt-2 text-sm text-gray-600">
          You're about to move
          <strong class="font-medium text-gray-900">{{ canvasesStore.canvasToTrash?.name }}</strong>
          to trash. You can restore it later from the Trash section.
        </DialogDescription>
        <div class="mt-6 flex justify-end gap-3">
          <DialogClose
            data-test-id="move-to-trash-cancel"
            class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Cancel
          </DialogClose>
          <button
            data-test-id="move-to-trash-confirm"
            class="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            @click="canvasesStore.executeMoveToTrash()"
          >
            Move to trash
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

- [ ] **Step 4: Run typecheck and existing tests**

Run: `cd kova-open-pencil-1 && bun run check && bun run test:unit`

- [ ] **Step 5: Commit**

```bash
git add src/stores/canvases.ts src/components/dashboard/CanvasCard.vue src/components/dashboard/MoveToTrashDialog.vue
git commit -m "feat: add move-to-trash confirmation dialog with Reka UI Dialog"
```

---

### Task 12: TrashView + TrashCard

**Files:**
- Modify: `src/views/dashboard/TrashView.vue`
- Create: `src/components/dashboard/TrashCard.vue`

- [ ] **Step 1: Create TrashCard component**

```vue
<script setup lang="ts">
import { useTimeAgo } from '@vueuse/core'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

import type { Canvas } from '@/types/kova/database'

const props = defineProps<{ canvas: Canvas }>()

const emit = defineEmits<{
  restore: [id: string]
  permanentlyDelete: [id: string]
}>()

const trashedAgo = useTimeAgo(() => new Date(props.canvas.trashed_at ?? props.canvas.updated_at))

const menuItemClass = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100'
const deleteItemClass = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 outline-none select-none data-[highlighted]:bg-red-50'
const menuContentClass = 'z-50 min-w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg'
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <div
        :data-test-id="`trash-card-${canvas.id}`"
        class="group rounded-xl border border-gray-200"
      >
        <!-- Thumbnail -->
        <div class="relative h-36 overflow-hidden rounded-t-xl bg-gray-50">
          <img
            v-if="canvas.thumbnail_url"
            :src="canvas.thumbnail_url"
            :alt="canvas.name"
            class="size-full object-cover"
          />
          <div v-else class="flex size-full items-center justify-center text-gray-400">
            <icon-lucide-file class="size-8" />
          </div>

          <!-- Kebab menu -->
          <DropdownMenuRoot>
            <DropdownMenuTrigger
              class="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              @click.stop
            >
              <icon-lucide-more-horizontal class="size-4 text-gray-600" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent :side-offset="4" align="end" :class="menuContentClass">
                <DropdownMenuItem :class="menuItemClass" @select="emit('restore', canvas.id)">
                  <icon-lucide-undo-2 class="size-4" /> Restore
                </DropdownMenuItem>
                <DropdownMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
                <DropdownMenuItem :class="deleteItemClass" @select="emit('permanentlyDelete', canvas.id)">
                  <icon-lucide-trash-2 class="size-4" /> Permanently delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>

        <!-- Info -->
        <div class="px-3 py-2">
          <p class="truncate text-sm font-medium text-gray-900">{{ canvas.name }}</p>
          <p class="mt-0.5 text-xs text-gray-500">Trashed {{ trashedAgo }}</p>
        </div>
      </div>
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent :class="menuContentClass">
        <ContextMenuItem :class="menuItemClass" @select="emit('restore', canvas.id)">
          <icon-lucide-undo-2 class="size-4" /> Restore
        </ContextMenuItem>
        <ContextMenuSeparator class="mx-1 my-1 h-px bg-gray-100" />
        <ContextMenuItem :class="deleteItemClass" @select="emit('permanentlyDelete', canvas.id)">
          <icon-lucide-trash-2 class="size-4" /> Permanently delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
```

- [ ] **Step 2: Implement TrashView**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'

import EmptyState from '@/components/dashboard/EmptyState.vue'
import TrashCard from '@/components/dashboard/TrashCard.vue'
import { useCanvasesStore } from '@/stores/canvases'

const canvasesStore = useCanvasesStore()

onMounted(() => {
  void canvasesStore.fetchTrashed()
})

async function handleRestore(id: string): Promise<void> {
  await canvasesStore.restoreCanvas(id)
}

async function handlePermanentlyDelete(id: string): Promise<void> {
  await canvasesStore.permanentlyDelete(id)
}
</script>

<template>
  <div data-test-id="trash-view">
    <EmptyState
      v-if="!canvasesStore.isLoading && canvasesStore.trashedCanvases.length === 0"
      title="Trash is empty"
      description="Files you move to trash will appear here."
    />

    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))"
    >
      <TrashCard
        v-for="canvas in canvasesStore.sortedTrashed"
        :key="canvas.id"
        :canvas="canvas"
        @restore="handleRestore"
        @permanently-delete="handlePermanentlyDelete"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`

- [ ] **Step 4: Commit**

```bash
git add src/views/dashboard/TrashView.vue src/components/dashboard/TrashCard.vue
git commit -m "feat: add trash view with restore and permanent delete"
```

---

## Chunk 4: Assets Placeholder, Thumbnails & Editor Integration

### Task 13: BrandAssetsView Placeholder

**Files:**
- Modify: `src/views/dashboard/BrandAssetsView.vue`

- [ ] **Step 1: Implement placeholder with EmptyState**

```vue
<script setup lang="ts">
import EmptyState from '@/components/dashboard/EmptyState.vue'
</script>

<template>
  <div data-test-id="brand-assets-view">
    <EmptyState
      title="Upload your first brand asset"
      description="Build your brand image library — logos, icons, and photos that your team can use across all email campaigns."
      action-label="Coming soon"
      action-disabled
    />
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/dashboard/BrandAssetsView.vue
git commit -m "feat: add brand assets placeholder view"
```

---

### Task 14: Thumbnail Capture Utility (TDD)

**Files:**
- Create: `tests/unit/utils/capture-thumbnail.test.ts`
- Create: `src/utils/capture-thumbnail.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, test, expect, beforeEach, mock, spyOn } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Mock supabase storage
const mockUpload = mock(() => Promise.resolve({ error: null }))
const mockGetPublicUrl = mock(() => ({ data: { publicUrl: 'https://example.com/thumb.png' } }))
const mockStorageFrom = mock(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
}))

const mockUpdate = mock(() => ({
  eq: () => ({
    select: () => ({
      single: () => Promise.resolve({ data: {}, error: null }),
    }),
  }),
}))

const mockFrom = mock(() => ({
  update: mockUpdate,
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}))

const mockAuthStore = { user: { id: 'user-1' } }
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const { captureThumbnail } = await import('@/utils/capture-thumbnail')

describe('captureThumbnail', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUpload.mockClear()
    mockGetPublicUrl.mockClear()
    mockStorageFrom.mockClear()
    mockFrom.mockClear()
    mockUpdate.mockClear()
  })

  test('does nothing if no canvas element found', async () => {
    // No canvas element in DOM
    await captureThumbnail('c1')
    expect(mockUpload).not.toHaveBeenCalled()
  })

  test('does nothing if user is not authenticated', async () => {
    mockAuthStore.user = null as any
    await captureThumbnail('c1')
    expect(mockUpload).not.toHaveBeenCalled()
    mockAuthStore.user = { id: 'user-1' } as any
  })

  test('catches errors silently', async () => {
    const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {})
    mockAuthStore.user = { id: 'user-1' } as any

    // Mock a canvas element that throws on toBlob
    const fakeCanvas = {
      toBlob: (_cb: (blob: Blob | null) => void) => {
        _cb(null)
      },
    }
    spyOn(document, 'querySelector').mockReturnValueOnce(fakeCanvas as any)

    await captureThumbnail('c1')
    expect(mockUpload).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/utils/capture-thumbnail.test.ts`
Expected: FAIL — `@/utils/capture-thumbnail` module not found.

- [ ] **Step 3: Implement capture-thumbnail utility**

```ts
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const THUMBNAIL_WIDTH = 400
const THUMBNAIL_HEIGHT = 300

function resizeBlob(blob: Blob, width: number, height: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(null)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((resized) => resolve(resized), 'image/png')
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

export async function captureThumbnail(canvasId: string): Promise<void> {
  try {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) return

    const canvasEl = document.querySelector<HTMLCanvasElement>(
      '[data-test-id="editor-canvas"] canvas, canvas.skia',
    )
    if (!canvasEl) return

    const blob = await canvasToBlob(canvasEl)
    if (!blob) return

    const resized = await resizeBlob(blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
    if (!resized) return

    const path = `${userId}/${canvasId}.png`
    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(path, resized, { upsert: true, contentType: 'image/png' })

    if (uploadError) {
      console.warn('Thumbnail upload failed:', uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path)

    await supabase
      .from('canvases')
      .update({ thumbnail_url: urlData.publicUrl })
      .eq('id', canvasId)
  } catch (err) {
    console.warn('Thumbnail capture failed:', err)
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/utils/capture-thumbnail.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/capture-thumbnail.ts tests/unit/utils/capture-thumbnail.test.ts
git commit -m "feat: add thumbnail capture utility with resize and upload"
```

---

### Task 15: EditorView Integration

**Files:**
- Modify: `src/views/EditorView.vue`

The editor view needs to:
1. Read `:canvasId` from route params
2. Load canvas from canvases store
3. Load associated brand from brands store
4. Sync canvas name to `store.state.documentName`
5. Redirect if canvas doesn't exist or is trashed
6. Capture thumbnail on `onBeforeRouteLeave`

- [ ] **Step 1: Add canvas/brand loading and name sync to EditorView**

Add these imports and logic to `<script setup>` in `src/views/EditorView.vue`:

```ts
// Add imports (near top, with existing imports)
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useBrandsStore } from '@/stores/brands'
import { useCanvasesStore } from '@/stores/canvases'
import { captureThumbnail } from '@/utils/capture-thumbnail'
```

Add this logic block after the existing `useMenu()` call. Note: `useRouter()` MUST be called synchronously at the top level of `<script setup>`, not inside conditionals or async callbacks.

```ts
// Canvas integration (only for non-demo routes with canvasId)
const router = useRouter()
const canvasId = route.params.canvasId as string | undefined

if (canvasId) {
  const canvasesStore = useCanvasesStore()
  const brandsStore = useBrandsStore()

  // Track the initially loaded name to prevent redundant sync on mount
  let loadedName = ''

  onMounted(async () => {
    // Fetch canvas record directly (search active + trashed)
    const { data } = await import('@/lib/supabase').then((m) =>
      m.supabase.from('canvases').select('*').eq('id', canvasId).single()
    )

    if (!data || data.trashed_at) {
      void router.replace('/dashboard')
      return
    }

    // Set document name from canvas record
    loadedName = data.name
    store.state.documentName = data.name

    // Load the associated brand
    await brandsStore.fetchBrands()
    if (data.brand_id) {
      brandsStore.selectBrand(data.brand_id)
    }
  })

  // Sync name changes back to canvas record, skipping the initial load assignment
  watch(
    () => store.state.documentName,
    (newName) => {
      if (newName && canvasId && newName !== loadedName) {
        void canvasesStore.renameCanvas(canvasId, newName)
      }
      // After first real user edit, clear the guard so subsequent renames work normally
      if (newName !== loadedName) {
        loadedName = ''
      }
    },
  )

  // Capture thumbnail on leave (non-blocking)
  onBeforeRouteLeave(() => {
    void captureThumbnail(canvasId)
  })
}
```

**Note:** Import `watch` at the top alongside existing vue imports if not already imported.

- [ ] **Step 2: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`

- [ ] **Step 3: Run all tests**

Run: `cd kova-open-pencil-1 && bun run test:unit`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/views/EditorView.vue
git commit -m "feat: integrate editor with canvas store, name sync, and thumbnail capture"
```

---

### Task 16: AppMenu "Back to Dashboard"

**Files:**
- Modify: `src/components/AppMenu.vue`

- [ ] **Step 1: Add "Back to Dashboard" item to the File menu**

In `src/components/AppMenu.vue`, add at the top of the `fileMenu` array (before the existing "New" item):

```ts
// Add import at top of script
import { getRouter } from '@/router'
```

Add as first item in `fileMenu`:
```ts
{
  label: 'Back to Dashboard',
  action: () => void getRouter().push('/dashboard'),
},
{ separator: true },
```

This adds a "Back to Dashboard" link as the first item in the File menu, followed by a separator before the existing File menu items.

- [ ] **Step 2: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`

- [ ] **Step 3: Commit**

```bash
git add src/components/AppMenu.vue
git commit -m "feat: add Back to Dashboard item to editor File menu"
```

---

### Task 17: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `cd kova-open-pencil-1 && bun run test:unit`
Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors.

- [ ] **Step 3: Run lint and format**

Run: `cd kova-open-pencil-1 && bun run format`

- [ ] **Step 4: Run dev server and manual smoke test**

Run: `cd kova-open-pencil-1 && bun run dev`

Manual checks:
- [ ] `/dashboard` loads and redirects to first brand
- [ ] Sidebar shows brands, "New Brand", and "Trash"
- [ ] Creating a new brand works and navigates to it
- [ ] Creating a new canvas works and navigates to editor
- [ ] Canvas card shows name, timestamp, context menu
- [ ] Move to trash shows dialog, then moves canvas
- [ ] Trash view shows trashed canvases with restore/delete
- [ ] Editor shows "Back to Dashboard" in File menu
- [ ] Account menu shows email and sign out works

- [ ] **Step 5: Commit any format/lint fixes**

```bash
git add -A
git commit -m "chore: lint and format M2 dashboard code"
```
