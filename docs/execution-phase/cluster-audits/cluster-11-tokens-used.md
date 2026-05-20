# Cluster 11 — Tokens Used (Phase 1 audit gate doc)

**Status:** ✅ APPROVED 2026-05-20 by founder Jiho. R-1..R-13 default recommendations land as a block. Phase 2 cleared.

---

**Status (draft):** Phase 1 audit gate doc. Created 2026-05-20 by W6 REDO agent.
**Authority:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §3 + §7. No Vue / TS code until founder approves every ⚠️ MISSING row below.
**Method:** every visual value extracted from the referenced screen hi-fi's inline `<style>` block. Mapped to either an existing token in `design-system/canonical/kova-hifi.css :root` + `src/app.css @theme` — OR ⚠️ MISSING (founder must pick a resolution per drift protocol §7).

---

## 0. Source hi-fi files (cluster-11 primitive → spec source)

Per `design-system/hifi/README.md` "Clusters without a dedicated hi-fi mockup" §:

| Primitive | Source hi-fi(s) |
|---|---|
| `KovaToast` + `ToastStack` | `design-system/hifi/states/Kova Hi-Fi B1 Toasts - Dark.html` (`.toast` lines 439–501) |
| `KovaModal` (+ backdrop) | `design-system/hifi/canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` (`.dlg` lines 44–86); `design-system/hifi/brand-kit/Kova Hi-Fi A4+A9+A10 Modals - Dark.html` (identical `.dlg`); `design-system/hifi/auth/Kova Hi-Fi B4 Session Expired - Dark.html` (sm dialog) |
| `KovaPopover` | `design-system/hifi/canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` (`.popover` lines 114–217); `design-system/hifi/canvas-menus/chunk-b1/Kova Hi-Fi 13 Canvas Popovers - Dark.html` |
| `KovaMenu` (Reka DropdownMenu) | `design-system/hifi/canvas-chrome/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` (`.menu` lines 123–209) — LOCK reference |
| `KovaTooltip` | No dedicated selector in any hi-fi. Spec inferred from PRD 11 §3.4 (11.5px / `--ink` on `--rail` bg, radius 5px, 500ms delay). See ⚠️ MISSING TT-1. |
| `KovaSkeleton` | `design-system/hifi/states/Kova Hi-Fi B7 Loading Skeletons - Dark.html` (`.skeleton` lines 66–101) |
| `EmptyState` | `design-system/hifi/states/Kova Hi-Fi B9 List Search Empty - Dark.html` (`.empty-pane` + `.empty-pane.inline` + `.empty-pane.full-page` lines 188–313) |
| Error pages | `design-system/hifi/states/Kova Hi-Fi B2 Error Pages - Dark.html` (`.err-page`, `.err-card`, `.err-icon-tile`, `.err-cta-stack` lines 33–93) |
| `KovaButton` | `design-system/canonical/kova-hifi.css` `.btn` (canonical — lines 332–365) |
| `KovaPill` | `design-system/canonical/kova-hifi.css` `.pill` (canonical — lines 367–393) |
| `KovaInput` + `KovaField` | `design-system/canonical/kova-hifi.css` `.input` + `.field` (lines 423–450); cross-ref `A6+A2a Popovers + A8 Dialogs` `.fld input.input` (modal-form variant) |
| `KovaSelect` | Spec from `A4+A9+A10 Modals` form selects — Reka Select wrapper styled to match `.input` + caret. |
| `KovaSegmented` | `design.md` §3.8 — no hi-fi block; consumer-cluster (07b inspector) spec inferred from PRD. ⚠️ MISSING SEG-1. |
| `KovaIcon` | Already shipped; `src/components/ui/KovaIcon.vue` + `kova-icon-registry.ts`. Spec = Lucide standard sizing (px from `KOVA_ICON_SIZE_PX`). |

---

## 1. Colors

| Primitive | Selector/Line | CSS value | Maps to | Status |
|---|---|---|---|---|
| **KovaToast** container bg | B1 `.toast` L444 | `var(--page)` `#1a1a1d` | `--page` / `--color-page` | ✅ exists |
| KovaToast border | B1 `.toast` L445 | `1px solid var(--line)` `#2c2c30` | `--line` / `--color-line` | ✅ |
| KovaToast text | B1 `.toast` L451 | `var(--ink)` `#ebebee` | `--ink` / `--color-ink` | ✅ |
| KovaToast ic-lead idle | B1 `.toast .ic-lead` L457 | `var(--ink-2)` `#a8a8ad` | `--ink-2` | ✅ |
| KovaToast meta | B1 `.toast .meta` L466 | `var(--ink-3)` `#6e6e73` | `--ink-3` | ✅ |
| KovaToast action btn | B1 `.toast .ta` L473 | `var(--accent)` `#3b82f6` | `--accent` | ✅ |
| KovaToast dismiss hover bg | B1 `.toast .dismiss:hover` L490 | `var(--line-2)` `#232327` | `--line-2` | ✅ |
| KovaToast variant `error` ic-lead | B1 L495 | `var(--warn)` → resolves to `--ink-2` (degraded; design.md §5 ban 12) | `--warn` alias (kova-hifi.css :root) | ⚠️ **MISSING — `--warn` alias NOT in `src/app.css @theme`.** Resolution-1. |
| KovaToast variant `error` border | B1 L496 | `var(--warn-edge)` → resolves to `--line` | `--warn-edge` alias | ⚠️ **MISSING — same as above.** Resolution-1. |
| KovaToast variant `ai` ic-lead | B1 L500 | `var(--accent-ink)` `#a9c4ff` | `--color-accent-ai` / `--accent-ink` | ✅ |
| KovaToast variant `ai` border | B1 L501 | `var(--accent-2)` `#2a4d80` | `--accent-2` | ⚠️ **MISSING — `--accent-2` exists in `design-system/canonical/kova-hifi.css :root` but NOT in `src/app.css @theme`.** Resolution-1. |
| **KovaModal** shell bg | A6+A2a `.dlg` L47 | `var(--page)` | `--page` | ✅ |
| KovaModal shell border | A6+A2a `.dlg` L47 | `1px solid var(--line)` | `--line` | ✅ |
| KovaModal head h3 | `.dlg-head h3` L61 | `var(--ink)` | `--ink` | ✅ |
| KovaModal head sub | `.dlg-head .sub` L64 | `var(--ink-3)` | `--ink-3` | ✅ |
| KovaModal close `.x` idle | `.dlg-head .x` L68 | `var(--ink-3)` | `--ink-3` | ✅ |
| KovaModal close `.x` hover | `.dlg-head .x:hover` L71 | `var(--line-2)` bg + `var(--ink)` color | both ✅ |
| KovaModal foot border-top | `.dlg-foot` L80 | `1px solid var(--line-2)` | `--line-2` | ✅ |
| KovaModal foot bg | `.dlg-foot` L82 | `var(--rail)` (== `--page` `#1a1a1d`) | `--rail` alias | ⚠️ **MISSING — `--rail` alias NOT in `src/app.css @theme`.** Resolution-1. |
| KovaModal backdrop | PRD 11 §3.3 | `rgba(0, 0, 0, 0.72)` | n/a — alpha overlay | ⚠️ **MISSING — no `--modal-backdrop` token.** Resolution-2. |
| KovaModal field input bg | A6 `.fld input.input` L96 | `var(--page)` | `--page` | ✅ |
| KovaModal field input focus border | A6 L103 | `var(--ink-2)` | `--ink-2` | ✅ |
| KovaModal field focus shadow | A6 L104 | `0 0 0 3px rgba(237,237,234,0.05)` | n/a — focus-ring | ⚠️ **MISSING — no `--focus-ring-ink` token.** Resolution-3. |
| **KovaPopover** bg | A6 `.popover` L116 | `var(--page)` | `--page` | ✅ |
| KovaPopover border | A6 L116 | `1px solid var(--line)` | `--line` | ✅ |
| KovaPopover pop-row idle | A6 L136 | `var(--ink)` | `--ink` | ✅ |
| KovaPopover pop-row hover | A6 L138 | `var(--line-2)` | `--line-2` | ✅ |
| KovaPopover pop-row active | A6 L139 | `var(--fill)` `#26262b` | `--fill` / `--color-fill` | ✅ |
| KovaPopover pop-search border | A6 L125 | `var(--line)` | `--line` | ✅ |
| KovaPopover pop-search bg | A6 L126 | `var(--rail)` | `--rail` alias | ⚠️ **MISSING.** Resolution-1. |
| KovaPopover avatar plan bg | A6 L186 | `var(--accent-soft)` `#1d3a66` | `--color-accent-soft` | ✅ |
| KovaPopover avatar plan border | A6 L187 | `1px solid var(--accent-2)` | `--accent-2` | ⚠️ MISSING. Resolution-1. |
| KovaPopover avatar plan text | A6 L186 | `var(--accent-ink)` | `--color-accent-ai` | ✅ |
| KovaPopover kbd bg | A6 L201 | `var(--fill)` | `--fill` | ✅ |
| KovaPopover kbd border | A6 L202 | `1px solid var(--line-2)` | `--line-2` | ✅ |
| **KovaMenu** bg | `.menu` L125 | `var(--rail)` (== `--page` `#1a1a1d`) | `--rail` alias | ⚠️ MISSING. Resolution-1. |
| KovaMenu border | `.menu` L126 | `1px solid var(--line)` | `--line` | ✅ |
| KovaMenu item idle | `.menu .item` L144 | `var(--ink)` | `--ink` | ✅ |
| KovaMenu item hover | `.menu .item:hover` L148 | `var(--line-2)` | `--line-2` | ✅ |
| KovaMenu item hovered (focused) | `.menu .item.hovered` L149 | `var(--fill)` | `--fill` | ✅ |
| KovaMenu kbd-row | `.menu .item .kbd-row` L162 | `var(--ink-3)` | `--ink-3` | ✅ |
| KovaMenu destructive item | `.menu .item.destructive` L181 | `var(--warn)` → resolves to `--ink-2` | `--warn` alias | ⚠️ MISSING. Resolution-1. |
| KovaMenu destructive hover bg | L182 | `var(--warn-soft)` → resolves to `--fill` | `--warn-soft` alias | ⚠️ MISSING. Resolution-1. |
| KovaMenu sep | `.menu .sep` L190 | `var(--line-2)` | `--line-2` | ✅ |
| KovaMenu group label | `.menu .group` L198 | `var(--ink-3)` | `--ink-3` | ✅ |
| **KovaTooltip** bg | PRD 11 §3.4 (inferred — no hi-fi) | `var(--rail)` | `--rail` alias | ⚠️ MISSING. Resolution-1. |
| KovaTooltip text | PRD 11 §3.4 | `var(--ink)` | `--ink` | ✅ |
| **KovaSkeleton** base | B7 `.skeleton` L68 | `var(--fill)` | `--fill` | ✅ |
| KovaSkeleton shimmer-peak | B7 L80 | `var(--fill-2)` | `--fill-2` / `--color-fill-2` | ✅ |
| KovaSkeleton reduce-motion | B7 L91 | `var(--fill-2)` | `--fill-2` | ✅ |
| **EmptyState panel-40** border | B9 `.empty-pane` L189 | `1px dashed var(--line)` | `--line` | ✅ |
| EmptyState panel-40 bg | B9 L191 | `var(--page)` | `--page` | ✅ |
| EmptyState panel-40 ic-wrap bg | B9 L196 | `var(--rail)` | `--rail` alias | ⚠️ MISSING. Resolution-1. |
| EmptyState panel-40 ic-wrap border | B9 L196 | `1px solid var(--line)` | `--line` | ✅ |
| EmptyState panel-40 ic-wrap ink | B9 L197 | `var(--ink-3)` | `--ink-3` | ✅ |
| EmptyState h5 | B9 L200 | `var(--ink)` | `--ink` | ✅ |
| EmptyState p | B9 L201 | `var(--ink-3)` | `--ink-3` | ✅ |
| EmptyState inline-32 ic-wrap bg | B9 L225 | `var(--fill)` | `--fill` | ✅ |
| EmptyState inline-32 ghost-link | B9 L247 | `var(--accent)` | `--accent` | ✅ |
| EmptyState inline-32 ghost-link hover bg | B9 L253 | `var(--line-2)` | `--line-2` | ✅ |
| **Error pages** `.err-page` bg | B2 L35 | `var(--bg)` `#242428` | `--color-bg` (canvas plate) | ✅ — note semantic inversion (`--bg` short = canvas plate, not page bg). See TOKEN_CANONICAL §2 footnote. |
| Error icon-tile bg | B2 L55 | `var(--bg)` `#242428` | `--color-bg` | ✅ |
| Error icon-tile ink | B2 L58 | `var(--ink-3)` | `--ink-3` | ✅ |
| Error h1 | B2 L67 | `var(--ink)` | `--ink` | ✅ |
| Error p | B2 L71 | `var(--ink-2)` | `--ink-2` | ✅ |
| **KovaButton** `.btn` (canonical) | kova-hifi.css L334 | bg `var(--page)` border `var(--line)` text `var(--ink)` | all ✅ | ✅ |
| KovaButton `.btn.primary` | kova-hifi.css L347 | bg `var(--ink)` text `#111` | ✅ | Note `#111` is a raw hex inside the canonical sheet — lint will fail unless exempted. |
| KovaButton `.btn.primary:hover` | L348 | bg `#fff` border `#fff` | ⚠️ **raw hex** in canonical CSS | ⚠️ Resolution-4 (token-exempt the canonical or extract to `--ink-on-primary`). |
| KovaButton `.btn.accent:hover` | L352 | bg `#2563eb` border `#2563eb` | ⚠️ **raw hex** in canonical CSS | ⚠️ Resolution-4. |
| **KovaPill** `.pill` | kova-hifi.css L367 | bg `var(--fill)` text `var(--ink-2)` | ✅ | ✅ |
| KovaPill `.pill.accent` | L376 | bg `var(--accent-soft)` text `var(--accent-ink)` border `var(--accent-2)` | `--accent-2` missing in @theme | ⚠️ Resolution-1. |
| KovaPill `.pill.outline` | L386 | bg `var(--page)` border `var(--line)` | ✅ | ✅ |
| **KovaInput** `.input` | kova-hifi.css L424 | bg `var(--page)` border `var(--line)` text `var(--ink)` | ✅ | ✅ |
| KovaInput `.input:focus` | L433 | border `var(--accent)` | ✅ | ✅ |
| **KovaField** `.field` | kova-hifi.css L440 | border `var(--line)` bg `var(--page)` | ✅ | ✅ |

---

## 2. Spacing (px exact)

| Primitive | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| **KovaToast** padding | B1 `.toast` L443 | `12px 14px` | on scale (12, 14) | ✅ |
| KovaToast gap | B1 L441 | `11px` | **NOT on scale (`2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32`)** | ⚠️ **MISSING — value `11px` not in spacing scale.** Resolution-5. |
| KovaToast min-width / max-width | B1 L442 | `280px / 420px` | n/a — sizing constraints | ⚠️ MISSING — should land as `--toast-min-w`, `--toast-max-w` tokens. Resolution-6. |
| KovaToast body gap | B1 L462 | `4px` | on scale | ✅ |
| KovaToast row-actions gap | B1 L468 | `14px` | on scale | ✅ |
| KovaToast row-actions margin-top | B1 L469 | `2px` | on scale | ✅ |
| KovaToast dismiss size | B1 L484 | `18×18px` | **NOT on scale (18 ≠ 16/20)** | ⚠️ Resolution-5. |
| KovaToast ic-lead margin-top | B1 L458 | `2px` | on scale | ✅ |
| KovaToast container position | B1 §3.1 PRD | `bottom: 22px; right: 22px` | matches `--toolbar-bottom` / `--zoom-hud-right` precedent. **NEW token needed:** `--toast-bottom`, `--toast-right` | ⚠️ Resolution-6. |
| KovaToast container max-width | B1 L437 | `420px` | n/a | ⚠️ Resolution-6 (`--toast-max-w`). |
| **KovaModal** padding `.dlg-head` | A6 L57 | `18px 22px 12px` | **NOT on scale (18 ≠ 16/20; 22 ≠ 20/24)** | ⚠️ Resolution-5 — modal-specific tokens. |
| KovaModal `.dlg-body` padding | A6 L73 | `4px 22px 18px` | 22 + 18 NOT on scale | ⚠️ Resolution-5. |
| KovaModal `.dlg-body` gap | A6 L74 | `14px` | on scale | ✅ |
| KovaModal `.dlg-foot` padding | A6 L79 | `14px 22px` | 22 NOT on scale | ⚠️ Resolution-5. |
| KovaModal `.dlg-foot` gap (right) | A6 L86 | `8px` | on scale | ✅ |
| KovaModal `.dlg-head` h3 → sub margin | A6 L64 | `4px 0 0` | on scale | ✅ |
| KovaModal close `.x` size | A6 L67 | `26×26px` | matches `--h-control-xs` (26px) | ✅ — proposed `--h-control-xs` from design.md §2. ⚠️ MISSING in @theme. Resolution-7. |
| KovaModal sm/md/lg widths | A6 L53-55 | `460 / 540 / 880` | n/a | ⚠️ Resolution-6 (`--modal-w-sm/md/lg`). |
| KovaModal field input padding | A6 L97 | `8px 11px` | **11 NOT on scale** | ⚠️ Resolution-5. |
| KovaModal field gap | A6 L89 | `6px` | on scale | ✅ |
| **KovaPopover** padding | A6 L117 | `6px` | on scale | ✅ |
| KovaPopover gap | A6 L119 | `4px` | on scale | ✅ |
| KovaPopover pop-search padding | A6 L124 | `6px 8px` | on scale | ✅ |
| KovaPopover pop-search margin | A6 L124 | `2px 2px 4px` | on scale | ✅ |
| KovaPopover pop-row padding | A6 L135 | `6px 8px` | on scale | ✅ |
| KovaPopover pop-row gap | A6 L134 | `9px` | **NOT on scale (9 ≠ 8/10)** | ⚠️ Resolution-5. |
| KovaPopover pop-row .logo size | A6 L141 | `22×22px` | not on scale | ⚠️ Resolution-5. |
| KovaPopover pop-foot padding | A6 L156 | `7px 8px` | **7 NOT on scale** | ⚠️ Resolution-5. |
| KovaPopover avatar pop-hdr padding | A6 L167 | `10px 10px 8px` | on scale | ✅ |
| KovaPopover avatar .av size | A6 L176 | `28×28px` | matches `--h-icon-btn` (28) | ✅ — but `--h-icon-btn` MISSING from @theme. Resolution-7. |
| KovaPopover min-width | A6 L120 | `240px` | n/a | ⚠️ Resolution-6 (`--popover-min-w`). |
| KovaPopover.avatar min-width | A6 L164 | `240px` | same | ⚠️ Resolution-6. |
| KovaPopover plan-pill padding | A6 L188 | `2px 8px` | on scale | ✅ |
| KovaPopover arrow size | A6 L214 | `10px × 10px` | on scale | ✅ |
| **KovaMenu** padding | `.menu` L128 | `4px` | on scale | ✅ |
| KovaMenu item height | `.menu .item` L141 | `26px` | matches `--h-control-xs` | ✅ pending token. Resolution-7. |
| KovaMenu item padding | L142 | `0 8px 0 10px` | on scale | ✅ |
| KovaMenu item gap | L140 | `10px` | on scale | ✅ |
| KovaMenu sep margin | L191 | `4px 4px` | on scale | ✅ |
| KovaMenu group label padding | L199 | `8px 10px 4px` | on scale | ✅ |
| KovaMenu min-width (default) | L130 | `220px` | n/a | ⚠️ Resolution-6 (`--menu-min-w`). |
| KovaMenu min-width w-260 / w-280 | L136-137 | `260 / 280` | on scale (multiples) | ⚠️ Resolution-6 (`--menu-min-w-md/lg`). |
| **KovaSkeleton** — no spacing of its own (consumer-cluster sets size). | n/a | n/a | n/a | n/a |
| **EmptyState** panel-40 padding | B9 L190 | `36px 24px` | 36 NOT on scale | ⚠️ Resolution-5 (`--empty-pane-pad-y`). |
| EmptyState panel-40 gap | B9 L192 | `6px` | on scale | ✅ |
| EmptyState panel-40 ic-wrap size | B9 L195 | `40×40px` | NOT on scale | ⚠️ Resolution-5 (`--empty-pane-icon-40`). |
| EmptyState panel-40 ic-wrap margin-bottom | B9 L198 | `4px` | on scale | ✅ |
| EmptyState inline-32 padding | B9 L219 | `24px 16px` | on scale | ✅ |
| EmptyState inline-32 gap | B9 L221 | `4px` | on scale | ✅ |
| EmptyState inline-32 ic-wrap size | B9 L224 | `32×32px` | on scale (32) | ✅ |
| EmptyState inline-32 cta-row margin-top | B9 L243 | `6px` | on scale | ✅ |
| EmptyState inline-32 ghost-link padding | B9 L249 | `4px 8px` | on scale | ✅ |
| EmptyState full-48 padding | B9 L300 | `56px 32px` | 56 NOT on scale | ⚠️ Resolution-5. |
| EmptyState full-48 ic-wrap size | B9 L305 | `48×48px` | on scale (32 + 16) | ✅ as multiple of 16 |
| **Error pages** `.err-page` padding | B2 L38 | `32px 24px` | on scale | ✅ |
| Error `.err-page` gap | B2 L39 | `22px` | NOT on scale | ⚠️ Resolution-5. |
| Error `.err-card` width | B2 L44 | `420px` | n/a | ⚠️ Resolution-6 (`--err-card-w`). |
| Error `.err-card` padding | B2 L45 | `40px 32px` | 40 NOT on scale | ⚠️ Resolution-5. |
| Error `.err-card` gap | B2 L48 | `14px` | on scale | ✅ |
| Error icon-tile size | B2 L53 | `48×48px` | on scale (32+16) | ✅ |
| Error icon-tile ic size | B2 L61 | `24×24px` | on scale | ✅ |
| Error icon-tile margin-bottom | B2 L59 | `6px` | on scale | ✅ |
| Error cta-stack width | B2 L77 | `280px max-w` | n/a | ⚠️ Resolution-6. |
| Error cta-stack margin-top | B2 L80 | `12px` | on scale | ✅ |
| Error cta-stack gap | B2 L79 | `8px` | on scale | ✅ |
| Error btn padding | B2 L84 | `9px 14px` | **9 NOT on scale** | ⚠️ Resolution-5. |
| Error btn.text padding | B2 L88 | `6px 8px` | on scale | ✅ |

---

## 3. Typography

| Primitive | Selector/Line | font-size/weight/line-height/tracking | Maps to | Status |
|---|---|---|---|---|
| KovaToast text | B1 `.toast` L450, L452 | 12.5 / 1.45 / 400 / 0 | `--t-body` (12.5/1.35/400/0) — line-height drift (1.45 vs spec 1.35) | ⚠️ Resolution-8 (typography scale not in @theme; `.toast` line-height 1.45 ≠ canonical 1.35). |
| KovaToast meta | B1 L466 | 11.5 / — / — / — | `--t-meta` (11.5/1.3/400/0) | ⚠️ Resolution-8. |
| KovaToast action | B1 L472, L476 | 12 / 1 / 500 / -0.003em | **font-size 12 not in scale** (scale has 11.5, 12.5, 13) | ⚠️ Resolution-8 — proposed `--t-action-12`. |
| KovaToast dismiss .ic | B1 L491 | 13×13px icon | n/a | ✅ |
| KovaModal `.dlg-head h3` | A6 L61 | 16 / — / 600 / -0.005em | **NOT in design.md type scale** (scale tops at 15) | ⚠️ Resolution-8 — proposed `--t-modal-title` (16/?/600/-0.005em). |
| KovaModal `.dlg-head .sub` | A6 L64 | 12.5 / 1.5 / 400 / 0 | `--t-body` (line-height drift 1.5 vs 1.35) | ⚠️ Resolution-8. |
| KovaModal `.dlg-foot .l` | A6 L85 | 11.5 / — / — / — | `--t-meta` | ⚠️ Resolution-8. |
| KovaModal field label | A6 L91 | 12 / — / 500 / -0.003em | **font-size 12 NOT in scale** | ⚠️ Resolution-8. |
| KovaModal field help | A6 L94 | 11.5 / — / — / — | `--t-meta` | ⚠️ Resolution-8. |
| KovaModal field input | A6 L97 | 13 / — / — / — | **NOT in scale** (scale has 12.5, 13 missing; design.md §1.2 has no 13 entry; closest is `--t-title-sm` 13/1.3/600 — but this is non-bold input value) | ⚠️ Resolution-8 — proposed `--t-input` (13/?/400/0). |
| KovaPopover pop-search | A6 L127 | 12.5 / — / — / — | `--t-body` | ✅ |
| KovaPopover pop-row | A6 L136 | 12.5 / — / 500 (.nm) / — | `--t-body` or `--t-body-strong` | ✅ |
| KovaPopover pop-row.logo | A6 L142 | 10 / — / 700 / -0.02em | **NOT in scale (10, 700 tracking unique)** | ⚠️ Resolution-8 — possibly OK as one-off avatar text. |
| KovaPopover pop-row.meta | A6 L150 | 10.5 / — / — / — | **NOT in scale (10.5)** | ⚠️ Resolution-8. |
| KovaPopover avatar plan-pill | A6 L189 | 10.5 / — / 600 / -0.003em | NOT in scale | ⚠️ Resolution-8. |
| KovaPopover kbd | A6 L200 | 10 / — / — / — | NOT in scale | ⚠️ Resolution-8. |
| KovaMenu item | `.menu` L132 | 12.5 / 1 (`line-height: 1` L146) / — / — | `--t-body` (line-height drift 1 vs 1.35) | ⚠️ Resolution-8. |
| KovaMenu kbd-row | L163 | 11 / — / — / — | NOT in scale | ⚠️ Resolution-8. |
| KovaMenu group label | L196-197 | 9.5 / — / 500 / — | NOT in scale (9.5 microcopy) | ⚠️ Resolution-8. |
| EmptyState panel-40 h5 | B9 L200 | 13 / — / 600 / -0.005em | matches `--t-title-sm` (13/1.3/600/-0.005em) | ✅ |
| EmptyState panel-40 p | B9 L201 | 12 / 1.5 / — / — | font 12 NOT in scale | ⚠️ Resolution-8. |
| EmptyState inline-32 h5 | B9 L230-231 | 12.5 / — / 500 / 0 | `--t-body-strong` (12.5/1.35/500/0) | ✅ |
| EmptyState inline-32 p | B9 L239 | 11.5 / 1.5 / — / — | `--t-meta` | ✅ |
| EmptyState inline-32 ghost-link | B9 L248 | 12 / — / 500 / -0.003em | font 12 NOT in scale | ⚠️ Resolution-8. |
| EmptyState full-48 h5 | B9 L312 | 15 / — / 600 / — | matches `--t-title-md` (15/1.3/600/-0.005em) | ✅ |
| Error pages h1 | B2 L65 | 15 / — / 600 / -0.005em | `--t-title-md` | ✅ |
| Error pages p | B2 L71 | 12.5 / 1.55 / — / — | `--t-body` (line-height drift 1.55 vs 1.35) | ⚠️ Resolution-8. |
| Error pages btn | B2 L84 | 13 / — / — / — | NOT in scale | ⚠️ Resolution-8. |
| Error pages btn.text | B2 L89 | 12.5 / — / — / — | `--t-body` | ✅ |
| KovaButton `.btn` | kova-hifi.css L336 | 12.5 / — / 500 / -0.003em | `--t-body-strong` | ✅ |
| KovaButton `.btn.sm` | L356 | 12 / — / — / — | NOT in scale | ⚠️ Resolution-8. |
| KovaPill | L370 | 11.5 / — / 500 / -0.003em | `--t-meta` (font + weight 500 drift) | ⚠️ Resolution-8. |
| KovaInput `.input` | L427 | 13 / — / — / — | NOT in scale (input default value) | ⚠️ Resolution-8 — `--t-input`. |
| KovaField `.lbl` | L446 | 11 / — / — / 0 | NOT in scale (11 ≠ 11.5) | ⚠️ Resolution-8. |
| KovaField `.val` | L449 | 13 / — / — / — | `--t-input` | ⚠️ Resolution-8. |

**Summary:** the design.md §1.2 type scale (`--t-overline`, `--t-label`, `--t-body`, `--t-body-strong`, `--t-title-sm`, `--t-title-md`, `--t-meta`) does NOT exist as CSS custom properties in `kova-hifi.css :root` OR `src/app.css @theme`. Mockups inline `font-size: 12.5px` etc. directly. **The lint rule will fire on every raw px.** Resolution-8 is the foundational typography token decision.

---

## 4. Radii

| Primitive | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| KovaToast | B1 L446 | `5px` | `--r-md` (design.md §1.4) | ⚠️ **MISSING — radii tokens not in @theme** Resolution-9. |
| KovaToast dismiss | B1 L485 | `3px` | `--r-xs` | ⚠️ Resolution-9. |
| KovaModal shell | A6 L48 | `10px` | `--r-2xl` | ⚠️ Resolution-9. |
| KovaModal close `.x` | A6 L67 | `5px` | `--r-md` | ⚠️ Resolution-9. |
| KovaModal foot corners | A6 L83-84 | `10px` (bottom corners only) | `--r-2xl` | ⚠️ Resolution-9. |
| KovaModal field input | A6 L97 | `6px` | `--r-lg` | ⚠️ Resolution-9. |
| KovaPopover shell | A6 L117 | `8px` | NOT in `design.md §1.4` (8 is between `--r-xl 7` and `--r-2xl 10`) | ⚠️ **MISSING — `8px` radius not on canonical scale.** Resolution-10. |
| KovaPopover pop-search | A6 L125 | `6px` | `--r-lg` | ⚠️ Resolution-9. |
| KovaPopover pop-row | A6 L135 | `5px` | `--r-md` | ⚠️ Resolution-9. |
| KovaPopover pop-foot | A6 L156 | `5px` | `--r-md` | ⚠️ Resolution-9. |
| KovaPopover plan-pill | A6 L188 | `999px` | `--r-pill` | ⚠️ Resolution-9. |
| KovaPopover .av (avatar) | A6 L176 | `50%` | `--r-pill` (50% circle == pill behavior on square) | ✅ |
| KovaPopover kbd | A6 L202 | `3px` | `--r-xs` | ⚠️ Resolution-9. |
| KovaMenu | `.menu` L127 | `8px` | NOT in scale (same as popover — `8px`) | ⚠️ Resolution-10. |
| KovaMenu item | L143 | `5px` | `--r-md` | ⚠️ Resolution-9. |
| KovaSkeleton default | B7 L69 | `5px` | `--r-md` | ⚠️ Resolution-9. |
| KovaSkeleton variants | B7 L98-101 | `999/6/3/50%` | `--r-pill/--r-lg/--r-xs/circle` | ⚠️ Resolution-9. |
| EmptyState panel-40 outer | B9 L189 | `8px` | NOT in scale (8 — same as popover/menu) | ⚠️ Resolution-10. |
| EmptyState panel-40 ic-wrap | B9 L195 | `50%` | `--r-pill` (circle) | ✅ |
| EmptyState inline-32 ic-wrap | B9 L227 | `5px` | `--r-md` | ⚠️ Resolution-9. |
| EmptyState inline-32 ghost-link | B9 L249 | `4px` | `--r-sm` | ⚠️ Resolution-9. |
| EmptyState full-48 ic-wrap | B9 L308 | `50%` | `--r-pill` | ✅ |
| Error icon-tile | B2 L54 | `6px` | `--r-lg` | ⚠️ Resolution-9. |
| KovaButton `.btn` | kova-hifi.css L335 | `6px` | `--r-lg` | ⚠️ Resolution-9. |
| KovaPill | L369 | `999px` | `--r-pill` | ⚠️ Resolution-9. |
| KovaInput `.input` | L426 | `6px` | `--r-lg` | ⚠️ Resolution-9. |
| KovaField | L441 | `6px` | `--r-lg` | ⚠️ Resolution-9. |

**Summary:** every primitive uses a radius from `design.md §1.4` (or close to it). The radii tokens (`--r-xs`/`--r-sm`/`--r-md`/`--r-lg`/`--r-xl`/`--r-2xl`/`--r-pill`) are defined in design.md but **NOT in `kova-hifi.css :root` OR `src/app.css @theme`**. Mockups hardcode the px. Resolution-9 + Resolution-10 below.

**Drift:** popover + menu + empty-pane outer + scene-card outer all use `8px`. Design.md §1.4 scale is `3/4/5/6/7/10`. **`8px` is OFF the scale.** Per drift protocol §7 — founder picks:
- (a) Extend the scale to include `--r-overlay: 8px` (new role for floating overlays).
- (b) Update the hi-fi mockups to use `--r-xl: 7px` or `--r-2xl: 10px`.
- (c) Keep `8px` as a literal (token-exempt comment).

---

## 5. Shadows

| Primitive | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| KovaToast | B1 L447-449 | `0 8px 24px -6px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset` | matches design.md §1.6 "Floating" | ⚠️ **MISSING — `--shadow-elev-1` token NOT in @theme.** Resolution-11. |
| KovaModal | A6 L48 | `0 24px 80px -20px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.03) inset` | NOT in design.md §1.6 (closest: "Page" `0 30px 80px -20px rgba(0,0,0,0.8)`) | ⚠️ **MISSING — modal needs its own shadow tier between Floating + Page.** Resolution-11 — propose `--shadow-elev-3` (modal). |
| KovaPopover | A6 L118 | `0 16px 60px -20px rgba(0,0,0,0.7)` | NOT in design.md §1.6 | ⚠️ MISSING. Resolution-11 — propose `--shadow-elev-2` (popover). |
| KovaMenu | `.menu` L129 | `0 24px 60px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)` | NOT in design.md §1.6 | ⚠️ MISSING. Resolution-11 — propose `--shadow-elev-2-menu` OR reuse popover stack. |
| KovaSkeleton | none | n/a | per Ban 7 (no shadows on cards) | ✅ |
| EmptyState | none | n/a | per Ban 7 | ✅ |
| Error pages | none | n/a | per Ban 7 (focal surface, no chrome) | ✅ |
| Sentry / others | n/a | n/a | n/a | n/a |

**Summary:** design.md §1.6 names two elevations (Floating + Page). Hi-fi mockups use FOUR distinct shadow stacks (toast, modal, popover, menu). **Resolution-11** — name 3-4 shadow tokens (`--shadow-elev-1/2/3`, possibly `--shadow-elev-page`) + update design.md §1.6 + add to `kova-hifi.css :root` + `src/app.css @theme`.

---

## 6. Motion

| Primitive | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| KovaSkeleton shimmer | B7 L84 | `1.4s ease-in-out infinite` (keyframes `skeleton-shimmer`) | design.md §1.7 says "no motion tokens yet" | ⚠️ **MISSING — `--motion-skeleton` token + canonical easings not defined.** Resolution-12. |
| KovaToast enter/exit | PRD 11 — not specified | inferred Reka Toast defaults | n/a | ⚠️ Resolution-12 — propose `--motion-toast-enter: 200ms`. |
| KovaModal backdrop fade | n/a in hi-fi | n/a | n/a | ⚠️ Resolution-12. |
| KovaButton `.btn` transitions | kova-hifi.css L340 | `border-color 0.1s ease, background 0.1s ease` | not in scale | ⚠️ Resolution-12 — `--motion-fast: 100ms`. |
| KovaInput focus transition | L429 | `border-color 0.1s ease, box-shadow 0.1s ease` | `--motion-fast` | ⚠️ Resolution-12. |
| `prefers-reduced-motion` | B7 L90-93 | skeleton fallback to static `--fill-2` | engineering implementation | ⚠️ — `useReducedMotion()` composable per Plan 11 Task 2.2. |

---

## 7. Z-index

| Primitive | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| KovaToast container | B1 L435 | `z-index: 20` | n/a — z-scale not tokenized | ⚠️ **MISSING — z-scale not in @theme.** Resolution-13. |
| KovaModal | A6 L49 | `z-index: 10` | conflicts with PRD 11 §3.1 last paragraph: "modal backdrop z-index 19; toasts z-20" | ⚠️ Resolution-13. |
| KovaModal backdrop | PRD 11 §3.3 | `z-index: 19` | n/a | ⚠️ Resolution-13. |
| KovaPopover | A6 L115 | `z-index: 10` | n/a | ⚠️ Resolution-13. |
| KovaMenu | `.menu` L131 | `z-index: 10` | n/a | ⚠️ Resolution-13. |

**Conflict between hi-fi and PRD 11:** hi-fi `.dlg z-index: 10` but PRD 11 §3.1 specifies `toasts z-20, modal backdrop z-19, modal content z-?` Resolution-13 must name an explicit z-scale (e.g., `--z-popover: 10`, `--z-dropdown: 12`, `--z-modal-backdrop: 19`, `--z-modal: 20`, `--z-toast: 30`).

---

## 8. Sizing (heights / fixed dims)

| Primitive | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| KovaToast min/max width | B1 L442 | 280 / 420 | not tokenized | ⚠️ Resolution-6. |
| KovaModal widths sm/md/lg | A6 L53-55 | 460 / 540 / 880 | not tokenized | ⚠️ Resolution-6. |
| KovaModal close `.x` | A6 L67 | 26×26 | `--h-control-xs` | ⚠️ Resolution-7. |
| KovaPopover min-width | A6 L120 | 240 | not tokenized | ⚠️ Resolution-6. |
| KovaPopover .av | A6 L176 | 28×28 | `--h-icon-btn` | ⚠️ Resolution-7. |
| KovaPopover .logo | A6 L141 | 22×22 | not tokenized — sub-spec | ⚠️ Resolution-5. |
| KovaMenu min-widths | L130, 136, 137 | 220 / 260 / 280 | not tokenized | ⚠️ Resolution-6. |
| KovaMenu item height | L141 | 26 | `--h-control-xs` | ⚠️ Resolution-7. |
| KovaButton `.btn` height | implicit padding (7+7) | ~30px | `--h-control` | ⚠️ Resolution-7. |
| KovaButton `.btn.sm` height | implicit (5+5) | ~26px | `--h-control-xs` | ⚠️ Resolution-7. |
| KovaButton `.btn.icon` size | L358 | 30×30 | `--h-control` | ⚠️ Resolution-7. |
| KovaButton `.btn.icon.sm` size | L359 | 26×26 | `--h-control-xs` | ⚠️ Resolution-7. |
| KovaInput `.input` height | L425 (padding 7+7 +1px*2 border) | ~30px | `--h-control` | ⚠️ Resolution-7. |
| EmptyState panel-40 ic-wrap | B9 L195 | 40×40 | not tokenized | ⚠️ Resolution-5. |
| EmptyState inline-32 ic-wrap | B9 L224 | 32×32 | on scale (=32) | ✅ |
| EmptyState full-48 ic-wrap | B9 L305 | 48×48 | on scale (=48 = 32+16) | ✅ |
| Error icon-tile | B2 L53 | 48×48 | on scale | ✅ |
| KovaSkeleton — consumer sets all dims. | n/a | n/a | n/a | n/a |

**Summary:** the density token block from `design.md §2` (`--h-control`, `--h-control-sm`, `--h-control-xs`, `--h-tool`, `--h-icon-btn`, `--h-topbar`, `--h-tabs`) is defined in the spec but NOT in `kova-hifi.css :root` OR `src/app.css @theme`. Resolution-7.

---

## 9. Density (rhythm — design.md §4)

| Rule | Where it bites | Token | Status |
|---|---|---|---|
| Default control 30px | KovaButton, KovaInput | `--h-control` | ⚠️ Resolution-7. |
| Compact rows 28px | layer/page rows (out of scope) | `--h-control-sm` | ⚠️ Resolution-7. |
| Segmented inner 26px | KovaSegmented (Cluster 11 ship), Menu item, Modal close | `--h-control-xs` | ⚠️ Resolution-7. |
| Topbar / Tabs 44px | KMarketingShell topbar (out of scope), KTopbar (Cluster 06) | `--h-topbar`, `--h-tabs` | ⚠️ Resolution-7. |
| Icon button floor 28px | KovaButton.icon | `--h-icon-btn` | ⚠️ Resolution-7. |

---

## 10. ⚠️ MISSING summary — 13 resolutions for founder

Every ⚠️ MISSING row above resolves to one of these 13 questions. The agent CANNOT proceed to Phase 2 until each is answered.

| # | Decision | Default recommendation (subject to founder) | Affects |
|---|---|---|---|
| **R-1** | Add `--rail`, `--accent-2`, `--warn`, `--warn-soft`, `--warn-edge`, `--ok`, `--ok-soft`, `--review`, `--review-soft` aliases to `src/app.css @theme`. Source-of-truth = `design-system/canonical/kova-hifi.css :root` (already declared). | YES — these are aliases that ALREADY exist in canonical; @theme just hasn't translated them. Required for `.toast.error/.popover.avatar/.menu.destructive` to render correctly. | Toast, Modal foot, Popover, Menu, Pill.accent. |
| **R-2** | Backdrop overlay token `--modal-backdrop` = `rgba(0, 0, 0, 0.72)`. | YES — matches PRD 11 §3.3. Add to @theme + kova-hifi.css. | Modal. |
| **R-3** | Focus-ring tokens for inputs in modal context. Hi-fi `.fld input.input:focus` uses `0 0 0 3px rgba(237,237,234,0.05)` (ink-tinted 5% alpha). Add as `--ring-focus-ink: 0 0 0 3px rgba(235,235,238,0.05)`. | YES, but matches the `.input:focus` in kova-hifi.css (canonical) which uses `border-color: var(--accent)` and `box-shadow: none` — i.e. canonical does NOT use the modal-form focus ring. **Sub-decision:** which is canonical — kova-hifi.css `.input:focus` (border-only) or modal `.fld .input:focus` (border `--ink-2` + ink-tinted glow)? | Modal forms, Input. |
| **R-4** | `.btn.primary:hover` (`#fff`) + `.btn.accent:hover` (`#2563eb`) are RAW HEX inside canonical kova-hifi.css. Options: (a) name them as tokens (`--ink-on-primary`, `--accent-hover`), OR (b) wrap with `/* token-exempt: design.md §3 reference impl */`. | (a) name them. `--ink-on-primary: #fff` and `--accent-hover: #2563eb`. Lint stays strict. | KovaButton. |
| **R-5** | Off-scale spacing values: 7, 9, 11, 18, 22, 36, 40 px. Adopt strategies: (a) round to nearest scale value globally (breaks fidelity), (b) extend scale, (c) keep as primitive-specific tokens. | (c) — each becomes a primitive-specific token (`--modal-pad-x: 22`, `--popover-row-gap: 9`, etc.). Spacing scale stays clean; primitives expose intent. | Toast, Modal, Popover, Menu, EmptyState, Error pages. |
| **R-6** | Sizing-constant tokens (modal widths 460/540/880; popover/menu mins 220/240/260/280; toast bounds 280/420; error card 420 / cta 280). Add as named tokens (`--modal-w-sm/md/lg`, `--popover-min-w-sm/md`, `--menu-min-w/-md/-lg`, `--toast-min-w/max-w`, `--err-card-w/cta-w`). | YES. | Modal, Popover, Menu, Toast, Error. |
| **R-7** | Density tokens from design.md §2 (`--h-control`, `--h-control-sm`, `--h-control-xs`, `--h-tool`, `--h-icon-btn`, `--h-topbar`, `--h-tabs`). Add to kova-hifi.css :root + src/app.css @theme. | YES — already in design.md §2 spec block. Just not in the actual CSS file. Add. | every primitive with height. |
| **R-8** | Typography scale tokens from design.md §1.2 (`--t-overline`, `--t-label`, `--t-body`, `--t-body-strong`, `--t-title-sm`, `--t-title-md`, `--t-meta`). PLUS new entries for 10 (avatar logo), 10.5 (sublabel), 11 (kbd), 12 (modal field label / btn.sm / inline ghost-link), 13 (modal field input / error btn), 16 (modal head h3), and line-height variants (1.45 toast, 1.5 inline-32 / modal sub, 1.55 error p, 1 menu item). Either: (a) extend the scale with all variants (`--t-input: 13/1.4/400`, `--t-action-12: 12/1/500/-0.003em`, etc.), (b) keep scale narrow + use Tailwind arbitrary classes (which the lint will block). | (a) extend the scale. Document additions in design.md §1.2 changelog. | every primitive with text. |
| **R-9** | Radii tokens from design.md §1.4 (`--r-xs/sm/md/lg/xl/2xl/pill`). Add to kova-hifi.css :root + src/app.css @theme. | YES — already in design.md §1.4 spec. | every primitive with radius. |
| **R-10** | Off-scale radius `8px` (used by popover shell + menu + empty-pane outer + scene-card). NOT in design.md §1.4 scale (3/4/5/6/7/10). Options: (a) extend scale with new role `--r-overlay: 8px`, (b) update hi-fi mockups to use `--r-xl: 7` or `--r-2xl: 10`, (c) `/* token-exempt */` literal. | (a) — `--r-overlay: 8px` named for floating-overlay surfaces. Add to design.md §1.4. | Popover, Menu, EmptyState panel outer. |
| **R-11** | Shadow tokens. Hi-fi uses 4 distinct stacks (toast/modal/popover/menu) — design.md §1.6 names only 2 (Floating + Page). Propose: `--shadow-elev-1` (toast — `0 8px 24px -6px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset`), `--shadow-elev-2` (popover + menu — `0 16px 60px -20px rgba(0,0,0,0.7)` for popover; `0 24px 60px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)` for menu — option (a) split into two, (b) reuse one), `--shadow-elev-3` (modal — `0 24px 80px -20px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.03) inset`), `--shadow-elev-page` (existing canvas page shell — `0 30px 80px -20px rgba(0,0,0,0.8)`). | Three-tier (1 toast, 2 popover/menu shared, 3 modal) + page. Update design.md §1.6 + add to kova-hifi.css + @theme. | Toast, Modal, Popover, Menu. |
| **R-12** | Motion tokens. design.md §1.7 says "defer". Cluster 11 NEEDS at least: `--motion-fast: 100ms` (button/input transitions), `--motion-skeleton: 1400ms ease-in-out` (shimmer), `--motion-toast-enter: 200ms ease-out` (toast pop), `--motion-toast-exit: 150ms ease-in`, easings `--ease-out: cubic-bezier(0.2, 0, 0, 1)`, `--ease-in-out: ease-in-out`. PLUS `prefers-reduced-motion: reduce` global handler via `useReducedMotion()`. | YES — name 5 tokens. Update design.md §1.7. | Skeleton, Toast, Button, Input. |
| **R-13** | Z-scale tokens. Hi-fi uses 10 (popover/menu/modal-content), 20 (toast). PRD 11 §3.1 specifies toast=20 and modal-backdrop=19. Propose `--z-popover: 10`, `--z-dropdown: 12`, `--z-modal-backdrop: 19`, `--z-modal: 20`, `--z-toast: 30` (PRD §3.1 puts toast above modal, contradicting hi-fi `.dlg z-index: 10` which would render below toast z-20). | YES — name them. PRD wins over hi-fi inline z-index (PRD §3.1 says "Toast renders ABOVE modal backdrop"). | every overlay primitive. |

---

## 11. What lands where after founder approval

- **`design-system/canonical/kova-hifi.css :root`** — extend with R-1, R-2, R-3, R-4 (named tokens), R-5 (primitive-specific tokens prefixed `--modal-*`, `--popover-*`, etc.), R-6, R-7, R-8, R-9, R-10 (`--r-overlay`), R-11, R-12, R-13.
- **`src/app.css @theme`** — mirror every new short-name above. Also add the type scale entries (R-8) so Tailwind utility classes (`text-t-body`, `text-t-title-sm`) work.
- **`design-system/canonical/design.md`** — update §1.2 (typography additions), §1.4 (`--r-overlay`), §1.6 (shadow scale), §1.7 (motion scale + easings), §1.8 NEW (z-scale).
- **`design-system/canonical/TOKEN_CANONICAL.md`** — add every new short-name to §2 reference tables.
- **Hi-fi mockups** — NOT edited (per hifi/README.md "Do NOT edit the HTML files… preserve original markup"). Existing px values stay; the visual-diff fixture neutralizes drift.

**After founder approves R-1 through R-13, the agent will:**
1. Apply token additions across kova-hifi.css + app.css + design.md + TOKEN_CANONICAL.md (4 files, 1 commit).
2. Build `/dev/tokens` debug route per IMPLEMENTATION_PROMPT.md §4 step 6.
3. Pause + screenshot for founder approval before Phase 3 (primitive impl).

---

## 12. Citation discipline

All ✅ rows above reference existing tokens. All ⚠️ rows have the source line in the hi-fi HTML. **No row is silent. No row is rounded.** Per IMPLEMENTATION_PROMPT.md §7 drift protocol.

End of `cluster-11-tokens-used.md`.
