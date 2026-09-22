export const roles = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'admin', label: 'Admin' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'registration_officer', label: 'Registration Officer' },
  { id: 'department_coordinator', label: 'Department Coordinator' },
  { id: 'lab_manager', label: 'Lab Manager' },
  { id: 'lecturer', label: 'Lecturer' },
  { id: 'ta', label: 'TA' },
  { id: 'student', label: 'Student' },
]

export const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday']
export const slots = [
  { id: 's1', start: '09:00', end: '11:00' },
  { id: 's2', start: '11:00', end: '13:00' },
  { id: 's3', start: '13:00', end: '15:00' },
  { id: 's4', start: '15:00', end: '17:00' },
]

export const allocations = [
  { id: 1, day: 'Saturday', slot: 's1', course: 'Machine Learning', code: 'DS301', section: 'DS301-L1', group: 'Year 3 · A', level: 3, department_id: 2, room: 'Room 203', staff: 'Dr. Nora Adel', status: 'ok', type: 'Lecture' },
  { id: 2, day: 'Saturday', slot: 's2', course: 'Machine Learning', code: 'DS301', section: 'DS301-P1', group: 'Year 3 · A', level: 3, department_id: 2, room: 'Lab A', staff: 'Eng. Mariam Fathy', status: 'ok', type: 'Practical' },
  { id: 3, day: 'Sunday', slot: 's2', course: 'Database Systems', code: 'CS220', section: 'CS220-L1', group: 'Year 2 · B', level: 2, department_id: 1, room: 'Room 105', staff: 'Dr. Nora Adel', status: 'conflict', type: 'Lecture' },
  { id: 4, day: 'Tuesday', slot: 's2', course: 'Database Systems', code: 'CS220', section: 'CS220-P1', group: 'Year 2 · B', level: 2, department_id: 1, room: 'Lab B', staff: 'Eng. Mariam Fathy', status: 'conflict', type: 'Practical' },
  { id: 5, day: 'Monday', slot: 's1', course: 'Computer Graphics', code: 'CS340', section: 'CS340-L1', group: 'Year 3 · A', level: 3, department_id: 1, room: 'Room 105', staff: 'Dr. Nora Adel', status: 'conflict', type: 'Lecture' },
  { id: 6, day: 'Wednesday', slot: 's1', course: 'Computer Graphics', code: 'CS340', section: 'CS340-P1', group: 'Year 3 · A', level: 3, department_id: 1, room: 'Lab D', staff: 'Eng. Mariam Fathy', status: 'ok', type: 'Practical' },
  { id: 7, day: 'Monday', slot: 's4', course: 'Neural Networks', code: 'AI330', section: 'AI330-P1', group: 'Year 3 · B', level: 3, department_id: 3, room: 'Lab C', staff: 'Eng. Mariam Fathy', status: 'ok', type: 'Practical' },
  { id: 8, day: 'Tuesday', slot: 's3', course: 'Neural Networks', code: 'AI330', section: 'AI330-L1', group: 'Year 3 · B', level: 3, department_id: 3, room: 'Room 203', staff: 'Dr. Nora Adel', status: 'ok', type: 'Lecture' },
]

export const rooms = [
  { id: 'r1', name: 'Lab A', building: 'A', capacity: 28, type: 'Computer Lab', equipment: ['28 PCs', 'Projector'], accessibility: true, status: 'available' },
  { id: 'r2', name: 'Lab B', building: 'A', capacity: 32, type: 'Computer Lab', equipment: ['32 PCs', 'Projector'], accessibility: true, status: 'conflict' },
  { id: 'r3', name: 'Room 203', building: 'B', capacity: 45, type: 'Classroom', equipment: ['Projector', 'Whiteboard'], accessibility: true, status: 'available' },
  { id: 'r4', name: 'Room 105', building: 'B', capacity: 36, type: 'Classroom', equipment: ['Projector'], accessibility: false, status: 'available' },
  { id: 'r5', name: 'Lab C', building: 'C', capacity: 36, type: 'Computer Lab', equipment: ['36 PCs', 'GPU workstations'], accessibility: true, status: 'available' },
  { id: 'r6', name: 'Lab D', building: 'C', capacity: 24, type: 'Graphics Lab', equipment: ['24 PCs', 'Graphics tablets'], accessibility: true, status: 'pending' },
  { id: 'r7', name: 'Auditorium 1', building: 'Main', capacity: 90, type: 'Classroom', equipment: ['Projector', 'Sound system', 'Whiteboard'], accessibility: true, status: 'available' },
]

export const conflicts = [
  {
    id: 'c1', allocationId: 4, severity: 'hard', title: 'Room double-booking',
    reason: 'Lab B is already occupied on Tuesday from 11:00 to 13:00.',
    allocation: 'Database Systems · CS220-P1', scope: 'Lab B · Tuesday · 11:00–13:00',
    alternatives: [
      { id: 'a1', room: 'Lab A', capacity: 28, score: 96, equipment: '28 PCs + projector', tradeoff: 'Exact equipment match · same time slot', day: 'Tuesday', time: '11:00–13:00' },
      { id: 'a2', room: 'Lab C', capacity: 36, score: 91, equipment: '36 PCs + GPU workstations', tradeoff: 'More capacity than needed · same time slot', day: 'Tuesday', time: '11:00–13:00' },
      { id: 'a3', room: 'Lab A', capacity: 28, score: 86, equipment: '28 PCs + projector', tradeoff: 'Moves practical by 2 hours', day: 'Tuesday', time: '13:00–15:00' },
    ],
  },
  {
    id: 'c2', allocationId: 3, severity: 'hard', title: 'Lecturer overlap',
    reason: 'Dr. Nora Adel is assigned to overlapping teaching activity.',
    allocation: 'Database Systems · CS220-L1', scope: 'Sunday · 11:00–13:00',
    alternatives: [
      { id: 'a4', room: 'Auditorium 1', capacity: 90, score: 93, equipment: 'Projector + sound + whiteboard', tradeoff: 'Moves to an available Saturday slot with extra capacity', day: 'Saturday', time: '11:00–13:00' },
      { id: 'a5', room: 'Auditorium 1', capacity: 90, score: 89, equipment: 'Projector + sound + whiteboard', tradeoff: "Uses the lecturer's confirmed Wednesday availability", day: 'Wednesday', time: '09:00–11:00' },
    ],
  },
  {
    id: 'c3', allocationId: 5, severity: 'hard', title: 'Capacity mismatch',
    reason: 'Room 105 has 36 seats but CS340-L1 needs 44 seats.',
    allocation: 'Computer Graphics · CS340-L1', scope: 'Monday · 09:00–11:00',
    alternatives: [
      { id: 'a7', room: 'Room 203', capacity: 45, score: 98, equipment: 'Projector + whiteboard', tradeoff: 'Best capacity fit · same time slot', day: 'Monday', time: '09:00–11:00' },
      { id: 'a8', room: 'Auditorium 1', capacity: 90, score: 74, equipment: 'Projector + sound', tradeoff: 'Large capacity waste · same time slot', day: 'Monday', time: '09:00–11:00' },
      { id: 'a9', room: 'Room 203', capacity: 45, score: 71, equipment: 'Projector + whiteboard', tradeoff: 'Moves to Tuesday afternoon', day: 'Tuesday', time: '15:00–17:00' },
    ],
  },
]

export const masterData = {
  terms: [
    { id: 't1', name: 'Fall 2026', start: '2026-09-05', end: '2027-01-20', availability_deadline: '2026-08-31', holidays: ['2026-10-06'], status: 'Active' },
    { id: 't2', name: 'Spring 2027', start: '2027-02-06', end: '2027-06-16', availability_deadline: '2027-01-31', holidays: [], status: 'Draft' },
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
