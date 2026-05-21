# Kova Scope — Design System

**Source of truth.** Every surface in the product follows the rules in this document. If a design contradicts this doc, the doc wins; if the doc is missing a rule a design needs, update the doc first.

This system is dark-mode. Calm, dense, confident, neutral. One accent color does all the talking. Inter does all the typesetting. Hairlines, not borders. Restraint over decoration.

---

## 0. How to use this document

The system is layered. Read top to bottom:

1. **Foundations** — raw values. Hex, px, ms. Never reference these directly in a component.
2. **Semantic tokens** — named CSS custom properties that map foundations to meaning (`--color-surface-panel`, `--color-accent`). **Components reference these, never the raw values.**
3. **Components** — proven patterns from the canvas page. Reuse these before inventing.
4. **Density & rhythm** — height, padding, gap rules.
5. **Bans** — non-negotiable nopes.
6. **Extending the system** — rules for adding things we haven't designed yet.

Tokens are written as CSS custom properties because everything we ship is HTML/CSS. Drop the `:root` block from §2 into any new file and the system comes with it.

---

## 1. Foundations

### 1.1 Color — raw palette

Neutrals (warm-cool dark, very low chroma):

| Token         | Hex       | Notes                          |
| ------------- | --------- | ------------------------------ |
| `--n-950`     | `#1a1a1d` | Deepest. Side panels, top bar. |
| `--n-900`     | `#242428` | Canvas plate (one step up).    |
| `--n-850`     | `#26262b` | Input fill, idle.              |
| `--n-800`     | `#303035` | Input fill, active/segmented.  |
| `--n-750`     | `#2c2c30` | Hairline borders, dividers.    |
| `--n-700`     | `#232327` | Section dividers (softer).     |
| `--n-100`     | `#ebebee` | Primary text.                  |
| `--n-300`     | `#a8a8ad` | Secondary text.                |
| `--n-500`     | `#6e6e73` | Tertiary text, labels.         |
| `--n-600`     | `#4a4a4f` | Disabled / icon dim.           |

Accent (single, no alternates):

| Token         | Hex       | Notes                                        |
| ------------- | --------- | -------------------------------------------- |
| `--a-500`     | `#3b82f6` | The accent. Selection, active tool, outline. |
| `--a-500-16`  | `rgba(59,130,246,0.16)` | Selected-row tint.                |
| `--a-500-14`  | `rgba(59,130,246,0.14)` | Soft accent surface.              |
| `--a-200`     | `#a9c4ff` | "AI" tool ink (Ask Kova).                    |

There is exactly one accent. No purple, no green, no gradient pairs. Status colors (error/warn/success) are deferred until a surface needs them — when that happens, add them here, do not invent locally.

### 1.2 Typography — type scale

**Family:** Inter. 400 / 500 / 600 / 700. That's it. No display face, no monospace on chrome (see Bans §5).

**Scale** — every type rule in the system uses one of these. Don't invent sizes.

| Token            | Size / line-height / weight / tracking | Use                                         |
| ---------------- | -------------------------------------- | ------------------------------------------- |
| `--t-overline`   | 11 / 1.2 / 500 / +0.04em / UPPER       | Section headers in side panels (PAGES, LAYERS). |
| `--t-label`      | 12 / 1.3 / 500 / -0.003em              | Sub-section labels above inputs.            |
| `--t-body`       | 12.5 / 1.35 / 400 / 0                  | Input values, list rows, generic body.      |
| `--t-body-strong`| 12.5 / 1.35 / 500 / 0                  | Active list rows, tab labels.               |
| `--t-title-sm`   | 13 / 1.3 / 600 / -0.005em              | Group titles (Position, Layout, Fill...).   |
| `--t-title-md`   | 15 / 1.3 / 600 / -0.005em              | Panel header (Frame).                       |
| `--t-meta`       | 11.5 / 1.3 / 400 / 0                   | Metadata under file row.                    |

**Antialiasing:** `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` always.

**No italics. No underlines.** Links inherit color or use accent.

### 1.3 Spacing — 2px base, prefer 4px steps

Scale: `2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32`.

`4` and `6` are the workhorses inside controls. `12` and `14` for component padding. `16+` for section breathing room. Never use raw values outside this scale.

### 1.4 Radii

| Token         | Radius | Use                                         |
| ------------- | ------ | ------------------------------------------- |
| `--r-xs`      | `3px`  | Swatches, micro chips.                      |
| `--r-sm`      | `4px`  | Inner pill on segmented control.            |
| `--r-md`      | `5px`  | Inputs, fill rows, tab pill, icon buttons.  |
| `--r-lg`      | `6px`  | Toolbar tools, layer rows, frame edge.      |
| `--r-xl`      | `7px`  | Page-row pill, file-icon tile.              |
| `--r-2xl`     | `10px` | Toolbar shell, zoom HUD, **modal shell**.   |
| `--r-pill`    | `999px`| Avatars, FABs.                              |

**Added 2026-05-20 (Cluster 11 W6 REDO):**

| Token | Radius | Use |
|---|---|---|
| `--r-overlay` | `8px` | Popover, DropdownMenu, empty-pane panel outer, scene-card outer |

Cards, panels, and full-bleed surfaces are **not rounded**. Edges are flat, divided by hairlines. Floating overlays use `--r-overlay` (8px) or `--r-2xl` (10px for modal).

### 1.5 Borders / hairlines

All borders are **1px solid**. Two roles:

- `--n-750` — structural divider (panel-to-canvas, between groups in the inspector).
- `--n-700` — softer divider (within a panel, between sub-sections).

Never use 2px borders for chrome. The accent ring on a selected frame is the **one exception**: 2px solid `--a-500`, no offset.

### 1.6 Elevation

**Updated 2026-05-20 (Cluster 11 W6 REDO):** elevation tokens committed. Hi-fi `.toast / .dlg / .popover / .menu` each use a distinct stack — codified here.

| Token | Value | Use |
|---|---|---|
| `--shadow-elev-1` | `0 8px 24px -6px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset` | Toast, toolbar, zoom HUD (canonical "Floating") |
| `--shadow-elev-2` | `0 16px 60px -20px rgba(0,0,0,0.7)` | Popover, tooltip |
| `--shadow-elev-2-menu` | `0 24px 60px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)` | DropdownMenu |
| `--shadow-elev-3` | `0 24px 80px -20px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.03) inset` | Modal |
| `--shadow-elev-page` | `0 30px 80px -20px rgba(0,0,0,0.8)` | Hi-fi mockup chrome (the screen frame) |

No drop shadows on inputs, cards, or rows (Ban 7). Elevation only on floating elements.

### 1.7 Motion

**Updated 2026-05-20 (Cluster 11 W6 REDO):** motion scale committed. Tokens in `kova-hifi.css :root`:

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | `100ms` | Button + input border / background transitions |
| `--motion-normal` | `200ms` | Reka entry / exit (modal, popover, menu) |
| `--motion-slow` | `300ms` | Reserved for larger entries |
| `--motion-skeleton` | `1400ms` | Skeleton shimmer (the ONLY gradient in the system — Ban 5 exception) |
| `--motion-toast-enter` | `200ms` | Toast pop in |
| `--motion-toast-exit` | `150ms` | Toast fade out |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | default entries |
| `--ease-in-out` | `ease-in-out` | skeleton shimmer |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | exits |

`prefers-reduced-motion: reduce` → skeleton falls back to static `var(--fill-2)`; no animation. Other motion-bearing primitives respect the media query (Vue composable `useReducedMotion()`).

### 1.8 Z-scale

**Added 2026-05-20 (Cluster 11 W6 REDO).** Single layered scale across the whole app. No ad-hoc `z-index` in components.

| Token | Value | Layer |
|---|---|---|
| `--z-base` | `0` | normal flow |
| `--z-popover` | `10` | Popover (Reka Popover, brand switcher, avatar dropdown) |
| `--z-dropdown` | `12` | DropdownMenu + Tooltip |
| `--z-modal-backdrop` | `19` | Modal backdrop |
| `--z-modal` | `20` | Modal content (Reka Dialog content) |
| `--z-toast` | `30` | Toast stack (always above modal per PRD 11 §3.1) |

---

## 2. Semantic tokens

Drop this `:root` block into any stylesheet. Components only reference these names.

```css
:root {
  /* Surfaces */
  --color-bg:                #1a1a1d;   /* page + panels */
  --color-surface-panel:     #1a1a1d;   /* left/right rails, top bar */
  --color-surface-canvas:    #242428;   /* the canvas plate */
  --color-surface-input:     #26262b;   /* input idle */
  --color-surface-input-hi:  #303035;   /* input active / segmented active */
  --color-surface-floating:  #1a1a1d;   /* toolbar, zoom HUD */

  /* Lines */
  --color-line:              #2c2c30;   /* structural hairline */
  --color-line-soft:         #232327;   /* in-panel hairline */

  /* Ink */
  --color-ink:               #ebebee;   /* primary text */
  --color-ink-2:             #a8a8ad;   /* secondary text */
  --color-ink-3:             #6e6e73;   /* labels, tertiary */
  --color-ink-4:             #4a4a4f;   /* disabled / dim */

  /* Accent — exactly one */
  --color-accent:            #3b82f6;
  --color-accent-soft:       rgba(59,130,246,0.14);
  --color-accent-selected:   rgba(59,130,246,0.16);
  --color-accent-ai:         #a9c4ff;

  /* Selection mirrors accent — they are the same idea */
  --color-select:            var(--color-accent);
  --color-select-soft:       var(--color-accent-selected);

  /* Type */
  --font-sans:  'Inter', system-ui, -apple-system, sans-serif;

  /* Radii */
  --r-xs: 3px;  --r-sm: 4px;  --r-md: 5px;  --r-lg: 6px;
  --r-xl: 7px;  --r-2xl: 10px; --r-pill: 999px;

  /* Density */
  --h-control: 30px;        /* default input height */
  --h-control-sm: 28px;     /* compact rows (layer rows, page rows) */
  --h-control-xs: 26px;     /* segmented inner */
  --h-tool: 36px;           /* toolbar tool */
  --h-icon-btn: 28px;       /* topbar icon button */

  /* Page chrome */
  --h-topbar: 44px;
  --h-tabs:   44px;
}
```

**Rule:** if a component needs a value that isn't here, add it as a semantic token first, then use it. No raw hex in component CSS.

---

## 3. Components

Every component below is proven on the canvas page. Reuse these names and patterns first.

### 3.1 Top bar

- Height: `--h-topbar` (44px).
- Background: `--color-surface-panel`. Bottom border: `--color-line`.
- Padding: `0 12px`. Content split left/right with `gap: 12px`.
- Logo: 24×24, `--r-lg`, ink-on-bg (white square holding bg-colored "K").
- Crumb: secondary ink for non-current segments, primary ink + 600 weight for the current.
- Icon buttons: 28×28, `--r-md`, ink-2 idle → ink on hover with `--color-line-soft` background.
- Avatar: 26×26 pill, customer brand color (sample data only — never hardcode in our chrome).

### 3.2 Side panels (left / right)

- Width: 240px (left), 264px (right). Width is fixed; content scrolls.
- Background: `--color-surface-panel`.
- Outer hairline: `--color-line`. Inner dividers: `--color-line-soft`.
- Vertical scroll lives inside the body region only — header rows stay pinned.

### 3.3 Section header (in-panel)

- Type: `--t-overline` (11 / 500 / +0.04em / UPPER).
- Color: `--color-ink-3`.
- Padding: `14px 14px 6px`.
- Optional `+` action on the right, 20×20 ghost.

### 3.4 List row — layers, pages

- Height: `--h-control-sm` (28px). Padding: `5px 8px`. Gap: `7px`.
- Type: `--t-body` (12.5px).
- Idle: `--color-ink-2`.
- Hover: background `--color-line-soft`, color `--color-ink`.
- **Selected: background `--color-select-soft`, color `--color-ink`.** No left-border accent — never.
- Indent: `padding-left: 24px` per level.
- Trailing icons (visibility, mask): `--color-ink-3`, hidden until hover/selected.
- Disabled rows: `--color-ink-4`.

### 3.5 Tabs (single-row)

- Idle tab: `--color-ink-3`, no chrome.
- **Active tab: pill-style.** Background `--color-surface-input`, color `--color-ink`, padding `4px 10px`, `--r-md`. We do NOT use the underlined tab pattern.
- Used in the right panel. "Design" only — `Prototype` is not part of the system.

### 3.6 Property group

The right-panel pattern. Every group descends below the previous one.

- Padding: `14px 14px 16px`. Bottom hairline `--color-line-soft` (last group: none).
- Header row: title (`--t-title-sm`, `--color-ink`) + actions (24×24 ghost squares, `--r-md`, `--color-ink-2`). Margin-bottom 12px.
- **Sub-sections** stack vertically with 12px spacing. Each has:
  - Optional label row: `--t-label` in `--color-ink-2`, margin-bottom 6px.
  - Control row(s) — usually `row-2` (1fr 1fr), `row-3`, or a `seg-pair`.

**Properties stack top-to-bottom. We never put properties side-by-side as a horizontal scroll.**

### 3.7 Input (text / numeric)

- Height: `--h-control` (30px). Padding: `0 9px`. Gap: `6px`.
- Background: `--color-surface-input`. Border: `1px solid transparent`.
- Hover: border `--color-line`.
- Type: value uses `--t-body` in `--color-ink`. Label/unit use `--t-label` in `--color-ink-3`.
- **All input text is Inter. Never monospace.**

### 3.8 Segmented control

- Container: `--color-surface-input`, `--r-md`, padding `2px`, `gap: 1px`.
- Cell: 26×26, `--r-sm`, `--color-ink-3` idle.
- Active cell: background `--color-surface-input-hi`, color `--color-ink`.
- Hover (idle cell): `--color-ink-2`.
- Used for alignment, flow, flip. Two segmented controls side-by-side use `seg-pair` (1fr 1fr, gap 6px).

### 3.9 Fill row

- Height: `--h-control` (30px). Background: `--color-surface-input`. `--r-md`. Padding: `0 6px`.
- Grid: `swatch | hex (1fr) | percent | eye | minus`, `gap: 4px`.
- Swatch: 18×18, `--r-xs`, 1px `--color-line`.
- Percent column has a left hairline divider in `--color-line-soft`.
- Trailing icons: 20×20, `--color-ink-3`, ghost; `--color-surface-input-hi` on hover.

### 3.10 Checkbox row

- Inline, `gap: 8px`. Label `--t-body`, `--color-ink-2`.
- Box: 14×14, `1px solid --color-line`, `--r-xs`, background `--color-bg`.
- Checked: background + border `--color-accent`, glyph white.

### 3.11 Toolbar (floating)

- Position: bottom-center, `bottom: 22px`.
- Shell: `--color-surface-floating`, `--r-2xl` (10px), `1px solid --color-line`, padding `6px`, `gap: 2px`. Floating elevation.
- Tool: `--h-tool` × `--h-tool` (36×36), `--r-lg`, `--color-ink-2` idle.
- Hover: background `--color-line-soft`, color `--color-ink`.
- **Active: background `--color-accent`, color white. Always. No alternate accent.**
- Divider: 1px column of `--color-line-soft`, vertical margin 6px.
- Special "AI" tool: ink `--color-accent-ai`, hover background `--color-accent-soft`.

### 3.12 Zoom HUD

- Position: bottom-right, `bottom: 22px; right: 22px`.
- Shell: same as toolbar but `--r-lg`, padding `6px 10px`. Inter, 12px.
- Right panel header zoom inherits the same readout but is unstyled (no chrome).

### 3.13 Frame & selection (canvas)

- Frame body: white, `--r-lg`. Frame label sits 24px above, `--color-ink-2`, 14.5px.
- Selected frame: 2px solid `--color-accent` outline, no offset. Label flips to `--color-accent`, weight 500.
- Selection handles: 9×9, white fill, `1.5px solid --color-accent`, `--r-xs`. Eight handles (corners + midpoints).
- Size chip: positioned 36px below the frame, accent fill, white ink, 15px / 500, `--r-lg`.

### 3.14 Floating help (`?`)

- 28×28 pill in the bottom-right of any panel that needs it.
- `--color-surface-input` background, `1px solid --color-line`, `--color-ink-2` ink.

### 3.15 Avatars

- Default 26×26, pill. Sample customer data uses a brand color (e.g. `#c24a1e` for Wildgrove). **Customer brand colors are data, not part of our system.** Our own avatars use `--color-surface-input` + ink.

---

## 4. Density & rhythm

Density is on purpose. The product is tool-dense; airy chrome would feel slow.

- **Default control height: 30px.** Compact list rows: 28px. Segmented inner cells: 26px.
- **Side-panel padding:** 14px horizontal everywhere. Sub-section vertical rhythm: 12px between sub-sections, 6px between a label and its controls.
- **Group separation:** hairline divider, no extra negative space — the divider does the work.
- **Top bar:** 44px. Tabs row: 44px. Both share the same height for visual continuity.
- **Layer/page rows:** never indent past 40px (2 levels). Beyond that, use a folder/expand pattern.
- **Hit targets:** the 28×28 icon button is the floor. Don't go smaller.

---

## 5. Bans

Hard nopes. If you find yourself reaching for one of these, stop and re-read the system.

1. **No monospace on chrome.** Inter only. (Body content of a *user document* — like the email mocks on the canvas — can use monospace as content; the chrome around them cannot.)
2. **No emoji** in product chrome.
3. **No purple, lilac, or any "AI purple."** AI surfaces use `--color-accent` (`#3b82f6`) or `--color-accent-ai` (`#a9c4ff`) — never a separate hue.
4. **No left-border accent on selected rows.** Selection is a tinted background, period.
5. **No gradient backgrounds** anywhere on chrome. Solid neutrals only.
6. **No 2px borders** on chrome. Borders are 1px hairlines. The 2px accent ring on a selected frame is the only exception, and it's an outline, not a border.
7. **No drop shadows on inputs, cards, or list rows.** Elevation lives only on floating elements (toolbar, HUD) and the page mockup itself.
8. **No font sizes outside the type scale.** No 13.5px, no 11.7px. If you need a new size, add it to the scale.
9. **No hex outside `:root`.** Components reference semantic tokens.
10. **No horizontal scroll for properties.** Properties always stack vertically.
11. **No icon-only buttons without a tooltip** (`title` attribute or aria-label).
12. **No status colors (red/yellow/green) until they're added to §1.1.** Don't grab a hex from a screenshot.
13. **No alternate accent.** There is one accent. Don't introduce a "secondary accent."
14. **No rounded panels.** Side panels and full-bleed surfaces are flat-edged; rounding lives on controls and floating elements.

---

## 6. Extending the system

When you design a surface this doc doesn't cover (settings, dashboard, modals, toasts, forms beyond what's here):

1. **Reuse before invent.** Try to express the new surface using existing components in §3. If you can, you're done.
2. **If you must invent**, extend the layered system top-down:
   - Need a value? Check if a foundation token (§1) already covers it.
   - Need meaning? Add a semantic token (§2) before using it. Name it for what it *is* (`--color-status-error`), not what it *looks like* (`--color-red`).
   - Need a new component? Document it in §3 with the same shape (size, padding, type, hover, active, disabled).
3. **Keep the bans.** A new surface is not a license to bring in monospace, gradients, or a second accent.
4. **Update this doc in the same change.** A component that exists in code but not here is a regression — it will drift.
5. **When something becomes a pattern (used twice), it goes in §3.** Don't wait for it to spread to five places.
6. **Status colors, motion tokens, light mode, and form patterns beyond inputs/checkboxes are deferred.** When the first surface needs one, design that token suite carefully and add it here — don't grab values ad-hoc.

---

## 7. Reference implementation

The canonical implementation of every component above lives in `Kova Canvas - Final.html`. When in doubt, open that file and match the pattern exactly. If that file and this doc disagree, **this doc wins** — and the file should be updated to match.

---

## 8. Canonical stylesheets

Every in-scope hi-fi page links exactly one of these. There are no overrides, no per-folder copies, no `?v=` cache-busters.

| File | Theme | Used by |
|---|---|---|
| `design-system/kova-hifi.css` | Dark (default) | All hi-fi pages in `dark/`, `batch-a/dark/`, `batch-b/` (16 files) |
| `design-system/kova-hifi-light.css` | Light (auth only) | `batch-a/light/Kova Hi-Fi A15 Auth - Light.html` |

Both files share the same component layer (same class names, same structure, same accent `#3b82f6`); only the surface + ink ramps differ. Light is intentionally auth-only — the rest of the product is dark per §1 and §2.

**Rules**
- Edit the canonical files directly. No layered override stylesheets.
- No `!important`. If a rule isn't winning, fix specificity or hierarchy.
- Class names are stable: `.btn`, `.btn.primary`, `.btn.accent`, `.pill`, `.pill.accent`, `.tag-mono`, `.nav .item.active`, `.sidebar`, `.topbar`, `.field`, `.input`, etc. Don't rename — HTML across all pages depends on them.
- Status variants (`.pill.ok`, `.pill.warn`, `.pill.review`, `.tag-mono.warn`) intentionally degrade to neutral until the status palette ships (§5 ban 12).
- The legacy `mono` class is preserved as a no-op (renders in Inter) so existing markup parses; mono is banned on chrome (§5 ban 1).
- The Google Fonts import is Inter only. JetBrains Mono is gone.

When you add a new component class, add it to the canonical CSS, document it under §3, and reference it from `Kova Canvas - Final.html`. The doc still wins (§7) — if the canonical file disagrees with this doc, fix the file.
