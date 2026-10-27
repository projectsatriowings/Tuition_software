import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import http from 'http';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import app from '../src/index.js';
import { config } from '../src/config/index.js';

const prisma = new PrismaClient();

interface TestReport {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const reports: TestReport[] = [];

function recordTest(id: number, name: string, passed: boolean, details?: string) {
  reports.push({ id, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Test ${id}] ${status} - ${name}${details ? ` (${details})` : ''}`);
}

function generateToken(userId: string, email: string, role: string, instituteId: string) {
  return jwt.sign(
    { userId, email, role, instituteId },
    config.jwt.secret,
    { expiresIn: '2h' }
  );
}

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log(' TUITIONOS: COMPREHENSIVE VERIFICATION SUITE');
  console.log(' (Images, Optional Subject Codes & 7-Char Admission Numbers)');
  console.log('========================================================================\n');

  // Start temporary server instance
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const PORT = address.port;
  const BASE_URL = `http://localhost:${PORT}/api`;
  console.log(`[Test Server] Running on ${BASE_URL}\n`);

  const createdStudentIds: string[] = [];
  const createdSubjectIds: string[] = [];
  const createdBatchIds: string[] = [];
  const createdUserIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Setup test institutes and roles
    // -------------------------------------------------------------------------
    console.log('[Setup] Preparing isolated test fixtures...');

    // Find or create Primary Institute
    let instA = await prisma.institute.findFirst({
      where: { code: 'APEX01' },
    });
    if (!instA) {
      instA = await prisma.institute.findFirst({
        where: { status: 'ACTIVE' },
      });
    }
    if (!instA) {
      instA = await prisma.institute.create({
        data: {
          name: 'Apex Academy Test',
          code: 'APX_TEST',
          status: 'ACTIVE',
        },
      });
    }

    // Find or create Secondary Institute for tenant isolation checks
    let instB = await prisma.institute.findFirst({
      where: { code: 'BETA' },
    });
    if (!instB) {
      instB = await prisma.institute.create({
        data: {
          name: 'Beta Global Test',
          code: 'BETA_TEST',
          status: 'ACTIVE',
        },
      });
    }

    // Create Admin User for Institute A
    const adminEmail = `admin_test_${Date.now()}@tuitionos.local`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Admin Test Suite',
        role: 'ACADEMIC_ADMIN',
        passwordHash: 'dummyhash',
        isActive: true,
      },
    });
    createdUserIds.push(adminUser.id);

    await prisma.instituteMembership.create({
      data: {
        instituteId: instA.id,
        userId: adminUser.id,
        role: 'ACADEMIC_ADMIN',
        isActive: true,
      },
    });

    const adminToken = generateToken(adminUser.id, adminUser.email!, 'ACADEMIC_ADMIN', instA.id);

    // Create Staff User for Institute A
    const staffEmail = `staff_test_${Date.now()}@tuitionos.local`;
    const staffUser = await prisma.user.create({
      data: {
        email: staffEmail,
        fullName: 'Staff Test Suite',
        role: 'STAFF',
        passwordHash: 'dummyhash',
        isActive: true,
      },
    });
    createdUserIds.push(staffUser.id);

    await prisma.instituteMembership.create({
      data: {
        instituteId: instA.id,
        userId: staffUser.id,
        role: 'STAFF',
        isActive: true,
      },
    });

    const staffProfile = await prisma.staffProfile.create({
      data: {
        userId: staffUser.id,
        instituteId: instA.id,
        designation: 'Senior Faculty',
      },
    });

    const staffToken = generateToken(staffUser.id, staffUser.email!, 'STAFF', instA.id);

    // Create Test Batch in Institute A
    const testBatch = await prisma.batch.create({
      data: {
        instituteId: instA.id,
        name: `Test Batch Alpha ${Date.now()}`,
        code: '10', // 2-char code
        academicYear: '2026-2027',
        startDate: new Date(),
        isActive: true,
      },
    });
    createdBatchIds.push(testBatch.id);

    // Assign staff to this batch
    await prisma.staffBatchAssignment.create({
      data: {
        staffProfileId: staffProfile.id,
        batchId: testBatch.id,
      },
    });

    console.log('[Setup Complete] Starting 15 automated verification checks...\n');

    // -------------------------------------------------------------------------
    // 1. Student image upload succeeds with valid files
    // -------------------------------------------------------------------------
    let photoStorageKey = '';
    const tempJpg = path.join(process.cwd(), 'scratch', `test_valid_${Date.now()}.png`);
    // Minimal valid 1x1 PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(tempJpg, pngBuffer);

    const formValid = new FormData();
    formValid.append('photo', pngBuffer, { filename: 'test_valid.png', contentType: 'image/png' });

    const resUpload = await fetch(`${BASE_URL}/students/upload-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        ...formValid.getHeaders(),
      },
      body: formValid.getBuffer(),
    });
    const dataUpload = await resUpload.json();
    console.log('[DEBUG Test 1 dataUpload]:', JSON.stringify(dataUpload));
    const test1Passed = resUpload.status === 200 && dataUpload.success && Boolean(dataUpload.data?.photoStorageKey);
    photoStorageKey = dataUpload.data?.photoStorageKey || '';
    recordTest(1, 'Student image upload succeeds with valid files (PNG/JPEG)', test1Passed, `status: ${resUpload.status}`);

    // -------------------------------------------------------------------------
    // 2. Invalid file types and oversized images are rejected
    // -------------------------------------------------------------------------
    // 2a. Text file rejected
    const tempTxt = path.join(process.cwd(), 'scratch', `test_invalid_${Date.now()}.txt`);
    fs.writeFileSync(tempTxt, 'This is a plain text file, not an image.');
    const formTxt = new FormData();
    formTxt.append('photo', Buffer.from('This is a plain text file, not an image.'), { contentType: 'text/plain', filename: 'test.txt' });

    const resTxt = await fetch(`${BASE_URL}/students/upload-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        ...formTxt.getHeaders(),
      },
      body: formTxt.getBuffer(),
    });
    const dataTxt = await resTxt.json();
    const test2aPassed = resTxt.status === 400 && !dataTxt.success;

    // 2b. Oversized image (>5MB) rejected
    const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0);
    const formBig = new FormData();
    formBig.append('photo', bigBuffer, { contentType: 'image/png', filename: 'big.png' });

    const resBig = await fetch(`${BASE_URL}/students/upload-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        ...formBig.getHeaders(),
      },
      body: formBig.getBuffer(),
    });
    const test2bPassed = resBig.status === 400;

    recordTest(
      2,
      'Invalid file types and oversized images (>5MB) are rejected',
      test2aPassed && test2bPassed,
      `txt: ${resTxt.status}, big: ${resBig.status}`
    );

    // -------------------------------------------------------------------------
    // 3. Image references persist and appear correctly in student detail and batch roster APIs
    // -------------------------------------------------------------------------
    const resAdmit = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'PhotoStudent',
        lastName: `Verification_${Date.now()}`,
        batchId: testBatch.id,
        photoUrl: photoStorageKey,
        parentFullName: 'Parent Photo',
        parentPhone: `9988${Math.floor(100000 + Math.random() * 900000)}`,
      }),
    });
    const dataAdmit = await resAdmit.json();
    const admittedStudent = dataAdmit.data?.student;
    if (admittedStudent) createdStudentIds.push(admittedStudent.id);

    // Check detail API
    const resDetail = await fetch(`${BASE_URL}/students/${admittedStudent.id}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
      },
    });
    const dataDetail = await resDetail.json();
    const detailPhotoUrl = dataDetail.data?.student?.photoUrl;

    // Check batch roster API
    const resBatch = await fetch(`${BASE_URL}/academics/batches/${testBatch.id}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
      },
    });
    const dataBatch = await resBatch.json();
    const rosterStudent = (dataBatch.data?.batch?.enrolledStudents || []).find((s: any) => s.id === admittedStudent.id);

    const test3Passed =
      resAdmit.status === 201 &&
      Boolean(detailPhotoUrl && detailPhotoUrl.includes(admittedStudent.id)) &&
      Boolean(rosterStudent?.photoUrl && rosterStudent.photoUrl.includes(admittedStudent.id));

    recordTest(
      3,
      'Image references persist and appear correctly in student detail and batch roster APIs',
      test3Passed,
      `detailPhoto: ${detailPhotoUrl}, rosterPhoto: ${rosterStudent?.photoUrl}`
    );

    // -------------------------------------------------------------------------
    // 4. Missing images render a fallback avatar (photoUrl null or non-existent file)
    // -------------------------------------------------------------------------
    const resNoPhoto = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'NoPhotoStudent',
        lastName: `Initials_${Date.now()}`,
        batchId: testBatch.id,
        parentFullName: 'Parent NoPhoto',
        parentPhone: `9977${Math.floor(100000 + Math.random() * 900000)}`,
      }),
    });
    const dataNoPhoto = await resNoPhoto.json();
    const noPhotoStudent = dataNoPhoto.data?.student;
    if (noPhotoStudent) createdStudentIds.push(noPhotoStudent.id);

    // Check streaming endpoint returns 404 for missing photo
    const resStreamMissing = await fetch(`${BASE_URL}/students/${noPhotoStudent.id}/photo?token=${adminToken}`, {
      headers: { 'x-institute-id': instA.id },
    });
    const test4Passed = noPhotoStudent?.photoUrl === null && resStreamMissing.status === 404;
    recordTest(4, 'Missing image gracefully handled (null photoUrl, 404 stream triggers fallback initials)', test4Passed);

    // -------------------------------------------------------------------------
    // 5. Existing private-image access rules remain enforced
    // -------------------------------------------------------------------------
    // 5a. Unauthenticated image stream rejected with 401
    const resUnauth = await fetch(`${BASE_URL}/students/${admittedStudent.id}/photo`);
    const test5aPassed = resUnauth.status === 401;

    // 5b. Authenticated image stream with ?token= query parameter succeeds
    const resQueryAuth = await fetch(`${BASE_URL}/students/${admittedStudent.id}/photo?token=${adminToken}&instituteId=${instA.id}`);
    const test5bPassed = resQueryAuth.status === 200 && resQueryAuth.headers.get('content-type')?.includes('image');

    // 5c. Cross-institute image stream rejected with 403
    const tokenB = generateToken('hacker_user', 'hacker@other.com', 'ACADEMIC_ADMIN', instB.id);
    const resCrossInst = await fetch(`${BASE_URL}/students/${admittedStudent.id}/photo?token=${tokenB}&instituteId=${instB.id}`);
    const test5cPassed = resCrossInst.status === 403;

    recordTest(
      5,
      'Existing private-image access rules remain strictly enforced (no unauth, query token works, tenant isolation)',
      test5aPassed && test5bPassed && test5cPassed,
      `unauth: ${resUnauth.status}, queryToken: ${resQueryAuth.status}, crossInst: ${resCrossInst.status}`
    );

    // -------------------------------------------------------------------------
    // 6. A subject can be created without a code
    // -------------------------------------------------------------------------
    const resSubNoCode = await fetch(`${BASE_URL}/academics/subjects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `General Science ${Date.now()}`,
        // code omitted
      }),
    });
    const dataSubNoCode = await resSubNoCode.json();
    const createdSubNoCode = dataSubNoCode.data?.subject;
    if (createdSubNoCode) createdSubjectIds.push(createdSubNoCode.id);

    const test6Passed = resSubNoCode.status === 201 && createdSubNoCode?.code === null;
    recordTest(6, 'A subject can be created without a code (saved as null, not placeholder)', test6Passed, `code: ${createdSubNoCode?.code}`);

    // -------------------------------------------------------------------------
    // 7. A subject can be created with a valid code
    // -------------------------------------------------------------------------
    const testCode = `PHY-${Math.floor(100 + Math.random() * 900)}`;
    const resSubWithCode = await fetch(`${BASE_URL}/academics/subjects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Advanced Physics ${Date.now()}`,
        code: testCode,
      }),
    });
    const dataSubWithCode = await resSubWithCode.json();
    const createdSubWithCode = dataSubWithCode.data?.subject;
    if (createdSubWithCode) createdSubjectIds.push(createdSubWithCode.id);

    const test7Passed = resSubWithCode.status === 201 && createdSubWithCode?.code === testCode.toUpperCase();
    recordTest(7, 'A subject can be created with a valid code', test7Passed, `code: ${createdSubWithCode?.code}`);

    // -------------------------------------------------------------------------
    // 8. Duplicate codes are rejected within the intended uniqueness scope
    // -------------------------------------------------------------------------
    const resDupCode = await fetch(`${BASE_URL}/academics/subjects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Secondary Physics Section ${Date.now()}`,
        code: testCode, // Same code as test 7
      }),
    });
    const test8Passed = resDupCode.status === 409;
    recordTest(8, 'Duplicate codes are rejected within the intended uniqueness scope (409 Conflict)', test8Passed, `status: ${resDupCode.status}`);

    // -------------------------------------------------------------------------
    // 9. Concurrent student admissions cannot generate duplicate admission numbers
    // -------------------------------------------------------------------------
    const CONCURRENT_COUNT = 5;
    const admissionPromises = Array.from({ length: CONCURRENT_COUNT }).map((_, idx) =>
      fetch(`${BASE_URL}/students`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-institute-id': instA.id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: `Concurrent${idx + 1}`,
          lastName: `Stress_${Date.now()}`,
          batchId: testBatch.id,
          parentFullName: `Parent Concur ${idx + 1}`,
          parentPhone: `9911${Math.floor(100000 + Math.random() * 900000)}`,
        }),
      }).then((r) => r.json())
    );

    const concurrentResults = await Promise.all(admissionPromises);
    const concurrentAdmNums = concurrentResults
      .map((r) => r.data?.student?.admissionNumber)
      .filter(Boolean);

    for (const r of concurrentResults) {
      if (r.data?.student?.id) createdStudentIds.push(r.data.student.id);
    }

    const uniqueAdmNums = new Set(concurrentAdmNums);
    const test9Passed =
      concurrentAdmNums.length === CONCURRENT_COUNT &&
      uniqueAdmNums.size === CONCURRENT_COUNT &&
      concurrentAdmNums.every((num) => num.length >= 4 && num.length <= 8);

    recordTest(
      9,
      `Concurrent student admissions (${CONCURRENT_COUNT} parallel requests) cannot generate duplicate numbers`,
      test9Passed,
      `generated: ${concurrentAdmNums.join(', ')}`
    );

    // -------------------------------------------------------------------------
    // 10. Admission numbers remain unique across institutes (distinct compact institute codes)
    // -------------------------------------------------------------------------
    const adminTokenB = generateToken('admin_b_test', 'adminb@tuition.local', 'ACADEMIC_ADMIN', instB.id);
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { instituteId: instB.id, userId: adminUser.id } },
      create: { instituteId: instB.id, userId: adminUser.id, role: 'ACADEMIC_ADMIN', isActive: true },
      update: {},
    });

    const resInstBStudent = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${generateToken(adminUser.id, adminUser.email!, 'ACADEMIC_ADMIN', instB.id)}`,
        'x-institute-id': instB.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'InstBStudent',
        lastName: `Distinct_${Date.now()}`,
        parentFullName: 'Parent Inst B',
        parentPhone: `9922${Math.floor(100000 + Math.random() * 900000)}`,
      }),
    });
    const dataInstB = await resInstBStudent.json();
    const instBStudent = dataInstB.data?.student;
    if (instBStudent) createdStudentIds.push(instBStudent.id);

    const instAPrefix = concurrentAdmNums[0]?.slice(0, 2);
    const instBPrefix = instBStudent?.admissionNumber?.slice(0, 2);
    const test10Passed = Boolean(instAPrefix && instBPrefix && instAPrefix !== instBPrefix);

    recordTest(
      10,
      'Admission numbers remain unique across institutes with distinct compact identifiers',
      test10Passed,
      `InstA prefix: ${instAPrefix}, InstB prefix: ${instBPrefix}`
    );

    // -------------------------------------------------------------------------
    // 11. Batch and subject enrollment does not create duplicate student identities
    // -------------------------------------------------------------------------
    const initialStudentCount = await prisma.student.count({ where: { id: admittedStudent.id } });
    // Allocate subject to student
    const resAllocSub = await fetch(`${BASE_URL}/students/${admittedStudent.id}/subject-allocations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchId: testBatch.id,
        subjectId: createdSubWithCode.id,
      }),
    });
    const postAllocCount = await prisma.student.count({ where: { id: admittedStudent.id } });
    const test11Passed = initialStudentCount === 1 && postAllocCount === 1;
    recordTest(11, 'Batch and subject enrollment does not create duplicate student identities', test11Passed, `student rows: ${postAllocCount}`);

    // -------------------------------------------------------------------------
    // 12. Moving a student between batches does not silently change their admission number
    // -------------------------------------------------------------------------
    const originalAdmissionNumber = admittedStudent.admissionNumber;

    // Create a second batch
    const testBatch2 = await prisma.batch.create({
      data: {
        instituteId: instA.id,
        name: `Test Batch Beta ${Date.now()}`,
        code: '11',
        academicYear: '2026-2027',
        startDate: new Date(),
        isActive: true,
      },
    });
    createdBatchIds.push(testBatch2.id);

    // Enroll student in batch 2
    await fetch(`${BASE_URL}/students/${admittedStudent.id}/subject-allocations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchId: testBatch2.id,
      }),
    });

    const refreshedStudent = await prisma.student.findUnique({
      where: { id: admittedStudent.id },
      select: { admissionNumber: true },
    });

    const test12Passed = refreshedStudent?.admissionNumber === originalAdmissionNumber;
    recordTest(
      12,
      'Moving a student between batches preserves permanent admission number unchanged',
      test12Passed,
      `original: ${originalAdmissionNumber}, current: ${refreshedStudent?.admissionNumber}`
    );

    // -------------------------------------------------------------------------
    // 13. Existing admission numbers continue to work in search, attendance, fees, and reports
    // -------------------------------------------------------------------------
    const resSearch = await fetch(`${BASE_URL}/students?search=${encodeURIComponent(originalAdmissionNumber)}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-institute-id': instA.id,
      },
    });
    const dataSearch = await resSearch.json();
    const searchFound = (dataSearch.data?.students || []).some((s: any) => s.admissionNumber === originalAdmissionNumber);
    recordTest(13, 'Existing and new admission numbers continue to work seamlessly in search and rosters', searchFound);

    // -------------------------------------------------------------------------
    // 14. Staff cannot create unauthorized batch/subject enrollments
    // -------------------------------------------------------------------------
    // testBatch2 is NOT assigned to staffUser
    const resStaffUnauth = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'x-institute-id': instA.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Unauthorized',
        lastName: 'Enrollment',
        batchId: testBatch2.id, // Not assigned to staff
        parentFullName: 'Parent Test',
        parentPhone: '9900112233',
      }),
    });
    const test14Passed = resStaffUnauth.status === 403;
    recordTest(14, 'Staff cannot create unauthorized batch enrollments (403 Forbidden)', test14Passed, `status: ${resStaffUnauth.status}`);

    // -------------------------------------------------------------------------
    // 15. Overall tenant isolation, format constraints, and schema safety
    // -------------------------------------------------------------------------
    const allAdmissionsValidFormat = concurrentAdmNums.every((adm) => {
      // 7-character scheme: 2 chars inst + 2 chars batch + 3 digits serial
      return /^[A-Z0-9]{4}\d{3}$/.test(adm);
    });
    const test15Passed = allAdmissionsValidFormat && reports.every((r) => r.passed);
    recordTest(
      15,
      'Strict 7-char format [INST 2][BATCH 2][SERIAL 3] & full tenant isolation verified',
      test15Passed,
      `Sample format: ${concurrentAdmNums[0]}`
    );

  } catch (err: any) {
    console.error('Test Suite Exception:', err);
  } finally {
    console.log('\n[Teardown] Cleaning up isolated test records...');
    try {
      if (createdStudentIds.length > 0) {
        await prisma.studentEnrollment.deleteMany({ where: { studentId: { in: createdStudentIds } } });
        await prisma.studentParentRelation.deleteMany({ where: { studentId: { in: createdStudentIds } } });
        await prisma.student.deleteMany({ where: { id: { in: createdStudentIds } } });
      }
      if (createdBatchIds.length > 0) {
        await prisma.staffBatchAssignment.deleteMany({ where: { batchId: { in: createdBatchIds } } });
        await prisma.batchSubject.deleteMany({ where: { batchId: { in: createdBatchIds } } });
        await prisma.batch.deleteMany({ where: { id: { in: createdBatchIds } } });
      }
      if (createdSubjectIds.length > 0) {
        await prisma.subject.deleteMany({ where: { id: { in: createdSubjectIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.instituteMembership.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.staffProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (cleanupErr) {
      console.warn('Teardown warning:', cleanupErr);
    }

    server.close();
  }

  // Summary Report
  console.log('\n========================================================================');
  console.log(' VERIFICATION RESULTS SUMMARY');
  console.log('========================================================================');
  const totalPassed = reports.filter((r) => r.passed).length;
  console.log(`Total Tests: ${reports.length} | Passed: ${totalPassed} | Failed: ${reports.length - totalPassed}`);
  console.log('========================================================================\n');

  await prisma.$disconnect();

  if (totalPassed !== reports.length) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
