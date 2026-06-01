import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import type { SceneNode, Fill, Stroke, Effect, BlendMode } from '@open-pencil/core'

export interface ClipboardPropsPayload {
  sourceNodeId: string
  sourceNodeType: string
  props: {
    fills?: Fill[]
    strokes?: Stroke[]
    strokeWeight?: number
    strokeAlign?: 'INSIDE' | 'CENTER' | 'OUTSIDE'
    effects?: Effect[]
    opacity?: number
    blendMode?: BlendMode
    cornerRadius?: number | { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number }
    paddingLeft?: number
    paddingRight?: number
    paddingTop?: number
    paddingBottom?: number
    layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
    primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
    counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX'
    itemSpacing?: number
    characterStyleOverrides?: unknown[]
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM'
  }
}

/**
 * Q23-locked prop set for copy/paste-properties (PRD 07b §12 round 4).
 * Mirrors Figma's "Paste properties" field set.
 */
const Q23_FIELDS = [
  'fills',
  'strokes',
  'strokeWeight',
  'strokeAlign',
  'effects',
  'opacity',
  'blendMode',
  'cornerRadius',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'layoutMode',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'itemSpacing',
  'characterStyleOverrides',
  'textAlignVertical',
] as const

export const useClipboardStore = defineStore('clipboard', () => {
  const copiedProps = ref<ClipboardPropsPayload | null>(null)

  function copyProps(node: SceneNode): void {
    const props: Record<string, unknown> = {}
    for (const field of Q23_FIELDS) {
      const value = (node as unknown as Record<string, unknown>)[field]
      if (value !== undefined) props[field] = structuredClone(value)
    }
    // markRaw: keep the payload as plain data so paste-time structuredClone
    // does not trip over Vue reactive proxies (Bun DataCloneError). The ref
    // still reacts on reassignment (null ↔ payload), which is all consumers read.
    copiedProps.value = markRaw({
      sourceNodeId: node.id,
      sourceNodeType: node.type,
      props: props as ClipboardPropsPayload['props'],
    })
  }

  // C-LOW07b.4: build the per-target change set, keeping only the fields the
  // target node already supports — incompatible fields (e.g. cornerRadius onto a
  // TEXT node) are silently dropped. Pure: never mutates the target nodes. The
  // caller routes these changes through the engine (editor.updateNodeWithUndo) so
  // the paste emits node:updated, bumps sceneVersion, repaints, persists, and is
  // undoable — see useCopyPasteProps (audit C3: no direct scene-node mutation).
  function buildPasteChanges(
    targetNodes: SceneNode[]
  ): Array<{ id: string; changes: Partial<SceneNode> }> {
    const payload = copiedProps.value
    if (!payload) return []
    const out: Array<{ id: string; changes: Partial<SceneNode> }> = []
    for (const target of targetNodes) {
      const t = target as unknown as Record<string, unknown>
      const changes: Record<string, unknown> = {}
      for (const [field, value] of Object.entries(payload.props)) {
        if (field in t) changes[field] = structuredClone(value)
      }
      if (Object.keys(changes).length > 0) {
        out.push({ id: target.id, changes: changes as Partial<SceneNode> })
      }
    }
    return out
  }

  function clear(): void {
    copiedProps.value = null
  }

  return { copiedProps, copyProps, buildPasteChanges, clear }
})
