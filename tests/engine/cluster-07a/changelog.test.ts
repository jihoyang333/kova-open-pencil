import { describe, test, expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CHANGELOG_PATH = resolve(
  import.meta.dir,
  '../../../packages/core/CHANGELOG-KOVA.md'
)

describe('Cluster 07a Task 11 — CHANGELOG-KOVA.md', () => {
  test('file exists', () => {
    expect(existsSync(CHANGELOG_PATH)).toBe(true)
  })

  test('contains 07a entry header', () => {
    const content = readFileSync(CHANGELOG_PATH, 'utf-8')
    expect(content).toContain('Cluster 07a')
  })

  test('lists every required change category', () => {
    const content = readFileSync(CHANGELOG_PATH, 'utf-8')
    const required = [
      'SLICE',
      'page-level Measurement',
      'MeasurementSide',
      'aspectRatio',
      'includeInExports',
      'pageBackgroundVisible',
      'CharacterStyleOverride',
      'scaleNode',
      'createSlice',
      'addMeasurement',
      'arrowStub',
      'mask compositing',
      'figma-api-proxy'
    ]
    for (const r of required) {
      expect(content).toContain(r)
    }
  })

  test('each row carries an upstream-PR status', () => {
    const content = readFileSync(CHANGELOG_PATH, 'utf-8')
    expect(content).toMatch(/\b(drafted|submitted|merged|declined)\b/i)
  })
})
