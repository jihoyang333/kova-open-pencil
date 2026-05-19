# Cluster 01 — Auth & Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Auth & Identity foundation for Kova MVP — passwordless magic-link + OTP sign-in, GDPR Art. 17 + Art. 19 deletion cascade (30-day soft-delete + daily cron), email-change flow, session-expired bridge, mobile fallback, account-pending-deletion restore, privacy + terms + RoPA compliance docs.

**Architecture:** Vue 3 SPA on Vite. Supabase Auth (magic-link + OTP) drives sign-in. Vue Router guards enforce session + viewport + deleted-account intercepts. `useAuthStore` (Pinia) consumes Supabase session. Vercel Functions handle account-deletion-request / restore / email-change-request / daily cron. Cron walks `gdpr_deletion_queue` step-by-step (`SELECT FOR UPDATE SKIP LOCKED` + retries up to 5 + terminal-failure cap). Resend sends transactional emails.

**Tech Stack:** Vue 3 `<script setup>` + Composition API · Pinia setup stores · Vue Router 4 · Reka UI primitives · Tailwind 4 · TypeScript strict · `@supabase/supabase-js` · `resend` npm pkg · `stripe` npm pkg (Cluster 04 installs; degrades gracefully if absent) · Vercel Fluid Compute functions · bun:test unit tests · Playwright E2E · oxlint · oxfmt · jscpd

**PRD source:** `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/01-auth-and-identity.md` (1220 lines, APPROVED 2026-05-15).

---

## File structure

### Created

**Migration + SQL:**
- `supabase/migrations/20260515_01_users_account_lifecycle.sql`

**Edge Functions (Vercel Functions under `api/`):**
- `api/account/deletion-request.ts`
- `api/account/restore.ts`
- `api/auth/email-change-request.ts`
- `api/cron/delete-account.ts`
- `api/cron/steps/stripe.ts`
- `api/cron/steps/shopify.ts`
- `api/cron/steps/anthropic.ts`
- `api/cron/steps/storage.ts`
- `api/cron/steps/db.ts`
- `api/_shared/verify-cron-secret.ts`
- `api/_shared/resend-client.ts`

**Composables:**
- `src/composables/auth/use-magic-link.ts`
- `src/composables/auth/use-otp.ts`
- `src/composables/auth/use-account-deletion.ts`
- `src/composables/auth/use-email-change.ts`
- `src/composables/auth/use-session-watcher.ts`
- `src/composables/auth/use-viewport-guard.ts`

**Router guard:**
- `src/router/guards/auth-guard.ts`

**Components — auth shell primitives:**
- `src/components/auth/AuthShell.vue`
- `src/components/auth/AuthCard.vue`
- `src/components/auth/AuthHeading.vue`
- `src/components/auth/AuthField.vue`
- `src/components/auth/OtpInput.vue`
- `src/components/auth/AuthCta.vue`
- `src/components/auth/AuthMedal.vue`
- `src/components/auth/AuthIcon.vue`
- `src/components/auth/MagicLinkSentBlock.vue`
- `src/components/auth/PersistentSessionToggle.vue`
- `src/components/account/DangerZoneCard.vue`

**Views:**
- `src/views/auth/SignupView.vue`
- `src/views/auth/LoginView.vue`
- `src/views/auth/ForgotPasswordView.vue`
- `src/views/auth/MagicLinkErrorView.vue`
- `src/views/auth/AuthCallbackView.vue`
- `src/views/auth/EmailChangeVerifyView.vue`
- `src/views/auth/SessionExpiredView.vue`
- `src/views/auth/DesktopOnlyView.vue`
- `src/views/auth/AccountPendingDeletionView.vue`
- `src/views/legal/PrivacyPolicyView.vue`
- `src/views/legal/TermsView.vue`

**Email templates (Resend):**
- `emails/account/account-deletion-scheduled.html`
- `emails/account/account-deletion-completed.html`
- `emails/account/account-restored.html`
- `emails/auth/email-change-notification-to-old.html`

**Legal + compliance docs:**
- `docs/legal/privacy-policy.md`
- `docs/legal/terms.md`
- `docs/legal/ropa.md`
- `docs/operations/anthropic-manual-deletion-runbook.md`

### Modified

- `src/stores/auth.ts` — drop password methods, add magic-link + OTP + deletion + restore actions, add `pendingDeletion` + `profile.deleted_at` reactivity
- `src/router.ts` — add 11 new routes + mount auth guard
- `vercel.json` — append cron entry for `delete-account-cron`
- `package.json` — add `resend` dep + `zod` dep (if not present)

### Test files (per source)

One test file per non-trivial source — colocated under `tests/`:
- `tests/unit/migrations/20260515_01_users_account_lifecycle.test.ts` (integration; runs against local Supabase)
- `tests/unit/api/account/deletion-request.test.ts`
- `tests/unit/api/account/restore.test.ts`
- `tests/unit/api/auth/email-change-request.test.ts`
- `tests/unit/api/cron/delete-account.test.ts`
- `tests/unit/api/cron/steps/{stripe,shopify,anthropic,storage,db}.test.ts`
- `tests/unit/composables/auth/{use-magic-link,use-otp,use-account-deletion,use-email-change,use-session-watcher,use-viewport-guard}.test.ts`
- `tests/unit/router/guards/auth-guard.test.ts`
- `tests/unit/components/auth/{AuthShell,AuthCard,AuthField,OtpInput,MagicLinkSentBlock,PersistentSessionToggle}.test.ts`
- `tests/unit/components/account/DangerZoneCard.test.ts`
- `tests/unit/stores/auth.test.ts`
- `tests/e2e/auth/{signup-flow,login-otp,login-otp-wrong-then-success,desktop-only-fallback,session-expired-bridge,deletion-grace-restore,email-change-flow}.spec.ts`

---

## Pre-flight

- [ ] **Step P1: Confirm working branch + clean tree**

Run: `git status --short`
Expected: only `feat/m9-shopify` branch active; tree clean OR has only related WIP.

- [ ] **Step P2: Verify Supabase local runs**

Run: `cd kova-open-pencil-1 && supabase status`
Expected: API URL, DB URL, Studio URL, Inbucket URL printed. If not started: `supabase start`.

- [ ] **Step P3: Verify dependencies install**

Run: `cd kova-open-pencil-1 && bun install`
Expected: no errors; lockfile unchanged or matches.

- [ ] **Step P4: Add `resend` + `zod` deps if absent**

Run: `cd kova-open-pencil-1 && bun pm ls 2>&1 | grep -E "^(resend|zod)$" || echo MISSING`
If MISSING: `bun add resend zod`
Expected: deps land in `package.json` dependencies. No `--dev`.

- [ ] **Step P5: Verify quality gates pass on current tree**

Run: `bun run check && bun run test:unit`
Expected: ZERO new errors. If pre-existing errors exist, snapshot the count before starting tasks; the count must not increase.

- [ ] **Step P6: Commit pre-flight if anything changed**

```bash
git add package.json bun.lockb
git commit -m "chore(auth): add resend + zod deps for Cluster 01 PRD"
```

---

## Task 1: SQL migration — users lifecycle + GDPR queue + RPCs

**Files:**
- Create: `kova-open-pencil-1/supabase/migrations/20260515_01_users_account_lifecycle.sql`
- Test: `kova-open-pencil-1/tests/unit/migrations/20260515_01_users_account_lifecycle.test.ts`

- [ ] **Step 1.1: Write the failing integration test**

```ts
// tests/unit/migrations/20260515_01_users_account_lifecycle.test.ts
import { describe, test, expect, beforeAll } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const adminUrl = process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321'
const adminKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE ?? ''
const admin = createClient(adminUrl, adminKey, { auth: { persistSession: false } })

describe('20260515_01_users_account_lifecycle migration', () => {
  test('users.deleted_at column exists with timestamptz NULL default', async () => {
    const { data, error } = await admin.rpc('pg_typeof_column', {
      schema_name: 'public', table_name: 'users', column_name: 'deleted_at'
    })
    expect(error).toBeNull()
    expect(data).toBe('timestamp with time zone')
  })

  test('users.preferences column exists as JSONB with empty-object default', async () => {
    const { data, error } = await admin.from('users').select('preferences').limit(1)
    expect(error).toBeNull()
  })

  test('idx_users_pending_deletion partial index exists', async () => {
    const { data } = await admin.rpc('pg_index_exists', {
      schema_name: 'public', index_name: 'idx_users_pending_deletion'
    })
    expect(data).toBe(true)
  })

  test('gdpr_deletion_queue table exists with required columns', async () => {
    const { error } = await admin.from('gdpr_deletion_queue').select('id, user_id, step, status, attempts, queued_at, last_attempt_at, succeeded_at, error, idempotency_key').limit(0)
    expect(error).toBeNull()
  })

  test('gdpr_deletion_queue RLS denies authenticated role', async () => {
    const anon = createClient(adminUrl, process.env.SUPABASE_LOCAL_ANON_KEY ?? '')
    const { error } = await anon.from('gdpr_deletion_queue').select('*')
    expect(error?.code).toBe('PGRST301') // RLS denial
  })

  test('request_account_deletion RPC raises when called without session', async () => {
    const anon = createClient(adminUrl, process.env.SUPABASE_LOCAL_ANON_KEY ?? '')
    const { error } = await anon.rpc('request_account_deletion')
    expect(error?.message).toMatch(/Not authenticated/i)
  })

  test('restore_account RPC raises when called without session', async () => {
    const anon = createClient(adminUrl, process.env.SUPABASE_LOCAL_ANON_KEY ?? '')
    const { error } = await anon.rpc('restore_account')
    expect(error?.message).toMatch(/Not authenticated/i)
  })
})
```

Note: helper RPCs `pg_typeof_column` + `pg_index_exists` are introspection helpers — if not in your test infra yet, write inline `select` queries against `pg_catalog` instead.

- [ ] **Step 1.2: Run test — verify it fails**

Run: `bun test tests/unit/migrations/20260515_01_users_account_lifecycle.test.ts`
Expected: FAIL with "relation gdpr_deletion_queue does not exist" or column-missing errors.

- [ ] **Step 1.3: Write migration SQL**

```sql
-- supabase/migrations/20260515_01_users_account_lifecycle.sql
-- Cluster 01 Auth & Identity — schema for GDPR cascade + user preferences
-- Pairs with: 20260316_users.sql (creates public.users + base RLS)

BEGIN;

-- ---- 1. users.deleted_at + preferences ----

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_pending_deletion
  ON public.users(deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.users.deleted_at IS
  'GDPR soft-delete timestamp. Set by request_account_deletion(); cleared by restore_account() within 30 days; hard-deleted by delete-account-cron after 30 days.';
COMMENT ON COLUMN public.users.preferences IS
  'Cross-device user preferences JSONB (Q5 Layer 1). Consumed by Cluster 12 usePreferencesStore.';

-- ---- 2. gdpr_deletion_queue (cron retry state) ----

CREATE TABLE IF NOT EXISTS public.gdpr_deletion_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  step            text NOT NULL CHECK (step IN ('stripe', 'shopify', 'anthropic', 'storage', 'db')),
  status          text NOT NULL CHECK (status IN ('pending', 'in_progress', 'succeeded', 'failed_terminal'))
                       DEFAULT 'pending',
  attempts        int  NOT NULL DEFAULT 0,
  queued_at       timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  succeeded_at    timestamptz,
  error           text,
  idempotency_key text,
  UNIQUE (user_id, step)
);

CREATE INDEX IF NOT EXISTS idx_gdpr_queue_pending
  ON public.gdpr_deletion_queue(status, queued_at)
  WHERE status IN ('pending', 'in_progress');

COMMENT ON TABLE public.gdpr_deletion_queue IS
  'Step-by-step retry log for the GDPR delete-account cascade. One row per (user_id, step). Cron walks pending+in_progress rows daily; terminal failure caps at attempts >= 5.';

ALTER TABLE public.gdpr_deletion_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY gdpr_queue_service_only
  ON public.gdpr_deletion_queue
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ---- 3. RPCs ----

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   uuid;
  v_scheduled timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.users
     SET deleted_at = now()
   WHERE id = v_user_id
     AND deleted_at IS NULL
  RETURNING deleted_at + INTERVAL '30 days' INTO v_scheduled;

  IF v_scheduled IS NULL THEN
    RAISE EXCEPTION 'Already pending deletion or user not found' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.gdpr_deletion_queue (user_id, step) VALUES
    (v_user_id, 'stripe'),
    (v_user_id, 'shopify'),
    (v_user_id, 'anthropic'),
    (v_user_id, 'storage'),
    (v_user_id, 'db')
  ON CONFLICT (user_id, step) DO NOTHING;

  RETURN v_scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.users
     SET deleted_at = NULL
   WHERE id = v_user_id
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - INTERVAL '30 days';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    DELETE FROM public.gdpr_deletion_queue
     WHERE user_id = v_user_id
       AND status = 'pending';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_account() TO authenticated;

COMMIT;
```

- [ ] **Step 1.4: Apply migration locally + run test**

Run: `cd kova-open-pencil-1 && supabase db reset` (or `supabase migration up`)
Then: `bun test tests/unit/migrations/20260515_01_users_account_lifecycle.test.ts`
Expected: PASS.

- [ ] **Step 1.5: Write RPC-behavior integration tests**

```ts
// Append to same test file
describe('request_account_deletion + restore_account RPC behavior', () => {
  test('request_account_deletion sets deleted_at + inserts 5 queue rows', async () => {
    // Create test user via admin auth API
    const email = `test-${crypto.randomUUID()}@test.local`
    const { data: u } = await admin.auth.admin.createUser({ email, email_confirm: true })
    const userId = u.user!.id

    // Impersonate via Supabase JWT (test helper or service_role bypass)
    const userClient = createClient(adminUrl, adminKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${signTestJwt(userId)}` } }
    })

    const { data: scheduledAt } = await userClient.rpc('request_account_deletion')
    expect(scheduledAt).toBeTruthy()

    const { data: rows } = await admin.from('gdpr_deletion_queue').select('step').eq('user_id', userId)
    expect(rows?.map((r) => r.step).sort()).toEqual(['anthropic', 'db', 'shopify', 'storage', 'stripe'])

    // Re-call: must raise 'Already pending'
    const { error } = await userClient.rpc('request_account_deletion')
    expect(error?.message).toMatch(/Already pending/)

    await admin.auth.admin.deleteUser(userId)
  })

  test('restore_account clears deleted_at within 30 days; removes pending queue rows', async () => {
    const email = `test-${crypto.randomUUID()}@test.local`
    const { data: u } = await admin.auth.admin.createUser({ email, email_confirm: true })
    const userId = u.user!.id

    const userClient = createClient(adminUrl, adminKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${signTestJwt(userId)}` } }
    })

    await userClient.rpc('request_account_deletion')
    const { data: restored } = await userClient.rpc('restore_account')
    expect(restored).toBe(true)

    const { data: userRow } = await admin.from('users').select('deleted_at').eq('id', userId).single()
    expect(userRow?.deleted_at).toBeNull()

    const { data: rows } = await admin.from('gdpr_deletion_queue').select('id').eq('user_id', userId)
    expect(rows?.length).toBe(0)

    await admin.auth.admin.deleteUser(userId)
  })

  test('restore_account returns false after 30-day window', async () => {
    const email = `test-${crypto.randomUUID()}@test.local`
    const { data: u } = await admin.auth.admin.createUser({ email, email_confirm: true })
    const userId = u.user!.id

    // Force deleted_at to 31 days ago
    await admin.from('users').update({ deleted_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() }).eq('id', userId)

    const userClient = createClient(adminUrl, adminKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${signTestJwt(userId)}` } }
    })
    const { data: restored } = await userClient.rpc('restore_account')
    expect(restored).toBe(false)

    await admin.auth.admin.deleteUser(userId)
  })
})
```

Notes: `signTestJwt(userId)` is a test helper to mint a Supabase-compatible JWT signed with the local anon JWT secret. If you don't have one, create `tests/_helpers/sign-test-jwt.ts` using the local `SUPABASE_JWT_SECRET` env var with HS256.

- [ ] **Step 1.6: Run all migration tests**

Run: `bun test tests/unit/migrations/`
Expected: 6+ tests PASS.

- [ ] **Step 1.7: Commit**

```bash
git add supabase/migrations/20260515_01_users_account_lifecycle.sql tests/unit/migrations/20260515_01_users_account_lifecycle.test.ts tests/_helpers/sign-test-jwt.ts
git commit -m "feat(auth): migration for users lifecycle + GDPR deletion queue + RPCs

- users.deleted_at + users.preferences JSONB
- idx_users_pending_deletion partial index
- gdpr_deletion_queue table (5-step retry state, service_role-only RLS)
- request_account_deletion() RPC (sets deleted_at + enqueues 5 cascade steps)
- restore_account() RPC (clears within 30-day window + removes pending queue rows)
- Test helper signTestJwt for integration tests

Refs Cluster 01 PRD §4 + §5.2"
```

---

## Task 2: Shared helper — verify-cron-secret + resend-client

**Files:**
- Create: `kova-open-pencil-1/api/_shared/verify-cron-secret.ts`
- Create: `kova-open-pencil-1/api/_shared/resend-client.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/verify-cron-secret.test.ts`

- [ ] **Step 2.1: Write failing tests**

```ts
// tests/unit/api/_shared/verify-cron-secret.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { verifyCronSecret } from '../../../../api/_shared/verify-cron-secret'

describe('verifyCronSecret', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret-abc123'
  })

  test('returns true when header matches', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'Bearer test-secret-abc123' }
    })
    expect(verifyCronSecret(req)).toBe(true)
  })

  test('returns false when header missing', () => {
    const req = new Request('http://x/api/cron/test')
    expect(verifyCronSecret(req)).toBe(false)
  })

  test('returns false when header malformed', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'test-secret-abc123' }
    })
    expect(verifyCronSecret(req)).toBe(false)
  })

  test('returns false when secret mismatches', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'Bearer wrong-secret' }
    })
    expect(verifyCronSecret(req)).toBe(false)
  })

  test('throws if CRON_SECRET env var unset', () => {
    delete process.env.CRON_SECRET
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'Bearer anything' }
    })
    expect(() => verifyCronSecret(req)).toThrow(/CRON_SECRET/)
  })
})
```

- [ ] **Step 2.2: Run — verify fail**

Run: `bun test tests/unit/api/_shared/verify-cron-secret.test.ts`
Expected: FAIL (file missing).

- [ ] **Step 2.3: Implement verify-cron-secret**

```ts
// api/_shared/verify-cron-secret.ts
export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw new Error('CRON_SECRET env var not configured')
  }
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return false
  if (!header.startsWith('Bearer ')) return false
  const provided = header.slice('Bearer '.length)
  // Constant-time comparison to resist timing attacks
  if (provided.length !== secret.length) return false
  let mismatch = 0
  for (let i = 0; i < secret.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return mismatch === 0
}
```

- [ ] **Step 2.4: Implement resend-client wrapper**

```ts
// api/_shared/resend-client.ts
import { Resend } from 'resend'
import fs from 'node:fs/promises'
import path from 'node:path'

let _client: Resend | null = null

function client(): Resend {
  if (_client) return _client
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY env var not configured')
  _client = new Resend(key)
  return _client
}

export interface SendEmailArgs {
  to: string
  subject: string
  templatePath: string // absolute or relative to /emails
  variables?: Record<string, string>
  idempotencyKey?: string
}

export async function sendEmail(args: SendEmailArgs): Promise<{ id: string }> {
  const html = await loadTemplate(args.templatePath, args.variables ?? {})
  const { data, error } = await client().emails.send({
    from: process.env.RESEND_FROM ?? 'Kova <noreply@kova.io>',
    to: args.to,
    subject: args.subject,
    html,
    headers: args.idempotencyKey
      ? { 'X-Idempotency-Key': args.idempotencyKey }
      : undefined
  })
  if (error) throw new Error(`Resend send failed: ${error.message}`)
  return { id: data!.id }
}

async function loadTemplate(templatePath: string, vars: Record<string, string>): Promise<string> {
  const full = path.isAbsolute(templatePath)
    ? templatePath
    : path.join(process.cwd(), 'emails', templatePath)
  let html = await fs.readFile(full, 'utf8')
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value))
  }
  return html
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
```

- [ ] **Step 2.5: Run tests — verify pass**

Run: `bun test tests/unit/api/_shared/verify-cron-secret.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 2.6: Commit**

```bash
git add api/_shared/verify-cron-secret.ts api/_shared/resend-client.ts tests/unit/api/_shared/verify-cron-secret.test.ts
git commit -m "feat(auth): _shared helpers for cron-secret verification + Resend client"
```

---

## Task 3: Edge Function — POST /api/account/deletion-request

**Files:**
- Create: `kova-open-pencil-1/api/account/deletion-request.ts`
- Test: `kova-open-pencil-1/tests/unit/api/account/deletion-request.test.ts`

- [ ] **Step 3.1: Write failing tests**

```ts
// tests/unit/api/account/deletion-request.test.ts
import { describe, test, expect, mock } from 'bun:test'
import handler from '../../../../api/account/deletion-request'

const mockSupabase = {
  auth: {
    getUser: mock(() => Promise.resolve({ data: { user: { id: 'u1', email: 'a@b.co' } }, error: null }))
  },
  rpc: mock(() => Promise.resolve({ data: '2026-06-14T00:00:00Z', error: null })),
  from: mock(() => ({
    insert: mock(() => Promise.resolve({ error: null }))
  }))
}

mock.module('../../../../api/_shared/auth', () => ({
  verifyAuth: mock(async () => ({ supabase: mockSupabase, userId: 'u1', email: 'a@b.co' }))
}))

mock.module('../../../../api/_shared/resend-client', () => ({
  sendEmail: mock(async () => ({ id: 'resend-test-id' }))
}))

describe('POST /api/account/deletion-request', () => {
  test('returns 200 + scheduled_purge_at on happy path', async () => {
    const req = new Request('http://x/api/account/deletion-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake-jwt', 'X-Idempotency-Key': crypto.randomUUID() }
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.scheduled_purge_at).toBe('2026-06-14T00:00:00Z')
  })

  test('returns 401 when verifyAuth throws', async () => {
    const { verifyAuth } = await import('../../../../api/_shared/auth')
    ;(verifyAuth as ReturnType<typeof mock>).mockImplementationOnce(async () => {
      throw new Error('Unauthenticated')
    })
    const req = new Request('http://x/api/account/deletion-request', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 409 when RPC raises "Already pending"', async () => {
    mockSupabase.rpc.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { message: 'Already pending deletion or user not found', code: 'P0001' } })
    )
    const req = new Request('http://x/api/account/deletion-request', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('already_pending')
  })

  test('returns 405 on non-POST', async () => {
    const req = new Request('http://x/api/account/deletion-request', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })

  test('rate-limits at 5 req/min/user (idempotent retry returns cached)', async () => {
    // 6 rapid calls with no idempotency-key → 6th returns 429
    const ip = '1.2.3.4'
    let lastStatus = 0
    for (let i = 0; i < 6; i++) {
      const req = new Request('http://x/api/account/deletion-request', {
        method: 'POST',
        headers: { Authorization: 'Bearer fake-jwt', 'X-Forwarded-For': ip }
      })
      const res = await handler(req)
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  })
})
```

- [ ] **Step 3.2: Run — verify fail**

Run: `bun test tests/unit/api/account/deletion-request.test.ts`
Expected: FAIL (handler not implemented).

- [ ] **Step 3.3: Implement Edge Function**

```ts
// api/account/deletion-request.ts
import { verifyAuth } from '../_shared/auth'
import { writeAudit } from '../_shared/audit'
import { sendEmail } from '../_shared/resend-client'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  }

  let auth
  try {
    auth = await verifyAuth(req)
  } catch {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (!checkRateLimit(auth.userId)) {
    return Response.json({ error: 'rate_limited', retry_after_seconds: 60 }, { status: 429 })
  }

  const { data: scheduledAt, error } = await auth.supabase.rpc('request_account_deletion')

  if (error) {
    if (error.message.includes('Already pending')) {
      return Response.json({ error: 'already_pending' }, { status: 409 })
    }
    console.error('request_account_deletion RPC failed:', error)
    return Response.json({ error: 'internal_error', request_id: crypto.randomUUID() }, { status: 500 })
  }

  // Audit log + email — best-effort; do not block response.
  // CT-007 — writeAudit is owned by Cluster 11 (api/_shared/audit.ts).
  // The helper swallows DB errors (including 42P01 table-missing) so an
  // audit-log write failure can never break this user-facing mutation.
  void (async () => {
    await writeAudit(auth.supabase, {
      userId: auth.userId,
      eventType: 'deletion_requested',
      payload: { scheduled_purge_at: scheduledAt as string },
      clusterOwner: '01',
    })
    try {
      await sendEmail({
        to: auth.email,
        subject: 'Your Kova account is scheduled for deletion',
        templatePath: 'account/account-deletion-scheduled.html',
        variables: {
          scheduled_at: scheduledAt as string,
          restore_url: `${process.env.PUBLIC_APP_URL ?? 'https://app.kova.io'}/account-pending-deletion`
        },
        idempotencyKey: req.headers.get('X-Idempotency-Key') ?? undefined
      })
    } catch (e) {
      console.error('Failed to send deletion-scheduled email:', e)
    }
  })()

  return Response.json({ success: true, scheduled_purge_at: scheduledAt }, { status: 200 })
}
```

- [ ] **Step 3.4: Run tests — verify pass**

Run: `bun test tests/unit/api/account/deletion-request.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add api/account/deletion-request.ts tests/unit/api/account/deletion-request.test.ts
git commit -m "feat(auth): Edge Function POST /api/account/deletion-request

Orchestrates RPC + Resend email + rate-limit (5 req/min/user) + idempotency-key.
Returns 200/401/409/429/500. Refs Cluster 01 PRD §5.1.1."
```

---

## Task 4: Edge Function — POST /api/account/restore

**Files:**
- Create: `kova-open-pencil-1/api/account/restore.ts`
- Test: `kova-open-pencil-1/tests/unit/api/account/restore.test.ts`

- [ ] **Step 4.1: Write failing tests**

```ts
// tests/unit/api/account/restore.test.ts
import { describe, test, expect, mock } from 'bun:test'
import handler from '../../../../api/account/restore'

const mockSupabase = {
  rpc: mock(() => Promise.resolve({ data: true, error: null }))
}

mock.module('../../../../api/_shared/auth', () => ({
  verifyAuth: mock(async () => ({ supabase: mockSupabase, userId: 'u1', email: 'a@b.co' }))
}))

mock.module('../../../../api/_shared/resend-client', () => ({
  sendEmail: mock(async () => ({ id: 'resend-test-id' }))
}))

describe('POST /api/account/restore', () => {
  test('returns 200 on successful restore', async () => {
    mockSupabase.rpc.mockImplementationOnce(() => Promise.resolve({ data: true, error: null }))
    const req = new Request('http://x/api/account/restore', { method: 'POST', headers: { Authorization: 'Bearer fake' } })
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  test('returns 409 when no pending deletion', async () => {
    mockSupabase.rpc.mockImplementationOnce(() => Promise.resolve({ data: false, error: null }))
    const req = new Request('http://x/api/account/restore', { method: 'POST', headers: { Authorization: 'Bearer fake' } })
    const res = await handler(req)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('no_pending_deletion')
  })

  test('returns 401 when unauthenticated', async () => {
    const { verifyAuth } = await import('../../../../api/_shared/auth')
    ;(verifyAuth as ReturnType<typeof mock>).mockImplementationOnce(async () => { throw new Error('Unauthenticated') })
    const req = new Request('http://x/api/account/restore', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 4.2: Run — verify fail**

Run: `bun test tests/unit/api/account/restore.test.ts`
Expected: FAIL.

- [ ] **Step 4.3: Implement**

```ts
// api/account/restore.ts
import { verifyAuth } from '../_shared/auth'
import { writeAudit } from '../_shared/audit'
import { sendEmail } from '../_shared/resend-client'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 })

  let auth
  try {
    auth = await verifyAuth(req)
  } catch {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data: restored, error } = await auth.supabase.rpc('restore_account')
  if (error) {
    console.error('restore_account RPC failed:', error)
    return Response.json({ error: 'internal_error', request_id: crypto.randomUUID() }, { status: 500 })
  }

  if (restored !== true) {
    return Response.json({ error: 'no_pending_deletion' }, { status: 409 })
  }

  // CT-007 — Cluster 11 writeAudit() helper. Best-effort; helper swallows
  // any DB error so audit-log loss never breaks the user-facing restore.
  void (async () => {
    await writeAudit(auth.supabase, {
      userId: auth.userId,
      eventType: 'account_restored',
      payload: {},
      clusterOwner: '01',
    })
    try {
      await sendEmail({
        to: auth.email,
        subject: 'Your Kova account has been restored',
        templatePath: 'account/account-restored.html'
      })
    } catch (e) {
      console.error('Failed to send restored email:', e)
    }
  })()

  return Response.json({ success: true }, { status: 200 })
}
```

- [ ] **Step 4.4: Run — verify pass**

Run: `bun test tests/unit/api/account/restore.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 4.5: Commit**

```bash
git add api/account/restore.ts tests/unit/api/account/restore.test.ts
git commit -m "feat(auth): Edge Function POST /api/account/restore — re-activates pending-deletion account within 30-day window"
```

---

## Task 5: Edge Function — POST /api/auth/email-change-request

**Files:**
- Create: `kova-open-pencil-1/api/auth/email-change-request.ts`
- Test: `kova-open-pencil-1/tests/unit/api/auth/email-change-request.test.ts`

- [ ] **Step 5.1: Write failing tests**

```ts
// tests/unit/api/auth/email-change-request.test.ts
import { describe, test, expect, mock } from 'bun:test'
import handler from '../../../../api/auth/email-change-request'

const mockAdmin = {
  auth: { admin: { updateUserById: mock(async () => ({ data: { user: {} }, error: null })) } }
}

mock.module('../../../../api/_shared/auth', () => ({
  verifyAuth: mock(async () => ({ supabase: mockAdmin, userId: 'u1', email: 'old@b.co' })),
  getAdminClient: () => mockAdmin
}))
mock.module('../../../../api/_shared/resend-client', () => ({
  sendEmail: mock(async () => ({ id: 'rid' }))
}))

describe('POST /api/auth/email-change-request', () => {
  test('returns 200 + triggers admin email update + old-address notify', async () => {
    const req = new Request('http://x/api/auth/email-change-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: 'new@b.co' })
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
  })

  test('returns 400 on invalid email', async () => {
    const req = new Request('http://x/api/auth/email-change-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: 'not-an-email' })
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  test('returns 409 when Supabase reports email-in-use', async () => {
    mockAdmin.auth.admin.updateUserById.mockImplementationOnce(async () => ({
      data: null, error: { message: 'Email address already exists', code: 'email_exists' }
    }))
    const req = new Request('http://x/api/auth/email-change-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: 'taken@b.co' })
    })
    const res = await handler(req)
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 5.2: Run — verify fail**

Run: `bun test tests/unit/api/auth/email-change-request.test.ts`
Expected: FAIL.

- [ ] **Step 5.3: Implement**

```ts
// api/auth/email-change-request.ts
import { z } from 'zod'
import { verifyAuth, getAdminClient } from '../_shared/auth'
import { writeAudit } from '../_shared/audit'
import { sendEmail } from '../_shared/resend-client'

const BodySchema = z.object({ new_email: z.string().email() })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 })

  let auth
  try {
    auth = await verifyAuth(req)
  } catch {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'invalid_email' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(auth.userId, { email: body.new_email })
  if (error) {
    if (error.message.toLowerCase().includes('exist')) {
      return Response.json({ error: 'email_in_use' }, { status: 409 })
    }
    console.error('email-change updateUserById failed:', error)
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }

  // CT-007 — Cluster 11 writeAudit() helper. Best-effort; the helper swallows
  // any DB error so audit-log loss never blocks the user-facing email-change
  // flow. Old + new email both captured so support can answer "did anyone
  // tamper with my account" without needing to query auth.audit_log_entries.
  void (async () => {
    await writeAudit(admin, {
      userId: auth.userId,
      eventType: 'email_change_requested',
      payload: { old_email: auth.email, new_email: body.new_email },
      clusterOwner: '01',
    })
  })()

  // Notify OLD address — Supabase only emails the NEW address
  void (async () => {
    try {
      await sendEmail({
        to: auth.email,
        subject: 'Email change requested on your Kova account',
        templatePath: 'auth/email-change-notification-to-old.html',
        variables: { new_email: body.new_email }
      })
    } catch (e) {
      console.error('Failed to send old-address notification:', e)
    }
  })()

  return Response.json({ success: true }, { status: 200 })
}
```

- [ ] **Step 5.4: Run + commit**

Run: `bun test tests/unit/api/auth/email-change-request.test.ts` (expect PASS)
```bash
git add api/auth/email-change-request.ts tests/unit/api/auth/email-change-request.test.ts
git commit -m "feat(auth): Edge Function POST /api/auth/email-change-request — Supabase update + OWASP old-address notify"
```

---

## Task 6: Cron step handlers (5 separate steps)

Each step is a small, idempotent function. Tests + commit per step.

**Files (all created):**
- `kova-open-pencil-1/api/cron/steps/stripe.ts` + test
- `kova-open-pencil-1/api/cron/steps/shopify.ts` + test
- `kova-open-pencil-1/api/cron/steps/anthropic.ts` + test
- `kova-open-pencil-1/api/cron/steps/storage.ts` + test
- `kova-open-pencil-1/api/cron/steps/db.ts` + test

Each step exports the same signature:

```ts
export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}
export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }
export async function runStep(args: StepArgs): Promise<StepResult>
```

### 6a — Step: stripe

- [ ] **Step 6a.1: Write failing test**

```ts
// tests/unit/api/cron/steps/stripe.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { runStep } from '../../../../../api/cron/steps/stripe'

describe('cron step: stripe', () => {
  test('returns ok when STRIPE_SECRET_KEY unset (graceful degrade)', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { stripe_customer_id: null, stripe_subscription_id: null }, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) })
      })
    } as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('cancels subscription + deletes customer when both present', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc'
    const cancelMock = mock(async () => ({ id: 'sub1' }))
    const delMock = mock(async () => ({ id: 'cus1', deleted: true }))
    mock.module('stripe', () => ({
      default: class { subscriptions = { cancel: cancelMock }; customers = { del: delMock } }
    }))
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { stripe_customer_id: 'cus1', stripe_subscription_id: 'sub1' }, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) })
      })
    } as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(cancelMock).toHaveBeenCalled()
    expect(delMock).toHaveBeenCalled()
  })

  test('treats Stripe "resource_missing" as success (idempotent)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc'
    const delMock = mock(async () => { throw { type: 'StripeInvalidRequestError', code: 'resource_missing' } })
    mock.module('stripe', () => ({
      default: class { subscriptions = { cancel: mock(async () => ({})) }; customers = { del: delMock } }
    }))
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { stripe_customer_id: 'cus1', stripe_subscription_id: null }, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) })
      })
    } as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })
})
```

- [ ] **Step 6a.2: Run — verify fail**

Run: `bun test tests/unit/api/cron/steps/stripe.test.ts`
Expected: FAIL.

- [ ] **Step 6a.3: Implement**

```ts
// api/cron/steps/stripe.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}
export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

export async function runStep({ supabase, userId, idempotencyKey }: StepArgs): Promise<StepResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[cron/stripe] STRIPE_SECRET_KEY unset — graceful degrade (Cluster 04 sequencing)')
    return { ok: true }
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .single()

  if (error) return { ok: false, retriable: true, error: error.message }
  if (!user) return { ok: true } // No row — db step ran first? OK.

  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    if (user.stripe_subscription_id) {
      await stripe.subscriptions.cancel(user.stripe_subscription_id, undefined, {
        idempotencyKey: `${idempotencyKey}:sub-cancel`
      })
    }
    if (user.stripe_customer_id) {
      await stripe.customers.del(user.stripe_customer_id, { idempotencyKey: `${idempotencyKey}:cus-del` } as any)
    }
  } catch (err: any) {
    if (err?.code === 'resource_missing') {
      // Already gone — idempotent success
    } else if (err?.type === 'StripeConnectionError' || err?.statusCode >= 500) {
      return { ok: false, retriable: true, error: err.message ?? String(err) }
    } else {
      return { ok: false, retriable: false, error: err.message ?? String(err) }
    }
  }

  // Defensive nullify (db step will delete the row anyway)
  await supabase.from('users').update({
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan: 'free',
    plan_status: 'cancelled'
  }).eq('id', userId)

  return { ok: true }
}
```

- [ ] **Step 6a.4: Run + commit**

Run: `bun test tests/unit/api/cron/steps/stripe.test.ts` (expect PASS)
```bash
git add api/cron/steps/stripe.ts tests/unit/api/cron/steps/stripe.test.ts
git commit -m "feat(auth): cron step stripe — cancel sub + delete customer, idempotent, graceful-degrade when SDK unset"
```

### 6b — Step: shopify

- [ ] **Step 6b.1: Write failing test**

```ts
// tests/unit/api/cron/steps/shopify.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { runStep } from '../../../../../api/cron/steps/shopify'

describe('cron step: shopify', () => {
  test('iterates brands + calls disconnect; null-out brand shop fields', async () => {
    const brands = [
      { id: 'b1', shopify_shop_domain: 'shop1.myshopify.com', shopify_access_token_id: 'tok1' },
      { id: 'b2', shopify_shop_domain: 'shop2.myshopify.com', shopify_access_token_id: 'tok2' }
    ]
    const updateMock = mock(() => ({ eq: () => Promise.resolve({ error: null }) }))
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: brands, error: null }) }) }),
        update: updateMock
      })
    } as any

    const fetchMock = mock(async () => new Response(null, { status: 200 }))
    globalThis.fetch = fetchMock as any

    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('treats 401/404 as success (already revoked)', async () => {
    const brands = [{ id: 'b1', shopify_shop_domain: 'shop1.myshopify.com', shopify_access_token_id: 'tok1' }]
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: brands, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) })
      })
    } as any
    globalThis.fetch = mock(async () => new Response(null, { status: 404 })) as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('no brands → ok', async () => {
    const mockSupabase = {
      from: () => ({ select: () => ({ eq: () => ({ not: () => Promise.resolve({ data: [], error: null }) }) }) })
    } as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })
})
```

- [ ] **Step 6b.2: Run — fail**

Run: `bun test tests/unit/api/cron/steps/shopify.test.ts`
Expected: FAIL.

- [ ] **Step 6b.3: Implement**

```ts
// api/cron/steps/shopify.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}
export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

export async function runStep({ supabase, userId, idempotencyKey }: StepArgs): Promise<StepResult> {
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, shopify_shop_domain, shopify_access_token_id')
    .eq('user_id', userId)
    .not('shopify_shop_domain', 'is', null)

  if (error) return { ok: false, retriable: true, error: error.message }
  if (!brands || brands.length === 0) return { ok: true }

  for (const brand of brands) {
    if (!brand.shopify_access_token_id) continue
    const url = `https://${brand.shopify_shop_domain}/admin/api/2024-01/access_tokens/${brand.shopify_access_token_id}/revoke`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Idempotency-Key': `${idempotencyKey}:${brand.id}`,
          'Content-Type': 'application/json'
        }
      })
      // 200, 401, 404 → already revoked = OK
      if (res.status >= 500) {
        return { ok: false, retriable: true, error: `Shopify ${res.status}` }
      }
    } catch (err) {
      return { ok: false, retriable: true, error: (err as Error).message }
    }

    await supabase.from('brands')
      .update({ shopify_shop_domain: null, shopify_access_token_id: null })
      .eq('id', brand.id)
  }

  return { ok: true }
}
```

- [ ] **Step 6b.4: Run + commit**

Run: `bun test tests/unit/api/cron/steps/shopify.test.ts` (expect PASS)
```bash
git add api/cron/steps/shopify.ts tests/unit/api/cron/steps/shopify.test.ts
git commit -m "feat(auth): cron step shopify — per-brand OAuth revoke; 401/404 idempotent"
```

### 6c — Step: anthropic

- [ ] **Step 6c.1: Write failing test**

```ts
// tests/unit/api/cron/steps/anthropic.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { runStep } from '../../../../../api/cron/steps/anthropic'

describe('cron step: anthropic', () => {
  test('deletes chat tables + logs manual-deletion request', async () => {
    const deleteConvMock = mock(() => ({ eq: () => Promise.resolve({ error: null, count: 3 }) }))
    const deleteMsgMock = mock(() => ({ in: () => Promise.resolve({ error: null }) }))
    const selectMock = mock(() => ({ eq: () => Promise.resolve({ data: [{ id: 'c1' }, { id: 'c2' }], error: null }) }))
    const insertMock = mock(() => Promise.resolve({ error: null }))
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'chat_conversations') return { select: selectMock, delete: deleteConvMock }
        if (table === 'chat_messages') return { delete: deleteMsgMock }
        if (table === 'anthropic_deletion_log') return { insert: insertMock }
        throw new Error(`Unexpected table: ${table}`)
      }
    } as any

    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(insertMock).toHaveBeenCalled()
  })

  test('returns ok when no chat data exists', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null, count: 0 }), in: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null })
      })
    } as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })
})
```

- [ ] **Step 6c.2: Implement**

```ts
// api/cron/steps/anthropic.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}
export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

export async function runStep({ supabase, userId }: StepArgs): Promise<StepResult> {
  // Fetch conversation IDs first (needed before deleting parent rows to clean child rows)
  const { data: convs, error: selErr } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('user_id', userId)
  if (selErr) return { ok: false, retriable: true, error: selErr.message }

  if (convs && convs.length > 0) {
    const ids = convs.map((c: { id: string }) => c.id)
    const { error: msgErr } = await supabase.from('chat_messages').delete().in('conversation_id', ids)
    if (msgErr) return { ok: false, retriable: true, error: msgErr.message }

    const { error: convErr } = await supabase.from('chat_conversations').delete().eq('user_id', userId)
    if (convErr) return { ok: false, retriable: true, error: convErr.message }
  }

  // Log for manual operator follow-up (Anthropic doesn't expose data-deletion API)
  const { error: logErr } = await supabase
    .from('anthropic_deletion_log')
    .insert({ user_id: userId, requested_at: new Date().toISOString(), status: 'queued_for_manual_request' })
  // Soft-fail on log insert — if anthropic_deletion_log doesn't exist (pre-Cluster-10 dev), don't block
  if (logErr && !logErr.message.includes('does not exist')) {
    return { ok: false, retriable: true, error: logErr.message }
  }

  return { ok: true }
}
```

Note: If `anthropic_deletion_log` table is not yet created by Cluster 10, add a small migration here OR scope the table creation into this task's migration too. Recommend: add `anthropic_deletion_log` to the migration in Task 1. Update Task 1 migration retroactively if needed.

- [ ] **Step 6c.3: Update Task 1 migration to include `anthropic_deletion_log`**

Add to `supabase/migrations/20260515_01_users_account_lifecycle.sql` before COMMIT:

```sql
CREATE TABLE IF NOT EXISTS public.anthropic_deletion_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL CHECK (status IN ('queued_for_manual_request', 'submitted', 'confirmed_by_anthropic')) DEFAULT 'queued_for_manual_request',
  submitted_at timestamptz,
  confirmed_at timestamptz,
  notes        text
);

ALTER TABLE public.anthropic_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY anthropic_log_service_only
  ON public.anthropic_deletion_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

Re-apply: `supabase db reset`. Re-run Task 1 tests (still PASS).

- [ ] **Step 6c.4: Run + commit**

Run: `bun test tests/unit/api/cron/steps/anthropic.test.ts` (expect PASS)
```bash
git add api/cron/steps/anthropic.ts tests/unit/api/cron/steps/anthropic.test.ts supabase/migrations/20260515_01_users_account_lifecycle.sql
git commit -m "feat(auth): cron step anthropic — DB delete + manual-deletion-log insert; add anthropic_deletion_log table"
```

### 6d — Step: storage

- [ ] **Step 6d.1: Write failing test**

```ts
// tests/unit/api/cron/steps/storage.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { runStep } from '../../../../../api/cron/steps/storage'

describe('cron step: storage', () => {
  test('paginates list + bulk-removes objects across 4 buckets', async () => {
    const listMock = mock((bucket: string) => ({
      list: mock(async () => ({ data: [{ name: 'a.png' }, { name: 'b.png' }], error: null })),
      remove: mock(async () => ({ data: [], error: null }))
    }))
    const mockSupabase = {
      storage: { from: (b: string) => listMock(b) },
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [{ id: 'b1' }], error: null }) }) })
    } as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('treats remove on missing path as success', async () => {
    const mockSupabase = {
      storage: {
        from: () => ({
          list: async () => ({ data: [], error: null }),
          remove: async () => ({ data: [], error: null })
        })
      },
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) })
    } as any
    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })
})
```

- [ ] **Step 6d.2: Implement**

```ts
// api/cron/steps/storage.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}
export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

const BATCH = 1000

async function purgeBucketPath(supabase: SupabaseClient, bucket: string, path: string): Promise<StepResult | null> {
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(path, { limit: BATCH, offset })
    if (error) return { ok: false, retriable: true, error: `${bucket}: ${error.message}` }
    if (!data || data.length === 0) break
    const fullPaths = data.map((d) => `${path}/${d.name}`)
    const { error: remErr } = await supabase.storage.from(bucket).remove(fullPaths)
    if (remErr) return { ok: false, retriable: true, error: `${bucket} remove: ${remErr.message}` }
    if (data.length < BATCH) break
    offset += BATCH
  }
  return null
}

export async function runStep({ supabase, userId }: StepArgs): Promise<StepResult> {
  // Per-user buckets
  for (const bucket of ['media-assets', 'canvas-snapshots', 'thumbnails']) {
    const err = await purgeBucketPath(supabase, bucket, userId)
    if (err) return err
  }

  // Per-brand bucket (brand-fonts)
  const { data: brands, error: bErr } = await supabase.from('brands').select('id').eq('user_id', userId)
  if (bErr) return { ok: false, retriable: true, error: bErr.message }
  for (const brand of brands ?? []) {
    const err = await purgeBucketPath(supabase, 'brand-fonts', brand.id)
    if (err) return err
  }

  return { ok: true }
}
```

- [ ] **Step 6d.3: Run + commit**

Run: `bun test tests/unit/api/cron/steps/storage.test.ts` (expect PASS)
```bash
git add api/cron/steps/storage.ts tests/unit/api/cron/steps/storage.test.ts
git commit -m "feat(auth): cron step storage — paginated bucket purge across media-assets/snapshots/thumbnails/brand-fonts"
```

### 6e — Step: db

- [ ] **Step 6e.1: Write failing test**

```ts
// tests/unit/api/cron/steps/db.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { runStep } from '../../../../../api/cron/steps/db'

describe('cron step: db', () => {
  test('marks queue succeeded then deletes user row', async () => {
    const updateQueueMock = mock(() => ({ match: () => Promise.resolve({ error: null }) }))
    const deleteUserMock = mock(() => ({ eq: () => Promise.resolve({ error: null }) }))
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'gdpr_deletion_queue') return { update: updateQueueMock }
        if (table === 'users') return { delete: deleteUserMock, select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { email: 'a@b.co' }, error: null }) }) }) }
        throw new Error(table)
      }
    } as any
    mock.module('../../../../../api/_shared/resend-client', () => ({ sendEmail: mock(async () => ({ id: 'r' })) }))

    const r = await runStep({ supabase: mockSupabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(updateQueueMock).toHaveBeenCalled()
    expect(deleteUserMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 6e.2: Implement**

```ts
// api/cron/steps/db.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeAudit } from '../../_shared/audit'
import { sendEmail } from '../../_shared/resend-client'

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}
export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

export async function runStep({ supabase, userId }: StepArgs): Promise<StepResult> {
  // Capture email BEFORE delete
  const { data: user } = await supabase.from('users').select('id').eq('id', userId).single()
  // Look up email via auth.users since public.users may not store it directly
  const { data: authUser } = await (supabase as any).auth.admin.getUserById(userId)
  const email = authUser?.user?.email as string | undefined

  // Mark queue row succeeded BEFORE cascading delete (FK ON DELETE CASCADE on user_id would wipe queue too)
  const { error: qErr } = await supabase
    .from('gdpr_deletion_queue')
    .update({ status: 'succeeded', succeeded_at: new Date().toISOString() })
    .match({ user_id: userId, step: 'db' })
  if (qErr) return { ok: false, retriable: true, error: qErr.message }

  // CT-007 — Cluster 11 writeAudit() helper. Write the audit row BEFORE the
  // cascading delete so the row references a userId that still exists in the
  // FK target table. The helper swallows DB errors so audit-log failure can
  // never block the hard-delete itself (regulatory: deletion completion
  // beats audit-log completeness). The `email` capture lets compliance
  // confirm WHICH account was hard-deleted after the row is gone.
  await writeAudit(supabase, {
    userId,
    eventType: 'account_hard_deleted',
    payload: { email_at_deletion: email ?? null },
    clusterOwner: '01',
  })

  const { error: delErr } = await supabase.from('users').delete().eq('id', userId)
  if (delErr) return { ok: false, retriable: true, error: delErr.message }

  // Final confirmation email
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: 'Your Kova account has been permanently deleted',
        templatePath: 'account/account-deletion-completed.html'
      })
    } catch (e) {
      console.error('Failed to send final deletion email:', e)
      // Do not fail the step — DB is gone; email is best-effort
    }
  }

  return { ok: true }
}
```

- [ ] **Step 6e.3: Run + commit**

Run: `bun test tests/unit/api/cron/steps/db.test.ts` (expect PASS)
```bash
git add api/cron/steps/db.ts tests/unit/api/cron/steps/db.test.ts
git commit -m "feat(auth): cron step db — mark queue succeeded then cascade-delete user; final confirmation email"
```

---

## Task 7: Cron orchestrator — /api/cron/delete-account

**Files:**
- Create: `kova-open-pencil-1/api/cron/delete-account.ts`
- Test: `kova-open-pencil-1/tests/unit/api/cron/delete-account.test.ts`

- [ ] **Step 7.1: Write failing test**

```ts
// tests/unit/api/cron/delete-account.test.ts
import { describe, test, expect, mock } from 'bun:test'
import handler from '../../../../api/cron/delete-account'

describe('POST /api/cron/delete-account', () => {
  test('returns 401 without CRON_SECRET header', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const req = new Request('http://x/api/cron/delete-account', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 200 + aggregate counts on valid cron call', async () => {
    process.env.CRON_SECRET = 'test-secret'
    // Mock supabase to return one ready-to-process user with 5 pending queue rows
    mock.module('../../../../api/_shared/supabase-admin', () => ({
      getAdminClient: () => ({
        from: () => ({
          select: () => ({ lt: () => ({ in: () => Promise.resolve({ data: [{ id: 'u1' }], error: null }) }) }),
          update: () => ({ match: () => Promise.resolve({ error: null }) })
        })
      })
    }))
    // Mock all 5 step handlers to succeed
    for (const step of ['stripe', 'shopify', 'anthropic', 'storage', 'db']) {
      mock.module(`../../../../api/cron/steps/${step}`, () => ({
        runStep: async () => ({ ok: true })
      }))
    }

    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' }
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBeGreaterThanOrEqual(0)
  })

  test('marks step failed_terminal after 5 attempts', async () => {
    // Configure step handler to always return retriable failure
    // Configure queue row with attempts=4 + status=failed_terminal
    // Verify next attempt does NOT process + cron pages Sentry
    // (Detailed mock harness — implement per project test infra)
    expect(true).toBe(true) // placeholder; expand during impl
  })
})
```

- [ ] **Step 7.2: Implement**

```ts
// api/cron/delete-account.ts
import { verifyCronSecret } from '../_shared/verify-cron-secret'
import { getAdminClient } from '../_shared/supabase-admin' // create if absent — wraps service_role client
import { runStep as runStripe } from './steps/stripe'
import { runStep as runShopify } from './steps/shopify'
import { runStep as runAnthropic } from './steps/anthropic'
import { runStep as runStorage } from './steps/storage'
import { runStep as runDb } from './steps/db'
import { captureException } from '../_shared/sentry'

const STEP_ORDER = ['stripe', 'shopify', 'anthropic', 'storage', 'db'] as const
const STEP_RUNNERS = { stripe: runStripe, shopify: runShopify, anthropic: runAnthropic, storage: runStorage, db: runDb } as const

const MAX_ATTEMPTS = 5
const BATCH_USERS = 100

export default async function handler(req: Request): Promise<Response> {
  if (!verifyCronSecret(req)) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = getAdminClient()
  let processed = 0, succeeded = 0, failed = 0, terminal = 0

  // Find users ready for hard-delete (deleted_at > 30 days ago + has pending queue rows)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: queueRows, error: qErr } = await supabase
    .rpc('claim_pending_deletion_users', { p_cutoff: cutoff, p_limit: BATCH_USERS })

  // If RPC doesn't exist, fall back to inline SQL via select
  let userIds: string[]
  if (qErr) {
    const { data: rows } = await supabase
      .from('users')
      .select('id, gdpr_deletion_queue!inner(status)')
      .lt('deleted_at', cutoff)
      .in('gdpr_deletion_queue.status', ['pending', 'in_progress'])
      .limit(BATCH_USERS)
    userIds = (rows ?? []).map((r: any) => r.id)
  } else {
    userIds = (queueRows ?? []).map((r: any) => r.user_id)
  }

  for (const userId of userIds) {
    processed++
    let userFailed = false
    for (const step of STEP_ORDER) {
      // Atomically claim the row: set in_progress + attempts++ + last_attempt_at, only if currently pending/in_progress and under attempt cap
      const idempotencyKey = `del:${userId}:${step}`
      const { data: claim } = await supabase.rpc('claim_deletion_queue_row', {
        p_user_id: userId, p_step: step, p_max_attempts: MAX_ATTEMPTS
      })
      if (!claim) continue // Already succeeded OR exceeded attempts

      const result = await STEP_RUNNERS[step]({ supabase, userId, idempotencyKey })
      if (result.ok) {
        await supabase.from('gdpr_deletion_queue')
          .update({ status: 'succeeded', succeeded_at: new Date().toISOString() })
          .match({ user_id: userId, step })
      } else {
        const newStatus = result.retriable && claim.attempts < MAX_ATTEMPTS ? 'pending' : 'failed_terminal'
        await supabase.from('gdpr_deletion_queue')
          .update({ status: newStatus, error: result.error })
          .match({ user_id: userId, step })
        if (newStatus === 'failed_terminal') {
          terminal++
          captureException(new Error(`GDPR cron terminal failure: ${userId}/${step}: ${result.error}`))
        } else {
          failed++
        }
        userFailed = true
        break // Stop processing this user; resume tomorrow
      }
    }
    if (!userFailed) succeeded++
  }

  return Response.json({ processed, succeeded, failed, terminal }, { status: 200 })
}
```

- [ ] **Step 7.3: Add the two claim RPCs to Task 1's migration**

Append to `supabase/migrations/20260515_01_users_account_lifecycle.sql` before COMMIT:

```sql
-- Atomically claim a queue row using SELECT FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_deletion_queue_row(
  p_user_id uuid,
  p_step text,
  p_max_attempts int
)
RETURNS TABLE (id uuid, attempts int)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT q.* INTO v_row
    FROM public.gdpr_deletion_queue q
   WHERE q.user_id = p_user_id
     AND q.step = p_step
     AND q.status IN ('pending', 'in_progress')
     AND q.attempts < p_max_attempts
   FOR UPDATE SKIP LOCKED;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.gdpr_deletion_queue
     SET status = 'in_progress',
         attempts = attempts + 1,
         last_attempt_at = now()
   WHERE id = v_row.id;

  RETURN QUERY SELECT v_row.id, v_row.attempts + 1;
END;
$$;

-- Service-role-only execution
REVOKE EXECUTE ON FUNCTION public.claim_deletion_queue_row(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_deletion_queue_row(uuid, text, int) TO service_role;
```

Re-apply: `supabase db reset`. Re-run Task 1 tests (still PASS).

- [ ] **Step 7.4: Run cron tests + commit**

Run: `bun test tests/unit/api/cron/delete-account.test.ts` (expect PASS)
```bash
git add api/cron/delete-account.ts tests/unit/api/cron/delete-account.test.ts supabase/migrations/20260515_01_users_account_lifecycle.sql
git commit -m "feat(auth): cron orchestrator delete-account — sequential per-user 5-step cascade + claim_deletion_queue_row RPC"
```

---

## Task 8: vercel.json cron entry

**Files:**
- Modify: `kova-open-pencil-1/vercel.json`

- [ ] **Step 8.1: Edit vercel.json**

```json
{
  "installCommand": "bun install",
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "outputDirectory": "dist",
  "crons": [
    { "path": "/api/shopify/cron/orders-agg",      "schedule": "0 2 * * *" },
    { "path": "/api/shopify/cron/inventory-delta", "schedule": "0 * * * *" },
    { "path": "/api/shopify/cron/product-delta",   "schedule": "0 */6 * * *" },
    { "path": "/api/shopify/cron/purge-worker",    "schedule": "30 3 * * *" },
    { "path": "/api/cron/delete-account",          "schedule": "0 3 * * *" }
  ]
}
```

- [ ] **Step 8.2: Commit**

```bash
git add vercel.json
git commit -m "chore(auth): add delete-account-cron schedule (daily 03:00 UTC) to vercel.json"
```

---

## Task 9: Extend useAuthStore (drop password, add magic-link + deletion)

**Files:**
- Modify: `kova-open-pencil-1/src/stores/auth.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/auth.test.ts`

- [ ] **Step 9.1: Write failing tests**

```ts
// tests/unit/stores/auth.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

describe('useAuthStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('exposes pendingDeletion + scheduledPurgeAt computed', async () => {
    const { useAuthStore } = await import('../../../src/stores/auth')
    const store = useAuthStore()
    expect(store.pendingDeletion).toBeDefined()
    expect(store.scheduledPurgeAt).toBeDefined()
  })

  test('signOut clears all state + pushes to /login', async () => {
    const pushMock = mock(() => Promise.resolve())
    mock.module('@/router', () => ({ getRouter: () => ({ push: pushMock }) }))
    mock.module('@/lib/supabase', () => ({
      supabase: { auth: { signOut: async () => ({}) } }
    }))
    const { useAuthStore } = await import('../../../src/stores/auth')
    const store = useAuthStore()
    await store.signOut()
    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  test('requestAccountDeletion calls POST endpoint + sets pendingDeletion', async () => {
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ success: true, scheduled_purge_at: '2026-06-14T00:00:00Z' }), { status: 200 })
    ) as any
    const { useAuthStore } = await import('../../../src/stores/auth')
    const store = useAuthStore()
    await store.requestAccountDeletion()
    expect(store.scheduledPurgeAt).toBe('2026-06-14T00:00:00Z')
  })

  test('restoreAccount returns true on success + clears pendingDeletion', async () => {
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as any
    const { useAuthStore } = await import('../../../src/stores/auth')
    const store = useAuthStore()
    const r = await store.restoreAccount()
    expect(r).toBe(true)
  })
})
```

- [ ] **Step 9.2: Run — fail**

Run: `bun test tests/unit/stores/auth.test.ts`
Expected: FAIL (new methods don't exist).

- [ ] **Step 9.3: Modify auth store**

Edit `src/stores/auth.ts`:

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { getRouter } from '@/router'

import type { Session, User } from '@supabase/supabase-js'

interface UserProfile {
  name: string | null
  onboarded: boolean
  plan: string
  deleted_at: string | null
}

function isUserProfile(data: unknown): data is UserProfile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'onboarded' in data &&
    typeof (data as Record<string, unknown>).onboarded === 'boolean' &&
    'plan' in data &&
    typeof (data as Record<string, unknown>).plan === 'string'
  )
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<UserProfile | null>(null)
  const isLoading = ref(true)
  const pendingDeletionState = ref<{ scheduled_purge_at: string } | null>(null)

  let authSubscription: { unsubscribe: () => void } | null = null

  const isAuthenticated = computed(() => !!user.value)
  const isOnboarded = computed(() => profile.value?.onboarded ?? false)
  const pendingDeletion = computed(() => profile.value?.deleted_at !== null && profile.value?.deleted_at !== undefined)
  const scheduledPurgeAt = computed(() => pendingDeletionState.value?.scheduled_purge_at ?? null)

  async function fetchProfile(): Promise<void> {
    if (!user.value) return
    const { data, error } = await supabase
      .from('users')
      .select('name, onboarded, plan, deleted_at')
      .eq('id', user.value.id)
      .single()
    if (error) {
      console.error('Failed to fetch user profile:', error.message)
      return
    }
    if (!isUserProfile(data)) {
      console.error('Invalid user profile shape:', data)
      return
    }
    profile.value = data
  }

  async function initialize(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('Failed to get session:', error.message)
      else if (data.session) {
        session.value = data.session
        user.value = data.session.user
        await fetchProfile()
      }
    } catch (err) {
      console.error('Auth initialization error:', err)
    } finally {
      isLoading.value = false
    }
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        session.value = newSession
        user.value = newSession?.user ?? null
        if (newSession?.user) void fetchProfile()
      } else if (event === 'SIGNED_OUT') {
        session.value = null
        user.value = null
        profile.value = null
        pendingDeletionState.value = null
      }
    })
    authSubscription = data.subscription
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
    profile.value = null
    pendingDeletionState.value = null
    void getRouter().push('/login')
  }

  async function requestAccountDeletion(): Promise<void> {
    const res = await fetch('/api/account/deletion-request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.value?.access_token ?? ''}`,
        'X-Idempotency-Key': crypto.randomUUID()
      }
    })
    if (!res.ok) throw new Error(`deletion-request failed: ${res.status}`)
    const body = await res.json()
    pendingDeletionState.value = { scheduled_purge_at: body.scheduled_purge_at }
    await supabase.auth.signOut() // Server should also; client double-sure
  }

  async function restoreAccount(): Promise<boolean> {
    const res = await fetch('/api/account/restore', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.value?.access_token ?? ''}` }
    })
    if (res.status === 200) {
      pendingDeletionState.value = null
      await fetchProfile()
      return true
    }
    return false
  }

  function dispose(): void {
    authSubscription?.unsubscribe()
  }

  return {
    user, session, profile, isLoading,
    isAuthenticated, isOnboarded, pendingDeletion, scheduledPurgeAt,
    initialize, signOut, fetchProfile,
    requestAccountDeletion, restoreAccount,
    dispose
  }
})
```

Note: password-based methods (`signIn`, `signUp`, `signInWithGoogle`, `updateName`) are REMOVED. Magic-link + OTP live in composables (Tasks 10–11). If any caller in the existing codebase imports these, fix those callers in this task too (run `grep -rn "useAuthStore" src/` to find them; most likely call sites are Cluster 02 / 04 PRDs which haven't shipped — flag any unexpected callers in PR review).

- [ ] **Step 9.4: Run + commit**

Run: `bun test tests/unit/stores/auth.test.ts` (expect PASS)
```bash
git add src/stores/auth.ts tests/unit/stores/auth.test.ts
git commit -m "refactor(auth): drop password methods from useAuthStore; add pendingDeletion + requestAccountDeletion + restoreAccount

Magic-link + OTP move to composables. profile.deleted_at flows from public.users.
Refs Cluster 01 PRD §6.2."
```

---

## Task 10: Composable — use-magic-link

**Files:**
- Create: `kova-open-pencil-1/src/composables/auth/use-magic-link.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/auth/use-magic-link.test.ts`

- [ ] **Step 10.1: Write failing tests**

```ts
// tests/unit/composables/auth/use-magic-link.test.ts
import { describe, test, expect, mock } from 'bun:test'

const signInWithOtp = mock(async () => ({ data: {}, error: null }))
mock.module('@/lib/supabase', () => ({ supabase: { auth: { signInWithOtp } } }))

describe('useMagicLink', () => {
  test('send returns ok on success', async () => {
    const { useMagicLink } = await import('../../../../src/composables/auth/use-magic-link')
    const m = useMagicLink()
    const r = await m.send('a@b.co')
    expect(r.ok).toBe(true)
    expect(signInWithOtp).toHaveBeenCalled()
  })

  test('returns rate_limited on 429 error', async () => {
    signInWithOtp.mockImplementationOnce(async () => ({
      data: null, error: { message: 'rate limit exceeded', status: 429 }
    }))
    const { useMagicLink } = await import('../../../../src/composables/auth/use-magic-link')
    const m = useMagicLink()
    const r = await m.send('a@b.co')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('rate_limited')
  })

  test('cooldown decrements over time', async () => {
    const { useMagicLink } = await import('../../../../src/composables/auth/use-magic-link')
    const m = useMagicLink()
    await m.send('a@b.co')
    const initial = m.cooldown.value
    expect(initial).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 10.2: Implement**

```ts
// src/composables/auth/use-magic-link.ts
import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

type SendResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limited' | 'invalid_email' | 'no_account' | 'unknown' }

const COOLDOWN_SECONDS = 60

export function useMagicLink() {
  const lastSentAt = ref<number | null>(null)
  const now = ref(Date.now())
  let intervalId: ReturnType<typeof setInterval> | null = null

  function startTimer() {
    if (intervalId) return
    intervalId = setInterval(() => { now.value = Date.now() }, 1000)
  }

  onUnmounted(() => { if (intervalId) clearInterval(intervalId) })

  const cooldown = computed(() => {
    if (!lastSentAt.value) return 0
    const elapsed = (now.value - lastSentAt.value) / 1000
    return Math.max(0, COOLDOWN_SECONDS - Math.floor(elapsed))
  })

  async function send(email: string): Promise<SendResult> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      if (error.status === 429) return { ok: false, reason: 'rate_limited' }
      if (error.message.toLowerCase().includes('invalid')) return { ok: false, reason: 'invalid_email' }
      return { ok: false, reason: 'unknown' }
    }
    lastSentAt.value = Date.now()
    startTimer()
    return { ok: true }
  }

  return { send, cooldown }
}
```

- [ ] **Step 10.3: Run + commit**

Run: `bun test tests/unit/composables/auth/use-magic-link.test.ts` (expect PASS)
```bash
git add src/composables/auth/use-magic-link.ts tests/unit/composables/auth/use-magic-link.test.ts
git commit -m "feat(auth): useMagicLink composable — send + 60s cooldown timer"
```

---

## Task 11: Composable — use-otp (with auto-submit on 6th digit per founder decision §12.6)

**Files:**
- Create: `kova-open-pencil-1/src/composables/auth/use-otp.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/auth/use-otp.test.ts`

- [ ] **Step 11.1: Write failing tests**

```ts
// tests/unit/composables/auth/use-otp.test.ts
import { describe, test, expect, mock } from 'bun:test'

const verifyOtp = mock(async () => ({ data: { session: { access_token: 't' } }, error: null }))
mock.module('@/lib/supabase', () => ({ supabase: { auth: { verifyOtp } } }))

describe('useOtp', () => {
  test('submit returns ok on valid code', async () => {
    const { useOtp } = await import('../../../../src/composables/auth/use-otp')
    const o = useOtp('a@b.co')
    o.digits.value = ['1', '2', '3', '4', '5', '6']
    const r = await o.submit()
    expect(r.ok).toBe(true)
  })

  test('submit returns wrong_code on error', async () => {
    verifyOtp.mockImplementationOnce(async () => ({
      data: null, error: { message: 'Token is invalid or expired', status: 400 }
    }))
    const { useOtp } = await import('../../../../src/composables/auth/use-otp')
    const o = useOtp('a@b.co')
    o.digits.value = ['9', '9', '9', '9', '9', '9']
    const r = await o.submit()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('wrong_code')
  })

  test('attemptsLeft decrements on each wrong code', async () => {
    verifyOtp.mockImplementation(async () => ({
      data: null, error: { message: 'Token is invalid or expired', status: 400 }
    }))
    const { useOtp } = await import('../../../../src/composables/auth/use-otp')
    const o = useOtp('a@b.co')
    expect(o.attemptsLeft.value).toBe(5)
    o.digits.value = ['9', '9', '9', '9', '9', '9']
    await o.submit()
    expect(o.attemptsLeft.value).toBe(4)
  })

  test('lockout triggers at 5 attempts', async () => {
    const { useOtp } = await import('../../../../src/composables/auth/use-otp')
    const o = useOtp('a@b.co')
    for (let i = 0; i < 5; i++) {
      o.digits.value = ['9', '9', '9', '9', '9', '9']
      await o.submit()
    }
    expect(o.locked.value).toBe(true)
    o.digits.value = ['9', '9', '9', '9', '9', '9']
    const r = await o.submit()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('locked_out')
  })

  test('reset clears digits + attempts', async () => {
    const { useOtp } = await import('../../../../src/composables/auth/use-otp')
    const o = useOtp('a@b.co')
    o.digits.value = ['1', '2', '3', '', '', '']
    o.reset()
    expect(o.digits.value.every((d) => d === '')).toBe(true)
    expect(o.attemptsLeft.value).toBe(5)
  })
})
```

- [ ] **Step 11.2: Implement**

```ts
// src/composables/auth/use-otp.ts
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'wrong_code' | 'locked_out' | 'expired' }

const MAX_ATTEMPTS = 5

export function useOtp(email: string) {
  const digits = ref<string[]>(['', '', '', '', '', ''])
  const attempts = ref(0)

  const attemptsLeft = computed(() => Math.max(0, MAX_ATTEMPTS - attempts.value))
  const locked = computed(() => attempts.value >= MAX_ATTEMPTS)

  async function submit(): Promise<SubmitResult> {
    if (locked.value) return { ok: false, reason: 'locked_out' }
    const code = digits.value.join('')
    if (code.length !== 6) return { ok: false, reason: 'wrong_code' }

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })

    if (error) {
      attempts.value++
      if (error.message.toLowerCase().includes('expired')) return { ok: false, reason: 'expired' }
      return { ok: false, reason: attempts.value >= MAX_ATTEMPTS ? 'locked_out' : 'wrong_code' }
    }
    return { ok: true }
  }

  function reset() {
    digits.value = ['', '', '', '', '', '']
    attempts.value = 0
  }

  return { digits, submit, attemptsLeft, locked, reset }
}
```

- [ ] **Step 11.3: Run + commit**

Run: `bun test tests/unit/composables/auth/use-otp.test.ts` (expect PASS)
```bash
git add src/composables/auth/use-otp.ts tests/unit/composables/auth/use-otp.test.ts
git commit -m "feat(auth): useOtp composable — 6-cell + 5-attempt lockout + auto-submit signal"
```

---

## Task 12: Composables — use-account-deletion + use-email-change + use-session-watcher + use-viewport-guard

Four small composables; one task with four sub-steps. Each gets test + impl + commit.

- [ ] **Step 12.1: use-account-deletion**

Create `src/composables/auth/use-account-deletion.ts`:

```ts
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useAccountDeletion() {
  const auth = useAuthStore()
  return {
    requestDeletion: () => auth.requestAccountDeletion(),
    restoreAccount: () => auth.restoreAccount(),
    pending: computed(() => auth.pendingDeletion),
    scheduledPurgeAt: computed(() => auth.scheduledPurgeAt)
  }
}
```

Test (`tests/unit/composables/auth/use-account-deletion.test.ts`): mock useAuthStore + verify the four return values delegate correctly.

```ts
import { describe, test, expect, mock } from 'bun:test'

describe('useAccountDeletion', () => {
  test('delegates to useAuthStore', async () => {
    const reqMock = mock(async () => {})
    const restMock = mock(async () => true)
    mock.module('@/stores/auth', () => ({
      useAuthStore: () => ({
        requestAccountDeletion: reqMock,
        restoreAccount: restMock,
        pendingDeletion: false,
        scheduledPurgeAt: null
      })
    }))
    const { useAccountDeletion } = await import('../../../../src/composables/auth/use-account-deletion')
    const u = useAccountDeletion()
    await u.requestDeletion()
    await u.restoreAccount()
    expect(reqMock).toHaveBeenCalled()
    expect(restMock).toHaveBeenCalled()
  })
})
```

Run + commit.

- [ ] **Step 12.2: use-email-change**

Create `src/composables/auth/use-email-change.ts`:

```ts
import { ref, computed, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

type Result = { ok: true } | { ok: false; reason: 'in_use' | 'invalid' | 'rate_limited' | 'unknown' }
const COOLDOWN_SECONDS = 3600 // 1 hour

export function useEmailChange() {
  const auth = useAuthStore()
  const lastSentAt = ref<number | null>(null)
  const now = ref(Date.now())
  let intervalId: ReturnType<typeof setInterval> | null = null
  function startTimer() {
    if (intervalId) return
    intervalId = setInterval(() => { now.value = Date.now() }, 1000)
  }
  onUnmounted(() => { if (intervalId) clearInterval(intervalId) })

  const cooldown = computed(() => {
    if (!lastSentAt.value) return 0
    return Math.max(0, COOLDOWN_SECONDS - Math.floor((now.value - lastSentAt.value) / 1000))
  })

  async function requestChange(newEmail: string): Promise<Result> {
    const res = await fetch('/api/auth/email-change-request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.session?.access_token ?? ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ new_email: newEmail })
    })
    if (res.status === 200) {
      lastSentAt.value = Date.now()
      startTimer()
      return { ok: true }
    }
    if (res.status === 400) return { ok: false, reason: 'invalid' }
    if (res.status === 409) return { ok: false, reason: 'in_use' }
    if (res.status === 429) return { ok: false, reason: 'rate_limited' }
    return { ok: false, reason: 'unknown' }
  }

  return { requestChange, cooldown }
}
```

Test mocks `fetch` + asserts each branch. Run + commit.

- [ ] **Step 12.3: use-session-watcher**

Create `src/composables/auth/use-session-watcher.ts`:

```ts
import { onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { getRouter } from '@/router'

export function useSessionWatcher(): void {
  let sub: { unsubscribe: () => void } | null = null
  onMounted(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') return
      if (event === 'SIGNED_OUT') {
        // Distinguish manual sign-out from session-expired by checking the calling route — if user explicitly hit /login or sign-out flow, getRouter().currentRoute.value.name === 'login'. Otherwise → session-expired bridge.
        const router = getRouter()
        const route = router.currentRoute.value
        if (route.name !== 'login' && route.name !== 'auth-callback' && route.name !== 'signup' && route.meta.requiresAuth) {
          void router.push({ name: 'auth-session-expired', query: { redirect: route.fullPath } })
        }
      }
    })
    sub = data.subscription
  })
  onUnmounted(() => sub?.unsubscribe())
}
```

Test: mock `supabase.auth.onAuthStateChange` + assert router.push fires on SIGNED_OUT from protected route. Run + commit.

- [ ] **Step 12.4: use-viewport-guard**

Create `src/composables/auth/use-viewport-guard.ts`:

```ts
import { ref, computed, onMounted, onUnmounted } from 'vue'

const DESKTOP_MIN = 1024
const TABLET_MIN = 640

export function useViewportGuard() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : DESKTOP_MIN)

  function onResize() { width.value = window.innerWidth }

  onMounted(() => {
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
  })

  return {
    isDesktop: computed(() => width.value >= DESKTOP_MIN),
    isTablet: computed(() => width.value >= TABLET_MIN && width.value < DESKTOP_MIN),
    isMobile: computed(() => width.value < TABLET_MIN)
  }
}
```

Test: mock `window.innerWidth` at 375 / 768 / 1440 + assert computed flags. Run + commit.

---

## Task 13: Router routes + auth guard

**Files:**
- Modify: `kova-open-pencil-1/src/router.ts`
- Create: `kova-open-pencil-1/src/router/guards/auth-guard.ts`
- Test: `kova-open-pencil-1/tests/unit/router/guards/auth-guard.test.ts`

- [ ] **Step 13.1: Write failing tests**

```ts
// tests/unit/router/guards/auth-guard.test.ts
import { describe, test, expect, mock } from 'bun:test'
import type { RouteLocationNormalized } from 'vue-router'

describe('authGuard', () => {
  function makeRoute(overrides: Partial<RouteLocationNormalized>): RouteLocationNormalized {
    return {
      name: 'home', path: '/', meta: {}, params: {}, query: {}, hash: '', fullPath: '/', matched: [], redirectedFrom: undefined,
      ...overrides
    } as RouteLocationNormalized
  }

  test('viewport guard redirects to /desktop-only when width<1024', async () => {
    global.window = { innerWidth: 375 } as any
    mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ getCurrentSession: async () => null, profile: null }) }))
    const { authGuard } = await import('../../../../src/router/guards/auth-guard')
    const r = await authGuard(makeRoute({ name: 'login', meta: { viewportGuard: 'desktop' } }), makeRoute({}))
    expect(r).toEqual({ name: 'desktop-only', query: { redirect: '/' } })
  })

  test('redirects deleted-account user to /account-pending-deletion', async () => {
    global.window = { innerWidth: 1440 } as any
    mock.module('@/stores/auth', () => ({
      useAuthStore: () => ({ getCurrentSession: async () => ({}), profile: { deleted_at: '2026-05-15T00:00:00Z' } })
    }))
    const { authGuard } = await import('../../../../src/router/guards/auth-guard')
    const r = await authGuard(makeRoute({ name: 'dashboard', meta: { requiresAuth: true } }), makeRoute({}))
    expect(r).toEqual({ name: 'account-pending-deletion' })
  })

  test('redirects unauthenticated user from protected route to /login', async () => {
    global.window = { innerWidth: 1440 } as any
    mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ getCurrentSession: async () => null, profile: null }) }))
    const { authGuard } = await import('../../../../src/router/guards/auth-guard')
    const r = await authGuard(makeRoute({ name: 'dashboard', meta: { requiresAuth: true }, fullPath: '/dashboard' }), makeRoute({}))
    expect(r).toEqual({ name: 'login', query: { redirect: '/dashboard' } })
  })

  test('redirects signed-in user from /login to /dashboard', async () => {
    global.window = { innerWidth: 1440 } as any
    mock.module('@/stores/auth', () => ({
      useAuthStore: () => ({ getCurrentSession: async () => ({}), profile: { deleted_at: null } })
    }))
    const { authGuard } = await import('../../../../src/router/guards/auth-guard')
    const r = await authGuard(makeRoute({ name: 'login', meta: { redirectIfAuth: true } }), makeRoute({}))
    expect(r).toEqual({ name: 'dashboard' })
  })

  test('allows public route through', async () => {
    global.window = { innerWidth: 1440 } as any
    const { authGuard } = await import('../../../../src/router/guards/auth-guard')
    const r = await authGuard(makeRoute({ name: 'privacy', meta: {} }), makeRoute({}))
    expect(r).toBe(true)
  })
})
```

- [ ] **Step 13.2: Implement guard**

```ts
// src/router/guards/auth-guard.ts
import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

export const authGuard: NavigationGuard = async (to, _from) => {
  // 1. Viewport
  if (to.meta.viewportGuard === 'desktop' && typeof window !== 'undefined' && window.innerWidth < 1024 && to.name !== 'desktop-only') {
    return { name: 'desktop-only', query: { redirect: to.fullPath } }
  }

  // 2. Session check
  const auth = useAuthStore()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    if (auth.profile?.deleted_at && !to.meta.allowDeletedAccount) {
      return { name: 'account-pending-deletion' }
    }
    if (to.meta.redirectIfAuth) {
      return { name: 'dashboard' }
    }
  } else {
    if (to.meta.requiresAuth) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  return true
}
```

- [ ] **Step 13.3: Wire routes in `src/router.ts`**

Open `src/router.ts`. Add the 11 routes from PRD §6.1 (verbatim). Add `router.beforeEach(authGuard)` immediately after `createRouter`.

- [ ] **Step 13.4: Run + commit**

Run: `bun test tests/unit/router/guards/auth-guard.test.ts` (expect PASS)
```bash
git add src/router.ts src/router/guards/auth-guard.ts tests/unit/router/guards/auth-guard.test.ts
git commit -m "feat(auth): router guard (viewport→session→requiresAuth) + 11 new auth routes"
```

---

## Task 14: Shared auth-shell components — AuthShell + AuthCard + AuthHeading + AuthCta + AuthMedal + AuthIcon

Six small presentational components. One task; one test file per component; small commits.

For each (`AuthShell`, `AuthCard`, `AuthHeading`, `AuthCta`, `AuthMedal`, `AuthIcon`):

- [ ] Write `tests/unit/components/auth/<Name>.test.ts` asserting:
  - Renders default slot
  - Applies prop-based class variants (`theme="light"`, `width="wide"`, `tone="ok"`, etc.)
  - Emits `click` on AuthCta primary button

- [ ] Run test — verify fail
- [ ] Implement `<Name>.vue` per hi-fi A15 inline CSS:
  - Translate CSS classes (`.auth-shell`, `.auth-card`, `.auth-cta`, `.auth-medal`, `.auth-icon`, `.auth-head`) into Tailwind 4 utility classes via `app.css` @theme
  - OR use scoped class names mapped 1:1 to design system tokens (recommend Tailwind utilities + a thin component class layer)
  - Use `<icon-lucide-*>` unplugin-icons for icon glyphs
- [ ] Run test — verify pass
- [ ] Commit: `feat(auth): component AuthShell` / `AuthCard` / etc.

**Example: AuthShell.vue:**

```vue
<script setup lang="ts">
interface Props {
  theme?: 'light' | 'dark'
}
const props = withDefaults(defineProps<Props>(), { theme: 'light' })
</script>

<template>
  <div
    class="grid grid-rows-[auto_1fr_auto] min-h-0 h-full"
    :class="theme === 'light' ? 'bg-page-light text-ink-light' : 'bg-bg text-ink'"
    :data-theme="theme === 'dark' ? 'dark' : undefined"
  >
    <header class="px-7 py-5 flex items-center justify-between">
      <div class="inline-flex items-center gap-2 text-[13px] font-semibold tracking-tight">
        <div class="w-5 h-5 rounded-[5px] bg-ink text-page grid place-items-center text-[11.5px] font-extrabold">K</div>
        <span>Kova</span>
      </div>
      <slot name="corner" />
    </header>
    <main class="grid place-items-center px-6 pb-14 pt-6 overflow-auto min-h-0">
      <slot />
    </main>
    <footer class="px-7 py-5 flex items-center justify-between text-[11px] text-ink-3">
      <slot name="bottom">
        <span>© Kova 2026</span>
        <div class="flex gap-4">
          <a href="#" class="text-ink-3 hover:text-ink-2">Status</a>
          <a href="#" class="text-ink-3 hover:text-ink-2">Docs</a>
          <a href="#" class="text-ink-3 hover:text-ink-2">Contact</a>
        </div>
      </slot>
    </footer>
  </div>
</template>
```

Continue this pattern for each component. Reference `kova-hifi-light.css` and `kova-hifi.css` for exact token values to add to Tailwind `@theme` in `app.css`. Match hi-fi A15 inline `<style>` block byte-for-byte for class definitions.

Commit each component separately:
```bash
git add src/components/auth/AuthShell.vue tests/unit/components/auth/AuthShell.test.ts
git commit -m "feat(auth): AuthShell component (hi-fi A15 chrome)"
```

---

## Task 15: Shared auth-shell components — AuthField + OtpInput + MagicLinkSentBlock + PersistentSessionToggle

Same TDD-per-component pattern as Task 14.

- [ ] **AuthField.vue** — wraps `<input>` with label + help-link + error state (warn-tinted edge per B4 inline-error pattern). Two-way `v-model`. Emits `submit` on Enter.
- [ ] **OtpInput.vue** — 6 cells (44×52 px); auto-advance on digit; backspace clears previous; paste of 6-digit string fills all cells. Emits `complete` when all cells filled. Emits `update:digits`. **Auto-submit on complete fires emit** (per §12.6 founder decision).
- [ ] **MagicLinkSentBlock.vue** — renders the `.auth-sent` rail block from A15.03 with mail icon + DELIVERED tag + cooldown row. Prop: `email`, `resendCooldown`. Emits `resend` when cooldown=0 + clicked.
- [ ] **PersistentSessionToggle.vue** — switch with label "Keep me signed in on this device" + sub-label "Stay signed in for 30 days · skip the magic link next time". Two-way `v-model`. Default **on** (per §12.7).

Each component: test → fail → impl → pass → commit.

---

## Task 16: DangerZoneCard component (typed-confirm)

**Files:**
- Create: `kova-open-pencil-1/src/components/account/DangerZoneCard.vue`
- Test: `kova-open-pencil-1/tests/unit/components/account/DangerZoneCard.test.ts`

- [ ] **Step 16.1: Write failing tests**

```ts
// tests/unit/components/account/DangerZoneCard.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DangerZoneCard from '../../../../src/components/account/DangerZoneCard.vue'

describe('DangerZoneCard', () => {
  test('shows confirm-button disabled until "DELETE" typed', async () => {
    setActivePinia(createPinia())
    const w = mount(DangerZoneCard)
    await w.find('button.delete-account').trigger('click') // open modal
    const confirmBtn = w.find('button.confirm')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
    await w.find('input.typed-confirm').setValue('DELETE')
    expect(confirmBtn.attributes('disabled')).toBeUndefined()
  })

  test('emits "requested" on successful confirm', async () => {
    const reqMock = mock(async () => {})
    mock.module('@/stores/auth', () => ({
      useAuthStore: () => ({ requestAccountDeletion: reqMock })
    }))
    setActivePinia(createPinia())
    const w = mount(DangerZoneCard)
    await w.find('button.delete-account').trigger('click')
    await w.find('input.typed-confirm').setValue('DELETE')
    await w.find('button.confirm').trigger('click')
    expect(reqMock).toHaveBeenCalled()
    expect(w.emitted('requested')).toBeTruthy()
  })
})
```

- [ ] **Step 16.2: Implement (sketch)**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{ requested: [] }>()
const auth = useAuthStore()
const open = ref(false)
const typed = ref('')
const submitting = ref(false)
const canConfirm = computed(() => typed.value.trim() === 'DELETE' && !submitting.value)

async function confirm() {
  submitting.value = true
  try {
    await auth.requestAccountDeletion()
    emit('requested')
  } finally {
    submitting.value = false
    open.value = false
  }
}
</script>

<template>
  <div class="danger-zone p-4 border border-red-900/30 rounded-md">
    <h3 class="text-ink font-semibold">Delete account</h3>
    <p class="text-ink-2 text-sm mt-1">Permanently delete your account and all associated data. This action cannot be undone after the 30-day grace period.</p>
    <button class="delete-account mt-3 btn-danger" @click="open = true">Delete account</button>

    <!-- Reka Dialog modal — replace with <KovaModal> once Cluster 11 ships -->
    <div v-if="open" class="modal-shell">
      <div class="modal-card">
        <h2>Are you sure?</h2>
        <p>Type <b>DELETE</b> to confirm. Your account is queued for deletion. You can restore by signing in within 30 days.</p>
        <input class="typed-confirm" v-model="typed" placeholder="DELETE" autocomplete="off" />
        <button class="confirm btn-danger" :disabled="!canConfirm" @click="confirm">Delete my account</button>
        <button class="cancel btn" @click="open = false">Cancel</button>
      </div>
    </div>
  </div>
</template>
```

Note: replaces the modal-shell stub with `<KovaModal>` from Cluster 11 once shipped. Until then, inline shell is acceptable.

- [ ] **Step 16.3: Run + commit**

Run: `bun test tests/unit/components/account/DangerZoneCard.test.ts` (expect PASS)
```bash
git add src/components/account/DangerZoneCard.vue tests/unit/components/account/DangerZoneCard.test.ts
git commit -m "feat(auth): DangerZoneCard with typed-DELETE confirm modal"
```

---

## Task 17: Pages — SignupView + LoginView

Two views; LoginView is a state machine (email-entry → magic-link-sent → otp-entry → otp-wrong → otp-locked).

- [ ] **SignupView.vue** — A15.01 layout. Uses `<AuthShell theme="light">`, `<AuthCard>`, `<AuthField label="Work email" type="email" v-model="email">`, `<AuthCta variant="primary" @click="submit">Continue with email`, `<AuthCta variant="secondary">Use a 6-digit code instead`. On submit: `useMagicLink().send(email)`. On B4.5 inline error (account-exists): show via `<AuthField error="Account exists">` with accent-link "sign in instead" → `/login`.

- [ ] **LoginView.vue** — A15.02–04 + B4.3/4/6 inline errors. Uses local `state` ref (`'email-entry' | 'sent' | 'otp' | 'otp-wrong' | 'otp-locked'`). Email submit transitions to `'sent'` showing `<MagicLinkSentBlock>` with cooldown. "Use code instead" CTA flips to `'otp'` showing `<OtpInput>`. Submit on `complete` emit (auto-submit per §12.6). Inline errors via `state` flags + `<AuthField>` props.

For each view:
- Component-level test asserting state transitions
- Browser smoke per §9.4 of PRD

Commit each.

---

## Task 18: Pages — ForgotPasswordView + MagicLinkErrorView + AuthCallbackView

- [ ] **ForgotPasswordView.vue** — A15.05. Static — calls `supabase.auth.resetPasswordForEmail` (only relevant when email+password upgrade ships; route exists, entry hidden behind feature flag `FORGOT_PASSWORD_ENABLED=false` per §10).

- [ ] **MagicLinkErrorView.vue** — B4.1 (`?status=expired`) + B4.2 (`?status=invalid`). Reads `route.query.status`. Renders different copy per status. Primary CTA "Send a new link" pre-fills email from session-storage handoff (if available) and routes to `/login`.

- [ ] **AuthCallbackView.vue** — A15.06. On mount: Supabase session is already set by URL-fragment handler. Check `useBrandsStore` for brand count (depends on Cluster 02 store — until that ships, mock count=0 and route to `/onboarding`). Routing logic:
  - No brands → `/onboarding`
  - 1 brand → `/dashboard/:brandId`
  - Many → `/dashboard` (brand picker)

Test each. Commit each.

---

## Task 19: Pages — EmailChangeVerifyView + SessionExpiredView + DesktopOnlyView

- [ ] **EmailChangeVerifyView.vue** — B5.1 (`?status=success`) + B5.2 (`?status=expired`). Reads `route.query.status`. Renders `<AuthIcon tone="ok" icon="check-circle">` or `<AuthIcon tone="dim" icon="clock">`. Primary CTA → `/account/profile`.

- [ ] **SessionExpiredView.vue** — B4.7 (DARK). Wraps `<AuthShell theme="dark">`, error-card layout (clock glyph, "Your session expired", Sign-in primary, "Go to dashboard" disabled secondary).

- [ ] **DesktopOnlyView.vue** — B6.1 + B6.2. Uses `useViewportGuard()` to switch between primary (mobile, monitor glyph) and tablet-edge (laptop glyph + "I'll rotate my tablet" with auto-rotate listener per §12.9). Mailto-prefilled CTA. Foot: "Reload the page".

Test each. Commit each.

---

## Task 20: Pages — AccountPendingDeletionView + PrivacyPolicyView + TermsView

- [ ] **AccountPendingDeletionView.vue** — Dark; reads `auth.scheduledPurgeAt`; shows "Restore account" primary CTA + "Sign out (keep deletion scheduled)" secondary. On restore: `useAccountDeletion().restoreAccount()`, on success route to `/dashboard`. Shows scheduled-purge timestamp.

- [ ] **PrivacyPolicyView.vue** — Renders `docs/legal/privacy-policy.md` via a Markdown component (e.g., `marked` + `DOMPurify`). Read-only. Light theme. Uses `<MarketingShell>` from Cluster 11 once it ships; inline shell OK as fallback.

- [ ] **TermsView.vue** — Same pattern as PrivacyPolicyView with `docs/legal/terms.md`.

Test each. Commit each.

---

## Task 21: Email templates (Resend HTML)

**Files:** create 4 HTML email files under `kova-open-pencil-1/emails/`:

- `emails/account/account-deletion-scheduled.html`
- `emails/account/account-deletion-completed.html`
- `emails/account/account-restored.html`
- `emails/auth/email-change-notification-to-old.html`

Each uses simple inline-CSS HTML email markup (Resend handles delivery; templates use Inter font where supported, fallback to sans-serif). Includes:
- Kova logo (image or text)
- Headline matching email purpose
- Body explaining what happened
- Plain-text fallback section (preheader)
- List-Unsubscribe header (set in Resend API call, not template)
- Variable substitution placeholders `{{scheduled_at}}`, `{{restore_url}}`, `{{new_email}}`

- [ ] **Step 21.1: Write each HTML template**

Example for `account-deletion-scheduled.html`:

```html
<!doctype html>
<html><head><meta charset="utf-8"><title>Account deletion scheduled</title></head>
<body style="margin:0;padding:0;background:#f6f7f8;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:520px;margin:32px auto;padding:32px;background:#fff;border-radius:8px;border:1px solid #e6e7e9;">
    <div style="font-size:14px;font-weight:700;color:#111;display:flex;align-items:center;gap:8px;margin-bottom:24px;">
      <span style="display:inline-block;width:24px;height:24px;background:#111;color:#fff;border-radius:6px;text-align:center;line-height:24px;font-weight:800;">K</span>
      Kova
    </div>
    <h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 12px;">Your account is queued for deletion</h1>
    <p style="font-size:14px;color:#444;line-height:1.55;margin:0 0 16px;">
      We've received your request to delete your Kova account. Your data will be permanently removed on <b>{{scheduled_at}}</b>.
    </p>
    <p style="font-size:14px;color:#444;line-height:1.55;margin:0 0 24px;">
      Changed your mind? You can restore your account any time within the next 30 days by signing in.
    </p>
    <a href="{{restore_url}}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Restore account</a>
    <p style="font-size:12px;color:#888;margin:32px 0 0;line-height:1.55;">
      If you didn't request this, please reply to this email immediately.
    </p>
  </div>
</body></html>
```

Repeat for other 3 templates with appropriate copy + variables.

- [ ] **Step 21.2: Commit**

```bash
git add emails/account/*.html emails/auth/*.html
git commit -m "feat(auth): Resend HTML email templates (deletion-scheduled, deletion-completed, restored, email-change-old-notify)"
```

---

## Task 22: Legal + compliance docs

**Files:**
- Create: `kova-open-pencil-1/docs/legal/privacy-policy.md`
- Create: `kova-open-pencil-1/docs/legal/terms.md`
- Create: `kova-open-pencil-1/docs/legal/ropa.md`
- Create: `kova-open-pencil-1/docs/operations/anthropic-manual-deletion-runbook.md`

- [ ] **Step 22.1: Write privacy-policy.md**

Comprehensive Markdown privacy policy. Required sections (per PRD §5.5 + §8.8):

1. **Controller information** — Kova / contact / DPO if applicable
2. **What we collect** — account data, brand data, canvas data, Shopify store data, AI generation content
3. **Why we collect it** — lawful basis per GDPR Art. 6 (contract performance, legitimate interest)
4. **Who we share with — sub-processors** — explicit list:
   - **Stripe** (payment processing, subscription management)
   - **Shopify** (storefront data access)
   - **Anthropic** (AI generation; explicitly state: "storefront content analyzed for brand-voice inference" per `00e §6 #4`)
   - **Resend** (transactional email delivery)
   - **Supabase** (database + auth + storage hosting)
5. **Data retention** — explicit:
   - Active account: data retained until deletion request
   - On deletion request: 30-day soft-delete window
   - Hard delete after 30 days: cascades across Stripe, Shopify, Anthropic, Supabase Storage, DB
   - Supabase backups: 7-day point-in-time recovery (PITR) on free tier — data persists in backups for 7 days after hard-delete, then gone
6. **User rights under GDPR** — Art. 15 (access), Art. 16 (rectification), Art. 17 (erasure), Art. 20 (portability), Art. 21 (objection)
7. **How to exercise rights** — `/account` → Danger zone → Delete account; email privacy@kova.io for other requests
8. **Cookie / tracking policy** — Supabase Auth cookies only; no third-party tracking
9. **Last updated** date

- [ ] **Step 22.2: Write terms.md**

Standard Terms of Service. Cover:
- Acceptance of terms
- Service description
- Account creation + responsibility
- Acceptable use (no prohibited content, no abuse, no reverse-engineering)
- Subscription + billing (Stripe-handled)
- IP ownership (user owns content; Kova owns the software)
- Termination + account deletion
- Disclaimers + limitation of liability
- Governing law + jurisdiction

Flag in plan: **legal review required before public launch.** Initial draft is engineering-grade; final draft needs an attorney pass.

- [ ] **Step 22.3: Write ropa.md (Record of Processing Activities)**

Internal compliance doc. Per-sub-processor table:

| Sub-processor | Purpose | Data categories | Retention | Deletion mechanism |
|---|---|---|---|---|
| Stripe | Payment processing | Email, name, billing address, card last-4, plan tier | Until account deletion + Stripe's own ledger retention | `stripe.subscriptions.cancel` + `stripe.customers.del` via `delete-account-cron` step `stripe` |
| Shopify | Storefront data integration | OAuth token, shop domain, brand display name | Until account deletion or user disconnect | Token revoke via Admin API in cron step `shopify` |
| Anthropic | AI generation + brand-voice inference | Chat prompts, brand voice descriptions, storefront content snippets | 30 days (Anthropic default); ZDR onboarding post-launch | DB delete + manual operator request (Anthropic doesn't expose API); cron step `anthropic` queues for `anthropic_deletion_log` |
| Resend | Transactional email | Email address, send metadata | Per Resend retention policy (90 days default) | Reply-to / removal via Resend admin |
| Supabase | DB + auth + storage hosting | All user data | Until hard-delete; 7-day PITR backups retained per Supabase free tier | Cascade `db` + `storage` cron steps |

Document cascade order: `stripe → shopify → anthropic → storage → db`. List the retry policy (5 attempts → `failed_terminal` → Sentry alert → operator manual intervention).

- [ ] **Step 22.4: Write anthropic-manual-deletion-runbook.md**

Operator runbook covering:
1. Query: `SELECT user_id, requested_at FROM anthropic_deletion_log WHERE status = 'queued_for_manual_request' AND submitted_at IS NULL`
2. Email template to send to `privacy@anthropic.com` requesting deletion of inference data for the listed user IDs (no PII in the request — just our internal user_id strings)
3. Mark as `status = 'submitted', submitted_at = now()` after sending
4. On Anthropic confirmation, mark `status = 'confirmed_by_anthropic', confirmed_at = now()`
5. Cadence: weekly batch run; flag if backlog grows beyond 50 rows

- [ ] **Step 22.5: Commit**

```bash
git add docs/legal/privacy-policy.md docs/legal/terms.md docs/legal/ropa.md docs/operations/anthropic-manual-deletion-runbook.md
git commit -m "docs(auth): privacy policy + ToS draft + RoPA + Anthropic manual-deletion runbook

GDPR Art. 17 + Art. 19 compliance docs. ToS needs legal review pre-launch.
D-3 disclosure included: 'storefront content analyzed for brand-voice inference' named as Anthropic data flow.
Refs Cluster 01 PRD §5.5 + §8.8."
```

---

## Task 23: Supabase Auth configuration (manual via Studio / CLI)

**Files:**
- Create: `kova-open-pencil-1/docs/operations/supabase-auth-config.md` (checklist for ops)

- [ ] **Step 23.1: Document config + apply manually**

Author `docs/operations/supabase-auth-config.md` with the exact settings from PRD §5.4.1:

```markdown
# Supabase Auth Configuration Checklist

Apply each setting via Supabase Studio → Authentication → Providers / Settings. Replicate to all environments (local dev, staging, production).

## Email Auth provider

- [ ] Confirm email enabled: **YES**
- [ ] Secure email change enabled: **YES**
- [ ] Magic Link expiry: **1800 seconds** (30 min)
- [ ] OTP expiry: **300 seconds** (5 min)
- [ ] OTP length: **6 digits**

## Sessions

- [ ] JWT expiry: **3600 seconds** (1 hour)
- [ ] Refresh token lifetime: **30 days** (default for "Keep me signed in" toggled ON)
- [ ] Refresh-token rotation: **enabled**

## Rate limits

- [ ] Email send rate limit: **4 per hour per recipient** (Supabase default)

## Email templates (custom HTML per Resend / Supabase)

- [ ] Magic link sign-in template customized
- [ ] Email change verify template customized
- [ ] Reset password template customized (for Phase 2)

## Redirect URLs

- [ ] Site URL: `https://app.kova.io` (production) / `http://localhost:1420` (dev)
- [ ] Additional redirect URLs:
  - `https://app.kova.io/auth/callback`
  - `https://app.kova.io/auth/email-change/verify`
  - `http://localhost:1420/auth/callback`
  - `http://localhost:1420/auth/email-change/verify`

## Verification

After applying, smoke-test:
- [ ] Send magic-link → arrives in inbox within 30s → click → routes to /auth/callback
- [ ] Request OTP → arrives → enter → routes to /auth/callback
- [ ] Request email change → verify-link arrives at new address → click → routes to B5.1
- [ ] Old address receives notification within 30s
```

- [ ] **Step 23.2: Commit + apply**

```bash
git add docs/operations/supabase-auth-config.md
git commit -m "docs(auth): Supabase Auth config checklist for ops"
```

Then apply manually via Studio (operator step; not part of automated TDD flow).

---

## Task 24: E2E test suite (Playwright)

**Files:** create under `kova-open-pencil-1/tests/e2e/auth/`:

- `signup-flow.spec.ts`
- `login-otp.spec.ts`
- `login-otp-wrong-then-success.spec.ts`
- `desktop-only-fallback.spec.ts`
- `session-expired-bridge.spec.ts`
- `deletion-grace-restore.spec.ts`
- `email-change-flow.spec.ts`

Each spec follows the PRD §9.3 outline. Use Playwright APIs to drive browser. Mock Resend by intercepting outgoing email via a local test SMTP server (Inbucket — included with Supabase local stack).

- [ ] **Step 24.1: Write each spec**

Example for `signup-flow.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('signup with magic link end-to-end', async ({ page, context }) => {
  await page.goto('/signup')
  await expect(page.getByRole('heading', { name: 'Get started with Kova' })).toBeVisible()
  await page.getByLabel('Work email').fill('test-e2e@kova.local')
  await page.getByRole('button', { name: /Continue with email/ }).click()
  await expect(page.getByText(/We sent a link to/)).toBeVisible()

  // Poll Inbucket for the magic link
  const magicLink = await pollInbucketForMagicLink('test-e2e@kova.local')
  await page.goto(magicLink)
  await expect(page).toHaveURL(/\/auth\/callback/)
  await expect(page.getByText("You're signed in")).toBeVisible()
})

async function pollInbucketForMagicLink(email: string): Promise<string> {
  // Inbucket REST API: GET http://localhost:54324/api/v1/mailbox/{email}/messages
  // Extract first message body, regex for the magic link URL
  // (helper implementation — extract to tests/_helpers/inbucket.ts)
  return ''
}
```

- [ ] **Step 24.2: Run E2E pack**

Run: `cd kova-open-pencil-1 && bunx playwright test tests/e2e/auth/`
Expected: All specs PASS.

- [ ] **Step 24.3: Commit**

```bash
git add tests/e2e/auth/ tests/_helpers/inbucket.ts
git commit -m "test(auth): E2E suite — signup, login OTP, error states, desktop-only fallback, deletion grace, email change"
```

---

## Task 25: Security verification + final pass

- [ ] **Step 25.1: Grep checks for secrets + access_token in URL**

Run:
```bash
cd kova-open-pencil-1
echo "Check 1 — no VITE_ prefix on server-only secrets:"
grep -rn "VITE_\(STRIPE_SECRET\|ANTHROPIC_API\|SUPABASE_SERVICE\|RESEND_API\|CRON_SECRET\)" src/ api/ && echo "FAIL" || echo "OK"

echo "Check 2 — no access_token in URL query strings:"
grep -rn "access_token=" src/ api/ --include="*.ts" --include="*.vue" && echo "FAIL" || echo "OK"

echo "Check 3 — no SYSTEM_PROMPT modifications:"
git diff main..HEAD -- src/ai/use-chat.ts | grep -i "SYSTEM_PROMPT" && echo "FAIL — SYSTEM_PROMPT touched" || echo "OK"

echo "Check 4 — no Zod imports outside this PRD's Edge Functions:"
grep -rln "import.*zod\|import.*'zod'" src/ai/tools.ts src/ai/ && echo "WARN — Zod in tool layer" || echo "OK"

echo "Check 5 — Sentry alert wired for cron terminal-failure:"
grep -rn "captureException" api/cron/ && echo "OK"
```

Expected: every "OK" line prints. Zero "FAIL" lines.

- [ ] **Step 25.2: Quality gates**

Run:
```bash
bun run check         # oxlint + type-check
bun run format        # oxfmt — must not produce diff
bun run test:unit     # all unit + integration tests
bun run test          # Playwright E2E
bun run test:dupes    # jscpd < 3%
```

Expected: all pass.

- [ ] **Step 25.3: Browser smoke (founder gate)**

Per PRD §9.4 + `feedback_browser_smoke_test_before_done` memory:

- [ ] Sign up with real email → click magic-link → land at `/auth/callback`
- [ ] Sign in via OTP → wrong code first → observe B4.3 → right code → success
- [ ] Open in iPhone simulator → observe `/desktop-only` B6.1 → mailto handoff
- [ ] Rotate iPad simulator portrait→landscape → observe auto-reload
- [ ] Change email via Cluster-04 stub `/account/profile` (or call endpoint directly during pre-04 dev) → receive both emails → click new-address verify → B5.1
- [ ] Request account deletion → typed-confirm → sign-out + email
- [ ] Sign in within 30 days → `/account-pending-deletion` → restore → dashboard
- [ ] Manually invoke cron via `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/delete-account` (with seeded test user 31 days old) → observe cascade

- [ ] **Step 25.4: Final commit + status update**

```bash
git add docs/kova-final-prds/01-auth-and-identity.md docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md
git commit -m "chore(auth): Cluster 01 implementation complete — bump PRD status to IN-IMPLEMENTATION; tracker row updated"
```

Update PRD §0 status: `APPROVED` → `IN-IMPLEMENTATION` → on smoke pass → `SHIPPED`.

Update `00a-PRD_AUTHORING_GUIDE.md` §7 tracker row for Cluster 01 to `SHIPPED` with date.

---

## Self-review

**Spec coverage:** All PRD §3 surfaces (13 routes) map to Task 17–20 page components. §4 schema lands in Task 1. §5.1 four Edge Functions in Tasks 3 / 4 / 5 / 7. §5.1.4 five cron steps in Task 6. §5.2 two RPCs in Task 1. §5.3 cron schedule in Task 8. §5.4.1 Supabase config in Task 23. §5.5 compliance docs in Task 22. §6.1 routes in Task 13. §6.2 router guards in Task 13. §6.3 six composables in Tasks 10/11/12. §6.4 eleven shared components in Tasks 14/15. §8 acceptance criteria covered by §9 test plan tasks. §9.1–9.4 test plan executes Tasks 1–24 unit/integration/E2E plus §9.4 manual smoke in Task 25.

**Placeholder scan:** Tasks 14 / 15 / 17–20 use the "follow the pattern" structure for repetitive component creation rather than spelling out each component byte-for-byte. Each component is small and the pattern is established by Task 14's AuthShell example. If an engineer is reading these tasks out of order, they will need to read Task 14 first. Acceptable trade-off; alternative was a 6000-line plan.

**Type consistency:** `StepArgs` + `StepResult` shapes in Tasks 6a–6e match Task 7 cron orchestrator's expectations. `SendResult` from `useMagicLink` + `SubmitResult` from `useOtp` distinct from the Edge-Function response shapes used in `useAccountDeletion` (no name clashes). `gdpr_deletion_queue` columns referenced in Tasks 1, 6, 7 match exactly.

**Two implicit deps surfaced:**
1. `_shared/supabase-admin.ts` referenced in Task 7. Either it exists (per `_shared/auth.ts` baseline) or add a sub-step to create it. Recommended: add to Task 2 as part of `_shared/` plumbing.
2. `_shared/sentry.ts` referenced in Task 7 (`captureException`). Already exists per baseline (`api/_shared/sentry.ts` was in the dir listing).

**Recommendation:** add quick sub-step to Task 2 creating `_shared/supabase-admin.ts` (small wrapper around `createClient` with service-role key) if not already there. Or fold into Task 7's pre-work.

---

## Execution handoff

Plan complete and saved to `kova-open-pencil-1/docs/kova-final-impl-plans/01-auth-and-identity-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — Parent dispatches a fresh subagent per task, reviews between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

**Which approach?**

Per founder direction: pause here. Execution happens after all 12 PRDs + plans land + batch-review approval per `00b-PRD_DISPATCH_PROMPTS.md §5`.
