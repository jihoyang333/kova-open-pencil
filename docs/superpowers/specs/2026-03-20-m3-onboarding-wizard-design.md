# M3: Onboarding Wizard — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**PRD Reference:** `KOVA_MVP_PRD_v4.md` → "Milestone 3: Onboarding Wizard"

---

## Overview

A 7-screen onboarding wizard for first-time Kova users to set up their name, brand profile (name, logo, colors, fonts, writing style), and land directly in the editor with a blank canvas. The wizard uses a split-screen layout inspired by Figma's onboarding, with contextual right-panel content that evolves as the user progresses.

## Layout

**Split-screen: 38% left / 62% right.**

- **Left panel (white):** Questions, inputs, progress bar, navigation
- **Right panel (dark, #1e1e1e):** Contextual preview that evolves per screen

### Left Panel Structure
- **Top-left:** Back arrow (hidden on Screen 1)
- **Center:** Question content (heading, subtitle, input) — positioned in upper-third, not vertically centered
- **Bottom-left:** Progress bar (7 segments, filled = blue #2563eb)
- **Bottom-right:** Continue button (blue #2563eb, disabled until valid input)

### Right Panel Content
- **Screens 1–4:** Static email wireframe skeleton with canvas-style selection handles (blue outline, corner handles, "Email — 600 x 900" label). Shows what Kova creates — a branded email on a design canvas.
- **Screens 5–6:** Floating brand card on dark background. Shows logo, brand name, 4 color dots, fonts, voice. Fills in progressively as extraction completes and updates in real-time as user edits on Screen 6.

### Theme
- Left panel: **light/white** (consistent with auth and dashboard)
- Right panel: **dark (#1e1e1e)** (consistent with the Kova editor canvas)
- Only the editor itself uses full dark theme

---

## Screen Flow

| # | Screen | Left Panel | Right Panel | Data |
|---|--------|-----------|-------------|------|
| 1 | Welcome | Kova logo, "Welcome to Kova" heading, subtitle, "Get Started" CTA | Email wireframe + canvas handles | — |
| 2 | Your Name | "What's your name?" text input | Email wireframe | `users.name` |
| 3 | Brand Name | "What's your brand name?" text input | Email wireframe | `onboardingState.brandName` |
| 4 | Brand URL | URL input + "I don't have a website — enter manually" skip link | Email wireframe | `onboardingState.brandUrl` |
| 5 | Extraction Loading | Progressive checklist with spinners → checkmarks | Brand card fills in live | `onboardingState.*` |
| 6 | Review & Confirm | Grouped visual sections, click-to-edit | Brand card reflects edits live | `onboardingState.*` |
| 7 | Complete | No visible screen — action triggered by "Finish Setup" on Screen 6 | — | DB writes + redirect |

---

## Screen Details

### Screen 1: Welcome
- Kova logo (48x48, rounded corners) top of content area
- Heading: "Welcome to Kova"
- Subtitle: "AI-powered email design, tailored to your brand. Let's set up your brand profile to get started."
- Single CTA: "Get Started" button
- No back arrow on this screen
- Progress bar: segment 1 filled

### Screen 2: Your Name
- Heading: "What's your name?"
- Subtitle: "This is how you'll appear in Kova."
- Single text input
- Pre-filled with `auth.users.raw_user_meta_data->>'full_name'` for Google OAuth sign-ups
- Continue button disabled until input is non-empty
- Enter key submits
- Progress bar: segments 1–2 filled

### Screen 3: Brand Name
- Heading: "What's your brand name?"
- Subtitle: "This is how we'll identify your brand across Kova."
- Single text input
- Continue button disabled until input is non-empty
- Enter key submits
- Progress bar: segments 1–3 filled

### Screen 4: Brand URL
- Heading: "What's your brand's website?"
- Subtitle: "We'll use this to automatically extract your brand colors, fonts, and logo."
- Single URL text input
- Basic URL validation (must look like a domain)
- Primary: "Next" button (submits URL, advances to Screen 5)
- Secondary: "I don't have a website — enter manually" text link below input
  - Skips Screen 5 entirely, goes to Screen 6 with empty fields
- Progress bar: segments 1–4 filled

### Screen 5: Extraction Loading
- Left panel shows progressive checklist. Each item appears sequentially as API results arrive:
  1. "Finding your logo..." → spinner → ✓ (green checkmark)
  2. "Extracting brand colors..." → spinner → ✓ + inline color swatches
  3. "Detecting fonts..." → spinner → ✓ + font names
  4. "Analyzing writing style..." → spinner → ✓ + style description
- Right panel: floating brand card on dark background. Starts with all fields as dashed placeholders. As each extraction item completes, the corresponding field in the card fills in with an animation.
- On completion: auto-advances to Screen 6 after a 1–2 second pause, OR shows a "Continue" button
- Partial failure: show what succeeded, advance with partial data (empty fields editable on Screen 6)
- Calls both API endpoints in parallel when screen mounts:
  - `POST /api/extract-brand` → returns logo_url, colors, fonts
  - `POST /api/analyze-writing-style` → returns writing_style
- Progress bar: segments 1–5 filled

### Screen 6: Review & Confirm
- Heading: "Review your brand"
- Subtitle: "Tap any field to edit."
- Content grouped into visual section cards with light gray (#f9fafb) backgrounds and rounded corners:

**Identity section:**
- Logo thumbnail (click to open file upload dialog) with small edit icon overlay
- Brand name displayed as text (click to toggle inline text input)

**Colors section:**
- Label: "COLORS" (uppercase, small)
- 4 color squares in a row: Primary, Secondary, Accent, Background
- Each shows the color, label below, hex value below that
- Click any color → color picker popover with hex input

**Fonts + Voice section:**
- Heading font and Body font side by side (click to toggle text input)
- Writing style below (click to toggle textarea)

**Interaction pattern:** Click-to-edit. Display mode shows the value as styled text. Click toggles to an input field. Click away or press Enter saves back to display mode.

- Right panel: brand card updates in real-time as user edits any field
- "Finish Setup" button at bottom-right
- Progress bar: segments 1–6 filled

### Screen 7: Complete (action, not a visible screen)
On "Finish Setup" click from Screen 6:
1. Show loading state on button ("Setting up...")
2. Save `name` to `users.name`
3. Upload logo to Supabase Storage if provided, get URL
4. Create `brands` row: `{ user_id, name, colors, fonts, logo_url, voice }`
5. Set `users.onboarded = true`
6. Create `canvases` row: `{ brand_id, name: "{brandName} - Canvas 1" }`
7. Redirect to `/editor/:canvasId`
8. On error: show inline error message, do not redirect

---

## PRD Divergences

These decisions override the PRD where they conflict:

| PRD Says | Design Says | Reason |
|----------|-------------|--------|
| 6 screens | 7 screens (added "Your Name") | Need user's display name for the app |
| `clients` + `brand_profiles` tables | Single `brands` table | M2 consolidation (codebase is correct) |
| Redirect to `/dashboard` after onboarding | Redirect to `/editor/:canvasId` | Get users into the product immediately |
| Do NOT auto-create a canvas | Auto-create `"{brandName} - Canvas 1"` | Required for editor redirect |
| Dark theme for onboarding | Light left / dark right (split) | Consistent with auth/dashboard light theme |
| `writing_style` field | Maps to `voice` column in `brands` table | M2 schema consolidation |
| Brand card on right panel | Email wireframe (Screens 1-4), brand card (Screens 5-6) | Show what Kova creates, then show what was extracted |

---

## Database Changes

### New migration: `20260320_m3_onboarding.sql`

```sql
ALTER TABLE public.users ADD COLUMN name TEXT;
```

Update the `handle_new_user()` trigger to copy Google OAuth display name:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Existing schema used (no changes needed)

**`brands` table** (from `20260317_m2_dashboard.sql`):
- `name` ← brand name
- `colors` JSONB ← `{ primary, secondary, accent, background }` hex strings
- `fonts` JSONB ← `{ heading, body }` strings
- `logo_url` ← Supabase Storage URL
- `voice` ← writing style text

**`canvases` table** (from `20260317_m2_dashboard.sql`):
- `brand_id` ← links to newly created brand
- `name` ← `"{brandName} - Canvas 1"`

---

## State Management

### `useOnboardingState()` composable

Reactive object holding all wizard state. Not persisted to DB until "Finish Setup" — if user refreshes mid-onboarding, they restart from Screen 1.

```ts
interface OnboardingState {
  currentStep: number        // 1–7
  name: string               // Screen 2
  brandName: string           // Screen 3
  brandUrl: string            // Screen 4
  logoFile: File | null       // Screen 6 (file upload)
  logoUrl: string | null      // Screen 5 (from extraction)
  colors: BrandColors | null  // Screen 5/6
  fonts: BrandFonts | null    // Screen 5/6
  voice: string | null        // Screen 5/6
}
```

### Navigation
- Forward: Continue button (or Enter key on text inputs)
- Back: Back arrow top-left (goes to previous step)
- Skip: "I don't have a website" link on Screen 4 skips to Screen 6
- Route guard: `onboardingOnly` meta prevents onboarded users from revisiting `/onboarding`

---

## API Endpoints (Phase 3.2)

### `POST /api/extract-brand`
- Input: `{ url: string }`
- Uses Firecrawl MCP to scrape target website
- Sends screenshots + CSS data to Claude Vision API
- Returns: `{ logo_url, colors: { primary, secondary, accent, background }, fonts: { heading, body } }`
- Validates input URL, returns partial results on partial failure

### `POST /api/analyze-writing-style`
- Input: `{ url: string }`
- Uses Firecrawl MCP to scrape text content
- Sends to Claude API for tone/voice analysis
- Returns: `{ writing_style: string }`
- Server-side `ANTHROPIC_API_KEY`, timeout handling, graceful fallback

---

## File Structure

### New files
```
src/views/OnboardingView.vue            — Shell: manages step state, split layout, navigation
src/composables/useOnboardingState.ts   — Reactive onboarding state composable
src/components/onboarding/WelcomeStep.vue
src/components/onboarding/NameStep.vue
src/components/onboarding/BrandNameStep.vue
src/components/onboarding/BrandUrlStep.vue
src/components/onboarding/ExtractionStep.vue
src/components/onboarding/ReviewStep.vue
src/components/onboarding/EmailWireframe.vue    — Static email wireframe SVG for right panel
src/components/onboarding/BrandCard.vue         — Live brand card for right panel
src/components/onboarding/ClickToEdit.vue       — Reusable click-to-edit component
src/components/onboarding/ColorPicker.vue       — Color picker popover
api/extract-brand.ts                            — Vercel serverless function
api/analyze-writing-style.ts                    — Vercel serverless function
supabase/migrations/20260320_m3_onboarding.sql  — Add name column to users
```

### Modified files
```
src/views/OnboardingView.vue   — Replace stub with full implementation
src/stores/auth.ts             — Add name to UserProfile, update fetchProfile
src/stores/brands.ts           — Extend createBrand() to accept full brand data
src/types/kova/database.ts     — No changes needed (Brand type already complete)
src/router.ts                  — No route changes needed (route already exists)
```

---

## Testing Requirements

- Unit tests for `useOnboardingState` composable (state transitions, validation)
- Unit tests for each step component (rendering, input validation, navigation)
- Unit tests for API endpoints (extract-brand, analyze-writing-style)
- Integration test: full onboarding flow creates brand + canvas + sets onboarded
- Route guard test: onboarded user cannot access `/onboarding`
- Route guard test: un-onboarded user redirected from `/dashboard` to `/onboarding`
- Test partial extraction failure handling
- Test "enter manually" skip path

---

## Visual Reference

Mockups created during brainstorming are in:
`.superpowers/brainstorm/21779-1774009572/` and `.superpowers/brainstorm/24348-1774014628/`

Key files:
- `layout-split-v3.html` — Approved split-screen layout
- `extraction-approaches.html` — Extraction loading (Option A approved)
- `review-screen.html` — Review screen (Option B: grouped sections approved)
- `welcome-right-panel.html` — Right panel email wireframe (Option C: canvas view approved)
