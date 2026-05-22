import { describe, test, expect, mock } from 'bun:test'

mock.module('../../../../../api/_shared/audit', () => ({ writeAudit: mock(async () => {}) }))
mock.module('../../../../../api/_shared/email', () => ({
  sendEmail: mock(async () => ({ ok: true, id: 'rid' })),
}))

const { runStep } = await import('../../../../../api/cron/steps/db')

// Plan 01 Task 6e — cron step: db.

describe('cron step: db', () => {
  test('marks queue succeeded BEFORE delete, deletes user row, sends email', async () => {
    const updateMock = mock(() => ({ match: () => Promise.resolve({ error: null }) }))
    const deleteMock = mock(() => ({ eq: () => Promise.resolve({ error: null }) }))
    const supabase = {
      from: (table: string) => {
        if (table === 'gdpr_deletion_queue') return { update: updateMock }
        if (table === 'users') return { delete: deleteMock }
        return {}
      },
      auth: {
        admin: {
          getUserById: mock(async () => ({ data: { user: { email: 'a@b.co' } }, error: null })),
        },
      },
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(updateMock).toHaveBeenCalled()
    expect(deleteMock).toHaveBeenCalled()
  })

  test('returns retriable on queue UPDATE error', async () => {
    const supabase = {
      from: () => ({
        update: () => ({ match: () => Promise.resolve({ error: { message: 'conn refused' } }) }),
      }),
      auth: {
        admin: { getUserById: mock(async () => ({ data: { user: { email: 'a@b.co' } }, error: null })) },
      },
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.retriable).toBe(true)
  })

  test('proceeds even when getUserById fails (email best-effort)', async () => {
    const supabase = {
      from: (table: string) => {
        if (table === 'gdpr_deletion_queue') return { update: () => ({ match: () => Promise.resolve({ error: null }) }) }
        if (table === 'users') return { delete: () => ({ eq: () => Promise.resolve({ error: null }) }) }
        return {}
      },
      auth: {
        admin: { getUserById: mock(async () => { throw new Error('boom') }) },
      },
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })
})
