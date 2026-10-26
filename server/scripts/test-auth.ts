import app from '../src/index.js';
import { dbPool } from '../src/config/db.js';
import { config } from '../src/config/index.js';
import http from 'http';

const server = http.createServer(app);

server.listen(5098, async () => {
  console.log('Testing Auth API on port 5098...');
  let failed = false;

  try {
    // 1. Valid Super Admin Login
    console.log('[Test 1] Testing Super Admin Login...');
    const loginRes = await fetch('http://localhost:5098/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.superAdmin.email,
        password: config.superAdmin.defaultPassword,
        role: 'SUPER_ADMIN',
      }),
    });

    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.data?.accessToken) {
      console.error('[FAIL] Super Admin login failed:', loginData);
      failed = true;
    } else {
      console.log('[PASS] Super Admin login succeeded. Received JWT token.');
    }

    const token = loginData.data?.accessToken;

    // 2. Role mismatch check
    console.log('[Test 2] Testing Role Mismatch Prevention...');
    const mismatchRes = await fetch('http://localhost:5098/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.superAdmin.email,
        password: config.superAdmin.defaultPassword,
        role: 'STUDENT', // Purposely mismatched role
      }),
    });
    if (mismatchRes.status === 403) {
      console.log('[PASS] Server correctly rejected role mismatch with HTTP 403.');
    } else {
      console.error('[FAIL] Role mismatch was not rejected properly:', mismatchRes.status);
      failed = true;
    }

    // 3. Incorrect password check
    console.log('[Test 3] Testing Incorrect Password Check...');
    const badPassRes = await fetch('http://localhost:5098/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.superAdmin.email,
        password: 'WrongPassword123!',
      }),
    });
    if (badPassRes.status === 401) {
      console.log('[PASS] Invalid password rejected with HTTP 401.');
    } else {
      console.error('[FAIL] Invalid password test failed:', badPassRes.status);
      failed = true;
    }

    // 4. Test /api/auth/me with Bearer token
    console.log('[Test 4] Testing /api/auth/me with Bearer token...');
    const meRes = await fetch('http://localhost:5098/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    if (meRes.status === 200 && meData.data?.user?.email === config.superAdmin.email) {
      console.log('[PASS] /api/auth/me successfully returned authenticated profile.');
    } else {
      console.error('[FAIL] /api/auth/me failed:', meData);
      failed = true;
    }

    process.exitCode = failed ? 1 : 0;
  } catch (err: any) {
    console.error('[FAIL] Auth tests failed with error:', err.message);
    process.exitCode = 1;
  } finally {
    server.close(async () => {
      await dbPool.end();
    });
  }
});
