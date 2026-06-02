import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Neutralize the unplugin-icons virtual modules pulled in by KovaIcon's registry.
mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

// Deterministic KovaModal stub (renders slots only when open), per PreferencesModal test.
mock.module('@/components/ui/KovaModal.vue', () => ({
  default: defineComponent({
    name: 'KovaModalStub',
    props: { open: Boolean, size: String, title: String, description: String },
    emits: ['close', 'update:open'],
    setup(props, { slots, emit }) {
      return () =>
        props.open
          ? h('div', { class: 'dlg' }, [
              h('h3', {}, props.title),
              slots.default?.(),
              h('div', { class: 'dlg-foot' }, [
                h('div', { class: 'l' }, slots['foot-left']?.()),
                h('div', { class: 'r' }, slots.foot?.()),
              ]),
              h('button', { 'data-test': 'close-x', onClick: () => emit('close') }, 'x'),
            ])
          : null
    },
  }),
}))

const { default: AddVersionDialog } = await import('@/components/version-history/AddVersionDialog.vue')
const { useSnapshotsStore } = await import('@/stores/snapshots')

function mountOpen() {
  const store = useSnapshotsStore()
  store.openAddDialog()
  const w = mount(AddVersionDialog, { props: { canvasId: 'c1' } })
  return { w, store }
}

describe('AddVersionDialog', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('Save is disabled until Title is non-empty', async () => {
    const { w } = mountOpen()
    const save = w.find('[data-testid="save-button"]')
    expect(save.attributes('aria-disabled')).toBe('true')
    await w.find('[data-testid="title-input"]').setValue('Hello')
    expect(save.attributes('aria-disabled')).toBe('false')
  })

  it('Save calls store.create with kind=manual + emits saved', async () => {
    const { w, store } = mountOpen()
    store.create = mock(() => Promise.resolve({ ok: true as const, id: 's9' }))
    await w.find('[data-testid="title-input"]').setValue('v2 hero')
    await w.find('[data-testid="desc-input"]').setValue('changed hero')
    await w.find('[data-testid="save-button"]').trigger('click')
    await flushPromises()
    expect(store.create).toHaveBeenCalledTimes(1)
    expect((store.create as ReturnType<typeof mock>).mock.calls[0][0]).toMatchObject({
      canvasId: 'c1',
      kind: 'manual',
      label: 'v2 hero',
      description: 'changed hero',
    })
    expect(w.emitted('saved')).toEqual([['s9']])
  })

  it('Save does nothing while title is empty', async () => {
    const { w, store } = mountOpen()
    store.create = mock(() => Promise.resolve({ ok: true as const, id: 'x' }))
    await w.find('[data-testid="save-button"]').trigger('click')
    await flushPromises()
    expect(store.create).not.toHaveBeenCalled()
  })

  it('Cancel emits cancelled and resets the form', async () => {
    const { w, store } = mountOpen()
    await w.find('[data-testid="title-input"]').setValue('draft')
    await w.find('[data-testid="cancel-button"]').trigger('click')
    expect(w.emitted('cancelled')).toBeTruthy()
    expect(store.addDialogOpen).toBe(false)
    // reopening shows a cleared title
    store.openAddDialog()
    await w.vm.$nextTick()
    expect((w.find('[data-testid="title-input"]').element as HTMLInputElement).value).toBe('')
  })
})
