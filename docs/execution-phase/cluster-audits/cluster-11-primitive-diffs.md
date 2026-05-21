# Cluster 11 — Per-primitive written diff

**Status:** ✅ All primitives clean. Generated 2026-05-20 W6 REDO Phase 4.
**Authority:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §5 + §6 + §12.
**Method:** per-property walkthrough using IMPLEMENTATION_PROMPT.md Appendix A. Each Vue SFC consumes canonical CSS class names from `design-system/canonical/kova-hifi.css` (Cluster 11 W6 REDO 2026-05-20 lift). All visual VALUES (colors / spacing / type / radii / shadows / motion / z-index / sizing) resolve to tokens defined in `:root` per `cluster-11-tokens-used.md`. Vue SFC code holds MARKUP composition only — zero raw hex / raw px / raw color literals (one exception: legacy back-compat aliases — see §end).

For visual-diff Playwright clip-region results, see `tests/snapshots/cluster-11/` (regenerated on `bun run test:visual --update-snapshots`).

---

## 1. KovaToast (success / error / info / action / progress / ai)

| Property | Spec source | Token | Vue impl |
|---|---|---|---|
| Container bg | B1 `.toast` L444 | `var(--page)` | canonical `.toast` (KovaToast.vue L26 `class="toast ${variant}"`) |
| Border | B1 L445 | `1px solid var(--line)` | canonical |
| Radius | B1 L446 | `var(--r-md)` (5 px) | canonical |
| Shadow | B1 L447-449 | `var(--shadow-elev-1)` | canonical |
| Padding | B1 L443 | `var(--toast-pad-y) var(--toast-pad-x)` (12/14) | canonical |
| Gap | B1 L441 | `var(--toast-gap)` (11 px) | canonical |
| Min/max width | B1 L442 | `var(--toast-min-w) / var(--toast-max-w)` | canonical |
| Body gap | B1 L462 | `var(--toast-body-gap)` (4) | canonical |
| Msg color | B1 L464 | `var(--ink)` | canonical |
| Meta | B1 L466 | `var(--ink-3)` + `var(--t-meta-fz)` | canonical |
| Row-actions gap / mt | B1 L468-469 | `var(--toast-row-gap) / var(--toast-row-margin-top)` | canonical |
| `.ta` action color/font | B1 L472-477 | `var(--accent)` + `var(--t-action-12-fz)` + 500 | canonical |
| `.ta.muted` | B1 L480-481 | `var(--ink-3)` / weight 400 | canonical |
| Dismiss | B1 L482-491 | 18×18, `var(--r-xs)` (3), `var(--ink-3)`, hover `var(--ink)` + `var(--line-2)` | canonical; KovaIcon `name="x" size="sm"` 14 px lucide replaces raw `×` |
| Variant `success` ic-lead | B1 L494 | `var(--ink-2)` | canonical |
| Variant `error` ic-lead | B1 L495 | `var(--warn)` (degraded ink-2) | canonical |
| Variant `error` border | B1 L496 | `var(--warn-edge)` (degraded line) | canonical |
| Variant `info` msg/ic | B1 L497-498 | `var(--ink-2)` / `var(--ink-3)` | canonical |
| Variant `ai` ic-lead | B1 L500 | `var(--accent-ink)` | canonical |
| Variant `ai` border | B1 L501 | `var(--accent-2)` | canonical |
| Lucide icon names | PRD 11 §3.1 taxonomy | success=check, error=alert-triangle, info=info, action=info, progress=loader, ai=sparkles | `stores/toast.ts` `defaultIcon()` map |
| Stack container | B1 L433-438 | `.toast-stack` `bottom/right: var(--toast-bottom/right)` (22/22), `z-index: var(--z-toast)` (30) | canonical |
| Auto-dismiss | PRD 11 §3.1 | 5000 ms default; sticky for error/action/progress | `stores/toast.ts` `STICKY_VARIANTS` set |
| Max visible | PRD 11 KD-1 | 5; excess queued | `stores/toast.ts` `MAX_VISIBLE` |

**Diff: empty.** Visual values match B1 hi-fi byte-for-byte via tokens. Behavior (queue / sticky / auto-dismiss) per PRD 11 §3.1.

---

## 2. KovaModal (sm / md / lg)

| Property | Spec source | Token | Vue impl |
|---|---|---|---|
| Shell bg | A6+A2a `.dlg` L47 | `var(--page)` | canonical `.dlg` |
| Shell border | L47 | `1px solid var(--line)` | canonical |
| Shell radius | L48 | `var(--r-2xl)` (10) | canonical |
| Shadow | L48 | `var(--shadow-elev-3)` | canonical |
| sm/md/lg widths | L53-55 | `var(--modal-w-sm/md/lg)` (460/540/880) | canonical |
| Head pad | L57 | `var(--modal-head-pad-t/x/b)` (18/22/12) | canonical |
| Head h3 | L61 | `var(--t-modal-title-*)` (16/1.3/600/-0.005em) | canonical |
| Head sub | L64 | `var(--t-body-fz)` / `var(--lh-loose)` / `var(--ink-3)` | canonical |
| Close `.x` size | L67 | `var(--modal-close-size)` (26) | canonical |
| Close `.x` radius | L67 | `var(--r-md)` | canonical |
| Close hover | L71 | `var(--line-2)` bg, `var(--ink)` color | canonical |
| Body pad | L73 | `var(--modal-body-pad-t/x/b)` (4/22/18) | canonical |
| Body gap | L74 | `var(--modal-body-gap)` (14) | canonical |
| Foot pad | L79 | `var(--modal-foot-pad-y/x)` (14/22) | canonical |
| Foot border-top | L80 | `1px solid var(--line-2)` | canonical |
| Foot bg | L82 | `var(--rail)` | canonical |
| Foot bottom corners | L83-84 | `var(--r-2xl)` | canonical |
| Foot `.l` | L85 | `var(--ink-3)` + `var(--t-meta-fz)` | canonical |
| Foot `.r` gap | L86 | `var(--modal-foot-r-gap)` (8) | canonical |
| Backdrop | PRD 11 §3.3 | `.modal-backdrop` `var(--modal-backdrop)` rgba(0,0,0,0.72) + z `var(--z-modal-backdrop)` (19) | canonical |
| z-index | hi-fi L49 / PRD §3.1 | `var(--z-modal)` (20) | canonical |
| Field input | A6 L96-105 | `.fld input.input` — bg page, border line, radius `var(--r-lg)`, padding `var(--modal-field-pad-y/x)`, focus border ink-2 + `var(--ring-focus-ink)` | canonical |
| Stack ceiling | PRD KD-2 | max 2 nested | `stores/confirm.ts` `MAX_STACK` |
| Click-backdrop close | PRD §3.3 | configurable via `closeOnBackdrop` prop | KovaModal.vue `onInteractOutside` |

**Diff: empty.** Sizes/padding/typography/shadow all token-resolved; Reka Dialog handles focus trap + portal + ARIA + Escape.

---

## 3. KovaPopover (+ avatar variant)

| Property | Spec | Token | Impl |
|---|---|---|---|
| bg / border / radius / shadow | A6 L114-118 | page / line / `--r-overlay` (8) / `--shadow-elev-2` | canonical `.popover` |
| Min-width default | L120 | `var(--popover-min-w)` (240) | canonical |
| Padding | L117 | `var(--popover-pad)` (6) | canonical |
| Gap | L119 | `var(--popover-gap)` (4) | canonical |
| pop-search | L122-128 | radius `var(--r-lg)`, bg rail, line border, font `var(--t-body-fz)` | canonical |
| pop-row pad/gap/radius | L133-137 | pad-y/x 6/8, gap 9, radius `--r-md`, font body | canonical (gap is `--popover-row-gap`) |
| pop-row hover | L138 | `var(--line-2)` | canonical + Reka `[data-highlighted]` parity (kova-hifi.css 2026-05-20 add) |
| pop-row.active | L139 | `var(--fill)` | canonical |
| pop-row .logo | L141-144 | 22×22, `--r-md`, 700/10 — customer-data hex `#0d0d0c` on `#ededea` (sample, token-exempt per design.md §3.15) | canonical |
| pop-foot | L155-160 | pad-y/x 7/8, radius `--r-md`, ink-2 → ink hover | canonical |
| arrow | L213-218 | 10×10, rotate-45, top+left line border | canonical |
| Avatar `.pop-hdr` | L166-189 | pad-t/x/b 10/10/8, border-bottom `--line-2`, .av 28×28 50% radius, .plan `--accent-soft`+`--accent-ink`+`--accent-2` border + `--r-pill` | canonical |
| Avatar `.pop-item` | L191-198 | pad-y/x 6/8, gap 10, radius `--r-md`, font body, hover `--line-2` | canonical + Reka highlight parity |
| Reka portal + arrow | Reka Popover docs | n/a | KovaPopover.vue `PopoverPortal` + `PopoverArrow class="arrow"` |

**Diff: empty.** Customer-data hex (`#0d0d0c / #ededea`) in `.pop-row .logo` carries through canonical CSS (cluster-11 lift) — sample data per design.md §3.15 ("Customer brand colors are data, not part of our system").

---

## 4. KovaMenu

| Property | 08 Top Chrome lift | Token | Impl |
|---|---|---|---|
| bg / border / radius / shadow | L125-129 | rail / line / `--r-overlay` / `--shadow-elev-2-menu` | canonical `.menu` |
| Min-width | L130 / 136 / 137 | `var(--menu-min-w / -md / -lg)` (220/260/280) | canonical |
| Padding | L128 | `var(--menu-pad)` (4) | canonical |
| Item height | L141 | `var(--menu-item-h)` = `var(--h-control-xs)` (26) | canonical |
| Item pad | L142 | `0 var(--menu-item-pad-r) 0 var(--menu-item-pad-l)` (0/8/0/10) | canonical |
| Item gap | L140 | `var(--menu-item-gap)` (10) | canonical |
| Item radius | L143 | `var(--r-md)` | canonical |
| Item hover | L148 | `var(--line-2)` | canonical + Reka `[data-highlighted]` (2026-05-20 add) |
| Item disabled | L176-178 | `var(--ink-3)` cursor default | canonical |
| Destructive | L181-183 | `var(--warn)` → hover `var(--warn-soft)` | canonical + Reka highlight parity |
| Sep | L189-192 | 1 px `var(--line-2)` margin `var(--menu-sep-margin)` (4/4) | canonical |
| Group label | L195-200 | 9.5 px / 500 / `var(--ink-3)` pad `var(--menu-group-pad-t/x/b)` (8/10/4) | canonical |
| kbd-row | L160-166 | inline-flex / `var(--ink-3)` / 11 px / hover `var(--ink-2)` | canonical |
| Sub-arrow `.arr` | L167-173 | `var(--ink-3)` / hover `var(--ink-2)` / `chevron-right` icon | canonical |

**Diff: empty.** Reka DropdownMenu handles ARIA roles + keyboard nav + portal.

---

## 5. KovaTooltip

| Property | PRD 11 §3.4 (Q-B B1) | Token | Impl |
|---|---|---|---|
| bg | spec | `var(--rail)` | canonical `.tooltip` |
| color | spec | `var(--ink)` | canonical |
| Border | added | `1px solid var(--line)` | canonical |
| Radius | spec | `var(--r-md)` (5) | canonical |
| Padding | added | `var(--tooltip-pad-y/x)` (4/8) | canonical |
| Font | spec | `var(--t-meta-fz)` (11.5) + `var(--t-meta-lh)` (1.3) | canonical |
| Max-width | added | `var(--tooltip-max-w)` (240) | canonical |
| Shadow | added (Q-B B1) | `var(--shadow-elev-2)` | canonical |
| z-index | implicit | `var(--z-dropdown)` (12) | canonical |
| Delay | PRD §3.4 | 500 ms | KovaTooltip.vue `delayDuration` default |

**Diff: empty.** No dedicated hi-fi — spec inferred per founder-approved Q-B B1.

---

## 6. KovaSkeleton

| Property | B7 `.skeleton` L66-101 | Token | Impl |
|---|---|---|---|
| Background | L68 | `var(--fill)` | canonical |
| Default radius | L69 | `var(--r-md)` | canonical |
| Shimmer pseudo | L73-85 | 50 % width gradient transparent→`var(--fill-2)`→transparent | canonical |
| Shimmer duration | L84 | `var(--motion-skeleton)` (1400 ms) `var(--ease-in-out)` | canonical |
| Reduce-motion | L90-93 | static `var(--fill-2)`, `::before` hidden | canonical |
| r-pill | L98 | `var(--r-pill)` | canonical |
| r-card | L99 | `var(--r-lg)` (6) | canonical |
| r-line | L100 | `var(--r-xs)` (3) | canonical |
| r-circle | L101 | 50 % | canonical |

**Diff: empty.** Shimmer is the only gradient in the system — Ban 5 exception, codified in B7 header comment.

---

## 7. EmptyState (inline-32 / panel-40 / full-48)

| Property | B9 lift | Token | Impl |
|---|---|---|---|
| **panel-40 (default)** | L188-202 | | canonical `.empty-pane` |
| border | L189 | `1px dashed var(--line)` | canonical |
| radius | L189 | `var(--r-overlay)` (8) | canonical |
| pad | L190 | `var(--empty-panel-pad-y/x)` (36/24) | canonical |
| bg | L191 | `var(--page)` | canonical |
| gap | L192 | `var(--empty-panel-gap)` (6) | canonical |
| ic-wrap | L194-198 | 40×40 50% radius `var(--rail)` bg `var(--line)` border `var(--ink-3)` ink | canonical |
| h5 | L200 | `var(--t-title-sm-*)` (13/1.3/600/-0.005em) | canonical |
| p | L201 | 12 / `var(--lh-loose)` / `var(--ink-3)` / max-w 360 | canonical |
| cta-row | L202 | gap 8, margin-top 10 | canonical |
| **inline-32** | L217-254 | | `.empty-pane.inline` |
| pad | L219 | `var(--empty-inline-pad-y/x)` (24/16) | canonical |
| ic-wrap | L223-228 | 32×32 `var(--fill)` bg `var(--r-md)` | canonical |
| h5 | L230-233 | `var(--t-body-strong-*)` (12.5/-/500/0) | canonical |
| `.q` | L234-237 | `var(--ink)` 600 (query echo) | canonical |
| p | L238-241 | `var(--t-meta-fz)` (11.5) / max-w 36ch | canonical |
| ghost-link | L245-251 | `var(--accent)` / `var(--t-action-12-*)` / pad `var(--empty-inline-ghost-pad-y/x)` (4/8) / radius `var(--r-sm)` | canonical |
| ghost-link hover | L253 | `var(--line-2)` | canonical |
| **full-48** | L299-313 | | `.empty-pane.full-page` |
| pad | L300 | `var(--empty-full-pad-y/x)` (56/32) | canonical |
| ic-wrap | L304-309 | 48×48 50% rail bg | canonical |
| h5 | L311-313 | `var(--t-title-md-*)` (15/1.3/600/-0.005em) | canonical |

**Diff: empty.** Three variants consume `var(--empty-*)` tokens.

---

## 8. Error pages (404 / 500 / NetworkUnreachable)

| Property | B2 L33-93 | Token | Impl |
|---|---|---|---|
| Page bg | L35 | `var(--bg)` (canvas plate `#242428`) | canonical `.err-page` |
| Page pad | L38 | `var(--err-page-pad-y/x)` (32/24) | canonical |
| Page gap | L39 | `var(--err-page-gap)` (22) | canonical |
| Card width | L44 | `var(--err-card-w)` (420) | canonical |
| Card pad | L45 | `var(--err-card-pad-y/x)` (40/32) | canonical |
| Card gap | L48 | `var(--err-card-gap)` (14) | canonical |
| Icon-tile | L52-61 | 48×48 `var(--r-lg)` bg `var(--bg)` no border `var(--ink-3)` ink, icon 24×24 | canonical |
| Icon-tile mb | L59 | `var(--err-icon-margin-b)` (6) | canonical |
| h1 | L63-68 | `var(--t-title-md-*)` (15/1.3/600/-0.005em) `var(--ink)` | canonical |
| p | L69-74 | `var(--t-body-fz)` (12.5) / `var(--lh-loosest)` (1.55) / `var(--ink-2)` / max-w 48ch | canonical |
| cta-stack width | L77 | `var(--err-cta-w)` (280) | canonical |
| cta-stack mt | L80 | `var(--err-cta-mt)` (12) | canonical |
| cta-stack gap | L79 | `var(--err-cta-gap)` (8) | canonical |
| btn pad | L84 | `var(--err-btn-pad-y/x)` (9/14) | canonical |
| btn.text | L86-92 | `var(--ink-2)` → `var(--ink)` + `var(--line-2)` hover — LIFTED to unscoped `.btn.text` 2026-05-20 | canonical |
| **404 icon** | PRD 11 §3.2 | `file-question` | NotFoundView.vue |
| **500 icon** | PRD 11 §3.2 | `alert-triangle` | ServerErrorView.vue |
| **Network icon** | PRD 11 §3.2 | `wifi-off` | NetworkUnreachableView.vue |
| **404 copy** | PRD §3.2 table | "Page not found" / "It may be archived..." | NotFoundView.vue |
| **500 copy** | PRD §3.2 | "Something broke" / "Try again..." | ServerErrorView.vue |
| **Network copy** | PRD §3.2 | "Can't reach Kova" / "Check your internet..." | NetworkUnreachableView.vue |
| **CTAs** | PRD §3.2 | per-page primary + text | each view consumes KovaButton primary + text |

**Diff: empty.** All three views consume `.err-page` shell. 404 + 500 routes wired in router.ts. `:pathMatch(.*)*` catch-all renders 404.

---

## 9. KovaButton

| Property | kova-hifi.css L332-365 (canonical) | Vue impl |
|---|---|---|
| `.btn` base | bg page / border line / text ink / `var(--r-lg)` / pad 7/12 / 12.5 px / 500 weight / -0.003em tracking | canonical |
| `.btn:hover` | border-color ink-3 / bg fill | canonical |
| `.btn.primary` | bg ink / `#111` text (LEGACY raw hex — token-exempt as it's design.md §3.1 ink-on-page contrast specifier) | canonical |
| `.btn.primary:hover` | bg `#fff` (LEGACY raw hex — `--ink-on-primary`) | canonical |
| `.btn.accent` | `var(--accent)` bg / `var(--ink-on-primary)` text / accent border | canonical (token swap 2026-05-20) |
| `.btn.accent:hover` | `var(--accent-hover)` (`#2563eb`) | canonical (token swap 2026-05-20) |
| `.btn.ghost` | transparent + ink-2 → line-2 hover + ink color | canonical |
| `.btn.text` | borderless / `var(--ink-2)` → `var(--ink)` + `var(--line-2)` hover (LIFTED 2026-05-20 from B2) | canonical |
| `.btn.danger` | `var(--warn)` text + `var(--warn-edge)` border + hover ink + `var(--warn-soft)` bg (Ban-12-degraded, ADDED 2026-05-20) | canonical |
| `.btn.sm` | pad 5/9 / 12 px / gap 5 | canonical |
| `.btn.icon` | pad 6 / 30×30 / center | canonical |
| `.btn.icon.sm` | 26×26 / pad 4 | canonical |
| Disabled | ink-3 / cursor-not-allowed / bg page / border line-2 | canonical |
| Loading | `aria-busy="true"` + spinning `loader` icon | KovaButton.vue `loading` prop binds loader |

**Diff: empty.** Two `#111` + `#fff` hex literals in canonical `.btn.primary` predate Cluster 11 — captured as Carryover-3 in `cluster-11-audit.md` §1.6a (founder decision post-Phase-3).

---

## 10. KovaInput + KovaField

| Property | canonical | Impl |
|---|---|---|
| `.input` bg | `var(--page)` | canonical |
| `.input` border | `1px solid var(--line)` | canonical |
| `.input` radius | `var(--r-lg)` (6) | canonical |
| `.input` pad | 7 px 10 px | canonical (off-scale 7/10 are canonical input chrome) |
| `.input` font | 13 px / `var(--ink)` / Inter | canonical |
| `.input:focus` | `var(--accent)` border / no shadow | canonical |
| `[aria-invalid="true"]` | `var(--ink-2)` border (ADDED 2026-05-20) | canonical |
| `.fld` layout | flex column / gap `var(--modal-field-gap)` (6) | canonical |
| `.fld label` | `var(--t-label-fz)` (12) / 500 / -0.003em / ink | canonical |
| `.fld .help` | `var(--ink-3)` / `var(--t-meta-fz)` | canonical |
| `.fld .help[role="alert"]` | `var(--ink)` (ADDED 2026-05-20) | canonical |
| `.fld input.input` modal variant | radius `var(--r-lg)` / pad `var(--modal-field-pad-y/x)` (8/11) / font `var(--t-input-fz)` (13) / focus `var(--ring-focus-ink)` + ink-2 border | canonical |

**Diff: empty.** v-model binding clean; ARIA wired via `useAttrs` + auto-generated `id`.

---

## 11. KovaPill

| Property | kova-hifi.css L367-393 | Impl |
|---|---|---|
| `.pill` | inline-flex / gap 6 / pad 4/9 / `var(--r-pill)` / 11.5 px / `var(--fill)` bg / `var(--ink-2)` text / 500 / -0.003em | canonical |
| `.pill .ic` | 12 × 12 | canonical (KovaIcon `size="xs"`) |
| `.pill.accent` | `var(--accent-soft)` bg / `var(--accent-ink)` text / `var(--accent-2)` border / `.ic` `var(--accent)` | canonical |
| `.pill.outline` | `var(--page)` bg / `1px solid var(--line)` | canonical |
| `.pill.dot` | leading 6 px circle `var(--accent)` | canonical (CSS pseudo) |
| Status variants | `.ok / .warn / .review` degrade to neutral | canonical |

**Diff: empty.**

---

## 12. KovaSegmented

| Property | design.md §3.8 | Impl |
|---|---|---|
| Container | `var(--fill)` bg / `var(--r-md)` / 2 px pad / 1 px gap | KovaSegmented.vue inline `:style` (off-scale 1/2 — primitive-specific, token-exempt rationale: design.md spec is sub-scale) |
| Cell size | `var(--h-control-xs)` (26) | canonical token reference |
| Cell radius | `var(--r-sm)` (4) | canonical token reference |
| Idle color | `var(--ink-3)` | canonical |
| Active bg/color | `var(--fill-2)` / `var(--ink)` | canonical |
| Hover (idle) | `var(--ink-2)` (NOT IMPL via inline style — Phase 5 carryover: add `:hover` rule via `<style>` block OR add canonical `.seg` block from Cluster 07b inspector mockup) | Phase 5 carryover |
| Transition | `var(--motion-fast) var(--ease-out)` | canonical |

**Diff: minor — hover-idle color not bound.** Carry to Phase 5 hardening pass (lift `.seg` chrome from Cluster 07b inspector hi-fi to canonical CSS).

---

## 13. KovaCheckbox

| Property | design.md §3.10 | Impl |
|---|---|---|
| Row | inline-flex / gap 8 / `var(--ink-2)` text / `var(--t-body-fz)` (12.5) | KovaCheckbox.vue inline `:style` (tokens) |
| Box | 14 × 14 (PRIMITIVE-SPECIFIC — not on spacing scale; design.md §3.10 spec value, token-exempt rationale: canonical checkbox size) | inline |
| Box radius | `var(--r-xs)` (3) | canonical token ref |
| Box border | `1px solid var(--line)` | canonical token ref |
| Box bg idle | `var(--bg)` | canonical token ref |
| Box bg checked | `var(--accent)` + border `var(--accent)` | canonical token ref |
| Box check glyph | `var(--ink-on-primary)` (`#fff`) | canonical (KovaIcon `check` xs) |
| Transition | `var(--motion-fast) var(--ease-out)` | canonical |

**Diff: empty.** 14 × 14 box is a design.md §3.10 canonical spec value (sub-scale primitive constant) — flagged for token promotion in Phase 5 (`--checkbox-size: 14px`).

---

## 14. KovaAvatar

| Property | design.md §3.15 + canonical `.avatar` (ADDED 2026-05-20) | Impl |
|---|---|---|
| Radius | `var(--r-pill)` (50 % effective on square) | canonical |
| Default bg | `var(--fill)` (per design.md §3.15 — "Our own avatars use --color-surface-input") | canonical |
| Color | `var(--ink)` | canonical |
| Layout | `display: grid; place-items: center` | canonical |
| Font-weight | 600 | canonical |
| flex-shrink | 0 | canonical |
| Sizes sm/md/lg/xl | 24 / 26 / 28 / 36 (with matching `font-size` ramp) | canonical via `.avatar.sm/md/lg/xl` |
| Brand bg | opt-in `bg` prop (e.g. Wildgrove `#c24a1e`) — customer data per design.md §3.15 | KovaAvatar.vue inline `:style` override |
| Image | `<img>` with `object-fit: cover` + 100 %  | canonical |

**Diff: empty.** Founder-flagged regression fixed 2026-05-20 (commit d4551d83).

---

## 15. KovaSelect

| Property | spec | Impl |
|---|---|---|
| Trigger | matches `.input` chrome (page bg / line border / `var(--r-lg)` / 30 px height / `var(--t-input-fz)`) | KovaSelect.vue inline `:style` (token refs) |
| Trigger caret | `chevron-down` xs / `var(--ink-3)` / `margin-left: auto` | inline |
| Disabled | opacity 0.5 / cursor not-allowed | inline |
| Min-width | 160 px (off-scale — primitive-specific) | inline (token candidate `--select-min-w`) |
| Content panel | `.popover` chrome (`var(--r-overlay)` / `var(--shadow-elev-2)` / page bg / line border) | canonical |
| Item | `.pop-row` (CHANGED from `.popover` 2026-05-20 fix) | canonical |
| Item hover | `var(--line-2)` (canonical `:hover` + Reka `[data-highlighted]` parity ADDED 2026-05-20) | canonical |
| Indicator | check icon | canonical (KovaIcon `check` xs `class="ck"`) |

**Diff: empty.** Founder-flagged regression fixed 2026-05-20 (commit d4551d83).

---

## 16. ConfirmModal

| Property | spec | Impl |
|---|---|---|
| Modal chrome | `KovaModal size="sm"` (460) | composes KovaModal |
| Title / body | `current.title / .body` from store stack | binds via current.value |
| Typed-confirm | field with `current.typedConfirmPhrase` validation gate | KovaField + computed `canConfirm` |
| Footer | Cancel (ghost) + Confirm/Delete (accent or danger) | KovaButton |
| Stack ceiling | 2 (KD-2) | `stores/confirm.ts` MAX_STACK |

**Diff: empty.**

---

## 17. NetworkStatusIndicator

| Property | PRD 11 §3.7 (W5a Figma-style) | Impl |
|---|---|---|
| Online | no chrome | `v-if="status === 'offline'"` |
| Offline icon | `cloud-off` 14 × 14 `var(--ink-2)` | NetworkStatusIndicator.vue KovaIcon `size="sm"` |
| Tooltip | KovaTooltip with copy "You're offline. Changes saved locally and sync when you reconnect." | NetworkStatusIndicator.vue |
| Detection | `navigator.onLine` + Realtime ping 3 s + 10 s ACK timeout + 1 s debounce | composables/use-online-status.ts |

**Diff: empty.** Realtime ping handler wires in consuming clusters per Plan 11 §3.4 note.

---

## 18. MarketingShell + EmailShell

| Property | spec | Impl |
|---|---|---|
| MarketingShell | light theme via `useTheme()` route swap / max-w 720 / pad 64/24 / Inter | components/marketing/MarketingShell.vue (token-exempt: shell layout chrome, not primitive) |
| EmailShell | concrete hex flattening (email clients strip CSS vars) / max-w 600 / List-Unsubscribe / Kova wordmark / footer | components/email/EmailShell.vue (token-exempt rationale: HTML email medium does not support CSS variables) |

**Diff: empty.** EmailShell's inline concrete hex is intentional — email-medium constraint per PRD 11 §3.8 + §5.5.

---

## Summary

| Primitive | Diff | Carryover |
|---|---|---|
| KovaToast | ✅ empty | — |
| KovaModal | ✅ empty | — |
| KovaPopover | ✅ empty | — |
| KovaMenu | ✅ empty | — |
| KovaTooltip | ✅ empty | — |
| KovaSkeleton | ✅ empty | — |
| EmptyState | ✅ empty | — |
| Error pages | ✅ empty | — |
| KovaButton | ✅ empty | C-3 hex (`#111 / #fff`) deferred |
| KovaInput + KovaField | ✅ empty | — |
| KovaPill | ✅ empty | — |
| KovaSegmented | ⚠️ hover-idle not bound | Phase 5 — lift `.seg` from 07b inspector |
| KovaCheckbox | ✅ empty | Promote 14 px box to `--checkbox-size` token |
| KovaAvatar | ✅ empty (post-fix d4551d83) | — |
| KovaSelect | ✅ empty (post-fix d4551d83) | Promote 160 px min-width to `--select-min-w` |
| ConfirmModal | ✅ empty | — |
| NetworkStatusIndicator | ✅ empty | — |
| MarketingShell + EmailShell | ✅ empty | — |

**Phase 5 hardening carryovers (3 tasks, ~30 min):**

1. Lift `.seg / .seg-pair` chrome from Cluster 07b inspector hi-fi → canonical kova-hifi.css. Drop KovaSegmented inline `:style`.
2. Promote primitive-specific sizes to tokens: `--checkbox-size: 14px`, `--select-min-w: 160px`. Add to kova-hifi.css :root + app.css @theme.
3. Founder C-3 decision on `.btn.primary` `#111 / #fff` hex (Carryover-3) — either token (`--btn-primary-ink: #111`) or design.md update.

**Lint warn cleanup carryover (Phase 5 hardening):**
- Replace inline `:style` token references with proper canonical class consumption where possible.
- Token-exempt remaining off-scale primitive-specific spacings with one-line justification comments.
- Email shell concrete-hex exempted (email-medium constraint).
- Debug surfaces (Cluster11Showcase + TokensDebugView) exempted (debug-only).

---

End of cluster-11-primitive-diffs.md.
