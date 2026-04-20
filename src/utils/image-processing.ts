export interface ProcessedImage {
  readonly blob: Blob
  readonly mimeType: string
  readonly width: number
  readonly height: number
  readonly fileSize: number
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_DIMENSION = 4096
const VISION_MAX_DIMENSION = 1500
const VISION_JPEG_QUALITY = 0.85
const VISION_MAX_SIZE = 1 * 1024 * 1024 // 1MB
const VISION_LOWER_JPEG_QUALITY = 0.6

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function scaleDown(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) return { width, height }
  const ratio = Math.min(maxDim / width, maxDim / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  }
}

function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: mimeType, quality })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      mimeType,
      quality
    )
  })
}

function drawToCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context from OffscreenCanvas')
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
    return canvas
  }
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2D context from canvas')
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  return canvas
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  const img = await loadImage(file)
  const { width, height } = scaleDown(img.naturalWidth, img.naturalHeight, MAX_DIMENSION)
  const needsResize = width !== img.naturalWidth || height !== img.naturalHeight

  if (!needsResize) {
    return {
      blob: file,
      mimeType: file.type,
      width: img.naturalWidth,
      height: img.naturalHeight,
      fileSize: file.size
    }
  }

  const canvas = drawToCanvas(img, width, height)
  const blob = await canvasToBlob(canvas, file.type)

  return {
    blob,
    mimeType: file.type,
    width,
    height,
    fileSize: blob.size
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('FileReader produced non-string result'))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob as data URL'))
    reader.readAsDataURL(blob)
  })
}

export async function createVisionCopy(file: File): Promise<ProcessedImage> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  const img = await loadImage(file)
  const { width, height } = scaleDown(img.naturalWidth, img.naturalHeight, VISION_MAX_DIMENSION)

  const canvas = drawToCanvas(img, width, height)
  const blob = await canvasToBlob(canvas, 'image/jpeg', VISION_JPEG_QUALITY)

  if (blob.size > VISION_MAX_SIZE) {
    const lowerBlob = await canvasToBlob(canvas, 'image/jpeg', VISION_LOWER_JPEG_QUALITY)
    return {
      blob: lowerBlob,
      mimeType: 'image/jpeg',
      width,
      height,
      fileSize: lowerBlob.size
    }
  }

  return {
    blob,
    mimeType: 'image/jpeg',
    width,
    height,
    fileSize: blob.size
  }
}
