// PRD 02 §6.3 + C-MED7 stub — Cluster 05 owns the real implementation.
// Plan 02 calls `enqueueBrandKitExtract` from OnboardingView when the user
// commits the brand-kit step; Cluster 05's queue Edge Function lives at
// api/brand-kit/extract.ts.
//
// Until Cluster 05 ships, this stub no-ops so the onboarding flow completes
// without an unhandled promise rejection. Real wiring lifts the contract
// documented in PRD 05.

export interface BrandKitExtractPayload {
  brand_id: string
  files: File[]
  guidelines: string
  source: 'onboarding' | 'brand-kit'
}

export interface UseBrandKitExtractQueue {
  enqueueBrandKitExtract: (payload: BrandKitExtractPayload) => Promise<void>
}

export function useBrandKitExtractQueue(): UseBrandKitExtractQueue {
  async function enqueueBrandKitExtract(_payload: BrandKitExtractPayload): Promise<void> {
    // Cluster 05 — see PRD 05 §6.4 brand-kit-extract queue contract.
    return
  }
  return { enqueueBrandKitExtract }
}
