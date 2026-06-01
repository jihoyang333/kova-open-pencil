import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Find canvas-focus mode (PRD 07b §12.12 — Cluster 07b owns find end-to-end per CT-022).
 * Store holds find state only; useFindSearch writes matchedNodeIds, useCameraPan
 * watches focusedNodeId, FindOverlay wires the selection write on dim-click.
 */
export const useFindStore = defineStore('find', () => {
  const active = ref(false)
  const query = ref('')
  const matchedNodeIds = ref<string[]>([])
  const focusedNodeId = ref<string | null>(null)

  const isMultiMatch = computed(() => matchedNodeIds.value.length > 1 && focusedNodeId.value === null)

  const isFocused = computed(() => focusedNodeId.value !== null || matchedNodeIds.value.length === 1)

  // The dim set (page subtree minus matches) is derived in FindOverlay, which has the
  // scene-graph access; the store stays decoupled from the graph (audit M3 removed a
  // stale getter that returned matchedNodeIds and referenced a fictional figma API).

  function open(): void {
    active.value = true
    query.value = ''
    matchedNodeIds.value = []
    focusedNodeId.value = null
  }

  function close(): void {
    active.value = false
    query.value = ''
    matchedNodeIds.value = []
    focusedNodeId.value = null
  }

  function setQuery(q: string): void {
    query.value = q
    // useFindSearch composable watches `query` and writes `matchedNodeIds`.
  }

  function focusNode(id: string): void {
    focusedNodeId.value = id
    // useCameraPan watches `focusedNodeId` and triggers panToNode(id).
  }

  function exitOnDimClick(_clickedNodeId: string): void {
    close()
    // Selection write (useEditorStore.setSelection([clickedNodeId])) wired by
    // FindOverlay's click handler; store stays decoupled from editor here.
  }

  return {
    active,
    query,
    matchedNodeIds,
    focusedNodeId,
    isMultiMatch,
    isFocused,
    open,
    close,
    setQuery,
    focusNode,
    exitOnDimClick,
  }
})
