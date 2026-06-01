# W11a — Cluster 05 (Brand Kit + Drag-Drop) — DONE report

**Branch:** `app/cluster-05-brand-kit` (worktree `/Users/jihoyang/kova-build-c05`)
**Base:** `origin/feat/m9-shopify` @ 975a9a64
**Commits:** 13 (see `git log app/cluster-05-brand-kit`)

---

## Summary

Full Cluster 05 vertical shipped: schema + 12 RPCs + RLS + storage, 3 Pinia
stores, 6 composables + a pure drop resolver, 7 Vercel edge functions, and the
complete Brand Kit UI (7 sub-tabs + 11 primitives + 5 modals) wired into the
existing `BrandKitSection` shell. **139 new unit tests; full unit suite 2121
pass / 0 fail (baseline was 1982 — zero regressions). test:dupes 1.25% (<3%).**

---

## What shipped (by Plan task)

### Backend — `feat(c05-t1)`
- `supabase/migrations/20260615_05_brand_kit.sql` — JSONB cols on `brands`
  (tone_snippets / saved_blocks / writing_rules / identity) + `brand_fonts`,
  `brand_kb_sources`, `voice_drafts` tables (CHECK constraints: 5MB font cap,
  10MB KB cap, license_attested, single-open-draft partial index) + **12
  SECURITY DEFINER RPCs** (tone/block CRUD+reorder, set_writing_rule,
  update_brand_identity, confirm/discard_voice_draft) all with
  `SET search_path = public, pg_temp` + RLS (owner-only fonts/kb, service-role
  insert voice_drafts).
- `20260615_05_brand_kit_storage.sql` — 2 private buckets + path-prefix RLS (D-5).
- Verbatim from PRD §4.1-4.3. CT-013 search_path lock asserted by a **runnable**
  unit test (`tests/unit/migrations/rpc-search-path-lock.test.ts`, 12 RPCs).

### Data layer — `feat(c05-t7)`, `feat(c05-t8-11)`
- `src/types/brand-kit.ts` + extended `Brand` type.
- `useBrandKitStore` (sorted getters + optimistic RPC actions with rollback),
  `useBrandFontsStore` (XHR upload progress + realtime), `useBrandKbSourcesStore`.
- `useVoiceDraft` (load/confirm/discard guardrail), `useFontUpload`,
  `useKbSourceUpload`, `useBrandKitDrag` (5-MIME contract per PRD §6.5),
  shared `xhr-upload` helper, `brand-kit-dnd` MIME contract.

### Drop resolver — `feat(c05)`
- `resolveBrandKitDrop` + `dropGhostLabel` — pure, c06-wireable. (Receiver
  dispatcher is **Cluster 06-owned** per PRD §6.5/§7; we own the payload contract.)

### Edge functions — `feat(c05-t12-18)`
- `api/brand-fonts/upload.ts` + `[id].ts`, `api/brand-kb-sources/upload.ts` +
  `[id].ts`, `api/brands/[id]/voice-draft/{confirm,discard}.ts`,
  `api/_shared/file-type-sniff.ts` (magic-number + ext + content-type agreement),
  EXTENDED `api/shopify/brand-kit-extract.ts` (Anthropic voice/tone inference →
  `voice_drafts`; **never writes brands.\* directly**; single-open-draft guard).
- `file-type` dep added. 76 api unit tests green.

### Vue UI — `feat(c05-t19-30)`
- 7 tab components filling the Cluster-04 `BrandKitSection` `.bk-pane`
  (architecture: fill panes, NOT PRD nested routes — superseded by shipped
  `SectionResolver`; see Phase-1 audit).
- 11 primitives + 5 modals (incl. `VoiceDraftConfirmModal` guardrail).
- Component classes lifted append-only from A7/B3/B8 mockups into
  `design-system/canonical/kova-hifi.css` (**zero new :root tokens**).
- `/dev/cluster-05` showcase route. 25 component unit tests green.

### Tests
- Unit: 139 new (stores/composables/resolver/migration-lock/components) — all green.
- Integration (skip-guarded, run with `KOVA_RUN_INTEGRATION=1` + local Supabase):
  migration, 5 RPC suites, 3 RLS suites, storage path-prefix — 10 files + helper.

---

## Gates

| Gate | Status |
|---|---|
| All Plan tasks committed | ✅ (13 commits) |
| `bun run test:unit` | ✅ **2121 pass / 0 fail** |
| `bun run test:dupes` | ✅ 1.25% lines / 1.59% tokens (<3%) |
| `bun run check` / `build` | ⚠️ RED from **pre-existing baseline** (89 lint errors on `origin/feat/m9-shopify` before c05). c05 files add only 15 `define-props-destructuring` (matching 38 pre-existing instances of the same rule); no new error categories. |
| Supabase migration RLS + RPCs verified | ⏳ **Docker not available** in this env → local Supabase can't start. Migration + search_path lock verified by runnable test; integration suite ready to run when Docker is up. |
| database-reviewer | ✅ **PASS** after fixes. Initial review FAILed with 4 CRITICAL + HIGH (real bugs in the PRD §4.1 verbatim SQL — incl. H-4 `row_number() OVER()` runtime crash, C-4 reorder array corruption). All fixed (`fix(c05-review)` commits) + re-reviewed: all CRITICAL/HIGH resolved, no new blockers. **PRD §4.1 should be patched with these fixes.** |
| code-reviewer | ✅ **PASS-WITH-FIXES**. Backend/API + guardrail + stores rated merge-quality. 3 HIGH found in Vue layer; **HIGH-2 + HIGH-3 fixed** (`fix(c05-review)`). HIGH-1 (inline `style=` across ~14 components vs CLAUDE.md "Tailwind only") deferred to the styling pass — see findings below. |
| e2e-runner (drag flows) | ⛔ **Blocked on Cluster 06** — the canvas drop *dispatcher* is c06-owned and unmerged; drag-to-canvas E2E needs c06's receiver wired to `resolveBrandKitDrop`. Settings-page CRUD/voice-draft E2E need the running app + auth fixtures. |
| Playwright visual diff (≤2%) | ⏳ Needs running dev server + screenshots (cannot close headless). Founder browser smoke is the final pre-SHIPPED gate (per `feedback_browser_smoke_test_before_done`). |

---

## Open code-review findings (for the styling pass)

- **HIGH-1**: pervasive inline `style=` across ~14 brand-kit components — convert
  static inline styles to Tailwind/design-system classes (keep legitimate dynamic
  `:style` bindings like swatch `background: color.hex`). Pairs naturally with the
  visual-diff fidelity pass.
- **MEDIUM-2**: optimistic font/kb rows store client `file.type`; use server-sniffed
  mime from the endpoint response.
- **MEDIUM-3**: edge functions emit a Realtime *broadcast* but the client subscribes
  via *postgres_changes* — drop the dead broadcast or switch the client.
- **MEDIUM-4**: rate-limit bump happens before idempotency check (a replay can 429);
  check the idempotency cache first.
- **LOW-1**: `VoiceDraftConfirmModal` uses a `×` glyph — switch to `<KovaIcon name="x">`.
- **LOW-3** / Task 6 remainder: color-edit + color-add-popover + logo-upload handlers
  in `VisualsTab` are TODO stubs (colors/logo not yet functional end-to-end).

## Follow-ups before SHIPPED

1. **Founder browser smoke + visual diff** of `/account/brand-kit` (all 7 tabs) +
   `/dev/cluster-05` at 1440px vs A7/B3/B8 mockups (≤0.5% screen).
2. **Cluster 06 integration**: wire `resolveBrandKitDrop` + `dropGhostLabel` into
   `use-canvas-drop.ts` (c06's dispatcher) + add drag-to-canvas E2E.
3. **Docker up** → run the skip-guarded integration suite + database-reviewer.
4. **code-reviewer** pass; address findings.
5. Optional cleanup: convert the 15 `define-props-destructuring` to match the
   newer repo convention (`PlanCard` style).
6. CHANGELOG-KOVA.md: not required — Cluster 05 adds no `packages/core/` changes
   (PRD §7 confirms N/A).

---

**W11a CLUSTER 05 DONE. 13 commits on app/cluster-05-brand-kit.**

---

## W11a Audit-Fix update — 2026-05-31 (+5 commits, 18 total)

The W11a audit was run as an **audit-AND-fix** pass. Every open finding above is now
closed; full report at
`docs/execution-phase/wave-audits/reports/W11a-cluster-05-AUDIT-REPORT.md`.

**Gates now (re-run):**
| Gate | Status |
|---|---|
| `bun run test:unit` | ✅ 2139 pass / 0 fail (+18; was 2121) |
| `bun run test:dupes` | ✅ 1.24% / 1.58% (<3%) |
| **DB integration suite** | ✅ **31 pass / 0 fail** — ran against a local Supabase (Docker up); the c05 migration applied via `psql` to bypass a pre-existing repo-wide migration-version-prefix collision |
| Migration on real Postgres | ✅ both files COMMIT clean |
| Render smoke (`/dev/cluster-05`) | ✅ all primitives render at 1440px |
| code-reviewer (fix delta) | ✅ no CRITICAL/HIGH/MEDIUM; 2 LOW (1 fixed, 1 tracked) |

**Open findings — resolved:**
- **HIGH-1** inline styles → ✅ converted to canonical `kova-hifi.css` classes (zero new tokens).
- **MED-2/3/4, LOW-1** → ✅ fixed (server mime; realtime publication + dead-broadcast removal; idempotency-before-rate-limit; KovaIcon).
- **LOW-3 / Task-6** color + logo handlers → ✅ **built**: `updateBrandColor` (4-slot edit/add via `useBrandsStore.updateBrand`, no new RPC) + `useLogoUpload` (primary mark → `brand-logos` bucket). Wordmark + arbitrary-add stay Cluster-03-schema Phase-2.
- **15 `define-props-destructuring`** → ✅ destructured across 16 components.
- **PRD §4.1** → ✅ patched with all SQL fixes (amendment block) incl. the UNIQUE-index fix.

**NEW finding caught + fixed this pass (first-ever integration run):**
- 🔴 **CRITICAL** — `idx_voice_drafts_brand_unconfirmed` was non-unique; the
  single-open-draft invariant was unenforced. Now `CREATE UNIQUE INDEX` + dedupe pre-step.
- Two never-run integration tests were broken (called a non-existent `public.sql` RPC;
  used a hardcoded unseeded brand_id) → repaired to assert real behavior.

**Still genuinely cross-cluster (handoff, not undone):** drag-to-canvas E2E (c06 receiver,
actively wiring); color-ADD-beyond-4-slots + wordmark (c03 schema); logo server-side MIME
sniff (post-MVP, LOW-1); pixel visual-diff vs mockups (founder browser gate).

**W11a AUDIT-FIX COMPLETE — verdict PASS.**
