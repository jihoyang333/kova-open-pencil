import { onMounted, onUnmounted } from 'vue'
import { useSnapshotsStore } from '@/stores/snapshots'

// ⌥⌘S (Mac) / Ctrl+Alt+S (Win/Linux) opens the "Add to version history" dialog.
// Uses e.code (CLAUDE.md: never e.key — the Option key transforms characters on Mac).
export function matchesVersionShortcut(e: KeyboardEvent): boolean {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const modOk = isMac ? e.metaKey && e.altKey : e.ctrlKey && e.altKey
  return modOk && e.code === 'KeyS'
}

export function useVersionHistoryShortcut() {
  const store = useSnapshotsStore()
  function onKey(e: KeyboardEvent): void {
    if (matchesVersionShortcut(e)) {
      e.preventDefault()
      store.openAddDialog()
    }
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onUnmounted(() => window.removeEventListener('keydown', onKey))
}
