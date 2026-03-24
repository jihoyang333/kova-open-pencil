Review the brand creation flow redesign implementation. Use the `superpowers:code-reviewer` subagent type.

## What Was Implemented

Brand creation flow redesign + extraction bug fix across 7 commits (9 files, +461/-274 lines):

1. **Shared auth header utility** — `src/utils/api-headers.ts` extracts `getAuthHeaders()` from duplicated inline code
2. **ExtractionStep refactor** — replaced inline `getAuthHeaders()` with shared import, removed unused `authStore`/`useAuthStore`
3. **Extraction bug fixes** — added `Authorization` header to `BrandSettingsView` fetch (was causing 401), added `logo_url` mapping from extraction response
4. **4-state extract slot** — new UI section in BrandSettingsView between URL field and Logo section: disabled → enabled → extracting → re-extract. Added `hasExtractedBefore` computed, `extractDomain` computed, `extractionDone` ref, renamed `confirmReExtract` to `runExtraction`, auto-focus on "Untitled Brand" name
5. **Single-click brand creation** — BrandList.vue: removed NewBrandDialog, "Add Brand" now creates "Untitled Brand" and redirects to settings page
6. **DashboardView alignment** — empty-state "New Brand" button updated: `'My Brand'` → `'Untitled Brand'`, navigates to `/settings` instead of canvas grid
7. **Cleanup** — deleted `NewBrandDialog.vue` and `new-brand-dialog.test.ts`

## Requirements/Plan

Read these two files for full context:
- **Spec:** `docs/superpowers/specs/2026-03-23-brand-creation-flow-design.md`
- **Plan:** `docs/superpowers/plans/2026-03-23-brand-creation-flow.md`

## Git Range to Review

**Base:** `6f4f794` (commit before first implementation commit)
**Head:** `b08064a` (final commit)

```bash
git diff --stat 6f4f794..b08064a
git diff 6f4f794..b08064a
```

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/utils/api-headers.ts` | Created | +15 |
| `tests/unit/utils/api-headers.test.ts` | Created | +35 |
| `src/components/onboarding/ExtractionStep.vue` | Modified | -11/+1 |
| `src/views/dashboard/BrandSettingsView.vue` | Modified | +120/-52 |
| `tests/unit/components/brand-settings-extract.test.ts` | Created | +292 |
| `src/components/dashboard/BrandList.vue` | Modified | +26/-26 |
| `src/views/DashboardView.vue` | Modified | +2/-2 |
| `src/components/dashboard/NewBrandDialog.vue` | Deleted | -136 |
| `tests/unit/components/new-brand-dialog.test.ts` | Deleted | -96 |

## Key Review Areas

Focus your review on these areas:

### 1. Spec Compliance
- Does the 4-state extract slot match the spec exactly? (disabled/enabled/extracting/re-extract)
- Is `hasExtractedBefore` computed correct? The spec says `computed(() => !!(brand.value?.colors || brand.value?.fonts))` but the implementation added an `extractionDone` ref — is this a valid enhancement or a deviation?
- Does single-click creation create "Untitled Brand" and redirect to `/dashboard/${id}/settings`?
- Is auto-focus implemented for "Untitled Brand" name?

### 2. Bug Fixes
- Is the 401 fix correct? (`getAuthHeaders()` replacing hardcoded `Content-Type` header)
- Is `logo_url` mapping correct? (non-empty string → save, null/empty → don't overwrite)

### 3. Code Quality (per CLAUDE.md conventions)
- Vue 3 Composition API with `<script setup lang="ts">`
- No `any` types (except test mocks)
- Tailwind CSS 4 utility classes only
- Immutable patterns (no object mutation)
- Functions ~40 lines max, files ~600 lines max
- `data-test-id` attributes on interactive elements
- Reka UI for dialog components

### 4. Test Coverage
- `api-headers.test.ts`: 2 tests (no session, with session)
- `brand-settings-extract.test.ts`: 11 tests (all 4 states, first use vs re-extract, auth header, logo_url mapping, null logo handling)
- Do tests verify real behavior or just mock behavior?
- Are edge cases covered?

### 5. Cleanup Verification
- No remaining references to `NewBrandDialog`, `showNewBrandDialog`, or `new-brand-dialog` in `src/` or `tests/`
- `createBrandFull` in brands store is NOT deleted (still used by `useOnboardingComplete.ts`)

### 6. Pre-existing Issues (not blockers)
- 3 pre-existing test failures in `completion.test.ts` about `authStore.updateName` — unrelated to this work

## Quality Gate Results

```
bun run check: 0 warnings, 0 errors
bun test tests/unit/: 156 pass, 3 fail (pre-existing)
grep "NewBrandDialog" src/ tests/: no matches
```

## Output Format

Follow the standard code review output format:

### Strengths
### Issues (Critical / Important / Minor)
### Recommendations
### Assessment (Ready to merge? Yes/No/With fixes)
