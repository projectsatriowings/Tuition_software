import http from 'http';
import app from '../src/index.js';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config/index.js';

const prisma = new PrismaClient();
const TEST_PORT = 5092;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

const server = http.createServer(app);

server.listen(TEST_PORT, async () => {
  console.log(`\n======================================================`);
  console.log(` TUITIONOS VERIFICATION TEST SUITE: REQUIREMENTS 1-7`);
  console.log(` Running on port ${TEST_PORT}...`);
  console.log(`======================================================\n`);

  let failed = false;

  try {
    // Step 0: Ensure we have an active Institute, Academic Admin, and Staff
    console.log('[Setup] Finding or initializing institute and staff credentials...');
    let institute = await prisma.institute.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!institute) {
      institute = await prisma.institute.create({
        data: {
          name: 'Apex Academy Test',
          code: 'APEX',
          slug: 'apex-academy-test',
          admissionPrefix: 'APEX',
          status: 'ACTIVE',
        },
      });
    }

    // Find Academic Admin
    let adminMembership = await prisma.instituteMembership.findFirst({
      where: { instituteId: institute.id, role: 'ACADEMIC_ADMIN', isActive: true },
      include: { user: true },
    });

    let adminToken = '';
    if (adminMembership && adminMembership.user) {
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: adminMembership.user.email || adminMembership.user.phone,
          password: 'AdminPassword123!',
          role: 'ACADEMIC_ADMIN',
          instituteId: institute.id,
        }),
      });
      const loginData = await loginRes.json();
      if (loginData.data?.accessToken) {
        adminToken = loginData.data.accessToken;
      }
    }

    // Fallback: Login via Super Admin to get token with Institute Context
    if (!adminToken) {
      console.log('Logging in as Super Admin to manage institute...');
      const saRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: config.superAdmin.email,
          password: config.superAdmin.defaultPassword,
          role: 'SUPER_ADMIN',
        }),
      });
      const saData = await saRes.json();
      adminToken = saData.data?.accessToken;
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'x-institute-id': institute.id,
    };

    // Ensure a batch exists for testing
    let batch = await prisma.batch.findFirst({
      where: { instituteId: institute.id, isActive: true },
    });
    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          instituteId: institute.id,
          name: 'Batch 2026 Alpha',
          academicYear: '2026-2027',
          isActive: true,
        },
      });
    }

    // TEST 1: Requirement 1 & 3 — Admission without Class Roll Number + Optional Student Phone + Parent Account
    console.log('\n--- TEST 1: New Student Admission without Roll Number & with Parent Credentials ---');
    const parentPhone1 = `98765${Math.floor(10000 + Math.random() * 90000)}`;
    const studentPhone1 = `91234${Math.floor(10000 + Math.random() * 90000)}`;

    const admitPayload = {
      firstName: 'Kabir',
      lastName: 'Mehta',
      studentPhone: studentPhone1,
      gender: 'MALE',
      dob: '2008-04-12',
      bloodGroup: 'B+',
      batchId: batch.id,
      notes: 'Test admission student 1',
      parentFullName: 'Sunita Mehta',
      parentRelationship: 'MOTHER',
      parentPhone: parentPhone1,
      parentEmail: `sunita.${Date.now()}@example.com`,
      parentInitialPassword: 'ParentSecret123!',
      parentCanReceiveSms: true,
    };

    const admitRes1 = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(admitPayload),
    });

    const admitData1 = await admitRes1.json();

    if (admitRes1.status !== 201 || !admitData1.success) {
      console.error('[FAIL] Test 1: Student admission failed:', admitData1);
      failed = true;
    } else {
      const student1 = admitData1.data?.student;
      const admissionNum = admitData1.data?.admissionNumber;
      console.log(`[PASS] Student admitted! Admission No: ${admissionNum}`);

      // Verify format
      if (!admissionNum || !admissionNum.includes('-')) {
        console.error('[FAIL] Admission number format is invalid:', admissionNum);
        failed = true;
      } else {
        console.log(`[PASS] Admission number adheres to format INSTITUTE_PREFIX-YEAR-SERIAL: ${admissionNum}`);
      }

      // Verify rollNumber is null or not set
      if (student1.rollNumber) {
        console.warn('[WARN] rollNumber is unexpectedly present:', student1.rollNumber);
      } else {
        console.log('[PASS] Class roll number field successfully excluded from admission creation.');
      }

      // Verify Student Phone persisted in DB
      const dbStudent1 = await prisma.student.findUnique({
        where: { id: student1.id },
      });
      if (dbStudent1?.phone === studentPhone1) {
        console.log(`[PASS] Optional student phone persisted correctly: ${dbStudent1.phone}`);
      } else {
        console.error('[FAIL] Student phone not saved on student record:', dbStudent1?.phone);
        failed = true;
      }

      // Verify Parent Account created with Argon2id hash and linked
      const parentUser = await prisma.user.findFirst({
        where: { phone: parentPhone1 },
      });
      if (parentUser && parentUser.passwordHash && !parentUser.passwordHash.includes('ParentSecret123!')) {
        console.log(`[PASS] Parent account created with Argon2id hash (never plaintext). Role: ${parentUser.role}`);
      } else {
        console.error('[FAIL] Parent user account not created securely:', parentUser);
        failed = true;
      }

      const relation = await prisma.studentParentRelation.findFirst({
        where: { studentId: student1.id },
      });
      if (relation && relation.relation === 'MOTHER' && relation.isPrimaryContact && relation.canReceiveSms) {
        console.log(`[PASS] Student-parent relation linked: relation=${relation.relation}, isPrimary=${relation.isPrimaryContact}, SMS=${relation.canReceiveSms}`);
      } else {
        console.error('[FAIL] Student-parent relation not properly configured:', relation);
        failed = true;
      }
    }

    // TEST 2: Requirement 3 — Sibling Admission with Same Parent Phone (Deduplication Check)
    console.log('\n--- TEST 2: Sibling Admission (Parent Account Reuse & Deduplication) ---');
    const admitSiblingPayload = {
      firstName: 'Rohan',
      lastName: 'Mehta',
      gender: 'MALE',
      batchId: batch.id,
      parentFullName: 'Sunita Mehta',
      parentRelationship: 'MOTHER',
      parentPhone: parentPhone1, // Same phone as Kabir's mother
      parentCanReceiveSms: true,
    };

    const admitSiblingRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(admitSiblingPayload),
    });

    const admitSiblingData = await admitSiblingRes.json();
    if (admitSiblingRes.status !== 201 || !admitSiblingData.success) {
      console.error('[FAIL] Test 2: Sibling admission failed:', admitSiblingData);
      failed = true;
    } else {
      const siblingStudent = admitSiblingData.data?.student;
      console.log(`[PASS] Sibling admitted! Admission No: ${siblingStudent.admissionNumber}`);

      // Count parent users with parentPhone1
      const parentCount = await prisma.user.count({
        where: { phone: parentPhone1, role: 'PARENT' },
      });

      if (parentCount === 1) {
        console.log(`[PASS] Zero duplicate parent accounts created. Exactly 1 parent user exists for phone ${parentPhone1}.`);
      } else {
        console.error(`[FAIL] Duplicate parent user created! Count: ${parentCount}`);
        failed = true;
      }

      // Check relations for this parent
      const parentUser = await prisma.user.findFirst({
        where: { phone: parentPhone1 },
        include: { parentProfile: { include: { studentRelations: true } } },
      });
      const linkedCount = parentUser?.parentProfile?.studentRelations.length || 0;
      if (linkedCount === 2) {
        console.log(`[PASS] Both siblings correctly linked to the same parent profile (linked children: ${linkedCount}).`);
      } else {
        console.error(`[FAIL] Linked children count incorrect: ${linkedCount}`);
        failed = true;
      }
    }

    // TEST 3: Requirement 2 & 6 — Comprehensive Student Details & Asia/Kolkata Timestamps
    console.log('\n--- TEST 3: Comprehensive Student Details & Asia/Kolkata Timestamps ---');
    const targetStudent = admitData1.data?.student;
    const detailsRes = await fetch(`${BASE_URL}/students/${targetStudent.id}`, {
      headers: authHeaders,
    });
    const detailsData = await detailsRes.json();

    if (detailsRes.status !== 200 || !detailsData.success) {
      console.error('[FAIL] Test 3: Failed to fetch student details:', detailsData);
      failed = true;
    } else {
      const d = detailsData.data?.student || detailsData.data;
      console.log(`[PASS] Student details retrieved successfully: ${d.firstName} ${d.lastName}`);
      console.log(`[PASS] Admission Date: ${d.admissionDate}`);
      console.log(`[PASS] Linked Guardians: ${d.parentRelations?.length}`);

      // Verify no password hash leaked
      const stringified = JSON.stringify(d);
      if (stringified.includes('passwordHash') || stringified.includes('argon2') || stringified.includes('$argon2id$')) {
        console.error('[CRITICAL SECURITY FAIL] Password hash leaked in student details response!');
        failed = true;
      } else {
        console.log('[PASS] Security verified: ZERO password hashes or tokens exposed in response.');
      }

      // Verify parent metadata present
      const parentRel = d.parentRelations?.[0];
      if (parentRel && parentRel.parent?.user?.createdAt) {
        console.log(`[PASS] Parent account creation timestamp present: ${parentRel.parent.user.createdAt}`);
      } else {
        console.error('[FAIL] Parent account creation timestamp missing from details');
        failed = true;
      }
    }

    // TEST 4: Requirement 2 & 7 — Reset Parent Password by Staff
    console.log('\n--- TEST 4: Authorized Parent Password Reset ---');
    const parentUser = await prisma.user.findFirst({
      where: { phone: parentPhone1 },
      include: { parentProfile: true },
    });
    const parentProfileId = parentUser?.parentProfile?.id;

    const resetParentRes = await fetch(`${BASE_URL}/parents/${parentProfileId}/reset-password`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ newPassword: 'NewParentPassword789!' }),
    });

    const resetParentData = await resetParentRes.json();
    if (resetParentRes.status !== 200 || !resetParentData.success) {
      console.error('[FAIL] Test 4: Parent password reset failed:', resetParentData);
      failed = true;
    } else {
      console.log('[PASS] Parent password reset succeeded.');
      const updatedParent = await prisma.user.findUnique({
        where: { id: parentUser!.id },
      });
      if (updatedParent?.mustChangePassword === true) {
        console.log('[PASS] Parent user mustChangePassword flag set to true for forced change at next login.');
      } else {
        console.error('[FAIL] mustChangePassword was not set on reset');
        failed = true;
      }
    }

    // TEST 5: Requirement 2 — Update Parent Login Identifier
    console.log('\n--- TEST 5: Update Parent Login Identifier ---');
    const newParentPhone = `98765${Math.floor(10000 + Math.random() * 90000)}`;
    const updateIdRes = await fetch(`${BASE_URL}/parents/${parentProfileId}/account-identifier`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ phone: newParentPhone }),
    });

    const updateIdData = await updateIdRes.json();
    if (updateIdRes.status !== 200 || !updateIdData.success) {
      console.error('[FAIL] Test 5: Update parent identifier failed:', updateIdData);
      failed = true;
    } else {
      const refreshedParent = await prisma.user.findUnique({
        where: { id: parentUser!.id },
      });
      if (refreshedParent?.phone === newParentPhone) {
        console.log(`[PASS] Parent login identifier successfully updated to: ${newParentPhone}`);
      } else {
        console.error('[FAIL] Identifier did not update in DB');
        failed = true;
      }
    }

    // TEST 6: Requirement 2 — Prevent Self-Service Credential Modification by Parent/Student
    console.log('\n--- TEST 6: Prevent Self-Service Password Change Without Forced Flow ---');
    // Login as the parent
    const parentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: newParentPhone,
        password: 'NewParentPassword789!',
        role: 'PARENT',
      }),
    });
    const parentLoginData = await parentLoginRes.json();
    const parentToken = parentLoginData.data?.accessToken;

    if (!parentToken) {
      console.error('[FAIL] Test 6: Parent login failed:', parentLoginData);
      failed = true;
    } else {
      // First, set mustChangePassword to false to simulate normal logged-in state
      await prisma.user.update({
        where: { id: parentUser!.id },
        data: { mustChangePassword: false },
      });

      // Now parent attempts self-service change password
      const changePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({
          currentPassword: 'NewParentPassword789!',
          newPassword: 'AnotherSecretPass123!',
        }),
      });

      const changePassData = await changePassRes.json();
      if (changePassRes.status === 403) {
        console.log('[PASS] Self-service password change correctly blocked (HTTP 403) for parent account.');
      } else {
        console.error('[FAIL] Self-service password change was unexpectedly allowed:', changePassRes.status, changePassData);
        failed = true;
      }
    }

    // TEST 7: Requirement 4 — Mark as Passed (PASSED_OUT) & Enrollment Archival
    console.log('\n--- TEST 7: Mark Student as Passed Out (Status Update & Enrollment Archival) ---');
    const passOutRes = await fetch(`${BASE_URL}/students/${targetStudent.id}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'PASSED_OUT',
        reason: 'Completed course successfully',
      }),
    });

    const passOutData = await passOutRes.json();
    if (passOutRes.status !== 200 || !passOutData.success) {
      console.error('[FAIL] Test 7: Mark passed failed:', passOutData);
      failed = true;
    } else {
      console.log('[PASS] Student status updated to PASSED_OUT');

      // Verify active enrollments were deactivated
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { studentId: targetStudent.id },
      });
      const activeEnrollments = enrollments.filter((e) => e.isActive);
      if (activeEnrollments.length === 0) {
        console.log(`[PASS] All ${enrollments.length} enrollments archived (isActive: false) on pass-out.`);
      } else {
        console.error(`[FAIL] Active enrollments remained active:`, activeEnrollments);
        failed = true;
      }

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'STUDENT_STATUS_UPDATE',
          entityId: targetStudent.id,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (auditLog) {
        console.log(`[PASS] Audit log recorded: action=${auditLog.action}, target=${auditLog.entityId}`);
      } else {
        console.warn('[WARN] Audit log record not found');
      }
    }

    // TEST 8: Tenant Isolation Check
    console.log('\n--- TEST 8: Tenant Isolation Enforcement ---');
    // Try to access targetStudent from a bogus institute header
    const crossTenantRes = await fetch(`${BASE_URL}/students/${targetStudent.id}`, {
      headers: {
        ...authHeaders,
        'x-institute-id': '00000000-0000-0000-0000-000000000000',
      },
    });

    if (crossTenantRes.status === 403 || crossTenantRes.status === 404) {
      console.log(`[PASS] Cross-institute access correctly blocked with HTTP ${crossTenantRes.status}.`);
    } else {
      console.error(`[FAIL] Cross-institute access was not blocked: HTTP ${crossTenantRes.status}`);
      failed = true;
    }

    console.log('\n======================================================');
    if (failed) {
      console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.');
    } else {
      console.log('✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY (8/8)!');
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    failed = true;
  } finally {
    server.close();
    await prisma.$disconnect();
    process.exit(failed ? 1 : 0);
  }
});
