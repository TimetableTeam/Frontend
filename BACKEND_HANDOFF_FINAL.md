# Tanseek — Final Backend Handoff

## 1. Final Workflow

```text
SUPER_ADMIN
    ↓
DEPARTMENT_COORDINATOR + LAB_MANAGER
    ↓
LECTURER / TA submit and confirm Availability
    ↓
REGISTRATION_OFFICER registers student courses
    ↓
DEPARTMENT_COORDINATOR assigns students to Lecture / Practical Sections
    ↓
SCHEDULER generates and prepares the Draft Schedule
    ↓
ADMIN reviews, adjusts, re-validates, and PUBLISHES
    ↓
LECTURER / TA / STUDENT view Published Timetables
```

**Final rule:** `ADMIN` publishes. `SCHEDULER` prepares the schedule but cannot publish.

---

## 2. Final Roles and Responsibilities

### SUPER_ADMIN
- Manage all accounts.
- Manage roles and permissions.
- Create/edit Departments.
- Create/edit/activate Academic Terms.
- Grant extra access.
- View Audit Log.
- Full university-wide access.

### ADMIN
- Review Draft Schedule.
- Edit allocations only inside authorized Department scope.
- Re-run validation after manual edits.
- Publish final Schedule Version.
- View conflicts/recommendations for authorized Department(s).

Must NOT create Courses, Sections, Requirements, Rooms/Labs, Accounts/Roles.

### SCHEDULER
- Create Draft Schedule Versions.
- Generate/prepare schedule allocations.
- Add/edit/remove allocations.
- Review conflicts and recommendations.
- Resolve conflicts.
- Submit Draft for review.

Must NOT create Courses/Sections/Academic Terms and must NOT publish.

### REGISTRATION_OFFICER
- Add/edit student academic records.
- Register/remove student Courses for a Term.
- Handle carried/repeated courses.
- Optional bulk registration import.

### DEPARTMENT_COORDINATOR
- Add Courses for own Department.
- Create LECTURE/PRACTICAL Requirements.
- Create Sections.
- Assign Lecturer/TA to Sections.
- Assign students to Lecture/Practical Sections.
- Use Student Groups for bulk assignment.

### LAB_MANAGER
- Manage Rooms/Labs.
- Manage capacity, equipment quantities, closures and availability.
- Review Requirement → Lab compatibility.
- Confirm/reject Lab Check.

### LECTURER
- Save Availability draft.
- Confirm Availability.
- View Published Timetable.

### TA
- Save Availability draft.
- Confirm Availability.
- View assigned Practical Sections.
- View Published Timetable.

### STUDENT
- Login account, but NOT Staff.
- Account maps 1:1 to `students`.
- Read-only access to registered Courses, assigned Lecture/Practical Sections and personal Published Timetable.

---

## 3. Authentication / Profile

Base URL:

```text
http://localhost:5000/api/v1
```

Frontend env:

```env
VITE_API_BASE=http://localhost:5000/api/v1
```

Protected requests:

```http
Authorization: Bearer <JWT>
```

Optional:

```http
X-Device-Token: <deviceToken>
```

Response format:

```json
{"success":true,"data":{}}
```

```json
{"success":false,"message":"..."}
```

Required:

```text
POST  /auth/login
POST  /auth/verify-otp
GET   /auth/me
PATCH /auth/me
POST  /auth/change-password
```

`PATCH /auth/me` should allow self-edit of `name` only. Role, Department, permissions and status must not be self-editable.

`POST /auth/change-password`:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

---

## 4. Super Admin — Accounts / Roles

Required:

```text
GET    /admin/accounts
GET    /admin/accounts?role=SUPER_ADMIN
GET    /admin/accounts?role=ADMIN
GET    /admin/accounts?role=SCHEDULER
GET    /admin/accounts?role=REGISTRATION_OFFICER
GET    /admin/accounts?role=DEPARTMENT_COORDINATOR
GET    /admin/accounts?role=LAB_MANAGER
GET    /admin/accounts?role=LECTURER
GET    /admin/accounts?role=TA
GET    /admin/accounts?role=STUDENT
POST   /admin/accounts
PATCH  /admin/accounts/:id
DELETE /admin/accounts/:id

GET    /admin/roles
POST   /admin/roles
PATCH  /admin/roles/:id
DELETE /admin/roles/:id
```

Suggested Account:

```json
{
  "id": 15,
  "name": "Ahmed Ali",
  "email": "ahmed@university.edu",
  "role": "LECTURER",
  "departmentId": 2,
  "status": "ACTIVE",
  "permissions": []
}
```

Student account example:

```json
{
  "id": 90,
  "name": "Student Name",
  "email": "student@university.edu",
  "role": "STUDENT",
  "studentId": 301,
  "departmentId": 2,
  "currentLevel": 3,
  "status": "ACTIVE"
}
```

Rules:
- STUDENT account maps 1:1 to `students`.
- Prevent deletion of the last SUPER_ADMIN.
- Role/scope/status changes must be audited.

---

## 5. Departments

Existing:

```text
GET /departments/
```

Required:

```text
POST   /departments/
PATCH  /departments/:id
DELETE /departments/:id
```

Write access: `SUPER_ADMIN` only.

---

## 6. Academic Term

Academic Term setup belongs to `SUPER_ADMIN`.

Required:

```text
GET   /terms/
GET   /terms/active
GET   /terms/:id
POST  /terms/
PATCH /terms/:id
POST  /terms/:id/activate
```

Suggested Term:

```json
{
  "id": 7,
  "name": "Fall 2027",
  "startDate": "2027-09-15",
  "endDate": "2028-01-15",
  "workingDays": ["SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY"],
  "dayStart": "09:00",
  "dayEnd": "17:00",
  "slotDurationMinutes": 120,
  "availabilityDeadline": "2027-08-31",
  "status": "ACTIVE"
}
```

Business rules:
- Saturday → Wednesday.
- 09:00 → 17:00.
- 4 Slots/day.
- Each Slot = 2 continuous hours.
- No break.
- Prefer exactly one ACTIVE Term.

Generated slots:

```text
09:00–11:00
11:00–13:00
13:00–15:00
15:00–17:00
```

### Holidays

```text
GET    /terms/:id/holidays
POST   /terms/:id/holidays
DELETE /terms/:id/holidays/:holidayId
```

Scheduling must reject holidays.

---

## 7. Courses

Existing reads:

```text
GET /courses/?departmentId=
GET /courses/:id
```

Required write:

```text
POST  /courses/
PATCH /courses/:id
```

Default write roles:

```text
DEPARTMENT_COORDINATOR
SUPER_ADMIN
```

`SCHEDULER` and `ADMIN` must not create Courses by default.

Backend must enforce Department scope with `403` on cross-department attempts.

---

## 8. Requirements

Each Course may have separate components:

```text
LECTURE
PRACTICAL
```

Required:

```text
GET    /courses/:courseId/requirements?termId=
GET    /requirements/:id
POST   /requirements/
PATCH  /requirements/:id
DELETE /requirements/:id
```

Suggested Requirement:

```json
{
  "id": 701,
  "termId": 7,
  "courseId": 22,
  "component": "PRACTICAL",
  "durationMinutes": 120,
  "sessionsPerWeek": 1,
  "expectedStudents": 25,
  "roomKind": "LAB",
  "equipmentRequirements": [
    {"equipmentId":8,"name":"GPU Workstation","quantity":8}
  ],
  "preferredWindows": [
    {"weekday":"MONDAY","start":"11:00","end":"15:00"}
  ],
  "status": "READY"
}
```

Incomplete Requirements must block scheduling readiness.

---

## 9. Sections

Existing reads:

```text
GET /sections/?termId=
GET /sections/:id
```

Required write:

```text
POST  /sections/
PATCH /sections/:id
```

Default write roles:

```text
DEPARTMENT_COORDINATOR
SUPER_ADMIN
```

Suggested Section:

```json
{
  "id": 201,
  "termId": 7,
  "courseId": 22,
  "requirementId": 701,
  "code": "AI301-P1",
  "component": "PRACTICAL",
  "departmentId": 3,
  "capacity": 25,
  "studentGroupId": 11
}
```

Course structure example:

```text
Machine Learning
├── LECTURE
│   └── AI301-L1
└── PRACTICAL
    ├── AI301-P1
    └── AI301-P2
```

---

## 10. Instructor Assignment

Existing read:

```text
GET /sections/:id/instructors?requirementId=
```

Required write:

```text
POST   /sections/:id/instructors
DELETE /sections/:id/instructors/:staffId
```

Body:

```json
{"staffId":15}
```

Coordinator assigns Instructor before scheduling.

The scheduling engine should choose Time + Room/Lab, not silently change Instructor.

---

## 11. Lecturer / TA Availability

Existing:

```text
GET /staff/:id/availability?termId=
```

Required:

```text
PUT  /staff/me/availability
POST /staff/me/availability/confirm
```

Key by:

```text
staffId + termId
```

Statuses per slot:

```text
AVAILABLE
PREFERRED
UNAVAILABLE
```

Submission state:

```text
DRAFT
CONFIRMED
```

Critical rules:
- No Instructor may be scheduled unless Availability is `CONFIRMED`.
- Selected slot must be `AVAILABLE` or `PREFERRED`.
- Availability Deadline must be enforced server-side.

Recommended errors:

```text
STAFF_AVAILABILITY_NOT_CONFIRMED
STAFF_UNAVAILABLE
```

---

## 12. Rooms / Labs / Equipment / Closures

Existing:

```text
GET  /rooms/?kind=CLASSROOM|LAB&active=true|false
GET  /rooms/:id
POST /rooms/
PATCH /rooms/:id
POST /rooms/:id/closures
```

Default write roles:

```text
LAB_MANAGER
SUPER_ADMIN
```

Scheduler read-only.

Room must include:
- code/name/building
- kind
- capacity
- accessibility
- active status
- equipment with quantities
- closures

---

## 13. Lab Checks

Required persistence:

```text
GET   /lab-checks?requirementId=
GET   /lab-checks?termId=
POST  /lab-checks/
PATCH /lab-checks/:id
```

Suggested:

```json
{
  "requirementId": 701,
  "roomId": 8,
  "checks": {
    "capacity": true,
    "roomType": true,
    "equipment": true,
    "availability": true,
    "closure": true
  },
  "status": "CONFIRMED",
  "notes": "GPU requirement satisfied."
}
```

Statuses:

```text
PENDING
CONFIRMED
REJECTED
```

Store `checkedBy` and `checkedAt`.

---

## 14. Students

Required:

```text
GET    /students
GET    /students/:id
POST   /students
PATCH  /students/:id
```

Suggested Student:

```json
{
  "id": 301,
  "universityId": "AI27001",
  "name": "Student Name",
  "departmentId": 3,
  "currentLevel": 3,
  "status": "ACTIVE",
  "accountId": 90
}
```

---

## 15. Course Registration

Registration Officer manages Course Registration.

Required:

```text
GET    /students/:id/course-enrollments?termId=
POST   /course-enrollments
DELETE /course-enrollments/:id
```

Suggested:

```json
{
  "studentId": 301,
  "termId": 7,
  "courseId": 22,
  "registrationType": "NORMAL"
}
```

Values:

```text
NORMAL
CARRIED
REPEATED
```

Tanseek only needs enrollment mapping for timetable personalization; it does not need full academic registration rules.

---

## 16. Student Groups + Level

Existing:

```text
GET  /student-groups/?termId=
POST /student-groups/
```

Student Group must return `level` explicitly.

Example:

```json
{
  "id": 11,
  "name": "AI Level 3 Group A",
  "level": 3,
  "departmentId": 3,
  "size": 25
}
```

Important:
- One Schedule Version covers the whole Term.
- Level is a View/Filter only.
- Do NOT create one Schedule Version per Level.

---

## 17. Student → Section Assignment

Final source of truth for personal student timetable:

```text
student_section_enrollments
```

Suggested fields:

```text
id
studentId
termId
courseId
sectionId
component
createdAt
createdBy
status
```

Required:

```text
GET    /students/:id/section-enrollments?termId=
POST   /section-enrollments
DELETE /section-enrollments/:id
POST   /section-enrollments/bulk
```

Typical rule:
- One LECTURE Section per registered Course.
- One PRACTICAL Section where Practical exists.

Bulk Student Group assignment should expand into individual `student_section_enrollments` rows.

**Student Group is only a convenience; individual enrollment is the final source of truth.**

---

## 18. Scheduling Readiness

Recommended:

```text
GET /schedule/readiness?termId=
```

Suggested response:

```json
{
  "ready": false,
  "checks": {
    "activeTerm": true,
    "requirementsComplete": true,
    "sectionsCreated": true,
    "instructorsAssigned": true,
    "staffAvailabilityConfirmed": false,
    "roomsConfigured": true,
    "labChecksComplete": true,
    "studentsRegistered": true,
    "studentsAssignedToSections": false
  },
  "blockers": [
    "2 instructors have not confirmed availability.",
    "31 students are not assigned to a Practical Section."
  ]
}
```

Scheduler Generate must be blocked when critical readiness checks fail.

---

## 19. Schedule Versions

Existing:

```text
GET  /schedule-versions/?termId=
GET  /schedule-versions/published?termId=
GET  /schedule-versions/:id
POST /schedule-versions/
GET  /schedule-versions/:id/validate
```

Create Version allowed:

```text
SCHEDULER
SUPER_ADMIN
```

Recommended statuses:

```text
DRAFT
READY_FOR_REVIEW
UNDER_REVIEW
REQUEST_CHANGES
APPROVED
PUBLISHED
ARCHIVED
```

---

## 20. Generate Schedule

Recommended endpoint:

```text
POST /schedule-versions/:id/generate
```

Allowed:

```text
SCHEDULER
SUPER_ADMIN
```

Generation chooses:
- Time Slot
- Room/Lab

while respecting assigned Instructor and all constraints.

---

## 21. Allocations

Existing:

```text
GET    /allocations?versionId=
POST   /allocations/
PATCH  /allocations/:id
DELETE /allocations/:id
```

Recommended GET filters:

```text
versionId
level
sectionId
instructorId
roomId
weekday
departmentId
```

Allocation response should include enough data for frontend filters:
- courseId/code/name
- requirementId
- sectionId/code/component
- studentGroupId/name/level
- departmentId
- instructorId/name
- roomId/name
- weekday/start/end

---

## 22. Conflict Validation

Existing:

```text
POST /allocations/check-conflicts
```

Must detect:

```text
ROOM_OVERLAP
INSTRUCTOR_OVERLAP
STUDENT_GROUP_OVERLAP
STUDENT_OVERLAP
CAPACITY
ROOM_TYPE
EQUIPMENT
ROOM_CLOSURE
HOLIDAY
DURATION
STAFF_AVAILABILITY_NOT_CONFIRMED
STAFF_UNAVAILABLE
SECTION_CONFLICT
```

Hard conflict response example:

```json
{
  "feasible": false,
  "conflicts": [
    {
      "type": "STAFF_UNAVAILABLE",
      "severity": "HARD",
      "message": "Dr. Ahmed is unavailable Monday 11:00–13:00."
    }
  ]
}
```

---

## 23. Recommendations

Existing:

```text
POST /allocations/recommend
```

Return ranked alternatives with reasons/trade-offs.

Example:

```json
{
  "alternatives": [
    {
      "rank": 1,
      "score": 94,
      "roomId": 8,
      "roomName": "GPU Lab 1",
      "weekday": "MONDAY",
      "start": "13:00",
      "end": "15:00",
      "reasons": [
        "Instructor is available",
        "Capacity satisfied",
        "Required equipment available",
        "No student conflict"
      ]
    }
  ]
}
```

---

## 24. Scheduler → Admin Review Workflow

Required:

```text
POST /schedule-versions/:id/submit-review
POST /schedule-versions/:id/request-changes
POST /schedule-versions/:id/approve
```

Flow:

```text
SCHEDULER
DRAFT → READY_FOR_REVIEW

ADMIN
READY_FOR_REVIEW → UNDER_REVIEW
→ APPROVED
or
→ REQUEST_CHANGES
```

Any Admin manual adjustment must be validated again.

---

## 25. ADMIN Department Scope

ADMIN is Department-scoped.

Backend must enforce:

```text
Admin Department 3
✓ can edit allocations whose section.departmentId = 3
✗ cannot edit Department 4 allocations
```

Cross-department attempt must return `403 Forbidden`.

Frontend visibility is not security.

---

## 26. Publish — FINAL RULE

Existing:

```text
POST /schedule-versions/:id/publish
```

Allowed:

```text
ADMIN
SUPER_ADMIN
```

Forbidden:

```text
SCHEDULER
```

Publish conditions:

```text
0 Hard Conflicts
Version reviewed/approved
Department scope rules satisfied
Critical readiness conditions passed
```

On Publish:
- mark/create Published Version
- keep previous versions in history
- set this as official current timetable
- write Audit Log event
- optional affected-user notification list

---

## 27. Personal Published Timetable

Required unified endpoint:

```text
GET /timetable/published/me?termId=
```

### When LECTURER / TA
Return only assigned allocations from latest Published Version.

### When STUDENT
Backend must:

```text
Authenticated Student
→ students record
→ ACTIVE student_section_enrollments
→ Latest Published Schedule Version
→ matching allocations
→ Personal Timetable
```

Do NOT filter a student's timetable by current Level only. A Level 3 student may have a carried Level 2 course.

Recommended Student reads:

```text
GET /students/me
GET /students/me/course-enrollments?termId=
GET /students/me/section-enrollments?termId=
GET /timetable/published/me?termId=
```

Student is read-only.

---

## 28. Dashboard

Existing:

```text
GET /dashboard/summary?termId=&versionId=
```

Should support enough data for role-aware dashboards.

Scheduler:

```text
allocatedSessions
unallocatedSessions
hardConflicts
roomUtilization
staffAvailabilityConfirmed
readiness
```

Super Admin:

```text
activeAccounts
departments
roles
rooms
labs
auditEvents
```

Coordinator:

```text
courses
sections
requirementsReady
requirementsIncomplete
studentSectionAssignmentProgress
```

---

## 29. Calendar Export

Existing:

```text
GET /calendar/export.ics?termId=&instructorId=&sectionId=&roomId=
```

For normal end users it should export Published timetable data.

---

## 30. Audit Log

Required:

```text
GET /audit-log
```

Default access: `SUPER_ADMIN`.

Audit at minimum:
- account create/edit/deactivate
- role/permission changes
- department changes
- term create/edit/activate
- course/section/requirement changes
- instructor assignment
- availability confirmation
- room/lab changes and closures
- lab check confirm/reject
- course registration changes
- student section assignment changes
- schedule generate
- allocation create/edit/delete
- review submit/request changes/approve
- publish
- post-publication changes

Suggested fields:

```json
{
  "id": 1,
  "actorAccountId": 10,
  "action": "SCHEDULE_PUBLISHED",
  "entityType": "ScheduleVersion",
  "entityId": 100,
  "timestamp": "2027-09-01T10:30:00Z",
  "reason": null,
  "metadata": {}
}
```

---

## 31. Recommended Stable Error Codes

```text
UNAUTHORIZED
FORBIDDEN
DEPARTMENT_SCOPE_VIOLATION
TERM_NOT_ACTIVE
INVALID_TERM_DATES
SLOT_OVERLAP
HOLIDAY_CONFLICT
REQUIREMENT_INCOMPLETE
STAFF_AVAILABILITY_NOT_CONFIRMED
STAFF_UNAVAILABLE
ROOM_CONFLICT
ROOM_CAPACITY_INSUFFICIENT
ROOM_TYPE_MISMATCH
EQUIPMENT_MISSING
ROOM_CLOSED
INSTRUCTOR_CONFLICT
SECTION_CONFLICT
STUDENT_GROUP_CONFLICT
STUDENT_CONFLICT
SCHEDULE_NOT_READY
HARD_CONFLICTS_REMAIN
REVIEW_REQUIRED
PUBLISH_NOT_ALLOWED
```

Example:

```json
{
  "success": false,
  "code": "STAFF_AVAILABILITY_NOT_CONFIRMED",
  "message": "Instructor availability is not confirmed."
}
```

---

## 32. Existing APIs That Can Stay

```text
POST /auth/login
POST /auth/verify-otp
GET  /auth/me

GET /departments/

GET /terms/
GET /terms/active

GET /rooms/
GET /rooms/:id
POST /rooms/
PATCH /rooms/:id
POST /rooms/:id/closures

GET /staff/
GET /staff/:id/availability?termId=

GET /courses/
GET /courses/:id
GET /courses/:id/requirements?termId=

GET /sections/
GET /sections/:id
GET /sections/:id/instructors?requirementId=

GET /student-groups/
POST /student-groups/

GET /timeslots/

GET /schedule-versions/
GET /schedule-versions/published
GET /schedule-versions/:id
POST /schedule-versions/
GET /schedule-versions/:id/validate

GET /allocations
POST /allocations/check-conflicts
POST /allocations/recommend
POST /allocations/
PATCH /allocations/:id
DELETE /allocations/:id

GET /dashboard/summary
GET /calendar/export.ics
```

Their authorization must follow this final RBAC.

---

## 33. Critical Backend Checklist

### P0 — Required before full frontend integration

```text
[ ] Final RBAC roles + permissions
[ ] ADMIN owns Publish; remove Publish from SCHEDULER
[ ] Department scope enforcement
[ ] Accounts CRUD
[ ] Roles/Permissions CRUD
[ ] User profile name update
[ ] Change password
[ ] Departments CRUD
[ ] Academic Term create/edit/activate
[ ] Holidays
[ ] Availability deadline
[ ] Requirements CRUD
[ ] Lecturer/TA Availability Save + Confirm
[ ] Lab Check persistence
[ ] Students APIs
[ ] Course Enrollment APIs
[ ] Student Section Enrollment APIs
[ ] Personal Published Timetable
[ ] Audit Log
```

### P1 — Scheduling workflow

```text
[ ] Schedule Readiness endpoint
[ ] Generate endpoint
[ ] Submit for Review
[ ] Request Changes
[ ] Approve
[ ] Publish by ADMIN only
[ ] Conflict validation includes staff availability + student conflicts
```

### P2 — Helpful improvements

```text
[ ] Allocation server-side filters
[ ] Bulk enrollment import
[ ] Bulk Student Group → Section expansion
[ ] Role-aware dashboard metrics
[ ] Notification list after publish/change
```

---

## 34. Final Business Rules — Source of Truth

```text
1. SUPER_ADMIN is the only role with Full Access.

2. Academic Term is created by SUPER_ADMIN.

3. DEPARTMENT_COORDINATOR creates Courses, LECTURE/PRACTICAL Requirements, Sections, Instructor assignments and Student → Section assignments.

4. LAB_MANAGER manages Rooms/Labs, equipment, closures and Lab Checks.

5. LECTURER and TA must CONFIRM Availability.

6. No Instructor can be scheduled before confirmed Availability.

7. REGISTRATION_OFFICER registers student Courses.

8. Course Registration alone is not enough for a personal timetable.

9. Individual student_section_enrollments are the final source of truth.

10. Student Group is only a bulk-assignment convenience.

11. SCHEDULER creates/generates the Draft Schedule.

12. SCHEDULER resolves conflicts and prepares the Draft for review.

13. ADMIN reviews and manually adjusts the Draft within authorized Department scope.

14. Every Admin manual change must be revalidated.

15. ADMIN performs final Publish.

16. SCHEDULER cannot Publish.

17. Only Published Versions are visible to LECTURER / TA / STUDENT.

18. Student timetable is based on actual Section Enrollments, not only Level.

19. One Schedule Version covers the whole Term. Levels are filters/views, not separate Versions.

20. All critical operations must be audited.
```

---

## 35. Final Execution Order

```text
SUPER_ADMIN
    ↓
DEPARTMENT_COORDINATOR + LAB_MANAGER
    ↓
LECTURER / TA
    ↓
REGISTRATION_OFFICER
    ↓
DEPARTMENT_COORDINATOR
    ↓
SCHEDULER
    ↓
ADMIN
    ↓
PUBLISH BY ADMIN
    ↓
LECTURER / TA / STUDENT
```

This file should be treated as the final backend implementation reference for the current Tanseek frontend.
