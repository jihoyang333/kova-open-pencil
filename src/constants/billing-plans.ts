// PRD 04 §6.4.2 / Plan Task 2.3 — client-side billing constants.
//
// Caps + display info only. Price IDs are server-only (api/_shared/price-map.ts).
// Free-tier bullets per founder lock 2026-05-17 D-4.

export type PlanName = 'free' | 'solo' | 'agency'

export interface PlanInfo {
  name: PlanName
  displayName: string
  monthlyUsd: number
  aiGenerationsCap: number
  storageBytesCap: number
  features: readonly string[]
}

export const PLAN_INFO: Readonly<Record<PlanName, PlanInfo>> = {
  free: {
    name: 'free',
    displayName: 'Free',
    monthlyUsd: 0,
    aiGenerationsCap: 20,
    storageBytesCap: 500 * 1024 * 1024,
    features: [
      '1 brand kit',
      'Unlimited canvases',
      'AI design assistant',
      'Image export (PNG slices)',
    ],
  },
  solo: {
    name: 'solo',
    displayName: 'Solo',
    monthlyUsd: 19,
    aiGenerationsCap: 200,
    storageBytesCap: 5 * 1024 * 1024 * 1024,
    features: [
      'Unlimited brand kits',
      '200 AI generations / month',
      '30-day version history',
      'Email support',
    ],
  },
  agency: {
    name: 'agency',
    displayName: 'Agency',
    monthlyUsd: 49,
    aiGenerationsCap: 1000,
    storageBytesCap: 50 * 1024 * 1024 * 1024,
    features: [
      'Unlimited brand kits',
      '1,000 AI generations / month',
      'Unlimited version history',
      'Priority support',
    ],
  },
} as const

// MVP gate stub — usePlanGate returns allowed=true for everything until founder
// activates pricing post-launch.
export const PLAN_GATE_ENFORCED = false

export const PLAN_STATUS_VALUES = [
  'active',
  'past_due',
  'cancelled',
  'incomplete',
  'trialing',
] as const

export type PlanStatus = (typeof PLAN_STATUS_VALUES)[number]
