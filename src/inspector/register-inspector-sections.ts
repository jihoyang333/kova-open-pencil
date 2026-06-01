import type { NodeType } from '@open-pencil/core'
import { registerInspectorSection } from '@/composables/use-inspector-router'

// Legacy (Cluster 06 / OpenPencil) sections — proven, reused for the areas without a
// dedicated 07b component.
import PageSection from '@/components/properties/PageSection.vue'
import PositionSection from '@/components/properties/PositionSection.vue'
import LayoutSection from '@/components/properties/LayoutSection.vue'
import AppearanceSection from '@/components/properties/AppearanceSection.vue'
import TypographySection from '@/components/properties/TypographySection.vue'
import ExportSection from '@/components/properties/ExportSection.vue'

// Cluster 07b sections — compose the inspector components the audit found orphaned.
import BooleanOpsRow from '@/components/inspector/BooleanOpsRow.vue'
import FillInspectorSection from '@/components/inspector/sections/FillInspectorSection.vue'
import StrokeInspectorSection from '@/components/inspector/sections/StrokeInspectorSection.vue'
import EffectsInspectorSection from '@/components/inspector/sections/EffectsInspectorSection.vue'

const TEXT_ONLY: NodeType[] = ['TEXT']

/**
 * Populate the InspectorRouter registry at app boot (PRD 06 §12.15 — Cluster 07b
 * registers Position/Layout/Appearance/Fill/Stroke/Typography/Effects/Export at
 * priorities 20-100). Without this the desktop inspector renders empty (audit H1).
 *
 * registerInspectorSection is idempotent by id, so calling this more than once
 * (e.g. across editor re-mounts) is safe.
 */
export function registerInspectorSections(): void {
  registerInspectorSection({ id: 'page', component: PageSection, priority: 10, supports: 'none' })
  registerInspectorSection({ id: 'position', component: PositionSection, priority: 20, supports: 'all' })
  registerInspectorSection({ id: 'layout', component: LayoutSection, priority: 30, supports: 'all' })
  registerInspectorSection({ id: 'appearance', component: AppearanceSection, priority: 40, supports: 'all' })
  // BooleanOpsRow self-disables below 2 selected nodes, so it is safe to show for any
  // selection; it is the headline use of the orphaned boolean component.
  registerInspectorSection({ id: 'boolean', component: BooleanOpsRow, priority: 45, supports: 'all' })
  registerInspectorSection({ id: 'fill', component: FillInspectorSection, priority: 50, supports: 'all' })
  registerInspectorSection({ id: 'stroke', component: StrokeInspectorSection, priority: 60, supports: 'all' })
  registerInspectorSection({ id: 'typography', component: TypographySection, priority: 70, supports: TEXT_ONLY })
  registerInspectorSection({ id: 'effects', component: EffectsInspectorSection, priority: 80, supports: 'all' })
  registerInspectorSection({ id: 'export', component: ExportSection, priority: 90, supports: 'all' })
}
