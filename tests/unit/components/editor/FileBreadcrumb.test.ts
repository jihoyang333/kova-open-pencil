/**
 * FileBreadcrumb — Cluster 06 Task 9 tests.
 *
 * Q17 brand-label click navigates to /brand/:brandId (no popover, no in-canvas
 * brand switching). File-name caret emits open-file-menu (Cluster 08 mounts).
 */
import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map<string, unknown>(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

const pushSpy = { calls: [] as string[] }
mock.module('vue-router', () => ({
  useRouter: () => ({
    push: (path: string) => {
      pushSpy.calls.push(path)
      return Promise.resolve()
    },
  }),
}))

const FileBreadcrumb = (await import('@/components/editor/FileBreadcrumb.vue')).default

describe('<FileBreadcrumb> (Cluster 06 Task 9 — Q17)', () => {
  test('clicking brand pill navigates to /brand/:brandId (Q17)', async () => {
    pushSpy.calls = []
    const wrapper = mount(FileBreadcrumb, {
      props: {
        brandId: 'brand-abc',
        brandName: 'Acme',
        brandColor: 'var(--color-accent)',
        fileName: 'Welcome',
      },
    })
    await wrapper.find('[data-testid="topbar-brand-pill"]').trigger('click')
    expect(pushSpy.calls).toEqual(['/brand/brand-abc'])
  })

  test('brand pill click is no-op when brandId is null', async () => {
    pushSpy.calls = []
    const wrapper = mount(FileBreadcrumb, {
      props: {
        brandId: null,
        brandName: 'Brand',
        brandColor: 'var(--color-accent)',
        fileName: 'Untitled',
      },
    })
    await wrapper.find('[data-testid="topbar-brand-pill"]').trigger('click')
    expect(pushSpy.calls).toEqual([])
  })

  test('file-name caret emits open-file-menu event', async () => {
    pushSpy.calls = []
    const wrapper = mount(FileBreadcrumb, {
      props: {
        brandId: 'brand-abc',
        brandName: 'Acme',
        brandColor: 'var(--color-accent)',
        fileName: 'Welcome',
      },
    })
    await wrapper.find('[data-testid="topbar-file-caret"]').trigger('click')
    expect(wrapper.emitted('open-file-menu')).toBeTruthy()
  })

  test('renders brand name + file name text', () => {
    const wrapper = mount(FileBreadcrumb, {
      props: {
        brandId: 'brand-abc',
        brandName: 'Acme Co',
        brandColor: 'var(--color-accent)',
        fileName: 'Spring Launch',
      },
    })
    expect(wrapper.text()).toContain('Acme Co')
    expect(wrapper.text()).toContain('Spring Launch')
  })
})
