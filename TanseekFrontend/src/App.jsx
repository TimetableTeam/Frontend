import React, { useEffect, useMemo, useState } from 'react'
import LoginScreen from './components/LoginScreen'
import PublicStudentHome from './components/PublicStudentHome'
import Layout from './components/Layout'
import Overview from './components/Overview'
import TimetableDashboard from './components/TimetableDashboard'
import ConflictResolution from './components/ConflictResolution'
import RoomsLabs from './components/RoomsLabs'
import MasterData from './components/MasterData'
import CoordinatorRequirements from './components/CoordinatorRequirements'
import StaffAvailability from './components/StaffAvailability'
import LabManagerChecks from './components/LabManagerChecks'
import SystemAdministration from './components/SystemAdministration'
import { allocations as initialAllocations, conflicts, slots } from './data/mockData'
import { authApi, clearAuthSession, loadAuthSession, saveAuthSession } from './api/authApi'
import { tanseekApi } from './api/tanseekApi'
import { getAllowedPages, getDefaultPage } from './auth/permissions'

const DRAFT_ID = 'draft-v3'
const RESOLVED_CONFLICTS_KEY = 'tanseek_mock_resolved_conflicts_v28'

function loadResolvedConflictIds() {
  try {
    const raw = localStorage.getItem(RESOLVED_CONFLICTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveResolvedConflictIds(ids) {
  try {
    localStorage.setItem(RESOLVED_CONFLICTS_KEY, JSON.stringify(ids))
  } catch {
    // Mock persistence is best-effort only.
  }
}

function cloneAllocations() {
  return initialAllocations.map(item => ({ ...item }))
}

function slotIdForAlternative(alternative) {
  const start = String(alternative?.time || '').split(/[–-]/)[0].trim()
  return slots.find(slot => slot.start === start)?.id || null
}

export default function App() {
  const initialSession = loadAuthSession()
  const [session, setSession] = useState(initialSession)
  const [showLogin, setShowLogin] = useState(false)
  const role = session?.user?.role || null
  const [page, setPage] = useState(() => getDefaultPage(initialSession?.user))
  const [resolvedIds, setResolvedIds] = useState(() => loadResolvedConflictIds())
  const [draftAllocations, setDraftAllocations] = useState(() => cloneAllocations())
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [publishedVersion, setPublishedVersion] = useState(null)
  const [publishedLoading, setPublishedLoading] = useState(false)
  const [publishedError, setPublishedError] = useState('')

  const conflictCount = useMemo(() => conflicts.filter(c => !resolvedIds.includes(c.id)).length, [resolvedIds])

  useEffect(() => {
    if (!role) return
    const pages = getAllowedPages(session?.user)
    if (!pages.includes(page)) setPage(getDefaultPage(session?.user))
  }, [role, page, session?.user?.permissions])

  useEffect(() => {
    if (!session) return
    if (getAllowedPages(session.user).includes('timetable')) refreshPublishedTimetable()
    if (session.user.role !== 'lecturer' && getAllowedPages(session.user).includes('timetable')) refreshDraftAllocations()
  }, [session?.user?.id])

  async function refreshDraftAllocations() {
    setDraftLoading(true)
    setDraftError('')
    try {
      const payload = await tanseekApi.getDraftAllocations(DRAFT_ID)
      setDraftAllocations(Array.isArray(payload) ? payload : payload?.allocations || [])
    } catch (error) {
      setDraftError(error?.message || 'Could not load draft allocations.')
    } finally {
      setDraftLoading(false)
    }
  }

  async function refreshPublishedTimetable() {
    setPublishedLoading(true)
    setPublishedError('')
    try {
      const payload = await tanseekApi.getPublishedTimetable()
      setPublishedVersion(payload?.version || null)
    } catch (error) {
      setPublishedError(error?.message || 'Could not load the latest published timetable.')
    } finally {
      setPublishedLoading(false)
    }
  }

  async function handleLogin({ email, password }) {
    const nextSession = await authApi.login(email, password)
    const pages = getAllowedPages(nextSession.user)
    if (pages.length === 0) throw new Error(`This account does not have any frontend permissions.`)
    saveAuthSession(nextSession)
    setSession(nextSession)
    setShowLogin(false)
    setPage(getDefaultPage(nextSession.user))
  }

  function handleLogout() {
    clearAuthSession()
    setSession(null)
    setShowLogin(false)
    setPage('overview')
    setDraftAllocations(cloneAllocations())
    setDraftError('')
    setPublishedError('')
  }

  async function handleAddAllocation(payload) {
    const created = await tanseekApi.createDraftAllocation(DRAFT_ID, payload)
    setDraftAllocations(current => [...current, created])
    return created
  }

  function handleResolve(conflictId, alternativeId) {
    const conflict = conflicts.find(item => item.id === conflictId)
    const alternative = conflict?.alternatives?.find(item => item.id === alternativeId)

    if (conflict && alternative) {
      const nextSlot = slotIdForAlternative(alternative)
      const existing = draftAllocations.find(allocation => allocation.id === conflict.allocationId)
      if (existing) {
        const updatedAllocation = {
          ...existing,
          room: alternative.room,
          day: alternative.day,
          slot: nextSlot || existing.slot,
          status: 'ok',
        }
        setDraftAllocations(current => current.map(allocation => allocation.id === conflict.allocationId ? updatedAllocation : allocation))
        tanseekApi.updateDraftAllocation(DRAFT_ID, updatedAllocation.id, updatedAllocation).catch(() => {})
      }
    }

    setResolvedIds(current => {
      const next = current.includes(conflictId) ? current : [...current, conflictId]
      saveResolvedConflictIds(next)
      return next
    })
  }

  async function handlePublish() {
    const validation = await tanseekApi.validateDraft(DRAFT_ID, {
      resolved_conflict_ids: resolvedIds,
    })

    if (!validation?.valid) {
      throw new Error(`Publication blocked: ${validation?.hard_conflict_count || conflictCount} hard conflict${(validation?.hard_conflict_count || conflictCount) === 1 ? '' : 's'} must be resolved first.`)
    }

    const published = await tanseekApi.publishDraft(DRAFT_ID, {
      term_id: 'fall-2026',
      term_name: 'Fall 2026',
      name: `Fall 2026 · Version ${(publishedVersion?.version_number || 0) + 1}`,
      published_by: session?.user?.name || 'Scheduler',
      resolved_conflict_ids: resolvedIds,
      allocations: draftAllocations,
    })

    setPublishedVersion(published)
    return published
  }

  if (!session) {
    if (showLogin) return <LoginScreen onLogin={handleLogin} onBack={() => setShowLogin(false)} />
    return <PublicStudentHome onLogin={() => setShowLogin(true)} />
  }

  const body = {
    overview: <Overview conflictCount={conflictCount} currentUser={session?.user} />,
    timetable: (
      <TimetableDashboard
        role={role}
        user={session.user}
        conflictCount={conflictCount}
        onGoConflicts={() => setPage('conflicts')}
        allocations={draftAllocations}
        publishedVersion={publishedVersion}
        publishedLoading={publishedLoading}
        publishedError={publishedError}
        onReloadPublished={refreshPublishedTimetable}
        onPublish={handlePublish}
        onAddAllocation={handleAddAllocation}
        draftLoading={draftLoading}
        draftError={draftError}
        onReloadDraft={refreshDraftAllocations}
      />
    ),
    rooms: <RoomsLabs />,
    requirements: <CoordinatorRequirements />,
    availability: <StaffAvailability />,
    labchecks: <LabManagerChecks />,
    conflicts: <ConflictResolution conflicts={conflicts} resolvedIds={resolvedIds} onResolve={handleResolve} />,
    master: <MasterData />,
    system: <SystemAdministration currentUser={session.user} />,
  }[page]

  return (
    <Layout page={page} onPageChange={setPage} session={session} conflictCount={conflictCount} onLogout={handleLogout}>
      {body}
    </Layout>
  )
}
