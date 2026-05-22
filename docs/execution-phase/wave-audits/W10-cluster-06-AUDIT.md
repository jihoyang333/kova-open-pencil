# W10 — Cluster 06 (Canvas Chrome + Shell) AUDIT Prompt

**Wave:** W10
**Cluster:** 06 — Canvas shell wrapping OpenPencil engine + bottom toolbar + layers panel + properties panel + file menu + showUI 3-state
**Audit type:** STRICTEST design-system audit. Largest surface area, highest visual-fidelity risk. Locked icon names (B-HIGH7), routing canonical (CT-002), AI default tab (CT-005), useRightPanelStore canonical (CT-002).
**Status:** ready after W10 DONE (after W9a + W9b merged)
**Prerequisites:** Branch `app/cluster-06-canvas-chrome`. DONE at `cluster-reports/W10-cluster-06-DONE.md`.

---

## Founder pre-flight

1. W10 printed DONE
2. W9a + W9b merged into feat/m9-shopify
3. Figma canvas reference PNGs accessible at outer-repo path

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W10 AUDIT agent for Kova. Independent reviewer for
Cluster 06 — canvas chrome.

This cluster has the largest UI surface area in the app + the
strictest design-system rules. Match Figma canvas reference
screenshots pixel-for-pixel. Hi-fi discipline = non-negotiable.

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
   (re-read §2.4 + §2.5 carefully — STRICT compliance audit)
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
   (3-rule contract — fidelity audit uses this)
4. docs/execution-phase/execution-prompts/W10-cluster-06-canvas-chrome.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/06-canvas-editor-core-chrome.md
6. docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
7. docs/execution-phase/cluster-reports/W10-cluster-06-DONE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/batch-b/Kova Canvas - Final.html
   (canonical reference implementation per design.md §7)
9. All Figma canvas reference PNGs at
   /Users/jihoyang/kova-main/main-main-kova-scope/design-system/compressed-figma-canvas-ui/
10. CLAUDE.md root + outer

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. vue-expert — canvas chrome reactivity, showUI state machine,
   right-panel 2-tab framework

## Conditional subagents

- context7 MCP — Reka UI primitive APIs (verify any new wrapper
  matches Reka spec)
- e2e-runner — open canvas → tool selection → draw rect → layers
  selection sync → properties panel update → tab toggle

## Cluster 06 expected scope

ALLOWED:
- src/router/* — /brand/:brandId/canvas/:canvasId (per CT-002)
- src/views/canvas/CanvasView.vue (canvas shell wrapping
  OpenPencil engine)
- src/components/canvas/BottomToolbar.vue (with 10 named tools)
- src/components/canvas/LayersPanel.vue
- src/components/canvas/PropertiesPanel.vue (2-tab framework)
- src/components/canvas/ResizeHandle.vue (W3 C-LOW06.3)
- src/components/canvas/FileMenu.vue
- src/components/canvas/MissingFontsPill.vue (C-LOW06.4/5)
- src/components/canvas/NetworkStatusIndicator.vue (Cluster 11
  wrapper)
- src/stores/canvas/useRightPanelStore.ts (canonical name per
  CT-002 — NOT useRightPanelTabStore)
- src/stores/canvas/useShowUI.ts (3-state per C-MED17)
- src/composables/* — selection sync, tool selection
- /dev/cluster-06 showcase route
- tests/*

FORBIDDEN:
- packages/core/** — CRITICAL (canvas engine is read-only; this
  cluster only WRAPS it)
- AI chat surfaces (Cluster 10's scope — but verify the AI TAB
  shell exists with placeholder)
- Inspector / overlay details (Cluster 07b's scope — properties
  panel here = scaffold + tab framework + design tab placeholder
  if PRD splits it that way)

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-06-canvas-chrome
  git diff --stat feat/m9-shopify...app/cluster-06-canvas-chrome

One-per-task. Conventional commits. ~20-30 commits expected.

### B. Routing canonical (CT-002 + W5a fix)

Verify:
- /brand/:brandId/canvas/:canvasId is the canonical canvas URL
- NOT /canvas/:canvasId (no brand-scope-less variant)
- NOT /dashboard?canvasId=... (query-param variants forbidden)

Open src/router/index.ts. Any deviation = CRITICAL.

### C. KovaIcon registry names (B-HIGH7 lock)

Bottom toolbar must use these EXACT registry names:
  'mouse-pointer-2', 'crop', 'ruler', 'frame', 'square', 'circle',
  'pen-tool', 'type', 'sparkles', 'component'

Open BottomToolbar.vue. Read every <KovaIcon name="..."> usage.
Any deviation from this list (typo, swap, missing) = HIGH.

Grep for forbidden icon patterns:

  git diff feat/m9-shopify...app/cluster-06-canvas-chrome \
    -- 'src/**/*.vue' | grep -nE \
    '<icon-lucide-|<svg|<i class="[^"]*icon|from .*lucide'

Any hit = CRITICAL (KovaIcon ban per Design Rider).

### D. AI default tab (CT-005 + PRD 06 §12.13)

On first canvas open, right panel default tab = AI.

Open useRightPanelStore.ts. Verify:
- Initial activeTab state = 'ai' (NOT 'design', NOT undefined)
- Store name is useRightPanelStore (CT-002 — NOT
  useRightPanelTabStore)
- 2-tab enum: const TABS = {AI: 'ai', DESIGN: 'design'} as const
  (per CLAUDE.md root §"Code Conventions" — `as const` maps not
  enums)

CT-002 store-name violation = HIGH. AI-default-off = CRITICAL
(user-visible regression vs founder lock).

### E. showUI 3-state (C-MED17 lock)

Verify the showUI enum supports EXACTLY:
- 'hidden'
- 'minimized'
- 'full'

NOT a boolean. NOT additional states. Open the showUI store.
Verify state transitions are bounded to these 3 values via const
map per Kova convention.

### F. Bottom toolbar tool semantics

10 tools per B-HIGH7. Each tool:
- Renders <KovaIcon name="<exact-name>">
- .tool-btn class + .active variant when selected
- Click handler dispatches tool-selection event
- Disabled-state per founder lock (lastpage delete = Figma-style:
  cannot delete the only canvas; verify this state is reachable
  + visually distinct)

### G. LeftPanel ResizeHandle (W3 C-LOW06.3 / Plan 06 Task 11)

Verify:
- ResizeHandle exists as a component
- Drag updates leftPanelWidth in store
- Bounds enforced (min/max width)
- Cursor changes on hover (ew-resize)
- No layout shift / no scroll jank during drag

### H. FileMenu

- Version history handshake bus emitted (W4 C-MED26 / Plan 06 W3)
  — verify event payload SHAPE is defined, even if Cluster 09
  consumes it
- Settings trigger calls Cluster 12 settings modal (cross-link)

### I. Missing-fonts pill (W3 C-LOW06.4/5)

- Pill renders when scene-graph has a font not loaded locally
- Click opens a font-loader modal or links to font settings
- Reads from font-loader composable

### J. Malformed-drop crash-resistance (W3 C-MED18 / Plan 06 Task 8)

- Drop handler wrapped in try/catch
- Invalid payload (non-image, oversize, wrong MIME) shows toast
  error, does NOT crash app
- Unit test exists for malformed payload

### K. Network status indicator

- Wraps Cluster 11 primitive (NetworkBanner or equivalent)
- Single-mode per CT-020

### L. STRICT design-system grep sweep

This cluster gets the strictest enforcement. Any hit = CRITICAL:

  # Forbidden icon patterns
  git diff feat/m9-shopify...app/cluster-06-canvas-chrome \
    -- 'src/**/*.vue' | grep -nE \
    '<icon-lucide-|<svg(?! class="kova)|<i class="[^"]*icon|from .*lucide'

  # Inline hex / styles
  git diff feat/m9-shopify...app/cluster-06-canvas-chrome \
    -- 'src/**' | grep -nE \
    '#[0-9a-fA-F]{3,8}\b|<style|style scoped|style="[^"]*[a-z]+:[^"]*"'

  # Hard-rule violations
  git diff feat/m9-shopify...app/cluster-06-canvas-chrome \
    -- 'src/**' | grep -nE \
    'Math\.random|: any|!\.[a-zA-Z]'

### M. Visual fidelity (Figma canvas screenshots — STRICT)

- KOVA_AUDIT.md + tokens-used.md at cluster-audits/cluster-06-*
- Per-screen diff files for EVERY surface listed in the Figma
  reference PNG list at tests/snapshots/cluster-06/<surface>-diff.md
- 3-screenshot artifact (mockup PNG / Vue impl / pixel diff)
- Playwright visual-diff 0.1% / 0.5% thresholds enforced
- Run: bun run test:visual --project=visual-diff

Missing artifact for any of these surfaces = HIGH:
- bottom-toolbar.png (4 variants)
- layers-panel-left-and-inspector-panel-right.png (3 variants)
- right-panel-rectangle-selected (3 variants)
- right-panel-text-selected
- multi-select (variants)
- click-filter-button
- click-plus-button
- frame-selected-on-canvas
- right-click-on-canvas
- hover-state

### N. /dev/cluster-06 showcase route

- Route exists
- Renders BottomToolbar + LayersPanel + PropertiesPanel + FileMenu
  composed
- Can be screenshotted at 1440×900 (or canvas reference viewport)
  for visual-diff baselines

### O. Cross-cluster contracts

- Cluster 07a engine: scene-graph consumed for layers tree +
  selection sync. NO modification of engine code from this cluster.
- Cluster 07b inspector: PropertiesPanel design tab = scaffold;
  full content lands in Cluster 07b. Verify the scaffold leaves a
  clean integration point.
- Cluster 08 menus: file menu / right-click context menu defined
  in Cluster 08; Cluster 06 reserves the slots only.
- Cluster 09: version history handshake bus
- Cluster 10: AI tab placeholder + integration point
- Cluster 11: KovaIcon, KovaModal, Reka primitives, KovaToast

### P. Quality gates (re-run)

  bun install
  bun run build / check / test:unit / test:dupes
  bun run test:visual

OpenPencil baseline: existing canvas/renderer must still run. Smoke
the dev server: bun run dev → open localhost:1420 → no console
errors in browser.

### Q. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-06-canvas-chrome. STRICT
  design-system enforcement. Focus: KovaIcon registry exact names
  (B-HIGH7), useRightPanelStore canonical name (CT-002), AI default
  tab (CT-005), showUI 3-state (C-MED17), zero <icon-lucide-*>,
  zero <style>, zero hex literals, zero new tokens. CLAUDE.md hard
  constraints. CRITICAL/HIGH/MEDIUM/LOW."

### R. Plan task completion + Done-report accuracy

Walk Plan 06 §6 task-by-task. Verify each commit. Spot-check 5
DONE claims.

## Output

  docs/execution-phase/wave-audits/reports/W10-cluster-06-AUDIT-REPORT.md

Format per W7 template. Include separate sections:
- "Design-system compliance (STRICT)" with grep-result inventory
- "Visual fidelity artifacts" — surface-by-surface 3-screenshot
  table
- "Founder-lock compliance" enumerating CT-002/CT-005/B-HIGH7/
  C-MED17/C-MED18/C-LOW06.3-5

Print:
  "W10 AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W10-cluster-06-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 90-150 min (most surfaces of any cluster). Token spend: $120-200.**
