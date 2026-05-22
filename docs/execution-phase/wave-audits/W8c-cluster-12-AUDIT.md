# W8c — Cluster 12 (Settings + User Preferences) AUDIT Prompt

**Wave:** W8c
**Cluster:** 12 — user_preferences JSONB, Settings modal/page, send-sync-alert Edge Fn
**Audit type:** Standard UI + DB. Founder-lock heavy (text_size, high_contrast, recent_colors FIFO, showTextSuggestions reserved, A8.3 modal triggers).
**Status:** ready after W8c DONE
**Prerequisites:** Branch `app/cluster-12-settings` exists (worktree). DONE report at `cluster-reports/W8c-cluster-12-DONE.md`.

---

## Founder pre-flight

1. W8c agent printed DONE
2. Branch pushed
3. Sibling W8 clusters can still be running

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W8c AUDIT agent for Kova. Independent reviewer for
Cluster 12 — settings + user preferences.

You are READ-ONLY. Run gates + write report. Surface CRITICAL via
AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W8c-cluster-12-settings.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/12-settings-and-user-preferences.md
6. docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md
7. docs/execution-phase/cluster-reports/W8c-cluster-12-DONE.md
8. CLAUDE.md root + outer
9. ~/.claude/rules/common/coding-style.md
10. ~/.claude/rules/common/security.md

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. database-reviewer — user_preferences JSONB migration (schema
   shape, default value, GIN index if queried, RLS)

## Conditional subagents

- vue-expert — settings Vue surfaces
- e2e-runner — re-verify Settings modal triggers (App menu / Cmd+,
  / Profile dropdown)
- security-auditor — only if Edge Fn touches secrets

## Cluster 12 expected scope (per PRD 12 founder locks 2026-05-17)

ALLOWED:
- supabase/migrations/<ts>_user_preferences.sql — JSONB column on
  users
- supabase/functions/send-sync-alert/* — Task 16 per PRD 12 founder
  lock (Resend env-guarded stub per project_external_accounts_deferred)
- src/views/settings/* — Settings page
- src/components/settings/* — SettingsModal, preference controls
- src/stores/preferences.ts — Pinia store
- src/router/* — settings route + modal trigger wiring
- src/composables/usePreferences.ts (or equivalent)
- tests/*

FORBIDDEN:
- packages/core/** — CRITICAL violation
- Any auth flow change (Cluster 01)
- Any Stripe surface (Cluster 04)
- Canvas surfaces

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-12-settings
  git diff --stat feat/m9-shopify...app/cluster-12-settings

Verify one-per-task commits + conventional format.

### B. Founder-locked preference values (per PRD 12 + project memory)

Open the preferences store + Vue components + migration. Verify
EXACTLY:
- text_size: enum / select supports 87.5%, 100%, 112.5% (no other
  values; no continuous slider)
- high_contrast: boolean → applies BORDERS-ONLY mode (NOT full
  high-contrast color inversion). Verify the CSS toggle applies
  border outlines, does NOT alter background/foreground colors
- recent_colors: array max length 12, FIFO eviction on add (oldest
  drops when 13th added). Verify with a unit test (color1..color13
  → color1 evicted)
- showTextSuggestions: present in schema but UI is RESERVED OFF —
  toggle hidden or disabled with explanatory tooltip per PRD 12

Any deviation = HIGH.

### C. A8.3 modal triggers (per PRD 12 founder lock)

Verify ALL THREE triggers wire to the Settings modal:
1. App menu → Settings
2. Cmd+, keyboard shortcut (use e.code === 'Comma' with metaKey,
   NOT e.key per CLAUDE.md root §"Keyboard shortcuts")
3. Profile dropdown → Settings

Missing trigger = HIGH. Wrong key handler (e.key instead of
e.code) = MEDIUM.

### D. send-sync-alert Edge Fn (Task 16)

- Edge Fn exists at supabase/functions/send-sync-alert/
- Env-guarded: skips sending if RESEND_API_KEY unset (per
  project_external_accounts_deferred memory)
- Stub uses identical interface to the real Resend SDK so swap-in
  pre-launch is 1-line change
- audit_log insert per send attempt (success and skip)
- Auth-gated: caller must be authenticated; only triggers on
  Cluster 01 / Cluster 10 sync events
- No hardcoded recipient list (recipient derived from auth.uid()
  email)

### E. user_preferences JSONB migration

Open the migration. Verify:
- Column added with DEFAULT '{}'::jsonb (or matching shape default)
- No NOT NULL constraint that would break existing rows on rollout
  (or backfill is included)
- RLS: existing users-table policies cover this column (no policy
  bypass)
- No GIN index unless preferences are queried by inner key (likely
  NOT queried — column is read whole)

database-reviewer agent runs the deeper sweep.

### F. Design-system compliance

  git diff feat/m9-shopify...app/cluster-12-settings -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg'

Any hit = CRITICAL.

Verify:
- Settings page uses dark theme (kova-hifi.css)
- Preference controls = existing .input / .btn / .toggle /
  .segmented Cluster 11 primitives (NO new tokens introduced per
  execution prompt)
- Recent colors row = existing color-swatch pattern (NO new swatch
  component)
- KovaIcon for all icons
- Zero new tokens added to design system

### G. Settings modal vs Settings page

PRD 12 may specify both a modal trigger AND a full-page settings
surface. Verify:
- Modal (triggered per A8.3) renders preference quick-access
- Full-page route /settings (if specified by PRD) renders all
  sections matching A7 hi-fi preferences sub-tab

Cross-link to Account page (Cluster 04) verified — no duplicate
DangerZoneCard implementation.

### H. Persistence + hydration

Verify:
- Changes persist to user_preferences JSONB via Supabase update
- On app load, preferences hydrated into Pinia store before first
  render (no flash of default values)
- text_size applies globally via root font-size (or CSS variable)
- high_contrast applies via body class toggle
- recent_colors hydrates into the color-picker (Cluster 11
  primitive consumes the array)

### I. Cross-cluster contracts

- Cluster 11: Preferences store may be consumed by canvas
  components (color picker, text size scale). Verify the store
  exports a clean public API.
- Cluster 01: send-sync-alert fires on sync events from auth /
  Shopify (verify the event subscription is documented even if
  not wired yet — Cluster 01 may not have shipped this contract
  yet; mark as MEDIUM if both clusters expect each other to wire
  the bridge)

### J. Quality gates (re-run)

  bun install
  bun run build / check / test:unit / test:dupes
  supabase migration up --local

Compare to DONE-report.

### K. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-12-settings. Focus:
  user_preferences JSONB shape vs PRD 12 founder locks (text_size
  enum, high_contrast borders-only, recent_colors FIFO 12,
  showTextSuggestions reserved), Settings modal trigger wiring
  (App menu / Cmd+, / Profile dropdown), send-sync-alert
  env-guarded stub, design-system compliance (no new tokens),
  CLAUDE.md hard constraints. Return CRITICAL/HIGH/MEDIUM/LOW."

### L. Plan task completion matrix + Done-report accuracy

Walk Plan 12 §6 task-by-task. Verify each commit. Spot-check 5
DONE claims.

## Output

  docs/execution-phase/wave-audits/reports/W8c-cluster-12-AUDIT-REPORT.md

Format per W7/W8a template. Include "Founder-lock compliance"
section enumerating each of the 17 TDD tasks (per PRD 12) +
their status.

Print:
  "W8c AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W8c-cluster-12-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 45-75 min. Token spend: $60-100.**
