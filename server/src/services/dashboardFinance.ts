import { Types } from 'mongoose';
import { Project } from '../models/Project.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { Settlement } from '../models/Settlement.js';
import { fromDecimal, round2 } from '../utils/decimalHelper.js';

export interface FinancialMetrics {
  // 6 Primary Metrics
  newProjectValue: number;
  cashCollected: number;
  currentMonthCollection: number;
  previousOutstandingCollected: number;
  openingReceivable: number;
  closingReceivable: number;

  // Supporting Cash Accounting
  appliedCollections: number;
  unappliedCash: number;
  excessCash: number;
  needsReview: number;

  // Rates and Flags
  collectionRate: number; // Current-Month Project Collection / New Project Value
  hasPreviousCollections: boolean;
  previousCollectionsMessage: string;

  // Cumulative / All-time context
  totalAllTimeProjectValue: number;
  totalAllTimeCashCollected: number;
  totalAllTimeReceivable: number;

  // Counts
  newProjectsCount: number;
  activeProjectsCount: number;
  paymentsCount: number;

  selectedMonth: string;
  isAllMonths: boolean;
}

export interface EmployeeFinanceMetrics {
  expectedCommission: number;
  earnedCommission: number;
  employeePaid: number;
  employeePayable: number;
  employeeAdvance: number;
}

export interface SettlementReserveMetrics {
  settlementReserveExpected: number;
  settlementReserveAccrued: number;
  settlementReserveRate: number;
}

export interface MonthlyTrendPoint {
  key: string;
  month: string;
  bookings: number; // New Project Value
  revenue: number; // Alias for bookings
  collections: number; // Cash Collected
  collected: number; // Alias for collections
  currentMonthCollection: number;
  previousOutstandingCollected: number;
  openingReceivable: number;
  closingReceivable: number;
  appliedCollections: number;
  unappliedCash: number;
}

/**
 * Calculates net project value taking discount percent or flat discount into account.
 */
export function getNetProjectValue(project: any): number {
  if (!project) return 0;
  const gross = fromDecimal(project.projectValue);
  const discountPercent = Number(project.discountPercent) || 0;
  const discountAmount = project.discountAmount
    ? fromDecimal(project.discountAmount)
    : round2((gross * discountPercent) / 100);
  return Math.max(0, round2(gross - discountAmount));
}

/**
 * Parses month string (e.g. '2026-09') into Date range [startDate, endDate].
 */
export function getMonthDateRange(targetMonth?: string): {
  startDate: Date | null;
  endDate: Date | null;
  monthLabel: string;
  isAllMonths: boolean;
} {
  if (!targetMonth || targetMonth === 'all') {
    return { startDate: null, endDate: null, monthLabel: 'All Time', isAllMonths: true };
  }
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) {
    return { startDate: null, endDate: null, monthLabel: 'All Time', isAllMonths: true };
  }
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const monthLabel = startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  return { startDate, endDate, monthLabel, isAllMonths: false };
}

/**
 * Core shared calculation of financial metrics for Admin Dashboard or a specific Client.
 */
export async function calculateFinancialMetrics(options: {
  clientId?: string | Types.ObjectId;
  targetMonth?: string;
}): Promise<FinancialMetrics> {
  const { clientId, targetMonth } = options;
  const { startDate, endDate, monthLabel, isAllMonths } = getMonthDateRange(targetMonth);

  // 1. Fetch relevant projects and payments
  const projectQuery: any = {};
  const paymentQuery: any = {};

  if (clientId) {
    const cId = typeof clientId === 'string' ? new Types.ObjectId(clientId) : clientId;
    projectQuery.clientId = cId;
    paymentQuery.clientId = cId;
  }

  const [allProjects, allPayments] = await Promise.all([
    Project.find(projectQuery).lean(),
    ClientPayment.find(paymentQuery).sort({ paymentDate: 1, createdAt: 1 }).lean(),
  ]);

  const projectMap = new Map<string, any>();
  const projectPaymentsBeforeMonth = new Map<string, number>();
  const projectPaymentsInMonth = new Map<string, number>();
  const projectTotalPaymentsAllTime = new Map<string, number>();

  for (const p of allProjects) {
    projectMap.set(p._id.toString(), p);
    projectPaymentsBeforeMonth.set(p._id.toString(), 0);
    projectPaymentsInMonth.set(p._id.toString(), 0);
    projectTotalPaymentsAllTime.set(p._id.toString(), 0);
  }

  // 2. Identify projects booked before and during the selected month
  const olderProjects: any[] = [];
  const currentMonthProjects: any[] = [];

  for (const p of allProjects) {
    const pDate = new Date(p.startDate || p.createdAt || 0);
    if (!isAllMonths && startDate && pDate < startDate) {
      olderProjects.push(p);
    } else if (isAllMonths || (startDate && endDate && pDate >= startDate && pDate <= endDate)) {
      currentMonthProjects.push(p);
    }
  }

  // 3. Process all payments with project allocation
  let cashCollected = 0;
  let currentMonthCollection = 0;
  let previousOutstandingCollected = 0;
  let unappliedCash = 0;
  let excessCash = 0;
  let paymentsInMonthCount = 0;

  for (const pm of allPayments) {
    const pmDate = new Date(pm.paymentDate || pm.createdAt || 0);
    const amt = fromDecimal(pm.amount);
    const pIdStr = pm.projectId ? pm.projectId.toString() : null;
    const isLinkedToKnownProject = pIdStr && projectMap.has(pIdStr);

    const isBeforeMonth = !isAllMonths && startDate && pmDate < startDate;
    const isInMonth = isAllMonths || (startDate && endDate && pmDate >= startDate && pmDate <= endDate);

    if (isBeforeMonth) {
      if (isLinkedToKnownProject) {
        projectPaymentsBeforeMonth.set(
          pIdStr!,
          (projectPaymentsBeforeMonth.get(pIdStr!) || 0) + amt
        );
      }
    } else if (isInMonth) {
      cashCollected = round2(cashCollected + amt);
      paymentsInMonthCount++;

      if (!isLinkedToKnownProject) {
        // Payment has no linked project or invalid project
        unappliedCash = round2(unappliedCash + amt);
      } else {
        const linkedProject = projectMap.get(pIdStr!)!;
        const projNetVal = getNetProjectValue(linkedProject);
        const priorPaymentsOnProject = projectPaymentsBeforeMonth.get(pIdStr!) || 0;
        const currentMonthPriorOnProject = projectPaymentsInMonth.get(pIdStr!) || 0;
        const totalPaidBeforeThis = priorPaymentsOnProject + currentMonthPriorOnProject;
        const remainingCapacity = Math.max(0, round2(projNetVal - totalPaidBeforeThis));

        const appliedPortion = Math.min(amt, remainingCapacity);
        const excessPortion = Math.max(0, round2(amt - appliedPortion));

        if (excessPortion > 0) {
          excessCash = round2(excessCash + excessPortion);
        }

        projectPaymentsInMonth.set(
          pIdStr!,
          (projectPaymentsInMonth.get(pIdStr!) || 0) + appliedPortion
        );

        // Check if project was booked in current month or prior
        const projBookedDate = new Date(linkedProject.startDate || linkedProject.createdAt || 0);
        const isProjectBookedInMonth = isAllMonths || (startDate && projBookedDate >= startDate);

        if (isProjectBookedInMonth) {
          currentMonthCollection = round2(currentMonthCollection + appliedPortion);
        } else {
          previousOutstandingCollected = round2(previousOutstandingCollected + appliedPortion);
        }
      }
    }

    if (isLinkedToKnownProject) {
      projectTotalPaymentsAllTime.set(
        pIdStr!,
        (projectTotalPaymentsAllTime.get(pIdStr!) || 0) + amt
      );
    }
  }

  // 4. Calculate Opening Receivable
  // Sum of outstanding balances across all clients before month start (equals prior month closing receivable)
  let openingReceivable = 0;
  if (!isAllMonths && startDate) {
    const clientValuesBefore = new Map<string, number>();
    const clientPaymentsBefore = new Map<string, number>();

    for (const p of allProjects) {
      const pDate = new Date(p.startDate || p.createdAt || 0);
      if (pDate < startDate) {
        const cId = p.clientId ? p.clientId.toString() : 'general';
        const netVal = getNetProjectValue(p);
        clientValuesBefore.set(cId, (clientValuesBefore.get(cId) || 0) + netVal);
      }
    }

    for (const pm of allPayments) {
      const pmDate = new Date(pm.paymentDate || pm.createdAt || 0);
      if (pmDate < startDate) {
        const cId = pm.clientId ? pm.clientId.toString() : 'general';
        const amt = fromDecimal(pm.amount);
        clientPaymentsBefore.set(cId, (clientPaymentsBefore.get(cId) || 0) + amt);
      }
    }

    const allClientIds = new Set([
      ...clientValuesBefore.keys(),
      ...clientPaymentsBefore.keys(),
    ]);

    for (const cId of allClientIds) {
      const cVal = clientValuesBefore.get(cId) || 0;
      const cPaid = clientPaymentsBefore.get(cId) || 0;
      const cDue = Math.max(0, round2(cVal - cPaid));
      openingReceivable = round2(openingReceivable + cDue);
    }
  }

  // 5. Calculate New Project Value
  const newProjectValue = round2(
    currentMonthProjects.reduce((sum, p) => sum + getNetProjectValue(p), 0)
  );

  // 6. Applied Collections
  const appliedCollections = round2(currentMonthCollection + previousOutstandingCollected);

  // 7. Closing Receivable
  // Formula: Opening Receivable + New Project Value - Applied Collections
  let closingReceivable = 0;
  if (isAllMonths) {
    // Cumulative all-time outstanding across all projects
    const totalAllTimeNet = allProjects.reduce((sum, p) => sum + getNetProjectValue(p), 0);
    const totalAllTimeApplied = Array.from(projectTotalPaymentsAllTime.values()).reduce(
      (sum, pPaid, idx) => {
        const p = allProjects[idx];
        const net = p ? getNetProjectValue(p) : pPaid;
        return sum + Math.min(net, pPaid);
      },
      0
    );
    closingReceivable = Math.max(0, round2(totalAllTimeNet - totalAllTimeApplied));
  } else {
    closingReceivable = Math.max(
      0,
      round2(openingReceivable + newProjectValue - appliedCollections)
    );
  }

  // 8. Collection Rate: Current-Month Project Collection / New Project Value
  const collectionRate =
    newProjectValue > 0 ? round2((currentMonthCollection / newProjectValue) * 100) : 0;

  // 9. Informational Message
  const hasPreviousCollections = previousOutstandingCollected > 0;
  const monthName = isAllMonths ? 'selected period' : monthLabel;
  const previousCollectionsMessage = hasPreviousCollections
    ? `₹${previousOutstandingCollected.toLocaleString('en-IN')} of ${monthName} collections came from projects booked in previous months.`
    : '';

  // 10. All-time cumulative numbers
  const totalAllTimeProjectValue = round2(
    allProjects.reduce((sum, p) => sum + getNetProjectValue(p), 0)
  );
  const totalAllTimeCashCollected = round2(
    allPayments.reduce((sum, pm) => sum + fromDecimal(pm.amount), 0)
  );
  const totalAllTimeReceivable = Math.max(
    0,
    round2(totalAllTimeProjectValue - totalAllTimeCashCollected)
  );

  const activeProjectsCount = currentMonthProjects.filter((p) =>
    ['confirmed', 'in_progress', 'review'].includes(p.status)
  ).length;

  return {
    newProjectValue,
    cashCollected,
    currentMonthCollection,
    previousOutstandingCollected,
    openingReceivable,
    closingReceivable,
    appliedCollections,
    unappliedCash,
    excessCash,
    needsReview: unappliedCash,
    collectionRate,
    hasPreviousCollections,
    previousCollectionsMessage,
    totalAllTimeProjectValue,
    totalAllTimeCashCollected,
    totalAllTimeReceivable,
    newProjectsCount: currentMonthProjects.length,
    activeProjectsCount,
    paymentsCount: paymentsInMonthCount,
    selectedMonth: targetMonth || 'all',
    isAllMonths,
  };
}

/**
 * Calculates Employee Finance Metrics:
 * - Expected Commission = full potential employee allocation from project value
 * - Earned Commission = actual valid client collections * employee pool % * employee project share %
 * - Employee Paid = actual payouts disbursed via paid settlements
 * - Employee Payable = max(Earned - Paid, 0)
 * - Employee Advance = max(Paid - Earned, 0)
 */
export async function calculateEmployeeFinanceMetrics(
  targetMonth?: string
): Promise<EmployeeFinanceMetrics> {
  const { startDate, endDate, isAllMonths } = getMonthDateRange(targetMonth);

  const [allProjects, allPayments, allCommissions, allShares, allPaidSettlements] =
    await Promise.all([
      Project.find().lean(),
      ClientPayment.find().lean(),
      ProjectCommission.find().lean(),
      ProjectEmployee.find().lean(),
      Settlement.find({ status: 'paid' }).lean(),
    ]);

  const commissionMap = new Map<string, any>();
  for (const c of allCommissions) {
    if (c.projectId) commissionMap.set(c.projectId.toString(), c);
  }

  const projectMap = new Map<string, any>();
  for (const p of allProjects) {
    projectMap.set(p._id.toString(), p);
  }

  // Group payments by project up to the relevant period
  const paymentsByProject = new Map<string, number>();
  for (const pm of allPayments) {
    if (!pm.projectId) continue;
    const pmDate = new Date(pm.paymentDate || pm.createdAt);
    if (!isAllMonths && endDate && pmDate > endDate) continue;
    const pId = pm.projectId.toString();
    const amt = fromDecimal(pm.amount);
    paymentsByProject.set(pId, (paymentsByProject.get(pId) || 0) + amt);
  }

  let totalExpectedCommission = 0;
  let totalEarnedCommission = 0;

  const matchedProjects = allProjects.filter((p) => {
    if (isAllMonths || !startDate || !endDate) return true;
    const createdDate = p.createdAt ? new Date(p.createdAt) : null;
    const sDate = p.startDate ? new Date(p.startDate) : null;
    const dDate = p.deadline ? new Date(p.deadline) : null;
    const delDate = p.deliveredAt ? new Date(p.deliveredAt) : null;

    const isCreatedInMonth = Boolean(createdDate && createdDate >= startDate && createdDate <= endDate);
    const isStartedInMonth = Boolean(sDate && sDate >= startDate && sDate <= endDate);
    const isActiveInMonth = Boolean(
      sDate &&
      sDate <= endDate &&
      (!dDate || dDate >= startDate) &&
      (!delDate || delDate >= startDate) &&
      p.status !== 'cancelled'
    );

    return isCreatedInMonth || isStartedInMonth || isActiveInMonth;
  });

  const relevantProjects =
    matchedProjects.length > 0
      ? matchedProjects
      : allProjects.filter((p) => p.status !== 'cancelled');

  for (const p of relevantProjects) {
    const pId = p._id.toString();
    const netVal = getNetProjectValue(p);
    const comm = commissionMap.get(pId);
    const employeePercent = comm ? comm.employeePercent : 40;

    // Full potential employee allocation from net project value
    const expected = round2((netVal * employeePercent) / 100);
    totalExpectedCommission += expected;

    // Collections applied to project
    const collectedOnProject = Math.min(netVal, paymentsByProject.get(pId) || 0);
    const earned = round2((collectedOnProject * employeePercent) / 100);
    totalEarnedCommission += earned;
  }

  // Actual employee payouts disbursed
  let totalEmployeePaid = 0;
  for (const s of allPaidSettlements) {
    const sDate = new Date(s.paymentDate || s.createdAt);
    if (!isAllMonths && startDate && endDate) {
      if (sDate >= startDate && sDate <= endDate) {
        totalEmployeePaid += fromDecimal(s.finalPayable);
      }
    } else {
      totalEmployeePaid += fromDecimal(s.finalPayable);
    }
  }

  totalExpectedCommission = round2(totalExpectedCommission);
  totalEarnedCommission = round2(totalEarnedCommission);
  totalEmployeePaid = round2(totalEmployeePaid);

  const employeePayable = Math.max(0, round2(totalEarnedCommission - totalEmployeePaid));
  const employeeAdvance = Math.max(0, round2(totalEmployeePaid - totalEarnedCommission));

  return {
    expectedCommission: totalExpectedCommission,
    earnedCommission: totalEarnedCommission,
    employeePaid: totalEmployeePaid,
    employeePayable,
    employeeAdvance,
  };
}

/**
 * Calculates Settlement Reserve (Project Reserve Fund) Metrics:
 * - Settlement Reserve is NOT employee payout.
 * - Settlement Reserve Expected = Net Project Value * Settlement %
 * - Settlement Reserve Accrued = Actual Valid Collections * Settlement %
 */
export async function calculateSettlementReserveMetrics(
  targetMonth?: string
): Promise<SettlementReserveMetrics> {
  const { startDate, endDate, isAllMonths } = getMonthDateRange(targetMonth);

  const [allProjects, allPayments, allCommissions] = await Promise.all([
    Project.find().lean(),
    ClientPayment.find().lean(),
    ProjectCommission.find().lean(),
  ]);

  const commissionMap = new Map<string, any>();
  for (const c of allCommissions) {
    if (c.projectId) commissionMap.set(c.projectId.toString(), c);
  }

  const paymentsByProject = new Map<string, number>();
  for (const pm of allPayments) {
    if (!pm.projectId) continue;
    const pmDate = new Date(pm.paymentDate || pm.createdAt);
    if (!isAllMonths && endDate && pmDate > endDate) continue;
    const pId = pm.projectId.toString();
    const amt = fromDecimal(pm.amount);
    paymentsByProject.set(pId, (paymentsByProject.get(pId) || 0) + amt);
  }

  const matchedReserveProjects = allProjects.filter((p) => {
    if (isAllMonths || !startDate || !endDate) return true;
    const createdDate = p.createdAt ? new Date(p.createdAt) : null;
    const sDate = p.startDate ? new Date(p.startDate) : null;
    const dDate = p.deadline ? new Date(p.deadline) : null;
    const delDate = p.deliveredAt ? new Date(p.deliveredAt) : null;

    const isCreatedInMonth = Boolean(createdDate && createdDate >= startDate && createdDate <= endDate);
    const isStartedInMonth = Boolean(sDate && sDate >= startDate && sDate <= endDate);
    const isActiveInMonth = Boolean(
      sDate &&
      sDate <= endDate &&
      (!dDate || dDate >= startDate) &&
      (!delDate || delDate >= startDate) &&
      p.status !== 'cancelled'
    );

    return isCreatedInMonth || isStartedInMonth || isActiveInMonth;
  });

  const relevantProjects =
    matchedReserveProjects.length > 0
      ? matchedReserveProjects
      : allProjects.filter((p) => p.status !== 'cancelled');

  let settlementReserveExpected = 0;
  let settlementReserveAccrued = 0;
  let totalNetProjectValue = 0;

  for (const p of relevantProjects) {
    const pId = p._id.toString();
    const netVal = getNetProjectValue(p);
    totalNetProjectValue += netVal;

    const comm = commissionMap.get(pId);
    const reservePercent = comm?.settlementPercent != null ? Number(comm.settlementPercent) : 5;

    const expected = round2((netVal * reservePercent) / 100);
    settlementReserveExpected += expected;

    const collected = Math.min(netVal, paymentsByProject.get(pId) || 0);
    const accrued = round2((collected * reservePercent) / 100);
    settlementReserveAccrued += accrued;
  }

  totalNetProjectValue = round2(totalNetProjectValue);
  settlementReserveExpected = round2(settlementReserveExpected);
  settlementReserveAccrued = round2(settlementReserveAccrued);

  const weightedReserveRate =
    totalNetProjectValue > 0
      ? round2((settlementReserveExpected / totalNetProjectValue) * 100)
      : relevantProjects.length > 0
      ? 0
      : 5;

  return {
    settlementReserveExpected,
    settlementReserveAccrued,
    settlementReserveRate: weightedReserveRate,
  };
}

/**
 * Calculates monthly trends across the specified count of months for:
 * 1. Bookings vs Cash Collection
 * 2. Receivable Reconciliation (Opening + Bookings - Collections = Closing)
 * 3. Collection Mix (Current Month Collections vs Previous Outstanding Collected vs Unapplied)
 */
export async function calculateMonthlyTrends(
  monthsCount: number = 6,
  clientId?: string | Types.ObjectId
): Promise<MonthlyTrendPoint[]> {
  const now = new Date();
  const count = Math.min(36, Math.max(3, Number(monthsCount) || 6));
  const trendPoints: MonthlyTrendPoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const displayMonth = d.toLocaleString('en-US', { month: 'short' });

    // Calculate exact metrics for this month
    const m = await calculateFinancialMetrics({
      clientId,
      targetMonth: key,
    });

    trendPoints.push({
      key,
      month: displayMonth,
      bookings: m.newProjectValue,
      revenue: m.newProjectValue,
      collections: m.cashCollected,
      collected: m.cashCollected,
      currentMonthCollection: m.currentMonthCollection,
      previousOutstandingCollected: m.previousOutstandingCollected,
      openingReceivable: m.openingReceivable,
      closingReceivable: m.closingReceivable,
      appliedCollections: m.appliedCollections,
      unappliedCash: m.unappliedCash,
    });
  }

  return trendPoints;
}
