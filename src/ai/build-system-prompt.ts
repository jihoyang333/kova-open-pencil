import SYSTEM_PROMPT from '@/ai/system-prompt.md?raw'
import EMAIL_GUIDELINES from '@/data/email-guidelines.md?raw'
import EMAIL_SECTIONS from '@/data/email-sections.md?raw'
import IMAGE_HANDLING from '@/data/image-handling.md?raw'
import MEMORY_INSTRUCTIONS from '@/data/memory-instructions.md?raw'
import type { Brand } from '@/types/kova/database'
import type { BrandMemory } from '@/types/kova/brand-memory'
import { formatBrandKitPrompt } from '@/utils/format-brand-prompt'

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

export type CampaignType = 'educational' | 'community' | 'sales' | 'social-proof' | 'product-highlights'

export interface BuildSystemPromptInput {
  readonly brandProfile: Brand | null
  readonly availableImages: readonly AvailableImage[]
  readonly brandMemories: readonly BrandMemory[]
  readonly chatAttachments?: readonly ChatAttachmentForAI[]
  readonly campaignType?: CampaignType
}

const CAMPAIGN_GUIDE_MODULES: Record<CampaignType, () => Promise<{ default: string }>> = {
  educational: () => import('@/data/campaigns/educational.md?raw'),
  community: () => import('@/data/campaigns/community-branded.md?raw'),
  sales: () => import('@/data/campaigns/sales.md?raw'),
  'social-proof': () => import('@/data/campaigns/social-proof.md?raw'),
  'product-highlights': () => import('@/data/campaigns/product-highlights.md?raw'),
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

  const layers: readonly string[] = [
    // Layer 1: Existing system prompt (never modified)
    SYSTEM_PROMPT,
    // Layer 2: Email design principles & brand kit application rules
    EMAIL_GUIDELINES,
    // Layer 3: Email section definitions
    EMAIL_SECTIONS,
    // Layer 4: Active brand kit (conditional)
    ...(input.brandProfile ? [formatBrandKitPrompt(input.brandProfile)] : []),
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
  ]

  return layers.join('\n\n---\n\n')
}

function formatBrandMemories(memories: readonly BrandMemory[]): string {
  const memoryLines = memories.map((m) => `- ${m.content}`).join('\n')

  return `## Brand Memories
The following are things you've learned about this brand from previous conversations.
Apply these in all your design decisions for this brand.

${memoryLines}`
}

function formatChatAttachments(attachments: readonly ChatAttachmentForAI[]): string {
  const lines = attachments
    .map(
      (a, i) =>
        `${i + 1}. "${a.fileName}" (${a.width ?? '?'}x${a.height ?? '?'}px) — url: ${a.publicUrl}`,
    )
    .join('\n')

  return `## Images Attached This Turn (Ephemeral)
The user attached the following images in their current message. Use them as visual reference when analyzing the request.

**Only call \`placeMediaImage\` on these URLs when the user explicitly asks to place an image on the canvas.** Otherwise treat them as references only (competitor inspiration, mood boards, sketches) and do not auto-insert them into the design.

${lines}`
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
