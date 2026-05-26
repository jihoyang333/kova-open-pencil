import type { SupabaseClient } from '@supabase/supabase-js'

// W9b Cluster 03 — purge per-brand Storage objects after delete_brand RPC.
//
// FK CASCADE handles DB rows, but Storage doesn't cascade — explicit purge.
// Plan 03 §5.1.5. Best-effort: failures are logged but never throw, because
// the brand row is already deleted via FK CASCADE; orphan objects can be
// reaped later by scripts/reap-orphan-storage.ts.
//
// Buckets:
//   brand-logos        — {brand_id}/logo.{ext}
//   media-assets       — {brand_id}/{media_id}.{ext}
//   brand-fonts        — {brand_id}/{font_id}.{woff2,ttf,otf}
//   canvas-snapshots   — {brand_id}/{canvas_id}/{snapshot_id}.kiwi.zst
//   thumbnails         — {user_id}/{canvas_id}.png — handled by C02 cascade, not here

const BUCKETS = ['brand-logos', 'media-assets', 'brand-fonts', 'canvas-snapshots'] as const

export interface SweepResult {
  swept: number
  failed: string[]
}

export async function purgeBrandStorageObjects(
  admin: SupabaseClient,
  brandId: string,
  userId: string
): Promise<SweepResult> {
  const failed: string[] = []
  let swept = 0

  for (const bucket of BUCKETS) {
    const { data: objects, error: listErr } = await admin
      .storage
      .from(bucket)
      .list(brandId, { limit: 1000 })

    if (listErr) {
      failed.push(`${bucket}:list:${listErr.message}`)
      continue
    }
    if (!objects?.length) continue

    const paths = objects.map((o) => `${brandId}/${o.name}`)
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths)
    if (rmErr) {
      failed.push(`${bucket}:remove:${rmErr.message}`)
      continue
    }
    swept += paths.length
  }

  if (failed.length) {
    console.warn('[storage-sweep] purgeBrandStorageObjects partial', { brandId, userId, failed })
  }
  return { swept, failed }
}
