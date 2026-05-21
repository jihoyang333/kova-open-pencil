import { describe, test, expect } from 'bun:test'
import { FORMAT_VERSION, KIWI_SCHEMA_VERSION } from '../../../packages/core/src/kiwi/protocol'
import { mapToFigmaType } from '../../../packages/core/src/kiwi-serialize'

describe('Cluster 07a Task 8 — FORMAT_VERSION lockstep + SLICE serialization mapping', () => {
  test('FORMAT_VERSION is at 2.0.0 after Cluster 07a', () => {
    expect(FORMAT_VERSION).toBe('2.0.0')
  })

  test('KIWI_SCHEMA_VERSION matches FORMAT_VERSION exactly (C-LOW07a.3)', () => {
    expect(KIWI_SCHEMA_VERSION).toBe(FORMAT_VERSION)
  })

  test('mapToFigmaType handles SLICE explicitly (Cluster 07a Task 1)', () => {
    expect(mapToFigmaType('SLICE')).toBe('SLICE')
  })
})
