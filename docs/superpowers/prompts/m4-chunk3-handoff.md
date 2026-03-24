# M4 Chunk 3 Handoff: Brand Kit UI — Router, Settings Page, New Client Dialog

Read the implementation plan at `docs/superpowers/plans/2026-03-22-m4-brand-kit-media-library.md` and execute **Chunk 3: Brand Kit UI (Tasks 6, 7, and 8)**. Task 6 must complete before Task 7 (router route needed). Task 8 is independent of both.

## Context

- **Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1`
- **Branch:** `m4-brand-media-library`
- **Chunk 1 complete:** Types, migration, format utility (3 commits)
- **Chunk 2 complete:** Media store (9 tests), BrandColorPicker component (2 commits)

### Key files already created (Chunks 1–2)
| File | Purpose |
|------|---------|
| `src/types/kova/media.ts` | MediaAsset interface, constants |
| `src/types/kova/database.ts` | Brand interface (includes `url` field) |
| `supabase/migrations/20260322_m4_media.sql` | Media table, storage bucket |
| `src/utils/format-brand-prompt.ts` | Brand → AI prompt string |
| `src/stores/media.ts` | Pinia store: fetchImages, uploadImage, deleteImage, getPublicUrl |
| `src/stores/brands.ts` | Updated: `url` in createBrandFull, media cleanup in deleteBrand |
| `src/components/brand/BrandColorPicker.vue` | Light-themed color picker (Reka UI Popover) |

### Key files to modify (read these first)
| File | Current state |
|------|---------------|
| `src/router.ts` | Has `:brandId` and `:brandId/assets` child routes under `/dashboard`. New `:brandId/settings` route must go BEFORE `:brandId` catch-all. |
| `src/views/DashboardView.vue` | `heading` computed handles `/trash` and `/assets` paths. Needs `/settings` case added. |
| `src/components/dashboard/BrandList.vue` | Has inline `isCreating`/`newBrandName` input for creating brands. Replace with `NewClientDialog` trigger. Add settings gear icon to each brand item. |

## Tasks

### Task 6: Router & Dashboard Heading Updates
- Add `BrandSettingsView` route at `:brandId/settings` — must appear BEFORE `:brandId` catch-all in children array
- Add lazy import: `const BrandSettingsView = () => import('./views/dashboard/BrandSettingsView.vue')`
- Update `heading` computed in `DashboardView.vue` to handle `/settings` path (add check before `/assets` check)
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): add brand settings route and dashboard heading`

### Task 7: Brand Settings Page (depends on Task 6)
- Create `src/views/dashboard/BrandSettingsView.vue` (~235 lines template in plan)
- Two-column layout with auto-save via `watchDebounced(500ms)` from `@vueuse/core`
- Sections: Brand Identity (name, URL, re-extract), Logo upload, Colors (4x BrandColorPicker), Fonts, Voice, Industry
- Uses `useBrandsStore().updateBrand()` for persistence, `toast.show()` for feedback
- Re-extract dialog uses Reka UI Dialog, calls `/api/extract-brand`
- Logo upload: same pattern as `src/stores/brands.ts:121-143` (brand-logos bucket, upsert, blob preview)
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): add brand settings page with auto-save`

### Task 8: New Client Dialog & BrandList Update (TDD, independent of 6/7)
- Write 4 failing tests first (`tests/unit/components/new-client-dialog.test.ts`) — uses `@vue/test-utils` mount
- Create `src/components/dashboard/NewClientDialog.vue` — Reka UI Dialog with name (required) + URL (optional) fields
- When URL provided: calls `createBrandFull({ name, url })`. Without URL: calls `createBrand(name)`.
- Update `src/components/dashboard/BrandList.vue`:
  - Replace inline `isCreating`/`newBrandName` input with `NewClientDialog` trigger (`showNewClientDialog` ref)
  - Remove `isCreating`, `newBrandName`, `submitNewBrand`, `cancelCreating` refs/functions
  - Add settings gear icon (`icon-lucide-settings`) on each brand item as `router-link` to `/dashboard/${brand.id}/settings`
  - Change "+ New Brand" button text to "Add Client"
- Verify: `bun test tests/unit/components/new-client-dialog.test.ts` → 4 pass
- Verify: `bun run check` → 0 errors
- Commit: `feat(m4): add new client dialog and settings link in brand list`

## Workflow Requirements

Use the full superpowers workflow:
1. Use `superpowers:executing-plans` skill to execute
2. Tasks 6→7 are sequential (router needed first). Task 8 is independent — parallelize with 6/7 if available.
3. After implementation, run `superpowers:requesting-code-review` (code-reviewer agent) **before committing**
4. Fix any Critical/Important issues from review
5. Commit each task separately (3 commits total)

## Verification Checklist

- [ ] BrandSettingsView route works (no route shadowing with `:brandId`)
- [ ] Dashboard heading shows "BrandName › Settings" on settings page
- [ ] 4 NewClientDialog tests pass
- [ ] BrandList uses NewClientDialog instead of inline input
- [ ] BrandList shows settings gear icon per brand
- [ ] `bun run check` — 0 errors
- [ ] Code review passed (no Critical/Important issues)
- [ ] 3 commits on `m4-brand-media-library` branch
