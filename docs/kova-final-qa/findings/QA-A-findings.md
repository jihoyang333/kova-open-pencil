# QA-A — PRD Cross-Consistency Findings

**Auditor:** Claude Opus 4.7 — 2026-05-18
**Corpus reviewed:** 13 PRDs (01, 02, 03, 04, 05, 06, 07a, 07b, 08, 09, 10, 11, 12) + 00-PRD_SCOPE_PLAN.md + 00e-EXTERNAL_VERIFICATION_VERDICT.md + 00f-B12_REVERSAL_DISPATCH.md + 00g-CMDK_KILL_DISPATCH.md + CLAUDE.md.
**Lenses run:** 12 (full set per dispatch prompt).
**Method:** Direct Read + Grep cross-file pattern matching. No sub-agents per prompt instruction.

---

## Summary

| Severity | Count |
|---|---|
| CRITICAL | 1 |
| HIGH | 5 |
| MEDIUM | 9 |
| LOW | 6 |
| NOTE (locked) | 3 |

Total findings: **24**

---

## Findings

### CRITICAL-1: `audit_log` table referenced by 5 PRDs but never defined by owning Cluster 11

**Lens:** 1 (Ownership boundaries) + 3 (Schema consistency) + 8 (Cross-cluster dep graph)

**Files:**
- Consumers: `docs/kova-final-prds/01-auth-and-identity.md` lines 352, 544, 956 (Edge Functions write to `audit_log`)
- Consumers: `docs/kova-final-prds/03-brand-management.md` lines 56, 80, 262, 306, 359, 362, 602, 939, 980 (writeAudit stopgap until Cluster 11 ships table)
- Consumers: `docs/kova-final-prds/04-account-and-stripe-billing.md` lines 12, 119, 1404 (depends on `audit_log` table from Cluster 11)
- Consumers: `docs/kova-final-prds/05-brand-kit-and-drag-drop.md` line 899 (INSERT INTO audit_log)
- Owner (gap): `docs/kova-final-prds/11-shared-ui-infrastructure.md` §2.1 lines 75–81 (Backend cross-cuts), §4.1 lines 291–339 (schema migrations), §11 cross-cuts table — **`audit_log` table is not listed, not defined in SQL, not in any in-scope deliverable**

**Issue:** Founder lock #11 (`audit_log` table owned by Cluster 11) is acknowledged across 5 PRDs that consume the table, but PRD 11 itself ships only the `idempotency_keys` table in its migration `20260520_11_shared_ui_infrastructure.sql`. There is no `CREATE TABLE public.audit_log`, no RLS policy, no helper function, no §2.1 scope bullet, no §11 cross-cut acknowledging audit_log as an export. PRD 03 explicitly says: "When Cluster 11 lands, helper internals swap to `INSERT INTO audit_log`" — but Cluster 11 has not added it.

**Evidence:**

PRD 11 §2.1 "Backend cross-cuts" (lines 75–81) lists only:
> - `idempotency_keys` table + RLS policy + cleanup cron
> - `verifyIdempotency()` helper for Edge Functions (`api/_shared/idempotency.ts`)
> - `kova.{userId}.{domain}.{topic}` Realtime channel-naming convention
> - Vue Router `meta.theme` runtime stylesheet swap
> - Sentry SDK install...
> - Resend SDK wrapper...

PRD 11 §4.1 schema migration declares only `CREATE TABLE IF NOT EXISTS public.idempotency_keys ...` (lines 304–337). No audit_log DDL exists in any PRD.

PRD 03 §12.1 (line 980) RESOLVED 2026-05-17: "Cluster 11 owns `audit_log` table + write helper."

PRD 04 §0 line 12 explicitly lists `audit_log table` as a Cluster 11 dependency.

**Severity rationale:** CRITICAL — this is a hard schema dependency that will cause runtime errors in 4 production code paths (account deletion request, brand mutation events, Stripe webhook handling, voice-draft confirm) the moment the stopgap `writeAudit()` helper is swapped to the real `INSERT INTO audit_log`. Without a defined table shape, downstream PRDs cannot:
1. Reason about the column set (event, user_id, ts, payload, etc.)
2. Write tests against expected RLS posture (service-only? owner-read?)
3. Plan for `audit_log.user_id ON DELETE CASCADE` per Cluster 01 GDPR cascade.

PRD 03's `writeAudit()` helper code (line 359–382) imagines a payload shape `{ event, user_id, brand_id, payload, at }` — but no schema confirms this. Different consumers may invent different shapes.

**Recommended fix:** Add to PRD 11 in a single edit:

1. §2.1 In-scope bullet under Backend cross-cuts:
   ```
   - audit_log table + service-role-only RLS + writeAudit() helper
     (consumed by Cluster 01 deletion-request/restore/email-change, Cluster 03 brand CRUD,
      Cluster 04 Stripe webhook, Cluster 05 voice-draft confirm)
   ```

2. §4.1 schema migration — add `CREATE TABLE IF NOT EXISTS public.audit_log` with columns matching PRD 03 §5.5 stopgap shape:
   ```sql
   CREATE TABLE IF NOT EXISTS public.audit_log (
     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     event       text NOT NULL,
     user_id     uuid REFERENCES public.users(id) ON DELETE CASCADE,
     brand_id    uuid REFERENCES public.brands(id) ON DELETE CASCADE,
     payload     jsonb,
     ts          timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX idx_audit_log_user_event ON public.audit_log(user_id, event, ts DESC);
   ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
   CREATE POLICY audit_log_service_only ON public.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
   ```

3. §5.5 Shared helpers — add `writeAudit()` (`api/_shared/audit.ts`) entry alongside `verifyIdempotency()`.

4. §11 cross-cuts table — every consuming PRD row (01, 03, 04, 05) gets an "audit_log table + writeAudit helper" line.

5. §13.8 "What is NOT" — remove any erroneous "owned elsewhere" hint for audit.

---

### HIGH-1: Cmd+K command palette residuals in 3 PRDs after 00g kill decision

**Lens:** 6 (Phase-2 / deferred-item leaks) + 5 (Hi-fi citation rot) + 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/04-account-and-stripe-billing.md` line 1625
- `docs/kova-final-prds/06-canvas-editor-core-chrome.md` line 147
- `docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md` line 100

**Issue:** Founder lock #2 + 00g-CMDK_KILL_DISPATCH.md dropped the Cmd+K command palette entirely from MVP scope and retired the A5 hi-fi. Per 00g, no PRD should list Cmd+K / Command-K palette as a Cluster 11 deliverable. Three PRDs still do.

**Evidence:**

PRD 04 line 1625 (§13.8 "What is NOT in this PRD"):
> Toast / modal / skeleton / **Command-K** / `<EmailShell>` / Sentry SDK / `idempotency_keys` table — Cluster 11

PRD 06 line 147 (§2.2 Out-of-scope table, Cluster 11 row):
> | `<KovaModal>`, `useToast`, `useConfirm`, skeletons, network status pill, error pages, **Command-K palette**; idempotency-key helper; Realtime channel naming convention; Tauri command-surface naming | 11 — Shared UI Infrastructure |

PRD 08 line 100 (§2.2 Out-of-scope table):
> | **Toast system + `<KovaModal>` + skeletons + error pages + offline indicator + Command-K palette** | **11** |

PRD 11 §12.10 (line 1052) DROPPED 2026-05-17 — confirms Cmd+K killed; PRD 02 §12.13 explicitly tracks the scrub. PRDs 04, 06, 08 did not get the same scrub pass.

**Severity rationale:** HIGH — these references will (a) confuse implementers into thinking Cmd+K is still a deliverable somewhere, (b) trigger code-review questions about the missing primitive, (c) misrepresent Cluster 11's actual scope. Each PRD's "out of scope" / "what is not here" lists is the canonical reference downstream agents use when they ask "where does X live?"

**Recommended fix:**
- PRD 04 line 1625: remove `Command-K /` substring.
- PRD 06 line 147: remove `, Command-K palette` substring.
- PRD 08 line 100: change `**Toast system + <KovaModal> + skeletons + error pages + offline indicator + Command-K palette** | 11` → `**Toast system + <KovaModal> + skeletons + error pages + offline indicator** | 11`.
- Each PRD optionally adds a one-line §12 changelog: "2026-05-17 — Cmd+K palette reference scrubbed per 00g kill decision."

---

### HIGH-2: PRD 10 contradicts PRD 06 founder lock — Design vs AI default tab

**Lens:** 1 (Ownership boundaries) + 2 (Naming consistency) + 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/10-ai-chat-and-memory.md` lines 24, 39, 56, 147, 740
- `docs/kova-final-prds/06-canvas-editor-core-chrome.md` §0 line 11, §1.1 line 22, §1.2 line 26, §1.3 line 30, §2.1 line 88, §12.13 line 773

**Issue:** PRD 06 §12.13 RATIFIED 2026-05-17 (founder): "AI default on first canvas open" with full rationale. PRD 06's §1.1 / §1.3 / §2.1 / §6.2 all consistently apply this. PRD 10 (last-updated 2026-05-15, pre-ratification) still says "Design (default-active)" in five places.

**Evidence:**

PRD 06 §12.13 line 773 (RATIFIED 2026-05-17):
> RATIFIED 2026-05-17 (founder): AI default on first canvas open. `useRightPanelStore` initial state: read `localStorage[right-panel-tab:${canvasId}]`; if absent → `activeTab = 'ai'`.

PRD 10 §1.3 line 39:
> (1) The right panel has two tabs: **Design** (default-active) and **AI**.

PRD 10 §2.1 line 56:
> Right-panel second tab "AI" — final tab order is `Design` (default-active) + `AI`.

PRD 10 §3.1 line 147 (visual spec table):
> Two tabs only: Design (default-active) and AI.

PRD 10 §8 line 740 (acceptance criterion):
> Right panel has exactly two tabs visible: Design (default-active) and AI.

PRD 10 §1.2 caveman line 24:
> Chat panel move from floating popup to right-panel second tab (next to Design).

**Severity rationale:** HIGH — this is a direct contradiction of a founder-ratified, locked decision. PRD 10's acceptance criterion (line 740) would force the wrong default and fail the founder's smoke test. Implementers reading PRD 10 first will write the wrong default. The two PRDs would also encode contradictory test expectations.

**Recommended fix:** Apply a coordinated edit to PRD 10:
- §1.3 line 39: change `Design (default-active)` → `AI (default-active on first canvas open per PRD 06 §12.13 founder ratification 2026-05-17)`.
- §2.1 line 56: change `final tab order is Design (default-active) + AI` → `final tab order is Design + AI; default-active = AI on first canvas open per PRD 06 §12.13`.
- §3.1 line 147: change `Two tabs only: Design (default-active) and AI.` → `Two tabs only: Design and AI. Default-active = AI per PRD 06 §12.13 founder ratification 2026-05-17.`
- §8 line 740 acceptance: change `Design (default-active)` → `AI (default-active on first canvas open; subsequent opens read localStorage[right-panel-tab:${canvasId}])`.
- §1.2 caveman line 24: add `default = AI` to the caveman summary.
- §0 last-updated: bump to 2026-05-18 with changelog entry: "Aligned right-panel default tab to PRD 06 §12.13 founder ratification 2026-05-17 (AI default)."

---

### HIGH-3: MEASUREMENT NodeType drift — PRD 07b, PRD 10, scope plan §3 stale on founder lock #14

**Lens:** 1 (Ownership boundaries) + 3 (Schema consistency) + 12 (Status hygiene)

**Files:**
- Updated: `docs/kova-final-prds/07a-canvas-engine-core-renderer.md` §0 source artifacts line 14, §1.3 line 33, §2.1 lines 55–73, §7.1b lines 296–388, §12.10
- Stale: `docs/kova-final-prds/07b-canvas-engine-inspector-overlays.md` lines 70, 87, 100, 187, 237, 375, 424, 492, 496, 591, 613, 683, 708
- Stale: `docs/kova-final-prds/10-ai-chat-and-memory.md` §0 line 14 (cites Q11), line 87 (`addMeasurement` calls `figma.createMeasurement()`), line 109, line 133, line 706
- Stale: `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 07 lines 268, 276

**Issue:** Founder lock #14 (2026-05-17 — per QA-A prompt and per PRD 07a §0 mention): "PRD 07a Measurement = page-level anchored (Figma-exact, NOT a NodeType)." PRD 07a was rewritten to match Figma's `PageNode.addMeasurement/getMeasurements/...` model. PRD 07b, PRD 10, and the scope plan §3 Cluster 07 still describe MEASUREMENT as a NodeType (the 18th).

**Evidence:**

PRD 07a §1.3 line 33:
> Measurements are **not** a NodeType — per Figma's data model... measurements live on the CANVAS (page-level) as a separate collection of `Measurement` records anchored to SceneNodes by side. Q11's "MEASUREMENT = 18th NodeType" is superseded by this PRD's Match-Figma-exactly decision (§12.10); the founder ratified the Figma-aligned model on 2026-05-17.

PRD 07b line 100 (Out of scope — calls them NodeTypes):
> | All `packages/core/` modifications (NodeType additions: SLICE, MEASUREMENT; renderer mask compositing; ...) | **07a** Canvas Engine Core + Renderer |

PRD 07b line 187 (Visual spec):
> Persists across save/reload via 07a's **MEASUREMENT NodeType**.

PRD 07b line 87 (composable):
> `use-measurement-tool.ts` — measurement-tool mode handler. Listens to canvas hover/click, creates **MEASUREMENT NodeType** (07a) with two anchor points.

PRD 10 line 87:
> **NEW:** `addMeasurement(args: { fromNodeId: string, toNodeId: string })` — thin AI-tool wrapper that calls Cluster 07a's `figma.createMeasurement()` engine API

PRD 10 line 14 cites `Q11 (Measurement NodeType)`.

PRD 10 line 706:
> Cluster 07a owns SLICE + **MEASUREMENT NodeType** additions per Q1 + Q11.

Scope plan §3 Cluster 07 line 268:
> Q11: Measurement = first-class 18th NodeType in `scene-graph.ts`. Path 1 (lift core lock).

Scope plan §3 Cluster 07 line 276:
> **Core mods** (lift lock): SLICE NodeType, **MEASUREMENT NodeType**, aspectRatio prop, page-export flag, ...

**Severity rationale:** HIGH — three peer documents (07b, 10, scope plan) carry a contradictory data model from the sibling that owns the actual implementation (07a). PRD 07b's composables (`use-measurement-tool`) would call `figma.createMeasurement()` which PRD 07a explicitly states is NOT a factory (per §7.1b: "measurements are stored separately... no `figma.createMeasurement()` factory"). The actual API per 07a is `figma.currentPage.addMeasurement(start, end, options)` — a PageNode method, not a node factory. PRD 10's AI-tool wrapper signature in §6.3 will fail at runtime. PRD 07b's `<MeasurementAnnotations>` overlay iterates `MEASUREMENT NodeType` — but no such NodeType exists in 07a's scene-graph extension.

**Recommended fix:** Coordinated 3-document update:

- **PRD 07b** every MEASUREMENT NodeType reference → "MEASUREMENT records on the CANVAS" (page-level collection). Change `use-measurement-tool.ts` signature: instead of `figma.createMeasurement({ start, end })`, use `figma.currentPage.addMeasurement({ nodeId: srcId, side: srcSide }, { nodeId: dstId, side: dstSide })`. Update `<MeasurementAnnotations>` overlay iterator from "iterates MEASUREMENT NodeType" to "iterates `figma.currentPage.getMeasurements()`". Update lines 70, 87, 100, 187, 237, 375, 424, 492, 496, 591, 613, 683, 708.
- **PRD 10** §0 line 14: re-cite Q11 with "(superseded 2026-05-17 — measurements page-level not NodeType per 07a §7.1b)". §6.3 `addMeasurement` tool wrapper: rewrite payload from `{ fromNodeId, toNodeId }` → `{ canvas_id, start_node_id, start_side, end_node_id, end_side, offset_type?, offset_value?, free_text? }` per PRD 07a §2.1 (matches the engine API). Update lines 87, 109, 133, 706.
- **Scope plan §3 Cluster 07** lines 268 + 276: add `(SUPERSEDED 2026-05-17 — see PRD 07a §12.10: measurements page-level not NodeType)` to Q11 reference. Remove MEASUREMENT from "Core mods" bullet.

---

### HIGH-4: PRD 06 internal inconsistency — Default-active tab said both "AI" and "Design"

**Lens:** 2 (Naming consistency) + 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/06-canvas-editor-core-chrome.md` line 253 (says "Default-active = Design") contradicts §0 line 11, §1.1 line 22, §1.3 line 30, §2.1 line 88, §6.2 line 363, §6.4 line 428, §8.6 line 577, §12.13 line 773 (all say AI default)

**Issue:** PRD 06 was updated 2026-05-17 to ratify AI as the default tab. The update was applied in nine places but missed line 253 in §3.5 (right panel visual spec table). One residual line still asserts the old default.

**Evidence:**

PRD 06 §3.5 line 253:
> | Tab strip (Design + AI) | Final.html | lines 337–359 (CSS), 811–820 (instance shows "Design" tab only in hi-fi; AI tab is the founder amendment 2026-05-15) | TWO tabs only. **Default-active = Design.** Click AI tab → switches via `useRightPanelStore.setActiveTab('ai')` |

This contradicts:
- PRD 06 §0 line 11: "founder ratifications: ... §12.13 AI default tab"
- PRD 06 §2.1 line 88: "default-active = AI on first canvas open per founder ratification 2026-05-17"
- PRD 06 §6.2 line 363: "Default on first canvas open = `'ai'`"
- PRD 06 §6.4 line 428: "default-active = **AI** per `useRightPanelStore`"
- PRD 06 §8.6 line 577: acceptance criterion says AI default
- PRD 06 §12.13 line 773: RATIFIED AI default

**Severity rationale:** HIGH — single residual line of stale text in the visual-spec table that engineers cite when building. Implementers grepping for "Default-active" find conflicting answers within the same PRD. Trivial fix but high-impact because the visual-spec section is the byte-for-byte reference for hi-fi compliance.

**Recommended fix:** PRD 06 line 253 — change `Default-active = Design.` → `Default-active = **AI** on first canvas open per §12.13 founder ratification 2026-05-17.`

---

### HIGH-5: PRD 07a status field stale — body cites 2026-05-17 ratification, header says 2026-05-15

**Lens:** 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/07a-canvas-engine-core-renderer.md` §0 (Status DRAFT 2026-05-15, Last updated 2026-05-15) vs body §1.3, §7.1b, §12.10 (all reference founder ratification 2026-05-17)

**Issue:** PRD 07a underwent significant founder-locked rewrites on 2026-05-17 (the measurement-not-a-NodeType change is the single largest divergence from audit/Q-decisions in the entire PRD set, per the PRD's own §12.10 admission). The status table at the top still shows 2026-05-15 status and last-updated dates. This contradicts the changelog evidence in the body and makes it hard for a reviewer to know which version they're reading.

**Evidence:**

PRD 07a §0 lines 6–11:
> | **Status** | `DRAFT` 2026-05-15 |
> | **Last updated** | 2026-05-15 |

PRD 07a §1.3 line 33:
> "the founder ratified the Figma-aligned model on 2026-05-17 during PRD revision."

PRD 07a §7.1 line 282:
> "ratified by founder on 2026-05-17 during PRD revision."

PRD 07a §12.10 (page-level model decision) — extensively dated 2026-05-17.

**Severity rationale:** HIGH — PRD 07a is the engine-changing PRD that lifts the `packages/core/` lock. Status field staleness on this PRD specifically risks engineers reviewing/implementing the old draft. By comparison, PRD 03 was updated 2026-05-17 and bumped its status to `IN-REVIEW` + last-updated 2026-05-17. PRD 07a should do the same.

**Recommended fix:** PRD 07a §0 lines 6–11 — update Status to `IN-REVIEW 2026-05-17` and Last updated to `2026-05-17`. Append §0 changelog row noting the 2026-05-17 founder lock on measurement page-level model.

---

### MEDIUM-1: PRD 02 has 2 unresolved OPEN QUESTIONS marked "ESCALATE: founder"

**Lens:** 7 (§12 closure)

**Files:**
- `docs/kova-final-prds/02-onboarding-and-dashboard.md` §12.10 line 956 (consolidation of existing onboarding components — ESCALATE: founder), §12.12 line 968 (`/account` sidebar entry — ESCALATE: founder)

**Issue:** Per Lens 7 closure rule: every §12 entry must be RESOLVED / DROPPED / DEFERRED before build. PRD 02 has two `ESCALATE: founder` items that are not yet closed. Both are tagged "Recommendation: …" but neither has founder ratification per the 2026-05-17 close.

**Evidence:**

PRD 02 §12.10 line 956:
> §12.10 OPEN QUESTION — Existing onboarding components (WelcomeStep, BrandNameStep, BrandUrlStep, NameStep) consolidation. §6.4.2 recommends consolidating ... **ESCALATE: founder** — confirm consolidation OK (impacts existing tests + onboarding analytics).

PRD 02 §12.12 line 968:
> §12.12 OPEN QUESTION — `/account` sidebar entry. ... **ESCALATE: founder** — confirm acceptable that "Account" lives only in dropdown.

**Severity rationale:** MEDIUM — both are reversible UX decisions with strong recommendations attached; neither blocks Wave 2 implementation. But Lens 7 explicitly flags unclosed §12 entries before build. Without founder ratification, engineers may implement the recommendation and find it has to be reverted post-review.

**Recommended fix:** Founder ratifies both (or rejects with alternative). Status changes from "OPEN QUESTION" to "RESOLVED 2026-05-18 — {decision}".

---

### MEDIUM-2: PRD 01 has 2 unresolved OPEN QUESTIONS

**Lens:** 7 (§12 closure)

**Files:**
- `docs/kova-final-prds/01-auth-and-identity.md` §12.8 line 1130 (email-change "Revert" button mechanics), §12.10 line 1138 (account-pending-deletion view contents — "compose at implementation time")

**Issue:** PRD 01 status is `APPROVED 2026-05-15` (line 7), but two §12 entries remain open. §12.8 carries a partial implementation directive ("§8.3 ships that") but flags founder confirmation as needed. §12.10 says "compose at implementation time; if visual ambiguity surfaces, draft a quick hi-fi mid-stream" — informal closure but no RESOLVED tag.

**Evidence:**

PRD 01 §12.8 line 1130:
> 12.8 OPEN QUESTION — Email-change "Revert" button mechanics. ... If founder wants a different model (one-click revert), flag.

PRD 01 §12.10 line 1138:
> 12.10 OPEN QUESTION — Account-pending-deletion view contents. No dedicated hi-fi exists. ... Recommendation: compose at implementation time...

**Severity rationale:** MEDIUM — PRD 01 is APPROVED but two of its §12 entries lack RESOLVED tags. The fix is small (founder confirms / drafts a hi-fi); leaving them open creates ambiguity in scope.

**Recommended fix:** Re-tag both as `RESOLVED YYYY-MM-DD — {decision}` or `DEFERRED Phase 2`.

---

### MEDIUM-3: PRD 11 has 2 unresolved OPEN QUESTIONS

**Lens:** 7 (§12 closure)

**Files:**
- `docs/kova-final-prds/11-shared-ui-infrastructure.md` §12.8 (shimmer direction LTR vs locale-aware), §12.9 (toast positioning per device class)

**Issue:** PRD 11 status `IN-REVIEW 2026-05-17` but two §12 entries are OPEN QUESTIONS with recommendations attached but no formal RESOLVED tag.

**Evidence:**

PRD 11 §12.8:
> 12.8 OPEN QUESTION — `<KovaSkeleton>` shimmer animation direction (LTR vs locale-aware). Recommendation: ship LTR-only at MVP.

PRD 11 §12.9:
> 12.9 OPEN QUESTION — Toast positioning per device class. Recommendation: ship bottom-right at MVP.

**Severity rationale:** MEDIUM — both are low-risk recommendations the founder may simply ratify. Per Lens 7 they must be closed before build.

**Recommended fix:** Re-tag as `RESOLVED 2026-05-18 — recommended approach (LTR-only / bottom-right MVP)`. Phase-2 hooks already noted.

---

### MEDIUM-4: Scope plan §3 Cluster 06 says "Prototype DEFERRED" — superseded by founder lock to "out of scope entirely"

**Lens:** 6 (Phase-2 leaks) + 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 06 (line 242 mentions "Design only at MVP — Prototype DEFERRED")
- `docs/kova-final-prds/06-canvas-editor-core-chrome.md` §1.1, §2.1, §6.2 all say "Prototype out of scope entirely"
- `docs/kova-final-prds/10-ai-chat-and-memory.md` §1.3 line 39, §2.1 line 56 (both say superseded)

**Issue:** Scope plan §3 Cluster 06 line 242 (paraphrased: "Design only at MVP — Prototype DEFERRED") was superseded by founder ratification 2026-05-15 — Prototype tab is dropped entirely (not deferred — never building). PRDs 06 and 10 both note the supersession. Scope plan §3 itself was not updated to reflect this.

**Evidence:**

Scope plan §3 line 242 (Cluster 06 scope):
> Right panel / Inspector: tab routing (Design only at MVP — Prototype DEFERRED), properties section component (when no selection — §3C #13), per-section panels...

PRD 06 §2.1 line 88 explicitly notes: "Prototype tab NOT rendered (per founder ratification 2026-05-15, scope plan §3 Cluster 06 'Prototype DEFERRED' line is superseded by 'Prototype out of scope entirely')"

PRD 10 §1.3 line 39: "the scope plan §3 Cluster 06 line 'Prototype DEFERRED' is now superseded by 'Prototype out of scope entirely'"

**Severity rationale:** MEDIUM — supersession is documented inline twice in downstream PRDs but the master scope plan is the canonical authoring document. Leaving the stale "DEFERRED" line creates ambiguity for engineers who reference the master plan first.

**Recommended fix:** Scope plan §3 Cluster 06 — change "Prototype DEFERRED" to "Prototype OUT OF SCOPE entirely (founder lock 2026-05-15 — not building; Kova exports static images, not interactive prototypes)".

---

### MEDIUM-5: Scope plan §3 Cluster 07 cites Q11 MEASUREMENT NodeType — superseded by founder lock #14

**Lens:** 6 (Phase-2 leaks) + 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §3 Cluster 07 lines 268, 276

**Issue:** Scope plan §3 Cluster 07 still cites Q11 as "Measurement = first-class 18th NodeType in `scene-graph.ts`. Path 1 (lift core lock)" and lists `MEASUREMENT NodeType` under "Core mods" — both superseded by founder lock #14 (2026-05-17 per PRD 07a §12.10).

**Evidence:**

Scope plan §3 line 268:
> Q11: Measurement = first-class 18th NodeType in `scene-graph.ts`. Path 1 (lift core lock).

Scope plan §3 line 276:
> **Core mods** (lift lock): SLICE NodeType, MEASUREMENT NodeType, aspectRatio prop, page-export flag, ...

PRD 07a §1.3 line 33: "Q11's 'MEASUREMENT = 18th NodeType' is superseded by this PRD's Match-Figma-exactly decision (§12.10)."

**Severity rationale:** MEDIUM — overlaps with HIGH-3. Scope plan owns the master cluster-summary; stale Q-cite misleads downstream readers + new engineers cross-referencing the founder lock list.

**Recommended fix:** Add inline supersession marker on both lines: `(SUPERSEDED 2026-05-17 per founder lock #14 — measurements are page-level on CANVAS via PageNode-equivalent methods, not a NodeType; SLICE remains the only NodeType this PRD adds. See PRD 07a §7.1b + §12.10.)`

---

### MEDIUM-6: PRD 09 status `DRAFT` despite no remaining §12 open questions

**Lens:** 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/09-version-history-and-trash.md` §0 line 7

**Issue:** PRD 09 status is `DRAFT` per §0. Other Wave-6 / closing-wave PRDs (e.g., 10, 12) are also `DRAFT`. But PRD 09's §12 entries appear to be founder-ratified per the body (e.g., compare-viewer dropped per Figma, retention model Q-decision). Status field hasn't been bumped.

**Evidence:**

PRD 09 §0:
> | **Status** | `DRAFT` |
> | **Last updated** | 2026-05-15 |

But §12 references appear resolved (e.g., "Figma does not ship a diff viewer (verified `help.figma.com/hc/en-us/articles/360038006754`); no row-vs-row visual comparison in MVP.").

**Severity rationale:** MEDIUM — purely status-hygiene; doesn't block implementation, but inconsistent with PRD 03 / 06 / 08 which were bumped to IN-REVIEW after applying 2026-05-17 founder ratifications. Reviewers reading the status field would underestimate PRD 09's readiness.

**Recommended fix:** Audit PRD 09 §12 for any remaining open items; if all resolved, bump status to `IN-REVIEW 2026-05-18`.

---

### MEDIUM-7: PRD 10 references `Q11 (Measurement NodeType)` and Measurement NodeType in 5 places — needs alignment with founder lock #14

**Lens:** 1 (Ownership boundaries) + 3 (Schema consistency)

**Files:**
- `docs/kova-final-prds/10-ai-chat-and-memory.md` lines 14, 87, 109, 133, 706

**Issue:** Same root cause as HIGH-3 but specifically for PRD 10's AI-tool wrapper. The `addMeasurement` tool wrapper signature `{ fromNodeId, toNodeId }` doesn't match PRD 07a's actual API which requires `{ start: { nodeId, side }, end: { nodeId, side }, options? }`. AI tool call will throw at runtime.

**Evidence:**

PRD 10 §2.1 line 87:
> **NEW:** `addMeasurement(args: { fromNodeId: string, toNodeId: string })` — thin AI-tool wrapper that calls Cluster 07a's `figma.createMeasurement()` engine API

PRD 07a §2.1 line 80–81:
> `createMeasurement` is **not** a NodeType-creation tool (measurements are not NodeTypes per the Figma-aligned model). Instead, add `addMeasurement` ToolDef in `tools/measurement.ts` (NEW file) — params: `canvas_id`, `start_node_id`, `start_side` (`'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT'`), `end_node_id`, `end_side`, optional `offset_type` ('INNER' | 'OUTER'), optional `offset_value`, optional `free_text` (empty by default).

**Severity rationale:** MEDIUM — engineering will catch this when implementing PRD 10 because PRD 07a's tool signature is authoritative (it's the producer). But the documentation drift forces a rewrite of PRD 10's §6.3 AI-tool wrapper definition before implementation. Lower-severity than HIGH-3 because it'll be caught at compile time, but documentation drift on a cross-cluster AI tool is still consequential.

**Recommended fix:** PRD 10 §6.3 AI-tool wrapper — rewrite `addMeasurement` shape to match 07a §2.1 exactly. PRD 10 §0 source artifacts — re-cite Q11 with supersession marker.

---

### MEDIUM-8: M9 surface migration list not in scope plan but referenced by 4 PRDs

**Lens:** 1 (Ownership boundaries) + 11 (Hard constraint violations)

**Files:**
- `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §5.5 lists M9 surfaces + cluster impact (4 rows)
- `docs/kova-final-prds/02-onboarding-and-dashboard.md` (M9 `StoreTypeStep` refactor)
- `docs/kova-final-prds/04-account-and-stripe-billing.md` §6.4.5 (M9 `IntegrationsCard.vue` + `SettingsBrandIntegrationsView.vue` refactor)
- `docs/kova-final-prds/06-canvas-editor-core-chrome.md` (Shop panel REWORK)
- `docs/kova-final-prds/10-ai-chat-and-memory.md` §5.5 (5 Shopify AI tools refactor)

**Issue:** Scope plan §5.5 lists 4 PRDs requiring M9 reuse/refactor/re-spec (02, 04, 05, 06, 10 — that's actually 5). The PRDs themselves enumerate file-level refactors in their §6 sections. But: there is no consolidated tracking list of "M9 surfaces being touched by Wave-X" anywhere outside the scope plan, and the M9 access_token launch-blocker security fix per `00e §6 #2(a)` requires coordination between PRD 02 (where the fix lives) and Cluster 04 PRD 04 (Integrations). Search PRD 04 for `access_token`-in-URL fix: the issue is acknowledged in PRD 04's M9-reuse table (line 6.4.5) but no explicit acceptance criterion.

**Evidence:** No `access_token` query-string security check in PRD 04's acceptance criteria — only PRD 02 has the §9.5 grep check. PRD 04's §6.4.5 says "refactor IntegrationsCard.vue" but doesn't enumerate the access_token URL fix.

**Severity rationale:** MEDIUM — security launch-blocker per `00e §6 #2(a)`. If PRD 04's IntegrationsCard refactor doesn't carry the same `access_token` fix (or doesn't verify it), a launch-blocking regression could land. PRD 02 has the fix; PRD 04 should reference and re-verify, not silently rely.

**Recommended fix:** PRD 04 — add an acceptance criterion (mirrors PRD 02 §8.9): "No `access_token` literal in URL during refactored `/account/integrations` Shopify connect flow (verified via grep + DevTools)." Add §9.5 grep guard. Cross-link to PRD 02 §5.4.1 fix.

---

### MEDIUM-9: PRD 04 §3.3 status pill values — DB CHECK constraint includes 'trialing' but UI status enum doesn't

**Lens:** 3 (Schema consistency)

**Files:**
- `docs/kova-final-prds/04-account-and-stripe-billing.md` §4.1 migration (line 267 CHECK includes 'trialing') vs §6.2.1 `useBillingStore` (line 851 union type `'active' | 'past_due' | 'cancelled' | 'incomplete'` — missing 'trialing')

**Issue:** PRD 04 §4.1 migration line 267 defines:
```sql
plan_status text NOT NULL DEFAULT 'active'
  CHECK (plan_status IN ('active', 'past_due', 'cancelled', 'incomplete', 'trialing')),
```

PRD 04 §6.2.1 `useBillingStore` line 851 type:
```typescript
const planStatus = ref<'active' | 'past_due' | 'cancelled' | 'incomplete'>('active')
```

Type union missing `'trialing'`. §3.3 line 181 visual spec says "Trial variant ships hidden, conditional on `plan_status === 'trialing'`" — implies the runtime value occurs, but the store type rejects it.

**Severity rationale:** MEDIUM — TypeScript will fail compilation when `plan_status === 'trialing'` is set from Stripe webhook handler. Easy fix but it's a real type/schema mismatch.

**Recommended fix:** PRD 04 §6.2.1 line 851 — extend the type union to `'active' | 'past_due' | 'cancelled' | 'incomplete' | 'trialing'`. Same change anywhere else in 04 / 06 / 11 that locally types the plan_status field (e.g., `<PlanCard>` props in §6.4.2 line 1038 already includes 'trialing' — good).

---

### LOW-1: Scope plan §2.1 lists `07-canvas-engine-extensions.md` — actual filenames are `07a-` and `07b-`

**Lens:** 2 (Naming consistency) + 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` §2.1 line 40

**Issue:** Scope plan §2.1 (line 40) shows the planned PRD file list including `07-canvas-engine-extensions.md`. The actual on-disk files are `07a-canvas-engine-core-renderer.md` + `07b-canvas-engine-inspector-overlays.md` (the split decision committed in §5.6 item 10).

**Evidence:** `ls docs/kova-final-prds/` confirms `07a-…` and `07b-…` only; no `07-canvas-engine-extensions.md` file exists.

**Severity rationale:** LOW — documentation hygiene. The §3 Cluster 07 description (line 282) does note "**SPLIT COMMITTED** … author as `07a` (Core mods + Renderer) + `07b` (Inspector wiring + Overlays)", so the post-split state is partially documented. But §2.1's file inventory is stale.

**Recommended fix:** Scope plan §2.1 — replace `07-canvas-engine-extensions.md` with two lines: `07a-canvas-engine-core-renderer.md` + `07b-canvas-engine-inspector-overlays.md`.

---

### LOW-2: PRD 01 cron pseudocode includes `failed_terminal AND attempts < 5` predicate that's logically unreachable

**Lens:** 9 (Acceptance criteria — testability)

**Files:**
- `docs/kova-final-prds/01-auth-and-identity.md` §5.1.4 line 426

**Issue:** PRD 01 §5.1.4 cron algorithm pseudocode:
> For each (user_id, step) row in gdpr_deletion_queue with status IN ('pending', 'in_progress', 'failed_terminal' AND attempts < 5):

But the same algorithm sets `status='failed_terminal' IF attempts >= 5 ELSE 'pending'`. So `failed_terminal AND attempts < 5` is by construction impossible — `failed_terminal` is only ever set when attempts >= 5.

**Evidence:** PRD 01 §5.1.4 line 435–436:
> On retriable error (network, 5xx): UPDATE row SET status='failed_terminal' IF attempts >= 5 ELSE 'pending'

**Severity rationale:** LOW — pseudocode noise; engineer reading carefully will identify and drop the dead branch. Doesn't cause incorrect behavior (the dead branch never fires).

**Recommended fix:** PRD 01 §5.1.4 line 426 — change predicate to `status IN ('pending', 'in_progress')`. Drop the `failed_terminal AND attempts < 5` clause.

---

### LOW-3: PRD 11 §5.7 Tauri commands convention example contradicts stated rule

**Lens:** 2 (Naming consistency)

**Files:**
- `docs/kova-final-prds/11-shared-ui-infrastructure.md` §5.7 lines 574–578

**Issue:** PRD 11 §5.7 states: "Format: `kova.{verb}.{noun}` or `kova.{noun}.{verb}` (verb-first preferred)." Examples follow:
> - `kova.file.open`, `kova.file.save`, `kova.file.export`
> - `kova.edit.undo`, `kova.edit.redo`, `kova.edit.copy`, `kova.edit.paste`

All examples are noun-first (file/edit are nouns, open/save/undo are verbs). The "verb-first preferred" rule contradicts every shipped example. This locks the rule against itself.

**Evidence:**

PRD 11 §5.7 line 572 ("verb-first preferred") vs examples on lines 575–577 (all noun-first).

**Severity rationale:** LOW — Cluster 06 enforces this in Tauri menu binding (per PRD 11 §5.7 acknowledgment). If 06 follows the examples, the CI grep rule (per PRD 11 §9.5 line 911 `register(.\*,.\*[^.]*'[^k]`) would not catch verb-first/noun-first ordering — only the `kova.` prefix is enforced. But the contradiction between stated rule and examples will confuse engineers.

**Recommended fix:** PRD 11 §5.7 — pick one rule consistently. Recommend: drop the "verb-first preferred" hint and lock to `kova.{noun}.{verb}` matching all current examples + Figma/Vue tradition. Or update examples to verb-first.

---

### LOW-4: PRD 04 sidebar item count claim — `6 items` correct but inconsistent narrative in §1.1 vs §2.1

**Lens:** 2 (Naming consistency)

**Files:**
- `docs/kova-final-prds/04-account-and-stripe-billing.md` §1.1 (says "five sidebar sections"), §2.1 line 40 (says "6-section sidebar"), §3.1 line 156 (says "**6 items**"), §8.1 line 1131 (says "exactly **6 items**")

**Issue:** PRD 04 §1.1 plain-language summary describes "**five** sidebar sections (Profile, Plan & Billing, Brand Kit, Integrations, Danger zone)". The Brands section was added 2026-05-17 per B12 reversal, bumping count to 6. §2.1 and §3.1 and §8.1 all show 6. §1.1 was not updated to match.

**Evidence:**

PRD 04 §1.1 line 22:
> ...a full-page `/account` route with 5 sidebar sections (Profile, Plan & Billing, Brand Kit, Integrations, Danger zone).

PRD 04 §2.1 line 40:
> 6-section sidebar (Profile, **Brands**, Plan & billing, Brand Kit, Integrations, Danger zone) — Brands added 2026-05-17 per B12 archive reversal

**Severity rationale:** LOW — §1.1 is a narrative summary; the operational text at §2.1, §3.1, §8.1 all carry the corrected count. But the plain-language section is the first thing a non-technical reviewer reads. Inconsistency.

**Recommended fix:** PRD 04 §1.1 line 22 — update sentence to "...with 6 sidebar sections (Profile, Brands, Plan & Billing, Brand Kit, Integrations, Danger zone — Brands added 2026-05-17 per B12 reversal)."

Also: PRD 04 §1.2 caveman summary line 24:
> Five sidebar tabs: Profile, Plan & billing, Brand Kit (per-brand), Integrations (per-brand), Danger zone.

Same fix: change to "Six sidebar tabs: Profile, Brands, Plan & billing, Brand Kit (per-brand), Integrations (per-brand), Danger zone." Brands ratified MVP per B12 reversal.

---

### LOW-5: PRD 02 sidebar SOON pill list is inconsistent with PRD 02's coming-soon route map

**Lens:** 2 (Naming consistency) + 6 (Phase-2 leaks)

**Files:**
- `docs/kova-final-prds/02-onboarding-and-dashboard.md` §2.1 line 50 (SOON pill on "Calendar, Swipes, Templates"), §6.1 lines 427–436 (children routes also include `products`, `personalization`, `knowledge-base`, `memories` rendered via ComingSoonView)

**Issue:** PRD 02 §2.1 line 50 says SOON pill applies to "Calendar, Swipes, Templates" (3 items). §6.1 declares 7 child routes that render `ComingSoonView` (`calendar`, `swipes`, `templates`, `products`, `personalization`, `knowledge-base`, `memories`). The other 4 (products, personalization, kb, memories) render coming-soon UI but the sidebar SOON pill spec doesn't mention them.

**Evidence:**

PRD 02 §2.1 line 50:
> Sidebar nav sections (Home, Library, Brand) with "SOON" pill on Phase-2 destinations (Calendar, Swipes, Templates)

PRD 02 §6.1 lines 433–436:
> { path: 'products', name: 'brand-products', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'products' } },
> { path: 'personalization', name: 'brand-personalization', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'personalization' } },
> { path: 'knowledge-base', name: 'brand-kb', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'knowledge-base' } },
> { path: 'memories', name: 'brand-memories', component: () => import('@/views/dashboard/ComingSoonView.vue'), props: { kind: 'memories' } },

**Severity rationale:** LOW — products/personalization/KB/memories are mid-flux items (Cluster 05 + 10 may pick them up). PRD 02 §12.11 Part A confirms Brand Kit / Knowledge base / Memories items show SOON pills. But "products" + "personalization" aren't explicitly declared in any SOON-pill list and don't have founder ratification. Inconsistency between routing scaffold and nav pill rules.

**Recommended fix:** PRD 02 §2.1 line 50 — clarify SOON-pill items. Confirm with founder whether Products/Personalization sidebar items render SOON pills or are hidden entirely until Cluster 10 ships.

---

### LOW-6: PRD 10 §0 cites M5 implementation but does not cite founder-locked decision dates 2026-05-17

**Lens:** 12 (Status hygiene)

**Files:**
- `docs/kova-final-prds/10-ai-chat-and-memory.md` §0 lines 8, 11

**Issue:** PRD 10 §0 status `DRAFT 2026-05-15`, last-updated `2026-05-15`. Body §12.12 enumerates a long list of 2026-05-17 founder locks (lines 760+ — items 1–10 covering tab strip overflow, chip cap 20, chip body click no-op, etc.). Despite these ratifications, the §0 header date is not bumped. Same pattern as MEDIUM-7 but specifically for status-field staleness.

**Evidence:**

PRD 10 §0 lines 8–11:
> | **Status** | `DRAFT` 2026-05-15 (author: Claude Opus 4.7) |
> | **Last updated** | 2026-05-15 |

PRD 10 §12.12 (line 757 onwards) — extensive founder-lock items dated 2026-05-17.

**Severity rationale:** LOW — status hygiene; doesn't block but creates inconsistency with PRD 06's freshly-bumped status.

**Recommended fix:** PRD 10 §0 — bump Status to `IN-REVIEW 2026-05-17` and Last updated to `2026-05-17`. Same time, apply the fixes from HIGH-2 (default tab) and HIGH-3 / MEDIUM-7 (measurement model).

---

### NOTE (locked)-1: PRD 11 §3.7 retired sidebar offline `.net-strip` — but PRD 02 §3.7 still specs it

**Lens:** 1 (Ownership boundaries) + 6 (Phase-2 leaks)

**Files:**
- `docs/kova-final-prds/11-shared-ui-infrastructure.md` §3.7 line 241 ("Sidebar footer offline indicator (A13 hi-fi `.net-strip`): RETIRED from MVP")
- `docs/kova-final-prds/02-onboarding-and-dashboard.md` §2.1 line 82 (sidebar footer `.net-strip`), §3.7 line 202 (sidebar footer `.net-strip`), §8.7 line 745 (acceptance criterion still includes 3 offline signals incl. sidebar footer + topbar pill + per-pane banner)

**Issue:** PRD 11 §3.7 (2026-05-17 founder decision per `feedback_app_dark_website_light`-aligned Figma model) retired the sidebar footer offline indicator + topbar pill + per-pane banner — replaced with single Figma-style cloud-off icon + tooltip on topbar. PRD 02 §2.1, §3.7, and §8.7 still spec the three offline signals (sidebar footer net-strip, topbar warn pill, per-pane offline-banner).

**Evidence:**

PRD 11 §3.7 line 241:
> Sidebar footer offline indicator (A13 hi-fi `.net-strip`): RETIRED from MVP. Single topbar icon is the canonical surface.

PRD 02 §2.1 line 82:
> Offline (A13.2): sidebar footer `.net-strip` "Working offline" pill, topbar `.pill.warn.dot` "Offline", per-pane warn banner ...

PRD 02 §8.7 line 745:
> Three reinforcing signals: sidebar footer `.net-strip` ... topbar pill swaps to `.pill.warn.dot` "Offline"; per-pane `.offline-banner` ...

**Severity rationale:** Tagged as NOTE (locked) because the design decision per PRD 11 is founder-locked (matches `feedback_app_dark_website_light` Figma model — single topbar icon + tooltip). PRD 02 was not updated to follow. This is a cross-PRD inconsistency caused by a Cluster 11 design lock not propagating to a consumer. Surfacing as NOTE because the lock is owner-side; PRD 02 needs to consume the new pattern.

**Recommended fix:** PRD 02 §2.1 line 82 + §3.7 line 202 + §8.7 line 745 — rewrite all offline-indicator specs to consume Cluster 11's `<NetworkStatusIndicator>` (Figma-style single icon + tooltip). Remove sidebar footer net-strip + per-pane banner specs. PRD 02 §12 changelog entry: "Aligned offline UX to Cluster 11 §3.7 founder decision 2026-05-17 (Figma-style minimal icon + tooltip, no banner)."

---

### NOTE (locked)-2: PRD 02 §6.1 declares `/brands` route while PRD 03 §6.1 declares same route — cross-cluster placeholder model

**Lens:** 1 (Ownership boundaries) + 4 (Route table integrity)

**Files:**
- `docs/kova-final-prds/02-onboarding-and-dashboard.md` §6.1 lines 442–447 (declares `/brands` with placeholder `<BrandPickerView>`)
- `docs/kova-final-prds/03-brand-management.md` §6.1 line 622 (declares `/brands` with real `<BrandPickerView>` owned by PRD 03)

**Issue:** Two PRDs declare the same Vue Router path `/brands`. PRD 02 (Wave 2 — ships first) reserves the route with a placeholder component; PRD 03 (Wave 2 — ships immediately after) ships the real component. The PRDs explicitly acknowledge the cross-cut, but if both PRD migrations land independently the router config could double-register.

**Evidence:**

PRD 02 §6.1 lines 444–447:
> {
>   path: '/brands',
>   name: 'brands-picker',
>   component: () => import('@/views/BrandPickerView.vue'),   // ships in Cluster 03; placeholder in Cluster 02
>   meta: { theme: 'dark', requiresAuth: true, viewportGuard: 'desktop' },
> }

PRD 03 §6.1 line 622–624:
> | /brands | <BrandPickerView> | requiresAuth + redirect to /onboarding if user has zero brands ... | dark | Multi-brand landing. Lazy-loaded chunk. |

**Severity rationale:** Tagged as NOTE because the PRDs document the cross-cut (PRD 02 "reserves the route" until Cluster 03 ships). It's a coordinated handoff, not a duplicate registration in practice — only one PR lands the route entry. But this convention is fragile: a Wave-2 implementation order swap could cause double registration. Surfacing as NOTE so the founder is aware of the implicit ordering dependency.

**Recommended fix:** Add to scope plan §6 cross-cuts table: "`/brands` route registration — placeholder ships in 02, real component lands when 03 ships." Either PRD 02 ships an empty stub component or PRD 03 ships the route entry exclusively and PRD 02 references it. Pick one model; document the lockstep.

---

### NOTE (locked)-3: `/account/brands` route — PRD 03 owns content, PRD 04 owns registration. Per founder lock #11 (B12 reversal) — locked, but coordination model fragile

**Lens:** 1 (Ownership boundaries) + 4 (Route table integrity)

**Files:**
- `docs/kova-final-prds/03-brand-management.md` §6.1 line 624 (declares `/account/brands` content)
- `docs/kova-final-prds/04-account-and-stripe-billing.md` §6.1 line 802 (declares `/account/:section(...|brands|...)` parent route)
- `docs/kova-final-prds/04-account-and-stripe-billing.md` §6.4.1 line 1028 (`SectionResolver` maps `brands` → PRD 03's `BrandsArchiveView`)

**Issue:** Founder lock #1 (B12 reversal 2026-05-17) explicitly splits ownership: PRD 04 ships route registration + sidebar nav entry; PRD 03 ships the page content (`BrandsArchiveView`). The coordination is the only example in the PRD set where one cluster's component is loaded by another cluster's route map. The pattern is correct but unusual; a Cluster 04 implementer not reading PRD 03 might forget the dynamic component import.

**Evidence:**

PRD 04 §6.4.1 line 1028:
> | `BrandsArchiveView` *(cross-cluster, owned by PRD 03)* | `src/views/account/sections/BrandsArchiveView.vue` *(PRD 03 path)* | **B12** page content (active+archived brand grid + B12.3 Restore + B12.4 Delete-archived modals). **PRD 04 only registers the route + sidebar entry; PRD 03 ships this component.** Imported by `<SectionResolver>` when `:section === 'brands'`. |

PRD 03 §6.1 line 624:
> | /account/brands | <BrandsArchiveView> (B12) | requiresAuth | dark | **Route registration owned by PRD 04** (lives inside /account chrome with .acc-rail sidebar — PRD 04's "Brands" nav item links here). Page content owned here. ... |

PRD 03 §11 line 956 row "**04 — Account & Stripe**": clarifies the cross-cluster dependency. Looks correct + consistent.

**Severity rationale:** Tagged as NOTE because founder-locked per #1 and PRDs explicitly coordinate. But the cross-cluster `SectionResolver` dynamic-import pattern is unique in the PRD set and risks getting forgotten by implementers. Surfacing for awareness, not as a fix.

**Recommended fix:** None required — pattern is correctly documented. Recommend adding a one-line note in scope plan §6 cross-cuts: "`/account/brands` — PRD 04 owns route registration + sidebar entry; PRD 03 owns `<BrandsArchiveView>` page content (cross-cluster dynamic import via `<SectionResolver>`)."

---

## Cross-axis observations

### Observation 1: 2026-05-17 founder-lock propagation is incomplete

Multiple PRDs received 2026-05-17 founder ratifications and were bumped (`IN-REVIEW 2026-05-17` status) — specifically 02, 03, 04, 05, 06, 08, 11, 12. But PRDs 07a, 07b, 09, 10 still carry pre-2026-05-17 status fields despite having body references to 2026-05-17 ratifications. The propagation pattern looks like:

1. Founder ratifies decision X on 2026-05-17.
2. Owning PRD body is updated.
3. Status field bump applied (sometimes).
4. Downstream consumer PRDs may or may not have been updated to consume the ratified shape.

Recommended cross-axis fix: rerun a "founder lock #1–16 → consumer PRD" propagation check. The 16 founder locks in QA-A prompt §FROZEN-FOUNDER-DECISIONS are the canonical source. Each lock should have a direct trace into every PRD that consumes it. Build a simple matrix in the next consolidation pass to ensure consistency.

### Observation 2: Cmd+K scrub pattern is inconsistent across PRDs

PRD 02 §12.13 explicitly tracks the Cmd+K scrub line-by-line ("Affected lines: §0 depends-on table; §1.1 plain-language paragraph; §2.1 sidebar bullet; ..."). PRD 11 explicitly DROPPED it with §12.10 changelog. But PRDs 04, 06, 08 carry residual Cmd+K references (HIGH-1) — they were not part of the scrub plan. Recommendation: add Cmd+K scrub to PRD 04 / 06 / 08 in the next consolidation pass and apply consistent §12 changelog entries.

### Observation 3: `useObjectActions` composable spans 4 PRDs cleanly

PRDs 03, 06, 07b, 08 all reference `useObjectActions` consistently. Ownership is Cluster 08 (owner); 03 consumes the new `brandCardActiveActions` + `brandCardArchivedActions` per founder lock #1; 06 consumes via `FrameHead` overflow + canvas right-click; 07b consumes via inspector overflow. All four use the same name + signature. No drift detected. Good example of cross-PRD primitive ownership done right.

### Observation 4: `audit_log` gap pattern suggests missing shared-infra checklist

The CRITICAL-1 audit_log gap is the most consequential finding. Pattern looks like: 5 PRDs reference a Cluster 11 primitive that the owning PRD silently failed to add. Recommend adding a "Cross-cluster primitive checklist" pre-build gate: for each primitive Cluster 11 commits to ship (audit_log, idempotency_keys, theme swap, channel naming, etc.), grep across all consumer PRDs that reference it, and confirm Cluster 11 §2.1 + §4.1 + §11 declare it.

### Observation 5: PRD status hygiene across the 13 PRDs

| PRD | Status | Last updated | Per body, should be |
|---|---|---|---|
| 01 | APPROVED 2026-05-15 | 2026-05-15 | OK (§12 has open Qs but minor) |
| 02 | DRAFT 2026-05-15 | 2026-05-15 | Should bump to IN-REVIEW after 2026-05-17 scrub |
| 03 | IN-REVIEW 2026-05-17 | 2026-05-17 | OK |
| 04 | DRAFT 2026-05-15 | 2026-05-15 | Should bump to IN-REVIEW after 2026-05-17 B12 changes |
| 05 | REVIEW 2026-05-17 | 2026-05-17 | OK |
| 06 | DRAFT → READY 2026-05-17 | 2026-05-17 | OK |
| 07a | DRAFT 2026-05-15 | 2026-05-15 | **Stale** — body references 2026-05-17 ratifications (HIGH-5) |
| 07b | DRAFT 2026-05-15 | 2026-05-15 | **Stale** — needs MEASUREMENT model update (HIGH-3) |
| 08 | DRAFT-LOCKED 2026-05-17 | 2026-05-17 | OK |
| 09 | DRAFT | 2026-05-15 | **Stale** (MEDIUM-6) |
| 10 | DRAFT 2026-05-15 | 2026-05-15 | **Stale** — needs default-tab + measurement model + status bump (LOW-6) |
| 11 | IN-REVIEW 2026-05-17 | 2026-05-17 | OK but `audit_log` gap (CRITICAL-1) |
| 12 | DRAFT 2026-05-15 | 2026-05-15 | Should bump after 2026-05-17 references applied |

Recommendation: in the next consolidation pass, every PRD with body-level 2026-05-17 references should have its status / last-updated bumped or explicitly justified.

---

## Lens coverage summary

| Lens | # | Notes |
|---|---|---|
| 1 — Ownership boundaries | CRITICAL-1, HIGH-2, HIGH-3, MEDIUM-7, MEDIUM-8, NOTE-2, NOTE-3 | audit_log + Measurement model + cross-cluster route ownership |
| 2 — Naming consistency | HIGH-2, HIGH-4, LOW-3, LOW-4, LOW-5 | tab default + Tauri command order + count narratives |
| 3 — Schema consistency | CRITICAL-1, HIGH-3, MEDIUM-7, MEDIUM-9 | audit_log shape + Measurement schema drift + plan_status union |
| 4 — Route table integrity | NOTE-2, NOTE-3 | Cross-cluster route ownership |
| 5 — Hi-fi citation rot | HIGH-1 | Cmd+K palette / A5 hi-fi retired |
| 6 — Phase-2 leaks | HIGH-1, MEDIUM-4, MEDIUM-5, LOW-5 | Cmd+K, Prototype, MEASUREMENT NodeType, SOON pills |
| 7 — §12 closure | MEDIUM-1, MEDIUM-2, MEDIUM-3 | Unresolved open questions in PRD 02, 01, 11 |
| 8 — Cross-cluster dep graph | CRITICAL-1, MEDIUM-8 | audit_log + M9 access_token coordination |
| 9 — Acceptance criteria | LOW-2 | PRD 01 cron pseudocode dead branch |
| 10 — Founder framing fit | (none surfaced — passed) | Avatar + product reality consistent |
| 11 — Hard constraint violations | (none surfaced — passed) | `packages/core/` lifts properly scoped to 07a; valibot enforced; no Zod / React / Next / PixiJS / VITE_ secrets violations spotted |
| 12 — Status hygiene | HIGH-5, MEDIUM-4, MEDIUM-5, MEDIUM-6, LOW-1, LOW-6 | Status field staleness on 07a/09/10 + scope-plan inventory + Cmd+K residuals |

Lens 10 and Lens 11 both passed — no findings. Avatar (freelance email marketer, one brand per Shopify shop, no workspace layer, no team / multiplayer / HTML export) is consistently honored across all 13 PRDs. Hard constraints (no Zod in tool layer, valibot only; no Math.random — `crypto.getRandomValues` used; no `VITE_` prefix on server-only secrets — verified across migration tables + env var declarations) are respected.

---

## Closing note

The 13 PRDs form an unusually coherent corpus for their scale (~15,500 lines total). Cross-cluster patterns (idempotency keys, Realtime channel naming, theme detection meta, `useObjectActions` composable, Stripe customer lifecycle) are correctly shared and named. The dominant pattern of failure is **founder-lock propagation lag** — decisions ratified 2026-05-17 are correctly applied at their primary owner PRD but did not flow uniformly to peer PRDs that consume the same shape.

The single CRITICAL finding (audit_log table not shipped by owning Cluster 11) is the only structurally broken cross-cluster contract; the 5 HIGH findings are all 2026-05-17 ratification-propagation drift (Cmd+K residuals, default-tab contradiction, measurement-not-NodeType, status field staleness, intra-PRD inconsistency). MEDIUM and LOW findings are documentation hygiene that does not block Wave 1 / Wave 2 implementation.

Recommended consolidation order:
1. Fix CRITICAL-1 (audit_log) first — it's a real schema gap.
2. Apply Cmd+K scrub to PRD 04 / 06 / 08 (HIGH-1).
3. Coordinate the measurement-model + default-tab updates across PRD 07b / 10 / scope-plan §3 (HIGH-2 + HIGH-3 + MEDIUM-4 + MEDIUM-5 + MEDIUM-7).
4. PRD 06 intra-PRD inconsistency one-line fix (HIGH-4).
5. Status field bumps where body cites 2026-05-17 ratifications (HIGH-5 + LOW-6 + MEDIUM-6).
6. Close open §12 questions (MEDIUM-1 / 2 / 3).
7. Address LOW and NOTE findings as documentation polish.

After consolidation, run a second targeted PRD-consistency audit limited to the changed surfaces to confirm fixes did not introduce new drift.

— End QA-A report —
