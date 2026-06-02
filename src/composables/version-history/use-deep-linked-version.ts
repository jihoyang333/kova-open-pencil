import { onMounted } from 'vue'
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router'
import { toast } from '@/composables/use-toast'
import { useSnapshotsStore } from '@/stores/snapshots'

// Opens the version-history panel + previews a deep-linked version when the canvas
// route carries ?version=<snapshotId>. Extracted from the composable for testing.
export async function resolveDeepLink(
  route: Pick<RouteLocationNormalizedLoaded, 'query' | 'params'>,
  store: ReturnType<typeof useSnapshotsStore>,
): Promise<void> {
  const versionId = route.query['version']
  if (typeof versionId !== 'string') return
  const canvasId = route.params['canvasId']
  if (typeof canvasId !== 'string') return

  await store.list(canvasId)
  const exists = store.byCanvasId[canvasId]?.find((s) => s.id === versionId)
  if (!exists) {
    toast.show('Version not found', 'warning')
    return
  }
  store.openPanel()
  store.previewSnapshot(versionId)
}

export function useDeepLinkedVersion() {
  const route = useRoute()
  const store = useSnapshotsStore()
  onMounted(() => void resolveDeepLink(route, store))
}
