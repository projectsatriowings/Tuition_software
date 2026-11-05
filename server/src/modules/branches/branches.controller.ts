import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { BranchesService } from './branches.service.js';

export async function listBranches(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const { search, isActive } = req.query;
    const branches = await BranchesService.listBranches(instituteId, {
      search: search as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      staffUserId: req.user?.userId,
      role: req.user?.role,
    });

    return res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (err: any) {
    console.error('[listBranches error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list branches' });
  }
}

export async function getBranchDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const branch = await BranchesService.getBranchById(instituteId, id);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    return res.json({
      success: true,
      data: branch,
    });
  } catch (err: any) {
    console.error('[getBranchDetails error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to get branch details' });
  }
}

export async function createBranch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Branch name is required' });
    }

    const branch = await BranchesService.createBranch(instituteId, req.body, req.user?.userId || 'system');
    return res.status(201).json({
      success: true,
      message: `Branch "${branch.name}" (${branch.code}) created successfully`,
      data: branch,
    });
  } catch (err: any) {
    console.error('[createBranch error]', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create branch' });
  }
}

export async function updateBranch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const updated = await BranchesService.updateBranch(instituteId, id, req.body, req.user?.userId || 'system');
    return res.json({
      success: true,
      message: `Branch "${updated.name}" updated successfully`,
      data: updated,
    });
  } catch (err: any) {
    console.error('[updateBranch error]', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update branch' });
  }
}

export async function checkDeactivationSafety(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const safety = await BranchesService.checkDeactivationSafety(instituteId, id);
    return res.json({
      success: true,
      data: safety,
    });
  } catch (err: any) {
    console.error('[checkDeactivationSafety error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function deactivateBranch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;
    const { force } = req.body || {};
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const result = await BranchesService.deactivateBranch(
      instituteId,
      id,
      req.user?.userId || 'system',
      Boolean(force)
    );

    return res.json({
      success: true,
      message: `Branch "${result.name}" deactivated successfully`,
      data: result,
    });
  } catch (err: any) {
    console.error('[deactivateBranch error]', err);
    return res.status(400).json({
      success: false,
      error: err.message,
      safety: err.safety || null,
    });
  }
}

export async function reactivateBranch(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id } = req.params;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const result = await BranchesService.reactivateBranch(instituteId, id, req.user?.userId || 'system');
    return res.json({
      success: true,
      message: `Branch "${result.name}" reactivated successfully`,
      data: result,
    });
  } catch (err: any) {
    console.error('[reactivateBranch error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function assignStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { id: branchId } = req.params;
    const { staffProfileId, assignmentType, role, isPrimary, effectiveFrom, effectiveTo, notes } = req.body;

    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }
    if (!staffProfileId) {
      return res.status(400).json({ success: false, error: 'Staff profile ID is required' });
    }

    const assignment = await BranchesService.assignStaff(
      instituteId,
      {
        branchId,
        staffProfileId,
        assignmentType,
        role,
        isPrimary,
        effectiveFrom,
        effectiveTo,
        notes,
      },
      req.user?.userId || 'system'
    );

    return res.status(201).json({
      success: true,
      message: 'Staff assigned to branch successfully',
      data: assignment,
    });
  } catch (err: any) {
    console.error('[assignStaff error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function removeStaffAssignment(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { assignmentId } = req.params;

    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const result = await BranchesService.removeStaffAssignment(
      instituteId,
      assignmentId,
      req.user?.userId || 'system'
    );

    return res.json({
      success: true,
      message: 'Staff assignment removed successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('[removeStaffAssignment error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function checkScheduleConflict(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { staffProfileId } = req.params;
    const { schedule, excludeBatchId } = req.query;

    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const conflict = await BranchesService.checkTeacherScheduleConflict(
      instituteId,
      staffProfileId,
      schedule as string,
      excludeBatchId as string
    );

    return res.json({
      success: true,
      data: conflict,
    });
  } catch (err: any) {
    console.error('[checkScheduleConflict error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function transferStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    const { studentId, toBranchId, effectiveDate, reason, transferFeesPolicy, notes } = req.body;

    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }
    if (!studentId || !toBranchId || !reason) {
      return res.status(400).json({ success: false, error: 'studentId, toBranchId, and reason are required' });
    }

    const transfer = await BranchesService.transferStudent(
      instituteId,
      {
        studentId,
        toBranchId,
        effectiveDate,
        reason,
        transferFeesPolicy,
        notes,
      },
      req.user?.userId || 'system'
    );

    return res.json(transfer);
  } catch (err: any) {
    console.error('[transferStudent error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

export async function getConsolidatedSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const instituteId = req.instituteId;
    if (!instituteId) {
      return res.status(400).json({ success: false, error: 'Institute context required' });
    }

    const summary = await BranchesService.getConsolidatedSummary(instituteId);
    return res.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    console.error('[getConsolidatedSummary error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

