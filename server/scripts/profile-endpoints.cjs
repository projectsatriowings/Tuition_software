require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const BASE_URL = 'http://localhost:5000/api';
const INSTITUTE_ID = '0237162e-13be-4a81-b046-11d77bd62483';

async function run() {
  const admin = await prisma.user.findFirst({ where: { email: 'admin@apex.example.com' } });
  if (!admin) {
    console.log('Admin user not found');
    return;
  }
  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: 'ACADEMIC_ADMIN', fullName: admin.fullName, instituteId: INSTITUTE_ID },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const staff = await prisma.staffProfile.findFirst({ where: { instituteId: INSTITUTE_ID } });

  const endpoints = [
    { name: 'GET /staff', url: `${BASE_URL}/staff` },
    { name: `GET /staff/${staff ? staff.id : 'x'}`, url: `${BASE_URL}/staff/${staff ? staff.id : 'x'}` },
    { name: 'GET /staff-attendance/admin/daily-register', url: `${BASE_URL}/staff-attendance/admin/daily-register` },
    { name: 'GET /staff-attendance/admin/dashboard', url: `${BASE_URL}/staff-attendance/admin/dashboard` },
    { name: 'GET /institutes/dashboard/summary', url: `${BASE_URL}/institutes/dashboard/summary` },
    { name: 'GET /academics/batches', url: `${BASE_URL}/academics/batches` },
  ];

  console.log('| Endpoint                                           | Run 1 (Cold) | Run 2 (Warm) | Run 3 (Warm) | Status |');
  console.log('|----------------------------------------------------|--------------|--------------|--------------|--------|');

  for (const ep of endpoints) {
    const times = [];
    let lastStatus = 0;
    for (let r = 0; r < 3; r++) {
      const t0 = performance.now();
      try {
        const res = await fetch(ep.url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-institute-id': INSTITUTE_ID,
          },
        });
        await res.text();
        times.push((performance.now() - t0).toFixed(0));
        lastStatus = res.status;
      } catch (e) {
        times.push('ERR');
      }
    }
    console.log(`| ${ep.name.padEnd(50)} | ${(times[0] + ' ms').padStart(12)} | ${(times[1] + ' ms').padStart(12)} | ${(times[2] + ' ms').padStart(12)} | HTTP ${lastStatus} |`);
  }

  await prisma.$disconnect();
}

run().catch(console.error);
