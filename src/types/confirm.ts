// Cluster 11 Plan Task 5.1 — confirm types.

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /**
   * User must type this exact string to enable the confirm button.
   * Used for irreversible flows (delete brand, delete account, etc).
   */
  typedConfirm?: string
}

export interface ConfirmRequest extends ConfirmOptions {
  id: string
  resolve: (value: boolean) => void
}
