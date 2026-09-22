# Tanseek — Final Frontend Workflow (v3.4)

```text
SUPER_ADMIN
  -> Departments + Academic Term + Accounts/Roles + Audit

DEPARTMENT_COORDINATOR
  -> Courses
  -> Lecture / Practical Requirements
  -> Lecture / Practical Sections
  -> Instructor Assignments

LAB_MANAGER
  -> Rooms/Labs + Equipment + Closures
  -> Practical Lab Checks

LECTURER / TA
  -> Availability Draft
  -> Confirm Availability

REGISTRATION_OFFICER
  -> Students
  -> Course Registration only

DEPARTMENT_COORDINATOR
  -> Student -> Lecture / Practical Section assignments

SCHEDULER
  -> Generate Draft
  -> Add / adjust time + room allocations
  -> Resolve conflicts / apply alternatives
  -> Submit for Admin Review

ADMIN
  -> Review Draft
  -> Manual adjustments inside authorized Department only
  -> Re-validation
  -> Publish final Schedule Version

LECTURER / TA / STUDENT
  -> Published timetable only
```

## Final ownership rules

- SUPER_ADMIN is the only full-access role.
- ADMIN owns final Publish. SCHEDULER cannot Publish.
- DEPARTMENT_COORDINATOR owns Courses, Requirements, Sections, instructor assignment, and student-to-section assignment.
- SCHEDULER does not select/replace instructors; the Coordinator assigns instructors before scheduling.
- REGISTRATION_OFFICER registers Courses only. The Coordinator assigns Lecture/Practical Sections later.
- STUDENT is an authenticated account but is not staff. It maps 1:1 to a Student record.
- Student personal timetable is based on individual section enrollments, not only Level.
- One Schedule Version covers the whole Term; Level is a filter/view.
- Lecturer/TA availability must be CONFIRMED before generation/allocation.
- Working policy: Saturday–Wednesday, 09:00–17:00, four 2-hour slots, no breaks.
