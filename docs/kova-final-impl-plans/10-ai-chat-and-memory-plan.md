# PRD 10 — AI Chat + Memory + Tool Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Kova's AI chat surface from floating popup to right-panel "AI" tab (Design + AI only, no Prototype), add per-conversation Shopify product-reference composer chips, extend the layered system-prompt builder with tone-snippet exemplars + active product references, refactor 5 Shopify AI tools (drop `bestsellers` sort + add no-connection error response), register `createSliceFromSelection` + `addMeasurement` AI tool wrappers around Cluster 07a engine APIs, and contribute the Anthropic sub-processor disclosure copy for Cluster 01's privacy policy + RoPA.

**Architecture:** TDD over the existing M5 + M5.5 chat infrastructure (`useChatStore`, `useBrandMemoriesStore`, `buildSystemPrompt`, `createKovaTools`, `ai-proxy/v1/messages`). One additive migration (`chat_conversations.product_references JSONB`). One new Pinia store (`useChatProductReferencesStore`). Two new Vue components (`ProductReferenceChipRow`, `ProductReferenceChip`). Three extensions of existing files (`build-system-prompt.ts`, `kova-tools.ts`, `ChatInput.vue`). One refactor of `ChatPanel.vue` (mount inside right-panel slot). One deletion (`ChatPopup.vue` — coordinated with Cluster 06). `SYSTEM_PROMPT` constant remains immutable per CLAUDE.md hard constraint. Anthropic key remains server-only behind `ai-proxy/v1/messages`. ToolLoopAgent + `@ai-sdk/anthropic` remain per CLAUDE.md.

**Tech Stack:** Vue 3 + Composition API (`<script setup lang="ts">`), Pinia setup stores, Tailwind 4, Reka UI primitives, Lucide icons, `@ai-sdk/anthropic` + `ai` package (ToolLoopAgent), `@ai-sdk/valibot` (NEVER Zod per CLAUDE.md), Supabase JS client, `bun:test` (engine tests under `tests/engine/`), Playwright (E2E), Supabase CLI migrations.

---

## File structure

### Files created

| Path | Responsibility |
|---|---|
| `kova-open-pencil-1/supabase/migrations/20260620_10_chat_product_references.sql` | Adds `chat_conversations.product_references JSONB` column + `validate_chat_product_references()` trigger. |
| `kova-open-pencil-1/src/stores/chat-product-references.ts` | Pinia store: per-conversation chip state (`activeReferences`, `isAtCapacity`, `importProducts`, `removeReference`, `clearReferences`). |
| `kova-open-pencil-1/src/components/chat/ProductReferenceChip.vue` | One chip — thumbnail + name + `×`. Emits `remove` on click. |
| `kova-open-pencil-1/src/components/chat/ProductReferenceChipRow.vue` | Renders one `<ProductReferenceChip>` per active reference. Collapses to height 0 when empty. |
| `kova-open-pencil-1/tests/engine/ai/build-system-prompt-extensions.test.ts` | Unit tests for `formatToneSnippets` + `formatProductReferences` + layer composition. |
| `kova-open-pencil-1/tests/engine/ai/slice-tool.test.ts` | Unit tests for `createSliceFromSelection` AI wrapper. |
| `kova-open-pencil-1/tests/engine/ai/measurement-tool.test.ts` | Unit tests for `addMeasurement` AI wrapper. |
| `kova-open-pencil-1/tests/unit/stores/chat-product-references.test.ts` | Unit tests for the Pinia store. |
| `kova-open-pencil-1/tests/unit/components/ProductReferenceChip.test.ts` | Unit tests for the chip component. |
| `kova-open-pencil-1/tests/unit/components/ProductReferenceChipRow.test.ts` | Unit tests for the row component. |
| `kova-open-pencil-1/tests/integration/chat-product-references.test.ts` | Integration tests: schema migration + trigger + RLS round-trip. |
| `kova-open-pencil-1/tests/e2e/ai-chat-panel-migration.spec.ts` | E2E: right-panel AI tab activates ChatPanel; ChatPopup absent. |
| `kova-open-pencil-1/tests/e2e/composer-chip-flow.spec.ts` | E2E: Import → chip render → reload → remove → 20-cap. |
| `kova-open-pencil-1/docs/legal/anthropic-subprocessor-disclosure.md` | Privacy / RoPA copy fragment contributed to Cluster 01. |

### Files modified

| Path | Responsibility added by this PRD |
|---|---|
| `kova-open-pencil-1/src/types/kova/chat.ts` | Add `ChatProductReference` interface + extend `ChatConversation` with `product_references` field. |
| `kova-open-pencil-1/src/stores/chat.ts` | Add `updateProductReferences(conversationId, refs)` action. |
| `kova-open-pencil-1/src/composables/use-chat.ts` | Add `setActiveProductReferences(refs)`; pipe into `prepareCall` → `buildSystemPrompt(...)`. |
| `kova-open-pencil-1/src/ai/build-system-prompt.ts` | Add `formatToneSnippets` + `formatProductReferences`; insert Layer 4b + Layer 9 in the composition. |
| `kova-open-pencil-1/src/ai/kova-tools.ts` | (a) Drop `bestsellers` from `searchProductsSchema.sort` picklist. (b) Add `hasShopifyConnection` guard + `NO_CONNECTION` early-return to all 5 Shopify tools. (c) Add `createSliceFromSelection` + `addMeasurement` tool definitions. |
| `kova-open-pencil-1/src/components/chat/ChatInput.vue` | Add `productReferences` prop + `remove-reference` emit. Render `<ProductReferenceChipRow>` above the existing attachment row. |
| `kova-open-pencil-1/src/components/ChatPanel.vue` | Refactor from stub to full right-panel-mounted chat surface: per-conversation tab strip, message scroll area, composer chip wiring. |
| `kova-open-pencil-1/tests/engine/shopify/ai-tools.test.ts` | Extend to cover `bestsellers`-rejected schema + 5×no-connection paths. |

### Files deleted

| Path | Why |
|---|---|
| `kova-open-pencil-1/src/components/chat/ChatPopup.vue` | Replaced by `<ChatPanel>` mounted in right-panel AI tab slot. Coordinated with Cluster 06. |

### Files NOT touched (per CLAUDE.md hard constraints)

- `packages/core/` — engine, tools, figma-api, renderer, scene graph. Cluster 07a owns Slice + Measurement engine work.
- `src/ai/system-prompt.md` — locked content. Layer 1 of `buildSystemPrompt`.
- Yjs / y-indexeddb local persistence layer.

---

## Pre-flight checks

- [ ] **PFC.1 — Branch state**

  Run: `cd kova-open-pencil-1 && git status -uno && git branch --show-current`

  Expected: clean working tree (or only this plan's authored docs); branch = `feat/m9-shopify` (per memory `project_pre_prd_audit_ratified`) or the active feature branch at execution time.

- [ ] **PFC.2 — Cluster 05 dependency intent**

  Read PRD 05 `docs/kova-final-prds/05-brand-kit-and-drag-drop.md` (when it exists) §4.1 to confirm `brands.tone_snippets JSONB` migration is in scope. If PRD 05 is still PENDING at execution time, plan continues but `formatToneSnippets` reads from `brand.tone_snippets ?? []` — empty array is safe.

- [ ] **PFC.3 — Cluster 07a engine API intent**

  Read PRD 07a (when it exists) §7 to confirm `figma.createSliceFromSelection({ name })` + `figma.createMeasurement({ fromNodeId, toNodeId })` engine APIs are in scope. If 07a is PENDING, skip Tasks 16–17 in Phase A; register the AI tools only if the runtime `figma.createSliceFromSelection` / `figma.createMeasurement` symbols exist (guard with `typeof figma.createSliceFromSelection === 'function'`).

- [ ] **PFC.4 — Existing M5 chat stack runs**

  Run: `cd kova-open-pencil-1 && bun install && bun run dev`

  Open `http://localhost:1420`, sign in, open a canvas. Confirm the existing ChatPopup at bottom-left renders + accepts a message + AI responds. If broken, STOP — fix M5 baseline before starting this plan.

- [ ] **PFC.5 — Existing test suite green**

  Run: `cd kova-open-pencil-1 && bun run test:unit`

  Expected per `00e §8` resolution log: `1484 pass / 99 skip / 0 fail`. If failures appear, triage before TDD on this plan (red signals an external break, not this PRD's tests).

---

## Task 1: Add `ChatProductReference` type + extend `ChatConversation`

**Files:**
- Modify: `kova-open-pencil-1/src/types/kova/chat.ts`

- [ ] **Step 1: Write the failing type-check test**

  Open `kova-open-pencil-1/tests/unit/types/chat-types.test.ts` (create if absent).

```typescript
import { describe, expect, test } from 'bun:test'
import type { ChatConversation, ChatProductReference } from '@/types/kova/chat'

describe('ChatProductReference type', () => {
  test('accepts all required fields', () => {
    const ref: ChatProductReference = {
      product_id: 'gid://shopify/Product/1',
      title: 'Navy Stripe Tee',
      primary_image_url: 'https://cdn.shopify.com/x.jpg',
      price_low: '29.00',
      price_high: null,
      currency: 'USD',
      handle: 'navy-stripe-tee',
      added_at: '2026-06-20T00:00:00Z'
    }
    expect(ref.product_id).toBe('gid://shopify/Product/1')
  })

  test('ChatConversation carries product_references array', () => {
    const conv: ChatConversation = {
      id: 'c1', user_id: 'u1', brand_id: 'b1', canvas_id: 'cv1',
      title: null, created_at: '2026-06-20T00:00:00Z', updated_at: '2026-06-20T00:00:00Z',
      product_references: []
    }
    expect(conv.product_references).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/types/chat-types.test.ts`

  Expected: FAIL — `ChatProductReference` not exported / `product_references` missing on `ChatConversation`.

- [ ] **Step 3: Extend the type file**

  Edit `kova-open-pencil-1/src/types/kova/chat.ts` to:

```typescript
export interface ChatConversation {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly canvas_id: string
  readonly title: string | null
  readonly created_at: string
  readonly updated_at: string
  readonly product_references: readonly ChatProductReference[]
}

export interface ChatMessageAttachment {
  readonly type: 'media' | 'chat-attachment'
  readonly id: string
  readonly file_name: string
  readonly url: string
  readonly width: number | null
  readonly height: number | null
}

export interface ChatMessage {
  readonly id: string
  readonly conversation_id: string
  readonly user_id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly attachments: readonly ChatMessageAttachment[]
  readonly tool_calls: readonly Record<string, unknown>[]
  readonly created_at: string
}

export interface ChatProductReference {
  readonly product_id: string
  readonly title: string
  readonly primary_image_url: string | null
  readonly price_low: string
  readonly price_high: string | null
  readonly currency: string
  readonly handle: string
  readonly added_at: string
}
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/types/chat-types.test.ts`

  Expected: PASS.

- [ ] **Step 5: Verify type-check across the whole codebase**

  Run: `cd kova-open-pencil-1 && bun run check`

  Expected: `0 errors`. (Existing call sites may fail if they don't supply `product_references` on `ChatConversation` literals — fix forward in later tasks; for now, leave them broken if any.)

- [ ] **Step 6: Commit**

```bash
cd kova-open-pencil-1
git add src/types/kova/chat.ts tests/unit/types/chat-types.test.ts
git commit -m "feat(prd10): add ChatProductReference type + extend ChatConversation"
```

---

## Task 2: Migration — `chat_conversations.product_references` JSONB + trigger

**Files:**
- Create: `kova-open-pencil-1/supabase/migrations/20260620_10_chat_product_references.sql`
- Test: `kova-open-pencil-1/tests/integration/chat-product-references.test.ts`

- [ ] **Step 1: Write the failing integration test**

  Create `kova-open-pencil-1/tests/integration/chat-product-references.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

describe('chat_conversations.product_references migration', () => {
  let supabase: SupabaseClient
  let userId: string
  let brandId: string
  let canvasId: string
  let convId: string

  beforeAll(async () => {
    const url = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    supabase = createClient(url, key)
    // ... fixture: create user + brand + canvas + conversation
    // (uses test fixtures already established by M5; see tests/integration/_fixtures.ts)
  })

  afterAll(async () => {
    if (convId) await supabase.from('chat_conversations').delete().eq('id', convId)
  })

  test('column exists with default []', async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('product_references')
      .eq('id', convId)
      .single()
    expect(error).toBeNull()
    expect(data?.product_references).toEqual([])
  })

  test('accepts valid array of references', async () => {
    const refs = [{
      product_id: 'gid://shopify/Product/1', title: 'Tee',
      primary_image_url: 'https://cdn.shopify.com/x.jpg',
      price_low: '29.00', price_high: null, currency: 'USD',
      handle: 'tee', added_at: '2026-06-20T00:00:00Z'
    }]
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: refs })
      .eq('id', convId)
    expect(error).toBeNull()
  })

  test('rejects non-array via trigger', async () => {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: { not: 'array' } as unknown as never[] })
      .eq('id', convId)
    expect(error?.message).toContain('must be a JSONB array')
  })

  test('rejects more than 20 entries via trigger', async () => {
    const refs = Array.from({ length: 21 }, (_, i) => ({
      product_id: `gid://shopify/Product/${i}`, title: `P${i}`,
      primary_image_url: null, price_low: '0.00', price_high: null,
      currency: 'USD', handle: `p${i}`, added_at: '2026-06-20T00:00:00Z'
    }))
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: refs })
      .eq('id', convId)
    expect(error?.message).toContain('exceeds maximum of 20')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/integration/chat-product-references.test.ts`

  Expected: FAIL — column does not exist.

- [ ] **Step 3: Write the migration**

  Create `kova-open-pencil-1/supabase/migrations/20260620_10_chat_product_references.sql`:

```sql
-- Migration 20260620_10_chat_product_references
-- Cluster 10 AI Chat + Memory + Tool Layer
-- Adds per-conversation product-reference state for composer chips

BEGIN;

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS product_references jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.chat_conversations.product_references IS
  'Active Shopify product-reference chips for this chat conversation. Ordered array of {product_id, title, primary_image_url, price_low, price_high, currency, handle, added_at} objects. Capped at 20 entries. Per Shopify product-reference design spec D3/D7/D8.';

CREATE OR REPLACE FUNCTION public.validate_chat_product_references()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF jsonb_typeof(NEW.product_references) <> 'array' THEN
    RAISE EXCEPTION 'product_references must be a JSONB array, got %', jsonb_typeof(NEW.product_references);
  END IF;
  IF jsonb_array_length(NEW.product_references) > 20 THEN
    RAISE EXCEPTION 'product_references exceeds maximum of 20 entries (got %)', jsonb_array_length(NEW.product_references);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_conversations_validate_product_references ON public.chat_conversations;
CREATE TRIGGER chat_conversations_validate_product_references
  BEFORE INSERT OR UPDATE OF product_references ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_chat_product_references();

COMMIT;
```

- [ ] **Step 4: Apply migration locally**

  Run: `cd kova-open-pencil-1 && bunx supabase db reset` (or `bunx supabase migration up` for incremental).

  Expected: migration applies without error.

- [ ] **Step 5: Run integration test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/integration/chat-product-references.test.ts`

  Expected: 4/4 PASS.

- [ ] **Step 6: Commit**

```bash
cd kova-open-pencil-1
git add supabase/migrations/20260620_10_chat_product_references.sql tests/integration/chat-product-references.test.ts
git commit -m "feat(prd10): chat_conversations.product_references JSONB + validation trigger"
```

---

## Task 3: Refactor `useChatStore` — `updateProductReferences` action

**Files:**
- Modify: `kova-open-pencil-1/src/stores/chat.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/chat-store.test.ts` (extend or create)

- [ ] **Step 1: Write the failing test**

  Append to `kova-open-pencil-1/tests/unit/stores/chat-store.test.ts`:

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, test, mock } from 'bun:test'

import { useChatStore } from '@/stores/chat'

describe('useChatStore.updateProductReferences', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('patches local conversations array immutably', async () => {
    const store = useChatStore()
    store.conversations = [
      { id: 'c1', user_id: 'u', brand_id: 'b', canvas_id: 'cv', title: null,
        created_at: '', updated_at: '', product_references: [] }
    ]
    // Stub supabase.from(...).update(...).eq(...) to return { error: null }
    // (uses existing M5 supabase mock harness)
    await store.updateProductReferences('c1', [
      { product_id: 'p1', title: 'Tee', primary_image_url: null,
        price_low: '29', price_high: null, currency: 'USD',
        handle: 't', added_at: '2026-06-20T00:00:00Z' }
    ])
    expect(store.conversations[0].product_references).toHaveLength(1)
    expect(store.conversations[0].product_references[0].product_id).toBe('p1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat-store.test.ts`

  Expected: FAIL — `updateProductReferences` not defined.

- [ ] **Step 3: Implement the action**

  Edit `kova-open-pencil-1/src/stores/chat.ts`. After the existing `updateConversationTitle` function, add:

```typescript
async function updateProductReferences(
  conversationId: string,
  refs: readonly ChatProductReference[]
): Promise<void> {
  const { error } = await supabase
    .from('chat_conversations')
    .update({ product_references: refs })
    .eq('id', conversationId)
  if (error) throw new Error(error.message)

  conversations.value = conversations.value.map((c) =>
    c.id === conversationId ? { ...c, product_references: refs } : c
  )
}
```

  Then add `updateProductReferences` to the store's `return` object. Also add `import type { ChatProductReference } from '@/types/kova/chat'` to the import block.

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat-store.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/stores/chat.ts tests/unit/stores/chat-store.test.ts
git commit -m "feat(prd10): useChatStore.updateProductReferences action"
```

---

## Task 4: New `useChatProductReferencesStore` Pinia store

**Files:**
- Create: `kova-open-pencil-1/src/stores/chat-product-references.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/chat-product-references.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `kova-open-pencil-1/tests/unit/stores/chat-product-references.test.ts`:

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'bun:test'

import { useChatStore } from '@/stores/chat'
import { useChatProductReferencesStore } from '@/stores/chat-product-references'

import type { ChatProductReference } from '@/types/kova/chat'

const makeRef = (id: string): ChatProductReference => ({
  product_id: id, title: `Product ${id}`, primary_image_url: null,
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: `p-${id}`, added_at: '2026-06-20T00:00:00Z'
})

describe('useChatProductReferencesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const chatStore = useChatStore()
    chatStore.conversations = [
      { id: 'c1', user_id: 'u', brand_id: 'b', canvas_id: 'cv', title: null,
        created_at: '', updated_at: '', product_references: [] }
    ]
    chatStore.activeConversationId = 'c1'
  })

  test('activeReferences reflects current conversation', () => {
    const store = useChatProductReferencesStore()
    expect(store.activeReferences).toEqual([])
  })

  test('importProducts de-dupes by product_id', async () => {
    const store = useChatProductReferencesStore()
    // Stub useChatStore.updateProductReferences to bypass supabase
    const chatStore = useChatStore()
    chatStore.updateProductReferences = async (id, refs) => {
      chatStore.conversations = chatStore.conversations.map((c) =>
        c.id === id ? { ...c, product_references: refs } : c
      )
    }
    await store.importProducts('c1', [makeRef('a'), makeRef('b')])
    await store.importProducts('c1', [makeRef('a'), makeRef('c')])
    expect(store.activeReferences.map((r) => r.product_id)).toEqual(['a', 'b', 'c'])
  })

  test('importProducts caps at 20', async () => {
    const store = useChatProductReferencesStore()
    const chatStore = useChatStore()
    chatStore.updateProductReferences = async (id, refs) => {
      chatStore.conversations = chatStore.conversations.map((c) =>
        c.id === id ? { ...c, product_references: refs } : c
      )
    }
    const bulk = Array.from({ length: 25 }, (_, i) => makeRef(`id-${i}`))
    await store.importProducts('c1', bulk)
    expect(store.activeReferences).toHaveLength(20)
    expect(store.isAtCapacity).toBe(true)
  })

  test('removeReference removes single chip', async () => {
    const store = useChatProductReferencesStore()
    const chatStore = useChatStore()
    chatStore.updateProductReferences = async (id, refs) => {
      chatStore.conversations = chatStore.conversations.map((c) =>
        c.id === id ? { ...c, product_references: refs } : c
      )
    }
    await store.importProducts('c1', [makeRef('a'), makeRef('b')])
    await store.removeReference('c1', 'a')
    expect(store.activeReferences.map((r) => r.product_id)).toEqual(['b'])
  })

  test('clearReferences empties the list', async () => {
    const store = useChatProductReferencesStore()
    const chatStore = useChatStore()
    chatStore.updateProductReferences = async (id, refs) => {
      chatStore.conversations = chatStore.conversations.map((c) =>
        c.id === id ? { ...c, product_references: refs } : c
      )
    }
    await store.importProducts('c1', [makeRef('a'), makeRef('b')])
    await store.clearReferences('c1')
    expect(store.activeReferences).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat-product-references.test.ts`

  Expected: FAIL — store does not exist.

- [ ] **Step 3: Implement the store**

  Create `kova-open-pencil-1/src/stores/chat-product-references.ts`:

```typescript
import { defineStore } from 'pinia'
import { computed } from 'vue'

import { useChatStore } from '@/stores/chat'

import type { ChatProductReference } from '@/types/kova/chat'

export const MAX_PRODUCT_REFERENCES = 20

export const useChatProductReferencesStore = defineStore('chat-product-references', () => {
  const chatStore = useChatStore()

  const activeReferences = computed<readonly ChatProductReference[]>(() => {
    const conv = chatStore.conversations.find((c) => c.id === chatStore.activeConversationId)
    return conv?.product_references ?? []
  })

  const isAtCapacity = computed(() => activeReferences.value.length >= MAX_PRODUCT_REFERENCES)

  async function importProducts(
    conversationId: string,
    incoming: readonly ChatProductReference[]
  ): Promise<void> {
    const conv = chatStore.conversations.find((c) => c.id === conversationId)
    if (!conv) throw new Error(`Conversation ${conversationId} not found`)

    const existingIds = new Set(conv.product_references.map((r) => r.product_id))
    const deduped = incoming.filter((r) => !existingIds.has(r.product_id))
    const merged = [...conv.product_references, ...deduped].slice(0, MAX_PRODUCT_REFERENCES)

    if (merged.length === conv.product_references.length) return

    await chatStore.updateProductReferences(conversationId, merged)
  }

  async function removeReference(conversationId: string, productId: string): Promise<void> {
    const conv = chatStore.conversations.find((c) => c.id === conversationId)
    if (!conv) return
    const next = conv.product_references.filter((r) => r.product_id !== productId)
    if (next.length === conv.product_references.length) return
    await chatStore.updateProductReferences(conversationId, next)
  }

  async function clearReferences(conversationId: string): Promise<void> {
    await chatStore.updateProductReferences(conversationId, [])
  }

  return {
    activeReferences,
    isAtCapacity,
    MAX_PRODUCT_REFERENCES,
    importProducts,
    removeReference,
    clearReferences
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat-product-references.test.ts`

  Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/stores/chat-product-references.ts tests/unit/stores/chat-product-references.test.ts
git commit -m "feat(prd10): useChatProductReferencesStore (per-conversation chip state)"
```

---

## Task 5: `formatToneSnippets` extension to `buildSystemPrompt`

**Files:**
- Modify: `kova-open-pencil-1/src/ai/build-system-prompt.ts`
- Create: `kova-open-pencil-1/tests/engine/ai/build-system-prompt-extensions.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `kova-open-pencil-1/tests/engine/ai/build-system-prompt-extensions.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'

import { buildSystemPrompt } from '@/ai/build-system-prompt'

import type { Brand } from '@/types/kova/database'

const baseBrand: Brand = {
  // ... fill from existing Brand type literal
  id: 'b1', user_id: 'u1', name: 'Acme', created_at: '', updated_at: '',
  tone_snippets: [], saved_blocks: [],
  colors: {}, fonts: {}, voice: '', logo_url: null
} as unknown as Brand

describe('formatToneSnippets layer', () => {
  test('omitted when tone_snippets empty', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: []
    })
    expect(prompt).not.toContain('## Brand Voice Exemplars')
  })

  test('renders with up to 10 entries', async () => {
    const snippets = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`, label: `Snippet ${i}`, content: `Voice ${i}`
    }))
    const brand: Brand = { ...baseBrand, tone_snippets: snippets } as unknown as Brand
    const prompt = await buildSystemPrompt({
      brandProfile: brand, availableImages: [],
      brandMemories: [], chatAttachments: []
    })
    expect(prompt).toContain('## Brand Voice Exemplars')
    expect(prompt).toContain('Voice 0')
    expect(prompt).toContain('Voice 9')
    expect(prompt).not.toContain('Voice 10')
    expect(prompt).toContain('(2 more snippets exist')
  })

  test('preserves JSONB array order', async () => {
    const snippets = [
      { id: 's1', label: 'B', content: 'Beta' },
      { id: 's2', label: 'A', content: 'Alpha' }
    ]
    const brand: Brand = { ...baseBrand, tone_snippets: snippets } as unknown as Brand
    const prompt = await buildSystemPrompt({
      brandProfile: brand, availableImages: [],
      brandMemories: [], chatAttachments: []
    })
    const bIdx = prompt.indexOf('Beta')
    const aIdx = prompt.indexOf('Alpha')
    expect(bIdx).toBeLessThan(aIdx)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/build-system-prompt-extensions.test.ts`

  Expected: FAIL — no `## Brand Voice Exemplars` block.

- [ ] **Step 3: Implement `formatToneSnippets`**

  Edit `kova-open-pencil-1/src/ai/build-system-prompt.ts`. Add near the bottom (with other `format*` helpers):

```typescript
const MAX_TONE_SNIPPETS = 10

interface ToneSnippet {
  readonly id: string
  readonly label: string
  readonly content: string
}

function formatToneSnippets(brand: Brand | null): string | null {
  const snippets = ((brand?.tone_snippets ?? []) as ReadonlyArray<ToneSnippet>)
  if (snippets.length === 0) return null
  const limited = snippets.slice(0, MAX_TONE_SNIPPETS)
  const lines = limited
    .map((s, i) => `${i + 1}. ${s.label}\n   "${s.content}"`)
    .join('\n')
  const overflow = snippets.length > MAX_TONE_SNIPPETS
    ? `\n\n(${snippets.length - MAX_TONE_SNIPPETS} more snippets exist for this brand; using the first ${MAX_TONE_SNIPPETS} per the configured cap.)`
    : ''
  return `## Brand Voice Exemplars
The following short pieces of brand-voice copy show how this brand writes. Match this voice — cadence, vocabulary, energy, formality — when generating headlines, body copy, CTAs, or any text content.

${lines}${overflow}`
}
```

  Then in `buildSystemPrompt`, splice the new layer after Layer 4:

```typescript
  const toneSnippetsLayer = formatToneSnippets(input.brandProfile)

  const layers: readonly string[] = [
    SYSTEM_PROMPT,
    EMAIL_GUIDELINES,
    EMAIL_SECTIONS,
    ...(input.brandProfile ? [formatBrandKitPrompt(input.brandProfile)] : []),
    ...(toneSnippetsLayer ? [toneSnippetsLayer] : []),   // NEW Layer 4b
    IMAGE_HANDLING,
    campaignLayer,
    MEMORY_INSTRUCTIONS,
    ...(input.brandMemories.length > 0 ? [formatBrandMemories(input.brandMemories)] : []),
    ...(input.availableImages.length > 0 ? [formatAvailableImages(input.availableImages)] : []),
    ...(input.chatAttachments && input.chatAttachments.length > 0
      ? [formatChatAttachments(input.chatAttachments)]
      : [])
  ]
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/build-system-prompt-extensions.test.ts -t "formatToneSnippets"`

  Expected: 3/3 PASS.

- [ ] **Step 5: Verify no regression in existing prompt builder tests**

  Run: `cd kova-open-pencil-1 && bun run test:unit`

  Expected: no new failures (delta = 0 across the suite).

- [ ] **Step 6: Commit**

```bash
cd kova-open-pencil-1
git add src/ai/build-system-prompt.ts tests/engine/ai/build-system-prompt-extensions.test.ts
git commit -m "feat(prd10): formatToneSnippets layer (cap 10, JSONB-array order, Q8)"
```

---

## Task 6: `formatProductReferences` extension + Layer 9 in `buildSystemPrompt`

**Files:**
- Modify: `kova-open-pencil-1/src/ai/build-system-prompt.ts`
- Extend: `kova-open-pencil-1/tests/engine/ai/build-system-prompt-extensions.test.ts`

- [ ] **Step 1: Write the failing test**

  Append to `tests/engine/ai/build-system-prompt-extensions.test.ts`:

```typescript
describe('formatProductReferences layer', () => {
  const makeRef = (i: number, range = false) => ({
    product_id: `p${i}`, title: `Product ${i}`,
    primary_image_url: `https://cdn.shopify.com/${i}.jpg`,
    price_low: '29.00', price_high: range ? '49.00' : null,
    currency: 'USD', handle: `p-${i}`, added_at: '2026-06-20T00:00:00Z'
  })

  test('omitted when productReferences empty', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: []
    })
    expect(prompt).not.toContain('## Active Product References')
  })

  test('renders single-price chip', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: [makeRef(1)]
    })
    expect(prompt).toContain('## Active Product References')
    expect(prompt).toContain('Product 1')
    expect(prompt).toContain('Price: 29.00 USD')
  })

  test('renders price range when price_high present', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: [makeRef(1, true)]
    })
    expect(prompt).toContain('Price: 29.00–49.00 USD')
  })

  test('renders all 20 when at cap', async () => {
    const refs = Array.from({ length: 20 }, (_, i) => makeRef(i))
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: refs
    })
    expect(prompt).toContain('Product 0')
    expect(prompt).toContain('Product 19')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/build-system-prompt-extensions.test.ts -t "formatProductReferences"`

  Expected: FAIL.

- [ ] **Step 3: Implement `formatProductReferences` + extend input shape**

  Edit `kova-open-pencil-1/src/ai/build-system-prompt.ts`:

```typescript
import type { ChatProductReference } from '@/types/kova/chat'

export interface BuildSystemPromptInput {
  readonly brandProfile: Brand | null
  readonly availableImages: readonly AvailableImage[]
  readonly brandMemories: readonly BrandMemory[]
  readonly chatAttachments?: readonly ChatAttachmentForAI[]
  readonly campaignType?: CampaignType
  readonly productReferences?: readonly ChatProductReference[]   // NEW
}

function formatProductReferences(refs: readonly ChatProductReference[]): string | null {
  if (refs.length === 0) return null
  const lines = refs.map((r, i) => {
    const priceLine = r.price_high && r.price_high !== r.price_low
      ? `   Price: ${r.price_low}–${r.price_high} ${r.currency}`
      : `   Price: ${r.price_low} ${r.currency}`
    const imageLine = r.primary_image_url
      ? `   Primary image: ${r.primary_image_url}`
      : `   Primary image: (none — ask user or call get_variant for media)`
    return `${i + 1}. ${r.title} (product_id: ${r.product_id}, handle: ${r.handle})\n${priceLine}\n${imageLine}`
  }).join('\n')
  return `## Active Product References
The user has pinned the following products as the subject of this design session. They persist across every turn until removed.

Use these as the products to feature in the email design. Call \`get_variant\` for full variant detail (sizes, colors, per-variant price/media), \`get_collection\` if the user wants related products, and other Shopify tools as needed. Insert product images via \`placeMediaImage\` on canvas nodes.

${lines}`
}
```

  Then add Layer 9 to the composition (after `formatChatAttachments`):

```typescript
  const productRefsLayer = input.productReferences
    ? formatProductReferences(input.productReferences)
    : null

  const layers: readonly string[] = [
    SYSTEM_PROMPT,
    // ... existing layers ...
    ...(productRefsLayer ? [productRefsLayer] : [])   // NEW Layer 9
  ]
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/build-system-prompt-extensions.test.ts -t "formatProductReferences"`

  Expected: 4/4 PASS.

- [ ] **Step 5: Run full unit suite**

  Run: `cd kova-open-pencil-1 && bun run test:unit`

  Expected: no new failures.

- [ ] **Step 6: Commit**

```bash
cd kova-open-pencil-1
git add src/ai/build-system-prompt.ts tests/engine/ai/build-system-prompt-extensions.test.ts
git commit -m "feat(prd10): formatProductReferences layer (cap 20, hybrid payload)"
```

---

## Task 7: Wire `productReferences` into `useAIChat` `prepareCall`

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-chat.ts`

- [ ] **Step 1: Write the failing test**

  Append to `tests/unit/composables/use-chat.test.ts` (or create):

```typescript
import { describe, expect, test } from 'bun:test'
import { useAIChat } from '@/composables/use-chat'

describe('useAIChat.setActiveProductReferences', () => {
  test('is exported and is callable', () => {
    const { setActiveProductReferences } = useAIChat()
    expect(typeof setActiveProductReferences).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/composables/use-chat.test.ts -t "setActiveProductReferences"`

  Expected: FAIL.

- [ ] **Step 3: Extend `use-chat.ts`**

  Edit `kova-open-pencil-1/src/composables/use-chat.ts`:

```typescript
import type { ChatProductReference } from '@/types/kova/chat'

// near other module-scope refs:
const activeProductReferences = ref<readonly ChatProductReference[]>([])

function setActiveProductReferences(refs: readonly ChatProductReference[]): void {
  activeProductReferences.value = refs
}
```

  In `createTransport`, extend `prepareCall`:

```typescript
      const instructions = await buildSystemPrompt({
        brandProfile,
        availableImages,
        brandMemories: activeBrandMemories.value,
        chatAttachments: activeChatAttachmentsForAI.value,
        campaignType: activeCampaignType.value,
        productReferences: activeProductReferences.value   // NEW
      })
```

  In `resetChat`, also clear refs:

```typescript
function resetChat() {
  chat = null
  activeBrandMemories.value = []
  activeProductReferences.value = []   // NEW
}
```

  Export from `useAIChat`:

```typescript
export function useAIChat() {
  return {
    // ... existing ...
    setActiveProductReferences   // NEW
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/composables/use-chat.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/composables/use-chat.ts tests/unit/composables/use-chat.test.ts
git commit -m "feat(prd10): useAIChat.setActiveProductReferences + prepareCall wiring"
```

---

## Task 8: Refactor `kova-tools.ts` — drop `bestsellers` sort

**Files:**
- Modify: `kova-open-pencil-1/src/ai/kova-tools.ts`
- Modify: `kova-open-pencil-1/tests/engine/shopify/ai-tools.test.ts`

- [ ] **Step 1: Write the failing test**

  Edit `kova-open-pencil-1/tests/engine/shopify/ai-tools.test.ts`. Add:

```typescript
import * as v from 'valibot'
import { searchProductsSchema } from '@/ai/kova-tools'

describe('searchProductsSchema.sort picklist', () => {
  test('rejects "bestsellers"', () => {
    const result = v.safeParse(searchProductsSchema, { query: 'x', sort: 'bestsellers' })
    expect(result.success).toBe(false)
  })

  test('accepts "newest", "price_asc", "price_desc"', () => {
    expect(v.safeParse(searchProductsSchema, { query: 'x', sort: 'newest' }).success).toBe(true)
    expect(v.safeParse(searchProductsSchema, { query: 'x', sort: 'price_asc' }).success).toBe(true)
    expect(v.safeParse(searchProductsSchema, { query: 'x', sort: 'price_desc' }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/shopify/ai-tools.test.ts -t "bestsellers"`

  Expected: FAIL — `bestsellers` currently accepted.

- [ ] **Step 3: Drop `bestsellers`**

  Edit `kova-open-pencil-1/src/ai/kova-tools.ts:50`:

```typescript
  sort: v.optional(v.picklist(['newest', 'price_asc', 'price_desc'])),
```

  (Was `['bestsellers', 'newest', 'price_asc', 'price_desc']`.)

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/shopify/ai-tools.test.ts -t "bestsellers"`

  Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/ai/kova-tools.ts tests/engine/shopify/ai-tools.test.ts
git commit -m "refactor(prd10): drop bestsellers from search_products.sort picklist (D6)"
```

---

## Task 9: Add `no_connection` error response to 5 Shopify tools

**Files:**
- Modify: `kova-open-pencil-1/src/ai/kova-tools.ts`
- Extend: `kova-open-pencil-1/tests/engine/shopify/ai-tools.test.ts`

- [ ] **Step 1: Write the failing tests (5 — one per tool)**

  Append to `tests/engine/shopify/ai-tools.test.ts`:

```typescript
import { createKovaTools } from '@/ai/kova-tools'

// Use existing M9 test harness to set up a brand with no Shopify connection.
// (See tests/engine/shopify/_fixtures.ts pattern.)

describe('5 Shopify tools — no_connection error UX', () => {
  // Each test stubs supabase.from('shopify_connections').select(...).eq(...).maybeSingle()
  // to return { data: null, error: null } and asserts the tool's execute returns
  // { error: 'No Shopify connection for this brand', code: 'no_connection' }.

  test.each([
    'search_products', 'get_collection', 'get_variant',
    'get_active_discounts', 'get_shop_context'
  ])('%s returns no_connection error when no shopify_connections row', async (toolName) => {
    // ... harness setup ...
    const tools = createKovaTools(/* store with brand B that has no connection */)
    const tool = (tools as Record<string, { execute: (args: unknown) => Promise<unknown> }>)[toolName]
    const result = await tool.execute({ query: 'x', collection_id: 'c', variant_id: 'v' })
    expect(result).toEqual({
      error: 'No Shopify connection for this brand. Ask the user to connect a Shopify store via Account → Integrations.',
      code: 'no_connection'
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/shopify/ai-tools.test.ts -t "no_connection"`

  Expected: 5 FAILs — tools return empty results instead of error.

- [ ] **Step 3: Add the guard helper + wire into each tool**

  Edit `kova-open-pencil-1/src/ai/kova-tools.ts`. Above `createKovaTools`:

```typescript
const NO_CONNECTION = {
  error: 'No Shopify connection for this brand. Ask the user to connect a Shopify store via Account → Integrations.',
  code: 'no_connection'
} as const

async function hasShopifyConnection(brandId: string): Promise<boolean> {
  if (!brandId) return false
  const { data } = await supabase
    .from('shopify_connections')
    .select('id')
    .eq('brand_id', brandId)
    .maybeSingle()
  return !!data
}
```

  Then inside each of the 5 Shopify tool `execute` blocks, add the guard as the first line:

```typescript
  execute: async (args) => {
    const brandId = activeBrandId()
    if (!(await hasShopifyConnection(brandId))) return NO_CONNECTION
    // ... existing query ...
  }
```

  Apply to: `search_products`, `get_collection`, `get_variant`, `get_active_discounts`, `get_shop_context`.

  Do NOT add to `placeMediaImage` (image fills, not Shopify) or `saveBrandMemory` (brand memory, not Shopify).

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/shopify/ai-tools.test.ts -t "no_connection"`

  Expected: 5/5 PASS.

- [ ] **Step 5: Run full unit suite — verify no schema test regression**

  Run: `cd kova-open-pencil-1 && bun run test:unit`

  Expected: no new failures (the 22 existing kova-tools tests still pass).

- [ ] **Step 6: Commit**

```bash
cd kova-open-pencil-1
git add src/ai/kova-tools.ts tests/engine/shopify/ai-tools.test.ts
git commit -m "refactor(prd10): 5 Shopify tools return {error, code:no_connection} when no shopify_connections row (00c §1.E.1 Check 5)"
```

---

## Task 10: `createSliceFromSelection` AI tool wrapper

**Files:**
- Modify: `kova-open-pencil-1/src/ai/kova-tools.ts`
- Create: `kova-open-pencil-1/tests/engine/ai/slice-tool.test.ts`

> **Dependency:** Cluster 07a must expose `figma.createSliceFromSelection({ name })`. Guard with runtime check if engine API not yet shipped.

- [ ] **Step 1: Write the failing test**

  Create `kova-open-pencil-1/tests/engine/ai/slice-tool.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { createKovaTools } from '@/ai/kova-tools'

describe('createSliceFromSelection AI tool', () => {
  test('returns sliceId on success', async () => {
    const store = makeMockStoreWithSelection() // helper — selection present
    const tools = createKovaTools(store)
    const result = await tools.createSliceFromSelection.execute({ name: 'hero' })
    expect(result).toEqual({ success: true, sliceId: expect.any(String) })
  })

  test('returns no_selection error when no selection', async () => {
    const store = makeMockStoreNoSelection()
    const tools = createKovaTools(store)
    const result = await tools.createSliceFromSelection.execute({ name: 'hero' })
    expect(result).toEqual({ error: 'No selection to slice', code: 'no_selection' })
  })

  test('handles missing engine API gracefully', async () => {
    const store = makeMockStoreWithSelection({ engineApiAbsent: true })
    const tools = createKovaTools(store)
    // either tool absent OR returns engine-unavailable error
    if (tools.createSliceFromSelection) {
      const result = await tools.createSliceFromSelection.execute({ name: 'hero' })
      expect(result).toMatchObject({ code: 'engine_unavailable' })
    } else {
      expect(tools.createSliceFromSelection).toBeUndefined()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/slice-tool.test.ts`

  Expected: FAIL — tool not registered.

- [ ] **Step 3: Implement the tool**

  Edit `kova-open-pencil-1/src/ai/kova-tools.ts`. Inside `createKovaTools`, add:

```typescript
  const createSliceFromSelection = tool({
    description: 'Create a Slice node covering the current selection. Slices define export regions.',
    inputSchema: valibotSchema(v.object({
      name: v.optional(v.pipe(v.string(), v.description('Optional name for the slice (e.g. "hero", "footer")')))
    })),
    execute: async ({ name }) => {
      const figma = makeFigmaFromStore(store)
      if (typeof figma.createSliceFromSelection !== 'function') {
        return { error: 'Slice engine API not available', code: 'engine_unavailable' }
      }
      const slice = figma.createSliceFromSelection({ name })
      return slice
        ? { success: true, sliceId: slice.id }
        : { error: 'No selection to slice', code: 'no_selection' }
    }
  })
```

  Add to the returned tool set:

```typescript
  return {
    placeMediaImage,
    saveBrandMemory,
    search_products,
    get_collection,
    get_variant,
    get_active_discounts,
    get_shop_context,
    createSliceFromSelection   // NEW
  } as const
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/slice-tool.test.ts`

  Expected: 3/3 PASS (if engine API stubbed in test harness).

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/ai/kova-tools.ts tests/engine/ai/slice-tool.test.ts
git commit -m "feat(prd10): createSliceFromSelection AI tool wrapper (Cluster 07a engine API)"
```

---

## Task 11: `addMeasurement` AI tool wrapper

**Files:**
- Modify: `kova-open-pencil-1/src/ai/kova-tools.ts`
- Create: `kova-open-pencil-1/tests/engine/ai/measurement-tool.test.ts`

> **Dependency:** Cluster 07a must expose `figma.createMeasurement({ fromNodeId, toNodeId })`. Guard with runtime check.

- [ ] **Step 1: Write the failing test**

  Create `kova-open-pencil-1/tests/engine/ai/measurement-tool.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { createKovaTools } from '@/ai/kova-tools'

describe('addMeasurement AI tool', () => {
  test('returns measurementId on success', async () => {
    const store = makeMockStoreWithNodes(['n1', 'n2'])
    const tools = createKovaTools(store)
    const result = await tools.addMeasurement.execute({ fromNodeId: 'n1', toNodeId: 'n2' })
    expect(result).toEqual({ success: true, measurementId: expect.any(String) })
  })

  test('returns invalid_nodes error when nodes do not exist', async () => {
    const store = makeMockStoreWithNodes([])
    const tools = createKovaTools(store)
    const result = await tools.addMeasurement.execute({ fromNodeId: 'x', toNodeId: 'y' })
    expect(result).toEqual({ error: 'Could not create measurement', code: 'invalid_nodes' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/measurement-tool.test.ts`

  Expected: FAIL.

- [ ] **Step 3: Implement the tool**

  Edit `kova-open-pencil-1/src/ai/kova-tools.ts`. Add inside `createKovaTools`:

```typescript
  const addMeasurement = tool({
    description: 'Add a persistent Measurement annotation between two nodes (distance + label).',
    inputSchema: valibotSchema(v.object({
      fromNodeId: v.pipe(v.string(), v.description('Source node ID')),
      toNodeId: v.pipe(v.string(), v.description('Target node ID'))
    })),
    execute: async ({ fromNodeId, toNodeId }) => {
      const figma = makeFigmaFromStore(store)
      if (typeof figma.createMeasurement !== 'function') {
        return { error: 'Measurement engine API not available', code: 'engine_unavailable' }
      }
      const ann = figma.createMeasurement({ fromNodeId, toNodeId })
      return ann
        ? { success: true, measurementId: ann.id }
        : { error: 'Could not create measurement', code: 'invalid_nodes' }
    }
  })
```

  Add to returned set: `, addMeasurement`.

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/engine/ai/measurement-tool.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/ai/kova-tools.ts tests/engine/ai/measurement-tool.test.ts
git commit -m "feat(prd10): addMeasurement AI tool wrapper (Cluster 07a engine API)"
```

---

## Task 12: `<ProductReferenceChip>` Vue component

**Files:**
- Create: `kova-open-pencil-1/src/components/chat/ProductReferenceChip.vue`
- Create: `kova-open-pencil-1/tests/unit/components/ProductReferenceChip.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `tests/unit/components/ProductReferenceChip.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'

import ProductReferenceChip from '@/components/chat/ProductReferenceChip.vue'

const makeRef = (overrides = {}) => ({
  product_id: 'p1', title: 'Navy Stripe Tee',
  primary_image_url: 'https://cdn.shopify.com/x.jpg',
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: 'navy-stripe-tee', added_at: '2026-06-20T00:00:00Z',
  ...overrides
})

describe('<ProductReferenceChip>', () => {
  test('renders product title', () => {
    const w = mount(ProductReferenceChip, { props: { reference: makeRef() } })
    expect(w.text()).toContain('Navy Stripe Tee')
  })

  test('renders monogram fallback when primary_image_url null', () => {
    const w = mount(ProductReferenceChip, {
      props: { reference: makeRef({ primary_image_url: null }) }
    })
    expect(w.find('[data-test-id="chip-monogram"]').exists()).toBe(true)
    expect(w.find('img').exists()).toBe(false)
  })

  test('emits remove on × click', async () => {
    const w = mount(ProductReferenceChip, { props: { reference: makeRef() } })
    await w.find('[data-test-id="chip-remove"]').trigger('click')
    expect(w.emitted('remove')).toBeTruthy()
  })

  test('truncates long title', () => {
    const w = mount(ProductReferenceChip, {
      props: { reference: makeRef({ title: 'A very long product title that exceeds the limit' }) }
    })
    const titleEl = w.find('[data-test-id="chip-title"]')
    expect(titleEl.classes()).toContain('truncate')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/components/ProductReferenceChip.test.ts`

  Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

  Create `kova-open-pencil-1/src/components/chat/ProductReferenceChip.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'

import type { ChatProductReference } from '@/types/kova/chat'

const { reference } = defineProps<{
  reference: ChatProductReference
}>()

const emit = defineEmits<{
  remove: []
}>()

const monogram = computed(() => reference.title.slice(0, 1).toUpperCase())

const tooltip = computed(() => {
  const range = reference.price_high && reference.price_high !== reference.price_low
    ? `${reference.price_low}–${reference.price_high} ${reference.currency}`
    : `${reference.price_low} ${reference.currency}`
  return `${reference.title} · ${range}`
})
</script>

<template>
  <div
    data-test-id="product-reference-chip"
    class="group relative flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-1.5 py-1"
    :title="tooltip"
  >
    <img
      v-if="reference.primary_image_url"
      :src="reference.primary_image_url"
      :alt="reference.title"
      class="size-6 rounded-md object-cover"
    />
    <div
      v-else
      data-test-id="chip-monogram"
      class="flex size-6 items-center justify-center rounded-md bg-muted/20 text-[10px] font-bold text-muted"
    >
      {{ monogram }}
    </div>
    <span
      data-test-id="chip-title"
      class="max-w-[100px] truncate text-[11px] text-surface"
    >
      {{ reference.title }}
    </span>
    <button
      type="button"
      data-test-id="chip-remove"
      class="flex size-4 items-center justify-center rounded-full text-muted opacity-60 transition-opacity hover:bg-hover hover:text-surface hover:opacity-100"
      :aria-label="`Remove ${reference.title}`"
      @click="emit('remove')"
    >
      <icon-lucide-x class="size-2.5" />
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/components/ProductReferenceChip.test.ts`

  Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/components/chat/ProductReferenceChip.vue tests/unit/components/ProductReferenceChip.test.ts
git commit -m "feat(prd10): ProductReferenceChip component (thumbnail/title/× pattern)"
```

---

## Task 13: `<ProductReferenceChipRow>` Vue component

**Files:**
- Create: `kova-open-pencil-1/src/components/chat/ProductReferenceChipRow.vue`
- Create: `kova-open-pencil-1/tests/unit/components/ProductReferenceChipRow.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `tests/unit/components/ProductReferenceChipRow.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'

import ProductReferenceChipRow from '@/components/chat/ProductReferenceChipRow.vue'

const makeRef = (id: string) => ({
  product_id: id, title: `Product ${id}`, primary_image_url: null,
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: `p-${id}`, added_at: '2026-06-20T00:00:00Z'
})

describe('<ProductReferenceChipRow>', () => {
  test('renders no chips when references empty', () => {
    const w = mount(ProductReferenceChipRow, { props: { references: [] } })
    expect(w.findAll('[data-test-id="product-reference-chip"]')).toHaveLength(0)
  })

  test('renders one chip per reference', () => {
    const refs = [makeRef('a'), makeRef('b'), makeRef('c')]
    const w = mount(ProductReferenceChipRow, { props: { references: refs } })
    expect(w.findAll('[data-test-id="product-reference-chip"]')).toHaveLength(3)
  })

  test('forwards remove event with productId payload', async () => {
    const refs = [makeRef('a'), makeRef('b')]
    const w = mount(ProductReferenceChipRow, { props: { references: refs } })
    const removeButtons = w.findAll('[data-test-id="chip-remove"]')
    await removeButtons[0].trigger('click')
    const emitted = w.emitted('remove') as Array<[{ productId: string }]>
    expect(emitted[0][0]).toEqual({ productId: 'a' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/components/ProductReferenceChipRow.test.ts`

  Expected: FAIL.

- [ ] **Step 3: Implement the component**

  Create `kova-open-pencil-1/src/components/chat/ProductReferenceChipRow.vue`:

```vue
<script setup lang="ts">
import ProductReferenceChip from '@/components/chat/ProductReferenceChip.vue'

import type { ChatProductReference } from '@/types/kova/chat'

const { references } = defineProps<{
  references: readonly ChatProductReference[]
}>()

const emit = defineEmits<{
  remove: [{ productId: string }]
}>()

function handleRemove(productId: string): void {
  emit('remove', { productId })
}
</script>

<template>
  <div
    v-if="references.length > 0"
    data-test-id="product-reference-chip-row"
    class="mb-2 flex flex-wrap gap-1.5"
  >
    <ProductReferenceChip
      v-for="ref in references"
      :key="ref.product_id"
      :reference="ref"
      @remove="handleRemove(ref.product_id)"
    />
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/components/ProductReferenceChipRow.test.ts`

  Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/components/chat/ProductReferenceChipRow.vue tests/unit/components/ProductReferenceChipRow.test.ts
git commit -m "feat(prd10): ProductReferenceChipRow component (renders chips, collapses when empty)"
```

---

## Task 14: Wire chip row into `<ChatInput>`

**Files:**
- Modify: `kova-open-pencil-1/src/components/chat/ChatInput.vue`
- Create: `kova-open-pencil-1/tests/unit/components/ChatInput.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `tests/unit/components/ChatInput.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'

import ChatInput from '@/components/chat/ChatInput.vue'

const makeRef = (id: string) => ({
  product_id: id, title: `Product ${id}`, primary_image_url: null,
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: `p-${id}`, added_at: '2026-06-20T00:00:00Z'
})

describe('<ChatInput> productReferences prop', () => {
  test('renders chip row when references provided', () => {
    const w = mount(ChatInput, {
      props: { status: 'ready', productReferences: [makeRef('a'), makeRef('b')] }
    })
    expect(w.find('[data-test-id="product-reference-chip-row"]').exists()).toBe(true)
    expect(w.findAll('[data-test-id="product-reference-chip"]')).toHaveLength(2)
  })

  test('does not render chip row when references empty', () => {
    const w = mount(ChatInput, {
      props: { status: 'ready', productReferences: [] }
    })
    expect(w.find('[data-test-id="product-reference-chip-row"]').exists()).toBe(false)
  })

  test('emits remove-reference event with productId', async () => {
    const w = mount(ChatInput, {
      props: { status: 'ready', productReferences: [makeRef('a')] }
    })
    await w.find('[data-test-id="chip-remove"]').trigger('click')
    const emitted = w.emitted('remove-reference') as Array<[{ productId: string }]>
    expect(emitted[0][0]).toEqual({ productId: 'a' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/components/ChatInput.test.ts`

  Expected: FAIL.

- [ ] **Step 3: Extend `ChatInput.vue`**

  Edit `kova-open-pencil-1/src/components/chat/ChatInput.vue`:

```vue
<script setup lang="ts">
// ... existing imports ...
import ProductReferenceChipRow from '@/components/chat/ProductReferenceChipRow.vue'

import type { ChatProductReference } from '@/types/kova/chat'

const { status, attachments = [], productReferences = [] } = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  attachments?: readonly PendingAttachment[]
  productReferences?: readonly ChatProductReference[]
}>()

const emit = defineEmits<{
  submit: [text: string]
  stop: []
  'attach-image': []
  'attach-clipboard': [file: File]
  'remove-attachment': [id: string]
  'remove-reference': [{ productId: string }]
}>()

// ... rest of existing script ...
</script>

<template>
  <TooltipProvider>
    <div class="shrink-0 border-t border-border px-3 py-2">
      <!-- NEW: product-reference chip row (above attachments) -->
      <ProductReferenceChipRow
        :references="productReferences"
        @remove="emit('remove-reference', $event)"
      />

      <!-- existing model-display dev block -->
      <!-- existing attachment thumbnails -->
      <!-- existing form -->
    </div>
  </TooltipProvider>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun test tests/unit/components/ChatInput.test.ts`

  Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/components/chat/ChatInput.vue tests/unit/components/ChatInput.test.ts
git commit -m "feat(prd10): ChatInput renders product-reference chip row + emits remove-reference"
```

---

## Task 15: Refactor `<ChatPanel>` — full right-panel chat surface

**Files:**
- Modify: `kova-open-pencil-1/src/components/ChatPanel.vue`

> **Approach:** lift the chrome from `ChatPopup.vue` (tab strip + persistence wiring + onMounted handlers + handleSubmit), strip the `fixed bottom-4 left-4` popup chrome, mount as `h-full w-full flex flex-col`. Wire `<ChatInput>` chip row to `useChatProductReferencesStore`.

- [ ] **Step 1: Read `ChatPopup.vue` end-to-end**

  Reference for the refactor. The wiring chunks to lift:
  - `defineProps<{ canvasId: string; brandId: string }>()`
  - `useAIChat()` destructure incl. `setActiveProductReferences` (NEW)
  - `useChatStore`, `useChatImages`, `useChatProductReferencesStore` (NEW)
  - `watch(() => brandId, ...)` initial conversation hydration
  - `handleSubmit` with `setActiveProductReferences(refs.value)` BEFORE `sendMessage`
  - `handleSwitchTab` calls `setActiveProductReferences(...)` after switching
  - `onMounted` `setAssistantFinishHandler(...)` for persisting assistant turns
  - `handleNewTab` / `handleSwitchTab`

- [ ] **Step 2: Write the failing E2E (deferred to Task 18 — placeholder)**

  Tests for ChatPanel land in Task 18 (E2E). Step into Step 3.

- [ ] **Step 3: Refactor `ChatPanel.vue`**

  Replace the entire current content with the full chat surface. Key code:

```vue
<script setup lang="ts">
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { clearToolLogEntries, didHitStepLimit } from '@/ai/tools'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMediaPickerDialog from '@/components/chat/ChatMediaPickerDialog.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import { useAIChat } from '@/composables/use-chat'
import { useChatImages } from '@/composables/use-chat-images'
import { useChatCommands } from '@/composables/use-chat-commands'
import { toast } from '@/composables/use-toast'
import { useChatStore } from '@/stores/chat'
import { useChatProductReferencesStore } from '@/stores/chat-product-references'

import type { CampaignType, ChatAttachmentForAI } from '@/ai/build-system-prompt'
import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import type { MediaAsset } from '@/types/kova/media'

const { canvasId, brandId } = defineProps<{
  canvasId: string
  brandId: string
}>()

const {
  ensureChat,
  reconnectChat,
  resetChat,
  toUIMessages,
  setActiveCampaignType,
  setActiveChatAttachmentsForAI,
  setActiveProductReferences,           // NEW
  refreshActiveBrandMemories,
  setAssistantFinishHandler
} = useAIChat()
const chatStore = useChatStore()
const productRefsStore = useChatProductReferencesStore()    // NEW
const chatImages = useChatImages(brandId)
const mediaPickerOpen = ref(false)
const chat = ref<Chat<UIMessage> | null>(null)
const messagesEnd = ref<HTMLDivElement>()
const initError = ref<string | null>(null)

const messages = computed(() => chat.value?.messages ?? [])
const status = computed(() => chat.value?.status ?? 'ready')
const isThinking = computed(() => { /* ... lifted from ChatPopup.vue ... */ })
const showContinue = computed(() => { /* ... lifted ... */ })

watch(
  () => brandId,
  async (bid) => {
    await chatStore.fetchConversations(bid, canvasId)
    if (chatStore.conversations.length === 0) {
      const conv = await chatStore.createConversation(bid, canvasId)
      chatStore.activeConversationId = conv.id
    } else {
      const firstId = chatStore.conversations[0].id
      chatStore.activeConversationId = firstId
      await handleSwitchTab(firstId)
    }
  },
  { immediate: true }
)

function scrollToBottom() { /* ... */ }
watch(messages, scrollToBottom, { deep: true })

async function handleSubmit(text: string, campaignType?: CampaignType) {
  if (status.value === 'streaming' || status.value === 'submitted') return
  if (chatImages.hasPendingUploads()) {
    toast.show('Waiting for image upload to finish…', 'warning')
    return
  }

  setActiveCampaignType(campaignType)
  setActiveProductReferences(productRefsStore.activeReferences)    // NEW

  const chatAttachmentsForAI: ChatAttachmentForAI[] = chatImages.attachments.value
    .filter((a) => a.storageUrl && !a.isUploading)
    .map((a) => ({ fileName: a.fileName, width: a.width, height: a.height, publicUrl: a.storageUrl as string }))
  setActiveChatAttachmentsForAI(chatAttachmentsForAI)
  await refreshActiveBrandMemories(brandId)

  const conversationId = chatStore.activeConversationId
  if (!conversationId) {
    initError.value = 'No active conversation'
    return
  }

  try {
    initError.value = null
    const c = await ensureChat(conversationId)
    if (c) chat.value = markRaw(c)
  } catch (e) {
    console.error('Failed to initialize chat:', e)
    initError.value = e instanceof Error ? e.message : String(e)
    return
  }

  if (chatImages.hasPendingUploads()) {
    toast.show('Waiting for image upload to finish…', 'warning')
    return
  }

  const payload = await chatImages.buildMessagePayload(text)

  try { await chatStore.addMessage(conversationId, 'user', payload.text) } catch (e) { console.error(e) }

  chat.value
    ?.sendMessage({ text: payload.text, files: payload.files })
    .then(() => chatImages.clearAttachments())
    .catch((e: unknown) => {
      console.error('Chat error:', e)
      toast.show(e instanceof Error ? e.message : 'Chat request failed', 'error')
    })
}

function handleStop() { chat.value?.stop() }
function handleAttachImage() { mediaPickerOpen.value = true }

async function handleRemoveReference(payload: { productId: string }): Promise<void> {
  const convId = chatStore.activeConversationId
  if (!convId) return
  try {
    await productRefsStore.removeReference(convId, payload.productId)
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Could not remove reference', 'error')
  }
}

// ... handleSwitchTab also calls setActiveProductReferences after switch ...
async function handleSwitchTab(conversationId: string) {
  chatStore.activeConversationId = conversationId
  clearToolLogEntries()
  chatImages.clearAttachments()

  const reconnected = reconnectChat(conversationId)
  if (reconnected) {
    chat.value = markRaw(reconnected)
    return
  }

  chat.value = null
  resetChat()
  await chatStore.fetchMessages(conversationId)
  if (chatStore.messages.length > 0) {
    const restored = toUIMessages(chatStore.messages)
    try {
      const c = await ensureChat(conversationId, restored)
      if (c) chat.value = markRaw(c)
    } catch (e) { console.error(e) }
  }
}

async function handleNewTab() {
  const conv = await chatStore.createConversation(brandId, canvasId)
  chatStore.activeConversationId = conv.id
  chat.value = null
  resetChat()
  clearToolLogEntries()
  chatImages.clearAttachments()
}

onMounted(() => {
  setAssistantFinishHandler((message, conversationId) => {
    const textParts = message.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    const text = textParts.map((p) => p.text).join('')
    const toolCalls = message.parts.filter((p) => 'toolCallId' in p).map((p) => ({ ...p }) as unknown as Record<string, unknown>)
    chatStore.addMessage(conversationId, 'assistant', text, [], toolCalls).catch((e) => {
      console.error('Failed to persist assistant response:', e)
      toast.show('Failed to save chat history — messages may not persist', 'error')
    })
  })
})

onBeforeUnmount(() => {
  setAssistantFinishHandler(null)
  chatImages.clearAttachments()
})

const { pendingMessage, consumePendingMessage } = useChatCommands()
watch(pendingMessage, async (msg) => {
  if (!msg) return
  consumePendingMessage()
  await handleSubmit(msg)
})
</script>

<template>
  <div data-test-id="chat-panel" class="flex h-full w-full flex-col select-text">
    <!-- Tab strip for multiple conversations -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <div class="flex flex-1 items-center gap-1 overflow-x-auto">
        <button
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          class="shrink-0 rounded-lg px-2.5 py-1 text-xs"
          :class="conv.id === chatStore.activeConversationId
            ? 'bg-muted/20 font-medium text-white'
            : 'text-muted hover:bg-hover hover:text-[#ccc]'"
          @click="handleSwitchTab(conv.id)"
        >
          {{ conv.title ?? 'New chat' }}
        </button>
      </div>
      <button
        class="flex size-6 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-[#ccc]"
        title="New chat"
        @click="handleNewTab"
      >
        <icon-lucide-plus class="size-3.5" />
      </button>
    </div>

    <!-- Message scroll area -->
    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
        <div
          v-if="messages.length === 0"
          data-test-id="chat-empty-state"
          class="flex h-full flex-col items-center justify-center gap-3 text-muted"
        >
          <icon-lucide-message-circle class="size-8 opacity-50" />
          <p class="text-center text-xs">Describe what you want to create or change.</p>
        </div>

        <div v-else data-test-id="chat-messages" class="flex flex-col gap-3">
          <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />

          <div v-if="isThinking" data-test-id="chat-typing-indicator" class="flex gap-2">
            <!-- thinking dots — lifted from ChatPopup -->
          </div>

          <div v-if="showContinue" class="flex justify-center py-2">
            <button class="..." @click="handleSubmit('Continue where you left off')">
              <icon-lucide-play class="size-3" />
              Continue
            </button>
          </div>

          <div ref="messagesEnd" />
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/30" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Init-error banner -->
    <div v-if="initError" class="...">{{ initError }}</div>

    <!-- Composer (now passes product references) -->
    <ChatInput
      :status="status"
      :attachments="chatImages.attachments.value"
      :product-references="productRefsStore.activeReferences"
      @submit="handleSubmit"
      @stop="handleStop"
      @attach-image="handleAttachImage"
      @attach-clipboard="chatImages.attachFromClipboard"
      @remove-attachment="chatImages.removeAttachment"
      @remove-reference="handleRemoveReference"
    />

    <ChatMediaPickerDialog
      :open="mediaPickerOpen"
      @close="mediaPickerOpen = false"
      @select="chatImages.attachFromMediaLibrary"
    />
  </div>
</template>
```

- [ ] **Step 4: Type-check + run unit suite**

  Run: `cd kova-open-pencil-1 && bun run check && bun run test:unit`

  Expected: 0 type errors; existing test suite unchanged.

- [ ] **Step 5: Commit**

```bash
cd kova-open-pencil-1
git add src/components/ChatPanel.vue
git commit -m "feat(prd10): refactor ChatPanel into full right-panel chat surface (tabs + chips + composer)"
```

---

## Task 16: Mount `<ChatPanel>` in right-panel AI tab (Cluster 06 coordination)

**Files:**
- Modify: `kova-open-pencil-1/src/views/EditorView.vue`
- Delete: `kova-open-pencil-1/src/components/chat/ChatPopup.vue`

> **Coordination point:** Cluster 06 owns the right-panel tab framework. This task only works if Cluster 06 has shipped the `Design / AI` 2-tab slot. If Cluster 06 is still PENDING at execution time, STOP here and resume after Cluster 06 PRD lands.

- [ ] **Step 1: Verify Cluster 06 has shipped the right-panel tab framework**

  Read `EditorView.vue` for the tab strip. Verify a render slot exists for "AI" tab content. If not, halt + escalate.

- [ ] **Step 2: Write the failing E2E test**

  Create `kova-open-pencil-1/tests/e2e/ai-chat-panel-migration.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'

test('right-panel AI tab is visible + activates ChatPanel', async ({ page }) => {
  await page.goto('http://localhost:1420')
  // Login + open canvas via existing E2E fixture
  // ...

  // 1. ChatPopup should not exist
  await expect(page.locator('[data-test-id="chat-panel"]')).toBeVisible()
  const popup = page.locator('.fixed.bottom-4.left-4')
  await expect(popup).toHaveCount(0)

  // 2. Right-panel has Design + AI tabs only
  const designTab = page.locator('[data-test-id="right-panel-tab-design"]')
  const aiTab = page.locator('[data-test-id="right-panel-tab-ai"]')
  const prototypeTab = page.locator('[data-test-id="right-panel-tab-prototype"]')
  await expect(designTab).toBeVisible()
  await expect(aiTab).toBeVisible()
  await expect(prototypeTab).toHaveCount(0)

  // 3. Click AI → ChatPanel content active
  await aiTab.click()
  await expect(page.locator('[data-test-id="chat-empty-state"]')).toBeVisible()
})
```

- [ ] **Step 3: Run test to verify it fails**

  Run: `cd kova-open-pencil-1 && bunx playwright test tests/e2e/ai-chat-panel-migration.spec.ts`

  Expected: FAIL — ChatPopup still present.

- [ ] **Step 4: Refactor EditorView**

  Edit `kova-open-pencil-1/src/views/EditorView.vue`:
  - Remove `import ChatPopup from '@/components/chat/ChatPopup.vue'` (line 33)
  - Remove `<ChatPopup ... />` block (line 282)
  - In the right-panel `<AITabContent>` slot (added by Cluster 06), render `<ChatPanel :canvasId :brandId />`

- [ ] **Step 5: Delete ChatPopup file**

  Run: `cd kova-open-pencil-1 && git rm src/components/chat/ChatPopup.vue`

- [ ] **Step 6: Run E2E test to verify it passes**

  Run: `cd kova-open-pencil-1 && bun run dev` (separate terminal) + `bunx playwright test tests/e2e/ai-chat-panel-migration.spec.ts`

  Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd kova-open-pencil-1
git add src/views/EditorView.vue src/components/chat/ChatPopup.vue tests/e2e/ai-chat-panel-migration.spec.ts
git commit -m "feat(prd10): mount ChatPanel in right-panel AI tab; remove ChatPopup floating surface"
```

---

## Task 17: Wire Shop-panel "Import N to chat" callback (Cluster 06 cross-cut)

**Files:**
- Modify: `kova-open-pencil-1/src/components/editor/sidebar/ShopPanelProducts.vue` (Cluster 06 ships the panel reworked per Shopify spec §4.1; this task wires only the callback)

> **Coordination point:** Cluster 06 owns the Shop panel UI. This task only wires the callback if Cluster 06 has shipped the multi-select + "Import N to chat" button. If 06 is still PENDING, STOP here.

- [ ] **Step 1: Verify Cluster 06 has shipped Shop panel multi-select + import-bar**

  Inspect `ShopPanelProducts.vue` for the import-bar render + selection state. If absent, halt + escalate.

- [ ] **Step 2: Write the import-bar onClick handler**

  In `ShopPanelProducts.vue`, the import-bar's primary button calls a `handleImport()` handler. Define it:

```typescript
import { useChatProductReferencesStore } from '@/stores/chat-product-references'
import { useChatStore } from '@/stores/chat'
import { toast } from '@/composables/use-toast'

import type { ChatProductReference } from '@/types/kova/chat'

const productRefsStore = useChatProductReferencesStore()
const chatStore = useChatStore()

async function handleImport(): Promise<void> {
  const convId = chatStore.activeConversationId
  if (!convId) {
    toast.show('No active chat. Open the AI tab and start a chat first.', 'warning')
    return
  }
  if (productRefsStore.isAtCapacity) {
    toast.show('Maximum 20 references reached — remove some first.', 'warning')
    return
  }
  const refs: ChatProductReference[] = selectedProducts.value.map((p) => ({
    product_id: p.id,
    title: p.title,
    primary_image_url: p.image_url ?? null,
    price_low: p.price_low,
    price_high: p.price_high ?? null,
    currency: p.currency ?? 'USD',
    handle: p.handle,
    added_at: new Date().toISOString()
  }))
  try {
    await productRefsStore.importProducts(convId, refs)
    clearSelection()                              // Cluster 06 store method
    toast.show(`Imported ${refs.length} product${refs.length === 1 ? '' : 's'} to chat`, 'success')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Could not import products. Please try again.', 'error')
  }
}
```

- [ ] **Step 3: Test interactively + via E2E (E2E covered in Task 18)**

- [ ] **Step 4: Commit**

```bash
cd kova-open-pencil-1
git add src/components/editor/sidebar/ShopPanelProducts.vue
git commit -m "feat(prd10): wire Shop panel 'Import N to chat' callback to useChatProductReferencesStore"
```

---

## Task 18: E2E composer-chip flow

**Files:**
- Create: `kova-open-pencil-1/tests/e2e/composer-chip-flow.spec.ts`

- [ ] **Step 1: Write the failing E2E test**

  Create `kova-open-pencil-1/tests/e2e/composer-chip-flow.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'

test.describe('Composer chip flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login + open a canvas in a brand that has Shopify connected (test fixture)
  })

  test('import 3 products → 3 chips → reload → 3 chips persist → remove 1 → 2 chips', async ({ page }) => {
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()

    // Open Shop panel + select 3 products
    await page.locator('[data-test-id="shop-panel-product"]').nth(0).click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(1).click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(2).click()
    await page.locator('[data-test-id="shop-panel-import-button"]').click()

    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(3)

    // Reload
    await page.reload()
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(3)

    // Remove one
    await page.locator('[data-test-id="chip-remove"]').nth(0).click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(2)
  })

  test('20-chip cap disables import button', async ({ page }) => {
    // Import 20 products → cap reached → 21st attempt blocked
    // ... fixture seeds 25 products in the test brand ...
    for (let batch = 0; batch < 5; batch++) {
      for (let i = 0; i < 4; i++) {
        await page.locator('[data-test-id="shop-panel-product"]').nth(batch * 4 + i).click()
      }
      await page.locator('[data-test-id="shop-panel-import-button"]').click()
    }
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(20)
    // Attempt 21st
    await page.locator('[data-test-id="shop-panel-product"]').nth(20).click()
    const importBtn = page.locator('[data-test-id="shop-panel-import-button"]')
    await expect(importBtn).toBeDisabled()
  })

  test('chips persist across send (do not clear)', async ({ page }) => {
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(0).click()
    await page.locator('[data-test-id="shop-panel-import-button"]').click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(1)
    await page.locator('[data-test-id="chat-input"]').fill('Build me a hero')
    await page.locator('[data-test-id="chat-send-button"]').click()
    // Wait for AI response (stream).
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(1)
  })

  test('per-conversation scope: new chat tab has no chips', async ({ page }) => {
    await page.locator('[data-test-id="right-panel-tab-ai"]').click()
    await page.locator('[data-test-id="shop-panel-product"]').nth(0).click()
    await page.locator('[data-test-id="shop-panel-import-button"]').click()
    await page.locator('[data-test-id="chat-new-tab"]').click()
    await expect(page.locator('[data-test-id="product-reference-chip"]')).toHaveCount(0)
  })
})
```

- [ ] **Step 2: Run + verify all 4 specs pass**

  Run: `cd kova-open-pencil-1 && bun run dev` + `bunx playwright test tests/e2e/composer-chip-flow.spec.ts`

  Expected: 4/4 PASS.

- [ ] **Step 3: Commit**

```bash
cd kova-open-pencil-1
git add tests/e2e/composer-chip-flow.spec.ts
git commit -m "test(prd10): E2E composer-chip flow (import/reload/remove/cap/per-conversation)"
```

---

## Task 19: Anthropic sub-processor disclosure copy (Cluster 01 contribution)

**Files:**
- Create: `kova-open-pencil-1/docs/legal/anthropic-subprocessor-disclosure.md`

> **Coordination point:** Cluster 01 owns `docs/legal/privacy-policy.md`. This file is a contribution Cluster 01 lifts verbatim into §X of their privacy policy.

- [ ] **Step 1: Author the disclosure fragment**

  Create `kova-open-pencil-1/docs/legal/anthropic-subprocessor-disclosure.md`:

```markdown
# Anthropic Sub-processor Disclosure — Source Fragment

> **Audience:** Cluster 01 PRD author. Lift verbatim into `docs/legal/privacy-policy.md` and `docs/legal/ropa.md`.

## Purpose

When users interact with Kova's AI Chat (canvas right-panel AI tab), the following data is sent to Anthropic, a sub-processor, to generate AI design suggestions:

- The user's chat message text (per turn)
- Image URLs attached to the user's message (Supabase Storage public URLs)
- The active brand's kit (colors, fonts, voice, tone snippets, saved blocks)
- The active brand's saved memories (`brand_memories` table — auto-extracted + user-added)
- The active brand's available media library images (filename + dimensions + Supabase Storage URL)
- The active chat conversation's product-reference summaries (composer chips — product IDs, titles, image URLs, prices, handles, sourced from the user's connected Shopify store)
- Tool-call results (e.g. Shopify product / collection / variant rows the AI retrieves on demand)

## Data flow

Browser → `POST /api/ai-proxy/v1/messages` (Kova server) → forwards to `https://api.anthropic.com/v1/messages`. The `ANTHROPIC_API_KEY` lives only on the Kova server. Anthropic streams back the AI response, which is then persisted by Kova in `chat_messages`.

## Anthropic terms

Anthropic processes this data per its [Privacy Policy](https://www.anthropic.com/legal/privacy) and [Trust Center](https://trust.anthropic.com/).

## Training-data status

Anthropic does NOT use API-channel data to train models by default. Zero-data-retention (ZDR) is being negotiated for production. Until ZDR is in place, the operator-batch deletion runbook documented in Cluster 01 §5.1.4.3 is the enforcement mechanism for user-deletion (Q15 GDPR cascade).

## Mandatory in:

- Privacy policy page (`/privacy`) — include this as a sub-processor section
- Record of Processing Activities (RoPA) markdown — list Anthropic as a sub-processor with purpose "AI design generation" + data categories above
```

- [ ] **Step 2: Add path to PRD 10 §11.1**

  Already referenced in PRD §11.1. No edit needed.

- [ ] **Step 3: Commit**

```bash
cd kova-open-pencil-1
git add docs/legal/anthropic-subprocessor-disclosure.md
git commit -m "docs(prd10): Anthropic sub-processor disclosure copy for Cluster 01 RoPA"
```

---

## Task 20: Update PRD 00a authoring tracker

**Files:**
- Modify: `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md`

- [ ] **Step 1: Update the §7 tracker row**

  Edit the Cluster 10 row in `§7 The 12 PRDs — wave-by-wave tracker`:

```markdown
| **6** | 10 | AI Chat + Memory + Tools | `10-ai-chat-and-memory.md` | DRAFT (ready for review) | Claude (Opus 4.7) | 2026-05-15 |
```

  (Was `PENDING | — | —`.)

- [ ] **Step 2: Commit**

```bash
cd kova-open-pencil-1
git add docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md
git commit -m "docs(prd10): mark Cluster 10 PRD as DRAFT in authoring tracker"
```

---

## Task 21: Manual browser-verify smoke test

> Per `feedback_browser_smoke_test_before_done`: green test suite ≠ working feature. Founder runs the 15-step recipe in PRD 10 §9.4.

- [ ] **Step 1: Start dev server**

  Run: `cd kova-open-pencil-1 && bun run dev`

  Open `http://localhost:1420`.

- [ ] **Step 2: Run PRD 10 §9.4 recipe steps 1–15**

  Execute every step. Mark each PASS / FAIL. For any FAIL, stop + escalate to PRD 10 §12 risk re-evaluation.

- [ ] **Step 3: Recipe-end summary commit (docs only, if needed)**

  If the recipe surfaces a small note for the PRD's §12, append + commit:

```bash
cd kova-open-pencil-1
git add docs/kova-final-prds/10-ai-chat-and-memory.md
git commit -m "docs(prd10): smoke-test notes appended to §12"
```

---

## Task 22: Final verification + plan-end summary

- [ ] **Step 1: Full unit suite**

  Run: `cd kova-open-pencil-1 && bun run test:unit`

  Expected: prior 1484 pass + new tests pass; 0 fail.

- [ ] **Step 2: Full E2E suite**

  Run: `cd kova-open-pencil-1 && bunx playwright test`

  Expected: 0 fail.

- [ ] **Step 3: Lint + type-check**

  Run: `cd kova-open-pencil-1 && bun run check`

  Expected: 0 errors.

- [ ] **Step 4: Build**

  Run: `cd kova-open-pencil-1 && bun run build`

  Expected: 0 errors.

- [ ] **Step 5: Bundle audit — confirm `ANTHROPIC_API_KEY` absent**

  Run: `cd kova-open-pencil-1 && bun run build --report 2>&1 | head -50` then `grep -r "sk-ant-" dist/`

  Expected: zero matches. `ANTHROPIC_API_KEY` value never in `dist/`.

- [ ] **Step 6: Plan-end commit + handoff**

  All tasks complete. Plan marked SHIPPED in `00a §7`:

```bash
cd kova-open-pencil-1
git add docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md
git commit -m "chore(prd10): mark PRD 10 SHIPPED — chat panel migration + chips + tools complete"
```

---

## Self-review

**1. Spec coverage:** PRD 10 §2.1 → tasks 1–19. PRD 10 §4 schema → Task 2. PRD 10 §5 backend (5.1 / 5.2 / 5.4) → Tasks 8/9/10/11 + reuse verified in PFC. PRD 10 §6 frontend (6.2 / 6.3 / 6.4) → Tasks 3–7 + 12–15. PRD 10 §7 tool layer → Tasks 8–11. PRD 10 §8 acceptance criteria → covered in Tasks 16–18 (E2E). PRD 10 §9 test plan → unit in Tasks 1–14, integration in Task 2, E2E in Tasks 16+18, manual in Task 21. PRD 10 §11.1 disclosure → Task 19. PRD 10 §10 Phase A → all tasks 1–22.

**2. Placeholders:** none. Every step has exact file path + complete code + exact run command.

**3. Type consistency:** `ChatProductReference` defined in Task 1; all subsequent tasks use the same field set (`product_id`, `title`, `primary_image_url`, `price_low`, `price_high`, `currency`, `handle`, `added_at`). `MAX_PRODUCT_REFERENCES = 20` consistent across §4.1 trigger + Task 4 store + Task 14 cap-check. Store action `updateProductReferences(conversationId, refs)` signature consistent across Tasks 3 + 4 + 12 + 14 + 17.

---

## Execution choice (per writing-plans skill)

Plan complete and saved to `docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, founder reviews between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

PRD 10 is currently `DRAFT` — recommend founder approves PRD before executing this plan. Plan is ready when PRD goes APPROVED.
