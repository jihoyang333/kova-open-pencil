import { createAnthropic } from '@ai-sdk/anthropic'
import { Chat } from '@ai-sdk/vue'
import { DirectChatTransport, stepCountIs, ToolLoopAgent, wrapLanguageModel } from 'ai'
import { computed, ref } from 'vue'

import { buildSystemPrompt } from '@/ai/build-system-prompt'
import SYSTEM_PROMPT from '@/ai/system-prompt.md?raw'
import { MAX_AGENT_STEPS, createAITools, recordStepUsage, resetRunSteps } from '@/ai/tools'
import { stripPreviousTurnImages } from '@/composables/use-chat-images'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useBrandMemoriesStore } from '@/stores/brand-memories'
import { useBrandsStore } from '@/stores/brands'
import { useEditorStore } from '@/stores/editor'
import { useMediaStore } from '@/stores/media'
import { ACP_AGENTS, IS_BROWSER, IS_TAURI } from '@open-pencil/core'

import type { AvailableImage, CampaignType, ChatAttachmentForAI } from '@/ai/build-system-prompt'
import type { BrandMemory } from '@/types/kova/brand-memory'
import type { ChatMessage } from '@/types/kova/chat'
import type { ACPAgentID, AIProviderID } from '@open-pencil/core'
import type { ChatTransport, UIMessage } from 'ai'

type AssistantFinishHandler = (msg: UIMessage) => void
let assistantFinishHandler: AssistantFinishHandler | null = null

function setAssistantFinishHandler(fn: AssistantFinishHandler | null): void {
  assistantFinishHandler = fn
}

const providerID = ref<AIProviderID>('anthropic')
const modelID = ref(import.meta.env.VITE_AI_MODEL ?? 'claude-sonnet-4-6')
const activeTab = ref<'design' | 'ai'>('design')

// Set by ChatPopup before each sendMessage call so prepareCall can layer
// the matching campaign guide into the system prompt. M5.5 will replace
// this with a richer per-message context object.
const activeCampaignType = ref<CampaignType | undefined>(undefined)

function setActiveCampaignType(type: CampaignType | undefined): void {
  activeCampaignType.value = type
}

// Per-user-turn cache for brand memories. Cleared by resetChat() and refreshed
// at the start of each user turn via refreshActiveBrandMemories(). Prevents the
// per-step Supabase round-trip that would otherwise fire inside prepareCall.
const activeBrandMemories = ref<readonly BrandMemory[]>([])

export async function refreshActiveBrandMemories(brandId: string | undefined): Promise<void> {
  if (!brandId) { activeBrandMemories.value = []; return }
  activeBrandMemories.value = await useBrandMemoriesStore().fetchMemories(brandId)
}

// Set by ChatPopup before each sendMessage call so prepareCall can surface the
// user's current-turn chat attachments to the model (distinct from the media
// library list). Reset to [] after each send to keep the ephemeral framing.
const activeChatAttachmentsForAI = ref<readonly ChatAttachmentForAI[]>([])

function setActiveChatAttachmentsForAI(
  attachments: readonly ChatAttachmentForAI[],
): void {
  activeChatAttachmentsForAI.value = attachments
}

const isACPProvider = computed(() => providerID.value.startsWith('acp:'))

const isConfigured = computed(() => {
  if (isACPProvider.value) return IS_TAURI
  return !!useAuthStore().user
})

// `@ai-sdk/anthropic` requires `apiKey` (or env `ANTHROPIC_API_KEY`) at provider
// construction even when a custom `fetch` is supplied — it builds the `x-api-key`
// header eagerly via `loadApiKey()`. The browser has neither, so we pass a
// placeholder; our proxy overwrites `x-api-key` with the real server-side key
// before forwarding to Anthropic. Removing this constant will resurface
// AI_LoadAPIKeyError at request time and break chat silently.
export const ANTHROPIC_PROXY_PLACEHOLDER_API_KEY = 'kova-proxy-placeholder'

// The SDK appends `/messages` to baseURL, mirroring Anthropic's `/v1/messages`.
// Our proxy route is registered at `/api/ai-proxy/v1/messages` (see api/ai-proxy/v1/messages.ts
// and src/dev/api-plugin.ts), so the baseURL must include the `/v1` segment to
// resolve correctly. Dropping `/v1` returns 404 from the dev API plugin.
export const ANTHROPIC_PROXY_BASE_URL = '/api/ai-proxy/v1'

function createModel() {
  const anthropic = createAnthropic({
    apiKey: ANTHROPIC_PROXY_PLACEHOLDER_API_KEY,
    baseURL: ANTHROPIC_PROXY_BASE_URL,
    fetch: async (url, init) => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const headers = new Headers(init?.headers)
      headers.set('Authorization', `Bearer ${token}`)

      return globalThis.fetch(url, { ...init, headers })
    },
  })

  return anthropic(modelID.value)
}

let overrideTransport: (() => ChatTransport<UIMessage>) | null = null

let chat: Chat<UIMessage> | null = null

const ANTHROPIC_CACHE_CONTROL = {
  anthropic: { cacheControl: { type: 'ephemeral' } }
} as const

let acpTransportInstance: { destroy(): Promise<void> } | null = null

async function createACPTransport() {
  const agentId = providerID.value.replace('acp:', '') as ACPAgentID
  const agentDef = ACP_AGENTS.find((a) => a.id === agentId)
  if (!agentDef) throw new Error(`Unknown ACP agent: ${agentId}`)

  const { ACPChatTransport } = await import('@/ai/acp-transport')
  const { homeDir } = await import('@tauri-apps/api/path')
  await acpTransportInstance?.destroy()
  const transport = new ACPChatTransport({ agentDef, cwd: await homeDir() })
  acpTransportInstance = transport
  return transport
}

function createTransport(): ChatTransport<UIMessage> {
  if (overrideTransport) return overrideTransport()

  void acpTransportInstance?.destroy()
  acpTransportInstance = null

  const tools = createAITools(useEditorStore())
  const brandsStore = useBrandsStore()
  const mediaStore = useMediaStore()

  const wrappedModel = wrapLanguageModel({
    model: createModel(),
    middleware: {
      specificationVersion: 'v3',
      transformParams: async ({ params }) => ({
        ...params,
        prompt: stripPreviousTurnImages(params.prompt),
      }),
    },
  })
  // The agent's static `instructions` is a fallback only — `prepareCall` rebuilds
  // the full layered system prompt per LLM call so brand profile, media library,
  // and campaign type stay fresh as the user navigates and uploads.
  const agent = new ToolLoopAgent({
    model: wrappedModel,
    instructions: SYSTEM_PROMPT,
    tools,
    maxOutputTokens: 16384,
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
    providerOptions: ANTHROPIC_CACHE_CONTROL,
    prepareCall: async (options) => {
      resetRunSteps()
      const brandProfile = brandsStore.selectedBrand
      const availableImages: AvailableImage[] = mediaStore.images.map((img) => ({
        fileName: img.file_name,
        fileType: img.file_type,
        width: img.width,
        height: img.height,
        publicUrl: mediaStore.getPublicUrl(img.storage_path),
        mediaId: img.id,
      }))
      const instructions = await buildSystemPrompt({
        brandProfile,
        availableImages,
        brandMemories: activeBrandMemories.value,
        chatAttachments: activeChatAttachmentsForAI.value,
        campaignType: activeCampaignType.value,
      })
      return {
        ...options,
        instructions,
        maxOutputTokens: 16384,
        providerOptions: ANTHROPIC_CACHE_CONTROL,
      }
    },
    onStepFinish: ({ usage }) => {
      recordStepUsage({
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        cacheReadTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
        cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens ?? 0,
        timestamp: Date.now()
      })
    }
  })

  // Cast narrows the tool-set generic widened by InferUITools; DirectChatTransport
  // implements ChatTransport so the cast is structurally sound.
  return new DirectChatTransport({ agent }) as unknown as ChatTransport<UIMessage>
}

function toUIMessages(stored: readonly ChatMessage[]): UIMessage[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: 'text' as const, text: m.content }],
  }))
}

async function ensureChat(messages?: UIMessage[]): Promise<Chat<UIMessage> | null> {
  if (!isConfigured.value) return null
  if (!chat) {
    const transport = isACPProvider.value ? await createACPTransport() : createTransport()
    chat = new Chat<UIMessage>({
      transport,
      messages,
      onFinish: ({ message, isError, isAbort }) => {
        if (isError || isAbort) return
        assistantFinishHandler?.(message)
      },
    })
  }
  return chat
}

function resetChat() {
  chat = null
  activeBrandMemories.value = []
}

if (IS_BROWSER) {
  window.__OPEN_PENCIL_SET_TRANSPORT__ = (factory) => {
    overrideTransport = factory
  }
}

export function useAIChat() {
  return {
    providerID,
    modelID,
    activeTab,
    isConfigured,
    ensureChat,
    resetChat,
    toUIMessages,
    refreshActiveBrandMemories,
    setActiveCampaignType,
    setActiveChatAttachmentsForAI,
    setAssistantFinishHandler,
  }
}
