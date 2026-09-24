import { apiRequest } from './client.js'
import { API_CONTRACTS } from './contracts.js'

const SESSION_KEY = 'tanseek_session'
const TOKEN_KEY = 'tanseek_access_token'
const LAST_ACTIVITY_KEY = 'tanseek_last_activity_at'
export const SESSION_IDLE_MINUTES = Math.max(1, Number(import.meta.env.VITE_SESSION_IDLE_MINUTES || 30))
export const SESSION_IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000

const ROLE_ALIASES = {
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  scheduler: 'scheduler',
  scheduler_admin: 'scheduler',
  admin: 'admin',
  department_admin: 'admin',
  coordinator: 'department_coordinator',
  department_coordinator: 'department_coordinator',
  lecturer: 'lecturer',
  doctor: 'lecturer',
  ta: 'ta',
  lab_manager: 'lab_manager',
  facilities_manager: 'lab_manager',
  registrar: 'registration_officer',
  registration_officer: 'registration_officer',
  academic_affairs: 'registration_officer',
  student: 'student',
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

  async forgotPassword(email) {
    return apiRequest(API_CONTRACTS.authForgotPassword, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async resetPassword({ email, challengeId, code, newPassword }) {
    return apiRequest(API_CONTRACTS.authResetPassword, {
      method: 'POST',
      body: JSON.stringify({
        email,
        challenge_id: challengeId,
        code,
        new_password: newPassword,
      }),
    })
  },
}

export function saveAuthSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  if (session?.token) localStorage.setItem(TOKEN_KEY, session.token)
  else localStorage.removeItem(TOKEN_KEY)
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
}

export function loadAuthSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.user?.role) return null
    return parsed
  } catch {
    return null
  }
}

export function getLastAuthActivity() {
  const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0)
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function touchAuthActivity(at = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(at))
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LAST_ACTIVITY_KEY)
}
