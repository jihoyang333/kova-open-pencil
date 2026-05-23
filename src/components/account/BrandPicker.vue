<script setup lang="ts">
// PRD 04 §6.4.2 — BrandPicker 3-mode (empty / static-label / dropdown).
// Founder lock D-17 2026-05-17.
//
// No top-level await (audit L-6, 2026-06-06): kicks load() on mount so the
// component can render without a Suspense boundary above it. The mode
// computed handles the pre-load state gracefully (empty → "No brands yet").

import { onMounted } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import KovaMenu from '@/components/ui/KovaMenu.vue'
import { useBrandPicker } from '@/composables/account/use-brand-picker'

const picker = useBrandPicker()
onMounted(() => { void picker.load() })
</script>

<template>
  <div class="brandpick">
    <template v-if="picker.mode.value === 'empty'">
      <span class="brandpick-empty">No brands yet</span>
    </template>

    <template v-else-if="picker.mode.value === 'static-label'">
      <span class="brandpick-static">
        <KovaIcon name="tag" size="sm" class="brandpick-ic" />
        {{ picker.selectedBrand.value?.name ?? '' }}
      </span>
    </template>

    <template v-else>
      <KovaMenu>
        <template #trigger>
          <button type="button" class="brandpick-trigger">
            <KovaIcon name="tag" size="sm" class="brandpick-ic" />
            <span class="brandpick-lbl">{{ picker.selectedBrand.value?.name ?? 'Select brand' }}</span>
            <KovaIcon name="chevron-down" size="sm" class="brandpick-caret" />
          </button>
        </template>
        <template #default>
          <div class="dropdown">
            <button
              v-for="b in picker.brands.value"
              :key="b.id"
              type="button"
              class="dropdown-item"
              :class="{ 'is-active': b.id === picker.selectedBrandId.value }"
              @click="picker.selectBrand(b.id)"
            >
              <KovaIcon name="tag" size="sm" />
              <span>{{ b.name }}</span>
            </button>
          </div>
        </template>
      </KovaMenu>
    </template>
  </div>
</template>
