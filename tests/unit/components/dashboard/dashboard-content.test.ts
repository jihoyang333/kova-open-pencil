import { describe, test, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'

// Plan T23-T29 — dashboard content (composer + chips + file-grid) contract.

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' },
}))

const { default: ComposerInputWrap } = await import('@/components/dashboard/ComposerInputWrap.vue')
const { default: ComposerChips } = await import('@/components/dashboard/ComposerChips.vue')
const { default: Composer } = await import('@/components/dashboard/Composer.vue')
const { default: FileThumbnail } = await import('@/components/dashboard/FileThumbnail.vue')
const { default: FileCard } = await import('@/components/dashboard/FileCard.vue')
const { default: FileGrid } = await import('@/components/dashboard/FileGrid.vue')
const { default: SortDropdown } = await import('@/components/dashboard/SortDropdown.vue')
const { default: ViewToggle } = await import('@/components/dashboard/ViewToggle.vue')
const { COMPOSER_PRESETS } = await import('@/constants/composer-presets')

describe('ComposerInputWrap (T24)', () => {
  test('idle state — submit button disabled while modelValue empty', () => {
    const w = mount(ComposerInputWrap, { props: { modelValue: '', state: 'idle' } })
    expect(w.find('[data-test-id="composer-submit"]').attributes('disabled')).toBeDefined()
  })

  test('idle + non-empty enables submit', () => {
    const w = mount(ComposerInputWrap, { props: { modelValue: 'hi', state: 'idle' } })
    expect(w.find('[data-test-id="composer-submit"]').attributes('disabled')).toBeUndefined()
  })

  test('submitting renders loader copy + disables submit', () => {
    const w = mount(ComposerInputWrap, { props: { modelValue: 'hi', state: 'submitting' } })
    expect(w.text()).toContain('Creating canvas')
    expect(w.find('[data-test-id="composer-submit"]').attributes('disabled')).toBeDefined()
  })

  test('review renders .review modifier + Ready status', () => {
    const w = mount(ComposerInputWrap, { props: { modelValue: 'x', state: 'review' } })
    expect(w.find('.composer-input.review').exists()).toBe(true)
    expect(w.find('.composer-status.ready').text()).toContain('Ready')
  })

  test('submitting sets aria-readonly on contenteditable', () => {
    const w = mount(ComposerInputWrap, { props: { modelValue: 'hi', state: 'submitting' } })
    expect(w.find('[data-test-id="composer-input"]').attributes('aria-readonly')).toBe('true')
  })

  test('emits submit on ⌘↵ when canSubmit', async () => {
    const w = mount(ComposerInputWrap, { props: { modelValue: 'go', state: 'idle' } })
    await w.find('[data-test-id="composer-input"]').trigger('keydown', {
      code: 'Enter',
      metaKey: true,
    })
    expect(w.emitted('submit')).toHaveLength(1)
  })

  test('does not emit submit on ⌘↵ when state submitting', async () => {
    const w = mount(ComposerInputWrap, { props: { modelValue: 'go', state: 'submitting' } })
    await w.find('[data-test-id="composer-input"]').trigger('keydown', {
      code: 'Enter',
      metaKey: true,
    })
    expect(w.emitted('submit')).toBeUndefined()
  })
})

describe('ComposerChips (T25)', () => {
  test('renders one chip per preset', () => {
    const w = mount(ComposerChips, { props: { presets: COMPOSER_PRESETS } })
    expect(w.findAll('.composer-chip')).toHaveLength(5)
  })

  test('emits select with preset on chip click', async () => {
    const w = mount(ComposerChips, { props: { presets: COMPOSER_PRESETS } })
    await w.find('[data-test-id="composer-chip-sale"]').trigger('click')
    expect(w.emitted('select')?.[0]).toEqual([COMPOSER_PRESETS[0]])
  })
})

describe('Composer (T26)', () => {
  test('chip click seeds draft with seedText', async () => {
    const w = mount(Composer)
    await w.find('[data-test-id="composer-chip-sale"]').trigger('click')
    expect((w.vm as { draft: string }).draft).toContain('Promote a sale')
  })

  test('submit with empty draft is no-op', async () => {
    const w = mount(Composer)
    await w.find('[data-test-id="composer-submit"]').trigger('click')
    expect(w.emitted('submit')).toBeUndefined()
  })

  test('submit emits current draft', async () => {
    const w = mount(Composer)
    ;(w.vm as { draft: string }).draft = 'Spring sale'
    await w.vm.$nextTick()
    await w.find('[data-test-id="composer-submit"]').trigger('click')
    expect((w.emitted('submit')?.[0] as [string])[0]).toBe('Spring sale')
  })
})

describe('FileThumbnail (T27)', () => {
  test('renders thumbnail_url img when present', () => {
    const canvas = { id: 'c1', name: 'A', thumbnail_url: '/x.png' } as unknown as Parameters<
      typeof mount
    >[1] extends never
      ? never
      : object
    const w = mount(FileThumbnail, { props: { canvas } as never })
    expect(w.find('img').attributes('src')).toBe('/x.png')
  })

  test('falls back to abstraction when no thumbnail_url', () => {
    const canvas = { id: 'c1', name: 'A', thumbnail_url: null }
    const w = mount(FileThumbnail, { props: { canvas } as never })
    expect(w.find('.thumb-frame, .thumb-flow, .thumb-ab').exists()).toBe(true)
  })

  test('abstraction is deterministic for same canvas id', () => {
    const canvas = { id: 'stable-id', name: 'A', thumbnail_url: null }
    const w1 = mount(FileThumbnail, { props: { canvas } as never })
    const w2 = mount(FileThumbnail, { props: { canvas } as never })
    const cls1 = w1.find('.thumb > div').classes()
    const cls2 = w2.find('.thumb > div').classes()
    expect(cls1).toEqual(cls2)
  })
})

describe('FileCard (T28)', () => {
  const baseCanvas = {
    id: 'c1',
    name: 'Spring Drop',
    brand_id: 'b1',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    thumbnail_url: null,
    trashed_at: null,
  }

  test('renders title + status tag + frame-count when set', () => {
    const w = mount(FileCard, {
      props: { canvas: { ...baseCanvas, status: 'scheduled', frame_count: 4 } as never },
    })
    expect(w.find('[data-test-id="file-title"]').text()).toBe('Spring Drop')
    expect(w.find('[data-test-id="file-status"]').text()).toBe('Scheduled')
    expect(w.find('[data-test-id="file-frame-count"]').text()).toBe('4')
  })

  test('hides status + frame-count when fields absent', () => {
    const w = mount(FileCard, { props: { canvas: baseCanvas as never } })
    expect(w.find('[data-test-id="file-status"]').exists()).toBe(false)
    expect(w.find('[data-test-id="file-frame-count"]').exists()).toBe(false)
  })

  test('emits open with canvas id on click', async () => {
    const w = mount(FileCard, { props: { canvas: baseCanvas as never } })
    await w.find('[data-test-id="file-card"]').trigger('click')
    expect(w.emitted('open')?.[0]).toEqual(['c1'])
  })

  test('emits context-menu with position on right-click', async () => {
    const w = mount(FileCard, { props: { canvas: baseCanvas as never } })
    await w.find('[data-test-id="file-card"]').trigger('contextmenu', { clientX: 10, clientY: 20 })
    const ev = w.emitted('context-menu')?.[0] as [{ canvasId: string; position: { x: number; y: number } }]
    expect(ev[0]).toEqual({ canvasId: 'c1', position: { x: 10, y: 20 } })
  })
})

describe('FileGrid (T29)', () => {
  const make = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `c${i}`,
      name: `Canvas ${i}`,
      brand_id: 'b1',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      thumbnail_url: null,
      trashed_at: null,
    }))

  test('renders one FileCard per canvas', () => {
    const w = mount(FileGrid, {
      props: { canvases: make(8) as never, viewMode: 'grid', isLoading: false },
    })
    expect(w.findAll('.file-card')).toHaveLength(8)
  })

  test('applies list modifier when viewMode = list', () => {
    const w = mount(FileGrid, {
      props: { canvases: make(2) as never, viewMode: 'list', isLoading: false },
    })
    expect(w.find('[data-test-id="file-grid"]').classes()).toContain('list')
  })

  test('renders empty slot when canvases empty + !isLoading', () => {
    const w = mount(FileGrid, {
      props: { canvases: [], viewMode: 'grid', isLoading: false },
      slots: { empty: '<div class="empty-marker">EMPTY</div>' },
    })
    expect(w.find('.empty-marker').exists()).toBe(true)
  })

  test('skips empty slot when isLoading', () => {
    const w = mount(FileGrid, {
      props: { canvases: [], viewMode: 'grid', isLoading: true },
      slots: {
        empty: '<div class="empty-marker">EMPTY</div>',
        loading: '<div class="loading-marker">LOADING</div>',
      },
    })
    expect(w.find('.empty-marker').exists()).toBe(false)
    expect(w.find('.loading-marker').exists()).toBe(true)
  })
})

describe('SortDropdown + ViewToggle (T28)', () => {
  test('SortDropdown emits update:modelValue with new SortMode', async () => {
    const w = mount(SortDropdown, { props: { modelValue: 'recent' } })
    await w.find('select').setValue('name')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['name'])
  })

  test('ViewToggle highlights current mode + emits update on click', async () => {
    const w = mount(ViewToggle, { props: { modelValue: 'grid' } })
    expect(w.findAll('.v')[0]!.classes()).toContain('on')
    await w.findAll('.v')[1]!.trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['list'])
  })
})
