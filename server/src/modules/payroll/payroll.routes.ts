import { Router } from 'express';
import {
  authenticateToken,
  requireRole,
  requireInstituteContext,
} from '../../middleware/auth.js';
import {
  getPayrollDashboard,
  getPayrollPolicy,
  updatePayrollPolicy,
  listSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  listStaffSalaries,
  assignStaffSalary,
  getStaffSalaryHistory,
  generateMonthlyPayroll,
  listPayrollRuns,
  getPayrollRunDetails,
  approvePayrollRun,
  addPayrollAdjustment,
  recordSalaryPayment,
  getPayslipDetails,
  getMyPayslips,
  exportPayrollRegister,
} from './payroll.controller.js';

const router = Router();

// Enforce authentication across all payroll endpoints
router.use(authenticateToken);

// -------------------------------------------------------------
// STAFF SELF-SERVICE (TEACHING STAFF)
// -------------------------------------------------------------
router.get('/my-payslips', requireRole('STAFF', 'ACADEMIC_ADMIN', 'SUPER_ADMIN'), getMyPayslips);

// -------------------------------------------------------------
// ADMIN & PAYROLL OFFICER ROUTES (TENANT ISOLATED)
// -------------------------------------------------------------
const adminAuth = [requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), requireInstituteContext];

// Dashboard & Policies
router.get('/dashboard', ...adminAuth, getPayrollDashboard);
router.get('/policy', ...adminAuth, getPayrollPolicy);
router.put('/policy', ...adminAuth, updatePayrollPolicy);

// Salary Structures
router.get('/structures', ...adminAuth, listSalaryStructures);
router.post('/structures', ...adminAuth, createSalaryStructure);
router.put('/structures/:id', ...adminAuth, updateSalaryStructure);
router.delete('/structures/:id', ...adminAuth, deleteSalaryStructure);

// Staff Salary Setup
router.get('/staff-salaries', ...adminAuth, listStaffSalaries);
router.post('/staff-salaries', ...adminAuth, assignStaffSalary);
router.get('/staff-salaries/:staffId/history', ...adminAuth, getStaffSalaryHistory);

// Payroll Run Processing & Approval
router.get('/runs', ...adminAuth, listPayrollRuns);
router.post('/runs/generate', ...adminAuth, generateMonthlyPayroll);
router.get('/runs/:id', ...adminAuth, getPayrollRunDetails);
router.post('/runs/:id/recalculate', ...adminAuth, generateMonthlyPayroll);
router.post('/runs/:id/approve', ...adminAuth, approvePayrollRun);

// Adjustments & Payments
router.post('/records/:recordId/adjustments', ...adminAuth, addPayrollAdjustment);
router.post('/records/:recordId/payments', ...adminAuth, recordSalaryPayment);

// Payslips & Reports
router.get('/payslips/:recordId', ...adminAuth, getPayslipDetails);
router.get('/reports/register', ...adminAuth, exportPayrollRegister);

export default router;

