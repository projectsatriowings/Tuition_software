# TuitionOS — Enterprise Tuition Management System Architecture

## 1. System Overview
TuitionOS is an enterprise-grade, multi-tenant Tuition Management System built to support multiple tuition institutes on a single secure platform. It provides dedicated role-based portals and workflows for:
- **Super Admin**: Platform oversight, institute onboarding, subscription/status lifecycle, audit logs.
- **Academic Admin**: Institute operations, staff management, batch/subject allocations, fee structures, financial & academic reporting.
- **Staff**: Student admissions, attendance (manual/QR/voice-assisted), learning materials, homework, exams & marks, parent communications.
- **Parent**: Multi-child view, attendance check-in/out timestamps, exam performance, fee dues & receipts, direct staff messaging, feedback.
- **Student**: Subject notes, homework, announcements, timetable, progress reports, attendance history.

## 2. Multi-Tenant Architecture & Security Model
- **Tenant Isolation**: Every operational entity (`Student`, `StaffProfile`, `Batch`, `Subject`, `AttendanceEvent`, `FeeStructure`, `Payment`, `LearningMaterial`, `Conversation`) is bound to an `InstituteId`.
- **Server-Side Enforcement**: Tenant resolution is derived strictly from verified JWT claims and validated `InstituteMembership` records. Frontend-supplied tenant parameters are never trusted.
- **Role-Based Access Control (RBAC)**: Strict role hierarchy enforced via backend middleware.
- **Financial Integrity**: Monetary transactions use exact SQL `DECIMAL(10, 2)` representations. Payments are immutable with auditable adjustments/refunds.
- **Attendance State Validation**: Unique constraint `[studentId, eventDate, eventType]` prevents duplicate check-ins or check-outs on the same day.

## 3. Technology Stack
- **Monorepo**: npm workspaces (`server`, `apps/web`, `apps/mobile`, `packages/shared`, `docs`)
- **Backend**: Node.js, Express, TypeScript, Helmet, CORS, Argon2id, Zod request schemas.
- **Database**: Neon Serverless PostgreSQL with Prisma ORM.
- **Web Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons.
- **Mobile**: React Native with Expo (aligned with shared REST contracts).

## 4. Phase 3 Implemented API Endpoints

### Super Admin & Institutes
- `GET /api/institutes` — Search, filter by status, pagination (SUPER_ADMIN only).
- `POST /api/institutes` — Create institute + initial Academic Admin in a single ACID transaction (SUPER_ADMIN only).
- `GET /api/institutes/:id` — Details of institute, counts of students, staff, batches.
- `PATCH /api/institutes/:id` — Update institute details (SUPER_ADMIN or ACADEMIC_ADMIN of that institute).
- `PATCH /api/institutes/:id/status` — Activate / Suspend institute (SUPER_ADMIN only).
- `GET /api/institutes/dashboard/summary` — Platform metrics (SUPER_ADMIN) or institute-scoped metrics (ACADEMIC_ADMIN).

### Staff & Faculty
- `GET /api/staff` — List staff members scoped to caller's institute.
- `POST /api/staff` — Provision staff user + StaffProfile + InstituteMembership with secure temporary password.
- `GET /api/staff/:id` — Get staff profile by ID.
- `PATCH /api/staff/:id` — Update staff designation, qualifications, permissions.
- `PATCH /api/staff/:id/status` — Activate / Deactivate staff account.
- `POST /api/staff/:id/assignments` — Assign staff to batches.

### Students
- `GET /api/students` — List students with filters (ACTIVE, PASSED_OUT, DISCONTINUED), batch filter, search, pagination.
- `POST /api/students` — Admit student with unique admission number, roll number, DOB, gender, and batch enrollment.
- `GET /api/students/:id` — Detailed student profile with enrollments and linked guardians.
- `PATCH /api/students/:id` — Update student profile.
- `PATCH /api/students/:id/status` — Update academic status (ACTIVE, PASSED_OUT, DISCONTINUED) with audit history.

### Parents & Guardian Linking
- `GET /api/parents` — List parents in institute.
- `POST /api/parents` — Provision parent user + ParentProfile + InstituteMembership.
- `POST /api/parents/students/:studentId/guardians` — Link parent to student (relation: FATHER, MOTHER, GUARDIAN, primary contact flag, SMS notification flag).
- `DELETE /api/parents/students/:studentId/guardians/:parentId` — Revoke guardian link.
- `GET /api/parents/my/children` — Parent portal: retrieve authorized linked children only.

### Academics (Batches & Subjects)
- `GET /api/academics/batches` — List batches.
- `POST /api/academics/batches` — Create class batch (name, academic year).
- `GET /api/academics/subjects` — List curriculum subjects.
- `POST /api/academics/subjects` — Create curriculum subject.

### Phase 4: Attendance & QR Operations
- `POST /api/attendance/check-in` — Record student check-in with transition validation, late arrival marking, session tracking, and automated guardian SMS.
- `POST /api/attendance/check-out` — Record student check-out with active check-in validation.
- `GET /api/attendance/summary` — Batch-wise and date-wise attendance state, live counts (total, present, checked-in, checked-out, late, absent).
- `GET /api/attendance/reports` — Attendance history reports with date ranges, batch filters, and late arrivals.
- `GET /api/attendance/students/:studentId/qr` — Generate cryptographic signed QR attendance pass.
- `POST /api/attendance/qr/scan` — Verify scanned QR code payload, match student, and suggest next action (Check-In / Check-Out).
- `PATCH /api/attendance/:eventId/correction` — Authorized attendance event correction preserving full audit trail in `AuditLog`.

### Phase 4: SMS Notifications (Outbox & Provider)
- `GET /api/notifications/sms` — Administrative outbox log of guardian SMS alerts (status, recipient, message text, retry count).
- `GET /api/notifications/sms/:id` — Notification details.
- `POST /api/notifications/sms/:id/retry` — Manually retry failed SMS notification.
