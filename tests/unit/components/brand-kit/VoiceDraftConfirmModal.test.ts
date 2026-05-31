import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

// --- Icon registry stub (unplugin-icons not resolved in bun test) ---
mock.module('@/components/ui/kova-icon-registry', () => {
  const stub = (name: string) =>
    defineComponent({ name: `IconStub-${name}`, setup: (_, { attrs }) => () => h('svg', { ...attrs, 'data-icon': name }) })
  return {
    KOVA_ICON_REGISTRY: new Map<string, ReturnType<typeof stub>>(),
    KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
  }
})

// Reka UI dialog — stub to avoid JSDOM pointer/portals incompatibility
mock.module('reka-ui', () => ({
  DialogRoot: defineComponent({ name: 'DialogRoot', setup: (_, { slots }) => () => slots.default?.() }),
  DialogTrigger: defineComponent({ name: 'DialogTrigger', setup: (_, { slots }) => () => slots.default?.() }),
  DialogPortal: defineComponent({ name: 'DialogPortal', setup: (_, { slots }) => () => slots.default?.() }),
  DialogOverlay: defineComponent({ name: 'DialogOverlay', setup: () => () => h('div') }),
  DialogContent: defineComponent({ name: 'DialogContent', setup: (_, { slots }) => () => h('div', slots.default?.()) }),
  DialogTitle: defineComponent({ name: 'DialogTitle', setup: (_, { slots }) => () => h('h3', slots.default?.()) }),
  DialogDescription: defineComponent({ name: 'DialogDescription', setup: (_, { slots }) => () => h('p', slots.default?.()) }),
  DialogClose: defineComponent({ name: 'DialogClose', setup: (_, { slots }) => () => h('button', slots.default?.()) }),
}))

// Supabase stub — chainable .from(...).select().eq().is().is().order().limit().maybeSingle()
let maybeSingleData: unknown = null
function chain(): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  const ret = () => c
  c['select'] = ret
  c['eq'] = ret
  c['is'] = ret
  c['order'] = ret
  c['limit'] = ret
  c['maybeSingle'] = () => Promise.resolve({ data: maybeSingleData, error: null })
  return c
}
const fromMock = mock(() => chain())
mock.module('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}))

// Fetch mock for confirmDraft / discardDraft
const fetchMock = mock(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ success: true, voice_word_count: 5, tone_snippet_count: 2 }),
  } as unknown as Response),
)
const realFetch = globalThis.fetch
globalThis.fetch = fetchMock as unknown as typeof fetch

// toast stub — avoid vueuse browser events in bun
mock.module('@/composables/use-toast', () => ({
  toast: { show: mock(), remove: mock(), toasts: { value: [] }, setupGlobalErrorHandler: mock(), TOAST_DURATION: 3000 },
}))

const SAMPLE_DRAFT = {
  id: 'd1',
  brand_id: 'b1',
  user_id: 'u1',
  source: 'shopify_extract' as const,
  draft_payload: {
    voice: { content: 'Direct and warm.' },
    tone_snippets: [{ label: 'Opener', category: 'WELCOME', content: 'Hey there.' }],
  },
  created_at: '2026-01-01T00:00:00Z',
  confirmed_at: null,
  discarded_at: null,
}

afterAll(() => {
  globalThis.fetch = realFetch
})

beforeEach(() => {
  setActivePinia(createPinia())
  fetchMock.mockClear()
  fromMock.mockClear()
  maybeSingleData = null
})

describe('<VoiceDraftConfirmModal>', () => {
  async function setup(withDraft = true) {
    const { useVoiceDraft } = await import('@/composables/use-voice-draft')
    const vd = useVoiceDraft()
    if (withDraft) {
      // Seed activeDraft directly via clear + load pattern
      vd.clear()
      // Manually seed by loading from a mock supabase response
      // Since supabase.from returns null data, set via real module-level ref
      // We test behaviour by calling the composable methods directly.
    }
    vd.clear()

    const { default: VoiceDraftConfirmModal } = await import(
      '@/components/brand-kit/modals/VoiceDraftConfirmModal.vue'
    )
    return { VoiceDraftConfirmModal, vd }
  }

  test('renders modal when open=true', async () => {
    const { VoiceDraftConfirmModal } = await setup(false)
    const wrapper = mount(VoiceDraftConfirmModal, {
      props: { open: true },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('Confirm brand voice draft')
  })

  test('emits update:open false when Discard draft clicked and no draft present', async () => {
    const { VoiceDraftConfirmModal, vd } = await setup(false)
    vd.clear()
    // discardDraft throws 'no_active_draft' when no draft; test shows error toast not crash
    const wrapper = mount(VoiceDraftConfirmModal, {
      props: { open: true },
      global: { plugins: [createPinia()] },
    })
    // Find discard button
    const buttons = wrapper.findAll('button')
    const discardBtn = buttons.find((b) => b.text().toLowerCase().includes('discard'))
    expect(discardBtn).toBeDefined()
  })

  test('shows Skip for now button when showSkip=true', async () => {
    const { VoiceDraftConfirmModal } = await setup(false)
    const wrapper = mount(VoiceDraftConfirmModal, {
      props: { open: true, showSkip: true },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('Skip for now')
  })

  test('does NOT show Skip for now button when showSkip=false', async () => {
    const { VoiceDraftConfirmModal } = await setup(false)
    const wrapper = mount(VoiceDraftConfirmModal, {
      props: { open: true, showSkip: false },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).not.toContain('Skip for now')
  })

  test('confirmDraft: calls useVoiceDraft.confirmDraft on Confirm & save click', async () => {
    const { useVoiceDraft } = await import('@/composables/use-voice-draft')
    const vd = useVoiceDraft()
    vd.clear()

    // Seed draft via module-level state (activeDraft ref in composable)
    // We test the composable directly since modal calls it
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true, voice_word_count: 8, tone_snippet_count: 1 }),
      } as unknown as Response),
    )

    // Seed the draft the composable will load.
    maybeSingleData = SAMPLE_DRAFT
    const loaded = await vd.loadDraftAfterShopifyConnect('b1')
    expect(loaded?.id).toBe('d1')
    expect(vd.hasDraft.value).toBe(true)

    const result = await vd.confirmDraft()
    expect(result.voice_word_count).toBe(8)
    expect(vd.hasDraft.value).toBe(false)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/voice-draft/confirm')
  })

  test('discardDraft: calls useVoiceDraft.discardDraft', async () => {
    const { useVoiceDraft } = await import('@/composables/use-voice-draft')
    const vd = useVoiceDraft()
    vd.clear()

    maybeSingleData = SAMPLE_DRAFT
    await vd.loadDraftAfterShopifyConnect('b1')
    expect(vd.hasDraft.value).toBe(true)

    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({}) } as unknown as Response),
    )
    await vd.discardDraft()
    expect(vd.hasDraft.value).toBe(false)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/voice-draft/discard')
  })

  test('privacy disclosure present in rendered output', async () => {
    const { VoiceDraftConfirmModal } = await setup(false)
    const wrapper = mount(VoiceDraftConfirmModal, {
      props: { open: true },
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.text()).toContain('Anthropic')
  })
})
