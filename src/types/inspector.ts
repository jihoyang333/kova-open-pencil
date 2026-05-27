import type { Component } from 'vue'
import type { NodeType } from '@open-pencil/core'

// RATIFIED 2026-05-17 PRD 06 §12.15 — Inspector section priority registry.
// Cluster 06 ships PageSection (priority 10) at init; Cluster 07b registers 20-100 at app boot.
//   10  PageSection         (no-selection)
//   20  PositionSection
//   30  LayoutSection
//   40  AppearanceSection
//   50  FillSection
//   60  StrokeSection
//   70  TypographySection   (text-only)
//   80  EffectsSection
//   90  ExportSection
//  100  VariablesSection    (page-level)
export interface InspectorSectionDef {
  id: string
  component: Component
  priority: number
  supports: 'none' | NodeType[] | 'all'
  multiSelect?: boolean
}
