# M3 Onboarding Wizard — Chunk 2 Finish & Cleanup

Paste this into a fresh Claude Code session from the `kova-main/` directory.

---

## Prompt

We're building Kova, an AI-powered email design SaaS. I'm finishing M3 Chunk 2 (Onboarding UI). All Tasks 1-13 code is written and committed on branch `m3-onboarding-wizard`. I need you to handle the remaining cleanup and verification.

### What's done (all committed)

Branch `m3-onboarding-wizard` in `kova-open-pencil-1/` has these commits:

| Commit | What was built |
|--------|----------------|
| `cb159be` | Task 1: Migration, auth store name support |
| `31747c2` | Task 2: URL/hex validators |
| `e982e7c` | Task 4: createBrandFull with logo upload |
| `36aae7a` | Task 3: useOnboardingState composable |
| `a2037a1` | Task 5: OnboardingView shell with stubs |
| `65488d5` | **Tasks 6-13: All component implementations + completion flow** |
| `34d6949` | Formatting fix for existing files |

All 5 reviewer fixes from the plan were applied:
1. No `import type { ReturnType } from 'vue'` — uses TS built-in
2. `logoSrc ?? undefined` instead of `logoSrc!`
3. `ref()` + immutable `updateItem()` instead of `reactive()` mutations in ExtractionStep
4. Auth guard (`if (!authStore.user) throw`) instead of `authStore.user!.id`
5. OAuth name pre-fill from `user_metadata.full_name` in NameStep

### What still needs to happen

#### 1. Unstaged prior-session changes need review and commit

There are unstaged modifications and untracked files from prior sessions that were NOT part of Tasks 6-13. Run `git status` to see them. Key ones:

- `src/main.ts` — loader removal animation
- `src/router.ts` — settings route + `/editor` redirect
- `src/views/DashboardView.vue` — changes
- `src/views/SignupView.vue` — changes
- `src/components/dashboard/BrandList.vue` — changes
- `tests/unit/stores/auth.test.ts` — additional test for signIn profile population
- `src/views/dashboard/SettingsView.vue` — new file (untracked)
- Various `docs/superpowers/` files — plans, specs, prompts, handoffs (untracked)

Review these and commit them in a separate commit (or multiple logical commits). They are NOT part of M3 but are legitimate uncommitted work from earlier sessions.

#### 2. Fix pre-existing auth store test failures

`tests/unit/stores/auth.test.ts` and `tests/unit/stores/auth-name.test.ts` both fail with `store.fetchProfile is not a function`. This is a Pinia mock setup issue where the store functions aren't being resolved. The tests mock `@/lib/supabase` and `@/router` but the Pinia `defineStore` composition API setup isn't wiring through the mocks correctly. These tests were already failing before Tasks 6-13.

Fix approach: The `useAuthStore` mock module pattern doesn't work well with `defineStore` composition API stores in bun:test. The store likely needs the mock to be set up before Pinia is created, or the test needs to use the actual store with properly mocked dependencies.

#### 3. Verification checklist

Run these and confirm all pass:
- `bun test tests/unit/onboarding/ tests/unit/composables/useOnboardingState.test.ts tests/unit/utils/onboarding-validators.test.ts tests/unit/stores/brands-create-full.test.ts` — **41 tests, all should PASS**
- `bun run check` — **0 errors, 0 warnings**
- `bun run dev` — dev server compiles without errors
- Navigate through all 7 screens in browser at `/onboarding`
- Test "enter manually" skip (step 4 → step 6)
- Test brand card live updates during extraction (step 5)
- Test click-to-edit on review screen (step 6)
- Test Finish Setup button shows loading state

#### 4. Write Chunk 3 handoff

After cleanup, write `docs/superpowers/prompts/m3-chunk3-handoff.md` for the next session:

**Chunk 3 scope:** Phase 3.2 — Extraction APIs (Tasks 14-16 from the plan)
- Task 14: `api/extract-brand.ts` — Firecrawl scrape + Claude Vision analysis
- Task 15: `api/analyze-writing-style.ts` — Firecrawl text + Claude tone analysis
- Task 16: Wire ExtractionStep to real API endpoints (replace mock data)

### Sources of truth

- **Plan:** `kova-open-pencil-1/docs/superpowers/plans/2026-03-20-m3-onboarding-wizard.md` (Tasks 14-16 are in "Chunk 3" section)
- **Design spec:** `kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md`
- **CLAUDE.md** — architecture, hard constraints, code conventions

### Skills & subagents

| When | Use |
|------|-----|
| Fixing auth tests | `superpowers:systematic-debugging` skill |
| After all fixes | `superpowers:verification-before-completion` skill |
| Writing chunk 3 handoff | Reference plan Tasks 14-16 |
