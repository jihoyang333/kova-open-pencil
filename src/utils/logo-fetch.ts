// PRD 02 §5.3.1 + Plan T07 — pure helpers for onboarding logo auto-fetch.
// No DOM imports; tested under bun:test with a global Image stub.

const HOSTNAME_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i

export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  let value = trimmed.replace(/^https?:\/\//, '')
  value = value.replace(/\/.*$/, '').replace(/\/$/, '')
  if (!HOSTNAME_REGEX.test(value)) return null
  return value
}

export function fetchFavicon(input: string): Promise<string | null> {
  const domain = normalizeDomain(input)
  if (!domain) return Promise.resolve(null)
  const url = `https://${domain}/favicon.ico`
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  })
}
