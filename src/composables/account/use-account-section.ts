// PRD 04 §6.3 — useAccountSection.
//
// Resolves the active /account/:section param against the canonical list.
// Source of truth for the sidebar active state + SectionResolver dispatch.

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type AccountSection =
  | 'profile'
  | 'brands'
  | 'billing'
  | 'brand-kit'
  | 'integrations'
  | 'danger-zone'

export const ACCOUNT_SECTIONS = [
  'profile',
  'brands',
  'billing',
  'brand-kit',
  'integrations',
  'danger-zone',
] as const

function isAccountSection(s: string): s is AccountSection {
  return (ACCOUNT_SECTIONS as readonly string[]).includes(s)
}

export function useAccountSection() {
  const route = useRoute()
  const router = useRouter()

  const activeSection = computed<AccountSection>(() => {
    const param = route.params.section
    const raw = typeof param === 'string' && param !== '' ? param : 'profile'
    return isAccountSection(raw) ? raw : 'profile'
  })

  async function goto(section: AccountSection): Promise<void> {
    await router.push({ name: 'account', params: { section } })
  }

  return { activeSection, goto }
}
