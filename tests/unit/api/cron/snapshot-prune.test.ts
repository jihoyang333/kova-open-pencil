import { afterEach, describe, expect, it } from 'bun:test'
import handler from '../../../../api/cron/snapshot-prune'

const ORIG = process.env['CRON_SECRET']
afterEach(() => {
  if (ORIG === undefined) delete process.env['CRON_SECRET']
  else process.env['CRON_SECRET'] = ORIG
})

describe('POST /api/cron/snapshot-prune', () => {
  it('503 stub when CRON_SECRET not configured', async () => {
    delete process.env['CRON_SECRET']
    const res = await handler(new Request('http://x', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(503)
    expect((await res.json()).stub).toBe(true)
  })

  it('401 with a wrong Bearer token', async () => {
    process.env['CRON_SECRET'] = 'right-secret'
    const res = await handler(
      new Request('http://x', { method: 'POST', headers: { authorization: 'Bearer wrong' }, body: '{}' }),
    )
    expect(res.status).toBe(401)
  })
})
