import { planningCatalogs, initialRequirements, initialAvailability, initialLabDecisions, initialInstructorAssignments } from '../data/workflowData.js'
import { mockAccounts } from '../data/mockAccounts.js'
import { initialRoles } from '../data/mockRoles.js'
import { conflicts, rooms as initialRooms, allocations as initialAllocations, masterData as initialMasterData } from '../data/mockData.js'
import { initialStudents, initialCourseEnrollments, initialSectionEnrollments } from '../data/mockEnrollmentData.js'

let requirements = structuredClone(initialRequirements)
let labDecisions = structuredClone(initialLabDecisions)

const PUBLISHED_VERSION_KEY = 'tanseek_mock_published_version'
const LAB_DECISIONS_KEY = 'tanseek_mock_lab_decisions_v29'

const ROOMS_KEY = 'tanseek_mock_rooms'
const DRAFT_ALLOCATIONS_KEY = 'tanseek_mock_draft_allocations'
const ACCOUNTS_KEY = 'tanseek_mock_accounts_v34'
const ROLES_KEY = 'tanseek_mock_roles_v34'
const STUDENTS_KEY = 'tanseek_mock_students_v34'
const COURSE_ENROLLMENTS_KEY = 'tanseek_mock_course_enrollments_v34'
const SECTION_ENROLLMENTS_KEY = 'tanseek_mock_section_enrollments_v34'
const AVAILABILITY_KEY = 'tanseek_mock_availability_v34'
const SCHEDULE_WORKFLOW_KEY = 'tanseek_mock_schedule_workflow_v34'
const ACTIVITY_KEY = 'tanseek_mock_activity_v34'
const TERMS_KEY = 'tanseek_mock_terms_v29'
const COURSES_KEY = 'tanseek_mock_courses_v34'
const SECTIONS_KEY = 'tanseek_mock_sections_v34'
const DEPARTMENTS_KEY = 'tanseek_mock_departments_v33'
const INSTRUCTOR_ASSIGNMENTS_KEY = 'tanseek_mock_instructor_assignments_v34'

function readStoredArray(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return jsonClone(fallback)
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : jsonClone(fallback)
  } catch {
    return jsonClone(fallback)
  }
}

function writeStoredArray(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Mock persistence is best-effort only.
  }
}

labDecisions = readStoredArray(LAB_DECISIONS_KEY, initialLabDecisions)

let roomRecords = readStoredArray(ROOMS_KEY, initialRooms.map(room => ({ ...room, closure: room.id === 'r6' ? 'Wednesday 09:00–11:00 maintenance' : '' })))
let draftAllocationRecords = readStoredArray(DRAFT_ALLOCATIONS_KEY, initialAllocations)
let accountRecords = readStoredArray(ACCOUNTS_KEY, mockAccounts)
let roleRecords = readStoredArray(ROLES_KEY, initialRoles)
let studentRecords = readStoredArray(STUDENTS_KEY, initialStudents)
let courseEnrollmentRecords = readStoredArray(COURSE_ENROLLMENTS_KEY, initialCourseEnrollments)
let sectionEnrollmentRecords = readStoredArray(SECTION_ENROLLMENTS_KEY, initialSectionEnrollments)
let availabilityRecords = readStoredArray(AVAILABILITY_KEY, [
  initialAvailability,
  { id: 502, term_id: 1, instructor_id: 7, instructor_name: 'Eng. Mariam Fathy', role: 'TA', state: 'CONFIRMED', confirmed_at: '2026-09-20T09:00:00+03:00', slots: planningCatalogs.days.flatMap(day => planningCatalogs.slots.map(slot => ({ day, slot_id: slot.id, kind: 'AVAILABLE' }))) },
])
let departmentRecords = readStoredArray(DEPARTMENTS_KEY, [
  { id: 1, code: 'CS', name: 'Computer Science', active: true },
  { id: 2, code: 'DS', name: 'Data Science', active: true },
  { id: 3, code: 'AI', name: 'Artificial Intelligence', active: true },
])
let termRecords = readStoredArray(TERMS_KEY, initialMasterData.terms).map(item => String(item.status || '').toLowerCase() === 'ended' ? item : { ...item, end: null })
let courseRecords = readStoredArray(COURSES_KEY, planningCatalogs.courses.map((course, index) => ({
  ...course,
  contact_hours: course.contact_hours ?? initialMasterData.courses.find(item => item.id === course.code)?.hours ?? 3,
})))
let sectionRecords = readStoredArray(SECTIONS_KEY, planningCatalogs.sections)
let instructorAssignmentRecords = readStoredArray(INSTRUCTOR_ASSIGNMENTS_KEY, initialInstructorAssignments)

// Password-reset challenges are intentionally short-lived and kept only in memory
// in Mock API mode. Production must store hashed reset codes/tokens server-side.
const passwordResetChallenges = new Map()
const MOCK_RESET_CODE = '123456'


function syncPlanningCatalogRecords() {
  planningCatalogs.courses = courseRecords
  planningCatalogs.sections = sectionRecords.map(section => {
    const course = courseRecords.find(item => Number(item.id) === Number(section.course_id))
    const component = String(section.component || 'LECTURE').toUpperCase()
    return {
      ...section,
      component,
      name: section.name || `${course?.name || section.code} · ${component === 'PRACTICAL' ? 'Practical' : 'Lecture'}`,
    }
  })
}
syncPlanningCatalogRecords()

function seedActivityRecords() {
  const now = Date.now()
  return [
    { id: 'seed-1', category: 'planning', title: 'Draft workspace loaded', detail: 'Current draft allocations are ready for review.', at: new Date(now - 10 * 60 * 1000).toISOString() },
    { id: 'seed-2', category: 'facilities', title: 'Room inventory loaded', detail: `${roomRecords.length} rooms and labs are available in the mock inventory.`, at: new Date(now - 42 * 60 * 1000).toISOString() },
    { id: 'seed-3', category: 'requirements', title: 'Requirements checked', detail: `${requirements.filter(item => item.state === 'READY').length} requirements are ready for scheduling.`, at: new Date(now - 70 * 60 * 1000).toISOString() },
  ]
}

let activityRecords = readStoredArray(ACTIVITY_KEY, seedActivityRecords())

function readScheduleWorkflow() {
  try {
    if (typeof localStorage === 'undefined') return { draft_id: 'draft-v3', status: 'DRAFT', updated_at: null }
    const raw = localStorage.getItem(SCHEDULE_WORKFLOW_KEY)
    return raw ? JSON.parse(raw) : { draft_id: 'draft-v3', status: 'DRAFT', updated_at: null }
  } catch {
    return { draft_id: 'draft-v3', status: 'DRAFT', updated_at: null }
  }
}

function writeScheduleWorkflow(value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SCHEDULE_WORKFLOW_KEY, JSON.stringify(value))
  } catch {
    // best effort only
  }
}

function mockUserFromOptions(options = {}) {
  const auth = options?.headers?.Authorization || options?.headers?.authorization || ''
  const token = String(auth).replace(/^Bearer\s+/i, '')
  const match = token.match(/^mock-token-(\d+)-(.+)$/)
  if (!match) return null
  return publicAccount(accountRecords.find(item => String(item.id) === match[1]))
}

function requireAuthenticated(options) {
  const user = mockUserFromOptions(options)
  if (!user) throw new Error('Authentication required.')
  return user
}

function requireRoles(options, allowedRoles, message = 'You do not have permission to perform this action.') {
  const user = requireAuthenticated(options)
  if (user.role !== 'super_admin' && !allowedRoles.includes(user.role)) throw new Error(message)
  return user
}

function departmentIdForCourse(course) {
  if (!course) return null
  if (course.department_id != null) return Number(course.department_id)
  const department = departmentRecords.find(item => String(item.name).toLowerCase() === String(course.department || '').toLowerCase())
  return department ? Number(department.id) : null
}

function departmentIdForSection(section) {
  const course = courseRecords.find(item => Number(item.id) === Number(section?.course_id))
  return departmentIdForCourse(course)
}

function enforceDepartmentScope(user, departmentId, label = 'record') {
  if (!user || user.role === 'super_admin') return
  if (user.department_id == null || Number(user.department_id) !== Number(departmentId)) {
    throw new Error(`Department scope violation: you cannot manage this ${label}.`)
  }
}

function recordActivity(options, title, detail, category = 'planning') {
  const actor = mockUserFromOptions(options)
  const entry = {
    id: `activity-${Date.now()}-${activityRecords.length + 1}`,
    category,
    title,
    detail,
    actor: actor?.name || 'Tanseek',
    at: new Date().toISOString(),
  }
  activityRecords = [entry, ...activityRecords].slice(0, 30)
  writeStoredArray(ACTIVITY_KEY, activityRecords)
  return entry
}

function pct(part, total) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

function relevantActivitiesForRole(role) {
  const categoriesByRole = {
    super_admin: ['system'],
    scheduler: ['planning', 'requirements', 'facilities', 'availability', 'review'],
    admin: ['planning', 'review', 'publication'],
    department_coordinator: ['requirements', 'registration', 'planning'],
    lecturer: ['availability', 'publication'],
    ta: ['availability', 'publication'],
    lab_manager: ['facilities', 'requirements', 'planning'],
    registration_officer: ['registration', 'system'],
    student: ['publication'],
  }
  const allowed = categoriesByRole[role] || []
  const filtered = activityRecords.filter(item => allowed.includes(item.category))
  return (filtered.length ? filtered : activityRecords).slice(0, 6)
}

function buildOverview(user) {
  const role = user?.role || 'scheduler'
  const latestPublished = readPublishedVersion()
  const totalRoomSlots = roomRecords.length * planningCatalogs.days.length * planningCatalogs.slots.length
  const usedRoomSlots = new Set(draftAllocationRecords.map(item => `${item.room}|${item.day}|${item.slot}`)).size
  const roomUtilization = pct(usedRoomSlots, totalRoomSlots)
  const teachingAccounts = accountRecords.filter(item => item.role === 'lecturer' || item.role === 'ta')
  const confirmedAvailability = teachingAccounts.filter(account => availabilityRecords.some(item => Number(item.instructor_id) === Number(account.id) && item.state === 'CONFIRMED')).length
  const totalAvailability = Math.max(teachingAccounts.length, 1)
  const readyRequirements = requirements.filter(item => item.state === 'READY').length
  const requirementSessions = requirements.reduce((sum, item) => sum + Math.max(1, Number(item.weekly_count || 1)), 0)
  const allocatedRequirements = requirements.filter(req => {
    const course = planningCatalogs.courses.find(item => Number(item.id) === Number(req.course_id))
    return course && draftAllocationRecords.some(allocation => String(allocation.code || '').startsWith(course.code))
  }).length
  const allocationProgress = pct(allocatedRequirements, requirements.length)

  if (role === 'super_admin') {
    const customRoles = roleRecords.filter(item => !item.built_in).length
    return {
      kind: 'system',
      eyebrow: 'System summary',
      description: 'Live account, role and platform inventory for the current mock workspace.',
      metrics: [
        { label: 'Staff accounts', value: String(accountRecords.length), helper: 'active mock accounts', icon: 'people', tone: 'teal' },
        { label: 'Roles', value: String(roleRecords.length), helper: `${customRoles} custom`, icon: 'shield' },
        { label: 'Departments', value: String(departmentRecords.filter(item => item.active !== false).length), helper: 'active academic departments', icon: 'room' },
        { label: 'Rooms & labs', value: String(roomRecords.length), helper: 'inventory records', icon: 'database' },
      ],
      summary: [
        ['Built-in roles', roleRecords.filter(item => item.built_in).length],
        ['Custom roles', customRoles],
        ['Published versions', latestPublished ? latestPublished.version_number : 0],
        ['Current term', planningCatalogs.term.name],
      ],
      recent_activity: relevantActivitiesForRole(role),
    }
  }

  if (role === 'lab_manager') {
    const labs = roomRecords.filter(room => String(room.type || '').includes('Lab'))
    const availableLabs = labs.filter(room => room.status === 'available' && !room.closure).length
    const labRequirements = requirements.filter(item => item.session_type === 'Lab')
    const checkedIds = new Set(labDecisions.map(item => Number(item.requirement_id)))
    const pendingChecks = labRequirements.filter(item => !checkedIds.has(Number(item.id))).length
    const closures = labs.filter(room => Boolean(room.closure) || room.status !== 'available').length
    return {
      kind: 'facilities',
      eyebrow: 'Facilities summary',
      description: 'Live lab inventory and requirement-check status.',
      metrics: [
        { label: 'Labs', value: String(labs.length), helper: 'lab inventory records', icon: 'equipment', tone: 'teal' },
        { label: 'Available labs', value: String(availableLabs), helper: 'available without closures', icon: 'check', tone: 'teal' },
        { label: 'Pending lab checks', value: String(pendingChecks), helper: 'requirements need review', icon: 'alert', tone: pendingChecks ? 'alert' : 'teal' },
        { label: 'Closures / issues', value: String(closures), helper: 'spaces need attention', icon: 'room' },
      ],
      summary: [
        ['Lab requirements', labRequirements.length],
        ['Checks completed', labRequirements.length - pendingChecks],
        ['Available labs', availableLabs],
        ['Current term', planningCatalogs.term.name],
      ],
      recent_activity: relevantActivitiesForRole(role),
    }
  }

  if (role === 'registration_officer') {
    const activeEnrollments = courseEnrollmentRecords.filter(item => item.status === 'ACTIVE').length
    const carried = courseEnrollmentRecords.filter(item => item.status === 'ACTIVE' && item.registration_type === 'CARRIED').length
    return {
      kind: 'registration_officer',
      eyebrow: 'Academic affairs',
      description: 'Live student enrollment mappings used to build personalized published timetables.',
      metrics: [
        { label: 'Students', value: String(studentRecords.length), helper: 'student records', icon: 'people', tone: 'teal' },
        { label: 'Active enrollments', value: String(activeEnrollments), helper: 'current term mappings', icon: 'database' },
        { label: 'Carried courses', value: String(carried), helper: 'cross-level registrations', icon: 'calendar' },
        { label: 'Published version', value: latestPublished ? `v${latestPublished.version_number}` : '—', helper: 'latest official timetable', icon: 'check' },
      ],
      summary: [
        ['Students', studentRecords.length],
        ['Active enrollments', activeEnrollments],
        ['Carried courses', carried],
        ['Current term', planningCatalogs.term.name],
      ],
      recent_activity: relevantActivitiesForRole(role),
    }
  }

  if (role === 'lecturer' || role === 'ta') {
    const selfAvailability = availabilityRecords.find(item => Number(item.instructor_id) === Number(user?.id)) || { state: 'DRAFT', slots: [], confirmed_at: null }
    const publishedSessions = (latestPublished?.allocations || []).filter(item => item.staff === user?.name).length
    const preferredSlots = (selfAvailability.slots || []).filter(item => item.kind === 'PREFERRED').length
    const availableSlots = (selfAvailability.slots || []).filter(item => item.kind === 'AVAILABLE' || item.kind === 'PREFERRED').length
    return {
      kind: role,
      eyebrow: role === 'ta' ? 'TA teaching summary' : 'Teaching summary',
      description: 'Your availability status and latest published teaching assignments.',
      metrics: [
        { label: 'Availability status', value: selfAvailability.state === 'CONFIRMED' ? 'Confirmed' : 'Draft', helper: selfAvailability.confirmed_at ? 'submitted for scheduling' : 'not confirmed yet', icon: 'check', tone: selfAvailability.state === 'CONFIRMED' ? 'teal' : undefined },
        { label: 'Published sessions', value: String(publishedSessions), helper: 'assigned to your account', icon: 'calendar' },
        { label: 'Preferred slots', value: String(preferredSlots), helper: 'soft-preference windows', icon: 'clock', tone: 'teal' },
        { label: 'Available slots', value: String(availableSlots), helper: 'available or preferred', icon: 'grid' },
      ],
      summary: [
        ['Availability status', selfAvailability.state === 'CONFIRMED' ? 'Confirmed' : 'Draft'],
        ['Published version', latestPublished ? `Version ${latestPublished.version_number}` : 'Not published'],
        ['Published sessions', publishedSessions],
        ['Current term', planningCatalogs.term.name],
      ],
      recent_activity: relevantActivitiesForRole(role),
    }
  }

  if (role === 'department_coordinator' || role === 'admin') {
    const department = user?.department_name || ''
    const courseIds = new Set(planningCatalogs.courses.filter(item => item.department === department).map(item => Number(item.id)))
    const departmentRequirements = requirements.filter(item => courseIds.has(Number(item.course_id)))
    const ready = departmentRequirements.filter(item => item.state === 'READY').length
    const departmentCourseCodes = new Set(planningCatalogs.courses.filter(item => item.department === department).map(item => item.code))
    const departmentAllocations = draftAllocationRecords.filter(item => [...departmentCourseCodes].some(code => String(item.code || '').startsWith(code)))
    return {
      kind: 'department',
      eyebrow: 'Department summary',
      description: 'Live scheduling readiness for your department.',
      metrics: [
        { label: 'Department requirements', value: String(departmentRequirements.length), helper: 'submitted requirements', icon: 'database', tone: 'teal' },
        { label: 'Ready requirements', value: String(ready), helper: `${departmentRequirements.length - ready} incomplete`, icon: 'check', tone: ready === departmentRequirements.length ? 'teal' : undefined },
        { label: 'Draft sessions', value: String(departmentAllocations.length), helper: 'current draft allocations', icon: 'calendar' },
        { label: 'Hard conflicts', value: String(conflicts.length), helper: 'workspace conflicts before local resolutions', icon: 'alert', tone: 'alert' },
      ],
      readiness: {
        title: 'Department readiness',
        subtitle: `${department || 'Department'} · ${planningCatalogs.term.name}`,
        items: [
          ['Requirements ready', pct(ready, departmentRequirements.length)],
          ['Sessions allocated', pct(departmentAllocations.length, Math.max(departmentRequirements.length, 1))],
          ['Master data complete', planningCatalogs.courses.length && planningCatalogs.sections.length ? 100 : 0],
        ],
      },
      recent_activity: relevantActivitiesForRole(role),
    }
  }

  return {
    kind: 'planning',
    eyebrow: 'Planning summary',
    description: 'A live view of schedule readiness, room utilization and items that need action before publication.',
    metrics: [
      { label: 'Allocated sessions', value: String(draftAllocationRecords.length), helper: `${requirementSessions} requirement sessions defined`, icon: 'calendar', tone: 'teal' },
      { label: 'Hard conflicts', value: String(conflicts.length), helper: 'must be resolved before review/publish', icon: 'alert', tone: 'alert' },
      { label: 'Room utilization', value: `${roomUtilization}%`, helper: 'draft room-slot utilization', icon: 'room' },
      { label: 'Staff availability', value: `${confirmedAvailability}/${totalAvailability}`, helper: 'teaching profiles confirmed', icon: 'people' },
    ],
    readiness: {
      title: 'Schedule readiness',
      subtitle: `Draft v3 · ${planningCatalogs.term.name}`,
      items: [
        ['Master data complete', planningCatalogs.courses.length && planningCatalogs.sections.length && roomRecords.length ? 100 : 0],
        ['Sessions allocated', allocationProgress],
        ['Staff availability', pct(confirmedAvailability, totalAvailability)],
      ],
      total_conflicts: conflicts.length,
    },
    recent_activity: relevantActivitiesForRole(role),
  }
}

function nextNumericId(items) {
  const nums = items.map(item => Number(item.id)).filter(Number.isFinite)
  return (nums.length ? Math.max(...nums) : 0) + 1
}

function nextRoomId() {
  let n = 1
  const ids = new Set(roomRecords.map(item => String(item.id)))
  while (ids.has(`r${n}`)) n += 1
  return `r${n}`
}

function publicAccount(account) {
  if (!account) return null
  const { password, ...safe } = account
  const role = roleRecords.find(item => item.id === account.role)
  return {
    ...safe,
    role_label: role?.name || safe.role_label || account.role,
    permissions: role?.permissions || safe.permissions || [],
  }
}

function nextAccountId() {
  return nextNumericId(accountRecords)
}

function slugRoleId(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'custom_role'
  let candidate = base
  let n = 2
  const ids = new Set(roleRecords.map(item => item.id))
  while (ids.has(candidate)) candidate = `${base}_${n++}`
  return candidate
}

function nextCourseId() {
  return nextNumericId(courseRecords)
}

function nextSectionId() {
  return nextNumericId(sectionRecords)
}

function validateMasterRecord(type, body) {
  if (type === 'terms') {
    if (!String(body?.name || '').trim() || !body?.start) throw new Error('Term name and start date are required.')
    if (body?.availability_deadline && String(body.availability_deadline) >= String(body.start)) throw new Error('Availability deadline must be before the term start date.')
  }
  if (type === 'courses') {
    if (!String(body?.code || '').trim() || !String(body?.name || '').trim() || !String(body?.department || '').trim()) throw new Error('Course code, name and department are required.')
  }
  if (type === 'sections') {
    if (!String(body?.code || '').trim() || !Number(body?.course_id) || !['LECTURE', 'PRACTICAL'].includes(String(body?.component || '').toUpperCase()) || Number(body?.size) < 1) throw new Error('Section code, course, component and size are required.')
  }
}

function allocationCollision(payload, ignoreId = null) {
  return draftAllocationRecords.find(item => String(item.id) !== String(ignoreId) && item.day === payload.day && item.slot === payload.slot && (
    (item.room && payload.room && item.room === payload.room) ||
    (item.staff && payload.staff && item.staff === payload.staff) ||
    (item.section && payload.section && item.section === payload.section)
  )) || null
}

function readPublishedVersion() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(PUBLISHED_VERSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writePublishedVersion(version) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PUBLISHED_VERSION_KEY, JSON.stringify(version))
  } catch {
    // Mock persistence is best-effort only.
  }
}

const wait = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function requirementCompleteness(input) {
  const hasCore = input.course_id && input.session_type && Number(input.duration_minutes) > 0 && Number(input.weekly_count) > 0 && Number(input.expected_students) > 0
  const needs = String(input.session_type || '').toLowerCase() === 'practical' ? input.required_room_type && Array.isArray(input.required_equipment) && input.required_equipment.length > 0 : true
  return hasCore && needs ? 'READY' : 'INCOMPLETE'
}

function equipmentCodesForRoom(room) {
  const text = (room.equipment || []).join(' ').toLowerCase()
  const codes = []
  if (/pc|computer/.test(text)) codes.push('pcs')
  if (/projector/.test(text)) codes.push('projector')
  if (/gpu/.test(text)) codes.push('gpu')
  if (/tablet/.test(text)) codes.push('tablets')
  if (/whiteboard/.test(text)) codes.push('whiteboard')
  return codes
}

function buildCandidateLabs(requirement) {
  const groupSize = Number(requirement.expected_students || 0)
  const requiredEquipment = requirement.required_equipment || []

  return roomRecords.filter(room => String(room.type || '').includes('Lab')).map(room => {
    const equipmentCodes = equipmentCodesForRoom(room)
    const capacity_ok = room.capacity >= groupSize
    const type_ok = !requirement.required_room_type || room.type === requirement.required_room_type
    const missing_equipment = requiredEquipment.filter(code => !equipmentCodes.includes(code))
    const equipment_ok = missing_equipment.length === 0
    const availability_ok = room.status === 'available'
    const closure_ok = !room.closure
    const suitable = capacity_ok && type_ok && equipment_ok && availability_ok && closure_ok
    return {
      room_id: room.id,
      room_name: room.name,
      building: room.building,
      capacity: room.capacity,
      group_size: groupSize,
      room_type: room.type,
      capacity_ok,
      type_ok,
      equipment_ok,
      availability_ok,
      closure_ok,
      missing_equipment,
      closure: room.closure || null,
      suitable,
    }
  }).sort((a, b) => Number(b.suitable) - Number(a.suitable) || b.capacity_ok - a.capacity_ok)
}

export async function handleMockRequest(path, options = {}) {
  await wait()
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : null

  if (path === '/overview' && method === 'GET') {
    return jsonClone(buildOverview(mockUserFromOptions(options)))
  }

  if (path === '/audit-log' && method === 'GET') {
    const user = mockUserFromOptions(options)
    if (user?.role !== 'super_admin') throw new Error('Only Super Admin can view the audit log.')
    return jsonClone({ records: activityRecords })
  }

  if (path === '/auth/login' && method === 'POST') {
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const account = accountRecords.find(item => item.email.toLowerCase() === email && item.password === password)

    if (!account) throw new Error('Invalid email or password. Use one of the demo accounts shown below.')

    const user = publicAccount(account)
    return jsonClone({
      access_token: `mock-token-${account.id}-${account.role}`,
      user,
    })
  }

  if (path === '/auth/forgot-password' && method === 'POST') {
    const email = String(body?.email || '').trim().toLowerCase()
    if (!email) throw new Error('Email is required.')

    const challengeId = `mock-reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    passwordResetChallenges.set(challengeId, {
      email,
      code: MOCK_RESET_CODE,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    })

    // Keep the message generic so the UI behaves like production and does not
    // reveal whether an account exists. dev_code exists only for local demo mode.
    return jsonClone({
      message: 'If an account exists for this email, a reset code has been sent.',
      challenge_id: challengeId,
      expires_in_seconds: 600,
      dev_code: MOCK_RESET_CODE,
    })
  }

  if (path === '/auth/reset-password' && method === 'POST') {
    const email = String(body?.email || '').trim().toLowerCase()
    const challengeId = String(body?.challenge_id || '')
    const code = String(body?.code || '').trim()
    const newPassword = String(body?.new_password || '')
    const challenge = passwordResetChallenges.get(challengeId)

    if (!challenge || challenge.email !== email || Date.now() > challenge.expiresAt) {
      passwordResetChallenges.delete(challengeId)
      throw new Error('Reset code is invalid or has expired.')
    }

    challenge.attempts += 1
    if (challenge.attempts > 5) {
      passwordResetChallenges.delete(challengeId)
      throw new Error('Too many attempts. Request a new reset code.')
    }

    if (challenge.code !== code) throw new Error('Reset code is incorrect.')
    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.')

    const account = accountRecords.find(item => item.email.toLowerCase() === email)
    if (!account) {
      passwordResetChallenges.delete(challengeId)
      throw new Error('Reset code is invalid or has expired.')
    }
    if (account.password === newPassword) throw new Error('New password must be different from the current password.')

    accountRecords = accountRecords.map(item => item.id === account.id ? { ...item, password: newPassword } : item)
    writeStoredArray(ACCOUNTS_KEY, accountRecords)
    passwordResetChallenges.delete(challengeId)
    return jsonClone({ success: true, message: 'Password reset successfully.' })
  }

  if (path === '/auth/me' && method === 'GET') {
    const user = mockUserFromOptions(options)
    if (!user) throw new Error('Authentication required.')
    return jsonClone({ user })
  }

  if (path === '/auth/me' && method === 'PATCH') {
    const user = mockUserFromOptions(options)
    if (!user) throw new Error('Authentication required.')
    const existing = accountRecords.find(item => String(item.id) === String(user.id))
    if (!existing) throw new Error('Account not found.')

    const name = String(body?.name ?? existing.name).trim()
    if (!name) throw new Error('Full name is required.')

    const previousName = existing.name
    const next = { ...existing, name }
    accountRecords = accountRecords.map(item => String(item.id) === String(existing.id) ? next : item)
    writeStoredArray(ACCOUNTS_KEY, accountRecords)

    if (next.role === 'student') {
      studentRecords = studentRecords.map(item => (
        Number(item.account_id) === Number(next.id) || item.email?.toLowerCase() === next.email?.toLowerCase()
          ? { ...item, name }
          : item
      ))
      writeStoredArray(STUDENTS_KEY, studentRecords)
    }

    // Keep current draft display names coherent in mock mode.
    if (previousName !== name) {
      draftAllocationRecords = draftAllocationRecords.map(item => item.staff === previousName ? { ...item, staff: name } : item)
      writeStoredArray(DRAFT_ALLOCATIONS_KEY, draftAllocationRecords)
    }

    recordActivity(options, 'Profile updated', `${name} updated their profile name.`, 'system')
    return jsonClone({ user: publicAccount(next) })
  }

  if (path === '/auth/change-password' && method === 'POST') {
    const user = mockUserFromOptions(options)
    if (!user) throw new Error('Authentication required.')
    const existing = accountRecords.find(item => String(item.id) === String(user.id))
    if (!existing) throw new Error('Account not found.')

    const currentPassword = String(body?.current_password || '')
    const newPassword = String(body?.new_password || '')
    if (existing.password !== currentPassword) throw new Error('Current password is incorrect.')
    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.')
    if (newPassword === currentPassword) throw new Error('New password must be different from the current password.')

    accountRecords = accountRecords.map(item => String(item.id) === String(existing.id) ? { ...item, password: newPassword } : item)
    writeStoredArray(ACCOUNTS_KEY, accountRecords)
    recordActivity(options, 'Password changed', `${existing.name} changed their password.`, 'system')
    return jsonClone({ success: true })
  }

  if (path === '/admin/accounts' && method === 'GET') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage accounts.')
    return jsonClone({ accounts: accountRecords.map(publicAccount) })
  }
  if (path === '/admin/accounts' && method === 'POST') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage accounts.')
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '').trim()
    const role = String(body?.role || '').trim()
    if (!name || !email || !password || !role) throw new Error('Name, email, password and role are required.')
    if (accountRecords.some(item => item.email.toLowerCase() === email)) throw new Error('An account with this email already exists.')
    if (!roleRecords.some(item => item.id === role)) throw new Error('Selected role does not exist.')
    const record = {
      id: nextAccountId(),
      name,
      email,
      password,
      role,
      role_label: roleRecords.find(item => item.id === role)?.name || role,
      department_id: body?.department_id || null,
      department_name: String(body?.department_name || '').trim() || 'University-wide access',
    }
    accountRecords = [...accountRecords, record]
    writeStoredArray(ACCOUNTS_KEY, accountRecords)
    if (role === 'student' && !studentRecords.some(item => item.email?.toLowerCase() === email)) {
      const student = {
        id: nextNumericId(studentRecords),
        university_id: String(body?.university_id || `STU${Date.now().toString().slice(-6)}`),
        name,
        email,
        department_id: body?.department_id || null,
        department_name: String(body?.department_name || '').trim() || 'University-wide access',
        current_level: Number(body?.current_level || 1),
        status: 'ACTIVE',
        account_id: record.id,
      }
      studentRecords = [...studentRecords, student]
      writeStoredArray(STUDENTS_KEY, studentRecords)
      record.student_id = student.id
      record.university_id = student.university_id
      record.current_level = student.current_level
      accountRecords = accountRecords.map(item => item.id === record.id ? record : item)
      writeStoredArray(ACCOUNTS_KEY, accountRecords)
    }
    recordActivity(options, 'Account created', `${record.name} was added as ${record.role_label}.`, 'system')
    return jsonClone(publicAccount(record))
  }
  const accountMatch = path.match(/^\/admin\/accounts\/([^/]+)$/)
  if (accountMatch && method === 'PUT') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage accounts.')
    const id = accountMatch[1]
    const existing = accountRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Account not found.')
    const email = String(body?.email ?? existing.email).trim().toLowerCase()
    if (accountRecords.some(item => String(item.id) !== String(id) && item.email.toLowerCase() === email)) throw new Error('An account with this email already exists.')
    const role = String(body?.role ?? existing.role)
    if (!roleRecords.some(item => item.id === role)) throw new Error('Selected role does not exist.')
    if (existing.role === 'super_admin' && role !== 'super_admin' && accountRecords.filter(item => item.role === 'super_admin').length <= 1) {
      throw new Error('At least one Super Admin account must remain.')
    }
    const next = {
      ...existing,
      ...body,
      id: existing.id,
      email,
      role,
      password: String(body?.password || '').trim() || existing.password,
      role_label: roleRecords.find(item => item.id === role)?.name || role,
      department_id: body?.department_id ?? existing.department_id ?? null,
      department_name: String(body?.department_name ?? existing.department_name ?? '').trim() || 'University-wide access',
    }
    accountRecords = accountRecords.map(item => String(item.id) === String(id) ? next : item)
    writeStoredArray(ACCOUNTS_KEY, accountRecords)
    if (role === 'student') {
      let student = studentRecords.find(item => Number(item.account_id) === Number(next.id)) || studentRecords.find(item => item.email?.toLowerCase() === next.email?.toLowerCase())
      if (student) {
        student = {
          ...student,
          name: next.name,
          email: next.email,
          department_id: next.department_id,
          department_name: next.department_name,
          university_id: String(body?.university_id || student.university_id),
          current_level: Number(body?.current_level || student.current_level || 1),
          account_id: next.id,
        }
        studentRecords = studentRecords.map(item => Number(item.id) === Number(student.id) ? student : item)
      } else {
        student = {
          id: nextNumericId(studentRecords),
          university_id: String(body?.university_id || `STU${Date.now().toString().slice(-6)}`),
          name: next.name,
          email: next.email,
          department_id: next.department_id,
          department_name: next.department_name,
          current_level: Number(body?.current_level || 1),
          status: 'ACTIVE',
          account_id: next.id,
        }
        studentRecords = [...studentRecords, student]
      }
      writeStoredArray(STUDENTS_KEY, studentRecords)
      next.student_id = student.id
      next.university_id = student.university_id
      next.current_level = student.current_level
      accountRecords = accountRecords.map(item => String(item.id) === String(id) ? next : item)
      writeStoredArray(ACCOUNTS_KEY, accountRecords)
    }
    recordActivity(options, 'Account updated', `${next.name}'s account settings were updated.`, 'system')
    return jsonClone(publicAccount(next))
  }
  if (accountMatch && method === 'DELETE') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage accounts.')
    const id = accountMatch[1]
    const existing = accountRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Account not found.')
    if (existing.role === 'super_admin' && accountRecords.filter(item => item.role === 'super_admin').length <= 1) {
      throw new Error('At least one Super Admin account must remain.')
    }
    accountRecords = accountRecords.filter(item => String(item.id) !== String(id))
    writeStoredArray(ACCOUNTS_KEY, accountRecords)
    recordActivity(options, 'Account deleted', `${existing.name} was removed from staff access.`, 'system')
    return jsonClone({ deleted: true, id })
  }

  if (path === '/admin/roles' && method === 'GET') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage roles.')
    return jsonClone({ roles: roleRecords })
  }
  if (path === '/admin/roles' && method === 'POST') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage roles.')
    const name = String(body?.name || '').trim()
    const permissions = Array.isArray(body?.permissions) ? [...new Set(body.permissions)] : []
    if (!name) throw new Error('Role name is required.')
    const record = {
      id: slugRoleId(name),
      name,
      description: String(body?.description || '').trim(),
      built_in: false,
      permissions,
    }
    roleRecords = [...roleRecords, record]
    writeStoredArray(ROLES_KEY, roleRecords)
    recordActivity(options, 'Role created', `${record.name} was added with ${record.permissions.length} permissions.`, 'system')
    return jsonClone(record)
  }
  const roleMatch = path.match(/^\/admin\/roles\/([^/]+)$/)
  if (roleMatch && method === 'PUT') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage roles.')
    const id = roleMatch[1]
    const existing = roleRecords.find(item => item.id === id)
    if (!existing) throw new Error('Role not found.')
    if (existing.built_in) throw new Error('Built-in roles are locked in Mock API mode.')
    const next = {
      ...existing,
      name: String(body?.name ?? existing.name).trim() || existing.name,
      description: String(body?.description ?? existing.description).trim(),
      permissions: Array.isArray(body?.permissions) ? [...new Set(body.permissions)] : existing.permissions,
    }
    roleRecords = roleRecords.map(item => item.id === id ? next : item)
    accountRecords = accountRecords.map(item => item.role === id ? { ...item, role_label: next.name } : item)
    writeStoredArray(ROLES_KEY, roleRecords)
    writeStoredArray(ACCOUNTS_KEY, accountRecords)
    recordActivity(options, 'Role updated', `${next.name} permissions were updated.`, 'system')
    return jsonClone(next)
  }
  if (roleMatch && method === 'DELETE') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage roles.')
    const id = roleMatch[1]
    const existing = roleRecords.find(item => item.id === id)
    if (!existing) throw new Error('Role not found.')
    if (existing.built_in) throw new Error('Built-in roles cannot be deleted.')
    if (accountRecords.some(item => item.role === id)) throw new Error('Reassign accounts using this role before deleting it.')
    roleRecords = roleRecords.filter(item => item.id !== id)
    writeStoredArray(ROLES_KEY, roleRecords)
    recordActivity(options, 'Role deleted', `${existing.name} was removed.`, 'system')
    return jsonClone({ deleted: true, id })
  }


  if (path === '/departments' && method === 'GET') {
    return jsonClone({ departments: departmentRecords })
  }
  if (path === '/departments' && method === 'POST') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage departments.')
    const code = String(body?.code || '').trim().toUpperCase()
    const name = String(body?.name || '').trim()
    if (!code || !name) throw new Error('Department code and name are required.')
    if (departmentRecords.some(item => String(item.code).toLowerCase() === code.toLowerCase())) throw new Error('A department with this code already exists.')
    const record = { id: nextNumericId(departmentRecords), code, name, active: body?.active !== false }
    departmentRecords = [...departmentRecords, record]
    writeStoredArray(DEPARTMENTS_KEY, departmentRecords)
    recordActivity(options, 'Department created', `${name} was added to academic setup.`, 'system')
    return jsonClone(record)
  }
  const departmentMatch = path.match(/^\/departments\/([^/]+)$/)
  if (departmentMatch && method === 'PATCH') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage departments.')
    const id = departmentMatch[1]
    const existing = departmentRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Department not found.')
    const code = String(body?.code ?? existing.code).trim().toUpperCase()
    const name = String(body?.name ?? existing.name).trim()
    if (!code || !name) throw new Error('Department code and name are required.')
    if (departmentRecords.some(item => String(item.id) !== String(id) && String(item.code).toLowerCase() === code.toLowerCase())) throw new Error('A department with this code already exists.')
    const record = { ...existing, ...body, id: existing.id, code, name, active: body?.active !== false }
    departmentRecords = departmentRecords.map(item => String(item.id) === String(id) ? record : item)
    writeStoredArray(DEPARTMENTS_KEY, departmentRecords)
    recordActivity(options, 'Department updated', `${name} academic setup was updated.`, 'system')
    return jsonClone(record)
  }
  if (departmentMatch && method === 'DELETE') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can manage departments.')
    const id = departmentMatch[1]
    const existing = departmentRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Department not found.')
    const inUse = accountRecords.some(item => String(item.department_id) === String(id)) || courseRecords.some(item => String(item.department || '') === String(existing.name))
    if (inUse) throw new Error('This department is still used by accounts or courses. Mark it inactive instead of deleting it.')
    departmentRecords = departmentRecords.filter(item => String(item.id) !== String(id))
    writeStoredArray(DEPARTMENTS_KEY, departmentRecords)
    recordActivity(options, 'Department deleted', `${existing.name} was removed from academic setup.`, 'system')
    return jsonClone({ deleted: true, id })
  }

  const masterCollectionMatch = path.match(/^\/master-data\/(terms|courses|sections|slots)$/)
  if (masterCollectionMatch) {
    const type = masterCollectionMatch[1]
    if (method === 'GET') {
      if (type === 'terms') return jsonClone({ records: termRecords })
      if (type === 'courses') return jsonClone({ records: courseRecords })
      if (type === 'sections') return jsonClone({ records: sectionRecords })
      if (type === 'slots') return jsonClone({ records: planningCatalogs.slots })
    }
    if (method === 'POST') {
      if (type === 'slots') throw new Error('Time slots are fixed by the current scheduling policy.')
      const actor = type === 'terms'
        ? requireRoles(options, ['super_admin'], 'Only Super Admin can manage Academic Terms.')
        : requireRoles(options, ['department_coordinator'], 'Only the Department Coordinator can manage Courses and Sections.')
      validateMasterRecord(type, body)
      let record
      if (type === 'terms') {
        record = { ...body, end: null, id: `t${nextNumericId(termRecords.map((item, i) => ({ id: Number(String(item.id).replace(/\D/g, '')) || i + 1 })))}` }
        if (String(record.status).toLowerCase() === 'active') termRecords = termRecords.map(item => ({ ...item, status: 'Draft' }))
        termRecords = [...termRecords, record]
        writeStoredArray(TERMS_KEY, termRecords)
      }
      if (type === 'courses') {
        const department = departmentRecords.find(item => String(item.name).toLowerCase() === String(body.department || '').trim().toLowerCase())
        if (!department) throw new Error('Selected department does not exist.')
        enforceDepartmentScope(actor, department.id, 'course')
        if (courseRecords.some(item => String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A course with this code already exists.')
        record = { id: nextCourseId(), code: String(body.code).trim().toUpperCase(), name: String(body.name).trim(), department: department.name, department_id: department.id, contact_hours: Number(body.contact_hours || 3) }
        courseRecords = [...courseRecords, record]
        writeStoredArray(COURSES_KEY, courseRecords)
        syncPlanningCatalogRecords()
      }
      if (type === 'sections') {
        if (!courseRecords.some(item => Number(item.id) === Number(body.course_id))) throw new Error('Selected course does not exist.')
        const course = courseRecords.find(item => Number(item.id) === Number(body.course_id))
        enforceDepartmentScope(actor, departmentIdForCourse(course), 'section')
        if (sectionRecords.some(item => String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A section with this code already exists.')
        const component = String(body.component || 'LECTURE').toUpperCase()
        record = { id: nextSectionId(), code: String(body.code).trim().toUpperCase(), course_id: Number(body.course_id), component, size: Number(body.size), name: `${course?.name || body.code} · ${component === 'PRACTICAL' ? 'Practical' : 'Lecture'}` }
        sectionRecords = [...sectionRecords, record]
        writeStoredArray(SECTIONS_KEY, sectionRecords)
        syncPlanningCatalogRecords()
      }
      recordActivity(options, 'Master data updated', `${type.slice(0, -1)} record was created.`, 'planning')
      return jsonClone(record)
    }
  }

  const endTermMatch = path.match(/^\/master-data\/terms\/([^/]+)\/end$/)
  if (endTermMatch && method === 'POST') {
    requireRoles(options, ['super_admin'], 'Only Super Admin can end an Academic Term.')
    const id = endTermMatch[1]
    const existing = termRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Term not found.')
    if (String(existing.status || '').toLowerCase() !== 'active') throw new Error('Only the active term can be ended.')
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    if (String(existing.start) > today) throw new Error('A term cannot end before its start date.')
    const record = { ...existing, end: today, status: 'Ended' }
    termRecords = termRecords.map(item => String(item.id) === String(id) ? record : item)
    writeStoredArray(TERMS_KEY, termRecords)
    recordActivity(options, 'Academic term ended', `${existing.name} ended on ${today}.`, 'system')
    return jsonClone(record)
  }

  const masterRecordMatch = path.match(/^\/master-data\/(terms|courses|sections)\/([^/]+)$/)
  if (masterRecordMatch && method === 'PUT') {
    const type = masterRecordMatch[1]
    const id = masterRecordMatch[2]
    const actor = type === 'terms'
      ? requireRoles(options, ['super_admin'], 'Only Super Admin can manage Academic Terms.')
      : requireRoles(options, ['department_coordinator'], 'Only the Department Coordinator can manage Courses and Sections.')
    validateMasterRecord(type, body)
    let record
    if (type === 'terms') {
      const existing = termRecords.find(item => String(item.id) === String(id))
      if (!existing) throw new Error('Term not found.')
      record = { ...existing, ...body, end: null, id: existing.id }
      if (String(record.status).toLowerCase() === 'active') termRecords = termRecords.map(item => ({ ...item, status: String(item.id) === String(id) ? item.status : 'Draft' }))
      termRecords = termRecords.map(item => String(item.id) === String(id) ? record : item)
      writeStoredArray(TERMS_KEY, termRecords)
    }
    if (type === 'courses') {
      const existing = courseRecords.find(item => String(item.id) === String(id))
      if (!existing) throw new Error('Course not found.')
      enforceDepartmentScope(actor, departmentIdForCourse(existing), 'course')
      const targetDepartment = departmentRecords.find(item => String(item.name).toLowerCase() === String(body.department || existing.department || '').trim().toLowerCase())
      if (!targetDepartment) throw new Error('Selected department does not exist.')
      enforceDepartmentScope(actor, targetDepartment.id, 'course')
      if (courseRecords.some(item => String(item.id) !== String(id) && String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A course with this code already exists.')
      record = { ...existing, ...body, id: existing.id, code: String(body.code).trim().toUpperCase(), department: targetDepartment.name, department_id: targetDepartment.id, contact_hours: Number(body.contact_hours || existing.contact_hours || 3) }
      courseRecords = courseRecords.map(item => String(item.id) === String(id) ? record : item)
      writeStoredArray(COURSES_KEY, courseRecords)
      syncPlanningCatalogRecords()
    }
    if (type === 'sections') {
      const existing = sectionRecords.find(item => String(item.id) === String(id))
      if (!existing) throw new Error('Section not found.')
      enforceDepartmentScope(actor, departmentIdForSection(existing), 'section')
      const course = courseRecords.find(item => Number(item.id) === Number(body.course_id))
      if (!course) throw new Error('Selected course does not exist.')
      enforceDepartmentScope(actor, departmentIdForCourse(course), 'section')
      if (sectionRecords.some(item => String(item.id) !== String(id) && String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A section with this code already exists.')
      const component = String(body.component || existing.component || 'LECTURE').toUpperCase()
      record = { ...existing, ...body, id: existing.id, code: String(body.code).trim().toUpperCase(), course_id: Number(body.course_id), component, size: Number(body.size), name: `${course?.name || body.code} · ${component === 'PRACTICAL' ? 'Practical' : 'Lecture'}` }
      sectionRecords = sectionRecords.map(item => String(item.id) === String(id) ? record : item)
      writeStoredArray(SECTIONS_KEY, sectionRecords)
      syncPlanningCatalogRecords()
    }
    recordActivity(options, 'Master data updated', `${type.slice(0, -1)} record was edited.`, 'planning')
    return jsonClone(record)
  }

  if (path === '/catalog/planning' && method === 'GET') return jsonClone(planningCatalogs)

  if (path === '/public/sections' && method === 'GET') {
    return jsonClone({
      sections: planningCatalogs.studentGroups.map(group => ({
        id: group.id,
        name: group.name,
        level: (group.level ?? Number(String(group.name || '').match(/(?:Year|Level)\s*(\d+)/i)?.[1] || 0)) || null,
        size: group.size,
      })),
    })
  }

  if (path.startsWith('/public/timetable') && method === 'GET') {
    const query = path.includes('?') ? path.split('?')[1] : ''
    const params = new URLSearchParams(query)
    const sectionId = params.get('section_id')
    const section = planningCatalogs.studentGroups.find(group => String(group.id) === String(sectionId))
    const version = readPublishedVersion()

    if (!section) {
      return jsonClone({ version: version || null, section: null, allocations: [] })
    }

    return jsonClone({
      version: version || null,
      section: { id: section.id, name: section.name, level: (section.level ?? Number(String(section.name || '').match(/(?:Year|Level)\s*(\d+)/i)?.[1] || 0)) || null, size: section.size },
      allocations: version ? (version.allocations || []).filter(item => item.section === section.name) : [],
    })
  }

  if (path === '/students' && method === 'GET') {
    requireRoles(options, ['registration_officer', 'department_coordinator'], 'Student records are restricted to Registration and Department Coordination.')
    return jsonClone({ students: studentRecords })
  }

  const studentCourseRegistrationMatch = path.match(/^\/students\/([^/]+)\/course-enrollments(?:\?(.*))?$/)
  if (studentCourseRegistrationMatch && method === 'GET') {
    requireRoles(options, ['registration_officer', 'department_coordinator'], 'Course registrations are restricted to Registration and Department Coordination.')
    const studentId = Number(studentCourseRegistrationMatch[1])
    const query = studentCourseRegistrationMatch[2] || ''
    const params = new URLSearchParams(query)
    const termId = Number(params.get('term_id') || 1)
    return jsonClone({
      student: studentRecords.find(item => Number(item.id) === studentId) || null,
      registrations: courseEnrollmentRecords.filter(item => Number(item.student_id) === studentId && Number(item.term_id) === termId),
    })
  }

  if (path === '/course-enrollments' && method === 'POST') {
    requireRoles(options, ['registration_officer'], 'Only Registration Officer can manage Course Registration.')
    const student = studentRecords.find(item => Number(item.id) === Number(body?.student_id))
    if (!student) throw new Error('Student not found.')
    const course = courseRecords.find(item => String(item.code) === String(body?.course_code))
    if (!course) throw new Error('Course not found.')
    const duplicate = courseEnrollmentRecords.some(item => Number(item.student_id) === Number(student.id) && Number(item.term_id) === Number(body?.term_id || 1) && item.course_code === course.code && item.status === 'ACTIVE')
    if (duplicate) throw new Error('This student is already registered in this course.')
    const record = {
      id: nextNumericId(courseEnrollmentRecords),
      student_id: student.id,
      term_id: Number(body?.term_id || 1),
      course_code: course.code,
      course_name: course.name,
      status: 'ACTIVE',
      registration_type: ['CARRIED', 'REPEATED'].includes(body?.registration_type) ? body.registration_type : 'NORMAL',
    }
    courseEnrollmentRecords = [...courseEnrollmentRecords, record]
    writeStoredArray(COURSE_ENROLLMENTS_KEY, courseEnrollmentRecords)
    recordActivity(options, 'Course registration added', `${student.name} was registered in ${record.course_code}.`, 'registration')
    return jsonClone(record)
  }

  const courseRegistrationMatch = path.match(/^\/course-enrollments\/([^/]+)$/)
  if (courseRegistrationMatch && method === 'DELETE') {
    requireRoles(options, ['registration_officer'], 'Only Registration Officer can manage Course Registration.')
    const id = Number(courseRegistrationMatch[1])
    const existing = courseEnrollmentRecords.find(item => Number(item.id) === id)
    if (!existing) throw new Error('Course registration not found.')
    courseEnrollmentRecords = courseEnrollmentRecords.filter(item => Number(item.id) !== id)
    sectionEnrollmentRecords = sectionEnrollmentRecords.filter(item => !(Number(item.student_id) === Number(existing.student_id) && Number(item.term_id) === Number(existing.term_id) && item.course_code === existing.course_code))
    writeStoredArray(COURSE_ENROLLMENTS_KEY, courseEnrollmentRecords)
    writeStoredArray(SECTION_ENROLLMENTS_KEY, sectionEnrollmentRecords)
    recordActivity(options, 'Course registration removed', `${existing.course_code} and related section assignments were removed.`, 'registration')
    return jsonClone({ deleted: true, id })
  }

  const studentSectionEnrollmentMatch = path.match(/^\/students\/([^/]+)\/section-enrollments(?:\?(.*))?$/)
  if (studentSectionEnrollmentMatch && method === 'GET') {
    requireRoles(options, ['department_coordinator'], 'Only Department Coordinator can manage Section Assignments.')
    const studentId = Number(studentSectionEnrollmentMatch[1])
    const query = studentSectionEnrollmentMatch[2] || ''
    const params = new URLSearchParams(query)
    const termId = Number(params.get('term_id') || 1)
    return jsonClone({
      student: studentRecords.find(item => Number(item.id) === studentId) || null,
      assignments: sectionEnrollmentRecords.filter(item => Number(item.student_id) === studentId && Number(item.term_id) === termId),
    })
  }

  if (path === '/section-enrollments' && method === 'POST') {
    const actor = requireRoles(options, ['department_coordinator'], 'Only Department Coordinator can manage Section Assignments.')
    const student = studentRecords.find(item => Number(item.id) === Number(body?.student_id))
    if (!student) throw new Error('Student not found.')
    const registered = courseEnrollmentRecords.some(item => Number(item.student_id) === Number(student.id) && Number(item.term_id) === Number(body?.term_id || 1) && item.course_code === body?.course_code && item.status === 'ACTIVE')
    if (!registered) throw new Error('Register the course before assigning a section.')
    const section = sectionRecords.find(item => item.code === body?.section_code)
    if (!section) throw new Error('Section not found.')
    const component = String(body?.component || section.component || '').toUpperCase()
    if (String(section.component || '').toUpperCase() !== component) throw new Error('Selected section does not match the requested component.')
    const course = courseRecords.find(item => Number(item.id) === Number(section.course_id))
    if (course?.code !== body?.course_code) throw new Error('Selected section belongs to another course.')
    enforceDepartmentScope(actor, departmentIdForCourse(course), 'student section assignment')

    // One active section per student/course/component.
    sectionEnrollmentRecords = sectionEnrollmentRecords.filter(item => !(
      Number(item.student_id) === Number(student.id) &&
      Number(item.term_id) === Number(body?.term_id || 1) &&
      item.course_code === body?.course_code &&
      item.component === component &&
      item.status === 'ACTIVE'
    ))

    const record = {
      id: nextNumericId(sectionEnrollmentRecords),
      student_id: student.id,
      term_id: Number(body?.term_id || 1),
      course_code: body.course_code,
      section_code: section.code,
      component,
      status: 'ACTIVE',
    }
    sectionEnrollmentRecords = [...sectionEnrollmentRecords, record]
    writeStoredArray(SECTION_ENROLLMENTS_KEY, sectionEnrollmentRecords)
    recordActivity(options, 'Student section assigned', `${student.name} → ${record.section_code} (${record.component}).`, 'registration')
    return jsonClone(record)
  }

  const sectionEnrollmentMatch = path.match(/^\/section-enrollments\/([^/]+)$/)
  if (sectionEnrollmentMatch && method === 'DELETE') {
    const actor = requireRoles(options, ['department_coordinator'], 'Only Department Coordinator can manage Section Assignments.')
    const id = Number(sectionEnrollmentMatch[1])
    const existing = sectionEnrollmentRecords.find(item => Number(item.id) === id)
    if (!existing) throw new Error('Section assignment not found.')
    const existingSection = sectionRecords.find(item => item.code === existing.section_code)
    enforceDepartmentScope(actor, departmentIdForSection(existingSection), 'student section assignment')
    sectionEnrollmentRecords = sectionEnrollmentRecords.filter(item => Number(item.id) !== id)
    writeStoredArray(SECTION_ENROLLMENTS_KEY, sectionEnrollmentRecords)
    recordActivity(options, 'Student section assignment removed', `${existing.section_code} was removed from the student mapping.`, 'registration')
    return jsonClone({ deleted: true, id })
  }

  if (path === '/requirements' && method === 'GET') return jsonClone(requirements)
  if (path === '/requirements' && method === 'POST') {
    const actor = requireRoles(options, ['department_coordinator'], 'Only Department Coordinator can manage Requirements.')
    const course = courseRecords.find(item => Number(item.id) === Number(body?.course_id))
    if (!course) throw new Error('Course not found.')
    enforceDepartmentScope(actor, departmentIdForCourse(course), 'requirement')
    const record = { ...body, id: Math.max(100, ...requirements.map(r => Number(r.id))) + 1 }
    record.state = requirementCompleteness(record)
    requirements = [record, ...requirements]
    recordActivity(options, 'Requirement created', `Requirement #${record.id} is ${record.state.toLowerCase()}.`, 'requirements')
    return jsonClone(record)
  }
  const requirementMatch = path.match(/^\/requirements\/(\d+)$/)
  if (requirementMatch && method === 'PUT') {
    const actor = requireRoles(options, ['department_coordinator'], 'Only Department Coordinator can manage Requirements.')
    const id = Number(requirementMatch[1])
    const existingRequirement = requirements.find(item => Number(item.id) === id)
    if (!existingRequirement) throw new Error('Requirement not found.')
    const course = courseRecords.find(item => Number(item.id) === Number(body?.course_id ?? existingRequirement.course_id))
    if (!course) throw new Error('Course not found.')
    enforceDepartmentScope(actor, departmentIdForCourse(course), 'requirement')
    const next = { ...body, id, state: requirementCompleteness(body) }
    requirements = requirements.map(r => Number(r.id) === id ? next : r)
    recordActivity(options, 'Requirement updated', `Requirement #${id} is ${next.state.toLowerCase()}.`, 'requirements')
    return jsonClone(next)
  }

  if (path === '/instructor-assignments' && method === 'GET') {
    const staff = accountRecords.filter(account => ['lecturer', 'ta'].includes(account.role)).map(publicAccount)
    return jsonClone({ assignments: instructorAssignmentRecords, staff })
  }

  const sectionInstructorsMatch = path.match(/^\/sections\/([^/]+)\/instructors$/)
  if (sectionInstructorsMatch && method === 'POST') {
    const actor = requireRoles(options, ['department_coordinator'], 'Only Department Coordinator can assign instructors.')
    const sectionId = Number(sectionInstructorsMatch[1])
    const section = sectionRecords.find(item => Number(item.id) === sectionId)
    if (!section) throw new Error('Section not found.')
    enforceDepartmentScope(actor, departmentIdForSection(section), 'instructor assignment')
    const person = accountRecords.find(item => Number(item.id) === Number(body?.staff_id) && ['lecturer', 'ta'].includes(item.role))
    if (!person) throw new Error('Lecturer/TA not found.')
    if (section.component === 'LECTURE' && person.role !== 'lecturer') throw new Error('Lecture sections must be assigned to a Lecturer.')
    const record = {
      id: instructorAssignmentRecords.find(item => Number(item.section_id) === sectionId)?.id || nextNumericId(instructorAssignmentRecords),
      section_id: sectionId,
      staff_id: person.id,
      staff_name: person.name,
      staff_role: person.role === 'ta' ? 'TA' : 'LECTURER',
    }
    instructorAssignmentRecords = [...instructorAssignmentRecords.filter(item => Number(item.section_id) !== sectionId), record]
    writeStoredArray(INSTRUCTOR_ASSIGNMENTS_KEY, instructorAssignmentRecords)
    recordActivity(options, 'Instructor assigned', `${person.name} was assigned to ${section.code}.`, 'requirements')
    return jsonClone(record)
  }

  const sectionInstructorDeleteMatch = path.match(/^\/sections\/([^/]+)\/instructors\/([^/]+)$/)
  if (sectionInstructorDeleteMatch && method === 'DELETE') {
    const actor = requireRoles(options, ['department_coordinator'], 'Only Department Coordinator can assign instructors.')
    const sectionId = Number(sectionInstructorDeleteMatch[1])
    const staffId = Number(sectionInstructorDeleteMatch[2])
    const section = sectionRecords.find(item => Number(item.id) === sectionId)
    if (!section) throw new Error('Section not found.')
    enforceDepartmentScope(actor, departmentIdForSection(section), 'instructor assignment')
    instructorAssignmentRecords = instructorAssignmentRecords.filter(item => !(Number(item.section_id) === sectionId && Number(item.staff_id) === staffId))
    writeStoredArray(INSTRUCTOR_ASSIGNMENTS_KEY, instructorAssignmentRecords)
    recordActivity(options, 'Instructor assignment removed', `Instructor assignment for section #${sectionId} was removed.`, 'requirements')
    return jsonClone({ deleted: true })
  }

  if (path.startsWith('/availability/me') && method === 'GET') {
    const user = mockUserFromOptions(options)
    if (!user || !['lecturer', 'ta'].includes(user.role)) throw new Error('Teaching account required.')
    let record = availabilityRecords.find(item => Number(item.instructor_id) === Number(user.id) && Number(item.term_id) === Number(new URLSearchParams(path.split('?')[1] || '').get('term_id') || 1))
    if (!record) {
      record = { id: nextNumericId(availabilityRecords), term_id: 1, instructor_id: user.id, instructor_name: user.name, role: user.role === 'ta' ? 'TA' : 'LECTURER', state: 'DRAFT', confirmed_at: null, slots: [] }
      availabilityRecords = [...availabilityRecords, record]
      writeStoredArray(AVAILABILITY_KEY, availabilityRecords)
    }
    return jsonClone(record)
  }
  if (path === '/availability/me' && method === 'PUT') {
    const user = mockUserFromOptions(options)
    if (!user || !['lecturer', 'ta'].includes(user.role)) throw new Error('Teaching account required.')
    const termId = Number(body?.term_id || 1)
    const existing = availabilityRecords.find(item => Number(item.instructor_id) === Number(user.id) && Number(item.term_id) === termId)
    const record = { ...(existing || {}), ...body, id: existing?.id || nextNumericId(availabilityRecords), term_id: termId, instructor_id: user.id, instructor_name: user.name, role: user.role === 'ta' ? 'TA' : 'LECTURER', state: 'DRAFT', confirmed_at: null }
    availabilityRecords = [...availabilityRecords.filter(item => !(Number(item.instructor_id) === Number(user.id) && Number(item.term_id) === termId)), record]
    writeStoredArray(AVAILABILITY_KEY, availabilityRecords)
    recordActivity(options, 'Availability saved', `${user.name} saved teaching availability as Draft.`, 'availability')
    return jsonClone(record)
  }
  if (path === '/availability/me/confirm' && method === 'POST') {
    const user = mockUserFromOptions(options)
    if (!user || !['lecturer', 'ta'].includes(user.role)) throw new Error('Teaching account required.')
    const termId = Number(body?.term_id || 1)
    const existing = availabilityRecords.find(item => Number(item.instructor_id) === Number(user.id) && Number(item.term_id) === termId)
    const record = { ...(existing || {}), ...(body || {}), id: existing?.id || nextNumericId(availabilityRecords), term_id: termId, instructor_id: user.id, instructor_name: user.name, role: user.role === 'ta' ? 'TA' : 'LECTURER', state: 'CONFIRMED', confirmed_at: new Date().toISOString() }
    availabilityRecords = [...availabilityRecords.filter(item => !(Number(item.instructor_id) === Number(user.id) && Number(item.term_id) === termId)), record]
    writeStoredArray(AVAILABILITY_KEY, availabilityRecords)
    recordActivity(options, 'Availability confirmed', `${user.name} confirmed teaching availability.`, 'availability')
    return jsonClone(record)
  }

  if (path.startsWith('/lab-checks') && method === 'GET') {
    const labRequirements = requirements.filter(r => ['practical', 'lab'].includes(String(r.session_type || '').toLowerCase()))
    return jsonClone({
      requirements: labRequirements.map(req => ({
        ...req,
        candidates: buildCandidateLabs(req),
        decision: labDecisions.find(d => Number(d.requirement_id) === Number(req.id)) || null,
      })),
      rooms: roomRecords.filter(room => String(room.type || '').includes('Lab')),
    })
  }
  const labCheckMatch = path.match(/^\/lab-checks\/(\d+)$/)
  if (labCheckMatch && method === 'POST') {
    requireRoles(options, ['lab_manager'], 'Only Lab Manager can confirm Lab Checks.')
    const requirementId = Number(labCheckMatch[1])
    const decision = {
      requirement_id: requirementId,
      room_id: body.room_id,
      status: body.status || 'CONFIRMED',
      notes: body.notes || '',
      checked_by: 'Lab Manager',
      checked_at: new Date().toISOString(),
    }
    labDecisions = [...labDecisions.filter(d => Number(d.requirement_id) !== requirementId), decision]
    writeStoredArray(LAB_DECISIONS_KEY, labDecisions)
    recordActivity(options, 'Lab check completed', `Requirement #${requirementId} was checked against ${body.room_id}.`, 'facilities')
    return jsonClone(decision)
  }


  if (path === '/rooms' && method === 'GET') return jsonClone({ rooms: roomRecords })
  if (path === '/rooms' && method === 'POST') {
    requireRoles(options, ['lab_manager'], 'Only Lab Manager can manage Rooms and Labs.')
    const record = {
      id: nextRoomId(),
      name: String(body?.name || '').trim(),
      building: String(body?.building || '').trim(),
      capacity: Number(body?.capacity || 0),
      type: body?.type || 'Classroom',
      equipment: Array.isArray(body?.equipment) ? body.equipment : [],
      accessibility: Boolean(body?.accessibility),
      status: body?.status || 'available',
      closure: body?.closure || '',
    }
    if (!record.name || !record.building || record.capacity < 1) throw new Error('Name, building and a valid capacity are required.')
    roomRecords = [record, ...roomRecords]
    writeStoredArray(ROOMS_KEY, roomRecords)
    recordActivity(options, 'Room inventory updated', `${record.name} was added to the room inventory.`, 'facilities')
    return jsonClone(record)
  }
  const roomMatch = path.match(/^\/rooms\/([^/]+)$/)
  if (roomMatch && method === 'PUT') {
    requireRoles(options, ['lab_manager'], 'Only Lab Manager can manage Rooms and Labs.')
    const id = roomMatch[1]
    const existing = roomRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Room or lab not found.')
    const next = {
      ...existing,
      ...body,
      id: existing.id,
      capacity: Number(body?.capacity ?? existing.capacity),
      equipment: Array.isArray(body?.equipment) ? body.equipment : existing.equipment,
      accessibility: Boolean(body?.accessibility),
    }
    roomRecords = roomRecords.map(item => String(item.id) === String(id) ? next : item)
    writeStoredArray(ROOMS_KEY, roomRecords)
    recordActivity(options, 'Room inventory updated', `${next.name} was edited.`, 'facilities')
    return jsonClone(next)
  }
  if (roomMatch && method === 'DELETE') {
    requireRoles(options, ['lab_manager'], 'Only Lab Manager can manage Rooms and Labs.')
    const id = roomMatch[1]
    const existing = roomRecords.find(item => String(item.id) === String(id))
    roomRecords = roomRecords.filter(item => String(item.id) !== String(id))
    writeStoredArray(ROOMS_KEY, roomRecords)
    recordActivity(options, 'Room removed', `${existing?.name || id} was removed from the room inventory.`, 'facilities')
    return jsonClone({ deleted: true, id })
  }

  const draftWorkflowMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/workflow$/)
  if (draftWorkflowMatch && method === 'GET') {
    return jsonClone(readScheduleWorkflow())
  }

  const generateDraftMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/generate$/)
  if (generateDraftMatch && method === 'POST') {
    const user = mockUserFromOptions(options)
    if (!user || !['scheduler', 'super_admin'].includes(user.role)) throw new Error('Only Scheduler can generate the draft schedule.')

    const blockers = []
    const activeTerm = termRecords.find(item => String(item.status || '').toLowerCase() === 'active')
    if (!activeTerm) blockers.push('No active Academic Term.')

    const incompleteRequirements = requirements.filter(item => item.state !== 'READY')
    if (incompleteRequirements.length) blockers.push(`${incompleteRequirements.length} requirement(s) are incomplete.`)

    const unassignedSections = sectionRecords.filter(section => !instructorAssignmentRecords.some(item => Number(item.section_id) === Number(section.id)))
    if (unassignedSections.length) blockers.push(`${unassignedSections.length} section(s) do not have an assigned Lecturer/TA.`)

    const teachingAccounts = accountRecords.filter(item => item.role === 'lecturer' || item.role === 'ta')
    const missingAvailability = teachingAccounts.filter(account => !availabilityRecords.some(item => Number(item.instructor_id) === Number(account.id) && item.state === 'CONFIRMED'))
    if (missingAvailability.length) blockers.push(`${missingAvailability.length} teaching account(s) have not confirmed availability.`)

    const practicalRequirements = requirements.filter(item => String(item.session_type || '').toLowerCase() === 'practical')
    const uncheckedLabs = practicalRequirements.filter(req => !labDecisions.some(item => Number(item.requirement_id) === Number(req.id) && item.status === 'CONFIRMED'))
    if (uncheckedLabs.length) blockers.push(`${uncheckedLabs.length} Practical requirement(s) still need Lab Manager confirmation.`)

    if (!roomRecords.length) blockers.push('No rooms or labs are configured.')

    const missingSectionAssignments = []
    courseEnrollmentRecords.filter(item => item.status === 'ACTIVE').forEach(registration => {
      const course = courseRecords.find(item => item.code === registration.course_code)
      const components = [...new Set(sectionRecords.filter(section => Number(section.course_id) === Number(course?.id)).map(section => String(section.component || '').toUpperCase()))]
      components.forEach(component => {
        const assigned = sectionEnrollmentRecords.some(item => Number(item.student_id) === Number(registration.student_id) && Number(item.term_id) === Number(registration.term_id) && item.course_code === registration.course_code && item.component === component && item.status === 'ACTIVE')
        if (!assigned) missingSectionAssignments.push(`${registration.student_id}:${registration.course_code}:${component}`)
      })
    })
    if (missingSectionAssignments.length) blockers.push(`${missingSectionAssignments.length} student Lecture/Practical section assignment(s) are missing.`)

    if (blockers.length) throw new Error(`Schedule readiness blocked: ${blockers.join(' ')}`)

    draftAllocationRecords = jsonClone(initialAllocations)
    writeStoredArray(DRAFT_ALLOCATIONS_KEY, draftAllocationRecords)
    const workflow = {
      draft_id: generateDraftMatch[1],
      status: 'DRAFT',
      generated_by: user.name,
      generated_at: new Date().toISOString(),
      submitted_by: null,
      submitted_at: null,
      published_by: null,
      published_at: null,
    }
    writeScheduleWorkflow(workflow)
    recordActivity(options, 'Draft schedule generated', `${user.name} generated a new term draft.`, 'planning')
    return jsonClone({ allocations: draftAllocationRecords, workflow })
  }

  const submitReviewMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/submit-review$/)
  if (submitReviewMatch && method === 'POST') {
    const user = mockUserFromOptions(options)
    if (!user || !['scheduler', 'super_admin'].includes(user.role)) throw new Error('Only Scheduler can submit the draft for review.')
    const resolvedIds = Array.isArray(body?.resolved_conflict_ids) ? body.resolved_conflict_ids : []
    const openConflicts = conflicts.filter(conflict => !resolvedIds.includes(conflict.id))
    if (openConflicts.length > 0) throw new Error(`Resolve ${openConflicts.length} hard conflict(s) before submitting for Admin review.`)
    const workflow = {
      ...readScheduleWorkflow(),
      draft_id: submitReviewMatch[1],
      status: 'READY_FOR_REVIEW',
      submitted_by: user.name,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    writeScheduleWorkflow(workflow)
    recordActivity(options, 'Draft submitted for review', `${user.name} submitted the draft to Admin.`, 'review')
    return jsonClone(workflow)
  }

  const draftAllocationsMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/allocations$/)
  if (draftAllocationsMatch && method === 'GET') return jsonClone({ allocations: draftAllocationRecords })
  if (draftAllocationsMatch && method === 'POST') {
    const actor = requireRoles(options, ['scheduler', 'admin'], 'Only Scheduler or Admin can edit Draft allocations.')
    const sectionRecord = sectionRecords.find(item => Number(item.id) === Number(body?.section_id))
    const courseRecord = courseRecords.find(item => Number(item.id) === Number(sectionRecord?.course_id))
    const assignedInstructor = instructorAssignmentRecords.find(item => Number(item.section_id) === Number(sectionRecord?.id))
    if (body?.section_id && !sectionRecord) throw new Error('Section not found.')
    if (sectionRecord && !assignedInstructor) throw new Error('This section has no instructor assignment. Department Coordinator action is required.')
    const candidate = {
      id: nextNumericId(draftAllocationRecords),
      section_id: sectionRecord?.id ?? body?.section_id ?? null,
      course_id: courseRecord?.id ?? body?.course_id ?? null,
      instructor_id: assignedInstructor?.staff_id ?? body?.instructor_id ?? null,
      day: body?.day,
      slot: body?.slot,
      course: courseRecord?.name || String(body?.course || '').trim(),
      code: courseRecord?.code || String(body?.code || '').trim(),
      section: sectionRecord?.code || String(body?.section || '').trim(),
      room: String(body?.room || '').trim(),
      staff: assignedInstructor?.staff_name || String(body?.staff || '').trim(),
      type: sectionRecord?.component === 'PRACTICAL' ? 'Practical' : (sectionRecord ? 'Lecture' : body?.type || 'Lecture'),
      department_id: courseRecord?.department_id ?? body?.department_id ?? null,
      status: 'ok',
    }
    if (!candidate.day || !candidate.slot || !candidate.course || !candidate.code || !candidate.section || !candidate.room || !candidate.staff) {
      throw new Error('Complete course, section, staff, room, day and time before adding the session.')
    }
    if (actor?.role === 'admin' && actor.department_id && Number(candidate.department_id) !== Number(actor.department_id)) {
      throw new Error('Department scope violation: Admin can edit only the authorized department schedule.')
    }
    const teachingAccount = accountRecords.find(account => ['lecturer', 'ta'].includes(account.role) && account.name === candidate.staff)
    if (teachingAccount) {
      const availabilityRecord = availabilityRecords.find(item => Number(item.instructor_id) === Number(teachingAccount.id) && Number(item.term_id) === 1)
      if (!availabilityRecord || availabilityRecord.state !== 'CONFIRMED') throw new Error(`${candidate.staff} has not confirmed availability for the active term.`)
      const available = (availabilityRecord.slots || []).some(item => item.day === candidate.day && item.slot_id === candidate.slot && ['AVAILABLE', 'PREFERRED'].includes(item.kind))
      if (!available) throw new Error(`${candidate.staff} is unavailable for the selected slot.`)
    }
    const selectedRoom = roomRecords.find(room => room.name === candidate.room)
    if (!selectedRoom) throw new Error('Selected room or lab was not found.')
    if (selectedRoom.status !== 'available') throw new Error(`${selectedRoom.name} is not currently available for scheduling.`)
    const collision = allocationCollision(candidate)
    if (collision) {
      const reason = collision.room === candidate.room ? `Room ${candidate.room} is already used in this slot.` : collision.staff === candidate.staff ? `${candidate.staff} already has a session in this slot.` : `${candidate.section} already has a session in this slot.`
      throw new Error(`Hard conflict: ${reason}`)
    }
    draftAllocationRecords = [...draftAllocationRecords, candidate]
    writeStoredArray(DRAFT_ALLOCATIONS_KEY, draftAllocationRecords)
    recordActivity(options, 'Session added to draft', `${candidate.code} was scheduled on ${candidate.day}.`, 'planning')
    return jsonClone(candidate)
  }
  const draftAllocationMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/allocations\/([^/]+)$/)
  if (draftAllocationMatch && method === 'PUT') {
    const actor = requireRoles(options, ['scheduler', 'admin'], 'Only Scheduler or Admin can edit Draft allocations.')
    const id = draftAllocationMatch[2]
    const existing = draftAllocationRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Draft allocation not found.')
    const next = { ...existing, ...body, id: existing.id }
    if (actor?.role === 'admin' && actor.department_id && Number(next.department_id) !== Number(actor.department_id)) {
      throw new Error('Department scope violation: Admin can edit only the authorized department schedule.')
    }
    const teachingAccount = accountRecords.find(account => ['lecturer', 'ta'].includes(account.role) && account.name === next.staff)
    if (teachingAccount) {
      const availabilityRecord = availabilityRecords.find(item => Number(item.instructor_id) === Number(teachingAccount.id) && Number(item.term_id) === 1)
      if (!availabilityRecord || availabilityRecord.state !== 'CONFIRMED') throw new Error(`${next.staff} has not confirmed availability for the active term.`)
      const available = (availabilityRecord.slots || []).some(item => item.day === next.day && item.slot_id === next.slot && ['AVAILABLE', 'PREFERRED'].includes(item.kind))
      if (!available) throw new Error(`${next.staff} is unavailable for the selected slot.`)
    }
    const selectedRoom = roomRecords.find(room => room.name === next.room)
    if (!selectedRoom || selectedRoom.status !== 'available') throw new Error(`${next.room} is not currently available for scheduling.`)
    const collision = allocationCollision(next, id)
    if (collision) throw new Error('Hard conflict: the updated allocation overlaps another room, staff member or section.')
    draftAllocationRecords = draftAllocationRecords.map(item => String(item.id) === String(id) ? next : item)
    writeStoredArray(DRAFT_ALLOCATIONS_KEY, draftAllocationRecords)
    if (actor?.role === 'admin') {
      const workflow = { ...readScheduleWorkflow(), status: 'UNDER_REVIEW', updated_at: new Date().toISOString() }
      writeScheduleWorkflow(workflow)
    }
    recordActivity(options, 'Draft session updated', `${next.code} allocation was updated.`, actor?.role === 'admin' ? 'review' : 'planning')
    return jsonClone(next)
  }
  if (draftAllocationMatch && method === 'DELETE') {
    const actor = requireRoles(options, ['scheduler', 'admin'], 'Only Scheduler or Admin can edit Draft allocations.')
    const id = draftAllocationMatch[2]
    const existing = draftAllocationRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Draft allocation not found.')
    if (actor?.role === 'admin' && actor.department_id && Number(existing.department_id) !== Number(actor.department_id)) throw new Error('Department scope violation: Admin can edit only the authorized department schedule.')
    draftAllocationRecords = draftAllocationRecords.filter(item => String(item.id) !== String(id))
    writeStoredArray(DRAFT_ALLOCATIONS_KEY, draftAllocationRecords)
    recordActivity(options, 'Draft session removed', `${existing?.code || 'A session'} was removed from the draft.`, 'planning')
    return jsonClone({ deleted: true, id })
  }


  const validateDraftMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/validate$/)
  if (validateDraftMatch && method === 'POST') {
    const resolvedIds = Array.isArray(body?.resolved_conflict_ids) ? body.resolved_conflict_ids : []
    const openConflicts = conflicts.filter(conflict => !resolvedIds.includes(conflict.id))
    return jsonClone({
      draft_id: validateDraftMatch[1],
      valid: openConflicts.length === 0,
      hard_conflict_count: openConflicts.length,
      hard_conflicts: openConflicts.map(conflict => ({
        id: conflict.id,
        type: conflict.title,
        message: conflict.reason,
        scope: conflict.scope,
      })),
    })
  }

  const publishDraftMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/publish$/)
  if (publishDraftMatch && method === 'POST') {
    const user = mockUserFromOptions(options)
    if (!user || !['admin', 'super_admin'].includes(user.role)) throw new Error('Publish is restricted to ADMIN.')
    const workflow = readScheduleWorkflow()
    if (!['READY_FOR_REVIEW', 'UNDER_REVIEW', 'APPROVED'].includes(workflow.status)) throw new Error('The Scheduler must submit the draft for Admin review before Publish.')

    const resolvedIds = Array.isArray(body?.resolved_conflict_ids) ? body.resolved_conflict_ids : []
    const openConflicts = conflicts.filter(conflict => !resolvedIds.includes(conflict.id))
    if (openConflicts.length > 0) {
      throw new Error(`Cannot publish: ${openConflicts.length} hard conflict${openConflicts.length === 1 ? '' : 's'} must be resolved first.`)
    }

    const previous = readPublishedVersion()
    const versionNumber = Number(previous?.version_number || 0) + 1
    const published = {
      id: `published-v${versionNumber}`,
      source_draft_id: publishDraftMatch[1],
      version_number: versionNumber,
      name: body?.name || `Fall 2026 · Version ${versionNumber}`,
      term_id: body?.term_id || 'fall-2026',
      term_name: body?.term_name || 'Fall 2026',
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      published_by: user.name,
      allocations: jsonClone(draftAllocationRecords),
    }
    writePublishedVersion(published)
    writeScheduleWorkflow({ ...workflow, status: 'PUBLISHED', published_by: user.name, published_at: published.published_at, updated_at: published.published_at })
    recordActivity(options, 'Timetable published', `${published.name} was published by ${user.name}.`, 'publication')
    return jsonClone(published)
  }

  if (path === '/timetable/published/me' && method === 'GET') {
    const version = readPublishedVersion()
    const user = mockUserFromOptions(options)
    if (!version) return jsonClone({ version: null })

    if (user?.role === 'student') {
      const student = studentRecords.find(item => Number(item.id) === Number(user.student_id)) || studentRecords.find(item => item.email?.toLowerCase() === user.email?.toLowerCase())
      const activeCourseRegistrations = courseEnrollmentRecords.filter(item => Number(item.student_id) === Number(student?.id) && Number(item.term_id) === 1 && item.status === 'ACTIVE')
      const activeSections = sectionEnrollmentRecords.filter(item => Number(item.student_id) === Number(student?.id) && Number(item.term_id) === 1 && item.status === 'ACTIVE')
      const allocations = (version.allocations || []).filter(allocation => activeSections.some(enrollment => allocation.section === enrollment.section_code))
      return jsonClone({
        version: { ...version, allocations },
        student: student || null,
        course_registrations: activeCourseRegistrations,
        section_enrollments: activeSections,
      })
    }

    if (user && ['lecturer', 'ta'].includes(user.role)) {
      const allocations = (version.allocations || []).filter(allocation => allocation.staff === user.name)
      return jsonClone({ version: { ...version, allocations } })
    }

    return jsonClone({ version })
  }

  throw new Error(`Mock API route not implemented: ${method} ${path}`)
}
