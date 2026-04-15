import { ref } from 'vue'

import { blobToDataUrl, createVisionCopy, processImage } from '@/utils/image-processing'
import { useChatAttachmentsStore } from '@/stores/chat-attachments'
import { useMediaStore } from '@/stores/media'

import type { FileUIPart } from 'ai'

/**
 * `localPreviewUrl` invariant: for `source === 'clipboard'` it is a `URL.createObjectURL(...)`
 * blob URL that MUST be revoked via `URL.revokeObjectURL`. For `source === 'media'` it is a
 * Supabase public URL that must NOT be revoked. Keep this contract in mind if you add a new
 * source that produces blob URLs — extend the `shouldRevoke` helper below.
 */
export interface PendingAttachment {
  readonly id: string
  readonly recordId?: string
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

function shouldRevoke(attachment: Pick<PendingAttachment, 'source'>): boolean {
  return attachment.source === 'clipboard'
}

/**
 * Strips base64 file parts from all messages except the most recent user message.
 * Replaces stripped images with a short text reference so the model still sees
 * the turn happened. Used as middleware via wrapLanguageModel() to prevent
 * resending every image on every API call.
 *
 * If no user message is present in the array, returns a shallow-cloned copy unchanged
 * (no-op) — there is no "current turn" to anchor the strip against.
 */
/**
 * Hard guard: throws the first time it encounters an attachment that isn't safe to
 * send to the model. Kept as a pure helper (no Vue refs, no stores) so `buildMessagePayload`
 * can call it AND the UI layer can unit-test the exact failure messages.
 */
export function assertReadyForSend(
  attachments: readonly PendingAttachment[],
): void {
  for (const a of attachments) {
    if (a.isUploading) {
      throw new Error(`Waiting for image upload to finish: ${a.fileName}`)
    }
    if (!a.visionBlob) {
      throw new Error(`Attachment missing vision data: ${a.fileName}`)
    }
  }
}

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

  if (lastUserIndex === -1) return messages.map((msg) => ({ ...msg }))

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
              recordId: record.id,
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
    if (attachment && shouldRevoke(attachment)) {
      URL.revokeObjectURL(attachment.localPreviewUrl)
    }
    attachments.value = attachments.value.filter((a) => a.id !== id)
  }

  function clearAttachments(): void {
    for (const a of attachments.value) {
      if (shouldRevoke(a)) URL.revokeObjectURL(a.localPreviewUrl)
    }
    attachments.value = []
  }

  function hasPendingUploads(): boolean {
    return attachments.value.some((a) => a.isUploading)
  }

  /**
   * Build the message payload the AI SDK's `sendMessage` expects: the user's raw text
   * plus a `FileUIPart[]` carrying the downscaled vision copy as a `data:` URL so the
   * model can actually see the image. Media-library URLs the model needs for
   * `placeMediaImage` are surfaced via the system prompt, not injected into user text.
   *
   * Throws via `assertReadyForSend` if any attachment is still uploading or missing
   * its vision blob — callers must catch and surface a toast instead of silently dropping.
   */
  async function buildMessagePayload(
    text: string,
  ): Promise<{ text: string; files: FileUIPart[] }> {
    const current = attachments.value
    if (current.length === 0) return { text, files: [] }

    assertReadyForSend(current)

    const files: FileUIPart[] = []

    for (const a of current) {
      // visionBlob is guaranteed non-null by assertReadyForSend above.
      const dataUrl = await blobToDataUrl(a.visionBlob as Blob)
      files.push({
        type: 'file',
        mediaType: 'image/jpeg',
        filename: a.fileName,
        url: dataUrl,
      })
    }

    return { text, files }
  }

  return {
    attachments,
    attachFromMediaLibrary,
    attachFromClipboard,
    removeAttachment,
    clearAttachments,
    hasPendingUploads,
    buildMessagePayload,
  }
}
