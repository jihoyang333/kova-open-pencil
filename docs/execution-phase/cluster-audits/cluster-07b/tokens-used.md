# Cluster 07b — tokens-used

> Companion to `KOVA_AUDIT.md`. Every visual value in Cluster 07b's surfaces, traced to
> a canonical token or an explicitly-justified literal. **Zero ⚠️ MISSING** → no founder
> token decision required (audit lock 12: zero new design tokens).

## 1. Inspector sections (Tailwind utilities → `@theme` tokens)

Reuses the Cluster 06 inspector token set verbatim (no new values):

| Usage | Utility | Token |
|---|---|---|
| Section divider | `border-b border-line` | `--color-line` |
| Section label | `text-[11px] text-ink-3` | `--color-ink-3` |
| Row hover | `hover:bg-fill-2` / `hover:bg-hover` | `--color-fill-2` / `--color-hover` |
| Accent (active tab, add link) | `bg-accent-soft text-accent` | `--color-accent*` |
| Editor popover surface | `border-border bg-panel` | `--color-border` / `--color-panel` |
| Input field | `bg-input` | `--color-input` |

Editor popovers (`PaintEditor`, `ImageFillPicker`, `EffectEditor`) use `w-64` (256px,
Tailwind scale) — the prior hardcoded `w-[248px]` on `EffectEditor` was normalized to
`w-64` during remediation (audit MEDIUM).

## 2. Canvas overlays (module constants — Rider §2.6 canvas-paint exemption)

These are canvas-engine paint colors / z-order, NOT CSS surfaces, so they live as module
constants in `src/constants/overlays.ts` and cannot bind CSS custom properties (mirrors
c06 `CTA_WRAP_FILL_HEX`). Sourced from hi-fi 09 §3.4–3.5:

| Constant | Value | Surface |
|---|---|---|
| `OVERLAY_COLOR.FRAME_OUTLINE` | `rgba(126,126,121,0.55)` | frame outlines |
| `OVERLAY_COLOR.PIXEL_GRID` | `rgba(126,126,121,0.18)` | pixel grid lines |
| `OVERLAY_COLOR.MASK_GREEN` | `#3DDC97` | mask outline + glyph |
| `OVERLAY_COLOR.MASK_GLYPH_BG` | `rgba(61,220,151,0.22)` | mask corner glyph fill |
| `OVERLAY_COLOR.SNAP_RED` | `#F24822` | snap indicators |
| `OVERLAY_COLOR.LAYOUT_GUIDE_RED` | `rgba(255,0,0,0.10)` | layout guide bands (Q24) |
| `OVERLAY_COLOR.FIND_DIM` | `rgba(0,0,0,0.6)` | find dim backdrop (§12.12) |
| `OVERLAY_COLOR.SLICE_DASH` | `rgba(126,126,121,0.7)` | slice dashed border |
| `OVERLAY_COLOR.SLICE_LABEL_BG` | `rgba(126,126,121,0.92)` | slice name tag |
| `OVERLAY_COLOR.EYEDROPPER_HEX_CHIP_BG` | `#2c2c2c` | eyedropper hex chip (now bound, not inline — audit L1) |
| `OVERLAY_Z.*` | 3–10 | overlay stacking order (hi-fi 09 §3.4) |
| `PIXEL_GRID_ZOOM_THRESHOLD` | `8.0` (800%) | pixel-grid auto-show |
| `CAMERA_PAN.{DURATION_MS,PADDING_PCT}` | `250` / `10` | find focus pan (§12.12) |

## 3. ⚠️ MISSING

None. Every value above resolves to a canonical token (§1) or a Rider §2.6-exempt
canvas-paint constant (§2). No founder decision required.
