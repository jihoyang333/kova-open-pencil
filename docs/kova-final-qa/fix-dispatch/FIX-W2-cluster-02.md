# Wave 2 — Cluster 02 (Dashboard + Sidebar + Brand Cards) Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Prerequisite:** Wave 1 merged (Cluster 11 ships KovaIcon + NetworkStatusIndicator + audit_log).
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/`
**Branch to create:** `fix/qa-w2-cluster-02-dashboard`
**Estimated wall-clock:** 1 day
**Output PR title:** `fix(qa-w2-cluster-02): dashboard/sidebar/brand-cards — 25 findings`

---

## Mission

You are the **Wave 2 Cluster 02 fix agent.** Cluster 02 owns dashboard, sidebar, brand-cards grid, onboarding wizard, file-grid, search, recents, and the topbar. It consumes Cluster 11 primitives (KovaIcon, NetworkStatusIndicator, KovaModal, etc.) and Cluster 01 auth + Stripe basics.

Your job: close **25 findings** (3 CRITICAL, 5 HIGH, 10 MEDIUM, 5 LOW, 2 cross-cluster CT).

---

## Required reading

1. CONSOLIDATED-TRIAGE.md — Cluster 02 section in full
2. QA-A-findings.md — A-MED1, A-LOW5
3. QA-B-findings.md — B-CRIT5, B-CRIT10, B-CRIT11, B-HIGH4, B-HIGH6, B-HIGH8, B-HIGH14, B-MED4, B-MED6, B-MED7, B-MED11, B-MED15, B-LOW2, B-LOW7
4. QA-C-findings.md — Pair 02 matrix; HIGH-2, HIGH-3, MEDIUM-3, MEDIUM-4, MEDIUM-5, MEDIUM-6, MEDIUM-7, MEDIUM-8, LOW-02.7
5. fix-dispatch/README.md (frozen decisions)
6. Cluster 11 PR — verify KovaIcon + NetworkStatusIndicator + audit_log shipped
7. Cluster 01 PR — verify auth.profile shape
8. PRD 02 + Plan 02 (post-W0 + post-W1 state)

---

## Findings to close (in this order)

### CRITICAL (3)

1. **B-CRIT10 Authorization header Promise template-literal** — Plan 02:3605.
   - Current: `\`Bearer ${supabase.auth.getSession()}\`` — `getSession()` returns Promise; template literal stringifies to `"Bearer [object Promise]"`.
   - Fix:
     ```ts
     const { data: { session } } = await supabase.auth.getSession()
     if (!session) throw new Error('not signed in')
     headers['Authorization'] = `Bearer ${session.access_token}`
     ```
   - Test: mock supabase.auth.getSession to return a session; assert the Authorization header equals `Bearer <known-token>`.

2. **B-CRIT11 RecentsView reads sortMode from wrong store** — Plan 02:3283.
   - `const { sortMode } = useCanvasesStore()` — but `sortMode` is on `useDashboardStore`.
   - Fix: `const dash = useDashboardStore(); const sortMode = computed(() => dash.sortMode)`.
   - Test: mount RecentsView with mocked stores; assert it reads from `useDashboardStore`.

3. **B-CRIT5 jest.mock in bun:test file** — Plan 02:3009.
   - Replace with bun:test pattern:
     ```ts
     import { mock } from 'bun:test'
     mock.module('@supabase/supabase-js', () => ({ createClient: () => ({ ... }) }))
     ```
   - Verify CI gate W0-6 passes after fix.

### HIGH (5)

4. **C-HIGH2 onboarding wizard sub-routes not registered** — PRD 02 §6.1 + Plan T12.
   - PRD §6.1 routes block currently registers only `/onboarding` and legacy `/onboarding/store-type`.
   - Add 4 sub-routes: `/onboarding/brand`, `/onboarding/shopify`, `/onboarding/brand-kit`, `/onboarding/done`.
   - Plan T12 — ship the router entries; each is its own component with route guards.
   - Tests: navigate to each sub-route in E2E and confirm correct component mounts.

5. **C-HIGH3 useOnboarding identifier mismatch** — Plan 02 T13 vs T17.
   - T13: `inject('onboardingState')` (M9-era).
   - T17: `useOnboarding` composable.
   - Unify on `useOnboarding`. Update T13 to consume `useOnboarding()` directly. Remove the legacy inject.

6. **B-HIGH4 auth.profile.email doesn't exist** — Plan 02:1007, 2194, 2202, 2210, 2244, 3601, 3606.
   - Plan 01's `UserProfile` interface has no `email` field. Plan 02 reads `auth.profile.email` repeatedly.
   - Two options:
     - (a) Extend Plan 01's `UserProfile` interface to include `email: string`.
     - (b) Use `auth.user?.email` (the underlying Supabase auth user).
   - Recommend (b) — email is auth-level, not profile-level. Update all 7 callsites.
   - Coordinate with Cluster 01 fix agent if they're still active (this lives in Cluster 02 plan but touches Cluster 01 interface).

7. **B-HIGH6 BrandSwitcher.vue missing ref import** — Plan 02:1934-1943.
   - Add `import { ref } from 'vue'`.

8. **B-HIGH14 useFileGrid direct mutation** — Plan 02:1139.
   - `dash.searchQuery = q` — direct mutation. Use a Pinia action.
   - Add `setSearchQuery(q: string)` action to `useDashboardStore`. Update callsites.
   - Test that store mutations only happen via actions.

9. **B-HIGH8 mockImplementationOnce/mockClear** — Plan 02 multiple.
   - Replace Vitest/Jest-only methods with bun:test patterns. Audit every test file in Cluster 02 Plan.

### MEDIUM (10)

10. **C-MED4 useOfflineState raw navigator.onLine** — Plan 02 Task T31.
    - Replace with `useOnlineStatus()` composable from Plan 11 Task 2.4 (which combines `navigator.onLine` + Supabase Realtime channel ping).
    - Test that loss of Realtime channel triggers offline state even if `navigator.onLine === true`.

11. **C-MED5 PRD §12.10 wizard step consolidation un-gated** — PRD 02 §12.10 + Plan T13.
    - PRD marks "OPEN, ESCALATE founder". Founder ratifies inline. Tag RESOLVED 2026-05-19 with decision: consolidate `BrandNameStep + BrandUrlStep + NameStep` into a single `BrandIdentityStep`.
    - Plan T13 proceeds with consolidation per founder decision.

12. **C-MED6 ExtractionStep.vue retirement** — Plan 02 T13.
    - Plan file-structure says deleted; impl steps don't `git rm`. Add the `git rm` step.

13. **C-MED7 Cluster 05 brand-kit extract queue handoff** — Plan 02 ↔ Plan 05.
    - No payload-enqueue task in Plan 02. Add: at end of onboarding (step 3 brand-kit-extract), enqueue a payload into the brand-kit extraction queue (Cluster 05 owns the queue).
    - Document the queue contract in scope plan §6. Coordinate with Cluster 05 fix agent.

14. **C-MED8 lastActiveBrandId shared-ref** — Plan 02 T04 + T05.
    - Two separate `useLocalStorage` instances on key `'kova:ui:last-brand'`. Compose ONE ref + share via computed or expose a getter on `useUIStateStore`.
    - Test that updating one consumer reflects in the other immediately.

15. **B-MED4 ComposerInputWrap e.code === 'Enter' (confirms Plan 03 outlier)** — Plan 02:2400.
    - **Informational — no change to Plan 02.** Cross-reference for Plan 03 fix (B-HIGH3 in Wave 2 Cluster 03 agent's brief).
    - Document in commit message: "B-MED4 verified — Plan 02 uses `e.code` correctly; Plan 03 fix tracked separately."

16. **B-MED6 ComposerInputWrap innerText** — Plan 02:2434.
    - `(e.target as HTMLElement).innerText` includes `<br>`/`<div>` line wrappers as `\n`.
    - Fix:
      ```ts
      const text = (e.target as HTMLElement).textContent ?? ''
      // Optional: normalize whitespace
      const normalized = text.replace(/\s+/g, ' ').trim()
      ```
    - Note: this is an `as` cast. Replace with safer narrowing:
      ```ts
      const target = e.target instanceof HTMLElement ? e.target : null
      const text = target?.textContent ?? ''
      ```

17. **B-MED7 wall-clock setTimeout(220) flaky** — Plan 02:1083, 1097.
    - Replace `await new Promise(r => setTimeout(r, 220))` with bun:test fake timers OR `await flushPromises()` if the debounce uses `nextTick`.
    - bun:test pattern:
      ```ts
      import { mock } from 'bun:test'
      mock.module('@/composables/use-debounce', () => ({
        useDebounce: (fn: () => void) => fn, // no-debounce in tests
      }))
      ```

18. **B-MED11 useLocalStorage on every reactive change** — Plan 02 + Plan 04 (NON-ISSUE).
    - VueUse `useLocalStorage` is already debounced internally. No code change.
    - Document in commit message: "B-MED11 verified — VueUse internally debounced; no change needed."

19. **B-MED15 v-model="state.brandName.value" inject pattern** — Plan 02:1464, 1470, 1484.
    - Confusing because `state.brandName` is a Ref-unwrap pattern via inject.
    - Fix: provide a reactive proxy via `useOnboarding()` returning a `Reactive<{brandName: string}>` — then template reads `v-model="state.brandName"` (no `.value`). Update inject contract accordingly.
    - Document the new contract in Plan 02 §6.2.

### LOW (5)

20. **CT-020 sidebar offline net-strip (consumer side)** — PRD 02 §2.1, §3.7, §8.7.
    - Cluster 11 §3.7 retired the 3-signal offline indicator. PRD 02 still specs `.net-strip` + 3 signals.
    - Rewrite to consume `<NetworkStatusIndicator>` from Plan 11. Update §2.1 sidebar nav, §3.7 offline state spec, §8.7 acceptance.
    - Verify Cluster 11 PR mounts the indicator in the right place (App.vue or topbar).

21. **A-LOW5 SOON pill list inconsistency** — PRD 02 §2.1:50.
    - Sidebar shows 3 SOON pills; route map ships 7 ComingSoonView. Reconcile.
    - Per founder spec (`feedback_brands_visible_no_soon` + B12 reversal): Brands ship visible with no SOON pill at MVP. The other coming-soon items keep their pills.
    - Update §2.1 line 50 to match the route map (or vice-versa).

22. **A-MED1 PRD 02 §12 OPEN QUESTIONS** — PRD 02 §12.10, §12.12.
    - Founder ratifies inline. Tag each with `RESOLVED 2026-05-19`.

23. **B-LOW2 TODO comment** — Plan 02:1950.
    - `() => { /* TODO: opens Cluster 03 modal */ }` — acceptable cross-cluster stitch. Add reference: `// TODO(cluster-03): wire BrandModal via useBrandModalStore once Cluster 03 ships`.

24. **B-LOW7 self-review acknowledges but doesn't fix** — Plan 02:3859-3860.
    - Self-review comment acknowledges B-CRIT10 + useUIStateStore-in-template anti-pattern. After your B-CRIT10 fix, the comment is stale. Remove or update the comment to reference the fix commit.

25. **C-LOW02.7 Retire WelcomeStep + ReviewStep** — Plan 02 Task 17.
    - Retirement currently deferred. Move retirement step to Task T13 (alongside ExtractionStep.vue removal). Author the `git rm` calls + removal of router refs.

---

## Output report template

```markdown
## Wave 2 Cluster 02 — Fix Agent Report

**Branch:** fix/qa-w2-cluster-02-dashboard
**Commits:** N

### Findings closed (25 total)
- [x] B-CRIT10 fetch Promise — commit <hash>
- [x] B-CRIT11 sortMode store — commit <hash>
- [x] B-CRIT5 jest.mock → bun:test — commit <hash>
- [x] C-HIGH2 wizard sub-routes — commit <hash>
- [x] C-HIGH3 useOnboarding identifier — commit <hash>
- [x] B-HIGH4 auth.user.email — commit <hash>
- [x] B-HIGH6 ref import — commit <hash>
- [x] B-HIGH14 useFileGrid direct mutation — commit <hash>
- [x] B-HIGH8 mockImplementationOnce — commit <hash>
- [x] C-MED4 useOfflineState → useOnlineStatus — commit <hash>
- [x] C-MED5 wizard consolidation — commit <hash>
- [x] C-MED6 ExtractionStep retirement — commit <hash>
- [x] C-MED7 brand-kit extract queue handoff — commit <hash>
- [x] C-MED8 lastActiveBrandId shared ref — commit <hash>
- [x] B-MED4 verified — no change
- [x] B-MED6 innerText → textContent — commit <hash>
- [x] B-MED7 wall-clock timers → fake — commit <hash>
- [x] B-MED11 verified — no change
- [x] B-MED15 inject reactive proxy — commit <hash>
- [x] CT-020 NetworkStatusIndicator consumer — commit <hash>
- [x] A-LOW5 SOON pills reconciled — commit <hash>
- [x] A-MED1 §12 closures — commit <hash>
- [x] B-LOW2 TODO cluster-03 reference — commit <hash>
- [x] B-LOW7 self-review comment updated — commit <hash>
- [x] C-LOW02.7 retirement moved to T13 — commit <hash>

### Tests added/modified
- ...

### Cross-cluster dependencies verified
- KovaIcon (Cluster 11) — N callsites migrated
- NetworkStatusIndicator (Cluster 11) — consumed in sidebar/topbar
- auth.user.email (Cluster 01) — 7 callsites updated
- Brand-kit extract queue (Cluster 05) — handoff documented in scope plan §6

### Quality gates
- [x] `bun run check` passes
- [x] `bun run test:unit` passes
- [x] CI gates W0-5/6/9 green
- [x] No `as any`, no `process.env.X!`, no `jest.mock`/`vi.mock`, no `e.key`

### Blockers
None / list.
```

---

## Hard rules

1. **Cluster 11 must be merged before you start.** Verify KovaIcon + NetworkStatusIndicator + `useOnlineStatus` exist.
2. **Coordinate with Cluster 03 + Cluster 05 fix agents (parallel in Wave 2).** Avoid touching their files.
3. **No `as any`. No `process.env.X!`. No `jest.mock`/`vi.mock`. No `e.key`. No `Math.random`.**
4. **TDD per finding.**

---

**End of W2 Cluster 02 dispatch prompt.**
