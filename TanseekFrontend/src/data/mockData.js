export const roles = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'admin', label: 'Department Admin' },
  { id: 'coordinator', label: 'Department Coordinator' },
  { id: 'lecturer', label: 'Doctor / TA' },
  { id: 'lab_manager', label: 'Lab Manager' },
]

export const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday']
export const slots = [
  { id: 's1', start: '09:00', end: '11:00' },
  { id: 's2', start: '11:00', end: '13:00' },
  { id: 's3', start: '13:00', end: '15:00' },
  { id: 's4', start: '15:00', end: '17:00' },
]

export const allocations = [
  { id: 1, day: 'Saturday', slot: 's1', course: 'Machine Learning', code: 'DS301', section: 'Year 3 · A', level: 3, room: 'Lab A', staff: 'Dr. Nora Adel', status: 'ok', type: 'Lab' },
  { id: 2, day: 'Saturday', slot: 's3', course: 'Data Visualization', code: 'DS315', section: 'Year 3 · A', level: 3, room: 'Room 203', staff: 'Dr. Karim Sami', status: 'ok', type: 'Lecture' },
  { id: 3, day: 'Sunday', slot: 's2', course: 'Database Systems', code: 'CS220', section: 'Year 2 · B', level: 2, room: 'Lab B', staff: 'Eng. Mariam Fathy', status: 'conflict', type: 'Lab' },
  { id: 4, day: 'Monday', slot: 's1', course: 'Statistics II', code: 'ST204', section: 'Year 2 · A', level: 2, room: 'Room 105', staff: 'Dr. Omar Nabil', status: 'ok', type: 'Lecture' },
  { id: 5, day: 'Monday', slot: 's4', course: 'Neural Networks', code: 'AI330', section: 'Year 3 · B', level: 3, room: 'Lab C', staff: 'Dr. Salma Mostafa', status: 'ok', type: 'Lab' },
  { id: 6, day: 'Tuesday', slot: 's2', course: 'Database Lab', code: 'CS220-L', section: 'Year 2 · A', level: 2, room: 'Lab B', staff: 'Eng. Mariam Fathy', status: 'conflict', type: 'Lab' },
  { id: 7, day: 'Tuesday', slot: 's3', course: 'Algorithms', code: 'CS210', section: 'Year 2 · A', level: 2, room: 'Room 301', staff: 'Dr. Youssef Tarek', status: 'ok', type: 'Lecture' },
  { id: 8, day: 'Wednesday', slot: 's1', course: 'Computer Graphics', code: 'CS340', section: 'Year 3 · A', level: 3, room: 'Lab D', staff: 'Dr. Hana Emad', status: 'ok', type: 'Lab' },
]

export const rooms = [
  { id: 'r1', name: 'Lab A', building: 'A', capacity: 28, type: 'Computer Lab', equipment: ['28 PCs', 'Projector'], accessibility: true, status: 'available' },
  { id: 'r2', name: 'Lab B', building: 'A', capacity: 32, type: 'Computer Lab', equipment: ['32 PCs', 'Projector'], accessibility: true, status: 'conflict' },
  { id: 'r3', name: 'Room 203', building: 'B', capacity: 45, type: 'Classroom', equipment: ['Projector', 'Whiteboard'], accessibility: true, status: 'available' },
  { id: 'r4', name: 'Room 105', building: 'B', capacity: 36, type: 'Classroom', equipment: ['Projector'], accessibility: false, status: 'available' },
  { id: 'r5', name: 'Lab C', building: 'C', capacity: 36, type: 'Computer Lab', equipment: ['36 PCs', 'GPU workstations'], accessibility: true, status: 'available' },
  { id: 'r6', name: 'Lab D', building: 'C', capacity: 24, type: 'Graphics Lab', equipment: ['24 PCs', 'Graphics tablets'], accessibility: true, status: 'pending' },
]

export const conflicts = [
  {
    id: 'c1',
    allocationId: 6,
    severity: 'hard',
    title: 'Room double-booking',
    reason: 'Two classes use Lab B on Tuesday from 11:00 to 13:00.',
    allocation: 'Database Lab · CS220-L · Year 2 A',
    scope: 'Lab B · Tuesday · 11:00–13:00',
    alternatives: [
      { id: 'a1', room: 'Lab A', capacity: 28, score: 96, equipment: '28 PCs + projector', tradeoff: 'Exact equipment match · capacity fits 26 students', day: 'Tuesday', time: '11:00–13:00' },
      { id: 'a2', room: 'Lab C', capacity: 36, score: 91, equipment: '36 PCs + GPU workstations', tradeoff: 'More capacity than needed · same time slot', day: 'Tuesday', time: '11:00–13:00' },
      { id: 'a3', room: 'Lab A', capacity: 28, score: 86, equipment: '28 PCs + projector', tradeoff: 'Exact room fit · moves session later by 2 hours', day: 'Tuesday', time: '13:00–15:00' },
    ],
  },
  {
    id: 'c2',
    allocationId: 3,
    severity: 'hard',
    title: 'Lecturer overlap',
    reason: 'Eng. Mariam Fathy is assigned to two sessions at the same time.',
    allocation: 'Database Systems · CS220 · Year 2 B',
    scope: 'Sunday · 11:00–13:00',
    alternatives: [
      { id: 'a4', room: 'Lab B', capacity: 32, score: 93, equipment: '32 PCs + projector', tradeoff: 'Keeps room · moves to 13:00–15:00', day: 'Sunday', time: '13:00–15:00' },
      { id: 'a5', room: 'Lab C', capacity: 36, score: 88, equipment: '36 PCs + GPU workstations', tradeoff: 'Different building · keeps 11:00 start', day: 'Monday', time: '11:00–13:00' },
      { id: 'a6', room: 'Lab A', capacity: 28, score: 84, equipment: '28 PCs + projector', tradeoff: 'Tighter capacity · keeps lecturer preference window', day: 'Wednesday', time: '11:00–13:00' },
    ],
  },
  {
    id: 'c3',
    allocationId: 4,
    severity: 'hard',
    title: 'Capacity mismatch',
    reason: 'Room 105 has 36 seats but the assigned student group has 42 students.',
    allocation: 'Statistics II · ST204 · Year 2 A',
    scope: 'Monday · 09:00–11:00',
    alternatives: [
      { id: 'a7', room: 'Room 203', capacity: 45, score: 98, equipment: 'Projector + whiteboard', tradeoff: 'Best capacity fit · same building zone', day: 'Monday', time: '09:00–11:00' },
      { id: 'a8', room: 'Auditorium 1', capacity: 90, score: 74, equipment: 'Projector + sound', tradeoff: 'Large capacity waste · same time slot', day: 'Monday', time: '09:00–11:00' },
      { id: 'a9', room: 'Room 203', capacity: 45, score: 71, equipment: 'Projector + whiteboard', tradeoff: 'Moves to Tuesday afternoon', day: 'Tuesday', time: '15:00–17:00' },
    ],
  },
]

export const masterData = {
  terms: [
    { id: 't1', name: 'Fall 2026', start: '2026-09-05', end: '2027-01-20', status: 'Active' },
    { id: 't2', name: 'Spring 2027', start: '2027-02-06', end: '2027-06-16', status: 'Draft' },
  ],
  courses: [
    { id: 'DS301', name: 'Machine Learning', department: 'Data Science', hours: 3 },
    { id: 'CS220', name: 'Database Systems', department: 'Computer Science', hours: 3 },
    { id: 'ST204', name: 'Statistics II', department: 'Data Science', hours: 2 },
  ],
  sections: [
    { id: 'SEC-201', course: 'CS220', group: 'Year 2 · A', size: 26, duration: '2h', need: 'Computer Lab' },
    { id: 'SEC-202', course: 'ST204', group: 'Year 2 · A', size: 42, duration: '2h', need: 'Classroom' },
    { id: 'SEC-301', course: 'DS301', group: 'Year 3 · A', size: 24, duration: '2h', need: 'Computer Lab' },
  ],
}
