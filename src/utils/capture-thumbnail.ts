import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const THUMBNAIL_WIDTH = 400
const THUMBNAIL_HEIGHT = 300

function resizeBlob(blob: Blob, width: number, height: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(null)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((resized) => resolve(resized), 'image/png')
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

export async function captureThumbnail(canvasId: string): Promise<void> {
  try {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) return

    const canvasEl = document.querySelector<HTMLCanvasElement>(
      '[data-test-id="editor-canvas"] canvas, canvas.skia',
    )
    if (!canvasEl) return

    const blob = await canvasToBlob(canvasEl)
    if (!blob) return

    const resized = await resizeBlob(blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
    if (!resized) return

    const path = `${userId}/${canvasId}.png`
    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(path, resized, { upsert: true, contentType: 'image/png' })

    if (uploadError) {
      console.warn('Thumbnail upload failed:', uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path)

    await supabase
      .from('canvases')
      .update({ thumbnail_url: urlData.publicUrl })
      .eq('id', canvasId)
  } catch (err) {
    console.warn('Thumbnail capture failed:', err)
  }
}
