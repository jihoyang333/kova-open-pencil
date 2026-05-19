# 00f — B12 Archive Reversal — Dispatch Prompts

**Date:** 2026-05-17
**Decision:** Founder reversed 2026-05-13 lock. B12 archived Brands page is now **MVP**, not Phase 2.

**Status (2026-05-17 final):** All 5 prompts ✅ APPLIED. Reversal complete.

**Prompt-by-prompt status:**
| Prompt | Target | Status |
|---|---|---|
| A | PRD 03 + plan 03 | ✅ APPLIED (§12.10 reversal note + B12 page + restore_brand RPC + segmented control + Import removed + A2.a Archived ENABLED) |
| B | PRD 04 + plan 04 | ✅ APPLIED — §13.2.2 added; sidebar 5→6 (Brands slot 2, layers icon); routes enum incl. `brands`; SectionResolver maps to PRD 03's `<BrandsArchiveView>`; plan Tasks 7.1 + 13.1 + 13.3 updated |
| C | PRD 02 + plan 02 | ✅ APPLIED (parent agent — agent #2 dispatched falsely reported success; parent re-applied directly). §12.11 split Part A + Part B; §12.13 changelog added; Cmd+K scrubbed across 9 PRD lines + plan template; zero functional Cmd+K residuals (only changelog/audit-trail mentions remain by design) |
| D | PRD 08 + plan 08 | ✅ APPLIED — `useObjectActions` extended (`brandCardActiveActions` + `brandCardArchivedActions`); `useContextMenu('brand-card', { brand })` branches on `archived_at`; PRD 03 dep added; plan Tasks 2.1.4/2.1.5/2.2.2/2.2.4/4.9/7.4b wired |
| E | 00-PRD_SCOPE_PLAN.md | ✅ APPLIED (parent agent) — line 133 reversal log + line 137 restore_brand MVP + B12 page content scope + `BRANDS_RESTORE_ENABLED` flag |

---

## Folder reminder

- **PRDs:** `kova-open-pencil-1/docs/kova-final-prds/`
- **Plans:** `kova-open-pencil-1/docs/kova-final-impl-plans/`

---

## Decisions locked 2026-05-17

| # | Decision | Rationale |
|---|---|---|
| 1 | B12 page `/account/brands` ships MVP | Full active+archived inventory + Restore + Delete-archived modals |
| 2 | Brand picker `/brands` "Archived" filter dropdown — **ENABLE** | No longer DISABLED with "Coming Phase 2" tooltip |
| 3 | B12 page filter — segmented `All / Active / Archived` | Per hi-fi B12.1 |
| 4 | `restore_brand` RPC — **REAL**, not stub | SECURITY DEFINER, clears `archived_at` |
| 5 | `BRANDS_RESTORE_ENABLED` feature flag — **KEEP**, default `true` | Safety toggle if rollback needed |
| 6 | "Import" CTA — **REMOVE entirely** | Never building. Hero only has "New brand" |
| 7 | Route — `/account/brands` (confirmed standard pattern) | Linear/Notion/Figma all use settings-area-with-sidebar nested-routes |

---

## Prompt A — PRD 03 agent (PRIMARY OWNER) ✅ APPLIED 2026-05-17

> **DO NOT RE-DISPATCH.** PRD 03 + plan 03 already carry every delta below. Kept for audit trail / handoff reference only.



```
CONTEXT — DECISION REVERSAL 2026-05-17

Founder reversed the 2026-05-13 lock on B12. Archived Brands page is now MVP, NOT Phase 2.

Files (canonical paths in kova-open-pencil-1/):
- PRD:  docs/kova-final-prds/03-brand-management.md
- Plan: docs/kova-final-impl-plans/03-brand-management-plan.md

DELTAS to apply (PRD + plan both):

1. B12 page /account/brands ships MVP. Full active+archived inventory.
2. B12.3 Restore confirm modal — build, wire to real RPC.
3. B12.4 Delete-archived confirm modal — build, wire to existing delete_brand RPC.
4. restore_brand RPC — promote from stub to real. SECURITY DEFINER. Clears archived_at.
5. BRANDS_RESTORE_ENABLED feature flag — KEEP, but default `true` at MVP. Wrap UI gating so we can flip off if needed.
6. A2.a brand-picker /brands "Archived" filter dropdown — ENABLE. No longer DISABLED. Wire to archivedBrands getter.
7. B12 page segmented control "All / Active / Archived" — build per hi-fi B12.1.
8. REMOVE all "Import" CTA references. Founder cut — never building. Hero only has "New brand" button now.
9. useBrandsStore.archivedBrands getter — consumed by both B12 page and A2.a filter.
10. useBrandsStore.restoreBrand(id) action — wired, not stub.

Sources to re-verify against:
- main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B12 Brands page - Dark.html
- main-main-kova-scope/handoff-docs/CHUNK_B12_BRANDS_PAGE_REWASH.md
- main-main-kova-scope/batch-a-additions/dark/screenshots/B12/

ACTIONS:
- Update PRD: move §2.3 deferred-items into §2.1/§3 in-scope. Remove Import. Bump §0 status DRAFT → IN-REVIEW.
- Update plan: insert tasks for B12 page + B12.3 + B12.4 + RPC promotion + filter enable. Keep TDD pattern (test → fail → impl → pass → commit per task).
- Add §12 NEW entry: "B12 archive inclusion 2026-05-17 — reversal of 2026-05-13 lock".

DO NOT commit. Report back delta summary + line counts.
```

---

## Prompt B — PRD 04 agent

```
CONTEXT — DECISION REVERSAL 2026-05-17

B12 archived Brands page now MVP. PRD 03 owns the page itself; PRD 04 owns the /account chrome it lives in.

Files (canonical paths in kova-open-pencil-1/):
- PRD:  docs/kova-final-prds/04-account-and-stripe-billing.md
- Plan: docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md

DELTAS:

1. A7 .acc-rail sidebar: add "Brands" nav item. Verify position against Kova Hi-Fi A7 Account Page - Dark.html.
2. Route table: add /account/brands entry. Owns: PRD 03 (page content). PRD 04 owns route registration + auth meta.
3. Auth guard meta: requiresAuth, dark theme — same as other /account routes.

ACTIONS:
- Update PRD §X (routes section): add /account/brands row. Cite PRD 03 as page owner.
- Update plan: add task for /account/brands route registration. Cross-reference PRD 03 plan for content.

DO NOT commit. Report back delta summary.
```

---

## Prompt C — PRD 02 agent

```
CONTEXT — DECISION REVERSAL 2026-05-17

B12 archived Brands page now MVP (PRD 03 owner). Resolves your §12.11 open Q on sidebar SOON pills (for the Brands item specifically).

Files (canonical paths in kova-open-pencil-1/):
- PRD:  docs/kova-final-prds/02-onboarding-and-dashboard.md
- Plan: docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md

DELTAS:

1. §12.11 — RESOLVE the "Brands" sidebar item portion: ships visible at MVP (no SOON pill). Owns: PRD 03 surfaces at /account/brands.
2. If dashboard sidebar nav scaffolding ships in this cluster, ensure "Brands" item is rendered without SOON treatment.
3. Other items (Brand Kit / Knowledge base / Memories) — keep §12.11 open for those separately; this reversal only resolves the Brands item.
4. **STALE Cmd+K SCRUB (per 00g 2026-05-17 decision — Cmd+K dropped from MVP entirely):**
   - Line 50 (PRD 02) currently reads `... search bar with ⌘K hint (routes to Command-K palette, Cluster 11) ...`. Replace `⌘K hint (routes to Command-K palette, Cluster 11)` with plain `search input` (no shortcut hint, no palette ref).
   - Grep both PRD 02 + plan 02 for `Cmd+K`, `Cmd-K`, `⌘K`, `command palette`, `CommandPalette`, `command-k`, `useCommandPalette` — strip every remaining mention. All hits must return zero after edit.
   - Add to §12 changelog: `2026-05-17 — Cmd+K reference scrubbed per 00g kill decision.`

ACTIONS:
- Update PRD §12.11 → RESOLVED for Brands item; note remaining items still open.
- Update plan: confirm sidebar nav task does NOT apply SOON pill to Brands.
- Run grep verification on Cmd+K terms (above). Report zero residual hits.

DO NOT commit. Report back delta summary + grep verification output.
```

---

## Prompt D — PRD 08 agent

```
CONTEXT — DECISION REVERSAL 2026-05-17

B12 archived Brands page now MVP. Need archived-state context-menu items on brand cards.

Files (canonical paths in kova-open-pencil-1/):
- PRD:  docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md
- Plan: docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md

DELTAS:

1. useObjectActions composable: add archived-state branch for brand cards. Items:
   - Restore (opens B12.3 modal from PRD 03)
   - Delete (opens B12.4 modal from PRD 03)
2. Active-state brand-card menu items unchanged (Rename / Archive / Delete).
3. State determined by `brand.archived_at !== null`.

ACTIONS:
- Update PRD section covering useObjectActions: add archived-brand action set.
- Update plan: add test + impl steps for archived-state action set.

DO NOT commit. Report back.
```

---

## Prompt E — 00-PRD_SCOPE_PLAN reversal log

```
File: kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md

Find line 130:
"- A4.2 archive flow stays (founder confirmed 2026-05-13: archive action exists, no archived-list page at MVP — Phase 2 adds list)"

Replace with:
"- A4.2 archive flow stays. Founder 2026-05-13 locked archive action only; **REVERSED 2026-05-17 — B12 archived Brands page now MVP** (PRD 03 owns; Restore + Delete-archived modals + segmented filter + A2.a picker filter ENABLED; Import CTA dropped entirely)."

Also append a note to §3 PRD 03 entry (search for "Cluster 03" or "PRD 03" summary): B12 page now in-scope.

DO NOT commit. Report back.
```

---

## Execution order (revised 2026-05-17)

1. ~~Resolve all remaining open §12 questions across all PRDs before dispatching~~ — **rule loosened**. Each prompt fires independently as soon as its target PRD's §12 closes.
2. Prompt A ✅ APPLIED — no action.
3. Prompts B / C / D / E remaining — dispatch in parallel (different files, zero conflict) once founder gives go.
4. Each agent reports back delta summary.
5. Parent agent (Claude) reviews all 4 diffs as batch.
6. Single commit lands all changes.

---

## Why parallel-safe

| Prompt | File(s) touched |
|---|---|
| A | `03-brand-management.md` + `03-brand-management-plan.md` |
| B | `04-account-and-stripe-billing.md` + `04-account-and-stripe-billing-plan.md` |
| C | `02-onboarding-and-dashboard.md` + `02-onboarding-and-dashboard-plan.md` |
| D | `08-canvas-menus-popovers-shortcuts.md` + `08-canvas-menus-popovers-shortcuts-plan.md` |
| E | `00-PRD_SCOPE_PLAN.md` |

Zero overlap. Safe to fan out simultaneously.
