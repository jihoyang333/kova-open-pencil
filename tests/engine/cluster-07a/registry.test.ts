import { describe, test, expect } from 'bun:test'
import {
  CORE_TOOLS,
  EXTENDED_TOOLS,
  ALL_TOOLS
} from '../../../packages/core/src/tools/registry'

describe('Cluster 07a Task 6 — tools registry additions', () => {
  test('EXTENDED_TOOLS contains scale_node', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'scale_node')).toBe(true)
  })

  test('EXTENDED_TOOLS contains add_measurement', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'add_measurement')).toBe(true)
  })

  test('EXTENDED_TOOLS contains arrow_stub', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'arrow_stub')).toBe(true)
  })

  test('EXTENDED_TOOLS does NOT contain legacy create_measurement', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'create_measurement')).toBe(false)
  })

  test('CORE_TOOLS does NOT contain new tools (token-bloat avoidance)', () => {
    expect(CORE_TOOLS.some((t) => t.name === 'scale_node')).toBe(false)
    expect(CORE_TOOLS.some((t) => t.name === 'add_measurement')).toBe(false)
    expect(CORE_TOOLS.some((t) => t.name === 'arrow_stub')).toBe(false)
  })

  test('ALL_TOOLS is union of CORE_TOOLS and EXTENDED_TOOLS', () => {
    expect(ALL_TOOLS.length).toBe(CORE_TOOLS.length + EXTENDED_TOOLS.length)
  })
})
