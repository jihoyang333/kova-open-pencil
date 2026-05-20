// Cluster 11 Plan Task 4.3a — menu types consumed by <KovaMenu>.

export interface MenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  destructive?: boolean
  handler: () => void
}

export interface MenuSeparator {
  type: 'separator'
}

export interface MenuSection {
  type: 'section'
  label: string
}

export type MenuEntry = MenuItem | MenuSeparator | MenuSection

export function isMenuItem(e: MenuEntry): e is MenuItem {
  return !('type' in e)
}

export function isMenuSeparator(e: MenuEntry): e is MenuSeparator {
  return 'type' in e && e.type === 'separator'
}

export function isMenuSection(e: MenuEntry): e is MenuSection {
  return 'type' in e && e.type === 'section'
}
