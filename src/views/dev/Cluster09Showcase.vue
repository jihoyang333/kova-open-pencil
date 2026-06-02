<script setup lang="ts">
import { ref } from 'vue'

import SnapshotTimelinePanel from '@/components/version-history/SnapshotTimelinePanel.vue'
import RestoreConfirmModal from '@/components/version-history/RestoreConfirmModal.vue'
import TrashConfirmModal from '@/components/trash/TrashConfirmModal.vue'
import { useSnapshotsStore, type Snapshot } from '@/stores/snapshots'

/**
 * /dev/cluster-09 — Version-history showcase (hi-fi 17 + 15) for the per-screen
 * visual-diff loop + founder browser smoke. Backend is stubbed (store.list is a
 * no-op + seeded fixtures) so the surfaces render deterministically with no
 * Supabase round-trip.
 */

const POPULATED = 'demo-populated'
const EMPTY = 'demo-empty'

const mk = (over: Partial<Snapshot>): Snapshot =>
  ({
    id: crypto.randomUUID(),
    canvas_id: POPULATED,
    brand_id: 'b1',
    user_id: 'u1',
    taken_at: '2026-04-28T18:17:00Z',
    kind: 'autosave',
    label: null,
    description: null,
    scene_blob_path: '',
    scene_size_bytes: 0,
    thumbnail_path: null,
    parent_snapshot_id: null,
    format_version: 1,
    retention_class: 'free',
    ...over,
  }) as Snapshot

const store = useSnapshotsStore()
store.list = async () => {}
store.byCanvasId[POPULATED] = [
  mk({ kind: 'manual', label: 'v2 hero update', description: 'Updated hero CTA copy + replaced product hero image with the spring lineup.', taken_at: '2026-04-25T11:20:00Z' }),
  mk({ taken_at: '2026-04-28T18:17:00Z' }),
  mk({ taken_at: '2026-04-28T17:12:00Z' }),
  mk({ taken_at: '2026-04-28T13:52:00Z' }),
  mk({ taken_at: '2026-04-25T11:20:00Z' }),
  mk({ taken_at: '2026-04-24T00:56:00Z' }),
  mk({ taken_at: '2026-04-23T22:44:00Z' }),
  mk({ taken_at: '2026-04-23T15:50:00Z' }),
  mk({ taken_at: '2026-04-23T14:58:00Z' }),
]
store.byCanvasId[EMPTY] = []

const restoreSnap = mk({ taken_at: '2026-04-28T17:12:00Z' })
const showRestore = ref(false)
const showTrash = ref(false)
</script>

<template>
  <div class="h-full w-full overflow-y-auto bg-[var(--bg)] p-[32px] text-[var(--ink)]">
    <header class="mx-auto mb-[28px] max-w-[760px]">
      <h1 class="m-0 text-[22px] font-semibold tracking-tight">Cluster 09 · Version history + Trash</h1>
      <p class="m-0 mt-[6px] text-[13px] leading-[1.5] text-[var(--ink-3)]">
        Hi-fi 17 (version-history panel) + 15 (trash confirm). Surfaces render against the dark
        canvas surface; the right rail is the production 264px width.
      </p>
      <div class="mt-[16px] flex gap-[8px]">
        <button class="btn" @click="store.openAddDialog()">Open Add dialog (17.8/17.9)</button>
        <button class="btn" @click="showRestore = true">Open Restore confirm (17.10)</button>
        <button class="btn danger" @click="showTrash = true">Open Trash confirm (B13.1)</button>
      </div>
    </header>

    <div class="flex items-start justify-center gap-[40px]">
      <section>
        <div class="mb-[8px] text-[11px] tracking-widest text-[var(--ink-3)] uppercase">
          17.1 / 17.3 · Populated (current + named + autosave group)
        </div>
        <div class="h-[620px] w-[264px] border-x border-[var(--line)] bg-[var(--rail)]">
          <SnapshotTimelinePanel :canvas-id="POPULATED" />
        </div>
      </section>

      <section>
        <div class="mb-[8px] text-[11px] tracking-widest text-[var(--ink-3)] uppercase">
          17.11 · Empty state
        </div>
        <div class="h-[620px] w-[264px] border-x border-[var(--line)] bg-[var(--rail)]">
          <SnapshotTimelinePanel :canvas-id="EMPTY" />
        </div>
      </section>
    </div>

    <RestoreConfirmModal
      v-if="showRestore"
      :snapshot="restoreSnap"
      @confirmed="showRestore = false"
      @cancelled="showRestore = false"
    />
    <TrashConfirmModal
      v-if="showTrash"
      canvas-name="Spring Drop · 04"
      @confirmed="showTrash = false"
      @cancelled="showTrash = false"
    />
  </div>
</template>
