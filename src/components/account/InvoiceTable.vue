<script setup lang="ts">
// PRD 04 §6.4.2 — Invoice history table (last 12).
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import type { InvoiceItem } from '@/stores/billing'

interface Props {
  invoices: readonly InvoiceItem[]
}
const { invoices } = defineProps<Props>()

const rows = computed(() => invoices.map(inv => ({
  ...inv,
  dateDisplay: new Date(inv.created_iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  amountDisplay: `${(inv.amount_paid_cents / 100).toLocaleString('en-US', { style: 'currency', currency: inv.currency.toUpperCase() })}`,
})))
</script>

<template>
  <div class="inv-table-wrap">
    <h3 class="inv-table-title">Invoice history</h3>
    <div v-if="rows.length === 0" class="inv-table-empty">
      No invoices yet.
    </div>
    <table v-else class="inv-table">
      <thead>
        <tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id">
          <td>{{ r.dateDisplay }}</td>
          <td>{{ r.description ?? '—' }}</td>
          <td>{{ r.amountDisplay }}</td>
          <td>
            <span class="tag-mono" :class="`tag-mono-${r.status === 'paid' ? 'ok' : 'warn'}`">{{ r.status }}</span>
          </td>
          <td>
            <a v-if="r.invoice_pdf !== null" :href="r.invoice_pdf" target="_blank" rel="noopener noreferrer" class="btn sm ghost icon" aria-label="Download invoice PDF">
              <KovaIcon name="download" size="sm" />
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
