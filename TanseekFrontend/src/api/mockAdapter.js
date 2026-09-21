import { planningCatalogs, initialRequirements, initialAvailability, initialLabDecisions } from '../data/workflowData.js'
import { mockAccounts } from '../data/mockAccounts.js'
import { initialRoles } from '../data/mockRoles.js'
import { conflicts, rooms as initialRooms, allocations as initialAllocations, masterData as initialMasterData } from '../data/mockData.js'

let requirements = structuredClone(initialRequirements)
let availability = structuredClone(initialAvailability)
let labDecisions = structuredClone(initialLabDecisions)

const PUBLISHED_VERSION_KEY = 'tanseek_mock_published_version'
const LAB_DECISIONS_KEY = 'tanseek_mock_lab_decisions_v29'

const ROOMS_KEY = 'tanseek_mock_rooms'
const DRAFT_ALLOCATIONS_KEY = 'tanseek_mock_draft_allocations'
const ACCOUNTS_KEY = 'tanseek_mock_accounts_v27'
const ROLES_KEY = 'tanseek_mock_roles_v27'
const ACTIVITY_KEY = 'tanseek_mock_activity_v28'
const TERMS_KEY = 'tanseek_mock_terms_v29'
const COURSES_KEY = 'tanseek_mock_courses_v29'
const SECTIONS_KEY = 'tanseek_mock_sections_v29'

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
let termRecords = readStoredArray(TERMS_KEY, initialMasterData.terms)
let courseRecords = readStoredArray(COURSES_KEY, planningCatalogs.courses.map((course, index) => ({
  ...course,
  contact_hours: course.contact_hours ?? initialMasterData.courses.find(item => item.id === course.code)?.hours ?? 3,
})))
let sectionRecords = readStoredArray(SECTIONS_KEY, planningCatalogs.sections.map((section, index) => ({
  ...section,
  student_group_id: section.student_group_id ?? planningCatalogs.studentGroups[index % planningCatalogs.studentGroups.length]?.id ?? null,
})))

function syncPlanningCatalogRecords() {
  planningCatalogs.courses = courseRecords
  planningCatalogs.sections = sectionRecords.map(section => {
    const group = planningCatalogs.studentGroups.find(item => Number(item.id) === Number(section.student_group_id))
    const course = courseRecords.find(item => Number(item.id) === Number(section.course_id))
    return {
      ...section,
      name: section.name || `${course?.name || section.code} · ${group?.name || 'Section'}`,
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

function mockUserFromOptions(options = {}) {
  const auth = options?.headers?.Authorization || options?.headers?.authorization || ''
  const token = String(auth).replace(/^Bearer\s+/i, '')
  const match = token.match(/^mock-token-(\d+)-(.+)$/)
  if (!match) return null
  return publicAccount(accountRecords.find(item => String(item.id) === match[1]))
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
    scheduler: ['planning', 'requirements', 'facilities', 'availability', 'publication'],
    admin: ['planning', 'requirements', 'facilities', 'publication'],
    coordinator: ['requirements', 'planning', 'publication'],
    lecturer: ['availability', 'publication'],
    lab_manager: ['facilities', 'requirements', 'planning'],
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
  const lecturerAccounts = accountRecords.filter(item => item.role === 'lecturer')
  const confirmedAvailability = availability.state === 'CONFIRMED' ? Math.min(1, lecturerAccounts.length || 1) : 0
  const totalAvailability = Math.max(lecturerAccounts.length, 1)
  const readyRequirements = requirements.filter(item => item.state === 'READY').length
  const requirementSessions = requirements.reduce((sum, item) => sum + Math.max(1, Number(item.weekly_count || 1)), 0)
  const allocatedRequirements = requirements.filter(req => {
    const course = planningCatalogs.courses.find(item => Number(item.id) === Number(req.course_id))
    return course && draftAllocationRecords.some(allocation => String(allocation.code || '').startsWith(course.code))
  }).length
  const allocationProgress = pct(allocatedRequirements, requirements.length)

  if (role === 'super_admin') {
    const departments = new Set(accountRecords.filter(item => item.department_id != null).map(item => item.department_name).filter(Boolean))
    const customRoles = roleRecords.filter(item => !item.built_in).length
    return {
      kind: 'system',
      eyebrow: 'System summary',
      description: 'Live account, role and platform inventory for the current mock workspace.',
      metrics: [
        { label: 'Staff accounts', value: String(accountRecords.length), helper: 'active mock accounts', icon: 'people', tone: 'teal' },
        { label: 'Roles', value: String(roleRecords.length), helper: `${customRoles} custom`, icon: 'shield' },
        { label: 'Departments', value: String(departments.size), helper: 'represented by staff accounts', icon: 'room' },
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

  if (role === 'lecturer') {
    const publishedSessions = (latestPublished?.allocations || []).filter(item => item.staff === user?.name).length
    const preferredSlots = (availability.slots || []).filter(item => item.kind === 'PREFERRED').length
    const availableSlots = (availability.slots || []).filter(item => item.kind === 'AVAILABLE' || item.kind === 'PREFERRED').length
    return {
      kind: 'lecturer',
      eyebrow: 'Teaching summary',
      description: 'Your availability status and latest published teaching assignments.',
      metrics: [
        { label: 'Availability status', value: availability.state === 'CONFIRMED' ? 'Confirmed' : 'Draft', helper: availability.confirmed_at ? 'submitted for scheduling' : 'not confirmed yet', icon: 'check', tone: availability.state === 'CONFIRMED' ? 'teal' : undefined },
        { label: 'Published sessions', value: String(publishedSessions), helper: 'assigned to your account', icon: 'calendar' },
        { label: 'Preferred slots', value: String(preferredSlots), helper: 'soft-preference windows', icon: 'clock', tone: 'teal' },
        { label: 'Available slots', value: String(availableSlots), helper: 'available or preferred', icon: 'grid' },
      ],
      summary: [
        ['Availability status', availability.state === 'CONFIRMED' ? 'Confirmed' : 'Draft'],
        ['Published version', latestPublished ? `Version ${latestPublished.version_number}` : 'Not published'],
        ['Published sessions', publishedSessions],
        ['Current term', planningCatalogs.term.name],
      ],
      recent_activity: relevantActivitiesForRole(role),
    }
  }

  if (role === 'coordinator' || role === 'admin') {
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
      { label: 'Hard conflicts', value: String(conflicts.length), helper: 'must be resolved to publish', icon: 'alert', tone: 'alert' },
      { label: 'Room utilization', value: `${roomUtilization}%`, helper: 'draft room-slot utilization', icon: 'room' },
      { label: 'Staff availability', value: `${confirmedAvailability}/${totalAvailability}`, helper: 'teaching profiles confirmed', icon: 'people' },
    ],
    readiness: {
      title: 'Publication readiness',
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
    if (!String(body?.name || '').trim() || !body?.start || !body?.end) throw new Error('Term name, start date and end date are required.')
    if (String(body.start) >= String(body.end)) throw new Error('Term end date must be after the start date.')
  }
  if (type === 'courses') {
    if (!String(body?.code || '').trim() || !String(body?.name || '').trim() || !String(body?.department || '').trim()) throw new Error('Course code, name and department are required.')
  }
  if (type === 'sections') {
    if (!String(body?.code || '').trim() || !Number(body?.course_id) || !Number(body?.student_group_id) || Number(body?.size) < 1) throw new Error('Section code, course, student group and size are required.')
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
  const hasCore = input.course_id && input.section_id && input.session_type && Number(input.duration_minutes) > 0 && Number(input.weekly_count) > 0
  const hasGroups = Array.isArray(input.student_group_ids) && input.student_group_ids.length > 0
  const needs = input.session_type === 'Lab' ? input.required_room_type && Array.isArray(input.required_equipment) && input.required_equipment.length > 0 : true
  return hasCore && hasGroups && needs ? 'READY' : 'INCOMPLETE'
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
  const section = planningCatalogs.sections.find(s => s.id === Number(requirement.section_id))
  const groupSize = (requirement.student_group_ids || []).reduce((sum, id) => sum + (planningCatalogs.studentGroups.find(g => g.id === Number(id))?.size || 0), 0) || section?.size || 0
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

  if (path === '/admin/accounts' && method === 'GET') {
    return jsonClone({ accounts: accountRecords.map(publicAccount) })
  }
  if (path === '/admin/accounts' && method === 'POST') {
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
    recordActivity(options, 'Account created', `${record.name} was added as ${record.role_label}.`, 'system')
    return jsonClone(publicAccount(record))
  }
  const accountMatch = path.match(/^\/admin\/accounts\/([^/]+)$/)
  if (accountMatch && method === 'PUT') {
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
    recordActivity(options, 'Account updated', `${next.name}'s account settings were updated.`, 'system')
    return jsonClone(publicAccount(next))
  }
  if (accountMatch && method === 'DELETE') {
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
    return jsonClone({ roles: roleRecords })
  }
  if (path === '/admin/roles' && method === 'POST') {
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
      validateMasterRecord(type, body)
      let record
      if (type === 'terms') {
        record = { ...body, id: `t${nextNumericId(termRecords.map((item, i) => ({ id: Number(String(item.id).replace(/\D/g, '')) || i + 1 })))}` }
        termRecords = [...termRecords, record]
        writeStoredArray(TERMS_KEY, termRecords)
      }
      if (type === 'courses') {
        if (courseRecords.some(item => String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A course with this code already exists.')
        record = { id: nextCourseId(), code: String(body.code).trim().toUpperCase(), name: String(body.name).trim(), department: String(body.department).trim(), contact_hours: Number(body.contact_hours || 3) }
        courseRecords = [...courseRecords, record]
        writeStoredArray(COURSES_KEY, courseRecords)
        syncPlanningCatalogRecords()
      }
      if (type === 'sections') {
        if (!courseRecords.some(item => Number(item.id) === Number(body.course_id))) throw new Error('Selected course does not exist.')
        if (!planningCatalogs.studentGroups.some(item => Number(item.id) === Number(body.student_group_id))) throw new Error('Selected student group does not exist.')
        if (sectionRecords.some(item => String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A section with this code already exists.')
        const group = planningCatalogs.studentGroups.find(item => Number(item.id) === Number(body.student_group_id))
        const course = courseRecords.find(item => Number(item.id) === Number(body.course_id))
        record = { id: nextSectionId(), code: String(body.code).trim().toUpperCase(), course_id: Number(body.course_id), student_group_id: Number(body.student_group_id), size: Number(body.size), name: `${course?.name || body.code} · ${group?.name || 'Section'}` }
        sectionRecords = [...sectionRecords, record]
        writeStoredArray(SECTIONS_KEY, sectionRecords)
        syncPlanningCatalogRecords()
      }
      recordActivity(options, 'Master data updated', `${type.slice(0, -1)} record was created.`, 'planning')
      return jsonClone(record)
    }
  }

  const masterRecordMatch = path.match(/^\/master-data\/(terms|courses|sections)\/([^/]+)$/)
  if (masterRecordMatch && method === 'PUT') {
    const type = masterRecordMatch[1]
    const id = masterRecordMatch[2]
    validateMasterRecord(type, body)
    let record
    if (type === 'terms') {
      const existing = termRecords.find(item => String(item.id) === String(id))
      if (!existing) throw new Error('Term not found.')
      record = { ...existing, ...body, id: existing.id }
      termRecords = termRecords.map(item => String(item.id) === String(id) ? record : item)
      writeStoredArray(TERMS_KEY, termRecords)
    }
    if (type === 'courses') {
      const existing = courseRecords.find(item => String(item.id) === String(id))
      if (!existing) throw new Error('Course not found.')
      if (courseRecords.some(item => String(item.id) !== String(id) && String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A course with this code already exists.')
      record = { ...existing, ...body, id: existing.id, code: String(body.code).trim().toUpperCase(), contact_hours: Number(body.contact_hours || existing.contact_hours || 3) }
      courseRecords = courseRecords.map(item => String(item.id) === String(id) ? record : item)
      writeStoredArray(COURSES_KEY, courseRecords)
      syncPlanningCatalogRecords()
    }
    if (type === 'sections') {
      const existing = sectionRecords.find(item => String(item.id) === String(id))
      if (!existing) throw new Error('Section not found.')
      if (sectionRecords.some(item => String(item.id) !== String(id) && String(item.code).toLowerCase() === String(body.code).trim().toLowerCase())) throw new Error('A section with this code already exists.')
      const group = planningCatalogs.studentGroups.find(item => Number(item.id) === Number(body.student_group_id))
      const course = courseRecords.find(item => Number(item.id) === Number(body.course_id))
      record = { ...existing, ...body, id: existing.id, code: String(body.code).trim().toUpperCase(), course_id: Number(body.course_id), student_group_id: Number(body.student_group_id), size: Number(body.size), name: `${course?.name || body.code} · ${group?.name || 'Section'}` }
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

  if (path === '/requirements' && method === 'GET') return jsonClone(requirements)
  if (path === '/requirements' && method === 'POST') {
    const record = { ...body, id: Math.max(100, ...requirements.map(r => Number(r.id))) + 1 }
    record.state = requirementCompleteness(record)
    requirements = [record, ...requirements]
    recordActivity(options, 'Requirement created', `Requirement #${record.id} is ${record.state.toLowerCase()}.`, 'requirements')
    return jsonClone(record)
  }
  const requirementMatch = path.match(/^\/requirements\/(\d+)$/)
  if (requirementMatch && method === 'PUT') {
    const id = Number(requirementMatch[1])
    const next = { ...body, id, state: requirementCompleteness(body) }
    requirements = requirements.map(r => Number(r.id) === id ? next : r)
    recordActivity(options, 'Requirement updated', `Requirement #${id} is ${next.state.toLowerCase()}.`, 'requirements')
    return jsonClone(next)
  }

  if (path.startsWith('/availability/me') && method === 'GET') return jsonClone(availability)
  if (path === '/availability/me' && method === 'PUT') {
    availability = { ...availability, ...body, state: 'DRAFT', confirmed_at: null }
    recordActivity(options, 'Availability saved', 'Teaching availability was saved as a draft.', 'availability')
    return jsonClone(availability)
  }
  if (path === '/availability/me/confirm' && method === 'POST') {
    availability = { ...availability, ...(body || {}), state: 'CONFIRMED', confirmed_at: new Date().toISOString() }
    recordActivity(options, 'Availability confirmed', 'Teaching availability is ready for scheduling.', 'availability')
    return jsonClone(availability)
  }

  if (path.startsWith('/lab-checks') && method === 'GET') {
    const labRequirements = requirements.filter(r => r.session_type === 'Lab')
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
    const id = roomMatch[1]
    const existing = roomRecords.find(item => String(item.id) === String(id))
    roomRecords = roomRecords.filter(item => String(item.id) !== String(id))
    writeStoredArray(ROOMS_KEY, roomRecords)
    recordActivity(options, 'Room removed', `${existing?.name || id} was removed from the room inventory.`, 'facilities')
    return jsonClone({ deleted: true, id })
  }

  const draftAllocationsMatch = path.match(/^\/schedule\/drafts\/([^/]+)\/allocations$/)
  if (draftAllocationsMatch && method === 'GET') return jsonClone({ allocations: draftAllocationRecords })
  if (draftAllocationsMatch && method === 'POST') {
    const candidate = {
      id: nextNumericId(draftAllocationRecords),
      day: body?.day,
      slot: body?.slot,
      course: String(body?.course || '').trim(),
      code: String(body?.code || '').trim(),
      section: String(body?.section || '').trim(),
      room: String(body?.room || '').trim(),
      staff: String(body?.staff || '').trim(),
      type: body?.type || 'Lecture',
      status: 'ok',
    }
    if (!candidate.day || !candidate.slot || !candidate.course || !candidate.code || !candidate.section || !candidate.room || !candidate.staff) {
      throw new Error('Complete course, section, staff, room, day and time before adding the session.')
    }
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
    const id = draftAllocationMatch[2]
    const existing = draftAllocationRecords.find(item => String(item.id) === String(id))
    if (!existing) throw new Error('Draft allocation not found.')
    const next = { ...existing, ...body, id: existing.id }
    const collision = allocationCollision(next, id)
    if (collision) throw new Error('Hard conflict: the updated allocation overlaps another room, staff member or section.')
    draftAllocationRecords = draftAllocationRecords.map(item => String(item.id) === String(id) ? next : item)
    writeStoredArray(DRAFT_ALLOCATIONS_KEY, draftAllocationRecords)
    recordActivity(options, 'Draft session updated', `${next.code} allocation was updated.`, 'planning')
    return jsonClone(next)
  }
  if (draftAllocationMatch && method === 'DELETE') {
    const id = draftAllocationMatch[2]
    const existing = draftAllocationRecords.find(item => String(item.id) === String(id))
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
      published_by: body?.published_by || 'Scheduler',
      allocations: Array.isArray(body?.allocations) ? body.allocations : [],
    }
    writePublishedVersion(published)
    recordActivity(options, 'Timetable published', `${published.name} is now the latest official version.`, 'publication')
    return jsonClone(published)
  }

  if (path === '/timetable/published/me' && method === 'GET') {
    return jsonClone({ version: readPublishedVersion() })
  }

  throw new Error(`Mock API route not implemented: ${method} ${path}`)
}
