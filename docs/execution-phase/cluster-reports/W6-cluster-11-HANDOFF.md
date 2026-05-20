# W6 Cluster 11 — Compacted-Claude Handoff

**Date:** 2026-05-20
**Branch:** `app/cluster-11-foundation` (pushed to origin)
**Working dir:** `/Users/jihoyang/kova-main/kova-open-pencil-1`
**Founder:** Jiho — visually approved /dev/cluster-11 showcase after smoke fixes.

---

## What just happened (pre-compaction state)

Cluster 11 (foundation layer for every other PRD) is code complete + browser-verified.
21 commits on the branch. ~+4100 / -33 LOC across ~75 files.

Founder did the smoke walk on `/dev/cluster-11`. Five issues found + fixed:
1. Tailwind `@theme` was missing the canonical kova-hifi tokens → KovaSegmented active state, KovaSkeleton shimmer, KovaPill variants, EmptyState accent highlight were invisible. **Fixed** in `src/app.css` (added `--color-page`, `--color-bg`, `--color-fill`, `--color-fill-2`, `--color-line`, `--color-line-2`, `--color-ink`, `--color-ink-2/3/4`, `--color-accent-soft`, `--color-accent-ai`, `--color-input-hi`).
2. Toast `error` variant was sticky → founder override: `error` now auto-dismisses 5s like success/info/warning/ai-gen. Only `action` + `progress` stay sticky. `src/stores/toast.ts` STICKY_VARIANTS.
3. Error404/500 "Go to dashboard" CTA bounced unonboarded users to `/onboarding` because `/dashboard` route has `requiresOnboarding: true`. Replaced with smart `goHome()` honoring auth state. Button label "Go home".
4. `auth.initialize()` could hang forever on a paused / unreachable Supabase project (supabase-js retries refresh_token forever). Added 5s timeout race in `src/stores/auth.ts`.
5. Pre-cluster issue: Supabase dev project had been paused — founder resumed it via Dashboard.

**Founder said:** "wildgrove not blue but keep it this way" — leave EmptyState query highlight unchanged.

---

## What's left (your job, post-compaction)

Founder will say "go" after compaction. Then run **in this order**:

1. **Invoke `superpowers:code-reviewer` subagent** against the cluster branch.
   - Compare diff vs `feat/m9-shopify`.
   - Check against: `CLAUDE.md` hard rules, `docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md` §2 hard rules, Plan §6 acceptance criteria, PRD §3 surface table.
   - Surface CRITICAL / HIGH only. MEDIUM defer.
   - Reasonable to expect findings: `useOnlineStatus` has no unit test (acknowledged in done report), buildEmail is stub, Phase 10 E2E specs not written.

2. **Invoke `e2e-runner` subagent** for golden path on `/dev/cluster-11`.
   - Prereq: dev server running at localhost:1420 (founder may need to start it: `cd kova-open-pencil-1 && bun run dev`).
   - Golden path: open showcase, click each toast button, open modal, open menu/popover/tooltip, walk segmented control, open destructive confirm, type DELETE.
   - If e2e-runner asks for spec files, hand it `tests/e2e/cluster-11/` (will need to be created). Or have it run a single ad-hoc smoke spec.

3. **Update the done report** at `docs/execution-phase/cluster-reports/W6-cluster-11-DONE.md`:
   - Flip status from "IN PROGRESS" to "DONE" once code-reviewer + e2e-runner both pass.
   - Append a "Smoke fixes applied 2026-05-20" section listing the 5 issues fixed above.
   - List code-reviewer findings (if any) + remediation commit hashes.
   - List e2e-runner outcome.

4. **Final push** to origin.

5. **Print to console** (per Plan):
   ```
   W6 CLUSTER 11 DONE. <N> commits pushed to app/cluster-11-foundation.
   Founder: review done report at docs/execution-phase/cluster-reports/W6-cluster-11-DONE.md
   Then merge into feat/m9-shopify with --no-ff.
   ```

6. **DO NOT MERGE YOURSELF.** Founder runs the merge:
   ```sh
   git checkout feat/m9-shopify && git pull
   git merge --no-ff app/cluster-11-foundation
   git push origin feat/m9-shopify
   ```

---

## State you need to know

- **Local Supabase running** at `127.0.0.1:54321` (Docker started this session). Keys deterministic per project_id `kova-open-pencil`.
- **Cloud Supabase** (project ID `rqnyxkfdtvjgfsvdfutw`) was paused — restored. Founder's `.env.local` points at it.
- **`.env.test.local`** ships local-supabase keys for integration tests (gitignored via `*.local` rule). Loaded by `tests/setup-env.ts` via bun preload.
- **Inner `supabase/config.toml`** disables CLI migration runner (`[db.migrations] enabled = false`) because existing migrations use 8-digit date prefixes that collide on schema_migrations PK. Tests apply migrations via psql in `tests/integration/helpers/supabase-local.ts`. **DO NOT enable the CLI runner without renaming the colliding migration files first.**
- **M9 migrations skipped locally** because `supabase_vault.delete_secret` is not in the local stack version (cloud only). Skip pattern in supabase-local.ts.

---

## Deferred / pending (not blocking merge)

- **Phase 10 E2E** — 5 Playwright specs (toast / confirm / errors / theme / offline). Spec stubs to write under `tests/e2e/cluster-11/*.spec.ts`. Not in cluster scope blocker.
- **Phase 11 CI wiring** — `scripts/ci/cluster-11-gates.sh` exists with 6 grep checks. NOT yet wired into `.github/workflows/ci.yml`. Trips on 19 pre-existing `<icon-lucide-*>` callsites in `src/views/dashboard/*` + Onboarding/Signup/Login views — Wave 2/3 cluster fix passes scrub those, then wire the gate.
- **Plan Task 9.5** M9 Shopify Realtime channel migration — channelName() helper ships in this cluster but M9 Shopify code does not yet consume it. M9 follow-up.

---

## Test status (last full run)

- `bun run build` ✅ clean (1.87s)
- `bun run check` ✅ 0 warnings
- `bun test` (full sweep) ⚠️ 1655 pass / 91 fail / 30 errors — failures are PRE-EXISTING cross-file `mock.module` pollution unrelated to Cluster 11. Cluster 11's own tests pass in isolation:
  - `bun test tests/unit/api/` — green
  - `bun test tests/unit/stores/toast.test.ts tests/unit/stores/confirm.test.ts` — green
  - `bun test tests/unit/composables/cluster-11.test.ts` — green
  - `bun test tests/integration/cluster-11/` — green (local Supabase must be running)
  - `bun test tests/integration/helpers/__smoke__.test.ts` — green

If founder asks why full sweep shows failures: cross-test `mock.module` pollution from pre-existing tests, not Cluster 11 regression.

---

## Key file paths (cheat sheet)

| What | Path |
|---|---|
| Plan | `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md` (4277 lines) |
| PRD | `docs/kova-final-prds/11-shared-ui-infrastructure.md` |
| Execution prompt | `docs/execution-phase/execution-prompts/W6-cluster-11-foundation.md` |
| Design rider | `docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md` |
| Master guide | `docs/execution-phase/MASTER-EXECUTION-GUIDE.md` |
| Done report (update this) | `docs/execution-phase/cluster-reports/W6-cluster-11-DONE.md` |
| Hi-fi canonical CSS | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi.css` |
| Hi-fi HTML | `/Users/jihoyang/kova-main/main-main-kova-scope/batch-a*/dark/*.html` |
| CI gates script | `scripts/ci/cluster-11-gates.sh` |
| Test harness | `tests/integration/helpers/{supabase-local.ts,test-helpers.sql}` |

## Component inventory shipped this cluster

`src/components/ui/`:
- KovaToast.vue, ToastStack.vue (Phase 3)
- KovaModal.vue, KovaPopover.vue, KovaMenu.vue, KovaTooltip.vue (Phase 4)
- ConfirmModal.vue (Phase 5)
- KovaButton.vue, KovaInput.vue, KovaField.vue, KovaSegmented.vue, KovaPill.vue, KovaSkeleton.vue, EmptyState.vue, NetworkStatusIndicator.vue (Phase 6)

`src/components/shell/MarketingShell.vue`, `src/components/email/EmailShell.vue` (Phase 8)

`src/composables/`:
- use-theme.ts, use-reduced-motion.ts, use-channel-name.ts, use-idempotency-key.ts, use-online-status.ts, use-sentry.ts (Phase 2)
- use-toast.ts (rewritten — Pinia-backed + legacy `toast.show` shim) (Phase 3)
- use-confirm.ts (Phase 5)
- use-email-shell.ts (Phase 8, stub)

`src/stores/`:
- toast.ts (Phase 3)
- confirm.ts (Phase 5)

`src/types/`:
- toast.ts, menu.ts, confirm.ts

`src/views/errors/`:
- Error404View.vue, Error500View.vue, NetworkUnreachableView.vue (Phase 7)

`src/views/dev/Cluster11Showcase.vue` (Phase 9)

`api/_shared/`:
- supabase.ts, idempotency.ts, env.ts, audit.ts (extended), sentry.ts (extended), email.ts, realtime.ts, types.ts

`api/cron/idempotency-cleanup.ts`

`src/sentry.ts` (browser stub)

`supabase/migrations/20260520_11_shared_ui_infrastructure.sql`

---

## Caveman mode reminder

User runs caveman mode hook. Status text terse, fragments OK. Code / commits / security: write normal.

End of handoff.
