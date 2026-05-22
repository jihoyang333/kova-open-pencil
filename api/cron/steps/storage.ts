import type { SupabaseClient } from '@supabase/supabase-js'

// W8a Cluster 01 — cron step: storage (Plan 01 Task 6d).
// Paginated purge of user-owned Storage objects across 4 buckets.
// remove() on missing path is a no-op (Supabase Storage idempotent contract).

export interface StepArgs {
  supabase: SupabaseClient
  userId: string
  idempotencyKey: string
}

export type StepResult = { ok: true } | { ok: false; retriable: boolean; error: string }

const BATCH = 1000

interface BucketFile {
  name: string
}

async function purgeBucketPath(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): Promise<StepResult | null> {
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(path, {
      limit: BATCH,
      offset,
    })
    if (error) {
      // Bucket-not-found → treat as success (bucket may not exist in dev env)
      if (error.message?.toLowerCase().includes('not found')) return null
      return { ok: false, retriable: true, error: `${bucket}: ${error.message}` }
    }
    if (!data || data.length === 0) break
    const files = data as BucketFile[]
    const fullPaths = files.map((d) => `${path}/${d.name}`)
    const { error: remErr } = await supabase.storage.from(bucket).remove(fullPaths)
    if (remErr) return { ok: false, retriable: true, error: `${bucket} remove: ${remErr.message}` }
    if (files.length < BATCH) break
    offset += BATCH
  }
  return null
}

export async function runStep({ supabase, userId }: StepArgs): Promise<StepResult> {
  // Per-user buckets
  for (const bucket of ['media-assets', 'canvas-snapshots', 'thumbnails']) {
    const err = await purgeBucketPath(supabase, bucket, userId)
    if (err) return err
  }

  // Per-brand bucket
  const { data: brands, error: bErr } = await supabase.from('brands').select('id').eq('user_id', userId)
  if (bErr && (bErr as { code?: string }).code !== '42P01') {
    return { ok: false, retriable: true, error: bErr.message }
  }
  for (const brand of (brands as { id: string }[] | null) ?? []) {
    const err = await purgeBucketPath(supabase, 'brand-fonts', brand.id)
    if (err) return err
  }

  return { ok: true }
}
