import { defineStore } from 'pinia'
import { computed } from 'vue'

import { supabase } from '@/lib/supabase'
import { useBrandsStore } from '@/stores/brands'
import type {
  BrandColor,
  IdentityCardKey,
  IdentityCards,
  SavedBlock,
  SavedBlockType,
  ToneSnippet,
  WritingRuleKey,
  WritingRules,
} from '@/types/brand-kit'
import type { Brand } from '@/types/kova/database'

/**
 * Cluster 05 — useBrandKitStore.
 *
 * Typed read-through over `useBrandsStore.selectedBrand`'s JSONB columns plus
 * RPC-backed mutators. No local cache: the brand row already lives in the
 * brands store; this store exposes sorted/typed accessors and optimistic
 * actions that roll back on RPC error (per PRD §6.2).
 */

const COLOR_SLOTS: ReadonlyArray<{ key: keyof NonNullable<Brand['colors']>; label: string }> = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
]

export const useBrandKitStore = defineStore('brand-kit', () => {
  const brandsStore = useBrandsStore()

  const brandId = computed<string | null>(() => brandsStore.selectedBrand?.id ?? null)

  const toneSnippets = computed<ToneSnippet[]>(() =>
    [...(brandsStore.selectedBrand?.tone_snippets ?? [])].sort((a, b) => a.order - b.order),
  )

  const savedBlocks = computed<SavedBlock[]>(() =>
    [...(brandsStore.selectedBrand?.saved_blocks ?? [])].sort((a, b) => a.order - b.order),
  )

  const writingRules = computed<WritingRules>(
    () => brandsStore.selectedBrand?.writing_rules ?? {},
  )

  const identity = computed<IdentityCards>(() => brandsStore.selectedBrand?.identity ?? {})

  const brandColors = computed<BrandColor[]>(() => {
    const colors = brandsStore.selectedBrand?.colors
    if (!colors) return []
    return COLOR_SLOTS.flatMap(({ key, label }, order) => {
      const hex = colors[key]
      return hex ? [{ id: key, hex, label, order }] : []
    })
  })

  const brandLogoUrl = computed<string | null>(() => brandsStore.selectedBrand?.logo_url ?? null)

  // --- internal: immutable optimistic patch of the selected brand row ---

  function patchSelected(patch: Partial<Brand>): Brand[] {
    const id = brandId.value
    const previous = brandsStore.brands
    if (id) {
      brandsStore.brands = previous.map((b) => (b.id === id ? { ...b, ...patch } : b))
    }
    return previous
  }

  function rollback(previous: Brand[]): void {
    brandsStore.brands = previous
  }

  function requireBrandId(): string {
    const id = brandId.value
    if (!id) throw new Error('no_selected_brand')
    return id
  }

  async function callRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
  }

  // --- tone snippets ---

  async function addToneSnippet(label: string, category: string, content: string): Promise<void> {
    const id = requireBrandId()
    await callRpc('add_tone_snippet', {
      p_brand_id: id,
      p_label: label,
      p_category: category,
      p_content: content,
    })
    await brandsStore.fetchBrands()
  }

  async function updateToneSnippet(
    snippetId: string,
    label: string,
    category: string,
    content: string,
  ): Promise<void> {
    const id = requireBrandId()
    const previous = patchSelected({
      tone_snippets: toneSnippets.value.map((s) =>
        s.id === snippetId ? { ...s, label, category, content } : s,
      ),
    })
    try {
      await callRpc('update_tone_snippet', {
        p_brand_id: id,
        p_snippet_id: snippetId,
        p_label: label,
        p_category: category,
        p_content: content,
      })
    } catch (e) {
      rollback(previous)
      throw e
    }
  }

  async function deleteToneSnippet(snippetId: string): Promise<void> {
    const id = requireBrandId()
    const previous = patchSelected({
      tone_snippets: toneSnippets.value.filter((s) => s.id !== snippetId),
    })
    try {
      await callRpc('delete_tone_snippet', { p_brand_id: id, p_snippet_id: snippetId })
    } catch (e) {
      rollback(previous)
      throw e
    }
  }

  async function reorderToneSnippets(orderedIds: string[]): Promise<void> {
    const id = requireBrandId()
    const byId = new Map(toneSnippets.value.map((s) => [s.id, s]))
    const previous = patchSelected({
      tone_snippets: orderedIds.flatMap((sid, order) => {
        const s = byId.get(sid)
        return s ? [{ ...s, order }] : []
      }),
    })
    try {
      await callRpc('reorder_tone_snippets', { p_brand_id: id, p_ordered_ids: orderedIds })
    } catch (e) {
      rollback(previous)
      throw e
    }
  }

  // --- saved blocks ---

  async function addSavedBlock(
    label: string,
    category: string,
    content: string,
    type: SavedBlockType,
  ): Promise<void> {
    const id = requireBrandId()
    await callRpc('add_saved_block', {
      p_brand_id: id,
      p_label: label,
      p_category: category,
      p_content: content,
      p_type: type,
    })
    await brandsStore.fetchBrands()
  }

  async function updateSavedBlock(
    blockId: string,
    label: string,
    category: string,
    content: string,
    type: SavedBlockType,
  ): Promise<void> {
    const id = requireBrandId()
    const previous = patchSelected({
      saved_blocks: savedBlocks.value.map((b) =>
        b.id === blockId ? { ...b, label, category, content, type } : b,
      ),
    })
    try {
      await callRpc('update_saved_block', {
        p_brand_id: id,
        p_block_id: blockId,
        p_label: label,
        p_category: category,
        p_content: content,
        p_type: type,
      })
    } catch (e) {
      rollback(previous)
      throw e
    }
  }

  async function deleteSavedBlock(blockId: string): Promise<void> {
    const id = requireBrandId()
    const previous = patchSelected({
      saved_blocks: savedBlocks.value.filter((b) => b.id !== blockId),
    })
    try {
      await callRpc('delete_saved_block', { p_brand_id: id, p_block_id: blockId })
    } catch (e) {
      rollback(previous)
      throw e
    }
  }

  async function reorderSavedBlocks(orderedIds: string[]): Promise<void> {
    const id = requireBrandId()
    const byId = new Map(savedBlocks.value.map((b) => [b.id, b]))
    const previous = patchSelected({
      saved_blocks: orderedIds.flatMap((bid, order) => {
        const b = byId.get(bid)
        return b ? [{ ...b, order }] : []
      }),
    })
    try {
      await callRpc('reorder_saved_blocks', { p_brand_id: id, p_ordered_ids: orderedIds })
    } catch (e) {
      rollback(previous)
      throw e
    }
  }

  // --- writing rules + identity ---

  async function setWritingRule(key: WritingRuleKey, enabled: boolean): Promise<void> {
    const id = requireBrandId()
    const previous = patchSelected({
      writing_rules: { ...writingRules.value, [key]: enabled },
    })
    try {
      await callRpc('set_writing_rule', { p_brand_id: id, p_rule_key: key, p_enabled: enabled })
    } catch (e) {
      rollback(previous)
      throw e
    }
  }

  async function updateIdentityCard(key: IdentityCardKey, content: string): Promise<void> {
    const id = requireBrandId()
    await callRpc('update_brand_identity', {
      p_brand_id: id,
      p_card_key: key,
      p_content: content,
    })
    await brandsStore.fetchBrands()
  }

  return {
    brandId,
    toneSnippets,
    savedBlocks,
    writingRules,
    identity,
    brandColors,
    brandLogoUrl,
    addToneSnippet,
    updateToneSnippet,
    deleteToneSnippet,
    reorderToneSnippets,
    addSavedBlock,
    updateSavedBlock,
    deleteSavedBlock,
    reorderSavedBlocks,
    setWritingRule,
    updateIdentityCard,
  }
})
