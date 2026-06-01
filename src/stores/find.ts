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

  const dimmedNodeIds = computed(() => {
    if (!active.value) return []
    // Thin here: DimLayerOverlay does the scene-graph traversal (with viewport
    // culling) against figma.currentPage.children minus these matched IDs.
    return matchedNodeIds.value
  })

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
    dimmedNodeIds,
    open,
    close,
    setQuery,
    focusNode,
    exitOnDimClick,
  }
})
