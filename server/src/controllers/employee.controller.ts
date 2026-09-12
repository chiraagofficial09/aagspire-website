import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { Employee } from '../models/Employee.js';
import { User } from '../models/User.js';
import { WorkLog } from '../models/WorkLog.js';
import { Types } from 'mongoose';
import { Settlement } from '../models/Settlement.js';
import { SettlementItem } from '../models/SettlementItem.js';
import { Receipt } from '../models/Receipt.js';
import { generateEmployeeCode, generateSettlementCode, generateReceiptCode } from '../utils/codeGenerator.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { calculateEmployeeEarnings } from '../services/earnings.service.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';

export async function listEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { search, status } = req.query;
    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { employeeCode: regex }, { designation: regex }];
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    const mapped = employees.map((emp) => ({
      ...emp.toObject(),
      name: emp.fullName,
      isActive: emp.status === 'active',
    }));
    res.json({ success: true, count: mapped.length, employees: mapped, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const fullName = req.body.fullName || req.body.name;
    const {
      email,
      password,
      phone,
      designation,
      department,
      joiningDate,
      defaultCommissionPercent,
      address,
      bankDetails,
      upiId,
    } = req.body;

    if (!fullName || !email) {
      res.status(400).json({ success: false, message: 'Full name and email are required.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    // Generate next sequential employee code
    const totalEmployees = await Employee.countDocuments();
    const employeeCode = generateEmployeeCode(totalEmployees + 1);

    // Create user account with default or provided password
    const rawPassword = password || 'Aagspire@123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await User.create({
      name: fullName,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'employee',
      status: 'active',
    });

    const employee = await Employee.create({
      userId: user._id,
      employeeCode,
      fullName,
      email: email.toLowerCase().trim(),
      phone,
      designation: designation || 'Design Specialist',
      department: department || 'Creative & Branding',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      defaultCommissionPercent: defaultCommissionPercent ?? 40,
      address,
      bankDetails,
      upiId,
      status: 'active',
    });

    await logAudit({
      userId: req.user!._id,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee._id,
      newValue: { employeeCode, fullName, email },
    });

    createNotification({
      role: 'admin',
      type: 'employee',
      title: 'New Team Member Added',
      message: `${fullName} (${employeeCode}) was onboarded as ${designation || 'Staff'}.`,
      link: '/admin/employees',
      metadata: { employeeId: employee._id },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Employee ${fullName} (${employeeCode}) created successfully.`,
      employee,
      initialPassword: password ? undefined : 'Aagspire@123',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEmployeeById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    // Get detailed financial earnings breakdown (includes all project allocations)
    const earnings = await calculateEmployeeEarnings(employee._id);

    // Get all work logs for this employee (checking both employee._id and employee.userId)
    const possibleEmpIds = [employee._id, employee.userId].filter(Boolean);
    const workLogs = await WorkLog.find({ employeeId: { $in: possibleEmpIds } })
      .populate('projectId', 'projectName projectCode status')
      .sort({ workDate: -1, createdAt: -1 });

    const formattedLogs = workLogs.map((log) => {
      const mins = log.totalMinutes || 0;
      return {
        ...log.toObject(),
        hoursWorked: mins > 0 ? Number((mins / 60).toFixed(1)) : 0,
        durationMinutes: mins,
        logDate: log.workDate,
      };
    });

    const mapped = {
      ...employee.toObject(),
      name: employee.fullName,
      isActive: employee.status === 'active',
      projects: earnings.projects || [],
      workLogs: formattedLogs,
    };

    res.json({
      success: true,
      data: mapped,
      employee: mapped,
      earnings,
      projects: earnings.projects || [],
      workLogs: formattedLogs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    const oldValue = employee.toObject();

    const allowedFields = [
      'fullName',
      'name',
      'phone',
      'designation',
      'department',
      'joiningDate',
      'defaultCommissionPercent',
      'address',
      'bankDetails',
      'upiId',
      'status',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'name') {
          employee.fullName = req.body[field];
        } else {
          (employee as any)[field] = req.body[field];
        }
      }
    });

    await employee.save();

    // Also update User name if fullName or name changed
    const updatedName = req.body.fullName || req.body.name;
    if (updatedName) {
      await User.findByIdAndUpdate(employee.userId, { name: updatedName });
    }

    await logAudit({
      userId: req.user!._id,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee._id,
      oldValue,
      newValue: employee.toObject(),
    });

    const mapped = {
      ...employee.toObject(),
      name: employee.fullName,
      isActive: employee.status === 'active',
    };

    res.json({ success: true, message: 'Employee profile updated.', employee: mapped, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function toggleEmployeeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    const nextStatus = employee.status === 'active' ? 'inactive' : 'active';
    employee.status = nextStatus;
    await employee.save();

    await User.findByIdAndUpdate(employee.userId, { status: nextStatus });

    await logAudit({
      userId: req.user!._id,
      action: 'TOGGLE_EMPLOYEE_STATUS',
      entityType: 'Employee',
      entityId: employee._id,
      newValue: { status: nextStatus },
    });

    res.json({
      success: true,
      message: `Employee status changed to ${nextStatus}.`,
      employee,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    const oldValue = employee.toObject();
    if (employee.userId) {
      await User.findByIdAndDelete(employee.userId);
    }
    await Employee.findByIdAndDelete(employee._id);

    await logAudit({
      userId: req.user!._id,
      action: 'DELETE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee._id,
      oldValue,
    });

    res.json({ success: true, message: `Employee ${employee.fullName} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function payEmployeeDirect(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentReference, paymentDate, notes } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
      return;
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    // Get current earnings to allocate across projects if applicable
    const earnings = await calculateEmployeeEarnings(employee._id);

    const currentYear = new Date().getFullYear();
    const count = await Settlement.countDocuments();
    const settlementCode = generateSettlementCode(count + 1, currentYear);

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    const settlement = await Settlement.create({
      settlementCode,
      employeeId: employee._id,
      periodStart: payDate,
      periodEnd: payDate,
      grossEarned: toDecimal(numAmount),
      adjustments: toDecimal(0),
      previouslyPaid: toDecimal(earnings.totalPaid || 0),
      finalPayable: toDecimal(numAmount),
      status: 'paid',
      paymentMethod: paymentMethod || 'Bank Transfer',
      paymentReference: paymentReference || '',
      paymentDate: payDate,
      notes: notes || '',
      createdBy: req.user!._id,
      paidBy: req.user!._id,
    });

    // Allocate across projects with remaining balance based on expected commission
    let remainingToAllocate = numAmount;
    for (const proj of earnings.projects || []) {
      if (remainingToAllocate <= 0) break;
      const remainingCommission = Math.max(
        0,
        round2((proj.expectedCommission || 0) - (proj.paidCommission || 0))
      );
      if (remainingCommission > 0) {
        const allocate = Math.min(remainingToAllocate, remainingCommission);
        await SettlementItem.create({
          settlementId: settlement._id,
          projectId: new Types.ObjectId(proj.projectId || proj.id),
          employeeId: employee._id,
          earnedAmount: toDecimal(allocate),
          description: `Payout towards ${proj.projectName || 'project'}`,
        });
        remainingToAllocate = round2(remainingToAllocate - allocate);
      }
    }

    // If any surplus payout remains (advance exceeding expected commissions), allocate to primary project
    if (remainingToAllocate > 0 && earnings.projects?.length > 0) {
      const firstProj = earnings.projects[0];
      await SettlementItem.create({
        settlementId: settlement._id,
        projectId: new Types.ObjectId(firstProj.projectId || firstProj.id),
        employeeId: employee._id,
        earnedAmount: toDecimal(remainingToAllocate),
        description: `Payout towards ${firstProj.projectName || 'project'}`,
      });
      remainingToAllocate = 0;
    }

    // Generate receipt
    const receiptCount = await Receipt.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1),
      },
    });
    const receiptCode = generateReceiptCode(receiptCount + 1, currentYear);

    const receiptData = {
      receiptCode,
      receiptNumber: receiptCode,
      settlementCode: settlement.settlementCode,
      employeeName: employee.fullName,
      employeeCode: employee.employeeCode,
      designation: employee.designation || 'Staff',
      bankDetails: {
        bankName: employee.bankDetails?.bankName || '',
        accountNumber: employee.bankDetails?.accountNumber ? `••••${employee.bankDetails.accountNumber.slice(-4)}` : '',
        ifscCode: employee.bankDetails?.ifscCode || '',
      },
      paymentDate: payDate,
      paymentMethod: paymentMethod || 'Bank Transfer',
      paymentReference: paymentReference || '',
      finalPaid: numAmount,
      amount: numAmount,
      notes: notes || '',
    };

    const receipt = await Receipt.create({
      receiptCode,
      settlementId: settlement._id,
      employeeId: employee._id,
      receiptData,
      issuedAt: payDate,
    });

    await logAudit({
      userId: req.user!._id,
      action: 'PAY_EMPLOYEE_DIRECT',
      entityType: 'Settlement',
      entityId: settlement._id,
      newValue: {
        employeeId: employee._id,
        employeeName: employee.fullName,
        amount: numAmount,
        settlementCode,
        receiptCode,
        paymentMethod: paymentMethod || 'Bank Transfer',
        paymentReference: paymentReference || '',
      },
    });

    if (employee.userId) {
      createNotification({
        recipient: employee.userId,
        role: 'employee',
        type: 'settlement',
        title: 'Payment Received',
        message: `Payout of ₹${numAmount.toLocaleString('en-IN')} has been disbursed via ${paymentMethod || 'Bank Transfer'}. Receipt: ${receiptCode}.`,
        link: '/employee/earnings',
        metadata: { settlementId: settlement._id, receiptCode },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: `Payment of ₹${numAmount.toLocaleString('en-IN')} recorded successfully for ${employee.fullName}.`,
      settlement,
      receipt,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function listEmployeePayouts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    const possibleIds = [employee._id, employee.userId].filter(Boolean);
    const settlements = await Settlement.find({
      employeeId: { $in: possibleIds },
      status: 'paid',
    }).sort({ paymentDate: -1, createdAt: -1 });

    const formatted = settlements.map((s) => ({
      _id: s._id,
      settlementCode: s.settlementCode,
      amount: fromDecimal(s.finalPayable),
      paymentMethod: s.paymentMethod || 'Bank Transfer',
      paymentReference: s.paymentReference || '',
      paymentDate: s.paymentDate || s.createdAt,
      notes: s.notes || '',
      createdAt: s.createdAt,
    }));

    res.json({ success: true, count: formatted.length, payouts: formatted, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteEmployeePayout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id, payoutId } = req.params;
    const settlement = await Settlement.findById(payoutId);
    if (!settlement) {
      res.status(404).json({ success: false, message: 'Payout record not found.' });
      return;
    }

    await Receipt.deleteMany({ settlementId: settlement._id });
    await SettlementItem.deleteMany({ settlementId: settlement._id });
    await Settlement.findByIdAndDelete(settlement._id);

    await logAudit({
      userId: req.user!._id,
      action: 'DELETE_EMPLOYEE_PAYOUT',
      entityType: 'Settlement',
      entityId: settlement._id,
      oldValue: {
        settlementCode: settlement.settlementCode,
        amount: fromDecimal(settlement.finalPayable),
      },
    });

    res.json({ success: true, message: 'Payout record deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

