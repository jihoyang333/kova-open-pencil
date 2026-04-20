import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { BrandMemory, BrandMemorySource } from '@/types/kova/brand-memory'

export const useBrandMemoriesStore = defineStore('brand-memories', () => {
  const authStore = useAuthStore()

  async function fetchMemories(brandId: string): Promise<BrandMemory[]> {
    const userId = authStore.user?.id
    if (!userId) return []

    const { data, error } = await supabase
      .from('brand_memories')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as BrandMemory[]
  }

  async function saveMemory(
    brandId: string,
    content: string,
    source: BrandMemorySource
  ): Promise<BrandMemory> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('brand_memories')
      .insert({ brand_id: brandId, user_id: userId, content, source })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to save memory')
    return data as BrandMemory
  }

  async function deleteMemory(memoryId: string): Promise<void> {
    const { error } = await supabase.from('brand_memories').delete().eq('id', memoryId)

    if (error) throw new Error(error.message)
  }

  async function updateMemory(memoryId: string, content: string): Promise<void> {
    const { error } = await supabase.from('brand_memories').update({ content }).eq('id', memoryId)

    if (error) throw new Error(error.message)
  }

  return { fetchMemories, saveMemory, deleteMemory, updateMemory }
})
