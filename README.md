# Tanseek Frontend v3.5


## v3.5 Forgot password

- Added **Forgot password?** on the Login screen.
- Recovery flow: university email -> one-time reset code -> new password -> back to Login.
- Mock mode uses reset code `123456` and persists the changed password locally for the current browser.
- Production contract uses `POST /auth/forgot-password` and `POST /auth/reset-password`.
- Forgot-password responses are generic so the UI does not reveal whether an email exists.
- Backend must enforce expiry, one-time use, attempt/rate limiting and secure reset-code storage.

## Final workflow alignment

- Final built-in roles: SUPER_ADMIN, ADMIN, SCHEDULER, REGISTRATION_OFFICER, DEPARTMENT_COORDINATOR, LAB_MANAGER, LECTURER, TA, STUDENT.
- Super Admin owns Departments, Academic Terms, Accounts/Roles/Permissions and Audit Log.
- Department Coordinator owns Courses, Lecture/Practical Requirements, Sections, Instructor Assignments and Student Section Assignments.
- Registration Officer manages Course Registration only.
- Lab Manager owns Rooms/Labs and Lab Checks.
- Lecturer/TA submit and confirm Availability.
- Scheduler generates the draft, schedules time/room, resolves conflicts, and submits for Admin review.
- Scheduler cannot publish. ADMIN is the final publisher.
- Admin manual editing is limited to the authorized department scope and is revalidated.
- Student logs in and sees registered courses, assigned Lecture/Practical Sections, and only the personal Published timetable.
- Added `FINAL_WORKFLOW.md` and `BACKEND_HANDOFF_FINAL.md`.

## Demo accounts

All Mock API accounts use `demo1234`:

- `superadmin@tanseek.test`
- `admin@tanseek.test`
- `scheduler@tanseek.test`
- `registration@tanseek.test`
- `coordinator@tanseek.test`
- `lab@tanseek.test`
- `lecturer@tanseek.test`
- `ta@tanseek.test`
- `student@tanseek.test`


## v3.3 Super Admin navigation + self-service profile

- Super Admin sidebar now separates user management by role: all accounts, Super Admins, Schedulers, Department Admins, Coordinators, Doctors/TAs, Lab Managers, Registrars and Students.
- Roles & permissions has its own Super Admin sidebar entry.
- Every authenticated user now has **Profile settings** in the user menu.
- Users can update their own display name and change their password after entering the current password.
- Email, role and department remain administrator-controlled.
- Mock mode persists name/password changes and updates the active session immediately after a name change.
- Real API contract expects `PATCH /auth/me` and `POST /auth/change-password`.
- API base now supports `VITE_API_BASE=http://localhost:5000/api/v1` while retaining `VITE_API_BASE_URL` as a fallback.

# Tanseek Frontend v3.1

## v3.1 Student login + Registrar / Academic Affairs

- Restored the authenticated **Student** role. The public Level/Section timetable landing page is no longer used as the app entry point.
- Added demo Student account: `student@tanseek.test` / `demo1234`.
- Added built-in **Registrar / Academic Affairs** role: `registrar@tanseek.test` / `demo1234`.
- Registrar gets an **Enrollments** workspace to map students to the courses and sections/groups they are actually registered in for the current term.
- Enrollment records support carried/repeated courses from another level.
- Student **My timetable** reads the latest published version only and filters it by the student's active enrollments.
- Students never see draft allocations.
- The scheduling model is unchanged: Scheduler creates one term-level draft/version; enrollment mapping only controls which published sessions each student sees.

# Tanseek Frontend v2.9

This version separates Master Data from Coordinator Requirements and fixes the Lab Manager confirmation flow.

## v2.9 changes
- Course master record: code, name, department, contact hours only.
- Section master record: section code, course, student group, size only.
- Session type, duration, weekly count, room/lab type, equipment and preferred windows stay in **Requirements**.
- New Course/Section records are written through the mock API and immediately appear in Coordinator Requirements.
- Fixed scheduling slots are read-only in Master Data because the current policy is Sat-Wed, 09:00-17:00, four 2-hour slots, no breaks.
- Lab Manager: suitable labs can be confirmed, the confirmed decision updates immediately and persists in Mock mode.
- Unsuitable labs now show **View issues** instead of a misleading Confirm button.

# Tanseek Frontend

React + Vite + Tailwind frontend for **Tanseek — Smart Timetable & Room Allocation**.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

## API mode

The UI is no longer coupled directly to mock arrays. Coordinator Requirements, Doctor/TA Availability and Lab Manager Checks call the service layer in `src/api/tanseekApi.js`.

By default `.env.example` uses the stateful mock adapter:

```env
VITE_USE_MOCK_API=true
```

To connect Osama's Node backend:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCK_API=false
```

See `API_CONTRACTS.md` for request/response shapes.

## Role workflows implemented

- **Scheduler / Admin:** overview, timetable, rooms, coordinator requirements visibility, lab checks visibility, conflicts, master data.
- **Department Coordinator:** creates/edits course and section session requirements, including duration, weekly count, multiple student groups, room type, equipment and preferred windows.
- **Doctor / TA:** saves Draft availability and confirms Available / Preferred teaching slots.
- **Lab Manager:** reviews Lab requirements, checks candidate labs against capacity/type/equipment/availability/closures and confirms a checked lab.
- **Registrar / Academic Affairs:** manages student-to-course/section enrollment mappings.
- **Student:** signs in and sees only the latest published sessions matching active enrollments.

## Brand implementation

- Navy `#142B43`
- Teal `#15A6A0`
- Warm alert `#B76A25`
- Ink `#20364A`
- Muted `#607383`
- Canvas `#F2F6F7`
- 8px spacing rhythm and explicit status labels
- Approved supplied Tanseek logo assets in `/public/assets`

## Notes

All demo records are synthetic. Frontend role switching is for UI testing only; production authorization must be enforced by the backend.

## V2.1 UX fix — Coordinator requirements

- `New requirement` now clears the current selection and opens the blank editor by smoothly scrolling to it.
- The Course field receives focus after the scroll, so keyboard input can start immediately.
- A clear success message confirms that a new requirement form is ready.
- Selecting an existing submitted requirement also scrolls to the editor, which improves the flow on smaller screens.
- The Reset button uses the same new-requirement behavior.

## V2.2 mock authentication + role routing

The login now validates against synthetic mock accounts when `VITE_USE_MOCK_API=true`. Every account uses password `demo1234`:

| Role | Email | Opens |
|---|---|---|
| Scheduler | `scheduler@tanseek.test` | Overview |
| Department Admin | `admin@tanseek.test` | Overview |
| Department Coordinator | `coordinator@tanseek.test` | Requirements |
| Doctor / TA | `doctor@tanseek.test` | My availability |
| Lab Manager | `lab@tanseek.test` | Lab checks |

Authentication stores the synthetic session/token in localStorage so refresh keeps the active user. Sign out clears both. The header now shows the authenticated user's name, role, email and department/scope. The old manual role dropdown was removed so role-specific navigation is driven by the authenticated user.

For live API mode, `POST /api/v1/auth/login` is used; see `API_CONTRACTS.md` for the expected response shape.

## V2.3 publish-flow demo

1. Sign in as `scheduler@tanseek.test` using `demo1234`.
2. Open **Timetable** and click **Publish version**. With open hard conflicts, the UI shows a blocked-publication dialog and a **Review conflicts** action.
3. Open **Conflicts**, choose an alternative for each hard conflict, and apply it. The affected mock allocation is updated in the draft grid.
4. Return to **Timetable**, click **Publish version**, confirm the dialog, and wait for the success state.
5. Sign out, then use `student@tanseek.test` or `doctor@tanseek.test` to verify authenticated published-only views.

The same UI is wired to API contract methods in `src/api/tanseekApi.js`. In live mode, Osama's backend should implement the validation, publish, and published-timetable endpoints documented in `API_CONTRACTS.md`.

## v2.4 UI updates

- User account control is pinned to the physical right side of the top bar.
- Clicking the user control opens an account menu with name, email, role, department and Sign out.
- Added English / Arabic language switching on both login and authenticated layouts.
- Language preference persists in localStorage.
- Arabic mode switches the document to RTL and uses Alexandria when available.
- Sidebar is vertically scrollable while keeping the existing responsive mobile behavior.


## V2.5 public student timetable

- Removed the authenticated `student` role and student demo account.
- The app now opens on a public student home page when no staff session exists.
- Students select their section and see only the latest published timetable for that section.
- Draft allocations are never shown on the public page.
- A login icon in the top-right opens staff sign-in for Scheduler, Department Admin, Department Coordinator, Doctor/TA and Lab Manager.
- Added public API contracts: `GET /public/sections` and `GET /public/timetable?section_id=<id>`.
- English/Arabic switching remains available on the public home and login screens.

## V2.6 rooms CRUD + scheduler session creation

- **Rooms & Labs → Add space** now opens a working create form instead of a placeholder button.
- Rooms/labs can be edited from the table, including building, type, capacity, equipment, accessibility, status and an optional closure/maintenance note.
- Spaces can be deleted in Mock API mode.
- Rooms & Labs includes loading, error and empty states.
- **Scheduler → Timetable → Add session** now opens a draft-allocation form where the Scheduler chooses course, code, section, Doctor/TA, session type, room/lab, day and time slot.
- The mock API rejects a new session when it creates a hard overlap for the same room, teaching staff member or section.
- Multiple non-conflicting sessions in the same timetable cell are rendered as separate cards instead of hiding all but one.
- Room records and draft allocations use the API service layer and persist in browser localStorage while Mock API mode is enabled.
- Added backend handoff contracts for `/rooms` and `/schedule/drafts/:draftId/allocations`; when Osama's backend is ready, switch `VITE_USE_MOCK_API=false` and map any path differences in `src/api/contracts.js`.


## V2.7 Super Admin + Dark mode

- Added a **Super Admin** staff role and demo account: `superadmin@tanseek.test` / `demo1234`.
- Added **System administration** workspace for Super Admin.
- Super Admin can create, edit and delete staff accounts, assign departments/scopes, reset passwords by entering a new password, and assign roles.
- Added role management with custom roles and granular permission selection. Built-in roles are protected; custom roles can be edited/deleted when they are not assigned to accounts.
- Custom-role accounts receive their role permissions at login, and sidebar/page access is generated from permissions instead of a hard-coded role switcher.
- Added API contracts for `/admin/accounts` and `/admin/roles`; Mock API mode persists accounts and roles in browser localStorage.
- Added **Light / Dark mode** on the public timetable, staff login and authenticated workspace. Theme preference persists in localStorage and defaults to the operating-system preference on first use.
- Dark mode includes dark surfaces, inputs, tables, dropdowns, empty states and timetable cards while keeping Tanseek navy/teal/warm-alert brand cues.

### Super Admin demo

```text
Email: superadmin@tanseek.test
Password: demo1234
```

Production note: account/role creation, permission enforcement, last-Super-Admin protection and all authorization must be revalidated by the backend. Frontend permission hiding is not a security boundary.


## V2.8 dynamic role-aware overview

- Overview metrics are no longer fixed numbers; they are loaded through `GET /overview`.
- Scheduler metrics update from the current draft, room inventory, availability state and resolved-conflict state.
- Super Admin sees system-level account/role/department/inventory metrics instead of scheduling-only metrics.
- Department Admin / Coordinator, Doctor/TA and Lab Manager each receive a role-specific overview.
- Recent activity is stateful in Mock API mode and records account/role, requirement, availability, room/lab, draft and publish changes.
- The Overview includes loading, error, empty/recent-activity and manual refresh states.
- Resolved conflict IDs are persisted in Mock mode so dashboard conflict readiness stays consistent across sign-out/sign-in during testing.

## v3.0 Level / Section timetable UX

- One schedule draft/version is kept per academic term, not per level.
- Timetable supports Level, Section, Lecturer, Room and Day filters.
- Public student home now asks for Academic Level first, then Section/Student Group.
- Rooms & Labs has functional advanced filters for minimum capacity, status, accessibility and equipment.
- See `BACKEND_HANDOFF_V3.md` for the backend fields/endpoints needed for the final live integration.


## V3.3 role ownership update

- Super Admin now has dedicated **Academic terms** and **Departments** setup screens.
- Department Coordinator owns **Courses**, **Sections** and **Requirements** within the assigned department.
- Scheduler no longer receives course/section/master-data write access; Rooms & Labs are view-only for scheduling.
- Lab Manager owns room/lab edits.
- `BACKEND_HANDOFF_V3_3.md` lists the backend authorization and endpoint changes needed to make this role split authoritative.


## v3.5.2 — Schedule workflow button fix

- `Submit for Admin review` now executes its validation instead of looking enabled while being silently disabled by hard conflicts.
- `Publish version` is clickable for ADMIN and explains when the Scheduler has not submitted the draft yet.
- Added clear blocked-state messages/modals for review/publish prerequisites.
- Disabled buttons now have visible disabled styling.

## v3.5.3 — Full role & action QA audit

- Audited all nine built-in roles against the final Tanseek workflow.
- ADMIN remains the final Publish owner; SCHEDULER can Generate, resolve conflicts and Submit for Admin review but cannot Publish.
- Added Mock API RBAC enforcement for accounts, roles, departments, academic terms, courses, sections, requirements, registrations, section assignments, rooms/labs and draft allocation mutations.
- Enforced Department Coordinator scope for Requirements as well as Courses, Sections, instructor assignments and student section assignments.
- Replaced free-text department scope in Super Admin account management with a real Department selector and `department_id` mapping.
- Conflict alternatives are applied only after the API update succeeds; rejected alternatives now show an error instead of being marked resolved locally.
- Corrected mock conflict alternatives and added Auditorium 1 so the provided resolution paths are actually feasible in Mock mode.
- QA: 85 Mock API integration/RBAC tests passed, 38 JS/JSX files parsed with zero syntax errors, 113 button instances scanned, and all 16 forms have submit handlers. The only button without an action is the intentionally disabled “Confirmed lab” state button.

## Session inactivity timeout
Set `VITE_SESSION_IDLE_MINUTES` to control the frontend idle-session timeout. The default is 30 minutes. When the timeout is reached, the saved session is cleared and the user must sign in again. A backend 401 response also clears the local session automatically.
