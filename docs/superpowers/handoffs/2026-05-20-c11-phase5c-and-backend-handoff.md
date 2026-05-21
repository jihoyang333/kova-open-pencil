# Cluster 11 Phase 5c hardening + Plan 11 backend — handoff

**Status:** READY. Resume immediately post-compact.
**Created:** 2026-05-20 (post-W6 REDO merge to feat/m9-shopify).
**Owner:** next-up agent session (same Jiho founder).
**Predecessor session:** W6 REDO complete + merged. See `docs/execution-phase/cluster-reports/W6-cluster-11-REDO-DONE.md`.

---

## Starting state

- **Working dir:** `/Users/jihoyang/kova-main/kova-open-pencil-1`
- **Branch:** `feat/m9-shopify` HEAD = `06c4d51a Merge W6 Cluster 11 (Foundation) REDO`
- **NOT pushed.** Founder may push or hold. Either way — start a fresh branch off `feat/m9-shopify` for this work. **Do NOT branch from `app/cluster-11-redo` (closed).**
- **W7 (Cluster 07a engine) running in parallel session.** DO NOT touch `packages/core/` or canvas engine files. If conflict risk, surface to founder.
- Dev server may still be up on localhost:1420. Founder restarts as needed.

## Branch this work

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git switch feat/m9-shopify
git pull --ff-only origin feat/m9-shopify   # only if founder pushed
git switch -c app/cluster-11-phase5c
```

Single commit per task. Merge `--no-ff` back to `feat/m9-shopify` when done.

---

## Task A — Phase 5c hardening (~1 hr)

### A.1 — Auto-mount interactive primitives in showcase so Playwright impl baselines generate

**Problem:** `tests/visual-diff/cluster-11/primitives.visual.spec.ts` auto-skips 11 tests where the selector doesn't pre-mount in `/dev/cluster-11`. Toasts only render when fired. Modals only render when `open` true. Popover/Menu/Tooltip only render when triggered.

**Fix path:** Add `auto-mount` data attribute / hidden-but-rendered variants in `src/views/dev/Cluster11Showcase.vue` so every primitive has at least ONE always-mounted instance the Playwright clip-region selector can grab.

Concrete edits in `src/views/dev/Cluster11Showcase.vue`:

1. **Toasts.** Replace the 6 trigger-buttons section with a parallel `data-test-region="auto-mount"` row that mounts 3 raw `<KovaToast>` (not via store) with hard-coded variant=success/error/ai for Playwright. Keep the existing trigger buttons for founder-interactive smoke. Wrap in `<div v-if="false" data-test-region='...'>` would hide — DO NOT do that, baseline needs visible pixels. Use `:style="{ position: 'absolute', left: '-9999px' }"` OR add a `?playwright=1` query-string check via `useRoute()` to mount/unmount. **Simplest:** add a section near the bottom of showcase titled "Auto-mount (Playwright baseline targets — visible)" rendering one each of `.toast.success / .toast.error / .toast.ai`. Real Playwright clip-region picks the FIRST `.toast.success` etc. it finds.

2. **Modal.** Add `:open="true"` instances of `.dlg.sm / .dlg.md / .dlg.lg` in the auto-mount section. Reka Dialog with `open=true` portal-renders to body — Playwright should clip via `.dlg.sm` selector. Concern: 3 open modals stacking will visually overlap. **Workaround:** render the `.dlg` MARKUP without `KovaModal` wrapper (skip Reka portal) — directly inline:
   ```html
   <div class="dlg sm" style="position: static; transform: none;">
     <div class="dlg-head">...</div>
     <div class="dlg-body">Hello</div>
     <div class="dlg-foot"><div class="l">left</div><div class="r"><KovaButton>OK</KovaButton></div></div>
   </div>
   ```
   Same for md/lg. Adds three inline modal mockups — visible — Playwright clips each.

3. **Popover** (non-avatar) and **Menu**. Same inline-mockup approach. Reka portal isn't required for baseline generation — what matters is `.popover` and `.menu` selectors render visible canonical chrome.

4. **Tooltip.** Inline `<div class="tooltip" style="position: static;">Token-driven tooltip body</div>`. (TokensDebugView already has this — copy the pattern.)

5. After auto-mount additions, re-run baselines:
   ```sh
   bun run dev   # one terminal
   VISUAL_DIFF_BASE_URL=http://localhost:1420 bun run test:visual --update-snapshots   # other terminal
   ```
   Expected: 0 skipped (or down from 11 → 1-2 if tooltip-no-hifi stays skipped). Commit new baselines under `tests/visual-diff/cluster-11/primitives.visual.spec.ts-snapshots/`.

**One commit:** `feat(c11): Phase 5c — showcase auto-mount + 11 visual-diff baselines`.

### A.2 — Lint warn → error flip prep

**Goal:** Get `bun run check` (currently warn) clean enough that flipping `LINT_NO_RAW_VALUES_MODE` to `error` doesn't break CI.

**Current state:** ~481 warns total. Breakdown:
- ~278 OpenPencil-era pre-existing (out of scope — DO NOT touch unless founder explicitly approves a sweep PR)
- ~200 Cluster 11 violations — about 90% in **debug surfaces** (`src/views/dev/TokensDebugView.vue`, `src/views/dev/Cluster11Showcase.vue`) using Tailwind arbitrary classes (`text-[15px]`, `bg-[var(--page)]`, etc.) intentionally.

**Strategy:**
1. **Debug surfaces** — add a single `<!-- token-exempt: debug surface — Tailwind arbitrary classes for one-off layouts; not production chrome -->` comment near the top of each file's `<template>`. Per lint rule (`scripts/lint/no-raw-visual-values.ts`), the comment exempts the WHOLE block? — verify the lint rule's scope. If per-line only, may need to lift `Cluster11Showcase` + `TokensDebugView` to a `.dev-section / .dev-h2 / .dev-card` canonical CSS block (in `kova-hifi.css` or a separate `src/styles/dev-chrome.css`) and refactor SFCs to consume those classes. Add `--text-[var(--ink)]` style usages → `text-ink` (Tailwind theme utility) where possible — Tailwind 4 auto-generates utility classes from `@theme` entries.

2. **Specific SFC inline-styles still using raw px/hex** after Phase 5b — grep:
   ```sh
   bun run check 2>&1 | grep -E "src/components/(ui|network|marketing|email)/" | head -50
   ```
   Most should be in EmailShell / MarketingShell / NetworkStatusIndicator — already token-exempt-commented in Phase 5b. Verify the comment scope is honored by the lint rule.

3. **Test the flip locally** (don't commit yet):
   ```sh
   LINT_NO_RAW_VALUES_MODE=error bun run check
   ```
   Iterate until zero errors. THEN commit + ask founder before flipping the default in `package.json`.

**Commit:** `chore(c11): Phase 5c lint-cleanup — token-exempt debug surfaces, prep for warn→error flip`.

DO NOT change `LINT_NO_RAW_VALUES_MODE` default to `error` without explicit founder go-ahead — that's a project-wide gate change.

---

## Task B — Plan 11 backend (~3-4 hr)

**Scope:** Per PRD 11 §2.1 + §5 + Plan 11 Phase 1 (Tasks 1.1, 1.2, 1.3, 1.3a, 1.3b, 1.3c, 1.4, 1.5, 1.6, 1.7, 1.8). All are cross-cuts every consuming cluster expects.

**Decision-tree to start (founder hasn't picked):**

Option (a) — **Land in this cluster** as `app/cluster-11-phase5c-backend` branch. Pros: keeps Cluster 11 self-contained. Cons: delays merge by ~3-4 hr.

Option (b) — **Defer to Cluster 01 / 04 wave** (W8). Pros: those clusters already need Supabase + Edge Functions wired; bundling is natural. Cons: cross-cluster dependency on backend cross-cuts not yet shipped.

**Recommendation:** (a). Plan 11 explicitly owns these. Decoupling risks Cluster 01 / 04 agents inventing parallel idempotency / audit helpers. Ask founder. If founder picks (b), STOP this task and write `docs/execution-phase/cluster-reports/W6-cluster-11-backend-deferred.md` noting where each task lands.

### B.1 — Migration `20260520_11_shared_ui_infrastructure.sql`

Per Plan 11 Task 1.1 (lines 162-300). Reference SQL block:
- `kova-open-pencil-1/supabase/migrations/20260520_11_shared_ui_infrastructure.sql`

Contents per PRD 11 §4.1:
- `public.idempotency_keys` table (key PK + 6 cols + `CHECK` length + 2 indexes + RLS `service_role` only)
- `public.audit_log` table (id PK + 5 cols + 2 indexes + RLS `service_role` only)
- ON DELETE CASCADE from `users(id)`

**Pre-req:** Supabase project + `.env.local` per W6 founder pre-flight (already set up — founder owns).

**Test:** Plan 11 lists `tests/integration/cluster-11/migration.test.ts` (lines 170-220). RED first, then GREEN per TDD.

**Run:**
```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
bunx supabase migration up   # if local supabase running
# OR
bunx supabase db push   # to remote dev
```

**Commit:** `feat(c11-be): Task 1.1 migration — idempotency_keys + audit_log tables + RLS`.

### B.2 — `verifyIdempotency()` helper (Plan 11 Task 1.3)

File: `api/_shared/idempotency.ts` + tests at `tests/integration/cluster-11/idempotency.test.ts`. Spec body at Plan 11 lines 487-674 — reference implementation included verbatim.

**Critical:** the helper hashes raw `req.text()` BYTES (not canonical JSON). Document in JSDoc + add CI grep gate in Phase 11 Task 11.x (later) to flag non-deterministic `JSON.stringify` in idempotency-keyed call sites.

**Commit:** `feat(c11-be): Task 1.3 verifyIdempotency helper + integration tests`.

### B.3 — `writeAudit()` helper (Plan 11 Task 1.3a, founder-lock #11)

File: `api/_shared/audit.ts`. Signature: `writeAudit(supabaseAdmin, { userId, eventType, payload, clusterOwner }) → Promise<void>`. Swallows + Sentry-captures `42P01` (table-missing) so consumer calls never break the request path.

**Test:** `tests/integration/cluster-11/audit.test.ts`. Cover: happy path insert, table-missing graceful swallow, RLS service_role-only verified.

**Commit:** `feat(c11-be): Task 1.3a writeAudit helper + tests (founder lock #11)`.

### B.4 — `requireEnv()` helper + CI gate (Plan 11 Task 1.3b, founder-lock #10)

File: `src/lib/require-env.ts`. Throws if VITE_-prefixed env var leaks server-only secret. CI grep gate in `scripts/ci/no-leaking-secrets.ts` (verify path).

Per Plan 11 lines 814-892. Founder-lock #10 mandates this.

**Commit:** `feat(c11-be): Task 1.3b requireEnv helper + CI no-leak gate`.

### B.5 — `loadEnvOrSkip()` stub-guard pattern (Plan 11 Task 1.3c, W0-13)

File: `api/_shared/load-env.ts` (or similar — per Plan 11 lines 893-998). Used by Sentry / Resend / cron stubs to no-op when env var missing.

**Commit:** `feat(c11-be): Task 1.3c loadEnvOrSkip stub-guard helper`.

### B.6 — Sentry install + stubs (Plan 11 Tasks 1.4 + 1.5)

- Browser: `src/sentry.ts` — `@sentry/vue` install, env-guarded behind `VITE_SENTRY_DSN`.
- Server: `api/_shared/sentry.ts` — `@sentry/node` capture wrapper, env-guarded behind `SENTRY_DSN_SERVER`.

Per Plan 11 lines 999-1166. Real account wired pre-launch per scope plan §11. **For now:** ship stubs that no-op + log warn if env var missing.

**Deps:** `bun add @sentry/vue @sentry/node`. Founder approves the dep add before commit (`chore(deps): add @sentry/vue + @sentry/node`).

**Commit:** `feat(c11-be): Task 1.4 + 1.5 Sentry install (env-guarded stubs)`.

### B.7 — Resend `sendEmail()` wrapper (Plan 11 Task 1.6)

File: `api/_shared/email.ts`. Wraps Resend SDK; injects `List-Unsubscribe` header; renders `<EmailShell>` via vue-email or template-string. Env-guarded behind `RESEND_API_KEY`. No-op + warn if missing.

**Dep:** `bun add resend`. Same approval pattern.

**Commit:** `feat(c11-be): Task 1.6 sendEmail wrapper (env-guarded stub) + EmailShell render path`.

### B.8 — Realtime channelName server-side mirror (Plan 11 Task 1.7)

File: `api/_shared/realtime.ts`. Mirror of client-side `useChannelName()` for Edge Functions that broadcast.

**Commit:** `feat(c11-be): Task 1.7 channelName server-side mirror`.

### B.9 — Cron `idempotency-cleanup` + vercel.json (Plan 11 Task 1.8)

- Function: `api/cron/idempotency-cleanup.ts`. Auth: Bearer `CRON_SECRET`. Daily 04:00 UTC.
- `vercel.json` — append to `crons` array.

Per Plan 11 lines 1305-1476. **Stub-guard:** no-op if `CRON_SECRET` missing.

**Commit:** `feat(c11-be): Task 1.8 idempotency-cleanup cron + vercel.json`.

---

## Acceptance criteria

After Task A done:
- [ ] `bun run dev` + `bun run test:visual` — < 5 skipped tests (down from 11).
- [ ] `LINT_NO_RAW_VALUES_MODE=error bun run check` — Cluster 11 violations resolved (OpenPencil-era out of scope).
- [ ] `bun run build` green.
- [ ] Founder browser-smoke `/dev/cluster-11` confirms no regressions vs pre-Phase-5c.

After Task B done (if pursued):
- [ ] `bunx supabase db diff` clean.
- [ ] `bun test ./tests/integration/cluster-11/` green for migration + idempotency + audit.
- [ ] `bun run check` no new lint errors.
- [ ] `bun run build` green.
- [ ] Stubs no-op cleanly when env vars missing (verified via grep of warn-log statements).
- [ ] PRD 11 §4 + §5 acceptance ticked off.

**Final report:** `docs/execution-phase/cluster-reports/W6-cluster-11-phase5c-DONE.md` (mirror the W6 REDO DONE shape — closure table, commits, deferments, founder smoke checklist).

---

## Gotchas + memory of prior session

1. **Lint rule scope.** The `no-raw-visual-values` lint at `scripts/lint/no-raw-visual-values.ts` flags both Tailwind arbitrary classes (`text-[15px]`) and inline `:style` raw px. Token-exempt comments are recognized but the SCOPE of an exemption (line vs block) needs verification. Read the rule source before adding bulk exemptions.

2. **CLAUDE.md hard rules** stay in force: no `<style>` blocks in Vue SFCs, no `Math.random`, no `<icon-lucide-*>` raw imports, no `e.key` for shortcuts.

3. **Reka UI** is at `^2.9.0` — verify before touching wrappers. Context7 the docs if behavior changes. Existing wrappers: `KovaTooltip / KovaPopover / KovaMenu / KovaSelect / KovaModal / KovaToast`.

4. **CI determinism fixture** already wired at `tests/visual-diff/fixtures/ci-deterministic.ts`. Reroutes Inter + Lucide CDN to local. Disables animations. Adds `<html class="ci">` for hover-state neutralization.

5. **Hi-fi mockups are byte-frozen** at `design-system/hifi/<cluster>/*.html`. DO NOT edit them — that breaks the visual-diff contract per `IMPLEMENTATION_PROMPT.md` §10. If a mockup value is wrong, route via drift protocol §7 (founder decision).

6. **Plan 11 backend tests need Supabase running locally.** Set up via `bunx supabase start` before running integration tests. If founder hasn't provisioned, surface + STOP Task B.

7. **Branch hygiene:** one PR per cluster-task-bundle. Per-task atomic commits inside the branch. Merge `--no-ff` to `feat/m9-shopify`.

8. **DO NOT push** without founder asking. They push themselves per repo convention.

9. **W7 (Cluster 07a engine) runs in parallel** — owns `packages/core/` + canvas engine. Stay off those paths. If conflict, surface to founder.

---

## First action after compact (literally line-1 of resumed session)

1. Read this handoff (`docs/superpowers/handoffs/2026-05-20-c11-phase5c-and-backend-handoff.md`) end-to-end.
2. Read `docs/execution-phase/cluster-reports/W6-cluster-11-REDO-DONE.md` for prior-session closure context.
3. Verify branch state:
   ```sh
   cd /Users/jihoyang/kova-main/kova-open-pencil-1
   git branch --show-current
   git log --oneline -5
   ```
   Expected: on `feat/m9-shopify` with `06c4d51a` at HEAD.
4. AskUserQuestion: "Task A only, Task A+B, or Task A+defer-B?" Default (A only).
5. Branch off + execute per task list above.

End of handoff.
