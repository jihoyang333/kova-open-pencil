// Test-only helper. Pins a local Supabase stack at 127.0.0.1:54321 and exposes
// the clients + utilities every cluster-NN integration test needs.
//
// Required env (load via .env.test.local — see bun config in tests/setup-env.ts):
//   SUPABASE_LOCAL_URL          (default http://127.0.0.1:54321)
//   SUPABASE_LOCAL_ANON_KEY     publishable key from `supabase start`
//   SUPABASE_LOCAL_SERVICE_KEY  secret key from `supabase start`
//   SUPABASE_LOCAL_DB_URL       (default postgresql://postgres:postgres@127.0.0.1:54322/postgres)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCAL_URL = process.env['SUPABASE_LOCAL_URL'] ?? 'http://127.0.0.1:54321'
const LOCAL_ANON = process.env['SUPABASE_LOCAL_ANON_KEY'] ?? ''
const LOCAL_SERVICE = process.env['SUPABASE_LOCAL_SERVICE_KEY'] ?? ''
const LOCAL_DB_URL =
  process.env['SUPABASE_LOCAL_DB_URL'] ??
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..')
const MIGRATIONS_DIR = resolve(REPO_ROOT, 'supabase', 'migrations')
const TEST_HELPERS_SQL = resolve(import.meta.dir, 'test-helpers.sql')

if (!LOCAL_ANON || !LOCAL_SERVICE) {
  throw new Error(
    'supabase-local: missing SUPABASE_LOCAL_ANON_KEY / SUPABASE_LOCAL_SERVICE_KEY. ' +
      'Copy values from `supabase start` output into kova-open-pencil-1/.env.test.local.',
  )
}

// Service-role client. Bypasses RLS. Use for setup + assertions about real rows.
export const supabaseAdmin: SupabaseClient = createClient(LOCAL_URL, LOCAL_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Anon client. Subject to RLS. Use with signInTestUser() to test authenticated paths.
export const supabaseAsAuthenticated: SupabaseClient = createClient(LOCAL_URL, LOCAL_ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface PsqlResult {
  stdout: string
  stderr: string
  ok: boolean
}

function runPsql(file: string): PsqlResult {
  const result = spawnSync(
    'psql',
    [LOCAL_DB_URL, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', file],
    { encoding: 'utf8' },
  )
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ok: result.status === 0,
  }
}

function runPsqlSql(sql: string): PsqlResult {
  const result = spawnSync(
    'psql',
    [LOCAL_DB_URL, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-c', sql],
    { encoding: 'utf8' },
  )
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ok: result.status === 0,
  }
}

// Migrations skipped on local supabase because they exercise features the
// local stack doesn't ship (e.g. vault.delete_secret introduced in a newer
// supabase-vault than v2.75 ships locally). These migrations DO apply against
// the cloud dev project; the harness simulates their downstream effects
// (e.g. shopify_connections table) only when an integration test needs them.
const LOCAL_SKIP_PATTERNS: ReadonlyArray<RegExp> = [
  /_m9_/, // M9 Shopify cluster — depends on supabase_vault.delete_secret (cloud only)
]

function shouldSkipMigration(filename: string): boolean {
  return LOCAL_SKIP_PATTERNS.some((p) => p.test(filename))
}

// Resets the local DB to a clean state and re-applies every migration + the
// test-helpers PG functions. Idempotent. Each test file calls this once via
// beforeAll() so test order can't poison shared state.
let lastMigrationToken: string | null = null
export async function applyMigrations(): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => !shouldSkipMigration(f))
    .sort()

  const token = files.join('|')
  if (lastMigrationToken === token) return // already applied in this bun process

  // Targeted reset via psql. The supabase CLI's `db reset` is unreliable when
  // run repeatedly from inside a bun test process (the restart often returns a
  // 502 from the kong upstream before postgres is back). Instead we drop only
  // the state our migrations create:
  //   - public schema (CASCADE)
  //   - storage.* custom policies (created by m2 dashboard / m4 media migrations)
  //   - storage buckets we own (kova-thumbnails, kova-media, etc.)
  //   - auth.users we created (matched by @kova-test.local domain)
  const reset = runPsqlSql(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT polname, polrelid::regclass::text AS tbl
        FROM pg_policy
        WHERE polrelid::regclass::text LIKE 'storage.%'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s', r.polname, r.tbl);
      END LOOP;
    END $$;

    DELETE FROM auth.users WHERE email LIKE '%@kova-test.local';
  `)
  if (!reset.ok) {
    throw new Error(`applyMigrations: targeted reset failed:\n${reset.stderr}`)
  }

  for (const file of files) {
    const path = resolve(MIGRATIONS_DIR, file)
    const result = runPsql(path)
    if (!result.ok) {
      throw new Error(`applyMigrations: ${file} failed:\n${result.stderr}`)
    }
  }

  const helpers = runPsql(TEST_HELPERS_SQL)
  if (!helpers.ok) {
    throw new Error(`applyMigrations: test-helpers.sql failed:\n${helpers.stderr}`)
  }

  // PostgREST caches the schema in-process. After DDL changes (and especially
  // new functions) the cache must be reloaded before .rpc() calls can resolve.
  // NOTIFY pgrst triggers the reload; we wait briefly for it to land.
  const notify = runPsqlSql(`NOTIFY pgrst, 'reload schema';`)
  if (!notify.ok) {
    throw new Error(`applyMigrations: NOTIFY pgrst failed:\n${notify.stderr}`)
  }
  await new Promise((res) => setTimeout(res, 500))

  lastMigrationToken = token
}

// Creates (or upserts) a confirmed auth user and returns their id. Then signs
// the anon client in as that user so subsequent RLS-aware calls run with the
// authenticated role.
export async function signInTestUser(email: string): Promise<string> {
  const password = 'test-password-' + email.length.toString().padStart(2, '0') + '-fixture'

  // Upsert: try admin createUser first, fall back to a sign-in if it already exists.
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  let userId: string
  if (created.data.user) {
    userId = created.data.user.id
  } else {
    // Look up by email
    const list = await supabaseAdmin.auth.admin.listUsers()
    const existing = list.data.users.find((u) => u.email === email)
    if (!existing) {
      throw new Error(`signInTestUser: could not create or find user ${email}: ${created.error?.message ?? 'unknown'}`)
    }
    userId = existing.id
  }

  const signIn = await supabaseAsAuthenticated.auth.signInWithPassword({ email, password })
  if (signIn.error) {
    throw new Error(`signInTestUser: signInWithPassword failed for ${email}: ${signIn.error.message}`)
  }

  return userId
}

// Convenience: sign out the anon client. Useful between tests if a single file
// exercises multiple identities.
export async function signOutTestUser(): Promise<void> {
  await supabaseAsAuthenticated.auth.signOut()
}
