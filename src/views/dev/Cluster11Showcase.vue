<script setup lang="ts">
// Cluster 11 Plan Task 9.3 — /dev/cluster-11 showcase.
// Storybook-replacement smoke page. Renders every primitive in every variant
// + state so the founder can browser-verify the cluster output without
// hunting for use sites.

import { ref } from 'vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaInput from '@/components/ui/KovaInput.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaSegmented from '@/components/ui/KovaSegmented.vue'
import KovaPill from '@/components/ui/KovaPill.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import KovaPopover from '@/components/ui/KovaPopover.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'
import KovaMenu from '@/components/ui/KovaMenu.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import NetworkStatusIndicator from '@/components/ui/NetworkStatusIndicator.vue'
import { useToast } from '@/composables/use-toast'
import { useConfirm } from '@/composables/use-confirm'
import type { MenuEntry } from '@/types/menu'

const toast = useToast()
const { confirm } = useConfirm()

const inputValue = ref('')
const segValue = ref('left')
const modalOpen = ref(false)
const popoverOpen = ref(false)

const menuItems: MenuEntry[] = [
  { type: 'section', label: 'Edit' },
  {
    id: 'undo',
    label: 'Undo',
    icon: 'arrow-left',
    shortcut: '⌘Z',
    handler: () => toast.info('Undo'),
  },
  {
    id: 'redo',
    label: 'Redo',
    icon: 'arrow-right',
    shortcut: '⌘⇧Z',
    handler: () => toast.info('Redo'),
  },
  { type: 'separator' },
  {
    id: 'delete',
    label: 'Delete',
    icon: 'x',
    destructive: true,
    handler: async () => {
      const ok = await confirm({
        title: 'Delete forever?',
        description: 'This cannot be undone.',
        destructive: true,
        confirmLabel: 'Delete',
        typedConfirm: 'DELETE',
      })
      toast[ok ? 'success' : 'info'](ok ? 'Deleted' : 'Cancelled')
    },
  },
]
</script>

<template>
  <div class="dev-page min-h-screen bg-page p-8 text-ink">
    <h1 class="mb-6 text-2xl font-semibold">Cluster 11 Showcase</h1>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Buttons
      </h2>
      <div class="flex flex-wrap gap-2">
        <KovaButton variant="primary">Primary</KovaButton>
        <KovaButton variant="secondary">Secondary</KovaButton>
        <KovaButton variant="ghost">Ghost</KovaButton>
        <KovaButton variant="danger">Danger</KovaButton>
        <KovaButton variant="text">Text</KovaButton>
        <KovaButton variant="primary" loading>Loading</KovaButton>
        <KovaButton variant="secondary" disabled>Disabled</KovaButton>
      </div>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Toasts
      </h2>
      <div class="flex flex-wrap gap-2">
        <KovaButton @click="toast.success('Canvas saved')">Success</KovaButton>
        <KovaButton @click="toast.error('Save failed')">Error</KovaButton>
        <KovaButton @click="toast.info('Just a heads-up')">Info</KovaButton>
        <KovaButton
          @click="toast.action('Memory added', { ctaLabel: 'Undo', ctaHandler: () => toast.info('Undone') })"
        >Action</KovaButton>
        <KovaButton @click="toast.aiGen('5 colors generated')">AI</KovaButton>
        <KovaButton @click="toast.warning('Heads up')">Warning</KovaButton>
      </div>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Modal
      </h2>
      <KovaButton @click="modalOpen = true">Open modal (md)</KovaButton>
      <KovaModal
        v-model:open="modalOpen"
        title="Modal title"
        description="Description goes here. Press Esc or click backdrop to close."
      >
        <p class="text-sm">Modal body content slot.</p>
        <template #footer>
          <KovaButton variant="ghost" @click="modalOpen = false">Cancel</KovaButton>
          <KovaButton variant="primary" @click="modalOpen = false">Confirm</KovaButton>
        </template>
      </KovaModal>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Confirm
      </h2>
      <KovaButton
        variant="danger"
        @click="confirm({
          title: 'Delete brand?',
          description: 'Removes the brand and all its canvases.',
          destructive: true,
          confirmLabel: 'Delete',
          typedConfirm: 'DELETE',
        })"
      >Destructive confirm (typed)</KovaButton>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Popover / Menu / Tooltip
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <KovaPopover v-model:open="popoverOpen" :width="240">
          <template #trigger>
            <KovaButton variant="secondary">Open popover</KovaButton>
          </template>
          <div class="p-2 text-sm">Popover content slot.</div>
        </KovaPopover>

        <KovaMenu :items="menuItems">
          <template #trigger>
            <KovaButton variant="secondary" icon="chevron-down" icon-position="trailing">
              Menu
            </KovaButton>
          </template>
        </KovaMenu>

        <KovaTooltip content="Tooltip text">
          <KovaButton variant="ghost" icon="info">Hover me</KovaButton>
        </KovaTooltip>
      </div>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Form primitives
      </h2>
      <div class="grid max-w-md gap-3">
        <KovaField label="Name" help-text="As shown to your team.">
          <KovaInput v-model="inputValue" placeholder="e.g. Wildgrove" />
        </KovaField>
        <KovaSegmented
          v-model="segValue"
          :options="[
            { value: 'left', label: 'Left', icon: 'arrow-left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right', icon: 'arrow-right' },
          ]"
        />
      </div>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Pills + Icons
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <KovaPill variant="neutral">Neutral</KovaPill>
        <KovaPill variant="accent">Accent</KovaPill>
        <KovaPill variant="outline">Outline</KovaPill>
        <KovaPill variant="warn">Warning</KovaPill>
        <KovaPill variant="accent" dot dot-state="ok">Live</KovaPill>
        <KovaIcon name="check" />
        <KovaIcon name="sparkles" />
        <KovaIcon name="alert-triangle" />
      </div>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Skeleton
      </h2>
      <div class="grid max-w-sm gap-2">
        <KovaSkeleton :width="120" :height="14" />
        <KovaSkeleton :height="14" />
        <KovaSkeleton :width="200" :height="14" />
      </div>
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Empty state
      </h2>
      <EmptyState
        icon="search-x"
        headline="No results for &quot;wildgrove&quot;"
        body="Try a different search term."
        query="wildgrove"
      />
    </section>

    <section class="section mb-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">
        Network indicator
      </h2>
      <p class="text-xs text-ink-2">
        Renders the offline icon top-right only when navigator.onLine is false.
        Toggle the browser's Network tab to "Offline" to verify.
      </p>
      <NetworkStatusIndicator />
    </section>
  </div>
</template>
