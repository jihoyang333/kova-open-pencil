# Brand Creation Flow Redesign + Extraction Bug Fix

**Date:** 2026-03-23
**Milestone:** M4 — Brand Kit & Media Library
**Status:** Approved

## Problem

Two issues with the current brand creation and extraction flow:

1. **Bug:** `BrandSettingsView.vue` line 106 calls `fetch('/api/extract-brand')` without an `Authorization` header. The `api/_shared/auth.ts` middleware requires `Bearer <token>`, so extraction always returns 401. Additionally, `logo_url` from the extraction response is never mapped to the brand.

2. **UX friction:** Creating a brand requires a dialog (name + optional URL), then navigating to settings to fill in details. This is unnecessary indirection — the settings page already has all the fields.

## Approved Design

### Brand Creation: Single-Click Action

"Add Brand" becomes an instant action — no dialog:

1. User clicks "Add Brand" in sidebar
2. System creates "Untitled Brand" in the database immediately
3. Router navigates to `/dashboard/{newId}/settings`
4. Name field auto-focuses when brand name is "Untitled Brand"
5. User fills in name + URL on the existing settings page (auto-saves with 500ms debounce)

### Extract Slot: Four States

A single position on the settings page (below the URL field, above the Logo section) cycles through four states:

| State | Element |
|-------|---------|
| **No URL** | Grayed-out "Extract from website" button (disabled) |
| **Has URL** | Blue "Extract from website" button (clickable) |
| **Extracting** | Full-width progress banner: "Analyzing {domain} — extracting colors, fonts, logo, and voice..." |
| **Done** | Outline "Re-extract" button |

### Extraction Behavior

- **First extraction:** Runs immediately on click (no confirmation dialog)
- **Re-extract:** Shows confirmation dialog ("This will overwrite your current colors, fonts, and voice with fresh data from {domain}")
- **`hasExtractedBefore`:** `computed(() => !!(brand.value?.colors || brand.value?.fonts))` — This is a deliberate simplification. A brand with manually-entered colors/fonts will also show "Re-extract" with a confirmation guard, which is safe (it prevents accidental overwrites regardless of how the data was entered).

### Auth Header Fix

The extraction fetch call must include `Authorization: Bearer <token>` from `useAuthStore().session?.access_token`. A shared `getAuthHeaders()` utility will be created and used by both `BrandSettingsView.vue` and `ExtractionStep.vue`.

### Logo URL Mapping

The extraction response includes `logo_url`. After extraction, if `data.logo_url` is a non-empty string, it must be mapped to the brand's `logo_url` field and saved. If `data.logo_url` is null or empty, do not overwrite an existing logo.

## Files to Change

| File | Change |
|------|--------|
| `src/views/dashboard/BrandSettingsView.vue` | Add auth headers to extraction, map `logo_url` from response, add extract slot with 4 states, auto-focus name field for "Untitled Brand" |
| `src/views/DashboardView.vue` | Update `handleNewBrand()` to create "Untitled Brand" and navigate to `/dashboard/${id}/settings` instead of canvas grid |
| `src/components/dashboard/BrandList.vue` | Remove dialog import/usage, "Add Brand" creates brand + redirects directly |
| `src/components/dashboard/NewBrandDialog.vue` | **Delete** — no longer needed |
| `src/utils/api-headers.ts` | **New** — shared `getAuthHeaders()` helper (~10 lines) |
| `src/components/onboarding/ExtractionStep.vue` | Replace inline `getAuthHeaders()` with import from shared utility |
| Related test files | Update/delete as needed (see detailed list below) |

## Detailed Change Specifications

### 1. `src/utils/api-headers.ts` (New)

```ts
import { useAuthStore } from '@/stores/auth'

// Must be called within a Pinia-active context (component setup or composable)
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authStore = useAuthStore()
  const token = authStore.session?.access_token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}
```

### 2. `src/components/dashboard/BrandList.vue`

- Remove `NewBrandDialog` import and `<NewBrandDialog>` template usage
- Remove `showNewBrandDialog` ref
- Add `isCreating` ref to prevent rapid double-clicks
- Replace click handler: instead of `showNewBrandDialog = true`, call `brandsStore.createBrand('Untitled Brand')` then `router.push(/dashboard/${brand.id}/settings)`
- Add error handling with `toast.show()` on failure
- Disable "Add Brand" button while `isCreating` is true

### 3. `src/views/DashboardView.vue`

- Update `handleNewBrand()` to create "Untitled Brand" (instead of "My Brand")
- Navigate to `/dashboard/${brand.id}/settings` (instead of `/dashboard/${brand.id}`)
- This ensures the empty-state "New Brand" button behaves identically to the sidebar "Add Brand" button

### 4. `src/views/dashboard/BrandSettingsView.vue`

#### Auth fix
- Import `getAuthHeaders` from `@/utils/api-headers`
- Replace `headers: { 'Content-Type': 'application/json' }` with `headers: getAuthHeaders()` in the extraction fetch call

#### Logo URL mapping
- After extraction, if `data.logo_url` is a non-empty string, set `logoPreviewUrl.value = data.logo_url` and save via `brandsStore.updateBrand(brand.value.id, { logo_url: data.logo_url })`
- If `data.logo_url` is null or empty, leave the existing logo unchanged

#### Extract slot (4-state UI)
- Add `hasExtractedBefore` computed: `computed(() => !!(brand.value?.colors || brand.value?.fonts))`
- Extract the extraction logic from `confirmReExtract()` into a new `runExtraction()` function. Both the first-time button and the re-extract dialog's confirm button call `runExtraction()`.
- Replace the inline "Re-extract" button next to the URL field with a dedicated extract section between the URL field and Logo section
- Implement 4-state rendering:
  - **No URL (`!url`):** Disabled button — "Extract from website" — `data-test-id="brand-settings-extract-button"` — no click handler (disabled)
  - **Has URL, not extracted (`url && !hasExtractedBefore && !isExtracting`):** Blue button — "Extract from website" — `data-test-id="brand-settings-extract-button"` — calls `runExtraction()` directly
  - **Extracting (`isExtracting`):** Full-width banner with spinner — "Analyzing {domain} — extracting colors, fonts, logo, and voice..." — `data-test-id="brand-settings-extract-banner"`
  - **Done (`hasExtractedBefore && !isExtracting`):** Outline button — "Re-extract" — `data-test-id="brand-settings-reextract"` — opens confirmation dialog, whose confirm button calls `runExtraction()`

#### Auto-focus
- Add `ref` to the name input element
- On mount / brand load, if `brand.value?.name === 'Untitled Brand'`, focus the name input and select all text

### 5. `src/components/onboarding/ExtractionStep.vue`

- Remove the inline `getAuthHeaders()` function (lines 92-99)
- Add `import { getAuthHeaders } from '@/utils/api-headers'`
- No other changes needed — the function signature is identical

### 6. `src/components/dashboard/NewBrandDialog.vue`

- Delete this file entirely
- **Note:** `createBrandFull` in the brands store must be kept — it is still used by the onboarding flow (`useOnboardingComplete.ts`)

### 7. Test changes

#### Delete
- `tests/unit/components/new-brand-dialog.test.ts` — component no longer exists

#### New: `tests/unit/utils/api-headers.test.ts`
- Returns `Content-Type: application/json` when no session exists
- Returns `Authorization: Bearer <token>` when session has `access_token`

#### Update: `tests/unit/stores/brands.test.ts`
- Add test: `createBrand('Untitled Brand')` succeeds and returns a Brand with the correct name

#### New: `tests/unit/components/brand-settings-extract.test.ts`
- Extract button is disabled when URL is empty
- Extract button is enabled (blue) when URL is present and `hasExtractedBefore` is false
- Clicking extract calls `runExtraction()` (no dialog) on first use
- Progress banner shows during extraction with correct domain text
- After extraction, "Re-extract" button appears
- Clicking "Re-extract" opens confirmation dialog
- Confirming re-extract calls `runExtraction()`
- Extraction includes `Authorization` header in fetch call
- `logo_url` from extraction response is mapped to brand
- Null `logo_url` from extraction does not clear existing logo

## Edge Cases

- **Rapid "Add Brand" clicks:** The create button should be disabled while the create request is in flight (add `isCreating` ref to `BrandList.vue`)
- **Network failure during create:** Show toast error, don't navigate
- **Extraction while auto-save is pending:** The debounced auto-save and extraction write to different fields — no conflict. Extraction writes colors/fonts/voice/logo_url; auto-save writes whatever the user changed.
- **User navigates away during extraction:** The `isExtracting` state resets naturally when the component unmounts. No cleanup needed beyond what Vue handles.
- **Empty extraction response:** If extraction returns null colors/fonts, don't overwrite existing values with empty data. Same for `logo_url` — null/empty response should not clear an existing logo.

## Design Tokens

All UI elements follow the Kova Design System (light theme for dashboard):
- Blue action buttons: `bg-blue-500 hover:bg-blue-600 text-white`
- Outline buttons: `border border-gray-300 text-gray-700 hover:bg-gray-50`
- Disabled buttons: `opacity-50 cursor-not-allowed`
- Progress banner: `bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3`
- Spinner: `<icon-lucide-loader-2 class="animate-spin">`

## Accessibility

- Extract button states communicated via `aria-disabled` and `aria-busy`
- Progress banner uses `role="status"` and `aria-live="polite"`
- Auto-focus uses `nextTick` to avoid focus race conditions
- Re-extract confirmation dialog is keyboard-accessible (existing Reka UI DialogRoot handles this)
