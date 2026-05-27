# Cluster 06 — Canvas Editor Core Chrome — Phase 1 KOVA_AUDIT

> **Phase 1 gate per `claude-design-files/IMPLEMENTATION_PROMPT.md` §3.**
> Produced BEFORE any Vue UI code for Cluster 06.
> Authoritative method: 3-rule fidelity contract (values copied, DOM
> translated to Vue/Reka/K\* primitives, behavior engineered).

**Status:** AUTO-APPROVED 2026-05-27. No ⚠️ MISSING tokens; no founder
decision required. All hi-fi values resolve via TOKEN_CANONICAL.md.

## 0. Sources of truth

| Source | Path | Authority |
|---|---|---|
| Canvas-chrome hi-fi | `design-system/hifi/canvas-chrome/Kova Canvas - Final.html` | Visual values (Rule 1) |
| Top-chrome menus hi-fi | `design-system/hifi/canvas-chrome/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` | Menu surfaces |
| Canvas overlays hi-fi | `design-system/hifi/canvas-chrome/Kova Hi-Fi 09 Canvas Overlays - Dark.html` | Overlay surfaces (Cluster 07b consumes) |
| Token canonical | `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` | Naming resolver |
| Token implementation | `main-main-kova-scope/design-system/kova-hifi.css :root` | CSS custom property values |
| Tailwind theme | `src/app.css @theme` | Utility class binding |
| Design rider | `docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md` | Hard rules |
| PRD | `docs/kova-final-prds/06-canvas-editor-core-chrome.md` | Acceptance criteria |
| Plan | `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md` | Task-by-task |

## 1. Surface inventory (from PRD §3 + Plan §"Hi-fi → Plan surface mapping")

| Surface | Hi-fi file | Line range | Owning Vue component | Cluster 06 task |
|---|---|---|---|---|
| Editor root grid (`.kc`) | Canvas Final | 75-98 | `EditorView.vue` (REFACTOR) | T14 |
| Topbar (`.topbar`, 44px) | Canvas Final | 100-141 | `TopChrome.vue` | T9 |
| Logo (24×24 K-monogram) | Canvas Final | 109-116 | `TopChromeLogo.vue` | T9 |
| File breadcrumb + brand pill + caret | Canvas Final | 117-127 | `FileBreadcrumb.vue` | T9 |
| Topbar right actions (icon-btn 28×28 + avatar 26×26) | Canvas Final | 130-141 | `TopChromeActions.vue`, `AvatarDropdown.vue` | T9 |
| Left panel (240px) | Canvas Final | 147-216 | `LeftPanel.vue` | T11 |
| File-row (14px pad, 30×30 icon) | Canvas Final | 155-167 | `FileRow.vue` | T11 |
| Pages section (`.sec` + `.pages` + `.page-row`) | Canvas Final | 168-186 | `PagesPanel.vue` (existing — verify) | T11 |
| Layers tree (28px row, indent 24/40, mask + vis + selected) | Canvas Final | 187-216 | `LayersPanel.vue` (EXTEND), `LayerRow.vue` | T11 |
| Center canvas + grid | Canvas Final | 218-228 | `CanvasSurface.vue` (existing M5) | T16 |
| Frame outlines + handles + size-chip | Canvas Final | 229-274 | `CanvasOverlayHost.vue` (slot for 07b) | T16 |
| Bottom toolbar (floating pill, 36×36 tools) | Canvas Final | 276-309 | `BottomToolbar.vue`, `ToolButton.vue`, `ToolDropdown.vue`, `AiToolButton.vue` | T10 |
| Zoom HUD (bottom-right) | Canvas Final | 311-325 | `ZoomHud.vue` | T16 |
| Right panel (264px) | Canvas Final | 327-336 | `RightPanel.vue` | T15 |
| Right-panel tabs (Design + AI) | Canvas Final | 337-359 | `RightPanelTabs.vue` | T15 |
| Frame-head | Canvas Final | 361-378 | `FrameHead.vue` | T15 |
| Property groups (Cluster 07b owns sections) | Canvas Final | 380-461 | `InspectorRouter.vue` (slots into 07b) | T15 |
| AI tab slot (Cluster 10 owns ChatPanel) | n/a | n/a | `RightPanelAiSlot.vue` | T15 |
| Floating help FAB (Phase 2 disabled) | Canvas Final | 494-502 | `MissingFontsPill.vue` reuses position | T9 |
| Top-chrome menus (logo / file-caret / avatar) | Hi-Fi 08 Top Chrome Menus | full file | Cluster 08 mounts; Cluster 06 wires anchors | T9 |

## 2. 3-rule fidelity contract

1. **Visual values copied** — every color/spacing/type/radius/shadow/gap
   in this cluster's surfaces is extracted in `tokens-used.md` and traces
   to either a canonical token or a hi-fi-only literal flagged `⚠️
   MISSING` for founder decision.
2. **DOM structure translated** — Vue 3 SFCs, Reka UI primitives (Tabs,
   DropdownMenu, Popover, Tooltip), Cluster 11 primitives (KovaIcon,
   KovaMenu, KovaPopover, KovaTooltip, KovaModal, KovaToast,
   KovaSkeleton, ToastStack). Hand-rolled HTML in the mockup is REBUILT
   in Vue idioms — never copied verbatim.
3. **Behavior engineered** — state in Pinia (`useEditorStore`,
   `useRightPanelStore`, `useToolRegistry`, `useLeftPanelStore`,
   `useTabsStore`, `useBrandsStore`, `useCanvasesStore`) and composables
   (`useLayerTree`, `useInspectorRouter`, `useRightPanelTab`,
   `useCanvasDrop`, `usePageOperations`). Hover/focus/active/selected/
   disabled states are dynamic class bindings.

## 3. Cluster 11 primitives in use

| Primitive | Used by | Hi-fi source |
|---|---|---|
| `<KovaIcon>` | every icon (toolbar tools, layer row glyphs, topbar icons) | Canvas Final lucide refs |
| `<KovaMenu>` | logo dropdown, file-name caret, avatar dropdown, tool dropdown chevrons | Hi-Fi 08 Top Chrome Menus |
| `<KovaPopover>` | zoom popover (Cluster 08 mounts), fill swatch picker (Cluster 07b) | — |
| `<KovaTooltip>` | every icon-only button (per Rider §2.4) | — |
| `<KovaToast>` + `<ToastStack>` | canvas-side toast variant + global toasts | Hi-Fi 16 Toasts |
| `<KovaSkeleton>` | Layer tree loading state | Canvas Final empty-row pattern |
| `<EmptyState>` | "No layers yet" | `10 Left Panel` scene 10.1 |

## 4. Pre-flight verifications

- ✅ kova-hifi.css `:root` reachable + Tailwind `@theme` mirrors short-name tokens with `--color-*` prefix.
- ✅ Reka UI v2.9.0 installed.
- ✅ KovaIcon registry contains all toolbar icons (added in T4: mouse-pointer-2, frame, square, circle, pen-tool, type, component; existing: crop, ruler, sparkles).
- ✅ Existing M5 `CanvasSurface`, `EditorView`, `LayersPanel`, `PagesPanel` (sidebar), `ShopPanel`, `ShopPanelProducts`, `ChatPopup`, `ShopBuildPrompt` known — refactor targets per T14 + T11 + T12.
- ✅ TOKEN_CANONICAL.md resolves the three-vocabulary token naming drift between Final.html `.kc {}` scoped names, kova-hifi.css `:root` short names, and design.md `--color-*` long names.

## 5. Hard rules reaffirmed

- ❌ No `<style>` blocks in Vue SFCs.
- ❌ No raw hex literals in Vue (use Tailwind `bg-*` / `text-*` / `border-*` utilities backed by `@theme`).
- ❌ No raw px literals in template `class=""` (use Tailwind spacing scale; arbitrary `[24px]` allowed only when scale lacks the value, justified in inline comment).
- ❌ No `<icon-lucide-*>` / `i-lucide-*` / `<Icon name="lucide:...">` / template-literal icon resolution.
- ❌ No `Math.random()` — `crypto.getRandomValues()`.
- ❌ No `e.key` for shortcut handlers — `e.code` per Mac Option-transform.
- ❌ No `<ChatPopup>` after T14 (REMOVED per PRD 10 §5 RIP).
- ❌ No Prototype tab in right panel (founder ratification 2026-05-15).
- ❌ No Comments icon in topbar (PRD §12.3 ratification 2026-05-17).
- ❌ No copy-DOM-verbatim — Rule 2 translation only.

## 6. Drift protocol

If any value in `tokens-used.md` resolves to ⚠️ MISSING, Cluster 06 STOPS UI
work and asks founder via `AskUserQuestion`. Three options per Rider §2.1:
(a) extend `kova-hifi.css :root`, (b) update hi-fi HTML, (c) keep literal
with `/* token-exempt: <justification> */`. Currently zero MISSING (see
`tokens-used.md` §3).

— End KOVA_AUDIT —
