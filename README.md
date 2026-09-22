# Tanseek Frontend v2

React + Vite + Tailwind frontend for **Tanseek — Smart Timetable & Room Allocation**. This application separates master data from requirements, supports complex scheduling workflows, and enforces a strict draft-to-publish lifecycle.

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

### API Configuration

The UI connects to either a stateful Mock API or a live Node.js backend (`src/api/tanseekApi.js`). 

**Mock API Mode (Default)**
Uses synthetic data and stores sessions/changes in browser `localStorage`.
```env
VITE_USE_MOCK_API=true
```

**Live API Mode**
Connects to the production/staging backend (see `API_CONTRACTS.md` for request/response shapes).
```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3000/api/v1
# OR
VITE_API_BASE=http://localhost:5000/api/v1
```

## Demo Accounts & Role Permissions

All mock accounts use the password: `demo1234`. 
*Note: The frontend role switching is for UI testing; production authorization is enforced by the backend.*

| Role | Email | Domain Ownership & Capabilities |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@tanseek.test` | System Administration. Owns Departments, Academic Terms, Accounts, Roles/Permissions, and Audit Logs. |
| **Admin** | `admin@tanseek.test` | Final Publisher. Owns manual timetable edits within their authorized department scope. |
| **Scheduler** | `scheduler@tanseek.test` | Scheduling Workspace. Generates drafts, assigns time/rooms, resolves conflicts, and **submits for Admin review** (cannot publish). |
| **Registration Officer** | `registration@tanseek.test` | Academic Affairs. Manages Student-to-Course/Section enrollments (including carry-over courses). |
| **Department Coordinator** | `coordinator@tanseek.test` | Master Data. Owns Courses, Sections, Instructor Assignments, and Session Requirements (duration, room type, equipment). |
| **Lab Manager** | `lab@tanseek.test` | Infrastructure. Owns Room/Lab CRUD, reviews lab requirements, and confirms candidate spaces. |
| **Lecturer** | `lecturer@tanseek.test` | Availability. Submits and confirms Available/Preferred teaching slots. |
| **Teaching Assistant** | `ta@tanseek.test` | Availability. Submits and confirms Available/Preferred teaching slots. |
| **Student** | `student@tanseek.test` | End User. Views personal published timetable filtered by active enrollments (never sees draft allocations). |

## Core Workflows

*   **Public vs. Authenticated:** The app opens to a public Level/Section timetable landing page for unauthenticated users. A top-right login icon accesses staff and student portals.
*   **Draft to Publish Lifecycle:**
    1.  Scheduler opens **Timetable** and generates a draft.
    2.  Hard conflicts (overlaps in room, instructor, or section) block publication. Scheduler uses the **Conflicts** tab to resolve them.
    3.  Scheduler clicks **Submit for Admin review**.
    4.  Admin reviews and clicks **Publish version**.
*   **Authentication & Self-Service:** Every authenticated user has a Profile Settings menu to update their display name and change their password.
*   **Forgot Password:** Available on the login screen. Mock mode uses reset code `123456`. Responses are intentionally generic to prevent email enumeration.

## UI / UX & Branding

**Theme & Localization**
*   **Light/Dark Mode:** Persists in `localStorage` (defaults to OS preference). Dark mode uses custom dark surfaces for tables, dropdowns, and timetable cards.
*   **i18n:** English/Arabic language switching available globally. Arabic mode enforces RTL and uses the **Alexandria** font.
*   **Layout:** Sidebar is vertically scrollable and responsive. Dashboard metrics dynamically adapt to the authenticated role.

**Brand Palette**
*   Navy: `#142B43`
*   Teal: `#15A6A0`
*   Warm alert: `#B76A25`
*   Ink: `#20364A`
*   Muted: `#607383`
*   Canvas: `#F2F6F7`
*   Spacing: 8px rhythm with explicit status labels.

## System Rules & Constraints

*   **Fixed Scheduling Slots:** Master Data enforces standard slots: Sat-Wed, 09:00-17:00, four 2-hour slots, no breaks.
*   **Data Separation:** Course/Section creation is handled separately from Coordinator Requirements (which define session type, weekly count, room/lab type, and equipment).
*   **Real-time Scroll/Focus:** Creating new requirements or resetting forms smoothly scrolls the user to the blank editor and auto-focuses the primary input field.
