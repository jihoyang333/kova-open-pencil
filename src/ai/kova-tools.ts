import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { makeFigmaFromStore } from '@/automation/figma-factory'
import { supabase } from '@/lib/supabase'
import { useBrandMemoriesStore } from '@/stores/brand-memories'
import { useBrandsStore } from '@/stores/brands'
import { computeAllLayouts } from '@open-pencil/core'

import type { EditorStore } from '@/stores/editor'

const SUPABASE_STORAGE_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//

const FETCH_TIMEOUT_MS = 10_000

/** Throws if `url` is not a valid Supabase Storage HTTPS URL. */
export function validateImageUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed')
  }

  if (!SUPABASE_STORAGE_PATTERN.test(url)) {
    throw new Error(`Only Supabase Storage URLs are allowed. Got: ${url}`)
  }
}

interface StoreWithBrandId extends EditorStore {
  activeBrandId?: () => string | null
}

const NO_CONNECTION = {
  error:
    'No Shopify connection for this brand. Ask the user to connect a Shopify store via Account → Integrations.',
  code: 'no_connection'
} as const

/** True when a `shopify_connections` row exists for the brand. */
async function hasShopifyConnection(brandId: string): Promise<boolean> {
  if (!brandId) return false
  const { data } = await supabase
    .from('shopify_connections')
    .select('id')
    .eq('brand_id', brandId)
    .maybeSingle()
  return !!data
}

// --- Cluster 07a engine-API surfaces (optional; absent until 07a ships) ---
// Measurement is a page-level method per PRD 07a §7.1b (NOT a NodeType).
type MeasurementSide = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT'

interface MeasurementAnchor {
  readonly nodeId: string
  readonly side: MeasurementSide
}

interface SliceCapableFigma {
  createSliceFromSelection?: (opts: { name?: string }) => { id: string } | null
}

interface MeasurementCapableFigma {
  currentPage?: {
    addMeasurement?: (
      start: MeasurementAnchor,
      end: MeasurementAnchor,
      opts?: { offsetType?: 'INNER' | 'OUTER'; offsetValue?: number; freeText?: string }
    ) => { id: string } | null
  }
}

// Raw valibot schemas exported so unit tests can use v.safeParse against them.
// AI SDK consumes them via valibotSchema() inside each tool definition below.
export const searchProductsSchema = v.object({
  query: v.string(),
  filters: v.optional(
    v.object({
      in_stock: v.optional(v.boolean()),
      on_sale: v.optional(v.boolean()),
      collection_id: v.optional(v.string())
    })
  ),
  sort: v.optional(v.picklist(['newest', 'price_asc', 'price_desc'])),
  limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50)))
})
export const getCollectionSchema = v.object({ collection_id: v.string() })
export const getVariantSchema = v.object({ variant_id: v.string() })
export const getActiveDiscountsSchema = v.object({})
export const getShopContextSchema = v.object({})

export function createKovaTools(store: StoreWithBrandId) {
  const activeBrandId = (): string =>
    store.activeBrandId?.() ?? useBrandsStore().selectedBrand?.id ?? ''

  const search_products = tool({
    description:
      'Search Shopify products for the active brand. Returns up to `limit` matches with variants.',
    inputSchema: valibotSchema(searchProductsSchema),
    execute: async (args) => {
      const brandId = activeBrandId()
      if (!(await hasShopifyConnection(brandId))) return NO_CONNECTION
      let q = supabase
        .from('shopify_products')
        .select('*, shopify_variants(*)')
        .eq('brand_id', brandId)
      if (args.query) q = q.textSearch('title', args.query)
      const { data } = await q.limit(args.limit ?? 20)
      return { products: data ?? [] }
    }
  })

  const get_collection = tool({
    description: 'Return a Shopify collection and its ordered member products.',
    inputSchema: valibotSchema(getCollectionSchema),
    execute: async ({ collection_id }) => {
      const brandId = activeBrandId()
      if (!(await hasShopifyConnection(brandId))) return NO_CONNECTION
      const { data: collection } = await supabase
        .from('shopify_collections')
        .select('*')
        .eq('brand_id', brandId)
        .eq('id', collection_id)
        .maybeSingle()
      const { data: links } = await supabase
        .from('shopify_collection_products')
        .select('product_id, position, shopify_products(*)')
        .eq('collection_id', collection_id)
        .order('position', { ascending: true })
      return {
        collection,
        products: (links ?? []).map((l: { shopify_products: unknown }) => l.shopify_products)
      }
    }
  })

  const get_variant = tool({
    description: 'Return a variant with its parent product + media.',
    inputSchema: valibotSchema(getVariantSchema),
    execute: async ({ variant_id }) => {
      const brandId = activeBrandId()
      if (!(await hasShopifyConnection(brandId))) return NO_CONNECTION
      const { data: variant } = await supabase
        .from('shopify_variants')
        .select('*, shopify_products(*), shopify_media(*)')
        .eq('brand_id', brandId)
        .eq('id', variant_id)
        .maybeSingle()
      return { variant }
    }
  })

  const get_active_discounts = tool({
    description: 'Return currently-active discount codes for the active brand.',
    inputSchema: valibotSchema(getActiveDiscountsSchema),
    execute: async () => {
      const brandId = activeBrandId()
      if (!(await hasShopifyConnection(brandId))) return NO_CONNECTION
      const nowIso = new Date().toISOString()
      const { data } = await supabase
        .from('shopify_discounts')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'active')
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      return { discounts: data ?? [] }
    }
  })

  const get_shop_context = tool({
    description:
      'Return shop-level metadata: currency, timezone, locale, product count, top 5 collections.',
    inputSchema: valibotSchema(getShopContextSchema),
    execute: async () => {
      const brandId = activeBrandId()
      if (!(await hasShopifyConnection(brandId))) return NO_CONNECTION
      const { data: conn } = await supabase
        .from('shopify_connections')
        .select('currency,timezone,primary_locale')
        .eq('brand_id', brandId)
        .maybeSingle()
      const { count: productCount } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId)
      const { data: topCollections } = await supabase
        .from('shopify_collections')
        .select('id,title,products_count')
        .eq('brand_id', brandId)
        .order('products_count', { ascending: false })
        .limit(5)
      return {
        currency: conn?.currency ?? null,
        timezone: conn?.timezone ?? null,
        locale: conn?.primary_locale ?? null,
        productCount: productCount ?? 0,
        topCollections: topCollections ?? []
      }
    }
  })

  const placeMediaImage = tool({
    description:
      'Place an image from Supabase Storage onto a canvas node. ' +
      'Fetches the image and sets it as an image fill on the target node. ' +
      'Only accepts Supabase Storage URLs.',
    inputSchema: valibotSchema(
      v.object({
        node_id: v.pipe(
          v.string(),
          v.description('The ID of the target node to place the image on')
        ),
        image_url: v.pipe(v.string(), v.description('Supabase Storage URL of the image')),
        scale_mode: v.optional(
          v.pipe(
            v.picklist(['FILL', 'FIT', 'CROP', 'TILE']),
            v.description('How to scale the image within the node')
          ),
          'FILL'
        )
      })
    ),
    execute: async ({ node_id, image_url, scale_mode }) => {
      try {
        validateImageUrl(image_url)
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Invalid URL' }
      }

      const figma = makeFigmaFromStore(store)
      const node = figma.getNodeById(node_id)
      if (!node) {
        return { error: `Node ${node_id} not found` }
      }

      let imageBytes: Uint8Array
      try {
        const response = await fetch(image_url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        })

        if (!response.ok) {
          return {
            error: `Failed to load image from ${image_url}. HTTP ${response.status}. Using a placeholder instead.`
          }
        }

        imageBytes = new Uint8Array(await response.arrayBuffer())
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        return {
          error: `Failed to load image from ${image_url}. ${message}. Using a placeholder instead.`
        }
      }

      const beforeSnapshot = store.snapshotPage()

      const image = figma.createImage(imageBytes)
      node.fills = [
        {
          type: 'IMAGE',
          color: { r: 1, g: 1, b: 1, a: 1 },
          opacity: 1,
          visible: true,
          imageHash: image.hash,
          imageScaleMode: scale_mode
        }
      ]

      const pageId = store.state.currentPageId
      computeAllLayouts(store.graph, pageId)
      store.requestRender()

      const afterSnapshot = store.snapshotPage()
      store.pushUndoEntry({
        label: 'AI: placeMediaImage',
        forward: () => store.restorePageFromSnapshot(afterSnapshot),
        inverse: () => store.restorePageFromSnapshot(beforeSnapshot)
      })

      store.renderer?.aiClearActive()
      store.aiFlashDone([node_id])

      return { success: true, node_id, scale_mode }
    }
  })

  const saveBrandMemory = tool({
    description:
      'Save a brand memory that will persist across all future chat sessions for this brand. ' +
      'Use source "auto" when you detect a durable preference or constraint from the user. ' +
      'Use source "user" when the user explicitly asks you to remember something.',
    inputSchema: valibotSchema(
      v.object({
        content: v.pipe(
          v.string(),
          v.description('The memory content to save — a single concise fact or preference')
        ),
        source: v.pipe(
          v.picklist(['auto', 'user']),
          v.description('"auto" = AI-detected preference, "user" = explicitly requested by user')
        )
      })
    ),
    execute: async ({ content, source }) => {
      // Resolve stores at execute-time so brand switching mid-session picks up
      // the current brand, and so createKovaTools(store) stays a single-arg function.
      const brandsStore = useBrandsStore()
      const brandId = brandsStore.selectedBrand?.id
      if (!brandId) return 'Failed to save memory: no brand selected'

      try {
        await useBrandMemoriesStore().saveMemory(brandId, content, source)
        return `Memory saved: "${content}"`
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        return `Failed to save memory: ${message}`
      }
    }
  })

  const createSliceFromSelection = tool({
    description:
      'Create a Slice node covering the current selection. Slices define export regions.',
    inputSchema: valibotSchema(
      v.object({
        name: v.optional(
          v.pipe(v.string(), v.description('Optional name for the slice (e.g. "hero", "footer")'))
        )
      })
    ),
    execute: async ({ name }) => {
      const figma = makeFigmaFromStore(store) as unknown as SliceCapableFigma
      if (typeof figma.createSliceFromSelection !== 'function') {
        return { error: 'Slice engine API not available', code: 'engine_unavailable' }
      }
      const slice = figma.createSliceFromSelection({ name })
      return slice
        ? { success: true, sliceId: slice.id }
        : { error: 'No selection to slice', code: 'no_selection' }
    }
  })

  const addMeasurement = tool({
    description:
      'Add a persistent Measurement annotation between two nodes on the current page. ' +
      'Page-level API per PRD 07a §7.1b (Measurement is NOT a NodeType).',
    inputSchema: valibotSchema(
      v.object({
        canvas_id: v.pipe(v.string(), v.description('Canvas (page) id the measurement lives on')),
        start_node_id: v.pipe(v.string(), v.description('Source node id')),
        start_side: v.picklist(['TOP', 'RIGHT', 'BOTTOM', 'LEFT']),
        end_node_id: v.pipe(v.string(), v.description('Target node id')),
        end_side: v.picklist(['TOP', 'RIGHT', 'BOTTOM', 'LEFT']),
        offset_type: v.optional(v.picklist(['INNER', 'OUTER'])),
        offset_value: v.optional(v.number()),
        free_text: v.optional(v.string())
      })
    ),
    execute: async ({
      start_node_id,
      start_side,
      end_node_id,
      end_side,
      offset_type,
      offset_value,
      free_text
    }) => {
      const figma = makeFigmaFromStore(store) as unknown as MeasurementCapableFigma
      const page = figma.currentPage
      if (!page || typeof page.addMeasurement !== 'function') {
        return { error: 'Measurement engine API not available', code: 'engine_unavailable' }
      }
      try {
        const m = page.addMeasurement(
          { nodeId: start_node_id, side: start_side },
          { nodeId: end_node_id, side: end_side },
          { offsetType: offset_type, offsetValue: offset_value, freeText: free_text }
        )
        return m
          ? { success: true, measurementId: m.id }
          : { error: 'Could not create measurement', code: 'invalid_anchors' }
      } catch {
        return { error: 'Could not create measurement', code: 'invalid_anchors' }
      }
    }
  })

  return {
    placeMediaImage,
    saveBrandMemory,
    search_products,
    get_collection,
    get_variant,
    get_active_discounts,
    get_shop_context,
    createSliceFromSelection,
    addMeasurement
  } as const
}
