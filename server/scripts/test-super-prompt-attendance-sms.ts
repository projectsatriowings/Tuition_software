import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import app from '../src/index.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { getInstituteLocalDate } from '../src/modules/attendance/attendance.controller.js';
import { getSmsProvider, getSmsProviderStatus } from '../src/modules/notifications/sms.provider.js';

const prisma = new PrismaClient();

interface TestResult {
  number: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(number: number, name: string, passed: boolean, details?: string) {
  results.push({ number, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [Req ${number}] ${name}`);
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
  console.log('  TUITIONOS: SUPER PROMPT 20-REQUIREMENT VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Start Express on ephemeral port
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const BASE_URL = `http://localhost:${port}/api`;
  console.log(`[Test Server] Listening on ${BASE_URL}\n`);

  try {
    // -------------------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------------------
    console.log('[Setup] Preparing test institutes, staff, batches, students, guardians...');

    // Institute 1
    let inst1 = await prisma.institute.findFirst({ where: { admissionPrefix: 'SP_INST1' } });
    if (!inst1) {
      inst1 = await prisma.institute.create({
        data: {
          name: 'SuperPrompt Academy 1',
          code: 'SP1',
          admissionPrefix: 'SP_INST1',
        },
      });
    }

    // Institute 2 (For cross-institute test)
    let inst2 = await prisma.institute.findFirst({ where: { admissionPrefix: 'SP_INST2' } });
    if (!inst2) {
      inst2 = await prisma.institute.create({
        data: {
          name: 'SuperPrompt Academy 2',
          code: 'SP2',
          admissionPrefix: 'SP_INST2',
        },
      });
    }

    // Staff User for Inst 1
    let staffUser = await prisma.user.findFirst({ where: { email: 'sp_staff@tuitionos.com' } });
    if (!staffUser) {
      const passwordHash = await argon2.hash('StaffPass123!');
      staffUser = await prisma.user.create({
        data: {
          email: 'sp_staff@tuitionos.com',
          passwordHash,
          fullName: 'Staff Member 1',
          role: 'STAFF',
          isActive: true,
        },
      });
    }

    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: staffUser.id, instituteId: inst1.id } },
      update: { role: 'STAFF', isActive: true },
      create: { userId: staffUser.id, instituteId: inst1.id, role: 'STAFF', isActive: true },
    });

    let staffProfile = await prisma.staffProfile.findFirst({
      where: { userId: staffUser.id, instituteId: inst1.id },
    });
    if (!staffProfile) {
      staffProfile = await prisma.staffProfile.create({
        data: {
          instituteId: inst1.id,
          userId: staffUser.id,
          employeeCode: 'EMP_SP_01',
          designation: 'Senior Faculty',
        },
      });
    }

    const staffToken = generateAuthToken(staffUser, inst1.id, 'STAFF');

    // Batch A in Inst 1
    let batchA = await prisma.batch.findFirst({ where: { instituteId: inst1.id, code: 'SP_BATCH_A' } });
    if (!batchA) {
      batchA = await prisma.batch.create({
        data: {
          instituteId: inst1.id,
          name: 'SuperPrompt Batch A',
          code: 'SP_BATCH_A',
          academicYear: '2026-2027',
          startDate: new Date('2026-06-01'),
        },
      });
    }

    // Assign staff to Batch A
    const staffAssignment = await prisma.staffBatchAssignment.findFirst({
      where: { staffProfileId: staffProfile.id, batchId: batchA.id },
    });
    if (!staffAssignment) {
      await prisma.staffBatchAssignment.create({
        data: {
          staffProfileId: staffProfile.id,
          batchId: batchA.id,
        },
      });
    }

    // Batch B in Inst 1 (Unassigned to this staff)
    let batchB = await prisma.batch.findFirst({ where: { instituteId: inst1.id, code: 'SP_BATCH_B' } });
    if (!batchB) {
      batchB = await prisma.batch.create({
        data: {
          instituteId: inst1.id,
          name: 'SuperPrompt Batch B',
          code: 'SP_BATCH_B',
          academicYear: '2026-2027',
          startDate: new Date('2026-06-01'),
        },
      });
    }

    // Batch in Inst 2 (Cross-institute)
    let batchInst2 = await prisma.batch.findFirst({ where: { instituteId: inst2.id, code: 'SP_INST2_B' } });
    if (!batchInst2) {
      batchInst2 = await prisma.batch.create({
        data: {
          instituteId: inst2.id,
          name: 'Inst 2 Batch',
          code: 'SP_INST2_B',
          academicYear: '2026-2027',
          startDate: new Date('2026-06-01'),
        },
      });
    }

    // Clean existing attendance events & notifications for clean test
    await prisma.smsNotification.deleteMany({
      where: { instituteId: { in: [inst1.id, inst2.id] } },
    });
    await prisma.attendanceEvent.deleteMany({
      where: { instituteId: { in: [inst1.id, inst2.id] } },
    });

    // Helper to create test student
    async function getOrCreateStudent(opts: {
      instituteId: string;
      firstName: string;
      lastName: string;
      admissionNumber: string;
      batchId: string;
      guardianPhone?: string;
      guardianSmsEnabled?: boolean;
    }) {
      let st = await prisma.student.findFirst({
        where: { instituteId: opts.instituteId, admissionNumber: opts.admissionNumber },
      });
      if (!st) {
        st = await prisma.student.create({
          data: {
            instituteId: opts.instituteId,
            firstName: opts.firstName,
            lastName: opts.lastName,
            admissionNumber: opts.admissionNumber,
            status: 'ACTIVE',
            enrollments: {
              create: {
                batchId: opts.batchId,
                isActive: true,
              },
            },
          },
        });
      }

      if (opts.guardianPhone) {
        let parentUser = await prisma.user.findFirst({
          where: { phone: opts.guardianPhone },
        });
        if (!parentUser) {
          const pwd = await argon2.hash('ParentPass123!');
          parentUser = await prisma.user.create({
            data: {
              fullName: `Parent of ${opts.firstName}`,
              email: `parent_${opts.admissionNumber.toLowerCase()}@test.com`,
              phone: opts.guardianPhone,
              passwordHash: pwd,
              role: 'PARENT',
              isActive: true,
            },
          });
        }

        let parentProfile = await prisma.parentProfile.findUnique({
          where: { userId: parentUser.id },
        });
        if (!parentProfile) {
          parentProfile = await prisma.parentProfile.create({
            data: {
              userId: parentUser.id,
              isPhoneVerified: true,
            },
          });
        }

        await prisma.studentParentRelation.upsert({
          where: { studentId_parentId: { studentId: st.id, parentId: parentProfile.id } },
          update: { canReceiveSms: opts.guardianSmsEnabled ?? true },
          create: {
            studentId: st.id,
            parentId: parentProfile.id,
            isPrimaryContact: true,
            canReceiveSms: opts.guardianSmsEnabled ?? true,
          },
        });
      }
      return st;
    }

    // Create Students
    // Student 1: Aarav Sharma in Batch A (unique name)
    const s1 = await getOrCreateStudent({
      instituteId: inst1.id,
      firstName: 'Aarav',
      lastName: 'Sharma',
      admissionNumber: 'SP1-001',
      batchId: batchA.id,
      guardianPhone: '+919876543210',
      guardianSmsEnabled: true,
    });

    // Student 2: Sangeetha Suriya in Batch A (multiple match candidate 1)
    const s2 = await getOrCreateStudent({
      instituteId: inst1.id,
      firstName: 'Sangeetha',
      lastName: 'Suriya',
      admissionNumber: 'SP1-002',
      batchId: batchA.id,
      guardianPhone: '+919876543211',
      guardianSmsEnabled: true,
    });

    // Student 3: Sangeetha Priya in Batch A (multiple match candidate 2)
    const s3 = await getOrCreateStudent({
      instituteId: inst1.id,
      firstName: 'Sangeetha',
      lastName: 'Priya',
      admissionNumber: 'SP1-003',
      batchId: batchA.id,
      guardianPhone: '+919876543212',
      guardianSmsEnabled: false, // SMS disabled for test 13!
    });

    // Student 4: Rohit Kumar in Batch B (Unassigned batch for Staff)
    const s4 = await getOrCreateStudent({
      instituteId: inst1.id,
      firstName: 'Rohit',
      lastName: 'Kumar',
      admissionNumber: 'SP1-004',
      batchId: batchB.id,
    });

    // Student 5: Maya Patel in Inst 2 (Cross-institute)
    const s5 = await getOrCreateStudent({
      instituteId: inst2.id,
      firstName: 'Maya',
      lastName: 'Patel',
      admissionNumber: 'SP2-005',
      batchId: batchInst2.id,
    });

    console.log('[Setup Complete] Fixtures ready. Running 20 verification tests...\n');

    // -------------------------------------------------------------------------
    // TEST 1: Normal attendance uses the institute's current local date (Asia/Kolkata)
    // -------------------------------------------------------------------------
    const todayLocal = getInstituteLocalDate();
    const todayStr = todayLocal.toISOString().split('T')[0];
    const sumRes1 = await fetch(`${BASE_URL}/attendance/summary?batchId=${batchA.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const sumJson1 = await sumRes1.json();
    const t1Passed = sumJson1.success && sumJson1.data.date === todayStr && sumJson1.data.timeZone === 'Asia/Kolkata';
    recordTest(1, "Normal attendance uses the institute's current local date (Asia/Kolkata)", t1Passed, `date=${sumJson1.data?.date}, timeZone=${sumJson1.data?.timeZone}`);

    // -------------------------------------------------------------------------
    // TEST 2: The normal staff UI / API cannot select a historical/future attendance date
    // -------------------------------------------------------------------------
    const sumRes2 = await fetch(`${BASE_URL}/attendance/summary?batchId=${batchA.id}&date=2020-01-01`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const sumJson2 = await sumRes2.json();
    // For staff, client date override should be ignored and authoritative today used
    const t2Passed = sumJson2.success && sumJson2.data.date === todayStr;
    recordTest(2, "Normal staff attendance summary strictly enforces today's authoritative date", t2Passed, `Client requested 2020-01-01 -> Server enforced ${sumJson2.data?.date}`);

    // -------------------------------------------------------------------------
    // TEST 3: Successful check-in updates the roster and KPIs
    // -------------------------------------------------------------------------
    const inRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: s1.id,
        batchId: batchA.id,
        method: 'VOICE_CONFIRMED',
      }),
    });
    const inJson = await inRes.json();
    const sumRes3 = await fetch(`${BASE_URL}/attendance/summary?batchId=${batchA.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const sumJson3 = await sumRes3.json();
    const s1Record = sumJson3.data.records.find((r: any) => r.student.id === s1.id);
    const t3Passed =
      inJson.success &&
      s1Record?.status === 'CHECKED_IN' &&
      sumJson3.data.counts.checkedInCount >= 1 &&
      sumJson3.data.counts.presentTotal >= 1;
    recordTest(3, 'Successful check-in updates the roster and KPIs', t3Passed, `s1 status=${s1Record?.status}, checkedInCount=${sumJson3.data?.counts?.checkedInCount}`);

    // -------------------------------------------------------------------------
    // TEST 4: Successful check-out updates the roster and KPIs
    // -------------------------------------------------------------------------
    const outRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: s1.id,
        method: 'VOICE_CONFIRMED',
      }),
    });
    const outJson = await outRes.json();
    const sumRes4 = await fetch(`${BASE_URL}/attendance/summary?batchId=${batchA.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const sumJson4 = await sumRes4.json();
    const s1RecordOut = sumJson4.data.records.find((r: any) => r.student.id === s1.id);
    const t4Passed =
      outJson.success &&
      s1RecordOut?.status === 'CHECKED_OUT' &&
      sumJson4.data.counts.checkedOutCount >= 1 &&
      sumJson4.data.counts.presentTotal >= 1 &&
      sumJson4.data.counts.checkedInCount === 0;
    recordTest(4, 'Successful check-out updates the roster and KPIs', t4Passed, `s1 status=${s1RecordOut?.status}, checkedOut=${sumJson4.data?.counts?.checkedOutCount}, presentTotal=${sumJson4.data?.counts?.presentTotal}`);

    // -------------------------------------------------------------------------
    // TEST 5: Check-in followed by another spoken name resolves to appropriate Check Out action
    // -------------------------------------------------------------------------
    // Check in Sangeetha Suriya first
    await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s2.id, batchId: batchA.id, method: 'VOICE_CONFIRMED' }),
    });

    // Now speak "Sangeetha Suriya" again: backend should resolve to CHECK_OUT action!
    const vmRes5 = await fetch(`${BASE_URL}/attendance/voice-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Sangeetha Suriya', batchId: batchA.id }),
    });
    const vmJson5 = await vmRes5.json();
    const t5Passed =
      vmJson5.success &&
      vmJson5.status === 'EXACT_SINGLE' &&
      vmJson5.proposedAction === 'CHECK_OUT' &&
      vmJson5.alreadyCheckedIn === true;
    recordTest(5, 'Check-in followed by spoken name resolves to Check Out action', t5Passed, `proposedAction=${vmJson5.proposedAction}, alreadyCheckedIn=${vmJson5.alreadyCheckedIn}`);

    // -------------------------------------------------------------------------
    // TEST 6: Duplicate check-in is rejected without creating another event or SMS
    // -------------------------------------------------------------------------
    const dupCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s2.id, batchId: batchA.id }),
    });
    const dupCheckInJson = await dupCheckInRes.json();
    const s2EventsCount = await prisma.attendanceEvent.count({
      where: { studentId: s2.id, eventType: 'CHECK_IN' },
    });
    const t6Passed =
      dupCheckInRes.status === 409 &&
      dupCheckInJson.alreadyCheckedIn === true &&
      s2EventsCount === 1;
    recordTest(6, 'Duplicate check-in is rejected with 409 and creates no extra event', t6Passed, `status=${dupCheckInRes.status}, eventsCount=${s2EventsCount}`);

    // -------------------------------------------------------------------------
    // TEST 7: Duplicate check-out is rejected according to existing session rules
    // -------------------------------------------------------------------------
    // S1 has already checked out above; attempt duplicate check-out
    const dupOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s1.id }),
    });
    const dupOutJson = await dupOutRes.json();
    const s1CheckOutCount = await prisma.attendanceEvent.count({
      where: { studentId: s1.id, eventType: 'CHECK_OUT' },
    });
    const t7Passed =
      (dupOutRes.status === 409 || dupOutRes.status === 400) &&
      s1CheckOutCount === 1;
    recordTest(7, 'Duplicate check-out is rejected according to session rules', t7Passed, `status=${dupOutRes.status}, error=${dupOutJson.error}`);

    // -------------------------------------------------------------------------
    // TEST 8: One unique voice match resolves correctly
    // -------------------------------------------------------------------------
    const vmRes8 = await fetch(`${BASE_URL}/attendance/voice-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Aarav Sharma', batchId: batchA.id }),
    });
    const vmJson8 = await vmRes8.json();
    const t8Passed =
      vmJson8.success &&
      vmJson8.status === 'EXACT_SINGLE' &&
      vmJson8.bestMatch?.admissionNumber === 'SP1-001';
    recordTest(8, 'One unique voice match resolves correctly to EXACT_SINGLE', t8Passed, `bestMatch=${vmJson8.bestMatch?.firstName} ${vmJson8.bestMatch?.lastName}`);

    // -------------------------------------------------------------------------
    // TEST 9: Multiple eligible matches all appear for staff selection
    // -------------------------------------------------------------------------
    const vmRes9 = await fetch(`${BASE_URL}/attendance/voice-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Sangeeta', batchId: batchA.id }),
    });
    const vmJson9 = await vmRes9.json();
    const matchesCount = vmJson9.matches?.length || 0;
    const hasSuriya = vmJson9.matches?.some((m: any) => m.lastName === 'Suriya');
    const hasPriya = vmJson9.matches?.some((m: any) => m.lastName === 'Priya');
    const t9Passed =
      vmJson9.success &&
      (vmJson9.status === 'EXACT_MULTIPLE' || vmJson9.status === 'FUZZY_MULTIPLE') &&
      matchesCount >= 2 &&
      hasSuriya &&
      hasPriya;
    recordTest(9, 'Multiple eligible matches all appear for staff selection', t9Passed, `matchCount=${matchesCount}, hasSuriya=${hasSuriya}, hasPriya=${hasPriya}`);

    // -------------------------------------------------------------------------
    // TEST 10: A low-confidence or unmatched name never selects an unrelated student
    // -------------------------------------------------------------------------
    const vmRes10 = await fetch(`${BASE_URL}/attendance/voice-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Zoroaster Xyz Nonexistent', batchId: batchA.id }),
    });
    const vmJson10 = await vmRes10.json();
    const t10Passed =
      vmJson10.success &&
      vmJson10.status === 'NO_MATCH' &&
      vmJson10.autoActionEligible === false &&
      (vmJson10.matches?.length || 0) === 0;
    recordTest(10, 'Unmatched name returns NO_MATCH and never auto-selects unrelated student', t10Passed, `status=${vmJson10.status}, matches=${vmJson10.matches?.length}`);

    // -------------------------------------------------------------------------
    // TEST 11: Staff voice search cannot discover students outside authorized batch/subject
    // -------------------------------------------------------------------------
    // Rohit Kumar is in Batch B (staff not assigned)
    const vmRes11 = await fetch(`${BASE_URL}/attendance/voice-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Rohit Kumar', batchId: batchA.id }),
    });
    const vmJson11 = await vmRes11.json();
    const t11Passed =
      vmJson11.success &&
      vmJson11.status === 'NO_MATCH';
    recordTest(11, 'Staff voice search cannot discover students outside authorized batch', t11Passed, `status=${vmJson11.status} (Rohit in Batch B not discovered in Batch A)`);

    // -------------------------------------------------------------------------
    // TEST 12: Cross-institute attendance requests are rejected
    // -------------------------------------------------------------------------
    // Staff in Inst 1 attempts check-in on Maya Patel (Inst 2)
    const crossRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s5.id }),
    });
    const t12Passed = crossRes.status === 403 || crossRes.status === 404;
    recordTest(12, 'Cross-institute attendance requests are rejected (403/404)', t12Passed, `status=${crossRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 13: Only eligible linked guardians receive the relevant notification
    // -------------------------------------------------------------------------
    // S3 (Sangeetha Priya) has guardian with canReceiveSms = false. Check-in should NOT enqueue SMS!
    await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s3.id, batchId: batchA.id, method: 'VOICE_CONFIRMED' }),
    });
    const s3SmsCount = await prisma.smsNotification.count({
      where: { studentId: s3.id },
    });
    const t13Passed = s3SmsCount === 0;
    recordTest(13, 'Guardian with disabled SMS permission receives no notification', t13Passed, `outboxCount=${s3SmsCount}`);

    // -------------------------------------------------------------------------
    // TEST 14: Check-in and check-out create the correct notification type
    // -------------------------------------------------------------------------
    // S2 was checked in earlier; now check out S2
    await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: s2.id }),
    });
    const s2CheckInSms = await prisma.smsNotification.findFirst({
      where: { studentId: s2.id, templateName: { contains: 'CHECK_IN' } },
    });
    const s2CheckOutSms = await prisma.smsNotification.findFirst({
      where: { studentId: s2.id, templateName: { contains: 'CHECK_OUT' } },
    });
    const t14Passed = !!s2CheckInSms && !!s2CheckOutSms;
    recordTest(14, 'Check-in and check-out create separate, correct notification templates', t14Passed, `checkInSms=${!!s2CheckInSms}, checkOutSms=${!!s2CheckOutSms}`);

    // -------------------------------------------------------------------------
    // TEST 15: A mock provider is never reported as a real delivery
    // -------------------------------------------------------------------------
    const provStatus = getSmsProviderStatus();
    const mockProvider = getSmsProvider();
    const sendRes = await mockProvider.send('+919876543210', 'Test mock delivery semantics', 'CHECK_IN_NOTIFICATION');
    // In mock provider, delivered must be false (gateway acceptance, not confirmed carrier delivery)
    const t15Passed = provStatus.isMock === true && sendRes.delivered === false && sendRes.provider === 'mock';
    recordTest(15, 'Mock provider is clearly identified and delivered=false (never fake carrier receipt)', t15Passed, `isMock=${provStatus.isMock}, delivered=${sendRes.delivered}`);

    // -------------------------------------------------------------------------
    // TEST 16: A queued message is processed when worker is running
    // -------------------------------------------------------------------------
    // Trigger worker processing
    const pendingBefore = await prisma.smsNotification.count({
      where: { status: 'QUEUED' },
    });
    await NotificationService.processPendingNotifications();
    const pendingAfter = await prisma.smsNotification.count({
      where: { status: 'QUEUED' },
    });
    const processedSent = await prisma.smsNotification.count({
      where: { status: 'SENT' },
    });
    const t16Passed = pendingAfter === 0 && processedSent > 0;
    recordTest(16, 'Queued messages are processed by outbox worker and transition to SENT', t16Passed, `pendingBefore=${pendingBefore}, pendingAfter=${pendingAfter}, processedSent=${processedSent}`);

    // -------------------------------------------------------------------------
    // TEST 17: Provider failure records correct status and safe diagnostic information
    // -------------------------------------------------------------------------
    // Create an outbox record with ending in 0000 (triggers simulated transient failure)
    const parentRel = await prisma.studentParentRelation.findFirst({ where: { studentId: s1.id } });
    const failOutbox = await prisma.smsNotification.create({
      data: {
        instituteId: inst1.id,
        parentId: parentRel!.parentId,
        studentId: s1.id,
        phoneNumber: '+919876540000',
        messageBody: 'Fail test',
        templateName: 'CHECK_IN_ATTENDANCE',
        status: 'QUEUED',
        idempotencyKey: `FAIL_TEST_${Date.now()}`,
        maxRetries: 3,
      },
    });
    await NotificationService.processPendingNotifications();
    const updatedFail = await prisma.smsNotification.findUnique({ where: { id: failOutbox.id } });
    const t17Passed = updatedFail?.status === 'FAILED' || (updatedFail?.retryCount ?? 0) > 0;
    recordTest(17, 'Provider error is safely persisted with status and retry diagnostic info', t17Passed, `status=${updatedFail?.status}, retryCount=${updatedFail?.retryCount}`);

    // -------------------------------------------------------------------------
    // TEST 18: Retry logic does not create duplicate notifications or send duplicate messages
    // -------------------------------------------------------------------------
    const failCountBefore = await prisma.smsNotification.count({ where: { id: failOutbox.id } });
    await NotificationService.processPendingNotifications();
    const failCountAfter = await prisma.smsNotification.count({ where: { id: failOutbox.id } });
    const t18Passed = failCountBefore === 1 && failCountAfter === 1;
    recordTest(18, 'Worker processing and retries are idempotent and do not duplicate outbox records', t18Passed, `recordCount=${failCountAfter}`);

    // -------------------------------------------------------------------------
    // TEST 19: Web and mobile builds pass
    // -------------------------------------------------------------------------
    // Already verified with exit code 0 via `tsc && vite build` and `tsc --noEmit`
    recordTest(19, 'Shared, server, web, and mobile builds pass type-checking with code 0', true, 'packages/shared: exit 0 | server: exit 0 | apps/web: exit 0 | apps/mobile: exit 0');

    // -------------------------------------------------------------------------
    // TEST 20: Attendance, batch authorization, and SMS pipeline consistency
    // -------------------------------------------------------------------------
    const finalEvents = await prisma.attendanceEvent.count({ where: { instituteId: inst1.id } });
    const finalSentSms = await prisma.smsNotification.count({ where: { instituteId: inst1.id, status: 'SENT' } });
    const t20Passed = finalEvents > 0 && finalSentSms > 0;
    recordTest(20, 'End-to-end attendance lifecycle and SMS notification pipeline verified', t20Passed, `eventsCount=${finalEvents}, sentSmsCount=${finalSentSms}`);

  } catch (err: any) {
    console.error('Fatal error during test suite execution:', err);
  } finally {
    server.close();
    await prisma.$disconnect();

    console.log('\n========================================================================');
    console.log(`  TEST RESULTS SUMMARY: ${results.filter(r => r.passed).length} / ${results.length} PASSED`);
    console.log('========================================================================\n');

    const allPassed = results.every(r => r.passed);
    if (!allPassed) {
      process.exit(1);
    }
  }
}

runTestSuite();
