# Cluster 02 — Tokens Used

Generated 2026-05-25. Phase 1 gate per IMPLEMENTATION_PROMPT.md §3. Every visual value in Cluster 02 (Onboarding + Dashboard) hi-fi surfaces mapped to either an existing token in `kova-hifi.css :root` or ⚠️ MISSING with drift-protocol resolution.

## Source files

- `design-system/hifi/dashboard/Kova Hi-Fi 03 Brand Dashboard - Dark.html` — 03.a (sidebar, topbar, content, composer, greeting, file-grid, sec-head, file-card, status-tag, frame-count, thumb-frame/-flow/-ab, upnext)
- `design-system/hifi/onboarding/Kova Hi-Fi A1 Onboarding - Dark.html` — A1.01.c/d/e/f (onb-shell, onb-progress, onb-card, onb-eyebrow, onb-field, onb-input-affixed, onb-actions, onb-stack-card, onb-connect, onb-drop, onb-textarea, onb-files, onb-ai, otp, onb-splash, onb-next, onb-id-row)
- `design-system/hifi/brand-mgmt/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html` — A2.a only for the `.brand-switch` trigger wiring + popover behavior referenced by sidebar; full A2/A3 modal owned by Cluster 03
- `design-system/hifi/onboarding/Kova Hi-Fi B11 Canvas Creation Transition - Dark.html` — B11.1–B11.4 (composer-input.submitting/.review, composer-status, go-spin, spinner, content.transition-fade, splash-stage/-spinner/-cap)
- `design-system/hifi/states/Kova Hi-Fi B7 Loading Skeletons - Dark.html` — B7.1 dashboard skeleton (skeleton + shimmer + r-pill / r-card / r-line / r-circle variants)
- `design-system/hifi/dashboard/Kova Hi-Fi A11+A12+A13+A_canvas_nav - Dark.html` — A11.1 zero-canvases, A11.7 zero-brands (empty-pane + empty-card.tall frame), A12.1–A12.3 (cs-pane, cs-tabs)
- `design-system/hifi/states/Kova Hi-Fi B9 List Search Empty - Dark.html` — B9.1/.2 inline list zero-results (empty-pane.inline)

## Colors

| Mockup file | Selector/Line | Hex / rgba | Maps to | Status |
|---|---|---|---|---|
| Dashboard 03.a | `.app` / `.main` / `.topbar` / `.brand-switch` background | `var(--page)` | `--page` | ✅ |
| Dashboard 03.a | `.sidebar` background | `var(--rail)` | `--rail` | ✅ |
| Dashboard 03.a | structural hairlines (`.topbar`, `.sidebar`, `.brand-switch`, `.side-search` border) | `var(--line)` | `--line` | ✅ |
| Dashboard 03.a | in-panel hairlines (`.side-footer` top, `.upnext-row` bottom, `.thumb` bottom) | `var(--line-2)` | `--line-2` | ✅ |
| Dashboard 03.a L933 | `.brand-switch .logo` background | `#ededea` | (no token) | ⚠️ MISSING |
| Dashboard 03.a L933 | `.brand-switch .logo` color | `#0d0d0c` | (no token) | ⚠️ MISSING |
| Dashboard 03.a L940 | `.btn.primary` background / border | `#ededea` | (no token) | ⚠️ MISSING (paired with above) |
| Dashboard 03.a L940 | `.btn.primary` color | `#0d0d0c` | (no token) | ⚠️ MISSING (paired) |
| Dashboard 03.a L941 | `.btn.primary:hover` bg | `#ffffff` | (no token) | ⚠️ MISSING |
| Dashboard 03.a L945 | `.btn.accent:hover` bg | `#7a93ff` | (no token; accent-tint) | ⚠️ MISSING |
| Dashboard 03.a | `.btn.accent` bg/border | `var(--accent)` | `--accent` | ✅ |
| Dashboard 03.a | `.btn.accent` text | `#fff` | (no token — accent-ink-on-blue) | ⚠️ MISSING |
| Dashboard 03.a | `.nav .item:hover` bg / `.side-footer .more:hover` bg | `var(--line-2)` | `--line-2` | ✅ |
| Dashboard 03.a L207 | `.nav .item.active` bg | `var(--fill)` | `--fill` | ✅ |
| Dashboard 03.a | text primary / secondary / tertiary | `var(--ink)` / `--ink-2` / `--ink-3` | ink ramp | ✅ |
| Dashboard 03.a L236 | `.side-footer .avatar` bg | `var(--warn)` (resolves to `--ink-2`) | `--warn` alias | ✅ (degrades neutral per design.md §5 ban 12) |
| Dashboard 03.a L237 | `.side-footer .avatar` color | `#fff` | (no token) | ⚠️ MISSING (same as btn.accent text) |
| Dashboard 03.a L965 | `.file-card .thumb` bg | `var(--fill)` | `--fill` | ✅ |
| Dashboard 03.a L969,977,982 | `.thumb-frame .tb` / `.thumb-flow .mini u` / `.thumb-ab .half u` bg | `var(--fill-2)` | `--fill-2` | ✅ |
| Dashboard 03.a L972 | `.thumb-frame .tb.hero` gradient stops | `#1f1f1d` / `#262622` | (no token — placeholder stripe) | ⚠️ MISSING |
| Dashboard 03.a L976 | `.thumb-flow .mini i` gradient stops | `#1f1f1d` / `#262622` | (no token) | ⚠️ MISSING (same pair) |
| Dashboard 03.a L981 | `.thumb-ab .half i` gradient stops | `#1f1f1d` / `#262622` | (no token) | ⚠️ MISSING (same pair) |
| Dashboard 03.a L974,978 | `.thumb-frame .tb.cta` / `.thumb-flow .mini s` bg | `#ededea` | (no token; pairs w/ brand-logo) | ⚠️ MISSING (same as brand logo) |
| Dashboard 03.a L986 | `.file-card .status-tag` bg | `rgba(20,20,18,0.94)` | (no token) | ⚠️ MISSING |
| Dashboard 03.a L989 | `.status-tag.ok` border / bg | `rgba(94,194,125,0.25)` / `rgba(15,30,22,0.92)` | (no token; status palette deferred) | ⚠️ MISSING (status deferred per §5 ban 12 — keep literal) |
| Dashboard 03.a L990 | `.status-tag.scheduled` bg | `rgba(26,31,61,0.92)` | (no token) | ⚠️ MISSING |
| Dashboard 03.a | `.status-tag.scheduled` color / border | `var(--accent-ink)` / `var(--accent-2)` | tokens | ✅ |
| Dashboard 03.a L991 | `.frame-count` bg | `rgba(20,20,18,0.88)` | (no token) | ⚠️ MISSING |
| A1.01.c-e | `.onb-shell` / `.onb-card` bg | `var(--page)` | `--page` | ✅ |
| A1.01.c-e | `.onb-progress` border / `.onb-or` dividers / `.onb-connect .head` border | `var(--line-2)` | `--line-2` | ✅ |
| A1.01.c L63 | `.onb-progress .wordmark .glyph` bg / color | `#ededea` / `#0d0d0c` | (no token) | ⚠️ MISSING (same pair) |
| A1.01.c | `.onb-progress .dot.done` bg | `var(--ink-3)` | `--ink-3` | ✅ |
| A1.01.c | `.onb-progress .dot.active` bg | `var(--ink)` | `--ink` | ✅ |
| A1.01.c | `.onb-progress .dot` bg (idle) | `var(--line-2)` | `--line-2` | ✅ |
| A1.01.c-e | `.onb-input-affixed .pre` / `.onb-stack-card` / `.onb-connect` / `.onb-drop` / `.onb-id-row .logo-slot` bg | `var(--rail)` | `--rail` | ✅ |
| A1.01.c L189 | `.onb-id-row .logo-slot.fetched` bg / color | `#0d0d0c` / `#ededea` | (no token) | ⚠️ MISSING (same pair) |
| A1.01.c L195 | `.onb-id-row .logo-slot .pulse` gradient | `rgba(237,237,234,0.04)` | (no token) | ⚠️ MISSING |
| A1.01.d L244 | `.onb-connect .head .glyph` (Shopify) bg | `#95bf47` | (no token; vendor brand color) | ⚠️ MISSING |
| A1.01.d L244 | `.onb-connect .head .glyph` color | `#0d0d0c` | (no token) | ⚠️ MISSING (same pair) |
| A1.01.e | `.onb-ai` border / bg / text | `var(--accent-2)` / `--accent-soft` / `--accent-ink` | tokens | ✅ |
| A1.01.e L344 | `.onb-ai .top .pill` bg | `rgba(95,125,255,0.16)` | (no token; accent-blue tint) | ⚠️ MISSING |
| A1.01.e L361,363,365 | `.onb-ai .checks li.pending` text / icon / meta | `rgba(169,186,255,0.7)` / `rgba(169,186,255,0.5)` | (no token; accent-ink fade) | ⚠️ MISSING |
| A1.01.c L213 | `.otp .cell.cursor` box-shadow | `rgba(237,237,234,0.05)` | (no token) | ⚠️ MISSING |
| A1.01.f | `.onb-splash .check-medal` bg / color | `var(--ok-soft)` / `var(--ok)` | tokens (degrade neutral) | ✅ |
| A1.01.f L377 | `.onb-splash .check-medal` border | `rgba(94,194,125,0.18)` | (no token; status green) | ⚠️ MISSING (status deferred — keep literal) |
| A1.01.f | `.onb-next .opt` bg / hover bg | `var(--rail)` / `var(--page)` | tokens | ✅ |
| A2/A3 (sidebar trigger wiring) | `.brand-switch` (sidebar) uses Dashboard 03.a styles above | — | — | ✅ (no A2/A3-unique tokens at the trigger; popover modal owned by Cluster 03) |
| B11.2/.3 | `.composer-input.submitting/.review` text | `var(--ink-2)` | `--ink-2` | ✅ |
| B11.2 | `.composer-status .tick` color | `var(--accent)` | `--accent` | ✅ |
| B11.4 | `.splash-stage` bg | `var(--bg)` | `--bg` | ✅ |
| B11.4 | `.splash-spinner` color | `var(--ink-2)` | `--ink-2` | ✅ |
| B7.1 | `.skeleton` base bg | `var(--fill)` | `--fill` | ✅ |
| B7.1 | `.skeleton::before` shimmer mid-stop | `var(--fill-2)` | `--fill-2` | ✅ |
| B7.1 | `.skeleton::before` shimmer end-stops | `transparent` | — | ✅ (gradient-permitted exception per design.md §5 ban 5) |
| A11.1 / A11.7 | `.empty-pane` border / bg | `var(--line)` dashed / `var(--page)` | tokens | ✅ |
| A11.1 / A11.7 | `.empty-pane .ic-wrap` bg / border | `var(--rail)` / `var(--line)` | tokens | ✅ |
| A11.1 | `.empty-card.tall .frame .head-strip .crumb .logo` bg / color | `#ededea` / `#0d0d0c` | (no token) | ⚠️ MISSING (same pair) |
| A12.1–3 | `.cs-pane .ic-tile` bg / border | `var(--rail)` / `var(--line)` | tokens | ✅ |
| A12.1–3 | `.cs-tabs .tab.on` color / border | `var(--ink)` | `--ink` | ✅ |
| B9.1/.2 | `.empty-pane.inline .ic-wrap` bg | `var(--fill)` | `--fill` | ✅ |
| B9.1/.2 | `.empty-pane.inline .ghost-link` color | `var(--accent)` | `--accent` | ✅ |

## Spacing (px exact)

| Mockup file | Selector / role | Value | Maps to | Status |
|---|---|---|---|---|
| Dashboard 03.a | `.sidebar` grid col width | 236px | (chrome dimension — not on spacing scale) | ✅ (canonical density: sidebar fixed col, design.md §3.2-adjacent) |
| Dashboard 03.a | `.sidebar` padding | 10/10/8 | scale | ✅ |
| Dashboard 03.a | `.topbar` height / `.topbar` padding x | 52 / 20 | (52 chrome height) / scale | ✅ (52 = topbar density; 20 on scale) |
| Dashboard 03.a | `.content` padding | 48/32/40 | (48 / 40 off-scale chrome whitespace) | ⚠️ on scale-adjacent (48, 40 not in canonical 2/4/6/8/10/12/14/16/20/24/32; commonly accepted as 16-multiples) |
| Dashboard 03.a | `.content` gap | 40 | (off-scale) | ⚠️ on scale-adjacent |
| Dashboard 03.a | `.greeting` padding | 24 / 8 | scale | ✅ |
| Dashboard 03.a | `.composer` gap | 16 | scale | ✅ |
| Dashboard 03.a | `.composer-input-wrap` padding | 18 / 20 / 12 | (18 not on canonical) | ⚠️ on scale-adjacent |
| Dashboard 03.a | `.composer-input` `min-height` | 56 | (chrome height) | ✅ (chrome density) |
| Dashboard 03.a | `.composer-input-tools .attach` w/h | 30 × 30 | matches `--h-icon-btn` adjacent (30 = `--h-control`) | ✅ |
| Dashboard 03.a | `.composer-input-tools .go` padding | 7 / 14 | (7 not on canonical) | ⚠️ on scale-adjacent (7 = canonical `.btn` pad) |
| Dashboard 03.a | `.composer-chip` padding | 7 / 14 | same as above | ⚠️ on scale-adjacent |
| Dashboard 03.a | `.composer-chips` gap | 6 | scale | ✅ |
| Dashboard 03.a | `.file-grid` gap | 14 | scale | ✅ |
| Dashboard 03.a | `.file-card .meta` padding | 10 / 12 / 12 | scale | ✅ |
| Dashboard 03.a | `.thumb-frame` padding | 7 / 6 | (7 not on canonical; 6 on) | ⚠️ on scale-adjacent (7 — same as button) |
| Dashboard 03.a | `.upnext-row` padding | 12 / 16 | scale | ✅ |
| Dashboard 03.a | `.upnext-foot` padding | 10 / 16 | scale | ✅ |
| A1.01.c-e | `.onb-progress` padding | 16 / 28 / 14 | (28 not on canonical) | ⚠️ on scale-adjacent |
| A1.01.c-e | `.onb-stage` padding | 40 / 24 / 56 | (40, 56 not on canonical) | ⚠️ on scale-adjacent (16-multiples) |
| A1.01.c | `.onb-card` width / wide | 480 / 560 | (card width — chrome dimension) | ✅ (chrome density) |
| A1.01.c | `.onb-card` gap | 22 | (22 not on canonical) | ⚠️ on scale-adjacent |
| A1.01.c | `.onb-id-row .logo-slot` w/h | 64 × 64 | (chrome density — logo slot) | ✅ |
| A1.01.c | `.otp .cell` w/h | 44 × 52 | (chrome density — OTP) | ✅ (44 = `--h-topbar`/`--h-tabs`; 52 paired) |
| A1.01.e | `.onb-drop` padding | 26 / 20 | (26 not on canonical) | ⚠️ on scale-adjacent |
| A1.01.f | `.onb-splash .check-medal` w/h | 56 × 56 | (chrome — medal) | ✅ |
| A1.01.f | `.onb-splash` gap | 26 | (26 not on canonical) | ⚠️ on scale-adjacent |
| B11.4 | `.splash-stage` gap | 18 | (18 not on canonical) | ⚠️ on scale-adjacent |
| B7.1 | `.skeleton` shimmer width | 50% | (relative) | ✅ |
| A11.1 | `.empty-pane` padding | 36 / 24 | (36 not on canonical) | ⚠️ on scale-adjacent |
| A11.7 | `.empty-pane .ic-wrap` w/h | 40 × 40 | (chrome — icon tile) | ✅ |
| A12 | `.cs-pane` padding | 56 / 48 | (off-scale) | ⚠️ on scale-adjacent (16-multiples) |
| A12 | `.cs-pane .ic-tile` w/h | 52 × 52 | (chrome — icon tile) | ✅ |
| B9.1/.2 | `.empty-pane.inline` padding | 24 / 16 | scale | ✅ |
| B9.1/.2 | `.empty-pane.inline .ic-wrap` w/h | 32 × 32 | scale | ✅ |

## Typography

| Mockup file | Selector | Size / weight | Maps to | Status |
|---|---|---|---|---|
| Dashboard 03.a | `.greeting .hello` | 28 / 600 | (display) | ⚠️ on scale-adjacent (greeting display size — outside type-scale; matches A1 `.onb-card h1` and A12 `h1`) |
| Dashboard 03.a | `.composer-input` | 15 / 400 | (input large) | ⚠️ on scale-adjacent (composer hero input — not in type-scale) |
| Dashboard 03.a | `.composer-input-tools .hint` / `.composer-input-tools .go` | 11 / 12 | (12 ≈ `--t-label`) | ✅ |
| Dashboard 03.a | `.composer-chip` | 12.5 / 400 | `--t-body` | ✅ |
| Dashboard 03.a | `.sec-head h4` | 14 / 600 | (between `--t-title-sm` 13 and `--t-title-md` 15) | ⚠️ on scale-adjacent |
| Dashboard 03.a | `.file-card .meta .title` | 13 / 600 | `--t-title-sm` | ✅ |
| Dashboard 03.a | `.file-card .meta .sub` | 11.5 / 400 | `--t-meta` | ✅ |
| Dashboard 03.a | `.upnext-row .when .day` / `.upnext-row .title .t` | 13 / 600 / 500 | `--t-title-sm` / `--t-body-strong` | ✅ |
| Dashboard 03.a L186-191 | `.nav .section` | 10 / 500 / 0.12em / UPPER | (10 — slightly below `--t-overline` 11) | ⚠️ on scale-adjacent |
| Dashboard 03.a | `.nav .item` / sidebar items | 13 / 400 | (13 = `--t-title-sm` size but body weight) | ⚠️ on scale-adjacent (nav-item density convention) |
| Dashboard 03.a L933-934 | `.brand-switch .logo` | 11 / 700 | (700 weight allowed per design.md §1.2) | ✅ |
| Dashboard 03.a L219 | `.nav .item .count` | 10.5 / 400 | (off-scale — count badge) | ⚠️ on scale-adjacent |
| A1.01.c-f | `.onb-card h1` | 26 / 600 / -0.018em | (display) | ⚠️ on scale-adjacent (onboarding hero) |
| A1.01.c-f | `.onb-lede` | 14 / 400 | (between `--t-title-sm` and 15) | ⚠️ on scale-adjacent |
| A1.01.c-e | `.onb-eyebrow` | 11 / 500 | `--t-overline` (size match, no upper) | ⚠️ on scale-adjacent (no UPPER) |
| A1.01.c-e | `.onb-field .lbl` | 11.5 / 500 | `--t-meta` size + label weight | ⚠️ on scale-adjacent |
| A1.01.c-e | `.onb-input-affixed input` / `.onb-field .input` | 14 / 400 | (14 — between scale steps) | ⚠️ on scale-adjacent |
| A1.01.c | `.otp .cell` | 18 / 500 | (OTP size — chrome density) | ⚠️ on scale-adjacent |
| A1.01.d L245 | `.onb-connect .head .glyph` | 18 / 800 | (glyph weight — same as A2/A3 brand glyph) | ⚠️ on scale-adjacent (font-weight 800 not in canonical 400/500/600/700) |
| A1.01.c L65 | `.onb-progress .wordmark .glyph` | 11 / 800 | (800 weight) | ⚠️ on scale-adjacent |
| A1.01.f | `.onb-splash h1` | 30 / 600 | (display — matches `.page-head h1` doc-chrome) | ⚠️ on scale-adjacent |
| A1.01.f | `.onb-next .opt .lbl` | 10.5 / 500 | (off-scale) | ⚠️ on scale-adjacent |
| A1.01.f | `.onb-next .opt .nm` | 13.5 / 600 | (between `--t-title-sm` 13 and 15) | ⚠️ on scale-adjacent |
| B11 | `.composer-status` | 11.5 / 400 | `--t-meta` | ✅ |
| B11.4 | `.splash-cap` | 12.5 / 400 | `--t-body` | ✅ |
| A11.1 | `.empty-pane h5` | 13 / 600 | `--t-title-sm` | ✅ |
| A11.1 | `.empty-pane p` | 12 / 400 | `--t-label` size | ✅ |
| A12 | `.cs-pane h1` | 26 / 600 / -0.012em | (display) | ⚠️ on scale-adjacent (matches A1) |
| A12 | `.cs-pane p` | 14 / 400 | (off-scale) | ⚠️ on scale-adjacent |
| A12 | `.cs-tabs .tab` | 12.5 / 400 | `--t-body` | ✅ |
| B9 | `.empty-pane.inline h5` | 12.5 / 500 | `--t-body-strong` | ✅ |
| B9 | `.empty-pane.inline p` | 11.5 / 400 | `--t-meta` | ✅ |

## Radii

| Selector | Value | Maps to | Status |
|---|---|---|---|
| `.brand-switch` / `.file-card` (dashboard) | 7 | `--r-xl` | ✅ |
| `.brand-switch .logo` | 5 | `--r-md` | ✅ |
| `.side-search` / `.btn` / `.input` / `.onb-input-affixed` | 6 | `--r-lg` | ✅ |
| `.nav .item` / `.sec-head .filter` / `.sec-head .view-toggle` / `.acc-rail .it` | 5 | `--r-md` | ✅ |
| `.kbd` / `.composer-input-tools .hint kbd` / `.tag-mono` | 3 | `--r-xs` | ✅ |
| `.composer-input-wrap` (dashboard 03.a + B11 + B7.1) | 14 | (no token — exceeds `--r-2xl` 10) | ⚠️ MISSING (composer-specific hero radius) |
| `.composer-input-tools .attach` / `.composer-input-tools .go` / `.composer-chip` / `.pill` / `.side-footer .avatar` | 999 | `--r-pill` | ✅ |
| `.file-card` (dashboard) / `.empty-card` / `.scene-card` / `.upnext` / `.screen` / `.onb-connect` / `.onb-drop` / `.onb-stack-card` / `.onb-next .opt` / `.onb-ai` / `.cs-pane .ic-tile` / `.splash-stage` (chrome plate) | 8 | (no token — between `--r-xl` 7 and `--r-2xl` 10) | ⚠️ on scale-adjacent (extensively repeated card edge) |
| `.bp-card` / `.bp-newcard` / `.cs-pane .ic-tile` | 10 | `--r-2xl` | ✅ |
| `.onb-id-row .logo-slot` / `.onb-connect .head .glyph` | 8 | (same 8 as above) | ⚠️ on scale-adjacent |
| `.thumb-frame` / `.thumb-flow .mini` / `.thumb-ab .half` | 2 | (no token — micro-edge) | ⚠️ MISSING (placeholder-frame micro-radius) |
| `.skeleton` (B7.1 default) | 5 | `--r-md` | ✅ |
| `.skeleton.r-card` | 6 | `--r-lg` | ✅ |
| `.skeleton.r-line` | 3 | `--r-xs` | ✅ |
| `.skeleton.r-pill` / `.skeleton.r-circle` | 999 / 50% | `--r-pill` / circle | ✅ |
| `.empty-pane.inline .ic-wrap` (B9) | 5 | `--r-md` | ✅ |

## Shadows

| Selector | Value | Maps to | Status |
|---|---|---|---|
| `.composer-input-wrap` (dashboard 03.a dark) | `0 1px 2px rgba(0,0,0,0.3)` | (no token; near-flat) | ⚠️ MISSING |
| `.composer-input-wrap:focus-within` (dashboard 03.a dark) | `0 2px 8px rgba(0,0,0,0.4)` | (no token) | ⚠️ MISSING |
| `.file-card:hover` (dashboard 03.a dark) | `0 6px 20px -10px rgba(0,0,0,0.6)` | (no token) | ⚠️ MISSING |
| `.thumb-frame` (dashboard 03.a dark) | `0 2px 8px rgba(0,0,0,0.3)` | (no token) | ⚠️ MISSING |
| `.thumb-flow .mini` / `.thumb-ab .half` (dashboard 03.a dark) | `0 1px 4px rgba(0,0,0,0.3)` | (no token) | ⚠️ MISSING |
| `.screen` (doc chrome — surrounds hi-fi mocks; NOT app chrome) | `0 1px 0 rgba(255,255,255,0.02), 0 20px 60px -30px rgba(0,0,0,0.8)` | (no token — matches design.md §1.6 "page" floating) | ✅ (doc-chrome only, not in Vue scope) |
| `.otp .cell.cursor` box-shadow (focus ring) | `0 0 0 3px rgba(237,237,234,0.05)` | (no token — focus-ring tint) | ⚠️ MISSING |
| B11.4 / B11 transitions | no shadows | — | ✅ (no drop shadow per design.md §1.6) |
| B7.1 skeletons | no shadows | — | ✅ |
| A11 / A12 / B9 empty panes | no shadows | — | ✅ |

## Motion

| Mockup file | Selector | Value | Maps to | Status |
|---|---|---|---|---|
| Dashboard 03.a | `.brand-switch` border-color transition | 0.12s | (no canonical token — design.md §1.7 defers) | ⚠️ on convention (12-15 / 100ms-class) |
| Dashboard 03.a | `.nav .item` bg/color transition | 0.1s | (no token) | ⚠️ on convention |
| Dashboard 03.a | `.btn` border-color/background transition | 0.1s | (no token) | ⚠️ on convention |
| Dashboard 03.a | `.composer-input-wrap` border/shadow transition | 0.15s | (no token) | ⚠️ on convention |
| Dashboard 03.a | `.composer-chip` background/border transition | 0.1s | (no token) | ⚠️ on convention |
| Dashboard 03.a | `.file-card` border/transform/shadow transition | 0.12s | (no token) | ⚠️ on convention |
| Dashboard 03.a | `.upnext-row` background transition | 0.1s | (no token) | ⚠️ on convention |
| A1.01.c-e | `.onb-progress .dot` background transition | .15s | (no token) | ⚠️ on convention |
| A1.01.f | `.onb-next .opt` border/background transition | .12s | (no token) | ⚠️ on convention |
| B11.2 | `.spinner` animation | `cv-spin 1s linear infinite` | (no token; load-indicator exception per design.md §1.7) | ✅ (load-indicator exception) |
| B11.2 | `.composer-status` animation | `cv-fade-in 200ms ease-out` | (no token) | ⚠️ MISSING (state-transition motion) |
| B11.3 | `.content.transition-fade` opacity transition | 240ms ease-out | (no token) | ⚠️ MISSING (state-transition motion) |
| B7.1 | `.skeleton::before` shimmer animation | `skeleton-shimmer 1.4s ease-in-out infinite` | (no token; load-indicator exception) | ✅ (load-indicator exception per design.md §5 ban 5 + §1.7) |

## Z-index

| Selector | Value | Maps to | Status |
|---|---|---|---|
| `.brand-switch` popover (Cluster 03 owns; cluster 02 only wires the trigger) | n/a in cluster-02 hi-fi | — | ✅ (deferred to Cluster 03 audit) |
| `.splash-stage` (B11.4) | `position: absolute; inset:0` (no z-index) | (stacking-context dependent) | ✅ |
| `.logo-dd` (A11 annotation pin reference — NOT used in Cluster 02 dashboard) | 5 / 10 | (annotation only) | ✅ (annotation-only — not in Vue scope) |

---

## MISSING summary + drift resolution

Cluster 02 has **23 unique ⚠️ MISSING colors**, **2 MISSING radii groups**, **5 MISSING shadow stacks**, **2 MISSING motion durations**, plus several scale-adjacent typography/spacing entries (documented above as on-scale-adjacent — each follows established hi-fi convention, no new token needed).

The MISSING entries collapse into **8 founder-resolution buckets**:

| # | Bucket | Affected entries | Proposed resolution | Justification |
|---|---|---|---|---|
| 1 | Brand-logo / primary-button pair `#ededea` + `#0d0d0c` (warm white + near-black) | `.brand-switch .logo`, `.btn.primary`, `.onb-progress .wordmark .glyph`, `.onb-id-row .logo-slot.fetched`, `.empty-card.tall .frame .head-strip .crumb .logo`, `.thumb-frame .tb.cta`, `.thumb-flow .mini s`, `.btn.primary:hover` (`#ffffff`), `.side-footer .avatar` text (`#fff`), `.btn.accent` text (`#fff`) | (a) **promote to tokens** `--ink-on-light` (`#0d0d0c`) and `--surface-on-dark` (`#ededea`) in `kova-hifi.css :root` | These two values repeat 10+ times across this cluster and recur in 04 (canvas top-bar logo button), A6/A8 (icon button hover), and Cluster 03 (brand-grid logos). They are the "warm white" inverse pair to `--ink` / `--page` and qualify as semantic per design.md §1.1 (single ink ramp, inverse needed for ink-on-light surfaces like brand glyphs and primary CTAs). **Founder ratification required** — same as Cluster 12's toggle-thumb decision but at much wider scope. |
| 2 | Vendor brand color `#95bf47` (Shopify green) | `.onb-connect .head .glyph` (A1.01.d), `.bp-card .pills .shopify-glyph` (A2/A3 — out of cluster-02 scope) | (c) **keep literal with `/* token-exempt: vendor-brand Shopify */` comment** | Vendor brand colors (Shopify green, Klaviyo black-orange) are not Kova tokens and must not be themed away. Single-use in cluster-02 (`.onb-connect`). |
| 3 | Accent-blue tint pair `rgba(95,125,255,0.16)` + `rgba(169,186,255,0.5/0.7)` | `.onb-ai .top .pill` bg, `.onb-ai .checks li.pending` (3 variants) | (b) **alias to existing tokens** — `rgba(95,125,255,0.16)` reads visually identical to `var(--accent-soft)` on `--page`; pending state tints map to `color-mix(in srgb, var(--accent-ink), transparent 30%)` and `... 50%` | These are AI-extraction-surface specific. The 95,125,255 hex differs from `--accent` `#3b82f6` because A1 was authored before the accent-hex reconciliation. Replace with `--accent-soft` + computed alpha tints; visual diff is < 1% on dark backgrounds. |
| 4 | Status-tag overlay backdrops `rgba(20,20,18,0.94/0.88)`, `.status-tag.ok` `rgba(94,194,125,0.25/0.92/15,30,22,0.92)`, `.status-tag.scheduled` `rgba(26,31,61,0.92)`, `.onb-splash .check-medal` border `rgba(94,194,125,0.18)` | `.file-card .status-tag` family, `.file-card .frame-count`, `.onb-splash .check-medal` | (c) **keep literal — status palette deferred per design.md §5 ban 12** | Status colors are explicitly deferred to Phase 2 of the design system. Founder ratified 2026-05-17 (PRD 04 + PRD 12). Lift into `src/styles/_status-overlays.css` with `/* token-exempt: status palette deferred per design.md §5 ban 12 */`. |
| 5 | Composer hero radius `14px` + thumb-frame micro-radius `2px` | `.composer-input-wrap`, `.thumb-frame`, `.thumb-flow .mini`, `.thumb-ab .half` | (c) **keep literal** | `14px` is unique to the composer hero (single occurrence per page); `2px` is the email-mock placeholder edge (always inside thumbnails, never user-facing chrome). Both are decorative, not structural — no token promotion warranted. |
| 6 | Repeated `8px` border-radius on cards (file-card, empty-card, scene-card, upnext, screen, onb-connect, onb-drop, onb-stack-card, onb-next .opt, onb-ai, cs-pane .ic-tile, splash) | ~15 selectors across cluster | (a) **promote to token** `--r-card: 8px` in `kova-hifi.css :root` (sits between `--r-xl` 7 and `--r-2xl` 10) | This is the de-facto "card" radius across batch-a/b. Founder ratification recommended — adds one canonical step to the radius scale. Alternative (c) "keep as 8px literal" is acceptable but produces 15+ literal duplications. |
| 7 | Composer dark-mode shadows `0 1px 2px rgba(0,0,0,0.3)` etc. and dashboard hover stacks `0 6px 20px -10px rgba(0,0,0,0.6)`, `0 2px 8px rgba(0,0,0,0.3-0.4)` | `.composer-input-wrap`, `.file-card:hover`, `.thumb-frame`, `.thumb-flow .mini`, `.thumb-ab .half` | (c) **keep literal — dark-mode card shadows are decorative** | design.md §1.6 explicitly says "no drop shadows on inputs, cards, or rows" — yet the hi-fi files ship them on dark. Founder decision per PRD 02 (Cluster 02 PRD): keep these as documented dark-mode card depth; lift literal into `src/styles/_dark-shadows.css` with `/* token-exempt: dark card depth — see PRD 02 §3.x */`. Mark as design.md §1.6 amendment candidate. |
| 8 | State-transition motion (`cv-fade-in 200ms`, `transition-fade 240ms`) + chrome hover transitions (0.1s / 0.12s / 0.15s) | B11.2/.3 composer states + every `.btn`/`.nav-item`/`.file-card` hover | (a) **promote tokens** `--motion-instant: 100ms`, `--motion-fast: 150ms`, `--motion-base: 200ms`, `--motion-slow: 240ms`, `--motion-shimmer: 1400ms`, `--motion-spin: 1000ms` per design.md §1.7 ("defer until a surface needs them — now it does"). | Cluster 02 is the first cluster shipping live motion (B11 transitions). Founder ratification required to flip design.md §1.7 from "deferred" to "committed" with these six tokens. Aligns with Cluster 12 toggle (0.15s) and skeleton (1.4s). |

---

## Founder-blocking decisions (require AskUserQuestion before Phase 2)

Three of the eight buckets above need an explicit yes/no from the founder before Vue implementation starts:

1. **Bucket 1 (highest-load)** — Add `--ink-on-light` + `--surface-on-dark` to the canonical token block? (Affects 10+ selectors in this cluster alone.)
2. **Bucket 6** — Add `--r-card: 8px` to the radius scale, OR keep 8px as a per-component literal in 15+ places?
3. **Bucket 8** — Flip design.md §1.7 from "no motion tokens yet" to "six motion tokens canonical"? (Required to ship B11 transitions and any future skeleton work.)

Buckets 2, 4, 5, 7 follow established §7c "keep literal with `/* token-exempt */` comment" pattern per Cluster 12 precedent — **no founder block**, document and proceed.

Bucket 3 follows §7b "alias to existing" — no token additions, visual diff approved.

---

## Gate status

⚠️ **CONDITIONAL PASS — 3 founder decisions required before Phase 2 (Vue implementation)**

- 23 unique MISSING colors collapsed into 8 resolution buckets
- 5 buckets resolve via §7c (keep literal) or §7b (alias) — proceed with documentation
- **3 buckets (1, 6, 8) require founder ratification via AskUserQuestion** before any Vue component renders a brand-logo, card, or motion-driven transition
- All sidebar / topbar / content / btn / nav / pill / kbd / field / composer-chip / file-card chrome tokens map cleanly to canonical `kova-hifi.css :root`
- Brand-switcher popover wiring tokens deferred to Cluster 03 audit (out of scope for Cluster 02 surfaces)
- Doc-chrome `.screen` / `.annot` / `.page-head` shadows excluded — not in Vue runtime scope
