import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type { ChatAttachment } from '@/types/kova/chat-attachment'

const BUCKET = 'chat-attachments'
const SIGNED_URL_EXPIRY = 60 * 60 * 24 // 24 hours in seconds

export const useChatAttachmentsStore = defineStore('chat-attachments', () => {
  const authStore = useAuthStore()

  async function uploadChatImage(
    brandId: string,
    file: File,
    width: number | null,
    height: number | null,
  ): Promise<ChatAttachment> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const timestamp = Date.now()
    const storagePath = `${userId}/${brandId}/${timestamp}-${file.name}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file)

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data, error } = await supabase
      .from('chat_attachments')
      .insert({
        user_id: userId,
        brand_id: brandId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        width,
        height,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (error || !data) throw new Error(`Insert failed: ${error?.message}`)

    return data as ChatAttachment
  }

  async function getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    if (error || !data?.signedUrl) throw new Error(`Signed URL failed: ${error?.message}`)

    return data.signedUrl
  }

  async function deleteChatAttachment(id: string, storagePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])

    if (storageError) {
      console.warn(`[chat-attachments] Storage delete warning: ${storageError.message}`)
    }

    const { error } = await supabase.from('chat_attachments').delete().eq('id', id)

    if (error) throw new Error(`Delete failed: ${error.message}`)
  }

  return { uploadChatImage, getSignedUrl, deleteChatAttachment }
})
