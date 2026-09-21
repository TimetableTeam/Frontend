export const ROLE_DEFAULT_PERMISSIONS = {
  super_admin: [
    'overview.view',
    'accounts.manage',
    'roles.manage',
  ],
  scheduler: [
    'overview.view',
    'schedule.view',
    'schedule.manage',
    'requirements.manage',
    'labs.check',
    'rooms.manage',
    'conflicts.manage',
    'master.manage',
    'publish.manage',
  ],
  admin: [
    'overview.view',
    'schedule.view',
    'schedule.manage',
    'requirements.manage',
    'rooms.manage',
    'conflicts.manage',
  ],
  coordinator: [
    'overview.view',
    'schedule.view',
    'requirements.manage',
    'rooms.manage',
    'conflicts.manage',
  ],
  lecturer: [
    'overview.view',
    'schedule.view',
    'availability.manage_own',
  ],
  lab_manager: [
    'overview.view',
    'rooms.manage',
    'labs.check',
  ],
}

export const PAGE_PERMISSION_RULES = {
  overview: ['overview.view'],
  timetable: ['schedule.view'],
  requirements: ['requirements.manage'],
  availability: ['availability.manage_own'],
  labchecks: ['labs.check'],
  rooms: ['rooms.manage'],
  conflicts: ['conflicts.manage'],
  master: ['master.manage'],
  system: ['accounts.manage', 'roles.manage'],
}

export const PAGE_ORDER = [
  'overview',
  'timetable',
  'requirements',
  'availability',
  'labchecks',
  'rooms',
  'conflicts',
  'master',
  'system',
]

export const PERMISSION_OPTIONS = [
  { id: 'overview.view', label: 'View overview' },
  { id: 'schedule.view', label: 'View timetable' },
  { id: 'schedule.manage', label: 'Manage draft timetable' },
  { id: 'requirements.manage', label: 'Manage requirements' },
  { id: 'availability.manage_own', label: 'Manage own availability' },
  { id: 'labs.check', label: 'Review lab checks' },
  { id: 'rooms.manage', label: 'Manage rooms & labs' },
  { id: 'conflicts.manage', label: 'Resolve conflicts' },
  { id: 'master.manage', label: 'Manage master data' },
  { id: 'accounts.manage', label: 'Manage accounts' },
  { id: 'roles.manage', label: 'Manage roles' },
]

export function getUserPermissions(user) {
  if (Array.isArray(user?.permissions) && user.permissions.length > 0) return user.permissions
  return ROLE_DEFAULT_PERMISSIONS[user?.role] || []
}

export function hasPermission(user, permission) {
  return getUserPermissions(user).includes(permission)
}

export function canAccessPage(user, page) {
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
    super_admin: 'system',
    coordinator: 'requirements',
    lecturer: 'availability',
    lab_manager: 'labchecks',
  }[user?.role]

  if (preferred && canAccessPage(user, preferred)) return preferred
  return getAllowedPages(user)[0] || 'overview'
}
