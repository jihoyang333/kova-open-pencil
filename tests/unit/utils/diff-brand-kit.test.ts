import { describe, test, expect } from 'bun:test'
import { applySelection, diffBrandKits } from '@/utils/diff-brand-kit'

describe('diffBrandKits', () => {
  test('returns row for changed primaryColor', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000000' },
      { primaryColor: '#FF0000' }
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].key).toBe('primaryColor')
    expect(rows[0].current).toBe('#000000')
    expect(rows[0].proposed).toBe('#FF0000')
  })

  test('omits row for identical headingFont', () => {
    const rows = diffBrandKits(
      { headingFont: 'Inter' },
      { headingFont: 'Inter' }
    )
    expect(rows).toHaveLength(0)
  })

  test('returns row for new logoUrl not in current', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000000' },
      { primaryColor: '#000000', logoUrl: 'https://cdn.example.com/logo.png' }
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].key).toBe('logoUrl')
    expect(rows[0].current).toBeUndefined()
    expect(rows[0].proposed).toBe('https://cdn.example.com/logo.png')
  })

  test('scenario: current={primaryColor,headingFont}, proposed={primaryColor,headingFont,logoUrl} → 2 rows', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000000', headingFont: 'Inter' },
      { primaryColor: '#FF0000', headingFont: 'Inter', logoUrl: 'https://cdn.example.com/logo.png' }
    )
    expect(rows).toHaveLength(2)
    const keys = rows.map((r) => r.key)
    expect(keys).toContain('primaryColor')
    expect(keys).toContain('logoUrl')
    expect(keys).not.toContain('headingFont')
  })

  test('returns empty array when all proposed fields match current', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000', headingFont: 'Inter', logoUrl: 'https://logo.png' },
      { primaryColor: '#000', headingFont: 'Inter', logoUrl: 'https://logo.png' }
    )
    expect(rows).toHaveLength(0)
  })

  test('returns empty array when proposed is empty', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000', headingFont: 'Inter' },
      {}
    )
    expect(rows).toHaveLength(0)
  })

  test('all diff rows are selected by default', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000', headingFont: 'Georgia' },
      { primaryColor: '#FFF', headingFont: 'Inter' }
    )
    expect(rows.every((r) => r.selected)).toBe(true)
  })

  test('diff rows carry human-readable labels', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000', logoUrl: undefined },
      { primaryColor: '#F00', logoUrl: 'https://logo.png' }
    )
    const labels = rows.map((r) => r.label)
    expect(labels).toContain('Primary color')
    expect(labels).toContain('Logo')
  })

  test('returns row when current field is undefined but proposed has value', () => {
    const rows = diffBrandKits({}, { secondaryColor: '#AAAAAA' })
    expect(rows).toHaveLength(1)
    expect(rows[0].key).toBe('secondaryColor')
    expect(rows[0].current).toBeUndefined()
  })

  test('does not mutate input objects', () => {
    const current = { primaryColor: '#000' }
    const proposed = { primaryColor: '#FFF' }
    const currentSnapshot = { ...current }
    const proposedSnapshot = { ...proposed }
    diffBrandKits(current, proposed)
    expect(current).toEqual(currentSnapshot)
    expect(proposed).toEqual(proposedSnapshot)
  })
})

describe('applySelection', () => {
  test('returns only selected row values', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000', headingFont: 'Georgia' },
      { primaryColor: '#FFF', headingFont: 'Inter' }
    )
    rows[0].selected = false

    const kit = applySelection(rows)
    expect(kit.primaryColor).toBeUndefined()
    expect(kit.headingFont).toBe('Inter')
  })

  test('returns all values when all rows are selected', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000', logoUrl: undefined },
      { primaryColor: '#F00', logoUrl: 'https://logo.png' }
    )

    const kit = applySelection(rows)
    expect(kit.primaryColor).toBe('#F00')
    expect(kit.logoUrl).toBe('https://logo.png')
  })

  test('returns empty kit when no rows are selected', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000' },
      { primaryColor: '#FFF' }
    )
    rows[0].selected = false

    const kit = applySelection(rows)
    expect(Object.keys(kit)).toHaveLength(0)
  })

  test('does not mutate input rows', () => {
    const rows = diffBrandKits(
      { primaryColor: '#000' },
      { primaryColor: '#FFF' }
    )
    const snapshot = rows.map((r) => ({ ...r }))
    applySelection(rows)
    expect(rows).toEqual(snapshot)
  })
})
