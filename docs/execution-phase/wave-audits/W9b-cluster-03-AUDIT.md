# W9b — Cluster 03 (Brand Management) AUDIT Prompt

**Wave:** W9b
**Cluster:** 03 — Brand CRUD, 7 SECURITY DEFINER RPCs, Brand Kit settings sub-tabs, archive/restore (B12 reversal), DOMPurify input sanitization
**Audit type:** Database security (SECURITY DEFINER) + XSS (DOMPurify) + UI. Compliance-critical (B-CRIT14 XSS lock, B12 reversal restore semantics).
**Status:** ready after W9b DONE (after W9a Cluster 02 merged)
**Prerequisites:** Branch `app/cluster-03-brand-mgmt`. DONE at `cluster-reports/W9b-cluster-03-DONE.md`. W9a merged into feat/m9-shopify.

---

## Founder pre-flight

1. W9b printed DONE
2. Cluster 02 merged (routing canonical depends on it)
3. Local Supabase available for RPC replay

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W9b AUDIT agent for Kova. Independent reviewer for
Cluster 03 — brand management. Database security and XSS sensitive.

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W9b-cluster-03-brand-mgmt.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/03-brand-management.md
6. docs/kova-final-impl-plans/03-brand-management-plan.md
7. docs/execution-phase/cluster-reports/W9b-cluster-03-DONE.md
8. docs/kova-final-prds/00f-B12_REVERSAL_DISPATCH.md (B12 reversal
   context for archive/restore semantics)
9. CLAUDE.md root + outer
10. ~/.claude/rules/common/security.md
11. ~/.claude/rules/common/coding-style.md

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion
3. security-review

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. database-reviewer — DEEP review of 7 SECURITY DEFINER RPCs
   (create_brand, update_brand, delete_brand, archive_brand,
   restore_brand REAL, list_brands, soft_delete_brand). Verify
   SET search_path = public, pg_temp; SECURITY DEFINER scope
   minimization; auth.uid() ownership check inside RPC body;
   parameterized SQL only.
3. vue-expert — BrandModal (Reka Dialog), Brand Kit forms, Archive
   list. XSS sanitization via DOMPurify per B-CRIT14.

## Conditional subagents

- security-auditor — if RPC bodies look complex or non-trivial
- e2e-runner — re-run create → edit → archive → restore → delete +
  XSS regression test (paste <script> into brand name and verify
  sanitization)

## Cluster 03 expected scope

ALLOWED:
- supabase/migrations/*.sql — brand soft-delete + archived flag +
  restore audit columns
- supabase/migrations/*.sql — 7 SECURITY DEFINER RPCs
- src/views/account/BrandsView.vue (/account/brands per B12)
- src/components/brand/BrandModal.vue (Reka Dialog — create / edit
  / delete confirmation)
- src/components/brand/BrandKit*.vue — Colors / Fonts / Logo /
  Tone snippets / Saved blocks (within Account page sub-tab)
- src/composables/useBrand.ts (or equivalent)
- src/stores/brand.ts
- src/utils/sanitize.ts (DOMPurify wrapper per B-CRIT14)
- tests/* — RPC integration + Vue unit + XSS regression

FORBIDDEN:
- packages/core/** — CRITICAL violation
- Cluster 05 drag/drop wire (color/font drag is Cluster 05's
  payload scope per Q24)
- Auth Edge Fns / Stripe surfaces

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-03-brand-mgmt
  git diff --stat feat/m9-shopify...app/cluster-03-brand-mgmt

One-per-task. Conventional commits.

### B. 7 SECURITY DEFINER RPCs

Open each migration. Per RPC verify:
- LANGUAGE plpgsql (or sql with care)
- SECURITY DEFINER declared
- SET search_path = public, pg_temp (CRITICAL — without this,
  search_path hijack possible)
- Ownership check inside body: WHERE owner_id = auth.uid() OR
  equivalent — NOT just relying on RLS (DEFINER bypasses RLS by
  design)
- No dynamic SQL via EXECUTE concat; use parameterized $1, $2, ...
- restore_brand is REAL (not a stub returning success per B12
  reversal — must restore the row, clear archived_at, audit_log
  insert)
- soft_delete_brand sets deleted_at, NOT DELETE FROM
- delete_brand (hard delete) only callable when row already
  soft-deleted past grace period
- list_brands honors archived flag + ownership

Each missing search_path / ownership check / parameterization =
CRITICAL.

### C. DOMPurify XSS sanitization (B-CRIT14)

Verify EVERY user-input field is sanitized via DOMPurify before
storage AND/OR before render:
- Brand name
- Brand description (if HTML allowed)
- Tone snippet text (JSONB on brands per Q8 — verify each element
  sanitized)
- Saved block content (JSONB per Q8 — verify each sanitized)

Sanitization location: prefer client-side BEFORE store + re-verify
server-side OR sanitize on display only (XSS-safe). Verify the
strategy is consistent.

Grep for unsafe patterns:
  git diff feat/m9-shopify...app/cluster-03-brand-mgmt | grep -nE \
    'v-html|innerHTML|dangerouslySetInnerHTML'

Any v-html usage = HIGH unless paired with DOMPurify call upstream.

### D. JSONB columns (Q8 founder lock 2026-04-25)

Tone snippets + saved blocks are JSONB on brands table per Q8.
Verify:
- Schema cap enforced (per project_prd10_decisions memory:
  tone-snippets max 10 / saved-blocks ≤ some PRD-defined cap)
- Insert/update RPC enforces cap (rejects with descriptive error
  when exceeded)
- DOMPurify applied to each entry before persistence

### E. ArchiveView + B12 reversal (per 00f-B12_REVERSAL_DISPATCH)

- Route /account/brands exists (per B12 reversal)
- Segmented filter (active / archived / all) per B12
- BRANDS_RESTORE_ENABLED feature flag honored — if false, restore
  button hidden / disabled
- Restore button calls restore_brand RPC (REAL, not stub) —
  verify with database-reviewer agent

### F. BrandModal (Reka Dialog)

- Composes Reka Dialog (NOT raw <dialog>)
- 3 modes: create / edit / delete-confirm
- Delete-confirm requires type-to-confirm or 2-click pattern per
  Kova destructive confirm convention (.dlg.md = 540px or .dlg.lg
  = 880px for Brand Kit CRUD per hi-fi)
- Form input sanitized via DOMPurify before RPC call
- Loading state during RPC; error state surfaced via toast

### G. Brand Kit sub-tabs (within Account page cross-link from
Cluster 04)

5 sub-tabs: Colors / Fonts / Logo / Tone snippets / Saved blocks.

Per sub-tab verify:
- Renders within Account page Brand Kit cross-link (does NOT
  duplicate Account chrome — Cluster 04 owns Account chrome)
- Colors / Fonts swatches use existing patterns from hi-fi
- Color drag payload schema documented for Cluster 05 (Q24 — drag
  wire is Cluster 05's scope; payload SHAPE must be defined here)
- Logo upload reuses Avatar cropper pattern from Cluster 04 (or
  documents why divergent)
- Tone snippets + Saved blocks: caps enforced UI-side; descriptive
  error when at cap

### H. Design-system compliance

  git diff feat/m9-shopify...app/cluster-03-brand-mgmt -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg'

Any hit = CRITICAL.

Verify:
- Dark theme everywhere
- KovaIcon for icons
- Reka Dialog wrappers (KovaModal from Cluster 11)
- No new tokens

### I. Visual fidelity

- KOVA_AUDIT.md + tokens-used.md at cluster-audits/cluster-03-*
- Per-surface diff files + 3-screenshot artifacts under
  tests/snapshots/cluster-03/
- Playwright visual-diff 0.1% / 0.5% enforced

### J. Cross-cluster contracts

- Cluster 02: routing canonical /brand/:brandId (consumed for
  brand-card-click → canvas redirect)
- Cluster 04: Account page Brand Kit sub-tab cross-link — verify
  the components are exposed for Account to import (not embedded
  into a duplicate Account chrome)
- Cluster 05: drag/drop payload schema documented (color hex, font
  family, etc.) — verify the schema exists somewhere consumable
- Cluster 11: KovaModal, KovaInput, KovaButton, KovaToast consumed

### K. Hard-constraint grep + quality gates

  bun install
  bun run build / check / test:unit / test:dupes
  supabase migration up --local

### L. Code-review sweep

Spawn superpowers:code-reviewer:
  "Audit feat/m9-shopify...app/cluster-03-brand-mgmt. Focus: 7
  SECURITY DEFINER RPCs (search_path lock, ownership check,
  parameterization), DOMPurify XSS sanitization (B-CRIT14) on all
  user-input fields, JSONB cap enforcement (Q8), B12 reversal
  semantics (restore_brand REAL), Vue surfaces design-system
  compliance, CLAUDE.md hard constraints.
  CRITICAL/HIGH/MEDIUM/LOW."

### M. Plan task + W2 findings closure

Plan 03 §6 task-by-task verified. Per execution prompt: "22 W2
findings already resolved" — verify the closure list is referenced
in DONE report and each fix lands somewhere in the diff.

W5a B-MED17 mock.module fix verified at Plan 03:2418 pattern.

### N. Done-report accuracy

Spot-check 5 random claims.

## Output

  docs/execution-phase/wave-audits/reports/W9b-cluster-03-AUDIT-REPORT.md

Format per W7 template. Include separate sections: "SECURITY
DEFINER RPC review", "XSS sanitization", "B12 reversal compliance".

Print:
  "W9b AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W9b-cluster-03-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 60-90 min. Token spend: $80-150.**
