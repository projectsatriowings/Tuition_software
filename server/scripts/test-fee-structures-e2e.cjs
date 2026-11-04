const http = require('http');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'tuition_jwt_secret_production_ready_dev_32_chars_minimum';

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runE2ETests() {
  console.log('=== TuitionOS Fee Structure Management System E2E Test ===');

  // 1. Locate Apex Tuition Academy and an Academic Admin
  const apex = await prisma.institute.findFirst({
    where: { code: 'APEX01' },
    include: {
      memberships: {
        where: { role: 'ACADEMIC_ADMIN', isActive: true },
        include: { user: true },
      },
      students: true,
      batches: true,
    },
  });

  if (!apex || !apex.memberships.length) {
    throw new Error('Apex Tuition Academy or Academic Admin membership not found');
  }

  const adminUser = apex.memberships[0].user;
  console.log(`Admin User: ${adminUser.fullName} (${adminUser.email}) for Institute: ${apex.name}`);

  // Generate Admin JWT token
  const token = jwt.sign(
    {
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ACADEMIC_ADMIN',
      instituteId: apex.id,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // 2. Test GET /fees/structures
  console.log('\n[TEST 1] Listing active fee structures via API...');
  const listRes = await apiRequest('GET', '/fees/structures', null, token);
  if (listRes.status !== 200 || !listRes.data.success) {
    throw new Error(`Failed to list fee structures: ${JSON.stringify(listRes)}`);
  }
  const structures = listRes.data.data.feeStructures;
  console.log(`✓ Successfully retrieved ${structures.length} fee structures.`);
  for (const s of structures) {
    console.log(`  - [${s.frequency}] ${s.name} (Amount: ₹${s.amount}, Class: ${s.classGrade || 'N/A'}, Components: ${s.componentsJson?.length || 0})`);
  }

  // 3. Test Student Applicability Filtering (Requirement 6 & 12)
  const student = apex.students[0];
  console.log(`\n[TEST 2] Querying structures applicable to student ${student.firstName} ${student.lastName}...`);
  const studentStructuresRes = await apiRequest('GET', `/fees/structures?studentId=${student.id}`, null, token);
  if (studentStructuresRes.status !== 200) {
    throw new Error(`Failed to list student fee structures: ${JSON.stringify(studentStructuresRes)}`);
  }
  console.log(`✓ Retrieved ${studentStructuresRes.data.data.feeStructures.length} structures applicable to student.`);

  // 4. Test POST /fees/structures (Creating a new structure with custom components)
  console.log('\n[TEST 3] Creating new custom Fee Structure template...');
  const createPayload = {
    name: 'Class 10 Intensive Crash Course 2026',
    description: 'High-speed revision program with daily test papers.',
    academicYear: '2026-2027',
    frequency: 'COURSE_BASED',
    classGrade: 'Class 10',
    courseName: 'Crash Course',
    amount: 6000.00,
    dueDay: 15,
    components: [
      { name: 'Crash Course Lectures', amount: 4500, category: 'TUITION' },
      { name: 'Formula Handbook & DPPs', amount: 800, category: 'MATERIALS' },
      { name: 'Mock Board Exam Series', amount: 700, category: 'EXAMINATION' },
    ],
    isActive: true,
  };
  const createRes = await apiRequest('POST', '/fees/structures', createPayload, token);
  if (createRes.status !== 201 || !createRes.data.success) {
    throw new Error(`Failed to create fee structure: ${JSON.stringify(createRes)}`);
  }
  const createdStructure = createRes.data.data.feeStructure;
  console.log(`✓ Created structure: ${createdStructure.name} (ID: ${createdStructure.id}) with amount ₹${createdStructure.amount}`);

  // 5. Test PATCH /fees/structures/:id (Updating structure)
  console.log('\n[TEST 4] Updating created Fee Structure...');
  const updateRes = await apiRequest(
    'PATCH',
    `/fees/structures/${createdStructure.id}`,
    {
      description: 'Updated revision program with doubt desk access.',
      amount: 6500.00,
    },
    token
  );
  if (updateRes.status !== 200 || !updateRes.data.success) {
    throw new Error(`Failed to update fee structure: ${JSON.stringify(updateRes)}`);
  }
  console.log(`✓ Updated structure amount to ₹${updateRes.data.data.feeStructure.amount}`);

  // 6. Test Fee Assignment with Discount Reason Enforcement (Requirement 8)
  console.log('\n[TEST 5] Verifying discount reason validation when assigning fee...');
  const assignWithoutReason = {
    studentId: student.id,
    feeStructureId: createdStructure.id,
    termLabel: 'Crash Course Term Nov 2026',
    academicYear: '2026-2027',
    baseAmount: 6500.00,
    discountAmount: 1000.00,
    discountReason: '', // Empty reason should be rejected
    dueDate: '2026-11-25',
  };
  const failRes = await apiRequest('POST', '/fees/assignments', assignWithoutReason, token);
  if (failRes.status === 400) {
    console.log(`✓ Properly rejected assignment with discount lacking justification: "${failRes.data.error}"`);
  } else {
    throw new Error(`Expected 400 Bad Request, got status ${failRes.status}`);
  }

  // 7. Successful Assignment with Reason (Requirement 8, 9, 10)
  console.log('\n[TEST 6] Assigning fee with authorized concession & justification...');
  const assignWithReason = {
    studentId: student.id,
    feeStructureId: createdStructure.id,
    termLabel: 'Crash Course Term Nov 2026',
    academicYear: '2026-2027',
    baseAmount: 6500.00,
    discountAmount: 1000.00,
    discountReason: 'Director Concession - Sibling Discount',
    dueDate: '2026-11-25',
  };
  const assignRes = await apiRequest('POST', '/fees/assignments', assignWithReason, token);
  if (assignRes.status !== 201 || !assignRes.data.success) {
    throw new Error(`Failed to assign fee: ${JSON.stringify(assignRes)}`);
  }
  const assignment = assignRes.data.data.assignment;
  console.log(`✓ Created fee assignment: ID ${assignment.id}`);
  console.log(`  Base: ₹${assignment.baseAmount}, Discount: ₹${assignment.discountAmount} (Reason: ${assignment.discountReason}), Net Payable: ₹${assignment.finalAmount}`);

  // 8. Test Duplicate Billing Prevention (Requirement 10)
  console.log('\n[TEST 7] Testing duplicate billing prevention for same student, structure & term...');
  const duplicateRes = await apiRequest('POST', '/fees/assignments', assignWithReason, token);
  if (duplicateRes.status === 409) {
    console.log(`✓ Successfully prevented duplicate billing: "${duplicateRes.data.error}"`);
  } else {
    throw new Error(`Expected 409 Conflict for duplicate billing, got status ${duplicateRes.status}`);
  }

  // 9. Test Payment Recording and Receipt Integration (Requirement 11)
  console.log('\n[TEST 8] Recording payment against assigned fee...');
  const paymentPayload = {
    feeAssignmentId: assignment.id,
    amountPaid: 2500.00,
    method: 'UPI',
    transactionReference: 'UPI/TEST/20261104',
    remarks: 'First installment via GPay',
  };
  const paymentRes = await apiRequest('POST', '/fees/payments', paymentPayload, token);
  if (paymentRes.status !== 201 || !paymentRes.data.success) {
    throw new Error(`Failed to record payment: ${JSON.stringify(paymentRes)}`);
  }
  const payment = paymentRes.data.data.payment;
  console.log(`✓ Recorded payment: Receipt #${payment.receiptNumber}, Amount Paid: ₹${payment.amountPaid}, Method: ${payment.method}`);

  // 10. Test Receipt Generation
  console.log('\n[TEST 9] Fetching verified receipt...');
  const receiptRes = await apiRequest('GET', `/fees/payments/${payment.id}/receipt`, null, token);
  if (receiptRes.status !== 200 || !receiptRes.data.success) {
    throw new Error(`Failed to fetch receipt: ${JSON.stringify(receiptRes)}`);
  }
  const receipt = receiptRes.data.data.receipt;
  console.log(`✓ Generated official receipt: ${receipt.receiptNumber} for student ${receipt.student.fullName}`);
  console.log(`  Remaining Balance on assignment: ₹${receipt.feeDetails.remainingBalanceAfter}`);

  // 11. Cleanup test records
  console.log('\n[CLEANUP] Cleaning up test records...');
  await prisma.payment.delete({ where: { id: payment.id } });
  await prisma.studentFeeAssignment.delete({ where: { id: assignment.id } });
  await prisma.feeStructure.delete({ where: { id: createdStructure.id } });
  console.log('✓ Test records cleaned up. Historical and permanent data preserved.');

  console.log('\n=======================================================');
  console.log('ALL 9 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('=======================================================');
}

runE2ETests()
  .catch((err) => {
    console.error('E2E Test Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

