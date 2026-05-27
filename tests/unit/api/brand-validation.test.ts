import { describe, expect, test } from 'bun:test'

import {
  validateBrandId,
  validateCreateBrand,
  validateDeleteBrand,
  validateRenameBrand,
} from '../../../api/_shared/brand-validation'

// W9b Cluster 03 — brand-validation contracts (Plan 03 Task 9).

const UUID = '8f14e45f-ceea-467a-9575-d094f9c6efb1'

describe('validateCreateBrand', () => {
  test('happy path with all fields', () => {
    const r = validateCreateBrand({
      name: 'Patagonia',
      url: 'https://patagonia.com',
      description: 'Outdoor gear.',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.name).toBe('Patagonia')
      expect(r.value.url).toBe('https://patagonia.com/')
      expect(r.value.description).toBe('Outdoor gear.')
    }
  })

  test('strips HTML from name', () => {
    const r = validateCreateBrand({ name: '<b>Patagonia</b>', url: null, description: null })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.name).toBe('Patagonia')
  })

  test('rejects empty name', () => {
    const r = validateCreateBrand({ name: '   ', url: null, description: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('name_required')
  })

  test('rejects name > 80 chars', () => {
    const r = validateCreateBrand({ name: 'x'.repeat(81), url: null, description: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('name_too_long')
  })

  test('rejects javascript: URLs', () => {
    const r = validateCreateBrand({ name: 'Y', url: 'javascript:alert(1)', description: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('url_invalid')
  })

  test('accepts http: and https:', () => {
    expect(validateCreateBrand({ name: 'Y', url: 'http://y.com', description: null }).ok).toBe(true)
    expect(validateCreateBrand({ name: 'Y', url: 'https://y.com', description: null }).ok).toBe(true)
  })

  test('null url + description allowed', () => {
    const r = validateCreateBrand({ name: 'Y', url: null, description: null })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.url).toBe(null)
      expect(r.value.description).toBe(null)
    }
  })

  test('description > 200 chars rejected', () => {
    const r = validateCreateBrand({ name: 'Y', url: null, description: 'd'.repeat(201) })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('description_too_long')
  })
})

describe('validateRenameBrand', () => {
  test('happy path', () => {
    const r = validateRenameBrand({ brand_id: UUID, name: 'Brand B' })
    expect(r.ok).toBe(true)
  })

  test('rejects non-uuid brand_id', () => {
    const r = validateRenameBrand({ brand_id: 'nope', name: 'X' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('brand_id_required')
  })

  test('rejects empty name', () => {
    const r = validateRenameBrand({ brand_id: UUID, name: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('name_required')
  })
})

describe('validateBrandId', () => {
  test('accepts uuid', () => {
    expect(validateBrandId({ brand_id: UUID }).ok).toBe(true)
  })
  test('rejects missing', () => {
    const r = validateBrandId({})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('brand_id_required')
  })
})

describe('validateDeleteBrand', () => {
  test('preserves confirm_typed verbatim (no sanitize)', () => {
    const r = validateDeleteBrand({ brand_id: UUID, confirm_typed: '  Patagonia  ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      // critical: trailing/leading whitespace preserved so byte-for-byte
      // server compare against stored name doesn't drift
      expect(r.value.confirm_typed).toBe('  Patagonia  ')
    }
  })

  test('rejects empty confirm', () => {
    const r = validateDeleteBrand({ brand_id: UUID, confirm_typed: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('confirm_required')
  })
})
