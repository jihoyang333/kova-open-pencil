# Wave 3 — Canvas Bundle Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 31 spec-doc findings across Cluster 06 + 07a + 07b + 08 (canvas bundle), one commit per finding, branch `fix/qa-w3-canvas-bundle`.

**Architecture:** Spec-doc-only edits. No app code touched. Verify-only findings (W0 already-fixed sweep) append a verification line to a single `VERIFY-W3-canvas-bundle.md` audit log so each gets its own commit. Real edits modify the PRD/Plan markdown directly.

**Tech Stack:** Markdown only. `grep` for verification. Git for per-finding commits.

---

## Pre-flight verification (do before any task)

- [ ] **Step PF.1: Confirm worktree state**

```sh
cd /Users/jihoyang/kova-w3-canvas && pwd && git branch --show-current && git status --short
```
Expected: `/Users/jihoyang/kova-w3-canvas | fix/qa-w3-canvas-bundle | (clean)`

- [ ] **Step PF.2: Confirm W2 merged into feat/m9-shopify**

```sh
cd /Users/jihoyang/kova-w3-canvas && git log --oneline feat/m9-shopify | grep "Merge W2" | head -5
```
Expected: 3 W2 merge commits.

- [ ] **Step PF.3: Create verification audit log**

Create `docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md` with template:

```markdown
# Wave 3 Canvas Bundle — Verification Audit

Per-finding verification record. One line appended per verify-only finding (W0 sweep confirmations). Real edits live in PRD/Plan markdown directly.

| Finding | Cluster | Verification command | Result | Notes |
|---|---|---|---|---|
```

Commit:
```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "chore(qa-w3): add verification audit log scaffold"
```

---

## Cluster 06 — 11 findings

### Task 1: B-CRIT1 (06) — Verify Plan 06:101 routing is /brand/:brandId (W0-3)

**Status:** Verified clean — Plan 06 already uses `/brand/:brandId` per W0-3 (line confirms `brand-label-navigates.spec.ts` routes there).

- [ ] **Step 1.1: Re-verify with grep**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -n "/brand/\|/dashboard?brandId" docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md | head -10
```
Expected: only `/brand/:brandId` hits, no `?brandId=` query-param form in E2E specs.

- [ ] **Step 1.2: Append to audit log**

Append row: `| B-CRIT1 | 06 | grep /dashboard?brandId Plan 06 | 0 hits — clean (W0-3 applied) | Plan 06:101 area shows /brand/:brandId E2E spec |`

- [ ] **Step 1.3: Commit**

```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "fix(qa-w3-c06): B-CRIT1 verify routing /brand/:brandId (W0-3 clean)"
```

### Task 2: CT-005 — Fix PRD 06:582 default-tab drift

**Status:** DRIFT — line 253 says "Default-active = AI" (W0-7) but line 582 still says "Default-active tab on canvas open = Design".

- [ ] **Step 2.1: Edit PRD 06 line 582**

Replace `Default-active tab on canvas open = Design (matches Figma's first-tab default)` with `Default-active tab on canvas open = AI (founder ratification 2026-05-17 §12.13; W0-7 propagation 2026-05-19)`.

- [ ] **Step 2.2: Re-grep to confirm**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -n "Default-active" docs/kova-final-prds/06-canvas-editor-core-chrome.md
```
Expected: all hits show "= AI".

- [ ] **Step 2.3: Commit**

```sh
git add docs/kova-final-prds/06-canvas-editor-core-chrome.md
git commit -m "fix(qa-w3-c06): CT-005 PRD 06:582 default tab = AI (W0-7 drift)"
```

### Task 3: CT-006(b) — Remove "Command-K palette" residual at PRD 06:147

**Status:** Residual in cluster-11 cross-cuts row at line 147.

- [ ] **Step 3.1: Edit PRD 06 line 147**

Remove `, Command-K palette` from the cluster-11 cross-cut row. Keep other primitives.

- [ ] **Step 3.2: Re-grep**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "Command-K|Cmd\+K|⌘K palette|cmd-k" docs/kova-final-prds/06-canvas-editor-core-chrome.md
```
Expected: 0 hits.

- [ ] **Step 3.3: Commit**

```sh
git add docs/kova-final-prds/06-canvas-editor-core-chrome.md
git commit -m "fix(qa-w3-c06): CT-006b drop Command-K palette residual PRD 06:147"
```

### Task 4: B-HIGH7 (06) — Replace i-lucide strings with KovaIcon name convention

**Status:** Plan 06 lines 500-502, 626-633, 1866-1870 use `icon: 'i-lucide-*'` strings inside ToolDef objects. KovaIcon (W0-4, Plan 11 Task 4.4) registry maps short names like `'move-cursor'`, `'crop'`, `'ruler'`, etc.

- [ ] **Step 4.1: Edit Plan 06 ToolDef icon strings**

Replace pattern `icon: 'i-lucide-<name>'` with `icon: '<name>'` (registry-name form) in all 13 hits at lines 500-502, 626-633, 1866-1870. Examples:
- `'i-lucide-mouse-pointer-2'` → `'mouse-pointer-2'`
- `'i-lucide-crop'` → `'crop'`
- `'i-lucide-ruler'` → `'ruler'`
- `'i-lucide-frame'` → `'frame'`
- `'i-lucide-square'` → `'square'`
- `'i-lucide-circle'` → `'circle'`
- `'i-lucide-pen-tool'` → `'pen-tool'`
- `'i-lucide-type'` → `'type'`
- `'i-lucide-sparkles'` → `'sparkles'`
- `'i-lucide-component'` → `'component'`

Add a note at Task 4 (useToolRegistry) section: ToolDef.icon is a KovaIcon registry name (per Cluster 11 Task 4.4); registry MUST include all entries above in `kova-icon-registry.ts`.

- [ ] **Step 4.2: Re-grep to confirm zero i-lucide strings in Plan 06**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "'i-lucide-" docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
```
Expected: 0 hits.

- [ ] **Step 4.3: Commit**

```sh
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
git commit -m "fix(qa-w3-c06): B-HIGH7 ToolDef icons → KovaIcon registry names (W0-4)"
```

### Task 5: HIGH-10 (06) — Verify useRightPanelStore canonical (W0-3)

**Status:** Verified clean — `src/stores/right-panel.ts` is canonical at Plan 06:33, 357.

- [ ] **Step 5.1: Re-verify**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -n "useRightPanelStore\|right-panel" docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md | head -5
```

- [ ] **Step 5.2: Append to audit log**

Append: `| HIGH-10 | 06 | grep useRightPanelStore Plan 06 | canonical at src/stores/right-panel.ts (Plan 06:33, 357) | Cluster 10 W4 will sync imports |`

- [ ] **Step 5.3: Commit**

```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "fix(qa-w3-c06): HIGH-10 verify useRightPanelStore canonical (W0-3 clean)"
```

### Task 6: C-MED26 (06) — Add Version history file-menu contract to Plan 06

**Status:** PRD 08:40 already lists "Show version history" + "Save to version history (⌥⌘S)" in file submenu (Cluster 08 owns the dropdown). Plan 06 owns the file-name TRIGGER (TopChrome). Contract: trigger emits event → Cluster 08 dropdown row dispatches → Cluster 09 (W4) panel listens.

- [ ] **Step 6.1: Edit Plan 06 Task 9 (TopChrome) — add contract subsection**

After Task 9 file inventory, add a new subsection documenting the version-history contract:

```markdown
**Version history contract (C-MED26, ratified W3):**
- File-menu "Show version history" row (defined in Plan 08 §3.3 file-name dropdown) emits `editor:open-version-history` event with payload `{ canvasId, brandId }`.
- File-menu "Save to version history" row emits `editor:save-version-snapshot` event with payload `{ canvasId, label?: string }`.
- Cluster 09 (W4) mounts `<VersionHistoryPanel>` listening for these events.
- TopChrome itself does NOT mount the panel; it only hosts the trigger surface.
```

- [ ] **Step 6.2: Commit**

```sh
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
git commit -m "fix(qa-w3-c06): C-MED26 add version-history event contract Plan 06 Task 9"
```

### Task 7: C-MED17 — Verify showUI 3-state enum migration in Plan 06

**Status:** Verified mostly clean — Plan 06 Task 2 lines 242, 259-264, 307-313, 1708 already define `showUI: 'hidden'|'minimized'|'full'` enum with `setUIVisibility()` action. Note: dispatch's `'all'|'minimal'|'hidden'` triple is incorrect; PRD 06 §2.1 row 5 + §6.2 (canonical) uses `'hidden'|'minimized'|'full'`. Plan 06 conforms.

- [ ] **Step 7.1: Verify no boolean toggle residuals**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "showUI = !|toggle.{0,20}showUI|!editor\.showUI" docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
```
Expected: 0 hits.

- [ ] **Step 7.2: Append audit row**

Append: `| C-MED17 | 06 | grep boolean showUI residuals Plan 06 | 0 hits — clean, enum already canonical | Plan 06 Task 2 defines 'hidden'\|'minimized'\|'full' enum + setUIVisibility() action. Dispatch's 'all'\|'minimal'\|'hidden' triple corrected to match PRD authority. |`

- [ ] **Step 7.3: Commit**

```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "fix(qa-w3-c06): C-MED17 verify showUI 3-state enum (Plan 06 Task 2 canonical)"
```

### Task 8: C-MED18 — Add drop-with-invalid-payload crash-resistance test to Plan 06 Task 8

**Status:** Plan 06 Task 8 ships 5 MIME drop handlers with valibot validation. Missing: explicit malformed-payload test case.

- [ ] **Step 8.1: Edit Plan 06 Task 8 — add subsection**

Add a new sub-test block to Plan 06 Task 8 (Extend use-canvas-drop):

```markdown
**Sub-test 8.x: Crash-resistance against malformed drop payload (C-MED18)**

```ts
// tests/integration/editor/drop-malformed-payload.test.ts
import { describe, test, expect, vi } from 'bun:test'
import { mountEditorHost } from '@/test/mount-editor-host'

describe('use-canvas-drop — malformed payload (C-MED18)', () => {
  test('truncated JSON does not crash editor; surfaces toast', async () => {
    const host = await mountEditorHost()
    const dt = new DataTransfer()
    dt.setData('application/x-kova-saved-block', '{"id":"abc","payl')  // truncated
    const ev = new DragEvent('drop', { dataTransfer: dt })
    host.canvas.dispatchEvent(ev)
    await host.flush()
    expect(host.toastQueue).toContainEqual(
      expect.objectContaining({ variant: 'error', code: 'drop_invalid_payload' })
    )
    expect(host.editorStateChanged).toBe(false)
  })

  test('non-MIME drop is no-op', async () => {
    const host = await mountEditorHost()
    const dt = new DataTransfer()
    dt.setData('text/plain', 'lol')
    const ev = new DragEvent('drop', { dataTransfer: dt })
    host.canvas.dispatchEvent(ev)
    await host.flush()
    expect(host.editorStateChanged).toBe(false)
    expect(host.toastQueue).toHaveLength(0)
  })
})
```
```

- [ ] **Step 8.2: Commit**

```sh
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
git commit -m "fix(qa-w3-c06): C-MED18 add malformed drop-payload crash-resistance test Plan 06 Task 8"
```

### Task 9: C-LOW06.3 — LeftPanel resize handles in Plan 06 Task 11

- [ ] **Step 9.1: Edit Plan 06 Task 11**

Add a subsection to Task 11 specifying inline `<ResizeHandle>` between LeftPanel sections (Brand Kit ↔ Recents ↔ Layers ↔ Pages) with min/max heights, drag-to-resize handler bound to `useLeftPanelStore.setSectionHeight(sectionId, px)`. Add `useLeftPanelStore` row for `sectionHeights: Record<SectionId, number>` with localStorage persistence.

- [ ] **Step 9.2: Commit**

```sh
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
git commit -m "fix(qa-w3-c06): C-LOW06.3 add LeftPanel ResizeHandle spec Plan 06 Task 11"
```

### Task 10: C-LOW06.4 — `<MissingFontsPill>` mount test in Plan 06 Task 9

- [ ] **Step 10.1: Edit Plan 06 Task 9**

Add a unit test entry:
```markdown
**Sub-test 9.x: `<MissingFontsPill>` mount + click handler (C-LOW06.4)**
```ts
// tests/unit/components/MissingFontsPill.test.ts
import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import MissingFontsPill from '@/components/top-chrome/MissingFontsPill.vue'

describe('<MissingFontsPill>', () => {
  test('renders count text when missingCount > 0', () => {
    const w = mount(MissingFontsPill, { props: { missingCount: 2 } })
    expect(w.text()).toContain('2')
    expect(w.text()).toMatch(/missing/i)
  })

  test('does not render when missingCount = 0', () => {
    const w = mount(MissingFontsPill, { props: { missingCount: 0 } })
    expect(w.find('.missing-fonts-pill').exists()).toBe(false)
  })

  test('click emits open-font-manager event', async () => {
    const w = mount(MissingFontsPill, { props: { missingCount: 1 } })
    await w.find('.missing-fonts-pill').trigger('click')
    expect(w.emitted('open-font-manager')).toBeTruthy()
  })
})
```
```

- [ ] **Step 10.2: Commit**

```sh
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
git commit -m "fix(qa-w3-c06): C-LOW06.4 add MissingFontsPill mount test Plan 06 Task 9"
```

### Task 11: C-LOW06.5 — Pill anchor location in Plan 06 Task 14

- [ ] **Step 11.1: Edit Plan 06 Task 14**

Add anchor note: `<MissingFontsPill>` anchors to top-right of canvas viewport, inside `CanvasOverlayHost` (Task 16) at `top: 12px; right: 12px; z-index: 30`. Above selection-box overlay (z-20), below modal layer (z-50).

- [ ] **Step 11.2: Commit**

```sh
git add docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
git commit -m "fix(qa-w3-c06): C-LOW06.5 document MissingFontsPill anchor Plan 06 Task 14"
```

---

## Cluster 07a — 6 findings

### Task 12: A-HIGH5 — Bump PRD 07a status to IN-REVIEW 2026-05-17

- [ ] **Step 12.1: Edit PRD 07a §0 status block**

Update lines 6 + 10:
- `**Status** | `DRAFT` 2026-05-15` → `**Status** | `IN-REVIEW` 2026-05-17`
- `**Last updated** | 2026-05-15` → `**Last updated** | 2026-05-17`

- [ ] **Step 12.2: Commit**

```sh
git add docs/kova-final-prds/07a-canvas-engine-core-renderer.md
git commit -m "fix(qa-w3-c07a): A-HIGH5 bump status IN-REVIEW 2026-05-17"
```

### Task 13: C-LOW07a.1 — measurement events tests in Plan 07a Task 1b

- [ ] **Step 13.1: Locate Plan 07a Task 1b region**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "Task 1b|measurement:broken|measurement:dropped" docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md | head -10
```

- [ ] **Step 13.2: Edit Plan 07a Task 1b — add event test cases**

Append test block specifying trigger conditions:
```markdown
**Sub-test: measurement events (C-LOW07a.1)**
```ts
test('emits measurement:broken when source/target node removed', () => {
  const page = createPageNode()
  const m = page.addMeasurement({ source: 'node-a', target: 'node-b' })
  page.removeNode('node-a')
  expect(page.events).toContainEqual({ type: 'measurement:broken', measurementId: m.id, cause: 'source_removed' })
})

test('emits measurement:dropped when page deleted', () => {
  const page = createPageNode()
  page.addMeasurement({ source: 'node-a', target: 'node-b' })
  const events: any[] = []
  page.on('measurement:dropped', e => events.push(e))
  page.dispose()
  expect(events).toHaveLength(1)
})
```
```

- [ ] **Step 13.3: Commit**

```sh
git add docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md
git commit -m "fix(qa-w3-c07a): C-LOW07a.1 add measurement event tests Plan 07a Task 1b"
```

### Task 14: C-LOW07a.2 — Mask compositing perf benchmark in Plan 07a Task 9

- [ ] **Step 14.1: Edit Plan 07a Task 9**

Append benchmark spec:
```markdown
**Sub-test: Mask compositing perf benchmark (C-LOW07a.2)**

Files:
- Create: `tests/bench/mask-compositing.bench.ts`

```ts
import { bench, describe } from 'bun:test'
import { createRenderer } from '@/test/render-harness'

describe('mask compositing perf (50–300 nodes)', () => {
  for (const n of [100, 200, 300]) {
    bench(`render ${n} masked nodes < 16ms`, () => {
      const r = createRenderer()
      const frame = r.scene.addFrame({ children: Array.from({length: n}, () => r.makeRectWithMask()) })
      const t0 = performance.now()
      r.renderFrame(frame)
      const dt = performance.now() - t0
      if (dt >= 16) throw new Error(`render exceeded budget: ${dt}ms`)
    })
  }
})
```

Budget: 16ms (60fps). Run as part of `bun run bench` gate.
```

- [ ] **Step 14.2: Commit**

```sh
git add docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md
git commit -m "fix(qa-w3-c07a): C-LOW07a.2 add mask-compositing perf benchmark Plan 07a Task 9"
```

### Task 15: C-LOW07a.3 — format_version coordination task

- [ ] **Step 15.1: Edit Plan 07a — add coordination task**

Add new task at end of phase covering codec changes:
```markdown
### Task Nx: format_version coordination with Cluster 09 (C-LOW07a.3)

**Files:**
- Modify: `packages/core/codec/format-version.ts` (founder lock #16 exception: codec changes permitted during 07a engine work)
- Modify: `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md` (cross-link to snapshot migration)

- [ ] **Step 1: When schema changes occur in packages/core/codec/, bump `FORMAT_VERSION` const by minor (additive) or major (breaking) per semver.**
- [ ] **Step 2: Coordinate with Cluster 09 fix agent (W4) — snapshot migration registry must add entry for new version.**
- [ ] **Step 3: Document in Plan 09: snapshot-migration registry checks `snapshot.formatVersion` against `FORMAT_VERSION` and runs registered migration fn.**
- [ ] **Step 4: Commit (Cluster 07a side): `feat(cluster-07a): bump FORMAT_VERSION → X.Y` — note coordination with Plan 09 task.**
```

- [ ] **Step 15.2: Commit**

```sh
git add docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md
git commit -m "fix(qa-w3-c07a): C-LOW07a.3 add format_version coordination task Plan 07a"
```

### Task 16: C-LOW07a.4 — node:errored event surface in Plan 07a

- [ ] **Step 16.1: Edit Plan 07a — add event surface section**

Add a subsection (after measurement events area) documenting the node:errored event contract:
```markdown
**Sub-spec: node:errored event surface (C-LOW07a.4 — Cluster 11 ToastStack dep)**

```ts
// packages/core/scene/events.ts
export interface NodeErroredEvent {
  type: 'node:errored'
  nodeId: string
  errorCode: 'render_failed' | 'invalid_state'
  message: string
}
```

Emit triggers:
- `render_failed`: renderer catches exception in node draw fn.
- `invalid_state`: scene-graph invariant violated (e.g., orphan parent ref).

Subscriber: `<ToastStack>` (Cluster 11) listens via `editorBus.on('node:errored', ...)`, surfaces a toast `variant: 'error'` with `code: errorCode`.

Test:
```ts
test('emits node:errored on render exception', () => {
  const r = createRenderer()
  const bad = r.scene.addNode({ type: 'rectangle', draw: () => { throw new Error('boom') } })
  const events: NodeErroredEvent[] = []
  r.on('node:errored', e => events.push(e))
  r.renderNode(bad)
  expect(events[0]).toMatchObject({ nodeId: bad.id, errorCode: 'render_failed', message: 'boom' })
})
```
```

- [ ] **Step 16.2: Commit**

```sh
git add docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md
git commit -m "fix(qa-w3-c07a): C-LOW07a.4 add node:errored event surface Plan 07a"
```

### Task 17: B-NOTE2 — Verify packages/core/ exception documented (founder lock #16)

**Status:** Verify-only. No change.

- [ ] **Step 17.1: Confirm packages/core/ exception note in Plan 07a**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "packages/core/|founder lock|lock #16|read-only.*exception" docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md | head -10
```

- [ ] **Step 17.2: Append audit row**

Append: `| B-NOTE2 | 07a | grep packages/core/ exception in Plan 07a | documented per founder lock #16 (SLICE + page-level Measurement) | no change required |`

- [ ] **Step 17.3: Commit**

```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "fix(qa-w3-c07a): B-NOTE2 verify packages/core/ exception documented"
```

---

## Cluster 07b — 9 findings

### Task 18: CT-022 — Verify find feature owned by Cluster 07b

**Status:** Plan 07b ships find end-to-end (Tasks 1.6, 1.7, 2.11-2.14, 4.12-4.14, 7.1 verified present per grep at lines 654, 749, 1363, 1446, 1520, 1606, 3456, 3622, 3727, 4119).

- [ ] **Step 18.1: Re-verify Plan 07b find ownership**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "useFindStore|SearchPanel|DimLayerOverlay|FindOverlay|useCameraPan|useFindSearch" docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md | head -20
```
Expected: implementations in Tasks 1.6/1.7/2.11-2.14/4.12-4.14/7.1.

- [ ] **Step 18.2: Append audit row**

Append: `| CT-022 (07b side) | 07b | grep find primitives Plan 07b | Tasks 1.6/1.7/2.11-2.14/4.12-4.14/7.1 own find e2e (W0-2) | matches PRD 07b §12.12 |`

- [ ] **Step 18.3: Commit**

```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "fix(qa-w3-c07b): CT-022 verify find feature owned by Cluster 07b (W0-2 clean)"
```

### Task 19: CT-004 (07b) — Verify MEASUREMENT NodeType drift cleaned (W0-7)

**Status:** Verified clean — grep `createMeasurement\|MEASUREMENT NodeType` returns 0 hits.

- [ ] **Step 19.1: Re-verify**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -cE "createMeasurement|MEASUREMENT NodeType" docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
```
Expected: 0.

- [ ] **Step 19.2: Append audit row**

Append: `| CT-004 (07b) | 07b | grep MEASUREMENT NodeType PRD 07b | 0 hits — clean (W0-7 propagation) | page-level addMeasurement model is canonical |`

- [ ] **Step 19.3: Commit**

```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "fix(qa-w3-c07b): CT-004 verify MEASUREMENT NodeType drift cleaned (W0-7)"
```

### Task 20: B-HIGH (07b) — Verify all icons use KovaIcon post-W0-4

**Status:** Verify-only sweep of Plan 07b for non-KovaIcon usage.

- [ ] **Step 20.1: Sweep grep**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "'i-lucide-|<icon-lucide-|<Icon name=\"lucide:" docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
```
Expected: 0 hits. If hits found, replace with KovaIcon registry names (analogous to Task 4 swap).

- [ ] **Step 20.2: If hits found, edit Plan 07b and commit (analogous to Task 4). Otherwise append audit row:**

Append: `| B-HIGH (07b) | 07b | grep forbidden icon patterns Plan 07b | <N> hits — <edited>/<clean> | post-W0-4 |`

- [ ] **Step 20.3: Commit**

```sh
git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md 2>/dev/null || git add docs/kova-final-qa/fix-dispatch/VERIFY-W3-canvas-bundle.md
git commit -m "fix(qa-w3-c07b): B-HIGH verify (or fix) icon convention KovaIcon (W0-4)"
```

### Task 21: B-LOW (07b) — Refactor `as any` casts

- [ ] **Step 21.1: Locate `as any` in Plan 07b**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "as any" docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
```

- [ ] **Step 21.2: For each hit, replace with explicit type narrowing or import the correct type. Use `requireEnv` pattern where the cast was bypassing nullable env vars. Where the cast was used in test mocks (e.g., `vi.fn() as any`), use `vi.fn() as unknown as T` or define a typed mock.**

- [ ] **Step 21.3: Re-grep to confirm count reduced**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -c "as any" docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
```
Goal: 0 hits.

- [ ] **Step 21.4: Commit**

```sh
git add docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
git commit -m "fix(qa-w3-c07b): B-LOW refactor as-any casts → explicit typing"
```

### Task 22: C-MED-07b.1 — Split grouped overlay task 4.5-4.10 into per-overlay TDD

**Status:** Plan 07b line 3398 has heading `Task 4.5–4.10: Remaining 6 overlays (PixelGrid, LayoutGuides, HoverContour, SnapIndicators, FindHighlight, EyedropperCrosshair, MeasurementAnnotations)`. Need to split into 7 discrete tasks (note: 7 overlays despite "6 overlays" wording).

- [ ] **Step 22.1: Read current grouped section**

Read Plan 07b lines 3398-3456 to see current grouped spec.

- [ ] **Step 22.2: Edit Plan 07b — replace grouped heading with 7 per-overlay subsections**

Replace `### Task 4.5–4.10: Remaining 6 overlays (...)` with seven sections:
- `### Task 4.5: PixelGridOverlay` — RED test (renders grid at zoom > 800% per PRD 07b §12.x), GREEN impl, COMMIT.
- `### Task 4.6: LayoutGuidesOverlay` — RED test (renders draggable guides + snap targets), GREEN, COMMIT.
- `### Task 4.7: HoverContourOverlay` — RED test (shows outline on hovered node), GREEN, COMMIT.
- `### Task 4.8: SnapIndicatorsOverlay` — RED test (shows red snap lines during drag), GREEN, COMMIT.
- `### Task 4.9: FindHighlightOverlay` — RED test (highlights matched node), GREEN, COMMIT.
- `### Task 4.10: EyedropperCrosshairOverlay` — RED test (renders cursor crosshair when eyedropper active), GREEN, COMMIT.
- `### Task 4.11: MeasurementAnnotationsOverlay` — RED test (renders measurement labels + lines), GREEN, COMMIT.

Each section follows the Phase-4 template (Files / RED / GREEN / Commit) per existing Tasks 4.1-4.4.

- [ ] **Step 22.3: Commit**

```sh
git add docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
git commit -m "fix(qa-w3-c07b): C-MED-07b.1 split 7 overlays into per-overlay TDD tasks 4.5-4.11"
```

### Task 23: C-LOW07b.2 — BooleanOpsRow disabled-state test in Plan 07b Task 3.4

- [ ] **Step 23.1: Edit Plan 07b Task 3.4 (line 1965)**

Append test:
```markdown
**Sub-test: disabled-state when selection < 2 (C-LOW07b.2)**
```ts
test('BooleanOpsRow disabled when selection has 0 or 1 node', () => {
  const editor = useEditorStore()
  editor.selectedIds = []
  const w = mount(BooleanOpsRow)
  expect(w.find('[data-op="union"]').attributes('disabled')).toBeDefined()
  editor.selectedIds = ['n1']
  expect(w.find('[data-op="union"]').attributes('disabled')).toBeDefined()
  editor.selectedIds = ['n1', 'n2']
  expect(w.find('[data-op="union"]').attributes('disabled')).toBeUndefined()
})
```
```

- [ ] **Step 23.2: Commit**

```sh
git add docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
git commit -m "fix(qa-w3-c07b): C-LOW07b.2 add BooleanOpsRow disabled-state test Plan 07b Task 3.4"
```

### Task 24: C-LOW07b.3 — 4 gradient types test in Plan 07b Task 3.6

- [ ] **Step 24.1: Edit Plan 07b Task 3.6 (PaintEditor, line 2202)**

Append test:
```markdown
**Sub-test: 4 gradient types render (C-LOW07b.3 — PRD 07b §12.x 4 gradient types: Linear / Radial / Angular / Diamond)**
```ts
test.each(['linear', 'radial', 'angular', 'diamond'] as const)(
  'PaintEditor renders %s gradient with stop UI',
  (gradType) => {
    const w = mount(PaintEditor, { props: { paint: { type: 'gradient', gradientType: gradType, stops: [{offset:0,color:'#000'},{offset:1,color:'#fff'}] } } })
    expect(w.find(`[data-gradient-type="${gradType}"]`).exists()).toBe(true)
    expect(w.findAll('[data-stop]').length).toBe(2)
  }
)
```
```

- [ ] **Step 24.2: Commit**

```sh
git add docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
git commit -m "fix(qa-w3-c07b): C-LOW07b.3 add 4 gradient types test Plan 07b Task 3.6"
```

### Task 25: C-LOW07b.4 — useClipboardStore paste-skip test in Plan 07b Tasks 1.1/1.2

- [ ] **Step 25.1: Edit Plan 07b Task 1.1 or 1.2 (lines 297, 355)**

Append test case in either Task 1.1 (failing-test) or 1.2 (implementation) section:
```markdown
**Sub-test: paste handler skips incompatible fields (C-LOW07b.4)**
```ts
test('paste RectangleNode props onto TextNode skips geometry fields', () => {
  const clip = useClipboardStore()
  const src = { type: 'rectangle', cornerRadius: 8, fills: [{type:'solid', color:'#f00'}], x: 10, y: 20, width: 100, height: 50 }
  const tgt = { type: 'text', x: 0, y: 0, content: 'hi', fills: [] }
  clip.copyProps(src)
  const result = clip.pasteProps(tgt)
  // shared fields applied
  expect(result.fills).toEqual(src.fills)
  // geometry-only fields skipped (text uses its own measure)
  expect(result.width).toBe(tgt.width ?? undefined)
  // rectangle-only fields skipped
  expect((result as any).cornerRadius).toBeUndefined()
})
```
```

- [ ] **Step 25.2: Commit**

```sh
git add docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
git commit -m "fix(qa-w3-c07b): C-LOW07b.4 add paste-skip incompatible-field test Plan 07b Task 1.1"
```

### Task 26: C-LOW07b.5 — Eyedropper EYEDROPPER_NATIVE_TAURI feature flag in Plan 07b Tasks 2.1-2.2

- [ ] **Step 26.1: Edit Plan 07b Task 2.1 or 2.2 (lines 847, 897)**

Append:
```markdown
**Feature flag: EYEDROPPER_NATIVE_TAURI (C-LOW07b.5)**

Default: `false` (MVP — uses canvas-extension fallback per PRD 07b).
Phase 2: `true` when macOS Tauri build ships native screen-color sampling.

```ts
// src/config/feature-flags.ts (or import.meta.env)
export const EYEDROPPER_NATIVE_TAURI = import.meta.env.VITE_EYEDROPPER_NATIVE_TAURI === 'true'

// useEyedropper.ts
if (EYEDROPPER_NATIVE_TAURI && isTauri()) {
  return invokeTauriEyedropper()
}
return canvasExtensionFallback()
```

Add to `.env.example`:
```
# Cluster 07b — set true once macOS Tauri eyedropper IPC ships (Phase 2)
VITE_EYEDROPPER_NATIVE_TAURI=false
```
```

- [ ] **Step 26.2: Commit**

```sh
git add docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md
git commit -m "fix(qa-w3-c07b): C-LOW07b.5 add EYEDROPPER_NATIVE_TAURI feature flag Plan 07b Task 2.x"
```

---

## Cluster 08 — 5 findings

### Task 27: CT-006(c) — Remove Command-K palette residual at PRD 08:100

**Status:** Cross-cut row at PRD 08:100 still lists `Command-K palette` in Cluster 11 dependencies.

- [ ] **Step 27.1: Edit PRD 08 line 100**

Remove `+ Command-K palette` from the cross-cut row. Keep other Cluster 11 primitives (Toast, KovaModal, skeletons, error pages, offline indicator).

- [ ] **Step 27.2: Re-grep**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "Command-K palette|Cmd\+K palette" docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md
```
Expected: 0 hits. (Note: `(⇧⌘K)` at line 40 is Place Image shortcut, not palette — KEEP.)

- [ ] **Step 27.3: Commit**

```sh
git add docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md
git commit -m "fix(qa-w3-c08): CT-006c drop Command-K palette residual PRD 08:100"
```

### Task 28: C-MED20 — Convert Plan 08 phase-table format to full TDD per task

**Status:** Plan 08 (435 lines) uses concise phase-table format (Phase 1/2/3/etc with one-line task rows). Compared to Plan 06 (2038 lines) / Plan 07a (3197) / Plan 07b (4470), Plan 08 is under-spec'd. Need to convert each phase row into 3-5 TDD tasks (RED → GREEN → COMMIT).

This is the LARGEST single edit. Approach:
1. Keep existing phase headings as anchors.
2. Below each phase, replace one-line rows with explicit sub-tasks following Phase 1.1 / 1.2 / etc. numbering already in use.
3. Each sub-task gets Files / RED / GREEN / Commit steps.

- [ ] **Step 28.1: Map current phase rows to expanded tasks**

For each phase (1-9), enumerate sub-tasks. Phases 1-2 already have sub-numbering (1.1, 1.2, etc.); expand each into TDD steps. Phases 3-7 need both sub-numbering AND TDD steps.

- [ ] **Step 28.2: Edit Plan 08 — expand inline**

Convert each existing one-line row into a TDD-shaped task section. Preserve task IDs (1.1, 1.2, ..., 3.1, etc.) so Task 22 split is consistent with renumbering.

- [ ] **Step 28.3: Verify Plan 08 line count expanded meaningfully (target ≥ 1500 lines for comparable TDD density)**

```sh
cd /Users/jihoyang/kova-w3-canvas && wc -l docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
```

- [ ] **Step 28.4: Commit**

```sh
git add docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
git commit -m "fix(qa-w3-c08): C-MED20 convert Plan 08 phase-table → full TDD per task"
```

### Task 29: C-MED21 — Split use-keyboard.ts refactor (Task 2.6) into 5 sub-tasks

**Status:** Plan 08 Task 2.6 (line 110) is the highest-risk refactor compressed into one task. Split per shortcut category.

- [ ] **Step 29.1: Edit Plan 08 Task 2.6 — replace with 5 sub-tasks**

Replace `### 2.6 use-keyboard.ts REFACTOR (highest risk)` with:
- `### 2.6a Dashboard shortcuts (Cmd+N new design, Cmd+B brand switcher, Cmd+/ help, etc.)`
- `### 2.6b Canvas shortcuts (V move, R rect, O ellipse, T text, F frame, P pen, S slice, Shift+M measurement, etc.)`
- `### 2.6c Chat shortcuts (Cmd+Enter send, Esc cancel, Up arrow recall, etc.)`
- `### 2.6d Global shortcuts (Cmd+, settings, Cmd+/ shortcuts dialog, Cmd+K dropped per W0-7, etc.)`
- `### 2.6e Modifier handling (e.code correctness, Mac Option key transforms, layout-independent capture)`

Each sub-task: Files / RED test for that category / GREEN impl extracted from monolithic refactor / Commit.

- [ ] **Step 29.2: Commit**

```sh
git add docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
git commit -m "fix(qa-w3-c08): C-MED21 split use-keyboard.ts refactor into 5 sub-tasks 2.6a-e"
```

### Task 30: C-LOW08.6 — Cite schema-seed file path + migration ID in Plan 08 Task 7.7c

- [ ] **Step 30.1: Locate Plan 08 Task 7.7c**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "7\.7c|users\.preferences\.view" docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
```

- [ ] **Step 30.2: Edit Plan 08 — replace bare reference with explicit cite**

Replace the vague reference with:
```markdown
**Cluster 12 schema dep (C-LOW08.6):** `users.preferences.view.*` keys (snap-to-grid, snap-to-objects, pixelGrid, layoutGuides, rulers, recentColors) seeded by Cluster 12 — see `docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md` Task <N> (usePreferencesStore schema definition) + migration `supabase/migrations/<YYYYMMDDHHMMSS>_users_preferences_view.sql`. Cluster 08 reads via `usePreferencesStore.prefs.view.*`; never writes the schema directly.
```

(Fill in `<N>` + migration ID from actual Plan 12 contents at time of edit.)

- [ ] **Step 30.3: Commit**

```sh
git add docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
git commit -m "fix(qa-w3-c08): C-LOW08.6 cite Plan 12 schema seed + migration ID Plan 08 Task 7.7c"
```

### Task 31: CT-022 (08 side) — Strip remaining FindOverlay residuals from Plan 08 file inventory

**Status:** Plan 08 Phase 5 + Task 1.3 dropped (W0-2). Residuals remain in file inventory at lines 351 (`overlay/FindOverlay.vue`), 389 (`tests/components/overlay/FindOverlay.test.ts`), 406 (main.ts `mount FindOverlay`). Strip all three; SearchPanel mount + tests live in Plan 07b.

- [ ] **Step 31.1: Edit Plan 08 — remove FindOverlay file inventory rows**

- Delete line 351 region: `kova-open-pencil-1/src/components/overlay/` block (and `FindOverlay.vue` entry).
- Delete line 389: `FindOverlay.test.ts` entry (and parent `tests/components/overlay/` block if it becomes empty).
- Delete line 406: change `# mount FindOverlay + KeyboardShortcutsDialog + register shortcuts at boot` → `# mount KeyboardShortcutsDialog + register shortcuts at boot (FindOverlay/SearchPanel mounted by Cluster 07b Task 4.14)`.
- Delete `tests/e2e/find-overlay.spec.ts` entry from line 389-ish E2E listing (07b owns find E2E).

- [ ] **Step 31.2: Re-grep**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -nE "FindOverlay|find-overlay" docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
```
Expected: 0 hits, OR only as explicit "DROPPED — owned by 07b" cross-ref comments.

- [ ] **Step 31.3: Commit**

```sh
git add docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md
git commit -m "fix(qa-w3-c08): CT-022 strip FindOverlay residuals from Plan 08 file inventory (W0-2)"
```

---

## Final steps

### Task 32: Quality gates (within docs scope — markdown only)

Since edits are docs-only, no code quality gates apply. Verify:

- [ ] **Step 32.1: No accidental code edits**

```sh
cd /Users/jihoyang/kova-w3-canvas && git diff feat/m9-shopify..fix/qa-w3-canvas-bundle --stat | grep -vE "\.md$|VERIFY-W3" || echo "clean — markdown only"
```
Expected: "clean — markdown only" OR empty diff outside .md files.

- [ ] **Step 32.2: No forbidden patterns introduced**

```sh
cd /Users/jihoyang/kova-w3-canvas && grep -rnE "Math\.random|as any|i-lucide-|Command-K palette|/dashboard\?brandId" docs/kova-final-prds/0[678]*.md docs/kova-final-impl-plans/0[678]*.md | grep -v VERIFY-W3 | head -20
```
Expected: 0 forbidden hits (or only `as any` in narrative discussing the lint rule).

- [ ] **Step 32.3: Commit count check**

```sh
cd /Users/jihoyang/kova-w3-canvas && git log --oneline feat/m9-shopify..fix/qa-w3-canvas-bundle | wc -l
```
Expected: ≥ 31 (one per finding) + 1 (audit log scaffold) + 1 (this gates commit) = ≥ 33.

### Task 33: Push branch + produce report

- [ ] **Step 33.1: Push**

```sh
cd /Users/jihoyang/kova-w3-canvas && git push -u origin fix/qa-w3-canvas-bundle
```

- [ ] **Step 33.2: Produce per-cluster report following dispatch output template (31 findings closed breakdown).**

---

## Self-review

- **Spec coverage:** All 31 findings mapped to Tasks 1-31. Cluster 06 (Tasks 1-11), 07a (12-17), 07b (18-26), 08 (27-31).
- **Placeholders:** Task 28 (C-MED20 Plan 08 expansion) does not enumerate all sub-tasks — this is intentional because the existing phase-table contents drive the expansion. Engineer must read Plan 08 phase rows + expand each. Task 20 (B-HIGH 07b icon sweep) is conditional on grep finding hits.
- **Type consistency:** All commit message prefixes use `fix(qa-w3-c<NN>):` form. Audit log column schema fixed.
- **Cross-finding:** Tasks 22 + 28 + 29 all touch task numbering across Plans 07b + 08. Execute 22 → 28 → 29 in order to avoid renumbering collisions.
