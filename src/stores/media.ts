import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/use-toast'
import { MEDIA_ACCEPTED_TYPES, MEDIA_MAX_SIZE_BYTES } from '@/types/kova/media'
import type { MediaAsset, MediaAcceptedType } from '@/types/kova/media'

export const useMediaStore = defineStore('media', () => {
  const images = ref<MediaAsset[]>([])
  const isLoading = ref(false)

  async function fetchImages(brandId: string): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      if (error) throw error
      images.value = data ?? []
    } catch (e) {
      toast.show('Failed to load media', 'error')
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  async function uploadImage(brandId: string, file: File): Promise<MediaAsset> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    if (!MEDIA_ACCEPTED_TYPES.includes(file.type as MediaAcceptedType)) {
      throw new Error('File type not accepted')
    }
    if (file.size > MEDIA_MAX_SIZE_BYTES) {
      throw new Error('File too large (max 5 MB)')
    }

    const storagePath = `${userId}/${brandId}/${Date.now()}-${sanitizeFilename(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from('media-assets')
      .upload(storagePath, file)
    if (uploadError) throw uploadError

    const { data, error: insertError } = await supabase
      .from('media')
      .insert({
        user_id: userId,
        brand_id: brandId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (insertError) throw insertError

    images.value = [data, ...images.value]
    return data as MediaAsset
  }

  async function uploadImageFromUrl(brandId: string, url: string): Promise<MediaAsset> {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      throw new Error('Invalid URL: must start with http:// or https://')
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)

    const blob = await response.blob()
    const filename = url.split('/').pop() ?? 'image'
    const file = new File([blob], filename, { type: blob.type })
    return uploadImage(brandId, file)
  }

  async function deleteImage(asset: MediaAsset): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from('media-assets')
      .remove([asset.storage_path])
    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('media')
      .delete()
      .eq('id', asset.id)
    if (dbError) throw dbError

    images.value = images.value.filter((img) => img.id !== asset.id)
  }

  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from('media-assets').getPublicUrl(storagePath)
    return data.publicUrl
  }

  return {
    images,
    isLoading,
    fetchImages,
    uploadImage,
    uploadImageFromUrl,
    deleteImage,
    getPublicUrl,
  }
})
