# KOVA — CURSOR HANDOFF: The OpenPencil Pivot

## Read This First

This document is a complete briefing for the Cursor AI agent. It explains a massive architectural pivot. The previous Kova codebase is being abandoned. A new codebase will be built by forking the open-source project OpenPencil (github.com/open-pencil/open-pencil, MIT license).

**Alongside this document, you have been given `KOVA_OpenPencil_Fork_Plan.md` which contains the phase-by-phase implementation plan. Read both. This document is the WHY and CONTEXT. The plan is the WHAT and HOW.**

---

## 1. What Is Kova

Kova is an AI-powered email design tool for ecommerce/DTC brands. Users describe an email they want, the AI generates a fully designed visual email on a canvas, users can edit it manually or ask the AI to modify specific elements, and then export as image slices for their ESP (Klaviyo, Mailchimp, etc.).

**Target launch: July 1, 2026.**

The core value proposition is: describe an email → get a beautiful, on-brand email design → export image slices ready for your ESP. The AI does the design work. The user does the creative direction.

---

## 2. What Happened — Why We're Pivoting

The previous Kova codebase was built in Next.js/React with a PixiJS canvas renderer. It went through multiple architecture pivots:
- Started as HTML email generation (Claude outputs ESP-compatible HTML)
- Pivoted to canvas-based image export
- Pivoted to Figma JSON + PixiJS rendering
- Went through 10+ phases of planning with multiple plan rewrites

The result: the codebase is non-functional. Phases 1-7 were marked as completed in the plan but the code is fragmented, vibe-coded across many changes, and does not work end-to-end. The canvas doesn't reliably render Figma JSON. Interactions are broken. The AI pipeline was never built.

**Rather than debugging months of accumulated tech debt, we are starting fresh by forking a working open-source design editor and building our email-specific intelligence layer on top.**

---

## 3. What Is OpenPencil

OpenPencil (github.com/open-pencil/open-pencil) is an open-source, AI-native design editor. MIT license. It's effectively an open-source alternative to Figma with full AI tool integration.

### Tech Stack
- **UI framework:** Vue 3 (Composition API) + Reka UI components
- **Styling:** Tailwind CSS 4
- **Canvas rendering:** CanvasKit (Skia WASM) on WebGL surface
- **Layout engine:** Yoga WASM (flexbox + CSS Grid)
- **File format:** Figma-compatible .fig files via Kiwi binary codec (194 schema definitions)
- **Desktop:** Tauri v2 (~7MB app) — we won't use this, web-only
- **AI integration:** Vercel AI SDK with `ToolLoopAgent` for multi-turn tool calling + `DirectChatTransport` for browser-to-provider communication
- **Build:** Vite 7, Bun
- **Testing:** Playwright (E2E) + bun:test (unit)

### What It Already Has (DO NOT REBUILD)
- Working canvas with 60fps rendering via CanvasKit/Skia
- Scene graph with undo/redo (inverse-command pattern)
- .fig file import/export (reads native Figma files)
- Copy/paste between OpenPencil and Figma
- 92 AI tools (create shapes, set styles, manage layout, components, variables, boolean ops, vector paths, analysis)
- Built-in AI chat with multi-turn tool use, agentic loop (`ToolLoopAgent`), collapsible tool call timeline, and visual verification
- Native Anthropic provider support (`@ai-sdk/anthropic` — already integrated, no adapter needed)
- Auto-layout via Yoga WASM (flexbox)
- Drawing tools: shapes, pen tool, vector networks, rich text
- Properties panel: position, size, fills, strokes, effects, typography, layout
- Layers panel with tree view, drag-to-reorder, reparent
- Export: PNG/JPG/WebP/SVG at any scale
- Components with instances and override support
- Variables with collections and modes (design tokens)
- P2P collaboration via WebRTC (optional, not needed for v1)
- Headless CLI for .fig file operations

### Editor UI — KEEP AS-IS
OpenPencil's editor UI stays exactly as it is. The toolbar, canvas, layers panel, properties panel, AI chat panel — all remain unchanged. This is intentional: OpenPencil's UI replicates Figma's interface because it reads Figma's native binary format (Kiwi codec) and renders with an equivalent engine (CanvasKit/Skia). The UI is polished and functional.

What Kova ADDS to the UI (new pages/views, not replacements):
- Dashboard pages (clients list, emails list, template browser)
- Brand profile form (per-client colors, fonts, logo)
- Login/signup pages (Supabase auth)
- Enhanced export panel (section slicing for ESP)
- Campaign type selector (in the AI chat panel or as a pre-generation step)

What Kova DOES NOT change in the UI:
- The canvas and rendering engine
- The toolbar and drawing tools
- The layers panel
- The properties/design panel
- The AI chat panel layout (only the system prompt content changes)
- Keyboard shortcuts and interactions

### Project Structure
```
packages/
  core/           @open-pencil/core — engine (scene graph, renderer, layout, codec)
    src/
      tools/      ← THE 92 TOOL DEFINITIONS (schema.ts, create.ts, modify.ts, etc.)
      figma-api.ts ← Figma Plugin API compatible execution target
      render/     ← JSX-to-design renderer (used by the `render` tool)
      color.ts    ← Color parsing utilities
  cli/            @open-pencil/cli — headless CLI
  mcp/            @open-pencil/mcp — MCP server (stdio + HTTP)
  docs/           Documentation site
src/
  ai/             AI tool wiring (tools.ts creates AI tools from editor store)
  components/
    chat/         AI chat UI (ChatInput.vue, ChatMessage.vue, ProviderSettings.vue)
    canvas/       Canvas components
    panels/       Side panels
  composables/
    use-chat.ts   ← THE AI CHAT CORE: system prompt, provider config, ToolLoopAgent
  views/          Route views
  stores/         Editor state (Vue reactivity)
  engine/         Re-export shims from @open-pencil/core
desktop/          Tauri v2 (ignore for web)
tests/            E2E + unit tests
```

---

## 4. The AI Pipeline — How It Actually Works

This section explains the EXISTING AI pipeline in OpenPencil, which Kova inherits and extends. Understanding this is essential because it's simpler than the architecture we originally planned.

### The Generation Architecture (already built)

There is NO custom backend API route for generation. There is NO custom Anthropic adapter. There is NO compiler. The entire AI pipeline runs in the browser using the Vercel AI SDK:

```
User types in AI chat
  → ToolLoopAgent (Vercel AI SDK) sends prompt + tools to Anthropic
  → Claude responds with tool calls
  → Tools execute against FigmaAPI (scene graph) in the browser
  → Canvas re-renders immediately
  → ToolLoopAgent sends tool results back to Claude
  → Claude calls more tools or sends final text response
  → Loop continues until done
```

### The Key File: `src/composables/use-chat.ts`

This file is the heart of the AI pipeline. It contains:

1. **The system prompt** (`SYSTEM_PROMPT` constant) — A comprehensive design assistant prompt that teaches Claude how to use the `render` tool with JSX, layout rules, sizing behaviors, color contrast rules, and a verification workflow.

2. **Provider configuration** — Supports Anthropic, OpenAI, Google, OpenRouter, and custom endpoints. Anthropic is already a first-class provider via `@ai-sdk/anthropic`. API keys stored in localStorage.

3. **The agent setup** (`createTransport()` function):
```typescript
const agent = new ToolLoopAgent({
  model: createModel(),       // Creates Anthropic/OpenAI/etc model
  instructions: SYSTEM_PROMPT, // ← THIS IS WHAT KOVA CHANGES
  tools,                       // All 92 tools, adapted for Vercel AI SDK
  maxOutputTokens: 16384
})
return new DirectChatTransport({ agent })
```

Note: DirectChatTransport has no mid-stream reconnection support. If the stream drops during generation, it cannot resume. For Phases 1–7, accept this. In Phase 8 (polish), add a "Generation failed — retry?" UI state that re-triggers the full generation from scratch.

4. **Tool wiring** — `createAITools()` (from `src/ai/tools.ts`) converts all 92 tools to Vercel AI SDK format, connects them to the editor store's FigmaAPI, and adds undo/redo support for every mutation.

### The `render` Tool — Primary Creation Method

For GENERATION (creating new designs), the `render` tool is the primary method. It takes a JSX string and creates entire component trees in a single call:

```jsx
<Frame name="Hero" flex="col" w={600} bg="#0A1628" items="center" justify="center" gap={16} p={40}>
  <Text size={48} weight="bold" color="#C9A96E" font="Playfair Display">Lumière</Text>
  <Text size={18} color="#FFFFFF">Welcome to radiant skin</Text>
</Frame>
```

One `render` call creates a complete section with all children, styles, and layout. This is far more efficient than calling `createShape` + `setFill` + `setText` individually. The system prompt teaches Claude the full JSX prop reference.

For EDITING (modifying existing designs), the granular tools (`setFill`, `setStroke`, `updateNode`, `setText`, etc.) are used because Claude targets specific nodes by ID.

### What Kova Changes About the AI Pipeline

**Only one thing: the `instructions` passed to `ToolLoopAgent`.** The existing `SYSTEM_PROMPT` stays word-for-word — every line of the JSX reference, layout rules, forbidden patterns, and verification workflow must remain intact. Kova APPENDS email-specific content after it:

1. The existing OpenPencil system prompt — UNCHANGED, every word stays
2. Email-specific design guidelines (APPENDED — 600px width, section patterns, typography hierarchy)
3. Campaign-specific guide (APPENDED — dynamically loaded based on campaign type)
4. Brand kit context (APPENDED — dynamically loaded based on active client)
5. Image handling instructions (APPENDED — placeholder behavior, user-uploaded images)
6. Email section JSX patterns (APPENDED — few-shot examples of email components)

The modification happens in `createTransport()` — the static `SYSTEM_PROMPT` constant is kept as-is, and a `buildSystemPrompt()` function appends email content after it:

```typescript
function buildSystemPrompt(campaignType?: string, brandKit?: BrandKit): string {
  let prompt = SYSTEM_PROMPT  // OpenPencil's existing prompt — UNCHANGED, every word stays
  prompt += '\n\n' + EMAIL_DESIGN_GUIDELINES  // Email-specific rules (always appended)
  if (campaignType) {
    prompt += '\n\n' + loadCampaignGuide(campaignType)  // Campaign-specific guide
  }
  if (brandKit) {
    prompt += '\n\n' + formatBrandKit(brandKit)  // Client's brand context
  }
  prompt += '\n\n' + EMAIL_JSX_PATTERNS  // Few-shot JSX examples for email sections
  prompt += '\n\n' + IMAGE_HANDLING_INSTRUCTIONS  // How to handle images
  return prompt
}
```

The `createTransport()` function then passes `buildSystemPrompt()` result to `ToolLoopAgent.instructions` instead of the raw `SYSTEM_PROMPT` constant.

**Everything else in the AI pipeline stays exactly as OpenPencil built it.** The tools, the ToolLoopAgent, the DirectChatTransport, the tool execution against FigmaAPI, the undo/redo, the canvas re-rendering — all unchanged.

---

## 5. The Tool System

OpenPencil's tool system is transport-agnostic. Tools are defined once in `packages/core/src/tools/` as `ToolDef` objects and adapted to different formats:
- `ai-adapter.ts` → Vercel AI SDK tool() wrappers (for built-in chat) — THIS IS WHAT KOVA USES
- `packages/mcp/src/server.ts` → MCP registerTool() (for Claude Code/Cursor) — not used by Kova's users
- Both adapters read from the same `ALL_TOOLS` array — same tools, different transports

### How Tools Execute
All tools execute against `FigmaAPI` (`packages/core/src/figma-api.ts`). FigmaAPI is Figma Plugin API compatible and operates on the scene graph. When Claude calls `render` with JSX, the render tool creates real nodes in the scene graph, which the canvas immediately renders. When Claude calls `setFill(id, color)`, it modifies an existing node, and the canvas updates.

**There is no "compiler" in the old sense.** The old architecture had Claude calling tools → a compiler converting tool calls to Figma JSON → PixiJS rendering the JSON. In the OpenPencil architecture, Claude calls tools → tools execute directly against the scene graph → CanvasKit renders. No intermediate conversion step.

### The 92 Tools (Complete List)
All defined in `packages/core/src/tools/`:

**Read (14):** getSelection, getPageTree, getNode, findNodes, queryNodes, getComponents, listPages, switchPage, getCurrentPage, pageBounds, selectNodes, listFonts, getJsx, diffJsx

**Create (7):** createShape, render, createComponent, createInstance, createPage, createVector, createSlice

**Modify (21):** setFill, setStroke, setEffects, updateNode, setLayout, setConstraints, setRotation, setOpacity, setRadius, setMinMax, setText, setFont, setFontRange, setTextResize, setVisible, setBlend, setLocked, setStrokeAlign, setTextProperties, setLayoutChild, setImageFill

**Structure (17):** deleteNode, cloneNode, renameNode, reparentNode, groupNodes, ungroupNode, flattenNodes, nodeToComponent, nodeBounds, nodeMove, nodeResize, nodeAncestors, nodeChildren, nodeTree, nodeBindings, nodeReplaceWith, arrangeNodes

**Variables (11):** listVariables, listCollections, getVariable, findVariables, createVariable, setVariable, deleteVariable, bindVariable, getCollection, createCollection, deleteCollection

**Vector & Export (14):** booleanUnion, booleanSubtract, booleanIntersect, booleanExclude, pathGet, pathSet, pathScale, pathFlip, pathMove, viewportGet, viewportSet, viewportZoomToFit, exportSvg, exportImage

**Analyze & Diff (7):** analyzeColors, analyzeTypography, analyzeSpacing, analyzeClusters, diffCreate, diffShow, describe

**Eval (1):** evalCode

### Key Tool Details (from source code)

**render** — THE PRIMARY CREATION TOOL. Takes a JSX string and creates entire component trees in one call. Full JavaScript expressions work (map, ternaries, Array.from). Available JSX tags: Frame, Text, Rectangle, Ellipse, Line, Star, Polygon, Group, Section, Component. Props include position (x, y), size (w, h, "hug", "fill", grow), text (size, weight, color, font, textAlign), fills (bg), strokes (stroke, strokeWidth), corners (rounded), layout (flex, gap, justify, items, p/px/py/pt/pr/pb/pl), grid, effects (shadow, blur, opacity, rotate, blendMode), and overflow. Size limit: ~40 elements per call — split complex designs into multiple render calls using parent_id.

**createShape** — Lower-level creation. Creates FRAME, RECTANGLE, ELLIPSE, TEXT, LINE, STAR, POLYGON, SECTION. Takes x, y, width, height, name, parent_id. Returns node summary with ID. Use when you need a node without children or when render's JSX isn't sufficient.

**createVector** — Creates vector nodes with SVG path data. Used for wave dividers and decorative shapes. Takes x, y, name, path (VectorNetwork JSON), fill, stroke, stroke_weight, parent_id.

**setFill** — Takes node ID + hex color. Sets solid fill.

**setStroke** — Takes node ID + hex color + weight + align (INSIDE/CENTER/OUTSIDE).

**setEffects** — Takes node ID + effect type (DROP_SHADOW, INNER_SHADOW, FOREGROUND_BLUR, BACKGROUND_BLUR) + color, offset_x, offset_y, radius, spread. Appends to existing effects array.

**setLayout** — Sets auto-layout (flexbox) on a frame: direction (HORIZONTAL/VERTICAL), spacing, padding (uniform or horizontal/vertical split), align (MIN/CENTER/MAX/SPACE_BETWEEN), counter_align (MIN/CENTER/MAX/STRETCH).

**setLayoutChild** — Configures a child within auto-layout: sizing_horizontal/sizing_vertical (FIXED/HUG/FILL), grow factor, align_self (INHERIT/MIN/CENTER/MAX/STRETCH/BASELINE), positioning (AUTO/ABSOLUTE). ABSOLUTE positioning takes a node out of auto-layout flow — essential for overlays, badges, and layered designs.

**setImageFill** — Takes node ID + base64-encoded image data + scale_mode (FILL/FIT/CROP/TILE). Used when user uploads images before generation.

**updateNode** — Batch property update: x, y, width, height, opacity, corner_radius, visible, text, font_size, font_weight, name. All optional. Efficient for editing multiple properties on a single node.

**setBlend** — All standard blend modes: NORMAL, DARKEN, MULTIPLY, COLOR_BURN, LIGHTEN, SCREEN, COLOR_DODGE, OVERLAY, SOFT_LIGHT, HARD_LIGHT, DIFFERENCE, EXCLUSION, HUE, SATURATION, COLOR, LUMINOSITY.

**describe** — Semantic description of a node with role, style, layout, and design issues. Used for verification after render calls. The system prompt instructs Claude to call `describe` after every `render` to verify the output and fix issues.

---

## 6. What To Keep From The Old Kova Project

### KEEP (copy config/credentials, not code):
- **Supabase project** — Auth configuration, database tables, storage buckets, RLS policies
- **Supabase environment variables** — SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- **Stripe configuration** — API keys, webhook endpoints, product/price IDs
- **Anthropic API key** — For the AI pipeline (but see API Key Strategy below)
- **Domain/DNS** — Whatever domain is configured
- **Brand assets** — Logo, colors, marketing copy for Kova itself

### DISCARD (do not port, do not reference):
- **All React/Next.js code** — We're in Vue now
- **All PixiJS code** — Canvas rendering is now CanvasKit/Skia
- **The old scene graph store** — OpenPencil has its own
- **The old reconciler (node-sync.ts)** — Not needed
- **The old type system (figma.ts types)** — OpenPencil has its own
- **The old Figma JSON stripping script** — OpenPencil reads .fig files natively
- **The old interaction manager** — OpenPencil has its own
- **The old properties panel stubs** — OpenPencil has a working properties panel
- **All old AI route stubs** — OpenPencil's AI chat replaces all of this
- **The old validator** — Not needed; tools execute directly against the scene graph
- **kova_v3_figma_native_plan.md** — Entirely superseded
- **The Kova email designer skill files** — The HTML/ESP approach is dead

### PARTIALLY RELEVANT (strategic concepts, not implementation):
The `KOVA_Architecture_Decisions.docx` (March 7, 2026) made strategic decisions. Here is what holds and what is dead:
- ✅ **Primitives approach** — Claude calls tools, not template pickers. OpenPencil's 92 tools ARE primitives. The `render` tool with JSX is the primary creation method; granular tools handle editing.
- ✅ **Dynamic system prompts** — Backend detects campaign type, loads relevant guide, assembles system prompt. Still the architecture, but it happens by modifying the `instructions` field in `ToolLoopAgent`, not via a separate API route.
- ✅ **Brand kits** — Store brand colors/fonts/logo, inject into system prompt.
- ✅ **SVG wave dividers as pre-built assets** — `createVector` tool with stored path data.
- ✅ **ESP export as image slices** — Sections exported as separate images.
- ❌ **Anthropic function calling adapter** — Not needed. OpenPencil already supports Anthropic via `@ai-sdk/anthropic`. The Vercel AI SDK handles tool format conversion automatically.
- ❌ **Custom API route `/api/generate`** — Not needed for generation. OpenPencil's `DirectChatTransport` handles browser-to-provider communication. Only a thin proxy is needed for API key protection.
- ❌ **Custom agentic loop** — Not needed. `ToolLoopAgent` handles multi-turn tool calling.
- ❌ **Compiler that converts tool calls to Figma JSON** — Dead. Tools execute directly against FigmaAPI/scene graph.
- ❌ **Stripped Figma JSON format** — Irrelevant. OpenPencil reads .fig natively.
- ❌ **PixiJS renderer** — Dead. CanvasKit/Skia.
- ❌ **Stripping script** — Dead. Kiwi codec.
- ❌ **Coordinate math concerns** — Handled internally by OpenPencil.

---

## 7. The New Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     KOVA WEB APP (Vue 3)                         │
│  Forked from open-pencil/open-pencil                             │
│                                                                  │
│  ┌───────────────┐  ┌─────────────────────────────────────────┐  │
│  │  Dashboard     │  │  Editor (OpenPencil — UNCHANGED UI)     │  │
│  │  (NEW pages)   │  │                                         │  │
│  │  - Clients     │  │  ┌────────────┐  ┌──────────────────┐  │  │
│  │  - Emails      │  │  │  Canvas    │  │  AI Chat Panel   │  │  │
│  │  - Templates   │  │  │  (Skia)   │  │  (existing UI)   │  │  │
│  │  - Brand       │  │  │           │  │                  │  │  │
│  │    Profiles    │  │  │  unchanged │  │  SYSTEM PROMPT   │  │  │
│  │               │  │  │           │  │  is dynamically  │  │  │
│  │               │  │  │           │  │  assembled with  │  │  │
│  │               │  │  │           │  │  email guides +  │  │  │
│  │               │  │  │           │  │  brand kit       │  │  │
│  └───────────────┘  │  └────────────┘  └──────────────────┘  │  │
│                     │                                         │  │
│                     │  ┌────────┐ ┌──────┐ ┌──────────────┐  │  │
│                     │  │ Layers │ │Props │ │Export Panel  │  │  │
│                     │  │ Panel  │ │Panel │ │(NEW: slice   │  │  │
│                     │  │unchanged│ │ unchanged│ │+ ZIP)  │  │  │
│                     │  └────────┘ └──────┘ └──────────────┘  │  │
│                     └─────────────────────────────────────────┘  │
│                                                                  │
│  AI Pipeline (runs in browser via Vercel AI SDK):                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ buildSystemPrompt(campaignType, brandKit)                  │  │
│  │   = OpenPencil base prompt (JSX reference, layout rules)   │  │
│  │   + Email design guidelines (600px, sections, typography)  │  │
│  │   + Campaign guide (educational / sales / social-proof / etc.)│  │
│  │   + Brand kit (colors, fonts, logo URL)                    │  │
│  │   + Email JSX patterns (few-shot examples)                 │  │
│  │   + Image handling instructions                            │  │
│  │                                                            │  │
│  │ → ToolLoopAgent(instructions, tools, model)                │  │
│  │ → DirectChatTransport → thin proxy → Anthropic API         │  │
│  │ → Claude responds with tool calls (render JSX, setFill..)  │  │
│  │ → Tools execute against FigmaAPI (scene graph)             │  │
│  │ → Canvas re-renders in real-time                           │  │
│  │ → Loop until Claude sends final text response              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Backend (serverless — minimal):                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ /api/ai-proxy — Thin proxy to Anthropic (API key inject)   │  │
│  │ /api/auth/* — Supabase auth helpers                        │  │
│  │ /api/stripe/* — Billing webhooks                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │  Supabase  │  │  Stripe    │  │  Anthropic  │                 │
│  │  Auth + DB │  │  Billing   │  │  API        │                 │
│  │  + Storage │  │            │  │  (Claude)   │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

### Generation Flow (step by step)

1. User opens an email in the editor. The active client's brand kit and (optionally) a campaign type are known.
2. User types "Create a welcome email for my luxury skincare brand" in the AI chat panel (⌘J).
3. If no campaign type was pre-selected, the system prompt includes a classification instruction — Claude identifies "welcome" from the user's message and follows the welcome campaign guide.
4. The system prompt was dynamically assembled when the chat session started:
   - OpenPencil's base prompt (JSX reference, layout rules, sizing, forbidden patterns, verification workflow)
   - Email design guidelines (600px width, section-based composition, typography hierarchy, spacing rhythm)
   - Campaign guide for "welcome" (section sequence, tone, urgency level, content patterns)
   - Brand kit (primary: #C9A96E, secondary: #0A1628, heading font: Playfair Display, body font: Inter)
   - Email JSX patterns (example hero section, example CTA section, example product grid)
   - Image handling: "Use colored rectangle placeholders with descriptive names for images. If the user has uploaded images to the canvas before asking for generation, reference those node IDs."
5. `ToolLoopAgent` sends the assembled prompt + user message + all 92 tools to Anthropic via `DirectChatTransport` (through the thin API key proxy).
6. Claude responds with `render` tool calls — one per major section:
   ```
   render({ jsx: '<Frame name="Hero" flex="col" w={600} bg="#0A1628" ...>...</Frame>', x: 0, y: 0 })
   render({ jsx: '<Frame name="Content" flex="col" w={600} bg="#FFFFFF" ...>...</Frame>', parent_id: "email_root_id" })
   render({ jsx: '<Frame name="Footer" flex="col" w={600} bg="#0A1628" ...>...</Frame>', parent_id: "email_root_id" })
   ```
7. Each `render` call executes against FigmaAPI → scene graph updates → canvas re-renders immediately. User sees sections appear in real-time.
8. After each `render`, Claude calls `describe` on the created node to verify structure, layout, and styling. If issues are found, Claude calls granular tools (`setFill`, `updateNode`, etc.) to fix them.
9. `ToolLoopAgent` automatically handles the multi-turn loop: Claude calls tools → sees results → calls more tools → repeat.
10. Claude sends a final text response ("I've created your welcome email with a dark hero section, content area with CTA, product features, and footer. You can select any element to edit it, or tell me what to change.").
11. User sees the complete email design on canvas.

### Editing Flow

1. User selects a text node on canvas and types "Make this bigger and gold" in the AI chat.
2. The system prompt includes the current selection context (OpenPencil's existing `getSelection` tool provides this).
3. Claude calls `updateNode(id, { font_size: 48 })` then `setFill(id, "#C9A96E")`.
4. Tools execute, canvas updates instantly.

### Campaign Type Selection

Two paths, user chooses:
- **Explicit selection:** Before generating, user picks from a dropdown: Educational, Community/Branded, Sales, Social Proof, Product Highlights. This loads the corresponding campaign guide into the system prompt.
- **AI inference:** User doesn't select a type. The system prompt includes a classification instruction: "Determine the email campaign type from the user's message. Available types: Educational, Community/Branded, Sales, Social Proof, Product Highlights. Follow the design patterns for that type." Claude infers and acts accordingly.

Both paths can coexist. If the user selects a type, it's injected directly. If they don't, Claude infers it.

### Image Handling During Generation

**Default behavior (no user uploads):** Claude creates colored rectangle placeholders with descriptive `name` properties. For example, a product image placeholder:
```jsx
<Rectangle name="Product Image - Hero Shot" w={600} h={400} bg="#E0E0E0" rounded={8} />
```
The user replaces these manually after generation by selecting the placeholder and uploading an image.

**When user uploads images first:** If the user uploads product images to the canvas BEFORE asking the AI to generate, those images exist as nodes in the scene graph. Claude can discover them via `findNodes` or `getPageTree` and reference their IDs using `reparentNode` to position them within the email layout, or it can read their image data for use in `setImageFill` on new frames.

The system prompt instructs Claude: "Check the canvas for any existing image nodes. If the user has uploaded product images, incorporate them into the design. If no images are present, use labeled placeholder rectangles."

---

## 8. API Key Protection Strategy

OpenPencil's default behavior stores the AI provider's API key in the user's browser localStorage. Users bring their own key. For Kova, this is wrong — Kova provides the AI, users pay a subscription.

**Solution: Thin API proxy.**

Instead of the browser sending requests directly to `api.anthropic.com`, it sends them to `/api/ai-proxy` on your backend. This endpoint:
1. Validates the user's session (Supabase auth)
2. Checks usage limits (generations_used < generations_limit based on plan)
3. Injects the `ANTHROPIC_API_KEY` from server environment
4. Forwards the request to Anthropic
5. Streams the response back to the browser
6. Increments generations_used counter

Modification needed in `use-chat.ts`: replace the `createAnthropic({ apiKey: key })` call with a provider that routes through your proxy. The Vercel AI SDK supports custom base URLs:
```typescript
const anthropic = createAnthropic({
  apiKey: 'proxy',  // Not the real key — the proxy injects it
  baseURL: '/api/ai-proxy'
  // NOTE: @ai-sdk/anthropic appends /v1/messages to this baseURL.
  // The proxy route must therefore handle POST /api/ai-proxy/v1/messages.
  // It must: validate Supabase auth, check usage limits, inject the real
  // ANTHROPIC_API_KEY, forward all headers (including anthropic-version
  // and content-type) to https://api.anthropic.com/v1/messages, and
  // stream the response back. The route is NOT just /api/ai-proxy.
})
```

Or use an OpenAI-compatible wrapper at your proxy URL if the routing is simpler that way.

**The user never enters an API key. The provider settings UI is hidden or locked to "Kova (Anthropic)".**

---

## 9. Email-Specific Content To Build

These don't exist in OpenPencil and represent Kova's core intelligence layer:

### Email Design Guidelines (added to system prompt — always present)
```
# Email Design Rules

- All email designs are exactly 600px wide. Always set the root frame to w={600}.
- Emails are composed of stacked sections. Each section is a Frame with w={600} and flex="col".
- Use auto-layout (flex) throughout. Never use absolute x/y positioning for email content.
- Exception: ABSOLUTE positioning is allowed for decorative overlays, badges, and layered backgrounds WITHIN a section.
- Typography hierarchy: Headline (32-48px, bold), Subheadline (20-24px, medium), Body (14-16px, regular), Caption (11-12px, regular).
- Line height: 1.4-1.6 for body text, 1.1-1.2 for headlines.
- Section padding: 32-48px vertical, 24-40px horizontal.
- CTA buttons: 16px rounded corners minimum, 16px/32px vertical/horizontal padding, contrasting color.
- Maximum content width within sections: 520-560px (600px minus horizontal padding).
- Dark sections: always set text color explicitly to white or light color. Default text is BLACK.
- Footer: smaller text (11-12px), muted colors, centered.
- Always verify each section with `describe` after rendering.
- CRITICAL: `describe` returns semantic/structural data — it does NOT visually render. It cannot detect invisible text. You must compensate explicitly: whenever you render a section with a dark background, immediately check that ALL child text nodes have an explicit light color set. Never assume text color inherits correctly. If in doubt, call `setFill` on the text node explicitly.
- For final verification of the complete email, use `exportImage` to get a visual render and confirm layout, spacing, and text visibility before completing.
```

### Campaign Guides (5 markdown files, loaded per campaign type)
Store as files in the project (e.g., `src/data/campaigns/educational.md`). Each guide describes: typical section sequence, design patterns, tone, urgency level, content density, recommended section count.

The 5 campaign types:
1. **Educational** — Informative, value-driven content. Tips, how-tos, guides, brand knowledge.
2. **Community / Branded** — Brand storytelling, welcome sequences, loyalty, community building, behind-the-scenes.
3. **Sales** — Promotions, flash sales, discounts, abandoned cart, urgency-driven.
4. **Social Proof** — Reviews, testimonials, user-generated content, case studies, trust-building.
5. **Product Highlights** — New arrivals, product launches, collections, feature showcases, cross-sells.

Example (educational.md):
```
# Educational Email Design Guide

**Campaign intent:** Position the brand as a trusted expert. The goal is to deliver value before asking for anything. The reader should finish the email having learned something.

**Tone:** Informative, helpful, warm authority. Not academic, not salesy.

**Recommended section sequence (4–5 sections):**
1. **Hero** — Text-forward. Large topic headline (36–44px bold) + 1-sentence intro. Light or white background preferred. No heavy imagery.
2. **Content Block A** — First educational point. Subheading (20–22px medium) + 3–5 lines of body text (15px, line-height 1.6). Optional supporting image placeholder on right (if two-column) or full-width above text.
3. **Content Block B** — Second educational point. Same structure. Can use a light accent background (#F7F7F7 or brand light) to break visual rhythm.
4. **Key Takeaway / Tip Box** — Highlighted summary or single actionable tip. Use brand accent background. Slightly larger body text (16px). Optional icon placeholder (40×40px circle).
5. **CTA + Footer** — Soft CTA ("Read the Full Guide", "Explore More Tips", or product tie-in). Footer standard.

**Typography rules:**
- Headline: 36–44px, bold, brand heading font, line-height 1.15
- Subheadings: 20–22px, medium (600), line-height 1.3
- Body: 15–16px, regular, line-height 1.6 — prioritize readability
- Caption/label: 11–12px, muted color (#888888 or similar)

**Color usage:**
- Prefer white or very light backgrounds for content blocks — this is a reading experience
- Use one dark section maximum (hero or footer only)
- Accent background for tip/takeaway box — never use two accent sections back to back
- CTAs use brand primary color

**Spacing & layout:**
- Section vertical padding: 48–56px
- Horizontal padding: 40px minimum
- Gap between content blocks within a section: 16–24px
- Tip box: 24px padding on all sides, 8px rounded corners

**Visual hierarchy rules:**
- Headlines must be visually dominant — do not let subheadings compete in size
- Body text sections should not exceed ~5 lines before a visual break (image, divider, or new section)
- Avoid centering body text — left-align for readability

**Anti-patterns to avoid:**
- Do not use more than 2 font sizes in a single content block
- Do not use a dark background for a content-heavy reading section
- Do not add urgency language or countdown-style elements — this is not a sales email
- Do not make the CTA the visual centerpiece — it should feel like a natural next step
```

> **Note for Cursor:** All 5 campaign guide files must be written at this same level of specificity — approximately 40–60 lines each. The campaign guides are Kova's core prompt engineering IP. Thin stubs will produce generic output. Each guide must specify section sequence, typography values, color usage patterns, spacing values, visual hierarchy rules, and anti-patterns.

### Brand Kit Injection (formatted string added to system prompt)
```
# Brand: Lumière Skincare
Primary color: #C9A96E (use for CTAs, accents, headlines)
Secondary color: #0A1628 (use for dark sections, footer)
Background: #FFFFFF
Accent: #E8D5B5
Heading font: Playfair Display
Body font: Inter
Logo: [uploaded to canvas as node ID "logo_node_123"] OR [not uploaded — use text-based brand name]

Apply these brand values to all design decisions. Never use colors outside this palette unless creating neutral grays for body text or dividers.
```

### Email JSX Patterns (few-shot examples added to system prompt)
```
# Email Section Patterns

## Hero Section (dark background)
<Frame name="Hero" flex="col" w={600} bg="#0A1628" items="center" justify="center" gap={16} py={64} px={40}>
  <Text size={48} weight="bold" color="#C9A96E" font="Playfair Display" textAlign="center">Brand Name</Text>
  <Text size={18} color="#FFFFFF" textAlign="center">Tagline goes here</Text>
</Frame>

## CTA Section
<Frame name="CTA Section" flex="col" w={600} bg="#FFFFFF" items="center" gap={24} py={48} px={40}>
  <Text size={28} weight="bold" color="#1A1A1A" textAlign="center">Your headline here</Text>
  <Text size={14} color="#666666" textAlign="center">Supporting paragraph text that describes the value proposition in 2-3 sentences.</Text>
  <Frame name="CTA Button" flex="row" bg="#C9A96E" rounded={8} px={32} py={16} items="center" justify="center">
    <Text size={16} weight="bold" color="#FFFFFF">Shop Now</Text>
  </Frame>
</Frame>

## Two-Column Features
<Frame name="Features" flex="row" w={600} bg="#F5F5F5" justify="center" gap={40} py={48} px={40}>
  <Frame flex="col" items="center" gap={12} grow={1}>
    <Ellipse name="Icon Placeholder" w={60} h={60} bg="#0A1628" />
    <Text size={16} weight="bold" color="#1A1A1A" textAlign="center">Feature Title</Text>
    <Text size={13} color="#666666" textAlign="center">Short description</Text>
  </Frame>
  <Frame flex="col" items="center" gap={12} grow={1}>
    <Ellipse name="Icon Placeholder" w={60} h={60} bg="#0A1628" />
    <Text size={16} weight="bold" color="#1A1A1A" textAlign="center">Feature Title</Text>
    <Text size={13} color="#666666" textAlign="center">Short description</Text>
  </Frame>
</Frame>

## Footer
<Frame name="Footer" flex="col" w={600} bg="#0A1628" items="center" gap={16} py={32} px={40}>
  <Frame flex="row" gap={16} items="center">
    <Ellipse name="Social Icon" w={24} h={24} bg="#FFFFFF30" />
    <Ellipse name="Social Icon" w={24} h={24} bg="#FFFFFF30" />
    <Ellipse name="Social Icon" w={24} h={24} bg="#FFFFFF30" />
  </Frame>
  <Text size={12} color="#FFFFFF80" textAlign="center">© 2026 Brand Name. All rights reserved.</Text>
</Frame>
```

---

## 10. Deployment

OpenPencil is a Vite SPA (Single Page Application). The main app is static files. API routes are minimal.

**Recommended: Vercel or Cloudflare Pages.**

The only backend routes needed:
- `/api/ai-proxy` — Thin proxy to Anthropic (injects API key, checks auth + usage limits)
- `/api/auth/*` — Supabase auth helpers (optional — can use Supabase client-side SDK directly)
- `/api/stripe/*` — Billing webhooks

### Environment Variables:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

---

## 11. Database Schema

```sql
create table users (
  id uuid references auth.users primary key,
  email text not null,
  plan text default 'free',
  stripe_customer_id text,
  generations_used integer default 0,
  generations_limit integer default 10,
  created_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table brand_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  primary_color text,
  secondary_color text,
  background_color text,
  accent_color text,
  heading_font text default 'Inter',
  body_font text default 'Inter',
  logo_url text,
  updated_at timestamptz default now()
);

create table emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  campaign_type text,
  design_data jsonb,          -- OpenPencil scene graph serialized
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text,
  fig_file_url text,          -- .fig file in Supabase storage
  thumbnail_url text,
  is_public boolean default true,
  created_at timestamptz default now()
);
```

---

## 12. Error Handling for AI Generation

The `ToolLoopAgent` handles the agentic loop automatically. Error handling is primarily a system prompt concern — Claude follows instructions on how to handle failures.

**Add to system prompt:**
```
# Error Handling Rules
- If a tool call fails, retry once with corrected parameters.
- If a tool call fails twice, skip that element and continue building the rest of the email.
- Always complete the full email design even if individual elements fail.
- After completing the email, report any skipped elements to the user so they can add them manually.
- Never stop generation mid-way due to a single error.
```

**Tool-level error handling (already built into OpenPencil's tools):**
- Node ID not found → tool returns `{ error: "Node not found" }` → Claude sees this and retries or skips
- Invalid parameters → tools have min/max/enum constraints that the Vercel AI SDK validates before execution

**Kova-specific addition — usage tracking:**
The `/api/ai-proxy` tracks generation count. If the user hits their plan limit, the proxy returns an error BEFORE sending to Anthropic. The AI chat shows a "You've reached your generation limit. Upgrade your plan to continue." message.

---

## 13. What NOT To Do

- **DO NOT rebuild the canvas, renderer, or scene graph.** OpenPencil's works. Use it.
- **DO NOT rewrite the tool definitions.** They're battle-tested with 92 tools, typed params, and working execute functions.
- **DO NOT build a custom Anthropic adapter.** OpenPencil already supports Anthropic via `@ai-sdk/anthropic` in `use-chat.ts`.
- **DO NOT build a custom agentic loop.** `ToolLoopAgent` from the Vercel AI SDK handles multi-turn tool calling.
- **DO NOT build a custom `/api/generate` backend route for generation logic.** The AI pipeline runs in the browser. Only build the thin `/api/ai-proxy` for API key protection.
- **DO NOT build a "compiler."** Tools execute directly against FigmaAPI. There is no intermediate format conversion.
- **DO NOT try to make OpenPencil output HTML.** Kova outputs visual designs that export as images.
- **DO NOT use PixiJS, React, or Next.js.** The app is Vue 3 with CanvasKit/Skia.
- **DO NOT change the editor UI** (canvas, toolbar, layers panel, properties panel, AI chat panel layout). Only ADD new pages (dashboard, login) and enhance existing panels (export with slicing).
- **DO NOT reference the old kova_v3_figma_native_plan.md or any old Kova code.** All superseded.
- **DO NOT expose the Anthropic API key to the browser.** Route through `/api/ai-proxy`.
- **DO NOT use MCP for the user-facing AI pipeline.** MCP is for developer tools. Kova uses the Vercel AI SDK's `DirectChatTransport` in the browser, proxied through a thin backend for API key safety.

---

## 14. Quick Reference: OpenPencil Files You'll Touch Most

| File/Directory | What It Is | When You'll Touch It |
|---------------|-----------|---------------------|
| `src/composables/use-chat.ts` | **THE AI CORE**: system prompt, provider config, ToolLoopAgent, DirectChatTransport | Making the system prompt dynamic, routing through API proxy, hiding provider settings |
| `src/ai/tools.ts` | Wires 92 tools to AI chat with undo/redo and layout recompute | Probably untouched — works as-is. WARNING: The tool schema layer uses **valibot**, not Zod. If you must modify this file or `packages/core/src/tools/ai-adapter.ts`, do not introduce Zod. Use valibot for any schema definitions. |
| `packages/core/src/tools/` | All 92 tool definitions | Reference only — don't modify |
| `packages/core/src/tools/schema.ts` | ToolDef type, defineTool helper | Reference only |
| `packages/core/src/figma-api.ts` | FigmaAPI — tool execution target | Reference only |
| `src/components/chat/` | AI chat UI components | Minor modifications (hide provider key input, add campaign selector) |
| `src/components/` | All Vue SFCs | Adding dashboard, brand profile, template browser, export panel |
| `src/stores/` | Editor state (Vue reactivity) | Adding user/client/email/brand state |
| `src/views/` | Route views | Adding dashboard, login, editor routes |
| `src/data/campaigns/` | NEW: Campaign guide markdown files | Creating all 5 campaign guides |

---

## 15. Getting Started (First Commands)

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/open-pencil.git kova
cd kova

# 2. Install dependencies
bun install

# 3. Run dev server
bun run dev
# → Opens at localhost:1420

# 4. Verify it works
# - Draw shapes, add text, test auto-layout
# - Import a .fig file (one of the 95 email templates)
# - Open AI chat (⌘J), configure an Anthropic API key in settings
# - Test: "Create a blue rectangle 600px wide and 200px tall"
# - Verify tool calls execute and shapes appear on canvas

# 5. Run tests (verify nothing is broken)
bun run test:unit
bun run check  # lint + typecheck
```

---

## 16. Timeline Summary

| Weeks | Phase | What |
|-------|-------|------|
| 1-2 | Fork + Deploy | Get running, add Supabase auth, import .fig templates, rebrand, deploy |
| 3-4 | Dynamic System Prompt | Extend `use-chat.ts` with `buildSystemPrompt()` that appends email guidelines + campaign guides + brand kit to the existing system prompt. Build thin `/api/ai-proxy`. Hide provider settings. |
| 4-6 | Email Intelligence | Write 5 campaign guide files. Write email JSX patterns. Write email design guidelines. Test generation quality extensively. Iterate on prompts. |
| 6-7 | Brand Kits | Brand profile form per client. Inject into system prompt dynamically. |
| 7-8 | ESP Export | Slice line UI on canvas. Per-section image export. ZIP packaging. |
| 8-9 | Client Management | Dashboard pages. Client CRUD. Email list. Auto-save. |
| 9-10 | Template Library | Import 95 .fig templates. Browse UI. Clone-to-new-email flow. |
| 10-12 | Polish + Launch | Stripe billing, loading states, error handling, beta testing, landing page. |

**Target: July 1, 2026**

---

*This document was created March 11, 2026, and revised March 11, 2026 after discovering OpenPencil's existing AI pipeline (use-chat.ts, ToolLoopAgent, DirectChatTransport, native Anthropic support). It supersedes all previous Kova implementation plans.*
