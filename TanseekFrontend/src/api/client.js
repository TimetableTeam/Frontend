import { handleMockRequest } from './mockAdapter.js'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '')
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
  if (!response.ok) {
    const message = payload?.message || payload?.error || `API request failed (${response.status})`
    throw new Error(message)
  }
  return payload
}
