import { describe, test, expect, beforeEach } from 'bun:test'
import { processImage, createVisionCopy } from '@/utils/image-processing'

// Canvas/Image mocks are provided by tests/setup-dom.ts preload.
// Control mock behavior via globalThis._canvasMock.
const canvasMock = (globalThis as Record<string, unknown>)._canvasMock as {
  imageWidth: number
  imageHeight: number
  imageShouldError: boolean
  convertToBlobLargeSize: boolean
  convertToBlobCallCount: number
}

describe('processImage', () => {
  beforeEach(() => {
    canvasMock.imageWidth = 800
    canvasMock.imageHeight = 600
    canvasMock.imageShouldError = false
    canvasMock.convertToBlobLargeSize = false
    canvasMock.convertToBlobCallCount = 0
  })

  test('rejects files over 10MB', async () => {
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    })
    await expect(processImage(bigFile)).rejects.toThrow('File too large')
  })

  test('preserves JPEG format', async () => {
    const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await processImage(file)
    expect(result.mimeType).toBe('image/jpeg')
  })

  test('preserves PNG format', async () => {
    const file = new File([new Uint8Array(100)], 'logo.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(result.mimeType).toBe('image/png')
  })

  test('extracts width and height metadata', async () => {
    const file = new File([new Uint8Array(100)], 'img.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(typeof result.width).toBe('number')
    expect(typeof result.height).toBe('number')
  })

  test('returns original blob when image is within max dimension', async () => {
    const file = new File([new Uint8Array(100)], 'small.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(result.blob).toBe(file)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
  })

  test('resizes image that exceeds max dimension', async () => {
    canvasMock.imageWidth = 5000
    canvasMock.imageHeight = 3000
    const file = new File([new Uint8Array(100)], 'large.png', { type: 'image/png' })
    const result = await processImage(file)
    expect(result.width).toBeLessThanOrEqual(4096)
    expect(result.height).toBeLessThanOrEqual(4096)
  })
})

describe('createVisionCopy', () => {
  beforeEach(() => {
    canvasMock.imageWidth = 800
    canvasMock.imageHeight = 600
    canvasMock.imageShouldError = false
    canvasMock.convertToBlobLargeSize = false
    canvasMock.convertToBlobCallCount = 0
  })

  test('rejects files over 10MB', async () => {
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    })
    await expect(createVisionCopy(bigFile)).rejects.toThrow('File too large')
  })

  test('outputs JPEG regardless of input format', async () => {
    const file = new File([new Uint8Array(100)], 'logo.png', { type: 'image/png' })
    const result = await createVisionCopy(file)
    expect(result.mimeType).toBe('image/jpeg')
  })

  test('scales down image to fit within 1500px', async () => {
    canvasMock.imageWidth = 3000
    canvasMock.imageHeight = 2000
    const file = new File([new Uint8Array(100)], 'big.png', { type: 'image/png' })
    const result = await createVisionCopy(file)
    expect(result.width).toBeLessThanOrEqual(1500)
    expect(result.height).toBeLessThanOrEqual(1500)
  })

  test('returns ProcessedImage with all fields', async () => {
    const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await createVisionCopy(file)
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.mimeType).toBe('image/jpeg')
    expect(typeof result.width).toBe('number')
    expect(typeof result.height).toBe('number')
    expect(typeof result.fileSize).toBe('number')
  })

  test('re-encodes at lower quality when initial JPEG exceeds 1MB', async () => {
    canvasMock.convertToBlobLargeSize = true
    canvasMock.convertToBlobCallCount = 0

    const file = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await createVisionCopy(file)

    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.size).toBe(500 * 1024)
    expect(result.mimeType).toBe('image/jpeg')
    expect(typeof result.width).toBe('number')
    expect(typeof result.height).toBe('number')
  })
})
