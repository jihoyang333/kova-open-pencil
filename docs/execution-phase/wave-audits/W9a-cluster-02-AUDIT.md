# W9a — Cluster 02 (Onboarding + Dashboard) AUDIT Prompt

**Wave:** W9a
**Cluster:** 02 — DashboardView, BrandSwitcher, onboarding wizard, routing canonical for 03
**Audit type:** UI + routing + Pinia. Routing-canonical critical (Cluster 03 depends on this).
**Status:** ready after W9a DONE
**Prerequisites:** Branch `app/cluster-02-dashboard`. DONE at `cluster-reports/W9a-cluster-02-DONE.md`. MUST merge before W9b (Cluster 03) audit can run.

---

## Founder pre-flight

1. W9a printed DONE
2. Branch pushed
3. W8 sibling clusters all merged into feat/m9-shopify

---

## Launch

Fresh session at `/Users/jihoyang/kova-main/kova-open-pencil-1`. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W9a AUDIT agent for Kova. Independent reviewer for
Cluster 02 — onboarding + dashboard.

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W9a-cluster-02-dashboard.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/02-onboarding-and-dashboard.md
6. docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md
7. docs/execution-phase/cluster-reports/W9a-cluster-02-DONE.md
8. CLAUDE.md root + outer
9. ~/.claude/rules/common/coding-style.md
10. ~/.claude/rules/common/testing.md

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. vue-expert — DashboardView reactivity, BrandSwitcher (Reka
   DropdownMenu, no ref() per B-HIGH6), onboarding state machine
   (useOnboarding single entry per C-HIGH3)

## Conditional subagents

- e2e-runner — re-run signup → onboarding → dashboard →
  /brand/:brandId resolves
- database-reviewer — only if new RPCs introduced

## Cluster 02 expected scope

ALLOWED:
- src/views/DashboardView.vue
- src/views/onboarding/* — Brand, Shopify, BrandKit, Done steps
- src/views/coming-soon/* — 7 SOON-pilled routes per A-LOW5
- src/views/brand/[brandId]/index.vue (delegates to canvas; canvas
  chrome is Cluster 06's scope)
- src/components/dashboard/BrandSwitcher.vue + brand-cards grid
- src/components/dashboard/NetworkStatusIndicator.vue (Cluster 11
  wrapper, single-mode per CT-020)
- src/router/* — /dashboard, /onboarding/*, /brand/:brandId,
  /soon/* routes
- src/stores/dashboard.ts (useDashboardStore — search query + sort
  per B-CRIT11)
- src/composables/useOnboarding.ts (single entry)
- tests/*

FORBIDDEN:
- packages/core/** — CRITICAL violation
- Canvas chrome (Cluster 06)
- Brand management surfaces (Cluster 03)
- Stripe / auth Edge Fns (W8 scope)

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-02-dashboard
  git diff --stat feat/m9-shopify...app/cluster-02-dashboard

One-per-task discipline. Conventional commits.

### B. Routing canonical (CT-002 lock — CRITICAL for Cluster 03)

Verify route shape EXACTLY:
- /brand/:brandId (NOT /dashboard?brandId=... per CT-002)
- /dashboard renders the brand picker / cards grid
- /onboarding/brand, /onboarding/shopify, /onboarding/brand-kit,
  /onboarding/done (4 sub-routes per C-HIGH2 + PRD 02:148-151)
- 7 /soon/* routes per A-LOW5

Any deviation = CRITICAL (Cluster 03 depends on this canonical
shape). Open src/router/index.ts (or wherever routes are defined)
and read every route.

### C. Founder-locked decisions

- C-HIGH2: 4 onboarding routes present
- C-HIGH3: useOnboarding has single entry point (one composable,
  not duplicated per-route)
- CT-002: /brand/:brandId routing canonical
- CT-020: NetworkStatusIndicator single-mode (no toggleable
  variant; one display pattern)
- B-CRIT11: useDashboardStore exposes search query + sort mode as
  reactive state
- B-HIGH6: BrandSwitcher uses Reka DropdownMenu WITHOUT ref()
  wrapping the open state (DropdownMenu manages its own state)
- A-LOW5: 7 SOON-pilled coming-soon routes exist

Each violation = HIGH.

### D. State machine (onboarding wizard)

Open useOnboarding.ts. Verify:
- Single entry point (one composable, exported once)
- States are explicit (enum / const map per CLAUDE.md root §"Code
  Conventions" — use `as const` maps not enums)
- Transitions defined declaratively (next/prev/skip per state)
- Resume-on-reload: state persists to user_preferences or session
  storage with explicit hydration

### E. Pinia store (useDashboardStore)

- setup-store composition API (CLAUDE.md root §"Pinia")
- search query: ref<string>
- sort mode: ref<SortMode> (const map per Kova convention)
- Derived state via computed()
- No editor state in this store (canvas state lives elsewhere per
  CLAUDE.md root)

### F. Design-system compliance

  git diff feat/m9-shopify...app/cluster-02-dashboard -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg'

Any hit = CRITICAL.

Verify:
- Dashboard = dark theme (kova-hifi.css)
- Brand cards = .card pattern (no new card component)
- Sidebar = .sidebar pattern
- Search input = .input.search variant
- Skeletons = <KovaSkeleton> from Cluster 11 with canonical shimmer
  (per CHUNK_2 spec)
- Empty states = .empty-pane pattern from hi-fi
- KovaIcon everywhere; no <svg>; no Lucide direct import

### G. Visual fidelity (3-rule contract)

- KOVA_AUDIT.md exists at cluster-audits/cluster-02-audit.md
- tokens-used.md exists at cluster-audits/cluster-02-tokens-used.md
- Per-surface diff files under
  tests/snapshots/cluster-02/<surface>-diff.md
- 3-screenshot PR artifact per surface (mockup / impl / diff) under
  tests/snapshots/cluster-02/
- Playwright visual-diff thresholds 0.1% component / 0.5% screen
  enforced — re-run:

  bun run test:visual --project=visual-diff
  # OR
  bunx playwright test tests/visual-diff/cluster-02.spec.ts

Any surface missing the 3-screenshot artifact = HIGH.

### H. Cross-cluster contracts

- Cluster 03: /brand/:brandId routing canonical EXPOSED for brand
  management to consume — verify the router config exports the
  route name (e.g. 'brand') so Cluster 03 can router.push by name
- Cluster 06: /brand/:brandId entrypoint delegates rendering to
  canvas shell (Cluster 06). Verify no canvas implementation
  embedded here.
- Cluster 11: NetworkStatusIndicator wraps Cluster 11 primitive
  (NetworkBanner or equivalent). KovaSkeleton consumed.
- Cluster 01 (auth): onboarding flow triggered after signup — verify
  the post-signup redirect lands on /onboarding/brand

### I. Quality gates (re-run)

  bun install
  bun run build / check / test:unit / test:dupes

### J. Code-review sweep

Spawn superpowers:code-reviewer:
  "Audit feat/m9-shopify...app/cluster-02-dashboard. Focus: routing
  canonical (CT-002), onboarding state machine (C-HIGH3 single
  entry), BrandSwitcher (B-HIGH6 no-ref Reka DropdownMenu),
  dashboard Pinia store (B-CRIT11), design-system compliance,
  CLAUDE.md hard constraints. CRITICAL/HIGH/MEDIUM/LOW."

### K. Plan task completion + Done-report accuracy

Walk Plan 02 §6 task-by-task. Verify commits + Done-report claims.

## Output

  docs/execution-phase/wave-audits/reports/W9a-cluster-02-AUDIT-REPORT.md

Format per W7 template. Include "Routing canonical compliance"
section.

Print:
  "W9a AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W9a-cluster-02-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 45-75 min. Token spend: $60-100.**
