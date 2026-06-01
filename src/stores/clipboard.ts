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

  // C-LOW07b.4: paste only the fields the target node already supports —
  // silently drop incompatible fields (e.g. cornerRadius onto a TEXT node).
  function pasteProps(targetNodes: SceneNode[]): void {
    const payload = copiedProps.value
    if (!payload) return
    for (const target of targetNodes) {
      const t = target as unknown as Record<string, unknown>
      for (const [field, value] of Object.entries(payload.props)) {
        if (field in t) {
          t[field] = structuredClone(value)
        }
      }
    }
  }

  function clear(): void {
    copiedProps.value = null
  }

  return { copiedProps, copyProps, pasteProps, clear }
})
