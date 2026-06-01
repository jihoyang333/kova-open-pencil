import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { Canvas } from '@/types/kova/database'

export const useCanvasesStore = defineStore('canvases', () => {
  const canvases = ref<Canvas[]>([])
  const trashedCanvases = ref<Canvas[]>([])
  const isLoading = ref(false)
  const canvasToTrash = ref<Canvas | null>(null)

  const sortedCanvases = computed(() =>
    [...canvases.value].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  )

  const sortedTrashed = computed(() =>
    [...trashedCanvases.value].sort(
      (a, b) => new Date(b.trashed_at ?? 0).getTime() - new Date(a.trashed_at ?? 0).getTime()
    )
  )

  async function fetchCanvases(brandId: string): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('brand_id', brandId)
        .is('trashed_at', null)

      if (error) throw error
      canvases.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  async function createCanvas(brandId: string, name?: string): Promise<Canvas> {
    const row: { brand_id: string; name?: string } = { brand_id: brandId }
    if (name) row.name = name

    const { data, error } = await supabase.from('canvases').insert(row).select().single()

    if (error) throw error
    canvases.value = [...canvases.value, data]
    return data
  }

  async function renameCanvas(id: string, name: string): Promise<void> {
    const { data, error } = await supabase
      .from('canvases')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    canvases.value = canvases.value.map((c) => (c.id === id ? data : c))
  }

  async function duplicateCanvas(id: string): Promise<Canvas> {
    const original = canvases.value.find((c) => c.id === id)
    if (!original) throw new Error(`Canvas ${id} not found`)

    const { data, error } = await supabase
      .from('canvases')
      .insert({ brand_id: original.brand_id, name: `${original.name} (Copy)` })
      .select()
      .single()

    if (error) throw error
    canvases.value = [...canvases.value, data]
    return data
  }

  async function moveToTrash(id: string): Promise<void> {
    const { data, error } = await supabase
      .from('canvases')
      .update({ trashed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    canvases.value = canvases.value.filter((c) => c.id !== id)
    trashedCanvases.value = [...trashedCanvases.value, data]
  }

  async function restoreCanvas(id: string): Promise<void> {
    const { error } = await supabase
      .from('canvases')
      .update({ trashed_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    // Only remove from trashed list — don't add to canvases since it's brand-scoped.
    // The next fetchCanvases(brandId) call will pick it up in the correct brand's grid.
    trashedCanvases.value = trashedCanvases.value.filter((c) => c.id !== id)
  }

  async function permanentlyDelete(id: string): Promise<void> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    await supabase.storage.from('thumbnails').remove([`${userId}/${id}.png`])

    const { error } = await supabase.from('canvases').delete().eq('id', id)
    if (error) throw error

    trashedCanvases.value = trashedCanvases.value.filter((c) => c.id !== id)
  }

  function confirmMoveToTrash(canvas: Canvas): void {
    canvasToTrash.value = canvas
  }

  function cancelMoveToTrash(): void {
    canvasToTrash.value = null
  }

  async function executeMoveToTrash(): Promise<void> {
    if (!canvasToTrash.value) return
    await moveToTrash(canvasToTrash.value.id)
    canvasToTrash.value = null
  }

  async function fetchTrashed(): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .not('trashed_at', 'is', null)

      if (error) throw error
      trashedCanvases.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Cluster 02 contract — used by the /canvas/:canvasId route guard (Cluster 06
   * Task 17) to confirm the active user may open this canvas. RLS already scopes
   * `canvases` to brands the user owns, so a foreign canvas returns no row.
   * A trashed canvas is not openable in the editor (restore from Trash first).
   */
  async function verifyOwnership(canvasId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('canvases')
      .select('id, trashed_at')
      .eq('id', canvasId)
      .maybeSingle()
    if (error || !data) return false
    return data.trashed_at == null
  }

  return {
    canvases,
    trashedCanvases,
    isLoading,
    canvasToTrash,
    sortedCanvases,
    sortedTrashed,
    verifyOwnership,
    fetchCanvases,
    createCanvas,
    renameCanvas,
    duplicateCanvas,
    moveToTrash,
    restoreCanvas,
    permanentlyDelete,
    fetchTrashed,
    confirmMoveToTrash,
    cancelMoveToTrash,
    executeMoveToTrash
  }
})
