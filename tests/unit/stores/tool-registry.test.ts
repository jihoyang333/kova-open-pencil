/**
 * useToolRegistry — Cluster 06 Task 4.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useToolRegistry } from '@/stores/tool-registry'
import type { ToolDef } from '@/types/tool-registry'

function makeMove(overrides: Partial<ToolDef> = {}): ToolDef {
  return {
    id: 'move',
    slot: 'move',
    icon: 'mouse-pointer-2',
    label: 'Move',
    key: 'V',
    onActivate: () => {},
    ...overrides,
  }
}

const slice: ToolDef = {
  id: 'slice',
  slot: 'frame',
  parent: 'frame',
  icon: 'crop',
  label: 'Slice',
  key: 'S',
  onActivate: () => {},
}

const measurement: ToolDef = {
  id: 'measurement',
  slot: 'measurement',
  icon: 'ruler',
  label: 'Measurement',
  keySequence: ['Shift', 'M'],
  onActivate: () => {},
}

describe('useToolRegistry (Cluster 06 Task 4)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('register adds a tool', () => {
    const r = useToolRegistry()
    r.register(makeMove())
    expect(r.toolByKey('V')?.id).toBe('move')
  })

  test('primaryTools excludes dropdown sub-tools', () => {
    const r = useToolRegistry()
    r.register(makeMove())
    r.register(slice)
    r.register(measurement)
    const primary = r.primaryTools
    expect(primary.find((t) => t.id === 'slice')).toBeUndefined()
    expect(primary.find((t) => t.id === 'move')).toBeDefined()
    expect(primary.find((t) => t.id === 'measurement')).toBeDefined()
  })

  test('primaryTools sorted by canonical slot order', () => {
    const r = useToolRegistry()
    r.register(measurement)
    r.register(makeMove())
    const ids = r.primaryTools.map((t) => t.id)
    expect(ids).toEqual(['move', 'measurement'])
  })

  test('dropdownTools(slot) returns sub-tools', () => {
    const r = useToolRegistry()
    r.register(slice)
    const drop = r.dropdownTools('frame')
    expect(drop).toHaveLength(1)
    expect(drop[0].id).toBe('slice')
  })

  test('toolByKey matches single key without modifiers', () => {
    const r = useToolRegistry()
    r.register(makeMove())
    expect(r.toolByKey('V')?.id).toBe('move')
    expect(r.toolByKey('v')?.id).toBe('move')
    expect(r.toolByKey('V', { shift: true })).toBeUndefined()
  })

  test('toolByKey matches key sequence with modifiers', () => {
    const r = useToolRegistry()
    r.register(measurement)
    expect(r.toolByKey('M', { shift: true })?.id).toBe('measurement')
    expect(r.toolByKey('M', { shift: false })).toBeUndefined()
    expect(r.toolByKey('M', { shift: true, alt: true })).toBeUndefined()
  })

  test('when() predicate hides tool from primaryTools and is reactive', () => {
    const r = useToolRegistry()
    const visible = ref(false)
    r.register(makeMove({ id: 'cond', when: () => visible.value }))
    expect(r.primaryTools.find((t) => t.id === 'cond')).toBeUndefined()
    visible.value = true
    expect(r.primaryTools.find((t) => t.id === 'cond')).toBeDefined()
  })

  test('unregister removes tool', () => {
    const r = useToolRegistry()
    r.register(makeMove())
    r.unregister('move')
    expect(r.primaryTools).toHaveLength(0)
  })

  test('setActive calls onActivate', () => {
    const r = useToolRegistry()
    let activated = false
    r.register(makeMove({ onActivate: () => (activated = true) }))
    r.setActive('move')
    expect(activated).toBe(true)
  })

  test('setActive skips disabled tools', () => {
    const r = useToolRegistry()
    let activated = false
    r.register(makeMove({ disabled: true, onActivate: () => (activated = true) }))
    r.setActive('move')
    expect(activated).toBe(false)
  })

  test('toolByKey skips disabled tools', () => {
    const r = useToolRegistry()
    r.register(makeMove({ disabled: true }))
    expect(r.toolByKey('V')).toBeUndefined()
  })
})
