<script setup lang="ts">
import { ref } from 'vue'

import KovaAvatar from '@/components/ui/KovaAvatar.vue'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaCheckbox from '@/components/ui/KovaCheckbox.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaInput from '@/components/ui/KovaInput.vue'
import KovaMenu from '@/components/ui/KovaMenu.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import KovaPill from '@/components/ui/KovaPill.vue'
import KovaPopover from '@/components/ui/KovaPopover.vue'
import KovaSegmented from '@/components/ui/KovaSegmented.vue'
import KovaSelect from '@/components/ui/KovaSelect.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import KovaTooltip from '@/components/ui/KovaTooltip.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

import { useConfirm } from '@/composables/use-confirm'
import { useToastStore } from '@/stores/toast'

import type { KovaMenuItem } from '@/components/ui/KovaMenu.vue'

const toast = useToastStore()
const confirm = useConfirm()

// Form state
const inputValue = ref('')
const fieldEmail = ref('jiho@kova.app')
const fieldErrorText = ref('')
const checkA = ref(true)
const checkB = ref(false)
const segValue = ref<'left' | 'center' | 'right'>('center')
const selectValue = ref('one')

// Modal state
const modalSm = ref(false)
const modalMd = ref(false)
const modalLg = ref(false)

const segOpts = [
  { value: 'left', icon: 'arrow-left', ariaLabel: 'Align left' },
  { value: 'center', icon: 'crop', ariaLabel: 'Center' },
  { value: 'right', icon: 'arrow-right', ariaLabel: 'Align right' },
]

const selectOpts = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
  { value: 'four', label: 'Four (disabled)', disabled: true },
]

const menuItems: KovaMenuItem[] = [
  { id: 'dup', label: 'Duplicate', shortcut: '⌘D' },
  { id: 'cut', label: 'Cut', shortcut: '⌘X' },
  { id: 'paste', label: 'Paste', shortcut: '⌘V' },
  { id: 'trash', label: 'Move to trash', shortcut: '⌫', destructive: true, separatorBefore: true },
]

function showToast(variant: 'success' | 'error' | 'info' | 'action' | 'progress' | 'ai'): void {
  const payloads = {
    success: { message: 'Canvas saved', meta: '2s ago' },
    error: { message: 'Export failed', meta: 'PNG too large' },
    info: { message: 'Sync complete', meta: 'Last synced just now' },
    action: {
      message: 'Memory added',
      actions: [
        { label: 'Undo', onClick: () => toast.show({ variant: 'info', message: 'Memory removed' }) },
      ],
    },
    progress: { message: 'Generating 3 variations…' },
    ai: { message: 'AI generated 5 color combos', meta: 'Click to apply' },
  } as const
  toast.show({ variant, ...payloads[variant] })
}

async function showConfirm(): Promise<void> {
  const ok = await confirm({
    title: 'Delete canvas?',
    body: "This can't be undone. The canvas and all of its versions will be permanently removed.",
    confirmLabel: 'Delete canvas',
    destructive: true,
  })
  toast.show({ variant: ok ? 'success' : 'info', message: ok ? 'Canvas deleted' : 'Cancelled' })
}

async function showTypedConfirm(): Promise<void> {
  const ok = await confirm({
    title: 'Delete account',
    body: 'Type "delete my account" to enable the Confirm button.',
    typedConfirmPhrase: 'delete my account',
    confirmLabel: 'Delete account',
    destructive: true,
  })
  toast.show({ variant: ok ? 'success' : 'info', message: ok ? 'Account deletion scheduled' : 'Cancelled' })
}

function toggleFieldError(): void {
  fieldErrorText.value = fieldErrorText.value ? '' : 'Not a valid email — must contain @'
}
</script>

<template>
  <div class="bg-[var(--bg)] text-[var(--ink)] h-full w-full overflow-y-auto">
    <div class="mx-auto max-w-[1200px] px-12 pt-8 pb-16">
      <header class="mb-10">
        <div class="text-[var(--ink-3)] uppercase tracking-widest text-[11px] mb-2">
          /dev/cluster-11 · primitive showcase · W6 REDO 2026-05-20
        </div>
        <h1 class="m-0 mb-2 text-[28px] font-semibold tracking-tight text-[var(--ink)]">
          Cluster 11 primitives — founder smoke
        </h1>
        <p class="m-0 max-w-[720px] text-[var(--ink-2)] leading-[1.5]">
          Every Cluster 11 primitive in every variant + state. Surface mounts toast / confirm /
          modal / popover / menu / tooltip via Reka UI. Reference:
          <code>docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md</code>.
        </p>
      </header>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaButton — variants + sizes</h2>
        <div class="flex gap-3 flex-wrap items-center mb-3">
          <KovaButton>Default</KovaButton>
          <KovaButton variant="primary">Primary</KovaButton>
          <KovaButton variant="accent">Accent</KovaButton>
          <KovaButton variant="ghost">Ghost</KovaButton>
          <KovaButton variant="danger">Danger</KovaButton>
          <KovaButton variant="text">Text</KovaButton>
        </div>
        <div class="flex gap-3 flex-wrap items-center mb-3">
          <KovaButton size="sm">Small</KovaButton>
          <KovaButton variant="primary" size="sm">Small primary</KovaButton>
          <KovaButton icon="plus">With icon</KovaButton>
          <KovaButton variant="accent" icon="sparkles">AI action</KovaButton>
          <KovaButton iconOnly icon="plus" aria-label="Add" />
          <KovaButton iconOnly size="sm" icon="x" aria-label="Close" />
        </div>
        <div class="flex gap-3 flex-wrap items-center">
          <KovaButton disabled>Disabled</KovaButton>
          <KovaButton variant="primary" disabled>Disabled primary</KovaButton>
          <KovaButton variant="accent" loading>Loading</KovaButton>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaPill</h2>
        <div class="flex gap-3 flex-wrap items-center">
          <KovaPill>Neutral</KovaPill>
          <KovaPill variant="accent">Pro plan</KovaPill>
          <KovaPill variant="outline">Outline</KovaPill>
          <KovaPill variant="dot">Online</KovaPill>
          <KovaPill icon="check">With icon</KovaPill>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaInput + KovaField</h2>
        <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] mb-4">
          <KovaInput v-model="inputValue" placeholder="Plain .input" aria-label="Plain input" />
          <KovaInput disabled placeholder="Disabled input" aria-label="Disabled" />
          <KovaInput type="search" placeholder="Search…" aria-label="Search" />
        </div>
        <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          <KovaField v-model="fieldEmail" type="email" label="Email" helper-text="We never share." />
          <KovaField
            v-model="fieldEmail"
            type="email"
            label="Email (error state)"
            :error-text="fieldErrorText"
          />
          <KovaField v-model="inputValue" label="Optional" optional helper-text="Modal form variant uses .fld" />
        </div>
        <div class="mt-3">
          <KovaButton variant="ghost" size="sm" @click="toggleFieldError">Toggle error state</KovaButton>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaCheckbox</h2>
        <div class="flex flex-col gap-2">
          <KovaCheckbox v-model="checkA" label="Subscribe to product updates" />
          <KovaCheckbox v-model="checkB" label="Send weekly digest" />
          <KovaCheckbox :model-value="true" label="Read-only checked" disabled />
          <KovaCheckbox :model-value="false" label="Disabled unchecked" disabled />
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaSegmented</h2>
        <div class="flex gap-4 items-center">
          <KovaSegmented v-model="segValue" :options="segOpts" aria-label="Alignment" />
          <span class="text-[var(--ink-3)] text-[11.5px]">value: {{ segValue }}</span>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaSelect</h2>
        <div class="flex gap-4 items-center max-w-[280px]">
          <KovaSelect v-model="selectValue" :options="selectOpts" placeholder="Pick one" aria-label="Pick" />
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaAvatar</h2>
        <div class="flex gap-4 items-center">
          <KovaAvatar size="sm" initials="JY" />
          <KovaAvatar size="md" initials="JY" />
          <KovaAvatar size="lg" initials="JY" />
          <KovaAvatar size="xl" initials="JY" />
          <KovaAvatar size="lg" initials="WG" bg="#c24a1e" ink="#fff" />
          <KovaAvatar size="lg" initials="KV" bg="var(--accent)" ink="var(--ink-on-primary)" />
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaSkeleton</h2>
        <div class="grid gap-6 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
          <div class="flex flex-col gap-2">
            <KovaSkeleton variant="circle" width="32px" height="32px" />
            <KovaSkeleton variant="line" width="100%" height="12px" />
            <KovaSkeleton variant="line" width="70%" height="12px" />
            <KovaSkeleton variant="line" width="40%" height="12px" />
          </div>
          <KovaSkeleton variant="card" width="100%" height="80px" />
          <KovaSkeleton variant="pill" width="80px" height="24px" />
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaTooltip</h2>
        <div class="flex gap-6 items-center">
          <KovaTooltip content="Add element">
            <KovaButton iconOnly icon="plus" aria-label="Add" />
          </KovaTooltip>
          <KovaTooltip content="Sign out" side="right">
            <KovaButton iconOnly icon="log-out" aria-label="Sign out" />
          </KovaTooltip>
          <KovaTooltip content="Refresh">
            <KovaButton iconOnly icon="refresh-cw" aria-label="Refresh" />
          </KovaTooltip>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaPopover</h2>
        <div class="flex gap-4 items-center">
          <KovaPopover variant="avatar">
            <template #trigger>
              <button :style="{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }" aria-label="Open avatar menu">
                <KovaAvatar size="lg" initials="JY" />
              </button>
            </template>
            <div class="pop-hdr">
              <div class="row1">
                <div class="av"><KovaIcon name="info" size="sm" aria-hidden="true" /></div>
                <div class="who"><b>Jiho Yang</b><span>jiho.yang@kova.app</span></div>
                <div class="plan">PRO</div>
              </div>
            </div>
            <div class="pop-item">Account settings</div>
            <div class="pop-item">Brand kit</div>
            <div class="pop-item">Sign out</div>
          </KovaPopover>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaMenu (dropdown)</h2>
        <div class="flex gap-4">
          <KovaMenu :items="menuItems">
            <template #trigger>
              <KovaButton icon="chevron-down">Actions</KovaButton>
            </template>
          </KovaMenu>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaModal</h2>
        <div class="flex gap-3 flex-wrap">
          <KovaButton @click="modalSm = true">Open SM (460)</KovaButton>
          <KovaButton @click="modalMd = true">Open MD (540)</KovaButton>
          <KovaButton @click="modalLg = true">Open LG (880)</KovaButton>
          <KovaButton variant="ghost" @click="showConfirm">Confirm modal</KovaButton>
          <KovaButton variant="ghost" @click="showTypedConfirm">Typed-confirm modal</KovaButton>
        </div>
        <KovaModal v-model:open="modalSm" size="sm" title="Take snapshot" description="Captures the current canvas state.">
          <KovaField label="Snapshot name" placeholder="Untitled snapshot" />
          <template #foot>
            <KovaButton variant="ghost" @click="modalSm = false">Cancel</KovaButton>
            <KovaButton variant="accent" @click="modalSm = false">Take snapshot</KovaButton>
          </template>
        </KovaModal>
        <KovaModal v-model:open="modalMd" size="md" title="Accessibility preferences" description="Tweak how Kova looks and feels.">
          <KovaField label="Text size" />
          <KovaCheckbox v-model="checkA" label="Reduce motion" />
          <KovaCheckbox v-model="checkB" label="High contrast borders only" />
          <template #foot>
            <KovaButton variant="ghost" @click="modalMd = false">Cancel</KovaButton>
            <KovaButton variant="accent" @click="modalMd = false">Save</KovaButton>
          </template>
        </KovaModal>
        <KovaModal v-model:open="modalLg" size="lg" title="Keyboard shortcuts" description="Every shortcut in Kova.">
          <div class="grid gap-2 grid-cols-2">
            <div v-for="i in 12" :key="i" class="flex items-center justify-between gap-3 py-2 border-b border-[var(--line-2)]">
              <span class="text-[var(--ink)] text-[12.5px]">Shortcut row {{ i }}</span>
              <kbd>⌘{{ String.fromCharCode(64 + i) }}</kbd>
            </div>
          </div>
          <template #foot-left>
            <span>12 of 120 shortcuts</span>
          </template>
          <template #foot>
            <KovaButton variant="ghost" @click="modalLg = false">Close</KovaButton>
          </template>
        </KovaModal>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">KovaToast — 6 variants</h2>
        <div class="flex gap-3 flex-wrap">
          <KovaButton size="sm" @click="showToast('success')">success</KovaButton>
          <KovaButton size="sm" @click="showToast('error')">error</KovaButton>
          <KovaButton size="sm" @click="showToast('info')">info</KovaButton>
          <KovaButton size="sm" @click="showToast('action')">action (Undo)</KovaButton>
          <KovaButton size="sm" @click="showToast('progress')">progress</KovaButton>
          <KovaButton size="sm" @click="showToast('ai')">ai</KovaButton>
          <KovaButton variant="ghost" size="sm" @click="toast.dismissAll()">Dismiss all</KovaButton>
        </div>
        <p class="text-[var(--ink-3)] text-[11.5px] mt-3">
          Stack cap = 5 visible; excess queued; auto-dismiss 5 s except error/action/progress (sticky).
        </p>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">EmptyState</h2>
        <div class="grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          <EmptyState variant="inline-32" icon="search">
            <template #headline>
              No memories match <span class="q">"shipping"</span>
            </template>
            <template #body>Try a different keyword.</template>
            <template #cta>
              <button class="ghost-link">Clear search</button>
            </template>
          </EmptyState>
          <EmptyState variant="panel-40" icon="plus" headline="No brands yet" body="Add a brand to get started.">
            <template #cta>
              <KovaButton variant="primary" icon="plus">New brand</KovaButton>
            </template>
          </EmptyState>
          <EmptyState variant="full-48" icon="file-question" headline="No canvases here" body="Create a canvas to start designing.">
            <template #cta>
              <KovaButton variant="accent">Create canvas</KovaButton>
            </template>
          </EmptyState>
        </div>
      </section>

      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">Error views (preview links)</h2>
        <div class="flex gap-3 flex-wrap">
          <RouterLink to="/404" class="text-[var(--accent)]">/404</RouterLink>
          <RouterLink to="/500" class="text-[var(--accent)]">/500</RouterLink>
          <RouterLink to="/network-unreachable" class="text-[var(--accent)]">/network-unreachable</RouterLink>
        </div>
      </section>

      <footer class="border-t border-[var(--line)] pt-6 mt-6">
        <p class="text-[var(--ink-3)] text-[11.5px]">
          Phase 3 primitive build complete. Per-property diff docs + visual-diff Playwright specs land in Phase 5.
        </p>
      </footer>
    </div>
  </div>
</template>
