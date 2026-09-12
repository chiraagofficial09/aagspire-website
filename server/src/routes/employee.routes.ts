import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

import { getEmployeeDashboard } from '../controllers/analytics.controller.js';
import { listProjects, getProjectById, updateProjectStatusByEmployee } from '../controllers/project.controller.js';
import { listWorkLogs, createWorkLog, updateWorkLog } from '../controllers/workLog.controller.js';
import {
  getTodayClockStatus,
  clockIn,
  clockOut,
  listAttendance,
} from '../controllers/attendance.controller.js';
import { calculateEmployeeEarnings } from '../services/earnings.service.js';
import { listSettlements } from '../controllers/settlement.controller.js';
import { listReceipts, getReceiptById, downloadReceiptPdf } from '../controllers/receipt.controller.js';

const router = Router();

// Strict Employee Gate
router.use(authenticate, requireRole('employee'));

// Dashboard
router.get('/dashboard', getEmployeeDashboard);

// Assigned Projects
router.get('/projects', listProjects);
router.get('/projects/:id', getProjectById);
router.patch('/projects/:id/status', updateProjectStatusByEmployee);
router.patch('/projects/:id', updateProjectStatusByEmployee);

// Work Logs
router.get('/work-logs', listWorkLogs);
router.post('/work-logs', createWorkLog);
router.put('/work-logs/:id', updateWorkLog);

// Attendance & Clock In / Out
router.get('/attendance/today', getTodayClockStatus);
router.post('/attendance/clock-in', clockIn);
router.post('/attendance/clock-out', clockOut);
router.get('/attendance', listAttendance);

// Earnings
router.get('/earnings', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.employee) {
      res.status(400).json({ success: false, message: 'Employee profile not linked.' });
      return;
    }
    const earnings = await calculateEmployeeEarnings(req.employee._id);
    const fullPayload = {
      summary: earnings.summary,
      projectBreakdown: earnings.projects,
      earnings,
    };
    res.json({
      success: true,
      data: fullPayload,
      ...fullPayload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Settlements
router.get('/settlements', listSettlements);

// Receipts
router.get('/receipts', listReceipts);
router.get('/receipts/:id', getReceiptById);
router.get('/receipts/:id/download', downloadReceiptPdf);
router.get('/receipts/:id/pdf', downloadReceiptPdf);

// Profile
router.get('/profile', (req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, employee: req.employee });
});

router.put('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.employee) {
      res.status(400).json({ success: false, message: 'Employee profile not linked.' });
      return;
    }

    const allowed = ['phone', 'address', 'upiId', 'bankDetails'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        (req.employee as any)[field] = req.body[field];
      }
    });

    await (req.employee as any).save();
    res.json({ success: true, message: 'Profile updated successfully.', employee: req.employee });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
