import SYSTEM_PROMPT from '@/ai/system-prompt.md?raw'
import EMAIL_GUIDELINES from '@/data/email-guidelines.md?raw'
import EMAIL_SECTIONS from '@/data/email-sections.md?raw'
import IMAGE_HANDLING from '@/data/image-handling.md?raw'
import MEMORY_INSTRUCTIONS from '@/data/memory-instructions.md?raw'
import { formatBrandKitPrompt } from '@/utils/format-brand-prompt'

import type { BrandMemory } from '@/types/kova/brand-memory'
import type { ChatProductReference } from '@/types/kova/chat'
import type { Brand } from '@/types/kova/database'

export type { BrandMemory }

export interface AvailableImage {
  readonly fileName: string
  readonly fileType: string
  readonly width: number | null
  readonly height: number | null
  readonly publicUrl: string
  readonly mediaId: string
}

export interface ChatAttachmentForAI {
  readonly fileName: string
  readonly width: number | null
  readonly height: number | null
  readonly publicUrl: string
}

export type CampaignType =
  | 'educational'
  | 'community'
  | 'sales'
  | 'social-proof'
  | 'product-highlights'

export interface BuildSystemPromptInput {
  readonly brandProfile: Brand | null
  readonly availableImages: readonly AvailableImage[]
  readonly brandMemories: readonly BrandMemory[]
  readonly chatAttachments?: readonly ChatAttachmentForAI[]
  readonly campaignType?: CampaignType
  readonly productReferences?: readonly ChatProductReference[]
}

interface ToneSnippet {
  readonly id: string
  readonly label: string
  readonly content: string
}

const MAX_TONE_SNIPPETS = 10
const MAX_BRAND_MEMORIES = 50

const CAMPAIGN_GUIDE_MODULES: Record<CampaignType, () => Promise<{ default: string }>> = {
  educational: () => import('@/data/campaigns/educational.md?raw'),
  community: () => import('@/data/campaigns/community-branded.md?raw'),
  sales: () => import('@/data/campaigns/sales.md?raw'),
  'social-proof': () => import('@/data/campaigns/social-proof.md?raw'),
  'product-highlights': () => import('@/data/campaigns/product-highlights.md?raw')
}

const FALLBACK_INFERENCE = `
## Campaign Type Inference
Analyze the user's request and infer which campaign type it most closely matches.
Apply the relevant design principles for that campaign type.
If the request doesn't map to a specific campaign type, use general email design principles.
`

const MAX_IMAGES = 20

async function loadCampaignLayer(campaignType?: CampaignType): Promise<string> {
  if (!campaignType || !(campaignType in CAMPAIGN_GUIDE_MODULES)) {
    return FALLBACK_INFERENCE
  }
  try {
    const mod = await CAMPAIGN_GUIDE_MODULES[campaignType]()
    return mod.default
  } catch (err: unknown) {
    console.warn('[buildSystemPrompt] Failed to load campaign guide:', err)
    return FALLBACK_INFERENCE
  }
}

export async function buildSystemPrompt(input: BuildSystemPromptInput): Promise<string> {
  const campaignLayer = await loadCampaignLayer(input.campaignType)
  const toneSnippetsLayer = formatToneSnippets(input.brandProfile)
  const productRefsLayer = input.productReferences
    ? formatProductReferences(input.productReferences)
    : null

  const layers: readonly string[] = [
    // Layer 1: Existing system prompt (never modified)
    SYSTEM_PROMPT,
    // Layer 2: Email design principles & brand kit application rules
    EMAIL_GUIDELINES,
    // Layer 3: Email section definitions
    EMAIL_SECTIONS,
    // Layer 4: Active brand kit (conditional)
    ...(input.brandProfile ? [formatBrandKitPrompt(input.brandProfile)] : []),
    // Layer 4b: Brand voice exemplars / tone snippets (conditional)
    ...(toneSnippetsLayer ? [toneSnippetsLayer] : []),
    // Layer 5: Image handling instructions
    IMAGE_HANDLING,
    // Layer 6: Campaign guide or fallback inference
    campaignLayer,
    // Layer 7a: Brand memory instructions (always present)
    MEMORY_INSTRUCTIONS,
    // Layer 7b: Brand memories (conditional)
    ...(input.brandMemories.length > 0 ? [formatBrandMemories(input.brandMemories)] : []),
    // Layer 8: Available media library images (conditional)
    ...(input.availableImages.length > 0 ? [formatAvailableImages(input.availableImages)] : []),
    // Layer 8b: Images attached in the current user turn (ephemeral, conditional)
    ...(input.chatAttachments && input.chatAttachments.length > 0
      ? [formatChatAttachments(input.chatAttachments)]
      : []),
    // Layer 9: Active Shopify product references (conditional)
    ...(productRefsLayer ? [productRefsLayer] : [])
  ]

  return layers.join('\n\n---\n\n')
}

function formatToneSnippets(brand: Brand | null): string | null {
  const snippets = (brand?.tone_snippets ?? []) as ReadonlyArray<ToneSnippet>
  if (snippets.length === 0) return null
  const limited = snippets.slice(0, MAX_TONE_SNIPPETS)
  const lines = limited.map((s, i) => `${i + 1}. ${s.label}\n   "${s.content}"`).join('\n')
  const overflow =
    snippets.length > MAX_TONE_SNIPPETS
      ? `\n\n(${snippets.length - MAX_TONE_SNIPPETS} more snippets exist for this brand; using the first ${MAX_TONE_SNIPPETS} per the configured cap.)`
      : ''
  return `## Brand Voice Exemplars
The following short pieces of brand-voice copy show how this brand writes. Match this voice — cadence, vocabulary, energy, formality — when generating headlines, body copy, CTAs, or any text content.

${lines}${overflow}`
}

function formatBrandMemories(memories: readonly BrandMemory[]): string {
  // Sort newest-first by created_at DESC (lexicographic on ISO-8601 strings is correct).
  const sorted = [...memories].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const limited = sorted.slice(0, MAX_BRAND_MEMORIES)
  const memoryLines = limited.map((m) => `- ${m.content}`).join('\n')
  const overflow =
    sorted.length > MAX_BRAND_MEMORIES
      ? `\n\n(${sorted.length - MAX_BRAND_MEMORIES} older memories exist; using the most recent ${MAX_BRAND_MEMORIES} per the configured cap.)`
      : ''

  return `## Brand Memories
The following are things you've learned about this brand from previous conversations.
Apply these in all your design decisions for this brand.

${memoryLines}${overflow}`
}

function formatProductReferences(refs: readonly ChatProductReference[]): string | null {
  if (refs.length === 0) return null
  const lines = refs
    .map((r, i) => {
      const priceLine =
        r.price_high && r.price_high !== r.price_low
          ? `   Price: ${r.price_low}–${r.price_high} ${r.currency}`
          : `   Price: ${r.price_low} ${r.currency}`
      const imageLine = r.primary_image_url
        ? `   Primary image: ${r.primary_image_url}`
        : `   Primary image: (none — ask user or call get_variant for media)`
      return `${i + 1}. ${r.title} (product_id: ${r.product_id}, handle: ${r.handle})\n${priceLine}\n${imageLine}`
    })
    .join('\n')
  return `## Active Product References
The user has pinned the following products as the subject of this design session. They persist across every turn until removed.

Use these as the products to feature in the email design. Call \`get_variant\` for full variant detail (sizes, colors, per-variant price/media), \`get_collection\` if the user wants related products, and other Shopify tools as needed. Insert product images via \`placeMediaImage\` on canvas nodes.

${lines}`
}

function formatChatAttachments(attachments: readonly ChatAttachmentForAI[]): string {
  const lines = attachments
    .map(
      (a, i) =>
        `${i + 1}. "${a.fileName}" (${a.width ?? '?'}x${a.height ?? '?'}px) — url: ${a.publicUrl}`
    )
    .join('\n')

  return `## Images Attached This Turn (Ephemeral)
The user attached the following images in their current message. Use them as visual reference when analyzing the request.

**Only call \`placeMediaImage\` on these URLs when the user explicitly asks to place an image on the canvas.** Otherwise treat them as references only (competitor inspiration, mood boards, sketches) and do not auto-insert them into the design.

${lines}`
}

export interface ShopifyContextInput {
  readonly brandId: string
  readonly hasConnection: boolean
  readonly conn?: { readonly shop_domain: string; readonly currency: string; readonly timezone: string }
  readonly topCollections?: ReadonlyArray<{ readonly title: string }>
  readonly bestsellers?: ReadonlyArray<{ readonly title: string }>
  readonly brandName?: string
}

export async function buildShopifyContextBlock(input: ShopifyContextInput): Promise<string> {
  if (!input.hasConnection || !input.conn) {
    return `## Brand: ${input.brandName ?? 'unknown'}\nShopify: not connected for this brand.`
  }
  const lines: string[] = []
  lines.push(`## Brand: ${input.brandName ?? 'unknown'}`)
  lines.push(`Shopify: connected → ${input.conn.shop_domain}`)
  lines.push(`Currency: ${input.conn.currency} · Timezone: ${input.conn.timezone}`)
  if (input.topCollections?.length)
    lines.push(`Top collections: ${input.topCollections.map((c) => c.title).join(', ')}`)
  if (input.bestsellers?.length)
    lines.push(`Bestsellers (30-day): ${input.bestsellers.map((b) => b.title).join(', ')}`)
  return lines.join('\n')
}

function formatAvailableImages(images: readonly AvailableImage[]): string {
  const limited = images.slice(0, MAX_IMAGES)
  const imageLines = limited
    .map(
      (img, i) =>
        `${i + 1}. "${img.fileName}" (${img.width ?? '?'}x${img.height ?? '?'}px, ${img.fileType}) — public_url: ${img.publicUrl} — media_id: ${img.mediaId}`
    )
    .join('\n')

  const overflow =
    images.length > MAX_IMAGES
      ? `\nShowing ${MAX_IMAGES} most recent images. Ask the user if they need a specific image not shown here.`
      : ''

  return `## Available Media Library Images
The following images are available for this brand. Use them when relevant via \`placeMediaImage\`.

${imageLines}${overflow}`
}
