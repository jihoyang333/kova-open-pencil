import { computed, ref, type ComputedRef } from 'vue'

import { supabase } from '@/lib/supabase'
import type { VoiceDraft, VoiceDraftPayload } from '@/types/brand-kit'

/**
 * Cluster 05 — useVoiceDraft (PRD §6.2, guardrail 00e §6 #5).
 *
 * Module-level state for the single active voice draft. AI-scraped brand voice
 * NEVER writes to brands.* silently — it lands in voice_drafts and the user
 * must confirm (writes through) or discard via the confirm/discard endpoints.
 */
const activeDraft = ref<VoiceDraft | null>(null)

function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

export function useVoiceDraft(): {
  draft: ComputedRef<VoiceDraft | null>
  hasDraft: ComputedRef<boolean>
  loadDraftAfterShopifyConnect: (brandId: string) => Promise<VoiceDraft | null>
  confirmDraft: (
    editedPayload?: VoiceDraftPayload,
  ) => Promise<{ voice_word_count: number; tone_snippet_count: number }>
  discardDraft: () => Promise<void>
  clear: () => void
} {
  const draft = computed(() => activeDraft.value)
  const hasDraft = computed(() => activeDraft.value !== null)

  async function loadDraftAfterShopifyConnect(brandId: string): Promise<VoiceDraft | null> {
    const { data, error } = await supabase
      .from('voice_drafts')
      .select('*')
      .eq('brand_id', brandId)
      .is('confirmed_at', null)
      .is('discarded_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    activeDraft.value = (data as VoiceDraft | null) ?? null
    return activeDraft.value
  }

  async function authHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${data.session?.access_token ?? ''}` }
  }

  async function confirmDraft(
    editedPayload?: VoiceDraftPayload,
  ): Promise<{ voice_word_count: number; tone_snippet_count: number }> {
    const current = activeDraft.value
    if (!current) throw new Error('no_active_draft')
    const res = await fetch(`/api/brands/${current.brand_id}/voice-draft/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': newIdempotencyKey(),
        ...(await authHeader()),
      },
      body: JSON.stringify({
        draft_id: current.id,
        ...(editedPayload ? { edited_payload: editedPayload } : {}),
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: 'unknown' }))) as { error?: string }
      throw new Error(body.error ?? `http_${res.status}`)
    }
    const body = (await res.json()) as {
      success: boolean
      voice_word_count: number
      tone_snippet_count: number
    }
    activeDraft.value = null
    return { voice_word_count: body.voice_word_count, tone_snippet_count: body.tone_snippet_count }
  }

  async function discardDraft(): Promise<void> {
    const current = activeDraft.value
    if (!current) throw new Error('no_active_draft')
    const res = await fetch(`/api/brands/${current.brand_id}/voice-draft/discard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': newIdempotencyKey(),
        ...(await authHeader()),
      },
      body: JSON.stringify({ draft_id: current.id }),
    })
    if (!res.ok) throw new Error(`http_${res.status}`)
    activeDraft.value = null
  }

  function clear(): void {
    activeDraft.value = null
  }

  return {
    draft,
    hasDraft,
    loadDraftAfterShopifyConnect,
    confirmDraft,
    discardDraft,
    clear,
  }
}
