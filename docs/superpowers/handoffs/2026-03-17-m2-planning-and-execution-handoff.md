# M2 Handoff: Write Implementation Plan → Execute

I'm building Kova — an AI-powered email design SaaS on top of OpenPencil. M1 (auth + routing) is complete. M2 (Dashboard & Brand Management) brainstorming is done and the spec is approved.

## Your Job

You are picking up at the **writing-plans** step of the Superpowers workflow. The brainstorming is complete, the spec is approved and reviewed. You need to:

1. **Invoke the `superpowers:writing-plans` skill** (use the Skill tool) to create a detailed, phased implementation plan from the approved spec
2. After the plan is written and approved, **invoke the `superpowers:executing-plans` skill** (use the Skill tool) to execute it
3. Use ALL Superpowers tools available: `superpowers:subagent-driven-development` for parallel tasks, `superpowers:test-driven-development` for TDD, `superpowers:verification-before-completion` before claiming done, `superpowers:requesting-code-review` after implementation

## Approved Spec

**Read this first:**
```
kova-open-pencil-1/docs/superpowers/specs/2026-03-17-m2-dashboard-design.md
```

## Key Decisions Already Made (DO NOT re-ask these)

- **Light theme** for dashboard (only editor is dark)
- **Always-visible sidebar** even with one brand
- **Merged data model:** `brands` table replaces PRD's `clients` + `brand_profiles` (1:1 merge). All PRD references to `clients` → `brands`, `brand-profiles.ts` → `brands.ts`
- **Soft delete → Trash** for canvases (Figma-style modal, Trash sidebar section, restore + permanent delete, no auto-clearing)
- **Nested routing** under `/dashboard` with children array. Static routes (`/dashboard/trash`) before dynamic (`:brandId`)
- **Thumbnail infrastructure** in M2: client-side capture on navigate-away, Supabase Storage bucket. M7 adds on-save trigger
- **Brand assets** route as placeholder in M2 (`/dashboard/:brandId/assets`), implementation in M4
- **Canvas name** syncs bidirectionally with editor's `store.state.documentName`

## What M2 Builds

### Database (single migration: `supabase/migrations/20260317_m2_dashboard.sql`)
- `brands` table (id, user_id, name, colors JSONB, fonts JSONB, logo_url, voice, industry, timestamps)
- `canvases` table (id, brand_id, name, thumbnail_url, trashed_at, timestamps)
- RLS policies scoped to auth.uid()
- Reuse existing `update_updated_at()` trigger function
- Supabase Storage bucket `thumbnails` with RLS

### Stores (Pinia, composition API setup stores)
- `src/stores/brands.ts` — fetchBrands, createBrand, updateBrand, deleteBrand (with thumbnail cleanup), selectedBrand via selectBrand(id) setter
- `src/stores/canvases.ts` — fetchCanvases, createCanvas, renameCanvas, duplicateCanvas (name + " (Copy)", brand_id only), moveToTrash, restoreCanvas, permanentlyDelete, fetchTrashed

### Routing (restructure existing `/dashboard` flat route)
- `DashboardView.vue` as layout shell with `<router-view>`
- Children: `/dashboard/trash` (before `:brandId`), `/dashboard/:brandId`, `/dashboard/:brandId/assets`
- Index redirect to first brand

### Components
- `DashboardView.vue` — 3-region layout shell (sidebar + top bar + router-view)
- `BrandList.vue` — sidebar with brand list, "+ New Brand", Assets link per brand, Trash link
- `AccountMenu.vue` — top-right avatar dropdown (sign out)
- `CanvasGrid.vue` — canvas cards grid with "New Canvas" card
- `CanvasCard.vue` — thumbnail/placeholder, name, timestamp, context menu (ContextMenu + DropdownMenu)
- `EmptyState.vue` — zero canvases CTA
- `TrashView.vue` — trashed canvases grid
- `TrashCard.vue` — thumbnail, name, "Trashed X ago", context menu (Restore, Permanently delete)
- `MoveToTrashDialog.vue` — Figma-style modal (Reka UI Dialog)
- `BrandAssetsView.vue` — M2 placeholder with empty state
- `AppMenu.vue` — editor top-left Kova icon dropdown with "Back to Dashboard"

### Thumbnail Utility
- `src/utils/capture-thumbnail.ts` — captureThumbnail(canvasId): canvas element → toBlob → resize → upload → update record
- Errors caught silently, never block navigation
- userId from auth store

### Editor Changes
- `EditorView.vue` — load canvas from store, sync name with documentName, redirect if invalid/trashed, capture thumbnail on leave

## Project Context

- **Working directory:** `/Users/jihoyang/kova-main`
- **App code:** `kova-open-pencil-1/`
- **Branch:** `main` (M1 merged here, work continues here)
- **PRD:** `KOVA_MVP_PRD_v4.md` (root directory)
- **Commands from `kova-open-pencil-1/`:**
  - `bun install` — install deps
  - `bun run dev` — dev server
  - `bun run check` — lint + typecheck
  - `bun run test:unit` — unit tests
  - `bun run build` — production build
- **Supabase project:** moiuzrkxtkgienykxuio (use Supabase MCP for migrations)
- **Existing tests:** 23 unit tests (3 supabase, 10 auth, 10 router guards)
- **UI libraries:** Reka UI (Dialog, DropdownMenu, ContextMenu, etc.), Tailwind CSS 4, unplugin-icons with Lucide
- **Conventions:** Vue 3 `<script setup lang="ts">`, composition API, no `any`, `@/` imports, ~600 line max per file

## Hard Constraints (from CLAUDE.md)

- NEVER modify `packages/core/` — read-only engine
- NEVER modify `SYSTEM_PROMPT` in `use-chat.ts`
- Use valibot NOT Zod in tool layer
- No React, Next.js, or PixiJS
- `crypto.getRandomValues()` only, never `Math.random()`
- Check Reka UI first for UI components
- Use `e.code` not `e.key` for keyboard shortcuts

## TDD is Mandatory

Write failing tests first, then implement, then verify. This is enforced by the user's global rules. Use the `superpowers:test-driven-development` skill.

## After Implementation

Run `superpowers:verification-before-completion` before claiming done, then `superpowers:requesting-code-review`. Commit with conventional commit format (no co-author line — disabled globally).
