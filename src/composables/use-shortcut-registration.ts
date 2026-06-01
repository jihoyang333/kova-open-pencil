import { SHORTCUTS } from '@/constants/overlays'
import { useEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'
import { useEyedropper } from '@/composables/use-eyedropper'
import { useCopyPasteProps } from '@/composables/use-copy-paste-props'
import { makeFigmaFromStore } from '@/automation/figma-factory'
import { colorToFill } from '@open-pencil/core'
import { useShortcutsFallback, type ShortcutBinding } from '@/composables/use-shortcuts-fallback'

type BooleanOpKind = 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'

/**
 * Registers 07b's keyboard shortcuts (PRD §12.5/§12.7/§12.12). Boolean ops are
 * ⌥⇧U/S/I/E (W5a — match Figma), pixel grid Shift+', find Cmd+F / Esc.
 *
 * Adapted per R2: there is no `figma.booleanOperation` singleton — booleans run through
 * makeFigmaFromStore(...).booleanOperation(op, ids). Cluster 08's central registry is not
 * shipped (FEATURE_GATES.KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE === false), so we install
 * the Phase-A fallback handler. When 08 lands, the same bindings re-register through it.
 *
 * Call once from a long-lived parent's setup (EditorView).
 */
export function useShortcutRegistration(): ShortcutBinding[] {
  const editor = useEditorStore()
  const findStore = useFindStore()
  const eyedropper = useEyedropper()
  const cpProps = useCopyPasteProps()

  function applyBoolean(op: BooleanOpKind): boolean {
    const ids = editor.selectedNodes.value.map((n) => n.id)
    if (ids.length < 2) return false
    makeFigmaFromStore(editor).booleanOperation(op, ids)
    editor.requestRepaint()
    return true
  }

  const bindings: ShortcutBinding[] = [
    { id: 'boolean.union', keys: SHORTCUTS.BOOLEAN_UNION, action: () => applyBoolean('UNION') },
    { id: 'boolean.subtract', keys: SHORTCUTS.BOOLEAN_SUBTRACT, action: () => applyBoolean('SUBTRACT') },
    { id: 'boolean.intersect', keys: SHORTCUTS.BOOLEAN_INTERSECT, action: () => applyBoolean('INTERSECT') },
    { id: 'boolean.exclude', keys: SHORTCUTS.BOOLEAN_EXCLUDE, action: () => applyBoolean('EXCLUDE') },
    { id: 'props.copy', keys: SHORTCUTS.PROPS_COPY, action: () => (cpProps.copy(), true) },
    { id: 'props.paste', keys: SHORTCUTS.PROPS_PASTE, action: () => (cpProps.paste(), true) },
    {
      id: 'tool.eyedropper',
      keys: SHORTCUTS.EYEDROPPER,
      action: () => {
        // Sample a canvas pixel, then apply it as the selection's solid fill
        // through the engine (repaint + undo + persist). Snapshot the selection
        // now so the async sample applies to what was selected on activation.
        const sel = editor.selectedNodes.value
        eyedropper.activate((hex) => {
          for (const n of sel) {
            editor.updateNodeWithUndo(n.id, { fills: [colorToFill(hex)] }, 'Eyedropper fill')
          }
        })
        return true
      }
    },
    {
      id: 'view.pixelGrid',
      keys: SHORTCUTS.PIXEL_GRID_TOGGLE,
      action: () => {
        editor.state.overlays.pixelGrid = !editor.state.overlays.pixelGrid
        return true
      }
    },
    { id: 'find.open', keys: SHORTCUTS.FIND_OPEN, action: () => (findStore.open(), true) },
    {
      id: 'find.close',
      keys: SHORTCUTS.FIND_CLOSE,
      action: () => {
        if (!findStore.active) return false
        findStore.close()
        return true
      }
    }
  ]

  // Phase A: Cluster 08's central registry is not shipped
  // (FEATURE_GATES.KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE === false), so install the local
  // window keydown fallback. Phase B: when 08 lands, gate this and re-register `bindings`
  // through the central registry instead.
  useShortcutsFallback(bindings)

  return bindings
}
