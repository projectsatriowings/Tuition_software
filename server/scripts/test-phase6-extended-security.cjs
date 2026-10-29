/**
 * TuitionOS Phase 6 - Extended Multi-Role Security & Vulnerability Audit Suite
 */
require('dotenv').config();
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-dev-only-32-chars-long';
const INSTITUTE_ID = '0237162e-13be-4a81-b046-11d77bd62483'; // Apex Tuition Academy
const ALIEN_INSTITUTE_ID = '11111111-2222-3333-4444-555555555555';

function signToken(userId, email, role, fullName, instituteId = INSTITUTE_ID, expiresIn = '1h') {
  return jwt.sign(
    { userId, email, role, fullName, instituteId },
    JWT_SECRET,
    { expiresIn }
  );
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000/api${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.instituteId ? { 'x-institute-id': options.instituteId } : {}),
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`  [PASS] Test ${total}: ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] Test ${total}: ${testName}`);
  }
}

async function runExtendedSecurityAudit() {
  console.log('\n================================================================');
  console.log('TuitionOS Phase 6 — Extended Security & Multi-Role Audit');
  console.log('================================================================\n');

  try {
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@apexacademy.com' } });
    const staffUser = await prisma.user.findFirst({ where: { email: 'teacher@apexacademy.com' } });
    const studentUser = await prisma.user.findFirst({ where: { email: 'student@apexacademy.com' } });
    const student2User = await prisma.user.findFirst({ where: { email: 'soundher@gmail.com' } });
    const kanishkaStaff = await prisma.user.findFirst({ where: { fullName: { contains: 'Kanishka' } } });

    // Parents
    const parent1 = await prisma.user.findFirst({
      where: { role: 'PARENT', parentProfile: { studentRelations: { some: {} } } },
      include: { parentProfile: { include: { studentRelations: true } } },
    });
    const parent2 = await prisma.user.findFirst({
      where: {
        role: 'PARENT',
        id: { not: parent1?.id },
        parentProfile: { studentRelations: { some: {} } },
      },
      include: { parentProfile: { include: { studentRelations: true } } },
    });

    const adminToken = signToken(adminUser.id, adminUser.email, 'ACADEMIC_ADMIN', adminUser.fullName);
    const staffToken = signToken(staffUser.id, staffUser.email, 'STAFF', staffUser.fullName);
    const studentToken = signToken(studentUser.id, studentUser.email, 'STUDENT', studentUser.fullName);
    const kanishkaToken = kanishkaStaff ? signToken(kanishkaStaff.id, kanishkaStaff.email, 'STAFF', kanishkaStaff.fullName) : null;
    const parent1Token = parent1 ? signToken(parent1.id, parent1.email, 'PARENT', parent1.fullName) : null;

    // 1. Cross-Institute Isolation
    console.log('--- 1. Multi-Tenant Cross-Institute Isolation ---');
    const crossInstRes = await request('/academics/batches', {
      token: staffToken,
      instituteId: ALIEN_INSTITUTE_ID,
    });
    // Staff's token is bound to Apex Academy; spoofing an alien institute header is rejected or yields empty/error
    assert(
      crossInstRes.status === 403 || crossInstRes.status === 401 || (crossInstRes.data?.data?.batches?.length === 0),
      'Staff user cannot access batches from another tenant by spoofing x-institute-id header'
    );

    // 2. Token Security (Expired & Forged Token Rejection)
    console.log('\n--- 2. Token Security & Cryptographic Integrity ---');
    const expiredToken = signToken(studentUser.id, studentUser.email, 'STUDENT', studentUser.fullName, INSTITUTE_ID, '-10s');
    const expiredRes = await request('/students/my/profile', {
      token: expiredToken,
      instituteId: INSTITUTE_ID,
    });
    assert(expiredRes.status === 401, 'Expired JWT token is strictly rejected with HTTP 401');

    const forgedToken = studentToken.slice(0, -6) + 'abcdef'; // Tampered signature
    const forgedRes = await request('/students/my/profile', {
      token: forgedToken,
      instituteId: INSTITUTE_ID,
    });
    assert(forgedRes.status === 401, 'Tampered signature JWT token is strictly rejected with HTTP 401');

    // 3. Attendance Authorization
    console.log('\n--- 3. Attendance Authorization & Fraud Prevention ---');
    // Student attempts to mark check-in for themselves or others
    const studentAttRes = await request('/attendance/check-in', {
      method: 'POST',
      token: studentToken,
      instituteId: INSTITUTE_ID,
      body: {
        studentId: studentUser.id,
        batchId: '351e3e9a-b711-4a28-8be2-13a580cef638',
      },
    });
    assert(studentAttRes.status === 403, 'Student cannot mark attendance (blocked with HTTP 403)');

    // Parent attempts to mark check-in
    if (parent1Token) {
      const parentAttRes = await request('/attendance/check-in', {
        method: 'POST',
        token: parent1Token,
        instituteId: INSTITUTE_ID,
        body: {
          studentId: studentUser.id,
          batchId: '351e3e9a-b711-4a28-8be2-13a580cef638',
        },
      });
      assert(parentAttRes.status === 403, 'Parent cannot mark attendance (blocked with HTTP 403)');
    }

    // 4. Credential Reset Authorization
    console.log('\n--- 4. Credential Reset Authorization ---');
    const studentRecord = await prisma.student.findFirst({ where: { instituteId: INSTITUTE_ID } });
    if (studentRecord) {
      // Student attempts to reset password of another student
      const hackPasswordRes = await request(`/students/${studentRecord.id}/reset-password`, {
        method: 'POST',
        token: studentToken,
        instituteId: INSTITUTE_ID,
      });
      assert(hackPasswordRes.status === 403, 'Student cannot trigger credential reset on any student account (HTTP 403)');
    }

    // 5. Fee Management Authorization
    console.log('\n--- 5. Fee Management Authorization ---');
    // Student attempts to create a fee structure
    const createFeeRes = await request('/fees/structures', {
      method: 'POST',
      token: studentToken,
      instituteId: INSTITUTE_ID,
      body: { name: 'Free Tuition Zero', amount: 0 },
    });
    assert(createFeeRes.status === 403, 'Student cannot create fee structures (blocked with HTTP 403)');

    // 6. Path Traversal File Security
    console.log('\n--- 6. Path Traversal & File System Safety ---');
    const traversalRes = await request('/materials/download?file=../../package.json', {
      token: staffToken,
      instituteId: INSTITUTE_ID,
    });
    assert(
      traversalRes.status === 404 || traversalRes.status === 400 || traversalRes.status === 403,
      'Path traversal attempt in file download is safely rejected without file disclosure'
    );

    // 7. Exam Marks & Cross-Institute Isolation
    console.log('\n--- 7. Exam Marks & Cross-Institute Isolation ---');
    const foreignExam = await prisma.examination.findFirst();
    if (foreignExam) {
      // Student in Apex Academy queries an exam belonging to another institute
      const examDetailRes = await request(`/exams/${foreignExam.id}`, {
        token: studentToken,
        instituteId: INSTITUTE_ID,
      });
      assert(
        examDetailRes.status === 404 || examDetailRes.status === 403,
        'Foreign institute exam is not accessible to cross-tenant student (HTTP 404/403)'
      );
    }

    // 8. Quiz Authoring Protection & Server-Side Security
    console.log('\n--- 8. Quiz Authoring Protection & Server-Side Security ---');
    const studentQuizCreateRes = await request('/quizzes', {
      method: 'POST',
      token: studentToken,
      instituteId: INSTITUTE_ID,
      body: { title: 'Unauthorized Quiz Creation Attempt' },
    });
    assert(studentQuizCreateRes.status === 403, 'Student cannot create or publish quizzes (blocked with HTTP 403)');

    // 9. Direct Messaging Isolation
    console.log('\n--- 9. Direct Messaging & Conversation Authorization ---');
    // Student attempts to access parent-staff communication
    const studentMsgRes = await request('/messaging/conversations', {
      token: studentToken,
      instituteId: INSTITUTE_ID,
    });
    assert(studentMsgRes.status === 403, 'Student is strictly blocked from parent-teacher chat channels (HTTP 403)');

    // Staff queries their conversations
    const staffMsgRes = await request('/messaging/conversations', {
      token: staffToken,
      instituteId: INSTITUTE_ID,
    });
    assert(staffMsgRes.status === 200, 'Staff can access authorized parent-staff conversation threads (HTTP 200)');

    console.log('\n================================================================');
    console.log(`Extended Security Audit Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('================================================================\n');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Extended security audit failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runExtendedSecurityAudit();
