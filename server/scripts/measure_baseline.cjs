require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const BASE_URL = 'http://localhost:5000/api';
const INSTITUTE_ID = '0237162e-13be-4a81-b046-11d77bd62483';

function makeToken(user, role) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: role || user.role,
      fullName: user.fullName,
      instituteId: INSTITUTE_ID,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function measureEndpoint(name, url, token, runs = 3) {
  const times = [];
  let size = 0;
  let status = 0;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-institute-id': INSTITUTE_ID,
        },
      });
      const text = await res.text();
      const duration = performance.now() - start;
      times.push(duration);
      size = Buffer.byteLength(text, 'utf8');
      status = res.status;
    } catch (err) {
      console.error(`Error fetching ${name}:`, err.message);
      times.push(-1);
    }
  }

  const validTimes = times.filter((t) => t >= 0);
  const avg = validTimes.length ? (validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(1) : 'ERR';
  const min = validTimes.length ? Math.min(...validTimes).toFixed(1) : 'ERR';
  const max = validTimes.length ? Math.max(...validTimes).toFixed(1) : 'ERR';

  console.log(`| ${name.padEnd(35)} | HTTP ${status} | Avg: ${String(avg).padStart(6)} ms | Min: ${String(min).padStart(6)} ms | Max: ${String(max).padStart(6)} ms | ${(size / 1024).toFixed(2).padStart(6)} KB |`);
  return { name, status, avg: parseFloat(avg) || 0, size };
}

async function run() {
  console.log('\n========================================================================================');
  console.log('TuitionOS Performance Diagnostic & Baseline Measurement');
  console.log('========================================================================================\n');

  // Find members of Apex Academy
  const memberships = await prisma.instituteMembership.findMany({
    where: { instituteId: INSTITUTE_ID, isActive: true },
    include: { user: true },
  });

  const staffMember = memberships.find((m) => m.role === 'STAFF' && m.user.fullName.includes('Anita')) || memberships.find((m) => m.role === 'STAFF');
  const adminMember = memberships.find((m) => m.role === 'ACADEMIC_ADMIN') || memberships.find((m) => m.role === 'SUPER_ADMIN') || staffMember;
  const studentMember = memberships.find((m) => m.role === 'STUDENT') || memberships.find((m) => m.user.fullName.includes('Soudher'));

  const staffUser = staffMember ? staffMember.user : await prisma.user.findFirst({ where: { fullName: { contains: 'Anita Verma' } } });
  const adminUser = adminMember ? adminMember.user : staffUser;
  const studentUser = studentMember ? studentMember.user : await prisma.user.findFirst({ where: { fullName: { contains: 'Soudher' } } });

  const staffToken = makeToken(staffUser, 'STAFF');
  const adminToken = makeToken(adminUser, 'ACADEMIC_ADMIN');
  const studentToken = makeToken(studentUser, 'STUDENT');

  const batch = await prisma.batch.findFirst({ where: { instituteId: INSTITUTE_ID, name: 'Batch B' } });

  console.log(`Staff User:   ${staffUser.fullName} (${staffUser.id})`);
  console.log(`Admin User:   ${adminUser.fullName} (${adminUser.id})`);
  console.log(`Student User: ${studentUser.fullName} (${studentUser.id})`);
  console.log(`Batch B ID:   ${batch ? batch.id : 'N/A'}\n`);

  console.log('| Endpoint                            | Status   | Avg (ms)    | Min (ms)    | Max (ms)    | Payload   |');
  console.log('|-------------------------------------|----------|-------------|-------------|-------------|-----------|');

  const results = [];
  results.push(await measureEndpoint('GET /institutes/dashboard/summary', `${BASE_URL}/institutes/dashboard/summary`, adminToken));
  results.push(await measureEndpoint('GET /academics/batches', `${BASE_URL}/academics/batches`, staffToken));
  results.push(await measureEndpoint('GET /students (Default list)', `${BASE_URL}/students`, staffToken));
  results.push(await measureEndpoint('GET /students?limit=20', `${BASE_URL}/students?limit=20`, staffToken));
  results.push(await measureEndpoint('GET /students?search=a', `${BASE_URL}/students?search=a`, staffToken));
  if (batch) {
    results.push(await measureEndpoint('GET /attendance/summary', `${BASE_URL}/attendance/summary?batchId=${batch.id}`, staffToken));
  }
  results.push(await measureEndpoint('GET /materials (Staff)', `${BASE_URL}/materials`, staffToken));
  results.push(await measureEndpoint('GET /materials (Student)', `${BASE_URL}/materials`, studentToken));
  results.push(await measureEndpoint('GET /homework (Staff)', `${BASE_URL}/homework`, staffToken));
  results.push(await measureEndpoint('GET /homework (Student)', `${BASE_URL}/homework`, studentToken));
  results.push(await measureEndpoint('GET /quizzes (Staff)', `${BASE_URL}/quizzes`, staffToken));
  results.push(await measureEndpoint('GET /quizzes (Student)', `${BASE_URL}/quizzes`, studentToken));
  results.push(await measureEndpoint('GET /exams (Staff)', `${BASE_URL}/exams`, staffToken));
  results.push(await measureEndpoint('GET /notifications?limit=25', `${BASE_URL}/notifications?limit=25`, staffToken));
  results.push(await measureEndpoint('GET /notifications/unread-count', `${BASE_URL}/notifications/unread-count`, staffToken));
  results.push(await measureEndpoint('GET /fees/reports/summary', `${BASE_URL}/fees/reports/summary`, adminToken));

  console.log('\n========================================================================================\n');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
