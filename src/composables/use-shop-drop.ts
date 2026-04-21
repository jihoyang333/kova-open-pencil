import { ref } from 'vue'

import { createProductVariantFrame } from '@/canvas-extensions/product-variant/factory'
import { useChatCommands } from '@/composables/use-chat-commands'
import { createNode, setLayout, setText, setImage } from '@/engine/tool-calls'
import { supabase } from '@/lib/supabase'

export const SHOP_PAYLOAD_TYPE = 'shopify-variant' as const
export const SHOP_COLLECTION_TYPE = 'shopify-collection' as const
export const SHOP_DISCOUNT_TYPE = 'shopify-discount' as const

export interface ShopVariantPayload {
  type: typeof SHOP_PAYLOAD_TYPE
  variant_id: string
  title: string
  price: number
  currency: string
  image_url?: string
  brand_id: string
}

export interface ShopCollectionPayload {
  type: typeof SHOP_COLLECTION_TYPE
  collection_id: string
  title: string
  brand_id: string
}

export interface ShopDiscountPayload {
  type: typeof SHOP_DISCOUNT_TYPE
  discount_id: string
  code: string
  title: string
  value: string
  heading_font: string
  brand_id: string
}

type ShopPayload = ShopVariantPayload | ShopCollectionPayload | ShopDiscountPayload

export function serializeShopPayload(payload: ShopVariantPayload): string {
  return JSON.stringify(payload)
}

export function parseShopPayload(data: string): ShopPayload | null {
  try {
    const parsed = JSON.parse(data) as unknown
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'type' in parsed
    ) {
      const t = (parsed as { type: unknown }).type
      if (t === SHOP_PAYLOAD_TYPE || t === SHOP_COLLECTION_TYPE || t === SHOP_DISCOUNT_TYPE) {
        return parsed as ShopPayload
      }
    }
    return null
  } catch {
    return null
  }
}

const buildPromptVisible = ref(false)
const buildPromptTitle = ref('')

async function handleVariantDrop(payload: ShopVariantPayload): Promise<void> {
  await createProductVariantFrame({
    variant: {
      id: payload.variant_id,
      shopify_variant_id: payload.variant_id,
      title: payload.title,
      price: payload.price,
      inventory_qty: 0,
      image_url: payload.image_url,
    },
    brand_id: payload.brand_id,
    currency: payload.currency,
  })
  buildPromptTitle.value = payload.title
  buildPromptVisible.value = true
}

async function handleCollectionDrop(payload: ShopCollectionPayload): Promise<void> {
  const { data: rows } = await supabase
    .from('shopify_collection_products')
    .select('product:shopify_products(variants:shopify_variants(id, shopify_variant_id, title, price, currency, inventory_qty, media:shopify_media(url, position)))')
    .eq('collection_id', payload.collection_id)
    .order('position')
    .limit(6)

  interface MediaRow { url: string; position: number }
  interface VariantRow { id: string; shopify_variant_id: string; title: string; price: number; currency: string; inventory_qty: number | null; media: MediaRow[] }
  interface ProductRow { variants: VariantRow[] }
  interface CollectionProductRow { product: ProductRow | null }

  const variants = ((rows ?? []) as CollectionProductRow[])
    .flatMap((r) => r.product?.variants ?? [])
    .slice(0, 6)

  const gridId = await createNode({ type: 'FRAME', name: `Collection: ${payload.title}` })
  await setLayout(gridId, { direction: 'VERTICAL', gap: 8, padding: 12 })

  const rowCount = Math.ceil(variants.length / 3)
  for (let row = 0; row < rowCount; row++) {
    const rowId = await createNode({ type: 'FRAME', parent: gridId, name: `Row ${row + 1}` })
    await setLayout(rowId, { direction: 'HORIZONTAL', gap: 8 })

    const rowVariants = variants.slice(row * 3, row * 3 + 3)
    for (const v of rowVariants) {
      const cellId = await createNode({ type: 'FRAME', parent: rowId, name: v.title })
      await setLayout(cellId, { direction: 'VERTICAL', gap: 4, width: 160, height: 200 })

      const imgId = await createNode({ type: 'FRAME', parent: cellId, name: 'Image' })
      await setLayout(imgId, { direction: 'HORIZONTAL', width: 160, height: 160 })
      const firstMedia = [...v.media].sort((a, b) => a.position - b.position)[0]
      if (firstMedia?.url) await setImage(imgId, firstMedia.url)

      const textId = await createNode({ type: 'TEXT', parent: cellId, name: 'Title' })
      await setText(textId, v.title)
    }
  }
}

async function handleDiscountDrop(payload: ShopDiscountPayload): Promise<void> {
  const textId = await createNode({ type: 'TEXT', name: `Discount: ${payload.code}` })
  await setText(textId, `${payload.code} — ${payload.value}`)
}

export function useShopDrop() {
  const { sendToChat } = useChatCommands()

  async function handleCanvasDrop(event: DragEvent): Promise<void> {
    const raw = event.dataTransfer?.getData('application/json') ?? ''
    if (!raw) return
    const payload = parseShopPayload(raw)
    if (!payload) return

    if (payload.type === SHOP_PAYLOAD_TYPE) {
      await handleVariantDrop(payload)
    } else if (payload.type === SHOP_COLLECTION_TYPE) {
      await handleCollectionDrop(payload)
    } else if (payload.type === SHOP_DISCOUNT_TYPE) {
      await handleDiscountDrop(payload)
    }
  }

  function confirmBuildAround(): void {
    sendToChat(`Design a hero section for this product: "${buildPromptTitle.value}"`)
    buildPromptVisible.value = false
  }

  function dismissBuildPrompt(): void {
    buildPromptVisible.value = false
  }

  return {
    handleCanvasDrop,
    confirmBuildAround,
    dismissBuildPrompt,
    buildPromptVisible,
    buildPromptTitle,
  }
}
