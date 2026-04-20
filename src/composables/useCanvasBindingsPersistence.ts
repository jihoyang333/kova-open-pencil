import { supabase } from '@/lib/supabase'
import type { ProductVariantBinding } from '@/canvas-extensions/product-variant/schema'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'

type DbRow = ProductVariantBinding & { canvas_id: string }

export function useCanvasBindingsPersistence(canvasId: string, brandId: string) {
  async function loadBindings(): Promise<void> {
    const { data, error } = await supabase
      .from('canvas_product_variant_bindings')
      .select('*')
      .eq('canvas_id', canvasId)
      .eq('brand_id', brandId)

    if (error) return

    const store = useProductVariantBindingsStore()
    const bindings = (data as DbRow[]).map(
      ({ canvas_id: _canvas_id, ...rest }) => rest as ProductVariantBinding,
    )
    store.hydrate(bindings)
  }

  async function saveBindings(): Promise<void> {
    const store = useProductVariantBindingsStore()
    const rows: DbRow[] = store.dehydrate().map((b) => ({ ...b, canvas_id: canvasId }))

    const { error } = await supabase
      .from('canvas_product_variant_bindings')
      .upsert(rows, { onConflict: 'frame_id,canvas_id' })

    if (error) return
  }

  return { loadBindings, saveBindings }
}
