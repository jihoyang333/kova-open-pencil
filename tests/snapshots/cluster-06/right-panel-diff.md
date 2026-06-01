# right-panel — visual-diff

**Mockup:** `compressed-figma-canvas-ui/layers-panel-left-and-inspector-panel-right-1.png` (right half crop).
**Impl:** `[data-testid="right-panel"]` at `/dev/cluster-06`.
**Spec test:** `tests/visual-diff/cluster-06/chrome.visual.spec.ts → right-panel — Vue impl`.

## Property checklist

| Property | Mockup spec | Impl value | Source | Status |
|---|---|---|---|---|
| width | `264px` | `w-[264px]` | `RightPanel.vue:30` | ✅ |
| background | `var(--bg-rail)` | `bg-rail` | `RightPanel.vue:30` | ✅ |
| border-left | `1px solid var(--line)` | `border-l border-line` | `RightPanel.vue:30` | ✅ |
| tabs strip | Design + AI (2-tab framework) | `<RightPanelTabs>` | `RightPanel.vue:33-37` | ✅ |
| AI default-tab (§12.13) | active on first mount | `right-panel.ts:37 activeTab = ref('ai')` | ✅ |
| sticky tab (§12.14) | layer click does NOT switch tab | comment + regression test | `right-panel.ts:66`, `RightPanelTabs.test.ts:62-79` | ✅ |
| design body | FrameHead + InspectorRouter | rendered when `!isAi` | `RightPanel.vue:41-44` | ✅ |
| ai body | RightPanelAiSlot | rendered when `isAi` | `RightPanel.vue:38-40` | ✅ |
| zoom label | `${Math.round(zoom * 100)}%` slot | rendered | `RightPanel.vue:34-36` | ✅ |

## Regression coverage

- Unit: `RightPanelTabs.test.ts` (5), `right-panel.test.ts` (9) — pass in
  isolation. Suite-level pollution per W10 audit §1 — non-blocking.
- Visual: `right-panel-impl.png` baseline (this dir, after `--update-snapshots`).

## Variants (deferred to T14)

- right-panel rectangle-selected (3 variants) — needs `useEditorStore.selection`
  populated.
- right-panel text-selected — needs `text` node selection.
- These mount only after engine state lands in `/dev/cluster-06` (T14 sweep).
