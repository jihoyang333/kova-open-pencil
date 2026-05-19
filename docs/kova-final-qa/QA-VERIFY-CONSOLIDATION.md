# Verification Agent — Final Quality Gate on CONSOLIDATED-TRIAGE.md

**Status:** READY TO DISPATCH
**Output:** `kova-open-pencil-1/docs/kova-final-qa/findings/QA-VERIFY-findings.md`
**Estimated time:** 2-4 hours of careful reading + grep + cross-check

---

## 0. Mission

You are the **last quality gate** before Kova's pre-build QA findings get dispatched to fix agents. The primary session consolidated **3 source QA reports** (QA-A / QA-B / QA-C, totaling 173 raw findings across 3283 lines) into a single deduplicated triage at `docs/kova-final-qa/CONSOLIDATED-TRIAGE.md` (claims 158 unique findings post-merge).

Your job: **re-verify the consolidation is exhaustive, accurate, and lossless.** Catch anything the consolidator missed, mis-classified, mis-merged, or mis-routed.

The founder will only dispatch fix agents AFTER your verification clears. If you let an error through, the founder builds Kova on a flawed plan. Do not be lazy. Do not skip findings because they look minor. **Verify every single source-report finding has a corresponding consolidated row or merged-row, with correct cluster ownership, correct severity, and correct recommended fix.**

---

## 1. Source-of-truth file paths (read ALL of these)

| File | Lines | Role |
|---|---|---|
| `docs/kova-final-qa/CONSOLIDATED-TRIAGE.md` | ~580 | The artifact you are verifying |
| `docs/kova-final-qa/findings/QA-A-findings.md` | 796 | Source 1 — PRD cross-consistency audit (24 findings) |
| `docs/kova-final-qa/findings/QA-B-findings.md` | 1364 | Source 2 — Implementation plan code + TDD audit (63 findings, one self-marked false-alarm) |
| `docs/kova-final-qa/findings/QA-C-findings.md` | 1123 | Source 3 — PRD↔plan reconciliation audit (86 findings) |
| `docs/kova-final-qa/README.md` | ~80 | Severity scale + frozen founder decisions list (16 locks) |
| `docs/kova-final-qa/QA-A-prd-consistency.md` | ~ | Original dispatch prompt for Agent A |
| `docs/kova-final-qa/QA-B-plan-code-tdd.md` | ~ | Original dispatch prompt for Agent B |
| `docs/kova-final-qa/QA-C-prd-plan-reconciliation.md` | ~ | Original dispatch prompt for Agent C |

Read each file in full. Do NOT skim. Do NOT trust the consolidator's executive summary — derive the inventory yourself.

---

## 2. Verification protocol (do every step, in order)

### Step 2.1 — Build raw finding inventory

For each of the 3 source reports, list every distinct finding ID + one-line summary:

```
# QA-A inventory
A-CRITICAL-1: <summary>
A-HIGH-1: <summary>
...
A-NOTE-3: <summary>
Total: 24
```

Same for QA-B (expect 62 valid + 1 author-self-flagged-false-alarm = 63 total) and QA-C (expect 86 across CRIT/HIGH/MED/LOW + per-pair-matrix LOW IDs).

**Important QA-C edge case:** the body of QA-C has "Findings" section with sequential CRITICAL/HIGH/MEDIUM/LOW headings (CRITICAL-1..4, HIGH-1..15, MEDIUM-1..31, plus a stub "LOW-1 through LOW-36 (consolidated for brevity)" section). The actual LOW IDs are in the "Per-pair coverage matrix" section at the top of the file, tagged `LOW-NN.M` where NN is cluster + M is sequence. Some MEDIUMs appear there too (`MEDIUM-NN.M`). Also, in the "Shared-resource ownership" matrix and "RLS policy stack" matrix, there are extra IDs (e.g., `MEDIUM-X.3`, `CRITICAL-X.1`) that are cross-cluster — these are easy to miss.

### Step 2.2 — Build consolidated inventory

Parse `CONSOLIDATED-TRIAGE.md` and extract every finding row from:
- The **Cross-agent overlap map** table (~24 CT-NNN merged-finding rows)
- Each **Cluster N** table (13 clusters)
- The **Cross-cluster findings** table

For each row, capture: `ID` / `Severity` / `Source` (which source-report IDs feed it) / `Cluster` / `Summary` / `Recommended Fix`.

### Step 2.3 — Lossless coverage check (the load-bearing step)

For EVERY finding ID from Step 2.1, verify it is one of:
1. **Listed in a cluster table** with its severity and source preserved (look for `A-MED2`, `B-CRIT7`, `C-LOW01.6`, etc., in Source column).
2. **Merged into a CT-NNN cross-agent row** (the cross-agent overlap map names which source IDs were merged).
3. **Explicitly deferred to NOTE / locked-decision section** (with rationale).
4. **Explicitly excluded as author-self-marked invalid** (only QA-B HIGH-18 qualifies; verify this exclusion).

If a finding from a source report does not appear in ANY of these locations → **YOU FOUND A GAP. Flag it as DROPPED.**

Run this check in both directions:
- **Source → consolidated:** every source finding must trace forward to consolidated.
- **Consolidated → source:** every consolidated row's `Source` column must trace back to a real source-report finding ID. If a consolidated row cites a source ID that doesn't exist in any source report, that's a **FABRICATED finding** (most-serious failure mode).

### Step 2.4 — Severity-correctness check

For each merged finding (CT-NNN row), verify the assigned severity = MAX(source severities). E.g., if A flagged CRITICAL + C flagged HIGH, merged severity must be CRITICAL. The consolidator stated "max-of-three rule" — verify it was applied consistently.

For each standalone finding, verify the consolidated severity matches the source. Severity downgrades without justification = **finding to flag.**

### Step 2.5 — Cluster-ownership check

For each finding, verify the cluster assignment matches the finding's actual scope:
- File-path-based findings: `Plan 01:1280` → must be in Cluster 01.
- PRD-based findings: `PRD 04 §X.Y` → must be in Cluster 04.
- Cross-cluster findings: must be in the Cross-cluster table (not in any single cluster).
- A finding can be in cluster + ALSO in cross-cluster table if it touches the cluster owner + 2+ consumers (e.g., CT-001 audit_log is owned by Cluster 11 but also affects 01/03/04/05).

If a Cluster 03 finding ends up in Cluster 04 (or vice-versa), flag as misplaced.

### Step 2.6 — Cluster row-count audit

For each cluster's `Findings count:` header line, verify the claimed count matches the actual data-row count in the table. The consolidator initially miscounted (used awk that included header rows). Verify counts now match.

For example, if Cluster 03 header says `Findings count: 22 (...)`, the table should have exactly 22 data rows (excluding the `| ID | Severity ...` header row and the `|---|---|...` separator row). Off-by-one OK in the negative direction (i.e., header says 22, actual 22 ✓); off in the positive direction is a discrepancy.

### Step 2.7 — Severity-total sanity check

Verify the top-of-doc severity table:

```
| CRITICAL | 19 |
| HIGH     | 36 |
| MEDIUM   | 56 |
| LOW      | 41 |
| NOTE     |  6 |
| Total    | 158 |
```

Add up per-cluster severity breakdown across ALL 13 clusters + cross-cluster table. The sum may exceed 158 because cross-cluster findings (CT-NNN) appear in both their owner cluster AND in the cross-cluster table. The TRUE unique count is what matters — verify it's 158 by dedup-counting unique finding IDs.

### Step 2.8 — Recommended-fix sanity spot-check

For at least 20 findings (mix CRITICAL, HIGH, MEDIUM, LOW), open the source-report file and read the full finding entry. Verify:
- The consolidated `Recommended Fix` cell faithfully summarizes the source-report's recommendation.
- No critical detail (e.g., a code snippet, a specific endpoint name, a version constraint) was dropped silently.
- The fix is not stronger or weaker than what the source recommends.

If the fix in consolidated diverges from source without justification → flag.

### Step 2.9 — Dispatch-wave coverage check

Each finding should appear in EITHER:
- The **Wave 0 cross-cluster contracts** section (if it's a contract-affecting finding), OR
- A **Wave 1 / Wave 2 / Wave 3 / Wave 4 cluster-fix-agent row** (if it's a cluster-specific finding).

For each finding ID in the consolidated tables, grep the dispatch waves section for that ID. If a finding is in a cluster table but missing from any wave → **dispatch gap. Flag it.**

### Step 2.10 — Frozen-decision check

The 16 founder-frozen decisions in `docs/kova-final-qa/README.md` should NOT be challenged by any finding. Any finding tagged for action that would re-litigate a locked decision (Vue 3 Composition only, Pinia setup stores, valibot only, no React/Next.js/PixiJS, `e.code` not `e.key`, `crypto.getRandomValues()` not `Math.random()`, `structuredClone` for nested, `packages/core/` read-only except documented exceptions, Stripe foundation in MVP, image export not HTML, MEASUREMENT is page-level not NodeType, AI default tab in canvas, dark inside app + light outside, etc.) must be tagged NOTE (locked), not actionable.

If you find a CRITICAL/HIGH/MEDIUM/LOW finding that's actually re-litigating a locked decision → flag as **wrong-severity (should be NOTE).**

---

## 3. Output format (write to `findings/QA-VERIFY-findings.md`)

### Mandatory structure

```markdown
# QA-VERIFY: Verification of CONSOLIDATED-TRIAGE.md

**Verified file:** `docs/kova-final-qa/CONSOLIDATED-TRIAGE.md`
**Source reports verified against:** QA-A (24) + QA-B (63) + QA-C (86) = 173 raw
**Date:** YYYY-MM-DD
**Status:** PASS / PASS WITH WARNINGS / FAIL — DO NOT DISPATCH FIXES

---

## Verdict

One paragraph. Did the consolidation correctly capture all source findings? Are severity/cluster/fix-recommendation assignments accurate? Is the doc safe to use for fix-agent dispatch?

---

## Severity totals reconciliation

| Severity | Source-report sum | Consolidated claim | Verified actual | Match? |
|---|---|---|---|---|
| CRITICAL | 20 | 19 | <your count> | ✓/✗ |
| HIGH | 40 | 36 | <your count> | ✓/✗ |
| MEDIUM | 58 | 56 | <your count> | ✓/✗ |
| LOW | 49 | 41 | <your count> | ✓/✗ |
| NOTE | 6 | 6 | <your count> | ✓/✗ |
| **Total raw** | **173** | — | — | — |
| **Total dedup** | — | **158** | <your count> | ✓/✗ |

(Note: source-sum > consolidated because of cross-agent merges. Your verified actual count should equal the consolidated claim.)

---

## Per-cluster row-count audit

| Cluster | Header claim | Actual data rows | Match? |
|---|---|---|---|
| 01 | 17 | <count> | ✓/✗ |
| 02 | 25 | <count> | ✓/✗ |
| 03 | 22 | <count> | ✓/✗ |
| 04 | 19 | <count> | ✓/✗ |
| ... | ... | ... | ... |
| Cross-cluster | <claim> | <count> | ✓/✗ |

---

## Findings dropped from consolidation (CRITICAL FAILURE if any)

If you find any source-report finding that has no trace in CONSOLIDATED-TRIAGE.md, list it here:

```
- A-MED5 / QA-A line 372 — "Scope plan §3 Cluster 07 cites Q11 MEASUREMENT NodeType"
  Expected location: Cross-cluster CT-004 OR CT-016 OR Cluster 07a
  Actual: NOT FOUND
  Impact: Fix agent will not address; scope plan stays stale
- ...
```

Order by severity (CRITICAL first).

If none, write: "✓ NO FINDINGS DROPPED — all 173 raw source findings traced forward to consolidated."

---

## Findings fabricated (CRITICAL FAILURE if any)

If any consolidated row cites a source ID that does not exist in source reports:

```
- CT-NNN row cites `A-HIGH99` — no such finding in QA-A; QA-A has only A-HIGH-1 through A-HIGH-5
- ...
```

If none, write: "✓ NO FABRICATED FINDINGS — every consolidated source-ID maps to a real source-report entry."

---

## Severity-misclassification (HIGH if any)

For each finding where consolidated severity diverges from source MAX:

```
- CT-NNN (or single-source finding ID) — source severity HIGH, consolidated severity MEDIUM
  Justified by: <quote from consolidated, or "no justification given">
  Verdict: <accept / flag as silent downgrade>
```

---

## Cluster-misplacement (HIGH if any)

For each finding placed in the wrong cluster:

```
- B-MED10 placed in Cluster 02 — actual file `Plan 01:1740` should route to Cluster 01
```

---

## Dispatch-wave gaps (MEDIUM if any)

Findings in cluster tables but not present in any Wave dispatch row:

```
- C-MED-08.5 (Plan 08 use-keyboard.ts refactor TDD compression) — appears in Cluster 08 table but not in any wave dispatch list
```

---

## Recommended-fix divergences (MEDIUM if any)

For each spot-checked finding where the consolidated `Recommended Fix` materially diverges from the source:

```
- B-CRIT12 (Stripe webhook config) — source recommends "buffer-based reader + Stripe test webhook validation". Consolidated says only "buffer-based raw-body reader". Missing the Stripe-test-webhook validation step.
```

---

## Frozen-decision violations (CRITICAL if any)

For each actionable finding that re-litigates a locked founder decision:

```
- A-LOW3 PRD 11 §5.7 Tauri commands convention example
  Founder lock: noun-first (per CLAUDE.md / scope plan)
  Finding suggests: "pick one rule (recommend noun-first); align examples"
  Verdict: ✓ aligned with founder lock; not a re-litigation
- ...
```

---

## Pass-through verification (run these greps and report results)

```sh
# Verify every CT-NNN ID is referenced in at least one cluster table AND in cross-cluster table
grep -nE "^\| CT-[0-9]+" CONSOLIDATED-TRIAGE.md | wc -l   # should be ≥ 24 cluster mentions
grep -nE "^\| CT-[0-9]+ \| " CONSOLIDATED-TRIAGE.md  # extract every CT row

# Verify no `## Cluster XX` references a cluster that doesn't exist
grep -nE "^### Cluster [0-9]+" CONSOLIDATED-TRIAGE.md

# Verify every Wave dispatch row's finding IDs match cluster-table IDs
grep -A 100 "^### Wave 1" CONSOLIDATED-TRIAGE.md | head -50
```

Report any anomalies.

---

## Audit-trail correction section verification

The consolidator added an "Audit-trail correction (2026-05-19)" section near the bottom listing 9 findings that were initially missed and later added. Verify:

1. All 9 listed findings actually appear in the consolidated tables now (not just the correction section).
2. The 9 findings collectively raise the total from 149 → 158 (+9).
3. No additional findings were silently dropped between 149 → 158 (a hidden +X / -X swap).

If your full forward-and-backward trace produces total ≠ 158, document the discrepancy.

---

## Summary of issues found

| Type | Count | Severity |
|---|---|---|
| Dropped findings | <N> | CRITICAL if any |
| Fabricated findings | <N> | CRITICAL if any |
| Severity misclassifications | <N> | HIGH |
| Cluster misplacements | <N> | HIGH |
| Dispatch-wave gaps | <N> | MEDIUM |
| Recommended-fix divergences | <N> | MEDIUM |
| Frozen-decision violations | <N> | CRITICAL if any |
| Row-count header mismatches | <N> | LOW |
| Severity total mismatches | <N> | HIGH |

---

## Final recommendation

**PASS** — Safe to dispatch fix agents. Consolidation is exhaustive and accurate.

**OR**

**PASS WITH WARNINGS** — Safe to dispatch but founder should review the M issues flagged above (none are blockers, all are cosmetic).

**OR**

**FAIL — DO NOT DISPATCH** — N CRITICAL issues found:
1. <issue>
2. <issue>
   Founder must rectify before fix dispatch begins.

---

**End of QA-VERIFY-findings.md**
```

---

## 4. Hard rules (do not violate)

1. **Read the actual file content.** Do not infer from filenames. Do not skip any of the 3283 source-report lines.
2. **Do not edit any source file.** This is a read-only audit. Output only to `QA-VERIFY-findings.md`. If you find errors, they go in the findings report; the founder fixes them later.
3. **Do not invent new findings.** Your job is to verify what the consolidator captured, not to add new audit findings. (If you do notice an obvious additional gap that none of A/B/C caught, mention it in a separate "Bonus observations" section at the very bottom — but it is not your primary deliverable.)
4. **Do not re-litigate locked founder decisions.** The 16 freezes in `docs/kova-final-qa/README.md` are not subject to your audit. You may verify that consolidated findings respect the freezes.
5. **Be exhaustive, not selective.** Sampling 20 of 173 findings is NOT enough. The user explicitly asked for "not a single fricking error" missed. Trace every single source finding.
6. **Use grep where helpful, but read where decisive.** Grep catches presence/absence; reading catches semantic accuracy. Use both.
7. **If the consolidated doc is missing the source-reports reference block at the top → STOP and flag as CRITICAL.** The whole point of those references is to enable fix agents to look up evidence. Without them, fix dispatch is unsafe.

---

## 5. Hard prohibitions

- DO NOT mark a finding as "trivially the same" just because it's near another finding. Different file paths or different line numbers = different findings.
- DO NOT trust the consolidator's "Inconsistencies between source reports" section as exhaustive. Build your own from raw source-report inventory.
- DO NOT skip the LOW findings. The user explicitly asked: "not a SINGLE fix, whether it be high or low, was left unresolved." LOW findings count.
- DO NOT consolidate further. Your output is a verification report, not a re-consolidation. Document gaps; the founder decides whether to re-dispatch the consolidation step.
- DO NOT silently downgrade your own findings to make the verdict cleaner. If you find 1 CRITICAL gap, report 1 CRITICAL — even if everything else is fine.

---

## 6. After you finish

Reply to the founder (in chat) with:
- Path to your `QA-VERIFY-findings.md`
- Total line count
- Final verdict (PASS / PASS WITH WARNINGS / FAIL)
- Summary table of issue counts by type
- Top 3 most-severe issues found (or "no issues" if PASS)
- Estimated effort to remediate (in primary-session edits) before fix dispatch is safe

Under 400 words. Founder reads this first, then decides whether to dispatch fix agents or send corrections back to the primary session.

---

**Dispatch this prompt to a fresh Claude Code session.** No context inheritance. The session must work from a cold start using only the files referenced above.
