import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api';

function generateAuthToken(user: any, instituteId: string, role: string) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role,
      instituteId,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(num: number, name: string, passed: boolean, error?: string) {
  results.push({ num, name, passed, error });
  if (passed) {
    console.log(`  ✓ [TEST ${num}] PASS: ${name}`);
  } else {
    console.error(`  ✗ [TEST ${num}] FAIL: ${name} -> ${error}`);
  }
}

async function runCredentialsTestSuite() {
  console.log('\n========================================================================');
  console.log(' TUITIONOS: STUDENT & PARENT CREDENTIALS MANAGEMENT TEST SUITE');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // SETUP: Institutes & Staff
    // -------------------------------------------------------------------------
    console.log('[Setup] Preparing test institutes, staff, and initial data...');

    let instA = await prisma.institute.findFirst({ where: { code: 'CRED_INST_A' } });
    if (!instA) {
      instA = await prisma.institute.create({
        data: { name: 'Credentials Academy Alpha', code: 'CRED_INST_A', admissionPrefix: 'CREDA', status: 'ACTIVE' },
      });
    }

    let instB = await prisma.institute.findFirst({ where: { code: 'CRED_INST_B' } });
    if (!instB) {
      instB = await prisma.institute.create({
        data: { name: 'Credentials Academy Beta', code: 'CRED_INST_B', admissionPrefix: 'CREDB', status: 'ACTIVE' },
      });
    }

    const passwordHash = await argon2.hash('StaffPassword123!');

    let userStaffA = await prisma.user.findFirst({ where: { email: 'staff_creds_a@test.com' } });
    if (!userStaffA) {
      userStaffA = await prisma.user.create({
        data: { fullName: 'Staff Alpha', email: 'staff_creds_a@test.com', passwordHash, role: 'STAFF', isActive: true },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffA.id, instituteId: instA.id } },
      create: { userId: userStaffA.id, instituteId: instA.id, role: 'STAFF', isActive: true },
      update: { isActive: true },
    });

    let profileStaffA = await prisma.staffProfile.findFirst({ where: { userId: userStaffA.id } });
    if (!profileStaffA) {
      profileStaffA = await prisma.staffProfile.create({
        data: { userId: userStaffA.id, instituteId: instA.id, employeeCode: 'STAFF_CR_A' },
      });
    }

    // Staff B in Institute A (different staff in same institute)
    let userStaffB = await prisma.user.findFirst({ where: { email: 'staff_creds_b@test.com' } });
    if (!userStaffB) {
      userStaffB = await prisma.user.create({
        data: { fullName: 'Staff Beta', email: 'staff_creds_b@test.com', passwordHash, role: 'STAFF', isActive: true },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffB.id, instituteId: instA.id } },
      create: { userId: userStaffB.id, instituteId: instA.id, role: 'STAFF', isActive: true },
      update: { isActive: true },
    });
    let profileStaffB = await prisma.staffProfile.findFirst({ where: { userId: userStaffB.id } });
    if (!profileStaffB) {
      profileStaffB = await prisma.staffProfile.create({
        data: { userId: userStaffB.id, instituteId: instA.id, employeeCode: 'STAFF_CR_B' },
      });
    }

    // Staff in Institute B (Cross-tenant)
    let userStaffTenantB = await prisma.user.findFirst({ where: { email: 'staff_tenant_b@test.com' } });
    if (!userStaffTenantB) {
      userStaffTenantB = await prisma.user.create({
        data: { fullName: 'Staff Tenant B', email: 'staff_tenant_b@test.com', passwordHash, role: 'STAFF', isActive: true },
      });
    }
    await prisma.instituteMembership.upsert({
      where: { instituteId_userId: { userId: userStaffTenantB.id, instituteId: instB.id } },
      create: { userId: userStaffTenantB.id, instituteId: instB.id, role: 'STAFF', isActive: true },
      update: { isActive: true },
    });

    const tokenStaffA = generateAuthToken(userStaffA, instA.id, 'STAFF');
    const tokenStaffB = generateAuthToken(userStaffB, instA.id, 'STAFF');
    const tokenStaffTenantB = generateAuthToken(userStaffTenantB, instB.id, 'STAFF');

    // -------------------------------------------------------------------------
    // TEST 1: Student Admission Creates Student Login Account
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Student Admission & Student Login Account ---');
    const randSuffix = Date.now().toString().slice(-6);
    const parentPhone1 = `9198${randSuffix}01`;

    const admitRes1 = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        firstName: 'Rohan',
        lastName: `Kumar_${randSuffix}`,
        gender: 'MALE',
        studentPhone: `9187${randSuffix}01`,
        parentFullName: 'Rajesh Kumar',
        parentPhone: parentPhone1,
        parentRelationship: 'FATHER',
      }),
    });

    const admitData1 = await admitRes1.json();
    const student1 = admitData1.data?.student;
    const studentCreds1 = admitData1.data?.studentCredentials;
    const parentCreds1 = admitData1.data?.parentCredentials;

    recordTest(
      1,
      'Student admission automatically creates student login account with admission number',
      admitRes1.status === 201 &&
        !!student1?.id &&
        !!studentCreds1?.identifier &&
        !!studentCreds1?.temporaryPassword &&
        studentCreds1.mustChangePassword === true,
      `Status: ${admitRes1.status}, data: ${JSON.stringify(admitData1)}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Parent Credentials Provisioned Correctly for New Parent
    // -------------------------------------------------------------------------
    recordTest(
      2,
      'Parent credentials provisioned with identifier and temporary password for new parent account',
      !!parentCreds1?.identifier &&
        parentCreds1.identifier === parentPhone1 &&
        !!parentCreds1?.temporaryPassword &&
        parentCreds1.isExistingAccount === false,
      `parentCreds: ${JSON.stringify(parentCreds1)}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Existing Parent Account Linked on Sibling Admission
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Sibling Admission & Existing Parent Account Linking ---');
    const admitRes2 = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({
        firstName: 'Ananya',
        lastName: `Kumar_${randSuffix}`,
        gender: 'FEMALE',
        parentFullName: 'Rajesh Kumar',
        parentPhone: parentPhone1, // Same parent phone!
        parentRelationship: 'FATHER',
      }),
    });

    const admitData2 = await admitRes2.json();
    const student2 = admitData2.data?.student;
    const studentCreds2 = admitData2.data?.studentCredentials;
    const parentCreds2 = admitData2.data?.parentCredentials;

    // Check parent User count in DB for this phone
    const parentUserCount = await prisma.user.count({ where: { phone: parentPhone1 } });

    recordTest(
      3,
      'Sibling admission links to existing parent account without duplicate User creation',
      admitRes2.status === 201 &&
        parentUserCount === 1 &&
        parentCreds2?.isExistingAccount === true,
      `parentCount: ${parentUserCount}, isExistingAccount: ${parentCreds2?.isExistingAccount}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Existing Parent Password Is NOT Exposed or Overwritten
    // -------------------------------------------------------------------------
    recordTest(
      4,
      'Existing parent password is not exposed or overwritten during sibling admission',
      parentCreds2?.temporaryPassword === null || parentCreds2?.temporaryPassword === undefined,
      `temporaryPassword: ${parentCreds2?.temporaryPassword}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Initial Passwords Never Stored as Plaintext
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Security & Storage Verification ---');
    const studentDbUser = await prisma.user.findFirst({ where: { id: student1.userId } });
    const isPlaintext = studentDbUser?.passwordHash === studentCreds1?.temporaryPassword;
    const isArgonHash = studentDbUser?.passwordHash?.startsWith('$argon2');

    recordTest(
      5,
      'Initial passwords stored as secure Argon2id hashes, never in plaintext',
      !isPlaintext && isArgonHash,
      `hash: ${studentDbUser?.passwordHash?.substring(0, 20)}...`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Password Hashes and Tokens Never Returned to Frontend
    // -------------------------------------------------------------------------
    const hasHashInStudent = 'passwordHash' in (admitData1.data?.studentCredentials || {});
    const hasHashInParent = 'passwordHash' in (admitData1.data?.parentCredentials || {});
    const hasHashInUserAccount = 'passwordHash' in (admitData1.data?.userAccount || {});

    recordTest(
      6,
      'Password hashes and sensitive token secrets are never returned in response payloads',
      !hasHashInStudent && !hasHashInParent && !hasHashInUserAccount,
      `Hashes exposed: student=${hasHashInStudent}, parent=${hasHashInParent}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Authorized Staff Can Retrieve Permitted Account Details
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Profile Details & Staff Access Scope ---');
    const getResA = await fetch(`${BASE_URL}/students/${student1.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffA}` },
    });
    const getDataA = await getResA.json();
    const studentProfileA = getDataA.data?.student;

    recordTest(
      7,
      'Authorized Staff A retrieves student profile with user account and linked parent details',
      getResA.status === 200 &&
        studentProfileA?.user?.role === 'STUDENT' &&
        studentProfileA?.parentRelations?.length > 0,
      `Status: ${getResA.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Unauthorized Staff B Cannot Access Staff A Student Profile
    // -------------------------------------------------------------------------
    const getResB = await fetch(`${BASE_URL}/students/${student1.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffB}` },
    });

    recordTest(
      8,
      "Unauthorized Staff B accessing Staff A student profile is rejected (403 Forbidden)",
      getResB.status === 403,
      `Status: ${getResB.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Cross-Institute Credential Access Rejected
    // -------------------------------------------------------------------------
    const getResTenantB = await fetch(`${BASE_URL}/students/${student1.id}`, {
      headers: { Authorization: `Bearer ${tokenStaffTenantB}` },
    });

    recordTest(
      9,
      'Cross-institute staff credential access is rejected (403 Forbidden)',
      getResTenantB.status === 403,
      `Status: ${getResTenantB.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Student and Parent Self-Service Password Reset Rejected
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Self-Service Restrictions ---');
    // First, complete student initial password change to clear mustChangePassword
    const tokenStudent1FirstLogin = generateAuthToken(studentDbUser, instA.id, 'STUDENT');
    const changeInitialRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent1FirstLogin}`,
      },
      body: JSON.stringify({
        currentPassword: studentCreds1.temporaryPassword,
        newPassword: 'StudentPermanentPass2026!',
      }),
    });

    // Verify student user mustChangePassword is now false
    const studentDbUserAfterChange = await prisma.user.findUnique({ where: { id: studentDbUser!.id } });

    // Now try self-service password reset again (mustChangePassword is false)
    const tokenStudent1Regular = generateAuthToken(studentDbUserAfterChange, instA.id, 'STUDENT');
    const selfServiceRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent1Regular}`,
      },
      body: JSON.stringify({
        currentPassword: 'StudentPermanentPass2026!',
        newPassword: 'AnotherPassword999!',
      }),
    });
    const selfServiceData = await selfServiceRes.json();

    recordTest(
      10,
      'Self-service password changes rejected with message to contact institute staff',
      selfServiceRes.status === 403 &&
        selfServiceData.error?.includes('Please contact your institute staff to reset your password'),
      `Status: ${selfServiceRes.status}, error: ${selfServiceData.error}`
    );

    // -------------------------------------------------------------------------
    // TEST 11 & 12: Staff Password Reset Workflow & Force Change on Next Login
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Staff Password Reset Workflow ---');
    const resetRes = await fetch(`${BASE_URL}/students/${student1.id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({}),
    });
    const resetData = await resetRes.json();
    const newTempPassword = resetData.data?.temporaryPassword;

    const studentDbUserAfterReset = await prisma.user.findUnique({ where: { id: studentDbUser!.id } });

    recordTest(
      11,
      'Authorized staff resets student password and receives temporary password',
      resetRes.status === 200 && !!newTempPassword,
      `Status: ${resetRes.status}, tempPass: ${newTempPassword}`
    );

    recordTest(
      12,
      'Staff password reset forces password change on next login (mustChangePassword: true)',
      studentDbUserAfterReset?.mustChangePassword === true,
      `mustChangePassword: ${studentDbUserAfterReset?.mustChangePassword}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Password Reset Token Invalidation
    // -------------------------------------------------------------------------
    const resetTokensCount = await prisma.passwordResetToken.count({ where: { userId: studentDbUser!.id } });

    recordTest(
      13,
      'Password reset cleans up / invalidates any existing password reset tokens for the user',
      resetTokensCount === 0,
      `resetTokensCount: ${resetTokensCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 14: Audit Logs Record Operations Without Storing Passwords
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Audit Log Verification ---');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: student1.id,
        action: { in: ['STUDENT_ADMITTED', 'STUDENT_PASSWORD_RESET'] },
      },
    });

    let hasPasswordInLogs = false;
    for (const log of auditLogs) {
      const serialized = JSON.stringify(log);
      if (
        serialized.includes('Student#') ||
        serialized.includes('Parent#') ||
        serialized.includes('Password123') ||
        serialized.includes('temporaryPassword')
      ) {
        hasPasswordInLogs = true;
      }
    }

    recordTest(
      14,
      'Audit logs record admission and password reset events without recording plaintext passwords',
      auditLogs.length >= 2 && !hasPasswordInLogs,
      `Logs found: ${auditLogs.length}, hasPassword: ${hasPasswordInLogs}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Student and Parent Account Activation & Deactivation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Account Status Toggle (Active / Inactive) ---');
    // Deactivate student login account
    const deactivateRes = await fetch(`${BASE_URL}/students/${student1.id}/account-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({ isActive: false }),
    });

    const userAfterDeactivation = await prisma.user.findUnique({ where: { id: studentDbUser!.id } });

    // Reactivate student login account
    const reactivateRes = await fetch(`${BASE_URL}/students/${student1.id}/account-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaffA}`,
      },
      body: JSON.stringify({ isActive: true }),
    });

    const userAfterReactivation = await prisma.user.findUnique({ where: { id: studentDbUser!.id } });

    recordTest(
      15,
      'Authorized staff can activate and deactivate student login accounts',
      deactivateRes.status === 200 &&
        userAfterDeactivation?.isActive === false &&
        reactivateRes.status === 200 &&
        userAfterReactivation?.isActive === true,
      `deactStatus: ${deactivateRes.status}, reactStatus: ${reactivateRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 16: Student Login by Admission Number
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Login by Admission Number ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: student1.admissionNumber, // Login using admission number!
        password: newTempPassword,
        instituteCode: instA.code,
      }),
    });
    const loginData = await loginRes.json();

    recordTest(
      16,
      'Student can log in using their official Admission Number as login identifier',
      loginRes.status === 200 &&
        loginData.success === true &&
        loginData.data?.user?.role === 'STUDENT' &&
        !!loginData.data?.accessToken,
      `Status: ${loginRes.status}, error: ${loginData.error}`
    );

    // -------------------------------------------------------------------------
    // TEST RESULTS SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('                          TEST RESULTS SUMMARY                          ');
    console.log('========================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    console.log(`Total Tests Run: ${results.length}`);
    console.log(`Passed:         ${passedCount}`);
    console.log(`Failed:         ${failedCount}`);
    console.log('========================================================================\n');

    if (failedCount > 0) {
      console.error('❌ SOME TESTS FAILED:');
      results.filter((r) => !r.passed).forEach((r) => console.error(`  - Test ${r.num}: ${r.name} -> ${r.error}`));
      process.exit(1);
    } else {
      console.log('🎉 ALL 16 STUDENT & PARENT CREDENTIALS TESTS PASSED!\n');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCredentialsTestSuite();
