# W9b — Cluster 03 (Brand Management) Deferral Carve-outs

**Status:** founder sign-off requested
**Branch:** `app/cluster-03-brand-mgmt`
**Companion docs:**
- `docs/execution-phase/cluster-reports/W9b-cluster-03-DONE.md`
- `docs/execution-phase/wave-audits/reports/W9b-cluster-03-AUDIT-REPORT.md`

This document records the two scope deferrals raised in the W9b audit
(H5 + H6) so PRD acceptance criteria are explicitly carved out rather
than left implicit.

---

## H5 — Shopify OAuth handoff in StepShopify (Plan Task 36)

**Audit finding:** PRD 03 §8.2 acceptance criterion requires the "Connect
Shopify" button in Step 2 of the new-brand wizard to route to M9 OAuth and
return to `/brands/new/brand-kit` with `?shopify_connected=true` on success.
Current implementation (`src/views/brands/NewBrandWizardView.vue:119`)
ships the button hard-disabled with helper text directing users to wire it
in post-brand-creation.

**Reason for deferral:**
1. M9 Shopify OAuth (W6) currently exposes `useShopifyConnection(brandId)`
   for *connecting after brand exists*. The wizard's Step 2 fires BEFORE
   the brand row exists (commit happens at Step 3 / brand-kit).
2. The pre-create OAuth pattern (reserve brand-id → OAuth → finalise brand
   on callback) is non-trivial and was de-scoped by the Plan §6 Task 36
   note as "deferred to cluster integration time".
3. Disabling the button preserves the wizard's 4-step structure without
   blocking the happy path — users can complete brand creation and connect
   Shopify from the brand-home view immediately afterward.

**Carve-out scope:**
- PRD 03 §8.2 acceptance criterion "Step 2 'Connect Shopify' routes to
  M9 OAuth..." is suspended until the integration ticket lands.
- Replacement acceptance criterion: "Step 2 disabled-Connect button is
  rendered with helper text instructing the user to connect Shopify from
  the brand-home view after brand creation."
- Tracking ticket: deferred-c03-task-36-shopify-oauth (to be filed when
  founder signs off on this carve-out).

**Founder action:** confirm carve-out OR direct: re-open the OAuth wire-
up under an amendment before merging to `feat/m9-shopify`.

---

## H6 — Wizard composite vs 11-file plan (Plan Task 32)

**Audit finding:** Plan 03 §6 calls for the new-brand wizard to ship as 4
separate step SFCs (`StepNameUrl.vue`, `StepShopify.vue`, `StepBrandKit.vue`,
`StepDone.vue`) + 7 chrome components (`WizardShell.vue`, `WizardProgress.vue`,
`WizardCard.vue`, `LogoFetchSlot.vue`, `ShopifyConnectCard.vue`,
`BrandKitDropZone.vue`, `BrandKitAIPreview.vue`) + `WizardSplash.vue` — 11
SFCs total — supporting nested routes (`/brands/new/shopify`,
`/brands/new/brand-kit`, `/brands/new/done`) per PRD 03 §6.1 for deep-linking
and browser back/forward.

**As-shipped:** 1 composite view (`src/views/brands/NewBrandWizardView.vue`,
164 lines) driven by `useNewBrandFlow.step`. Sub-routes NOT registered.

**Reason for deferral:**
1. The composite is functionally equivalent for the happy path. The 4-step
   state machine lives in `useNewBrandFlow` and is testable independent of
   chrome decomposition.
2. Deep-linkable sub-routes are useful only if a user routinely needs to
   resume a half-finished wizard from a fresh browser tab. The committed
   brand row only exists after Step 3; Steps 1-2 hold in-memory state
   only. A deep-link to Step 2 cannot meaningfully restore prior input.
3. The Plan §6 split was structural guidance, not a user-visible contract.
4. Splitting now adds ~10 SFC scaffolds + sub-route registrations + 4
   route-meta entries + 8 props/emits seams without changing what the
   wizard does.

**Carve-out scope:**
- PRD 03 §6.1 reference to nested wizard routes is reduced to "the wizard
  is implemented at `/brands/new` with internal step state managed by
  `useNewBrandFlow`. Deep-linking to individual steps is Phase 2."
- Plan 03 §6 Task 32 "ship 4 step SFCs + 7 chrome SFCs" is collapsed into
  "ship the composite `NewBrandWizardView.vue` + `useNewBrandFlow`
  composable; split into per-step SFCs if/when Phase 2 requires it."
- Tracking ticket: deferred-c03-task-32-wizard-split (to be filed when
  founder signs off).

**Founder action:** confirm carve-out OR direct: split into 11 SFCs +
register sub-routes before merging.

---

## Sign-off

When founder approves both carve-outs:
1. Update `docs/kova-final-prds/03-brand-management.md` §6.1 + §8.2 with
   the suspended-acceptance language above.
2. File the two deferral tickets.
3. Bump the PRD 03 §0 status to IN-IMPLEMENTATION (Plan Task 40).

Until then, treat W9b Cluster 03 as PASS-WITH-CONCERNS rather than
PASS — the audit-blocking severity is HIGH on both items.
