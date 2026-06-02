<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import { useCanvasEditLock } from '@/composables/version-history/use-canvas-edit-lock'
import { useSnapshotsStore } from '@/stores/snapshots'

import AddVersionDialog from './AddVersionDialog.vue'
import AutosaveGroupHead from './AutosaveGroupHead.vue'
import CurrentVersionRow from './CurrentVersionRow.vue'
import FilterDropdown from './FilterDropdown.vue'
import RestoreConfirmModal from './RestoreConfirmModal.vue'
import SnapshotEmptyState from './SnapshotEmptyState.vue'
import SnapshotRow from './SnapshotRow.vue'

/**
 * Version-history right-panel (hi-fi 17.1–17.11). Composes the timeline:
 * Current version → named rows → collapsible autosave group. Wires every row
 * action to useSnapshotsStore + holds the single-owner canvas edit lock while
 * the panel is open (PRD §12.12). Preview shows the snapshot thumbnail via the
 * store (no live side-doc — engine has no side-render API).
 */

const props = defineProps<{ canvasId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useSnapshotsStore()
const router = useRouter()
const editLock = useCanvasEditLock()

const filterOpen = ref(false)
const groupCollapsed = ref(false)
const restoreTargetId = ref<string | null>(null)

onMounted(() => {
  void store.list(props.canvasId)
  editLock.lock()
})
onUnmounted(() => {
  editLock.unlock()
  store.exitPreview()
})

const loading = computed(() => store.loadingByCanvas[props.canvasId] === true)
const visible = computed(() => store.visibleFor(props.canvasId))
// "named" tracks label presence (matches SnapshotRow.isNamed) so a snapshot
// whose version info was deleted demotes back into the autosave group.
const named = computed(() => visible.value.filter((s) => !!s.label))
const autosaves = computed(() => visible.value.filter((s) => !s.label))
const restoreTarget = computed(
  () => visible.value.find((s) => s.id === restoreTargetId.value) ?? null,
)

function onRestore(id: string): void {
  restoreTargetId.value = id
}
async function confirmRestore(): Promise<void> {
  if (restoreTargetId.value) await store.restore(restoreTargetId.value, props.canvasId)
  restoreTargetId.value = null
}
async function onDuplicate(id: string): Promise<void> {
  const { canvas_id } = await store.duplicateToCanvas(id)
  await router.push(`/canvas/${canvas_id}`)
}
function onCopyLink(id: string): void {
  store.copyLink(id, props.canvasId)
}
async function onRename(id: string, label: string): Promise<void> {
  await store.rename(id, label, null)
}
async function onDeleteInfo(id: string): Promise<void> {
  await store.rename(id, null, null)
}
function onPreview(id: string): void {
  store.previewSnapshot(id)
}
</script>

<template>
  <div class="vh-panel">
    <div class="vh-head">
      <div class="ttl">Version history</div>
      <div class="icns">
        <button
          type="button"
          class="a"
          :class="{ open: filterOpen }"
          aria-label="Filter versions"
          @click="filterOpen = !filterOpen"
        >
          <KovaIcon name="list-filter" size="sm" aria-hidden="true" />
        </button>
        <button type="button" class="a" aria-label="Add to version history" @click="store.openAddDialog()">
          <KovaIcon name="plus" size="sm" aria-hidden="true" />
        </button>
        <button type="button" class="a" aria-label="Close version history" @click="emit('close')">
          <KovaIcon name="x" size="sm" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="filterOpen" class="vh-filter-pop">
      <FilterDropdown v-model:show-autosaves="store.showAutosaves" />
    </div>

    <div class="vh-instructions">
      Press <span class="glyph">⌘</span> + <span class="glyph">⌥</span> + <span class="glyph">S</span>
      to add to version history while editing.
    </div>

    <div class="vh-body" :class="{ empty: !loading && visible.length === 0 }">
      <template v-if="loading">
        <KovaSkeleton v-for="i in 6" :key="`skel-${i}`" class="vh-skeleton-row" />
      </template>

      <SnapshotEmptyState v-else-if="visible.length === 0" />

      <div v-else class="vh-timeline">
        <CurrentVersionRow />

        <SnapshotRow
          v-for="s in named"
          :key="s.id"
          :snapshot="s"
          :is-active="store.previewingId === s.id"
          :is-current="false"
          @restore-clicked="onRestore"
          @rename-clicked="onRename"
          @duplicate-clicked="onDuplicate"
          @copy-link-clicked="onCopyLink"
          @delete-info-clicked="onDeleteInfo"
          @preview="onPreview"
        />

        <template v-if="autosaves.length > 0">
          <AutosaveGroupHead
            :count="autosaves.length"
            :collapsed="groupCollapsed"
            @toggle="groupCollapsed = !groupCollapsed"
          />
          <template v-if="!groupCollapsed">
            <SnapshotRow
              v-for="s in autosaves"
              :key="s.id"
              :snapshot="s"
              :is-active="store.previewingId === s.id"
              :is-current="false"
              @restore-clicked="onRestore"
              @rename-clicked="onRename"
              @duplicate-clicked="onDuplicate"
              @copy-link-clicked="onCopyLink"
              @delete-info-clicked="onDeleteInfo"
              @preview="onPreview"
            />
          </template>
        </template>
      </div>
    </div>

    <RestoreConfirmModal
      v-if="restoreTarget"
      :snapshot="restoreTarget"
      @confirmed="confirmRestore"
      @cancelled="restoreTargetId = null"
    />
    <AddVersionDialog :canvas-id="canvasId" />
  </div>
</template>
