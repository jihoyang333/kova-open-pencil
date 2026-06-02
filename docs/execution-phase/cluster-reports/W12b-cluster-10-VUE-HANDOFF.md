# W12b — Cluster 10 Vue + Browser Handoff (Tasks 15–17, 21)

> **For:** a fresh **browser-equipped** Claude Code session opened at the
> `app/cluster-10-ai-chat` worktree.
> **Why a handoff:** Tasks 15–17 + 21 need (a) the **Cluster 06 right-panel host**
> (absent from the `feat/m9-shopify` base this branch was cut from) and (b) a
> running dev server + browser for visual-diff and manual smoke. The headless
> session completed Tasks 1–14 + 18–20 (all green, type-clean). This document is
> a paste-ready prompt to finish the rest without re-deriving context.

---

## What is already DONE on this branch (do NOT redo)

| Task | Deliverable | Verified |
|---|---|---|
| 1 | `ChatProductReference` type + `ChatConversation.product_references` | type-check ✓ |
| 2 | Migration `20260620_10_chat_product_references.sql` (+ `validate_chat_product_references` trigger, cap 20) | applied to real Postgres in a rolled-back txn; default `[]`, non-array reject, >20 reject all confirmed |
| 3 | `useChatStore.updateProductReferences` — **single mutation entry** (W4 C-MED27) | 7 unit tests ✓ |
| 4 | `useChatProductReferencesStore` (`activeReferences`, `isAtCapacity`, `importProducts` de-dupe + cap 20, `removeReference`, `clearReferences`) | 5 unit tests ✓ |
| 5/5b/6 | `build-system-prompt.ts`: `formatToneSnippets` (Layer 4b, cap 10), `formatBrandMemories` cap 50 newest, `formatProductReferences` (Layer 9) | 10 unit tests ✓ + 17 M5 regression ✓ |
| 7 | `useAIChat.setActiveProductReferences` + `prepareCall` Layer 9 wiring + `resetChat` clear | 5 unit tests ✓ |
| 8 | Drop `bestsellers` from `search_products.sort` | ✓ |
| 9 | `no_connection` guard (`hasShopifyConnection` + `NO_CONNECTION`) on 5 Shopify tools | 22 ai-tools tests ✓ |
| 10/11 | `createSliceFromSelection` + `addMeasurement` AI tool wrappers (guarded `engine_unavailable` because Cluster 07a engine APIs are absent in base) | 6 unit tests ✓ |
| 12 | `ProductReferenceChip.vue` (dark tokens, KovaIcon, founder-lock states) | 6 unit tests ✓ |
| 13 | `ProductReferenceChipRow.vue` | 3 unit tests ✓ |
| 14 | `ChatInput.vue` chip row + `remove-reference` emit + `icon-lucide`→`KovaIcon` (registered bot/loader-circle/send/square) | 4 unit tests ✓ |
| 18 | `tests/e2e/composer-chip-flow.spec.ts` — **`test.describe.skip`** (un-skip when this handoff completes) | written |
| 19 | `docs/legal/anthropic-subprocessor-disclosure.md` → **Cluster 01 follow-up** | written |
| gate | `docs/execution-phase/cluster-audits/cluster-10/KOVA_AUDIT.md` + `tokens-used.md` (zero new tokens) | written |

**Design deviation you must keep:** the chip uses **dark-theme tokens**
(`bg-input`, `bg-fill-2`, `text-surface`, `border-border`) — NOT the plan's literal
`bg-surface`/`bg-muted/20`, which render a light block on the dark panel. Rationale
in `tokens-used.md`.

---

## What YOU must build

### Task 15 — Refactor `ChatPanel.vue` to the full right-panel chat surface
Follow Plan 10 Task 15 (`docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md`
lines 2016–2421) **exactly**, with these notes:

- The current `src/components/ChatPanel.vue` is a **working 223-line M5 surface**,
  not a stub (the plan's "refactor from stub" wording is stale). Lift the tab-strip
  + persistence chrome from `ChatPopup.vue`; do not lose existing behaviour.
- Wire `<ChatInput :productReferences="productRefsStore.activeReferences"
  @remove-reference="handleRemoveReference">`.
- `handleSubmit` MUST call `setActiveProductReferences(productRefsStore.activeReferences)`
  **before** send (already exported from `useAIChat`).
- `handleSwitchTab` MUST re-`setActiveProductReferences(...)` after switching.
- Founder locks: cap 20 chats (item 3, disable new-chat + tooltip
  `Max 20 chats per canvas — close one first.`); horizontal tab scroll w/ edge
  arrows (item 10); new chat = empty chips (item 9); no voice pill (item 1).
- Chip remove → `productRefsStore.removeReference(activeConversationId, productId)`
  (delegates to the single mutation entry). NEVER write
  `supabase.from('chat_conversations').update({ product_references })` anywhere but
  `useChatStore.updateProductReferences`.

### Task 16 — Mount `<ChatPanel>` in the Cluster 06 right-panel AI tab
**BLOCKED until Cluster 06 is merged into the base.** When the Cluster 06
`RightPanelTabs` / `useRightPanelStore` host exists: mount `<ChatPanel :canvasId
:brandId>` as the `activeTab === 'ai'` child of `.right .pbody`, default-active on
first canvas open (Cluster 06 §12.13). Delete `ChatPopup.vue` only after the
right-panel mount is verified (coordinate with Cluster 06).

### Task 17 — Shop-panel "Import N to chat" callback
**Cluster-06-dependent.** On import: auto-switch right panel to the AI tab (item 5),
then `productRefsStore.importProducts(activeConversationId, mappedRefs)`, then clear
panel selection. Map Shop products → `ChatProductReference` (hybrid payload §4.3).
Import button disabled at `isAtCapacity`.

### Task 21 — Manual browser smoke (PRD 10 §9.4, 15 steps)
Run `bun run dev`, execute every step, mark PASS/FAIL. Also run the per-screen
visual-diff loop (IMPLEMENTATION_PROMPT §6, ≤0.1% component / ≤0.5% screen) for the
chip / composer / ChatPanel surfaces; record under `tests/snapshots/cluster-10/`.

### Then: un-skip Task 18 E2E + run the cluster-end gates
- Remove `test.describe.skip` in `tests/e2e/composer-chip-flow.spec.ts`; seed a brand
  w/ Shopify + ≥25 products; `bunx playwright test tests/e2e/composer-chip-flow.spec.ts`.
- Re-run the full cluster-end gate list (Plan §Cluster-end gates + the execution
  prompt): build/check/test:unit/test:dupes green; CI grep gates (zero `from 'zod'`,
  zero client-side Anthropic key, zero `<icon-lucide-*>` in Plan 10 code); supabase
  migration verify; database-reviewer PASS; code-reviewer PASS; e2e-runner golden path.

---

## Required reading before you start
1. `docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md` (Tasks 15–17, 21–22 + Founder-locked decisions index)
2. `docs/execution-phase/cluster-audits/cluster-10/KOVA_AUDIT.md` + `tokens-used.md`
3. `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` (§6 diff loop, §10 thresholds)
4. `src/components/chat/ChatPopup.vue` (lift reference) + current `src/components/ChatPanel.vue`
5. `docs/superpowers/specs/2026-05-14-shopify-product-reference-design.md` §4.1–4.3

## Setup
Isolated Supabase stack: the default `54322` port is held by a sibling worktree's
stack. Either stop it or set an offset port in `supabase/config.toml` (c09 used the
`553xx` range) before `bunx supabase start`. Apply migrations, seed fixtures, then run.

## Do NOT re-litigate
Approved: dark-theme chip tokens, single-mutation contract, cap values (chips 20,
chats 20, tone 10, memories 50), image-export model, `@ai-sdk/anthropic` + ToolLoopAgent,
valibot-only tool schemas, server-only `ANTHROPIC_API_KEY`.
