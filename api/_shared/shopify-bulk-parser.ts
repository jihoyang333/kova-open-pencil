interface ParsedRow { table: string; record: Record<string, unknown>; lineNum: number }

export async function* parseBulkJsonl(
  source: string | ReadableStream<Uint8Array>,
  skip = 0,
): AsyncGenerator<ParsedRow> {
  const reader = typeof source === 'string' ? null : source.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let lineCounter = 0

  async function* lines(): AsyncGenerator<string> {
    if (typeof source === 'string') {
      for (const l of source.split('\n')) if (l.trim()) yield l
      return
    }
    while (reader) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim()
        buf = buf.slice(idx + 1)
        if (line) yield line
      }
    }
    if (buf.trim()) yield buf.trim()
  }

  const nodeType = new Map<string, string>()

  for await (const line of lines()) {
    lineCounter++
    if (lineCounter <= skip) continue

    let node: Record<string, unknown> & { id?: string; __parentId?: string }
    try {
      node = JSON.parse(line) as Record<string, unknown> & { id?: string; __parentId?: string }
    } catch {
      console.warn(`[bulk-parser] skipping malformed JSONL at line ${lineCounter}`)
      continue
    }

    const id = String(node.id ?? '')
    const gidType = id.match(/gid:\/\/shopify\/([A-Za-z]+)\//)?.[1] ?? ''
    const parentId = node.__parentId as string | undefined
    const parentType = parentId ? nodeType.get(parentId) ?? parentId.match(/gid:\/\/shopify\/([A-Za-z]+)\//)?.[1] ?? '' : ''
    if (id && gidType && !parentId) nodeType.set(id, gidType)

    if (gidType === 'Product' && !parentId) {
      yield { table: 'shopify_products', record: {
        shopify_product_id: id, handle: node.handle, title: node.title,
        description_html: node.descriptionHtml, product_type: node.productType,
        vendor: node.vendor, tags: node.tags, status: (node.status as string | undefined)?.toLowerCase(),
        published_at: node.publishedAt,
      }, lineNum: lineCounter }
    } else if (gidType === 'ProductVariant' && parentType === 'Product') {
      yield { table: 'shopify_variants', record: {
        shopify_variant_id: id, _parent_shopify_product_id: parentId,
        sku: node.sku, title: node.title, price: node.price,
        compare_at_price: node.compareAtPrice, inventory_qty: node.inventoryQuantity,
        available: node.availableForSale, option_values: node.selectedOptions,
      }, lineNum: lineCounter }
    } else if (gidType === 'MediaImage') {
      const img = (node.image ?? {}) as { url?: string; altText?: string; width?: number; height?: number }
      yield { table: 'shopify_media', record: {
        shopify_media_id: id, _parent_id: parentId, _parent_type: parentType.toLowerCase(),
        url: img.url, alt: img.altText, width: img.width, height: img.height,
      }, lineNum: lineCounter }
    } else if (gidType === 'Metafield') {
      yield { table: 'shopify_metafields', record: {
        _parent_id: parentId, owner_type: String(node.ownerType ?? '').toLowerCase(),
        namespace: node.namespace, key: node.key, value: node.value, type: node.type,
      }, lineNum: lineCounter }
    } else if (gidType === 'Collection' && !parentId) {
      yield { table: 'shopify_collections', record: {
        shopify_collection_id: id, handle: node.handle, title: node.title,
        description_html: node.descriptionHtml, collection_type: node.ruleSet ? 'smart' : 'manual',
        rules: node.ruleSet, image_url: (node.image as { url?: string } | null)?.url,
        products_count: node.productsCount, updated_at: node.updatedAt,
      }, lineNum: lineCounter }
    } else if (gidType === 'Product' && parentType === 'Collection') {
      yield { table: 'shopify_collection_products', record: {
        _parent_collection_shopify_id: parentId, _product_shopify_id: id,
      }, lineNum: lineCounter }
    }
  }
}
