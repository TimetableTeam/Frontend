# Tanseek v3.5.3 — Full Frontend / Role QA Audit

## Result

The current Mock-mode application passed the automated integration and RBAC audit after the v3.5.3 fixes.

- **85 / 85 integration + RBAC checks passed**
- **9 / 9 built-in roles logged in successfully**
- **38 JS/JSX source files parsed with 0 syntax errors**
- **113 button instances scanned**
- **16 / 16 forms have `onSubmit` handlers**
- The single button without an action is intentionally disabled: **Confirmed lab** in `LabManagerChecks.jsx`.

## Final role verification

| Role | Verified behavior |
|---|---|
| SUPER_ADMIN | Accounts, roles, departments, academic terms, audit, full override access |
| ADMIN | Reviews/edits authorized department draft, cannot generate, can publish after Scheduler review submission |
| SCHEDULER | Generate, draft allocation edits, conflict resolution, validation, submit for Admin review, cannot publish |
| REGISTRATION_OFFICER | Course registration add/remove; unrelated protected writes blocked |
| DEPARTMENT_COORDINATOR | Own-department courses, sections, requirements, instructor assignment and student section assignment; cross-department writes blocked |
| LAB_MANAGER | Rooms/labs and lab checks; academic-course writes blocked |
| LECTURER | Own availability + published timetable |
| TA | Own availability + published timetable |
| STUDENT | Login/profile + personal published timetable; protected writes blocked |

## Scheduler → Admin workflow verified

```text
SCHEDULER
Generate Draft
→ Apply valid conflict alternatives
→ Validate
→ Submit for Admin review
→ Publish attempt is rejected

ADMIN
Load Draft
→ Edit own Department allocation
→ Cross-Department edit is rejected
→ Publish reviewed version

LECTURER / TA / STUDENT
→ Read latest Published timetable
```

## Issues found in v3.5.2 and fixed in v3.5.3

1. Several Mock API write routes trusted the frontend and did not enforce RBAC server-side. A Student could call room creation directly and Scheduler/Admin/Lecturer could call Course creation directly in Mock mode.
2. Coordinator Requirements displayed Courses/Requirements outside the Coordinator's Department scope.
3. Super Admin account creation used free-text Department names, which could create department-scoped accounts without a valid `department_id`.
4. Conflict Resolution marked a conflict as resolved before waiting for the allocation update to succeed. A rejected alternative could therefore look resolved in the UI.
5. The mock Lecturer-overlap conflict had no actually usable alternative, and `Auditorium 1` was referenced by recommendations without existing in room inventory.

All five issues above were corrected.

## Static action scan

The scan found 113 `<button>` / `<Button>` instances. Every actionable button is connected to either `onClick` or a form submit path. The one exception is intentional:

```text
LabManagerChecks.jsx → “Confirmed lab” → disabled state button
```

All 16 `<form>` elements have `onSubmit` handlers.

## Important limitation

This audit covers source syntax, permission/page mapping, Mock API integration, role enforcement and action wiring. A full browser E2E run and Vite production bundle were not executed in the audit environment because project npm dependencies were not installed there. Browser-only layout/focus issues should still receive a final manual smoke test after `npm install` / `npm run dev` on the development machine.
