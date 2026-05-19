# QA-C — PRD↔Plan Reconciliation Findings

**Auditor:** Claude Opus 4.7 · 2026-05-18
**Pairs reviewed:** 12
**Mode:** READ-ONLY (no edits to PRDs/plans/code; no commits; no subagents).
**Corpus:** 24 docs (12 PRDs + 12 plans) totaling ~60,000 lines.

---

## Summary

| Severity | Count | Notes |
|---|---|---|
| **CRITICAL** | 4 | 3 in pair 08 (find-feature ownership conflict, runs runtime ambiguous) + 1 cross-cluster (`audit_log` table has no owner shipping the migration). |
| **HIGH** | 15 | Cross-cluster name drift, missing components, schema-vs-plan path mismatches, founder-lock divergence. |
| **MEDIUM** | 31 | Acceptance criteria untested, founder-locked decisions not enforced in tests, magic numbers, deferred wiring, single-write-path violations. |
| **LOW** | 36 | Test-rigor compression, environment guards, secondary verification gaps, mild PRD/plan drift, missing CI greps. |
| **NOTE (locked)** | 0 | No frozen founder decisions challenged. |

**Verdict:** Pre-build reconciliation has 4 issues that **must** resolve before Wave 1 starts (the 3 find-feature ownership conflicts + the `audit_log` ownership gap). Everything else is fixable in-wave with a small amount of PRD/plan editing. None of the gaps are scope creep — every drift cuts toward "plan does less than PRD specifies" or "two plans both try to ship the same thing," never the other direction.

---

## Per-pair coverage matrix

For each pair, the matrix below walks the major PRD sections and tags each spec item with the plan task(s) that cover it. Status legend: ✅ covered; ⚠️ covered with a gap (see finding); ❌ missing.

### PRD 01 ↔ Plan 01 — Auth & Identity

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4 Schema | `users.preferences` JSONB + RLS extension | Task 1 | ✅ |
| §4 Schema | `gdpr_deletion_queue` table + RLS | Task 1 | ✅ |
| §5.1.1 | `POST /api/account/deletion-request` Edge Function | Task 3 | ⚠️ HIGH-01.1 audit_log row not written |
| §5.1.2 | `POST /api/account/deletion-restore` Edge Function | Task 4 | ⚠️ HIGH-01.1 audit_log row not written |
| §5.1.3 | `POST /api/account/email-change` Edge Function | Task 5 | ⚠️ HIGH-01.1 audit_log row not written |
| §5.1.4 | `delete-account-cron` (5 steps a-e) | Tasks 6a-e + 7 | ⚠️ MEDIUM-01.2 RPC `claim_pending_deletion_users` not defined |
| §5.2 idempotency | server checks `idempotency_keys` table | Tasks 3/4/5 | ⚠️ MEDIUM-01.3 X-Idempotency-Key header passed through only |
| §5.4 | 4 transactional email templates | Task 21 | ⚠️ MEDIUM-01.4 inline HTML; doesn't extend `<EmailShell>` |
| §6.1 routes | 13 routes (sign-in, OTP, callback, etc.) | Tasks 17-20 | ✅ |
| §6.2-6.4 components | 11 view components + 4 emails | Tasks 14-16, 21 | ⚠️ LOW-01.6 DangerZoneCard inline modal shell, not `<KovaModal>` |
| §8.7 RLS | `users.deleted_at` cannot be mutated by client | — | ❌ LOW-01.5 RLS test `rls-users-deleted-at.test.ts` not added |
| §10 flag list | `EMAIL_CHANGE_LINK_TTL_HOURS=24` | Task 23 | ❌ LOW-01.7 not explicitly set |

### PRD 02 ↔ Plan 02 — Onboarding & Dashboard

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §3.1 + §8.1 | Wizard sub-routes (`/onboarding/brand`, `/onboarding/shopify`, `/onboarding/brand-kit`, `/onboarding/done`) | — | ❌ HIGH-02.1 PRD §6.1 routes block doesn't register them; plan inherits gap |
| §6.2 composables | `useOnboarding` composable contract | Tasks 11/13/17 | ⚠️ HIGH-02.2 provide/inject identifier mismatch between Task 13 (`onboardingState`) and Task 17 (`useOnboarding`) |
| §3.7 + §6.3 | `useOfflineState` Cluster 11 reuse | Task 31 | ⚠️ MEDIUM-02.3 uses raw `navigator.onLine`, ignores Realtime channel state |
| §12.10 | BrandNameStep/BrandUrlStep/NameStep consolidation | Task 13 | ⚠️ MEDIUM-02.4 PRD marks "OPEN, ESCALATE founder"; plan proceeds without founder gate |
| §6.4.2 | `ExtractionStep.vue` retirement | Task 13 | ⚠️ MEDIUM-02.5 file-structure says deleted; impl steps don't `git rm` it |
| §2.1 onboarding step 3 | Cluster 05 brand-kit extract queue handoff | — | ❌ MEDIUM-02.6 no payload-enqueue task |
| §6.4.2 | Retire WelcomeStep + ReviewStep | Task 17 | ⚠️ LOW-02.7 retirement deferred to implementation time |
| §6.2.1 | `useBrandsStore.selectedBrandId` + `useUIStateStore.lastActiveBrandId` share one `useLocalStorage` ref | Tasks 4 + 5 | ⚠️ LOW-02.8 plan creates two separate `useLocalStorage` instances with same key |
| §3 + §6 surfaces | 41 plan tasks (T01-T41) | All | ✅ |
| §8 acceptance | All §8 bullets | Tasks 38-41 | ✅ |

### PRD 03 ↔ Plan 03 — Brand Management

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4 + §5.1 | Migration + 7 RPCs + RLS | Tasks 1-8 | ✅ |
| §5.1 | 5 Edge Functions (create/rename/archive/delete/restore) | — | ❌ HIGH-03.2 only 4 files listed; restore endpoint missing |
| §5.1 addendum | 8 "must execute" added tasks (6.5/7.5/10.5/13.5/26.5/33.5/33.6/33.7/33.8) | Tasks 6.5+7.5 only | ❌ HIGH-03.1 6 of 8 missing standalone task bodies |
| §6.4 | `<RestoreBrandModal>`, `<BrandsArchivedFilter>`, `<BrandsSegmentedControl>`, `<BrandsAccountView>` | — | ❌ HIGH-03.3 all 4 missing from plan file structure; Task 30 + 34 import them anyway → compile errors |
| §5.1 restore endpoint | `POST /api/brands/restore` consumer | Task 18 | ⚠️ HIGH-03.4 `restoreBrand` action calls 404'd endpoint |
| §6 adapters | `<NotShippedYet>` adapter shim | — | ❌ MEDIUM-03.5 not added; Task 30 route refs `NotShippedYetAdapter.vue` |
| §5.1 audit | `writeAudit()` helper | — | ❌ MEDIUM-03.6 no creation task for `api/_shared/audit.ts` |
| §8.7 | RPC count = 7 (after restore_brand promotion) | — | ⚠️ MEDIUM-03.7 PRD §8.7 says "6 RPCs error-codes documented" — PRD-internal off-by-one |
| §8.1 | Sort dropdown options (Last edited / Name) with localStorage | Task 30 | ⚠️ MEDIUM-03.8 Sort button rendered as static markup (no v-model, no state, no persistence) |
| §8.7 | Edge Functions accept `Idempotency-Key` + replay cache | Tasks 11-14 | ❌ LOW-03.9 no `idempotency_keys` lookup |
| §8.7 | RPC defense-in-depth `auth.uid()` checks | Tasks 4-7 | ⚠️ LOW-03.10 relies on `WHERE id = ... AND user_id = v_user_id`; not explicitly asserted by Task 8 RLS verification |

### PRD 04 ↔ Plan 04 — Account & Stripe Billing

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4 schema | Migration | Phase 1 Tasks 1.1-1.5 | ✅ |
| §5 backend | 6 Edge Functions + 6 webhook handlers | Phase 3 Tasks 3.1-3.7 | ✅ |
| §5.4 email | All templates extend `<EmailShell>` | Task 14.4 | ⚠️ MEDIUM-04.1 standalone HTML, no `{% extends %}` or include |
| §3.7 + §11 | `<AuthMedal>` + `<AuthIcon>` reuse | Task 12.2 | ⚠️ MEDIUM-04.2 import not mentioned; hand-waved |
| §3.4 + §6.4.1 | Brand Kit shell with `?tab=` sub-route | Task 10.1 | ⚠️ MEDIUM-04.3 `<Skeleton>` placeholder; no `<router-view>` sub-route wiring |
| §6.4.5 | 8 concrete transforms for M9 integrations refactor | Tasks 11.4-11.8 | ⚠️ LOW-04.4 collapsed to "TDD per pattern" stubs; per-component test cases not enumerated |
| §8.8 | 6 webhook event handler integration tests | Task 3.7 | ⚠️ LOW-04.5 references scenarios but doesn't enumerate 6 |
| §11.1 hygiene | Verify no `access_token`-in-URL post-M9 refactor | Task 15.2 grep | ⚠️ LOW-04.6 grep gate is theme-drift only; doesn't check this |
| §5.1.1 | `price_id` server validation via env-var whitelist | Task 3.1 | ⚠️ LOW-04.7 uses inline values from Task 2.3 price map |
| Phase 13-17 | Routes, compliance, tests, deploy | Phases 13-17 | ✅ |

### PRD 05 ↔ Plan 05 — Brand Kit & Drag-Drop

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4 schema + 11 RPCs | Schema + 11 RPCs | Tasks 1-4 | ✅ |
| §5.1.5 | brand-kit-extract endpoint rate-limit (1 req/hour/brand) | Task 17 | ⚠️ LOW-05.4 rate-limit guard not shown |
| §5.1.6 | confirm Edge Function idempotency | Task 12 | ⚠️ LOW-05.3 `crypto.randomUUID()` generated; body not shown |
| §3.2-§3.8 + §6.4 | 7 per-tab components | Tasks 21-27 | ⚠️ MEDIUM-05.1 compressed into one block w/ one-line descriptions; lacks per-component TDD test bodies |
| §3.2 brand color | Color picker popover (Cluster 07b dependency) | Task 21 | ⚠️ LOW-05.2 no fallback reference; cross-cluster dependency mention thin |
| §7 tool layer | Voice draft + brand-kit pipelines | Tasks 14-17 | ✅ |
| §8 acceptance | All §8 bullets | Tasks 28-30 | ✅ |

### PRD 06 ↔ Plan 06 — Canvas Editor Core Chrome

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §6.2 + §2.1 row 5 | `useEditorStore.showUI` 3-state enum | Task 2 | ⚠️ MEDIUM-06.1 implementation may break existing toggle handlers |
| §6.5 + §8.10 | Drop with invalid payload silent abort + crash-resistance | Task 8 | ⚠️ MEDIUM-06.2 valibot validation covered; crash-resistance path not explicitly tested |
| §3.4 | Resize handles between LeftPanel sections | Task 11 | ⚠️ LOW-06.3 resize handles not included |
| §3.8 + §8.2 | `<MissingFontsPill>` mount + spec | Task 9 | ⚠️ LOW-06.4 component exists, no specific mount test |
| §3.8 | Pill anchored in topbar | Task 14 | ⚠️ LOW-06.5 anchor not shown in EditorView refactor template |
| §6 stores | useEditorStore extension + useRightPanelStore + useToolRegistry | Tasks 2-4 | ✅ |
| §6.3 composables | 5 new composables | Tasks 4b-8 | ✅ |
| §6.4 components | ~20 components | Tasks 9-16 | ✅ |
| §8 acceptance | All §8 bullets | Tasks 18-23 | ✅ |

### PRD 07a ↔ Plan 07a — Canvas Engine Core + Renderer

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §2.1 + §4 | SLICE NodeType extension only | Task 1 | ✅ |
| §2.1b | Measurement system page-level anchored (NOT NodeType) | Task 1b | ✅ |
| §7.1b events | `measurement:broken` + `measurement:dropped` event emission | Task 1b | ⚠️ LOW-07a.1 instrumentation mentioned but no explicit test cases |
| §2.3 | Mask compositing perf budget (50-300 nodes) | Task 9 | ⚠️ LOW-07a.2 no perf benchmark task or budget guard |
| §2.4 | `node:errored` event surface (Cluster 11 dep) | — | ❌ LOW-07a.4 not included; no event surface or payload type |
| §11 cross-cuts | format_version coordination with Cluster 09 | — | ❌ LOW-07a.3 no schema-bump coordination task |
| §4 Kiwi schema 2.0.0 | Schema bump | Task 8 | ✅ |
| §6 renderer | Mask compositing, scaleNode, createSlice, etc. | Tasks 4-9 | ✅ |
| §8 acceptance | All §8 bullets | Tasks 12-13 + TF | ✅ |

### PRD 07b ↔ Plan 07b — Canvas Engine Inspector + Overlays

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §2.1 + §3.3 | 11 overlays | Tasks 4.1-4.10 | ⚠️ MEDIUM-07b.1 Tasks 4.5-4.10 group 7 overlays into one task body; no per-overlay TDD |
| §6.2.2 | useClipboardStore full prop copy/paste w/ incompatible-field skip | Tasks 1.1/1.2 | ⚠️ LOW-07b.4 paste-handler skip-logic test case not enumerated |
| §2.1 + §12.5 | 4 gradient types (Linear/Radial/Angular/Diamond) | Task 3.6 | ⚠️ LOW-07b.3 needs verify all 4 implemented |
| §2.1 | Eyedropper canvas-only MVP; Phase 2 macOS Tauri | Tasks 2.1-2.2 | ⚠️ LOW-07b.5 no feature-flag gate for Phase 2 |
| §12.10 | BooleanOpsRow disabled-state when selection <2 | Task 3.4 | ⚠️ LOW-07b.2 needs verify in impl |
| §6.4 components | 10 inspector components (T3.1-3.10) | Tasks 3.1-3.10 | ✅ |
| §6.3 composables | 14 composables (T2.1-2.14) | Tasks 2.1-2.14 | ✅ |
| §8 acceptance | All §8 bullets | Tasks 8.1+ | ✅ |

### PRD 08 ↔ Plan 08 — Canvas Menus Popovers Shortcuts

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §6.2.3 | `useFindStore` at `src/stores/find.ts` | Task 1.3 | ❌ **CRITICAL-08.1** Plan 07b Task 1.6/1.7 also ships same store at same path |
| §6.4.3 | `<FindOverlay>` component | Task 5.1 | ❌ **CRITICAL-08.2** Plan 07b §2.1 also defines `FindOverlay.vue` (different feature, same name) |
| §6.1 + Task 5.2 | `Cmd+F` shortcut → opens Plan 08 FindOverlay | Task 5.2 | ❌ **CRITICAL-08.3** Plan 07b Task 7.1 also binds `cmd+f` → `find.open` (different action) |
| §6.1 | `use-keyboard.ts` refactor — every existing shortcut still works | Task 2.6 | ⚠️ MEDIUM-08.5 8 sub-steps; per-shortcut TDD compressed |
| §3 + §6 | 30+ components/composables | All | ⚠️ MEDIUM-08.4 phase-table format vs full TDD walkthrough; less rigorous |
| §7.7c | Cluster 12 `users.preferences.view.*` schema seed | Task 7.7c | ⚠️ LOW-08.6 references but doesn't cite file path or migration ID |
| §1.1-1.3 stores | 3 stores | Tasks 1.1-1.3 | ✅ |
| §2.1-2.7 composables | 7 composables | Tasks 2.1-2.7 | ✅ |
| §3.1-3.3 + §4.x menus | Menu primitives + 12 menus + 9 trigger surfaces | Tasks 3.1-3.3 + 4.1-4.9 | ✅ |
| §8 acceptance | All §8 bullets | Tasks 8.1-8.10 | ✅ |

### PRD 09 ↔ Plan 09 — Version History + Trash

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4.1 schema + 4 RPCs + Storage bucket | Migration + RPCs | Tasks 1-5 | ✅ |
| §4.3 path layout | `{user_id}/{brand_id}/{canvas_id}/{snapshot_id}.kiwi.zst` | Task 19 line 2390 | ⚠️ MEDIUM-09.5 uses `crypto.randomUUID()` filename, not snapshot_id |
| §5.1.1 step 4 + §11 | Duplicate-to-canvas writes blob to NEW canvas's INITIAL-STATE path; Cluster 02 hydrates on first open | Task 19 | ❌ HIGH-09.1 Plan uploads to snapshots path + creates snapshot row; no wiring for new canvas to hydrate from snapshot on open → duplicated canvas opens blank |
| §5.1.2 algorithm | Cron uses `FOR UPDATE SKIP LOCKED` | Task 20 | ❌ HIGH-09.2 plain `.select().eq().limit()`; no SKIP LOCKED — cron overlap risk |
| §5.1.2 step 5 + §8.3 acceptance | 7th-day Storage sweep (orphan reconcile) | Task 20 | ❌ HIGH-09.3 "Optional 7th-day sweep — out of scope for this draft"; acceptance criterion silently uncovered |
| §5.1.1 + §8.3 acceptance | Idempotency dedup (5-min window) | Task 19 | ⚠️ MEDIUM-09.4 pseudo-code comments only; `idempotency_keys` integration not implemented |
| §10 + §12.1 | `format_version` CI grep on `packages/core/codec/` changes | — | ❌ LOW-09.11 not added in Plan 09; also missing in Plan 07a |
| §10 feature flags | `SNAPSHOT_FREE_RETENTION_DAYS=30` | Task 20 line 2486 | ⚠️ MEDIUM-09.6 hardcoded `30 * 24 * 60 * 60 * 1000`; no constant import |
| §6.3 useCanvasEditLock | `lock()/unlock()/isLocked` single-owner toggle | Task 12a | ⚠️ MEDIUM-09.7 ref-counted (multi-caller) instead of single-owner boolean toggle |
| §11 cross-cut → Cluster 06 | File-menu Version-history item | — | ❌ MEDIUM-09.8 no plan task surfaces this; cross-cuts coord list misses it |
| §0 architecture | Vercel Fluid Compute runtime | Tasks 19+20 | ❌ LOW-09.9 no `export const config = { runtime: 'edge' }` |
| §11 cross-cut → Cluster 06 | CSS `:where()` pointer-events overlay | Task 21 Step 4 | ⚠️ LOW-09.10 imperative `@mousedown.capture` + `window.__spaceHeld` global hack |
| §11 cross-cut → Cluster 11 | Skeleton loading state | Task 17 | ⚠️ LOW-09.12 `loadingByCanvas` in store; no `<Skeleton>` rendered |
| §8 acceptance | All §8 bullets | Tasks 24 + 25 | ✅ |

### PRD 10 ↔ Plan 10 — AI Chat + Memory + Tool Layer

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4.1 migration | `chat_conversations.product_references` JSONB + trigger | Task 2 | ✅ |
| §6.2.3 | `useChatProductReferencesStore` | Task 4 | ⚠️ MEDIUM-10.4 dual mutation paths — Task 3's `updateProductReferences` action vs Task 4's `persistAndPatch` direct assignment |
| §6.3.2 | `formatToneSnippets` cap=10 + `formatProductReferences` cap=20 + `formatBrandMemories` cap=50 | Tasks 5, 5b, 6 | ✅ |
| §6.3.3 + §6.3.4 | 5 Shopify tools `no_connection` + drop `bestsellers` + 2 new AI wrappers | Tasks 8-11 | ✅ |
| §8.4 acceptance | Slice/Measurement tools error codes (`no_selection`, `invalid_nodes`) | Tasks 10/11 | ⚠️ LOW-10.5 Plan adds `engine_unavailable` not in PRD §8.4 acceptance |
| §11 cross-cut → Cluster 06 | `useRightPanelTabStore.setActiveTab('ai')` | Task 17 line 2394 | ❌ **HIGH-10.1** Plan 06 ships `useRightPanelStore` (not `useRightPanelTabStore`) at `src/stores/right-panel.ts` (not `…/right-panel-tab`) — name + path drift |
| §6.4.2 | Chip row position vs §3.2/§12.12 item 7 | Task 14 | ⚠️ MEDIUM-10.3 PRD §6.4.2 says "above attachment row" — contradicts §3.2 + §12.12 item 7 (chips BELOW attachments). PRD internal contradiction; Plan follows founder-lock (correct). |
| §8.1 acceptance | Design is default-active tab on canvas load | Task 16 | ⚠️ LOW-10.5 E2E doesn't verify Design default-active |
| §11.1 RoPA disclosure | Anthropic sub-processor copy fragment | Task 19 | ✅ |
| §8.5 + §8.6 | Server-side proxy + sub-processor wiring | — | ⚠️ MEDIUM-10.6 only PFC.5 verifies via test-suite; no specific acceptance verification |

### PRD 11 ↔ Plan 11 — Shared UI Infrastructure

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4.1 | `idempotency_keys` table + RLS + indexes | Task 1.1 | ✅ |
| §4.1 (per frozen decision) | `audit_log` table | — | ❌ **CRITICAL-X.1** PRD 11 itself does not declare; Plan 11 does not ship; 3 consumer plans (03/04/05) stub/duplicate. |
| §5.5 | `verifyIdempotency()` helper | Task 1.3 | ⚠️ HIGH-11.1 PRD §4.1 column comment says hash includes "sorted body keys" (JSON normalization); reference impl + plan hash raw `bodyText` → reordered-key clients get false 422s |
| §4.1 trigger | request_hash defense | Task 1.3 | ✅ |
| §6.4.2 `<EmptyState>` | Dynamic Lucide icon by name prop | Task 6.4 | ❌ **HIGH-11.2** Plan uses `<icon-lucide-:name="icon" />` — unplugin-icons doesn't support dynamic names; build will fail |
| §3.8 + §6.4.3 | `<EmailShell>` PNG wordmark from `/public/email/` | Task 8.2 | ❌ MEDIUM-11.3 hardcodes `https://kova.app/email/wordmark-light@2x.png` — fails staging/dev |
| §3.8 | `<EmailShell>` Resend template variables (`{{email}}`, `{{settings_url}}`) | Task 8.2 | ❌ MEDIUM-11.4 Vue template clash: `{{settings_url}}` interpreted as Vue expression, resolves to `undefined` |
| §10 Phase A | App shell mounts ToastStack + `<NetworkStatusIndicator>` once | Task 9.1 | ❌ MEDIUM-11.5 Task 9.1 mounts ToastStack + ConfirmModal but NOT NetworkStatusIndicator (ambiguous: PRD says App shell; §3.7 says topbar — Cluster 02 likely mounts) |
| §12.5 KD-5 | M9 Realtime channel `sync-progress-${brandId}` migration to `kova.{userId}.shopify.{brandId}.sync` | — | ⚠️ MEDIUM-11.6 no task in any plan to migrate the M9 legacy name |
| §6.4.1 | `<KovaMenu>` + `<KovaTooltip>` separate rows | Task 4.3 | ⚠️ LOW-11.7 tasks compressed into one |
| §6 composables (9) | All shipped | Tasks 2.x, 3.3, 5.2 | ✅ |
| §6 stores (2) | Toast + Confirm | Tasks 3.2, 5.1 | ✅ |
| §6 components (18) | All shipped | Tasks 3.4-3.5, 4.x, 5.2, 6.x, 7.1, 8.x | ✅ |
| §8 acceptance | All §8 bullets | Tasks 10.1-10.2, 11.x | ✅ |

### PRD 12 ↔ Plan 12 — Settings & User Preferences

| PRD section | Spec item | Plan task | Status |
|---|---|---|---|
| §4.1 RPC | `update_user_pref` SECURITY INVOKER | Task 1 | ✅ |
| §6.2.1 + Task 4 | `usePreferencesStore.set` debounced server write | Task 4 | ❌ **HIGH-12.1** PRD §6.2.1 line 361 + Plan Task 4 call `supabase.rpc('update_user_pref', { p_path, p_value: JSON.stringify(value) })` — supabase-js auto-JSON-encodes RPC args; pre-stringifying double-encodes. `textSize: 'large'` stored as `'"large"'` instead of `'large'` |
| §5.4 send-sync-alert | env-guarded Edge Function | Task 16 | ❌ HIGH-12.2 imports `../_shared/resend-client.ts` (Cluster 01 owned). PFC says "stub if Cluster 01 not landed" but Plan provides no stub task; build break if executed before Cluster 01 |
| §2.1 line 81 | 12-color FIFO ring buffer (founder-locked 2026-05-17) | Task 3 | ⚠️ MEDIUM-12.3 PRD §6.2.2 line 465 caps at 24 + line 453 comment "24-color" — internal contradiction. Plan must enforce 12 per founder-lock. |
| §5.4 | Edge Function reads `SUPABASE_URL` + `SUPABASE_ANON_KEY` | Task 16 line 2068-2070 | ⚠️ MEDIUM-12.4 reads env vars without guards; if unset, createClient crashes |
| §5.4 | Resend client `sendEmail({ idempotencyKey })` signature | Task 16 | ⚠️ LOW-12.5 cross-cluster API contract assumed; not documented in PRD 01 |
| §11 cross-cuts | Cluster 04 mounts `<AccessibilityPanel>` + `<NotificationsPanel>` | Task 14 | ⚠️ LOW-12.6 "Task 14" is only an appended handoff note to Plan 04 — not actual code |
| §6 stores | usePreferencesStore + useUIStateStore | Tasks 3, 4 | ✅ |
| §6 composables | use-preferences + usePreferencesModal + useReducedMotionDefault | Tasks 5, 8, 9 | ✅ |
| §6.4 components | AccessibilityPanel + NotificationsPanel + PreferencesModal | Tasks 10-12 | ✅ |
| §8 acceptance | All §8 bullets | Tasks 6, 15 | ✅ |

---

## Cross-cluster matrix

### Dependency graph (waves)

```
Wave 1: ┌─ 01 Auth & Identity ─────┐
        └─ 11 Shared UI Infra ─────┤
                                   │
Wave 2: ┌─ 02 Onboarding/Dashboard ┤ ← depends on 01, 11
        └─ 03 Brand Management ────┤ ← depends on 01, 11, 02 (sidebar)
                                   │
Wave 3: ┌─ 04 Account & Stripe ────┤ ← depends on 01, 03, 11
        └─ 12 Settings & Prefs ────┤ ← depends on 01 (users col), 04 (route), 11
                                   │
Wave 4: ── 05 Brand Kit ───────────┤ ← depends on 03, 04, 11
                                   │
Wave 5: ┌─ 06 Canvas Chrome ───────┤ ← depends on 02, 03, 11
        ├─ 07a Engine Core ────────┤ ← depends on packages/core/ (locked)
        ├─ 07b Engine Inspector ───┤ ← depends on 06, 07a, 11
        └─ 08 Canvas Menus ────────┤ ← depends on 06, 07b, 11, 12 (prefs)
                                   │
Wave 6: ┌─ 09 Version History ─────┤ ← depends on 01, 02, 04, 06, 07a, 08, 11
        └─ 10 AI Chat ─────────────┘ ← depends on 05, 06, 07a, 11; refs Cluster 06 store
```

**Wave-ordering integrity:** All cross-cluster edges flow earlier→later. No cycles detected. **Two concerns:**

1. **Plan 10 → Plan 06 store name drift** (HIGH-10.1 / cross-cluster). Plan 10 (Wave 6) imports `useRightPanelTabStore` from `@/stores/right-panel-tab`; Plan 06 (Wave 5) ships `useRightPanelStore` at `@/stores/right-panel`. Dependency edge is logically correct (Wave 6 depends on Wave 5) but the contract on the wire doesn't match.

2. **Plan 11 (Wave 1) does not ship `audit_log`** despite 3 downstream plans (03, 04, 05) consuming it. See CRITICAL-X.1.

### Shared-resource ownership

| Resource | Stated owner | Plan ships it? | Consumer plans | Conflicts? |
|---|---|---|---|---|
| `idempotency_keys` table | 11 | ✅ Plan 11 Task 1.1 | 01 (deletion/restore/email-change), 03 (Edge Functions, **not wired** — LOW-03.9), 04 (Stripe webhook), 09 (duplicate-to-canvas, **pseudo-code** — MEDIUM-09.4) | Plan 11 owns table; consumers fail to integrate `verifyIdempotency()` helper |
| **`audit_log` table** | 11 (per frozen decision) | ❌ **Plan 11 does NOT ship migration** | 03 (writeAudit stopgap to console+Sentry), 04 (own stub-create on first use), 05 (writes directly assuming exists) | **CRITICAL-X.1 — no canonical owner; 3 consumers diverge** |
| `gdpr_deletion_queue` table | 01 | ✅ Plan 01 Task 1 | 01 only | OK |
| `users.preferences` JSONB column | 01 | ✅ Plan 01 Task 1 | 12 (reads + writes via RPC), 06 (Tauri menu defaults), 07b (overlay flags), 08 (recent colors flags) | OK |
| `users.plan` column | 01 (migration) → 04 (Stripe events update) | ✅ Plan 01 + Plan 04 | 09 (retention_class derivation) | OK |
| `canvas_snapshots` table | 09 | ✅ Plan 09 Task 1 | 02 (permanent-delete cascade), 01 (account-deletion Storage purge) | OK |
| `brands.tone_snippets` JSONB | 05 | ✅ Plan 05 | 10 (system-prompt builder reads) | OK |
| `chat_conversations.product_references` | 10 | ✅ Plan 10 Task 2 | 06 (Shop panel import callback) | OK |
| `useFindStore` | **Conflicted** | ❌ Plan 07b Task 1.6/1.7 AND Plan 08 Task 1.3 BOTH ship at `src/stores/find.ts` | 07b (canvas-focus mode), 08 (top-bar find) | **CRITICAL-08.1** |
| `FindOverlay.vue` | **Conflicted** | ❌ Plan 07b §2.1 AND Plan 08 Task 5.1 BOTH ship | Both clusters | **CRITICAL-08.2** |
| `Cmd+F` shortcut | **Conflicted** | ❌ Plan 07b Task 7.1 binds `cmd+f` → `find.open`; Plan 08 Task 5.2 binds `⌘F` → its FindOverlay | Both clusters | **CRITICAL-08.3** |
| `useRightPanelStore` vs `useRightPanelTabStore` | **Conflicted** | Plan 06 ships `useRightPanelStore` at `@/stores/right-panel`; Plan 10 imports `useRightPanelTabStore` from `@/stores/right-panel-tab` | 10 expects 06 ships | **HIGH-10.1** |
| `useToast` / `useConfirm` / `<KovaModal>` / `<KovaSkeleton>` / etc. | 11 | ✅ Plan 11 Phase 3-6 | 01, 02, 03, 04, 05, 06, 07a, 07b, 08, 09, 10, 12 | OK |
| `<EmailShell>` + Resend wrapper | 11 (api/_shared/email.ts) + 01 (supabase/functions/_shared/resend-client.ts) | ✅ Plan 11 Task 1.6 + Plan 01 (per PRD 12 PFC) | 01 (emails), 04 (Stripe receipts), 12 (sync-alert) | **MEDIUM-X.3** — two wrappers across two runtimes (Vercel Functions vs Supabase Edge Functions); ownership boundaries cloudy |
| `useChannelName` + `kova.{userId}.{domain}.{topic}` convention | 11 | ✅ Plan 11 Task 1.7 + 2.3 | 04 (Shopify sync), 09 (snapshot Realtime), 10 (chat stream), 11 (presence) | OK — but M9 legacy `sync-progress-${brandId}` non-conformant, no migration task |
| `useShortcutsStore` | 08 | ✅ Plan 08 Task 2.6 | 07b (registers shortcuts), 09 (registers ⌥⌘S), 10 (registers chat shortcuts) | OK |
| `usePreferencesStore` Layer 1 | 12 | ✅ Plan 12 Task 4 | 06 (view defaults), 07b (overlay flags), 08 (recent colors, ruler/grid/guide flags) | OK |

### Env var consistency

| Variable | Scope | Owner | Consumers | Status |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | server-only | 04 | 04 | ✅ |
| `STRIPE_WEBHOOK_SECRET` | server-only | 04 | 04 | ✅ |
| `VITE_STRIPE_PUBLISHABLE_KEY` | client (VITE_) | 04 | 04 | ✅ |
| `STRIPE_PRICE_ID_SOLO` / `_AGENCY` | server-only | 04 | 04 | ✅ |
| `RESEND_API_KEY` | server-only | 01 + 11 (depending on runtime) | 01 (magic-link), 04 (receipts), 09 (snapshot quota), 12 (sync-alert), 11 (helper) | ✅ — server-only across all plans; stub-guarded |
| `RESEND_FROM` | server-only | 01 | 01 (magic-link), 04 (receipts), 12 | ✅ |
| `ANTHROPIC_API_KEY` | server-only | 10 | 10 only (proxy strips placeholder) | ✅ — Plan 10 Task 22 grep verifies absence from `dist/` |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | global | 02, 04, 09, 10, 11 | ✅ — never VITE_ |
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | client (VITE_) | global | All clusters | ✅ |
| `CRON_SECRET` | server-only | 01 + 09 + 11 | 01 (delete-account-cron), 09 (snapshot-prune), 11 (idempotency-cleanup) | ✅ — consistent across all plans |
| `SENTRY_DSN_SERVER` | server-only | 11 | All Edge Functions | ✅ |
| `VITE_SENTRY_DSN_BROWSER` | client (VITE_) | 11 | App.vue | ✅ |
| `PUBLIC_APP_URL` | server-only (Plan 01) | 01 | 01 (deletion email links) | ⚠️ Plan 01 reads via `process.env.PUBLIC_APP_URL`; whether this should be `VITE_PUBLIC_APP_URL` for client redirect URLs is ambiguous |

**Plan 11 CI grep step** (Task 11.1) enforces: `grep -rnE "VITE_(SENTRY_DSN_SERVER|RESEND_API_KEY|CRON_SECRET)" kova-open-pencil-1/` returns 0. Confirms server-only intent. **No env-var drift detected across plans.**

### RLS policy stack

| Table | Owner cluster | Policies | Consumers | Conflicts? |
|---|---|---|---|---|
| `users` | 01 (baseline `users_self`) | RLS extended in 01 migration. 04 adds columns (Stripe / Shopify fields) but no new policies (inherits). 12 reads `preferences` JSONB via existing policy. | 01, 04, 12 | OK |
| `brands` | 03 | RLS extended in 03 migration. Other clusters SELECT via FK scoped by user_id. | 03 | OK |
| `canvases` | 02 (baseline m2_dashboard) | Service-role + auth.uid=user_id. | 02, 06, 09 (FK cascade target) | OK |
| `canvas_snapshots` | 09 | 4 policies: select-own + 3 blocked. Mutations only via SECURITY DEFINER RPCs. Storage RLS uses path-prefix. | 09 only | OK |
| `gdpr_deletion_queue` | 01 | service_role only. | 01 cron | OK |
| `stripe_webhook_events` | 04 | service_role only. | 04 webhook handler | OK |
| `shopify_connection_history` | 04 | select-own + insert-service. | 04 | OK |
| `brand_fonts` / `brand_kb_sources` / `voice_drafts` | 05 | Per-brand RLS. | 05, 10 (read tone snippets) | OK |
| `idempotency_keys` | 11 | service_role only. | 01, 03, 04, 09 (consumers via verifyIdempotency helper) | OK |
| **`audit_log`** | **NONE (PRD 11 frozen says 11, but Plan 11 doesn't ship)** | **Undefined** | 03 (stopgap to console+Sentry), 04 (stub-creates), 05 (writes blindly) | **CRITICAL-X.1** |
| `chat_conversations` / `chat_messages` / `chat_attachments` | M5 baseline | user_id = auth.uid() | 10 extends `product_references` column (inherits policy) | OK |
| `brand_memories` | M5 baseline | user_id = auth.uid() | 10 reads | OK |
| `users.preferences` JSONB | inherits `users` RLS | SECURITY INVOKER RPC | 12 only writer | OK |

**No two clusters add overlapping policies on the same table.** All conflicts trace back to the single `audit_log` ownership gap.

---

## Findings

Each finding identifies: lens applied, pair/PRDs affected, files + line numbers, the gap, evidence, severity rationale, and a remediation.

---

### CRITICAL-1: Cross-cluster `useFindStore` ownership conflict — two plans ship the same file

**Lens:** Pairwise L8 + Cross-cluster Lens B (shared-resource ownership)
**Pair / PRDs:** 07b ↔ 08
**Files:**
- `docs/kova-final-impl-plans/07b-canvas-engine-inspector-overlays-plan.md` — Task 1.6 / 1.7 creates `src/stores/find.ts` exposing `useFindStore` for canvas-focus mode
- `docs/kova-final-impl-plans/08-canvas-menus-popovers-shortcuts-plan.md:49` — Task 1.3 creates `src/stores/find.ts` exposing `useFindStore` for top-bar find

**Gap:** Both plans declare the same store at the same file path with the same exported symbol but with different state shapes and different consumers. Whoever lands second silently overwrites the first (or generates an import-resolution error if both ship simultaneously).

**Evidence:**
- PRD 07b §6.2.3 declares `useFindStore` for canvas-focus mode (DimLayerOverlay + clickthrough handler).
- PRD 08 §6.2.3 declares `useFindStore` for the top-center search bar with prev/next.
- PRD 07b §12.12 (founder ratification 2026-05-17) reads: "full find canvas-focus mode owned by 07b" — implying sole ownership.

**Why CRITICAL:** Engineer would discover the file conflict at integration. Picking the wrong implementation breaks the other cluster's feature. The 2026-05-17 founder ratification on canvas-focus mode is the latest decision and should govern; PRD 08 needs to either drop its find feature or rename + repath its store.

**Recommended fix:** Pre-build PRD edit. PRD 07b retains sole ownership of `useFindStore` + `src/stores/find.ts` (per the 2026-05-17 ratification). PRD 08 either (a) drops its `<FindOverlay>` and the top-bar find feature in favor of 07b's canvas-focus mode, or (b) renames to `useTopFindStore` at a separate path. Founder call which.

---

### CRITICAL-2: Cross-cluster `FindOverlay.vue` component conflict

**Lens:** Pairwise L8 + Cross-cluster Lens B
**Pair / PRDs:** 07b ↔ 08
**Files:**
- PRD `07b-canvas-engine-inspector-overlays.md` §2.1 — lists `FindOverlay.vue` (composes DimLayerOverlay + clickthrough handler in canvas-focus mode)
- PRD `08-canvas-menus-popovers-shortcuts.md` §6.4.3 — references `<FindOverlay>` (top-center search bar with prev/next)
- Plan `08-canvas-menus-popovers-shortcuts-plan.md:365, 403` — file path + test path

**Gap:** Two components with the same name, different purpose, different DOM contract.

**Why CRITICAL:** Same as CRITICAL-1 — name collision discovered at compile or import time.

**Recommended fix:** Whichever PRD retains the find feature keeps the canonical `<FindOverlay>`. The other component renames (e.g. `<FindCanvasFocusOverlay>` for 07b vs `<TopFindBar>` for 08). Coordinate with CRITICAL-1 resolution.

---

### CRITICAL-3: Cross-cluster `Cmd+F` shortcut ambiguity

**Lens:** Pairwise L8 + Cross-cluster Lens B
**Pair / PRDs:** 07b ↔ 08
**Files:**
- Plan `07b-canvas-engine-inspector-overlays-plan.md` — Task 7.1 registers `find.open` for `cmd+f`
- Plan `08-canvas-menus-popovers-shortcuts-plan.md` — Task 5.2 also registers `⌘F` → opens its FindOverlay

**Gap:** Two distinct actions bound to the same shortcut combination via the same registry. Runtime: only one fires (last-write-wins per `useShortcutsStore.register`); the other is silently dropped.

**Why CRITICAL:** Shortcut keyboarding is a P0 user-facing affordance. Silent suppression is the worst case (the user types ⌘F, gets feature A or feature B with no warning).

**Recommended fix:** Resolve as a consequence of CRITICAL-1. Whichever cluster owns find owns the shortcut. The other cluster drops the binding.

---

### CRITICAL-4: `audit_log` table has no shipping plan — 3 consumers diverge

**Lens:** Cross-cluster Lens B (shared-resource ownership) + Lens D (RLS policy stack)
**Cluster:** 11 (per frozen-decision) / 03 / 04 / 05
**Files:**
- `docs/kova-final-prds/11-shared-ui-infrastructure.md` §2.1 — lists only `idempotency_keys` as a backend cross-cut; **no `audit_log` table declared**
- `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md` Task 1.1 — migration ships only `idempotency_keys`; **no `audit_log` migration**
- `docs/kova-final-impl-plans/03-brand-management-plan.md:7` — "writeAudit() helper writes 5 event types to console + Sentry breadcrumb (stopgap until Cluster 11 ships audit_log table)"
- `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:43, 669, 687, 719` — `api/_shared/audit-log.ts` stub creates table on first use; writes via service-role
- `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md:1721` — `await supabase.from('audit_log').insert({...})` direct write assuming table exists

**Gap:** The frozen founder decision (QA dispatch + scope plan §11) states `audit_log` is owned by Cluster 11. Neither PRD 11 nor Plan 11 ships the migration. Three downstream plans each take a different approach to the missing table.

**Evidence:**
- PRD 11 §2.1 lines 39-85 enumerate every primitive Cluster 11 ships. Search returns **zero** mentions of `audit_log`.
- Plan 11 migration SQL (Task 1.1, lines 145-176) contains only `idempotency_keys`.
- Plan 03 architecture line 7: "stopgap until Cluster 11 ships audit_log table" — explicit acknowledgment of Cluster 11 ownership.

**Why CRITICAL:** Compliance and operational visibility depend on this. Three of the most security-sensitive flows (brand archive/delete, Stripe webhook updates, brand-kit voice extraction) write audit rows. Without a canonical table:
- Plan 03 logs to console + Sentry breadcrumbs — not queryable, not retained for compliance.
- Plan 04 silently creates a different table on first webhook invocation — column schema may diverge from what Plan 05 expects.
- Plan 05 attempts to write to a nonexistent table — first call returns "relation audit_log does not exist".

**Recommended fix:** Pre-Wave-1 PRD + plan edit. Either:
1. **Update PRD 11 + Plan 11** to ship the `audit_log` table migration in Task 1.1 alongside `idempotency_keys`. Specify columns (`id uuid PK`, `user_id uuid FK`, `event_type text`, `payload jsonb`, `created_at timestamptz`), RLS (`authenticated` denied / `service_role` full), and an optional cleanup cron.
2. Coordinate Plan 03, 04, 05 to all use the same `writeAudit()` helper signature against the canonical table.
3. If `audit_log` is to be deferred, update the frozen decision + dispatch documents and have Plans 03/04/05 standardize on the Sentry-breadcrumb stopgap.

---

### HIGH-1: Plan 01 — `audit_log` writes specified by PRD §5.1 but not implemented in Edge Functions

**Lens:** Pairwise L5 (acceptance criterion → test) + L7 (plan traces to PRD)
**Pair:** 01
**Files:**
- PRD `01-auth-and-identity.md:350-353, 378, 401, 545` — 4 distinct locations specifying audit-log row inserts
- Plan `01-auth-and-identity-plan.md` — Tasks 3.3, 4.3, 5.3, 6e implementations contain no `audit_log` insert; `grep -n audit_log` returns 0 hits in the plan body

**Gap:** PRD specifies 4 audit-log row inserts (`deletion_requested`, `account_restored`, `email_change_requested`, `account_hard_deleted`). Plan Edge Function bodies don't perform the inserts.

**Why HIGH:** Audit trail of account-lifecycle events is required for GDPR compliance and incident forensics. Missing rows = unable to prove "who deleted X / when / why" for any user. Compounds with CRITICAL-4 (audit_log table itself unowned).

**Recommended fix:** Add `writeAudit()` call to each Edge Function body in Tasks 3.3, 4.3, 5.3, 6e. Fix CRITICAL-4 first so the writes land in a canonical table.

---

### HIGH-2: PRD 02 + Plan 02 — onboarding wizard sub-routes not registered

**Lens:** Pairwise L2 + L8 (PRD-internal inconsistency)
**Pair:** 02
**Files:**
- PRD `02-onboarding-and-dashboard.md` §3.1 + §8.1 — references `/onboarding/brand`, `/onboarding/shopify`, `/onboarding/brand-kit`, `/onboarding/done`
- PRD §6.1 routes block — registers only `/onboarding` and legacy `/onboarding/store-type`
- Plan `02-onboarding-and-dashboard-plan.md` Task T12 — inserts §6.1 verbatim

**Gap:** PRD §8.1 acceptance bullet "User with no brands lands at `/onboarding/brand`" requires a route that no PRD section registers. Plan inherits the gap.

**Why HIGH:** Acceptance criterion is testable and would fail on first run. Founder's plain-language flow ("onboarding has 4 steps each on its own URL") doesn't match the codebase.

**Recommended fix:** Fix PRD §6.1 to register all 4 sub-routes; update Plan T12 to ship them.

---

### HIGH-3: Plan 02 — composable name mismatch between Tasks 13 and 17

**Lens:** Pairwise L3 (component path / composable name)
**Pair:** 02
**Files:**
- Plan `02-onboarding-and-dashboard-plan.md` Task T13 — `BrandIdentityStep` imports `inject('onboardingState')` from `useOnboardingState` (M9-era composable)
- Task T11 — creates new `useOnboarding` composable
- Task T17 — wires `useOnboarding` to OnboardingView

**Gap:** Provide/inject identifier mismatch — Task T13 injects a key the new composable doesn't provide.

**Why HIGH:** Runtime failure at first onboarding step render. Vue's `inject` would return `undefined`, breaking the wizard state propagation.

**Recommended fix:** Unify on `useOnboarding`. Update T13 to inject the same identifier `useOnboarding` provides.

---

### HIGH-4: Plan 03 — 6 of 8 addendum tasks not patched into the plan body

**Lens:** Pairwise L1 + L3 + L7
**Pair:** 03
**Files:**
- Plan `03-brand-management-plan.md:21-31` — addendum lists 8 added tasks (6.5, 7.5, 10.5, 13.5, 26.5, 33.5, 33.6, 33.7, 33.8) as "must execute"
- Plan body — only 6.5 and 7.5 are patched in; Tasks 13.5/10.5/26.5/33.5/33.6/33.7/33.8 have no standalone task body

**Gap:** Tasks 13.5 (`POST /api/brands/restore` Edge Function), 10.5 (`writeAudit()` helper), 26.5 (`<RestoreBrandModal>`), 33.5/.6/.7/.8 (`<BrandsArchivedFilter>`, `<BrandsSegmentedControl>`, `<BrandsAccountView>`, `<NotShippedYet>` adapter) all listed but never authored.

**Why HIGH:** Plan Task 30 router and Task 18 store actions import these components by exact path. Compile-time import errors at first Vite build.

**Recommended fix:** Author the 6 missing tasks before Wave 2 starts. Each is small (~40 lines of impl + 1 test). 

---

### HIGH-5: Plan 03 — `<BrandsArchivedFilter>`, `<RestoreBrandModal>`, `<BrandsAccountView>` imported but not built

**Lens:** Pairwise L3
**Pair:** 03
**Files:**
- Plan `03-brand-management-plan.md:3040, 3043, 3588, 3605` — `BrandPickerView.vue` (Task 30) and router (Task 34) import these
- Plan file structure (lines 109-115) — does not list these in CRUD modal block

**Why HIGH:** Same compile-time failure as HIGH-4. Consequence of HIGH-4 not being addressed.

**Recommended fix:** Resolves with HIGH-4.

---

### HIGH-6: Plan 03 — Edge Function `restore_brand` not built; `restoreBrand` action calls 404

**Lens:** Pairwise L4
**Pair:** 03
**Files:**
- PRD `03-brand-management.md` §5.1 — "5 Edge Functions"; ratifications confirm restore_brand REAL (B12 reversal)
- Plan `03-brand-management-plan.md:1830` (Task 18) — `restoreBrand` action calls `POST /api/brands/restore`
- Plan file structure (lines 71-77) — only lists 4 Edge Function files; `api/brands/restore.ts` not in plan

**Why HIGH:** Action hits 404 in dev; restore button broken.

**Recommended fix:** Add Task 13.5 body authoring `api/brands/restore.ts` (Edge Function that calls the `restore_brand` RPC).

---

### HIGH-7: Plan 09 — Duplicate-to-canvas Edge Function doesn't wire blob into new canvas's initial state

**Lens:** Pairwise L4 + L8 (cross-cluster dependency)
**Pair:** 09
**Files:**
- PRD `09-version-history-and-trash.md:539-543` (§5.1.1 step 4) — "Uploads the same blob bytes to the new canvas's INITIAL-STATE path (Cluster 02 + Yjs y-indexeddb layer reads this on first open — see §11)"
- Plan `09-version-history-and-trash-plan.md:2391-2407` — Plan uploads blob to a new snapshots path (`{user}/{brand}/{newCanvasId}/{randomUUID}.kiwi.zst`) and creates a snapshot row; no wiring for new canvas to hydrate from snapshot on first open
- Plan "Open coordination points" line 2798 — touches only the `create_canvas` RPC signature, not the initial-state-from-Storage handoff

**Gap:** New canvas is created via Cluster 02's `create_canvas` RPC, then a blob lands in Storage at a snapshots path, then a snapshot row is inserted. But nothing tells the new canvas to load from that snapshot on first open. The y-indexeddb layer hydrates from local CRDT — there's no Storage→indexeddb bridge mechanism documented in the plan.

**Why HIGH:** Click Duplicate → user routed to new canvas → canvas opens blank. Worst user-facing bug because the affordance silently succeeds (no error toast) but produces an empty doc.

**Recommended fix:** Add a Plan 02 task (or update Plan 09 Task 19) that, on canvas open, checks for a "manual" snapshot at the canvas's earliest `taken_at` and, if present, hydrates the Yjs doc from the snapshot bytes. Alternatively: add an `initial_state_blob_path` column to `canvases` that the canvas-open path consumes.

---

### HIGH-8: Plan 09 — Cron `snapshot-prune` missing `FOR UPDATE SKIP LOCKED`

**Lens:** Pairwise L4 (RPC/Edge Function spec mismatch)
**Pair:** 09
**Files:**
- PRD `09-version-history-and-trash.md:571-573` (§5.1.2 algorithm step 2) — "FOR UPDATE SKIP LOCKED — protects against cron overlap"
- Plan `09-version-history-and-trash-plan.md:2483-2488` — uses plain supabase-js `.select().eq().eq().lt().order().limit(1000)` with no SKIP LOCKED

**Why HIGH:** Two cron invocations could race on the same rows, double-delete Storage objects, and write incorrect `storage_failures` counts. Vercel's cron retries on failure compound the risk.

**Recommended fix:** Either run the query as raw SQL via `supabase.rpc('claim_snapshots_for_prune', ...)` (define an RPC that does `SELECT ... FOR UPDATE SKIP LOCKED`), or accept the race-window as Phase B hardening (document why).

---

### HIGH-9: Plan 09 — Cron 7th-day Storage sweep deferred without follow-up

**Lens:** Pairwise L5 (acceptance criterion)
**Pair:** 09
**Files:**
- PRD `09-version-history-and-trash.md:578-580` (§5.1.2 algorithm step 5) — "Sweep step (every 7th day): list all objects in canvas-snapshots/ via Storage API + diff against canvas_snapshots.scene_blob_path. Anything in Storage not referenced in DB → delete."
- PRD §8.3 acceptance line 950 — "If the Storage API fails, the DB row stays + the sweep step on the 7th day reconciles orphans"
- Plan `09-version-history-and-trash-plan.md:2507` — `// Optional 7th-day sweep — implement when cron is in production; out of scope for this draft.`

**Why HIGH:** Acceptance criterion silently uncovered. Orphan blobs accumulate over time. Free-tier Storage costs balloon. No Phase B task scheduled.

**Recommended fix:** Add a Phase B task (or mark §10 Phase B explicitly) authoring the sweep step. Stub the cron to invoke it every 7th day with a date-mod check.

---

### HIGH-10: Plan 10 ↔ Plan 06 — `useRightPanelTabStore` vs `useRightPanelStore` cross-cluster name drift

**Lens:** Pairwise L8 + Cross-cluster Lens B
**Pair:** 10 ↔ 06
**Files:**
- Plan `10-ai-chat-and-memory-plan.md:2394, 2401, 2436` — imports `useRightPanelTabStore` from `@/stores/right-panel-tab`; calls `rightPanelTab.setActiveTab('ai')`
- Plan `06-canvas-editor-core-chrome-plan.md:33, 354, 439, 480` — ships `useRightPanelStore` at `src/stores/right-panel.ts` with `activeTab: 'design' | 'ai'`

**Gap:** Name + path mismatch. Plan 10's Task 17 will fail at import-resolution time.

**Why HIGH:** Compile-time failure for the "Import N to chat" callback (the auto-switch-to-AI-tab affordance founder-locked §12.12 item 5). Either Plan 06 rename, or Plan 10 import fix.

**Recommended fix:** Pick one. Recommend `useRightPanelStore` (Plan 06 owns; shorter; clearer). Update Plan 10 Task 17 to import `useRightPanelStore` from `@/stores/right-panel`.

---

### HIGH-11: PRD 11 verifyIdempotency — hash semantics PRD-internal inconsistency

**Lens:** Pairwise L4 + Cross-cluster Lens B
**Pair:** 11
**Files:**
- PRD `11-shared-ui-infrastructure.md:308` — `request_hash text NOT NULL` column comment `-- sha256(method + path + sorted body keys + body)`
- PRD `11-shared-ui-infrastructure.md:491-492` (§5.5 reference impl) — `createHash('sha256').update(`${req.method}|${new URL(req.url).pathname}|${bodyText}`).digest('hex')` (raw body, no key-sort)
- Plan `11-shared-ui-infrastructure-plan.md:362-365` (Task 1.3) — follows reference impl (raw body)

**Gap:** PRD §4.1 column comment promises JSON-key-sorted normalization. Reference impl + plan hash raw `bodyText`. Two clients sending `{"a":1,"b":2}` and `{"b":2,"a":1}` would produce different `request_hash`es and trigger a false 422 `idempotency_key_reused_with_different_body`.

**Why HIGH:** Cross-language clients (Stripe webhook, server-side retries, mobile, browser JSON.stringify) may serialize with different key order. Real-world example: Stripe's webhook payload has a stable order, but Kova's deletion-request from the browser may not — depends on JS engine.

**Recommended fix:** Either:
1. PRD edit — drop the "sorted body keys" claim from the column comment. Accept that callers must serialize deterministically. Document this requirement in the PRD §5.5 helper docstring.
2. Plan edit — implement key-sorting in `verifyIdempotency` (parse JSON, sort keys, re-stringify, hash).

Recommend (1) — cheaper, no parser overhead, sets a clear contract.

---

### HIGH-12: Plan 11 — `<EmptyState>` uses dynamic icon syntax that unplugin-icons doesn't support

**Lens:** Pairwise L3 (component impl correctness)
**Pair:** 11
**Files:**
- Plan `11-shared-ui-infrastructure-plan.md:2313` — `<icon-lucide-:name="icon" />`
- unplugin-icons docs — icon names must be static literals at compile time (e.g., `<icon-lucide-x />` or `import IconX from '~icons/lucide/x'`). Dynamic resolution requires `<component :is="...">` and explicit imports.

**Why HIGH:** Build break at Vite-compile time on first attempt to mount `<EmptyState>`. Affects every cluster that uses EmptyState (every cluster).

**Recommended fix:** Refactor to either:
1. Use a static map (`const ICONS = { 'history': IconHistory, ... }`) and `<component :is="ICONS[icon]" />`.
2. Use a Lucide JS API directly (`<svg v-html="iconSvg" />` with a lookup function).

---

### HIGH-13: PRD 12 + Plan 12 — `update_user_pref` RPC argument double-encoded

**Lens:** Pairwise L4 + L7
**Pair:** 12
**Files:**
- PRD `12-settings-and-user-preferences.md` §4.1 line 236 note 3 — "p_value jsonb not text: caller is responsible for JSON.stringify on the JS side"
- PRD §6.2.1 line 361 — `supabase.rpc('update_user_pref', { p_path: path, p_value: JSON.stringify(value) })`
- Plan `12-settings-and-user-preferences-plan.md` Task 4 — inherits same call signature

**Gap:** Supabase-js auto-JSON-encodes RPC arguments. Calling `rpc(name, { p_value: JSON.stringify('large') })` sends `{"p_value": "\"large\""}` to PostgREST. PostgREST decodes JSON and binds `p_value` as `'"large"'` (a JSONB string containing a quoted string). Postgres stores `'"\""large\\""'` — escape mess.

**Why HIGH:** Every preference write corrupts data. `accessibility.textSize: 'large'` stored as JSONB string `'"large"'` instead of `'large'`. CSS layer `data-text-size` would render the quoted value as `<html data-text-size='"large"'>`. Tests would catch this if they assert against the round-tripped JSONB column value.

**Recommended fix:** Drop the `JSON.stringify` wrapper. Call `supabase.rpc('update_user_pref', { p_path: path, p_value: value })`. supabase-js handles serialization correctly.

---

### HIGH-14: Plan 12 Task 16 imports Resend wrapper from Cluster 01 with no stub fallback

**Lens:** Pairwise L8 (cross-cluster dependency)
**Pair:** 12 ↔ 01
**Files:**
- Plan `12-settings-and-user-preferences-plan.md:2035` — `import { sendEmail } from '../_shared/resend-client.ts'`
- Plan `12-settings-and-user-preferences-plan.md:92` (PFC) — "If Cluster 01 has not landed, stub a local `_shared/resend-client.ts` in this plan and replace when Cluster 01 merges."

**Gap:** PFC describes a stub fallback but the plan provides no actual stub task. If Plan 12 (Wave 3) executes before Cluster 01 ships `supabase/functions/_shared/resend-client.ts`, build breaks.

**Why HIGH:** Wave ordering says Cluster 01 ships in Wave 1; Plan 12 is Wave 3. So normally the dependency is satisfied. But: developer running Plan 12 in isolation (or out-of-order) hits a build break. Plan must provide the stub task explicitly.

**Recommended fix:** Add a Task 16.0 to Plan 12 that creates a minimal local stub `_shared/resend-client.ts` exporting `sendEmail()` as a no-op when `RESEND_API_KEY` is unset. Replace the stub task with an import from Cluster 01 once Cluster 01 lands. Or: defer Plan 12 explicitly until Cluster 01 ships.

---

### HIGH-15: Plan 10 ↔ Plan 06 — auto-switch-to-AI-tab affordance broken by store name drift

(Consolidates with HIGH-10 — listed here for severity completeness.)

---

### MEDIUM-1: Plan 01 — `claim_pending_deletion_users` RPC referenced but not defined

**Lens:** Pairwise L4
**Pair:** 01
**Files:**
- Plan `01-auth-and-identity-plan.md:1707` — cron orchestrator calls this RPC
- Plan migration files — no RPC by this name

**Gap:** Cron will fail at runtime. Fallback inline SQL uses PostgREST `gdpr_deletion_queue!inner(status)` embedded filter which is fragile (PostgREST embedded filters can return surprising results when the join field has no match).

**Recommended fix:** Either add the RPC migration (recommended — single SECURITY DEFINER function with explicit `SELECT u.id FROM users u JOIN gdpr_deletion_queue q ON q.user_id = u.id WHERE q.status = 'pending'`) or replace the call with the explicit join via service-role client.

---

### MEDIUM-2: Plan 01 — `idempotency_keys` table not consulted by Edge Functions

**Lens:** Pairwise L4 + L8
**Pair:** 01
**Files:**
- PRD `01-auth-and-identity.md:332` (§5.1) — "server checks `idempotency_keys` table (Cluster 11 creates) and short-circuits on dup"
- Plan `01-auth-and-identity-plan.md` Tasks 3/4/5 — pass `X-Idempotency-Key` header through to Resend; do not call `verifyIdempotency()` against Cluster 11's table

**Recommended fix:** Import `verifyIdempotency` from `api/_shared/idempotency.ts` (Plan 11 Task 1.3) in each Edge Function. Replace the pass-through with the cached-replay pattern shown in PRD 11 §5.5.

---

### MEDIUM-3: Plan 01 — Email templates use inline HTML instead of `<EmailShell>`

**Lens:** Pairwise L8
**Pair:** 01 ↔ 11
**Files:**
- PRD `01-auth-and-identity.md:622` (§5.4.2) — "All templates extend Cluster 11 `<EmailShell>`"
- Plan `01-auth-and-identity-plan.md` Task 21 — inline HTML

**Recommended fix:** Refactor Task 21 to compose `<EmailShell>` (Plan 11 Task 8.2) as the wrapper.

---

### MEDIUM-4: Plan 02 — `useOfflineState` uses raw `navigator.onLine`, ignores Realtime check

**Lens:** Pairwise L8
**Pair:** 02 ↔ 11
**Files:**
- PRD `02-onboarding-and-dashboard.md` §6.3 line 586 + §3.7 — `useOfflineState` combines `navigator.onLine` + Supabase Realtime channel state
- Plan `02-onboarding-and-dashboard-plan.md` Task T31 — uses raw `navigator.onLine` only

**Recommended fix:** Import `useOnlineStatus` from Cluster 11 (Plan 11 Task 2.4) instead of rolling local detection.

---

### MEDIUM-5: PRD 02 + Plan 02 — wizard step consolidation un-gated

**Lens:** Pairwise L9 (open question reconciliation)
**Pair:** 02
**Files:**
- PRD `02-onboarding-and-dashboard.md` §12.10 — marks `BrandNameStep/BrandUrlStep/NameStep` consolidation as OPEN with "ESCALATE founder"
- Plan `02-onboarding-and-dashboard-plan.md` Task T13 — proceeds with consolidation + `git rm` without founder gate

**Recommended fix:** Either PRD §12.10 resolves before Wave 2 starts, or Plan T13 pauses pending decision.

---

### MEDIUM-6: Plan 02 — `ExtractionStep.vue` retirement declared but not executed

**Lens:** Pairwise L1
**Pair:** 02
**Files:**
- Plan `02-onboarding-and-dashboard-plan.md` Task T13 file-structure header — lists `ExtractionStep.vue` for deletion
- Task T13 implementation steps — only `git rm`s BrandNameStep + BrandUrlStep + NameStep

**Recommended fix:** Add the `ExtractionStep.vue` removal to T13 (or T17).

---

### MEDIUM-7: Plan 02 — Cluster 05 brand-kit extract queue handoff missing

**Lens:** Pairwise L8
**Pair:** 02 ↔ 05
**Files:**
- PRD `02-onboarding-and-dashboard.md` §2.1 step 3 — "Cluster 05 owns the extract"
- PRD §12.5 — mitigation requires payload-enqueue to Cluster 05's `brand_kit_extract_queue`
- Plan `02-onboarding-and-dashboard-plan.md` Task T15 (BrandKitStep) — no queue-stub task

**Recommended fix:** Add a queue-stub task to Plan 02 (or document the explicit Cluster 05 → 02 contract).

---

### MEDIUM-8: Plan 02 — `lastActiveBrandId` shared-ref violation

**Lens:** Pairwise L3 + L7
**Pair:** 02
**Files:**
- PRD `02-onboarding-and-dashboard.md` §6.2.1 — "`useBrandsStore.selectedBrandId` and `useUIStateStore.lastActiveBrandId` are the same key — one underlying useLocalStorage ref shared via composition"
- Plan `02-onboarding-and-dashboard-plan.md` Tasks T04 + T05 — implement two separate `useLocalStorage` instances with key `'kova:ui:last-brand'`

**Why MEDIUM:** Two independent reactive refs reading the same localStorage key. Updates from one ref don't sync to the other until next page load. Cross-component data inconsistency.

**Recommended fix:** Compose one `useLocalStorage('kova:ui:last-brand', null)` in `useUIStateStore` and re-export the ref to `useBrandsStore.selectedBrandId` as a computed alias.

---

### MEDIUM-9: PRD 03 §8.7 RPC-count off-by-one

**Lens:** Pairwise L9
**Pair:** 03
**Files:**
- PRD `03-brand-management.md` §5.2 — lists 7 RPCs total
- PRD §8.7 — "All 6 RPCs error-codes documented"

**Recommended fix:** Update PRD §8.7 count from 6 → 7.

---

### MEDIUM-10: Plan 03 — Sort dropdown static markup, no state

**Lens:** Pairwise L5
**Pair:** 03
**Files:**
- PRD `03-brand-management.md` §3.1 + §8.1 — "Sort dropdown options Last edited / Name with localStorage persistence"
- Plan `03-brand-management-plan.md` Task 30 lines 3131-3136 — static markup, no v-model, no state, no localStorage

**Why MEDIUM:** Acceptance §8.1 (Sort dropdown reorders the grid) fails. User-facing affordance non-functional.

**Recommended fix:** Add Sort state to `useBrandsStore` (or `useUIStateStore.brandsSort`) with `useLocalStorage`-backed persistence. Wire to BrandPickerView with computed sort applied to the grid.

---

### MEDIUM-11: Plan 03 — `writeAudit()` helper has no creation task

**Lens:** Pairwise L1
**Pair:** 03 ↔ 11
**Files:**
- PRD `03-brand-management.md` §5.1 lines 340-381 — defines `writeAudit()` helper inline
- Plan `03-brand-management-plan.md` — no task creates `api/_shared/audit.ts`; Tasks 13/14 implementations would fail to import

**Why MEDIUM:** Compile-time import error. Compounds with CRITICAL-4.

**Recommended fix:** Add the helper creation task to Plan 03 (or have CRITICAL-4 resolve it as part of Plan 11).

---

### MEDIUM-12: Plan 03 — Cluster-11 adapter missing `<NotShippedYet>` shim

**Lens:** Pairwise L1
**Pair:** 03
**Files:**
- Plan `03-brand-management-plan.md` Task 21 — lists 4 adapters (KovaModal, TypedConfirmField, use-toast, use-confirm)
- Addendum line 44 — requires extending with `<NotShippedYet>` shim
- Task 34 router line 3596 — imports `NotShippedYetAdapter.vue`

**Recommended fix:** Add the adapter shim creation task to Plan 03.

---

### MEDIUM-13: Plan 04 Task 14.4 — email templates not extending `<EmailShell>`

**Lens:** Pairwise L8
**Pair:** 04 ↔ 11
**Files:**
- PRD `04-account-and-stripe-billing.md` §5.4.3 line 760 — "All templates extend `<EmailShell>` (Cluster 11)"
- Plan `04-account-and-stripe-billing-plan.md` Task 14.4 — standalone HTML, no `{% extends %}` or include

**Recommended fix:** Either (a) refactor Task 14.4 to compose `<EmailShell>` via a Vue SSR-render-to-string pattern, or (b) clarify that Cluster 11 wraps at send-time inside the `sendEmail()` helper (PRD-level decision).

---

### MEDIUM-14: Plan 04 Task 12.2 — `<StripeReturnLanding>` Cluster 01 component reuse not specified

**Lens:** Pairwise L8
**Pair:** 04 ↔ 01
**Files:**
- PRD `04-account-and-stripe-billing.md` §3.7 + §11 — B10.1/B10.2 reuse Cluster 01 `<AuthMedal>` + `<AuthIcon>`
- Plan `04-account-and-stripe-billing-plan.md` Task 12.2 — implementation steps don't mention importing those components

**Recommended fix:** Update Task 12.2 to explicitly import + compose the Cluster 01 components.

---

### MEDIUM-15: Plan 04 Task 10.1 — Brand Kit shell missing `<router-view>` sub-route wiring

**Lens:** Pairwise L2
**Pair:** 04 ↔ 05
**Files:**
- PRD `04-account-and-stripe-billing.md` §3.4 + §6.4.1 — Brand Kit shell mounts Cluster 05 sub-tab content via `?tab=:tab`
- Plan Task 10.1 — wires `<Skeleton>` placeholder; no integration with `<router-view>` for sub-routes

**Recommended fix:** Update Task 10.1 to wire `<router-view>` (or a `<keep-alive>` + `<component :is="...">` pattern) reading `?tab=` query param.

---

### MEDIUM-16: Plan 05 Tasks 21-27 — per-tab components compressed without TDD bodies

**Lens:** Pairwise L13 (test taxonomy)
**Pair:** 05
**Files:**
- Plan `05-brand-kit-and-drag-drop-plan.md` Tasks 21-27 — 7 per-tab components in a single block of one-line per-tab descriptions

**Why MEDIUM:** Largest user-facing surface area (the brand kit IS the brand kit). Test rigor compressed.

**Recommended fix:** Expand each task into its own TDD body (RED → GREEN → REFACTOR per component).

---

### MEDIUM-17: Plan 06 Task 2 — `useEditorStore.showUI` 3-state enum may break existing handlers

**Lens:** Pairwise L1
**Pair:** 06
**Files:**
- PRD `06-canvas-editor-core-chrome.md` §6.2 + §2.1 row 5 — changes from boolean to 3-state enum
- Plan `06-canvas-editor-core-chrome-plan.md` Task 2 — refactors store; no migration step for existing toggle handlers

**Recommended fix:** Add an explicit migration step in Task 2 to update all consumers of `showUI` (probably grep `showUI = ` or `showUI.value =` and update each).

---

### MEDIUM-18: Plan 06 Task 8 — drop-with-invalid-payload crash-resistance not tested

**Lens:** Pairwise L5
**Pair:** 06
**Files:**
- PRD `06-canvas-editor-core-chrome.md` §6.5 acceptance §8.10 — "Drop with invalid payload (valibot validation fails) → silently aborted + console warn (no app crash)"
- Plan Task 8 — covers valibot validation but doesn't explicitly test the crash-resistance path

**Recommended fix:** Add an explicit "drop with malformed payload → no app crash" test case to Task 8.

---

### MEDIUM-19: Plan 07b Tasks 4.5-4.10 — 7 overlays grouped without per-overlay TDD

**Lens:** Pairwise L13
**Pair:** 07b
**Files:**
- Plan `07b-canvas-engine-inspector-overlays-plan.md` Tasks 4.5-4.10 — group PixelGrid, LayoutGuides, HoverContour, SnapIndicators, FindHighlight, EyedropperCrosshair, MeasurementAnnotations into a single task body

**Why MEDIUM:** Each overlay has distinct hi-fi reference, z-index, and visual chrome. Loses test rigor for 7 of 11 overlays.

**Recommended fix:** Split each into its own task.

---

### MEDIUM-20: Plan 08 — phase-table format reduces TDD rigor

**Lens:** Pairwise L13
**Pair:** 08
**Files:**
- Plan `08-canvas-menus-popovers-shortcuts-plan.md` — uses phase-table format (3-column row-per-task) instead of full TDD walkthrough per task

**Why MEDIUM:** PRD 08 has 30+ components/composables. Less rigorous than other plans; easier to drift at implementation.

**Recommended fix:** Convert phase-table to full TDD per task. Significant work; defer if Wave 5 schedule tight.

---

### MEDIUM-21: Plan 08 Task 2.6 — `use-keyboard.ts` refactor highest-risk task, compressed

**Lens:** Pairwise L13
**Pair:** 08
**Files:**
- Plan Task 2.6 — 8 sub-steps; per-step test coverage compressed
- PRD `08-canvas-menus-popovers-shortcuts.md` §6.1 — every existing shortcut must still work post-refactor

**Recommended fix:** Author per-shortcut-category TDD (Edit / View / Tool / Navigation / Custom). 5 sub-tasks minimum.

---

### MEDIUM-22: Plan 09 Task 19 — idempotency dedup on duplicate-to-canvas is pseudo-code only

**Lens:** Pairwise L4
**Pair:** 09 ↔ 11
**Files:**
- PRD `09-version-history-and-trash.md:543` — "idempotency-key keyed on (user_id, snapshot_id) within 5 minutes → returns same new canvas_id on retry"
- Plan `09-version-history-and-trash-plan.md:2358-2359, 2405` — `// const cached = await idempotencyLookup(...)` + `// await idempotencyStore(...)` — comment-only stubs

**Recommended fix:** Replace stubs with real `verifyIdempotency()` integration (per Plan 11 Task 1.3).

---

### MEDIUM-23: Plan 09 Task 19 — Storage path uses random UUID, not snapshot_id

**Lens:** Pairwise L3
**Pair:** 09
**Files:**
- PRD `09-version-history-and-trash.md:463-465` (§4.3) — `{user_id}/{brand_id}/{canvas_id}/{snapshot_id}.kiwi.zst`
- Plan `09-version-history-and-trash-plan.md:2390` — `${auth.userId}/${targetBrand}/${newCanvasId}/${crypto.randomUUID()}.kiwi.zst`

**Why MEDIUM:** Path UUID and row ID diverge. Complicates orphan reconciliation (the 7th-day sweep in PRD §5.1.2 step 5 diffs Storage objects against `canvas_snapshots.scene_blob_path` — works because the column value is opaque to the algorithm, but breaks the implicit invariant that path's UUID matches row id).

**Recommended fix:** Pre-generate the snapshot UUID before upload: `const snapshotId = crypto.randomUUID(); const newBlobPath = .../{snapshotId}.kiwi.zst; ... rpc('create_snapshot', { p_id: snapshotId, ... })`. Modify `create_snapshot` RPC to accept caller-supplied id.

---

### MEDIUM-24: Plan 09 Task 20 — magic numbers in cron handler

**Lens:** Pairwise L7 + coding-style
**Pair:** 09
**Files:**
- PRD `09-version-history-and-trash.md:1135` — `SNAPSHOT_FREE_RETENTION_DAYS = 30` feature-flag constant
- Plan `09-version-history-and-trash-plan.md:2486` — `30 * 24 * 60 * 60 * 1000` hardcoded

**Recommended fix:** Import constant from a config module.

---

### MEDIUM-25: Plan 09 Task 12a — `useCanvasEditLock` ref-counting instead of single-owner toggle

**Lens:** Pairwise L3
**Pair:** 09
**Files:**
- PRD `09-version-history-and-trash.md:797` (§6.3) — signature `lock(): void; unlock(): void; isLocked: ComputedRef<boolean>` implies single-owner boolean
- Plan `09-version-history-and-trash-plan.md:1552-1557` (Task 12a) — uses `lockCount` ref + `Math.max(0, ...)` (multi-caller ref-count)

**Why MEDIUM:** Acceptance §8.5 describes panel open/close lifecycle (single owner). Ref-counting could mask coverage if another consumer locks but never unlocks.

**Recommended fix:** Switch to a boolean ref; warn (or assert) if `lock()` called when already locked.

---

### MEDIUM-26: Plan 09 — Cluster 06 File-menu Version-history item missing

**Lens:** Pairwise L8
**Pair:** 09 ↔ 06
**Files:**
- PRD `09-version-history-and-trash.md:1148` (§11 cross-cut to Cluster 06) — "the topbar Version-history menu item (File menu → Version history → opens panel)"
- Plan `09-version-history-and-trash-plan.md` — Task 21 (right-panel mount) does not add a File-menu item; open-coordination-points (lines 2794-2800) mention right-panel + keyboard registry but not File menu

**Recommended fix:** Add a coordination point with Plan 08 for the File-menu item, or have Plan 09 Task 23 register it via Cluster 08's menu registry.

---

### MEDIUM-27: Plan 10 — dual mutation paths to `chat_conversations.product_references`

**Lens:** Pairwise L3
**Pair:** 10
**Files:**
- Plan `10-ai-chat-and-memory-plan.md` Task 3 — adds `useChatStore.updateProductReferences(conversationId, refs)` action
- Plan Task 4 — `useChatProductReferencesStore.persistAndPatch()` directly calls `supabase.from('chat_conversations').update(...)` AND assigns `chatStore.conversations = chatStore.conversations.map(...)`

**Why MEDIUM:** Two write paths to Supabase + the local store. Convergence on a single path (Task 4 → Task 3 action → store) prevents test-coverage gaps.

**Recommended fix:** Refactor Task 4's `persistAndPatch` to delegate to Task 3's `updateProductReferences` action.

---

### MEDIUM-28: PRD 10 — §6.4.2 line 619 contradicts §3.2 + founder-locked §12.12 item 7

**Lens:** Pairwise L7 (PRD-internal inconsistency)
**Pair:** 10
**Files:**
- PRD `10-ai-chat-and-memory.md:619` (§6.4.2) — "Render `<ProductReferenceChipRow>` above the existing attachment-thumbnail row"
- PRD §3.2 line 158 + §12.12 item 7 — "Top→bottom: image attachment thumbnails → product chip row → textarea → send" (chips BELOW attachments)

**Why MEDIUM:** Founder-lock supersedes; Plan Task 14 correctly follows founder-lock. But PRD §6.4.2 wording is stale and would mislead a re-reader.

**Recommended fix:** PRD edit. Line 619 should read "Render `<ProductReferenceChipRow>` BELOW the existing attachment-thumbnail row".

---

### MEDIUM-29: Plan 11 Task 8.2 — `<EmailShell>` hardcodes prod domain

**Lens:** Pairwise L2
**Pair:** 11
**Files:**
- Plan `11-shared-ui-infrastructure-plan.md:2520` — `<img src="https://kova.app/email/wordmark-light@2x.png" alt="Kova" width="80" />`

**Why MEDIUM:** Won't render in staging or dev environments. PRD §3.8 specifies "PNG wordmark from `/public/email/`" — implies relative.

**Recommended fix:** Use Vercel Edge `process.env.PUBLIC_APP_URL` or pass the wordmark URL as a prop to `<EmailShell>`.

---

### MEDIUM-30: Plan 11 Task 8.2 — `<EmailShell>` `{{settings_url}}` interpreted as Vue expression

**Lens:** Pairwise L2
**Pair:** 11
**Files:**
- Plan `11-shared-ui-infrastructure-plan.md:2523` — `<a href="{{settings_url}}">Manage preferences</a>`

**Why MEDIUM:** Vue template interpolation parses `{{settings_url}}` as a Vue expression that resolves to `undefined`. Output: `<a href="">`. Resend template variable never reaches the rendered HTML.

**Recommended fix:** Escape Vue parsing for Resend template variables:
```vue
<a :href="`{{settings_url}}`">Manage preferences</a>
<!-- or -->
<a :href="'{{' + 'settings_url}}'">Manage preferences</a>
```

---

### MEDIUM-31: Plan 11 Task 9.1 — `<NetworkStatusIndicator>` not mounted in App.vue

**Lens:** Pairwise L2 + L8
**Pair:** 11 ↔ 02
**Files:**
- PRD `11-shared-ui-infrastructure.md:922-923` (§10 Phase A) — "App shell mounts ToastStack + NetworkStatusIndicator once"
- PRD §3.7 — "icon in topbar (right side, beside avatar)" — implies Cluster 02 mounts in topbar
- Plan `11-shared-ui-infrastructure-plan.md` Task 9.1 — mounts ToastStack + ConfirmModal in App.vue; NOT NetworkStatusIndicator

**Why MEDIUM:** Either PRD §10 is wrong (Cluster 02 mounts) or Plan 11 misses a mount. Ambiguous ownership.

**Recommended fix:** Clarify in PRD whether NetworkStatusIndicator mounts in App.vue (global, free-floating) or in Cluster 02's topbar (anchored). Update plan accordingly.

---

### LOW-1 through LOW-36: (consolidated for brevity)

Per-pair LOW findings already enumerated in Per-pair coverage matrix. Highlights:

- **Test taxonomy compression** — multiple plans group 4-8 related components into a single task without per-component TDD bodies (Plans 04/05/07b/08). Acceptance criteria not enumerated as test assertions.
- **Magic numbers + missing constants** — Plan 09 retention days, 50 MB caps, ping intervals not pulled from declared feature-flag constants.
- **Cross-cluster CI coordination** — `format_version` grep on `packages/core/codec/` changes (PRD 07a + PRD 09 both reference; neither Plan ships).
- **Missing skeleton / loading states** — Plan 09 has `loadingByCanvas` in store but no template branch; Plan 04 `<router-view>` sub-route not wired.
- **Stale PRD wording** — PRD 03 §8.7 "6 RPCs" should be 7 after restore_brand promotion. PRD 10 §6.4.2 chip-row position contradicts §3.2.
- **Test rigor for founder-locked decisions** — Plan 10 Task 15 (ChatPanel refactor) covers 20-tab cap, empty-chips-new-tab, horizontal-scroll overflow per founder-lock §12.12 items 3, 9, 10 but per-decision test bodies not enumerated.

---

## Cross-pair observations

### Pattern 1 — Multi-component task compression

Plans 04 (Tasks 11.4-11.8 integrations refactor), 05 (Tasks 21-27 brand kit tabs), 07b (Tasks 4.5-4.10 overlays), and 08 (whole plan as phase-table) compress related-but-distinct components into single task bodies. The compression saves authoring effort but loses per-component TDD discipline. **Recommendation:** for any task that spans more than 2 component files, split into per-component sub-tasks with their own RED → GREEN → REFACTOR cycle.

### Pattern 2 — Cross-cluster name + path drift

Three concrete drifts found:
1. Plan 10 `useRightPanelTabStore` vs Plan 06 `useRightPanelStore` (HIGH-10).
2. Plans 07b + 08 both declare `src/stores/find.ts` (CRITICAL-1).
3. PRD 11 + 12 + 01 reference Resend wrapper at different paths and locations (MEDIUM cross-cluster).

**Recommendation:** Add a Wave-1 task to Plan 11 (or to the scope plan) — "registry of shared exports": every store / composable / component a cluster exports gets a single canonical name + path. Other clusters consume by that name. CI grep enforces.

### Pattern 3 — Acceptance criteria not enumerated as tests

PRDs 03 (§8.7 idempotency replay), 09 (§8.3 7th-day sweep + §8.6 deep-link preview), 11 (§8.10 email shell client compat), 12 (§8.1-8.7 multiple) include acceptance bullets that the corresponding Plan does NOT translate into explicit test cases. **Recommendation:** every PRD §8 acceptance bullet should map 1:1 to a named test in Plan §9 (or skipped with rationale).

### Pattern 4 — Stub policy applied unevenly

Plan 11 stub-guards Sentry / Resend / cron uniformly (env-guard at top of helper; returns no-op when env unset). Plan 09 inherits stubs for cron + idempotency but only as code comments, not as runnable guards. Plan 12 follows stub policy for Resend but reads `SUPABASE_URL` / `SUPABASE_ANON_KEY` without guards (would crash if unset). **Recommendation:** standardize the stub-guard pattern across all Edge Functions. A `loadEnvOrSkip()` helper in `api/_shared/env.ts` would make it one-liner.

### Pattern 5 — Audit-log writes specified by PRD but missing in plan implementations

Plans 01, 03, 05 all reference `audit_log` writes per their PRDs, but the actual write code is either absent (Plan 01), stopgapped to console (Plan 03), or assumes a table that doesn't exist (Plan 05). Plan 04 even stub-creates the table on first use. **Recommendation:** resolves with CRITICAL-4 — once Plan 11 ships the table + `writeAudit()` helper, consumers can stop diverging.

### Pattern 6 — Edge Function runtime config absent

Plans 09, 12 declare "Vercel Fluid Compute" or "Supabase Edge Functions" in their architecture sections but don't add `export const config = { runtime: 'edge' }` or `vercel.json` runtime hints in Edge handler files. **Recommendation:** add a CI check (Plan 11 Task 11.1 style grep) that every file under `api/` exports a `config` with `runtime: 'edge'` or `'nodejs'`.

### Pattern 7 — PRD-internal inconsistency

Multiple PRDs contain contradictions between sections:
- PRD 02 §6.1 routes vs §3.1/§8.1 wizard sub-routes (HIGH-02.1)
- PRD 10 §6.4.2 vs §3.2/§12.12 chip row position (MEDIUM-10.3)
- PRD 11 §4.1 column comment vs §5.5 reference impl request_hash semantics (HIGH-11)
- PRD 12 §6.2.2 line 465 (24-color) vs §2.1 line 81 (12-color founder-lock) recent colors cap (MEDIUM-12.3)
- PRD 03 §8.7 (6 RPCs) vs §5.2 (7 RPCs) (MEDIUM-03.7)

**Recommendation:** before Wave 1 starts, run a PRD-internal grep sweep — for each numerical constant or count mentioned in a PRD, assert it matches its referent. (E.g., grep all occurrences of `\d+` in each PRD; flag mismatched neighbors.)

---

## Closing note

The 4 CRITICAL findings (3 find-feature ownership conflicts + 1 audit_log table ownership gap) are pre-Wave-1 blockers. Founder + scope-plan author should resolve before any cluster starts implementation. The 15 HIGH findings are in-wave fixable but should be triaged into each cluster's Phase A. Everything below HIGH is normal pre-build hygiene — recommend a single half-day reconciliation pass per PRD before its wave starts.

Recommended sequencing:

1. **Pre-Wave-1 (this week):** Resolve CRITICAL-1/2/3 (find ownership) + CRITICAL-4 (audit_log ownership). 4 PRD edits + 4 Plan edits.
2. **Wave 1 kickoff:** Apply HIGH-11 (verifyIdempotency hash semantics), HIGH-12 (EmptyState dynamic icon), HIGH-13 (JSON.stringify double-encode), HIGH-14 (Resend stub) — all in Cluster 11 + 12 territory.
3. **Wave 2 kickoff:** Apply HIGH-1 (audit_log writes), HIGH-4/5/6 (Plan 03 missing tasks).
4. **Wave-N (each):** Apply HIGH findings for that cluster + MEDIUM if time permits.

No frozen founder decisions were challenged. No findings tagged NOTE (locked).

---

**End of report.**
