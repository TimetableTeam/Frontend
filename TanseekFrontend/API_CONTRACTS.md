# Tanseek frontend API contract handoff

This frontend is wired through `src/api/tanseekApi.js`. Set `VITE_USE_MOCK_API=false` to call Osama's backend using `VITE_API_BASE_URL`.

> The original project brief requires the API contract to be frozen early so frontend and backend can work independently. The exact endpoint names below are the frontend contract used by this build. If Osama's OpenAPI uses different paths, update only `src/api/contracts.js` / `src/api/tanseekApi.js`; the screens should not need rewriting.

## 0) Authentication and role routing

`POST /api/v1/auth/login`

Request:
```json
{
  "email": "coordinator@university.edu",
  "password": "••••••••"
}
```

Frontend accepts either `access_token` or `token` and expects a `user` object:
```json
{
  "access_token": "jwt-or-session-token",
  "user": {
    "id": 3,
    "name": "Mona Hassan",
    "email": "coordinator@university.edu",
    "role": "coordinator",
    "role_label": "Department Coordinator",
    "department_id": 1,
    "department_name": "Computer Science",
    "permissions": ["overview.view", "requirements.manage"]
  }
}
```

Built-in roles currently routed by the authenticated frontend: `super_admin`, `scheduler`, `admin`, `coordinator`, `lecturer`, `lab_manager`. Students do not authenticate. The UI reads the role from the authenticated user; there is no manual role switcher anymore. Department-scoped authorization still must be enforced by the backend.

## 1) Planning catalog

`GET /api/v1/catalog/planning`

Response:
```json
{
  "term": { "id": 1, "name": "Fall 2026" },
  "courses": [{ "id": 1, "code": "CS220", "name": "Database Systems", "department": "Computer Science" }],
  "sections": [{ "id": 1, "code": "SEC-201", "course_id": 1, "name": "Database Systems · Year 2", "size": 26 }],
  "studentGroups": [{ "id": 11, "name": "Year 2 · A", "size": 26 }],
  "equipment": [{ "id": "pcs", "label": "Student PCs" }],
  "roomTypes": ["Classroom", "Computer Lab", "Graphics Lab"],
  "sessionTypes": ["Lecture", "Tutorial", "Lab"],
  "days": ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
  "slots": [{ "id": "s1", "start": "09:00", "end": "11:00" }]
}
```

## 2) Coordinator requirements

`GET /api/v1/requirements`

`POST /api/v1/requirements`

`PUT /api/v1/requirements/:id`

Request/response body:
```json
{
  "course_id": 1,
  "section_id": 1,
  "student_group_ids": [11, 12],
  "session_type": "Lab",
  "duration_minutes": 120,
  "weekly_count": 1,
  "required_room_type": "Computer Lab",
  "required_equipment": ["pcs", "projector"],
  "preferred_windows": [
    { "day": "Tuesday", "slot_id": "s2" }
  ],
  "notes": "Use one PC per student where possible.",
  "state": "READY"
}
```

Frontend expects `state` to be `READY` or `INCOMPLETE`. The backend should be the source of truth for completeness validation.

## 3) Doctor / TA availability

`GET /api/v1/availability/me?term_id=1`

`PUT /api/v1/availability/me` — saves a Draft.

`POST /api/v1/availability/me/confirm` — confirms the current submission.

Body:
```json
{
  "term_id": 1,
  "slots": [
    { "day": "Saturday", "slot_id": "s1", "kind": "PREFERRED" },
    { "day": "Saturday", "slot_id": "s2", "kind": "AVAILABLE" }
  ]
}
```

Response:
```json
{
  "id": 501,
  "term_id": 1,
  "instructor_id": 4,
  "instructor_name": "Dr. Nora Adel",
  "role": "LECTURER",
  "state": "CONFIRMED",
  "confirmed_at": "2026-09-20T00:00:00Z",
  "slots": []
}
```

`kind` values used by the UI: `UNAVAILABLE`, `AVAILABLE`, `PREFERRED`. Only non-unavailable slots need to be stored if the backend treats missing slots as unavailable.

## 4) Lab manager checks

`GET /api/v1/lab-checks`

Response:
```json
{
  "requirements": [
    {
      "id": 101,
      "course_id": 1,
      "section_id": 1,
      "session_type": "Lab",
      "duration_minutes": 120,
      "required_room_type": "Computer Lab",
      "required_equipment": ["pcs", "projector"],
      "candidates": [
        {
          "room_id": "r1",
          "room_name": "Lab A",
          "building": "A",
          "capacity": 28,
          "group_size": 26,
          "room_type": "Computer Lab",
          "capacity_ok": true,
          "type_ok": true,
          "equipment_ok": true,
          "availability_ok": true,
          "closure_ok": true,
          "missing_equipment": [],
          "closure": null,
          "suitable": true
        }
      ],
      "decision": null
    }
  ]
}
```

`POST /api/v1/lab-checks/:requirementId`

Body:
```json
{
  "room_id": "r1",
  "status": "CONFIRMED",
  "notes": "PC count and projector checked."
}
```

The backend should calculate suitability from capacity, lab/room type, equipment, room availability and closure windows. The lab manager confirms a checked space; the scheduler still owns final scheduling/publishing.

## Runtime configuration

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCK_API=false
```

For local frontend-only development:

```env
VITE_USE_MOCK_API=true
```

The mock adapter is stateful for the current browser session and follows the same frontend service methods.

## Draft validation and publication (V2.3)

The frontend now calls these contracts for the scheduler publish flow:

```http
POST /schedule/drafts/:draftId/validate
Content-Type: application/json

{
  "resolved_conflict_ids": ["c1", "c2", "c3"]
}
```

Expected response shape:

```json
{
  "draft_id": "draft-v3",
  "valid": true,
  "hard_conflict_count": 0,
  "hard_conflicts": []
}
```

A publish request is sent only after validation succeeds:

```http
POST /schedule/drafts/:draftId/publish
Content-Type: application/json
```

The request includes the term, current allocations, resolved conflict IDs and the publishing user. The backend must still revalidate and reject publication when any hard conflict remains.

Expected successful response:

```json
{
  "id": "published-v1",
  "source_draft_id": "draft-v3",
  "version_number": 1,
  "term_name": "Fall 2026",
  "status": "PUBLISHED",
  "published_at": "2026-09-20T08:00:00.000Z",
  "published_by": "Youssef Adel",
  "allocations": []
}
```

Authenticated Doctor/TA views request only the latest official version:

```http
GET /timetable/published/me
```

Expected response:

```json
{
  "version": {
    "version_number": 1,
    "status": "PUBLISHED",
    "allocations": []
  }
}
```

In Mock API mode the latest published snapshot is persisted in browser localStorage so the scheduler can publish, sign out, verify the public student timetable by section, and sign in as Doctor/TA to verify the authenticated published view.

## Public student timetable (V2.5)

Students no longer authenticate. The public home page uses these read-only endpoints:

- `GET /public/sections` → `{ sections: [{ id, name, size }] }`
- `GET /public/timetable?section_id=<id>` → `{ version, section, allocations }`

Only the latest **published** timetable may be returned here. Draft allocations must never be exposed through public endpoints. Staff authentication remains required for Scheduler, Department Admin, Department Coordinator, Doctor/TA and Lab Manager workspaces.

## Rooms & labs CRUD (V2.6)

The Rooms & Labs screen now uses the service layer for the full frontend flow:

- `GET /rooms` → `{ rooms: [...] }`
- `POST /rooms` → create a room/lab
- `PUT /rooms/:roomId` → edit capacity, type, equipment, accessibility, status or closure note
- `DELETE /rooms/:roomId` → remove a room/lab

Example body:

```json
{
  "name": "Lab E",
  "building": "D",
  "type": "Computer Lab",
  "capacity": 30,
  "equipment": ["30 PCs", "Projector"],
  "accessibility": true,
  "status": "available",
  "closure": ""
}
```

## Scheduler draft allocations (V2.6)

The Scheduler can now add an actual lecture/section time into the draft through the same API layer:

- `GET /schedule/drafts/:draftId/allocations`
- `POST /schedule/drafts/:draftId/allocations`
- `PUT /schedule/drafts/:draftId/allocations/:allocationId`
- `DELETE /schedule/drafts/:draftId/allocations/:allocationId`

Example create body:

```json
{
  "course": "Algorithms",
  "code": "CS210",
  "section": "Year 2 · A",
  "staff": "Dr. Ahmed Ali",
  "type": "Lecture",
  "day": "Wednesday",
  "slot": "s4",
  "room": "Room 203"
}
```

In Mock API mode, a new allocation is rejected when the selected slot overlaps an existing allocation for the same room, staff member, or section. The real backend remains the source of truth for conflict validation and authorization.


## Super Admin: accounts and roles (V2.7)

Super Admin UI uses these contracts. The backend must enforce `accounts.manage` / `roles.manage`; frontend navigation is convenience only.

### Accounts

- `GET /admin/accounts` → `{ "accounts": [...] }`
- `POST /admin/accounts` → create a staff account
- `PUT /admin/accounts/:id` → edit a staff account / optionally change password
- `DELETE /admin/accounts/:id` → delete a staff account

Example create request:

```json
{
  "name": "Sara Adel",
  "email": "sara@university.edu",
  "password": "temporary-password",
  "role": "coordinator",
  "department_name": "Computer Science"
}
```

Account responses should never return password hashes or plaintext passwords. The authenticated user object should include the effective `permissions` array so custom roles can drive navigation without hard-coding role names.

### Roles

- `GET /admin/roles` → `{ "roles": [...] }`
- `POST /admin/roles` → create a custom role
- `PUT /admin/roles/:id` → update a custom role
- `DELETE /admin/roles/:id` → delete a custom role

Example role:

```json
{
  "id": "schedule_reviewer",
  "name": "Schedule Reviewer",
  "description": "Can view schedules and conflicts without publishing.",
  "built_in": false,
  "permissions": [
    "overview.view",
    "schedule.view",
    "conflicts.manage"
  ]
}
```

Permissions currently understood by the frontend:

`overview.view`, `schedule.view`, `schedule.manage`, `requirements.manage`, `availability.manage_own`, `labs.check`, `rooms.manage`, `conflicts.manage`, `master.manage`, `publish.manage`, `accounts.manage`, `roles.manage`.

`publish.manage` is reserved for the built-in Scheduler flow in this frontend and is intentionally not exposed in the custom-role builder, matching the project rule that only schedulers publish official timetable versions.

Recommended backend safeguards: prevent deletion of the last Super Admin, reject duplicate emails, prevent deletion of a role that is assigned to accounts until those accounts are reassigned, audit account/role changes, and scope all administration endpoints to authorized Super Admins.


## Role-aware overview (V2.8)

The Overview screen is now data-driven instead of using fixed demo values.

- `GET /overview`

The backend should derive the response from the authenticated user's role/scope. Frontend navigation does not send a role override in production.

Example Scheduler response:

```json
{
  "kind": "planning",
  "eyebrow": "Planning summary",
  "description": "A live view of schedule readiness, room utilization and items that need action before publication.",
  "metrics": [
    { "label": "Allocated sessions", "value": "8", "helper": "3 requirement sessions defined", "icon": "calendar", "tone": "teal" },
    { "label": "Hard conflicts", "value": "2", "helper": "must be resolved to publish", "icon": "alert", "tone": "alert" }
  ],
  "readiness": {
    "title": "Publication readiness",
    "subtitle": "Draft v3 · Fall 2026",
    "items": [["Master data complete", 100], ["Sessions allocated", 100], ["Staff availability", 100]],
    "total_conflicts": 3
  },
  "recent_activity": [
    {
      "id": "activity-1",
      "category": "planning",
      "title": "Session added to draft",
      "detail": "CS210 was scheduled on Wednesday.",
      "actor": "Youssef Adel",
      "at": "2026-09-20T12:00:00.000Z"
    }
  ]
}
```

Expected role-aware dashboard types in the current frontend:

- Super Admin → system accounts, roles, departments and room inventory.
- Scheduler → draft allocations, hard conflicts, room utilization, staff availability and publication readiness.
- Department Admin / Coordinator → department requirements and draft readiness.
- Doctor / TA → own availability plus latest published teaching assignments.
- Lab Manager → lab inventory, pending checks and closures/issues.

Recent activity should be generated from audited backend events in live mode. Mock mode stores a lightweight activity stream in browser localStorage.


## Master data contracts added in v2.9

`GET /api/v1/master-data/:type` where `type` is `terms`, `courses`, `sections`, or `slots`.

`POST /api/v1/master-data/:type` for `terms`, `courses`, and `sections`. Time slots are read-only under the current MVP scheduling policy.

`PUT /api/v1/master-data/:type/:id` updates an existing term/course/section.

Course payload example:
```json
{
  "code": "CS220",
  "name": "Database Systems",
  "department": "Computer Science",
  "contact_hours": 3
}
```

Section payload example:
```json
{
  "code": "SEC-201",
  "course_id": 1,
  "student_group_id": 11,
  "size": 26
}
```

Important: session type, duration, weekly count, required room type, required equipment and preferred windows do **not** belong to the Section master record. They belong to `/requirements`.

---

## v3.0 frontend additions

See `BACKEND_HANDOFF_V3.md` for the complete handoff. In short:

- student groups need an explicit `level` / `academicLevel` field;
- one schedule version remains scoped to the term, while Level is a filter over allocations;
- allocation reads should expose level, section/group, lecturer, room and weekday display data;
- public student viewing needs unauthenticated published-only endpoints because Student login is no longer used;
- room records should expose capacity, status/active state, accessibility and equipment for client-side filters.
