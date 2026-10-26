// User Roles across the platform
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACADEMIC_ADMIN = 'ACADEMIC_ADMIN',
  STAFF = 'STAFF',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
}

// Student Status
export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  PASSED_OUT = 'PASSED_OUT',
  DISCONTINUED = 'DISCONTINUED',
}

// Institute Status
export enum InstituteStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_SETUP = 'PENDING_SETUP',
}

// Attendance Event & Status
export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

// Fee Types & Statuses
export enum FeeFrequency {
  MONTHLY = 'MONTHLY',
  TERM_WISE = 'TERM_WISE',
  ONE_TIME = 'ONE_TIME',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  ONLINE = 'ONLINE',
}

// Learning Materials
export enum MaterialType {
  PDF = 'PDF',
  AUDIO = 'AUDIO',
  VOICE_NOTE = 'VOICE_NOTE',
  HOMEWORK = 'HOMEWORK',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

// SMS Notification Delivery
export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

// Guardian Relation
export enum GuardianRelation {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GUARDIAN = 'GUARDIAN',
}

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

export enum AttendanceMethod {
  MANUAL = 'MANUAL',
  QR_SCAN = 'QR_SCAN',
  VOICE_CONFIRMED = 'VOICE_CONFIRMED',
}

// Export Shared Design Tokens
export * from './theme';
export * from './voiceMatching';
