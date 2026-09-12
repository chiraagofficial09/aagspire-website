import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

import {
  listEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  payEmployeeDirect,
  listEmployeePayouts,
  deleteEmployeePayout,
} from '../controllers/employee.controller.js';

import {
  listClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  downloadClientStatementPdf,
  getInvoiceCounter,
  updateInvoiceCounter,
} from '../controllers/client.controller.js';

import {
  listProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  updateEmployeeAllocations,
} from '../controllers/project.controller.js';

import {
  getPresets,
  createPreset,
  deletePreset,
  updateProjectCommission,
  getCommissionHistory,
} from '../controllers/commission.controller.js';

import { listPayments, createPayment, deletePayment } from '../controllers/payment.controller.js';
import { listWorkLogs, reviewWorkLog, deleteWorkLog } from '../controllers/workLog.controller.js';
import { listAttendance, manualAdjustAttendance } from '../controllers/attendance.controller.js';
import {
  listSettlements,
  previewSettlement,
  createSettlement,
  approveSettlement,
  paySettlement,
} from '../controllers/settlement.controller.js';

import { listReceipts, getReceiptById, downloadReceiptPdf } from '../controllers/receipt.controller.js';
import { getAdminAnalytics } from '../controllers/analytics.controller.js';
import { exportReportCsv } from '../controllers/report.controller.js';
import { calculateEmployeeEarnings } from '../services/earnings.service.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { Project } from '../models/Project.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { fromDecimal } from '../utils/decimalHelper.js';

const router = Router();

// Strict Admin Gate
router.use(authenticate, requireRole('admin'));

// Dashboard & Analytics
router.get('/dashboard', getAdminAnalytics);
router.get('/analytics/dashboard', getAdminAnalytics);
router.get('/analytics/overview', getAdminAnalytics);

// Employees
router.get('/employees', listEmployees);
router.post('/employees', createEmployee);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id', updateEmployee);
router.patch('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.patch('/employees/:id/status', toggleEmployeeStatus);
router.post('/employees/:id/pay', payEmployeeDirect);
router.get('/employees/:id/payouts', listEmployeePayouts);
router.delete('/employees/:id/payouts/:payoutId', deleteEmployeePayout);
router.get('/employees/:id/earnings', async (req, res) => {
  try {
    const earnings = await calculateEmployeeEarnings(new Types.ObjectId(req.params.id));
    res.json({ success: true, data: earnings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clients
router.get('/clients/invoice-counter', getInvoiceCounter);
router.post('/clients/invoice-counter', updateInvoiceCounter);
router.get('/clients', listClients);
router.post('/clients', createClient);
router.get('/clients/:id', getClientById);
router.get('/clients/:id/pdf', downloadClientStatementPdf);
router.get('/clients/:id/statement-pdf', downloadClientStatementPdf);
router.put('/clients/:id', updateClient);
router.patch('/clients/:id', updateClient);
router.delete('/clients/:id', deleteClient);

// Projects
router.get('/projects', listProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProjectById);
router.put('/projects/:id', updateProject);
router.patch('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);
router.put('/projects/:id/employees', updateEmployeeAllocations);

// Project sub-resources
router.get('/projects/:id/team', async (req, res) => {
  try {
    const team = await ProjectEmployee.find({ projectId: req.params.id }).populate('employeeId');
    res.json({ success: true, data: team });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/projects/:id/team', async (req, res) => {
  try {
    const { employeeId, sharePercentage, sharePercent, roleInProject } = req.body;
    const finalShare = Number(sharePercent ?? sharePercentage ?? 100);
    const item = await ProjectEmployee.findOneAndUpdate(
      { projectId: req.params.id, employeeId },
      { sharePercent: finalShare, sharePercentage: finalShare, roleInProject: roleInProject || 'Creator' },
      { upsert: true, new: true }
    );
    await Project.findByIdAndUpdate(req.params.id, { $addToSet: { assignedEmployees: employeeId } });
    res.json({ success: true, data: item, item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/projects/:id/team/:memberId', async (req, res) => {
  try {
    const item = await ProjectEmployee.findByIdAndDelete(req.params.memberId);
    if (item) {
      await Project.findByIdAndUpdate(req.params.id, { $pull: { assignedEmployees: item.employeeId } });
    }
    res.json({ success: true, message: 'Member removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/projects/:id/commission', async (req, res) => {
  try {
    const commission = await ProjectCommission.findOne({ projectId: req.params.id });
    if (!commission) {
      return res.json({ success: true, data: null, commission: null });
    }
    const data = {
      ...commission.toObject(),
      brokerPercent: commission.brokerPercent,
      brokerPercentage: commission.brokerPercent,
      employeePercent: commission.employeePercent,
      employeePercentage: commission.employeePercent,
      officePercent: commission.officePercent,
      officeExpensePercentage: commission.officePercent,
      adminPercent: commission.adminPercent,
      adminSharePercentage: commission.adminPercent,
      settlementPercent: commission.settlementPercent,
      settlementReservePercentage: commission.settlementPercent,
      brokerAmount: fromDecimal(commission.brokerAmount),
      employeeAmount: fromDecimal(commission.employeeAmount),
      officeAmount: fromDecimal(commission.officeAmount),
      adminAmount: fromDecimal(commission.adminAmount),
      settlementAmount: fromDecimal(commission.settlementAmount),
    };
    res.json({ success: true, data, commission: data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/projects/:id/commission', updateProjectCommission);
router.get('/projects/:id/commission/history', getCommissionHistory);

router.get('/projects/:id/financials', async (req, res) => {
  try {
    const payments = await ClientPayment.find({ projectId: req.params.id });
    const collectedAmount = payments.reduce((sum, p) => sum + fromDecimal(p.amount), 0);
    const comm = await ProjectCommission.findOne({ projectId: req.params.id });
    const prj = await Project.findById(req.params.id);
    const totalVal = prj ? fromDecimal(prj.projectValue) : 0;
    
    const empPoolPct = comm?.employeePercent || 0;
    const adminPct = comm?.adminPercent || 0;
    
    const employeePoolTotal = (totalVal * empPoolPct) / 100;
    const employeeEarnedTotal = (collectedAmount * empPoolPct) / 100;
    const adminEarnedShare = (collectedAmount * adminPct) / 100;

    res.json({
      success: true,
      data: {
        totalAmount: totalVal,
        collectedAmount,
        employeePoolTotal,
        employeeEarnedTotal,
        adminEarnedShare,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Commission Presets & Edits
router.get('/commissions/presets', getPresets);
router.post('/commissions/presets', createPreset);
router.delete('/commissions/presets/:id', deletePreset);
router.put('/commissions/projects/:projectId', updateProjectCommission);
router.get('/commissions/projects/:projectId/history', getCommissionHistory);

// Client Payments
router.get('/payments', listPayments);
router.post('/payments', createPayment);
router.delete('/payments/:id', deletePayment);

// Work Logs Review
router.get('/work-logs', listWorkLogs);
router.patch('/work-logs/:id/status', reviewWorkLog);
router.delete('/work-logs/:id', deleteWorkLog);

// Attendance Management
router.get('/attendance', listAttendance);
router.post('/attendance/manual', manualAdjustAttendance);

// Settlements & Payments
router.get('/settlements', listSettlements);
router.get('/settlements/preview', previewSettlement);
router.post('/settlements', createSettlement);
router.patch('/settlements/:id/approve', approveSettlement);
router.post('/settlements/:id/pay', paySettlement);

// Receipts
router.get('/receipts', listReceipts);
router.get('/receipts/:id', getReceiptById);
router.get('/receipts/:id/download', downloadReceiptPdf);
router.get('/receipts/:id/pdf', downloadReceiptPdf);

// Reports
router.get('/reports/:type/export', exportReportCsv);

export default router;
