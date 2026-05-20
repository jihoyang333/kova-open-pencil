# Cluster 11 — Phase 1 Audit (KOVA_AUDIT.md)

**Status:** DRAFT, awaiting founder approval. Created 2026-05-20 by W6 REDO agent.
**Authority:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §3 — `KOVA_AUDIT.md` is the audit-gate output. Companion: `cluster-11-tokens-used.md` (per-property visual values).
**Outcome:** no Vue / TS code until founder approves §1.6 (open questions) + R-1 through R-13 in tokens-used.md.

---

## §1.1 Token map — `kova-hifi.css :root` → `src/app.css @theme`

### Already wired (matching declared aliases) ✅

| `kova-hifi.css` short | `src/app.css @theme` long | Hex | Verified |
|---|---|---|---|
| `--page` | `--color-page` | `#1a1a1d` | ✅ |
| `--bg` (canvas plate) | `--color-bg` | `#242428` | ✅ (note semantic inversion vs design.md long names; see TOKEN_CANONICAL §2 footnote) |
| `--fill` | `--color-fill` | `#26262b` | ✅ |
| `--fill-2` | `--color-fill-2` / `--color-input-hi` | `#303035` | ✅ (both aliases declared) |
| `--line` | `--color-line` | `#2c2c30` | ✅ |
| `--line-2` | `--color-line-2` / `--color-hover` (M1 alias) | `#232327` | ✅ |
| `--ink` | `--color-ink` / `--color-surface` (M1 alias) | `#ebebee` | ✅ |
| `--ink-2` | `--color-ink-2` / `--color-muted` (M1 alias) | `#a8a8ad` | ✅ |
| `--ink-3` | `--color-ink-3` | `#6e6e73` | ✅ |
| `--ink-4` | `--color-ink-4` | `#4a4a4f` | ✅ |
| `--accent` | `--color-accent` | `#3b82f6` | ✅ |
| `--accent-soft` | `--color-accent-soft` | `#1d3a66` | ✅ |
| `--accent-ink` | `--color-accent-ai` | `#a9c4ff` | ✅ |
| Positional offsets (`--toolbar-bottom` etc.) | declared verbatim in `--toolbar-bottom` etc. | px values per design.md §3.11–§3.14 | ✅ (added 2026-05-20) |

### Missing from `src/app.css @theme` (block of Resolution-1)

| `kova-hifi.css :root` short | Hex / resolves to | Why missing | Status |
|---|---|---|---|
| `--rail` | `#1a1a1d` (== `--page`) | not aliased to `--color-rail` in @theme. Hi-fi `.menu / .dlg-foot / .popover .pop-search / .empty-pane .ic-wrap` all use `var(--rail)`. Lint fail. | ⚠️ R-1 |
| `--accent-2` | `#2a4d80` | not aliased. Used by `.pill.accent border-color` + `.popover.avatar .plan border-color` + `.toast.ai border-color`. | ⚠️ R-1 |
| `--warn` (alias for `--ink-2`) | resolves to `var(--ink-2)` | degraded-status alias not in @theme. Used by `.toast.error / .menu.destructive`. | ⚠️ R-1 |
| `--warn-soft` (alias for `--fill`) | resolves to `var(--fill)` | same | ⚠️ R-1 |
| `--warn-edge` (alias for `--line`) | resolves to `var(--line)` | same | ⚠️ R-1 |
| `--ok` / `--ok-soft` / `--review` / `--review-soft` | resolve to ink-2 / fill | same — defer-status aliases | ⚠️ R-1 |

### Missing entirely (not in kova-hifi.css OR app.css)

See `cluster-11-tokens-used.md` §10 for full list. Summary:
- Density tokens (R-7): `--h-control`, `--h-control-sm`, `--h-control-xs`, `--h-tool`, `--h-icon-btn`, `--h-topbar`, `--h-tabs`.
- Radii tokens (R-9, R-10): `--r-xs/sm/md/lg/xl/2xl/pill`, plus new `--r-overlay: 8px` for popover/menu/empty-pane outer.
- Shadow tokens (R-11): `--shadow-elev-1/2/3/page`.
- Motion tokens (R-12): `--motion-fast: 100ms`, `--motion-skeleton: 1400ms`, `--motion-toast-enter: 200ms`, easings.
- Z-scale (R-13): `--z-popover/dropdown/modal-backdrop/modal/toast`.
- Backdrop overlay (R-2): `--modal-backdrop: rgba(0,0,0,0.72)`.
- Focus-ring (R-3): `--ring-focus-ink` (TBD).
- Inline button hex (R-4): `--ink-on-primary: #fff`, `--accent-hover: #2563eb`.
- Primitive-specific spacing/sizing (R-5, R-6): named at point of use (`--modal-pad-x: 22`, `--popover-min-w: 240`, etc.).
- Typography scale (R-8): `--t-overline / --t-label / --t-body / --t-body-strong / --t-title-sm / --t-title-md / --t-meta` + new entries.

---

## §1.2 Existing-component inventory — `src/components/ui/*`

Audited 2026-05-20. Files dated `Mar 12 14:03` predate Kova (OpenPencil legacy). KovaIcon.vue + registry are the only Kova-touched files (May 19/20).

| File | Type | Verdict |
|---|---|---|
| `KovaIcon.vue` | Vue SFC | ✅ **KEEP.** Canonical primitive, registry-driven, dev-mode warning for unknown names. No raw hex / px. Needs registry expansion (audit lucide names corpus uses — Plan 11 Task 4.4). |
| `kova-icon-registry.ts` | TS Map | ✅ **KEEP.** Static map of 15 lucide imports + size table (`xs:12/sm:14/md:16/lg:20`). Plan 11 Task 4.4 will validate the size table against `design.md` §3 icon sizings (12/13/14/15/16/22 px appear in hi-fi). |
| `button.ts` | tailwind-variants helper | ⚠️ **REBUILD.** Tones (`ghost / accent / panel / panelAccent`) don't match canonical `.btn / .btn.primary / .btn.accent / .btn.ghost / .btn.danger`. Sizes (`h-7=28, h-8=32`) don't match canonical heights (30 default, 26 sm). Will be superseded by a new Vue SFC `KovaButton.vue` consuming canonical `.btn` classes from `kova-hifi.css`. |
| `input.ts` | tailwind-variants helper | ⚠️ **REBUILD.** Uses `text-[11px]` (arbitrary class) and `rounded` (4px) — canonical `.input` is 13/30/6px. Replace with `KovaInput.vue` SFC consuming canonical `.input`. |
| `menu.ts` | tailwind-variants helper for Reka DropdownMenu | ⚠️ **REBUILD against canonical `.menu`.** Current `p-1` (4px) padding matches canonical L128. Item `px-2 py-1.5` (8/6) doesn't match canonical `0 8px 0 10px + height: 26px`. Hover bg `bg-hover` (= `--line-2`) is correct. Border `border-border` (= `--line`) correct. Shape `rounded-lg` (8px) matches canonical 8px (R-10). **Most of menu.ts is salvageable but heights/padding/destructive variants need spec match.** Convert to per-class consumer of canonical `.menu .item`. |
| `select.ts` | tailwind-variants helper for Reka Select | ⚠️ **REBUILD against modal form-select spec** (`A4+A9+A10 Modals` `.fld` chrome). Current trigger `border-border bg-input text-surface` is close but missing caret + padding + focus state. |
| `surface.ts` | tailwind-variants helper for panels/overlays | ⚠️ **SPLIT INTO TWO.** Canonical design system: **flat-edged panels** (no radius) vs **floating overlays** (radius `8px` per R-10 or `10px` per `--r-2xl`). Current `surface.ts` rounds everything (`rounded-lg/-md/-xl`). Replace with `KovaPanel.vue` (no radius, no shadow) + `KovaOverlay.vue` (`--r-overlay`, `--shadow-elev-2/3`). |
| `toast.ts` | tailwind-variants helper for Reka Toast | ❌ **DELETE.** Tones use **generic Tailwind colors** (`bg-blue-600`, `bg-amber-600`, `bg-red-600`) that violate Hard Rule #9 (no hex outside `:root`), Ban 12 (no status colors until added to design.md §1.1), Ban 3 (no alternate hues). Toast spec per B1 is bg `--page` + glyph-led variants (success ink-2, error warn-aliased ink-2 + warn-edge border, ai accent-ink + accent-2 border). Replace with `KovaToast.vue` SFC + variants table. |

### M1-era ad-hoc Tailwind theme aliases in `src/app.css @theme`

These remain for back-compat with OpenPencil components (not Cluster 11 ship):
- `--color-panel: #1a1a1d` (= `--page`)
- `--color-canvas: #242428` (= `--bg`)
- `--color-border: #2c2c30` (= `--line`)
- `--color-hover: #232327` (= `--line-2`)
- `--color-surface: #ebebee` (= `--ink`)
- `--color-muted: #a8a8ad` (= `--ink-2`)
- `--color-input: #26262b` (= `--fill`)
- `--color-component: #9747ff` (purple — **violates Ban 3**)

**Decision needed (Q-A):** Keep M1 aliases (back-compat with OpenPencil-era code paths) OR deprecate + sweep references across non-Cluster-11 code? `--color-component: #9747ff` is purple — flag for removal regardless.

---

## §1.3 Reuse decisions per primitive

Per IMPLEMENTATION_PROMPT.md §3 Output 1 §1.3 + Hard Rule #17: a component qualifies for reuse ONLY if every visual property matches the mockup. Otherwise: extend with new variant prop OR build new.

| Primitive (PRD 11 §2.1) | Existing component | Verdict | Why |
|---|---|---|---|
| `KovaIcon` | `KovaIcon.vue` + registry | ✅ Reuse (extend registry per Plan 11 Task 4.4). | Canonical. |
| `KovaToast` + `ToastStack` | `toast.ts` (tv helper) | ❌ Build new SFC `KovaToast.vue` + `ToastStack.vue`. Delete `toast.ts`. | toast.ts uses generic Tailwind colors — every visual prop wrong. |
| `KovaModal` (sm/md/lg) | — | Build new `KovaModal.vue` (Reka Dialog wrapper consuming canonical `.dlg / .dlg-head / .dlg-body / .dlg-foot`). | No existing wrapper. |
| `KovaPopover` | — | Build new `KovaPopover.vue` (Reka Popover wrapper consuming `.popover / .pop-row / .pop-foot`). | No existing wrapper. |
| `KovaMenu` | `menu.ts` (tv helper) | ⚠️ Extend — keep tv helper as auxiliary class composer; build `KovaMenu.vue` SFC (Reka DropdownMenu wrapper consuming canonical `.menu / .menu .item / .menu .sep`). | Existing helper has SOME canonical match; needs heights + destructive variant. |
| `KovaTooltip` | — | Build new `KovaTooltip.vue` (Reka Tooltip wrapper). | No existing wrapper. Spec needs Q-B (see §1.6). |
| `KovaSkeleton` | — | Build new `KovaSkeleton.vue` consuming `.skeleton / .skeleton.r-pill / .r-card / .r-line / .r-circle` from B7 — lifted into a shared stylesheet or `@apply` block. | No existing component. |
| `KovaButton` (primary/secondary/ghost/danger/text/icon × sm/md) | `button.ts` | ❌ Build new `KovaButton.vue` consuming canonical `.btn / .btn.primary / .btn.accent / .btn.ghost`. Delete `button.ts`. | tones + sizes both don't match. |
| `KovaInput` | `input.ts` | ❌ Build new `KovaInput.vue` consuming canonical `.input`. Delete `input.ts`. | Visual props mismatch. |
| `KovaField` (label + input + helper + error) | — | Build new `KovaField.vue` consuming canonical `.field` + modal-form `.fld` patterns. | No existing component. |
| `KovaSegmented` | — | Build new `KovaSegmented.vue` consuming `design.md §3.8` spec. | No hi-fi in Cluster 11 spec sources; PRD 11 §2.1 lists it. **Spec source = design.md §3.8 + 07b inspector hi-fi (Cluster 07b).** ⚠️ Q-C in §1.6. |
| `KovaPill` (neutral / accent / outline / dot) | — | Build new `KovaPill.vue` consuming canonical `.pill / .pill.accent / .pill.outline / .pill.dot`. | Canonical exists in kova-hifi.css. |
| `KovaCheckbox` | — | Build new `KovaCheckbox.vue` per `design.md §3.10`. | Not in src/components/ui. |
| `KovaAvatar` | — | Build new `KovaAvatar.vue` per `design.md §3.15`. | Not in src/components/ui. |
| `KovaSelect` | `select.ts` | ⚠️ Extend — build `KovaSelect.vue` SFC (Reka Select wrapper). Existing `select.ts` is an empty-state of canonical (no padding/heights/caret). | Salvage trigger base, rebuild content + items. |
| `EmptyState` (inline-32 / panel-40 / full-48) | — | Build new `EmptyState.vue` consuming B9 `.empty-pane / .empty-pane.inline / .empty-pane.full-page`. | Canonical CSS NOT in kova-hifi.css — extracted from B9 inline `<style>`. Resolution-14 (see §1.6 Q-D). |
| `NetworkStatusIndicator` | — | Build new `NetworkStatusIndicator.vue`. Renders 14×14 `cloud-off` + tooltip when `useOnlineStatus() === 'offline'`. PRD 11 §3.7. | New per W5a Figma-style decision (no banner). |
| `MarketingShell` | — | Build new `MarketingShell.vue` (light variant for /privacy, /terms). PRD 11 §3.8. | Cluster 11 owns shell; Cluster 01 owns routes. |
| `EmailShell` | — | Build new email template `src/components/email/EmailShell.vue` (HTML email — inline CSS, max-width 600). PRD 11 §3.8 + §5.5. | No existing template. |
| `Error404View / Error500View / NetworkUnreachableView` | — | Build new error views consuming B2 `.err-page / .err-card / .err-icon-tile / .err-cta-stack`. | Canonical not in kova-hifi.css; extracted from B2. Resolution-14. |

---

## §1.4 New tokens needed

See `cluster-11-tokens-used.md` §10 — 13 founder resolutions cover every token addition. Summary:

1. Aliases (R-1): `--rail`, `--accent-2`, `--warn`, `--warn-soft`, `--warn-edge`, `--ok`, `--ok-soft`, `--review`, `--review-soft`.
2. Overlay (R-2): `--modal-backdrop: rgba(0,0,0,0.72)`.
3. Focus ring (R-3): `--ring-focus-ink: 0 0 0 3px rgba(235,235,238,0.05)` (sub-decision: which input focus pattern is canonical).
4. Hex extraction (R-4): `--ink-on-primary: #fff`, `--accent-hover: #2563eb`.
5. Primitive spacing (R-5): `--modal-pad-x: 22`, `--modal-pad-head-y: 18`, `--modal-pad-foot-y: 14`, `--popover-row-gap: 9`, `--popover-row-padding: 6px 8px`, `--toast-pad: 12px 14px`, `--toast-gap: 11`, `--toast-dismiss: 18`, `--empty-pad-panel: 36px 24px`, `--err-page-gap: 22`, `--err-card-pad: 40px 32px`, `--err-btn-pad: 9px 14px`, `--modal-field-pad: 8px 11px`.
6. Sizing (R-6): `--modal-w-sm: 460`, `--modal-w-md: 540`, `--modal-w-lg: 880`, `--popover-min-w: 240`, `--menu-min-w: 220`, `--menu-min-w-md: 260`, `--menu-min-w-lg: 280`, `--toast-min-w: 280`, `--toast-max-w: 420`, `--err-card-w: 420`, `--err-cta-w: 280`, `--empty-icon-40: 40`, `--empty-icon-48: 48`, `--popover-avatar-logo: 22`.
7. Density (R-7): `--h-control: 30`, `--h-control-sm: 28`, `--h-control-xs: 26`, `--h-tool: 36`, `--h-icon-btn: 28`, `--h-topbar: 44`, `--h-tabs: 44`.
8. Typography (R-8): `--t-overline / --t-label / --t-body / --t-body-strong / --t-title-sm / --t-title-md / --t-meta` + `--t-input: 13/?/400/0`, `--t-modal-title: 16/?/600/-0.005em`, `--t-action-12: 12/1/500/-0.003em`, `--t-microcopy: 10/?/400/0`, `--t-sublabel: 10.5/?/400/0`, plus line-height tokens `--lh-loose: 1.5`, `--lh-loosest: 1.55`, `--lh-1: 1`.
9. Radii (R-9): `--r-xs: 3`, `--r-sm: 4`, `--r-md: 5`, `--r-lg: 6`, `--r-xl: 7`, `--r-2xl: 10`, `--r-pill: 999`.
10. Off-scale radius (R-10): `--r-overlay: 8`.
11. Shadows (R-11): `--shadow-elev-1` (toast), `--shadow-elev-2` (popover/menu shared), `--shadow-elev-3` (modal), `--shadow-elev-page` (canvas mockup chrome).
12. Motion (R-12): `--motion-fast: 100ms`, `--motion-normal: 200ms`, `--motion-skeleton: 1400ms`, `--motion-toast-enter: 200ms`, `--motion-toast-exit: 150ms`, `--ease-out: cubic-bezier(0.2, 0, 0, 1)`, `--ease-in-out: ease-in-out`.
13. Z-scale (R-13): `--z-popover: 10`, `--z-dropdown: 12`, `--z-modal-backdrop: 19`, `--z-modal: 20`, `--z-toast: 30`.

---

## §1.5 New components needed

Per §1.3 verdict column. Total: 17 new Vue SFCs to ship in Cluster 11.

**Layer 1 — primitives (consumed by every cluster):**
1. `src/components/ui/KovaButton.vue`
2. `src/components/ui/KovaInput.vue`
3. `src/components/ui/KovaField.vue`
4. `src/components/ui/KovaPill.vue`
5. `src/components/ui/KovaSegmented.vue`
6. `src/components/ui/KovaCheckbox.vue`
7. `src/components/ui/KovaSelect.vue`
8. `src/components/ui/KovaAvatar.vue`
9. `src/components/ui/KovaSkeleton.vue`
10. `src/components/ui/KovaTooltip.vue`
11. `src/components/ui/KovaModal.vue`
12. `src/components/ui/KovaPopover.vue`
13. `src/components/ui/KovaMenu.vue`
14. `src/components/ui/KovaToast.vue` + `src/components/ui/ToastStack.vue`

**Layer 2 — surfaces:**
15. `src/components/ui/EmptyState.vue`
16. `src/components/network/NetworkStatusIndicator.vue`
17. `src/components/marketing/MarketingShell.vue`
18. `src/components/email/EmailShell.vue`

**Layer 3 — full-page routes:**
19. `src/views/error/NotFoundView.vue`
20. `src/views/error/ServerErrorView.vue`
21. `src/views/error/NetworkUnreachableView.vue`

**Layer 4 — showcase:**
22. `src/views/dev/Cluster11Showcase.vue` (the founder-smoke-test route `/dev/cluster-11`).

**Files to DELETE (legacy, replaced by SFCs):**
- `src/components/ui/button.ts`
- `src/components/ui/input.ts`
- `src/components/ui/toast.ts`

**Files to REVISE (extend, don't delete):**
- `src/components/ui/menu.ts` — keep tv helper as auxiliary class composer; `KovaMenu.vue` SFC drives it.
- `src/components/ui/select.ts` — same.
- `src/components/ui/surface.ts` — split into `panelSurface` (flat) vs `overlaySurface` (rounded + shadowed).
- `src/app.css @theme` — extend with R-1 through R-13 additions.
- `design-system/canonical/kova-hifi.css :root` — extend with R-1 through R-13.
- `design-system/canonical/design.md` — update §1.2 (typography), §1.4 (radii + `--r-overlay`), §1.6 (shadows), §1.7 (motion), add §1.8 (z-scale).
- `design-system/canonical/TOKEN_CANONICAL.md` — update §2 reference tables.

---

## §1.6 Open questions for founder

Route each via `AskUserQuestion`. Cannot proceed to Phase 2 until every Q is answered.

### Q-A — M1-era ad-hoc Tailwind aliases

`src/app.css @theme` has 8 M1-era aliases (`--color-panel`, `--color-canvas`, `--color-border`, `--color-hover`, `--color-surface`, `--color-muted`, `--color-input`, `--color-component`). The first 7 are duplicates of canonical short-name semantics. The 8th (`--color-component: #9747ff`) is **purple — violates Ban 3** (no alternate accent, no purple).

**Pick one:**
- (A1) Keep all 8 M1 aliases for back-compat with OpenPencil-era code paths. Remove `--color-component` purple regardless.
- (A2) Sweep references to M1 aliases across non-Cluster-11 code in a follow-up PR; keep aliases for this cluster's ship window. Remove `--color-component` purple regardless.
- (A3) Hard-cut M1 aliases now. Sweep references in this cluster's PR. Remove `--color-component` purple.

Recommendation: **A2.** Mass rename risks regressions in unaudited OpenPencil code. Cluster 11 ship-window stays narrow.

### Q-B — KovaTooltip spec

No hi-fi defines `.tooltip` selectors. PRD 11 §3.4 specifies: "Reka Tooltip; show delay 500ms; 11.5px / `--ink` on `--rail` bg, radius 5px." No padding, no shadow specified.

**Decide:**
- (B1) Adopt PRD verbatim + extend with shadow + padding. Propose: bg `var(--rail)`, color `var(--ink)`, font 11.5, padding `4px 8px`, radius `var(--r-md)` (5), shadow `var(--shadow-elev-2)`, max-width 240, transition `var(--motion-fast)`.
- (B2) Lift Figma tooltip pattern (smaller chip, no shadow): bg `var(--rail)`, color `var(--ink)`, font 11, padding `3px 6px`, radius `var(--r-sm)` (4), no shadow.
- (B3) Other — founder dictates.

Recommendation: **B1** with shadow.

### Q-C — KovaSegmented spec source

`design.md §3.8` specifies the segmented control (`--color-surface-input` container, 2px padding, 26×26 cells, etc.). No Cluster 11 hi-fi shows it. **Closest reference: Cluster 07b Inspector hi-fi `Kova Hi-Fi 11 Inspector - Dark.html`** which contains the `.seg / .seg-pair` selectors.

**Decide:**
- (C1) Build `KovaSegmented.vue` from design.md §3.8 spec now; visual-diff against Cluster 07b inspector hi-fi (pre-Cluster-07b). Risk: Cluster 07b implementation may discover drift; refactor cost low.
- (C2) Defer `KovaSegmented.vue` to Cluster 07b; ship a stub here.
- (C3) Other.

Recommendation: **C1.** PRD 11 §2.1 lists it as a Cluster 11 component. Diff target is unambiguous.

### Q-D — Lift `.toast / .dlg / .popover / .menu / .skeleton / .empty-pane / .err-*` into `kova-hifi.css`?

These selectors are extracted from hi-fi inline `<style>` blocks. They're CANONICAL (downstream every cluster consumes via `<KovaX>` Vue SFC). But `kova-hifi.css` doesn't define them — each hi-fi inlines its own.

**Decide:**
- (D1) Lift all extracted primitives into `design-system/canonical/kova-hifi.css` (add new `@layer` sections). The Vue SFCs `@apply` or reference canonical class names directly. Hi-fi mockups stay byte-frozen.
- (D2) Keep primitives as Vue SFC `@apply` blocks in a NEW file `src/styles/cluster-11-primitives.css` (auto-imported via app.css `@import`). Mockups stay byte-frozen. Canonical kova-hifi.css unchanged.
- (D3) Hybrid: components-only file (per primitive). E.g., `src/components/ui/KovaToast.css` next to `KovaToast.vue`.

Recommendation: **D1.** The hi-fi inline styles are de-facto canonical; lifting them codifies them. Lowers cognitive load (one place for token + component definitions). One commit per primitive section added.

### Q-E — Reka UI version + install confirmation

PRD 11 + RIDER §4.2 say "Reka Dialog / Popover / DropdownMenu / Tooltip" wrappers. Plan 11 Task 4.x doesn't verify Reka is installed. Quick check needed before Phase 3.

**Decide:**
- (E1) Verify `package.json` lists Reka — pin to latest stable + context7-check docs before any wrapper SFC. If missing, install + commit `chore(deps): add reka-ui`. Founder approves the dep add.
- (E2) Replace Reka with `@headlessui/vue` (different library). [NOT recommended — RIDER §2.4 explicitly says "DO NOT reach for headless-ui or any other UI library".]

Recommendation: **E1.**

### Q-F — Replace Vue Skill from execution prompt: redo branch is `app/cluster-11-redo` not `app/cluster-11-foundation`

Execution prompt line 261 says: "Continue on app/cluster-11-foundation (after the redo reset per founder's choice of Path A or B above)." But the actual branch is `app/cluster-11-redo` (already at clean state, 6 commits ahead of `feat/m9-shopify` = pure infra/docs/contract setup, NO UI freestyle inherited).

**Decide:**
- (F1) Continue on `app/cluster-11-redo`. Treat execution prompt's `app/cluster-11-foundation` as stale.
- (F2) Rename branch to match the prompt.
- (F3) Other.

Recommendation: **F1.** Branch is the redo branch; name is more accurate; rename adds zero value.

### Q-G — Visual-diff fixture for primitives without dedicated hi-fi

Per IMPLEMENTATION_PROMPT.md §5: "For each primitive that does NOT have a dedicated hi-fi mockup of its own, extract the spec from a screen hi-fi… Build the primitive to match THOSE pixel-for-pixel. Showcase = stitched examples from real screens."

In practice: the `<KovaToast>` Vue route can be diffed against the `.toast` element extracted from `B1` by serving the `B1` hi-fi via `/dev/hifi/states/Kova%20Hi-Fi%20B1%20Toasts%20-%20Dark.html?ci=1` and **clipping to the toast region** (Playwright `page.locator('.toast').first().screenshot()`). Same for modal/popover/menu/skeleton/empty/error.

**Decide:**
- (G1) Use the clip-region pattern. Implement via Playwright `clip:` option + per-primitive selector. Document in `tests/snapshots/cluster-11/README.md`.
- (G2) Build a foundation `/dev/hifi/foundation/` directory of stitched primitive-only HTML pages (per primitive, just the `.toast` or `.dlg` block) for cleaner visual diffs. Cost: ~9 new HTML files in `design-system/hifi/foundation/`.
- (G3) Skip per-primitive visual-diff; rely on per-screen visual-diff in consuming clusters (W7-W12).

Recommendation: **G1.** Lowest cost, highest fidelity. The clip-region matches the actual mockup pixels.

### Q-H — Email shell deferred to Resend env-wire

PRD 11 §5.5 + scope plan §11: Resend stub-guarded behind `RESEND_API_KEY`. EmailShell.vue still ships at MVP but never sends until pre-launch. **Decide:** ship the SFC + render-only `/dev/cluster-11/email` preview route at this cluster; defer send-integration test to pre-launch. ✅ matches PRD; just confirming intent.

### Q-I — Idempotency `request_hash` cross-cluster contract

Plan 11 Task 1.3 + PRD 11 §5.5: helper hashes raw `req.text()` bytes. Cluster 04 (Stripe) + Cluster 01 (deletion-request) need to serialize JSON deterministically. **Decide:** call this out in `src/lib/idempotency.ts` JSDoc + add CI grep gate in Phase 11 Task 11.x to flag non-deterministic `JSON.stringify` in idempotency-keyed call sites. ✅ matches PRD. Just flagging for visibility — no founder block.

---

## §1.7 Phase 1 acceptance criteria (per IMPLEMENTATION_PROMPT.md §12 DoD)

Before agent proceeds to Phase 2 (token additions):
- [ ] Founder reads `cluster-11-tokens-used.md` end-to-end.
- [ ] Founder reads this `cluster-11-audit.md` end-to-end.
- [ ] Founder answers Q-A through Q-I above (via AskUserQuestion).
- [ ] Founder approves R-1 through R-13 in `cluster-11-tokens-used.md` §10 (default recommendations OK as a block, or pick line-by-line).
- [ ] Founder confirms branch is `app/cluster-11-redo` (Q-F).
- [ ] Founder confirms M1-alias policy (Q-A).
- [ ] Founder confirms Reka install path (Q-E).

After approval the agent will:
1. **Phase 2:** apply token additions across `kova-hifi.css :root` + `src/app.css @theme` + `design.md` + `TOKEN_CANONICAL.md`. One commit. Build `/dev/tokens` debug route. PAUSE for founder approval.
2. **Phase 3:** build primitives one-by-one. Per primitive: per-property diff → Vue SFC → per-property re-diff → visual-diff gate ≤ 0.1% against clipped hi-fi region (Q-G). One commit per primitive.
3. **Phase 4:** build `/dev/cluster-11` showcase. Founder smoke-test.

---

## §1.8 What did the prior W6 ship that's worth keeping?

Per the redo prompt and git log of `feat/m9-shopify..HEAD` (6 commits), prior work on `app/cluster-11-foundation` was reset away — this branch (`app/cluster-11-redo`) is clean. **Nothing inherited; nothing to salvage.** The 6 commits already on `app/cluster-11-redo` are pure infra/docs/contract:

1. `cac45247` docs: invert visual-fidelity contract (the 3-rule contract itself)
2. `fef64061` feat(hifi): ship hi-fi mockups + canonical design system in-repo
3. `b4b82639` feat(ci-determinism): bake Inter + Lucide locally + Vite hi-fi serve
4. `723e795f` feat(test): lint rule + Playwright visual-diff infra
5. `14a3e36b` docs(plans): patch 13 impl plans with 3-rule contract + in-repo paths
6. `fad628d3` docs(exec-prompts): patch 13 W-prompts + W6 REDO with new contract

All ✅ keep. No regression.

---

## §1.9 Risks + mitigations

| Risk | Mitigation |
|---|---|
| **R1: 13 token-decisions block Phase 2.** Founder may pick non-default for some, requiring re-mapping. | Tokens-used §10 gives default recommendation per resolution; founder approves block or line-item. If line-item changes occur, the agent re-maps before Phase 2. |
| **R2: `--r-overlay: 8px` extension changes design.md §1.4.** | Document the addition in design.md §1.4 changelog. Single-line addition; no breaking change. |
| **R3: Typography scale extension blows up existing components that hardcode `font-size: 13px` (input default).** | The new tokens add NEW entries; existing usage continues to render. The lint rule warns first, then errors (one week after introduction). Existing usage gets migrated cluster-by-cluster. |
| **R4: Hi-fi mockups have inline `<style>` with raw px that will fail lint when serving through dev plugin.** | The lint rule's scope (per IMPLEMENTATION_PROMPT.md §9) excludes `design-system/hifi/**`. Only Vue files + app code get lint-checked. |
| **R5: Reka UI primitive APIs may change between versions.** | Q-E pins to a known version + context7-checks docs. Plan 11 Task 4.x verifies. |
| **R6: Per-primitive visual-diff against clipped hi-fi region requires precise selector + sub-pixel mask.** | Q-G picks G1 (clip-region); fixture in `tests/visual-diff/fixtures/ci-deterministic.ts` already handles font/icon/animation determinism. Per-primitive clip is one Playwright `page.locator(...).screenshot({ clip })` call. |
| **R7: Cluster 11 doesn't have a "design surface" of its own — visual approval is harder than for an app screen.** | `/dev/cluster-11` showcase route renders every primitive in every state. Founder smoke-tests by clicking through. PR-image rows per primitive include clipped hi-fi vs Vue impl vs diff. |

---

## §1.10 Estimated timeline (after founder approval)

Per W6 prompt's parent estimate (6-10h Opus 4.7) — REDO scope is lighter than original W6 because backend/infra commits already exist on `app/cluster-11-redo`.

| Phase | Time |
|---|---|
| Phase 2 (token additions + `/dev/tokens` route) | 30 min |
| Phase 3 (17 primitive SFCs, ~15 min each incl. visual-diff loop) | 4-5 hours |
| Phase 4 (`/dev/cluster-11` showcase + screenshots) | 30-45 min |
| Phase 5 (code-reviewer + e2e-runner + Playwright gate + PR artifact) | 60 min |
| **Total** | **6-7 hours active agent time** |

---

**End of cluster-11-audit.md. Founder reviews → AskUserQuestion next.**
