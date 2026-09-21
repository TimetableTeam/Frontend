export const MOCK_PASSWORD = 'demo1234'

export const mockAccounts = [
  {
    id: 0,
    name: 'Tanseek Super Admin',
    email: 'superadmin@tanseek.test',
    password: MOCK_PASSWORD,
    role: 'super_admin',
    role_label: 'Super Admin',
    department_id: null,
    department_name: 'University-wide access',
  },
  {
    id: 1,
    name: 'Youssef Adel',
    email: 'scheduler@tanseek.test',
    password: MOCK_PASSWORD,
    role: 'scheduler',
    role_label: 'Scheduler',
    department_id: null,
    department_name: 'University Scheduling Office',
  },
  {
    id: 2,
    name: 'Nour Hassan',
    email: 'admin@tanseek.test',
    password: MOCK_PASSWORD,
    role: 'admin',
    role_label: 'Department Admin',
    department_id: 1,
    department_name: 'Computer Science',
  },
  {
    id: 3,
    name: 'Mona Hassan',
    email: 'coordinator@tanseek.test',
    password: MOCK_PASSWORD,
    role: 'coordinator',
    role_label: 'Department Coordinator',
    department_id: 1,
    department_name: 'Computer Science',
  },
  {
    id: 4,
    name: 'Dr. Nora Adel',
    email: 'doctor@tanseek.test',
    password: MOCK_PASSWORD,
    role: 'lecturer',
    role_label: 'Doctor / TA',
    department_id: 1,
    department_name: 'Computer Science',
  },
  {
    id: 5,
    name: 'Ahmed Samir',
    email: 'lab@tanseek.test',
    password: MOCK_PASSWORD,
    role: 'lab_manager',
    role_label: 'Lab Manager',
    department_id: null,
    department_name: 'Labs & Facilities',
  }
]

export function publicMockAccounts() {
  return mockAccounts.map(({ password, ...account }) => account)
}
