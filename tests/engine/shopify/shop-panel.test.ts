import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

// ----- Supabase mock -----

const mockFrom = mock(() => ({}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

// ----- Canvas tool mocks -----

mock.module('@/engine/tool-calls', () => ({
  createNode: mock(async () => 'node-id'),
  setLayout: mock(async () => undefined),
  setText: mock(async () => undefined),
  setImage: mock(async () => undefined),
  setFill: mock(async () => undefined),
}))

mock.module('@/stores/editor', () => ({
  useEditorStore: mock(() => ({ state: { documentName: 'Test' } })),
}))

mock.module('@/automation/figma-factory', () => ({
  makeFigmaFromStore: mock(() => ({})),
}))

// Spy on the factory so the mock is restorable and doesn't leak into overlay-factory.test.ts
const factoryModule = await import('@/canvas-extensions/product-variant/factory')
const mockCreateProductVariantFrame = spyOn(factoryModule, 'createProductVariantFrame').mockImplementation(
  async (_input: unknown) => ({
    frame_id: 'frame-123',
    child_ids: { image_node_id: 'img-1', title_node_id: 'title-1', price_node_id: 'price-1' },
  }),
)

// ----- Import under test -----

const {
  serializeShopPayload,
  parseShopPayload,
  useShopDrop,
  SHOP_PAYLOAD_TYPE,
  SHOP_COLLECTION_TYPE,
} = await import('@/composables/use-shop-drop')

const { useChatCommands } = await import('@/composables/use-chat-commands')

// ----- Fixtures -----

const VARIANT_PAYLOAD = {
  type: SHOP_PAYLOAD_TYPE,
  variant_id: 'gid://shopify/ProductVariant/123',
  title: 'Classic Tee',
  price: 29.99,
  currency: 'USD',
  image_url: 'https://cdn.shopify.com/tee.jpg',
  brand_id: 'brand-1',
} as const

// ----- Drag payload serialization -----

describe('serializeShopPayload', () => {
  test('produces valid JSON with correct type field', () => {
    const raw = serializeShopPayload(VARIANT_PAYLOAD)
    const parsed = JSON.parse(raw) as { type: string; variant_id: string }
    expect(parsed.type).toBe(SHOP_PAYLOAD_TYPE)
    expect(parsed.variant_id).toBe(VARIANT_PAYLOAD.variant_id)
  })

  test('round-trips through parseShopPayload', () => {
    const raw = serializeShopPayload(VARIANT_PAYLOAD)
    const parsed = parseShopPayload(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.type).toBe(SHOP_PAYLOAD_TYPE)
  })
})

// ----- parseShopPayload -----

describe('parseShopPayload', () => {
  test('returns null for empty string', () => {
    expect(parseShopPayload('')).toBeNull()
  })

  test('returns null for invalid JSON', () => {
    expect(parseShopPayload('not-json')).toBeNull()
  })

  test('returns null for unknown type', () => {
    expect(parseShopPayload(JSON.stringify({ type: 'unknown' }))).toBeNull()
  })

  test('accepts shopify-collection type', () => {
    const raw = JSON.stringify({
      type: SHOP_COLLECTION_TYPE,
      collection_id: 'col-1',
      title: 'Summer',
      brand_id: 'brand-1',
    })
    const parsed = parseShopPayload(raw)
    expect(parsed?.type).toBe(SHOP_COLLECTION_TYPE)
  })
})

// ----- Drop → createProductVariantFrame -----

describe('useShopDrop — variant drop', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCreateProductVariantFrame.mockClear()
  })

  function makeDragEvent(payload: unknown): DragEvent {
    return {
      dataTransfer: {
        getData: (_mime: string) => JSON.stringify(payload),
      },
    } as unknown as DragEvent
  }

  test('calls createProductVariantFrame with correct variant fields', async () => {
    const { handleCanvasDrop } = useShopDrop()
    const event = makeDragEvent(VARIANT_PAYLOAD)

    await handleCanvasDrop(event)

    expect(mockCreateProductVariantFrame).toHaveBeenCalledTimes(1)
    const call = mockCreateProductVariantFrame.mock.calls[0]
    expect(call).toBeDefined()
    const input = call[0] as { variant: { shopify_variant_id: string; title: string }; brand_id: string }
    expect(input.variant.shopify_variant_id).toBe(VARIANT_PAYLOAD.variant_id)
    expect(input.variant.title).toBe(VARIANT_PAYLOAD.title)
    expect(input.brand_id).toBe(VARIANT_PAYLOAD.brand_id)
  })

  test('does nothing when dataTransfer is empty', async () => {
    const { handleCanvasDrop } = useShopDrop()
    const event = { dataTransfer: { getData: () => '' } } as unknown as DragEvent
    await handleCanvasDrop(event)
    expect(mockCreateProductVariantFrame).not.toHaveBeenCalled()
  })

  test('does nothing for unknown payload type', async () => {
    const { handleCanvasDrop } = useShopDrop()
    const event = makeDragEvent({ type: 'other', foo: 'bar' })
    await handleCanvasDrop(event)
    expect(mockCreateProductVariantFrame).not.toHaveBeenCalled()
  })
})

// ----- Toast / build-prompt behaviour -----

describe('useShopDrop — build-around prompt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCreateProductVariantFrame.mockClear()
    // Reset module-level singleton state between tests
    const { dismissBuildPrompt } = useShopDrop()
    dismissBuildPrompt()
  })

  function makeDragEvent(payload: unknown): DragEvent {
    return {
      dataTransfer: { getData: () => JSON.stringify(payload) },
    } as unknown as DragEvent
  }

  test('buildPromptVisible becomes true after variant drop', async () => {
    const { handleCanvasDrop, buildPromptVisible } = useShopDrop()
    expect(buildPromptVisible.value).toBe(false)
    await handleCanvasDrop(makeDragEvent(VARIANT_PAYLOAD))
    expect(buildPromptVisible.value).toBe(true)
  })

  test('buildPromptTitle reflects dropped product title', async () => {
    const { handleCanvasDrop, buildPromptTitle } = useShopDrop()
    await handleCanvasDrop(makeDragEvent(VARIANT_PAYLOAD))
    expect(buildPromptTitle.value).toBe(VARIANT_PAYLOAD.title)
  })

  test('dismissBuildPrompt hides the prompt', async () => {
    const { handleCanvasDrop, buildPromptVisible, dismissBuildPrompt } = useShopDrop()
    await handleCanvasDrop(makeDragEvent(VARIANT_PAYLOAD))
    expect(buildPromptVisible.value).toBe(true)
    dismissBuildPrompt()
    expect(buildPromptVisible.value).toBe(false)
  })

  test('confirmBuildAround queues a chat message and hides the prompt', async () => {
    const { handleCanvasDrop, buildPromptVisible, confirmBuildAround } = useShopDrop()
    const { pendingMessage } = useChatCommands()

    await handleCanvasDrop(makeDragEvent(VARIANT_PAYLOAD))
    confirmBuildAround()

    expect(buildPromptVisible.value).toBe(false)
    expect(pendingMessage.value).toContain(VARIANT_PAYLOAD.title)
  })
})

// ----- useChatCommands -----

describe('useChatCommands', () => {
  test('sendToChat sets pendingMessage', () => {
    const { sendToChat, pendingMessage } = useChatCommands()
    sendToChat('Hello world')
    expect(pendingMessage.value).toBe('Hello world')
  })

  test('consumePendingMessage returns and clears message', () => {
    const { sendToChat, consumePendingMessage, pendingMessage } = useChatCommands()
    sendToChat('Test message')
    const msg = consumePendingMessage()
    expect(msg).toBe('Test message')
    expect(pendingMessage.value).toBeNull()
  })

  test('consumePendingMessage returns null when nothing queued', () => {
    const { consumePendingMessage, pendingMessage } = useChatCommands()
    pendingMessage.value = null
    expect(consumePendingMessage()).toBeNull()
  })
})

afterAll(() => mockCreateProductVariantFrame.mockRestore())
