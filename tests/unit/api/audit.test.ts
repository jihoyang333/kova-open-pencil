import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { writeAudit } from '../../../api/_shared/audit'

interface InsertedRow {
  table: string
  user_id: string | null
  event_type: string
  payload: Record<string, unknown>
  cluster_owner: string
}

interface MockState {
  inserted: InsertedRow[]
  forcedError: { code: string; message: string } | null
}

function createMockSupabase(state: MockState) {
  return {
    from(table: string) {
      return {
        async insert(row: Record<string, unknown>) {
          if (state.forcedError) {
            return { error: state.forcedError, data: null }
          }
          state.inserted.push({
            table,
            user_id: row.user_id as string | null,
            event_type: row.event_type as string,
            payload: row.payload as Record<string, unknown>,
            cluster_owner: row.cluster_owner as string,
          })
          return { error: null, data: null }
        },
      }
    },
  }
}

describe('writeAudit (CT-001 / W0-1 / founder lock #11)', () => {
  let state: MockState
  let warnSpy: ReturnType<typeof mock>
  let originalWarn: typeof console.warn

  beforeEach(() => {
    state = { inserted: [], forcedError: null }
    warnSpy = mock(() => undefined)
    originalWarn = console.warn
    console.warn = warnSpy as unknown as typeof console.warn
  })

  test('inserts one audit_log row with all fields', async () => {
    const client = createMockSupabase(state)
    await writeAudit(client as never, {
      userId: '00000000-0000-0000-0000-000000000001',
      eventType: 'account.deletion_requested',
      payload: { reason: 'user' },
      clusterOwner: '01',
    })

    expect(state.inserted).toHaveLength(1)
    expect(state.inserted[0]).toMatchObject({
      table: 'audit_log',
      user_id: '00000000-0000-0000-0000-000000000001',
      event_type: 'account.deletion_requested',
      payload: { reason: 'user' },
      cluster_owner: '01',
    })
    console.warn = originalWarn
  })

  test('null userId allowed (system events)', async () => {
    const client = createMockSupabase(state)
    await writeAudit(client as never, {
      userId: null,
      eventType: 'cron.idempotency_cleanup',
      payload: {},
      clusterOwner: '11',
    })
    expect(state.inserted[0]?.user_id).toBeNull()
    console.warn = originalWarn
  })

  test('payload defaults to empty object when omitted', async () => {
    const client = createMockSupabase(state)
    await writeAudit(client as never, {
      userId: 'u',
      eventType: 'test.no_payload',
      clusterOwner: '11',
    })
    expect(state.inserted[0]?.payload).toEqual({})
    console.warn = originalWarn
  })

  test('swallows 42P01 (table missing) — warns + does not throw', async () => {
    state.forcedError = {
      code: '42P01',
      message: 'relation "audit_log" does not exist',
    }
    const client = createMockSupabase(state)
    await expect(
      writeAudit(client as never, {
        userId: 'u',
        eventType: 'x',
        payload: {},
        clusterOwner: '01',
      })
    ).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
    console.warn = originalWarn
  })

  test('swallows other DB errors — warns + does not throw', async () => {
    state.forcedError = { code: '23505', message: 'duplicate' }
    const client = createMockSupabase(state)
    await expect(
      writeAudit(client as never, {
        userId: 'u',
        eventType: 'x',
        payload: {},
        clusterOwner: '01',
      })
    ).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
    console.warn = originalWarn
  })
})
