import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/composables/use-toast'
import { MEDIA_ACCEPTED_TYPES, MEDIA_MAX_SIZE_BYTES } from '@/types/kova/media'
import type { MediaAsset, MediaAcceptedType } from '@/types/kova/media'
import { processImage } from '@/utils/image-processing'
import { sanitizeFilename } from '@/utils/sanitize-filename'

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
      const msg = e instanceof Error ? e.message : 'Failed to load media'
      toast.show(msg, 'error')
    } finally {
      isLoading.value = false
    }
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

    const processed = await processImage(file)

    const { error: uploadError } = await supabase.storage
      .from('media-assets')
      .upload(storagePath, processed.blob)
    if (uploadError) throw uploadError

    const { data, error: insertError } = await supabase
      .from('media')
      .insert({
        user_id: userId,
        brand_id: brandId,
        file_name: file.name,
        file_type: processed.mimeType,
        file_size: processed.fileSize,
        width: processed.width,
        height: processed.height,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (insertError) throw insertError

    images.value = [data, ...images.value]
    return data as MediaAsset
  }

  const EXTENSION_TO_MIME: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  }

  function inferMimeFromUrl(url: string): string | undefined {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase()
    return ext ? EXTENSION_TO_MIME[ext] : undefined
  }

  async function uploadImageFromUrl(brandId: string, url: string): Promise<MediaAsset> {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      throw new Error('Invalid URL: must start with http:// or https://')
    }

    let response: Response
    try {
      response = await fetch(url)
    } catch {
      throw new Error('Cannot fetch image — the server may block cross-origin requests')
    }
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)

    const blob = await response.blob()
    const mimeType = blob.type || inferMimeFromUrl(url) || 'image/jpeg'
    const pathname = new URL(url).pathname
    const rawName = pathname.split('/').pop() ?? 'image'
    const filename = rawName.replace(/\?.*$/, '')
    const file = new File([blob], filename, { type: mimeType })
    return uploadImage(brandId, file)
  }

  async function renameImage(asset: MediaAsset, newName: string): Promise<void> {
    const trimmed = newName.trim()
    if (!trimmed) throw new Error('Name cannot be empty')

    const { error } = await supabase
      .from('media')
      .update({ file_name: trimmed })
      .eq('id', asset.id)
    if (error) throw error

    images.value = images.value.map((img) =>
      img.id === asset.id ? { ...img, file_name: trimmed } : img
    )
  }

  async function deleteImage(asset: MediaAsset): Promise<void> {
    const { error: dbError } = await supabase
      .from('media')
      .delete()
      .eq('id', asset.id)
    if (dbError) throw dbError

    images.value = images.value.filter((img) => img.id !== asset.id)

    const { error: storageError } = await supabase.storage
      .from('media-assets')
      .remove([asset.storage_path])
    if (storageError) {
      console.warn('Storage cleanup failed (orphaned file):', asset.storage_path)
    }
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
    renameImage,
    deleteImage,
    getPublicUrl,
  }
})
