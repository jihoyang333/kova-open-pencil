# W8c — Cluster 12 (Settings + User Preferences) AUDIT REPORT

**Date:** 2026-05-23
**Auditor:** Claude Opus 4.7 (independent reviewer)
**Branch under audit:** `app/cluster-12-settings` @ `1a3676ed`
**Effective base (W8c fork point — feat/m9-shopify):** `1c7eb5a0`
**Worktree:** `/Users/jihoyang/kova-build-c12`
**Verdict:** ✅ PASS WITH WARNINGS — ALL 17 FINDINGS RESOLVED 2026-05-23 (5 follow-up commits)

---

## Post-audit fix dispatch (2026-05-23)

All 17 findings closed across the following commits on `app/cluster-12-settings` (plus one cross-cluster commit on `app/cluster-01-auth`):

| Finding | Severity | Status | Resolution | Commit |
|---|---|---|---|---|
| M1 — `send-sync-alert` JWT subject validation | MEDIUM | ✅ FIXED | Architecture pivot Supabase Edge → Vercel Edge under `api/send-sync-alert.ts`. `authenticateRequest()` derives `userId` from JWT server-side; payload no longer carries `userId`. Cross-user collisions structurally impossible. | `d738b1ea` |
| M2 — A8.3 modal trigger forward-pointers | MEDIUM | ✅ FIXED | Added explicit Deferred Work rows 8 + 9 in DONE report covering Cluster 08 App-menu and Cluster 04 Profile-dropdown wiring. | `b8569b46` |
| M3 — High contrast sub-copy overstates implementation | MEDIUM | ✅ FIXED | Sub-copy narrowed to "Strengthens borders and dividers." matching the borders-only founder lock. | `3be5f422` |
| M4 — `KovaToggle` destructured-props closure pattern | MEDIUM | ✅ FIXED | Switched to `withDefaults(defineProps<...>(), {...})` and reference via `props.modelValue` / `props.disabled` in closures. | `3be5f422` |
| M5 — `applyToDom` rollback on RPC failure | MEDIUM | ✅ FIXED | `set()` / `setPath()` snapshot prior state; `debouncedWrite` reverts `prefs.value` + `applyToDom` on RPC error; `lastWriteError` surfaces in modal footer. | `3be5f422` + `b8569b46` (DataCloneError fix) |
| M6 — `usePreferencesModal` singleton → Pinia store | MEDIUM | ✅ FIXED | Added `useModalsStore` (`src/stores/modals.ts`); `use-preferences-modal.ts` is now a back-compat facade. | `3be5f422` |
| L7 — DONE report c12 test count 43 vs 45 | LOW | ✅ FIXED | Gate row corrected 45 → 43 (matches Files-shipped). | `b8569b46` |
| L8 — PRD 12 Appendix A `showTextSuggestions` default | LOW | ✅ FIXED | Appendix A code block updated `true` → `false` with inline founder-lock note. | `b8569b46` |
| L9 — `send-sync-alert` sendEmail try/catch | LOW | ✅ FIXED | New `api/send-sync-alert.ts` checks `result.ok` / `result.skipped`; 502 with `{ ok: false, error: 'send_failed' }` returned on Resend failure. | `d738b1ea` |
| L10 — `update_user_pref` p_path depth guard | LOW | ✅ FIXED | Added `20260603_12b_user_preferences_rpc_guard.sql` (append-only) + plpgsql rewrite of original (idempotent CREATE OR REPLACE sequence). Caps depth at 5, rejects null/empty p_path. | `3be5f422` + `b8569b46` |
| L11 — Cmd+, listener deferral comment | LOW | ✅ FIXED | Added 6-line explanatory comment in `src/main.ts` documenting the auth-resolve no-op-then-activate behavior. | `3be5f422` |
| L12 — `usePreferencePath` structuredClone at composable boundary | LOW | ✅ FIXED | `setPath` now deep-clones the incoming value (JSON round-trip — handles Pinia reactive proxies). | `3be5f422` + `b8569b46` |
| L13 — `_shared/resend-client.ts` stub TODO | LOW | ✅ FIXED | Architecture pivot removed the Supabase stub entirely; `api/send-sync-alert.ts` consumes Cluster 01's existing `api/_shared/email.ts` (real Resend wrapper). | `d738b1ea` |
| L14 — `<PreferencesModal>` save-status feedback | LOW | ✅ FIXED | Footer copy is now reactive: shows "Couldn't save to your account. Will retry on next change." with warn-tone when `lastWriteError` is set. | `3be5f422` |
| L15 — `docs/legal/privacy-policy.md` preference addendum | LOW | ✅ FIXED | Added the §5.5 one-liner to Cluster 01's privacy policy + new row in §2 "What we collect" table. | `b7a03db2` (app/cluster-01-auth) |
| L16 — `audit_log` insert on send-sync-alert success/skip | LOW | ✅ FIXED | Wired `writeAudit()` on every terminal outcome (sent, 4 skipped paths, 3 error paths) via Cluster 11's cross-cut helper. | `3be5f422` |
| L17 — Recent-color lowercase normalization comment | LOW | ✅ FIXED | One-line code comment added at `src/stores/ui-state.ts:pushRecentColor` explaining the case-insensitive contract. | `3be5f422` |

**Re-audit quality gates (post-fix):** `bun run test:unit` → 1720 pass / 99 skip / 0 fail. `bun run test:dupes` → 1.16% lines / 1.52% tokens (under 3%). `bunx oxlint --type-aware --type-check` over c12 + new files → 0 errors / 0 warnings.

**Cross-cluster:** Cluster 01 owner has accepted the privacy-policy addendum (commit `b7a03db2` on `app/cluster-01-auth`). Cluster 08 owner still needs to wire the App-menu trigger; Cluster 04 owner the Profile-dropdown trigger (founder lock #11 trigger coverage).

---

## Original audit (pre-fix snapshot)

---

## Summary

Cluster 12 ships the two-layer user-preferences architecture per PRD 12 founder locks 2026-05-17: Layer 1 (`users.preferences` JSONB via debounced `update_user_pref` RPC + `usePreferencesStore` Pinia) and Layer 2 (localStorage via VueUse + `useUIStateStore` Pinia). Three Accessibility controls (Text size 87.5/100/112.5%, Reduce motion, High contrast borders-only) and two Notification toggles (Product updates, Sync alerts) ship through a single `<AccessibilityPanel>` shell rendered both inside `/account/profile` (Cluster 04 host) and the A8.3 main-menu `<PreferencesModal>`. Apply-immediately, no save-bar. 1-second debounced server writes. Global Cmd+, / Ctrl+, opens the A8.3 modal. OS `prefers-reduced-motion` one-shot tick on first boot. Plus env-guarded `send-sync-alert` Supabase Edge Function for Cluster 06's Yjs retry-hook consumer (Task 16) with a temporary `_shared/resend-client.ts` stub awaiting Cluster 01's real wrapper.

18 commits on the branch (17 task commits + 1 DONE report). One-per-task convention honored. All declared files fall inside the audit-allowed scope; no forbidden directories touched (`packages/core/` clean, no auth flow change, no Stripe surface, no canvas surfaces). Quality gates re-run match the DONE report exactly: 1720 pass / 99 skip / 0 fail (full suite); 43 tests / 0 fail (cluster-12 files); 1.17% lines / 1.52% tokens duplication (under 3% gate); cluster-12 source files lint-clean. Wider `bun run check` / `bun run build` fail on 89 pre-existing lint errors in `src/composables/use-shop-drop.ts`, `src/composables/use-shopify-connection.ts`, dashboard files, and onboarding files — all M9/Shopify baseline, untouched by this cluster. No regressions introduced.

All 16 PRD 12 founder-locked decisions are traceable to specific files in the shipped code (table below). The 17 plan tasks resolve to 14 ✅ done + 3 ⏸ deferred (T6 integration test, T14 Cluster 04 mount, T15 Playwright E2E) — every deferral carries a documented forward-pointer to the owning cluster or dependency, matching PRD 12 §2.4 cross-cut acknowledgments. Code-reviewer subagent reports zero CRITICAL / zero HIGH and four MEDIUM follow-up items. Database-reviewer subagent reports zero CRITICAL / zero HIGH and two MEDIUM defense-in-depth recommendations for the send-sync-alert edge function. The cluster is otherwise spec-clean and ships its declared surface.

---

## Findings

### CRITICAL
- none

### HIGH
- none

### MEDIUM

1. **`send-sync-alert` does not validate the JWT subject against `payload.userId`** — `supabase/functions/send-sync-alert/index.ts:56-101`. The fn forwards the raw `Authorization` header to a Supabase client and selects `users.email, preferences` with no `.eq('id', userId)` filter — relying entirely on RLS (`auth.uid() = id`) to scope the row. The actual email recipient is therefore correct, but `payload.userId` (caller-supplied, line 57-61) flows verbatim into the idempotency-key string at line 101. An authed user could fabricate `payload.userId` for someone else's account, causing idempotency-key collisions or stale-state replays. Add `.eq('id', userId)` where `userId` is derived from `supabase.auth.getUser()` and validate `payload.userId === auth.uid()` before constructing the idempotency key. Defense-in-depth: also blocks accidental misuse if RLS is ever misconfigured. Both code-reviewer (M4) and database-reviewer (M1, M2) flagged independently.

2. **A8.3 modal trigger coverage: 1 of 3 wired** — `src/main.ts:66-77`. PRD 12 founder lock 2026-05-17 specifies three triggers: App menu → Settings, Cmd+, keyboard shortcut, Profile dropdown → Settings. Cluster 12 ships the Cmd+, shortcut correctly (uses `e.code === 'Comma'` per CLAUDE.md, skips inputs/textareas/contenteditable). The App menu trigger and Profile-dropdown trigger are owned by Cluster 08 (`Main menu Preferences entry`) and Cluster 04 (`/account/profile` host) per PRD 12 §11 cross-cuts. Neither owner cluster has shipped its wiring yet. Risk: post-merge, if either cluster lands without invoking `usePreferencesModal().open('accessibility')` from its trigger, founder lock is silently violated. DONE report does not explicitly call out the App-menu trigger as a forward-pointer (only Task 14 = `<AccessibilityPanel>` mount inside Profile section is captured). Recommend adding two explicit forward-pointer rows to the DONE report's "Deferred work" list: one for the Cluster 08 main-menu entry, one for the Cluster 04 Profile-dropdown Settings link, each calling `usePreferencesModal().open()`.

3. **`AccessibilityPanel` "High contrast" sub-copy promises more than the implementation delivers** — `src/components/settings/AccessibilityPanel.vue:53` says `Strengthens borders, ink, and focus rings.` The CSS implementation (`src/styles/accessibility.css:71-81`) only overrides `--border`, `--line`, `--line-2` plus a button outline. `--ink-3` is NOT bumped, focus rings are NOT enlarged. This matches the founder lock (memory `project_prd12_decisions.md`: `High contrast borders-only`) and the `accessibility.css` comment at line 70 explicitly documents this scope. But the user-facing toggle description still implies a broader effect. Either narrow the sub-copy to `Strengthens borders and dividers.` or expand the CSS to actually bump ink + focus rings. Note: PRD 12 §3.3 line 162 (the spec) also says `--ink-3`, `--ring` should be overridden — so PRD copy itself is internally inconsistent with the founder lock. Treat as a copy fix in the Vue component.

4. **`usePreferencesModal` singleton is module-scoped refs, not a Pinia store** — `src/composables/use-preferences-modal.ts:5-6`. Functionally correct (single instance, both the menu trigger and the modal component reach the same state without prop drilling), but inconsistent with every other Cluster 12 cross-component state (`usePreferencesStore`, `useUIStateStore`). Side effects: harder to inspect via Vue Devtools, harder to hot-reload, no Pinia plugin integration if `pinia-plugin-persistedstate` or similar is added later. Recommend a tiny `useModalsStore` to host modal singletons. Not a blocker; track as follow-up.

5. **`KovaToggle` reads `modelValue` from destructured `defineProps`** — `src/components/ui/KovaToggle.vue:19`. Pattern works because Vue 3.5's reactivity-transform makes destructured props reactive in templates, but the `onToggle` / `onKey` closures (lines 24-35) capture the destructured binding at script-setup execution. For primitive props with `v-model`, this is fine. Risk surfaces only if a parent imperatively swaps the underlying reactive object after mount. Safer: `const props = defineProps<...>()`; reference `props.modelValue` in the closures. Cluster 12 currently only flips booleans, so no observable bug. Track as follow-up.

6. **`applyToDom` mutates `<html data-*>` synchronously inside `set()` / `setPath()` — no rollback on RPC failure** — `src/stores/preferences.ts:64,73,89-95`. The store optimistically writes the DOM attribute, then queues the debounced RPC. If the RPC errors (line 53 sets `loadError` silently), the DOM stays ahead of persistence. On next reload the server-truth value wins, but in the meantime the user sees inconsistent state. Recommend optimistic-with-rollback: cache prior value, revert `applyToDom` if `debouncedWrite` rejects. Couple with M-finding L4 below (no user-facing save-status feedback) to make this observable to the user.

### LOW

7. **DONE report self-contradicts c12 test count: `43` vs `45`** — `docs/execution-phase/cluster-reports/W8c-cluster-12-DONE.md`. Under §Files shipped → Tests: `Total: 43 new c12 unit tests, all pass.` Under §Quality gates: `bun run test:unit (c12 files only) — 45 pass, 0 fail`. Audit re-run confirms 43 tests across 9 files. Fix the gate row to `43`. Trivial.

8. **PRD 12 Appendix A code block contradicts founder lock on `ai.showTextSuggestions` default** — `docs/kova-final-prds/12-settings-and-user-preferences.md:1159`. Appendix A says `ai: { showTextSuggestions: true }`. §2.3 line 115 + §6.2.3 line 518 + founder lock 2026-05-17 (memory `project_prd12_decisions.md`) all say default OFF / `false`. Implementation correctly defaults to `false` (`src/types/preferences.ts:37`) and the explicit test `tests/unit/types/preferences.test.ts` asserts `expect(DEFAULTS.ai.showTextSuggestions).toBe(false)`. PRD doc drift; update Appendix A code block to `false`. Outside cluster scope but worth flagging upstream.

9. **`send-sync-alert` does not wrap `sendEmail` in try/catch** — `supabase/functions/send-sync-alert/index.ts:97`. A Resend API error propagates as unhandled rejection, returning a 500 with no `{ ok: false }` body. Wrap and return `{ ok: false, error: 'send_failed' }` for observability. Database-reviewer L4.

10. **No depth/size guard on `p_path` array in `update_user_pref` RPC** — `supabase/migrations/20260603_12_user_preferences_rpc.sql:18-27`. `jsonb_set(.., create_missing := true)` will silently create arbitrarily deep nested keys. A client bug passing a 50-element path bloats the column row indefinitely. Clamp: `IF array_length(p_path, 1) > 5 THEN RAISE EXCEPTION 'pref path too deep' END IF;` (5 covers the deepest valid pref path in the current schema). Database-reviewer L1.

11. **Cmd+, window listener attaches at module load, before app mounts** — `src/main.ts:66-77`. The handler is registered immediately on `import './main.ts'`, but `usePreferencesModal()` does nothing visually until `<PreferencesModal />` mounts. Calling `.open()` during the brief auth-resolve window is a no-op. Edge case; once auth resolves the modal mounts and the now-true `isOpen` state will activate the modal. Acceptable, but worth a one-line comment documenting the deferral.

12. **`usePreferencePath` does not `structuredClone` value at composable boundary** — `src/composables/use-preferences.ts:23`. Forwards raw `next` to `store.setPath`, which does not `structuredClone(value)` before nesting it into the new object (unlike `set()` at `src/stores/preferences.ts:59`). For Cluster 12 all path values are primitives, so currently safe. If a future caller passes an object reference and mutates it later, the store sees the mutation. Tighten by cloning in `setPath`. Code-reviewer L2.

13. **`_shared/resend-client.ts` stub will throw if `RESEND_API_KEY` is set before Cluster 01 swaps it** — `supabase/functions/_shared/resend-client.ts:37-39`. Good defensive guard, but means a staging deploy that sets the env var pre-merge → hard 500. Add an explicit `TODO` referencing the Cluster 01 tracking commit / PR so the swap isn't missed. Code-reviewer L3.

14. **No user-facing save-status feedback in `<PreferencesModal>`** — `src/components/settings/PreferencesModal.vue:21-24`. Footer copy `Saved to your account · syncs across devices` is static. Debounced RPC failure (sets `loadError` silently) leaves the user unaware. Surface via toast or dynamic footer text in a follow-up. Code-reviewer L4.

15. **`docs/legal/privacy-policy.md` preference-disclosure addendum missing** — Cluster 01's privacy-policy.md (`/Users/jihoyang/kova-build-c01/docs/legal/privacy-policy.md`) contains zero `preferences` references. PRD 12 §5.5 specifies the one-line addendum: `Preferences (accessibility, view, notifications) are stored on your account row and synced across your devices when you sign in.` DONE report § Deferred Work item 4 forward-points this to Cluster 01 owner; not yet wired into the c01 doc. Track as a c01 follow-up before merge.

16. **No `audit_log` insert on send-sync-alert success/skip** — `supabase/functions/send-sync-alert/index.ts`. Audit prompt D explicitly calls for `audit_log insert per send attempt (success and skip)`. Current code returns JSON responses but does not write to any audit table. PRD 12 §4.1 note 6 deliberately scope-cuts an audit table on the prefs RPC (`prefs are intentionally low-stakes — not audit-required`); send-sync-alert is a different surface (an email side-effect) where the audit prompt's stricter ask applies. If founder agrees, add an `audit_log` insert (skip + success cases) using the existing audit table from Cluster 04 (`stripe_audit_log` precedent). Otherwise the audit prompt requirement can be marked as a documented deviation in the integration-branch merge.

17. **Recent-color lowercase normalization not documented** — `src/stores/ui-state.ts:14-18`. `pushRecentColor` lowercases the hex on entry; downstream consumers therefore always see lowercase. PRD 12 §6.2.2 does not specify normalization. Hex is case-insensitive so no functional bug, but a downstream consumer that expects round-trip case may surprise. One-line code comment explaining the normalization choice would suffice.

---

## Quality gates (re-run results)

| Gate | Re-run result | DONE report claim | Match? |
|---|---|---|---|
| `bun install` | no changes (1226 deps, 0 updates) | not asserted | ✅ |
| `bun run test:unit` (full) | 1720 pass / 99 skip / 0 fail / 1819 across 138 files | 1720 / 99 / 0 / 1819 | ✅ exact |
| `bun run test:unit` (c12 files only, 9 files) | 43 pass / 0 fail / 99 expects | claims `45 pass / 0 fail` AND `Total: 43 new c12 unit tests` (contradiction; see Finding 7) | ⚠️ partial — 43 confirmed |
| `bun run test:dupes` | 1.17% lines / 1.52% tokens / 44 clones (threshold < 3%) | 1.17% / 1.52% | ✅ exact |
| `bun run check` (c12 files only) | 0 errors | 0 errors | ✅ |
| `bun run check` (full repo) | 1 warning + 89 errors (all in `use-shop-drop.ts`, `use-shopify-connection.ts`, dashboard, onboarding, brand-kit, editor, media, inspector, etc — all M9/Shopify baseline) | "89 pre-existing errors in packages/core/ + src/canvas-extensions/ + src/components/onboarding/" | ⚠️ partial — paths slightly differ but count exact + cluster-12 files clean |
| `bun run build` | fails on the same 89 lint errors above (exit 1) | "fails on same 89 pre-existing lint errors. Not regressions." | ✅ matches |
| `Math.random` in c12 diff | 0 hits | none | ✅ |
| `: any` in c12 diff | 0 hits | none | ✅ |
| `!.[a-zA-Z]` non-null assertion in c12 diff | 0 hits | none | ✅ |
| `<style scoped>` blocks in new Vue SFCs | 0 hits | none | ✅ |
| `<style>` blocks in new Vue SFCs | 0 hits (one `<style>` text appears in `accessibility.css` comment referencing the lifted hi-fi inline block) | none | ✅ |
| `e.key` for keyboard handlers in c12 diff | 0 hits (Cmd+, uses `e.code === 'Comma'`; KovaToggle uses `e.code === 'Space' || e.code === 'Enter'`) | none | ✅ |
| `packages/core/` modifications in c12 diff | 0 hits | none | ✅ |
| design-system / `kova-hifi.css` / `TOKEN_CANONICAL.md` diffs | none | "Zero new tokens" | ✅ |

---

## Founder-lock compliance (all 16 PRD 12 locks traced)

| # | Founder-locked decision | Lock date | Code location | Audit verdict |
|---|---|---|---|---|
| 1 | Two-layer architecture (Q5 corrected) | 2026-04-25 | `src/stores/preferences.ts` + `src/stores/ui-state.ts` | ✅ |
| 2 | Layer 1 = `users.preferences` JSONB | 2026-05-15 | `supabase/migrations/20260603_12_user_preferences_rpc.sql` (RPC); column owned by Cluster 01 `20260522_01_users_account_lifecycle.sql:13` | ✅ |
| 3 | Layer 2 = VueUse `useLocalStorage` | 2026-05-15 | `src/stores/ui-state.ts:2,5-12` | ✅ |
| 4 | Settings IA = embed in Profile + A8.3 modal (Option A) | 2026-05-15 | `AccessibilityPanel.vue` + `PreferencesModal.vue` (single shell, two surfaces) | ✅ |
| 5 | Apply-immediately, no save-bar | 2026-05-15 | `src/stores/preferences.ts:65,74` debounced write triggered on every `set` | ✅ |
| 6 | Notifications ownership = Cluster 12 | 2026-05-15 | `NotificationsPanel.vue` + `prefs.notifications` slot in `types/preferences.ts:29-32` | ✅ |
| 7 | Text size = 87.5% / 100% / 112.5% | 2026-05-17 | `src/styles/accessibility.css:10-21` + enum `TextSize` at `types/preferences.ts:1` | ✅ |
| 8 | High contrast = borders-only mode (not full inversion) | 2026-05-17 | `src/styles/accessibility.css:71-81` — overrides `--border`, `--line`, `--line-2` + button outline only | ✅ (UX copy at `AccessibilityPanel.vue:53` overstates — see Finding 3) |
| 9 | Recent colors FIFO cap 12 | 2026-05-17 | `src/stores/ui-state.ts:14-18` `pushRecentColor` with `.slice(0, 12)` + case-insensitive dedupe | ✅ |
| 10 | `showTextSuggestions` default OFF, reserved (no UI in MVP) | 2026-05-17 | `src/types/preferences.ts:37` defaults `false`; zero UI references; explicit test in `tests/unit/types/preferences.test.ts` | ✅ |
| 11 | A8.3 modal triggers (App menu + Cmd+, + Profile) | 2026-05-17 | `src/main.ts:66-77` Cmd+, handler (uses `e.code` per CLAUDE.md); App-menu + Profile-dropdown forward-pointed to Clusters 08 + 04 | ⚠️ 1 of 3 wired in c12 (see Finding 2) |
| 12 | `prefers-reduced-motion` first-boot tick | 2026-05-15 | `src/composables/use-reduced-motion-default.ts` + `usePreferencesStore.hasExplicitAccessibilityKey` guard | ✅ |
| 13 | Resend env-guarded (deferred pre-launch) | 2026-05-17 | `supabase/functions/send-sync-alert/index.ts:33-39` + stub at `_shared/resend-client.ts` | ✅ |
| 14 | Cancel + Save = decorative confirmations (both close) | 2026-05-15 | `src/components/settings/PreferencesModal.vue:27-28` both call `close()` | ✅ |
| 15 | Save-bar scoped to Identity fields only (Accessibility/Notifications bypass) | 2026-05-15 | Panels mount with no save-bar wiring; Cluster 04 owns Identity save-bar | ✅ (cross-cluster contract preserved) |
| 16 | `update_user_pref` SECURITY INVOKER | 2026-05-15 | `supabase/migrations/20260603_12_user_preferences_rpc.sql:21` | ✅ |

**Score: 15 ✅ + 1 ⚠️ (Decision 11, partial coverage — see Finding 2).**

---

## Plan task completion matrix (PRD 12 §6 — 17 tasks)

| Task | Plan §ref | Commit | Status | Notes |
|---|---|---|---|---|
| 1 — `update_user_pref` RPC migration | §Task 1 line 154 | `68ad29d4` | ✅ | SECURITY INVOKER, `jsonb_set(create_missing:=true)`, GRANT to `authenticated`. Spot-checked: file present, content matches PRD §4.1. |
| 2 — `UserPreferences` shape + DEFAULTS + `mergeWithDefaults` | §Task 2 line 227 | `04515d1a` | ✅ | 11 tests pass. Spot-checked: shape matches PRD Appendix A; defaults match founder locks (note: `showTextSuggestions: false` correct, PRD Appendix A typo notwithstanding — see Finding 8). |
| 3 — `useUIStateStore` (Layer 2 localStorage) | §Task 3 line 467 | `547aa1f5` | ✅ | 6 tests pass. `kova:ui:*` namespace. FIFO + dedupe. |
| 4 — `usePreferencesStore` (Layer 1 server-synced) | §Task 4 line 615 | `f8b2c5ea` | ✅ | 7 tests pass. Includes the `hasExplicitAccessibilityKey` introspection helper. |
| 5 — `use-preferences` composable | §Task 5 line 910 | `5126065b` | ✅ | 3 tests pass. `usePreference<K>` + `usePreferencePath<T>` writable computeds. |
| 6 — Integration test `update_user_pref` (local Supabase) | §Task 6 line 1028 | n/a | ⏸ DEFERRED | Forward-pointer: depends on Cluster 01 (W8a sibling) shipping `users.preferences` column on the integration branch. Documented in DONE report. |
| 7 — `accessibility.css` CSS layer + lifted `.toggle` | §Task 7 line 1183 | `38dc879f` | ✅ | Text size 87.5/100/112.5% scale, reduce-motion + OS fallback @media, high-contrast borders-only with all 4 token-exempt drift values documented. |
| 8 — `use-reduced-motion-default` composable | §Task 8 line 1298 | `8e3eab65` | ✅ | 3 tests pass. One-shot OS-cue tick gated on `hasExplicitAccessibilityKey('reduceMotion')`. |
| 9 — `usePreferencesModal` composable | §Task 9 line 1415 | `8e3eab65` | ✅ | Module-scoped singleton refs (see Finding 4). |
| 10 — `<AccessibilityPanel>` component | §Task 10 line 1470 | `b99c45a9` | ✅ | 2 tests pass. Three controls (segmented + 2 toggles). |
| 11 — `<NotificationsPanel>` component | §Task 11 line 1603 | `dda1ffdd` | ✅ | 2 tests pass. Two toggles + `Email · monthly` / `Email · immediate` labels. |
| 12 — `<PreferencesModal>` component | §Task 12 line 1716 | `6584e948` | ✅ | 3 tests pass. KovaButton for Cancel/Save (post-review fix). |
| 13 — Wire global mount + load-on-auth + Cmd+, | §Task 13 line 1838 | `41b6b445` | ✅ | App.vue mount + main.ts load + auth subscription + Cmd+, listener with input/textarea/contenteditable guard. |
| 14 — Cluster 04 mount of panels | §Task 14 line 1914 | n/a | ⏸ FORWARD-POINTER | Cluster 04 owns `/account/profile`; c12 ships zero-prop named imports. Documented in DONE report § Deferred Work item 2. |
| 15 — Playwright E2E `preferences.spec.ts` | §Task 15 line 1932 | n/a | ⏸ DEFERRED | Depends on `/account/profile` (c04) + main-menu Preferences entry (c08). Documented. |
| 16 — `send-sync-alert` Supabase Edge Function | §Task 16 line 2009 | `3962bd11` | ✅ | Env-guarded RESEND_API_KEY check; reads `prefs.notifications.syncAlerts`; idempotency-key; uses temporary `_shared/resend-client.ts` stub. See Findings 1, 9, 16 for defense-in-depth follow-ups. |
| 17 — Manual QA + PRD tracker bump | §Task 17 line 2272 | `8cb4b7f7` | ✅ PARTIAL | Tracker bumped IN-DRAFT → APPROVED 2026-05-23. Privacy-policy addendum still pending Cluster 01 owner (see Finding 15). |

**Score: 14 ✅ shipped + 3 ⏸ deferred-with-forward-pointer.**

The two non-task commits (`b1be6a05` review fix-ups + `6d94c940` lint isolation refactor + `7f6444ce` KovaToggle Cluster 11 gap + `1a3676ed` DONE report) are documented in the DONE report § Plan task coverage table. Spot-checked: every claimed commit exists at the claimed SHA, and the commit message format matches the convention `feat(c12-tNN):` / `fix(c12-review):` / `docs(c12):`.

---

## Cross-cluster contracts (PRD 12 §11)

| Other PRD | What c12 consumes | What c12 exposes | Status |
|---|---|---|---|
| 01 (auth) | `users.preferences` JSONB column; `_shared/resend-client.ts` real wrapper; privacy-policy addendum | RPC migration scoped to existing `users_self` RLS | ⚠️ Column NOT YET in c12 worktree (will land on integration merge); stub `_shared/resend-client.ts` throws if RESEND_API_KEY set (forces swap) — see Finding 13; privacy addendum still pending — see Finding 15 |
| 04 (account) | `/account/profile` route shell mounts `<AccessibilityPanel>` + `<NotificationsPanel>` | Zero-prop named imports under `@/components/settings/` | ⏸ Cross-cluster mount pending; forward-pointer documented |
| 06 (canvas) | Yjs sync-retry hook calls `send-sync-alert` after retry 3 | `useUIStateStore.{pagesCollapsed, layersCollapsed, sidebarLeftWidth, sidebarRightWidth, lastActiveCanvasId}` reactive getters | ⏸ Caller side pending in Cluster 06; endpoint side shipped here |
| 07b (overlays) | Read `usePreferencesStore.view.*` reactively | `view.*` slot ships ready in `UserPreferences` shape | ✅ Slot present, computed getter exposed |
| 08 (canvas menus) | Main-menu Preferences entry calls `usePreferencesModal().open('accessibility')`; canvas right-click items mutate `prefs.view.*` | `<PreferencesModal>` + open/close composable + `setPath(['view', key], v)` | ⏸ Menu wiring pending in Cluster 08 (see Finding 2 — A8.3 trigger coverage) |
| 11 (shared UI) | `<KovaModal>`, `<KovaSegmented>`, `<KovaButton>`, `<KovaIcon>` (consumed by name) | `<KovaToggle>` shipped here as a Cluster 11 gap-fill | ⚠️ KovaToggle re-homing to Cluster 11 PRD roster post-merge — see DONE report § Deferred Work item 6 |

---

## CLAUDE.md hard-rule sweep

| Rule | Result |
|---|---|
| No `<style>` / `<style scoped>` in Vue SFCs | ✅ (CSS lifted to `accessibility.css`) |
| No `Math.random` | ✅ (no usages in c12 diff; VueUse `useLocalStorage` uses no randomness) |
| No `e.key` for keyboard handlers | ✅ (`e.code === 'Comma'` in main.ts; `e.code === 'Space' / 'Enter'` in KovaToggle) |
| No zod (valibot only) | ✅ (cluster has no schema validation by design) |
| No `ANTHROPIC_API_KEY` browser exposure | ✅ (no LLM surface) |
| Supabase env: `VITE_*` for browser, service-role never in Vue | ✅ (Edge Function reads `SUPABASE_URL` + `SUPABASE_ANON_KEY` from Deno env; no service-role usage) |
| No React / Next.js / PixiJS | ✅ |
| `packages/core/` untouched | ✅ (git diff confirms 0 changes under that path) |
| `crypto.randomUUID()` / Web Crypto only | ✅ (no random surface in c12) |
| Files < 600 lines | ✅ (largest c12 file is `accessibility.css` at 133 lines; preferences.ts store at 132 lines) |
| Functions < 40 lines | ✅ (largest c12 function is `load()` at ~30 lines; well under) |

---

## Notes on cluster execution discipline

- **One-per-task commit convention:** honored. 17 task commits + 1 DONE report + 1 review fix-up + 1 lint isolation refactor + 1 KovaToggle gap-fill. The combined `feat(c12-t8,t9)` is a permissible exception (composables are tightly coupled).
- **Phase 1 audit gate:** `docs/execution-phase/cluster-audits/cluster-12-audit.md` + `cluster-12-tokens-used.md` shipped at `f7c50c71` (before any Vue code). 5 ⚠️ MISSING resolved per drift protocol §7c (token-exempt with comments). No founder AskUserQuestion required.
- **Code-review fix-ups:** 1 HIGH (re-load prefs on SIGNED_IN / SIGNED_OUT) + 3 MED (explicit-key marking, KovaButton swap, edge-fn env-skip semantics) all addressed in commit `b1be6a05`. 4 LOW deferred or not blocking per DONE report.
- **DONE report quality:** thorough — every file shipped is enumerated, every founder-locked decision is traced, every deferred task carries a forward-pointer. Two minor errata: test count contradiction (Finding 7) and missing App-menu / Profile-dropdown forward-pointer rows (Finding 2).
- **Test isolation refactor (`6d94c940`):** confirmed targeted at lint cleanliness + happy-dom matchMedia stubbing; no behavior changes.

---

## Verdict

✅ **PASS WITH WARNINGS.** Zero CRITICAL, zero HIGH, 6 MEDIUM, 11 LOW findings (17 total).

- All 16 PRD 12 founder-locked decisions traceable to shipped code (15 ✅ + 1 ⚠️ partial coverage on the 3-trigger A8.3 modal lock).
- 17 plan tasks resolve to 14 ✅ shipped + 3 ⏸ deferred (all with documented forward-pointers).
- Quality gates re-run matches the DONE report (modulo Finding 7 test-count contradiction).
- Zero regressions in pre-existing 89 `bun run check` errors (all M9/Shopify baseline, untouched).
- Code-reviewer + database-reviewer subagents both report zero CRITICAL / zero HIGH.

The MEDIUM findings are follow-up patches, not ship blockers. Recommend addressing M1 (JWT subject validation on send-sync-alert) + M2 (App-menu / Profile-dropdown forward-pointers explicitly documented) + M3 (AccessibilityPanel sub-copy fix) before the cluster merges into the integration branch. M4 / M5 / M6 are tracked as post-merge follow-ups in the next maintenance cluster.

Cluster 12 is otherwise spec-clean and ships its declared surface.
