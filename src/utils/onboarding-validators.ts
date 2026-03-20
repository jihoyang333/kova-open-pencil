const URL_PATTERN = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isValidUrl(url: string): boolean {
  if (!url.trim()) return false
  return URL_PATTERN.test(url.trim())
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_PATTERN.test(color)
}
