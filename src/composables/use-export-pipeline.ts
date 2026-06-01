import type { ExportFormat } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'

/**
 * Slice export pipeline (PRD 07b §Export).
 *
 * Adapted per handoff R9: the plan's `figma.exportAsync` / `figma.currentPage` do not
 * exist. Real export goes through the editor store's quality-aware `renderExportImage`
 * (it owns the private CanvasKit + renderer). The slice list comes from
 * `graph.getChildren(currentPageId)` filtered to SLICE nodes, NOT `figma.currentPage`.
 *
 * Phase A (current): per-file browser download fallback.
 * Phase B (future, gated `FEATURE_GATES.EXPORT_PIPELINE_ZIP_BATCHING`): JSZip batching —
 * deferred until `jszip` is added to deps; flip the gate + add the batch branch then.
 */
export interface ExportOpts {
  format: Extract<ExportFormat, 'PNG' | 'JPG'>
  scale: 1 | 2 | 3
  /** 0–1 fraction (JPG_QUALITY domain). Converted to the engine's 0–100 scale. */
  quality?: number
}

const MIME_BY_FORMAT: Record<ExportOpts['format'], string> = {
  PNG: 'image/png',
  JPG: 'image/jpeg'
}

function toEngineQuality(quality: number | undefined): number | undefined {
  if (quality === undefined) return undefined
  return Math.round(quality * 100)
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function useExportPipeline() {
  const editor = useEditorStore()

  function sliceNodes() {
    return editor.graph
      .getChildren(editor.state.currentPageId)
      .filter((node) => node.type === 'SLICE')
  }

  async function exportSingleSlice(sliceId: string, opts: ExportOpts): Promise<Blob> {
    const node = editor.graph.getNode(sliceId)
    if (node?.type !== 'SLICE') {
      throw new Error(`Slice not found: ${sliceId}`)
    }
    const bytes = await editor.renderExportImage(
      [sliceId],
      opts.scale,
      opts.format,
      toEngineQuality(opts.quality)
    )
    if (!bytes) {
      throw new Error(`Export failed for slice ${sliceId} (format=${opts.format})`)
    }
    return new Blob([bytes.buffer as ArrayBuffer], { type: MIME_BY_FORMAT[opts.format] })
  }

  async function exportAllSlices(opts: ExportOpts): Promise<Blob | null> {
    const slices = sliceNodes()
    const exported: Array<{ name: string; blob: Blob }> = []
    for (const slice of slices) {
      const blob = await exportSingleSlice(slice.id, opts)
      exported.push({ name: `${slice.name}.${opts.format.toLowerCase()}`, blob })
    }
    if (exported.length === 0) return null

    // Phase A — per-file download fallback (triggers N downloads).
    for (const { name, blob } of exported) downloadBlob(blob, name)
    return exported[exported.length - 1]?.blob ?? null
  }

  return { exportSingleSlice, exportAllSlices, sliceNodes }
}
