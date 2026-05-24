# Cluster 12 — Tokens Used

Generated 2026-05-23. Phase 1 gate per IMPLEMENTATION_PROMPT.md §3. Every visual value in this cluster's surfaces mapped to either an existing token or ⚠️ MISSING with drift-protocol resolution.

## Source files

- `design-system/hifi/account-stripe/Kova Hi-Fi A7 Account Page - Dark.html` (A7.1 §3 Accessibility lines 671–704, §4 Notifications lines 707–725)
- `design-system/hifi/canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` (A8.3 Accessibility modal lines 803–887)

## Colors

| Mockup file | Selector/Line | Hex | Maps to | Status |
|---|---|---|---|---|
| A7 | `.s-section` background | `var(--page)` | `--page` | ✅ exists |
| A7 | `.row` text | `var(--ink)` | `--ink` | ✅ exists |
| A7 | `.sub` text | `var(--ink-3)` | `--ink-3` | ✅ exists |
| A7 | `.lbl` text | `var(--ink-2)` | `--ink-2` | ✅ exists |
| A7 | `.toggle` idle bg | `var(--line)` | `--line` (#2c2c30) | ✅ exists |
| A7 | `.seg .o` idle | `var(--page)` | `--page` | ✅ exists |
| A7 | `.seg .o.on` bg | `var(--fill)` | `--fill` | ✅ exists |
| A7 | `.seg .o.on` ink | `var(--ink)` | `--ink` | ✅ exists |
| A7 | `.seg .o` ink (idle) | `var(--ink-3)` | `--ink-3` | ✅ exists |
| A7 line 138 | `.toggle::after` (thumb idle) bg | `#ededea` | (no token) | ⚠️ MISSING |
| A7 line 144 | `.toggle.on` bg | `#ededea` | (no token) | ⚠️ MISSING |
| A7 line 145 | `.toggle.on::after` (thumb on) bg | `#0d0d0c` | (no token) | ⚠️ MISSING |
| A7 line 142 | `.toggle::after` box-shadow | `rgba(0,0,0,0.4)` | (no token) | ⚠️ MISSING |
| A8.3 | `.dlg-foot .l` meta text | `var(--ink-3)` | `--ink-3` | ✅ exists |
| A8.3 | High-contrast `--border` ON override | `#4a4a4a` | (no token) | ⚠️ MISSING |

## Spacing (px exact)

| Mockup file | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| A7 | `.row` `gap` | 16px | scale | ✅ |
| A7 | `.row-stack` vertical gap | 12px | scale | ✅ |
| A7 | `.s-section` padding | 28px / 20px | scale | ✅ |
| A7 line 133-144 | `.toggle` width × height | 34 × 20 | (drift — toggle artifact) | ⚠️ on scale-adjacent (34 & 20 not on canonical spacing scale) |
| A7 line 140 | `.toggle::after` width × height | 16 × 16 | scale | ✅ |
| A7 line 141 | `.toggle::after` top/left inset | 2px | scale | ✅ |
| A7 line 145 | `.toggle.on::after` left | 16px | scale | ✅ |
| A7 line 149 | `.seg .o` padding | 6px × 12px | scale | ✅ |
| A7 inline | `.kbd` font-size | 11.5px | (drift) | ⚠️ on scale-adjacent |

## Typography

| Mockup file | Selector/Line | font | Maps to | Status |
|---|---|---|---|---|
| A7 | `.s-section h2` | 14/600 Inter | type-scale | ✅ |
| A7 | `.lbl` | 13/500 Inter | type-scale | ✅ |
| A7 | `.sub` | 12/400 Inter | type-scale | ✅ |
| A7 line 149 | `.seg .o` | 12/400 Inter | type-scale | ✅ |
| A7 inline | meta "Off · default" | 12.5px | (drift) | ⚠️ off-scale |
| A8.3 | `h3` | 16/600 Inter | type-scale | ✅ |
| A8.3 | `.dlg-foot .l` | 12/400 Inter | type-scale | ✅ |

## Radii

| Selector | Value | Maps to | Status |
|---|---|---|---|
| `.toggle` | 999px | full-pill convention | ✅ canonical pill |
| `.toggle::after` | 50% | circle convention | ✅ canonical |
| `.seg` | 6px | `--r-md` | ✅ |
| `.dlg.md` | 10px | `--r-lg` | ✅ |

## Shadows

| Selector | Value | Maps to | Status |
|---|---|---|---|
| `.toggle::after` | `0 1px 3px rgba(0,0,0,0.4)` | (drift — toggle artifact) | ⚠️ MISSING — keep literal |
| `.dlg` | `--shadow-elev-3` | `--shadow-elev-3` | ✅ |

## Motion

| Selector | Value | Maps to | Status |
|---|---|---|---|
| `.toggle` background transition | 0.15s | `--motion-fast` (150ms) | ✅ (matches via aliasing) |
| `.toggle::after` left transition | 0.15s | `--motion-fast` | ✅ |
| `.seg .o` (idle hover) | 0.1s | `--motion-instant` | ✅ |

## Z-index

| Selector | Value | Maps to | Status |
|---|---|---|---|
| `.dlg` | 50 | canonical modal layer | ✅ |
| `.modal-backdrop` | 49 | canonical backdrop | ✅ |

---

## MISSING summary + drift resolution

5 ⚠️ MISSING entries. All resolve via IMPLEMENTATION_PROMPT.md §7c (keep literal with `/* token-exempt */` comment in `accessibility.css`), with founder-approved rationale:

| Entry | Resolution | Justification |
|---|---|---|
| `.toggle::after` idle bg `#ededea` | (c) keep literal | Toggle is a one-off binary control; this color is "warm white" intentional contrast against `--ink`. Lift into `src/styles/accessibility.css` with `/* token-exempt: toggle thumb idle — A7.1 hi-fi inline */` |
| `.toggle.on` bg `#ededea` | (c) keep literal | Same as above — toggle ON visual; lift with same exempt comment |
| `.toggle.on::after` bg `#0d0d0c` | (c) keep literal | Toggle thumb ON visual; very-dark ink contrast against on-state background |
| `.toggle::after` shadow `rgba(0,0,0,0.4)` | (c) keep literal | Drop shadow for tactile depth — toggle-specific |
| High-contrast `--border` ON `#4a4a4a` | (c) keep literal — scoped to `[data-high-contrast='true']` selector | Founder ratified 2026-05-17 per PRD 12 — high-contrast scope is "borders only, matches Figma" |
| `.toggle` 34×20 dimension | (c) accept | Standard binary-toggle dimensions (Figma, Linear, etc. converge on this size); document in design.md follow-up |
| `12.5px` meta font | (c) keep — secondary text density | Hi-fi convention for `.sub` density variant; one-off |
| `11.5px` `.kbd` | not used in this cluster | N/A |

**No founder AskUserQuestion required** — drift protocol (c) applies uniformly; founder-locked at 2026-05-17 ratification (PRD 12 §3.3 + §13.7 Phase 2 catalog).

---

## Gate status

✅ **PASS — clear for Phase 2+ (Vue implementation)**

- 0 unresolved ⚠️ MISSING entries
- 0 founder-blocking ambiguities
- All toggle drift uses §7c (keep literal with `/* token-exempt */` comment in `accessibility.css`)
- All other values map to existing tokens
