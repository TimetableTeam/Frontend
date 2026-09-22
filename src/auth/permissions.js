export const ROLE_DEFAULT_PERMISSIONS = {
  super_admin: [
    'overview.view',
    'terms.manage',
    'departments.manage',
    'courses.manage',
    'sections.manage',
    'requirements.manage',
    'instructors.assign',
    'section_assignments.manage',
    'registrations.manage',
    'availability.view',
    'labs.check',
    'rooms.view',
    'rooms.manage',
    'schedule.view',
    'schedule.generate',
    'schedule.manage',
    'schedule.submit_review',
    'schedule.review',
    'conflicts.view',
    'conflicts.manage',
    'publish.manage',
    'accounts.manage',
    'roles.manage',
    'audit.view',
  ],
  admin: [
    'overview.view',
    'schedule.view',
    'schedule.manage',
    'schedule.review',
    'rooms.view',
    'conflicts.view',
    'publish.manage',
  ],
  scheduler: [
    'overview.view',
    'schedule.view',
    'schedule.generate',
    'schedule.manage',
    'schedule.submit_review',
    'rooms.view',
    'conflicts.manage',
  ],
  registration_officer: [
    'overview.view',
    'registrations.manage',
  ],
  department_coordinator: [
    'overview.view',
    'courses.manage',
    'sections.manage',
    'requirements.manage',
    'instructors.assign',
    'section_assignments.manage',
    'schedule.view',
  ],
  lab_manager: [
    'overview.view',
    'rooms.manage',
    'labs.check',
  ],
  lecturer: [
    'overview.view',
    'schedule.view',
    'availability.manage_own',
  ],
  ta: [
    'overview.view',
    'schedule.view',
    'availability.manage_own',
    'practical_sections.view_own',
  ],
  student: [
    'schedule.view',
  ],
}

export const PAGE_PERMISSION_RULES = {
  overview: ['overview.view'],
  timetable: ['schedule.view'],
  requirements: ['requirements.manage'],
  availability: ['availability.manage_own'],
  labchecks: ['labs.check'],
  rooms: ['rooms.view', 'rooms.manage'],
  conflicts: ['conflicts.view', 'conflicts.manage'],
  terms: ['terms.manage'],
  departments: ['departments.manage'],
  courses: ['courses.manage'],
  sections: ['sections.manage'],
  registrations: ['registrations.manage'],
  instructor_assignments: ['instructors.assign'],
  section_assignments: ['section_assignments.manage'],
  audit: ['audit.view'],

  users_all: ['accounts.manage'],
  users_super_admin: ['accounts.manage'],
  users_admin: ['accounts.manage'],
  users_scheduler: ['accounts.manage'],
  users_registration_officer: ['accounts.manage'],
  users_coordinator: ['accounts.manage'],
  users_lab_manager: ['accounts.manage'],
  users_lecturer: ['accounts.manage'],
  users_ta: ['accounts.manage'],
  users_student: ['accounts.manage'],
  roles: ['roles.manage'],

  // Compatibility with older bookmarks/components.
  enrollments: ['registrations.manage'],
  master: ['terms.manage', 'courses.manage', 'sections.manage'],
  system: ['accounts.manage', 'roles.manage'],
}

export const PAGE_ORDER = [
  'overview',
  'terms',
  'departments',
  'courses',
  'sections',
  'requirements',
  'instructor_assignments',
  'section_assignments',
  'availability',
  'labchecks',
  'rooms',
  'registrations',
  'timetable',
  'conflicts',
  'audit',
  'users_all',
  'users_super_admin',
  'users_admin',
  'users_scheduler',
  'users_registration_officer',
  'users_coordinator',
  'users_lab_manager',
  'users_lecturer',
  'users_ta',
  'users_student',
  'roles',
]

export const PERMISSION_OPTIONS = [
  { id: 'overview.view', label: 'View overview' },
  { id: 'terms.manage', label: 'Manage academic terms' },
  { id: 'departments.manage', label: 'Manage departments' },
  { id: 'courses.manage', label: 'Manage courses' },
  { id: 'sections.manage', label: 'Manage sections' },
  { id: 'requirements.manage', label: 'Manage requirements' },
  { id: 'instructors.assign', label: 'Assign instructors to sections' },
  { id: 'registrations.manage', label: 'Manage course registrations' },
  { id: 'section_assignments.manage', label: 'Manage student section assignments' },
  { id: 'availability.manage_own', label: 'Manage own availability' },
  { id: 'availability.view', label: 'View staff availability' },
  { id: 'practical_sections.view_own', label: 'View own practical sections' },
  { id: 'labs.check', label: 'Review lab checks' },
  { id: 'rooms.view', label: 'View rooms & labs' },
  { id: 'rooms.manage', label: 'Manage rooms & labs' },
  { id: 'schedule.view', label: 'View timetable' },
  { id: 'schedule.generate', label: 'Generate draft timetable' },
  { id: 'schedule.manage', label: 'Edit draft timetable' },
  { id: 'schedule.submit_review', label: 'Submit draft for review' },
  { id: 'schedule.review', label: 'Review draft timetable' },
  { id: 'conflicts.view', label: 'View conflicts' },
  { id: 'conflicts.manage', label: 'Resolve conflicts' },
  { id: 'publish.manage', label: 'Publish timetable versions' },
  { id: 'accounts.manage', label: 'Manage accounts' },
  { id: 'roles.manage', label: 'Manage roles' },
  { id: 'audit.view', label: 'View audit log' },
]

export function getUserPermissions(user) {
  if (Array.isArray(user?.permissions) && user.permissions.length > 0) return user.permissions
  return ROLE_DEFAULT_PERMISSIONS[user?.role] || []
}

export function hasPermission(user, permission) {
  return getUserPermissions(user).includes(permission)
}

export function canAccessPage(user, page) {
  if (page === 'profile') return Boolean(user?.id !== undefined && user?.id !== null)
  const required = PAGE_PERMISSION_RULES[page] || []
  if (required.length === 0) return false
  const permissions = getUserPermissions(user)
  return required.some(permission => permissions.includes(permission))
}

export function getAllowedPages(user) {
  return PAGE_ORDER.filter(page => canAccessPage(user, page))
}

export function getDefaultPage(user) {
  const preferred = {
    super_admin: 'overview',
    admin: 'timetable',
    scheduler: 'timetable',
    registration_officer: 'registrations',
    department_coordinator: 'courses',
    lab_manager: 'labchecks',
    lecturer: 'availability',
    ta: 'availability',
    student: 'timetable',
  }[user?.role]

  if (preferred && canAccessPage(user, preferred)) return preferred
  return getAllowedPages(user)[0] || 'overview'
}
