<script setup lang="ts">
import { computed, ref } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { useBrandsStore } from '@/stores/brands'
import type { Snapshot } from '@/stores/snapshots'

/**
 * One timeline row (hi-fi 17.1 / 17.3 / 17.4 / 17.5 / 17.6). States: idle /
 * hover (••• reveal, CSS) / active (menu open or previewing) / named (filled
 * --ink dot + label + 2-line desc). Right-click or ••• opens the 5-item Reka
 * menu; "Name this version" swaps the title region for an inline rename input.
 */

const props = defineProps<{ snapshot: Snapshot; isActive: boolean; isCurrent: boolean }>()
const emit = defineEmits<{
  'restore-clicked': [id: string]
  'rename-clicked': [id: string, label: string]
  'duplicate-clicked': [id: string]
  'copy-link-clicked': [id: string]
  'delete-info-clicked': [id: string]
  preview: [id: string]
}>()

const auth = useAuthStore()
const brands = useBrandsStore()

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const isNamed = computed(() => props.snapshot.kind === 'manual' || !!props.snapshot.label)
const formattedDate = computed(() => dateFmt.format(new Date(props.snapshot.taken_at)))
const deleteInfoEnabled = computed(
  () => props.snapshot.kind === 'manual' || props.snapshot.label !== null,
)

const authorName = computed(() => auth.profile?.name ?? 'You')
const authorInitials = computed(() =>
  authorName.value
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase(),
)
const brandColor = computed(() => brands.selectedBrand?.colors?.primary || null)
const avatarTint = computed(() =>
  brandColor.value ? { '--vh-brand-color': brandColor.value } : undefined,
)

const menuOpen = ref(false)
const renaming = ref(false)
const renameValue = ref('')

const vFocus = { mounted: (el: HTMLInputElement) => el.focus() }

function openMenu(): void {
  menuOpen.value = true
}
function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}
function startRename(): void {
  menuOpen.value = false
  renameValue.value = props.snapshot.label ?? ''
  renaming.value = true
}
function commitRename(): void {
  const v = renameValue.value.trim()
  if (v) emit('rename-clicked', props.snapshot.id, v)
  renaming.value = false
}
function cancelRename(): void {
  renameValue.value = props.snapshot.label ?? ''
  renaming.value = false
}
function fire(event: 'restore-clicked' | 'duplicate-clicked' | 'copy-link-clicked'): void {
  emit(event, props.snapshot.id)
  menuOpen.value = false
}
function fireDeleteInfo(): void {
  if (!deleteInfoEnabled.value) return
  emit('delete-info-clicked', props.snapshot.id)
  menuOpen.value = false
}
function onRowClick(): void {
  if (renaming.value) return
  emit('preview', props.snapshot.id)
}
</script>

<template>
  <div
    class="vh-row"
    :class="{ active: isActive || menuOpen, current: isCurrent, named: isNamed }"
    @contextmenu.prevent="openMenu"
    @click="onRowClick"
  >
    <div class="dot"><div class="core" /></div>

    <div class="body">
      <input
        v-if="renaming"
        v-focus
        data-testid="rename-input"
        class="rename"
        :value="renameValue"
        aria-label="Version name"
        @click.stop
        @input="renameValue = ($event.target as HTMLInputElement).value"
        @keydown.enter="commitRename"
        @keydown.esc="cancelRename"
      />
      <template v-else>
        <div class="ttl">{{ isNamed ? snapshot.label : formattedDate }}</div>
        <div v-if="isNamed && snapshot.description" class="desc">{{ snapshot.description }}</div>
        <div class="by">
          <span class="av brand" :style="avatarTint">{{ authorInitials }}</span>
          <template v-if="isNamed">{{ authorName }} · {{ formattedDate }}</template>
          <template v-else>{{ authorName }}</template>
        </div>
      </template>
    </div>

    <div
      v-if="!renaming"
      data-testid="more"
      class="more"
      role="button"
      aria-label="Version actions"
      @click.stop="toggleMenu"
    >
      <KovaIcon name="more-horizontal" size="sm" aria-hidden="true" />
    </div>

    <div v-if="menuOpen" class="menu w-260" @click.stop>
      <div data-testid="menu-item" class="item" @click="startRename">
        <span class="lbl">Name this version</span>
      </div>
      <div data-testid="menu-item" class="item" @click="fire('restore-clicked')">
        <span class="lbl">Restore this version</span>
      </div>
      <div data-testid="menu-item" class="item" @click="fire('duplicate-clicked')">
        <span class="lbl">Duplicate</span>
      </div>
      <div
        data-testid="menu-item"
        class="item"
        :class="{ disabled: !deleteInfoEnabled }"
        @click="fireDeleteInfo"
      >
        <span class="lbl">Delete version info</span>
      </div>
      <div data-testid="menu-item" class="item" @click="fire('copy-link-clicked')">
        <span class="lbl">Copy link</span>
      </div>
    </div>
  </div>
</template>
