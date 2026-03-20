# Milestone 1 Handoff: Tasks 9-14

I'm building Kova — an AI-powered email design SaaS on top of OpenPencil.

## What's done (Tasks 0-8 of 14, all committed on branch prdv4execution)
- Task 0: Installed pinia + @supabase/supabase-js, deleted old migration, updated test:unit
- Task 1: Added APP_NAME='Kova', SHOW_DEV_FEATURES=false to src/constants.ts
- Task 2: Rebranded index.html title, package.json name, vite.config.ts PWA manifest
- Task 3: Rebranded App.vue, EditorView, AppMenu alt text, ChatInput placeholder
- Task 4: Generated Kova branded icons (geometric white K on blue #4F6EF7 rounded square)
- Task 5: Hidden Code tab, Variables, ProviderSetup, model selector, Copy as JSX behind SHOW_DEV_FEATURES
- Task 6: Created src/lib/supabase-factory.ts + src/lib/supabase.ts (lazy proxy singleton), 3 tests pass
- Task 7: Created src/stores/auth.ts (Pinia auth store), 10 tests pass
- Task 8: Created supabase/migrations/20260316_users.sql, applied to live DB (project moiuzrkxtkgienykxuio)

All 13 unit tests pass. 9 commits on prdv4execution branch.

## What to do NOW — Tasks 9-14
Read the approved implementation plan at:
  kova-open-pencil-1/docs/superpowers/plans/2026-03-16-milestone-1-core-infrastructure.md

Execute these remaining tasks:

### Task 9: Create LoginView.vue (src/views/LoginView.vue)
- Light/white theme, email/password form + Google OAuth button
- Uses useAuthStore, APP_NAME, data-test-id attributes
- Full code is in the plan (search "Task 9")

### Task 10: Create SignupView.vue (src/views/SignupView.vue)
- Mirrors login layout, adds confirm password field
- Redirects to /onboarding on success

### Task 11: Initialize auth on app load
- Update src/main.ts: async auth init before mount (auth.initialize().finally(() => app.mount()))
- Update src/App.vue: loading gate (v-if="auth.isLoading" shows pulsing logo)

### Task 12: Router + guards (TDD) — MOST COMPLEX REMAINING TASK
- Write guard tests first (tests/unit/router/guards.test.ts)
- Create placeholder DashboardView.vue and OnboardingView.vue
- Rewrite src/router.ts with createAppRouter(), all routes, beforeEach guard
- Update src/router.d.ts with extended RouteMeta
- Guard logic: requiresAuth → /login, publicOnly → /dashboard, requiresOnboarding → /onboarding

### Task 13: Update index.html loader
- Change from dark (#1e1e1e) to white background
- Kova blue (#4F6EF7) accents instead of white

### Task 14: Build verification
- Run: bun run check, bun test tests/unit/, bun run build
- Visual smoke test with bun run dev

After all tasks, invoke /superpowers:finishing-a-development-branch to verify and review.

## Key constraints (from CLAUDE.md)
- Vue 3, `<script setup lang="ts">`, Composition API only
- Tailwind CSS 4 utility classes only, no inline CSS
- `@/` alias for imports, no `any`, no `!` non-null assertions
- Light/white theme for ALL non-editor pages
- Do NOT modify packages/core/ or SYSTEM_PROMPT
- Tasks 9+10 are parallelizable. Task 12 depends on Task 7 (auth store, already done).
- Task 13 depends on Task 12. Task 14 is last.
- Follow TDD for Task 12 (write tests first).
- Use parallel agents where tasks are independent.

## Architecture note
- Supabase client uses a Proxy-based lazy singleton (src/lib/supabase.ts) to avoid module-level throws in tests
- The factory is in src/lib/supabase-factory.ts (separated for mock.module compatibility)
- Auth store uses useRouter() inside signOut() — works because Pinia is installed before router

## Untracked files to be aware of
- `scripts/generate-icons.py` — icon generator script, can be gitignored or committed
- `docs/superpowers/` — specs, plans, and this handoff (should be committed)
