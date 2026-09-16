import { Project } from '../models/Project.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { WorkLog } from '../models/WorkLog.js';
import { Settlement } from '../models/Settlement.js';
import { fromDecimal, round2 } from '../utils/decimalHelper.js';
import {
  calculateFinancialMetrics,
  calculateMonthlyTrends,
  calculateEmployeeFinanceMetrics,
  calculateSettlementReserveMetrics,
  getMonthDateRange,
  getNetProjectValue,
} from './dashboardFinance.js';
import {
  buildProjectCommissionInputs,
  calculateWeightedCommissionSplits,
} from './projectCommissionCalculator.js';

export async function getAdminDashboardMetrics(monthsCount: number = 6, targetMonth?: string) {
  const count = Math.min(36, Math.max(3, Number(monthsCount) || 6));
  const now = new Date();

  // 1. Calculate Core Financial Metrics using Shared Source of Truth
  const [
    finMetrics,
    empFinance,
    settlementFinance,
    monthlyTrends,
    allProjects,
    allPayments,
    allCommissions,
    pendingWorkLogsCount,
    pendingSettlementsCount,
  ] = await Promise.all([
    calculateFinancialMetrics({ targetMonth }),
    calculateEmployeeFinanceMetrics(targetMonth),
    calculateSettlementReserveMetrics(targetMonth),
    calculateMonthlyTrends(count),
    Project.find().lean(),
    ClientPayment.find().lean(),
    ProjectCommission.find().lean(),
    WorkLog.countDocuments({ status: 'submitted' }),
    Settlement.countDocuments({ status: 'draft' }),
  ]);

  const { startDate, endDate, isAllMonths } = getMonthDateRange(targetMonth);

  // 2. Commission Allocation for distribution donut & allocation cards (Strictly Month-Wise by Project Booking Month)
  const commissionMap = new Map<string, any>();
  for (const c of allCommissions) {
    if (c.projectId) {
      commissionMap.set(c.projectId.toString(), c);
    }
  }

  // Filter projects strictly by booking/creation month (matches dashboardFinance newProjectValue logic)
  // Only projects whose start date or creation date falls within the selected month
  const bookedInMonthProjects = allProjects.filter((p) => {
    if (isAllMonths || !startDate || !endDate) return true;
    const pDate = new Date(p.startDate || p.createdAt || 0);
    return pDate >= startDate && pDate <= endDate;
  });

  // Broader filter for status distribution (includes projects active in the month)
  const currentMonthProjects = allProjects.filter((p) => {
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

  // Calculate project-value-weighted average splits using only projects booked in the selected month
  const projectsToCalculate =
    bookedInMonthProjects.length > 0
      ? bookedInMonthProjects
      : allProjects.filter((p) => p.status !== 'cancelled');
  const projectInputs = buildProjectCommissionInputs(projectsToCalculate, commissionMap);
  const weightedSplits = calculateWeightedCommissionSplits(projectInputs);

  const totalBrokerAllocation = weightedSplits.broker.amount;
  const totalEmployeeAllocation = weightedSplits.employee.amount;
  const totalOfficeAllocation = weightedSplits.office.amount;
  const totalAdminShare = weightedSplits.admin.amount;
  const totalSettlementReserve = weightedSplits.settlement.amount;

  const brokerPercent = weightedSplits.broker.percent;
  const employeePercent = weightedSplits.employee.percent;
  const officePercent = weightedSplits.office.percent;
  const adminPercent = weightedSplits.admin.percent;
  const settlementPercent = weightedSplits.settlement.percent;

  // Reconcile settlementReserveRate with weighted settlement percentage
  settlementFinance.settlementReserveRate = settlementPercent;

  const distribution = [
    {
      name: 'Employee Pool',
      key: 'employee',
      value: employeePercent,
      amount: totalEmployeeAllocation,
      color: '#FF5A1F',
    },
    {
      name: 'Admin Share',
      key: 'admin',
      value: adminPercent,
      amount: totalAdminShare,
      color: '#FFFFFF',
    },
    {
      name: 'Office Expense',
      key: 'office',
      value: officePercent,
      amount: totalOfficeAllocation,
      color: '#D4D4D8',
    },
    {
      name: 'Broker Fee',
      key: 'broker',
      value: brokerPercent,
      amount: totalBrokerAllocation,
      color: '#FB923C',
    },
    {
      name: 'Reserve Fund',
      key: 'settlement',
      value: settlementPercent,
      amount: totalSettlementReserve,
      color: '#64748B',
    },
  ];

  // 3. Project Status Distribution
  const statusDistribution: Record<string, number> = {
    confirmed: 0,
    in_progress: 0,
    review: 0,
    completed: 0,
    delivered: 0,
  };

  for (const p of currentMonthProjects) {
    if (statusDistribution[p.status] !== undefined) {
      statusDistribution[p.status]++;
    }
  }

  // 4. Available Months List
  const availableMonthsMap: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    availableMonthsMap[k] = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }
  for (const p of allProjects) {
    if (p.createdAt) {
      const d = new Date(p.createdAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!availableMonthsMap[k]) {
        availableMonthsMap[k] = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      }
    }
  }
  for (const pm of allPayments) {
    const d = new Date(pm.paymentDate || pm.createdAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!availableMonthsMap[k]) {
      availableMonthsMap[k] = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }
  }

  const availableMonths = Object.entries(availableMonthsMap)
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => b.key.localeCompare(a.key));

  return {
    kpis: {
      // 6 Primary Financial Cards
      newProjectValue: finMetrics.newProjectValue,
      cashCollected: finMetrics.cashCollected,
      currentMonthCollection: finMetrics.currentMonthCollection,
      previousOutstandingCollected: finMetrics.previousOutstandingCollected,
      openingReceivable: finMetrics.openingReceivable,
      closingReceivable: finMetrics.closingReceivable,

      // Cash Reconciliation
      appliedCollections: finMetrics.appliedCollections,
      unappliedCash: finMetrics.unappliedCash,
      excessCash: finMetrics.excessCash,
      needsReview: finMetrics.needsReview,

      // Rates & Info Message
      collectionRate: finMetrics.collectionRate,
      hasPreviousCollections: finMetrics.hasPreviousCollections,
      previousCollectionsMessage: finMetrics.previousCollectionsMessage,

      // Employee Finance
      expectedCommission: empFinance.expectedCommission,
      earnedCommission: empFinance.earnedCommission,
      employeePaid: empFinance.employeePaid,
      employeePayable: empFinance.employeePayable,
      employeeAdvance: empFinance.employeeAdvance,

      // Settlement Reserve
      settlementReserveExpected: settlementFinance.settlementReserveExpected,
      settlementReserveAccrued: settlementFinance.settlementReserveAccrued,
      settlementReserveRate: settlementFinance.settlementReserveRate,

      // Legacy & Direct Allocation Aliases
      totalProjectValue: finMetrics.newProjectValue,
      totalReceived: finMetrics.cashCollected,
      outstandingAmount: finMetrics.closingReceivable,
      totalEmployeeAllocation,
      totalAdminShare,
      totalOfficeAllocation,
      totalBrokerAllocation,
      totalSettlementReserve,

      // Weighted Split Percentages
      employeePercent,
      adminPercent,
      officePercent,
      brokerPercent,
      settlementPercent,

      // Project Counts
      totalProjectsCount: finMetrics.newProjectsCount,
      allTimeProjectsCount: allProjects.length,
      pendingWorkLogsCount,
      pendingSettlementsCount,
    },
    financialMetrics: finMetrics,
    employeeFinance: empFinance,
    settlementReserve: settlementFinance,
    commissionSplit: {
      totalNetProjectValue: weightedSplits.totalNetProjectValue,
      totalCategoryAmount: weightedSplits.totalCategoryAmount,
      employee: weightedSplits.employee,
      admin: weightedSplits.admin,
      office: weightedSplits.office,
      broker: weightedSplits.broker,
      settlement: weightedSplits.settlement,
    },
    monthlyTrends,
    monthlyTrend: monthlyTrends,
    monthlyChart: monthlyTrends,
    distribution,
    statusDistribution,
    availableMonths,
    selectedMonth: targetMonth || 'all',
    selectedRange: count,
  };
}
