<script setup lang="ts">
// token-exempt-file: dev preview surface. /dev/cluster-05 is the canonical
// Cluster 05 brand-kit showcase — debug-chrome headings use raw px /
// arbitrary Tailwind values rather than production tokens. Not shipped to
// end users. Founder approved pattern per Cluster 12 precedent.

import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Primitives
import BrandColorSwatch from '@/components/brand-kit/visuals/BrandColorSwatch.vue'
import BrandColorAddTile from '@/components/brand-kit/visuals/BrandColorAddTile.vue'
import BrandFontRow from '@/components/brand-kit/visuals/BrandFontRow.vue'
import BrandLogoRow from '@/components/brand-kit/visuals/BrandLogoRow.vue'
import FontUploadDropzone from '@/components/brand-kit/visuals/FontUploadDropzone.vue'
import IdentityCard from '@/components/brand-kit/identity/IdentityCard.vue'
import BrandKitListRow from '@/components/brand-kit/shared/BrandKitListRow.vue'
import WritingRuleToggle from '@/components/brand-kit/writing-rules/WritingRuleToggle.vue'
import MemoryRow from '@/components/brand-kit/memories/MemoryRow.vue'
import KbSourceRow from '@/components/brand-kit/kb-sources/KbSourceRow.vue'
import KbSourceDropzone from '@/components/brand-kit/kb-sources/KbSourceDropzone.vue'

// Modals
import ToneSnippetAddModal from '@/components/brand-kit/modals/ToneSnippetAddModal.vue'
import SavedBlockAddModal from '@/components/brand-kit/modals/SavedBlockAddModal.vue'
import VoiceDraftConfirmModal from '@/components/brand-kit/modals/VoiceDraftConfirmModal.vue'

import type { BrandColor, BrandFont, BrandKbSource } from '@/types/brand-kit'
import type { BrandMemory } from '@/types/kova/brand-memory'

// --- Fixture data ---

const SAMPLE_COLORS: BrandColor[] = [
  { id: 'primary', hex: '#1a1a1d', label: 'Onyx', order: 0 },
  { id: 'secondary', hex: '#e55a2b', label: 'Flame', order: 1 },
  { id: 'accent', hex: '#f5f0e8', label: 'Bone', order: 2 },
  { id: 'background', hex: '#2563eb', label: 'Cobalt', order: 3 },
]

const SAMPLE_FONT: BrandFont = {
  id: 'f1',
  brand_id: 'b1',
  family_name: 'Geist',
  file_path: 'brand-fonts/b1/f1.woff2',
  file_size_bytes: 128000,
  mime_type: 'font/woff2',
  license_attested: true,
  uploaded_at: new Date().toISOString(),
  uploaded_by: 'u1',
}

const SAMPLE_KB_SOURCE: BrandKbSource = {
  id: 'kb1',
  brand_id: 'b1',
  file_name: 'spring-launch-plan.pdf',
  file_path: 'brand-kb-sources/b1/kb1.pdf',
  file_size_bytes: 204800,
  mime_type: 'application/pdf',
  uploaded_at: new Date().toISOString(),
  uploaded_by: 'u1',
  extracted_text: null,
}

const SAMPLE_MEMORY: BrandMemory = {
  id: 'm1',
  brand_id: 'b1',
  user_id: 'u1',
  content: 'Customer prefers direct, concise copy. Avoids adjective-heavy prose.',
  source: 'auto',
  created_at: new Date().toISOString(),
}

const showToneSnippetAdd = ref(false)
const showSavedBlockAdd = ref(false)
const showVoiceDraft = ref(false)

const ruleToggle = ref(false)
</script>

<template>
  <!-- token-exempt-file: dev preview surface -->
  <div class="bg-[var(--bg)] text-[var(--ink)] h-full w-full overflow-y-auto">
    <div class="mx-auto max-w-[1100px] px-12 pt-8 pb-16">
      <header class="mb-10">
        <div class="text-[var(--ink-3)] uppercase tracking-widest text-[11px] mb-2">
          /dev/cluster-05 · Brand Kit showcase · W4 2026-05-31
        </div>
        <h1 class="m-0 mb-2 text-[28px] font-semibold tracking-tight text-[var(--ink)]">
          Cluster 05 — Brand Kit Settings UI
        </h1>
        <p class="m-0 max-w-[720px] text-[var(--ink-2)] leading-[1.5]">
          Visual-diff reference for all Cluster 05 primitives + modals.
          Route: <code>/dev/cluster-05</code>.
        </p>
      </header>

      <!-- Color swatches -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Color swatches (.sw-list / .sw-item / .sw-add)
        </h2>
        <div class="sw-list" style="max-width: 560px">
          <BrandColorSwatch
            v-for="c in SAMPLE_COLORS"
            :key="c.id"
            :color="c"
            @edit="() => {}"
          />
          <BrandColorAddTile @open="() => {}" />
        </div>
      </section>

      <!-- Font rows -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Font row (.font-row) + upload dropzone
        </h2>
        <div style="max-width: 560px">
          <BrandFontRow :font="SAMPLE_FONT" />
          <div style="margin-top: 12px">
            <FontUploadDropzone brand-id="b1" @upload="() => {}" />
          </div>
        </div>
      </section>

      <!-- Logo row -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Logo row (.font-row logo variant)
        </h2>
        <div style="max-width: 560px">
          <BrandLogoRow kind="logo" label="Primary mark" :url="null" @upload="() => {}" />
          <BrandLogoRow kind="wordmark" label="Wordmark" :url="null" style="margin-top: 8px" @upload="() => {}" />
        </div>
      </section>

      <!-- Identity card -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Identity card (.nar-card) — empty + filled
        </h2>
        <div style="max-width: 620px">
          <IdentityCard card-key="about" :card="undefined" @save="() => {}" />
          <IdentityCard
            card-key="voice"
            :card="{ content: 'Direct, warm, and human. We speak to clever people who are busy.', last_edited_at: new Date().toISOString(), last_edited_by: 'u1', word_count: 14 }"
            @save="() => {}"
          />
        </div>
      </section>

      <!-- List rows -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          List rows (.list-stack / .list-row)
        </h2>
        <div class="list-stack" style="max-width: 720px">
          <BrandKitListRow
            row-id="r1"
            label="Welcome opener"
            category="WELCOME"
            content-excerpt="Hey — glad you're here. We built this for you."
            :draggable="true"
            @edit="() => {}"
            @delete="() => {}"
            @dragstart="() => {}"
          />
          <BrandKitListRow
            row-id="r2"
            label="Summer sale CTA"
            category="PROMO"
            type-badge="CTA"
            content-excerpt="Shop the drop — 30% off everything, just for today."
            :draggable="true"
            @edit="() => {}"
            @delete="() => {}"
            @dragstart="() => {}"
          />
        </div>
      </section>

      <!-- Writing rule toggle -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Writing rule toggle (.wr-row)
        </h2>
        <div class="list-stack wr-stack" style="max-width: 480px">
          <WritingRuleToggle
            rule-key="no_exclamation"
            label="No exclamation marks"
            help-text="Removes all ! from AI-generated copy."
            :enabled="ruleToggle"
            @change="(_, v) => (ruleToggle = v)"
          />
          <WritingRuleToggle
            rule-key="no_em_dash"
            label="No em-dashes"
            help-text="Avoids — in AI-generated copy."
            :enabled="false"
            @change="() => {}"
          />
        </div>
      </section>

      <!-- Memory row -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Memory row (.mem-row)
        </h2>
        <div class="list-stack" style="max-width: 600px">
          <MemoryRow :memory="SAMPLE_MEMORY" @delete="() => {}" />
        </div>
      </section>

      <!-- KB source row -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          KB source row (.upl-list-row) — all 4 states
        </h2>
        <div class="upl-list" style="max-width: 600px">
          <KbSourceRow :source="SAMPLE_KB_SOURCE" state="success" @delete="() => {}" @retry="() => {}" />
          <KbSourceRow :source="SAMPLE_KB_SOURCE" state="in-progress" :progress="45" @delete="() => {}" @retry="() => {}" />
          <KbSourceRow :source="SAMPLE_KB_SOURCE" state="error" @delete="() => {}" @retry="() => {}" />
          <KbSourceRow :source="SAMPLE_KB_SOURCE" state="queued" @delete="() => {}" @retry="() => {}" />
        </div>
      </section>

      <!-- KB dropzone -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          KB source dropzone (.upl-zone)
        </h2>
        <div style="max-width: 480px">
          <KbSourceDropzone @upload="() => {}" />
        </div>
      </section>

      <!-- Modals -->
      <section class="border-t border-[var(--line)] py-7">
        <h2 class="mt-0 mb-4 text-[15px] font-semibold text-[var(--ink)]">
          Modals (B3.1 / B3.3 / VoiceDraftConfirm)
        </h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap">
          <button type="button" class="btn sm" @click="showToneSnippetAdd = true">
            Open ToneSnippetAddModal (B3.1)
          </button>
          <button type="button" class="btn sm" @click="showSavedBlockAdd = true">
            Open SavedBlockAddModal (B3.3)
          </button>
          <button type="button" class="btn sm" @click="showVoiceDraft = true">
            Open VoiceDraftConfirmModal (guardrail)
          </button>
        </div>
      </section>
    </div>

    <!-- Modal instances -->
    <ToneSnippetAddModal
      :open="showToneSnippetAdd"
      @update:open="(v) => (showToneSnippetAdd = v)"
      @save="() => (showToneSnippetAdd = false)"
    />
    <SavedBlockAddModal
      :open="showSavedBlockAdd"
      @update:open="(v) => (showSavedBlockAdd = v)"
      @save="() => (showSavedBlockAdd = false)"
    />
    <VoiceDraftConfirmModal
      :open="showVoiceDraft"
      :show-skip="true"
      @update:open="(v) => (showVoiceDraft = v)"
      @confirmed="() => (showVoiceDraft = false)"
      @discarded="() => (showVoiceDraft = false)"
      @skipped="() => (showVoiceDraft = false)"
    />
  </div>
</template>
