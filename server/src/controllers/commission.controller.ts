import { Response } from 'express';
import { CommissionPreset } from '../models/CommissionPreset.js';
import { Project } from '../models/Project.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { CommissionHistory } from '../models/CommissionHistory.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import {
  calculateCommissionAmounts,
  validateCommissionPercentages,
} from '../services/commission.service.js';
import { fromDecimal, toDecimal, round2 } from '../utils/decimalHelper.js';

export async function getPresets(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const presets = await CommissionPreset.find().sort({ isDefault: -1, name: 1 });
    const formatted = presets.map((p) => ({
      ...p.toObject(),
      brokerPercent: p.brokerPercent,
      brokerPercentage: p.brokerPercent,
      employeePercent: p.employeePercent,
      employeePercentage: p.employeePercent,
      officePercent: p.officePercent,
      officeExpensePercentage: p.officePercent,
      adminPercent: p.adminPercent,
      adminSharePercentage: p.adminPercent,
      settlementPercent: p.settlementPercent,
      settlementReservePercentage: p.settlementPercent,
    }));
    res.json({ success: true, presets: formatted, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createPreset(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, isDefault } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Preset name is required.' });
      return;
    }

    const broker = req.body.brokerPercent ?? req.body.brokerPercentage ?? 0;
    const employee = req.body.employeePercent ?? req.body.employeePercentage ?? 0;
    const office = req.body.officePercent ?? req.body.officeExpensePercentage ?? 0;
    const admin = req.body.adminPercent ?? req.body.adminSharePercentage ?? 0;
    const settlement = req.body.settlementPercent ?? req.body.settlementReservePercentage ?? 0;

    const split = {
      brokerPercent: Number(broker),
      employeePercent: Number(employee),
      officePercent: Number(office),
      adminPercent: Number(admin),
      settlementPercent: Number(settlement),
    };

    validateCommissionPercentages(split);

    if (isDefault) {
      await CommissionPreset.updateMany({}, { isDefault: false });
    }

    const preset = await CommissionPreset.create({
      name,
      ...split,
      isDefault: Boolean(isDefault),
    });

    await logAudit({
      userId: req.user!._id,
      action: 'CREATE_COMMISSION_PRESET',
      entityType: 'CommissionPreset',
      entityId: preset._id,
      newValue: split,
    });

    res.status(201).json({ success: true, message: 'Preset created.', preset, data: preset });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function deletePreset(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await CommissionPreset.findByIdAndDelete(id);
    res.json({ success: true, message: 'Preset deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateProjectCommission(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.projectId || req.params.id;

    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const broker = req.body.brokerPercent ?? req.body.brokerPercentage ?? 0;
    const employee = req.body.employeePercent ?? req.body.employeePercentage ?? 0;
    const office = req.body.officePercent ?? req.body.officeExpensePercentage ?? 0;
    const admin = req.body.adminPercent ?? req.body.adminSharePercentage ?? 0;
    const settlement = req.body.settlementPercent ?? req.body.settlementReservePercentage ?? 0;
    const reason = req.body.reason;

    const split = {
      brokerPercent: Number(broker),
      employeePercent: Number(employee),
      officePercent: Number(office),
      adminPercent: Number(admin),
      settlementPercent: Number(settlement),
    };

    validateCommissionPercentages(split);

    const projectValue = fromDecimal(project.projectValue);
    const newAmounts = calculateCommissionAmounts(projectValue, split);

    let commission = await ProjectCommission.findOne({ projectId });
    let oldValues: any = {};

    if (commission) {
      oldValues = {
        brokerPercent: commission.brokerPercent,
        employeePercent: commission.employeePercent,
        officePercent: commission.officePercent,
        adminPercent: commission.adminPercent,
        settlementPercent: commission.settlementPercent,
        employeeAmount: fromDecimal(commission.employeeAmount),
      };

      Object.assign(commission, newAmounts, { updatedBy: req.user!._id });
      await commission.save();
    } else {
      commission = await ProjectCommission.create({
        projectId,
        ...newAmounts,
        createdBy: req.user!._id,
      });
    }

    // Save immutable history in CommissionHistory
    await CommissionHistory.create({
      projectId,
      oldValues,
      newValues: split,
      changedBy: req.user!._id,
      reason: reason || 'Commission structure updated by Admin',
    });

    // Re-scale allocations for all employees in this project safely
    const newEmployeeTotal = fromDecimal(commission.employeeAmount);
    const allocations = await ProjectEmployee.find({ projectId });
    for (const alloc of allocations) {
      const share = alloc.sharePercent ?? alloc.sharePercentage ?? 100;
      alloc.sharePercent = share;
      alloc.sharePercentage = share;
      alloc.allocatedCommission = toDecimal(
        round2((newEmployeeTotal * share) / 100)
      );
      await alloc.save();
    }

    await logAudit({
      userId: req.user!._id,
      action: 'UPDATE_PROJECT_COMMISSION',
      entityType: 'ProjectCommission',
      entityId: commission._id,
      oldValue: oldValues,
      newValue: split,
    });

    const formattedCommission = {
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

    res.json({
      success: true,
      message: 'Project commission updated with audit history.',
      commission: formattedCommission,
      data: formattedCommission,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getCommissionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.projectId || req.params.id;
    const history = await CommissionHistory.find({ projectId })
      .populate('changedBy', 'name email')
      .sort({ changedAt: -1 });

    res.json({ success: true, history, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
