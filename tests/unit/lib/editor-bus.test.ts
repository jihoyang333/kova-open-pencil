/**
 * editor-bus — Cluster 06 → Cluster 09 handshake contract.
 *
 * Verifies the typed payload SHAPE Plan 06 §1665 specifies. Cluster 09
 * consumes the same `editorBus` import and reads the typed payloads.
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { editorBus } from '@/lib/editor-bus'

describe('editorBus — typed payload contract (Plan 06 §1665)', () => {
  beforeEach(() => editorBus.clear())

  test('open-version-history payload contains canvasId + brandId', () => {
    const handler = mock(() => {})
    editorBus.on('editor:open-version-history', handler)
    editorBus.emit('editor:open-version-history', {
      canvasId: 'canvas-123',
      brandId: 'brand-456',
    })
    expect(handler.mock.calls).toHaveLength(1)
    expect(handler.mock.calls[0][0]).toEqual({
      canvasId: 'canvas-123',
      brandId: 'brand-456',
    })
  })

  test('save-version-snapshot payload contains canvasId + brandId', () => {
    const handler = mock(() => {})
    editorBus.on('editor:save-version-snapshot', handler)
    editorBus.emit('editor:save-version-snapshot', {
      canvasId: 'canvas-x',
      brandId: 'brand-y',
    })
    expect(handler.mock.calls).toHaveLength(1)
    expect(handler.mock.calls[0][0]).toEqual({
      canvasId: 'canvas-x',
      brandId: 'brand-y',
    })
  })

  test('on returns an unsubscribe disposer', () => {
    const handler = mock(() => {})
    const off = editorBus.on('editor:save-version-snapshot', handler)
    off()
    editorBus.emit('editor:save-version-snapshot', { canvasId: 'c', brandId: 'b' })
    expect(handler.mock.calls).toHaveLength(0)
  })

  test('off removes a specific handler without affecting others', () => {
    const a = mock(() => {})
    const b = mock(() => {})
    editorBus.on('editor:open-version-history', a)
    editorBus.on('editor:open-version-history', b)
    editorBus.off('editor:open-version-history', a)
    editorBus.emit('editor:open-version-history', { canvasId: 'c', brandId: 'b' })
    expect(a.mock.calls).toHaveLength(0)
    expect(b.mock.calls).toHaveLength(1)
  })

  test('emit with no listeners is a no-op (does not throw)', () => {
    expect(() =>
      editorBus.emit('editor:open-version-history', { canvasId: 'c', brandId: 'b' })
    ).not.toThrow()
  })
})
