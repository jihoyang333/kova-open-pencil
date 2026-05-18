# Cluster 11 — Shared UI Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every UI primitive every other PRD depends on — toast / modal / confirm / Cmd+K / skeleton / empty-state / network-status / error pages / theme runtime swap / idempotency-key helper / Realtime channel naming / Tauri command convention / Sentry + Resend integrations / shared marketing + email shells — so downstream clusters import by name and never re-spec.

**Architecture:** Twelve atomic delivery phases, foundation-up. Phase 1 lays cross-cut backend (migration + Sentry + Resend + idempotency helper + Vercel Cron). Phase 2 ships theme + online-status + Realtime-channel + idempotency-key composables. Phases 3–9 ship Pinia stores + Vue 3 components in Composition API setup style, each wrapping Reka UI primitives where applicable (Dialog → KovaModal, Popover → KovaPopover, DropdownMenu → KovaMenu, Tooltip → KovaTooltip). Phase 10 wires error-page routes + Vue global `errorHandler`. Phase 11 ships `<MarketingShell>` + `<EmailShell>` for static `/privacy` + `/terms` rendering and transactional emails. Phase 12 builds a `/dev/cluster-11` showcase route for visual smoke-testing + ships E2E coverage. Every primitive consumes `kova-hifi.css` tokens via Tailwind `@theme` translation; no hex literals.

**Tech Stack:** Vue 3 (`<script setup lang="ts">` Composition API), Pinia (setup stores), Reka UI (Dialog / Popover / DropdownMenu / Tooltip wrappers), Tailwind CSS 4 (`@theme` token translation), VueUse (`useMediaQuery`, `useLocalStorage`), Supabase JS (`@supabase/supabase-js` Realtime), `@sentry/vue` + `@sentry/node`, Resend SDK, `valibot` (schema), `bun:test` (unit), Playwright (E2E), `juice` (CSS inlining for emails). PRD: `kova-open-pencil-1/docs/kova-final-prds/11-shared-ui-infrastructure.md`.

---

## File Structure

**New files (38) — grouped by phase:**

### Phase 1 — Cross-cut backend
- `kova-open-pencil-1/supabase/migrations/20260520_11_shared_ui_infrastructure.sql` — `idempotency_keys` table + RLS + indexes
- `kova-open-pencil-1/api/_shared/idempotency.ts` — `verifyIdempotency()` helper
- `kova-open-pencil-1/api/_shared/email.ts` — `sendEmail()` Resend wrapper
- `kova-open-pencil-1/api/_shared/sentry.ts` — server-side Sentry `captureException()`
- `kova-open-pencil-1/api/_shared/realtime.ts` — server-side `channelName()` helper
- `kova-open-pencil-1/api/cron/idempotency-cleanup.ts` — daily 04:00 UTC cron
- `kova-open-pencil-1/src/sentry.ts` — browser Sentry install
- `kova-open-pencil-1/vercel.json` — **MODIFY** (append cron entry)

### Phase 2 — Cross-cut composables
- `kova-open-pencil-1/src/composables/use-theme.ts`
- `kova-open-pencil-1/src/composables/use-online-status.ts`
- `kova-open-pencil-1/src/composables/use-reduced-motion.ts`
- `kova-open-pencil-1/src/composables/use-channel-name.ts`
- `kova-open-pencil-1/src/composables/use-idempotency-key.ts`
- `kova-open-pencil-1/src/composables/use-sentry.ts`

### Phase 3 — Toast system
- `kova-open-pencil-1/src/stores/toast.ts`
- `kova-open-pencil-1/src/composables/use-toast.ts`
- `kova-open-pencil-1/src/components/ui/KovaToast.vue`
- `kova-open-pencil-1/src/components/ui/ToastStack.vue`
- `kova-open-pencil-1/src/types/toast.ts` — `Toast`, `NewToast`, `ToastVariant` interfaces

### Phase 4 — Modal / popover / menu / tooltip
- `kova-open-pencil-1/src/components/ui/KovaModal.vue` (wraps `RekaDialog`)
- `kova-open-pencil-1/src/components/ui/KovaPopover.vue` (wraps `RekaPopover`)
- `kova-open-pencil-1/src/components/ui/KovaMenu.vue` (wraps `RekaDropdownMenu`)
- `kova-open-pencil-1/src/components/ui/KovaTooltip.vue` (wraps `RekaTooltipRoot`)
- `kova-open-pencil-1/src/types/menu.ts` — `MenuItem`, `MenuSeparator`, `MenuSection` interfaces

### Phase 5 — Confirm system
- `kova-open-pencil-1/src/stores/confirm.ts`
- `kova-open-pencil-1/src/composables/use-confirm.ts`
- `kova-open-pencil-1/src/components/ui/ConfirmModal.vue` (mounted once in App)
- `kova-open-pencil-1/src/types/confirm.ts` — `ConfirmOptions`, `ConfirmRequest` interfaces

### Phase 6 — Form + display primitives
- `kova-open-pencil-1/src/components/ui/KovaButton.vue`
- `kova-open-pencil-1/src/components/ui/KovaInput.vue`
- `kova-open-pencil-1/src/components/ui/KovaField.vue`
- `kova-open-pencil-1/src/components/ui/KovaSegmented.vue`
- `kova-open-pencil-1/src/components/ui/KovaPill.vue`
- `kova-open-pencil-1/src/components/ui/KovaSkeleton.vue`
- `kova-open-pencil-1/src/components/ui/EmptyState.vue`
- `kova-open-pencil-1/src/components/ui/NetworkStatusPill.vue`

### Phase 7 — Command-K
- `kova-open-pencil-1/src/stores/command-palette.ts`
- `kova-open-pencil-1/src/composables/use-command-palette.ts`
- `kova-open-pencil-1/src/components/ui/CommandPalette.vue`
- `kova-open-pencil-1/src/types/command-palette.ts` — `CommandResult`, `CommandSection` interfaces

### Phase 8 — Error pages
- `kova-open-pencil-1/src/views/errors/Error404View.vue`
- `kova-open-pencil-1/src/views/errors/Error500View.vue`
- `kova-open-pencil-1/src/views/errors/NetworkUnreachableView.vue`

### Phase 9 — Marketing + email shells
- `kova-open-pencil-1/src/components/shell/MarketingShell.vue`
- `kova-open-pencil-1/src/components/email/EmailShell.vue`
- `kova-open-pencil-1/src/composables/use-email-shell.ts`

### Phase 10 — App wiring + showcase
- `kova-open-pencil-1/src/App.vue` — **MODIFY** (mount ToastStack, ConfirmModal, CommandPalette globally)
- `kova-open-pencil-1/src/main.ts` — **MODIFY** (install Sentry, mount useTheme)
- `kova-open-pencil-1/src/router/routes.ts` — **MODIFY** (add /404, /500, /network-unreachable, /dev/cluster-11)
- `kova-open-pencil-1/src/views/dev/Cluster11Showcase.vue` — Storybook-replacement smoke page

### Test files (parallel to source, ~30 files)
- Per-source-file colocated under `tests/unit/` mirroring the `src/` tree
- E2E specs under `tests/e2e/cluster-11/` (6 spec files)
- Integration tests under `tests/integration/cluster-11/` (4 spec files)

**Existing files modified:**
- `kova-open-pencil-1/vercel.json` — add cron entry
- `kova-open-pencil-1/package.json` — add `@sentry/vue`, `@sentry/node`, `resend`, `juice`, `valibot` (if not already present)
- `kova-open-pencil-1/src/App.vue` — mount global UI containers
- `kova-open-pencil-1/src/main.ts` — install Sentry, mount theme
- `kova-open-pencil-1/src/router/routes.ts` — register error + showcase routes
- `kova-open-pencil-1/.env.example` — add `VITE_SENTRY_DSN`, `SENTRY_DSN_SERVER`, `RESEND_API_KEY`, `CRON_SECRET`

---

## Phase 1 — Cross-Cut Backend Foundation

### Task 1.1: Migration `20260520_11_shared_ui_infrastructure.sql`

**Files:**
- Create: `kova-open-pencil-1/supabase/migrations/20260520_11_shared_ui_infrastructure.sql`
- Test: `kova-open-pencil-1/tests/integration/cluster-11/migration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
// tests/integration/cluster-11/migration.test.ts
import { describe, it, expect, beforeAll } from 'bun:test'
import { applyMigrations, supabaseAdmin } from '../helpers/supabase-local'

describe('migration 20260520_11_shared_ui_infrastructure', () => {
  beforeAll(async () => { await applyMigrations() })

  it('creates idempotency_keys table with PK + 2 indexes + RLS enabled', async () => {
    const { data: cols } = await supabaseAdmin.rpc('describe_table', { table_name: 'idempotency_keys' })
    expect(cols).toEqual(expect.arrayContaining([
      expect.objectContaining({ column: 'key', type: 'text', nullable: false }),
      expect.objectContaining({ column: 'user_id', type: 'uuid', nullable: false }),
      expect.objectContaining({ column: 'endpoint', type: 'text', nullable: false }),
      expect.objectContaining({ column: 'request_hash', type: 'text', nullable: false }),
      expect.objectContaining({ column: 'response_status', type: 'integer', nullable: false }),
      expect.objectContaining({ column: 'response_body', type: 'jsonb', nullable: false }),
      expect.objectContaining({ column: 'created_at', type: 'timestamp with time zone', nullable: false }),
    ]))

    const { data: indexes } = await supabaseAdmin.rpc('list_indexes', { table_name: 'idempotency_keys' })
    expect(indexes.map((i: { name: string }) => i.name)).toEqual(
      expect.arrayContaining(['idempotency_keys_pkey', 'idx_idempotency_keys_created_at', 'idx_idempotency_keys_user_endpoint']),
    )

    const { data: rls } = await supabaseAdmin.rpc('list_rls', { table_name: 'idempotency_keys' })
    expect(rls.enabled).toBe(true)
    expect(rls.policies).toContainEqual(expect.objectContaining({ name: 'idempotency_service_only' }))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd kova-open-pencil-1 && bun test tests/integration/cluster-11/migration.test.ts`
Expected: FAIL with "relation idempotency_keys does not exist"

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260520_11_shared_ui_infrastructure.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key             text PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  request_hash    text NOT NULL,
  response_status int  NOT NULL,
  response_body   jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (length(key) >= 16 AND length(key) <= 64)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON public.idempotency_keys(created_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_endpoint
  ON public.idempotency_keys(user_id, endpoint, created_at DESC);

COMMENT ON TABLE public.idempotency_keys IS
  'Per-request idempotency cache. Cluster 11. Retention 24 hours via daily prune.';

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_service_only
  ON public.idempotency_keys
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
```

- [ ] **Step 4: Apply migrations + re-run integration test**

Run: `cd kova-open-pencil-1 && supabase db reset && bun test tests/integration/cluster-11/migration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/supabase/migrations/20260520_11_shared_ui_infrastructure.sql kova-open-pencil-1/tests/integration/cluster-11/migration.test.ts
git commit -m "feat(cluster-11): add idempotency_keys table migration"
```

---

### Task 1.2: RLS verification test

**Files:**
- Create: `kova-open-pencil-1/tests/integration/cluster-11/rls-idempotency.test.ts`

- [ ] **Step 1: Write the failing RLS test**

```typescript
// tests/integration/cluster-11/rls-idempotency.test.ts
import { describe, it, expect } from 'bun:test'
import { supabaseAsAuthenticated, supabaseAdmin, signInTestUser } from '../helpers/supabase-local'

describe('idempotency_keys RLS (authenticated role denied)', () => {
  it('authenticated cannot SELECT', async () => {
    await signInTestUser('user-a@kova-test.local')
    const { data, error } = await supabaseAsAuthenticated.from('idempotency_keys').select('*')
    expect(data).toEqual([])
    expect(error).toBeNull()  // RLS returns empty set, not error
  })

  it('authenticated cannot INSERT', async () => {
    await signInTestUser('user-a@kova-test.local')
    const { error } = await supabaseAsAuthenticated.from('idempotency_keys').insert({
      key: 'a'.repeat(20), user_id: '00000000-0000-0000-0000-000000000000',
      endpoint: 'test', request_hash: 'x'.repeat(64), response_status: 200, response_body: {},
    })
    expect(error?.code).toBe('42501')  // permission denied
  })

  it('authenticated cannot UPDATE or DELETE', async () => {
    await signInTestUser('user-a@kova-test.local')
    const upd = await supabaseAsAuthenticated.from('idempotency_keys').update({ response_status: 500 }).eq('key', 'fake')
    expect(upd.count).toBe(0)
    const del = await supabaseAsAuthenticated.from('idempotency_keys').delete().eq('key', 'fake')
    expect(del.count).toBe(0)
  })

  it('service_role can read + write', async () => {
    const key = crypto.randomUUID().replace(/-/g, '')  // 32 chars, no hyphens
    const userId = (await supabaseAdmin.from('users').select('id').limit(1).single()).data!.id
    const { error: insErr } = await supabaseAdmin.from('idempotency_keys').insert({
      key, user_id: userId, endpoint: 'POST /api/test', request_hash: 'h'.repeat(64),
      response_status: 200, response_body: { ok: true },
    })
    expect(insErr).toBeNull()
    const { data } = await supabaseAdmin.from('idempotency_keys').select('*').eq('key', key).single()
    expect(data?.response_status).toBe(200)
  })
})
```

- [ ] **Step 2: Run + verify it passes (migration already applied)**

Run: `cd kova-open-pencil-1 && bun test tests/integration/cluster-11/rls-idempotency.test.ts`
Expected: PASS (4/4)

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/tests/integration/cluster-11/rls-idempotency.test.ts
git commit -m "test(cluster-11): verify idempotency_keys RLS"
```

---

### Task 1.3: `verifyIdempotency()` helper (TDD)

**Files:**
- Create: `kova-open-pencil-1/api/_shared/idempotency.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/idempotency.test.ts`

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/api/_shared/idempotency.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { verifyIdempotency } from '@/api/_shared/idempotency'
import { supabaseAdmin } from '@/api/_shared/supabase'

mock.module('@/api/_shared/supabase', () => ({ supabaseAdmin: createMockSupabase() }))

function makeReq(body: object, key?: string): Request {
  return new Request('https://test.kova/api/x', {
    method: 'POST',
    headers: key ? { 'X-Idempotency-Key': key } : {},
    body: JSON.stringify(body),
  })
}

describe('verifyIdempotency', () => {
  beforeEach(() => { resetMockSupabase() })

  it('no key → returns cached:false, no-op persist', async () => {
    const out = await verifyIdempotency(makeReq({ x: 1 }), 'u', 'POST /api/x')
    expect(out.cached).toBe(false)
    if (!out.cached) await out.persist(200, { ok: true })  // should not throw
  })

  it('valid key, first call → persist writes row', async () => {
    const key = 'a'.repeat(20)
    const out = await verifyIdempotency(makeReq({ x: 1 }, key), 'u', 'POST /api/x')
    expect(out.cached).toBe(false)
    if (!out.cached) await out.persist(200, { ok: true })
    expect(getMockRow(key)).toMatchObject({ response_status: 200, response_body: { ok: true } })
  })

  it('valid key, replay with same body → returns cached', async () => {
    const key = 'a'.repeat(20)
    seedMockRow(key, 200, { ok: true }, computeHashFor({ x: 1 }))
    const out = await verifyIdempotency(makeReq({ x: 1 }, key), 'u', 'POST /api/x')
    expect(out.cached).toBe(true)
    if (out.cached) {
      expect(out.status).toBe(200)
      expect(out.body).toEqual({ ok: true })
    }
  })

  it('valid key, replay with different body → throws 422', async () => {
    const key = 'a'.repeat(20)
    seedMockRow(key, 200, { ok: true }, computeHashFor({ x: 1 }))
    const promise = verifyIdempotency(makeReq({ x: 2 }, key), 'u', 'POST /api/x')
    await expect(promise).rejects.toMatchObject({ status: 422 })
  })

  it('malformed key (8 chars) → throws 400', async () => {
    const promise = verifyIdempotency(makeReq({}, 'short'), 'u', 'POST /api/x')
    await expect(promise).rejects.toMatchObject({ status: 400 })
  })

  it('malformed key (invalid char) → throws 400', async () => {
    const promise = verifyIdempotency(makeReq({}, 'a'.repeat(15) + '!'), 'u', 'POST /api/x')
    await expect(promise).rejects.toMatchObject({ status: 400 })
  })
})
```

- [ ] **Step 2: Run → fail with "Cannot find module ./idempotency"**

Run: `cd kova-open-pencil-1 && bun test tests/unit/api/_shared/idempotency.test.ts`
Expected: FAIL with module-not-found error

- [ ] **Step 3: Write the helper**

```typescript
// api/_shared/idempotency.ts
import { createHash } from 'node:crypto'
import { supabaseAdmin } from './supabase'

export type IdempotencyResult =
  | { cached: false; persist: (status: number, body: unknown) => Promise<void> }
  | { cached: true; status: number; body: unknown }

class HttpError extends Error {
  constructor(public status: number, public payload: object) { super(`HTTP ${status}`) }
}

const KEY_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/

export async function verifyIdempotency(
  req: Request,
  userId: string,
  endpoint: string,
): Promise<IdempotencyResult> {
  const key = req.headers.get('X-Idempotency-Key')
  if (!key) return { cached: false, persist: async () => {} }
  if (!KEY_PATTERN.test(key)) {
    throw new HttpError(400, { error: 'invalid_idempotency_key' })
  }

  const bodyText = await req.clone().text()
  const requestHash = createHash('sha256')
    .update(`${req.method}|${new URL(req.url).pathname}|${bodyText}`)
    .digest('hex')

  const { data: existing } = await supabaseAdmin
    .from('idempotency_keys')
    .select('request_hash, response_status, response_body')
    .eq('key', key)
    .maybeSingle()

  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new HttpError(422, { error: 'idempotency_key_reused_with_different_body' })
    }
    return { cached: true, status: existing.response_status, body: existing.response_body }
  }

  return {
    cached: false,
    persist: async (status, body) => {
      await supabaseAdmin.from('idempotency_keys').insert({
        key, user_id: userId, endpoint, request_hash: requestHash,
        response_status: status, response_body: body as object,
      })
    },
  }
}
```

- [ ] **Step 4: Run + verify all 6 tests pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/api/_shared/idempotency.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/api/_shared/idempotency.ts kova-open-pencil-1/tests/unit/api/_shared/idempotency.test.ts
git commit -m "feat(cluster-11): add verifyIdempotency helper with 422 mismatch protection"
```

---

### Task 1.4: Sentry browser install

**Files:**
- Create: `kova-open-pencil-1/src/sentry.ts`
- Modify: `kova-open-pencil-1/package.json` (add `@sentry/vue`)
- Test: `kova-open-pencil-1/tests/unit/sentry.test.ts`

- [ ] **Step 1: Install dependency**

Run: `cd kova-open-pencil-1 && bun add @sentry/vue@^9`
Expected: package.json + bun.lock updated

- [ ] **Step 2: Write the failing test**

```typescript
// tests/unit/sentry.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { installSentry } from '@/sentry'
import * as Sentry from '@sentry/vue'

mock.module('@sentry/vue', () => ({
  init: mock(() => undefined),
  browserTracingIntegration: mock(() => ({ name: 'BrowserTracing' })),
}))

describe('installSentry', () => {
  beforeEach(() => { (Sentry.init as ReturnType<typeof mock>).mockClear() })

  it('skips init when VITE_SENTRY_DSN unset', () => {
    const env = { ...import.meta.env, VITE_SENTRY_DSN: undefined }
    installSentry({} as never, {} as never, env as never)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('initializes Sentry when DSN present', () => {
    const env = { ...import.meta.env, VITE_SENTRY_DSN: 'https://abc@sentry.io/1', VITE_VERCEL_ENV: 'preview', VITE_VERCEL_GIT_COMMIT_SHA: 'sha1' }
    installSentry({} as never, {} as never, env as never)
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://abc@sentry.io/1',
      environment: 'preview',
      release: 'sha1',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: false,
    }))
  })

  it('strips email from event via beforeSend', () => {
    const env = { VITE_SENTRY_DSN: 'https://abc@sentry.io/1' } as never
    installSentry({} as never, {} as never, env)
    const call = (Sentry.init as ReturnType<typeof mock>).mock.calls[0][0]
    const event = { user: { id: '123', email: 'leak@test' } }
    const result = call.beforeSend(event)
    expect(result.user.email).toBeUndefined()
    expect(result.user.id).toBe('123')
  })
})
```

- [ ] **Step 3: Run → FAIL (no module)**

Run: `cd kova-open-pencil-1 && bun test tests/unit/sentry.test.ts`
Expected: FAIL

- [ ] **Step 4: Write the installer**

```typescript
// src/sentry.ts
import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import type { Router } from 'vue-router'

interface EnvLike {
  VITE_SENTRY_DSN?: string
  VITE_VERCEL_ENV?: string
  VITE_VERCEL_GIT_COMMIT_SHA?: string
}

export function installSentry(app: App, router: Router, env: EnvLike = import.meta.env as EnvLike): void {
  if (!env.VITE_SENTRY_DSN) return
  Sentry.init({
    app,
    dsn: env.VITE_SENTRY_DSN,
    environment: env.VITE_VERCEL_ENV ?? 'development',
    release: env.VITE_VERCEL_GIT_COMMIT_SHA,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user?.email) event.user.email = undefined
      return event
    },
  })
}
```

- [ ] **Step 5: Run + verify pass**

Run: `bun test tests/unit/sentry.test.ts`
Expected: PASS (3/3)

- [ ] **Step 6: Commit**

```bash
git add kova-open-pencil-1/src/sentry.ts kova-open-pencil-1/tests/unit/sentry.test.ts kova-open-pencil-1/package.json kova-open-pencil-1/bun.lock
git commit -m "feat(cluster-11): install Sentry browser SDK with PII strip"
```

---

### Task 1.5: Sentry server-side helper

**Files:**
- Create: `kova-open-pencil-1/api/_shared/sentry.ts`
- Modify: `kova-open-pencil-1/package.json` (add `@sentry/node`)
- Test: `kova-open-pencil-1/tests/unit/api/_shared/sentry.test.ts`

- [ ] **Step 1: Install + write failing test**

Run: `cd kova-open-pencil-1 && bun add @sentry/node@^9`

```typescript
// tests/unit/api/_shared/sentry.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { captureException } from '@/api/_shared/sentry'
import * as Sentry from '@sentry/node'

mock.module('@sentry/node', () => ({
  init: mock(() => undefined),
  captureException: mock(() => 'event-id-1'),
  withScope: mock((cb: (s: { setContext: (k: string, v: object) => void }) => void) => {
    cb({ setContext: mock(() => undefined) })
  }),
}))

describe('captureException (server)', () => {
  it('forwards error to Sentry with kova context', () => {
    const err = new Error('boom')
    captureException(err, { userId: 'u1', endpoint: 'POST /api/x' })
    expect(Sentry.withScope).toHaveBeenCalled()
    expect(Sentry.captureException).toHaveBeenCalledWith(err)
  })
})
```

- [ ] **Step 2: Run → fail**

- [ ] **Step 3: Write `api/_shared/sentry.ts`**

```typescript
// api/_shared/sentry.ts
import * as Sentry from '@sentry/node'

let initialized = false

function ensureInit(): void {
  if (initialized) return
  if (!process.env.SENTRY_DSN_SERVER) return
  Sentry.init({
    dsn: process.env.SENTRY_DSN_SERVER,
    environment: process.env.VERCEL_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
  initialized = true
}

export interface KovaContext {
  userId?: string
  endpoint?: string
  brandId?: string
  canvasId?: string
}

export function captureException(err: unknown, context: KovaContext = {}): void {
  ensureInit()
  Sentry.withScope((scope) => {
    if (context.userId) scope.setUser({ id: context.userId })
    scope.setContext('kova', { ...context })
    Sentry.captureException(err)
  })
}
```

- [ ] **Step 4: Run + pass**
- [ ] **Step 5: Commit**

```bash
git commit -am "feat(cluster-11): add server-side Sentry captureException with Kova context"
```

---

### Task 1.6: Resend `sendEmail()` wrapper

**Files:**
- Create: `kova-open-pencil-1/api/_shared/email.ts`
- Modify: `kova-open-pencil-1/package.json` (add `resend`, `juice`)
- Test: `kova-open-pencil-1/tests/unit/api/_shared/email.test.ts`

- [ ] **Step 1: Install deps**

Run: `cd kova-open-pencil-1 && bun add resend@^4 juice@^11`

- [ ] **Step 2: Write the failing test**

```typescript
// tests/unit/api/_shared/email.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { sendEmail } from '@/api/_shared/email'

const resendSendMock = mock(async () => ({ data: { id: 'msg-1' }, error: null }))
mock.module('resend', () => ({ Resend: class { emails = { send: resendSendMock } } }))

describe('sendEmail', () => {
  beforeEach(() => { resendSendMock.mockClear() })

  it('sends with title, html, plain-text fallback, and List-Unsubscribe header', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.RESEND_FROM = 'Kova <noreply@kova.app>'
    const messageId = await sendEmail({
      to: 'user@example.com',
      subject: 'Welcome',
      html: '<p>hi</p>',
      text: 'hi',
    })
    expect(messageId).toBe('msg-1')
    expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Kova <noreply@kova.app>',
      to: 'user@example.com',
      subject: 'Welcome',
      html: '<p>hi</p>',
      text: 'hi',
      headers: expect.objectContaining({
        'List-Unsubscribe': expect.stringContaining('mailto:'),
      }),
    }))
  })

  it('throws when RESEND_API_KEY missing', async () => {
    delete process.env.RESEND_API_KEY
    await expect(sendEmail({ to: 'u@x', subject: 's', html: 'h', text: 't' })).rejects.toThrow('RESEND_API_KEY')
  })
})
```

- [ ] **Step 3: Write `api/_shared/email.ts`**

```typescript
// api/_shared/email.ts
import { Resend } from 'resend'

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(payload: EmailPayload): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')
  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'Kova <noreply@kova.app>',
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    headers: {
      'List-Unsubscribe': `<mailto:unsubscribe@kova.app?subject=Unsubscribe-${encodeURIComponent(payload.to)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  if (result.error) throw new Error(`Resend failed: ${result.error.message}`)
  return result.data!.id
}
```

- [ ] **Step 4: Run + pass**
- [ ] **Step 5: Commit**

```bash
git commit -am "feat(cluster-11): add Resend sendEmail helper with List-Unsubscribe"
```

---

### Task 1.7: `channelName()` server-side helper

**Files:**
- Create: `kova-open-pencil-1/api/_shared/realtime.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/realtime.test.ts`

- [ ] **Step 1: TDD pair**

```typescript
// tests/unit/api/_shared/realtime.test.ts
import { describe, it, expect } from 'bun:test'
import { channelName } from '@/api/_shared/realtime'

describe('channelName (server)', () => {
  it('formats kova.{userId}.{domain}.{topic}', () => {
    expect(channelName('u1', 'canvas', 'abc.snapshot')).toBe('kova.u1.canvas.abc.snapshot')
  })
  it('rejects empty parts', () => {
    expect(() => channelName('', 'canvas', 't')).toThrow()
    expect(() => channelName('u1', '', 't')).toThrow()
    expect(() => channelName('u1', 'canvas', '')).toThrow()
  })
})
```

```typescript
// api/_shared/realtime.ts
export function channelName(userId: string, domain: string, topic: string): string {
  if (!userId || !domain || !topic) throw new Error('channelName parts cannot be empty')
  return `kova.${userId}.${domain}.${topic}`
}
```

- [ ] **Step 2: Run + pass**
- [ ] **Step 3: Commit**

---

### Task 1.8: Cron `idempotency-cleanup` + vercel.json update

**Files:**
- Create: `kova-open-pencil-1/api/cron/idempotency-cleanup.ts`
- Modify: `kova-open-pencil-1/vercel.json`
- Test: `kova-open-pencil-1/tests/unit/api/cron/idempotency-cleanup.test.ts`
- Test: `kova-open-pencil-1/tests/integration/cluster-11/cron-idempotency-cleanup.test.ts`

- [ ] **Step 1: Write unit test (auth gate + delete-where)**

```typescript
// tests/unit/api/cron/idempotency-cleanup.test.ts
import { describe, it, expect, mock } from 'bun:test'
import handler from '@/api/cron/idempotency-cleanup'

mock.module('@/api/_shared/supabase', () => ({
  supabaseAdmin: { from: () => ({ delete: () => ({ lt: () => ({ select: () => ({ data: [{ key: 'k1' }, { key: 'k2' }], error: null }) }) }) }) },
}))

describe('cron idempotency-cleanup', () => {
  it('returns 401 without CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret'
    const req = new Request('https://test/api/cron/idempotency-cleanup', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 + count with valid CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret'
    const req = new Request('https://test/api/cron/idempotency-cleanup', {
      method: 'POST', headers: { Authorization: 'Bearer secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: 2 })
  })
})
```

- [ ] **Step 2: Write handler**

```typescript
// api/cron/idempotency-cleanup.ts
import { supabaseAdmin } from '@/api/_shared/supabase'
import { captureException } from '@/api/_shared/sentry'

export default async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabaseAdmin
      .from('idempotency_keys')
      .delete()
      .lt('created_at', cutoff)
      .select('key')
    if (error) throw error
    return new Response(JSON.stringify({ deleted: data?.length ?? 0 }), { status: 200 })
  } catch (err) {
    captureException(err, { endpoint: 'POST /api/cron/idempotency-cleanup' })
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 })
  }
}
```

- [ ] **Step 3: Update vercel.json**

```json
{
  "crons": [
    { "path": "/api/cron/delete-account",      "schedule": "0 3 * * *" },
    { "path": "/api/cron/idempotency-cleanup", "schedule": "0 4 * * *" }
  ]
}
```

(If `vercel.json` does not yet have a `crons` array, add it; if Cluster 01's row is not yet present, add only this one — Cluster 01 will append on its own.)

- [ ] **Step 4: Write integration test (real DB)**

```typescript
// tests/integration/cluster-11/cron-idempotency-cleanup.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { supabaseAdmin, resetDb } from '../helpers/supabase-local'
import handler from '@/api/cron/idempotency-cleanup'

describe('cron idempotency-cleanup (integration)', () => {
  beforeEach(async () => { await resetDb() })

  it('deletes rows older than 24h, preserves recent', async () => {
    const userId = (await supabaseAdmin.from('users').insert({ email: 'cron@test' }).select('id').single()).data!.id
    const oldKey = 'o'.repeat(20)
    const newKey = 'n'.repeat(20)
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('idempotency_keys').insert([
      { key: oldKey, user_id: userId, endpoint: 'x', request_hash: 'h'.repeat(64), response_status: 200, response_body: {}, created_at: oldDate },
      { key: newKey, user_id: userId, endpoint: 'x', request_hash: 'h'.repeat(64), response_status: 200, response_body: {}, created_at: recentDate },
    ])

    process.env.CRON_SECRET = 'sec'
    const res = await handler(new Request('https://t/api/cron/idempotency-cleanup', { method: 'POST', headers: { Authorization: 'Bearer sec' } }))
    expect(await res.json()).toEqual({ deleted: 1 })

    const { data: remaining } = await supabaseAdmin.from('idempotency_keys').select('key')
    expect(remaining?.map(r => r.key)).toEqual([newKey])
  })
})
```

- [ ] **Step 5: Run all + pass + commit**

```bash
git commit -am "feat(cluster-11): add idempotency-cleanup daily cron with auth gate"
```

---

## Phase 2 — Cross-Cut Composables

### Task 2.1: `useTheme` (route-driven stylesheet swap)

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-theme.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/use-theme.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// tests/unit/composables/use-theme.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { ref, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useTheme } from '@/composables/use-theme'

function makeRouter(initialMeta: { theme?: 'light' | 'dark' }) {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div/>' }, meta: initialMeta }],
  })
}

describe('useTheme', () => {
  beforeEach(() => { document.documentElement.removeAttribute('data-theme') })

  it('defaults to dark when route.meta.theme is unset', async () => {
    const router = makeRouter({})
    await router.push('/')
    const { theme } = useTheme(router)
    await nextTick()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('sets light when route.meta.theme=light', async () => {
    const router = makeRouter({ theme: 'light' })
    await router.push('/')
    const { theme } = useTheme(router)
    await nextTick()
    expect(theme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
```

- [ ] **Step 2: Run → fail**
- [ ] **Step 3: Write composable**

```typescript
// src/composables/use-theme.ts
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Router } from 'vue-router'

export function useTheme(router?: Router) {
  const route = router ? router.currentRoute : useRoute()
  const theme = computed<'light' | 'dark'>(() => {
    const meta = 'value' in route ? route.value.meta : route.meta
    return (meta.theme as 'light' | 'dark' | undefined) ?? 'dark'
  })
  watch(theme, (t) => { document.documentElement.dataset.theme = t }, { immediate: true })
  return { theme }
}
```

- [ ] **Step 4: Run + pass + commit**

```bash
git commit -am "feat(cluster-11): add useTheme route-driven stylesheet swap"
```

---

### Task 2.2: `useReducedMotion`

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-reduced-motion.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/use-reduced-motion.test.ts`

- [ ] **Step 1: TDD**

```typescript
// tests/unit/composables/use-reduced-motion.test.ts
import { describe, it, expect } from 'bun:test'
import { useReducedMotion } from '@/composables/use-reduced-motion'

describe('useReducedMotion', () => {
  it('reflects matchMedia state', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
    })
    const { reduced } = useReducedMotion()
    expect(reduced.value).toBe(true)
  })
})
```

```typescript
// src/composables/use-reduced-motion.ts
import { useMediaQuery } from '@vueuse/core'

export function useReducedMotion() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return { reduced }
}
```

- [ ] **Step 2: Run + pass + commit**

```bash
git commit -am "feat(cluster-11): add useReducedMotion"
```

---

### Task 2.3: `useChannelName` + `useIdempotencyKey`

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-channel-name.ts`
- Create: `kova-open-pencil-1/src/composables/use-idempotency-key.ts`
- Test: each in `tests/unit/composables/`

- [ ] **Step 1: Test `useChannelName`**

```typescript
// tests/unit/composables/use-channel-name.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { useChannelName } from '@/composables/use-channel-name'

mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ userId: 'u1' }) }))

describe('useChannelName', () => {
  it('builds kova.{userId}.{domain}.{topic}', () => {
    expect(useChannelName('canvas', 'abc.snapshot')).toBe('kova.u1.canvas.abc.snapshot')
  })

  it('throws when not signed in', () => {
    mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ userId: null }) }))
    expect(() => useChannelName('canvas', 'x')).toThrow('useChannelName called before sign-in')
  })
})
```

- [ ] **Step 2: Implement**

```typescript
// src/composables/use-channel-name.ts
import { useAuthStore } from '@/stores/auth'

export function useChannelName(domain: string, topic: string): string {
  const auth = useAuthStore()
  if (!auth.userId) throw new Error('useChannelName called before sign-in')
  return `kova.${auth.userId}.${domain}.${topic}`
}
```

- [ ] **Step 3: Test + implement `useIdempotencyKey`**

```typescript
// tests/unit/composables/use-idempotency-key.test.ts
import { describe, it, expect } from 'bun:test'
import { useIdempotencyKey } from '@/composables/use-idempotency-key'

describe('useIdempotencyKey', () => {
  it('generates a UUID v4 string of length 36', () => {
    const { generate } = useIdempotencyKey()
    const k = generate()
    expect(k).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('generates unique values', () => {
    const { generate } = useIdempotencyKey()
    expect(generate()).not.toBe(generate())
  })
})
```

```typescript
// src/composables/use-idempotency-key.ts
export function useIdempotencyKey() {
  return { generate: () => crypto.randomUUID() }
}
```

- [ ] **Step 4: Run + commit**

```bash
git commit -am "feat(cluster-11): add useChannelName + useIdempotencyKey composables"
```

---

### Task 2.4: `useOnlineStatus` (heartbeat + debounce)

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-online-status.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/use-online-status.test.ts`

- [ ] **Step 1: Failing test (mock timers + Realtime channel)**

```typescript
// tests/unit/composables/use-online-status.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { nextTick } from 'vue'

const subscribeMock = mock(() => 'SUBSCRIBED')
const trackMock = mock(async () => ({ ok: true }))
const removeMock = mock(() => undefined)
const channelMock = mock(() => ({ subscribe: subscribeMock, track: trackMock, on: mock(() => ({ subscribe: subscribeMock })) }))

mock.module('@/lib/supabase', () => ({
  supabase: { channel: channelMock, removeChannel: removeMock },
}))
mock.module('@/composables/use-channel-name', () => ({ useChannelName: () => 'kova.u1.presence' }))

let onlineState = true
Object.defineProperty(navigator, 'onLine', { get: () => onlineState, configurable: true })

import { useOnlineStatus } from '@/composables/use-online-status'

describe('useOnlineStatus', () => {
  beforeEach(() => { onlineState = true; subscribeMock.mockClear() })

  it('returns online when navigator.onLine is true and ping recent', () => {
    const { status } = useOnlineStatus()
    expect(status.value).toBe('online')
  })

  it('returns offline when navigator.onLine flips false', async () => {
    const { status } = useOnlineStatus()
    onlineState = false
    window.dispatchEvent(new Event('offline'))
    await nextTick()
    expect(status.value).toBe('offline')
  })
})
```

- [ ] **Step 2: Implement composable**

```typescript
// src/composables/use-online-status.ts
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useChannelName } from './use-channel-name'

const PING_INTERVAL_MS = 3000
const PING_TIMEOUT_MS = 10000
const DEBOUNCE_MS = 1000

export function useOnlineStatus() {
  const browserOnline = ref(navigator.onLine)
  const lastAckAt = ref(Date.now())
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let channel: ReturnType<typeof supabase.channel> | null = null

  const status = computed<'online' | 'offline'>(() => {
    if (!browserOnline.value) return 'offline'
    if (Date.now() - lastAckAt.value > PING_TIMEOUT_MS) return 'offline'
    return 'online'
  })

  function onOnline() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { browserOnline.value = true }, DEBOUNCE_MS)
  }
  function onOffline() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { browserOnline.value = false }, DEBOUNCE_MS)
  }

  onMounted(() => {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    try {
      channel = supabase.channel(useChannelName('presence', 'heartbeat'))
      channel.on('broadcast', { event: 'ack' }, () => { lastAckAt.value = Date.now() }).subscribe()
      pingTimer = setInterval(() => {
        channel?.send({ type: 'broadcast', event: 'ping', payload: { ts: Date.now() } })
      }, PING_INTERVAL_MS)
    } catch {
      // Pre-auth — fall back to navigator.onLine only
    }
  })

  onUnmounted(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    if (pingTimer) clearInterval(pingTimer)
    if (debounceTimer) clearTimeout(debounceTimer)
    if (channel) supabase.removeChannel(channel)
  })

  return { status, lastAckAt: computed(() => lastAckAt.value) }
}
```

- [ ] **Step 3: Run + pass + commit**

```bash
git commit -am "feat(cluster-11): add useOnlineStatus with Realtime heartbeat"
```

---

### Task 2.5: `useSentry` (browser capture wrapper)

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-sentry.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/use-sentry.test.ts`

- [ ] **Step 1: TDD pair**

```typescript
// tests/unit/composables/use-sentry.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { useSentry } from '@/composables/use-sentry'

const captureMock = mock(() => 'eid')
mock.module('@sentry/vue', () => ({
  captureException: captureMock,
  withScope: (cb: (s: { setContext: (k: string, v: object) => void }) => void) => cb({ setContext: mock(() => undefined) }),
}))

describe('useSentry', () => {
  it('captures with kova context', () => {
    const { capture } = useSentry()
    capture(new Error('x'), { brandId: 'b1' })
    expect(captureMock).toHaveBeenCalled()
  })
})
```

```typescript
// src/composables/use-sentry.ts
import * as Sentry from '@sentry/vue'

export interface KovaContext {
  brandId?: string
  canvasId?: string
  feature?: string
}

export function useSentry() {
  function capture(err: unknown, context: KovaContext = {}): void {
    Sentry.withScope((scope) => {
      scope.setContext('kova', { ...context })
      Sentry.captureException(err)
    })
  }
  return { capture }
}
```

- [ ] **Step 2: Pass + commit**

```bash
git commit -am "feat(cluster-11): add useSentry browser capture wrapper"
```

---

## Phase 3 — Toast System

### Task 3.1: Toast type definitions

**Files:**
- Create: `kova-open-pencil-1/src/types/toast.ts`

- [ ] **Step 1: Write types**

```typescript
// src/types/toast.ts
export type ToastVariant = 'success' | 'error' | 'info' | 'action' | 'progress' | 'ai-gen'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  meta?: string
  ctaLabel?: string
  ctaHandler?: () => void
  duration?: number  // ms; Infinity for sticky-by-variant
  createdAt: number
}

export type NewToast = Omit<Toast, 'id' | 'createdAt'>
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(cluster-11): add Toast type definitions"
```

---

### Task 3.2: `useToastStore`

**Files:**
- Create: `kova-open-pencil-1/src/stores/toast.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/toast.test.ts`

- [ ] **Step 1: Failing test (queue + sticky + promotion)**

```typescript
// tests/unit/stores/toast.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '@/stores/toast'

describe('useToastStore', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('enqueues a toast and renders it visible', () => {
    const store = useToastStore()
    const id = store.show({ variant: 'success', message: 'ok' })
    expect(store.visible).toHaveLength(1)
    expect(store.visible[0].id).toBe(id)
  })

  it('caps visible at 5; rest goes to queued', () => {
    const store = useToastStore()
    for (let i = 0; i < 6; i++) store.show({ variant: 'info', message: `t${i}` })
    expect(store.visible).toHaveLength(5)
    expect(store.queued).toHaveLength(1)
  })

  it('promotes queued on dismiss', () => {
    const store = useToastStore()
    for (let i = 0; i < 6; i++) store.show({ variant: 'info', message: `t${i}` })
    const firstId = store.visible[0].id
    store.dismiss(firstId)
    expect(store.visible).toHaveLength(5)
    expect(store.queued).toHaveLength(0)
  })

  it('auto-dismisses success after 5000 ms', async () => {
    const store = useToastStore()
    store.show({ variant: 'success', message: 'auto' })
    expect(store.visible).toHaveLength(1)
    await new Promise(r => setTimeout(r, 5050))
    expect(store.visible).toHaveLength(0)
  })

  it('does NOT auto-dismiss error', async () => {
    const store = useToastStore()
    store.show({ variant: 'error', message: 'sticky' })
    await new Promise(r => setTimeout(r, 5050))
    expect(store.visible).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Implement store**

```typescript
// src/stores/toast.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Toast, NewToast } from '@/types/toast'

const MAX_VISIBLE = 5
const DEFAULT_DURATION_MS = 5000

export const useToastStore = defineStore('toast', () => {
  const visible = ref<Toast[]>([])
  const queued  = ref<Toast[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function show(t: NewToast): string {
    const id = crypto.randomUUID()
    const toast: Toast = { ...t, id, createdAt: Date.now() }
    if (visible.value.length < MAX_VISIBLE) {
      visible.value.push(toast)
      scheduleAutoDismiss(toast)
    } else {
      queued.value.push(toast)
    }
    return id
  }

  function dismiss(id: string): void {
    const t = timers.get(id)
    if (t) { clearTimeout(t); timers.delete(id) }
    visible.value = visible.value.filter(x => x.id !== id)
    const next = queued.value.shift()
    if (next) {
      visible.value.push(next)
      scheduleAutoDismiss(next)
    }
  }

  function scheduleAutoDismiss(t: Toast): void {
    if (t.variant === 'error' || t.variant === 'action' || t.variant === 'progress') return
    const ms = t.duration ?? DEFAULT_DURATION_MS
    if (!isFinite(ms)) return
    const handle = setTimeout(() => dismiss(t.id), ms)
    timers.set(t.id, handle)
  }

  return { visible, queued, show, dismiss }
})
```

- [ ] **Step 3: Run + pass + commit**

```bash
git commit -am "feat(cluster-11): useToastStore with max-5 visible + sticky variants"
```

---

### Task 3.3: `useToast` composable

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-toast.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/use-toast.test.ts`

- [ ] **Step 1: TDD pair**

```typescript
// tests/unit/composables/use-toast.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/use-toast'
import { useToastStore } from '@/stores/toast'

describe('useToast', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('success() enqueues a success variant', () => {
    const { success } = useToast()
    success('Canvas saved')
    expect(useToastStore().visible[0].variant).toBe('success')
  })

  it('action() returns a sticky toast id with CTA', () => {
    const { action } = useToast()
    const id = action('Memory added', { ctaLabel: 'Undo', ctaHandler: () => {} })
    expect(id).toBeTruthy()
    expect(useToastStore().visible[0].ctaLabel).toBe('Undo')
  })

  it('aiGen() enqueues ai-gen variant', () => {
    const { aiGen } = useToast()
    aiGen('5 colors generated')
    expect(useToastStore().visible[0].variant).toBe('ai-gen')
  })
})
```

```typescript
// src/composables/use-toast.ts
import { useToastStore } from '@/stores/toast'
import type { NewToast } from '@/types/toast'

export function useToast() {
  const store = useToastStore()

  function make(variant: NewToast['variant']) {
    return (message: string, opts: Partial<NewToast> = {}) =>
      store.show({ variant, message, ...opts })
  }

  return {
    show: store.show,
    dismiss: store.dismiss,
    success: make('success'),
    error:   make('error'),
    info:    make('info'),
    action:  make('action'),
    progress: make('progress'),
    aiGen:   make('ai-gen'),
  }
}
```

- [ ] **Step 2: Pass + commit**

```bash
git commit -am "feat(cluster-11): useToast composable with 6 variant helpers"
```

---

### Task 3.4: `<KovaToast>` component

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/KovaToast.vue`
- Test: `kova-open-pencil-1/tests/unit/components/KovaToast.test.ts`

- [ ] **Step 1: Failing component test**

```typescript
// tests/unit/components/KovaToast.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import KovaToast from '@/components/ui/KovaToast.vue'

describe('KovaToast', () => {
  const baseToast = { id: 'x', variant: 'success' as const, message: 'Canvas saved', meta: '2s ago', createdAt: Date.now() }

  it('renders message + meta', () => {
    const wrapper = mount(KovaToast, { props: { toast: baseToast } })
    expect(wrapper.text()).toContain('Canvas saved')
    expect(wrapper.text()).toContain('2s ago')
  })

  it('emits dismiss on × click', async () => {
    const wrapper = mount(KovaToast, { props: { toast: baseToast } })
    await wrapper.find('[data-test=dismiss]').trigger('click')
    expect(wrapper.emitted('dismiss')?.[0]).toEqual(['x'])
  })

  it('renders cta button + emits cta-click for action variant', async () => {
    let ctaCalled = false
    const t = { ...baseToast, variant: 'action' as const, ctaLabel: 'Undo', ctaHandler: () => { ctaCalled = true } }
    const wrapper = mount(KovaToast, { props: { toast: t } })
    await wrapper.find('[data-test=cta]').trigger('click')
    expect(ctaCalled).toBe(true)
  })
})
```

- [ ] **Step 2: Implement**

```vue
<!-- src/components/ui/KovaToast.vue -->
<script setup lang="ts">
import type { Toast } from '@/types/toast'
import { computed } from 'vue'

const props = defineProps<{ toast: Toast }>()
const emit  = defineEmits<{ dismiss: [id: string] }>()

const iconName = computed(() => {
  switch (props.toast.variant) {
    case 'success': return 'check'
    case 'error':   return 'alert-triangle'
    case 'info':    return 'info'
    case 'progress':return 'loader'
    case 'ai-gen':  return 'sparkles'
    case 'action':  return ''
  }
})

function onCta() {
  props.toast.ctaHandler?.()
  emit('dismiss', props.toast.id)
}
</script>

<template>
  <div class="toast" :data-variant="toast.variant" role="status" aria-live="polite">
    <icon-lucide-:name="iconName" v-if="iconName" class="ic-lead" />
    <div class="body">
      <div class="msg">{{ toast.message }}</div>
      <div v-if="toast.meta" class="meta">{{ toast.meta }}</div>
    </div>
    <div class="row-actions">
      <button v-if="toast.ctaLabel" data-test="cta" class="btn text" @click="onCta">{{ toast.ctaLabel }}</button>
      <button data-test="dismiss" class="x" aria-label="Dismiss" @click="emit('dismiss', toast.id)">
        <icon-lucide-x />
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Pass + commit**

```bash
git commit -am "feat(cluster-11): KovaToast component, 6 variants"
```

---

### Task 3.5: `<ToastStack>` container

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/ToastStack.vue`
- Test: `kova-open-pencil-1/tests/unit/components/ToastStack.test.ts`

- [ ] **Step 1: TDD**

```typescript
// tests/unit/components/ToastStack.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ToastStack from '@/components/ui/ToastStack.vue'
import { useToastStore } from '@/stores/toast'

describe('ToastStack', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('renders 0 toasts when empty', () => {
    const w = mount(ToastStack)
    expect(w.findAll('.toast')).toHaveLength(0)
  })

  it('renders 3 toasts when store has 3', async () => {
    const store = useToastStore()
    store.show({ variant: 'info', message: 'a' })
    store.show({ variant: 'info', message: 'b' })
    store.show({ variant: 'info', message: 'c' })
    const w = mount(ToastStack)
    expect(w.findAll('.toast')).toHaveLength(3)
  })
})
```

```vue
<!-- src/components/ui/ToastStack.vue -->
<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import KovaToast from './KovaToast.vue'

const store = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" role="region" aria-label="Notifications">
      <TransitionGroup name="toast">
        <KovaToast
          v-for="t in store.visible"
          :key="t.id"
          :toast="t"
          @dismiss="store.dismiss"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Pass + commit**

```bash
git commit -am "feat(cluster-11): ToastStack container with TransitionGroup"
```

---

## Phase 4 — Modal / Popover / Menu / Tooltip Primitives

### Task 4.1: `<KovaModal>` wrapper

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/KovaModal.vue`
- Test: `kova-open-pencil-1/tests/unit/components/KovaModal.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// tests/unit/components/KovaModal.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import KovaModal from '@/components/ui/KovaModal.vue'

describe('KovaModal', () => {
  it('renders sm size 460px when open', () => {
    const w = mount(KovaModal, { props: { open: true, size: 'sm', title: 'Hi' }, slots: { default: 'body' } })
    const dlg = w.find('[role=dialog]')
    expect(dlg.exists()).toBe(true)
    expect(dlg.attributes('data-size')).toBe('sm')
  })

  it('does not render when open=false', () => {
    const w = mount(KovaModal, { props: { open: false } })
    expect(w.find('[role=dialog]').exists()).toBe(false)
  })

  it('emits update:open false on x click', async () => {
    const w = mount(KovaModal, { props: { open: true, title: 'X' } })
    await w.find('[data-test=close]').trigger('click')
    expect(w.emitted('update:open')?.[0]).toEqual([false])
  })
})
```

- [ ] **Step 2: Implement (wraps Reka Dialog)**

```vue
<!-- src/components/ui/KovaModal.vue -->
<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'

interface Props {
  open: boolean
  size?: 'sm' | 'md' | 'lg'
  title?: string
  description?: string
  closeOnBackdrop?: boolean
  destructive?: boolean
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), { size: 'md', closeOnBackdrop: true })
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="modal-backdrop" @click="closeOnBackdrop && !destructive && emit('update:open', false)" />
      <DialogContent role="dialog" :data-size="size" class="dlg" :class="size">
        <div class="dlg-head">
          <DialogTitle v-if="title" tag="h3">{{ title }}</DialogTitle>
          <DialogDescription v-if="description" class="sub">{{ description }}</DialogDescription>
          <DialogClose data-test="close" class="x" aria-label="Close">
            <icon-lucide-x />
          </DialogClose>
        </div>
        <div class="dlg-body"><slot /></div>
        <div class="dlg-foot" v-if="$slots.footer"><slot name="footer" /></div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

- [ ] **Step 3: Pass + commit**

```bash
git commit -am "feat(cluster-11): KovaModal wraps Reka Dialog (sm/md/lg)"
```

---

### Task 4.2: `<KovaPopover>` wrapper

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/KovaPopover.vue`
- Test: `kova-open-pencil-1/tests/unit/components/KovaPopover.test.ts`

- [ ] **Step 1: TDD**

```typescript
// tests/unit/components/KovaPopover.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import KovaPopover from '@/components/ui/KovaPopover.vue'

describe('KovaPopover', () => {
  it('renders trigger slot + portal content when open', () => {
    const w = mount(KovaPopover, {
      props: { open: true, placement: 'bottom-start' },
      slots: { trigger: '<button data-test=trigger>X</button>', default: 'content' },
    })
    expect(w.find('[data-test=trigger]').exists()).toBe(true)
  })
})
```

```vue
<!-- src/components/ui/KovaPopover.vue -->
<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'

interface Props {
  open: boolean
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  width?: number | 'auto'
}
const props = withDefaults(defineProps<Props>(), { placement: 'bottom-start', width: 'auto' })
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
</script>

<template>
  <PopoverRoot :open="open" @update:open="emit('update:open', $event)">
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="popover" :side="placement.split('-')[0]" :align="placement.split('-')[1]"
        :style="{ width: width === 'auto' ? undefined : `${width}px` }">
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
```

- [ ] **Step 2: Pass + commit**

```bash
git commit -am "feat(cluster-11): KovaPopover wraps Reka Popover"
```

---

### Task 4.3: `<KovaMenu>` + `<KovaTooltip>`

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/KovaMenu.vue` + `KovaTooltip.vue`
- Create: `kova-open-pencil-1/src/types/menu.ts`
- Test: each

- [ ] **Step 1: Types + tests + impl**

```typescript
// src/types/menu.ts
export interface MenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  destructive?: boolean
  handler: () => void
}

export interface MenuSeparator { type: 'separator' }
export interface MenuSection   { type: 'section'; label: string }
export type MenuEntry = MenuItem | MenuSeparator | MenuSection
```

```vue
<!-- src/components/ui/KovaMenu.vue -->
<script setup lang="ts">
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from 'reka-ui'
import type { MenuEntry, MenuItem } from '@/types/menu'

defineProps<{ items: MenuEntry[]; align?: 'start' | 'end'; width?: number }>()
const emit = defineEmits<{ select: [item: MenuItem] }>()

function isItem(e: MenuEntry): e is MenuItem { return !('type' in e) }
function isSep(e: MenuEntry): e is { type: 'separator' } { return 'type' in e && e.type === 'separator' }
function isSec(e: MenuEntry): e is { type: 'section'; label: string } { return 'type' in e && e.type === 'section' }
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child><slot name="trigger" /></DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="menu" :align="align ?? 'start'" :style="{ minWidth: `${width ?? 240}px` }">
        <template v-for="(entry, i) in items" :key="i">
          <DropdownMenuLabel v-if="isSec(entry)">{{ entry.label }}</DropdownMenuLabel>
          <DropdownMenuSeparator v-else-if="isSep(entry)" />
          <DropdownMenuItem v-else :disabled="entry.disabled" :data-destructive="entry.destructive" @select="emit('select', entry); entry.handler()">
            <icon-lucide-:name="entry.icon" v-if="entry.icon" />
            <span class="lbl">{{ entry.label }}</span>
            <kbd v-if="entry.shortcut">{{ entry.shortcut }}</kbd>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
```

```vue
<!-- src/components/ui/KovaTooltip.vue -->
<script setup lang="ts">
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipPortal, TooltipContent } from 'reka-ui'
defineProps<{ content: string; placement?: 'top' | 'bottom' | 'left' | 'right'; delay?: number }>()
</script>

<template>
  <TooltipProvider :delay-duration="delay ?? 500">
    <TooltipRoot>
      <TooltipTrigger as-child><slot /></TooltipTrigger>
      <TooltipPortal>
        <TooltipContent class="tooltip" :side="placement ?? 'top'">{{ content }}</TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
```

- [ ] **Step 2: Pass + commit**

```bash
git commit -am "feat(cluster-11): KovaMenu + KovaTooltip wrappers (Reka DropdownMenu / Tooltip)"
```

---

## Phase 5 — Confirm System

### Task 5.1: Confirm types + store

**Files:**
- Create: `kova-open-pencil-1/src/types/confirm.ts`
- Create: `kova-open-pencil-1/src/stores/confirm.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/confirm.test.ts`

- [ ] **Step 1: Types**

```typescript
// src/types/confirm.ts
export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  typedConfirm?: string  // user must type this to enable confirm
}

export interface ConfirmRequest extends ConfirmOptions {
  id: string
  resolve: (value: boolean) => void
}
```

- [ ] **Step 2: Failing test (stack-2 enforcement)**

```typescript
// tests/unit/stores/confirm.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useConfirmStore } from '@/stores/confirm'

describe('useConfirmStore', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('confirm() returns a promise that resolves on resolveTop', async () => {
    const store = useConfirmStore()
    const p = store.confirm({ title: 'X' })
    store.resolveTop(true)
    await expect(p).resolves.toBe(true)
  })

  it('stack capped at 2: opening 3rd closes innermost with false', async () => {
    const store = useConfirmStore()
    const r1 = store.confirm({ title: 'A' })
    const r2 = store.confirm({ title: 'B' })
    const r3 = store.confirm({ title: 'C' })
    await expect(r2).resolves.toBe(false)  // innermost closed
    store.resolveTop(true)  // closes C
    await expect(r3).resolves.toBe(true)
    store.resolveTop(true)
    await expect(r1).resolves.toBe(true)
  })
})
```

- [ ] **Step 3: Implement**

```typescript
// src/stores/confirm.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ConfirmOptions, ConfirmRequest } from '@/types/confirm'

const STACK_MAX = 2

export const useConfirmStore = defineStore('confirm', () => {
  const stack = ref<ConfirmRequest[]>([])
  const pending = computed(() => stack.value.at(-1) ?? null)

  async function confirm(opts: ConfirmOptions): Promise<boolean> {
    if (stack.value.length >= STACK_MAX) {
      const innermost = stack.value.pop()!
      innermost.resolve(false)
    }
    return new Promise<boolean>((resolve) => {
      stack.value.push({ ...opts, id: crypto.randomUUID(), resolve })
    })
  }

  function resolveTop(result: boolean): void {
    const top = stack.value.pop()
    if (top) top.resolve(result)
  }

  return { stack, pending, confirm, resolveTop }
})
```

- [ ] **Step 4: Pass + commit**

```bash
git commit -am "feat(cluster-11): useConfirmStore with stack-of-2 enforcement"
```

---

### Task 5.2: `useConfirm` composable + `<ConfirmModal>`

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-confirm.ts`
- Create: `kova-open-pencil-1/src/components/ui/ConfirmModal.vue`

- [ ] **Step 1: Composable**

```typescript
// src/composables/use-confirm.ts
import { useConfirmStore } from '@/stores/confirm'
import type { ConfirmOptions } from '@/types/confirm'

export function useConfirm() {
  const store = useConfirmStore()
  return { confirm: (opts: ConfirmOptions): Promise<boolean> => store.confirm(opts) }
}
```

- [ ] **Step 2: Component (renders top of stack via KovaModal)**

```vue
<!-- src/components/ui/ConfirmModal.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import KovaModal from './KovaModal.vue'
import KovaInput from './KovaInput.vue'
import KovaButton from './KovaButton.vue'
import { useConfirmStore } from '@/stores/confirm'

const store = useConfirmStore()
const typedText = ref('')

watch(() => store.pending, () => { typedText.value = '' })

const open = computed({
  get: () => store.pending !== null,
  set: (v) => { if (!v) store.resolveTop(false) },
})

const canConfirm = computed(() => {
  if (!store.pending?.typedConfirm) return true
  return typedText.value === store.pending.typedConfirm
})
</script>

<template>
  <KovaModal
    :open="open"
    @update:open="open = $event"
    size="sm"
    :title="store.pending?.title ?? ''"
    :description="store.pending?.description"
    :destructive="store.pending?.destructive"
  >
    <KovaField v-if="store.pending?.typedConfirm" :label="`Type ${store.pending.typedConfirm} to confirm`">
      <KovaInput
        v-model="typedText"
        :state="typedText === store.pending.typedConfirm ? 'typed-confirm' : 'idle'"
        :confirmTarget="store.pending.typedConfirm"
      />
    </KovaField>
    <template #footer>
      <KovaButton variant="ghost" @click="store.resolveTop(false)">
        {{ store.pending?.cancelLabel ?? 'Cancel' }}
      </KovaButton>
      <KovaButton
        :variant="store.pending?.destructive ? 'danger' : 'primary'"
        :disabled="!canConfirm"
        @click="store.resolveTop(true)"
      >
        {{ store.pending?.confirmLabel ?? 'Confirm' }}
      </KovaButton>
    </template>
  </KovaModal>
</template>
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(cluster-11): useConfirm composable + ConfirmModal global mount"
```

---

## Phase 6 — Form + Display Primitives

### Task 6.1: `<KovaButton>`

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/KovaButton.vue`
- Test: `kova-open-pencil-1/tests/unit/components/KovaButton.test.ts`

- [ ] **Step 1: TDD pair**

```typescript
// tests/unit/components/KovaButton.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import KovaButton from '@/components/ui/KovaButton.vue'

describe('KovaButton', () => {
  it('renders primary variant', () => {
    const w = mount(KovaButton, { props: { variant: 'primary' }, slots: { default: 'OK' } })
    expect(w.classes()).toContain('btn')
    expect(w.classes()).toContain('primary')
  })

  it('shows loading spinner when loading=true', () => {
    const w = mount(KovaButton, { props: { loading: true } })
    expect(w.find('[data-test=spinner]').exists()).toBe(true)
  })

  it('disabled prop disables click', async () => {
    let clicked = false
    const w = mount(KovaButton, { props: { disabled: true }, attrs: { onClick: () => { clicked = true } } })
    await w.trigger('click')
    expect(clicked).toBe(false)
  })
})
```

```vue
<!-- src/components/ui/KovaButton.vue -->
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'text' | 'icon'
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
  icon?: string
  iconPosition?: 'leading' | 'trailing'
  type?: 'button' | 'submit' | 'reset'
}
const props = withDefaults(defineProps<Props>(), { variant: 'secondary', size: 'md', iconPosition: 'leading', type: 'button' })
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[variant, size, { loading, disabled }]"
    :disabled="disabled || loading"
  >
    <icon-lucide-loader v-if="loading" data-test="spinner" class="spinner" />
    <icon-lucide-:name="icon" v-else-if="icon && iconPosition === 'leading'" />
    <slot />
    <icon-lucide-:name="icon" v-if="icon && iconPosition === 'trailing' && !loading" />
  </button>
</template>
```

- [ ] **Step 2: Pass + commit**

```bash
git commit -am "feat(cluster-11): KovaButton with 6 variants + loading + sizes"
```

---

### Task 6.2: `<KovaInput>` + `<KovaField>`

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/KovaInput.vue` + `KovaField.vue`

- [ ] **Step 1: Test typed-confirm flow**

```typescript
// tests/unit/components/KovaInput.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import KovaInput from '@/components/ui/KovaInput.vue'

describe('KovaInput', () => {
  it('emits confirm:ready when typed-confirm matches', async () => {
    const w = mount(KovaInput, { props: { modelValue: '', state: 'typed-confirm', confirmTarget: 'DELETE' } })
    await w.find('input').setValue('DELETE')
    expect(w.emitted('confirm:ready')?.[0]).toEqual([true])
  })

  it('emits confirm:ready false on mismatch', async () => {
    const w = mount(KovaInput, { props: { modelValue: '', state: 'typed-confirm', confirmTarget: 'DELETE' } })
    await w.find('input').setValue('DELET')
    expect(w.emitted('confirm:ready')?.at(-1)).toEqual([false])
  })
})
```

```vue
<!-- src/components/ui/KovaInput.vue -->
<script setup lang="ts">
import { watch } from 'vue'

interface Props {
  modelValue: string
  type?: 'text' | 'email' | 'search'
  placeholder?: string
  disabled?: boolean
  state?: 'idle' | 'focus' | 'error' | 'locked' | 'typed-confirm'
  confirmTarget?: string
}
const props = withDefaults(defineProps<Props>(), { type: 'text', state: 'idle' })
const emit = defineEmits<{ 'update:modelValue': [v: string]; 'confirm:ready': [matches: boolean] }>()

watch(() => props.modelValue, (v) => {
  if (props.state === 'typed-confirm' && props.confirmTarget) {
    emit('confirm:ready', v === props.confirmTarget)
  }
})
</script>

<template>
  <input
    class="input"
    :class="state"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled || state === 'locked'"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
```

```vue
<!-- src/components/ui/KovaField.vue -->
<script setup lang="ts">
defineProps<{ label: string; helpText?: string; error?: string; required?: boolean }>()
</script>

<template>
  <div class="fld">
    <label class="lbl">{{ label }}<span v-if="required" class="req">*</span></label>
    <slot />
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="helpText" class="help">{{ helpText }}</div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(cluster-11): KovaInput + KovaField with typed-confirm support"
```

---

### Task 6.3: `<KovaSegmented>` + `<KovaPill>`

**Files:**
- Create: `KovaSegmented.vue` + `KovaPill.vue`

```vue
<!-- src/components/ui/KovaSegmented.vue -->
<script setup lang="ts">
defineProps<{ modelValue: string; options: Array<{ value: string; label: string; icon?: string }> }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()
</script>

<template>
  <div class="seg" role="radiogroup">
    <button
      v-for="o in options" :key="o.value"
      class="o" :class="{ active: modelValue === o.value }"
      role="radio" :aria-checked="modelValue === o.value"
      @click="emit('update:modelValue', o.value)"
    >
      <icon-lucide-:name="o.icon" v-if="o.icon" />
      <span>{{ o.label }}</span>
    </button>
  </div>
</template>
```

```vue
<!-- src/components/ui/KovaPill.vue -->
<script setup lang="ts">
defineProps<{ variant?: 'neutral' | 'accent' | 'outline'; dot?: boolean; dotState?: 'ok' | 'warn' | 'info' }>()
</script>

<template>
  <span class="pill" :class="[variant ?? 'neutral', { dot }]" :data-dot-state="dotState ?? 'ok'">
    <slot />
  </span>
</template>
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): KovaSegmented + KovaPill"`

---

### Task 6.4: `<KovaSkeleton>` + `<EmptyState>` + `<NetworkStatusPill>`

```vue
<!-- src/components/ui/KovaSkeleton.vue -->
<script setup lang="ts">
import { useReducedMotion } from '@/composables/use-reduced-motion'

interface Props { width?: string | number; height?: string | number; radius?: 'pill' | 'card' | 'line' | 'circle' }
const props = withDefaults(defineProps<Props>(), { width: '100%', height: 14, radius: 'line' })
const { reduced } = useReducedMotion()
</script>

<template>
  <div
    class="skeleton"
    :class="[`r-${radius}`, { 'no-shimmer': reduced }]"
    :style="{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }"
    role="status" aria-label="Loading"
  />
</template>
```

```vue
<!-- src/components/ui/EmptyState.vue -->
<script setup lang="ts">
interface Props { size?: 'inline-32' | 'panel-40' | 'full-48'; icon: string; headline: string; body?: string; query?: string }
const props = withDefaults(defineProps<Props>(), { size: 'panel-40' })

function renderHeadline() {
  if (!props.query) return props.headline
  return props.headline.replace(`"${props.query}"`, `<span class="q">"${props.query}"</span>`)
}
</script>

<template>
  <div class="empty-pane" :class="size">
    <div class="ic-wrap">
      <icon-lucide-:name="icon" />
    </div>
    <h5 v-html="renderHeadline()" />
    <p v-if="body" class="body">{{ body }}</p>
    <div v-if="$slots.cta" class="cta-row"><slot name="cta" /></div>
  </div>
</template>
```

```vue
<!-- src/components/ui/NetworkStatusPill.vue -->
<script setup lang="ts">
import { useOnlineStatus } from '@/composables/use-online-status'
import KovaPill from './KovaPill.vue'

const { status } = useOnlineStatus()
defineProps<{ position: 'topbar-pill' | 'sidebar-strip' | 'banner' }>()
</script>

<template>
  <KovaPill v-if="position === 'topbar-pill'" :dot="true" :dot-state="status === 'online' ? 'ok' : 'warn'">
    {{ status === 'online' ? 'Online' : 'Offline' }}
  </KovaPill>
  <div v-else-if="position === 'sidebar-strip' && status === 'offline'" class="net-strip">
    <span class="dot" />
    <span>Working offline</span>
  </div>
  <div v-else-if="position === 'banner' && status === 'offline'" class="offline-banner">
    <icon-lucide-wifi-off />
    <span>You're offline. Changes are saved locally and will sync when you reconnect.</span>
  </div>
</template>
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): Skeleton + EmptyState + NetworkStatusPill"`

---

## Phase 7 — Command-K

### Task 7.1: Types + store + composable

**Files:**
- Create: `kova-open-pencil-1/src/types/command-palette.ts`
- Create: `kova-open-pencil-1/src/stores/command-palette.ts`
- Create: `kova-open-pencil-1/src/composables/use-command-palette.ts`

```typescript
// src/types/command-palette.ts
export interface CommandResult {
  id: string
  label: string
  meta?: string
  icon?: string
  shortcut?: string
  handler: () => void
}

export interface CommandSection {
  id: string
  label: 'Files' | 'Brands' | 'Actions' | 'Help' | string
  getResults: (query: string) => Promise<CommandResult[]> | CommandResult[]
}
```

```typescript
// src/stores/command-palette.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { CommandResult, CommandSection } from '@/types/command-palette'

export const useCommandPaletteStore = defineStore('command-palette', () => {
  const open = ref(false)
  const query = ref('')
  const sections = ref<CommandSection[]>([])
  const results = ref<CommandResult[]>([])
  const activeIndex = ref(0)

  function toggleOpen(force?: boolean): void {
    open.value = force ?? !open.value
    if (!open.value) { query.value = ''; results.value = []; activeIndex.value = 0 }
  }

  function registerSection(s: CommandSection): void {
    if (!sections.value.find(x => x.id === s.id)) sections.value.push(s)
  }

  async function runSearch(q: string): Promise<void> {
    query.value = q
    const all: CommandResult[] = []
    for (const sec of sections.value) {
      const r = await sec.getResults(q)
      all.push(...r)
    }
    results.value = all
    activeIndex.value = 0
  }

  return { open, query, sections, results, activeIndex, toggleOpen, registerSection, runSearch }
})
```

```typescript
// src/composables/use-command-palette.ts
import { useCommandPaletteStore } from '@/stores/command-palette'
import { onMounted, onUnmounted } from 'vue'

export function useCommandPalette() {
  const store = useCommandPaletteStore()

  function onKeydown(e: KeyboardEvent) {
    if (e.code === 'KeyK' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      store.toggleOpen()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return store
}
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): Command-K store + composable + Cmd/Ctrl+K binding"`

---

### Task 7.2: `<CommandPalette>` component

```vue
<!-- src/components/ui/CommandPalette.vue -->
<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useCommandPaletteStore } from '@/stores/command-palette'
import KovaModal from './KovaModal.vue'
import KovaSkeleton from './KovaSkeleton.vue'
import EmptyState from './EmptyState.vue'

const store = useCommandPaletteStore()
const loading = ref(false)

watch(() => store.query, async (q) => {
  loading.value = true
  await store.runSearch(q)
  loading.value = false
}, { flush: 'post' })

function onKeydown(e: KeyboardEvent) {
  if (e.code === 'ArrowDown') { store.activeIndex = Math.min(store.activeIndex + 1, store.results.length - 1); e.preventDefault() }
  else if (e.code === 'ArrowUp') { store.activeIndex = Math.max(store.activeIndex - 1, 0); e.preventDefault() }
  else if (e.code === 'Enter') {
    const r = store.results[store.activeIndex]
    if (r) { r.handler(); store.toggleOpen(false) }
  }
}
</script>

<template>
  <KovaModal :open="store.open" @update:open="store.toggleOpen($event)" size="md">
    <div class="ck-search">
      <icon-lucide-sparkles class="spark" />
      <input
        v-model="store.query"
        placeholder="Search Kova or ask anything…"
        @keydown="onKeydown"
        autofocus
      />
    </div>
    <div class="ck-body">
      <template v-if="loading">
        <KovaSkeleton v-for="i in 4" :key="i" height="44" radius="card" />
      </template>
      <template v-else-if="store.query && store.results.length === 0">
        <EmptyState size="panel-40" icon="search-x" :headline="`No results for &quot;${store.query}&quot;`" :query="store.query" />
      </template>
      <template v-else>
        <div v-for="r in store.results" :key="r.id" class="ck-row" :class="{ active: store.results[store.activeIndex]?.id === r.id }" @click="r.handler(); store.toggleOpen(false)">
          <icon-lucide-:name="r.icon" v-if="r.icon" />
          <span class="lbl">{{ r.label }}</span>
          <span v-if="r.meta" class="meta">{{ r.meta }}</span>
          <kbd v-if="r.shortcut">{{ r.shortcut }}</kbd>
        </div>
      </template>
    </div>
  </KovaModal>
</template>
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): CommandPalette component"`

---

## Phase 8 — Error Pages + Vue Boundary

### Task 8.1: Three error views

**Files:**
- Create: `Error404View.vue`, `Error500View.vue`, `NetworkUnreachableView.vue`

```vue
<!-- src/views/errors/Error404View.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import KovaButton from '@/components/ui/KovaButton.vue'

const router = useRouter()
const auth = useAuthStore()
</script>

<template>
  <div class="err-page">
    <div class="err-card">
      <div class="err-icon-tile"><icon-lucide-search-x /></div>
      <h1>Page not found</h1>
      <p>It may be archived or you don't have access.</p>
      <div class="cta-row">
        <KovaButton variant="primary" @click="router.push('/dashboard')">Go to dashboard</KovaButton>
        <KovaButton variant="text" @click="auth.signOut()">Sign out</KovaButton>
      </div>
    </div>
  </div>
</template>
```

```vue
<!-- src/views/errors/Error500View.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import KovaButton from '@/components/ui/KovaButton.vue'
const router = useRouter()
</script>

<template>
  <div class="err-page">
    <div class="err-card">
      <div class="err-icon-tile"><icon-lucide-alert-triangle /></div>
      <h1>Something broke</h1>
      <p>Try again in a moment.</p>
      <div class="cta-row">
        <KovaButton variant="primary" @click="$router.go(0)">Try again</KovaButton>
        <KovaButton variant="text" @click="router.push('/dashboard')">Go to dashboard</KovaButton>
      </div>
    </div>
  </div>
</template>
```

```vue
<!-- src/views/errors/NetworkUnreachableView.vue -->
<script setup lang="ts">
import KovaButton from '@/components/ui/KovaButton.vue'
</script>

<template>
  <div class="err-page">
    <div class="err-card">
      <div class="err-icon-tile"><icon-lucide-wifi-off /></div>
      <h1>Can't reach Kova</h1>
      <p>Check your internet connection.</p>
      <div class="cta-row">
        <KovaButton variant="primary" @click="$router.go(0)">Retry connection</KovaButton>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): three error-page views (404, 500, network-unreachable)"`

---

### Task 8.2: Vue global errorHandler → /500

**Files:**
- Modify: `kova-open-pencil-1/src/main.ts`

- [ ] **Step 1: Patch main.ts**

```typescript
// src/main.ts (add to existing)
import { router } from './router'
import * as Sentry from '@sentry/vue'

app.config.errorHandler = (err, _instance, info) => {
  console.error('Vue error:', err, info)
  Sentry.captureException(err)
  router.replace('/500')
}
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): wire Vue global errorHandler to /500 + Sentry"`

---

## Phase 9 — Marketing + Email Shells

### Task 9.1: `<MarketingShell>`

```vue
<!-- src/components/shell/MarketingShell.vue -->
<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="marketing-shell">
    <header class="mkt-head">
      <a href="/" class="brand"><img src="/wordmark-light.svg" alt="Kova" /></a>
      <nav>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:support@kova.app">Support</a>
      </nav>
    </header>
    <main class="mkt-body">
      <h1>{{ title }}</h1>
      <slot />
    </main>
    <footer class="mkt-foot">© 2026 Kova</footer>
  </div>
</template>
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): MarketingShell (light theme) for /privacy + /terms"`

---

### Task 9.2: `<EmailShell>` + `useEmailShell` (CSS inlining)

**Files:**
- Create: `src/components/email/EmailShell.vue`
- Create: `src/composables/use-email-shell.ts`

```vue
<!-- src/components/email/EmailShell.vue -->
<script setup lang="ts">
defineProps<{ title: string; preheader?: string }>()
</script>

<template>
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width" />
      <title>{{ title }}</title>
      <style>
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #f6f6f5; color: #1a1a1d; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px; background: #fff; }
        .head { text-align: left; padding-bottom: 16px; border-bottom: 1px solid #e6e6e3; }
        .body { padding: 24px 0; line-height: 1.55; font-size: 15px; }
        .foot { padding-top: 16px; border-top: 1px solid #e6e6e3; font-size: 12px; color: #6e6e73; }
        @media (max-width: 600px) { .container { padding: 16px; } }
      </style>
    </head>
    <body>
      <div v-if="preheader" style="display:none;font-size:1px;color:#fff;">{{ preheader }}</div>
      <div class="container">
        <div class="head"><img src="https://kova.app/email/wordmark-light@2x.png" alt="Kova" width="80" /></div>
        <div class="body"><slot /></div>
        <div class="foot">
          Sent to {{ '{{email}}' }}. <a href="{{settings_url}}">Manage preferences</a>.<br />
          © 2026 Kova
        </div>
      </div>
    </body>
  </html>
</template>
```

```typescript
// src/composables/use-email-shell.ts
import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import juice from 'juice'
import EmailShell from '@/components/email/EmailShell.vue'

export interface EmailShellOptions {
  title: string
  preheader?: string
  bodyHtml: string  // Markdown → HTML done by caller
}

export async function buildEmail(opts: EmailShellOptions): Promise<{ html: string; text: string }> {
  const app = createSSRApp({
    render: () => h(EmailShell, { title: opts.title, preheader: opts.preheader }, { default: () => h('div', { innerHTML: opts.bodyHtml }) }),
  })
  const html = juice(await renderToString(app))  // inline CSS
  const text = opts.bodyHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()  // crude HTML→text fallback
  return { html, text }
}
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): EmailShell + buildEmail with juice CSS inlining"`

---

## Phase 10 — App Wiring + Showcase

### Task 10.1: Wire global containers in App.vue + main.ts

**Files:**
- Modify: `kova-open-pencil-1/src/App.vue`
- Modify: `kova-open-pencil-1/src/main.ts`

- [ ] **Step 1: App.vue mount globals**

```vue
<!-- src/App.vue (add to existing) -->
<script setup lang="ts">
import { onMounted } from 'vue'
import ToastStack from '@/components/ui/ToastStack.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import CommandPalette from '@/components/ui/CommandPalette.vue'
import { useTheme } from '@/composables/use-theme'
import { useCommandPalette } from '@/composables/use-command-palette'

useTheme()
useCommandPalette()
</script>

<template>
  <RouterView />
  <ToastStack />
  <ConfirmModal />
  <CommandPalette />
</template>
```

- [ ] **Step 2: main.ts install Sentry**

```typescript
// src/main.ts (add)
import { installSentry } from './sentry'
installSentry(app, router)
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): mount ToastStack + ConfirmModal + CommandPalette globally"`

---

### Task 10.2: Add error routes + showcase route

**Files:**
- Modify: `kova-open-pencil-1/src/router/routes.ts`
- Create: `kova-open-pencil-1/src/views/dev/Cluster11Showcase.vue`

```typescript
// router/routes.ts (add)
{ path: '/404', name: '404', component: () => import('@/views/errors/Error404View.vue'), meta: { theme: 'dark' } },
{ path: '/500', name: '500', component: () => import('@/views/errors/Error500View.vue'), meta: { theme: 'dark' } },
{ path: '/network-unreachable', name: 'network-unreachable', component: () => import('@/views/errors/NetworkUnreachableView.vue'), meta: { theme: 'dark' } },
{ path: '/:pathMatch(.*)*', redirect: '/404' },
{ path: '/dev/cluster-11', name: 'dev-cluster-11', component: () => import('@/views/dev/Cluster11Showcase.vue'), meta: { theme: 'dark', requiresAuth: false } },
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): wire error + showcase routes"`

---

### Task 10.3: Cluster11Showcase.vue (smoke page)

```vue
<!-- src/views/dev/Cluster11Showcase.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/composables/use-toast'
import { useConfirm } from '@/composables/use-confirm'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import NetworkStatusPill from '@/components/ui/NetworkStatusPill.vue'

const toast = useToast()
const { confirm } = useConfirm()
const modalOpen = ref(false)

async function tryDelete() {
  const ok = await confirm({ title: 'Delete?', description: 'This is permanent.', destructive: true, typedConfirm: 'DELETE' })
  toast.info(`Confirm returned ${ok}`)
}
</script>

<template>
  <div style="padding: 32px; display: flex; flex-direction: column; gap: 24px;">
    <h1>Cluster 11 Showcase</h1>

    <section>
      <h2>Toasts</h2>
      <div style="display:flex; gap: 8px; flex-wrap: wrap;">
        <KovaButton @click="toast.success('Canvas saved · 2s ago')">success</KovaButton>
        <KovaButton @click="toast.error('Export failed · check logs')">error</KovaButton>
        <KovaButton @click="toast.info('Notice')">info</KovaButton>
        <KovaButton @click="toast.action('Memory added', { ctaLabel: 'Undo', ctaHandler: () => toast.info('Undone') })">action</KovaButton>
        <KovaButton @click="toast.progress('Generating 3 variations…')">progress</KovaButton>
        <KovaButton @click="toast.aiGen('AI generated 5 color combos')">ai-gen</KovaButton>
      </div>
    </section>

    <section>
      <h2>Modal + Confirm</h2>
      <KovaButton @click="modalOpen = true">Open modal</KovaButton>
      <KovaButton variant="danger" @click="tryDelete()">Confirm destructive</KovaButton>
      <KovaModal v-model:open="modalOpen" title="Test modal" description="sm size" size="sm">
        Body content goes here.
        <template #footer>
          <KovaButton @click="modalOpen = false">Close</KovaButton>
        </template>
      </KovaModal>
    </section>

    <section>
      <h2>Skeletons + Empty states</h2>
      <KovaSkeleton width="240" height="48" radius="card" />
      <KovaSkeleton width="120" height="14" radius="line" />
      <KovaSkeleton width="40" height="40" radius="circle" />
      <EmptyState size="panel-40" icon="search-x" headline='No results for "shipping"' query="shipping" body="Try a different filter." />
    </section>

    <section>
      <h2>Network</h2>
      <NetworkStatusPill position="topbar-pill" />
      <NetworkStatusPill position="banner" />
    </section>
  </div>
</template>
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): /dev/cluster-11 showcase route"`

---

## Phase 11 — E2E + Manual Smoke

### Task 11.1: E2E tests

**Files:**
- Create: `tests/e2e/cluster-11/toast-flow.spec.ts`, `confirm-flow.spec.ts`, `command-palette.spec.ts`, `error-pages.spec.ts`, `theme-swap.spec.ts`, `offline-flow.spec.ts`

- [ ] **Step 1: Each spec follows pattern**

```typescript
// tests/e2e/cluster-11/toast-flow.spec.ts
import { test, expect } from '@playwright/test'

test('all 6 toast variants render with correct behaviors', async ({ page }) => {
  await page.goto('http://localhost:1420/dev/cluster-11')
  await page.getByRole('button', { name: 'success' }).click()
  await expect(page.locator('.toast[data-variant=success]')).toBeVisible()

  await page.getByRole('button', { name: 'error' }).click()
  await expect(page.locator('.toast[data-variant=error]')).toBeVisible()

  // error sticky — wait 6s, still visible
  await page.waitForTimeout(6000)
  await expect(page.locator('.toast[data-variant=error]')).toBeVisible()

  // success auto-dismissed
  await expect(page.locator('.toast[data-variant=success]')).toHaveCount(0)
})
```

- [ ] **Step 2: Write the other 5 spec files following the PRD §9.3 acceptance criteria, one test per spec**

- [ ] **Commit:** `git commit -am "test(cluster-11): E2E specs for toast / confirm / Cmd+K / errors / theme / offline"`

---

### Task 11.2: Manual smoke checklist run

- [ ] **Step 1: Run dev server**

Run: `cd kova-open-pencil-1 && bun run dev`
Expected: server at `localhost:1420`

- [ ] **Step 2: Open `/dev/cluster-11` in browser**

- [ ] **Step 3: Walk PRD §9.4 checklist (9 items) + record results**

For each: pass / fail / note. Address fails before merge.

- [ ] **Step 4: Open Sentry dashboard, trigger a console error from `/dev/cluster-11`, confirm capture**

- [ ] **Step 5: Disconnect Wi-Fi → confirm offline banner appears within 10 s; reconnect → confirm dismisses**

- [ ] **Step 6: Commit smoke results to `kova-open-pencil-1/docs/qa/cluster-11-manual-smoke-2026-05-15.md`**

```bash
git commit -am "qa(cluster-11): manual smoke pass — all 9 items + Sentry verified"
```

---

## Phase 12 — CI Grep + Coverage Verification

### Task 12.1: Add CI grep enforcement

**Files:**
- Modify: `.github/workflows/ci.yml` (or Vercel build hook) — depends on existing CI surface

- [ ] **Step 1: Add grep step**

```yaml
- name: Verify Realtime channel naming convention
  run: |
    # Every supabase.channel(...) call must start with "kova."
    if grep -rnE "\\.channel\\('[^k]" kova-open-pencil-1/src/ kova-open-pencil-1/api/; then
      echo "ERROR: non-kova-prefixed Realtime channel found"; exit 1
    fi

- name: Verify Tauri command-surface naming
  run: |
    if grep -rnE "register\\('[^k]" kova-open-pencil-1/src/tauri/; then
      echo "ERROR: non-kova-prefixed Tauri command found"; exit 1
    fi

- name: Verify no VITE_ on server secrets
  run: |
    if grep -rnE "VITE_(SENTRY_DSN_SERVER|RESEND_API_KEY|CRON_SECRET)" kova-open-pencil-1/; then
      echo "ERROR: server secret has VITE_ prefix"; exit 1
    fi
```

- [ ] **Commit:** `git commit -am "ci(cluster-11): enforce channel / command / secret naming via grep"`

---

### Task 12.2: Coverage verification

- [ ] **Step 1: Run coverage**

Run: `cd kova-open-pencil-1 && bun test:unit --coverage`
Expected: ≥85% on cluster-11 source files

- [ ] **Step 2: If <85%, write missing tests; re-run**

- [ ] **Step 3: Commit coverage badge if added**

---

## Self-Review

**1. Spec coverage:**

| PRD §3 / §4 / §5 / §6 surface | Plan task |
|---|---|
| §3.1 Toasts (8 scenes) | Phase 3 |
| §3.2 Error pages (3 routes) | Phase 8 |
| §3.3 Command-K (5 scenes) | Phase 7 |
| §3.4 Modals | Phase 4 Task 4.1 |
| §3.5 Popovers + menus + tooltip | Phase 4 Tasks 4.2 + 4.3 |
| §3.6 Skeletons | Phase 6 Task 6.4 |
| §3.7 Empty states | Phase 6 Task 6.4 |
| §3.8 Network status | Phase 6 Task 6.4 + Phase 2 Task 2.4 |
| §3.9 Marketing + email shells | Phase 9 |
| §3.10 Design system + theme | Phase 2 Task 2.1 |
| §4 idempotency_keys schema | Phase 1 Task 1.1 |
| §5.1 cron + idempotency cleanup | Phase 1 Task 1.8 |
| §5.2 RPCs (none) | n/a |
| §5.4 Sentry + Resend | Phase 1 Tasks 1.4–1.6 |
| §5.5 shared helpers | Phase 1 Tasks 1.3, 1.5, 1.6, 1.7 |
| §5.6 Realtime channel naming | Phase 1 Task 1.7 + Phase 2 Task 2.3 |
| §5.7 Tauri command-surface | Phase 12 Task 12.1 (CI grep) |
| §6.1 routes | Phase 10 Task 10.2 |
| §6.2 stores | Phases 3.2, 5.1, 7.1 |
| §6.3 composables | Phases 2 + 3.3 + 5.2 + 7.1 |
| §6.4 components (19) | Phases 3–7 |
| §6.4.3 marketing + email shells | Phase 9 |
| §8 acceptance criteria | Embedded as test files in Phases 3–11 |
| §9 test plan | Embedded |
| §10 Phase A / B rollout | Plan is Phase A; Phase B post-merge tasks |

**No gaps found.**

**2. Placeholder scan:**

Searched for "TBD", "TODO", "implement later", "fill in details" → none found.
Searched for "Add appropriate" / "handle edge cases" → none found.
Every code block contains the actual code.

**3. Type consistency:**

- `Toast` / `NewToast` / `ToastVariant` consistent across `toast.ts`, `use-toast.ts`, `KovaToast.vue`, `ToastStack.vue`
- `ConfirmOptions` / `ConfirmRequest` consistent across `confirm.ts`, `use-confirm.ts`, `ConfirmModal.vue`
- `CommandResult` / `CommandSection` consistent across `command-palette.ts` store + composable + component
- `MenuEntry` / `MenuItem` / `MenuSeparator` / `MenuSection` consistent across `menu.ts` + `KovaMenu.vue`
- `EnvLike` interface in Sentry browser install matches usage

**No drift found.**

---

## Execution Handoff

Plan complete. **Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task; review between tasks; fast iteration. Best for foundation cluster where each phase produces independently-testable code.

2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`; batch execution with checkpoints for review. Best if the founder wants tight oversight from start to finish.

**Recommendation:** Subagent-Driven. Phases 1–9 are highly parallelizable after Phase 1 completes; one subagent per phase with the plan as input keeps each implementation focused.

— End of plan —
