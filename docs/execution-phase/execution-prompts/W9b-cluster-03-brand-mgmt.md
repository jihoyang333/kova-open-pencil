# W9b — Cluster 03 (Brand Management) Execution Prompt

**Wave:** W9 (sequential — runs AFTER W9a Cluster 02 merged)
**Cluster:** 03 — Brand Modal + Brand Kit Settings + Archive + Trash + Restore
**Status:** ready after W9a merged
**Worktree:** NO

---

## Founder pre-flight

1. W9a (Cluster 02) merged into `feat/m9-shopify`
2. Routing canonical `/brand/:brandId` exists (Cluster 02 ships)
3. Account page Brand Kit cross-link exists (Cluster 04 from W8)

---

## Launch

Fresh Claude Code session at `/Users/jihoyang/kova-main/kova-open-pencil-1`. Opus 4.7.

---

## PROMPT (paste verbatim)

```
You are the W9b execution-phase agent. Build Cluster 03 — Brand modal +
Brand Kit settings + Archive + Trash + Restore.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/kova-final-prds/03-brand-management.md
4. docs/kova-final-impl-plans/03-brand-management-plan.md
5. docs/execution-phase/claude-design-files/README.md  (hi-fi bundle overview, authority chain, fidelity rule, screen inventory)
6. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md  (authoritative HTML → Vue translation method + Appendix A per-property extraction checklist; mockup wins; per-screen diff loop)
7. CLAUDE.md
8. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
9. Hi-fi (full paths — also see Plan 03 §Hi-fi Visual Reference + Translation Method for the complete mapping):
   - Brand picker + new brand: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A2+A3 Brand picker & New brand - Dark.html
   - Modals (rename / archive / delete): /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html
   - Brands page (B12): /Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html
   - Brand Kit CRUD modals: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/dark/batch-0/Kova Hi-Fi B3 Brand Kit CRUD Modals - Dark.html
   - Account → Brand Kit sub-tab: /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:executing-plans
3. superpowers:test-driven-development
4. superpowers:code-reviewer (end)

## Conditional subagents

- database-reviewer — Plan 03 has 7 SECURITY DEFINER RPCs (per W5a
  C-MED9 — restore_brand promoted to REAL); inline RPC bodies + RLS
- vue-expert — Brand modal (Reka Dialog), Brand Kit forms, Archive list

## Cluster 03 scope

- 7 SECURITY DEFINER RPCs (all with SET search_path = public, pg_temp):
  - create_brand, update_brand, delete_brand, archive_brand,
    restore_brand (REAL, not stub per B12 reversal), list_brands,
    soft_delete_brand
- Migration: brand soft-delete + archived flags + restore audit
- BrandModal (Reka Dialog) — create + edit + delete confirmation
- Brand Kit settings sub-tabs (within Account page Brand Kit
  cross-link from Cluster 04):
  - Colors (Q24 brand-kit drag-drop payload — Cluster 05 owns drag wire)
  - Fonts
  - Logo
  - Tone snippets (per Q8 founder lock 2026-04-25 — JSONB on brands)
  - Saved blocks (per Q8 founder lock — JSONB on brands)
- ArchiveView at /account/brands (per B12 reversal)
- BRANDS_RESTORE_ENABLED feature flag honored
- Segmented filter on archive view (per B12 reversal)
- 22 W2 findings already resolved (per audit); execute Plan 03 §6 tasks
- DOMPurify sanitization on user input per B-CRIT14 fix

## Hi-fi references

Read all 3 hi-fi files in scope before writing components.

## Branch + commits

Branch: app/cluster-03-brand-mgmt
Pre-flight:
  cd /Users/jihoyang/kova-main/kova-open-pencil-1
  git checkout feat/m9-shopify
  git pull origin feat/m9-shopify
  git branch app/cluster-03-brand-mgmt feat/m9-shopify
  git checkout app/cluster-03-brand-mgmt

Commit format: feat(c03-tNN), test(c03), fix(c03-review)
ONE COMMIT PER TASK.

## Per-task flow

Standard TDD per Plan 03 §6.
RPC integration tests against local supabase start.

## Design-system compliance

Dark theme everywhere (Account page surfaces).
Brand cards = .card pattern.
Modals = .dlg.md (540px) or .dlg.lg (880px) for Brand Kit CRUD.
Color/font swatches = existing patterns.
Sanitize all user-input strings via DOMPurify (B-CRIT14 lock).

## Cluster-end gates

1. All Plan tasks committed (including W5a B-MED17 mock.module fix
   verified — Plan 03:2418 pattern)
2. bun run build / check / test:unit / test:dupes — green
3. supabase migration up — RLS verified per RPC
4. database-reviewer — PASS on 7 RPCs
5. superpowers:code-reviewer — PASS
6. e2e-runner — create brand → edit → archive → restore → delete; XSS
   regression test
7. Playwright visual diff (BrandModal, Archive view, Brand Kit sub-tabs)
   — ≤ 2%

## Done report

Path: docs/execution-phase/cluster-reports/W9b-cluster-03-DONE.md

Print when done:
  W9b CLUSTER 03 DONE. <N> commits to app/cluster-03-brand-mgmt.

Begin.
```

---

**Estimated wall-clock: 6-10h (Opus). Token spend: $250-450.**
