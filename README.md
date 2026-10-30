# Brightcode Institute — Student Portal & Project Showcase

A full-stack Next.js (App Router) + PostgreSQL (Drizzle ORM) application for a
computer training institute: a public student project showcase plus a secure
private academic dashboard, and a complete admin/teacher back office.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4 (custom premium dark navy / electric blue theme)
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Custom secure session cookies (HTTP-only, signed JWT via `jose`),
  passwords hashed with `bcryptjs`
- **Charts:** Recharts
- **Icons:** lucide-react
- **File storage:** Private on-disk storage (`storage/uploads`), served only
  through an authorization-checked API route (`/api/files/[id]`) — never
  exposed as static/public files

## Environment Variables

Copy/confirm the following in `.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret used to sign session JWTs — change in production |
| `FILE_STORAGE_DIR` | Directory for uploaded project files (default `./storage/uploads`) |
| `INITIAL_ADMIN_EMAIL` | Email for the auto-created initial administrator |
| `INITIAL_ADMIN_PASSWORD` | Password for the auto-created initial administrator |

**Important:** Change `SESSION_SECRET` and `INITIAL_ADMIN_PASSWORD` before any
real deployment, and rotate the admin password after first login.

## Setup

```bash
npm install
npx drizzle-kit push        # creates all tables from src/db/schema.ts
npx tsx src/db/seed.ts       # creates the initial admin + clearly labeled demo data
npm run build
npm run start
```

## Demo Data Disclaimer

`src/db/seed.ts` creates:
1. One **real** initial administrator account, from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`.
2. A clearly labeled set of **DEMO** records (`isDemo = true` on the `students`
   table, names suffixed with "(Demo)"): a demo teacher, two demo courses with
   syllabus, demo students, demo tests, demo attendance, and demo projects.

Demo data is NOT real student information and should be removed before
production use (`DELETE FROM students WHERE is_demo = true;` cascades to
related records).

### Demo Credentials (seed output)

- **Admin:** value of `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`
- **Demo Teacher:** `demo.teacher@institute.edu` / `Demo@12345`
- **Demo Student:** Student ID `STU2024001` / `Demo@12345` (forced password
  change on first login)

## Architecture Overview

- `src/db/schema.ts` — full relational schema (users, students, courses,
  enrollments, modules/topics, per-student topic progress, tests & results,
  class sessions & attendance, projects & attachments, teacher feedback,
  notifications, teacher-course assignments, audit logs).
- `src/lib/auth.ts` — password hashing + signed session cookie helpers.
- `src/lib/authz.ts` — server-side role & course-scoping guards used by every
  protected API route (`requireRole`, `requireStudentSelf`, `requireCourseAccess`).
- `src/lib/calculations.ts` — single source of truth for syllabus completion,
  test percentage/normalization, and attendance percentage math — calculated
  live from the database on every request (never cached/duplicated), so the
  dashboard and syllabus/test/attendance pages always agree.
- `src/middleware.ts` — redirects unauthenticated/unauthorized users away from
  `/dashboard/*` and `/admin/*`.
- `src/app/api/student/*` — student-only endpoints; the student id always
  comes from the verified session, never from client input, so a student can
  never read another student's records by editing a URL.
- `src/app/api/admin/*` — admin/teacher endpoints; teachers are restricted to
  their assigned courses via `teacher_assignments`.
- `src/app/api/files/[id]` — the only way to read an uploaded project file;
  public only if the parent project is published, otherwise restricted to the
  owning student or staff.

## Security Notes

- Students cannot edit marks, attendance, or syllabus status — all mutation
  endpoints for those resources require `admin`/`teacher` roles plus course
  assignment checks for teachers.
- Public search (`/api/search/students`) never reveals whether a private
  account exists or any private academic data — only name/Student ID/basic
  enrolled course names, and real access requires a password.
- All administrative mutations are written to `audit_logs`.
- Uploaded files are validated by MIME type (JPG/JPEG/PNG/PDF only) and size
  (10MB max) before being stored outside the public web root.

## Testing the End-to-End Flow

1. Sign in to `/admin/login` with the administrator credentials.
2. Go to **Students** → add a student (a temporary password is generated).
3. Go to **Courses & Syllabus** → create a course, add modules/topics.
4. Open the student's detail page → enroll them in the course, update topic
   statuses, and watch the automatically computed completion percentage.
5. Go to **Tests & Marks** → create a test and enter marks; percentages are
   computed automatically.
6. Go to **Attendance** → create sessions and mark attendance.
7. Go to **Projects** → upload a JPG/PNG/PDF project, choose whether to
   publish it to the homepage and whether to show the student's name.
8. Visit `/` and search for the student by ID or name, then sign in at
   `/login` with the temporary password to view the live dashboard.
