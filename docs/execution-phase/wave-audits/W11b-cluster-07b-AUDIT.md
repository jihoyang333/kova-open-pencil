# W11b — Cluster 07b (Inspector + Overlays + Find Mode) AUDIT Prompt

**Wave:** W11b
**Cluster:** 07b — Inspector right-panel, 4 gradient types, boolean ops, effects, 8 overlays, find canvas-focus mode (end-to-end per CT-022), eyedropper, pixel grid
**Audit type:** VERY STRICTEST design-system audit. Highest surface area + most violation risk. 15 founder locks (PRD 07b 2026-05-17).
**Status:** ready after W11b DONE (after Cluster 06 + 07a merged)
**Prerequisites:** Branch `app/cluster-07b-inspector` (worktree `/Users/jihoyang/kova-build-c07b`). DONE at `cluster-reports/W11b-cluster-07b-DONE.md`. Cluster 06 + 07a merged.

---

## Founder pre-flight

1. W11b printed DONE
2. Cluster 06 + 07a merged
3. Figma right-panel reference PNGs accessible

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W11b AUDIT agent for Kova. Independent reviewer for
Cluster 07b — inspector + overlays + find mode.

This cluster has THE most violation risk of any cluster. 15 founder
locks. Find feature OWNED end-to-end (NOT Cluster 08). 4 gradient
types EXACT. Boolean op shortcuts EXACT (⌥⇧U/S/I/E, NOT ⌘⌥*).
Be paranoid about design-system enforcement.

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
   (re-read EVERY section — strictest enforcement)
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W11b-cluster-07b-inspector.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
6. docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
7. docs/execution-phase/cluster-reports/W11b-cluster-07b-DONE.md
8. project_prd07b_decisions.md memory context (15 founder locks
   2026-05-17, 4 rounds)
9. All right-panel-*.png Figma reference screenshots
10. CLAUDE.md root + outer

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. vue-expert — inspector reactivity, overlay rendering, find mode
   reactivity
3. typescript-pro — type-safety sweep (17 as-any casts MUST be
   refactored to typed mocks per W3 B-LOW + W5a)

## Conditional subagents

- context7 MCP — Reka UI primitive APIs for find overlay
- e2e-runner — gradient apply / boolean union / eyedropper / find
  canvas-focus / pixel grid toggle

## Cluster 07b expected scope (per PRD 07b 15 founder locks)

ALLOWED:
- src/components/canvas/inspector/* — InspectorPanel + 7+ property
  rows (Position / Size / Layout / Appearance / Fill / Stroke /
  Effects)
- src/components/canvas/inspector/GradientEditor.vue
- src/components/canvas/inspector/BooleanOpsRow.vue
- src/components/canvas/inspector/EyedropperButton.vue
- src/components/canvas/overlays/* — 8 overlays per Plan 07b tasks
  4.5–4.11b
- src/components/canvas/find/* — SearchPanel + DimLayerOverlay +
  FindOverlay (find owned end-to-end per CT-022)
- src/stores/canvas/useFindStore.ts
- src/composables/useCameraPan.ts
- src/composables/useEyedropper.ts (web fallback default; native
  Tauri behind EYEDROPPER_NATIVE_TAURI flag per C-LOW07b.5)
- src/composables/usePixelGrid.ts (auto > 800% + Shift+' toggle)
- /dev/cluster-07b showcase
- tests/*

FORBIDDEN:
- packages/core/** — CRITICAL (07a is the engine cluster, NOT 07b)
- Find feature in Cluster 08 (CT-022 — find lives here end-to-end)
- Canvas chrome (Cluster 06's scope — only CONSUME via panel slots)

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-07b-inspector
  git diff --stat feat/m9-shopify...app/cluster-07b-inspector

One-per-task. Conventional commits. ~25-35 commits expected.

### B. Find feature OWNED end-to-end (CT-022 — CRITICAL)

PRD 07b owns find feature end-to-end. Verify ALL of these are in
Cluster 07b (NOT Cluster 08):
- useFindStore (state machine for find mode)
- SearchPanel (input + filter UI)
- DimLayerOverlay (dimming non-matched layers)
- FindOverlay (highlighting matched nodes)
- useCameraPan (camera pans to focus matched node)

Verify by grepping:

  git grep -l 'useFindStore\|SearchPanel\|DimLayerOverlay\|FindOverlay\|useCameraPan' \
    src/

All hits MUST be inside src/components/canvas/find/, src/stores/,
or src/composables/ — and the diff to feat/m9-shopify shows them
all added on this branch. If any of these components are missing
or live elsewhere → CRITICAL violation of CT-022.

### C. 4 gradient types (founder lock)

Open GradientEditor.vue. Verify EXACTLY these 4 gradient types:
- linear
- radial
- angular (a.k.a. conic)
- diamond

Verify each gradient type:
- Has a renderer in scene.ts (Cluster 07a engine — should already
  exist from 07a; this cluster wires the editor UI)
- Has a UI affordance to switch type
- Stops/handles render correctly per type
- No 5th type leaked (no 'mesh', no 'free-form'). No type missing.

### D. Boolean ops keyboard shortcuts (W5a fix — CRITICAL)

Verify the keyboard handlers use EXACTLY:
- Union: ⌥⇧U (Alt+Shift+U) → code === 'KeyU' && altKey && shiftKey
- Subtract: ⌥⇧S → code === 'KeyS' && altKey && shiftKey
- Intersect: ⌥⇧I → code === 'KeyI' && altKey && shiftKey
- Exclude: ⌥⇧E → code === 'KeyE' && altKey && shiftKey

NOT ⌘⌥U/S/I/X (pre-W5a wrong shortcut).

Use e.code, NOT e.key (CLAUDE.md root §"Keyboard shortcuts" —
Option key transforms characters on Mac).

Grep:

  git grep -nE "altKey.*shiftKey|metaKey.*altKey" src/

Verify all 4 ops use altKey+shiftKey (Option+Shift), NOT
metaKey+altKey.

Any deviation = CRITICAL (user-visible regression per founder
lock).

### E. BooleanOpsRow disabled-state tests (W3 C-LOW07b.2)

Verify the disabled state has unit tests:
- < 2 selection → all 4 ops disabled
- 2+ selection with incompatible types → ops disabled with reason
- 2+ compatible selection → ops enabled

### F. 8 overlays (Plan 07b tasks 4.5–4.11b — W3 C-MED-07b.1)

Per W3 C-MED-07b.1, overlays split into per-overlay TDD tasks.
Verify each task has its own commit + each overlay has its own
unit test.

Verify the 8 overlays render correctly (per design.md §"Overlays"
spec):
- Selection bounding box
- Resize handles
- Rotation handle
- Constraint indicators
- Layout guides (per Figma's canvas grid)
- Comment pins (placeholder if comments are Phase 2)
- Mask outline corners (consume Cluster 07a mask glyph)
- Boolean op preview overlay (during op application)

Use the Figma reference screenshots (frame-outline-toggles-on,
layout-guides-on, mask-glyph-applied, comment-pin-on-canvas, etc.)
to verify visual match.

### G. Eyedropper (W3 C-LOW07b.5)

- Web fallback default — uses canvas pixel readback or EyeDropper
  API where available
- EYEDROPPER_NATIVE_TAURI feature flag — if true, dispatches to
  Tauri native eyedropper command (Phase 2)
- Feature flag default = false
- Single composable useEyedropper.ts exports both paths

### H. Pixel grid (founder lock)

- Auto-shows when zoom > 800%
- Shift+' (apostrophe) toggles override — verify with e.code ===
  'Quote' && shiftKey (or similar — apostrophe code varies, verify
  against actual KeyboardEvent.code for the platform)
- Renders as semi-transparent grid lines via canvas overlay
- Performance check: no measurable frame drop at 1000% zoom

### I. Mask compositing (consumer of Cluster 07a)

Verify Cluster 07a's mask glyph (cornerGlyphs) is consumed by the
inspector overlay for masked nodes. No re-implementation here.

### J. Clipboard paste-skip incompatible-field test (W3 C-LOW07b.4)

Unit test exists for paste behavior: when pasting properties from
one node type to incompatible target (e.g., RECTANGLE
characterStyleOverride paste to LINE), the incompatible field is
skipped silently (no error, no crash).

### K. 17 as-any casts refactored (W3 B-LOW + W5a + post-W5a sweep)

Grep:

  git grep -n 'as any' src/components/canvas/inspector/ \
    src/components/canvas/overlays/ src/components/canvas/find/ \
    src/composables/ 2>/dev/null

Goal: zero `as any` in this cluster's code. The W3+W5a refactor
targeted 17 specific casts. Verify count is at zero (or close to
zero with documented justification per remaining cast).

Any `as any` in new code = MEDIUM (sweeping ban per CLAUDE.md
root §"Code Conventions: No `any`").

### L. VERY STRICT design-system grep sweep

  # Forbidden icon patterns
  git diff feat/m9-shopify...app/cluster-07b-inspector \
    -- 'src/**/*.vue' | grep -nE \
    '<icon-lucide-|<svg(?! class="kova)|from .*lucide'

  # Inline hex / styles
  git diff feat/m9-shopify...app/cluster-07b-inspector -- 'src/**' \
    | grep -nE '#[0-9a-fA-F]{3,8}\b|<style|style scoped|style="'

  # Hard-rule violations
  git diff feat/m9-shopify...app/cluster-07b-inspector -- 'src/**' \
    | grep -nE 'Math\.random|!\.[a-zA-Z]'

Any hit = CRITICAL.

Verify:
- Inspector right-panel = .panel.inspector
- Property rows = .prop-row patterns
- Gradient editor = existing pattern (NO new component)
- Boolean op icons = <KovaIcon name="..."> with correct registry
  names
- Find overlay = .overlay.find pattern (or spec'd in design.md)
- Camera pan = scroll-based (NO new gesture library)
- Zero new tokens

### M. Visual fidelity

- KOVA_AUDIT.md + tokens-used.md at cluster-audits/cluster-07b-*
- 3-screenshot artifact per surface (right-panel-rectangle-selected
  variants, right-panel-text-selected, frame-outline-toggles-on,
  layout-guides-on, mask-glyph-applied, figma-find-command-ui-ux
  variants, comment-pin-on-canvas)
- Playwright visual-diff thresholds enforced

### N. Cross-cluster contracts

- Cluster 07a engine: consumed for scene-graph mutations (no
  direct mutation)
- Cluster 06 canvas chrome: panel slots consumed
- Cluster 08 menus: shortcuts registered via menus' shortcut
  registry; CT-022 means find feature DOES NOT live in 08 (just
  registered as a menu shortcut)
- Cluster 11: KovaIcon, KovaPopover (gradient stops popover),
  KovaTooltip (boolean ops tooltips)

### O. Quality gates (re-run)

  bun install
  bun run build / check / test:unit / test:dupes
  bun run test:visual

### P. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-07b-inspector. VERY STRICT.
  Focus: 4 gradient types exact match, boolean op shortcuts
  ⌥⇧U/S/I/E via e.code, find feature owned end-to-end (CT-022),
  8 overlays per-task TDD, 17 as-any casts refactored,
  eyedropper feature flag, pixel grid 800%+Shift+', design-system
  zero violations, CLAUDE.md hard constraints.
  CRITICAL/HIGH/MEDIUM/LOW."

### Q. Plan task completion + Done-report accuracy

Walk Plan 07b §6 task-by-task. Verify 15 founder locks each
honored. Spot-check 5 DONE claims.

## Output

  docs/execution-phase/wave-audits/reports/W11b-cluster-07b-AUDIT-REPORT.md

Format per W7 template. Include separate sections:
- "15 Founder-lock compliance" (one row per lock + status)
- "CT-022 find-feature ownership" (file inventory)
- "Boolean op shortcut audit"
- "Design-system compliance (VERY STRICT)" with grep results
- "Visual fidelity artifacts"

Print:
  "W11b AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W11b-cluster-07b-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 120-180 min (most surfaces + strictest enforcement). Token spend: $150-280.**
