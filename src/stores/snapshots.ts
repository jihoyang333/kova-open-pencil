import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { toast } from '@/composables/use-toast'
import { useEditorStore } from '@/stores/editor'
import { useAuthStore } from '@/stores/auth'
import { useBrandsStore } from '@/stores/brands'

const BUCKET = 'canvas-snapshots'
const SIGNED_URL_TTL = 600

export type SnapshotKind = 'autosave' | 'manual' | 'pre_restore' | 'disconnect' | 'tab_close'

export interface Snapshot {
  id: string
  canvas_id: string
  brand_id: string
  user_id: string
  taken_at: string
  kind: SnapshotKind
  label: string | null
  description: string | null
  scene_blob_path: string
  scene_size_bytes: number
  thumbnail_path: string | null
  parent_snapshot_id: string | null
  format_version: number
  retention_class: 'free' | 'paid' | 'permanent'
}

export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'quota_exceeded' | 'unknown' }

export const useSnapshotsStore = defineStore('snapshots', () => {
  const byCanvasId = reactive<Record<string, Snapshot[]>>({})
  const loadingByCanvas = reactive<Record<string, boolean>>({})
  const previewingId = ref<string | null>(null)
  const panelOpen = ref(false)
  const addDialogOpen = ref(false)
  const showAutosaves = ref(true)

  function visibleFor(canvasId: string): Snapshot[] {
    const all = byCanvasId[canvasId] ?? []
    return showAutosaves.value ? all : all.filter((s) => s.kind !== 'autosave' || !!s.label)
  }

  function ctx(): { userId: string; brandId: string } {
    const userId = useAuthStore().user?.id
    const brandId = useBrandsStore().selectedBrandId
    if (!userId || !brandId) throw new Error('snapshots: missing user or brand context')
    return { userId, brandId }
  }

  async function list(canvasId: string): Promise<void> {
    loadingByCanvas[canvasId] = true
    try {
      const { data, error } = await supabase
        .from('canvas_snapshots')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('taken_at', { ascending: false })
      if (!error) byCanvasId[canvasId] = (data as Snapshot[] | null) ?? []
    } finally {
      loadingByCanvas[canvasId] = false
    }
  }

  async function uploadBlob(path: string, bytes: Uint8Array, contentType: string): Promise<boolean> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes as BlobPart, { contentType, upsert: true })
    return !error
  }

  async function create(args: {
    canvasId: string
    kind: SnapshotKind
    label?: string | null
    description?: string | null
    parentSnapshotId?: string | null
  }): Promise<CreateResult> {
    const editor = useEditorStore()
    const { userId, brandId } = ctx()

    const bytes = await editor.serializeSnapshot()
    const thumb = editor.captureSnapshotThumbnail()

    const snapshotId = crypto.randomUUID()
    const blobPath = `${userId}/${brandId}/${args.canvasId}/${snapshotId}.fig`
    const thumbPath = thumb
      ? `${userId}/thumbnails/${brandId}/${args.canvasId}/${snapshotId}.png`
      : null

    if (!(await uploadBlob(blobPath, bytes, 'application/octet-stream'))) {
      return { ok: false, reason: 'unknown' }
    }
    if (thumb && thumbPath) await uploadBlob(thumbPath, thumb, 'image/png')

    const { data: id, error } = await supabase.rpc('create_snapshot', {
      p_canvas_id: args.canvasId,
      p_kind: args.kind,
      p_label: args.label ?? null,
      p_description: args.description ?? null,
      p_scene_blob_path: blobPath,
      p_scene_size_bytes: bytes.byteLength,
      p_thumbnail_path: thumbPath,
      p_parent_snapshot_id: args.parentSnapshotId ?? null,
      p_id: snapshotId,
    })
    if (error) {
      if (error.message.includes('quota_exceeded')) {
        toast.show('Version history is full (100 MB per brand). Old auto-saves clear after 30 days.', 'warning')
        return { ok: false, reason: 'quota_exceeded' }
      }
      return { ok: false, reason: 'unknown' }
    }
    await list(args.canvasId)
    if (args.kind === 'manual') toast.show('Saved to version history')
    return { ok: true, id: id as string }
  }

  async function restore(snapshotId: string, canvasId: string): Promise<{ ok: boolean; reason?: string }> {
    const editor = useEditorStore()
    const { userId, brandId } = ctx()

    // 1. Snapshot current state for the pre-restore backup.
    const currentBytes = await editor.serializeSnapshot()
    const currentPath = `${userId}/${brandId}/${canvasId}/pre-${crypto.randomUUID()}.fig`
    if (!(await uploadBlob(currentPath, currentBytes, 'application/octet-stream'))) {
      return { ok: false, reason: 'upload_failed' }
    }

    // 2. Atomic RPC — inserts the pre_restore row, returns the target blob path.
    const { data, error } = await supabase.rpc('restore_snapshot', {
      p_target_snapshot_id: snapshotId,
      p_current_scene_blob_path: currentPath,
      p_current_scene_size_bytes: currentBytes.byteLength,
      p_current_thumbnail_path: null,
    })
    if (error) return { ok: false, reason: error.message }
    const targetPath = (data ?? '') as string
    if (!targetPath) return { ok: false, reason: 'unknown' }

    // 3. Download the target blob + swap it into the live editor.
    const signRes = (await supabase.storage
      .from(BUCKET)
      .createSignedUrl(targetPath, SIGNED_URL_TTL)) as {
      data: { signedUrl: string } | null
      error: unknown
    }
    if (signRes.error || !signRes.data) return { ok: false, reason: 'signed_url_failed' }
    const buf = await fetch(signRes.data.signedUrl).then((r) => r.arrayBuffer())
    await editor.loadSnapshot(new Uint8Array(buf))

    await list(canvasId)
    toast.show('Restored to this version')
    return { ok: true }
  }

  async function rename(snapshotId: string, label: string | null, description: string | null): Promise<void> {
    const { error } = await supabase.rpc('rename_snapshot', {
      p_snapshot_id: snapshotId,
      p_label: label,
      p_description: description,
    })
    if (error) throw error
    for (const arr of Object.values(byCanvasId)) {
      const row = arr.find((r) => r.id === snapshotId)
      if (row) {
        row.label = label
        row.description = description
      }
    }
  }

  async function duplicateToCanvas(snapshotId: string): Promise<{ canvas_id: string }> {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/snapshots/duplicate-to-canvas', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token ?? ''}`,
        'X-Idempotency-Key': crypto.randomUUID().replace(/-/g, ''),
      },
      body: JSON.stringify({ snapshot_id: snapshotId }),
    })
    if (!res.ok) throw new Error(`Duplicate failed: ${res.status}`)
    return (await res.json()) as { canvas_id: string }
  }

  function versionLink(snapshotId: string, canvasId: string): string {
    return `${window.location.origin}/canvas/${canvasId}?version=${snapshotId}`
  }

  function copyLink(snapshotId: string, canvasId: string): void {
    void navigator.clipboard.writeText(versionLink(snapshotId, canvasId))
    toast.show('Link copied to clipboard')
  }

  async function getSignedThumbnailUrl(thumbnailPath: string): Promise<string | null> {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(thumbnailPath, SIGNED_URL_TTL)
    return data?.signedUrl ?? null
  }

  function previewSnapshot(id: string): void {
    previewingId.value = id
  }
  function exitPreview(): void {
    previewingId.value = null
  }
  function openPanel(): void {
    panelOpen.value = true
  }
  function closePanel(): void {
    panelOpen.value = false
    exitPreview()
  }
  function openAddDialog(): void {
    addDialogOpen.value = true
  }
  function closeAddDialog(): void {
    addDialogOpen.value = false
  }

  return {
    byCanvasId,
    loadingByCanvas,
    previewingId,
    panelOpen,
    addDialogOpen,
    showAutosaves,
    visibleFor,
    list,
    create,
    restore,
    rename,
    duplicateToCanvas,
    versionLink,
    copyLink,
    getSignedThumbnailUrl,
    previewSnapshot,
    exitPreview,
    openPanel,
    closePanel,
    openAddDialog,
    closeAddDialog,
  }
})
