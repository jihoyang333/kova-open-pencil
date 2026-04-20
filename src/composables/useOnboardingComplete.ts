import { supabase } from '@/lib/supabase'
import { getRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useBrandsStore } from '@/stores/brands'
import { useCanvasesStore } from '@/stores/canvases'

import type { BrandColors, BrandFonts } from '@/types/kova/database'

interface CompleteOnboardingInput {
  name: string
  brandName: string
  brandUrl: string
  colors: BrandColors | null
  fonts: BrandFonts | null
  voice: string | null
  industry: string | null
  logoFile: File | null
  logoUrl: string | null
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<void> {
  const authStore = useAuthStore()
  const brandsStore = useBrandsStore()
  const canvasesStore = useCanvasesStore()
  const router = getRouter()

  // Reviewer fix #4: Guard instead of non-null assertion
  if (!authStore.user) {
    throw new Error('Not authenticated')
  }

  // 1. Save user name
  await authStore.updateName(input.name)

  // 2. Create brand with all fields
  const brand = await brandsStore.createBrandFull({
    name: input.brandName,
    url: input.brandUrl || null,
    colors: input.colors,
    fonts: input.fonts,
    voice: input.voice,
    industry: input.industry,
    logoFile: input.logoFile,
    logoUrl: input.logoUrl
  })

  // 3. Create matching brand_profiles row (1:1 FK constraint requires same UUID)
  const { error: profileError } = await supabase.from('brand_profiles').insert({
    id: brand.id,
    user_id: authStore.user.id,
    name: input.brandName,
    style: 'balanced',
    primary_color: input.colors?.primary ?? '#000000',
    secondary_color: input.colors?.secondary ?? null,
    primary_font: input.fonts?.heading ?? 'Inter',
    secondary_font: input.fonts?.body ?? null,
    logo_url: brand.logo_url ?? null,
    industry: input.industry ?? null,
    voice_tone: input.voice ?? null,
    website_url: input.brandUrl || null,
  })
  if (profileError) throw profileError

  // 4. Set onboarded = true
  const { error } = await supabase
    .from('users')
    .update({ onboarded: true })
    .eq('id', authStore.user.id)

  if (error) throw error

  // 5. Create first canvas
  const canvas = await canvasesStore.createCanvas(brand.id, `${input.brandName} - Canvas 1`)

  // 6. Refresh profile — fetch from DB, then guarantee onboarded flag
  // fetchProfile can fail silently (catches errors internally), so we
  // also set the flag optimistically to ensure the router guard passes.
  await authStore.fetchProfile()
  if (authStore.profile) {
    authStore.profile = { ...authStore.profile, onboarded: true }
  }

  // 7. Redirect to editor
  await router.push(`/editor/${canvas.id}`)
}
