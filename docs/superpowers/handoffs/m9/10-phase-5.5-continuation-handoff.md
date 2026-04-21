# M9 Task 5.5 Continuation — Handoff to Next AI

**Date:** 2026-04-21  
**Branch:** `feat/m9-shopify`  
**HEAD (committed):** `9ed70d5` — fix(m9): wire merge-diff, reposition brand-context pill, remove orphans  
**Working tree:** DIRTY — Task 5.5 implementation is complete but uncommitted. See "Uncommitted files" below.

---

## 1. What happened this session

### Phase A: Validation bug fixes (COMMITTED — 2 commits)

The validation report (`docs/superpowers/handoffs/m9/09-validation-report.md`) identified 9 bugs. All HIGH/MEDIUM bugs were fixed:

| Bug | Fix |
|-----|-----|
| HIGH: `BrandKitMergePanel.vue` orphan + wrong spec (checkboxes) | Deleted `src/components/dashboard/BrandKitMergePanel.vue` |
| HIGH: `BrandKitMergeDiff.vue` never mounted anywhere | Wired into `src/views/dashboard/BrandSettingsView.vue` — shows when `brandsStore.proposedBrandKit` exists for the current brand |
| MEDIUM: BrandContextPill in wrong location (right-sidebar, not "next to canvas name") | Moved from `EditorView.vue` right-sidebar → `AppMenu.vue` (between document name span and Toggle UI button) |
| MEDIUM: 3 duplicate test files | Deleted `tests/unit/components/brand-kit-merge-panel.test.ts`, `tests/unit/stores/brands-apply-kit.test.ts`, `tests/unit/utils/diff-brand-kit.test.ts` |
| INFRA: Missing `.gitignore` entries | Added `.claude/`, `.ralphy/`, `tsconfig.node.tsbuildinfo` |

Tests after these commits: **1378 pass / 99 skip / 0 fail** ✅

---

### Phase B: Task 5.5 — Shop Panel (UNCOMMITTED — working tree dirty)

All 7 spec steps implemented. Files created:

| File | Status | Description |
|------|--------|-------------|
| `src/composables/use-chat-commands.ts` | NEW | Module-level `pendingMessage` ref + `sendToChat` / `consumePendingMessage` functions |
| `src/composables/use-shop-drop.ts` | NEW | Drop handler for shopify-variant / collection / discount payloads; calls `createProductVariantFrame`, queues build-around prompt |
| `src/components/editor/sidebar/ShopPanel.vue` | NEW | Reka UI `TabsRoot` container — Products / Collections / Discounts |
| `src/components/editor/sidebar/ShopPanelProducts.vue` | NEW | Debounced search, in-stock / on-sale chips, sort, draggable product cards |
| `src/components/editor/sidebar/ShopPanelCollections.vue` | NEW | Draggable collection list; drag → 3×2 auto-layout grid via tool-calls |
| `src/components/editor/sidebar/ShopPanelDiscounts.vue` | NEW | Active discounts; drag → TEXT node with discount code |
| `src/components/editor/ShopBuildPrompt.vue` | NEW | Reka UI `ToastRoot` — "Want me to build around this?" [Yes, design a hero] [No] |
| `tests/engine/shopify/shop-panel.test.ts` | NEW | 16 tests: payload serialization, drop → `createProductVariantFrame`, toast/prompt state, chat command signal |
| `src/views/EditorView.vue` | MODIFIED | Left panel tab switcher (Layers/Shop), canvas `@dragover.prevent` + `@drop` handler, `ShopBuildPrompt` overlay |
| `src/components/chat/ChatPopup.vue` | MODIFIED | Watches `pendingMessage` from `useChatCommands`, auto-opens and sends when set |

---

## 2. Current test state — BROKEN (your first job)

### The problem

Running `bun run test:unit` NOW shows **27 failures**. This is a **test isolation bug** caused by `shop-panel.test.ts`, NOT a logic bug in the implementation.

**Root cause:** `shop-panel.test.ts` calls:
```typescript
mock.module('@/stores/product-variant-bindings', () => ({
  useProductVariantBindingsStore: mock(() => ({ set: mock(() => {}) }))
}))
```

Bun:test sometimes reuses worker processes across test files in the same run. The simplified mock (`{ set: mock() }`) replaces the real store — which also has `get()`, `remove()`, `hydrate()`, `dehydrate()`, `forCanvas()` — for subsequently-run test files. Those files (`overlay-factory.test.ts`, `store-product-variant-bindings.test.ts`, `useCanvasBindingsPersistence.test.ts`, `verify.test.ts`, `overlay-sync.test.ts`) then fail because their expected methods don't exist on the mock.

**Confirmed isolation:** Each failing file passes when run alone. Only fails when run alongside shop-panel.test.ts.

### Fix required

In `tests/engine/shopify/shop-panel.test.ts`, **remove the `mock.module('@/stores/product-variant-bindings', ...)` call entirely.** 

The shop-panel tests don't need to assert on the binding store — they only need `createProductVariantFrame` to not throw. The binding store mock was overly broad. Replace the `@/canvas-extensions/product-variant/factory` mock to return a resolved promise without needing the store:

```typescript
// KEEP this — needed so factory doesn't try to call canvas APIs
mock.module('@/canvas-extensions/product-variant/factory', () => ({
  createProductVariantFrame: mockCreateProductVariantFrame,
}))

// REMOVE this entirely — it leaks into other test files:
// mock.module('@/stores/product-variant-bindings', () => ...)

// Also REMOVE or scope these if they cause issues:
// mock.module('@/engine/tool-calls', () => ...)
// mock.module('@/stores/editor', () => ...)
// mock.module('@/automation/figma-factory', () => ...)
```

After removing the `@/stores/product-variant-bindings` mock, run `bun run test:unit` — it should return to **0 fail**.

> **Note:** If removing those mocks causes `shop-panel.test.ts` itself to fail (because `use-shop-drop.ts` imports `@/engine/tool-calls` which tries to call real canvas APIs), add the tool-calls mock back but use `mock.restore()` in `afterAll()` to clean up:
> ```typescript
> import { afterAll, mock } from 'bun:test'
> afterAll(() => { mock.restore() })
> ```

---

## 3. After fixing tests — commit sequence

Once `bun run test:unit` is green (0 fail), commit all uncommitted Task 5.5 work:

```bash
git add src/composables/use-chat-commands.ts \
        src/composables/use-shop-drop.ts \
        src/components/editor/ShopBuildPrompt.vue \
        src/components/editor/sidebar/ \
        src/views/EditorView.vue \
        src/components/chat/ChatPopup.vue \
        tests/engine/shopify/shop-panel.test.ts

git commit -m "feat(m9): editor shop panel — products/collections/discounts"
```

---

## 4. Mark Task 5.5 steps complete in handoff doc

After committing, mark all 7 steps in `docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md` as `[x]`:

```
- [x] **Step 1:** Tabbed panel (Reka UI Tabs) ...
- [x] **Step 2:** Products draggable cards ...
- [x] **Step 3:** Post-drop toast ...
- [x] **Step 4:** Collections tab ...
- [x] **Step 5:** Discounts tab ...
- [x] **Step 6:** Unit tests ...
- [x] **Step 7:** Commit.
```

Also mark the exit criteria in that document.

---

## 5. Holistic overview — can we move to Phase 10?

### Phase 10 scope (next chunk)

From `docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md`:
> Next chunk: `10-phase-5.6-6-settings-observability.md`

Phase 10 covers Task 5.6 (Settings integrations page) and Phase 6 (Observability).

### Gate assessment

| Gate | Status | Notes |
|------|--------|-------|
| Task 5.3 (brand-kit merge diff) | ✅ DONE | `BrandKitMergeDiff.vue` wired into `BrandSettingsView.vue` |
| Task 5.4 (brand-context pill) | ✅ DONE | Pill in `AppMenu.vue` next to canvas name |
| Task 5.5 (shop panel) | ⚠️ NEEDS FIX | Implementation complete; test isolation bug must be fixed and code committed |
| `bun run check` | ⚠️ PRE-EXISTING | Lints 0 files (infra bug, not chunk-9 regression) |
| `bun run test:unit` | ⚠️ 27 FAIL | Caused by shop-panel.test.ts mock leakage — fix as described above |
| 3 spec commits present | ⚠️ PARTIAL | merge-diff ✅, brand-context-pill ✅, shop-panel ❌ (uncommitted) |
| No orphan components | ✅ DONE | BrandKitMergePanel + duplicates deleted |

### Verdict

**NOT READY for Phase 10 yet.** Two actions block dispatch:

1. **Fix the 27 test failures** (10-minute fix in shop-panel.test.ts)
2. **Commit Task 5.5** with the spec commit message: `feat(m9): editor shop panel — products/collections/discounts`

Once those two items are done and `bun run test:unit` shows 0 fail, all Task 5.3/5.4/5.5 exit criteria are met and Phase 10 can be dispatched.

---

## 6. Architecture notes for Phase 10

Things Phase 10 should know about the work done here:

- **`useChatCommands`** (`src/composables/use-chat-commands.ts`) — module-level singleton for pre-filling AI chat from other surfaces. Phase 10's Settings page may want to use this if it has any "test AI with brand" actions.
- **`useShopDrop`** (`src/composables/use-shop-drop.ts`) — handles variant/collection/discount drops. Collection drop creates a 3×2 auto-layout grid via `createNode` + `setLayout`. Discount drop creates a raw TEXT node (no font binding applied yet — font binding would require a `setFont` tool-call that doesn't currently exist in `src/engine/tool-calls.ts`).
- **Left panel tab switcher** — added directly to `EditorView.vue`. The "Layers" tab shows `LayersPanel`; the "Shop" tab shows `ShopPanel` (only when `brandsStore.selectedBrandId` is set). The tab strip appears ABOVE both panels.
- **BrandContextPill** — now in `AppMenu.vue` (inside `LayersPanel`). It shows `brandsStore.selectedBrandId` when non-null. Phase 10 should NOT add another pill elsewhere.
- **`BrandKitMergeDiff`** — surfaced in `BrandSettingsView.vue`. Phase 10's Settings integrations page may want to link to brand settings when `proposedBrandKit` is pending.

---

## 7. Files changed this session (full list)

### Committed
- `.gitignore` — added .claude/, .ralphy/, tsconfig.node.tsbuildinfo
- `docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md` — Step 2 marker
- `docs/superpowers/handoffs/m9/09-validation-handoff.md` — new (committed)
- `docs/superpowers/handoffs/m9/09-validation-report.md` — new (committed)
- `src/components/AppMenu.vue` — added BrandContextPill next to document name
- `src/components/chat/ChatPopup.vue` — no (committed only by earlier ralphy; see uncommitted below)
- `src/components/dashboard/BrandKitMergePanel.vue` — DELETED
- `src/views/EditorView.vue` — removed BrandContextPill from right sidebar (committed); ShopPanel wiring is UNCOMMITTED
- `src/views/dashboard/BrandSettingsView.vue` — added BrandKitMergeDiff section
- `tests/unit/components/brand-kit-merge-panel.test.ts` — DELETED
- `tests/unit/stores/brands-apply-kit.test.ts` — DELETED
- `tests/unit/utils/diff-brand-kit.test.ts` — DELETED

### Uncommitted (must be committed after fixing tests)
- `src/composables/use-chat-commands.ts` — NEW
- `src/composables/use-shop-drop.ts` — NEW
- `src/components/editor/ShopBuildPrompt.vue` — NEW
- `src/components/editor/sidebar/ShopPanel.vue` — NEW
- `src/components/editor/sidebar/ShopPanelProducts.vue` — NEW
- `src/components/editor/sidebar/ShopPanelCollections.vue` — NEW
- `src/components/editor/sidebar/ShopPanelDiscounts.vue` — NEW
- `src/components/chat/ChatPopup.vue` — MODIFIED (useChatCommands watch added)
- `src/views/EditorView.vue` — MODIFIED (ShopPanel tab switcher + canvas drop handler)
- `tests/engine/shopify/shop-panel.test.ts` — NEW (fix mock leakage here first)
