import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import { matchStudentVoice, EnrolledStudentCandidate } from '@tuition/shared';

const prisma = new PrismaClient();
const BASE_URL = `http://localhost:5000/api`;

interface TestReport {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestReport[] = [];

function recordTest(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name} ${details ? `(${details})` : ''}`);
}

function generateAuthToken(user: any, instituteId: string, role: string) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role,
      instituteId,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

async function runStaffIsolationAndAttendanceSuite() {
  console.log('\n========================================================================');
  console.log('  TUITIONOS: STRICT STAFF DATA ISOLATION & ATTENDANCE VERIFICATION SUITE');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // SETUP: Institutes, Staff A, Staff B, Batches
    // -------------------------------------------------------------------------
    console.log('[Setup] Preparing test institutes, staff profiles, and batches...');

    let instituteA = await prisma.institute.findFirst({
      where: { admissionPrefix: 'APEX' },
    });
    if (!instituteA) {
      instituteA = await prisma.institute.findFirst({
        where: { status: 'ACTIVE' },
      });
    }

    let instituteB = await prisma.institute.findFirst({
      where: { code: 'BETA' },
    });
    if (!instituteB) {
      instituteB = await prisma.institute.create({
        data: {
          name: 'Beta Global Institute',
          code: 'BETA',
          admissionPrefix: 'BETA_ISO',
          status: 'ACTIVE',
        },
      });
    }

    const passwordHash = await argon2.hash('StaffPassword123!');

    // Create / Find Staff A in Institute A
    let userStaffA = await prisma.user.findFirst({
      where: { email: 'staff_a_isolation@test.com' },
    });
    if (!userStaffA) {
      userStaffA = await prisma.user.create({
        data: {
          fullName: 'Staff Member Alpha',
          email: 'staff_a_isolation@test.com',
          passwordHash,
          role: 'STAFF',
          isActive: true,
        },
      });
    }
    await prisma.instituteMembership.upsert({
      where: {
        instituteId_userId: { userId: userStaffA.id, instituteId: instituteA.id },
      },
      update: { role: 'STAFF', isActive: true },
      create: {
        userId: userStaffA.id,
        instituteId: instituteA.id,
        role: 'STAFF',
        isActive: true,
      },
    });
    let profileStaffA = await prisma.staffProfile.findFirst({
      where: { userId: userStaffA.id, instituteId: instituteA.id },
    });
    if (!profileStaffA) {
      profileStaffA = await prisma.staffProfile.create({
        data: {
          userId: userStaffA.id,
          instituteId: instituteA.id,
          designation: 'Mathematics Teacher',
          employeeCode: 'STAFF-A',
        },
      });
    }

    // Create / Find Staff B in Institute A
    let userStaffB = await prisma.user.findFirst({
      where: { email: 'staff_b_isolation@test.com' },
    });
    if (!userStaffB) {
      userStaffB = await prisma.user.create({
        data: {
          fullName: 'Staff Member Beta',
          email: 'staff_b_isolation@test.com',
          passwordHash,
          role: 'STAFF',
          isActive: true,
        },
      });
    }
    await prisma.instituteMembership.upsert({
      where: {
        instituteId_userId: { userId: userStaffB.id, instituteId: instituteA.id },
      },
      update: { role: 'STAFF', isActive: true },
      create: {
        userId: userStaffB.id,
        instituteId: instituteA.id,
        role: 'STAFF',
        isActive: true,
      },
    });
    let profileStaffB = await prisma.staffProfile.findFirst({
      where: { userId: userStaffB.id, instituteId: instituteA.id },
    });
    if (!profileStaffB) {
      profileStaffB = await prisma.staffProfile.create({
        data: {
          userId: userStaffB.id,
          instituteId: instituteA.id,
          designation: 'Physics Teacher',
          employeeCode: 'STAFF-B',
        },
      });
    }

    // Create / Find Staff in Institute B (Cross-Institute)
    let userStaffBeta = await prisma.user.findFirst({
      where: { email: 'staff_beta_inst_b@test.com' },
    });
    if (!userStaffBeta) {
      userStaffBeta = await prisma.user.create({
        data: {
          fullName: 'Staff Beta CrossTenant',
          email: 'staff_beta_inst_b@test.com',
          passwordHash,
          role: 'STAFF',
          isActive: true,
        },
      });
    }
    await prisma.instituteMembership.upsert({
      where: {
        instituteId_userId: { userId: userStaffBeta.id, instituteId: instituteB.id },
      },
      update: { role: 'STAFF', isActive: true },
      create: {
        userId: userStaffBeta.id,
        instituteId: instituteB.id,
        role: 'STAFF',
        isActive: true,
      },
    });

    // Create Batch A and Batch B in Institute A
    let batchA = await prisma.batch.findFirst({
      where: { instituteId: instituteA.id, name: 'Batch Alpha 2026' },
    });
    if (!batchA) {
      batchA = await prisma.batch.create({
        data: {
          instituteId: instituteA.id,
          name: 'Batch Alpha 2026',
          academicYear: '2026-2027',
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    let batchB = await prisma.batch.findFirst({
      where: { instituteId: instituteA.id, name: 'Batch Beta 2026' },
    });
    if (!batchB) {
      batchB = await prisma.batch.create({
        data: {
          instituteId: instituteA.id,
          name: 'Batch Beta 2026',
          academicYear: '2026-2027',
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    // Ensure initial state: Neither staff is assigned to the opposite batch
    await prisma.staffBatchAssignment.deleteMany({
      where: {
        staffProfileId: { in: [profileStaffA.id, profileStaffB.id] },
      },
    });

    // Generate JWTs
    const tokenStaffA = generateAuthToken(userStaffA, instituteA.id, 'STAFF');
    const tokenStaffB = generateAuthToken(userStaffB, instituteA.id, 'STAFF');
    const tokenStaffBeta = generateAuthToken(userStaffBeta, instituteB.id, 'STAFF');

    // -------------------------------------------------------------------------
    // TEST 1: Staff Admission & Creator Relationship Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Staff A & B Student Admissions ---');
    const studentAName = `StudentA_${Date.now()}`;
    const studentBName = `StudentB_${Date.now()}`;

    // Staff A admits Student A
    const admitResA = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        firstName: 'JohnA',
        lastName: studentAName,
        gender: 'MALE',
        batchId: batchA.id,
        parentFullName: 'Guardian JohnA',
        parentPhone: `9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        parentRelationship: 'FATHER',
      }),
    });
    const admitDataA = await admitResA.json();
    const studentAId = admitDataA.data?.student?.id;
    const admissionNumA = admitDataA.data?.admissionNumber;

    // Staff B admits Student B
    const admitResB = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffB}`,
      },
      body: JSON.stringify({
        firstName: 'EmilyB',
        lastName: studentBName,
        gender: 'FEMALE',
        batchId: batchB.id,
        parentFullName: 'Guardian EmilyB',
        parentPhone: `9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        parentRelationship: 'MOTHER',
      }),
    });
    const admitDataB = await admitResB.json();
    const studentBId = admitDataB.data?.student?.id;
    const admissionNumB = admitDataB.data?.admissionNumber;

    const dbStudentA = await prisma.student.findUnique({ where: { id: studentAId } });
    const dbStudentB = await prisma.student.findUnique({ where: { id: studentBId } });

    recordTest(
      'Staff A creates Student A with createdByUserId recorded',
      dbStudentA?.createdByUserId === userStaffA.id && admitResA.status === 201,
      `Admission No: ${admissionNumA}`
    );
    recordTest(
      'Staff B creates Student B with createdByUserId recorded',
      dbStudentB?.createdByUserId === userStaffB.id && admitResB.status === 201,
      `Admission No: ${admissionNumB}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Staff List & Search Isolation (Database Query Layer)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Staff List & Search Isolation ---');

    // Staff A lists students
    const listResA = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    const listDataA = await listResA.json();
    const studentsSeenByA: any[] = listDataA.data?.students || [];

    const staffASeesStudentA = studentsSeenByA.some((s) => s.id === studentAId);
    const staffASeesStudentB = studentsSeenByA.some((s) => s.id === studentBId);

    recordTest(
      'Staff A can list Student A (own creator scope)',
      staffASeesStudentA,
      'Student A present in list'
    );
    recordTest(
      'Staff A CANNOT see Student B in roster/list (strict scope)',
      !staffASeesStudentB,
      'Student B completely omitted from list'
    );

    // Staff A searches for Student B by name
    const searchRes = await fetch(`${BASE_URL}/students?search=${encodeURIComponent(studentBName)}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    const searchData = await searchRes.json();
    const searchResults: any[] = searchData.data?.students || [];

    recordTest(
      'Staff A search for Student B returns empty (no name leak)',
      searchResults.length === 0,
      `Results count: ${searchResults.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Staff Direct ID / URL Manipulation (IDOR Prevention)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Direct URL / ID Access Protection (403 Forbidden) ---');

    // Staff A tries to view Student B details via ID
    const directDetailRes = await fetch(`${BASE_URL}/students/${studentBId}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      'Staff A accessing Student B detail returns 403 Forbidden',
      directDetailRes.status === 403,
      `HTTP status: ${directDetailRes.status}`
    );

    // Staff A tries to update Student B
    const updateRes = await fetch(`${BASE_URL}/students/${studentBId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({ firstName: 'HackedName' }),
    });
    recordTest(
      'Staff A editing Student B returns 403 Forbidden',
      updateRes.status === 403,
      `HTTP status: ${updateRes.status}`
    );

    // Staff A tries to reset Student B password
    const resetRes = await fetch(`${BASE_URL}/students/${studentBId}/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      'Staff A resetting Student B credentials returns 403 Forbidden',
      resetRes.status === 403,
      `HTTP status: ${resetRes.status}`
    );

    // Staff A tries to access Student B fee statement
    const feeRes = await fetch(`${BASE_URL}/fees/students/${studentBId}/statement`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      'Staff A accessing Student B fee statement returns 403 Forbidden',
      feeRes.status === 403,
      `HTTP status: ${feeRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Attendance Marking Scope Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Attendance Marking Scope Verification ---');

    // Staff A tries to check in unauthorized Student B
    const checkInUnauthorizedRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        studentId: studentBId,
        batchId: batchB.id,
        method: 'MANUAL',
      }),
    });
    recordTest(
      'Staff A marking attendance for unauthorized Student B returns 403 Forbidden',
      checkInUnauthorizedRes.status === 403,
      `HTTP status: ${checkInUnauthorizedRes.status}`
    );

    // Staff A checks in authorized Student A
    const checkInAuthorizedRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        studentId: studentAId,
        batchId: batchA.id,
        method: 'MANUAL',
        idempotencyKey: `ATT_${studentAId}_${Date.now()}`,
      }),
    });
    recordTest(
      'Staff A marking attendance for authorized Student A succeeds (200/201 OK)',
      checkInAuthorizedRes.status === 200 || checkInAuthorizedRes.status === 201,
      `HTTP status: ${checkInAuthorizedRes.status}`
    );

    // Duplicate Check-In Protection
    const duplicateCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        studentId: studentAId,
        batchId: batchA.id,
        method: 'MANUAL',
      }),
    });
    const dupJson = await duplicateCheckInRes.json();
    recordTest(
      'Duplicate check-in safely handled or flagged without crashing (409 Conflict)',
      [409, 400, 200].includes(duplicateCheckInRes.status),
      `HTTP status: ${duplicateCheckInRes.status}, message: ${dupJson.error || dupJson.message}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Dynamic Batch Assignment Grant & Immediate Revocation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Dynamic Faculty Batch Assignment & Immediate Revocation ---');

    // Assign Staff A to Batch B (where Student B is enrolled)
    const assignment = await prisma.staffBatchAssignment.create({
      data: {
        batchId: batchB.id,
        staffProfileId: profileStaffA.id,
      },
    });

    // Now Staff A tries to access Student B
    const assignedDetailRes = await fetch(`${BASE_URL}/students/${studentBId}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      'Assigning Staff A to Batch B immediately grants access to Student B (200 OK)',
      assignedDetailRes.status === 200,
      `HTTP status: ${assignedDetailRes.status}`
    );

    // Revoke Staff A assignment from Batch B
    await prisma.staffBatchAssignment.delete({
      where: { id: assignment.id },
    });

    // Immediately after revocation, Staff A should receive 403 Forbidden
    const revokedDetailRes = await fetch(`${BASE_URL}/students/${studentBId}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      'Revoking Staff A assignment immediately revokes access to Student B (403 Forbidden)',
      revokedDetailRes.status === 403,
      `HTTP status: ${revokedDetailRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Cross-Tenant Isolation (Institute A vs Institute B)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Cross-Tenant Isolation ---');

    const crossTenantRes = await fetch(`${BASE_URL}/students/${studentAId}`, {
      headers: { Authorization: `Bearer ${tokenStaffBeta}` },
    });
    recordTest(
      'Institute B staff accessing Institute A student returns 403 Forbidden',
      crossTenantRes.status === 403,
      `HTTP status: ${crossTenantRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Voice Attendance Recognition & Candidate Disambiguation Logic
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Voice Attendance Recognition Logic ---');

    const mockCandidates: EnrolledStudentCandidate[] = [
      {
        id: 'std-1',
        admissionNumber: 'APEX-2026-0001',
        firstName: 'Rahul',
        lastName: 'Sharma',
        batchId: 'batch-1',
        batchName: 'Class 10 Physics',
      },
      {
        id: 'std-2',
        admissionNumber: 'APEX-2026-0002',
        firstName: 'Rahul',
        lastName: 'Verma',
        batchId: 'batch-1',
        batchName: 'Class 10 Physics',
      },
      {
        id: 'std-3',
        admissionNumber: 'APEX-2026-0003',
        firstName: 'Priya',
        lastName: 'Patel',
        batchId: 'batch-1',
        batchName: 'Class 10 Physics',
      },
    ];

    // Case A: Single Exact Match
    const matchPriya = matchStudentVoice('Priya Patel', mockCandidates);
    recordTest(
      'Voice matching: Single exact match returns EXACT_SINGLE',
      matchPriya.status === 'EXACT_SINGLE' && matchPriya.bestMatch?.id === 'std-3',
      `Best match: ${matchPriya.bestMatch?.firstName} ${matchPriya.bestMatch?.lastName}`
    );

    // Case B: Duplicate Name Disambiguation ("Rahul")
    const matchRahul = matchStudentVoice('Rahul', mockCandidates);
    recordTest(
      'Voice matching: Duplicate first name returns candidate list for manual selection',
      (matchRahul.status === 'EXACT_MULTIPLE' || matchRahul.status === 'FUZZY_MULTIPLE') &&
        matchRahul.exactMatches.length === 2,
      `Candidates count: ${matchRahul.exactMatches.length} (${matchRahul.exactMatches.map((m) => m.lastName).join(', ')})`
    );

    // Case C: Unenrolled / No-Match Voice ("ChatGPT")
    const matchChatGPT = matchStudentVoice('ChatGPT', mockCandidates);
    recordTest(
      'Voice matching: Non-student word ("ChatGPT") returns NO_MATCH safely without error',
      matchChatGPT.status === 'NO_MATCH',
      `Status: ${matchChatGPT.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Admission Number Uniqueness & Concurrent Admission Safety
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Concurrent Admission Number Uniqueness ---');

    const concurrentAdmissions = await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        fetch(`${BASE_URL}/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenStaffA}`,
          },
          body: JSON.stringify({
            firstName: `Concurrent${i}`,
            lastName: `Test${Date.now()}`,
            gender: 'MALE',
            parentFullName: `Parent Concur ${i}`,
            parentPhone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
          }),
        }).then((res) => res.json())
      )
    );

    const generatedNumbers = concurrentAdmissions
      .map((r) => r.data?.admissionNumber)
      .filter(Boolean);
    const uniqueNumbers = new Set(generatedNumbers);

    recordTest(
      'Concurrent admissions produce 100% unique deterministic serial numbers',
      uniqueNumbers.size === 5 && generatedNumbers.length === 5,
      `Generated: ${generatedNumbers.join(', ')}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Photo Path Traversal & File Upload Security
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Photo Access Path-Traversal Security ---');

    // Test path traversal attempt on photo download
    const traversalRes = await fetch(`${BASE_URL}/students/photo-raw/..%2F..%2Fetc%2Fpasswd`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      'Path-traversal photo access attempt blocked (400, 403, or 404)',
      [400, 403, 404].includes(traversalRes.status),
      `HTTP status: ${traversalRes.status}`
    );
  } catch (err: any) {
    console.error('Fatal test error:', err);
    recordTest('Test suite execution without unhandled exception', false, err.message);
  } finally {
    await prisma.$disconnect();

    console.log('\n========================================================================');
    console.log('                          TEST RESULTS SUMMARY                          ');
    console.log('========================================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`Total Tests Run: ${total}`);
    console.log(`Passed:         ${passed}`);
    console.log(`Failed:         ${failed}`);
    console.log('========================================================================\n');

    if (failed > 0) {
      console.error(`❌ RELEASE-BLOCKING: ${failed} tests failed!`);
      process.exit(1);
    } else {
      console.log('🎉 ALL SECURITY, ISOLATION, AND ATTENDANCE TESTS PASSED!');
      process.exit(0);
    }
  }
}

runStaffIsolationAndAttendanceSuite();
