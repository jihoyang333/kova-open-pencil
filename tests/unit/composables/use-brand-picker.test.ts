/**
 * useBrandPicker — PRD 04 §6.3 founder D-12 precedence + D-17 3-mode render.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

const routerState = {
  query: {} as Record<string, string | undefined>,
  replaceCalls: [] as Record<string, unknown>[],
}

mock.module('vue-router', () => ({
  useRoute: () => ({ query: routerState.query }),
  useRouter: () => ({
    replace: async (target: { query: Record<string, unknown> }) => {
      routerState.replaceCalls.push(target.query)
      routerState.query = target.query as Record<string, string | undefined>
      return undefined
    },
  }),
}))

const dbState = {
  brands: [] as Array<{ id: string; name: string }>,
  userPrefs: {} as Record<string, unknown>,
  authUserId: 'user-bp-1' as string | null,
}

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: dbState.authUserId === null ? null : { id: dbState.authUserId } } }) },
    from: (table: string) => {
      if (table === 'brands') {
        return { select: () => ({ eq: async () => ({ data: dbState.brands, error: null }) }) }
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { preferences: dbState.userPrefs }, error: null }) }) }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }
    },
  },
}))

let useBrandPicker: typeof import('../../../src/composables/account/use-brand-picker')['useBrandPicker']

beforeAll(async () => {
  ;({ useBrandPicker } = await import('../../../src/composables/account/use-brand-picker'))
})

afterAll(() => mock.restore())

beforeEach(() => {
  setActivePinia(createPinia())
  routerState.query = {}
  routerState.replaceCalls = []
  dbState.brands = []
  dbState.userPrefs = {}
})

describe('useBrandPicker', () => {
  it('mode = empty when 0 brands', async () => {
    const p = useBrandPicker()
    await p.load()
    expect(p.mode.value).toBe('empty')
    expect(p.selectedBrandId.value).toBeNull()
  })

  it('mode = static-label when 1 brand', async () => {
    dbState.brands = [{ id: 'b1', name: 'Acme' }]
    const p = useBrandPicker()
    await p.load()
    expect(p.mode.value).toBe('static-label')
    expect(p.selectedBrandId.value).toBe('b1')
  })

  it('mode = dropdown when 2+ brands', async () => {
    dbState.brands = [{ id: 'b2', name: 'Beta' }, { id: 'b1', name: 'Alpha' }]
    const p = useBrandPicker()
    await p.load()
    expect(p.mode.value).toBe('dropdown')
    expect(p.selectedBrandId.value).toBe('b1') // alphabetical first
  })

  it('precedence: URL query > Q5 lastActiveBrandId > alphabetical', async () => {
    dbState.brands = [{ id: 'b1', name: 'Alpha' }, { id: 'b2', name: 'Beta' }, { id: 'b3', name: 'Charlie' }]
    dbState.userPrefs = { lastActiveBrandId: 'b2' }
    routerState.query = { brand: 'b3' }
    const p = useBrandPicker()
    await p.load()
    expect(p.selectedBrandId.value).toBe('b3') // URL wins

    routerState.query = {}
    const p2 = useBrandPicker()
    await p2.load()
    expect(p2.selectedBrandId.value).toBe('b2') // Q5 wins over alphabetical

    dbState.userPrefs = {}
    const p3 = useBrandPicker()
    await p3.load()
    expect(p3.selectedBrandId.value).toBe('b1') // alphabetical first
  })

  it('selectBrand updates URL + persists lastActiveBrandId', async () => {
    dbState.brands = [{ id: 'b1', name: 'A' }, { id: 'b2', name: 'B' }]
    const p = useBrandPicker()
    await p.load()
    await p.selectBrand('b2')
    expect(routerState.replaceCalls[0].brand).toBe('b2')
  })
})
