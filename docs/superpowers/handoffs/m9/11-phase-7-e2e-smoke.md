# M9 Chunk 11 — Phase 7: Coverage + E2E + Smoke

## Pre-flight (CRITICAL — read first)

- DO NOT read the master plan (`docs/superpowers/plans/2026-04-18-m9-shopify.md`) unless you hit a reference gap.
- DO NOT read the master spec (`docs/superpowers/specs/2026-04-18-m9-shopify-design.md`) unless you hit a reference gap.
- This handoff's task body is extracted byte-for-byte from the master plan — it is self-contained.
- Current branch: `feat/m9-shopify`. Verify with `git status` and `git log -1`.
- Expected last commit: `feat(m9): CI lint — no PII in shopify_orders_agg` (from Chunk 10).
- Before you start: run `bun run check && bun run test:unit && bun run lint:schema` from `kova-open-pencil-1/` — must be green.

## Scope

Phase 7 entirely:
- **7.0** — Coverage audit: run `bun test --coverage` on all Shopify test directories and fill any gaps below 80%.
- **7.1** — Playwright E2E at `tests/e2e/m9-shopify.spec.ts` (connect → sync → design → disconnect). Use the `e2e-runner` agent.
- **7.2** — Jiho manual smoke test: generate the smoke checklist doc and hand off to Jiho.

This is the final chunk. After Jiho approves the manual smoke, merge `feat/m9-shopify` → `main` via PR using `superpowers:finishing-a-development-branch`.

## Out of scope

- Nothing — this is the last chunk.

## Quality gates — run after every step

```bash
cd kova-open-pencil-1
bun run check
bun run test:unit
bun run lint:schema
bun test --coverage tests/engine/shopify tests/api/shopify
```

<!-- BODY START — verbatim extract from master-plan lines 2754..2864. Do not edit. -->
## Phase 7 — Tests, E2E, smoke

### Task 7.0 — Unit test coverage baseline (rolling)

This is a **rolling gate**, not a one-off task. As each Phase 1–6 task completes, Ralph verifies `bun run check && bun run test:unit` passes and the covered surface includes the rows listed in spec §11 Task 7.0. **The tasks above already include the TDD steps for each of these.** This task entry exists to catch gaps.

- [ ] **Step 1: Coverage audit at end of Phase 6**

```bash
cd kova-open-pencil-1
bun test --coverage tests/engine/shopify tests/api/shopify
```

Expected: ≥80% line coverage on `api/shopify/*`, `api/_shared/shopify-*.ts`, `src/canvas-extensions/product-variant/*`, `src/stores/shopify-products.ts`, `src/stores/product-variant-bindings.ts`, the five new AI tools, and `scripts/lint-schema-invariants.ts`.

- [ ] **Step 2:** If any surface below 80%, write the missing tests. Do **not** lower the bar.

- [ ] **Step 3:** No commit — this is a gate.

---

### Task 7.1 — Playwright E2E: connect → sync → design → disconnect

**Files:**
- Create: `tests/e2e/m9-shopify.spec.ts`
- Create: `tests/e2e/helpers/shopify-dev-store.ts` (dev-store login helper)

**Tool:** `e2e-runner` agent.

- [ ] **Step 1: Dispatch `e2e-runner` agent** with: "Write a Playwright E2E at `tests/e2e/m9-shopify.spec.ts` that runs against a Shopify development store. Flow: (1) login to Kova; (2) create a new brand via onboarding; (3) click Shopify on store-type step; (4) OAuth flow with a stored dev-store session (use storageState); (5) wait for `shopify_connections.sync_progress.phase === 'done'` (poll Supabase via service-role REST from the test with a timeout of 5 minutes); (6) open a new canvas; (7) drag first product from Shop panel onto canvas; (8) assert the resulting frame has a price text child whose value equals the variant price; (9) Settings → Brand → Integrations → Disconnect; (10) verify the frame shows 'Unavailable' badge. Use `page.waitForResponse` not `page.waitForTimeout`."

- [ ] **Step 2: Run — expect test code generated and passing in CI on the chosen dev store.**

- [ ] **Step 3: Add to CI** — run on every push to `feat/m9-shopify` + on `main`.

- [ ] **Step 4: Commit.**

```bash
git add tests/e2e/m9-shopify.spec.ts tests/e2e/helpers/shopify-dev-store.ts playwright.config.ts
git commit -m "test(m9): e2e — connect/sync/design/disconnect against dev store"
```

---

### Task 7.2 — Jiho manual smoke test

**Owner:** Jiho.

Per feedback memory `feedback_browser_smoke_test_before_done.md`: green CI ≠ working feature. Jiho must validate each of Success Criteria §2 items 1–9 in the browser against a live Shopify development store.

- [ ] **Step 1:** Jiho follows the smoke checklist (to be provided by Ralph as a markdown checklist in `docs/superpowers/handoffs/2026-04-XX-m9-smoke.md`).
- [ ] **Step 2:** On failure: Ralph reopens the relevant Phase/Task and cycles through TDD + verification-before-completion.
- [ ] **Step 3:** On pass: merge `feat/m9-shopify` → `main`. Use `superpowers:finishing-a-development-branch` for the merge decision.

---

## Rate-limit middleware (attaches to all ad-hoc Shopify calls)

Per spec §10, all direct Shopify Admin API calls outside Bulk Operations must go through a shared rate-limit middleware.

**File:** `api/_shared/shopify-client.ts` (extend)

Add a `shopifyFetch(shop, token, init)` wrapper that:
1. Inspects response headers on every call: `X-Shopify-Shop-Api-Call-Limit` (REST) and GraphQL `extensions.cost.throttleStatus`.
2. On `429` or REST `call_limit > 35/40`: backoff with exponential delay (base 1s, cap 30s), respect `Retry-After` when present.
3. On GraphQL `THROTTLED`: read `throttleStatus.currentlyAvailable` and sleep until enough budget restored.
4. Exposes the wrapper everywhere in `api/shopify/*` — never call `fetch()` directly against `admin/api` again. Enforced by a lint rule or a `grep` check in CI.

Write unit tests in `tests/engine/shopify/rate-limit.test.ts` for: 429 → retry, exponential backoff growth, GraphQL THROTTLED parse, respect of `Retry-After`. Integrate incrementally — when introduced inside Task 2.3, add the wrapper and retrofit Tasks 1.3/2.2/2.4 to use it.

**Commit separately:** `feat(m9): rate-limit middleware for shopify REST + GraphQL`.

---

## Quality gates — run after every task

```bash
cd kova-open-pencil-1
bun run check         # oxlint --type-aware --type-check
bun run test:unit     # bun:test
bun run test:dupes    # jscpd < 3%
```

Fix every lint/type/dupe finding before committing. `bun run format` before commit is encouraged.

---

## Definition of Done (per spec §15)

- [ ] All 9 §2 success criteria pass against a real Shopify dev store.
- [ ] Playwright E2E green in CI.
- [ ] Jiho manual smoke green.
- [ ] All 4 compliance webhooks return 200 on test fixtures.
- [ ] `bun run lint:schema` green (no PII in orders_agg).
- [ ] Sentry captures zero unhandled errors across a full connect→sync→design→export→disconnect flow on dev store.
- [ ] No regressions to M1–M5.5 (existing non-Shopify brands work unchanged — verify by running existing E2E suite on main prior to merging).
<!-- BODY END -->

## Exit criteria

- [ ] Task 7.0: coverage ≥ 80% on all Shopify surfaces — gaps filled.
- [ ] Task 7.1: Playwright E2E committed + CI wired.
- [ ] Task 7.2: smoke checklist doc generated at `docs/superpowers/handoffs/2026-04-XX-m9-smoke.md`. Jiho signs off.
- [ ] All Definition of Done items above checked.
- [ ] `superpowers:finishing-a-development-branch` used for final merge decision.

## This is the final chunk. M9 is complete after Jiho signs off on smoke.
