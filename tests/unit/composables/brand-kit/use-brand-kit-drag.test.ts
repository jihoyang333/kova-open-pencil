import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({}),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

const { useBrandKitDrag } = await import('@/composables/brand-kit/use-brand-kit-drag')
const { useBrandsStore } = await import('@/stores/brands')
const { BRAND_KIT_MIME } = await import('@/composables/brand-kit/brand-kit-dnd')

class FakeDataTransfer {
  private store = new Map<string, string>()
  effectAllowed = 'none'
  setData(type: string, data: string): void {
    this.store.set(type, data)
  }
  getData(type: string): string {
    return this.store.get(type) ?? ''
  }
}

function makeEvent(): DragEvent {
  return { dataTransfer: new FakeDataTransfer() } as unknown as DragEvent
}

function seedBrand(): void {
  const brands = useBrandsStore()
  brands.brands = [{ id: 'b1', name: 'Nike' }] as never
  brands.selectBrand('b1')
}

describe('useBrandKitDrag', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    seedBrand()
  })

  test('onColorDragStart writes color MIME + payload', () => {
    const { onColorDragStart } = useBrandKitDrag()
    const ev = makeEvent()
    onColorDragStart({ id: 'c1', hex: '#ff0000', label: 'Red', order: 0 }, ev)
    const raw = ev.dataTransfer!.getData(BRAND_KIT_MIME.color)
    expect(JSON.parse(raw)).toEqual({ hex: '#ff0000', swatchId: 'c1', brandId: 'b1' })
    expect(ev.dataTransfer!.effectAllowed).toBe('copy')
  })

  test('onFontDragStart writes font MIME + payload (omits absent optionals)', () => {
    const { onFontDragStart } = useBrandKitDrag()
    const ev = makeEvent()
    onFontDragStart({ family: 'Inter' }, ev)
    expect(JSON.parse(ev.dataTransfer!.getData(BRAND_KIT_MIME.font))).toEqual({
      family: 'Inter',
      brandId: 'b1',
    })
  })

  test('onFontDragStart includes fontId + fontFileUrl when present', () => {
    const { onFontDragStart } = useBrandKitDrag()
    const ev = makeEvent()
    onFontDragStart({ family: 'Brand', fontId: 'f1', fontFileUrl: 'https://x/f.woff2' }, ev)
    expect(JSON.parse(ev.dataTransfer!.getData(BRAND_KIT_MIME.font))).toEqual({
      family: 'Brand',
      fontId: 'f1',
      fontFileUrl: 'https://x/f.woff2',
      brandId: 'b1',
    })
  })

  test('onLogoDragStart writes asset MIME + payload', () => {
    const { onLogoDragStart } = useBrandKitDrag()
    const ev = makeEvent()
    onLogoDragStart({ assetId: 'a1', kind: 'logo', url: 'https://x/l.png' }, ev)
    expect(JSON.parse(ev.dataTransfer!.getData(BRAND_KIT_MIME.asset))).toEqual({
      assetId: 'a1',
      kind: 'logo',
      url: 'https://x/l.png',
      brandId: 'b1',
    })
  })

  test('onSavedBlockDragStart writes saved-block MIME + nested blockData', () => {
    const { onSavedBlockDragStart } = useBrandKitDrag()
    const ev = makeEvent()
    onSavedBlockDragStart(
      { id: 'sb1', label: 'CTA', category: 'CTA', content: 'Shop now', type: 'cta', order: 0 },
      ev,
    )
    expect(JSON.parse(ev.dataTransfer!.getData(BRAND_KIT_MIME.savedBlock))).toEqual({
      blockId: 'sb1',
      blockData: { label: 'CTA', content: 'Shop now', type: 'cta' },
      brandId: 'b1',
    })
  })

  test('throws when no brand selected', () => {
    const brands = useBrandsStore()
    brands.brands = []
    brands.selectBrand('none')
    const { onColorDragStart } = useBrandKitDrag()
    expect(() => onColorDragStart({ id: 'c', hex: '#000', label: 'k', order: 0 }, makeEvent())).toThrow(
      'no_selected_brand',
    )
  })

  test('no-op when dataTransfer is null', () => {
    const { onColorDragStart } = useBrandKitDrag()
    const ev = { dataTransfer: null } as unknown as DragEvent
    expect(() => onColorDragStart({ id: 'c', hex: '#000', label: 'k', order: 0 }, ev)).not.toThrow()
  })
})
