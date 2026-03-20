# Fix M1/M2 QA Failures

You are fixing 4 issues found during a Playwright QA pass on Milestones 1 and 2 of the Kova app. Each issue has a root cause analysis and the exact files to change.

**Run from:** `cd kova-open-pencil-1`

**Dev server:** `bun run dev` (port 1420, or use `--port 1421` if 1420 is occupied)

**Quality gates before marking done:**
```sh
bun run check        # lint + typecheck
bun run test:unit    # unit tests (includes tests/unit/router/guards.test.ts)
```

**MCP servers available:** Use `shadcn-vue` MCP (`@jpisnice/shadcn-ui-mcp-server --framework vue`) for any new UI components if appropriate.

---

## Issue 1: `/editor` has no auth guard when accessed without `:canvasId`

**Severity:** HIGH — unauthenticated users can access the editor at `/editor` (no canvas ID)

**Root cause:** The router only defines `/editor/:canvasId` (line 86 of `src/router.ts`), which has `requiresAuth: true`. But navigating to bare `/editor` (no param) doesn't match that route, so it falls through with no guard and renders EditorView with an undefined canvasId.

**Evidence:** Playwright navigated to `http://localhost:1421/editor` while logged out → stayed at `/editor` (no redirect). Meanwhile `/editor/some-uuid` correctly requires auth because it matches the parameterized route.

**Fix in:** `src/router.ts`

**What to do:** Add a catch route for bare `/editor` that redirects to `/dashboard`. Place it before the `/editor/:canvasId` route:

```ts
{
  path: '/editor',
  redirect: '/dashboard'
},
```

**Test to update:** `tests/unit/router/guards.test.ts` — add a test that confirms `/editor` (no param) resolves properly. Note: this is a redirect, not a guard, so it may not need a `resolveGuard` test — but verify the route config handles it.

---

## Issue 2: Login → onboarding race condition for onboarded users

**Severity:** HIGH — after login, users are redirected to `/onboarding` even when `onboarded=true` in the database

**Root cause:** In `src/views/LoginView.vue` (line 41), after `auth.signIn()` succeeds, the code does:
```ts
void router.push('/dashboard')
```

But `signIn()` only calls `supabase.auth.signInWithPassword()` — it does NOT `await fetchProfile()`. The `onAuthStateChange` listener in `src/stores/auth.ts` (line 81) fires asynchronously and calls `void fetchProfile()` (fire-and-forget). So when `router.push('/dashboard')` executes, the profile hasn't loaded yet → `isOnboarded` is still `false` → the guard redirects to `/onboarding`.

**The sequence:**
1. `signIn()` resolves (Supabase auth token acquired)
2. `router.push('/dashboard')` fires immediately
3. Router guard checks `auth.isOnboarded` → `false` (profile not fetched yet)
4. Guard redirects to `/onboarding`
5. `onAuthStateChange` fires → `fetchProfile()` starts → profile loads → `isOnboarded` becomes `true` (too late)

**Fix in:** `src/stores/auth.ts` — method `signIn()`

**What to do:** After successful `signInWithPassword`, await `fetchProfile()` before returning, so the profile (including `onboarded`) is loaded before `LoginView` navigates:

```ts
async function signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (!error && data.session) {
    session.value = data.session
    user.value = data.session.user
    await fetchProfile()
  }
  return { error }
}
```

This ensures that by the time `LoginView` calls `router.push('/dashboard')`, the store already has `isOnboarded=true` and the guard allows navigation.

**Side effect to consider:** The `onAuthStateChange` listener will also fire for `SIGNED_IN` and call `fetchProfile()` again. This is harmless (idempotent read), but you could guard against double-fetch if desired (e.g., skip if `profile.value` is already set).

**Test to update:** `tests/unit/stores/auth.test.ts` — verify that `signIn()` populates `profile` before resolving.

---

## Issue 3: No empty state for zero-brands dashboard

**Severity:** MEDIUM — when a user has no brands, the dashboard main content area is completely blank (just the "Dashboard" heading). The brand-level empty state ("Create your first canvas") already exists and is excellent — but the top-level dashboard needs its own.

**What it looks like now:** White sidebar with just "+ New Brand" and "Trash". Main area: "Dashboard" header + nothing.

**What it should look like:** A centered empty state in the main content area (similar to the canvas empty state) with messaging like "Create your first brand" and a CTA button.

**Fix in:** `src/views/DashboardView.vue`

**What to do:** When `brandsStore.sortedBrands.length === 0` and not loading, show an empty state instead of `<router-view />`. You can reuse the existing `EmptyState.vue` component (`src/components/dashboard/EmptyState.vue`) which already accepts `title`, `description`, and `action-label` props:

In the `<main>` section of DashboardView.vue (currently lines 63-70), after the loading spinner, add:
```vue
<EmptyState
  v-else-if="brandsStore.sortedBrands.length === 0"
  title="Create your first brand"
  description="Organize your email designs by brand. Start by creating a new brand."
  action-label="New Brand"
  @action="handleNewBrand"
/>
<router-view v-else />
```

You'll need to:
1. Import `EmptyState` from `@/components/dashboard/EmptyState.vue`
2. Add a `handleNewBrand()` method that triggers the same inline-create flow as the sidebar's "+ New Brand" button. The simplest approach: programmatically call the BrandList's `startCreating` function. Alternatively, emit an event or use the brands store directly to create a brand with a default name and navigate to it.

**Reference:** The PRD (KOVA_MVP_PRD_v4.md, Task 2.2.2) says: "Empty state if no clients (shouldn't happen post-onboarding, but handle gracefully)."

**Use shadcn-vue MCP** if you want to enhance the EmptyState component visually.

---

## Issue 4: Sidebar nav items don't match PRD specification

**Severity:** MEDIUM — The QA checklist expected sidebar nav items: **Clients**, **Brand Assets**, **Settings**. The actual sidebar has: **[brand list]**, **Assets** (sub-item under selected brand), **+ New Brand**, **Trash**.

**Context:** The PRD v4 uses "Clients" terminology but the implementation uses "Brands". The PRD (Task 2.2.2) says the sidebar should have a client list. This may be an intentional rename (Brand = Client). However, two items are missing:

1. **Settings** — no Settings nav item exists in the sidebar at all
2. The naming inconsistency (Clients vs Brands) should be resolved

**Fix in:** `src/components/dashboard/BrandList.vue`

**What to do:**

Add a **Settings** link in the sidebar bottom actions section (after Trash, before the closing `</div>`). Settings view doesn't exist yet, so create a stub:

1. Create `src/views/dashboard/SettingsView.vue` — a simple placeholder page:
```vue
<script setup lang="ts">
</script>
<template>
  <div data-test-id="settings-view" class="flex h-full flex-col items-center justify-center text-gray-500">
    <icon-lucide-settings class="mb-3 size-8" />
    <h2 class="text-lg font-semibold text-gray-900">Settings</h2>
    <p class="mt-1 text-sm">Coming soon</p>
  </div>
</template>
```

2. Add the route in `src/router.ts`, as a child of `/dashboard`:
```ts
{
  path: 'settings',
  component: SettingsView,
  meta: { requiresAuth: true, requiresOnboarding: true }
}
```

3. Add a Settings button in `BrandList.vue` bottom actions (after Trash):
```vue
<button
  data-test-id="settings-link"
  class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
  :class="
    route.path.endsWith('/settings')
      ? 'bg-gray-100 font-medium text-gray-900'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  "
  @click="navigateToSettings"
>
  <icon-lucide-settings class="size-4" />
  Settings
</button>
```

4. Add `navigateToSettings()`:
```ts
function navigateToSettings(): void {
  void router.push('/dashboard/settings')
}
```

**On the Clients vs Brands naming:** The PRD v4 uses "Clients" but the codebase consistently uses "Brands". Since the PRD is the source of truth, confirm with the user whether to rename Brands→Clients across the codebase, or accept Brands as the final terminology. **Do not rename without confirmation** — it touches stores, components, migrations, and routes.

---

## Files Summary

| File | Changes |
|------|---------|
| `src/router.ts` | Add `/editor` catch redirect; add `/dashboard/settings` child route |
| `src/stores/auth.ts` | Await `fetchProfile()` inside `signIn()` |
| `src/views/DashboardView.vue` | Add zero-brands empty state using EmptyState component |
| `src/components/dashboard/BrandList.vue` | Add Settings nav button |
| `src/views/dashboard/SettingsView.vue` | **NEW** — Settings stub view |
| `tests/unit/router/guards.test.ts` | Add test for bare `/editor` redirect |
| `tests/unit/stores/auth.test.ts` | Add test that `signIn()` populates profile |

## Verification

After all fixes, re-run the QA by starting the dev server and running:
```sh
python3 /tmp/kova-qa/m1_full_qa.py   # M1 auth + branding (update BASE_URL port if needed)
python3 /tmp/kova-qa/m2_full_qa.py   # M2 authenticated flows
```

Or manually verify in a browser:
1. Go to `/editor` while logged out → should redirect to `/dashboard` → then to `/login`
2. Log in with valid credentials → should go straight to `/dashboard` (not `/onboarding`)
3. Dashboard with zero brands → should show empty state with "Create your first brand"
4. Sidebar should have Settings link at the bottom
