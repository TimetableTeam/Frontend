# Tanseek Frontend v3.5 — API Contract Summary

Base URL: `VITE_API_BASE=http://localhost:5000/api/v1`

Success JSON: `{ "success": true, "data": ... }`
Error JSON: `{ "success": false, "message": "..." }`
Protected requests use `Authorization: Bearer <JWT>`.

## Authentication / profile

- `POST /auth/login`
- `POST /auth/verify-otp`
- `GET /auth/me`
- `PATCH /auth/me` — display name only
- `POST /auth/change-password`
- `POST /auth/forgot-password` — public, always returns a generic response
- `POST /auth/reset-password` — public, validates one-time code/challenge and sets the new password

### Forgot password flow

```text
Login -> Forgot password -> Email -> Reset code -> New password -> Back to Login
```

`POST /auth/forgot-password` body:

```json
{ "email": "name@university.edu" }
```

Recommended response:

```json
{
  "success": true,
  "data": {
    "message": "If an account exists for this email, a reset code has been sent.",
    "challenge_id": "reset-challenge-id",
    "expires_in_seconds": 600
  }
}
```

Do not reveal whether the email exists. Production must never return the OTP/reset code. Mock mode may return `dev_code` for local testing only.

`POST /auth/reset-password` body:

```json
{
  "email": "name@university.edu",
  "challenge_id": "reset-challenge-id",
  "code": "123456",
  "new_password": "new-secure-password"
}
```

Backend requirements: expiry, one-time use, attempt limiting/rate limiting, hashed reset code/token storage, password policy, and invalidation of the reset challenge after success.

## Super Admin

- Accounts CRUD + role filtering
- Roles/permissions CRUD
- Departments CRUD
- Terms create/edit/activate + holidays + availability deadline
- Audit log

See `BACKEND_HANDOFF_FINAL.md` for exact required endpoints and rules.

## Coordinator

- Courses CRUD inside department scope
- Lecture/Practical Requirements CRUD
- Sections CRUD
- Section -> Lecturer/TA assignment
- Student -> Lecture/Practical Section assignment

Frontend adapter endpoints used in Mock mode:

- `GET /requirements`
- `POST /requirements`
- `PUT /requirements/:id`
- `GET /instructor-assignments`
- `POST /sections/:sectionId/instructors`
- `DELETE /sections/:sectionId/instructors/:staffId`
- `GET /students/:id/section-enrollments?term_id=`
- `POST /section-enrollments`
- `DELETE /section-enrollments/:id`

## Lecturer / TA

- Availability is per `staffId + termId`.
- Save Draft and Confirm are separate states.
- Scheduling must reject unconfirmed/unavailable staff.

Frontend adapter:

- `GET /availability/me?term_id=`
- `PUT /availability/me`
- `POST /availability/me/confirm`

## Registration Officer

Course registration only:

- `GET /students`
- `GET /students/:id/course-enrollments?term_id=`
- `POST /course-enrollments`
- `DELETE /course-enrollments/:id`

## Lab Manager

- Rooms/Labs CRUD
- Closures / equipment / capacity
- Practical requirement checks

Frontend adapter:

- `GET /rooms`
- `POST /rooms`
- `PUT /rooms/:id`
- `GET /lab-checks`
- `POST /lab-checks/:requirementId`

## Schedule workflow

Final ownership:

```text
SCHEDULER: Generate -> edit -> resolve -> Submit Review
ADMIN: Review -> department-scoped manual adjustment -> Publish
```

Frontend adapter:

- `GET /schedule/drafts/:id/workflow`
- `POST /schedule/drafts/:id/generate`
- `GET /schedule/drafts/:id/allocations`
- `POST /schedule/drafts/:id/allocations`
- `PUT /schedule/drafts/:id/allocations/:allocationId`
- `POST /schedule/drafts/:id/validate`
- `POST /schedule/drafts/:id/submit-review`
- `POST /schedule/drafts/:id/publish` — **ADMIN / SUPER_ADMIN only**

Production backend may map these frontend adapter methods to Osama's `/schedule-versions` and `/allocations` endpoints; keep that mapping inside the API service layer rather than changing UI components.

## Published personal timetable

- `GET /timetable/published/me?termId=`

LECTURER/TA: only assigned published allocations.
STUDENT: only latest published allocations whose section IDs are in active individual student-section enrollments.

Draft data must never be returned to students.

## Critical backend rules

1. Backend, not React, enforces department scope.
2. Scheduler cannot Publish.
3. ADMIN publishes after review and successful validation.
4. Coordinator assigns instructor; Scheduler chooses time and room.
5. Confirmed staff availability is mandatory.
6. Student section enrollment is the source of truth for personal timetable and student conflicts.
7. All critical operations are audited.

For the complete implementation checklist, data shapes, conflict types, and RBAC matrix, use `BACKEND_HANDOFF_FINAL.md`.
