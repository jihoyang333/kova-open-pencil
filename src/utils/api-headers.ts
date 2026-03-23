import { useAuthStore } from '@/stores/auth'

/**
 * Returns HTTP headers for authenticated API requests.
 * Must be called within a Pinia-active context (component setup or composable).
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authStore = useAuthStore()
  const token = authStore.session?.access_token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}
