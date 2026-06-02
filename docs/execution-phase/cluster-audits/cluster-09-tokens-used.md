# Cluster 09 — Tokens Used

## Source files
- design-system/hifi/version-history/chunk-b6/Kova Hi-Fi 17 Version History - Dark.html (17.1–17.11)
- design-system/hifi/version-history/chunk-b2/Kova Hi-Fi 15 Trash Confirm - Dark.html (B13.1–B13.3)

## Colors
| Mockup | Selector/Line | Value | Maps to | Status |
|---|---|---|---|---|
| 17 | `.vh-head` border / `.vh-instructions` | `var(--line2)` | `--line-2` | ✅ exists |
| 17 | `.vh-head .ttl` | `var(--ink)` | `--ink` | ✅ |
| 17 | `.vh-head .a` icon | `var(--ink2)` → hover `var(--fill)`/`--ink` | `--ink-2`/`--fill`/`--ink` | ✅ |
| 17 | `.vh-instructions` | `var(--ink3)` | `--ink-3` | ✅ |
| 17 | `.vh-timeline::before` hairline | `var(--line)` | `--line` | ✅ |
| 17 | `.vh-row` text / hover | `var(--ink2)` / `var(--line2)`+`--ink` | `--ink-2`/`--line-2`/`--ink` | ✅ |
| 17 | `.vh-row.active` | `var(--accent-soft)` + `--ink` | `--accent-soft`/`--ink` | ✅ |
| 17 | `.vh-row .dot .core` | `var(--rail)` bg, `var(--ink3)` border, `0 0 0 2px var(--rail)` mask | `--rail`/`--ink-3` | ✅ |
| 17 | `.vh-row.current .dot` | `var(--accent)` | `--accent` | ✅ |
| 17 | `.vh-row.named .dot` | `var(--ink)` | `--ink` | ✅ |
| 17 | `.vh-row .ttl` / `.desc` | `var(--ink)` / `var(--ink3)` | `--ink`/`--ink-3` | ✅ |
| 17 | `.vh-row .by .av` | `var(--fill)` bg, `var(--ink2)` | `--fill`/`--ink-2` | ✅ |
| 17 | `.vh-row .by .av.brand` | `#c24a1e` / `#fff` | dynamic brand color | ⚠️ MISSING (Q dynamic — not a token) |
| 17 | `.vh-row .more` hover | `var(--fill)`/`--ink` | `--fill`/`--ink` | ✅ |
| 17 | `.vh-row .rename` border/ring | `var(--accent)` + `rgba(59,130,246,0.18)` | `--accent` + focus-ring | ⚠️ MISSING (focus-ring) |
| 17 | `.vh-group-head` | `var(--ink2)`/`--line2`/`--ink3`/`--rail` | `--ink-2`/`--line-2`/`--ink-3`/`--rail` | ✅ |
| 17 | `.anchor-pin` | `var(--accent)` + `rgba(59,130,246,0.18)` ring | `--accent` + focus-ring | ⚠️ MISSING (focus-ring) |
| 15 | `.dlg` | `var(--page)`/`var(--line)` | `--page`/`--line` | ✅ |
| 15 | `.dlg` shadow | `0 24px 80px -20px rgba(0,0,0,0.7)`, inset `rgba(255,255,255,0.03)` | literal (matches `.screen` shadow idiom) | ✅ literal-consistent |
| 15 | `.dlg-head h3`/`.sub` | `var(--ink)`/`var(--ink-3)` | `--ink`/`--ink-3` | ✅ |
| 15 | `.dlg-foot` | `var(--rail)` + `var(--line-2)` | `--rail`/`--line-2` | ✅ |
| 15 | `.modal-backdrop` | `rgba(26,26,29,0.72)` (= `--page` @72%) | scrim | ⚠️ MISSING (scrim) |
| 15 | `.btn.danger` base | `var(--warn)` (= `--ink-2`) | `--warn` | ✅ (neutral — Q1) |
| 15 | `.btn.danger:hover` | `#d36a3a` | — | ⚠️ MISSING (Q1 destructive) |

## Spacing / Sizing (literal px — no spacing-scale tokens in the system)
| Mockup | Selector | Value | Status |
|---|---|---|---|
| 17 | `.vh-head` | height 44px; padding 0 14px | ✅ literal (hi-fi convention) |
| 17 | `.vh-head .a` | 26px square; radius 5px | ✅ literal |
| 17 | `.vh-instructions` | padding 12px 14px | ✅ literal |
| 17 | `.vh-body` | padding 8px 0 16px | ✅ literal |
| 17 | `.vh-timeline` | padding 0 14px; `::before` top 18 / bottom 12 / left 21 / width 1px | ✅ literal |
| 17 | `.vh-row` | padding 6px 8px 6px 24px; gap 10px; radius 5px; margin 0 -8px | ✅ literal |
| 17 | `.vh-row .dot` | 10px; core 8px; left 9 / top 9 | ✅ literal |
| 17 | `.vh-row .more` | 22px; radius 4px | ✅ literal |
| 17 | `.vh-row .by .av` | 14px circle | ✅ literal |
| 15 | `.dlg` | radius 10px; min-width 360px; `.sm` 460px; `.md` 540px | ✅ literal |
| 15 | `.dlg-head` | padding 18px 22px 12px | ✅ literal |
| 15 | `.dlg-foot` | padding 14px 22px | ✅ literal |

## Typography (literal px/weight — no type-scale tokens in the system)
| Mockup | Selector | font-size / weight / line-height | Status |
|---|---|---|---|
| 17 | `.vh-head .ttl` | 15 / 600 / — ; tracking -0.005em | ✅ literal |
| 17 | `.vh-instructions` | 11.5 / — / 1.5 | ✅ literal |
| 17 | `.vh-row .ttl` | 12.5 / 500 / 1.3 ; -0.003em | ✅ literal |
| 17 | `.vh-row .desc` | 11.5 / — / 1.4 (2-line clamp) | ✅ literal |
| 17 | `.vh-row .by` | 11 ; av 8.5/600 | ✅ literal |
| 17 | `.vh-group-head` | 12.5 ; count 11 | ✅ literal |
| 15 | `.dlg-head h3` | 16 / 600 ; -0.005em | ✅ literal |
| 15 | `.dlg-head .sub` | 12.5 / — / 1.5 | ✅ literal |

## Radii / Shadows / Motion / Z-index
| Mockup | Property | Value | Status |
|---|---|---|---|
| 17 | row/group radius | 5px ; icon/more 4–5px | ✅ literal |
| 17 | row hover transition | (none declared) instant | ✅ |
| 15 | dialog radius | 10px | ✅ literal |
| 15 | backdrop blur | `backdrop-filter: blur(2px)` | ✅ literal |
| 15 | z-index | backdrop 5 / dlg 10 / anchor 9 | ✅ literal |
| 17 | `.more` reveal | `opacity 0→1` on row hover/active | ✅ |

## RESOLVED (founder, 2026-06-01 Phase 1 gate)

- **Q1 destructive button → RED.** Added `--color-danger: #e5484d` + `--color-danger-hover: #d93a40`
  (a proper Figma/Linear-style red, not the mockup's warm `#d36a3a`) — scoped to destructive confirm
  buttons. `.btn.danger` maps to these.
- **Q2 scrim + focus-ring → NAMED.** Added `--color-scrim: rgba(26,26,29,0.72)` +
  `--color-focus-ring: rgba(59,130,246,0.18)` to `src/app.css @theme`.
- Brand avatar `#c24a1e` confirmed dynamic (brand data) — no token.

All MISSING rows resolved. Phase 1 gate GREEN → Vue build (Tasks 13–18) unblocked.

## MISSING summary (original — now all resolved above)

1. **Destructive button hover `#d36a3a`** (`.btn.danger:hover`, Hi-Fi 15 L554). Base is neutral
   (`--warn`=`--ink-2`). → **Q1**: (a) neutral throughout; (b) add `--danger` red token; (c) keep
   `#d36a3a` as an approved exception.
2. **Scrim `rgba(26,26,29,0.72)`** (`.modal-backdrop`, L540). → **Q2**: add `--scrim` token or keep
   literal with `/* token-exempt */`.
3. **Focus-ring `rgba(59,130,246,0.18)`** (`.vh-row .rename` L819, `.anchor-pin` L875). → **Q2**:
   add `--focus-ring` token or keep literal.
4. **Brand avatar `#c24a1e`** — dynamic brand color (from brand data), not a static token. No token
   needed; the hex is a hi-fi sample. (Informational — confirm interpretation.)

All other values map to existing tokens or are literal-consistent with the hi-fi's own convention
(the design system tokenizes colors + offsets only; spacing/type are literal everywhere).
