# M3 Onboarding Wizard — Full Verification Audit

Paste this into a fresh Claude Code session from the `kova-main/` directory.

---

## Prompt

We're building Kova, an AI-powered email design SaaS. M3 (Onboarding Wizard) implementation is complete on branch `m3-onboarding-wizard`. I need you to run a comprehensive verification audit using every checking tool available before we merge to main.

**Do NOT write any code or make any changes.** This is a read-only audit. Report findings only.

### What M3 includes

Branch `m3-onboarding-wizard` has ~18k lines changed across 206 files (vs `master`). Key areas:

**Onboarding UI (7 screens):**
- `src/views/OnboardingView.vue` — split-screen shell (38% light / 62% dark)
- `src/components/onboarding/WelcomeStep.vue` — Screen 1
- `src/components/onboarding/NameStep.vue` — Screen 2 (pre-fills from OAuth)
- `src/components/onboarding/BrandNameStep.vue` — Screen 3
- `src/components/onboarding/BrandUrlStep.vue` — Screen 4 (has "skip" path)
- `src/components/onboarding/ExtractionStep.vue` — Screen 5 (calls APIs or mock)
- `src/components/onboarding/ReviewStep.vue` — Screen 6 (click-to-edit all fields)
- `src/components/onboarding/EmailWireframe.vue` — right panel (screens 1-4)
- `src/components/onboarding/BrandCard.vue` — right panel (screens 5-6)
- `src/components/onboarding/ClickToEdit.vue` — reusable inline editor
- `src/components/onboarding/ColorPicker.vue` — color picker popover

**State & Logic:**
- `src/composables/useOnboardingState.ts` — wizard state, step nav, validation
- `src/composables/useOnboardingComplete.ts` — 6-step completion flow (save name → create brand → upload logo → set onboarded → create canvas → redirect)
- `src/stores/auth.ts` — added `updateName()`, `name` in profile
- `src/stores/brands.ts` — added `createBrandFull()` with logo upload
- `src/stores/canvases.ts` — `createCanvas()` used by completion

**API Endpoints:**
- `api/extract-brand.ts` — Firecrawl + Claude Vision → logo, colors, fonts
- `api/analyze-writing-style.ts` — Firecrawl + Claude → writing style

**Route Guards:**
- `src/router.ts` — `resolveGuard()` with `requiresOnboarding` and `onboardingOnly` meta
- `tests/unit/router/guards.test.ts` — 14 guard tests

**Database:**
- `supabase/migrations/20260320_m3_onboarding.sql` — `name` column + brand-logos bucket

**Tests:**
- `tests/unit/composables/useOnboardingState.test.ts`
- `tests/unit/utils/onboarding-validators.test.ts`
- `tests/unit/onboarding/completion.test.ts`
- `tests/unit/stores/auth.test.ts` (updated)
- `tests/unit/stores/brands.test.ts` (updated)
- `tests/unit/router/guards.test.ts` (updated)

### Verification tasks — run ALL of these

#### 1. Automated quality gates (run from `kova-open-pencil-1/`)

```bash
bun test tests/unit/              # All unit tests pass
bun run check                     # Lint + typecheck: 0 errors
bun run build                     # Production build succeeds
bun run test:dupes                # Copy-paste detection < 3%
```

Report exact counts: tests passed/failed, errors/warnings, duplication %.

#### 2. Code review (use `superpowers:requesting-code-review` skill)

Run a full code review of the M3 changes. Focus on:
- Security: API endpoints validate input, don't leak secrets, handle errors
- Immutability: No direct mutation of refs/reactive objects (must use spread/new objects)
- Vue conventions: `<script setup>`, Composition API, no `<style>` blocks, Tailwind only
- TypeScript: No `any`, no `!` non-null assertions
- File size: All files under 800 lines, functions under 50 lines
- Error handling: All async operations have try/catch, user-facing error messages
- Hard constraints from CLAUDE.md: no `packages/core/` modifications, no Zod, no React

#### 3. Security audit (use `security-auditor` subagent)

Audit the two API endpoints specifically:
- `api/extract-brand.ts` — env var validation, URL input sanitization, no secret leakage in responses, proper error responses
- `api/analyze-writing-style.ts` — same checks, plus graceful fallback behavior
- Auth flow in `useOnboardingComplete.ts` — verify user auth is checked before DB writes
- Supabase migration — RLS policies present and correct

#### 4. Database review (use `database-reviewer` subagent)

Review the migration at `supabase/migrations/20260320_m3_onboarding.sql`:
- Schema changes are safe and reversible
- RLS policies are correct and don't over-expose data
- Storage bucket policies are scoped properly
- The `handle_new_user()` trigger function is idempotent

#### 5. Accessibility check (use `accessibility-tester` subagent)

Check all onboarding components for:
- Keyboard navigation (Enter to submit, Escape to cancel, Tab order)
- ARIA labels on interactive elements
- Color contrast (especially on the dark right panel)
- Focus management between steps
- Screen reader compatibility

#### 6. Browser E2E smoke test (use Playwright MCP tools)

Start the dev server (`bun run dev` from `kova-open-pencil-1/`), then:
1. Navigate to `http://localhost:1420/onboarding` — verify redirect to `/login` (auth guard working)
2. Navigate to `http://localhost:1420/demo` — verify demo route still works (no regression)
3. Take screenshots of both pages

#### 7. DoD checklist verification

Verify each item against the actual code (read the files, don't trust claims):

- [ ] All 7 onboarding screens render (check template exists and is wired in OnboardingView)
- [ ] Split-screen layout: left 38% white, right 62% dark `#1e1e1e`
- [ ] Email wireframe shows on screens 1-4, BrandCard on screens 5-6
- [ ] "Enter manually" skip path: BrandUrlStep emits `skip` → `skipToReview()` → step 6
- [ ] ExtractionStep: calls real APIs when `VITE_SUPABASE_URL` set, mock otherwise
- [ ] Both API calls made in parallel, brand response cached
- [ ] Partial extraction failure: individual items show error, flow continues
- [ ] ReviewStep: click-to-edit for brand name, colors (ColorPicker), fonts, voice, logo upload
- [ ] BrandCard updates live as ReviewStep edits happen (both read from same injected state)
- [ ] Completion flow: `updateName` → `createBrandFull` → set `onboarded=true` → `createCanvas` → `fetchProfile` → redirect to `/editor/:canvasId`
- [ ] Route guard: non-onboarded auth'd user → `/onboarding`; onboarded user → away from `/onboarding`
- [ ] OAuth name pre-fill in NameStep
- [ ] Progress bar shows 7 segments, fills progressively
- [ ] Enter key submits on steps 2-4
- [ ] Back button hidden on step 1, visible on steps 2-6

### Output format

Produce a single report with these sections:

```
## M3 Verification Report

### 1. Quality Gates
[exact command output summaries]

### 2. Code Review
[CRITICAL / HIGH / MEDIUM / LOW findings with file:line references]

### 3. Security Audit
[findings with severity]

### 4. Database Review
[findings]

### 5. Accessibility
[findings with severity]

### 6. E2E Smoke Test
[screenshots + pass/fail]

### 7. DoD Checklist
[each item: ✅ verified / ❌ failed with evidence]

### Summary
[total findings by severity, merge recommendation: MERGE / MERGE WITH FIXES / BLOCK]
```
