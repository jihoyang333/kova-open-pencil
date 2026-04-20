import type { InferOutput } from 'valibot'
import type { ProductVariantBindingSchema } from './schema'

type Binding = InferOutput<typeof ProductVariantBindingSchema>
interface Variant { inventory_qty: number; available: boolean }

export type BindingStatus = 'ok' | 'oos' | 'unavailable'

export function bindingStatus(_binding: Binding, variant: Variant | undefined): BindingStatus {
  if (!variant) return 'unavailable'
  if (variant.inventory_qty <= 0 || !variant.available) return 'oos'
  return 'ok'
}
