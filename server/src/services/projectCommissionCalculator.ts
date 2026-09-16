import { fromDecimal, round2 } from '../utils/decimalHelper.js';

export interface CommissionSplitPercentages {
  brokerPercent: number;
  employeePercent: number;
  officePercent: number;
  adminPercent: number;
  settlementPercent: number;
}

export interface ProjectCategoryAmounts {
  brokerAmount: number;
  employeeAmount: number;
  officeAmount: number;
  adminAmount: number;
  settlementAmount: number;
}

export interface ProjectCommissionInput {
  projectId: string;
  netProjectValue: number;
  split: CommissionSplitPercentages;
}

export interface CategorySummaryItem {
  key: 'broker' | 'employee' | 'office' | 'admin' | 'settlement';
  name: string;
  amount: number;
  percent: number;
  color: string;
}

export interface WeightedCommissionSplitSummary {
  totalNetProjectValue: number;
  totalCategoryAmount: number;
  broker: { amount: number; percent: number };
  employee: { amount: number; percent: number };
  office: { amount: number; percent: number };
  admin: { amount: number; percent: number };
  settlement: { amount: number; percent: number };
  categories: CategorySummaryItem[];
}

export const DEFAULT_COMMISSION_SPLIT: CommissionSplitPercentages = Object.freeze({
  brokerPercent: 10,
  employeePercent: 40,
  officePercent: 10,
  adminPercent: 35,
  settlementPercent: 5,
});

/**
 * Calculates category amounts for an individual project based on its net value and saved category %.
 * Category Amount = Net Project Value * that project's category % / 100
 */
export function calculateProjectCategoryAmounts(
  netProjectValue: number,
  split: Partial<CommissionSplitPercentages> = {}
): ProjectCategoryAmounts {
  const safeNetValue = Math.max(0, Number(netProjectValue) || 0);

  const brokerPct = Math.max(0, Number(split.brokerPercent ?? DEFAULT_COMMISSION_SPLIT.brokerPercent) || 0);
  const employeePct = Math.max(0, Number(split.employeePercent ?? DEFAULT_COMMISSION_SPLIT.employeePercent) || 0);
  const officePct = Math.max(0, Number(split.officePercent ?? DEFAULT_COMMISSION_SPLIT.officePercent) || 0);
  const adminPct = Math.max(0, Number(split.adminPercent ?? DEFAULT_COMMISSION_SPLIT.adminPercent) || 0);
  const settlementPct = Math.max(0, Number(split.settlementPercent ?? DEFAULT_COMMISSION_SPLIT.settlementPercent) || 0);

  return {
    brokerAmount: round2((safeNetValue * brokerPct) / 100),
    employeeAmount: round2((safeNetValue * employeePct) / 100),
    officeAmount: round2((safeNetValue * officePct) / 100),
    adminAmount: round2((safeNetValue * adminPct) / 100),
    settlementAmount: round2((safeNetValue * settlementPct) / 100),
  };
}

/**
 * Computes project-value-weighted average splits across a collection of projects:
 *
 * For each project:
 *   Category Amount = Project Net Value * that project's saved category % / 100
 *
 * Total Category Amount = SUM(category amount of every project)
 * Weighted Average Category % = Total Category Amount / SUM(project net values) * 100
 *
 * If total net value is 0, percentages evaluate safely to 0 (or default fallback) without NaN.
 */
export function calculateWeightedCommissionSplits(
  projectInputs: ProjectCommissionInput[]
): WeightedCommissionSplitSummary {
  let totalNetProjectValue = 0;
  let totalBrokerAmount = 0;
  let totalEmployeeAmount = 0;
  let totalOfficeAmount = 0;
  let totalAdminAmount = 0;
  let totalSettlementAmount = 0;

  for (const item of projectInputs) {
    const netVal = Math.max(0, Number(item.netProjectValue) || 0);
    totalNetProjectValue += netVal;

    const amounts = calculateProjectCategoryAmounts(netVal, item.split);
    totalBrokerAmount += amounts.brokerAmount;
    totalEmployeeAmount += amounts.employeeAmount;
    totalOfficeAmount += amounts.officeAmount;
    totalAdminAmount += amounts.adminAmount;
    totalSettlementAmount += amounts.settlementAmount;
  }

  totalNetProjectValue = round2(totalNetProjectValue);
  totalBrokerAmount = round2(totalBrokerAmount);
  totalEmployeeAmount = round2(totalEmployeeAmount);
  totalOfficeAmount = round2(totalOfficeAmount);
  totalAdminAmount = round2(totalAdminAmount);
  totalSettlementAmount = round2(totalSettlementAmount);

  const totalCategoryAmount = round2(
    totalBrokerAmount +
      totalEmployeeAmount +
      totalOfficeAmount +
      totalAdminAmount +
      totalSettlementAmount
  );

  // Compute project-value-weighted percentages
  let brokerPercent =
    totalNetProjectValue > 0
      ? round2((totalBrokerAmount / totalNetProjectValue) * 100)
      : projectInputs.length > 0
      ? 0
      : DEFAULT_COMMISSION_SPLIT.brokerPercent;

  let employeePercent =
    totalNetProjectValue > 0
      ? round2((totalEmployeeAmount / totalNetProjectValue) * 100)
      : projectInputs.length > 0
      ? 0
      : DEFAULT_COMMISSION_SPLIT.employeePercent;

  let officePercent =
    totalNetProjectValue > 0
      ? round2((totalOfficeAmount / totalNetProjectValue) * 100)
      : projectInputs.length > 0
      ? 0
      : DEFAULT_COMMISSION_SPLIT.officePercent;

  let adminPercent =
    totalNetProjectValue > 0
      ? round2((totalAdminAmount / totalNetProjectValue) * 100)
      : projectInputs.length > 0
      ? 0
      : DEFAULT_COMMISSION_SPLIT.adminPercent;

  let settlementPercent =
    totalNetProjectValue > 0
      ? round2((totalSettlementAmount / totalNetProjectValue) * 100)
      : projectInputs.length > 0
      ? 0
      : DEFAULT_COMMISSION_SPLIT.settlementPercent;

  // Reconcile rounding differences so 5-tier percentages strictly sum to 100% when allocations cover 100% of project value
  if (totalNetProjectValue > 0 && Math.abs(totalCategoryAmount - totalNetProjectValue) < 1) {
    const currentSum = round2(brokerPercent + employeePercent + officePercent + adminPercent + settlementPercent);
    const diff = round2(100 - currentSum);
    if (Math.abs(diff) <= 0.05 && diff !== 0) {
      if (employeePercent >= adminPercent) {
        employeePercent = round2(employeePercent + diff);
      } else {
        adminPercent = round2(adminPercent + diff);
      }
    }
  }

  const categories: CategorySummaryItem[] = [
    {
      key: 'employee',
      name: 'Employee Pool',
      amount: totalEmployeeAmount,
      percent: employeePercent,
      color: '#FF5A1F',
    },
    {
      key: 'admin',
      name: 'Admin Share',
      amount: totalAdminAmount,
      percent: adminPercent,
      color: '#FFFFFF',
    },
    {
      key: 'office',
      name: 'Office Expense',
      amount: totalOfficeAmount,
      percent: officePercent,
      color: '#D4D4D8',
    },
    {
      key: 'broker',
      name: 'Broker Fee',
      amount: totalBrokerAmount,
      percent: brokerPercent,
      color: '#A855F7',
    },
    {
      key: 'settlement',
      name: 'Reserve Fund',
      amount: totalSettlementAmount,
      percent: settlementPercent,
      color: '#F59E0B',
    },
  ];

  return {
    totalNetProjectValue,
    totalCategoryAmount,
    broker: { amount: totalBrokerAmount, percent: brokerPercent },
    employee: { amount: totalEmployeeAmount, percent: employeePercent },
    office: { amount: totalOfficeAmount, percent: officePercent },
    admin: { amount: totalAdminAmount, percent: adminPercent },
    settlement: { amount: totalSettlementAmount, percent: settlementPercent },
    categories,
  };
}

/**
 * Extracts Net Project Value from a Project document/object.
 */
export function extractNetProjectValue(project: any): number {
  if (!project) return 0;
  const gross = fromDecimal(project.projectValue);
  const discountPercent = Number(project.discountPercent) || 0;
  const discountAmount = project.discountAmount
    ? fromDecimal(project.discountAmount)
    : round2((gross * discountPercent) / 100);
  return Math.max(0, round2(gross - discountAmount));
}

/**
 * Builds ProjectCommissionInput array from raw projects and commission documents/map.
 */
export function buildProjectCommissionInputs(
  projects: any[],
  commissions: any[] | Map<string, any>
): ProjectCommissionInput[] {
  const commMap =
    commissions instanceof Map
      ? commissions
      : new Map<string, any>(
          commissions
            .filter((c) => c && c.projectId)
            .map((c) => [c.projectId.toString(), c])
        );

  return projects.map((p) => {
    const pId = (p._id || p.id || '').toString();
    const netProjectValue = extractNetProjectValue(p);
    const comm = commMap.get(pId);

    const split: CommissionSplitPercentages = {
      brokerPercent: comm?.brokerPercent != null ? Number(comm.brokerPercent) : DEFAULT_COMMISSION_SPLIT.brokerPercent,
      employeePercent: comm?.employeePercent != null ? Number(comm.employeePercent) : DEFAULT_COMMISSION_SPLIT.employeePercent,
      officePercent: comm?.officePercent != null ? Number(comm.officePercent) : DEFAULT_COMMISSION_SPLIT.officePercent,
      adminPercent: comm?.adminPercent != null ? Number(comm.adminPercent) : DEFAULT_COMMISSION_SPLIT.adminPercent,
      settlementPercent: comm?.settlementPercent != null ? Number(comm.settlementPercent) : DEFAULT_COMMISSION_SPLIT.settlementPercent,
    };

    return {
      projectId: pId,
      netProjectValue,
      split,
    };
  });
}
