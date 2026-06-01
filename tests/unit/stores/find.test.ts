import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useFindStore } from '@/stores/find'

describe('useFindStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('defaults: active=false, query="", matchedNodeIds=[], focusedNodeId=null', () => {
    const store = useFindStore()
    expect(store.active).toBe(false)
    expect(store.query).toBe('')
    expect(store.matchedNodeIds).toEqual([])
    expect(store.focusedNodeId).toBeNull()
  })

  it('open() sets active=true, clears prior state', () => {
    const store = useFindStore()
    store.matchedNodeIds = ['stale']
    store.focusedNodeId = 'stale'
    store.query = 'stale'
    store.open()
    expect(store.active).toBe(true)
    expect(store.query).toBe('')
    expect(store.matchedNodeIds).toEqual([])
    expect(store.focusedNodeId).toBeNull()
  })

  it('close() sets active=false + clears all', () => {
    const store = useFindStore()
    store.open()
    store.query = 'frame'
    store.matchedNodeIds = ['a', 'b']
    store.focusedNodeId = 'a'
    store.close()
    expect(store.active).toBe(false)
    expect(store.query).toBe('')
    expect(store.matchedNodeIds).toEqual([])
    expect(store.focusedNodeId).toBeNull()
  })

  it('isMultiMatch is true when matchedNodeIds.length > 1 AND focusedNodeId === null', () => {
    const store = useFindStore()
    store.open()
    store.matchedNodeIds = ['a', 'b', 'c']
    expect(store.isMultiMatch).toBe(true)
    store.focusedNodeId = 'a'
    expect(store.isMultiMatch).toBe(false)
  })

  it('isFocused is true when focusedNodeId !== null OR matchedNodeIds.length === 1', () => {
    const store = useFindStore()
    store.open()
    store.matchedNodeIds = ['a']
    expect(store.isFocused).toBe(true)
    store.matchedNodeIds = ['a', 'b']
    expect(store.isFocused).toBe(false)
    store.focusedNodeId = 'b'
    expect(store.isFocused).toBe(true)
  })

  it('focusNode(id) sets focusedNodeId — useCameraPan integration tested in composable test', () => {
    const store = useFindStore()
    store.open()
    store.matchedNodeIds = ['a', 'b']
    store.focusNode('b')
    expect(store.focusedNodeId).toBe('b')
  })

  it('exitOnDimClick(id) closes find', () => {
    const store = useFindStore()
    store.open()
    store.matchedNodeIds = ['a']
    store.exitOnDimClick('other')
    expect(store.active).toBe(false)
    // Note: actual selection write tested in integration suite where editorStore is wired.
  })
})
