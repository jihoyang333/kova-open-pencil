<script setup lang="ts">
// PRD 04 §6.4.1 — Profile section (A7.1).
// Founder lock: avatar PNG/JPG only, 5MB max, sharp-normalized server-side.

import { computed, onMounted, ref } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'
import UnsavedPill from '@/components/account/UnsavedPill.vue'
import { useAccountStore } from '@/stores/account'
import { useAvatarUpload } from '@/composables/account/use-avatar-upload'

const account = useAccountStore()
const avatar = useAvatarUpload()
const fileInput = ref<HTMLInputElement | null>(null)
const isSaving = ref(false)

onMounted(() => {
  void account.load()
})

const initials = computed(() => {
  const n = (account.draft.name ?? '').trim()
  if (n === '') return '?'
  return n.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('')
})

const avatarLabel = computed(() => {
  if (avatar.status.value === 'uploading') return 'Uploading…'
  if (account.draft.avatarStoragePath !== null) return 'Custom image'
  return 'Default initials'
})

function pickFile(): void {
  fileInput.value?.click()
}

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file === undefined) return
  const ok = await avatar.upload(file)
  if (ok && avatar.path.value !== null) {
    account.patch({ avatarStoragePath: avatar.path.value })
    // patching original via load() so isDirty stays false for this server-mutated field
    await account.load()
  }
  target.value = ''
}

async function removeAvatar(): Promise<void> {
  const ok = await avatar.remove()
  if (ok) {
    account.patch({ avatarStoragePath: null })
    await account.load()
  }
}

async function onSave(): Promise<void> {
  isSaving.value = true
  try {
    await account.save()
  } finally {
    isSaving.value = false
  }
}

function setPref(key: string, value: unknown): void {
  account.patch({ preferences: { ...account.draft.preferences, [key]: value } })
}

function getPref<T>(key: string, fallback: T): T {
  const v = (account.draft.preferences as Record<string, unknown>)[key]
  return v === undefined ? fallback : (v as T)
}
</script>

<template>
  <section class="acc-section">
    <AccountSectionHeader title="Profile" subtitle="Your account details + accessibility preferences." />

    <UnsavedPill :visible="account.isDirty" @save="onSave" @discard="account.discard" />

    <div class="acc-fields">
      <div class="fld">
        <label>Avatar</label>
        <div class="acc-avatar-row">
          <div class="ava-lg" :aria-label="`Avatar: ${avatarLabel}`">
            <img
              v-if="account.draft.avatarStoragePath !== null"
              :src="`/storage/v1/object/public/media-assets/${account.draft.avatarStoragePath}`"
              alt=""
            />
            <template v-else>{{ initials }}</template>
          </div>
          <div class="acc-avatar-meta">
            <span>{{ avatarLabel }}</span>
            <span class="mono">{{ avatar.error.value ?? '' }}</span>
          </div>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg" class="acc-avatar-input" hidden @change="onFileChange" />
          <button type="button" class="btn sm" @click="pickFile">
            <KovaIcon name="upload" size="sm" />
            Upload image
          </button>
          <button v-if="account.draft.avatarStoragePath !== null" type="button" class="btn sm ghost" @click="removeAvatar">
            Remove
          </button>
        </div>
      </div>

      <div class="fld">
        <label for="profile-name">Name</label>
        <input id="profile-name" class="input" type="text" :value="account.draft.name" maxlength="80" @input="account.patch({ name: ($event.target as HTMLInputElement).value })" />
      </div>

      <div class="fld">
        <label>Accessibility</label>
        <div class="seg" role="radiogroup" aria-label="Text size">
          <button
            v-for="size in [{ k: '87.5', l: '87.5%' }, { k: '100', l: '100%' }, { k: '112.5', l: '112.5%' }]"
            :key="size.k"
            type="button"
            class="s"
            :class="{ active: getPref('textSize', '100') === size.k }"
            role="radio"
            :aria-checked="getPref('textSize', '100') === size.k"
            @click="setPref('textSize', size.k)"
          >
            {{ size.l }}
          </button>
        </div>
        <label class="acc-toggle-row">
          <input type="checkbox" :checked="getPref('reduceMotion', false)" @change="setPref('reduceMotion', ($event.target as HTMLInputElement).checked)" />
          Reduce motion
        </label>
        <label class="acc-toggle-row">
          <input type="checkbox" :checked="getPref('highContrast', false)" @change="setPref('highContrast', ($event.target as HTMLInputElement).checked)" />
          High contrast (borders only)
        </label>
      </div>

      <div class="fld">
        <label>Notifications</label>
        <label class="acc-toggle-row">
          <input type="checkbox" :checked="getPref('emailProductUpdates', true)" @change="setPref('emailProductUpdates', ($event.target as HTMLInputElement).checked)" />
          Product updates
        </label>
        <label class="acc-toggle-row">
          <input type="checkbox" :checked="getPref('emailSyncAlerts', true)" @change="setPref('emailSyncAlerts', ($event.target as HTMLInputElement).checked)" />
          Shopify sync alerts
        </label>
      </div>
    </div>
  </section>
</template>
