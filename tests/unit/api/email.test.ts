import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { renderEmailShell, sendEmail } from '../../../api/_shared/email'

// W6 Cluster 11 Phase 5c — sendEmail() + renderEmailShell() tests.
//
// sendEmail tests cover the env-guard / stub path only — the actual Resend
// SDK is not exercised (would need a live API key). The transmit path is
// validated by Resend's own SDK tests + integration env after pre-launch
// wiring (scope-plan §11).

const KEY_VAR = 'RESEND_API_KEY'

describe('sendEmail stub-guard (Plan 11 Task 1.6)', () => {
  let original: string | undefined
  let warnSpy: ReturnType<typeof mock>
  let originalWarn: typeof console.warn

  beforeEach(() => {
    original = process.env[KEY_VAR]
    delete process.env[KEY_VAR]
    warnSpy = mock(() => undefined)
    originalWarn = console.warn
    console.warn = warnSpy as unknown as typeof console.warn
  })
  afterEach(() => {
    if (original === undefined) {
      delete process.env[KEY_VAR]
    } else {
      process.env[KEY_VAR] = original
    }
    console.warn = originalWarn
  })

  test('returns ok:true + skipped when env missing', async () => {
    const result = await sendEmail({
      to: 'jiho@example.com',
      subject: 'Hello',
      html: '<p>hi</p>',
      unsubscribeUrl: 'https://kova.app/unsub',
    })
    expect(result.ok).toBe(true)
    expect(result.skipped).toBe(true)
  })

  test('logs warn breadcrumb on stub path', async () => {
    await sendEmail({
      to: 'jiho@example.com',
      subject: 'Greetings',
      html: '<p>hi</p>',
      unsubscribeUrl: 'https://kova.app/unsub',
    })
    expect(warnSpy).toHaveBeenCalled()
    // sendEmail produces 2 warn calls — first via loadEnvOrSkip("RESEND_API_KEY"),
    // second from sendEmail itself. The second carries the per-send context.
    const allMessages = warnSpy.mock.calls.map((c) => String(c[0])).join('\n')
    expect(allMessages).toContain('Greetings')
    expect(allMessages).toContain('jiho@example.com')
  })
})

describe('renderEmailShell template (Plan 11 Task 1.6 helper)', () => {
  test('renders title + body + recipient + footer links', () => {
    const html = renderEmailShell({
      title: 'Welcome to Kova',
      bodyHtml: '<p>Glad you joined.</p>',
      recipientEmail: 'jiho@kova.app',
      settingsUrl: 'https://kova.app/settings',
      unsubscribeUrl: 'https://kova.app/u/abc',
    })
    expect(html).toContain('Welcome to Kova')
    expect(html).toContain('<p>Glad you joined.</p>')
    expect(html).toContain('jiho@kova.app')
    expect(html).toContain('https://kova.app/settings')
    expect(html).toContain('https://kova.app/u/abc')
    expect(html).toContain('Kova')
  })

  test('escapes user-supplied input', () => {
    const html = renderEmailShell({
      title: '<script>alert(1)</script>',
      bodyHtml: 'safe',
      recipientEmail: 'a@b.c',
      settingsUrl: 'https://kova.app/settings',
      unsubscribeUrl: 'https://kova.app/u',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  test('does NOT escape pre-rendered bodyHtml (caller-controlled)', () => {
    // bodyHtml is trusted — callers compose it from their own components.
    // recipientEmail / title / urls ARE escaped because they bridge user input.
    const html = renderEmailShell({
      title: 'X',
      bodyHtml: '<strong>raw bold</strong>',
      recipientEmail: 'a@b.c',
      settingsUrl: 'https://kova.app/settings',
      unsubscribeUrl: 'https://kova.app/u',
    })
    expect(html).toContain('<strong>raw bold</strong>')
  })

  test('uses current year in footer', () => {
    const html = renderEmailShell({
      title: 'X',
      bodyHtml: '',
      recipientEmail: 'a@b.c',
      settingsUrl: 'https://kova.app/s',
      unsubscribeUrl: 'https://kova.app/u',
    })
    expect(html).toContain(String(new Date().getFullYear()))
  })

  test('default wordmark URL when not supplied', () => {
    const html = renderEmailShell({
      title: 'X',
      bodyHtml: '',
      recipientEmail: 'a@b.c',
      settingsUrl: 'https://kova.app/s',
      unsubscribeUrl: 'https://kova.app/u',
    })
    expect(html).toContain('/email/wordmark@2x.png')
  })
})
