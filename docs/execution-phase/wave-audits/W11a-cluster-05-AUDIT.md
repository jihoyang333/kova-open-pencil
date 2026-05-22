# W11a — Cluster 05 (Brand Kit + Drag/Drop) AUDIT Prompt

**Wave:** W11a
**Cluster:** 05 — Brand Kit panel + drag-drop wiring (4 MIME types per Q24) + 5 brand-kit RPCs + enqueueBrandKitExtract
**Audit type:** Drag-drop semantics + DB security (5 SECURITY DEFINER RPCs per CT-013) + UI.
**Status:** ready after W11a DONE (after Cluster 06 merged)
**Prerequisites:** Branch `app/cluster-05-brand-kit` (worktree `/Users/jihoyang/kova-build-c05`). DONE at `cluster-reports/W11a-cluster-05-DONE.md`. Cluster 06 merged.

---

## Founder pre-flight

1. W11a printed DONE
2. Cluster 06 merged into feat/m9-shopify (canvas chrome dependency)
3. Local Supabase available

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W11a AUDIT agent for Kova. Independent reviewer for
Cluster 05 — Brand Kit + drag-drop.

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W11a-cluster-05-brand-kit.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/05-brand-kit-and-drag-drop.md
6. docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md
7. docs/execution-phase/cluster-reports/W11a-cluster-05-DONE.md
8. CLAUDE.md root + outer
9. ~/.claude/rules/common/security.md

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. database-reviewer — 5 brand-kit RPCs (per W5a CT-013): verify
   inline RPC bodies have SET search_path = public, pg_temp OR
   T8 RLS test asserts every PRD §4.1 RPC has search_path lock
3. vue-expert — drag-drop reactivity, panel state

## Conditional subagents

- security-auditor — if RPC bodies non-trivial
- e2e-runner — re-run drag color → canvas fill applied; drag saved
  block → canvas TEXT node created with content pre-filled

## Cluster 05 expected scope

ALLOWED:
- supabase/migrations/*.sql — 5 brand-kit RPCs (create / update /
  delete / list color + font + logo + saved-block per PRD)
- src/components/canvas/assets/* — BrandKitPanel + Colors / Fonts /
  Logo / SavedBlocks lists with drag handles
- src/composables/useBrandKitDrag.ts (or equivalent — DataTransfer
  payload construction per MIME type)
- src/composables/useCanvasDrop.ts — drop handler that spawns
  scene-graph nodes from payloads
- src/services/enqueueBrandKitExtract.ts (Cluster 02 consumes per
  C-MED7)
- src/stores/brandKit.ts
- tests/* — drag-drop unit tests with DataTransfer mock + RPC
  integration

FORBIDDEN:
- packages/core/** — CRITICAL (scene-graph node creation goes
  through figma.* API only, not direct mutation)
- Cluster 06 canvas chrome (only consume, not modify)
- Cluster 03 brand schema (Cluster 05 reads brand kit data; Cluster
  03 owns CRUD modals)

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-05-brand-kit
  git diff --stat feat/m9-shopify...app/cluster-05-brand-kit

One-per-task. Conventional commits.

### B. 4 MIME types (Q24 founder spec)

Verify EXACTLY these MIME types defined as constants and used in
DataTransfer.setData / getData:
- application/x-kova-color-token
- application/x-kova-font-token
- application/x-kova-logo-asset
- application/x-kova-saved-block

Grep:

  git grep -n 'x-kova' src/ supabase/ tests/

Each MIME type must appear in:
1. The drag-source code that calls setData
2. The drop-target code that calls getData
3. At least one test verifying the round-trip

Missing MIME type = HIGH. Wrong format (typo, x-kova-color vs
x-kova-color-token) = HIGH.

### C. Drop handler (use-canvas-drop.ts)

Open the drop handler. Verify per payload type:
- color-token → applies as fill on selected node OR creates new
  shape with fill (per PRD)
- font-token → applies as font on selected TEXT node OR creates
  new TEXT
- logo-asset → creates IMAGE node positioned at drop point
- saved-block → spawns TEXT node with content pre-filled from
  payload

Verify:
- Snap-on-drop visual feedback fires before drop (Figma
  drag-and-snap pattern)
- Payload validated before mutating scene graph (malformed payload
  = no-op + console.warn or toast)
- Drop coordinates translated to canvas-space (NOT screen-space)
  via Cluster 06 canvas transform composable

### D. 5 SECURITY DEFINER RPCs (W5a CT-013)

Open each migration. Per RPC verify EITHER:
(a) Inline body has SET search_path = public, pg_temp, OR
(b) T8 test asserts every PRD §4.1 RPC has search_path = public,
    pg_temp via pg_proc query

Whichever Plan 05 §6 task spec mandates — verify the chosen
strategy is consistent across all 5 RPCs.

Also verify:
- LANGUAGE plpgsql or sql
- Ownership check inside body (auth.uid() ownership of the brand
  the kit belongs to)
- No dynamic SQL via EXECUTE concat
- Returns shape matches PRD §4.1 spec

### E. enqueueBrandKitExtract (Cluster 02 contract per C-MED7)

- Function exists + exported for Cluster 02 consumption
- Triggers brand-kit extraction job (background Edge Fn or
  similar)
- Idempotent: re-calling for same brand_id is safe (no duplicate
  jobs)
- audit_log entry on enqueue

### F. Saved blocks (Q8 founder lock 2026-04-25)

- Saved-block payload schema includes `content` field (text +
  formatting metadata)
- Drop creates TEXT node with content pre-filled — verify with
  unit test
- JSONB shape on brands.saved_blocks matches Cluster 03's schema
  (cross-cluster consistency — no schema drift)

### G. Design-system compliance

  git diff feat/m9-shopify...app/cluster-05-brand-kit -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg|<icon-lucide-'

Any hit = CRITICAL.

Verify:
- Brand Kit panel = .panel.assets pattern
- Drag handles = .drag-handle icon (KovaIcon name e.g. 'grip-vertical')
- Token rows = .token-row variants (color swatch / font preview /
  logo thumb / block preview) — existing patterns
- Snap visual = existing .snap-target / .snap-line patterns from
  Cluster 06 canvas chrome (do NOT reinvent)
- Zero new tokens

### H. Visual fidelity

- KOVA_AUDIT.md + tokens-used.md at cluster-audits/cluster-05-*
- 3-screenshot artifact per surface
- Playwright visual-diff thresholds enforced
- drag-and-snap-firing.png reference matches impl visually

### I. Cross-cluster contracts

- Cluster 02: enqueueBrandKitExtract consumed by onboarding (per
  C-MED7)
- Cluster 03: brand-kit data SHAPE — verify Cluster 05 reads from
  the same JSONB schema Cluster 03 defines
- Cluster 06: canvas chrome assets-panel slot consumed; canvas
  transform composable consumed
- Cluster 07a: scene-graph node creation via figma.createText /
  createRectangle / createImage — NEVER direct mutation
- Cluster 11: KovaIcon, KovaToast (drop errors), KovaModal

### J. Quality gates (re-run)

  bun install
  bun run build / check / test:unit / test:dupes
  supabase migration up --local

### K. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-05-brand-kit. Focus: 4 MIME
  types exact match (Q24), drop-handler scene-graph node creation
  via figma.* API (no direct mutation), 5 SECURITY DEFINER RPCs
  (CT-013 inline OR T8 assertion), saved-block content pre-fill,
  design-system compliance. CLAUDE.md hard constraints.
  CRITICAL/HIGH/MEDIUM/LOW."

### L. Plan task completion + Done-report accuracy

Walk Plan 05 §6 task-by-task. Spot-check 5 DONE claims.

## Output

  docs/execution-phase/wave-audits/reports/W11a-cluster-05-AUDIT-REPORT.md

Format per W7 template. Include "MIME type registry", "RPC
search_path audit", "Drop-handler scene-graph mutation
discipline" sections.

Print:
  "W11a AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W11a-cluster-05-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 60-90 min. Token spend: $80-140.**
