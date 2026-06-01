# bottom-toolbar — visual-diff

**Mockup:** `compressed-figma-canvas-ui/bottom-toolbar-1.png` (default state).
**Impl:** `[data-testid="bottom-toolbar"]` at `/dev/cluster-06`.
**Spec test:** `tests/visual-diff/cluster-06/chrome.visual.spec.ts → bottom-toolbar — Vue impl`.

## Property checklist

| Property | Mockup spec | Impl value | Source | Status |
|---|---|---|---|---|
| anchor | `absolute left-1/2 -translate-x-1/2 bottom: var(--toolbar-bottom)` | matches | `BottomToolbar.vue:54-59` | ✅ |
| height | `var(--h-tool)` (36px) per tool | `<ToolButton>` h-tool | tokens-used.md | ✅ |
| shell radius | `var(--r-2xl)` (10px) | `rounded-[var(--r-2xl)]` | `BottomToolbar.vue:55` | ✅ |
| shell bg | `var(--bg-page)` | `bg-page` | `BottomToolbar.vue:55` | ✅ |
| shell border | `1px solid var(--line)` | `border border-line` | `BottomToolbar.vue:55` | ✅ |
| shell shadow | `var(--shadow-toolbar)` | `shadow-toolbar` | `BottomToolbar.vue:55` | ✅ |
| tool gap | `var(--toolbar-gap)` | `gap-[var(--toolbar-gap)]` | `BottomToolbar.vue:55` | ✅ |
| tool padding (shell) | `var(--toolbar-pad)` | `p-[var(--toolbar-pad)]` | `BottomToolbar.vue:55` | ✅ |
| primary tools | move/frame/rect/ellipse/pen/text/(measurement)/ai/components | `registry.primaryTools` slot order | `tool-registry.ts:18-28` | ✅ |
| divider | between text/measurement and ai | `w-px bg-line-2 mx-[var(--toolbar-divider-x)]` | `BottomToolbar.vue:80-85` | ✅ |
| AI slot | distinct hover | `<AiToolButton>` | `BottomToolbar.vue:87` | ✅ |
| ARIA | `role="toolbar" aria-label="Drawing tools"` | matches | `BottomToolbar.vue:56-57` | ✅ |

## Regression coverage

- Unit: `BottomToolbar.test.ts` (7 in isolation — pass) + `tool-registry.test.ts` (13).
- Visual: `bottom-toolbar-impl.png` baseline (this dir, after `--update-snapshots`).

## Variants (deferred to T14)

The 4 active-state variants (move active / frame active / rectangle active /
text active) need `editor.state.activeTool` toggling. Static baseline ships
now (default state = move active). Remaining 3 variants land with T14.
