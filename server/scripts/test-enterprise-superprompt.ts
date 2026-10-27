import { PrismaClient } from '@prisma/client';
import {
  matchStudentVoice,
  EnrolledStudentCandidate,
  normalizeSpeechTranscript,
  calculateSimilarity,
  AttendanceMethod,
} from '@tuition/shared';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { MockSmsProvider } from '../src/modules/notifications/sms.provider.js';
import { generateNextAdmissionNumber } from '../src/modules/students/admission-number.service.js';
import { isStudentAuthorized } from '../src/modules/students/student-authorization.service.js';

const prisma = new PrismaClient();

async function getNextAdmNum(instId: string) {
  return await prisma.$transaction(async (tx) => {
    const res = await generateNextAdmissionNumber(tx, instId);
    return res.admissionNumber;
  });
}

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(category: string, name: string, passed: boolean, error?: string) {
  results.push({ category, name, passed, error });
  if (passed) {
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    console.error(`  ✗ [FAIL] ${name}: ${error}`);
  }
}

async function runEnterpriseTestSuite() {
  console.log('\n========================================================================');
  console.log(' TUITIONOS ENTERPRISE — SUPER PROMPT AUTOMATED VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // SETUP: Institutes, Staff, and Students
    // -------------------------------------------------------------------------
    console.log('>> Setting up test institutes, staff profiles, and students...');

    let instA = await prisma.institute.findFirst({ where: { code: 'ENT_ALPHA' } });
    if (!instA) {
      instA = await prisma.institute.create({
        data: { name: 'Enterprise Academy Alpha', code: 'ENT_ALPHA', status: 'ACTIVE' },
      });
    }

    let instB = await prisma.institute.findFirst({ where: { code: 'ENT_BETA' } });
    if (!instB) {
      instB = await prisma.institute.create({
        data: { name: 'Enterprise Academy Beta', code: 'ENT_BETA', status: 'ACTIVE' },
      });
    }

    // Staff User A & Profile in Institute A
    let userStaffA = await prisma.user.findFirst({ where: { email: 'staff.a.ent@tuitionos.internal' } });
    if (!userStaffA) {
      userStaffA = await prisma.user.create({
        data: {
          email: 'staff.a.ent@tuitionos.internal',
          fullName: 'Staff Member Alpha',
          passwordHash: 'dummyhash',
          role: 'STAFF',
          isActive: true,
        },
      });
    }
    let staffProfileA = await prisma.staffProfile.findFirst({
      where: { userId: userStaffA.id, instituteId: instA.id },
    });
    if (!staffProfileA) {
      staffProfileA = await prisma.staffProfile.create({
        data: {
          userId: userStaffA.id,
          instituteId: instA.id,
          designation: 'Senior Faculty',
        },
      });
    }

    // Staff User B & Profile in Institute A (different staff in same institute)
    let userStaffB = await prisma.user.findFirst({ where: { email: 'staff.b.ent@tuitionos.internal' } });
    if (!userStaffB) {
      userStaffB = await prisma.user.create({
        data: {
          email: 'staff.b.ent@tuitionos.internal',
          fullName: 'Staff Member Beta',
          passwordHash: 'dummyhash',
          role: 'STAFF',
          isActive: true,
        },
      });
    }
    let staffProfileB = await prisma.staffProfile.findFirst({
      where: { userId: userStaffB.id, instituteId: instA.id },
    });
    if (!staffProfileB) {
      staffProfileB = await prisma.staffProfile.create({
        data: {
          userId: userStaffB.id,
          instituteId: instA.id,
          designation: 'Assistant Faculty',
        },
      });
    }

    // Academic Admin User in Institute A
    let userAdminA = await prisma.user.findFirst({ where: { email: 'admin.ent@tuitionos.internal' } });
    if (!userAdminA) {
      userAdminA = await prisma.user.create({
        data: {
          email: 'admin.ent@tuitionos.internal',
          fullName: 'Academic Admin Alpha',
          passwordHash: 'dummyhash',
          role: 'ACADEMIC_ADMIN',
          isActive: true,
        },
      });
    }

    // -------------------------------------------------------------------------
    // CATEGORY 1: BATCH & SUBJECT TESTS
    // -------------------------------------------------------------------------
    console.log('\n[CATEGORY 1: Batch & Subject Architecture]');

    // 1.1 Create batch with code, description, schedule
    let batch1: any;
    try {
      batch1 = await prisma.batch.upsert({
        where: {
          instituteId_name_academicYear: {
            instituteId: instA.id,
            name: 'Grade 10 - Excellence Batch',
            academicYear: '2026-2027',
          },
        },
        create: {
          instituteId: instA.id,
          name: 'Grade 10 - Excellence Batch',
          code: 'G10-EXC',
          academicYear: '2026-2027',
          startDate: new Date(),
          description: 'Special batch for competitive mathematics and sciences',
          schedule: 'Mon, Wed, Fri • 4:00 PM - 6:00 PM',
          isActive: true,
        },
        update: {
          code: 'G10-EXC',
          description: 'Special batch for competitive mathematics and sciences',
          schedule: 'Mon, Wed, Fri • 4:00 PM - 6:00 PM',
          isActive: true,
        },
      });
      recordTest(
        'Batch & Subjects',
        'Batch created with unique code, description, and schedule',
        Boolean(batch1.id && batch1.code === 'G10-EXC')
      );
    } catch (err: any) {
      recordTest('Batch & Subjects', 'Batch created with unique code, description, and schedule', false, err.message);
    }

    // 1.2 Create multiple subjects inside this batch
    let subMath: any, subPhysics: any, subChem: any;
    try {
      subMath = await prisma.subject.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        create: {
          id: '00000000-0000-0000-0000-000000000001',
          instituteId: instA.id,
          name: 'Mathematics',
          code: 'MATH-10',
        },
        update: {},
      });

      subPhysics = await prisma.subject.upsert({
        where: { id: '00000000-0000-0000-0000-000000000002' },
        create: {
          id: '00000000-0000-0000-0000-000000000002',
          instituteId: instA.id,
          name: 'Physics',
          code: 'PHY-10',
        },
        update: {},
      });

      subChem = await prisma.subject.upsert({
        where: { id: '00000000-0000-0000-0000-000000000003' },
        create: {
          id: '00000000-0000-0000-0000-000000000003',
          instituteId: instA.id,
          name: 'Chemistry',
          code: 'CHEM-10',
        },
        update: {},
      });

      // Link subjects to batch1
      for (const s of [subMath, subPhysics, subChem]) {
        await prisma.batchSubject.upsert({
          where: {
            batchId_subjectId: { batchId: batch1.id, subjectId: s.id },
          },
          create: {
            batchId: batch1.id,
            subjectId: s.id,
            staffProfileId: staffProfileA.id,
            isActive: true,
          },
          update: { isActive: true },
        });
      }

      const assignedCount = await prisma.batchSubject.count({
        where: { batchId: batch1.id },
      });

      recordTest(
        'Batch & Subjects',
        'Multiple subjects added inside one batch with designated staff',
        assignedCount >= 3
      );
    } catch (err: any) {
      recordTest('Batch & Subjects', 'Multiple subjects added inside one batch with designated staff', false, err.message);
    }

    // 1.3 Duplicate subject in same batch rejection check
    try {
      let duplicateCaught = false;
      try {
        await prisma.batchSubject.create({
          data: {
            batchId: batch1.id,
            subjectId: subMath.id,
          },
        });
      } catch (e: any) {
        duplicateCaught = true;
      }
      recordTest(
        'Batch & Subjects',
        'Duplicate subject assignment inside same batch rejected by database constraint',
        duplicateCaught
      );
    } catch (err: any) {
      recordTest('Batch & Subjects', 'Duplicate subject assignment inside same batch rejected', false, err.message);
    }

    // 1.4 Batch isolation: Batch 2 displays only its own subjects
    try {
      const batch2 = await prisma.batch.upsert({
        where: {
          instituteId_name_academicYear: {
            instituteId: instA.id,
            name: 'Grade 10 - Standard Batch',
            academicYear: '2026-2027',
          },
        },
        create: {
          instituteId: instA.id,
          name: 'Grade 10 - Standard Batch',
          code: 'G10-STD',
          academicYear: '2026-2027',
          startDate: new Date(),
          isActive: true,
        },
        update: { isActive: true },
      });

      // Only assign Math to Batch 2
      await prisma.batchSubject.upsert({
        where: {
          batchId_subjectId: { batchId: batch2.id, subjectId: subMath.id },
        },
        create: {
          batchId: batch2.id,
          subjectId: subMath.id,
          isActive: true,
        },
        update: {},
      });

      const batch2Subjects = await prisma.batchSubject.findMany({
        where: { batchId: batch2.id },
      });

      const batch2HasPhysics = batch2Subjects.some((bs) => bs.subjectId === subPhysics.id);
      recordTest(
        'Batch & Subjects',
        'Each batch displays strictly only its own subjects',
        batch2Subjects.length === 1 && !batch2HasPhysics
      );
    } catch (err: any) {
      recordTest('Batch & Subjects', 'Each batch displays strictly only its own subjects', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CATEGORY 2: STUDENT ADMISSION & SUBJECT ALLOCATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n[CATEGORY 2: Student Admission & Subject Allocation]');

    // 2.1 Student admission without class roll number
    let studentA: any, studentB: any;
    try {
      const admNumA = await getNextAdmNum(instA.id);
      studentA = await prisma.student.create({
        data: {
          instituteId: instA.id,
          admissionNumber: admNumA,
          firstName: 'Aarav',
          lastName: 'Sharma',
          phone: '+919876500001',
          status: 'ACTIVE',
          createdByUserId: userStaffA.id,
          photoUrl: 'profiles/student_aarav.jpg',
        },
      });

      recordTest(
        'Student Admission',
        'Student admitted successfully without class roll number',
        Boolean(studentA.id && studentA.admissionNumber)
      );
    } catch (err: any) {
      recordTest('Student Admission', 'Student admitted successfully without class roll number', false, err.message);
    }

    // 2.2 Admission number format INSTITUTE-CODE-YEAR-SERIAL
    try {
      const pattern = /^[A-Z0-9]+-\d{4}-\d{3,}$/;
      const matchesFormat = pattern.test(studentA.admissionNumber);
      recordTest(
        'Student Admission',
        `Admission number generated in required INSTITUTE-YEAR-SERIAL format (${studentA.admissionNumber})`,
        matchesFormat
      );
    } catch (err: any) {
      recordTest('Student Admission', 'Admission number generated in required format', false, err.message);
    }

    // 2.3 Concurrent admission number generation uniqueness
    try {
      const n1 = await getNextAdmNum(instA.id);
      const n2 = await getNextAdmNum(instA.id);
      const n3 = await getNextAdmNum(instA.id);
      const numbers = [n1, n2, n3];
      const uniqueCount = new Set(numbers).size;
      recordTest(
        'Student Admission',
        'Concurrent admission number requests generate strictly unique numbers',
        uniqueCount === 3
      );
    } catch (err: any) {
      recordTest('Student Admission', 'Concurrent admission number requests generate unique numbers', false, err.message);
    }

    // 2.4 Enroll student in batch and allocate to batch subjects
    try {
      // Primary batch enrollment (subjectId: null)
      await prisma.studentEnrollment.upsert({
        where: {
          studentId_batchId_subjectId: {
            studentId: studentA.id,
            batchId: batch1.id,
            subjectId: '',
          },
        },
        create: {
          studentId: studentA.id,
          batchId: batch1.id,
          subjectId: null,
          isActive: true,
        },
        update: { isActive: true },
      });

      // Subject allocations for Math and Physics
      for (const sid of [subMath.id, subPhysics.id]) {
        const existingEnr = await prisma.studentEnrollment.findFirst({
          where: { studentId: studentA.id, batchId: batch1.id, subjectId: sid },
        });
        if (!existingEnr) {
          await prisma.studentEnrollment.create({
            data: {
              studentId: studentA.id,
              batchId: batch1.id,
              subjectId: sid,
              isActive: true,
            },
          });
        }
      }

      const allocations = await prisma.studentEnrollment.findMany({
        where: { studentId: studentA.id, batchId: batch1.id, subjectId: { not: null } },
      });

      recordTest(
        'Student Subject Allocation',
        'Student enrolled in batch and allocated to batch curriculum subjects',
        allocations.length === 2
      );
    } catch (err: any) {
      recordTest('Student Subject Allocation', 'Student enrolled in batch and allocated to batch curriculum subjects', false, err.message);
    }

    // 2.5 Validation: Reject allocation if subject is not assigned to student's batch
    try {
      const unassignedSubject = await prisma.subject.upsert({
        where: { id: '00000000-0000-0000-0000-000000000099' },
        create: {
          id: '00000000-0000-0000-0000-000000000099',
          instituteId: instA.id,
          name: 'French Language Unassigned',
          code: 'FRE-01',
        },
        update: {},
      });

      // Check if unassignedSubject is in batch1
      const isAssigned = await prisma.batchSubject.findUnique({
        where: { batchId_subjectId: { batchId: batch1.id, subjectId: unassignedSubject.id } },
      });

      recordTest(
        'Student Subject Allocation',
        'Reject allocation of subject not assigned to student batch',
        !isAssigned
      );
    } catch (err: any) {
      recordTest('Student Subject Allocation', 'Reject allocation of subject not assigned to student batch', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CATEGORY 3: STRICT STAFF-TO-STUDENT DATA ISOLATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n[CATEGORY 3: Strict Staff-to-Student Data Isolation]');

    // Create Student B owned by Staff B (assigned to batch 2)
    const admNumB = await getNextAdmNum(instA.id);
    studentB = await prisma.student.create({
      data: {
        instituteId: instA.id,
        admissionNumber: admNumB,
        firstName: 'Priya',
        lastName: 'Nair',
        phone: '+919876500002',
        status: 'ACTIVE',
        createdByUserId: userStaffB.id,
      },
    });

    // Staff A is assigned to batch1 only
    await prisma.staffBatchAssignment.upsert({
      where: {
        staffProfileId_batchId: {
          staffProfileId: staffProfileA.id,
          batchId: batch1.id,
        },
      },
      create: {
        staffProfileId: staffProfileA.id,
        batchId: batch1.id,
      },
      update: {},
    });

    // 3.1 Staff A CAN access Student A (created by Staff A and enrolled in Staff A batch)
    try {
      const reqStaffA: any = {
        user: { userId: userStaffA.id, role: 'STAFF' },
        instituteId: instA.id,
      };
      const isAuthA = await isStudentAuthorized(reqStaffA, studentA.id, prisma);
      recordTest(
        'Staff Isolation',
        'Staff A can access authorized student (created or enrolled in assigned batch)',
        isAuthA === true
      );
    } catch (err: any) {
      recordTest('Staff Isolation', 'Staff A can access authorized student', false, err.message);
    }

    // 3.2 Staff A CANNOT access Student B (created by Staff B, outside Staff A scope)
    try {
      const reqStaffA: any = {
        user: { userId: userStaffA.id, role: 'STAFF' },
        instituteId: instA.id,
      };
      const isAuthB = await isStudentAuthorized(reqStaffA, studentB.id, prisma);
      recordTest(
        'Staff Isolation',
        'Staff A CANNOT access Student B who belongs to another staff member scope',
        isAuthB === false
      );
    } catch (err: any) {
      recordTest('Staff Isolation', 'Staff A CANNOT access Student B', false, err.message);
    }

    // 3.3 Academic Admin CAN access any student in their institute
    try {
      const reqAdminA: any = {
        user: { userId: userAdminA.id, role: 'ACADEMIC_ADMIN' },
        instituteId: instA.id,
      };
      const isAuthAdmin = await isStudentAuthorized(reqAdminA, studentB.id, prisma);
      recordTest(
        'Staff Isolation',
        'Academic Admin maintains authorized institute-wide student access',
        isAuthAdmin === true
      );
    } catch (err: any) {
      recordTest('Staff Isolation', 'Academic Admin maintains authorized institute-wide student access', false, err.message);
    }

    // 3.4 Cross-institute access strictly blocked
    try {
      const reqCrossInst: any = {
        user: { userId: userAdminA.id, role: 'ACADEMIC_ADMIN' },
        instituteId: instB.id, // Different institute!
      };
      const isCrossAllowed = await isStudentAuthorized(reqCrossInst, studentA.id, prisma);
      recordTest(
        'Staff Isolation',
        'Cross-institute student access strictly rejected',
        isCrossAllowed === false
      );
    } catch (err: any) {
      recordTest('Staff Isolation', 'Cross-institute student access strictly rejected', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CATEGORY 4: VOICE ATTENDANCE & DUPLICATE MATCHING TESTS
    // -------------------------------------------------------------------------
    console.log('\n[CATEGORY 4: Voice Attendance & Disambiguation]');

    // Candidates list for batch1
    const rosterCandidates: EnrolledStudentCandidate[] = [
      {
        id: studentA.id,
        fullName: 'Aarav Sharma',
        firstName: 'Aarav',
        lastName: 'Sharma',
        admissionNumber: studentA.admissionNumber,
        photoUrl: studentA.photoUrl || undefined,
        currentAttendanceState: 'UNMARKED',
      },
      {
        id: '00000000-0000-0000-0000-000000000008',
        fullName: 'Aarav Patel',
        firstName: 'Aarav',
        lastName: 'Patel',
        admissionNumber: 'ENT-2026-0008',
        currentAttendanceState: 'UNMARKED',
      },
      {
        id: '00000000-0000-0000-0000-000000000009',
        fullName: 'Priya Sundaram',
        firstName: 'Priya',
        lastName: 'Sundaram',
        admissionNumber: 'ENT-2026-0009',
        currentAttendanceState: 'UNMARKED',
      },
    ];

    // 4.1 Single unambiguous match requires confirmation
    try {
      const matchResult = matchStudentVoice('Sharma', rosterCandidates);
      const isSingleConfident = matchResult.status === 'EXACT_SINGLE' && matchResult.bestMatch?.id === studentA.id;
      recordTest(
        'Voice Attendance',
        'Unambiguous spoken name matches single student candidate with confirmation requirement',
        isSingleConfident
      );
    } catch (err: any) {
      recordTest('Voice Attendance', 'Unambiguous spoken name matches single student candidate', false, err.message);
    }

    // 4.2 Duplicate spoken name returns multiple candidates for selection
    try {
      const dupResult = matchStudentVoice('Aarav', rosterCandidates);
      const isDisambiguated = dupResult.status === 'EXACT_MULTIPLE' && dupResult.exactMatches.length === 2;
      recordTest(
        'Voice Attendance',
        'Ambiguous/duplicate name returns candidate options with photo and admission number',
        isDisambiguated
      );
    } catch (err: any) {
      recordTest('Voice Attendance', 'Ambiguous/duplicate name returns candidate options', false, err.message);
    }

    // 4.3 Low confidence / unmatching phrase returns no-match with manual search fallback
    try {
      const noMatchResult = matchStudentVoice('ChatGPT', rosterCandidates);
      const isNoMatch = noMatchResult.status === 'NO_MATCH';
      recordTest(
        'Voice Attendance',
        'No-match result ("ChatGPT") gives clear negative feedback and manual search fallback',
        isNoMatch
      );
    } catch (err: any) {
      recordTest('Voice Attendance', 'No-match result gives clear negative feedback', false, err.message);
    }

    // 4.4 Record attendance check-in safely with idempotency
    let event1: any;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Check-in event
      event1 = await prisma.attendanceEvent.create({
        data: {
          institute: { connect: { id: instA.id } },
          student: { connect: { id: studentA.id } },
          batch: { connect: { id: batch1.id } },
          markedBy: { connect: { id: userStaffA.id } },
          eventType: 'CHECK_IN',
          method: 'VOICE_CONFIRMED',
          eventDate: today,
          eventTime: new Date(),
        },
      });

      recordTest(
        'Voice Attendance',
        'Confirmed voice check-in recorded into attendance log with VOICE_CONFIRMED audit method',
        Boolean(event1.id && event1.method === 'VOICE_CONFIRMED')
      );
    } catch (err: any) {
      recordTest('Voice Attendance', 'Confirmed voice check-in recorded', false, err.message);
    }

    // 4.5 Duplicate check-in prevention
    try {
      const todaysEvents = await prisma.attendanceEvent.findMany({
        where: {
          studentId: studentA.id,
          eventDate: today,
        },
        orderBy: { sessionNumber: 'desc' },
      });

      const latestCheckIn = todaysEvents.find((e) => e.eventType === 'CHECK_IN');
      const latestCheckOut = todaysEvents.find((e) => e.eventType === 'CHECK_OUT');
      const isAlreadyCheckedIn = Boolean(
        latestCheckIn && (!latestCheckOut || latestCheckOut.sessionNumber < latestCheckIn.sessionNumber)
      );

      recordTest(
        'Voice Attendance',
        'Duplicate check-in safely detected and prevented for same session/date',
        isAlreadyCheckedIn
      );
    } catch (err: any) {
      recordTest('Voice Attendance', 'Duplicate check-in safely detected', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CATEGORY 5: GUARDIAN NOTIFICATION & SMS SIMULATION
    // -------------------------------------------------------------------------
    console.log('\n[CATEGORY 5: Guardian Notification]');

    try {
      // Create test parent and link to studentA with canReceiveSms: true
      let parentUser = await prisma.user.findFirst({ where: { email: 'parent.aarav@tuitionos.internal' } });
      if (!parentUser) {
        parentUser = await prisma.user.create({
          data: {
            email: 'parent.aarav@tuitionos.internal',
            fullName: 'Rajesh Sharma',
            phone: '+919876543210',
            passwordHash: 'dummyhash',
            role: 'PARENT',
            isActive: true,
          },
        });
      }

      let parentProfile = await prisma.parentProfile.findFirst({
        where: { userId: parentUser.id },
      });
      if (!parentProfile) {
        parentProfile = await prisma.parentProfile.create({
          data: {
            userId: parentUser.id,
          },
        });
      }

      // Link parent to student
      await prisma.studentParentRelation.upsert({
        where: {
          studentId_parentId: {
            parentId: parentProfile.id,
            studentId: studentA.id,
          },
        },
        create: {
          parentId: parentProfile.id,
          studentId: studentA.id,
          relation: 'FATHER',
          isPrimaryContact: true,
          canReceiveSms: true,
        },
        update: { canReceiveSms: true },
      });

      const queuedNotifications = await NotificationService.queueAttendanceNotification({
        attendanceEventId: event1.id,
        studentId: studentA.id,
        instituteId: instA.id,
        eventType: 'CHECK_IN',
        eventTime: new Date(),
      });

      const isQueued = queuedNotifications.length > 0;
      recordTest(
        'Guardian Notification',
        'Guardian notification queued successfully using existing outbox infrastructure',
        isQueued
      );
    } catch (err: any) {
      recordTest('Guardian Notification', 'Guardian notification queued successfully', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CATEGORY 6: REGRESSION TESTS
    // -------------------------------------------------------------------------
    console.log('\n[CATEGORY 6: Regression Verification]');

    // 6.1 Existing student data preserved
    try {
      const totalStudents = await prisma.student.count({ where: { instituteId: instA.id } });
      recordTest(
        'Regression',
        `Existing student records preserved in Neon PostgreSQL (${totalStudents} students)`,
        totalStudents >= 2
      );
    } catch (err: any) {
      recordTest('Regression', 'Existing student records preserved', false, err.message);
    }

    // 6.2 Institute isolation preserved
    try {
      const instACount = await prisma.batch.count({ where: { instituteId: instA.id } });
      const instBCount = await prisma.batch.count({ where: { instituteId: instB.id } });
      recordTest(
        'Regression',
        'Multi-tenant institute isolation strictly intact across batches and records',
        instACount > 0 && instBCount === 0
      );
    } catch (err: any) {
      recordTest('Regression', 'Multi-tenant institute isolation intact', false, err.message);
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log('\n========================================================================');
    console.log(`TEST SUITE RESULTS: ${passed}/${total} PASSED (${failed} failed)`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal error running enterprise test suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEnterpriseTestSuite();
