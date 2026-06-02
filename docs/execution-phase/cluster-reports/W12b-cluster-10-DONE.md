# W12b — Cluster 10 (AI Chat + Memory + Tool Layer) — DONE Report

**Branch:** `app/cluster-10-ai-chat` (worktree `/Users/jihoyang/kova-build-c10`)
**Base:** `feat/m9-shopify` @ `70707a09` (same base as the W12a c09 sibling)
**Date:** 2026-06-02
**Status:** **Headless tasks complete (1–14, 18–20).** Browser/Cluster-06-dependent
tasks (15–17, 21) handed off — see `W12b-cluster-10-VUE-HANDOFF.md`.

---

## Completed (committed, green, type-clean)

| Task | Summary | Tests |
|---|---|---|
| 1 | `ChatProductReference` type + `ChatConversation.product_references` | 2 |
| 2 | Migration `20260620_10_chat_product_references.sql` + validation trigger (cap 20) | 4 integration (skip-guarded) — **validated against real Postgres** in a rolled-back txn (default `[]` ✓, non-array reject ✓, >20 reject ✓) |
| 3 | `useChatStore.updateProductReferences` — single mutation entry (W4 C-MED27) | 7 |
| 4 | `useChatProductReferencesStore` (de-dupe, cap 20, remove, clear) | 5 |
| 5/5b/6 | System-prompt layers: tone snippets (cap 10), brand-memory cap 50 newest, product references (Layer 9) | 10 (+17 M5 regression green) |
| 7 | `useAIChat.setActiveProductReferences` + `prepareCall` Layer 9 wiring | 5 |
| 8 | Drop `bestsellers` from `search_products.sort` | (in ai-tools) |
| 9 | `no_connection` guard on 5 Shopify tools | 5 (+ existing 15) |
| 10/11 | `createSliceFromSelection` + `addMeasurement` AI wrappers (`engine_unavailable` guards) | 6 |
| 12 | `ProductReferenceChip.vue` | 6 |
| 13 | `ProductReferenceChipRow.vue` | 3 |
| 14 | `ChatInput.vue` chip row + `remove-reference`; `icon-lucide`→`KovaIcon` | 4 |
| gate | `KOVA_AUDIT.md` + `tokens-used.md` (zero new tokens, zero hex) | — |
| 18 | `composer-chip-flow.spec.ts` (skip-gated) | written |
| 19 | `anthropic-subprocessor-disclosure.md` | written |
| 20 | PRD 00a tracker row already `IN-DRAFT` (left as-is; not marked SHIPPED — cluster not fully shipped) | — |

**Cluster 10 test files: 70 pass / 6 skip / 0 fail** (run together).

## Verification (Task 22, headless portion)

- `bun run test:unit`: **2202 pass / 32 fail / 3 err** vs baseline **2156 / 32 / 3**.
  **Net new failures: 0.** All 32 failures are pre-existing, in files this cluster
  did not touch (full-suite noise is the documented suite-ordering / KovaIcon
  mock-leak contamination, obs #7632/#7633 — not introduced here).
- `bun run lint` (oxlint type-aware --type-check): **branch 127 errors = base 127
  errors → net-zero lint delta.** All 127 are pre-existing in untouched files; zero
  reference any Cluster 10 new/changed code. (The base does **not** pass
  `bun run check` independently — 127 pre-existing lint errors + 32 failing tests are
  a WIP-base condition, not introduced by this cluster. The cluster-end "check green"
  gate is therefore blocked by the base, not by Cluster 10.)
- `lint:no-raw-visual-values` + `lint:no-leaking-secrets`: pass on Cluster 10 files
  (zero hex / raw visual values in the chip components; zero leaked secrets).
- CI grep gates: zero `from 'zod'`, zero `VITE_ANTHROPIC*`/`sk-ant-`, zero
  `<icon-lucide-*>` in changed files. ✓
- `vite build` (run directly, bypassing the pre-existing-lint gate): **✓ built in 2.17s**
  (validates all Cluster 10 code bundles in the Vite/Vue context).
- Bundle secret audit: `grep -r sk-ant- dist/` matches **only** the UI placeholder
  hint string `keyPlaceholder: 'sk-ant-…'` in the **locked** `packages/core/src/constants.ts`
  (pre-existing in base, an AI-provider settings hint — not a real key). The real
  `ANTHROPIC_API_KEY` value is absent from the bundle. Security intent (server-only
  key) satisfied.
- **Bonus fix:** `tests/engine/shopify/ai-tools.test.ts` failed to load at baseline
  (incomplete `@open-pencil/core` mock dropped `@/constants` named imports). Fixed
  by spreading the real canvaskit-free constants into the mock → 22 tests now run.

## Deferred → handoff (`W12b-cluster-10-VUE-HANDOFF.md`)

| Task | Why deferred |
|---|---|
| 15 — ChatPanel full right-panel surface + tab strip | needs browser visual-diff (≤0.5% screen); changes prop interface (`canvasId`/`brandId`) that only makes sense once mounted in the Cluster 06 host |
| 16 — mount in right-panel AI tab | **Cluster 06 host absent** from base (`RightPanelTabs`/`useRightPanelStore`/`activeTab==='ai'` do not exist) |
| 17 — Shop-panel "Import N to chat" | Cluster-06-dependent (right-panel tab switch + Shop panel) |
| 21 — manual browser smoke (PRD 10 §9.4) | no browser in this headless session |

## Cross-cluster follow-ups

1. **Anthropic sub-processor disclosure → Cluster 01.** `docs/legal/anthropic-subprocessor-disclosure.md`
   must be lifted verbatim into Cluster 01's `docs/legal/privacy-policy.md` + `ropa.md`
   (7 data categories enumerated). Cluster 01 already exists — file as a tracking item.
2. **Cluster 06 right-panel host** required before Tasks 16–17 (mount + Shop import).
3. **Cluster 07a engine APIs** (`figma.createSliceFromSelection`, `figma.currentPage.addMeasurement`)
   absent in base → the two AI tool wrappers return `engine_unavailable` until 07a ships.
   Behaviour is correct + tested; no code change needed when 07a lands.

## Commits

18 commits on `app/cluster-10-ai-chat` (one per task group + gate + handoff).
