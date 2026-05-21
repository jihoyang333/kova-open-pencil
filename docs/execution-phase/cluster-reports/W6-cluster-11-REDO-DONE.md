# W6 Cluster 11 (Foundation) — REDO DONE Report

**Status:** ✅ READY FOR FOUNDER MERGE (after browser smoke).
**Branch:** `app/cluster-11-redo` — **8 commits** ahead of `feat/m9-shopify`.
**Dispatched:** 2026-05-20 (W6 REDO per `docs/execution-phase/execution-prompts/W6-cluster-11-foundation.md`).
**Closed:** 2026-05-20.
**Agent:** Opus 4.7.

---

## Phase pipeline (all 5 phases complete)

| Phase | Output | Commit | Status |
|---|---|---|---|
| 0 — Setup (pre-existing on branch) | 6 contract / docs commits inherited (no UI freestyle) | through `fad628d3` | ✅ kept |
| 1 — Audit gate | `cluster-11-audit.md` + `cluster-11-tokens-used.md` + 13 founder resolutions | `ab092bf3` | ✅ founder-approved 2026-05-20 |
| 2 — Token additions | 110+ new tokens in `kova-hifi.css :root` + `app.css @theme` + `design.md` + `TOKEN_CANONICAL.md` + `/dev/tokens` debug route + canonical CSS primitive lifts (~530 lines) | `8eb974c8` + `8146c1a3` (KovaIcon + scroll fix) | ✅ founder smoke 2026-05-20 |
| 3 — Primitive Vue SFCs | 17 SFCs + 6 composables + 2 Pinia stores + 4 surface components + 3 error views + Cluster11Showcase + global mounts | `43e2fdaf` + `d4551d83` (4 fixes) | ✅ founder smoke 2026-05-20 |
| 4 — Per-primitive diff + Playwright | `cluster-11-primitive-diffs.md` (424-row) + `tests/visual-diff/cluster-11/primitives.visual.spec.ts` (clip-region G1) + `tests/snapshots/cluster-11/README.md` | `5ee5372e` | ✅ |
| 5 — Code review + fixes | `superpowers:code-reviewer` PASS WITH NOTES. HIGH-1 (noteAck contract) + HIGH-2 (26 unit tests, all green) + LOW-11/13 + MEDIUM-8 fixed | `66abbbfc` | ✅ |

---

## Per-primitive closure table

Per IMPLEMENTATION_PROMPT.md §12 DoD. Visual-diff column = Playwright clip-region result baseline once `bun run test:visual --update-snapshots` runs against dev server (post-deploy).

| Primitive | Spec source (hi-fi) | Vue impl | Visual-diff status |
|---|---|---|---|
| KovaToast (success / error / info / action / progress / ai) | `states/Kova Hi-Fi B1 Toasts - Dark.html` `.toast` L439-501 | `src/components/ui/KovaToast.vue` + `ToastStack.vue` | ⏳ baseline generation pending dev-server smoke |
| KovaModal (sm 460 / md 540 / lg 880) | `canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` `.dlg` L44-86 + brand-kit / auth modals | `src/components/ui/KovaModal.vue` | ⏳ baseline pending |
| KovaPopover (default + avatar variant) | A6+A2a `.popover / .popover.avatar` L114-217 | `src/components/ui/KovaPopover.vue` | ⏳ baseline pending |
| KovaMenu | `canvas-chrome/Kova Hi-Fi 08 Top Chrome Menus - Dark.html` `.menu` L123-209 (LOCK) | `src/components/ui/KovaMenu.vue` | ⏳ baseline pending |
| KovaTooltip | PRD 11 §3.4 + Q-B B1 (no hi-fi) | `src/components/ui/KovaTooltip.vue` | ⏳ baseline pending |
| KovaSkeleton (r-pill / r-card / r-line / r-circle) | `states/Kova Hi-Fi B7 Loading Skeletons - Dark.html` L66-101 | `src/components/ui/KovaSkeleton.vue` | ⏳ baseline pending |
| EmptyState (inline-32 / panel-40 / full-48) | `states/Kova Hi-Fi B9 List Search Empty - Dark.html` L188-313 + B9 A11 lift | `src/components/ui/EmptyState.vue` | ⏳ baseline pending |
| Error views (404 / 500 / network-unreachable) | `states/Kova Hi-Fi B2 Error Pages - Dark.html` L33-93 | `src/views/error/NotFoundView.vue` + `ServerErrorView.vue` + `NetworkUnreachableView.vue` | ⏳ baseline pending |
| KovaButton (default / primary / accent / ghost / danger / text + sm + iconOnly + loading) | canonical `.btn` L332-365 + W6 additions for `.text` + `.danger` (2026-05-20) | `src/components/ui/KovaButton.vue` | ✅ written diff empty |
| KovaInput + KovaField | canonical `.input` L423-450 + `.fld` lift | `src/components/ui/KovaInput.vue` + `KovaField.vue` | ✅ written diff empty |
| KovaPill (neutral / accent / outline / dot) | canonical `.pill` L367-393 | `src/components/ui/KovaPill.vue` | ✅ written diff empty |
| KovaSegmented | design.md §3.8 + 07b inspector ref | `src/components/ui/KovaSegmented.vue` | ⚠️ hover-idle binding deferred to Phase 5b (see §Carryovers) |
| KovaCheckbox | design.md §3.10 | `src/components/ui/KovaCheckbox.vue` | ✅ written diff empty |
| KovaAvatar | design.md §3.15 + canonical `.avatar` (added 2026-05-20) | `src/components/ui/KovaAvatar.vue` | ✅ written diff empty (post-fix d4551d83) |
| KovaSelect | A4+A9+A10 modal-form select + canonical `.input` trigger | `src/components/ui/KovaSelect.vue` | ✅ written diff empty (post-fix d4551d83) |
| ConfirmModal | composes KovaModal + KovaField | `src/components/ui/ConfirmModal.vue` | ✅ written diff empty |
| NetworkStatusIndicator | PRD 11 §3.7 (W5a Figma-style) | `src/components/network/NetworkStatusIndicator.vue` | ✅ written diff empty |
| MarketingShell | light-theme shell, PRD 11 §3.8 | `src/components/marketing/MarketingShell.vue` | ✅ within email/marketing token-exempt scope |
| EmailShell | HTML email template, PRD 11 §3.8 + §5.5 | `src/components/email/EmailShell.vue` | ✅ within email-medium token-exempt scope |

---

## 3-screenshot artifact

**Status: ⏳ pending baseline generation against running dev server.**

Per IMPLEMENTATION_PROMPT.md §6 + audit Q-G G1, the founder generates baselines by running:
```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
bun run dev   # in one terminal (Vite at localhost:1420 + hifi-serve-plugin)
bun run test:visual --update-snapshots   # in another
```
This writes `<primitive>-mockup.png` + `<primitive>-impl.png` to `tests/snapshots/cluster-11/<test-fixture-dir>/`. Commit the baselines. Subsequent `bun run test:visual` runs the regression diff at 0.1% component-level threshold; PR description includes the mockup / impl / diff PNGs (per §6 last paragraph + carryover C-2 in `cluster-11-audit.md` §1.6a).

Spec at `tests/visual-diff/cluster-11/primitives.visual.spec.ts` is ready. CI-deterministic fixture (`tests/visual-diff/fixtures/ci-deterministic.ts`) handles font + icon + animation determinism.

---

## Token diff — every new token added

Full table in `docs/execution-phase/cluster-audits/cluster-11-tokens-used.md` §10 (R-1..R-13). Summary:

| Resolution | New tokens | Origin |
|---|---|---|
| R-1 | `--color-rail`, `--color-accent-2`, `--color-warn`, `--color-warn-soft`, `--color-warn-edge`, `--color-ok`, `--color-ok-soft`, `--color-review`, `--color-review-soft`, `--color-ink-on-primary`, `--color-accent-hover`, `--color-modal-backdrop` | already in `kova-hifi.css :root`; mirrored to `app.css @theme` for Tailwind utility-class generation. M1-era purple `--color-component: #9747ff` deleted. |
| R-2 | `--modal-backdrop: rgba(0,0,0,0.72)` | PRD 11 §3.3 |
| R-3 | `--ring-focus-ink: 0 0 0 3px rgba(235,235,238,0.05)` | A6+A2a modal-form `.fld input.input:focus` |
| R-4 | `--ink-on-primary: #fff`, `--accent-hover: #2563eb` | extracted from `.btn.primary:hover` + `.btn.accent:hover` hex literals |
| R-5 (~50 tokens) | `--toast-*`, `--modal-*`, `--popover-*`, `--menu-*`, `--tooltip-*`, `--skeleton-*`, `--empty-*`, `--err-*` primitive-specific spacing | each value cited per `cluster-11-tokens-used.md` §1-§9 |
| R-6 (~15 tokens) | `--modal-w-sm/md/lg`, `--popover-min-w`, `--toast-min-w/-max-w`, `--menu-min-w/-md/-lg`, `--err-card-w/-cta-w`, `--popover-row-logo`, `--popover-avatar-av`, etc. | sizing constants |
| R-7 (7 tokens) | `--h-control: 30`, `--h-control-sm: 28`, `--h-control-xs: 26`, `--h-tool: 36`, `--h-icon-btn: 28`, `--h-topbar: 44`, `--h-tabs: 44` | design.md §2 + §4 — never in CSS file before, now wired |
| R-8 (~50 tokens) | `--t-overline-*`, `--t-label-*`, `--t-body-*`, `--t-body-strong-*`, `--t-title-sm-*`, `--t-title-md-*`, `--t-meta-*`, `--t-input-*`, `--t-modal-title-*`, `--t-action-12-*`, `--t-microcopy-*`, `--t-sublabel-*`, `--lh-1`, `--lh-tight`, `--lh-base`, `--lh-loose`, `--lh-loosest` | design.md §1.2 + Cluster 11 additions |
| R-9 (7 tokens) | `--r-xs: 3`, `--r-sm: 4`, `--r-md: 5`, `--r-lg: 6`, `--r-xl: 7`, `--r-2xl: 10`, `--r-pill: 999` | design.md §1.4 |
| R-10 (1 token) | `--r-overlay: 8px` | NEW addition to design.md §1.4 — floating-overlay radius (popover, menu, empty-pane outer) |
| R-11 (5 tokens) | `--shadow-elev-1` (toast/Floating), `--shadow-elev-2` (popover), `--shadow-elev-2-menu`, `--shadow-elev-3` (modal), `--shadow-elev-page` | design.md §1.6 expanded 2-tier → 5-tier |
| R-12 (9 tokens) | `--motion-fast/-normal/-slow/-skeleton/-toast-enter/-toast-exit`, `--ease-out`, `--ease-in-out`, `--ease-in` | design.md §1.7 ratified (was deferred) |
| R-13 (6 tokens) | `--z-base: 0`, `--z-popover: 10`, `--z-dropdown: 12`, `--z-modal-backdrop: 19`, `--z-modal: 20`, `--z-toast: 30` | design.md §1.8 NEW section |

**Total: ~110 new short-name tokens** in canonical `kova-hifi.css :root`. Selected color aliases mirrored to `app.css @theme` for Tailwind utility-class generation. Three docs updated in lockstep: `design.md` §1.4/§1.6/§1.7/§1.8 + `TOKEN_CANONICAL.md` (Cluster 11 addition section).

---

## Component diff — every new variant or new component built

### NEW Vue SFCs (17 + 4 surfaces + 3 views + 2 showcase = 26 files)

`src/components/ui/`:
- `KovaButton.vue`, `KovaInput.vue`, `KovaField.vue`, `KovaPill.vue`, `KovaSegmented.vue`, `KovaCheckbox.vue`, `KovaAvatar.vue`, `KovaSkeleton.vue`
- `KovaTooltip.vue`, `KovaPopover.vue`, `KovaMenu.vue`, `KovaSelect.vue`, `KovaModal.vue`
- `KovaToast.vue`, `ToastStack.vue`, `ConfirmModal.vue`
- `EmptyState.vue`

`src/components/network/NetworkStatusIndicator.vue`
`src/components/marketing/MarketingShell.vue`
`src/components/email/EmailShell.vue`

`src/views/error/NotFoundView.vue`, `ServerErrorView.vue`, `NetworkUnreachableView.vue`
`src/views/dev/TokensDebugView.vue`, `Cluster11Showcase.vue`

### Composables (6 files)

`src/composables/use-reduced-motion.ts`, `use-theme.ts`, `use-online-status.ts`, `use-channel-name.ts`, `use-idempotency-key.ts`, `use-confirm.ts`

### Pinia stores (2 files)

`src/stores/toast.ts`, `src/stores/confirm.ts`

### Canonical CSS additions (`design-system/canonical/kova-hifi.css`)

- `:root` block extended +110 tokens (R-1..R-13).
- Component primitive lifts: `.toast / .dlg / .popover / .popover.avatar / .menu / .tooltip / .skeleton / .empty-pane (3 variants) / .err-page / .err-card / .err-icon-tile / .err-cta-stack / .fld / .modal-backdrop / .avatar` — ~530 new lines, every value token-resolved.
- New variant rules: `.btn.text` (lifted unscoped from B2), `.btn.danger` (Ban-12-degraded), `[aria-invalid="true"]` input border, `.help[role="alert"]`, `[data-highlighted]` parity for Reka popover/menu rows.

### Icon registry

`src/components/ui/kova-icon-registry.ts` — +5 icons (`file-question`, `home`, `log-out`, `refresh-cw`, `wifi-off`). Total now 20.

### Router

`src/router.ts` — `/dev/tokens`, `/dev/cluster-11`, `/404`, `/500`, `/network-unreachable`, `:pathMatch(.*)*` catch-all.

### Global mounts

`src/App.vue` — `<ToastStack />` + `<ConfirmModal />` always mounted (post-auth-loading).

---

## Tests added (26 tests, all green)

`bun test ./tests/unit/stores ./tests/unit/composables`:
- `tests/unit/stores/toast.test.ts` (9 tests) — uuid, 5-cap, queue promotion, auto-dismiss, sticky variants, custom duration, dismissAll, defaultIcon map, queued-dismiss no-op
- `tests/unit/stores/confirm.test.ts` (7 tests) — Promise contract, true/false resolve, KD-2 stack ceiling, unknown-id no-op, typedConfirmPhrase preserved, destructive preserved
- `tests/unit/composables/use-channel-name.test.ts` (3 tests) — builds correct format, throws pre-sign-in, PRD §5.6 patterns
- `tests/unit/composables/use-idempotency-key.test.ts` (2 tests) — RFC 4122 v4 format, 100-call no-collision entropy gate
- `tests/unit/composables/use-online-status.test.ts` (5 tests) — initial follows navigator.onLine, online/offline events, noteAck returned, noteAck flips offline→online

---

## Quality gates (per master §8 + IMPLEMENTATION_PROMPT.md §12)

- [x] `bun run build` green (precache 555 entries, 20.8 MiB).
- [x] `bun run check` — oxlint type-aware 0 errors, 0 warnings.
- [x] `no-raw-visual-values` lint at warn-mode (~492 violations: 278 OpenPencil-era pre-existing + 214 Cluster 11 inline `:style` in primitives + Tailwind arbitrary classes in debug surfaces; carryover to Phase 5b hardening pass).
- [x] `bun run test:unit` for Cluster 11 — 26/26 pass.
- [x] Code-reviewer agent — PASS WITH NOTES; HIGH-1 + HIGH-2 fixed pre-merge.
- [x] Phase 1 audit gate — `cluster-11-audit.md` + `cluster-11-tokens-used.md` founder-approved.
- [x] Per-primitive written diff — `cluster-11-primitive-diffs.md` (424 lines, 18 primitives).
- [x] No `<style>` blocks in shipping SFCs (verified across 26 files).
- [x] No raw Unicode glyphs in shipping SFCs (post `/dev/tokens` fix commit 8146c1a3).
- [x] Token-canonical-vs-app.css alignment (R-1 aliases mirrored).
- [x] `--color-component: #9747ff` purple purged.
- [ ] Per-primitive visual-diff Playwright baselines — pending dev-server smoke + `bun run test:visual --update-snapshots`.
- [ ] 3-screenshot PR artifact — generated from Playwright baselines above.
- [ ] e2e-runner golden-path on `/dev/cluster-11` — pending dev-server smoke (founder runs).
- [ ] Founder browser smoke-test `/dev/cluster-11` — partial (Phase 3 confirmed; revisit post-fix).

---

## Carryovers to Phase 5b hardening pass (NOT merge-blocking)

Per code-reviewer MEDIUM 3-7 + `cluster-11-audit.md` §1.6a + `cluster-11-primitive-diffs.md` Summary:

1. **KovaSegmented hover-idle binding** — lift `.seg / .seg-pair` chrome from Cluster 07b inspector hi-fi into canonical kova-hifi.css. Drop inline `:style` in KovaSegmented.vue. (~15 min)
2. **`--checkbox-size: 14px` + `--select-min-w: 160px` token promotion** — add to `kova-hifi.css :root` + `app.css @theme`. Update KovaCheckbox.vue + KovaSelect.vue to consume. (~10 min)
3. **Founder C-3 decision on `.btn.primary` `#111 / #fff` hex** — either token-name them OR amend design.md §3.1 to declare them as concrete ink-on-primary canonical values. (~5 min once decided)
4. **`<!-- token-exempt: ... -->` comments on EmailShell / MarketingShell / NetworkStatusIndicator inline styles** — apply per code-reviewer MEDIUM-6/-7. (~5 min)
5. **Lift `.checkbox` block into canonical CSS** — mirror `.fld input.input` pattern; drop KovaCheckbox inline `:style`. (~15 min)
6. **Lint warn → error flip** — verify all Cluster 11 violations resolve to either token-refs or token-exempted lines. (~10 min)
7. **Plan 11 Phase 1 backend tasks** — migration `20260520_11_shared_ui_infrastructure.sql` (`idempotency_keys` + `audit_log` + RLS), `verifyIdempotency()` / `writeAudit()` / `requireEnv()` / `loadEnvOrSkip()` helpers, Sentry / Resend / Vercel-cron stub guards. **NOT done this branch — defer to Cluster 01 / 04 dispatch waves OR a Phase 6 backend pass.** Per Plan 11 these are not gated on UI primitive ship.

---

## Open issues for founder review

| ID | Issue | Recommendation |
|---|---|---|
| C-3 | `.btn.primary` `#111 / #fff` raw hex in canonical kova-hifi.css | Pick: (a) name `--btn-primary-ink: #111` + `--btn-primary-hover: #fff` tokens, OR (b) document concrete-hex in design.md §3.1. Phase 5b. |
| Lint flip | When does `LINT_NO_RAW_VALUES_MODE=warn` flip to `error`? | After Phase 5b hardening pass cleans the 214 new Cluster 11 violations. |
| Auth backend (Plan 11 Phase 1) | `audit_log` + `idempotency_keys` migration + helpers not shipped | Bundle into Cluster 01 / 04 wave OR Phase 6 backend pass. PRD 11 lists them but their consumers are Cluster 01 / 03 / 04 / 05. |
| Visual-diff baselines | Not generated yet | Founder runs `bun run test:visual --update-snapshots` against the running dev server; commits baselines to `tests/snapshots/cluster-11/`. |

---

## Founder smoke-test checklist

Open these routes at `http://localhost:1420/<route>` (dev server running):

- [ ] `/dev/tokens` — token swatches + samples render. Surfaces / lines / ink / accent / status all correct. Skeleton shimmer animates. Spacing chips show 2-32. Lifted primitives (btn / pill / input / toast / popover / menu / empty-pane / skeleton / tooltip) all render canonical chrome.
- [ ] `/dev/cluster-11` — every primitive in every variant + state:
  - KovaButton row (6 variants × 2 sizes + icon-only + loading + disabled)
  - KovaPill (4 variants + icon)
  - KovaInput + KovaField (default / disabled / search / error toggle)
  - KovaCheckbox (4 states)
  - KovaSegmented (alignment picker)
  - KovaSelect dropdown
  - KovaAvatar (4 sizes + brand-color samples)
  - KovaSkeleton (3 layouts)
  - KovaTooltip (3 icon buttons — hover 500 ms)
  - KovaPopover (avatar variant, click to open)
  - KovaMenu (dropdown, destructive row)
  - KovaModal sm / md / lg
  - ConfirmModal (regular + typed-confirm)
  - KovaToast — fire all 6 variants
  - EmptyState — 3 size variants
  - Error view links
- [ ] `/404` — page-not-found with home button
- [ ] `/500` — server-error with retry
- [ ] `/network-unreachable` — wifi-off with retry
- [ ] `/anything-bogus` — catch-all renders /404
- [ ] Type-check + lint + tests green (`bun run check && bun run test:unit -- ./tests/unit/stores ./tests/unit/composables && bun run build`).

---

## Merge instructions

**Founder merges with `--no-ff`** after browser smoke pass per `MASTER-EXECUTION-GUIDE.md` §8.3:

```sh
git checkout feat/m9-shopify
git merge --no-ff app/cluster-11-redo -m "Merge W6 Cluster 11 (Foundation) REDO"
git push origin feat/m9-shopify
```

**DO NOT** squash — preserves per-task atomic commit history per executing-plans discipline.

Post-merge: dispatch W7 (Cluster 07a engine) per master pipeline.

---

## Commit log (post-W6 REDO commits on app/cluster-11-redo)

```
66abbbfc fix(c11): code-reviewer HIGH-1 + HIGH-2 + LOW-11/13 + MEDIUM-8
5ee5372e test(c11): Phase 4 — Playwright clip-region visual-diff + per-primitive written diffs
d4551d83 fix(c11): canonical CSS gaps + 4 founder-flagged regressions
43e2fdaf feat(c11): Phase 3 — 17 primitive Vue SFCs + composables + stores + showcase + error views
8146c1a3 fix(c11): /dev/tokens — KovaIcon swap + scroll bug + audit Phase 3 carryovers
8eb974c8 feat(c11): Phase 2 token additions + /dev/tokens debug route
ab092bf3 docs(c11): Phase 1 audit gate — DRAFT
```

Plus 6 inherited pre-W6 contract/infra commits from `app/cluster-11-redo` history (cac45247 through fad628d3).

**Total: 13 commits on branch. 8 added by W6 REDO agent.**

---

End of W6-cluster-11-REDO-DONE.md.
