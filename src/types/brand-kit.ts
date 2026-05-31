// Cluster 05 — Brand Kit asset types.
// Shapes mirror the JSONB columns + tables in
// supabase/migrations/20260615_05_brand_kit.sql.

export interface ToneSnippet {
  id: string
  label: string
  category: string
  content: string
  order: number
}

export type SavedBlockType = 'text' | 'cta' | 'footer'

export interface SavedBlock {
  id: string
  label: string
  category: string
  content: string
  type: SavedBlockType
  order: number
}

export interface IdentityCard {
  content: string
  last_edited_at: string
  last_edited_by: string
  word_count: number
}

export type IdentityCardKey = 'about' | 'voice' | 'story'

export interface IdentityCards {
  about?: IdentityCard
  voice?: IdentityCard
  story?: IdentityCard
}

export type WritingRuleKey =
  | 'no_exclamation'
  | 'no_em_dash'
  | 'sentence_case_headlines'
  | 'no_superlatives'
  | 'active_voice_only'

export interface WritingRules {
  no_exclamation?: boolean
  no_em_dash?: boolean
  sentence_case_headlines?: boolean
  no_superlatives?: boolean
  active_voice_only?: boolean
  [key: string]: boolean | undefined
}

export interface BrandColor {
  id: string
  hex: string
  label: string
  order: number
}

export type BrandFontMime = 'font/woff2' | 'font/ttf' | 'font/otf'

export interface BrandFont {
  id: string
  brand_id: string
  family_name: string
  file_path: string
  file_size_bytes: number
  mime_type: BrandFontMime
  license_attested: boolean
  uploaded_at: string
  uploaded_by: string
}

export type BrandKbSourceMime = 'application/pdf' | 'text/plain' | 'text/markdown'

export interface BrandKbSource {
  id: string
  brand_id: string
  file_name: string
  file_path: string
  file_size_bytes: number
  mime_type: BrandKbSourceMime
  uploaded_at: string
  uploaded_by: string
  extracted_text: string | null
}

export interface VoiceDraftPayload {
  voice: { content: string }
  tone_snippets: Array<{ label: string; category: string; content: string }>
}

export interface VoiceDraft {
  id: string
  brand_id: string
  user_id: string
  source: 'shopify_extract'
  draft_payload: VoiceDraftPayload
  created_at: string
  confirmed_at: string | null
  discarded_at: string | null
}
