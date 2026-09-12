import { Types } from 'mongoose';
import { Project } from '../models/Project.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { Employee } from '../models/Employee.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { Settlement } from '../models/Settlement.js';
import { SettlementItem } from '../models/SettlementItem.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';

export interface ProjectEarningDetail {
  id?: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  title?: string;
  projectValue: number;
  grossProjectValue: number;
  discountPercent: number;
  discountAmount: number;
  netProjectValue: number;
  clientDebt: number;
  officeSharePercent: number;
  officeAllocated: number;
  paymentsReceived: number;
  employeeCategoryPercent: number;
  employeeSharePercent: number;
  sharePercent?: number;
  sharePercentage?: number;
  expectedCommission: number;
  earnedCommission: number;
  totalCommission?: number;
  paidCommission: number;
  paidAmount?: number;
  payableBalance: number;
  netPayable?: number;
  pendingCommission: number;
  status?: string;
  roleInProject?: string;
  earnedAmount?: number;
}

export interface EmployeeEarningsSummary {
  employeeId: string;
  totalExpected: number;
  totalEarned: number;
  totalEarnedCommission?: number;
  totalPaid: number;
  totalPayable: number;
  payableBalance?: number;
  totalPending: number;
  summary?: {
    totalExpected: number;
    totalEarned: number;
    totalEarnedCommission: number;
    totalPaid: number;
    totalPayable: number;
    payableBalance: number;
    totalPending: number;
  };
  projects: ProjectEarningDetail[];
  projectBreakdown?: ProjectEarningDetail[];
}

export async function calculateProjectEarningsForEmployee(
  employeeId: string | Types.ObjectId,
  projectId: string | Types.ObjectId
): Promise<ProjectEarningDetail | null> {
  const earnings = await calculateEmployeeEarnings(employeeId);
  const projectIdStr = projectId.toString();
  return (
    earnings.projects.find(
      (p) => p.projectId === projectIdStr || p.id === projectIdStr
    ) ?? null
  );
}

export async function calculateEmployeeEarnings(
  employeeId: string | Types.ObjectId
): Promise<EmployeeEarningsSummary> {
  const rawId = new Types.ObjectId(employeeId.toString());

  // Resolve both Employee._id and associated User._id to guarantee complete coverage
  const employeeDoc = (await Employee.findById(rawId)) || (await Employee.findOne({ userId: rawId }));
  const empId = employeeDoc ? (employeeDoc._id as Types.ObjectId) : rawId;
  const userRelatedId = employeeDoc?.userId ? (employeeDoc.userId as Types.ObjectId) : rawId;
  const allEmpIds = Array.from(new Set([empId.toString(), userRelatedId.toString()])).map((idStr) => new Types.ObjectId(idStr));

  // 1. Find all project allocations for this employee
  const allocations = await ProjectEmployee.find({ employeeId: { $in: allEmpIds } }).populate('projectId');

  // Also check projects where employee is assigned directly via Project.assignedEmployees
  const existingProjectIds = new Set(
    allocations
      .map((a) => (a.projectId as any)?._id?.toString())
      .filter(Boolean)
  );

  const directlyAssignedProjects = await Project.find({ assignedEmployees: { $in: allEmpIds } });
  for (const proj of directlyAssignedProjects) {
    if (!existingProjectIds.has(proj._id.toString())) {
      // Auto-create missing ProjectEmployee record so all relations stay in sync
      const assignedCount = proj.assignedEmployees?.length || 1;
      const equalShare = round2(100 / assignedCount);
      const commission = await ProjectCommission.findOne({ projectId: proj._id });
      const employeePercent = commission ? commission.employeePercent : 40;
      const grossVal = fromDecimal(proj.projectValue);
      const discountPercent = Number(proj.discountPercent) || 0;
      const discountAmount = proj.discountAmount
        ? fromDecimal(proj.discountAmount)
        : round2((grossVal * discountPercent) / 100);
      const netVal = Math.max(0, round2(grossVal - discountAmount));
      const allocAmt = round2((netVal * (employeePercent / 100) * equalShare) / 100);

      try {
        const newAlloc = await ProjectEmployee.create({
          projectId: proj._id,
          employeeId: empId,
          sharePercent: equalShare,
          sharePercentage: equalShare,
          allocatedCommission: toDecimal(allocAmt),
        });
        (newAlloc as any).projectId = proj;
        allocations.push(newAlloc);
        existingProjectIds.add(proj._id.toString());
      } catch (err) {
        // Fallback: push synthetic allocation object
        allocations.push({
          projectId: proj,
          employeeId: empId,
          sharePercent: equalShare,
          sharePercentage: equalShare,
        } as any);
      }
    }
  }

  let totalExpected = 0;
  let totalEarned = 0;
  const projectDetails: ProjectEarningDetail[] = [];

  for (const alloc of allocations) {
    const project = alloc.projectId as any;
    if (!project) continue;

    const projId = project._id;
    const grossValue = fromDecimal(project.projectValue);
    const discountPercent = Number(project.discountPercent) || 0;
    const discountAmount = project.discountAmount
      ? fromDecimal(project.discountAmount)
      : round2((grossValue * discountPercent) / 100);
    const netProjectValue = Math.max(0, round2(grossValue - discountAmount));

    // Get project commission split
    const commission = await ProjectCommission.findOne({ projectId: projId });
    const employeePercent = commission ? commission.employeePercent : 40;
    const officePercent = commission ? commission.officePercent : 10;
    const sharePercent = alloc.sharePercent ?? (alloc as any).sharePercentage ?? 100;

    // Expected = Net Project Value (post-client discount) * (Employee Category % / 100) * (Share % / 100)
    const expected = round2(
      (netProjectValue * employeePercent * sharePercent) / 10000
    );

    // Sum client payments received for this project
    const payments = await ClientPayment.find({ projectId: projId });
    const paymentsReceived = round2(
      payments.reduce((sum, p) => sum + fromDecimal(p.amount), 0)
    );

    // Client Debt / Outstanding balance taking client discount into account
    const clientDebt = Math.max(0, round2(netProjectValue - paymentsReceived));

    // Office Allocation based on net project value
    const officeAllocated = round2((netProjectValue * officePercent) / 100);

    // Earned = Payments Received * (Employee Category % / 100) * (Share % / 100)
    // Capped strictly at expected (which is based on net post-discount value)
    const earnedRaw = round2(
      (paymentsReceived * employeePercent * sharePercent) / 10000
    );
    const earned = Math.min(expected, earnedRaw);

    // Paid for this specific project
    // Find all paid settlements for this employee and project
    const paidItems = await SettlementItem.find({
      employeeId: { $in: allEmpIds },
      projectId: projId,
    });

    let paidForProject = 0;
    for (const item of paidItems) {
      const settlement = await Settlement.findById(item.settlementId);
      if (settlement && settlement.status === 'paid') {
        paidForProject += fromDecimal(item.earnedAmount);
      }
    }
    paidForProject = round2(paidForProject);

    const payableForProject = Math.max(0, round2(earned - paidForProject));
    const pendingForProject = Math.max(0, round2(expected - earned));

    totalExpected += expected;
    totalEarned += earned;

    projectDetails.push({
      id: projId.toString(),
      projectId: projId.toString(),
      projectCode: project.projectCode,
      projectName: project.projectName,
      title: project.projectName,
      projectValue: netProjectValue,
      grossProjectValue: grossValue,
      discountPercent,
      discountAmount,
      netProjectValue,
      clientDebt,
      officeSharePercent: officePercent,
      officeAllocated,
      paymentsReceived,
      employeeCategoryPercent: employeePercent,
      employeeSharePercent: sharePercent,
      sharePercent,
      sharePercentage: sharePercent,
      expectedCommission: expected,
      earnedCommission: earned,
      totalCommission: expected,
      paidCommission: paidForProject,
      paidAmount: paidForProject,
      payableBalance: payableForProject,
      netPayable: payableForProject,
      pendingCommission: pendingForProject,
      status: project.status || 'in_progress',
      roleInProject: alloc.roleInProject || 'Creator',
      earnedAmount: earned,
    });
  }

  // 2. Compute total paid across all settlements for this employee
  const paidSettlements = await Settlement.find({
    employeeId: { $in: allEmpIds },
    status: 'paid',
  });
  const totalPaid = round2(
    paidSettlements.reduce((sum, s) => sum + fromDecimal(s.finalPayable), 0)
  );

  totalExpected = round2(totalExpected);
  totalEarned = round2(totalEarned);
  const totalPayable = Math.max(0, round2(totalEarned - totalPaid));
  const totalPending = Math.max(0, round2(totalExpected - totalEarned));

  // Reconcile project-level paid commission with total actual payouts disbursed to employee
  // Any payout amount not explicitly tagged to a project via SettlementItem is attributed across assigned projects
  // so project-level "Paid" and "Remain" perfectly match the employee dashboard "Total Paid" and "Remaining Balance"
  const sumOfExplicitProjectPaid = round2(
    projectDetails.reduce((sum, p) => sum + (p.paidCommission || 0), 0)
  );
  let unallocatedPaid = Math.max(0, round2(totalPaid - sumOfExplicitProjectPaid));

  if (unallocatedPaid > 0 && projectDetails.length > 0) {
    for (const p of projectDetails) {
      if (unallocatedPaid <= 0) break;
      const remainingOnProject = Math.max(
        0,
        round2((p.expectedCommission || 0) - (p.paidCommission || 0))
      );
      if (remainingOnProject > 0) {
        const add = Math.min(unallocatedPaid, remainingOnProject);
        p.paidCommission = round2((p.paidCommission || 0) + add);
        p.paidAmount = p.paidCommission;
        p.payableBalance = Math.max(0, round2((p.earnedCommission || 0) - p.paidCommission));
        p.pendingCommission = Math.max(0, round2((p.expectedCommission || 0) - p.paidCommission));
        unallocatedPaid = round2(unallocatedPaid - add);
      }
    }
    // If surplus payout remains (e.g. advance payout exceeding all expected project commissions)
    if (unallocatedPaid > 0 && projectDetails.length > 0) {
      projectDetails[0].paidCommission = round2((projectDetails[0].paidCommission || 0) + unallocatedPaid);
      projectDetails[0].paidAmount = projectDetails[0].paidCommission;
      projectDetails[0].pendingCommission = Math.max(0, round2((projectDetails[0].expectedCommission || 0) - projectDetails[0].paidCommission));
      unallocatedPaid = 0;
    }
  }

  const summary = {
    totalExpected,
    totalEarned,
    totalEarnedCommission: totalEarned,
    totalPaid,
    totalPayable,
    payableBalance: totalPayable,
    totalPending,
  };

  return {
    employeeId: empId.toString(),
    totalExpected,
    totalEarned,
    totalEarnedCommission: totalEarned,
    totalPaid,
    totalPayable,
    payableBalance: totalPayable,
    totalPending,
    summary,
    projects: projectDetails,
    projectBreakdown: projectDetails,
  };
}

