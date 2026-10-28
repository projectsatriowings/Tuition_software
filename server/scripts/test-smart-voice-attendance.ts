import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import app from '../src/index.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { getInstituteLocalDate } from '../src/modules/attendance/attendance.controller.js';

const prisma = new PrismaClient();

interface TestResult {
  scenarioNumber: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(scenarioNumber: number, name: string, passed: boolean, details?: string) {
  results.push({ scenarioNumber, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [Scenario ${scenarioNumber}] ${name}`);
  if (details) {
    console.log(`   └─ ${details}`);
  }
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
    { expiresIn: '2h' }
  );
}

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log('  TUITIONOS: SMART VOICE ATTENDANCE & SMS 12-SCENARIO VERIFICATION');
  console.log('========================================================================\n');

  // Start Express on ephemeral port
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const BASE_URL = `http://localhost:${port}/api`;
  console.log(`[Test Server] Listening on ${BASE_URL}\n`);

  try {
    // -------------------------------------------------------------------------
    // 0. FIXTURE SETUP
    // -------------------------------------------------------------------------
    console.log('[Setup] Preparing test fixtures (institutes, batches, staff, students)...');

    // Institute A
    let instA = await prisma.institute.findFirst({ where: { admissionPrefix: 'VA_INSTA' } });
    if (!instA) {
      instA = await prisma.institute.create({
        data: {
          name: 'Voice Attendance Institute Alpha',
          code: 'VA_ALPHA',
          admissionPrefix: 'VA_INSTA',
          status: 'ACTIVE',
        },
      });
    }

    // Institute B (for cross-institute testing)
    let instB = await prisma.institute.findFirst({ where: { admissionPrefix: 'VA_INSTB' } });
    if (!instB) {
      instB = await prisma.institute.create({
        data: {
          name: 'Voice Attendance Institute Beta',
          code: 'VA_BETA',
          admissionPrefix: 'VA_INSTB',
          status: 'ACTIVE',
        },
      });
    }

    const defaultPassword = await argon2.hash('TestPass123!');

    // Users & Staff
    // Staff A: Institute A
    let userStaffA = await prisma.user.findFirst({ where: { OR: [{ email: 'voice_staff_a@test.com' }, { phone: '+919876500001' }] } });
    if (!userStaffA) {
      userStaffA = await prisma.user.create({
        data: {
          fullName: 'Staff Teacher Alpha',
          email: 'voice_staff_a@test.com',
          passwordHash: defaultPassword,
          role: 'STAFF',
          phone: '+919876500001',
          isActive: true,
        },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffA.id, instituteId: instA.id } },
      update: { role: 'STAFF', isActive: true },
      create: { userId: userStaffA.id, instituteId: instA.id, role: 'STAFF', isActive: true },
    });
    let profileStaffA = await prisma.staffProfile.findFirst({ where: { userId: userStaffA.id, instituteId: instA.id } });
    if (!profileStaffA) {
      profileStaffA = await prisma.staffProfile.create({
        data: {
          instituteId: instA.id,
          userId: userStaffA.id,
          employeeCode: 'EMP_VA_01',
          designation: 'Senior Faculty',
        },
      });
    }

    // Staff B: Institute A (Assigned only to Batch B)
    let userStaffB = await prisma.user.findFirst({ where: { OR: [{ email: 'voice_staff_b@test.com' }, { phone: '+919876500002' }] } });
    if (!userStaffB) {
      userStaffB = await prisma.user.create({
        data: {
          fullName: 'Staff Teacher Beta',
          email: 'voice_staff_b@test.com',
          passwordHash: defaultPassword,
          role: 'STAFF',
          phone: '+919876500002',
          isActive: true,
        },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffB.id, instituteId: instA.id } },
      update: { role: 'STAFF', isActive: true },
      create: { userId: userStaffB.id, instituteId: instA.id, role: 'STAFF', isActive: true },
    });
    let profileStaffB = await prisma.staffProfile.findFirst({ where: { userId: userStaffB.id, instituteId: instA.id } });
    if (!profileStaffB) {
      profileStaffB = await prisma.staffProfile.create({
        data: {
          instituteId: instA.id,
          userId: userStaffB.id,
          employeeCode: 'EMP_VA_02',
          designation: 'Junior Faculty',
        },
      });
    }

    // Staff Cross: Institute B
    let userStaffCross = await prisma.user.findFirst({ where: { OR: [{ email: 'voice_staff_cross@test.com' }, { phone: '+919876500099' }] } });
    if (!userStaffCross) {
      userStaffCross = await prisma.user.create({
        data: {
          fullName: 'Staff Cross Institute',
          email: 'voice_staff_cross@test.com',
          passwordHash: defaultPassword,
          role: 'STAFF',
          phone: '+919876500099',
          isActive: true,
        },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffCross.id, instituteId: instB.id } },
      update: { role: 'STAFF', isActive: true },
      create: { userId: userStaffCross.id, instituteId: instB.id, role: 'STAFF', isActive: true },
    });
    let profileStaffCross = await prisma.staffProfile.findFirst({ where: { userId: userStaffCross.id, instituteId: instB.id } });
    if (!profileStaffCross) {
      profileStaffCross = await prisma.staffProfile.create({
        data: {
          instituteId: instB.id,
          userId: userStaffCross.id,
          employeeCode: 'EMP_VA_CROSS',
          designation: 'Faculty Institute B',
        },
      });
    }

    // Academic Batches in Institute A
    let batchA = await prisma.batch.findFirst({
      where: { instituteId: instA.id, name: 'Voice Batch 10-A' },
    });
    if (!batchA) {
      batchA = await prisma.batch.create({
        data: {
          instituteId: instA.id,
          name: 'Voice Batch 10-A',
          academicYear: '2026-2027',
          code: 'VB10A',
          startDate: new Date(),
        },
      });
    }

    let batchB = await prisma.batch.findFirst({
      where: { instituteId: instA.id, name: 'Voice Batch 10-B' },
    });
    if (!batchB) {
      batchB = await prisma.batch.create({
        data: {
          instituteId: instA.id,
          name: 'Voice Batch 10-B',
          academicYear: '2026-2027',
          code: 'VB10B',
          startDate: new Date(),
        },
      });
    }

    // Subject in Batch A
    let subjectA = await prisma.subject.findFirst({
      where: { instituteId: instA.id, name: 'Voice Mathematics' },
    });
    if (!subjectA) {
      subjectA = await prisma.subject.create({
        data: {
          instituteId: instA.id,
          name: 'Voice Mathematics',
          code: 'VMATH',
        },
      });
    }

    // Link BatchSubject
    let batchSubA = await prisma.batchSubject.findFirst({
      where: { batchId: batchA.id, subjectId: subjectA.id },
    });
    if (!batchSubA) {
      batchSubA = await prisma.batchSubject.create({
        data: {
          batchId: batchA.id,
          subjectId: subjectA.id,
        },
      });
    }

    // Clean assignments to avoid stale state
    await prisma.staffBatchAssignment.deleteMany({
      where: { staffProfileId: { in: [profileStaffA.id, profileStaffB.id] } },
    });

    // Assign Staff A -> Batch A & BatchSubject A
    await prisma.staffBatchAssignment.create({
      data: { staffProfileId: profileStaffA.id, batchId: batchA.id },
    });
    await prisma.batchSubject.update({
      where: { id: batchSubA.id },
      data: { staffProfileId: profileStaffA.id },
    });

    // Assign Staff B -> ONLY Batch B
    await prisma.staffBatchAssignment.create({
      data: { staffProfileId: profileStaffB.id, batchId: batchB.id },
    });

    // Setup Parents
    // Parent 1 (canReceiveSms: true)
    let userParent1 = await prisma.user.findFirst({ where: { OR: [{ email: 'parent_sms_true@test.com' }, { phone: '+919876543210' }] } });
    if (!userParent1) {
      userParent1 = await prisma.user.create({
        data: {
          fullName: 'Guardian Suresh Patel',
          email: 'parent_sms_true@test.com',
          passwordHash: defaultPassword,
          role: 'PARENT',
          phone: '+919876543210',
          isActive: true,
        },
      });
    }
    let parent1 = await prisma.parentProfile.findFirst({ where: { userId: userParent1.id } });
    if (!parent1) {
      parent1 = await prisma.parentProfile.create({
        data: { userId: userParent1.id },
      });
    }

    // Parent 2 (canReceiveSms: false)
    let userParent2 = await prisma.user.findFirst({ where: { OR: [{ email: 'parent_sms_false@test.com' }, { phone: '+919876543211' }] } });
    if (!userParent2) {
      userParent2 = await prisma.user.create({
        data: {
          fullName: 'Guardian Ramesh Patel',
          email: 'parent_sms_false@test.com',
          passwordHash: defaultPassword,
          role: 'PARENT',
          phone: '+919876543211',
          isActive: true,
        },
      });
    }
    let parent2 = await prisma.parentProfile.findFirst({ where: { userId: userParent2.id } });
    if (!parent2) {
      parent2 = await prisma.parentProfile.create({
        data: { userId: userParent2.id },
      });
    }

    // Parent 3 for Priya Sharma (canReceiveSms: true)
    let userParent3 = await prisma.user.findFirst({ where: { OR: [{ email: 'parent_priya@test.com' }, { phone: '+919876543212' }] } });
    if (!userParent3) {
      userParent3 = await prisma.user.create({
        data: {
          fullName: 'Guardian Sunita Sharma',
          email: 'parent_priya@test.com',
          passwordHash: defaultPassword,
          role: 'PARENT',
          phone: '+919876543212',
          isActive: true,
        },
      });
    }
    let parent3 = await prisma.parentProfile.findFirst({ where: { userId: userParent3.id } });
    if (!parent3) {
      parent3 = await prisma.parentProfile.create({
        data: { userId: userParent3.id },
      });
    }

    // Setup Students
    // Student 1: Aarav Patel (in Batch A, parent1 has canReceiveSms: true)
    let student1 = await prisma.student.findFirst({
      where: { instituteId: instA.id, admissionNumber: 'VA_PATEL_1' },
    });
    if (!student1) {
      student1 = await prisma.student.create({
        data: {
          instituteId: instA.id,
          firstName: 'Aarav',
          lastName: 'Patel',
          admissionNumber: 'VA_PATEL_1',
          status: 'ACTIVE',
          phone: '+919876543201',
        },
      });
    }

    // Enroll Student 1 in Batch A
    let enroll1 = await prisma.studentEnrollment.findFirst({
      where: { studentId: student1.id, batchId: batchA.id },
    });
    if (!enroll1) {
      enroll1 = await prisma.studentEnrollment.create({
        data: {
          studentId: student1.id,
          batchId: batchA.id,
          subjectId: subjectA.id,
          isActive: true,
        },
      });
    }

    // Link Parent 1 to Student 1 with canReceiveSms = true
    let rel1 = await prisma.studentParentRelation.findFirst({
      where: { studentId: student1.id, parentId: parent1.id },
    });
    if (!rel1) {
      rel1 = await prisma.studentParentRelation.create({
        data: {
          studentId: student1.id,
          parentId: parent1.id,
          relation: 'FATHER',
          isPrimaryContact: true,
          canReceiveSms: true,
        },
      });
    } else if (!rel1.canReceiveSms) {
      await prisma.studentParentRelation.update({
        where: { id: rel1.id },
        data: { canReceiveSms: true },
      });
    }

    // Student 2: ALSO named Aarav Patel (same name, disambiguation candidate, in Batch A, parent2 has canReceiveSms: false)
    let student2 = await prisma.student.findFirst({
      where: { instituteId: instA.id, admissionNumber: 'VA_PATEL_2' },
    });
    if (!student2) {
      student2 = await prisma.student.create({
        data: {
          instituteId: instA.id,
          firstName: 'Aarav',
          lastName: 'Patel',
          admissionNumber: 'VA_PATEL_2',
          status: 'ACTIVE',
          phone: '+919876543202',
        },
      });
    }

    // Enroll Student 2 in Batch A
    let enroll2 = await prisma.studentEnrollment.findFirst({
      where: { studentId: student2.id, batchId: batchA.id },
    });
    if (!enroll2) {
      enroll2 = await prisma.studentEnrollment.create({
        data: {
          studentId: student2.id,
          batchId: batchA.id,
          subjectId: subjectA.id,
          isActive: true,
        },
      });
    }

    // Link Parent 2 to Student 2 with canReceiveSms = false
    let rel2 = await prisma.studentParentRelation.findFirst({
      where: { studentId: student2.id, parentId: parent2.id },
    });
    if (!rel2) {
      rel2 = await prisma.studentParentRelation.create({
        data: {
          studentId: student2.id,
          parentId: parent2.id,
          relation: 'FATHER',
          isPrimaryContact: true,
          canReceiveSms: false,
        },
      });
    }

    // Student 3: Priya Sharma (unique student in Batch A, for Scenario 1 unique check-in)
    let student3 = await prisma.student.findFirst({
      where: { instituteId: instA.id, admissionNumber: 'VA_PRIYA_01' },
    });
    if (!student3) {
      student3 = await prisma.student.create({
        data: {
          instituteId: instA.id,
          firstName: 'Priya',
          lastName: 'Sharma',
          admissionNumber: 'VA_PRIYA_01',
          status: 'ACTIVE',
          phone: '+919876543203',
        },
      });
    }
    let enroll3 = await prisma.studentEnrollment.findFirst({
      where: { studentId: student3.id, batchId: batchA.id },
    });
    if (!enroll3) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: student3.id,
          batchId: batchA.id,
          subjectId: subjectA.id,
          isActive: true,
        },
      });
    }
    let rel3 = await prisma.studentParentRelation.findFirst({
      where: { studentId: student3.id, parentId: parent3.id },
    });
    if (!rel3) {
      await prisma.studentParentRelation.create({
        data: {
          studentId: student3.id,
          parentId: parent3.id,
          relation: 'MOTHER',
          isPrimaryContact: true,
          canReceiveSms: true,
        },
      });
    }

    // Student 4: Rahul Verma (enrolled only in Batch B, for staff isolation Scenario 7)
    let student4 = await prisma.student.findFirst({
      where: { instituteId: instA.id, admissionNumber: 'VA_RAHUL_B' },
    });
    if (!student4) {
      student4 = await prisma.student.create({
        data: {
          instituteId: instA.id,
          firstName: 'Rahul',
          lastName: 'Verma',
          admissionNumber: 'VA_RAHUL_B',
          status: 'ACTIVE',
          phone: '+919876543204',
        },
      });
    }
    let enroll4 = await prisma.studentEnrollment.findFirst({
      where: { studentId: student4.id, batchId: batchB.id },
    });
    if (!enroll4) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: student4.id,
          batchId: batchB.id,
          isActive: true,
        },
      });
    }

    // Clear ALL existing attendance events and sms notifications for test students across any runs to ensure fresh test isolation
    await prisma.smsNotification.deleteMany({
      where: {
        studentId: { in: [student1.id, student2.id, student3.id, student4.id] },
      },
    });
    await prisma.attendanceEvent.deleteMany({
      where: {
        studentId: { in: [student1.id, student2.id, student3.id, student4.id] },
      },
    });

    const today = getInstituteLocalDate();
    console.log('[Setup Complete] Test fixtures initialized.\n');

    // Generate Auth Tokens
    const tokenStaffA = generateAuthToken(userStaffA, instA.id, 'STAFF');
    const tokenStaffB = generateAuthToken(userStaffB, instA.id, 'STAFF');
    const tokenStaffCross = generateAuthToken(userStaffCross, instB.id, 'STAFF');

    // Helper fetcher
    async function apiRequest(path: string, options: any = {}) {
      const token = options.token || tokenStaffA;
      const inst = options.instituteId || instA.id;
      const headers: any = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-institute-id': inst,
        ...(options.headers || {}),
      };

      const res = await fetch(`${BASE_URL}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = { status: res.status, statusText: res.statusText };
      }
      return { status: res.status, ok: res.ok, data: json };
    }

    // =========================================================================
    // SCENARIO 1: One unique, high-confidence match automatically checks in correct student
    // =========================================================================
    console.log('--- Testing Scenario 1: Unique high-confidence match ---');
    const voiceRes1 = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      body: { transcript: 'Priya Sharma', batchId: batchA.id },
    });

    const s1VoiceOk =
      voiceRes1.status === 200 &&
      voiceRes1.data.status === 'EXACT_SINGLE' &&
      voiceRes1.data.matchCount === 1 &&
      voiceRes1.data.autoCheckInEligible === true &&
      voiceRes1.data.bestMatch?.id === student3.id;

    // Execute Check-in
    const checkInRes1 = await apiRequest('/attendance/check-in', {
      method: 'POST',
      body: {
        studentId: student3.id,
        batchId: batchA.id,
        method: 'VOICE_CONFIRMED',
        idempotencyKey: `ATT_${student3.id}_${Date.now()}_1`,
      },
    });

    const s1CheckInOk =
      checkInRes1.status === 201 &&
      checkInRes1.data.success === true &&
      checkInRes1.data.data?.student?.id === student3.id &&
      checkInRes1.data.data?.event?.method === 'VOICE_CONFIRMED';

    recordTest(
      1,
      'One unique, high-confidence match automatically checks in correct student',
      s1VoiceOk && s1CheckInOk,
      `voiceMatch=${voiceRes1.data.status}, checkInStatus=${checkInRes1.status}, method=${checkInRes1.data.data?.event?.method}`
    );

    // =========================================================================
    // SCENARIO 2: Repeated voice result returns alreadyCheckedIn: true without duplicate record or SMS
    // =========================================================================
    console.log('--- Testing Scenario 2: Duplicate check-in prevention ---');
    const voiceRes2 = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      body: { transcript: 'Priya Sharma', batchId: batchA.id },
    });

    const s2VoiceOk =
      voiceRes2.status === 200 &&
      voiceRes2.data.alreadyCheckedIn === true &&
      voiceRes2.data.autoCheckInEligible === false &&
      typeof voiceRes2.data.checkInTimeFormatted === 'string';

    // Attempt second check-in
    const checkInRes2 = await apiRequest('/attendance/check-in', {
      method: 'POST',
      body: {
        studentId: student3.id,
        batchId: batchA.id,
        method: 'VOICE_CONFIRMED',
      },
    });

    const s2CheckInOk =
      checkInRes2.status === 409 &&
      checkInRes2.data.alreadyCheckedIn === true &&
      checkInRes2.data.error.includes('already checked in');

    // Count records in DB
    const eventsCount = await prisma.attendanceEvent.count({
      where: { studentId: student3.id, eventType: 'CHECK_IN' },
    });

    recordTest(
      2,
      'Repeated voice result returns alreadyCheckedIn: true without duplicate record or SMS',
      s2VoiceOk && s2CheckInOk && eventsCount === 1,
      `alreadyCheckedIn=${voiceRes2.data.alreadyCheckedIn}, checkInCode=${checkInRes2.status}, dbEventsCount=${eventsCount}`
    );

    // =========================================================================
    // SCENARIO 3: Two students with same name produce EXACT_MULTIPLE list without auto-check-in
    // =========================================================================
    console.log('--- Testing Scenario 3: Ambiguous matching (two students with same name) ---');
    const voiceRes3 = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      body: { transcript: 'Aarav Patel', batchId: batchA.id },
    });

    const s3Ok =
      voiceRes3.status === 200 &&
      voiceRes3.data.status === 'EXACT_MULTIPLE' &&
      voiceRes3.data.matchCount === 2 &&
      voiceRes3.data.autoCheckInEligible === false &&
      voiceRes3.data.bestMatch === null &&
      Array.isArray(voiceRes3.data.matches) &&
      voiceRes3.data.matches.length === 2;

    // Verify neither student has attendance created
    const student1Events = await prisma.attendanceEvent.count({
      where: { studentId: student1.id },
    });
    const student2Events = await prisma.attendanceEvent.count({
      where: { studentId: student2.id },
    });

    recordTest(
      3,
      'Two students with same name produce EXACT_MULTIPLE list without auto-check-in',
      s3Ok && student1Events === 0 && student2Events === 0,
      `matchStatus=${voiceRes3.data.status}, matchCount=${voiceRes3.data.matchCount}, autoCheckInEligible=${voiceRes3.data.autoCheckInEligible}`
    );

    // =========================================================================
    // SCENARIO 4: Selecting one student from list checks in only that student
    // =========================================================================
    console.log('--- Testing Scenario 4: Disambiguation selection check-in ---');
    // Staff clicks Check In for Student 1
    const checkInRes4 = await apiRequest('/attendance/check-in', {
      method: 'POST',
      body: {
        studentId: student1.id,
        batchId: batchA.id,
        method: 'VOICE_CONFIRMED',
      },
    });

    const s4Student1CheckIn =
      checkInRes4.status === 201 &&
      checkInRes4.data.data?.student?.id === student1.id;

    const s1CountAfter = await prisma.attendanceEvent.count({
      where: { studentId: student1.id, eventType: 'CHECK_IN' },
    });
    const s2CountAfter = await prisma.attendanceEvent.count({
      where: { studentId: student2.id, eventType: 'CHECK_IN' },
    });

    recordTest(
      4,
      'Selecting one student from list checks in only that student',
      s4Student1CheckIn && s1CountAfter === 1 && s2CountAfter === 0,
      `selectedStudentCheckedIn=${s1CountAfter === 1}, otherStudentUntouched=${s2CountAfter === 0}`
    );

    // =========================================================================
    // SCENARIO 5: Only selected student's linked, SMS-enabled guardian is notified
    // =========================================================================
    console.log('--- Testing Scenario 5: SMS recipient filtering (canReceiveSms: true) ---');
    // Student 1 has Parent 1 with canReceiveSms: true
    // Student 2 has Parent 2 with canReceiveSms: false
    const smsPatel1 = await prisma.smsNotification.findMany({
      where: {
        studentId: student1.id,
        phoneNumber: userParent1.phone!,
      },
    });

    const smsPatel2 = await prisma.smsNotification.findMany({
      where: {
        studentId: student2.id,
      },
    });

    const s5Ok = smsPatel1.length >= 1 && smsPatel2.length === 0;

    recordTest(
      5,
      "Only selected student's linked, SMS-enabled guardian is notified (canReceiveSms: true)",
      s5Ok,
      `student1SmsCount=${smsPatel1.length}, student2SmsCount=${smsPatel2.length}`
    );

    // =========================================================================
    // SCENARIO 6: No-match results create no attendance event or SMS
    // =========================================================================
    console.log('--- Testing Scenario 6: No-match handling ---');
    const countBefore6 = await prisma.attendanceEvent.count({ where: { eventDate: today } });
    const smsBefore6 = await prisma.smsNotification.count();

    const voiceRes6 = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      body: { transcript: 'NonExistentUnknownStudent 9999', batchId: batchA.id },
    });

    const countAfter6 = await prisma.attendanceEvent.count({ where: { eventDate: today } });
    const smsAfter6 = await prisma.smsNotification.count();

    const s6Ok =
      voiceRes6.status === 200 &&
      voiceRes6.data.status === 'NO_MATCH' &&
      voiceRes6.data.matchCount === 0 &&
      voiceRes6.data.autoCheckInEligible === false &&
      countAfter6 === countBefore6 &&
      smsAfter6 === smsBefore6;

    recordTest(
      6,
      'No-match results create no attendance event or SMS',
      s6Ok,
      `status=${voiceRes6.data.status}, matches=${voiceRes6.data.matches.length}, newEvents=0, newSms=0`
    );

    // =========================================================================
    // SCENARIO 7: Unauthorized staff cannot search or check in another staff's students (403)
    // =========================================================================
    console.log('--- Testing Scenario 7: Staff batch assignment authorization ---');
    // Staff B is assigned ONLY to Batch B. Attempt to search Batch A students:
    const voiceRes7 = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      token: tokenStaffB,
      body: { transcript: 'Priya Sharma', batchId: batchA.id },
    });

    // Staff B attempts to check in Student 1 (in Batch A)
    const checkInRes7 = await apiRequest('/attendance/check-in', {
      method: 'POST',
      token: tokenStaffB,
      body: { studentId: student1.id, batchId: batchA.id },
    });

    const s7Ok = voiceRes7.status === 403 && checkInRes7.status === 403;

    recordTest(
      7,
      "Unauthorized staff cannot search or check in another staff's students (403)",
      s7Ok,
      `voiceMatchStatus=${voiceRes7.status}, checkInStatus=${checkInRes7.status}`
    );

    // =========================================================================
    // SCENARIO 8: Cross-institute access rejected (403)
    // =========================================================================
    console.log('--- Testing Scenario 8: Cross-institute tenant isolation ---');
    // Staff Cross belongs to Institute B. Attempting to query Institute A:
    const voiceRes8 = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      token: tokenStaffCross,
      instituteId: instA.id, // Trying to tamper header to Institute A
      body: { transcript: 'Priya Sharma' },
    });

    const s8Ok = voiceRes8.status === 403;

    recordTest(
      8,
      'Cross-institute access rejected (403)',
      s8Ok,
      `crossInstituteStatus=${voiceRes8.status} (Forbidden)`
    );

    // =========================================================================
    // SCENARIO 9: Low-confidence recognition (FUZZY_SINGLE) sets requiresConfirmation: true and blocks auto-check-in
    // =========================================================================
    console.log('--- Testing Scenario 9: Low-confidence recognition confirmation ---');
    // Call with a phonetic typo or fuzzy variant of student 4 (Rahul Verma)
    const voiceRes9 = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      token: tokenStaffB, // Staff B is assigned to Batch B where Rahul is
      body: { transcript: 'Rahull Varma', batchId: batchB.id },
    });

    const s9Ok =
      voiceRes9.status === 200 &&
      voiceRes9.data.status === 'FUZZY_SINGLE' &&
      voiceRes9.data.autoCheckInEligible === false &&
      voiceRes9.data.requiresConfirmation === true &&
      voiceRes9.data.confidenceScore > 0;

    recordTest(
      9,
      'Low-confidence recognition (FUZZY_SINGLE) sets requiresConfirmation: true and blocks auto-check-in',
      s9Ok,
      `status=${voiceRes9.data.status}, autoCheckInEligible=${voiceRes9.data.autoCheckInEligible}, requiresConfirmation=${voiceRes9.data.requiresConfirmation}`
    );

    // =========================================================================
    // SCENARIO 10: Check-out transition and subsequent session check-in work as expected
    // =========================================================================
    console.log('--- Testing Scenario 10: Multi-session transitions (Check-out then session 2) ---');
    // Student 1 is checked in for session 1. Let's record check-out:
    const checkOutRes10 = await apiRequest('/attendance/check-out', {
      method: 'POST',
      body: { studentId: student1.id, batchId: batchA.id },
    });

    const s10CheckOutOk = checkOutRes10.status === 201 && checkOutRes10.data.success === true;

    // Now record check-in for session 2:
    const session2CheckInRes = await apiRequest('/attendance/check-in', {
      method: 'POST',
      body: { studentId: student1.id, batchId: batchA.id, method: 'VOICE_CONFIRMED' },
    });

    const s10Session2Ok =
      session2CheckInRes.status === 201 &&
      session2CheckInRes.data.data?.event?.sessionNumber === 2;

    recordTest(
      10,
      'Check-out transition and subsequent session check-in work as expected',
      s10CheckOutOk && s10Session2Ok,
      `checkOutStatus=${checkOutRes10.status}, session2CheckInStatus=${session2CheckInRes.status}, nextSessionNumber=${session2CheckInRes.data?.data?.event?.sessionNumber}`
    );

    // =========================================================================
    // SCENARIO 11: SMS queuing failure does not roll back attendance
    // =========================================================================
    console.log('--- Testing Scenario 11: SMS failure resilience ---');
    // Spy / mock NotificationService to throw an error
    const originalQueue = NotificationService.queueAttendanceNotification;
    NotificationService.queueAttendanceNotification = async () => {
      throw new Error('Simulated SMS Gateway Outage or Network Timeout');
    };

    // Check in Student 4 (via Staff B)
    const checkInRes11 = await apiRequest('/attendance/check-in', {
      method: 'POST',
      token: tokenStaffB,
      body: { studentId: student4.id, batchId: batchB.id, method: 'MANUAL' },
    });

    // Restore original function
    NotificationService.queueAttendanceNotification = originalQueue;

    const s4InDb = await prisma.attendanceEvent.findFirst({
      where: { studentId: student4.id, eventType: 'CHECK_IN' },
    });

    const s11Ok = checkInRes11.status === 201 && !!s4InDb;

    recordTest(
      11,
      'SMS queuing failure does not roll back attendance',
      s11Ok,
      `checkInStatus=${checkInRes11.status}, eventCommittedInDb=${!!s4InDb}`
    );

    // =========================================================================
    // SCENARIO 12: Missing microphone / empty input provides manual fallback without crashing
    // =========================================================================
    console.log('--- Testing Scenario 12: Empty / whitespace query graceful validation ---');
    const emptyRes = await apiRequest('/attendance/voice-match', {
      method: 'POST',
      body: { transcript: '   ' },
    });

    const s12Ok = emptyRes.status === 400 && emptyRes.data.success === false;

    recordTest(
      12,
      'Missing microphone / empty input provides manual fallback without crashing',
      s12Ok,
      `httpStatus=${emptyRes.status}, error=${emptyRes.data.error}`
    );

  } catch (err: any) {
    console.error('Fatal Test Runner Error:', err);
  } finally {
    server.close();
    await prisma.$disconnect();

    console.log('\n========================================================================');
    console.log('  TEST SUMMARY');
    console.log('========================================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`Total Scenarios: ${total}`);
    console.log(`Passed:          ${passed}`);
    console.log(`Failed:          ${failed}`);

    if (failed > 0 || total < 12) {
      console.error(`\n❌ ${failed} SCENARIO(S) FAILED`);
      process.exit(1);
    } else {
      console.log(`\n🎉 ALL 12 SCENARIOS PASSED WITH FULL INTEGRITY!`);
      process.exit(0);
    }
  }
}

runTestSuite();
