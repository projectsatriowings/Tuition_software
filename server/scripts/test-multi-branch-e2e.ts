import { prisma } from '../src/prisma.js';
import { BranchesService } from '../src/modules/branches/branches.service.js';

async function runE2ETests() {
  console.log('=====================================================');
  console.log('🧪 RUNNING TUITIONOS MULTI-BRANCH END-TO-END TEST SUITE');
  console.log('=====================================================\n');

  // 1. Find or verify target test institute (Apex Tuition Academy)
  const institute = await prisma.institute.findFirst({
    where: { code: 'APEX01' },
    include: {
      branches: true,
      students: { take: 5 },
      staffProfiles: { include: { user: true }, take: 5 },
      batches: { take: 5 },
    },
  });

  if (!institute) {
    throw new Error('Test institute APEX01 not found');
  }

  console.log(`[TEST 1] Backwards Compatibility for Existing Single-Branch Institute:`);
  console.log(`   Institute: "${institute.name}" (${institute.code}) [ID: ${institute.id}]`);
  console.log(`   Branches count: ${institute.branches.length}`);
  
  const defaultBranch = institute.branches.find((b) => b.isDefault);
  if (!defaultBranch) {
    throw new Error('FAIL: Default branch was not created for APEX01');
  }
  console.log(`   ✔ Default Branch exists: "${defaultBranch.name}" (Code: ${defaultBranch.code})`);
  console.log(`   ✔ Total existing batches linked: ${institute.batches.length}`);
  console.log(`   ✔ Total existing students linked: ${institute.students.length}`);

  // 2. Branch CRUD: Create Secondary Branch
  console.log(`\n[TEST 2] Branch Lifecycle (Create & Update Secondary Branch):`);
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ACADEMIC_ADMIN' },
  });
  const adminUserId = adminUser?.id || institute.staffProfiles[0]?.userId;

  // Clean up any previous test branch
  await prisma.branch.deleteMany({
    where: { instituteId: institute.id, code: 'APX_SOU' },
  });

  const secondaryBranch = await BranchesService.createBranch(
    institute.id,
    {
      name: 'Apex South City Campus',
      code: 'APX_SOU',
      address: '42 Crescent Road, Gandhi Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600020',
      phone: '+91 94444 11223',
      email: 'south@apex.example.com',
      latitude: 13.0012,
      longitude: 80.2565,
      geofenceRadius: 250,
      gpsAccuracyThreshold: 45,
      workStartTime: '08:00',
      workEndTime: '19:00',
      lateGraceMinutes: 15,
      workingDays: 'MON,TUE,WED,THU,FRI,SAT',
      timezone: 'Asia/Kolkata',
    },
    adminUserId
  );

  console.log(`   ✔ Created secondary branch: "${secondaryBranch.name}" (ID: ${secondaryBranch.id})`);
  console.log(`   ✔ Coordinates: Lat ${secondaryBranch.latitude}, Lng ${secondaryBranch.longitude}, Radius ${secondaryBranch.geofenceRadius}m`);

  // Update secondary branch
  const updatedBranch = await BranchesService.updateBranch(
    institute.id,
    secondaryBranch.id,
    {
      phone: '+91 94444 99887',
      geofenceRadius: 300,
    },
    adminUserId
  );
  console.log(`   ✔ Updated branch: phone=${updatedBranch.phone}, radius=${updatedBranch.geofenceRadius}m`);

  // 3. Central Staff Identity & Multi-Branch Deployment
  console.log(`\n[TEST 3] Central Staff Multi-Branch Assignment:`);
  const staffMember = institute.staffProfiles[0];
  if (!staffMember) {
    throw new Error('FAIL: No staff profile found for testing');
  }

  console.log(`   Testing with staff: "${staffMember.user?.fullName}" (${staffMember.employeeCode || staffMember.id})`);

  // Assign staff to secondary branch as ADDITIONAL teacher
  const staffAssignment = await BranchesService.assignStaff(
    institute.id,
    {
      branchId: secondaryBranch.id,
      staffProfileId: staffMember.id,
      assignmentType: 'ADDITIONAL',
      role: 'TEACHER',
      effectiveFrom: new Date(),
    },
    adminUserId
  );

  console.log(`   ✔ Staff deployed to secondary branch. Assignment ID: ${staffAssignment.id}`);
  console.log(`   ✔ Assignment type: ${staffAssignment.assignmentType}, Role: ${staffAssignment.role}`);

  // Verify staff's assignments
  const allAssignments = await prisma.branchStaffAssignment.findMany({
    where: { staffProfileId: staffMember.id, isActive: true },
    include: { branch: true },
  });
  console.log(`   ✔ Staff now deployed across ${allAssignments.length} branches:`);
  allAssignments.forEach((a) => {
    console.log(`       - Branch: "${a.branch.name}" (${a.isPrimary ? 'PRIMARY' : a.assignmentType})`);
  });

  // 4. Schedule Conflict Detector across Branches
  console.log(`\n[TEST 4] Cross-Branch Teacher Schedule Conflict Detection:`);
  
  // Clean up any existing E2E batch
  await prisma.staffBatchAssignment.deleteMany({
    where: { batch: { instituteId: institute.id, code: 'E2E-PHY-MAIN' } },
  });
  await prisma.batch.deleteMany({
    where: { instituteId: institute.id, code: 'E2E-PHY-MAIN' },
  });

  // Create a batch at Default branch on MON,WED,FRI 10:00 - 11:30
  const batch1 = await prisma.batch.create({
    data: {
      instituteId: institute.id,
      branchId: defaultBranch.id,
      name: 'E2E Physics Morning - Main Campus',
      code: 'E2E-PHY-MAIN',
      academicYear: '2026-2027',
      startDate: new Date(),
      schedule: 'MON,WED,FRI 10:00 - 11:30',
      isActive: true,
      staffAssignments: {
        create: {
          staffProfileId: staffMember.id,
        },
      },
    },
  });
  console.log(`   Created Batch 1 at Main Campus: "${batch1.name}" (${batch1.schedule})`);

  // Conflict test A: Attempt same teacher on MON,WED,FRI 10:00 - 11:30 at South Campus
  const conflictCheckA = await BranchesService.checkTeacherScheduleConflict(
    institute.id,
    staffMember.id,
    'MON,WED,FRI 10:00 - 11:30'
  );
  console.log(`   Collision Test A (overlapping slot): Has Conflict = ${conflictCheckA.hasConflict}`);
  if (!conflictCheckA.hasConflict) {
    throw new Error('FAIL: Schedule conflict was NOT detected for overlapping slot');
  }
  console.log(`   ✔ Conflict correctly detected! Conflicting batch: "${conflictCheckA.conflictDetails?.conflictingBatchName}" at branch "${conflictCheckA.conflictDetails?.branchName}"`);

  // Conflict test B: Attempt same teacher on TUE,THU 14:00 - 15:30 at South Campus (Different day/time)
  const conflictCheckB = await BranchesService.checkTeacherScheduleConflict(
    institute.id,
    staffMember.id,
    'TUE,THU 14:00 - 15:30'
  );
  console.log(`   Non-Collision Test B (different day): Has Conflict = ${conflictCheckB.hasConflict}`);
  if (conflictCheckB.hasConflict) {
    throw new Error('FAIL: False conflict detected for non-overlapping day');
  }
  console.log(`   ✔ Non-conflicting slot approved without issue!`);

  // 5. Student Enrollment & Authorized Cross-Branch Transfer
  console.log(`\n[TEST 5] Student Branch Enrollment & Historical Integrity Transfer:`);
  const student = institute.students[0];
  if (!student) {
    throw new Error('FAIL: No student found for testing');
  }

  // Ensure test starts cleanly at default branch
  await prisma.student.update({
    where: { id: student.id },
    data: { primaryBranchId: defaultBranch.id },
  });
  await prisma.branchStudentEnrollment.upsert({
    where: {
      branchId_studentId: {
        branchId: defaultBranch.id,
        studentId: student.id,
      },
    },
    create: {
      instituteId: institute.id,
      studentId: student.id,
      branchId: defaultBranch.id,
      isPrimary: true,
      status: 'ACTIVE',
    },
    update: {
      isPrimary: true,
      status: 'ACTIVE',
    },
  });

  console.log(`   Testing with student: "${student.firstName || student.id}" [Current Branch: ${defaultBranch.id}]`);

  // Get or create a fee assignment for this student
  let feeAssignment = await prisma.studentFeeAssignment.findFirst({
    where: { studentId: student.id },
  });
  if (!feeAssignment) {
    let feeStruct = await prisma.feeStructure.findFirst({
      where: { instituteId: institute.id },
    });
    if (!feeStruct) {
      feeStruct = await prisma.feeStructure.create({
        data: {
          instituteId: institute.id,
          branchId: defaultBranch.id,
          name: 'E2E Standard Fee',
          academicYear: '2026-2027',
          amount: 5000,
          frequency: 'MONTHLY',
          feeComponents: JSON.stringify([{ name: 'Tuition', amount: 5000 }]),
        },
      });
    }
    feeAssignment = await prisma.studentFeeAssignment.create({
      data: {
        studentId: student.id,
        feeStructureId: feeStruct.id,
        branchId: defaultBranch.id,
        academicYear: '2026-2027',
        baseAmount: 5000,
        finalAmount: 5000,
        termLabel: `Nov-2026-${Date.now()}`,
        dueDate: new Date(),
      },
    });
  }

  // Record a payment for this student attributed to default branch
  const historicalPayment = await prisma.payment.create({
    data: {
      instituteId: institute.id,
      studentId: student.id,
      feeAssignmentId: feeAssignment.id,
      branchId: defaultBranch.id,
      amountPaid: 5000,
      method: 'CASH',
      status: 'SUCCESS',
      receiptNumber: `E2E-RCPT-${Date.now()}`,
      recordedById: adminUserId,
    },
  });
  console.log(`   Recorded historical payment of ₹5,000 at Main Campus [BranchId: ${historicalPayment.branchId}]`);

  // Execute transfer to Secondary Branch
  const transferResult = await BranchesService.transferStudent(
    institute.id,
    {
      studentId: student.id,
      toBranchId: secondaryBranch.id,
      reason: 'Relocated family residence closer to South City Campus',
      effectiveDate: new Date(),
      transferFeesPolicy: 'RETAIN_ORIGINAL_FEES',
    },
    adminUserId
  );

  console.log(`   ✔ Student transfer executed! Transfer Log ID: ${transferResult.transferId}`);
  const updatedStudent = await prisma.student.findUnique({ where: { id: student.id } });
  console.log(`   ✔ Updated primaryBranchId on student: ${updatedStudent?.primaryBranchId}`);

  // Verify historical payment still belongs to defaultBranch
  const verifiedPayment = await prisma.payment.findUnique({
    where: { id: historicalPayment.id },
  });
  if (verifiedPayment?.branchId !== defaultBranch.id) {
    throw new Error('FAIL: Historical payment branchId was modified! Expected defaultBranch.id');
  }
  console.log(`   ✔ Historical payment at source branch remained 100% preserved (Branch: ${verifiedPayment.branchId})`);

  // 6. Branch-Aware Geofence Attendance & Multi-Shift Sessions
  console.log(`\n[TEST 6] Branch Attendance & Multi-Shift Session Verification:`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Clean any test sessions for today
  await prisma.staffAttendanceEvent.deleteMany({
    where: { staffId: staffMember.id, instituteId: institute.id },
  });
  await prisma.staffAttendanceSession.deleteMany({
    where: { staffId: staffMember.id, instituteId: institute.id, attendanceDate: today },
  });

  // Session 1: Check in at Main Campus
  const session1 = await prisma.staffAttendanceSession.create({
    data: {
      instituteId: institute.id,
      staffId: staffMember.id,
      branchId: defaultBranch.id,
      sessionNumber: 1,
      attendanceDate: today,
      status: 'CHECKED_IN',
      checkInTime: new Date(Date.now() - 3600000 * 4), // 4 hours ago
      attendanceMode: 'ON_SITE',
    },
  });
  console.log(`   ✔ Session 1 created at Main Campus [BranchId: ${session1.branchId}, Session: ${session1.sessionNumber}]`);

  // Checkout Session 1
  await prisma.staffAttendanceSession.update({
    where: { id: session1.id },
    data: {
      status: 'CHECKED_OUT',
      checkOutTime: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      workDurationMinutes: 120,
    },
  });
  console.log(`   ✔ Session 1 checked out (Duration: 120 mins)`);

  // Session 2: Check in at South Campus (Shift 2)
  const session2 = await prisma.staffAttendanceSession.create({
    data: {
      instituteId: institute.id,
      staffId: staffMember.id,
      branchId: secondaryBranch.id,
      sessionNumber: 2,
      attendanceDate: today,
      status: 'CHECKED_IN',
      checkInTime: new Date(),
      attendanceMode: 'ON_SITE',
    },
  });
  console.log(`   ✔ Session 2 created at South Campus [BranchId: ${session2.branchId}, Session: ${session2.sessionNumber}]`);
  console.log(`   ✔ Multi-shift attendance across branches validated successfully without unique constraint conflicts!`);

  // 7. Deactivation Safety Verification
  console.log(`\n[TEST 7] Branch Deactivation Safety Check:`);
  
  // Secondary branch currently has student and staff enrolled
  const safetyCheckBlocked = await BranchesService.checkDeactivationSafety(institute.id, secondaryBranch.id);
  console.log(`   Checking safety for branch with active operations: Safe = ${safetyCheckBlocked.safeToDeactivate}`);
  if (safetyCheckBlocked.safeToDeactivate) {
    throw new Error('FAIL: Branch with active students/staff was falsely marked safe to deactivate');
  }
  console.log(`   ✔ Deactivation blocked as expected. Reasons:`);
  safetyCheckBlocked.reasons.forEach((r) => console.log(`       - ${r}`));

  // 8. Consolidated Summary Verification
  console.log(`\n[TEST 8] Multi-Branch Consolidated Summary:`);
  const consolidated = await BranchesService.getConsolidatedSummary(institute.id);
  console.log(`   ✔ Total Branches: ${consolidated.totalBranches}`);
  console.log(`   ✔ Active Branches: ${consolidated.activeBranches}`);
  console.log(`   ✔ Total Staff Profiles: ${consolidated.totals.staff}`);
  console.log(`   ✔ Total Active Students: ${consolidated.totals.students}`);
  console.log(`   ✔ Total Batches: ${consolidated.totals.batches}`);
  console.log(`   ✔ Total Revenue: ₹${consolidated.totals.totalRevenue}`);

  // Cleanup test artifacts
  console.log(`\n[CLEANUP] Cleaning up test-created records...`);
  await prisma.staffAttendanceSession.deleteMany({
    where: { id: { in: [session1.id, session2.id] } },
  });
  await prisma.payment.deleteMany({
    where: { id: historicalPayment.id },
  });
  await prisma.batch.deleteMany({
    where: { id: batch1.id },
  });
  // Transfer student back to default branch
  await prisma.student.update({
    where: { id: student.id },
    data: { primaryBranchId: defaultBranch.id },
  });
  await prisma.branchStudentEnrollment.deleteMany({
    where: { studentId: student.id, branchId: secondaryBranch.id },
  });
  await prisma.branchStaffAssignment.deleteMany({
    where: { id: staffAssignment.id },
  });
  await prisma.studentBranchTransfer.deleteMany({
    where: { id: transferResult.transferId },
  });
  await prisma.branch.delete({
    where: { id: secondaryBranch.id },
  });
  console.log(`   ✔ Test records safely cleaned up.`);

  console.log('\n=====================================================');
  console.log('🎉 ALL 8 MULTI-BRANCH TESTS PASSED WITH 100% SUCCESS!');
  console.log('=====================================================');
}

runE2ETests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ E2E Test Failed:', err);
    process.exit(1);
  });
