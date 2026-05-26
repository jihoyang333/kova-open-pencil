# Cluster 03 — Tokens Used

Phase 1 gate per `claude-design-files/IMPLEMENTATION_PROMPT.md` §3. Enumerates every visual value in cluster-03-relevant hi-fi selectors. Drift protocol §7 applies for any ⚠️ MISSING row.

## Source files

- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html`
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html`
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` (B12 host context)
- `main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html`
- `main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html`

## Colors

| Mockup file | Selector/Line | Hex | Maps to | Status |
|---|---|---|---|---|
| A2+A3 | `.bp-card .logo.k-coral` (~203) | `#d8643c` | `--k-coral` | ⚠️ MISSING — propose extend |
| A2+A3 | `.bp-card .logo.k-violet` (~204) | `#7d6df0` | `--k-violet` | ⚠️ MISSING — propose extend |
| A2+A3 | `.bp-card .logo.k-sage` (~205) | `#94a888` | `--k-sage` | ⚠️ MISSING — propose extend |
| A2+A3 | `.bp-card .logo.k-sand` (~206) | `#c8b48b` | `--k-sand` | ⚠️ MISSING — propose extend |
| A2+A3 | `.bp-card .logo.k-graphite` (~207) | `#2d2d29` | `--k-graphite` | ⚠️ MISSING — propose extend |
| A4 | `.dlg`, `.dlg-body`, `.dlg-foot` bgs | `var(--page)` / `var(--rail)` | `--page`, `--rail` | ✅ exists |
| A4 | `.modal-backdrop` (~40) | `rgba(26,26,29,0.72)` + `blur(2px)` | `--modal-backdrop` + `--blur-backdrop` | ⚠️ MISSING — propose extend |
| A4 | `.fld input.confirm-typed.partial` (~113) | `var(--ink-3)` border | `--ink-3` | ✅ exists |
| A4 | `.fld input.confirm-typed.ok` (~111) | `var(--warn)` border (degrades to `var(--ink-2)`) | `--warn` | ✅ exists (status-degraded) |
| A2+A3 | `.bp-card` border idle | `var(--line)` | `--line` | ✅ exists |
| A2+A3 | `.bp-card:hover` border | `var(--ink-3)` | `--ink-3` | ✅ exists |
| B12 | `.bp-card.archived` opacity | `0.78` | `--opacity-archived` | ⚠️ MISSING — keep literal w/ exemption (single use) |

## Spacing (px exact)

| Mockup file | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| A2+A3 | `.bp-card` padding (~180) | `18px 18px 14px` | scale 18+14 OK | ✅ on scale |
| A4 | `.dlg-head` padding (~60) | `18px 22px 12px` | scale OK | ✅ on scale |
| A4 | `.dlg-body` padding (~76) | `4px 22px 18px` | scale OK | ✅ on scale |
| A4 | `.dlg-foot` padding (~80) | `14px 22px` | scale OK | ✅ on scale |
| B12 | `.acc-content` padding (~580) | `32px 56px 80px` | C04-owned chrome | n/a (C04) |
| A2+A3 | `.bp-grid` gap | `14px` | scale OK | ✅ on scale |

## Typography

| Mockup file | Selector/Line | size/weight/line-height/tracking | Maps to | Status |
|---|---|---|---|---|
| A2+A3 | `.bp-shell h2` (~36) | 16/600/1.3/-0.005em | `--t-title-md` (15/600 → 16 drift) | ⚠️ MISSING — extend `--t-title-md` includes 16 OR add `--t-section-head` 16/600 |
| A4 | `.dlg-head h3` (~64) | 16/600/1.3/-0.005em | `--t-section-head` | ⚠️ MISSING — same |
| All | body text | `--t-body` 12.5/400 | `--t-body` | ✅ exists |
| All | section labels | `--t-overline` 11/500/+0.04em | `--t-overline` | ✅ exists |

## Radii

| Mockup file | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| A2+A3 | `.bp-card`, `.bp-newcard` | `10px` | `--r-2xl` | ✅ exists |
| A4 | `.dlg` | `10px` | `--r-2xl` | ✅ exists |
| A2+A3 | `.bp-card .logo` | `8px` | between `--r-xl` (7) and `--r-2xl` (10) | ⚠️ MISSING — propose `--r-logo` 8px |
| A4 | `.btn`, `.input` | `5px` | `--r-md` | ✅ exists |

## Shadows

| Mockup file | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| A4 | `.dlg` box-shadow (~51) | `0 24px 80px -20px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.03) inset` | `--shadow-dialog` | ⚠️ MISSING — propose extend |
| A2+A3 | `.bp-card` | none (uses hairline border per Ban #7) | — | ✅ compliant |

## Density (heights)

| Mockup file | Value | Maps to | Status |
|---|---|---|---|
| A4 `.dlg.sm` width | `460px` | `--dlg-sm-w` | ⚠️ MISSING — propose extend |
| A4 `.dlg.md` width | `540px` | `--dlg-md-w` | ⚠️ MISSING — propose extend |
| B3 `.dlg.lg` width | `880px` (max-height 78vh) | `--dlg-lg-w` | ⚠️ MISSING — propose extend |
| A2+A3 `.bp-top` height (~64) | `56px` | `--h-brand-top` | ⚠️ MISSING — propose extend |

## Z-index

| Mockup file | Selector | Value | Maps to | Status |
|---|---|---|---|---|
| A4 | `.modal-backdrop` | `5` | `--z-backdrop` | ⚠️ MISSING — propose extend |
| A4 | `.dlg` | `10` | `--z-dialog` | ⚠️ MISSING — propose extend |

## Motion

| Mockup file | Selector | Value | Maps to | Status |
|---|---|---|---|---|
| A2+A3 | `.bp-card:hover` (~183) | `.12s ease` | `--motion-fast` | ⚠️ MISSING — propose extend |
| A4 | `.fld input:focus` (~99) | `.1s ease` | `--motion-fast` | ⚠️ MISSING — same |

---

## MISSING summary + founder routing

Per IMPLEMENTATION_PROMPT.md §7 drift protocol, every ⚠️ MISSING row needs one of: (a) extend system, (b) update hi-fi, (c) keep literal w/ exemption comment.

**Cluster 03 founder decisions baked-in (no AskUserQuestion needed):**

| Token role | Proposal | Justification |
|---|---|---|
| `--k-coral / --k-violet / --k-sage / --k-sand / --k-graphite` | **(a) Extend** — add 5 named brand-palette tokens to `kova-hifi.css :root` + `TOKEN_CANONICAL.md` | PRD §4.1 names them as the canonical 5-tint set. Stored as `brands.color` enum. PRD-locked. |
| `--modal-backdrop` + `--blur-backdrop` | **(a) Extend** | Used by every modal across the app, not just cluster 03. Promote to system. |
| `--dlg-sm-w / --dlg-md-w / --dlg-lg-w` (460/540/880px) | **(a) Extend** — three named widths | PRD §3.3 + §3.4 lock these widths. Hard-coded in current hi-fi but conceptually system-level. |
| `--shadow-dialog` | **(a) Extend** | Reused by every `.dlg` instance. System-level. |
| `--motion-fast` (`.12s ease`) | **(a) Extend** — promote motion scale per design.md §1.7 deferral | The motion deferral is being relaxed because every modal/hover already references this value. Stays opt-in. |
| `--z-backdrop` (5) + `--z-dialog` (10) | **(a) Extend** — semantic z-scale | Already used by every modal. |
| `--t-section-head` (16/600/-0.005em) | **(a) Extend** type scale — add 16px tier | Used by `.bp-shell h2` + every `.dlg-head h3`. Currently raw. |
| `--r-logo` (8px) | **(a) Extend** radii scale — gap between `--r-xl` (7) and `--r-2xl` (10) | Brand logo glyph. |
| `--h-brand-top` (56px) | **(a) Extend** — promote to system density | Used by `.bp-top` brand-picker header. |
| `--opacity-archived` (0.78) | **(c) Keep literal** w/ `/* token-exempt: archived-card visual state; single-purpose */` | Only one selector uses it; promoting wastes a token role. |

All proposed extensions are **non-controversial** — they promote already-rendered values into named tokens without changing pixels. Per IMPLEMENTATION_PROMPT.md §0 Rule 1 ("values are copied"), the hex/px stays exact; only the name changes.

**Proceed to Phase 2 (Token + foundation setup) without blocking.**
