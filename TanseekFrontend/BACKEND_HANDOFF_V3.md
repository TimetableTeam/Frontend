# Tanseek Frontend v3.0 — Backend Handoff

This note describes the backend data the new Level/Section timetable UX and filters need.

## Scheduling model

The frontend assumes **one Schedule Version / Draft per academic term**, not one version per level.

Example:

- Fall 2026 — Draft v3
  - Level 1 allocations
  - Level 2 allocations
  - Level 3 allocations
  - Level 4 allocations

Each allocation belongs to a section/student group, and that group belongs to an academic level. The frontend can then show the same draft by Level, Section, Lecturer, Room, or Day without duplicating schedule versions.

## Required backend fields

### Student groups

`GET /student-groups/?termId=` should return the academic level explicitly.

Recommended shape:

```json
{
  "id": 11,
  "name": "Year 2 · A",
  "level": 2,
  "size": 26,
  "termId": 1,
  "departmentId": 4
}
```

`level` may also be named `academicLevel`, but the contract must be fixed and documented.

### Sections

`GET /sections/?termId=` should make the section-to-group relationship explicit.

Recommended fields:

```json
{
  "id": 201,
  "code": "SEC-201",
  "courseId": 22,
  "studentGroupId": 11,
  "level": 2,
  "size": 26
}
```

The backend can omit `level` here if `studentGroupId` resolves to a group that already contains `level`, but including it makes timetable reads easier.

### Allocations

The existing allocation endpoints already use IDs. Allocation reads should return enough display data for filtering without extra N+1 requests.

Recommended allocation read shape:

```json
{
  "id": 9001,
  "versionId": 7,
  "sectionId": 201,
  "sectionCode": "SEC-201",
  "studentGroupId": 11,
  "studentGroupName": "Year 2 · A",
  "level": 2,
  "courseId": 22,
  "courseCode": "CS220",
  "courseName": "Database Systems",
  "instructorId": 15,
  "instructorName": "Dr. Ahmed Ali",
  "roomId": 5,
  "roomName": "Room 203",
  "weekday": "SUNDAY",
  "start": "09:00",
  "end": "11:00"
}
```

## Timetable filter support

The frontend now filters the currently loaded timetable by:

- Level
- Section
- Lecturer
- Room
- Day

For the current MVP, these filters can work client-side after `GET /allocations?versionId=`.

For scalability, it is recommended that `GET /allocations` also accept optional filters:

```text
GET /allocations?versionId=&level=&sectionId=&instructorId=&roomId=&weekday=
```

These are optional backend improvements; the frontend does not require all of them to render the filters if the allocation response contains the fields above.

## Rooms & labs filters

The frontend now supports:

- Type
- Minimum capacity
- Status
- Accessibility
- Equipment text

The existing contract already supports:

```text
GET /rooms/?kind=CLASSROOM|LAB&active=true|false
```

The frontend can apply the new filters client-side if room records return:

```json
{
  "id": 5,
  "name": "Lab A",
  "kind": "LAB",
  "type": "Computer Lab",
  "capacity": 28,
  "active": true,
  "accessibility": true,
  "equipment": ["PC", "Projector"],
  "closures": []
}
```

Recommended optional server-side query parameters:

```text
GET /rooms/?kind=&active=&minCapacity=&accessible=&equipment=
```

## Public student timetable — required because Student login was removed

The current frontend has a public home page. Students choose:

1. Academic Level
2. Section / Student Group
3. View latest published timetable

The backend contract supplied so far does not include a clear unauthenticated public timetable route. The backend needs one of the following designs.

### Recommended

```text
GET /public/student-groups?termId=
GET /public/timetable?termId=&studentGroupId=
```

Example public group response:

```json
{
  "success": true,
  "data": {
    "groups": [
      {"id": 11, "name": "Year 2 · A", "level": 2, "size": 26}
    ]
  }
}
```

The public timetable endpoint must return **published data only**, never draft allocations.

Alternative: expose a deliberately public, read-only version of `GET /schedule-versions/published` + filtered allocations. The frontend must not need a JWT for student viewing.

## Important backend rules

- Schedule versions are term-level; do not create one schedule version per academic level.
- A level timetable is a filtered view over the same version.
- Department scoping must be enforced by the backend.
- Students/public endpoints receive published data only.
- IDs, not display names, should be used for write operations.
- Keep success/error envelopes consistent:
  - success: `{success:true,data:...}`
  - error: `{success:false,message:...}`
