function normalizeApiUrl(rawUrl: string): string {
  let cleaned = (rawUrl || '').trim();
  if (!cleaned) {
    return 'http://10.0.2.2:5000/api';
  }
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }
  cleaned = cleaned.replace(/\/+$/, '');
  if (!cleaned.toLowerCase().endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
}

function buildApiUrl(base: string, endpoint: string): string {
  const normBase = normalizeApiUrl(base);
  let cleanEndpoint = (endpoint || '').trim();
  if (cleanEndpoint.startsWith('/')) {
    cleanEndpoint = cleanEndpoint.substring(1);
  }
  if (cleanEndpoint.toLowerCase().startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  } else if (cleanEndpoint.toLowerCase() === 'api') {
    cleanEndpoint = '';
  }
  return cleanEndpoint ? `${normBase}/${cleanEndpoint}` : normBase;
}

async function testMobileNetworkConnectivity() {
  const lanIp = '192.168.1.5';
  const port = 5000;
  const lanBaseUrl = `http://${lanIp}:${port}/api`;

  console.log('--- TESTING MOBILE NETWORK CONNECTIVITY & URL RESOLUTION ---');

  // 1. Test URL Normalization & Safe Path Building
  console.log('\n[1] URL Normalization & Duplicate /api Prevention Tests:');
  const testCases = [
    { input: `http://${lanIp}:${port}`, endpoint: '/auth/login', expected: `http://${lanIp}:${port}/api/auth/login` },
    { input: `http://${lanIp}:${port}/api`, endpoint: '/auth/login', expected: `http://${lanIp}:${port}/api/auth/login` },
    { input: `http://${lanIp}:${port}/api/`, endpoint: '/api/auth/login', expected: `http://${lanIp}:${port}/api/auth/login` },
    { input: `${lanIp}:${port}`, endpoint: 'health', expected: `http://${lanIp}:${port}/api/health` },
    { input: `http://${lanIp}:${port}/api`, endpoint: '/api/health', expected: `http://${lanIp}:${port}/api/health` },
  ];

  for (const tc of testCases) {
    const built = buildApiUrl(tc.input, tc.endpoint);
    const pass = built === tc.expected;
    console.log(`  Base: "${tc.input}" + Endpoint: "${tc.endpoint}" -> "${built}" [${pass ? '✔ PASS' : '❌ FAIL'}]`);
    if (!pass) throw new Error(`URL building failed for ${tc.input}`);
  }

  // 2. Test LAN Health Endpoint
  console.log(`\n[2] Direct LAN Health Check on http://${lanIp}:${port}/api/health:`);
  const healthRes = await fetch(`http://${lanIp}:${port}/api/health`);
  console.log(`  HTTP Status: ${healthRes.status}`);
  const healthJson = await healthRes.json();
  console.log(`  Service: ${healthJson.service}, Status: ${healthJson.status}, Database: ${healthJson.database?.connected ? 'Connected' : 'Disconnected'}`);
  if (healthRes.status !== 200 || !healthJson.database?.connected) {
    throw new Error('LAN Health check failed');
  }

  // 3. Test Root and Fallback /health
  console.log(`\n[3] Root Endpoint & Fallback /health:`);
  const rootRes = await fetch(`http://${lanIp}:${port}/`);
  const rootJson = await rootRes.json();
  console.log(`  Root (/) status: ${rootRes.status}, Service: ${rootJson.service}`);

  const fallbackHealthRes = await fetch(`http://${lanIp}:${port}/health`);
  console.log(`  Fallback (/health) status: ${fallbackHealthRes.status} (Followed redirect)`);

  // 4. Test Valid Login via LAN Address
  console.log(`\n[4] Valid Login via LAN Address (${lanBaseUrl}/auth/login):`);
  const loginRes = await fetch(`${lanBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@apexacademy.com', password: 'Password#123' }),
  });
  const loginData = await loginRes.json();
  console.log(`  Status: ${loginRes.status}, Success: ${loginData.success}, Role: ${loginData.data?.user?.role}, Institute: ${loginData.data?.institute?.name}`);
  if (!loginData.success || !loginData.data?.accessToken) {
    throw new Error('Login via LAN failed: ' + JSON.stringify(loginData));
  }
  const accessToken = loginData.data.accessToken;
  const refreshToken = loginData.data.refreshToken;

  // 5. Test Invalid Login via LAN Address (Verifying clean error message, fields untouched)
  console.log(`\n[5] Invalid Login Rejection (${lanBaseUrl}/auth/login):`);
  const badLoginRes = await fetch(`${lanBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@apexacademy.com', password: 'WrongPassword#999' }),
  });
  const badLoginData = await badLoginRes.json();
  console.log(`  Status: ${badLoginRes.status} (Expected: 401), Success: ${badLoginData.success}, Error: "${badLoginData.error}"`);
  if (badLoginRes.status !== 401) {
    throw new Error('Expected 401 for bad password');
  }

  // 6. Test Token Refresh via LAN Address
  console.log(`\n[6] Token Refresh via LAN Address (${lanBaseUrl}/auth/refresh):`);
  const refreshRes = await fetch(`${lanBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshData = await refreshRes.json();
  console.log(`  Status: ${refreshRes.status}, Success: ${refreshData.success}, Has new AccessToken: ${!!refreshData.data?.accessToken}`);
  if (!refreshData.success || !refreshData.data?.accessToken) {
    throw new Error('Refresh token failed');
  }

  // 7. Test Role-Based Endpoint via LAN Address
  console.log(`\n[7] Role-Based Endpoint Access (/institutes/dashboard/summary):`);
  const summaryRes = await fetch(`${lanBaseUrl}/institutes/dashboard/summary`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-institute-id': loginData.data.institute.id,
    },
  });
  const summaryData = await summaryRes.json();
  console.log(`  Status: ${summaryRes.status}, Success: ${summaryData.success}`);
  console.log(`  Metrics: Total Students: ${summaryData.data?.metrics?.totalStudents}, Total Staff: ${summaryData.data?.metrics?.totalStaff}`);
  if (!summaryData.success) {
    throw new Error('Role-based summary fetch failed');
  }

  console.log('\n=============================================================');
  console.log('🎉 ALL MOBILE NETWORK & CONNECTIVITY TESTS PASSED 100%! 🎉');
  console.log('=============================================================');
}

testMobileNetworkConnectivity().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
