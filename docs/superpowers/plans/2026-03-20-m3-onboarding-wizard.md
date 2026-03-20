# M3: Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 7-screen onboarding wizard for first-time Kova users: collect name, brand details, extract brand identity from URL, review/edit, then create brand + canvas and redirect to editor.

**Architecture:** Split-screen layout (38% light left / 62% dark right). Composable-driven state management (`useOnboardingState`) — no Pinia, no persistence (refresh = restart). Screens 1–4 show email wireframe on right; Screens 5–6 show live brand card. Completion saves to Supabase and redirects to editor. Two serverless API endpoints for brand extraction (Firecrawl + Claude Vision).

**Tech Stack:** Vue 3 Composition API, Tailwind CSS 4, Pinia (for stores only), Supabase (DB + Storage), Firecrawl (scraping), Claude API (vision analysis), bun:test

**Design Spec:** `docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md` (source of truth)

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/composables/useOnboardingState.ts` | Reactive wizard state, step navigation, validation |
| `src/components/onboarding/WelcomeStep.vue` | Screen 1: logo, heading, "Get Started" CTA |
| `src/components/onboarding/NameStep.vue` | Screen 2: user name input |
| `src/components/onboarding/BrandNameStep.vue` | Screen 3: brand name input |
| `src/components/onboarding/BrandUrlStep.vue` | Screen 4: URL input + "enter manually" skip |
| `src/components/onboarding/ExtractionStep.vue` | Screen 5: progressive extraction checklist |
| `src/components/onboarding/ReviewStep.vue` | Screen 6: grouped sections, click-to-edit |
| `src/components/onboarding/EmailWireframe.vue` | Right panel (Screens 1–4): static email wireframe |
| `src/components/onboarding/BrandCard.vue` | Right panel (Screens 5–6): live brand card |
| `src/components/onboarding/ClickToEdit.vue` | Reusable click-to-edit display/input toggle |
| `src/components/onboarding/ColorPicker.vue` | Color picker popover with hex input |
| `src/utils/onboarding-validators.ts` | URL and hex color validation functions |
| `api/extract-brand.ts` | Serverless: scrape website → brand identity |
| `api/analyze-writing-style.ts` | Serverless: scrape text → writing style |
| `supabase/migrations/20260320_m3_onboarding.sql` | Add `name` column to users, brand-logos bucket |
| `tests/unit/composables/useOnboardingState.test.ts` | Composable unit tests |
| `tests/unit/utils/onboarding-validators.test.ts` | Validator unit tests |
| `tests/unit/stores/auth-name.test.ts` | Auth store name field tests |
| `tests/unit/stores/brands-create-full.test.ts` | Extended createBrand tests |
| `tests/unit/onboarding/completion.test.ts` | Completion flow integration tests |

### Modified files

| File | Changes |
|------|---------|
| `src/views/OnboardingView.vue` | Replace stub with split-screen shell + step routing |
| `src/stores/auth.ts` | Add `name` to UserProfile, fetch + update name |
| `src/stores/brands.ts` | Add `createBrandFull()` accepting all brand fields |
| `src/types/kova/database.ts` | No changes needed (Brand type already complete) |
| `src/router.ts` | No route changes needed (route already exists) |

---

## Execution Chunks

Per the handoff document, execution is split across sessions:

| Session | Scope | This Plan Section |
|---------|-------|-------------------|
| Chunk 2 | Phase 3.1 — Onboarding UI | Tasks 1–13 |
| Chunk 3 | Phase 3.2 — Extraction APIs | Tasks 14–16 |
| Chunk 4 | Integration + Polish | Tasks 17–19 |

**Parallelism:** Tasks marked `parallel: yes` can be executed simultaneously by separate subagents. Tasks marked `parallel: no` have dependencies on prior tasks.

---

## Chunk 2: Phase 3.1 — Onboarding UI

### Task 1: Database Migration + Auth Store Name Field

**Files:**
- Create: `supabase/migrations/20260320_m3_onboarding.sql`
- Modify: `src/stores/auth.ts`
- Test: `tests/unit/stores/auth-name.test.ts`
- **parallel:** no (foundation for all other tasks)

- [ ] **Step 1: Write the migration**

```sql
-- M3: Onboarding — add name column to users + brand-logos storage bucket

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;

-- Update handle_new_user() to copy Google OAuth display name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Brand logos storage bucket (public for display, write-scoped by RLS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own brand logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own brand logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own brand logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Update UserProfile interface and fetchProfile in auth store**

In `src/stores/auth.ts`:

Add `name` to `UserProfile`:
```ts
interface UserProfile {
  name: string | null
  onboarded: boolean
  plan: string
}
```

Update `isUserProfile` type guard:
```ts
function isUserProfile(data: unknown): data is UserProfile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'onboarded' in data &&
    typeof (data as Record<string, unknown>).onboarded === 'boolean' &&
    'plan' in data &&
    typeof (data as Record<string, unknown>).plan === 'string'
  )
}
```
Note: `name` can be null, so we don't validate it as required.

Update `fetchProfile` to select `name`:
```ts
const { data, error } = await supabase
  .from('users')
  .select('name, onboarded, plan')
  .eq('id', user.value.id)
  .single()
```

Add `updateName` function:
```ts
async function updateName(newName: string): Promise<void> {
  if (!user.value) return
  const { error } = await supabase
    .from('users')
    .update({ name: newName })
    .eq('id', user.value.id)
  if (error) throw error
  if (profile.value) {
    profile.value = { ...profile.value, name: newName }
  }
}
```

Expose `updateName` in the return object.

- [ ] **Step 3: Write auth store name tests**

```ts
// tests/unit/stores/auth-name.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockAuth = {
  getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
  onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  signInWithPassword: mock(() => Promise.resolve({ data: {}, error: null })),
  signUp: mock(() => Promise.resolve({ error: null })),
  signInWithOAuth: mock(() => Promise.resolve({ error: null })),
  signOut: mock(() => Promise.resolve()),
}

mock.module('@/lib/supabase', () => ({
  supabase: { from: mockFrom, auth: mockAuth },
}))

mock.module('@/router', () => ({
  getRouter: () => ({ push: mock(() => {}) }),
}))

const { useAuthStore } = await import('@/stores/auth')

describe('auth store - name field', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
  })

  test('fetchProfile includes name in profile', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: 'Jiho', onboarded: true, plan: 'free' },
            error: null,
          }),
        }),
      }),
    })

    const store = useAuthStore()
    store.user = { id: 'user-1' } as any
    await store.fetchProfile()

    expect(store.profile?.name).toBe('Jiho')
  })

  test('fetchProfile handles null name', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: null, onboarded: false, plan: 'free' },
            error: null,
          }),
        }),
      }),
    })

    const store = useAuthStore()
    store.user = { id: 'user-1' } as any
    await store.fetchProfile()

    expect(store.profile?.name).toBeNull()
  })

  test('updateName updates profile name', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: null, onboarded: false, plan: 'free' },
            error: null,
          }),
        }),
      }),
    })

    const store = useAuthStore()
    store.user = { id: 'user-1' } as any
    await store.fetchProfile()

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.updateName('New Name')
    expect(store.profile?.name).toBe('New Name')
  })
})
```

- [ ] **Step 4: Run tests**

```bash
cd kova-open-pencil-1 && bun test tests/unit/stores/auth-name.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260320_m3_onboarding.sql src/stores/auth.ts tests/unit/stores/auth-name.test.ts
git commit -m "feat(m3): add name column to users table and auth store support"
```

---

### Task 2: Onboarding Validators

**Files:**
- Create: `src/utils/onboarding-validators.ts`
- Test: `tests/unit/utils/onboarding-validators.test.ts`
- **parallel:** yes (no dependencies)

- [ ] **Step 1: Write failing tests for validators**

```ts
// tests/unit/utils/onboarding-validators.test.ts
import { describe, test, expect } from 'bun:test'
import { isValidUrl, isValidHexColor, normalizeUrl } from '@/utils/onboarding-validators'

describe('isValidUrl', () => {
  test('accepts domain with TLD', () => {
    expect(isValidUrl('example.com')).toBe(true)
  })

  test('accepts full URL with protocol', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  test('accepts URL with path', () => {
    expect(isValidUrl('https://example.com/about')).toBe(true)
  })

  test('accepts subdomain', () => {
    expect(isValidUrl('www.example.com')).toBe(true)
  })

  test('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })

  test('rejects single word', () => {
    expect(isValidUrl('hello')).toBe(false)
  })

  test('rejects spaces', () => {
    expect(isValidUrl('hello world.com')).toBe(false)
  })
})

describe('normalizeUrl', () => {
  test('adds https:// to bare domain', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
  })

  test('preserves existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
  })

  test('preserves existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })
})

describe('isValidHexColor', () => {
  test('accepts 6-digit hex', () => {
    expect(isValidHexColor('#2563eb')).toBe(true)
  })

  test('accepts 3-digit hex', () => {
    expect(isValidHexColor('#abc')).toBe(true)
  })

  test('accepts uppercase', () => {
    expect(isValidHexColor('#ABCDEF')).toBe(true)
  })

  test('rejects without hash', () => {
    expect(isValidHexColor('2563eb')).toBe(false)
  })

  test('rejects invalid characters', () => {
    expect(isValidHexColor('#xyz123')).toBe(false)
  })

  test('rejects wrong length', () => {
    expect(isValidHexColor('#12345')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd kova-open-pencil-1 && bun test tests/unit/utils/onboarding-validators.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement validators**

```ts
// src/utils/onboarding-validators.ts

const URL_PATTERN = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isValidUrl(url: string): boolean {
  if (!url.trim()) return false
  return URL_PATTERN.test(url.trim())
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_PATTERN.test(color)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd kova-open-pencil-1 && bun test tests/unit/utils/onboarding-validators.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/onboarding-validators.ts tests/unit/utils/onboarding-validators.test.ts
git commit -m "feat(m3): add URL and hex color validators for onboarding"
```

---

### Task 3: useOnboardingState Composable

**Files:**
- Create: `src/composables/useOnboardingState.ts`
- Test: `tests/unit/composables/useOnboardingState.test.ts`
- **parallel:** yes (no dependencies other than types from database.ts which already exist)

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/composables/useOnboardingState.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { useOnboardingState } from '@/composables/useOnboardingState'

describe('useOnboardingState', () => {
  let state: ReturnType<typeof useOnboardingState>

  beforeEach(() => {
    state = useOnboardingState()
  })

  test('initializes at step 1 with empty fields', () => {
    expect(state.currentStep.value).toBe(1)
    expect(state.name.value).toBe('')
    expect(state.brandName.value).toBe('')
    expect(state.brandUrl.value).toBe('')
    expect(state.logoFile.value).toBeNull()
    expect(state.logoUrl.value).toBeNull()
    expect(state.colors.value).toBeNull()
    expect(state.fonts.value).toBeNull()
    expect(state.voice.value).toBeNull()
  })

  test('next() advances step', () => {
    state.next()
    expect(state.currentStep.value).toBe(2)
  })

  test('back() decrements step', () => {
    state.currentStep.value = 3
    state.back()
    expect(state.currentStep.value).toBe(2)
  })

  test('back() does not go below 1', () => {
    state.back()
    expect(state.currentStep.value).toBe(1)
  })

  test('next() does not go above 7', () => {
    state.currentStep.value = 7
    state.next()
    expect(state.currentStep.value).toBe(7)
  })

  test('goTo() sets specific step', () => {
    state.goTo(5)
    expect(state.currentStep.value).toBe(5)
  })

  test('goTo() clamps to valid range', () => {
    state.goTo(10)
    expect(state.currentStep.value).toBe(7)
    state.goTo(0)
    expect(state.currentStep.value).toBe(1)
  })

  test('canProceed is false when name is empty on step 2', () => {
    state.currentStep.value = 2
    state.name.value = ''
    expect(state.canProceed.value).toBe(false)
  })

  test('canProceed is true when name is filled on step 2', () => {
    state.currentStep.value = 2
    state.name.value = 'Jiho'
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is false when brandName is empty on step 3', () => {
    state.currentStep.value = 3
    state.brandName.value = ''
    expect(state.canProceed.value).toBe(false)
  })

  test('canProceed is true when brandName is filled on step 3', () => {
    state.currentStep.value = 3
    state.brandName.value = 'Kova'
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is false when URL is invalid on step 4', () => {
    state.currentStep.value = 4
    state.brandUrl.value = 'notaurl'
    expect(state.canProceed.value).toBe(false)
  })

  test('canProceed is true when URL is valid on step 4', () => {
    state.currentStep.value = 4
    state.brandUrl.value = 'example.com'
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is true on step 1 (welcome, always)', () => {
    state.currentStep.value = 1
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is true on step 5 (extraction, always)', () => {
    state.currentStep.value = 5
    expect(state.canProceed.value).toBe(true)
  })

  test('canProceed is true on step 6 (review, always)', () => {
    state.currentStep.value = 6
    expect(state.canProceed.value).toBe(true)
  })

  test('skipToReview() jumps from step 4 to step 6', () => {
    state.currentStep.value = 4
    state.skipToReview()
    expect(state.currentStep.value).toBe(6)
  })

  test('totalSteps is 7', () => {
    expect(state.totalSteps).toBe(7)
  })

  test('progress returns fraction of filled steps', () => {
    state.currentStep.value = 3
    expect(state.progress.value).toBeCloseTo(3 / 7)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd kova-open-pencil-1 && bun test tests/unit/composables/useOnboardingState.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement composable**

```ts
// src/composables/useOnboardingState.ts
import { computed, ref } from 'vue'

import { isValidUrl } from '@/utils/onboarding-validators'

import type { BrandColors, BrandFonts } from '@/types/kova/database'

const TOTAL_STEPS = 7

export function useOnboardingState() {
  const currentStep = ref(1)
  const name = ref('')
  const brandName = ref('')
  const brandUrl = ref('')
  const logoFile = ref<File | null>(null)
  const logoUrl = ref<string | null>(null)
  const colors = ref<BrandColors | null>(null)
  const fonts = ref<BrandFonts | null>(null)
  const voice = ref<string | null>(null)

  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 1: return true
      case 2: return name.value.trim().length > 0
      case 3: return brandName.value.trim().length > 0
      case 4: return isValidUrl(brandUrl.value)
      case 5: return true
      case 6: return true
      default: return false
    }
  })

  const progress = computed(() => currentStep.value / TOTAL_STEPS)

  function next(): void {
    if (currentStep.value < TOTAL_STEPS) {
      currentStep.value += 1
    }
  }

  function back(): void {
    if (currentStep.value > 1) {
      currentStep.value -= 1
    }
  }

  function goTo(step: number): void {
    currentStep.value = Math.max(1, Math.min(TOTAL_STEPS, step))
  }

  function skipToReview(): void {
    currentStep.value = 6
  }

  return {
    currentStep,
    name,
    brandName,
    brandUrl,
    logoFile,
    logoUrl,
    colors,
    fonts,
    voice,
    canProceed,
    progress,
    totalSteps: TOTAL_STEPS,
    next,
    back,
    goTo,
    skipToReview,
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd kova-open-pencil-1 && bun test tests/unit/composables/useOnboardingState.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/useOnboardingState.ts tests/unit/composables/useOnboardingState.test.ts
git commit -m "feat(m3): add useOnboardingState composable with step navigation and validation"
```

---

### Task 4: Extend Brands Store for Full Brand Creation

**Files:**
- Modify: `src/stores/brands.ts`
- Test: `tests/unit/stores/brands-create-full.test.ts`
- **parallel:** yes

- [ ] **Step 1: Write failing test for createBrandFull**

```ts
// tests/unit/stores/brands-create-full.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  getPublicUrl: mock(() => ({ data: { publicUrl: 'https://storage.test/logo.png' } })),
  remove: mock(() => Promise.resolve({ error: null })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}))

const mockAuthStore = { user: { id: 'user-1', email: 'test@test.com' } }
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const { useBrandsStore } = await import('@/stores/brands')

describe('brands store - createBrandFull', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
  })

  test('creates brand with all fields', async () => {
    const newBrand = {
      id: 'b1',
      user_id: 'user-1',
      name: 'Test Brand',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      logo_url: null,
      voice: 'Professional and concise',
      industry: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newBrand, error: null }),
        }),
      }),
    })

    const store = useBrandsStore()
    const result = await store.createBrandFull({
      name: 'Test Brand',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional and concise',
    })

    expect(result).toEqual(newBrand)
    expect(store.brands).toContainEqual(newBrand)
  })

  test('creates brand with logo file upload', async () => {
    const newBrand = {
      id: 'b2',
      user_id: 'user-1',
      name: 'Logo Brand',
      colors: null,
      fonts: null,
      logo_url: 'https://storage.test/logo.png',
      voice: null,
      industry: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { ...newBrand, logo_url: null }, error: null }),
        }),
      }),
    })

    // Mock the update call for setting logo_url after upload
    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: newBrand, error: null }),
          }),
        }),
      }),
    })

    const store = useBrandsStore()
    const fakeFile = new File(['logo'], 'logo.png', { type: 'image/png' })

    const result = await store.createBrandFull({
      name: 'Logo Brand',
      logoFile: fakeFile,
    })

    expect(mockStorageFrom).toHaveBeenCalledWith('brand-logos')
    expect(result.logo_url).toBe('https://storage.test/logo.png')
  })

  test('creates brand with logo URL (no upload)', async () => {
    const newBrand = {
      id: 'b3',
      user_id: 'user-1',
      name: 'URL Brand',
      colors: null,
      fonts: null,
      logo_url: 'https://example.com/logo.png',
      voice: null,
      industry: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newBrand, error: null }),
        }),
      }),
    })

    const store = useBrandsStore()
    const result = await store.createBrandFull({
      name: 'URL Brand',
      logoUrl: 'https://example.com/logo.png',
    })

    expect(result.logo_url).toBe('https://example.com/logo.png')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd kova-open-pencil-1 && bun test tests/unit/stores/brands-create-full.test.ts
```
Expected: FAIL (createBrandFull not defined)

- [ ] **Step 3: Implement createBrandFull in brands store**

Add to `src/stores/brands.ts`:

```ts
import type { BrandColors, BrandFonts } from '@/types/kova/database'

interface CreateBrandFullInput {
  name: string
  colors?: BrandColors | null
  fonts?: BrandFonts | null
  logoFile?: File | null
  logoUrl?: string | null
  voice?: string | null
}

async function createBrandFull(input: CreateBrandFullInput): Promise<Brand> {
  const authStore = useAuthStore()
  const userId = authStore.user?.id
  if (!userId) throw new Error('Not authenticated')

  const insertData: Record<string, unknown> = {
    user_id: userId,
    name: input.name,
  }
  if (input.colors) insertData.colors = input.colors
  if (input.fonts) insertData.fonts = input.fonts
  if (input.voice) insertData.voice = input.voice
  if (input.logoUrl && !input.logoFile) insertData.logo_url = input.logoUrl

  const { data, error } = await supabase
    .from('brands')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error

  let finalBrand = data

  // Upload logo file if provided
  if (input.logoFile) {
    const ext = input.logoFile.name.split('.').pop() ?? 'png'
    const path = `${userId}/${data.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(path, input.logoFile, { upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(path)

      const { data: updated, error: updateError } = await supabase
        .from('brands')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', data.id)
        .select()
        .single()

      if (!updateError && updated) {
        finalBrand = updated
      }
    }
  }

  brands.value = [...brands.value, finalBrand]
  return finalBrand
}
```

Add `createBrandFull` to the return object.

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd kova-open-pencil-1 && bun test tests/unit/stores/brands-create-full.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/brands.ts tests/unit/stores/brands-create-full.test.ts
git commit -m "feat(m3): add createBrandFull to brands store with logo upload support"
```

---

### Task 5: OnboardingView Shell (Split-Screen Layout)

**Files:**
- Modify: `src/views/OnboardingView.vue`
- **parallel:** no (Tasks 6–13 depend on this shell)

- [ ] **Step 1: Replace OnboardingView stub with split-screen shell**

The shell manages:
- Step state via `useOnboardingState()`
- Split-screen layout: 38% left (white) / 62% right (dark #1e1e1e)
- Left panel: back arrow (hidden on step 1), centered content slot, progress bar, continue button
- Right panel: EmailWireframe (steps 1–4), BrandCard (steps 5–6)
- Keyboard: Enter key advances on input steps
- Progress bar: 7 segments, filled segments are blue (#2563eb)

```vue
<script setup lang="ts">
import { computed, provide } from 'vue'

import { APP_NAME } from '@/constants'
import { useOnboardingState } from '@/composables/useOnboardingState'

import WelcomeStep from '@/components/onboarding/WelcomeStep.vue'
import NameStep from '@/components/onboarding/NameStep.vue'
import BrandNameStep from '@/components/onboarding/BrandNameStep.vue'
import BrandUrlStep from '@/components/onboarding/BrandUrlStep.vue'
import ExtractionStep from '@/components/onboarding/ExtractionStep.vue'
import ReviewStep from '@/components/onboarding/ReviewStep.vue'
import EmailWireframe from '@/components/onboarding/EmailWireframe.vue'
import BrandCard from '@/components/onboarding/BrandCard.vue'

const state = useOnboardingState()
provide('onboardingState', state)

const showBackButton = computed(() => state.currentStep.value > 1 && state.currentStep.value <= 6)
const showContinueButton = computed(() => {
  // Welcome has "Get Started" inside the step; Extraction auto-advances; Screen 7 is not visible
  return state.currentStep.value >= 2 && state.currentStep.value <= 4
})
const showFinishButton = computed(() => state.currentStep.value === 6)
const showRightEmailWireframe = computed(() => state.currentStep.value >= 1 && state.currentStep.value <= 4)
const showRightBrandCard = computed(() => state.currentStep.value >= 5 && state.currentStep.value <= 6)

const continueLabel = computed(() => {
  if (state.currentStep.value === 1) return 'Get Started'
  if (state.currentStep.value === 6) return 'Finish Setup'
  return 'Continue'
})

const filledSegments = computed(() => {
  // Map step to filled count per design spec
  return Math.min(state.currentStep.value, 6)
})

function handleContinue(): void {
  if (state.canProceed.value) {
    state.next()
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code === 'Enter' && showContinueButton.value && state.canProceed.value) {
    handleContinue()
  }
}
</script>

<template>
  <div
    data-test-id="onboarding-view"
    class="flex h-screen"
    @keydown="handleKeydown"
  >
    <!-- Left panel (38%) — white -->
    <div class="relative flex w-[38%] flex-col bg-white px-12 py-8">
      <!-- Back arrow -->
      <button
        v-if="showBackButton"
        data-test-id="onboarding-back"
        class="mb-8 flex size-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        @click="state.back()"
      >
        <icon-lucide-arrow-left class="size-5" />
      </button>
      <div v-else class="mb-8 h-10" />

      <!-- Step content — upper third positioning -->
      <div class="flex flex-1 flex-col pt-8">
        <WelcomeStep v-if="state.currentStep.value === 1" @continue="state.next()" />
        <NameStep v-else-if="state.currentStep.value === 2" />
        <BrandNameStep v-else-if="state.currentStep.value === 3" />
        <BrandUrlStep v-else-if="state.currentStep.value === 4" @skip="state.skipToReview()" />
        <ExtractionStep v-else-if="state.currentStep.value === 5" @complete="state.next()" />
        <ReviewStep v-else-if="state.currentStep.value === 6" />
      </div>

      <!-- Bottom bar: progress + continue -->
      <div class="flex items-center justify-between pt-6">
        <!-- Progress bar -->
        <div class="flex gap-1">
          <div
            v-for="i in 7"
            :key="i"
            class="h-1 w-8 rounded-full transition-colors"
            :class="i <= filledSegments ? 'bg-blue-600' : 'bg-gray-200'"
          />
        </div>

        <!-- Continue / Finish button -->
        <button
          v-if="showContinueButton"
          data-test-id="onboarding-continue"
          class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
          :disabled="!state.canProceed.value"
          @click="handleContinue"
        >
          {{ continueLabel }}
        </button>
      </div>
    </div>

    <!-- Right panel (62%) — dark -->
    <div class="flex w-[62%] items-center justify-center bg-[#1e1e1e]">
      <EmailWireframe v-if="showRightEmailWireframe" />
      <BrandCard v-else-if="showRightBrandCard" />
    </div>
  </div>
</template>
```

**Note:** The step components are not yet created — they'll be placeholder `<div>` stubs initially. Create empty stub files for all step components so the shell compiles:

For each of: `WelcomeStep.vue`, `NameStep.vue`, `BrandNameStep.vue`, `BrandUrlStep.vue`, `ExtractionStep.vue`, `ReviewStep.vue`, `EmailWireframe.vue`, `BrandCard.vue` — create a minimal stub:

```vue
<template>
  <div>{{ $options.__name }} placeholder</div>
</template>
```

- [ ] **Step 2: Verify dev server compiles**

```bash
cd kova-open-pencil-1 && bun run dev &
# Wait for "ready" then kill
```

- [ ] **Step 3: Commit**

```bash
git add src/views/OnboardingView.vue src/components/onboarding/
git commit -m "feat(m3): build onboarding shell with split-screen layout and step navigation"
```

---

### Task 6: WelcomeStep + NameStep Components

**Files:**
- Modify: `src/components/onboarding/WelcomeStep.vue`
- Modify: `src/components/onboarding/NameStep.vue`
- **parallel:** yes (after Task 5)

- [ ] **Step 1: Implement WelcomeStep**

```vue
<!-- src/components/onboarding/WelcomeStep.vue -->
<script setup lang="ts">
import { APP_NAME } from '@/constants'

const emit = defineEmits<{
  continue: []
}>()
</script>

<template>
  <div data-test-id="onboarding-welcome">
    <img
      src="/favicon-128.png"
      class="mb-6 size-12 rounded-xl"
      :alt="APP_NAME"
    />
    <h1 class="text-2xl font-semibold text-gray-900">
      Welcome to {{ APP_NAME }}
    </h1>
    <p class="mt-3 text-base text-gray-500">
      AI-powered email design, tailored to your brand. Let's set up your brand profile to get started.
    </p>
    <button
      data-test-id="onboarding-get-started"
      class="mt-8 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:bg-blue-700"
      @click="emit('continue')"
    >
      Get Started
    </button>
  </div>
</template>
```

- [ ] **Step 2: Implement NameStep**

```vue
<!-- src/components/onboarding/NameStep.vue -->
<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

import type { ReturnType } from 'vue'
import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <div data-test-id="onboarding-name-step">
    <h1 class="text-2xl font-semibold text-gray-900">
      What's your name?
    </h1>
    <p class="mt-2 text-sm text-gray-500">
      This is how you'll appear in Kova.
    </p>
    <input
      ref="inputRef"
      v-model="state.name.value"
      data-test-id="onboarding-name-input"
      type="text"
      placeholder="Your name"
      class="mt-6 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  </div>
</template>
```

**Important:** The `inject` type cast pattern avoids using `any`. Use this same pattern for all step components that need the onboarding state.

- [ ] **Step 3: Verify dev server renders both steps**

Navigate to `/onboarding` in the browser. Click "Get Started" — should advance to step 2 with name input.

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/WelcomeStep.vue src/components/onboarding/NameStep.vue
git commit -m "feat(m3): implement WelcomeStep and NameStep onboarding screens"
```

---

### Task 7: BrandNameStep + BrandUrlStep Components

**Files:**
- Modify: `src/components/onboarding/BrandNameStep.vue`
- Modify: `src/components/onboarding/BrandUrlStep.vue`
- **parallel:** yes (after Task 5)

- [ ] **Step 1: Implement BrandNameStep**

```vue
<!-- src/components/onboarding/BrandNameStep.vue -->
<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <div data-test-id="onboarding-brand-name-step">
    <h1 class="text-2xl font-semibold text-gray-900">
      What's your brand name?
    </h1>
    <p class="mt-2 text-sm text-gray-500">
      This is how we'll identify your brand across Kova.
    </p>
    <input
      ref="inputRef"
      v-model="state.brandName.value"
      data-test-id="onboarding-brand-name-input"
      type="text"
      placeholder="Your brand name"
      class="mt-6 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  </div>
</template>
```

- [ ] **Step 2: Implement BrandUrlStep**

```vue
<!-- src/components/onboarding/BrandUrlStep.vue -->
<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const inputRef = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  skip: []
}>()

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <div data-test-id="onboarding-brand-url-step">
    <h1 class="text-2xl font-semibold text-gray-900">
      What's your brand's website?
    </h1>
    <p class="mt-2 text-sm text-gray-500">
      We'll use this to automatically extract your brand colors, fonts, and logo.
    </p>
    <input
      ref="inputRef"
      v-model="state.brandUrl.value"
      data-test-id="onboarding-brand-url-input"
      type="text"
      placeholder="example.com"
      class="mt-6 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
    <button
      data-test-id="onboarding-skip-extraction"
      class="mt-4 text-sm text-gray-400 transition-colors hover:text-gray-600"
      @click="emit('skip')"
    >
      I don't have a website — enter manually
    </button>
  </div>
</template>
```

- [ ] **Step 3: Verify both steps in browser**

Navigate through steps 1–4. Verify:
- Brand name input enables/disables Continue button
- URL input validates (Continue disabled for invalid URLs)
- "Skip" link advances to step 6

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/BrandNameStep.vue src/components/onboarding/BrandUrlStep.vue
git commit -m "feat(m3): implement BrandNameStep and BrandUrlStep onboarding screens"
```

---

### Task 8: EmailWireframe Right Panel

**Files:**
- Modify: `src/components/onboarding/EmailWireframe.vue`
- **parallel:** yes (after Task 5)

- [ ] **Step 1: Implement EmailWireframe**

A static wireframe that looks like an email on a design canvas. Uses SVG/Tailwind to create:
- Dark background (#1e1e1e)
- White "email" frame (600x900 aspect ratio, scaled to fit)
- Blue selection outline with corner handles
- "Email — 600 x 900" dimension label
- Wireframe placeholder blocks inside (header bar, hero image area, text lines, button, footer)

```vue
<!-- src/components/onboarding/EmailWireframe.vue -->
<script setup lang="ts">
</script>

<template>
  <div data-test-id="onboarding-email-wireframe" class="relative">
    <!-- Canvas-style container with selection handles -->
    <div class="relative">
      <!-- Dimension label -->
      <div class="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-blue-600 px-2 py-0.5 text-xs text-white">
        Email — 600 x 900
      </div>

      <!-- Email frame with selection border -->
      <div class="relative rounded border-[1.5px] border-blue-500 bg-white p-6" style="width: 280px; aspect-ratio: 600/900;">
        <!-- Corner handles -->
        <div class="absolute -left-1 -top-1 size-2 rounded-sm border border-blue-500 bg-white" />
        <div class="absolute -right-1 -top-1 size-2 rounded-sm border border-blue-500 bg-white" />
        <div class="absolute -bottom-1 -left-1 size-2 rounded-sm border border-blue-500 bg-white" />
        <div class="absolute -bottom-1 -right-1 size-2 rounded-sm border border-blue-500 bg-white" />

        <!-- Wireframe content -->
        <div class="flex h-full flex-col gap-3">
          <!-- Header bar -->
          <div class="h-5 w-24 rounded bg-gray-200" />

          <!-- Hero image placeholder -->
          <div class="flex h-28 items-center justify-center rounded bg-gray-100">
            <icon-lucide-image class="size-8 text-gray-300" />
          </div>

          <!-- Heading line -->
          <div class="h-3 w-3/4 rounded bg-gray-200" />

          <!-- Text lines -->
          <div class="flex flex-col gap-1.5">
            <div class="h-2 w-full rounded bg-gray-100" />
            <div class="h-2 w-full rounded bg-gray-100" />
            <div class="h-2 w-5/6 rounded bg-gray-100" />
          </div>

          <!-- CTA button placeholder -->
          <div class="mx-auto mt-2 h-7 w-28 rounded bg-gray-200" />

          <!-- Spacer -->
          <div class="flex-1" />

          <!-- Footer lines -->
          <div class="flex flex-col items-center gap-1">
            <div class="h-1.5 w-1/2 rounded bg-gray-100" />
            <div class="h-1.5 w-1/3 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser — wireframe visible on right panel for steps 1–4**

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/EmailWireframe.vue
git commit -m "feat(m3): add email wireframe right panel for onboarding screens 1-4"
```

---

### Task 9: BrandCard Right Panel

**Files:**
- Modify: `src/components/onboarding/BrandCard.vue`
- **parallel:** yes (after Task 5)

- [ ] **Step 1: Implement BrandCard**

Floating card on dark background showing brand identity. Fills in progressively. Reacts to state changes in real-time.

```vue
<!-- src/components/onboarding/BrandCard.vue -->
<script setup lang="ts">
import { inject, computed } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>

const colorSwatches = computed(() => {
  if (!state.colors.value) return []
  const c = state.colors.value
  return [
    { label: 'Primary', hex: c.primary },
    { label: 'Secondary', hex: c.secondary },
    { label: 'Accent', hex: c.accent },
    { label: 'Background', hex: c.background },
  ]
})

const hasLogo = computed(() => !!state.logoUrl.value || !!state.logoFile.value)
const logoSrc = computed(() => {
  if (state.logoFile.value) return URL.createObjectURL(state.logoFile.value)
  return state.logoUrl.value
})
</script>

<template>
  <div
    data-test-id="onboarding-brand-card"
    class="w-72 rounded-xl bg-[#2a2a2a] p-6 shadow-2xl"
  >
    <!-- Logo -->
    <div class="mb-4 flex items-center gap-3">
      <div
        v-if="hasLogo"
        class="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white/10"
      >
        <img :src="logoSrc!" class="size-10 object-contain" alt="Brand logo" />
      </div>
      <div
        v-else
        class="flex size-10 items-center justify-center rounded-lg border border-dashed border-gray-600"
      >
        <icon-lucide-image class="size-4 text-gray-500" />
      </div>

      <!-- Brand name -->
      <span
        v-if="state.brandName.value"
        class="text-lg font-semibold text-white"
      >
        {{ state.brandName.value }}
      </span>
      <span v-else class="text-sm text-gray-500">Brand name</span>
    </div>

    <!-- Colors -->
    <div class="mb-4">
      <div class="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Colors
      </div>
      <div v-if="colorSwatches.length" class="flex gap-2">
        <div v-for="swatch in colorSwatches" :key="swatch.label" class="text-center">
          <div
            class="size-8 rounded-md border border-white/10"
            :style="{ backgroundColor: swatch.hex }"
          />
          <div class="mt-1 text-[9px] text-gray-500">{{ swatch.hex }}</div>
        </div>
      </div>
      <div v-else class="flex gap-2">
        <div v-for="i in 4" :key="i" class="size-8 rounded-md border border-dashed border-gray-600" />
      </div>
    </div>

    <!-- Fonts -->
    <div class="mb-4">
      <div class="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Fonts
      </div>
      <div v-if="state.fonts.value" class="flex gap-4 text-xs text-gray-300">
        <div>
          <div class="text-gray-500">Heading</div>
          <div>{{ state.fonts.value.heading }}</div>
        </div>
        <div>
          <div class="text-gray-500">Body</div>
          <div>{{ state.fonts.value.body }}</div>
        </div>
      </div>
      <div v-else class="text-xs text-gray-600">—</div>
    </div>

    <!-- Voice -->
    <div>
      <div class="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Voice
      </div>
      <p
        v-if="state.voice.value"
        class="text-xs leading-relaxed text-gray-300"
      >
        {{ state.voice.value }}
      </p>
      <div v-else class="text-xs text-gray-600">—</div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser — brand card shows on right panel for steps 5–6**

Navigate to step 5 or 6. Card should show with dashed placeholders when no data is set.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/BrandCard.vue
git commit -m "feat(m3): add brand card right panel for onboarding screens 5-6"
```

---

### Task 10: ExtractionStep (Mock Data)

**Files:**
- Modify: `src/components/onboarding/ExtractionStep.vue`
- **parallel:** yes (after Task 5)

- [ ] **Step 1: Implement ExtractionStep with progressive checklist**

This component shows a progressive checklist. For Phase 3.1, it uses mock data. In Phase 3.2 (Task 16), it will be wired to real API endpoints.

The component:
1. Shows 4 extraction items in sequence
2. Each item: label → spinner → checkmark + result preview
3. As each completes, updates the onboarding state (so BrandCard fills in live)
4. On all complete: auto-advances after 1.5s pause, or shows Continue button

```vue
<!-- src/components/onboarding/ExtractionStep.vue -->
<script setup lang="ts">
import { inject, onMounted, ref, reactive } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'
import type { BrandColors, BrandFonts } from '@/types/kova/database'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const emit = defineEmits<{ complete: [] }>()

interface ExtractionItem {
  id: string
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
  result?: string
}

const items = reactive<ExtractionItem[]>([
  { id: 'logo', label: 'Finding your logo...', status: 'pending' },
  { id: 'colors', label: 'Extracting brand colors...', status: 'pending' },
  { id: 'fonts', label: 'Detecting fonts...', status: 'pending' },
  { id: 'voice', label: 'Analyzing writing style...', status: 'pending' },
])

const allDone = ref(false)
const showContinue = ref(false)

// Mock extraction data — will be replaced with real API calls in Task 16
const MOCK_RESULTS = {
  logoUrl: 'https://placehold.co/100x100/2563eb/white?text=Logo',
  colors: { primary: '#2563eb', secondary: '#1e293b', accent: '#f59e0b', background: '#ffffff' } as BrandColors,
  fonts: { heading: 'Inter', body: 'Georgia' } as BrandFonts,
  voice: 'Professional yet approachable, with a focus on clarity and action-oriented language.',
}

async function runExtraction(): Promise<void> {
  // Simulate progressive extraction with delays
  // Item 1: Logo
  items[0].status = 'loading'
  await delay(800)
  state.logoUrl.value = MOCK_RESULTS.logoUrl
  items[0].status = 'done'
  items[0].result = 'Logo found'

  // Item 2: Colors
  items[1].status = 'loading'
  await delay(1000)
  state.colors.value = MOCK_RESULTS.colors
  items[1].status = 'done'

  // Item 3: Fonts
  items[2].status = 'loading'
  await delay(700)
  state.fonts.value = MOCK_RESULTS.fonts
  items[2].status = 'done'
  items[2].result = `${MOCK_RESULTS.fonts.heading}, ${MOCK_RESULTS.fonts.body}`

  // Item 4: Voice
  items[3].status = 'loading'
  await delay(900)
  state.voice.value = MOCK_RESULTS.voice
  items[3].status = 'done'
  items[3].result = MOCK_RESULTS.voice

  allDone.value = true

  // Auto-advance after 1.5s
  await delay(1500)
  if (allDone.value) {
    emit('complete')
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

onMounted(() => {
  void runExtraction()

  // Show manual continue button after timeout as fallback
  setTimeout(() => {
    showContinue.value = true
  }, 6000)
})
</script>

<template>
  <div data-test-id="onboarding-extraction-step">
    <h1 class="mb-6 text-2xl font-semibold text-gray-900">
      Setting up your brand...
    </h1>

    <div class="flex flex-col gap-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-start gap-3 transition-opacity"
        :class="item.status === 'pending' ? 'opacity-30' : 'opacity-100'"
      >
        <!-- Status icon -->
        <div class="mt-0.5 flex size-5 items-center justify-center">
          <icon-lucide-loader-2
            v-if="item.status === 'loading'"
            class="size-4 animate-spin text-blue-500"
          />
          <icon-lucide-check-circle-2
            v-else-if="item.status === 'done'"
            class="size-4 text-green-500"
          />
          <icon-lucide-x-circle
            v-else-if="item.status === 'error'"
            class="size-4 text-red-400"
          />
          <div v-else class="size-4 rounded-full border border-gray-300" />
        </div>

        <!-- Label + inline result -->
        <div>
          <span class="text-sm text-gray-700">{{ item.label }}</span>

          <!-- Inline color swatches for colors item -->
          <div
            v-if="item.id === 'colors' && item.status === 'done' && state.colors.value"
            class="mt-1 flex gap-1"
          >
            <div
              v-for="(hex, key) in state.colors.value"
              :key="key"
              class="size-5 rounded border border-gray-200"
              :style="{ backgroundColor: hex }"
            />
          </div>

          <!-- Text result for other items -->
          <p
            v-else-if="item.result && item.status === 'done'"
            class="mt-0.5 text-xs text-gray-400"
          >
            {{ item.result }}
          </p>
        </div>
      </div>
    </div>

    <!-- Fallback continue button -->
    <button
      v-if="showContinue && allDone"
      data-test-id="onboarding-extraction-continue"
      class="mt-8 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white"
      @click="emit('complete')"
    >
      Continue
    </button>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

Navigate to step 5. Should see progressive checklist items appearing with spinners then checkmarks. Brand card on right should fill in live.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/ExtractionStep.vue
git commit -m "feat(m3): implement extraction loading screen with progressive checklist (mock data)"
```

---

### Task 11: ClickToEdit + ColorPicker Reusable Components

**Files:**
- Modify: `src/components/onboarding/ClickToEdit.vue`
- Modify: `src/components/onboarding/ColorPicker.vue`
- **parallel:** yes (after Task 5)

- [ ] **Step 1: Implement ClickToEdit**

A reusable component that shows text in display mode. On click, toggles to an input/textarea. On blur or Enter, saves back.

```vue
<!-- src/components/onboarding/ClickToEdit.vue -->
<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  tag?: 'input' | 'textarea'
  placeholder?: string
  displayClass?: string
}>(), {
  tag: 'input',
  placeholder: 'Click to edit',
  displayClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editing = ref(false)
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

const displayText = computed(() => props.modelValue || props.placeholder)
const isEmpty = computed(() => !props.modelValue)

async function startEditing(): Promise<void> {
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
  if (inputRef.value instanceof HTMLInputElement) {
    inputRef.value.select()
  }
}

function stopEditing(): void {
  editing.value = false
}

function handleInput(e: Event): void {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div data-test-id="click-to-edit">
    <!-- Edit mode -->
    <template v-if="editing">
      <textarea
        v-if="tag === 'textarea'"
        ref="inputRef"
        :value="modelValue"
        class="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-1 ring-blue-300"
        rows="3"
        @input="handleInput"
        @blur="stopEditing"
        @keydown.enter.exact="stopEditing"
      />
      <input
        v-else
        ref="inputRef"
        :value="modelValue"
        type="text"
        class="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-1 ring-blue-300"
        @input="handleInput"
        @blur="stopEditing"
        @keydown.enter="stopEditing"
      />
    </template>

    <!-- Display mode -->
    <div
      v-else
      class="cursor-pointer rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100"
      :class="[displayClass, isEmpty ? 'text-gray-400 italic' : 'text-gray-900']"
      @click="startEditing"
    >
      {{ displayText }}
    </div>
  </div>
</template>
```

- [ ] **Step 2: Implement ColorPicker**

A color swatch that shows a popover with hex input on click. Uses Reka UI Popover if available, otherwise a simple positioned div.

```vue
<!-- src/components/onboarding/ColorPicker.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'

import { isValidHexColor } from '@/utils/onboarding-validators'

const props = defineProps<{
  modelValue: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const hexInput = ref(props.modelValue)

watch(() => props.modelValue, (v) => {
  hexInput.value = v
})

function applyColor(): void {
  if (isValidHexColor(hexInput.value)) {
    emit('update:modelValue', hexInput.value)
  }
  open.value = false
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code === 'Enter') {
    applyColor()
  }
  if (e.code === 'Escape') {
    hexInput.value = props.modelValue
    open.value = false
  }
}
</script>

<template>
  <div data-test-id="color-picker" class="relative text-center">
    <!-- Swatch -->
    <button
      class="size-10 rounded-lg border border-gray-200 transition-shadow hover:shadow-md"
      :style="{ backgroundColor: modelValue }"
      @click="open = !open"
    />
    <div class="mt-1 text-[10px] text-gray-500">{{ label }}</div>
    <div class="mt-0.5 text-[10px] text-gray-400">{{ modelValue }}</div>

    <!-- Popover -->
    <div
      v-if="open"
      class="absolute -left-4 top-full z-10 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
    >
      <!-- Native color input for visual picking -->
      <input
        type="color"
        :value="modelValue"
        class="mb-2 size-full cursor-pointer"
        style="width: 120px; height: 80px;"
        @input="hexInput = ($event.target as HTMLInputElement).value; emit('update:modelValue', hexInput)"
      />

      <!-- Hex text input -->
      <input
        v-model="hexInput"
        type="text"
        placeholder="#000000"
        class="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        @keydown="handleKeydown"
        @blur="applyColor"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verify both components work interactively in the browser**

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/ClickToEdit.vue src/components/onboarding/ColorPicker.vue
git commit -m "feat(m3): add ClickToEdit and ColorPicker reusable onboarding components"
```

---

### Task 12: ReviewStep (Screen 6)

**Files:**
- Modify: `src/components/onboarding/ReviewStep.vue`
- **parallel:** no (depends on Tasks 9, 11)

- [ ] **Step 1: Implement ReviewStep**

Grouped visual sections with click-to-edit. "Finish Setup" button triggers completion (Task 13).

```vue
<!-- src/components/onboarding/ReviewStep.vue -->
<script setup lang="ts">
import { inject, ref } from 'vue'

import ClickToEdit from '@/components/onboarding/ClickToEdit.vue'
import ColorPicker from '@/components/onboarding/ColorPicker.vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>

const fileInputRef = ref<HTMLInputElement | null>(null)

function handleLogoUpload(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    state.logoFile.value = file
    // Create a local preview URL
    state.logoUrl.value = URL.createObjectURL(file)
  }
}

function openFileDialog(): void {
  fileInputRef.value?.click()
}

function updateColor(key: 'primary' | 'secondary' | 'accent' | 'background', value: string): void {
  const current = state.colors.value ?? { primary: '#000000', secondary: '#333333', accent: '#0066ff', background: '#ffffff' }
  state.colors.value = { ...current, [key]: value }
}

function updateFont(key: 'heading' | 'body', value: string): void {
  const current = state.fonts.value ?? { heading: '', body: '' }
  state.fonts.value = { ...current, [key]: value }
}
</script>

<template>
  <div data-test-id="onboarding-review-step" class="space-y-4 overflow-y-auto pr-2">
    <h1 class="text-2xl font-semibold text-gray-900">
      Review your brand
    </h1>
    <p class="text-sm text-gray-500">
      Tap any field to edit.
    </p>

    <!-- Identity section -->
    <div class="rounded-xl bg-gray-50 p-4">
      <div class="flex items-center gap-4">
        <!-- Logo -->
        <button
          data-test-id="review-logo-upload"
          class="group relative flex size-14 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white"
          @click="openFileDialog"
        >
          <img
            v-if="state.logoUrl.value"
            :src="state.logoUrl.value"
            class="size-14 object-contain"
            alt="Brand logo"
          />
          <icon-lucide-image v-else class="size-5 text-gray-300" />
          <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <icon-lucide-pencil class="size-3.5 text-white" />
          </div>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleLogoUpload"
        />

        <!-- Brand name -->
        <div class="flex-1">
          <ClickToEdit
            :model-value="state.brandName.value"
            placeholder="Brand name"
            display-class="text-base font-semibold"
            @update:model-value="state.brandName.value = $event"
          />
        </div>
      </div>
    </div>

    <!-- Colors section -->
    <div class="rounded-xl bg-gray-50 p-4">
      <div class="mb-3 text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Colors
      </div>
      <div class="flex gap-4">
        <ColorPicker
          :model-value="state.colors.value?.primary ?? '#000000'"
          label="Primary"
          @update:model-value="updateColor('primary', $event)"
        />
        <ColorPicker
          :model-value="state.colors.value?.secondary ?? '#333333'"
          label="Secondary"
          @update:model-value="updateColor('secondary', $event)"
        />
        <ColorPicker
          :model-value="state.colors.value?.accent ?? '#0066ff'"
          label="Accent"
          @update:model-value="updateColor('accent', $event)"
        />
        <ColorPicker
          :model-value="state.colors.value?.background ?? '#ffffff'"
          label="Background"
          @update:model-value="updateColor('background', $event)"
        />
      </div>
    </div>

    <!-- Fonts + Voice section -->
    <div class="rounded-xl bg-gray-50 p-4">
      <div class="mb-3 text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Fonts & Voice
      </div>
      <div class="mb-3 flex gap-4">
        <div class="flex-1">
          <div class="mb-1 text-[10px] text-gray-500">Heading font</div>
          <ClickToEdit
            :model-value="state.fonts.value?.heading ?? ''"
            placeholder="Heading font"
            @update:model-value="updateFont('heading', $event)"
          />
        </div>
        <div class="flex-1">
          <div class="mb-1 text-[10px] text-gray-500">Body font</div>
          <ClickToEdit
            :model-value="state.fonts.value?.body ?? ''"
            placeholder="Body font"
            @update:model-value="updateFont('body', $event)"
          />
        </div>
      </div>

      <div class="mb-1 text-[10px] text-gray-500">Writing style</div>
      <ClickToEdit
        :model-value="state.voice.value ?? ''"
        tag="textarea"
        placeholder="Describe your brand's writing style..."
        @update:model-value="state.voice.value = $event"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

Navigate to step 6 (either through extraction or via "enter manually" skip). All sections should render. Clicking any field should toggle to edit mode. Changes should reflect on the BrandCard in the right panel.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/ReviewStep.vue
git commit -m "feat(m3): implement review screen with click-to-edit brand fields"
```

---

### Task 13: Onboarding Completion Flow (Screen 7)

**Files:**
- Modify: `src/views/OnboardingView.vue` (add completion handler)
- Test: `tests/unit/onboarding/completion.test.ts`
- **parallel:** no (depends on Tasks 1, 4, 5, 12)

- [ ] **Step 1: Write failing test for completion logic**

Extract the completion logic into a testable function. Create a `src/composables/useOnboardingComplete.ts` composable.

```ts
// tests/unit/onboarding/completion.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  getPublicUrl: mock(() => ({ data: { publicUrl: 'https://storage.test/logo.png' } })),
  remove: mock(() => Promise.resolve({ error: null })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}))

const mockPush = mock(() => {})
mock.module('@/router', () => ({
  getRouter: () => ({ push: mockPush }),
}))

const mockAuthStore = {
  user: { id: 'user-1' },
  profile: { name: null, onboarded: false, plan: 'free' },
  fetchProfile: mock(() => Promise.resolve()),
  updateName: mock(() => Promise.resolve()),
}
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const mockBrandsStore = {
  createBrandFull: mock(() => Promise.resolve({ id: 'brand-1', name: 'Test Brand' })),
}
mock.module('@/stores/brands', () => ({
  useBrandsStore: () => mockBrandsStore,
}))

const mockCanvasesStore = {
  createCanvas: mock(() => Promise.resolve({ id: 'canvas-1', name: 'Test Brand - Canvas 1' })),
}
mock.module('@/stores/canvases', () => ({
  useCanvasesStore: () => mockCanvasesStore,
}))

const { completeOnboarding } = await import('@/composables/useOnboardingComplete')

describe('completeOnboarding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockPush.mockClear()
    mockAuthStore.updateName.mockClear()
    mockBrandsStore.createBrandFull.mockClear()
    mockCanvasesStore.createCanvas.mockClear()
    mockAuthStore.fetchProfile.mockClear()
  })

  test('saves name, creates brand, creates canvas, sets onboarded, redirects to editor', async () => {
    // Mock the users update for onboarded=true
    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await completeOnboarding({
      name: 'Jiho',
      brandName: 'Kova',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional',
      logoFile: null,
      logoUrl: null,
    })

    expect(mockAuthStore.updateName).toHaveBeenCalledWith('Jiho')
    expect(mockBrandsStore.createBrandFull).toHaveBeenCalledWith({
      name: 'Kova',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional',
      logoUrl: null,
      logoFile: null,
    })
    expect(mockCanvasesStore.createCanvas).toHaveBeenCalledWith('brand-1', 'Kova - Canvas 1')
    expect(mockFrom).toHaveBeenCalledWith('users') // for setting onboarded=true
    expect(mockPush).toHaveBeenCalledWith('/editor/canvas-1')
  })

  test('throws on error and does not redirect', async () => {
    mockAuthStore.updateName.mockImplementationOnce(() => Promise.reject(new Error('Failed')))

    await expect(
      completeOnboarding({
        name: 'Jiho',
        brandName: 'Kova',
        colors: null,
        fonts: null,
        voice: null,
        logoFile: null,
        logoUrl: null,
      }),
    ).rejects.toThrow('Failed')

    expect(mockPush).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd kova-open-pencil-1 && bun test tests/unit/onboarding/completion.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement useOnboardingComplete**

```ts
// src/composables/useOnboardingComplete.ts
import { supabase } from '@/lib/supabase'
import { getRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useBrandsStore } from '@/stores/brands'
import { useCanvasesStore } from '@/stores/canvases'

import type { BrandColors, BrandFonts } from '@/types/kova/database'

interface CompleteOnboardingInput {
  name: string
  brandName: string
  colors: BrandColors | null
  fonts: BrandFonts | null
  voice: string | null
  logoFile: File | null
  logoUrl: string | null
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<void> {
  const authStore = useAuthStore()
  const brandsStore = useBrandsStore()
  const canvasesStore = useCanvasesStore()
  const router = getRouter()

  // 1. Save user name
  await authStore.updateName(input.name)

  // 2. Create brand with all fields
  const brand = await brandsStore.createBrandFull({
    name: input.brandName,
    colors: input.colors,
    fonts: input.fonts,
    voice: input.voice,
    logoFile: input.logoFile,
    logoUrl: input.logoUrl,
  })

  // 3. Set onboarded = true
  const { error } = await supabase
    .from('users')
    .update({ onboarded: true })
    .eq('id', authStore.user!.id)

  if (error) throw error

  // 4. Create first canvas
  const canvas = await canvasesStore.createCanvas(brand.id, `${input.brandName} - Canvas 1`)

  // 5. Refresh profile (to pick up onboarded=true)
  await authStore.fetchProfile()

  // 6. Redirect to editor
  await router.push(`/editor/${canvas.id}`)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd kova-open-pencil-1 && bun test tests/unit/onboarding/completion.test.ts
```
Expected: PASS

- [ ] **Step 5: Wire completion into OnboardingView**

In `OnboardingView.vue`, add the finish handler:

```ts
import { ref } from 'vue'
import { completeOnboarding } from '@/composables/useOnboardingComplete'

const isFinishing = ref(false)
const finishError = ref<string | null>(null)

async function handleFinish(): Promise<void> {
  isFinishing.value = true
  finishError.value = null

  try {
    await completeOnboarding({
      name: state.name.value,
      brandName: state.brandName.value,
      colors: state.colors.value,
      fonts: state.fonts.value,
      voice: state.voice.value,
      logoFile: state.logoFile.value,
      logoUrl: state.logoUrl.value,
    })
  } catch (err) {
    finishError.value = err instanceof Error ? err.message : 'Something went wrong'
  } finally {
    isFinishing.value = false
  }
}
```

Add the "Finish Setup" button in the bottom bar (when step === 6):

```html
<button
  v-if="showFinishButton"
  data-test-id="onboarding-finish"
  class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
  :disabled="isFinishing"
  @click="handleFinish"
>
  {{ isFinishing ? 'Setting up...' : 'Finish Setup' }}
</button>

<!-- Error message -->
<p v-if="finishError" class="mt-2 text-sm text-red-500">{{ finishError }}</p>
```

- [ ] **Step 6: Run all unit tests**

```bash
cd kova-open-pencil-1 && bun run test:unit
```
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/composables/useOnboardingComplete.ts src/views/OnboardingView.vue tests/unit/onboarding/completion.test.ts
git commit -m "feat(m3): implement onboarding completion flow — save brand, create canvas, redirect to editor"
```

---

## Chunk 2 Verification

After completing Tasks 1–13:

- [ ] All unit tests pass: `cd kova-open-pencil-1 && bun run test:unit`
- [ ] Lint passes: `cd kova-open-pencil-1 && bun run check`
- [ ] Dev server runs without errors: `cd kova-open-pencil-1 && bun run dev`
- [ ] Navigate through all 7 steps in the browser
- [ ] "Enter manually" skip path works (step 4 → step 6)
- [ ] Brand card fills in live during extraction (step 5)
- [ ] Click-to-edit works on review screen (step 6)
- [ ] "Finish Setup" calls completion flow

Write a handoff summary for the next session (Chunk 3).

---

## Chunk 3: Phase 3.2 — Extraction APIs

### Task 14: Brand Extraction API Endpoint

**Files:**
- Create: `api/extract-brand.ts`
- **parallel:** yes (independent of Task 15)

- [ ] **Step 1: Create the api/ directory and endpoint**

This is a Vercel-style serverless function. It:
1. Validates input URL
2. Uses Firecrawl to scrape the website (screenshots + CSS data)
3. Sends results to Claude Vision API for brand analysis
4. Returns structured brand data

```ts
// api/extract-brand.ts
import Anthropic from '@anthropic-ai/sdk'

interface ExtractBrandRequest {
  url: string
}

interface ExtractBrandResponse {
  logo_url: string | null
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  fonts: {
    heading: string | null
    body: string | null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as ExtractBrandRequest

    if (!body.url || typeof body.url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Step 1: Scrape the website using Firecrawl
    const firecrawlKey = process.env.FIRECRAWL_API_KEY
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Scraping service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const normalizedUrl = body.url.startsWith('http') ? body.url : `https://${body.url}`

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        formats: ['screenshot', 'html'],
        actions: [{ type: 'screenshot', fullPage: false }],
      }),
    })

    if (!scrapeResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to scrape website', details: await scrapeResponse.text() }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const scrapeData = await scrapeResponse.json()

    // Step 2: Extract logo from HTML meta tags
    const html = scrapeData.data?.html ?? ''
    const logoUrl = extractLogoFromHtml(html, normalizedUrl)

    // Step 3: Send screenshot to Claude Vision for color/font analysis
    const screenshotUrl = scrapeData.data?.screenshot
    const client = new Anthropic({ apiKey })

    const content: Anthropic.Messages.ContentBlockParam[] = []

    if (screenshotUrl) {
      content.push({
        type: 'image',
        source: { type: 'url', url: screenshotUrl },
      })
    }

    content.push({
      type: 'text',
      text: `Analyze this website screenshot and identify the brand's visual identity.

Return a JSON object with:
- "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex" }
- "fonts": { "heading": "font name or null", "body": "font name or null" }

Rules:
- Colors should be the DOMINANT brand colors, not incidental UI colors
- Primary = main brand color (usually buttons, links, headers)
- Secondary = supporting color (usually text, dark elements)
- Accent = highlight/CTA color
- Background = main page background
- All colors as 6-digit hex with # prefix
- Font names should be the actual font family, not generic (not "sans-serif")
- If you can't determine a font, use null

Return ONLY the JSON object, no markdown or explanation.`,
    })

    const visionResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content }],
    })

    const responseText =
      visionResponse.content[0].type === 'text' ? visionResponse.content[0].text : ''

    let extracted: Partial<ExtractBrandResponse> = {}
    try {
      extracted = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim())
    } catch {
      // Fallback defaults
    }

    const result: ExtractBrandResponse = {
      logo_url: logoUrl,
      colors: {
        primary: extracted.colors?.primary ?? '#2563eb',
        secondary: extracted.colors?.secondary ?? '#1e293b',
        accent: extracted.colors?.accent ?? '#f59e0b',
        background: extracted.colors?.background ?? '#ffffff',
      },
      fonts: {
        heading: extracted.fonts?.heading ?? null,
        body: extracted.fonts?.body ?? null,
      },
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function extractLogoFromHtml(html: string, baseUrl: string): string | null {
  // Try common meta tags and link elements
  const patterns = [
    /property="og:image"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:image"/i,
    /rel="apple-touch-icon"[^>]+href="([^"]+)"/i,
    /rel="icon"[^>]+href="([^"]+)"/i,
    /rel="shortcut icon"[^>]+href="([^"]+)"/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const url = match[1]
      if (url.startsWith('http')) return url
      if (url.startsWith('//')) return `https:${url}`
      if (url.startsWith('/')) {
        try {
          const base = new URL(baseUrl)
          return `${base.origin}${url}`
        } catch {
          return null
        }
      }
      return url
    }
  }

  return null
}
```

**Note:** This endpoint depends on `ANTHROPIC_API_KEY` and `FIRECRAWL_API_KEY` environment variables. For local dev, add these to `.env.local` (not committed).

- [ ] **Step 2: Commit**

```bash
git add api/extract-brand.ts
git commit -m "feat(m3): add brand extraction API endpoint using Firecrawl + Claude Vision"
```

---

### Task 15: Writing Style Analysis API Endpoint

**Files:**
- Create: `api/analyze-writing-style.ts`
- **parallel:** yes (independent of Task 14)

- [ ] **Step 1: Implement the endpoint**

```ts
// api/analyze-writing-style.ts
import Anthropic from '@anthropic-ai/sdk'

interface AnalyzeRequest {
  url: string
}

interface AnalyzeResponse {
  writing_style: string
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as AnalyzeRequest

    if (!body.url || typeof body.url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    const firecrawlKey = process.env.FIRECRAWL_API_KEY

    if (!apiKey || !firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const normalizedUrl = body.url.startsWith('http') ? body.url : `https://${body.url}`

    // Scrape text content
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        formats: ['markdown'],
      }),
    })

    if (!scrapeResponse.ok) {
      return new Response(
        JSON.stringify({ writing_style: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const scrapeData = await scrapeResponse.json()
    const textContent = scrapeData.data?.markdown ?? ''

    if (!textContent.trim()) {
      return new Response(
        JSON.stringify({ writing_style: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Truncate to avoid excessive token usage
    const truncatedText = textContent.slice(0, 5000)

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Analyze this brand's website copy and describe their writing style in 1-2 sentences. Focus on tone, formality, personality, and voice. Be specific and actionable — a copywriter should be able to use your description to write in this brand's voice.

Website copy:
${truncatedText}

Return ONLY the writing style description, no quotes or preamble.`,
        },
      ],
    })

    const writingStyle =
      response.content[0].type === 'text' ? response.content[0].text.trim() : null

    return new Response(
      JSON.stringify({ writing_style: writingStyle } as AnalyzeResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    // Graceful fallback — return null on any error
    return new Response(
      JSON.stringify({ writing_style: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/analyze-writing-style.ts
git commit -m "feat(m3): add writing style analysis API endpoint using Firecrawl + Claude"
```

---

### Task 16: Wire APIs into ExtractionStep

**Files:**
- Modify: `src/components/onboarding/ExtractionStep.vue`
- **parallel:** no (depends on Tasks 14, 15)

- [ ] **Step 1: Replace mock extraction with real API calls**

Update `ExtractionStep.vue` to call both endpoints in parallel:

```ts
import { normalizeUrl } from '@/utils/onboarding-validators'

async function runExtraction(): Promise<void> {
  const url = normalizeUrl(state.brandUrl.value)

  // Start both API calls in parallel
  const brandPromise = fetchBrandData(url)
  const voicePromise = fetchWritingStyle(url)

  // Logo
  items[0].status = 'loading'
  try {
    const brandData = await brandPromise
    state.logoUrl.value = brandData.logo_url
    items[0].status = 'done'
    items[0].result = brandData.logo_url ? 'Logo found' : 'No logo found'
  } catch {
    items[0].status = 'error'
  }

  // Colors (from same API response, cached)
  items[1].status = 'loading'
  try {
    const brandData = await brandPromise
    state.colors.value = brandData.colors
    items[1].status = 'done'
  } catch {
    items[1].status = 'error'
  }

  // Fonts (from same API response, cached)
  items[2].status = 'loading'
  try {
    const brandData = await brandPromise
    state.fonts.value = brandData.fonts
    items[2].status = 'done'
    if (brandData.fonts.heading || brandData.fonts.body) {
      items[2].result = [brandData.fonts.heading, brandData.fonts.body].filter(Boolean).join(', ')
    }
  } catch {
    items[2].status = 'error'
  }

  // Voice
  items[3].status = 'loading'
  try {
    const voiceData = await voicePromise
    state.voice.value = voiceData.writing_style
    items[3].status = voiceData.writing_style ? 'done' : 'error'
    items[3].result = voiceData.writing_style ?? undefined
  } catch {
    items[3].status = 'error'
  }

  allDone.value = true
  await delay(1500)
  if (allDone.value) {
    emit('complete')
  }
}

let cachedBrandData: ExtractBrandResponse | null = null

async function fetchBrandData(url: string): Promise<ExtractBrandResponse> {
  if (cachedBrandData) return cachedBrandData
  const res = await fetch('/api/extract-brand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error('Extraction failed')
  cachedBrandData = await res.json()
  return cachedBrandData!
}

async function fetchWritingStyle(url: string): Promise<{ writing_style: string | null }> {
  const res = await fetch('/api/analyze-writing-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error('Analysis failed')
  return res.json()
}
```

The key changes:
- Replace mock delays with real API calls
- Both endpoints called in parallel on mount
- `extract-brand` response is cached (logo, colors, fonts come from same call)
- Progressive UI updates as each piece arrives
- Partial failure: individual items show error, flow continues

**Important:** Keep the mock data as a fallback for dev environments where API keys aren't configured. Use an environment check:

```ts
const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL // No Supabase = local dev without APIs
```

- [ ] **Step 2: Verify in browser with mock data (dev) and with real APIs if keys are configured**

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/ExtractionStep.vue
git commit -m "feat(m3): wire brand extraction and writing style APIs into extraction step"
```

---

## Chunk 3 Verification

After completing Tasks 14–16:

- [ ] Both API endpoints exist: `api/extract-brand.ts`, `api/analyze-writing-style.ts`
- [ ] ExtractionStep calls real APIs when available, falls back to mock
- [ ] Partial failures handled gracefully
- [ ] All unit tests still pass: `cd kova-open-pencil-1 && bun run test:unit`

Write a handoff summary for the next session (Chunk 4).

---

## Chunk 4: Integration + Polish

### Task 17: Route Guard Tests

**Files:**
- Modify: `tests/unit/router/guards.test.ts`
- **parallel:** yes

- [ ] **Step 1: Add onboarding-specific guard test cases**

These tests already exist partially in `guards.test.ts`. Verify and add any missing cases:

```ts
// Add to existing tests/unit/router/guards.test.ts

test('non-onboarded user redirected from /editor to /onboarding', () => {
  const result = resolveGuard(
    { meta: { requiresAuth: true, requiresOnboarding: true }, path: '/editor/some-id' },
    authedNotOnboarded,
  )
  expect(result).toBe('/onboarding')
})

test('onboarded user can access /editor', () => {
  const result = resolveGuard(
    { meta: { requiresAuth: true, requiresOnboarding: true }, path: '/editor/some-id' },
    authed,
  )
  expect(result).toBe(true)
})
```

- [ ] **Step 2: Run tests**

```bash
cd kova-open-pencil-1 && bun test tests/unit/router/guards.test.ts
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unit/router/guards.test.ts
git commit -m "test(m3): add onboarding-specific route guard test cases"
```

---

### Task 18: Build + Lint Verification

**Files:** none (verification only)
- **parallel:** no

- [ ] **Step 1: Run full unit test suite**

```bash
cd kova-open-pencil-1 && bun run test:unit
```
Expected: All PASS

- [ ] **Step 2: Run lint and type check**

```bash
cd kova-open-pencil-1 && bun run check
```
Expected: No errors. Fix any lint/type issues found.

- [ ] **Step 3: Run production build**

```bash
cd kova-open-pencil-1 && bun run build
```
Expected: Build succeeds

- [ ] **Step 4: Run copy-paste detection**

```bash
cd kova-open-pencil-1 && bun run test:dupes
```
Expected: Under 3% duplication threshold

---

### Task 19: Final Polish + Edge Cases

**Files:** Various
- **parallel:** no

- [ ] **Step 1: Verify all DoD criteria**

Checklist from handoff document:
- [ ] All 7 onboarding screens render and navigate correctly
- [ ] Split-screen layout: light left / dark right with email wireframe (1-4) and brand card (5-6)
- [ ] Brand extraction endpoint scrapes a URL and returns structured brand data
- [ ] Writing style endpoint analyzes copy and returns a style description
- [ ] Extraction results pre-fill the review screen progressively
- [ ] "Enter manually" path skips extraction entirely
- [ ] Click-to-edit on review screen for all fields
- [ ] Completing onboarding: saves user name, creates brand row, uploads logo, creates canvas, sets onboarded=true, redirects to `/editor/:canvasId`
- [ ] Route guards prevent onboarded users from seeing onboarding again
- [ ] All tests pass (`bun run test:unit`)
- [ ] Build succeeds (`bun run build`)
- [ ] Lint clean (`bun run check`)

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore(m3): final polish and edge case fixes for onboarding wizard"
```

---

## Summary

| Task | Name | Parallel | Dependencies |
|------|------|----------|-------------|
| 1 | DB Migration + Auth Store Name | no | — |
| 2 | Onboarding Validators | yes | — |
| 3 | useOnboardingState Composable | yes | Task 2 (validators) |
| 4 | Brands Store createBrandFull | yes | — |
| 5 | OnboardingView Shell | no | Tasks 1–4 |
| 6 | WelcomeStep + NameStep | yes | Task 5 |
| 7 | BrandNameStep + BrandUrlStep | yes | Task 5 |
| 8 | EmailWireframe | yes | Task 5 |
| 9 | BrandCard | yes | Task 5 |
| 10 | ExtractionStep (mock) | yes | Task 5 |
| 11 | ClickToEdit + ColorPicker | yes | Task 5 |
| 12 | ReviewStep | no | Tasks 9, 11 |
| 13 | Completion Flow | no | Tasks 1, 4, 5, 12 |
| 14 | Extract Brand API | yes | — |
| 15 | Analyze Writing Style API | yes | — |
| 16 | Wire APIs into ExtractionStep | no | Tasks 14, 15 |
| 17 | Route Guard Tests | yes | — |
| 18 | Build + Lint Verification | no | All |
| 19 | Final Polish | no | All |
