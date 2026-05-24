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
import IconBell from '~icons/lucide/bell'
import IconCheck from '~icons/lucide/check'
import IconCheckCircle from '~icons/lucide/check-circle'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconChevronRight from '~icons/lucide/chevron-right'
import IconCloudOff from '~icons/lucide/cloud-off'
import IconCreditCard from '~icons/lucide/credit-card'
import IconCrop from '~icons/lucide/crop'
import IconDownload from '~icons/lucide/download'
import IconExternalLink from '~icons/lucide/external-link'
import IconFileQuestion from '~icons/lucide/file-question'
import IconGlobe from '~icons/lucide/globe'
import IconHome from '~icons/lucide/home'
import IconImage from '~icons/lucide/image'
import IconInfo from '~icons/lucide/info'
import IconKey from '~icons/lucide/key'
import IconLink2 from '~icons/lucide/link-2'
import IconLoader from '~icons/lucide/loader'
import IconLogOut from '~icons/lucide/log-out'
import IconMail from '~icons/lucide/mail'
import IconPalette from '~icons/lucide/palette'
import IconPlug from '~icons/lucide/plug'
import IconPlus from '~icons/lucide/plus'
import IconRefreshCw from '~icons/lucide/refresh-cw'
import IconRotateCw from '~icons/lucide/rotate-cw'
import IconRuler from '~icons/lucide/ruler'
import IconSearch from '~icons/lucide/search'
import IconShield from '~icons/lucide/shield'
import IconSparkles from '~icons/lucide/sparkles'
import IconTag from '~icons/lucide/tag'
import IconTrash2 from '~icons/lucide/trash-2'
import IconUpload from '~icons/lucide/upload'
import IconUser from '~icons/lucide/user'
import IconWifiOff from '~icons/lucide/wifi-off'
import IconX from '~icons/lucide/x'
import IconXCircle from '~icons/lucide/x-circle'

export const KOVA_ICON_REGISTRY: ReadonlyMap<string, Component> = new Map<
  string,
  Component
>([
  ['alert-triangle', IconAlertTriangle],
  ['arrow-left', IconArrowLeft],
  ['arrow-right', IconArrowRight],
  ['bell', IconBell],
  ['check', IconCheck],
  ['check-circle', IconCheckCircle],
  ['chevron-down', IconChevronDown],
  ['chevron-right', IconChevronRight],
  ['cloud-off', IconCloudOff],
  ['credit-card', IconCreditCard],
  ['crop', IconCrop],
  ['download', IconDownload],
  ['external-link', IconExternalLink],
  ['file-question', IconFileQuestion],
  ['globe', IconGlobe],
  ['home', IconHome],
  ['image', IconImage],
  ['info', IconInfo],
  ['key', IconKey],
  ['link-2', IconLink2],
  ['loader', IconLoader],
  ['log-out', IconLogOut],
  ['mail', IconMail],
  ['palette', IconPalette],
  ['plug', IconPlug],
  ['plus', IconPlus],
  ['refresh-cw', IconRefreshCw],
  ['rotate-cw', IconRotateCw],
  ['ruler', IconRuler],
  ['search', IconSearch],
  ['shield', IconShield],
  ['sparkles', IconSparkles],
  ['tag', IconTag],
  ['trash-2', IconTrash2],
  ['upload', IconUpload],
  ['user', IconUser],
  ['wifi-off', IconWifiOff],
  ['x', IconX],
  ['x-circle', IconXCircle],
])

export type KovaIconSize = 'xs' | 'sm' | 'md' | 'lg'

export const KOVA_ICON_SIZE_PX: Readonly<Record<KovaIconSize, number>> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
}
