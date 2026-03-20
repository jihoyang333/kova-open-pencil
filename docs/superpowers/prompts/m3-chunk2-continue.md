# M3 Onboarding Wizard — Chunk 2 Continuation

Paste this into a fresh Claude Code session from the `kova-main/` directory.

---

## Prompt

We're building Kova, an AI-powered email design SaaS. I'm continuing M3 Chunk 2 (Onboarding UI) execution that was started in a prior session. The prior session completed Tasks 1–5 and I need you to finish Tasks 6–13.

### What's already done

Branch `m3-onboarding-wizard` in `kova-open-pencil-1/` has these commits:

| Commit | Task | What was built |
|--------|------|----------------|
| `cb159be` | Task 1 | Migration: `name` column on users table, `brand-logos` storage bucket, auth store `updateName()` |
| `31747c2` | Task 2 | `src/utils/onboarding-validators.ts` — `isValidUrl`, `normalizeUrl`, `isValidHexColor` |
| `e982e7c` | Task 4 | `src/stores/brands.ts` — `createBrandFull()` with logo file upload support |
| `36aae7a` | Task 3 | `src/composables/useOnboardingState.ts` — step navigation, validation, all state refs |
| `a2037a1` | Task 5 | `src/views/OnboardingView.vue` — split-screen shell (38/62 layout), all stub components created |

All unit tests pass. Lint passes (`bun run check`).

### What needs to be done (Tasks 6–13)

Execute Tasks 6–13 from the plan using `superpowers:executing-plans`.

**Plan location:** `kova-open-pencil-1/docs/superpowers/plans/2026-03-20-m3-onboarding-wizard.md`
**Section:** "Chunk 2: Phase 3.1 — Onboarding UI" — Tasks 6 through 13
**Branch:** `m3-onboarding-wizard` in `kova-open-pencil-1/`

### Stub files already exist

All component files in `src/components/onboarding/` are stubs created during Task 5. Replace them with real implementations:
- `WelcomeStep.vue`, `NameStep.vue` (Task 6)
- `BrandNameStep.vue`, `BrandUrlStep.vue` (Task 7)
- `EmailWireframe.vue` (Task 8)
- `BrandCard.vue` (Task 9)
- `ExtractionStep.vue` (Task 10)
- `ClickToEdit.vue`, `ColorPicker.vue` (Task 11)
- `ReviewStep.vue` (Task 12)
- Then wire completion in `OnboardingView.vue` + create `src/composables/useOnboardingComplete.ts` (Task 13)

### Reviewer fixes to apply during implementation

The plan was reviewed and these issues must be fixed (do NOT copy the plan code verbatim for these):

1. **Task 6 NameStep:** Remove `import type { ReturnType } from 'vue'` — `ReturnType` is a built-in TypeScript utility, not a Vue export. Just use `ReturnType<typeof useOnboardingState>` directly.
2. **Task 9 BrandCard:** Replace `:src="logoSrc!"` with `:src="logoSrc ?? undefined"` — no `!` non-null assertions per CLAUDE.md.
3. **Task 10 ExtractionStep:** The plan uses `reactive()` with direct mutation (`items[0].status = 'loading'`). Use `ref()` with immutable updates instead per coding style rules.
4. **Task 13 useOnboardingComplete:** Replace `authStore.user!.id` with a guard: `if (!authStore.user) throw new Error('Not authenticated')` then use `authStore.user.id`.
5. **Advisory:** Pre-fill name from Google OAuth — in NameStep or OnboardingView, check `authStore` user metadata for `full_name` and pre-populate `state.name.value`.

### Parallelism

- Tasks 6, 7, 8, 9, 10, 11 can run in parallel (all depend only on Task 5 which is done)
- Task 12 depends on Tasks 9 + 11
- Task 13 depends on Tasks 1, 4, 5, 12

Use `superpowers:dispatching-parallel-agents` for independent tasks.

### Sources of truth

- **Plan:** `kova-open-pencil-1/docs/superpowers/plans/2026-03-20-m3-onboarding-wizard.md`
- **Design spec:** `kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md`
- **CLAUDE.md** — architecture, hard constraints, code conventions

### Skills & subagents

| When | Use |
|------|-----|
| Starting execution | `superpowers:executing-plans` skill |
| Independent tasks (6-11) | `superpowers:dispatching-parallel-agents` skill |
| After writing code | `superpowers:requesting-code-review` skill |
| Before claiming done | `superpowers:verification-before-completion` skill |
| Vue 3 questions | `vue-expert` subagent |
| shadcn-vue components | shadcn-vue MCP |

### Chunk 2 deliverable

Working wizard with mock extraction data:
- All 7 screens render and navigate
- Split-screen layout with email wireframe (1-4) and brand card (5-6)
- Click-to-edit on review screen
- "Enter manually" skip path
- Completion flow creates brand + canvas + redirects
- All unit tests pass
- Lint passes

### End of chunk

After all tasks pass: commit, run `bun run test:unit && bun run check`, write a handoff summary for Chunk 3 (API endpoints).
