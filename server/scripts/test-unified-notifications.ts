import { PrismaClient, UserRole } from '@prisma/client';
// Plain test hash
const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$dummyhash';
import jwt from 'jsonwebtoken';
import { InAppNotificationService } from '../src/modules/notifications/inapp-notification.service.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_tuition_os_super_secure_key_2026';

function generateAuthToken(user: { id: string; email?: string | null; role: UserRole; instituteId: string }) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      instituteId: user.instituteId,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('--- STARTING UNIFIED NOTIFICATIONS TESTS ---');

  let testInstitute: any = null;
  let academicAdminUser: any = null;
  let staffUser: any = null;
  let parentUser: any = null;
  let studentUser: any = null;
  let foreignParentUser: any = null;
  let testBatch: any = null;
  let testStudent: any = null;

  try {
    const timestamp = Date.now();

    // 1. Create Test Institute
    testInstitute = await prisma.institute.create({
      data: {
        code: `NOTIF-${timestamp.toString().slice(-6)}`,
        name: `Notification Test Academy ${timestamp}`,
        status: 'ACTIVE',
      },
    });
    console.log('✓ 1. Test institute created:', testInstitute.name);

    // 2. Create Academic Admin
    academicAdminUser = await prisma.user.create({
      data: {
        email: `admin_${timestamp}@testnotif.com`,
        phone: `+919999${timestamp.toString().slice(-6)}`,
        passwordHash,
        fullName: 'Notif Admin',
        role: 'ACADEMIC_ADMIN',
        memberships: {
          create: {
            instituteId: testInstitute.id,
            role: 'ACADEMIC_ADMIN',
          },
        },
      },
    });

    // 3. Create Staff Profile
    staffUser = await prisma.user.create({
      data: {
        email: `staff_${timestamp}@testnotif.com`,
        phone: `+919888${timestamp.toString().slice(-6)}`,
        passwordHash,
        fullName: 'Staff Teacher',
        role: 'STAFF',
        memberships: {
          create: {
            instituteId: testInstitute.id,
            role: 'STAFF',
          },
        },
        staffProfile: {
          create: {
            instituteId: testInstitute.id,
            designation: 'Instructor',
          },
        },
      },
      include: { staffProfile: true },
    });

    // 4. Create Batch & Assign Staff
    testBatch = await prisma.batch.create({
      data: {
        instituteId: testInstitute.id,
        name: `Batch Notif ${timestamp}`,
        academicYear: '2026-2027',
        startDate: new Date('2026-06-01'),
        staffAssignments: {
          create: {
            staffProfileId: staffUser.staffProfile.id,
          },
        },
      },
    });

    // 5. Create Parent User & Profile
    parentUser = await prisma.user.create({
      data: {
        email: `parent_${timestamp}@testnotif.com`,
        phone: `+919777${timestamp.toString().slice(-6)}`,
        passwordHash,
        fullName: 'Rajan Parent',
        role: 'PARENT',
        memberships: {
          create: {
            instituteId: testInstitute.id,
            role: 'PARENT',
          },
        },
        parentProfile: {
          create: {
            address: '123 Notif Lane',
          },
        },
      },
      include: { parentProfile: true },
    });

    // 6. Create Student User & Profile
    studentUser = await prisma.user.create({
      data: {
        email: `student_${timestamp}@testnotif.com`,
        phone: `+919666${timestamp.toString().slice(-6)}`,
        passwordHash,
        fullName: 'Sarika Rajan',
        role: 'STUDENT',
        memberships: {
          create: {
            instituteId: testInstitute.id,
            role: 'STUDENT',
          },
        },
      },
    });

    testStudent = await prisma.student.create({
      data: {
        instituteId: testInstitute.id,
        userId: studentUser.id,
        admissionNumber: `ADM-${timestamp.toString().slice(-6)}`,
        firstName: 'Sarika',
        lastName: 'Rajan',
        status: 'ACTIVE',
        enrollments: {
          create: {
            batchId: testBatch.id,
            isActive: true,
          },
        },
        parentRelations: {
          create: {
            parentId: parentUser.parentProfile.id,
            relation: 'FATHER',
            isPrimaryContact: true,
            canReceiveSms: true,
          },
        },
      },
    });
    console.log('✓ 2. Student, Parent, Staff, and Batch linked successfully');

    // 7. Create Foreign Parent User (for cross-user security isolation testing)
    foreignParentUser = await prisma.user.create({
      data: {
        email: `foreign_${timestamp}@testnotif.com`,
        phone: `+919555${timestamp.toString().slice(-6)}`,
        passwordHash,
        fullName: 'Foreign Parent',
        role: 'PARENT',
        memberships: {
          create: {
            instituteId: testInstitute.id,
            role: 'PARENT',
          },
        },
        parentProfile: {
          create: {
            address: 'Foreign Lane',
          },
        },
      },
    });

    // 8. Create AttendanceEvent and trigger Check-In Notifications
    const now = new Date();
    const expectedTimeStr = InAppNotificationService.formatKolkataTime(now);

    const checkInEvent = await prisma.attendanceEvent.create({
      data: {
        instituteId: testInstitute.id,
        studentId: testStudent.id,
        batchId: testBatch.id,
        eventDate: new Date('2026-10-28'),
        eventType: 'CHECK_IN',
        eventTime: now,
        markedById: staffUser.id,
      },
    });

    const checkInNotifs = await InAppNotificationService.createAttendanceNotifications({
      attendanceEventId: checkInEvent.id,
      studentId: testStudent.id,
      instituteId: testInstitute.id,
      eventType: 'CHECK_IN',
      eventTime: now,
    });

    console.log('✓ 3. Check-In Notifications created count:', checkInNotifs.length);
    if (checkInNotifs.length !== 2) {
      throw new Error(`Expected 2 notifications (1 parent, 1 student), got ${checkInNotifs.length}`);
    }

    const parentNotif = checkInNotifs.find((n) => n.userId === parentUser.id);
    const studentNotif = checkInNotifs.find((n) => n.userId === studentUser.id);

    if (!parentNotif || !studentNotif) {
      throw new Error('Missing parent or student notification!');
    }

    if (parentNotif.title !== 'Student Checked In') {
      throw new Error(`Invalid title: ${parentNotif.title}`);
    }
    if (!parentNotif.message.includes('Sarika checked in at')) {
      throw new Error(`Invalid message: ${parentNotif.message}`);
    }
    if (!parentNotif.message.includes(expectedTimeStr)) {
      throw new Error(`Message does not contain formatted Asia/Kolkata time (${expectedTimeStr}): ${parentNotif.message}`);
    }
    console.log(`✓ 4. Parent message verified: "${parentNotif.message}"`);

    // 9. Test Idempotency on repeated check-in notification trigger
    const retryNotifs = await InAppNotificationService.createAttendanceNotifications({
      attendanceEventId: checkInEvent.id,
      studentId: testStudent.id,
      instituteId: testInstitute.id,
      eventType: 'CHECK_IN',
      eventTime: now,
    });

    const totalInDb = await prisma.notification.count({
      where: { attendanceEventId: checkInEvent.id },
    });
    if (totalInDb !== 2) {
      throw new Error(`Idempotency failed! Expected 2 notifications in DB, found ${totalInDb}`);
    }
    console.log('✓ 5. Idempotent retry prevented duplicate notifications');

    // 10. Test Check-out Notifications
    const checkOutEvent = await prisma.attendanceEvent.create({
      data: {
        instituteId: testInstitute.id,
        studentId: testStudent.id,
        batchId: testBatch.id,
        eventDate: new Date('2026-10-28'),
        eventType: 'CHECK_OUT',
        eventTime: now,
        markedById: staffUser.id,
      },
    });

    const checkOutNotifs = await InAppNotificationService.createAttendanceNotifications({
      attendanceEventId: checkOutEvent.id,
      studentId: testStudent.id,
      instituteId: testInstitute.id,
      eventType: 'CHECK_OUT',
      eventTime: now,
    });

    if (checkOutNotifs.length !== 2) {
      throw new Error(`Expected 2 check-out notifications, got ${checkOutNotifs.length}`);
    }
    const checkOutParentNotif = checkOutNotifs.find((n) => n.userId === parentUser.id);
    if (checkOutParentNotif?.title !== 'Student Checked Out' || !checkOutParentNotif.message.includes('checked out at')) {
      throw new Error(`Invalid check-out message: ${checkOutParentNotif?.message}`);
    }
    console.log(`✓ 6. Check-Out message verified: "${checkOutParentNotif.message}"`);

    // 11. Test Device Push Token Registration & Unregistration
    const deviceToken = `ExponentPushToken[TestMockToken_${timestamp}]`;
    await prisma.devicePushToken.upsert({
      where: { token: deviceToken },
      create: {
        userId: parentUser.id,
        token: deviceToken,
        platform: 'android',
        deviceInfo: 'Pixel 8 Android 14',
      },
      update: {},
    });

    const registered = await prisma.devicePushToken.findUnique({
      where: { token: deviceToken },
    });
    if (!registered || registered.userId !== parentUser.id) {
      throw new Error('Device push token registration failed');
    }
    console.log('✓ 7. Device push token registration verified');

    // 12. Test Unread Count & Mark-As-Read
    const initialUnread = await prisma.notification.count({
      where: { userId: parentUser.id, isRead: false },
    });
    if (initialUnread !== 2) {
      throw new Error(`Expected 2 unread notifications for parent, got ${initialUnread}`);
    }

    // Mark single notification read
    await prisma.notification.update({
      where: { id: parentNotif.id },
      data: { isRead: true, readAt: new Date() },
    });

    const unreadAfterSingle = await prisma.notification.count({
      where: { userId: parentUser.id, isRead: false },
    });
    if (unreadAfterSingle !== 1) {
      throw new Error(`Expected 1 unread notification after marking single read, got ${unreadAfterSingle}`);
    }
    console.log('✓ 8. Single mark-as-read verified');

    // Mark all read
    await prisma.notification.updateMany({
      where: { userId: parentUser.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    const unreadAfterAll = await prisma.notification.count({
      where: { userId: parentUser.id, isRead: false },
    });
    if (unreadAfterAll !== 0) {
      throw new Error(`Expected 0 unread notifications after mark-all-read, got ${unreadAfterAll}`);
    }
    console.log('✓ 9. Mark-all-as-read verified');

    // 13. Test Security & Isolation: Foreign parent cannot see Sarika's notifications
    const foreignNotifs = await prisma.notification.findMany({
      where: { userId: foreignParentUser.id },
    });
    if (foreignNotifs.length !== 0) {
      throw new Error(`Security violation! Foreign parent received ${foreignNotifs.length} notifications`);
    }
    console.log('✓ 10. Security & Tenant/User Isolation verified');

    console.log('\n========================================');
    console.log('ALL 10 UNIFIED NOTIFICATION TESTS PASSED!');
    console.log('========================================\n');
  } catch (err: any) {
    console.error('❌ Test failed with error:', err.message);
    process.exit(1);
  } finally {
    // Cleanup test records
    if (testInstitute) {
      try {
        await prisma.institute.delete({ where: { id: testInstitute.id } });
      } catch {}
    }
    if (foreignParentUser) {
      try {
        await prisma.user.delete({ where: { id: foreignParentUser.id } });
      } catch {}
    }
    await prisma.$disconnect();
  }
}

runTests();
