<script setup lang="ts">
// Cluster 05 — WritingRulesTab.vue (PRD §3.6, A7.3.5)
// Binary toggle stack for AI writing rules.

import { ref } from 'vue'

import WritingRuleToggle from './writing-rules/WritingRuleToggle.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import { toast } from '@/composables/use-toast'
import type { WritingRuleKey } from '@/types/brand-kit'

interface RuleDef {
  key: WritingRuleKey
  label: string
  helpText: string
}

const RULES: readonly RuleDef[] = [
  { key: 'no_exclamation', label: 'No exclamation marks', helpText: 'Removes all ! from AI-generated copy.' },
  { key: 'no_em_dash', label: 'No em-dashes', helpText: 'Avoids — in AI-generated copy.' },
  { key: 'sentence_case_headlines', label: 'Sentence-case headlines', helpText: 'Headlines use sentence case, not Title Case.' },
  { key: 'no_superlatives', label: 'No superlatives', helpText: 'Avoids "best", "greatest", "unmatched", etc.' },
  { key: 'active_voice_only', label: 'Active voice only', helpText: 'Prefer active constructions over passive.' },
]

const store = useBrandKitStore()
const savingKey = ref<WritingRuleKey | null>(null)

async function onChange(key: WritingRuleKey, value: boolean): Promise<void> {
  savingKey.value = key
  try {
    await store.setWritingRule(key, value)
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to save rule', 'error')
  } finally {
    savingKey.value = null
  }
}
</script>

<template>
  <div class="bk-pane">
    <div class="list-stack wr-stack">
      <WritingRuleToggle
        v-for="rule in RULES"
        :key="rule.key"
        :rule-key="rule.key"
        :label="rule.label"
        :help-text="rule.helpText"
        :enabled="store.writingRules[rule.key] ?? false"
        :saving="savingKey === rule.key"
        @change="onChange"
      />
    </div>
  </div>
</template>
