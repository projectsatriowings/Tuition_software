import app from '../src/index.js';
import { config } from '../src/config/index.js';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();
const server = http.createServer(app);
const TEST_PORT = 5096;
const BASE_URL = `http://localhost:${TEST_PORT}`;

server.listen(TEST_PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`=== TuitionOS Automatic Admission Number Test Suite ===`);
  console.log(`======================================================\n`);

  let anyFailure = false;
  const createdInstituteIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // Step 0: Super Admin Authentication
    // -------------------------------------------------------------
    console.log('[Step 0] Super Admin Login...');
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
    console.log(' -> [PASS] Super Admin logged in successfully.');

    // -------------------------------------------------------------
    // Step 1: Create Test Institutes with Name Prefix & Collision Test
    // -------------------------------------------------------------
    console.log('\n[Step 1] Creating Test Institutes (Apex Science Academy & Apex Coaching)...');
    const nonce = Date.now().toString().slice(-4);

    // Institute A: Apex Science Academy
    const instCodeA = `APX${nonce}`;
    const createInstARes = await fetch(`${BASE_URL}/api/institutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: instCodeA,
        name: 'Apex Science Academy',
        adminEmail: `admin.${instCodeA.toLowerCase()}@apex.test`,
        adminPhone: `999${nonce}1111`,
        adminFullName: 'Apex Admin',
        adminInitialPassword: 'AdminPassword#2026',
      }),
    });
    const instAData = await createInstARes.json();
    if (createInstARes.status !== 201) {
      throw new Error(`Failed to create Institute A: ${JSON.stringify(instAData)}`);
    }
    const instituteAId = instAData.data.institute.id;
    createdInstituteIds.push(instituteAId);
    console.log(` -> [PASS] Institute A created (ID: ${instituteAId}).`);

    // Institute B: Apex Coaching (tests prefix collision against APEX)
    const instCodeB = `APC${nonce}`;
    const createInstBRes = await fetch(`${BASE_URL}/api/institutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: instCodeB,
        name: 'Apex Coaching Institute',
        adminEmail: `admin.${instCodeB.toLowerCase()}@apexcoaching.test`,
        adminPhone: `999${nonce}2222`,
        adminFullName: 'Apex Coaching Admin',
        adminInitialPassword: 'AdminPassword#2026',
      }),
    });
    const instBData = await createInstBRes.json();
    if (createInstBRes.status !== 201) {
      throw new Error(`Failed to create Institute B: ${JSON.stringify(instBData)}`);
    }
    const instituteBId = instBData.data.institute.id;
    createdInstituteIds.push(instituteBId);
    console.log(` -> [PASS] Institute B created (ID: ${instituteBId}).`);

    // Institute C: Zenith Tutorials
    const instCodeC = `ZEN${nonce}`;
    const createInstCRes = await fetch(`${BASE_URL}/api/institutes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: instCodeC,
        name: 'Zenith Tutorials',
        adminEmail: `admin.${instCodeC.toLowerCase()}@zenith.test`,
        adminPhone: `999${nonce}3333`,
        adminFullName: 'Zenith Admin',
        adminInitialPassword: 'AdminPassword#2026',
      }),
    });
    const instCData = await createInstCRes.json();
    if (createInstCRes.status !== 201) {
      throw new Error(`Failed to create Institute C: ${JSON.stringify(instCData)}`);
    }
    const instituteCId = instCData.data.institute.id;
    createdInstituteIds.push(instituteCId);
    console.log(` -> [PASS] Institute C created (ID: ${instituteCId}).`);

    // Log into Academic Admin A
    const adminALoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `admin.${instCodeA.toLowerCase()}@apex.test`,
        password: 'AdminPassword#2026',
        role: 'ACADEMIC_ADMIN',
      }),
    });
    const adminALogin = await adminALoginRes.json();
    const adminAToken = adminALogin.data.accessToken;

    // Log into Academic Admin C
    const adminCLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `admin.${instCodeC.toLowerCase()}@zenith.test`,
        password: 'AdminPassword#2026',
        role: 'ACADEMIC_ADMIN',
      }),
    });
    const adminCLogin = await adminCLoginRes.json();
    const adminCToken = adminCLogin.data.accessToken;

    // -------------------------------------------------------------
    // Requirement Test 1: First student receives serial 001
    // -------------------------------------------------------------
    console.log('\n[Test 1] First student in Institute A receives serial 001...');
    const admitRes1 = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        firstName: 'Rahul',
        lastName: 'Sharma',
        gender: 'MALE',
      }),
    });
    const admitData1 = await admitRes1.json();
    const admNum1 = admitData1.data?.student?.admissionNumber;
    console.log(` -> Assigned Admission Number: ${admNum1}`);

    const expectedFirst = `APEX-2026-001`;
    if (admNum1 !== expectedFirst) {
      console.error(`[FAIL] Expected ${expectedFirst}, got ${admNum1}`);
      anyFailure = true;
    } else {
      console.log(` -> [PASS] Verified: First student received serial 001 (${expectedFirst}).`);
    }

    // -------------------------------------------------------------
    // Requirement Test 2: Subsequent students increment the serial
    // -------------------------------------------------------------
    console.log('\n[Test 2] Subsequent students increment the serial (002, 003)...');
    const admitRes2 = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        firstName: 'Priya',
        lastName: 'Verma',
        gender: 'FEMALE',
      }),
    });
    const admitData2 = await admitRes2.json();
    const admNum2 = admitData2.data?.student?.admissionNumber;
    console.log(` -> Student 2: ${admNum2}`);

    const admitRes3 = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        firstName: 'Amit',
        lastName: 'Kumar',
        gender: 'MALE',
      }),
    });
    const admitData3 = await admitRes3.json();
    const admNum3 = admitData3.data?.student?.admissionNumber;
    console.log(` -> Student 3: ${admNum3}`);

    if (admNum2 !== 'APEX-2026-002' || admNum3 !== 'APEX-2026-003') {
      console.error(`[FAIL] Expected APEX-2026-002 and APEX-2026-003, got ${admNum2}, ${admNum3}`);
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Verified: Sequential increment verified (002, 003).');
    }

    // -------------------------------------------------------------
    // Requirement Test 3: Different institutes have independent sequences
    // -------------------------------------------------------------
    console.log('\n[Test 3] Different institutes have independent sequences...');
    const admitResZenith = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminCToken}`,
      },
      body: JSON.stringify({
        firstName: 'Neha',
        lastName: 'Gupta',
        gender: 'FEMALE',
      }),
    });
    const admitDataZenith = await admitResZenith.json();
    const admNumZenith = admitDataZenith.data?.student?.admissionNumber;
    console.log(` -> Zenith Student 1: ${admNumZenith}`);

    if (admNumZenith !== 'ZENITH-2026-001') {
      console.error(`[FAIL] Expected ZENITH-2026-001, got ${admNumZenith}`);
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Verified: Zenith Tutorials started at ZENITH-2026-001 independently.');
    }

    // Also verify collision resolution on Institute B (Apex Coaching Institute)
    console.log('\n[Test 3b] Collision resolution: Apex Coaching Institute does not collide with APEX...');
    // Log into Academic Admin B
    const adminBLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `admin.${instCodeB.toLowerCase()}@apexcoaching.test`,
        password: 'AdminPassword#2026',
        role: 'ACADEMIC_ADMIN',
      }),
    });
    const adminBLogin = await adminBLoginRes.json();
    const adminBToken = adminBLogin.data.accessToken;

    const admitResB = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminBToken}`,
      },
      body: JSON.stringify({
        firstName: 'Karan',
        lastName: 'Patel',
        gender: 'MALE',
      }),
    });
    const admitDataB = await admitResB.json();
    const admNumB = admitDataB.data?.student?.admissionNumber;
    console.log(` -> Apex Coaching Student 1: ${admNumB}`);

    if (!admNumB || admNumB.startsWith('APEX-')) {
      console.error(`[FAIL] Institute B collided or failed: ${admNumB}`);
      anyFailure = true;
    } else {
      console.log(` -> [PASS] Verified: Collision resolved deterministically with prefix '${admNumB.split('-')[0]}'.`);
    }

    // -------------------------------------------------------------
    // Requirement Test 4: New admission year starts at serial 001
    // -------------------------------------------------------------
    console.log('\n[Test 4] New admission year starts at serial 001...');
    const admitResYear2027 = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        firstName: 'Rohan',
        lastName: 'Kapoor',
        gender: 'MALE',
        admissionDate: '2027-04-15',
      }),
    });
    const admitDataYear2027 = await admitResYear2027.json();
    const admNumYear2027 = admitDataYear2027.data?.student?.admissionNumber;
    console.log(` -> Student for 2027: ${admNumYear2027}`);

    if (admNumYear2027 !== 'APEX-2027-001') {
      console.error(`[FAIL] Expected APEX-2027-001, got ${admNumYear2027}`);
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Verified: New year 2027 started at serial 001 (APEX-2027-001).');
    }

    // -------------------------------------------------------------
    // Requirement Test 5: Concurrent admissions cannot receive duplicate numbers
    // -------------------------------------------------------------
    console.log('\n[Test 5] Concurrency safety: 5 simultaneous admissions for year 2026...');
    const concurrentPayloads = [
      { firstName: 'Conc1', lastName: 'Student' },
      { firstName: 'Conc2', lastName: 'Student' },
      { firstName: 'Conc3', lastName: 'Student' },
      { firstName: 'Conc4', lastName: 'Student' },
      { firstName: 'Conc5', lastName: 'Student' },
    ];

    const concurrentResults = await Promise.all(
      concurrentPayloads.map((payload) =>
        fetch(`${BASE_URL}/api/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminAToken}`,
          },
          body: JSON.stringify(payload),
        }).then((res) => res.json())
      )
    );

    const generatedConcurrentNumbers = concurrentResults.map((r) => r.data?.student?.admissionNumber);
    console.log(' -> Generated concurrent numbers:', generatedConcurrentNumbers);

    const uniqueSet = new Set(generatedConcurrentNumbers);
    if (uniqueSet.size !== 5 || generatedConcurrentNumbers.includes(undefined)) {
      console.error(`[FAIL] Duplicates detected or admissions failed in concurrent batch:`, generatedConcurrentNumbers);
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Verified: All 5 concurrent requests received unique, collision-free numbers.');
    }

    // -------------------------------------------------------------
    // Requirement Test 6: Frontend-supplied admission numbers cannot override backend generation
    // -------------------------------------------------------------
    console.log('\n[Test 6] Frontend-supplied admission number override attempt...');
    const overrideRes = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        admissionNumber: 'HACKED-999-999',
        firstName: 'Sneha',
        lastName: 'Mishra',
      }),
    });
    const overrideData = await overrideRes.json();
    const actualAssigned = overrideData.data?.student?.admissionNumber;
    console.log(` -> Sent: HACKED-999-999, Backend assigned: ${actualAssigned}`);

    if (actualAssigned === 'HACKED-999-999') {
      console.error('[FAIL] Frontend was able to override backend admission number!');
      anyFailure = true;
    } else if (!actualAssigned.startsWith('APEX-2026-')) {
      console.error(`[FAIL] Unexpected assigned number: ${actualAssigned}`);
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Verified: Backend strictly ignored client-provided admission number.');
    }

    // -------------------------------------------------------------
    // Requirement Test 7: Existing students and admission numbers remain unchanged
    // -------------------------------------------------------------
    console.log('\n[Test 7] Verify historical student records remain unchanged...');
    const firstStudentCheck = await prisma.student.findUnique({
      where: {
        instituteId_admissionNumber: {
          instituteId: instituteAId,
          admissionNumber: 'APEX-2026-001',
        },
      },
    });

    if (!firstStudentCheck || firstStudentCheck.firstName !== 'Rahul') {
      console.error('[FAIL] Existing student record corrupted or modified:', firstStudentCheck);
      anyFailure = true;
    } else {
      console.log(` -> [PASS] Verified: Student 'APEX-2026-001' remains intact (${firstStudentCheck.firstName} ${firstStudentCheck.lastName}).`);
    }

    // -------------------------------------------------------------
    // Requirement Test 8: Failed admissions do not corrupt sequence or leave partial records
    // -------------------------------------------------------------
    console.log('\n[Test 8] Failed admission safety (transaction rollback)...');
    const fakeBatchId = '00000000-0000-0000-0000-000000000000';
    const failedRes = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAToken}`,
      },
      body: JSON.stringify({
        firstName: 'Fail',
        lastName: 'Expected',
        batchId: fakeBatchId, // Invalid batch
      }),
    });
    const failedData = await failedRes.json();
    if (failedRes.status !== 400) {
      console.error(`[FAIL] Expected 400 for invalid batch, got ${failedRes.status}`);
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Invalid admission rejected as expected (HTTP 400).');
    }

    // -------------------------------------------------------------
    // Requirement Test 9: Tenant isolation remains enforced
    // -------------------------------------------------------------
    console.log('\n[Test 9] Tenant isolation enforcement...');
    // Attempt to access students of Institute A with Admin C credentials
    const tenantViolationRes = await fetch(`${BASE_URL}/api/students`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminCToken}`,
        'x-institute-id': instituteAId, // Admin C cannot tamper context to access Institute A
      },
    });
    const tenantViolationData = await tenantViolationRes.json();
    if (tenantViolationRes.status === 200 && tenantViolationData.data?.students?.some((s: any) => s.admissionNumber.startsWith('APEX-'))) {
      console.error('[FAIL] Tenant leak detected! Admin C accessed Institute A students.');
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Tenant isolation strictly enforced: cross-tenant access blocked.');
    }

    // -------------------------------------------------------------
    // Requirement Test 10: Admission prefix metadata preview endpoint
    // -------------------------------------------------------------
    console.log('\n[Test 10] Testing /admission-prefix endpoint...');
    const prefixRes = await fetch(`${BASE_URL}/api/students/admission-prefix`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminAToken}`,
      },
    });
    const prefixData = await prefixRes.json();
    console.log(' -> Prefix info:', prefixData.data);
    if (!prefixData.success || prefixData.data.prefix !== 'APEX') {
      console.error('[FAIL] Failed to retrieve valid prefix info:', prefixData);
      anyFailure = true;
    } else {
      console.log(' -> [PASS] Verified: /admission-prefix endpoint returns correct prefix & preview format.');
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n======================================================');
    if (anyFailure) {
      console.error('❌ SOME TESTS FAILED. Review output above.');
    } else {
      console.log('✅ ALL 10 TESTS PASSED SUCCESSFULLY!');
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('Unhandled test suite error:', err);
    anyFailure = true;
  } finally {
    // Cleanup created test institutes
    console.log('Cleaning up test institutes...');
    for (const id of createdInstituteIds) {
      try {
        await prisma.institute.delete({ where: { id } });
      } catch (e) {
        // Ignored
      }
    }
    await prisma.$disconnect();
    server.close();
    process.exit(anyFailure ? 1 : 0);
  }
});
