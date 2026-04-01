# M5: AI Email Generation Engine — Design Spec

**Date:** 2026-03-28
**Status:** Draft
**Milestone:** M5
**Depends on:** M1 (Auth), Phase 4.1 (Brand Kit), M4 media library (for image features)
**Duration:** Weeks 4-7

## 1. Purpose

Transform OpenPencil's generic AI design assistant into Kova's email-specific generation engine. This is the highest-leverage milestone — it is the core product.

This milestone delivers:
- A server-side API proxy that keeps the Anthropic key secret and enforces rate limits
- A floating chat popup (Pencil.dev-style) with multi-tab support and persistent history
- A dynamic system prompt that assembles email design principles, brand kit context, section definitions, image handling, campaign guides, and brand memories into a coherent instruction set
- An image transport pipeline with dual-representation (vision copy for Claude, full-res URL for canvas placement)
- A brand memory system — persistent per-brand facts that cross chat boundaries (like ChatGPT's Memory)
- Context window management to keep long conversations performant

**What M5 does NOT include:** AI quality engineering (M5.5), template analysis, prompt iteration, or output quality benchmarking. Those are a separate milestone.

## 2. Design Decisions

10 decisions were made across two brainstorming sessions. These are the foundational product and architecture choices that shaped every task in this spec.

| # | Decision | Summary |
|---|----------|---------|
| 1 | Chat history architecture | Independent, disposable chat tabs per canvas. Supabase persistence. No cross-tab history. |
| 2 | Brand memory system | One flat memory list per brand. Auto-populated by AI + explicit user saves. Only cross-chat persistent layer. |
| 3 | No cross-chat context | Nothing crosses chat boundaries except brand memory + canvas state. No conversation sharing. |
| 4 | Context window management | `prepareStep` sliding window + `pruneMessages` tool result stripping. Per-chat scoping is the primary bound. |
| 5 | Canvas correction | One canvas = a workspace with multiple email designs (like a Figma file with multiple frames). |
| 6 | Image transport | Dual-representation: vision copy (base64 JPEG) + storage URL (full-res). Two buckets: public `media-assets`, private `chat-attachments`. |
| 7 | Principles-based AI design | AI generates original designs from principles, NOT from templates. Informed by Pencil.dev and v0 research. |
| 8 | Brand kit application rules | A "bridge layer" that teaches the AI how to turn any brand kit (5 colors, 2 fonts) into a complete email design system. |
| 9 | Email section types | 6 section types: Hero, Bridge, Product, Photo-gallery, Testimonial, CTA. Plus header + footer as defaults in every email. |
| 10 | Figma templates as study material | Monkey Flow and Mix & Match templates are studied in M5.5 to extract principles, never shown to the AI directly. |

### Decision Details

**Decision 1 — Chat History Architecture:**
A canvas can have multiple chats (like Pencil.dev's Cmd+T for new chat tabs). Each chat starts fresh — it reads the canvas to see what's on it, but carries zero history from other chats. Chat history persists within its own tab (close browser, reopen, chat is still there). Chat history never bleeds into other tabs. Stored in Supabase with RLS (every B2C SaaS with AI chat does this: Figma AI, v0, Lovable, Pencil.dev).

**Decision 2 — Brand Memory System:**
Brand memory is auto-populated by the AI (like ChatGPT's Memory) — the AI detects things worth remembering and saves them automatically, indicating to the user what it saved. Users can also explicitly say "remember this." Memory is injected into the system prompt for ALL chats across ALL canvases for that brand. No categorization by source — flat brand-level facts. Memory types: user preferences ("I always want the logo top-left"), design decisions ("CTAs should be 48px tall"), brand voice notes, campaign context.

**Decision 3 — No Cross-Chat Context:**
Nothing crosses chat boundaries except brand memory + canvas state. The AI's context in any chat = system prompt + brand memory + brand kit + canvas state + that chat's own messages. This prevents context window bloat and keeps things simple.

**Decision 4 — Context Window Management:**
OpenPencil currently has zero context management (sends entire history every call). The Vercel AI SDK provides `prepareStep` (sliding window) and `pruneMessages` (strip old tool results) — neither currently wired up. For MVP: implement both. Per-chat scoping (Decision 1) naturally bounds context since each chat is a focused design session.

**Decision 5 — Canvas Correction:**
One canvas is NOT one email design. One canvas = a workspace that can contain multiple email designs (like a Figma file with multiple frames). The AI reads canvas state to see all designs on it.

**Decision 6 — Image Transport:**
All images go through Supabase Storage as the single source of truth. Two buckets: `media-assets` (public, permanent, user-curated brand assets) and `chat-attachments` (private, ephemeral, signed URLs with 24h expiry). Claude receives a compressed vision copy for understanding and a storage URL for canvas placement via `placeMediaImage`. Multi-turn image stripping via `wrapLanguageModel()` middleware prevents resending base64 on every API call.

**Decision 7 — Principles-Based AI Design (Most Significant):**
The AI generates original email designs every time, not copies from templates. Competitive research:
- **Pencil.dev** uses design principles (`get_guidelines`) + design tokens/aesthetic direction (`get_style_guide`). No templates. The AI creates original designs from principles + tokens.
- **v0 by Vercel** uses shadcn/ui component registry as a "parts catalog" (not templates) + semantic design tokens + strict rules. Few-shot examples are structural (file format, import patterns), not visual design examples.

The founder explicitly decided: "I don't want those templates to define the output... the AI just rotates and chooses the template" is exactly what Kova avoids. The output should be refined and changed to the request of the user and to the unique situation.

**Decision 8 — Brand Kit Application Rules ("Bridge Layer"):**
Pencil.dev's style guide provides a complete design system (color roles, full typography scale, spacing system). Kova's brand kit only provides raw ingredients (5 colors, 2 fonts). The bridge layer (Task 5.3.2) teaches the AI how to turn any brand kit into a complete email design system — mapping colors to design roles, building a type hierarchy from 2 fonts, establishing spacing rhythm.

**Decision 9 — Email Section Types:**
Six section types: Hero, Bridge, Product, Photo-gallery, Testimonial, CTA. Plus header (brand logo, centered) and footer (brand info, links, unsubscribe) as defaults in every email.

**Decision 10 — Figma Templates as Study Material:**
The founder has Monkey Flow templates (full email designs, visually useful but structurally unorganized) and Mix & Match templates (individual sections, more organized but basic). These are NOT used as output templates. They are studied in M5.5 to extract structural observations that refine section definitions and email design principles. The AI never sees the templates directly.

## 3. Architecture Overview

**16 tasks across 4 phases. Estimated ~25 new files, ~15 modified files.**

### Phase 5.1 — API Proxy (2 tasks)

| Task | Description |
|------|-------------|
| 5.1.1 | Build Anthropic API Proxy — serverless function with auth, rate limiting, streaming |
| 5.1.2 | Route AI Requests Through Proxy — rewire chat composable |

### Phase 5.2 — Chat Popup UI (6 tasks)

| Task | Description |
|------|-------------|
| 5.2.1 | Build Chat Popup Container — floating bottom popup, minimized/expanded states |
| 5.2.2 | Add Example Prompt Chips — 5 campaign-type chips for empty state |
| 5.2.3 | Add Image Attachment in Chat — dual-path (media library + clipboard), dual-representation |
| 5.2.4 | Wire Chat Popup into Editor View — replace sidebar, auto-open logic |
| 5.2.5 | Create `placeMediaImage` Tool — Kova-layer wrapper for URL-to-base64-to-canvas |
| 5.2.6 | Chat Persistence Infrastructure — conversations + messages tables, Pinia store, multi-tab |

### Phase 5.3 — Dynamic System Prompt (7 tasks)

| Task | Description |
|------|-------------|
| 5.3.1 | Create `buildSystemPrompt` Function — 8-layer assembly (layers 6a/6b mutually exclusive) |
| 5.3.2 | Email Design Principles & Brand Kit Application Rules — structural rules + bridge layer |
| 5.3.3 | Email Section Definitions — vocabulary document for 6 section types |
| 5.3.4 | Image Handling Instructions — placeholder, attached, and media library scenarios |
| 5.3.5 | Load Campaign Guides into System Prompt — guided (chip) + inferred (free-form) paths |
| 5.3.6 | Brand Memory System — table, store, AI tool, prompt instructions, injection |
| 5.3.7 | Context Window Management — `prepareStep` sliding window + `pruneMessages` |

### Phase 5.4 — Media Library Integration (1 task)

| Task | Description |
|------|-------------|
| 5.4.1 | Pass Available Images to System Prompt — structured list with URLs, 20-image limit |

### M4 Prerequisites (from PRD v5 — not M5 tasks, but M5 depends on them)

| Task | Description |
|------|-------------|
| 4.2.1 enhancement | Image processing pipeline + vision copy generation |
| 4.2.2 enhancement | Add width/height columns to media table |
| 4.2.5 (new) | Chat Attachments Storage Infrastructure — table + private bucket |

## 4. Task Details

### Phase 5.1: API Proxy

#### 5.1.1 Build Anthropic API Proxy

**Files:** `api/ai-proxy/v1/messages.ts` (new — Vercel serverless function) or catch-all at `api/ai-proxy/[...path].ts`

A serverless function that:
1. Validates the Supabase auth session (JWT from request headers)
2. Extracts user ID from session, checks `users` table for `generations_used` and `generations_reset_at`
3. **Generation limit: 200 API calls per user per day.** If limit hit and reset date is today: return 429 with `{ "error": "Daily limit reached. Your limit resets at midnight UTC.", "retry_after": <seconds_until_midnight_utc> }`. If reset date is past: reset counter and proceed.
4. Injects `ANTHROPIC_API_KEY` from server environment (NOT `VITE_` prefixed)
5. Forwards request body to Anthropic API (`/v1/messages`)
6. Streams the response back (SSE)
7. On completion, increments `generations_used`
8. **Request body size validation** (from PRD v5): If body exceeds 4MB (leaving 0.5MB headroom for Vercel's 4.5MB limit), return 413 with `"Message too large. Try attaching fewer images."`
9. **Image passthrough:** Base64 vision images (pre-compressed to ≤1MB JPEG) are included inline in messages. The proxy forwards them as-is — no storage, caching, or processing.

Error handling: invalid session → 401, limit hit → 429 (user-friendly), body too large → 413, API error → 502.

**Route path note:** `@ai-sdk/anthropic` automatically appends `/v1/messages` to `baseURL`. Setting `baseURL: '/api/ai-proxy'` means requests hit `POST /api/ai-proxy/v1/messages`.

**Parallel:** yes

#### 5.1.2 Route AI Requests Through Proxy

**Files:** `src/composables/use-chat.ts`

Modify the chat composable to route all AI requests through `/api/ai-proxy` instead of directly to Anthropic. Remove local API key storage logic (`localStorage` key reads). Hard-code provider to Anthropic. Default model: `claude-sonnet-4-6`. Add developer-only model toggle via `VITE_AI_MODEL` env var (defaults to `claude-sonnet-4-6`, can be set to `claude-opus-4-6`). Not user-facing — for QA testing model output quality. Include Supabase auth token in request headers. Verify streaming works through proxy.

**Parallel:** no (depends on 5.1.1)

---

### Phase 5.2: Chat Popup UI

#### 5.2.1 Build Chat Popup Container

**Files:** `src/components/chat/ChatPopup.vue` (new)

Floating popup anchored to the bottom of the editor view. Two states:
- **Minimized:** Thin bar at the bottom. Shows placeholder text "Design with Kova AI...", generation count indicator, attachment icon, send button. Click to expand.
- **Expanded:** Popup rises from bottom-left (~400px wide, ~500px tall). Contains: chat message history (scrollable), example prompt chips (when empty), chat tab bar (multiple conversations), input field at bottom, model indicator (subtle). Close/minimize button collapses to minimized bar.

Popup overlays the canvas — does NOT push canvas or panels aside. CSS `position: fixed` or `absolute` with appropriate z-index.

**Chat tabs:** Tab bar at the top of the expanded popup showing all conversations for this canvas. "+" button creates a new conversation. Each tab shows the conversation title (auto-generated from first message, or user-editable). Active tab is highlighted. Switching tabs loads that conversation's messages.

**Parallel:** yes

#### 5.2.2 Add Example Prompt Chips

**Files:** `src/components/chat/ChatPopup.vue`

When chat history is empty, show five clickable prompt chips — one per campaign type:
1. "A tips-and-tricks email that teaches something useful" → `educational`
2. "Behind-the-scenes story about how we started" → `community`
3. "Flash sale with a countdown and bold CTA" → `sales`
4. "Customer testimonial spotlight with before-and-after" → `social-proof`
5. "New product drop with hero image and feature callouts" → `product-highlights`

Clicking a chip populates the input and auto-submits, passing the mapped `campaignType` to the chat composable for `buildSystemPrompt()`. Chips disappear once there's history. Styled as rounded pill buttons.

**Parallel:** no (depends on 5.2.1)

#### 5.2.3 Add Image Attachment in Chat

**Files:** `src/components/chat/ChatPopup.vue`, `src/components/chat/ChatInput.vue`, `src/composables/use-chat-images.ts` (new)

**Source:** PRD v5 (replaces PRD v4 version)

An image icon button in the bottom-left of the chat input. Two attachment paths, both producing the same result:

**Path A — Media library picker:** Clicking the image icon opens the media library popup (from M4). Selecting an image attaches it. Already in Supabase Storage — no upload needed.

**Path B — Clipboard paste / drag-and-drop:** Paste images from clipboard or drag-and-drop files. When a non-library image is attached:
1. Run through image processing pipeline (resize to 4096px cap, preserve format)
2. Upload to `chat-attachments` bucket via `chatAttachmentsStore.uploadChatImage()`. Happens on attach, not on send — hides upload latency.
3. Create a `chat_attachments` record (NOT `media` — chat images don't appear in media library)
4. Show upload progress on thumbnail. Thumbnail appears immediately from local blob.

**Attachment display:** Thumbnails above the chat input with X to remove. Multiple images per message.

**Dual-representation per image:**
1. **Vision copy** (for Claude to *see*): Compressed JPEG ≤1500px, under 1MB. Generated client-side via `createVisionCopy()`. Sent as `FileUIPart` via Vercel AI SDK.
2. **Storage reference** (for Claude to *place* on canvas): Supabase URL + asset ID appended as structured metadata in user message text:
   - Media library: `[Attached image: "product-hero.jpg" (1800x1200px) — public_url: <url> — media_id: <uuid>]`
   - Chat attachment: `[Attached image: "screenshot.jpg" (1200x800px) — signed_url: <url> — attachment_id: <uuid>]`

**Multi-turn stripping:** On subsequent turns, images from previous turns must NOT be resent as base64. The `use-chat-images.ts` composable strips `FileUIPart` entries from all messages except the current one, replacing with text-only references.

**Critical:** Stripping must happen on EVERY API call, not just initial `sendMessage()`. The `ToolLoopAgent` manages multi-turn tool-calling loops — each round-trip resends full history. Implement via `wrapLanguageModel()` (from `ai` package) with `transformParams` middleware hook. This runs on every `doStream()` and `doGenerate()` call, including within tool-calling loops. Apply in `use-chat.ts` where the model is created.

**Parallel:** no (depends on 5.2.1, 5.2.5, 4.2.5)

#### 5.2.4 Wire Chat Popup into Editor View

**Files:** `src/views/EditorView.vue`

Replace existing chat sidebar/panel with ChatPopup. Auto-open (expanded) on new canvas with no content. Minimized by default on existing canvas with previous content. Reuse existing `ChatMessage.vue` for rendering. Remove/hide old Cmd+J sidebar toggle.

**Parallel:** no (depends on 5.2.1)

#### 5.2.5 Create `placeMediaImage` Tool

**Files:** `src/ai/kova-tools.ts` (new), `src/ai/tools.ts` (modify to register)

**Source:** PRD v5 (new task)

A Kova-layer AI tool that Claude calls to place images onto canvas nodes. Needed because core `setImageFill` (in `packages/core/`, read-only) only accepts base64 — not URLs.

```
placeMediaImage(node_id: string, image_url: string, scale_mode?: "FILL" | "FIT" | "CROP" | "TILE")
```

Implementation:
1. Fetch image from `image_url` (Supabase Storage URL) with `fetch(url, { signal: AbortSignal.timeout(10_000) })` — 10s timeout
2. Convert response to `ArrayBuffer` → base64
3. Call core `setImageFill` with node_id, base64 data, scale_mode
4. Return the result

**Validation:** Only accept URLs from Supabase Storage domain (`*.supabase.co/storage/`). Reject arbitrary external URLs (SSRF prevention).

**Error handling:** If fetch fails or times out, return clear error: "Failed to load image from [url]. Using a placeholder instead." Claude falls back to a placeholder rectangle.

Register in `src/ai/tools.ts` alongside existing tool definitions so `ToolLoopAgent` can invoke it.

**Parallel:** yes (parallel with 5.2.1, must complete before 5.2.3)

#### 5.2.6 Chat Persistence Infrastructure

**Files:** `supabase/migrations/20260328_m5_chat_persistence.sql` (new), `src/stores/chat.ts` (new), `src/types/kova/chat.ts` (new)

Chat history must persist across browser sessions. A canvas can have multiple independent chat tabs. See Data Model section (Section 6) for full schema.

**Pinia store (`src/stores/chat.ts`):**
- `fetchConversations(brandId, canvasId)` — Load all conversation tabs for a canvas
- `createConversation(brandId, canvasId)` — Create a new chat tab
- `deleteConversation(conversationId)` — Delete tab + messages (CASCADE)
- `fetchMessages(conversationId)` — Load messages for a tab
- `addMessage(conversationId, role, content, attachments?, toolCalls?)` — Persist a message
- `updateConversationTitle(conversationId, title)` — Update tab title

Active conversation's messages in reactive state. When switching tabs, fetch and swap. Only active tab's messages in memory.

**TypeScript types (`src/types/kova/chat.ts`):** `ChatConversation` and `ChatMessage` interfaces.

**Integration:** ChatPopup reads/writes this store. Tab bar maps 1:1 to `chat_conversations` rows. "+" creates conversation. Sending calls `addMessage()` for both user and assistant. On mount, calls `fetchConversations()`.

**No cross-tab leakage:** Each conversation is independent. AI receives ONLY that conversation's messages.

**Parallel:** no (depends on 5.2.1 — but migration can be written in parallel)

---

### Phase 5.3: Dynamic System Prompt

#### 5.3.1 Create `buildSystemPrompt` Function

**Files:** `src/composables/use-chat.ts`

Add `buildSystemPrompt(brandProfile, availableImages, brandMemories, campaignType?)` that assembles the AI's full instruction set. The assembly order (8 layers per invocation — layers 6a/6b are mutually exclusive):

1. **Existing `SYSTEM_PROMPT`** constant — word-for-word, unmodified
2. **Email design principles & brand kit application rules** (Task 5.3.2)
3. **Email section definitions** (Task 5.3.3)
4. **Active brand kit** (from Task 4.1.2 — colors, fonts, logo, writing style)
5. **Image handling instructions** (Task 5.3.4)
6a. **Campaign guide** (if `campaignType` provided): import and append the corresponding `.md` file
6b. **Fallback inference** (if no `campaignType`): "Analyze the user's request and infer which campaign type it most closely matches..." — only one of 6a/6b is included per invocation
7. **Brand memories** (Task 5.3.6 — persistent per-brand facts from previous chats)
8. **Available media library images** (Task 5.4.1 — structured list with URLs and dimensions)

**Error handling:** If `fetchMemories()` or `mediaStore.fetchImages()` fails (e.g., Supabase down), gracefully degrade by omitting the failed layer and proceeding. Log the error server-side. The AI can still function without memories or the image list — those layers are additive context, not critical.

Modify `createTransport()` to call `buildSystemPrompt()` instead of using the raw `SYSTEM_PROMPT` constant.

**Parallel:** 5.3.1 has no hard prerequisites — it can be coded in parallel with the content files (5.3.2, 5.3.3, 5.3.4) since it just imports them. However, it is the assembly hub that all other 5.3.x tasks either feed into or depend on, so it's listed separately from the parallel entry points.

#### 5.3.2 Email Design Principles & Brand Kit Application Rules

**Files:** `src/data/email-guidelines.md` (new)

A comprehensive section appended to the system prompt that serves two roles: (1) structural email design rules, and (2) the "bridge layer" teaching the AI how to turn any brand kit into a complete email design system.

**Part 1 — Structural Email Design Principles** (equivalent to Pencil.dev's `get_guidelines`):
- Email structure: vertical layouts, 600px wide, stacked sections
- Section types: Hero, Bridge, Product, Photo-gallery, Testimonial, CTA (plus header + footer defaults)
- Visual hierarchy rules (dominant region, decreasing visual weight)
- Canvas awareness: place new designs in empty canvas space, don't overlap existing content
- Writing style: match the brand's voice description
- CTA button rules (contrast, sizing, text patterns)
- Mobile considerations (600px standard width)

**Part 2 — Brand Kit Application Rules** (the "bridge layer" — equivalent to Pencil.dev's `get_style_guide`, generalized):
This section teaches the AI how to map any brand kit's 5 colors and 2 fonts into a complete email design system:
- **Color role mapping:** Which brand color maps to which design role (CTAs, headings, section backgrounds, body text, links, dividers, derived tints/shades). Rules for deriving missing roles.
- **Typography scale:** Building a complete type hierarchy (hero headline → section title → item title → body → small/caption → CTA label) from 2 font families. Size ranges, weight assignments, line height, letter spacing.
- **Spacing system:** Consistent spatial rhythm — section gaps, internal padding, item spacing, heading-to-body gaps, CTA button padding.
- **Contrast and accessibility:** Minimum contrast rules for text on backgrounds and CTA text on button fills.

**Important:** The actual specific rules (exact size ranges, spacing values, color mapping logic) are determined collaboratively with the user during execution — not hardcoded in advance. This content needs iterative refinement. In M5.5, principles will be refined using values extracted from analyzed Figma email templates.

**Parallel:** yes

#### 5.3.3 Email Section Definitions

**Files:** `src/data/email-sections.md` (new)

A vocabulary document that teaches the AI what each email section type IS — its purpose, structural pattern, common variations, and when to use it per campaign type. This is NOT a template library. The AI uses these definitions to understand the building blocks and create original compositions.

**Section types:**
1. **Hero** — First visual anchor, grabs attention, sets the email's tone
2. **Bridge** — Transitional element between major sections
3. **Product** — Product showcase (single or multi-column)
4. **Photo-gallery** — Image-forward section for visual storytelling
5. **Testimonial** — Social proof section with quotes and attribution
6. **CTA** — Standalone conversion block with heading + button

Plus **header** (brand logo, centered) and **footer** (brand info, links, unsubscribe) as defaults in every email.

**Each definition contains:**
- Name and purpose
- Structural pattern (frame hierarchy, layout direction, content slots)
- Common variations (3-5 ways this section can be composed differently)
- Design principles specific to this section
- Campaign type hints (how this section differs for sales vs. educational vs. community, etc.)

**Plus one email composition walk-through:** A description of the workflow for composing a full email — plan section order based on campaign type → build layout skeleton → fill with brand-specific content → verify spacing and hierarchy. Teaches the process, not specific code.

**This content needs iterative refinement. In M5.5, section definitions will be enriched with structural observations from the user's Figma email templates.**

**Parallel:** yes (parallel with 5.3.2)

#### 5.3.4 Image Handling Instructions

**Files:** `src/data/image-handling.md` (new), referenced by `buildSystemPrompt()`

**Source:** PRD v5 (replaces PRD v4 version)

Instructions appended to the system prompt covering three scenarios:

**When no images are available:** Use colored rectangle placeholders with descriptive `name` properties. Example: `<Rectangle name="Hero Image — Product Lifestyle Shot" w={600} h={400} bg="#E8E8E8" rounded={0} />`. Use neutral gray (#E8E8E8) for placeholders, never brand colors. Name descriptively so the user knows what to replace.

**When the user attaches images:** The message includes metadata: `[Attached image: "filename.jpg" (WxHpx) — storage_url: <url> — media_id: <uuid>]`. The AI can SEE the image content (vision input) to make design decisions. To PLACE it on canvas: create frame/rectangle → call `placeMediaImage(nodeId, url, "FILL")`. Never use the base64 vision copy for placement — use the URL (full-res asset).

**When the brand has media library images:** System prompt includes available images with filenames and dimensions. Check if any are relevant when generating. Use via `placeMediaImage` with public URLs. Only use contextually appropriate images.

**Rules:**
- Never use external URLs — only `public_url` from media library or `signed_url` from chat attachments
- Never fabricate or guess URLs. If no URL provided, use a placeholder rectangle.
- Size containing frames based on image dimension metadata
- Previously attached images remain available by ID in subsequent turns

**Parallel:** yes (parallel with 5.3.2, 5.3.3)

#### 5.3.5 Load Campaign Guides into System Prompt

**Files:** `src/composables/use-chat.ts`, `src/data/campaigns/*.md`

Two coexisting paths:

**Path 1 — Guided (prompt chip clicked):** Each chip maps to a campaign type. `buildSystemPrompt()` receives `campaignType` and imports the corresponding markdown file (e.g., `src/data/campaigns/sales.md`).

**Path 2 — Inferred (user typed freely):** No `campaignType` provided. `buildSystemPrompt()` appends a fallback inference instruction (defined in 5.3.1, layer 6b). Claude reads the user's message and applies relevant principles.

Five campaign guide files: `educational.md`, `community.md`, `sales.md`, `social-proof.md`, `product-highlights.md`. Used as internal AI guidelines, not user-facing options.

**Note:** The `campaignType` passing mechanism from chips to `buildSystemPrompt()` is wired in Task 5.2.2. This task handles `buildSystemPrompt()` receiving and loading the guide. Existing campaign guide content quality is unknown — flag as user QA task.

**Parallel:** no (depends on 5.3.1)

#### 5.3.6 Brand Memory System

**Files:** `supabase/migrations/20260328_m5_brand_memories.sql` (new), `src/stores/brand-memories.ts` (new), `src/ai/kova-tools.ts` (modify), `src/data/memory-instructions.md` (new), `src/composables/use-chat.ts` (modify)

Brand memory is the ONLY persistent layer that crosses chat boundaries. Five components:

**Component 1 — Database table (`brand_memories`):** See Data Model section (Section 6).

**Component 2 — Pinia store (`src/stores/brand-memories.ts`):**
- `fetchMemories(brandId)` — Load all memories. Called by `buildSystemPrompt()` before each AI interaction.
- `saveMemory(brandId, content, source: 'auto' | 'user')` — Create a memory. Called by `saveBrandMemory` AI tool.
- `deleteMemory(memoryId)` — Delete a memory. Called from settings UI (post-MVP).
- `updateMemory(memoryId, content)` — Edit text. Called from settings UI (post-MVP).

**Component 3 — `saveBrandMemory` AI tool:**
Added to `src/ai/kova-tools.ts` alongside `placeMediaImage`.
```
saveBrandMemory(content: string, source: 'auto' | 'user')
```
- Calls `brandMemoriesStore.saveMemory()` to persist
- Returns confirmation: `"Memory saved: [content]"`
- `brand_id` derived from current chat context (active brand), not passed by the AI
- Registered in `src/ai/tools.ts` for `ToolLoopAgent`

**Component 4 — System prompt instructions (`src/data/memory-instructions.md`):**
Instructions for when and how to use `saveBrandMemory`:
- **Auto-save (source: 'auto'):** Detect durable preferences, constraints, or decisions. Examples: "I always want..." / "Never use..." / "Our CTAs should be..." / recurring corrections. Do NOT save: one-off requests, conversation filler, facts already in brand kit.
- **User-requested (source: 'user'):** "Remember this", "save this", "keep this in mind for next time"
- **Communication:** After saving, tell the user what was saved. Example: "I've saved a memory for [Brand Name]: 'CTAs should always use coral (#FF6B6B).' This will apply to all future design sessions."
- **Conflict handling:** If new memory contradicts an existing one, flag the conflict and ask user which to keep.

**Component 5 — Injection into `buildSystemPrompt()`:**
Layer 7 in the assembly order. Formats memories as:
```
## Brand Memories
The following are things you've learned about this brand from previous conversations.
Apply these in all your design decisions for this brand.

- CTAs should always use coral (#FF6B6B), never red
- The founder prefers minimalist hero sections
```
If no memories, section is omitted entirely.

**Brand settings UI (post-MVP):** A "Brand Memory" section in settings where users view, edit, delete memories. Not MVP — for MVP, users manage through conversation.

**Parallel:** no (depends on 5.3.1)

#### 5.3.7 Context Window Management

**Files:** `src/composables/use-chat.ts` (modify)

Two Vercel AI SDK mechanisms:

**Mechanism 1 — `prepareStep` (sliding window):**
Before each API call, trim message history to keep:
- Full system prompt (always, never trimmed)
- Last N user-assistant pairs (configurable, starting at ~20 pairs / 40 messages)
- All messages within current tool-calling loop (never trim mid-generation)

Older messages dropped from API payload only. They remain in Supabase (`chat_messages`) and in ChatPopup scroll history. The AI retains all persistent knowledge (brand kit, memories, principles, campaign guide, media library) because those are in the system prompt.

**Mechanism 2 — `pruneMessages` (strip old tool results):**
Tool call results (JSON from `placeMediaImage`, `setImageFill`, `render`, etc.) can be large and are only useful in the turn they occur. Configuration:
- Keep full tool results for the most recent turn
- For older turns, replace with compact summary: `"[Tool: placeMediaImage — success]"` or `"[Tool: render — created 3 frames]"`
- Never strip the tool call invocation — only the verbose result
- Summary format is generic: `"[Tool: <name> — <status>]"` where status is `success` or the error message. No per-tool summarizers needed for MVP.

**Configuration constants (developer-only, not user-facing):**
- `CHAT_HISTORY_WINDOW_SIZE = 20` (message pairs in sliding window)
- `TOOL_RESULT_RETAIN_TURNS = 1` (recent turns to keep full tool results)

Adjustable during M5.5 quality testing. Starting conservative — 20 pairs is generous for most design sessions.

**User experience:** Nothing changes visually. ChatPopup still shows full history. Sliding window only affects API payload. If AI "forgets" something from early in a long conversation, it should already be in brand memories if important.

**Parallel:** no (depends on 5.3.1)

---

### Phase 5.4: Media Library Integration

#### 5.4.1 Pass Available Images to System Prompt

**Files:** `src/composables/use-chat.ts`, `src/stores/media.ts`

**Source:** PRD v5 (replaces PRD v4 version)

When building the system prompt, fetch the current brand's media library images. Format each as:
```
## Available Media Library Images
The following images are available for this brand. Use them when relevant via `placeMediaImage`.

1. "summer-collection-hero.jpg" (1800x1200px, JPEG) — public_url: <url> — media_id: <uuid>
2. "product-moisturizer.png" (800x800px, PNG) — public_url: <url> — media_id: <uuid>
3. "brand-logo.png" (400x200px, PNG) — public_url: <url> — media_id: <uuid>
```

**URL generation:** `mediaStore.getPublicUrl(storagePath)` for each image. `media-assets` bucket is public — URLs don't expire. No signed URL complexity for MVP.

**Limit:** 20 images max in system prompt (~150-200 tokens per entry, so 20 ≈ 3,000-4,000 tokens). If more than 20, include the 20 most recently uploaded. Note in prompt: "Showing 20 most recent images. Ask the user if they need a specific image not shown here."

**Known limitation:** "Most recent" ordering may exclude critical assets like a brand logo uploaded months ago. Post-MVP options: starred/pinned images, "most used" ranking, user-configurable "always include" list.

**Parallel:** no (depends on Phase 5.3 and M4)

## 5. Data Model

All new tables. RLS enabled on all tables, keyed to `user_id = auth.uid()`.

### `chat_conversations`

One row per chat tab. A canvas can have many conversations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → `auth.users` | ON DELETE CASCADE |
| `brand_id` | UUID FK → `brands` | ON DELETE CASCADE |
| `canvas_id` | TEXT NOT NULL | Matches OpenPencil Yjs document ID (not a FK) |
| `title` | TEXT | Nullable. Auto-generated from first message (~50 chars) or user-editable |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

**Index:** `(user_id, brand_id, canvas_id)` — efficient lookup of all conversations for a canvas.

### `chat_messages`

One row per message. Ordered by `created_at`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `conversation_id` | UUID FK → `chat_conversations` | ON DELETE CASCADE |
| `user_id` | UUID FK → `auth.users` | ON DELETE CASCADE |
| `role` | TEXT NOT NULL | CHECK `('user', 'assistant')` |
| `content` | TEXT NOT NULL | Message text |
| `attachments` | JSONB | DEFAULT `'[]'`. Image metadata: `[{ type, id, file_name, url, width, height }]` |
| `tool_calls` | JSONB | DEFAULT `'[]'`. Tool records: `[{ tool_name, args, result }]` |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

**Index:** `(conversation_id, created_at)` — chronological retrieval.

### `brand_memories`

One row per remembered fact. Flat list per brand.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `brand_id` | UUID FK → `brands` | ON DELETE CASCADE |
| `user_id` | UUID FK → `auth.users` | ON DELETE CASCADE |
| `content` | TEXT NOT NULL | The memory text |
| `source` | TEXT NOT NULL | CHECK `('auto', 'user')`. How memory was created. |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

**Index:** `(brand_id, user_id)` — efficient lookup of all memories for a brand.

No deduplication for MVP. Post-MVP: text similarity at save time or periodic cleanup.

### `chat_attachments` (from PRD v5 — Task 4.2.5)

One row per chat-pasted image. Separate from `media` table.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → `auth.users` | ON DELETE CASCADE |
| `brand_id` | UUID FK → `brands` | ON DELETE CASCADE |
| `conversation_id` | UUID FK → `chat_conversations` | ON DELETE CASCADE. Nullable — set when attachment is used in a conversation. |
| `file_name` | TEXT NOT NULL | |
| `file_type` | TEXT NOT NULL | MIME type |
| `file_size` | INTEGER NOT NULL | Bytes |
| `width` | INTEGER | Nullable |
| `height` | INTEGER | Nullable |
| `storage_path` | TEXT NOT NULL | Path in `chat-attachments` bucket |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

**Index:** `(created_at)` — for cleanup job (find old attachments).

**Storage bucket:** `chat-attachments` (PRIVATE). Access via signed URLs with 24h expiry. Storage path: `{userId}/{brandId}/{timestamp}-{filename}`.

**Cleanup (post-MVP):** Scheduled function deleting records + files older than 30 days. Chat images are ephemeral — once `placeMediaImage` loads into canvas scene graph (embedded blob), the file is no longer needed.

### Existing Table Enhancements (from PRD v5 — Task 4.2.2)

**`media` table** — add columns:
```sql
ALTER TABLE public.media ADD COLUMN width INTEGER;
ALTER TABLE public.media ADD COLUMN height INTEGER;
```

## 6. Image Transport Architecture

Consolidated from PRD v5. This section provides the unified view of how images flow through the system.

### Core Insight

Images attached in chat serve two distinct purposes:
1. **Giving Claude visual context** to make design decisions (needs compressed, small image)
2. **Placing the actual high-res image** onto the canvas as part of the email design (needs full resolution + URL)

These require different resolutions and different transport paths.

### Image Processing Pipeline

All images pass through client-side processing before upload (`src/utils/image-processing.ts`):
1. **Resolution cap:** Max 4096px on longest edge (matches Figma's native limit). Images under 4096px are not resized.
2. **Format preservation:** PNG stays PNG (transparency), JPEG stays JPEG. No forced conversion.
3. **File size limit:** Reject over 10MB after processing.
4. **Metadata extraction:** Width, height, file size, MIME type.

**Vision-optimized copy** (`createVisionCopy()`):
1. Resize to max 1500px on longest edge (Claude internally resizes to 1568px — larger is wasted)
2. Convert to JPEG at 85% quality (Claude doesn't need transparency for visual understanding)
3. Target: under 1MB per image

Both functions use Canvas API (`OffscreenCanvas` or `<canvas>`) for client-side resizing. No server-side processing.

### Two Buckets

| Bucket | Visibility | Purpose | URL Type | Expiry |
|--------|-----------|---------|----------|--------|
| `media-assets` | Public | Curated brand assets (logos, product photos) | Public URL | Never |
| `chat-attachments` | Private | Ephemeral chat pastes (may contain sensitive content) | Signed URL | 24 hours |

### Dual-Representation Flow

```
User attaches image
  ├── Path A: Media library image (already in Supabase)
  │   ├── Vision copy: createVisionCopy() → base64 JPEG → FileUIPart
  │   └── Reference: public_url + media_id → text metadata in message
  │
  └── Path B: Clipboard paste / drag-drop
      ├── Process: image-processing pipeline → upload to chat-attachments
      ├── Vision copy: createVisionCopy() → base64 JPEG → FileUIPart
      └── Reference: signed_url + attachment_id → text metadata in message

Claude receives:
  ├── Vision copy (base64): sees image content, makes design decisions
  └── Storage reference (URL): calls placeMediaImage() → fetches full-res → base64 → setImageFill
```

### Multi-Turn Stripping

Implemented via `wrapLanguageModel()` with `transformParams` middleware:
1. Runs on every `doStream()` / `doGenerate()` call (including tool-calling loops)
2. Identifies all messages except current user turn
3. Strips `file` type parts (base64 vision copies) from older messages
4. Older images replaced with text reference: `[Previously attached: "filename.jpg" — media_id: uuid — public_url: ...]`

### `placeMediaImage` Tool

Kova-layer wrapper because core `setImageFill` only accepts base64:
1. Accept Supabase Storage URL (public or signed)
2. Validate URL domain (`*.supabase.co/storage/`) — reject external URLs (SSRF prevention)
3. Fetch with 10s timeout
4. Convert to base64
5. Delegate to core `setImageFill`

### Why Not Anthropic URL Source Type?

The API supports `{ type: "url", url: "..." }` for image inputs. However:
1. Vercel AI SDK (`@ai-sdk/anthropic`) may not surface URL source type — needs verification
2. Anthropic fetching from Supabase on every turn adds latency
3. Pre-compressed base64 at ≤1MB is fast and reliable

For MVP, use base64 for vision copies. Post-MVP, evaluate URL source if SDK supports it.

## 7. Dependency Graph

```
PHASE 5.1 (API Proxy):
  5.1.1 ──→ 5.1.2

PHASE 5.2 (Chat Popup UI):
  5.2.1 ─────┬──→ 5.2.2
              ├──→ 5.2.4
              ├──→ 5.2.6
              │
  5.2.5 ─────┼──→ 5.2.3
  4.2.5 ─────┘

PHASE 5.3 (Dynamic System Prompt):
  5.3.2 ──────────┐
  5.3.3 ──────────┤ (parallel content files)
  5.3.4 ──────────┤
                   │
  5.3.1 ──────────┤ (assembles layers)
                   │
  5.3.5 ──────────┤ (→5.3.1)
  5.3.6 ──────────┤ (→5.3.1)
  5.3.7 ──────────┘ (→5.3.1)

PHASE 5.4:
  5.4.1 (→5.3, M4 media store)

CROSS-PHASE:
  5.1.2 → 5.2.* (proxy must exist before chat can send messages)
  5.2.6 ↔ 5.2.1 (chat store + popup are tightly coupled)
  5.3.* → 5.2.* (system prompt feeds into chat composable)
```

### Parallelization Opportunities

**Can run in parallel (no dependencies between them):**
- 5.1.1 + 5.2.1 + 5.2.5 + 5.3.1 + 5.3.2 + 5.3.3 + 5.3.4 (7 independent entry points — 5.3.1 can be coded alongside content files since it imports them, though it's the assembly hub other 5.3.x tasks depend on)

**Sequential chains:**
- 5.1.1 → 5.1.2
- 5.2.1 → 5.2.2, 5.2.4, 5.2.6
- 5.2.5 + 4.2.5 + 5.2.1 → 5.2.3
- 5.3.1 → 5.3.5, 5.3.6, 5.3.7
- Phase 5.3 + M4 → 5.4.1

## 8. Hard Constraints

From CLAUDE.md and project conventions:

- Never modify `packages/core/` — read-only
- Never modify the `SYSTEM_PROMPT` constant in `use-chat.ts` — `buildSystemPrompt` APPENDS to it
- Never use Zod in the tool layer — valibot only (`src/ai/tools.ts` and dependencies)
- Never expose `ANTHROPIC_API_KEY` to the browser — server-side only via API proxy
- Vue 3 Composition API (`<script setup lang="ts">`), TypeScript, Tailwind CSS 4
- Pinia composition API stores, one store per domain
- ~600 lines max per file, ~40 lines max per function
- Check Reka UI first for UI components (Dialog, Popover, etc.)
- `crypto.getRandomValues()` only, never `Math.random()`
- Immutable data patterns — always create new objects, never mutate
- `culori` for color conversions
- `unplugin-icons` with Lucide for icons
- `structuredClone` for deep copies

## 9. M4 Prerequisites

These tasks from PRD v5 enhance existing M4 infrastructure that M5 depends on. They are NOT M5 tasks but must be completed before certain M5 tasks.

### 4.2.1 Enhancement — Image Processing Pipeline

**Files:** `src/stores/media.ts` (modify), `src/utils/image-processing.ts` (new)

Add to existing media store:
- Image processing pipeline: resize to 4096px cap, preserve format, 10MB limit, metadata extraction
- Vision-optimized copy: `createVisionCopy()` — 1500px max, JPEG 85%, under 1MB

**Required before:** Task 5.2.3 (image attachment uses `createVisionCopy`)

### 4.2.2 Enhancement — Media Table Width/Height Columns

**Files:** `supabase/migrations/20260324_m5_media_enhancements.sql` (new)

Add `width INTEGER` and `height INTEGER` to existing `media` table. Update `MediaAsset` TypeScript interface.

**Required before:** Task 5.4.1 (system prompt includes image dimensions)

### 4.2.5 — Chat Attachments Storage Infrastructure

**Files:** `supabase/migrations/20260324_m5_chat_attachments.sql` (new), `src/stores/chat-attachments.ts` (new)

New `chat_attachments` table (see Data Model) + private `chat-attachments` storage bucket.

Pinia store:
- `uploadChatImage(brandId, file)` — upload, create record, return with signed URL
- `getSignedUrl(storagePath)` — 24h expiry signed URL
- `deleteChatAttachment(id)` — delete file + record

**Required before:** Task 5.2.3 (clipboard paste path uses this store)
