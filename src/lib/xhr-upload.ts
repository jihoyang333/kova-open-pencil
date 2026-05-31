// Shared multipart-upload helper with real upload-progress events.
// `fetch` exposes no upload progress, so XHR is required (PRD 05 §6.2 / §6.3).

/**
 * POST a FormData body with an upload-progress callback. Resolves parsed JSON
 * on 2xx; rejects with the server `error` string (or `http_<status>`) on
 * failure, or `network_error` on transport failure.
 */
export function postWithProgress(
  url: string,
  form: FormData,
  token: string,
  onProgress: (fraction: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (ev: ProgressEvent): void => {
      if (ev.lengthComputable) onProgress(ev.loaded / ev.total)
    }
    xhr.onload = (): void => {
      let parsed: unknown = null
      try {
        parsed = JSON.parse(xhr.responseText) as unknown
      } catch {
        parsed = null
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1)
        resolve(parsed)
      } else {
        const errBody = parsed as { error?: string } | null
        reject(new Error(errBody?.error ?? `http_${xhr.status}`))
      }
    }
    xhr.onerror = (): void => reject(new Error('network_error'))
    xhr.send(form)
  })
}
