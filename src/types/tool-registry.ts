export type ToolSlot =
  | 'move'
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'pen'
  | 'text'
  | 'measurement'
  | 'ai'
  | 'components'

export interface ToolDef {
  id: string
  slot: ToolSlot
  parent?: 'move' | 'frame' | 'pen'
  icon: string
  label: string
  key?: string
  keySequence?: string[]
  when?: () => boolean
  onActivate: () => void
  disabled?: boolean
  tooltip?: string
}
