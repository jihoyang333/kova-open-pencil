# W9a — Cluster 02 (Dashboard + Onboarding) Execution Prompt

**Wave:** W9 (sequential: 02 → 03)
**Cluster:** 02 — Dashboard + Sidebar + Brand Cards + Onboarding wizard
**Status:** ready after W8 fully merged (01 + 04 + 12 all integrated)
**Prerequisites:** Cluster 01 ships auth + Shopify OAuth + onboarding routes; Cluster 04 ships Account page contracts
**Worktree:** NO — sequential within W9

---

## Founder pre-flight

1. W8 fully merged (all 3 cluster branches integrated)
2. `bun run build` succeeds on `feat/m9-shopify`
3. Auth flow works end-to-end (Cluster 01)
4. Account page exists (Cluster 04)
5. Onboarding sub-routes registered: /onboarding/{brand,shopify,brand-kit,done}
   per C-HIGH2 (already in Plan 02 §6 + PRD 02:148-151)

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-main/kova-open-pencil-1`. Opus 4.7. NO worktree.

---

## PROMPT (paste verbatim)

```
You are the W9a execution-phase agent. Build Cluster 02 — Dashboard +
sidebar + brand cards + onboarding wizard.

Sequential within W9 (you must finish before W9b Cluster 03 starts —
03 depends on 02's routing canonical).

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/02-onboarding-and-dashboard.md
4. docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi (full paths — also see Plan 02 §Hi-fi Visual Reference + Translation Method for the complete task→hi-fi mapping table):
   - Dashboard: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi 03 Brand Dashboard - Dark.html
   - Brand picker: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html
   - Onboarding: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (at end)

## Conditional subagents

- vue-expert — dashboard reactivity, BrandSwitcher (Reka DropdownMenu),
  brand-cards grid, onboarding state machine
- database-reviewer — N/A unless Plan 02 introduces new RPCs

## Cluster 02 scope

- Routes: /dashboard, /onboarding/{brand,shopify,brand-kit,done}
  (per C-HIGH2 — already in Plan 02 §6 + PRD 02:148-151)
- Routing canonical: /brand/:brandId (NOT /dashboard?brandId= per
  CT-002 lock)
- DashboardView with sidebar + brand cards grid + search/filter
- BrandSwitcher (Reka DropdownMenu, no ref() per B-HIGH6 fix)
- Onboarding wizard with state machine (useOnboarding single entry per
  C-HIGH3)
- ComingSoonView routes (7 SOON-pilled per A-LOW5)
- /brand/:brandId entrypoint (delegates to canvas — Cluster 06 owns
  canvas chrome)
- useDashboardStore (Pinia, search query, sort mode per B-CRIT11)
- NetworkStatusIndicator (Cluster 11 wrapper, single-mode per CT-020)

## Hi-fi references (read fully before implementing)

- Dashboard chrome: batch-a/dark/Kova Hi-Fi 03 Brand Dashboard - Dark.html
- Brand picker dropdown: batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html
- Onboarding cards: batch-a/dark/Kova Hi-Fi A1 Onboarding - Dark.html
- Loading skeletons: handoff-docs/phase-1/CHUNK_2_ASYNC_DATA.md
  (deliverables include B7.1 dashboard skeleton)

## Branch + commits

Branch: app/cluster-02-dashboard
Pre-flight:
  cd /Users/jihoyang/kova-main/kova-open-pencil-1
  git checkout feat/m9-shopify
  git pull origin feat/m9-shopify
  git branch app/cluster-02-dashboard feat/m9-shopify
  git checkout app/cluster-02-dashboard

Commit format: feat(c02-tNN), test(c02), fix(c02-review)
ONE COMMIT PER TASK. Push every 5-8.

## Per-task flow

Standard TDD per Plan 02 §6.

## Design-system compliance

Dashboard = dark theme.
Brand cards grid = .card pattern from kova-hifi.css.
Sidebar = .sidebar pattern.
Search input = .input.search variant.
Loading skeletons = <KovaSkeleton> from Cluster 11 with canonical
shimmer (per CHUNK_2 spec).
Empty states = .empty-pane pattern from hi-fi.

## Cluster-end gates

1. All Plan tasks committed
2. bun run build / check / test:unit / test:dupes — green
3. superpowers:code-reviewer — PASS
4. e2e-runner — signup → onboarding → dashboard → brand-card-click →
   canvas (canvas may not exist yet; verify route resolves)
5. Playwright visual diff (dashboard + brand-picker + onboarding) —
   ≤ 2% per surface

## Done report

Path: docs/execution-phase/cluster-reports/W9a-cluster-02-DONE.md

Print when done:
  W9a CLUSTER 02 DONE. <N> commits to app/cluster-02-dashboard.
  Founder: merge before W9b (Cluster 03) launches.

Begin.
```

---

**Estimated wall-clock: 6-10h (Opus). Token spend: $250-450.**
