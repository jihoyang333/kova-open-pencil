<script setup lang="ts">
/**
 * TopChrome — Cluster 06 Task 9.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .topbar` (lines 100-141).
 * h-topbar height, rail bg, hairline bottom border, padded x-3.
 *
 * Composes: logo (file-menu anchor), brand+file breadcrumb, right actions
 * (Notifications + Present + Avatar — NO Comments per §12.3).
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBrandsStore } from '@/stores/brands'
import TopChromeLogo from './TopChromeLogo.vue'
import FileBreadcrumb from './FileBreadcrumb.vue'
import TopChromeActions from './TopChromeActions.vue'

interface Props {
  fileName: string
}

const props = defineProps<Props>()

const router = useRouter()
const auth = useAuthStore()
const brandsStore = useBrandsStore()

const userEmail = computed(() => auth.user?.email ?? '')
const userName = computed(() => userEmail.value.split('@')[0] || 'You')
const userInitials = computed(() => {
  const e = userEmail.value
  if (!e) return '·'
  const name = e.split('@')[0]
  return (name[0] ?? '·').toUpperCase()
})
// Brand color fallback uses --color-accent token when brand has no
// primary color set — resolves at runtime via CSS custom property lookup.
const FALLBACK_ACCENT = 'var(--color-accent)'

const avatarColor = computed(
  () => brandsStore.selectedBrand?.colors?.primary ?? FALLBACK_ACCENT
)
const brandName = computed(() => brandsStore.selectedBrand?.name ?? 'Brand')
const brandColor = computed(
  () => brandsStore.selectedBrand?.colors?.primary ?? FALLBACK_ACCENT
)
const brandId = computed(() => brandsStore.selectedBrandId)

const plan = computed<'Free' | 'Pro' | 'Trial'>(() => 'Free')

function openFileMenu(): void {
  // Cluster 08 mounts the File menu via this anchor event.
}

function onAccount(): void {
  void router.push('/account')
}
function onHelp(): void {
  window.open('mailto:support@kova.app', '_blank', 'noopener')
}
function onShortcuts(): void {
  // Cluster 08 owns the shortcuts dialog mount.
}
function onSignOut(): void {
  void auth.signOut().then(() => router.push('/login'))
}

void props
</script>

<template>
  <header
    class="flex items-center justify-between h-[var(--h-topbar)] bg-rail border-b border-line px-3"
    data-testid="topbar"
  >
    <div class="flex items-center gap-3">
      <TopChromeLogo @open-file-menu="openFileMenu" />
      <FileBreadcrumb
        :brand-id="brandId"
        :brand-name="brandName"
        :brand-color="brandColor"
        :file-name="fileName"
        @open-file-menu="openFileMenu"
      />
    </div>
    <TopChromeActions
      :user-name="userName"
      :user-initials="userInitials"
      :avatar-color="avatarColor"
      :plan="plan"
      @open-account="onAccount"
      @open-help="onHelp"
      @open-shortcuts="onShortcuts"
      @sign-out="onSignOut"
    />
  </header>
</template>
