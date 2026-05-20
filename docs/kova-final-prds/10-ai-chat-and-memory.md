# PRD 10 — AI Chat + Memory + Tool Layer

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `IN-REVIEW 2026-05-17` (founder-finalized 2026-05-17; W4 QA pass 2026-05-19) |
| **Wave** | 6 (closing wave) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-19 |
| **Depends on PRDs** | 05 (Brand Kit ships `tone_snippets` read API); 06 (canvas chrome hosts the chat tab in the right panel); 07a (Slice NodeType + **page-level Measurement methods** on the CANVAS-typed SceneNode — Measurement is NOT a NodeType, per PRD 07a §7.1b / §12.10; W0-7 propagation 2026-05-19; W4 CT-004 close-out 2026-05-19 — the AI tool wrappers in this PRD register against these); 11 (toast, modal, skeleton primitives). |
| **Blocks PRDs** | None (closing-wave cluster). |
| **Source artifacts** | M5 + M5.5 prior implementation (`useChatStore`, `useBrandMemoriesStore`, `buildSystemPrompt`, `createKovaTools`, `ai-proxy/v1/messages`). Audit `00c §2.A` Cluster 10 lines 1946–2007 (lifted as base draft). `00c §1.E.1` Check 5 (no-Shopify-connected error UX gap). Shopify product-reference spec `docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` Rev 2 (composer-chip architecture D1–D9). Q-decisions: Q3 #14 (Boolean ops engine-ready), Q8 (tone-snippet injection), Q11 (Measurement — superseded 2026-05-17: measurements are page-level on CANVAS, NOT a NodeType, per PRD 07a §7.1b / §12.10; W0-7 propagation 2026-05-19), Q24 (saved-blocks payload — owned by 05, not this PRD). 03 doc cross-cuts §2.5 (Brand Kit), §2.7 (AI text suggestions DEFERRED), §2.13 (brand assets). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

Kova's editor has an AI chat panel that designs emails for the user. Today that panel lives as a small floating popup in the bottom-left corner of the canvas; M5 + M5.5 already wired Claude (via `@ai-sdk/anthropic` + ToolLoopAgent), per-canvas chat persistence (Supabase tables `chat_conversations` + `chat_messages`), brand memory (Supabase table `brand_memories` + the AI's `saveBrandMemory` tool), and a layered system-prompt builder. This PRD does **four** things on top of that:

1. **Move chat into the right panel as a second tab** ("AI" — sits next to Design; the Figma "Prototype" tab is dropped entirely from Kova's right-panel because Kova exports static images, not clickable prototypes) so chat is a first-class editor surface, not a floating add-on. The floating popup is removed. **Default-focused tab on first canvas open = AI** (per PRD 06 §12.13 founder ratification 2026-05-17 — Kova differentiator surfacing chat-first UX; W0-7 propagation 2026-05-19). Subsequent opens read per-canvas `localStorage[right-panel-tab:${canvasId}]`.
2. **Wire Shopify product-reference composer chips** above the chat text input. The user multi-selects products in the Shop panel (Cluster 06), clicks "Import N to chat," and those products become removable chips in the composer that persist across every chat turn until the user `×`'s them. The AI sees a lightweight summary inline (title, image URL, price, ID) and tool-calls for depth as needed. This replaces M9's rejected "drag-to-place + live-binding" model.
3. **Extend the system-prompt builder with two new layers:** a tone-snippet exemplar block (reads `brands.tone_snippets[]` shipped by Cluster 05, capped at 10 entries per prompt, in user-defined order) and a product-reference summary block (renders the active composer chips' hybrid payload).
4. **Tighten the AI tool layer:** keep the 5 existing Shopify tools (`search_products`, `get_collection`, `get_variant`, `get_active_discounts`, `get_shop_context`) but rip the `bestsellers` sort option (per Shopify spec D6); add a "no Shopify connection" error response shape (per `00c §1.E.1` Check 5); register thin AI-tool wrappers around the Slice and Measurement engine tools that Cluster 07a ships; ensure ToolLoopAgent still routes through `@ai-sdk/anthropic` and the server-side `ai-proxy/v1/messages` Edge Function (so `ANTHROPIC_API_KEY` is never in the browser, per `CLAUDE.md` hard constraint).

This PRD does **not** modify the locked `SYSTEM_PROMPT` constant (`src/ai/system-prompt.md` Layer 1) — that's a `CLAUDE.md` hard constraint and remains the immutable base. All extension happens in the layered `buildSystemPrompt()` composition.

### 1.2 Caveman summary (per CLAUDE.md communication style)

Chat panel move from floating popup to right-panel second tab (next to Design). Prototype tab dropped — useless for static email. User pick products in Shop panel, click "Import N to chat" — chips appear over text input, stay until ×'d. AI see product summary + tool-call for depth. New system-prompt layers: tone snippets (cap 10) + product chips. 5 Shopify tools stay (drop `bestsellers` sort, add "no connection" error). Slice + Measurement AI tools wrap engine tools from Cluster 07a. SYSTEM_PROMPT untouched. Anthropic key stay on server via ai-proxy.

### 1.3 Outcome (acceptance gate)

When this PRD ships:

- (1) The right panel has two tabs: **AI** (default-active on first canvas open per PRD 06 §12.13 founder ratification 2026-05-17; W0-7 propagation 2026-05-19) and **Design**. The Figma "Prototype" tab is not rendered (Kova exports static email images, not clickable prototypes — Prototype has no use case here; the scope plan §3 Cluster 06 line "Prototype DEFERRED" is now superseded by "Prototype out of scope entirely"). Clicking AI shows the chat surface — empty state, message list, tab strip for chat conversations, composer with text input + attached-image thumbnails + product-reference chips + Send. The floating ChatPopup is removed.
- (2) Users multi-select products in the Shop panel (Cluster 06), click "Import N to chat" → those products land as composer chips in the active chat conversation. Chips persist across reloads (stored on `chat_conversations.product_references` JSONB). Each chip has a thumbnail + name + `×`. Importing again merges by product ID (no dupes). Removing the last chip empties the reference. Chips do NOT clear on Send. Max 20 chips per conversation; importing past 20 keeps the oldest in (FIFO would be confusing — instead the import bar disables with a "Max 20 reached — remove some first" tooltip).
- (3) `buildSystemPrompt()` includes — in order — the locked `SYSTEM_PROMPT`, email guidelines, section definitions, brand kit (incl. `voice`), **tone-snippet exemplars (NEW, cap 10)**, image handling, campaign layer, brand-memory instructions, brand memories, available media images, ephemeral chat attachments, **active product references (NEW, hybrid payload for the active conversation's chips)**.
- (4) When the user sends a message, the active conversation's product-reference chips serialize into the message payload (no chip clearing). The AI receives a hybrid payload per chip: `{ product_id, title, primary_image_url, price (or price_range), handle }`. It tool-calls `get_variant` / `get_collection` / `search_products` / `get_active_discounts` / `get_shop_context` for depth.
- (5) The 5 Shopify AI tools return `{ error: 'No Shopify connection for this brand', code: 'no_connection' }` (instead of empty arrays) when no `shopify_connections` row exists. The `bestsellers` value is removed from `search_products.sort` picklist.
- (6) Two NEW AI-tool wrappers exist — `createSliceFromSelection` and `addMeasurement` — registering Cluster 07a's Slice and Measurement engine tools as AI tools (thin shims; mutation goes through the engine).
- (7) Brand memories continue auto-saving via `saveBrandMemory`, viewable + editable in the Brand Kit Memory tab (Cluster 05 owns the surface; this PRD owns the AI-side behavior).
- (8) `ANTHROPIC_API_KEY` is never exposed to the browser; all chat requests go through `api/ai-proxy/v1/messages` with Supabase JWT + atomic per-user daily rate limit (200/day default, locked from M5).
- (9) Anthropic data flow is named in the privacy policy + RoPA as a sub-processor receiving "user chat messages and active product-reference summaries" (per `00e §6 #4`).

---

## 2. Scope

### 2.1 In scope (this PRD)

**Chat surface — right-panel migration:**
- Right-panel second tab "AI" — final tab order is `Design` + `AI` (visual order matches Figma); **AI is default-active on first canvas open** (per PRD 06 §12.13 founder ratification 2026-05-17; W0-7 propagation 2026-05-19). Prototype tab dropped entirely (Cluster 06 PRD must wire the 2-tab routing slot; this PRD ships the AI tab content and supersedes scope plan §3 Cluster 06's "Prototype DEFERRED" line with "Prototype out of scope")
- `<ChatPanel>` becomes the canonical chat surface (refactored from the existing floating `<ChatPopup>`; the popup is deleted)
- Chat header (tab strip for multiple chat conversations per canvas + "New chat" + per-tab menu for rename / delete). **Cap 20 chat tabs per canvas** — new-chat button disables at 20 with tooltip `Max 20 chats per canvas — close one first.` (Founder-locked §12.12 item 3.)
- Tab strip overflow: **horizontal scroll with arrow buttons at edges** (Figma frame/page-tabs pattern, founder-locked §12.12 item 10). Single-row strip; no wrap, no dropdown.
- **New chat default state**: empty chips. Product chips do not carry over between chat tabs (founder-locked §12.12 item 9).
- Message scroll area (renders `<ChatMessage>` per stored + streamed message; reuses existing `ChatMessage.vue`)
- Composer footer: image-attach button, paste-image listener, product-reference chip row (NEW), text input, Stop / Send buttons (reuses existing `ChatInput.vue` patterns)
- Empty state, thinking indicator, step-limit "Continue" prompt, init error banner, dev-only debug copy / ACP log copy / Clear actions — all carry forward from `ChatPopup.vue`

**Composer-chip product references:**
- Per-conversation product-reference state — `chat_conversations.product_references JSONB DEFAULT '[]'` (NEW migration)
- Chip row UI above the text input — renders one chip per active reference; each chip = thumbnail + name + `×`
- "Add to chat" entry point in Shop panel (Cluster 06 ships the panel selection UI; this PRD ships the import callback that writes references onto the active conversation)
- Hybrid payload serialization on Send — chips do NOT clear on send (persistence per spec D3)
- Max 20 chips per conversation (founder-recommended in dispatch); import past 20 disables with tooltip
- De-dupe by product ID on import (no duplicate chips for the same product)
- Reload-survival — chips hydrate from `chat_conversations.product_references` on conversation load

**System-prompt builder extension:**
- Two new layers in `buildSystemPrompt()` + one extension of existing Layer 7b:
  - `formatToneSnippets(brand.toneSnippets)` — reads from `selectedBrand.tone_snippets[]` (Cluster 05 schema), **cap 10 entries by first-10 JSONB-array order (user-defined)**, renders as numbered exemplar list with brief instruction header
  - `formatProductReferences(refs)` — reads active conversation's chips, renders hybrid payload (one block per chip: `product_id`, `title`, `primary_image_url`, `price` or `price_range`, `handle`)
  - **`formatBrandMemories` extension (Layer 7b)** — existing M5 function gets a NEW cap: sort `brandMemories` by `created_at DESC`, take first 50. Auto-prunes stale memories from prompt. (Founder-locked §12.12 item 2.)
- Order of layers documented in §6.3
- `SYSTEM_PROMPT` constant (Layer 1) remains immutable per CLAUDE.md hard constraint
- Token-budget guardrail: tone snippets capped at 10; brand memories capped at 50; product references capped at 20; all fit within the existing 16384 `maxOutputTokens` budget with comfortable headroom (Anthropic 200k input window — under 5% of budget at max)

**AI tool layer:**
- `createKovaTools(store)` continues to return the 5 Shopify tools (`search_products`, `get_collection`, `get_variant`, `get_active_discounts`, `get_shop_context`) + `placeMediaImage` + `saveBrandMemory`
- **REFACTOR (§5.2):** rip `bestsellers` from `search_products.sort` picklist (per Shopify spec D6 + 00c §1.E.1 audit). Tool's `execute` never implemented sort; schema-only fix.
- **REFACTOR (§5.2):** each of the 5 Shopify tools returns `{ error: 'No Shopify connection for this brand', code: 'no_connection' }` when `shopify_connections` row missing for the active brand. Replaces silent empty-array return per `00c §1.E.1` Check 5.
- **NEW:** `createSliceFromSelection(args: { name?: string })` — thin AI-tool wrapper that calls Cluster 07a's `figma.createSliceFromSelection()` engine API
- **NEW:** `addMeasurement(args: { canvas_id: string; start_node_id: string; start_side: 'TOP'|'RIGHT'|'BOTTOM'|'LEFT'; end_node_id: string; end_side: 'TOP'|'RIGHT'|'BOTTOM'|'LEFT'; offset_type?: 'INNER'|'OUTER'; offset_value?: number; free_text?: string })` — thin AI-tool wrapper that calls Cluster 07a's `figma.currentPage.addMeasurement({ nodeId, side }, { nodeId, side }, options?)` page-level engine API per PRD 07a §2.1 + §7.1b (measurements are NOT a NodeType — W0-7 propagation 2026-05-19)
- Engine tools (CORE_TOOLS via `@open-pencil/core`) continue to wire in `createAITools` via `toolsToAI(CORE_TOOLS, ...)` — unchanged from M5
- ToolLoopAgent + `@ai-sdk/anthropic` continue per CLAUDE.md hard constraint

**Server-side proxy + rate limit:**
- `api/ai-proxy/v1/messages` Edge Function ships from M5 — verify (no change). `ANTHROPIC_API_KEY` server-only, never browser-exposed.
- `try_increment_generation` RPC ships from M5 (atomic_rate_limit migration) — daily limit 200/user/day. Verify intact.
- Sub-processor disclosure: privacy policy + RoPA (Cluster 01 owns) must name Anthropic as receiver of "user chat messages + active product-reference summaries" per `00e §6 #4`.

**Data model (no net-new tables; one column add):**
- ALTER `chat_conversations` ADD COLUMN `product_references JSONB NOT NULL DEFAULT '[]'::jsonb`
- Existing tables (chat_conversations, chat_messages, chat_attachments, brand_memories) verified intact; no schema changes there

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Right-panel tab framework (tab routing, slot mounting for AI tab content) | 06 — Canvas Editor Core Chrome |
| Shop panel UI (product grid, multi-select, "Import N to chat" button) | 06 — Canvas Editor Core Chrome (per Shopify spec §4.1) |
| `brands.tone_snippets` schema + Brand Kit settings UI (tone-snippet CRUD) | 05 — Brand Kit & Drag-Drop |
| Brand Kit Memory tab UI (view / edit / delete brand memories) | 05 — Brand Kit & Drag-Drop |
| Slice NodeType + page-level Measurement methods (CANVAS-scoped: `figma.currentPage.addMeasurement / getMeasurements / getMeasurementsForNode / editMeasurement / deleteMeasurement` per 07a §7.1b — NOT a NodeType, W0-7 propagation 2026-05-19) + `figma.createSliceFromSelection()` engine API | 07a — Canvas Engine Core + Renderer |
| Shopify OAuth + sync + `shopify_connections` table | M9 (already shipped) + Cluster 04 (Account integrations IA) |
| `chat_conversations` / `chat_messages` / `brand_memories` schemas (existing) | M5 (already shipped) |
| `ai-proxy/v1/messages` Edge Function (existing) | M5 (already shipped) |
| Privacy policy + RoPA sub-processor disclosures | 01 — Auth & Identity (per its §11.1 deliverables) |
| Toast, modal, skeleton primitives | 11 — Shared UI Infrastructure |
| AI text suggestions in inspector (Q3 §2.7) | DEFERRED — Phase 2 |

### 2.3 Deferred to Phase 2

- Multi-model picker (model dropdown remains dev-only via `SHOW_DEV_FEATURES` constant in `ChatInput.vue`)
- ACP transport surfaces (Tauri-only; chat panel renders ACP permission dialog when in Tauri mode but full ACP UX is Phase 2)
- AI text suggestions in inspector (Q3 §2.7 row — DEFERRED)
- Cross-canvas chat search
- "Pin" a chat conversation across canvases
- Voice-input mode
- Per-conversation campaign-type lock (currently per-send; user re-picks each turn — acceptable)
- Tone-snippet *re-ordering UI* (Cluster 05 owns ordering; this PRD just consumes the JSONB array order)
- Bulk-import a Shopify collection as references (user goes through chat: "pull a selection from X collection" — the AI `get_collection` tool handles)

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 05** ships `brands.tone_snippets JSONB` + Brand Kit Memory tab UI. This PRD **consumes** `tone_snippets` via the existing `useBrandsStore.selectedBrand` reactive read; does not re-spec.
- **Cluster 06** ships the right-panel tab framework + Shop panel UI + "Import N to chat" button. This PRD owns the AI tab content + the import callback that writes onto `chat_conversations.product_references`.
- **Cluster 07a** ships Slice NodeType + page-level Measurement methods (CANVAS-scoped — NOT a NodeType per 07a §7.1b; W0-7 propagation 2026-05-19) + the engine-API surface. This PRD owns the AI-tool wrappers only.
- **Cluster 01** ships the privacy policy + RoPA. This PRD provides the disclosure copy fragment ("user chat messages and active product-reference summaries sent to Anthropic for AI design generation").
- **M5 / M5.5** are honored as prior implementation; this PRD **references existing implementation; does not re-spec from scratch** (per dispatch instruction).

---

## 3. Visual spec

Every surface maps to a hi-fi file or composes from documented patterns. The chat panel has no dedicated standalone hi-fi (per scope plan §3 Cluster 10 — visual lives inside the canvas right-panel area).

### 3.1 Right-panel AI tab (DARK theme — authenticated app)

| Surface | Mount point | Hi-fi reference | Notes |
|---|---|---|---|
| Right-panel tab strip (Design / **AI**) | `<RightPanelTabs>` in `Kova Canvas - Final.html` chrome (lines 75–1008, the inspector-tab strip block) | `main-main-kova-scope/batch-b/Kova Canvas - Final.html` (right-panel tab strip block — verify exact location in Cluster 06 PRD §3) | Two tabs only: Design and **AI** (default-active on first canvas open per PRD 06 §12.13 founder ratification 2026-05-17; W0-7 propagation 2026-05-19). Figma's Prototype tab is intentionally dropped (Kova exports static images, not clickable prototypes — Prototype has zero use case here). |
| Empty-state chat surface | inside AI tab when no messages | `Kova Canvas - Final.html` (empty inspector body class `.kc.empty`) | Lifts ChatPanel.vue lines 119–127 chrome: centered `icon-lucide-message-circle` + caption "Describe what you want to create or change." |
| Message scroll area | inside AI tab when messages exist | `Kova Canvas - Final.html` (inspector scroll-body class) | Reka `ScrollAreaRoot` / `ScrollAreaViewport` / `ScrollAreaScrollbar` / `ScrollAreaThumb` per existing `ChatPanel.vue` |
| Tab strip header (multiple chats per canvas) | top of AI tab | `Kova Canvas - Final.html` (chip-row pattern) | Lifts `ChatPopup.vue` lines 286–317 chrome: per-chat pill button + "New chat" + minimize is REMOVED (chat is no longer a popup) |
| Composer footer | bottom of AI tab | existing `ChatInput.vue` chrome + NEW chip row above textarea | `ChatInput.vue` lines 86–217 chrome reused; chip row inserted between `<!-- Attachment thumbnails -->` block and `<form>` (or as new block above the form — engineer's choice per layout fit) |

### 3.2 Composer-chip pattern (NEW — per Shopify spec §4.2)

| Surface | Hi-fi reference | Notes |
|---|---|---|
| Active product-reference chips above text input | Composed pattern — no dedicated hi-fi. Anchored to the design spec `docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` §4.2 + the existing chat-attachment thumbnail row in `ChatInput.vue` lines 96–118 | One chip per active reference. Chip layout: 48×48 square product image (or fallback monogram if image missing), product name truncated to ~14 chars, `×` button top-right. Chip background `bg-surface` border `border-border` rounded `rounded-lg`. **Chip `×` always visible at `opacity-60`, full opacity on hover/focus** (founder-locked §12.12 item 6, accessibility-first). **Chip body click = no-op** (display-only; only `×` removes — founder-locked §12.12 item 4). |
| Composer-footer vertical stack order | derived | Top→bottom: `image attachment thumbnails → product chip row → textarea → send/stop buttons` (founder-locked §12.12 item 7). Image attachments and product chips are separate rows; they do NOT merge. |
| Max-chips disabled state | derived | When 20 chips active, "Import N to chat" button in Shop panel (Cluster 06) disables with tooltip "Max 20 references — remove some first" |
| Empty-chip-row state | derived | When no chips, chip row collapses to height 0. Composer reflows to its M5 height. |

### 3.3 Brand-memory + tone-snippet indicators (Phase B polish — DEFERRED per §12.9)

| Surface | Hi-fi reference | Notes |
|---|---|---|
| "AI is using N voice references" status indicator | `Kova Canvas - Final.html` chip pattern | **DEFERRED to Phase B** (founder-locked 2026-05-17 §12.12 item 1 / §12.9). When activated: below tab strip header, content `AI is using N voice references` where `N = min(toneSnippets, 10) + min(brandMemories, 50)`. Pill style `.chip.subtle`. Not in Phase A scope. |
| Brand-memory edit affordance | N/A here | Lives in Cluster 05 Brand Kit Memory tab; ChatPanel does not surface edit UI directly. |

### 3.4 No standalone hi-fi exists

There is **no batch-a / batch-a-additions / batch-b hi-fi file dedicated to the chat panel.** The chat surface composes from:
- `Kova Canvas - Final.html` right-panel inspector chrome (Cluster 06 source-of-truth)
- Existing `ChatPanel.vue` + `ChatPopup.vue` + `ChatInput.vue` + `ChatMessage.vue` markup contracts (M5 implementation)
- The Shopify product-reference design spec for the chip pattern

If founder wants a dedicated hi-fi for chip layout edge cases before implementation, sketch mid-stream — not blocking PRD approval.

### 3.5 Design system references

Dark theme only (authenticated app per `feedback_app_dark_website_light`). Stylesheet: `main-main-kova-scope/design-system/kova-hifi.css`. Component primitives:

- `.chip` for product-reference chips (define new pattern if not in `kova-hifi.css`; engineers translate to Vue `<ProductReferenceChip>` per design.md §6 extension protocol)
- `.btn`, `.btn.primary`, `.btn.ghost` for Send / Stop / Clear / New chat
- `.input` for textarea
- `.tab`, `.tabs-strip` for right-panel tab strip + per-conversation tab strip
- Reka primitives: `ScrollAreaRoot` (message list), `TooltipRoot` (max-chips tooltip + send button), `DropdownMenuRoot` (per-conversation tab menu)
- Lucide icons via unplugin-icons: `<icon-lucide-message-circle>`, `<icon-lucide-image>`, `<icon-lucide-send>`, `<icon-lucide-square>` (stop), `<icon-lucide-x>` (chip remove), `<icon-lucide-plus>` (new tab), `<icon-lucide-trash-2>` (clear)

---

## 4. Data model

### 4.1 Schema migrations

Single migration file: `kova-open-pencil-1/supabase/migrations/20260620_10_chat_product_references.sql`.

```sql
-- ============================================================
-- Migration 20260620_10_chat_product_references
-- Cluster 10 AI Chat + Memory + Tool Layer
-- Adds per-conversation product-reference state for composer chips
-- Pairs with: 20260401_m5_chat_persistence.sql (creates chat_conversations)
-- ============================================================

BEGIN;

-- ---- 1. chat_conversations.product_references ----

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS product_references jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.chat_conversations.product_references IS
  'Active Shopify product-reference chips for this chat conversation. Ordered array of {product_id, title, primary_image_url, price_low, price_high, currency, handle, added_at} objects. Capped at 20 entries (enforced client-side in useChatProductReferencesStore). Persists across reloads; never clears on Send. Per Shopify product-reference design spec D3 + D7 + D8.';

-- Validation function (defense-in-depth — frontend enforces too)
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

### 4.2 RLS policies

No new RLS policies. The existing `chat_conversations` policies (set in `20260401_m5_chat_persistence.sql:14–23`) cover SELECT / INSERT / UPDATE / DELETE — gating by `user_id = auth.uid()`. The new column inherits row-level access from those policies. Verified intact during PRD authoring.

Brand memory RLS verified intact (`20260415_m5_brand_memories.sql:10–13`): `USING (user_id = auth.uid())` policy FOR ALL — single permissive policy. The brand-memory RLS tighten migration (`20260415_m5_brand_memories_rls_tighten.sql`) is layered on top.

### 4.3 Storage buckets

No new Storage buckets. The chat surface uses:
- `media-assets` bucket (existing, Cluster 05 owns) for any image attached via `placeMediaImage` AI tool
- `chat-attachments` bucket (existing M5) for per-message user-attached images
- Shopify product images come from Shopify's CDN URLs (stored as URL strings in `shopify_media` table; no Kova Storage bucket needed for product images)

---

## 5. Backend

### 5.1 Edge Functions

#### 5.1.1 `POST /api/ai-proxy/v1/messages` — EXISTING (verify, no change)

Already shipped in M5. Authoritative file: `kova-open-pencil-1/api/ai-proxy/v1/messages.ts`.

| Field | Value |
|---|---|
| Trigger | Browser POST from `@ai-sdk/anthropic` (via `createAnthropic({ baseURL: '/api/ai-proxy/v1', fetch: ... })`) |
| Auth | `authenticateRequest(req)` validates Supabase JWT (`Authorization: Bearer <token>` header) and returns `{ userId }`. |
| Body limits | 4 MB max (`MAX_BODY_BYTES`); 413 on overflow |
| Rate limit | `try_increment_generation(p_user_id, p_daily_limit=200)` RPC — atomic per-user daily counter, resets at UTC midnight |
| Forward | POST to `https://api.anthropic.com/v1/messages` with server-side `ANTHROPIC_API_KEY` (overwrites the placeholder `x-api-key` set by the SDK in the browser) |
| Streaming | Pass-through of the Anthropic streaming response body |
| Return | 200 (stream); 401 (auth); 413 (body); 429 (`{ error: 'Daily limit reached...', retry_after }`); 500 (server) |

**Verification task:** Confirm `ai-proxy/v1/messages.ts` is unchanged since M5 + verify env vars are set in Vercel production (per Cluster 04 §5.4 environment matrix when it ships). No code change in this PRD.

### 5.2 RPCs / database functions

#### 5.2.1 `try_increment_generation(p_user_id uuid, p_daily_limit int default 200)` — EXISTING (verify, no change)

Already shipped (`20260402_m5_atomic_rate_limit.sql`). `RETURNS TABLE(allowed boolean, current_count int) SECURITY DEFINER`. Atomic check-and-increment with `SELECT ... FOR UPDATE` on `users` row; resets counter on new UTC day.

**Phase-tier rate limits (FUTURE Cluster 04 cross-cut):** Free / Pro / Studio plans currently all hit `p_daily_limit=200`. Cluster 04 will introduce per-plan limits via a `users.plan` lookup. NOT in scope here; ai-proxy continues with the 200 default.

#### 5.2.2 `validate_chat_product_references()` — NEW (in §4.1 migration)

Trigger function. Validates that `product_references` is a JSONB array and has ≤ 20 entries on INSERT/UPDATE. Defense-in-depth — primary enforcement is client-side in `useChatProductReferencesStore`, but the trigger is the last line if a misbehaving client tries to bypass.

### 5.3 Cron jobs

None. Chat persistence has no retention cron at MVP (per M5 decision). Future cleanup of orphaned conversations on user delete is handled by Cluster 01's `delete-account-cron` cascade (the `db` step's FK CASCADE on `chat_conversations.user_id → auth.users(id) ON DELETE CASCADE` does the work).

### 5.4 External integrations

#### 5.4.1 Anthropic — via `@ai-sdk/anthropic`

**SDK:** `@ai-sdk/anthropic` (the Vercel AI SDK wrapper; per CLAUDE.md hard constraint — NEVER write a custom Anthropic adapter, NEVER bypass `@ai-sdk/anthropic`).

**Model:** Default `claude-sonnet-4-6` (set via `VITE_AI_MODEL` env var; the dev-only model dropdown in `ChatInput.vue` exposes selection during development via `SHOW_DEV_FEATURES`).

**Routing:** `createAnthropic({ apiKey: 'kova-proxy-placeholder', baseURL: '/api/ai-proxy/v1', fetch: customFetchWithSupabaseJWT })`. The placeholder API key is overwritten server-side by `ai-proxy` with the real `ANTHROPIC_API_KEY`. The custom `fetch` injects `Authorization: Bearer <supabase-jwt>` so the proxy can authenticate the browser request before forwarding to Anthropic.

**Agentic loop:** `ToolLoopAgent` from `ai` package (Vercel AI SDK). Per CLAUDE.md hard constraint — NEVER write a custom agentic loop.

**Step limits:** `stopWhen: stepCountIs(MAX_AGENT_STEPS=50)`. Per-conversation. When hit, the UI surfaces a "Continue" button (existing M5 chrome in `ChatPanel.vue` lines 156–163).

**Prompt caching:** `providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } }` — Anthropic ephemeral cache for the layered system prompt. Reduces token cost on multi-turn conversations (cache lives 5 min; long enough for a typical design session).

**Sub-processor disclosure (per `00e §6 #4`):** Anthropic receives:
- The full layered system prompt (incl. brand kit, tone snippets, brand memories, available media URLs, active product-reference summaries)
- The user's chat message text + any attached image URLs (Supabase Storage public URLs)
- The AI's tool-call results (incl. Shopify product / collection / variant rows for the active brand)

Privacy policy + RoPA (Cluster 01 owns) must name this flow. Suggested copy in §11.1.

#### 5.4.2 Shopify — via 5 AI tools

5 AI tools (in `src/ai/kova-tools.ts`) read from Supabase tables that M9's `webhook-worker.ts` keeps synced. **No direct Shopify API calls from this PRD's tools** — only DB reads against the M9-synced catalog tables (`shopify_products`, `shopify_variants`, `shopify_collections`, `shopify_collection_products`, `shopify_discounts`, `shopify_connections`, `shopify_media`).

Per `00c §1.E.1` Check 5: each of the 5 tools now returns `{ error: 'No Shopify connection for this brand', code: 'no_connection' }` when the brand has no `shopify_connections` row. Replaces silent empty-array returns.

### 5.5 M9 reuse / refactor / re-spec analysis

Per scope plan §5.5 mandatory section.

| M9 surface | Disposition | Notes |
|---|---|---|
| 5 Shopify AI tools (`search_products`, `get_collection`, `get_variant`, `get_active_discounts`, `get_shop_context`) at `src/ai/kova-tools.ts` | **REUSE + REFACTOR** | Schema bug fixed 2026-05-13 (22 tests pass per `project_m9_shopify_tools_schema_bug` memory). REFACTOR: (a) drop `bestsellers` from `search_products.sort` picklist per Shopify spec D6; (b) add `{ error, code: 'no_connection' }` return when no `shopify_connections` row per `00c §1.E.1` Check 5. ToolLoopAgent integration via `@ai-sdk/anthropic` per CLAUDE.md ✅. Brand-scoped via `activeBrandId()` ✅. |
| `placeMediaImage` AI tool | **REUSE** | Verbatim — sets Supabase Storage image as fill on a target node. Validates HTTPS + Supabase Storage URL via `validateImageUrl`. Already wires undo via `store.pushUndoEntry`. ✅ |
| `saveBrandMemory` AI tool | **REUSE** | Verbatim — saves to `brand_memories` table with `source: 'auto' | 'user'`. ✅ |
| Per-canvas chat persistence (`chat_conversations` + `chat_messages` + `chat_attachments` tables; `useChatStore`) | **REUSE** | Verbatim — schema in `20260401_m5_chat_persistence.sql` + `20260401_m5_chat_attachments.sql`. Per-canvas independent chats per M5 decision. ✅ |
| Brand memory (`brand_memories` table; `useBrandMemoriesStore`) | **REUSE** | Verbatim — schema in `20260415_m5_brand_memories.sql` + RLS tighten in `20260415_m5_brand_memories_rls_tighten.sql`. ✅ |
| `ai-proxy/v1/messages` Edge Function | **REUSE** | Verbatim — server-side proxy with Supabase JWT auth + 4MB body cap + atomic rate limit + Anthropic forward. ANTHROPIC_API_KEY server-only per CLAUDE.md ✅. |
| `try_increment_generation` RPC | **REUSE** | Verbatim. Future per-plan limits = Cluster 04 cross-cut. ✅ |
| `buildSystemPrompt` builder | **REUSE + EXTEND** | Verbatim 11-layer composition; EXTEND with 2 new layers: tone-snippet exemplars (between Layer 4 brand kit and Layer 5 image handling) + active product references (after Layer 8b chat attachments). SYSTEM_PROMPT constant (Layer 1) IMMUTABLE per CLAUDE.md hard constraint ✅. |
| `ChatPopup.vue` (floating popup, current MVP) | **RE-SPEC** | DELETE. Replaced by `ChatPanel.vue` mounted as the right-panel "AI" tab content. The popup chrome (lines 269–317) carries forward as the tab strip + composer pattern but mounts inside the right panel, not floating bottom-left. Removal points: `EditorView.vue` line 282 `<ChatPopup>` render + line 33 import — replaced by `<ChatPanel>` mount inside the right panel (Cluster 06 PRD must spec the slot). |
| `ChatPanel.vue` (existing, ~unused) | **REFACTOR** | Currently a stub that imports `useAIChat()` but no per-conversation tab strip + no composer chip row. EXTEND to mirror `ChatPopup.vue`'s tab strip + persistence wiring + add chip row above text input. |
| `ChatInput.vue` | **EXTEND** | Insert chip row **between** the existing attachment-thumbnail row and the `<form>` element — i.e. **below** attachments, **above** the textarea (per §3.2 founder-locked stack order + §12.12 item 7; W4 C-MED28 close-out). Pass active references in via a new `productReferences` prop; emit `remove-reference` event on `×` click. |

**No re-spec from scratch.** Per dispatch instruction: "Reference existing implementation; do NOT re-spec from scratch." This PRD is an EXTENSION pass on top of M5 / M5.5 / M9.

---

## 6. Frontend

### 6.1 Routes

No new Vue Router routes. The chat panel mounts inside `/canvas/:canvasId` (the route Cluster 06 owns). Right-panel tab routing (Design / AI / Prototype) is Cluster 06's responsibility; this PRD provides the AI tab's `<ChatPanel>` component as the slot content.

### 6.2 Pinia stores

#### 6.2.1 `useChatStore` — EXISTING (M5, verify)

File: `src/stores/chat.ts`. State + actions per M5: `conversations`, `messages`, `activeConversationId`, `isLoading` + `fetchConversations` / `createConversation` / `deleteConversation` / `fetchMessages` / `addMessage` / `updateConversationTitle`.

**EXTEND this PRD:** add `updateProductReferences(conversationId: string, refs: ProductReference[]): Promise<void>` action that calls `supabase.from('chat_conversations').update({ product_references: refs }).eq('id', conversationId)` and patches the local `conversations` array immutably. Returns void.

#### 6.2.2 `useBrandMemoriesStore` — EXISTING (M5, verify)

File: `src/stores/brand-memories.ts`. State + actions: `fetchMemories`, `saveMemory`, `deleteMemory`, `updateMemory`. No change in this PRD. Cluster 05 consumes these for the Brand Kit Memory tab UI.

#### 6.2.3 `useChatProductReferencesStore` — NEW

File: `src/stores/chat-product-references.ts`. Per-conversation chip state.

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useChatStore } from '@/stores/chat'

import type { ChatProductReference } from '@/types/kova/chat'

const MAX_PRODUCT_REFERENCES = 20

export const useChatProductReferencesStore = defineStore('chat-product-references', () => {
  const chatStore = useChatStore()

  // Reactive derivation — the active conversation's references
  const activeReferences = computed<readonly ChatProductReference[]>(() => {
    const conv = chatStore.conversations.find((c) => c.id === chatStore.activeConversationId)
    return conv?.product_references ?? []
  })

  const isAtCapacity = computed(() => activeReferences.value.length >= MAX_PRODUCT_REFERENCES)

  async function importProducts(conversationId: string, incoming: readonly ChatProductReference[]): Promise<void> {
    const conv = chatStore.conversations.find((c) => c.id === conversationId)
    if (!conv) throw new Error(`Conversation ${conversationId} not found`)

    const existingIds = new Set(conv.product_references.map((r) => r.product_id))
    const deduped = incoming.filter((r) => !existingIds.has(r.product_id))
    const merged = [...conv.product_references, ...deduped].slice(0, MAX_PRODUCT_REFERENCES)

    if (merged.length === conv.product_references.length) return // no-op

    await persistAndPatch(conversationId, merged)
  }

  async function removeReference(conversationId: string, productId: string): Promise<void> {
    const conv = chatStore.conversations.find((c) => c.id === conversationId)
    if (!conv) return
    const next = conv.product_references.filter((r) => r.product_id !== productId)
    if (next.length === conv.product_references.length) return // no-op
    await persistAndPatch(conversationId, next)
  }

  async function clearReferences(conversationId: string): Promise<void> {
    await persistAndPatch(conversationId, [])
  }

  async function persistAndPatch(conversationId: string, next: readonly ChatProductReference[]): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: next })
      .eq('id', conversationId)
    if (error) throw new Error(error.message)

    // Immutable local patch
    chatStore.conversations = chatStore.conversations.map((c) =>
      c.id === conversationId ? { ...c, product_references: next } : c
    )
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

**Constraint** — `MAX_PRODUCT_REFERENCES = 20` enforced both here AND in the §4.1 trigger (`validate_chat_product_references`).

### 6.3 Composables

#### 6.3.1 `useAIChat()` — EXISTING (M5, verify + minor extension)

File: `src/composables/use-chat.ts`. Returns `{ providerID, modelID, activeTab, isConfigured, ensureChat, reconnectChat, resetChat, toUIMessages, refreshActiveBrandMemories, setActiveCampaignType, setActiveChatAttachmentsForAI, setAssistantFinishHandler }`.

**EXTEND this PRD:** add `setActiveProductReferences(refs: readonly ChatProductReference[]): void` exported from `useAIChat()`. Stores into a module-scope `activeProductReferences` ref that `prepareCall` consumes when building the system prompt. Reset to `[]` on `resetChat()`.

Update `prepareCall` to pass `productReferences: activeProductReferences.value` into `buildSystemPrompt(...)`.

#### 6.3.2 `buildSystemPrompt(input)` — EXISTING (M5, extend)

File: `src/ai/build-system-prompt.ts`. Current 11-layer composition (per M5/M5.5 work). **EXTEND** with two new layers — see §6.3.2.1 below for the full updated layer order.

##### 6.3.2.1 Layer order (post-extension)

```
Layer  1: SYSTEM_PROMPT                       (immutable, locked per CLAUDE.md)
Layer  2: EMAIL_GUIDELINES                    (existing)
Layer  3: EMAIL_SECTIONS                      (existing)
Layer  4: formatBrandKitPrompt(brand)         (existing — incl. brand.voice TEXT field)
Layer  4b: formatToneSnippets(brand)          (NEW — cap 10 entries, JSONB array order)   ← added by this PRD
Layer  5: IMAGE_HANDLING                      (existing)
Layer  6: campaignLayer                       (existing — campaign-type-specific)
Layer  7a: MEMORY_INSTRUCTIONS                (existing)
Layer  7b: formatBrandMemories(memories)      (existing — EXTEND: cap 50 newest by created_at DESC)  ← extended by this PRD
Layer  8: formatAvailableImages(images)       (existing — cap 20)
Layer  8b: formatChatAttachments(attachments) (existing — ephemeral, current turn)
Layer  9: formatProductReferences(refs)       (NEW — cap 20 hybrid payloads)              ← added by this PRD
```

Layers join with `\n\n---\n\n` separator (existing pattern in `buildSystemPrompt` line 102). Layers 4b + 9 conditional — render only when `brand.tone_snippets.length > 0` or `refs.length > 0` respectively.

##### 6.3.2.2 `formatToneSnippets(brand)` (NEW)

```typescript
const MAX_TONE_SNIPPETS = 10

function formatToneSnippets(brand: Brand | null): string | null {
  const snippets = (brand?.tone_snippets ?? []) as ReadonlyArray<{ id: string; label: string; content: string }>
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

##### 6.3.2.3 `formatBrandMemories(memories)` (EXTEND — cap 50 newest)

Existing M5 `formatBrandMemories` is uncapped (line 105 in `build-system-prompt.ts`). Founder-locked §12.12 item 2 adds a cap.

```typescript
const MAX_BRAND_MEMORIES = 50

function formatBrandMemories(memories: readonly BrandMemory[]): string {
  // Sort newest-first by created_at DESC, then take first MAX_BRAND_MEMORIES.
  // Auto-prunes stale memories from prompt; user takes no action.
  const sorted = [...memories].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const limited = sorted.slice(0, MAX_BRAND_MEMORIES)
  const memoryLines = limited.map((m) => `- ${m.content}`).join('\n')
  const overflow = sorted.length > MAX_BRAND_MEMORIES
    ? `\n\n(${sorted.length - MAX_BRAND_MEMORIES} older memories exist; using the most recent ${MAX_BRAND_MEMORIES} per the configured cap.)`
    : ''
  return `## Brand Memories
The following are things you've learned about this brand from previous conversations.
Apply these in all your design decisions for this brand.

${memoryLines}${overflow}`
}
```

##### 6.3.2.4 `formatProductReferences(refs)` (NEW)

```typescript
function formatProductReferences(refs: readonly ChatProductReference[]): string | null {
  if (refs.length === 0) return null
  const lines = refs.map((r, i) => {
    const priceLine = r.price_high && r.price_high !== r.price_low
      ? `   Price: ${r.price_low}–${r.price_high} ${r.currency}`
      : `   Price: ${r.price_low} ${r.currency}`
    return `${i + 1}. ${r.title} (product_id: ${r.product_id}, handle: ${r.handle})\n${priceLine}\n   Primary image: ${r.primary_image_url}`
  }).join('\n')
  return `## Active Product References
The user has pinned the following products as the subject of this design session. They persist across every turn until removed.

Use these as the products to feature in the email design. Call \`get_variant\` for full variant detail (sizes, colors, per-variant price/media), \`get_collection\` if the user wants to pull related products, and other Shopify tools as needed. Insert product images via \`placeMediaImage\` on canvas nodes.

${lines}`
}
```

#### 6.3.3 `createKovaTools(store)` — EXISTING (extend per §5.5)

File: `src/ai/kova-tools.ts`. Per §5.5 — REFACTOR drops `bestsellers` from `search_products.sort` picklist + adds `{ error, code: 'no_connection' }` return when `shopify_connections` row missing for the active brand.

Each of the 5 Shopify tools gets a leading guard:

```typescript
async function hasShopifyConnection(brandId: string): Promise<boolean> {
  const { data } = await supabase
    .from('shopify_connections')
    .select('id', { head: false, count: 'exact' })
    .eq('brand_id', brandId)
    .maybeSingle()
  return !!data
}

const NO_CONNECTION = {
  error: 'No Shopify connection for this brand. Ask the user to connect a Shopify store via Account → Integrations.',
  code: 'no_connection'
} as const
```

Then each tool's `execute` becomes:

```typescript
execute: async (args) => {
  const brandId = activeBrandId()
  if (!(await hasShopifyConnection(brandId))) return NO_CONNECTION
  // ... existing query ...
}
```

#### 6.3.4 `createAITools(store)` — EXISTING (extend per §5.5 + Cluster 07a)

File: `src/ai/tools.ts`. Currently composes `toolsToAI(CORE_TOOLS, ...)` + `createKovaTools(store)`.

**EXTEND this PRD:** the existing `createKovaTools(store)` return is extended with two new wrappers — `createSliceFromSelection` + `addMeasurement` — that call into Cluster 07a engine APIs. Both are thin: they call `figma.createSliceFromSelection({ name })` / `figma.currentPage.addMeasurement({ nodeId, side }, { nodeId, side }, options?)` (07a §7.1b page-level API — measurements are NOT a NodeType; W0-7 propagation 2026-05-19) and report success or error. No new mutation logic here; the engine owns the implementation.

```typescript
// NEW in kova-tools.ts (Cluster 10 PRD adds; Cluster 07a ships the engine API surface)
const createSliceFromSelection = tool({
  description: 'Create a Slice node covering the current selection. Slices define export regions.',
  inputSchema: valibotSchema(v.object({
    name: v.optional(v.pipe(v.string(), v.description('Optional name for the slice (e.g. "hero", "footer")')))
  })),
  execute: async ({ name }) => {
    const figma = makeFigmaFromStore(store)
    const slice = figma.createSliceFromSelection({ name })
    return slice ? { success: true, sliceId: slice.id } : { error: 'No selection to slice', code: 'no_selection' }
  }
})

const addMeasurement = tool({
  description: 'Add a persistent Measurement annotation anchored to two nodes by side (page-level on CANVAS — 07a §7.1b).',
  inputSchema: valibotSchema(v.object({
    canvas_id: v.pipe(v.string(), v.description('Target CANVAS-typed SceneNode ID (measurements live on the page, not on a node)')),
    start_node_id: v.pipe(v.string(), v.description('Source anchor node ID — must descend from canvas_id')),
    start_side: v.picklist(['TOP', 'RIGHT', 'BOTTOM', 'LEFT'] as const),
    end_node_id: v.pipe(v.string(), v.description('Target anchor node ID — must descend from canvas_id')),
    end_side: v.picklist(['TOP', 'RIGHT', 'BOTTOM', 'LEFT'] as const),
    offset_type: v.optional(v.picklist(['INNER', 'OUTER'] as const)),
    offset_value: v.optional(v.pipe(v.number(), v.description('Relative for INNER, fixed for OUTER'))),
    free_text: v.optional(v.pipe(v.string(), v.description('Optional override label; default is the auto-distance string')))
  })),
  execute: async ({ canvas_id, start_node_id, start_side, end_node_id, end_side, offset_type, offset_value, free_text }) => {
    const figma = makeFigmaFromStore(store)
    const page = figma.getCanvas(canvas_id) // CANVAS-typed SceneNode (07a §7.1b)
    if (!page) return { error: 'Canvas not found', code: 'canvas_missing' }
    try {
      const m = page.addMeasurement(
        { nodeId: start_node_id, side: start_side },
        { nodeId: end_node_id, side: end_side },
        { offset: offset_type ? { type: offset_type, value: offset_value ?? 0 } : undefined, freeText: free_text }
      )
      return { success: true, measurementId: m.id }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Could not create measurement', code: 'invalid_anchors' }
    }
  }
})
```

**Cluster 07a dependency:** if engine APIs don't ship in time, gate these two tools behind a `figma.createSliceFromSelection` / `figma.currentPage.addMeasurement` existence check + omit from the registered tool set with a logged warning. Phase A is the right time to verify alignment.

### 6.4 Components

#### 6.4.1 `<ChatPanel>` — REFACTOR existing

File: `src/components/ChatPanel.vue`. Currently a near-stub. REFACTOR to:

| Prop | Type | Notes |
|---|---|---|
| `canvasId` | `string` | Required. Drives which canvas's chats to load. |
| `brandId` | `string` | Required. Drives which brand's memories + product catalog. |

| Emit | Payload | Notes |
|---|---|---|
| `request-product-import` | `void` | Optional — emitted when user clicks an empty-chip-row CTA "Import products from Shop" (Phase B polish). |

Composition mirrors `ChatPopup.vue` but mounted inside the right-panel slot (no `fixed bottom-4 left-4` chrome; instead `h-full w-full flex flex-col`). Adds the `<ProductReferenceChipRow>` above the composer.

#### 6.4.2 `<ChatInput>` — EXTEND existing

File: `src/components/chat/ChatInput.vue`. EXTEND to accept and render the chip row **BELOW** the existing attachment-thumbnail row (matches §3.2 founder-locked stack order `image attachment thumbnails → product chip row → textarea → send/stop buttons` per §12.12 item 7; W4 C-MED28 reconciles a prior draft that incorrectly said "above").

| New Prop | Type | Notes |
|---|---|---|
| `productReferences` | `readonly ChatProductReference[]` | Active conversation's chips. |

| New Emit | Payload | Notes |
|---|---|---|
| `remove-reference` | `{ productId: string }` | Fired when user clicks `×` on a chip. |

#### 6.4.3 `<ProductReferenceChipRow>` — NEW

File: `src/components/chat/ProductReferenceChipRow.vue`. Stateless presentation; consumes the prop array + emits remove events. Renders one `<ProductReferenceChip>` per entry; row collapses to height 0 when empty.

| Prop | Type | Notes |
|---|---|---|
| `references` | `readonly ChatProductReference[]` | Array of active chips. |

| Emit | Payload | Notes |
|---|---|---|
| `remove` | `{ productId: string }` | Per-chip removal. |

#### 6.4.4 `<ProductReferenceChip>` — NEW

File: `src/components/chat/ProductReferenceChip.vue`. Stateless leaf.

| Prop | Type | Notes |
|---|---|---|
| `reference` | `ChatProductReference` | One chip's data. |

| Emit | Payload | Notes |
|---|---|---|
| `remove` | `void` | Fired on `×` click. |

Layout: 48×48 image (or monogram fallback), product name truncated to ~14 chars, `×` icon button at top-right. Tooltip on chip showing full product name + price range.

#### 6.4.5 `<ChatMessage>` — EXISTING (verify, no change)

File: `src/components/chat/ChatMessage.vue`. Renders one message (user or assistant). Reused as-is.

#### 6.4.6 `<ChatPopup>` — DELETE

File: `src/components/chat/ChatPopup.vue`. Remove. `EditorView.vue` line 33 import + line 282 `<ChatPopup>` render also removed (Cluster 06 owns the EditorView refactor that mounts `<ChatPanel>` into the right-panel slot instead).

### 6.5 Drag-drop / DnD handlers

No new DnD types in this PRD. Composer chips are imported via a **click action** ("Import N to chat" button in Shop panel), not drag-drop. Saved-block drag-drop (`application/x-kova-saved-block` per Q24) is owned by Cluster 05; saved blocks spawn TEXT nodes on canvas — they do not become chat references.

### 6.6 Type definitions

Add to `src/types/kova/chat.ts`:

```typescript
export interface ChatProductReference {
  readonly product_id: string
  readonly title: string
  readonly primary_image_url: string | null
  readonly price_low: string                 // formatted currency-symbol-less number, e.g. "29.00"
  readonly price_high: string | null         // null if not a range
  readonly currency: string                  // ISO 4217 code, e.g. "USD" — derived from shopify_connections.currency
  readonly handle: string                    // Shopify URL handle, e.g. "navy-stripe-tee"
  readonly added_at: string                  // ISO 8601 timestamp
}

// EXTEND existing ChatConversation
export interface ChatConversation {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly canvas_id: string
  readonly title: string | null
  readonly created_at: string
  readonly updated_at: string
  readonly product_references: readonly ChatProductReference[]   // NEW
}
```

---

## 7. Tool layer / canvas-engine touches

### 7.1 `packages/core/` modifications

**None directly in this PRD.** Slice + Measurement NodeTypes are Cluster 07a's scope; the AI-tool wrappers in §6.3.4 register against engine APIs that Cluster 07a ships. CLAUDE.md core-lock is not lifted by this PRD.

### 7.2 Scene-graph extensions

None in this PRD. Cluster 07a owns SLICE NodeType (17th NodeType) + page-level Measurement methods on the CANVAS-typed SceneNode (per Q1 + Q11 — Q11's "MEASUREMENT = 18th NodeType" was superseded 2026-05-17; measurements are NOT a NodeType per PRD 07a §7.1b / §12.10; W0-7 propagation 2026-05-19).

### 7.3 Renderer changes

None in this PRD. Cluster 07a owns Slice region overlay + Measurement annotation renderer.

### 7.4 App-level overlays

None in this PRD. Cluster 07a owns the overlay surfaces.

### 7.5 AI tool registrations

Per `createKovaTools(store)` extension in §6.3.3 + §6.3.4:

| Tool name | Source | Disposition | Tool surface |
|---|---|---|---|
| `search_products` | M9 (`kova-tools.ts`) | REUSE + REFACTOR (drop `bestsellers`; add `no_connection` error) | Shopify catalog query |
| `get_collection` | M9 | REUSE + REFACTOR (add `no_connection` error) | Shopify collection + member products |
| `get_variant` | M9 | REUSE + REFACTOR (add `no_connection` error) | Variant + parent product + media |
| `get_active_discounts` | M9 | REUSE + REFACTOR (add `no_connection` error) | Active discount codes |
| `get_shop_context` | M9 | REUSE + REFACTOR (add `no_connection` error) | Currency, timezone, locale, top collections |
| `placeMediaImage` | M5 | REUSE | Set Supabase Storage image as fill on a node |
| `saveBrandMemory` | M5 | REUSE | Persist a `brand_memories` row |
| `createSliceFromSelection` | Cluster 07a (engine) + this PRD (AI wrapper) | NEW (this PRD) | Wraps `figma.createSliceFromSelection({ name })` |
| `addMeasurement` | Cluster 07a (engine) + this PRD (AI wrapper) | NEW (this PRD) | Wraps `figma.currentPage.addMeasurement({ nodeId, side }, { nodeId, side }, options?)` (07a §7.1b page-level API — NOT a NodeType factory; W0-7 propagation 2026-05-19) |

Engine tools registered via `toolsToAI(CORE_TOOLS, ...)` in `createAITools(store)` continue per M5 — those expose the CORE engine surface (frame creation, text nodes, layout, etc.) as AI tools. No change to that wiring in this PRD.

---

## 8. Acceptance criteria

### 8.1 Right-panel migration

- [ ] Right panel has exactly two tabs visible: Design and **AI** (default-active on first canvas open per PRD 06 §12.13 founder ratification 2026-05-17). Prototype tab is NOT rendered anywhere in Kova. Tab labels visible at all viewport widths ≥ 1024px.
- [ ] Clicking the AI tab activates a `<ChatPanel>` content slot that renders empty-state, message list (if messages exist), per-conversation tab strip, and composer.
- [ ] Default-active tab on first canvas open = **AI** (per PRD 06 §12.13 founder ratification 2026-05-17; W0-7 propagation 2026-05-19; W4 CT-005 close-out). Subsequent opens read per-canvas `localStorage[right-panel-tab:${canvasId}]`.
- [ ] The previous `<ChatPopup>` floating element no longer renders on `/canvas/:canvasId`. Removed from `EditorView.vue`.
- [ ] Chat persistence (per-canvas, multiple conversations) works identically to M5 — switching canvases switches the conversation list; switching tabs within a canvas switches the active message stream.
- [ ] Switching from canvas A to canvas B preserves canvas A's chat state (per-canvas independence per M5 decision); returning to canvas A restores its active conversation + messages from Supabase.

### 8.2 Composer-chip product references

- [ ] User multi-selects N products in the Shop panel (Cluster 06 ships the panel) + clicks "Import N to chat" → those products appear as composer chips in the active AI-tab conversation's chip row. Panel selection clears post-import per Shopify spec §4.1.
- [ ] Each chip shows: 48×48 thumbnail (or monogram fallback if no image), product name truncated, `×` button.
- [ ] Clicking `×` removes that single chip. Removing the last chip leaves the chip row empty (collapses to height 0).
- [ ] Importing the same product twice does NOT create a duplicate chip (de-dupe by `product_id`).
- [ ] Reloading the page restores the chip set (hydrates from `chat_conversations.product_references`).
- [ ] Sending a message does NOT clear chips. Chips persist across every turn until `×`'d (per Shopify spec D3).
- [ ] When 20 chips active, "Import N to chat" in Shop panel disables with a tooltip "Max 20 references — remove some first."
- [ ] Switching chat conversations within a canvas swaps the active chip set (each conversation has its own).

### 8.3 System-prompt builder

- [ ] When the user sends a message and the active brand has ≥ 1 tone snippet, the outgoing system prompt contains a "## Brand Voice Exemplars" block with up to 10 numbered entries (first 10 by JSONB array order). Verifiable by enabling dev "Copy log" button in `ChatPanel`.
- [ ] When the active conversation has ≥ 1 product reference, the outgoing system prompt contains an "## Active Product References" block with one entry per chip (max 20) — incl. product_id, title, primary_image_url, price/price_range, handle.
- [ ] When tone snippets and product references are both empty, neither layer is rendered (no empty headers).
- [ ] `SYSTEM_PROMPT` constant in `src/ai/system-prompt.md` is byte-identical to its M5 form (CLAUDE.md hard constraint — verifiable via git diff).
- [ ] Layered prompt joined with `\n\n---\n\n` separator (existing pattern).

### 8.4 AI tool layer

- [ ] `search_products` schema no longer accepts `bestsellers` as a `sort` value (`v.safeParse` fails for that value).
- [ ] Each of the 5 Shopify tools returns `{ error, code: 'no_connection' }` (NOT empty arrays / nulls) when invoked for a brand with no `shopify_connections` row.
- [ ] `createSliceFromSelection` AI tool calls `figma.createSliceFromSelection(...)` from Cluster 07a engine API and returns `{ success: true, sliceId }` on success / `{ error: 'No selection to slice', code: 'no_selection' }` on no-selection / `{ error: 'Slice engine API not available', code: 'engine_unavailable' }` if Cluster 07a engine API is missing at registration time.
- [ ] `addMeasurement` AI tool calls `figma.currentPage.addMeasurement(...)` (07a §7.1b page-level API — NOT a NodeType factory; W0-7 propagation 2026-05-19) and returns `{ success: true, measurementId }` / `{ error: ..., code: 'invalid_anchors' }` / `{ error: 'Measurement engine API not available', code: 'engine_unavailable' }` (W4 C-LOW10.5: `engine_unavailable` added to acceptance to match Plan 10 Tasks 10 + 11; reserved for the runtime existence-check gate from §6.3.4 — fires when Cluster 07a slips and the engine API is absent at AI-tool registration).
- [ ] All AI tools are valibot-validated via `valibotSchema()` per CLAUDE.md hard constraint (no Zod).
- [ ] ToolLoopAgent + `@ai-sdk/anthropic` + the 16384 max output token budget + 50 step limit are unchanged from M5.

### 8.5 Server-side proxy + auth

- [ ] `ANTHROPIC_API_KEY` is never readable in the browser bundle (verifiable via `vite build --report` + grep of dist).
- [ ] Every browser → Anthropic request flows through `POST /api/ai-proxy/v1/messages` and carries a `Authorization: Bearer <supabase-jwt>` header.
- [ ] Daily rate limit (200 generations/user) enforced atomically via `try_increment_generation` RPC; 201st request in a UTC day returns 429 with `retry_after` seconds.

### 8.6 Sub-processor disclosure

- [ ] Privacy policy + RoPA (Cluster 01) include a clause naming Anthropic as a sub-processor receiving "user chat messages, attached image URLs, brand kit, brand memories, tone snippets, active product-reference summaries, and tool-call results for AI-assisted email design."
- [ ] Privacy policy + RoPA clause is reviewed by Cluster 01 before Wave 6 closes.

---

## 9. Test plan

### 9.1 Unit tests

| Target | File | Coverage |
|---|---|---|
| `formatToneSnippets` cap + order | `tests/ai/build-system-prompt.test.ts` (NEW) | 0 snippets → null; 1 snippet → 1 entry; 10 snippets → 10; 11 snippets → 10 + overflow note. Verify JSONB array order preserved. |
| `formatProductReferences` payload shape | same file | 0 refs → null; 1 ref → 1 entry; 20 refs → 20 entries. Verify single-price vs price-range branching. |
| `buildSystemPrompt` layer composition | same file | Verify Layer 1 immutable; layer-4b inserted when tone snippets exist; layer-9 inserted when refs exist; both omitted when empty. |
| `useChatProductReferencesStore.importProducts` de-dupe | `tests/unit/stores/chat-product-references.test.ts` (NEW) | Importing same product_id twice → only 1 chip. Importing 25 → only 20 stored. |
| `useChatProductReferencesStore.removeReference` | same file | Removing the last chip → empty array. Removing a non-existent id → no-op. |
| 5 Shopify tools no-connection error | `tests/engine/shopify/ai-tools.test.ts` (EXTEND) | Mock `shopify_connections` SELECT to return null → assert each tool's `execute` returns `{ error, code: 'no_connection' }`. |
| `search_products.sort` schema | same file | `v.safeParse(searchProductsSchema, { query: 'x', sort: 'bestsellers' })` fails. `sort: 'newest'` succeeds. |
| `createSliceFromSelection` AI wrapper | `tests/unit/ai/slice-tool.test.ts` (NEW) | Mock `makeFigmaFromStore` → `figma.createSliceFromSelection` returns mock slice → tool returns success. Returns null → tool returns no_selection. |
| `addMeasurement` AI wrapper | `tests/unit/ai/measurement-tool.test.ts` (NEW) | Similar — mock + assert. |

### 9.2 Integration tests

| Target | File | Coverage |
|---|---|---|
| `chat_conversations.product_references` round-trip | `tests/integration/chat-product-references.test.ts` (NEW) | Insert conversation → update product_references → re-read → assert payload identical. |
| `validate_chat_product_references` trigger | same file | INSERT with `product_references` as non-array → expect exception. INSERT with 21 entries → expect exception with "exceeds maximum" message. |
| RLS isolation | same file | User A's conversation invisible to User B. UPDATE by User B against User A's conversation fails. |
| `ai-proxy/v1/messages` rate limit | `tests/api/ai-proxy/messages.test.ts` (EXTEND existing) | 200 OK requests → 201st returns 429. Body > 4MB → 413. No JWT → 401. (Mostly existing M5 coverage; verify intact.) |
| 5 Shopify tools no-connection error path | `tests/integration/shopify-tools.test.ts` (NEW or extend) | Brand with no `shopify_connections` row → call each tool via the agent → assert error response surfaces in tool result. |

### 9.3 E2E tests (Playwright)

| Scenario | File | Coverage |
|---|---|---|
| Right-panel AI tab activates ChatPanel | `tests/e2e/ai-chat-panel.spec.ts` (NEW) | Login → open canvas → click AI tab → assert empty-state visible → type message → assert AI response streams in. |
| Multi-conversation tab strip | same file | Click "New chat" → new tab appears → switch to first → previous messages re-render. |
| Composer-chip flow (no Shopify) | same file | User with no Shopify connection → AI tab shows no chip row UI; tools return no_connection errors visible in AI response. |
| Composer-chip flow (with Shopify) | `tests/e2e/composer-chip-flow.spec.ts` (NEW) | Connect Shopify (use test store fixture) → wait for sync → open Shop panel → select 3 products → click "Import 3 to chat" → assert 3 chips in chip row → send message → assert AI response references the products → reload page → assert 3 chips still present → click `×` on one → assert 2 chips remain. |
| Tone-snippet injection | same file or new spec | Add 2 tone snippets via Brand Kit (Cluster 05) → open AI tab → send message → enable dev "Copy log" → assert system prompt contains "## Brand Voice Exemplars" with 2 entries. |
| 20-chip max | same file | Import 21 products → assert only 20 chips render and "Import N to chat" button shows max-reached tooltip. |
| Brand-memory persistence | same file | Send message: "remember that we ship from Brooklyn" → AI calls `saveBrandMemory` → assert `brand_memories` row exists → start new chat → send message: "where do we ship from?" → assert AI references Brooklyn in response. |

### 9.4 Manual QA (browser smoke per `feedback_browser_smoke_test_before_done`)

Founder runs at `localhost:1420` before merge to master:

1. **Login** → magic link → land on dashboard. Dark theme.
2. **Open a brand with no Shopify** → enter canvas → click right-panel AI tab → assert empty state visible. Type "design a product hero" → assert AI streams a design without product references (no chips visible).
3. **Connect Shopify on the brand** (Account → Integrations) → wait for sync → return to canvas.
4. **Open Shop panel** → select 3 products → click "Import 3 to chat" → assert 3 chips in chip row → send "build me an email featuring these" → assert AI uses product titles + images in the design.
5. **Click `×` on one chip** → assert chip count = 2.
6. **Reload page** → assert 2 chips still present.
7. **Open new chat tab** → assert no chips in the new tab (per-conversation scope).
8. **Switch back to first tab** → assert 2 chips re-render.
9. **Add 2 tone snippets via Brand Kit Memory tab (Cluster 05)** → return to AI chat → send "write me a hero headline" → enable dev "Copy log" → paste into a text editor → assert the system prompt contains "## Brand Voice Exemplars" with both snippets.
10. **Send "remember we ship from Brooklyn"** → assert AI says "I'll remember that" + `brand_memories` row created (verify via Supabase Studio).
11. **Open another canvas in same brand** → start a new chat → send "where do we ship from?" → assert AI references Brooklyn.
12. **Disconnect Shopify** → return to canvas → AI tab → send "find me a navy product" → assert response includes "No Shopify connection for this brand" guidance.
13. **Try to send a 4MB+ message** → assert 413 error visible in toast.
14. **Send 200 messages in a day** → assert 201st returns "Daily limit reached. Resets at midnight UTC."
15. **Verify `vite build --report` dist bundle has no string `ANTHROPIC_API_KEY` value** (sanity check — server-only).

---

## 10. Rollout phasing

### Phase A — First deploy (this PRD)

Everything in §2.1 ships in Phase A. Specifically:

- Right-panel AI tab migration (`<ChatPopup>` removed; `<ChatPanel>` mounted in right-panel slot)
- Composer-chip schema migration + store + component row
- `buildSystemPrompt()` extension (tone snippets + product references)
- 5 Shopify tools REFACTOR (no_connection error + drop bestsellers sort)
- `createSliceFromSelection` + `addMeasurement` AI tool wrappers (gated on Cluster 07a engine API availability — if 07a slips, Phase A ships without these two wrappers)
- Sub-processor disclosure copy contributed to Cluster 01's privacy policy + RoPA

### Phase B — Follow-up (optional polish)

- "AI is using N voice references" indicator inside the AI tab (§3.3)
- "Import products from Shop" CTA inside an empty chip row (links back to Shop panel)
- Per-conversation campaign-type lock (currently per-send)
- Tone-snippet pinning (override JSONB array order via a `users.preferences.toneSnippets.pinnedIds` per-user pin list — owned by Cluster 12)

### Feature gates

No runtime feature flags in this PRD. The right-panel tab migration is a structural change that can't be cleanly flagged at the component level without rendering both surfaces (wasted code). If founder wants a kill-switch, recommend a build-time env var `KOVA_AI_TAB_MIGRATION=true|false` that gates the EditorView render (default `true`; flip to `false` to bring back `<ChatPopup>` in a Vercel hot rollback). Defer the env-var until founder requests it.

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on (from them) | What they depend on us for |
|---|---|---|
| **05 — Brand Kit & Drag-Drop** | `brands.tone_snippets JSONB` schema (Cluster 05 migration); reactive read of `selectedBrand.tone_snippets[]` via `useBrandsStore`; Brand Kit Memory tab UI (view / edit / delete brand memories surfaced to user); D-3 confirm-before-write guardrail for AI-extracted voice / tone; **NEW (§12.12 item 11):** drag-to-reorder UI on tone-snippet rows + helper copy `AI uses the first 10 — reorder to prioritize.` (because Phase A `formatToneSnippets` uses first-10 JSONB array order — user controls priority via reorder) | `formatToneSnippets` consumer pattern; brand-memory CRUD APIs already exposed via `useBrandMemoriesStore` (M5) |
| **06 — Canvas Editor Core Chrome** | Right-panel **two-tab** framework (Design + AI — **NO Prototype tab**; scope plan §3 Cluster 06 "Prototype DEFERRED" line is superseded by "Prototype out of scope entirely" per founder ratification 2026-05-15); Shop panel UI (product grid + multi-select + "Import N to chat" button); EditorView refactor to remove `<ChatPopup>` and mount `<ChatPanel>` in the right-panel AI slot; **NEW (§12.12 item 5):** Shop panel's "Import N to chat" callback MUST trigger right-panel tab switch (Design → AI) before returning, so user sees chips populate immediately after click | `<ChatPanel>` component + import callback for the "Import N to chat" button (writes onto `chat_conversations.product_references` via `useChatProductReferencesStore.importProducts`) |
| **07a — Canvas Engine Core + Renderer** | `figma.createSliceFromSelection({ name })` engine API (SLICE = 17th NodeType per Q1) + `figma.currentPage.addMeasurement({ nodeId, side }, { nodeId, side }, options?)` page-level engine API (Q11 — superseded 2026-05-17: measurements are NOT a NodeType per 07a §7.1b / §12.10; W0-7 propagation 2026-05-19) | AI tool wrappers `createSliceFromSelection` + `addMeasurement` (so AI can invoke the engine surface) |
| **01 — Auth & Identity** | Privacy policy + RoPA documentation (this PRD contributes a sub-processor disclosure clause naming Anthropic + the chat data flow); `delete-account-cron` cascade includes `db` step that CASCADEs `chat_conversations` + `brand_memories` rows on user delete | Disclosure copy fragment for §11.1; per-user atomic rate limit RPC `try_increment_generation` (already built in M5) |
| **04 — Account & Stripe** | Future per-plan rate-limit lookup (Free / Pro / Studio plans pass distinct `p_daily_limit` to `try_increment_generation`) | None (per-plan limits a Cluster 04 extension on the existing rate-limit RPC; non-blocking for this PRD) |
| **11 — Shared UI Infrastructure** | `useToast()`, `<KovaModal>`, skeletons, error boundary (for chat init failures), `idempotency_keys` table (for any future mutation — not used in this PRD) | None at runtime |
| **02 — Onboarding & Dashboard** | Dashboard chrome (entry point to /canvas); StoreTypeStep Shopify connect (so user has a Shopify connection to power the 5 AI tools) | None at runtime |
| **12 — Settings & User Preferences** | Future Phase B `users.preferences.toneSnippets.pinnedIds` JSONB sub-path for tone-snippet pinning | None |

### 11.1 Hygiene rules from `00e §6`

Acknowledged + enforced in this PRD:

- **No marketing-site spec** (§6 #1): N/A — this PRD is entirely inside the authenticated app.
- **No live multi-device canvas sync promises** (§6 #2): The chat panel does NOT promise live multi-device sync. M5 model — chats persist per-canvas server-side; multi-device sync (e.g. user opens canvas A on phone + laptop) reflects last-write-wins on server, not live CRDT propagation. Realtime is used for streaming the AI response back to the originating device, NOT for cross-device chat-state mirroring.
- **D-5E staging trigger** (§6 #3): N/A directly — this PRD does not stand up new infrastructure. The existing `ai-proxy` already lives in production via the M5 deployment; staging Supabase is the same project used for canvas / dashboard.
- **D-3 RoPA disclosure** (§6 #4): **REQUIRED CONTRIBUTION.** This PRD contributes the following copy fragment to the Cluster 01 privacy-policy + RoPA documents:
  > **AI design generation (Anthropic):** When users interact with Kova AI Chat, the following data is sent to Anthropic (sub-processor) to generate design suggestions: the user's chat message text, image URLs attached to the message (Supabase Storage public URLs), the active brand's kit (colors, fonts, voice, tone snippets, saved blocks), the brand's saved memories, available media library images for the brand, and active product-reference summaries imported from the user's Shopify catalog (product titles, images, prices, handles, product IDs). The AI's tool-call results (e.g. Shopify product / collection / variant rows) are also returned to Anthropic to continue the multi-step reasoning. Anthropic processes this data per its [Privacy Policy](https://www.anthropic.com/legal/privacy) and [Trust Center](https://trust.anthropic.com/). Anthropic does NOT use this data to train models (zero-data-retention is being negotiated for production — see Cluster 01 §12.2 risk for current state). Until ZDR is in place, the operator-batch deletion runbook documented in Cluster 01 §5.1.4.3 is the enforcement mechanism.
- **D-3 brand-voice guardrail** (§6 #5): N/A in this PRD (owned by Cluster 05 — confirm-before-write for AI-scraped voice + tone snippets). Acknowledged for awareness.

---

## 12. Risks + open questions

### 12.1 RISK (Medium) — Cluster 06 right-panel tab framework sequencing

This PRD assumes Cluster 06 ships a **two-tab** framework (Design + AI) in the right panel. Scope plan §3 Cluster 06 line 237 says "tab routing (Design only at MVP — Prototype DEFERRED)" — does NOT explicitly call out an AI tab. Founder ratified 2026-05-15 that Prototype is OUT OF SCOPE entirely (not just deferred), reducing the tab count to 2.

**Mitigation:** This PRD's §11 cross-cuts table makes the two-tab Design+AI framework a Cluster 06 deliverable explicitly. Cluster 06 PRD must adopt this in its own §3 + §6 surfaces and update the inspector-chrome rendering. Floating-popup fallback is rejected by founder (locked in 2026-05-15 PRD review — see §12.8); both clusters delay together if schedule slips.

### 12.2 RISK (Medium) — Cluster 07a engine API readiness for Slice + Measurement AI tools

The two new AI-tool wrappers (`createSliceFromSelection` + `addMeasurement`) call into Cluster 07a engine APIs that don't exist yet (Q1 + Q11 ratified the NodeType plan; engine implementation is Cluster 07a's Phase A scope).

**Mitigation:** Gate the two wrappers behind a runtime existence check on `figma.createSliceFromSelection` / `figma.currentPage.addMeasurement` (07a §7.1b page-level API — W0-7 propagation 2026-05-19). If absent at registration time (e.g. Cluster 07a slips into a later Phase), omit the two tools from the registered set with a `console.warn`. AI cannot call them; everything else still works. Phase A of this PRD can ship without them.

### 12.3 RISK (Low) — Composer-chip persistence layer interaction with M5 `onFinish` closure

M5's `ensureChat(conversationId, messages?)` closure captures `conversationId` at creation time so the stream persists against the right conversation even when the user switches tabs. Composer chips are tied to that same `conversationId`. If the user imports chips, switches tabs, then the in-flight stream finishes against tab A, the chips for tab A must already be on tab A's row (they were, at import time) — no race.

**Mitigation:** `useChatProductReferencesStore.importProducts(conversationId, ...)` takes an explicit conversationId. Write happens synchronously to Supabase before the user can switch tabs. No race window. Covered by E2E test in §9.3.

### 12.4 RISK (Low) — `validate_chat_product_references` trigger error UX

If a malformed `product_references` array somehow reaches Supabase (client-side validation bypassed), the trigger will RAISE an exception and the UPDATE fails. The client store's `persistAndPatch` catches the error and throws — the UI must surface a toast.

**Mitigation:** Wrap `useChatProductReferencesStore.importProducts` calls in `try / catch` at the import callsite (Cluster 06's "Import N to chat" handler) + show `toast.show('Could not import products. Please try again.', 'error')` on failure. Document in Cluster 06 PRD.

### 12.5 RISK (Low) — 4 MB body cap interaction with large chip sets

Composer chips serialize a per-chip hybrid payload into the outgoing message. 20 chips × ~250 bytes/chip = ~5 KB — well under 4 MB. Risk is theoretical; the cap is mostly hit by image attachments.

**Mitigation:** No action needed. Existing 413 error handling covers any edge case.

### 12.6 RISK (Low) — Tone-snippet cap mismatch with founder mental model

Dispatch recommends cap=10 with "first 10 by user-defined order." If a brand has 15 snippets, the 11th–15th never reach the AI. Founder needs to know.

**Mitigation:** Phase B ships a pinning mechanism (`users.preferences.toneSnippets.pinnedIds` JSONB sub-path; Cluster 12). Phase A: document the cap in the Brand Kit settings UI (Cluster 05) with a helper line "AI uses the first 10 snippets in this list. Reorder to control which ones."

### 12.7 RESOLVED 2026-05-15 — Composer-chip persistence scope

**Decision:** Per-conversation. Each chat tab has its own chips. Schema: `chat_conversations.product_references JSONB`. Aligns with M5's "independent chats per canvas" model — each chat tab = separate design session = separate reference set.

### 12.8 RESOLVED 2026-05-15 — Phase A path

**Decision:** No fallback. Right-panel migration ships in lockstep with Cluster 06. ChatPopup deleted in Phase A. Two clusters delay together if schedule slips. Founder accepted maintenance-cost-over-delay-risk tradeoff during PRD review.

### 12.9 RESOLVED 2026-05-17 — "AI is using N voice references" indicator

**Decision:** **Phase B.** Founder ratified during Round-2 PRD review. Defer the status pill below the AI tab header to a follow-up polish PRD. Phase A ships without the indicator; saves ~30 min and a small surface area. Core AI workflow is unaffected; user simply doesn't see a counter.

**Re-spec on activation:** When Phase B is scheduled, the pill renders below the tab strip header inside the AI tab. Content: `AI is using N voice references` where `N` = `min(toneSnippets.length, 10) + min(brandMemories.length, 50)`. Pill style: `.chip.subtle` per `kova-hifi.css`.

### 12.11 RESOLVED 2026-05-15 — Right-panel tab order + Prototype removal

**Decisions ratified by founder during PRD 10 review:**
- Final right-panel tab order: **Design / AI** (2 tabs only).
- Default-active tab on first canvas open: **AI** (per PRD 06 §12.13 founder ratification 2026-05-17 — surfacing the chat-first differentiator. Supersedes the earlier "Design default" pick from initial drafts; W0-7 propagation 2026-05-19; W4 CT-005 close-out 2026-05-19.). Subsequent opens persist per-canvas via `localStorage[right-panel-tab:${canvasId}]`.
- **Figma's Prototype tab is dropped entirely** from Kova's right-panel. Reason: Kova exports static email images, not clickable interactive prototypes. Prototype tab has zero use case in the email-design pipeline.
- Scope plan §3 Cluster 06 line 237 ("Design only at MVP — Prototype DEFERRED") is **superseded** by "Design + AI tabs only; Prototype out of scope entirely."

**Cluster 06 PRD amendment task:** Cluster 06 PRD §3 + §6 must reflect the 2-tab framework + remove all Prototype references from §6.4 inspector spec. (Pre-PRD task; recorded here for the Cluster 06 author's pickup list.)

### 12.10 RISK (Low) — Anthropic ZDR retention until launch

Until zero-data-retention (ZDR) is in place with Anthropic, the chat messages + product references + brand memories sent to Anthropic are subject to Anthropic's standard retention. Cluster 01 §12.2 documents the hybrid model (in-DB delete + manual operator email queue).

**Mitigation:** Founder ratified Phase A acceptance 2026-05-17 (Round-2 PRD review). Privacy policy + RoPA discloses the current state and names Anthropic as sub-processor. Founder + ops batch the `anthropic_deletion_log` rows weekly per Cluster 01 §5.1.4.3 operator runbook. Migrate to ZDR once volume justifies negotiation leverage.

### 12.12 RESOLVED 2026-05-17 — PRD Round-2 + Round-3 review (11 decisions)

Founder-locked during PRD 10 final review (after Round-1 §12.11):

1. **Voice-references indicator** → Phase B (see §12.9).
2. **Brand-memory injection cap** → **50 most recent** by `brand_memories.created_at DESC`. Auto-prunes stale memories; user takes no action. (Applied in §6.3.2 Layer 7b — `formatBrandMemories` sorts and slices first 50.)
3. **Chat conversation tabs per canvas cap** → **20**. New-chat button disables at 20 with tooltip `Max 20 chats per canvas — close one first.` Applied in §6.4.1 `<ChatPanel>` tab strip controls.
4. **Chip body click action** → **no-op** (display-only). Only the `×` button removes. Matches Slack/Discord attachment-chip pattern. Applied in §6.4.4 `<ProductReferenceChip>` spec.
5. **Auto-switch tab on import** → **Yes**. When user clicks Shop panel's "Import N to chat" button, right-panel jumps from Design → AI tab so user sees chips populate. Applied in Cluster 06 cross-cut (§11) + §6.2.3 store action.
6. **Chip `×` visibility** → **always visible at `opacity-60`, full opacity on hover/focus**. Accessibility-first; keyboard + screen-reader users can locate the action. Applied in §6.4.4 `<ProductReferenceChip>` spec + §3.2 visual table.
7. **Chip row position** → above textarea, **below** image attachment thumbnails. Top→bottom order in composer footer: `image attachments → product chips → textarea → send`. Applied in §3.2 visual table + §6.4.2 `<ChatInput>` spec.
8. **Anthropic ZDR** → **Phase A acceptable**. Ship with manual deletion queue (Cluster 01 §5.1.4.3) + privacy disclosure. Migrate to ZDR when volume justifies. (See §12.10.)
9. **New chat tab chip carry-over** → **empty by default**. Each chat tab is a fresh blank slate. User re-imports if desired. Matches per-conversation persistence model + Figma's "clear context" mental model. Applied in §6.2.3 store + §6.4.1 `<ChatPanel>` "New chat" handler.
10. **Tab strip overflow behavior** → **horizontal scroll with arrow buttons** at edges. Tab strip stays single-row. Matches Figma's frame/page-tabs pattern. Applied in §6.4.1 `<ChatPanel>` chat-tab strip spec.
11. **Tone-snippet cap=10 ordering** → **first 10 by user-defined order** (JSONB array order in `brands.tone_snippets`). User drags-to-reorder in Brand Kit settings (Cluster 05 owns the reorder UI + helper copy `AI uses the first 10 — reorder to prioritize.`).

**Cluster 05 cross-cut amendment:** Cluster 05 PRD must add reorder-handle UI on tone-snippet rows + the helper copy. Recorded in §11 cross-cuts.
**Cluster 06 cross-cut amendment:** Cluster 06 PRD's "Import N to chat" callback must trigger the right-panel tab switch (Design → AI) before returning. Recorded in §11 cross-cuts.

---

## 13. References

### 13.1 03-doc rows covered

- §2.5 Left panel Assets / Brand kit — cross-cut for tone-snippet read (this PRD consumes; Cluster 05 owns the schema + UI)
- §2.7 AI text suggestions — DEFERRED to Phase 2 (acknowledged here; no implementation)
- §2.13 Brand assets — cross-cut for `placeMediaImage` consumption (M5 already wired)
- §3C cross-cuts — chat persistence + brand memory (M5 already shipped; verify intact)

### 13.2 Q-decisions baked in

- **Q3 #14** — Boolean operations + 9 engine-ready features (acknowledged; AI tools that wrap these are CORE_TOOLS, already wired via M5)
- **Q8** — Tone snippets + saved blocks. Tone snippets injected as AI exemplars per this PRD's §6.3.2.2. Saved blocks owned by Cluster 05 (drag-drop to canvas, not chat).
- **Q11** — Measurement as first-class NodeType (Cluster 07a ships; this PRD wraps via `addMeasurement` AI tool)
- **Q1** — Slice as first-class NodeType (Cluster 07a ships; this PRD wraps via `createSliceFromSelection` AI tool)
- **Q24 partial** — saved-block payload is owned by Cluster 05; no chat impact

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-b/Kova Canvas - Final.html` (right-panel chrome source-of-truth, ~lines 75–1008 — Cluster 06 verifies exact line range)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B1 Toasts - Dark.html` (AI generation toast variant — referenced for AI-streaming feedback toast)

**Note:** No dedicated chat-panel hi-fi exists. Chat surface composes from existing M5 chrome (`ChatPanel.vue`, `ChatPopup.vue`, `ChatInput.vue`, `ChatMessage.vue`) + the right-panel inspector chrome from `Kova Canvas - Final.html`.

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` (spec — token vocabulary, component contracts, bans)
- `main-main-kova-scope/design-system/kova-hifi.css` (canonical dark CSS — chat panel surfaces use dark theme exclusively per `feedback_app_dark_website_light`)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (vocabulary cheat-sheet)

Light CSS NOT linked — chat panel is inside the authenticated app, dark-only.

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 10 + §5 template + §5.5 M9 reuse table + §5.6 audit ratification log
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` (operator manual followed for this draft)
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` (§2.A Cluster 10 lines 1946–2007 lifted as base + §1.E.1 Check 5 no-connection error UX gap)
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` (D-3 AI guardrail; D-5 cross-cutting picks)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` (§6 PRD-hygiene rules; §8 resolved-concerns log; multi-device-sync caveat)
- `kova-open-pencil-1/docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` Rev 2 (D1–D9 composer-chip architecture)

### 13.6 External sources cited

- [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy) (sub-processor disclosure copy)
- [Anthropic Trust Center](https://trust.anthropic.com/) (security posture)
- [Anthropic API — `/v1/messages`](https://platform.claude.com/docs/en/api/messages) (proxy target)
- [Vercel AI SDK — `@ai-sdk/anthropic`](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) (mandated SDK per CLAUDE.md)
- [Vercel AI SDK — ToolLoopAgent](https://ai-sdk.dev/docs/foundations/agents) (mandated agent loop per CLAUDE.md)
- [Supabase — `try_increment_generation` pattern](https://supabase.com/docs/guides/database/functions) (atomic counter via `SELECT ... FOR UPDATE`)
- [Anthropic — Prompt caching](https://docs.claude.com/en/docs/prompt-caching) (`cacheControl: { type: 'ephemeral' }` provider option)
- [Shopify Admin API — read scopes](https://shopify.dev/docs/api/usage/access-scopes) (sub-processor / data-flow context)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — chat panel is inside the authenticated app, dark-only
- `feedback_figma_ui_theme` — chat panel composes from Figma right-panel inspector idiom (tab strip + inspector slot)
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA gate
- `feedback_verify_with_docs` — Anthropic / Vercel AI SDK / Supabase docs cited in §13.6
- `feedback_explain_for_nontechnical_founder` — §1.1 plain language + §1.2 caveman both included
- `project_kova_avatar` — user-level scope (freelance email marketer; per-canvas chat aligns with per-campaign workflow)
- `project_design_system_master` — canonical paths cited in §13.4
- `project_m5_chat_memory_decisions` — independent chats per canvas; brand memory auto-populated; Supabase server-side storage
- `project_m5_design_approach_decisions` — principles-based AI design (not template-based); section definitions; brand kit bridge layer
- `project_m5_chunk_b_decisions` — placeholder content for tasks 10/11 (real content shipped in M5.5)
- `project_m5_task16_wired` — M5 chat AI merged 2026-04-09 (commit b5067eb); 11/14 smoke tests green; 3 deferred to M5.5
- `project_m5.5_handoff` — M5.5 Task 0 preflight done 2026-04-18 on `feat/m5.5-ai-quality`; execution handoff in `docs/superpowers/handoffs/2026-04-18-m5.5-execution-handoff.md`
- `project_m9_shopify_tools_schema_bug` — schema fix landed 2026-05-13; 22 tests pass; raw valibot schemas exported

### 13.8 What is NOT in this PRD (handed elsewhere)

- Brand Kit Memory tab UI — Cluster 05
- `brands.tone_snippets` schema + tone-snippet CRUD UI — Cluster 05
- Saved-blocks drag-drop (chat path) — N/A; saved blocks drag to canvas, not chat (Cluster 05 owns)
- Right-panel tab framework — Cluster 06
- Shop panel UI + "Import N to chat" button — Cluster 06
- Slice + Measurement engine NodeTypes — Cluster 07a
- Account page Integrations IA (Shopify connect/disconnect UI) — Cluster 04
- Onboarding StoreTypeStep (Shopify connect at onboarding) — Cluster 02
- Privacy policy + RoPA document authoring — Cluster 01 (this PRD contributes copy fragment in §11.1)
- Toast component, `useToast()`, modal `.dlg` shell, skeletons, error pages — Cluster 11
- Per-plan rate-limit lookup — Cluster 04 (future extension)
- Tone-snippet pinning (Phase B) — Cluster 12 (`users.preferences.toneSnippets.pinnedIds`)
