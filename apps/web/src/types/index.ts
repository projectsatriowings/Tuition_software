export type UserRole = 'SUPER_ADMIN' | 'ACADEMIC_ADMIN' | 'STAFF' | 'PARENT' | 'STUDENT';
export type InstituteStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP';
export type StudentStatus = 'ACTIVE' | 'PASSED_OUT' | 'DISCONTINUED';

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
}

export interface Institute {
  id: string;
  code: string;
  name: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  status: InstituteStatus;
  createdAt: string;
  _count?: {
    students: number;
    staffProfiles: number;
    batches: number;
    subjects?: number;
  };
}

export interface StaffMember {
  id: string;
  instituteId: string;
  userId: string;
  employeeCode?: string | null;
  designation: string;
  qualification?: string | null;
  permissionsJson?: Record<string, any> | null;
  createdAt: string;
  user: User;
  assignments?: Array<{
    id: string;
    batch: {
      id: string;
      name: string;
      academicYear: string;
    };
  }>;
}

export interface Student {
  id: string;
  instituteId: string;
  userId?: string | null;
  admissionNumber: string;
  rollNumber?: string | null;
  firstName: string;
  lastName: string;
  dob?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  status: StudentStatus;
  admissionDate: string;
  photoUrl?: string | null;
  createdByUserId?: string | null;
  createdByUser?: User | null;
  notes?: string | null;
  enrollments?: Array<{
    id: string;
    batch: {
      id: string;
      name: string;
      academicYear: string;
    };
  }>;
  parentRelations?: Array<{
    id: string;
    relation: string;
    isPrimaryContact: boolean;
    canReceiveSms: boolean;
    parent: {
      id: string;
      user: {
        id: string;
        fullName: string;
        phone: string | null;
        email: string | null;
      };
    };
  }>;
}

export interface Parent {
  id: string;
  userId: string;
  occupation?: string | null;
  address?: string | null;
  altPhone?: string | null;
  isPhoneVerified: boolean;
  createdAt: string;
  user: User;
  studentRelations?: Array<{
    id: string;
    relation: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      admissionNumber: string;
      rollNumber?: string | null;
      status: StudentStatus;
    };
  }>;
}

export interface Batch {
  id: string;
  instituteId: string;
  name: string;
  code?: string | null;
  academicYear: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  schedule?: string | null;
  isActive: boolean;
  batchSubjects?: Array<{
    id: string;
    batchId?: string;
    subjectId: string;
    description?: string | null;
    schedule?: string | null;
    isActive?: boolean;
    staffProfileId?: string | null;
    staffProfile?: {
      id: string;
      user: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
      };
    } | null;
    subject: Subject;
  }>;
  staffAssignments?: Array<{
    id: string;
    staffProfileId: string;
    staffProfile: {
      id: string;
      user: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
      };
    };
  }>;
  enrollments?: Array<{
    id: string;
    studentId: string;
    isActive: boolean;
    student: {
      id: string;
      admissionNumber: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      photoUrl?: string | null;
      status: StudentStatus;
    };
    subject?: {
      id: string;
      name: string;
      code?: string | null;
    } | null;
  }>;
  enrolledStudents?: Array<{
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    photoUrl?: string | null;
    status: StudentStatus;
    enrolledAt?: string;
    allocatedSubjects?: Array<{
      id: string;
      name: string;
      code?: string | null;
    }>;
  }>;
  _count?: {
    enrollments: number;
    staffAssignments: number;
    batchSubjects?: number;
  };
}

export interface Subject {
  id: string;
  instituteId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  _count?: {
    batchSubjects?: number;
    enrollments?: number;
  };
}
