import { describe, test, expect, beforeAll } from 'bun:test'

// Mock URL.createObjectURL / revokeObjectURL — not available in happy-dom
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock'
  globalThis.URL.revokeObjectURL = () => {}
}

// Mock HTMLImageElement if not available — or override to make src setter trigger onload
// We track which mock is created so we can control naturalWidth/naturalHeight per test
let mockImageWidth = 800
let mockImageHeight = 600
let mockImageShouldError = false

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = mockImageWidth
  naturalHeight = mockImageHeight
  set src(_url: string) {
    // Defer to allow assignment of onload before it fires
    setTimeout(() => {
      this.naturalWidth = mockImageWidth
      this.naturalHeight = mockImageHeight
      if (mockImageShouldError) {
        this.onerror?.()
      } else {
        this.onload?.()
      }
    }, 0)
  }
}

// Override global Image (happy-dom may not support it or may not trigger onload for blob URLs)
;(globalThis as Record<string, unknown>).Image = MockImage

// Mock OffscreenCanvas — not available in happy-dom
let mockConvertToBlobCallCount = 0
let mockConvertToBlobLargeBlobSize = false

class MockOffscreenCanvas {
  width: number
  height: number
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }
  getContext(_type: string) {
    return {
      drawImage: () => {},
    }
  }
  convertToBlob({ type }: { type: string; quality?: number }): Promise<Blob> {
    // If mockConvertToBlobLargeBlobSize is true, return a large blob (1.5MB) on first call,
    // then a small blob (500KB) on second call
    if (mockConvertToBlobLargeBlobSize) {
      mockConvertToBlobCallCount++
      if (mockConvertToBlobCallCount === 1) {
        // First call: return a blob > 1MB
        return Promise.resolve(new Blob([new Uint8Array(1.5 * 1024 * 1024)], { type }))
      }
      // Second call: return a smaller blob
      return Promise.resolve(new Blob([new Uint8Array(500 * 1024)], { type }))
    }
    // Default behavior: return small blob
    return Promise.resolve(new Blob([new Uint8Array(1000)], { type }))
  }
}

;(globalThis as Record<string, unknown>).OffscreenCanvas = MockOffscreenCanvas

describe('processImage', () => {
  test('rejects files over 10MB', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    })
    await expect(processImage(bigFile)).rejects.toThrow('File too large')
  })

  test('preserves JPEG format', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await processImage(file)
    expect(result.mimeType).toBe('image/jpeg')
  })

  test('preserves PNG format', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'logo.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(result.mimeType).toBe('image/png')
  })

  test('extracts width and height metadata', async () => {
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'img.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(typeof result.width).toBe('number')
    expect(typeof result.height).toBe('number')
  })

  test('returns original blob when image is within max dimension', async () => {
    // mockImageWidth=800, mockImageHeight=600 — both under 4096
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'small.png', { type: 'image/png' })
    const result = await processImage(file)
    // No resize needed, blob should be the original file
    expect(result.blob).toBe(file)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
  })

  test('resizes image that exceeds max dimension', async () => {
    mockImageWidth = 5000
    mockImageHeight = 3000
    const { processImage } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'large.png', { type: 'image/png' })
    const result = await processImage(file)
    // Should be scaled down to fit within 4096
    expect(result.width).toBeLessThanOrEqual(4096)
    expect(result.height).toBeLessThanOrEqual(4096)
    // Reset
    mockImageWidth = 800
    mockImageHeight = 600
  })
})

describe('createVisionCopy', () => {
  test('rejects files over 10MB', async () => {
    const { createVisionCopy } = await import('@/utils/image-processing')
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    })
    await expect(createVisionCopy(bigFile)).rejects.toThrow('File too large')
  })

  test('outputs JPEG regardless of input format', async () => {
    const { createVisionCopy } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'logo.png', { type: 'image/png' })
    const result = await createVisionCopy(file)
    expect(result.mimeType).toBe('image/jpeg')
  })

  test('scales down image to fit within 1500px', async () => {
    mockImageWidth = 3000
    mockImageHeight = 2000
    const { createVisionCopy } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'big.png', { type: 'image/png' })
    const result = await createVisionCopy(file)
    expect(result.width).toBeLessThanOrEqual(1500)
    expect(result.height).toBeLessThanOrEqual(1500)
    // Reset
    mockImageWidth = 800
    mockImageHeight = 600
  })

  test('returns ProcessedImage with blob, mimeType, width, height, fileSize', async () => {
    const { createVisionCopy } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await createVisionCopy(file)
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.mimeType).toBe('image/jpeg')
    expect(typeof result.width).toBe('number')
    expect(typeof result.height).toBe('number')
    expect(typeof result.fileSize).toBe('number')
  })

  test('re-encodes at lower quality when initial JPEG exceeds 1MB', async () => {
    // Configure mock to return a large blob (1.5MB) on first convertToBlob call,
    // then a smaller blob (500KB) on the second call
    mockConvertToBlobLargeBlobSize = true
    mockConvertToBlobCallCount = 0

    const { createVisionCopy } = await import('@/utils/image-processing')
    const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await createVisionCopy(file)

    // Should return the re-encoded (second) blob which is smaller
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.size).toBe(500 * 1024)
    expect(result.mimeType).toBe('image/jpeg')
    expect(typeof result.width).toBe('number')
    expect(typeof result.height).toBe('number')

    // Reset
    mockConvertToBlobLargeBlobSize = false
    mockConvertToBlobCallCount = 0
  })
})
