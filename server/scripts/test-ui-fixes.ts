import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import app from '../src/index.js';

const prisma = new PrismaClient();
const TEST_PORT = 5098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, name: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    console.error(`  ✗ [FAIL] ${name}`, details ? details : '');
    throw new Error(`Test failed: ${name}`);
  }
}

async function request(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, data };
}

async function runUiFixesTestSuite() {
  console.log(`\n========================================================================`);
  console.log(`=== UI Fixes & Institute Code Generation Test Suite (Port ${TEST_PORT}) ===`);
  console.log(`========================================================================\n`);

  let server: http.Server | null = null;

  try {
    // Start local test server on port 5098
    server = app.listen(TEST_PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // -------------------------------------------------------------
    // PART A: Frontend Source Code Invariants & Contract Verification
    // -------------------------------------------------------------
    console.log('[Part A] Verifying Frontend Source Code Invariants');

    const loginFilePath = path.resolve(process.cwd(), '../apps/web/src/pages/Login.tsx');
    assert(fs.existsSync(loginFilePath), 'Login.tsx exists in web app');
    const loginCode = fs.readFileSync(loginFilePath, 'utf-8');

    // 1. Login email/username and password fields start empty
    assert(
      loginCode.includes("const [identifier, setIdentifier] = useState('');"),
      'Login identifier state initializes to empty string'
    );
    assert(
      loginCode.includes("const [password, setPassword] = useState('');"),
      'Login password state initializes to empty string'
    );

    // 2. Institute Code is absent from the login UI
    assert(
      !loginCode.includes('Institute Code (Optional if single-membership)'),
      'Institute Code input label is absent from Login.tsx'
    );
    assert(
      !loginCode.includes('setInstituteCode'),
      'setInstituteCode is absent from Login.tsx'
    );

    // 3. Demo cards click populates credentials without auto-submitting
    assert(
      loginCode.includes('handleSelectDemo'),
      'Demo selector function exists'
    );
    assert(
      loginCode.includes("setIdentifier(demo.identifier)") &&
      loginCode.includes("setPassword(demo.password)") &&
      !loginCode.includes("handleSelectDemo = (demo) => { handleSubmit"),
      'Demo selection populates state without triggering form submission'
    );

    // 4. Credential-help link & modal
    assert(
      loginCode.includes('Need login credentials?'),
      '"Need login credentials?" link is present in Login.tsx'
    );
    assert(
      loginCode.includes('setShowHelpModal(true)'),
      'Credential guidance modal trigger is present'
    );
    assert(
      loginCode.includes('Contact the institute\'s authorized administrator') &&
      loginCode.includes('Contact your institute\'s Academic Admin') &&
      loginCode.includes('register or verify your parent account') &&
      loginCode.includes('activate your student login') &&
      loginCode.includes('Super Admin account provisioning'),
      'Credential guidance covers Academic Admin, Staff, Parent, Student, and Super Admin'
    );

    // SuperAdminDashboard.tsx verification
    const dashboardFilePath = path.resolve(process.cwd(), '../apps/web/src/pages/SuperAdminDashboard.tsx');
    assert(fs.existsSync(dashboardFilePath), 'SuperAdminDashboard.tsx exists in web app');
    const dashboardCode = fs.readFileSync(dashboardFilePath, 'utf-8');

    // 5. All institute creation fields start empty
    assert(
      dashboardCode.includes("name: ''") &&
      dashboardCode.includes("city: ''") &&
      dashboardCode.includes("state: ''") &&
      dashboardCode.includes("adminFullName: ''") &&
      dashboardCode.includes("adminEmail: ''") &&
      dashboardCode.includes("adminInitialPassword: ''"),
      'Institute creation form state initializes with empty values'
    );

    // 6. Manual institute-code input is absent
    assert(
      !dashboardCode.includes('label className="block text-xs font-medium text-slate-300 mb-1">Code (Unique)*</label>'),
      'Manual Code (Unique) input label is absent from modal'
    );
    assert(
      dashboardCode.includes('placeholder="Enter institute name"') &&
      dashboardCode.includes('placeholder="Enter city"') &&
      dashboardCode.includes('placeholder="Enter state"') &&
      dashboardCode.includes('placeholder="Enter admin full name"') &&
      dashboardCode.includes('placeholder="Enter admin email"') &&
      dashboardCode.includes('placeholder="Create a secure initial password"'),
      'Correct non-prefilled placeholders used for all creation fields'
    );

    // 7. Success modal with Copy button for generated code
    assert(
      dashboardCode.includes('createdInstitute') &&
      dashboardCode.includes('Generated Institute Code') &&
      dashboardCode.includes('navigator.clipboard.writeText(createdInstitute.code)'),
      'Success modal with Copy Code button is present in SuperAdminDashboard.tsx'
    );

    // -------------------------------------------------------------
    // PART B: Backend API & Auto-Generation Integration Tests
    // -------------------------------------------------------------
    console.log('\n[Part B] Verifying Backend Auto-Generation & Authentication');

    // Login as Super Admin
    const superAdminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@platform.local',
        password: 'AdminSecurePassword#2026',
        role: 'SUPER_ADMIN',
      },
    });
    assert(superAdminLogin.status === 200, 'Super Admin logs in successfully');
    const superToken = superAdminLogin.data.data.accessToken;
    const superHeaders = { Authorization: `Bearer ${superToken}` };

    // Test 7: Backend generates and persists a unique institute code without frontend sending code
    const uniqueNonce1 = Date.now().toString(36);
    const instName1 = `AutoCode Institute Alpha ${uniqueNonce1}`;
    const adminEmail1 = `director1_${uniqueNonce1}@autocode.internal`;

    const createRes1 = await request('/institutes', {
      method: 'POST',
      headers: superHeaders,
      body: {
        name: instName1,
        city: 'Pune',
        state: 'Maharashtra',
        adminFullName: 'Director Alpha',
        adminEmail: adminEmail1,
        adminInitialPassword: 'InitialAdminPass#2026',
      },
    });

    assert(createRes1.status === 201, 'Institute created without manual code (HTTP 201 Created)', createRes1.data);
    const code1 = createRes1.data.data?.institute?.code;
    assert(!!code1, 'Generated institute code is present in response');
    assert(code1.startsWith('INS-'), `Code matches prefix 'INS-' (got: ${code1})`);
    assert(/^INS-[A-Z0-9]{4,10}$/.test(code1), `Code has valid alphanumeric uppercase pattern (${code1})`);

    // Verify persistence in DB
    const persistedInst1 = await prisma.institute.findUnique({ where: { code: code1 } });
    assert(!!persistedInst1 && persistedInst1.name === instName1, 'Generated code is persisted in PostgreSQL');

    // Test 8: Two institute creations do not produce duplicate codes
    const uniqueNonce2 = (Date.now() + 10).toString(36);
    const instName2 = `AutoCode Institute Beta ${uniqueNonce2}`;
    const adminEmail2 = `director2_${uniqueNonce2}@autocode.internal`;

    const createRes2 = await request('/institutes', {
      method: 'POST',
      headers: superHeaders,
      body: {
        name: instName2,
        city: 'Bangalore',
        state: 'Karnataka',
        adminFullName: 'Director Beta',
        adminEmail: adminEmail2,
        adminInitialPassword: 'InitialAdminPass#2026',
      },
    });

    assert(createRes2.status === 201, 'Second institute created without manual code');
    const code2 = createRes2.data.data?.institute?.code;
    assert(!!code2, 'Second generated institute code present');
    assert(code1 !== code2, `Codes are strictly distinct (${code1} !== ${code2})`);

    // Test 9: Only SUPER_ADMIN can create institutes
    // Academic Admin logs in
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: adminEmail1,
        password: 'InitialAdminPass#2026',
        role: 'ACADEMIC_ADMIN',
      },
    });
    assert(adminLogin.status === 200, 'Academic Admin logs in WITHOUT manual institute code');
    assert(adminLogin.data.data.institute.code === code1, 'Resolved institute code matches generated code');
    const adminToken = adminLogin.data.data.accessToken;

    const forbiddenCreate = await request('/institutes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Unauthorized Institute',
      },
    });
    assert(forbiddenCreate.status === 403, 'Academic Admin is forbidden from creating institutes (HTTP 403)');

    // Test 10: Institute and initial Academic Admin creation remain atomic
    // Attempt to create institute with already existing admin email
    const failedCreate = await request('/institutes', {
      method: 'POST',
      headers: superHeaders,
      body: {
        name: 'Collision Institute',
        adminEmail: adminEmail1, // Duplicate email
        adminInitialPassword: 'AnotherPassword#2026',
      },
    });
    assert(failedCreate.status === 409 || failedCreate.status === 400, 'Creation with duplicate admin email fails cleanly');
    const collisionCheck = await prisma.institute.findFirst({ where: { name: 'Collision Institute' } });
    assert(!collisionCheck, 'Database transaction rolled back atomically without orphaned institute');

    // Test 11: Authentication compatibility - login without institute code
    const studentLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'student@apexacademy.com',
        password: 'Password#123',
        role: 'STUDENT',
      },
    });
    assert(studentLogin.status === 200, 'Student logs in without institute code');
    assert(studentLogin.data.data.user.role === 'STUDENT', 'Student role verified');

    // Invalid password rejected
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'student@apexacademy.com',
        password: 'WrongPassword#999',
        role: 'STUDENT',
      },
    });
    assert(badLogin.status === 401, 'Invalid credentials rejected with HTTP 401');

    console.log(`\n========================================================================`);
    console.log(`=== UI FIXES TEST SUMMARY: ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY (100%) ===`);
    console.log(`========================================================================\n`);

  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runUiFixesTestSuite().catch((err) => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
