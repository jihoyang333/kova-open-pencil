<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaInput from '@/components/ui/KovaInput.vue'
import { toast } from '@/composables/use-toast'
import { useNewBrandFlow } from '@/composables/use-new-brand-flow'
import { BrandApiError } from '@/stores/brands'

// W9b Cluster 03 — A3 New-brand wizard (Plan 03 Tasks 31-33).
// Composite single-view implementation switching on `flow.step`.

const router = useRouter()
const flow = useNewBrandFlow()
const cancelOpen = ref<boolean>(false)

const STEPS = ['name-url', 'shopify', 'brand-kit', 'done'] as const

function askCancel(): void {
  if (flow.isDirty.value) {
    cancelOpen.value = true
  } else {
    void exitToPicker()
  }
}

async function exitToPicker(): Promise<void> {
  await router.push('/brands')
}

function confirmCancel(): void {
  flow.reset()
  cancelOpen.value = false
  void exitToPicker()
}

// M4: computed (not a plain function) so the disabled binding only re-evaluates
// when flow.name changes instead of on every render.
const canContinueName = computed(() => flow.name.value.trim().length > 0)

async function commit(): Promise<void> {
  try {
    const brand = await flow.commitAndAdvance()
    if (brand) toast.show('Brand created')
  } catch (err) {
    const code = err instanceof BrandApiError ? err.code : 'unknown'
    toast.show(`Create failed (${code})`, 'error')
  }
}

async function enterBrand(): Promise<void> {
  const id = flow.brandId.value
  if (!id) return
  await router.push(`/brand/${id}`)
  flow.reset()
}
</script>

<template>
  <div class="onb-shell">
    <header class="onb-progress">
      <div class="onb-progress__dots">
        <span
          v-for="s in STEPS.slice(0, 3)"
          :key="s"
          :class="['onb-progress__dot', flow.step.value === s ? 'is-active' : null]"
        />
      </div>
      <span v-if="flow.name.value" class="onb-progress__context">
        New brand · {{ flow.name.value }}
      </span>
      <button v-if="flow.step.value !== 'done'" class="onb-progress__cancel" type="button" @click="askCancel">
        Cancel
      </button>
    </header>

    <main class="onb-card-host">
      <!-- Step 1: Name + URL -->
      <section v-if="flow.step.value === 'name-url'" class="onb-card">
        <h2>Tell us about the brand</h2>
        <p class="onb-card__sub">Name and website (optional description).</p>
        <div class="fld-stack">
          <div class="fld">
            <label for="brand-name" class="label">Brand name</label>
            <KovaInput id="brand-name" v-model="flow.name.value" placeholder="Patagonia" />
          </div>
          <div class="fld">
            <label for="brand-url" class="label">Website</label>
            <KovaInput id="brand-url" v-model="flow.url.value" type="url" placeholder="https://example.com" />
          </div>
          <div class="fld">
            <label for="brand-desc" class="label">Description (optional)</label>
            <KovaInput
              id="brand-desc"
              v-model="flow.description.value"
              placeholder="One sentence about the brand"
            />
          </div>
        </div>
        <div class="onb-card__foot">
          <KovaButton variant="ghost" @click="askCancel">Back to brands</KovaButton>
          <KovaButton variant="primary" :disabled="!canContinueName" @click="flow.advance">
            Continue
          </KovaButton>
        </div>
      </section>

      <!-- Step 2: Shopify -->
      <section v-if="flow.step.value === 'shopify'" class="onb-card onb-connect">
        <h2>Connect Shopify</h2>
        <p class="onb-card__sub">Pull products + images. Skip if you don't have one.</p>
        <ul class="onb-connect__scopes">
          <li><KovaIcon name="check" size="xs" /> Products (read)</li>
          <li><KovaIcon name="check" size="xs" /> Product images (read)</li>
          <li><KovaIcon name="x" size="xs" /> Customers / orders (never)</li>
        </ul>
        <div class="onb-card__foot">
          <KovaButton variant="ghost" @click="flow.advance">Skip for now</KovaButton>
          <KovaButton variant="primary" disabled>Connect Shopify</KovaButton>
        </div>
        <p class="help">Shopify OAuth handoff wires in via M9 — staying disabled until brand is created.</p>
      </section>

      <!-- Step 3: Brand kit -->
      <section v-if="flow.step.value === 'brand-kit'" class="onb-card">
        <h2>Brand kit</h2>
        <p class="onb-card__sub">Drop guideline files or paste text. You can edit everything later.</p>
        <div class="onb-drop">
          <KovaIcon name="upload" size="md" />
          <p>PDF / HTML / EML / PNG / JPG · 25 MB cap (deferred to Cluster 05)</p>
        </div>
        <div class="onb-card__foot">
          <KovaButton variant="ghost" :disabled="flow.isCommitting.value" @click="commit">
            Do this later
          </KovaButton>
          <KovaButton variant="primary" :loading="flow.isCommitting.value" @click="commit">
            Extract and finish
          </KovaButton>
        </div>
      </section>

      <!-- Step 4: Done splash -->
      <section v-if="flow.step.value === 'done'" class="onb-card onb-splash">
        <div class="onb-splash__medal"><KovaIcon name="check" size="lg" /></div>
        <h2>Brand created</h2>
        <p>{{ flow.name.value || 'Your brand' }} is ready.</p>
        <KovaButton variant="primary" @click="enterBrand">
          Enter {{ flow.name.value || 'brand' }}
        </KovaButton>
        <button type="button" class="onb-splash__alt" @click="exitToPicker">Back to brand picker</button>
      </section>
    </main>

    <!-- Cancel dirty-form confirm (lightweight inline; no modal) -->
    <div v-if="cancelOpen" class="onb-cancel-confirm" role="alertdialog" aria-label="Discard new brand?">
      <p><strong>Discard this brand?</strong></p>
      <p>Your inputs won't be saved.</p>
      <div class="onb-cancel-confirm__actions">
        <KovaButton variant="ghost" @click="cancelOpen = false">Keep editing</KovaButton>
        <KovaButton variant="danger" @click="confirmCancel">Discard</KovaButton>
      </div>
    </div>
  </div>
</template>
