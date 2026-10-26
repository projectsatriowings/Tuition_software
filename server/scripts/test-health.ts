import app from '../src/index.js';
import { dbPool } from '../src/config/db.js';
import http from 'http';

const server = http.createServer(app);

server.listen(5099, async () => {
  try {
    const res = await fetch('http://localhost:5099/api/health');
    const data = await res.json();
    console.log('Health Check Response status:', res.status);
    console.log('Health Check Response payload:', JSON.stringify(data, null, 2));

    if (res.status === 200 && data.status === 'healthy' && data.database?.connected) {
      console.log('[PASS] API health endpoint responds with 200 and Neon PostgreSQL connection is verified!');
      process.exitCode = 0;
    } else {
      console.error('[FAIL] Health check did not return expected healthy status.');
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('[FAIL] Health check failed with error:', err.message);
    process.exitCode = 1;
  } finally {
    server.close(async () => {
      await dbPool.end();
    });
  }
});
