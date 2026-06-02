import { describe, expect, it, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

// KovaModal stub — renders head (title + sub), body, foot-left, foot. Always open.
mock.module('@/components/ui/KovaModal.vue', () => ({
  default: defineComponent({
    name: 'KovaModalStub',
    props: { open: Boolean, size: String, title: String, description: String },
    emits: ['close', 'update:open'],
    setup(props, { slots }) {
      return () =>
        h('div', { class: 'dlg' }, [
          h('h3', {}, props.title),
          h('p', { class: 'sub' }, props.description),
          slots.default?.(),
          h('div', { class: 'dlg-foot' }, [
            h('div', { class: 'l' }, slots['foot-left']?.()),
            h('div', { class: 'r' }, slots.foot?.()),
          ]),
        ])
    },
  }),
}))

const { default: RestoreConfirmModal } = await import(
  '@/components/version-history/RestoreConfirmModal.vue'
)

const named = { id: 's1', label: 'Pre-Klaviyo handoff', taken_at: '2026-04-28T17:12:00Z' }
const autosave = { id: 's2', label: null, taken_at: '2026-04-28T17:12:00Z' }

describe('RestoreConfirmModal', () => {
  it('uses .btn.primary, NOT .btn.danger', () => {
    const w = mount(RestoreConfirmModal, { props: { snapshot: named } })
    expect(w.html()).toContain('btn primary')
    expect(w.html()).not.toContain('btn danger')
  })

  it('foot shows "Restoring {label}" for a named snapshot', () => {
    const w = mount(RestoreConfirmModal, { props: { snapshot: named } })
    expect(w.text()).toContain('Restoring Pre-Klaviyo handoff')
  })

  it('falls back to the formatted timestamp for an unnamed snapshot', () => {
    const w = mount(RestoreConfirmModal, { props: { snapshot: autosave } })
    expect(w.text()).toContain('Restoring')
    expect(w.text()).not.toContain('Restoring null')
  })

  it('Restore click emits confirmed; Cancel emits cancelled', async () => {
    const w = mount(RestoreConfirmModal, { props: { snapshot: named } })
    await w.find('[data-testid="restore-button"]').trigger('click')
    expect(w.emitted('confirmed')).toBeTruthy()
    await w.find('[data-testid="cancel-button"]').trigger('click')
    expect(w.emitted('cancelled')).toBeTruthy()
  })
})
