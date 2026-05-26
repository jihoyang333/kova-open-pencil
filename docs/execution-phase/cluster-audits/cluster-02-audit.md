# Cluster 02 — KOVA_AUDIT (Phase 1)

Generated 2026-05-25 per IMPLEMENTATION_PROMPT.md §3 (audit gate). Cluster 02 = Onboarding (4 wizard steps) + Dashboard (sidebar + topbar + composer + file-grid + skeleton + transition + empty states + coming-soon shells).

Sibling doc: [`cluster-02-tokens-used.md`](./cluster-02-tokens-used.md) — line-by-line visual-value enumeration with MISSING entries.

---

## 1.1 Token map (kova-hifi.css → @theme short-name)

Cluster 02 consumes the existing token set. Three new token bundles proposed (§1.4 — founder decision required before Phase 2 Vue impl).

| Short-name | Hex | Used by (Cluster 02 surfaces) |
|---|---|---|
| `--bg` | #242428 | canvas plate (out of cluster scope) |
| `--page` | #1a1a1d | `.app`, `.main`, `.topbar`, `.brand-switch`, `.dash-content` |
| `--rail` | #1a1a1d | `.sidebar`, `.side-footer` |
| `--fill` | #26262b | composer input idle, `.btn.ghost` hover, `.chip` idle, `.dropdown-item` hover |
| `--fill-2` | #303035 | `.skeleton` shimmer peak, segmented active deep state |
| `--line` | #2c2c30 | structural hairlines (topbar/sidebar/composer/card borders) |
| `--line-2` | #232327 | in-panel hairlines (`.side-footer` top, `.upnext-row` bottom, `.thumb` baseline) |
| `--ink` | #ebebee | primary text (heading, brand name, file name) |
| `--ink-2` | #a8a8ad | secondary text (meta "Last edited 3h", greeting body) |
| `--ink-3` | #6e6e73 | tertiary (labels, breadcrumb segments, `.eyebrow`) |
| `--ink-4` | #4a4a4f | disabled / dim |
| `--accent` | #3b82f6 | `.btn.accent`, composer submit, `.composer-status.ready` tick, AI surfaces |
| `--accent-soft` | #1d3a66 | selected-row tint (`.dropdown-item.selected`, future `.nav .item.active`) |
| `--accent-2` | #2a4d80 | accent secondary (border/hover) |
| `--accent-ink` | #a9c4ff | AI-only ink (`.onb-ai` headline, AI extraction promise) |

## 1.2 Existing-component inventory (Cluster 11 primitives consumed)

| Component | Status | Used by Cluster 02 |
|---|---|---|
| `KovaIcon` | ✅ exists | All icon glyphs (layout-grid, store, search-x, bookmark, layout-template, sparkles, chevron-down, plus, arrow-right, check, x, more-horizontal, paperclip, image, settings, calendar-days, file-text, archive, book-open, sun) |
| `KovaMenu` (DropdownMenu) | ✅ exists | `.brand-switch` dropdown (BrandSwitcher T19) — anchor + popover with brand list + dividers + actions |
| `KovaTooltip` | ✅ exists | Sidebar icon-only hover hints (per CHUNK-2 spec) |
| `KovaSkeleton` | ✅ exists | DashboardSkeleton T30 (B7.1 mirror) |
| `KovaModal` | ✅ exists | (Cluster 03 uses for A2/A3 — Cluster 02 only references for trigger) |
| `KovaPopover` | ✅ exists | (Tooltip alternative — not needed if KovaTooltip suffices) |
| `KovaToast` + `useToast` | ✅ exists | Future error surfaces (canvas-creation failure, etc.) |
| `KovaButton` | ✅ exists | `.btn` / `.btn.primary` / `.btn.accent` / `.btn.ghost` mappings |
| `KovaInput` | ✅ exists | Composer input, side-search input, onboarding text fields |
| `KovaSegmented` | ✅ exists | (Future view-toggle if 2-state needs segmented styling — T28 may prefer custom toggle) |
| `NetworkStatusIndicator` | ✅ exists (Cluster 11 CT-020) | Top-right offline pill (REPLACES retired OfflineIndicator) |
| `EmptyState` | ✅ exists | `.empty-pane` A11.1 / A11.7 / B9 reuse — verify visual match before reuse (per IMPL_PROMPT.md Hard Rule #17) |

## 1.3 Reuse decisions

| Need | Decision | Reason |
|---|---|---|
| Sidebar brand-switcher | Reuse `KovaMenu` | Reka DropdownMenu wrapped per Cluster 11; matches A2.a anchor + popover pattern |
| Sidebar nav rows | **Build new** `SideNav.vue` | No existing primitive matches `.nav .section h4` + `.nav a.item` pattern (icon + label + optional SOON pill + active state) |
| Sidebar footer | **Build new** `SideFooter.vue` | Avatar + name + plan + AccountMenu trigger — unique to dashboard |
| Composer input wrap | **Build new** `ComposerInputWrap.vue` | State machine (idle/submitting/review/transition) per B11.1–B11.3 |
| Composer chips | **Build new** `ComposerChips.vue` | Pill row mapped to 5 PRD-locked presets (`composer-presets.ts` constants) |
| Topbar | **Build new** `DashboardTopbar.vue` | `.topbar` 52px + `.breadcrumb` "Brand → Home" + "New canvas" sm button |
| File card | **Build new** `FileCard.vue` + `FileThumbnail.vue` | 4:3 aspect, abstraction picker, sort/view dropdown wrappers |
| File grid | **Build new** `FileGrid.vue` | 4-col grid, 14px gap, empty-state + skeleton orchestration |
| Skeleton dashboard | **Build new** `DashboardSkeleton.vue` | B7.1 shimmer mirror of dashboard chrome; wraps `KovaSkeleton` |
| Canvas-creation transition | **Build new** `CanvasCreationTransition.vue` | B11.1–B11.4 motion sequence (composer → submit-spinner → fade → splash) |
| Brand identity step | **Build new** `BrandIdentityStep.vue` | Consolidates 3 M9 steps (BrandNameStep + BrandUrlStep + NameStep). 64px logo slot + 2-field stack + auto-fetch logo via `useLogoFetch` |
| Shopify connect step | Refactor existing `StoreTypeStep.vue` | T02 already converted light → dark. T03 already moved access_token to Bearer. T14 = wire it into wizard sub-route. |
| Brand kit step | **Build new** `BrandKitStep.vue` | A1.01.e: 560px card, `.onb-drop`, `.onb-textarea`, `.onb-ai` accent card |
| Splash step | **Build new** `SplashStep.vue` | A1.01.f: 56×56 medal + 2×2 next-move grid + "Enter {Brand} workspace" CTA |
| Onboarding wizard host | Refactor `OnboardingView.vue` | Host `<router-view>` for 4 wizard sub-routes (T17) |
| Coming-soon shells | **Build new** `ComingSoonView.vue` + `coming-soon.ts` constants | A12.1–A12.3 `.cs-pane` (7 routes — calendar, swipes, templates, products, personalization, knowledge-base, memories) |
| Dashboard view shell | Refactor `DashboardView.vue` | Hosts sidebar + topbar + `<router-view>` for brand-scoped children (T35) |
| Recents view | **Build new** `RecentsView.vue` | composer + greeting + file-grid + empty + skeleton orchestration (T33) |
| Brand picker placeholder | **Build new** `BrandPickerView.vue` | T34 — Cluster 03 expands |

## 1.4 New tokens needed — founder decision (3 buckets, blocks Phase 2)

Per `cluster-02-tokens-used.md` MISSING summary. Cluster 02 is the first cluster where these drift values appear repeatedly enough that `/* token-exempt */` literals would sprawl. Promoting to canonical tokens prevents drift and matches design-system rider §2.1 "extend the system" path.

### Bucket 1 — `--ink-on-light` + `--surface-on-dark` (warm-white + near-black pair)

Repeats 10+ times in Cluster 02 alone (brand-switch logo glyph, `.btn.primary` bg/text, onb wordmark glyph, fetched-logo placeholder, breadcrumb logo, thumb CTA, avatar text). Currently raw hex `#ededea` (warm white) + `#0d0d0c` (near-black). Cluster 12 already documented these as toggle artifacts (§1.4); now they appear across the dashboard surface too.

**Proposed:**

```css
--ink-on-light:    #0d0d0c;  /* near-black ink for use on warm-light surfaces (logo glyphs, primary CTA text) */
--surface-on-dark: #ededea;  /* warm-white surface for use on dark page bg (logo plates, primary CTA bg) */
--surface-on-dark-hover: #ffffff;  /* hover state */
```

Add to `kova-hifi.css :root` + `src/app.css @theme` + `TOKEN_CANONICAL.md` short-name column.

### Bucket 2 — `--r-card: 8px` radius token

15+ surfaces use `border-radius: 8px` (file-card, empty-card, scene-card, upnext, onb-connect, onb-drop, onb-ai, splash medal frame). Sits between existing `--r-xl: 7px` and `--r-2xl: 10px`. Currently flagged ⚠️ MISSING in tokens-used.md.

**Proposed:**

```css
--r-card: 8px;  /* card / panel container radius — single most-used in chrome */
```

Add to `kova-hifi.css :root` + `design.md` §1.5 radius scale (insert between `--r-xl` and `--r-2xl`).

### Bucket 3 — Motion tokens (§1.7 deferred → committed)

design.md §1.7 has motion tokens marked "deferred". Cluster 02 is the first cluster to ship live motion (B11 canvas-creation transition + B7 skeleton shimmer + 12 chrome hover transitions). Without canonical tokens, every component would carry literal `0.15s` / `0.1s` / `1.4s` durations and lint Mandate 6 would either need exemptions or stay warn-only forever.

**Proposed (lift §1.7 from deferred to committed):**

```css
--motion-instant:  0.1s;    /* hover micro-interactions */
--motion-fast:     0.15s;   /* button bg/border transitions, default */
--motion-base:     0.2s;    /* composer fade-in, dropdown reveal */
--motion-slow:     0.24s;   /* page transitions (transition-fade) */
--motion-shimmer:  1.4s;    /* KovaSkeleton shimmer */
--motion-spin:     0.85s;   /* go-spin loader */
--ease-out:        cubic-bezier(.4, 0, .2, 1);
--ease-in-out:     cubic-bezier(.4, 0, .6, 1);
```

Add to `kova-hifi.css :root` + flip `design.md` §1.7 from deferred → committed + add to `TOKEN_CANONICAL.md`.

### Other MISSING (no founder block — drift §7b/c)

- `#95bf47` (Shopify brand green on `.btn.shopify`) → token-exempt; vendor brand color, not part of Kova design system
- `#fff` on `.btn.accent` text → alias as `--accent-ink-on-blue: #fff` OR keep literal with exempt comment; founder-deferred recommendation: keep literal since `--accent-ink` is reserved for AI-on-page-bg, this is text-on-accent-button which is conceptually different
- `border-width: 2px` on composer focus / select-frame → already canonical (`--frame-outline: 2px`) — reuse
- Dark card shadows (multi-stack `box-shadow` on `.file-card.hover`, `.upnext-row.hover`) → §7c keep literal with `/* token-exempt: hover elevation, hi-fi inline */`
- `#7a93ff` accent hover tint → alias via `color-mix(in oklab, var(--accent) 70%, white)` OR `--accent-hover: #7a93ff` — recommend alias

## 1.5 New components needed (T13–T37 spec)

| Component | Path | Source hi-fi | Plan task |
|---|---|---|---|
| `BrandIdentityStep.vue` | `src/components/onboarding/` | A1.01.c | T13 |
| `BrandKitStep.vue` | `src/components/onboarding/` | A1.01.e | T15 |
| `SplashStep.vue` | `src/components/onboarding/` | A1.01.f | T16 |
| `DashboardSidebar.vue` | `src/components/dashboard/` | 03.a `.sidebar` | T18 |
| `BrandSwitcher.vue` | `src/components/dashboard/` | A2.a + 03.a `.brand-switch` | T19 |
| `SideNav.vue` | `src/components/dashboard/` | 03.a `.nav` | T20 |
| `SideFooter.vue` | `src/components/dashboard/` | 03.a `.side-footer` | T21 |
| `DashboardTopbar.vue` | `src/components/dashboard/` | 03.a `.topbar` | T22 |
| `ComposerInputWrap.vue` | `src/components/dashboard/` | 03.a + B11.1–B11.3 | T24 |
| `ComposerChips.vue` | `src/components/dashboard/` | 03.a `.composer .chips` | T25 |
| `Composer.vue` | `src/components/dashboard/` | composes T24 + T25 | T26 |
| `FileThumbnail.vue` | `src/components/dashboard/` | 03.a `.thumb-*` | T27 |
| `FileCard.vue` | `src/components/dashboard/` | 03.a `.file-card` | T28 |
| `FileGrid.vue` | `src/components/dashboard/` | 03.a `.file-grid` | T29 |
| `SortDropdown.vue` | `src/components/dashboard/` | 03.a `.sec-head` filter | T28 |
| `ViewToggle.vue` | `src/components/dashboard/` | 03.a `.sec-head` view toggle | T28 |
| `DashboardSkeleton.vue` | `src/components/dashboard/` | B7.1 | T30 |
| `CanvasCreationTransition.vue` | `src/components/dashboard/` | B11.1–B11.4 | T32 |
| `RecentsView.vue` | `src/views/dashboard/` | 03.a content composition | T33 |
| `BrandPickerView.vue` | `src/views/` | placeholder; Cluster 03 expands | T34 |
| `ComingSoonView.vue` | `src/views/dashboard/` | A12.1–A12.3 | T37 |

Constants:
- `src/constants/composer-presets.ts` (T23) — 5 PRD-locked composer chip presets
- `src/constants/coming-soon.ts` (T36) — per-kind icon + headline + roadmap copy for 7 routes

## 1.6 Open questions

1. **Bucket 1 token decision** — promote `#ededea` / `#0d0d0c` to canonical `--surface-on-dark` / `--ink-on-light` (yes/no/different name). Currently used by Cluster 12 toggle artifact + Cluster 02 dashboard chrome (10+ surfaces).
2. **Bucket 2 radius decision** — promote `8px` to `--r-card` and insert into design.md §1.5 radius scale (yes/no).
3. **Bucket 3 motion decision** — flip design.md §1.7 motion tokens from "deferred" to committed with the 6-token set proposed (yes/no/different durations).
4. **`KovaToast` invocation surface** — when canvas-creation fails in B11, do we toast or inline-render the error in the composer? Plan doesn't specify; recommendation: toast + clear composer for retry.
5. **`/dashboard` legacy redirect store consult** — T12 router uses `require('./stores/ui-state')` to read `lastActiveBrandIdRef.value`. This works under bun but is uncommon in Vue codebases — confirm the pattern stays vs switching to a navigation guard with `useUIStateStore()`.
6. **Empty-state reuse confirmation** — Cluster 11's `EmptyState` primitive needs visual diff against A11.1 / A11.7 / B9.1 before reuse (per Hard Rule #17). If they diverge, add a variant prop or build new local component.

## Definition-of-Done coverage

- [x] §1.1 token map populated
- [x] §1.2 component inventory populated
- [x] §1.3 reuse decisions made
- [x] §1.4 new tokens — 3 buckets need founder decision (BLOCKS Phase 2 Vue impl)
- [x] §1.5 new components listed (21 new SFCs + 2 constants files)
- [x] §1.6 open questions logged (6)

## Phase 2 entry condition

**BLOCKED until founder resolves questions 1–3 in §1.6.** Once resolved, kova-hifi.css :root extended, design.md §1.5 + §1.7 updated, TOKEN_CANONICAL.md regenerated — then Phase 5 (T13 BrandIdentityStep) can start.
