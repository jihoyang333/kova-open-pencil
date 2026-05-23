import { describe, expect, test } from 'bun:test'
import { DEFAULTS, mergeWithDefaults, type UserPreferences } from '@/types/preferences'

describe('mergeWithDefaults', () => {
  test('empty input returns exact DEFAULTS clone', () => {
    const merged = mergeWithDefaults({}, DEFAULTS)
    expect(merged).toEqual(DEFAULTS)
    expect(merged).not.toBe(DEFAULTS)
    expect(merged.accessibility).not.toBe(DEFAULTS.accessibility)
  })

  test('null input returns DEFAULTS clone', () => {
    const merged = mergeWithDefaults(null, DEFAULTS)
    expect(merged).toEqual(DEFAULTS)
  })

  test('partial server blob honors set keys, defaults the rest', () => {
    const merged = mergeWithDefaults(
      { accessibility: { textSize: 'large' } },
      DEFAULTS,
    )
    expect(merged.accessibility.textSize).toBe('large')
    expect(merged.accessibility.reduceMotion).toBe(false)
    expect(merged.accessibility.highContrast).toBe(false)
    expect(merged.view).toEqual(DEFAULTS.view)
  })

  test('extra unknown top-level key is dropped', () => {
    const merged = mergeWithDefaults(
      { junk: { hostile: true }, accessibility: { textSize: 'small' } },
      DEFAULTS,
    )
    expect((merged as unknown as Record<string, unknown>).junk).toBeUndefined()
    expect(merged.accessibility.textSize).toBe('small')
  })

  test('type-mismatched value falls back to default for that key only', () => {
    const merged = mergeWithDefaults(
      { accessibility: { textSize: 42, reduceMotion: true } },
      DEFAULTS,
    )
    expect(merged.accessibility.textSize).toBe('medium')
    expect(merged.accessibility.reduceMotion).toBe(true)
  })

  test('textSize accepts only "small" | "medium" | "large"', () => {
    const merged = mergeWithDefaults(
      { accessibility: { textSize: 'normal' } },
      DEFAULTS,
    )
    expect(merged.accessibility.textSize).toBe('medium')
  })

  test('defaults.zoomLevel must be > 0', () => {
    const merged = mergeWithDefaults({ defaults: { zoomLevel: -5 } }, DEFAULTS)
    expect(merged.defaults.zoomLevel).toBe(1)
  })

  test('showLayoutGuide default is true (Figma-exact per Q24)', () => {
    expect(DEFAULTS.view.showLayoutGuide).toBe(true)
  })

  test('all notification defaults are true', () => {
    expect(DEFAULTS.notifications.productUpdates).toBe(true)
    expect(DEFAULTS.notifications.syncAlerts).toBe(true)
  })

  test('showTextSuggestions default is false (reserved per founder ratification 2026-05-17)', () => {
    expect(DEFAULTS.ai.showTextSuggestions).toBe(false)
  })

  test('Layer 1 shape covers all 6 groups', () => {
    const groups: Array<keyof UserPreferences> = [
      'accessibility',
      'ai',
      'view',
      'snap',
      'defaults',
      'notifications',
    ]
    for (const g of groups) expect(DEFAULTS[g]).toBeDefined()
  })
})
