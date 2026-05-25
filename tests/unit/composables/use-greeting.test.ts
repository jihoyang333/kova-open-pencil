import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import type { User as AuthUser } from '@supabase/supabase-js'

// Mock the clock BEFORE importing the composable so the closure picks up
// the stub. Each test rewrites the singleton's `now` via mock.module.
const clockState = { current: new Date(2026, 4, 15, 8, 0, 0) }
mock.module('@/utils/clock', () => ({ now: () => clockState.current }))

const { useGreeting } = await import('@/composables/use-greeting')
const { useAuthStore } = await import('@/stores/auth')

function setHour(h: number): void {
  clockState.current = new Date(2026, 4, 15, h, 0, 0)
}

describe('useGreeting', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clockState.current = new Date(2026, 4, 15, 8, 0, 0)
  })

  test('morning phase 04:00 .. 11:59', () => {
    setHour(8)
    const auth = useAuthStore()
    auth.profile = { name: 'Jiho Yang' } as unknown as typeof auth.profile
    expect(useGreeting().value).toBe('Good morning, Jiho')
  })

  test('boundary 04:00 == morning', () => {
    setHour(4)
    const auth = useAuthStore()
    auth.profile = { name: 'Jiho' } as unknown as typeof auth.profile
    expect(useGreeting().value).toMatch(/morning/)
  })

  test('afternoon phase 12:00 .. 17:59', () => {
    setHour(14)
    const auth = useAuthStore()
    auth.profile = { name: 'Jiho' } as unknown as typeof auth.profile
    expect(useGreeting().value).toMatch(/afternoon/)
  })

  test('evening phase 18:00 .. 03:59', () => {
    setHour(22)
    const auth = useAuthStore()
    auth.profile = { name: 'Jiho' } as unknown as typeof auth.profile
    expect(useGreeting().value).toMatch(/evening/)
  })

  test('evening phase wraps past midnight (02:00 still evening)', () => {
    setHour(2)
    const auth = useAuthStore()
    auth.profile = { name: 'Jiho' } as unknown as typeof auth.profile
    expect(useGreeting().value).toMatch(/evening/)
  })

  test('falls back to email local-part when name missing', () => {
    setHour(10)
    const auth = useAuthStore()
    auth.profile = { name: null } as unknown as typeof auth.profile
    auth.user = { email: 'jane@example.com' } as AuthUser
    expect(useGreeting().value).toContain('jane')
  })

  test('falls back to "there" when neither name nor email available', () => {
    setHour(10)
    const auth = useAuthStore()
    auth.profile = null
    auth.user = null
    expect(useGreeting().value).toBe('Good morning, there')
  })
})
