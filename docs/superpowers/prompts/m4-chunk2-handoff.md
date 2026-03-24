# M4 Chunk 2 Handoff: Media Store & BrandColorPicker

Read the implementation plan at `docs/superpowers/plans/2026-03-22-m4-brand-kit-media-library.md` and execute **Chunk 2: Stores & Picker (Tasks 4 and 5)**. These two tasks are independent and can be parallelized.

## Context

- **Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1`
- **Branch:** `m4-brand-media-library`
- **Chunk 1 complete:** Types (`src/types/kova/media.ts`), Brand.url field (`src/types/kova/database.ts`), migration (`supabase/migrations/20260322_m4_media.sql`), format utility (`src/utils/format-brand-prompt.ts` + 7 tests)

## Tasks

### Task 4: Media Store (TDD)
- Write 8 failing tests first (`tests/unit/stores/media.test.ts`)
- Implement Pinia composition store (`src/stores/media.ts`) — fetchImages, uploadImage, uploadImageFromUrl, deleteImage, getPublicUrl
- Update `src/stores/brands.ts` — persist `url` in createBrandFull, add media storage cleanup in deleteBrand
- Verify: `bun test tests/unit/stores/media.test.ts` → 8 pass
- Verify: `bun run check` → 0 errors

### Task 5: BrandColorPicker Component
- Create `src/components/brand/BrandColorPicker.vue` — light-themed color picker using Reka UI Popover + native color input
- Reference: existing dark-themed `src/components/onboarding/ColorPicker.vue`
- Verify: `bun run check` → 0 errors

## Workflow Requirements

Use the full superpowers workflow:
1. Use `superpowers:executing-plans` skill to execute
2. Tasks 4 and 5 are independent — parallelize with subagents if available
3. After implementation, run `superpowers:requesting-code-review` (code-reviewer agent) **before committing**
4. Fix any Critical/Important issues from review
5. Commit each task separately:
   - `feat(m4): add media store with upload/delete/fetch and brand media cleanup`
   - `feat(m4): add light-themed BrandColorPicker component`

## Verification Checklist

- [ ] 8 media store tests pass
- [ ] `bun run check` — 0 errors
- [ ] Code review passed (no Critical/Important issues)
- [ ] 2 commits on `m4-brand-media-library` branch
