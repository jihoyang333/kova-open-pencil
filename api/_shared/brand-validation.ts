import { sanitizePlainText, sanitizeUrl } from './sanitize'

// W9b Cluster 03 — input validation for brand CRUD Edge Functions.
//
// Plan 03 §6 Task 9. Each validator returns a discriminated-union result
// rather than throwing so callers can map error codes to HTTP statuses
// consistently. Mirrors the typed-error pattern used by Cluster 01 helpers.

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ValidationError }

export type ValidationError =
  | 'name_required'
  | 'name_too_long'
  | 'url_invalid'
  | 'description_too_long'
  | 'brand_id_required'
  | 'confirm_required'

const MAX_NAME = 80
const MAX_DESCRIPTION = 200
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CreateBrandInput {
  name: string
  url: string | null
  description: string | null
}

export interface ValidatedCreateBrand {
  name: string
  url: string | null
  description: string | null
}

export function validateCreateBrand(input: Partial<CreateBrandInput>): ValidationResult<ValidatedCreateBrand> {
  const rawName = typeof input.name === 'string' ? sanitizePlainText(input.name) : ''
  if (rawName.length === 0) return { ok: false, error: 'name_required' }
  if (rawName.length > MAX_NAME) return { ok: false, error: 'name_too_long' }

  let url: string | null = null
  if (typeof input.url === 'string' && input.url.trim().length > 0) {
    url = sanitizeUrl(input.url)
    if (url === null) return { ok: false, error: 'url_invalid' }
  }

  let description: string | null = null
  if (typeof input.description === 'string' && input.description.trim().length > 0) {
    const sanitized = sanitizePlainText(input.description)
    if (sanitized.length > MAX_DESCRIPTION) return { ok: false, error: 'description_too_long' }
    description = sanitized.length > 0 ? sanitized : null
  }

  return { ok: true, value: { name: rawName, url, description } }
}

export interface RenameBrandInput {
  brand_id: string
  name: string
}

export function validateRenameBrand(input: Partial<RenameBrandInput>): ValidationResult<RenameBrandInput> {
  if (typeof input.brand_id !== 'string' || !UUID_RE.test(input.brand_id)) {
    return { ok: false, error: 'brand_id_required' }
  }
  const name = typeof input.name === 'string' ? sanitizePlainText(input.name) : ''
  if (name.length === 0) return { ok: false, error: 'name_required' }
  if (name.length > MAX_NAME) return { ok: false, error: 'name_too_long' }
  return { ok: true, value: { brand_id: input.brand_id, name } }
}

export interface BrandIdInput {
  brand_id: string
}

export function validateBrandId(input: Partial<BrandIdInput>): ValidationResult<BrandIdInput> {
  if (typeof input.brand_id !== 'string' || !UUID_RE.test(input.brand_id)) {
    return { ok: false, error: 'brand_id_required' }
  }
  return { ok: true, value: { brand_id: input.brand_id } }
}

export interface DeleteBrandInput {
  brand_id: string
  confirm_typed: string
}

export function validateDeleteBrand(input: Partial<DeleteBrandInput>): ValidationResult<DeleteBrandInput> {
  if (typeof input.brand_id !== 'string' || !UUID_RE.test(input.brand_id)) {
    return { ok: false, error: 'brand_id_required' }
  }
  if (typeof input.confirm_typed !== 'string' || input.confirm_typed.length === 0) {
    return { ok: false, error: 'confirm_required' }
  }
  // NOTE: do NOT sanitize confirm_typed — the RPC must compare it byte-for-byte
  // with the stored brand name. Stripping whitespace or HTML here would cause
  // mismatches with names containing leading/trailing characters.
  return { ok: true, value: { brand_id: input.brand_id, confirm_typed: input.confirm_typed } }
}
