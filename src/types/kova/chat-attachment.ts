export interface ChatAttachment {
  readonly id: string
  readonly user_id: string
  readonly brand_id: string
  readonly conversation_id: string | null
  readonly file_name: string
  readonly file_type: string
  readonly file_size: number
  readonly width: number | null
  readonly height: number | null
  readonly storage_path: string
  readonly created_at: string
}
