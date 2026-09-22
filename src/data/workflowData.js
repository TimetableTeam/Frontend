import { days, slots, rooms } from './mockData.js'

export const planningCatalogs = {
  term: { id: 1, name: 'Fall 2026' },
  courses: [
    { id: 1, code: 'CS220', name: 'Database Systems', department: 'Computer Science', department_id: 1 },
    { id: 2, code: 'DS301', name: 'Machine Learning', department: 'Data Science', department_id: 2 },
    { id: 3, code: 'AI330', name: 'Neural Networks', department: 'Artificial Intelligence', department_id: 3 },
    { id: 4, code: 'CS340', name: 'Computer Graphics', department: 'Computer Science', department_id: 1 },
  ],
  sections: [
    { id: 1, code: 'CS220-L1', course_id: 1, component: 'LECTURE', name: 'Database Systems · Lecture 1', size: 48 },
    { id: 2, code: 'CS220-P1', course_id: 1, component: 'PRACTICAL', name: 'Database Systems · Practical 1', size: 24 },
    { id: 3, code: 'CS220-P2', course_id: 1, component: 'PRACTICAL', name: 'Database Systems · Practical 2', size: 24 },
    { id: 4, code: 'DS301-L1', course_id: 2, component: 'LECTURE', name: 'Machine Learning · Lecture 1', size: 48 },
    { id: 5, code: 'DS301-P1', course_id: 2, component: 'PRACTICAL', name: 'Machine Learning · Practical 1', size: 24 },
    { id: 6, code: 'DS301-P2', course_id: 2, component: 'PRACTICAL', name: 'Machine Learning · Practical 2', size: 24 },
    { id: 7, code: 'AI330-L1', course_id: 3, component: 'LECTURE', name: 'Neural Networks · Lecture 1', size: 48 },
    { id: 8, code: 'AI330-P1', course_id: 3, component: 'PRACTICAL', name: 'Neural Networks · Practical 1', size: 24 },
    { id: 9, code: 'CS340-L1', course_id: 4, component: 'LECTURE', name: 'Computer Graphics · Lecture 1', size: 44 },
    { id: 10, code: 'CS340-P1', course_id: 4, component: 'PRACTICAL', name: 'Computer Graphics · Practical 1', size: 22 },
    { id: 11, code: 'CS340-P2', course_id: 4, component: 'PRACTICAL', name: 'Computer Graphics · Practical 2', size: 22 },
  ],
  studentGroups: [
    { id: 11, name: 'Year 2 · A', level: 2, size: 26 },
    { id: 12, name: 'Year 2 · B', level: 2, size: 24 },
    { id: 21, name: 'Year 3 · A', level: 3, size: 24 },
    { id: 22, name: 'Year 3 · B', level: 3, size: 32 },
    { id: 31, name: 'Year 1 · A', level: 1, size: 30 },
    { id: 41, name: 'Year 4 · A', level: 4, size: 20 },
  ],
  equipment: [
    { id: 'pcs', label: 'Student PCs' },
    { id: 'projector', label: 'Projector' },
    { id: 'gpu', label: 'GPU workstations' },
    { id: 'tablets', label: 'Graphics tablets' },
    { id: 'whiteboard', label: 'Whiteboard' },
  ],
  roomTypes: ['Classroom', 'Computer Lab', 'Graphics Lab'],
  sessionTypes: ['Lecture', 'Practical'],
  days,
  slots,
}

export const initialRequirements = [
  { id: 101, course_id: 1, session_type: 'Lecture', duration_minutes: 120, weekly_count: 1, expected_students: 48, required_room_type: 'Classroom', required_equipment: ['projector'], preferred_windows: [], notes: 'Lecture requirement for Database Systems.', state: 'READY', coordinator_name: 'Mona Hassan' },
  { id: 102, course_id: 1, session_type: 'Practical', duration_minutes: 120, weekly_count: 1, expected_students: 24, required_room_type: 'Computer Lab', required_equipment: ['pcs', 'projector'], preferred_windows: [{ day: 'Tuesday', slot_id: 's2' }], notes: 'One PC per student where possible.', state: 'READY', coordinator_name: 'Mona Hassan' },
  { id: 103, course_id: 2, session_type: 'Lecture', duration_minutes: 120, weekly_count: 1, expected_students: 48, required_room_type: 'Classroom', required_equipment: ['projector'], preferred_windows: [], notes: '', state: 'READY', coordinator_name: 'Mona Hassan' },
  { id: 104, course_id: 2, session_type: 'Practical', duration_minutes: 120, weekly_count: 1, expected_students: 24, required_room_type: 'Computer Lab', required_equipment: ['pcs', 'gpu'], preferred_windows: [{ day: 'Monday', slot_id: 's4' }], notes: 'GPU machines are required for the practical session.', state: 'READY', coordinator_name: 'Mona Hassan' },
  { id: 105, course_id: 4, session_type: 'Practical', duration_minutes: 120, weekly_count: 1, expected_students: 22, required_room_type: 'Graphics Lab', required_equipment: ['pcs', 'tablets'], preferred_windows: [], notes: '', state: 'READY', coordinator_name: 'Mona Hassan' },
]

export const initialAvailability = {
  id: 501,
  term_id: 1,
  instructor_id: 6,
  instructor_name: 'Dr. Nora Adel',
  role: 'LECTURER',
  state: 'CONFIRMED',
  confirmed_at: '2026-09-20T08:30:00+03:00',
  slots: [
    { day: 'Saturday', slot_id: 's1', kind: 'PREFERRED' },
    { day: 'Saturday', slot_id: 's2', kind: 'AVAILABLE' },
    { day: 'Sunday', slot_id: 's2', kind: 'AVAILABLE' },
    { day: 'Monday', slot_id: 's1', kind: 'PREFERRED' },
    { day: 'Tuesday', slot_id: 's3', kind: 'AVAILABLE' },
    { day: 'Wednesday', slot_id: 's1', kind: 'AVAILABLE' },
  ],
}

export const initialLabDecisions = [
  { requirement_id: 102, room_id: 'r1', status: 'CONFIRMED', checked_by: 'Ahmed Samir', checked_at: '2026-09-19T13:20:00+03:00', notes: 'PC count and projector checked.' },
  { requirement_id: 104, room_id: 'r5', status: 'CONFIRMED', checked_by: 'Ahmed Samir', checked_at: '2026-09-19T13:25:00+03:00', notes: 'GPU workstations checked.' },
  { requirement_id: 105, room_id: 'r6', status: 'CONFIRMED', checked_by: 'Ahmed Samir', checked_at: '2026-09-19T13:30:00+03:00', notes: 'Graphics tablets checked; maintenance window remains enforced.' },
]

export const labRooms = rooms.filter(room => room.type.includes('Lab')).map(room => ({
  ...room,
  equipmentCodes: room.id === 'r1' ? ['pcs', 'projector'] : room.id === 'r2' ? ['pcs', 'projector'] : room.id === 'r5' ? ['pcs', 'gpu'] : ['pcs', 'tablets'],
  closure: room.id === 'r6' ? 'Wednesday 09:00–11:00 maintenance' : null,
}))

export const initialInstructorAssignments = [
  { id: 1, section_id: 1, staff_id: 6, staff_name: 'Dr. Nora Adel', staff_role: 'LECTURER' },
  { id: 2, section_id: 2, staff_id: 7, staff_name: 'Eng. Mariam Fathy', staff_role: 'TA' },
  { id: 3, section_id: 3, staff_id: 7, staff_name: 'Eng. Mariam Fathy', staff_role: 'TA' },
  { id: 4, section_id: 4, staff_id: 6, staff_name: 'Dr. Nora Adel', staff_role: 'LECTURER' },
  { id: 5, section_id: 5, staff_id: 7, staff_name: 'Eng. Mariam Fathy', staff_role: 'TA' },
  { id: 6, section_id: 6, staff_id: 7, staff_name: 'Eng. Mariam Fathy', staff_role: 'TA' },
  { id: 7, section_id: 7, staff_id: 6, staff_name: 'Dr. Nora Adel', staff_role: 'LECTURER' },
  { id: 8, section_id: 8, staff_id: 7, staff_name: 'Eng. Mariam Fathy', staff_role: 'TA' },
  { id: 9, section_id: 9, staff_id: 6, staff_name: 'Dr. Nora Adel', staff_role: 'LECTURER' },
  { id: 10, section_id: 10, staff_id: 7, staff_name: 'Eng. Mariam Fathy', staff_role: 'TA' },
  { id: 11, section_id: 11, staff_id: 7, staff_name: 'Eng. Mariam Fathy', staff_role: 'TA' },
]
