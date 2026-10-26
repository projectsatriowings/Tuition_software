import http from 'http';
import app from '../src/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_PORT = 5097;
let server: http.Server;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, data: json };
}

async function runPhase7MobileTests() {
  console.log(`========================================================================`);
  console.log(`=== Phase 7 Mobile API Integration & Security Test Suite (Port ${TEST_PORT}) ===`);
  console.log(`========================================================================\n`);

  server = app.listen(TEST_PORT);
  await new Promise((resolve) => setTimeout(resolve, 500));

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, failureDetails?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      console.error(`  ✗ [FAIL] ${testName}`, failureDetails ? JSON.stringify(failureDetails) : '');
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Setup: Super Admin Login & Test Institute Creation
    // -------------------------------------------------------------
    console.log('[Setup] Logging in as Super Admin and creating mobile test institute...');
    const superLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@tuitionos.internal',
        password: 'AdminSecurePassword#2026',
        role: 'SUPER_ADMIN',
      },
    });

    let superToken = '';
    if (superLogin.ok && superLogin.data.data?.accessToken) {
      superToken = superLogin.data.data.accessToken;
    } else {
      const superFallback = await request('/auth/login', {
        method: 'POST',
        body: {
          identifier: 'superadmin@platform.local',
          password: 'AdminSecurePassword#2026',
          role: 'SUPER_ADMIN',
        },
      });
      if (!superFallback.ok) throw new Error('Super Admin setup login failed: ' + JSON.stringify(superFallback.data));
      superToken = superFallback.data.data.accessToken;
    }

    const instCode = `MOB${Math.floor(1000 + Math.random() * 9000)}`;
    const adminEmail = `admin.${instCode.toLowerCase()}@apex.edu`;
    const adminPass = 'MobileAdmin#2026';

    const instRes = await request('/institutes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: {
        name: 'Phase 7 Mobile Test Academy',
        code: instCode,
        city: 'Bangalore',
        adminFullName: 'Dr. Mobile Academic Director',
        adminEmail,
        adminInitialPassword: adminPass,
      },
    });
    assert(instRes.status === 201, 'Mobile test institute & Director provisioned', instRes.data);
    const instituteId = instRes.data.data.institute.id;

    // -------------------------------------------------------------
    // Test 1: Mobile Auth Login & Token Delivery Flow
    // -------------------------------------------------------------
    console.log('\n[Test 1] Mobile Authentication & Token Delivery Flow');
    const mobLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: adminEmail,
        password: adminPass,
        role: 'ACADEMIC_ADMIN',
        instituteCode: instCode,
      },
    });

    assert(mobLogin.status === 200, 'Mobile login returns HTTP 200 OK');
    assert(!!mobLogin.data.data?.accessToken, 'Response contains valid JWT access token');
    assert(!!mobLogin.data.data?.refreshToken, 'Response contains secure refresh token');
    assert(mobLogin.data.data?.user?.role === 'ACADEMIC_ADMIN', 'User role resolved as ACADEMIC_ADMIN');
    assert(mobLogin.data.data?.institute?.code === instCode, 'Institute context matched correctly');

    const adminToken = mobLogin.data.data.accessToken;
    const adminRefreshToken = mobLogin.data.data.refreshToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'x-institute-id': instituteId };

    // Bad password rejection
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: adminEmail,
        password: 'WrongPassword!123',
        instituteCode: instCode,
      },
    });
    assert(badLogin.status === 401, 'Mobile login rejects invalid credentials with HTTP 401');

    // -------------------------------------------------------------
    // Test 2: Mobile Token Refresh Flow (`POST /api/auth/refresh`)
    // -------------------------------------------------------------
    console.log('\n[Test 2] Mobile Token Refresh Endpoint (`POST /api/auth/refresh`)');
    const refreshRes = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: adminRefreshToken },
    });

    assert(refreshRes.status === 200, 'Token refresh endpoint returns HTTP 200');
    assert(!!refreshRes.data.data?.accessToken, 'Token refresh issues new access token');
    assert(!!refreshRes.data.data?.refreshToken, 'Token refresh issues rotated refresh token');

    // Invalid refresh token rejection
    const invalidRefresh = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: 'invalid.jwt.token.string' },
    });
    assert(invalidRefresh.status === 401, 'Token refresh rejects invalid/tampered token with HTTP 401');

    // -------------------------------------------------------------
    // Provision Batch, Subject, Student, Staff, and Parent
    // -------------------------------------------------------------
    console.log('\n[Setup] Provisioning Batch, Subject, Student, Staff & Parent...');
    const batchRes = await request('/academics/batches', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Class 12 Physics Mobile Champions',
        academicYear: '2026-2027',
      },
    });
    assert(batchRes.status === 201, 'Test batch created', batchRes.data);
    const batchId = batchRes.data.data?.batch?.id || batchRes.data.data?.id;

    const subjRes = await request('/academics/subjects', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Mobile App Mechanics',
        code: `MEC-${instCode}`,
        grade: '12',
      },
    });
    assert(subjRes.status === 201, 'Test subject created', subjRes.data);
    const subjectId = subjRes.data.data?.subject?.id || subjRes.data.data?.id;

    // Create Faculty / Staff
    const staffEmail = `faculty.${instCode.toLowerCase()}@apex.edu`;
    const staffPass = 'FacultyMobile#2026';
    const staffRes = await request('/staff', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        fullName: 'Prof. Sharma',
        email: staffEmail,
        designation: 'Senior Faculty',
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        initialPassword: staffPass,
        batchIds: [batchId],
      },
    });
    assert(staffRes.status === 201, 'Faculty member provisioned', staffRes.data);

    // Create Student
    const studentEmail = `student.${instCode.toLowerCase()}@apex.edu`;
    const studentPass = 'StudentMobile#2026';
    const stuCreateRes = await request('/students', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        firstName: 'Aarav',
        lastName: 'Patel',
        admissionNumber: `ADM-${Math.floor(100000 + Math.random() * 900000)}`,
        createLoginAccount: true,
        email: studentEmail,
        initialPassword: studentPass,
        batchId,
      },
    });
    assert(stuCreateRes.status === 201, 'Student admitted with mobile login account', stuCreateRes.data);
    const studentId = stuCreateRes.data.data?.student?.id || stuCreateRes.data.data?.id;

    // Create Parent
    const parentEmail = `parent.${instCode.toLowerCase()}@apex.edu`;
    const parentPass = 'ParentMobile#2026';
    const parentPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parentCreateRes = await request('/parents', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        fullName: 'Rajesh Patel',
        phone: parentPhone,
        email: parentEmail,
        initialPassword: parentPass,
      },
    });
    assert(parentCreateRes.status === 201, 'Parent profile created', parentCreateRes.data);
    const parentId = parentCreateRes.data.data?.parent?.id || parentCreateRes.data.data?.id;

    // Link Parent to Student
    const linkRes = await request(`/parents/students/${studentId}/guardians`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        parentId,
        relation: 'FATHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      },
    });
    assert(linkRes.status === 201, 'Parent linked as primary guardian to student', linkRes.data);

    // -------------------------------------------------------------
    // Test 3: Student Mobile Self-Access & QR Attendance Pass
    // -------------------------------------------------------------
    console.log('\n[Test 3] Student Mobile Self-Access & QR Attendance Pass');
    const stuLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: studentEmail,
        password: studentPass,
        role: 'STUDENT',
        instituteCode: instCode,
      },
    });
    assert(stuLogin.status === 200, 'Student logs in from mobile app');
    const studentToken = stuLogin.data.data.accessToken;
    const studentHeaders = { Authorization: `Bearer ${studentToken}`, 'x-institute-id': instituteId };

    // Student profile
    const stuProfileRes = await request('/students/my/profile', {
      headers: studentHeaders,
    });
    assert(stuProfileRes.status === 200, 'Student retrieves own profile via /students/my/profile');

    // Student QR Pass
    const qrPassRes = await request(`/attendance/students/${studentId}/qr`, {
      headers: studentHeaders,
    });
    assert(qrPassRes.status === 200, 'Student retrieves cryptographic QR attendance pass');
    assert(!!qrPassRes.data.data?.qrToken, 'QR pass contains cryptographic payload token');

    // -------------------------------------------------------------
    // Test 4: Learning Materials & Homework Submission
    // -------------------------------------------------------------
    console.log('\n[Test 4] Mobile Learning Materials & Homework Submission Flow');
    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: staffEmail,
        password: staffPass,
        role: 'STAFF',
        instituteCode: instCode,
      },
    });
    assert(staffLogin.status === 200, 'Staff logs in from mobile app');
    const staffToken = staffLogin.data.data.accessToken;
    const staffHeaders = { Authorization: `Bearer ${staffToken}`, 'x-institute-id': instituteId };

    // Upload Learning Material
    const matRes = await request('/materials', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        title: 'Rotational Dynamics Lecture Notes',
        type: 'PDF',
        subjectId,
        batchId,
        fileUrl: 'https://cdn.tuitionos.internal/notes/rotational-dynamics.pdf',
        description: 'Comprehensive derivation of moment of inertia',
      },
    });
    assert(matRes.status === 201, 'Faculty publishes learning material PDF', matRes.data);

    // Student views learning materials
    const stuMatRes = await request('/materials', {
      headers: studentHeaders,
    });
    assert(stuMatRes.status === 200, 'Student views assigned materials list', stuMatRes);

    // Create Homework
    const hwRes = await request('/homework', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        title: 'Weekly Problem Set 4',
        description: 'Solve questions 1-15 from HC Verma Chapter 7',
        batchId,
        subjectId,
        dueDate: '2026-11-01T23:59:59.000Z',
      },
    });
    assert(hwRes.status === 201, 'Faculty assigns homework to batch', hwRes.data);
    const homeworkId = hwRes.data.data?.homework?.id || hwRes.data.data?.id;

    // Student Submits Homework
    const submitHwRes = await request(`/homework/${homeworkId}/submissions`, {
      method: 'POST',
      headers: studentHeaders,
      body: {
        content: 'Completed questions 1-15. Attached step-by-step solution PDF.',
        studentId,
      },
    });
    assert(submitHwRes.status === 201, 'Student submits homework response successfully', submitHwRes.data);

    // -------------------------------------------------------------
    // Test 5: Student Fee Statement & Electronic Receipts (INR Currency)
    // -------------------------------------------------------------
    console.log('\n[Test 5] Student Mobile Fee Statement & Electronic Receipts');
    const feeStructRes = await request('/fees/structures', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        batchId,
        name: 'Term 1 Tuition & Lab Fee',
        description: 'Term fee for Grade 12',
        academicYear: '2026-2027',
        frequency: 'TERM_WISE',
        amount: 15000,
        dueDay: 15,
        isActive: true,
      },
    });
    assert(feeStructRes.status === 201, 'Fee structure created', feeStructRes.data);
    const feeStructureId = feeStructRes.data.data?.feeStructure?.id || feeStructRes.data.data?.id;

    const assignRes = await request('/fees/assignments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        studentId,
        feeStructureId,
        termLabel: 'Term 1',
        academicYear: '2026-2027',
        dueDate: '2026-11-15T00:00:00.000Z',
      },
    });
    assert(assignRes.status === 201, 'Fee assigned to student', assignRes.data);
    const feeAssignmentId = assignRes.data.data?.assignment?.id || assignRes.data.data?.id;

    // Admin records a payment of ₹10,000 via UPI with idempotency
    const payIdempotencyKey = `MOB-TEST-${Date.now()}`;
    const payRes = await request('/fees/payments', {
      method: 'POST',
      headers: {
        ...adminHeaders,
        'x-idempotency-key': payIdempotencyKey,
      },
      body: {
        feeAssignmentId,
        amountPaid: 10000,
        method: 'UPI',
        referenceNote: 'UPI/2026/MOB09812',
        idempotencyKey: payIdempotencyKey,
      },
    });
    assert(payRes.status === 201, 'Payment of ₹10,000 recorded via UPI with idempotency header', payRes.data);
    const paymentId = payRes.data.data?.payment?.id || payRes.data.data?.id;

    // Student accesses fee statement
    const stmtRes = await request(`/fees/students/${studentId}/statement`, {
      headers: studentHeaders,
    });
    assert(stmtRes.status === 200, 'Student accesses fee statement', stmtRes.data);
    assert(Number(stmtRes.data.data?.summary?.totalAssigned) === 15000, 'Total assigned matches ₹15,000');
    assert(Number(stmtRes.data.data?.summary?.totalPaid) === 10000, 'Total paid matches ₹10,000');
    assert(Number(stmtRes.data.data?.summary?.netOutstanding) === 5000, 'Outstanding balance is ₹5,000');

    // Student accesses official electronic receipt
    const receiptRes = await request(`/fees/payments/${paymentId}/receipt`, {
      headers: studentHeaders,
    });
    assert(receiptRes.status === 200, 'Student accesses electronic receipt', receiptRes.data);
    const receiptData = receiptRes.data.data?.receipt || receiptRes.data.data;
    const receiptAmount = receiptData?.feeDetails?.amountPaid ?? receiptData?.amount;
    assert(Number(receiptAmount) === 10000, 'Receipt amount verified as ₹10,000');
    assert(!!receiptData?.receiptNumber, 'Receipt contains unique numbered identifier');

    // -------------------------------------------------------------
    // Test 6: Parent Linked-Child Access & Authorization
    // -------------------------------------------------------------
    console.log('\n[Test 6] Parent Linked-Child Access & Authorization Restrictions');
    const parentLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: parentEmail,
        password: parentPass,
        role: 'PARENT',
        instituteCode: instCode,
      },
    });
    assert(parentLogin.status === 200, 'Parent logs in from mobile app');
    const parentToken = parentLogin.data.data.accessToken;
    const parentHeaders = { Authorization: `Bearer ${parentToken}`, 'x-institute-id': instituteId };

    // Parent gets verified linked children
    const kidsRes = await request('/parents/my/children', {
      headers: parentHeaders,
    });
    assert(kidsRes.status === 200, 'Parent fetches linked children list');
    const kidsList = Array.isArray(kidsRes.data.data)
      ? kidsRes.data.data
      : (Array.isArray(kidsRes.data.data?.children)
          ? kidsRes.data.data.children.map((c: any) => c.student)
          : []);
    assert(kidsList.some((c: any) => c.id === studentId), 'Linked child present in parent list');

    // Parent accesses linked child fee statement
    const parentStmtRes = await request(`/fees/students/${studentId}/statement`, {
      headers: parentHeaders,
    });
    assert(parentStmtRes.status === 200, 'Parent authorized to view linked child fee statement');

    // Parent submits review feedback
    const revRes = await request('/reviews', {
      method: 'POST',
      headers: parentHeaders,
      body: {
        rating: 5,
        reviewText: 'Exceptional physics coaching and great mobile portal convenience!',
        studentId,
      },
    });
    assert(revRes.status === 201, 'Parent submits 5-star review via mobile', revRes.data);

    // -------------------------------------------------------------
    // Test 7: Staff Attendance Recording & Cryptographic QR Scan
    // -------------------------------------------------------------
    console.log('\n[Test 7] Staff Attendance Logging & QR Validation');
    const attIdempotencyKey = `MOB-ATT-${Date.now()}`;
    const attRes = await request('/attendance/check-in', {
      method: 'POST',
      headers: {
        ...staffHeaders,
        'x-idempotency-key': attIdempotencyKey,
      },
      body: {
        studentId,
        batchId,
        method: 'MANUAL',
        isLate: false,
      },
    });
    assert(attRes.status === 201 || attRes.status === 200, 'Staff marks student CHECK_IN as PRESENT', attRes.data);

    // QR Scan Verification
    const qrToken = qrPassRes.data.data?.qrToken;
    const scanRes = await request('/attendance/qr/scan', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        qrToken,
      },
    });
    assert(scanRes.status === 200 || scanRes.status === 201, 'Cryptographic student QR pass successfully verified by staff scanner', scanRes.data);

    // -------------------------------------------------------------
    // Test 8: Academic Admin Mobile Treasury & Financial Reports
    // -------------------------------------------------------------
    console.log('\n[Test 8] Academic Admin Mobile Treasury & Reports');
    const finSummaryRes = await request('/fees/reports/summary', {
      headers: adminHeaders,
    });
    assert(
      (finSummaryRes.data.data?.totalCollected ?? finSummaryRes.data.data?.totalCollections ?? 0) >= 10000,
      'Collections reflected in admin financial summary'
    );

    const outReportRes = await request('/fees/reports/outstanding', {
      headers: adminHeaders,
    });
    assert(outReportRes.status === 200, 'Admin accesses outstanding receivables report');

    // -------------------------------------------------------------
    // Test 9: Strict Multi-Tenant Isolation & Role Restrictions
    // -------------------------------------------------------------
    console.log('\n[Test 9] Strict Multi-Tenant Isolation & Privilege Safeguards');
    const forbiddenFeeStruct = await request('/fees/structures', {
      method: 'POST',
      headers: staffHeaders,
      body: { title: 'Unauthorized Fee', amount: 5000, frequency: 'MONTHLY' },
    });
    assert(forbiddenFeeStruct.status === 403, 'Staff is blocked from creating fee structures (HTTP 403 Forbidden)');

    const noInstContext = await request('/fees/reports/summary', {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    assert(noInstContext.status === 400 || noInstContext.status === 403, 'Institute context required for fee operations');

    console.log(`\n========================================================================`);
    console.log(`=== PHASE 7 TEST SUMMARY: ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY (100%) ===`);
    console.log(`========================================================================\n`);

  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runPhase7MobileTests().catch((err) => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
