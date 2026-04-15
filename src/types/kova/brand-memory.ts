export type BrandMemorySource = 'auto' | 'user'

export interface BrandMemory {
  readonly id: string
  readonly brand_id: string
  readonly user_id: string
  readonly content: string
  readonly source: BrandMemorySource
  readonly created_at: string
}
