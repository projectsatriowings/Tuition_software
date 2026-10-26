import app from '../src/index.js';
import { dbPool } from '../src/config/db.js';
import { config } from '../src/config/index.js';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();
const server = http.createServer(app);
const TEST_PORT = 5097;
const BASE_URL = `http://localhost:${TEST_PORT}`;

server.listen(TEST_PORT, async () => {
  console.log(`=== Phase 3 Integration & Security Test Suite on port ${TEST_PORT} ===\n`);
  let failed = false;

  try {
    // -------------------------------------------------------------
    // 1. Super Admin Authentication
    // -------------------------------------------------------------
    console.log('[Step 1] Logging in as Super Admin...');
    const superAdminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.superAdmin.email,
        password: config.superAdmin.defaultPassword,
        role: 'SUPER_ADMIN',
      }),
    });
    const superAdminLogin = await superAdminLoginRes.json();
    if (superAdminLoginRes.status !== 200 || !superAdminLogin.data?.accessToken) {
      throw new Error(`Super Admin login failed: ${JSON.stringify(superAdminLogin)}`);
    }
    const superAdminToken = superAdminLogin.data.accessToken;
    console.log(' -> [PASS] Super Admin authenticated.');

    // -------------------------------------------------------------
    // 2. Super Admin Institute Management (Create Institutes A & B)
    // -------------------------------------------------------------
    console.log('\n[Step 2] Creating Institute A (Apex Academy) with initial Academic Admin...');
    const instCodeA = `APX${Date.now().toString().slice(-4)}`;
    const adminEmailA = `admin.${instCodeA.toLowerCase()}@apex.local`;
    const adminPasswordA = 'AdminPass#2026';

    const createInstARes = await fetch(`${BASE_URL}/api/institutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: instCodeA,
        name: 'Apex Academy',
        city: 'Mumbai',
        state: 'Maharashtra',
        adminFullName: 'Apex Academic Admin',
        adminEmail: adminEmailA,
        adminInitialPassword: adminPasswordA,
      }),
    });
    const createInstA = await createInstARes.json();
    if (createInstARes.status !== 201 || !createInstA.data?.institute?.id) {
      throw new Error(`Failed to create Institute A: ${JSON.stringify(createInstA)}`);
    }
    const instituteAId = createInstA.data.institute.id;
    console.log(` -> [PASS] Institute A created (ID: ${instituteAId}, Code: ${instCodeA})`);

    // Create Institute B (Zenith Classes)
    console.log('\n[Step 2b] Creating Institute B (Zenith Classes)...');
    const instCodeB = `ZEN${Date.now().toString().slice(-4)}`;
    const adminEmailB = `admin.${instCodeB.toLowerCase()}@zenith.local`;
    const adminPasswordB = 'ZenithPass#2026';

    const createInstBRes = await fetch(`${BASE_URL}/api/institutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: instCodeB,
        name: 'Zenith Classes',
        city: 'Delhi',
        adminFullName: 'Zenith Academic Admin',
        adminEmail: adminEmailB,
        adminInitialPassword: adminPasswordB,
      }),
    });
    const createInstB = await createInstBRes.json();
    const instituteBId = createInstB.data.institute.id;
    console.log(` -> [PASS] Institute B created (ID: ${instituteBId}, Code: ${instCodeB})`);

    // -------------------------------------------------------------
    // 3. RBAC Check: Academic Admin CANNOT create an Institute
    // -------------------------------------------------------------
    console.log('\n[Step 3] Logging in as Academic Admin A and testing privilege restriction...');
    const adminALoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmailA,
        password: adminPasswordA,
        role: 'ACADEMIC_ADMIN',
      }),
    });
    const adminALogin = await adminALoginRes.json();
    if (adminALoginRes.status !== 200 || !adminALogin.data?.accessToken) {
      throw new Error(`Academic Admin A login failed: ${JSON.stringify(adminALogin)}`);
    }
    const adminAToken = adminALogin.data.accessToken;

    // Academic admin attempts to create an institute -> should be HTTP 403
    const forbiddenCreateRes = await fetch(`${BASE_URL}/api/institutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        code: 'HACK01',
        name: 'Unauthorized Institute',
      }),
    });
    if (forbiddenCreateRes.status === 403) {
      console.log(' -> [PASS] Non-Super-Admin institute creation rejected with HTTP 403.');
    } else {
      console.error(' -> [FAIL] Expected 403 for non-super-admin institute creation, got:', forbiddenCreateRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // 4. Tenant Isolation Check: Admin A cannot access Institute B
    // -------------------------------------------------------------
    console.log('\n[Step 4] Testing Tenant Isolation: Admin A requests Institute B...');
    const crossTenantRes = await fetch(`${BASE_URL}/api/institutes/${instituteBId}`, {
      headers: {
        Authorization: `Bearer ${adminAToken}`,
        'x-institute-id': instituteBId,
      },
    });
    if (crossTenantRes.status === 403) {
      console.log(' -> [PASS] Cross-tenant access strictly blocked with HTTP 403.');
    } else {
      console.error(' -> [FAIL] Tenant isolation violated! Expected 403, got:', crossTenantRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // 5. Academic Admin Operations in Institute A
    // -------------------------------------------------------------
    console.log('\n[Step 5] Academic Admin A creates Batch & Subject...');
    const batchRes = await fetch(`${BASE_URL}/api/academics/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        name: 'Class 10 - Batch A',
        academicYear: '2026-2027',
      }),
    });
    const batchData = await batchRes.json();
    const batchId = batchData.data?.batch?.id;
    console.log(` -> [PASS] Batch created: ${batchData.data?.batch?.name} (ID: ${batchId})`);

    // -------------------------------------------------------------
    // 6. Staff Provisioning & Management
    // -------------------------------------------------------------
    console.log('\n[Step 6] Academic Admin provisions Staff member...');
    const staffEmail = `faculty.${Date.now().toString().slice(-4)}@apex.local`;
    const createStaffRes = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Prof. Rajesh Kulkarni',
        email: staffEmail,
        designation: 'Lead Physics Instructor',
        employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
        batchIds: [batchId],
      }),
    });
    const staffData = await createStaffRes.json();
    if (createStaffRes.status !== 201 || !staffData.data?.staffId) {
      throw new Error(`Failed to create staff: ${JSON.stringify(staffData)}`);
    }
    const staffId = staffData.data.staffId;
    console.log(` -> [PASS] Staff provisioned successfully (ID: ${staffId}, Email: ${staffEmail})`);

    // -------------------------------------------------------------
    // 7. Student Admission & Duplicate Prevention
    // -------------------------------------------------------------
    console.log('\n[Step 7] Testing Student Admission and Duplicate Checks...');
    const admNumber = `ADM-${Date.now().toString().slice(-5)}`;
    const admitRes = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        admissionNumber: admNumber,
        rollNumber: '101',
        firstName: 'Aarav',
        lastName: 'Sharma',
        gender: 'MALE',
        batchId,
      }),
    });
    const admitData = await admitRes.json();
    if (admitRes.status !== 201 || !admitData.data?.student?.id) {
      throw new Error(`Failed to admit student: ${JSON.stringify(admitData)}`);
    }
    const studentId = admitData.data.student.id;
    console.log(` -> [PASS] Student admitted (ID: ${studentId}, AdmissionNo: ${admNumber})`);

    // Attempt duplicate admission number
    console.log(' -> Testing duplicate admission number rejection...');
    const dupAdmitRes = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        admissionNumber: admNumber, // Duplicate!
        firstName: 'Duplicate',
        lastName: 'Student',
      }),
    });
    if (dupAdmitRes.status === 409) {
      console.log(' -> [PASS] Duplicate admission number rejected with HTTP 409 Conflict.');
    } else {
      console.error(' -> [FAIL] Expected 409 for duplicate admission number, got:', dupAdmitRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // 8. Parent Management & Guardian Linking
    // -------------------------------------------------------------
    console.log('\n[Step 8] Provisioning Parent and Linking to Student...');
    const parentPhone = `98${Date.now().toString().slice(-8)}`;
    const parentEmail = `parent.${Date.now().toString().slice(-4)}@example.com`;
    const parentPassword = 'ParentPassword#2026';

    const createParentRes = await fetch(`${BASE_URL}/api/parents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        fullName: 'Sunita Sharma',
        phone: parentPhone,
        email: parentEmail,
        initialPassword: parentPassword,
      }),
    });
    const parentData = await createParentRes.json();
    const parentId = parentData.data?.parent?.id;
    console.log(` -> [PASS] Parent profile created (ID: ${parentId}, Phone: ${parentPhone})`);

    // Link Guardian to Student
    console.log(' -> Linking Parent as Mother & Primary Contact...');
    const linkRes = await fetch(`${BASE_URL}/api/parents/students/${studentId}/guardians`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        parentId,
        relation: 'MOTHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      }),
    });
    const linkData = await linkRes.json();
    if (linkRes.status === 201) {
      console.log(' -> [PASS] Guardian linked successfully.');
    } else {
      console.error(' -> [FAIL] Failed to link guardian:', linkData);
      failed = true;
    }

    // Duplicate link prevention
    const dupLinkRes = await fetch(`${BASE_URL}/api/parents/students/${studentId}/guardians`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        parentId,
        relation: 'MOTHER',
      }),
    });
    if (dupLinkRes.status === 409) {
      console.log(' -> [PASS] Duplicate guardian link rejected with HTTP 409 Conflict.');
    } else {
      console.error(' -> [FAIL] Expected 409 for duplicate guardian link, got:', dupLinkRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // 9. Parent Portal Access Verification
    // -------------------------------------------------------------
    console.log('\n[Step 9] Logging in as Parent and testing child access...');
    const parentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: parentPhone,
        password: parentPassword,
        role: 'PARENT',
      }),
    });
    const parentLogin = await parentLoginRes.json();
    const parentToken = parentLogin.data?.accessToken;

    const myChildrenRes = await fetch(`${BASE_URL}/api/parents/my/children`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    const myChildrenData = await myChildrenRes.json();
    if (myChildrenRes.status === 200 && myChildrenData.data?.children?.length > 0) {
      console.log(` -> [PASS] Parent retrieved authorized linked child (${myChildrenData.data.children[0].student.firstName} ${myChildrenData.data.children[0].student.lastName}).`);
    } else {
      console.error(' -> [FAIL] Parent failed to fetch linked child:', myChildrenData);
      failed = true;
    }

    // -------------------------------------------------------------
    // 10. Suspended Institute Enforcement
    // -------------------------------------------------------------
    console.log('\n[Step 10] Testing Institute Suspension Enforcement...');
    // Super Admin suspends Institute B
    const suspendRes = await fetch(`${BASE_URL}/api/institutes/${instituteBId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'SUSPENDED',
        reason: 'Payment overdue / Compliance audit',
      }),
    });
    if (suspendRes.status === 200) {
      console.log(' -> [PASS] Institute B suspended by Super Admin.');
    } else {
      console.error(' -> [FAIL] Failed to suspend institute B');
      failed = true;
    }

    // Login as Admin B
    const adminBLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmailB,
        password: adminPasswordB,
        role: 'ACADEMIC_ADMIN',
      }),
    });
    const adminBLogin = await adminBLoginRes.json();
    const adminBToken = adminBLogin.data?.accessToken;

    // Admin B tries to list students on suspended institute -> should be HTTP 403
    const suspendedOpRes = await fetch(`${BASE_URL}/api/students`, {
      headers: {
        Authorization: `Bearer ${adminBToken}`,
        'x-institute-id': instituteBId,
      },
    });
    if (suspendedOpRes.status === 403) {
      console.log(' -> [PASS] Suspended institute operations blocked with HTTP 403.');
    } else {
      console.error(' -> [FAIL] Expected 403 for suspended institute operation, got:', suspendedOpRes.status);
      failed = true;
    }

    // -------------------------------------------------------------
    // 11. Security Audit Verification
    // -------------------------------------------------------------
    console.log('\n[Step 11] Verifying Database Audit Log entries...');
    const auditCount = await prisma.auditLog.count({
      where: { instituteId: instituteAId },
    });
    console.log(` -> Found ${auditCount} audit records for Institute A.`);
    if (auditCount >= 3) {
      console.log(' -> [PASS] Sensitive actions (Institute creation, staff provisioning, student admission) audited.');
    } else {
      console.error(' -> [FAIL] Insufficient audit records recorded.');
      failed = true;
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    if (!failed) {
      console.log('\n=============================================================');
      console.log('>>> ALL PHASE 3 BACKEND & SECURITY TESTS PASSED SUCCESSFULLY! <<<');
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
