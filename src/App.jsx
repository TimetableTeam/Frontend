import React, { useEffect, useMemo, useState } from 'react'
import LoginScreen from './components/LoginScreen'
import Layout from './components/Layout'
import Overview from './components/Overview'
import TimetableDashboard from './components/TimetableDashboard'
import ConflictResolution from './components/ConflictResolution'
import RoomsLabs from './components/RoomsLabs'
import MasterData from './components/MasterData'
import DepartmentManagement from './components/DepartmentManagement'
import CoordinatorRequirements from './components/CoordinatorRequirements'
import StaffAvailability from './components/StaffAvailability'
import LabManagerChecks from './components/LabManagerChecks'
import SystemAdministration from './components/SystemAdministration'
import EnrollmentManagement from './components/EnrollmentManagement'
import SectionAssignmentManagement from './components/SectionAssignmentManagement'
import InstructorAssignments from './components/InstructorAssignments'
import AuditLog from './components/AuditLog'
import ProfileSettings from './components/ProfileSettings'
import { allocations as initialAllocations, conflicts, slots } from './data/mockData'
import { authApi, clearAuthSession, getLastAuthActivity, loadAuthSession, saveAuthSession, SESSION_IDLE_MINUTES, SESSION_IDLE_MS, touchAuthActivity } from './api/authApi'
import { tanseekApi } from './api/tanseekApi'
import { USE_MOCK_API } from './api/client'
import { getAllowedPages, getDefaultPage, hasPermission } from './auth/permissions'

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
  const start = String(alternative?.start || alternative?.time || '').split(/[–-]/)[0].trim()
  return slots.find(slot => slot.start === start)?.id || null
}

const ISO_DAY_NAMES = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' }

function frontendAlternative(item, allocationId, index) {
  const reasons = Array.isArray(item?.reasons) ? item.reasons : []
  return {
    id: `live-${allocationId}-${item?.roomId || item?.room || 'room'}-${item?.weekday || 'day'}-${item?.start || index}`,
    room: item?.room || `Room ${item?.roomId || ''}`.trim(),
    roomId: item?.roomId ?? item?.room_id ?? null,
    weekday: Number(item?.weekday) || null,
    day: ISO_DAY_NAMES[Number(item?.weekday)] || String(item?.day || ''),
    start: item?.start || null,
    end: item?.end || null,
    time: item?.start && item?.end ? `${item.start}–${item.end}` : String(item?.time || ''),
    capacity: item?.capacity ?? null,
    score: item?.score ?? null,
    equipment: item?.equipment || '',
    tradeoff: reasons.join(' · '),
    reasons,
  }
}

function backendConflictItems(validation, allocations) {
  const allocationById = new Map((allocations || []).map(item => [String(item.id), item]))
  return (validation?.conflicts || []).flatMap(group => {
    const allocation = allocationById.get(String(group.allocationId))
    const allocationLabel = [
      allocation?.code || allocation?.course_code || allocation?.course,
      group.sectionCode || allocation?.section,
    ].filter(Boolean).join(' · ') || `Allocation ${group.allocationId}`

    const items = Array.isArray(group.conflicts) && group.conflicts.length ? group.conflicts : [{ type: 'HARD_CONFLICT', message: 'This allocation has a blocking conflict.' }]
    const alternatives = Array.isArray(group.alternatives)
      ? group.alternatives.map((item, index) => frontendAlternative(item, group.allocationId, index))
      : []

    return items.map((issue, index) => ({
      id: `backend-${group.allocationId}-${issue?.type || 'conflict'}-${index}`,
      title: String(issue?.type || 'HARD_CONFLICT').replaceAll('_', ' '),
      scope: group.sectionCode || allocation?.section || `Allocation ${group.allocationId}`,
      reason: issue?.message || 'This allocation has a blocking conflict.',
      allocationId: group.allocationId,
      allocation: allocationLabel,
      alternatives,
      recommendationError: group.recommendation_error || '',
      source: 'backend',
    }))
  })
}

export default function App() {
  const initialSession = loadAuthSession()
  const [session, setSession] = useState(initialSession)
  const [loginNotice, setLoginNotice] = useState('')
  const role = session?.user?.role || null
  const [page, setPage] = useState(() => getDefaultPage(initialSession?.user))
  const [resolvedIds, setResolvedIds] = useState(() => loadResolvedConflictIds())
  const [draftAllocations, setDraftAllocations] = useState(() => cloneAllocations())
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [publishedVersion, setPublishedVersion] = useState(null)
  const [publishedDetails, setPublishedDetails] = useState(null)
  const [publishedLoading, setPublishedLoading] = useState(false)
  const [publishedError, setPublishedError] = useState('')
  const [scheduleWorkflow, setScheduleWorkflow] = useState(null)
  const [draftValidation, setDraftValidation] = useState(null)

  const liveConflicts = useMemo(() => backendConflictItems(draftValidation, draftAllocations), [draftValidation, draftAllocations])
  const visibleConflicts = USE_MOCK_API ? conflicts : liveConflicts
  const conflictCount = useMemo(
    () => USE_MOCK_API ? conflicts.filter(c => !resolvedIds.includes(c.id)).length : liveConflicts.length,
    [resolvedIds, liveConflicts],
  )

  useEffect(() => {
    if (!session) return undefined

    let lastActivity = getLastAuthActivity() || Date.now()
    let lastPersisted = lastActivity

    const expireSession = (message) => {
      clearAuthSession()
      setSession(null)
      setPage('overview')
      setDraftAllocations(cloneAllocations())
      setDraftValidation(null)
      setScheduleWorkflow(null)
      setLoginNotice(message)
    }

    const markActivity = () => {
      const now = Date.now()
      lastActivity = now
      if (now - lastPersisted >= 15000) {
        lastPersisted = now
        touchAuthActivity(now)
      }
    }

    const checkIdle = () => {
      if (Date.now() - lastActivity >= SESSION_IDLE_MS) {
        expireSession(`Your session ended after ${SESSION_IDLE_MINUTES} minutes of inactivity. Please sign in again.`)
      }
    }

    const handleAuthExpired = () => expireSession('Your session expired. Please sign in again.')
    const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(eventName => window.addEventListener(eventName, markActivity, { passive: true }))
    window.addEventListener('focus', checkIdle)
    window.addEventListener('tanseek:auth-expired', handleAuthExpired)

    checkIdle()
    const timer = window.setInterval(checkIdle, 15000)

    return () => {
      window.clearInterval(timer)
      activityEvents.forEach(eventName => window.removeEventListener(eventName, markActivity))
      window.removeEventListener('focus', checkIdle)
      window.removeEventListener('tanseek:auth-expired', handleAuthExpired)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!role) return
    const pages = getAllowedPages(session?.user)
    if (page !== 'profile' && !pages.includes(page)) setPage(getDefaultPage(session?.user))
  }, [role, page, session?.user?.permissions])

  useEffect(() => {
    if (!session) return
    if (getAllowedPages(session.user).includes('timetable')) refreshPublishedTimetable()
    if (!['lecturer', 'ta', 'student'].includes(session.user.role) && getAllowedPages(session.user).includes('timetable')) { refreshDraftAllocations(); refreshScheduleWorkflow(); refreshDraftValidation() }
  }, [session?.user?.id])

  useEffect(() => {
    if (!session || USE_MOCK_API || page !== 'conflicts') return
    refreshDraftAllocations()
    refreshDraftValidation()
  }, [page, session?.user?.id])

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

  async function refreshScheduleWorkflow() {
    try {
      const payload = await tanseekApi.getDraftWorkflow(DRAFT_ID)
      setScheduleWorkflow(payload || null)
    } catch {
      setScheduleWorkflow(null)
    }
  }

  async function refreshDraftValidation() {
    if (USE_MOCK_API) return null
    try {
      const payload = await tanseekApi.validateDraft(DRAFT_ID)
      setDraftValidation(payload || null)
      return payload
    } catch {
      // A published/no-draft state is valid here; there is simply nothing to validate.
      setDraftValidation(null)
      return null
    }
  }

  async function handleGenerate() {
    const payload = await tanseekApi.generateDraft(DRAFT_ID)
    setDraftAllocations(payload?.allocations || [])
    setScheduleWorkflow(payload?.workflow || null)
    setResolvedIds([])
    saveResolvedConflictIds([])
    if (!USE_MOCK_API) await refreshDraftValidation()
    return payload
  }

  async function handleSubmitReview() {
    const validation = await tanseekApi.validateDraft(DRAFT_ID, { resolved_conflict_ids: resolvedIds })
    if (!USE_MOCK_API) setDraftValidation(validation || null)
    if (!validation?.valid) throw new Error(`Resolve ${validation?.hard_conflict_count || conflictCount} hard conflict(s) before Admin review.`)
    const workflow = await tanseekApi.submitDraftForReview(DRAFT_ID, { resolved_conflict_ids: resolvedIds })
    setScheduleWorkflow(workflow)
    return workflow
  }

  async function refreshPublishedTimetable() {
    setPublishedLoading(true)
    setPublishedError('')
    try {
      const payload = await tanseekApi.getPublishedTimetable()
      setPublishedVersion(payload?.version || null)
      setPublishedDetails(payload || null)
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
    setLoginNotice('')
    setSession(nextSession)
    setPage(getDefaultPage(nextSession.user))
  }

  function handleLogout() {
    clearAuthSession()
    setLoginNotice('')
    setSession(null)
    setPage('overview')
    setDraftAllocations(cloneAllocations())
    setDraftError('')
    setPublishedError('')
  }

  function handleUserUpdated(updatedUser) {
    if (!updatedUser) return
    setSession(current => {
      if (!current) return current
      const nextSession = {
        ...current,
        user: {
          ...current.user,
          ...updatedUser,
        },
      }
      saveAuthSession(nextSession)
      return nextSession
    })
  }

  async function handleAddAllocation(payload) {
    const created = await tanseekApi.createDraftAllocation(DRAFT_ID, payload)
    setDraftAllocations(current => [...current, created])
    await refreshScheduleWorkflow()
    if (!USE_MOCK_API) await refreshDraftValidation()
    return created
  }

  async function handleUpdateAllocation(allocationId, payload) {
    const updated = await tanseekApi.updateDraftAllocation(DRAFT_ID, allocationId, payload)
    setDraftAllocations(current => current.map(item => String(item.id) === String(allocationId) ? updated : item))
    await refreshScheduleWorkflow()
    if (!USE_MOCK_API) await refreshDraftValidation()
    return updated
  }

  async function handleResolve(conflictId, alternativeId) {
    const sourceConflicts = USE_MOCK_API ? conflicts : liveConflicts
    const conflict = sourceConflicts.find(item => item.id === conflictId)
    const alternative = conflict?.alternatives?.find(item => item.id === alternativeId)

    if (!conflict || !alternative) throw new Error('The selected alternative is no longer available.')

    const existing = draftAllocations.find(allocation => String(allocation.id) === String(conflict.allocationId))
    if (!existing) throw new Error('The affected allocation could not be found.')

    if (!USE_MOCK_API) {
      if (!alternative.roomId || !alternative.weekday || !alternative.start) {
        throw new Error('This recommendation is missing the room or time details needed to apply it.')
      }
      const savedAllocation = await tanseekApi.updateDraftAllocation(DRAFT_ID, existing.id, {
        roomId: alternative.roomId,
        weekday: alternative.weekday,
        start: alternative.start,
      })
      setDraftAllocations(current => current.map(allocation => String(allocation.id) === String(existing.id) ? savedAllocation : allocation))

      // Force a full server round-trip after applying a recommendation. This
      // prevents the Conflict Resolution screen from rendering stale validation
      // state after the allocation has already been persisted.
      await refreshDraftAllocations()
      await refreshScheduleWorkflow()
      const validation = await tanseekApi.validateDraft(DRAFT_ID)
      setDraftValidation(validation || null)
      return savedAllocation
    }

    const nextSlot = slotIdForAlternative(alternative)
    const updatedAllocation = {
      ...existing,
      room: alternative.room,
      day: alternative.day,
      slot: nextSlot || existing.slot,
      status: 'ok',
    }
    const savedAllocation = await tanseekApi.updateDraftAllocation(DRAFT_ID, updatedAllocation.id, updatedAllocation)
    setDraftAllocations(current => current.map(allocation => String(allocation.id) === String(existing.id) ? savedAllocation : allocation))

    setResolvedIds(current => {
      const next = current.includes(conflictId) ? current : [...current, conflictId]
      saveResolvedConflictIds(next)
      return next
    })
    await refreshScheduleWorkflow()
    return savedAllocation
  }

  async function handlePublish() {
    const validation = await tanseekApi.validateDraft(DRAFT_ID, {
      resolved_conflict_ids: resolvedIds,
    })
    if (!USE_MOCK_API) setDraftValidation(validation || null)

    if (!validation?.valid) {
      throw new Error(`Publication blocked: ${validation?.hard_conflict_count || conflictCount} hard conflict${(validation?.hard_conflict_count || conflictCount) === 1 ? '' : 's'} must be resolved first.`)
    }

    const activeTermName = scheduleWorkflow?.term_name || scheduleWorkflow?.termName || publishedVersion?.term_name || 'Current term'
    const published = await tanseekApi.publishDraft(DRAFT_ID, {
      term_id: scheduleWorkflow?.term_id || scheduleWorkflow?.termId || undefined,
      term_name: activeTermName,
      name: `${activeTermName} · Version ${(publishedVersion?.version_number || 0) + 1}`,
      published_by: session?.user?.name || 'Admin',
      resolved_conflict_ids: resolvedIds,
      allocations: draftAllocations,
    })

    setPublishedVersion(published)
    await refreshScheduleWorkflow()
    return published
  }

  if (!session) return <LoginScreen onLogin={handleLogin} sessionNotice={loginNotice} />

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
        publishedDetails={publishedDetails}
        publishedLoading={publishedLoading}
        publishedError={publishedError}
        onReloadPublished={refreshPublishedTimetable}
        onPublish={handlePublish}
        onAddAllocation={handleAddAllocation}
        onUpdateAllocation={handleUpdateAllocation}
        draftLoading={draftLoading}
        draftError={draftError}
        onReloadDraft={refreshDraftAllocations}
        workflow={scheduleWorkflow}
        onGenerate={handleGenerate}
        onSubmitReview={handleSubmitReview}
      />
    ),
    rooms: <RoomsLabs readOnly={!hasPermission(session.user, 'rooms.manage')} />,
    requirements: <CoordinatorRequirements currentUser={session.user} />,
    availability: <StaffAvailability />,
    labchecks: <LabManagerChecks />,
    conflicts: <ConflictResolution conflicts={visibleConflicts} resolvedIds={USE_MOCK_API ? resolvedIds : []} onResolve={handleResolve} readOnly={!hasPermission(session.user, 'conflicts.manage')} />,
    terms: <MasterData allowedTabs={['terms', 'slots']} initialTab="terms" currentUser={session.user} />,
    departments: <DepartmentManagement />,
    courses: <MasterData allowedTabs={['courses']} initialTab="courses" currentUser={session.user} />,
    sections: <MasterData allowedTabs={['sections']} initialTab="sections" currentUser={session.user} />,
    master: <MasterData currentUser={session.user} />,
    registrations: <EnrollmentManagement />,
    enrollments: <EnrollmentManagement />,
    instructor_assignments: <InstructorAssignments currentUser={session.user} />,
    section_assignments: <SectionAssignmentManagement currentUser={session.user} />,
    audit: <AuditLog />,
    users_all: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="all" />,
    users_super_admin: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="super_admin" />,
    users_scheduler: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="scheduler" />,
    users_admin: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="admin" />,
    users_coordinator: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="department_coordinator" />,
    users_lecturer: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="lecturer" />,
    users_ta: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="ta" />,
    users_lab_manager: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="lab_manager" />,
    users_registration_officer: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="registration_officer" />,
    users_student: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="student" />,
    roles: <SystemAdministration currentUser={session.user} initialTab="roles" roleFilter="all" />,
    system: <SystemAdministration currentUser={session.user} initialTab="accounts" roleFilter="all" />,
    profile: <ProfileSettings currentUser={session.user} onUserUpdated={handleUserUpdated} />,
  }[page]

  return (
    <Layout page={page} onPageChange={setPage} session={session} conflictCount={conflictCount} onLogout={handleLogout} termName={scheduleWorkflow?.term_name || scheduleWorkflow?.termName || publishedVersion?.term_name || ''}>
      {body}
    </Layout>
  )
}
