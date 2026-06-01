# W11a — Cluster 05 (Brand Kit + Drag/Drop) AUDIT REPORT

**Branch:** `app/cluster-05-brand-kit` (worktree `/Users/jihoyang/kova-build-c05`)
**Base:** `origin/feat/m9-shopify`
**Audit type:** audit-AND-fix pass — every actionable finding was fixed in-branch, not just logged.
**Date:** 2026-05-31

## Verdict: ✅ PASS

All quality gates green. The first-ever execution of the DB integration suite (Docker
now available) caught **one real CRITICAL migration bug** (non-unique single-open-draft
index), now fixed. All previously-open code-review findings (HIGH-1, MED-2/3/4, LOW-1)
are closed. Color-edit + logo-upload were built out (overbuild). Two genuinely
cross-cluster items remain owned by Cluster 06 / Cluster 03 with a precise handoff.

**18 commits** (13 original build + 5 W11a-fix): `git log feat/m9-shopify..app/cluster-05-brand-kit`.

---

## A. Branch + diff baseline

`git diff --stat feat/m9-shopify...app/cluster-05-brand-kit` — one-per-task conventional
commits. The 5 fix commits:
- `cb0d37b6` MED-2/3/4 + LOW-1 (server mime, realtime publication, idempotency-first, KovaIcon)
- `fcee9ac0` PRD §4.1 patch (8 database-reviewer SQL fixes + realtime publication)
- `c993bc3d` color-edit + logo-upload + HIGH-1 inline-style sweep
- `b33565ca` destructure defineProps across 16 components (lint)
- `1bcdf29a` + `93d8f90f` UNIQUE single-open-draft index + repaired DB integration tests

## B. MIME type registry

`src/composables/brand-kit/brand-kit-dnd.ts` is the single source of truth. The 5 MIME
types match **PRD §6.5** (authoritative) and the Cluster 06 receiver:

| MIME | Source | Receiver (c06 `use-canvas-drop.ts`) |
|---|---|---|
| `application/x-kova-brand-color` | `BrandColorSwatch` | ✅ handled |
| `application/x-kova-brand-font` | font chip | ✅ handled |
| `application/x-kova-brand-asset` | `BrandLogoRow` | ✅ handled |
| `application/x-kova-saved-block` | saved-block grip | ✅ handled |
| `application/x-kova-tone-snippet` | (optional, MVP) | ✅ handled |

**Discrepancy flagged (not a defect):** the W11a audit *prompt* §B listed
`x-kova-color-token` / `-font-token` / `-logo-asset` names. Those are **stale** — both
the PRD §6.5 spec and the shipped impl use the `x-kova-brand-*` names, and Cluster 06's
receiver already matches them. No code change needed; the prompt's list is out of date.

## C. Drop-handler scene-graph mutation discipline

`resolveBrandKitDrop` (`src/composables/brand-kit/resolve-brand-kit-drop.ts`) is a **pure**
payload→intent resolver with payload validation, c05-owned. The canvas **receiver
dispatcher** is Cluster 06-owned (PRD §6 boundary) and is being wired in `use-canvas-drop.ts`
in the active c06 working tree right now — it already references all 5 brand-kit MIME types.
**No `packages/core/` mutation**; node creation goes through the c06 dispatcher → `figma.*`.

## D. RPC search_path audit (W5a CT-013)

All **12** SECURITY DEFINER RPCs carry `SET search_path = public, pg_temp` (LANGUAGE
plpgsql), each with an `auth.uid()` ownership check and no dynamic `EXECUTE` concat.
Enforced two ways: the runnable unit test `tests/unit/migrations/rpc-search-path-lock.test.ts`
(queries `pg_proc`, 12 RPCs) and `database-reviewer` (×2). **PASS.**

## E–F. Voice-draft guardrail + saved blocks

- Guardrail intact: AI never writes `brands.*` directly — only `voice_drafts`, confirmed
  by the user via `VoiceDraftConfirmModal`. Verified by integration tests (confirm writes
  `identity.voice` + appends snippets; discard writes nothing to `brands.*`).
- **CRITICAL fixed:** `idx_voice_drafts_brand_unconfirmed` was `CREATE INDEX` (non-unique),
  so the one-open-draft-per-brand invariant (PRD §3 #7, §12.13 re-scrape REPLACE) was
  **unenforced at the DB level**. Now `CREATE UNIQUE INDEX` with a dedupe pre-step. The
  extract Edge Function already discards the prior open draft before insert, so the unique
  index is the race-safety net, not a normal-path constraint.
- Saved-block payload carries `content` + type; drop resolver pre-fills TEXT node content.

## G. Design-system compliance (HIGH-1)

`git diff … -- 'src/**' | grep -E 'Math.random|: any|!\.|<style|style scoped|<svg|<icon-lucide-'`
→ **clean.** Every static inline `style=` across the 13 brand-kit components + showcase was
converted to **append-only canonical `kova-hifi.css` classes** (zero new `:root` tokens);
dynamic `:style` bindings (swatch fill, progress-bar width) preserved. Render verified
headless at 1440px — swatches, font rows, logo rows, identity cards all render correctly.

## J. Quality gates (re-run)

| Gate | Result |
|---|---|
| `bun run test:unit` | ✅ **2139 pass / 0 fail** (+18 new tests; was 2121) |
| `bun run test:dupes` | ✅ 1.24% lines / 1.58% tokens (<3%) |
| Migration applies to real Postgres | ✅ both c05 files COMMIT cleanly |
| **DB integration suite** (Docker up) | ✅ **31 pass / 0 fail** against local Supabase |
| Render smoke (`/dev/cluster-05`, headless) | ✅ all primitives render; only console error is missing-`.env` (env, not render) |
| c05 lint (`define-props-destructuring`) | ✅ 0 in c05-owned files |

## K. Code-review sweep

`superpowers:code-reviewer` over the full fix delta → **no CRITICAL/HIGH/MEDIUM**; 2 LOW:
LOW-1 (logo upload validates MIME client-side only — acceptable MVP, reuses trusted
onboarding write path; tracked post-MVP) and LOW-2 (UNIQUE index could fail on a dirty
pre-migrated DB — **fixed** with the dedupe pre-step).

## Findings closed this pass

| ID | Severity | Status |
|---|---|---|
| Single-open-draft index non-unique | CRITICAL | ✅ fixed (UNIQUE + dedupe) |
| HIGH-1 inline styles | HIGH | ✅ fixed (canonical classes) |
| MED-2 client mime | MEDIUM | ✅ fixed (server-sniffed mime in response + stores) |
| MED-3 realtime broadcast/postgres_changes | MEDIUM | ✅ fixed (publication + REPLICA IDENTITY FULL; dead broadcast removed) |
| MED-4 idempotency before rate-limit | MEDIUM | ✅ fixed (+ regression test) |
| LOW-1 ×-glyph | LOW | ✅ fixed (KovaIcon) |
| LOW-2 unique-index on dirty DB | LOW | ✅ fixed (dedupe pre-step) |
| Lint define-props (15) | — | ✅ fixed (destructure, 16 files) |
| 2 never-run integration tests broken | — | ✅ fixed (real assertions) |
| Task-6 color/logo stubs | — | ✅ built (overbuild) |

## Deferred — owned by other clusters (correct boundary, NOT undone-by-c05)

1. **Drag-to-canvas E2E** — the canvas drop *dispatcher* is Cluster 06-owned and being
   wired in the active c06 working tree now; `resolveBrandKitDrop` is ready to consume.
2. **Color-ADD beyond 4 slots + wordmark upload** — need Cluster 03 brand-schema changes
   (append-list colors / a wordmark column). The 4 fixed slots are fully editable + a
   primary-logo upload is functional; arbitrary add/wordmark stay Phase-2 (PRD §10).
3. **Logo server-side MIME sniff** (code-review LOW-1) — post-MVP; route through an Edge
   Function with `sniffFileType` to match fonts/KB.
4. **Pixel visual-diff vs A7/B3/B8 mockups (≤0.5%)** — the founder browser-review gate
   (`feedback_browser_smoke_test_before_done`); code is confirmed rendering.

## Environmental notes (pre-existing, not c05 defects)

- **Migration-version-prefix collisions** — 7 date-prefixes are shared by multiple
  migration files (incl. c05's two `20260615` files). Hosted Supabase keys migrations by
  full filename (no collision); the local CLI truncates to the date prefix → `migration up`
  / `db reset` collide. The integration suite was therefore run by applying the c05
  migration via `psql` directly (DDL is collision-free; only CLI bookkeeping collides).
  Repo-wide; worth a separate cleanup pass (rename to unique prefixes).
- **FK-target asymmetry (informational)** — `brands.user_id → auth.users` but
  `voice_drafts.user_id → public.users`. Works because a trigger mirrors `auth.users` →
  `public.users` (70=70 rows observed); harmless but inconsistent. Optional: align to
  `auth.users` for symmetry.

---

**W11a AUDIT COMPLETE. Verdict: PASS. All actionable findings fixed in-branch.**
