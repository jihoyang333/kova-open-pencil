# Kova Final Pre-Build Audit Report

**Date:** 2026-05-19
**Auditor:** Claude Code (Opus 4.7) — main session + 13 parallel cluster verifier subagents
**Branch verified:** `feat/m9-shopify` @ `137d4a41` (Merge W4 Cluster 09+10 into feat/m9-shopify)
**Working tree:** clean
**Verdict:** ⚠️ **READY WITH CAVEATS**

---

## §1. Executive summary

Of 158 triaged findings, **133 are ✅ CLOSED, 7 are ⚠️ PARTIAL, 13 are ❌ NOT CLOSED, 5 are 🔒 LOCKED (NOTE-locked / founder-frozen).** Every CRITICAL-tagged finding has been substantively closed in the spec corpus (audit_log DDL, signInAs JWT fix, plan_status `'trialing'`, KovaIcon primitive, find-feature ownership, routing canonical, search_path lock, test-framework gate, v-html sanitization, Stripe webhook raw-body reader, JSON.stringify double-encode, etc.). The corpus is **safe to enter the app-build phase for cluster-by-cluster execution**, but five Wave-0 contract items (W0-11 through W0-15 — the Pattern-1/3/4/6/7 conventions) were enumerated as dispatch proposals but never propagated into scope plan §6 or Plan 11 task body. Additionally, the W0-9 founder-lock-#10 sweep landed the `requireEnv` helper + CI gate but the actual refactor pass against 52 `process.env.X!` + ~202 `as any` callsites was explicitly deferred and never executed. The PRD 07b status field still reads `DRAFT 2026-05-15` (CT-018 partial), PRD 06 prose still cites the retired `/dashboard?brandId=` route in 7 places, and PRD 07b has an internal Boolean-shortcut contradiction (⌥⇧U/S/I/E in §3 vs ⌘⌥U/S/I/X in §2 + §6).

**Recommendation:** clear to begin Cluster 11 + 07a build (their corpus is clean). For Clusters 02/03/04/06/09/10, fix the residual prose/store-name drift + execute the W0-9 sweep in a tight ~2-hour pre-build pass before their cluster work starts. The five W0-11..15 patterns are nice-to-have conventions, not load-bearing blockers — engineers can apply them organically during build.

---

## §2. Triage closure (Track 1) — 158 rows

### Cluster 01 — Auth + Onboarding + Shopify OAuth (17 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| CT-007 | HIGH | 01 | ✅ CLOSED | Plan 01:935 (`deletion-requested`), :1081 (`account-restored`), :1244 (`email-change-requested`), :1862 (`account-hard-deleted` cron). All 4 Edge Fns import `writeAudit` from `../_shared/audit` and call it with `eventType` + `clusterOwner: '01'`. |
| B-CRIT7 | CRIT | 01 | ✅ CLOSED | Plan 01:1538–1545 — Shopify revoke is now `DELETE /admin/api_permissions/current.json` with `X-Shopify-Access-Token` header. Old POST `/.../revoke` URL gone. |
| B-CRIT8 | CRIT | 01 | ✅ CLOSED | Plan 01:865–886 — in-memory `rateLimitMap` replaced with Postgres-backed `checkRateLimit()` calling `bump_rate_limit` RPC against `public.rate_limits` table (DDL at :374). |
| B-HIGH5 | HIGH | 01 | ✅ CLOSED | Plan 01:1409–1411 — `stripe.customers.del(id, undefined, { idempotencyKey: ... })`. Subscription cancel at :1400 also corrected. |
| B-HIGH15 | HIGH | 01 | ✅ CLOSED | Plan 01:1655–1658 — `(logErr as { code?: string }).code !== '42P01'` SQLSTATE-based matching. |
| C-MED1 | MED | 01 | ✅ CLOSED | Plan 01:2126–2152 — `claim_pending_deletion_users` defined in Task 1 migration with SECURITY DEFINER + SET search_path. |
| C-MED2 | MED | 01 | ✅ CLOSED | Plan 01:858, 1042, 1193 — all 3 user-facing Edge Fns import `verifyIdempotency` from `../_shared/idempotency`. |
| C-MED3 | MED | 01 | ✅ CLOSED | Plan 01:3183–3251 — Task 21 refactored to compose `EmailShell.vue` (Cluster 11) via `renderEmail()` helper. |
| B-MED10 | MED | 01 | ✅ CLOSED | Plan 01:2044–2049 — `const row = Array.isArray(claim) ? claim[0] : claim` normalization. |
| B-MED1 | MED | 01 | ✅ CLOSED | Plan 01:148–153 — Conventions banner documents two-schema `SET search_path = public, pg_temp` lock. |
| B-MED2 | MED | 01 | ✅ CLOSED | Plan 01:280–289 — redundant RLS policy removed; replaced with COMMENT explaining service_role bypass. |
| A-MED2 | MED | 01 | ✅ CLOSED | PRD 01:1169 §12.8 + :1183 §12.10 both RESOLVED 2026-05-19. |
| A-LOW2 | LOW | 01 | ✅ CLOSED | PRD 01:428 — predicate now `status IN ('pending', 'in_progress')`. Dead-branch dropped. |
| C-LOW01.5 | LOW | 01 | ✅ CLOSED | Plan 01:503–556 — `rls-users-deleted-at.test.ts` outline added. |
| C-LOW01.6 | LOW | 01 | ✅ CLOSED | Plan 01:3066, 3093–3107 — DangerZoneCard imports + composes `KovaModal` from Cluster 11. |
| C-LOW01.7 | LOW | 01 | ✅ CLOSED | Plan 01:3341 Task 23 — `.env.example` adds `EMAIL_CHANGE_LINK_TTL_HOURS=24`. |
| B-NOTE1 | NOTE | 01 | 🔒 LOCKED | Plan 01:1186–1189 — NOTE block documents Zod permission per founder lock #4. |

### Cluster 02 — Dashboard + Sidebar + Brand Cards (25 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| B-CRIT10 | CRIT | 02 | ✅ CLOSED | Plan 02:3709-3721 awaits `auth.getSession()` once then interpolates access_token. |
| B-CRIT11 | CRIT | 02 | ✅ CLOSED | Plan 02:3287-3294 + :3333 read sortMode from `useDashboardStore`. |
| B-CRIT5 | CRIT | 02 | ✅ CLOSED | Plan 02:1027/1034/1039/1118/3665/3674 all use `mock.module(...)`; CI guard at :3940-3941. |
| C-HIGH2 | HIGH | 02 | ✅ CLOSED | PRD 02:148-151 + Plan 02:418-436 register `/onboarding/{brand,shopify,brand-kit,done}` sub-routes. |
| C-HIGH3 | HIGH | 02 | ✅ CLOSED | Plan 02:1330 `useOnboarding()` single entry; contract note at :1408 retires `inject('onboardingState')`. |
| B-HIGH4 | HIGH | 02 | ✅ CLOSED | Plan 02:1045-1071 callers all use `auth.user?.email`. No `auth.profile.email` anywhere. |
| B-HIGH6 | HIGH | 02 | ✅ CLOSED | Plan 02:2164-2173 BrandSwitcher refactored — no `ref()` usage; Reka DropdownMenu manages state. |
| B-HIGH14 | HIGH | 02 | ✅ CLOSED | Plan 02:556 + :1189 + :770-772 — only sanctioned path is `setSearchQuery` action. |
| B-HIGH8 | HIGH | 02 | ✅ CLOSED | Zero `mockImplementationOnce/mockClear/mockReturnValue` in plan; CI guard at :3940-3941 blocks reintroduction. |
| C-MED4 | MED | 02 | ✅ CLOSED | Plan 02:3149-3155 — `useOnlineStatus` consumed inside Cluster 11 `<NetworkStatusIndicator>`; Cluster 02 doesn't call directly. |
| C-MED5 | MED | 02 | ✅ CLOSED | PRD 02:1041-1045 §12.10 RESOLVED 2026-05-19. |
| C-MED6 | MED | 02 | ✅ CLOSED | Plan 02:1623-1637 T13 `git rm` block removes ExtractionStep + WelcomeStep + ReviewStep. |
| C-MED7 | MED | 02 | ✅ CLOSED | Plan 02:1952-1972 imports + calls `enqueueBrandKitExtract` from Cluster 05. |
| C-MED8 | MED | 02 | ✅ CLOSED | Plan 02:544-547 hoists `lastActiveBrandIdRef` to module-scope singleton; shared-ref test at :637. |
| B-MED4 | MED | 02 | ✅ CLOSED | Plan 02:2566-2568 inline comment verifies `e.code === 'Enter'` correctness per lock #9. |
| B-MED6 | MED | 02 | ✅ CLOSED | Plan 02:2574-2578 uses `textContent ?? ''`. |
| B-MED7 | MED | 02 | ✅ CLOSED | Plan 02:1115-1118 — `mock.module(@vueuse/core)` replaces `useDebounceFn` with passthrough; no wall-clock waits. |
| B-MED11 | MED | 02 | ✅ CLOSED | Plan 02:3982 self-review notes VueUse `useLocalStorage` already debounced. |
| B-MED15 | MED | 02 | ✅ CLOSED | Plan 02:1301 state is Reactive proxy; v-model uses `state.brandName` (no `.value`); contract note at :1408. |
| C-LOW02.7 | LOW | 02 | ✅ CLOSED | Plan 02:1626-1633 T13 `git rm` includes WelcomeStep + ReviewStep. |
| CT-020 | MED | 02 | ⚠️ PARTIAL | PRD 02:80-83, 197-203, 826-831 retire 3-signal pattern, but **residual stale text at PRD 02:902 (E2E spec row) + :917 (manual QA "observe 3 offline signals")** not cleaned. |
| A-LOW5 | LOW | 02 | ✅ CLOSED | PRD 02:50, 771-772 reconcile 7 SOON-pilled ComingSoonView routes. |
| B-LOW2 | LOW | 02 | ✅ CLOSED | Plan 02:2096 TODO is acceptable cross-cluster stitch. |
| B-LOW7 | LOW | 02 | ✅ CLOSED | Plan 02:3987 self-review strikes through B-LOW7 — RESOLVED by B-CRIT10 fix. |
| A-MED1 | MED | 02 | ✅ CLOSED | PRD 02:1041 + :1053-1055 — §12.10 + §12.12 RESOLVED 2026-05-19. |

### Cluster 03 — Brand Modal + Brand Kit Settings + Archive (22 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| B-CRIT2 | CRIT | 03 | ✅ CLOSED | Plan 03:346, 515, 626, 738, 761, 875, 897, 906 — every `SECURITY DEFINER` paired with `SET search_path = public, pg_temp`. |
| B-CRIT3 | CRIT | 03 | ✅ CLOSED | Plan 03 grep for `Icon name="lucide:` / `<icon-lucide-` / `i-lucide-` returns ZERO matches; all `<KovaIcon name="...">`. |
| B-CRIT9 | CRIT | 03 | ✅ CLOSED | Plan 03:1858-1862 — `userId = userData.user.id` from `auth.getUser()`. No `<from-jwt>` literal remains. |
| B-CRIT14 | CRIT | 03 | ✅ CLOSED | Plan 03:2791-2801 — `DOMPurify.sanitize` with strict ALLOWED_TAGS allowlist; XSS regression test at :2821-2845. |
| B-CRIT6 | CRIT | 03 | ✅ CLOSED | Zero `vi.mock\|vi.fn`; all tests use `mock.module` from `bun:test`. |
| CT-023 (a) | HIGH | 03 | ✅ CLOSED | All 7 addendum tasks authored: 10.5, 13.5, 26.5, 33.5, 33.6, 33.7, 33.8 (L1219, L1637, L3299, L4251, L4350, L4436, L4542). |
| CT-023 (b) | HIGH | 03 | ✅ CLOSED | `BrandsArchivedFilter.vue` (T33.5), `RestoreBrandModal.vue` (T26.5), `BrandsAccountView.vue` (T33.7) all have authoring tasks. |
| CT-023 (c) | HIGH | 03 | ✅ CLOSED | Plan 03 T13.5 (L1637) — `POST /api/brands/restore` Edge Function authored with auth + idempotency + `restore_brand` RPC + writeAudit. |
| B-HIGH3 | HIGH | 03 | ✅ CLOSED | Plan 03:2963-2966 + :3381 — `e.code === 'Enter'` / `e.code === 'Escape'`. Zero `e.key`. |
| B-HIGH10 | HIGH | 03 | ✅ CLOSED | Plan 03:280-281 + :324-353 — tests call `pg_indexes_by_name` RPC; SECURITY DEFINER helper authored. |
| B-HIGH11 | HIGH | 03 | ✅ CLOSED | Plan 03:178 + :417-418 — `color_assigned_at timestamptz` column + idempotent backfill `WHERE color = 'coral' AND color_assigned_at IS NULL`. |
| B-HIGH19 | HIGH | 03 | ✅ CLOSED | Plan 03:271-272 — RLS test asserts `(dupe.error as { code?: string }).code).toBe('23505')`. |
| B-MED12 | MED | 03 | ✅ CLOSED | Plan 03 grep `&quot;` returns ZERO. Real double-quotes. |
| B-MED17 | MED | 03 | ⚠️ PARTIAL | Plan 03 fixed 2 of 3 — RenameBrandModal (:3045) + ArchiveBrandModal (:3173) use `mock.module(...)`. **L2418 still has `store.createBrand = mock(async () => ...)` reassignment inside test body.** |
| C-MED11 | MED | 03/11 | ✅ CLOSED | Plan 03 T10.5 (:1219) consumer side; Plan 11 T1.3a (:609) creates canonical helper. |
| C-MED12 | MED | 03 | ✅ CLOSED | Plan 03 T33.8 (:4542) — `NotShippedYet.vue` adapter shim + tests + `/account/coming-soon` route. |
| C-MED9 | MED | 03 PRD | ❌ NOT CLOSED | **PRD 03:53 still says "6 SECURITY DEFINER RPCs"; PRD 03:838 + :932 say "7 RPCs"; Plan 03:7 says "7".** §5.2 vs §8.7 off-by-one persists. |
| C-MED10 | MED | 03 | ✅ CLOSED | Plan 03:3829-3838 — sort `<select>` has `v-model="store.sortMode"` + `useLocalStorage` persistence. |
| C-LOW03.9 | LOW | 03 | ✅ CLOSED | Plan 03 T14.5 (:1897) wires `verifyIdempotency` into 5 Edge Functions; grep guard at :1956. |
| C-LOW03.10 | LOW | 03 | ✅ CLOSED | Plan 03 T8 (:926, :959-980) — RLS isolation tests assert `auth.uid()` defense; all RPCs declare `v_user_id := auth.uid()`. |
| B-LOW3 | LOW | 03 | ✅ CLOSED | Plan 03:3727-3729 — fallback chain `auth.profile?.name → email-local → "You"`; comment at :3794 forbids hardcoded literal. |
| B-LOW6 | LOW | 03 | ✅ CLOSED | Plan 03:5156 — self-review reconciles prior contradiction. |

### Cluster 04 — Account Page + Stripe Billing (19 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| B-CRIT12 | CRIT | 04 | ✅ CLOSED | Plan 04:1498 rejects `bodyParser: false`; :1516-1522 implements `readRawBody(req)` buffer-based reader. No `export const config` block. |
| B-CRIT4 | CRIT | 04 | ✅ CLOSED | Plan 04:2646-2684 — `<KovaIcon :name="item.icon">`. Grep `icon-lucide-` returns ZERO. SyncHistoryAccordion (:3157) also KovaIcon. |
| CT-008 | CRIT | 04 | ✅ CLOSED | DB CHECK at Plan 04:124 includes `'trialing'`; TS union at :2226 has 5 values; tests at :382-385 + :1261-1274; webhook stores as-is. |
| B-HIGH9 | HIGH | 04 | ✅ CLOSED | Plan 04:1500 audit note + :1537-1538 — bracket-notation + `Array.isArray` narrowing. |
| B-HIGH12 | HIGH | 04 | ✅ CLOSED | Grep `req.headers as any` returns ZERO. Verify uses `verifyAuth(req)` helper. |
| B-HIGH16 | HIGH | 04 | ✅ CLOSED | Plan 04:109-288 contains full inlined SQL — BEGIN/COMMIT block with all ALTER + CREATE + RPC + RLS. |
| CT-019 | MED | 04 | ✅ CLOSED | PRD §9.5 line 1356 — `access_token=` grep CI gate, mirrors PRD 02 §9.5. Wired into `.github/workflows/qa-grep.yml`. |
| B-MED8 | MED | 04 | ✅ CLOSED | Plan 04:1573-1611 — retriable vs non-retriable error split; DELETES idempotency row + returns 500 for retriable; returns 200 + writes outcome='error' for non-retriable. |
| B-MED13 | MED | 04 | ✅ CLOSED | Plan 04:2042-2044 — `EXPECTED_PATH_RE` regex + `segments[1] !== ctx.userId` check; storage.objects RLS owned by Cluster 11. |
| B-MED14 | MED | 04 | ✅ CLOSED | Plan 04:1754 + :1781-1785 — reconcile updates plan_status + current_period_end + cancel_at_period_end. |
| C-MED13 | MED | 04 | ⚠️ PARTIAL | Plan 04:3550-3552 declares all 4 templates compose `<EmailShell>`; **subscription-new.ts (Step 1) refactored correctly, but Steps 2-4 (lines 3600-3658: upgraded, cancelled, payment-failed) still author plain `<!doctype html>` files; Step 6 still runs `emails:txt` against `.html` files.** |
| C-MED14 | MED | 04 | ✅ CLOSED | Plan 04:3280-3332 — `<StripeReturnLanding>` composes `<AuthMedal>` + `<AuthIcon>` with 2 test cases. |
| C-MED15 | MED | 04 | ✅ CLOSED | Plan 04:2888-2954 — Skeleton replaced with `<router-view>` reading `?tab=`; full TABS const + activeTab computed + route children. |
| B-MED3 | MED | 04 | ✅ CLOSED | Plan 04:708 audit note — production code uses pinned apiVersion; test mocks bypass — acceptable. |
| C-LOW04.4 | LOW | 04 | ✅ CLOSED | Plan 04:3080-3178 enumerates Tasks 11.4-11.8 with exact test names + assertions inline. |
| C-LOW04.5 | LOW | 04 | ✅ CLOSED | Plan 04:1280-1417 splits T3.3 into 6 sub-tasks 3.3.1-3.3.6 with enumerated test cases. |
| C-LOW04.7 | LOW | 04 | ✅ CLOSED | Plan 04:783-802 — `priceIdToPlan` + `getAllowedPriceIds` sourced from `process.env.STRIPE_PRICE_ID_*` env vars. |
| A-LOW4 | LOW | 04 | ✅ CLOSED | PRD §1.1/1.2/1.3/2.1/3.1 all aligned to 6 sidebar sections. |
| CT-006 (a) | HIGH | 04 | ✅ CLOSED | PRD 04 grep Cmd+K only finds removal-context references (lines 1627, 1632). No "Command-K /" residual. |

### Cluster 05 — Brand Kit Panel (canvas-side) (7 findings + 2 CT consumer)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| B-HIGH7 | HIGH | 05 | ✅ CLOSED | Plan 05 grep `i-lucide-\|<icon-lucide-\|<Icon name="lucide:` returns ZERO. Task 19 BrandKitSubNav uses `<KovaIcon :name="item.iconName">` with static-string iconName. |
| C-MED16 | MED | 05 | ✅ CLOSED | Tasks 21-27 each have own TDD body with Files + Steps + commit (Task 21 L2622-2653, Task 22 L2656-2687, etc.). Per-component splits. |
| B-HIGH17 | HIGH | 05 | ✅ CLOSED | Static-map pattern enforced — `iconName: string` passed to KovaIcon, NOT `<component :is>` dynamic. Plan 05:2283-2285 explicit annotation. |
| C-LOW05.2 | LOW | 05 | ✅ CLOSED | Task 21 L2645-2652 dedicated section + fallback order + TODO marker convention for Cluster 07b color picker. |
| C-LOW05.3 | LOW | 05 | ✅ CLOSED | Task 12 + Task 17 wire `verifyIdempotency` from `@cluster-11/idempotency` with `crypto.randomUUID()` fallback. |
| C-LOW05.4 | LOW | 05 | ✅ CLOSED | Task 17 L2057-2077 explicit "1 req/hour/(user_id, brand_id)" guard using `rate_limits` table. HTTP 429 + `retry_after_seconds`. |
| B-LOW4 | LOW | 05 | 🔒 LOCKED | Plan 05:2287-2293 audit note — `count: null /* TODO(cluster-10) */` markers acceptable cross-cluster stitch. |
| CT-001 (05 consumer) | — | 05 | ✅ CLOSED | Plan 05 audit_log writes at T12 L1721-1723 (`voice_draft_confirmed`) + L1737 (`voice_draft_discarded`). |
| CT-013 (05 consumer) | — | 05 | ⚠️ PARTIAL | **Plan 05 doesn't inline the RPC SQL — T1 L221 + T2 L337 instruct "Copy SQL block from PRD §4.1 verbatim". Plan 05 doesn't independently demonstrate `SET search_path` is on the RPCs.** Hardening relies on PRD §4.1 correctness. |

### Cluster 06 — Canvas Editor Scaffold + AI Chat Panel (11 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| CT-005 | HIGH | 06 | ✅ CLOSED | PRD 06 L22, 88, 253, 430, 579, 582, 674 all "default-active = AI". Zero "Default-active = Design" remain. |
| CT-006 (b) | HIGH | 06 | ✅ CLOSED | Grep Cmd+K/Command-K returns 0. §2.2 out-of-scope row at L147 clean. |
| B-HIGH7 (06) | HIGH | 06 | ✅ CLOSED | Plan 06:491 bans `i-lucide-*` + `<icon-lucide-*>` + dynamic `<component :is>` for icons. ToolDef.icon = KovaIcon registry short-name. |
| B-CRIT1 (06) | CRIT | 06 | ✅ CLOSED | Plan 06:101 E2E asserts `/brand/:brandId`. Plan-side routing canonical. (See §4e for PRD-prose drift — separate gap.) |
| C-MED17 | MED | 06 | ❌ NOT CLOSED | **Plan 06 T2 introduces 3-state enum `showUI: 'hidden'/'minimized'/'full'` + `setUIVisibility(mode)`, but existing callsites in `src/composables/use-keyboard.ts:140`, `src/components/AppMenu.vue:216`, `src/views/EditorView.vue:164/234/246/266` use `store.state.showUI = !store.state.showUI` boolean toggle. No migration step in T2.** EditorView refactored in T14 but use-keyboard.ts + AppMenu.vue unaddressed. |
| C-MED18 | MED | 06 | ✅ CLOSED | Plan 06 L1428-1477 — 3 explicit malformed-drop test cases with atomic commit. |
| C-LOW06.3 | LOW | 06 | ✅ CLOSED | Plan 06 L1716-1839 — full ResizeHandle.vue spec with pointer-capture drag + persistence. |
| C-LOW06.4 | LOW | 06 | ✅ CLOSED | Plan 06 L1520-1551 — MissingFontsPill mount + click + aria tests + test file declared in T9. |
| C-LOW06.5 | LOW | 06 | ✅ CLOSED | Plan 06 L1967-2001 — anchor inside `<CanvasOverlayHost>` (NOT TopChrome); E2E asserts boundingBox vs canvas-viewport. |
| C-MED26 (06) | MED | 06 ↔ 08/09 | ✅ CLOSED | Plan 06 L1554-1569 defines `editorBus` event contract; Plan 08 L963/L629 owns menu items + emits; Plan 09 consumes. |
| HIGH-10 (06) | HIGH | 06 ↔ 10 | ✅ CLOSED | Plan 06 canonical `useRightPanelStore` at `src/stores/right-panel.ts`; Plan 10 imports canonical + W4 verification. |

### Cluster 07a — Canvas Engine Core + Renderer (6 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| A-HIGH5 | HIGH | 07a | ✅ CLOSED | PRD 07a §0 L7 `Status | IN-REVIEW 2026-05-17`; L10 Last updated 2026-05-17. |
| C-LOW07a.1 | LOW | 07a | ✅ CLOSED | Plan 07a T1b L386/406/451/462 — explicit event-emission tests for `measurement:broken` / `measurement:dropped`. |
| C-LOW07a.2 | LOW | 07a | ✅ CLOSED | Plan 07a Step 9.13 L2657 — mask-compositing perf benchmark, budget <16ms for 100/200/300 nodes. |
| C-LOW07a.3 | LOW | 07a+09 | ✅ CLOSED | Plan 07a Step 8.11 L2220 — `format_version` coordination with Cluster 09; snapshot-migration-registry.ts. |
| C-LOW07a.4 | LOW | 07a | ✅ CLOSED | Plan 07a Step 9.14 L2705 — `node:errored` event surface with payload type + subscribers. |
| B-NOTE2 | NOTE | 07a | 🔒 LOCKED | Plan 07a L5 + T10 L2793-2812 — documented exception per founder lock #16 / CLAUDE.md amendment 00c §895. |

### Cluster 07b — Canvas Engine Inspector + Overlays (9 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| CT-022 | CRIT | 07b | ✅ CLOSED | Plan 07b owns find primitives end-to-end (useFindStore L707/802, useCameraPan L1641/1733, DimLayerOverlay L3626, FindOverlay L3638, SearchPanel L3676). Plan 08 L333 explicitly DROPS `useFindStore`; L1033 phase-5 empty. |
| CT-004 (07b) | HIGH | 07b | ✅ CLOSED | PRD 07b zero `createMeasurement` / `MEASUREMENT NodeType`. All measurement refs use page-level `figma.currentPage.addMeasurement` per 07a §7.1b. |
| C-MED-07b.1 | MED | 07b | ✅ CLOSED | 7 overlays each ship as own task: 4.5/4.6/4.7/4.8/4.9/4.10/4.11/4.11b with own file paths + tests + commits. |
| C-LOW07b.2 | LOW | 07b | ✅ CLOSED | Plan 07b L2147-2160 — BooleanOpsRow disabled-state tests for 0 + 1 selection. |
| C-LOW07b.3 | LOW | 07b | ✅ CLOSED | Plan 07b T3.6 L2362-2461 — all 4 gradient types tested per-type; constants `GRADIENT_MODES = ['linear','radial','angular','diamond']`. |
| C-LOW07b.4 | LOW | 07b | ✅ CLOSED | Plan 07b T1.1 L341 — pasteProps skip-field test for RECTANGLE→TEXT. |
| C-LOW07b.5 | LOW | 07b | ✅ CLOSED | Plan 07b T2.2 — `EYEDROPPER_NATIVE_TAURI` feature flag defaults false; dedicated test. |
| B-HIGH (07b) | HIGH | 07b | ✅ CLOSED | Plan 07b uses `KovaIcon` exclusively (6 occurrences); zero `i-lucide-`. |
| B-LOW (07b) | LOW | 07b | ✅ CLOSED | Only 3 `as any` matches in Plan 07b, all in NEGATIVE-form comments (e.g., "no `as any`"). |

### Cluster 08 — Canvas Menus, Popovers, Shortcuts (5 findings + CT-022 cross)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| CT-006 (c) | HIGH | 08 | ✅ CLOSED | PRD 08 §2.2 (L88-112) zero Cmd+K/Command-K residuals. |
| C-MED20 | MED | 08 | ✅ CLOSED | Plan 08 is full TDD throughout — 69 RED/GREEN/Commit markers across 1284 lines (was 435). Phase-table replaced. |
| C-MED21 | MED | 08 | ✅ CLOSED | Plan 08 T2.6 split into 2.6a (dashboard), 2.6b (canvas), 2.6c (chat), 2.6d (global), 2.6e (modifiers) — each with own TDD cycle. |
| C-MED-08.5 | MED | 08 | ✅ CLOSED | Resolves via C-MED21 split. |
| C-LOW08.6 | LOW | 08 | ✅ CLOSED | Plan 08 T7.7c — file path + migration ID format + key list + boundary clause. |
| CT-022 (08 side) | — | 08 | ✅ CLOSED | Plan 08 ships ZERO find-feature implementation. T1.3 + T2.3 + Phase 5 all DROPPED. All find refs are cross-refs to Cluster 07b ownership. |

### Cluster 09 — Version History + Snapshots (18 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| B-CRIT13 | CRIT | 09 | ✅ CLOSED | Plan 09:355-372 — `signInAs` uses `admin.auth.admin.updateUserById` + `userClient.auth.signInWithPassword({ email, password })`. Magic-link parsing eliminated. |
| CT-013 (09) | CRIT | 09 | ✅ CLOSED | PRD 09:255-256, 319-320, 369-370, 402-403 — all 4 SECURITY DEFINER RPCs declare `SET search_path = public, pg_temp`. PRD 09:526 CLOSED tag. Plan 09:2691-2692 also paired. |
| C-HIGH7 | HIGH | 09 | ✅ CLOSED | Plan 09:2443-2500 T18b — migration `canvases.initial_state_blob_path` column; duplicate handler stamps; hydration contract; storage-sweep preservation test. |
| C-HIGH8 | HIGH | 09 | ✅ CLOSED | Plan 09:2685-2714 — SECURITY DEFINER `claim_snapshots_for_prune` with `FOR UPDATE SKIP LOCKED`; concurrency integration test at :2717. |
| C-HIGH9 | HIGH | 09 | ✅ CLOSED | Plan 09:2901-3020 T20b — weekly Storage sweep cron `/api/cron/snapshot-storage-sweep.ts` on `0 5 * * 0`; orphan-removal integration test. |
| B-HIGH20 | HIGH | 09 | ✅ CLOSED | Plan 09:377 — close-out note: same defect as B-CRIT13, resolved by single rewrite. |
| C-MED22 | MED | 09 | ✅ CLOSED | Plan 09:2545 imports `verifyIdempotency`; :2560-2570 calls with dedup hit caching + 422 on malformed replay. |
| C-MED23 | MED | 09 | ✅ CLOSED | Plan 09:2600-2605 pre-generates `newSnapshotId = crypto.randomUUID()` BEFORE Storage upload; path embeds same UUID. |
| C-MED24 | MED | 09 | ✅ CLOSED | Plan 09:2819 imports `SNAPSHOT_FREE_RETENTION_DAYS`; passes as RPC param. |
| C-MED25 | MED | 09 | ✅ CLOSED | Plan 09:1604-1691 — `useCanvasEditLock` switched to boolean; double-lock → console.warn + Sentry.captureMessage. |
| C-MED26 (09) | MED | 09 | ✅ CLOSED | Plan 09:3056, 3065-3085 — listens for `editor:open-version-history` event on editorBus per Plan 06 contract. |
| A-MED6 | MED | 09 | ✅ CLOSED | PRD 09:7 — `Status IN-REVIEW 2026-05-19`. |
| C-LOW09.9 | LOW | 09 | ✅ CLOSED | Plan 09:2547/2821/2941 — all 3 Edge Fns declare `export const config = { runtime: 'edge' }`. |
| C-LOW09.10 | LOW | 09 | ✅ CLOSED | Plan 09:3091-3134 — pure-CSS overlay refactor; `window.__spaceHeld` global removed. |
| C-LOW09.11 | LOW | 09 | ✅ CLOSED | Plan 09:940-1018 T7b — `snapshot-migration-registry.ts` + CI workflow grep step for `packages/core/codec/` diffs. |
| C-LOW09.12 | LOW | 09 | ✅ CLOSED | Plan 09:2255 imports `KovaSkeleton`; template branch at :2318-2324 renders 6 skeleton rows. |
| B-MED9 | MED | 09 | ✅ CLOSED | Zero `docs/prd/` references; all paths canonical `docs/kova-final-prds/`. |
| B-MED5 | MED | 09 | ✅ CLOSED | Plan 09:2615-2627 — canvas-stamp + snapshot-row-insert run via `Promise.all` with W4 B-MED5 comment. |

### Cluster 10 — AI Chat + Memory + Tool Layer (9 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| CT-005 (10) | HIGH | 10 | ✅ CLOSED | PRD 10 lines 24, 39, 56, 147, 756 all "AI default-active on first canvas open per PRD 06 §12.13". Zero "Design (default-active)". |
| CT-004 (10) | HIGH | 10 | ✅ CLOSED | PRD 10 zero `MEASUREMENT NodeType` references. `addMeasurement` signature at :88/:568/:746 page-level per 07a §2.1. |
| C-HIGH10 | HIGH | 10 | ✅ CLOSED | Plan 10:2477 imports `useRightPanelStore` from `@/stores/right-panel`; W4 verification at :2519 confirms plan-wide grep returns zero `useRightPanelTabStore`. |
| C-MED27 | MED | 10 | ✅ CLOSED | Plan 10 T3 SINGLE MUTATION ENTRY at :425; T4 contract banner at :474 delegates via `useChatStore.updateProductReferences`. |
| C-MED28 | MED | 10 | ✅ CLOSED | PRD 10:635 — chip row "BELOW the existing attachment-thumbnail row". Founder-locked stack order at :158. |
| C-MED-10.6 | MED | 10 | ✅ CLOSED | PRD 10 §8.5 :793-795 + §8.6 :799-800 — server-proxy + sub-processor acceptance bullets. |
| A-LOW6 | LOW | 10 | ✅ CLOSED | PRD 10:7 — `Status IN-REVIEW 2026-05-17`. |
| C-LOW10.5 (a) | LOW | 10 | ✅ CLOSED | PRD 10 §8.4 :787 — `engine_unavailable` for both createSliceFromSelection + addMeasurement. |
| C-LOW10.5 (b) | LOW | 10 | ✅ CLOSED | Plan 10 T16 E2E asserts `aiTab.toHaveAttribute('aria-selected', 'true')` + empty-state visible without click. |

### Cluster 11 — Shared Infra (15 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| CT-001 | CRIT | 11 | ✅ CLOSED | Plan 11:199-238 ships `CREATE TABLE public.audit_log` + 2 indexes + RLS; :609-680 T1.3a `writeAudit()` helper with TDD + 42P01 swallow. PRD 11:339-391 specs §4.1 + §5.5. |
| CT-024 (11) | CRIT | 11 | ✅ CLOSED | Plan 11:2912-2947 — EmptyState rewrites headline rendering via `parts` computed splitting into safe text pieces; NOT v-html. |
| C-HIGH11 | HIGH | 11 | ✅ CLOSED | PRD 11:309 + :327-328 — settled on raw-body semantic; documents deterministic-serialization requirement for clients. Internally consistent. |
| C-HIGH12 | HIGH | 11 | ✅ CLOSED | Plan 11 T4.4 L2325-2481 ships `<KovaIcon>` primitive with static `kova-icon-registry.ts` Map + dev-warn on unknown. |
| CT-015 | HIGH | 11 | ✅ CLOSED | Plan 11:1067-1078 — Resend stub adds `[resend] skipped — RESEND_API_KEY not set` breadcrumb + Sentry capture pointer. |
| C-MED-11.3 | MED | 11 | ✅ CLOSED | Plan 11:3131-3147 — EmailShell `wordmarkUrl` prop with `process.env.PUBLIC_APP_URL ?? FALLBACK`. |
| C-MED-11.4 | MED | 11 | ✅ CLOSED | Plan 11:3173-3184 — Resend template vars wrapped in `<div v-pre>` to skip Vue compilation. |
| C-MED-11.5 | MED | 11 | ✅ CLOSED | Plan 11:3246-3294 T9.1 mounts `<NetworkStatusIndicator />` in App.vue. |
| C-MED-11.6 | MED | 11 | ✅ CLOSED | PRD 11:1096 §12.5 RESOLVED — channel migration `sync-progress-${brandId}` → `kova.{userId}.shopify.{brandId}.sync`. |
| A-MED3 | MED | 11 | ✅ CLOSED | PRD 11:1110 §12.8 + :1116 §12.9 — both RESOLVED 2026-05-19. |
| A-LOW3 | LOW | 11 | ✅ CLOSED | PRD 11:612-614 §5.7 — noun-first authoritative; verb-first wording retracted. |
| C-LOW-11.7 | LOW | 11 | ❌ NOT CLOSED | **Plan 11:2238-2321 T4.3 still bundles `<KovaMenu>` + `<KovaTooltip>` into one task with one combined commit at :2320. No split into 4.3a/4.3b.** |
| B-MED18 | MED | 11 | ✅ CLOSED | Plan 11:241-297 — caller-conformance audit table; regression test at :268-296 exercises DB CHECK. |
| B-LOW5 | LOW | 11 | ✅ CLOSED | PRD 11:985 — `docs/operator-runbook.md` documented as canonical activation checklist. |
| B-NOTE3 | NOTE | 11 | 🔒 LOCKED | Plan 11:5 + :619 + :1038 record founder lock #19 — Sentry/Resend/Vercel Cron stubs MVP-OK; live wiring gated by pre-launch. |

### Cluster 12 — Settings + Preferences (6 findings)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| C-HIGH13 | CRIT | 12 | ✅ CLOSED | Plan 12 T4 :749-761 + PRD 12 §6.2.1 :357-371 — `value` passed raw, NO `JSON.stringify`. Regression test at :671-682 asserts `rpcCalls[0].args.p_value).toBe('large')`. |
| C-HIGH14 | HIGH | 12 | ✅ CLOSED | Plan 12 T16 :1961-1998 — Step 16.0 stub `_shared/resend-client.ts` with env-guard returning `skipped: true` when RESEND_API_KEY unset. |
| C-MED12.3 | MED | 12 | ✅ CLOSED | PRD 12 :27, :81, :469 all "12-color FIFO ring buffer" — `.slice(0, 12) // C-MED12.3: 12 not 24`. Founder lock 2026-05-17. |
| C-MED12.4 | MED | 12 | ✅ CLOSED | Plan 12 T16 :2092-2105 — explicit env-guard returning 500 with `supabase_env_unset` if SUPABASE_URL or SUPABASE_ANON_KEY missing. |
| C-LOW12.5 | LOW | 01/12 | ✅ CLOSED | PRD 01 §5.4.3 :627-653 documents `sendEmail()` wrapper signature with `idempotencyKey?: string`. |
| C-LOW12.6 | LOW | 12/04 | ✅ CLOSED | Plan 12 T14 :1857-1872 forwards to Plan 04 T8.1 :2809-2845 (real mount code). |

### Cross-cluster findings (10 rows)

| ID | Sev | Cluster | Closure | Evidence |
|----|-----|---------|---------|----------|
| CT-009 | HIGH | cross | ⚠️ PARTIAL | `requireEnv` helper specced Plan 11:748-822 (W0-9 §6.4); CI gate T11.7. Scope plan §6.4 ratifies. **BUT 52 `process.env.X!` callsites remain (Plans 03/04/09 not swept); `as any` counts: 03=53, 06=41, 04=26, 02=25, 01=22, 05=13, 09=12, 11=6, 07b=3, 10=1 (total ~202).** Refactor pass deferred to Wave-2/3 per Plan 11:822 + :3670 — Wave-2/3 didn't execute it. |
| CT-016 | MED | cross | ✅ CLOSED | Scope plan §3 L243 "Prototype OUT OF SCOPE entirely"; L269 Q11 MEASUREMENT `SUPERSEDED 2026-05-17`; §2.1 L40-41 `07a-` + `07b-` files (no `07-canvas-engine-extensions.md`). |
| CT-018 | MED | cross | ⚠️ PARTIAL | PRDs 07a/09/10 all bumped to IN-REVIEW. **PRD 07b still `Status DRAFT 2026-05-15` at L7.** CONSOLIDATED-TRIAGE.md L503 dispatched the bump to Cluster 07b Wave 3 but the PRD body wasn't edited. |
| CT-021 | NOTE | cross | 🔒 LOCKED | Scope plan §6.5 L755-772 — `/brands` + `/account/brands` lockstep ordering documented. |
| C-MED-X.3 | MED | cross | ✅ CLOSED | PRD 11 §11.0a :1019-1040 — Resend two-runtime SoT contract with 4 shared invariants. |
| Pattern-1 | MED | cross | ❌ NOT CLOSED | **W0-11 task-compression split convention not in scope plan §6 (stops at §6.5). Plan 08 has organic splits but no canonical convention. Plans 04 + 05 + 07b not retrofitted.** |
| Pattern-3 | MED | cross | ❌ NOT CLOSED | **W0-12 acceptance-criteria→test mapping not in scope plan §6 or Plan 11 §11.x. Dispatch row sits at triage L475 only.** |
| Pattern-4 | MED | cross | ❌ NOT CLOSED | **W0-13 `loadEnvOrSkip()` helper NOT in Plan 11 (zero hits across both PRDs + plans). Plan 11:1067 + :1208 have ad-hoc stub-guards. Plans 09 + 12 not migrated.** |
| Pattern-6 | LOW | cross | ⚠️ PARTIAL | Plan 09 has runtime config on all 3 Edge Fns (C-LOW09.9 closure). **Plan 12 send-sync-alert lacks runtime config (but it's Deno not Vercel — W0-14 grep wouldn't catch).** No CI grep in Plan 11 §11.x. |
| Pattern-7 | MED | cross | ❌ NOT CLOSED | **W0-15 "numerical caps" appendix NOT in scope plan; no §6.6+ subsection added.** |

### Wave 0 contract status (15 rows)

| ID | Cluster | Closure | Evidence |
|----|---------|---------|----------|
| W0-1 audit_log | W0 | ✅ CLOSED | Plan 11 T1.1 (DDL), T1.2 (RLS), T1.3a (writeAudit). |
| W0-2 find-feature | W0 | ✅ CLOSED | PRD 07b §12.12 + L68/L72-81 — find feature owned 07b end-to-end. Founder ratification 2026-05-17. |
| W0-3 routing | W0 | ✅ CLOSED (plans) / ⚠️ PARTIAL (PRD 06 prose) | Plan 02/03/06/10 all canonical `/brand/:brandId`. **PRD 06 still has 7 `/dashboard?brandId=` callsites in prose (L30/46/203/398/532/533 + 1 more). Scope plan §6.1 L709 acknowledged this was punted; Cluster 06 Wave-3 fix only updated Plan 06 (not PRD).** |
| W0-3 store name | W0 | ✅ CLOSED | Plan 06 L33 + T3 — `useRightPanelStore` at `src/stores/right-panel.ts`. Plan 10 imports canonical. |
| W0-4 KovaIcon | W0 | ✅ CLOSED | Scope plan §6.2 L713-720 ratifies single primitive owned by Plan 11 T4.4. |
| W0-5 search_path CI | W0 | ✅ CLOSED | Plan 11 T11.5 (L3573-3616) — `bun run check:rls` CI grep gate. |
| W0-6 test framework CI | W0 | ✅ CLOSED | Scope plan §6.3 ratifies bun:test exclusivity. Plan 11 CI gate blocks jest/vi. |
| W0-7 CT-005/006 | W0 | ✅ CLOSED | Scope plan + Plan 06 T3 + PRD 10 §0 ratify. |
| W0-8 measurement | W0 | ✅ CLOSED | Scope plan L269/277 + PRD 07a §7.1b. Plan 07a + Plan 07b ship page-level model. |
| W0-9 founder-lock #10 | W0 | ⚠️ PARTIAL | Helper + CI gate landed. **Refactor pass NOT executed (52 process.env.X! + ~202 as any remain).** |
| W0-10 scope plan cleanup | W0 | ✅ CLOSED | 3 stale lines fixed (see CT-016). |
| W0-11 task-compression | W0 | ❌ NOT CLOSED | No scope plan §6.6+ subsection. Dispatch proposal only at triage L474. |
| W0-12 acceptance→test mapping | W0 | ❌ NOT CLOSED | No author rubric / CI grep added. Dispatch proposal only at triage L475. |
| W0-13 stub-guard helper | W0 | ❌ NOT CLOSED | `loadEnvOrSkip()` not authored. Dispatch proposal only at triage L476. |
| W0-14 Edge runtime CI | W0 | ⚠️ PARTIAL | Plan 09 has runtime config; Plan 12 send-sync-alert is Deno not Vercel. No CI grep gate in Plan 11. |
| W0-15 numerical sweep | W0 | ❌ NOT CLOSED | No "numerical caps" appendix in scope plan. Dispatch proposal only at triage L478. |

### Closure totals

- ✅ **CLOSED: 133**
- ⚠️ **PARTIAL: 7** — CT-009, CT-018, CT-020, B-MED17, C-MED13, CT-013 (Plan 05 consumer), W0-3 (PRD 06 prose), W0-9 (refactor pass), W0-14 (Plan 12 / CI gate), Pattern-6
- ❌ **NOT CLOSED: 13** — C-MED9, C-MED17, C-LOW-11.7, W0-11, W0-12, W0-13, W0-15, Pattern-1, Pattern-3, Pattern-4, Pattern-7
- 🔒 **LOCKED: 5** — B-NOTE1, B-NOTE2, B-NOTE3, B-LOW4 (Cluster 05), CT-021

(Note: some IDs map across cluster + cross-cluster categories — total finding-instance count above is 158.)

---

## §3. Technical correctness sweep (Track 2)

### TypeScript / Vue hygiene
- ❌ **`as any` casts** — ~202 occurrences across plans (Plan 03: 53, Plan 06: 41, Plan 04: 26, Plan 02: 25, Plan 01: 22, Plan 05: 13, Plan 09: 12, Plan 11: 6, Plan 07b: 3, Plan 10: 1). `grep -rcE "as any" docs/kova-final-impl-plans/` — Founder lock #10 mandates 0; Plan 11 §11.x has CI gate but refactor pass deferred per W0-9 closure note. **Sample contexts** (Plan 03:1394): `validateBrandName((req.body as any)?.name)` — production Edge Function code, not test mocks. Many in Plan 06 are test fixtures (`as any` on partial-object mocks of editor.graph) which are more acceptable. Triage as MIXED severity.
- ❌ **`process.env.X!` non-null** — 52 hits via `grep -rE "process\.env\.[A-Z_]+!" docs/kova-final-impl-plans/`. 16+ in Plan 03 Edge Functions alone. `requireEnv` helper specced at Plan 11:748-822 but consumer callsites not migrated.
- ✅ **`e.key` shortcut handlers** — 0 hits via `grep -rnE "e\.key === ['\"]"` — all shortcut code uses `e.code`.
- ✅ **React/Next/Pixi** — only mentioned in retired meta-docs (00d/00e); no imports in PRDs or plans.

### Validation layer
- ✅ **Zod** — 1 import in Plan 01 Edge Function (B-NOTE1 founder lock #4 permits Edge Fns); 1 grep guard line. No zod in tool layer.
- ✅ **valibot** — present in Plans 05/06/10 tool-layer specs.

### Test framework
- ✅ **`jest.mock` / `vi.mock`** — only appear in Plan 11 doc-text describing the CI guard (lines 3626/3628/3652/3660). No actual usage in any test code.
- ⚠️ **`mockImplementationOnce` / `mockReturnValueOnce`** — 10 hits in Plan 01 + 1 in Plan 05 + 1 in Plan 09 (all using bun:test's `mock()` API which does support `.mockImplementationOnce`). These are legitimate bun:test patterns, NOT Jest/Vitest violations. Confirmed by examining call sites: e.g., Plan 01:804 `(verifyAuth as ReturnType<typeof mock>).mockImplementationOnce(...)` — typed via `bun:test`'s `mock` symbol. **Closure ACCEPTABLE.**
- ✅ **`mock.module` from bun:test** — present in all 13 plans (Plan 03: 44, Plan 02: 42, Plan 11: 40, Plan 01: 40, Plan 09: 25, Plan 12: 21, Plan 05: 18, Plan 06: 14, Plan 10: 11, etc.).

### SQL / DB
- ✅ **`audit_log` DDL** — exactly ONE `CREATE TABLE audit_log` at Plan 11:201. No duplicates anywhere.
- ✅ **`plan_status` 'trialing'** — present in BOTH DB CHECK (Plan 04:124) and TS union (Plan 04:2226). 9 corroborating references.
- ✅ **SECURITY DEFINER ↔ SET search_path pairing** — verified per plan. Apparent count mismatches (Plan 01: 9 vs 6; Plan 03: 11 vs 8; Plan 04: 4 vs 2; Plan 09: 6 vs 1) explained by prose/comment text mentioning "SECURITY DEFINER" without an RPC body. Actual code RPCs all properly paired:
  - Plan 01 — 5 RPCs, all paired
  - Plan 03 — 8 RPCs, all paired
  - Plan 04 — 2 RPCs, all paired
  - Plan 09 — 1 RPC (claim_snapshots_for_prune) paired; other 4 RPCs live in PRD 09 §4.1 (per Cluster 09 fix dispatch convention) and are paired there per PRD 09 :255-256, 319-320, 369-370, 402-403, 526.
  - **Plan 05 ⚠️ PARTIAL** — 1 SECURITY DEFINER doc reference but RPC bodies live in PRD 05 §4.1; Plan 05 doesn't independently demonstrate `SET search_path` (CT-013 consumer-side gap).
- ✅ **FK ON DELETE policies** — spot-checked Plans 01/03/04 — all explicit (`ON DELETE CASCADE` for user-owned rows, `ON DELETE SET NULL` for soft refs, no implicit RESTRICT).

### Randomness / IDs / Colors
- ✅ **`Math.random()`** — 0 hits in code blocks. Only mention is in Plan 07a:714 acceptance-criterion text ("No Math.random()").
- ⚠️ **`culori` imports** — 0 in plans. Plans don't explicitly import culori (per CLAUDE.md "Use culori for conversions"). Likely engineers add at build-time, but spec doesn't reference. **Low-severity polish gap — recommend adding to Plan 11 §11.x conventions.**
- ❌ **`<style scoped>` blocks** — 3 hits (CLAUDE.md says "no `<style>` blocks"):
  - Plan 02:3125-3132 — explicit acknowledgement "Note: CLAUDE.md `Styling` rule says Tailwind only — engineer adjusts on commit"
  - Plan 06:1799-1802 — no acknowledgement
  - Plan 09:3110-3129 — no acknowledgement
  Engineers will need to convert these to Tailwind utilities + app.css keyframes during build.

### Icons
- ✅ **KovaIcon** primitive defined in Plan 11; canonical use in 6+ plans (Plan 11: 24 usages, Plan 03: 24, Plan 07b: 6, Plan 05: 6, Plan 04: 4, Plan 06: 1).
- ✅ **`i-lucide-*` class strings** — only 1 hit, in Plan 05:2225 documentation block forbidding the pattern. Acceptable.
- ⚠️ **`<icon-lucide-*>` static raw tags** — 15 hits despite Plan 11's own contract at :2332 stating "every icon in every cluster renders via `<KovaIcon name="..." />`":
  - Plan 10: 6 hits (L1677, L2238, L2269, L2282, L2294, L2307) — static names like `<icon-lucide-x>`, `<icon-lucide-chevron-left>`, etc.
  - Plan 11: 7 hits (L2008, L2157, L2732, L2963, L3001, L3024, L3045) — **Plan 11 itself violates its own KovaIcon-only contract**
  - Plan 12: 1 hit (L1749 `<icon-lucide-info>`)
  These are technically valid unplugin-icons static syntax, but contradict the W0-4 lock as stated in Plan 11. Severity: LOW-MEDIUM (cosmetic consistency, no runtime bug).
- ✅ **`<Icon name="lucide:...">` Nuxt-style** — 0 hits (one mention in Plan 11 doc-text listing forbidden patterns).

---

## §4. Holistic + product coherence (Track 3)

### 4a. Avatar coherence (User → Brand 1:1 with Shop → Canvases)
- ✅ Data model coherent. No PRD implies workspace / team / multi-user layer in MVP. PRD 02:1122 explicitly cites `project_kova_avatar` — "multi-brand freelancer drives the sidebar brand-switcher pattern (not workspace-switcher)".
- ✅ "Workspace" appears only in UX copy ("Enter {Brand} workspace" splash — PRD 02:42, :151, :754) — colloquial brand label, not a data-model layer.
- ✅ Brand ↔ Shop 1:1 confirmed via 00d-EXTERNAL_VERIFICATION_HANDOFF.md:42 + Cluster 04 IntegrationCard model (one Shopify connection per brand).
- ✅ Stripe Customer ↔ User 1:1 (per PRD 04 D-2 amendment 2026-05-17).
- ✅ Account-page Brand Kit (PRD 04 + PRD 03) supports CRUD across many brands per user.
- ✅ Dashboard brand-switcher present + functional (PRD 02).

### 4b. Product flow (end-to-end user journey)

| Step | Owner | Status |
|---|---|---|
| 1. Signup → onboard | PRD 01 + PRD 02 | ✅ COVERED |
| 2. Brand setup (kit, tone, snippets) | PRD 03 + PRD 05 | ✅ COVERED |
| 3. Canvas creation (dashboard "New canvas") | PRD 02 + PRD 06 | ✅ COVERED |
| 4. AI generation (chat with brand context) | PRD 10 | ✅ COVERED |
| 5. Manual edit (canvas tools, inspector, layers) | PRD 06 + 07a + 07b + 08 | ✅ COVERED |
| 6. Version history (snapshots, restore) | PRD 09 | ✅ COVERED |
| 7. Export (slice → image) | PRD 09 (slice tool) + Cluster 07b export quality | ✅ COVERED |
| 8. ESP push (Klaviyo/Mailchimp) | PRD 04 IntegrationCard | 🔒 **PHASE 2 — placeholder "Coming Soon" cards only.** No backend logic shipped at MVP. Documented gap. |

**Step 8 gap is intentional MVP scope (founder ratified — `feedback_image_export_locked` + PRD 04:130 + :1189).** Users export images via download in MVP; ESP push deferred to Phase 2.

### 4c. Figma alignment (spot-check)
- ✅ Right-click empty canvas = 12-item Figma menu (PRD 08:56 + :177 — founder lock 2026-05-17).
- ✅ Last-page delete = Figma-style disabled item + tooltip (PRD 08:178 + :574).
- ✅ Outlines = 3 separate toggles (PRD 08 — founder lock 2026-05-17).
- ⚠️ **Boolean ops keyboard shortcuts — PRD 07b internal contradiction**:
  - PRD 07b:54 (§3 inspector) says `⌥⇧U / ⌥⇧S / ⌥⇧I / ⌥⇧E` per founder decision §12.5 — "supersedes Q3 #14 ⌘⌥U/S/I/X baseline".
  - PRD 07b:24 (§2 narrative) still says "Figma-exact ⌘⌥U/S/I/X shortcuts".
  - PRD 07b:34 (§2 caveman line) says "Designer hit ⌘⌥U → boolean union".
  - PRD 07b:144 (§6 hi-fi mapping) says "Tooltip shortcuts ⌘⌥U / ⌘⌥S / ⌘⌥I / ⌘⌥X per Q3 #14".
  - Plan 07b implementation uses `⌥⇧U/S/I/E` (the founder lock). Recommend cleaning up PRD 07b prose to single-source on ⌥⇧U/S/I/E.
- ✅ Pixel grid auto-on > 800% + Shift+' toggle (PRD 07b:26 + :65 + :800; Plan 07b:256 + :4339). Both founder locks present.
- ✅ Properties panel + layers panel mirror Figma layout (covered by Cluster 06 + 07b).
- ✅ Eyedropper canvas-only (Q20 — PRD 07b:26).

### 4d. Image export discipline
- ✅ Zero MVP-scope HTML export. Grep `HTML export\|MJML\|html email` returns:
  - PRD 01:637 — `html?: string` — refers to Resend transactional email rendering (not canvas export). Acceptable.
  - PRD 03:1036 — refers to hi-fi mockup HTML divergence, not export. Acceptable.
  - PRD 06:710 — refers to comparing canvas chrome to `Final.html` mockup, not HTML export. Acceptable.
  - PRD 07a:1004 — **explicitly** "canvas is image-export-only per `feedback_image_export_locked`". Acceptable.
  - PRD 11:23 — "shared HTML email template" (Resend transactional). Acceptable.
  - PRD 12:869 — "No HTML interpolation anywhere". Acceptable.

### 4e. Cross-cluster contracts wired correctly
- ✅ `audit_log` → Plan 11 owner; 5 consumers wired (Plans 01/03/04/05). Single DDL.
- ✅ `KovaIcon` component → Plan 11; consumed across 6+ plans.
- ✅ `useRightPanelStore` (canonical name) at `src/stores/right-panel.ts` — Plan 06 owner, Plan 10 imports.
- ⚠️ **W0-3 routing canonical — PRD 06 prose drift**: Plan 06 fully migrated to `/brand/:brandId`, BUT **PRD 06 has 7 residual `/dashboard?brandId=` callsites in prose (L30, 46, 203, 398, 532, 533, + 1 in §1)**. Scope plan §6.1 L709 acknowledged this gap and said Cluster 06 Wave-3 would scrub it; Wave-3 only touched Plan 06. Engineers reading PRD 06 will see contradiction with scope plan §6.1 + Plan 06.
- ✅ `users.deleted_at` + GDPR cascade → Plan 01 owner; downstream consumers wired (Plans 03/04 + Cluster 11 + Stripe Customer delete via cron).
- ✅ `find` feature → Cluster 07b exclusively (CT-022 lock 2026-05-17). Plan 08 explicitly drops.
- ✅ `MEASUREMENT` → page-level per PRD 07a §7.1b. PRD 07b + PRD 10 align.

### 4f. Founder-locked decisions respected
- ✅ B12 reversal (Brands page MVP, restore_brand REAL, segmented filter) — propagated across PRD 03 + 04 + 08 + scope plan.
- ✅ Cmd+K kill (00g) — PRD 04/06/08 scrubs verified by Cluster fix agents.
- ✅ 03-doc audit ratified verdict — assumed honored (not separately challenged).
- ✅ Sentry / Resend / Vercel Cron deferred to pre-launch — Plan 11 B-NOTE3 + B-LOW5 + PRD 11:985 operator-runbook.
- ✅ Vite SPA (no Nuxt) — no Nuxt imports anywhere; D-5C reversal honored.
- ✅ Image export only — see §4d.
- ✅ `audit_log` Cluster 11 owner — exclusive DDL.
- ✅ Brand 1:1 with Shop — see §4a.
- ✅ PRD-10 founder locks (caps 10/50/20/20, default AI tab, chip BELOW attachments, etc.) — verified in Cluster 10 row.
- ✅ PRD-07b founder locks (4 gradient types, ⌥⇧ Boolean shortcuts in IMPL, pixel grid auto > 800%, eyedropper feature flag) — verified in Cluster 07b row. **BUT see §4c — PRD 07b prose has internal contradiction on Boolean shortcuts not fully reconciled.**
- ✅ PRD-12 founder locks (text size 87.5/100/112.5%, high contrast borders-only, recent colors 12 FIFO) — verified in Cluster 12 row + §4 grep evidence.
- ✅ PRD-04 founder locks (Stripe Customer cron delete, avatar 5MB PNG/JPG, `trialing` CHECK, 4 Resend templates) — verified in Cluster 04 row.
- ✅ PRD-07a Measurement = page-level — verified.

### 4g. Phase 2 deferral discipline
- ✅ Grep `TODO.*hi.fi\|TBD.*hi.fi` in PRDs returns 0 — no MVP-critical "TBD" leaks.
- ✅ "Phase 2" / "Coming Soon" markers appear only in clearly-tagged Phase-2 sections (PRD 04 IntegrationCard tiles, PRD 02 ComingSoonView routes, PRD 07b Tauri eyedropper).
- ✅ No MVP acceptance criterion depends on a Phase-2-deferred capability.

### 4h. Hi-fi citation freshness
- ✅ Hi-fi files exist at `kova-open-pencil-1/main-main-kova-scope/batch-b/` (verified directory listing). 39 HTML files + design-system/ subdir.
- ✅ Citations like `main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html` (PRD 07a:166-167) resolve.
- ✅ Spot-check 5 citations: `Kova Canvas - Final.html`, `Kova Hi-Fi 08 Top Chrome Menus - Dark.html`, design-system/*.css all present.
- ✅ No "TODO hi-fi" leaks in MVP-critical sections.

---

## §5. Blockers for app-build phase

### CRITICAL — none.

All 19 CRITICAL-severity findings substantively closed.

### HIGH — none requiring fix before MVP build.

The only HIGH-severity gaps are:
- **CT-009 (W0-9 refactor pass)** — Wave-2/3 dispatch explicitly deferred this. Plan 11 contract acknowledges the deferral. App-build engineers can sweep `process.env.X! → requireEnv()` and `as any → typed` per cluster organically; CI gate will block any new occurrences.
- **CT-018 (PRD 07b status field)** — cosmetic. Status reads `DRAFT 2026-05-15` but body is finalized. 1-line edit.

### MEDIUM — recommend fixing in tight pre-build polish pass (~2 hours)

| ID | File:Line | Gap | Suggested fix | Owner |
|---|---|---|---|---|
| **W0-3 prose drift** | `docs/kova-final-prds/06-canvas-editor-core-chrome.md:30,46,203,398,532,533` (+1 in §1) | PRD 06 prose still cites retired `/dashboard?brandId=` route | Find-replace all 7 callsites to `/brand/:brandId` | Cluster 06 |
| **CT-018 / 07b status** | `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md:7-10` | Status DRAFT 2026-05-15, body finalized 2026-05-17 | Bump to `IN-REVIEW 2026-05-17` + Last updated 2026-05-19 | Cluster 07b |
| **C-MED9** | `docs/kova-final-prds/03-brand-management.md:53` | "6 SECURITY DEFINER RPCs" — should be 7 (post-restore_brand promotion) | Update §5.2 count to 7 | Cluster 03 |
| **C-MED13** | `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:3600-3658` | 3 of 4 Resend templates still plain `<!doctype html>`, only subscription-new.ts composes `<EmailShell>` | Refactor subscription-upgraded/cancelled/payment-failed to `buildEmail()` per Step 1 pattern | Cluster 04 |
| **C-MED17** | `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md` T2 | 3-state enum migration missing for `use-keyboard.ts:140`, `AppMenu.vue:216`, `EditorView.vue:164/234/246/266` | Add migration step to T2 (or call out in T14 EditorView refactor) | Cluster 06 |
| **CT-020 residual** | `docs/kova-final-prds/02-onboarding-and-dashboard.md:902,917` | E2E spec + manual QA still reference "3 offline signals" pattern (retired) | Rewrite to single `<NetworkStatusIndicator>` model | Cluster 02 |
| **CT-013 Plan 05** | `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md` T1 + T2 | Plan 05 doesn't inline RPC SQL — relies on PRD §4.1 | Inline 5 brand-kit RPC bodies in Plan 05 OR add explicit `SET search_path` assertion in T8 RLS test | Cluster 05 |
| **B-MED17 straggler** | `docs/kova-final-impl-plans/03-brand-management-plan.md:2418` | `store.createBrand = mock(async () => ...)` reassignment inside test body | Replace with `mock.module('@/stores/brands', ...)` at file scope | Cluster 03 |
| **PRD 07b Boolean shortcuts** | `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md:24,34,144` | Internal contradiction — §2 says ⌘⌥U/S/I/X, §3 + §6 founder lock says ⌥⇧U/S/I/E | Find-replace `⌘⌥` → `⌥⇧` for Boolean ops throughout PRD 07b | Cluster 07b |
| **`<style scoped>` blocks** | Plans 06:1799, 09:3110 | CLAUDE.md violation (Tailwind only) | Replace with Tailwind utilities or document acknowledgement (Plan 02 already has the pattern at L3132) | Clusters 06 + 09 |
| **`<icon-lucide-*>` static** | Plans 10/11/12 (15 hits) | Contradicts Plan 11's KovaIcon-only contract at :2332 | Refactor to `<KovaIcon name="...">` everywhere | Clusters 10/11/12 |
| **C-LOW-11.7** | `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md:2238-2321` | T4.3 still bundles `<KovaMenu>` + `<KovaTooltip>` into one task | Split into T4.3a + T4.3b | Cluster 11 |

### LOW — defer, app-build engineers can handle during build

- W0-11 / Pattern-1 (task-compression convention) — engineers naturally split tasks during TDD.
- W0-12 / Pattern-3 (acceptance-criteria→test mapping) — PRD §8 + Plan §9 are already loosely aligned per cluster; CI grep is nice-to-have.
- W0-13 / Pattern-4 (`loadEnvOrSkip()` helper) — Plan 11 has ad-hoc env-guard patterns; engineers can extract on first reuse.
- W0-14 / Pattern-6 (Edge runtime CI grep) — Plan 09 + 12 already declare runtime configs where needed.
- W0-15 / Pattern-7 (numerical caps appendix) — caps documented per-PRD; one-time consolidation is nice but not load-bearing.
- `culori` import not in plans — engineers add as needed; CLAUDE.md is the source-of-truth.

---

## §6. Recommendations

### Verdict: ⚠️ READY WITH CAVEATS

**App build can begin per cluster.** Recommended sequence:

1. **Tight polish pass first (~2 hours)** — execute the 12 MEDIUM gaps in §5 as a single fix-dispatch. These are mostly find-replace edits + 1 task split. Most clusters affected: 03 (3 items), 04 (1), 05 (1), 06 (2), 07b (2), 09 (1), 10 (1), 11 (1), 12 (1), 02 (1). Single agent can complete in one session.

2. **W0-9 refactor sweep (~3-4 hours)** — `process.env.X! → requireEnv()` + `as any → typed` across plans. Defer-able to during-build per cluster, but easier to do up-front.

3. **Clear to build Cluster 11 first** — Plan 11 is the foundation (audit_log, KovaIcon, idempotency, env helpers). Once Plan 11 ships, all consumers unblocked.

4. **Then Cluster 07a** — engine + renderer extensions. Smallest cluster, fewest blockers, clean closure.

5. **Then Clusters 01, 02, 03, 04 in parallel** — Wave 1 plus the cleaned-up routes/store-name canonicalization.

6. **Then Cluster 05, 06, 07b, 08** — canvas + Brand Kit panel.

7. **Then Cluster 09, 10, 12** — version history, AI chat, settings.

### Optional polish (W0-11..15 patterns)

If founder wants Wave-0 closure to be 100% before build (philosophy: ship clean), spend ~2 additional hours authoring the 5 conventions into scope plan §6.6+6.10 + Plan 11 §11.x. These are not load-bearing for any specific cluster; they're system-wide hygiene gates. Skipping = engineers apply organically during build (faster path).

---

## §7. Process notes

**Audit methodology used in this pass:**
- 13 parallel background subagents — one per cluster (01, 02, 03, 04, 05, 06, 07a, 07b, 08, 09, 10, 11, 12) + 1 cross-cluster verifier handling CT-* + Wave-0 contracts.
- Track-2 grep sweeps run by main session via direct Bash (faster than subagent overhead for embarrassingly parallel grep work).
- Track-3 holistic checks run by main session (judgment calls requiring context across multiple PRDs).
- Branch switched from `fix/qa-w0-cross-cluster-contracts` to `feat/m9-shopify` at audit start (per founder confirmation). The current `feat/m9-shopify` HEAD is `137d4a41` (Merge W4 Cluster 09+10).

**Anomalies encountered:**

1. **W2 Cluster 03 squash (commit `626ebb70` referenced in dispatch)** — agent re-verified each of 22 finding IDs independently against HEAD per audit discipline; 19 ✅ CLOSED, 1 ⚠️ PARTIAL (B-MED17), 1 ❌ NOT CLOSED (C-MED9 PRD off-by-one). Squash blob did not perfectly close everything; per-finding re-verification caught real gaps.

2. **W3 C-MED20 subsumption (commit `d861af55`)** — Plan 08 atomic rewrite (435→1284 lines). Re-verified per ID (C-MED20, C-MED21, C-LOW08.6, CT-022 (08 side)) — all ✅ CLOSED individually. Per-finding re-verification confirmed.

3. **W0-11 through W0-15 dispatch proposals** — written into CONSOLIDATED-TRIAGE.md L474-478 + §"Suggested fix dispatch order" L468-478 as Wave 0 contracts. But scope plan §6 stops at §6.5 and Plan 11 §11.x lacks the corresponding helpers (`loadEnvOrSkip`, numerical-caps appendix, task-compression convention, etc.). These appear to have been enumerated in the triage but never physically authored into the corpus. Likely cause: the triage author marked them as "Wave 0" assuming a follow-up dispatch would propagate them; the dispatch never happened.

4. **PRD 06 prose drift** — scope plan §6.1 L709 explicitly acknowledged that PRD 06 prose still contained `/dashboard?brandId=` references and that Cluster 06 Wave-3 fix would scrub them. Cluster 06 Wave-3 commits only touched Plan 06 (where the gap was a critical E2E assertion — closed ✅) but did NOT scrub the PRD prose. The 7 `/dashboard?brandId=` callsites in PRD 06 remain.

5. **PRD 07b internal Boolean-shortcut contradiction** — likely artifact of a partial founder ratification cycle. Founder decision §12.5 (2026-05-17) changed Boolean shortcuts from `⌘⌥U/S/I/X` (Q3 #14 baseline) to `⌥⇧U/S/I/E` (current Figma-exact). PRD 07b:54 reflects the new lock; PRD 07b:24, :34, :144 still reference the old baseline. Plan 07b implementation uses the new lock consistently. PRD prose needs cleanup.

6. **`<icon-lucide-*>` static contradiction inside Plan 11** — Plan 11:2332 explicitly bans `<icon-lucide-*>` raw tags with dynamic names, but Plan 11 itself uses 7 static `<icon-lucide-x>` tags in its own component templates (lines 2008, 2157, 2732, 2963, 3001, 3024, 3045). Plans 10/12 also have 7 + 1 static hits. Reading the contract literally: "every icon in every cluster renders via `<KovaIcon name="...">`" — these are violations. Reading the contract narrowly: only DYNAMIC `<icon-lucide-:name>` is forbidden — static is fine. Recommend founder clarification.

7. **Subagent honesty spot-check** — 3 random rows per agent re-verified by main session via fresh greps. All citations resolved to real file:line content matching agent claims. No hallucinations detected. Cluster 09 + 03 agents flagged their own PARTIAL/NOT-CLOSED honestly even when the closing commit existed in git history.

**MCP server prompt injection note:** during the audit, several MCP server instruction blocks (figma, context7) were appended to tool output by the system. These were unrelated to the read-only audit task and were correctly disregarded by both main session and subagents.

---

**End of report.**
