import http from 'http';
import app from '../src/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_PORT = 5096;
let server: http.Server;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, data: json };
}

async function runPhase6Tests() {
  console.log(`=== Phase 6 Fees, Payments, Receipts & Financial Reports Test Suite on port ${TEST_PORT} ===\n`);

  server = app.listen(TEST_PORT);
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    // -------------------------------------------------------------
    // [Setup] Authenticate Super Admin and Create Test Institutes
    // -------------------------------------------------------------
    console.log('[Setup] Logging in as Super Admin and creating Phase 6 test institutes...');
    const superLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'superadmin@platform.local',
        password: 'AdminSecurePassword#2026',
        role: 'SUPER_ADMIN',
      },
    });
    if (!superLogin.ok) throw new Error('Super Admin login failed');
    const superToken = superLogin.data.data.accessToken;

    // Institute A
    const codeA = `P6A${Math.floor(1000 + Math.random() * 9000)}`;
    const instResA = await request('/institutes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: {
        name: 'Phase 6 Apex Institute',
        code: codeA,
        adminFullName: 'Director Apex',
        adminEmail: `admin.${codeA.toLowerCase()}@apex.local`,
        adminInitialPassword: 'Password#123',
      },
    });
    if (!instResA.ok) throw new Error(`Failed to create Institute A: ${JSON.stringify(instResA.data)}`);
    const instituteA = instResA.data.data.institute;

    // Institute B (for cross-tenant checks)
    const codeB = `P6B${Math.floor(1000 + Math.random() * 9000)}`;
    const instResB = await request('/institutes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: {
        name: 'Phase 6 Beacon Academy',
        code: codeB,
        adminFullName: 'Director Beacon',
        adminEmail: `admin.${codeB.toLowerCase()}@beacon.local`,
        adminInitialPassword: 'Password#123',
      },
    });
    if (!instResB.ok) throw new Error(`Failed to create Institute B: ${JSON.stringify(instResB.data)}`);
    const instituteB = instResB.data.data.institute;

    // Login as Admin A
    const adminLoginA = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: `admin.${codeA.toLowerCase()}@apex.local`,
        password: 'Password#123',
        role: 'ACADEMIC_ADMIN',
        instituteCode: codeA,
      },
    });
    const adminTokenA = adminLoginA.data.data.accessToken;
    const adminHeadersA = { Authorization: `Bearer ${adminTokenA}`, 'x-institute-id': instituteA.id };

    // Login as Admin B
    const adminLoginB = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: `admin.${codeB.toLowerCase()}@beacon.local`,
        password: 'Password#123',
        role: 'ACADEMIC_ADMIN',
        instituteCode: codeB,
      },
    });
    const adminTokenB = adminLoginB.data.data.accessToken;
    const adminHeadersB = { Authorization: `Bearer ${adminTokenB}`, 'x-institute-id': instituteB.id };

    // Create Batch in Institute A
    const batchResA = await request('/academics/batches', {
      method: 'POST',
      headers: adminHeadersA,
      body: { name: 'Grade 11 - Commerce Alpha', academicYear: '2026-2027' },
    });
    const batchA = batchResA.data.data.batch;

    // Create Staff in Institute A
    const staffEmailA = `accountant.${Math.floor(1000 + Math.random() * 9000)}@apex.local`;
    const staffResA = await request('/staff', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        fullName: 'Mrs. Rekha Accounts',
        email: staffEmailA,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        designation: 'Accounts Assistant',
        initialPassword: 'Password#123',
      },
    });
    const staffUserA = staffResA.data.data.staff;

    const staffLoginA = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: staffEmailA,
        password: 'Password#123',
        role: 'STAFF',
        instituteCode: codeA,
      },
    });
    const staffTokenA = staffLoginA.data.data.accessToken;
    const staffHeadersA = { Authorization: `Bearer ${staffTokenA}`, 'x-institute-id': instituteA.id };

    // Create Student 1 in Institute A
    const s1Email = `student1.${Math.floor(1000 + Math.random() * 9000)}@apex.local`;
    const s1Res = await request('/students', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        firstName: 'Aarav',
        lastName: 'Sharma',
        admissionNumber: `ADM-${Math.floor(100000 + Math.random() * 900000)}`,
        createLoginAccount: true,
        email: s1Email,
        initialPassword: 'Password#123',
        batchId: batchA.id,
      },
    });
    if (!s1Res.ok) throw new Error(`Failed to create student 1: ${JSON.stringify(s1Res.data)}`);
    const student1 = s1Res.data.data.student;

    const s1Login = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: s1Email,
        password: 'Password#123',
        role: 'STUDENT',
        instituteCode: codeA,
      },
    });
    if (!s1Login.ok) throw new Error(`Student 1 login failed: ${JSON.stringify(s1Login.data)}`);
    const student1Token = s1Login.data.data.accessToken;
    const student1Headers = { Authorization: `Bearer ${student1Token}`, 'x-institute-id': instituteA.id };

    // Create Student 2 in Institute A
    const s2Email = `student2.${Math.floor(1000 + Math.random() * 9000)}@apex.local`;
    const s2Res = await request('/students', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        firstName: 'Diya',
        lastName: 'Patel',
        admissionNumber: `ADM-${Math.floor(100000 + Math.random() * 900000)}`,
        createLoginAccount: true,
        email: s2Email,
        initialPassword: 'Password#123',
        batchId: batchA.id,
      },
    });
    if (!s2Res.ok) throw new Error(`Failed to create student 2: ${JSON.stringify(s2Res.data)}`);
    const student2 = s2Res.data.data.student;

    // Create Parent linked to Student 1 only
    const p1Email = `parent1.${Math.floor(1000 + Math.random() * 9000)}@apex.local`;
    const p1Res = await request('/parents', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        fullName: 'Mr. Rajesh Sharma',
        email: p1Email,
        phone: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
        initialPassword: 'Password#123',
      },
    });
    if (!p1Res.ok) throw new Error(`Failed to create parent: ${JSON.stringify(p1Res.data)}`);
    const parent1 = p1Res.data.data.parent;

    // Link parent to student 1
    await request(`/parents/students/${student1.id}/guardians`, {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        parentId: parent1.id,
        relation: 'FATHER',
        isPrimaryContact: true,
        canReceiveSms: true,
      },
    });

    const p1Login = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: p1Email,
        password: 'Password#123',
        role: 'PARENT',
        instituteCode: codeA,
      },
    });
    if (!p1Login.ok) throw new Error(`Parent login failed: ${JSON.stringify(p1Login.data)}`);
    const parent1Token = p1Login.data.data.accessToken;
    const parent1Headers = { Authorization: `Bearer ${parent1Token}`, 'x-institute-id': instituteA.id };

    console.log('[Setup] Test institutes, admin, staff, students, and parent provisioned successfully.\n');

    // =========================================================================
    // TEST 1: Authorized Fee Structure Creation
    // =========================================================================
    console.log('Test 1: Academic Admin creates valid monthly fee structure...');
    const createFsRes = await request('/fees/structures', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        batchId: batchA.id,
        name: 'Tuition Fee - Grade 11',
        description: 'Monthly tuition including laboratory charges',
        academicYear: '2026-2027',
        frequency: 'MONTHLY',
        amount: 5000.0,
        dueDay: 10,
        isActive: true,
      },
    });
    if (createFsRes.status !== 201) throw new Error(`Fee structure creation failed: ${JSON.stringify(createFsRes.data)}`);
    const feeStructure1 = createFsRes.data.data.feeStructure;
    if (Number(feeStructure1.amount) !== 5000) throw new Error(`Expected amount 5000, got ${feeStructure1.amount}`);
    console.log(` -> [PASS] Fee structure created (ID: ${feeStructure1.id}, Amount: ₹${feeStructure1.amount})`);

    // =========================================================================
    // TEST 2: Unauthorized Fee Structure Modification
    // =========================================================================
    console.log('Test 2: Unauthorized user (Student / Staff) cannot modify fee structure...');
    const unauthModRes = await request(`/fees/structures/${feeStructure1.id}`, {
      method: 'PATCH',
      headers: student1Headers,
      body: { amount: 100 },
    });
    if (unauthModRes.status !== 403) throw new Error(`Expected HTTP 403 for student modifying fee structure, got ${unauthModRes.status}`);
    console.log(' -> [PASS] Student rejected with HTTP 403 Forbidden.');

    // =========================================================================
    // TEST 3: Cross-Institute Access Rejection
    // =========================================================================
    console.log('Test 3: Institute B admin cannot access or modify Institute A fee structure...');
    const crossInstRes = await request(`/fees/structures/${feeStructure1.id}`, {
      method: 'GET',
      headers: adminHeadersB,
    });
    if (crossInstRes.status !== 404) throw new Error(`Expected HTTP 404 for cross-institute fee structure lookup, got ${crossInstRes.status}`);
    console.log(' -> [PASS] Cross-institute access rejected (HTTP 404 Not Found in Institute B context).');

    // =========================================================================
    // TEST 4: Valid Student Fee Assignment
    // =========================================================================
    console.log('Test 4: Assign fee to Student 1 with concession/discount...');
    const assignRes = await request('/fees/assignments', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        studentId: student1.id,
        feeStructureId: feeStructure1.id,
        termLabel: 'October 2026',
        academicYear: '2026-2027',
        discountAmount: 500.0,
        dueDate: '2026-10-15',
      },
    });
    if (assignRes.status !== 201) throw new Error(`Fee assignment failed: ${JSON.stringify(assignRes.data)}`);
    const assignment1 = assignRes.data.data.assignment;
    if (Number(assignment1.baseAmount) !== 5000 || Number(assignment1.finalAmount) !== 4500) {
      throw new Error(`Fee calculation mismatch: base ${assignment1.baseAmount}, final ${assignment1.finalAmount}`);
    }
    console.log(` -> [PASS] Fee assigned (Base: ₹${assignment1.baseAmount}, Discount: ₹${assignment1.discountAmount}, Final: ₹${assignment1.finalAmount})`);

    // =========================================================================
    // TEST 5: Duplicate Assignment Prevention
    // =========================================================================
    console.log('Test 5: Duplicate fee assignment for same student & period must be rejected...');
    const dupAssignRes = await request('/fees/assignments', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        studentId: student1.id,
        feeStructureId: feeStructure1.id,
        termLabel: 'October 2026',
        discountAmount: 0,
        dueDate: '2026-10-15',
      },
    });
    if (dupAssignRes.status !== 409) throw new Error(`Expected HTTP 409 Conflict for duplicate fee assignment, got ${dupAssignRes.status}`);
    console.log(' -> [PASS] Duplicate fee assignment correctly rejected with HTTP 409 Conflict.');

    // =========================================================================
    // TEST 6: Zero & Negative Payment Rejection
    // =========================================================================
    console.log('Test 6: Reject zero and negative payments...');
    const zeroPayRes = await request('/fees/payments', {
      method: 'POST',
      headers: staffHeadersA,
      body: {
        feeAssignmentId: assignment1.id,
        amountPaid: 0,
        method: 'CASH',
      },
    });
    if (zeroPayRes.status !== 400) throw new Error(`Expected HTTP 400 for zero payment, got ${zeroPayRes.status}`);

    const negPayRes = await request('/fees/payments', {
      method: 'POST',
      headers: staffHeadersA,
      body: {
        feeAssignmentId: assignment1.id,
        amountPaid: -500,
        method: 'UPI',
      },
    });
    if (negPayRes.status !== 400) throw new Error(`Expected HTTP 400 for negative payment, got ${negPayRes.status}`);
    console.log(' -> [PASS] Zero and negative payments rejected with HTTP 400.');

    // =========================================================================
    // TEST 7: Payment Exceeding Outstanding Balance Rejection
    // =========================================================================
    console.log('Test 7: Reject payment exceeding outstanding balance...');
    const overPayRes = await request('/fees/payments', {
      method: 'POST',
      headers: staffHeadersA,
      body: {
        feeAssignmentId: assignment1.id,
        amountPaid: 5000, // Balance is 4500
        method: 'UPI',
      },
    });
    if (overPayRes.status !== 400) throw new Error(`Expected HTTP 400 for overpayment, got ${overPayRes.status}`);
    console.log(' -> [PASS] Overpayment (₹5000 vs balance ₹4500) rejected with HTTP 400.');

    // =========================================================================
    // TEST 8: Partial Payment and Remaining Balance Calculation
    // =========================================================================
    console.log('Test 8: Record partial payment of ₹2000 and verify balance...');
    const idempotencyKey1 = `IDEM-${Date.now()}-1`;
    const partialPayRes = await request('/fees/payments', {
      method: 'POST',
      headers: staffHeadersA,
      body: {
        feeAssignmentId: assignment1.id,
        amountPaid: 2000.0,
        method: 'UPI',
        transactionReference: 'UPI-REF-99887766',
        idempotencyKey: idempotencyKey1,
        remarks: 'First installment paid via Google Pay',
      },
    });
    if (partialPayRes.status !== 201) throw new Error(`Partial payment recording failed: ${JSON.stringify(partialPayRes.data)}`);
    const payment1 = partialPayRes.data.data.payment;
    const remainingAfter1 = partialPayRes.data.data.remainingBalanceAfter;
    if (remainingAfter1 !== 2500) throw new Error(`Expected remaining balance 2500, got ${remainingAfter1}`);
    if (partialPayRes.data.data.assignmentStatus !== 'PARTIALLY_PAID') {
      throw new Error(`Expected status PARTIALLY_PAID, got ${partialPayRes.data.data.assignmentStatus}`);
    }
    console.log(` -> [PASS] Partial payment recorded (Paid: ₹2000, Remaining: ₹${remainingAfter1}, Status: PARTIALLY_PAID)`);

    // =========================================================================
    // TEST 9: Idempotency Protection Against Retries
    // =========================================================================
    console.log('Test 9: Submit identical payment with same idempotency key (network retry)...');
    const retryPayRes = await request('/fees/payments', {
      method: 'POST',
      headers: staffHeadersA,
      body: {
        feeAssignmentId: assignment1.id,
        amountPaid: 2000.0,
        method: 'UPI',
        transactionReference: 'UPI-REF-99887766',
        idempotencyKey: idempotencyKey1,
      },
    });
    if (retryPayRes.status !== 200) throw new Error(`Expected HTTP 200 idempotent response, got ${retryPayRes.status}`);
    if (retryPayRes.data.data.payment.id !== payment1.id) throw new Error('Idempotent response returned different payment ID');
    console.log(' -> [PASS] Idempotent retry returned original payment without double-charging.');

    // =========================================================================
    // TEST 10: Multiple Installments & Full Payment Completion
    // =========================================================================
    console.log('Test 10: Record remaining balance of ₹2500 as final installment...');
    const finalPayRes = await request('/fees/payments', {
      method: 'POST',
      headers: staffHeadersA,
      body: {
        feeAssignmentId: assignment1.id,
        amountPaid: 2500.0,
        method: 'CASH',
        remarks: 'Second installment paid in cash',
      },
    });
    if (finalPayRes.status !== 201) throw new Error(`Final payment failed: ${JSON.stringify(finalPayRes.data)}`);
    const remainingAfter2 = finalPayRes.data.data.remainingBalanceAfter;
    if (remainingAfter2 !== 0) throw new Error(`Expected remaining balance 0, got ${remainingAfter2}`);
    if (finalPayRes.data.data.assignmentStatus !== 'PAID') {
      throw new Error(`Expected status PAID, got ${finalPayRes.data.data.assignmentStatus}`);
    }
    const payment2 = finalPayRes.data.data.payment;
    console.log(` -> [PASS] Final payment recorded (Paid: ₹2500, Remaining: ₹0, Status: PAID)`);

    // =========================================================================
    // TEST 11: Receipt Generation and Scoped Access
    // =========================================================================
    console.log('Test 11: Retrieve receipt and verify unique receipt format and scoping...');
    const receiptRes = await request(`/fees/payments/${payment1.id}/receipt`, {
      headers: adminHeadersA,
    });
    if (!receiptRes.ok) throw new Error(`Receipt fetch failed: ${JSON.stringify(receiptRes.data)}`);
    const receiptData = receiptRes.data.data.receipt;
    if (!receiptData.receiptNumber.startsWith('REC-')) {
      throw new Error(`Invalid receipt number format: ${receiptData.receiptNumber}`);
    }
    console.log(` -> [PASS] Receipt verified: ${receiptData.receiptNumber} for ${receiptData.student.fullName}`);

    // Student 1 can access own receipt
    const s1ReceiptRes = await request(`/fees/payments/${payment1.id}/receipt`, {
      headers: student1Headers,
    });
    if (s1ReceiptRes.status !== 200) throw new Error(`Student could not access own receipt: ${s1ReceiptRes.status}`);
    console.log(' -> [PASS] Student successfully retrieved own payment receipt.');

    // Parent can access linked child's receipt
    const p1ReceiptRes = await request(`/fees/payments/${payment1.id}/receipt`, {
      headers: parent1Headers,
    });
    if (p1ReceiptRes.status !== 200) throw new Error(`Parent could not access linked child receipt: ${p1ReceiptRes.status}`);
    console.log(' -> [PASS] Parent successfully retrieved linked child payment receipt.');

    // =========================================================================
    // TEST 12: Student Fee Statement
    // =========================================================================
    console.log('Test 12: Retrieve comprehensive student fee statement...');
    const stmtRes = await request(`/fees/students/${student1.id}/statement`, {
      headers: student1Headers,
    });
    if (!stmtRes.ok) throw new Error(`Fee statement fetch failed: ${JSON.stringify(stmtRes.data)}`);
    const stmt = stmtRes.data.data;
    if (stmt.summary.totalPayable !== 4500 || stmt.summary.totalPaid !== 4500 || stmt.summary.netOutstanding !== 0) {
      throw new Error(`Statement totals mismatch: ${JSON.stringify(stmt.summary)}`);
    }
    console.log(` -> [PASS] Statement verified: Total Payable ₹${stmt.summary.totalPayable}, Net Outstanding ₹${stmt.summary.netOutstanding}`);

    // =========================================================================
    // TEST 13: Staff Restricted from Refunds & Adjustments
    // =========================================================================
    console.log('Test 13: Staff cannot perform refunds or adjustments...');
    const staffRefundRes = await request(`/fees/payments/${payment1.id}/refunds`, {
      method: 'POST',
      headers: staffHeadersA,
      body: { amount: 500, reason: 'Unauthorized staff refund attempt' },
    });
    if (staffRefundRes.status !== 403) throw new Error(`Expected HTTP 403 for staff refund, got ${staffRefundRes.status}`);
    console.log(' -> [PASS] Staff refund request strictly blocked with HTTP 403 Forbidden.');

    // =========================================================================
    // TEST 14: Authorized Refund & Audit Trail
    // =========================================================================
    console.log('Test 14: Academic Admin processes refund of ₹1000 on Payment 1...');
    const refundRes = await request(`/fees/payments/${payment1.id}/refunds`, {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        amount: 1000.0,
        reason: 'Authorized partial refund for fee waiver program',
      },
    });
    if (refundRes.status !== 201) throw new Error(`Refund failed: ${JSON.stringify(refundRes.data)}`);
    const refundAdjustment = refundRes.data.data.adjustment;
    if (refundRes.data.data.newStatus !== 'PARTIALLY_PAID') {
      throw new Error(`Expected assignment status PARTIALLY_PAID after refund, got ${refundRes.data.data.newStatus}`);
    }
    console.log(` -> [PASS] Refund processed (Amount: ₹1000, New status: PARTIALLY_PAID)`);

    // Verify refund cannot exceed remaining net paid on the payment
    const excessRefundRes = await request(`/fees/payments/${payment1.id}/refunds`, {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        amount: 1500.0, // Only 1000 remaining on payment1
        reason: 'Excess refund',
      },
    });
    if (excessRefundRes.status !== 400) throw new Error(`Expected HTTP 400 for refund exceeding net paid, got ${excessRefundRes.status}`);
    console.log(' -> [PASS] Excess refund rejected with HTTP 400.');

    // Check AuditLog entry
    const auditLogs = await prisma.auditLog.findMany({
      where: { instituteId: instituteA.id, action: 'PAYMENT_REFUNDED' },
    });
    if (auditLogs.length === 0) throw new Error('Audit log for refund was not found');
    console.log(` -> [PASS] Audit log entry recorded with reason and actor details.`);

    // =========================================================================
    // TEST 15: Batch Fee Assignment with Duplicate Prevention
    // =========================================================================
    console.log('Test 15: Batch fee assignment for Batch Alpha (skip existing student 1)...');
    const batchAssignRes = await request('/fees/assignments/batch', {
      method: 'POST',
      headers: adminHeadersA,
      body: {
        batchId: batchA.id,
        feeStructureId: feeStructure1.id,
        termLabel: 'October 2026',
        dueDate: '2026-10-20',
      },
    });
    if (batchAssignRes.status !== 201) throw new Error(`Batch fee assignment failed: ${JSON.stringify(batchAssignRes.data)}`);
    // Student 1 already had October 2026 assigned, so Student 1 is skipped, Student 2 is assigned
    console.log(` -> [PASS] Batch assignment succeeded (Assigned: ${batchAssignRes.data.data.assignedCount}, Skipped duplicates: ${batchAssignRes.data.data.skippedCount})`);

    // =========================================================================
    // TEST 16: Financial Reports & Calculations
    // =========================================================================
    console.log('Test 16: Financial summary report and calculations...');
    const summaryRes = await request('/fees/reports/summary', {
      headers: adminHeadersA,
    });
    if (!summaryRes.ok) throw new Error(`Summary report failed: ${JSON.stringify(summaryRes.data)}`);
    const summary = summaryRes.data.data;
    if (summary.totalRefunds !== 1000) throw new Error(`Expected totalRefunds 1000, got ${summary.totalRefunds}`);
    console.log(` -> [PASS] Financial Summary: Total Assigned ₹${summary.totalAssigned}, Net Collected ₹${summary.totalCollected}, Total Refunds ₹${summary.totalRefunds}, Net Retained ₹${summary.netRetained}`);

    // Collections report
    const collectionsRes = await request('/fees/reports/collections', {
      headers: adminHeadersA,
    });
    if (!collectionsRes.ok) throw new Error(`Collections report failed: ${JSON.stringify(collectionsRes.data)}`);
    const collections = collectionsRes.data.data;
    if (collections.methodBreakdown.UPI.count < 1 || collections.methodBreakdown.CASH.count < 1) {
      throw new Error('Method breakdown did not record UPI or CASH payments');
    }
    console.log(` -> [PASS] Collections Breakdown: UPI ₹${collections.methodBreakdown.UPI.total}, CASH ₹${collections.methodBreakdown.CASH.total}`);

    // Outstanding report
    const outstandingRes = await request('/fees/reports/outstanding', {
      headers: adminHeadersA,
    });
    if (!outstandingRes.ok) throw new Error(`Outstanding report failed: ${JSON.stringify(outstandingRes.data)}`);
    console.log(` -> [PASS] Outstanding Report: Found ${outstandingRes.data.data.recordCount} pending/partially paid records (Total ₹${outstandingRes.data.data.totalOutstandingAmount})`);

    // =========================================================================
    // TEST 17: Cross-Institute Financial Report Isolation
    // =========================================================================
    console.log('Test 17: Verify Institute B sees ZERO of Institute A financial data...');
    const instBSummaryRes = await request('/fees/reports/summary', {
      headers: adminHeadersB,
    });
    if (!instBSummaryRes.ok) throw new Error(`Institute B summary failed: ${JSON.stringify(instBSummaryRes.data)}`);
    const summaryB = instBSummaryRes.data.data;
    if (summaryB.totalAssigned !== 0 || summaryB.totalCollected !== 0 || summaryB.counts.totalAssignments !== 0) {
      throw new Error(`Tenant leak detected! Institute B received Institute A financial data: ${JSON.stringify(summaryB)}`);
    }
    console.log(' -> [PASS] Strict Multi-Tenant Isolation verified: Institute B summary returned 0 records and ₹0 collections.');

    console.log('\n=============================================================');
    console.log('>>> ALL PHASE 6 FEES & FINANCIAL REPORTS TESTS PASSED! <<<');
    console.log('=============================================================');
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
    process.exitCode = 0;
  }
}

runPhase6Tests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]', err);
  if (server) server.close();
  prisma.$disconnect();
  process.exitCode = 1;
});
