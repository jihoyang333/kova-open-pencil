# PRD 05 — Brand Kit Settings & Drag-Drop

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `REVIEW` 2026-05-17 (all 4 open questions ratified by founder; ready for final read-through before Wave-4 implementation) |
| **Wave** | 4 |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-17 (founder ratifications applied: §12.3 disable+tooltip CTA, §12.4 inline-skippable confirm, §12.12 all 7 sub-tabs, §12.13 re-scrape replaces, §12.14 banner persists forever, §12.15 KB unlimited count, font cap = 5 MB) |
| **Depends on PRDs** | 01 (Auth & Identity — `users` + auth middleware), 03 (Brand Management — `brands` row CRUD + brand picker), 04 (Account & Stripe — `/account` shell route + `IntegrationsCard` wired with `shopify_connection_history`), 11 (Shared UI Infrastructure — `<KovaModal>`, `useToast`, `useConfirm`, skeletons, idempotency-key helper) |
| **Blocks PRDs** | 06 (drop receivers in canvas), 10 (AI chat reads `tone_snippets`, `voice`, `writing_rules`, `memories` for prompt) |
| **Source artifacts** | Hi-fi: `A7` (Brand Kit sub-tabs, 7 scenes), `B3` (CRUD modals, 7 scenes), `B8` (upload states, 8 scenes). 03 doc: §2.5 (16 rows) + §2.13 (1 row + cross-cuts) + §3C #4. Q-decisions: Q6 (brand_fonts NEW table), Q8 (tone_snippets + saved_blocks JSONB on brands), Q9 (media.brand_id FK confirmed), Q24 (drag-drop semantics + MIME types). Audit §2.A Cluster 05 (lines 1404–1550) + §5.6 item 3 (extend brand-kit-extract). External verification §6 #4 + #5 (Anthropic sub-processor disclosure + voice-draft guardrail). Shopify spec §4.4 + §6 (M9 reuse + guardrail). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

A freelance email marketer signs in, picks a client brand, and needs every brand-specific design asset and AI prompt source available in one place — colors, fonts, logo, brand narrative, voice exemplars, reusable copy blocks, writing rules the AI must respect, auto-captured brand memories, and uploaded knowledge-base sources. This PRD ships the per-brand Brand Kit settings page (7 sub-tabs under `/account/brand-kit`), the schema and storage to hold every kit asset, the per-brand drag sources (color swatches, font chips, logo, saved blocks) that drop into the canvas with contextual semantics (color = fill, font = font, etc.), the Edge Function that uploads a custom brand font into the canvas font registry, and the user-confirmation gate that turns the AI's Shopify-scraped brand voice into a draft the user reviews and saves — never a silent write.

### 1.2 Caveman summary (per CLAUDE.md communication style)

Per-brand Brand Kit lives in /account/brand-kit. 7 sub-tabs: Visuals · Identity · Tone snippets · Saved blocks · Writing rules · Memories · Knowledge base. PRD ship schema (brand_fonts table NEW, brands.tone_snippets/saved_blocks/writing_rules/identity/kb_sources JSONB), RLS, upload Edge Function for fonts, CRUD RPCs for each JSONB field, drag-drop MIME payloads (color/font/logo/saved-block), and voice-draft confirm step after Shopify connect. Canvas drop receivers live in Cluster 06; AI prompt reads Tone snippets + Identity + Writing rules from Cluster 10. Cluster 05 ship Brand Kit settings UI + data plumbing + drag sources.

### 1.3 Outcome (acceptance gate)

User can: (1) navigate to `/account/brand-kit` and see 7 sub-tabs scoped by the section-top brand picker (Q12/Q13); (2) on Visuals tab — add/edit/remove brand colors, fonts (system + uploaded), logo (primary + wordmark); (3) on Identity tab — view/edit three narrative cards (About / Voice & tone / Story); (4) on Tone snippets tab — CRUD a list of `{label, category, content}` voice exemplars; (5) on Saved blocks tab — CRUD a list of `{label, category, content, type}` reusable copy blocks; (6) on Writing rules tab — toggle 5+ binary rules that the AI must honor; (7) on Memories tab — view/edit/delete auto-captured facts (read from Cluster 10's store, write-through deletes only); (8) on Knowledge base tab — upload PDFs/text files as brand context; (9) drag a color/font/logo/saved-block from the Assets panel in canvas and drop onto a layer/empty canvas with contextual semantics (Q24); (10) upload a `.woff2`/`.ttf`/`.otf` font ≤5 MB with license attestation; (11) after Shopify connect, see a **"Confirm brand voice draft"** modal with the LLM-inferred voice + tone-snippet candidates as editable fields with Save/Discard — **never** a silent DB write.

---

## 2. Scope

### 2.1 In scope (this PRD)

**Routes & shell:**
- `/account/brand-kit` — sub-tab shell (Cluster 04 ships the `/account` route + sidebar; this PRD mounts the section content + sub-nav)
- 7 sub-tab routes under `/account/brand-kit/:tab` (`visuals`, `identity`, `tone-snippets`, `saved-blocks`, `writing-rules`, `memories`, `kb-sources`)
- Section-top brand picker (`<BrandPicker>` from A2b — same component as A2a, different anchor + on-click behavior: swaps data, does NOT navigate routes)

**Sub-tab UI (7 tabs):**
1. **Visuals** — Brand colors swatch list (drag-reorder, hex-edit, add), Brand fonts list (system fonts + uploaded `.woff2`/`.ttf`/`.otf` with license attestation), Logo (primary mark + wordmark, upload/replace)
2. **Identity** — Three narrative cards: About the brand, Voice & tone, Story & origin. Each editable inline. "Draft via interview" CTA (AI-led Q&A; deferred to Phase 2 if not built in Wave 4)
3. **Tone snippets** — List of `{id, label, category, content}` rows with grip-drag-reorder, edit, delete; "Add tone snippet" action opens `B3.1` modal
4. **Saved blocks** — List of `{id, label, category, content, type}` rows with grip-drag-reorder; "Add saved block" opens `B3.3` modal; "Edit" opens `B3.4` modal (prefilled); "Delete" opens `B3.5` confirm
5. **Writing rules** — Binary-toggle stack (No exclamation marks, No em-dashes, Sentence-case headlines, No superlatives, Active voice only — extensible)
6. **Memories** — List of auto-captured facts (read from Cluster 10's `brand_memories`/equivalent store); user can edit label/content or delete a memory; **no Add action** (additions come from chat capture)
7. **Knowledge base** — Upload PDF/MD/TXT files; list of uploaded sources with name, size, uploaded-at; delete action

**CRUD modals (B3 patterns):**
- `B3.1` Add tone snippet (label + category + content + Save)
- `B3.2` Edit tone snippet (prefilled, delete ghost-link in foot-left)
- `B3.3` Add saved block (label + category + content + type segmented control)
- `B3.4` Edit saved block (prefilled)
- `B3.5` Delete confirm (saved block or tone snippet)

**Upload UI (B8 patterns):**
- Button trigger (B8.2)
- Progress ring (avatar — B8.3) — owned by Cluster 04 Profile section but pattern shared
- Progress bar (logo brand-kit — B8.4)
- Upload success (logo — B8.5)
- Upload error (font — B8.6)
- Multi-state list (KB sources — B8.7 / B8.8) with success/in-progress/error/queued rows

**Schema migrations:**
- `ALTER TABLE brands` ADD `tone_snippets jsonb`, `saved_blocks jsonb`, `writing_rules jsonb`, `identity jsonb`, `kb_sources jsonb` (single migration)
- `CREATE TABLE brand_fonts` (per Q6) with RLS
- `CREATE TABLE brand_kb_sources` (or JSONB on brands — see §4.1 decision)
- Confirm `public.media` already has `brand_id` FK + `idx_media_brand_id` (per Q9 — no change needed)
- Storage bucket `brand-fonts` (private, signed-URL fetch) with `{brand_id}/{font_id}.{ext}` path-prefix RLS per D-5
- Storage bucket `brand-kb-sources` (private, signed-URL fetch) with `{brand_id}/{source_id}.{ext}` path-prefix RLS

**Edge Functions / RPCs:**
- `POST /api/brand-fonts/upload` (multipart) — file → Storage bucket → DB row → emit Realtime event to register font with CanvasKit
- `DELETE /api/brand-fonts/:id` — DB row + Storage file delete
- `POST /api/brand-kb-sources/upload` (multipart) — PDF/MD/TXT → Storage bucket → DB row
- `DELETE /api/brand-kb-sources/:id`
- `POST /api/shopify/brand-kit-extract` (EXTEND existing M9 endpoint) — adds Anthropic call to infer voice + tone snippets from About page + product descriptions; returns **draft payload** (not persisted)
- `POST /api/brands/:id/voice-draft/confirm` (NEW) — accepts the user-confirmed draft + writes to `brands.identity`/`brands.tone_snippets` (idempotency-key required)
- `POST /api/brands/:id/voice-draft/discard` (NEW) — clears the in-memory draft, writes audit log entry
- RPCs (SECURITY DEFINER, GRANT EXECUTE TO authenticated):
  - `add_tone_snippet(brand_id, label, category, content) → uuid`
  - `update_tone_snippet(brand_id, snippet_id, ...) → void`
  - `delete_tone_snippet(brand_id, snippet_id) → void`
  - `reorder_tone_snippets(brand_id, ordered_ids uuid[]) → void`
  - Same 4 for saved_blocks
  - `set_writing_rule(brand_id, rule_key text, enabled boolean) → void`
  - `update_brand_identity(brand_id, card_key text, content text) → void`

**Frontend state:**
- `useBrandKitStore` (NEW Pinia) — reactive read of `selectedBrand.{colors, fonts, logo_url, tone_snippets, saved_blocks, writing_rules, identity, kb_sources}` + CRUD action wrappers
- `useBrandFontsStore` (NEW) — list/upload/delete fonts; emits to canvas-engine font-registration hook
- `useBrandKbSourcesStore` (NEW) — list/upload/delete KB sources
- `useVoiceDraft` (NEW composable) — holds in-memory voice-draft post-Shopify-connect; gates DB write

**Drag-drop (Q24):**
- Extend `use-canvas-drop.ts` (Cluster 06 owns the receiver dispatcher; this PRD owns the **drag sources** + MIME-type payload contract):
  - `application/x-kova-brand-color` — `{ hex: string, swatchId: uuid, brandId: uuid }`
  - `application/x-kova-brand-font` — `{ family: string, fontId?: uuid, fontFileUrl?: string, brandId: uuid }`
  - `application/x-kova-brand-asset` — `{ assetId: uuid, kind: 'logo' | 'wordmark' | 'image', url: string, brandId: uuid }`
  - `application/x-kova-saved-block` — `{ blockId: uuid, blockData: { label, content, type }, brandId: uuid }`
- Drag sources mounted on swatch tiles, font rows, logo row, and saved-block grip handles within Brand Kit + canvas Assets panel
- Visual feedback: drop-target highlight on hover + ghost preview ("Will apply as fill" / "Will replace font" / "Will spawn TEXT node") — handled by Cluster 06 receiver

**Compliance:**
- Per `00e §6 #4` D-3 disclosure — Anthropic sub-processor data flow for the voice-scrape is named in the privacy policy (Cluster 01 PRD §5.5 owns; this PRD references)
- Per `00e §6 #5` voice-draft guardrail — confirm-before-write is the HARD REQUIREMENT enforced by `/api/brands/:id/voice-draft/confirm`

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| `/account` route shell + sidebar + section routing | 04 — Account & Stripe |
| Canvas drop **receivers** (handler that dispatches per MIME type on `dragover`/`drop`) | 06 — Canvas Editor Core Chrome (this PRD owns drag SOURCES + MIME contract) |
| Canvas Assets panel drag sources (separate surface from Account-page Brand Kit; both consume the same MIME contracts) | 06 — Canvas Editor Core Chrome (mounts the canvas-side Brand Kit drag tiles; this PRD ships the data) |
| AI chat system-prompt builder (consumes `tone_snippets`, `identity`, `writing_rules`, brand `memories`) | 10 — AI Chat + Memory + Tools |
| Brand memory CAPTURE (chat → write to memory store) | 10 — AI Chat + Memory + Tools |
| `<KovaModal>` shell, `useToast`, `useConfirm`, idempotency-key helper, skeletons, `<MarketingShell>` | 11 — Shared UI Infrastructure |
| Brand picker dropdown component (A2a/A2b — design built once, anchored two ways) | 03 — Brand Management |
| Shopify OAuth flow + `brand-kit-extract` HTTP shell + connection lifecycle | M9 (already merged); this PRD extends the extract endpoint's payload + ships the confirm-step UI |
| Image fill / image upload pipeline into canvas (`media-assets` bucket, `placeMediaImage`) | Already shipped (M5); this PRD reuses |
| GDPR cascade (Brand Kit assets — `brand_fonts`, `brand-fonts/{brand_id}/**` Storage, brand-kit JSONB columns — purged by Cluster 01 cron `storage` + `db` steps via FK cascade) | 01 — Auth & Identity (cron orchestrates; this PRD just declares the FKs + Storage paths) |

### 2.3 Deferred to Phase 2

- **"Draft via interview" AI flow** — the AI-led Q&A that drafts an Identity narrative card. Identity tab ships in MVP with manual-edit only; the "Draft via interview" CTA is **HIDDEN in MVP** (gated by `BRAND_KIT_AI_INTERVIEW_ENABLED = false` in `src/constants.ts`). RATIFIED 2026-05-17 per §12.3.
- **OpenType / advanced typography exposure** (Q3 #2 partial) — defer per scope plan
- **License-attestation audit trail** beyond a boolean — Phase 2 could store the attestation timestamp + IP + which TOS version was acknowledged. MVP: just the boolean
- **Brand-color groups / palettes** (Primary/Accent/Neutrals semantic slots beyond append) — MVP: flat ordered list
- **Tone-snippet category taxonomy management** (user creates custom categories) — MVP: free-text tag

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 11** ships `<KovaModal>`, `useToast()`, `useConfirm()`, skeletons, idempotency-key wrapper, B7 loading skeleton primitives. This PRD imports by name; does not re-spec.
- **Cluster 06** ships the canvas drop-receiver (`use-canvas-drop.ts` dispatcher) + canvas Assets panel surface + the layer-side drop targets. This PRD ships the MIME contract + drag sources rendered in `/account/brand-kit`.
- **Cluster 10** ships `useBrandMemoryStore` (canvas-side memory capture during chat). This PRD's Memories tab is a **consumer view** — reads + edits + deletes via the same store API. Adds happen during chat (Cluster 10).
- **Cluster 04** ships `/account` page chrome including the sidebar with "Brand Kit" item that routes to this PRD's section.
- **M9 (already merged)** ships `api/shopify/brand-kit-extract.ts` + `api/_shared/shopify-brand-kit.ts`. This PRD extends the function's response payload and adds the confirm-step. The colors/fonts/logo logic is reused verbatim.

---

## 3. Visual spec

Every surface maps to a hi-fi file + scene ID. Theme: **DARK** (per `feedback_app_dark_website_light` — inside authenticated app).

### 3.1 Brand Kit shell + sub-nav

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Brand Kit section shell + sub-nav | `/account/brand-kit` | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` | A7.3 (intro), A7.3.1 (Visuals scene also shows sub-nav) | Vertical `.bk-subnav` with 7 entries (Visuals / Identity / Tone snippets / Saved blocks / Writing rules / Memories / Knowledge base). Sticky on scroll. Per-row count badge where data exists ("Tone snippets 8"). Section hero has `<h1>Brand Kit</h1>` + brand-picker pill (A2b — opens dropdown that swaps section data, does NOT navigate) |
| Brand-picker open state | `/account/brand-kit` (popover open) | same | A2b | 280px wide popover with search input + brand list + active checkmark + divider + "+ Add new brand". Same component as A2a sidebar but anchored to the section hero pill. **Does NOT navigate** — swaps the active brand for this section only (per A2b annotation) |

### 3.2 Visuals sub-tab (colors · fonts · logo)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Visuals tab — Brand colors | `/account/brand-kit/visuals` | A7 | A7.3.1 | Swatch list with named colors (Onyx / Flame / Bone / Cobalt / Field). Each swatch has fill + name + hex. Drag-to-reorder grip. "+ Add color" tile at the end opens color picker popover |
| Visuals tab — Brand fonts | same | A7 | A7.3.1 | Stacked rows: active system font (Inter), available system fonts, dashed drop zone for `.woff2`/`.ttf`/`.otf` upload. License-attestation copy in the row meta |
| Visuals tab — Logo | same | A7 | A7.3.1 | Two rows: Primary mark (48×48 thumbnail + filename meta + Replace button) + Wordmark (optional, Upload button when empty) |
| Font upload drop zone | same | `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B8 Upload States - Dark.html` | B8.2 (button), B8.4 (in-progress bar), B8.5 (success), B8.6 (error) | Drag-over highlight (`--accent` 1.5px border); progress bar overlay; success → row collapses with green check; error → red border + retry CTA |

### 3.3 Identity sub-tab

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Identity tab — narrative cards | `/account/brand-kit/identity` | A7 | A7.3.2 | Three cards: About the brand · Voice & tone · Story & origin. Each card: title + "Edit" CTA + body text + footer (last edited / word count). **"Draft via interview" CTA is HIDDEN in MVP per §12.3 ratified 2026-05-17** — gated by `BRAND_KIT_AI_INTERVIEW_ENABLED = false`. Empty cards show italic muted prompt "Not drafted yet — write your story." (rewritten from "…start an interview…" since interview is hidden). |

### 3.4 Tone snippets sub-tab

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Tone snippets list | `/account/brand-kit/tone-snippets` | A7 | A7.3.3 | `.list-stack` of `.list-row` items: grip-handle (drag-reorder), label + category `.tag-mono` chip (PROMO / WELCOME / RESTOCK / CART / TEACH / custom), content excerpt, edit + delete actions. "+ Add tone snippet" tile at the end |
| Add tone snippet modal — empty | `/account/brand-kit/tone-snippets` (modal open) | `main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html` | B3.1 state 1 | Modal title "Add tone snippet". Fields: Label (text), Category (tag-mono segmented or free text input), Content (multiline). Save CTA disabled until label + content present |
| Add tone snippet modal — mid-typing | same | B3 | B3.1 state 2 | Mid-typing — Save CTA enabled when label + content typed |
| Add tone snippet modal — filled | same | B3 | B3.1 state 3 | Save CTA primary, full color |
| Edit tone snippet modal | `/account/brand-kit/tone-snippets` (edit modal) | B3 | B3.2 | Same fields as B3.1 prefilled. Delete ghost-link in foot-left ("Delete snippet" red link). Save / Discard CTAs in foot-right |

### 3.5 Saved blocks sub-tab

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Saved blocks list | `/account/brand-kit/saved-blocks` | A7 | A7.3.4 | Same `.list-stack` pattern as Tone snippets. Type-tag vocabulary: FOOTER / CTA / TEXT. Grip handle is the **canvas-drag source** (per B3.4 annotation — emits `application/x-kova-saved-block`) |
| Add saved block modal | `/account/brand-kit/saved-blocks` (modal) | B3 | B3.3 | Fields: Label + Category tag + Content multiline + **Type segmented control** (`text` / `cta` / `footer`). Help text: "Determines where the block can be dragged onto a canvas. Text → any TEXT node · CTA → button-style nodes · Footer → bottom-of-canvas section." |
| Edit saved block modal | same (edit) | B3 | B3.4 | Prefilled. Same delete ghost-link foot-left pattern |
| Delete confirm modal | same (delete) | B3 | B3.5 | "Delete this saved block?" with item name. Cancel + Delete CTAs. Delete is `<KovaModal>` confirm pattern (Cluster 11) |

### 3.6 Writing rules sub-tab

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Writing rules list | `/account/brand-kit/writing-rules` | A7 | A7.3.5 | `.row-stack.wr-stack` of toggle rows. Each row: rule label + sub-help-line + binary `.toggle` (on/off). MVP rules: No exclamation marks · No em-dashes · Sentence-case headlines · No superlatives · Active voice only. Each toggle writes a key→bool into `brands.writing_rules` JSONB |

### 3.7 Memories sub-tab (cross-cut with Cluster 10)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Memories list | `/account/brand-kit/memories` | A7 | A7.3.6 | Unified list with type filter (Fact / Preference / Constraint / Note). Each memory row: label + content + captured-at + delete action. **No "+ Add" affordance** — additions come from chat capture (Cluster 10). Edit (label/content) is allowed; delete is allowed |

### 3.8 Knowledge base sub-tab

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| KB sources list | `/account/brand-kit/kb-sources` | A7 | A7.3.7 (referenced in B8.7/B8.8) + B8 | List of uploaded files: filename + size + uploaded-at + delete. "Upload sources" CTA opens file picker (PDF/MD/TXT). 60/40 grid per A7.3.7 (upload zone left, list right) |
| Multi-state upload list | `/account/brand-kit/kb-sources` | B8 | B8.7 / B8.8 | Compact drop-zone above list; mixed states in list rows: 2× success (with check, size, delete), 1× in-progress (bar), 1× error (red, retry), 1× queued (dim) |

### 3.9 Voice-draft confirmation (post-Shopify-connect — GUARDRAIL per 00e §6 #5)

| Surface | Route | Hi-fi file | Scene IDs | Notes |
|---|---|---|---|---|
| Confirm brand voice draft modal | triggered post-Shopify-connect on `/onboarding` (Cluster 02) OR `/account/brand-kit` (when user re-runs extract OR has open draft) | NEW — composes B3.1 modal shell + form fields | n/a — net-new | Modal title: **"Confirm brand voice draft"**. Sub-line: "We analyzed your storefront and drafted a brand voice and a few tone snippets. Review and confirm before saving." Three editable sections: (1) Voice description (multiline textarea, prefilled from Anthropic inference); (2) Tone snippets — list of 3–8 candidate snippets (each editable label/content, removable); (3) Footer disclosure: "Storefront content was analyzed via Anthropic (Claude). See [privacy policy](/privacy) for our sub-processor disclosure." CTAs: **Confirm & save** (primary), **Discard draft** (secondary), **Skip for now** (tertiary text-link, onboarding context only). Until Confirm clicked, nothing writes to `brands.identity`/`brands.tone_snippets`. **RATIFIED 2026-05-17:** Skip closes modal, leaves `voice_drafts` row open (`confirmed_at IS NULL`). Next visit to `/account/brand-kit` re-opens modal automatically; persistent banner "Brand voice draft ready — review" displays in section header when open draft exists. Closing modal without any CTA = Skip behavior (does NOT auto-discard). |

### 3.10 Design system references

This PRD's surfaces all live inside the authenticated app — **dark theme**. Engineers use:
- `main-main-kova-scope/design-system/design.md` — token vocabulary + component contracts
- `main-main-kova-scope/design-system/kova-hifi.css` — canonical dark CSS (`:root` block → Tailwind `@theme`; component primitive classes → Vue components rendering same markup contract)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` — naming cheat-sheet

Tokens referenced: `--page`, `--ink`, `--ink-3`, `--line`, `--line-2`, `--accent`, `--accent-soft`, `--accent-2`, `--accent-ink`, `--fill`. Component primitive classes used in this PRD: `.acc-frame`, `.acc-rail`, `.acc-main`, `.acc-hero`, `.acc-content`, `.bk-wrap`, `.bk-subnav`, `.bk-pane`, `.s-section`, `.row-stack`, `.row`, `.list-stack`, `.list-row`, `.list-row .grip / .lbl-col / .content-col / .actions-col`, `.list-add`, `.sw-list`, `.sw-item`, `.font-row`, `.brandpick` (+`.open`), `.toggle` (+`.on`), `.nar-card`, `.dlg`, `.btn`, `.btn.primary`, `.btn.sm`, `.btn.ghost`, `.pill`, `.tag-mono`. All canonical and version-controlled per `project_design_system_master` memory.

---

## 4. Data model

### 4.1 Schema migrations

Single migration file: `kova-open-pencil-1/supabase/migrations/20260615_05_brand_kit.sql`.

> **§4.1 SQL amendment — 2026-05-31 (W11a build + audit).** The SQL listing
> below is the original spec draft and carried bugs that `database-reviewer`
> caught during the Cluster 05 build. **The shipped migration file is canonical**
> — it diverges from this listing by the following fixes (all green against the
> search-path-lock test + the integration suite):
>
> - **C-1 (race):** `confirm_voice_draft` / `discard_voice_draft` now `SELECT … FOR UPDATE`
>   on the draft row so two concurrent confirms can't both pass the unresolved
>   guard and double-append.
> - **C-2 (cap bypass):** the confirm path enforces the 50-snippet cap — it reads
>   `jsonb_array_length(tone_snippets) FOR UPDATE` on the brands row and appends
>   only `GREATEST(50 - existing, 0)` snippets.
> - **C-3 (silent drop):** `reorder_tone_snippets` / `reorder_saved_blocks` require
>   `p_ordered_ids` to be a **full permutation** (`array_length <> jsonb_array_length`
>   ⇒ `RAISE EXCEPTION 'invalid_reorder'`), else a partial list silently drops items.
> - **C-4 (array corruption):** the same reorder RPCs reject an unknown id — an
>   id with no matching element yields `NULL`, and `jsonb || NULL` nukes the whole
>   array. Each element is selected `INTO v_elem` with a `NULL` guard.
> - **H-4 (runtime crash):** `confirm_voice_draft` replaced the illegal
>   `row_number() OVER ()` inside `jsonb_agg(...)` with
>   `jsonb_array_elements(...) WITH ORDINALITY` (window functions can't nest in an
>   aggregate — the original would crash at runtime).
> - **H-3 (off-by-one word count):** `word_count` is `0` for empty/whitespace
>   content (`trim('')` splits to a length-1 array); `update_brand_identity` +
>   confirm both use the `CASE WHEN trim(...) = '' THEN 0` form.
> - **H-1 (re-run safety):** every policy is `DROP POLICY IF EXISTS` before
>   `CREATE` (PostgreSQL has no `CREATE POLICY IF NOT EXISTS`).
> - **H-2 / M-3 (defense-in-depth):** `FORCE ROW LEVEL SECURITY` on
>   `brand_fonts` + `brand_kb_sources`; the absent UPDATE policy is deliberate
>   (rows are immutable; replace = delete + re-upload).
> - **M-1 (RLS perf):** all RLS/storage policies wrap `auth.uid()` as
>   `(SELECT auth.uid())` so it evaluates once per statement, not once per row.
> - **M-4 (index):** added non-partial `idx_voice_drafts_brand` for historical-draft SELECTs.
> - **MED-3 (realtime):** appended `brand_fonts` to the `supabase_realtime`
>   publication + `REPLICA IDENTITY FULL` so the client's `postgres_changes`
>   subscription fires (the upload Edge Function emits no broadcast).

```sql
-- ============================================================
-- Migration 20260615_05_brand_kit.sql
-- Cluster 05 Brand Kit & Drag-Drop — schema for 7 Brand Kit sub-tabs + brand fonts + KB sources
-- Pairs with: 20260317_m2_dashboard.sql (creates public.brands)
-- ============================================================

BEGIN;

-- ---- 1. JSONB columns on brands (per Q8 + Q24 + hi-fi A7.3.x) ----

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS tone_snippets   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id, label, category, content, order}]
  ADD COLUMN IF NOT EXISTS saved_blocks    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id, label, category, content, type, order}]
  ADD COLUMN IF NOT EXISTS writing_rules   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { no_exclamation: bool, no_em_dash: bool, sentence_case_headlines: bool, no_superlatives: bool, active_voice_only: bool, ...custom }
  ADD COLUMN IF NOT EXISTS identity        jsonb NOT NULL DEFAULT '{}'::jsonb;  -- { about: { content, last_edited_at, last_edited_by, word_count }, voice: {...}, story: {...} }

COMMENT ON COLUMN public.brands.tone_snippets IS
  'Ordered list of brand-voice exemplars per Q8. Each element: {id uuid, label text, category text, content text, order int}. AI prompt-builder reads these (Cluster 10).';
COMMENT ON COLUMN public.brands.saved_blocks IS
  'Ordered list of reusable copy snippets per Q8. Each element: {id uuid, label text, category text, content text, type text in (''text'',''cta'',''footer''), order int}. Drag-drop into canvas spawns TEXT node (Cluster 06 receiver).';
COMMENT ON COLUMN public.brands.writing_rules IS
  'Binary toggles AI must respect per hi-fi A7.3.5 (founder 2026-04-25: sliders dropped, binary only). Keys + booleans. AI prompt-builder enforces (Cluster 10).';
COMMENT ON COLUMN public.brands.identity IS
  'Three narrative cards per hi-fi A7.3.2: about, voice, story. Each: {content text, last_edited_at timestamptz, last_edited_by uuid, word_count int}. AI prompt-builder reads voice (Cluster 10).';

-- Existing brands.voice (TEXT) is RETAINED for backwards compatibility with M9 brand-kit-extract.
-- Decision: voice scraped from Shopify continues to write to brands.voice (single-line summary), while
-- the new richer Identity card writes to brands.identity.voice.content. Cluster 10 prompt-builder
-- prefers brands.identity.voice.content when populated, falls back to brands.voice.
-- See §12.1.

-- ---- 2. brand_fonts table (NEW per Q6 — brand_assets verified MISSING) ----

CREATE TABLE IF NOT EXISTS public.brand_fonts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  family_name       text NOT NULL,
  file_path         text NOT NULL,                                  -- Storage path: brand-fonts/{brand_id}/{font_id}.{ext}
  file_size_bytes   bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),   -- 5 MB cap per founder ratification 2026-05-17 (covers variable fonts up to 5 MB; rejects bloated display fonts)
  mime_type         text NOT NULL CHECK (mime_type IN ('font/woff2', 'font/ttf', 'font/otf')),
  license_attested  boolean NOT NULL DEFAULT false,
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  uploaded_by       uuid NOT NULL REFERENCES public.users(id),
  CHECK (license_attested = true)  -- License attestation REQUIRED at insert time
);

CREATE INDEX IF NOT EXISTS idx_brand_fonts_brand ON public.brand_fonts(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_fonts_unique_family ON public.brand_fonts(brand_id, family_name);

COMMENT ON TABLE public.brand_fonts IS
  'Per-brand uploaded font files. Distinct lifecycle from public.media (Q6): CanvasKit registration + AI prompt awareness + license attestation. Max 5 MB per file (founder ratification 2026-05-17).';
COMMENT ON COLUMN public.brand_fonts.license_attested IS
  'User MUST attest commercial-use rights at upload time. CHECK constraint enforces true at INSERT.';

-- ---- 3. brand_kb_sources table (NEW — knowledge-base file uploads) ----

CREATE TABLE IF NOT EXISTS public.brand_kb_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  file_path       text NOT NULL,                                  -- Storage path: brand-kb-sources/{brand_id}/{source_id}.{ext}
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),  -- 10 MB cap (PDFs run larger than fonts)
  mime_type       text NOT NULL CHECK (mime_type IN ('application/pdf', 'text/plain', 'text/markdown')),
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  uploaded_by     uuid NOT NULL REFERENCES public.users(id),
  extracted_text  text                                            -- Populated by post-upload extraction worker (deferred — null at MVP)
);

CREATE INDEX IF NOT EXISTS idx_brand_kb_sources_brand ON public.brand_kb_sources(brand_id);

COMMENT ON TABLE public.brand_kb_sources IS
  'Per-brand knowledge-base file uploads (PDF/MD/TXT). Cluster 10 prompt-builder reads extracted_text when populated. Extraction worker is post-MVP — files store as-is for now.';

-- ---- 4. voice_drafts table (NEW — confirm-before-write guardrail per 00e §6 #5) ----

CREATE TABLE IF NOT EXISTS public.voice_drafts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.users(id),
  source              text NOT NULL CHECK (source IN ('shopify_extract')),  -- extensible: 'manual_rerun', future sources
  draft_payload       jsonb NOT NULL,                              -- { voice: {content}, tone_snippets: [{label, category, content}] }
  created_at          timestamptz NOT NULL DEFAULT now(),
  confirmed_at        timestamptz,
  discarded_at        timestamptz,
  CHECK (confirmed_at IS NULL OR discarded_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_voice_drafts_brand_unconfirmed
  ON public.voice_drafts(brand_id) WHERE confirmed_at IS NULL AND discarded_at IS NULL;

COMMENT ON TABLE public.voice_drafts IS
  'GUARDRAIL per 00e §6 #5: AI-scraped brand voice + tone snippets are persisted here first as a draft, then user reviews + confirms in the Brand Kit UI before they write to brands.{identity, tone_snippets}. NEVER a silent write.';

-- ---- 5. RPCs (SECURITY DEFINER, owner = postgres, search_path locked) ----

-- Tone snippet CRUD
CREATE OR REPLACE FUNCTION public.add_tone_snippet(
  p_brand_id uuid, p_label text, p_category text, p_content text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_current jsonb;
  v_next_order int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;

  -- Brand-ownership check
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Cap: 50 tone snippets per brand (§2.1 recommendation)
  IF (SELECT jsonb_array_length(tone_snippets) FROM public.brands WHERE id = p_brand_id) >= 50 THEN
    RAISE EXCEPTION 'cap_exceeded' USING ERRCODE = 'P0001';
  END IF;

  SELECT tone_snippets INTO v_current FROM public.brands WHERE id = p_brand_id;
  v_next_order := COALESCE((SELECT MAX((s->>'order')::int) + 1 FROM jsonb_array_elements(v_current) s), 0);

  UPDATE public.brands
     SET tone_snippets = v_current || jsonb_build_array(jsonb_build_object(
           'id', v_id, 'label', p_label, 'category', p_category, 'content', p_content, 'order', v_next_order
         ))
   WHERE id = p_brand_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tone_snippet(
  p_brand_id uuid, p_snippet_id uuid, p_label text, p_category text, p_content text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_current jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT tone_snippets INTO v_current FROM public.brands WHERE id = p_brand_id;

  UPDATE public.brands
     SET tone_snippets = COALESCE((
           SELECT jsonb_agg(
             CASE WHEN (s->>'id')::uuid = p_snippet_id
                  THEN jsonb_set(jsonb_set(jsonb_set(s, '{label}', to_jsonb(p_label)),
                                            '{category}', to_jsonb(p_category)),
                                  '{content}', to_jsonb(p_content))
                  ELSE s END
           )
           FROM jsonb_array_elements(v_current) s
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_tone_snippet(p_brand_id uuid, p_snippet_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.brands
     SET tone_snippets = COALESCE((
           SELECT jsonb_agg(s) FROM jsonb_array_elements(tone_snippets) s
           WHERE (s->>'id')::uuid != p_snippet_id
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_tone_snippets(p_brand_id uuid, p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_current jsonb;
  v_new jsonb := '[]'::jsonb;
  v_id uuid;
  v_idx int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT tone_snippets INTO v_current FROM public.brands WHERE id = p_brand_id;

  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    v_new := v_new || (
      SELECT jsonb_set(s, '{order}', to_jsonb(v_idx))
      FROM jsonb_array_elements(v_current) s
      WHERE (s->>'id')::uuid = v_id
    );
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE public.brands SET tone_snippets = v_new WHERE id = p_brand_id;
END;
$$;

-- Saved blocks CRUD — same shape as tone snippets, swap field name + cap 100
CREATE OR REPLACE FUNCTION public.add_saved_block(
  p_brand_id uuid, p_label text, p_category text, p_content text, p_type text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_current jsonb;
  v_next_order int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_type NOT IN ('text','cta','footer') THEN
    RAISE EXCEPTION 'invalid_type' USING ERRCODE = '22023';
  END IF;
  IF (SELECT jsonb_array_length(saved_blocks) FROM public.brands WHERE id = p_brand_id) >= 100 THEN
    RAISE EXCEPTION 'cap_exceeded' USING ERRCODE = 'P0001';
  END IF;

  SELECT saved_blocks INTO v_current FROM public.brands WHERE id = p_brand_id;
  v_next_order := COALESCE((SELECT MAX((s->>'order')::int) + 1 FROM jsonb_array_elements(v_current) s), 0);

  UPDATE public.brands
     SET saved_blocks = v_current || jsonb_build_array(jsonb_build_object(
           'id', v_id, 'label', p_label, 'category', p_category,
           'content', p_content, 'type', p_type, 'order', v_next_order
         ))
   WHERE id = p_brand_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_saved_block(
  p_brand_id uuid, p_block_id uuid, p_label text, p_category text, p_content text, p_type text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_type NOT IN ('text','cta','footer') THEN
    RAISE EXCEPTION 'invalid_type' USING ERRCODE = '22023';
  END IF;

  UPDATE public.brands
     SET saved_blocks = COALESCE((
           SELECT jsonb_agg(
             CASE WHEN (s->>'id')::uuid = p_block_id
                  THEN jsonb_set(jsonb_set(jsonb_set(jsonb_set(s,
                         '{label}',    to_jsonb(p_label)),
                         '{category}', to_jsonb(p_category)),
                         '{content}',  to_jsonb(p_content)),
                         '{type}',     to_jsonb(p_type))
                  ELSE s END
           ) FROM jsonb_array_elements(saved_blocks) s
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_saved_block(p_brand_id uuid, p_block_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.brands
     SET saved_blocks = COALESCE((
           SELECT jsonb_agg(s) FROM jsonb_array_elements(saved_blocks) s
           WHERE (s->>'id')::uuid != p_block_id
         ), '[]'::jsonb)
   WHERE id = p_brand_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_saved_blocks(p_brand_id uuid, p_ordered_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_current jsonb; v_new jsonb := '[]'::jsonb; v_id uuid; v_idx int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT saved_blocks INTO v_current FROM public.brands WHERE id = p_brand_id;
  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    v_new := v_new || (SELECT jsonb_set(s, '{order}', to_jsonb(v_idx))
                       FROM jsonb_array_elements(v_current) s WHERE (s->>'id')::uuid = v_id);
    v_idx := v_idx + 1;
  END LOOP;
  UPDATE public.brands SET saved_blocks = v_new WHERE id = p_brand_id;
END;
$$;

-- Writing rule toggle (single rule at a time)
CREATE OR REPLACE FUNCTION public.set_writing_rule(p_brand_id uuid, p_rule_key text, p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- Validate key against known-rule allowlist (extensible — store keys in app constants too)
  IF p_rule_key NOT IN ('no_exclamation', 'no_em_dash', 'sentence_case_headlines', 'no_superlatives', 'active_voice_only') THEN
    RAISE EXCEPTION 'invalid_rule_key' USING ERRCODE = '22023';
  END IF;
  UPDATE public.brands
     SET writing_rules = jsonb_set(COALESCE(writing_rules, '{}'::jsonb), ARRAY[p_rule_key], to_jsonb(p_enabled), true)
   WHERE id = p_brand_id;
END;
$$;

-- Brand identity card update (3 cards: about / voice / story)
CREATE OR REPLACE FUNCTION public.update_brand_identity(p_brand_id uuid, p_card_key text, p_content text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_word_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_card_key NOT IN ('about', 'voice', 'story') THEN
    RAISE EXCEPTION 'invalid_card_key' USING ERRCODE = '22023';
  END IF;
  v_word_count := COALESCE(array_length(regexp_split_to_array(trim(p_content), '\s+'), 1), 0);

  UPDATE public.brands
     SET identity = jsonb_set(
           COALESCE(identity, '{}'::jsonb),
           ARRAY[p_card_key],
           jsonb_build_object(
             'content', p_content,
             'last_edited_at', to_jsonb(now()),
             'last_edited_by', to_jsonb(auth.uid()),
             'word_count', v_word_count
           ),
           true
         )
   WHERE id = p_brand_id;
END;
$$;

-- Voice-draft confirm / discard
CREATE OR REPLACE FUNCTION public.confirm_voice_draft(p_draft_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_brand_id uuid; v_payload jsonb; v_voice text; v_snips jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;

  SELECT brand_id, draft_payload INTO v_brand_id, v_payload
  FROM public.voice_drafts
  WHERE id = p_draft_id AND confirmed_at IS NULL AND discarded_at IS NULL;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'draft_not_found_or_already_resolved' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = v_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_voice := v_payload->'voice'->>'content';
  v_snips := COALESCE(v_payload->'tone_snippets', '[]'::jsonb);

  -- Write voice → brands.identity.voice (with word-count); append tone_snippets (with fresh uuids + order)
  UPDATE public.brands SET
    identity = jsonb_set(
      COALESCE(identity, '{}'::jsonb), '{voice}',
      jsonb_build_object(
        'content', v_voice,
        'last_edited_at', to_jsonb(now()),
        'last_edited_by', to_jsonb(auth.uid()),
        'word_count', COALESCE(array_length(regexp_split_to_array(trim(v_voice),'\s+'), 1), 0)
      ),
      true
    ),
    tone_snippets = tone_snippets || (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', gen_random_uuid(),
        'label', s->>'label',
        'category', COALESCE(s->>'category', 'CUSTOM'),
        'content', s->>'content',
        'order', jsonb_array_length(tone_snippets) + (row_number() OVER () - 1)::int
      )), '[]'::jsonb)
      FROM jsonb_array_elements(v_snips) s
    )
   WHERE id = v_brand_id;

  UPDATE public.voice_drafts SET confirmed_at = now() WHERE id = p_draft_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.discard_voice_draft(p_draft_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_brand_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;
  SELECT brand_id INTO v_brand_id FROM public.voice_drafts WHERE id = p_draft_id AND confirmed_at IS NULL AND discarded_at IS NULL;
  IF v_brand_id IS NULL THEN RAISE EXCEPTION 'draft_not_found_or_already_resolved' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = v_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.voice_drafts SET discarded_at = now() WHERE id = p_draft_id;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION
  public.add_tone_snippet, public.update_tone_snippet, public.delete_tone_snippet, public.reorder_tone_snippets,
  public.add_saved_block,  public.update_saved_block,  public.delete_saved_block,  public.reorder_saved_blocks,
  public.set_writing_rule, public.update_brand_identity,
  public.confirm_voice_draft, public.discard_voice_draft
TO authenticated;

COMMIT;
```

**Notes on this migration:**

1. Migration is idempotent (`IF NOT EXISTS` on every DDL, `CREATE OR REPLACE` on functions) so re-runs on local + staging are safe per D-5E.
2. `brands.voice` (existing TEXT column from M9) is retained — the M9 `brand-kit-extract` continues to write a single-line summary there. The richer Identity card writes to `brands.identity.voice.content`. Cluster 10 AI prompt-builder prefers the latter when populated. See §12.1 risk.
3. `brand_fonts.license_attested` is enforced by a CHECK constraint at INSERT — there is **no** path to insert a font row with `license_attested = false`.
4. JSONB element-id reorder via `reorder_*` RPCs accepts an ordered uuid array — server fully rebuilds the JSONB array with new `order` indices. Atomic.
5. Caps (50 tone snippets, 100 saved blocks per §2.1) enforced inside the `add_*` RPCs as `RAISE EXCEPTION 'cap_exceeded'`. UI surfaces a toast on this error code.
6. `voice_drafts.draft_payload` shape: `{ voice: { content: string }, tone_snippets: [{ label, category, content }, ...] }`. Edge Function `/api/shopify/brand-kit-extract` writes the row; user-driven `confirm_voice_draft(draft_id)` is the only path that mutates `brands.identity` / `brands.tone_snippets` from this source. **NEVER silent.**
7. Partial unique index `idx_voice_drafts_brand_unconfirmed` allows at most one open draft per brand at a time — second extract call must close the prior draft first (controller logic in Edge Function).

### 4.2 RLS policies

| Table | Policy | Purpose |
|---|---|---|
| `public.brands` | Existing M9 policies (`brand_owner_select/insert/update/delete` keyed on `user_id = auth.uid()`). No change. New JSONB columns inherit. | Brand-ownership gate carries over. |
| `public.brand_fonts` | `brand_fonts_select / insert / delete` on `authenticated`: `brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())`. No UPDATE policy (font files are immutable; replace = delete + re-upload). | Owner-only access. |
| `public.brand_kb_sources` | Same shape: `brand_kb_sources_select / insert / delete` keyed on brand-ownership. No UPDATE. | Owner-only. |
| `public.voice_drafts` | `voice_drafts_select` for the brand-owner. `voice_drafts_insert` is **service-role only** (the Edge Function writes; the user can never insert their own draft). `voice_drafts_update` blocked client-side (RPCs are the only mutation path). | Confirms the guardrail — draft creation is system-only, resolution is user-driven via RPC. |

```sql
-- brand_fonts policies
ALTER TABLE public.brand_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_fonts_select ON public.brand_fonts FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY brand_fonts_insert ON public.brand_fonts FOR INSERT TO authenticated
  WITH CHECK (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
    AND uploaded_by = auth.uid()
    AND license_attested = true
  );

CREATE POLICY brand_fonts_delete ON public.brand_fonts FOR DELETE TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

-- brand_kb_sources policies
ALTER TABLE public.brand_kb_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_kb_sources_select ON public.brand_kb_sources FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
CREATE POLICY brand_kb_sources_insert ON public.brand_kb_sources FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY brand_kb_sources_delete ON public.brand_kb_sources FOR DELETE TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

-- voice_drafts policies — service-role insert, owner select, RPC-only resolution
ALTER TABLE public.voice_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY voice_drafts_select ON public.voice_drafts FOR SELECT TO authenticated
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY voice_drafts_service_insert ON public.voice_drafts FOR INSERT TO service_role
  WITH CHECK (true);

-- No UPDATE / DELETE policies for authenticated — only RPCs (which run as SECURITY DEFINER) can resolve.
```

### 4.3 Storage buckets

| Bucket | Access | Path | RLS |
|---|---|---|---|
| `brand-fonts` | Private, signed URL (60-minute TTL when AI / canvas needs it). Path: `brand-fonts/{brand_id}/{font_id}.{ext}`. | Per-brand path prefix. | `storage.objects` policy: `bucket_id = 'brand-fonts' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.brands WHERE user_id = auth.uid())` per D-5 path-prefix RLS pattern (verified Supabase-docs-supported, 00e §4). |
| `brand-kb-sources` | Private, signed URL. Path: `brand-kb-sources/{brand_id}/{source_id}.{ext}`. | Per-brand path prefix. | Same pattern. |

**Existing buckets** referenced (not created here):
- `media-assets` (M5) — designer-uploaded images; existing schema; `public.media.brand_id` FK confirmed per Q9.

**Cleanup**: brand-deletion (Cluster 03's `delete_brand`) cascades — `brand_fonts` + `brand_kb_sources` rows cascade via FK; Storage paths are cleaned by Cluster 01's account-deletion cron's `storage` step (which enumerates `brand_id` values then deletes `brand-fonts/{brand_id}/**` + `brand-kb-sources/{brand_id}/**`).

---

## 5. Backend

### 5.1 Edge Functions

All Edge Functions deploy as Vercel Functions under `kova-open-pencil-1/api/`. Idempotency-key handling per Cluster 11 cross-cut.

**Hardening (W0-5 / founder lock #15):** every `CREATE FUNCTION ... SECURITY DEFINER` RPC defined by this PRD MUST include `SET search_path = public, pg_temp` within the same function definition. CI-enforced — `bun run check:rls` (Plan 11 Task 11.5) fails on any DEFINER block missing the clause. CT-013 from CONSOLIDATED-TRIAGE.md flagged the 1 DEFINER RPC in this cluster as missing the lock; the Cluster 05 Wave-2 fix agent adds the clause during its pass.

**Audit-log cross-cut (W0-1):** the voice-draft confirm flow (and any brand-kit mutation that materially changes brand state) appends a row to `public.audit_log` via the Cluster 11 `writeAudit(supabaseAdmin, { userId, eventType, payload, clusterOwner: '05' })` helper at `api/_shared/audit.ts`. Table DDL + RLS + helper are owned by **PRD 11 §2.1 / §4.1 / §5.5** (founder lock #11). Example event types: `brand_kit.voice_draft_confirmed`, `brand_kit.font_uploaded`, `brand_kit.memory_promoted`.

---

#### 5.1.1 `POST /api/brand-fonts/upload`

```typescript
// kova-open-pencil-1/api/brand-fonts/upload.ts
// Method:      POST (multipart/form-data)
// Auth:        Supabase JWT (verifyAuth shared helper)
// Headers:     Authorization: Bearer <jwt>
//              X-Idempotency-Key: <uuid v4>           (optional; recommended)
// Multipart fields:
//   brand_id          (uuid)
//   family_name       (string, ≤ 64 chars)
//   license_attested  (string "true" — MUST be exactly "true")
//   file              (binary; .woff2 | .ttf | .otf; ≤ 5 MB)
// Response 200: { font_id: uuid, file_path: string, family_name: string }
// Response 400: { error: 'invalid_request', details }
// Response 401: { error: 'unauthenticated' }
// Response 403: { error: 'forbidden' }                  (brand not owned by user)
// Response 409: { error: 'duplicate_family', existing_font_id: uuid }
// Response 413: { error: 'file_too_large' }             (> 5 MB)
// Response 415: { error: 'unsupported_mime' }           (file-type sniff disagrees with extension/header per 2.B.5)
// Response 422: { error: 'license_not_attested' }
// Response 429: { error: 'rate_limited', retry_after_seconds: n }
// Response 500: { error: 'internal_error', request_id }
//
// Algorithm:
//   1. Verify JWT, extract user_id.
//   2. Validate brand-ownership (SELECT 1 FROM brands WHERE id = brand_id AND user_id = user_id).
//   3. Rate-limit (existing M9 rate-limit RPC, bucket 'brand_fonts.upload', 5 req/min/user).
//   4. Idempotency check (Cluster 11 idempotency_keys table) — short-circuit on duplicate key.
//   5. MIME magic-number sniff via `file-type` npm pkg + extension + Content-Type header — all three must agree (per 2.B.5).
//   6. Validate license_attested === 'true' (string).
//   7. Generate font_id (uuid).
//   8. Compute file_path = `brand-fonts/{brand_id}/{font_id}.{ext}`.
//   9. Upload bytes to Supabase Storage bucket `brand-fonts` at file_path with signedUpload (server-side, service-role).
//  10. INSERT INTO public.brand_fonts (id, brand_id, family_name, file_path, file_size_bytes, mime_type, license_attested, uploaded_by)
//      VALUES (font_id, brand_id, family_name, file_path, size, mime, true, user_id);
//      On unique-constraint violation (brand_id + family_name) → DELETE Storage object + return 409 with existing_font_id.
//  11. Emit Realtime event on `brand:{brand_id}:fonts` channel — `{ event: 'font_added', font: { id, family_name, file_path } }`
//      so any open canvas client picks up the new font for CanvasKit registration (handled by canvas-engine font-loader in Cluster 06/07).
//  12. Return 200 with font_id, file_path, family_name.
//
// Idempotency: per-request via X-Idempotency-Key. Re-upload with same key returns same response.
// Rate limit: 5 req/min/user (heavier than tone-snippet ops because storage write).
```

---

#### 5.1.2 `DELETE /api/brand-fonts/:id`

```typescript
// kova-open-pencil-1/api/brand-fonts/[id].ts (DELETE method)
// Auth: Supabase JWT
// Response 200: { success: true }
// Response 401, 403, 404, 500 standard
//
// Algorithm:
//   1. Verify JWT.
//   2. SELECT brand_id, file_path FROM brand_fonts WHERE id = $id; ensure brand_id is owned by user.
//   3. supabase.storage.from('brand-fonts').remove([file_path]) — treats not-found as success.
//   4. DELETE FROM brand_fonts WHERE id = $id.
//   5. Emit Realtime event `brand:{brand_id}:fonts` — `{ event: 'font_removed', font_id }`.
```

---

#### 5.1.3 `POST /api/brand-kb-sources/upload`

```typescript
// kova-open-pencil-1/api/brand-kb-sources/upload.ts
// Method:      POST (multipart/form-data)
// Auth:        Supabase JWT
// Headers:     X-Idempotency-Key (optional)
// Multipart fields:
//   brand_id   (uuid)
//   file       (binary; application/pdf | text/plain | text/markdown; ≤ 10 MB)
//   file_name  (string)
// Response 200: { source_id: uuid, file_path: string, file_name: string }
// 400 / 401 / 403 / 413 / 415 / 429 / 500 standard
//
// Algorithm: parallels brand-fonts upload; bucket = brand-kb-sources; no license check; MIME types per CHECK constraint;
//            no Realtime emit (KB sources are inert until extraction worker runs — deferred).
```

---

#### 5.1.4 `DELETE /api/brand-kb-sources/:id`

```typescript
// Parallels DELETE /api/brand-fonts/:id. Removes Storage object + DB row.
```

---

#### 5.1.5 `POST /api/shopify/brand-kit-extract` — **EXTEND** existing M9 endpoint

```typescript
// kova-open-pencil-1/api/shopify/brand-kit-extract.ts (EXISTING — extend)
// Method:      POST
// Auth:        Supabase JWT + brand-ownership
// Body:        { brand_id: uuid, shop_domain: string }
// Response 200: { extracted: { colors, fonts, logo_url }, draft_id: uuid, draft_payload: { voice: { content }, tone_snippets: [{ label, category, content }] } }
// Response 400 / 401 / 403 / 500 standard
//
// CHANGES from M9:
//   1. KEEP all existing logic: fetch theme settings_data.json via Shopify Asset/Theme API, extract colors / fonts / logo → write to brands.{colors, fonts, logo_url}. (Existing M9 behavior. Reused verbatim per §5.6 item 3.)
//   2. ADD voice + tone-snippet inference:
//        a. Fetch storefront About page HTML (public storefront URL, no API key — minimal-scope per Shopify ToS §4 confirmed in 00e §4).
//        b. Fetch a sample of product descriptions (top 5 products by created_at via shopify_products cache — already synced by M9 bulk worker).
//        c. Compose Anthropic Messages API call:
//             system: "You are a brand-voice analyst. Given storefront content, infer a 2-3 sentence brand-voice description and 3-8 tone-snippet candidates as short labeled passages. Return JSON only."
//             user: <about page + product descriptions concatenated>
//           Use @ai-sdk/anthropic + claude-sonnet-4-6 (cheaper for inference). Response_format: JSON.
//        d. Parse JSON → { voice: { content }, tone_snippets: [{ label, category, content }, ...] }.
//        e. INSERT INTO voice_drafts (brand_id, user_id, source='shopify_extract', draft_payload).
//        f. Return draft_id + draft_payload to client (in addition to extracted visual kit).
//   3. NEVER write voice / tone_snippets to brands.* — that path is gated by /api/brands/voice-draft/confirm only.
//
// Guardrail (00e §6 #5): the client MUST surface the draft modal and either confirm or discard before any
//   brand.identity / brand.tone_snippets value is mutated. If the client closes the modal without action,
//   the draft sits in voice_drafts indefinitely (or until a new extract call replaces it).
//
// Idempotency: per-brand "open draft" guard — if voice_drafts has an unresolved row for this brand,
//   discard it first (UPDATE … SET discarded_at = now()) before inserting the new one.
//
// Rate limit: 1 req/hour/brand (heavy: Shopify API + Anthropic API). Existing M9 rate-limit pattern.
//
// Privacy disclosure (00e §6 #4 D-3): Cluster 01 privacy policy names "storefront content analyzed
//   for brand-voice inference via Anthropic" as a sub-processor data flow. This PRD ships the *mechanism*;
//   Cluster 01 owns the *policy text*.
```

---

#### 5.1.6 `POST /api/brands/:id/voice-draft/confirm`

```typescript
// kova-open-pencil-1/api/brands/[id]/voice-draft/confirm.ts
// Method:      POST
// Auth:        Supabase JWT
// Headers:     X-Idempotency-Key (REQUIRED — confirm is a one-way write)
// Body:        { draft_id: uuid, edited_payload?: { voice?: { content }, tone_snippets?: [{ label, category, content }] } }
//              edited_payload is OPTIONAL — if provided, overrides the saved draft_payload before commit
//              (this lets the user tweak the AI's draft in the modal before confirming).
// Response 200: { success: true, voice_word_count: number, tone_snippet_count: number }
// 401 / 403 / 404 ('draft_not_found_or_already_resolved') / 500 standard
//
// Algorithm:
//   1. Verify JWT + brand-ownership.
//   2. If edited_payload provided, UPDATE voice_drafts SET draft_payload = edited_payload WHERE id = draft_id AND brand_id = id AND confirmed_at IS NULL AND discarded_at IS NULL.
//   3. Call RPC confirm_voice_draft(draft_id) — atomic write to brands.identity.voice + append to brands.tone_snippets + mark draft confirmed.
//   4. Audit-log: INSERT INTO audit_log (Cluster 11) — { event: 'voice_draft_confirmed', user_id, brand_id, draft_id }.
//   5. Return success counts.
```

---

#### 5.1.7 `POST /api/brands/:id/voice-draft/discard`

```typescript
// Parallels confirm — calls discard_voice_draft(draft_id) RPC + audit-logs event 'voice_draft_discarded'.
// No mutations to brands.*.
```

---

### 5.2 RPCs (database functions)

Shipped in the migration in §4.1. Summary:

| Function | Args | Returns | Caller |
|---|---|---|---|
| `add_tone_snippet(brand_id, label, category, content)` | uuid, text, text, text | `uuid` (new snippet id) | client (via supabase.rpc) |
| `update_tone_snippet(brand_id, snippet_id, label, category, content)` | ids + 3 texts | `void` | client |
| `delete_tone_snippet(brand_id, snippet_id)` | uuid, uuid | `void` | client |
| `reorder_tone_snippets(brand_id, ordered_ids uuid[])` | uuid + uuid array | `void` | client |
| `add_saved_block / update_saved_block / delete_saved_block / reorder_saved_blocks` | same shape as tone snippets + `type` | `uuid` / `void` | client |
| `set_writing_rule(brand_id, rule_key, enabled)` | uuid, text, bool | `void` | client |
| `update_brand_identity(brand_id, card_key, content)` | uuid, text, text | `void` | client |
| `confirm_voice_draft(draft_id)` | uuid | `void` | Edge Function 5.1.6 |
| `discard_voice_draft(draft_id)` | uuid | `void` | Edge Function 5.1.7 |

All `SECURITY DEFINER`, `search_path = public, pg_temp`. Brand-ownership check in each function body (`SELECT 1 FROM brands WHERE id = ... AND user_id = auth.uid()`).

### 5.3 Cron jobs

None at Cluster 05. (Brand-kit assets are interactively managed. GDPR purge is owned by Cluster 01's `delete-account-cron` which enumerates Storage paths + cascades DB rows.)

### 5.4 External integrations

| Integration | SDK | What this PRD uses | Webhooks |
|---|---|---|---|
| **Anthropic** | `@ai-sdk/anthropic` (per CLAUDE.md mandate + 2.C.14) | Single call in `/api/shopify/brand-kit-extract`: claude-sonnet-4-6, `generateObject` with JSON schema, ≤ 800 input tokens (About page + 5 product descriptions), ≤ 600 output tokens. Server-only `ANTHROPIC_API_KEY` (never `VITE_` prefix per CLAUDE.md). 429 retry with exp-backoff (max 3) per 2.B.13. | None |
| **Shopify Admin API** | direct fetch (existing M9 pattern) | (extract endpoint already integrates) Theme `settings_data.json` (read_themes scope — already granted by M9 OAuth) + storefront public About-page HTTP GET (no API key — public storefront URL). | M9 ships `customers/redact` + `shop/redact` mandatory webhooks; this PRD's brand_fonts + brand_kb_sources data is also purged on `customers/redact` per Cluster 01 GDPR cascade. |
| **Supabase Storage** | `@supabase/supabase-js` (already installed) | Bucket create (`brand-fonts`, `brand-kb-sources`) via Supabase CLI migration; signed upload from Edge Function (service-role); signed download URLs (60-min TTL) for canvas-engine font loader. | None |

### 5.5 Privacy + compliance deliverables

| Deliverable | Location | Purpose |
|---|---|---|
| Privacy Policy addendum (cross-cut with Cluster 01) | `kova-open-pencil-1/docs/legal/privacy-policy.md` | Cluster 01 owns the doc; this PRD's contribution: ensure the **Anthropic data flow paragraph** explicitly names "storefront content (About page + product descriptions) analyzed by Anthropic Claude to infer brand voice on Shopify connect, presented to user as a confirm-before-write draft" per 00e §6 #4. Cluster 01 PRD §5.5 already lists this; PRD 05 verifies wording before launch. |
| RoPA addendum (cross-cut with Cluster 01) | `kova-open-pencil-1/docs/legal/ropa.md` | Add row: "Brand voice inference — purpose: enrich Brand Kit; data: storefront text; sub-processor: Anthropic; retention: input/output 30 days per Anthropic policy (operator-driven manual deletion via anthropic_deletion_log + ZDR onboarding post-launch); legal basis: legitimate interest (user-initiated, with confirm-before-write gate)." |

---

## 6. Frontend

### 6.1 Routes (Vue Router)

Routes nest under the Cluster 04 `/account` parent. This PRD adds the Brand Kit section + sub-tab routes:

```typescript
// kova-open-pencil-1/src/router/routes.ts (extend account section)
// Theme: dark (inherits from /account)

{
  path: '/account/brand-kit',
  name: 'account-brand-kit',
  component: () => import('@/views/account/BrandKitSection.vue'),
  meta: { theme: 'dark', requiresAuth: true, viewportGuard: 'desktop' },
  redirect: '/account/brand-kit/visuals',
  children: [
    { path: 'visuals',        name: 'brand-kit-visuals',        component: () => import('@/components/brand-kit/VisualsTab.vue') },
    { path: 'identity',       name: 'brand-kit-identity',       component: () => import('@/components/brand-kit/IdentityTab.vue') },
    { path: 'tone-snippets',  name: 'brand-kit-tone-snippets',  component: () => import('@/components/brand-kit/ToneSnippetsTab.vue') },
    { path: 'saved-blocks',   name: 'brand-kit-saved-blocks',   component: () => import('@/components/brand-kit/SavedBlocksTab.vue') },
    { path: 'writing-rules',  name: 'brand-kit-writing-rules',  component: () => import('@/components/brand-kit/WritingRulesTab.vue') },
    { path: 'memories',       name: 'brand-kit-memories',       component: () => import('@/components/brand-kit/MemoriesTab.vue') },
    { path: 'kb-sources',     name: 'brand-kit-kb-sources',     component: () => import('@/components/brand-kit/KbSourcesTab.vue') },
  ],
},
```

Brand-context query: `?brand={brandId}` carries through tab navigation. Default brand = the user's most-recently-active brand (read from `useBrandsStore.selectedBrand`).

### 6.2 Pinia stores

| Store | File | State | Getters | Actions |
|---|---|---|---|---|
| `useBrandKitStore` (NEW) | `src/stores/brand-kit.ts` | Reactive read-through of `selectedBrand.{colors, fonts, logo_url, tone_snippets, saved_blocks, writing_rules, identity, kb_sources}`. No local cache — `useBrandsStore` already loads the brand row; this store provides typed accessors. | `toneSnippets: ComputedRef<ToneSnippet[]>` (sorted by `order`), `savedBlocks: ComputedRef<SavedBlock[]>` (sorted), `writingRules: ComputedRef<Record<string, boolean>>`, `identity: ComputedRef<IdentityCards>`, `brandColors: ComputedRef<BrandColor[]>`, `brandLogoUrl`, `brandFonts` (from `useBrandFontsStore` proxy) | `addToneSnippet(label, category, content)`, `updateToneSnippet(id, …)`, `deleteToneSnippet(id)`, `reorderToneSnippets(orderedIds)`, parallel 4 for saved blocks, `setWritingRule(key, enabled)`, `updateIdentityCard(key, content)`. Each action calls the corresponding `supabase.rpc(…)`, optimistically updates `useBrandsStore.selectedBrand.{field}`, rolls back on error. |
| `useBrandFontsStore` (NEW) | `src/stores/brand-fonts.ts` | `fonts: Ref<BrandFont[]>` (per brand), `uploadProgress: Ref<Map<string, number>>` (file → 0–1 progress), `uploadErrors: Ref<Map<string, string>>` | `fontsForBrand(brandId): ComputedRef<BrandFont[]>` | `fetchFonts(brandId)`, `uploadFont(brandId, file, familyName, licenseAttested) → Promise<BrandFont>` (calls `/api/brand-fonts/upload` with progress events), `deleteFont(fontId)`, `subscribeRealtime(brandId)` (Supabase Realtime on `brand:{brandId}:fonts` channel — refresh list on event). |
| `useBrandKbSourcesStore` (NEW) | `src/stores/brand-kb-sources.ts` | `sources: Ref<BrandKbSource[]>`, `uploadProgress`, `uploadErrors` | `sourcesForBrand(brandId)` | `fetchSources(brandId)`, `uploadSource(brandId, file, fileName) → Promise<BrandKbSource>`, `deleteSource(sourceId)`. |
| `useVoiceDraft` (NEW — composable, not Pinia) | `src/composables/use-voice-draft.ts` | Module-level `Ref<VoiceDraft \| null>` for the active draft | n/a | `loadDraftAfterShopifyConnect(brandId)` (called by Cluster 02 onboarding + this PRD's /account/brand-kit if a draft exists), `confirmDraft(editedPayload?)`, `discardDraft()`. Returns a Promise-resolving composable so callers can `await useVoiceDraft().confirmDraft(...)`. |

Data shapes (TypeScript):

```ts
// src/types/brand-kit.ts (NEW)
export interface ToneSnippet { id: string; label: string; category: string; content: string; order: number }
export interface SavedBlock  { id: string; label: string; category: string; content: string; type: 'text'|'cta'|'footer'; order: number }
export interface IdentityCard { content: string; last_edited_at: string; last_edited_by: string; word_count: number }
export interface IdentityCards { about?: IdentityCard; voice?: IdentityCard; story?: IdentityCard }
export interface WritingRules { no_exclamation?: boolean; no_em_dash?: boolean; sentence_case_headlines?: boolean; no_superlatives?: boolean; active_voice_only?: boolean; [k: string]: boolean | undefined }
export interface BrandColor { id: string; hex: string; label: string; order: number }
export interface BrandFont { id: string; brand_id: string; family_name: string; file_path: string; file_size_bytes: number; mime_type: 'font/woff2'|'font/ttf'|'font/otf'; license_attested: boolean; uploaded_at: string; uploaded_by: string }
export interface BrandKbSource { id: string; brand_id: string; file_name: string; file_path: string; file_size_bytes: number; mime_type: string; uploaded_at: string; uploaded_by: string; extracted_text: string | null }
export interface VoiceDraft { id: string; brand_id: string; user_id: string; source: 'shopify_extract'; draft_payload: { voice: { content: string }; tone_snippets: Array<{ label: string; category: string; content: string }> }; created_at: string }
```

### 6.3 Composables

| Composable | File | Signature | Used by |
|---|---|---|---|
| `useBrandKitDrag` | `src/composables/brand-kit/use-brand-kit-drag.ts` | `(): { onColorDragStart(swatch, event); onFontDragStart(font, event); onLogoDragStart(logo, event); onSavedBlockDragStart(block, event); }` — sets `event.dataTransfer.setData(mimeType, JSON.stringify(payload))` per Q24 | `VisualsTab.vue` (colors + fonts + logo); `SavedBlocksTab.vue` (saved-block grip handle); canvas Assets panel (Cluster 06 imports same composable for canvas-side drag sources) |
| `useFontUpload` | `src/composables/brand-kit/use-font-upload.ts` | `(): { upload(brandId, file, familyName, licenseAttested) → Promise<BrandFont>; progress: ComputedRef<number>; error: ComputedRef<string\|null>; }` — wraps `useBrandFontsStore.uploadFont` with progress event subscription | `FontUploadDropzone.vue` (Visuals tab) |
| `useKbSourceUpload` | `src/composables/brand-kit/use-kb-source-upload.ts` | parallel to useFontUpload | `KbSourceDropzone.vue` (Knowledge base tab) |
| `useVoiceDraft` | `src/composables/use-voice-draft.ts` | (see §6.2 stores) | `VoiceDraftConfirmModal.vue`, Cluster 02 onboarding StoreTypeStep, this PRD's BrandKitSection (when arriving with open draft) |

### 6.4 Components

**Icon convention (W0-4 — 2026-05-19):** every icon rendered by a component in this PRD uses `<KovaIcon name="..." size?="..." />` from Cluster 11 §6.4.2 / Plan 11 Task 4.4. The four retired alternates are forbidden per scope plan §6.2 W0-4 lock: (a) raw `<icon-lucide-*>` tags with dynamic names, (b) `<component :is="\`icon-lucide-${name}\`">` template-literal resolution, (c) `i-lucide-*` UnoCSS class strings (the pattern flagged by QA-B HIGH-7 / HIGH-17 in Plan 05 lines 2230-2236 + 2253), (d) `<Icon name="lucide:...">` Nuxt-style. Wave-2 cluster-05 fix agent migrates residual non-conforming icon bindings during its pass.

#### 6.4.1 Section + tab shells

| Component | File | Props / slots / emits | Hi-fi reference |
|---|---|---|---|
| `BrandKitSection` | `src/views/account/BrandKitSection.vue` | Slot for child route. Reads `useBrandsStore.selectedBrand`. Mounts the section hero (`<BrandPicker>` from Cluster 03) + `<BrandKitSubNav>`. Handles voice-draft open-modal-on-mount if draft exists for selected brand. | A7.3 (and A7.3.1 / A2b) |
| `BrandKitSubNav` | `src/components/brand-kit/BrandKitSubNav.vue` | `(): renders 7 router-link items with active state + per-tab count badge (computed from useBrandKitStore.toneSnippets.length etc.)`; Sticky on scroll | A7.3.x bk-subnav |

#### 6.4.2 Per-tab components

| Component | File | Hi-fi |
|---|---|---|
| `VisualsTab` | `src/components/brand-kit/VisualsTab.vue` | A7.3.1 |
| `IdentityTab` | `src/components/brand-kit/IdentityTab.vue` | A7.3.2 |
| `ToneSnippetsTab` | `src/components/brand-kit/ToneSnippetsTab.vue` | A7.3.3 |
| `SavedBlocksTab` | `src/components/brand-kit/SavedBlocksTab.vue` | A7.3.4 |
| `WritingRulesTab` | `src/components/brand-kit/WritingRulesTab.vue` | A7.3.5 |
| `MemoriesTab` | `src/components/brand-kit/MemoriesTab.vue` | A7.3.6 |
| `KbSourcesTab` | `src/components/brand-kit/KbSourcesTab.vue` | A7.3.7 + B8.7/B8.8 |

#### 6.4.3 Modal components (B3 patterns)

| Component | File | Props / emits | Hi-fi |
|---|---|---|---|
| `ToneSnippetAddModal` | `src/components/brand-kit/modals/ToneSnippetAddModal.vue` | `props: { open: boolean }`, `emits: ['close', 'saved']`; renders inside `<KovaModal>` (Cluster 11). Fields: Label + Category + Content. | B3.1 |
| `ToneSnippetEditModal` | `…/ToneSnippetEditModal.vue` | `props: { open, snippet: ToneSnippet }`, `emits: ['close', 'saved', 'deleted']`; delete ghost-link in foot-left → triggers `useConfirm` (Cluster 11). | B3.2 |
| `SavedBlockAddModal` | `…/SavedBlockAddModal.vue` | `props: { open }`, `emits: ['close', 'saved']`. Fields: Label + Category + Content + Type segmented (`text/cta/footer`). Help-line on Type segmented per B3.3 annotation. | B3.3 |
| `SavedBlockEditModal` | `…/SavedBlockEditModal.vue` | Same as Add but prefilled + delete ghost-link. | B3.4 |
| `VoiceDraftConfirmModal` | `src/components/brand-kit/modals/VoiceDraftConfirmModal.vue` | `props: { open, draft: VoiceDraft }`, `emits: ['close', 'confirmed', 'discarded']`. Composes B3-style modal with: Voice textarea (prefilled, editable), Tone-snippets list (each row removable + editable label/content), footer disclosure linking to `/privacy`. CTAs: **Confirm & save** (primary, calls `useVoiceDraft.confirmDraft(editedPayload)`) and **Discard draft** (secondary, calls `useVoiceDraft.discardDraft`). | NEW — composes B3 modal shell + new form |
| `KbSourceDeleteConfirm` | uses Cluster 11 `useConfirm()` directly — no separate component | n/a | B3.5 pattern |

#### 6.4.4 Tile / row primitives

| Component | File | Props | Hi-fi |
|---|---|---|---|
| `BrandColorSwatch` | `src/components/brand-kit/visuals/BrandColorSwatch.vue` | `props: { color: BrandColor }`, `emits: ['edit', 'delete', 'reorder']`. Drag source attr `draggable=true` + `@dragstart` calls `useBrandKitDrag.onColorDragStart`. | A7.3.1 sw-list / sw-item |
| `BrandColorAddTile` | `…/visuals/BrandColorAddTile.vue` | `emits: ['add']`. "+ Add color" affordance. Opens color picker popover (Cluster 06 ships `ColorPicker.vue`; this PRD mounts it). | A7.3.1 sw-add |
| `BrandFontRow` | `…/visuals/BrandFontRow.vue` | `props: { font: BrandFont \| SystemFont, isActive }`, `emits: ['set-active', 'delete']`. Drag source for `application/x-kova-brand-font`. | A7.3.1 font-row |
| `FontUploadDropzone` | `…/visuals/FontUploadDropzone.vue` | Drop zone + file picker + license-attestation checkbox + progress bar/error states. Renders B8.2 / B8.4 / B8.5 / B8.6. | B8 |
| `BrandLogoRow` | `…/visuals/BrandLogoRow.vue` | `props: { logo: { kind: 'primary'\|'wordmark', url?, filename? } }`, `emits: ['upload', 'delete']`. Drag source for `application/x-kova-brand-asset`. | A7.3.1 row-stack |
| `IdentityCard` | `…/identity/IdentityCard.vue` | `props: { card: IdentityCard, cardKey: 'about'\|'voice'\|'story', title }`, `emits: ['edit', 'draft-via-interview']`. Empty state shows italic prompt. | A7.3.2 nar-card |
| `BrandKitListRow` | `…/shared/BrandKitListRow.vue` | `props: { grip?: boolean, label, category?, content }`, `emits: ['edit', 'delete', 'dragstart']`. Shared by Tone snippets + Saved blocks (same row shape). | A7.3.3 / A7.3.4 list-row |
| `WritingRuleToggle` | `…/writing-rules/WritingRuleToggle.vue` | `props: { ruleKey, label, subHelp, enabled }`, `emits: ['update:enabled']`. Calls `useBrandKitStore.setWritingRule`. | A7.3.5 wr-stack |
| `MemoryRow` | `…/memories/MemoryRow.vue` | `props: { memory }`, `emits: ['edit', 'delete']`. Read from Cluster 10's `useBrandMemoryStore`. | A7.3.6 |
| `KbSourceRow` | `…/kb-sources/KbSourceRow.vue` | `props: { source: BrandKbSource, state: 'success'\|'in-progress'\|'error'\|'queued' }`, `emits: ['delete', 'retry']`. | B8.7 / B8.8 |
| `KbSourceDropzone` | `…/kb-sources/KbSourceDropzone.vue` | Drop zone + file picker. Multi-file queue. | B8.7 / B8.8 |

### 6.5 Drag-and-drop / DnD handlers

**MIME-payload contract (Q24)** — this PRD owns the **payload shape**; Cluster 06 owns the **receiver dispatcher**.

| MIME | Payload (JSON) | Source | Receiver behavior (Cluster 06 specs) |
|---|---|---|---|
| `application/x-kova-brand-color` | `{ hex: string, swatchId: uuid, brandId: uuid }` | `BrandColorSwatch` drag, canvas Assets panel color tile | Drop on layer with fill → replace top fill. Shift+drop on layer with stroke → replace stroke. Drop on empty canvas → spawn 200×200 rect with this fill at drop point. Alt+drop → additive (don't replace; add to fills array). |
| `application/x-kova-brand-font` | `{ family: string, fontId?: uuid, fontFileUrl?: string, brandId: uuid }` | `BrandFontRow` drag | Drop on TEXT node → set fontFamily. Drop on empty canvas → spawn TEXT node with "Edit text" default content + this family. |
| `application/x-kova-brand-asset` | `{ assetId: uuid, kind: 'logo'\|'wordmark'\|'image', url: string, brandId: uuid }` | `BrandLogoRow` drag, canvas Assets panel image tile | Drop on layer with fill support → apply as image fill (replace top fill). Drop on empty canvas → spawn IMAGE node at logo's natural dimensions at drop point. |
| `application/x-kova-saved-block` | `{ blockId: uuid, blockData: { label: string, content: string, type: 'text'\|'cta'\|'footer' }, brandId: uuid }` | `BrandKitListRow` grip handle in SavedBlocksTab + canvas Assets panel Brand Kit section | Drop on canvas (empty or layer) → spawn TEXT node with `content` pre-filled; if `type === 'cta'`, wrap in a button-style frame; if `type === 'footer'`, snap to bottom of nearest frame. |
| `application/x-kova-tone-snippet` | `{ snippetId: uuid, content: string, brandId: uuid }` | (optional MVP — Cluster 10 may consume directly via AI prompt; drag-drop not load-bearing) | Drop on TEXT node → replace text content with snippet. Drop on empty canvas → spawn TEXT node. |

Visual feedback (Cluster 06 implements; PRD 05 specs the copy):
- Drop-target highlight on hover (`--accent` 1.5px border)
- Ghost preview with label: "Will apply as fill" / "Will replace font" / "Will spawn TEXT" / "Will replace stroke (Shift)" / "Will add to fill stack (Alt)"
- Modifier-key behavior: Shift = stroke; Alt = additive fill

Drag-source mounting (this PRD):
```vue
<!-- BrandColorSwatch.vue (sketch) -->
<div
  class="sw-item"
  draggable="true"
  @dragstart="onDragStart"
>
  <div class="fill" :style="{ background: color.hex }"></div>
  <div class="body"><div class="nm">{{ color.label }}</div><div class="hex">{{ color.hex }}</div></div>
</div>

<script setup lang="ts">
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'
const { onColorDragStart } = useBrandKitDrag()
const props = defineProps<{ color: BrandColor }>()
const onDragStart = (e: DragEvent) => onColorDragStart(props.color, e)
</script>
```

---

## 7. Tool layer / canvas-engine touches

**N/A for this PRD's core scope.** No `packages/core/` modifications. The canvas-engine font-loader extension (CanvasKit `Typeface.MakeFreeTypeFaceFromData`) lives in `src/canvas-extensions/font-loader/` (or equivalent app-level location), invoked from `useBrandFontsStore`. The drag-drop receiver dispatcher lives in `use-canvas-drop.ts` (Cluster 06 owns). This PRD adds new dispatch cases by extending the MIME-type registry (one switch case per MIME). Existing core `setText` / `setImage` / `createNode` are used to fulfill drop semantics — no API changes.

---

## 8. Acceptance criteria

Every line is testable in code or browser. No "feels right." Engineers verify before founder review.

### 8.1 Schema & RLS

- [ ] Migration `20260615_05_brand_kit.sql` applies cleanly on a fresh local Supabase (`supabase db reset`)
- [ ] Re-running the migration is idempotent (`IF NOT EXISTS` on all DDL, `CREATE OR REPLACE` on functions)
- [ ] `brands` has new columns `tone_snippets jsonb`, `saved_blocks jsonb`, `writing_rules jsonb`, `identity jsonb` all with DEFAULT and NOT NULL
- [ ] `brand_fonts` table exists with CHECK `license_attested = true` enforced (insert with `license_attested = false` fails)
- [ ] `brand_fonts` CHECK on `file_size_bytes` caps at 5 MB (5242880); insert with 5242881 fails
- [ ] `brand_kb_sources` table exists with CHECK on file_size_bytes ≤ 10 MB
- [ ] `voice_drafts` table exists; partial unique index `idx_voice_drafts_brand_unconfirmed` enforces one open draft per brand
- [ ] RLS on `brand_fonts`: authenticated user can only SELECT/INSERT/DELETE rows for brands they own (verified via integration test against local Supabase with two users)
- [ ] RLS on `brand_kb_sources`: same
- [ ] RLS on `voice_drafts`: SELECT-only for authenticated; INSERT for service_role only
- [ ] `storage.objects` policy on `brand-fonts` bucket: path-prefix `{brand_id}/...` enforces brand-ownership (per D-5)
- [ ] Same on `brand-kb-sources` bucket
- [ ] `add_tone_snippet` raises `cap_exceeded` after 50 snippets per brand
- [ ] `add_saved_block` raises `cap_exceeded` after 100 blocks per brand
- [ ] `add_saved_block` raises `invalid_type` for any type not in `('text','cta','footer')`
- [ ] `set_writing_rule` raises `invalid_rule_key` for unknown rule keys
- [ ] `update_brand_identity` raises `invalid_card_key` for keys not in `('about','voice','story')`
- [ ] `confirm_voice_draft(draft_id)` is idempotent — second call on same draft returns `draft_not_found_or_already_resolved` (40404)
- [ ] All RPCs reject calls where `auth.uid()` doesn't own the brand (`forbidden` / `42501`)

### 8.2 Visuals tab

- [ ] User can navigate to `/account/brand-kit/visuals` and see brand colors, fonts, logo, all loaded for the active brand
- [ ] Switching brand via `<BrandPicker>` swaps data without route change (URL stays `/account/brand-kit/visuals`)
- [ ] Adding a color via "+ Add color" tile appends to `brands.colors`, surfaces in the swatch list immediately (optimistic UI)
- [ ] Dragging a color swatch out of the tab fires a dragstart with MIME `application/x-kova-brand-color` and JSON payload `{ hex, swatchId, brandId }`
- [ ] Uploading a `.woff2` font ≤ 5 MB completes successfully; row appears in font list; CanvasKit registers the font (verify in canvas test: TEXT node with that fontFamily renders correctly)
- [ ] Uploading a `.png` (wrong MIME) is rejected with 415 + toast "Unsupported file format"
- [ ] Uploading a 6 MB font is rejected with 413 + toast "File too large (max 5 MB)"
- [ ] Uploading without checking license-attestation checkbox is rejected with 422 + inline "You must confirm commercial-use rights"
- [ ] Deleting a font removes the row, the Storage file, and unregisters from CanvasKit; any TEXT node using that font falls back gracefully (existing M9 missing-font tooltip handles)
- [ ] Logo "Replace" opens file picker, uploads, replaces the existing `brands.logo_url`; old Storage object is purged
- [ ] Wordmark is optional — empty state renders "Not uploaded" + "Upload" button

### 8.3 Identity tab

- [ ] Three narrative cards render: About / Voice / Story
- [ ] Each card empty state renders italic prompt "Not drafted yet…"
- [ ] Each card "Edit" CTA opens inline editor (multiline textarea); Save calls `update_brand_identity` RPC; card refreshes with new content + last-edited timestamp + word count
- [ ] "Draft via interview" CTA is **hidden** in MVP per §12.3 ratified — `v-if="BRAND_KIT_AI_INTERVIEW_ENABLED"` gates the button; flag is hard-coded `false` in `src/constants.ts`

### 8.4 Tone snippets tab

- [ ] List renders sorted by `order`
- [ ] "+ Add tone snippet" opens `B3.1` modal; Save disabled until label + content non-empty
- [ ] Adding writes via `add_tone_snippet`, refreshes list, shows toast "Snippet added"
- [ ] Drag-reorder via grip handle calls `reorder_tone_snippets` with the new ordered uuid array; list reorders persistently across refresh
- [ ] Editing a row opens `B3.2` modal prefilled; Save calls `update_tone_snippet`; row updates in place
- [ ] Deleting from `B3.2` modal foot-left ghost-link calls `useConfirm` → "Delete this snippet?" → on confirm, calls `delete_tone_snippet`
- [ ] Adding the 51st snippet shows toast "You've hit the 50-snippet cap. Delete one to add another" (error code `cap_exceeded`)

### 8.5 Saved blocks tab

- [ ] Same CRUD parity as Tone snippets, with the additional Type segmented (`text/cta/footer`) per `B3.3`
- [ ] Help-text on Type segmented per B3.3 hi-fi annotation
- [ ] Grip handle dragstart fires `application/x-kova-saved-block` payload (this is the canvas-drag source — verify in integration test that Cluster 06's receiver can parse it)
- [ ] 101st block hits `cap_exceeded` toast

### 8.6 Writing rules tab

- [ ] 5 binary toggles render: No exclamation marks · No em-dashes · Sentence-case headlines · No superlatives · Active voice only
- [ ] Toggling writes via `set_writing_rule(rule_key, enabled)`; UI reflects optimistically; server confirm reconciles
- [ ] Setting a rule then opening an AI chat in Cluster 10 — the system prompt includes the rule (verifies cross-cut wiring; Cluster 10 PRD acceptance owns this — referenced in §11)

### 8.7 Memories tab

- [ ] Memory rows render reading from `useBrandMemoryStore` (Cluster 10 store)
- [ ] No "+ Add" action surfaces (additions come from chat capture)
- [ ] Editing a memory calls the Cluster 10 store action (which writes to its memory table); UI refreshes via store reactivity
- [ ] Deleting a memory calls Cluster 10 delete action

### 8.8 Knowledge base tab

- [ ] User can drag-drop or click-to-upload PDF/MD/TXT files ≤ 10 MB
- [ ] List shows uploaded files with size + uploaded-at + delete
- [ ] Multi-file upload shows mixed states per B8.7/B8.8 (success / in-progress / error / queued)
- [ ] Error rows show retry CTA; retry re-attempts upload
- [ ] Deleting removes row + Storage object

### 8.9 Voice-draft confirmation (GUARDRAIL per 00e §6 #5)

- [ ] Post Shopify-connect, the brand-kit-extract Edge Function INSERTs a `voice_drafts` row with `source='shopify_extract'` and the Anthropic-inferred payload
- [ ] `brands.identity` and `brands.tone_snippets` are NOT mutated by the extract endpoint (verified via integration test asserting JSONB length unchanged)
- [ ] `<VoiceDraftConfirmModal>` opens the next time the user lands on `/onboarding` (post-Shopify step) OR `/account/brand-kit` for that brand with an open draft
- [ ] Voice textarea is editable; tone-snippet rows are editable; each snippet has × remove
- [ ] **Confirm & save** calls `/api/brands/:id/voice-draft/confirm` with `edited_payload` if user changed the draft → server writes `brands.identity.voice` + appends to `brands.tone_snippets` + marks draft confirmed → modal closes → toast "Brand voice saved"
- [ ] **Discard draft** calls `/api/brands/:id/voice-draft/discard` → server marks draft discarded → no DB writes to `brands.*` → modal closes → toast "Draft discarded"
- [ ] **Skip for now** (onboarding only): closes modal, leaves draft open, advances onboarding to next step. No DB writes to `brands.*`. No `discarded_at` set on draft row.
- [ ] Closing the modal without confirming or discarding leaves the draft open (next visit re-opens the modal) — equivalent to Skip
- [ ] When user with an open `voice_drafts` row lands on `/account/brand-kit`, a persistent banner "Brand voice draft ready — review" renders above the sub-tabs; clicking it re-opens `<VoiceDraftConfirmModal>`
- [ ] Re-running `/api/shopify/brand-kit-extract` while a draft is open discards the prior draft (UPDATE … SET discarded_at = now()) before inserting the new one
- [ ] Disclosure footer renders link to `/privacy` with the exact text per §3.9

### 8.10 Drag-drop

- [ ] Dragging a color swatch onto a canvas frame with fill → replaces top fill (verified in Cluster 06 receiver integration test)
- [ ] Shift+drag color onto stroke → replaces stroke
- [ ] Drag color onto empty canvas → spawns 200×200 rect with fill
- [ ] Drag font onto TEXT node → applies fontFamily
- [ ] Drag font onto empty canvas → spawns TEXT node with "Edit text"
- [ ] Drag logo onto layer with fill → image fill replace
- [ ] Drag logo onto empty canvas → spawns IMAGE node at natural size
- [ ] Drag saved block (grip handle) onto empty canvas → spawns TEXT node with content; if type='cta', wraps in button-style frame; if type='footer', snaps to bottom of nearest frame

### 8.11 Security

- [ ] Brand-fonts upload endpoint rejects request without JWT (401)
- [ ] Brand-fonts upload endpoint rejects request where `brand_id` is not owned by the user (403)
- [ ] Brand-fonts upload endpoint runs MIME magic-number sniff (`file-type` npm) + extension + Content-Type all-three-agree per 2.B.5 (rejects polyglot file)
- [ ] Storage signed-URLs expire after 60 minutes
- [ ] `ANTHROPIC_API_KEY` is server-only (no `VITE_` prefix); Vite build verifies via grep gate
- [ ] No client-side path writes `brands.{identity, tone_snippets, voice}` directly — every write goes through a SECURITY-DEFINER RPC

### 8.12 Compliance

- [ ] Privacy policy (Cluster 01 §5.5) names Anthropic as sub-processor for the brand-voice-inference flow
- [ ] RoPA document lists the brand-voice-inference processing activity
- [ ] Audit log records voice-draft confirm / discard events with user_id + brand_id + draft_id

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

Target coverage: ≥ 85% on `useBrandKitStore` actions, RPCs (via SQL test framework), Edge Functions, drag composables, voice-draft confirm flow.

| Test file | Covers |
|---|---|
| `tests/unit/stores/brand-kit.test.ts` | Every action: addToneSnippet/update/delete/reorder; addSavedBlock/update/delete/reorder; setWritingRule; updateIdentityCard. Optimistic-update + rollback-on-error |
| `tests/unit/stores/brand-fonts.test.ts` | uploadFont (success / 4xx / 5xx / progress events); deleteFont; subscribeRealtime |
| `tests/unit/stores/brand-kb-sources.test.ts` | parallel to brand-fonts |
| `tests/unit/composables/brand-kit/use-brand-kit-drag.test.ts` | Each onXDragStart sets the correct MIME + JSON payload + uses `event.dataTransfer.setData` correctly; handles Shift/Alt modifier flags via DataTransfer effects |
| `tests/unit/composables/use-voice-draft.test.ts` | load / confirm / discard / re-open after close-without-action |
| `tests/unit/api/brand-fonts/upload.test.ts` | All response codes (200, 400, 401, 403, 409 duplicate, 413, 415 polyglot, 422 license, 429, 500); idempotency-key dedup; MIME magic-number sniff |
| `tests/unit/api/brand-fonts/delete.test.ts` | 200 / 401 / 403 / 404 / 500; Storage object removed; Realtime event emitted |
| `tests/unit/api/brand-kb-sources/upload.test.ts` | parallel |
| `tests/unit/api/shopify/brand-kit-extract.test.ts` | Existing M9 logic preserved; NEW: voice/tone inference path — Anthropic call mocked, draft inserted, brands.* unchanged; idempotency: prior open draft is discarded |
| `tests/unit/api/brands/voice-draft/confirm.test.ts` | confirm with no edits → writes draft as-is; confirm with edited_payload → writes edited values; idempotent (second call returns 404 already-resolved) |
| `tests/unit/api/brands/voice-draft/discard.test.ts` | marks draft discarded; no DB writes to brands.* |
| `tests/unit/components/brand-kit/VoiceDraftConfirmModal.test.ts` | Renders draft fields editable; Confirm with edits passes edited payload; Discard calls discard; Close-without-action leaves draft open |
| `tests/unit/components/brand-kit/modals/ToneSnippetAddModal.test.ts` | Form validation; Save disabled until label + content |
| `tests/unit/components/brand-kit/modals/SavedBlockAddModal.test.ts` | Type segmented + help-text + Save flow |
| `tests/unit/components/brand-kit/visuals/FontUploadDropzone.test.ts` | Dragover highlight; file-type check; license checkbox required |
| `tests/unit/components/brand-kit/BrandKitSubNav.test.ts` | Active state per route; count badges from store |

### 9.2 Integration tests (against local Supabase + CI ephemeral Postgres per D-5E)

| Test file | Covers |
|---|---|
| `tests/integration/db/migration-05-brand-kit.test.ts` | Apply migration; verify columns + tables + indexes + RLS exist; CHECK constraints reject invalid inserts |
| `tests/integration/db/rls-brand-fonts.test.ts` | Two users + two brands; user A cannot SELECT/INSERT/DELETE user B's brand_fonts |
| `tests/integration/db/rls-brand-kb-sources.test.ts` | parallel |
| `tests/integration/db/rls-voice-drafts.test.ts` | service-role can INSERT; authenticated cannot INSERT but can SELECT own |
| `tests/integration/db/rpc-tone-snippets.test.ts` | add → list → update → delete → reorder; cap_exceeded at 51st; forbidden for non-owner |
| `tests/integration/db/rpc-saved-blocks.test.ts` | parallel + type validation |
| `tests/integration/db/rpc-writing-rules.test.ts` | toggle + invalid_rule_key |
| `tests/integration/db/rpc-brand-identity.test.ts` | update each card; word_count computed |
| `tests/integration/db/rpc-voice-draft-confirm.test.ts` | end-to-end: INSERT draft via service-role → confirm → brands.identity + tone_snippets mutated atomically; idempotent on second call |
| `tests/integration/api/brand-fonts-upload-flow.test.ts` | Full upload via fetch against local Supabase: file → Storage → DB row → Realtime event captured |
| `tests/integration/api/brand-kit-extract-voice-draft-flow.test.ts` | Mock Shopify theme + storefront fetches + Anthropic call → assert voice_drafts row written, brands.* unchanged, draft_id returned |
| `tests/integration/api/voice-draft-confirm-discard.test.ts` | seed draft → POST /confirm → assert brands.* updated; seed draft → POST /discard → assert brands.* unchanged + draft marked discarded |
| `tests/integration/storage/path-prefix-rls.test.ts` | brand-fonts + brand-kb-sources path-prefix RLS verified (user A cannot signed-upload to user B's brand path) |

### 9.3 E2E tests (Playwright / Vercel Agent Browser)

| Spec | Covers |
|---|---|
| `tests/e2e/brand-kit/visuals-flow.spec.ts` | Sign in, navigate to /account/brand-kit, switch brand, upload font with license attestation, verify font appears in list |
| `tests/e2e/brand-kit/tone-snippets-crud.spec.ts` | Add → reorder via drag → edit → delete |
| `tests/e2e/brand-kit/saved-blocks-crud.spec.ts` | Add with type='cta' → edit → delete |
| `tests/e2e/brand-kit/writing-rules-toggle.spec.ts` | Toggle each rule; refresh; assert state persisted |
| `tests/e2e/brand-kit/voice-draft-confirm.spec.ts` | Connect Shopify (mocked at Edge), assert confirm modal opens, edit voice content, click Confirm, assert brands.identity.voice.content matches edited value |
| `tests/e2e/brand-kit/voice-draft-discard.spec.ts` | Same but click Discard; assert brands.* unchanged |
| `tests/e2e/brand-kit/drag-color-to-canvas.spec.ts` | Open canvas, drag color from Assets panel onto a frame, assert fill changed |
| `tests/e2e/brand-kit/drag-font-to-text.spec.ts` | Drag font onto TEXT node, assert fontFamily changed |
| `tests/e2e/brand-kit/drag-saved-block-to-canvas.spec.ts` | Drag saved-block grip onto canvas, assert TEXT node spawned with content |

### 9.4 Manual QA (founder browser smoke per `feedback_browser_smoke_test_before_done`)

Founder runs the following in a browser pre-launch:

1. Sign in → navigate `/account/brand-kit` → cycle through all 7 sub-tabs, confirm each loads + renders correctly
2. Add a tone snippet via "+ Add tone snippet" → reorder by drag → edit → delete
3. Upload a real `.woff2` font file with license-attestation checked → verify font appears in canvas font picker
4. Connect Shopify on a test store → confirm modal opens with Anthropic-drafted voice + 3-8 tone snippets → edit one snippet → click Confirm → verify `/account/brand-kit/identity` voice card shows the edited content
5. Re-connect Shopify (force re-extract) → confirm modal opens with NEW draft → click Discard → verify nothing in DB changed
6. Open a canvas → drag a brand color onto a frame → verify fill applies; Shift+drag → stroke applies; drop on empty canvas → 200×200 rect spawned
7. Drag a saved block grip onto canvas → TEXT node spawns with content
8. Upload a PDF on KB sources → verify row appears with progress bar then success state
9. Verify privacy policy at `/privacy` includes the Anthropic sub-processor disclosure
10. Sign in with a different account, try to access first user's brand fonts via direct fetch — should 403

---

## 10. Rollout phasing

| Phase | Scope | Feature gate | Default |
|---|---|---|---|
| **Phase A (this PRD)** | All 7 sub-tabs (CRUD) + brand_fonts upload + brand_kb_sources upload + voice-draft confirm-step + 5 drag MIME types + AI prompt cross-cuts (Tone snippets + Identity + Writing rules consumed by Cluster 10) | none (always on) | n/a |
| **Phase B (deferred — Phase 2)** | "Draft via interview" AI flow for Identity cards · OpenType / advanced typography exposure · KB source text extraction worker (currently `extracted_text` stays null at MVP) · Custom tone-snippet category management | `BRAND_KIT_AI_INTERVIEW_ENABLED`, `KB_EXTRACTION_ENABLED` hard-coded `false` per D-5 feature flags (per 2.B.6 + 2.B.7) | OFF |

Feature flags live in `kova-open-pencil-1/src/constants.ts` per D-5. "Draft via interview" CTA is hidden via `v-if="BRAND_KIT_AI_INTERVIEW_ENABLED"`. Flag is hard-coded `false` in MVP — ratified 2026-05-17 per §12.3 (Figma parity: hide coming-soon, don't tease).

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on | What they depend on us for |
|---|---|---|
| **01 Auth & Identity** | `users` table exists; `auth.uid()` available in RLS; `gdpr_deletion_queue.storage` step enumerates Storage paths under `brand-fonts/{brand_id}/**` + `brand-kb-sources/{brand_id}/**` | This PRD's `brand_fonts` + `brand_kb_sources` + Storage paths get purged by Cluster 01's account-deletion cron; this PRD declares the FKs (`brand_id REFERENCES brands ON DELETE CASCADE`) so brand-deletion cascades automatically when Cluster 01's `db` step runs |
| **03 Brand Management** | `brands` table exists with `colors`, `fonts`, `logo_url`, `voice` columns (M9-shipped); `useBrandsStore.selectedBrand` reactive; `<BrandPicker>` component (A2a sidebar variant — same component as A2b which this PRD mounts) | When a brand is created, `useBrandKitStore` auto-loads its empty kit; when a brand is deleted, cascade drops `brand_fonts`/`brand_kb_sources` rows + Storage paths (via Cluster 01 cron) |
| **04 Account & Stripe** | `/account` route shell + sidebar with "Brand Kit" item; `IntegrationsCard.vue` (post-Shopify connect → kicks `/api/shopify/brand-kit-extract` which creates the voice draft) | Brand Kit section content (this PRD) lives at `/account/brand-kit` and is owned here; Cluster 04's IntegrationsCard handoff into Brand Kit is the post-connect navigation target |
| **06 Canvas Editor Core Chrome** | `use-canvas-drop.ts` dispatcher (Cluster 06 owns); canvas Assets panel surface (Cluster 06 mounts Brand Kit section there with drag tiles); ColorPicker.vue popover (Cluster 06) | This PRD owns the **drag MIME contract** + drag sources; this PRD owns Brand Kit data the Assets panel reads. **Cluster 06 MUST NOT re-spec the MIME payload** — it consumes the contract specced in §6.5 |
| **10 AI Chat + Memory + Tools** | `useBrandMemoryStore` (Cluster 10 owns the memory store + chat-side capture flow); `buildSystemPrompt(brand, canvas, recentTurns)` reads `brands.identity`, `brands.tone_snippets`, `brands.writing_rules` | Cluster 10's prompt builder MUST honor the writing-rules toggles (treat as hard constraints), inject tone snippets as system-prompt exemplars, prepend identity.voice as the primary voice guidance. Memories tab UI in this PRD reads the cluster-10-owned store |
| **11 Shared UI Infrastructure** | `<KovaModal>` + `useToast()` + `useConfirm()` + skeletons + idempotency-key wrapper | This PRD imports all five by name |
| **M9 (already merged)** | `api/shopify/brand-kit-extract.ts` HTTP shell + `api/_shared/shopify-brand-kit.ts` color/font/logo logic + `shopify_products` cache (used for product-description sampling) | This PRD extends the extract endpoint's response payload + ships the confirm-step. M9 colors/fonts/logo logic is reused verbatim |

---

## 12. Risks + open questions

| # | Risk / Question | Severity | Mitigation / Status |
|---|---|---|---|
| **12.1** | **`brands.voice` (TEXT, existing M9) vs `brands.identity.voice.content` (JSONB, this PRD)** — two fields holding the same concept. M9 extract writes `brands.voice` directly. Cluster 10 prompt-builder must know which to read. | MEDIUM | **Decision in §4.1**: keep both. M9 path continues to write `brands.voice` (single-line summary, no UI write surface — only API write from M9 extract). Cluster 10 reads `brands.identity.voice.content` when populated, else falls back to `brands.voice`. Migration plan post-launch: deprecate `brands.voice` once the Identity card is universally populated. Founder confirms acceptable. |
| **12.2** | **Memories tab cross-cut with Cluster 10** — the memory store + capture flow live in Cluster 10; this PRD only ships the **view + edit + delete UI**. If Cluster 10 PRD (Wave 6) is delayed, this tab renders empty. | LOW | **Acceptable**. MemoriesTab.vue reads `useBrandMemoryStore` — when Cluster 10 ships the store, the tab populates. Until then, tab shows empty state "Memories appear here as Kova captures them during chat." No blocker. |
| **12.3** | **"Draft via interview" CTA on Identity cards** — Phase 2 feature. Render disabled with tooltip, or hide entirely? | LOW | **RATIFIED 2026-05-17 (founder): render DISABLED with "Coming soon" tooltip.** Hard-coded `BRAND_KIT_AI_INTERVIEW_ENABLED = false` in `src/constants.ts`: when false, CTA renders with `disabled` attribute + Reka `<Tooltip>Brand voice interview — coming soon</Tooltip>` wrapper. When flag flips true in Phase 2, `disabled` lifts + tooltip swaps to action hint. Rationale: matches Figma "disable, don't hide" pattern (promotes feature discovery); consistent with PRD 06 §12.3 topbar Comments decision below. |
| **12.4** | **Voice-draft confirm modal vs onboarding step (Cluster 02)** — Cluster 02 owns the onboarding flow. After Shopify connect in onboarding, should the user (a) confirm-draft inline in onboarding, or (b) skip past and confirm later in `/account/brand-kit`? | MEDIUM | **RATIFIED 2026-05-17 (founder): inline-during-onboarding, skippable.** Cluster 02 PRD must mount `<VoiceDraftConfirmModal>` after StoreTypeStep success. Modal has `Confirm & save` (primary), `Discard draft` (secondary), and `Skip for now` (tertiary text-link). Skip closes modal without DB write, advances onboarding, leaves `voice_drafts` row open. Whenever user later lands on `/account/brand-kit` with an open draft (`confirmed_at IS NULL AND discarded_at IS NULL`), the modal re-opens automatically (per §3.9). Optional: brand-kit shell renders a persistent banner "Brand voice draft ready — review" linking to modal trigger. Matches Figma library-import pattern (inline preview + confirm at moment of import). |
| **12.5** | **B4.6 inline error (user-not-found) — enumeration safety** — N/A for this PRD (auth concern owned by Cluster 01) | n/a | Cross-referenced only. |
| **12.6** | **Anthropic voice-scrape token budget** — what if storefront text is very long? (>10k chars) | LOW | **Mitigation**: truncate input to first 5k chars of About page + first 5 product descriptions (~200 chars each ≈ 1k chars). Total ≤ 6k chars → ≤ 2k tokens — well under per-request budget. |
| **12.7** | **Drag-drop in Safari** — `draggable=true` + `setData` works cross-browser, but Safari has historic quirks with custom MIME types | LOW | E2E tests in §9.3 cover Safari via Playwright; verify pre-launch. If Safari fails, fallback to `application/x-vnd.kova.brand-color` etc. (more conservative naming) |
| **12.8** | **Identity tab — `brands.voice` deprecation timeline** | LOW | Post-launch task; not a Wave-4 concern. Flag for Wave 6 cleanup. |
| **12.9** | **Brand fonts file format support** — woff2/ttf/otf only. What about variable fonts (TTF with variations)? | LOW | Variable fonts are TTF with extra tables — they pass the mime/extension check and CanvasKit handles them. Tested in Wave-4 unit tests. No special handling needed. |
| **12.10** | **Knowledge base text extraction** — extracted_text column is null at MVP. AI prompt-builder (Cluster 10) cannot use KB content until extraction worker ships. | MEDIUM | **Acceptable**. Phase 2 ships extraction worker (`pdf-parse` for PDFs, raw for MD/TXT). MVP UX: user uploads sources; sources are listed; AI can reference them by filename but not content. Cluster 10 PRD must document this gap. |
| **12.11** | **Anthropic 30-day retention vs voice-draft data flow** | LOW | The Anthropic API call sends ≤ 2k input tokens of merchant storefront content. Anthropic retains 30 days by default. This is covered by Cluster 01's privacy policy disclosure + `anthropic_deletion_log` operator-manual workflow. No incremental risk vs existing AI chat flow. |
| **12.12** | **PRD scope expansion vs original user prompt** — user prompt listed 6 sub-tabs (Visuals, Fonts, Tone snippets, Saved blocks, Memory, KB sources); hi-fi A7 shows 7 (adds Identity + Writing rules; "Fonts" is part of Visuals). This PRD ships all 7. | LOW | **RATIFIED 2026-05-17 (founder): ship all 7 sub-tabs.** Visuals, Identity, Tone snippets, Saved blocks, Writing rules, Memories, KB sources. Hi-fi reflects founder-locked design (A7.3.x scenes). Identity narrative cards + Writing rules toggles feed AI prompt builder (Cluster 10), improving generated email quality. Figma parity: comprehensive sub-categorization (Variables: 4 types, Settings: 7+ sections). |

| **12.13** | **Voice draft re-scrape behavior** — user dismisses draft #1 (banner pending); later re-connects Shopify or hits "Re-scrape voice" → does a new scrape replace draft #1 or queue? | LOW | **RATIFIED 2026-05-17 (founder): REPLACE.** Each new scrape DELETEs prior unconfirmed draft row (via partial unique index `idx_voice_drafts_brand_unconfirmed` violation) then INSERTs the new one. brand-kit-extract Edge Function uses `INSERT ... ON CONFLICT (brand_id) WHERE confirmed_at IS NULL AND discarded_at IS NULL DO UPDATE SET draft_payload = EXCLUDED.draft_payload, created_at = now()` semantics. User's in-progress edits on dismissed draft #1 are intentionally discarded (only confirmed edits persist). Matches Figma library re-link pattern + Linear/Notion AI-regenerate pattern. |
| **12.14** | **Skip-for-now banner persistence** — after Skip during onboarding, banner appears in `/account/brand-kit > Tone snippets`. Forever or auto-expire? | LOW | **RATIFIED 2026-05-17 (founder): persist FOREVER until user confirms or discards.** No cron expiry. Banner reads `voice_drafts WHERE confirmed_at IS NULL AND discarded_at IS NULL LIMIT 1`. Zero data loss risk. Mitigates "I'll do it later" abandonment by ensuring draft never silently vanishes. |
| **12.15** | **KB total file count cap** — per-file cap is 10 MB. Should there also be a per-brand file count cap? | LOW | **RATIFIED 2026-05-17 (founder): UNLIMITED count.** Only per-file 10 MB CHECK applies. No `count(*)` enforcement in `add_kb_source` RPC. List UX uses virtualized scroll if count grows large (Cluster 11 owns shared list primitives). |

**All open questions RATIFIED 2026-05-17 (founder):**
- ✅ **§12.3** — "Draft via interview" CTA: render **DISABLED with "Coming soon" tooltip** (`BRAND_KIT_AI_INTERVIEW_ENABLED = false`).
- ✅ **§12.4** — Voice-draft confirm: **inline-during-onboarding with Skip-for-now**; persistent banner in `/account/brand-kit` if draft remains open.
- ✅ **§12.12** — Scope: **all 7 sub-tabs** ship in MVP.
- ✅ **§12.13** — Voice re-scrape: **REPLACE** unconfirmed draft (idempotent upsert).
- ✅ **§12.14** — Skip-banner persistence: **FOREVER** until user acts.
- ✅ **§12.15** — KB file count: **UNLIMITED** (only per-file 10 MB applies).
- ✅ **Font cap** — `brand_fonts.file_size_bytes` capped at **5 MB** (5242880 bytes). Schema CHECK + UI gating + Edge Function pre-flight all enforce. Founder picked 5 MB (Figma image cap is 10 MB; brand fonts smaller — woff2 50–300 KB, variable fonts up to 5 MB) over earlier 10 MB recommendation.

No remaining open questions. Cluster 05 PRD is ready for implementation (Wave 4).

---

## 13. References

### 13.1 Source artifacts

- **Hi-fi files:**
  - `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` (Brand Kit sub-tabs: A7.3.1 Visuals, A7.3.2 Identity, A7.3.3 Tone snippets, A7.3.4 Saved blocks, A7.3.5 Writing rules, A7.3.6 Memories, A7.3.7 Knowledge base; A2b brand-picker open state)
  - `main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html` (B3.1 Add tone snippet 3 states · B3.2 Edit tone snippet · B3.3 Add saved block · B3.4 Edit saved block · B3.5 Delete confirm)
  - `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B8 Upload States - Dark.html` (B8.1 Avatar success cross-ref · B8.2 Button trigger · B8.3 Progress ring · B8.4 Progress bar · B8.5 Upload success · B8.6 Upload error · B8.7 Multi-state list · B8.8 KB sources list)

### 13.2 03 doc rows covered

- `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/03-implied-surfaces-and-backend.md`
  - §2.5 Left panel — Assets / Brand kit (16 rows) — the data side
  - §2.13 Brand assets & media (1 row + cross-cuts) — brand font upload
  - §3A Consolidations: properties-clipboard slot (not in 05); canvas drop-payload type extension (this PRD owns)
  - §3C #4 Brand font upload backend (storage + brand_fonts + Pinia + canvas font registration + AI prompt update)

### 13.3 Q-decisions baked in

- Q6 (brand_fonts NEW table — `brand_assets` verified MISSING via Supabase MCP 2026-04-25)
- Q8 (tone_snippets + saved_blocks INCLUDED MVP as JSONB on brands)
- Q9 (media.brand_id FK — confirmed existing; no migration)
- Q24 (drag-drop semantics + 5 MIME-type payloads — full table reproduced in §6.5)

### 13.4 Audit, verification, scope-plan references

- `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 05 (scope) + §5.5 Cluster impact (M9 reuse table — RE-SPEC: extend brand-kit-extract for voice/tone) + §5.6 item 3 (founder-ratified 2026-05-14) + §5.7 D-3 guardrail
- `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` §2.A Cluster 05 (lines 1404–1550) — auditor's pre-baked spec
- `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` §3.A D-3 (audit-decision-3 ratification: extend brand-kit-extract)
- `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` §6 #4 (Anthropic sub-processor disclosure) + #5 (voice-draft confirm-before-write guardrail)
- `kova-open-pencil-1/docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` §4.4 Shopify-connect gather (ADD voice/tone via Anthropic) + §6 Brand voice/tone storage + GUARDRAIL

### 13.5 PRD 01 canonical reference

- `kova-open-pencil-1/docs/kova-final-prds/01-auth-and-identity.md` — section template, idempotency-key pattern, RLS policy shape, Edge Function signature style, acceptance criteria phrasing, test-plan layout

### 13.6 Design system (canonical, version-controlled per 00e §4)

- `main-main-kova-scope/design-system/design.md` — token vocabulary + component contracts
- `main-main-kova-scope/design-system/kova-hifi.css` — canonical dark CSS (`:root` block → Tailwind `@theme`; component primitive classes → Vue components rendering same markup contract). Component classes used: `.acc-frame`, `.acc-rail`, `.acc-main`, `.acc-hero`, `.acc-content`, `.bk-wrap`, `.bk-subnav`, `.bk-pane`, `.s-section`, `.row-stack`, `.row`, `.list-stack`, `.list-row`, `.list-add`, `.sw-list`, `.sw-item`, `.font-row`, `.brandpick`, `.toggle`, `.nar-card`, `.dlg`, `.btn`, `.btn.primary`, `.btn.sm`, `.btn.ghost`, `.pill`, `.tag-mono`
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` — naming cheat-sheet

### 13.7 M9 reuse

- `kova-open-pencil-1/api/shopify/brand-kit-extract.ts` — EXISTING (extend per §5.1.5)
- `kova-open-pencil-1/api/_shared/shopify-brand-kit.ts` — REUSE color/font/logo logic
- `kova-open-pencil-1/src/stores/shopify-products.ts` — REUSE for product-description sampling
- M9 mandatory compliance webhooks (`api/shopify/compliance/*`) — KEEP per Shopify spec §5.3

### 13.8 Memory pointers (per 00a §3 reading order)

- `feedback_app_dark_website_light` — Brand Kit lives inside authenticated app → DARK theme
- `feedback_figma_ui_theme` — Figma reference for visual decisions (Brand Kit modal patterns, list-row grip drag-handle)
- `feedback_browser_smoke_test_before_done` — §9.4 manual QA
- `feedback_verify_with_docs` — Anthropic SDK + Supabase RLS path-prefix verified via WebFetch (logged in 00e §4)
- `project_kova_avatar` — freelance email marketer managing multiple brands → per-brand kit scoping
- `project_design_system_master` — canonical design-system path
- `project_m9_shopify_tools_schema_bug` — brand-kit-extract is post-fix (22 tests pass 2026-05-13)
- `project_m5_chat_memory_decisions` — Memories tab cross-cuts Cluster 10 brand-memory store
- `project_m5_design_approach_decisions` — bridge layer between brand kit and AI design generation

— End of PRD 05 —
