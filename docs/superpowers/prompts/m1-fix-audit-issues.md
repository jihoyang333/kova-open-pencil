# M1 Audit Fix Prompt

> **Purpose:** Fix all issues identified in the M1 audit report. Run in a fresh Claude Code session on the `prdv4execution` branch in `kova-open-pencil-1/`.

---

## Step 1: Read the audit report

Read `kova-open-pencil-1/docs/superpowers/audits/2026-03-17-m1-audit-report.md` in full. It contains 2 HIGH, 4 MEDIUM, and 5 LOW issues. Fix all of them.

---

## Step 2: Fix all issues

### HIGH #1 — Add `data-test-id` to App.vue loading gate

**File:** `src/App.vue`
**Line:** The `<div v-if="auth.isLoading"` element (around line 22)
**Fix:** Add `data-test-id="app-loading-overlay"` to the div.

### HIGH #2 — Add `isLoading` guard to router

**File:** `src/router.ts`
**What:** The `beforeEach` guard doesn't check `auth.isLoading`. If navigation fires while auth is re-initializing, the guard makes decisions on stale state.
**Fix:** In `_router.beforeEach`, if `auth.isLoading` is `true`, return `false` (cancel navigation). The loading gate in `App.vue` already prevents user interaction during this state, so this is safe. Do NOT add an async wait/watch — keep it simple.

Example:
```ts
_router.beforeEach((to) => {
  const auth = useAuthStore()
  if (auth.isLoading) return false
  return resolveGuard(to, auth)
})
```

Also update `resolveGuard` tests in `tests/unit/router/guards.test.ts` to add a test case for the loading state if the guard logic changes.

### MEDIUM #1 — Make DB migration idempotent

**File:** `supabase/migrations/20260316_users.sql`
**Fix:** Change `CREATE TABLE public.users` to `CREATE TABLE IF NOT EXISTS public.users`.

### MEDIUM #2 — Auth store `error` state (SKIP)

The audit notes this deviates from the checklist but follows the design spec. **Do not change this.** The method-return-value pattern is correct.

### MEDIUM #3 — DB schema deviation from checklist (SKIP)

The implementation matches the design spec. The audit checklist had stale column names. **Do not change the schema.**

### MEDIUM #4 — Hardcoded `alt="Kova"` in EditorView

**File:** `src/views/EditorView.vue`
**Fix:** Import `APP_NAME` from `@/constants` and replace hardcoded `alt="Kova"` with `:alt="APP_NAME"` in all `<img>` tags in this file.

### LOW #1 — GoogleIcon raw SVG (SKIP)

Acceptable exception — Google brand icon isn't in Lucide. **Do not change.**

### LOW #2 — Unused `className` in GoogleIcon.vue

**File:** `src/components/icons/GoogleIcon.vue`
**Fix:** Remove the unused destructuring. The component should just use `defineProps<{ class?: string }>()` without destructuring, since the template already uses `$props.class`.

Change:
```ts
const { class: className } = defineProps<{ class?: string }>()
```
To:
```ts
defineProps<{ class?: string }>()
```

### LOW #3 — Pre-existing `any` in global.d.ts (SKIP)

Pre-existing code in the OpenPencil base layer. **Do not change.**

### LOW #4 — Remaining "OpenPencil" in non-user-visible strings (SKIP)

All are internal (HTTP headers, debug logs, AI prompt context). The design spec explicitly exempts these. **Do not change.**

### LOW #5 — Hardcoded "Kova" in ChatInput placeholder (SKIP)

Context-specific string. Using `APP_NAME` here would be awkward. **Do not change.**

---

## Step 3: Verify

After all fixes, run both of these and confirm they pass:

```sh
bun test ./tests/unit
bun run check
```

If the router guard change requires a new test, add it to `tests/unit/router/guards.test.ts`.

---

## Step 4: Commit

Create a single commit with message:

```
fix: address M1 audit findings (H1-H2, M1, M4, L2)
```

---

## Summary of changes (5 files)

| File | Change |
|------|--------|
| `src/App.vue` | Add `data-test-id="app-loading-overlay"` |
| `src/router.ts` | Add `isLoading` early-return in `beforeEach` |
| `supabase/migrations/20260316_users.sql` | `CREATE TABLE IF NOT EXISTS` |
| `src/views/EditorView.vue` | Import `APP_NAME`, use `:alt="APP_NAME"` |
| `src/components/icons/GoogleIcon.vue` | Remove unused `className` destructuring |
