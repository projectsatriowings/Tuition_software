import http from 'http';
import app from '../src/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_PORT = 5095;
let server: http.Server;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
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

async function runPhase5Tests() {
  console.log(`=== Phase 5 Learning Materials, Homework, Exams & Messaging Test Suite on port ${TEST_PORT} ===\n`);

  server = app.listen(TEST_PORT);
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    // -------------------------------------------------------------
    // [Setup] Authenticate Super Admin and Create Test Institute
    // -------------------------------------------------------------
    console.log('[Setup] Logging in as Super Admin and creating Phase 5 test institutes...');
    const superLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@platform.local',
        password: 'AdminSecurePassword#2026',
        role: 'SUPER_ADMIN',
      },
    });
    if (!superLogin.ok) throw new Error('Super Admin login failed');
    const superToken = superLogin.data.data.accessToken;

    const codeA = `P5A${Math.floor(1000 + Math.random() * 9000)}`;
    const instResA = await request('/institutes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: {
        name: 'Phase 5 Horizon Academy',
        code: codeA,
        adminFullName: 'Director Horizon',
        adminEmail: `admin.${codeA.toLowerCase()}@horizon.local`,
        adminInitialPassword: 'Password#123',
      },
    });
    if (!instResA.ok) throw new Error(`Failed to create Institute A: ${JSON.stringify(instResA.data)}`);
    const instituteA = instResA.data.data.institute;

    // Login as Admin A
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: `admin.${codeA.toLowerCase()}@horizon.local`,
        password: 'Password#123',
        role: 'ACADEMIC_ADMIN',
        instituteCode: codeA,
      },
    });
    const adminToken = adminLogin.data.data.accessToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'x-institute-id': instituteA.id };

    // Create Batch & Subject
    const batchRes = await request('/academics/batches', {
      method: 'POST',
      headers: adminHeaders,
      body: { name: 'Grade 10 - Batch Alpha', academicYear: '2026-2027' },
    });
    const batchA = batchRes.data.data.batch;

    const subRes = await request('/academics/subjects', {
      method: 'POST',
      headers: adminHeaders,
      body: { name: 'Advanced Mathematics', code: `MTH${Math.floor(100 + Math.random() * 900)}` },
    });
    const subjectA = subRes.data.data.subject;

    // Provision Staff
    const staffEmail = `faculty.${Math.floor(1000 + Math.random() * 9000)}@horizon.local`;
    const staffRes = await request('/staff', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        email: staffEmail,
        fullName: 'Prof. Vikram Rao',
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        designation: 'Head of Mathematics',
        initialPassword: 'Password#123',
      },
    });
    const staffUser = staffRes.data.data.user;

    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: staffEmail,
        password: 'Password#123',
        role: 'STAFF',
        instituteCode: codeA,
      },
    });
    const staffToken = staffLogin.data.data.accessToken;
    const staffHeaders = { Authorization: `Bearer ${staffToken}`, 'x-institute-id': instituteA.id };

    // Admit Student & create student login account
    const studentAdmNo = `ADM-P5-${Math.floor(10000 + Math.random() * 90000)}`;
    const studentEmail = `student.${Math.floor(1000 + Math.random() * 9000)}@horizon.local`;
    const studentRes = await request('/students', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        admissionNumber: studentAdmNo,
        rollNumber: 'R-01',
        firstName: 'Reyansh',
        lastName: 'Deshmukh',
        batchId: batchA.id,
        createLoginAccount: true,
        email: studentEmail,
        initialPassword: 'Password#123',
      },
    });
    const studentObj = studentRes.data.data.student;
    const studentUserId = studentRes.data.data.userAccount.id;

    const studentLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: studentEmail,
        password: 'Password#123',
        role: 'STUDENT',
        instituteCode: codeA,
      },
    });
    const studentToken = studentLogin.data.data.accessToken;
    const studentHeaders = { Authorization: `Bearer ${studentToken}`, 'x-institute-id': instituteA.id };

    // Provision Parent & Link
    const parentPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parentEmail = `parent.${Math.floor(1000 + Math.random() * 9000)}@horizon.local`;
    const parentRes = await request('/parents', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        phone: parentPhone,
        email: parentEmail,
        fullName: 'Manish Deshmukh (Father)',
        occupation: 'Mechanical Engineer',
        initialPassword: 'Password#123',
      },
    });
    const parentProfile = parentRes.data.data.parent;
    const parentUserId = parentRes.data.data.user.id;

    await request(`/parents/students/${studentObj.id}/guardians`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        parentId: parentProfile.id,
        relation: 'FATHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      },
    });

    const parentLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: parentPhone,
        password: 'Password#123',
        role: 'PARENT',
        instituteCode: codeA,
      },
    });
    const parentToken = parentLogin.data.data.accessToken;
    const parentHeaders = { Authorization: `Bearer ${parentToken}`, 'x-institute-id': instituteA.id };

    console.log(' -> [Setup Complete] Institutes, Staff, Student, and Parent provisioned.\n');

    // -------------------------------------------------------------
    // Test 1: Learning Materials CRUD
    // -------------------------------------------------------------
    console.log('[Test 1] Testing Learning Materials Creation & Listing...');
    const matRes = await request('/materials', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        batchId: batchA.id,
        subjectId: subjectA.id,
        title: 'Chapter 4: Quadratic Equations - Formula Cheat Sheet',
        description: 'Complete revision formulas and solved examples.',
        type: 'PDF',
      },
    });
    if (matRes.status !== 201) throw new Error(`Material creation failed: ${JSON.stringify(matRes.data)}`);
    const materialA = matRes.data.data.material;
    console.log(` -> [PASS] Material created (ID: ${materialA.id}, Type: ${materialA.type})`);

    // Verify student can view material
    const listMatRes = await request('/materials', { headers: studentHeaders });
    if (!listMatRes.ok || listMatRes.data.data.materials.length === 0) {
      throw new Error('Student failed to list material for enrolled batch');
    }
    console.log(' -> [PASS] Enrolled student successfully retrieved learning material.');

    // -------------------------------------------------------------
    // Test 2: Homework & Assignments Management
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing Homework Creation & Due Date Validation...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const hwRes = await request('/homework', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        batchId: batchA.id,
        subjectId: subjectA.id,
        title: 'Quadratic Equations Practice Set A',
        description: 'Solve questions 1 through 15 on page 42.',
        dueDate: tomorrow.toISOString(),
      },
    });
    if (hwRes.status !== 201) throw new Error(`Homework creation failed: ${JSON.stringify(hwRes.data)}`);
    const homeworkA = hwRes.data.data.homework;
    console.log(` -> [PASS] Homework created: "${homeworkA.title}" Due: ${homeworkA.dueDate}`);

    // Student Submits Homework
    console.log(' -> Student submits homework notes...');
    const submitRes = await request(`/homework/${homeworkA.id}/submissions`, {
      method: 'POST',
      headers: studentHeaders,
      body: { studentNotes: 'Completed all 15 questions with rough work attached.' },
    });
    if (submitRes.status !== 201) throw new Error(`Homework submission failed: ${JSON.stringify(submitRes.data)}`);
    const submissionA = submitRes.data.data.submission;
    console.log(` -> [PASS] Student submitted homework. Status: ${submissionA.status}`);

    // Staff Evaluates and Grades Submission
    console.log(' -> Staff grades student submission...');
    const gradeRes = await request(`/homework/submissions/${submissionA.id}/grade`, {
      method: 'PATCH',
      headers: staffHeaders,
      body: { grade: 'A+', feedback: 'Excellent step-by-step working.' },
    });
    if (gradeRes.status !== 200) throw new Error(`Grading failed: ${JSON.stringify(gradeRes.data)}`);
    console.log(` -> [PASS] Submission graded: ${gradeRes.data.data.submission.grade} | Feedback: "${gradeRes.data.data.submission.feedback}"`);

    // -------------------------------------------------------------
    // Test 3: Examination Management & Marks Entry
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing Examination Setup and Marks Entry...');
    const examRes = await request('/exams', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        batchId: batchA.id,
        subjectId: subjectA.id,
        title: 'Mathematics Unit Test 1',
        examType: 'Unit Test',
        academicYear: '2026-2027',
        totalMarks: 50,
        passingMarks: 20,
        examDate: '2026-10-20',
      },
    });
    if (examRes.status !== 201) throw new Error(`Exam creation failed: ${JSON.stringify(examRes.data)}`);
    const examA = examRes.data.data.exam;
    console.log(` -> [PASS] Exam created: "${examA.title}" (Total: ${examA.totalMarks}, Passing: ${examA.passingMarks})`);

    // Marks range validation: Test rejecting marks > totalMarks
    console.log(' -> Testing rejection of marks exceeding max totalMarks...');
    const invalidMarks = await request(`/exams/${examA.id}/marks`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        marks: [{ studentId: studentObj.id, marksObtained: 55, isAbsent: false }],
      },
    });
    if (invalidMarks.status !== 400) throw new Error('System allowed marks exceeding totalMarks!');
    console.log(' -> [PASS] Marks > totalMarks correctly rejected with HTTP 400.');

    // Valid Marks Entry
    console.log(' -> Entering valid exam marks (45/50)...');
    const validMarks = await request(`/exams/${examA.id}/marks`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        marks: [{ studentId: studentObj.id, marksObtained: 45, isAbsent: false, remarks: 'High accuracy' }],
      },
    });
    if (!validMarks.ok) throw new Error(`Valid marks entry failed: ${JSON.stringify(validMarks.data)}`);
    console.log(' -> [PASS] Student marks successfully saved.');

    // Publish Exam
    console.log(' -> Publishing exam results...');
    const pubRes = await request(`/exams/${examA.id}/publish`, {
      method: 'PATCH',
      headers: staffHeaders,
    });
    if (!pubRes.ok) throw new Error('Exam publish failed');
    console.log(` -> [PASS] Exam published: ${pubRes.data.data.isPublished}`);

    // Verify Student Report Card
    console.log(' -> Generating Student Report Card...');
    const reportCard = await request(`/exams/students/${studentObj.id}/report-card`, {
      headers: studentHeaders,
    });
    if (!reportCard.ok) throw new Error(`Report card failed: ${JSON.stringify(reportCard.data)}`);
    const report = reportCard.data.data;
    console.log(` -> [PASS] Report card generated: Cumulative ${report.summary.cumulativePercentage}% | Status: ${report.summary.status}`);
    if (report.summary.cumulativePercentage !== 90) {
      throw new Error(`Expected 90% but got ${report.summary.cumulativePercentage}%`);
    }

    // -------------------------------------------------------------
    // Test 4: Academic Progress Feedback
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing Academic Progress Feedback...');
    const fbRes = await request('/progress', {
      method: 'POST',
      headers: staffHeaders,
      body: {
        studentId: studentObj.id,
        batchId: batchA.id,
        termName: 'Quarter 1',
        remarks: 'Consistent analytical thinker and active in classroom discussions.',
        rating: 5,
        strengths: 'Algebraic problem solving, speed in mental calculations',
        improvements: 'Geometric theorem proofs',
        recommendations: 'Practice 3 geometric rider problems weekly',
        isPublished: true,
      },
    });
    if (fbRes.status !== 201) throw new Error(`Feedback failed: ${JSON.stringify(fbRes.data)}`);
    console.log(' -> [PASS] Academic progress feedback recorded with rating and recommendations.');

    // Verify Parent retrieves progress feedback
    const parentFb = await request(`/progress/students/${studentObj.id}`, { headers: parentHeaders });
    if (!parentFb.ok || parentFb.data.data.feedbacks.length === 0) {
      throw new Error('Parent failed to view student feedback');
    }
    console.log(` -> [PASS] Parent retrieved student progress feedback: "${parentFb.data.data.feedbacks[0].termName}"`);

    // -------------------------------------------------------------
    // Test 5: Parent Review Workflow
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing Parent Review Submission & Admin Reply...');
    const revRes = await request('/reviews', {
      method: 'POST',
      headers: parentHeaders,
      body: {
        studentId: studentObj.id,
        staffId: staffUser.id,
        rating: 5,
        reviewText: 'Great personal attention and disciplined batch schedule. Very satisfied with academic progress.',
      },
    });
    if (revRes.status !== 201) throw new Error(`Parent review failed: ${JSON.stringify(revRes.data)}`);
    const reviewA = revRes.data.data.review;
    console.log(` -> [PASS] Parent submitted 5-star review (ID: ${reviewA.id})`);

    // Admin replies to review
    const replyRes = await request(`/reviews/${reviewA.id}/reply`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { replyText: 'Thank you for your warm words. We remain committed to Reyansh academic excellence.' },
    });
    if (!replyRes.ok) throw new Error('Reply to review failed');
    console.log(` -> [PASS] Admin replied to parent review: "${replyRes.data.data.review.replyText}"`);

    // -------------------------------------------------------------
    // Test 6: One-to-One Parent-Staff Messaging
    // -------------------------------------------------------------
    console.log('\n[Test 6] Testing One-to-One Parent-Staff Messaging...');
    const convRes = await request('/messaging/conversations', {
      method: 'POST',
      headers: parentHeaders,
      body: {
        recipientUserId: staffUser.id,
        title: 'Reyansh Deshmukh - Mathematics Progress Inquiry',
      },
    });
    if (convRes.status !== 201 && convRes.status !== 200) {
      throw new Error(`Conversation creation failed: ${JSON.stringify(convRes.data)}`);
    }
    const convA = convRes.data.data.conversation;
    console.log(` -> [PASS] Conversation established (ID: ${convA.id}) between Parent & Staff.`);

    // Parent sends message
    console.log(' -> Parent sends message to staff...');
    const msg1Res = await request(`/messaging/conversations/${convA.id}/messages`, {
      method: 'POST',
      headers: parentHeaders,
      body: { body: 'Hello Prof. Rao, could you please recommend additional practice material for quadratic equations?' },
    });
    if (msg1Res.status !== 201) throw new Error(`Message send failed: ${JSON.stringify(msg1Res.data)}`);
    console.log(' -> [PASS] Message sent from Parent.');

    // Staff reads messages and replies
    console.log(' -> Staff reads messages and replies...');
    const readRes = await request(`/messaging/conversations/${convA.id}/messages`, {
      headers: staffHeaders,
    });
    if (!readRes.ok || readRes.data.data.messages.length === 0) throw new Error('Staff could not retrieve messages');

    const msg2Res = await request(`/messaging/conversations/${convA.id}/messages`, {
      method: 'POST',
      headers: staffHeaders,
      body: { body: 'Dear Mr. Deshmukh, I have uploaded Chapter 4 formula sheet to the portal and will provide 5 extra practice questions tomorrow.' },
    });
    if (msg2Res.status !== 201) throw new Error(`Staff reply failed: ${JSON.stringify(msg2Res.data)}`);
    console.log(' -> [PASS] Staff replied to Parent in conversation.');

    // Security Check: Unauthorized user cannot read conversation
    console.log(' -> Testing unauthorized access rejection to conversation...');
    const unauthRead = await request(`/messaging/conversations/${convA.id}/messages`, {
      headers: studentHeaders, // Student is not a member of Parent-Staff conversation
    });
    if (unauthRead.status !== 403) {
      throw new Error(`Expected HTTP 403 for non-member reading conversation, got ${unauthRead.status}`);
    }
    console.log(' -> [PASS] Non-member access strictly rejected with HTTP 403 Forbidden.');

    console.log('\n=============================================================');
    console.log('>>> ALL PHASE 5 ACADEMIC & COMMUNICATION TESTS PASSED! <<<');
    console.log('=============================================================');
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
    process.exitCode = 0;
  }
}

runPhase5Tests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]', err);
  if (server) server.close();
  prisma.$disconnect();
  process.exitCode = 1;
});
