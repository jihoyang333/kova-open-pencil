<script setup lang="ts">
// Cluster 05 — IdentityCard.vue (A7.3.2, PRD §3.3)
// Narrative card: title + body text preview + edit mode textarea.
// "Draft via interview" CTA is HIDDEN in MVP (BRAND_KIT_AI_INTERVIEW_ENABLED = false).

import { ref, computed } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import type { IdentityCard, IdentityCardKey } from '@/types/brand-kit'

const CARD_LABELS: Record<IdentityCardKey, string> = {
  about: 'About the brand',
  voice: 'Voice & tone',
  story: 'Story & origin',
}

const props = defineProps<{
  cardKey: IdentityCardKey
  card?: IdentityCard
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', key: IdentityCardKey, content: string): void
}>()

const isEditing = ref(false)
const draft = ref('')

const label = computed(() => CARD_LABELS[props.cardKey])

function startEdit(): void {
  draft.value = props.card?.content ?? ''
  isEditing.value = true
}

function cancelEdit(): void {
  isEditing.value = false
  draft.value = ''
}

async function saveEdit(): Promise<void> {
  emit('save', props.cardKey, draft.value)
  isEditing.value = false
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="nar-card">
    <div class="hd">
      <span class="tt">{{ label }}</span>
      <KovaButton
        v-if="!isEditing"
        variant="ghost"
        size="sm"
        icon="pencil"
        @click="startEdit"
      >
        Edit
      </KovaButton>
    </div>

    <div v-if="isEditing">
      <textarea
        v-model="draft"
        class="input"
        rows="5"
        style="width: 100%; resize: vertical; font: inherit; font-size: 13px"
        :aria-label="`Edit ${label}`"
      />
      <div style="display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end">
        <KovaButton variant="ghost" size="sm" :disabled="saving" @click="cancelEdit">
          Discard
        </KovaButton>
        <KovaButton variant="accent" size="sm" :loading="saving" @click="saveEdit">
          Save
        </KovaButton>
      </div>
    </div>

    <div v-else>
      <div v-if="card?.content" class="body">{{ card.content }}</div>
      <div v-else class="body empty">Not drafted yet — write your story.</div>
    </div>

    <div v-if="card && !isEditing" class="ft">
      <span v-if="card.last_edited_at">Edited {{ formatDate(card.last_edited_at) }}</span>
      <span>{{ card.word_count }} words</span>
    </div>
  </div>
</template>
