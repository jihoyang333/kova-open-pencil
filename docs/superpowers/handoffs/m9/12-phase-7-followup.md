# M9 Phase 7 — Follow-up Cleanup + Dev Store Setup

**Status:** Ralphy completed Task 7.1 scaffolding on 2026-04-21 (21m57s, 55k output tokens, exit 0). Three commits landed in `kova-open-pencil-1` (inner repo). Cleanup + dev-store wiring remain before the E2E suite can actually run green.

## Pre-flight (read first)

- There are **two git repos** in this project:
  - **Outer:** `/Users/jihoyang/kova-main` (`main` branch now on `feat/m9-shopify`). Tracks outer docs/handoffs + the outer `.github/`. Remote default = `origin/master`.
  - **Inner:** `/Users/jihoyang/kova-main/kova-open-pencil-1` (on `feat/m9-shopify`). The real Kova app. This is where M9 code lives.
- All M9 code commits, tests, and CI live in the **inner** repo.
- Ralphy also made **one commit in the outer repo** (`d16b6a6`) that is redundant and should be reverted — see Task A below.
- Don't touch the Yjs/y-indexeddb persistence, `packages/core/`, or the canvas/editor UI.

## State snapshot

**Inner repo (`kova-open-pencil-1`) — branch `feat/m9-shopify`:**

```
f32caff test(m9): fix probeShopExists tests — injectable fetch for hermetic mocking
4784fe0 test(m9): e2e CI wiring — skip guard, storageState guard, GHA workflow
1affe26 test(m9): add Shopify E2E scaffold with storageState auth
c55bed7 fix(m9): address code-review findings in chunk 10 output
c0a16c8 feat(m9): CI lint — no PII in shopify_orders_agg
```

Uncommitted inner-repo changes (from Ralphy flipping checkboxes):
- `docs/superpowers/handoffs/m9/10-phase-5.6-6-settings-observability.md`
- `docs/superpowers/handoffs/m9/11-phase-7-e2e-smoke.md`

**Outer repo (`kova-main`) — branch `feat/m9-shopify`:**

```
d16b6a6 ci(m9): add Shopify E2E workflow — runs on feat/m9-shopify and main   ← REDUNDANT
a4836fa docs: add caveman communication style directive to CLAUDE.md
```

## What Ralphy built (inner repo, already committed)

| File | Purpose |
|------|---------|
| `tests/e2e/m9-shopify.spec.ts` (429 lines) | 10-step Playwright suite: login → onboarding → Shopify OAuth via storageState → sync poll (5 min) → canvas → product drag → price assert → disconnect → Unavailable badge |
| `tests/e2e/helpers/shopify-auth.ts` (109 lines) | One-shot headed OAuth capture helper. Writes `tests/e2e/.auth/shopify-dev-store.json` |
| `playwright.config.ts` | New `shopify` project; storageState guarded with `fs.existsSync` so config loads without the auth file |
| `.github/workflows/shopify-e2e.yml` | GHA: triggers on push to `feat/m9-shopify` + `main`; restores session from `SHOPIFY_DEV_STORE_SESSION` secret (base64 JSON); uploads Playwright report on failure |
| `.gitignore` | Adds `tests/e2e/.auth/` to prevent committing session files |

**Credential skip guard:** the suite calls `test.skip()` cleanly when `SHOPIFY_DEV_STORE` / `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` / `SUPABASE_SERVICE_ROLE_KEY` are absent. So this CI is safe to merge without creds — it will just skip.

## Open tasks

### Task A — Revert the stray outer-repo commit

The outer repo got a duplicate CI file (`e2e-shopify.yml`) that is **not** the one that runs — the inner repo's `shopify-e2e.yml` is the source of truth. Revert so we don't maintain two.

- [ ] **Step 1:** In `/Users/jihoyang/kova-main` (outer), run:

  ```bash
  cd /Users/jihoyang/kova-main
  git revert --no-edit d16b6a6
  ```

  Expected files reverted: `.github/workflows/e2e-shopify.yml` (deleted), `.gitignore` (restored).

- [ ] **Step 2:** Verify `.github/workflows/e2e-shopify.yml` no longer exists.

- [ ] **Step 3:** No push yet — outer repo default branch is `master`, not `main`; PR target TBD by Jiho.

### Task B — Commit the handoff checkbox changes in the inner repo

Ralphy flipped checkboxes in two handoff docs but didn't commit them. Inspect the diff, then commit if the checkbox flips are correct (they should be — Task 7.1 is done).

- [ ] **Step 1:** From `kova-open-pencil-1`, inspect:

  ```bash
  cd kova-open-pencil-1
  git diff docs/superpowers/handoffs/m9/10-phase-5.6-6-settings-observability.md \
           docs/superpowers/handoffs/m9/11-phase-7-e2e-smoke.md
  ```

- [ ] **Step 2:** If the flips look correct, commit:

  ```bash
  git add docs/superpowers/handoffs/m9/10-phase-5.6-6-settings-observability.md \
          docs/superpowers/handoffs/m9/11-phase-7-e2e-smoke.md
  git commit -m "docs(m9): mark phase 7 e2e steps complete"
  ```

- [ ] **Step 3:** If any flip is wrong (e.g., a step in file 10 that wasn't really done), `git checkout --` the offending file and only commit the correct one.

### Task C — Dev-store wiring (Jiho-owned, not an AI task)

This is blocker for tests to actually execute. **Don't run these steps as an AI** — they require a human Shopify Partner account and browser interaction. This section is here so the next AI knows the shape of the blocker.

What Jiho needs to do (outside the AI loop):

1. **Create a Shopify Partner dev store** at https://partners.shopify.com → Stores → Add store → Development store. Pick any name (e.g. `kova-dev-test`).
2. **Install Kova on the dev store** via the Kova onboarding flow (locally or on a staging deploy).
3. **Capture the authenticated session** by running:
   ```bash
   cd kova-open-pencil-1
   bunx playwright test tests/e2e/helpers/shopify-auth.ts --headed
   ```
   (Exact entry point may differ — check `shopify-auth.ts` for the runnable command. It's a one-shot headed script that writes `tests/e2e/.auth/shopify-dev-store.json`.)
4. **Base64-encode the session** and add to GitHub secrets:
   ```bash
   base64 -i tests/e2e/.auth/shopify-dev-store.json | pbcopy
   ```
   Paste as `SHOPIFY_DEV_STORE_SESSION` in repo Settings → Secrets → Actions.
5. **Add remaining secrets** to GitHub: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `SHOPIFY_DEV_STORE` (the `.myshopify.com` subdomain).
6. **Push to `feat/m9-shopify`** and watch the CI run on GitHub Actions.

### Task D — Jiho manual smoke (Jiho-owned)

Per `feedback_browser_smoke_test_before_done.md`: Jiho must validate each of Success Criteria §2 items 1–9 in the browser against the dev store. Spec source: `docs/superpowers/specs/2026-04-18-m9-shopify-design.md` §2.

This task is **out of scope for the next AI run.** Jiho does it manually after Task C is wired.

## Quality gates (run after Tasks A & B)

From `kova-open-pencil-1/`:

```bash
bun run check         # oxlint --type-aware --type-check
bun run test:unit     # bun:test (Shopify unit tests pass)
bun run lint:schema   # no PII in shopify_orders_agg
```

All three must stay green. Tests should run instantly — no live Shopify calls in unit scope.

## Exit criteria for this follow-up

- [ ] Task A complete: outer repo `d16b6a6` reverted. Only one Shopify CI file exists (inner repo).
- [ ] Task B complete: inner-repo handoff checkbox flips committed (or reverted if wrong).
- [ ] Quality gates green on inner repo.
- [ ] This doc committed to `kova-open-pencil-1/docs/superpowers/handoffs/m9/12-phase-7-followup.md` with message `docs(m9): phase 7 follow-up handoff`.
- [ ] Task C (dev-store creds) explicitly left for Jiho — do NOT attempt as AI.
- [ ] Task D (manual smoke) explicitly left for Jiho — do NOT attempt as AI.

## Reference files

- Spec: `docs/superpowers/specs/2026-04-18-m9-shopify-design.md`
- Master plan: `docs/superpowers/plans/2026-04-18-m9-shopify.md`
- Original Phase 7 handoff: `docs/superpowers/handoffs/m9/11-phase-7-e2e-smoke.md` (Ralphy scope markers already applied)
- Ralphy run log: `/tmp/ralphy-m9-phase7.log` (may be rotated — not authoritative)

## Notes for the next AI

- **Both repos are on `feat/m9-shopify`.** Always check `git rev-parse --show-toplevel` before committing so you know which repo you're in.
- **Do not run `bunx playwright test --project=shopify` without dev-store creds** — it will auth-fail even with the skip guard if you force it. The skip guard only works when creds are missing entirely.
- **Do not push without Jiho's sign-off.** Both repos have unclear PR targets (inner = fork of open-pencil; outer = `origin/master`). Jiho decides merge strategy.
- **If you see the outer repo's `d16b6a6` commit is still there when you start:** Task A is your first move.
