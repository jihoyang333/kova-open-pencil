/**
 * Z-index stacking order for canvas overlays (sourced from hi-fi 09 §3.4 + PRD §12.12 find re-scope).
 * Lower numbers paint underneath higher numbers.
 */
export const OVERLAY_Z = {
  FRAME_OUTLINES: 3,
  PIXEL_GRID: 3,
  LAYOUT_GUIDES: 3,
  HOVER_CONTOUR: 4,
  MASK_OUTLINES: 4,
  SNAP_PIXEL: 5,
  SELECTION_BOX: 5,
  MEASUREMENT_LINE: 5,
  SLICE_REGION: 5,
  SELECTION_HANDLE: 6,
  DIM_LAYER: 6, // find focus mode backdrop over non-matching nodes (PRD §12.12)
  FIND_OVERLAY: 6, // find clickthrough handler — same layer as DIM_LAYER
  SPACING_TAG: 7,
  FRAME_LABEL: 7,
  SIZE_CHIP: 7,
  MEASUREMENT_LABEL: 7,
  EYEDROPPER_MAGNIFIER: 9,
  EYEDROPPER_HEX_CHIP: 10,
} as const

/**
 * Canonical overlay color tokens (sourced from hi-fi 09 §3.5 + PRD §12.12).
 * These are canvas-engine paint colors rendered into the overlay layer — they cannot
 * bind CSS custom properties, so they live as module constants (hi-fi-exempt per
 * Rider §2.6, mirrors c06 CTA_WRAP_FILL_HEX precedent). `var(--select)` resolved at
 * runtime via design-system tokens where a CSS surface is involved.
 */
export const OVERLAY_COLOR = {
  SNAP_RED: '#F24822',
  MASK_GREEN: '#3DDC97',
  MASK_GLYPH_BG: 'rgba(61,220,151,0.22)',
  FRAME_OUTLINE: 'rgba(126,126,121,0.55)',
  PIXEL_GRID: 'rgba(126,126,121,0.18)',
  LAYOUT_GUIDE_RED: 'rgba(255,0,0,0.10)', // Q24-locked default
  EYEDROPPER_BORDER_WHITE: '#ffffff',
  EYEDROPPER_SHADOW: '#1e1e1e',
  EYEDROPPER_HEX_CHIP_BG: '#2c2c2c',
  FIND_DIM: 'rgba(0, 0, 0, 0.6)', // PRD §12.12 founder decision — dim backdrop over non-matching nodes during find
  AI_KOVA_BLUE: '#5a7dff', // EXCLUSIVE to AI assist panel — never used elsewhere
} as const

/**
 * Pixel-grid auto-show threshold per hi-fi B8.5 + PRD §12.7.
 */
export const PIXEL_GRID_ZOOM_THRESHOLD = 8.0 // 800%

/**
 * JPG export quality presets per Q22.
 */
export const JPG_QUALITY = {
  HIGH: 0.92, // default
  MEDIUM: 0.8,
  LOW: 0.65,
} as const

/**
 * Camera-pan animation parameters per PRD §12.12 (find focus mode).
 */
export const CAMERA_PAN = {
  DURATION_MS: 250,
  EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
  PADDING_PCT: 10,
} as const

/**
 * Find feature config per PRD §12.12.
 */
export const FIND_CONFIG = {
  RESULTS_MAX: 200,
  QUERY_DEBOUNCE_MS: 80,
} as const

/**
 * Gradient editor modes enabled in MVP per PRD §12.5 founder decision (all 4 — match Figma).
 */
export const GRADIENT_MODES = ['linear', 'radial', 'angular', 'diamond'] as const
export type GradientMode = (typeof GRADIENT_MODES)[number]

/**
 * Multiple-fills cap per PRD §12 round 4 founder decision (match Figma — no cap).
 */
export const MULTIPLE_FILLS_CAP = Infinity

/**
 * Keyboard shortcut bindings (registered via Cluster 08 registry when available, otherwise local fallback handler).
 * Boolean ops per PRD §12.5 founder decision (Option+Shift, matches Figma exactly).
 * Pixel grid per PRD §12.7 founder decision.
 * Find per PRD §12.12 founder decision (07b owns end-to-end).
 */
export const SHORTCUTS = {
  BOOLEAN_UNION: 'alt+shift+u',
  BOOLEAN_SUBTRACT: 'alt+shift+s',
  BOOLEAN_INTERSECT: 'alt+shift+i',
  BOOLEAN_EXCLUDE: 'alt+shift+e',
  PROPS_COPY: 'cmd+alt+c',
  PROPS_PASTE: 'cmd+alt+v',
  EYEDROPPER: 'control+c',
  PIXEL_GRID_TOGGLE: 'shift+quote', // Shift+' — matches Figma
  FIND_OPEN: 'cmd+f',
  FIND_CLOSE: 'escape',
} as const

/**
 * Hardcoded feature gates per 00d 2.B (no runtime feature-flag service in MVP).
 */
export const FEATURE_GATES = {
  KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE: false, // flips true when Cluster 08 ships; Phase A uses local fallback
  EXPORT_PIPELINE_ZIP_BATCHING: false, // flips true when JSZip in deps (Phase B)
  FIND_FEATURE_ENABLED: true, // PRD §12.12 — 07b ships find end-to-end in Phase A; always on
  LAYOUT_GUIDES_DEFAULT_ON: true, // Q24-locked
  EYEDROPPER_CANVAS_ONLY: true, // Q20-locked for MVP
  EFFECTS_SECTION_DEFAULT_COLLAPSED: true, // PRD §12 round 4 founder confirm
} as const
