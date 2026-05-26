<script setup lang="ts">
// W9b Cluster 03 — Archive modal body layout (named slots host).
// Keeps ArchiveBrandModal logic terse + lets the layout be reused if the
// content blocks ever need to swap order.
</script>

<template>
  <div class="dlg-body__stack">
    <slot name="summary" />
    <slot name="explainer" />
    <slot name="para" />
  </div>
</template>
