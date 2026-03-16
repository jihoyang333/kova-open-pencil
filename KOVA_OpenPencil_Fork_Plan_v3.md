# KOVA — OpenPencil Fork Implementation Plan (v2)

## Architecture Decision: March 11, 2026 (Revised)

**Decision:** Fork open-pencil/open-pencil (MIT license) as Kova's foundation. OpenPencil's existing AI pipeline (Vercel AI SDK + ToolLoopAgent + DirectChatTransport + native Anthropic support) is the generation engine. Kova's unique value is the email-specific system prompt intelligence, campaign guides, brand kits, and SaaS infrastructure built on top.

**Source repo:** github.com/open-pencil/open-pencil (master branch, v0.6.0+)
**License:** MIT

---

## Phase 1: Fork, Deploy, Validate (Weeks 1–2)

**Goal:** Get OpenPencil running as a Kova-branded web app with auth, and validate that your 95 Figma email templates render correctly.

**Tasks:**

1. Fork open-pencil/open-pencil to your GitHub
2. Clone and run locally: `bun install && bun run dev`
3. **CRITICAL VALIDATION:** Import several of your 95 Figma email templates as .fig files. These are complex — nested layers, multiple SVGs, wave dividers, absolute-positioned elements. They MUST render correctly. If they don't, file issues or fix before proceeding. This is the go/no-go gate.
4. Strip or ignore Tauri desktop-specific code (web-only)
5. Rebrand: logo, colors, app name → Kova
6. Deploy as Vite SPA (Vercel or Cloudflare Pages)
7. Add Supabase auth (email/password + OAuth)
8. Add basic database tables: users, clients, emails, brand_profiles, templates
9. Add route protection: unauthenticated → login, authenticated → editor
10. Test the existing AI chat: configure an Anthropic API key in OpenPencil's provider settings (⌘J → settings). Send a test prompt. Verify tool calls execute and shapes appear on canvas.

**Verification:** Sign up, sign in, open editor, import a .fig email template, see it render correctly, draw shapes, test AI chat generates shapes via tool calls.

---

## Phase 2: Dynamic System Prompt + API Proxy (Weeks 3–4)

**Goal:** Replace OpenPencil's static generic system prompt with Kova's dynamic email-specific prompt. Protect the Anthropic API key behind a server proxy.

**This is the highest-leverage phase.** The quality of Kova's email generation is determined almost entirely by the system prompt content. The tools, the renderer, the agentic loop — all already work. The prompt is what makes Claude produce beautiful emails instead of generic shapes.

**Tasks:**

1. **Modify `src/composables/use-chat.ts`:**
   - **BEFORE WRITING ANY CODE:** Read the actual `SYSTEM_PROMPT` constant as it exists in `src/composables/use-chat.ts` in the cloned repo. Do not reconstruct it from this document or any other source. The `buildSystemPrompt()` function must begin with that exact constant, verbatim, as its first value. Do not alter, summarize, or rephrase any part of it.
   - Add a `buildSystemPrompt()` function that keeps the existing `SYSTEM_PROMPT` constant word-for-word and appends email-specific content after it
   - The function appends: email design guidelines + campaign guide + brand kit + email JSX patterns + image handling instructions
   - Modify `createTransport()` to call `buildSystemPrompt()` instead of passing the raw `SYSTEM_PROMPT` constant

2. **Build the thin API proxy (`/api/ai-proxy`):**
   - Serverless function that validates Supabase auth session
   - Checks user's generation count against plan limit
   - Injects `ANTHROPIC_API_KEY` from server environment
   - Forwards request to Anthropic API
   - Streams response back
   - Increments usage counter

3. **Modify provider configuration:**
   - Lock the provider to Anthropic (users don't choose providers or enter API keys)
   - Route requests through `/api/ai-proxy` instead of directly to Anthropic
   - Hide or remove the provider settings UI (ProviderSettings.vue, ProviderSelect.vue, ProviderSetup.vue). **Order of operations:** First, use grep/search to find every import site and every template usage of these three components across the entire codebase. Remove all import statements and template usages first. Only after all references are removed, delete or stub the component files. Deleting the files before removing references will cause build errors.

4. **Add campaign type selector:**
   - UI element in the AI chat panel (dropdown or chips) for selecting campaign type: Educational, Community/Branded, Sales, Social Proof, Product Highlights
   - Selection is optional — if not selected, add an instruction to the system prompt telling Claude to infer the campaign type from the user's message
   - Selected campaign type triggers loading the corresponding campaign guide into the system prompt

5. **Write the email design guidelines** (added to system prompt — always present, see Section 9 of the Cursor Handoff doc for content)

6. **Write the email JSX patterns** (few-shot examples — always present, see Section 9 of the Cursor Handoff doc for content)

7. **Write the image handling instructions** (always present):
   - Default: use colored rectangle placeholders with descriptive names
   - If user has uploaded images to canvas before generation: check for existing image nodes and incorporate them

**Verification:** User types "Create a welcome email for a luxury skincare brand called Lumière with gold and navy colors" → Claude generates a complete multi-section email using `render` tool calls → email appears on canvas with correct structure, colors, typography, and spacing → sections include hero, content with CTA, features, and footer.

---

## Phase 3: Campaign Guides + Generation Quality (Weeks 4–6)

**Goal:** Write all 5 campaign guides and iterate on generation quality until emails look professional.

**Tasks:**

1. **Write 5 campaign guide markdown files** in `src/data/campaigns/`:
   - `educational.md` — Informative, value-driven content. Tips, how-tos, guides, brand knowledge. Focus on readability and content hierarchy.
   - `community-branded.md` — Brand storytelling, welcome sequences, loyalty, community building, behind-the-scenes. Warm, personal tone.
   - `sales.md` — Promotions, flash sales, discounts, abandoned cart recovery, urgency-driven. Bold visuals, clear CTAs, scarcity cues.
   - `social-proof.md` — Reviews, testimonials, user-generated content, case studies, trust-building. Customer-centric, authentic.
   - `product-highlights.md` — New arrivals, product launches, collections, feature showcases, cross-sells. Visual-forward, product imagery dominant.

2. **Iterative quality testing:**
   - Generate 5+ emails per campaign type
   - Evaluate: visual hierarchy, spacing, color usage, typography, section composition, overall aesthetics
   - Compare output against your 95 Figma templates — is the AI output at the same quality level?
   - Tune system prompt, JSX patterns, and campaign guides based on results
   - This is the most important iteration loop. The prompt engineering IS the product.

3. **Add more JSX pattern examples if needed.** If Claude struggles with specific patterns (product grids, testimonial blocks, multi-column layouts), add dedicated examples.

**Verification:** Generate emails for all 5 campaign types. Each should look like something an email marketer would actually send. Professional typography, proper spacing, brand-appropriate colors, clear visual hierarchy, well-structured sections.

---

## Phase 4: Brand Kit System (Weeks 6–7)

**Goal:** Per-client brand profiles that automatically inject into the AI system prompt.

**Tasks:**

1. Brand profile form UI (Vue component): primary color, secondary color, background color, accent color, heading font, body font, logo upload
2. Store in Supabase `brand_profiles` table linked to client
3. Logo upload to Supabase Storage, URL stored in brand_profiles
4. When opening an email for a client, load their brand profile
5. `buildSystemPrompt()` includes the brand kit as formatted context
6. When the AI chat session starts (or when the user switches clients), the system prompt is reassembled with the new brand kit

**Verification:** Create two clients with different brand profiles. Generate a welcome email for each. The emails should use the correct brand colors and fonts without the user specifying them in the prompt.

---

## Phase 5: ESP Export with Section Slicing (Weeks 7–8)

**Goal:** Email marketers can export their designs as per-section image slices ready for their ESP.

**Tasks:**

1. Slice line UI: horizontal dashed lines on canvas, draggable, right-click to add/remove
2. Store slice line positions in the email's design data
3. Export dialog: format (PNG/JPEG), quality, scale (1x/2x)
4. Per-slice export using OpenPencil's existing `exportImage` tool / canvas extraction
5. ZIP packaging with descriptive filenames (e.g., `hero.png`, `content.png`, `footer.png`)
6. Optional: auto-detect section boundaries from the top-level frames in the email

**Verification:** Generate an email → place slice lines between sections → Export → ZIP downloads with correctly sliced images matching canvas exactly.

---

## Phase 6: Client & Project Management (Weeks 8–9)

**Goal:** Multi-tenant workspace for managing multiple clients/brands and their emails.

**Tasks:**

1. Dashboard view: list of clients with thumbnails
2. Client detail view: brand profile + list of emails
3. New email flow: create from blank or from template
4. Email list with thumbnail previews and last-edited timestamps
5. Auto-save: debounced save of scene graph to Supabase. Note: OpenPencil already uses y-indexeddb + Yjs CRDT for local document persistence. Do not remove or fight this layer. Supabase auto-save adds server-side committed persistence on top of it — it does not replace local IndexedDB state.
6. Delete, duplicate, rename emails
7. Vue Router setup for dashboard ↔ editor navigation

**Verification:** Create multiple clients. Create emails under different clients. Navigate between dashboard and editor. Auto-save works. Reopen saved emails.

---

## Phase 7: Template Library (Weeks 9–10)

**Goal:** Users can browse and start from the 95 Figma email templates.

**Tasks:**

1. Import all 95 cleaned .fig template files to Supabase Storage
2. Create template records in database with campaign_type tags
3. Template browser UI: grid of thumbnails, filterable by campaign type
4. "Use this template" → clones template into a new email for the user's client
5. User can then edit manually or ask AI to modify the template

**Verification:** Browse templates → filter by campaign type → select one → opens in editor with all layers intact → edit and save as a new email under a client.

---

## Phase 8: Stripe, Polish, Launch (Weeks 10–12)

**Goal:** Production readiness.

**Tasks:**

1. **Stripe:** Subscription plans (free tier with 10 generations, paid with more). Checkout flow. Webhook handlers. Usage tracking via `/api/ai-proxy`.
2. **Loading states:** AI generating (streaming indicator in chat), template importing, export progress
3. **Error handling:** AI failure → error in chat with retry option, save failure → warning toast, export failure → error toast
4. **Performance:** Verify 60fps with complex email templates (100+ nodes)
5. **Mobile:** Dashboard is responsive. Editor is desktop-only for v1 (show "use desktop" message on mobile).
6. **Landing page:** Marketing site for Kova
7. **Beta testing:** Invite 5-10 email marketers for feedback
8. **Edge cases:** Empty canvas, very tall emails, browser refresh during generation, deleted client redirect, auth token expiry during generation

**Verification:** Full end-to-end: sign up → create client → set brand → select campaign type → generate email → edit on canvas → export as slices → download ZIP → upgrade to paid plan via Stripe.

---

## Superseded Documents

The following are now outdated and should NOT be referenced for implementation:
- `kova_v3_figma_native_plan.md` — Entirely replaced
- `KOVA_Architecture_Decisions.docx` — Strategic decisions partially valid (see Cursor Handoff Section 6 for what holds vs. what's dead). Implementation details all superseded.
- All old Kova source code (React, PixiJS, scene-graph-store, node-sync, etc.)
- The old Kova email designer skill files

---

*Created: March 11, 2026 | Revised: March 11, 2026 | Target launch: July 1, 2026*
