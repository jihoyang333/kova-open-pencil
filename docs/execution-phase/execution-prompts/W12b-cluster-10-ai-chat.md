# W12b — Cluster 10 (AI Chat + Memory + Shopify Tools) Execution Prompt

**Wave:** W12 (parallel-2: 09, 10)
**Cluster:** 10 — AI chat right-panel tab + memory + tone snippets + Shopify product references
**Status:** ready after W11 fully merged
**Worktree:** YES — `/Users/jihoyang/kova-build-c10`

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-build-c10`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W12b execution-phase agent. Build Cluster 10 — AI chat
right-panel tab + memory + Shopify product references + tone snippets
+ AI tool wrappers.

Parallel-2 wave. Sibling: Cluster 09 (version history).

## Worktree discipline

/Users/jihoyang/kova-build-c10 · app/cluster-10-ai-chat

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/10-ai-chat-and-memory.md
4. docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi (no dedicated chat-panel scene — composes from below; also see Plan 10 §Hi-fi Visual Reference):
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/Kova Canvas - Final.html (right-panel inspector chrome — Cluster 06 source-of-truth)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html (Ask Kova affordance ref)
   - /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html (Memories sub-tab A7.3.6)
   - Shopify product-reference design spec: docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md §4.2 (chip pattern)
10. Figma canvas UI right-panel reference (chat tab lives in right-panel):
    - /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/layers-panel-left-and-inspector-panel-right.png
11. Anthropic AI SDK docs (use context7 MCP for current API)
12. valibot docs (NO Zod per CLAUDE.md hard rule)

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (end)

## Conditional subagents

- typescript-pro — AI tool schemas + ToolLoopAgent integration
- vue-expert — chat panel reactivity, chip composer
- context7 MCP — verify @ai-sdk/anthropic + ai SDK current APIs

## Cluster 10 scope (per PRD 10 15 founder locks 2026-05-15)

- AI chat as right-panel "AI" tab (per CT-005 — default-active on first
  canvas open; NOT a floating popup)
- useRightPanelStore canonical (per CT-002 + W4 C-HIGH10)
- Layered system-prompt builder
  - Brand kit context (colors, fonts, logo)
  - Tone snippets exemplars (per Q8 founder lock — auto-injected)
  - Active product references (Shopify products composer chips)
  - Canvas state (currentPage, selection)
- Shopify product reference composer chips
  - Chip row BELOW attachments (per W4 C-MED28 — match §3.2 + §12.12
    founder lock)
  - Max 20 chips per session (per founder lock)
  - useShopifyProductsStore
- 5 Shopify AI tools (refactored per PRD 10 §6):
  - searchProducts (drop 'bestsellers' sort)
  - All 5 with hasShopifyConnection guard + NO_CONNECTION early-return
  - searchProducts, getProduct, getProductImages, listCollections,
    getCollection (or per PRD 10 §6 exact list)
- 2 new AI tool wrappers around Cluster 07a APIs:
  - createSliceFromSelection (Slice NodeType)
  - addMeasurement (page-level signature per W4 CT-004 +
    figma.currentPage.addMeasurement)
- engine_unavailable response when figma.currentPage.addMeasurement
  missing (per W4 C-LOW10.5)
- Brand memory (auto-populated, flat) — useBrandMemoriesStore
  - Max 50 memories per brand (per founder lock)
  - Stored in Supabase brand_memories table
- Independent chats per canvas (per PRD 10 founder lock)
  - Max 20 chat tabs (per founder lock)
- Tone snippets management (per Q8 founder lock — JSONB on brands)
  - Max 10 tone snippets per brand (per founder lock)
- Single mutation entry contract for chat product_references (per W4
  C-MED27)
- buildEmail() + parallel ensureChat + buildMessagePayload in
  handleSubmit (per W4 B-MED5)
- Anthropic sub-processor disclosure copy contribution to Cluster 01
  privacy policy / RoPA (cross-cluster follow-up — out of scope here,
  document in DONE report)

## Hard rules

- valibot only for tool schemas (NO Zod per CLAUDE.md hard rule)
- @ai-sdk/anthropic + ai SDK for AI calls (NOT custom Anthropic adapter)
- ToolLoopAgent for agentic loop (NOT custom)
- ANTHROPIC_API_KEY = server-only (NEVER VITE_ prefix; never exposed to
  browser)
- SYSTEM_PROMPT constant in use-chat.ts = READ-ONLY (do not modify)

## Hi-fi references

Read both hi-fi files in scope before writing chat surfaces.

## Branch + commits

Branch: app/cluster-10-ai-chat
Path: /Users/jihoyang/kova-build-c10

Commit format: feat(c10-tNN), test(c10), fix(c10-review)
ONE COMMIT PER TASK.

## Per-task flow

Standard TDD per Plan 10 §6.
AI tool tests: mock @ai-sdk/anthropic responses.
Tool wrapper tests: mock figma.currentPage API; verify
engine_unavailable early-return when API missing.
System-prompt builder tests: verify tone snippets + chips +
canvas state are correctly composed into prompt.

## Design-system compliance

Chat panel = .panel.ai pattern (right-panel tab content).
AI-only accent = var(--accent-ink) #a9c4ff (NOT regular --accent).
Composer chip row = .chip-row.
Chip = .chip with .selected variants.
Memory list = .memory-list with .memory-row patterns.
Tone snippet list = .snippet-list with .snippet-row patterns.
Send button = .btn.primary.icon (KovaIcon name="send").
Loading state = <KovaSkeleton> from Cluster 11.
Zero new tokens. Zero hex. Zero <style> blocks.

## Cluster-end gates

1. All Plan tasks committed (including W5a icon-lucide-* → KovaIcon
   refactor verified — zero <icon-lucide-*> in Plan 10 code)
2. bun run build / check / test:unit / test:dupes — green
3. CI grep gate:
   - zero `import { z } from 'zod'` (use valibot)
   - zero `VITE_ANTHROPIC_API_KEY` or any client-side Anthropic key
   - zero <icon-lucide-*>
4. supabase migration — brand_memories + chats + chat_tabs +
   product_references tables verified
5. database-reviewer — PASS on schema + RLS
6. superpowers:code-reviewer — PASS
7. e2e-runner —
   - open canvas → right-panel AI tab default-active
   - send chat message → AI responds with brand-kit context
   - add product reference chip → message includes chip
   - AI calls createSliceFromSelection → slice appears on canvas
   - AI calls addMeasurement → measurement overlay appears
   - missing currentPage → engine_unavailable response
   - add tone snippet → AI tone shifts
   - 21st chat tab → blocked with friendly message (max 20)
8. Playwright visual diff (chat panel, composer, memory list, tone
   snippet list) — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W12b-cluster-10-DONE.md

Note Anthropic sub-processor disclosure copy is contributed to
Cluster 01 (privacy policy / RoPA verbatim lift from
docs/legal/anthropic-subprocessor-disclosure.md). Cluster 01 already
exists; flag as cross-cluster follow-up in DONE report.

Print when done:
  W12b CLUSTER 10 DONE. <N> commits pushed to app/cluster-10-ai-chat.
  Cross-cluster follow-up: Anthropic disclosure → Cluster 01 privacy
  policy.

Begin.
```

---

**Estimated wall-clock: 6-8h (Opus). Token spend: $300-500.**
