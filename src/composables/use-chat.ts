import { createAnthropic } from '@ai-sdk/anthropic'
import { Chat } from '@ai-sdk/vue'
import { DirectChatTransport, stepCountIs, ToolLoopAgent, wrapLanguageModel } from 'ai'
import { computed, ref } from 'vue'

import SYSTEM_PROMPT from '@/ai/system-prompt.md?raw'
import { MAX_AGENT_STEPS, createAITools, recordStepUsage, resetRunSteps } from '@/ai/tools'
import { stripPreviousTurnImages } from '@/composables/use-chat-images'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useEditorStore } from '@/stores/editor'
import { ACP_AGENTS, IS_BROWSER, IS_TAURI } from '@open-pencil/core'

import type { ACPAgentID, AIProviderID } from '@open-pencil/core'
import type { ChatTransport, UIMessage } from 'ai'

const providerID = ref<AIProviderID>('anthropic')
const modelID = ref(import.meta.env.VITE_AI_MODEL ?? 'claude-sonnet-4-6')
const activeTab = ref<'design' | 'ai'>('design')

const isACPProvider = computed(() => providerID.value.startsWith('acp:'))

const isConfigured = computed(() => {
  if (isACPProvider.value) return IS_TAURI
  return !!useAuthStore().user
})

function createModel() {
  const anthropic = createAnthropic({
    baseURL: '/api/ai-proxy',
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
  // TODO(M5): Replace SYSTEM_PROMPT with buildSystemPrompt() once brand profile,
  // memories, and media stores are available. See buildSystemPrompt() for 8-layer assembly.
  const agent = new ToolLoopAgent({
    model: wrappedModel,
    instructions: SYSTEM_PROMPT,
    tools,
    maxOutputTokens: 16384,
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
    providerOptions: ANTHROPIC_CACHE_CONTROL,
    prepareCall: (options) => {
      resetRunSteps()
      return {
        ...options,
        maxOutputTokens: 16384,
        providerOptions: ANTHROPIC_CACHE_CONTROL
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

async function ensureChat(): Promise<Chat<UIMessage> | null> {
  if (!isConfigured.value) return null
  if (!chat) {
    const transport = isACPProvider.value ? await createACPTransport() : createTransport()
    chat = new Chat<UIMessage>({ transport })
  }
  return chat
}

function resetChat() {
  chat = null
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
    resetChat
  }
}
