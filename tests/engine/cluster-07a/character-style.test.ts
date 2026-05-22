import { describe, test, expect } from 'bun:test'
import type {
  CharacterStyleOverride,
  ListType,
  StyleRun
} from '../../../packages/core/src/scene-graph'

describe('Cluster 07a Task 3 — CharacterStyleOverride extensions', () => {
  test('openTypeFeatures accepts a feature-tag array', () => {
    const style: CharacterStyleOverride = {
      openTypeFeatures: ['liga', 'kern', 'tnum']
    }
    expect(style.openTypeFeatures).toEqual(['liga', 'kern', 'tnum'])
  })

  test('linkHref accepts an https URL', () => {
    const style: CharacterStyleOverride = {
      linkHref: 'https://kova.app'
    }
    expect(style.linkHref).toBe('https://kova.app')
  })

  test('ListType union restricts to NONE / BULLETED / NUMBERED', () => {
    const t1: ListType = 'NONE'
    const t2: ListType = 'BULLETED'
    const t3: ListType = 'NUMBERED'
    expect([t1, t2, t3]).toEqual(['NONE', 'BULLETED', 'NUMBERED'])
  })

  test('listIndent stores nested indent level', () => {
    const style: CharacterStyleOverride = {
      listType: 'BULLETED',
      listIndent: 2
    }
    expect(style.listIndent).toBe(2)
  })

  test('StyleRun propagates the new fields', () => {
    const run: StyleRun = {
      start: 0,
      length: 5,
      style: {
        openTypeFeatures: ['smcp'],
        linkHref: 'https://example.com',
        listType: 'NUMBERED',
        listIndent: 0
      }
    }
    expect(run.style.openTypeFeatures).toEqual(['smcp'])
    expect(run.style.linkHref).toBe('https://example.com')
    expect(run.style.listType).toBe('NUMBERED')
  })
})
