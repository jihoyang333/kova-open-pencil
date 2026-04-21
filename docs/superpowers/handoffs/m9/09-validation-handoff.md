# M9 Chunk 9 — Validation Handoff

**Date:** 2026-04-21
**For:** A fresh AI agent, starting cold
**Goal:** Validate that the work ralphy produced for M9 Chunk 9 (editor surfaces) is correct, complete, follows project conventions, and contains no bugs — then report findings back to the founder.

---

## 0. Orientation — Read This First

You are continuing an M9 (Shopify integration) milestone on the `kova-open-pencil-1` repo. An autonomous coding agent (ralphy) just executed Chunk 9, which was specified in `docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md`. That spec has **3 tasks**:

- **Task 5.3** — Brand-kit merge diff component (field-by-field)
- **Task 5.4** — Editor brand-context pill
- **Task 5.5** — Editor shop panel (Products / Collections / Discounts tabs)

**Critical:** preliminary inspection shows ralphy completed Tasks 5.3 and 5.4 but **did not start Task 5.5**. You must confirm this, document it in your report, and NOT attempt to finish Task 5.5 yourself — the founder will decide next steps after reading your validation report.

### Project context you need

- **Repo:** `/Users/jihoyang/kova-main/kova-open-pencil-1` (an inner repo inside a git repo)
- **Branch:** `feat/m9-shopify` (do NOT switch branches)
- **Stack:** Vue 3 Composition API + TypeScript + Tailwind 4 + Pinia + Reka UI + Bun
- **Hard rules** (in `CLAUDE.md`):
  - Light mode only — no dark mode anywhere (no `dark:` Tailwind prefixes)
  - `<script setup lang="ts">` only; no `any`, no `!` non-null assertions
  - Tailwind utility classes only — no inline CSS, no `<style>` blocks
  - Reka UI components first (Tooltip, Tabs, Toast, DropdownMenu, Dialog, Popover, Select)
  - unplugin-icons Lucide (`<icon-lucide-*>`) — no raw SVG, no emoji
  - `culori` for color conversions, `crypto.getRandomValues()` for randomness (never `Math.random()`)
  - Files <800 lines, functions <50 lines, nesting ≤4 levels
  - UI theme modeled after Figma — Figma is the reference for visual decisions

### Quality gates

All run from `/Users/jihoyang/kova-main/kova-open-pencil-1/`:

```sh
bun run check       # oxlint type-aware — must be green
bun run test:unit   # bun:test unit tests — must be green
```

E2E (`bun run test`) is NOT required for this validation — those tests are deferred to Chunk 11.

---

## 1. Starting State (as of 2026-04-21 ~8 AM GMT-3)

### Commits ralphy produced on this chunk

Run `git log --oneline feat/m9-shopify` to confirm. These are the chunk-9 commits (newest first):

| Commit  | Subject                                             | Maps to                              |
|---------|-----------------------------------------------------|--------------------------------------|
| `760264c` | `docs(m9): mark brand-context pill step 1 complete` | Task 5.4 progress marker             |
| `12ffc17` | `feat(m9): editor brand-context pill`               | Task 5.4                             |
| `ccf0306` | `feat(m9): brand-kit merge diff — field-by-field`   | Task 5.3                             |
| `9c4b0b7` | `feat(m9): brand kit merge panel with diff view and apply-selected` | **EXTRA — not in spec, verify legitimacy** |

The commit **before chunk 9** was `ceeb1ee docs(m9): document chunk 8 Issue C as known limitation`. Everything after that up to `760264c` is chunk 9 work.

### Working tree state (uncommitted)

```
modified:   docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md
untracked:  .claude/        (ralphy-only — ignore)
untracked:  .ralphy/        (ralphy-only — ignore)
untracked:  tsconfig.node.tsbuildinfo  (build artifact — ignore)
```

The modified handoff doc is ralphy's in-flight progress markers. Do not commit or revert yet — report whether the markers match reality.

### Files ralphy created / modified

**Task 5.3 (committed):**
- `src/components/brand-kit/BrandKitMergeDiff.vue` (new, ~100 lines)
- `src/stores/brands.ts` (modified — +5 lines for `applyShopifyMerge`)
- `tests/engine/shopify/brand-kit-merge.test.ts` (new, ~200 lines)

**Task 5.3 extra (committed, but NOT in spec — commit `9c4b0b7`):**
- `src/components/dashboard/BrandKitMergePanel.vue` (new, ~83 lines)
- `src/stores/brands.ts` (further modified — +38 lines)
- `src/utils/diff-brand-kit.ts` (new, ~47 lines)
- `tests/unit/components/brand-kit-merge-panel.test.ts` (new, ~128 lines)
- `tests/unit/stores/brands-apply-kit.test.ts` (new, ~145 lines)
- `tests/unit/utils/diff-brand-kit.test.ts` (new, ~143 lines)

**Task 5.4 (committed):**
- `src/components/editor/BrandContextPill.vue` (new, ~83 lines)
- `src/utils/time-ago.ts` (new, ~11 lines)
- `src/views/EditorView.vue` (modified — +7 lines to mount pill)
- `tests/engine/shopify/brand-context-pill.test.ts` (new, ~182 lines)

**Task 5.5 (NOT done — no commits, no files):**
- `src/components/editor/ShopPanel.vue` — does not exist
- `src/components/editor/ShopPanelProducts.vue` — does not exist
- `src/components/editor/ShopPanelCollections.vue` — does not exist
- `src/components/editor/ShopPanelDiscounts.vue` — does not exist
- No shop-panel test files

---

## 2. Validation Steps — Execute in Order

### Step 1 — Confirm baseline

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git status
git log --oneline -10
git branch --show-current   # must print "feat/m9-shopify"
```

Confirm the commits listed in §1 are present and no other unexpected commits landed.

### Step 2 — Run quality gates

```sh
bun run check
bun run test:unit
```

Both must be green. If either fails, capture the exact output — do not try to fix it, report it.

### Step 3 — Verify Task 5.3 against spec

Re-read the **Task 5.3** block in `docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md` (lines ~30-50). The spec says:

> **Files to mutate:**
> - New: `src/components/brand-kit/BrandKitMergeDiff.vue`
> - Modify: `src/stores/brands.ts` — `applyShopifyMerge(brandId, selected)`
>
> **Behavior:** per-field radio group `[x] Current #000  [ ] Shopify #F00`. Only diffing fields rendered. "Apply selected" calls `useBrandsStore().applyShopifyMerge(brandId, chosen)`.

Verify by reading the component and test files:

- `src/components/brand-kit/BrandKitMergeDiff.vue` — Does it use radio buttons? Does it only render diffing fields (skip identical)? Does "Apply selected" call `useBrandsStore().applyShopifyMerge(brandId, chosen)`?
- `src/stores/brands.ts` — Is `applyShopifyMerge` immutable (returns new state, not mutating)?
- `tests/engine/shopify/brand-kit-merge.test.ts` — Does it cover the merge-test example from the spec (primary diff, logo new, heading identical-so-skip)?

**Flag:** Commit `9c4b0b7` (`BrandKitMergePanel.vue`, `diff-brand-kit.ts`, plus 3 test files) adds a dashboard-level wrapper that is NOT in the Task 5.3 spec. Assess:
1. Is it a legitimate dashboard integration that the spec implicitly needed (e.g. for rendering the diff on the brand settings page)? Or is it scope creep / duplication?
2. Does `diff-brand-kit.ts` duplicate logic already inside `BrandKitMergeDiff.vue`?
3. Does `BrandKitMergePanel.vue` use `BrandKitMergeDiff.vue`, or does it reimplement the diff independently?

Report findings. Don't refactor — just flag.

### Step 4 — Verify Task 5.4 against spec

Re-read **Task 5.4** (spec lines ~52-65). Spec says:

> **Files to mutate:**
> - New: `src/components/editor/BrandContextPill.vue`
> - Modify: `src/views/EditorView.vue` — mount the pill next to the canvas name
>
> **Behavior:** Pill displays `brand.name`. Reka UI `Tooltip` on hover shows shop domain + last-sync ago + "This canvas is linked to {brand}." Non-interactive for switching.

Verify:

- `src/components/editor/BrandContextPill.vue` — Uses Reka UI `Tooltip`? Shows `brand.name` as the pill body? Tooltip shows shop domain + last-sync-ago + the exact phrase "This canvas is linked to {brand}."? Non-interactive (no click-to-switch)?
- `src/utils/time-ago.ts` — Is this a legitimate helper or does `culori`/an existing util already provide this? Check `src/utils/` for prior time helpers before flagging as duplication.
- `src/views/EditorView.vue` — Pill is mounted next to the canvas name (not randomly elsewhere)?
- `tests/engine/shopify/brand-context-pill.test.ts` — Covers the tooltip content, the non-interactive behavior, and brand-name display?

### Step 5 — Confirm Task 5.5 is absent

```sh
ls src/components/editor/ | grep -i shop
```

Should print nothing (or only unrelated files). Confirm the spec's six Task-5.5 steps (tabbed panel, drag-drop products, post-drop toast, collections tab, discounts tab, unit tests) are all un-implemented. Do NOT attempt to implement them.

### Step 6 — Project-convention audit

Run across all new/modified files from chunk 9:

- [ ] **No dark mode.** Grep for `dark:` Tailwind prefix — must return zero hits in chunk-9 files.
- [ ] **No `any`, no `!` non-null assertions** in `.ts`/`.vue` files.
- [ ] **No `Math.random()`** — must use `crypto.getRandomValues()` if randomness appears.
- [ ] **No raw `<svg>` or emoji** in Vue templates — must use `<icon-lucide-*>`.
- [ ] **No `<style>` blocks, no inline `style=""`** — Tailwind utilities only.
- [ ] **No Zod imports** (`import.*zod`) — project uses valibot.
- [ ] **`<script setup lang="ts">`** on every new `.vue` file.
- [ ] **No file exceeds 800 lines; no function exceeds ~50 lines.**
- [ ] **Reka UI used for Tooltip** (Task 5.4 pill), not a hand-rolled tooltip.
- [ ] **Store mutations are immutable** — inspect `applyShopifyMerge` in `src/stores/brands.ts`.
- [ ] **No hardcoded secrets** — grep for API keys, tokens, URLs that look like endpoints.

Use `Grep` tool for each check. Report any violations with file + line number.

### Step 7 — Architectural issues hunt

Look for the same class of problems that showed up in Chunk 8's Issue C:

- [ ] Does any component navigate or route in a way that doesn't match the spec?
- [ ] Is any `useX` composable being called in multiple places that each get a *new instance* when they should share state? (Factory vs. singleton pattern — see memory note on `useOnboardingState`.)
- [ ] Does any test assert on emitted events that imply a different contract than the spec describes?
- [ ] Does any component assume props / context that aren't actually being passed from its parent?
- [ ] Does `BrandContextPill` correctly pull from the brand store, or does it hard-code a brand?

### Step 8 — Working-tree cleanliness

- Is the modification to `docs/superpowers/handoffs/m9/09-phase-5.3-5.4-5.5-editor-surfaces.md` accurate (Task 5.4 Step 2 marker flipped to `[x]`)? If accurate, recommend committing as a doc-only fixup. Don't commit yourself — recommend only.
- Are `.claude/` and `.ralphy/` in `.gitignore`? If not, they should be — recommend adding them. Again, don't do it yourself.
- Is `tsconfig.node.tsbuildinfo` in `.gitignore`?

---

## 3. Report Format

Write your findings to a new file: `docs/superpowers/handoffs/m9/09-validation-report.md`.

Use this structure:

```markdown
# M9 Chunk 9 — Validation Report

**Date:** {YYYY-MM-DD}
**Branch:** feat/m9-shopify
**HEAD:** {short SHA}

## Summary
{One-paragraph verdict: green / yellow / red. Mention the Task 5.5 gap up front.}

## Quality gates
- `bun run check`: {pass/fail + exact output if fail}
- `bun run test:unit`: {pass/fail + passing/failing count, exact output of any failures}

## Task 5.3 — Brand-kit merge diff
- Spec compliance: {pass / issues list}
- Extra scope (commit 9c4b0b7): {legitimate / scope-creep — with reasoning}
- Notes: ...

## Task 5.4 — Brand-context pill
- Spec compliance: {pass / issues list}
- Notes: ...

## Task 5.5 — Shop panel
- Status: NOT STARTED — 0 / 7 steps done
- Files missing: ShopPanel.vue, ShopPanelProducts.vue, ShopPanelCollections.vue, ShopPanelDiscounts.vue, tests

## Convention audit
{Table of violations, or "None found."}

## Architectural issues
{Any Issue-C-style problems, or "None found."}

## Working-tree cleanliness
- Modified handoff doc: {accurate / stale}
- .claude, .ralphy, tsconfig.node.tsbuildinfo: {in .gitignore / not}
- Recommendations: ...

## Bugs / risks found
{Numbered list. For each: severity (CRITICAL/HIGH/MEDIUM/LOW), location (file:line), description, suggested fix (don't apply).}

## Recommendation
{One of:
  - GREEN: Task 5.5 can be dispatched to ralphy next.
  - YELLOW: Minor cleanup first, then dispatch 5.5.
  - RED: Stop — these issues must be resolved before 5.5.}
```

After writing the report, print these two lines to the terminal so the founder knows where to look:

```
VALIDATION REPORT: docs/superpowers/handoffs/m9/09-validation-report.md
OVERALL: {GREEN|YELLOW|RED}
```

---

## 4. What You Must NOT Do

1. **Do NOT implement Task 5.5.** Ralphy will be dispatched separately. Your job is to validate what's done, not finish the chunk.
2. **Do NOT switch branches.** Stay on `feat/m9-shopify`.
3. **Do NOT commit, amend, rebase, or force-push.** You may recommend commits but the founder makes them.
4. **Do NOT delete `.claude/`, `.ralphy/`, or `tsconfig.node.tsbuildinfo`.** Flag them in the report.
5. **Do NOT merge to `main`.** M9 is not ready to merge (Chunks 10 and 11 still pending).
6. **Do NOT fix bugs you find.** Document them in the report with severity + suggested fix.
7. **Do NOT touch anything in `packages/core/`** (engine, renderer, scene graph — read-only).
8. **Do NOT modify `SYSTEM_PROMPT` in `use-chat.ts`.**

---

## 5. Reference — Related Memory / Past Decisions

- **Chunk 8 Issue C:** StoreTypeStep emits events to a dead parent because `useOnboardingState` is a factory, not a singleton. Documented as known limitation in `08-phase-5.1-5.2-onboarding-dashboard.md`. Will be retired in design-overhaul Phase 1 after M9 merges. Watch for similar factory-vs-singleton bugs.
- **Design overhaul is deferred until all M9 chunks ship and M9 merges to main.** Do not recommend pulling forward overhaul-style changes.
- **Image export only** — Kova exports image slices, not HTML. Do not suggest HTML export.
- **Merge to main is NOT imminent.** The founder wrote: *"I'm not going to merge m9-shopify to main for a while — it's not done yet."* This means your validation is about readiness for Chunk 10 dispatch, not merge-readiness.

---

## 6. Good luck

When you're done, the founder will read your report, decide whether to accept commit `9c4b0b7` (the extra merge panel), and then dispatch ralphy on Task 5.5 or on Chunk 10 depending on your verdict.

Keep the report tight. Facts over narrative. File + line numbers for every claim.
