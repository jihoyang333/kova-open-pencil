// MeasurementSide mirrors core's union (not re-exported from the package index).
type MeasurementSide = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT'

export interface Bbox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Derive the start/end anchor sides for a node→node measurement (audit H2).
 *
 * The engine's addMeasurement enforces a same-axis pair (both LEFT/RIGHT or both
 * TOP/BOTTOM — Figma's Measurement constraint). We pick the axis from the dominant
 * separation between the two node centres, then face each anchor toward the other,
 * so the produced pair always satisfies the constraint.
 */
export function measurementSides(a: Bbox, b: Bbox): { startSide: MeasurementSide; endSide: MeasurementSide } {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2)
  const dy = b.y + b.height / 2 - (a.y + a.height / 2)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { startSide: 'RIGHT', endSide: 'LEFT' } : { startSide: 'LEFT', endSide: 'RIGHT' }
  }
  return dy >= 0 ? { startSide: 'BOTTOM', endSide: 'TOP' } : { startSide: 'TOP', endSide: 'BOTTOM' }
}
