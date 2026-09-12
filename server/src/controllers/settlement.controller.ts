import { Response } from 'express';
import { Types } from 'mongoose';
import { Settlement } from '../models/Settlement.js';
import { SettlementItem } from '../models/SettlementItem.js';
import { Receipt } from '../models/Receipt.js';
import { Employee } from '../models/Employee.js';
import { generateSettlementCode, generateReceiptCode } from '../utils/codeGenerator.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { calculateEmployeeEarnings } from '../services/earnings.service.js';

export async function listSettlements(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { employeeId, status } = req.query;
    const filter: any = {};

    // Role Security: Employee sees only their own settlements
    if (req.user?.role === 'employee') {
      if (!req.employee) {
        res.json({ success: true, count: 0, settlements: [] });
        return;
      }
      filter.employeeId = req.employee._id;
    } else {
      if (employeeId) filter.employeeId = employeeId;
    }

    if (status && status !== 'all') filter.status = status;

    const settlements = await Settlement.find(filter)
      .populate('employeeId', 'fullName employeeCode designation')
      .populate('createdBy', 'name email')
      .populate('paidBy', 'name email')
      .sort({ createdAt: -1 });

    const formatted = settlements.map((s) => {
      const emp = s.employeeId as any;
      const grossNum = fromDecimal(s.grossEarned);
      const adjNum = fromDecimal(s.adjustments);
      const prevPaidNum = fromDecimal(s.previouslyPaid);
      const finalNum = fromDecimal(s.finalPayable);
      return {
        ...s.toObject(),
        grossEarned: grossNum,
        adjustments: adjNum,
        previouslyPaid: prevPaidNum,
        finalPayable: finalNum,
        totalEarned: grossNum,
        netPayable: finalNum,
        employee: emp ? { ...emp, name: emp.fullName } : null,
        employeeName: emp?.fullName || 'Employee',
        settlementMonth: s.periodStart ? new Date(s.periodStart).toISOString().slice(0, 7) : '',
      };
    });

    res.json({ success: true, count: formatted.length, settlements: formatted, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function previewSettlement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee ID is required.' });
      return;
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    const earnings = await calculateEmployeeEarnings(employee._id);
    const eligibleProjects = earnings.projects.filter((p) => p.payableBalance > 0);
    const totalDiscountAmount = round2(
      earnings.projects.reduce((sum, p) => sum + p.discountAmount, 0)
    );
    const totalGrossProjectValue = round2(
      earnings.projects.reduce((sum, p) => sum + p.grossProjectValue, 0)
    );
    const totalNetProjectValue = round2(
      earnings.projects.reduce((sum, p) => sum + p.netProjectValue, 0)
    );
    const totalClientDebt = round2(
      earnings.projects.reduce((sum, p) => sum + p.clientDebt, 0)
    );
    const totalOfficeAllocated = round2(
      earnings.projects.reduce((sum, p) => sum + p.officeAllocated, 0)
    );

    const previewData = {
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        name: employee.fullName,
        employeeCode: employee.employeeCode,
      },
      ...earnings,
      totalEarned: earnings.totalEarned,
      totalPaid: earnings.totalPaid,
      payableBalance: earnings.totalPayable,
      netPayable: earnings.totalPayable,
      itemCount: eligibleProjects.length,
      eligibleProjects,
      totalGrossProjectValue,
      totalDiscountAmount,
      totalNetProjectValue,
      totalClientDebt,
      totalOfficeAllocated,
    };

    res.json({
      success: true,
      data: previewData,
      employee: previewData.employee,
      preview: previewData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createSettlement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let { employeeId, periodStart, periodEnd, settlementMonth, adjustments, notes } = req.body;

    if (settlementMonth && (!periodStart || !periodEnd)) {
      const parts = settlementMonth.split('-').map(Number);
      periodStart = new Date(parts[0], parts[1] - 1, 1);
      periodEnd = new Date(parts[0], parts[1], 0, 23, 59, 59);
    }

    if (!employeeId || !periodStart || !periodEnd) {
      res.status(400).json({ success: false, message: 'Employee ID and period range are required.' });
      return;
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    // Calculate current financial standing
    const earnings = await calculateEmployeeEarnings(employee._id);
    if (earnings.totalPayable <= 0) {
      res.status(400).json({
        success: false,
        message: 'No payable commission balance available for this employee.',
      });
      return;
    }

    const currentYear = new Date().getFullYear();
    const count = await Settlement.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1),
      },
    });
    const settlementCode = generateSettlementCode(count + 1, currentYear);

    const adj = adjustments ? round2(parseFloat(adjustments)) : 0;
    const finalPayable = Math.max(0, round2(earnings.totalPayable + adj));

    const settlement = await Settlement.create({
      settlementCode,
      employeeId: employee._id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      grossEarned: toDecimal(earnings.totalEarned),
      adjustments: toDecimal(adj),
      previouslyPaid: toDecimal(earnings.totalPaid),
      finalPayable: toDecimal(finalPayable),
      status: 'draft',
      notes,
      createdBy: req.user!._id,
    });

    // Create SettlementItem records for projects with payable balance
    const items = [];
    for (const proj of earnings.projects) {
      if (proj.payableBalance > 0) {
        const item = await SettlementItem.create({
          settlementId: settlement._id,
          projectId: new Types.ObjectId(proj.projectId),
          employeeId: employee._id,
          earnedAmount: toDecimal(proj.payableBalance),
          description: `Commission for ${proj.projectName} (${proj.projectCode})`,
        });
        items.push(item);
      }
    }

    await logAudit({
      userId: req.user!._id,
      action: 'CREATE_SETTLEMENT_DRAFT',
      entityType: 'Settlement',
      entityId: settlement._id,
      newValue: { settlementCode, finalPayable, employeeId: employee._id },
    });

    const settData = {
      ...settlement.toObject(),
      grossEarned: fromDecimal(settlement.grossEarned),
      adjustments: fromDecimal(settlement.adjustments),
      previouslyPaid: fromDecimal(settlement.previouslyPaid),
      finalPayable: fromDecimal(settlement.finalPayable),
    };

    res.status(201).json({
      success: true,
      message: `Settlement draft ${settlementCode} generated for ₹${finalPayable.toLocaleString('en-IN')}.`,
      settlement: settData,
      data: settData,
      items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function approveSettlement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const settlement = await Settlement.findById(id);
    if (!settlement) {
      res.status(404).json({ success: false, message: 'Settlement not found.' });
      return;
    }

    if (settlement.status !== 'draft') {
      res.status(400).json({ success: false, message: `Only draft settlements can be approved (currently ${settlement.status}).` });
      return;
    }

    settlement.status = 'approved';
    await settlement.save();

    await logAudit({
      userId: req.user!._id,
      action: 'APPROVE_SETTLEMENT',
      entityType: 'Settlement',
      entityId: settlement._id,
    });

    res.json({ success: true, message: 'Settlement approved for payment.', settlement, data: settlement });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function paySettlement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, paymentDate, paymentProofUrl, notes } = req.body;

    const settlement = await Settlement.findById(id).populate('employeeId');
    if (!settlement) {
      res.status(404).json({ success: false, message: 'Settlement not found.' });
      return;
    }

    if (settlement.status === 'paid') {
      res.status(400).json({ success: false, message: 'Settlement is already marked as paid.' });
      return;
    }

    settlement.status = 'paid';
    settlement.paymentMethod = paymentMethod || 'bank_transfer';
    settlement.paymentReference = paymentReference;
    settlement.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    settlement.paymentProofUrl = paymentProofUrl;
    if (notes) settlement.notes = notes;
    settlement.paidBy = req.user!._id;
    await settlement.save();

    // Automatically generate Receipt
    const currentYear = new Date().getFullYear();
    const count = await Receipt.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1),
      },
    });
    const receiptCode = generateReceiptCode(count + 1, currentYear);

    const employee = settlement.employeeId as any;
    const items = await SettlementItem.find({ settlementId: settlement._id }).populate('projectId', 'projectName projectCode projectValue discountPercent');

    const receiptData = {
      receiptCode,
      receiptNumber: receiptCode,
      settlementCode: settlement.settlementCode,
      employeeName: employee?.fullName || 'Employee',
      employeeCode: employee?.employeeCode || '',
      designation: employee?.designation || 'Creative Staff',
      bankDetails: {
        bankName: employee?.bankDetails?.bankName || '',
        accountNumber: employee?.bankDetails?.accountNumber ? `••••${employee.bankDetails.accountNumber.slice(-4)}` : '',
        ifscCode: employee?.bankDetails?.ifscCode || '',
      },
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      paymentDate: settlement.paymentDate,
      paymentMethod: settlement.paymentMethod,
      paymentReference: settlement.paymentReference || '',
      grossEarned: fromDecimal(settlement.grossEarned),
      adjustments: fromDecimal(settlement.adjustments),
      previouslyPaid: fromDecimal(settlement.previouslyPaid),
      finalPayable: fromDecimal(settlement.finalPayable),
      finalPaid: fromDecimal(settlement.finalPayable),
      amount: fromDecimal(settlement.finalPayable),
      items: items.map((i: any) => ({
        projectName: i.projectId?.projectName || i.description || 'Creative Production',
        projectCode: i.projectId?.projectCode || '',
        earnedAmount: fromDecimal(i.earnedAmount),
        amount: fromDecimal(i.earnedAmount),
        description: i.description || i.projectId?.projectName,
      })),
    };

    const receipt = await Receipt.create({
      receiptCode,
      settlementId: settlement._id,
      employeeId: settlement.employeeId,
      receiptData,
      issuedAt: settlement.paymentDate,
    });

    await logAudit({
      userId: req.user!._id,
      action: 'PAY_SETTLEMENT_AND_ISSUE_RECEIPT',
      entityType: 'Settlement',
      entityId: settlement._id,
      newValue: { settlementCode: settlement.settlementCode, receiptCode, amount: fromDecimal(settlement.finalPayable) },
    });

    const payableVal = fromDecimal(settlement.finalPayable);
    Employee.findById(settlement.employeeId)
      .select('userId fullName')
      .then((emp) => {
        if (emp?.userId) {
          createNotification({
            recipient: emp.userId,
            role: 'employee',
            type: 'settlement',
            title: 'Commission Payout Disbursed',
            message: `Payout of ₹${payableVal.toLocaleString('en-IN')} has been disbursed. Receipt: ${receiptCode}.`,
            link: '/employee/settlements',
            metadata: { settlementId: settlement._id, receiptCode },
          }).catch(() => {});
        }
        createNotification({
          role: 'admin',
          type: 'settlement',
          title: 'Settlement Disbursed',
          message: `Settlement ${settlement.settlementCode} for ${emp?.fullName || 'Staff'} marked as paid.`,
          link: '/admin/settlements',
          metadata: { settlementId: settlement._id, receiptCode },
        }).catch(() => {});
      })
      .catch(() => {});

    res.json({
      success: true,
      message: `Settlement marked as paid. Receipt ${receiptCode} generated.`,
      settlement,
      receipt,
      data: { settlement, receipt },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
