import http from 'http';
import app from '../src/index.js';
import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();
const TEST_PORT = 5098;
let server: http.Server;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      ...(!isFormData && options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: isFormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
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

async function runMaterialsAndHomeworkTests() {
  console.log(`=== TuitionOS — Learning Materials & Homework End-to-End Test Suite ===\n`);

  server = app.listen(TEST_PORT);
  await new Promise((resolve) => setTimeout(resolve, 600));

  try {
    // -------------------------------------------------------------
    // [Setup] Authenticate Super Admin and Create Test Institute A & B
    // -------------------------------------------------------------
    console.log('[Setup] Authenticating Super Admin...');
    const superLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@platform.local',
        password: 'AdminSecurePassword#2026',
        role: 'SUPER_ADMIN',
      },
    });
    assert.strictEqual(superLogin.status, 200, 'Super admin login failed');
    const superToken = superLogin.data.data.accessToken;

    const codeA = `MHW${Math.floor(1000 + Math.random() * 9000)}`;
    const instResA = await request('/institutes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: {
        name: `Horizon Learning Academy ${codeA}`,
        code: codeA,
        adminFullName: 'Director A',
        adminEmail: `admin.${codeA.toLowerCase()}@horizon.local`,
        adminInitialPassword: 'Password#123',
      },
    });
    assert.strictEqual(instResA.status, 201, 'Failed to create Institute A');
    const instituteA = instResA.data.data.institute;

    // Login as Admin A
    const adminLoginA = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: `admin.${codeA.toLowerCase()}@horizon.local`,
        password: 'Password#123',
        role: 'ACADEMIC_ADMIN',
        instituteCode: codeA,
      },
    });
    const adminTokenA = adminLoginA.data.data.accessToken;
    const adminHeadersA = { Authorization: `Bearer ${adminTokenA}`, 'x-institute-id': instituteA.id };

    // Create Batch 1 and Batch 2 in Institute A
    const b1Res = await request('/academics/batches', {
      method: 'POST',
      headers: adminHeadersA,
      body: { name: 'Batch Alpha (Physics & Math)', academicYear: '2026-2027' },
    });
    const batch1 = b1Res.data.data.batch;

    const b2Res = await request('/academics/batches', {
      method: 'POST',
      headers: adminHeadersA,
      body: { name: 'Batch Beta (Chemistry & Biology)', academicYear: '2026-2027' },
    });
    const batch2 = b2Res.data.data.batch;

    // Create Subjects in Institute A
    const s1Res = await request('/academics/subjects', {
      method: 'POST',
      headers: adminHeadersA,
      body: { name: 'Applied Mathematics', code: `MTH-${Math.floor(100 + Math.random() * 900)}` },
    });
    const subject1 = s1Res.data.data.subject;

    const s2Res = await request('/academics/subjects', {
      method: 'POST',
      headers: adminHeadersA,
      body: { name: 'Organic Chemistry', code: `CHM-${Math.floor(100 + Math.random() * 900)}` },
    });
    const subject2 = s2Res.data.data.subject;

    // Provision Staff 1 (Assigned to Batch 1 + Subject 1)
    const staff1Email = `faculty1.${Math.floor(1000 + Math.random() * 9000)}@horizon.local`;
    const staff1Res = await request('/staff', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        email: staff1Email,
        fullName: 'Prof. Ananya Sen',
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        designation: 'Senior Math Faculty',
        initialPassword: 'Password#123',
      },
    });
    const staff1User = staff1Res.data.data.user;
    const staff1ProfileId = staff1Res.data.data.staffId || staff1Res.data.data.staff?.id;

    // Assign Staff 1 to Batch 1
    await request(`/academics/batches/${batch1.id}/staff`, {
      method: 'POST',
      headers: adminHeadersA,
      body: { staffProfileId: staff1ProfileId },
    });

    // Assign Staff 1 to Subject 1 in Batch 1
    await request(`/academics/batches/${batch1.id}/subjects`, {
      method: 'POST',
      headers: adminHeadersA,
      body: { subjectId: subject1.id, staffProfileId: staff1ProfileId },
    });

    // Provision Staff 2 (Assigned to Batch 2 + Subject 2)
    const staff2Email = `faculty2.${Math.floor(1000 + Math.random() * 9000)}@horizon.local`;
    const staff2Res = await request('/staff', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        email: staff2Email,
        fullName: 'Dr. Rajesh Pillai',
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        designation: 'Chemistry Faculty',
        initialPassword: 'Password#123',
      },
    });
    const staff2ProfileId = staff2Res.data.data.staffId || staff2Res.data.data.staff?.id;

    await request(`/academics/batches/${batch2.id}/staff`, {
      method: 'POST',
      headers: adminHeadersA,
      body: { staffProfileId: staff2ProfileId },
    });

    await request(`/academics/batches/${batch2.id}/subjects`, {
      method: 'POST',
      headers: adminHeadersA,
      body: { subjectId: subject2.id, staffProfileId: staff2ProfileId },
    });

    // Login Staff 1
    const staff1Login = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: staff1Email,
        password: 'Password#123',
        role: 'STAFF',
        instituteCode: codeA,
      },
    });
    const staff1Token = staff1Login.data.data.accessToken;
    const staff1Headers = { Authorization: `Bearer ${staff1Token}`, 'x-institute-id': instituteA.id };

    // Login Staff 2
    const staff2Login = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: staff2Email,
        password: 'Password#123',
        role: 'STAFF',
        instituteCode: codeA,
      },
    });
    const staff2Token = staff2Login.data.data.accessToken;
    const staff2Headers = { Authorization: `Bearer ${staff2Token}`, 'x-institute-id': instituteA.id };

    // Admit Student 1 (Enrolled in Batch 1)
    const stu1Email = `student1.${Math.floor(1000 + Math.random() * 9000)}@horizon.local`;
    const stu1Res = await request('/students', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        admissionNumber: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        batchId: batch1.id,
        createLoginAccount: true,
        email: stu1Email,
        initialPassword: 'Password#123',
      },
    });
    const student1 = stu1Res.data.data.student;

    const stu1Login = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: stu1Email,
        password: 'Password#123',
        role: 'STUDENT',
        instituteCode: codeA,
      },
    });
    const stu1Token = stu1Login.data.data.accessToken;
    const stu1Headers = { Authorization: `Bearer ${stu1Token}`, 'x-institute-id': instituteA.id };

    // Admit Student 2 (Enrolled in Batch 2)
    const stu2Email = `student2.${Math.floor(1000 + Math.random() * 9000)}@horizon.local`;
    const stu2Res = await request('/students', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        admissionNumber: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: 'Divya',
        lastName: 'Patel',
        batchId: batch2.id,
        createLoginAccount: true,
        email: stu2Email,
        initialPassword: 'Password#123',
      },
    });
    const student2 = stu2Res.data.data.student;

    const stu2Login = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: stu2Email,
        password: 'Password#123',
        role: 'STUDENT',
        instituteCode: codeA,
      },
    });
    const stu2Token = stu2Login.data.data.accessToken;
    const stu2Headers = { Authorization: `Bearer ${stu2Token}`, 'x-institute-id': instituteA.id };

    // Provision Parent 1 (Linked to Student 1)
    const parent1Phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const p1Res = await request('/parents', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        phone: parent1Phone,
        fullName: 'Sunil Sharma (Father)',
        email: `parent1.${codeA.toLowerCase()}@horizon.local`,
        initialPassword: 'Password#123',
      },
    });
    const parent1 = p1Res.data.data.parent;

    await request(`/parents/students/${student1.id}/guardians`, {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        parentId: parent1.id,
        relation: 'FATHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      },
    });

    const p1Login = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: parent1Phone,
        password: 'Password#123',
        role: 'PARENT',
        instituteCode: codeA,
      },
    });
    const parent1Token = p1Login.data.data.accessToken;
    const parent1Headers = { Authorization: `Bearer ${parent1Token}`, 'x-institute-id': instituteA.id };

    // Create Institute B for Cross-Tenant Testing
    const codeB = `MHW${Math.floor(1000 + Math.random() * 9000)}`;
    const instResB = await request('/institutes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: {
        name: `Pinnacle Institute ${codeB}`,
        code: codeB,
        adminFullName: 'Director B',
        adminEmail: `admin.${codeB.toLowerCase()}@pinnacle.local`,
        adminInitialPassword: 'Password#123',
      },
    });
    const instituteB = instResB.data.data.institute;

    const adminLoginB = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: `admin.${codeB.toLowerCase()}@pinnacle.local`,
        password: 'Password#123',
        role: 'ACADEMIC_ADMIN',
        instituteCode: codeB,
      },
    });
    const adminTokenB = adminLoginB.data.data.accessToken;
    const adminHeadersB = { Authorization: `Bearer ${adminTokenB}`, 'x-institute-id': instituteB.id };

    console.log(' -> [Setup Complete] 2 Institutes, 2 Batches, 2 Staff, 2 Students, and 1 Parent provisioned.\n');

    // =============================================================
    // TEST 1: Staff creates and publishes PDF learning material
    // =============================================================
    console.log('[Test 1] Testing Staff PDF material creation in authorized batch/subject...');
    const pdfRes = await request('/materials', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch1.id,
        subjectId: subject1.id,
        title: 'Calculus Fundamentals Cheat Sheet',
        description: 'Complete derivative and integral formula references.',
        type: 'PDF',
        isPublished: true,
      },
    });
    assert.strictEqual(pdfRes.status, 201, `Failed to create PDF material: ${JSON.stringify(pdfRes.data)}`);
    const pdfMaterial = pdfRes.data.data.material;
    assert.strictEqual(pdfMaterial.title, 'Calculus Fundamentals Cheat Sheet');
    assert.strictEqual(pdfMaterial.isPublished, true);
    console.log(' -> [PASS] Staff successfully published PDF material.');

    // =============================================================
    // TEST 2: Staff creates Image, Audio, and Text-only study notes
    // =============================================================
    console.log('[Test 2] Testing Image, Audio, and Text-only materials...');
    // Image
    const imgRes = await request('/materials', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch1.id,
        subjectId: subject1.id,
        title: 'Coordinate Geometry Diagram',
        description: 'Parabola and Hyperbola focal curves graph.',
        type: 'IMAGE',
        isPublished: true,
      },
    });
    assert.strictEqual(imgRes.status, 201, 'Failed to create IMAGE material');

    // Audio
    const audioRes = await request('/materials', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch1.id,
        subjectId: subject1.id,
        title: 'Lecture 12 Audio: Real World Integrals',
        description: 'Recorded classroom lecture podcast.',
        type: 'AUDIO',
        isPublished: true,
      },
    });
    assert.strictEqual(audioRes.status, 201, 'Failed to create AUDIO material');

    // Text Notes (No file required, content in body)
    const textRes = await request('/materials', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch1.id,
        subjectId: subject1.id,
        title: 'Differential Equations Study Instructions',
        description: 'Step-by-step solving guide.',
        content: 'Rule 1: Separate variables dx and dy. Rule 2: Integrate both sides.',
        type: 'TEXT',
        isPublished: true,
      },
    });
    assert.strictEqual(textRes.status, 201, 'Failed to create TEXT material');
    assert.strictEqual(textRes.data.data.material.content, 'Rule 1: Separate variables dx and dy. Rule 2: Integrate both sides.');
    console.log(' -> [PASS] Image, Audio, and Text-only materials created successfully.');

    // =============================================================
    // TEST 3: Batch-wide Material (without specific subjectId)
    // =============================================================
    console.log('[Test 3] Testing Batch-wide material publishing (no subjectId)...');
    const batchWideRes = await request('/materials', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch1.id,
        title: 'Batch Alpha General Guidelines & Schedule',
        description: 'Notice for all students in Batch Alpha regardless of elective.',
        type: 'ANNOUNCEMENT',
        isPublished: true,
      },
    });
    assert.strictEqual(batchWideRes.status, 201, `Failed to create batch-wide material: ${JSON.stringify(batchWideRes.data)}`);
    assert.strictEqual(batchWideRes.data.data.material.subjectId, null);
    console.log(' -> [PASS] Batch-wide material published without subjectId.');

    // =============================================================
    // TEST 4 & 5: Student Scoping & Isolation
    // =============================================================
    console.log('[Test 4 & 5] Testing Student visibility and batch isolation...');
    // Student 1 (Enrolled in Batch 1)
    const stu1List = await request('/materials', { headers: stu1Headers });
    assert.strictEqual(stu1List.status, 200);
    const stu1Materials = stu1List.data.data.materials;
    assert(stu1Materials.length >= 4, 'Student 1 should see all published Batch 1 materials');
    assert(stu1Materials.some((m: any) => m.title === 'Calculus Fundamentals Cheat Sheet'));
    assert(stu1Materials.some((m: any) => m.title === 'Batch Alpha General Guidelines & Schedule'));
    console.log(` -> [PASS] Student 1 retrieved ${stu1Materials.length} materials from enrolled batch.`);

    // Student 2 (Enrolled in Batch 2) -> MUST NOT see Batch 1 materials
    const stu2List = await request('/materials', { headers: stu2Headers });
    assert.strictEqual(stu2List.status, 200);
    const stu2Materials = stu2List.data.data.materials;
    const hasBatch1Mat = stu2Materials.some((m: any) => m.batchId === batch1.id);
    assert.strictEqual(hasBatch1Mat, false, 'Student 2 must not see Batch 1 materials');
    console.log(' -> [PASS] Student 2 correctly isolated: 0 Batch 1 materials visible.');

    // =============================================================
    // TEST 6: Unauthorized Staff Cannot Publish to Other Batches
    // =============================================================
    console.log('[Test 6] Testing staff authorization boundary (Staff 1 attempting Batch 2)...');
    const unauthorizedPublish = await request('/materials', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch2.id, // Staff 1 is NOT assigned to Batch 2
        title: 'Hacked Material Attempt',
        type: 'PDF',
      },
    });
    assert.strictEqual(unauthorizedPublish.status, 403, 'Unauthorized staff publish was not rejected with 403');
    console.log(' -> [PASS] Staff 1 publishing to Batch 2 blocked with HTTP 403 Forbidden.');

    // =============================================================
    // TEST 7: Draft Material Visibility
    // =============================================================
    console.log('[Test 7] Testing Draft materials (visible to faculty, hidden from students)...');
    const draftRes = await request('/materials', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch1.id,
        subjectId: subject1.id,
        title: 'Draft Chapter 5 - Unreleased',
        type: 'PDF',
        isPublished: false,
      },
    });
    assert.strictEqual(draftRes.status, 201);
    const draftId = draftRes.data.data.material.id;

    // Student 1 checks list -> draft should NOT appear
    const stu1CheckDraft = await request('/materials', { headers: stu1Headers });
    const studentSeesDraft = stu1CheckDraft.data.data.materials.some((m: any) => m.id === draftId);
    assert.strictEqual(studentSeesDraft, false, 'Draft material must not be visible to students');

    // Student 1 tries direct GET /materials/:id on draft -> Expect 403
    const stu1DirectDraft = await request(`/materials/${draftId}`, { headers: stu1Headers });
    assert.strictEqual(stu1DirectDraft.status, 403, 'Direct access to draft must return 403 for students');

    // Staff 1 who created draft -> should see draft in list
    const staff1ListDrafts = await request('/materials?status=DRAFT', { headers: staff1Headers });
    const staffSeesDraft = staff1ListDrafts.data.data.materials.some((m: any) => m.id === draftId);
    assert.strictEqual(staffSeesDraft, true, 'Staff creator must see their own draft materials');
    console.log(' -> [PASS] Draft material hidden from students and visible to author faculty.');

    // =============================================================
    // TEST 8: Homework Creation & Student Scoping
    // =============================================================
    console.log('\n[Test 8] Testing Homework assignment creation and scoping...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const hwRes = await request('/homework', {
      method: 'POST',
      headers: staff1Headers,
      body: {
        batchId: batch1.id,
        subjectId: subject1.id,
        title: 'Calculus Problem Set 1 - Limits & Continuity',
        description: 'Complete exercises 1 to 20 from textbook page 84.',
        dueDate: tomorrow.toISOString(),
        maxMarks: 50,
        isPublished: true,
      },
    });
    assert.strictEqual(hwRes.status, 201, `Homework creation failed: ${JSON.stringify(hwRes.data)}`);
    const homework1 = hwRes.data.data.homework;
    assert.strictEqual(homework1.title, 'Calculus Problem Set 1 - Limits & Continuity');
    assert.strictEqual(Number(homework1.maxMarks), 50);

    // Student 1 lists homework -> sees homework with studentStatus: NOT_STARTED
    const stu1HwList = await request('/homework', { headers: stu1Headers });
    assert.strictEqual(stu1HwList.status, 200);
    const stu1Hw = stu1HwList.data.data.homework.find((h: any) => h.id === homework1.id);
    assert(stu1Hw, 'Student 1 must see assigned homework');
    assert.strictEqual(stu1Hw.studentStatus, 'NOT_STARTED');

    // Student 2 (Batch 2) -> does NOT see homework
    const stu2HwList = await request('/homework', { headers: stu2Headers });
    assert.strictEqual(stu2HwList.status, 200);
    const stu2SeesHw = stu2HwList.data.data.homework.some((h: any) => h.id === homework1.id);
    assert.strictEqual(stu2SeesHw, false, 'Student 2 must not see Batch 1 homework');
    console.log(' -> [PASS] Homework created and isolated exclusively to enrolled students.');

    // =============================================================
    // TEST 9: Student Homework Completion ("Mark as Completed")
    // =============================================================
    console.log('[Test 9] Testing Student "Mark as Completed" workflow...');
    const completeRes = await request(`/homework/${homework1.id}/submissions`, {
      method: 'POST',
      headers: stu1Headers,
      body: { isCompleted: true, status: 'COMPLETED' },
    });
    assert.strictEqual(completeRes.status, 201, 'Student mark completed failed');
    assert.strictEqual(completeRes.data.data.submission.status, 'COMPLETED');

    // Student 1 refetches homework list -> status should be 'COMPLETED'
    const stu1HwAfterComplete = await request('/homework', { headers: stu1Headers });
    const updatedHw = stu1HwAfterComplete.data.data.homework.find((h: any) => h.id === homework1.id);
    assert.strictEqual(updatedHw.studentStatus, 'COMPLETED');
    console.log(' -> [PASS] Student marked assignment as completed successfully.');

    // =============================================================
    // TEST 10: Idempotent Submissions (Preventing Duplicate Records)
    // =============================================================
    console.log('[Test 10] Testing submission idempotency (prevent duplicate records)...');
    const submitAgain = await request(`/homework/${homework1.id}/submissions`, {
      method: 'POST',
      headers: stu1Headers,
      body: {
        studentNotes: 'Updated solution: verified limits using L\'Hopital\'s rule.',
      },
    });
    assert.strictEqual(submitAgain.status, 201, 'Submitting update failed');
    assert.strictEqual(submitAgain.data.data.submission.studentNotes, 'Updated solution: verified limits using L\'Hopital\'s rule.');

    // Verify DB count: only 1 submission record exists for this student & material
    const subCount = await prisma.homeworkSubmission.count({
      where: { materialId: homework1.id, studentId: student1.id },
    });
    assert.strictEqual(subCount, 1, 'Only 1 submission record should exist in DB');
    console.log(' -> [PASS] Idempotency verified: exactly 1 submission record maintained.');

    // =============================================================
    // TEST 11: Staff Completion Progress & Student Roster
    // =============================================================
    console.log('[Test 11] Testing Staff completion metrics and full student roster...');
    const progressRes = await request(`/homework/${homework1.id}/submissions`, {
      headers: staff1Headers,
    });
    assert.strictEqual(progressRes.status, 200, 'Staff failed to fetch completion progress');
    const { summary, roster } = progressRes.data.data;

    assert.strictEqual(summary.totalEligible, 1, 'Total eligible should be 1 student');
    assert.strictEqual(summary.submittedCount, 1, 'Submitted count should be 1');
    assert.strictEqual(summary.notStartedCount, 0, 'Not started count should be 0');

    assert.strictEqual(roster.length, 1);
    assert.strictEqual(roster[0].student.id, student1.id);
    assert.strictEqual(roster[0].status, 'SUBMITTED');
    console.log(' -> [PASS] Staff completion summary: total 1, submitted 1, not-started 0.');

    // =============================================================
    // TEST 12: Staff Evaluation & Grading
    // =============================================================
    console.log('[Test 12] Testing Staff grading student submission...');
    const subId = roster[0].submission.id;
    const gradeRes = await request(`/homework/submissions/${subId}/grade`, {
      method: 'PATCH',
      headers: staff1Headers,
      body: { grade: '48/50', feedback: 'Outstanding analytical clarity!' },
    });
    assert.strictEqual(gradeRes.status, 200, 'Grading submission failed');
    assert.strictEqual(gradeRes.data.data.submission.grade, '48/50');
    assert.strictEqual(gradeRes.data.data.submission.status, 'GRADED');

    // Student 1 checks homework -> sees grade and feedback
    const stu1CheckGrade = await request('/homework', { headers: stu1Headers });
    const gradedHw = stu1CheckGrade.data.data.homework.find((h: any) => h.id === homework1.id);
    assert.strictEqual(gradedHw.studentStatus, 'GRADED');
    assert.strictEqual(gradedHw.mySubmission.grade, '48/50');
    assert.strictEqual(gradedHw.mySubmission.feedback, 'Outstanding analytical clarity!');
    console.log(' -> [PASS] Submission graded and verified by student with feedback.');

    // =============================================================
    // TEST 13: Student Cannot Modify Another Student's Work
    // =============================================================
    console.log('[Test 13] Testing Student 2 cannot submit or access Student 1 homework...');
    const student2CrossSubmit = await request(`/homework/${homework1.id}/submissions`, {
      method: 'POST',
      headers: stu2Headers, // Student 2 is NOT enrolled in Batch 1
      body: { studentNotes: 'Malicious cross-enrollment submission attempt' },
    });
    assert.strictEqual(student2CrossSubmit.status, 403, 'Cross-enrollment submission must be rejected with 403');
    console.log(' -> [PASS] Student 2 cross-enrollment submission rejected with HTTP 403.');

    // =============================================================
    // TEST 14: Parent Scoping (Linked Child Only)
    // =============================================================
    console.log('[Test 14] Testing Parent access to linked child materials and homework...');
    const parentMatRes = await request('/materials', { headers: parent1Headers });
    assert.strictEqual(parentMatRes.status, 200);
    assert(parentMatRes.data.data.materials.length > 0, 'Parent should see child materials');

    const parentHwRes = await request('/homework', { headers: parent1Headers });
    assert.strictEqual(parentHwRes.status, 200);
    assert(parentHwRes.data.data.homework.some((h: any) => h.id === homework1.id), 'Parent should see child homework');
    console.log(' -> [PASS] Parent 1 successfully retrieves linked child educational content.');

    // =============================================================
    // TEST 15: Cross-Institute Isolation
    // =============================================================
    console.log('[Test 15] Testing Multi-tenant Institute Isolation (Institute B caller)...');
    const crossTenantMat = await request(`/materials/${pdfMaterial.id}`, { headers: adminHeadersB });
    assert.strictEqual(crossTenantMat.status, 404, 'Institute B must not access Institute A material (404 expected)');

    const crossTenantHw = await request(`/homework/${homework1.id}/submissions`, { headers: adminHeadersB });
    assert.strictEqual(crossTenantHw.status, 404, 'Institute B must not access Institute A homework (404 expected)');
    console.log(' -> [PASS] Strict tenant boundary verified: Cross-institute requests rejected.');

    console.log('\n=== ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runMaterialsAndHomeworkTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
