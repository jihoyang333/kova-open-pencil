# M5: AI Email Generation Engine — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform OpenPencil's generic AI design assistant into Kova's email-specific generation engine with server-side API proxy, floating chat popup, dynamic system prompt assembly, brand memory, and image transport.

**Architecture:** Server-side Anthropic proxy (Vercel serverless) keeps API key secret. Floating chat popup replaces the sidebar panel. `buildSystemPrompt()` assembles 8 layers of context (design principles, brand kit, section definitions, campaign guides, brand memories, media library). Dual-representation image transport separates vision copies (for Claude to see) from storage URLs (for canvas placement). Brand memory persists across chat sessions via Supabase.

**Tech Stack:** Vue 3 Composition API, TypeScript, Tailwind CSS 4, Pinia, Supabase (Postgres + Storage + RLS), Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/vue`), Valibot, Reka UI, Bun test runner.

**Spec:** `docs/superpowers/specs/2026-03-28-m5-ai-email-generation-engine-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `api/_shared/auth.ts` | Shared Vercel serverless auth utility — `authenticateRequest()` validates Supabase JWT |
| `api/ai-proxy/v1/messages.ts` | Anthropic API proxy — auth, rate limit, streaming, 4MB body validation |
| `src/utils/image-processing.ts` | Image resize pipeline (4096px cap) + `createVisionCopy()` (1500px JPEG) |
| `src/stores/chat-attachments.ts` | Pinia store for ephemeral chat-pasted images (private bucket) |
| `src/stores/chat.ts` | Pinia store for chat persistence (conversations + messages) |
| `src/stores/brand-memories.ts` | Pinia store for brand memory CRUD |
| `src/types/kova/chat.ts` | `ChatConversation` and `ChatMessage` interfaces |
| `src/types/kova/chat-attachment.ts` | `ChatAttachment` interface |
| `src/ai/kova-tools.ts` | Kova-specific AI tools: `placeMediaImage`, `saveBrandMemory` |
| `src/ai/build-system-prompt.ts` | `buildSystemPrompt()` — 8-layer assembly function |
| `src/composables/use-chat-images.ts` | Image attachment composable + multi-turn stripping middleware |
| `src/components/chat/ChatPopup.vue` | Floating chat popup with minimized/expanded states + tab bar |
| `src/components/chat/PromptChips.vue` | 5 campaign-type prompt chips for empty state |
| `src/data/email-guidelines.md` | Email design principles + brand kit bridge layer (Layer 2) |
| `src/data/email-sections.md` | 6 section type definitions + composition walkthrough (Layer 3) |
| `src/data/image-handling.md` | 3 image scenarios: placeholder, attached, media library (Layer 5) |
| `src/data/memory-instructions.md` | Brand memory AI instructions: when/how to save (Layer 7 setup) |
| `supabase/migrations/20260401_m5_media_enhancements.sql` | Add width/height to media table |
| `supabase/migrations/20260401_m5_chat_attachments.sql` | chat_attachments table + private bucket |
| `supabase/migrations/20260401_m5_chat_persistence.sql` | chat_conversations + chat_messages tables |
| `supabase/migrations/20260401_m5_brand_memories.sql` | brand_memories table |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/kova/media.ts` | Add optional `width` and `height` fields to `MediaAsset` |
| `src/stores/media.ts` | Integrate image processing pipeline into `uploadImage()` |
| `src/ai/tools.ts` | Register Kova tools from `kova-tools.ts` alongside `CORE_TOOLS` |
| `src/composables/use-chat.ts` | Route through proxy, integrate `buildSystemPrompt()`, add `wrapLanguageModel()` middleware, context window management |
| `src/views/EditorView.vue` | Add `ChatPopup` component overlay |
| `src/components/chat/ChatInput.vue` | Add image attachment button (left of input). **Also remove dead imports** (`providerID`, `providerDef`, `modelID`, `customModelID`) after Task 2 refactors `use-chat.ts` to remove those exports. |

### Test Files

| File | Tests |
|------|-------|
| `tests/unit/utils/image-processing.test.ts` | Resize logic, vision copy, format preservation, size limits |
| `tests/unit/stores/chat-attachments.test.ts` | Upload, signed URL, delete, validation |
| `tests/unit/stores/chat.test.ts` | Conversations CRUD, messages CRUD, tab switching |
| `tests/unit/stores/brand-memories.test.ts` | Fetch, save, delete, update memories |
| `tests/unit/ai/kova-tools.test.ts` | placeMediaImage URL validation, saveBrandMemory persistence |
| `tests/unit/ai/build-system-prompt.test.ts` | Layer assembly, optional layers, error degradation |
| `tests/unit/composables/use-chat-images.test.ts` | Multi-turn stripping, dual-representation |

---

## Chunk 1: M4 Prerequisites

Three prerequisite tasks that enhance existing M4 infrastructure. M5 depends on these.

### Task P1: Image Processing Pipeline (spec 4.2.1)

**Files:**
- Create: `src/utils/image-processing.ts`
- Modify: `src/stores/media.ts`
- Test: `tests/unit/utils/image-processing.test.ts`

**Context:** All images (media uploads and chat pastes) pass through client-side processing. Uses Canvas API (`OffscreenCanvas` or `<canvas>`) for resizing. Two functions: `processImage()` for uploads and `createVisionCopy()` for Claude's vision input.

- [ ] **Step 1: Write failing tests for `processImage()`**

```typescript
// tests/unit/utils/image-processing.test.ts
import { describe, test, expect } from 'bun:test'

describe('processImage', () => {
  test('rejects files over 10MB', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await expect(processImage(bigFile)).rejects.toThrow('File too large')
  })

  test('preserves JPEG format', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await processImage(file)
    expect(result.mimeType).toBe('image/jpeg')
  })

  test('preserves PNG format', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'logo.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(result.mimeType).toBe('image/png')
  })

  test('extracts width and height metadata', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'img.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(typeof result.width).toBe('number')
    expect(typeof result.height).toBe('number')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/utils/image-processing.test.ts`
Expected: FAIL — module `@/utils/image-processing` not found

- [ ] **Step 3: Implement `processImage()` and `createVisionCopy()`**

```typescript
// src/utils/image-processing.ts

export interface ProcessedImage {
  readonly blob: Blob
  readonly mimeType: string
  readonly width: number
  readonly height: number
  readonly fileSize: number
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_DIMENSION = 4096
const VISION_MAX_DIMENSION = 1500
const VISION_JPEG_QUALITY = 0.85
const VISION_MAX_SIZE = 1 * 1024 * 1024 // 1MB

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function scaleDown(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) return { width, height }
  const ratio = Math.min(maxDim / width, maxDim / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: mimeType, quality })
  }
  // Fallback for HTMLCanvasElement
  return new Promise((resolve, reject) => {
    ;(canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      mimeType,
      quality
    )
  })
}

function resizeToCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
    return canvas
  }
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  return canvas
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  const img = await loadImage(file)
  const { width, height } = scaleDown(img.naturalWidth, img.naturalHeight, MAX_DIMENSION)
  const needsResize = width !== img.naturalWidth || height !== img.naturalHeight

  if (!needsResize) {
    return {
      blob: file,
      mimeType: file.type,
      width: img.naturalWidth,
      height: img.naturalHeight,
      fileSize: file.size,
    }
  }

  const canvas = resizeToCanvas(img, width, height)
  const blob = await canvasToBlob(canvas, file.type)

  return {
    blob,
    mimeType: file.type,
    width,
    height,
    fileSize: blob.size,
  }
}

export async function createVisionCopy(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file)
  const { width, height } = scaleDown(
    img.naturalWidth,
    img.naturalHeight,
    VISION_MAX_DIMENSION
  )

  const canvas = resizeToCanvas(img, width, height)
  const blob = await canvasToBlob(canvas, 'image/jpeg', VISION_JPEG_QUALITY)

  if (blob.size > VISION_MAX_SIZE) {
    // Re-encode at lower quality if still too large
    const lowerBlob = await canvasToBlob(canvas, 'image/jpeg', 0.6)
    return {
      blob: lowerBlob,
      mimeType: 'image/jpeg',
      width,
      height,
      fileSize: lowerBlob.size,
    }
  }

  return {
    blob,
    mimeType: 'image/jpeg',
    width,
    height,
    fileSize: blob.size,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/utils/image-processing.test.ts`
Expected: PASS (note: Canvas API may need DOM setup — tests may need `tests/setup-dom.ts` preload)

- [ ] **Step 5: Write failing tests for `createVisionCopy()`**

Add to `tests/unit/utils/image-processing.test.ts`:

```typescript
describe('createVisionCopy', () => {
  test('outputs JPEG regardless of input format', async () => {
    const { createVisionCopy } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'logo.png', { type: 'image/png' })
    const result = await createVisionCopy(file)
    expect(result.mimeType).toBe('image/jpeg')
  })
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/utils/image-processing.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/image-processing.ts tests/unit/utils/image-processing.test.ts
git commit -m "feat(m5): add image processing pipeline with vision copy"
```

---

### Task P2: Media Table Width/Height Columns (spec 4.2.2)

**Files:**
- Create: `supabase/migrations/20260401_m5_media_enhancements.sql`
- Modify: `src/types/kova/media.ts`

**Context:** The media table needs `width` and `height` columns so image dimensions are available for the system prompt (Task 5.4.1) and image attachment metadata. Existing `MediaAsset` interface must be updated.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260401_m5_media_enhancements.sql
-- M5 prerequisite: Add image dimensions to media table

ALTER TABLE public.media ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS height INTEGER;
```

- [ ] **Step 2: Update `MediaAsset` interface**

In `src/types/kova/media.ts`, add:

```typescript
export interface MediaAsset {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly file_name: string
  readonly file_type: string
  readonly file_size: number
  readonly width: number | null     // ← new
  readonly height: number | null    // ← new
  readonly storage_path: string
  readonly created_at: string
}
```

- [ ] **Step 3: Update media store `uploadImage()` to persist dimensions**

In `src/stores/media.ts`, modify the `uploadImage()` function to call `processImage()` and include `width` and `height` in the insert:

```typescript
import { processImage } from '@/utils/image-processing'

// Inside uploadImage():
const processed = await processImage(file)

const { data, error } = await supabase
  .from('media')
  .insert({
    user_id: userId,
    brand_id: brandId,
    file_name: file.name,
    file_type: processed.mimeType,
    file_size: processed.fileSize,
    width: processed.width,       // ← new
    height: processed.height,     // ← new
    storage_path: storagePath,
  })
  .select()
  .single()
```

Upload the `processed.blob` instead of the raw `file`.

- [ ] **Step 4: Update existing media tests for width/height**

In `tests/unit/stores/media.test.ts`, update `sampleMedia` fixture to include `width` and `height`, and verify they're persisted on upload.

- [ ] **Step 5: Run tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/media.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260401_m5_media_enhancements.sql src/types/kova/media.ts src/stores/media.ts tests/unit/stores/media.test.ts
git commit -m "feat(m5): add width/height to media table and integrate image processing"
```

---

### Task P3: Chat Attachments Storage Infrastructure (spec 4.2.5)

**Files:**
- Create: `supabase/migrations/20260401_m5_chat_attachments.sql`
- Create: `src/types/kova/chat-attachment.ts`
- Create: `src/stores/chat-attachments.ts`
- Test: `tests/unit/stores/chat-attachments.test.ts`

**Context:** Chat-pasted images (not from media library) go into a private `chat-attachments` bucket with signed URLs (24h expiry). Separate from the public `media-assets` bucket. Separate `chat_attachments` table — these don't appear in the media library.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260401_m5_chat_attachments.sql
-- M5 prerequisite: Chat attachments table + private storage bucket

-- 1. Chat attachments table
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  conversation_id UUID,  -- set when used in a conversation (FK added after chat_conversations table exists)
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       INTEGER NOT NULL,
  width           INTEGER,
  height          INTEGER,
  storage_path    TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_attachments_select ON public.chat_attachments FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY chat_attachments_insert ON public.chat_attachments FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_attachments_delete ON public.chat_attachments FOR DELETE
  USING (user_id = auth.uid());

-- 3. Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_chat_attachments_created ON public.chat_attachments(created_at);

-- 4. Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies (user-scoped)
CREATE POLICY chat_attachments_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY chat_attachments_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY chat_attachments_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Create `ChatAttachment` type**

```typescript
// src/types/kova/chat-attachment.ts
export interface ChatAttachment {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly conversation_id: string | null
  readonly file_name: string
  readonly file_type: string
  readonly file_size: number
  readonly width: number | null
  readonly height: number | null
  readonly storage_path: string
  readonly created_at: string
}
```

- [ ] **Step 3: Write failing tests for chat attachments store**

```typescript
// tests/unit/stores/chat-attachments.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  remove: mock(() => Promise.resolve({ error: null })),
  createSignedUrl: mock(() =>
    Promise.resolve({ data: { signedUrl: 'https://example.com/signed' }, error: null })
  ),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
      getSession: mock(() =>
        Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
      ),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useChatAttachmentsStore } = await import('@/stores/chat-attachments')
const { useAuthStore } = await import('@/stores/auth')

describe('chat-attachments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as any
  })

  test('getSignedUrl returns a signed URL with 24h expiry', async () => {
    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: mock(() =>
        Promise.resolve({ data: { signedUrl: 'https://example.com/signed' }, error: null })
      ),
    })

    const store = useChatAttachmentsStore()
    const url = await store.getSignedUrl('user-1/b1/img.jpg')
    expect(url).toBe('https://example.com/signed')
  })

  test('uploadChatImage uploads to chat-attachments bucket and inserts record', async () => {
    const sampleAttachment = {
      id: 'a1',
      user_id: 'user-1',
      brand_id: 'b1',
      conversation_id: null,
      file_name: 'paste.jpg',
      file_type: 'image/jpeg',
      file_size: 5000,
      width: 800,
      height: 600,
      storage_path: 'user-1/b1/1234-paste.jpg',
      created_at: '2026-04-01T00:00:00Z',
    }

    mockStorageFrom.mockReturnValueOnce({
      upload: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleAttachment, error: null }),
        }),
      }),
    })

    const store = useChatAttachmentsStore()
    const file = new File([new Uint8Array(100)], 'paste.jpg', { type: 'image/jpeg' })
    const result = await store.uploadChatImage('b1', file, 800, 600)
    expect(result.id).toBe('a1')
  })

  test('deleteChatAttachment removes file and record', async () => {
    mockStorageFrom.mockReturnValueOnce({
      remove: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    const store = useChatAttachmentsStore()
    await store.deleteChatAttachment('a1', 'user-1/b1/paste.jpg')
    // Should not throw
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat-attachments.test.ts`
Expected: FAIL — module `@/stores/chat-attachments` not found

- [ ] **Step 5: Implement chat attachments store**

```typescript
// src/stores/chat-attachments.ts
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { ChatAttachment } from '@/types/kova/chat-attachment'

const BUCKET = 'chat-attachments'
const SIGNED_URL_EXPIRY = 60 * 60 * 24 // 24 hours in seconds

export const useChatAttachmentsStore = defineStore('chat-attachments', () => {
  const authStore = useAuthStore()

  async function uploadChatImage(
    brandId: string,
    file: File,
    width: number | null,
    height: number | null
  ): Promise<ChatAttachment> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const timestamp = Date.now()
    const storagePath = `${userId}/${brandId}/${timestamp}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file)

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data, error } = await supabase
      .from('chat_attachments')
      .insert({
        user_id: userId,
        brand_id: brandId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        width,
        height,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (error || !data) throw new Error(`Insert failed: ${error?.message}`)

    return data as ChatAttachment
  }

  async function getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    if (error || !data?.signedUrl) throw new Error(`Signed URL failed: ${error?.message}`)

    return data.signedUrl
  }

  async function deleteChatAttachment(id: string, storagePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath])

    if (storageError) {
      console.warn(`[chat-attachments] Storage delete warning: ${storageError.message}`)
    }

    const { error } = await supabase
      .from('chat_attachments')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Delete failed: ${error.message}`)
  }

  return { uploadChatImage, getSignedUrl, deleteChatAttachment }
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat-attachments.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260401_m5_chat_attachments.sql src/types/kova/chat-attachment.ts src/stores/chat-attachments.ts tests/unit/stores/chat-attachments.test.ts
git commit -m "feat(m5): add chat attachments storage infrastructure"
```

---

## Chunk 2: Phase 5.1 — API Proxy

### Task 1: Build Anthropic API Proxy (spec 5.1.1)

**Files:**
- Create: `api/ai-proxy/v1/messages.ts`
- Test: `tests/unit/api/ai-proxy.test.ts`

**Context:** Vercel serverless function that keeps `ANTHROPIC_API_KEY` server-side. Validates Supabase auth, enforces 200 calls/day rate limit, validates 4MB body size, streams SSE from Anthropic. `@ai-sdk/anthropic` automatically appends `/v1/messages` to `baseURL`, so setting `baseURL: '/api/ai-proxy'` hits `POST /api/ai-proxy/v1/messages`.

- [ ] **Step 1: Write failing tests for the proxy handler**

```typescript
// tests/unit/api/ai-proxy.test.ts
import { describe, test, expect, mock, beforeEach } from 'bun:test'

// Mock authenticateRequest
const mockAuth = mock(() => Promise.resolve({ userId: 'user-1' }))
mock.module('@/../../api/_shared/auth', () => ({
  authenticateRequest: mockAuth,
}))

// Mock supabase
const mockFrom = mock(() => ({}))
mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

describe('ai-proxy handler', () => {
  beforeEach(() => {
    mockAuth.mockClear()
    mockFrom.mockClear()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  test('rejects non-POST requests with 405', async () => {
    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })

  test('returns 401 when auth fails', async () => {
    mockAuth.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    )
    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-sonnet-4-6', messages: [] }),
    })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 413 when body exceeds 4MB', async () => {
    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const bigBody = 'x'.repeat(4.1 * 1024 * 1024)
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', {
      method: 'POST',
      body: bigBody,
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await handler(req)
    expect(res.status).toBe(413)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/api/ai-proxy.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the API proxy**

```typescript
// api/ai-proxy/v1/messages.ts
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '../../_shared/auth'

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const MAX_BODY_SIZE = 4 * 1024 * 1024 // 4MB (0.5MB headroom for Vercel's 4.5MB)
const DAILY_GENERATION_LIMIT = 200
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCDate(midnight.getUTCDate() + 1)
  midnight.setUTCHours(0, 0, 0, 0)
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: JSON_HEADERS }
    )
  }

  // 1. Authenticate
  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  // 2. Body size validation
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Message too large. Try attaching fewer images.' }),
      { status: 413, headers: JSON_HEADERS }
    )
  }

  // Read body as text for size check + forwarding
  const bodyText = await req.text()
  if (bodyText.length > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Message too large. Try attaching fewer images.' }),
      { status: 413, headers: JSON_HEADERS }
    )
  }

  // 3. Rate limiting
  const supabaseUrl = process.env.VITE_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('generations_used, generations_reset_at')
    .eq('id', userId)
    .single()

  if (userError || !userData) {
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: JSON_HEADERS }
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const resetDate = userData.generations_reset_at
    ? new Date(userData.generations_reset_at).toISOString().slice(0, 10)
    : null

  let generationsUsed = userData.generations_used ?? 0

  // Reset counter if reset date is in the past
  if (resetDate && resetDate < today) {
    generationsUsed = 0
    await supabase
      .from('users')
      .update({ generations_used: 0, generations_reset_at: new Date().toISOString() })
      .eq('id', userId)
  }

  if (generationsUsed >= DAILY_GENERATION_LIMIT) {
    return new Response(
      JSON.stringify({
        error: 'Daily limit reached. Your limit resets at midnight UTC.',
        retry_after: secondsUntilMidnightUTC(),
      }),
      { status: 429, headers: JSON_HEADERS }
    )
  }

  // 4. Forward to Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.error('[ai-proxy] Missing ANTHROPIC_API_KEY')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  try {
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: bodyText,
    })

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text()
      console.error('[ai-proxy] Anthropic error:', anthropicResponse.status, errorBody)
      return new Response(
        JSON.stringify({ error: 'AI service error. Please try again.' }),
        { status: 502, headers: JSON_HEADERS }
      )
    }

    // 5. Increment usage counter (non-blocking)
    void supabase
      .from('users')
      .update({
        generations_used: generationsUsed + 1,
        generations_reset_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // 6. Stream SSE response back
    return new Response(anthropicResponse.body, {
      status: 200,
      headers: {
        'Content-Type': anthropicResponse.headers.get('content-type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[ai-proxy] Fetch error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to connect to AI service.' }),
      { status: 502, headers: JSON_HEADERS }
    )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/api/ai-proxy.test.ts`
Expected: PASS

- [ ] **Step 5: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No lint or type errors

- [ ] **Step 6: Commit**

```bash
git add api/ai-proxy/v1/messages.ts tests/unit/api/ai-proxy.test.ts
git commit -m "feat(m5): add Anthropic API proxy with auth, rate limiting, streaming"
```

---

### Task 2: Route AI Requests Through Proxy (spec 5.1.2)

**Files:**
- Modify: `src/composables/use-chat.ts`

**Context:** Replace direct Anthropic API calls with proxy route. Remove multi-provider selection — Kova always uses Anthropic via `/api/ai-proxy`. Remove local API key storage. Include Supabase auth token in requests. Default model: `claude-sonnet-4-6`. Dev-only override via `VITE_AI_MODEL` env var.

**Important:** This is a significant refactor of `use-chat.ts`. The file currently supports 8+ providers and stores API keys in localStorage. M5 simplifies this to one provider (Anthropic via proxy) with Supabase auth.

- [ ] **Step 1: Plan the refactor**

Current `use-chat.ts` (299 lines) needs these changes:
- Remove all provider selection (`providerID`, `AI_PROVIDERS`, provider switch)
- Remove localStorage API key management
- Remove ACP transport (Tauri desktop-only feature — keep but gate behind `IS_TAURI`)
- Change `createModel()` to use `createAnthropic({ baseURL: '/api/ai-proxy' })` with Supabase JWT
- Add `VITE_AI_MODEL` env var support for dev model override
- Keep: `ToolLoopAgent`, `DirectChatTransport`, `SYSTEM_PROMPT`, `createAITools`, `ensureChat`, `resetChat`

- [ ] **Step 2: Modify `createModel()` to use proxy**

Replace the multi-provider `createModel()` function with:

```typescript
import { supabase } from '@/lib/supabase'

function createModel(): LanguageModel {
  const modelId = import.meta.env.VITE_AI_MODEL ?? 'claude-sonnet-4-6'

  const anthropic = createAnthropic({
    baseURL: '/api/ai-proxy',
    // Use custom fetch to inject Supabase auth token on every request.
    // @ai-sdk/anthropic doesn't accept async functions for `headers`,
    // so we wrap fetch to add the Authorization header dynamically.
    fetch: async (url, init) => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const headers = new Headers(init?.headers)
      headers.set('Authorization', `Bearer ${token}`)

      return globalThis.fetch(url, { ...init, headers })
    },
  })

  return anthropic(modelId)
}
```

- [ ] **Step 3: Simplify `isConfigured` to check auth state**

```typescript
const isConfigured = computed(() => {
  if (isACPProvider.value) return IS_TAURI
  return !!authStore.user
})
```

- [ ] **Step 4: Remove unused localStorage refs and provider logic**

Remove: `apiKey`, `apiKeyStorageKey`, `customBaseURL`, `customModelID`, `customAPIType`, `maxOutputTokens`, `pexelsApiKey`, `unsplashAccessKey`, `providerDef`, `migrateLegacyStorage()`, `setAPIKey()`, the provider `watch()` calls, and all provider-specific `case` branches in the old `createModel()`.

Keep: `providerID` (default to `'anthropic'`), `modelID` (for display), `activeTab`, `isACPProvider`, `ensureChat`, `resetChat`, `createTransport`, `createACPTransport`.

- [ ] **Step 5: Verify the refactored composable**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 6: Manually verify streaming works**

Run: `cd kova-open-pencil-1 && bun run dev`
Open the editor, send a chat message, confirm it streams through the proxy (check Network tab for `/api/ai-proxy/v1/messages`).

- [ ] **Step 7: Commit**

```bash
git add src/composables/use-chat.ts
git commit -m "feat(m5): route AI requests through server-side proxy"
```

---

## Chunk 3: Phase 5.2 — Chat Popup UI

### Task 3: Chat Persistence Infrastructure (spec 5.2.6)

**Files:**
- Create: `supabase/migrations/20260401_m5_chat_persistence.sql`
- Create: `src/types/kova/chat.ts`
- Create: `src/stores/chat.ts`
- Test: `tests/unit/stores/chat.test.ts`

**Context:** Chat must persist across browser sessions. Each canvas can have multiple independent chat tabs. The Pinia store provides CRUD for conversations and messages. This task is placed before the UI tasks (5.2.1) because the popup reads from this store.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260401_m5_chat_persistence.sql
-- M5: Chat persistence — conversations + messages

-- 1. Conversations table (one row per chat tab)
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  canvas_id  UUID NOT NULL REFERENCES public.canvases(id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_conversations_select ON public.chat_conversations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY chat_conversations_insert ON public.chat_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_conversations_update ON public.chat_conversations FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY chat_conversations_delete ON public.chat_conversations FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_conversations_canvas
  ON public.chat_conversations(user_id, brand_id, canvas_id);

-- Auto-update updated_at on row changes (matches brands/canvases pattern)
CREATE TRIGGER set_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  attachments     JSONB NOT NULL DEFAULT '[]',
  tool_calls      JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());
-- UPDATE needed: the Vercel AI SDK's Chat class may update assistant messages
-- as streaming appends content. Without this policy, streaming updates fail silently.
CREATE POLICY chat_messages_update ON public.chat_messages FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY chat_messages_delete ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages(conversation_id, created_at);

-- 3. Add conversation_id FK to chat_attachments (created in earlier migration)
ALTER TABLE public.chat_attachments
  ADD CONSTRAINT fk_chat_attachments_conversation
  FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
```

- [ ] **Step 2: Create chat types**

```typescript
// src/types/kova/chat.ts

export interface ChatConversation {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly canvas_id: string
  readonly title: string | null
  readonly created_at: string
  readonly updated_at: string
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
```

- [ ] **Step 3: Write failing tests for chat store**

```typescript
// tests/unit/stores/chat.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

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

const { useChatStore } = await import('@/stores/chat')
const { useAuthStore } = await import('@/stores/auth')

const sampleConversation = {
  id: 'conv-1',
  user_id: 'user-1',
  brand_id: 'b1',
  canvas_id: 'canvas-1',
  title: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

const sampleMessage = {
  id: 'msg-1',
  conversation_id: 'conv-1',
  user_id: 'user-1',
  role: 'user',
  content: 'Design a sales email',
  attachments: [],
  tool_calls: [],
  created_at: '2026-04-01T00:00:00Z',
}

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as any
  })

  test('fetchConversations loads conversations for a canvas', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [sampleConversation], error: null }),
          }),
        }),
      }),
    })

    const store = useChatStore()
    await store.fetchConversations('b1', 'canvas-1')
    expect(store.conversations).toHaveLength(1)
    expect(store.conversations[0].id).toBe('conv-1')
  })

  test('createConversation inserts and returns a new conversation', async () => {
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleConversation, error: null }),
        }),
      }),
    })

    const store = useChatStore()
    const conv = await store.createConversation('b1', 'canvas-1')
    expect(conv.id).toBe('conv-1')
    expect(store.conversations).toContainEqual(sampleConversation)
  })

  test('addMessage persists a message and adds to active messages', async () => {
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleMessage, error: null }),
        }),
      }),
    })

    const store = useChatStore()
    store.activeConversationId = 'conv-1'
    await store.addMessage('conv-1', 'user', 'Design a sales email')
    expect(store.messages).toHaveLength(1)
  })

  test('deleteConversation removes from state', async () => {
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    const store = useChatStore()
    store.conversations = [sampleConversation]
    await store.deleteConversation('conv-1')
    expect(store.conversations).toHaveLength(0)
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Implement chat store**

```typescript
// src/stores/chat.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { ChatConversation, ChatMessage, ChatMessageAttachment } from '@/types/kova/chat'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()

  const conversations = ref<ChatConversation[]>([])
  const messages = ref<ChatMessage[]>([])
  const activeConversationId = ref<string | null>(null)
  const isLoading = ref(false)

  async function fetchConversations(brandId: string, canvasId: string): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('brand_id', brandId)
        .eq('canvas_id', canvasId)
        .order('updated_at', { ascending: false })

      if (error) throw new Error(error.message)
      conversations.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  async function createConversation(
    brandId: string,
    canvasId: string
  ): Promise<ChatConversation> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        brand_id: brandId,
        canvas_id: canvasId,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to create conversation')

    const conversation = data as ChatConversation
    conversations.value = [conversation, ...conversations.value]
    return conversation
  }

  async function deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)

    if (error) throw new Error(error.message)

    conversations.value = conversations.value.filter((c) => c.id !== conversationId)
    if (activeConversationId.value === conversationId) {
      activeConversationId.value = conversations.value[0]?.id ?? null
      messages.value = []
    }
  }

  async function fetchMessages(conversationId: string): Promise<void> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    messages.value = data ?? []
  }

  async function addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    attachments: readonly ChatMessageAttachment[] = [],
    toolCalls: readonly Record<string, unknown>[] = []
  ): Promise<ChatMessage> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        attachments,
        tool_calls: toolCalls,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to add message')

    const message = data as ChatMessage
    if (activeConversationId.value === conversationId) {
      messages.value = [...messages.value, message]
    }
    return message
  }

  async function updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (error) throw new Error(error.message)

    conversations.value = conversations.value.map((c) =>
      c.id === conversationId ? { ...c, title, updated_at: new Date().toISOString() } : c
    )
  }

  return {
    conversations,
    messages,
    activeConversationId,
    isLoading,
    fetchConversations,
    createConversation,
    deleteConversation,
    fetchMessages,
    addMessage,
    updateConversationTitle,
  }
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/chat.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260401_m5_chat_persistence.sql src/types/kova/chat.ts src/stores/chat.ts tests/unit/stores/chat.test.ts
git commit -m "feat(m5): add chat persistence infrastructure with conversations and messages"
```

---

### Task 4: Build Chat Popup Container (spec 5.2.1)

**Files:**
- Create: `src/components/chat/ChatPopup.vue`

**Context:** Floating popup anchored to the bottom of the editor view. Replaces the existing sidebar `ChatPanel.vue`. Two states: minimized (thin bar) and expanded (~400x500px). Overlays the canvas with `position: fixed`. Has chat tab bar with "+" button. Reuses existing `ChatMessage.vue` for rendering.

**✅ Design decision resolved:** ChatPopup uses **dark theme** to match the editor context. Per project feedback rules: "Auth, onboarding, dashboard use light/white theme. Only editor keeps dark theme" and "Kova's UI theme is modeled after Figma's." The implementing agent must use the design system's dark tokens: `bg-panel` (not `bg-white`), `text-foreground`/`text-muted` (not `text-gray-*`), `border-border` (not `border-gray-*`). Reference the existing `ChatPanel.vue` for the canonical dark theme token usage.

- [ ] **Step 1: Create `ChatPopup.vue` with minimized/expanded states**

```vue
<!-- src/components/chat/ChatPopup.vue -->
<script setup lang="ts">
import {
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from 'reka-ui'
import { computed, markRaw, nextTick, ref, watch } from 'vue'

import { clearToolLogEntries, didHitStepLimit } from '@/ai/tools'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import PromptChips from '@/components/chat/PromptChips.vue'
import { useAIChat } from '@/composables/use-chat'
import { useBrandsStore } from '@/stores/brands'
import { useChatStore } from '@/stores/chat'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

const props = defineProps<{
  canvasId: string
}>()

const { isConfigured, ensureChat, resetChat } = useAIChat()
const brandsStore = useBrandsStore()
const chatStore = useChatStore()

const isExpanded = ref(false)
const chat = ref<Chat<UIMessage> | null>(null)
const messagesEnd = ref<HTMLDivElement>()
const initError = ref<string | null>(null)

const messages = computed(() => chat.value?.messages ?? [])
const status = computed(() => chat.value?.status ?? 'ready')
const isThinking = computed(() => {
  const s = status.value
  if (s !== 'submitted' && s !== 'streaming') return false
  if (messages.value.length === 0) return true
  const last = messages.value[messages.value.length - 1]
  if (last.role !== 'assistant') return true
  const parts = last.parts
  if (parts.length === 0) return true
  const lastPart = parts[parts.length - 1] as Record<string, unknown>
  if (lastPart.type === 'step-start') return true
  if ('toolCallId' in lastPart && lastPart.state === 'output-available') return true
  if ('toolCallId' in lastPart && lastPart.state === 'output-error') return true
  return s === 'submitted'
})

const showContinue = computed(() => {
  if (status.value !== 'ready') return false
  if (messages.value.length === 0) return false
  const last = messages.value[messages.value.length - 1]
  return last.role === 'assistant' && didHitStepLimit()
})

// Initialize: load conversations for this canvas.
// Use watch instead of onMounted because ChatPopup (child) mounts
// before EditorView (parent) finishes async brand loading.
// { immediate: true } fires if the brand is already loaded.
watch(
  () => brandsStore.selectedBrandId,
  async (brandId) => {
    if (!brandId) return
    await chatStore.fetchConversations(brandId, props.canvasId)
    if (chatStore.conversations.length === 0) {
      const conv = await chatStore.createConversation(brandId, props.canvasId)
      chatStore.activeConversationId = conv.id
    } else {
      chatStore.activeConversationId = chatStore.conversations[0].id
    }
  },
  { immediate: true },
)

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

watch(messages, scrollToBottom, { deep: true })

async function handleSubmit(text: string) {
  if (status.value === 'streaming' || status.value === 'submitted') return
  if (!isExpanded.value) isExpanded.value = true

  try {
    initError.value = null
    const c = await ensureChat()
    if (c) chat.value = markRaw(c)
  } catch (e) {
    console.error('Failed to initialize chat:', e)
    initError.value = e instanceof Error ? e.message : String(e)
    return
  }

  // Persist user message
  if (chatStore.activeConversationId) {
    await chatStore.addMessage(chatStore.activeConversationId, 'user', text)
  }

  chat.value?.sendMessage({ text }).catch((e: unknown) => {
    console.error('Chat error:', e)
  })
}

function handleStop() {
  chat.value?.stop()
}

async function handleNewTab() {
  const brandId = brandsStore.selectedBrandId
  if (!brandId) return
  const conv = await chatStore.createConversation(brandId, props.canvasId)
  chatStore.activeConversationId = conv.id
  chat.value = null
  resetChat()
  clearToolLogEntries()
}

async function handleSwitchTab(conversationId: string) {
  chatStore.activeConversationId = conversationId
  await chatStore.fetchMessages(conversationId)
  chat.value = null
  resetChat()
  clearToolLogEntries()
}
</script>

<template>
  <!-- Minimized bar -->
  <div
    v-if="!isExpanded"
    class="fixed bottom-4 left-4 z-50 flex h-10 w-80 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3 shadow-lg transition-all hover:shadow-xl"
    @click="isExpanded = true"
  >
    <icon-lucide-message-circle class="size-4 text-muted" />
    <span class="flex-1 truncate text-sm text-muted">Design with Kova AI...</span>
    <icon-lucide-send class="size-3.5 text-muted" />
  </div>

  <!-- Expanded popup -->
  <div
    v-else
    class="fixed bottom-4 left-4 z-50 flex h-[500px] w-[400px] flex-col rounded-2xl border border-border bg-white shadow-2xl"
  >
    <!-- Header: tab bar -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <div class="flex flex-1 items-center gap-1 overflow-x-auto">
        <button
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          class="shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors"
          :class="
            conv.id === chatStore.activeConversationId
              ? 'bg-gray-100 font-medium text-gray-900'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          "
          @click="handleSwitchTab(conv.id)"
        >
          {{ conv.title ?? 'New chat' }}
        </button>
      </div>
      <button
        class="flex size-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="New chat"
        @click="handleNewTab"
      >
        <icon-lucide-plus class="size-3.5" />
      </button>
      <button
        class="flex size-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="Minimize"
        @click="isExpanded = false"
      >
        <icon-lucide-minus class="size-3.5" />
      </button>
    </div>

    <!-- Message area -->
    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
        <!-- Empty state -->
        <div
          v-if="messages.length === 0"
          class="flex h-full flex-col items-center justify-center gap-4"
        >
          <div class="flex flex-col items-center gap-2 text-gray-400">
            <icon-lucide-sparkles class="size-8" />
            <p class="text-center text-sm">What would you like to create?</p>
          </div>
          <PromptChips @select="handleSubmit" />
        </div>

        <!-- Messages -->
        <div v-else class="flex flex-col gap-3">
          <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />

          <!-- Thinking indicator -->
          <div v-if="isThinking" class="flex gap-2">
            <div
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500"
            >
              AI
            </div>
            <div class="flex items-center gap-1 py-2">
              <span class="size-1.5 animate-bounce rounded-full bg-gray-400" style="animation-delay: 0ms" />
              <span class="size-1.5 animate-bounce rounded-full bg-gray-400" style="animation-delay: 150ms" />
              <span class="size-1.5 animate-bounce rounded-full bg-gray-400" style="animation-delay: 300ms" />
            </div>
          </div>

          <!-- Continue button -->
          <div v-if="showContinue" class="flex justify-center py-2">
            <button
              class="flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
              @click="handleSubmit('Continue where you left off')"
            >
              <icon-lucide-play class="size-3" />
              Continue
            </button>
          </div>

          <div ref="messagesEnd" />
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-gray-200" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Error banner -->
    <div
      v-if="initError"
      class="flex items-center gap-2 border-t border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600"
    >
      <icon-lucide-circle-alert class="size-3.5 shrink-0" />
      <span class="min-w-0 flex-1">{{ initError }}</span>
      <button class="shrink-0 text-red-400 hover:text-red-600" @click="initError = null">
        <icon-lucide-x class="size-3" />
      </button>
    </div>

    <!-- Input -->
    <ChatInput :status="status" @submit="handleSubmit" @stop="handleStop" />
  </div>
</template>
```

- [ ] **Step 2: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/ChatPopup.vue
git commit -m "feat(m5): add floating chat popup with minimized/expanded states and tab bar"
```

---

### Task 5: Add Example Prompt Chips (spec 5.2.2)

**Files:**
- Create: `src/components/chat/PromptChips.vue`

**Context:** Five clickable campaign-type chips shown in the empty chat state. Clicking a chip auto-submits the prompt and passes `campaignType` metadata. Styled as rounded pill buttons.

- [ ] **Step 1: Create `PromptChips.vue`**

```vue
<!-- src/components/chat/PromptChips.vue -->
<script setup lang="ts">
const emit = defineEmits<{
  select: [text: string, campaignType?: string]
}>()

const chips = [
  {
    label: 'A tips-and-tricks email that teaches something useful',
    campaignType: 'educational',
    icon: 'icon-lucide-lightbulb',
  },
  {
    label: 'Behind-the-scenes story about how we started',
    campaignType: 'community',
    icon: 'icon-lucide-users',
  },
  {
    label: 'Flash sale with a countdown and bold CTA',
    campaignType: 'sales',
    icon: 'icon-lucide-zap',
  },
  {
    label: 'Customer testimonial spotlight with before-and-after',
    campaignType: 'social-proof',
    icon: 'icon-lucide-star',
  },
  {
    label: 'New product drop with hero image and feature callouts',
    campaignType: 'product-highlights',
    icon: 'icon-lucide-package',
  },
] as const

function handleChipClick(chip: (typeof chips)[number]) {
  emit('select', chip.label, chip.campaignType)
}
</script>

<template>
  <div class="flex flex-wrap justify-center gap-2 px-2">
    <button
      v-for="chip in chips"
      :key="chip.campaignType"
      class="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
      @click="handleChipClick(chip)"
    >
      <component :is="chip.icon" class="size-3" />
      <span class="max-w-[200px] truncate">{{ chip.label }}</span>
    </button>
  </div>
</template>
```

- [ ] **Step 2: Update `ChatPopup.vue` `handleSubmit` to accept `campaignType`**

The `PromptChips` emits `(text, campaignType?)`. Update `ChatPopup.vue` to store `campaignType` for later use by `buildSystemPrompt()` (Task 9).

In `ChatPopup.vue` `<script setup>`, add the ref:

```typescript
const activeCampaignType = ref<string | undefined>(undefined)
```

Update the `handleSubmit` function signature and body:

```typescript
function handleSubmit(text: string, campaignType?: string) {
  activeCampaignType.value = campaignType
  chat.value?.sendMessage({ text })
}
```

The template `@select="handleSubmit"` already works since `PromptChips` emits `(text: string, campaignType?: string)` — both args pass through automatically.

- [ ] **Step 3: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/PromptChips.vue src/components/chat/ChatPopup.vue
git commit -m "feat(m5): add example prompt chips for campaign types"
```

---

### Task 6: Create `placeMediaImage` Tool (spec 5.2.5)

**Files:**
- Create: `src/ai/kova-tools.ts`
- Modify: `src/ai/tools.ts`
- Test: `tests/unit/ai/kova-tools.test.ts`

**Context:** Claude calls `placeMediaImage(node_id, image_url, scale_mode?)` to place images on canvas nodes. It fetches the URL (Supabase Storage), converts to base64, delegates to core `setImageFill`. Only accepts Supabase Storage URLs (SSRF prevention). Registered alongside `CORE_TOOLS` in `tools.ts`.

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/ai/kova-tools.test.ts
import { describe, test, expect } from 'bun:test'

describe('placeMediaImage URL validation', () => {
  test('rejects non-Supabase URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() => validateImageUrl('https://evil.com/malware.png')).toThrow()
    expect(() => validateImageUrl('https://example.com/img.jpg')).toThrow()
  })

  test('accepts Supabase storage URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() =>
      validateImageUrl('https://abc.supabase.co/storage/v1/object/public/media-assets/img.png')
    ).not.toThrow()
  })

  test('rejects javascript: and data: URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() => validateImageUrl('javascript:alert(1)')).toThrow()
    expect(() => validateImageUrl('data:image/png;base64,abc')).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/ai/kova-tools.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `kova-tools.ts`**

```typescript
// src/ai/kova-tools.ts
import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import type { EditorStore } from '@/stores/editor'

const SUPABASE_STORAGE_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//

const FETCH_TIMEOUT_MS = 10_000

export function validateImageUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed')
    }
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (!SUPABASE_STORAGE_PATTERN.test(url)) {
    throw new Error(
      `Only Supabase Storage URLs are allowed. Got: ${url}`
    )
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function createKovaTools(store: EditorStore) {
  // Use makeFigmaFromStore — the same factory that createAITools uses
  // to get a FigmaAPI instance from the editor store.
  const getFigma = () => makeFigmaFromStore(store)

  const placeMediaImage = tool({
    description:
      'Place an image from Supabase Storage onto a canvas node. Fetches the image, converts to base64, and sets it as an image fill on the target node. Only accepts Supabase Storage URLs.',
    parameters: valibotSchema(
      v.object({
        node_id: v.pipe(v.string(), v.description('The ID of the target node to place the image on')),
        image_url: v.pipe(v.string(), v.description('Supabase Storage URL of the image')),
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

      try {
        const response = await fetch(image_url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })

        if (!response.ok) {
          return {
            error: `Failed to load image from ${image_url}. Using a placeholder instead.`,
          }
        }

        const buffer = await response.arrayBuffer()
        const base64 = arrayBufferToBase64(buffer)
        const mimeType = response.headers.get('content-type') ?? 'image/png'

        // Pipeline integration: replicate the undo/layout/render hooks
        // from createAITools() in src/ai/tools.ts (onBeforeExecute/onAfterExecute).
        // This ensures placeMediaImage gets undo support, layout recomputation,
        // and flash animation like all CORE_TOOLS.
        const beforeSnapshot = store.snapshotPage()

        const figma = getFigma()
        const node = figma.getNodeById(node_id)
        if (!node) {
          return { error: `Node ${node_id} not found` }
        }

        // setImageFill expects base64 data URI
        const dataUri = `data:${mimeType};base64,${base64}`
        figma.setImageFill(node_id, dataUri, scale_mode)

        // Post-execution: layout recompute, render, undo entry (mirrors onAfterExecute)
        const pageId = store.state.currentPageId
        computeAllLayouts(store.graph, pageId)
        store.requestRender()

        const afterSnapshot = store.snapshotPage()
        store.pushUndoEntry({
          label: 'AI: placeMediaImage',
          forward: () => store.restorePageFromSnapshot(afterSnapshot),
          inverse: () => store.restorePageFromSnapshot(beforeSnapshot),
        })

        // Flash the node to show what changed
        store.renderer?.aiClearActive()
        store.aiFlashDone([node_id])

        return { success: true, node_id, scale_mode }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        return {
          error: `Failed to load image from ${image_url}. ${message}. Using a placeholder instead.`,
        }
      }
    },
  })

  return { placeMediaImage }
}
```

**Note:** `createKovaTools` must import `makeFigmaFromStore` from `@/automation/figma-factory` and `computeAllLayouts` from `@open-pencil/core`. The `getFigma()` → `figma.setImageFill()` API surface depends on `@open-pencil/core` internals. The implementing agent must inspect `CORE_TOOLS` to find the existing `setImageFill` tool and confirm the method signature matches. The pipeline hooks (snapshot, layout, render, undo, flash) mirror `createAITools()` in `src/ai/tools.ts` — refer to `onBeforeExecute`/`onAfterExecute`/`onFlashNodes` callbacks for the canonical pattern.

- [ ] **Step 4: Register Kova tools in `tools.ts`**

In `src/ai/tools.ts`, after creating `CORE_TOOLS`, merge Kova tools:

```typescript
import { createKovaTools } from '@/ai/kova-tools'

export function createAITools(store: EditorStore) {
  // ... existing code that creates coreToolsResult from toolsToAI(CORE_TOOLS, ...)

  const kovaTools = createKovaTools(store)

  // Merge kova tools into the result
  return { ...coreToolsResult, ...kovaTools }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/ai/kova-tools.test.ts`
Expected: PASS

- [ ] **Step 6: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add src/ai/kova-tools.ts src/ai/tools.ts tests/unit/ai/kova-tools.test.ts
git commit -m "feat(m5): add placeMediaImage tool with SSRF prevention"
```

---

### Task 7: Wire Chat Popup into Editor View (spec 5.2.4)

**Files:**
- Modify: `src/views/EditorView.vue`

**Context:** Replace the existing chat sidebar with `ChatPopup`. The popup overlays the canvas — it does NOT push panels. Auto-open (expanded) on a new canvas with no content. Minimized by default on existing canvas. Remove old `Cmd+J` sidebar toggle if present.

- [ ] **Step 1: Add `ChatPopup` to `EditorView.vue`**

Import `ChatPopup` and add it after the layout containers. It renders as a fixed overlay regardless of layout mode (desktop/mobile/collapsed).

```vue
<script setup lang="ts">
// Add import
import ChatPopup from '@/components/chat/ChatPopup.vue'
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col">
    <!-- ... existing layout code ... -->

    <!-- Chat popup overlay (always rendered, manages its own visibility) -->
    <ChatPopup v-if="canvasId" :canvas-id="canvasId" />
  </div>
</template>
```

- [ ] **Step 2: Remove old chat sidebar integration if present**

Check if `ChatPanel.vue` is imported/used in `EditorView.vue` or any splitter panel. If so, remove it. Based on the current code, `ChatPanel` is NOT in `EditorView.vue` — it's rendered separately. No removal needed.

- [ ] **Step 3: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/views/EditorView.vue
git commit -m "feat(m5): wire chat popup into editor view"
```

---

### Task 8: Image Attachment in Chat (spec 5.2.3)

**Files:**
- Create: `src/composables/use-chat-images.ts`
- Modify: `src/components/chat/ChatInput.vue`
- Modify: `src/components/chat/ChatPopup.vue`
- Modify: `src/composables/use-chat.ts`
- Test: `tests/unit/composables/use-chat-images.test.ts`

**Context:** Image attachment with two paths: media library picker (already in Supabase) and clipboard paste/drag-drop (uploads to `chat-attachments` bucket). Each image gets dual-representation: vision copy (base64 JPEG for Claude to see) and storage reference (URL for canvas placement). Multi-turn stripping via `wrapLanguageModel()` middleware prevents resending base64 on every API call.

**Dependencies:** Requires Task P1 (image processing), Task P3 (chat attachments store), Task 4 (ChatPopup), Task 6 (placeMediaImage).

- [ ] **Step 1: Write failing tests for multi-turn stripping**

```typescript
// tests/unit/composables/use-chat-images.test.ts
import { describe, test, expect } from 'bun:test'

describe('stripPreviousTurnImages', () => {
  test('strips file parts from older messages, keeps current turn', async () => {
    const { stripPreviousTurnImages } = await import('@/composables/use-chat-images')

    // Note: SDK v3 uses `mediaType` (not `mimeType`) for LanguageModelV3FilePart
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a design assistant',  // system messages have string content
      },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'Look at this' },
          { type: 'file' as const, data: 'base64data', mediaType: 'image/jpeg' },
        ],
      },
      { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Nice image' }] },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'Now change the colors' },
          { type: 'file' as const, data: 'newbase64', mediaType: 'image/jpeg' },
        ],
      },
    ]

    const result = stripPreviousTurnImages(messages)

    // System message (index 0): passed through unchanged (string content)
    expect(result[0].content).toBe('You are a design assistant')

    // First user message (index 1): file part should be replaced with text reference
    const firstUserContent = result[1].content as Array<Record<string, unknown>>
    expect(firstUserContent).not.toContainEqual(
      expect.objectContaining({ type: 'file' })
    )
    expect(firstUserContent).toContainEqual(
      expect.objectContaining({ type: 'text', text: expect.stringContaining('[Previously attached') })
    )

    // Last user message (index 3, current turn): file part should be preserved
    const lastUserContent = result[3].content as Array<Record<string, unknown>>
    expect(lastUserContent).toContainEqual(
      expect.objectContaining({ type: 'file' })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/composables/use-chat-images.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `use-chat-images.ts`**

```typescript
// src/composables/use-chat-images.ts
import { ref } from 'vue'
import { createVisionCopy, processImage } from '@/utils/image-processing'
import { useChatAttachmentsStore } from '@/stores/chat-attachments'
import { useMediaStore } from '@/stores/media'

import type { ProcessedImage } from '@/utils/image-processing'

export interface PendingAttachment {
  readonly id: string
  readonly fileName: string
  readonly localPreviewUrl: string
  readonly source: 'media' | 'clipboard'
  readonly mediaId?: string
  readonly storageUrl?: string
  readonly width: number | null
  readonly height: number | null
  readonly visionBlob?: Blob
  readonly isUploading: boolean
}

/**
 * Strips base64 file parts from all messages except the most recent user message.
 * Replaces stripped images with text references.
 * Used as middleware in wrapLanguageModel() to prevent resending images on every API call.
 */
export function stripPreviousTurnImages(
  messages: ReadonlyArray<{ role: string; content: string | Array<Record<string, unknown>> }>
): Array<{ role: string; content: string | Array<Record<string, unknown>> }> {
  // Find the index of the last user message
  let lastUserIndex = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIndex = i
      break
    }
  }

  return messages.map((msg, index) => {
    if (index === lastUserIndex) return { ...msg } // Keep current turn intact

    // System messages have string content — pass through unchanged
    if (typeof msg.content === 'string') return { ...msg }

    // Only process messages with array content (user, assistant, tool)
    const newContent = msg.content.map((part) => {
      if (part.type === 'file') {
        return {
          type: 'text' as const,
          text: '[Previously attached image]',
        }
      }
      return part
    })

    return { ...msg, content: newContent }
  })
}

export function useChatImages(brandId: string) {
  const attachments = ref<PendingAttachment[]>([])
  const chatAttachmentsStore = useChatAttachmentsStore()
  const mediaStore = useMediaStore()

  async function attachFromMediaLibrary(mediaAsset: {
    id: string
    file_name: string
    storage_path: string
    width: number | null
    height: number | null
  }): Promise<void> {
    const publicUrl = mediaStore.getPublicUrl(mediaAsset.storage_path)

    // Create vision copy by fetching the image
    const response = await fetch(publicUrl)
    const blob = await response.blob()
    const file = new File([blob], mediaAsset.file_name, { type: blob.type })
    const vision = await createVisionCopy(file)

    const attachment: PendingAttachment = {
      id: crypto.randomUUID(),
      fileName: mediaAsset.file_name,
      localPreviewUrl: publicUrl,
      source: 'media',
      mediaId: mediaAsset.id,
      storageUrl: publicUrl,
      width: mediaAsset.width,
      height: mediaAsset.height,
      visionBlob: vision.blob,
      isUploading: false,
    }

    attachments.value = [...attachments.value, attachment]
  }

  async function attachFromClipboard(file: File): Promise<void> {
    const localPreviewUrl = URL.createObjectURL(file)
    const tempId = crypto.randomUUID()

    // Show immediately with loading state
    const pendingAttachment: PendingAttachment = {
      id: tempId,
      fileName: file.name,
      localPreviewUrl,
      source: 'clipboard',
      width: null,
      height: null,
      isUploading: true,
    }
    attachments.value = [...attachments.value, pendingAttachment]

    try {
      // Process and upload in parallel
      const [processed, vision] = await Promise.all([
        processImage(file),
        createVisionCopy(file),
      ])

      const uploadedFile = new File([processed.blob], file.name, { type: processed.mimeType })
      const record = await chatAttachmentsStore.uploadChatImage(
        brandId,
        uploadedFile,
        processed.width,
        processed.height
      )

      const signedUrl = await chatAttachmentsStore.getSignedUrl(record.storage_path)

      // Update the attachment with upload results
      attachments.value = attachments.value.map((a) =>
        a.id === tempId
          ? {
              ...a,
              storageUrl: signedUrl,
              width: processed.width,
              height: processed.height,
              visionBlob: vision.blob,
              isUploading: false,
            }
          : a
      )
    } catch (e) {
      // Remove failed attachment
      attachments.value = attachments.value.filter((a) => a.id !== tempId)
      URL.revokeObjectURL(localPreviewUrl)
      throw e
    }
  }

  function removeAttachment(id: string): void {
    const attachment = attachments.value.find((a) => a.id === id)
    if (attachment) {
      URL.revokeObjectURL(attachment.localPreviewUrl)
    }
    attachments.value = attachments.value.filter((a) => a.id !== id)
  }

  function clearAttachments(): void {
    for (const a of attachments.value) {
      URL.revokeObjectURL(a.localPreviewUrl)
    }
    attachments.value = []
  }

  return {
    attachments,
    attachFromMediaLibrary,
    attachFromClipboard,
    removeAttachment,
    clearAttachments,
  }
}
```

- [ ] **Step 4: Add `wrapLanguageModel()` middleware to `use-chat.ts`**

In `src/composables/use-chat.ts`, wrap the model with image stripping middleware:

```typescript
import { wrapLanguageModel } from 'ai'
import { stripPreviousTurnImages } from '@/composables/use-chat-images'

// In createTransport(), after creating the model:
const baseModel = createModel()
const wrappedModel = wrapLanguageModel({
  model: baseModel,
  middleware: {
    // Note: specificationVersion is set internally by wrapLanguageModel(),
    // NOT by the middleware definition. Do not add it here.
    transformParams: async ({ params }) => ({
      ...params,
      prompt: stripPreviousTurnImages(params.prompt),
    }),
  },
})

// Use wrappedModel instead of createModel() in the ToolLoopAgent
// IMPORTANT: The implementing agent must verify that stripPreviousTurnImages()
// types align with the actual LanguageModelV3Message shape from the `ai` package.
// params.prompt is ReadonlyArray<LanguageModelV3Message> — check that the
// function handles all message part types (text, image, file, tool-call, tool-result).
```

- [ ] **Step 5: Add image attachment button to ChatInput.vue**

Add an image icon button to the left of the text input. Clicking it emits an `attach-image` event. Also handle paste events for clipboard images. **Also remove the dead imports** that will break after Task 2 refactors `use-chat.ts`: remove destructured `providerID`, `providerDef`, `modelID`, `customModelID` from the `useAIChat()` call and remove any associated UI (model selector dropdown) that depends on these values.

In `src/components/chat/ChatInput.vue`, add emit types:

```typescript
const emit = defineEmits<{
  submit: [text: string]
  'attach-image': []
  'attach-clipboard': [file: File]
}>()
```

Add the image button to the template, to the left of the text input:

```vue
<button
  type="button"
  class="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
  @click="emit('attach-image')"
>
  <icon-lucide-image class="size-4" />
</button>
```

Add a paste handler on the input element:

```typescript
function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) emit('attach-clipboard', file)
      return
    }
  }
}
```

Bind it in the template: `@paste="handlePaste"` on the `<input>` or `<textarea>` element.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/composables/use-chat-images.test.ts`
Expected: PASS

- [ ] **Step 7: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add src/composables/use-chat-images.ts src/composables/use-chat.ts src/components/chat/ChatInput.vue src/components/chat/ChatPopup.vue tests/unit/composables/use-chat-images.test.ts
git commit -m "feat(m5): add image attachment with dual-representation and multi-turn stripping"
```

---

## Chunk 4: Phase 5.3 — Dynamic System Prompt

### Task 9: Create `buildSystemPrompt()` Function (spec 5.3.1)

**Files:**
- Create: `src/ai/build-system-prompt.ts`
- Modify: `src/composables/use-chat.ts`
- Test: `tests/unit/ai/build-system-prompt.test.ts`

**Context:** Assembles the AI's full instruction set from 8 layers. Layers 6a/6b are mutually exclusive (campaign guide vs fallback inference). Called before each AI interaction from `createTransport()`. Gracefully degrades if optional layers fail to load (memories, media library).

**Important:** The existing `SYSTEM_PROMPT` constant is NEVER modified. `buildSystemPrompt()` APPENDS to it.

- [ ] **Step 1: Write failing tests for layer assembly**

```typescript
// tests/unit/ai/build-system-prompt.test.ts
import { describe, test, expect } from 'bun:test'

describe('buildSystemPrompt', () => {
  test('always starts with SYSTEM_PROMPT constant', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    // The existing SYSTEM_PROMPT should be the first content
    expect(result).toContain('## Available Elements')  // Known content from system-prompt.md
  })

  test('includes email design principles when brand profile exists', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: {
        id: 'b1', user_id: 'u1', name: 'Test Brand',
        colors: { primary: '#FF0000', secondary: '#00FF00', accent: '#0000FF', background: '#FFFFFF' },
        fonts: { heading: 'Inter', body: 'Roboto' },
        logo_url: null, voice: 'Professional', industry: 'Tech',
        url: null, created_at: '', updated_at: '',
      },
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Email Design Principles')
  })

  test('includes campaign guide when campaignType provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
      campaignType: 'sales',
    })
    expect(result).toContain('sales')
  })

  test('includes fallback inference when no campaignType', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Analyze the user')
  })

  test('includes brand memories when provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [
        { id: '1', content: 'CTAs should be coral', source: 'auto' as const },
      ],
    })
    expect(result).toContain('Brand Memories')
    expect(result).toContain('CTAs should be coral')
  })

  test('omits brand memories section when empty', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).not.toContain('Brand Memories')
  })

  test('includes available images when provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [
        { fileName: 'hero.jpg', fileType: 'image/jpeg', width: 1800, height: 1200, publicUrl: 'https://cdn.example.com/hero.jpg', mediaId: 'm1' },
      ],
      brandMemories: [],
    })
    expect(result).toContain('Available Media Library Images')
    expect(result).toContain('hero.jpg')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/ai/build-system-prompt.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `buildSystemPrompt()`**

```typescript
// src/ai/build-system-prompt.ts
import SYSTEM_PROMPT from '@/ai/system-prompt.md?raw'
import EMAIL_GUIDELINES from '@/data/email-guidelines.md?raw'
import EMAIL_SECTIONS from '@/data/email-sections.md?raw'
import IMAGE_HANDLING from '@/data/image-handling.md?raw'
import MEMORY_INSTRUCTIONS from '@/data/memory-instructions.md?raw'
import type { Brand } from '@/types/kova/database'
import { formatBrandKitPrompt } from '@/utils/format-brand-prompt'

export interface AvailableImage {
  readonly fileName: string
  readonly fileType: string
  readonly width: number | null
  readonly height: number | null
  readonly publicUrl: string
  readonly mediaId: string
}

export interface BrandMemory {
  readonly id: string
  readonly content: string
  readonly source: 'auto' | 'user'
}

export interface BuildSystemPromptInput {
  readonly brandProfile: Brand | null
  readonly availableImages: readonly AvailableImage[]
  readonly brandMemories: readonly BrandMemory[]
  readonly campaignType?: string
}

const CAMPAIGN_GUIDE_MODULES: Record<string, () => Promise<{ default: string }>> = {
  educational: () => import('@/data/campaigns/educational.md?raw').then((m) => ({ default: m.default })),
  community: () => import('@/data/campaigns/community-branded.md?raw').then((m) => ({ default: m.default })),
  sales: () => import('@/data/campaigns/sales.md?raw').then((m) => ({ default: m.default })),
  'social-proof': () => import('@/data/campaigns/social-proof.md?raw').then((m) => ({ default: m.default })),
  'product-highlights': () => import('@/data/campaigns/product-highlights.md?raw').then((m) => ({ default: m.default })),
}

const FALLBACK_INFERENCE = `
## Campaign Type Inference
Analyze the user's request and infer which campaign type it most closely matches.
Apply the relevant design principles for that campaign type.
If the request doesn't map to a specific campaign type, use general email design principles.
`

const MAX_IMAGES = 20

export async function buildSystemPrompt(input: BuildSystemPromptInput): Promise<string> {
  const layers: string[] = []

  // Layer 1: Existing system prompt (never modified)
  layers.push(SYSTEM_PROMPT)

  // Layer 2: Email design principles & brand kit application rules
  layers.push(EMAIL_GUIDELINES)

  // Layer 3: Email section definitions
  layers.push(EMAIL_SECTIONS)

  // Layer 4: Active brand kit
  if (input.brandProfile) {
    layers.push(formatBrandKitPrompt(input.brandProfile))
  }

  // Layer 5: Image handling instructions
  layers.push(IMAGE_HANDLING)

  // Layer 6a/6b: Campaign guide (mutually exclusive)
  if (input.campaignType && input.campaignType in CAMPAIGN_GUIDE_MODULES) {
    try {
      const mod = await CAMPAIGN_GUIDE_MODULES[input.campaignType]()
      layers.push(mod.default)
    } catch {
      layers.push(FALLBACK_INFERENCE)
    }
  } else {
    layers.push(FALLBACK_INFERENCE)
  }

  // Layer 7a: Brand memory instructions (always present — tells AI how to use saveBrandMemory)
  layers.push(MEMORY_INSTRUCTIONS)

  // Layer 7b: Brand memories (only when memories exist)
  if (input.brandMemories.length > 0) {
    layers.push(formatBrandMemories(input.brandMemories))
  }

  // Layer 8: Available media library images
  if (input.availableImages.length > 0) {
    layers.push(formatAvailableImages(input.availableImages))
  }

  return layers.join('\n\n---\n\n')
}

// formatBrandKit removed — reuses formatBrandKitPrompt() from @/utils/format-brand-prompt

function formatBrandMemories(memories: readonly BrandMemory[]): string {
  const memoryLines = memories.map((m) => `- ${m.content}`).join('\n')

  return `## Brand Memories
The following are things you've learned about this brand from previous conversations.
Apply these in all your design decisions for this brand.

${memoryLines}`
}

function formatAvailableImages(images: readonly AvailableImage[]): string {
  const limited = images.slice(0, MAX_IMAGES)
  const imageLines = limited
    .map(
      (img, i) =>
        `${i + 1}. "${img.fileName}" (${img.width ?? '?'}x${img.height ?? '?'}px, ${img.fileType}) — public_url: ${img.publicUrl} — media_id: ${img.mediaId}`
    )
    .join('\n')

  const overflow =
    images.length > MAX_IMAGES
      ? `\nShowing ${MAX_IMAGES} most recent images. Ask the user if they need a specific image not shown here.`
      : ''

  return `## Available Media Library Images
The following images are available for this brand. Use them when relevant via \`placeMediaImage\`.

${imageLines}${overflow}`
}
```

- [ ] **Step 4: Wire into `use-chat.ts`**

Modify `createTransport()` in `src/composables/use-chat.ts` to call `buildSystemPrompt()` instead of using the raw `SYSTEM_PROMPT` constant:

```typescript
import { buildSystemPrompt } from '@/ai/build-system-prompt'

// In createTransport(), replace:
//   instructions: SYSTEM_PROMPT,
// with:
//   instructions: await buildSystemPrompt({ brandProfile, availableImages, brandMemories, campaignType }),
```

Since `createTransport()` is currently synchronous, it needs to become async or use a pre-built prompt string. The recommended approach: compute the system prompt before creating the transport (in `ensureChat()`), then pass it in.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/ai/build-system-prompt.test.ts`
Expected: PASS

- [ ] **Step 6: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add src/ai/build-system-prompt.ts src/composables/use-chat.ts tests/unit/ai/build-system-prompt.test.ts
git commit -m "feat(m5): add buildSystemPrompt with 8-layer assembly"
```

---

### Task 10: Email Design Principles & Brand Kit Application Rules (spec 5.3.2)

**Files:**
- Create: `src/data/email-guidelines.md`

**Context:** Layer 2 of the system prompt. Two parts: structural email design rules (like Pencil.dev's `get_guidelines`) and the "bridge layer" teaching the AI how to map any brand kit's 5 colors + 2 fonts into a complete email design system. Content needs iterative refinement with the user — start with a solid foundation, expect QA feedback.

- [ ] **Step 1: Write the email design principles**

```markdown
<!-- src/data/email-guidelines.md -->
## Email Design Principles

### Structure
- Emails are vertical, single-column layouts
- Standard width: 600px
- Sections stack vertically, separated by consistent spacing
- Each section serves one purpose

### Visual Hierarchy
- The hero section is the dominant visual region — it should command the most visual weight
- Visual weight decreases as you move down the email
- Use size, color contrast, and whitespace to create clear hierarchy
- One primary CTA per email — make it unmissable

### Section Flow
Build emails from these section types (defined in detail in Section Definitions):
- **Header**: Brand logo, centered. Present in every email.
- **Hero**: First visual anchor — grabs attention, sets the tone
- **Bridge**: Transitional element between major sections
- **Product**: Product showcase (single or multi-column)
- **Photo-gallery**: Image-forward section for visual storytelling
- **Testimonial**: Social proof with quotes and attribution
- **CTA**: Standalone conversion block with heading + button
- **Footer**: Brand info, links, unsubscribe. Present in every email.

### Canvas Awareness
- Check what already exists on the canvas before generating
- Place new email designs in empty canvas space — do NOT overlap existing content
- Use `find_empty_space_on_canvas` or equivalent to determine placement

### CTA Button Rules
- Use the brand's primary/accent color for CTA backgrounds
- Ensure sufficient contrast between button text and button fill (WCAG AA minimum)
- Button text: short, action-oriented (2-5 words). Examples: "Shop Now", "Learn More", "Get Started"
- Button padding: generous horizontal padding for click targets
- Round corners slightly (4-8px radius)

### Typography
- Match the brand's voice description in all copy
- Headlines: bold, large, attention-grabbing
- Body text: readable size (14-16px), adequate line height (1.4-1.6)
- Use font weight and size variation to create hierarchy, not just color

### Mobile Considerations
- 600px width is the standard — designs should look good at this width
- Ensure text is readable without zooming
- Buttons should be large enough to tap (minimum 44px height)
- Stack multi-column layouts vertically for narrow screens

---

## Brand Kit Application Rules

This section teaches you how to turn ANY brand kit (a set of colors and fonts) into a complete email design system.

### Color Role Mapping
Given a brand kit with named colors (primary, secondary, accent, background, text), assign design roles:

- **CTA buttons**: Use the accent or primary color for maximum contrast
- **Headings**: Use primary or a dark variant of the brand palette
- **Body text**: Use the text color or a near-black tone
- **Section backgrounds**: Alternate between white, the background color, and very light tints (5-10% opacity) of the primary/secondary
- **Links**: Use the accent color
- **Dividers/borders**: Use a very light tint of the text color (10-20% opacity)
- **If a role has no obvious mapping**: Derive it. Lighten or darken existing colors. Use the background color family for subtle fills.

### Typography Scale
Given a brand kit with 2 font families (heading + body), build a complete type hierarchy:

| Role | Font | Size Range | Weight |
|------|------|-----------|--------|
| Hero headline | Heading font | 28-40px | Bold (700) |
| Section title | Heading font | 22-28px | Bold or Semi-bold (600-700) |
| Item title | Heading font | 18-22px | Semi-bold (600) |
| Body text | Body font | 14-16px | Regular (400) |
| Small/caption | Body font | 11-13px | Regular (400) |
| CTA button label | Body font | 14-16px | Bold (700) |

Line heights: 1.2 for headlines, 1.4-1.6 for body text, 1.0 for buttons.

### Spacing System
Establish consistent spatial rhythm:

- **Section gap** (between major sections): 32-48px
- **Internal padding** (within a section): 24-32px horizontal, 24-40px vertical
- **Item spacing** (between items in a list/grid): 16-24px
- **Heading-to-body gap**: 8-12px
- **CTA button padding**: 12-16px vertical, 24-40px horizontal

### Contrast and Accessibility
- Text on backgrounds must have at least 4.5:1 contrast ratio (WCAG AA)
- CTA button text on button fill must have at least 4.5:1 contrast ratio
- If a brand color fails contrast, lighten/darken until it passes
- Never use light text on light backgrounds or dark text on dark backgrounds
```

- [ ] **Step 2: Verify the file is importable**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors (the `?raw` import should work with Vite's raw asset handling)

- [ ] **Step 3: Commit**

```bash
git add src/data/email-guidelines.md
git commit -m "feat(m5): add email design principles and brand kit application rules"
```

---

### Task 11: Email Section Definitions (spec 5.3.3)

**Files:**
- Create: `src/data/email-sections.md`

**Context:** Layer 3 of the system prompt. Vocabulary document defining 6 section types + header/footer. Each definition has purpose, structural pattern, variations, and campaign hints. Plus one email composition walkthrough. NOT a template library — teaches building blocks for original compositions.

- [ ] **Step 1: Write the section definitions**

```markdown
<!-- src/data/email-sections.md -->
## Email Section Definitions

This document defines the building blocks of email designs. Use these definitions to understand what each section type IS, create original compositions, and adapt them to any campaign type.

---

### Header
**Purpose:** Brand identification. First thing the reader sees. Sets brand context.
**Structure:** Centered brand logo. Optional: navigation links (minimal, 2-3 max). Background: white or brand background color.
**Present in:** Every email.

### Hero
**Purpose:** First visual anchor. Grabs attention and sets the email's tone. The single most impactful visual region.
**Structure:** Large frame spanning full width (600px). Contains: headline, optional subheadline, optional image/illustration, optional CTA button.
**Variations:**
1. **Image-dominant**: Full-width background image with overlaid text
2. **Split**: Image on one side, text + CTA on the other (50/50 or 60/40)
3. **Text-forward**: Large typography with minimal imagery, strong color background
4. **Minimal**: Clean white background, centered headline and CTA
**Campaign hints:**
- Sales: Bold, urgent. Countdown timer feel. High contrast CTA.
- Educational: Friendly, inviting. Illustration or icon-based.
- Community: Warm, personal. Photo of people or behind-the-scenes.
- Product: Product image as the hero. Clean, aspirational.

### Bridge
**Purpose:** Transitional element between major sections. Provides breathing room and context shift.
**Structure:** Short text block (1-2 sentences) or a visual divider. Low visual weight.
**Variations:**
1. **Text bridge**: A single sentence or question that transitions between topics
2. **Divider bridge**: A horizontal line, icon, or decorative element
3. **Stats bridge**: 2-3 key numbers/metrics displayed inline
**Campaign hints:**
- Sales: "Here's why this matters..." or urgency text
- Educational: Question or curiosity hook
- Community: Personal aside or transition phrase

### Product
**Purpose:** Showcase one or more products/items with details.
**Structure:** Product image + title + description + optional price + optional CTA per item.
**Variations:**
1. **Single feature**: One large product image with full description beside it
2. **Grid (2-column)**: Two products side-by-side, each with image + title + CTA
3. **List**: Vertical stack of product cards, each with horizontal image + text layout
4. **Catalog strip**: 3-4 small product thumbnails in a row (minimal text)
**Campaign hints:**
- Sales: Price + discount prominent. "Was/Now" pattern.
- Product highlights: Feature callouts. Benefit-oriented descriptions.

### Photo-gallery
**Purpose:** Image-forward section for visual storytelling. Lets images speak.
**Structure:** Multiple images arranged in a grid or masonry-like pattern.
**Variations:**
1. **Grid (2x2)**: Four equal-sized images in a grid
2. **Feature + supporting**: One large image with 2-3 smaller images below
3. **Strip**: Horizontal row of 3-4 images (equal width)
4. **Before-after**: Two images side-by-side with labels
**Campaign hints:**
- Community: Behind-the-scenes photos, team shots
- Social proof: Customer photos, user-generated content
- Product: Lifestyle shots showing product in use

### Testimonial
**Purpose:** Social proof. Build trust through third-party validation.
**Structure:** Quote text + attribution (name, title/company, optional photo).
**Variations:**
1. **Single spotlight**: One large quote with customer photo
2. **Multi-quote**: 2-3 shorter quotes stacked or in columns
3. **Star rating**: Quote preceded by star rating display
4. **Before-after**: Customer story with outcome metrics
**Campaign hints:**
- Social proof: Lead with the testimonial — it IS the campaign
- Sales: Brief, results-focused quote that supports the offer
- Community: Longer, story-driven testimonial

### CTA (Call-to-Action)
**Purpose:** Standalone conversion block. Clear, focused action request.
**Structure:** Heading + optional supporting text + prominent CTA button. Minimal distractions.
**Variations:**
1. **Standard**: Heading + button on colored background
2. **Urgency**: Heading + countdown/scarcity text + button
3. **Double CTA**: Primary button + secondary text link (for two-track responses)
**Campaign hints:**
- Sales: Urgent language, bold colors, scarcity messaging
- Educational: Soft CTA ("Read the full guide", "Start learning")
- Product: Direct ("Shop now", "Pre-order today")

### Footer
**Purpose:** Brand info, legal compliance, and secondary navigation. Present in every email.
**Structure:** Company name/address, social links, unsubscribe link, optional secondary links.
**Present in:** Every email.

---

## Email Composition Walkthrough

When composing a full email, follow this process:

1. **Plan section order** based on the campaign type and user request:
   - Sales: Hero → Product(s) → Testimonial (optional) → CTA → Footer
   - Educational: Hero → Bridge → Content sections → CTA → Footer
   - Community: Hero → Bridge → Photo-gallery or Testimonial → CTA → Footer
   - Product highlights: Hero → Product(s) → Photo-gallery (optional) → CTA → Footer
   - Social proof: Hero → Testimonial(s) → Bridge → CTA → Footer

2. **Build the layout skeleton** — create the frame hierarchy with correct sizing, spacing, and background colors BEFORE filling in content.

3. **Fill with brand-specific content** — apply brand colors, fonts, and voice to each section. Use the brand kit application rules.

4. **Verify spacing and hierarchy** — check that visual weight decreases from top to bottom, spacing is consistent, and contrast ratios pass.
```

- [ ] **Step 2: Verify importable and commit**

Run: `cd kova-open-pencil-1 && bun run check`

```bash
git add src/data/email-sections.md
git commit -m "feat(m5): add email section definitions with composition walkthrough"
```

---

### Task 12: Image Handling Instructions (spec 5.3.4)

**Files:**
- Create: `src/data/image-handling.md`

**Context:** Layer 5 of the system prompt. Covers three scenarios: no images available (use placeholders), user attached images (dual-representation), brand has media library images (use via placeMediaImage).

- [ ] **Step 1: Write the image handling instructions**

```markdown
<!-- src/data/image-handling.md -->
## Image Handling

### When no images are available
Use colored rectangle placeholders with descriptive `name` properties:
- Use neutral gray (#E8E8E8) for placeholder backgrounds — never brand colors
- Name each placeholder descriptively so the user knows what to replace
- Example: Create a rectangle with name="Hero Image — Product Lifestyle Shot", width=600, height=400, fill="#E8E8E8"
- Size placeholders appropriately for the section type (hero: full width, product: square or 4:3)

### When the user attaches images
Attached images appear in the message with metadata:
`[Attached image: "filename.jpg" (WxHpx) — public_url: <url> — media_id: <uuid>]`
or
`[Attached image: "filename.jpg" (WxHpx) — signed_url: <url> — attachment_id: <uuid>]`

You can SEE the image (it's included as a vision input). Use this to make design decisions about placement, sizing, and color coordination.

To PLACE the image on the canvas:
1. Create a frame or rectangle for the image container
2. Call `placeMediaImage(node_id, url, "FILL")` with the URL from the metadata
3. Never use the base64 vision copy for placement — always use the URL (full-res asset)

### When the brand has media library images
The system prompt includes available images with filenames, dimensions, and URLs.
- Check if any available images are relevant to the current design request
- Use contextually appropriate images (don't force irrelevant images)
- Place them via `placeMediaImage(node_id, public_url)` using the public URL from the list
- Size containing frames based on the image's dimension metadata

### Rules
- **Never** use external URLs — only `public_url` from media library or `signed_url` from chat attachments
- **Never** fabricate or guess URLs. If no URL is provided, use a placeholder rectangle.
- Previously attached images remain available by ID in subsequent turns
- Size containing frames based on image dimension metadata when available
```

- [ ] **Step 2: Commit**

```bash
git add src/data/image-handling.md
git commit -m "feat(m5): add image handling instructions for system prompt"
```

---

### Task 13: Load Campaign Guides into System Prompt (spec 5.3.5)

**Files:**
- Modify: `src/ai/build-system-prompt.ts` (already handles this via `CAMPAIGN_GUIDE_MODULES`)
- Verify: `src/data/campaigns/*.md` (already exist)

**Context:** The campaign guide loading is already implemented in Task 9's `buildSystemPrompt()` via the `CAMPAIGN_GUIDE_MODULES` dynamic imports. This task verifies the existing campaign guide files are compatible and flags them for user QA.

- [ ] **Step 1: Verify existing campaign guide files**

Run: `ls -la kova-open-pencil-1/src/data/campaigns/`
Expected: `educational.md`, `community-branded.md`, `sales.md`, `social-proof.md`, `product-highlights.md`

- [ ] **Step 2: Read each file to verify structure**

Each campaign guide should provide actionable design guidance for that campaign type. Flag any that are placeholder or insufficient for user QA review.

- [ ] **Step 3: Verify dynamic import works**

Run: `cd kova-open-pencil-1 && bun test tests/unit/ai/build-system-prompt.test.ts`
Expected: PASS (the `campaignType: 'sales'` test should load the sales guide)

- [ ] **Step 4: Commit (if any adjustments needed)**

```bash
git add src/ai/build-system-prompt.ts
git commit -m "feat(m5): verify campaign guide loading in buildSystemPrompt"
```

---

### Task 14: Brand Memory System (spec 5.3.6)

**Files:**
- Create: `supabase/migrations/20260401_m5_brand_memories.sql`
- Create: `src/stores/brand-memories.ts`
- Create: `src/data/memory-instructions.md`
- Modify: `src/ai/kova-tools.ts` (add `saveBrandMemory`)
- Test: `tests/unit/stores/brand-memories.test.ts`

**Context:** Brand memory is the ONLY persistent layer crossing chat boundaries. Five components: DB table, Pinia store, AI tool, system prompt instructions, injection into buildSystemPrompt. The AI auto-detects things worth remembering (like ChatGPT Memory) and users can explicitly request saves.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260401_m5_brand_memories.sql
-- M5: Brand memories — persistent per-brand facts

CREATE TABLE IF NOT EXISTS public.brand_memories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('auto', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_memories_select ON public.brand_memories FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY brand_memories_insert ON public.brand_memories FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY brand_memories_update ON public.brand_memories FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY brand_memories_delete ON public.brand_memories FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_brand_memories_brand
  ON public.brand_memories(brand_id, user_id);
```

- [ ] **Step 2: Write failing tests for brand memories store**

```typescript
// tests/unit/stores/brand-memories.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

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
  brand_id: 'b1',
  user_id: 'user-1',
  content: 'CTAs should always use coral (#FF6B6B)',
  source: 'auto',
  created_at: '2026-04-01T00:00:00Z',
}

describe('brand-memories store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as any
  })

  test('fetchMemories loads memories for a brand', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [sampleMemory], error: null }),
        }),
      }),
    })

    const store = useBrandMemoriesStore()
    await store.fetchMemories('b1')
    expect(store.memories).toHaveLength(1)
    expect(store.memories[0].content).toBe('CTAs should always use coral (#FF6B6B)')
  })

  test('saveMemory creates a new memory', async () => {
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleMemory, error: null }),
        }),
      }),
    })

    const store = useBrandMemoriesStore()
    const result = await store.saveMemory('b1', 'CTAs should always use coral (#FF6B6B)', 'auto')
    expect(result.id).toBe('mem-1')
  })

  test('deleteMemory removes from state', async () => {
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    const store = useBrandMemoriesStore()
    store.memories = [sampleMemory]
    await store.deleteMemory('mem-1')
    expect(store.memories).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/brand-memories.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement brand memories store**

```typescript
// src/stores/brand-memories.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export interface BrandMemoryRecord {
  readonly id: string
  readonly brand_id: string
  readonly user_id: string
  readonly content: string
  readonly source: 'auto' | 'user'
  readonly created_at: string
}

export const useBrandMemoriesStore = defineStore('brand-memories', () => {
  const authStore = useAuthStore()
  const memories = ref<BrandMemoryRecord[]>([])

  async function fetchMemories(brandId: string): Promise<void> {
    const { data, error } = await supabase
      .from('brand_memories')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    memories.value = data ?? []
  }

  async function saveMemory(
    brandId: string,
    content: string,
    source: 'auto' | 'user'
  ): Promise<BrandMemoryRecord> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('brand_memories')
      .insert({ brand_id: brandId, user_id: userId, content, source })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to save memory')

    const record = data as BrandMemoryRecord
    memories.value = [...memories.value, record]
    return record
  }

  async function deleteMemory(memoryId: string): Promise<void> {
    const { error } = await supabase
      .from('brand_memories')
      .delete()
      .eq('id', memoryId)

    if (error) throw new Error(error.message)
    memories.value = memories.value.filter((m) => m.id !== memoryId)
  }

  async function updateMemory(memoryId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('brand_memories')
      .update({ content })
      .eq('id', memoryId)

    if (error) throw new Error(error.message)
    memories.value = memories.value.map((m) =>
      m.id === memoryId ? { ...m, content } : m
    )
  }

  return { memories, fetchMemories, saveMemory, deleteMemory, updateMemory }
})
```

- [ ] **Step 5: Add `saveBrandMemory` AI tool to `kova-tools.ts`**

```typescript
// In src/ai/kova-tools.ts, add to createKovaTools():

const saveBrandMemory = tool({
  description:
    'Save a persistent memory about this brand. Use this when you detect durable preferences, constraints, or design decisions. Also use when the user explicitly says "remember this". The memory will apply to ALL future design sessions for this brand.',
  parameters: valibotSchema(
    v.object({
      content: v.pipe(v.string(), v.description('The fact or preference to remember')),
      source: v.pipe(
        v.picklist(['auto', 'user']),
        v.description("'auto' if you detected this, 'user' if they explicitly asked")
      ),
    })
  ),
  execute: async ({ content, source }) => {
    try {
      // brandId comes from the active brand context (injected at tool creation)
      const { useBrandMemoriesStore } = await import('@/stores/brand-memories')
      const store = useBrandMemoriesStore()
      const brandId = activeBrandId // passed via closure from createKovaTools
      if (!brandId) return { error: 'No active brand' }

      await store.saveMemory(brandId, content, source)
      return { success: true, message: `Memory saved: "${content}"` }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to save memory' }
    }
  },
})

return { placeMediaImage, saveBrandMemory }
```

Update `createKovaTools` signature to accept `brandId`:

```typescript
export function createKovaTools(store: EditorStore, activeBrandId: string | null) {
```

- [ ] **Step 6: Write memory instructions**

```markdown
<!-- src/data/memory-instructions.md -->
## Brand Memory Instructions

You have a `saveBrandMemory` tool. Use it to persist important facts about this brand.

### When to auto-save (source: 'auto')
Detect durable preferences, constraints, or decisions:
- "I always want..." / "Never use..." / "Our CTAs should be..."
- Recurring corrections (if the user corrects you twice about the same thing, save it)
- Design decisions that should persist: color preferences, layout rules, voice notes

Do NOT save:
- One-off requests ("make this bigger")
- Conversation filler
- Facts already in the brand kit (colors, fonts — those are already in context)

### When to save on request (source: 'user')
- "Remember this" / "Save this" / "Keep this in mind for next time"

### After saving
Tell the user what was saved. Example:
"I've saved a memory for [Brand Name]: 'CTAs should always use coral (#FF6B6B).' This will apply to all future design sessions."

### Conflict handling
If a new memory contradicts an existing one in the Brand Memories section, flag the conflict and ask the user which to keep before saving.
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/brand-memories.test.ts`
Expected: PASS

- [ ] **Step 7b: Register `saveBrandMemory` in `tools.ts`**

In `src/ai/tools.ts`, update `createAITools` to pass `activeBrandId` to `createKovaTools` and merge the result. The `activeBrandId` should be read from the brands store at tool creation time (tools are recreated per `createTransport()` call, so this captures the current brand):

```typescript
import { createKovaTools } from '@/ai/kova-tools'
import { useBrandsStore } from '@/stores/brands'

export function createAITools(store: EditorStore) {
  const brandsStore = useBrandsStore()

  // ... existing CORE_TOOLS setup ...
  const coreResult = toolsToAI(CORE_TOOLS, { /* existing callbacks */ }, { v, valibotSchema, tool })

  const kovaTools = createKovaTools(store, brandsStore.selectedBrandId)

  return { ...coreResult, ...kovaTools }
}
```

- [ ] **Step 8: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260401_m5_brand_memories.sql src/stores/brand-memories.ts src/ai/kova-tools.ts src/ai/tools.ts src/data/memory-instructions.md tests/unit/stores/brand-memories.test.ts
git commit -m "feat(m5): add brand memory system with AI tool, store, and instructions"
```

---

### Task 15: Context Window Management (spec 5.3.7)

**Files:**
- Modify: `src/composables/use-chat.ts`

**Context:** Two Vercel AI SDK mechanisms: (1) `prepareStep` sliding window — keeps last N message pairs in API payload, drops older ones; (2) `pruneMessages` — strips verbose tool results from older turns, replaces with compact summaries. Both only affect what's sent to the API — ChatPopup still shows full history.

- [ ] **Step 1: Add configuration constants**

```typescript
// In src/composables/use-chat.ts (or a new constants file):
const CHAT_HISTORY_WINDOW_SIZE = 20 // message pairs
const TOOL_RESULT_RETAIN_TURNS = 1  // recent turns to keep full tool results
```

- [ ] **Step 2: Implement `prepareStep` sliding window**

Add to the `ToolLoopAgent` configuration in `createTransport()`:

```typescript
prepareCall: (options) => {
  resetRunSteps()

  // Sliding window: keep last N message pairs, but NEVER split mid-tool-loop.
  // The spec requires: "All messages within current tool-calling loop (never trim mid-generation)."
  const messages = options.messages ?? []
  const maxMessages = CHAT_HISTORY_WINDOW_SIZE * 2 // pairs → individual messages

  let trimmedMessages = messages
  if (messages.length > maxMessages) {
    // Start at the proposed cutoff point
    let cutIndex = messages.length - maxMessages

    // Walk forward from cutoff to find a safe boundary:
    // A safe boundary is the start of a complete user turn (role === 'user')
    // that is NOT preceded by an incomplete tool-calling sequence.
    // In practice: find the next 'user' role message at or after cutIndex.
    while (cutIndex < messages.length) {
      const msg = messages[cutIndex] as { role: string }
      if (msg.role === 'user') break
      cutIndex++
    }

    trimmedMessages = cutIndex < messages.length
      ? messages.slice(cutIndex)
      : messages // fallback: keep all if no safe boundary found
  }

  return {
    ...options,
    messages: trimmedMessages,
    maxOutputTokens: maxOutputTokens.value,
    providerOptions: cacheProviderOptions,
  }
}
```

**Why:** A naive `slice(-N)` can sever a tool call from its result, causing API errors. By walking forward to the next complete user turn, we ensure tool-calling loops are never split.

- [ ] **Step 3: Implement tool result pruning**

Add a utility function that replaces verbose tool results in older messages with compact summaries:

```typescript
function pruneToolResults(
  messages: Array<Record<string, unknown>>,
  retainTurns: number
): Array<Record<string, unknown>> {
  // Find the index of the Nth-from-last assistant message
  let assistantCount = 0
  let pruneBeforeIndex = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    if ((messages[i] as { role: string }).role === 'assistant') {
      assistantCount++
      if (assistantCount > retainTurns) {
        pruneBeforeIndex = i + 1
        break
      }
    }
  }

  return messages.map((msg, index) => {
    if (index >= pruneBeforeIndex) return msg

    // For older messages, replace tool results with compact summaries
    const parts = (msg as { parts?: Array<Record<string, unknown>> }).parts
    if (!parts) return msg

    const prunedParts = parts.map((part) => {
      if (part.type === 'tool-invocation' && part.state === 'result') {
        const toolName = part.toolName as string
        const result = part.result as Record<string, unknown>
        const status = result?.error ? `error: ${result.error}` : 'success'
        return {
          ...part,
          result: { summary: `[Tool: ${toolName} — ${status}]` },
        }
      }
      return part
    })

    return { ...msg, parts: prunedParts }
  })
}
```

Integrate into `prepareCall` alongside the sliding window.

- [ ] **Step 4: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/composables/use-chat.ts
git commit -m "feat(m5): add context window management with sliding window and tool result pruning"
```

---

## Chunk 5: Phase 5.4 — Media Library Integration + Final Integration

### Task 16: Pass Available Images to System Prompt (spec 5.4.1)

**Files:**
- Modify: `src/composables/use-chat.ts`
- Modify: `src/stores/media.ts`

**Context:** When building the system prompt, fetch the current brand's media library images. Format each with filename, dimensions, public URL, and media ID. Limit to 20 most recent. Already handled by `buildSystemPrompt()` (Task 9) — this task wires the data fetching.

**Dependencies:** Requires Phase 5.3 complete + M4 media store with width/height.

- [ ] **Step 1: Add image list fetching before `buildSystemPrompt()` call**

In `use-chat.ts`, in the `ensureChat()` or transport creation flow, fetch media images:

```typescript
const mediaStore = useMediaStore()
const brandMemoriesStore = useBrandMemoriesStore()
const brandId = brandsStore.selectedBrandId

// Graceful degradation: if Supabase reads fail, omit the failed layer and proceed.
// The spec explicitly requires: "If fetchMemories() or mediaStore.fetchImages() fails,
// gracefully degrade by omitting the failed layer."
let availableImages: AvailableImage[] = []
let brandMemories: BrandMemory[] = []

if (brandId) {
  // Fetch images — degrade to empty list on failure
  try {
    await mediaStore.fetchImages(brandId)
    availableImages = mediaStore.images.map((img) => ({
      fileName: img.file_name,
      fileType: img.file_type,
      width: img.width,
      height: img.height,
      publicUrl: mediaStore.getPublicUrl(img.storage_path),
      mediaId: img.id,
    }))
  } catch (e) {
    console.error('[buildSystemPrompt] Failed to fetch images, omitting layer:', e)
  }

  // Fetch brand memories — degrade to empty list on failure
  try {
    await brandMemoriesStore.fetchMemories(brandId)
    brandMemories = brandMemoriesStore.memories.map((m) => ({
      id: m.id,
      content: m.content,
      source: m.source,
    }))
  } catch (e) {
    console.error('[buildSystemPrompt] Failed to fetch memories, omitting layer:', e)
  }
}

// Pass to buildSystemPrompt()
const systemPrompt = await buildSystemPrompt({
  brandProfile,
  availableImages,
  brandMemories,
  campaignType,
})
```

- [ ] **Step 2: Test with existing build-system-prompt tests**

Run: `cd kova-open-pencil-1 && bun test tests/unit/ai/build-system-prompt.test.ts`
Expected: PASS (the image test case already covers this path)

- [ ] **Step 3: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/composables/use-chat.ts
git commit -m "feat(m5): wire media library images into system prompt"
```

---

### Task 17: Final Integration & Verification

**Files:**
- All previously modified files

**Context:** Wire everything together and verify the complete flow works end-to-end. This is not a code task — it's a verification task.

- [ ] **Step 1: Run all unit tests**

Run: `cd kova-open-pencil-1 && bun run test:unit`
Expected: All tests pass

- [ ] **Step 2: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: No lint or type errors

- [ ] **Step 3: Run duplicate detection**

Run: `cd kova-open-pencil-1 && bun run test:dupes`
Expected: Under 3% duplication

- [ ] **Step 4: Manual smoke test**

Run: `cd kova-open-pencil-1 && bun run dev`

Verify:
1. Chat popup appears in editor (minimized bar at bottom-left)
2. Clicking expands the popup
3. Prompt chips appear in empty state
4. Clicking a chip sends a message
5. Message streams back from AI (via proxy)
6. Chat tab bar works (new tab, switch tabs)
7. Messages persist across page refresh
8. Brand memory saves when AI detects preferences
9. Images can be attached from media library
10. `placeMediaImage` places images on canvas

- [ ] **Step 5: Final commit with all integration adjustments**

```bash
# Stage only the specific files modified during integration (review git status first)
git status
# Then add specific modified files — never use git add -A
git commit -m "feat(m5): complete AI email generation engine integration"
```

---

## Dependency Graph (Execution Order)

```
PARALLEL WAVE 1 (no dependencies):
  Task P1 (image processing) ─────────────────────────┐
  Task P2 (media width/height) ────────────────────────┤
  Task P3 (chat attachments) ──────────────────────────┤
  Task 1  (API proxy) ────────────────────────────────┤
  Task 6  (placeMediaImage tool) ──────────────────────┤
  Task 10 (email design principles) ──────────────────┤
  Task 11 (email section definitions) ─────────────────┤
  Task 12 (image handling instructions) ───────────────┘

WAVE 2 (depends on Wave 1):
  Task 2  (route through proxy) ← Task 1
  Task 3  (chat persistence) ← (no strict deps, but logically before UI)
  Task 9  (buildSystemPrompt) ← Tasks 10, 11, 12

WAVE 3 (depends on Wave 2):
  Task 4  (chat popup) ← Task 3
  Task 5  (prompt chips) ← Task 4
  Task 7  (wire popup into editor) ← Task 4
  Task 13 (campaign guides) ← Task 9
  Task 14 (brand memory) ← Task 9
  Task 15 (context window) ← Task 9

WAVE 4 (depends on Wave 3):
  Task 8  (image attachment) ← Tasks P1, P3, 4, 6
  Task 16 (media library to prompt) ← Tasks P2, 9

WAVE 5 (depends on everything):
  Task 17 (integration verification) ← all tasks
```

**Maximum parallelism:** 8 tasks in Wave 1, reducing to 3-4 in subsequent waves.
