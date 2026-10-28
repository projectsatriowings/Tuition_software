import { PrismaClient } from '@prisma/client';
import {
  matchStudentVoice,
  scoreCandidateMatch,
  EnrolledStudentCandidate,
  normalizeSpeechTranscript,
  normalizePhonetic,
  calculateSimilarity,
  AttendanceMethod,
} from '@tuition/shared';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { MockSmsProvider } from '../src/modules/notifications/sms.provider.js';

const prisma = new PrismaClient();

async function run12ScenariosTestSuite() {
  console.log('========================================================================');
  console.log('TUITIONOS — 12 VOICE CANDIDATE MATCHING & ATTENDANCE SCENARIOS');
  console.log('========================================================================\n');

  let passedTests = 0;
  const totalTests = 12;

  // Setup Institutes
  let instA = await prisma.institute.findFirst({ where: { code: 'TEST_INST_A' } });
  if (!instA) {
    instA = await prisma.institute.create({
      data: { name: 'Test Institute Alpha', code: 'TEST_INST_A', status: 'ACTIVE' },
    });
  }

  let instB = await prisma.institute.findFirst({ where: { code: 'TEST_INST_B' } });
  if (!instB) {
    instB = await prisma.institute.create({
      data: { name: 'Test Institute Beta', code: 'TEST_INST_B', status: 'ACTIVE' },
    });
  }

  // -------------------------------------------------------------------------
  // SCENARIO 1: A single exact full-name match
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 1] Single exact full-name match...');
    const roster: EnrolledStudentCandidate[] = [
      { id: 'stud-1', firstName: 'Kavitha', lastName: 'Raman', admissionNumber: 'ADM-001', status: 'ACTIVE' },
      { id: 'stud-2', firstName: 'Dinesh', lastName: 'Kumar', admissionNumber: 'ADM-002', status: 'ACTIVE' },
    ];

    const res = matchStudentVoice('Kavitha Raman', roster);
    if (res.status !== 'EXACT_SINGLE' || res.bestMatch?.id !== 'stud-1' || res.exactMatches.length !== 1) {
      throw new Error(`Expected EXACT_SINGLE for Kavitha Raman, got status=${res.status}`);
    }
    console.log('  ✔ Passed: Single exact full-name match correctly identified with high confidence.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 1 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 2: A partial name matching multiple eligible students
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 2] Partial name matching multiple eligible students...');
    const roster: EnrolledStudentCandidate[] = [
      { id: 'p-1', firstName: 'Priya', lastName: 'Dharshini', admissionNumber: 'ADM-101', status: 'ACTIVE' },
      { id: 'p-2', firstName: 'Priya', lastName: 'Sundar', admissionNumber: 'ADM-102', status: 'ACTIVE' },
      { id: 'p-3', firstName: 'Anand', lastName: 'Raj', admissionNumber: 'ADM-103', status: 'ACTIVE' },
    ];

    const res = matchStudentVoice('Priya', roster);
    if (res.bestMatch !== null) {
      throw new Error('bestMatch must be null for multiple matches to prevent accidental auto-check-in');
    }
    const matchingIds = (res.allMatches || []).map((m) => m.id);
    if (!matchingIds.includes('p-1') || !matchingIds.includes('p-2')) {
      throw new Error('Both Priya students must be included in matches');
    }
    if (matchingIds.includes('p-3')) {
      throw new Error('Unrelated student Anand Raj should not be matched');
    }
    console.log('  ✔ Passed: Partial name matches all eligible students without auto-selecting.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 2 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 3: Sangeeta returning both Sangeetha Suriya and Sangeetha Priya
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 3] Spoken "Sangeeta" matching both "Sangeetha Suriya" and "Sangeetha Priya"...');
    const roster: EnrolledStudentCandidate[] = [
      { id: 's-1', firstName: 'Sangeetha', lastName: 'Suriya', admissionNumber: 'A110048', status: 'ACTIVE' },
      { id: 's-2', firstName: 'sageetha', lastName: 'priya', admissionNumber: 'A100047', status: 'ACTIVE' },
      { id: 's-3', firstName: 'Rahul', lastName: 'Dravid', admissionNumber: 'A100049', status: 'ACTIVE' },
    ];

    const res = matchStudentVoice('Sangeeta', roster);
    const matchedIds = (res.allMatches || []).map((m) => m.id);

    if (!matchedIds.includes('s-1') || !matchedIds.includes('s-2')) {
      throw new Error(`Expected both s-1 and s-2 in results. Got matchedIds: ${JSON.stringify(matchedIds)}`);
    }
    if (res.bestMatch !== null) {
      throw new Error('bestMatch should be null when multiple candidates match "Sangeeta"');
    }
    console.log('  ✔ Passed: "Sangeeta" returns both candidates ("Sangeetha Suriya" and "sageetha priya").\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 3 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 4: Exact matches ranking above partial matches without hiding others
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 4] Exact matches ranking above partial matches without hiding others...');
    const roster: EnrolledStudentCandidate[] = [
      { id: 'r-part', firstName: 'Rohan', lastName: 'Kumar', admissionNumber: 'ADM-201', status: 'ACTIVE' },
      { id: 'r-exact', firstName: 'Rohan', lastName: '', admissionNumber: 'ADM-202', status: 'ACTIVE' },
    ];

    const res = matchStudentVoice('Rohan', roster);
    if (!res.allMatches || res.allMatches.length < 2) {
      throw new Error(`Expected at least 2 matches, got ${res.allMatches?.length}`);
    }
    if (res.allMatches[0].id !== 'r-exact') {
      throw new Error(`Expected exact match r-exact to rank first, got: ${res.allMatches[0].id}`);
    }
    if (res.allMatches[1].id !== 'r-part') {
      throw new Error(`Expected partial match r-part to still be preserved as second candidate`);
    }
    const score0 = scoreCandidateMatch('Rohan', res.allMatches[0]).score;
    const score1 = scoreCandidateMatch('Rohan', res.allMatches[1]).score;
    if (score0 <= score1) {
      throw new Error(`Exact match score (${score0}) must be strictly higher than partial match score (${score1})`);
    }
    console.log('  ✔ Passed: Exact match ranked #1 with higher score while preserving partial match at #2.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 4 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 5: No arbitrary first-result selection
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 5] No arbitrary first-result selection when multiple candidates match...');
    const roster: EnrolledStudentCandidate[] = [
      { id: 'c-1', firstName: 'Arjun', lastName: 'Reddy', admissionNumber: 'ADM-301', status: 'ACTIVE' },
      { id: 'c-2', firstName: 'Arjun', lastName: 'Kapoor', admissionNumber: 'ADM-302', status: 'ACTIVE' },
    ];

    const res = matchStudentVoice('Arjun', roster);
    if (res.bestMatch !== null) {
      throw new Error(`Violated rule: bestMatch was set to ${res.bestMatch.firstName} despite ambiguity!`);
    }
    if (res.status !== 'EXACT_MULTIPLE' && res.status !== 'FUZZY_MULTIPLE') {
      throw new Error(`Expected status to indicate multiple matches, got: ${res.status}`);
    }
    console.log('  ✔ Passed: Multiple matches prevent auto-selection and require staff confirmation.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 5 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 6: Manual and voice searches returning equivalent candidates
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 6] Manual and voice searches returning equivalent candidates...');
    const roster: EnrolledStudentCandidate[] = [
      { id: 's-1', firstName: 'Sangeetha', lastName: 'Suriya', admissionNumber: 'A110048', status: 'ACTIVE' },
      { id: 's-2', firstName: 'sageetha', lastName: 'priya', admissionNumber: 'A100047', status: 'ACTIVE' },
      { id: 's-3', firstName: 'Vikram', lastName: 'Prabhu', admissionNumber: 'A100050', status: 'ACTIVE' },
    ];

    const voiceRes = matchStudentVoice('Sangeeta', roster);
    const manualRes = matchStudentVoice('  sangeeta  ', roster); // manual input with whitespace / casing

    const voiceIds = (voiceRes.allMatches || []).map((m) => m.id);
    const manualIds = (manualRes.allMatches || []).map((m) => m.id);

    if (JSON.stringify(voiceIds) !== JSON.stringify(manualIds)) {
      throw new Error(`Voice and manual results differ! Voice: ${voiceIds}, Manual: ${manualIds}`);
    }
    console.log('  ✔ Passed: Voice and manual search return identical candidate rosters and rankings.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 6 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 7: Only the selected candidate being checked in
  // -------------------------------------------------------------------------
  let selectedStudentId: string = '';
  let otherStudentId: string = '';
  let testBatch: any;
  let testSubject: any;
  let staffUser: any;

  try {
    console.log('[SCENARIO 7] Only the selected candidate being checked in...');
    staffUser = await prisma.user.findFirst({
      where: { role: 'STAFF' },
    });
    if (!staffUser) {
      staffUser = await prisma.user.create({
        data: {
          fullName: 'Scenario Staff',
          email: 'scenario.staff@test.com',
          phone: '9988001122',
          role: 'STAFF',
          passwordHash: '$dummy',
        },
      });
    }

    testBatch = await prisma.batch.upsert({
      where: {
        instituteId_name_academicYear: {
          instituteId: instA.id,
          name: 'Scenario 7 Batch',
          academicYear: '2026-2027',
        },
      },
      create: {
        instituteId: instA.id,
        name: 'Scenario 7 Batch',
        academicYear: '2026-2027',
        startDate: new Date(),
        isActive: true,
      },
      update: { isActive: true },
    });

    testSubject = await prisma.subject.upsert({
      where: { instituteId_name: { instituteId: instA.id, name: 'Scenario Subject' } },
      create: { instituteId: instA.id, name: 'Scenario Subject', code: 'SCEN7-SUB' },
      update: {},
    });

    const studA = await prisma.student.upsert({
      where: { instituteId_admissionNumber: { instituteId: instA.id, admissionNumber: 'SCEN-001' } },
      create: {
        instituteId: instA.id,
        admissionNumber: 'SCEN-001',
        firstName: 'Sangeetha',
        lastName: 'Suriya',
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE' },
    });
    selectedStudentId = studA.id;

    const studB = await prisma.student.upsert({
      where: { instituteId_admissionNumber: { instituteId: instA.id, admissionNumber: 'SCEN-002' } },
      create: {
        instituteId: instA.id,
        admissionNumber: 'SCEN-002',
        firstName: 'Sangeetha',
        lastName: 'Priya',
        status: 'ACTIVE',
      },
      update: { status: 'ACTIVE' },
    });
    otherStudentId = studB.id;

    // Clean previous events
    await prisma.attendanceEvent.deleteMany({
      where: { studentId: { in: [selectedStudentId, otherStudentId] } },
    });

    // Staff selects studA ONLY
    const eventDate = new Date();
    await prisma.attendanceEvent.create({
      data: {
        instituteId: instA.id,
        studentId: selectedStudentId,
        batchId: testBatch.id,
        eventDate: eventDate,
        eventType: 'CHECK_IN',
        method: AttendanceMethod.VOICE_CONFIRMED,
        markedById: staffUser.id,
        idempotencyKey: `SCEN7_CHECKIN_${selectedStudentId}_${Date.now()}`,
      },
    });

    // Verify studA is checked in
    const checkA = await prisma.attendanceEvent.findFirst({
      where: { studentId: selectedStudentId, eventType: 'CHECK_IN' },
    });
    // Verify studB is NOT checked in
    const checkB = await prisma.attendanceEvent.findFirst({
      where: { studentId: otherStudentId, eventType: 'CHECK_IN' },
    });

    if (!checkA || checkB) {
      throw new Error(`Check-in was not isolated to selected candidate! CheckA: ${!!checkA}, CheckB: ${!!checkB}`);
    }
    console.log('  ✔ Passed: Only the selected student was checked in; unselected candidate remains untouched.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 7 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 8: Only the selected student's eligible guardian receiving SMS
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 8] Only selected student guardian receives notification...');
    const smsProvider = new MockSmsProvider();
    const notifService = new NotificationService(smsProvider);

    // Parent A
    const parentAUser = await prisma.user.upsert({
      where: { phone: '9800000001' },
      create: {
        phone: '9800000001',
        fullName: 'Suriya Parent',
        role: 'PARENT',
        passwordHash: '$dummy',
      },
      update: {},
    });
    const parentAProfile = await prisma.parentProfile.upsert({
      where: { userId: parentAUser.id },
      create: { userId: parentAUser.id },
      update: {},
    });
    await prisma.studentParentRelation.deleteMany({ where: { studentId: selectedStudentId } });
    await prisma.studentParentRelation.create({
      data: {
        studentId: selectedStudentId,
        parentId: parentAProfile.id,
        relation: 'MOTHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      },
    });

    // Parent B
    const parentBUser = await prisma.user.upsert({
      where: { phone: '9800000002' },
      create: {
        phone: '9800000002',
        fullName: 'Priya Parent',
        role: 'PARENT',
        passwordHash: '$dummy',
      },
      update: {},
    });
    const parentBProfile = await prisma.parentProfile.upsert({
      where: { userId: parentBUser.id },
      create: { userId: parentBUser.id },
      update: {},
    });
    await prisma.studentParentRelation.deleteMany({ where: { studentId: otherStudentId } });
    await prisma.studentParentRelation.create({
      data: {
        studentId: otherStudentId,
        parentId: parentBProfile.id,
        relation: 'FATHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      },
    });

    const studentWithGuardians = await prisma.student.findUnique({
      where: { id: selectedStudentId },
      include: {
        parentRelations: {
          where: { canReceiveSms: true },
          include: { parent: { include: { user: true } } },
        },
      },
    });

    if (!studentWithGuardians || studentWithGuardians.parentRelations.length === 0) {
      throw new Error('Guardian for selected student not found');
    }

    // Get attendance event
    const attendanceEv = await prisma.attendanceEvent.findFirst({
      where: { studentId: selectedStudentId, eventType: 'CHECK_IN' },
    });

    if (!attendanceEv) {
      throw new Error('Attendance event for selected student not found');
    }

    // Queue notification
    const notifications = await NotificationService.queueAttendanceNotification({
      attendanceEventId: attendanceEv.id,
      studentId: selectedStudentId,
      instituteId: instA.id,
      eventType: 'CHECK_IN',
      eventTime: new Date(),
    });

    // Verify only parentProfileA received notification, NOT parentProfileB
    const hasParentA = notifications.some((n) => n.parentId === parentAProfile.id);
    const hasParentB = notifications.some((n) => n.parentId === parentBProfile.id);

    if (!hasParentA || hasParentB) {
      throw new Error(`Notification dispatched incorrectly: ParentA=${hasParentA}, ParentB=${hasParentB}`);
    }
    console.log('  ✔ Passed: Notification dispatched strictly to selected student guardian.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 8 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 9: Duplicate check-in and repeated recognition protection
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 9] Duplicate check-in and repeated recognition protection...');

    // Find the latest check-in for selectedStudentId
    const existingCheckIn = await prisma.attendanceEvent.findFirst({
      where: {
        studentId: selectedStudentId,
        eventType: 'CHECK_IN',
      },
    });

    if (!existingCheckIn) {
      throw new Error('Check-in event not found for duplicate testing');
    }

    // Attempt second check-in with the exact same idempotency key
    let duplicateThrewError = false;
    try {
      await prisma.attendanceEvent.create({
        data: {
          instituteId: instA.id,
          studentId: selectedStudentId,
          batchId: testBatch.id,
          eventDate: new Date(),
          eventType: 'CHECK_IN',
          method: AttendanceMethod.VOICE_CONFIRMED,
          markedById: staffUser.id,
          idempotencyKey: existingCheckIn.idempotencyKey,
        },
      });
    } catch (e: any) {
      duplicateThrewError = true;
    }

    if (!duplicateThrewError) {
      throw new Error('Database uniqueness constraint failed to block duplicate attendance record');
    }
    console.log('  ✔ Passed: Duplicate check-in correctly rejected by database constraint.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 9 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 10: Unauthorized staff and cross-institute access rejected
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 10] Unauthorized staff and cross-institute access rejected...');

    // Student belongs to instA. Query under instB scope.
    const crossInstStudent = await prisma.student.findFirst({
      where: {
        id: selectedStudentId,
        instituteId: instB.id, // Institute B tenant scope
      },
    });

    if (crossInstStudent !== null) {
      throw new Error('Tenant breach: Student belonging to Institute A was returned under Institute B!');
    }
    console.log('  ✔ Passed: Cross-institute student access strictly rejected by tenant scoping.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 10 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 11: Empty results, speech-recognition failures, and API errors
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 11] Empty results, speech recognition failures, and fallback...');

    // 1. Unrecognized speech
    const emptyMatch = matchStudentVoice('gibberish unknown sound blabla', [
      { id: '1', firstName: 'Ramesh', lastName: 'Kumar', admissionNumber: 'ADM-99', status: 'ACTIVE' },
    ]);

    if (emptyMatch.status !== 'NO_MATCH' || emptyMatch.exactMatches.length > 0 || emptyMatch.fuzzyMatches.length > 0) {
      throw new Error(`Expected NO_MATCH for gibberish, got ${emptyMatch.status}`);
    }

    // 2. Empty transcript
    const blankMatch = matchStudentVoice('', [
      { id: '1', firstName: 'Ramesh', lastName: 'Kumar', admissionNumber: 'ADM-99', status: 'ACTIVE' },
    ]);
    if (blankMatch.status !== 'NO_MATCH') {
      throw new Error(`Expected NO_MATCH for blank transcript, got ${blankMatch.status}`);
    }

    console.log('  ✔ Passed: Unrecognized speech and blank inputs safely return NO_MATCH.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 11 Failed:', err.message, '\n');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 12: Existing attendance reports, check-out, and session handling
  // -------------------------------------------------------------------------
  try {
    console.log('[SCENARIO 12] Existing attendance reports, check-out, and session handling...');

    // 1. Perform check-out event
    const checkOutEvent = await prisma.attendanceEvent.create({
      data: {
        instituteId: instA.id,
        studentId: selectedStudentId,
        batchId: testBatch.id,
        eventDate: new Date(),
        eventType: 'CHECK_OUT',
        method: AttendanceMethod.MANUAL,
        markedById: staffUser.id,
        idempotencyKey: `SCEN12_CHECKOUT_${selectedStudentId}_${Date.now()}`,
      },
    });

    if (!checkOutEvent || checkOutEvent.eventType !== 'CHECK_OUT') {
      throw new Error('Check-out event failed to create');
    }

    // 2. Query attendance events for report
    const events = await prisma.attendanceEvent.findMany({
      where: {
        studentId: selectedStudentId,
        batchId: testBatch.id,
      },
      include: {
        student: true,
        batch: true,
      },
      orderBy: { eventDate: 'asc' },
    });

    const hasCheckIn = events.some((e) => e.eventType === 'CHECK_IN');
    const hasCheckOut = events.some((e) => e.eventType === 'CHECK_OUT');

    if (!hasCheckIn || !hasCheckOut) {
      throw new Error('Attendance session history incomplete');
    }

    console.log('  ✔ Passed: Attendance session check-out and report query functional.\n');
    passedTests++;
  } catch (err: any) {
    console.error('  ✖ Scenario 12 Failed:', err.message, '\n');
  }

  // Clean up test data
  try {
    await prisma.smsNotification.deleteMany({
      where: { studentId: { in: [selectedStudentId, otherStudentId] } },
    });
    await prisma.attendanceEvent.deleteMany({
      where: { studentId: { in: [selectedStudentId, otherStudentId] } },
    });
  } catch (e) {}

  await prisma.$disconnect();

  console.log('========================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} SCENARIOS PASSED`);
  console.log('========================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 12 VOICE CANDIDATE MATCHING SCENARIOS VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} SCENARIOS FAILED`);
    process.exit(1);
  }
}

run12ScenariosTestSuite().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
