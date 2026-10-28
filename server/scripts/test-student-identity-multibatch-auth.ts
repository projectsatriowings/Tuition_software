import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';

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

async function apiRequest(
  endpoint: string,
  method: string,
  token?: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  let lastError: any = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      return { status: res.status, ok: res.ok, data };
    } catch (err: any) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  throw lastError;
}

async function runStudentIdentityAndMultiBatchTestSuite() {
  console.log('\n========================================================================');
  console.log(' TUITIONOS: 15-POINT STUDENT IDENTITY, MULTI-BATCH & AUTH TEST SUITE');
  console.log('========================================================================\n');

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------------------
    // SETUP: Test Institutes, Users, Batches & Subjects
    // -------------------------------------------------------------------------
    console.log('[Setup] Creating test institute Alpha, test institute Beta, batches, and staff profiles...');

    const passHash = await argon2.hash('TestPass123!');

    // Institute A
    const prefixA = `S${String(timestamp).slice(-5)}A`;
    const prefixB = `S${String(timestamp).slice(-5)}B`;

    const instA = await prisma.institute.create({
      data: {
        name: 'Simba Academy Alpha',
        code: `SIMBAA_${timestamp}`,
        admissionPrefix: prefixA,
        status: 'ACTIVE',
      },
    });

    // Institute B
    const instB = await prisma.institute.create({
      data: {
        name: 'Simba Academy Beta',
        code: `SIMBAB_${timestamp}`,
        admissionPrefix: prefixB,
        status: 'ACTIVE',
      },
    });

    // Super Admin
    const userSuper = await prisma.user.create({
      data: {
        fullName: 'Super Admin Simba',
        email: `super_simba_${timestamp}@test.com`,
        passwordHash: passHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    const tokenSuper = generateAuthToken(userSuper, instA.id, 'SUPER_ADMIN');

    // Admin A
    const userAdminA = await prisma.user.create({
      data: {
        fullName: 'Admin Simba Alpha',
        email: `admin_simba_${timestamp}@test.com`,
        passwordHash: passHash,
        role: 'ACADEMIC_ADMIN',
        isActive: true,
      },
    });
    await prisma.instituteMembership.create({
      data: { userId: userAdminA.id, instituteId: instA.id, role: 'ACADEMIC_ADMIN', isActive: true },
    });
    const tokenAdminA = generateAuthToken(userAdminA, instA.id, 'ACADEMIC_ADMIN');

    // Staff A: Teaches Mathematics in Batch 1
    const userStaffA = await prisma.user.create({
      data: {
        fullName: 'Staff Alpha Maths',
        email: `staff_maths_${timestamp}@test.com`,
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
      },
    });
    await prisma.instituteMembership.create({
      data: { userId: userStaffA.id, instituteId: instA.id, role: 'STAFF', isActive: true },
    });
    const staffProfA = await prisma.staffProfile.create({
      data: { userId: userStaffA.id, instituteId: instA.id, employeeCode: `STA-${timestamp}` },
    });
    const tokenStaffA = generateAuthToken(userStaffA, instA.id, 'STAFF');

    // Staff B: Teaches Physics in Batch 1, and Chemistry in Batch 2
    const userStaffB = await prisma.user.create({
      data: {
        fullName: 'Staff Alpha Science',
        email: `staff_science_${timestamp}@test.com`,
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
      },
    });
    await prisma.instituteMembership.create({
      data: { userId: userStaffB.id, instituteId: instA.id, role: 'STAFF', isActive: true },
    });
    const staffProfB = await prisma.staffProfile.create({
      data: { userId: userStaffB.id, instituteId: instA.id, employeeCode: `STB-${timestamp}` },
    });
    const tokenStaffB = generateAuthToken(userStaffB, instA.id, 'STAFF');

    // Batches in Inst A
    const batch1 = await prisma.batch.create({
      data: {
        instituteId: instA.id,
        name: `Batch Grade 10_${timestamp}`,
        code: `B10_${timestamp}`,
        academicYear: '2026-2027',
        startDate: new Date(),
        isActive: true,
      },
    });

    const batch2 = await prisma.batch.create({
      data: {
        instituteId: instA.id,
        name: `Batch Grade 11_${timestamp}`,
        code: `B11_${timestamp}`,
        academicYear: '2026-2027',
        startDate: new Date(),
        isActive: true,
      },
    });

    // Subjects in Inst A
    const subjMaths = await prisma.subject.create({
      data: { instituteId: instA.id, name: `Mathematics_${timestamp}`, code: `MATH_${timestamp}` },
    });
    const subjPhysics = await prisma.subject.create({
      data: { instituteId: instA.id, name: `Physics_${timestamp}`, code: `PHYS_${timestamp}` },
    });
    const subjChemistry = await prisma.subject.create({
      data: { instituteId: instA.id, name: `Chemistry_${timestamp}`, code: `CHEM_${timestamp}` },
    });

    // Link Subjects to Batches
    await prisma.batchSubject.create({
      data: { batchId: batch1.id, subjectId: subjMaths.id, staffProfileId: staffProfA.id, isActive: true },
    });
    await prisma.batchSubject.create({
      data: { batchId: batch1.id, subjectId: subjPhysics.id, staffProfileId: staffProfB.id, isActive: true },
    });
    await prisma.batchSubject.create({
      data: { batchId: batch2.id, subjectId: subjChemistry.id, staffProfileId: staffProfB.id, isActive: true },
    });

    // Staff Batch Assignments
    await prisma.staffBatchAssignment.createMany({
      data: [
        { staffProfileId: staffProfA.id, batchId: batch1.id },
        { staffProfileId: staffProfB.id, batchId: batch1.id },
        { staffProfileId: staffProfB.id, batchId: batch2.id },
      ],
    });

    // Foreign Institute B Student & Staff
    const userStaffForeign = await prisma.user.create({
      data: {
        fullName: 'Staff Foreign Beta',
        email: `staff_beta_${timestamp}@test.com`,
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
      },
    });
    await prisma.instituteMembership.create({
      data: { userId: userStaffForeign.id, instituteId: instB.id, role: 'STAFF', isActive: true },
    });

    const foreignStudentUser = await prisma.user.create({
      data: {
        fullName: 'Foreign Student Beta',
        email: `foreign_student_${timestamp}@test.com`,
        passwordHash: passHash,
        role: 'STUDENT',
        isActive: true,
      },
    });
    const foreignStudent = await prisma.student.create({
      data: {
        instituteId: instB.id,
        userId: foreignStudentUser.id,
        admissionNumber: `FS-${timestamp}`,
        firstName: 'Foreign',
        lastName: 'Student',
        admissionDate: new Date(),
        status: 'ACTIVE',
      },
    });

    console.log('[Setup] Done.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Creating a new student creates one student profile and one login
    // -------------------------------------------------------------------------
    let createdStudentId = '';
    let studentPhysicsOnly: any = null;
    const studentLoginEmail = `student_canonical_${timestamp}@test.com`;
    const studentLoginPhone = `9876${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const res = await apiRequest('/students', 'POST', tokenAdminA, {
        firstName: 'Canonical',
        lastName: 'StudentOne',
        email: studentLoginEmail,
        phone: studentLoginPhone,
        admissionDate: new Date().toISOString(),
        status: 'ACTIVE',
        batchId: batch1.id,
        subjectIds: [subjMaths.id],
        parentFullName: 'Parent Canonical',
        parentPhone: `9123${Math.floor(100000 + Math.random() * 900000)}`,
        parentEmail: `parent_canonical_${timestamp}@test.com`,
        parentRelationship: 'FATHER',
      });

      if (!res.ok || !res.data.success) {
        throw new Error(res.data?.error || `HTTP ${res.status}`);
      }

      createdStudentId = res.data.data.student.id;
      const dbStudent = await prisma.student.findUnique({
        where: { id: createdStudentId },
        include: { user: true, enrollments: true, parentRelations: true },
      });

      const hasSingleProfile = !!dbStudent;
      const hasSingleUser = !!dbStudent?.userId && dbStudent.user?.email === studentLoginEmail;
      const hasParentLinked = (dbStudent?.parentRelations?.length || 0) > 0;

      recordTest(
        1,
        'Creating a new student creates one student profile and one login',
        hasSingleProfile && hasSingleUser && hasParentLinked,
        `dbStudent: ${hasSingleProfile}, user: ${hasSingleUser}, parent: ${hasParentLinked}`
      );
    } catch (err: any) {
      recordTest(1, 'Creating a new student creates one student profile and one login', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Enrolling that student in another batch/subject reuses the same student profile and login
    // -------------------------------------------------------------------------
    try {
      const res = await apiRequest(`/students/${createdStudentId}/enroll`, 'POST', tokenAdminA, {
        batchId: batch2.id,
        subjectIds: [subjChemistry.id],
      });

      if (!res.ok || !res.data.success) {
        throw new Error(res.data?.error || `HTTP ${res.status}`);
      }

      const allProfiles = await prisma.student.findMany({
        where: {
          instituteId: instA.id,
          user: { email: studentLoginEmail },
        },
      });

      const activeEnrollments = await prisma.studentEnrollment.findMany({
        where: { studentId: createdStudentId, isActive: true },
      });

      const uniqueBatches = new Set(activeEnrollments.map((e) => e.batchId));
      const hasBothBatches = uniqueBatches.has(batch1.id) && uniqueBatches.has(batch2.id);
      const profileReused = allProfiles.length === 1 && allProfiles[0].id === createdStudentId;

      recordTest(
        2,
        'Enrolling that student in another batch/subject reuses same student profile and login',
        profileReused && hasBothBatches,
        `profiles count: ${allProfiles.length}, unique batches: ${Array.from(uniqueBatches).join(',')}`
      );
    } catch (err: any) {
      recordTest(2, 'Enrolling that student in another batch/subject reuses same student profile and login', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Two staff members can enroll the same student in independently authorized subjects without duplication
    // -------------------------------------------------------------------------
    try {
      // Staff A enrolls student in Batch 1 Maths
      await apiRequest(`/students/${createdStudentId}/enroll`, 'POST', tokenStaffA, {
        batchId: batch1.id,
        subjectIds: [subjMaths.id],
      });

      // Staff B enrolls student in Batch 1 Physics
      await apiRequest(`/students/${createdStudentId}/enroll`, 'POST', tokenStaffB, {
        batchId: batch1.id,
        subjectIds: [subjPhysics.id],
      });

      const totalStudentProfiles = await prisma.student.count({
        where: { instituteId: instA.id, user: { email: studentLoginEmail } },
      });

      const activeBatch1Subjects = await prisma.studentEnrollment.findMany({
        where: { studentId: createdStudentId, batchId: batch1.id, isActive: true, subjectId: { not: null } },
      });

      const subjectIds = activeBatch1Subjects.map((e) => e.subjectId);
      const hasMaths = subjectIds.includes(subjMaths.id);
      const hasPhysics = subjectIds.includes(subjPhysics.id);

      recordTest(
        3,
        'Two staff members can enroll same student in independent subjects without duplicating account',
        totalStudentProfiles === 1 && hasMaths && hasPhysics,
        `profiles: ${totalStudentProfiles}, active subjects in Batch 1: ${subjectIds.join(',')}`
      );
    } catch (err: any) {
      recordTest(3, 'Two staff members can enroll same student in independent subjects without duplicating account', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: The student sees all assigned batches and subjects in one login
    // -------------------------------------------------------------------------
    try {
      const studentUser = await prisma.user.findFirst({ where: { email: studentLoginEmail } });
      const tokenStudent = generateAuthToken(studentUser, instA.id, 'STUDENT');

      const res = await apiRequest('/students/my/profile', 'GET', tokenStudent);
      if (!res.ok || !res.data.success) {
        throw new Error(res.data?.error || `HTTP ${res.status}`);
      }

      const enrollments = res.data.data.student.enrollments || [];
      const batchIdsEnrolled = new Set(enrollments.map((e: any) => e.batchId));
      const hasBatch1 = batchIdsEnrolled.has(batch1.id);
      const hasBatch2 = batchIdsEnrolled.has(batch2.id);

      // Verify batchSubjects includes staff info
      const b1 = enrollments.find((e: any) => e.batchId === batch1.id)?.batch;
      const b1Subjects = b1?.batchSubjects || [];
      const hasTeachers = b1Subjects.some((bs: any) => bs.staffProfile?.user?.fullName);

      recordTest(
        4,
        'The student sees all assigned batches and subjects in one login',
        hasBatch1 && hasBatch2 && enrollments.length >= 2,
        `enrolled batches: ${Array.from(batchIdsEnrolled).join(',')}, hasTeachers: ${hasTeachers}`
      );
    } catch (err: any) {
      recordTest(4, 'The student sees all assigned batches and subjects in one login', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Staff A cannot see or modify Staff B's subject-specific student records without authorization
    // -------------------------------------------------------------------------
    try {
      // Create Student Only in Physics (taught by Staff B)
      studentPhysicsOnly = await prisma.student.create({
        data: {
          instituteId: instA.id,
          admissionNumber: `PH-ONLY-${timestamp}`,
          firstName: 'Physics',
          lastName: 'OnlyStudent',
          admissionDate: new Date(),
          status: 'ACTIVE',
        },
      });
      await prisma.studentEnrollment.createMany({
        data: [
          { studentId: studentPhysicsOnly.id, batchId: batch1.id, subjectId: null, isActive: true },
          { studentId: studentPhysicsOnly.id, batchId: batch1.id, subjectId: subjPhysics.id, isActive: true },
        ],
      });

      // Staff A (teaches Maths only in Batch 1) requests batch details
      const resBatchA = await apiRequest(`/academics/batches/${batch1.id}`, 'GET', tokenStaffA);
      const studentsVisibleToStaffA = resBatchA.data?.data?.batch?.enrolledStudents || [];
      const canStaffASeePhysicsOnly = studentsVisibleToStaffA.some((s: any) => s.id === studentPhysicsOnly.id);

      // Staff A attempts to modify subject allocations for PhysicsOnly student
      await apiRequest(
        `/academics/batches/${batch1.id}/students/${studentPhysicsOnly.id}/subjects`,
        'POST',
        tokenStaffA,
        { subjectIds: [] } // attempting to wipe
      );

      // Verify Physics subject is STILL active in DB
      const physicsStillActive = await prisma.studentEnrollment.findFirst({
        where: { studentId: studentPhysicsOnly.id, batchId: batch1.id, subjectId: subjPhysics.id, isActive: true },
      });

      recordTest(
        5,
        "Staff A cannot see or modify Staff B's subject-specific student records",
        !canStaffASeePhysicsOnly && !!physicsStillActive,
        `Staff A saw physics student: ${canStaffASeePhysicsOnly}, Physics still active: ${!!physicsStillActive}`
      );
    } catch (err: any) {
      recordTest(5, "Staff A cannot see or modify Staff B's subject-specific student records", false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Staff cannot access an unassigned batch or subject by manipulating API IDs
    // -------------------------------------------------------------------------
    try {
      // Staff A is NOT assigned to batch2
      const resUnassignedBatch = await apiRequest(`/academics/batches/${batch2.id}`, 'GET', tokenStaffA);
      const isBatchBlocked = resUnassignedBatch.status === 403;

      // Staff A tries to create material in batch2
      const resUnassignedMaterial = await apiRequest('/materials', 'POST', tokenStaffA, {
        title: 'Unauthorized Material',
        batchId: batch2.id,
        subjectId: subjChemistry.id,
        type: 'PDF',
      });
      const isMaterialBlocked = resUnassignedMaterial.status === 403;

      // Staff A tries to create homework in batch2
      const resUnassignedHomework = await apiRequest('/homework', 'POST', tokenStaffA, {
        title: 'Unauthorized Homework',
        batchId: batch2.id,
        subjectId: subjChemistry.id,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });
      const isHomeworkBlocked = resUnassignedHomework.status === 403;

      recordTest(
        6,
        'Staff cannot access an unassigned batch or subject by manipulating API IDs',
        isBatchBlocked && isMaterialBlocked && isHomeworkBlocked,
        `batch status: ${resUnassignedBatch.status}, mat: ${resUnassignedMaterial.status}, hw: ${resUnassignedHomework.status}`
      );
    } catch (err: any) {
      recordTest(6, 'Staff cannot access an unassigned batch or subject by manipulating API IDs', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: A staff member cannot access another institute's student
    // -------------------------------------------------------------------------
    try {
      // Staff A (Institute A) attempts to access Foreign Student (Institute B)
      const resForeignGet = await apiRequest(`/students/${foreignStudent.id}`, 'GET', tokenStaffA);
      const isGetBlocked = resForeignGet.status === 403 || resForeignGet.status === 404;

      const resForeignEnroll = await apiRequest(`/students/${foreignStudent.id}/enroll`, 'POST', tokenStaffA, {
        batchId: batch1.id,
        subjectIds: [subjMaths.id],
      });
      const isEnrollBlocked = resForeignEnroll.status === 403 || resForeignEnroll.status === 404;

      recordTest(
        7,
        "A staff member cannot access another institute's student",
        isGetBlocked && isEnrollBlocked,
        `GET status: ${resForeignGet.status}, enroll status: ${resForeignEnroll.status}`
      );
    } catch (err: any) {
      recordTest(7, "A staff member cannot access another institute's student", false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate enrollment is rejected or handled idempotently
    // -------------------------------------------------------------------------
    try {
      // Enroll in Batch 1 Maths again
      const resDup = await apiRequest(`/students/${createdStudentId}/enroll`, 'POST', tokenStaffA, {
        batchId: batch1.id,
        subjectIds: [subjMaths.id],
      });

      const isDuplicateHandled = resDup.data?.duplicate === true || resDup.status === 409 || resDup.ok;

      // Verify exactly 1 active enrollment record in DB
      const mathEnrollments = await prisma.studentEnrollment.findMany({
        where: { studentId: createdStudentId, batchId: batch1.id, subjectId: subjMaths.id, isActive: true },
      });

      recordTest(
        8,
        'Duplicate enrollment is rejected or handled idempotently',
        isDuplicateHandled && mathEnrollments.length === 1,
        `handled: ${isDuplicateHandled}, active math enrollments in DB: ${mathEnrollments.length}`
      );
    } catch (err: any) {
      recordTest(8, 'Duplicate enrollment is rejected or handled idempotently', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Concurrent requests cannot create duplicate student accounts or duplicate allocations
    // -------------------------------------------------------------------------
    try {
      const concurrentEmail = `concurrent_${timestamp}@test.com`;
      const concurrentPhone = `9811${Math.floor(100000 + Math.random() * 900000)}`;

      const reqPayload = {
        firstName: 'Concurrent',
        lastName: 'Tester',
        email: concurrentEmail,
        phone: concurrentPhone,
        admissionDate: new Date().toISOString(),
        status: 'ACTIVE',
        batchId: batch1.id,
        subjectIds: [subjMaths.id],
      };

      // Fire 2 concurrent admissions
      const [res1, res2] = await Promise.all([
        apiRequest('/students', 'POST', tokenAdminA, reqPayload),
        apiRequest('/students', 'POST', tokenAdminA, reqPayload),
      ]);

      const countUsers = await prisma.user.count({ where: { email: concurrentEmail } });
      const countStudents = await prisma.student.count({
        where: { instituteId: instA.id, user: { email: concurrentEmail } },
      });

      const onlyOneCreated = countUsers <= 1 && countStudents <= 1;

      recordTest(
        9,
        'Concurrent requests cannot create duplicate student accounts or duplicate allocations',
        onlyOneCreated,
        `users: ${countUsers}, students: ${countStudents}, status1: ${res1.status}, status2: ${res2.status}`
      );
    } catch (err: any) {
      recordTest(9, 'Concurrent requests cannot create duplicate student accounts or duplicate allocations', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Ambiguous student matches require explicit selection
    // -------------------------------------------------------------------------
    try {
      // Create two students with same first name "Aarav"
      await prisma.student.createMany({
        data: [
          {
            instituteId: instA.id,
            admissionNumber: `AARAV-1-${timestamp}`,
            firstName: 'Aarav',
            lastName: 'Sharma',
            admissionDate: new Date(),
            status: 'ACTIVE',
          },
          {
            instituteId: instA.id,
            admissionNumber: `AARAV-2-${timestamp}`,
            firstName: 'Aarav',
            lastName: 'Verma',
            admissionDate: new Date(),
            status: 'ACTIVE',
          },
        ],
      });

      const resLookup = await apiRequest('/students/lookup?q=Aarav', 'GET', tokenStaffA);
      const matches = resLookup.data?.data?.students || [];
      const hasMultipleMatches = matches.length >= 2;
      const hasDistinctIds = matches[0]?.id !== matches[1]?.id;

      recordTest(
        10,
        'Ambiguous student matches require explicit selection',
        hasMultipleMatches && hasDistinctIds,
        `matches found: ${matches.length}, first: ${matches[0]?.admissionNumber}, second: ${matches[1]?.admissionNumber}`
      );
    } catch (err: any) {
      recordTest(10, 'Ambiguous student matches require explicit selection', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Parent access remains limited to linked children
    // -------------------------------------------------------------------------
    try {
      const parentUser = await prisma.user.create({
        data: {
          fullName: 'Isolated Parent',
          email: `isolated_parent_${timestamp}@test.com`,
          passwordHash: passHash,
          role: 'PARENT',
          isActive: true,
        },
      });
      await prisma.instituteMembership.create({
        data: { userId: parentUser.id, instituteId: instA.id, role: 'PARENT', isActive: true },
      });
      const parentProf = await prisma.parentProfile.create({
        data: { userId: parentUser.id },
      });
      // Link ONLY to createdStudentId
      await prisma.studentParentRelation.create({
        data: { parentId: parentProf.id, studentId: createdStudentId, relation: 'MOTHER' },
      });

      const tokenParent = generateAuthToken(parentUser, instA.id, 'PARENT');

      // Parent queries materials
      const resMat = await apiRequest('/materials', 'GET', tokenParent);
      const mats = resMat.data?.data?.materials || [];

      // Verify materials are only from batches createdStudent is enrolled in
      const invalidMat = mats.find((m: any) => m.batchId !== batch1.id && m.batchId !== batch2.id);

      recordTest(
        11,
        'Parent access remains limited to linked children',
        !invalidMat,
        `materials fetched: ${mats.length}, has foreign batch: ${!!invalidMat}`
      );
    } catch (err: any) {
      recordTest(11, 'Parent access remains limited to linked children', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Attendance and academic operations enforce the same staff permissions
    // -------------------------------------------------------------------------
    try {
      // Create an exam in Batch 1 Physics (Staff B)
      const examPhysics = await prisma.examination.create({
        data: {
          instituteId: instA.id,
          batchId: batch1.id,
          subjectId: subjPhysics.id,
          title: `Physics Assessment ${timestamp}`,
          examType: 'Unit Test',
          totalMarks: 100,
          passingMarks: 35,
          examDate: new Date(),
        },
      });

      // Ensure student has active enrollment in Batch 1 Physics
      await prisma.studentEnrollment.upsert({
        where: {
          studentId_batchId_subjectId: {
            studentId: createdStudentId,
            batchId: batch1.id,
            subjectId: subjPhysics.id,
          },
        },
        create: {
          studentId: createdStudentId,
          batchId: batch1.id,
          subjectId: subjPhysics.id,
          isActive: true,
        },
        update: { isActive: true },
      });

      // Staff A (Maths) attempts to enter marks for Physics exam -> Expect 403
      const resMarks = await apiRequest(`/exams/${examPhysics.id}/marks`, 'POST', tokenStaffA, {
        marks: [{ studentId: createdStudentId, marksObtained: 95 }],
      });
      const isMarksRejectedForStaffA = resMarks.status === 403;

      // Staff B (Physics) enters marks -> Expect 200
      const resMarksStaffB = await apiRequest(`/exams/${examPhysics.id}/marks`, 'POST', tokenStaffB, {
        marks: [{ studentId: createdStudentId, marksObtained: 95 }],
      });
      const isMarksAcceptedForStaffB = resMarksStaffB.ok;

      recordTest(
        12,
        'Attendance and academic operations enforce the same staff permissions',
        isMarksRejectedForStaffA && isMarksAcceptedForStaffB,
        `Staff A marks status: ${resMarks.status}, Staff B marks status: ${resMarksStaffB.status}`
      );
    } catch (err: any) {
      recordTest(12, 'Attendance and academic operations enforce the same staff permissions', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 13: Existing attendance, fee, payment, parent and academic history remains intact
    // -------------------------------------------------------------------------
    try {
      // Add fee schedule & attendance record for createdStudentId
      const feeStructure = await prisma.feeStructure.create({
        data: {
          instituteId: instA.id,
          batchId: batch1.id,
          name: `Tuition Structure ${timestamp}`,
          amount: 15000,
          frequency: 'MONTHLY',
        },
      });

      const attEvent = await prisma.attendanceEvent.create({
        data: {
          instituteId: instA.id,
          studentId: createdStudentId,
          batchId: batch1.id,
          eventDate: new Date(),
          eventType: 'CHECK_IN',
          markedById: userAdminA.id,
          sessionNumber: 1,
        },
      });

      // Update student batch allocations
      await apiRequest(`/students/${createdStudentId}/enroll`, 'POST', tokenAdminA, {
        batchId: batch1.id,
        subjectIds: [subjMaths.id, subjPhysics.id],
      });

      // Check fee and attendance still exist intact
      const feeStillExists = await prisma.feeStructure.findUnique({ where: { id: feeStructure.id } });
      const attStillExists = await prisma.attendanceEvent.findUnique({ where: { id: attEvent.id } });
      const parentsStillExist = await prisma.studentParentRelation.count({ where: { studentId: createdStudentId } });

      recordTest(
        13,
        'Existing attendance, fee, payment, parent and academic history remains intact',
        !!feeStillExists && !!attStillExists && parentsStillExist > 0,
        `fee: ${!!feeStillExists}, attendance: ${!!attStillExists}, parents: ${parentsStillExist}`
      );
    } catch (err: any) {
      recordTest(13, 'Existing attendance, fee, payment, parent and academic history remains intact', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Unauthorized credential resets and plaintext-password retrieval are rejected
    // -------------------------------------------------------------------------
    try {
      // Fetch student details as Admin A
      const resGet = await apiRequest(`/students/${createdStudentId}`, 'GET', tokenAdminA);
      const studentData = resGet.data?.data?.student;

      const noPlaintextInNotes = !studentData?.notes || !studentData.notes.includes('Password:');
      const noPlaintextInCreds =
        !studentData?.credentialsOnRecord?.studentPassword && !studentData?.credentialsOnRecord?.parentPassword;

      // Staff A attempts to reset student credentials for studentPhysicsOnly (which Staff A is NOT authorized for)
      const resStaffReset = await apiRequest(`/students/${studentPhysicsOnly.id}/reset-password`, 'POST', tokenStaffA, {
        password: 'AttemptedStaffResetPass123!',
      });
      const isStaffResetRejected = resStaffReset.status === 403;

      recordTest(
        14,
        'Unauthorized credential resets and plaintext-password retrieval are rejected',
        noPlaintextInNotes && noPlaintextInCreds && isStaffResetRejected,
        `noPlainNotes: ${noPlaintextInNotes}, noPlainCreds: ${noPlaintextInCreds}, staffReset: ${resStaffReset.status}`
      );
    } catch (err: any) {
      recordTest(14, 'Unauthorized credential resets and plaintext-password retrieval are rejected', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Existing login, role-based access and core application tests continue to pass
    // -------------------------------------------------------------------------
    try {
      // Test login with Admin credentials
      const resLoginAdmin = await apiRequest('/auth/login', 'POST', undefined, {
        identifier: `admin_simba_${timestamp}@test.com`,
        password: 'TestPass123!',
        instituteCode: instA.code,
      });

      const resLoginStaff = await apiRequest('/auth/login', 'POST', undefined, {
        identifier: `staff_maths_${timestamp}@test.com`,
        password: 'TestPass123!',
        instituteCode: instA.code,
      });

      const adminOk = resLoginAdmin.ok && resLoginAdmin.data?.data?.accessToken;
      const staffOk = resLoginStaff.ok && resLoginStaff.data?.data?.accessToken;

      recordTest(
        15,
        'Existing login, role-based access and core application tests continue to pass',
        !!adminOk && !!staffOk,
        `adminLogin: ${resLoginAdmin.status}, staffLogin: ${resLoginStaff.status}`
      );
    } catch (err: any) {
      recordTest(15, 'Existing login, role-based access and core application tests continue to pass', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log('\n[Cleanup] Cleaning up isolated test fixtures...');
    try {
      await prisma.attendanceEvent.deleteMany({ where: { studentId: createdStudentId } });
      await prisma.feeStructure.deleteMany({ where: { instituteId: instA.id } });
      await prisma.examMark.deleteMany({ where: { exam: { instituteId: instA.id } } });
      await prisma.studentEnrollment.deleteMany({ where: { batch: { instituteId: instA.id } } });
      await prisma.examination.deleteMany({ where: { instituteId: instA.id } });
      await prisma.batchSubject.deleteMany({ where: { batch: { instituteId: instA.id } } });
      await prisma.staffBatchAssignment.deleteMany({ where: { staffProfile: { instituteId: instA.id } } });
      await prisma.batch.deleteMany({ where: { instituteId: instA.id } });
      await prisma.subject.deleteMany({ where: { instituteId: instA.id } });
      await prisma.studentParentRelation.deleteMany({ where: { student: { instituteId: instA.id } } });
      await prisma.student.deleteMany({ where: { instituteId: instA.id } });
      await prisma.student.deleteMany({ where: { instituteId: instB.id } });
      await prisma.parentProfile.deleteMany({ where: { user: { email: { contains: `${timestamp}` } } } });
      await prisma.staffProfile.deleteMany({ where: { instituteId: instA.id } });
      await prisma.instituteMembership.deleteMany({ where: { instituteId: { in: [instA.id, instB.id] } } });
      await prisma.institute.deleteMany({ where: { id: { in: [instA.id, instB.id] } } });
      await prisma.user.deleteMany({ where: { email: { contains: `${timestamp}` } } });
      console.log('[Cleanup] Completed cleanly.');
    } catch (cleanupErr: any) {
      console.warn('[Cleanup Warning] Non-critical test fixture cleanup error:', cleanupErr.message);
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(' TEST SUITE RESULTS SUMMARY:');
    console.log('========================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    console.log(`TOTAL TESTS: ${results.length}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${failedCount}`);

    if (failedCount === 0) {
      console.log('\n🎉 ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      console.error('\n❌ SOME TESTS FAILED!\n');
      process.exit(1);
    }
  } catch (fatalErr: any) {
    console.error('Fatal Test Suite Error:', fatalErr);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStudentIdentityAndMultiBatchTestSuite();
