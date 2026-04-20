import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import * as v from 'valibot'
import { ProductVariantBindingSchema } from '@/canvas-extensions/product-variant/schema'

type Binding = v.InferOutput<typeof ProductVariantBindingSchema>

export const useProductVariantBindingsStore = defineStore('product-variant-bindings', () => {
  const byFrameId = shallowReactive(new Map<string, Binding>())

  function set(binding: Binding): void {
    const parsed = v.parse(ProductVariantBindingSchema, binding)
    byFrameId.set(parsed.frame_id, parsed)
  }
  function get(frameId: string): Binding | undefined { return byFrameId.get(frameId) }
  function remove(frameId: string): void { byFrameId.delete(frameId) }
  function forCanvas(_canvasId: string): Binding[] {
    // Canvas scoping lives in persistence (3.5). In-memory registry returns all bindings for the currently-open canvas.
    return [...byFrameId.values()]
  }
  function hydrate(bindings: Binding[]): void {
    byFrameId.clear()
    for (const b of bindings) set(b)
  }
  function dehydrate(): Binding[] { return [...byFrameId.values()] }

  return { byFrameId, set, get, remove, forCanvas, hydrate, dehydrate }
})
