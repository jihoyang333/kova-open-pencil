# left-panel — visual-diff

**Mockup:** `compressed-figma-canvas-ui/layers-panel-left-and-inspector-panel-right-1.png` (left half crop).
**Impl:** `[data-testid="left-panel"]` at `/dev/cluster-06`.
**Spec test:** `tests/visual-diff/cluster-06/chrome.visual.spec.ts → left-panel — Vue impl`.

## Property checklist

| Property | Mockup spec | Impl value | Source | Status |
|---|---|---|---|---|
| width | `240px` | `w-[240px]` | `LeftPanel.vue:67` | ✅ |
| background | `var(--bg-rail)` | `bg-rail` | `LeftPanel.vue:67` | ✅ |
| border-right | `1px solid var(--line)` | `border-r border-line` | `LeftPanel.vue:67` | ✅ |
| 3-section stack (§12.1) | Pages / Layers / Shop | `<CollapsibleRoot>` × 3 | `LeftPanel.vue:72-130` | ✅ |
| section header | `pt-14 px-14 pb-1.5`, uppercase, `text-[11px]` | matches | `LeftPanel.vue:74,97,113` | ✅ |
| pages count badge | `var(--ink-3)` | `text-ink-3` (via inheritance) | `LeftPanel.vue:79` | ✅ |
| layers count badge | `var(--ink-3)` | inheritance | `LeftPanel.vue:101` | ✅ |
| shop default-collapsed (no shopify) | empty-state CTA | rendered | `LeftPanel.vue:121-127` | ✅ |
| shop divider | `border-t border-line-2` | `border-t border-line-2` | `LeftPanel.vue:110` | ✅ |

## Regression coverage

- Unit: no dedicated `LeftPanel.test.ts` (Task 11 tests deferred per DONE).
- Visual: `left-panel-impl.png` baseline (this dir, after `--update-snapshots`).
