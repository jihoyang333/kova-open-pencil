# M2 Handoff: Fix Plan Review Issues → Execute

I'm building Kova — an AI-powered email design SaaS on top of OpenPencil. M1 (auth + routing) is complete. M2 (Dashboard & Brand Management) has an approved spec and a written implementation plan that has been reviewed. The plan needs 7 fixes from the review, then it's ready for execution.

## Your Job

1. **Fix the 7 review issues** in the plan document (details below)
2. **Invoke `superpowers:executing-plans` skill** (use the Skill tool) to execute the fixed plan
3. Use ALL Superpowers tools: `superpowers:subagent-driven-development` for parallel tasks, `superpowers:test-driven-development` for TDD, `superpowers:verification-before-completion` before claiming done, `superpowers:requesting-code-review` after implementation

## Documents

| Document | Path |
|----------|------|
| **Implementation Plan** (fix then execute) | `kova-open-pencil-1/docs/superpowers/plans/2026-03-17-m2-dashboard-and-brand-management.md` |
| **Approved Spec** | `kova-open-pencil-1/docs/superpowers/specs/2026-03-17-m2-dashboard-design.md` |
| **PRD** | `KOVA_MVP_PRD_v4.md` |

## 7 Review Issues to Fix in the Plan

### Must Fix (3 from Chunk 1 review, 3 from Chunks 2-4 review)

**1. `restoreCanvas` brand scoping (Task 4 — canvases store)**
The `restoreCanvas` action blindly adds the restored canvas to `canvases` array, but `canvases` is scoped to the currently-viewed brand. If the user restores a canvas belonging to brand B while viewing brand A, it incorrectly appears in A's grid.
**Fix:** Don't add to `canvases` at all — just remove from `trashedCanvases`. Let the next `fetchCanvases(brandId)` pick it up. Update the test to match.

**2. Add error path tests (Tasks 3 and 4)**
No error path tests exist in either store. Add at minimum:
- `test('fetchBrands sets isLoading false on error')` — verifies the `finally` block
- `test('createBrand throws when not authenticated')` — verifies the auth guard
- `test('fetchCanvases sets isLoading false on error')` — same pattern
These follow the existing `auth.test.ts` pattern.

**3. Fix test count expectations (Tasks 3 and 4)**
- Task 3 says "Expected: All 7 tests PASS" but has 8 tests → change to 8
- Task 4 says "Expected: All 11 tests PASS" but has 12 tests → change to 12
- Update Task 4 Step 5 total accordingly (existing 23 + new brands tests + new canvases tests)

**4. CanvasCard uses `dblclick` instead of `click` (Task 10)**
The spec says "Clicking existing card: navigates to `/editor/:canvasId`" — single click. The plan uses `@dblclick="emit('open')"` on the card div.
**Fix:** Change `@dblclick` to `@click` on the card wrapper.

**5. EditorView `useRouter()` dynamic import (Task 15)**
The plan wraps `useRouter()` inside `await import('vue-router').then(...)` inside a conditional block. `useRouter()` is a Vue composition API function that must be called synchronously during `setup()`.
**Fix:** Import `useRouter` at the top of the file alongside `useRoute`, call it at the top level of `<script setup>`.

**6. EditorView name sync watch fires on initial load (Task 15)**
The `watch` on `store.state.documentName` calls `canvasesStore.renameCanvas()` on every change, including the initial `store.state.documentName = data.name` set during mount. This causes a redundant Supabase update.
**Fix:** Add a guard — track the "loaded name" and skip the watch callback when the new value matches the initially loaded value, or use a `skipNextSync` flag that's set before the initial assignment and cleared after.

### Nice to Have (document but don't block on)

**7. Public bucket intent (Task 1 migration)**
The bucket is `public: true` (anyone with the URL can view thumbnails) while the spec says "authenticated users can read files under their own prefix." The public approach is correct for SaaS thumbnail patterns (Figma does this), but add a brief SQL comment explaining the intentional deviation.

## Key Decisions Already Made (DO NOT re-ask)

- **Light theme** for dashboard (only editor is dark)
- **Always-visible sidebar** even with one brand
- **Merged data model:** `brands` table replaces PRD's `clients` + `brand_profiles`
- **Soft delete → Trash** for canvases (Figma-style)
- **Nested routing** under `/dashboard` with children array
- **Thumbnail infrastructure** in M2: client-side capture on navigate-away
- **Brand assets** route as placeholder in M2, implementation in M4
- **Canvas name** syncs bidirectionally with editor's `store.state.documentName`

## Project Context

- **Working directory:** `/Users/jihoyang/kova-main`
- **App code:** `kova-open-pencil-1/`
- **Branch:** `main`
- **Commands from `kova-open-pencil-1/`:**
  - `bun install` — install deps
  - `bun run dev` — dev server
  - `bun run check` — lint + typecheck
  - `bun run test:unit` — unit tests
  - `bun run build` — production build
- **Supabase project:** moiuzrkxtkgienykxuio (use Supabase MCP for migrations)
- **Existing tests:** 23 unit tests (3 supabase, 10 auth, 10 router guards)
- **UI libraries:** Reka UI, Tailwind CSS 4, unplugin-icons with Lucide
- **Conventions:** Vue 3 `<script setup lang="ts">`, composition API, no `any`, `@/` imports, ~600 line max

## Hard Constraints (from CLAUDE.md)

- NEVER modify `packages/core/`
- NEVER modify `SYSTEM_PROMPT` in `use-chat.ts`
- Use valibot NOT Zod in tool layer
- No React, Next.js, or PixiJS
- `crypto.getRandomValues()` only, never `Math.random()`
- Check Reka UI first for UI components

## TDD is Mandatory

Write failing tests first, then implement, then verify. Use `superpowers:test-driven-development`.

## After Implementation

Run `superpowers:verification-before-completion` before claiming done, then `superpowers:requesting-code-review`. Commit with conventional commit format (no co-author line — disabled globally).
