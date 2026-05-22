import { describe, test, expect, mock } from 'bun:test'

import { runStep } from '../../../../../api/cron/steps/anthropic'

// Plan 01 Task 6c — cron step: anthropic.

describe('cron step: anthropic', () => {
  test('deletes chat conversations + messages, logs deletion request', async () => {
    const deleteConvCalls = mock(() => ({ eq: () => Promise.resolve({ error: null }) }))
    const deleteMsgCalls = mock(() => ({ in: () => Promise.resolve({ error: null }) }))
    const insertCalls = mock(async () => ({ error: null }))
    const supabase = {
      from: (table: string) => {
        if (table === 'chat_conversations') {
          return {
            select: () => ({ eq: () => Promise.resolve({ data: [{ id: 'c1' }, { id: 'c2' }], error: null }) }),
            delete: deleteConvCalls,
          }
        }
        if (table === 'chat_messages') return { delete: deleteMsgCalls }
        if (table === 'anthropic_deletion_log') return { insert: insertCalls }
        throw new Error(`unexpected: ${table}`)
      },
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(insertCalls).toHaveBeenCalled()
  })

  test('soft-fail when chat_conversations table does not exist (42P01)', async () => {
    const insertCalls = mock(async () => ({ error: null }))
    const supabase = {
      from: (table: string) => {
        if (table === 'chat_conversations') {
          return { select: () => ({ eq: () => Promise.resolve({ data: null, error: { code: '42P01', message: 'undefined_table' } }) }) }
        }
        if (table === 'anthropic_deletion_log') return { insert: insertCalls }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }
      },
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(insertCalls).toHaveBeenCalled()
  })

  test('no chat data → still logs + ok', async () => {
    const insertCalls = mock(async () => ({ error: null }))
    const supabase = {
      from: (table: string) => {
        if (table === 'chat_conversations') {
          return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }
        }
        if (table === 'anthropic_deletion_log') return { insert: insertCalls }
        return {}
      },
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })
})
