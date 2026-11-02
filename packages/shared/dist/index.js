// User Roles across the platform
export const UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ACADEMIC_ADMIN: 'ACADEMIC_ADMIN',
    STAFF: 'STAFF',
    PARENT: 'PARENT',
    STUDENT: 'STUDENT',
};
// Student Status
export const StudentStatus = {
    ACTIVE: 'ACTIVE',
    PASSED_OUT: 'PASSED_OUT',
    DISCONTINUED: 'DISCONTINUED',
};
// Institute Status
export const InstituteStatus = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    PENDING_SETUP: 'PENDING_SETUP',
};
// Attendance Event & Status
export const AttendanceType = {
    CHECK_IN: 'CHECK_IN',
    CHECK_OUT: 'CHECK_OUT',
};
export const AttendanceStatus = {
    PRESENT: 'PRESENT',
    ABSENT: 'ABSENT',
    LATE: 'LATE',
    EXCUSED: 'EXCUSED',
};
// Fee Types & Statuses
export const FeeFrequency = {
    MONTHLY: 'MONTHLY',
    TERM_WISE: 'TERM_WISE',
    ONE_TIME: 'ONE_TIME',
};
export const PaymentStatus = {
    PENDING: 'PENDING',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
};
export const PaymentMethod = {
    CASH: 'CASH',
    UPI: 'UPI',
    BANK_TRANSFER: 'BANK_TRANSFER',
    CHEQUE: 'CHEQUE',
    ONLINE: 'ONLINE',
};
// Learning Materials
export const MaterialType = {
    PDF: 'PDF',
    AUDIO: 'AUDIO',
    VOICE_NOTE: 'VOICE_NOTE',
    HOMEWORK: 'HOMEWORK',
    ANNOUNCEMENT: 'ANNOUNCEMENT',
};
// SMS Notification Delivery
export const NotificationStatus = {
    QUEUED: 'QUEUED',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    FAILED: 'FAILED',
};
// Guardian Relation
export const GuardianRelation = {
    FATHER: 'FATHER',
    MOTHER: 'MOTHER',
    GUARDIAN: 'GUARDIAN',
};
export const AttendanceMethod = {
    MANUAL: 'MANUAL',
    QR_SCAN: 'QR_SCAN',
    VOICE_CONFIRMED: 'VOICE_CONFIRMED',
};
// Export Shared Design Tokens
export * from './theme.js';
export * from './voiceMatching.js';
