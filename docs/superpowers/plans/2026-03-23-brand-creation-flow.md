# Brand Creation Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the extraction 401 bug (missing auth header + logo_url mapping) and redesign brand creation from a dialog to a single-click action with a 4-state extract slot on the settings page.

**Architecture:** A shared `getAuthHeaders()` utility replaces duplicated auth header logic. Brand creation bypasses the dialog — "Add Brand" creates "Untitled Brand" in the DB and redirects to settings. The settings page gets a 4-state extract slot (disabled → enabled → extracting → re-extract) between the URL field and Logo section.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Pinia, Reka UI (Dialog), Tailwind CSS 4, bun:test, @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-03-23-brand-creation-flow-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/utils/api-headers.ts` | Shared `getAuthHeaders()` — returns `Content-Type` + `Authorization` headers |
| Create | `tests/unit/utils/api-headers.test.ts` | Unit tests for `getAuthHeaders` |
| Create | `tests/unit/components/brand-settings-extract.test.ts` | Unit tests for the 4-state extract slot |
| Modify | `src/components/onboarding/ExtractionStep.vue:92-99` | Replace inline `getAuthHeaders()` with import from shared utility |
| Modify | `src/views/dashboard/BrandSettingsView.vue` | Auth fix, logo_url mapping, 4-state extract slot, auto-focus |
| Modify | `src/components/dashboard/BrandList.vue` | Remove dialog, single-click brand creation |
| Modify | `src/views/DashboardView.vue:38-45` | Update `handleNewBrand()` to match new pattern |
| Delete | `src/components/dashboard/NewBrandDialog.vue` | No longer needed (replaced by single-click) |
| Delete | `tests/unit/components/new-brand-dialog.test.ts` | Tests for deleted component |

**Note:** `createBrandFull` in `src/stores/brands.ts` must be kept — it is still used by `src/composables/useOnboardingComplete.ts`.

---

## Chunk 1: Auth Header Utility + Bug Fixes

### Task 1: Create shared `getAuthHeaders` utility

**Files:**
- Create: `src/utils/api-headers.ts`
- Create: `tests/unit/utils/api-headers.test.ts`

**Why:** Both `BrandSettingsView.vue` and `ExtractionStep.vue` need auth headers for `/api/extract-brand`. Currently `ExtractionStep.vue` has its own inline version and `BrandSettingsView.vue` is missing it entirely (the 401 bug). Extract into a shared utility.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/utils/api-headers.test.ts`:

```ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useAuthStore } = await import('@/stores/auth')
const { getAuthHeaders } = await import('@/utils/api-headers')

describe('getAuthHeaders', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('returns Content-Type when no session exists', () => {
    const headers = getAuthHeaders()
    expect(headers).toEqual({ 'Content-Type': 'application/json' })
  })

  test('returns Authorization header when session has access_token', () => {
    const authStore = useAuthStore()
    authStore.session = { access_token: 'test-token-123' } as any
    const headers = getAuthHeaders()
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token-123',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/utils/api-headers.test.ts`
Expected: FAIL — `@/utils/api-headers` module not found

- [ ] **Step 3: Write the implementation**

Create `src/utils/api-headers.ts`:

```ts
import { useAuthStore } from '@/stores/auth'

// Must be called within a Pinia-active context (component setup or composable)
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authStore = useAuthStore()
  const token = authStore.session?.access_token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/utils/api-headers.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/utils/api-headers.ts tests/unit/utils/api-headers.test.ts
git commit -m "feat: add shared getAuthHeaders utility"
```

---

### Task 2: Refactor ExtractionStep to use shared utility

**Files:**
- Modify: `src/components/onboarding/ExtractionStep.vue:92-99`

**Why:** Deduplicate — `ExtractionStep.vue` has an identical inline `getAuthHeaders()`. Replace with the shared import.

- [ ] **Step 1: Run existing tests to confirm green baseline**

Run: `cd kova-open-pencil-1 && bun test tests/unit/`
Expected: All tests PASS

- [ ] **Step 2: Replace inline function with import**

In `src/components/onboarding/ExtractionStep.vue`:

Remove the inline function (lines 92-99):
```ts
// DELETE this entire function:
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = authStore.session?.access_token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}
```

Remove the now-unused `authStore` const (line 10) and the `useAuthStore` import (line 5), since `authStore` is only used inside the deleted `getAuthHeaders()`:
```ts
// DELETE line 5:
import { useAuthStore } from '@/stores/auth'
// DELETE line 10:
const authStore = useAuthStore()
```

Add import at the top of `<script setup>` (after existing imports):
```ts
import { getAuthHeaders } from '@/utils/api-headers'
```

- [ ] **Step 3: Run tests to verify nothing broke**

Run: `cd kova-open-pencil-1 && bun test tests/unit/`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
cd kova-open-pencil-1
git add src/components/onboarding/ExtractionStep.vue
git commit -m "refactor: use shared getAuthHeaders in ExtractionStep"
```

---

### Task 3: Fix extraction auth header + logo_url mapping in BrandSettingsView

**Files:**
- Modify: `src/views/dashboard/BrandSettingsView.vue:1-8,106-133`

**Why:** This fixes the two bugs: (1) missing `Authorization` header → 401, (2) missing `logo_url` mapping from extraction response.

- [ ] **Step 1: Add import and fix auth header**

In `src/views/dashboard/BrandSettingsView.vue`:

Add import (after line 8, with the other imports):
```ts
import { getAuthHeaders } from '@/utils/api-headers'
```

Replace line 108 (the headers in the fetch call inside `confirmReExtract`):
```ts
// BEFORE:
headers: { 'Content-Type': 'application/json' },

// AFTER:
headers: getAuthHeaders(),
```

- [ ] **Step 2: Add logo_url mapping**

In `src/views/dashboard/BrandSettingsView.vue`, inside the `confirmReExtract` function, after the voice mapping (after line 127, before the toast), add:

```ts
    // Map logo_url if present
    if (typeof data.logo_url === 'string' && data.logo_url) {
      logoPreviewUrl.value = data.logo_url
      await brandsStore.updateBrand(brand.value!.id, { logo_url: data.logo_url })
    }
```

- [ ] **Step 3: Run lint and type check**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/views/dashboard/BrandSettingsView.vue
git commit -m "fix: add auth header and logo_url mapping to brand extraction"
```

---

## Chunk 2: Extract Slot UI + Single-Click Creation

### Task 4: Add 4-state extract slot to BrandSettingsView

**Files:**
- Modify: `src/views/dashboard/BrandSettingsView.vue`
- Create: `tests/unit/components/brand-settings-extract.test.ts`

**Why:** Replace the inline "Re-extract" button next to the URL field with a dedicated extract section that has 4 states: disabled, enabled, extracting, and done.

**Reference:** See spec section "Extract slot (4-state UI)" for exact states, `data-test-id` values, and design tokens.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/brand-settings-extract.test.ts`:

```ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Passthrough for Reka UI dialog stubs
const Passthrough = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => slots.default?.()
  },
})

// --- Mocks ---

const mockUpdateBrand = mock(() => Promise.resolve())

// Use a reactive ref so mountWithBrand can change the value after import
const mockSelectedBrand = ref<Record<string, unknown> | null>(null)

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mock(() => ({})),
    storage: {
      from: mock(() => ({
        upload: mock(() => Promise.resolve({ error: null })),
        getPublicUrl: () => ({ data: { publicUrl: 'https://url' } }),
      })),
    },
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({
    selectedBrand: mockSelectedBrand,
    updateBrand: mockUpdateBrand,
  }),
}))

mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1' },
    session: { access_token: 'test-token' },
  }),
}))

mock.module('@/utils/api-headers', () => ({
  getAuthHeaders: () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  }),
}))

mock.module('reka-ui', () => ({
  DialogRoot: Passthrough,
  DialogPortal: Passthrough,
  DialogOverlay: defineComponent({ setup() { return () => h('div') } }),
  DialogContent: Passthrough,
  DialogTitle: Passthrough,
  DialogDescription: Passthrough,
  DialogClose: Passthrough,
}))

mock.module('vue-router', () => ({
  useRoute: () => ({ params: { brandId: 'b1' } }),
  useRouter: () => ({ push: mock(() => {}) }),
}))

mock.module('@/composables/use-toast', () => ({
  toast: { show: mock(() => {}) },
}))

const successResponse = {
  colors: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff', background: '#ffffff' },
  fonts: { heading: 'Inter', body: 'Georgia' },
  writing_style: 'Professional tone',
  logo_url: 'https://example.com/logo.png',
}

const mockFetch = mock(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(successResponse),
  })
)
globalThis.fetch = mockFetch as any

// Import after mocks
const { default: BrandSettingsView } = await import(
  '@/views/dashboard/BrandSettingsView.vue'
)

function mountWithBrand(brandOverrides: Record<string, unknown> = {}) {
  mockSelectedBrand.value = {
    id: 'b1',
    user_id: 'user-1',
    name: 'Test Brand',
    url: null,
    colors: null,
    fonts: null,
    logo_url: null,
    voice: null,
    industry: null,
    ...brandOverrides,
  }

  return mount(BrandSettingsView, {
    global: {
      stubs: {
        BrandColorPicker: defineComponent({
          props: ['modelValue', 'label'],
          setup() { return () => h('div') },
        }),
      },
    },
  })
}

describe('BrandSettingsView extract slot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUpdateBrand.mockClear()
    mockFetch.mockClear()
    mockSelectedBrand.value = null
  })

  test('extract button is disabled when URL is empty', () => {
    const wrapper = mountWithBrand({ url: null })
    const btn = wrapper.find('[data-test-id="brand-settings-extract-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('extract button is enabled when URL is present and no prior extraction', () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    const btn = wrapper.find('[data-test-id="brand-settings-extract-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  test('clicking extract calls runExtraction directly (no dialog) on first use', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    // Should call fetch directly, not show a dialog
    expect(mockFetch).toHaveBeenCalledWith('/api/extract-brand', expect.objectContaining({
      method: 'POST',
    }))
    // No confirmation dialog should be visible
    const dialog = wrapper.find('[data-test-id="brand-settings-reextract-confirm"]')
    expect(dialog.exists()).toBe(false)
  })

  test('progress banner shows during extraction', async () => {
    let resolveResponse!: (v: unknown) => void
    mockFetch.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveResponse = resolve })
    )

    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    const banner = wrapper.find('[data-test-id="brand-settings-extract-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('example.com')

    // Resolve to clean up
    resolveResponse({ ok: true, json: () => Promise.resolve(successResponse) })
    await flushPromises()
  })

  test('after extraction, re-extract button appears', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    const reextract = wrapper.find('[data-test-id="brand-settings-reextract"]')
    expect(reextract.exists()).toBe(true)
  })

  test('shows re-extract button when brand has colors (hasExtractedBefore)', () => {
    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: { primary: '#000', secondary: '#111', accent: '#222', background: '#fff' },
    })
    const btn = wrapper.find('[data-test-id="brand-settings-reextract"]')
    expect(btn.exists()).toBe(true)
  })

  test('clicking re-extract opens confirmation dialog', async () => {
    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: { primary: '#000', secondary: '#111', accent: '#222', background: '#fff' },
    })
    await wrapper.find('[data-test-id="brand-settings-reextract"]').trigger('click')
    await flushPromises()

    const confirmBtn = wrapper.find('[data-test-id="brand-settings-reextract-confirm"]')
    expect(confirmBtn.exists()).toBe(true)
  })

  test('confirming re-extract calls runExtraction', async () => {
    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: { primary: '#000', secondary: '#111', accent: '#222', background: '#fff' },
    })
    await wrapper.find('[data-test-id="brand-settings-reextract"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-test-id="brand-settings-reextract-confirm"]').trigger('click')
    expect(mockFetch).toHaveBeenCalledWith('/api/extract-brand', expect.objectContaining({
      method: 'POST',
    }))
  })

  test('extraction fetch includes Authorization header', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    expect(mockFetch).toHaveBeenCalledWith('/api/extract-brand', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token',
      }),
    }))
  })

  test('logo_url from extraction response is mapped to brand', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    expect(mockUpdateBrand).toHaveBeenCalledWith('b1', { logo_url: 'https://example.com/logo.png' })
  })

  test('null logo_url from extraction does not clear existing logo', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...successResponse, logo_url: null }),
      })
    )

    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: null,
      fonts: null,
      logo_url: 'https://existing-logo.png',
    })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    // updateBrand should NOT be called with logo_url
    const logoUpdateCalls = mockUpdateBrand.mock.calls.filter(
      (call) => (call[1] as Record<string, unknown>)?.logo_url !== undefined
    )
    expect(logoUpdateCalls).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/components/brand-settings-extract.test.ts`
Expected: FAIL — `brand-settings-extract-button` not found (current UI uses different `data-test-id`)

- [ ] **Step 3: Refactor BrandSettingsView script — add `hasExtractedBefore` and `runExtraction()`**

In `src/views/dashboard/BrandSettingsView.vue` `<script setup>`:

Add `hasExtractedBefore` and `extractDomain` computeds (after `isExtracting` ref, around line 95):
```ts
const hasExtractedBefore = computed(() => !!(brand.value?.colors || brand.value?.fonts))

const extractDomain = computed(() => {
  if (!url.value) return 'website'
  try {
    return new URL(url.value.startsWith('http') ? url.value : `https://${url.value}`).hostname
  } catch {
    return 'website'
  }
})
```

Rename `confirmReExtract` to `runExtraction` and remove the dialog-closing line. Create a new `confirmReExtract` that opens the dialog:

Replace the existing `confirmReExtract` function (lines 101-134) with:

```ts
async function runExtraction(): Promise<void> {
  if (!brand.value?.url) return
  isExtracting.value = true
  showReExtractDialog.value = false
  try {
    const res = await fetch('/api/extract-brand', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url: brand.value.url }),
    })
    if (!res.ok) throw new Error('Extraction failed')
    const data = await res.json()

    // Map extraction response to brand fields with validation
    if (data.colors) {
      if (isValidHex(data.colors.primary)) primaryColor.value = data.colors.primary
      if (isValidHex(data.colors.secondary)) secondaryColor.value = data.colors.secondary
      if (isValidHex(data.colors.accent)) accentColor.value = data.colors.accent
      if (isValidHex(data.colors.background)) backgroundColor.value = data.colors.background
    }
    if (data.fonts) {
      if (typeof data.fonts.heading === 'string') headingFont.value = data.fonts.heading
      if (typeof data.fonts.body === 'string') bodyFont.value = data.fonts.body
    }
    if (typeof data.writing_style === 'string') {
      voice.value = data.writing_style
    }
    // Map logo_url if present (don't clear existing logo on null)
    if (typeof data.logo_url === 'string' && data.logo_url && brand.value) {
      logoPreviewUrl.value = data.logo_url
      await brandsStore.updateBrand(brand.value.id, { logo_url: data.logo_url })
    }
    toast.show('Brand data extracted')
  } catch {
    toast.show('Extraction failed', 'error')
  } finally {
    isExtracting.value = false
  }
}

function confirmReExtract(): void {
  showReExtractDialog.value = true
}
```

Add auto-focus logic. Add a template ref and watch:

```ts
import { ref, watch, computed, nextTick, onMounted } from 'vue'
// (update existing import to include nextTick and onMounted if not already there)

const nameInputRef = ref<HTMLInputElement | null>(null)

watch(brand, async (b) => {
  if (b?.name === 'Untitled Brand') {
    await nextTick()
    nameInputRef.value?.focus()
    nameInputRef.value?.select()
  }
}, { immediate: true })
```

- [ ] **Step 4: Rewrite the template extract section**

In the template, simplify the URL field area. The current template (around lines 209-228) wraps the URL input and re-extract button in `<div class="flex gap-2">`. Remove the `<div class="flex gap-2">` wrapper and the re-extract `<button>` inside it, but keep the label and input within the existing `<div class="grid grid-cols-[160px_1fr]">` grid layout. The result:

```html
        <label class="pt-2 text-sm font-medium text-gray-700">Website URL</label>
        <input
          v-model="url"
          data-test-id="brand-settings-url"
          type="url"
          placeholder="https://example.com"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
```

Note: The `flex-1` class is no longer needed on the input since the `<div class="flex gap-2">` wrapper is removed. The input now sits directly in the grid cell.

Add the extract slot section after the closing `</section>` of the Brand Identity section and before the Logo `<section>`. This is a new `<section>`:

```html
    <!-- Extract slot -->
    <section class="space-y-4">
      <!-- State: Extracting — progress banner -->
      <div
        v-if="isExtracting"
        data-test-id="brand-settings-extract-banner"
        role="status"
        aria-live="polite"
        class="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
      >
        <icon-lucide-loader-2 class="size-4 shrink-0 animate-spin" />
        Analyzing {{ extractDomain }} — extracting colors, fonts, logo, and voice...
      </div>

      <!-- State: Done — re-extract button -->
      <button
        v-else-if="hasExtractedBefore"
        data-test-id="brand-settings-reextract"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        @click="confirmReExtract"
      >
        <icon-lucide-sparkles class="mr-1.5 inline-block size-4" />
        Re-extract
      </button>

      <!-- State: Has URL — enabled extract button -->
      <button
        v-else-if="url"
        data-test-id="brand-settings-extract-button"
        class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        @click="runExtraction"
      >
        <icon-lucide-sparkles class="mr-1.5 inline-block size-4" />
        Extract from website
      </button>

      <!-- State: No URL — disabled extract button -->
      <button
        v-else
        data-test-id="brand-settings-extract-button"
        disabled
        aria-disabled="true"
        class="cursor-not-allowed rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white opacity-50"
      >
        <icon-lucide-sparkles class="mr-1.5 inline-block size-4" />
        Extract from website
      </button>
    </section>
```

Add `ref="nameInputRef"` to the name input element:

```html
        <input
          ref="nameInputRef"
          v-model="name"
          data-test-id="brand-settings-name"
          ...
```

Update the re-extract dialog's confirm button to call `runExtraction` instead of `confirmReExtract`:

```html
            <button
              data-test-id="brand-settings-reextract-confirm"
              class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              @click="runExtraction"
            >
              Re-extract
            </button>
```

- [ ] **Step 5: Run lint and type check**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors

- [ ] **Step 6: Run all tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
cd kova-open-pencil-1
git add src/views/dashboard/BrandSettingsView.vue tests/unit/components/brand-settings-extract.test.ts
git commit -m "feat: add 4-state extract slot with auth fix and auto-focus"
```

---

### Task 5: Single-click brand creation in BrandList

**Files:**
- Modify: `src/components/dashboard/BrandList.vue`

**Why:** Remove the dialog. "Add Brand" now creates "Untitled Brand" in the DB and redirects to settings.

- [ ] **Step 1: Rewrite BrandList.vue**

Replace the full `<script setup>` in `src/components/dashboard/BrandList.vue`:

```ts
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBrandsStore } from '@/stores/brands'
import { toast } from '@/composables/use-toast'

const route = useRoute()
const router = useRouter()
const brandsStore = useBrandsStore()

const isCreating = ref(false)

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

function navigateToSettings(): void {
  void router.push('/dashboard/settings')
}

async function handleAddBrand(): Promise<void> {
  if (isCreating.value) return
  isCreating.value = true
  try {
    const brand = await brandsStore.createBrand('Untitled Brand')
    void router.push(`/dashboard/${brand.id}/settings`)
  } catch {
    toast.show('Failed to create brand', 'error')
  } finally {
    isCreating.value = false
  }
}
</script>
```

In the template, remove the `<NewBrandDialog>` component (line 109) entirely.

Update the "Add Brand" button to call `handleAddBrand` and disable during creation:

```html
      <button
        data-test-id="brand-new-button"
        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
        :disabled="isCreating"
        @click="handleAddBrand"
      >
        <icon-lucide-plus class="size-4" />
        {{ isCreating ? 'Creating…' : 'Add Brand' }}
      </button>
```

- [ ] **Step 2: Run lint and type check**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/`
Expected: All tests PASS (the `new-brand-dialog.test.ts` tests still pass since that component file hasn't been deleted yet)

- [ ] **Step 4: Commit**

```bash
cd kova-open-pencil-1
git add src/components/dashboard/BrandList.vue
git commit -m "feat: replace brand dialog with single-click creation"
```

---

## Chunk 3: Consistency + Cleanup

### Task 6: Update DashboardView empty-state creation

**Files:**
- Modify: `src/views/DashboardView.vue:38-45`

**Why:** The empty-state "New Brand" button has a parallel creation path that uses "My Brand" and navigates to the canvas grid. Must match the new pattern.

- [ ] **Step 1: Update `handleNewBrand` in DashboardView.vue**

In `src/views/DashboardView.vue`, replace the `handleNewBrand` function (lines 38-45):

```ts
async function handleNewBrand(): Promise<void> {
  try {
    const brand = await brandsStore.createBrand('Untitled Brand')
    void router.push(`/dashboard/${brand.id}/settings`)
  } catch (error) {
    console.error('Failed to create brand:', error)
  }
}
```

Changes: `'My Brand'` → `'Untitled Brand'`, `/dashboard/${brand.id}` → `/dashboard/${brand.id}/settings`

- [ ] **Step 2: Run lint and type check**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd kova-open-pencil-1
git add src/views/DashboardView.vue
git commit -m "fix: align empty-state brand creation with new single-click pattern"
```

---

### Task 7: Delete NewBrandDialog and its tests

**Files:**
- Delete: `src/components/dashboard/NewBrandDialog.vue`
- Delete: `tests/unit/components/new-brand-dialog.test.ts`

**Why:** No longer imported anywhere after Task 5 removed it from BrandList. The `createBrandFull` store method is still used by `useOnboardingComplete.ts` — do not remove it.

- [ ] **Step 1: Verify no remaining imports**

Run: `cd kova-open-pencil-1 && grep -r "NewBrandDialog" src/ tests/`

Expected: Only hits in the two files being deleted (no remaining imports in `BrandList.vue` after Task 5).

- [ ] **Step 2: Delete the files**

```bash
cd kova-open-pencil-1
rm src/components/dashboard/NewBrandDialog.vue
rm tests/unit/components/new-brand-dialog.test.ts
```

- [ ] **Step 3: Run all tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/`
Expected: All tests PASS

- [ ] **Step 4: Run lint and type check**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add -u
git commit -m "chore: delete NewBrandDialog (replaced by single-click creation)"
```

---

### Task 8: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full quality gate**

Run: `cd kova-open-pencil-1 && bun run check && bun test tests/unit/`
Expected: All lint, type checks, and tests pass

- [ ] **Step 2: Verify no regressions in related tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/brands.test.ts tests/unit/utils/api-headers.test.ts tests/unit/components/brand-settings-extract.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Check for any remaining references to deleted code**

Run: `cd kova-open-pencil-1 && grep -r "NewBrandDialog\|showNewBrandDialog\|new-brand-dialog" src/ tests/ --include='*.ts' --include='*.vue'`
Expected: No matches
