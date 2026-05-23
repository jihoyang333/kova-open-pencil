<script setup lang="ts">
// PRD 04 §6.4.2 — Unsaved-changes pill shown in profile section.
interface Props {
  visible: boolean
}
const { visible } = defineProps<Props>()
defineEmits<{ save: []; discard: [] }>()
</script>

<template>
  <Transition>
    <div v-if="visible === true" class="acc-unsaved" role="status">
      <span class="acc-unsaved-dot" aria-hidden="true" />
      <span class="acc-unsaved-lbl">Unsaved changes</span>
      <button type="button" class="btn sm ghost" @click="$emit('discard')">Discard</button>
      <button type="button" class="btn sm primary" @click="$emit('save')">Save</button>
    </div>
  </Transition>
</template>
