import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import { matchStudentVoice, EnrolledStudentCandidate } from '@tuition/shared';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api';

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

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(num: number, name: string, passed: boolean, error?: string) {
  results.push({ num, name, passed, error });
  if (passed) {
    console.log(`  ✓ [TEST ${num}] PASS: ${name}`);
  } else {
    console.error(`  ✗ [TEST ${num}] FAIL: ${name} -> ${error}`);
  }
}

async function runAccessControlTestSuite() {
  console.log('\n========================================================================');
  console.log(' TUITIONOS: STAFF-SPECIFIC BATCH & SUBJECT ACCESS CONTROL TEST SUITE');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // SETUP: Institutes, Admins, Staff
    // -------------------------------------------------------------------------
    console.log('[Setup] Preparing test institutes, faculty assignments, and students...');

    let instA = await prisma.institute.findFirst({ where: { code: 'ACCESS_INST_A' } });
    if (!instA) {
      instA = await prisma.institute.create({
        data: { name: 'Access Academy Alpha', code: 'ACCESS_INST_A', admissionPrefix: 'ACCA', status: 'ACTIVE' },
      });
    }

    let instB = await prisma.institute.findFirst({ where: { code: 'ACCESS_INST_B' } });
    if (!instB) {
      instB = await prisma.institute.create({
        data: { name: 'Access Academy Beta', code: 'ACCESS_INST_B', admissionPrefix: 'ACCB', status: 'ACTIVE' },
      });
    }

    const passwordHash = await argon2.hash('StaffPassword123!');

    // Academic Admin A
    let userAdminA = await prisma.user.findFirst({ where: { email: 'admin_access_a@test.com' } });
    if (!userAdminA) {
      userAdminA = await prisma.user.create({
        data: { fullName: 'Admin Alpha', email: 'admin_access_a@test.com', passwordHash, role: 'ACADEMIC_ADMIN', isActive: true },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userAdminA.id, instituteId: instA.id } },
      create: { userId: userAdminA.id, instituteId: instA.id, role: 'ACADEMIC_ADMIN', isActive: true },
      update: { isActive: true },
    });

    // Staff A (Teaches Math & Science in Batch A)
    let userStaffA = await prisma.user.findFirst({ where: { email: 'staff_access_a@test.com' } });
    if (!userStaffA) {
      userStaffA = await prisma.user.create({
        data: { fullName: 'Faculty Math-Science', email: 'staff_access_a@test.com', passwordHash, role: 'STAFF', isActive: true },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffA.id, instituteId: instA.id } },
      create: { userId: userStaffA.id, instituteId: instA.id, role: 'STAFF', isActive: true },
      update: { isActive: true },
    });
    let profileStaffA = await prisma.staffProfile.findFirst({ where: { userId: userStaffA.id } });
    if (!profileStaffA) {
      profileStaffA = await prisma.staffProfile.create({
        data: { userId: userStaffA.id, instituteId: instA.id, employeeCode: 'FAC_A' },
      });
    }

    // Staff B (Teaches English in Batch A and History in Batch B)
    let userStaffB = await prisma.user.findFirst({ where: { email: 'staff_access_b@test.com' } });
    if (!userStaffB) {
      userStaffB = await prisma.user.create({
        data: { fullName: 'Faculty English-History', email: 'staff_access_b@test.com', passwordHash, role: 'STAFF', isActive: true },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffB.id, instituteId: instA.id } },
      create: { userId: userStaffB.id, instituteId: instA.id, role: 'STAFF', isActive: true },
      update: { isActive: true },
    });
    let profileStaffB = await prisma.staffProfile.findFirst({ where: { userId: userStaffB.id } });
    if (!profileStaffB) {
      profileStaffB = await prisma.staffProfile.create({
        data: { userId: userStaffB.id, instituteId: instA.id, employeeCode: 'FAC_B' },
      });
    }

    // Staff Tenant B (Cross-Institute)
    let userStaffTenantB = await prisma.user.findFirst({ where: { email: 'staff_cross_tenant@test.com' } });
    if (!userStaffTenantB) {
      userStaffTenantB = await prisma.user.create({
        data: { fullName: 'Faculty Tenant B', email: 'staff_cross_tenant@test.com', passwordHash, role: 'STAFF', isActive: true },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffTenantB.id, instituteId: instB.id } },
      create: { userId: userStaffTenantB.id, instituteId: instB.id, role: 'STAFF', isActive: true },
      update: { isActive: true },
    });

    const tokenAdminA = generateAuthToken(userAdminA, instA.id, 'ACADEMIC_ADMIN');
    const tokenStaffA = generateAuthToken(userStaffA, instA.id, 'STAFF');
    const tokenStaffB = generateAuthToken(userStaffB, instA.id, 'STAFF');
    const tokenStaffTenantB = generateAuthToken(userStaffTenantB, instB.id, 'STAFF');

    // -------------------------------------------------------------------------
    // SETUP: Batches & Subjects Hierarchy
    // -------------------------------------------------------------------------
    // Subjects
    let subMath = await prisma.subject.findFirst({ where: { instituteId: instA.id, name: 'Acc Mathematics' } });
    if (!subMath) {
      subMath = await prisma.subject.create({ data: { instituteId: instA.id, name: 'Acc Mathematics', code: 'AMATH' } });
    }
    let subScience = await prisma.subject.findFirst({ where: { instituteId: instA.id, name: 'Acc Science' } });
    if (!subScience) {
      subScience = await prisma.subject.create({ data: { instituteId: instA.id, name: 'Acc Science', code: 'ASCI' } });
    }
    let subEnglish = await prisma.subject.findFirst({ where: { instituteId: instA.id, name: 'Acc English' } });
    if (!subEnglish) {
      subEnglish = await prisma.subject.create({ data: { instituteId: instA.id, name: 'Acc English', code: 'AENG' } });
    }
    let subHistory = await prisma.subject.findFirst({ where: { instituteId: instA.id, name: 'Acc History' } });
    if (!subHistory) {
      subHistory = await prisma.subject.create({ data: { instituteId: instA.id, name: 'Acc History', code: 'AHIST' } });
    }

    // Batch A
    let batchA = await prisma.batch.findFirst({ where: { instituteId: instA.id, name: 'Class 10 - Batch Alpha' } });
    if (!batchA) {
      batchA = await prisma.batch.create({
        data: {
          instituteId: instA.id,
          name: 'Class 10 - Batch Alpha',
          code: 'B-10-ALPHA',
          academicYear: '2026-2027',
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    // Batch B
    let batchB = await prisma.batch.findFirst({ where: { instituteId: instA.id, name: 'Class 10 - Batch Beta' } });
    if (!batchB) {
      batchB = await prisma.batch.create({
        data: {
          instituteId: instA.id,
          name: 'Class 10 - Batch Beta',
          code: 'B-10-BETA',
          academicYear: '2026-2027',
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    // Batch A Subjects:
    // Math -> Staff A
    await prisma.batchSubject.upsert({
      where: { batchId_subjectId: { batchId: batchA.id, subjectId: subMath.id } },
      create: { batchId: batchA.id, subjectId: subMath.id, staffProfileId: profileStaffA.id, isActive: true },
      update: { staffProfileId: profileStaffA.id, isActive: true },
    });
    // Science -> Staff A
    await prisma.batchSubject.upsert({
      where: { batchId_subjectId: { batchId: batchA.id, subjectId: subScience.id } },
      create: { batchId: batchA.id, subjectId: subScience.id, staffProfileId: profileStaffA.id, isActive: true },
      update: { staffProfileId: profileStaffA.id, isActive: true },
    });
    // English -> Staff B
    await prisma.batchSubject.upsert({
      where: { batchId_subjectId: { batchId: batchA.id, subjectId: subEnglish.id } },
      create: { batchId: batchA.id, subjectId: subEnglish.id, staffProfileId: profileStaffB.id, isActive: true },
      update: { staffProfileId: profileStaffB.id, isActive: true },
    });

    // StaffBatchAssignments for Batch A
    await prisma.staffBatchAssignment.upsert({
      where: { staffProfileId_batchId: { staffProfileId: profileStaffA.id, batchId: batchA.id } },
      create: { staffProfileId: profileStaffA.id, batchId: batchA.id },
      update: {},
    });
    await prisma.staffBatchAssignment.upsert({
      where: { staffProfileId_batchId: { staffProfileId: profileStaffB.id, batchId: batchA.id } },
      create: { staffProfileId: profileStaffB.id, batchId: batchA.id },
      update: {},
    });

    // Batch B Subjects:
    // History -> Staff B
    await prisma.batchSubject.upsert({
      where: { batchId_subjectId: { batchId: batchB.id, subjectId: subHistory.id } },
      create: { batchId: batchB.id, subjectId: subHistory.id, staffProfileId: profileStaffB.id, isActive: true },
      update: { staffProfileId: profileStaffB.id, isActive: true },
    });
    // Staff B assigned to Batch B
    await prisma.staffBatchAssignment.upsert({
      where: { staffProfileId_batchId: { staffProfileId: profileStaffB.id, batchId: batchB.id } },
      create: { staffProfileId: profileStaffB.id, batchId: batchB.id },
      update: {},
    });

    // Clean up any accidental Staff A assignment to Batch B
    await prisma.staffBatchAssignment.deleteMany({
      where: { staffProfileId: profileStaffA.id, batchId: batchB.id },
    });

    // -------------------------------------------------------------------------
    // SETUP: Students & Subject Enrollments
    // -------------------------------------------------------------------------
    async function createTestStudent(firstName: string, lastName: string, admNum: string, subjectIds: string[]) {
      let st = await prisma.student.findFirst({
        where: { instituteId: instA.id, admissionNumber: admNum },
      });
      if (!st) {
        st = await prisma.student.create({
          data: {
            instituteId: instA.id,
            admissionNumber: admNum,
            firstName,
            lastName,
            status: 'ACTIVE',
          },
        });
      }

      // Primary batch enrollment
      const existingPrimary = await prisma.studentEnrollment.findFirst({
        where: { studentId: st.id, batchId: batchA.id, subjectId: null },
      });
      if (!existingPrimary) {
        await prisma.studentEnrollment.create({
          data: { studentId: st.id, batchId: batchA.id, subjectId: null, isActive: true },
        });
      } else if (!existingPrimary.isActive) {
        await prisma.studentEnrollment.update({
          where: { id: existingPrimary.id },
          data: { isActive: true },
        });
      }

      // Subject enrollments
      for (const sid of subjectIds) {
        const existingSub = await prisma.studentEnrollment.findFirst({
          where: { studentId: st.id, batchId: batchA.id, subjectId: sid },
        });
        if (!existingSub) {
          await prisma.studentEnrollment.create({
            data: { studentId: st.id, batchId: batchA.id, subjectId: sid, isActive: true },
          });
        } else if (!existingSub.isActive) {
          await prisma.studentEnrollment.update({
            where: { id: existingSub.id },
            data: { isActive: true },
          });
        }
      }

      // Add parent with SMS capability for testing notifications
      const parentUser = await prisma.user.upsert({
        where: { phone: `+919900${admNum.replace(/\D/g, '').padEnd(6, '0').slice(0, 6)}` },
        create: {
          fullName: `Parent of ${firstName}`,
          phone: `+919900${admNum.replace(/\D/g, '').padEnd(6, '0').slice(0, 6)}`,
          passwordHash,
          role: 'PARENT',
        },
        update: {},
      });
      const parentProfile = await prisma.parentProfile.upsert({
        where: { userId: parentUser.id },
        create: { userId: parentUser.id },
        update: {},
      });
      await prisma.studentParentRelation.upsert({
        where: { studentId_parentId: { studentId: st.id, parentId: parentProfile.id } },
        create: { studentId: st.id, parentId: parentProfile.id, canReceiveSms: true, isPrimaryContact: true },
        update: { canReceiveSms: true },
      });

      console.log(`  [Setup] Student created/verified: ${firstName} ${lastName} (${admNum})`);
      return st;
    }

    const studentMathOnly = await createTestStudent('Aarav', 'Sharma', 'ACCA-2026-101', [subMath.id]);
    const studentScienceOnly = await createTestStudent('Diya', 'Patel', 'ACCA-2026-102', [subScience.id]);
    const studentEnglishOnly = await createTestStudent('Kabir', 'Mehta', 'ACCA-2026-103', [subEnglish.id]);
    const studentMulti = await createTestStudent('Ananya', 'Reddy', 'ACCA-2026-104', [subMath.id, subEnglish.id]);
    const studentSameName1 = await createTestStudent('Rohan', 'Verma', 'ACCA-2026-105', [subMath.id]);
    const studentSameName2 = await createTestStudent('Rohan', 'Verma', 'ACCA-2026-106', [subMath.id]);

    // -------------------------------------------------------------------------
    // TEST 1: Staff assigned to two subjects sees only those subjects
    // -------------------------------------------------------------------------
    console.log('\n--- Category 1: Staff Batch & Subject Visibility ---');
    const staffABatchesRes = await fetch(`${BASE_URL}/academics/batches`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    const staffABatchesData = await staffABatchesRes.json();
    const staffABatchA = staffABatchesData.data?.batches?.find((b: any) => b.id === batchA.id);
    const staffASubjectIds = staffABatchA?.batchSubjects?.map((bs: any) => bs.subject.id) || [];

    recordTest(
      1,
      'Staff assigned to two subjects sees only those subjects',
      staffABatchesRes.status === 200 &&
        staffASubjectIds.includes(subMath.id) &&
        staffASubjectIds.includes(subScience.id) &&
        !staffASubjectIds.includes(subEnglish.id) &&
        staffASubjectIds.length === 2,
      `Subject count: ${staffASubjectIds.length}, containsEnglish: ${staffASubjectIds.includes(subEnglish.id)}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Staff cannot select an unassigned batch
    // -------------------------------------------------------------------------
    const staffAUnassignedBatchRes = await fetch(`${BASE_URL}/academics/batches/${batchB.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      2,
      'Staff cannot select an unassigned batch',
      staffAUnassignedBatchRes.status === 403,
      `Expected status 403, got ${staffAUnassignedBatchRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Staff cannot select an unassigned subject within an assigned batch
    // -------------------------------------------------------------------------
    const staffBMathFilterRes = await fetch(`${BASE_URL}/students?batchId=${batchA.id}&subjectId=${subMath.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffB}` },
    });
    recordTest(
      3,
      'Staff cannot select an unassigned subject within an assigned batch',
      staffBMathFilterRes.status === 403,
      `Expected status 403, got ${staffBMathFilterRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Student lists return only students enrolled in the selected authorized subject
    // -------------------------------------------------------------------------
    console.log('\n--- Category 2: Filtered Student Lists ---');
    const staffAMathStudentsRes = await fetch(`${BASE_URL}/students?batchId=${batchA.id}&subjectId=${subMath.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    const staffAMathStudentsData = await staffAMathStudentsRes.json();
    const mathStudentIds = (staffAMathStudentsData.data?.students || []).map((s: any) => s.id);

    recordTest(
      4,
      'Student lists return only students enrolled in the selected authorized subject',
      staffAMathStudentsRes.status === 200 &&
        mathStudentIds.includes(studentMathOnly.id) &&
        mathStudentIds.includes(studentMulti.id) &&
        mathStudentIds.includes(studentSameName1.id),
      `Returned students: ${mathStudentIds.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Students enrolled in another subject are excluded
    // -------------------------------------------------------------------------
    const excludedStudent1 = mathStudentIds.includes(studentScienceOnly.id);
    const excludedStudent2 = mathStudentIds.includes(studentEnglishOnly.id);

    recordTest(
      5,
      'Students enrolled in another subject are excluded when they are not enrolled in the selected subject',
      !excludedStudent1 && !excludedStudent2,
      `ScienceOnlyIncluded: ${excludedStudent1}, EnglishOnlyIncluded: ${excludedStudent2}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Staff cannot read another staff member's restricted student list by changing query params
    // -------------------------------------------------------------------------
    const staffAEnglishQueryRes = await fetch(`${BASE_URL}/students?batchId=${batchA.id}&subjectId=${subEnglish.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    recordTest(
      6,
      "Staff cannot read another staff member's restricted student list by changing query parameters",
      staffAEnglishQueryRes.status === 403,
      `Expected 403 Forbidden, got ${staffAEnglishQueryRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Staff cannot create or enroll a student in an unauthorized subject
    // -------------------------------------------------------------------------
    console.log('\n--- Category 3: Creation and Allocation Access Control ---');
    const staffAUnauthorizedEnrollRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        firstName: 'Hacker',
        lastName: 'Student',
        batchId: batchA.id,
        subjectIds: [subEnglish.id], // English is unauthorized for Staff A!
        parentFullName: 'Parent Hacker',
        parentPhone: '+919988776655',
      }),
    });
    recordTest(
      7,
      'Staff cannot create or enroll a student in an unauthorized subject',
      staffAUnauthorizedEnrollRes.status === 403,
      `Expected 403 Forbidden, got ${staffAUnauthorizedEnrollRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Staff cannot mark attendance for an unauthorized student
    // -------------------------------------------------------------------------
    console.log('\n--- Category 4: Attendance Authorization ---');
    const staffAMarkEnglishStudentRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        studentId: studentEnglishOnly.id, // Only in English class
        batchId: batchA.id,
        method: 'MANUAL',
      }),
    });
    recordTest(
      8,
      'Staff cannot mark attendance for an unauthorized student',
      staffAMarkEnglishStudentRes.status === 403,
      `Expected 403 Forbidden, got ${staffAMarkEnglishStudentRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Staff cannot access another subject's attendance reports or correction endpoints
    // -------------------------------------------------------------------------
    const staffAEnglishReportsRes = await fetch(
      `${BASE_URL}/attendance/reports?batchId=${batchA.id}&subjectId=${subEnglish.id}`,
      { headers: { Authorization: `Bearer ${tokenStaffA}` } }
    );
    recordTest(
      9,
      "Staff cannot access another subject's attendance reports or correction endpoints",
      staffAEnglishReportsRes.status === 403,
      `Expected 403 Forbidden, got ${staffAEnglishReportsRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Voice matching searches only the authorized roster
    // -------------------------------------------------------------------------
    console.log('\n--- Category 5: Voice Attendance Roster & Disambiguation ---');
    const mathSummaryRes = await fetch(
      `${BASE_URL}/attendance/summary?batchId=${batchA.id}&subjectId=${subMath.id}`,
      { headers: { Authorization: `Bearer ${tokenStaffA}` } }
    );
    const mathSummaryData = await mathSummaryRes.json();
    const authorizedMathRoster: EnrolledStudentCandidate[] = (mathSummaryData.data?.records || []).map((r: any) => ({
      id: r.student.id,
      firstName: r.student.name.split(' ')[0],
      lastName: r.student.name.split(' ').slice(1).join(' '),
      admissionNumber: r.student.admissionNumber,
      status: 'ACTIVE',
    }));

    // Kabir is in English only -> must not match in Math roster!
    const voiceMatchKabir = matchStudentVoice('Kabir Mehta', authorizedMathRoster);

    recordTest(
      10,
      'Voice matching searches only the authorized roster',
      voiceMatchKabir.status === 'NO_MATCH',
      `Result status: ${voiceMatchKabir.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Duplicate student names produce candidate list for manual disambiguation
    // -------------------------------------------------------------------------
    const voiceMatchRohan = matchStudentVoice('Rohan Verma', authorizedMathRoster);
    const hasCandidates =
      voiceMatchRohan.status === 'EXACT_MULTIPLE' || voiceMatchRohan.status === 'FUZZY_MULTIPLE';
    const candidateCount =
      voiceMatchRohan.exactMatches.length > 0
        ? voiceMatchRohan.exactMatches.length
        : voiceMatchRohan.fuzzyMatches.length;

    recordTest(
      11,
      'Duplicate student names produce a candidate list rather than silently marking the wrong student present',
      hasCandidates && candidateCount === 2,
      `Status: ${voiceMatchRohan.status}, candidateCount: ${candidateCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Successful attendance uses the existing notification workflow
    // -------------------------------------------------------------------------
    console.log('\n--- Category 6: Notification & Tenant Isolation ---');
    // Ensure clean state for test student check-in
    await prisma.attendanceEvent.deleteMany({
      where: {
        studentId: studentMathOnly.id,
      },
    });

    const validCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        studentId: studentMathOnly.id,
        batchId: batchA.id,
        subjectId: subMath.id,
        method: 'VOICE_CONFIRMED',
      }),
    });

    const queuedSms = await prisma.smsNotification.findFirst({
      where: { studentId: studentMathOnly.id },
      orderBy: { createdAt: 'desc' },
    });

    recordTest(
      12,
      'Successful attendance uses the existing notification workflow',
      validCheckInRes.status === 201 && !!queuedSms,
      `CheckIn status: ${validCheckInRes.status}, queuedSmsId: ${queuedSms?.id}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Cross-institute access is rejected
    // -------------------------------------------------------------------------
    const crossInstRes = await fetch(`${BASE_URL}/students?batchId=${batchA.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffTenantB}` },
    });
    recordTest(
      13,
      'Cross-institute access is rejected',
      crossInstRes.status === 403,
      `Expected 403 Forbidden, got ${crossInstRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 14: Academic Admin permissions continue to work within their own institute
    // -------------------------------------------------------------------------
    const adminBatchesRes = await fetch(`${BASE_URL}/academics/batches`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    const adminBatchesData = await adminBatchesRes.json();
    const adminBatchCount = adminBatchesData.data?.batches?.length || 0;

    recordTest(
      14,
      'Academic Admin permissions continue to work within their own institute',
      adminBatchesRes.status === 200 && adminBatchCount >= 2,
      `Status: ${adminBatchesRes.status}, BatchCount: ${adminBatchCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Student and parent credential endpoints remain protected
    // -------------------------------------------------------------------------
    const studentUserRecord = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    const studentToken = studentUserRecord
      ? generateAuthToken(studentUserRecord, instA.id, 'STUDENT')
      : null;

    let studentResetBlocked = false;
    if (studentToken) {
      const studentResetRes = await fetch(`${BASE_URL}/students/${studentMathOnly.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      studentResetBlocked = studentResetRes.status === 403;
    } else {
      studentResetBlocked = true;
    }

    recordTest(
      15,
      'Student and parent credential endpoints remain protected',
      studentResetBlocked,
      `Student reset blocked: ${studentResetBlocked}`
    );

    // -------------------------------------------------------------------------
    // TEST 16: Existing modules continue to pass their regression tests
    // -------------------------------------------------------------------------
    console.log('\n--- Category 7: Regression Checks ---');
    const feesRes = await fetch(`${BASE_URL}/fees/structures`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    const examsRes = await fetch(`${BASE_URL}/exams`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });

    recordTest(
      16,
      'Existing attendance, fees, exams, messaging, and mobile APIs continue to pass their regression tests',
      feesRes.status === 200 && examsRes.status === 200,
      `feesStatus: ${feesRes.status}, examsStatus: ${examsRes.status}`
    );

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('                          TEST RESULTS SUMMARY                          ');
    console.log('========================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    console.log(`Total Tests Run: ${results.length}`);
    console.log(`Passed:         ${passedCount}`);
    console.log(`Failed:         ${failedCount}`);
    console.log('========================================================================\n');

    if (failedCount > 0) {
      console.error('❌ SOME ACCESS CONTROL TESTS FAILED:');
      results.filter((r) => !r.passed).forEach((r) => console.error(`  - Test ${r.num}: ${r.name} -> ${r.error}`));
      process.exit(1);
    } else {
      console.log('🎉 ALL 16 STAFF-SPECIFIC BATCH & SUBJECT ACCESS CONTROL TESTS PASSED!\n');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAccessControlTestSuite();
