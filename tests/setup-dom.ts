import { GlobalWindow } from 'happy-dom'

const window = new GlobalWindow()

// Register essential DOM globals for @vue/test-utils
// Expose window itself
;(globalThis as Record<string, unknown>).window = window

const globals = [
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLButtonElement',
  'SVGElement',
  'Element',
  'Node',
  'Text',
  'Comment',
  'DocumentFragment',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'InputEvent',
  'FocusEvent',
  'MutationObserver',
  'ShadowRoot',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const

for (const key of globals) {
  if (key in window) {
    ;(globalThis as Record<string, unknown>)[key] = (window as Record<string, unknown>)[key]
  }
}
