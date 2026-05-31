<script setup lang="ts">
// Cluster 05 — VoiceDraftConfirmModal.vue (PRD §3.9, guardrail 00e §6 #5)
//
// CRITICAL: AI-scraped brand voice NEVER writes to brands.* silently.
// User must click "Confirm & save" or "Discard draft". Closing modal
// without action = Skip (draft remains open for next visit per ratification).
//
// Uses useVoiceDraft composable. On confirm/discard: emits done.

import { computed, ref, watch } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import { useVoiceDraft } from '@/composables/use-voice-draft'
import { toast } from '@/composables/use-toast'
import type { VoiceDraftPayload } from '@/types/brand-kit'

const props = defineProps<{
  open: boolean
  /** True = onboarding context; shows "Skip for now" text link */
  showSkip?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirmed'): void
  (e: 'discarded'): void
  (e: 'skipped'): void
}>()

const { draft, confirmDraft, discardDraft } = useVoiceDraft()

const voiceContent = ref('')
const snippets = ref<Array<{ label: string; category: string; content: string }>>([])
const isSaving = ref(false)
const isDiscarding = ref(false)

watch(
  () => draft.value,
  (d) => {
    if (d) {
      voiceContent.value = d.draft_payload.voice.content
      snippets.value = d.draft_payload.tone_snippets.map((s) => ({ ...s }))
    }
  },
  { immediate: true },
)

const editedPayload = computed<VoiceDraftPayload>(() => ({
  voice: { content: voiceContent.value },
  tone_snippets: snippets.value,
}))

function removeSnippet(index: number): void {
  snippets.value = snippets.value.filter((_, i) => i !== index)
}

async function onConfirm(): Promise<void> {
  isSaving.value = true
  try {
    await confirmDraft(editedPayload.value)
    toast.show('Brand voice confirmed and saved.')
    emit('confirmed')
    emit('update:open', false)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to confirm draft'
    toast.show(msg, 'error')
  } finally {
    isSaving.value = false
  }
}

async function onDiscard(): Promise<void> {
  isDiscarding.value = true
  try {
    await discardDraft()
    toast.show('Draft discarded.')
    emit('discarded')
    emit('update:open', false)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to discard draft'
    toast.show(msg, 'error')
  } finally {
    isDiscarding.value = false
  }
}

function onSkip(): void {
  // Skip closes modal, leaves voice_drafts row open (confirmed_at IS NULL).
  // Next visit re-opens modal. Per PRD §3.9 ratification 2026-05-17.
  emit('skipped')
  emit('update:open', false)
}

function onClose(): void {
  // Closing without CTA = Skip behavior (does NOT auto-discard).
  onSkip()
}
</script>

<template>
  <KovaModal
    :open="props.open"
    title="Confirm brand voice draft"
    description="We analyzed your storefront and drafted a brand voice and a few tone snippets. Review and confirm before saving."
    size="md"
    :close-on-backdrop="false"
    @update:open="(v) => { if (!v) onClose() }"
  >
    <div style="display: flex; flex-direction: column; gap: 18px">
      <!-- Voice description -->
      <div class="fld">
        <label for="vd-voice">Voice description</label>
        <textarea
          id="vd-voice"
          v-model="voiceContent"
          class="input"
          rows="4"
          style="width: 100%; resize: vertical; font: inherit; font-size: 13px"
          aria-label="Voice description"
        />
      </div>

      <!-- Tone snippet candidates -->
      <div v-if="snippets.length > 0">
        <div style="font-size: 12.5px; color: var(--ink-2); margin-bottom: 8px; font-weight: 500">
          Tone snippet candidates ({{ snippets.length }})
        </div>
        <div
          v-for="(snip, idx) in snippets"
          :key="idx"
          style="border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; margin-bottom: 6px; background: var(--page)"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px">
            <input
              v-model="snip.label"
              class="input"
              style="flex: 1; font-size: 12.5px; padding: 4px 8px"
              :aria-label="`Snippet ${idx + 1} label`"
              placeholder="Label"
            />
            <input
              v-model="snip.category"
              class="input"
              style="width: 100px; font-size: 12px; padding: 4px 8px"
              :aria-label="`Snippet ${idx + 1} category`"
              placeholder="Category"
            />
            <button
              type="button"
              class="btn ghost sm"
              style="padding: 4px 6px"
              :aria-label="`Remove snippet ${idx + 1}`"
              @click="removeSnippet(idx)"
            >
              ×
            </button>
          </div>
          <textarea
            v-model="snip.content"
            class="input"
            rows="2"
            style="width: 100%; font-size: 12px; resize: vertical"
            :aria-label="`Snippet ${idx + 1} content`"
          />
        </div>
      </div>

      <!-- Privacy disclosure -->
      <p style="font-size: 11.5px; color: var(--ink-3); line-height: 1.5; margin: 0">
        Storefront content was analyzed via Anthropic (Claude).
        See <a href="/privacy" style="color: var(--accent)">privacy policy</a>
        for our sub-processor disclosure.
      </p>
    </div>

    <template #foot-left>
      <KovaButton
        v-if="showSkip"
        variant="ghost"
        size="sm"
        :disabled="isSaving || isDiscarding"
        @click="onSkip"
      >
        Skip for now
      </KovaButton>
    </template>

    <template #foot>
      <KovaButton
        variant="ghost"
        :disabled="isSaving || isDiscarding"
        :loading="isDiscarding"
        @click="onDiscard"
      >
        Discard draft
      </KovaButton>
      <KovaButton
        variant="accent"
        :disabled="isDiscarding || isSaving"
        :loading="isSaving"
        @click="onConfirm"
      >
        Confirm &amp; save
      </KovaButton>
    </template>
  </KovaModal>
</template>
