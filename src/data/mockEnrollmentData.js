export const initialStudents = [
  {
    id: 1001,
    university_id: '202400123',
    name: 'Omar Ali',
    email: 'student@tanseek.test',
    department_id: 1,
    department_name: 'Computer Science',
    current_level: 3,
    status: 'ACTIVE',
  },
]

// Registration Officer owns course-level registration only.
export const initialCourseEnrollments = [
  {
    id: 9001,
    student_id: 1001,
    term_id: 1,
    course_code: 'DS301',
    course_name: 'Machine Learning',
    status: 'ACTIVE',
    registration_type: 'NORMAL',
  },
  {
    id: 9002,
    student_id: 1001,
    term_id: 1,
    course_code: 'CS340',
    course_name: 'Computer Graphics',
    status: 'ACTIVE',
    registration_type: 'NORMAL',
  },
  {
    id: 9003,
    student_id: 1001,
    term_id: 1,
    course_code: 'CS220',
    course_name: 'Database Systems',
    status: 'ACTIVE',
    registration_type: 'CARRIED',
  },
]

// Department Coordinator owns the final student → Lecture/Practical section mapping.
export const initialSectionEnrollments = [
  { id: 9101, student_id: 1001, term_id: 1, course_code: 'DS301', section_code: 'DS301-L1', component: 'LECTURE', status: 'ACTIVE' },
  { id: 9102, student_id: 1001, term_id: 1, course_code: 'DS301', section_code: 'DS301-P1', component: 'PRACTICAL', status: 'ACTIVE' },
  { id: 9103, student_id: 1001, term_id: 1, course_code: 'CS340', section_code: 'CS340-L1', component: 'LECTURE', status: 'ACTIVE' },
  { id: 9104, student_id: 1001, term_id: 1, course_code: 'CS340', section_code: 'CS340-P1', component: 'PRACTICAL', status: 'ACTIVE' },
  { id: 9105, student_id: 1001, term_id: 1, course_code: 'CS220', section_code: 'CS220-L1', component: 'LECTURE', status: 'ACTIVE' },
  { id: 9106, student_id: 1001, term_id: 1, course_code: 'CS220', section_code: 'CS220-P1', component: 'PRACTICAL', status: 'ACTIVE' },
]
