// User Roles across the platform
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ACADEMIC_ADMIN: 'ACADEMIC_ADMIN',
  STAFF: 'STAFF',
  PARENT: 'PARENT',
  STUDENT: 'STUDENT',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Student Status
export const StudentStatus = {
  ACTIVE: 'ACTIVE',
  PASSED_OUT: 'PASSED_OUT',
  DISCONTINUED: 'DISCONTINUED',
} as const;
export type StudentStatus = (typeof StudentStatus)[keyof typeof StudentStatus];

// Institute Status
export const InstituteStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_SETUP: 'PENDING_SETUP',
} as const;
export type InstituteStatus = (typeof InstituteStatus)[keyof typeof InstituteStatus];

// Attendance Event & Status
export const AttendanceType = {
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
} as const;
export type AttendanceType = (typeof AttendanceType)[keyof typeof AttendanceType];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

// Fee Types & Statuses
export const FeeFrequency = {
  MONTHLY: 'MONTHLY',
  TERM_WISE: 'TERM_WISE',
  ONE_TIME: 'ONE_TIME',
} as const;
export type FeeFrequency = (typeof FeeFrequency)[keyof typeof FeeFrequency];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHEQUE: 'CHEQUE',
  ONLINE: 'ONLINE',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// Learning Materials
export const MaterialType = {
  PDF: 'PDF',
  AUDIO: 'AUDIO',
  VOICE_NOTE: 'VOICE_NOTE',
  HOMEWORK: 'HOMEWORK',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
} as const;
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

// SMS Notification Delivery
export const NotificationStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

// Guardian Relation
export const GuardianRelation = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  GUARDIAN: 'GUARDIAN',
} as const;
export type GuardianRelation = (typeof GuardianRelation)[keyof typeof GuardianRelation];

// Global Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Student Admission Payload
export interface StudentAdmissionPayload {
  firstName: string;
  lastName: string;
  studentPhone?: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  notes?: string;
  admissionDate?: string;
  batchId?: string;
  createLoginAccount?: boolean;
  email?: string;
  phone?: string;
  initialPassword?: string;
  parentFullName?: string;
  parentRelationship?: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  parentPhone?: string;
  parentEmail?: string;
  parentInitialPassword?: string;
  parentCanReceiveSms?: boolean;
}

// Common Standard API Response Format
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export const AttendanceMethod = {
  MANUAL: 'MANUAL',
  QR_SCAN: 'QR_SCAN',
  VOICE_CONFIRMED: 'VOICE_CONFIRMED',
} as const;
export type AttendanceMethod = (typeof AttendanceMethod)[keyof typeof AttendanceMethod];

// Export Shared Design Tokens
export * from './theme.js';
export * from './voiceMatching.js';
