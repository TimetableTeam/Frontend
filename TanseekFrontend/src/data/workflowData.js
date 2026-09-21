import { days, slots, rooms } from './mockData.js'

export const planningCatalogs = {
  term: { id: 1, name: 'Fall 2026' },
  courses: [
    { id: 1, code: 'CS220', name: 'Database Systems', department: 'Computer Science' },
    { id: 2, code: 'DS301', name: 'Machine Learning', department: 'Data Science' },
    { id: 3, code: 'AI330', name: 'Neural Networks', department: 'AI' },
    { id: 4, code: 'CS340', name: 'Computer Graphics', department: 'Computer Science' },
  ],
  sections: [
    { id: 1, code: 'SEC-201', course_id: 1, name: 'Database Systems · Year 2', size: 26 },
    { id: 2, code: 'SEC-301', course_id: 2, name: 'Machine Learning · Year 3', size: 24 },
    { id: 3, code: 'SEC-330', course_id: 3, name: 'Neural Networks · Year 3', size: 32 },
    { id: 4, code: 'SEC-340', course_id: 4, name: 'Computer Graphics · Year 3', size: 22 },
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
  sessionTypes: ['Lecture', 'Tutorial', 'Lab'],
  days,
  slots,
}

export const initialRequirements = [
  {
    id: 101,
    course_id: 1,
    section_id: 1,
    student_group_ids: [11],
    session_type: 'Lab',
    duration_minutes: 120,
    weekly_count: 1,
    required_room_type: 'Computer Lab',
    required_equipment: ['pcs', 'projector'],
    preferred_windows: [{ day: 'Tuesday', slot_id: 's2' }, { day: 'Sunday', slot_id: 's2' }],
    notes: 'Use one PC per student where possible.',
    state: 'READY',
    coordinator_name: 'Mona Hassan',
  },
  {
    id: 102,
    course_id: 3,
    section_id: 3,
    student_group_ids: [22],
    session_type: 'Lab',
    duration_minutes: 120,
    weekly_count: 1,
    required_room_type: 'Computer Lab',
    required_equipment: ['pcs', 'gpu'],
    preferred_windows: [{ day: 'Monday', slot_id: 's4' }],
    notes: 'GPU machines are required for the practical session.',
    state: 'READY',
    coordinator_name: 'Mona Hassan',
  },
  {
    id: 103,
    course_id: 4,
    section_id: 4,
    student_group_ids: [21],
    session_type: 'Lab',
    duration_minutes: 120,
    weekly_count: 1,
    required_room_type: 'Graphics Lab',
    required_equipment: ['pcs', 'tablets'],
    preferred_windows: [],
    notes: '',
    state: 'INCOMPLETE',
    coordinator_name: 'Mona Hassan',
  },
]

export const initialAvailability = {
  id: 501,
  term_id: 1,
  instructor_id: 4,
  instructor_name: 'Dr. Nora Adel',
  role: 'LECTURER',
  state: 'DRAFT',
  confirmed_at: null,
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
  { requirement_id: 101, room_id: 'r1', status: 'CONFIRMED', checked_by: 'Lab Manager', checked_at: '2026-09-19T13:20:00+03:00', notes: 'PC count and projector checked.' },
]

export const labRooms = rooms.filter(room => room.type.includes('Lab')).map(room => ({
  ...room,
  equipmentCodes: room.id === 'r1' ? ['pcs', 'projector'] : room.id === 'r2' ? ['pcs', 'projector'] : room.id === 'r5' ? ['pcs', 'gpu'] : ['pcs', 'tablets'],
  closure: room.id === 'r6' ? 'Wednesday 09:00–11:00 maintenance' : null,
}))
