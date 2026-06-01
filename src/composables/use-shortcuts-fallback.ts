import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Phase-A keyboard fallback (PRD 07b §12.5/§12.7/§12.12). Until Cluster 08's central
 * shortcut registry ships (FEATURE_GATES.KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE), 07b's
 * shortcuts work via a window keydown handler installed here.
 *
 * Matching uses `e.code` (NOT `e.key`) per CLAUDE.md — the Option key transforms
 * characters on macOS, so `e.key` is unreliable for ⌥-combos. Each action returns whether
 * it handled the event; we only `preventDefault` when handled, so unhandled keys (e.g. Esc
 * when find is inactive) bubble normally.
 */
export interface ShortcutBinding {
  id: string
  keys: string
  /** Returns true if the action consumed the event. */
  action: () => boolean
}

interface ParsedBinding {
  code: string
  alt: boolean
  shift: boolean
  meta: boolean
  ctrl: boolean
}

function tokenToCode(token: string): string {
  if (token === 'quote') return 'Quote'
  if (token === 'escape') return 'Escape'
  if (token.length === 1 && token >= 'a' && token <= 'z') return `Key${token.toUpperCase()}`
  return ''
}

export function parseKeys(keys: string): ParsedBinding {
  const parsed: ParsedBinding = { code: '', alt: false, shift: false, meta: false, ctrl: false }
  for (const part of keys.toLowerCase().split('+')) {
    if (part === 'alt') parsed.alt = true
    else if (part === 'shift') parsed.shift = true
    else if (part === 'cmd' || part === 'meta') parsed.meta = true
    else if (part === 'control' || part === 'ctrl') parsed.ctrl = true
    else parsed.code = tokenToCode(part)
  }
  return parsed
}

function matches(e: KeyboardEvent, p: ParsedBinding): boolean {
  return (
    e.code === p.code &&
    e.altKey === p.alt &&
    e.shiftKey === p.shift &&
    e.metaKey === p.meta &&
    e.ctrlKey === p.ctrl
  )
}

export function useShortcutsFallback(bindings: ShortcutBinding[]): void {
  const parsed = bindings.map((b) => ({ binding: b, keys: parseKeys(b.keys) }))

  function onKeydown(e: KeyboardEvent): void {
    for (const { binding, keys } of parsed) {
      if (matches(e, keys) && binding.action()) {
        e.preventDefault()
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
