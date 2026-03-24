# M4 Handoff: Brand Creation Flow + Extraction Fix

## What was done this session

### 1. "Client" → "Brand" rename (COMPLETED)
- Renamed `NewClientDialog.vue` → `NewBrandDialog.vue`
- Dialog title: "New Client" → "New Brand"
- Sidebar button: "Add Client" → "Add Brand"
- All `data-test-id` attributes: `new-client-*` → `new-brand-*`
- Updated `BrandList.vue` imports/variables
- Renamed test file and updated all references
- Lint, typecheck, and tests all pass

### 2. Error handling improvement (COMPLETED)
- `NewBrandDialog.vue` catch block now logs actual error to console and shows specific message in toast (was swallowing the error with generic "Failed to create brand")

### 3. "Failed to create brand" root cause investigation (INVESTIGATED, NOT RESOLVED)
- DB schema: correct, all columns exist including `url` (M4 migration applied)
- RLS policies: correct (`user_id = auth.uid()`)
- TypeScript types match DB schema
- **Root cause unknown** — the error was being swallowed. With the new error logging, the actual Supabase error message will now be visible in console + toast when reproduced

## What needs to be done next

### Issue 1: Brand extraction doesn't work
- The Brand Settings page (`BrandSettingsView.vue`) has a "Re-extract" button
- Clicking it shows "Extraction failed" toast (see screenshots user provided)
- Need to audit the extraction code path: what function does Re-extract call? Is there an API endpoint or edge function for scraping? Does it actually exist or is it a stub?

### Issue 2: Brand creation UX flow redesign (DESIGN NEEDED)

**Current flow:**
1. User clicks "Add Brand" in sidebar
2. `NewBrandDialog.vue` opens as a floating dialog
3. User enters brand name + optional website URL
4. Clicks "Create" → brand is created in DB → redirects to `/dashboard/{brandId}`
5. No extraction happens during creation — extraction only exists on the settings page

**User's feedback:**
- There is NO step showing brand extraction during creation
- The dialog doesn't actually perform extraction even when URL is provided
- User asked: "When creating a new brand, should the floating dialog even appear? Or should the user be redirected to the Brand Settings page directly?"

**User wants UX options** with the smoothest experience in mind. Think about:

**Option A: Keep dialog, add extraction step**
- Dialog collects name + URL → creates brand → shows extraction progress in dialog → redirects to settings with fields populated

**Option B: Skip dialog, go straight to settings page**
- "Add Brand" creates a blank brand immediately and redirects to the Brand Settings page
- User fills in name, URL, and clicks extract right there
- Similar to how Figma creates "Untitled" files

**Option C: Dialog creates brand, then redirect to settings with auto-extract**
- Dialog stays minimal (name + URL) → creates brand → redirects to settings page → auto-triggers extraction if URL was provided → user sees fields populate in real-time

**The user explicitly asked for your recommendation.** Use the `superpowers:brainstorming` skill to explore options and present a design.

## Key files to read
- `src/components/dashboard/NewBrandDialog.vue` — the creation dialog (just renamed)
- `src/views/dashboard/BrandSettingsView.vue` — the settings page with Re-extract
- `src/stores/brands.ts` — brand store with `createBrand` and `createBrandFull`
- `src/composables/useOnboardingState.ts` — onboarding also does extraction
- `src/composables/useOnboardingComplete.ts` — completes onboarding with brand creation
- `src/components/dashboard/BrandList.vue` — sidebar with "Add Brand" button
- `src/router.ts` — route definitions

## Branch context
- Working on `main` branch (M4 milestone: Brand Kit & Media Library)
- Previous work: M4 chunks 1-5 implemented brand settings, media library, editor integration
- All changes from this session are uncommitted
