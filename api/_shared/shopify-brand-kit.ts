/**
 * Pure parser for Shopify theme `config/settings_data.json` → best-effort brand kit.
 *
 * Shopify stores theme customizer values under `current` (or the currently-selected
 * preset). Field names vary by theme; we try a small list of common aliases covering
 * Dawn and the most popular third-party themes. Missing fields are simply omitted —
 * the UI downstream treats the returned kit as a *proposal*, not ground truth.
 *
 * Pure function: no I/O, no side effects. Safe to unit-test and share between
 * edge handlers and client-side previews.
 */

export interface ExtractedBrandKit {
  primaryColor?: string
  secondaryColor?: string
  headingFont?: string
  bodyFont?: string
  logoUrl?: string
}

interface ThemeSettings {
  current?: Record<string, unknown>
}

const COLOR_FIELDS: ReadonlyArray<
  readonly [keyof Pick<ExtractedBrandKit, 'primaryColor' | 'secondaryColor'>, readonly string[]]
> = [
  ['primaryColor', ['colors_accent_1', 'color_accent_1', 'primary_color']],
  ['secondaryColor', ['colors_accent_2', 'color_accent_2', 'secondary_color']],
]

const FONT_FIELDS: ReadonlyArray<
  readonly [keyof Pick<ExtractedBrandKit, 'headingFont' | 'bodyFont'>, readonly string[]]
> = [
  ['headingFont', ['type_header_font', 'heading_font', 'font_header']],
  ['bodyFont', ['type_body_font', 'body_font', 'font_body']],
]

const LOGO_FIELDS: readonly string[] = ['logo_url', 'logo']

function firstString(
  src: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): string | undefined {
  for (const k of keys) {
    const v = src[k]
    if (typeof v === 'string' && v.trim().length > 0) return v
  }
  return undefined
}

/**
 * Shopify encodes fonts like `assistant_n4` (family_weight). We keep the family
 * and replace hyphens with spaces so display strings render naturally.
 */
function normalizeFont(raw: string): string {
  return raw.split('_')[0].replace(/-/g, ' ')
}

export function extractBrandKitFromThemeSettings(theme: ThemeSettings): ExtractedBrandKit {
  const cur = theme.current ?? {}
  const out: ExtractedBrandKit = {}

  for (const [key, aliases] of COLOR_FIELDS) {
    const v = firstString(cur, aliases)
    if (v) out[key] = v
  }

  for (const [key, aliases] of FONT_FIELDS) {
    const v = firstString(cur, aliases)
    if (v) out[key] = normalizeFont(v)
  }

  const logo = firstString(cur, LOGO_FIELDS)
  if (logo && /^https?:\/\//.test(logo)) out.logoUrl = logo

  return out
}
