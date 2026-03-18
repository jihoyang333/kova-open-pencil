# M1/M2 Playwright QA — Retroactive Validation

You are performing a retroactive QA pass on Milestone 1 (Core Infrastructure) and Milestone 2 (Dashboard & Brand Management) of the Kova app. These milestones were built WITHOUT Playwright MCP active. Your job is to use Playwright to visually and functionally verify the output.

## Setup

1. Start the dev server: `cd kova-open-pencil-1 && bun run dev` (runs on localhost:1420)
2. Use Playwright MCP to navigate and screenshot every screen listed below
3. For each screen, check the acceptance criteria and report PASS/FAIL with evidence

## M1 Checks

### Auth Flows
- [ ] Navigate to `/login` — screenshot. Verify: light/white theme, Kova branding, email + password fields, Google OAuth button, "Sign up" link
- [ ] Navigate to `/signup` — screenshot. Verify: light/white theme, matching design language with login, email + password fields, Google OAuth button, "Log in" link
- [ ] Submit signup with a test email — verify email confirmation screen appears
- [ ] Submit login with invalid credentials — verify error message is user-friendly, no technical details leaked
- [ ] Submit login with valid credentials — verify redirect to `/dashboard`
- [ ] Navigate to `/editor` while logged out — verify redirect to `/login`
- [ ] Navigate to `/dashboard` while logged out — verify redirect to `/login`

### Branding
- [ ] Check browser tab — verify title says "Kova" (not "OpenPencil")
- [ ] Check favicon in browser tab — verify it's Kova branded
- [ ] Screenshot the login page — verify no "OpenPencil" text visible anywhere

### Route Guards
- [ ] While logged in, navigate to `/login` — verify redirect to `/dashboard`
- [ ] While logged in, navigate to `/signup` — verify redirect to `/dashboard`

## M2 Checks

### Dashboard
- [ ] Navigate to `/dashboard` (logged in) — screenshot. Verify: light/white theme, sidebar navigation, main content area, Kova branding
- [ ] Check sidebar has: Clients, Brand Assets (nav item exists even if M4 deferred), Settings
- [ ] Click on Clients in sidebar — verify client list view loads
- [ ] If clients exist, click one — verify client detail view with canvases
- [ ] Check "New Client" or "Add Client" flow — verify it creates a client
- [ ] Check "New Canvas" or "New Design" flow from a client — verify it creates a canvas and navigates to editor

### Dashboard → Editor Integration
- [ ] From dashboard, open a canvas — verify editor loads at `/editor/:id`
- [ ] In editor, verify the canvas is associated with the correct client
- [ ] Navigate back to dashboard from editor — verify dashboard loads correctly

### Empty States
- [ ] With no clients — screenshot dashboard. Verify there's an empty state, not a blank page
- [ ] With a client but no canvases — screenshot client view. Verify empty state messaging

### Responsive / Visual
- [ ] Screenshot dashboard at 1440px width
- [ ] Screenshot dashboard at 1024px width
- [ ] Screenshot dashboard at 768px width — check nothing breaks

## Reporting

For each check, output:
```
[PASS/FAIL] Check name
  Screenshot: (describe what you see)
  Issue: (if FAIL — what's wrong and severity HIGH/MEDIUM/LOW)
```

At the end, provide a summary:
- Total checks: X
- Passed: X
- Failed: X
- Critical issues (blocks user flow): list
- Visual issues (doesn't block but looks wrong): list
