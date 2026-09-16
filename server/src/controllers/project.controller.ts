import { Response } from 'express';
import { Types } from 'mongoose';
import { Project } from '../models/Project.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { WorkLog } from '../models/WorkLog.js';
import { Employee } from '../models/Employee.js';
import { generateProjectCode } from '../utils/codeGenerator.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import {
  calculateCommissionAmounts,
  allocateEmployeePool,
  EmployeeShareInput,
} from '../services/commission.service.js';
import { calculateProjectEarningsForEmployee, calculateEmployeeEarnings } from '../services/earnings.service.js';
import { getMonthDateRange } from '../utils/dateHelper.js';

export async function listProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { status, clientId, search, month } = req.query;
    const filter: any = {};

    // Strict Scope: If employee, only view projects assigned to them
    if (req.user?.role === 'employee') {
      if (!req.employee) {
        res.json({ success: true, count: 0, projects: [], data: [] });
        return;
      }
      const peRecords = await ProjectEmployee.find({ employeeId: req.employee._id }).lean();
      const peProjectIds = peRecords.map((pe) => pe.projectId);
      filter.$or = [
        { assignedEmployees: req.employee._id },
        { _id: { $in: peProjectIds } },
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (clientId) {
      filter.clientId = clientId;
    }

    const monthRange = getMonthDateRange(month as string);
    if (monthRange) {
      const { startOfMonth, endOfMonth } = monthRange;
      const dateMatch = {
        $or: [
          { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
          { startDate: null, createdAt: { $gte: startOfMonth, $lte: endOfMonth } },
          { startDate: { $exists: false }, createdAt: { $gte: startOfMonth, $lte: endOfMonth } },
        ],
      };

      if (filter.$and) {
        filter.$and.push(dateMatch);
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, dateMatch];
        delete filter.$or;
      } else {
        filter.$or = dateMatch.$or;
      }
    }

    if (search) {
      const regex = new RegExp(search as string, 'i');
      if (filter.$and) {
        filter.$and.push({ $or: [{ projectName: regex }, { projectCode: regex }] });
      } else if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: [{ projectName: regex }, { projectCode: regex }] },
        ];
        delete filter.$or;
      } else {
        filter.$or = [{ projectName: regex }, { projectCode: regex }];
      }
    }

    const projects = await Project.find(filter)
      .populate('clientId', 'name companyName clientCode')
      .populate('assignedEmployees', 'fullName employeeCode designation')
      .sort({ createdAt: -1 })
      .lean();

    const projectIds = projects.map((p) => p._id);

    // 1. Batch fetch all payments and commissions for these projects in ONE single query
    const [allPayments, allCommissions] = await Promise.all([
      ClientPayment.find({ projectId: { $in: projectIds } }).lean(),
      ProjectCommission.find({ projectId: { $in: projectIds } }).lean(),
    ]);

    const paymentsByProject: Record<string, number> = {};
    for (const p of allPayments) {
      const pid = p.projectId?.toString();
      if (pid) {
        paymentsByProject[pid] = (paymentsByProject[pid] || 0) + fromDecimal(p.amount);
      }
    }

    const commissionsByProject: Record<string, any> = {};
    for (const c of allCommissions) {
      const pid = c.projectId?.toString();
      if (pid) {
        commissionsByProject[pid] = {
          ...c,
          brokerPercent: c.brokerPercent,
          brokerPercentage: c.brokerPercent,
          employeePercent: c.employeePercent,
          employeePercentage: c.employeePercent,
          officePercent: c.officePercent,
          officeExpensePercentage: c.officePercent,
          adminPercent: c.adminPercent,
          adminSharePercentage: c.adminPercent,
          settlementPercent: c.settlementPercent,
          settlementReservePercentage: c.settlementPercent,
          brokerAmount: fromDecimal(c.brokerAmount),
          employeeAmount: fromDecimal(c.employeeAmount),
          officeAmount: fromDecimal(c.officeAmount),
          adminAmount: fromDecimal(c.adminAmount),
          settlementAmount: fromDecimal(c.settlementAmount),
        };
      }
    }

    // 2. If employee, batch fetch allocations and pre-calculate earnings ONCE
    const allocMap = new Map<string, any>();
    const earningsMap = new Map<string, any>();
    if (req.employee && projectIds.length > 0) {
      const [peAllocations, employeeEarnings] = await Promise.all([
        ProjectEmployee.find({
          employeeId: req.employee._id,
          projectId: { $in: projectIds },
        }).lean(),
        calculateEmployeeEarnings(req.employee._id),
      ]);

      for (const a of peAllocations) {
        allocMap.set(a.projectId.toString(), a);
      }
      for (const ep of employeeEarnings.projects || []) {
        if (ep.projectId) earningsMap.set(ep.projectId.toString(), ep);
        if (ep.id) earningsMap.set(ep.id.toString(), ep);
      }
    }

    // 3. Fast in-memory enrichment without any extra database queries
    const isEmployee = req.user?.role === 'employee';
    const enriched = projects.map((proj) => {
      const projIdStr = proj._id.toString();
      const paymentsReceived = round2(paymentsByProject[projIdStr] || 0);
      const grossVal = fromDecimal(proj.projectValue);
      const discountPercent = Number(proj.discountPercent) || 0;
      const discountAmount = proj.discountAmount
        ? fromDecimal(proj.discountAmount)
        : round2((grossVal * discountPercent) / 100);
      const netVal = Math.max(0, round2(grossVal - discountAmount));
      const outstanding = Math.max(0, round2(netVal - paymentsReceived));

      let userShare = 100;
      let employeeCommission = null;
      if (req.employee) {
        const alloc = allocMap.get(projIdStr);
        if (alloc) {
          userShare = alloc.sharePercent ?? alloc.sharePercentage ?? 100;
        } else if (proj.assignedEmployees?.length) {
          userShare = Math.round(100 / proj.assignedEmployees.length);
        }

        const pool = earningsMap.get(projIdStr);
        if (pool) {
          const totalPool = pool.expectedCommission;
          const paid = pool.paidCommission;
          employeeCommission = {
            totalCommission: totalPool,
            expectedCommission: totalPool,
            earnedCommission: pool.earnedCommission,
            paidCommission: paid,
            pendingCommission: Math.max(0, round2(totalPool - paid)),
            payableBalance: pool.payableBalance,
            sharePercent: pool.sharePercent ?? pool.employeeSharePercent ?? userShare,
          };
        }
      }

      const comm = commissionsByProject[projIdStr] || null;

      const projObj = typeof (proj as any).toObject === 'function' ? (proj as any).toObject() : proj;
      return {
        ...projObj,
        id: projIdStr,
        title: proj.projectName,
        projectName: proj.projectName,
        commission: isEmployee ? null : comm,
        sharePercent: userShare,
        sharePercentage: userShare,
        employeeCommission,
        totalAmount: isEmployee ? 0 : netVal,
        endDate: proj.deadline,
        projectValue: isEmployee ? 0 : netVal,
        grossProjectValue: isEmployee ? 0 : grossVal,
        discountPercent: isEmployee ? 0 : discountPercent,
        discountAmount: isEmployee ? 0 : discountAmount,
        netProjectValue: isEmployee ? 0 : netVal,
        paymentsReceived: isEmployee ? 0 : paymentsReceived,
        outstanding: isEmployee ? 0 : outstanding,
        clientDebt: isEmployee ? 0 : outstanding,
        paymentProgressPercent: isEmployee ? 0 : (netVal > 0 ? Math.min(100, Math.round((paymentsReceived / netVal) * 100)) : 0),
      };
    });

    // Delivered projects should always show at the end of the list,
    // but within delivered projects, the newly delivered appears first, and the first delivered project stays at the very last end ("last ma last")
    enriched.sort((a, b) => {
      const aDelivered = (a.status || '').toLowerCase() === 'delivered';
      const bDelivered = (b.status || '').toLowerCase() === 'delivered';
      if (aDelivered && !bDelivered) return 1;
      if (!aDelivered && bDelivered) return -1;
      if (aDelivered && bDelivered) {
        const timeA = new Date(a.deliveredAt || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.deliveredAt || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    res.json({ success: true, count: enriched.length, projects: enriched, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clientId = req.body.clientId;
    const projectName = req.body.projectName || req.body.title;
    const projectValueRaw = req.body.projectValue !== undefined ? req.body.projectValue : req.body.totalAmount;
    const discountPercentRaw = req.body.discountPercent !== undefined ? req.body.discountPercent : 0;
    const discountAmountRaw = req.body.discountAmount;
    const description = req.body.description;
    const startDate = req.body.startDate;
    const deadline = req.body.deadline || req.body.endDate;
    const statusRaw = req.body.status;
    const status = statusRaw === 'signed' ? 'confirmed' : (statusRaw || 'confirmed');
    const assignedEmployees = req.body.assignedEmployees;
    const commissionSplit = req.body.commissionSplit;
    const employeeShares = req.body.employeeShares;

    if (!clientId || !projectName || projectValueRaw === undefined || projectValueRaw === null || projectValueRaw === '') {
      res.status(400).json({ success: false, message: 'Client, project name, and value are required.' });
      return;
    }

    const numValue = round2(parseFloat(String(projectValueRaw)));
    if (isNaN(numValue) || numValue < 0) {
      res.status(400).json({ success: false, message: 'Invalid project value.' });
      return;
    }

    const discountPercent = Math.max(0, Math.min(100, Number(discountPercentRaw) || 0));
    const discountAmount = discountAmountRaw !== undefined
      ? round2(parseFloat(String(discountAmountRaw)))
      : round2((numValue * discountPercent) / 100);
    const netValue = Math.max(0, round2(numValue - discountAmount));

    // Generate Project Code: AAG-PRJ-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const count = await Project.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1),
      },
    });
    const projectCode = generateProjectCode(count + 1, currentYear);

    // 1. Create Project
    const project = await Project.create({
      projectCode,
      clientId,
      projectName,
      description,
      projectValue: toDecimal(numValue),
      discountPercent,
      discountAmount: toDecimal(discountAmount),
      startDate: startDate ? new Date(startDate) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      status: status || 'confirmed',
      assignedEmployees: (assignedEmployees || []).map((id: string) => new Types.ObjectId(id)),
      createdBy: req.user!._id,
    });

    // 2. Compute Commission Distribution on Net Project Value
    const split = {
      brokerPercent: Number(commissionSplit?.brokerPercent ?? commissionSplit?.brokerPercentage ?? 10),
      employeePercent: Number(commissionSplit?.employeePercent ?? commissionSplit?.employeePercentage ?? 40),
      officePercent: Number(commissionSplit?.officePercent ?? commissionSplit?.officeExpensePercentage ?? 10),
      adminPercent: Number(commissionSplit?.adminPercent ?? commissionSplit?.adminSharePercentage ?? 35),
      settlementPercent: Number(commissionSplit?.settlementPercent ?? commissionSplit?.settlementReservePercentage ?? 5),
    };

    const commissionAmounts = calculateCommissionAmounts(numValue, split, discountPercent);

    const projectCommission = await ProjectCommission.create({
      projectId: project._id,
      ...commissionAmounts,
      createdBy: req.user!._id,
    });

    // 3. Allocate Employee Pool if employees are provided
    if (assignedEmployees && assignedEmployees.length > 0) {
      let sharesToUse: EmployeeShareInput[] = [];

      if (employeeShares && employeeShares.length === assignedEmployees.length) {
        sharesToUse = employeeShares;
      } else {
        // Distribute equally if custom shares are not passed
        const equalShare = round2(100 / assignedEmployees.length);
        sharesToUse = assignedEmployees.map((empId: string, idx: number) => {
          // Adjust last employee share for clean 100% sum
          const share = idx === assignedEmployees.length - 1 ? round2(100 - equalShare * (assignedEmployees.length - 1)) : equalShare;
          return { employeeId: empId, sharePercent: share };
        });
      }

      await allocateEmployeePool(
        project._id,
        fromDecimal(projectCommission.employeeAmount),
        sharesToUse
      );
    }

    await logAudit({
      userId: req.user!._id,
      action: 'CREATE_PROJECT',
      entityType: 'Project',
      entityId: project._id,
      newValue: { projectCode, projectName, projectValue: numValue },
    });

    // Notify Admin
    createNotification({
      role: 'admin',
      type: 'project',
      title: 'New Project Created',
      message: `Project "${projectName}" (${projectCode}) was created.`,
      link: '/admin/projects',
      metadata: { projectId: project._id },
    }).catch(() => {});

    // Notify Assigned Employees
    if (assignedEmployees && assignedEmployees.length > 0) {
      Employee.find({ _id: { $in: assignedEmployees } })
        .select('userId fullName')
        .then((emps) => {
          for (const emp of emps) {
            if (emp.userId) {
              createNotification({
                recipient: emp.userId,
                role: 'employee',
                type: 'project',
                title: 'Assigned to New Project',
                message: `You were assigned to project "${projectName}" (${projectCode}).`,
                link: '/employee/projects',
                metadata: { projectId: project._id },
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: `Project ${projectCode} created successfully.`,
      project,
      commission: projectCommission,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.projectId;
    const project = await Project.findById(id)
      .populate('clientId')
      .populate('assignedEmployees', 'fullName employeeCode designation email phone');

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    // Role Security: If employee, verify assignment
    if (req.user?.role === 'employee') {
      const isAssigned = project.assignedEmployees.some(
        (emp: any) => emp._id.toString() === req.employee?._id.toString()
      );
      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Access denied to this project.' });
        return;
      }
    }

    const commission = await ProjectCommission.findOne({ projectId: project._id });
    const employeeAllocations = await ProjectEmployee.find({ projectId: project._id }).populate(
      'employeeId',
      'fullName employeeCode designation email'
    );
    const payments = await ClientPayment.find({ projectId: project._id }).sort({ paymentDate: -1 });
    const workLogs = await WorkLog.find({ projectId: project._id })
      .populate('employeeId', 'fullName employeeCode')
      .sort({ workDate: -1 });

    const grossVal = fromDecimal(project.projectValue);
    const discountPercent = Number(project.discountPercent) || 0;
    const discountAmount = project.discountAmount
      ? fromDecimal(project.discountAmount)
      : round2((grossVal * discountPercent) / 100);
    const netVal = Math.max(0, round2(grossVal - discountAmount));
    const paymentsReceived = round2(
      payments.reduce((sum, p) => sum + fromDecimal(p.amount), 0)
    );
    const outstanding = Math.max(0, round2(netVal - paymentsReceived));

    const isEmployeeView = req.user?.role === 'employee';

    const projectData = {
      ...project.toObject(),
      title: project.projectName,
      projectName: project.projectName,
      totalAmount: isEmployeeView ? 0 : netVal,
      projectValue: isEmployeeView ? 0 : netVal,
      grossProjectValue: isEmployeeView ? 0 : grossVal,
      discountPercent: isEmployeeView ? 0 : discountPercent,
      discountAmount: isEmployeeView ? 0 : discountAmount,
      netProjectValue: isEmployeeView ? 0 : netVal,
      clientDebt: isEmployeeView ? 0 : outstanding,
      deadline: project.deadline,
      endDate: project.deadline,
      paymentsReceived: isEmployeeView ? 0 : paymentsReceived,
      outstanding: isEmployeeView ? 0 : outstanding,
      balanceDue: isEmployeeView ? 0 : outstanding,
    };

    const formattedCommission = commission
      ? {
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
        }
      : null;

    const formattedAllocations = employeeAllocations.map((a) => {
      const share = a.sharePercent ?? a.sharePercentage ?? 100;
      const allocatedNum = fromDecimal(a.allocatedCommission);
      return {
        ...a.toObject(),
        sharePercent: share,
        sharePercentage: share,
        allocatedCommission: allocatedNum,
        earnedAmount: allocatedNum,
      };
    });

    // Determine current user's assignment if employee
    let userAssignment = null;
    let employeeCommission = null;

    if (req.employee) {
      userAssignment = formattedAllocations.find(
        (a: any) =>
          a.employeeId?._id?.toString() === req.employee!._id.toString() ||
          a.employeeId?.toString() === req.employee!._id.toString()
      ) || null;

      const pool = await calculateProjectEarningsForEmployee(req.employee._id, project._id);
      if (pool) {
        const totalPool = pool.expectedCommission;
        const paid = pool.paidCommission;
        const earned = pool.earnedCommission;
        const pending = Math.max(0, round2(totalPool - paid));
        employeeCommission = {
          totalCommission: totalPool,
          expectedCommission: totalPool,
          earnedCommission: earned,
          paidCommission: paid,
          pendingCommission: pending,
          payableBalance: pool.payableBalance,
          sharePercent: pool.sharePercent ?? pool.employeeSharePercent,
          roleInProject: pool.roleInProject ?? userAssignment?.roleInProject ?? 'Creator',
        };
      }
    }

    const scopedWorkLogs = isEmployeeView && req.employee
      ? workLogs.filter(
          (log: any) =>
            log.employeeId?._id?.toString() === req.employee!._id.toString() ||
            log.employeeId?.toString() === req.employee!._id.toString()
        )
      : workLogs;

    const payload = {
      project: projectData,
      assignment: userAssignment || (isEmployeeView ? null : formattedAllocations[0] || null),
      employeeCommission,
      commission: isEmployeeView ? null : formattedCommission,
      employeeAllocations: isEmployeeView ? [] : formattedAllocations,
      payments: isEmployeeView ? [] : payments.map((p) => ({
        ...p.toObject(),
        amount: fromDecimal(p.amount),
      })),
      workLogs: scopedWorkLogs,
    };

    res.json({
      success: true,
      data: {
        ...projectData,
        ...payload,
      },
      ...payload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.projectId;
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const oldValue = project.toObject();

    const newName = req.body.projectName || req.body.title;
    if (newName) project.projectName = newName;
    if (req.body.description !== undefined) project.description = req.body.description;
    if (req.body.startDate !== undefined) project.startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    const newDeadline = req.body.deadline || req.body.endDate;
    if (newDeadline !== undefined) project.deadline = newDeadline ? new Date(newDeadline) : undefined;
    if (req.body.status) {
      const newStatus = req.body.status === 'signed' ? 'confirmed' : req.body.status;
      if (newStatus === 'delivered' && project.status !== 'delivered') {
        project.deliveredAt = new Date();
      } else if (newStatus !== 'delivered') {
        project.deliveredAt = undefined;
      }
      project.status = newStatus;
    }
    if (req.body.clientId) {
      project.clientId = new Types.ObjectId(req.body.clientId);
    }

    // If projectValue or discount changed, recalculate commission amounts on net value
    const valToUpdate = req.body.projectValue !== undefined ? req.body.projectValue : req.body.totalAmount;
    const discPercentToUpdate = req.body.discountPercent;
    const discAmountToUpdate = req.body.discountAmount;

    let projectFinancialsChanged = false;
    if (valToUpdate !== undefined && valToUpdate !== null && valToUpdate !== '') {
      const newNum = round2(parseFloat(String(valToUpdate)));
      project.projectValue = toDecimal(newNum);
      projectFinancialsChanged = true;
    }

    if (discPercentToUpdate !== undefined) {
      project.discountPercent = Math.max(0, Math.min(100, Number(discPercentToUpdate) || 0));
      projectFinancialsChanged = true;
    }

    const currentGross = fromDecimal(project.projectValue);
    const currentDiscPercent = Number(project.discountPercent) || 0;
    const calcDiscAmount = discAmountToUpdate !== undefined
      ? round2(parseFloat(String(discAmountToUpdate)))
      : round2((currentGross * currentDiscPercent) / 100);
    project.discountAmount = toDecimal(calcDiscAmount);

    // Support updating commission split if passed
    const commissionSplitRaw = req.body.commissionSplit;
    if (commissionSplitRaw) {
      const split = {
        brokerPercent: Number(commissionSplitRaw.brokerPercent ?? commissionSplitRaw.brokerPercentage ?? 10),
        employeePercent: Number(commissionSplitRaw.employeePercent ?? commissionSplitRaw.employeePercentage ?? 40),
        officePercent: Number(commissionSplitRaw.officePercent ?? commissionSplitRaw.officeExpensePercentage ?? 10),
        adminPercent: Number(commissionSplitRaw.adminPercent ?? commissionSplitRaw.adminSharePercentage ?? 35),
        settlementPercent: Number(commissionSplitRaw.settlementPercent ?? commissionSplitRaw.settlementReservePercentage ?? 5),
      };

      const updatedAmounts = calculateCommissionAmounts(currentGross, split, currentDiscPercent);
      let commission = await ProjectCommission.findOne({ projectId: project._id });
      if (commission) {
        Object.assign(commission, updatedAmounts);
        await commission.save();
      } else {
        await ProjectCommission.create({
          projectId: project._id,
          ...updatedAmounts,
          createdBy: req.user!._id,
        });
      }

      // Re-scale employee pool allocations
      const allocations = await ProjectEmployee.find({ projectId: project._id });
      const employeeTotal = fromDecimal(updatedAmounts.employeeAmount);
      for (const alloc of allocations) {
        const share = alloc.sharePercent ?? alloc.sharePercentage ?? 100;
        alloc.sharePercent = share;
        alloc.sharePercentage = share;
        alloc.allocatedCommission = toDecimal(
          round2((employeeTotal * share) / 100)
        );
        await alloc.save();
      }
    } else if (projectFinancialsChanged || discAmountToUpdate !== undefined) {
      const commission = await ProjectCommission.findOne({ projectId: project._id });
      if (commission) {
        const updatedAmounts = calculateCommissionAmounts(currentGross, {
          brokerPercent: commission.brokerPercent,
          employeePercent: commission.employeePercent,
          officePercent: commission.officePercent,
          adminPercent: commission.adminPercent,
          settlementPercent: commission.settlementPercent,
        }, currentDiscPercent);
        Object.assign(commission, updatedAmounts);
        await commission.save();

        // Re-scale employee pool allocations
        const allocations = await ProjectEmployee.find({ projectId: project._id });
        const employeeTotal = fromDecimal(commission.employeeAmount);
        for (const alloc of allocations) {
          const share = alloc.sharePercent ?? alloc.sharePercentage ?? 100;
          alloc.sharePercent = share;
          alloc.sharePercentage = share;
          alloc.allocatedCommission = toDecimal(
            round2((employeeTotal * share) / 100)
          );
          await alloc.save();
        }
      }
    }

    if (req.body.assignedEmployees) {
      project.assignedEmployees = req.body.assignedEmployees.map((empId: string) => new Types.ObjectId(empId));

      const commission = await ProjectCommission.findOne({ projectId: project._id });
      const employeeTotal = commission ? fromDecimal(commission.employeeAmount) : 0;
      const count = project.assignedEmployees.length;
      if (count > 0) {
        const equalShare = round2(100 / count);
        for (let idx = 0; idx < count; idx++) {
          const empId = project.assignedEmployees[idx];
          const share = idx === count - 1 ? round2(100 - equalShare * (count - 1)) : equalShare;
          const allocAmt = round2((employeeTotal * share) / 100);
          await ProjectEmployee.findOneAndUpdate(
            { projectId: project._id, employeeId: empId },
            {
              $set: {
                sharePercent: share,
                sharePercentage: share,
                allocatedCommission: toDecimal(allocAmt),
              },
            },
            { upsert: true, new: true }
          );
        }
        await ProjectEmployee.deleteMany({
          projectId: project._id,
          employeeId: { $nin: project.assignedEmployees },
        });
      }
    }

    await project.save();

    await logAudit({
      userId: req.user!._id,
      action: 'UPDATE_PROJECT',
      entityType: 'Project',
      entityId: project._id,
      oldValue,
      newValue: project.toObject(),
    });

    const projectData = {
      ...project.toObject(),
      title: project.projectName,
      totalAmount: fromDecimal(project.projectValue),
    };

    res.json({ success: true, message: 'Project updated.', project: projectData, data: projectData });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function updateEmployeeAllocations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.projectId;
    const { shares } = req.body; // Array of { employeeId, sharePercent }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const commission = await ProjectCommission.findOne({ projectId: project._id });
    if (!commission) {
      res.status(400).json({ success: false, message: 'Project commission not configured.' });
      return;
    }

    const normalizedShares: EmployeeShareInput[] = (shares || []).map((s: any) => ({
      employeeId: s.employeeId,
      sharePercent: Number(s.sharePercent ?? s.sharePercentage ?? 100),
    }));

    const employeeAmount = fromDecimal(commission.employeeAmount);
    const updatedAllocations = await allocateEmployeePool(project._id, employeeAmount, normalizedShares);

    // Update assignedEmployees on Project model
    project.assignedEmployees = normalizedShares.map((s: EmployeeShareInput) => new Types.ObjectId(s.employeeId));
    await project.save();

    await logAudit({
      userId: req.user!._id,
      action: 'UPDATE_PROJECT_EMPLOYEE_ALLOCATIONS',
      entityType: 'Project',
      entityId: project._id,
      newValue: normalizedShares,
    });

    res.json({ success: true, message: 'Employee commission pool allocated successfully.', allocations: updatedAllocations, data: updatedAllocations });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.projectId;
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const oldValue = project.toObject();

    await Promise.all([
      ProjectCommission.deleteMany({ projectId: project._id }),
      ProjectEmployee.deleteMany({ projectId: project._id }),
      ClientPayment.deleteMany({ projectId: project._id }),
      WorkLog.deleteMany({ projectId: project._id }),
      Project.findByIdAndDelete(project._id),
    ]);

    await logAudit({
      userId: req.user!._id,
      action: 'DELETE_PROJECT',
      entityType: 'Project',
      entityId: project._id,
      oldValue,
    });

    res.json({ success: true, message: `Project ${project.projectName} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateProjectStatusByEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id || req.params.projectId;
    const { status } = req.body;

    const allowedStatuses = [
      'lead',
      'confirmed',
      'in_progress',
      'review',
      'completed',
      'delivered',
      'cancelled',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
      return;
    }

    const employeeId = req.employee?._id;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee profile not linked.' });
      return;
    }

    // Verify employee is assigned to this project
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    let isAssigned = project.assignedEmployees?.some(
      (e) => e.toString() === employeeId.toString()
    );
    if (!isAssigned) {
      const pe = await ProjectEmployee.findOne({ projectId: project._id, employeeId });
      if (pe) isAssigned = true;
    }

    if (!isAssigned) {
      res.status(403).json({
        success: false,
        message: 'You are not assigned to this project.',
      });
      return;
    }

    const oldStatus = project.status;
    project.status = status;
    if (status === 'delivered' && oldStatus !== 'delivered') {
      project.deliveredAt = new Date();
    } else if (status !== 'delivered') {
      project.deliveredAt = undefined;
    }
    await project.save();

    await logAudit({
      userId: req.user!._id,
      action: 'EMPLOYEE_UPDATE_PROJECT_STATUS',
      entityType: 'Project',
      entityId: project._id,
      oldValue: { status: oldStatus },
      newValue: { status },
    });

    // Notify Admin of employee status change
    createNotification({
      role: 'admin',
      type: 'project',
      title: 'Project Status Updated by Staff',
      message: `${req.employee?.fullName || 'Staff Member'} updated "${project.projectName}" status to "${status.replace('_', ' ')}".`,
      link: `/admin/projects/${project._id}`,
      metadata: { projectId: project._id, status, updatedBy: employeeId },
    }).catch(() => {});

    res.json({
      success: true,
      message: `Project status updated to ${status.replace('_', ' ')}.`,
      project,
      data: project,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

