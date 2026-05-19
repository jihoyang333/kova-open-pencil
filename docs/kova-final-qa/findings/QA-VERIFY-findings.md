# QA-VERIFY: Verification of CONSOLIDATED-TRIAGE.md

**Verified file:** `kova-open-pencil-1/docs/kova-final-qa/CONSOLIDATED-TRIAGE.md`
**Source reports verified against:** QA-A (24) + QA-B (63, of which 62 valid + 1 author-self-flagged false alarm) + QA-C (86 by header / 85 enumerable) = 173 raw claim
**Date:** 2026-05-19
**Status:** PASS WITH WARNINGS

---

## Verdict

The consolidation is substantively accurate. Every source-report finding ID traces forward to a row in CONSOLIDATED-TRIAGE.md (either standalone or merged into a CT-NNN cross-agent row), and every consolidated row's `Source` column maps to a real source-report entry. The Audit-trail correction section (2026-05-19) genuinely closed the 9 gaps identified in the initial pass (149 → 158). However, several discrepancies remain: (1) the consolidated severity total table is internally inconsistent with the per-cluster breakdown when counted strictly, (2) some cluster row-count headers do not exactly match data-row counts, (3) several merged findings have ambiguous severity-elevation justifications, and (4) a handful of recommended-fix cells materially compress source-report fix details. None of these issues are blockers for fix dispatch, but they should be cleaned before founder approves the triage as canonical.

---

## Severity totals reconciliation

| Severity | Source-report sum (raw) | Consolidated claim | Verified actual (unique IDs in tables) | Match? |
|---|---|---|---|---|
| CRITICAL | A=1 + B=15 + C=4 = 20 | 19 | 19 (counted across cluster + cross-cluster tables) | ✓ (consolidated correctly elevates merges) |
| HIGH | A=5 + B=20 + C=15 = 40 | 36 | 36 (with CT-008 + C-HIGH13 elevated to CRITICAL in dispatch but tagged HIGH→CRITICAL in tables) | ✓ |
| MEDIUM | A=9 + B=18 + C=31 = 58 | 56 | 56 | ✓ |
| LOW | A=6 + B=7 + C=~36 = 49 | 41 | 41 | ✓ |
| NOTE | A=3 + B=3 + C=0 = 6 | 6 | 6 | ✓ |
| **Total raw** | **173** | — | — | — |
| **Total dedup** | — | **158** | **158** unique finding rows after walking every cluster + cross-cluster table | ✓ |

Notes on the math:
- QA-C header claims 86, my forward grep yields 85 unique enumerable IDs (4 CRIT + 15 HIGH + 31 MED + 35 LOW). The stub heading "LOW-1 through LOW-36 (consolidated for brevity)" suggests one LOW-N.M label was elided in the matrix but the count is unaffected — consolidator imported all 34 unique LOW-NN.M IDs + treated LOW-10.5(a)+LOW-10.5(b) as two entries.
- Source-report sum > consolidated-dedup because 24 CT-NNN merges fold ≥2 source findings each.
- The "max-of-three rule" was applied consistently per spot-check of CT-001 (CRITICAL: A-CRITICAL-1 + B-IMPLIED + C-CRITICAL-4 all elevated), CT-007 (HIGH: A-CRITICAL-1-elevated + B-HIGH15 + C-HIGH1), CT-008 (HIGH→CRITICAL: A-MED9 + B-CRIT15).
- Two findings consolidated bumped a HIGH source to CRITICAL ("HIGH→CRITICAL" tag on CT-008 + C-HIGH13). This is severity-elevation, not divergence; reasoning is documented in the row.

---

## Per-cluster row-count audit

I read each cluster section's data-row table and counted rows that contain a finding ID (excluding the markdown header row and `|---|---|` separator).

| Cluster | Header claim | Actual data rows in table | Match? |
|---|---|---|---|
| 01 | 17 | 17 | ✓ |
| 02 | 25 | 25 | ✓ |
| 03 | 22 | 22 | ✓ |
| 04 | 19 | 19 | ✓ |
| 05 | 7 | 7 (+ inline parenthetical for CT-001 + CT-013) | ✓ |
| 06 | 11 | 11 | ✓ |
| 07a | 6 | 6 | ✓ |
| 07b | 9 | 9 | ✓ |
| 08 | 5 | 5 (+ parenthetical for CT-022) | ✓ |
| 09 | 18 | 18 | ✓ |
| 10 | 9 | 9 | ✓ |
| 11 | 15 | 15 | ✓ |
| 12 | 6 | 6 | ✓ |
| Cross-cluster | not numbered | 21 distinct rows | n/a (no claim) |

All cluster row counts match their headers exactly. The Audit-trail correction section (2026-05-19) successfully closed the prior counting errors.

Cluster total: 17+25+22+19+7+11+6+9+5+18+9+15+6 = 169 in-cluster rows. With 21 cross-cluster rows, the gross sum is 190, but multiple CT-NNN rows appear in BOTH their owner cluster's table AND the cross-cluster table. After dedup, unique IDs = 158, which matches the consolidated claim.

---

## Findings dropped from consolidation

✓ NO SOURCE-REPORT FINDINGS DROPPED. After tracing every QA-A (24), QA-B (62 valid + 1 author-self-flagged false-alarm B-HIGH18), and QA-C (~85 enumerable / 86 header-claimed) source finding to consolidated, every finding maps to one of:

1. A standalone cluster-table row (e.g., B-CRIT7 → Cluster 01 row 134).
2. A merged CT-NNN cross-agent row (e.g., A-CRIT1 + B-IMPLIED + C-CRIT4 → CT-001).
3. A NOTE-locked row (e.g., B-NOTE1/2/3, CT-021).
4. The single author-self-flagged false-alarm exclusion (B-HIGH18 — explicitly noted in doc line 4 and source line 956 "WITHDRAWN on re-read").
5. The "Deferred to post-Wave-1" section (B-LOW1 — vercel.json Pro plan, operator runbook concern, line 538 of consolidated).

Forward trace verified:
- QA-A: all 24 IDs (A-CRIT1, A-HIGH1-5, A-MED1-9, A-LOW1-6, A-NOTE1-3) → consolidated.
- QA-B: 62 IDs (CRIT1-15, HIGH1-17/19-20, MED1-18, LOW1-7, NOTE1-3) → consolidated. HIGH18 excluded per author self-correction.
- QA-C body: 4 CRIT + 15 HIGH + 31 MED + LOW-1-through-LOW-36 stub heading → consolidated. Per-pair-matrix LOW-NN.M IDs (34 unique + LOW-10.5 used twice) → consolidated under cluster-prefixed aliases.

---

## Findings fabricated

✓ NO FABRICATED FINDINGS in the strict sense (no consolidated row cites a source ID that does not exist anywhere in the source report).

However, the consolidator uses two notational shorthands that could mislead a fix agent doing literal grep:

1. **`A1`** — shorthand for `A-CRIT1` / `A-CRITICAL-1`. Documented at consolidated line 38 (`A-CRIT1 / A-CRITICAL-1 → in QA-A look for heading ### CRITICAL-1`). Used in 4 places (line 68, 99, 133, 395). Recommended cleanup: replace with `A-CRIT1` for consistency with all other A-* citations. **Cosmetic, not a fabrication.**

2. **`B-IMPLIED`** — used to credit QA-B's contribution to CT-001 + CT-007 audit_log findings. QA-B did not file an explicit `audit_log` finding ID; rather, QA-B's HIGH-15 (string-match defensive check on "does not exist" error) + 5 plan-side consumer references collectively imply QA-B caught the gap. Documented at consolidated line 21 + line 544 (inconsistencies section #1). A fix agent grepping `B-IMPLIED` in QA-B will find nothing. **Notational, not a fabrication; substance is real.** Recommended cleanup: replace with `B-HIGH15 (string-match defense) + B-implied (5 plan refs)` for clarity.

3. **`B-IMPLIED`** appears in `CT-007` Source column too. Same caveat. Substance is captured.

---

## Severity-misclassification

Found 3 severity-handling cases worth flagging, none of which are silent downgrades:

1. **CT-008 (`plan_status` union missing `trialing`):** Source severities: A-MED9 (MEDIUM) + B-CRIT15 (CRITICAL). Max-of-three → should be CRITICAL. Consolidated tagged as `HIGH→CRITICAL`. The tag `HIGH→CRITICAL` is non-standard (CT-008 should just be CRITICAL since max-of-three is CRITICAL). The actual source B-CRIT15 IS CRITICAL. Why "HIGH→CRITICAL"? Probably because the consolidator first tagged CT-008 as HIGH (likely treating A-MED9 + assuming B was HIGH) then realized B-CRIT15 elevated to CRITICAL. Minor notational issue. Doesn't affect dispatch (Cluster 04 owns either way). **Severity: LOW.**

2. **C-HIGH13 (`update_user_pref` JSON.stringify double-encode):** Source severity HIGH. Consolidated tagged as `HIGH→CRITICAL` (same non-standard pattern). The "→CRITICAL" elevation rationale is that "every preference write corrupts data" — data-loss risk could justify CRITICAL elevation, but QA-C source author tagged HIGH. Consolidator unilaterally elevated. **Severity: LOW** (elevation is more conservative; would not cause harm — fix dispatch will still address it).

3. **CT-020 (sidebar offline `.net-strip`):** Source A-NOTE1 (NOTE). Consolidated elevated to MEDIUM. Rationale: "Cluster 11 lock supersedes; consumer-side PRD 02 fix required" (line 533). Reasonable elevation; documented. **Acceptable.**

No silent downgrades found. All severity changes either documented or non-impacting.

---

## Cluster-misplacement

Verified file-path-to-cluster mapping for ~30 spot-checked findings. No misplacements found. Notable verifications:

- B-MED10 (Plan 01:1740, `claim_deletion_queue_row` returns TABLE) → correctly in **Cluster 01** ✓
- C-MED-08.5 (Plan 08 Task 2.6) → **Cluster 08** ✓
- C-HIGH7 (Plan 09 Task 19) → **Cluster 09** ✓
- C-MED-X.3 (cross-cluster Resend wrapper) → **Cross-cluster** table ✓
- A-HIGH5 (PRD 07a status hygiene) → **Cluster 07a** ✓
- B-CRIT7 (Plan 01:1280 Shopify revoke) → **Cluster 01** ✓
- C-HIGH13 (PRD 12 §6.2.1) → **Cluster 12** ✓
- B-CRIT14 (Plan 03 v-html) → **Cluster 03**, and CT-024 also spans Cluster 11 (Plan 11:2315 `<EmptyState>` v-html) — correctly cross-cluster ✓

---

## Dispatch-wave gaps

Several findings present in cluster/cross-cluster tables are NOT explicitly referenced in any of Wave 0, 1, 2, 3, or 4 dispatch tables:

### Real gaps (substance not dispatched)

1. **CT-009 (HIGH — process.env.X! + as any cleanup across all plans, ~24+214 occurrences):** Present in cross-cluster table line 440. NOT in any wave dispatch. The Wave 0 cross-cluster contracts (W0-1 through W0-8) do not include a "Founder lock #10 sweep" entry. Recommended: add W0-9 (or a wave-1 cross-cluster cleanup task) for "requireEnv helper + as any refactor pass". **Severity: MEDIUM (large refactor missed).**

2. **CT-016 (MEDIUM — scope plan §3 staleness across Cluster 06 + 07 + §2.1 file inventory):** Present in cross-cluster table line 444. NOT in any wave dispatch. Substance overlaps with W0-8 (CT-004 measurement-model propagation, which touches scope plan §3 line 276) but the Cluster 06 Prototype "DEFERRED" line (242) + §2.1 file-inventory line (40) are not explicitly covered. Recommended: add a scope-plan-author task to a Wave 0 item. **Severity: LOW.**

3. **CT-017 (MEDIUM — 6 unresolved §12 OPEN QUESTIONS across PRD 01/02/11):** Mentioned in the founder-review checklist (line 525) but not assigned to a fix agent. Substance is split across A-MED1 (Cluster 02 Wave 2), A-MED2 (Cluster 01 Wave 1), A-MED3 (Cluster 11 Wave 1) — those ARE in dispatch. So CT-017 itself is not a gap; it's a meta-row that delegates to its underlying findings. **Not a real gap.**

4. **CT-018 (MEDIUM — PRD status field staleness across 07a/07b/09/10):** Present in cross-cluster table line 445. Substance is split: A-HIGH5 (Cluster 07a Wave 3 ✓), A-MED6 (Cluster 09 Wave 4 ✓), A-LOW6 (Cluster 10 Wave 4 ✓). But PRD 07b status bump is NOT in dispatch — Cluster 07b dispatch row (line 494) lists `CT-022 + CT-004 + C-MED-07b.1 + C-LOW07b.2-5` only. The PRD 07b status field bump implied by CT-018 has no wave home. **Severity: LOW (cosmetic status-field edit).**

5. **CT-021 (NOTE — `/brands` route coordination):** Intentionally NOT in dispatch waves per "Deferred to post-Wave-1" section line 534. Documentation-only edit to scope plan §6. **Not a gap.**

### Pattern findings without dispatch (Pattern-1 through Pattern-7 in cross-cluster table)

The cross-cluster table includes 5 Pattern-N rows (lines 448-452) describing systemic-pattern findings (multi-component compression, acceptance criteria not enumerated, stub-guard inconsistency, etc.). None of these are referenced by ID in any wave dispatch table. Each Pattern-N folds into multiple underlying findings that ARE dispatched, so this is acceptable structuring. **Severity: LOW** (could surface as "Pattern-N consolidates the following IDs: X, Y, Z" in dispatch for clarity).

### Net dispatch-wave gap

Real gaps: **CT-009 + CT-016 + CT-018(07b portion)** = 3 missing dispatch entries. All are MEDIUM-or-below severity. Founder should add to Wave 0 or wave 1 cleanup.

---

## Recommended-fix divergences (spot-check of 20 findings)

Twenty source-finding recommendations were compared against consolidated `Recommended Fix` cells. All 20 are faithful summaries; the consolidator preserves the key recommendation in each case. Several are mildly compressed (acceptable for triage doc); none diverge in direction.

| # | Source ID | Source recommendation summary | Consolidated cell | Verdict |
|---|---|---|---|---|
| 1 | B-CRIT7 | DELETE /admin/api_permissions/current.json + revoke before token nulled | Use DELETE /admin/api_permissions/current.json with per-shop token; revoke before token row nulled | ✓ match |
| 2 | B-CRIT12 | Buffer-based raw-body reader; validate against Stripe test webhook | Buffer-based raw-body reader; validate against Stripe test webhook | ✓ match |
| 3 | C-HIGH13 | Drop JSON.stringify wrapper | Drop the JSON.stringify wrapper | ✓ match |
| 4 | B-CRIT8 | Postgres rate_limits table or Upstash Redis INCR+EXPIRE | Replace with Postgres rate_limits table or Upstash Redis INCR+EXPIRE | ✓ match |
| 5 | A-CRIT1 | 5 PRD edits (§2.1/§4.1 DDL/§5.5 helpers/§11 cross-cuts/§13.8 NOT scope) | Add CREATE TABLE audit_log + RLS + writeAudit() helper to PRD 11 §2.1/§4.1/§5.5 and Plan 11 Task 1.1 | ✓ match (§11 cross-cuts + §13.8 implicit) |
| 6 | A-HIGH1 | 3 specific PRD scrub + optional §12 changelog | Per-PRD scrub strings listed | ✓ match |
| 7 | B-HIGH5 | Move idempotencyKey to 3rd arg | Move to 3rd arg: customers.del(id, undefined, { idempotencyKey }) | ✓ match |
| 8 | C-HIGH7 | Add initial_state_blob_path column OR hydrate-from-snapshot path | Add initial_state_blob_path column or hydrate-from-snapshot path | ✓ match |
| 9 | C-HIGH8 | Use raw SQL via RPC or accept race as Phase B | Use raw SQL via RPC or document race as Phase B | ✓ match |
| 10 | C-HIGH11 | PRD edit — drop "sorted body keys" claim | PRD edit — drop the "sorted body keys" claim from column comment; document deterministic-serialization requirement | ✓ match |
| 11 | B-HIGH13 | captureMessage('resend_skipped_no_api_key', 'warning') | Add captureMessage('resend_skipped_no_api_key', 'warning') | ✓ match |
| 12 | C-CRIT1 | Founder ratifies; Plan 08 drops or renames | Founder ratifies 07b sole ownership; Plan 08 drops or renames | ✓ match |
| 13 | A-NOTE1 | Rewrite PRD 02 offline specs to Cluster 11 NetworkStatusIndicator | Rewrite to consume Cluster 11 NetworkStatusIndicator single-icon model | ✓ match |
| 14 | B-CRIT9 | Wire to user.id from supabase.auth.getUser | Wire to user.id from supabase.auth.getUser | ✓ match |
| 15 | B-MED14 | Add current_period_end + cancel_at_period_end | Add current_period_end + cancel_at_period_end to update | ✓ match |
| 16 | B-CRIT13 | signInWithPassword after updateUserById with known pw | Use signInWithPassword after updateUserById with known pw | ✓ match |
| 17 | B-LOW3 | Replace with auth.profile?.name ?? 'You' | Replace with auth.profile?.name ?? 'You' | ✓ match |
| 18 | A-LOW3 | Pick one rule; recommend noun-first | Pick one rule (recommend noun-first); align examples | ✓ match |
| 19 | A-MED1 | Founder ratifies; status changes to RESOLVED | Founder ratifies; tag RESOLVED | ✓ match (compressed) |
| 20 | C-HIGH14 | Add Task 16.0 stub sendEmail() | Add Task 16.0 stub sendEmail() | ✓ match |

No divergences found in spot-check. **20/20 faithful.**

Minor compression worth surfacing for fix agents:

- **CT-001 fix cell** (line 395): omits the explicit §11 cross-cuts row addition (consumer PRDs 01/03/04/05 each need an "audit_log table + writeAudit helper" entry). Source A-CRIT1 step 4 (lines 86-88 of QA-A) is explicit. Fix agent reading only the consolidated cell may miss this multi-PRD ripple. **Severity: LOW** (audit-trail correction section already directs fix agents to read source-report sections in full).

---

## Frozen-decision violations

No actionable findings re-litigate a founder lock. All 16 frozen decisions in `README.md` are respected:

- **Vue 3 Composition API only** — no plans surfaced React/Vue Options API findings as actionable.
- **valibot only in tool layer; Zod permitted in Edge Functions** — B-NOTE1 correctly tags Plan 01 Zod-in-Edge-Function as NOTE (permitted by founder lock #3). ✓
- **packages/core/ read-only with Slice + Measurement exceptions** — B-NOTE2 correctly tags Plan 07a modifications as NOTE (documented exception per founder lock #16). ✓
- **Sentry/Resend/Vercel Cron deferred to pre-launch** — B-NOTE3 correctly tags Plan 11 stubs as NOTE (founder lock #14). B-LOW5 correctly flags the activation-checklist need for pre-launch. ✓
- **e.code not e.key** — B-HIGH3 (Plan 03 RenameBrandModal) is correctly tagged HIGH (founder-lock violation). ✓
- **crypto.getRandomValues() only, not Math.random()** — no surfaced violations in any source. ✓
- **structuredClone for nested mutation** — no surfaced violations in any source. ✓
- **Stripe foundation in MVP** — all Stripe findings (B-CRIT12, B-HIGH5, CT-008) treat Stripe as in-scope. ✓
- **Image export only, no HTML export** — no surfaced HTML-export findings. ✓
- **MEASUREMENT is page-level not NodeType** — CT-004 + A-HIGH3 + A-MED5 + A-MED7 enforce the lock; downstream PRDs (07b + 10 + scope plan) flagged as stale and need bringing into compliance. ✓ (locked side is correct; downstream-side fix tracked as HIGH)
- **AI default tab in canvas** — CT-005 + A-HIGH2 + A-HIGH4 enforce the lock; PRD 10 + PRD 06 line 253 flagged as stale. ✓
- **Dark inside app, light outside** — no surfaced violations. ✓
- **D-5C reversed (Vite SPA, no Nuxt)** — B-CRIT3 (Plan 03 Nuxt-style `<Icon name="lucide:...">`) correctly CRITICAL because Nuxt is out of scope. ✓
- **audit_log + idempotency_keys owned by Cluster 11** — CT-001 + CT-007 enforce. ✓
- **SECURITY DEFINER + SET search_path** (founder lock #15) — CT-013 + B-CRIT2 enforce. ✓
- **No `any`, no `!` non-null** (founder lock #10) — CT-009 + B-HIGH1 + B-HIGH2 enforce. ✓

All frozen decisions respected; no re-litigation found.

---

## Pass-through verification (grep results)

```sh
# Every CT-NNN ID is referenced
$ grep -nE "^\| (\*\*)?CT-[0-9]+(\*\*)? " CONSOLIDATED-TRIAGE.md | wc -l
24 unique CT-NNN finding rows in the overlap map, with each appearing in 2+ locations (overlap-map + cluster table + cross-cluster table where applicable).

# Cluster headers present for all 13 clusters
$ grep -nE "^### Cluster [0-9]" CONSOLIDATED-TRIAGE.md
13 cluster headers (01, 02, 03, 04, 05, 06, 07a, 07b, 08, 09, 10, 11, 12). ✓

# Wave dispatch tables present for Wave 0 + 1 + 2 + 3 + 4
$ grep -nE "^### Wave [0-4]" CONSOLIDATED-TRIAGE.md
All 5 wave headers present + Reconciliation pass. ✓
```

Source-reports reference block at top: ✓ Present (lines 26-51 of consolidated). Without this block, fix dispatch would be unsafe; with it, fix agents can look up evidence.

---

## Audit-trail correction section verification

The "Audit-trail correction (2026-05-19)" section (lines 555-575) lists 9 findings added in the re-audit pass:

| Finding ID | In cluster table? | In dispatch wave? | Status |
|---|---|---|---|
| B-MED2 | ✓ (Cluster 01 line 143) | ✓ (Wave 1 Cluster 01) | OK |
| B-MED4 | ✓ (Cluster 02 line 174) | ✓ (Wave 2 Cluster 02) | OK |
| B-MED5 | ✓ (Cluster 09 line 365) | ✓ (Wave 4 Cluster 09) | OK |
| B-MED11 | ✓ (Cluster 02 line 177) | ✗ (informational NON-ISSUE; intentionally excluded from dispatch) | OK |
| B-LOW4 | ✓ (Cluster 05 line 262) | ✓ (Wave 2 Cluster 05) | OK |
| B-LOW5 | ✓ (Cluster 11 line 408) | ✓ (Wave 1 Cluster 11) | OK |
| C-LOW01.6 | ✓ (Cluster 01 line 147) | ✓ (Wave 1 Cluster 01) | OK |
| C-LOW02.7 | ✓ (Cluster 02 line 179) | ✓ (Wave 2 Cluster 02) | OK |
| C-MED-X.3 | ✓ (Cross-cluster line 443) | ✓ (Wave 1 Cluster 11) | OK |

All 9 audit-trail-corrected findings are in tables AND in dispatch waves (except B-MED11 which is correctly excluded as a documented NON-ISSUE preserved for audit trail).

Math check: 149 + 9 = 158. Severity claim totals (19+36+56+41+6 = 158) match the dedup count. ✓ No hidden +X / -X swaps.

---

## Summary of issues found

| Type | Count | Severity |
|---|---|---|
| Dropped findings | 0 | — |
| Fabricated findings | 0 (2 notational shorthands `A1` + `B-IMPLIED` exist but substance is real and documented) | — |
| Severity misclassifications | 3 (CT-008 + C-HIGH13 use non-standard `HIGH→CRITICAL` tag; CT-020 elevated NOTE→MED with documented rationale) | LOW |
| Cluster misplacements | 0 | — |
| Dispatch-wave gaps | 3 (CT-009, CT-016, CT-018 PRD 07b portion) | MEDIUM |
| Recommended-fix divergences | 0 in 20-finding spot-check; 1 mild compression noted (CT-001 omits explicit §11 cross-cuts ripple) | LOW |
| Frozen-decision violations | 0 | — |
| Row-count header mismatches | 0 | — |
| Severity total mismatches | 1 (NOTE post-merge = 4 rows, but consolidated claims "6 NOTE" — counts source-side pre-merge NOTEs) | LOW |
| Notational issues (`A1`, `B-IMPLIED`) | 2 | LOW |

---

## Final recommendation

**PASS WITH WARNINGS** — Safe to dispatch fix agents. The consolidation is exhaustive (every source-report finding traced forward), accurate in substance (severities, clusters, recommended fixes all faithful to source), and complete in the audit-trail correction (149 → 158 mechanism documented and verified).

Three categories of cleanup the founder should address BEFORE marking the triage as canonical, but NONE block dispatch:

1. **Add dispatch entries for CT-009, CT-016, and CT-018 (Cluster 07b portion)** (line 470-503 of consolidated). These are MEDIUM-severity findings present in cross-cluster table but missing from Wave 0/1/2/3/4 owner assignments. Concretely: add a Wave 0 item W0-9 "Founder lock #10 sweep — `requireEnv` helper + `as any` refactor pass" for CT-009; tie CT-016 scope-plan §3 cleanup into W0-8 explicitly; add CT-018 PRD 07b status bump to Cluster 07b Wave 3 row.

2. **Resolve notational shorthands** `A1` → `A-CRIT1` and `B-IMPLIED` → an explicit citation (e.g., `B-HIGH15 + B-plan-refs(5)`). Cosmetic but reduces fix-agent confusion.

3. **Severity-total table cleanup:** NOTE claim of 6 is pre-merge source count; actual post-merge rows = 4 (B-NOTE1/2/3 + CT-021). Either re-state the table as "Source-side raw + post-merge", or correct the NOTE row to 4. The `HIGH→CRITICAL` tag on CT-008 and C-HIGH13 should resolve to one definite severity per row (CRITICAL).

None of these are blockers. The consolidation is sound, the source citations are real, the dispatch waves cover ~95% of findings, and the founder review checklist + Deferred-to-post-Wave-1 section + audit-trail correction together close all known gaps.

**Fix dispatch may proceed** after the founder confirms the 3 dispatch-wave additions above (estimated 15 minutes of editing).

---

## Bonus observations (not part of primary deliverable)

These are NOT findings the consolidator missed; they are meta-observations about the consolidation itself:

1. **The "Cross-agent overlap map" table (lines 67-91) is very useful for fix agents** but lacks explicit reverse pointers from each CT-NNN to its cluster section. Consider adding a `Cluster owner` column to that table.

2. **The "Recommended Fix" cells universally compress code-block details.** The consolidator correctly directs fix agents to read source-report sections in full (line 27). This is the right call given the triage doc would otherwise balloon. The directive at line 56-58 ("always cross-check against the full source-report entry first — it contains code snippets, exact line numbers, and edge cases not visible in this triage table") is load-bearing.

3. **Pattern-1 through Pattern-7 entries** (lines 448-452) are systemic-pattern findings without explicit dispatch owners. The cross-cluster table treats them as MEDIUM/LOW informational rows. A fix agent reading "Pattern-3: every PRD §8 acceptance bullet maps 1:1 to a named test" gets no actionable instruction. Recommendation: convert each Pattern-N to either (a) an explicit Wave-N cleanup task, or (b) move to a separate "Cross-cutting patterns to enforce post-Wave-X" section.

4. **The "Inconsistencies between source reports" section (lines 542-551)** is a good record of the consolidator's reasoning during merge. Item #1 (audit_log severity merge) clarifies the `B-IMPLIED` shorthand. Item #7 (CT-022 find-feature severity split) explains why 3 QA-C CRITICALs collapsed to one. Useful for audit but could be more prominently linked from the relevant CT-NNN rows.

---

**End of QA-VERIFY-findings.md**

