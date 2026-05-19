# Cluster 11 — Shared UI Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every UI primitive every other PRD depends on — toast / modal / confirm / skeleton / empty-state / network-status-indicator (Figma-style icon+tooltip) / error pages / theme runtime swap / idempotency-key helper / Realtime channel naming / Tauri command convention / Sentry + Resend + Vercel-cron stubs (real wiring at pre-launch per 00 §11) / shared marketing + email shells — so downstream clusters import by name and never re-spec.

**Architecture:** Eleven atomic delivery phases, foundation-up. Phase 1 lays cross-cut backend (migration + Sentry STUB + Resend STUB + idempotency helper + Vercel cron STUB — all env-guarded). Phase 2 ships theme + online-status + Realtime-channel + idempotency-key composables. Phases 3–6 ship Pinia stores + Vue 3 components in Composition API setup style, each wrapping Reka UI primitives where applicable (Dialog → KovaModal, Popover → KovaPopover, DropdownMenu → KovaMenu, Tooltip → KovaTooltip). Phase 7 wires error-page routes + Vue global `errorHandler`. Phase 8 ships `<MarketingShell>` + `<EmailShell>` for static `/privacy` + `/terms` rendering and transactional emails. Phase 9 wires global app shell (`<App>` + `main.ts`) + a `/dev/cluster-11` showcase route for visual smoke-testing. Phase 10 ships E2E + manual smoke. Phase 11 enforces CI grep + coverage gates. Every primitive consumes `kova-hifi.css` tokens via Tailwind `@theme` translation; no hex literals.

**Tech Stack:** Vue 3 (`<script setup lang="ts">` Composition API), Pinia (setup stores), Reka UI (Dialog / Popover / DropdownMenu / Tooltip wrappers), Tailwind CSS 4 (`@theme` token translation), VueUse (`useMediaQuery`, `useLocalStorage`), Supabase JS (`@supabase/supabase-js` Realtime), `@sentry/vue` + `@sentry/node`, Resend SDK, `valibot` (schema), `bun:test` (unit), Playwright (E2E), `juice` (CSS inlining for emails). PRD: `kova-open-pencil-1/docs/kova-final-prds/11-shared-ui-infrastructure.md`.

---

## File Structure

**New files (34) — grouped by phase:**

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
- `kova-open-pencil-1/src/components/ui/NetworkStatusIndicator.vue` (icon + tooltip; offline only — renders nothing when online)

### Phase 7 — Error pages
- `kova-open-pencil-1/src/views/errors/Error404View.vue`
- `kova-open-pencil-1/src/views/errors/Error500View.vue`
- `kova-open-pencil-1/src/views/errors/NetworkUnreachableView.vue`

### Phase 8 — Marketing + email shells
- `kova-open-pencil-1/src/components/shell/MarketingShell.vue`
- `kova-open-pencil-1/src/components/email/EmailShell.vue`
- `kova-open-pencil-1/src/composables/use-email-shell.ts`

### Phase 9 — App wiring + showcase
- `kova-open-pencil-1/src/App.vue` — **MODIFY** (mount ToastStack + ConfirmModal globally)
- `kova-open-pencil-1/src/main.ts` — **MODIFY** (install Sentry, mount useTheme)
- `kova-open-pencil-1/src/router/routes.ts` — **MODIFY** (add /404, /500, /network-unreachable, /dev/cluster-11)
- `kova-open-pencil-1/src/views/dev/Cluster11Showcase.vue` — Storybook-replacement smoke page

### Test files (parallel to source, ~25 files)
- Per-source-file colocated under `tests/unit/` mirroring the `src/` tree
- E2E specs under `tests/e2e/cluster-11/` (5 spec files)
- Integration tests under `tests/integration/cluster-11/` (4 spec files)

**Existing files modified:**
- `kova-open-pencil-1/vercel.json` — add cron entry (dormant until `CRON_SECRET` set)
- `kova-open-pencil-1/package.json` — add `valibot` (if not already present). **Stub mode:** `@sentry/vue`, `@sentry/node`, `resend`, `juice` are NOT added at this stage — they are wired at pre-launch per 00 §11.
- `kova-open-pencil-1/src/App.vue` — mount global UI containers
- `kova-open-pencil-1/src/main.ts` — install Sentry stub, mount theme
- `kova-open-pencil-1/src/router/routes.ts` — register error + showcase routes
- `kova-open-pencil-1/.env.example` — add `VITE_SENTRY_DSN_BROWSER`, `SENTRY_DSN_SERVER`, `RESEND_API_KEY`, `CRON_SECRET`, `PUBLIC_APP_URL` (all stub-guarded / fallback-guarded; real values wired pre-launch per 00 §11)

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

  it('creates audit_log table with PK + 2 indexes + RLS enabled (W0-1 / founder lock #11)', async () => {
    const { data: cols } = await supabaseAdmin.rpc('describe_table', { table_name: 'audit_log' })
    expect(cols).toEqual(expect.arrayContaining([
      expect.objectContaining({ column: 'id', type: 'uuid', nullable: false }),
      expect.objectContaining({ column: 'user_id', type: 'uuid', nullable: true }),
      expect.objectContaining({ column: 'event_type', type: 'text', nullable: false }),
      expect.objectContaining({ column: 'payload', type: 'jsonb', nullable: false }),
      expect.objectContaining({ column: 'cluster_owner', type: 'text', nullable: true }),
      expect.objectContaining({ column: 'created_at', type: 'timestamp with time zone', nullable: false }),
    ]))

    const { data: indexes } = await supabaseAdmin.rpc('list_indexes', { table_name: 'audit_log' })
    expect(indexes.map((i: { name: string }) => i.name)).toEqual(
      expect.arrayContaining(['audit_log_pkey', 'idx_audit_log_user_event', 'idx_audit_log_cluster_created']),
    )

    const { data: rls } = await supabaseAdmin.rpc('list_rls', { table_name: 'audit_log' })
    expect(rls.enabled).toBe(true)
    expect(rls.policies).toContainEqual(expect.objectContaining({ name: 'audit_log_service_only' }))
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

-- ---- idempotency_keys ----

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

-- ---- audit_log (W0-1 / founder lock #11) ----

CREATE TABLE IF NOT EXISTS public.audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.users(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  cluster_owner  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_event
  ON public.audit_log(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_cluster_created
  ON public.audit_log(cluster_owner, created_at DESC);

COMMENT ON TABLE public.audit_log IS
  'Append-only event log. Cluster 11 (founder lock #11). Consumed via writeAudit() helper by Clusters 01, 03, 04, 05.';

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_service_only
  ON public.audit_log
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
git commit -m "feat(cluster-11): add idempotency_keys + audit_log table migration"
```

---

### Task 1.2: RLS verification test

**Files:**
- Create: `kova-open-pencil-1/tests/integration/cluster-11/rls-idempotency.test.ts`
- Create: `kova-open-pencil-1/tests/integration/cluster-11/rls-audit-log.test.ts` (W0-1)

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

- [ ] **Step 2: Write the failing audit_log RLS test (W0-1)**

```typescript
// tests/integration/cluster-11/rls-audit-log.test.ts
import { describe, it, expect } from 'bun:test'
import { supabaseAsAuthenticated, supabaseAdmin, signInTestUser } from '../helpers/supabase-local'

describe('audit_log RLS (authenticated role denied per founder lock #11)', () => {
  it('authenticated cannot SELECT', async () => {
    await signInTestUser('user-a@kova-test.local')
    const { data, error } = await supabaseAsAuthenticated.from('audit_log').select('*')
    expect(data).toEqual([])
    expect(error).toBeNull()
  })

  it('authenticated cannot INSERT', async () => {
    await signInTestUser('user-a@kova-test.local')
    const { error } = await supabaseAsAuthenticated.from('audit_log').insert({
      event_type: 'test.attempt', payload: {}, cluster_owner: '11',
    })
    expect(error?.code).toBe('42501')
  })

  it('authenticated cannot UPDATE or DELETE', async () => {
    await signInTestUser('user-a@kova-test.local')
    const upd = await supabaseAsAuthenticated.from('audit_log').update({ payload: { tampered: true } }).gte('created_at', '2000-01-01')
    expect(upd.count).toBe(0)
    const del = await supabaseAsAuthenticated.from('audit_log').delete().gte('created_at', '2000-01-01')
    expect(del.count).toBe(0)
  })

  it('service_role can INSERT (writeAudit append-only)', async () => {
    const userId = (await supabaseAdmin.from('users').select('id').limit(1).single()).data!.id
    const { error, data } = await supabaseAdmin
      .from('audit_log')
      .insert({ user_id: userId, event_type: 'test.appended', payload: { ok: true }, cluster_owner: '11' })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data?.event_type).toBe('test.appended')
    expect(data?.payload).toEqual({ ok: true })
  })

  it('cascade: deleting users row removes its audit_log rows', async () => {
    const { data: u } = await supabaseAdmin.auth.admin.createUser({ email: 'cascade-target@kova-test.local', password: 'X'.repeat(24) })
    const userId = u.user!.id
    await supabaseAdmin.from('audit_log').insert({ user_id: userId, event_type: 'cascade.probe', cluster_owner: '11' })
    await supabaseAdmin.from('users').delete().eq('id', userId)
    const { data: leftover } = await supabaseAdmin.from('audit_log').select('id').eq('user_id', userId)
    expect(leftover).toEqual([])
  })
})
```

- [ ] **Step 3: Run + verify both files pass (migration already applied)**

Run: `cd kova-open-pencil-1 && bun test tests/integration/cluster-11/rls-idempotency.test.ts tests/integration/cluster-11/rls-audit-log.test.ts`
Expected: PASS (4/4 + 5/5)

- [ ] **Step 4: Commit**

```bash
git add kova-open-pencil-1/tests/integration/cluster-11/rls-idempotency.test.ts kova-open-pencil-1/tests/integration/cluster-11/rls-audit-log.test.ts
git commit -m "test(cluster-11): verify idempotency_keys + audit_log RLS"
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

  // C-HIGH11 contract — the helper hashes raw bodyText byte-for-byte. Two
  // payloads with different key order produce DIFFERENT hashes. The cached
  // row was seeded with `{x:1,y:2}`; replaying with `{y:2,x:1}` MUST therefore
  // throw 422, not return the cached response. Callers that need
  // retry-safety must serialize JSON deterministically.
  it('order-sensitive hash — same logical body, different key order, throws 422', async () => {
    const key = 'a'.repeat(20)
    seedMockRow(key, 200, { ok: true }, computeHashFor({ x: 1, y: 2 }))
    const reordered = '{"y":2,"x":1}'
    const req = new Request('https://test.kova/api/x', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': key },
      body: reordered,
    })
    await expect(verifyIdempotency(req, 'u', 'POST /api/x')).rejects.toMatchObject({ status: 422 })
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

/**
 * Idempotency contract (C-HIGH11 — read before integrating):
 *
 *   request_hash = sha256(method + '|' + path + '|' + bodyText)
 *
 * The helper hashes the raw bodyText byte-for-byte. It does NOT canonicalize
 * JSON: two semantically-equivalent payloads with different property order
 * (e.g. `{"a":1,"b":2}` vs `{"b":2,"a":1}`) produce DIFFERENT hashes and a
 * replay with the second body will throw 422 "key_reused_with_different_body".
 *
 * Callers that retry the same logical request MUST serialize their JSON
 * deterministically (stable key order, no incidental whitespace) before
 * sending. The TypeScript/V8 default `JSON.stringify(obj)` is deterministic
 * for the same input object, so callers that send the literal same object
 * twice are safe; callers that round-trip through other languages or rebuild
 * the payload between retries must enforce determinism themselves.
 *
 * Rationale: canonicalizing JSON in the helper is expensive (recursive sort,
 * unicode normalisation) and ambiguous (what about arrays-as-sets?). Pushing
 * determinism to the caller keeps the helper a pure byte-hasher and matches
 * the Stripe / GitHub / AWS pattern. See PRD 11 §4.1 column comment + §5.5
 * for the contract surface.
 */
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

### Task 1.3a: `writeAudit()` helper (TDD) — W0-1 / founder lock #11

**Files:**
- Create: `kova-open-pencil-1/api/_shared/audit.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/audit.test.ts`

**Contract:** consumers (Cluster 01 / 03 / 04 / 05 Edge Functions) call `writeAudit(supabaseAdmin, { userId, eventType, payload, clusterOwner })` to append one row to `public.audit_log`. Helper MUST:

1. Insert via the service-role client (RLS bypass).
2. Never throw on the success path of the calling Edge Function — wrap the insert in try/catch and Sentry-capture any error. Audit-log loss is preferable to losing the user-facing mutation.
3. Special-case SQLSTATE `42P01` (table missing) with a single `captureException` + warn log, so Wave 2 consumer wiring never breaks the request path if Plan 11 Task 1.1 has not yet shipped in some environment (founder lock #19 — Sentry stub OK at MVP).

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/api/_shared/audit.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { writeAudit } from '@/api/_shared/audit'

interface MockClient {
  inserted: Array<Record<string, unknown>>
  forcedError?: { code: string; message: string } | null
}
function createMock(): MockClient {
  const state: MockClient = { inserted: [], forcedError: null }
  // minimal supabase-js shape: from(table).insert(row) → { error }
  ;(state as unknown as { from: unknown }).from = (table: string) => ({
    insert: async (row: Record<string, unknown>) => {
      if (state.forcedError) return { error: state.forcedError }
      state.inserted.push({ table, ...row })
      return { error: null }
    },
  })
  return state
}

const captureMock = mock(() => undefined)
mock.module('@/api/_shared/sentry', () => ({ captureException: captureMock }))

describe('writeAudit (W0-1)', () => {
  let client: MockClient
  beforeEach(() => { client = createMock(); captureMock.mockClear() })

  it('inserts one audit_log row with all fields', async () => {
    await writeAudit(client as never, {
      userId: '00000000-0000-0000-0000-000000000001',
      eventType: 'account.deletion_requested',
      payload: { reason: 'user' },
      clusterOwner: '01',
    })
    expect(client.inserted).toHaveLength(1)
    expect(client.inserted[0]).toMatchObject({
      table: 'audit_log',
      user_id: '00000000-0000-0000-0000-000000000001',
      event_type: 'account.deletion_requested',
      payload: { reason: 'user' },
      cluster_owner: '01',
    })
  })

  it('null userId allowed (system events)', async () => {
    await writeAudit(client as never, { userId: null, eventType: 'cron.idempotency_cleanup', payload: {}, clusterOwner: '11' })
    expect(client.inserted[0]?.user_id).toBeNull()
  })

  it('swallows 42P01 (table missing) — sentry-captures + does not throw', async () => {
    client.forcedError = { code: '42P01', message: 'relation "audit_log" does not exist' }
    await expect(writeAudit(client as never, { userId: 'u', eventType: 'x', payload: {}, clusterOwner: '01' })).resolves.toBeUndefined()
    expect(captureMock).toHaveBeenCalled()
  })

  it('swallows other DB errors — sentry-captures + does not throw', async () => {
    client.forcedError = { code: '23505', message: 'duplicate' }
    await expect(writeAudit(client as never, { userId: 'u', eventType: 'x', payload: {}, clusterOwner: '01' })).resolves.toBeUndefined()
    expect(captureMock).toHaveBeenCalled()
  })

  it('payload defaults to empty object when omitted', async () => {
    await writeAudit(client as never, { userId: 'u', eventType: 'x', clusterOwner: '01' })
    expect(client.inserted[0]?.payload).toEqual({})
  })
})
```

- [ ] **Step 2: Run → FAIL (no module)**

Run: `cd kova-open-pencil-1 && bun test tests/unit/api/_shared/audit.test.ts`
Expected: FAIL with module-not-found error

- [ ] **Step 3: Write the helper**

```typescript
// api/_shared/audit.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { captureException } from './sentry'

export interface AuditEvent {
  userId: string | null
  eventType: string
  payload?: Record<string, unknown>
  clusterOwner: string  // '01' | '03' | '04' | '05' | '11' | etc.
}

export async function writeAudit(
  supabaseAdmin: SupabaseClient,
  event: AuditEvent,
): Promise<void> {
  const row = {
    user_id: event.userId,
    event_type: event.eventType,
    payload: event.payload ?? {},
    cluster_owner: event.clusterOwner,
  }
  const { error } = await supabaseAdmin.from('audit_log').insert(row)
  if (error) {
    // Audit-log loss is preferable to losing the user-facing mutation.
    // Sentry-capture and continue. SQLSTATE 42P01 indicates Plan 11 Task 1.1
    // has not yet shipped in this environment — log loudly but never throw.
    captureException(new Error(`writeAudit failed (${error.code}): ${error.message}`), {
      tags: { helper: 'writeAudit', eventType: event.eventType, clusterOwner: event.clusterOwner },
    })
  }
}
```

- [ ] **Step 4: Run → PASS (5/5)**

Run: `cd kova-open-pencil-1 && bun test tests/unit/api/_shared/audit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/api/_shared/audit.ts kova-open-pencil-1/tests/unit/api/_shared/audit.test.ts
git commit -m "feat(cluster-11): add writeAudit() helper (W0-1 — founder lock #11)"
```

---

### Task 1.3b: `requireEnv()` helper (TDD) — W0-9 / founder lock #10

**Files:**
- Create: `kova-open-pencil-1/api/_shared/env.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/env.test.ts`

**Contract:** `requireEnv(name: string): string` reads `process.env[name]` and throws an Error with the missing key name if absent / empty. Callers receive a typed `string` (not `string | undefined`), eliminating the founder-lock-#10-forbidden `process.env.X!` non-null-assertion pattern that QA-B HIGH-1 found in 24 places across the plan corpus. Consumer waves replace every `process.env.X!` callsite with `requireEnv('X')`.

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/api/_shared/env.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { requireEnv } from '@/api/_shared/env'

describe('requireEnv (W0-9)', () => {
  let original: string | undefined

  beforeEach(() => { original = process.env.KOVA_REQUIREENV_TEST_VAR })
  afterEach(() => {
    if (original === undefined) delete process.env.KOVA_REQUIREENV_TEST_VAR
    else process.env.KOVA_REQUIREENV_TEST_VAR = original
  })

  it('returns the value when set', () => {
    process.env.KOVA_REQUIREENV_TEST_VAR = 'value'
    expect(requireEnv('KOVA_REQUIREENV_TEST_VAR')).toBe('value')
  })

  it('throws when missing', () => {
    delete process.env.KOVA_REQUIREENV_TEST_VAR
    expect(() => requireEnv('KOVA_REQUIREENV_TEST_VAR')).toThrow(/KOVA_REQUIREENV_TEST_VAR/)
  })

  it('throws when empty string', () => {
    process.env.KOVA_REQUIREENV_TEST_VAR = ''
    expect(() => requireEnv('KOVA_REQUIREENV_TEST_VAR')).toThrow(/KOVA_REQUIREENV_TEST_VAR/)
  })

  it('return type is string (not string | undefined) — compile-time test', () => {
    process.env.KOVA_REQUIREENV_TEST_VAR = 'x'
    const v: string = requireEnv('KOVA_REQUIREENV_TEST_VAR')
    expect(v).toBe('x')
  })
})
```

- [ ] **Step 2: Run → FAIL (no module)**

Run: `cd kova-open-pencil-1 && bun test tests/unit/api/_shared/env.test.ts`
Expected: FAIL with module-not-found error

- [ ] **Step 3: Write the helper**

```typescript
// api/_shared/env.ts
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
```

- [ ] **Step 4: Run → PASS (4/4)**

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/api/_shared/env.ts kova-open-pencil-1/tests/unit/api/_shared/env.test.ts
git commit -m "feat(cluster-11): add requireEnv() helper (W0-9 — founder lock #10)"
```

**Consumer-wave usage:** every `process.env.SUPABASE_SERVICE_ROLE_KEY!` becomes `requireEnv('SUPABASE_SERVICE_ROLE_KEY')`. The 24 callsites flagged by QA-B HIGH-1 are migrated by their respective Wave-1/2/3 cluster fix agents.

---

### Task 1.4: Sentry browser install (STUB — env-guarded)

**Files:**
- Create: `kova-open-pencil-1/src/sentry.ts`
- Test: `kova-open-pencil-1/tests/unit/sentry.test.ts`

**Stub-mode note:** No `@sentry/vue` dependency added at this stage. Helper is a no-op when `VITE_SENTRY_DSN_BROWSER` is unset. Live wiring deferred to pre-launch per 00 §11.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/sentry.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { installSentry } from '@/sentry'

const warnMock = mock(() => undefined)
const origWarn = console.warn

describe('installSentry (stub mode)', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
  })

  it('skips init when VITE_SENTRY_DSN_BROWSER unset (logs stub warn)', () => {
    installSentry({} as never, {} as never)
    expect(warnMock).toHaveBeenCalled()
    const msg = warnMock.mock.calls[0][0]
    expect(String(msg)).toContain('[sentry]')
    expect(String(msg)).toContain('stub mode')
  })

  it('returns without throwing when DSN missing', () => {
    expect(() => installSentry({} as never, {} as never)).not.toThrow()
  })

  // TODO(pre-launch §11): assert Sentry.init called with expected config when DSN present.
  it('TODO branch reached when DSN provided (stub asserts placeholder)', () => {
    expect(/* TODO(pre-launch §11): live-mode init */ true).toBeTruthy()
  })
})

afterAll(() => { console.warn = origWarn })
```

- [ ] **Step 2: Run → FAIL (no module)**

Run: `cd kova-open-pencil-1 && bun test tests/unit/sentry.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the installer (stub mode)**

```typescript
// src/sentry.ts
import type { App } from 'vue'
import type { Router } from 'vue-router'

const dsn = import.meta.env.VITE_SENTRY_DSN_BROWSER

export function installSentry(app: App, router: Router): void {
  if (!dsn) {
    console.warn('[sentry] VITE_SENTRY_DSN_BROWSER missing — Sentry disabled (stub mode)')
    return
  }
  // TODO(pre-launch §11): Sentry.init({ app, dsn, integrations: [...router-tracing...] })
}
```

- [ ] **Step 4: Run + verify pass**

Run: `bun test tests/unit/sentry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/src/sentry.ts kova-open-pencil-1/tests/unit/sentry.test.ts
git commit -m "feat(cluster-11): stub Sentry browser installer (env-guarded; live at 00 §11)"
```

---

### Task 1.5: Sentry server-side helper (STUB — env-guarded)

**Files:**
- Create: `kova-open-pencil-1/api/_shared/sentry.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/sentry.test.ts`

**Stub-mode note:** No `@sentry/node` dependency added at this stage. Helper is a no-op when `SENTRY_DSN_SERVER` is unset. Live wiring deferred to pre-launch per 00 §11.

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/api/_shared/sentry.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { captureException, initSentry } from '@/api/_shared/sentry'

const warnMock = mock(() => undefined)
const origWarn = console.warn

describe('captureException (server, stub mode)', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
    delete process.env.SENTRY_DSN_SERVER
  })

  it('initSentry logs stub warn + returns when DSN unset', () => {
    initSentry()
    expect(warnMock).toHaveBeenCalled()
    expect(String(warnMock.mock.calls[0][0])).toContain('stub mode')
  })

  it('captureException no-ops when DSN unset (no throw)', () => {
    expect(() => captureException(new Error('boom'), { userId: 'u1' })).not.toThrow()
    expect(warnMock).toHaveBeenCalled()
  })

  // TODO(pre-launch §11): assert Sentry.captureException + scope.setContext call once live.
  it('TODO branch reached when DSN provided (stub asserts placeholder)', () => {
    expect(/* TODO(pre-launch §11): live-mode capture */ true).toBeTruthy()
  })
})

afterAll(() => { console.warn = origWarn })
```

- [ ] **Step 2: Run → fail**

- [ ] **Step 3: Write `api/_shared/sentry.ts` (stub mode)**

```typescript
// api/_shared/sentry.ts
const dsn = process.env.SENTRY_DSN_SERVER

let initialized = false

export function initSentry(): void {
  if (!dsn) {
    console.warn('[sentry] SENTRY_DSN_SERVER missing — Sentry disabled (stub mode)')
    return
  }
  if (initialized) return
  // TODO(pre-launch §11): import + init @sentry/node here once DSN provisioned
  initialized = true
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!dsn) {
    console.warn('[sentry] captureException called but disabled (stub mode):', err)
    return
  }
  // TODO(pre-launch §11): Sentry.captureException(err, { extra: context })
}
```

- [ ] **Step 4: Run + pass**
- [ ] **Step 5: Commit**

```bash
git commit -am "feat(cluster-11): stub server-side Sentry helper (env-guarded; live at 00 §11)"
```

---

### Task 1.6: Resend `sendEmail()` wrapper (STUB — env-guarded)

**Files:**
- Create: `kova-open-pencil-1/api/_shared/email.ts`
- Create: `kova-open-pencil-1/api/_shared/types.ts` (`EmailPayload` interface)
- Test: `kova-open-pencil-1/tests/unit/api/_shared/email.test.ts`

**Stub-mode note:** No `resend` or `juice` dependencies added at this stage. Stub returns a fake `id` without making an external API call when `RESEND_API_KEY` is unset. Live wiring deferred to pre-launch per 00 §11.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/api/_shared/email.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { sendEmail } from '@/api/_shared/email'

const warnMock = mock(() => undefined)
const origWarn = console.warn

describe('sendEmail (stub mode)', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
    delete process.env.RESEND_API_KEY
  })

  it('returns stub id + logs warn when RESEND_API_KEY unset', async () => {
    const result = await sendEmail({ to: 'u@x', subject: 's', html: '<p>h</p>', text: 't' })
    expect(result.id).toMatch(/^stub_/)
    expect(warnMock).toHaveBeenCalled()
    expect(String(warnMock.mock.calls[0][0])).toContain('stub mode')
  })

  it('does not throw without API key (stub fallback)', async () => {
    await expect(sendEmail({ to: 'u@x', subject: 's', html: 'h', text: 't' })).resolves.toBeDefined()
  })

  // TODO(pre-launch §11): assert resend.emails.send invocation with List-Unsubscribe header.
  it('TODO branch reached when API key provided (stub asserts placeholder)', () => {
    expect(/* TODO(pre-launch §11): live-mode send */ true).toBeTruthy()
  })
})

afterAll(() => { console.warn = origWarn })
```

- [ ] **Step 2: Write `api/_shared/types.ts`**

```typescript
// api/_shared/types.ts
export interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailSendResult {
  id: string
  /**
   * `true` when the helper short-circuited because RESEND_API_KEY was absent
   * (stub mode). Callsites that surface "email sent" UX MUST branch on this
   * flag so production divergence is visible (no silent "stub" success).
   */
  skipped: boolean
}
```

- [ ] **Step 3: Write `api/_shared/email.ts` (stub mode — CT-015 breadcrumb pattern)**

```typescript
// api/_shared/email.ts
import type { EmailPayload, EmailSendResult } from './types'

const apiKey = process.env.RESEND_API_KEY

// CT-015 / founder lock #19 — stub-guard pattern. Returns a sentinel id +
// `skipped: true` when RESEND_API_KEY is unset so production divergence is
// observable (a) in logs via the warn breadcrumb, (b) at Sentry once
// pre-launch wiring lands, (c) in callsites that surface "email sent" UX.
// Replace the console.warn with Sentry.captureMessage at pre-launch §11.
export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  if (!apiKey) {
    console.warn(
      '[resend] skipped — RESEND_API_KEY not set (stub mode)',
      { to: payload.to, subject: payload.subject }
    )
    // TODO(pre-launch §11): Sentry.captureMessage('resend_skipped_no_api_key', 'warning')
    return { id: `stub_${crypto.randomUUID()}`, skipped: true }
  }
  // TODO(pre-launch §11): import { Resend } from 'resend' + resend.emails.send(payload)
  throw new Error('Resend live mode not yet wired — stub fallback only')
}
```

- [ ] **Step 4: Run + pass**
- [ ] **Step 5: Commit**

```bash
git commit -am "feat(cluster-11): stub Resend sendEmail helper (env-guarded; live at 00 §11)"
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

### Task 1.8: Cron `idempotency-cleanup` + vercel.json update (STUB — env-guarded)

**Files:**
- Create: `kova-open-pencil-1/api/cron/idempotency-cleanup.ts`
- Modify: `kova-open-pencil-1/vercel.json`
- Test: `kova-open-pencil-1/tests/unit/api/cron/idempotency-cleanup.test.ts`
- Test: `kova-open-pencil-1/tests/integration/cluster-11/cron-idempotency-cleanup.test.ts`

**Stub-mode note:** Handler returns `503 { stub: true }` when `CRON_SECRET` is unset. `vercel.json` cron entry stays registered but the route is dormant until the secret is provisioned. Live wiring deferred to pre-launch per 00 §11.

- [ ] **Step 1: Write unit test (auth gate + stub guard + delete-where)**

```typescript
// tests/unit/api/cron/idempotency-cleanup.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import handler from '@/api/cron/idempotency-cleanup'

mock.module('@/api/_shared/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      delete: () => ({ lt: async () => ({ error: null, count: 2 }) }),
    }),
  },
}))

const warnMock = mock(() => undefined)
const origWarn = console.warn

function makeRes() {
  let _status = 200
  let _body: unknown = null
  return {
    status(s: number) { _status = s; return this },
    json(b: unknown) { _body = b; return this },
    _get() { return { status: _status, body: _body } },
  }
}

describe('cron idempotency-cleanup', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
  })

  it('returns 503 stub response when CRON_SECRET unset', async () => {
    delete process.env.CRON_SECRET
    const req = { headers: {} } as never
    const res = makeRes()
    await handler(req, res as never)
    expect(res._get().status).toBe(503)
    expect((res._get().body as { stub: boolean }).stub).toBe(true)
    expect(warnMock).toHaveBeenCalled()
  })

  it('returns 401 with invalid auth header', async () => {
    process.env.CRON_SECRET = 'secret'
    const req = { headers: {} } as never
    const res = makeRes()
    await handler(req, res as never)
    expect(res._get().status).toBe(401)
  })

  it('returns 200 + count with valid CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret'
    const req = { headers: { authorization: 'Bearer secret' } } as never
    const res = makeRes()
    await handler(req, res as never)
    expect(res._get().status).toBe(200)
    expect((res._get().body as { deleted: number }).deleted).toBe(2)
  })
})

afterAll(() => { console.warn = origWarn })
```

- [ ] **Step 2: Write handler (stub-guarded)**

```typescript
// api/cron/idempotency-cleanup.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../_shared/supabase-admin'

const secret = process.env.CRON_SECRET

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!secret) {
    console.warn('[cron] CRON_SECRET missing — cron disabled (stub mode)')
    return res.status(503).json({ stub: true, message: 'CRON_SECRET not configured' })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { error, count } = await supabaseAdmin
    .from('idempotency_keys')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ deleted: count ?? 0 })
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

// Cron runs daily at 04:00 UTC. Stub-guarded: returns 503 if CRON_SECRET missing.

- [ ] **Step 4: Write integration test (real DB, 24h retention)**

```typescript
// tests/integration/cluster-11/cron-idempotency-cleanup.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { supabaseAdmin, resetDb } from '../helpers/supabase-local'
import handler from '@/api/cron/idempotency-cleanup'

function fakeReqRes(authHeader?: string) {
  const req = { headers: authHeader ? { authorization: authHeader } : {} } as never
  let _status = 200
  let _body: unknown = null
  const res = {
    status(s: number) { _status = s; return this },
    json(b: unknown) { _body = b; return this },
    _get() { return { status: _status, body: _body } },
  }
  return { req, res }
}

describe('cron idempotency-cleanup (integration, 24h retention)', () => {
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
    const { req, res } = fakeReqRes('Bearer sec')
    await handler(req, res as never)
    expect(res._get().status).toBe(200)
    expect((res._get().body as { deleted: number }).deleted).toBe(1)

    const { data: remaining } = await supabaseAdmin.from('idempotency_keys').select('key')
    expect(remaining?.map(r => r.key)).toEqual([newKey])
  })
})
```

- [ ] **Step 5: Run all + pass + commit**

```bash
git commit -am "feat(cluster-11): stub idempotency-cleanup cron (env-guarded; 24h retention)"
```

---

### Task 1.9: Phase 1 acceptance + pre-launch checklist link

**Files:**
- Modify: `kova-open-pencil-1/.env.example`

**Stub-mode acceptance (until pre-launch §11):**
- [ ] All 3 helpers (sentry, email, cron) function without env vars present (return no-op, log warn)
- [ ] `bun run dev` boots cleanly with no env vars set
- [ ] No browser console errors on a fresh app load (other than the expected stub warnings)

- [ ] **Step 1: Append env-var stubs to `.env.example`**

```
# Sentry — see 00-PRD_SCOPE_PLAN.md §11 for setup before first prod deploy
VITE_SENTRY_DSN_BROWSER=
SENTRY_DSN_SERVER=

# Resend — see 00 §11 for setup (kova.app DNS records required)
RESEND_API_KEY=

# Vercel cron — see 00 §11 for setup (Pro plan + secret generation)
CRON_SECRET=

# Public app origin — used by <EmailShell> wordmark URL + Resend templates
# linking back into the app. Defaults to https://kova.app when unset (C-MED-11.3).
# Set per-environment: preview deployments use the per-branch Vercel URL,
# production sets https://kova.app.
PUBLIC_APP_URL=
```

- [ ] **Step 2: Commit**

```bash
git commit -am "chore(cluster-11): add .env.example stubs for Sentry / Resend / cron (live at 00 §11)"
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
    <KovaIcon v-if="iconName" :name="iconName" class="ic-lead" />
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
            <KovaIcon v-if="entry.icon" :name="entry.icon" />
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

### Task 4.4: `<KovaIcon>` primitive (W0-4 — single icon tag for the whole app)

**Files:**
- Create: `kova-open-pencil-1/src/components/ui/KovaIcon.vue`
- Create: `kova-open-pencil-1/src/components/ui/kova-icon-registry.ts` (static map)
- Test: `kova-open-pencil-1/tests/unit/components/KovaIcon.test.ts`

**Contract:** every icon in every cluster renders via `<KovaIcon name="..." size?="..." />`. The four forbidden alternates — `<icon-lucide-*>` raw tags with dynamic names, `<Icon name="lucide:...">` (Nuxt-style), `i-lucide-*` UnoCSS class strings, `<component :is="\`icon-lucide-${name}\`">` template-literal resolution — are scrubbed cluster-by-cluster in Wave 2 / 3 fix passes. See scope plan §6.2 "Icon convention" W0-4 lock.

**Why a static registry vs `<component :is>`:** `unplugin-icons` resolves icons at build time via auto-imports. Dynamic `<component :is="\`icon-lucide-${name}\`">` fails at runtime because the resolved component name is not in scope. A static `Map<string, Component>` populated at module load (`import IconCheck from '~icons/lucide/check'` ... × N) is the only pattern that (a) tree-shakes, (b) survives runtime, (c) lets us throw a useful dev-mode warning on unknown names.

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/components/KovaIcon.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import KovaIcon from '@/components/ui/KovaIcon.vue'

describe('<KovaIcon> (W0-4)', () => {
  it('renders known lucide name', () => {
    const w = mount(KovaIcon, { props: { name: 'check' } })
    expect(w.find('svg').exists()).toBe(true)
    expect(w.attributes('aria-hidden')).toBe('true')
  })

  it('size prop maps to pixel dimension', () => {
    const w = mount(KovaIcon, { props: { name: 'check', size: 'lg' } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('20')
    expect(svg.attributes('height')).toBe('20')
  })

  it('aria-label flips role from presentation to img', () => {
    const w = mount(KovaIcon, { props: { name: 'check' }, attrs: { 'aria-label': 'Saved' } })
    expect(w.attributes('aria-hidden')).toBeUndefined()
    expect(w.attributes('role')).toBe('img')
  })

  it('passes class prop through to svg root', () => {
    const w = mount(KovaIcon, { props: { name: 'check', class: 'text-accent' } })
    expect(w.find('svg').classes()).toContain('text-accent')
  })

  it('unknown name renders nothing + dev warn (no throw)', () => {
    const w = mount(KovaIcon, { props: { name: 'totally-not-real' } })
    expect(w.find('svg').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run → FAIL (no module)**

Run: `cd kova-open-pencil-1 && bun test tests/unit/components/KovaIcon.test.ts`
Expected: FAIL with module-not-found error

- [ ] **Step 3: Build the static registry**

```typescript
// src/components/ui/kova-icon-registry.ts
// Static lucide registry. Add new icons here when a consumer cluster needs one.
// Tree-shakes per unplugin-icons / vite auto-imports.
import type { Component } from 'vue'

import IconCheck from '~icons/lucide/check'
import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconInfo from '~icons/lucide/info'
import IconLoader from '~icons/lucide/loader'
import IconSparkles from '~icons/lucide/sparkles'
import IconCloudOff from '~icons/lucide/cloud-off'
import IconArrowLeft from '~icons/lucide/arrow-left'
import IconArrowRight from '~icons/lucide/arrow-right'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronRight from '~icons/lucide/chevron-right'
import IconX from '~icons/lucide/x'
import IconPlus from '~icons/lucide/plus'
import IconSearch from '~icons/lucide/search'
import IconCrop from '~icons/lucide/crop'
import IconRuler from '~icons/lucide/ruler'
// ... (extended by consumer clusters during Wave 2 / 3)

export const KOVA_ICON_REGISTRY: ReadonlyMap<string, Component> = new Map<string, Component>([
  ['check', IconCheck],
  ['alert-triangle', IconAlertTriangle],
  ['info', IconInfo],
  ['loader', IconLoader],
  ['sparkles', IconSparkles],
  ['cloud-off', IconCloudOff],
  ['arrow-left', IconArrowLeft],
  ['arrow-right', IconArrowRight],
  ['chevron-down', IconChevronDown],
  ['chevron-right', IconChevronRight],
  ['x', IconX],
  ['plus', IconPlus],
  ['search', IconSearch],
  ['crop', IconCrop],
  ['ruler', IconRuler],
])

export const KOVA_ICON_SIZE_PX: Readonly<Record<'xs' | 'sm' | 'md' | 'lg', number>> = {
  xs: 12, sm: 14, md: 16, lg: 20,
}
```

- [ ] **Step 4: Build the component**

```vue
<!-- src/components/ui/KovaIcon.vue -->
<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { KOVA_ICON_REGISTRY, KOVA_ICON_SIZE_PX } from './kova-icon-registry'

interface Props {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  class?: string
}

const props = withDefaults(defineProps<Props>(), { size: 'md' })

const attrs = useAttrs()
const px = computed(() => KOVA_ICON_SIZE_PX[props.size])
const component = computed(() => {
  const c = KOVA_ICON_REGISTRY.get(props.name)
  if (!c && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[KovaIcon] unknown lucide name: "${props.name}". Add to kova-icon-registry.ts.`)
  }
  return c
})

const hasAriaLabel = computed(() => 'aria-label' in attrs)
</script>

<template>
  <component
    v-if="component"
    :is="component"
    :width="px"
    :height="px"
    :class="props.class"
    :aria-hidden="hasAriaLabel ? undefined : 'true'"
    :role="hasAriaLabel ? 'img' : undefined"
  />
</template>
```

- [ ] **Step 5: Run + verify pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/components/KovaIcon.test.ts`
Expected: PASS (5/5)

- [ ] **Step 6: Commit**

```bash
git add kova-open-pencil-1/src/components/ui/KovaIcon.vue kova-open-pencil-1/src/components/ui/kova-icon-registry.ts kova-open-pencil-1/tests/unit/components/KovaIcon.test.ts
git commit -m "feat(cluster-11): <KovaIcon> primitive (W0-4 — sole icon tag for the app)"
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
    <KovaIcon v-else-if="icon && iconPosition === 'leading'" :name="icon" />
    <slot />
    <KovaIcon v-if="icon && iconPosition === 'trailing' && !loading" :name="icon" />
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
      <KovaIcon v-if="o.icon" :name="o.icon" />
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

### Task 6.4: `<KovaSkeleton>` + `<EmptyState>` + `<NetworkStatusIndicator>`

Note: `NetworkStatusIndicator` is a Figma-style icon-only indicator that renders nothing while online and a 14×14 `cloud-off` lucide icon wrapped in a `KovaTooltip` while offline. The legacy pill / sidebar-strip / 28px banner variants are RETIRED per the 2026-05-17 founder decision.

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
import { computed } from 'vue'

interface Props { size?: 'inline-32' | 'panel-40' | 'full-48'; icon: string; headline: string; body?: string; query?: string }
const props = withDefaults(defineProps<Props>(), { size: 'panel-40' })

// CT-024 fix: split the headline into safe pre / match / post pieces so the
// user-supplied query is rendered via Vue text-interpolation rather than
// v-html. v-html on user input is an XSS sink — strictly forbidden here.
interface HeadlineParts { pre: string; match: string | null; post: string }
const parts = computed<HeadlineParts>(() => {
  const q = props.query
  if (!q) return { pre: props.headline, match: null, post: '' }
  const needle = `"${q}"`
  const idx = props.headline.indexOf(needle)
  if (idx === -1) return { pre: props.headline, match: null, post: '' }
  return {
    pre: props.headline.slice(0, idx),
    match: needle,
    post: props.headline.slice(idx + needle.length),
  }
})
</script>

<template>
  <div class="empty-pane" :class="size">
    <div class="ic-wrap">
      <KovaIcon :name="icon" />
    </div>
    <h5>
      <template v-if="parts.match">
        <span>{{ parts.pre }}</span><span class="q">{{ parts.match }}</span><span>{{ parts.post }}</span>
      </template>
      <template v-else>{{ parts.pre }}</template>
    </h5>
    <p v-if="body" class="body">{{ body }}</p>
    <div v-if="$slots.cta" class="cta-row"><slot name="cta" /></div>
  </div>
</template>
```

> **CT-024 / B-CRIT14:** `v-html` on a string interpolated from `props.query` (user input) is an XSS sink — strictly forbidden. The `parts` computed splits the headline into safe `pre` / `match` / `post` text pieces rendered via standard Vue text interpolation, preserving the highlight wrapper without ever executing HTML from user input. Reviewers MUST reject any future change that re-introduces `v-html` here or anywhere else this component is used.

```vue
<!-- src/components/ui/NetworkStatusIndicator.vue -->
<script setup lang="ts">
import { useOnlineStatus } from '@/composables/use-online-status'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'

const { status } = useOnlineStatus()
</script>

<template>
  <KovaTooltip
    v-if="status === 'offline'"
    content="You're offline. Changes saved locally and sync when you reconnect."
  >
    <icon-lucide-cloud-off
      class="h-3.5 w-3.5 text-ink-2"
      aria-label="Offline"
    />
  </KovaTooltip>
</template>
```

Notes:
- Renders nothing while `useOnlineStatus().status === 'online'`.
- When offline, renders a 14×14 `icon-lucide-cloud-off` in `--ink-2` inside a `<KovaTooltip>` whose tooltip content matches the copy above.
- Positioning is consumer-cluster responsibility (e.g. Cluster 02 topbar mounts this beside the avatar). This component only renders the icon+tooltip pair when offline.

- [ ] **Commit:** `git commit -am "feat(cluster-11): Skeleton + EmptyState + NetworkStatusIndicator (Figma-style icon+tooltip)"`

---

## Phase 7 — Error Pages + Vue Boundary

### Task 7.1: Three error views

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

### Task 7.2: Vue global errorHandler → /500

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

## Phase 8 — Marketing + Email Shells

### Task 8.1: `<MarketingShell>`

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

### Task 8.2: `<EmailShell>` + `useEmailShell` (CSS inlining)

**Files:**
- Create: `src/components/email/EmailShell.vue`
- Create: `src/composables/use-email-shell.ts`

```vue
<!-- src/components/email/EmailShell.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  preheader?: string
  /**
   * Fully-qualified wordmark URL. Defaults to `${PUBLIC_APP_URL}/email/wordmark-light@2x.png`
   * with a `https://kova.app` fallback when PUBLIC_APP_URL is unset (C-MED-11.3).
   * Override only for tests / preview deployments that need a different host.
   */
  wordmarkUrl?: string
}

const props = defineProps<Props>()

// C-MED-11.3 — never hardcode prod host. The fallback keeps prod builds
// working without env wiring; preview / dev / test deployments override
// via PUBLIC_APP_URL (vercel.json + .env.example).
const PUBLIC_APP_URL_FALLBACK = 'https://kova.app'
const wordmark = computed(
  () =>
    props.wordmarkUrl ??
    `${process.env.PUBLIC_APP_URL ?? PUBLIC_APP_URL_FALLBACK}/email/wordmark-light@2x.png`
)
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
        <div class="head"><img :src="wordmark" alt="Kova" width="80" /></div>
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

## Phase 9 — App Wiring + Showcase

### Task 9.1: Wire global containers in App.vue + main.ts

**Files:**
- Modify: `kova-open-pencil-1/src/App.vue`
- Modify: `kova-open-pencil-1/src/main.ts`

- [ ] **Step 1: App.vue mount globals**

```vue
<!-- src/App.vue (add to existing) -->
<script setup lang="ts">
import ToastStack from '@/components/ui/ToastStack.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useTheme } from '@/composables/use-theme'

useTheme()
</script>

<template>
  <RouterView />
  <ToastStack />
  <ConfirmModal />
</template>
```

- [ ] **Step 2: main.ts install Sentry**

```typescript
// src/main.ts (add)
import { installSentry } from './sentry'
installSentry(app, router)
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): mount ToastStack + ConfirmModal globally"`

---

### Task 9.2: Add error routes + showcase route

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

### Task 9.3: Cluster11Showcase.vue (smoke page)

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
import NetworkStatusIndicator from '@/components/ui/NetworkStatusIndicator.vue'

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
      <p>Disconnect Wi-Fi to render the offline icon below (mounts nothing while online).</p>
      <NetworkStatusIndicator />
    </section>
  </div>
</template>
```

- [ ] **Commit:** `git commit -am "feat(cluster-11): /dev/cluster-11 showcase route"`

---

## Phase 10 — E2E + Manual Smoke

### Task 10.1: E2E tests

**Files:**
- Create: `tests/e2e/cluster-11/toast-flow.spec.ts`, `confirm-flow.spec.ts`, `error-pages.spec.ts`, `theme-swap.spec.ts`, `offline-flow.spec.ts`

The `offline-flow.spec.ts` test verifies:
- When `navigator.onLine = false`, `<NetworkStatusIndicator>` renders.
- Tooltip text on hover matches `"You're offline. Changes saved locally and sync when you reconnect."`
- When back online, the indicator hides.
- NO assertion that a banner appears (banner scope deleted per 2026-05-17 founder decision).

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

- [ ] **Commit:** `git commit -am "test(cluster-11): E2E specs for toast / confirm / errors / theme / offline"`

---

### Task 10.2: Manual smoke checklist run

- [ ] **Step 1: Run dev server**

Run: `cd kova-open-pencil-1 && bun run dev`
Expected: server at `localhost:1420`

- [ ] **Step 2: Open `/dev/cluster-11` in browser**

- [ ] **Step 3: Walk PRD §9.4 checklist (9 items) + record results**

For each: pass / fail / note. Address fails before merge.

- [ ] **Step 4: Open Sentry dashboard, trigger a console error from `/dev/cluster-11`, confirm capture**

- [ ] **Step 5: Disconnect Wi-Fi → confirm `<NetworkStatusIndicator>` cloud-off icon appears within 10 s + tooltip copy renders on hover; reconnect → confirm indicator hides**

- [ ] **Step 6: Commit smoke results to `kova-open-pencil-1/docs/qa/cluster-11-manual-smoke-2026-05-15.md`**

```bash
git commit -am "qa(cluster-11): manual smoke pass — all 9 items + Sentry verified"
```

---

## Phase 11 — CI Grep + Coverage Verification

### Task 11.1: Add CI grep enforcement

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

### Task 11.2: Coverage verification

- [ ] **Step 1: Run coverage**

Run: `cd kova-open-pencil-1 && bun test:unit --coverage`
Expected: ≥85% on cluster-11 source files

- [ ] **Step 2: If <85%, write missing tests; re-run**

- [ ] **Step 3: Commit coverage badge if added**

---

### Task 11.5: SECURITY DEFINER `SET search_path` CI gate (W0-5 — founder lock #15)

**Files:**
- Modify: `.github/workflows/ci.yml` (or Vercel build hook)
- Modify: `kova-open-pencil-1/package.json` — add `check:rls` script

**Contract:** every `CREATE FUNCTION ... SECURITY DEFINER` block in `supabase/migrations/` MUST carry `SET search_path = public, pg_temp` (or `SET search_path = 'public'`) within the same function definition. Per founder lock #15: a DEFINER function without an explicit `search_path` is a Postgres role-escalation vector (the calling session's `search_path` can resolve `pg_catalog` / extension schemas in front of `public`, letting an attacker shadow operator functions like `=` and pivot a row-level lookup into arbitrary code execution).

CT-013 evidence from CONSOLIDATED-TRIAGE.md: Plan 03 has 8 DEFINER RPCs missing the lock (0/8), Plan 05 has 1 (0/1), Plan 09 has 3 (0/3). W0-5 wires the CI gate that flags any new occurrence + the PRDs 03 / 05 / 09 §5 each carry a hardening line referencing this gate.

- [ ] **Step 1: Add the CI grep step**

```yaml
- name: Verify SECURITY DEFINER functions carry SET search_path (W0-5 / founder lock #15)
  run: |
    # Match every CREATE FUNCTION ... SECURITY DEFINER block that does NOT include a SET search_path
    # before the next semicolon (the function-definition terminator).
    # -z treats the file as null-delimited so the regex spans newlines.
    # The negative lookahead (?![^;]*SET\s+search_path) catches definitions where the SET clause is absent.
    if grep -rzPnE "CREATE\s+(OR\s+REPLACE\s+)?FUNCTION[^;]*SECURITY\s+DEFINER(?![^;]*SET\s+search_path)" kova-open-pencil-1/supabase/migrations/; then
      echo "ERROR: SECURITY DEFINER function found without SET search_path = public, pg_temp (founder lock #15)"
      exit 1
    fi
```

- [ ] **Step 2: Add `bun run check:rls` script**

In `kova-open-pencil-1/package.json` `"scripts"`:

```json
"check:rls": "! grep -rzPnE 'CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION[^;]*SECURITY\\s+DEFINER(?![^;]*SET\\s+search_path)' supabase/migrations/"
```

- [ ] **Step 3: Smoke-test the gate locally**

Create a temporary failing migration `supabase/migrations/__delete-me.sql` containing a single `CREATE FUNCTION foo() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;` (no `SET search_path`). Run `bun run check:rls`. Expect exit code 1. Delete the file. Re-run. Expect exit code 0.

- [ ] **Step 4: Commit**

```bash
git commit -am "ci(cluster-11): SECURITY DEFINER search_path grep gate (W0-5)"
```

**Wave-2 follow-up:** cluster-fix agents for 03 / 05 / 09 add `SET search_path = public, pg_temp` to every DEFINER block in their respective migrations during their pass. This gate will block CI green until they do.

---

### Task 11.6: Test-framework drift CI gate (W0-6)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `kova-open-pencil-1/package.json` — `check` script composes the grep step

**Contract:** the project uses `bun:test` exclusively. `jest.mock`, `vi.mock`, `vi.fn`, `vi.spyOn`, `mockImplementationOnce`, `mockClear` etc. are forbidden — these symbols are undefined under `bun:test` runtime and cause silent test failures (mocks no-op, tests false-pass).

CT-010 evidence from CONSOLIDATED-TRIAGE.md: Plan 02 has `jest.mock` (B-CRIT5), Plan 03 has `vi.mock` + `vi.fn` (B-CRIT6), Plans 02 + 03 + 04 use `mockImplementationOnce` / `mockClear` (B-HIGH8).

- [ ] **Step 1: Add the CI grep step**

```yaml
- name: Verify bun:test only — no jest / vitest API surface (W0-6)
  run: |
    if grep -rnE "\b(jest|vi)\.(mock|fn|spyOn)\b|\bmockImplementation(Once)?\b|\bmockClear\b|\bmockReturnValue(Once)?\b" kova-open-pencil-1/tests/; then
      echo "ERROR: jest/vitest API found in bun:test files (W0-6 lock). Use mock.module(...) + mock(...) instead."
      exit 1
    fi
```

- [ ] **Step 2: Wire into `bun run check`**

In `kova-open-pencil-1/package.json` `"scripts"`:

```json
"check:test-framework": "! grep -rnE '\\b(jest|vi)\\.(mock|fn|spyOn)\\b|\\bmockImplementation(Once)?\\b|\\bmockClear\\b|\\bmockReturnValue(Once)?\\b' tests/",
"check": "oxlint --type-aware --type-check && bun run check:rls && bun run check:test-framework"
```

- [ ] **Step 3: Smoke-test locally**

Create a temporary test file `tests/__delete-me.test.ts` containing `vi.mock('foo')`. Run `bun run check:test-framework`. Expect exit code 1. Delete the file. Re-run. Expect exit code 0.

- [ ] **Step 4: Commit**

```bash
git commit -am "ci(cluster-11): bun:test framework grep gate (W0-6)"
```

**Wave-2 follow-up:** cluster-fix agents for 01 / 02 / 03 / 04 replace `jest.mock` / `vi.mock` / `mockImplementationOnce` with the `bun:test` equivalents (`mock.module(...)` at module level, `mock(() => ...)` at call site, manual `mock.mockClear()` if needed) during their pass.

---

### Task 11.7: Founder lock #10 sweep CI gate (W0-9)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `kova-open-pencil-1/package.json` — `check:lock10` script

**Contract:** founder lock #10 forbids `as any` casts and `process.env.X!` non-null assertions in production code (`src/` + `api/` + `supabase/functions/`). QA-B HIGH-2 found ~214 `as any` casts (49 in Plan 03, 41 in Plan 06, 17 in Plan 07b, etc.). QA-B HIGH-1 found 24 `process.env.X!` callsites. W0-9 ships the CI gate that flags any new occurrence; the requireEnv helper (Task 1.3b) replaces the env-var pattern; per-cluster sweep happens in Wave-2/3 fix passes.

- [ ] **Step 1: Add the CI grep step**

```yaml
- name: Verify founder lock #10 — no `as any` + no `process.env.X!` (W0-9)
  run: |
    if grep -rnE "\bas\s+any\b" kova-open-pencil-1/src/ kova-open-pencil-1/api/ kova-open-pencil-1/supabase/functions/ 2>/dev/null; then
      echo "ERROR: 'as any' cast found (founder lock #10). Type-narrow explicitly or use unknown + valibot parse."
      exit 1
    fi
    if grep -rnE "process\.env\.[A-Z_]+!" kova-open-pencil-1/src/ kova-open-pencil-1/api/ kova-open-pencil-1/supabase/functions/ 2>/dev/null; then
      echo "ERROR: process.env.X! non-null assertion found (founder lock #10). Use requireEnv('X') from api/_shared/env.ts."
      exit 1
    fi
```

- [ ] **Step 2: Wire into `bun run check`**

In `kova-open-pencil-1/package.json` `"scripts"`:

```json
"check:lock10": "! grep -rnE '\\bas\\s+any\\b' src/ api/ supabase/functions/ && ! grep -rnE 'process\\.env\\.[A-Z_]+!' src/ api/ supabase/functions/",
"check": "oxlint --type-aware --type-check && bun run check:rls && bun run check:test-framework && bun run check:lock10"
```

- [ ] **Step 3: Smoke-test locally**

Create a temporary file `src/__delete-me.ts` containing `const x = {} as any; const y = process.env.FOO!`. Run `bun run check:lock10`. Expect exit code 1 (twice). Delete. Re-run. Expect exit code 0.

- [ ] **Step 4: Commit**

```bash
git commit -am "ci(cluster-11): founder lock #10 sweep gate — no \`as any\` + no \`process.env.X!\` (W0-9)"
```

**Wave-2/3 follow-up:** cluster-fix agents for 03 (49 occurrences), 06 (41 occurrences), 07b (17 occurrences), and every other plan replace `as any` with explicit type narrowing (`as MyType`, `unknown` + valibot parse, type predicates) during their pass. Every `process.env.X!` callsite migrates to `requireEnv('X')` (Task 1.3b).

---

## Self-Review

**1. Spec coverage:**

| PRD §3 / §4 / §5 / §6 surface | Plan task |
|---|---|
| §3.1 Toasts (8 scenes) | Phase 3 |
| §3.2 Errors | Phase 7 |
| §3.3 Modals | Phase 4 Task 4.1 |
| §3.4 Popovers + menus + tooltip | Phase 4 Tasks 4.2 + 4.3 |
| §3.5 Skeletons | Phase 6 Task 6.4 |
| §3.6 Empty states | Phase 6 Task 6.4 |
| §3.7 Network status (icon + tooltip) | Phase 6 Task 6.4 + Phase 2 Task 2.4 |
| §3.8 Marketing + email shells | Phase 8 |
| §3 Design system + theme | Phase 2 Task 2.1 |
| §4 idempotency_keys schema | Phase 1 Task 1.1 |
| §5.1 cron + idempotency cleanup (STUB) | Phase 1 Task 1.8 |
| §5.2 RPCs (none) | n/a |
| §5.4 Sentry + Resend (STUBS) | Phase 1 Tasks 1.4–1.6 |
| §5.5 shared helpers | Phase 1 Tasks 1.3, 1.5, 1.6, 1.7 |
| §5.6 Realtime channel naming `kova.{userId}.{domain}.{topic}` | Phase 1 Task 1.7 + Phase 2 Task 2.3 |
| §5.7 Tauri command-surface | Phase 11 Task 11.1 (CI grep) |
| §6.1 routes | Phase 9 Task 9.2 |
| §6.2 stores | Phases 3.2, 5.1 |
| §6.3 composables | Phases 2 + 3.3 + 5.2 |
| §6.4 components | Phases 3–6 |
| §6.4.3 marketing + email shells | Phase 8 |
| §8 acceptance criteria | Embedded as test files in Phases 3–10 |
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
- `MenuEntry` / `MenuItem` / `MenuSeparator` / `MenuSection` consistent across `menu.ts` + `KovaMenu.vue`
- `EmailPayload` consistent across `api/_shared/types.ts` + stub `email.ts`

**No drift found.**

---

## Execution Handoff

Plan complete. **Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task; review between tasks; fast iteration. Best for foundation cluster where each phase produces independently-testable code.

2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`; batch execution with checkpoints for review. Best if the founder wants tight oversight from start to finish.

**Recommendation:** Subagent-Driven. Phases 1–8 are highly parallelizable after Phase 1 completes; one subagent per phase with the plan as input keeps each implementation focused.

— End of plan —
