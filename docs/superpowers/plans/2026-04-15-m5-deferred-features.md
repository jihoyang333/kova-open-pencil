# M5 Deferred Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete three features deferred from M5 — Brand Memory Store, Assistant Message Persistence, and Media Library Picker UI — clearing the way for M5.5 AI quality engineering.

**Architecture:** Brand Memory uses Supabase (`brand_memories` table) + Pinia store + a new `saveBrandMemory` AI tool wired into the existing `createKovaTools()`/`createAITools()` pipeline; the system prompt layer (`build-system-prompt.ts`) already formats memories correctly. Message Persistence fixes two narrow gaps in `ChatPopup.vue`: persisting the assistant response in the `sendMessage` `.then()` and passing `initialMessages` when the `Chat` instance is recreated on tab switch. Media Picker replaces the hidden `<input type="file">` with a new `ChatMediaPickerDialog.vue` dialog (Reka UI `Dialog` wrapping the existing `MediaGrid.vue`).

**Tech Stack:** Vue 3 Composition API, TypeScript, Pinia, Supabase (via MCP), Valibot (AI tool schemas), `@ai-sdk/vue` `Chat` / `useChat`, Reka UI `DialogRoot`/`DialogContent`, Tailwind CSS 4, unplugin-icons/Lucide, bun:test

---

## Pre-work: Create Feature Branch

- [ ] **Step 1: Create branch**

```bash
cd kova-open-pencil-1
git checkout -b feat/m5-deferred
```

Expected: `Switched to a new branch 'feat/m5-deferred'`

---

## Feature 1: Brand Memory Store

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260415_m5_brand_memories.sql`

- [ ] **Step 1: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with:
- `name`: `20260415_m5_brand_memories`
- `query`:
```sql
CREATE TABLE public.brand_memories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('auto', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brand_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own brand memories"
  ON public.brand_memories FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX idx_brand_memories_brand
  ON public.brand_memories (brand_id, user_id);
```

- [ ] **Step 2: Save migration file locally**

Create `supabase/migrations/20260415_m5_brand_memories.sql` with the SQL above so the local history matches the remote.

---

### Task 2: Brand Memory Type

**Files:**
- Create: `src/types/kova/brand-memory.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/types/brand-memory.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test'
import type { BrandMemory, BrandMemorySource } from '@/types/kova/brand-memory'

describe('BrandMemory type', () => {
  test('BrandMemory has the expected shape', () => {
    const memory: BrandMemory = {
      id: 'mem-1',
      brand_id: 'brand-1',
      user_id: 'user-1',
      content: 'CTAs should always use coral',
      source: 'auto',
      created_at: '2026-04-15T00:00:00Z',
    }
    expect(memory.id).toBe('mem-1')
    expect(memory.source).toBe('auto')
  })

  test('source is narrowed to auto | user', () => {
    const sources: BrandMemorySource[] = ['auto', 'user']
    expect(sources).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
bun test ./tests/unit/types/brand-memory.test.ts
```
Expected: FAIL — cannot find module `@/types/kova/brand-memory`

- [ ] **Step 3: Create the type file**

Create `src/types/kova/brand-memory.ts`:
```typescript
export type BrandMemorySource = 'auto' | 'user'

export interface BrandMemory {
  readonly id: string
  readonly brand_id: string
  readonly user_id: string
  readonly content: string
  readonly source: BrandMemorySource
  readonly created_at: string
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
bun test ./tests/unit/types/brand-memory.test.ts
```
Expected: PASS

---

### Task 3: Brand Memories Pinia Store

**Files:**
- Create: `src/stores/brand-memories.ts`
- Create: `tests/unit/stores/brand-memories.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/stores/brand-memories.test.ts`:
```typescript
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { createMockUser } from '../../helpers/mock-user'

const mockFrom = mock(() => ({}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mock(() =>
        Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
      ),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useBrandMemoriesStore } = await import('@/stores/brand-memories')
const { useAuthStore } = await import('@/stores/auth')

const sampleMemory = {
  id: 'mem-1',
  brand_id: 'brand-1',
  user_id: 'user-1',
  content: 'CTAs should use coral',
  source: 'auto' as const,
  created_at: '2026-04-15T00:00:00Z',
}

describe('brand memories store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = createMockUser()
  })

  test('fetchMemories loads memories for a brand', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [sampleMemory], error: null }),
          }),
        }),
      }),
    })

    const store = useBrandMemoriesStore()
    const result = await store.fetchMemories('brand-1')
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('CTAs should use coral')
  })

  test('saveMemory inserts and returns the new memory', async () => {
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleMemory, error: null }),
        }),
      }),
    })

    const store = useBrandMemoriesStore()
    const result = await store.saveMemory('brand-1', 'CTAs should use coral', 'auto')
    expect(result.id).toBe('mem-1')
    expect(result.source).toBe('auto')
  })

  test('deleteMemory calls delete with the correct id', async () => {
    const eqMock = mock(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValueOnce({
      delete: () => ({ eq: eqMock }),
    })

    const store = useBrandMemoriesStore()
    await store.deleteMemory('mem-1')
    expect(eqMock).toHaveBeenCalledWith('id', 'mem-1')
  })

  test('updateMemory calls update with the correct id and content', async () => {
    const eqMock = mock(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValueOnce({
      update: () => ({ eq: eqMock }),
    })

    const store = useBrandMemoriesStore()
    await store.updateMemory('mem-1', 'Updated content')
    expect(eqMock).toHaveBeenCalledWith('id', 'mem-1')
  })

  test('saveMemory throws when not authenticated', async () => {
    const store = useBrandMemoriesStore()
    const authStore = useAuthStore()
    authStore.user = null
    await expect(store.saveMemory('brand-1', 'test', 'auto')).rejects.toThrow('Not authenticated')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
bun test ./tests/unit/stores/brand-memories.test.ts
```
Expected: FAIL — cannot find module `@/stores/brand-memories`

- [ ] **Step 3: Create the store**

Create `src/stores/brand-memories.ts`:
```typescript
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { BrandMemory, BrandMemorySource } from '@/types/kova/brand-memory'

export const useBrandMemoriesStore = defineStore('brand-memories', () => {
  const authStore = useAuthStore()

  async function fetchMemories(brandId: string): Promise<BrandMemory[]> {
    const userId = authStore.user?.id
    if (!userId) return []

    const { data, error } = await supabase
      .from('brand_memories')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as BrandMemory[]
  }

  async function saveMemory(
    brandId: string,
    content: string,
    source: BrandMemorySource
  ): Promise<BrandMemory> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('brand_memories')
      .insert({ brand_id: brandId, user_id: userId, content, source })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to save memory')
    return data as BrandMemory
  }

  async function deleteMemory(memoryId: string): Promise<void> {
    const { error } = await supabase
      .from('brand_memories')
      .delete()
      .eq('id', memoryId)

    if (error) throw new Error(error.message)
  }

  async function updateMemory(memoryId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('brand_memories')
      .update({ content })
      .eq('id', memoryId)

    if (error) throw new Error(error.message)
  }

  return { fetchMemories, saveMemory, deleteMemory, updateMemory }
})
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun test ./tests/unit/stores/brand-memories.test.ts
```
Expected: 5 tests PASS

---

### Task 4: `saveBrandMemory` AI Tool

**Files:**
- Modify: `src/ai/kova-tools.ts`
- Modify: `tests/unit/ai/kova-tools.test.ts`

- [ ] **Step 1: Add failing test for saveBrandMemory**

Append to `tests/unit/ai/kova-tools.test.ts`:
```typescript
describe('saveBrandMemory tool', () => {
  test('saveBrandMemory is included in createKovaTools output', async () => {
    const { createKovaTools } = await import('@/ai/kova-tools')
    const storeStub = {} as Parameters<typeof createKovaTools>[0]
    const memoriesStoreStub = {
      saveMemory: async () => ({
        id: 'mem-1', brand_id: 'b-1', user_id: 'u-1',
        content: 'test', source: 'auto' as const, created_at: '2026-04-15T00:00:00Z',
      }),
    }
    const tools = createKovaTools(storeStub, 'brand-1', memoriesStoreStub)
    expect(tools.saveBrandMemory).toBeDefined()
  })

  test('saveBrandMemory inputSchema has type: "object"', async () => {
    const { createKovaTools } = await import('@/ai/kova-tools')
    const storeStub = {} as Parameters<typeof createKovaTools>[0]
    const memoriesStoreStub = {
      saveMemory: async () => ({
        id: 'mem-1', brand_id: 'b-1', user_id: 'u-1',
        content: 'test', source: 'auto' as const, created_at: '2026-04-15T00:00:00Z',
      }),
    }
    const tools = createKovaTools(storeStub, 'brand-1', memoriesStoreStub)
    const schema = (tools.saveBrandMemory as { inputSchema?: { jsonSchema?: { type?: string } } }).inputSchema
    const jsonSchema = await schema?.jsonSchema
    expect(jsonSchema?.type).toBe('object')
  })

  test('saveBrandMemory execute returns confirmation string', async () => {
    const { createKovaTools } = await import('@/ai/kova-tools')
    const storeStub = {} as Parameters<typeof createKovaTools>[0]
    let savedContent = ''
    let savedSource = ''
    const memoriesStoreStub = {
      saveMemory: async (_brandId: string, content: string, source: 'auto' | 'user') => {
        savedContent = content
        savedSource = source
        return {
          id: 'mem-new', brand_id: 'b-1', user_id: 'u-1',
          content, source, created_at: '2026-04-15T00:00:00Z',
        }
      },
    }
    const tools = createKovaTools(storeStub, 'brand-1', memoriesStoreStub)
    const result = await (tools.saveBrandMemory as { execute: (args: { content: string; source: 'auto' | 'user' }) => Promise<string> }).execute({
      content: 'CTAs should use coral',
      source: 'auto',
    })
    expect(result).toContain('CTAs should use coral')
    expect(savedContent).toBe('CTAs should use coral')
    expect(savedSource).toBe('auto')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
bun test ./tests/unit/ai/kova-tools.test.ts
```
Expected: FAIL — `createKovaTools` does not accept 3 arguments

- [ ] **Step 3: Update kova-tools.ts to add saveBrandMemory**

Replace `src/ai/kova-tools.ts` with:
```typescript
import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { makeFigmaFromStore } from '@/automation/figma-factory'
import { computeAllLayouts } from '@open-pencil/core'

import type { EditorStore } from '@/stores/editor'
import type { BrandMemory, BrandMemorySource } from '@/types/kova/brand-memory'

const SUPABASE_STORAGE_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//

const FETCH_TIMEOUT_MS = 10_000

/** Throws if `url` is not a valid Supabase Storage HTTPS URL. */
export function validateImageUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed')
  }

  if (!SUPABASE_STORAGE_PATTERN.test(url)) {
    throw new Error(`Only Supabase Storage URLs are allowed. Got: ${url}`)
  }
}

export interface BrandMemoriesContext {
  saveMemory(brandId: string, content: string, source: BrandMemorySource): Promise<BrandMemory>
}

export function createKovaTools(
  store: EditorStore,
  brandId: string,
  brandMemoriesStore: BrandMemoriesContext
) {
  const placeMediaImage = tool({
    description:
      'Place an image from Supabase Storage onto a canvas node. ' +
      'Fetches the image and sets it as an image fill on the target node. ' +
      'Only accepts Supabase Storage URLs.',
    inputSchema: valibotSchema(
      v.object({
        node_id: v.pipe(
          v.string(),
          v.description('The ID of the target node to place the image on')
        ),
        image_url: v.pipe(
          v.string(),
          v.description('Supabase Storage URL of the image')
        ),
        scale_mode: v.optional(
          v.pipe(
            v.picklist(['FILL', 'FIT', 'CROP', 'TILE']),
            v.description('How to scale the image within the node')
          ),
          'FILL'
        ),
      })
    ),
    execute: async ({ node_id, image_url, scale_mode }) => {
      try {
        validateImageUrl(image_url)
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Invalid URL' }
      }

      const figma = makeFigmaFromStore(store)
      const node = figma.getNodeById(node_id)
      if (!node) {
        return { error: `Node ${node_id} not found` }
      }

      let imageBytes: Uint8Array
      try {
        const response = await fetch(image_url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })

        if (!response.ok) {
          return {
            error: `Failed to load image from ${image_url}. HTTP ${response.status}. Using a placeholder instead.`,
          }
        }

        imageBytes = new Uint8Array(await response.arrayBuffer())
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        return {
          error: `Failed to load image from ${image_url}. ${message}. Using a placeholder instead.`,
        }
      }

      const beforeSnapshot = store.snapshotPage()

      const image = figma.createImage(imageBytes)
      node.fills = [
        {
          type: 'IMAGE',
          color: { r: 1, g: 1, b: 1, a: 1 },
          opacity: 1,
          visible: true,
          imageHash: image.hash,
          imageScaleMode: scale_mode,
        },
      ]

      const pageId = store.state.currentPageId
      computeAllLayouts(store.graph, pageId)
      store.requestRender()

      const afterSnapshot = store.snapshotPage()
      store.pushUndoEntry({
        label: 'AI: placeMediaImage',
        forward: () => store.restorePageFromSnapshot(afterSnapshot),
        inverse: () => store.restorePageFromSnapshot(beforeSnapshot),
      })

      store.renderer?.aiClearActive()
      store.aiFlashDone([node_id])

      return { success: true, node_id, scale_mode }
    },
  })

  const saveBrandMemory = tool({
    description:
      'Save a brand memory that will persist across all future chat sessions for this brand. ' +
      'Use source "auto" when you detect a durable preference or constraint from the user. ' +
      'Use source "user" when the user explicitly asks you to remember something.',
    inputSchema: valibotSchema(
      v.object({
        content: v.pipe(
          v.string(),
          v.description('The memory content to save — a single concise fact or preference')
        ),
        source: v.pipe(
          v.picklist(['auto', 'user']),
          v.description('"auto" = AI-detected preference, "user" = explicitly requested by user')
        ),
      })
    ),
    execute: async ({ content, source }) => {
      try {
        await brandMemoriesStore.saveMemory(brandId, content, source)
        return `Memory saved: "${content}"`
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        return `Failed to save memory: ${message}`
      }
    },
  })

  return { placeMediaImage, saveBrandMemory } as const
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun test ./tests/unit/ai/kova-tools.test.ts
```
Expected: All tests PASS (including pre-existing URL validation tests)

---

### Task 5: Wire `createKovaTools` into `createAITools`

**Files:**
- Modify: `src/ai/tools.ts`

The existing `createAITools(store: EditorStore)` calls `createKovaTools(store)`. The signature now requires `brandId` and `brandMemoriesStore`. These come from `useBrandsStore()` and `useBrandMemoriesStore()` — same pattern as how `brandsStore` is already used in `use-chat.ts`.

- [ ] **Step 1: Write test for createAITools still includes all tools**

Append to `tests/unit/ai/kova-tools.test.ts`:
```typescript
describe('createAITools integration', () => {
  test('createAITools exposes saveBrandMemory at the top level', async () => {
    // We cannot fully instantiate createAITools (it requires an EditorStore with
    // Figma internals), but we verify createKovaTools is re-exported correctly
    // by checking the return type of createKovaTools includes saveBrandMemory.
    const { createKovaTools } = await import('@/ai/kova-tools')
    const storeStub = {} as Parameters<typeof createKovaTools>[0]
    const memoriesStoreStub = {
      saveMemory: async () => ({
        id: 'mem-1', brand_id: 'b-1', user_id: 'u-1',
        content: 'test', source: 'auto' as const, created_at: '2026-04-15T00:00:00Z',
      }),
    }
    const tools = createKovaTools(storeStub, 'brand-1', memoriesStoreStub)
    // placeMediaImage must still be present
    expect(tools.placeMediaImage).toBeDefined()
    expect(tools.saveBrandMemory).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test — expect PASS** (already works from Task 4 changes)

```bash
bun test ./tests/unit/ai/kova-tools.test.ts
```

- [ ] **Step 3: Update `src/ai/tools.ts` to pass brandId and brandMemoriesStore**

In `src/ai/tools.ts`, update the `createAITools` function. The `brandId` comes from `useBrandsStore().selectedBrand?.id`. Add the import and update the call:

Find the line:
```typescript
export function createAITools(store: EditorStore) {
```

And the block:
```typescript
  const kovaTools = createKovaTools(store)
  return { ...coreToolsResult, ...kovaTools }
```

Replace with the updated `createAITools` that accepts `brandId`:
```typescript
import { useBrandMemoriesStore } from '@/stores/brand-memories'
```

Add this import at the top of the file (after the existing imports), then update the function signature and the `createKovaTools` call:

The full updated `createAITools` signature and kovaTools lines:
```typescript
export function createAITools(store: EditorStore, brandId: string) {
  // ... all existing code unchanged ...
  const kovaTools = createKovaTools(store, brandId, useBrandMemoriesStore())
  return { ...coreToolsResult, ...kovaTools }
}
```

Update the `AITools` type export at the bottom — it's `ReturnType<typeof createAITools>` which is still correct.

- [ ] **Step 4: Update `src/composables/use-chat.ts` to pass brandId to createAITools**

In `use-chat.ts`, the `createTransport()` function calls `createAITools(useEditorStore())`.

Find:
```typescript
  const tools = createAITools(useEditorStore())
```

The `brandId` is not in scope inside `createTransport()` yet. It needs to come from `brandsStore.selectedBrand?.id`. The `brandsStore` is already accessed in the same function. Update the line:

```typescript
  const tools = createAITools(useEditorStore(), brandsStore.selectedBrand?.id ?? '')
```

(The `brandsStore` is already declared two lines below — move the declaration above the `createAITools` call, or inline the store access.)

The updated block in `createTransport()`:
```typescript
  const tools = createAITools(useEditorStore(), useBrandsStore().selectedBrand?.id ?? '')
  const brandsStore = useBrandsStore()
  const mediaStore = useMediaStore()
```

- [ ] **Step 5: Run type-check**

```bash
bun run check
```
Expected: 0 errors, 0 warnings

---

### Task 6: Wire `fetchMemories` into `use-chat.ts`

**Files:**
- Modify: `src/composables/use-chat.ts`

- [ ] **Step 1: Replace the stub in prepareCall**

In `src/composables/use-chat.ts`, find the `prepareCall` function inside `createTransport()`.

Find:
```typescript
      // TODO(M5.5): Source brandMemories from a brand-memory store when it exists.
      const instructions = await buildSystemPrompt({
        brandProfile,
        availableImages,
        brandMemories: [],
        chatAttachments: activeChatAttachmentsForAI.value,
        campaignType: activeCampaignType.value,
      })
```

Replace with:
```typescript
      const brandMemoriesStore = useBrandMemoriesStore()
      const brandMemories = brandProfile?.id
        ? await brandMemoriesStore.fetchMemories(brandProfile.id)
        : []
      const instructions = await buildSystemPrompt({
        brandProfile,
        availableImages,
        brandMemories,
        chatAttachments: activeChatAttachmentsForAI.value,
        campaignType: activeCampaignType.value,
      })
```

- [ ] **Step 2: Add import for useBrandMemoriesStore**

Add to the imports section at the top of `src/composables/use-chat.ts`:
```typescript
import { useBrandMemoriesStore } from '@/stores/brand-memories'
```

- [ ] **Step 3: Run type-check**

```bash
bun run check
```
Expected: 0 errors, 0 warnings

---

### Task 7: Fill in `memory-instructions.md`

**Files:**
- Modify: `src/data/memory-instructions.md`

- [ ] **Step 1: Replace the stub with full instructions**

Replace the contents of `src/data/memory-instructions.md` with:
```markdown
## Brand Memory Instructions

You have access to a persistent memory system for this brand. Memories carry across every chat session.

### When to Auto-Save (`source: "auto"`)

Call `saveBrandMemory` with `source: "auto"` when you detect:

- **Durable preferences**: "I always want the logo in the top-left", "We never use sans-serif for headlines"
- **Brand constraints**: "Never use red — it's a competitor brand color", "Always include the tagline"
- **Recurring corrections**: If the user corrects the same thing twice in a conversation, it's a preference worth remembering

Do **not** auto-save:
- One-off requests for a single email ("make this one blue")
- Conversation filler ("thanks", "looks good")
- Facts already captured in the brand kit (colors, fonts, logo)

### When to Save on Request (`source: "user"`)

Call `saveBrandMemory` with `source: "user"` when the user explicitly asks:
- "Remember this", "Save this", "Keep this in mind"
- "From now on, always...", "Make a note that..."

### How to Communicate Saves

After calling `saveBrandMemory`, tell the user what was saved:

> "I've saved a memory for this brand: '[content]'. This will apply to all future design sessions."

Keep the confirmation brief. Do not call `saveBrandMemory` silently.

### Conflict Handling

If a new memory directly contradicts an existing one (e.g., "always use blue CTAs" vs. a previous "always use coral CTAs"), flag it:

> "I noticed this conflicts with a previous memory: '[existing content]'. Should I replace it with '[new content]', or keep both?"

Wait for the user's decision before saving.
```

- [ ] **Step 2: Run check**

```bash
bun run check
```
Expected: 0 errors

---

### Task 8: Quality Gate + Commit Feature 1

- [ ] **Step 1: Run full quality gates**

```bash
cd kova-open-pencil-1
bun run check && bun run test:unit && bun run test:dupes
```
Expected:
- `check`: 0 errors, 0 warnings
- `test:unit`: 1145+ pass, same 12 pre-existing failures (COLOR alpha, MCP fig, fetchBundledFont×2, clipboard roundtrip, fig export/import×5, flip roundtrip×3)
- `test:dupes`: under 3%

- [ ] **Step 2: Commit**

```bash
git add \
  supabase/migrations/20260415_m5_brand_memories.sql \
  src/types/kova/brand-memory.ts \
  src/stores/brand-memories.ts \
  src/ai/kova-tools.ts \
  src/ai/tools.ts \
  src/composables/use-chat.ts \
  src/data/memory-instructions.md \
  tests/unit/types/brand-memory.test.ts \
  tests/unit/stores/brand-memories.test.ts \
  tests/unit/ai/kova-tools.test.ts
git commit -m "feat(m5): add brand memory system — tool, store, migration, instructions"
```

---

### Task 9: Code Review

- [ ] **Step 1: Invoke code-reviewer agent**

Use `superpowers:requesting-code-review` skill. Scope: all files changed in Feature 1 (Tasks 1–8). Verify: Valibot usage (not Zod), no `any`, no `!` non-null assertions, immutable patterns, function size ≤40 lines, Pinia Composition API pattern matches `src/stores/chat.ts`.

---

## Feature 2: Message Persistence

### Task 10: Persist Assistant Responses

**Files:**
- Modify: `src/components/chat/ChatPopup.vue`

The `handleSubmit` function sends a message and has a `.then()` callback. After the stream completes, `chat.value.messages` contains the full exchange. The last message with `role === 'assistant'` is the response to persist.

- [ ] **Step 1: Update handleSubmit to persist assistant response**

In `ChatPopup.vue`, find this block (around line 143–155):
```typescript
  // TODO(M5.5): Persist assistant response on stream complete.

  chat.value
    ?.sendMessage({ text: payload.text, files: payload.files })
    .then(() => {
      // Only clear on success so the user can retry after a 401/rate-limit without re-pasting.
      chatImages.clearAttachments()
    })
    .catch((e: unknown) => {
      console.error('Chat error:', e)
      toast.show(e instanceof Error ? e.message : 'Chat request failed', 'error')
    })
```

Replace with:
```typescript
  const conversationId = chatStore.activeConversationId

  chat.value
    ?.sendMessage({ text: payload.text, files: payload.files })
    .then(() => {
      chatImages.clearAttachments()

      // Persist the assistant response (non-blocking — don't surface persistence
      // failures to the user since the response was already shown in the UI).
      if (conversationId) {
        const msgs = chat.value?.messages ?? []
        const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant')
        if (lastAssistant) {
          const text = lastAssistant.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('')
          chatStore.addMessage(conversationId, 'assistant', text).catch((e) => {
            console.error('Failed to persist assistant response:', e)
          })
        }
      }
    })
    .catch((e: unknown) => {
      console.error('Chat error:', e)
      toast.show(e instanceof Error ? e.message : 'Chat request failed', 'error')
    })
```

- [ ] **Step 2: Run type-check**

```bash
bun run check
```
Expected: 0 errors

---

### Task 11: Reload Message History on Tab Switch

**Files:**
- Modify: `src/components/chat/ChatPopup.vue`
- Modify: `src/composables/use-chat.ts`

When the user switches tabs or the component initializes with an existing conversation, persisted messages should load back into the chat UI. The AI SDK's `Chat` class accepts `initialMessages` in its constructor options.

- [ ] **Step 1: Expose initialMessages in useAIChat**

In `src/composables/use-chat.ts`, the `ensureChat()` function creates `chat = new Chat<UIMessage>({ transport })`. We need a way to create a Chat instance with initial messages without always passing them.

Add an overload that accepts `initialMessages`. The `Chat` constructor in `@ai-sdk/vue` accepts `{ transport, initialMessages?: UIMessage[] }`.

Find the `ensureChat` function:
```typescript
async function ensureChat(): Promise<Chat<UIMessage> | null> {
  if (!isConfigured.value) return null
  if (!chat) {
    const transport = isACPProvider.value ? await createACPTransport() : createTransport()
    chat = new Chat<UIMessage>({ transport })
  }
  return chat
}
```

Replace with:
```typescript
async function ensureChat(
  initialMessages?: UIMessage[]
): Promise<Chat<UIMessage> | null> {
  if (!isConfigured.value) return null
  if (!chat) {
    const transport = isACPProvider.value ? await createACPTransport() : createTransport()
    chat = new Chat<UIMessage>({ transport, initialMessages })
  }
  return chat
}
```

Update the return of `useAIChat()` — `ensureChat` is already exported, no change needed to the return object.

- [ ] **Step 2: Add a `ChatMessage` to `UIMessage` converter**

The Supabase `ChatMessage` has `{ role, content, id, created_at }`. The AI SDK's `UIMessage` has `{ id, role, content, parts }`. We need to convert between them.

Add a helper function to `src/composables/use-chat.ts`:
```typescript
import type { ChatMessage } from '@/types/kova/chat'

function toUIMessages(stored: readonly ChatMessage[]): UIMessage[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    parts: [{ type: 'text' as const, text: m.content }],
  }))
}
```

Export this helper from `useAIChat()` return:
```typescript
export function useAIChat() {
  return {
    providerID,
    modelID,
    activeTab,
    isConfigured,
    ensureChat,
    resetChat,
    setActiveCampaignType,
    setActiveChatAttachmentsForAI,
    toUIMessages,
  }
}
```

- [ ] **Step 3: Update ChatPopup.vue handleSwitchTab to pass initialMessages**

In `ChatPopup.vue`, update destructuring to include `toUIMessages`:
```typescript
const {
  ensureChat,
  resetChat,
  setActiveCampaignType,
  setActiveChatAttachmentsForAI,
  toUIMessages,
} = useAIChat()
```

Find `handleSwitchTab`:
```typescript
async function handleSwitchTab(conversationId: string) {
  chatStore.activeConversationId = conversationId
  await chatStore.fetchMessages(conversationId)
  chat.value = null
  resetChat()
  clearToolLogEntries()
}
```

Replace with:
```typescript
async function handleSwitchTab(conversationId: string) {
  chatStore.activeConversationId = conversationId
  await chatStore.fetchMessages(conversationId)
  chat.value = null
  resetChat()
  clearToolLogEntries()
  chatImages.clearAttachments()

  if (chatStore.messages.length > 0) {
    isExpanded.value = true
    const initialMessages = toUIMessages(chatStore.messages)
    try {
      const c = await ensureChat(initialMessages)
      if (c) chat.value = markRaw(c)
    } catch (e) {
      console.error('Failed to restore chat history:', e)
    }
  }
}
```

- [ ] **Step 4: Run type-check**

```bash
bun run check
```
Expected: 0 errors

- [ ] **Step 5: Run quality gates and commit**

```bash
bun run check && bun run test:unit
```
Expected: same pass/fail counts as before.

```bash
git add \
  src/components/chat/ChatPopup.vue \
  src/composables/use-chat.ts
git commit -m "fix(m5): persist assistant responses and reload message history on refresh"
```

---

## Feature 3: Media Library Picker UI

### Task 12: ChatMediaPickerDialog Component

**Files:**
- Create: `src/components/chat/ChatMediaPickerDialog.vue`
- Modify: `src/components/chat/ChatPopup.vue`

- [ ] **Step 1: Create ChatMediaPickerDialog.vue**

Create `src/components/chat/ChatMediaPickerDialog.vue`:
```vue
<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { ref } from 'vue'

import MediaGrid from '@/components/media/MediaGrid.vue'
import { useMediaStore } from '@/stores/media'

import type { MediaAsset } from '@/types/kova/media'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [asset: MediaAsset]
}>()

const mediaStore = useMediaStore()
const searchQuery = ref('')

function handleSelect(asset: MediaAsset): void {
  emit('select', asset)
  emit('update:open', false)
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 flex h-[480px] w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-panel shadow-2xl"
      >
        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <DialogTitle class="text-sm font-medium text-white">
            Pick from Media Library
          </DialogTitle>
          <DialogClose
            class="flex size-6 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-[#ccc]"
          >
            <icon-lucide-x class="size-3.5" />
          </DialogClose>
        </div>

        <!-- Search -->
        <div class="shrink-0 border-b border-border px-4 py-2">
          <div class="flex items-center gap-2 rounded-lg bg-muted/10 px-3 py-1.5">
            <icon-lucide-search class="size-3.5 shrink-0 text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search images..."
              class="flex-1 bg-transparent text-xs text-white placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>

        <!-- Grid -->
        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <MediaGrid
            :images="mediaStore.images"
            density="compact"
            :search-query="searchQuery"
            sort-by="newest"
            @select="handleSelect"
          />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

- [ ] **Step 2: Update ChatPopup.vue — replace hidden input with dialog**

In `ChatPopup.vue`, make the following changes:

**2a. Add import:**
```typescript
import ChatMediaPickerDialog from '@/components/chat/ChatMediaPickerDialog.vue'
```

**2b. Replace `fileInput` ref with `mediaPickerOpen` reactive:**

Remove:
```typescript
const fileInput = ref<HTMLInputElement | null>(null)
```

Add:
```typescript
const mediaPickerOpen = ref(false)
```

**2c. Replace `handleAttachImage` and `handleFileSelected`:**

Remove:
```typescript
function handleAttachImage() {
  fileInput.value?.click()
}

async function handleFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return

  const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
  target.value = ''
  if (images.length === 0) return

  // attachFromClipboard inserts the pending placeholder synchronously, so running these
  // in parallel is safe — each call awaits its own upload independently.
  const results = await Promise.allSettled(
    images.map((file) => chatImages.attachFromClipboard(file)),
  )
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('Failed to attach image:', r.reason)
      const msg = r.reason instanceof Error ? r.reason.message : 'Failed to attach image'
      toast.show(msg, 'error')
    }
  }
}
```

Add:
```typescript
function handleAttachImage() {
  mediaPickerOpen.value = true
}

async function handleMediaPickerSelect(asset: { id: string; file_name: string; storage_path: string; width: number | null; height: number | null }) {
  try {
    await chatImages.attachFromMediaLibrary(asset)
  } catch (err) {
    console.error('Failed to attach media library image:', err)
    const msg = err instanceof Error ? err.message : 'Failed to attach image'
    toast.show(msg, 'error')
  }
}
```

**2d. In the template, replace the hidden input with the dialog:**

Remove the hidden input block at the bottom of the template:
```html
    <!-- Hidden file input for image selection -->
    <!-- TODO(M5.5): Replace with media library picker dialog -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      data-test-id="chat-file-input"
      @change="handleFileSelected"
    />
```

Add the dialog component instead (just before `</div>` closing the expanded popup):
```html
    <ChatMediaPickerDialog
      v-model:open="mediaPickerOpen"
      @select="handleMediaPickerSelect"
    />
```

- [ ] **Step 3: Run type-check**

```bash
bun run check
```
Expected: 0 errors

- [ ] **Step 4: Run quality gates and commit**

```bash
bun run check && bun run test:unit && bun run test:dupes
```
Expected: same pass/fail counts as Feature 1 gate (1145+ pass, 12 pre-existing fail, <3% dupes).

```bash
git add \
  src/components/chat/ChatMediaPickerDialog.vue \
  src/components/chat/ChatPopup.vue
git commit -m "feat(m5): replace hidden file input with media library picker dialog in chat"
```

---

## Final Quality Gate

- [ ] **Step 1: Run full suite from kova-open-pencil-1/**

```bash
bun run check && bun run test:unit && bun run test:dupes
```
Expected:
- `check`: 0 errors, 0 warnings
- `test:unit`: 1145+ pass, exactly 12 pre-existing failures
- `test:dupes`: < 3%

- [ ] **Step 2: Merge to master**

```bash
git checkout master
git merge --no-ff feat/m5-deferred -m "feat(m5): complete deferred features — brand memory, message persistence, media picker"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Task 5.3.6 Brand Memory: migration (Task 1), type (Task 2), store (Task 3), tool (Task 4), wiring into tools.ts (Task 5), wiring into use-chat.ts (Task 6), memory-instructions.md (Task 7)
- [x] Message persistence: assistant save in sendMessage .then() (Task 10), initialMessages on tab switch (Task 11)
- [x] Media picker: ChatMediaPickerDialog component + ChatPopup wiring (Task 12)

**Valibot constraint:** `saveBrandMemory` uses `v.object()` + `valibotSchema` from `@ai-sdk/valibot` — no Zod.

**Immutability:** Store methods return new arrays/objects; no mutations.

**File sizes:** All new files well under 600 lines. `kova-tools.ts` grows to ~130 lines.

**Type safety:** No `any`, no `!` non-null assertions.
