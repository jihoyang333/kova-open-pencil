import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { Brand } from '@/types/kova/database'

export const useBrandsStore = defineStore('brands', () => {
  const brands = ref<Brand[]>([])
  const isLoading = ref(false)
  const selectedBrandId = ref<string | null>(null)

  const sortedBrands = computed(() =>
    [...brands.value].sort((a, b) => a.name.localeCompare(b.name))
  )

  const selectedBrand = computed(() =>
    brands.value.find((b) => b.id === selectedBrandId.value) ?? null
  )

  function selectBrand(id: string): void {
    selectedBrandId.value = id
  }

  async function fetchBrands(): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase.from('brands').select('*')
      if (error) throw error
      brands.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  async function createBrand(name: string): Promise<Brand> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('brands')
      .insert({ user_id: userId, name })
      .select()
      .single()

    if (error) throw error
    brands.value = [...brands.value, data]
    return data
  }

  async function updateBrand(
    id: string,
    updates: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    brands.value = brands.value.map((b) => (b.id === id ? data : b))
  }

  async function deleteBrand(id: string): Promise<void> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    // Delete thumbnails for all canvases under this brand
    const { data: canvasRows } = await supabase
      .from('canvases')
      .select('id')
      .eq('brand_id', id)

    if (canvasRows && canvasRows.length > 0) {
      const paths = canvasRows.map((c) => `${userId}/${c.id}.png`)
      await supabase.storage.from('thumbnails').remove(paths)
    }

    // Delete brand (cascades to canvases via FK)
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) throw error

    brands.value = brands.value.filter((b) => b.id !== id)
    if (selectedBrandId.value === id) {
      selectedBrandId.value = null
    }
  }

  return {
    brands,
    isLoading,
    selectedBrandId,
    sortedBrands,
    selectedBrand,
    selectBrand,
    fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand,
  }
})
