import app from '../src/index.js';
import { dbPool } from '../src/config/db.js';
import { config } from '../src/config/index.js';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();
const server = http.createServer(app);
const TEST_PORT = 5096;
const BASE_URL = `http://localhost:${TEST_PORT}`;

server.listen(TEST_PORT, async () => {
  console.log(`=== Phase 4 Attendance & SMS Notification Integration Tests on port ${TEST_PORT} ===\n`);
  let failed = false;

  try {
    // -------------------------------------------------------------
    // Setup Test Institute, Staff, Student, and Parent
    // -------------------------------------------------------------
    console.log('[Setup] Logging in as Super Admin and creating test institute...');
    const superAdminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.superAdmin.email,
        password: config.superAdmin.defaultPassword,
        role: 'SUPER_ADMIN',
      }),
    });
    const superAdminToken = (await superAdminLoginRes.json()).data.accessToken;

    const instCode = `ATT${Date.now().toString().slice(-4)}`;
    const adminEmail = `admin.${instCode.toLowerCase()}@test.local`;
    const adminPassword = 'AdminPassword#2026';

    const createInstRes = await fetch(`${BASE_URL}/api/institutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: instCode,
        name: 'Attendance Academy',
        city: 'Pune',
        adminFullName: 'Attendance Admin',
        adminEmail,
        adminInitialPassword: adminPassword,
      }),
    });
    const instituteId = (await createInstRes.json()).data.institute.id;

    // Login as Academic Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmail,
        password: adminPassword,
        role: 'ACADEMIC_ADMIN',
      }),
    });
    const adminToken = (await adminLoginRes.json()).data.accessToken;

    // Create Batch
    const batchRes = await fetch(`${BASE_URL}/api/academics/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Morning Batch 10',
        academicYear: '2026-2027',
      }),
    });
    const batchId = (await batchRes.json()).data.batch.id;

    // Admit Student A and Student B
    const admNoA = `ADM-A-${Date.now().toString().slice(-4)}`;
    const admitResA = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        admissionNumber: admNoA,
        rollNumber: '01',
        firstName: 'Vivaan',
        lastName: 'Joshi',
        batchId,
      }),
    });
    const studentAId = (await admitResA.json()).data.student.id;

    const admNoB = `ADM-B-${Date.now().toString().slice(-4)}`;
    const admitResB = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        admissionNumber: admNoB,
        rollNumber: '02',
        firstName: 'Ananya',
        lastName: 'Patil',
        batchId,
      }),
    });
    const studentBId = (await admitResB.json()).data.student.id;

    // Provision Parent and link with canReceiveSms: true
    const parentPhone = `98${Date.now().toString().slice(-8)}`;
    const parentRes = await fetch(`${BASE_URL}/api/parents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Kiran Joshi',
        phone: parentPhone,
      }),
    });
    const parentId = (await parentRes.json()).data.parent.id;

    await fetch(`${BASE_URL}/api/parents/students/${studentAId}/guardians`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        parentId,
        relation: 'FATHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      }),
    });
    console.log(' -> [Setup Complete] Institute, students, and SMS-enabled guardian created.');

    // -------------------------------------------------------------
    // Test 1: Valid Check-In for Student A
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing Valid Check-In for Student A...');
    const checkInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        studentId: studentAId,
        method: 'MANUAL',
        isLate: true,
        remarks: 'Arrived 10 mins late due to bus traffic',
      }),
    });
    const checkInData = await checkInRes.json();
    if (checkInRes.status === 201 && checkInData.data?.event?.eventType === 'CHECK_IN') {
      console.log(' -> [PASS] Student A checked in successfully. Session Number:', checkInData.data.event.sessionNumber);
    } else {
      console.error(' -> [FAIL] Check-in failed:', checkInData);
      failed = true;
    }
    const eventAId = checkInData.data?.event?.id;

    // -------------------------------------------------------------
    // Test 2: Duplicate Check-In Prevention
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing Duplicate Check-In Prevention (same session without check-out)...');
    const dupCheckInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        studentId: studentAId,
        method: 'MANUAL',
      }),
    });
    if (dupCheckInRes.status === 409) {
      console.log(' -> [PASS] Duplicate check-in correctly rejected with HTTP 409 Conflict.');
    } else {
      console.error(' -> [FAIL] Expected 409 Conflict for duplicate check-in, got:', dupCheckInRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // Test 3: Check-out without check-in rejection (Student B)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing Check-Out rejection without active check-in (Student B)...');
    const invalidCheckOutRes = await fetch(`${BASE_URL}/api/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        studentId: studentBId,
      }),
    });
    if (invalidCheckOutRes.status === 400) {
      console.log(' -> [PASS] Check-out without check-in correctly rejected with HTTP 400 Bad Request.');
    } else {
      console.error(' -> [FAIL] Expected 400 for check-out without check-in, got:', invalidCheckOutRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // Test 4: Valid Check-Out for Student A
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing Valid Check-Out for Student A...');
    const checkOutRes = await fetch(`${BASE_URL}/api/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        studentId: studentAId,
        method: 'MANUAL',
      }),
    });
    const checkOutData = await checkOutRes.json();
    if (checkOutRes.status === 201 && checkOutData.data?.event?.eventType === 'CHECK_OUT') {
      console.log(' -> [PASS] Student A checked out successfully.');
    } else {
      console.error(' -> [FAIL] Check-out failed:', checkOutData);
      failed = true;
    }

    // -------------------------------------------------------------
    // Test 5: Valid Multiple Sessions (Session 2 Check-in)
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing Multiple Sessions on same day (Session 2 Check-in)...');
    const session2CheckInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        studentId: studentAId,
        method: 'MANUAL',
        remarks: 'Evening doubt clearing session',
      }),
    });
    const session2Data = await session2CheckInRes.json();
    if (session2CheckInRes.status === 201 && session2Data.data?.event?.sessionNumber === 2) {
      console.log(' -> [PASS] Session 2 check-in succeeded. Session Number:', session2Data.data.event.sessionNumber);
    } else {
      console.error(' -> [FAIL] Session 2 check-in failed:', session2Data);
      failed = true;
    }

    // -------------------------------------------------------------
    // Test 6: QR Pass Generation & Verification
    // -------------------------------------------------------------
    console.log('\n[Test 6] Testing QR Pass Generation & Cryptographic Verification...');
    const qrRes = await fetch(`${BASE_URL}/api/attendance/students/${studentAId}/qr`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const qrData = await qrRes.json();
    const qrToken = qrData.data?.qrToken;
    if (qrRes.status === 200 && qrToken && qrToken.startsWith('TUITION_PASS:')) {
      console.log(' -> [PASS] Signed QR pass generated:', qrToken);
    } else {
      console.error(' -> [FAIL] QR pass generation failed:', qrData);
      failed = true;
    }

    // Validate QR Scan
    const scanRes = await fetch(`${BASE_URL}/api/attendance/qr/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ qrToken }),
    });
    const scanData = await scanRes.json();
    if (scanRes.status === 200 && scanData.data?.student?.id === studentAId) {
      console.log(' -> [PASS] QR pass verified; student matched:', scanData.data.student.name);
    } else {
      console.error(' -> [FAIL] QR pass scan verification failed:', scanData);
      failed = true;
    }

    // Test Forged QR Token
    const forgedToken = `${qrToken.substring(0, qrToken.lastIndexOf(':'))}:badSignature123`;
    const forgedScanRes = await fetch(`${BASE_URL}/api/attendance/qr/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ qrToken: forgedToken }),
    });
    if (forgedScanRes.status === 400) {
      console.log(' -> [PASS] Forged QR pass rejected with HTTP 400 Bad Request.');
    } else {
      console.error(' -> [FAIL] Forged QR pass was not rejected:', forgedScanRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // Test 7: SMS Notifications Outbox & Delivery Tracking
    // -------------------------------------------------------------
    console.log('\n[Test 7] Testing SMS Notification Outbox & Mock Delivery...');
    // Give background worker brief moment to complete
    await new Promise((resolve) => setTimeout(resolve, 800));

    const notifsRes = await fetch(`${BASE_URL}/api/notifications/sms?studentId=${studentAId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const notifsData = await notifsRes.json();
    const notifs = notifsData.data?.notifications || [];
    console.log(` -> Found ${notifs.length} SMS notification records for Student A.`);
    if (notifs.length >= 2 && notifs.some((n: any) => n.status === 'SENT')) {
      console.log(' -> [PASS] SMS notifications were queued and delivered (Status: SENT).');
      console.log(' -> Message Preview:', notifs[0].messageBody);
    } else {
      console.error(' -> [FAIL] SMS notification delivery check failed:', notifsData);
      failed = true;
    }

    // -------------------------------------------------------------
    // Test 8: Attendance Summary & Reports
    // -------------------------------------------------------------
    console.log('\n[Test 8] Testing Attendance Summary & Report queries...');
    const summaryRes = await fetch(`${BASE_URL}/api/attendance/summary?batchId=${batchId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryData = await summaryRes.json();
    if (summaryRes.status === 200 && summaryData.data?.counts?.totalStudents === 2) {
      console.log(' -> [PASS] Attendance summary returned correct student counts:', summaryData.data.counts);
    } else {
      console.error(' -> [FAIL] Attendance summary failed:', summaryData);
      failed = true;
    }

    // -------------------------------------------------------------
    // Test 9: Manual Correction with Audit History
    // -------------------------------------------------------------
    console.log('\n[Test 9] Testing Manual Attendance Correction and Audit Logging...');
    const correctionRes = await fetch(`${BASE_URL}/api/attendance/${eventAId}/correction`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        isLate: false,
        remarks: 'Corrected: Transport delay excused by principal',
        reason: 'Principal approved bus delay waiver',
      }),
    });
    const correctionData = await correctionRes.json();
    if (correctionRes.status === 200 && correctionData.data?.event?.isCorrected) {
      console.log(' -> [PASS] Event corrected successfully with audit reason saved.');
    } else {
      console.error(' -> [FAIL] Event correction failed:', correctionData);
      failed = true;
    }

    // Check AuditLog in database
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        instituteId,
        action: 'ATTENDANCE_CORRECTED',
        entityId: eventAId,
      },
    });
    if (auditRecord) {
      console.log(' -> [PASS] Attendance correction audit log verified in database.');
    } else {
      console.error(' -> [FAIL] Audit log entry for attendance correction missing!');
      failed = true;
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    if (!failed) {
      console.log('\n=============================================================');
      console.log('>>> ALL PHASE 4 ATTENDANCE & SMS NOTIFICATION TESTS PASSED! <<<');
      console.log('=============================================================');
      process.exitCode = 0;
    } else {
      console.error('\n>>> SOME TESTS FAILED <<<');
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('\n[FATAL ERROR in test runner]', err.message, err.stack);
    process.exitCode = 1;
  } finally {
    server.close(async () => {
      await dbPool.end();
      await prisma.$disconnect();
    });
  }
});
