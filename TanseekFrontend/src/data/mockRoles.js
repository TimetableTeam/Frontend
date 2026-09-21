import { ROLE_DEFAULT_PERMISSIONS } from '../auth/permissions.js'

export const initialRoles = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full system administration, account and role management.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.super_admin,
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    description: 'Builds draft timetables, resolves conflicts and publishes versions.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.scheduler,
  },
  {
    id: 'admin',
    name: 'Department Admin',
    description: 'Reviews and edits scheduling data within the assigned department.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.admin,
  },
  {
    id: 'coordinator',
    name: 'Department Coordinator',
    description: 'Maintains course and section requirements for a department.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.coordinator,
  },
  {
    id: 'lecturer',
    name: 'Doctor / TA',
    description: 'Submits availability and views the published timetable.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.lecturer,
  },
  {
    id: 'lab_manager',
    name: 'Lab Manager',
    description: 'Maintains rooms/labs and verifies lab requirements.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.lab_manager,
  },
]
