// W1 Cluster 11 / W0-4 / CT-003 — sole lucide registry for the app.
//
// Every icon rendered anywhere in Kova must flow through this registry via
// the <KovaIcon name="..."> primitive. The four forbidden alternates —
//   - raw <icon-lucide-*> auto-import tags with dynamic names
//   - <Icon name="lucide:..."> Nuxt-style binding
//   - i-lucide-* UnoCSS class strings
//   - <component :is="`icon-lucide-${name}`"> template-literal resolution
// — are scrubbed cluster-by-cluster in Wave 2 / 3 fix passes.
//
// Why a static map: unplugin-icons resolves icons at build time via auto-
// imports. Dynamic <component :is="`icon-lucide-${name}`"> fails at runtime
// because the resolved component name is not in scope. A static
// Map<string, Component> (a) tree-shakes, (b) survives runtime, (c) lets us
// throw a useful dev-mode warning on unknown names.
//
// Adding a new icon: add an import line + a Map entry below. Order is not
// significant; alphabetical is preferred for readability.

import type { Component } from 'vue'

import IconAlertTriangle from '~icons/lucide/alert-triangle'
import IconArrowLeft from '~icons/lucide/arrow-left'
import IconArrowRight from '~icons/lucide/arrow-right'
import IconCheck from '~icons/lucide/check'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronRight from '~icons/lucide/chevron-right'
import IconCloudOff from '~icons/lucide/cloud-off'
import IconCrop from '~icons/lucide/crop'
import IconInfo from '~icons/lucide/info'
import IconLoader from '~icons/lucide/loader'
import IconPlus from '~icons/lucide/plus'
import IconRuler from '~icons/lucide/ruler'
import IconSearch from '~icons/lucide/search'
import IconSparkles from '~icons/lucide/sparkles'
import IconX from '~icons/lucide/x'

export const KOVA_ICON_REGISTRY: ReadonlyMap<string, Component> = new Map<
  string,
  Component
>([
  ['alert-triangle', IconAlertTriangle],
  ['arrow-left', IconArrowLeft],
  ['arrow-right', IconArrowRight],
  ['check', IconCheck],
  ['chevron-down', IconChevronDown],
  ['chevron-right', IconChevronRight],
  ['cloud-off', IconCloudOff],
  ['crop', IconCrop],
  ['info', IconInfo],
  ['loader', IconLoader],
  ['plus', IconPlus],
  ['ruler', IconRuler],
  ['search', IconSearch],
  ['sparkles', IconSparkles],
  ['x', IconX],
])

export type KovaIconSize = 'xs' | 'sm' | 'md' | 'lg'

export const KOVA_ICON_SIZE_PX: Readonly<Record<KovaIconSize, number>> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
}
