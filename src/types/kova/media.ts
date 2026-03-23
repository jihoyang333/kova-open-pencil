export interface MediaAsset {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly file_name: string
  readonly file_type: string
  readonly file_size: number
  readonly storage_path: string
  readonly created_at: string
}

export const MEDIA_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const

export type MediaAcceptedType = (typeof MEDIA_ACCEPTED_TYPES)[number]

export const MEDIA_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const MEDIA_ACCEPT_STRING = MEDIA_ACCEPTED_TYPES.join(',')
