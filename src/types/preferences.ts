export type TextSize = 'small' | 'medium' | 'large'

export interface UserPreferences {
  accessibility: {
    textSize: TextSize
    reduceMotion: boolean
    highContrast: boolean
  }
  ai: {
    showTextSuggestions: boolean
  }
  view: {
    showRuler: boolean
    showLayoutGuide: boolean
    showPixelGrid: boolean
    showFrameOutlines: boolean
    showSlices: boolean
    showMaskOutlines: boolean
  }
  snap: {
    snapToGrid: boolean
    snapToGuides: boolean
    snapToObjects: boolean
  }
  defaults: {
    zoomLevel: number
    fontFamily: string
  }
  notifications: {
    productUpdates: boolean
    syncAlerts: boolean
  }
}

export const DEFAULTS: UserPreferences = {
  accessibility: { textSize: 'medium', reduceMotion: false, highContrast: false },
  ai: { showTextSuggestions: false },
  view: {
    showRuler: false,
    showLayoutGuide: true,
    showPixelGrid: false,
    showFrameOutlines: false,
    showSlices: false,
    showMaskOutlines: false,
  },
  snap: { snapToGrid: true, snapToGuides: true, snapToObjects: true },
  defaults: { zoomLevel: 1, fontFamily: 'Inter' },
  notifications: { productUpdates: true, syncAlerts: true },
}

const TEXT_SIZES: ReadonlyArray<TextSize> = ['small', 'medium', 'large'] as const

function isAccessibilityValid(k: string, v: unknown): boolean {
  if (k === 'textSize') {
    return typeof v === 'string' && (TEXT_SIZES as readonly string[]).includes(v)
  }
  if (k === 'reduceMotion' || k === 'highContrast') return typeof v === 'boolean'
  return false
}
function isAIValid(k: string, v: unknown): boolean {
  return k === 'showTextSuggestions' && typeof v === 'boolean'
}
function isViewValid(_k: string, v: unknown): boolean {
  return typeof v === 'boolean'
}
function isSnapValid(_k: string, v: unknown): boolean {
  return typeof v === 'boolean'
}
function isDefaultsValid(k: string, v: unknown): boolean {
  if (k === 'zoomLevel') return typeof v === 'number' && v > 0
  if (k === 'fontFamily') return typeof v === 'string' && v.length > 0
  return false
}
function isNotificationsValid(_k: string, v: unknown): boolean {
  return typeof v === 'boolean'
}

function mergeGroup<T extends Record<string, unknown>>(
  raw: unknown,
  fallback: T,
  isValidKey: (k: string, v: unknown) => boolean,
): T {
  if (!raw || typeof raw !== 'object') return structuredClone(fallback)
  const out: Record<string, unknown> = structuredClone(fallback)
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k in fallback && isValidKey(k, v)) out[k] = v
  }
  return out as T
}

export function mergeWithDefaults(
  partial: unknown,
  defaults: UserPreferences,
): UserPreferences {
  if (!partial || typeof partial !== 'object') return structuredClone(defaults)
  const p = partial as Record<string, unknown>
  return {
    accessibility: mergeGroup(p.accessibility, defaults.accessibility, isAccessibilityValid),
    ai: mergeGroup(p.ai, defaults.ai, isAIValid),
    view: mergeGroup(p.view, defaults.view, isViewValid),
    snap: mergeGroup(p.snap, defaults.snap, isSnapValid),
    defaults: mergeGroup(p.defaults, defaults.defaults, isDefaultsValid),
    notifications: mergeGroup(p.notifications, defaults.notifications, isNotificationsValid),
  }
}
