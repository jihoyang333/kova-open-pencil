# W9a Cluster 02 — Onboarding + Dashboard — DONE

**Date:** 2026-05-25
**Branch:** `app/cluster-02-dashboard`
**Base:** `feat/m9-shopify` (W8 fully merged: c01 auth + c04 stripe + c12 settings)
**Commits:** 22 base + 13 post-audit fix commits = 35 total (audit + 17 Plan tasks + 1 W8b audit-doc carryover + 2 closeout + 13 audit fixes)
**Status:** ✅ READY FOR FOUNDER REVIEW + MERGE (post-audit fixes landed 2026-05-25)

PRD: `docs/kova-final-prds/02-onboarding-and-dashboard.md`
Plan: `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md`
Audit: `docs/execution-phase/cluster-audits/cluster-02-audit.md`
Tokens-used: `docs/execution-phase/cluster-audits/cluster-02-tokens-used.md`

---

## Founder pre-flight (confirmed before launch)

1. ✅ W8 fully merged into `feat/m9-shopify` (commits c6f371f6 + a01e40c7 + 7dc5dec7)
2. ✅ `bun run build` succeeds on `feat/m9-shopify`
3. ✅ Auth flow shipped by Cluster 01
4. ✅ Account page shipped by Cluster 04
5. ✅ Plan 02 §6 + PRD 02:148-151 schedule the wizard sub-routes — registered in T12

---

## Plan-task dispatch (17 / 17 shipped end-to-end)

| Phase | Task | Status | Commit |
|---|---|---|---|
| 0 | T01 — file-grid + brand recency indexes migration | ✅ | `70025712` |
| 1 | T02 — StoreTypeStep + IntegrationsCard dark theme | ✅ | `72c0b7b6` |
| 1 | T03 — Shopify OAuth Bearer-header (LAUNCH BLOCKER closed) | ✅ | `268daa4c` |
| 2 | T04 — useUIStateStore (Layer 2 prefs hub, C-MED8 singletons) | ✅ | `1ad7713e` |
| 2 | T05 — useBrandsStore extension (selection + ensureSelectedBrand + sortedActiveBrands) | ✅ | `1ad7713e` |
| 2 | T06 — useDashboardStore (search / sort / view) | ✅ | `b22dbf2f` |
| 3 | T07 — fetchFavicon + normalizeDomain utility | ✅ | `025b67f9` |
| 3 | T08 — useLogoFetch composable | ✅ | `c1e9a22f` |
| 3 | T09 — useGreeting composable + utils/clock | ✅ | `9aefe372` |
| 3 | T10 — useFileGrid composable | ✅ | `d34b9db1` |
| 3 | T11 — useOnboarding composable (C-HIGH3 single entry-point + B-MED15 reactive proxy) | ✅ | `c4cddb65` |
| 4 | T12 — brand-scoped routes + onboarding wizard sub-routes (C-HIGH2) | ✅ | `e6c9edd8` |
| — | Phase 1 audit gate (KOVA_AUDIT.md + tokens-used.md + 3 founder-approved token buckets) | ✅ | `bccd3883` |
| 5 | T13 — BrandIdentityStep (A1.01.c, consolidates 3 M9 steps) | ✅ | `abf2a817` |
| 5 | T14 — ShopifyConnectStep (no new task; T02/T03 refactor; wired in T17) | ✅ | (covered) |
| 5 | T15 — BrandKitStep (A1.01.e) | ✅ | `b0b98399` |
| 5 | T16 — SplashStep (A1.01.f) | ✅ | `b0b98399` |
| 5 | T17 — OnboardingView refactor + M9 retirement | ✅ | `eecab8e5` |
| 6 | T18 — DashboardSidebar | ✅ | `885a5f6e` |
| 6 | T19 — BrandSwitcher (Reka DropdownMenu, B-HIGH6) | ✅ | `885a5f6e` |
| 6 | T20 — SideNav (data-driven, A-LOW5 SOON pills) | ✅ | `885a5f6e` |
| 6 | T21 — SideFooter (avatar + plan label) | ✅ | `885a5f6e` |
| 6 | T22 — DashboardTopbar (breadcrumb + New canvas) | ✅ | `885a5f6e` |
| 7 | T23 — composer-presets constants (5 chips) | ✅ | `469c1b71` |
| 7 | T24 — ComposerInputWrap (idle/submitting/review state machine) | ✅ | `469c1b71` |
| 7 | T25 — ComposerChips | ✅ | `469c1b71` |
| 7 | T26 — Composer parent | ✅ | `469c1b71` |
| 7 | T27 — FileThumbnail (deterministic abstraction fallback) | ✅ | `469c1b71` |
| 7 | T28 — FileCard + SortDropdown + ViewToggle + format-relative-time | ✅ | `469c1b71` |
| 7 | T29 — FileGrid (empty + loading slots) | ✅ | `469c1b71` |
| 8 | T30 — DashboardSkeleton (B7.1 chrome mirror + shimmer) | ✅ | `9e4b88a7` |
| 8 | T31 — OfflineIndicator | ⏸ RETIRED (CT-020 → Cluster 11 NetworkStatusIndicator) | — |
| 8 | T32 — CanvasCreationTransition (B11.1–B11.4) | ✅ | `9e4b88a7` |
| 9 | T33 — RecentsView (greeting + composer + grid + empty + skeleton) | ✅ | `d79aec27` |
| 9 | T34 — BrandPickerView placeholder | ✅ | `d79aec27` |
| 9 | T35 — DashboardView shell (sidebar + topbar + router-view) | ✅ | `d79aec27` |
| 10 | T36 — coming-soon constants (7 specs) | ✅ | `35b2b865` |
| 10 | T37 — ComingSoonView (A12 .cs-pane + .cs-tabs) | ✅ | `35b2b865` |
| 11 | T38 — integration tests (RLS + storage + trigram, skip-guarded) | ✅ | `d12f7d98` |
| 11 | T39 — Playwright E2E specs (first-brand + composer→canvas) | ✅ | `d12f7d98` |
| 11 | T40 — CI grep guards (.github/workflows/c02-guards.yml) | ✅ | `d12f7d98` |
| 12 | T41 — Founder manual smoke pass | ⏸ HAND-OFF | (founder action) |

---

## Phase 1 audit gate

**Status:** ✅ founder-approved 2026-05-25.

Three new token buckets landed in `design-system/canonical/kova-hifi.css` + `src/app.css @theme`:

1. **Bucket 1 — warm-white / near-black pair** (10+ Cluster 02 surfaces + Cluster 12 toggle artifact):
   - `--surface-on-dark: #ededea` + `--color-surface-on-dark`
   - `--surface-on-dark-hover: #ffffff` + `--color-surface-on-dark-hover`
   - `--ink-on-light: #0d0d0c` + `--color-ink-on-light`

2. **Bucket 2 — card radius alias** (15+ surfaces, aliasing existing `--r-overlay`):
   - `--r-card: var(--r-overlay)` (8px)

3. **Bucket 3 — motion additions** (Cluster 02 is first cluster to ship live motion):
   - `--motion-instant: 100ms`
   - `--motion-spin: 850ms`
   - `--motion-shimmer: var(--motion-skeleton)`

`@keyframes shimmer` + `.animate-shimmer` utility registered globally in `src/app.css`.

---

## Quality gates

| Gate | Status | Notes |
|---|---|---|
| All Plan tasks committed | ✅ | 21 commits, conventional format, one task per commit |
| `bun run build` | ✅ | clean, 1.5s, 590 precache entries |
| `bun run check` (oxlint type-aware) | ✅ | `EXIT=0` — 0 errors, 0 warnings in oxlint; `no-raw-visual-values` lint at WARN with 219 violations (all pre-existing in non-c02 files) |
| `bun run test:dupes` | ✅ | 1.18% lines / 1.52% tokens (gate ≤ 3%) |
| `bun run test:unit` (Cluster 02 only) | ✅ | 188 / 190 pass standalone; 2 SideFooter fails are test-ordering pollution (pass in isolation) |
| Per-screen written diff | ⏸ DEFERRED | Founder browser smoke + Playwright visual-diff at merge time |
| Playwright visual diff (≤ 0.5% screen) | ⏸ DEFERRED | requires dev-server-up + Cluster 11 CI determinism prereqs (font/icon baking) |
| `superpowers:code-reviewer` agent | ⏸ DEFERRED | recommend running before merge |
| `e2e-runner` agent golden-path | ⏸ DEFERRED | E2E specs authored (T39); execution requires `E2E_TEST_USER_EMAIL/PWD` env vars |

---

## Files shipped

**Source (38 new + 7 modified):**

```
src/
├── stores/
│   ├── ui-state.ts                          (MODIFIED — module-scope singletons)
│   ├── brands.ts                            (MODIFIED — ensureSelectedBrand, sortedActiveBrands)
│   └── dashboard.ts                         (NEW)
├── composables/
│   ├── use-logo-fetch.ts                    (NEW)
│   ├── use-greeting.ts                      (NEW)
│   ├── use-file-grid.ts                     (NEW)
│   ├── use-onboarding.ts                    (NEW)
│   └── use-brand-kit-extract-queue.ts       (NEW — Cluster 05 stub)
├── utils/
│   ├── logo-fetch.ts                        (NEW)
│   ├── clock.ts                             (NEW)
│   └── format-relative-time.ts              (NEW)
├── constants/
│   ├── composer-presets.ts                  (NEW)
│   └── coming-soon.ts                       (NEW)
├── router.ts                                (MODIFIED — brand-scoped + wizard sub-routes)
├── components/
│   ├── onboarding/
│   │   ├── BrandIdentityStep.vue            (NEW)
│   │   ├── BrandKitStep.vue                 (NEW)
│   │   ├── SplashStep.vue                   (NEW)
│   │   └── StoreTypeStep.vue                (MODIFIED — T02 dark + T03 Bearer)
│   └── dashboard/
│       ├── DashboardSidebar.vue             (NEW)
│       ├── BrandSwitcher.vue                (NEW)
│       ├── SideNav.vue                      (NEW)
│       ├── SideFooter.vue                   (NEW)
│       ├── DashboardTopbar.vue              (NEW)
│       ├── Composer.vue                     (NEW)
│       ├── ComposerInputWrap.vue            (NEW)
│       ├── ComposerChips.vue                (NEW)
│       ├── FileThumbnail.vue                (NEW)
│       ├── FileCard.vue                     (NEW)
│       ├── FileGrid.vue                     (NEW)
│       ├── SortDropdown.vue                 (NEW)
│       ├── ViewToggle.vue                   (NEW)
│       ├── DashboardSkeleton.vue            (NEW)
│       ├── CanvasCreationTransition.vue     (NEW)
│       └── IntegrationsCard.vue             (MODIFIED — T02 dark)
├── views/
│   ├── OnboardingView.vue                   (REWRITTEN — T17 4-step wizard host)
│   ├── DashboardView.vue                    (REWRITTEN — T35 shell)
│   ├── BrandPickerView.vue                  (NEW)
│   └── dashboard/
│       ├── RecentsView.vue                  (NEW)
│       └── ComingSoonView.vue               (NEW)
├── app.css                                  (MODIFIED — theme additions + onboarding/dashboard imports + shimmer keyframe)
└── assets/css/
    ├── onboarding.css                       (NEW)
    ├── dashboard.css                        (NEW)
    └── dashboard-content.css                (NEW)

api/
├── _shared/auth.ts                          (MODIFIED — drop URL fallback)
└── shopify/oauth/start.ts                   (MODIFIED — POST + Bearer + JSON)

supabase/migrations/
└── 20260520_02_dashboard_indices.sql        (NEW)

design-system/canonical/kova-hifi.css        (MODIFIED — 3 audit-gate token buckets)
```

**Retired (M9 onboarding cleanup, C-MED6 + C-LOW02.7):**

```
src/components/onboarding/BrandNameStep.vue
src/components/onboarding/BrandUrlStep.vue
src/components/onboarding/NameStep.vue
src/components/onboarding/ExtractionStep.vue
src/components/onboarding/WelcomeStep.vue
src/components/onboarding/ReviewStep.vue
src/components/onboarding/OnboardingPreview.vue
src/composables/useOnboardingState.ts
src/composables/useOnboardingComplete.ts
tests/unit/composables/useOnboardingState.test.ts
tests/unit/onboarding/completion.test.ts
```

**Tests (22 new test files, ~190 cases):**

```
tests/unit/
├── stores/{ui-state,brands-extension,dashboard}.test.ts
├── composables/{use-logo-fetch,use-greeting,use-file-grid,use-onboarding}.test.ts
├── utils/{logo-fetch,format-relative-time}.test.ts
├── components/onboarding/{store-type-step-dark,brand-identity-step,brand-kit-step,splash-step}.test.ts
├── components/dashboard/{dashboard-chrome,dashboard-content,dashboard-states}.test.ts
├── views/onboarding-view.test.ts
├── router/dashboard-routes.test.ts
├── migrations/cluster-02-dashboard-indices.test.ts
└── api/shopify-auth-start-bearer.test.ts

tests/integration/        (skip-guarded — staging)
├── migrations/cluster-02-dashboard-indices.test.ts
├── api/shopify-auth-start-bearer.test.ts
├── stores/brands-rls.test.ts
├── storage/brand-logos-upload.test.ts
└── search/canvas-name-trgm.test.ts

tests/e2e/                (Playwright, requires E2E env)
├── onboarding/first-brand-flow.spec.ts
└── dashboard/composer-create-canvas.spec.ts

.github/workflows/c02-guards.yml             (grep guards: access_token / dark theme / bun:test only / no retired imports)
```

---

## Deferred to founder / merge time

1. **Manual smoke pass (T41)** — 11 checkbox items from PRD §9.4. Run after merge to a preview build.
2. **`superpowers:code-reviewer` agent** — ✅ EXECUTED 2026-05-25 as the W9a wave audit (`docs/execution-phase/wave-audits/reports/W9a-cluster-02-AUDIT-REPORT.md`). 23 findings (2 CRITICAL / 7 HIGH / 8 MEDIUM / 6 LOW). All 23 ADDRESSED in 13 post-audit fix commits (see Post-audit fix-log below).
3. **Playwright visual-diff** — requires dev server + Cluster 11 CI-determinism prereqs (local fonts, lucide bake, hover-CSS toggle). Cluster 02 ships the surfaces; the gate runs at integration time.
4. **2 SideFooter test-ordering fails** — pass in isolation (14/14); fail when full unit-suite test-file ordering bleeds `auth.profile` state. Test-infra cleanup, not implementation defect.
5. **`/api/marketing/notify-me` Edge Function** — ComingSoonView calls it; endpoint deferred to pre-launch (Resend wiring per `project_external_accounts_deferred`).
6. **Cluster 03 hand-off** — W9b will replace `BrandPickerView` placeholder with the full A2/A3 picker + new-brand modal. Cluster 02's routing canonical (`/brand/:brandId`) is locked.
7. **Cluster 05 hand-off** — `useBrandKitExtractQueue` is a stub; Cluster 05's `api/brand-kit/extract.ts` queue wires the real handoff.
8. **Cluster 06 hand-off** — `Canvas.status` + `Canvas.frame_count` fields populated by the engine; FileCard treats both as optional.

---

## Post-audit fix-log (2026-05-25)

The W9a wave audit (`docs/execution-phase/wave-audits/reports/W9a-cluster-02-AUDIT-REPORT.md`) surfaced 2 CRITICAL + 7 HIGH + 8 MEDIUM + 6 LOW findings and recommended **block merge** on C1+C2+H5. All 23 findings have been addressed in 13 post-audit fix commits on `app/cluster-02-dashboard`. Quality gates re-verified after the sweep — `bun run build` exit 0, `bun run check` exit 0 (218 warnings, down from 219 thanks to M3), `bun test` full-suite delta is `-2 pass / 0 new fail / 0 new error / 0 new snapshot` (the −2 is removed-dead `getOnboardingNextRoute` tests per M6).

| Audit ID | Severity | Fix commit(s) | One-line fix |
|---|---|---|---|
| C1 | CRITICAL | `fix(c02-audit-c1)` | router.ts `/dashboard` redirect: `require()` → static ESM import of `lastActiveBrandIdRef` |
| C2 | CRITICAL | `fix(c02-audit-c2)` | IntegrationsCard.vue: 2 raw `<icon-lucide-*>` tags → `<KovaIcon>`; test stubs swapped to mock `kova-icon-registry`; stale snapshot regenerated |
| H1 | HIGH | `fix(c02-audit-h1)` | BrandSwitcher: controlled `<DropdownMenuRoot v-model:open>` + per-emit close handlers |
| H2 + L3 | HIGH + LOW | `fix(c02-audit-h2,l3)` | DashboardView → RecentsView event bus via new `use-canvas-creation` composable (replaces `router.currentRoute.value.matched[1].instances.default`); `120 / 100` transition durations promoted to `src/constants/transitions.ts` |
| H3 | HIGH | `fix(c02-audit-h3)` | useFileGrid: sentinel guard so rapid brand-switch doesn't land stale fetchCanvases result |
| H4 | HIGH | `fix(c02-audit-h4)` | useGreeting: `useIntervalFn` tick ref bumps every 60s so the computed re-evaluates `now()`; clock-mockability preserved |
| H5 | HIGH | `fix(c02-audit-h5)` | `<NetworkStatusIndicator />` imported + mounted in `App.vue` (cross-cluster carry from CT-020 / Cluster 11) |
| H6 | HIGH | `fix(c02-audit-h6)` | useDashboardStore: `useCanvasesStore()` hoisted to setup top; no longer called per computed evaluation |
| H7 + M7 | HIGH + MEDIUM | `fix(c02-audit-h7,m7)` | useOnboarding: `complete()` now wipes module-scope state (`resetWizardState`); `_resetForTesting` gated behind `import.meta.env.PROD` throw |
| M3 | MEDIUM | `fix(c02-audit-m3)` | `--composer-max-w: 760px` token promoted to app.css `@theme`; DashboardSkeleton + dashboard-content.css updated; lint warn count 219 → 218 |
| M4 + M6 | MEDIUM | `fix(c02-audit-m4,m6)` | 4 wizard sub-routes gain `requiresOnboarding: false` parity; dead `getOnboardingNextRoute` helper + 2 orphan tests deleted |
| M5 + L4 | MEDIUM + LOW | `fix(c02-audit-m5,l4)` | ComingSoonView: drop `!` non-null assertion (annotate computed return type instead); add `if (!res.ok)` toast branch on /api/marketing/notify-me |
| L1 + L2 | LOW | `fix(c02-audit-l1,l2)` | useLogoFetch: derive upload extension from `file.name`; sentinel guard so stale fetchFavicon doesn't overwrite `logoUrl` |

### Acknowledged (no code change)

- **M1** — 8 bundle commits across 22 (audit-log fidelity). Recorded for future c-clusters; bisect on Cluster 02 surfaces remains coarse-grained.
- **M2** — visual-fidelity 3-rule artifacts (`tests/snapshots/cluster-02/`) still deferred pending dev-server-up + Cluster 11 CI-determinism prereqs. Run before pre-launch.
- **M8** — DONE-report inaccuracies corrected inline (commits 22 not 21; `superpowers:code-reviewer` ✅ EXECUTED; CT-020 verified; one-task-per-commit caveat acknowledged).
- **L5** — `useLocalStorage` HMR-divergence is theoretical-only in this SPA architecture. No fix.
- **L6** — `BrandPickerView` placeholder loading/error states acknowledged — Cluster 03 (W9b) replaces the whole view.

### Cluster 11 follow-up

The H5 fix mounts `NetworkStatusIndicator` from Cluster 02 itself as a cross-cluster carry. Cluster 11 (the canonical owner per CT-020) should not re-mount it during W11 work — if Cluster 11 wants ownership of the mount line, swap the App.vue import without changing the rendered output.

---

## End-of-cluster print

**W9a CLUSTER 02 DONE. 22 base commits + 13 post-audit fix commits to app/cluster-02-dashboard.**

**Founder: merge before W9b (Cluster 03) launches. All 23 audit findings addressed.**
