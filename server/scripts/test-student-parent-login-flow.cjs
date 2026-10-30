/**
 * TuitionOS - Student & Parent Authentication and Navigation Validation Suite
 * Verifies that Student and Parent users navigate directly to their dashboards,
 * cannot access forced password change screens or APIs, and staff credential
 * management remains fully authorized.
 */
require('dotenv').config({ path: 'server/.env' });
const http = require('node:http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000/api${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Client-side navigation resolution logic from apps/mobile/App.tsx and AuthContext.tsx
function resolveMobileNavigation(user, mustChangePassword) {
  const isStudentOrParent = user?.role === 'STUDENT' || user?.role === 'PARENT';
  const needsPasswordChange = !isStudentOrParent && !!mustChangePassword;

  if (needsPasswordChange && !isStudentOrParent) {
    return 'ChangePasswordScreen';
  }

  switch (user?.role) {
    case 'STUDENT':
      return 'StudentScreen';
    case 'PARENT':
      return 'ParentScreen';
    case 'STAFF':
      return 'StaffScreen';
    case 'ACADEMIC_ADMIN':
      return 'AdminScreen';
    case 'SUPER_ADMIN':
      return 'SuperAdminScreen';
    default:
      return 'UnknownRoleScreen';
  }
}

let total = 0;
let passed = 0;

function assert(condition, testName, detail = '') {
  total++;
  if (condition) {
    console.log(`  [PASS] Test ${total}: ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] Test ${total}: ${testName} ${detail ? '(' + detail + ')' : ''}`);
  }
}

async function run() {
  console.log('\n================================================================');
  console.log('TuitionOS Mobile — Student & Parent Login and Security Suite');
  console.log('================================================================\n');

  try {
    // Lookup demo student, parent, staff, admin from database
    const studentUser = await prisma.user.findFirst({ where: { email: 'student@apex.example.com' } });
    const parentUser = await prisma.user.findFirst({ where: { email: 'parent@apex.example.com' } });
    const staffUser = await prisma.user.findFirst({ where: { email: 'teacher@apex.example.com' } });
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@apex.example.com' } });
    
    // Sharika is assigned to Anita Verma's batch
    const assignedStudent = await prisma.student.findFirst({
      where: {
        enrollments: {
          some: {
            batchId: 'e519b639-fbdb-41e9-98f8-c636cda46120',
            subjectId: '7ea0898b-696a-41cf-8c6d-b8ae9c748a31',
          },
        },
      },
    });

    const assignedParentRel = assignedStudent ? await prisma.studentParentRelation.findFirst({
      where: { studentId: assignedStudent.id },
      include: { parent: true },
    }) : null;

    if (!studentUser || !parentUser || !staffUser || !adminUser) {
      throw new Error('Required test accounts not found in database. Please run seed script.');
    }

    // 1. Student Login Direct Dashboard Navigation
    console.log('--- 1. Student Login & Dashboard Navigation ---');
    const studentLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'student@apex.example.com',
        password: 'Password#123',
      },
    });

    assert(
      studentLoginRes.status === 200 && studentLoginRes.data?.success === true,
      'Student login succeeds with 200 OK'
    );
    assert(
      studentLoginRes.data?.data?.mustChangePassword === false &&
      studentLoginRes.data?.data?.user?.mustChangePassword === false,
      'Student login response explicitly sets mustChangePassword: false'
    );
    const studentNavTarget = resolveMobileNavigation(
      studentLoginRes.data?.data?.user,
      studentLoginRes.data?.data?.mustChangePassword
    );
    assert(
      studentNavTarget === 'StudentScreen',
      'Student navigates directly to StudentScreen (Student Dashboard), bypassing password update'
    );

    const studentToken = studentLoginRes.data?.data?.accessToken;

    // 2. Parent Login Direct Dashboard Navigation
    console.log('\n--- 2. Parent Login & Dashboard Navigation ---');
    const parentLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'parent@apex.example.com',
        password: 'Password#123',
      },
    });

    assert(
      parentLoginRes.status === 200 && parentLoginRes.data?.success === true,
      'Parent login succeeds with 200 OK'
    );
    assert(
      parentLoginRes.data?.data?.mustChangePassword === false &&
      parentLoginRes.data?.data?.user?.mustChangePassword === false,
      'Parent login response explicitly sets mustChangePassword: false'
    );
    const parentNavTarget = resolveMobileNavigation(
      parentLoginRes.data?.data?.user,
      parentLoginRes.data?.data?.mustChangePassword
    );
    assert(
      parentNavTarget === 'ParentScreen',
      'Parent navigates directly to ParentScreen (Parent Dashboard), bypassing password update'
    );

    const parentToken = parentLoginRes.data?.data?.accessToken;

    // 3. App Restart & Session Restoration
    console.log('\n--- 3. App Restart & Session Restoration ---');
    const studentMeRes = await request('/auth/me', { token: studentToken });
    assert(
      studentMeRes.status === 200 && studentMeRes.data?.data?.user?.mustChangePassword === false,
      'Student /auth/me returns mustChangePassword: false on session restoration'
    );
    const restoredStudentTarget = resolveMobileNavigation(
      studentMeRes.data?.data?.user,
      studentMeRes.data?.data?.user?.mustChangePassword
    );
    assert(
      restoredStudentTarget === 'StudentScreen',
      'Student session restore navigates directly to StudentScreen without redirect to password change'
    );

    const parentMeRes = await request('/auth/me', { token: parentToken });
    assert(
      parentMeRes.status === 200 && parentMeRes.data?.data?.user?.mustChangePassword === false,
      'Parent /auth/me returns mustChangePassword: false on session restoration'
    );
    const restoredParentTarget = resolveMobileNavigation(
      parentMeRes.data?.data?.user,
      parentMeRes.data?.data?.user?.mustChangePassword
    );
    assert(
      restoredParentTarget === 'ParentScreen',
      'Parent session restore navigates directly to ParentScreen without redirect to password change'
    );

    // 4. Student Cannot Change/Reset Password via API
    console.log('\n--- 4. Student Self-Service Password Protection ---');
    const studentChangeRes = await request('/auth/change-password', {
      method: 'POST',
      token: studentToken,
      body: {
        currentPassword: 'Password#123',
        newPassword: 'NewHackedPassword#2026',
      },
    });
    assert(
      studentChangeRes.status === 403 &&
      studentChangeRes.data?.error?.includes('Forbidden'),
      'Student calling /auth/change-password is strictly rejected with HTTP 403 Forbidden'
    );

    // 5. Parent Cannot Change/Reset Password via API
    console.log('\n--- 5. Parent Self-Service Password Protection ---');
    const parentChangeRes = await request('/auth/change-password', {
      method: 'POST',
      token: parentToken,
      body: {
        currentPassword: 'Password#123',
        newPassword: 'NewHackedPassword#2026',
      },
    });
    assert(
      parentChangeRes.status === 403 &&
      parentChangeRes.data?.error?.includes('Forbidden'),
      'Parent calling /auth/change-password is strictly rejected with HTTP 403 Forbidden'
    );

    // 6. Authorized Staff & Admin Credential Management
    console.log('\n--- 6. Authorized Staff & Admin Credential Management ---');
    const staffLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'teacher@apex.example.com',
        password: 'Password#123',
      },
    });
    const staffToken = staffLoginRes.data?.data?.accessToken;

    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@apex.example.com',
        password: 'Password#123',
      },
    });
    const adminToken = adminLoginRes.data?.data?.accessToken;

    if (assignedStudent) {
      const resetStudentRes = await request(`/students/${assignedStudent.id}/reset-password`, {
        method: 'POST',
        token: staffToken,
        body: { newPassword: 'Password#123' },
      });
      assert(
        resetStudentRes.status === 200 && resetStudentRes.data?.success === true,
        'Staff can successfully reset Student password for students in their assigned batch'
      );
      assert(
        resetStudentRes.data?.data?.mustChangePassword === false,
        'Reset student credentials sets mustChangePassword: false for permanent staff-managed access'
      );
    }

    if (assignedParentRel?.parent) {
      const resetParentRes = await request(`/parents/${assignedParentRel.parent.id}/reset-password`, {
        method: 'POST',
        token: staffToken,
        body: { newPassword: 'Password#123' },
      });
      assert(
        resetParentRes.status === 200 && resetParentRes.data?.success === true,
        'Staff can successfully reset Parent password for parents of assigned students'
      );
      assert(
        resetParentRes.data?.data?.mustChangePassword === false,
        'Reset parent credentials sets mustChangePassword: false for permanent staff-managed access'
      );
    }

    // Admin reset validation
    if (assignedStudent) {
      const adminResetRes = await request(`/students/${assignedStudent.id}/reset-password`, {
        method: 'POST',
        token: adminToken,
        body: { newPassword: 'Password#123' },
      });
      assert(
        adminResetRes.status === 200 && adminResetRes.data?.success === true,
        'Academic Admin has full authority to reset student passwords'
      );
    }

    // 7. Academic Admin and Staff Authentication Flow Intact
    console.log('\n--- 7. Staff & Academic Admin Auth Flows Intact ---');
    assert(
      adminLoginRes.status === 200 && adminLoginRes.data?.data?.user?.role === 'ACADEMIC_ADMIN',
      'Academic Admin logs in successfully and receives ACADEMIC_ADMIN role'
    );
    assert(
      staffLoginRes.status === 200 && staffLoginRes.data?.data?.user?.role === 'STAFF',
      'Staff logs in successfully and receives STAFF role'
    );

    // 8. Invalid Credentials Still Fail
    console.log('\n--- 8. Authentication Failure Handling ---');
    const invalidRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'student@apex.example.com',
        password: 'WrongPassword#999',
      },
    });
    assert(
      invalidRes.status === 401 && invalidRes.data?.success === false,
      'Invalid password returns HTTP 401 Unauthorized with descriptive error'
    );

    const nonExistentRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'nonexistentuser999@test.com',
        password: 'Password#123',
      },
    });
    assert(
      nonExistentRes.status === 401 && nonExistentRes.data?.success === false,
      'Non-existent user returns HTTP 401 Unauthorized'
    );

    // 9. Session Expiry & Token Security
    console.log('\n--- 9. Session Security & Expired Token Rejection ---');
    const badTokenRes = await request('/auth/me', {
      token: 'invalid-garbage-token.signature.payload',
    });
    assert(
      badTokenRes.status === 401,
      'Malformed or invalid JWT is rejected with HTTP 401'
    );

    // 10. Unauthorized Roles Cannot Access Credential Management
    console.log('\n--- 10. Unauthorized Role Protection on Credential Endpoints ---');
    if (assignedStudent) {
      const studentAttemptReset = await request(`/students/${assignedStudent.id}/reset-password`, {
        method: 'POST',
        token: studentToken,
        body: { newPassword: 'HackedPassword#123' },
      });
      assert(
        studentAttemptReset.status === 403,
        'Student cannot call /students/:id/reset-password (HTTP 403 Forbidden)'
      );
    }

    if (assignedParentRel?.parent) {
      const parentAttemptReset = await request(`/parents/${assignedParentRel.parent.id}/reset-password`, {
        method: 'POST',
        token: parentToken,
        body: { newPassword: 'HackedPassword#123' },
      });
      assert(
        parentAttemptReset.status === 403,
        'Parent cannot call /parents/:id/reset-password (HTTP 403 Forbidden)'
      );
    }

    console.log('\n================================================================');
    console.log(`Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
    console.log('================================================================\n');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
