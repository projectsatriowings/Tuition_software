import { Router } from 'express';
import {
  getInstituteAttendanceConfig,
  updateInstituteAttendanceConfig,
  getStaffTodayStatus,
  staffCheckIn,
  staffCheckOut,
  getStaffPersonalHistory,
  getAdminDashboardSummary,
  getAdminDailyRegister,
  getAdminSessionDetails,
  manualCorrection,
  getAdminMonthlyReport,
} from './staff-attendance.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

// Apply base authentication and institute context across all staff attendance routes
router.use(authenticateToken);
router.use(requireInstituteContext);

// 1. Institute Location & Geofence Configuration
router.get('/config', getInstituteAttendanceConfig);
router.put('/config', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateInstituteAttendanceConfig);

// 2. Staff Check-In / Check-Out & Personal History
router.get('/today', requireRole('STAFF', 'ACADEMIC_ADMIN', 'SUPER_ADMIN'), getStaffTodayStatus);
router.post('/check-in', requireRole('STAFF', 'ACADEMIC_ADMIN', 'SUPER_ADMIN'), staffCheckIn);
router.post('/check-out', requireRole('STAFF', 'ACADEMIC_ADMIN', 'SUPER_ADMIN'), staffCheckOut);
router.get('/my-history', requireRole('STAFF', 'ACADEMIC_ADMIN', 'SUPER_ADMIN'), getStaffPersonalHistory);

// 3. Academic Admin Dashboard, Register, Corrections & Reports
router.get('/admin/dashboard', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), getAdminDashboardSummary);
router.get('/admin/daily-register', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), getAdminDailyRegister);
router.get('/admin/session/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), getAdminSessionDetails);
router.post('/admin/correct', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), manualCorrection);
router.get('/admin/monthly-report', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), getAdminMonthlyReport);

export default router;

