import type { Fill, GradientStop, GradientTransform } from '@open-pencil/core'
import { GRADIENT_MODES, type GradientMode } from '@/constants/overlays'

/**
 * Fill mode ⇆ Fill.type mapping for the inspector PaintEditor (audit H1).
 *
 * PaintEditor emits a lowercase `mode` (solid | linear | radial | angular | diamond |
 * image) but never sets `Fill.type`. The section that hosts it owns the conversion:
 * `convertFillType` builds a valid Fill of the target type, carrying compatible
 * fields and filling in the type-specific defaults (gradient stops/transform, image
 * scale mode/transform) so switching modes never produces a malformed fill.
 */
export type FillMode = 'solid' | GradientMode | 'image'

const MODE_TO_TYPE: Record<FillMode, Fill['type']> = {
  solid: 'SOLID',
  linear: 'GRADIENT_LINEAR',
  radial: 'GRADIENT_RADIAL',
  angular: 'GRADIENT_ANGULAR',
  diamond: 'GRADIENT_DIAMOND',
  image: 'IMAGE'
}

// Mirrors FillPicker.vue's transforms so the two editors stay visually identical.
const DEFAULT_GRADIENT_TRANSFORMS: Record<string, GradientTransform> = {
  GRADIENT_LINEAR: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 },
  GRADIENT_RADIAL: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
  GRADIENT_ANGULAR: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
  GRADIENT_DIAMOND: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 }
}

const IDENTITY: GradientTransform = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }

export function modeOfFill(fill: Fill): FillMode {
  if (fill.type === 'IMAGE') return 'image'
  if (fill.type === 'GRADIENT_LINEAR') return 'linear'
  if (fill.type === 'GRADIENT_RADIAL') return 'radial'
  if (fill.type === 'GRADIENT_ANGULAR') return 'angular'
  if (fill.type === 'GRADIENT_DIAMOND') return 'diamond'
  return 'solid'
}

export function isGradientMode(mode: FillMode): mode is GradientMode {
  return GRADIENT_MODES.includes(mode as GradientMode)
}

/** Build a valid Fill of the type matching `mode`, carrying compatible fields. */
export function convertFillType(fill: Fill, mode: FillMode): Fill {
  const type = MODE_TO_TYPE[mode]
  if (type === fill.type) return fill

  const base = { color: { ...fill.color }, opacity: fill.opacity, visible: fill.visible }

  if (type === 'SOLID') return { ...base, type: 'SOLID' }

  if (type === 'IMAGE') {
    return {
      ...base,
      type: 'IMAGE',
      imageScaleMode: fill.imageScaleMode ?? 'FILL',
      imageTransform: fill.imageTransform ?? IDENTITY,
      imageHash: fill.imageHash
    }
  }

  // Gradient: keep existing stops/transform if already a gradient, else seed defaults.
  const stops: GradientStop[] = fill.gradientStops ?? [
    { position: 0, color: { ...fill.color } },
    { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }
  ]
  return {
    ...base,
    type,
    gradientStops: stops,
    gradientTransform: fill.gradientTransform ?? DEFAULT_GRADIENT_TRANSFORMS[type]
  }
}
