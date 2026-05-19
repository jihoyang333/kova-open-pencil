# Wave 1 — Cluster 11 (Shared UI Infrastructure) Fix Agent

**Status:** READY TO DISPATCH (paste into fresh Claude Code session)
**Prerequisite:** Wave 0 contracts must be merged first. Verify with `git log --oneline feat/m9-shopify | grep "Merge W0 contracts"` — must return a hit before you start. Current expected HEAD: `1c6daede` (or later if other waves landed).
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1/` — the INNER repo. Do NOT work in the outer `~/kova-main/` repo.
**Base branch:** `feat/m9-shopify` — branch off its CURRENT HEAD. Do NOT branch off `master` or `main`. The W0 work + all prior PRD/plan authoring lives on `feat/m9-shopify`, not on `master`.
**Worktrees:** FORBIDDEN. Do NOT run `git worktree add`. Do NOT spawn a worktree to "isolate" your work. Work directly in `kova-open-pencil-1/` on a new branch off `feat/m9-shopify`. The whole point of the cluster-isolation design is that your branch already isolates you.
**Branch to create:** `fix/qa-w1-cluster-11-shared-infra`
**Estimated wall-clock:** 1 day
**Output PR title:** `fix(qa-w1-cluster-11): ship audit_log + KovaIcon + verifyIdempotency hash + 12 other findings`

---

## Mission

You are the **Wave 1 Cluster 11 fix agent.** Cluster 11 ships shared infrastructure (idempotency keys, audit_log, error tracking, primitives like KovaIcon/KovaMenu/KovaModal, EmailShell, NetworkStatusIndicator, ToastStack). **Every downstream cluster depends on Cluster 11.** If your work is incomplete, Wave 2/3/4 dispatch will fail.

Your job: close **15 findings** in Cluster 11 (1 CRITICAL, 4 HIGH, 5 MEDIUM, 1 LOW, 4 NOTE) plus implement two contract resources Wave 0 specified (audit_log helper, KovaIcon primitive).

---

## Required reading (do this FIRST)

1. `kova-open-pencil-1/docs/kova-final-qa/CONSOLIDATED-TRIAGE.md` — read full **Cluster 11** section (header + table + cross-cluster findings affecting Cluster 11)
2. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-A-findings.md` — read A-MED3, A-LOW3
3. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-B-findings.md` — read B-HIGH13, B-MED18, B-NOTE3
4. `kova-open-pencil-1/docs/kova-final-qa/findings/QA-C-findings.md` — read HIGH-11, HIGH-12, MEDIUM-29, MEDIUM-30, MEDIUM-31, the CRITICAL-4 audit_log + idempotency_keys row in shared-resource ownership
5. `kova-open-pencil-1/docs/kova-final-qa/fix-dispatch/README.md` — frozen decisions (23 locks)
6. `kova-open-pencil-1/docs/kova-final-qa/fix-dispatch/FIX-W0-contracts.md` — what Wave 0 already specified (audit_log DDL, KovaIcon primitive, CI gates)
7. `kova-open-pencil-1/CLAUDE.md` — repo conventions
8. `kova-open-pencil-1/docs/kova-final-prds/11-shared-ui-infrastructure.md` (post-W0 state)
9. `kova-open-pencil-1/docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md` (post-W0 state)

---

## Findings to close (in this order)

### CRITICAL — implement audit_log first (CT-001 + CT-007 + CT-024 + C-HIGH12)

Order: ship the table + helper first; downstream consumers (other waves) cannot proceed without these.

1. **CT-001 audit_log table** — implement the migration spec'd by W0-1.
   - Author SQL migration file `supabase/migrations/YYYYMMDDHHMMSS_create_audit_log.sql`:
     ```sql
     CREATE TABLE public.audit_log (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       event_type text NOT NULL,
       payload jsonb NOT NULL DEFAULT '{}'::jsonb,
       cluster_owner text NOT NULL,
       created_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE INDEX idx_audit_log_user_id_created_at ON public.audit_log (user_id, created_at DESC);
     CREATE INDEX idx_audit_log_event_type ON public.audit_log (event_type);
     ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
     -- service_role only; authenticated users denied
     ```
   - Add tests: `tests/db/audit-log-rls.test.ts` — verify anonymous + authenticated cannot SELECT/INSERT; service_role can.
   - Author `api/_shared/audit.ts`:
     ```ts
     import type { SupabaseClient } from '@supabase/supabase-js'
     interface WriteAuditArgs {
       userId: string
       eventType: string
       payload?: Record<string, unknown>
       clusterOwner: string
     }
     export async function writeAudit(
       supabase: SupabaseClient,
       args: WriteAuditArgs
     ): Promise<void> {
       const { error } = await supabase
         .from('audit_log')
         .insert({
           user_id: args.userId,
           event_type: args.eventType,
           payload: args.payload ?? {},
           cluster_owner: args.clusterOwner,
         })
       if (error) {
         // Per PRD 11 §5.5 — log to Sentry but do not fail the caller
         console.error('[audit_log] write failed', { eventType: args.eventType, error })
         // TODO(pre-launch): Sentry.captureException(error) — gated by founder lock #14
       }
     }
     ```
   - Unit test `tests/api/audit-helper.test.ts` — verify happy path + Sentry breadcrumb-on-failure (mocked).

2. **CT-024 + B-CRIT14 v-html in `<EmptyState>` `renderHeadline()`** — Plan 11:2315.
   - Open the `<EmptyState>` template. Locate `<h5 v-html="renderHeadline()">`.
   - Audit `renderHeadline()` source. If it returns only locked copy strings (no user input), annotate with `// SAFE: only locked copy from i18n bundle` AND wrap inside DOMPurify-sanitized output OR switch to `<i18n-t>` interpolation.
   - Preferred fix: rewrite as `<h5>{{ headline }}</h5>` where `headline` is a computed `string` (no HTML). If markup is intentional (bold/em), use Vue `<i18n-t>` with named slots.
   - Add test that any future contributor adding user-derived content to `renderHeadline()` will fail.

---

### HIGH (4 findings)

3. **CT-003 KovaIcon primitive** — implement the component Wave 0 spec'd.
   - Author `src/components/KovaIcon.vue`:
     ```vue
     <script setup lang="ts">
     import { computed } from 'vue'
     // Static import map — keys derived at build time via unplugin-icons static analysis
     import IconLucideHome from '~icons/lucide/home'
     import IconLucideUser from '~icons/lucide/user'
     // ... import every icon used in the codebase
     const iconMap = {
       home: IconLucideHome,
       user: IconLucideUser,
       // ... map every name to its component
     } as const
     type IconName = keyof typeof iconMap
     const props = withDefaults(defineProps<{
       name: IconName
       size?: 'xs' | 'sm' | 'md' | 'lg'
       class?: string
     }>(), { size: 'sm' })
     const sizeClass = computed(() => ({
       xs: 'w-3 h-3',
       sm: 'w-4 h-4',
       md: 'w-5 h-5',
       lg: 'w-6 h-6',
     }[props.size]))
     const Component = computed(() => iconMap[props.name])
     </script>
     <template>
       <component :is="Component" :class="[sizeClass, $props.class]" />
     </template>
     ```
   - Run `bun run dev` and verify build succeeds. (unplugin-icons cannot resolve dynamic names; the static map sidesteps this.)
   - Note: The static-import list grows over time. Set up a `scripts/build-icon-map.ts` that scans `src/**/*.vue` for `<KovaIcon name="...">` usages and regenerates the map. Add as a `prebuild` step.
   - Tests: `tests/components/KovaIcon.test.ts` — verify each size class + that `<KovaIcon name="invalid-name">` produces a compile-time TypeScript error (via type-only test).

4. **C-HIGH11 verifyIdempotency hash semantics** — PRD 11 §4.1 column comment + §5.5 reference impl conflict.
   - PRD edit: drop the "sorted body keys" claim from the column comment at PRD 11:308. Replace with "sha256(method + path + bodyText) — callers MUST deterministically serialize JSON before sending."
   - Plan edit (already correct): `verifyIdempotency` hashes raw `bodyText`. Add a unit test that verifies two semantically-equivalent JSON requests with different key order produce DIFFERENT hashes (documenting the contract — clients must serialize deterministically).
   - Add helper docstring to `verifyIdempotency()` describing this requirement explicitly.

5. **C-HIGH12 + B-HIGH7-style `<EmptyState>` dynamic icon** — Plan 11:2313.
   - `<icon-lucide-:name="icon" />` is invalid. Replace with `<KovaIcon :name="icon" />` (from finding #3).

6. **CT-015 Resend env-guard Sentry breadcrumb** — Plan 11:578, 635-639 + Plan 12 callsite.
   - In `api/_shared/sendEmail.ts` (Plan 11 helper) and `api/_shared/resend-client.ts` (Plan 01 wrapper — coordinate via C-MED-X.3):
     ```ts
     if (!process.env.RESEND_API_KEY) {
       // Stub mode — log + breadcrumb so production divergence is visible
       console.warn('[resend] skipped — RESEND_API_KEY not set')
       // TODO(pre-launch §11): Sentry.captureMessage('resend_skipped_no_api_key', 'warning')
       return { id: 'stub', skipped: true }
     }
     ```
   - Verify the same pattern lands in any other Resend callsite (grep `RESEND_API_KEY` across `api/`).

---

### MEDIUM (5 findings)

7. **C-MED-11.3 `<EmailShell>` hardcoded prod domain** — Plan 11:2520.
   - Replace `https://kova.app/email/wordmark-light@2x.png` with `${process.env.PUBLIC_APP_URL ?? 'https://kova.app'}/email/wordmark-light@2x.png` (use `requireEnv('PUBLIC_APP_URL')` if env is required, or `??` fallback if optional).
   - Make the wordmark URL a prop with the env-fallback as default.

8. **C-MED-11.4 `{{settings_url}}` Vue parsing collision** — Plan 11:2523.
   - Vue compiler interprets `{{ ... }}` as template expression. Resend templates use the same syntax. Result: `{{settings_url}}` resolves to `undefined` at Vue render time, never reaches Resend.
   - Fix: escape Resend template vars from Vue. Use Vue's `v-pre` directive on the wrapping element:
     ```vue
     <div v-pre>{{settings_url}}</div>
     ```
     OR use a Vue string literal that yields the literal text:
     ```vue
     <div>{{ '{{settings_url}}' }}</div>
     ```
   - Test by rendering the `<EmailShell>` and asserting the literal `{{settings_url}}` substring is present in the output (not `undefined`).

9. **C-MED-11.5 `<NetworkStatusIndicator>` not mounted in App.vue** — Plan 11 Task 9.1.
   - Founder lock: Cluster 11 §3.7 retired sidebar offline `.net-strip`; single topbar icon is the canonical model.
   - Confirm with the consolidator's CT-020 row: PRD 02 §2.1/§3.7/§8.7 is updated by Wave 2 Cluster 02 to consume `<NetworkStatusIndicator>` from topbar.
   - Your job in Cluster 11: ensure `<NetworkStatusIndicator>` is mounted in `src/App.vue` (or alternatively in the Dashboard topbar component — coordinate with Cluster 02 fix agent — pick App.vue if no shared topbar exists yet).
   - Update Plan 11 Task 9.1 to explicitly include `<NetworkStatusIndicator>` mount, not just ToastStack + ConfirmModal.

10. **C-MED-11.6 M9 Realtime channel migration** — PRD 11 §12.5 KD-5.
    - Channel name `sync-progress-${brandId}` is non-conformant with `kova.{userId}.{domain}.{topic}` convention.
    - Add a Plan 11 migration task: rename channel to `kova.{userId}.shopify.{brandId}.sync`. Update all callers (grep `sync-progress` across the codebase, including PRD 04 + Plan 04 Shopify sync).
    - Document in PRD 11 §12.5 KD-5 closure entry.

11. **A-MED3 + B-MED18 idempotency_keys length CHECK** — Plan 11:157.
    - PRD 11 §12 OPEN QUESTIONS — close the 2 outstanding entries by tagging RESOLVED 2026-05-19 (founder ratifies inline during this fix).
    - Audit `length(key) >= 16 AND length(key) <= 64` CHECK constraint. Verify all callers (Plan 09 + Plan 10) generate keys within this range. If any caller uses short keys (e.g., `crypto.randomUUID()` slugged), add a test that exercises the CHECK.

---

### LOW (1 finding)

12. **B-LOW5 + A-LOW3 Tauri command convention** — Plan 11 + PRD 11 §5.7.
    - PRD 11 §5.7 says "verb-first preferred" but examples are noun-first. Pick noun-first (per founder lock memory; consistent with Tauri convention). Update PRD §5.7 prose to "noun-first preferred" + align all examples.
    - B-LOW5: Plan 11 has `TODO(pre-launch §11)` scattered throughout Sentry/Resend/Cron stubs. Add a single `docs/operator-runbook.md` (or similar) with the pre-launch activation checklist. Reference from PRD 11 §11.

---

### NOTE — verify, do not fix (4 findings)

13. **B-NOTE3 + B-LOW5** — Sentry/Resend/Cron stubs per founder lock #14. Verify each stub follows the pattern: env-guard + console-warn + TODO(pre-launch). No code change needed.

14. **CT-021 — `/brands` + `/account/brands` route coordination.** Verify the documentation in scope plan §6 (added in W0-3) covers the lockstep ordering. No code change in Cluster 11.

15. Other NOTE entries from cross-cluster table — re-read, confirm intent preserved.

---

## TDD discipline per finding

For each finding (not just critical/high):

1. **RED:** Write a test that fails because the bug is present.
2. **GREEN:** Apply the minimum code change to make the test pass.
3. **REFACTOR:** Clean up.
4. **COMMIT:** One commit per finding. Format: `fix(11): <finding-id> <short>`.

Use bun:test patterns. NEVER `jest.mock` / `vi.mock` (W0-6 gate).

---

## Cross-cluster coordination

- **CT-001 audit_log** — your responsibility (Cluster 11 owner). Once shipped, Wave 1 Cluster 01+12 agent + Wave 2 03/04/05 + Wave 4 09/10 agents can consume `writeAudit()`.
- **CT-003 KovaIcon** — your responsibility (Cluster 11 owner). Once shipped, all consumer clusters refactor to `<KovaIcon>`.
- **CT-015 Resend breadcrumb** — your responsibility (Cluster 11 + Cluster 12 share). Coordinate with Cluster 12 agent if Wave 1 dispatch overlaps.
- **C-MED-X.3 Resend two-runtime ownership** — your responsibility. Document in PRD 11 §11 cross-cuts: "Cluster 11 ships `api/_shared/sendEmail.ts` for Vercel Functions; Cluster 01 ships `supabase/functions/_shared/resend-client.ts` for Supabase Edge Functions. Both use the same Resend API key + same `{ idempotencyKey }` signature."

---

## Output report (paste back to founder when done)

```markdown
## Wave 1 Cluster 11 — Fix Agent Report

**Branch:** fix/qa-w1-cluster-11-shared-infra
**Commits:** N

### Findings closed (15 total)
- [x] CT-001 audit_log table + writeAudit() — commit <hash>
- [x] CT-024/B-CRIT14 v-html in EmptyState — commit <hash>
- [x] CT-003 KovaIcon primitive — commit <hash>
- [x] C-HIGH11 verifyIdempotency hash docstring + tests — commit <hash>
- [x] C-HIGH12 EmptyState dynamic icon migration — commit <hash>
- [x] CT-015 Resend env-guard breadcrumb — commit <hash>
- [x] C-MED-11.3 EmailShell wordmark URL via env — commit <hash>
- [x] C-MED-11.4 Resend template var v-pre escape — commit <hash>
- [x] C-MED-11.5 NetworkStatusIndicator mount — commit <hash>
- [x] C-MED-11.6 Realtime channel migration — commit <hash>
- [x] A-MED3 + B-MED18 idempotency_keys §12 closures + CHECK audit — commit <hash>
- [x] B-LOW5 + A-LOW3 Tauri convention + pre-launch checklist — commit <hash>
- [x] B-NOTE3 stubs verified — no change
- [x] CT-021 route coordination verified — no change
- [x] Other NOTE entries verified — no change

### Tests added/modified
- `tests/db/audit-log-rls.test.ts`
- `tests/api/audit-helper.test.ts`
- `tests/components/KovaIcon.test.ts`
- ...

### Migrations shipped
- `supabase/migrations/YYYYMMDDHHMMSS_create_audit_log.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_rename_realtime_channel.sql`

### Quality gates
- [x] `bun run check` passes
- [x] `bun run test:unit` passes (audit_log RLS test + KovaIcon test + verifyIdempotency test green)
- [x] CI gates from W0-5 + W0-6 + W0-9 still pass
- [x] No `as any` introduced
- [x] No `process.env.X!` introduced

### Blockers (if any)
None / list any blocked findings + reason.

### Downstream agents may now consume
- `audit_log` table + `writeAudit()` helper at `api/_shared/audit.ts`
- `<KovaIcon name="...">` primitive at `src/components/KovaIcon.vue`
- `<NetworkStatusIndicator>` mounted in App.vue (Cluster 02 may also surface in topbar)
- `verifyIdempotency()` helper documented with deterministic-serialization contract
```

---

## Hard rules

1. **Edit only Cluster 11 files** + the shared migrations. Do NOT edit other cluster plans/PRDs (Wave 0 already wrote cross-refs).
2. **Do NOT skip the audit_log migration.** It is the blocking dependency for 4 downstream agents.
3. **Do NOT use `jest.mock` / `vi.mock`.** Use bun:test `mock.module` / `mock()`.
4. **Do NOT introduce `as any` or `process.env.X!`.** Use the `requireEnv` helper.
5. **Do NOT modify `packages/core/`.**
6. **If any test fails, fix the test or the impl — never skip.** Green is mandatory before commit.

---

## When done

Push branch + open PR. Reply to founder with output report.

---

**End of W1 Cluster 11 dispatch prompt.**
