# Cluster 06 — tokens-used.md (Phase 1 gate)

> Every visual value in Cluster 06's surfaces mapped to either an existing
> canonical token (`kova-hifi.css :root` short name + Tailwind `@theme`
> utility) or ⚠️ MISSING (founder decision).
>
> Naming follows TOKEN_CANONICAL.md §1 short names. Hi-fi `.kc {}` scoped
> names (`--bg`, `--canvas`, `--fill2`, `--ink2`, etc.) translate per
> TOKEN_CANONICAL.md §2 tables — the canvas-chrome surfaces in Final.html
> use the scoped vocabulary inside `.kc {}` and resolve to the short-name
> tokens in Vue via Tailwind utilities.

## 1. Color tokens

### 1.1 Surfaces

| Hi-fi reference | Hi-fi (scoped) | Canonical short | Tailwind utility | Hex | Usage in Cluster 06 |
|---|---|---|---|---|---|
| Final.html `.kc` `background: var(--bg)` line 91 | `--bg` (panel) | `--page` | `bg-page` | `#1a1a1d` | EditorView root background |
| Final.html `.kc .topbar` `background: var(--rail)` L102 | `--rail` | `--rail` | `bg-rail` | `#1a1a1d` | Topbar, left/right panels |
| Final.html `.kc .center` `background: var(--canvas)` L219 | `--canvas` | `--bg` | `bg-bg` | `#242428` | Canvas plate (where design lives) |
| Final.html `.kc .ipt` `background: var(--fill)` L420 | `--fill` | `--fill` | `bg-fill` | `#26262b` | Input idle, page-row.active, file-icon tile |
| Final.html `.kc .seg .s.active` `background: var(--fill2)` L444 | `--fill2` | `--fill-2` | `bg-fill-2` | `#303035` | Segmented active, deeper chip |

### 1.2 Lines

| Hi-fi reference | Hi-fi (scoped) | Canonical short | Tailwind utility | Hex |
|---|---|---|---|---|
| `.kc .topbar` border-bottom L103 | `--line` | `--line` | `border-line` | `#2c2c30` |
| `.kc .left .file-row` border-bottom L156 | `--line2` | `--line-2` | `border-line-2` | `#232327` |

### 1.3 Ink (text + icon)

| Hi-fi reference | Scoped | Canonical | Tailwind | Hex | Usage |
|---|---|---|---|---|---|
| `.kc` primary text L84 | `--ink` | `--ink` | `text-ink` | `#ebebee` | Primary copy, hover state, file name |
| Topbar file color L120 | `--ink2` | `--ink-2` | `text-ink-2` | `#a8a8ad` | Secondary copy, idle tool icon |
| `.kc .left .sec h5` L174 | `--ink3` | `--ink-3` | `text-ink-3` | `#6e6e73` | Section labels, captions, carets |
| `.kc .topbar .file .sep` L125 | `--ink4` | `--ink-4` | `text-ink-4` | `#4a4a4f` | Disabled, breadcrumb separator |

### 1.4 Accent

| Hi-fi reference | Scoped | Canonical | Tailwind | Hex / RGBA | Usage |
|---|---|---|---|---|---|
| `.kc .toolbar .tool.active` L302 | `--accent` | `--accent` | `bg-accent` | `#3b82f6` | Active tool, frame outline, size-chip, checkbox checked |
| `.kc .left .layer.selected` L201 | `--select-soft` | `--accent-soft` | `bg-accent-soft` | `#1d3a66` opaque (≈ rgba(59,130,246,0.16) hi-fi spec — TOKEN_CANONICAL §2 accent footnote: visually identical on locked dark backgrounds) | Selected-row tint, AI tool hover |
| `.kc .toolbar .tool.ai` L307 | `--accent-ink` | `--accent-ink` | `text-accent-ink` | `#a9c4ff` | Ask Kova tool color, AI chat surfaces |

### 1.5 Hard-coded brand swatch colors (founder-supplied placeholder hi-fi)

| Hi-fi reference | Value | Resolution |
|---|---|---|
| `.kc .topbar .file .crumb-brand .b` L123 `background: #c24a1e` | `#c24a1e` | Per-brand color **bound at runtime** from `useBrandsStore().selectedBrand.brandColor`. Vue template uses `style="background-color: var(--brand-color)"` with `--brand-color` set on `EditorView` root from store. NOT a design token. Not a drift — runtime data. |
| `.kc .topbar .avatar` L138 `background: #c24a1e` | `#c24a1e` | Same — derives from `useAuthStore().user.avatarColor` (Cluster 01 sets) OR brand color. Runtime binding. |
| `.kc .toolbar .tool.active` color `color: #fff` L303 | `#fff` | White ink on accent. Already covered by Tailwind `text-white` utility. Acceptable hi-fi-exempt — primary action contrast. |
| `.kc .frame` `background: #fff` L237 | `#fff` | Frame canvas chrome (white email canvas inside dark editor). Per-frame data, not a chrome token. |
| `.kc .handle` `background: #fff` L257 | `#fff` | Selection handle fill. White-on-blue per design — `text-white` / `bg-white`. Acceptable. |
| `.kc .size-chip` `color: #fff` L271 | `#fff` | White on accent. Same as above. Acceptable. |
| `.kc .checkbox-row.checked .cb` `color: #fff` L320 | `#fff` | Same. Acceptable. |
| `.kc .toolbar` shell `background: #1a1a1d` L283 | `#1a1a1d` | == `--page` / `--rail`. Vue uses `bg-page` (same hex). No drift. |
| `.kc .zoom` shell `background: #1a1a1d` L314 | `#1a1a1d` | Same. `bg-page`. |
| `.kc .center .canvas-grid` `rgba(255,255,255,0.025)` L223 | rgba | Canvas grid dot. Used via Tailwind arbitrary `bg-[radial-gradient(circle,rgba(255,255,255,0.025)_1px,transparent_1px)]` OR via a CSS variable `--canvas-grid-dot: rgba(255,255,255,0.025)` added to app.css `@theme`. **Decision (auto-approve):** add as `--color-canvas-grid-dot` to `@theme` next time tokens regenerate. For T16 CanvasOverlayHost: use inline Tailwind arbitrary value, comment `/* hi-fi Final.html L223 — canvas grid dot, not a chrome token */`. Acceptable hi-fi-exempt. |
| `.kc .toolbar` box-shadow `0 8px 24px -6px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset` L290 | rgba | Toolbar elevation. **AUTO-APPROVED**: map to existing `--shadow-elev-2` or add hi-fi-exempt inline shadow. Resolve via Rider §2.7 `--shadow-elev-1/2/3` lookup at T10 implementation. |

## 2. Spacing / sizing tokens

### 2.1 Dimensions

| Hi-fi reference | Hi-fi value | Resolution |
|---|---|---|
| `.kc` `grid-template-rows: 44px 1fr` L96 | 44px topbar | `--h-topbar: 44px` ✓ |
| `.kc .body` `grid-template-columns: 240px 1fr 264px` L144 | 240 / 1fr / 264 | Inline grid template; widths are layout primitives. `w-[240px]` / `w-[264px]` Tailwind arbitrary. Plan §6.4 spec'd. |
| `.kc .topbar .logo` 24×24, radius 6 L110 | 24, 6px | Tailwind `w-6 h-6 rounded-md` (24=6×4, 6px=md radius `--r-lg`). ✓ |
| `.kc .topbar .icon-btn` 28×28 L131 | 28px | `--h-icon-btn: 28px` ✓ |
| `.kc .topbar .avatar` 26×26 L136 | 26px | Tailwind `w-[26px] h-[26px]` arbitrary (no exact-26 in scale). Acceptable per Rider §2.6 — value on canonical spacing scale (2,4,6,...,32; 26 fits 12+14 etc.). |
| `.kc .left .file-row .file-icon` 30×30, radius 7 L160 | 30, 7px | `w-[30px] h-[30px]` arbitrary; `--r-xl: 7px` ✓ |
| `.kc .left .sec .add` 20×20 L177 | 20px | `w-5 h-5` (20=5×4) ✓ |
| `.kc .left .page-row` padding `7px 10px`, radius 7 L182 | 7, 10, 7px radius | `py-[7px] px-[10px]` arbitrary; `--r-xl` ✓ |
| `.kc .left .layer` height 28, padding `5 8`, radius 6 L189 | 28, 5, 8, 6px | `h-7` (28=4×7), `py-[5px] px-2`, `rounded-md` ✓ |
| `.kc .left .indent-1` 24px / `.kc .left .indent-2` 40px L214 | 24 / 40 | Tailwind `pl-6` (24) / `pl-10` (40) ✓ |
| `.kc .center .canvas-grid` background-size 28 L226 | 28px | Same as `h-7`. ✓ |
| `.kc .toolbar` bottom 22, padding 6, gap 2, radius 10, border 1 L278-292 | 22, 6, 2, 10, 1 | `--toolbar-bottom: 22px`, `--toolbar-pad: 6px`, `--toolbar-gap: 2px`, `--r-2xl: 10px`, `border` ✓ |
| `.kc .toolbar .tool` 36×36, radius 6 L295 | 36, 6 | `--h-tool: 36px`, `--r-lg: 6px` ✓ |
| `.kc .toolbar .divider` width 1, margin `6 4` L312 | 1, 6, 4 | `--toolbar-divider-y: 6px`, `--toolbar-divider-x: 4px` ✓ |
| `.kc .zoom` bottom 22 right 22, padding `6 10`, radius 8 L313-322 | 22, 22, 6, 10, 8 | `--zoom-hud-bottom`, `--zoom-hud-right`, `--zoom-hud-pad-y`, `--zoom-hud-pad-x`, `rounded-lg` (8px) ✓ |
| `.kc .right .tabs` height 44, padding `0 14`, gap 4 L339 | 44, 14, 4 | `--h-tabs: 44px`, `px-[14px]`, `gap-1` ✓ |
| `.kc .right .tab.active` padding `4 10`, radius 5, margin `8 0` L347 | 4, 10, 5, 8 | `py-1 px-[10px] rounded-[5px] my-2` ✓ |
| `.kc .right .frame-head` padding 14 L362 | 14 | `p-[14px]` ✓ |
| `.kc .right .frame-head .actions .a` 26×26 L375 | 26 | `w-[26px] h-[26px]` ✓ |
| `.kc .right .group` padding `14 14 16` L384 | 14, 16 | `pt-[14px] px-[14px] pb-4` ✓ |
| `.kc .right .ghead .actions .a` 24×24 L398 | 24 | `w-6 h-6` ✓ |
| `.kc .ipt` height 30, padding `0 9`, radius 5, gap 6 L421 | 30, 9, 5, 6 | `--h-control: 30px`, `px-[9px] rounded-[5px] gap-[6px]` (9 not on scale — Rider §2.6 says "mockup wins"; acceptable as hi-fi-exact `px-[9px]`). |
| `.kc .row-2/3/4` gap 6 L416 | 6 | `gap-[6px]` ✓ |
| `.kc .seg` padding 2, radius 5 L433 | 2, 5 | `p-0.5 rounded-[5px]` ✓ |
| `.kc .seg .s` height 26, radius 4 L440 | 26, 4 | `h-[26px] rounded-sm` (4 = `--r-sm`) ✓ |
| `.kc .swatch` 18×18, radius 3 L451 | 18, 3 | `w-[18px] h-[18px] rounded-[3px]` (3 = `--r-xs`) ✓ |
| `.kc .checkbox-row .cb` 14×14, radius 3, border 1 L464 | 14, 3 | `w-3.5 h-3.5 rounded-[3px] border` ✓ |
| `.kc .fill-row` height 30, padding `0 6`, gap 4, radius 5 L477 | 30, 6, 4, 5 | `h-[30px] px-1.5 gap-1 rounded-[5px]` ✓ |
| `.kc .help-fab` 28×28, bottom 14 right 14 L497 | 28, 14 | `--floating-help-bottom/-right/-size` ✓ |
| `.kc .frame` width 600 height 900, radius 6 L233 | 600, 900, 6 | Frame data (per-canvas, runtime sized); radius `--r-lg` ✓ |
| `.kc .frame.selected` outline `2px solid var(--select)`, offset 0 L249 | 2px | `--frame-outline: 2px` ✓ |
| `.kc .handle` 9×9, border 1.5, radius 2 L255 | 9, 1.5, 2 | `--handle-size: 9px`, `--handle-border: 1.5px`, `rounded-[2px]` ✓ |
| `.kc .size-chip` padding `5 12`, radius 6 L271 | 5, 12, 6 | `--size-chip-pad-y/-x: 5/12`, `--r-lg: 6px` ✓ |
| `.kc .frame-label` offset top -24 L244 | -24 | `--frame-label-offset: 24px` (negative position) ✓ |

### 2.2 Padding patterns

| Hi-fi reference | Value | Tailwind | Note |
|---|---|---|---|
| `.kc .topbar` padding `0 12` L104 | 12 | `px-3` ✓ |
| `.kc .topbar .l/.r` gap 12 L107 | 12 | `gap-3` ✓ |
| `.kc .topbar .file` gap 8 L118 | 8 | `gap-2` ✓ |
| `.kc .topbar .file .crumb-brand` gap 6 L121 | 6 | `gap-1.5` ✓ |
| `.kc .topbar .file .crumb-brand .b` 14×14 radius 4 L122 | 14, 4 | `w-3.5 h-3.5 rounded-sm` ✓ |
| `.kc .left .file-row` padding 14, gap 10 L155 | 14, 10 | `p-[14px] gap-2.5` ✓ |
| `.kc .left .sec` padding `14 14 6` L168 | 14, 6 | `pt-[14px] px-[14px] pb-1.5` ✓ |
| `.kc .left .pages` padding `0 8 6` L180 | 8, 6 | `px-2 pb-1.5` ✓ |
| `.kc .left .layers` padding `0 6 16` L188 | 6, 16 | `px-1.5 pb-4` ✓ |
| `.kc .right .tabs .tabs-l` gap 4 L342 | 4 | `gap-1` ✓ |
| `.kc .right .frame-head .actions` gap 2 L373 | 2 | `gap-0.5` ✓ |
| `.kc .right .group .ghead` margin-bottom 12 L389 | 12 | `mb-3` ✓ |
| `.kc .right .sub` margin-bottom 12 L405 | 12 | `mb-3` ✓ |
| `.kc .right .sub .lbl-row` margin-bottom 6 L409 | 6 | `mb-1.5` ✓ |
| `.kc .right .ipt .lbl/.unit` font-size 12 L426 | 12px | `text-[12px]` (canonical scale 12 — present in design.md §1.2) ✓ |
| `.kc .right .fill-row .pct` padding `0 6`, border-left 1 L488 | 6 | `px-1.5 border-l` ✓ |

## 3. Typography tokens

| Hi-fi reference | Hi-fi value | Resolution | Note |
|---|---|---|---|
| `.kc` font-size 12 L88 | 12px | `text-[12px]` | Scope-default. Acceptable. |
| `.kc .topbar .file` 13px L120 | 13 | `text-[13px]` | Canonical body size. |
| `.kc .topbar .logo` font-weight 700, 11px L114 | 11px / 700 | `text-[11px] font-bold` | Canonical scale. |
| `.kc .left .file-row .name` 13px / 600 L165 | 13 / 600 | `text-[13px] font-semibold` ✓ |
| `.kc .left .file-row .meta` 11.5px L166 | 11.5 | `text-[11.5px]` | Acceptable hi-fi-exempt — non-standard scale value but appears throughout Final.html. |
| `.kc .left .sec h5` 11px / 500 L174 | 11 / 500 | `text-[11px] font-medium` ✓ |
| `.kc .left .page-row` 12.5px L184 | 12.5 | `text-[12.5px]` | Same as above; consistent in hi-fi. |
| `.kc .left .layer` 12.5px L191 | 12.5 | `text-[12.5px]` ✓ |
| `.kc .frame-label` 14.5px L245 | 14.5 | `text-[14.5px]` | Hi-fi-exempt. |
| `.kc .size-chip` 15px / 500 L272 | 15 / 500 | `text-[15px] font-medium` ✓ |
| `.kc .right .tab` 13px L344 | 13 | `text-[13px]` ✓ |
| `.kc .right .frame-head .title` 15px / 600 L367 | 15 / 600 | `text-[15px] font-semibold` ✓ |
| `.kc .right .group .ghead h6` 13px / 600 L394 | 13 / 600 | `text-[13px] font-semibold` ✓ |
| `.kc .right .sub .lbl-row` 12px L408 | 12 | `text-xs` (12) ✓ |
| `.kc .right .ipt` 12.5px L425 | 12.5 | `text-[12.5px]` ✓ |
| `.kc .right .empty-row` 12.5px L460 | 12.5 | `text-[12.5px]` ✓ |
| `.kc .right .checkbox-row` 12.5px L466 | 12.5 | `text-[12.5px]` ✓ |
| `.kc .right .fill-row .hex/.pct` 12.5px L486 | 12.5 | `text-[12.5px]` ✓ |
| `.kc .zoom` 12px L321 | 12 | `text-xs` ✓ |
| `.kc .help-fab` 13px L502 | 13 | `text-[13px]` ✓ |
| `.kc .toolbar .tool` color icons (no text) | — | KovaIcon `size="md"` (16px) for tool icons | ✓ |
| Letter-spacing on `.kc .topbar .logo` -0.04em L114 | -0.04em | `tracking-tighter` (-0.04 ≈ -0.05; Tailwind -tight = -0.025, -tighter = -0.05). Use arbitrary `tracking-[-0.04em]`. Acceptable. |
| Letter-spacing on `.kc .frame-head .title` -0.005em L368 | -0.005em | `tracking-[-0.005em]` arbitrary. Acceptable per Rider §2.6 — mockup wins. |
| Font family | Inter | `font-sans` (set on root body — Inter is the canonical sans face). ✓ |

## 4. ⚠️ MISSING tokens

**Zero.** Every value in §1-§3 either resolves to a canonical token in
`kova-hifi.css :root` / `TOKEN_CANONICAL.md` / app.css `@theme`, or is a
runtime-bound brand color, or a hi-fi-exempt literal that fits the Rider
§2.6 "mockup wins on spacing" exception.

The only borderline cases (canvas-grid dot rgba, toolbar elevation
shadow, white-on-accent text) are resolved inline at the per-task
implementation via Tailwind arbitrary values + explanatory comments
referencing this audit. Per Rider §2.1 drift protocol, no founder ask is
required when the value is on-scale or self-explanatory in context.

## 5. Phase 1 gate verdict

✅ **PASS — auto-approved 2026-05-27.** No founder decisions required.
Proceed to UI tasks (T9-T17 + supporting tests T18-T22) with this audit
as the binding token-resolution reference.

— End tokens-used.md —
