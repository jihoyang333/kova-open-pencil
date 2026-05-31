/**
 * Cluster 05 Brand Kit — Supabase integration test helpers.
 *
 * Skip-guarded the same way as tests/integration/preferences-rpc.test.ts:
 * suites importing from here gate on SHOULD_RUN and become `describe.skip`
 * when local Supabase / Docker is absent, so the unit suite stays portable.
 *
 * The Cluster 05 plan's test bodies import `createServerClient`,
 * `createAuthenticatedClient`, and `seedBrandForUser` from a
 * `@/test-utils/supabase-test-client` module that does not exist. This file is
 * the real implementation those bodies are wired against — tests import it via
 * a relative path (`../../helpers/brand-kit-supabase`) since `@/` maps to
 * `./src/*`.
 *
 * Every exported factory assumes SHOULD_RUN is true (callers live inside
 * skip-guarded suites that never invoke these when SHOULD_RUN is false).
 */

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']

export { SHOULD_RUN }

/**
 * Loose Supabase client surface — mirrors preferences-rpc.test.ts's hand-typed
 * shape. We keep it permissive (`Record<string, unknown>` / `unknown`) rather
 * than `any` to satisfy the repo's no-`any` lint rule while staying ergonomic
 * for the plan's chained `.from(...).select(...).eq(...).single()` calls.
 */
export interface TestError {
  code?: string
  message?: string
}

type Row = Record<string, unknown>

export interface TestSupabaseClient {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: TestError | null }>
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        single: () => Promise<{ data: Row | null; error: TestError | null }>
      } & Promise<{ data: Row[] | null; error: TestError | null }>
    }
    insert: (
      row: Row | Row[],
    ) => {
      select: () => {
        single: () => Promise<{ data: Row | null; error: TestError | null }>
      }
    } & Promise<{ data: unknown; error: TestError | null }>
    update: (row: Row) => {
      eq: (col: string, val: unknown) => Promise<{ error: TestError | null }>
    }
    delete: () => {
      eq: (col: string, val: unknown) => Promise<{ error: TestError | null }>
      in: (col: string, vals: unknown[]) => Promise<{ error: TestError | null }>
    }
  }
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Blob,
        opts?: { upsert?: boolean },
      ) => Promise<{ data: unknown; error: TestError | null }>
    }
  }
  auth: {
    admin: {
      createUser: (args: {
        email: string
        password: string
        email_confirm: boolean
      }) => Promise<{ data: { user: { id: string } | null }; error: unknown }>
      deleteUser: (id: string) => Promise<{ data: unknown; error: unknown }>
    }
    signInWithPassword: (args: {
      email: string
      password: string
    }) => Promise<{ data: { user: { id: string } | null; session: unknown }; error: unknown }>
  }
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return 'kova-it-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomEmail(): string {
  return `brand-kit-${crypto.randomUUID()}@kova.test`
}

/** Service-role client (bypasses RLS) for admin setup + seeding. */
export async function createServerClient(): Promise<TestSupabaseClient> {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    { auth: { persistSession: false } },
  ) as unknown as TestSupabaseClient
}

/**
 * Creates a fresh confirmed auth user via service-role admin, then signs in
 * with the anon client. Returns the authenticated (anon) client plus the
 * created user's id.
 */
export async function createAuthenticatedClient(): Promise<
  TestSupabaseClient & { userId: string }
> {
  const { createClient } = await import('@supabase/supabase-js')
  const service = await createServerClient()

  const email = randomEmail()
  const password = randomPassword()
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`createUser failed: ${JSON.stringify(error)}`)
  }
  const userId = data.user.id

  const anon = createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_ANON_KEY'] ?? process.env['VITE_SUPABASE_ANON_KEY']!,
    { auth: { persistSession: false } },
  ) as unknown as TestSupabaseClient

  const signIn = await anon.auth.signInWithPassword({ email, password })
  if (signIn.error) {
    throw new Error(`signIn failed: ${JSON.stringify(signIn.error)}`)
  }

  const authed = anon as TestSupabaseClient & { userId: string }
  authed.userId = userId
  return authed
}

export interface SeededBrand {
  /** Authenticated anon client for the seeded user. */
  client: TestSupabaseClient
  /** Service-role client (RLS-bypassing) for out-of-band setup. */
  service: TestSupabaseClient
  userId: string
  brandId: string
}

/**
 * Creates a user (confirmed + signed in) and a `public.brands` row owned by
 * that user. The brand is seeded via the service-role client; only `user_id`
 * and `name` are required (other columns default). Returns the authenticated
 * client for that user plus the service client, userId, and brandId.
 */
export async function seedBrandForUser(): Promise<SeededBrand> {
  const service = await createServerClient()
  const client = await createAuthenticatedClient()
  const userId = client.userId

  const inserted = await service
    .from('brands')
    .insert({ user_id: userId, name: 'Brand Kit Test Brand' })
    .select()
    .single()
  if (inserted.error || !inserted.data) {
    throw new Error(`seed brand failed: ${JSON.stringify(inserted.error)}`)
  }
  const brandId = inserted.data['id'] as string

  return { client, service, userId, brandId }
}
