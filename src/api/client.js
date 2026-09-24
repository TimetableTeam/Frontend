import { handleMockRequest } from './mockAdapter.js'

const API_BASE_URL = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('tanseek_access_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  if (USE_MOCK_API) return handleMockRequest(path, { ...options, headers })

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (response.status === 401 && token && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tanseek:auth-expired'))
  }
  if (!response.ok || payload?.success === false) {
    const message = payload?.message || payload?.error || `API request failed (${response.status})`
    throw new Error(message)
  }

  // Osama's production contract wraps successful JSON responses as
  // { success: true, data: ... }. Mock mode already returns the inner payload.
  if (payload?.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }

  return payload
}
