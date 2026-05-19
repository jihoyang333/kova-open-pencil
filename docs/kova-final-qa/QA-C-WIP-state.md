# QA-C Work-In-Progress State (resume marker)

**Purpose:** Snapshot of QA-C audit progress before context compact. Feed this doc back to Claude after compact so audit resumes cleanly.

**Dispatch source:** `kova-open-pencil-1/docs/kova-final-qa/QA-C-prd-plan-reconciliation.md` (read this for full instructions — already read once).

**Output target:** `kova-open-pencil-1/docs/kova-final-qa/findings/QA-C-findings.md` (does NOT exist yet — to be written at audit end).

**Mode reminder:** READ-ONLY. Do NOT modify PRDs, plans, code, or any file outside the single output report. Do NOT commit. Do NOT spawn sub-agents — read directly with Read + Grep per dispatch.

---

## Progress tracker

| Pair | PRD | Plan | Findings logged? | Status |
|---|---|---|---|---|
| 01 | 01-auth-and-identity.md | 01-auth-and-identity-plan.md | ✅ 7 findings (1 HIGH, 3 MEDIUM, 3 LOW) | DONE |
| 02 | 02-onboarding-and-dashboard.md | 02-onboarding-and-dashboard-plan.md | ✅ 8 findings (2 HIGH, 4 MEDIUM, 2 LOW) | DONE |
| 03 | 03-brand-management.md | 03-brand-management-plan.md | ✅ 10 findings (4 HIGH, 4 MEDIUM, 2 LOW) | DONE |
| 04 | 04-account-and-stripe-billing.md | 04-account-and-stripe-billing-plan.md | ✅ 7 findings (3 MEDIUM, 4 LOW) | DONE |
| 05 | 05-brand-kit-and-drag-drop.md | 05-brand-kit-and-drag-drop-plan.md | ✅ 4 findings (1 MEDIUM, 3 LOW) | DONE |
| 06 | 06-canvas-editor-core-chrome.md | 06-canvas-editor-core-chrome-plan.md | ✅ 5 findings (2 MEDIUM, 3 LOW) | DONE |
| 07a | 07a-canvas-engine-core-renderer.md | 07a-canvas-engine-core-renderer-plan.md | ✅ 4 findings (4 LOW) | DONE |
| 07b | 07b-canvas-engine-inspector-overlays.md | 07b-canvas-engine-inspector-overlays-plan.md | ✅ 5 findings (1 MEDIUM, 4 LOW) | DONE |
| 08 | 08-canvas-menus-popovers-shortcuts.md | 08-canvas-menus-popovers-shortcuts-plan.md | ✅ 6 findings (3 CRITICAL, 2 MEDIUM, 1 LOW) | DONE |
| 09 | 09-version-history-and-trash.md | 09-version-history-and-trash-plan.md | ⏳ STOPPED MID-AUDIT | IN-PROGRESS |
| 10 | 10-ai-chat-and-memory.md | 10-ai-chat-and-memory-plan.md | ❌ NOT STARTED | PENDING |
| 11 | 11-shared-ui-infrastructure.md | 11-shared-ui-infrastructure-plan.md | ❌ NOT STARTED | PENDING |
| 12 | 12-settings-and-user-preferences.md | 12-settings-and-user-preferences-plan.md | ❌ NOT STARTED | PENDING |

**Cross-cluster lenses (run AFTER all pairs done):**
- ❌ Lens A: Dependency graph integrity
- ❌ Lens B: Shared resource ownership (audit_log, idempotency_keys, EmailShell, etc.)
- ❌ Lens C: Env var consistency
- ❌ Lens D: RLS policy stack consistency

**Final report write:** ❌ NOT STARTED

---

## Context already absorbed (do NOT re-read at resume)

- `00g-CMDK_KILL_DISPATCH.md` — Cmd+K fully dropped MVP per 2026-05-17
- `00f-B12_REVERSAL_DISPATCH.md` — B12 archived Brands page promoted MVP
- `00-PRD_SCOPE_PLAN.md` lines 1-851 — full scope plan + 12 cluster summaries + 6 cross-cuts table + §5.6 ratifications
- PRDs 01-08 fully read (all sections)
- PRD 09 — read §0 + §1 + §2 + §3 + §4.1 partial (migration SQL through line 400)
- Plans 01-08 fully read or systematically sampled
- Plan 09 — task headers list + Task 21 sampled (lines 2547-2632)

**Frozen founder decisions (locked, do NOT challenge):**
- B12 Brands page MVP scope; restore_brand REAL; segmented filter; Import dropped
- Cmd+K palette DROPPED entirely; per-surface shortcuts survive
- All §12 RESOLVED entries inside each PRD locked
- Sentry / Resend / Vercel Cron deferred to pre-launch (stub-guard OK)
- 07a Measurement = page-level anchored (NOT a NodeType)
- audit_log + idempotency_keys owned by Cluster 11
- Vite SPA only — no Nuxt
- Image export only — no HTML export
- User → Brand (1:1 Shopify shop) → Canvases; no workspace layer

---

## Audit lens checklist (13 pairwise + 4 cross-cluster)

**Pairwise** — apply to each pair:
- L1: Every PRD §2 in-scope item has plan task
- L2: Every PRD §3 surface has plan impl + test
- L3: Every PRD §6 component/composable/store has build task at SAME path
- L4: Every PRD §9 RPC / Edge Function has SQL DDL + body + tests + consumer integration
- L5: Every PRD §8 acceptance criterion has a corresponding test
- L6: Deferred-Phase-2 items NOT in plan
- L7: Plan tasks trace back to PRD section
- L8: Cross-cluster dependency reconciliation
- L9: §12 RESOLVED entries reflected in plan
- L10: Hi-fi citations match between PRD and plan
- L11: Status/version sync between PRD §0 and plan §0
- L12: Feature-flag wiring (declared + UI gated + tests)
- L13: Test taxonomy (counts/names match acceptance phrasing)

**Cross-cluster** (after all pairs):
- A: Dependency graph acyclic + Wave-ordered
- B: Shared resource ownership (one owner per shared table/RPC/composable)
- C: Env var consistency (server-only vs VITE_)
- D: RLS policy stack consistency

---

## Findings accumulated so far

### Pair 01 — Auth & Identity

Coverage: 13 PRD routes ↔ Plan Tasks 17-20 (11 view components). Schema (Task 1), 4 Edge Functions (Tasks 3-7), 5 cron steps (Task 6a-e), 6 composables (Tasks 10-12), 11 components (Tasks 14-16), 4 emails (Task 21), legal docs (Task 22).

Findings:
- **HIGH-01.1** — Audit-log writes missing across all PRD-spec'd locations:
  - PRD 01 §5.1.1 lines 350-353 "Inserts audit-log row into public.audit_log (cluster 11 ships table)" — Plan Task 3.3 implementation writes no audit_log row.
  - PRD 01 §5.1.2 line 378 "inserts audit-log row 'account_restored'" — Plan Task 4.3 writes no audit_log row.
  - PRD 01 §5.1.3 line 401 "Inserts audit-log row 'email_change_requested'" — Plan Task 5.3 writes no audit_log row.
  - PRD 01 §5.1.4.5 line 545 "Insert audit-log row 'account_hard_deleted'" — Plan db-step (Task 6e) unchecked, but grep `audit_log` in plan returns ZERO hits — gap confirmed.
- **MEDIUM-01.2** — Plan Task 7 cron orchestrator calls `claim_pending_deletion_users` RPC (line 1707) never defined in any migration. Fallback inline SQL with PostgREST `gdpr_deletion_queue!inner(status)` embedded filter is fragile.
- **MEDIUM-01.3** — Plan never uses Cluster 11 `idempotency_keys` table for Edge Function dedup. PRD 01 §5.1 line 332 says "server checks `idempotency_keys` table (Cluster 11 creates) and short-circuits on dup" — Plan Tasks 3/4/5 only pass X-Idempotency-Key header through to Resend.
- **MEDIUM-01.4** — Plan email templates (Task 21) use inline HTML, do NOT compose Cluster 11 `<EmailShell>` per PRD §5.4.2 line 622.
- **LOW-01.5** — PRD §8.7 "users.deleted_at cannot be mutated by client-side authenticated request (RLS test)" → PRD §9.2 lists `rls-users-deleted-at.test.ts` but plan Task 1 only has `rls-gdpr-queue.test.ts`-equivalent. Missing test file.
- **LOW-01.6** — Plan Task 16 DangerZoneCard ships inline modal shell instead of Cluster 11 `<KovaModal>` (PRD §6.4.2 line 821). Plan acknowledges follow-up but no task to swap.
- **LOW-01.7** — Supabase Auth config (Task 23) doesn't explicitly set `EMAIL_CHANGE_LINK_TTL_HOURS=24` (PRD §5.4.1 line 600 / §10 flag list).

### Pair 02 — Onboarding & Dashboard

Coverage: 41 plan tasks (T01-T41). Migration T01. Security launch-blocker T02-T03. State foundations T04-T06. Composables T07-T11. Routes T12. Onboarding wizard T13-T17. Dashboard chrome T18-T22. Composer + file grid T23-T29. Polish T30-T32. Views T33-T35. Coming-soon T36-T37. Tests T38-T40. Manual QA T41.

Findings:
- **HIGH-02.1** — Wizard sub-routes specified in PRD §3.1 / §8.1 (`/onboarding/brand`, `/onboarding/shopify`, `/onboarding/brand-kit`, `/onboarding/done`) are NOT registered in PRD §6.1 routes block (only `/onboarding` and legacy `/onboarding/store-type`). Plan T12 inserts §6.1 verbatim. Acceptance bullet §8.1 ("User with no brands lands at `/onboarding/brand`") fails — no such route. PRD-internal inconsistency that the plan inherits.
- **HIGH-02.2** — Plan T13 BrandIdentityStep imports `inject('onboardingState')` from `useOnboardingState` (M9-era composable) while Plan T11 creates new `useOnboarding` composable. T17 wires `useOnboarding` to OnboardingView but T13 injects a different identifier. Composable name + provide/inject contract mismatch will break runtime.
- **MEDIUM-02.3** — Plan T31 OfflineIndicator uses raw `navigator.onLine` directly instead of Cluster 11 `useOfflineState` (which PRD §6.3 line 586 + §3.7 line 200 says combines `navigator.onLine` + Supabase Realtime channel state). PRD §8.7 acceptance bullet ("When `navigator.onLine === true` AND Supabase Realtime channel state = SUBSCRIBED") fails — Realtime check is not implemented.
- **MEDIUM-02.4** — PRD §12.10 marks BrandNameStep/BrandUrlStep/NameStep consolidation as OPEN with "ESCALATE: founder — confirm consolidation OK (impacts existing tests + onboarding analytics)". Plan T13 proceeds with consolidation + `git rm` without founder gate; PRD itself unresolved.
- **MEDIUM-02.5** — Plan T13 file-structure header lists `ExtractionStep.vue` for deletion ("deleted in T13") but T13 implementation only `git rm`s BrandNameStep + BrandUrlStep + NameStep — not ExtractionStep. PRD §6.4.2 retires ExtractionStep but plan never executes that step.
- **MEDIUM-02.6** — PRD §2.1 onboarding step 3 "Cluster 05 owns the extract" — Plan T15 BrandKitStep ships, but no task wires payload-enqueue to Cluster 05's `brand_kit_extract_queue` per PRD §12.5 mitigation. Plan assumes Cluster 05 ships first; no queue stub task.
- **LOW-02.7** — Plan T17 refactors OnboardingView to host new wizard but does not retire `WelcomeStep`/`ReviewStep` per PRD §6.4.2. Decision deferred to implementation time.
- **LOW-02.8** — PRD §6.2.1 says `useBrandsStore.selectedBrandId` and `useUIStateStore.lastActiveBrandId` "are the same key — one underlying useLocalStorage ref shared via composition". Plan T04 + T05 implement two separate `useLocalStorage` instances both with key `'kova:ui:last-brand'`. Architectural drift; not the "one ref" PRD specifies.

### Pair 03 — Brand Management

Coverage: 41 tasks (Task 1-41). Migration + 7 RPCs (Task 1-7). RLS verification (T8). Validators + sweep + writeAudit (T9-T10). Edge Functions T11-T14. Pinia + composables T15-T20. Adapters T21. Modals T22-T27. Cards/views T28-T34. Wiring T35-T37. E2E T38. Manual T39. Status T40-T41.

Findings:
- **HIGH-03.1** — Plan addendum (lines 21-31) declares 8 added tasks (6.5, 7.5, 10.5, 13.5, 26.5, 33.5, 33.6, 33.7, 33.8) as "must execute" but only 2 (6.5, 7.5) are patched into Tasks 6/7. Six required components/endpoints have NO standalone task body: Task 13.5 `POST /api/brands/restore` Edge Function, Task 10.5 `writeAudit()` helper (referenced in code but no creation task), Task 26.5 `<RestoreBrandModal>` (B12.3), Task 33.5 `<BrandsArchivedFilter>`, Task 33.6 `<BrandsSegmentedControl>`, Task 33.7 `<BrandsAccountView>`, Task 33.8 `<NotShippedYet>` adapter + /account/coming-soon route. Plan jumps Task 14→15, 26→27, 33→34 with no 13.5/26.5/33.x.
- **HIGH-03.2** — Plan file structure (lines 71-77) lists 4 Edge Function files (create.ts/rename.ts/archive.ts/delete.ts). Missing `api/brands/restore.ts`. PRD §5.1 explicitly says "5 Edge Functions". Plan §0 architecture line 7 says "calling 5 Vercel Function Edge endpoints" — count mismatch with file structure.
- **HIGH-03.3** — Plan file structure CRUD modal block (lines 109-115) missing `RestoreBrandModal.vue`, `BrandsArchivedFilter.vue`, `BrandsSegmentedControl.vue`, `BrandsAccountView.vue`. All four required by PRD §6.4 table. Plan Task 30 imports `<BrandsArchivedFilter>` and `<RestoreBrandModal>` (lines 3040, 3043) and Task 34 router config imports `BrandsAccountView` (line 3588) — none have creation tasks, runtime import errors at compile time.
- **HIGH-03.4** — Plan Task 18 `restoreBrand` action calls `POST /api/brands/restore` (line 1830) but that Edge Function is never built by any plan task. Action will hit 404 in dev.
- **MEDIUM-03.5** — Plan Task 21 (Cluster-11 adapter shims) lists 4 adapters (KovaModal, TypedConfirmField, use-toast, use-confirm). Addendum line 44 requires "extend with `<NotShippedYet>` shim". Not added; route at line 3596 references `NotShippedYetAdapter.vue` that no task creates.
- **MEDIUM-03.6** — `writeAudit()` helper code defined in PRD §5.1 (lines 340-381) but plan never creates `api/_shared/audit.ts` file. References in Tasks 13/14 implementations would fail to import.
- **MEDIUM-03.7** — Plan Task 7 implements `list_active_brands` and `list_archived_brands` (patched per addendum 7.5). PRD §5.2 lists 7 RPCs total — plan correctly implements all 7. Acceptance §8.7 says "All 6 RPCs error-codes documented" (off by one — should be 7 after restore_brand promotion). Mild PRD inconsistency.
- **MEDIUM-03.8** — PRD §3.1 acceptance §8.1 specifies Sort dropdown options "Last edited / Name" with localStorage persistence — Plan Task 30 BrandPickerView renders Sort button (line 3131-3136) as static markup with no v-model, no state, no localStorage persistence. Acceptance §8.1 (Sort dropdown reorders the grid) fails.
- **LOW-03.9** — PRD §8.7 acceptance "Edge Functions accept `Idempotency-Key` header and return cached response on replay" — Plan Edge Function tasks (Tasks 11-14) do NOT implement `idempotency_keys` lookup. Idempotent replay path missing.
- **LOW-03.10** — PRD §8.7 acceptance "every RPC re-enforces `user_id = auth.uid()` inside the function body" — Plan RPC bodies (Tasks 4-7) do check `auth.uid()` for `not_authenticated` but `rename_brand` / `archive_brand` / `restore_brand` rely on `WHERE id = ... AND user_id = v_user_id` in the UPDATE. Plan Task 8 RLS verification doesn't explicitly assert this defense-in-depth.

### Pair 04 — Account & Stripe Billing

Coverage: 17 phases / ~50 sub-tasks. Migration (Phase 1: Task 1.1-1.5). Stripe SDK + price map + audit log (Phase 2: Tasks 2.1-2.4). 6 Edge Functions + 6 webhook handlers (Phase 3: Tasks 3.1-3.7). Avatar (Phase 4: Tasks 4.1-4.2). Stores + composables (Phases 5-6: Tasks 5.1-5.2, 6.1-6.5). Components (Phases 7-9: Tasks 7.1-7.5, 8.1, 9.1-9.2). Brand-Kit shell (Phase 10). Integrations refactor (Phase 11: Tasks 11.1-11.9). Danger + Stripe returns (Phase 12: Tasks 12.1-12.2). Routes (Phase 13: Tasks 13.1-13.3). Compliance + Resend (Phase 14: Tasks 14.1-14.4). Tests + CI (Phase 15). Deploy + Stripe live (Phases 16-17).

Findings:
- **MEDIUM-04.1** — Plan Task 14.4 email templates are standalone HTML, NOT extending `<EmailShell>` per PRD §5.4.3 line 760 ("All templates extend `<EmailShell>` (Cluster 11)"). Each `.html` file is self-contained with no `{% extends %}` or include syntax. Plan must clarify whether Cluster 11 wraps at send-time or templates need re-architecting.
- **MEDIUM-04.2** — PRD §3.7 + §11 specify B10.1/B10.2 reuse Cluster 01 `<AuthMedal>` + `<AuthIcon>`. Plan Task 12.2 `<StripeReturnLanding>` test + implementation steps don't mention importing those Cluster 01 components — falls under "implement per PRD" hand-wave.
- **MEDIUM-04.3** — PRD §3.4 + §6.4.1 specify Brand Kit shell mounts Cluster 05 sub-tab content. Plan Task 10.1 wires `<Skeleton>` placeholder but no integration with `<router-view>` for `?tab=:tab` sub-route as PRD specifies. Tab content slot rendering strategy thin.
- **LOW-04.4** — Plan Tasks 11.4 (SyncProgressBar), 11.5 (ShopifyConnectForm), 11.6 (IntegrationCard), 11.7 (SyncHistoryAccordion), 11.8 (IntegrationsSection) all collapse to "TDD per pattern" stub bodies — no detailed test cases for each. PRD §6.4.5 specifies 8 concrete transforms — plan tasks don't enumerate them as test assertions.
- **LOW-04.5** — PRD §8.8 acceptance "All 6 webhook event handlers update users row correctly (covered by integration tests in 9.2)" — Plan Task 3.7 references end-to-end test scenarios but doesn't enumerate all 6 handler integration tests against local Supabase.
- **LOW-04.6** — PRD §11.1 hygiene rule "`access_token`-in-URL launch-blocker N/A in this PRD (Cluster 02 owns onboarding OAuth flow)". Plan correctly doesn't address — but Plan does refactor M9 IntegrationsCard (Task 11.6). If that file historically used access_token-in-URL, plan should verify post-refactor. Plan Task 15.2 grep gate is for theme drift only.
- **LOW-04.7** — PRD §5.1.1 Checkout endpoint: server validates `price_id` against `STRIPE_PRICE_ID_SOLO` / `STRIPE_PRICE_ID_AGENCY`. Plan Task 3.1 doesn't show env-var-based whitelist; uses inline values via Task 2.3 price map. Acceptable but plan should cite the constants source.

### Pair 05 — Brand Kit & Drag-Drop

Coverage: 32 tasks. Schema + 11 RPCs (Tasks 1-4). RLS + Storage (Tasks 5-6). Types (Task 7). 3 Pinia stores + drag composable + voice-draft composable (Tasks 8-12). File-type sniff (Task 13). 7 Edge Functions (Tasks 14-17). Router + 7 tab components (Tasks 18-27). Voice-draft guardrail modal (Task 20). Integration + E2E + smoke (Tasks 28-30). Quality gates + PR (Tasks 31-32).

Findings:
- **MEDIUM-05.1** — Plan Tasks 21-27 (7 per-tab components) compress into a single block of one-line per-tab descriptions; lacks per-component TDD test bodies that earlier tasks include. PRD §3.2-§3.8 + §6.4 detail each tab with specific surfaces; plan defers each to "follow same TDD cycle" stub. Limits test rigor for biggest user-facing surface area.
- **LOW-05.2** — Plan Task 21 mentions `BrandColorAddTile` "opens color picker popover" but the color picker is owned by Cluster 07b (canvas-side) — plan doesn't reference Cluster 07b dependency or what fallback the brand-kit color picker uses. PRD §3.2 also light on this detail.
- **LOW-05.3** — Plan Task 12 confirm Edge Function requires X-Idempotency-Key per PRD §5.1.6. Plan correctly generates `crypto.randomUUID()` ✓ but Edge Function implementation body not shown (only tests).
- **LOW-05.4** — PRD §5.1.5 brand-kit-extract endpoint specifies "1 req/hour/brand" rate-limit. Plan Task 17 implementation doesn't show the rate-limit guard. Mentions "Existing M9 rate-limit pattern" but doesn't add it.

### Pair 06 — Canvas Editor Core Chrome

Coverage: 23 tasks. Types (T1). Stores: editor extension, right-panel, tool-registry (T2-T4). Composables: page-ops, layer-tree, inspector-router, right-panel-tab, canvas-drop receivers (T4b-T8). Components: TopChrome (T9), BottomToolbar (T10), LeftPanel + 3 sections (T11), ShopPanel rework (T12), product-variant deletions (T13), EditorView refactor (T14), RightPanel + tabs (T15), CanvasOverlayHost + ZoomHud (T16). Routes (T17). Integration + E2E (T18-T20). Manual smoke + gates + PR (T21-T23).

Findings:
- **MEDIUM-06.1** — PRD §6.2 specifies `useEditorStore.showUI` becomes 3-state enum `'hidden' | 'minimized' | 'full'` (per §2.1 row 5). Plan Task 2 implements but may break existing toggle handlers.
- **MEDIUM-06.2** — PRD §6.5 acceptance §8.10 line "Drop with invalid payload (valibot validation fails) → silently aborted + console warn (no app crash)" — Plan Task 8 does cover valibot but plan doesn't test the crash-resistance path explicitly.
- **LOW-06.3** — Plan Task 11 LeftPanel mounts `<ShopPanel>` correctly as third section, but PRD §3.4 also requires "user can resize section heights via drag handles between sections" — Plan doesn't include resize handles between sections.
- **LOW-06.4** — Plan Task 9 includes `MissingFontsPill.vue` but no specific test cited for the pill mount (only tests TopChromeActions for Comments hidden). PRD §3.8 + §8.2 specs MissingFontsPill behavior.
- **LOW-06.5** — Plan Task 14 EditorView refactor template doesn't show MissingFontsPill in topbar (per PRD §3.8). MissingFontsPill must mount somewhere — likely inside TopChrome — but Task 9 implementation steps don't show its anchor.

### Pair 07a — Canvas Engine Core Renderer

Coverage: 13 tasks + Final gates. NodeType extension SLICE only (T1). Measurement system Figma-aligned (T1b). SceneNode fields (T2). CharacterStyleOverride extension (T3). scaleNode (T4). createSlice + addMeasurement + arrowStub (T5). Registry (T6). figma-api-proxy (T7). Kiwi schema v2.0.0 (T8). Renderer mask compositing (T9). CLAUDE.md amendment (T10). CHANGELOG-KOVA.md (T11). Integration + E2E (T12-T13). Final gates (TF).

Findings:
- **LOW-07a.1** — PRD §7.1b specifies `SceneGraphEvents` emits `measurement:broken` (on anchor-delete) and `measurement:dropped` (on cross-canvas move) events. Plan Task 1b mentions instrumenting `removeNode` + `reparent` for these events but doesn't show explicit test cases for event emission.
- **LOW-07a.2** — PRD §2.3 "Mask compositing optimization" deferred ("naive saveLayer-per-mask is correct for the MVP scale (50–300 nodes per Q3 #13 perf budget)"). Plan doesn't include perf benchmark task or budget guard for mask compositing on that node count.
- **LOW-07a.3** — Plan Task 8 Kiwi schema bump from 1.x → 2.0.0 (major version). Plan Cluster 09 (Version History) PRD requires `format_version int` column on `canvas_snapshots` per §11 cross-cuts; plan 07a doesn't have a task to coordinate that schema landing with Cluster 09.
- **LOW-07a.4** — PRD §2.4 specifies Cluster 11 owns `node:errored` event payload from this PRD. Plan doesn't include adding the event surface or its payload type definition.

### Pair 07b — Canvas Engine Inspector + Overlays

Coverage: 60+ tasks across 8 phases. Constants + gates (T0.1). Stores: clipboard, eyedropper, find, editor extension (T1.1-1.7). Composables: eyedropper, slice-tool, measurement-tool, export-pipeline, copy-paste-props, find-search, camera-pan (T2.1-2.14). Inspector components: VerticalText, StrokeAlign, JpgQuality, BooleanOps, GradientStops, PaintEditor, ImageFillPicker, EffectRow, EffectEditor, MultipleFills (T3.1-3.10). Overlays: CanvasOverlayLayer, FrameOutlines, MaskOutlines, SliceRegion, grouped 6 overlays, SearchPanel, SearchResultRow, EditorView mount (T4.1-4.14). Inspector section extensions (T5.1-5.6). use-canvas-drop + overlay mount (T6.1-6.2). Shortcut registration (T7.1). Integration tests (T8.1+).

Findings:
- **MEDIUM-07b.1** — Plan Task 4.5-4.10 groups 7 overlays (PixelGrid, LayoutGuides, HoverContour, SnapIndicators, FindHighlight, EyedropperCrosshair, MeasurementAnnotations) into single task body with no per-overlay TDD breakdown. PRD §2.1 + §3.3 specs each overlay with distinct hi-fi reference, z-index, and visual chrome. Loses test rigor for 7 of 11 overlays.
- **LOW-07b.2** — Plan Task 3.4 BooleanOpsRow needs disabled-state when selection <2 per PRD §12.10. Need verify in implementation.
- **LOW-07b.3** — PRD §2.1 specifies 4 gradient types: Linear / Radial / Angular / Diamond (founder decision §12.5 — "all 4 gradient types"). Plan Task 3.6 PaintEditor must implement all 4; need verify.
- **LOW-07b.4** — PRD §6.2.2 useClipboardStore actions copy/paste full property set per Q23 (overrides Figma stroke-partial). Plan Task 1.1/1.2 covers; but the actual paste handler for `pasteProps(targetNodeIds)` must skip incompatible fields (e.g., textAlignVertical on RECTANGLE). Plan doesn't explicitly enumerate this skip-logic test case.
- **LOW-07b.5** — PRD §2.1 "Eyedropper canvas-only MVP per Q20; Phase 2 = macOS Tauri screen-wide" — Plan Task 2.1-2.2 implements canvas-only ✓ but no feature-flag gate for Phase 2 screen-wide future expansion.

### Pair 08 — Canvas Menus Popovers Shortcuts

Coverage: 9 phases / phase-table format. 3 stores (T1.1-1.3). 7 composables (T2.1-2.7). Menu primitives + 12 menu components (T3.1-3.3). Context menu shell + 9 trigger surfaces (T4.1-4.9). Find overlay + canvas extension (T5.1-5.7). Shortcuts dialog (T6.1-6.6). Cross-cuts integration (T7.1-7.8). Acceptance + QA (T8.1-8.10). Commit + PR (T9.1-9.5).

Findings:
- **CRITICAL-08.1** — Cross-cluster store ownership conflict on `useFindStore` + `src/stores/find.ts`: Both Plan 07b (Task 1.6/1.7) and Plan 08 (Task 1.3) create `src/stores/find.ts` and define `useFindStore`. PRD 07b §12.12 founder ratification 2026-05-17 says "full find canvas-focus mode owned by 07b" — implies sole ownership. PRD 08 still ships its own version at §6.2.3. Engineer would discover file conflict at integration. Either Plan 08 drops its find feature (canvas-focus mode in 07b is more recent decision), or rename Plan 08's store to `useTopFindStore` with separate path.
- **CRITICAL-08.2** — Component conflict on `FindOverlay.vue`: PRD 07b §2.1 lists `FindOverlay.vue` (composes DimLayerOverlay + clickthrough handler in canvas-focus mode). PRD 08 §6.4.3 references `<FindOverlay>` (top-center search bar with prev/next). Same component name, different feature. Resolve ownership.
- **CRITICAL-08.3** — Cross-cluster ownership conflict on `Cmd+F` shortcut: Plan 07b Task 7.1 registers `find.open` for `cmd+f`. Plan 08 Task 5.2 also registers `⌘F` to open its FindOverlay. Same shortcut bound to two different actions — runtime ambiguity which fires.
- **MEDIUM-08.4** — Plan 08 uses phase-table format (3-column row-per-task) instead of full TDD walkthrough per task. PRD 08 has 30+ components/composables. Less rigorous than other plans; easier to drift at implementation.
- **MEDIUM-08.5** — Plan 08 Task 2.6 `use-keyboard.ts` refactor is highest-risk task with 8 sub-steps but per-step test coverage compressed. PRD §6.1 requires every existing shortcut still works post-refactor; plan mentions pre/post audit but no incremental TDD per shortcut category.
- **LOW-08.6** — Plan 08 Task 7.7c mentions Cluster 12 schema seed update for `users.preferences.view.*` defaults but doesn't reference the actual file path or migration. Cluster 12 plan must coordinate; PRD 08 should cite migration ID.

---

## Resume instructions for next Claude session

After context compact, user will hand back this doc + ask to continue QA-C audit.

**Where to start:**
1. Read this entire doc to absorb state.
2. Read dispatch instructions: `kova-open-pencil-1/docs/kova-final-qa/QA-C-prd-plan-reconciliation.md`.
3. Resume at **Pair 09** — finish what was started.
4. Then walk Pairs 10, 11, 12.
5. Then 4 cross-cluster lenses.
6. Then write final report at `kova-open-pencil-1/docs/kova-final-qa/findings/QA-C-findings.md`.

**Pair 09 state when stopped:**
- PRD 09 read through line 400 (migration SQL section). Need finish: §5 Backend, §6 Frontend, §7 Engine, §8 Acceptance, §9 Test plan, §11 Cross-cuts, §12 Risks, §13 References.
- Plan 09 task headers listed (Tasks 1-25). Task 21 (Cluster 06 right-panel mount) sampled. Need walk remaining tasks.
- Key things to verify in remaining read:
  - Snapshot RPCs match between PRD §4 and Plan Tasks 2-5
  - useSnapshotsStore + useAutosnapshot vs PRD §6.2
  - Trash modal cross-cut Cluster 02 wiring (Task 22)
  - format_version coordination with Cluster 07a (cross-cluster Lens B)
  - retention_class Stripe webhook hook from Cluster 04 (Lens B)
  - Snapshot Storage path layout vs Cluster 01 GDPR cron consumer

**Pairs 10/11/12 — fresh start:**
- 10 = AI Chat & Memory. Look for: chat data model, brand_memories, voice_drafts cross-cut to Cluster 05, AI tool registry, Anthropic env var, M5 reuse.
- 11 = Shared UI Infrastructure. Look for: audit_log table (cross-cluster owner), idempotency_keys, useToast, useConfirm, <EmailShell>, NetworkStatusIndicator (figma-style icon+tooltip per 2026-05-17 lock). KEY: this PRD ships the primitives every other cluster consumes.
- 12 = Settings & User Preferences. Look for: usePreferencesStore Layer 1 (server JSONB) + Layer 2 (localStorage), users.preferences JSONB column (lands in Cluster 01 migration), Settings page modal, accessibility prefs, view.* defaults locked in 2026-05-17 (pixelGrid:true, layoutGuides:true, rulers:true, frameOutlines:false, maskOutlines:false, showSlices:false, wireframeMode:false), Resend env-guarded.

**Cross-cluster lenses (Lens A/B/C/D) after pairs done:**

For Lens A (Dependency graph integrity):
- Build directed graph: each PRD/plan as node, cross-cluster deps as edges. Wave ordering per scope plan:
  - Wave 1: 01 + 11
  - Wave 2: 02 + 03
  - Wave 3: 04 + 12
  - Wave 4: 05 + 06
  - Wave 5: 07a + 07b + 08
  - Wave 6: 09 + 10
- Check no cycles. Check Wave-N PRDs don't depend on Wave-(N+1) PRDs.

For Lens B (Shared resource ownership):
- audit_log table → Cluster 11 owns. Verify only 11 ships the migration; verify 01/03/04 reference but don't ship.
- idempotency_keys table → Cluster 11 owns.
- Resend client → Cluster 01 owns. Other PRDs use the same wrapper.
- <EmailShell> → Cluster 11 owns. PRD 01 + 04 templates extend.
- useToast → Cluster 11 owns.
- useConfirm → Cluster 11 owns.
- <KovaModal> → Cluster 11 owns.
- useFindStore → CONFLICT (CRITICAL-08.1).
- FindOverlay.vue → CONFLICT (CRITICAL-08.2).
- gdpr_deletion_queue → Cluster 01 owns.
- canvas_snapshots → Cluster 09 owns.
- stripe_webhook_events → Cluster 04 owns.
- shopify_connection_history → Cluster 04 owns.
- brand_fonts / brand_kb_sources / voice_drafts → Cluster 05 owns.
- useBrandsStore → Cluster 03 owns.
- useBrandKitStore → Cluster 05 owns.
- useChatStore / useChatProductReferencesStore → Cluster 10 owns.
- useShortcutsStore → Cluster 08 owns. PRD 07b registers.

For Lens C (Env var consistency):
- `STRIPE_SECRET_KEY` (server-only) — Cluster 04
- `STRIPE_WEBHOOK_SECRET` (server-only) — Cluster 04
- `VITE_STRIPE_PUBLISHABLE_KEY` (client) — Cluster 04
- `STRIPE_PRICE_ID_SOLO` / `_AGENCY` (server-only) — Cluster 04
- `RESEND_API_KEY` (server-only) — Cluster 01 ships dep, Cluster 04 + 09 + 11 use
- `RESEND_FROM` (server-only) — Cluster 01
- `ANTHROPIC_API_KEY` (server-only, NEVER VITE_) — Cluster 10
- `SUPABASE_SERVICE_ROLE_KEY` (server-only) — global
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client) — global
- `CRON_SECRET` (server-only) — Cluster 01 + Cluster 04
- `SENTRY_DSN_SERVER` (server-only) — Cluster 11
- `VITE_SENTRY_DSN_BROWSER` (client) — Cluster 11
- `PUBLIC_APP_URL` (mentioned in Plan 01 Task 3) — verify if VITE_ prefix or server-side default
- Grep all plans for VITE_STRIPE_SECRET, VITE_ANTHROPIC, VITE_SUPABASE_SERVICE — should be zero.

For Lens D (RLS policy stack consistency):
- `users` table — RLS owned by 01 (extends 20260316_users.sql baseline). 04 adds columns but no policies (inherits). 12 reads `users.preferences` JSONB.
- `brands` table — RLS owned by 03 (extends m2_dashboard baseline). Other clusters read via SELECT scoped by user_id.
- `canvases` table — RLS owned by 02 (extends m2_dashboard). Same.
- `canvas_snapshots` — Cluster 09 owns. 4 RLS policies (select-own + 3 blocked).
- `gdpr_deletion_queue` — Cluster 01 owns. service_role-only.
- `stripe_webhook_events` — Cluster 04. service_role-only.
- `shopify_connection_history` — Cluster 04. select-own + insert-service.
- `brand_fonts` / `brand_kb_sources` / `voice_drafts` — Cluster 05.
- `audit_log` / `idempotency_keys` — Cluster 11.
- Check: no two clusters add overlapping policies on same table.

**Final report write at end:**
- Output path: `kova-open-pencil-1/docs/kova-final-qa/findings/QA-C-findings.md`
- Format per dispatch (lines 167-232 of QA-C-prd-plan-reconciliation.md):
  - Header: auditor, pairs reviewed=12, date
  - Summary: severity counts
  - Per-pair coverage matrix (12 tables — for each, walk PRD sections + assert plan task coverage)
  - Cross-cluster matrix (dependency graph + shared-resource ownership table)
  - Numbered findings (CRITICAL-N, HIGH-N, MEDIUM-N, LOW-N, NOTE-N) with: lens, pair/PRDs, files+line nums, gap description, evidence quotes, severity rationale, recommended fix
  - Cross-pair observations (patterns)
- Target length: 800-4000 lines.
- Severity counts as of now:
  - CRITICAL: 3 (all in pair 08, find-feature conflicts)
  - HIGH: 7 (1 pair 01, 2 pair 02, 4 pair 03)
  - MEDIUM: 16
  - LOW: 27
  - NOTE (locked): 0 (none found yet — frozen decisions weren't challenged)
- Add pairs 09/10/11/12 + cross-cluster findings before final write.

**Tooling reminders:**
- Read big files with offset/limit, max ~400 lines/call.
- Many PRDs are 1000-1600 lines; plans 2000-4500 lines.
- Use `grep -n "^## Task\|^### Task"` to get plan task headers quickly.
- Use `grep -n` to find cross-references (audit_log, useFindStore, idempotency_keys, etc).
- Task IDs are in TaskList (16 tasks set up at start of audit).

---

## Notes file path

Working notes scratchpad lives at `/Users/jihoyang/.claude/jobs/f7449172/qa-c-notes.md` — same content as findings section above. This `QA-C-WIP-state.md` is the durable resume marker.
