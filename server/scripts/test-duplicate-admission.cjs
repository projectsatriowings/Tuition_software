require('dotenv').config({ path: 'server/.env' });
const http = require('node:http');

const API_BASE = 'http://localhost:5001/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
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

async function run() {
  console.log('--- TEST 1: Admin Login ---');
  // Login as admin
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      identifier: 'admin@apex.example.com',
      password: 'Password#123',
    },
  });

  if (!loginRes.data?.success || !loginRes.data?.data?.accessToken) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginRes.data));
  }
  console.log('Login res data:', JSON.stringify(loginRes.data.data));
  const user = loginRes.data.data.user;
  const token = loginRes.data.data.accessToken;
  const instituteId = user.instituteId || loginRes.data.data.institutes?.[0]?.id || loginRes.data.data.institute?.id || loginRes.data.data.memberships?.[0]?.instituteId;
  console.log('Logged in as admin, instituteId:', instituteId);

  const authHeaders = {
    'x-institute-id': instituteId,
  };

  console.log('\n--- TEST 2: Admit a Genuinely New Student ---');
  const uniqueSuffix = Date.now().toString().slice(-6);
  const newStudentPayload = {
    firstName: `TestAarav_${uniqueSuffix}`,
    lastName: 'Kumar',
    gender: 'MALE',
    parentFullName: 'Rajesh Kumar',
    parentRelationship: 'FATHER',
    parentPhone: `9876${uniqueSuffix}`,
    parentInitialPassword: 'ParentPassword123#',
  };

  const admit1 = await request('/students', {
    method: 'POST',
    token,
    headers: authHeaders,
    body: newStudentPayload,
  });

  console.log('Admit 1 Status:', admit1.status);
  console.log('Admit 1 Message:', admit1.data?.message);
  console.log('Admit 1 AdmissionNumber:', admit1.data?.data?.admissionNumber);

  if (admit1.status !== 201) {
    throw new Error('Failed to admit new student: ' + JSON.stringify(admit1.data));
  }

  console.log('\n--- TEST 3: Attempt to Admit the EXACT SAME Student Again ---');
  const admitDuplicate = await request('/students', {
    method: 'POST',
    token,
    headers: authHeaders,
    body: newStudentPayload,
  });

  console.log('Duplicate Admit Status:', admitDuplicate.status);
  console.log('Duplicate Admit Error:', admitDuplicate.data?.error);
  console.log('IsExistingStudent flag:', admitDuplicate.data?.isExistingStudent);

  if (admitDuplicate.status === 409 && admitDuplicate.data?.error === 'Student already exists. Please check the existing student record.') {
    console.log('✓ PASS: Duplicate student admission successfully blocked with exact expected error message!');
  } else {
    throw new Error('FAIL: Duplicate admission check did not return expected 409 or message. Got: ' + JSON.stringify(admitDuplicate));
  }

  console.log('\n--- TEST 4: Admit Different Student with Different Parent ---');
  const diffParentSuffix = (Date.now() + 1).toString().slice(-6);
  const diffStudentPayload = {
    firstName: `TestDiya_${diffParentSuffix}`,
    lastName: 'Patel',
    gender: 'FEMALE',
    parentFullName: 'Suresh Patel',
    parentRelationship: 'FATHER',
    parentPhone: `9877${diffParentSuffix}`,
    parentInitialPassword: 'ParentPassword123#',
  };

  const admit2 = await request('/students', {
    method: 'POST',
    token,
    headers: authHeaders,
    body: diffStudentPayload,
  });

  console.log('Admit 2 Status:', admit2.status);
  console.log('Admit 2 AdmissionNumber:', admit2.data?.data?.admissionNumber);

  if (admit2.status === 201) {
    console.log('✓ PASS: Second different student admitted successfully!');
  } else {
    throw new Error('FAIL: Second student admission failed: ' + JSON.stringify(admit2.data));
  }

  console.log('\nALL DUPLICATE ADMISSION TESTS PASSED!');
}

run().catch((e) => {
  console.error('Test Failed:', e.message);
  process.exit(1);
});
