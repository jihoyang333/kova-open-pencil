// Cluster 11 Plan Task 3.1 — Toast type definitions.
//
// Six variants from the Plan + a `warning` variant retained for back-compat
// with the M1-era `toast.show(msg, 'warning')` callsites. `default` is a
// legacy alias for 'info' used by the existing composables/components.

export type ToastVariant =
  | 'success'
  | 'error'
  | 'info'
  | 'action'
  | 'progress'
  | 'ai-gen'
  | 'warning'
  | 'default'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  meta?: string
  ctaLabel?: string
  ctaHandler?: () => void
  duration?: number // ms; Infinity for sticky-by-variant
  createdAt: number
}

export type NewToast = Omit<Toast, 'id' | 'createdAt'>
