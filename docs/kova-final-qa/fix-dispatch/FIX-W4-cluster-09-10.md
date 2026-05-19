# Wave 4 — Cluster 09 (Version History) + Cluster 10 (AI Chat + Memory) Bundle Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Prerequisite:** Wave 3 merged.
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/`
**Branch to create:** `fix/qa-w4-cluster-09-10-snapshots-ai`
**Estimated wall-clock:** 1 day
**Output PR title:** `fix(qa-w4-cluster-09-10): version-history + AI chat — 27 findings`

---

## Mission

Cluster 09 owns version history + snapshots + duplicate-to-canvas + GDPR Storage cascade + trash/restore + snapshot-prune cron. Cluster 10 owns AI chat panel + memory (brand memories, tone snippets, product references) + AI tool layer (Anthropic SDK adapter + Shopify tools + canvas tools).

Both clusters consume upstream waves (auth, brand schema, canvas surface, Cluster 11 primitives).

Your job: close **27 findings** total (18 Cluster 09 + 9 Cluster 10).

---

## Required reading

1. CONSOLIDATED-TRIAGE.md — Cluster 09 + Cluster 10 sections
2. QA-A — A-MED6 (09 status), A-LOW6 (10 status)
3. QA-B — B-CRIT13 (signInAs), B-HIGH20 (JWT helper), B-MED9 (path drift), B-MED5 (multi-step async)
4. QA-C — Pair 09 + Pair 10 matrices; HIGH-7/8/9, HIGH-10 (verified by Wave 3), MEDIUM-22/23/24/25/26/27/28, MEDIUM-10.6, LOW-09.9/10/11/12, LOW-10.5
5. CT-002 (routing — verified by Wave 0/3), CT-004 (measurement model — verified by Wave 0), CT-005 (default tab — verified by Wave 0), CT-013 (search_path on 3 Cluster 09 RPCs)
6. Frozen decisions
7. PRDs 09 + 10, Plans 09 + 10 (post-W0/W1/W2/W3 state)

---

## Cluster 09 findings (18)

### CRITICAL (2)

1. **B-CRIT13 signInAs test helper broken** — Plan 09:355-364.
   - Helper uses magic-link URL as Bearer token. Magic-link URL is not a JWT; the helper returns an anon client. All 14 RLS tests are dead-on-arrival (testing anon, not the target user).
   - Fix: use `signInWithPassword` after `auth.admin.updateUserById` sets a known password:
     ```ts
     async function signInAs(userId: string, password = 'test-' + crypto.randomUUID()) {
       const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
       await adminClient.auth.admin.updateUserById(userId, { password })
       const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId)
       if (error || !user) throw error
       const userClient = createClient(SUPABASE_URL, ANON_KEY)
       const { data: { session }, error: signInErr } = await userClient.auth.signInWithPassword({
         email: user.email!,
         password,
       })
       if (signInErr) throw signInErr
       return userClient
     }
     ```
   - Re-run all 14 RLS tests; verify they fail BEFORE this fix (proves they were dead) then pass after.

2. **CT-013 (09) SECURITY DEFINER `SET search_path`** — Plan 09 multiple.
   - 3 SECURITY DEFINER RPCs missing `SET search_path = public, pg_temp`. Add to each.
   - CI gate W0-5 will block PR if any DEFINER block lacks the setting.

### HIGH (4)

3. **C-HIGH7 Duplicate-to-canvas blob not wired to new canvas** — Plan 09 Task 19:2391-2407.
   - New canvas opens blank.
   - Two fix options:
     - (a) **Add `initial_state_blob_path` column** to `canvases` table. On `create_canvas` from duplicate flow, set this column. On canvas open (Cluster 02 / Cluster 06), check this column and hydrate the Yjs doc from the blob if present.
     - (b) **Modify Yjs y-indexeddb bootstrap** to check for a corresponding snapshot at the canvas's earliest `taken_at` and hydrate from there.
   - Recommend (a) — explicit column is simpler and doesn't touch the Yjs persistence layer (founder lock).
   - Migration:
     ```sql
     ALTER TABLE public.canvases ADD COLUMN initial_state_blob_path text;
     ```
   - Coordinate with Cluster 02 (Wave 2) to read the column on canvas open. **Document the contract in scope plan §6.** If Cluster 02 is already merged, add a follow-up Plan 02 amendment.

4. **C-HIGH8 snapshot-prune missing FOR UPDATE SKIP LOCKED** — Plan 09 Task 20:2483-2488.
   - Cron overlap risk. Two crons running concurrently could double-delete Storage objects + write wrong `storage_failures` counts.
   - Fix: write a SECURITY DEFINER RPC that claims rows for processing:
     ```sql
     CREATE OR REPLACE FUNCTION public.claim_snapshots_for_prune(p_batch_size int DEFAULT 1000)
     RETURNS TABLE (id uuid, scene_blob_path text)
     LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
     AS $$
     BEGIN
       RETURN QUERY
       UPDATE canvas_snapshots
       SET claimed_at = now()
       WHERE id IN (
         SELECT id FROM canvas_snapshots
         WHERE taken_at < now() - interval '30 days'
           AND claimed_at IS NULL
         ORDER BY taken_at
         LIMIT p_batch_size
         FOR UPDATE SKIP LOCKED
       )
       RETURNING canvas_snapshots.id, canvas_snapshots.scene_blob_path;
     END;
     $$;
     ```
   - Add `claimed_at timestamptz` column to `canvas_snapshots`.
   - Update cron to call this RPC.

5. **C-HIGH9 7th-day Storage sweep deferred without follow-up** — Plan 09 Task 20:2507.
   - Acceptance §8.3 silently uncovered.
   - Add Phase B task authoring the sweep. Cron invokes sweep every 7th day (`new Date().getDate() % 7 === 0` or use a dedicated weekly cron in `vercel.json`).
   - Logic: list all objects in `canvas-snapshots/` Storage bucket → diff against `canvas_snapshots.scene_blob_path` → delete objects with no DB reference.

6. **B-HIGH20 inline JWT generation pattern** — Plan 09:355-364.
   - Resolves with B-CRIT13 above.

### MEDIUM (8)

7. **C-MED22 idempotency dedup comment-only stub** — Plan 09 Task 19:2358-2359, 2405.
   - Wire real `verifyIdempotency()` from Plan 11. Pattern same as other Edge Functions.

8. **C-MED23 Storage path uses random UUID, not snapshot_id** — Plan 09 Task 19:2390.
   - PRD §4.3 invariant: path = `{user_id}/{brand_id}/{canvas_id}/{snapshot_id}.kiwi.zst`.
   - Fix: pre-generate snapshot UUID, pass to RPC and to Storage upload:
     ```ts
     const snapshotId = crypto.randomUUID()
     const path = `${userId}/${brandId}/${canvasId}/${snapshotId}.kiwi.zst`
     // upload to path...
     // INSERT canvas_snapshots row with id = snapshotId, scene_blob_path = path
     ```

9. **C-MED24 magic numbers in cron** — Plan 09:2486.
   - `30 * 24 * 60 * 60 * 1000` hardcoded. Replace with `SNAPSHOT_FREE_RETENTION_DAYS * 24 * 60 * 60 * 1000` where `SNAPSHOT_FREE_RETENTION_DAYS` is imported from `@/lib/feature-flags`.

10. **C-MED25 useCanvasEditLock ref-counted vs single-owner** — Plan 09 Task 12a:1552-1557.
    - PRD implies single-owner boolean toggle; Plan implements ref-counted multi-caller.
    - Fix: switch to boolean. Warn (console + Sentry) on double-lock attempts to surface contention.
    - Test: lock + lock again → second call returns false + emits warning.

11. **C-MED26 (09) File-menu Version-history item** — Plan 09 ↔ Plan 06.
    - Wave 3 Cluster 06 added the menu item. Verify the contract. Plan 09 implements the `<VersionHistoryPanel>` that the menu opens.

12. **A-MED6 PRD 09 status stale** — PRD 09 §0.
    - Bump to `IN-REVIEW 2026-05-18` (or 2026-05-19 if newer ratifications).

13. **B-MED9 PRD path drift** — Plan 09:5, 12, 13, 15.
    - Replace `docs/prd/` with `docs/kova-final-prds/`. Sed-style replace.

14. **B-MED5 multi-step async Promise.all** — Plan 09 (also 04 + 10).
    - Find sequential awaits that could parallelize. E.g.:
      ```ts
      // BEFORE
      const snap = await fetchSnapshot(id)
      const canvas = await fetchCanvas(canvasId)
      // AFTER
      const [snap, canvas] = await Promise.all([fetchSnapshot(id), fetchCanvas(canvasId)])
      ```
    - Audit each Edge Function + composable in Cluster 09 for parallelizable awaits. Apply where safe (no dependency between calls).

### LOW (4)

15. **C-LOW09.9 Edge Function runtime config** — Plan 09 Tasks 19+20.
    - Add `export const config = { runtime: 'edge' }` to each Vercel Function file. Validates via Vercel Fluid Compute selection.

16. **C-LOW09.10 CSS pointer-events overlay** — Plan 09 Task 21.
    - Currently `@mousedown.capture` + `window.__spaceHeld` global hack. Refactor to CSS-driven overlay:
      ```vue
      <div :class="{ 'pointer-events-none': pannable, 'pointer-events-auto': !pannable }">
      ```
    - Remove global `window.__spaceHeld`.

17. **C-LOW09.11 format_version CI grep** — Plan 09 + Plan 07a.
    - Add CI step that grep-checks `packages/core/codec/` diffs for `format_version` bump. Implement in Plan 07a (W3 already covers); coordinate.

18. **C-LOW09.12 loadingByCanvas no skeleton** — Plan 09 Task 17.
    - Store has `loadingByCanvas: Record<canvasId, boolean>`. Template doesn't render `<KovaSkeleton>` when loading.
    - Add `<KovaSkeleton v-if="loadingByCanvas[canvasId]">` branch.

---

## Cluster 10 findings (9)

### HIGH (3)

19. **CT-005 (10) Design default-active in 5 places** — PRD 10 lines 24, 39, 56, 147, 740.
    - W0-7 should have propagated. Verify with grep:
      ```sh
      grep -n "Design (default-active)" docs/kova-final-prds/10-ai-chat-and-memory.md
      ```
    - Must return 0. If any remain, replace with "AI (default-active)".

20. **CT-004 (10) MEASUREMENT NodeType + addMeasurement signature** — PRD 10 lines 14, 87, 109, 133, 706.
    - W0-7 should have propagated. Verify.
    - Plan 10 Task 11 `addMeasurement` tool wrapper signature must match PRD 07a §2.1 page-level model:
      ```ts
      tools.addMeasurement = tool({
        description: 'Add a measurement to the current page',
        parameters: object({
          fromNodeId: string(),
          toNodeId: string(),
          orientation: union([literal('horizontal'), literal('vertical')]),
        }),
        execute: async ({ fromNodeId, toNodeId, orientation }) => {
          // calls figma.currentPage.addMeasurement({ fromNode, toNode, orientation })
        },
      })
      ```

21. **C-HIGH10 useRightPanelStore name drift** — Plan 10:2394, 2401, 2436.
    - W0-3 canonicalized. Update Plan 10 to import `useRightPanelStore` from `@/stores/right-panel`. Verify with grep:
      ```sh
      grep -n "useRightPanelTabStore\|right-panel-tab" docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md
      ```
    - Must return 0.

### MEDIUM (4)

22. **C-MED27 dual mutation paths to chat_conversations.product_references** — Plan 10 Tasks 3+4.
    - Task 3's `updateProductReferences` action vs Task 4's `persistAndPatch` direct assignment.
    - Refactor Task 4 to delegate to Task 3's action. Single mutation entry point.

23. **C-MED28 chip row position contradiction** — PRD 10:619 vs §3.2+§12.12.
    - §6.4.2 says "above attachments"; §3.2/§12.12 (founder lock) say BELOW.
    - PRD edit line 619: change to BELOW.

24. **C-MED-10.6 Server-side proxy + sub-processor wiring** — PRD 10 §8.5 + §8.6.
    - Only PFC.5 verifies via test-suite; no specific acceptance verification.
    - Add §8.5/§8.6 acceptance verification step in Plan 10 Task 19 (or relevant test task).

25. **C-MED5 Promise.all multi-step async** — Plan 10 (covered by Cluster 09 finding #14 above; same logic applies here for chat-side awaits).

### LOW (2)

26. **A-LOW6 PRD 10 status stale** — PRD 10 §0:8-11.
    - Bump to `IN-REVIEW 2026-05-17`.

27. **C-LOW10.5 engine_unavailable error code + Design default E2E** — Plan 10 Tasks 10/11 + Task 16.
    - (a) Plan adds `engine_unavailable` error code not in PRD §8.4 acceptance. Either update PRD §8.4 to include it, or remove from Plan.
    - (b) Task 16 E2E doesn't verify Design (now AI per W0-7) default-active. Update E2E to assert AI tab visible by default.

---

## Output report

```markdown
## Wave 4 Cluster 09 + 10 — Fix Agent Report

**Branch:** fix/qa-w4-cluster-09-10-snapshots-ai
**Commits:** N

### Cluster 09 findings closed (18)
- [x] B-CRIT13 signInAs helper rewrite — commit <hash>
- [x] CT-013 (09) search_path on 3 RPCs — commit <hash>
- [x] C-HIGH7 initial_state_blob_path hydrate path — commit <hash>
- [x] C-HIGH8 claim_snapshots_for_prune RPC — commit <hash>
- [x] C-HIGH9 7th-day sweep authored — commit <hash>
- [x] B-HIGH20 verified resolved by B-CRIT13 fix
- [x] C-MED22 idempotency_keys integration — commit <hash>
- [x] C-MED23 snapshot_id Storage path — commit <hash>
- [x] C-MED24 retention-days constant — commit <hash>
- [x] C-MED25 useCanvasEditLock single-owner — commit <hash>
- [x] C-MED26 (09) version-history panel — commit <hash>
- [x] A-MED6 PRD 09 status bump — commit <hash>
- [x] B-MED9 PRD path drift — commit <hash>
- [x] B-MED5 Promise.all (09 portion) — commit <hash>
- [x] C-LOW09.9 edge runtime config — commit <hash>
- [x] C-LOW09.10 CSS overlay refactor — commit <hash>
- [x] C-LOW09.11 format_version CI grep — commit <hash>
- [x] C-LOW09.12 KovaSkeleton branch — commit <hash>

### Cluster 10 findings closed (9)
- [x] CT-005 (10) AI default verified — commit <hash>
- [x] CT-004 (10) addMeasurement signature — commit <hash>
- [x] C-HIGH10 useRightPanelStore canonical — commit <hash>
- [x] C-MED27 dual mutation refactor — commit <hash>
- [x] C-MED28 chip row position — commit <hash>
- [x] C-MED-10.6 §8.5/8.6 verification — commit <hash>
- [x] C-MED5 (10 portion) Promise.all — commit <hash>
- [x] A-LOW6 PRD 10 status bump — commit <hash>
- [x] C-LOW10.5 engine_unavailable + AI default E2E — commit <hash>

### Migrations shipped
- `supabase/migrations/YYYYMMDDHHMMSS_add_initial_state_blob_path.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_add_claimed_at_snapshots.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_claim_snapshots_for_prune.sql`

### Tests added/modified
- `tests/db/rls-snapshots-real-jwt.test.ts` (replaces broken signInAs version)
- `tests/api/duplicate-canvas-hydrate.test.ts`
- `tests/api/snapshot-prune-concurrent.test.ts`
- `tests/api/snapshot-prune-sweep-7th-day.test.ts`
- `tests/ai/addMeasurement-tool.test.ts`
- ...

### Cross-cluster verified
- audit_log (CT-001) — N audit writes added
- KovaIcon (CT-003) — verified
- useRightPanelStore canonical (W0-3) — verified
- AI default tab (W0-7) — verified
- MEASUREMENT page-level (W0-7) — verified
- Cluster 02 needs to read `initial_state_blob_path` on canvas open — coordination noted

### Quality gates
- [x] All checks pass
- [x] CI gates green
- [x] All 14 RLS tests passing post-signInAs fix
- [x] Stripe-test-webhook + Shopify-mock + Anthropic-stub all green

### Blockers
None / list. If Cluster 02 already merged and didn't read `initial_state_blob_path`, a follow-up Plan 02 amendment PR is needed (small).
```

---

## Hard rules

1. **Do NOT modify `packages/core/`.** AI tool layer wraps it; doesn't touch.
2. **Do NOT expose `ANTHROPIC_API_KEY` to browser.** All AI calls go through server-side proxy.
3. **Founder lock — system prompt constant in `use-chat.ts`** is read-only.
4. **Yjs / y-indexeddb persistence layer** is read-only. Use the `initial_state_blob_path` column (Cluster 02 reads it) rather than modifying Yjs bootstrap.
5. **TDD per finding.**

---

**End of W4 Cluster 09+10 dispatch prompt.**
