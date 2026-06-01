/**
 * useToolRegistry — Cluster 06 Task 4.
 *
 * Declarative tool registration API consumed by Cluster 07a (Slice + Measurement
 * register at app init). Cluster 06 ships the registry + the 8 default tools
 * (Move/Frame/Rect/Ellipse/Pen/Text/AI/Components).
 *
 * Icon convention per W0-4 lock: `ToolDef.icon` is a KovaIcon registry name
 * (short form, e.g. 'mouse-pointer-2'). The bottom toolbar passes the string
 * into <KovaIcon :name="tool.icon" />. The four forbidden alternates
 * (`i-lucide-*`, raw `<icon-lucide-*>`, template-literal resolution,
 * Nuxt-style `<Icon name="lucide:...">`) are NOT permitted.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ToolDef, ToolSlot } from '@/types/tool-registry'

const PRIMARY_SLOT_ORDER: readonly ToolSlot[] = [
  'move',
  'frame',
  'rectangle',
  'ellipse',
  'pen',
  'text',
  'measurement',
  'ai',
  'components',
]

export interface ToolKeyModifiers {
  shift?: boolean
  alt?: boolean
  meta?: boolean
  ctrl?: boolean
}

export const useToolRegistry = defineStore('tool-registry', () => {
  const tools = ref<Map<string, ToolDef>>(new Map())

  const allVisibleTools = computed<ToolDef[]>(() =>
    [...tools.value.values()].filter((t) => (t.when ? t.when() : true))
  )

  const primaryTools = computed<ToolDef[]>(() => {
    const visible = allVisibleTools.value.filter((t) => !t.parent)
    return [...visible].sort(
      (a, b) => PRIMARY_SLOT_ORDER.indexOf(a.slot) - PRIMARY_SLOT_ORDER.indexOf(b.slot)
    )
  })

  function dropdownTools(parent: 'move' | 'frame' | 'pen'): ToolDef[] {
    return allVisibleTools.value.filter((t) => t.parent === parent)
  }

  function register(tool: ToolDef): void {
    if (import.meta.env.DEV && tool.key) {
      const wantsModless = !tool.keySequence || tool.keySequence.length === 0
      for (const existing of tools.value.values()) {
        if (existing.id === tool.id) continue
        if (existing.disabled) continue
        const existingModless = !existing.keySequence || existing.keySequence.length === 0
        if (
          existing.key &&
          existing.key.toUpperCase() === tool.key.toUpperCase() &&
          wantsModless &&
          existingModless
        ) {
          console.warn(
            `[tool-registry] shortcut "${tool.key}" conflicts — "${existing.id}" already owns it. ` +
              `"${tool.id}" will not match via toolByKey (first registered wins).`,
          )
        }
      }
    }
    tools.value = new Map(tools.value).set(tool.id, tool)
  }

  function unregister(id: string): void {
    if (!tools.value.has(id)) return
    const next = new Map(tools.value)
    next.delete(id)
    tools.value = next
  }

  function toolByKey(key: string, mods: ToolKeyModifiers = {}): ToolDef | undefined {
    const upper = key.toUpperCase()
    const wantsShift = !!mods.shift
    const wantsAlt = !!mods.alt
    const wantsMeta = !!mods.meta
    const wantsCtrl = !!mods.ctrl

    for (const t of allVisibleTools.value) {
      if (t.disabled) continue

      // single-key shortcut: no modifiers
      if (
        t.key &&
        t.key.toUpperCase() === upper &&
        !wantsShift &&
        !wantsAlt &&
        !wantsMeta &&
        !wantsCtrl
      ) {
        return t
      }

      // key sequence: explicit modifier set + terminal key
      if (t.keySequence && t.keySequence.length > 0) {
        const needsShift = t.keySequence.includes('Shift')
        const needsAlt = t.keySequence.includes('Alt')
        const needsMeta = t.keySequence.includes('Meta')
        const needsCtrl = t.keySequence.includes('Ctrl')
        const lastKey = t.keySequence[t.keySequence.length - 1]
        if (
          lastKey.toUpperCase() === upper &&
          wantsShift === needsShift &&
          wantsAlt === needsAlt &&
          wantsMeta === needsMeta &&
          wantsCtrl === needsCtrl
        ) {
          return t
        }
      }
    }
    return undefined
  }

  function setActive(id: string): void {
    const tool = tools.value.get(id)
    if (!tool || tool.disabled) return
    // M3 — respect when() predicate so conditionally-visible tools can't be
    // activated when their predicate is false.
    if (tool.when && !tool.when()) return
    tool.onActivate()
  }

  function clear(): void {
    tools.value = new Map()
  }

  return {
    tools,
    primaryTools,
    dropdownTools,
    register,
    unregister,
    toolByKey,
    setActive,
    clear,
  }
})
