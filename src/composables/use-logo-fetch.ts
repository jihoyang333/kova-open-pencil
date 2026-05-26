// PRD 02 §6.3 + Plan T08 — debounced favicon probe with manual-upload override.
// Used by the BrandIdentityStep onboarding card to auto-fill brand logo.

import { ref, watch, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { fetchFavicon } from '@/utils/logo-fetch'

const DEBOUNCE_MS = 600

export interface UseLogoFetch {
  logoUrl: Ref<string | null>
  isFetching: Ref<boolean>
  manualOverride: (file: File) => Promise<void>
}

export function useLogoFetch(urlRef: Ref<string>): UseLogoFetch {
  const logoUrl = ref<string | null>(null)
  const isFetching = ref(false)

  const debouncedFetch = useDebounceFn(async (raw: string) => {
    // L2 audit fix — capture the url at fire time so a stale fetch can't
    // overwrite logoUrl after the user cleared / changed the field.
    const requested = raw
    try {
      const fetched = await fetchFavicon(requested)
      if (urlRef.value === requested) logoUrl.value = fetched
    } finally {
      if (urlRef.value === requested) isFetching.value = false
    }
  }, DEBOUNCE_MS)

  watch(
    urlRef,
    (next) => {
      if (!next) {
        logoUrl.value = null
        isFetching.value = false
        return
      }
      isFetching.value = true
      void debouncedFetch(next)
    },
    { immediate: false }
  )

  async function manualOverride(file: File): Promise<void> {
    const auth = useAuthStore()
    const userId = auth.user?.id
    if (!userId) throw new Error('Not authenticated')
    // L1 audit fix — derive extension from the uploaded file rather than
    // hardcoding `.png` (PRD §3.1 accepts PNG/JPG).
    const ext = extensionFromFile(file)
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('brand-logos')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('brand-logos').getPublicUrl(path)
    logoUrl.value = data.publicUrl
  }

  function extensionFromFile(file: File): string {
    const dot = file.name.lastIndexOf('.')
    if (dot !== -1 && dot < file.name.length - 1) {
      return file.name.slice(dot + 1).toLowerCase()
    }
    if (file.type === 'image/jpeg') return 'jpg'
    return 'png'
  }

  return { logoUrl, isFetching, manualOverride }
}
