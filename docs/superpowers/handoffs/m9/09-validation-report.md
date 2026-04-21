# M9 Chunk 9 — Validation Report

**Date:** 2026-04-21
**Branch:** feat/m9-shopify
**HEAD:** 760264c

## Summary

**YELLOW.** Task 5.3 artifacts compile and tests pass, but `BrandKitMergeDiff.vue` (the spec's sole deliverable) is **not imported anywhere** in `src/` — no screen mounts it, so the merge UI is unshippable as-is. Commit `9c4b0b7` adds a second, parallel, **also-orphan** merge component (`BrandKitMergePanel.vue`) that uses **checkboxes instead of the radio-group the spec mandates**, plus a duplicate logic extraction and three duplicate test files. Task 5.4's `BrandContextPill.vue` is wired and tested, but mounted in the **right-sidebar properties-panel header** rather than **"next to the canvas name"** (which lives in `TabBar.vue`) — a spec-location deviation. Task 5.5 is **0 / 7 steps done** (no files, no commits), consistent with the handoff's expectation. No dark-mode, no `Math.random`, no Zod, no `<svg>`/`<style>` blocks, all files under 800 lines, valibot-clean, `<script setup lang="ts">` correct. `bun run check` reports green but a pre-existing infra bug means it lints **0 files** — a real global issue to report separately (not a chunk-9 regression).

## Quality gates

- `bun run check`: **PASS**, but `lint` output is `Finished in 55ms on 0 files with 146 rules` — the script globs nothing. Running `bunx oxlint -c oxlint.json --type-aware --type-check src/` also reports `0 files`. This is a **pre-existing infra bug**, not chunk-9 specific (pre-chunk-9 dashboard files trip the same violations when linted explicitly). Flagging for separate triage.
- `bun run test:unit`: **PASS** — `1411 pass / 99 skip / 0 fail`, 1510 tests across 98 files, 4618 expect() calls, 2.16s.

## Task 5.3 — Brand-kit merge diff

- Spec compliance: **Partial.**
  - `src/components/brand-kit/BrandKitMergeDiff.vue:33-99` uses radio inputs (matches spec).
  - Only diffing fields rendered: ✅ (`diffBrandKits` filters identical/undefined — `src/utils/diff-brand-kit.ts:19-37`).
  - "Apply selected" calls `useBrandsStore().applyShopifyMerge(brandId, chosen)`: ✅ (`src/components/brand-kit/BrandKitMergeDiff.vue:27-30`).
  - `applyShopifyMerge` is immutable via `updateBrand`'s `.map` spread: ✅ (`src/stores/brands.ts:78-79`, `183-220`).
  - **`tests/engine/shopify/brand-kit-merge.test.ts:64-107`** covers the spec's exact scenario (primaryColor diff, new logoUrl, headingFont identical-so-skip, deselect behavior, full flow).
  - **Critical gap: `BrandKitMergeDiff.vue` is never imported** — `grep BrandKitMergeDiff src/` returns zero matches. No brand-settings page, no dashboard card, nothing mounts it. The spec says "per-field radio group … Apply selected calls…" but gives no integration point; ralphy produced the component but did not wire it into any route or page. The feature is effectively dead code.
  - `tests/engine/shopify/brand-kit-merge.test.ts` does **not** mount `BrandKitMergeDiff.vue` — it tests `applySelection`, `diffBrandKits`, and `store.applyShopifyMerge` directly. So even the test does not exercise the component's radio UI.

- Extra scope (commit `9c4b0b7`): **Scope creep with contract drift.**
  - `src/components/dashboard/BrandKitMergePanel.vue` is a second merge UI that uses **checkboxes**, not the radio group the spec requires (`BrandKitMergePanel.vue:50-57`). If this were intended as the shipping surface for Task 5.3, it would violate the spec's UX contract.
  - `src/utils/diff-brand-kit.ts` is shared between both components — so the *logic* is not duplicated, only the *UI*.
  - `BrandKitMergePanel.vue` does **not** wrap `BrandKitMergeDiff.vue` — it reimplements the render independently.
  - `BrandKitMergePanel.vue` is also **orphan** (`grep BrandKitMergePanel src/` returns zero matches). Only `tests/unit/components/brand-kit-merge-panel.test.ts` imports it.
  - Test duplication: `tests/unit/stores/brands-apply-kit.test.ts` re-covers five of the same scenarios as `tests/engine/shopify/brand-kit-merge.test.ts` (applies primaryColor, applies headingFont, applies logoUrl, clears proposedBrandKit, no-op on empty kit). `tests/unit/utils/diff-brand-kit.test.ts` re-covers diff/apply cases from the other file.
  - Recommend: revert commit `9c4b0b7` and wire `BrandKitMergeDiff.vue` into a legitimate host (e.g., a brand-settings dialog triggered by `proposedBrandKit` from the onboarding flow).

- Notes:
  - `applyShopifyMerge` in `src/stores/brands.ts:183-185` is a one-line passthrough to `applyKitSelection`. The two are kept as siblings rather than one replacing the other — minor duplication, functionally correct.
  - `tests/engine/shopify/brand-kit-merge.test.ts:116` uses `as never` for `authStore.user` — acceptable mock pattern.

## Task 5.4 — Brand-context pill

- Spec compliance: **Mostly compliant with one placement deviation.**
  - `src/components/editor/BrandContextPill.vue:45-82` uses Reka UI's `TooltipProvider / TooltipRoot / TooltipTrigger / TooltipPortal / TooltipContent`: ✅.
  - Pill displays `brand.name` (line 53): ✅.
  - Tooltip shows shop domain + last-sync-ago + the exact phrase "This canvas is linked to {brand}." (lines 63-78): ✅. Also gracefully handles the "no connection" case by still showing the link phrase.
  - Non-interactive for switching (no `@click`, `cursor-default` on line 50): ✅.
  - Uses unplugin-icons (`icon-lucide-tag` line 52): ✅.
  - **Placement deviation (MEDIUM):** Spec says "mount the pill next to the canvas name" (`docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md:55`). The canvas name is rendered in `src/components/TabBar.vue:44` (`<span>{{ tab.name }}</span>`). The pill is actually mounted in **`src/views/EditorView.vue:184-191`**, which is the right-hand `SplitterPanel` (properties panel) header next to `CollabPanel`. These are two different surfaces of the editor chrome.

- Test coverage: `tests/engine/shopify/brand-context-pill.test.ts` exercises `timeAgo` thresholds, pill rendering, fallback, and the supabase query shape. **Gap:** the test never asserts the rendered tooltip DOM — the "This canvas is linked to {brand}." string is only pattern-matched in `timeAgo` tests, not in a mounted tooltip. `connection` is verified via `defineExpose` reflection, not by reading the tooltip content.

- Notes:
  - `src/utils/time-ago.ts` duplicates functionality already provided by `useTimeAgo` from `@vueuse/core`, which is already used in `src/components/dashboard/CanvasCard.vue:3,37` and `src/components/dashboard/TrashCard.vue`. A one-shot wrapper around VueUse would have kept the implementation consistent (CLAUDE.md: "don't reinvent the wheel").
  - `BrandContextPill.vue:19,190` pulls `brandsStore.selectedBrandId` indirectly through `EditorView.vue`'s canvas mount hook (`EditorView.vue:82-83`). This works because the mount sets `selectedBrandId = canvas.brand_id`, but the pill would show the wrong brand if `selectedBrandId` ever drifted during the canvas's lifetime. A tighter binding would derive the brand_id from the canvas record directly. LOW fragility.
  - Tooltip tokens `bg-neutral-800 text-white` (lines 59) are fine for light-mode-only; no `dark:` prefixes.

## Task 5.5 — Shop panel

- Status: **NOT STARTED — 0 / 7 steps done.**
- Files missing: `src/components/editor/sidebar/ShopPanel.vue`, `ShopPanelProducts.vue`, `ShopPanelCollections.vue`, `ShopPanelDiscounts.vue`, `tests/engine/shopify/shop-panel.test.ts`.
- Confirmed via `ls src/components/editor/` (only `BrandContextPill.vue` present) and `glob **/*[Ss]hop[Pp]anel*` (no results).
- Ralphy output indicates it was starting Task 5.5 Step 1 when it hit a `Credit balance is too low` billing error — no files landed.

## Convention audit

All chunk-9 files checked:

| Check | Result | Evidence |
|---|---|---|
| No `dark:` Tailwind | ✅ | zero matches across all chunk-9 src + test files |
| No `any` type | ✅ | zero matches |
| No `!` non-null assertion | ⚠ | `tests/unit/components/brand-kit-merge-panel.test.ts:95,111` use `emitted![0]`. Project rule bans `!` — LOW severity (test-only). |
| No `Math.random` | ✅ | zero matches |
| No raw `<svg>`/emoji | ✅ | uses `<icon-lucide-*>` |
| No `<style>`/inline `style=` | ✅ | Tailwind only |
| No Zod import | ✅ | zero matches |
| `<script setup lang="ts">` | ✅ | all three Vue files |
| File size <800 lines | ✅ | max 100 (`BrandKitMergeDiff.vue`) |
| Reka UI Tooltip used | ✅ | `BrandContextPill.vue:3-9,45-82` |
| Immutable store mutation | ✅ | `stores/brands.ts:78-79` (`.map` spread), `63,175` (array spread) |
| No hardcoded secrets | ✅ | zero matches |

Separately found (not chunk-9 specific but surfaced during audit): running `bunx oxlint` directly on chunk-9 files yields 31 errors, but **the same rule (`vue/define-props-destructuring`) fires on pre-existing components too** (e.g., `src/components/dashboard/*.vue`). This is consistent codebase behavior, hidden by the broken `bun run check` script globbing 0 files. Not a chunk-9 regression.

## Architectural issues

Checked for Chunk-8 Issue-C class problems:

- **Factory-vs-singleton:** None. Both new components use Pinia stores (singleton).
- **Dead-letter parent:** None. No `emit`-to-missing-parent patterns.
- **Props/context mismatch:** None. `BrandContextPill` receives `brandId` prop and pulls from Pinia — both are live sources.
- **Pill brand source fragility:** `BrandContextPill` reads `brandsStore.brands.find((b) => b.id === props.brandId)` — correct; but the *caller* in `EditorView.vue:188-191` passes `brandsStore.selectedBrandId` rather than `canvas.brand_id`. If `selectedBrandId` ever drifts from the loaded canvas, the pill would label the canvas with the wrong brand. Works today because `EditorView.vue:82-83` synchronizes them on mount. LOW severity.

## Working-tree cleanliness

- Modified handoff doc (`docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md`): **ACCURATE.** Diff flips Task 5.4 Step 2 marker `[ ] → [x]` (line 58). Recommend committing as a doc-only fixup. Note: Task 5.3 Steps 1/2/3 and Task 5.4 Step 1 were already `[x]` in commit `12ffc17`; this follow-up commit completes 5.4.
- `.claude/`, `.ralphy/`, `tsconfig.node.tsbuildinfo`: **NOT in `.gitignore`** (`kova-open-pencil-1/.gitignore` checked). Recommend adding:
  ```
  .claude/
  .ralphy/
  tsconfig.node.tsbuildinfo
  ```
- Untracked validation handoff (`09-validation-handoff.md`) and this report should be committed with the next doc commit.

## Bugs / risks found

1. **HIGH — Orphan component: `BrandKitMergeDiff.vue`** (`src/components/brand-kit/BrandKitMergeDiff.vue`). Not imported or mounted anywhere in `src/`. Task 5.3's user-visible surface does not reach the app. *Suggested fix (don't apply):* mount inside a dialog on the brand-settings page (or wherever `proposedBrandKit` gets surfaced from the Shopify onboarding flow), and add a `mount(...)` assertion in `tests/engine/shopify/brand-kit-merge.test.ts`.

2. **HIGH — Orphan component + contract drift: `BrandKitMergePanel.vue`** (`src/components/dashboard/BrandKitMergePanel.vue`). Not imported anywhere in `src/`; uses **checkboxes** (lines 50-57) where the spec mandates a **radio group** (handoff line 40). *Suggested fix (don't apply):* revert commit `9c4b0b7` (or convert it to wrap `BrandKitMergeDiff.vue`).

3. **MEDIUM — Spec-location deviation: pill placement.** `src/views/EditorView.vue:184-191` mounts `BrandContextPill` in the right-sidebar properties panel header next to `CollabPanel`. Spec says "next to the canvas name," which is `TabBar.vue:44`. *Suggested fix (don't apply):* move the mount into `TabBar.vue` so the pill sits adjacent to the active tab's name, or update the spec to reflect the actual decision.

4. **MEDIUM — `time-ago.ts` duplicates VueUse.** `src/utils/time-ago.ts:1-11` hand-rolls a relative-time formatter. `useTimeAgo` from `@vueuse/core` already in use at `src/components/dashboard/CanvasCard.vue:3,37`. *Suggested fix (don't apply):* replace with a thin non-reactive wrapper over VueUse, or use `useTimeAgo(...).value` directly with a null guard.

5. **MEDIUM — Redundant test files.** `tests/unit/stores/brands-apply-kit.test.ts` and `tests/unit/utils/diff-brand-kit.test.ts` re-assert scenarios already covered in `tests/engine/shopify/brand-kit-merge.test.ts`. *Suggested fix (don't apply):* consolidate into the `tests/engine/shopify/` file and delete the duplicates. Directly tied to Bug #2.

6. **LOW — `!` non-null assertion in tests.** `tests/unit/components/brand-kit-merge-panel.test.ts:95,111` use `emitted![0]`. CLAUDE.md forbids `!` non-null assertions. *Suggested fix (don't apply):* `const events = emitted('apply'); if (!events) throw new Error('no apply event'); const [kit] = events[0] as [Record<string,string>]`. Moot if this file is deleted per Bug #2.

7. **LOW — Missing tooltip DOM assertion.** `tests/engine/shopify/brand-context-pill.test.ts` never asserts the rendered "This canvas is linked to {brand}." text. *Suggested fix (don't apply):* add a `wrapper.find('[data-test-id="brand-context-pill-tooltip"]').text()` test after triggering tooltip open state.

8. **LOW — Pill brand-id source coupling.** `src/views/EditorView.vue:190` passes `brandsStore.selectedBrandId` — works because the mount hook synchronizes, but a tighter binding to `canvas.brand_id` would eliminate the fragility.

9. **INFRA (pre-existing, non-chunk-9) — `bun run check` lints 0 files.** `package.json` `lint` script passes `src/ packages/core/src/ packages/cli/src/ packages/mcp/src/` to oxlint, but oxlint reports `Finished on 0 files`. This is not a chunk-9 regression (pre-existing dashboard files have the same lint errors when linted explicitly), but the script is effectively a no-op. *Suggested fix (don't apply):* investigate whether oxlint needs a `--ext` flag, a glob (`src/**/*.{ts,vue}`), or a missing plugin entry.

## Recommendation

**YELLOW — minor cleanup first, then dispatch Task 5.5.**

Task 5.5 itself is scoped to a new directory (`src/components/editor/sidebar/`) and is architecturally independent of the brand-kit merge and brand-context pill. It can be safely dispatched in parallel to the cleanup decisions below. But the founder should decide the brand-kit disposition **before** the chunk merges, because leaving two orphan components in the tree invites future drift.

Recommended sequencing:
1. **Decide on commit `9c4b0b7`:** revert (cleanest — removes duplicate orphan), or integrate (wire `BrandKitMergePanel.vue` into a real host and replace its checkboxes with a radio group).
2. **Wire `BrandKitMergeDiff.vue` into a host** (brand-settings dialog, or the Shopify onboarding merge-review step) — otherwise Task 5.3 is not shipped.
3. **Decide the pill placement:** move into `TabBar.vue` or update the spec.
4. **Commit the handoff-doc fixup and `.gitignore` additions** in a single doc-only commit.
5. **Dispatch ralphy on Task 5.5** with an explicit instruction to wire the three tab sub-components into `LayersPanel`'s left-sidebar host (or a new sibling `SplitterPanel`), and to follow the radio/tabs/toast contracts from the spec verbatim.
6. **(Independent)** investigate the `bun run check` 0-files bug — otherwise every future quality-gate claim is a false positive.
