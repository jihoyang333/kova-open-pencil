import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test'
import { sendEmail } from '../../../../api/_shared/email'

const warnMock = mock(() => undefined)
const origWarn = console.warn

describe('sendEmail (stub mode)', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
    delete process.env['RESEND_API_KEY']
  })

  it('returns stub id + skipped flag when RESEND_API_KEY unset', async () => {
    const result = await sendEmail({
      to: 'u@x.com',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
    })
    expect(result.id).toMatch(/^stub_/)
    expect(result.skipped).toBe(true)
    expect(warnMock).toHaveBeenCalled()
    expect(String(warnMock.mock.calls[0]?.[0])).toContain('stub mode')
  })

  it('does not throw without API key (stub fallback)', async () => {
    await expect(
      sendEmail({ to: 'u@x.com', subject: 's', html: 'h', text: 't' }),
    ).resolves.toBeDefined()
  })
})

afterAll(() => {
  console.warn = origWarn
})
