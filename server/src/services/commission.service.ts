import { Types } from 'mongoose';
import { toDecimal, round2 } from '../utils/decimalHelper.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';

export interface CommissionSplitInput {
  brokerPercent: number;
  employeePercent: number;
  officePercent: number;
  adminPercent: number;
  settlementPercent: number;
}

export interface EmployeeShareInput {
  employeeId: string;
  sharePercent: number;
}

export function validateCommissionPercentages(split: CommissionSplitInput): void {
  const total = round2(
    split.brokerPercent +
      split.employeePercent +
      split.officePercent +
      split.adminPercent +
      split.settlementPercent
  );

  if (Math.abs(total - 100) > 0.01) {
    throw new Error(
      `Commission distribution must equal exactly 100%. Current total: ${total}%.`
    );
  }
}

export interface DiscountedSplitResult {
  grossProjectValue: number;
  discountPercent: number;
  discountAmount: number;
  netProjectValue: number;
  split: {
    brokerPercent: number;
    employeePercent: number;
    officePercent: number;
    adminPercent: number;
    settlementPercent: number;
    brokerAmount: number;
    employeeAmount: number;
    officeAmount: number;
    adminAmount: number;
    settlementAmount: number;
  };
}

export function calculateDiscountedSplit(
  grossProjectValue: number,
  discountPercent: number = 0,
  split: CommissionSplitInput
): DiscountedSplitResult {
  const discPct = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const discAmount = round2((grossProjectValue * discPct) / 100);
  const netProjectValue = Math.max(0, round2(grossProjectValue - discAmount));

  validateCommissionPercentages(split);

  const brokerAmount = round2((netProjectValue * split.brokerPercent) / 100);
  const employeeAmount = round2((netProjectValue * split.employeePercent) / 100);
  const officeAmount = round2((netProjectValue * split.officePercent) / 100);
  const adminAmount = round2((netProjectValue * split.adminPercent) / 100);
  const settlementAmount = round2((netProjectValue * split.settlementPercent) / 100);

  return {
    grossProjectValue,
    discountPercent: discPct,
    discountAmount: discAmount,
    netProjectValue,
    split: {
      brokerPercent: split.brokerPercent,
      employeePercent: split.employeePercent,
      officePercent: split.officePercent,
      adminPercent: split.adminPercent,
      settlementPercent: split.settlementPercent,
      brokerAmount,
      employeeAmount,
      officeAmount,
      adminAmount,
      settlementAmount,
    },
  };
}

export function calculateCommissionAmounts(
  projectValue: number,
  split: CommissionSplitInput,
  discountPercent: number = 0
) {
  validateCommissionPercentages(split);

  const discPct = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const discAmount = round2((projectValue * discPct) / 100);
  const effectiveValue = Math.max(0, round2(projectValue - discAmount));

  const brokerAmount = round2((effectiveValue * split.brokerPercent) / 100);
  const employeeAmount = round2((effectiveValue * split.employeePercent) / 100);
  const officeAmount = round2((effectiveValue * split.officePercent) / 100);
  const adminAmount = round2((effectiveValue * split.adminPercent) / 100);
  const settlementAmount = round2((effectiveValue * split.settlementPercent) / 100);

  return {
    brokerPercent: split.brokerPercent,
    employeePercent: split.employeePercent,
    officePercent: split.officePercent,
    adminPercent: split.adminPercent,
    settlementPercent: split.settlementPercent,
    brokerAmount: toDecimal(brokerAmount),
    employeeAmount: toDecimal(employeeAmount),
    officeAmount: toDecimal(officeAmount),
    adminAmount: toDecimal(adminAmount),
    settlementAmount: toDecimal(settlementAmount),
  };
}

export function validateEmployeeShares(shares: EmployeeShareInput[]): void {
  if (shares.length === 0) return;

  const total = round2(shares.reduce((acc, s) => acc + s.sharePercent, 0));
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(
      `Employee shares within the Employee Commission Pool must total 100%. Current total: ${total}%.`
    );
  }
}

export async function allocateEmployeePool(
  projectId: string | Types.ObjectId,
  employeeAmountNum: number,
  shares: EmployeeShareInput[]
) {
  validateEmployeeShares(shares);

  // Delete previous allocations
  await ProjectEmployee.deleteMany({ projectId });

  if (shares.length === 0) return [];

  const createdAllocations = [];
  for (const s of shares) {
    const allocated = round2((employeeAmountNum * s.sharePercent) / 100);
    const doc = await ProjectEmployee.create({
      projectId,
      employeeId: new Types.ObjectId(s.employeeId),
      sharePercent: s.sharePercent,
      allocatedCommission: toDecimal(allocated),
    });
    createdAllocations.push(doc);
  }

  return createdAllocations;
}
