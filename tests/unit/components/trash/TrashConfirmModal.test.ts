import { describe, expect, it, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

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
          h('div', { class: 'dlg-body' }, slots.default?.()),
          h('div', { class: 'dlg-foot' }, [h('div', { class: 'r' }, slots.foot?.())]),
        ])
    },
  }),
}))

const { default: TrashConfirmModal } = await import('@/components/trash/TrashConfirmModal.vue')

const mountModal = () => mount(TrashConfirmModal, { props: { canvasName: 'Spring Drop · 04' } })

describe('TrashConfirmModal', () => {
  it('renders B13.1 copy exactly', () => {
    const v = mountModal()
    expect(v.text()).toContain('Move "Spring Drop · 04" to trash?')
    expect(v.text()).toContain('Restore anytime from Trash.')
    expect(v.text()).toContain(
      'This canvas and all of its snapshots will be moved to Trash. You can restore it from Trash whenever you want.',
    )
  })

  it('uses .btn.danger (NOT primary)', () => {
    expect(mountModal().html()).toContain('btn danger')
    expect(mountModal().html()).not.toContain('btn primary')
  })

  it('Move-to-trash emits confirmed; Cancel emits cancelled', async () => {
    const v = mountModal()
    await v.find('[data-testid="trash-button"]').trigger('click')
    expect(v.emitted('confirmed')).toBeTruthy()
    await v.find('[data-testid="cancel-button"]').trigger('click')
    expect(v.emitted('cancelled')).toBeTruthy()
  })
})
