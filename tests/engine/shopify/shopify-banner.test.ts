import { describe, expect, test } from 'bun:test'
import {
  BANNER_DISMISS_KEY,
  BANNER_COOLDOWN_MS,
  isBannerSuppressed,
  dismissBanner,
  hasBrandMissingShopify,
} from '../../../src/utils/shopify-banner'

const DAY_MS = 24 * 60 * 60 * 1000

function makeStorage(initial: Record<string, string> = {}): Storage {
  const store = { ...initial }
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
  }
}

describe('BANNER_COOLDOWN_MS', () => {
  test('equals 30 days in milliseconds', () => {
    expect(BANNER_COOLDOWN_MS).toBe(30 * DAY_MS)
  })
})

describe('isBannerSuppressed', () => {
  const now = 1_000_000_000_000

  test('returns false when storage has no dismissed timestamp', () => {
    const storage = makeStorage()
    expect(isBannerSuppressed(now, storage)).toBe(false)
  })

  test('returns true when dismissed 5 days ago (within cooldown)', () => {
    const dismissedAt = now - 5 * DAY_MS
    const storage = makeStorage({ [BANNER_DISMISS_KEY]: String(dismissedAt) })
    expect(isBannerSuppressed(now, storage)).toBe(true)
  })

  test('returns true when dismissed exactly 29 days ago (still within cooldown)', () => {
    const dismissedAt = now - 29 * DAY_MS
    const storage = makeStorage({ [BANNER_DISMISS_KEY]: String(dismissedAt) })
    expect(isBannerSuppressed(now, storage)).toBe(true)
  })

  test('returns false when dismissed exactly 30 days ago (cooldown expired)', () => {
    const dismissedAt = now - 30 * DAY_MS
    const storage = makeStorage({ [BANNER_DISMISS_KEY]: String(dismissedAt) })
    expect(isBannerSuppressed(now, storage)).toBe(false)
  })

  test('returns false when dismissed 31 days ago (cooldown expired)', () => {
    const dismissedAt = now - 31 * DAY_MS
    const storage = makeStorage({ [BANNER_DISMISS_KEY]: String(dismissedAt) })
    expect(isBannerSuppressed(now, storage)).toBe(false)
  })

  test('returns false when stored value is corrupted/non-numeric', () => {
    const storage = makeStorage({ [BANNER_DISMISS_KEY]: 'not-a-number' })
    expect(isBannerSuppressed(now, storage)).toBe(false)
  })
})

describe('dismissBanner', () => {
  test('writes current timestamp to storage under BANNER_DISMISS_KEY', () => {
    const now = 1_000_000_000_000
    const storage = makeStorage()
    dismissBanner(now, storage)
    expect(storage.getItem(BANNER_DISMISS_KEY)).toBe(String(now))
  })

  test('overwrites an existing timestamp', () => {
    const older = 999_000_000_000
    const now = 1_000_000_000_000
    const storage = makeStorage({ [BANNER_DISMISS_KEY]: String(older) })
    dismissBanner(now, storage)
    expect(storage.getItem(BANNER_DISMISS_KEY)).toBe(String(now))
  })
})

describe('hasBrandMissingShopify', () => {
  test('returns false when brandIds is empty', () => {
    expect(hasBrandMissingShopify([], new Set())).toBe(false)
  })

  test('returns false when all brands have an active Shopify connection', () => {
    const ids = ['brand-1', 'brand-2', 'brand-3']
    expect(hasBrandMissingShopify(ids, new Set(ids))).toBe(false)
  })

  test('returns true when at least one brand has no connection', () => {
    const connected = new Set(['brand-1', 'brand-2'])
    expect(hasBrandMissingShopify(['brand-1', 'brand-2', 'brand-3'], connected)).toBe(true)
  })

  test('returns true when no brands have connections', () => {
    expect(hasBrandMissingShopify(['brand-1'], new Set())).toBe(true)
  })

  test('returns false when connected set is a superset of brandIds', () => {
    const connected = new Set(['brand-1', 'brand-2', 'brand-extra'])
    expect(hasBrandMissingShopify(['brand-1', 'brand-2'], connected)).toBe(false)
  })
})
