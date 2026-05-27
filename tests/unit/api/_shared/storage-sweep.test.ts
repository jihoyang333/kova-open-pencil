import { describe, test, expect } from 'bun:test'

import { purgeBrandStorageObjects } from '../../../../api/_shared/storage-sweep'

interface StoredObject {
  name: string
}

interface Opts {
  objects?: Record<string, StoredObject[]>
  listErrors?: Record<string, string>
  removeErrors?: Record<string, string>
}

function makeAdmin(opts: Opts) {
  const objs = opts.objects ?? {}
  const listErrs = opts.listErrors ?? {}
  const rmErrs = opts.removeErrors ?? {}
  return {
    storage: {
      from(bucket: string) {
        return {
          async list(_prefix: string, _options: { limit: number }) {
            if (listErrs[bucket]) {
              return { data: null, error: { message: listErrs[bucket] } }
            }
            return { data: objs[bucket] ?? [], error: null }
          },
          async remove(_paths: string[]) {
            if (rmErrs[bucket]) {
              return { data: null, error: { message: rmErrs[bucket] } }
            }
            return { data: null, error: null }
          },
        }
      },
    },
  }
}

describe('purgeBrandStorageObjects', () => {
  test('sweeps all 4 buckets when objects present', async () => {
    const admin = makeAdmin({
      objects: {
        'brand-logos': [{ name: 'logo.png' }],
        'media-assets': [{ name: 'a.png' }, { name: 'b.png' }],
        'brand-fonts': [],
        'canvas-snapshots': [{ name: 'c1.kiwi.zst' }],
      },
    })
    const res = await purgeBrandStorageObjects(
      admin as unknown as Parameters<typeof purgeBrandStorageObjects>[0],
      'brand-id',
      'user-id'
    )
    expect(res.swept).toBe(4) // 1 + 2 + 0 + 1
    expect(res.failed).toEqual([])
  })

  test('best-effort: list error logged but does not throw', async () => {
    const admin = makeAdmin({
      objects: { 'brand-logos': [{ name: 'x.png' }] },
      listErrors: { 'media-assets': 'rate limited' },
    })
    const res = await purgeBrandStorageObjects(
      admin as unknown as Parameters<typeof purgeBrandStorageObjects>[0],
      'b',
      'u'
    )
    expect(res.failed.some((f) => f.startsWith('media-assets:list:'))).toBe(true)
    expect(res.swept).toBe(1)
  })

  test('best-effort: remove error logged but other buckets continue', async () => {
    const admin = makeAdmin({
      objects: {
        'brand-logos': [{ name: 'a.png' }],
        'media-assets': [{ name: 'b.png' }],
      },
      removeErrors: { 'brand-logos': 'permission denied' },
    })
    const res = await purgeBrandStorageObjects(
      admin as unknown as Parameters<typeof purgeBrandStorageObjects>[0],
      'b',
      'u'
    )
    expect(res.failed.some((f) => f.startsWith('brand-logos:remove:'))).toBe(true)
    expect(res.swept).toBe(1) // media-assets succeeded
  })

  test('empty result when no objects in any bucket', async () => {
    const admin = makeAdmin({ objects: {} })
    const res = await purgeBrandStorageObjects(
      admin as unknown as Parameters<typeof purgeBrandStorageObjects>[0],
      'b',
      'u'
    )
    expect(res.swept).toBe(0)
    expect(res.failed).toEqual([])
  })
})
