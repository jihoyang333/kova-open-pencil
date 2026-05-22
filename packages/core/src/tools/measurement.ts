/**
 * Cluster 07a — page-level Measurement creation tool.
 *
 * Measurements are NOT a NodeType per Figma's data model (verified
 * 2026-05-17). They live on the CANVAS as a separate collection of records
 * anchored to SceneNodes by side. This ToolDef wraps
 * `SceneGraph.addMeasurement(canvasId, start, end, options?)`.
 */
import type { MeasurementOffset, MeasurementSide } from '../scene-graph'

import { defineTool } from './schema'

export const addMeasurement = defineTool({
  name: 'add_measurement',
  mutates: true,
  description:
    'Add a measurement annotation between two SceneNodes on a CANVAS, anchored by side. ' +
    'Both anchor nodes must be descendants of the target canvas.',
  params: {
    canvas_id: { type: 'string', description: 'CANVAS node ID', required: true },
    start_node_id: { type: 'string', description: 'Anchor node ID for measurement start', required: true },
    start_side: {
      type: 'string',
      description: 'Edge of the start anchor: TOP, RIGHT, BOTTOM, or LEFT',
      required: true,
      enum: ['TOP', 'RIGHT', 'BOTTOM', 'LEFT']
    },
    end_node_id: { type: 'string', description: 'Anchor node ID for measurement end', required: true },
    end_side: {
      type: 'string',
      description: 'Edge of the end anchor: TOP, RIGHT, BOTTOM, or LEFT',
      required: true,
      enum: ['TOP', 'RIGHT', 'BOTTOM', 'LEFT']
    },
    offset_type: {
      type: 'string',
      description: 'Offset variant — INNER (relative to anchor bounds) or OUTER (fixed pixel distance)',
      enum: ['INNER', 'OUTER']
    },
    offset_value: {
      type: 'number',
      description: 'Offset magnitude — INNER expects -1..1, OUTER expects a non-zero pixel distance'
    },
    free_text: { type: 'string', description: 'Override label (empty = use auto-computed value)' }
  },
  execute: (figma, args) => {
    try {
      const offset: MeasurementOffset | undefined =
        args.offset_type === 'INNER'
          ? { type: 'INNER', relative: args.offset_value ?? 0 }
          : args.offset_type === 'OUTER'
            ? { type: 'OUTER', fixed: args.offset_value ?? 8 }
            : undefined
      // Trust boundary: tool-args arrive as `string` from the AI-adapter layer
      // but the schema above declares an `enum` constraint on each side. The
      // adapter enforces enum membership before reaching here, so the cast to
      // MeasurementSide is safe at this layer.
      const m = figma.graph.addMeasurement(
        args.canvas_id,
        { nodeId: args.start_node_id, side: args.start_side as MeasurementSide },
        { nodeId: args.end_node_id, side: args.end_side as MeasurementSide },
        { offset, freeText: args.free_text ?? '' }
      )
      return { measurement_id: m.id }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
})
