// PRD 04 §6.3 — useAvatarUpload.
//
// State machine: idle → uploading → done / error. Wraps POST /api/account/
// avatar-upload (multipart). PNG/JPG validated client-side before send;
// server re-validates via sharp magic bytes (defense in depth).

import { ref } from 'vue'

import { supabase } from '@/lib/supabase'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/png', 'image/jpeg'] as const

export function useAvatarUpload() {
  const status = ref<UploadStatus>('idle')
  const error = ref<string | null>(null)
  const path = ref<string | null>(null)
  const publicUrl = ref<string | null>(null)

  function validate(file: File): string | null {
    if (file.size > MAX_BYTES) return 'file_too_large'
    if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) return 'unsupported_image_format'
    return null
  }

  async function upload(file: File): Promise<boolean> {
    const validationError = validate(file)
    if (validationError !== null) {
      status.value = 'error'
      error.value = validationError
      return false
    }
    status.value = 'uploading'
    error.value = null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session === null) {
        status.value = 'error'
        error.value = 'not_authenticated'
        return false
      }
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/account/avatar-upload', {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'unknown' })) as { error?: string }
        status.value = 'error'
        error.value = body.error ?? `http_${res.status}`
        return false
      }
      const body = await res.json() as { avatar_storage_path: string; public_url: string }
      path.value = body.avatar_storage_path
      publicUrl.value = body.public_url
      status.value = 'done'
      return true
    } catch (e: unknown) {
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'upload_failed'
      return false
    }
  }

  async function remove(): Promise<boolean> {
    status.value = 'uploading'
    error.value = null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session === null) {
        status.value = 'error'
        error.value = 'not_authenticated'
        return false
      }
      const res = await fetch('/api/account/avatar-delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        status.value = 'error'
        error.value = `http_${res.status}`
        return false
      }
      path.value = null
      publicUrl.value = null
      status.value = 'done'
      return true
    } catch (e: unknown) {
      status.value = 'error'
      error.value = e instanceof Error ? e.message : 'delete_failed'
      return false
    }
  }

  function reset(): void {
    status.value = 'idle'
    error.value = null
    path.value = null
    publicUrl.value = null
  }

  return { status, error, path, publicUrl, upload, remove, reset }
}
