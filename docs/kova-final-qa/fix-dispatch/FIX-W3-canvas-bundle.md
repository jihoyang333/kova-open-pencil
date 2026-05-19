# Wave 3 — Canvas Bundle (Cluster 06 + 07a + 07b + 08) Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Prerequisite:** Wave 2 merged.
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/`
**Branch to create:** `fix/qa-w3-canvas-bundle`
**Estimated wall-clock:** 1.5 days
**Output PR title:** `fix(qa-w3-canvas): canvas chrome + engine + inspector + menus — 31 findings`

---

## Mission

You are the **Wave 3 canvas-bundle fix agent.** Four clusters bundled:
- **Cluster 06** — Canvas editor scaffold + AI chat panel chrome
- **Cluster 07a** — Canvas engine core + renderer (incl. SLICE NodeType + page-level Measurement)
- **Cluster 07b** — Canvas engine inspector + overlays (find/eyedropper/gradient/boolean ops/clipboard)
- **Cluster 08** — Canvas menus, popovers, shortcuts (find feature dropped here per W0-2)

All four touch the canvas surface area. Bundle them to avoid coordination cost and merge conflicts.

Your job: close **31 findings** total.

**CRITICAL CONSTRAINT:** `packages/core/` is read-only EXCEPT for documented SLICE + page-level Measurement exceptions (founder lock #16). Cluster 07a is the documented exception (B-NOTE2 verifies). All other work outside `packages/core/`.

---

## Required reading

1. CONSOLIDATED-TRIAGE.md — Cluster 06, 07a, 07b, 08 sections
2. QA-A — A-HIGH2, A-HIGH3, A-HIGH4, A-HIGH5, A-LOW6 (status hygiene)
3. QA-B — B-HIGH7 (06+05), B-CRIT1 (06), B-NOTE2 (07a packages/core/)
4. QA-C — Pairs 06/07a/07b/08 matrices; CRITICAL-1/2/3 (find feature ownership), HIGH-10/15, MEDIUM-06.1/2, MEDIUM-07b.1, MEDIUM-08.4/5, LOW-06.3/4/5, LOW-07a.1-4, LOW-07b.2-5, LOW-08.6
5. CT-002 routing, CT-004 measurement, CT-005 default tab, CT-006 Cmd+K residuals, CT-022 find conflict
6. Frozen decisions
7. PRDs 06 + 07a + 07b + 08, Plans 06 + 07a + 07b + 08 (post-W0 + post-W2 state)

---

## Cluster 06 findings (11)

### CRITICAL (1)

1. **B-CRIT1 (06) E2E asserts /dashboard?brandId=** — Plan 06:101.
   - W0-3 already canonicalized routing to `/brand/:brandId`. Verify Plan 06 E2E spec line was updated by W0-3. If not, fix:
     ```ts
     await page.goto('/brand/test-brand-id')
     ```

### HIGH (5)

2. **CT-005 Default-active = Design contradiction** — PRD 06:253.
   - W0-7 already changed to AI. Verify with grep:
     ```sh
     grep -n "Default-active" docs/kova-final-prds/06-canvas-editor-core-chrome.md
     ```
   - Should return "Default-active = AI" everywhere.

3. **CT-006 (b) Cmd+K residual in §2.2 out-of-scope** — PRD 06:147.
   - W0-7 fix verifies. Grep `Command-K` in PRD 06 — must return 0.

4. **B-HIGH7 (06) i-lucide strings in ToolDef + dynamic :is** — Plan 06:500-502.
   - Replace with `<KovaIcon name="...">` (Cluster 11 primitive).

5. **HIGH-10 (06) useRightPanelStore name drift** — Plan 06 ↔ Plan 10.
   - W0-3 canonicalized. Verify Plan 06 ships `useRightPanelStore` at `src/stores/right-panel.ts`. Cluster 10 Wave 4 fix will update its imports.

6. **C-MED26 (06) File-menu Version-history item missing** — Plan 06 ↔ Plan 09.
   - Plan 06 owns the file menu UI. Add a "Version history" menu item that emits an event Cluster 09 listens for (or routes to a `<VersionHistoryPanel>` from Cluster 09).
   - Coordinate with Cluster 09 fix agent (Wave 4) — provide the contract; they implement the panel.

### MEDIUM (2)

7. **C-MED17 useEditorStore.showUI 3-state enum** — Plan 06 Task 2.
   - PRD 06 §6.2 + §2.1 row 5 says `showUI: 'all' | 'minimal' | 'hidden'`. Existing handlers assume boolean toggle.
   - Migration step: find every `showUI` toggle handler (grep `editor.showUI` across `src/`). Update to enum-aware:
     ```ts
     // OLD: editor.showUI = !editor.showUI
     // NEW: editor.cycleUI() — action that rotates through enum
     ```
   - Add `cycleUI()` action to `useEditorStore`.

8. **C-MED18 drop-with-invalid-payload crash-resistance** — Plan 06 Task 8.
   - Valibot validation covers schema; missing test for malformed payload (e.g., truncated JSON, non-MIME drop).
   - Add test case that simulates `<DropZone>` receiving `application/x-kova-saved-block` with truncated content → assert no crash, error toast shown.

### LOW (3)

9. **C-LOW06.3 LeftPanel resize handles** — Plan 06 Task 11.
   - Resize handles between sections (Brand Kit ↔ Recents ↔ etc.) not included. Add `<ResizeHandle>` from Plan 11 (if available) or implement inline.

10. **C-LOW06.4 `<MissingFontsPill>` mount test** — Plan 06 Task 9.
    - Component exists; no specific mount test. Add: render `<MissingFontsPill missingCount={2}>` and assert visible text + click handler.

11. **C-LOW06.5 Pill anchor in EditorView refactor template** — Plan 06 Task 14.
    - Anchor location not shown. Document in Task 14: pill anchors top-right of canvas viewport.

---

## Cluster 07a findings (6)

### HIGH (1)

12. **A-HIGH5 PRD 07a status field stale** — PRD 07a §0:6-11.
    - Status says `DRAFT 2026-05-15` but body cites 2026-05-17 founder ratifications.
    - Bump: `Status: IN-REVIEW 2026-05-17` + `Last updated: 2026-05-17`.

### LOW (4)

13. **C-LOW07a.1 measurement events tests** — Plan 07a Task 1b.
    - `measurement:broken` and `measurement:dropped` events mentioned; no explicit test cases.
    - Add: trigger condition for each event + assert event emitted.

14. **C-LOW07a.2 Mask compositing perf benchmark** — Plan 07a Task 9.
    - 50-300 node perf budget mentioned; no benchmark. Add: bench harness that renders 100, 200, 300 nodes and asserts <16ms render time.

15. **C-LOW07a.3 format_version coordination** — Plan 07a + Plan 09.
    - Schema bump coordination missing. Add Task: when `packages/core/codec/` changes, bump `format_version` AND coordinate with Plan 09 snapshot migration.

16. **C-LOW07a.4 node:errored event surface** — Plan 07a.
    - Cluster 11 dep. Add event surface + payload type:
      ```ts
      interface NodeErroredEvent {
        nodeId: string
        errorCode: 'render_failed' | 'invalid_state'
        message: string
      }
      ```
    - Subscribe via `<ToastStack>` (Cluster 11).

### NOTE (1)

17. **B-NOTE2 packages/core/ modifications** — verify documented exception per founder lock #16. No change.

---

## Cluster 07b findings (9)

### CRITICAL (1)

18. **CT-022 find feature ownership** — Plan 07b Tasks 1.6/1.7/7.1 + Plan 08 Tasks 1.3/5.1/5.2.
    - W0-2 already ratified Cluster 07b sole ownership. Verify W0-2 edits landed: Plan 08 dropped its find-store + FindOverlay + Cmd+F binding.
    - Cluster 07b: implement the find feature (canvas-focus mode + DimLayerOverlay + clickthrough).

### HIGH (3)

19. **CT-004 (07b) MEASUREMENT NodeType drift** — PRD 07b 13 lines.
    - W0-7 already propagated. Verify with grep:
      ```sh
      grep -n "createMeasurement\|MEASUREMENT NodeType" docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md
      ```
    - Should return 0. If any remain, rewrite to PageNode `addMeasurement` model.

20. **B-HIGH (07b) Icon convention** — verify all icons use `<KovaIcon>` post-W0-4.

21. **B-LOW (07b) 17 `as any` casts** — refactor away. Use `requireEnv` or explicit type narrowing per Cluster 11 conventions.

### MEDIUM (1)

22. **C-MED-07b.1 7 overlays grouped without per-overlay TDD** — Plan 07b Tasks 4.5-4.10.
    - Split each into its own task with own RED→GREEN→COMMIT cycle:
      - Task 4.5: `<RulerOverlay>`
      - Task 4.6: `<GridOverlay>`
      - Task 4.7: `<GuideOverlay>`
      - Task 4.8: `<SelectionBoxOverlay>`
      - Task 4.9: `<DimLayerOverlay>`
      - Task 4.10: `<FindOverlay>` (canvas-focus mode)
      - (plus the 7th — verify count in current plan)

### LOW (4)

23. **C-LOW07b.2 BooleanOpsRow disabled-state** — Plan 07b Task 3.4.
    - Verify in impl: selection <2 → disabled. Add test.

24. **C-LOW07b.3 4 gradient types** — Plan 07b Task 3.6.
    - Verify Linear/Radial/Angular/Diamond all implemented. Add test per type.

25. **C-LOW07b.4 useClipboardStore paste-handler skip-logic** — Plan 07b Tasks 1.1/1.2.
    - Test case for incompatible-field skip not enumerated. Add: copy `RectangleNode`, paste onto `TextNode` → assert geometry fields skipped.

26. **C-LOW07b.5 Eyedropper Phase 2 macOS Tauri feature-flag** — Plan 07b Tasks 2.1-2.2.
    - Add feature flag `EYEDROPPER_NATIVE_TAURI` gate (default false in MVP, true post-launch when macOS Tauri build ships).

---

## Cluster 08 findings (5)

### HIGH (1)

27. **CT-006 (c) Cmd+K residual in §2.2** — PRD 08:100.
    - W0-7 should have removed `+ Command-K palette` substring. Verify with grep.

### MEDIUM (3)

28. **C-MED20 Phase-table format vs full TDD** — Plan 08 entire.
    - Convert phase-table to full TDD per task. Each phase row becomes 3-5 tasks with their own RED→GREEN→COMMIT.

29. **C-MED21 / C-MED-08.5 use-keyboard.ts refactor compressed** — Plan 08 Task 2.6.
    - 8 sub-steps compressed. Split into per-shortcut-category TDD (5 sub-tasks):
      - 2.6a: dashboard shortcuts
      - 2.6b: canvas shortcuts
      - 2.6c: chat shortcuts
      - 2.6d: global shortcuts (e.g., Cmd+,)
      - 2.6e: modifier handling (`e.code` correctness, Mac Option key)

### LOW (1)

30. **C-LOW08.6 Cluster 12 users.preferences.view.* schema seed** — Plan 08 Task 7.7c.
    - Reference but no file path. Cite: `docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md` Task X + migration ID `YYYYMMDDHHMMSS_users_preferences_view.sql`.

### Note

31. **CT-022 (Cluster 08 side)** — Plan 08 may need to drop find feature entirely per W0-2. Verify W0-2 dropped Tasks 1.3 / 5.1 / 5.2. If not, drop them now.

---

## Output report

```markdown
## Wave 3 Canvas Bundle — Fix Agent Report

**Branch:** fix/qa-w3-canvas-bundle
**Commits:** N (typically 1 per finding; bundled where related)

### Cluster 06 findings closed (11)
- [x] B-CRIT1 (06) routing assertion — commit <hash>
- [x] CT-005 default tab AI verified — commit <hash>
- [x] CT-006 (b) Cmd+K residual verified — commit <hash>
- [x] B-HIGH7 (06) KovaIcon migration — commit <hash>
- [x] HIGH-10 (06) useRightPanelStore canonical — commit <hash>
- [x] C-MED26 (06) Version history file-menu item — commit <hash>
- [x] C-MED17 showUI enum migration — commit <hash>
- [x] C-MED18 drop crash-resistance test — commit <hash>
- [x] C-LOW06.3/4/5 — commits <hashes>

### Cluster 07a findings closed (6)
- [x] A-HIGH5 status bump — commit <hash>
- [x] C-LOW07a.1/2/3/4 — commits <hashes>
- [x] B-NOTE2 verified — no change

### Cluster 07b findings closed (9)
- [x] CT-022 find feature implementation — commit <hash>
- [x] CT-004 (07b) MEASUREMENT propagation verified — commit <hash>
- [x] B-HIGH icon convention verified — commit <hash>
- [x] B-LOW `as any` refactor — commit <hash>
- [x] C-MED-07b.1 7 overlays split into tasks — commit <hash>
- [x] C-LOW07b.2/3/4/5 — commits <hashes>

### Cluster 08 findings closed (5)
- [x] CT-006 (c) Cmd+K residual verified — commit <hash>
- [x] C-MED20 phase-table → full TDD — commit <hash>
- [x] C-MED21 use-keyboard.ts split — commit <hash>
- [x] C-LOW08.6 schema seed cite — commit <hash>
- [x] CT-022 (08 side) find feature dropped — commit <hash>

### Tests added
- Lots. Per-overlay tests, per-shortcut tests, find-feature integration test, etc.

### Cross-cluster verified
- KovaIcon (Cluster 11) in all 4 cluster plans
- useRightPanelStore canonical (W0-3)
- AI default tab (W0-7)
- Cmd+K dropped (W0-7)
- Find feature owned by 07b (W0-2)
- MEASUREMENT page-level (W0-7)

### Quality gates
- [x] All checks pass
- [x] CI gates green
- [x] No `packages/core/` modifications outside Cluster 07a documented exception

### Blockers
None / list.
```

---

## Hard rules

1. **`packages/core/` is READ-ONLY** — Cluster 07a is the ONLY exception, AND only for SLICE (17th NodeType) + page-level Measurement.
2. **No `as any`, no `e.key`, no `Math.random`.**
3. **TDD per finding.** Canvas surface is the highest-visibility surface in the app; tests matter.
4. **Find feature ownership** — Plan 07b implements; Plan 08 DROPS. Verify W0-2 propagation.

---

**End of W3 Canvas Bundle dispatch prompt.**
