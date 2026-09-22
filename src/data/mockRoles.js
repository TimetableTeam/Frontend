import { ROLE_DEFAULT_PERMISSIONS } from '../auth/permissions.js'

export const initialRoles = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full university-wide system administration and audit access.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.super_admin,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Reviews and adjusts the draft inside the allowed department scope, then publishes the final version.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.admin,
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    description: 'Generates the draft, resolves conflicts and submits the schedule for Admin review. Cannot publish.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.scheduler,
  },
  {
    id: 'registration_officer',
    name: 'Registration Officer',
    description: 'Maintains student records and course registrations for the active term.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.registration_officer,
  },
  {
    id: 'department_coordinator',
    name: 'Department Coordinator',
    description: 'Owns department courses, Lecture/Practical requirements, sections, instructor links and student section assignments.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.department_coordinator,
  },
  {
    id: 'lab_manager',
    name: 'Lab Manager',
    description: 'Maintains rooms/labs, capacity, equipment, closures and requirement compatibility checks.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.lab_manager,
  },
  {
    id: 'lecturer',
    name: 'Lecturer',
    description: 'Submits and confirms availability, then views the published teaching timetable.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.lecturer,
  },
  {
    id: 'ta',
    name: 'TA',
    description: 'Submits and confirms availability, and views assigned practical sections and the published timetable.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.ta,
  },
  {
    id: 'student',
    name: 'Student',
    description: 'Read-only access to registered courses, assigned Lecture/Practical sections and personal published timetable.',
    built_in: true,
    permissions: ROLE_DEFAULT_PERMISSIONS.student,
  },
]
