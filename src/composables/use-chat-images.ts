import { ref } from 'vue'

import { createVisionCopy, processImage } from '@/utils/image-processing'
import { useChatAttachmentsStore } from '@/stores/chat-attachments'
import { useMediaStore } from '@/stores/media'

export interface PendingAttachment {
  readonly id: string
  readonly fileName: string
  readonly localPreviewUrl: string
  readonly source: 'media' | 'clipboard'
  readonly mediaId?: string
  readonly storageUrl?: string
  readonly width: number | null
  readonly height: number | null
  readonly visionBlob?: Blob
  readonly isUploading: boolean
}

const PREVIOUS_IMAGE_PLACEHOLDER = '[Previously attached image]'

/**
 * Strips base64 file parts from all messages except the most recent user message.
 * Replaces stripped images with a short text reference so the model still sees
 * the turn happened. Used as middleware via wrapLanguageModel() to prevent
 * resending every image on every API call.
 */
export function stripPreviousTurnImages<
  T extends { role: string; content: unknown },
>(messages: ReadonlyArray<T>): T[] {
  let lastUserIndex = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIndex = i
      break
    }
  }

  return messages.map((msg, index) => {
    if (index === lastUserIndex) return { ...msg }
    if (typeof msg.content === 'string' || !Array.isArray(msg.content)) return { ...msg }

    const newContent = (msg.content as ReadonlyArray<{ type: string }>).map((part) =>
      part.type === 'file'
        ? { type: 'text' as const, text: PREVIOUS_IMAGE_PLACEHOLDER }
        : part,
    )

    return { ...msg, content: newContent } as T
  })
}

export function useChatImages(brandId: string) {
  const attachments = ref<PendingAttachment[]>([])
  const chatAttachmentsStore = useChatAttachmentsStore()
  const mediaStore = useMediaStore()

  async function attachFromMediaLibrary(mediaAsset: {
    id: string
    file_name: string
    storage_path: string
    width: number | null
    height: number | null
  }): Promise<void> {
    const publicUrl = mediaStore.getPublicUrl(mediaAsset.storage_path)

    const response = await fetch(publicUrl)
    const blob = await response.blob()
    const file = new File([blob], mediaAsset.file_name, { type: blob.type })
    const vision = await createVisionCopy(file)

    const attachment: PendingAttachment = {
      id: crypto.randomUUID(),
      fileName: mediaAsset.file_name,
      localPreviewUrl: publicUrl,
      source: 'media',
      mediaId: mediaAsset.id,
      storageUrl: publicUrl,
      width: mediaAsset.width,
      height: mediaAsset.height,
      visionBlob: vision.blob,
      isUploading: false,
    }

    attachments.value = [...attachments.value, attachment]
  }

  async function attachFromClipboard(file: File): Promise<void> {
    const localPreviewUrl = URL.createObjectURL(file)
    const tempId = crypto.randomUUID()

    const pendingAttachment: PendingAttachment = {
      id: tempId,
      fileName: file.name,
      localPreviewUrl,
      source: 'clipboard',
      width: null,
      height: null,
      isUploading: true,
    }
    attachments.value = [...attachments.value, pendingAttachment]

    try {
      const [processed, vision] = await Promise.all([
        processImage(file),
        createVisionCopy(file),
      ])

      const uploadedFile = new File([processed.blob], file.name, {
        type: processed.mimeType,
      })
      const record = await chatAttachmentsStore.uploadChatImage(
        brandId,
        uploadedFile,
        processed.width,
        processed.height,
      )
      const signedUrl = await chatAttachmentsStore.getSignedUrl(record.storage_path)

      attachments.value = attachments.value.map((a) =>
        a.id === tempId
          ? {
              ...a,
              storageUrl: signedUrl,
              width: processed.width,
              height: processed.height,
              visionBlob: vision.blob,
              isUploading: false,
            }
          : a,
      )
    } catch (e) {
      attachments.value = attachments.value.filter((a) => a.id !== tempId)
      URL.revokeObjectURL(localPreviewUrl)
      throw e
    }
  }

  function removeAttachment(id: string): void {
    const attachment = attachments.value.find((a) => a.id === id)
    if (attachment?.source === 'clipboard') {
      URL.revokeObjectURL(attachment.localPreviewUrl)
    }
    attachments.value = attachments.value.filter((a) => a.id !== id)
  }

  function clearAttachments(): void {
    for (const a of attachments.value) {
      if (a.source === 'clipboard') URL.revokeObjectURL(a.localPreviewUrl)
    }
    attachments.value = []
  }

  return {
    attachments,
    attachFromMediaLibrary,
    attachFromClipboard,
    removeAttachment,
    clearAttachments,
  }
}
