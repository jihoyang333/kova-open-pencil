import { describe, expect, it } from 'bun:test'
import { measurementSides } from '@/composables/measurement-geometry'

describe('measurementSides', () => {
  it('uses LEFT/RIGHT when nodes are side-by-side (b to the right of a)', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 300, y: 0, width: 100, height: 100 }
    expect(measurementSides(a, b)).toEqual({ startSide: 'RIGHT', endSide: 'LEFT' })
  })

  it('flips to LEFT-from-a / RIGHT-to-b when b is to the left', () => {
    const a = { x: 300, y: 0, width: 100, height: 100 }
    const b = { x: 0, y: 0, width: 100, height: 100 }
    expect(measurementSides(a, b)).toEqual({ startSide: 'LEFT', endSide: 'RIGHT' })
  })

  it('uses TOP/BOTTOM when nodes are stacked (b below a)', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 0, y: 300, width: 100, height: 100 }
    expect(measurementSides(a, b)).toEqual({ startSide: 'BOTTOM', endSide: 'TOP' })
  })

  it('uses TOP/BOTTOM when b is above a', () => {
    const a = { x: 0, y: 300, width: 100, height: 100 }
    const b = { x: 0, y: 0, width: 100, height: 100 }
    expect(measurementSides(a, b)).toEqual({ startSide: 'TOP', endSide: 'BOTTOM' })
  })

  it('always returns a same-axis pair (engine constraint)', () => {
    const a = { x: 0, y: 0, width: 50, height: 50 }
    const b = { x: 120, y: 80, width: 50, height: 50 }
    const { startSide, endSide } = measurementSides(a, b)
    const horizontal = (s: string) => s === 'LEFT' || s === 'RIGHT'
    expect(horizontal(startSide)).toBe(horizontal(endSide))
  })
})
