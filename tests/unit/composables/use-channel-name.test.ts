import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

import { useChannelName } from '@/composables/use-channel-name'
import { useAuthStore } from '@/stores/auth'

describe('useChannelName (Cluster 11 — PRD 11 §5.6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('builds kova.{userId}.{domain}.{topic} when authenticated', () => {
    const auth = useAuthStore()
    auth.user = { id: 'user-abc' } as unknown as typeof auth.user
    const channel = useChannelName('canvas', 'cv-123.snapshot')
    expect(channel).toBe('kova.user-abc.canvas.cv-123.snapshot')
  })

  test('throws when called before sign-in (no userId)', () => {
    const auth = useAuthStore()
    auth.user = null as unknown as typeof auth.user
    expect(() => useChannelName('chat', 'conv-1.stream')).toThrow(
      /useChannelName called before sign-in/
    )
  })

  test('supports the documented topic patterns from PRD §5.6', () => {
    const auth = useAuthStore()
    auth.user = { id: 'u' } as unknown as typeof auth.user
    expect(useChannelName('canvas', 'cv1.snapshot')).toBe('kova.u.canvas.cv1.snapshot')
    expect(useChannelName('chat', 'conv1.stream')).toBe('kova.u.chat.conv1.stream')
    expect(useChannelName('shopify', 'b1.sync')).toBe('kova.u.shopify.b1.sync')
    expect(useChannelName('billing', 'events')).toBe('kova.u.billing.events')
    expect(useChannelName('presence', '')).toBe('kova.u.presence.')
  })
})
