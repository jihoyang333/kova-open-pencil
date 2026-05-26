# W9a — Cluster 02 AUDIT REPORT

**Verdict:** ⚠️ **PASS WITH WARNINGS** — 2 CRITICAL findings block merge until addressed; routing canonical (CT-002) is clean and Cluster 03 is unblocked.

**Wave:** W9a
**Cluster:** 02 — DashboardView, BrandSwitcher, onboarding wizard, routing canonical for Cluster 03
**Audit type:** UI + routing + Pinia (routing-canonical critical for Cluster 03)
**Baseline:** `feat/m9-shopify`
**Branch tip audited:** `app/cluster-02-dashboard` `ae188122`
**Commits audited:** 22 (`70025712..ae188122`)
**Auditor:** Claude Opus 4.7, fresh session, read-only, with `superpowers:code-reviewer` + `vue-expert` subagent sweeps
**Date:** 2026-05-25

---

## Summary

Cluster 02 ships the post-auth landing surface end-to-end: a 4-step first-brand onboarding wizard (BrandIdentity → Shopify → BrandKit → Splash), a per-brand dashboard chrome (DashboardSidebar + BrandSwitcher + SideNav + SideFooter + DashboardTopbar), AI composer + file grid + B11 canvas-creation transition + B7.1 skeleton + 7 ComingSoonView shells. The Phase 1 audit gate produced `cluster-02-audit.md` + `cluster-02-tokens-used.md` with three founder-approved token buckets (warm-white/near-black pair, card-radius alias, motion additions). 38 new source files + 7 modified + 22 test files (~190 cases) shipped across 22 conventional commits.

**Routing canonical (CT-002) is fully compliant** — `/brand/:brandId` is the named route `brand-home` with seven nested ComingSoonView children + recents + trash + brand-scoped settings/assets routes preserved. The four onboarding wizard sub-routes (`/onboarding/{brand,shopify,brand-kit,done}`) are present with `wizardStep` meta. Cluster 03 is unblocked. The `/dashboard` legacy redirect resolves to `/brand/{lastActiveBrandId}` or `/brands` per PRD §6.1.

**Founder-locked decisions are observed** — useOnboarding ships as a module-scope-singleton composable (C-HIGH3 single entry point); BrandSwitcher renders Reka `DropdownMenuRoot` without a wrapping `ref()` (B-HIGH6); useDashboardStore exposes `searchQuery`/`sortMode`/`viewMode` as reactive refs with mutation-via-actions discipline (B-CRIT11); seven ComingSoonView routes registered (A-LOW5).

**Quality gates green at the cluster boundary** — `bun run build` exits 0 (1.87s, 582 PWA entries), `bun run check` exits 0 (oxlint type-aware reports 219 `no-raw-visual-values` warnings, all in pre-existing OOS files — 1 cluster-02 live offender at `DashboardSkeleton.vue:32`), `bun run test:dupes` 1.18% lines / 1.52% tokens (well under 3% cap), `bun run test:unit` exit 0 in subset view (the full-suite 44 fail / 10 error / 5 snapshot failures are pre-existing per DONE report, outside Cluster 02 scope). `git diff packages/core/**` is empty (lift-the-lock not engaged — c02 is not on the cleared list).

**Two CRITICAL findings surfaced that the DONE report did not catch.** First, `src/router.ts:218` uses CommonJS `require()` inside an ESM Vite project — guaranteed `ReferenceError: require is not defined` the first time any user hits `/dashboard` (a legacy redirect path with many in-repo references). Second, `src/components/dashboard/IntegrationsCard.vue` — the file Plan Task T02 was explicitly chartered to refactor — still ships seven raw `<icon-lucide-*>` tags (Design Rider §2.5 hard-rule ban, W5a founder-locked 2026-05-19). Both have ~5-line fixes; both must land before merge to `feat/m9-shopify`.

A second cluster of HIGH findings: BrandSwitcher's `DropdownMenuRoot` is uncontrolled (cannot programmatically close on `select`/`new-brand`/`manage-brands` emit), `DashboardView.onNewCanvas` reaches into `router.currentRoute.value.matched[1]?.instances?.default` (vue-router internal API, type-unsafe, brittle), `useFileGrid` watches `brandId` without a teardown guard for concurrent flights (rapid brand-switch race), `useGreeting` is not time-reactive (greeting frozen at mount), `useDashboardStore.filteredCanvases` calls `useCanvasesStore()` inside the computed body each evaluation, `useOnboarding.complete()` does not reset module-scope state (stale `brandName` leaks across re-onboarding sessions), and the onboarding wizard sub-route metas drop `requiresOnboarding: false` parity with the parent.

**One cross-cluster gap.** Cluster 02's PRD §8.7 acceptance criterion requires `<NetworkStatusIndicator>` to be present at the App root, mounted by Cluster 11 per CT-020. `grep -rn NetworkStatusIndicator src/` returns only a comment in `DashboardView.vue:11` — the component is never imported and `App.vue` does not mount it. The DONE report's claim that this is "globally by Cluster 11 (CT-020)" is unverified. This is owned by Cluster 11 to fix, but Cluster 02's acceptance test cannot pass until it lands.

**The DONE report has minor inaccuracies.** It states "21 commits" — `git log` shows 22 on the branch. It marks B-HIGH6 compliance ✅ — BrandSwitcher's open state is correctly *unwrapped* (no local `ref`) per the literal B-HIGH6 fix, but the uncontrolled DropdownMenuRoot creates a different B-HIGH6-adjacent gap. It marks `superpowers:code-reviewer` "⏸ DEFERRED" — this audit fills that gap and finds non-zero CRITICAL/HIGH.

**Recommended action:** Block merge. Fix the two CRITICAL findings (router.ts `require()` + IntegrationsCard icon ban). Address the HIGH findings (BrandSwitcher control, DashboardView event-bus pattern, useFileGrid race guard, useGreeting interval, useOnboarding state reset, route-meta parity). Open a Cluster 11 ticket for the NetworkStatusIndicator mount gap. Cluster 03 (W9b) may proceed in parallel — its dependency (routing canonical) is satisfied.

---

## Routing canonical compliance (CT-002 — Cluster 03 hard contract)

| Check | Status | Evidence |
|---|---|---|
| `/brand/:brandId` exists | ✅ | `src/router.ts:179` `path: '/brand/:brandId'` |
| Named route exposed for Cluster 03 to `router.push({ name: 'brand-home' })` | ✅ | `src/router.ts:180` `name: 'brand-home'` |
| `/dashboard` is NOT the canonical home (CT-002 lock) | ✅ | `src/router.ts:214` is a redirect → `/brand/{lastActiveBrandId}` or `/brands` |
| Brand-scoped children registered | ✅ | 11 nested children including recents (`''`), calendar, swipes, templates, trash, products, personalization, knowledge-base, memories, settings/integrations, settings, assets |
| 4 onboarding wizard sub-routes (C-HIGH2) | ✅ | `src/router.ts:153-176` — `onboarding-brand`, `onboarding-shopify`, `onboarding-brand-kit`, `onboarding-done` with `wizardStep` meta 1-4 |
| 7 ComingSoonView routes (A-LOW5) | ✅ | `src/router.ts:187-195` — `calendar`, `swipes`, `templates`, `products`, `personalization`, `knowledge-base`, `memories` |
| `/brands` reserved for Cluster 03's picker | ✅ | `src/router.ts:206` `name: 'brands-picker'` (placeholder ships in T34) |
| All named route exports stable for downstream consumers | ✅ | Verified via `grep -n "name: '..."` in src/router.ts |

**Verdict:** routing canonical is **GREEN**. Cluster 03 may proceed with `router.push({ name: 'brand-home', params: { brandId } })` without contract risk. The one issue in `src/router.ts` is unrelated to the canonical shape — see C1 below.

---

## Founder-locked decisions

| Lock | Status | Evidence |
|---|---|---|
| CT-002 — `/brand/:brandId` canonical | ✅ | See routing table above |
| C-HIGH2 — 4 onboarding wizard sub-routes | ✅ | `src/router.ts:153-176` |
| C-HIGH3 — useOnboarding single entry point | ✅ | `src/composables/use-onboarding.ts:33-42` — `state`/`step`/`isFinishing`/`finishError` at module scope, `useOnboarding()` returns the same instance per call; M9 `provide/inject` pattern retired |
| CT-020 — NetworkStatusIndicator single-mode | ⚠️ | Cluster 02 does NOT define a local OfflineIndicator (correct — T31 RETIRED), but the cross-cluster mount it consumes is missing — see H5 |
| B-CRIT11 — useDashboardStore exposes search + sort | ✅ | `src/stores/dashboard.ts:16-19,44-55` — `searchQuery`, `sortMode`, `viewMode` reactive; `setSearchQuery`/`setSortMode`/`setViewMode` actions |
| B-HIGH6 — BrandSwitcher uses Reka DropdownMenu without ref()-wrapped open | ⚠️ | `src/components/dashboard/BrandSwitcher.vue:30` — `<DropdownMenuRoot>` has no local `ref()` (literal fix observed), but is also uncontrolled (no `v-model:open`); see H1 |
| A-LOW5 — 7 ComingSoon routes | ✅ | See routing table above |

---

## Findings

### CRITICAL — 2

**C1. `src/router.ts:218` — `require('./stores/ui-state')` in an ESM Vite project crashes at runtime**

```ts
redirect: () => {
  // Lazy-import to avoid loading the store at module evaluation time.
  const { lastActiveBrandIdRef } = require('./stores/ui-state') as {  // ← line 218
    lastActiveBrandIdRef: { value: string | null }
  }
  const last = lastActiveBrandIdRef.value
  return last ? `/brand/${last}` : '/brands'
}
```

Vite bundles all source as ESM. `require` is not defined in browser ESM bundles. The first user navigation that hits `/dashboard` throws `ReferenceError: require is not defined` in the redirect closure → white-screen. `/dashboard` is reachable from: (a) Cluster 01's `/auth/callback` post-login redirect logic (resolveRootRedirect → '/dashboard' on line 83 of router.ts itself, called by the `/` redirect), (b) legacy in-repo deep links (the DONE report keeps the legacy redirect specifically because "M2-era hardcoded paths exist in docs/tests"), (c) Cluster 12's settings nav.

The author's comment cites "avoid loading the store at module evaluation time" — true but irrelevant: `lastActiveBrandIdRef` is a *module-scope ref* exported from `src/stores/ui-state.ts:8`, not a Pinia store. There is no Pinia-init dependency. Static import is safe and is the standard pattern across the codebase.

**Fix:** hoist the import to the top of `src/router.ts`:

```ts
import { lastActiveBrandIdRef } from './stores/ui-state'
// ...
redirect: () => {
  const last = lastActiveBrandIdRef.value
  return last ? `/brand/${last}` : '/brands'
}
```

**Severity:** CRITICAL (production white-screen for the most common post-auth landing path).

---

**C2. `src/components/dashboard/IntegrationsCard.vue:89,155` — Design Rider §2.5 raw `<icon-lucide-*>` ban still violated in the file T02 was explicitly chartered to migrate**

```vue
<!-- line 89 -->
<icon-lucide-check-circle class="size-4 text-[var(--accent)]" />
<!-- line 155 -->
<icon-lucide-alert-triangle class="mt-0.5 size-4 shrink-0 text-[var(--ink-2)]" />
```

DESIGN-SYSTEM-COMPLIANCE-RIDER.md §2.5 (W5a founder-locked 2026-05-19):

> ❌ NEVER `<icon-lucide-*>` raw tags (dynamic OR static — both banned per W5a founder decision 2026-05-19)

`grep -rn 'icon-lucide-' src/components/dashboard/IntegrationsCard.vue` returns 2 hits. Plan Task T02's scope is "REFACTOR Tailwind utility classes from light to dark" — the dark-theme port is observed, but the file was also touched in T02's commit `72c0b7b6` without bringing it into design-rider compliance. Per Rider §2.5, any file modified in a cluster MUST conform to active bans before commit.

The same ban is broken in 4 other pre-existing dashboard files (`TrashCard.vue`, `EmptyState.vue`, `BrandList.vue`, `CanvasCard.vue`) that Cluster 02 did NOT modify — those are out of c02 scope and tracked separately under the Cluster 06 / pre-launch cleanup pass.

**Fix:** in `IntegrationsCard.vue`, replace each raw tag with `<KovaIcon name="check-circle" size="sm" />` / `<KovaIcon name="alert-triangle" size="sm" />` and update `tests/unit/components/dashboard/dashboard-content.test.ts` (or wherever the dark-theme port test asserts rendered HTML) to match. ~10-line change.

**Severity:** CRITICAL (founder-locked design-system ban violated in cluster-modified file; affects every dashboard render of the IntegrationsCard banner).

---

### HIGH — 7

**H1. `src/components/dashboard/BrandSwitcher.vue:30` — DropdownMenuRoot is uncontrolled**

`<DropdownMenuRoot>` has no `:open` / `v-model:open` / `@update:open` binding. The component cannot programmatically close on `select` / `new-brand` / `manage-brands` emit — the user must click outside or press Escape after selecting a brand to dismiss the menu. E2E tests against the dropdown's open state (PRD §8.2 line 766-768) become impossible to assert deterministically. Survives route change only by Reka's portal teardown — fragile.

**B-HIGH6 nuance:** the literal fix ("no `ref()` wrapping the open state") is observed — Reka manages its own open state internally, which is the intended pattern. The gap is the *emit handlers don't close the dropdown*, which is functionally different from B-HIGH6 but is the operational symptom users will hit.

**Fix:** either (a) keep uncontrolled but call `closeMenu` programmatically — not possible with Reka's current API surface without controlled mode, OR (b) `const open = ref(false)` + `<DropdownMenuRoot v-model:open="open">` + `open.value = false` in each emit handler. The latter restores controlled mode without violating B-HIGH6's underlying intent (which was about *replacing* the ref-wrapped pattern that was previously fighting Reka's own state; controlled mode coordinated with Reka is canonical Reka usage).

**Severity:** HIGH (UX regression on every brand switch + E2E test infeasibility).

---

**H2. `src/views/DashboardView.vue:63-69` — `matched[1]?.instances?.default` is vue-router internal API**

```ts
function onNewCanvas(): void {
  const matched = router.currentRoute.value.matched
  const childInstance = matched[1]?.instances?.default as
    | { onNewCanvas?: () => Promise<void> }
    | undefined
  if (childInstance?.onNewCanvas) {
    void childInstance.onNewCanvas()
  }
}
```

`RouteLocationMatched.instances` is an internal vue-router implementation detail typed as `Record<string, ComponentPublicInstance>`. It is not part of the stable vue-router public API. It breaks when (a) the child route is at a different `matched` depth, (b) `<Suspense>` is introduced around `<router-view>`, (c) the child route gains a nested layout. The `as { onNewCanvas?: ... }` cast is the project's `: any` ban in spirit. The DashboardTopbar "New canvas" button silently no-ops on any of those changes — users tap the button, nothing happens, no error.

The DONE report acknowledges this as "W0-9 Bucket D vue-router internal API" — accepted-risk noted, but the accepted risk should be migrated, not perpetuated.

**Fix:** lift `triggerNewCanvas` into `useDashboardStore` (or a new `useCanvasCreation` composable) — Topbar calls the action, RecentsView subscribes to a `pendingCreate` flag or listens via a tiny event-bus composable. Eliminates child-instance reach-around entirely.

**Severity:** HIGH (UX regression on silent failure + brittle to downstream cluster changes).

---

**H3. `src/composables/use-file-grid.ts:33-47` — `watch(brandId)` race on rapid switch**

```ts
watch(brandId, async (next, prev) => {
  if (next === prev) return
  dash.resetForBrand()
  isLoading.value = true
  try {
    await canvases.fetchCanvases(next)
  } finally {
    isLoading.value = false
  }
}, { immediate: true })
```

If the user switches brands quickly via BrandSwitcher, two `fetchCanvases` calls overlap. The second may resolve before the first, leaving stale canvas data for the wrong brand on screen. `isLoading` flips false prematurely on the first resolve. Both PRD §8.2 (sidebar brand-switch acceptance) and §8.4 (file-grid render) are flaky-failable in production.

**Fix:** track the requested brandId at call time and skip the state flip if it has changed:

```ts
const requested = next
try {
  await canvases.fetchCanvases(next)
} finally {
  if (brandId.value === requested) isLoading.value = false
}
```

**Severity:** HIGH (data correctness on a high-frequency user action).

---

**H4. `src/composables/use-greeting.ts:18-31` — greeting is not time-reactive**

`now()` is a plain function. The `computed` evaluates it once at first read; Vue re-runs the computed only when its reactive dependencies change, and `now()` has none. A user who opens the dashboard at 11:58 AM sees "Good morning" all day. PRD §8.3 acceptance criterion ("Greeting reads 'Good morning' between 04:00–11:59…") is technically pass-on-mount only.

**Fix:** swap `now()` for a VueUse `useNow({ interval: 60_000 })` ref, OR add `onActivated` to re-evaluate on route activation. The 60s interval also helps the user who leaves the tab open overnight.

**Severity:** HIGH (acceptance criterion silently fails after the first hour of any session).

---

**H5. CT-020 cross-cluster gap — `<NetworkStatusIndicator>` not mounted anywhere**

```bash
$ grep -rn 'NetworkStatusIndicator' src/
src/views/DashboardView.vue:11:// scoped children. NetworkStatusIndicator is mounted globally by Cluster 11
```

Only a comment. The component is never imported. `src/App.vue` mounts `AppToast`, `ToastStack`, `ConfirmModal`, `PreferencesModal` — no `NetworkStatusIndicator`. PRD 02 §8.7 acceptance criterion: "`<NetworkStatusIndicator>` is mounted globally in `App.vue` by Plan 11 §3.7 (commit f08fa551) — Cluster 02 verifies it is present at the App root, NOT re-mounted locally." Cluster 02's verification step was never performed.

The DONE report (`Phase 11` table row T31) states `RETIRED (CT-020 → Cluster 11 NetworkStatusIndicator)` — correct that Cluster 02 doesn't OWN it, but the acceptance criterion that depends on it is unsatisfied. Users will never see the offline indicator until Cluster 11 mounts the component (or Cluster 02 mounts it on Cluster 11's behalf in App.vue).

**Fix:** open a follow-up ticket against Cluster 11 to confirm the component exists in `src/components/ui/NetworkStatusIndicator.vue` (or wherever Plan 11 §3.7 placed it) and to mount it in `src/App.vue` next to the existing global components. The 1-line `import { NetworkStatusIndicator } from '@/components/ui/NetworkStatusIndicator.vue'` + `<NetworkStatusIndicator />` in App.vue's `<template v-else>` block closes the contract. Alternatively, Cluster 02 may add the mount line in App.vue itself as a cross-cluster carry — recommended given W9b launches next and the founder smoke pass blocks on this.

**Severity:** HIGH (founder-locked acceptance criterion unverified; offline UX broken end-to-end).

---

**H6. `src/stores/dashboard.ts:22-28` — `useCanvasesStore()` invoked inside computed body**

```ts
const filteredCanvases = computed<Canvas[]>(() => {
  const canvases = useCanvasesStore()  // ← inside computed
  const source = showTrashed.value ? canvases.sortedTrashed : canvases.sortedCanvases
  // ...
})
```

`useCanvasesStore()` calls Pinia's `inject` (via `getActivePinia`) under the hood. Calling it inside a computed body is not idiomatic — it works because the active pinia instance is set on app boot, but it adds a per-evaluation `inject` lookup overhead and breaks if the computed ever evaluates outside a Vue effect scope (e.g., a test that imports the store directly without `setActivePinia`).

**Fix:** call `useCanvasesStore()` once at the top of the setup function and close over it. Same pattern as `useCanvasesStore` injection in `use-file-grid.ts:25-27`.

**Severity:** HIGH (Pinia idiom + test brittleness + per-evaluation injection overhead).

---

**H7. `src/composables/use-onboarding.ts:85-99` — `complete()` does not reset module-scope state**

```ts
async function complete(): Promise<{ brandId: string }> {
  isFinishing.value = true
  finishError.value = null
  try {
    const brand = await brands.createBrand(state.brandName)
    sessionStorage.removeItem(DRAFT_KEY)
    await router.push(`/brand/${brand.id}`)
    return { brandId: brand.id }
  } catch (err) { /* ... */ }
  finally { isFinishing.value = false }
}
```

`state.brandName` / `state.brandUrl` / `state.industry` / `state.tempBrandId` live at module scope (C-HIGH3 singleton pattern) and are never reset on successful completion. If the user signs out and re-signs-up in the same tab (or another fresh-signup path triggers `/onboarding/brand`), the previous brand's data persists in the wizard fields. The `restoreDraft()` path is guarded by `sessionStorage` (correctly wiped on complete), but the in-memory reactive proxy is not. `_resetForTesting()` is the right helper — it should be called from `complete()` right before the router push (and probably renamed to drop the `_test` prefix).

**Fix:** call `_resetForTesting()` (or rename to `_resetWizard`) right before `await router.push(...)`. Also gate `_resetForTesting` export behind `if (import.meta.env.DEV)` so it doesn't ship in the production bundle.

**Severity:** HIGH (PII leak — prior brand name visible in second-account flow).

---

### MEDIUM — 8

**M1. Plan one-commit-per-task discipline violated (8 bundle commits across 22)**

Plan 02 §6 + the W9a execution prompt mandate "ONE COMMIT PER TASK." Observed bundles:

- `1ad7713e` — T04 + T05
- `b0b98399` — T15 + T16
- `885a5f6e` — T18 + T19 + T20 + T21 + T22
- `469c1b71` — T23 + T24 + T25 + T26 + T27 + T28 + T29
- `9e4b88a7` — T30 + T32
- `d79aec27` — T33 + T34 + T35
- `35b2b865` — T36 + T37
- `d12f7d98` — T38 + T39 + T40

8/22 = 36% of commits bundle 2+ tasks. The smallest is the 7-task `469c1b71` bundle covering nearly the entire composer + file-grid feature surface. `git bisect` becomes useless for these features. The DONE report claims "conventional format, one task per commit" — incorrect.

**Severity:** MEDIUM (audit-log + bisect-friendliness regression; future c-clusters should `git add -p` per task).

---

**M2. Missing visual-fidelity 3-rule artifacts**

`tests/snapshots/cluster-02/` does not exist. Per IMPLEMENTATION_PROMPT.md §6 + DESIGN-SYSTEM-COMPLIANCE-RIDER.md §8, every surface ships with:
1. `<surface>-diff.md` written discrepancy log
2. 3-screenshot PR row (mockup / impl / diff)
3. Playwright visual-diff gate (≤ 0.1% component / ≤ 0.5% screen)

The DONE report marks these "⏸ DEFERRED" pending dev-server-up + Cluster 11 CI-determinism prereqs (font/icon baking). This is the standing inverted-bundle-README problem: the auto-deferred per-screen diff loop is a key fidelity guard, and deferring it past cluster boundary means the visual drift surfaces during integration (W12-W13) when it's expensive to fix.

**Severity:** MEDIUM (fidelity-gate deferral acknowledged in DONE; recommend running the per-surface diff loop before W9b ships or at minimum before the founder smoke pass T41).

---

**M3. `src/components/dashboard/DashboardSkeleton.vue:32` — live `no-raw-visual-values` lint warning in c02-shipped file**

```vue
<div :class="SHIMMER_CLASS" class="h-24 w-full max-w-[760px] mx-auto rounded-2xl mt-6" />
```

`max-w-[760px]` is the single Cluster 02-introduced violation of the `no-raw-visual-values` lint rule (lint runs WARN-mode per IMPLEMENTATION_PROMPT.md §9 rollout, currently 219 total warnings of which 218 are pre-existing in non-c02 files). 760px is the composer-wrap canonical max-width — should be promoted to a named token (e.g., `--composer-max-w: 760px`) per Phase 2 spec-offset tokens pattern (§4 of IMPLEMENTATION_PROMPT).

**Fix:** add `--composer-max-w: 760px` to `kova-hifi.css :root` + `src/app.css @theme`, then `class="... max-w-[var(--composer-max-w)] ..."`. The token already exists implicitly in the composer wrap CSS — promote it.

**Severity:** MEDIUM (no-raw-visual-values rollout protocol violation in newly-shipped file).

---

**M4. `src/router.ts:140-176` — wizard sub-route metas drop `requiresOnboarding: false`**

`/onboarding` (line 143) sets `requiresOnboarding: false, onboardingOnly: true`. The four wizard children (lines 157/163/169/175) set `onboardingOnly: true` but omit `requiresOnboarding`. Today the guard treats undefined as falsy so it works, but the guard contract is undocumented and the first time a future PR adds an "if requiresOnboarding !== false, redirect" check the wizard silently bricks. Defense-in-depth: add `requiresOnboarding: false` to all four children for contract explicitness.

**Severity:** MEDIUM (contract clarity + future-proofing).

---

**M5. `src/views/dashboard/ComingSoonView.vue:16` — `!.` non-null assertion violates CLAUDE.md ban**

Per the project's CLAUDE.md "Code Conventions": "No `any`, no `!` non-null assertions." The `?? COMING_SOON.calendar!` pattern uses the assertion. Fix: change the constants type so TS knows `calendar` is always present (`Required<typeof COMING_SOON>` or `const COMING_SOON = { calendar: {...}, ... } as const satisfies Record<ComingSoonKind, ComingSoonSpec>`), then drop the `!`.

**Severity:** MEDIUM (project hard-rule violation in newly-shipped file).

---

**M6. `src/router.ts:76-79` — `getOnboardingNextRoute` dead code post-T17**

After T17's `OnboardingView` refactor (each wizard step component now mounts directly via its own route), the `getOnboardingNextRoute(step)` helper is unreferenced. Either delete or wire it into the auth-callback flow if it's still meant to back that path. Right now it's a maintenance trap — the next engineer adding a step will edit the wrong place.

**Severity:** MEDIUM (dead code in router contract surface).

---

**M7. `src/composables/use-onboarding.ts:148` — `_resetForTesting` exported in production bundle**

Module re-exports `_resetForTesting()` unconditionally. The underscore prefix is convention-only — esbuild/Rollup don't tree-shake it because nothing prevents a downstream caller from importing it. Production code can reset the wizard out from under a user.

**Fix:** wrap in `if (import.meta.env.DEV)` or move to a separate `use-onboarding.test-helpers.ts` file imported only from test fixtures.

**Severity:** MEDIUM (production-bundle surface that test helper should not occupy).

---

**M8. DONE report inaccuracies**

- Claims **21 commits** — `git log feat/m9-shopify..app/cluster-02-dashboard` shows **22** (`70025712..ae188122`, inclusive)
- Claims `superpowers:code-reviewer` was "⏸ DEFERRED" — this audit (the audit-phase code-reviewer sweep) finds 2 CRITICAL + 7 HIGH that DONE asserts are clean
- Claims `B-HIGH6 ✅` — literal fix observed, but uncontrolled `DropdownMenuRoot` creates a different B-HIGH6-adjacent functional gap (H1)
- Claims `NetworkStatusIndicator` "mounted globally by Cluster 11" — `grep` proves otherwise (H5)
- Claims "one task per commit" — 8 bundle commits (M1)

**Fix:** revise DONE report before merge with the above corrections; add a "post-audit fix log" section at the bottom (same pattern as `W8a-cluster-01-AUDIT-REPORT.md` line 17).

**Severity:** MEDIUM (DONE-report fidelity).

---

### LOW — 6

**L1. `src/composables/use-logo-fetch.ts:39` — hardcoded `.png` extension on upload path**

`const path = \`${userId}/${crypto.randomUUID()}.png\`` regardless of the uploaded file's actual extension (PNG/JPG accepted per PRD §3.1). Derive extension from `file.name` (matches the pattern in `src/stores/brands.ts:186`).

---

**L2. `src/composables/use-logo-fetch.ts` — in-flight fetchFavicon not cancelled on rapid input**

`useDebounceFn` correctly suppresses extra debounced calls, but once a debounced call fires, `fetchFavicon` runs to completion. If the user clears the URL field after the debounce fires, `isFetching` stays `true` until the old fetch resolves and may set `logoUrl` to a stale value. Track a `currentUrl` sentinel and skip the assignment if `urlRef.value` has changed at resolve time.

---

**L3. `src/views/dashboard/RecentsView.vue:47-49` (per code-reviewer subagent) — hardcoded `setTimeout(120/100)` for transition phases**

Magic numbers. Extract to `src/constants/transitions.ts` (`CANVAS_CREATE_REVIEW_MS = 120`, `CANVAS_CREATE_SPLASH_MS = 100`) per CLAUDE.md "No magic strings/numbers" convention.

---

**L4. `src/views/dashboard/ComingSoonView.vue:29` — `fetch('/api/marketing/notify-me')` swallows non-2xx**

Only catches network throws. Should `if (!res.ok) toast.show('Could not subscribe', 'error')`. The endpoint itself is deferred to pre-launch (Resend wiring) so the failure path will be exercised every render until then.

---

**L5. `src/stores/ui-state.ts:8-10` — module-scope `useLocalStorage` refs survive HMR**

On Vite HMR the module is replaced; the new export creates a new `useLocalStorage` ref on the same key, briefly diverging from any consumer holding the old export. Extremely low probability in practice given the SPA architecture, but worth a `// HMR-note:` comment. Same risk pattern noted in `use-onboarding.ts` module-scope singletons.

---

**L6. `src/views/BrandPickerView.vue` — placeholder has no loading/error states**

Cluster 03 will replace this, but during the Cluster 02 → Cluster 03 hand-off window any `brands.fetchBrands()` 401 leaves the page as an empty `<ul>` with no UI. Acceptable for a placeholder, but flag for W9b carry.

---

## Quality gates (re-run by this audit)

| Gate | Result | Notes |
|---|---|---|
| `bun run build` | ✅ exit 0 | 1.87s; 582 PWA entries; 1 chunk-size warning on `EditorView` (unrelated to c02) |
| `bun run check` (oxlint type-aware) | ✅ exit 0 | 219 `no-raw-visual-values` WARN-mode warnings, 218 pre-existing OOS + 1 in `DashboardSkeleton.vue:32` (M3); 0 oxlint errors |
| `bun run test:dupes` | ✅ 1.18% / 1.52% | well under 3% cap |
| `bun run test:unit` (full suite) | ⚠️ 1993 pass / 44 fail / 10 errors / 5 snapshot failed | per DONE report these are pre-existing OOS (cron/DB Shopify, Playwright-needing-Electron, etc.); Cluster 02-scoped subset is 188 / 190 with 2 SideFooter test-ordering issues (pass in isolation) |
| `git diff packages/core/**` | ✅ empty | lift-the-lock not engaged (correct — c02 not on cleared list) |
| `grep access_token=` | ✅ 0 matches | T03 security fix verified |
| `grep bg-white\|text-gray-900\|...` in T02 touched files | ✅ 0 matches | T02 light→dark refactor verified |
| Phase 1 audit gate | ✅ | `cluster-02-audit.md` + `cluster-02-tokens-used.md` exist + founder-approved (3 token buckets ratified 2026-05-25) |
| Visual-fidelity 3-rule artifacts | ❌ | `tests/snapshots/cluster-02/` missing (M2) |
| `<KovaIcon>` ban observed in new c02 files | ✅ | All 38 new c02 files clean |
| `<KovaIcon>` ban observed in c02-MODIFIED files | ❌ | `IntegrationsCard.vue` (T02) still ships raw `<icon-lucide-*>` (C2) |

---

## Plan task completion (Plan 02 §6, walked task-by-task)

All 17 implementation tasks (T01-T17 onboarding + state foundations + composables) plus T18-T40 (chrome / content / states / coming-soon / tests) are committed and traceable via the conventional commit messages. T31 (`OfflineIndicator`) correctly RETIRED per CT-020 → Cluster 11. T41 (founder manual smoke pass) correctly handed off. Plan-claim accuracy is high; the gaps are in the *design-rider compliance* layer (C2) and *cross-cluster contract verification* layer (H5), not in plan-task delivery.

---

## Recommended action

**Block merge** until:
1. **C1** — `src/router.ts:218` `require()` → static import (5-line fix)
2. **C2** — `IntegrationsCard.vue` raw icon tags → `<KovaIcon>` (10-line fix + test update)
3. **H5** — NetworkStatusIndicator mount in `src/App.vue` (1-line import + 1 template line; cross-cluster carry from Cluster 11 acceptable)

**Address before W9b launch** (Cluster 03 audit will inherit these otherwise):
4. **H1** — BrandSwitcher controlled mode + close-on-emit
5. **H2** — DashboardView event-bus migration (drop `matched[1].instances` reach-around)
6. **H3** — useFileGrid race guard (sentinel pattern)
7. **H4** — useGreeting `useNow` interval
8. **H6** — useDashboardStore canvases injection hoist
9. **H7** — useOnboarding state reset on complete

**Address before pre-launch / W12**:
10. **M2** — run per-surface visual-fidelity diff loop (`tests/snapshots/cluster-02/`)
11. **M3** — promote `760px` composer max-width to named token
12. **M8** — DONE report revision

**Open follow-up tickets**:
- Cluster 11: NetworkStatusIndicator mount audit (H5 root cause)
- Pre-launch cleanup: `<icon-lucide-*>` migration for the 4 pre-existing dashboard files out of c02 scope (TrashCard, EmptyState, BrandList, CanvasCard)

Cluster 03 may proceed in parallel — its routing-canonical dependency on Cluster 02 (CT-002 `/brand/:brandId` named route) is satisfied.

---

## Print

```
W9a AUDIT COMPLETE. Verdict: PASS WITH WARNINGS. 23 findings (2 CRITICAL / 7 HIGH / 8 MEDIUM / 6 LOW).
Report: docs/execution-phase/wave-audits/reports/W9a-cluster-02-AUDIT-REPORT.md
```
