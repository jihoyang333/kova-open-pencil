import { formatHex } from 'culori'
import type { Vector } from '@open-pencil/core'

/**
 * Reads pixels out of the live Skia canvas for the canvas-only eyedropper
 * (PRD 07b §12.9 Q20 lock / audit C2). The renderer composites with
 * preserveDrawingBuffer enabled (see use-canvas.ts), so a 2D `drawImage` of the
 * GL/GPU canvas returns the displayed pixels regardless of backend. All readback
 * goes through one reused 1×1 2D context; the magnifier draws a small region
 * scaled up (nearest-neighbour) into a caller-owned canvas.
 */
const CANVAS_SELECTOR = '[data-test-id="canvas-element"]'

let readback: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null

function getReadback(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (readback) return readback
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  readback = { canvas, ctx }
  return readback
}

function getCanvasEl(): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR)
}

/** Map CSS client coordinates to device-pixel coordinates inside the canvas. */
function toDevice(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): Vector | null {
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const x = Math.floor((clientX - rect.left) * (canvas.width / rect.width))
  const y = Math.floor((clientY - rect.top) * (canvas.height / rect.height))
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null
  return { x, y }
}

export function useEyedropperSampler() {
  /** Hex (#rrggbb) of the pixel under the given client point, or null if off-canvas. */
  function sampleHexAt(clientX: number, clientY: number): string | null {
    const canvas = getCanvasEl()
    const rb = getReadback()
    if (!canvas || !rb) return null
    const px = toDevice(canvas, clientX, clientY)
    if (!px) return null
    rb.ctx.clearRect(0, 0, 1, 1)
    try {
      rb.ctx.drawImage(canvas, px.x, px.y, 1, 1, 0, 0, 1, 1)
    } catch {
      return null
    }
    const [r, g, b] = rb.ctx.getImageData(0, 0, 1, 1).data
    return formatHex({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })
  }

  /** Draw a `sampleSize`×`sampleSize` region centred on the cursor, scaled to fill `dest`. */
  function drawMagnifier(
    clientX: number,
    clientY: number,
    dest: HTMLCanvasElement,
    sampleSize: number
  ): void {
    const canvas = getCanvasEl()
    if (!canvas) return
    const px = toDevice(canvas, clientX, clientY)
    const ctx = dest.getContext('2d')
    if (!px || !ctx) return
    const half = Math.floor(sampleSize / 2)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, dest.width, dest.height)
    try {
      ctx.drawImage(canvas, px.x - half, px.y - half, sampleSize, sampleSize, 0, 0, dest.width, dest.height)
    } catch {
      // Off-canvas / tainted region — leave the magnifier cleared.
      if (import.meta.env.DEV) console.warn('[eyedropper] magnifier read skipped')
    }
  }

  return { sampleHexAt, drawMagnifier }
}
