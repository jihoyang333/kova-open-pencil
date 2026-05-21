import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import { useOnlineStatus } from '@/composables/use-online-status'

describe('useOnlineStatus (Cluster 11 — PRD 11 §3.7 + KD-3)', () => {
  let originalOnLine: PropertyDescriptor | undefined

  beforeEach(() => {
    originalOnLine = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine')
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true })
  })

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(globalThis.navigator, 'onLine', originalOnLine)
    }
  })

  test('initial status follows navigator.onLine', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: false })
    const captured = ref<string | null>(null)
    const Comp = defineComponent({
      setup() {
        const { status } = useOnlineStatus()
        captured.value = status.value
        return () => h('div')
      },
    })
    mount(Comp)
    expect(captured.value).toBe('offline')
  })

  test('window "online" event flips status to online', async () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: false })
    const statusRef = ref<string | null>(null)
    const Comp = defineComponent({
      setup() {
        const { status } = useOnlineStatus()
        statusRef.value = status.value
        // Track changes
        return () =>
          h('div', {
            'data-status': status.value,
            onVnodeUpdated: () => {
              statusRef.value = status.value
            },
          })
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.attributes('data-status')).toBe('offline')

    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true })
    window.dispatchEvent(new Event('online'))
    await nextTick()
    expect(wrapper.attributes('data-status')).toBe('online')
  })

  test('window "offline" event flips status to offline', async () => {
    const Comp = defineComponent({
      setup() {
        const { status } = useOnlineStatus()
        return () => h('div', { 'data-status': status.value })
      },
    })
    const wrapper = mount(Comp)
    expect(wrapper.attributes('data-status')).toBe('online')

    window.dispatchEvent(new Event('offline'))
    await nextTick()
    expect(wrapper.attributes('data-status')).toBe('offline')
  })

  test('noteAck is returned from the composable (HIGH-1 fix)', () => {
    const Comp = defineComponent({
      setup() {
        const result = useOnlineStatus()
        // Contract: noteAck is a function on the returned object.
        expect(typeof result.noteAck).toBe('function')
        return () => h('div')
      },
    })
    mount(Comp)
  })

  test('noteAck flips offline → online when navigator is back online', async () => {
    let api: ReturnType<typeof useOnlineStatus>
    const Comp = defineComponent({
      setup() {
        api = useOnlineStatus()
        return () => h('div', { 'data-status': api.status.value })
      },
    })
    const wrapper = mount(Comp)

    // Force offline.
    window.dispatchEvent(new Event('offline'))
    await nextTick()
    expect(wrapper.attributes('data-status')).toBe('offline')

    // navigator back online, noteAck called by a consumer.
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true })
    api!.noteAck()
    await nextTick()
    expect(wrapper.attributes('data-status')).toBe('online')
  })
})
