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
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import { useVoiceDraft } from '@/composables/use-voice-draft'
import { toast } from '@/composables/use-toast'
import type { VoiceDraftPayload } from '@/types/brand-kit'

const { open, showSkip } = defineProps<{
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
    :open="open"
    title="Confirm brand voice draft"
    description="We analyzed your storefront and drafted a brand voice and a few tone snippets. Review and confirm before saving."
    size="md"
    :close-on-backdrop="false"
    @update:open="(v) => { if (!v) onClose() }"
  >
    <div class="bk-form-col--wide">
      <!-- Voice description -->
      <div class="fld">
        <label for="vd-voice">Voice description</label>
        <textarea
          id="vd-voice"
          v-model="voiceContent"
          class="input bk-textarea"
          rows="4"
          aria-label="Voice description"
        />
      </div>

      <!-- Tone snippet candidates -->
      <div v-if="snippets.length > 0">
        <div class="bk-subhead">
          Tone snippet candidates ({{ snippets.length }})
        </div>
        <div
          v-for="(snip, idx) in snippets"
          :key="idx"
          class="bk-snip-card"
        >
          <div class="bk-snip-row">
            <input
              v-model="snip.label"
              class="input bk-snip-label-input"
              :aria-label="`Snippet ${idx + 1} label`"
              placeholder="Label"
            />
            <input
              v-model="snip.category"
              class="input bk-snip-cat-input"
              :aria-label="`Snippet ${idx + 1} category`"
              placeholder="Category"
            />
            <button
              type="button"
              class="btn ghost sm bk-snip-remove"
              :aria-label="`Remove snippet ${idx + 1}`"
              @click="removeSnippet(idx)"
            >
              <KovaIcon name="x" size="sm" />
            </button>
          </div>
          <textarea
            v-model="snip.content"
            class="input bk-snip-content"
            rows="2"
            :aria-label="`Snippet ${idx + 1} content`"
          />
        </div>
      </div>

      <!-- Privacy disclosure -->
      <p class="bk-privacy-note">
        Storefront content was analyzed via Anthropic (Claude).
        See <a href="/privacy" class="bk-link">privacy policy</a>
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
