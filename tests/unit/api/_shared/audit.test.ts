// Unit test for api/_shared/audit.ts (Plan 11 Task 1.3a / W0-1).
// Uses a handcrafted mock supabase client. Sentry side-effect is intentionally
// NOT asserted here — the contract is "swallow + don't throw"; observability
// is left to integration tests + Sentry once wired (founder lock #19).

import { describe, it, expect, beforeEach } from 'bun:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeAudit } from '../../../../api/_shared/audit'

interface MockState {
  inserted: Array<Record<string, unknown>>
  forcedError: { code: string; message: string } | null
}

function createMock(): { client: SupabaseClient; state: MockState } {
  const state: MockState = { inserted: [], forcedError: null }
  const client = {
    from(table: string) {
      return {
        async insert(row: Record<string, unknown>) {
          if (state.forcedError) return { error: state.forcedError, data: null }
          state.inserted.push({ table, ...row })
          return { error: null, data: null }
        },
      }
    },
  }
  return { client: client as unknown as SupabaseClient, state }
}

describe('writeAudit (W0-1 / founder lock #11)', () => {
  let mockSb: ReturnType<typeof createMock>

  beforeEach(() => {
    mockSb = createMock()
  })

  it('inserts one audit_log row with all fields', async () => {
    await writeAudit(mockSb.client, {
      userId: '00000000-0000-0000-0000-000000000001',
      eventType: 'account.deletion_requested',
      payload: { reason: 'user' },
      clusterOwner: '01',
    })
    expect(mockSb.state.inserted).toHaveLength(1)
    expect(mockSb.state.inserted[0]).toMatchObject({
      table: 'audit_log',
      user_id: '00000000-0000-0000-0000-000000000001',
      event_type: 'account.deletion_requested',
      payload: { reason: 'user' },
      cluster_owner: '01',
    })
  })

  it('null userId allowed (system events)', async () => {
    await writeAudit(mockSb.client, {
      userId: null,
      eventType: 'cron.idempotency_cleanup',
      payload: {},
      clusterOwner: '11',
    })
    expect(mockSb.state.inserted[0]?.['user_id']).toBeNull()
  })

  it('swallows 42P01 (table missing) without throwing', async () => {
    mockSb.state.forcedError = {
      code: '42P01',
      message: 'relation "audit_log" does not exist',
    }
    await expect(
      writeAudit(mockSb.client, {
        userId: 'u',
        eventType: 'x',
        payload: {},
        clusterOwner: '01',
      }),
    ).resolves.toBeUndefined()
    // No row written when DB rejected
    expect(mockSb.state.inserted).toHaveLength(0)
  })

  it('swallows other DB errors without throwing', async () => {
    mockSb.state.forcedError = { code: '23505', message: 'duplicate' }
    await expect(
      writeAudit(mockSb.client, {
        userId: 'u',
        eventType: 'x',
        payload: {},
        clusterOwner: '01',
      }),
    ).resolves.toBeUndefined()
  })

  it('payload defaults to empty object when omitted', async () => {
    await writeAudit(mockSb.client, {
      userId: 'u',
      eventType: 'x',
      clusterOwner: '01',
    })
    expect(mockSb.state.inserted[0]?.['payload']).toEqual({})
  })
})
