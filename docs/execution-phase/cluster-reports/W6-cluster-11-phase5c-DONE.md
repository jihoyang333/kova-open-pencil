# W6 Cluster 11 — Phase 5c hardening + Plan 11 backend — DONE

**Status:** ready for merge `--no-ff` to `feat/m9-shopify`.
**Branch:** `app/cluster-11-phase5c`.
**Predecessor:** `app/cluster-11-redo` merged 2026-05-20 (commit `06c4d51a`).
**Date completed:** 2026-05-21.
**Owner:** session resumed post-compact from `docs/superpowers/handoffs/2026-05-20-c11-phase5c-and-backend-handoff.md`.

---

## Closure table

| Task | What shipped | Files | Tests |
|---|---|---|---|
| **A.1** showcase auto-mount + visual-diff baselines | Inline canonical markup for `.toast.{success,error,ai}`, `.dlg.{sm,md,lg}`, `.popover.avatar`, `.menu`, `.tooltip`, `.err-page` in `/dev/cluster-11`. 11 new impl PNG baselines. Zero skipped. | `src/views/dev/Cluster11Showcase.vue`, `tests/visual-diff/cluster-11/primitives.visual.spec.ts-snapshots/*.png` | Playwright 27/27 pass (regression run clean) |
| **A.2** lint warn→error prep | Extended `no-raw-visual-values` lint with `<!-- token-exempt-file: -->` directive. File-exempted 5 C11 surfaces with legitimate raw-value use (TokensDebug + Cluster11Showcase + EmailShell + MarketingShell + NetworkStatus). Warn count 494 → 284. | `scripts/lint/no-raw-visual-values.ts`, 5 SFCs | `bun run check` exit 0 (warn mode default; flip to error deferred) |
| **B.1** idempotency_keys migration | Plan 11 Task 1.1. Service-role RLS, CASCADE FK, CHECK length 16..64, two indexes. AUDIT_LOG migration also applied via MCP (had been authored 2026-05-19, never deployed). Applied to remote dev project `rqnyxkfdtvjgfsvdfutw`. | `supabase/migrations/20260521_11_idempotency_keys.sql` | `tests/unit/migrations/cluster-11-shared-ui.test.ts` 16/16 |
| **B.2** verifyIdempotency() | Plan 11 Task 1.3 + C-HIGH11 body-hash policy (raw bytes; no JSON canonicalization; replay with reordered keys → 422). Param-injects `SupabaseClient`. Throws `IdempotencyHttpError`. | `api/_shared/idempotency.ts` | `tests/unit/api/idempotency.test.ts` 10/10 |
| **B.3** writeAudit() (PRE-EXISTING) | Already shipped W1 / `20260519_w1_audit_log.sql` ancestor. Verified intact. | `api/_shared/audit.ts` (no change) | `tests/unit/api/audit.test.ts` 5/5 pass |
| **B.4** requireEnv() + CI no-leak gate | Plan 11 Task 1.3b / founder lock #10. Eliminates `process.env.X!` non-null-assertion pattern. CI gate `no-leaking-secrets` scans browser-bundle roots for `import.meta.env.<SERVER_ONLY_SECRET>` + `VITE_<SERVER_ONLY_SECRET>` aliases. Wired into `bun run check`. | `api/_shared/env.ts`, `scripts/lint/no-leaking-secrets.ts`, `package.json` | `tests/unit/api/env.test.ts` 8/8 (covers B.4 + B.5) |
| **B.5** loadEnvOrSkip() | Plan 11 Task 1.3c / W0-13. Stub-guard pattern: missing env → null + warn breadcrumb. Used by Sentry / Resend / cron stubs. | `api/_shared/env.ts` (same file) | Covered by env.test.ts |
| **B.6** Sentry stubs | Plan 11 Tasks 1.4 + 1.5. Browser: `src/sentry.ts` (`@sentry/vue` 10.53.1, wired in `src/main.ts`). Server: extended `api/_shared/sentry.ts` (`@sentry/node` 10.53.1) without breaking the M9 `sentryCapture()` surface. Env-guarded — DSN missing → no-op + warn. | `src/sentry.ts`, `src/main.ts`, `api/_shared/sentry.ts` | `tests/unit/api/sentry-init.test.ts` 4/4 + M9 sentry-tagging 8/8 |
| **B.7** Resend sendEmail wrapper | Plan 11 Task 1.6. Env-guarded (`RESEND_API_KEY` missing → `{ok:true, skipped:true}`). Injects List-Unsubscribe + List-Unsubscribe-Post headers. Template-string `renderEmailShell()` mirrors `EmailShell.vue` chrome (hex flattened — many email clients strip CSS vars). | `api/_shared/email.ts` | `tests/unit/api/email.test.ts` 7/7 |
| **B.8** channelName server mirror | Plan 11 Task 1.7. Server-side mirror of `useChannelName()`. Validates userId is UUID + domain/topic match `[a-zA-Z0-9._-]+`. | `api/_shared/realtime.ts` | `tests/unit/api/realtime.test.ts` 7/7 |
| **B.9** idempotency-cleanup cron + vercel.json | Plan 11 Task 1.8. Daily 04:00 UTC. Edge runtime. Bearer `CRON_SECRET` auth. Stub-guarded: missing secret → 503 `{stub:true}`. Deletes rows older than 24h. | `api/cron/idempotency-cleanup.ts`, `vercel.json` (cron entry appended) | `tests/unit/api/cron-idempotency-cleanup.test.ts` 5/5 |

---

## Commit log (newest first)

```
19d81b22 feat(c11-be): Task 1.8 idempotency-cleanup cron + vercel.json
f8746eaa feat(c11-be): Task 1.6 sendEmail wrapper (env-guarded stub) + renderEmailShell helper
633053cb feat(c11-be): Tasks 1.4 + 1.5 Sentry init (env-guarded stubs)
44fffe1b feat(c11-be): Task 1.7 channelName server-side mirror
0f96f427 feat(c11-be): Tasks 1.3b + 1.3c env helpers + CI no-leak gate
21adc27a feat(c11-be): Task 1.3 verifyIdempotency helper + tests
7c4f9db8 feat(c11-be): Task 1.1 migration — idempotency_keys table + RLS + shape tests
b18e93ff chore(c11): Phase 5c lint-cleanup — file-exempt directive + 5 C11 surfaces
26aa91fe feat(c11): Phase 5c — showcase auto-mount + 11 visual-diff baselines
```

(+ `.gitignore` entry for `supabase/.branches/` + `supabase/.temp/` + this DONE report + handoff doc archive, bundled in merge commit.)

## Deps added (founder-approved 2026-05-21)

```
@sentry/vue   ^10.53.1   (B.6 browser init)
@sentry/node  ^10.53.1   (B.6 server init)
resend         ^6.12.3    (B.7 sendEmail wrapper)
```

## Database migrations applied

Both via MCP to remote dev project `rqnyxkfdtvjgfsvdfutw` ("jihoyang333's Project"):

- `20260519_w1_audit_log.sql` (was authored 2026-05-19 but never deployed — applied 2026-05-21 in this pass)
- `20260521_11_idempotency_keys.sql` (new this pass)

Both tables have `rls_enabled=true`, exactly 1 service-role policy, 3 indexes each. Verified via `pg_class + pg_policies + pg_indexes` join.

## Gates

- `bun run check` (lint + no-raw-visual + no-leak) — **exit 0**.
- `bun test ./tests/unit` — **460/461 pass**. The one failing test (`tests/unit/stores/auth.test.ts` "Failed to get session: Network error") passes in isolation (12/12); cross-suite ordering interference. **Pre-existing**, not introduced by this branch. Tracked separately.
- Playwright visual-diff (`primitives.visual.spec.ts`) — **27/27 pass**, zero skipped.

## Out of scope / carryovers

- **Lint flip warn → error.** 284 OpenPencil-era + non-C11 cluster violations remain. Per handoff Task A.2 explicitly out of Phase 5c scope. Future cluster waves clean their own surfaces.
- **Live Sentry / Resend DSNs.** Stubs ship; real accounts wired pre-launch per `00-PRD_SCOPE_PLAN.md §11` + memory `project_external_accounts_deferred`.
- **Integration tests against live DB.** Migration shape tests are static regex/string-match (matches existing `tests/unit/migrations/catalog.test.ts` pattern). RLS-policy + integration tests against a live Supabase belong in a Plan 11 follow-up wave (Phase 2 of the plan, plan §10).
- **EmailShell ↔ renderEmailShell drift detection.** The template-string helper duplicates the Vue SFC chrome on purpose (avoids pulling Vue runtime into Edge bundle). A future visual-diff spec needs to compare both renders byte-for-byte. Carryover.

## Founder smoke checklist (before merging)

- [ ] `/dev/cluster-11` renders top-to-bottom in dark mode. Scroll to "Auto-mount (Playwright baseline targets)" section near the bottom — verify all canonical primitives render without console errors.
- [ ] `/dev/tokens` still renders (file-exempted).
- [ ] No console errors when navigating between routes.
- [ ] `bun run check` exits 0 locally.

## Merge instruction

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git switch feat/m9-shopify
git merge --no-ff app/cluster-11-phase5c -m "Merge W6 Cluster 11 Phase 5c hardening + Plan 11 backend"
# Do NOT push — founder pushes per repo convention.
```

End of report.
