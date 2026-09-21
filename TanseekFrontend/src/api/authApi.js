import { apiRequest } from './client.js'
import { API_CONTRACTS } from './contracts.js'

const SESSION_KEY = 'tanseek_session'
const TOKEN_KEY = 'tanseek_access_token'

const ROLE_ALIASES = {
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  scheduler: 'scheduler',
  scheduler_admin: 'scheduler',
  admin: 'admin',
  department_admin: 'admin',
  coordinator: 'coordinator',
  department_coordinator: 'coordinator',
  lecturer: 'lecturer',
  doctor: 'lecturer',
  ta: 'lecturer',
  lab_manager: 'lab_manager',
  facilities_manager: 'lab_manager',
}

function normalizeRole(role) {
  const key = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return ROLE_ALIASES[key] || key
}

function normalizeSession(payload) {
  const user = payload?.user || payload?.data?.user || null
  const token = payload?.access_token || payload?.token || payload?.data?.access_token || payload?.data?.token || null

  if (!user) throw new Error('Login response did not include a user profile.')

  return {
    token,
    user: {
      ...user,
      role: normalizeRole(user.role),
    },
  }
}

export const authApi = {
  async login(email, password) {
    const payload = await apiRequest(API_CONTRACTS.authLogin, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return normalizeSession(payload)
  },
}

export function saveAuthSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  if (session?.token) localStorage.setItem(TOKEN_KEY, session.token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function loadAuthSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.user?.role) return null
    if (parsed.user.role === 'student') {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TOKEN_KEY)
}
