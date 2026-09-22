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
import { authApi, clearAuthSession, loadAuthSession, saveAuthSession } from './api/authApi'
import { tanseekApi } from './api/tanseekApi'
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
  const start = String(alternative?.time || '').split(/[–-]/)[0].trim()
  return slots.find(slot => slot.start === start)?.id || null
}

export default function App() {
  const initialSession = loadAuthSession()
  const [session, setSession] = useState(initialSession)
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

  const conflictCount = useMemo(() => conflicts.filter(c => !resolvedIds.includes(c.id)).length, [resolvedIds])

  useEffect(() => {
    if (!role) return
    const pages = getAllowedPages(session?.user)
    if (page !== 'profile' && !pages.includes(page)) setPage(getDefaultPage(session?.user))
  }, [role, page, session?.user?.permissions])

  useEffect(() => {
    if (!session) return
    if (getAllowedPages(session.user).includes('timetable')) refreshPublishedTimetable()
    if (!['lecturer', 'ta', 'student'].includes(session.user.role) && getAllowedPages(session.user).includes('timetable')) { refreshDraftAllocations(); refreshScheduleWorkflow() }
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

  async function refreshScheduleWorkflow() {
    try {
      const payload = await tanseekApi.getDraftWorkflow(DRAFT_ID)
      setScheduleWorkflow(payload || null)
    } catch {
      setScheduleWorkflow(null)
    }
  }

  async function handleGenerate() {
    const payload = await tanseekApi.generateDraft(DRAFT_ID)
    setDraftAllocations(payload?.allocations || [])
    setScheduleWorkflow(payload?.workflow || null)
    setResolvedIds([])
    saveResolvedConflictIds([])
    return payload
  }

  async function handleSubmitReview() {
    const validation = await tanseekApi.validateDraft(DRAFT_ID, { resolved_conflict_ids: resolvedIds })
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
    setSession(nextSession)
    setPage(getDefaultPage(nextSession.user))
  }

  function handleLogout() {
    clearAuthSession()
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
    return created
  }

  async function handleUpdateAllocation(allocationId, payload) {
    const updated = await tanseekApi.updateDraftAllocation(DRAFT_ID, allocationId, payload)
    setDraftAllocations(current => current.map(item => String(item.id) === String(allocationId) ? updated : item))
    await refreshScheduleWorkflow()
    return updated
  }

  async function handleResolve(conflictId, alternativeId) {
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
        const savedAllocation = await tanseekApi.updateDraftAllocation(DRAFT_ID, updatedAllocation.id, updatedAllocation)
        setDraftAllocations(current => current.map(allocation => allocation.id === conflict.allocationId ? savedAllocation : allocation))
      }
    }

    setResolvedIds(current => {
      const next = current.includes(conflictId) ? current : [...current, conflictId]
      saveResolvedConflictIds(next)
      return next
    })
    await refreshScheduleWorkflow()
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
      published_by: session?.user?.name || 'Admin',
      resolved_conflict_ids: resolvedIds,
      allocations: draftAllocations,
    })

    setPublishedVersion(published)
    await refreshScheduleWorkflow()
    return published
  }

  if (!session) return <LoginScreen onLogin={handleLogin} />

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
    conflicts: <ConflictResolution conflicts={conflicts} resolvedIds={resolvedIds} onResolve={handleResolve} readOnly={!hasPermission(session.user, 'conflicts.manage')} />,
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
    <Layout page={page} onPageChange={setPage} session={session} conflictCount={conflictCount} onLogout={handleLogout}>
      {body}
    </Layout>
  )
}
