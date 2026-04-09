<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
} from 'reka-ui'
import { computed, ref } from 'vue'

import { uiButton } from '@/components/ui/button'
import { uiInput } from '@/components/ui/input'
import { SHOW_DEV_FEATURES } from '@/constants'
import { useAIChat } from '@/composables/use-chat'

const { modelID } = useAIChat()

const { status } = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
}>()

const emit = defineEmits<{
  submit: [text: string]
  stop: []
}>()

const input = ref('')

const isStreaming = computed(() => status === 'streaming' || status === 'submitted')
const selectedModelName = computed(() => modelID.value)

function handleSubmit(e: Event) {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  emit('submit', text)
  input.value = ''
}
</script>

<template>
  <TooltipProvider>
    <div class="shrink-0 border-t border-border px-3 py-2">
      <!-- Model display (dev only) -->
      <div v-if="SHOW_DEV_FEATURES" class="mb-1.5 flex items-center gap-1">
        <div class="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted">
          <icon-lucide-bot class="size-3" />
          {{ selectedModelName }}
        </div>
      </div>

      <!-- Input form -->
      <form class="flex gap-1.5" @submit="handleSubmit">
        <input
          v-model="input"
          type="text"
          data-test-id="chat-input"
          placeholder="Design an email with Kova AI..."
          :class="uiInput({ class: 'min-w-0 flex-1 placeholder:text-muted' })"
          :disabled="isStreaming"
          @paste.stop
          @copy.stop
          @cut.stop
        />
        <TooltipRoot v-if="isStreaming">
          <TooltipTrigger as-child>
            <button
              type="button"
              data-test-id="chat-stop-button"
              :class="
                uiButton({
                  tone: 'accent',
                  shape: 'rounded',
                  size: 'sm',
                  class: 'shrink-0 px-2.5 py-1.5 font-medium'
                })
              "
              @click="emit('stop')"
            >
              <icon-lucide-square class="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="rounded bg-surface px-2 py-1 text-[10px] text-canvas"
            >
              Stop generating
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <TooltipRoot v-else>
          <TooltipTrigger as-child>
            <button
              type="submit"
              data-test-id="chat-send-button"
              :class="
                uiButton({
                  tone: 'accent',
                  shape: 'rounded',
                  size: 'sm',
                  class: 'shrink-0 px-2.5 py-1.5 font-medium'
                })
              "
              :disabled="!input.trim()"
            >
              <icon-lucide-send class="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="rounded bg-surface px-2 py-1 text-[10px] text-canvas"
            >
              Send message
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </form>
    </div>
  </TooltipProvider>
</template>
