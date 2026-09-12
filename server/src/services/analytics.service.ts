import { Project } from '../models/Project.js';
import { ProjectCommission } from '../models/ProjectCommission.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { WorkLog } from '../models/WorkLog.js';
import { Settlement } from '../models/Settlement.js';
import { Attendance } from '../models/Attendance.js';
import { fromDecimal, round2 } from '../utils/decimalHelper.js';

export async function getAdminDashboardMetrics(monthsCount: number = 6, targetMonth?: string) {
  const [allProjects, allPayments, allCommissions] = await Promise.all([
    Project.find().lean(),
    ClientPayment.find().lean(),
    ProjectCommission.find().lean(),
  ]);

  // Determine if specific targetMonth is selected (e.g. '2026-09')
  let kpiProjects = allProjects;
  let kpiPayments = allPayments;
  let kpiCommissions = allCommissions;

  if (targetMonth && targetMonth !== 'all') {
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!isNaN(year) && !isNaN(month)) {
      const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      kpiProjects = allProjects.filter((p) => {
        const d = new Date(p.startDate || p.createdAt);
        return d >= startDate && d <= endDate;
      });

      kpiPayments = allPayments.filter((pm) => {
        const d = new Date(pm.paymentDate || pm.createdAt);
        return d >= startDate && d <= endDate;
      });

      const kpiProjectIds = new Set(kpiProjects.map((p) => p._id.toString()));
      kpiCommissions = allCommissions.filter((c) => {
        if (c.projectId && kpiProjectIds.has(c.projectId.toString())) return true;
        const d = new Date(c.createdAt);
        return d >= startDate && d <= endDate;
      });
    }
  }

  // 1. Projects & Values (Filtered with discount awareness)
  const totalProjectValue = round2(
    kpiProjects.reduce((sum, p) => {
      const grossVal = fromDecimal(p.projectValue);
      const discountPercent = Number(p.discountPercent) || 0;
      const discountAmount = p.discountAmount
        ? fromDecimal(p.discountAmount)
        : round2((grossVal * discountPercent) / 100);
      const netVal = Math.max(0, round2(grossVal - discountAmount));
      return sum + netVal;
    }, 0)
  );

  // 2. Client Payments Received (Filtered)
  const totalReceived = round2(
    kpiPayments.reduce((sum, p) => sum + fromDecimal(p.amount), 0)
  );
  const outstandingAmount = Math.max(0, round2(totalProjectValue - totalReceived));

  // 3. Commission Allocations (Filtered)
  let totalBrokerAllocation = 0;
  let totalEmployeeAllocation = 0;
  let totalOfficeAllocation = 0;
  let totalAdminShare = 0;
  let totalSettlementReserve = 0;

  for (const c of kpiCommissions) {
    totalBrokerAllocation += fromDecimal(c.brokerAmount || 0);
    totalEmployeeAllocation += fromDecimal(c.employeeAmount);
    totalOfficeAllocation += fromDecimal(c.officeAmount);
    totalAdminShare += fromDecimal(c.adminAmount);
    totalSettlementReserve += fromDecimal(c.settlementAmount);
  }

  totalBrokerAllocation = round2(totalBrokerAllocation);
  totalEmployeeAllocation = round2(totalEmployeeAllocation);
  totalOfficeAllocation = round2(totalOfficeAllocation);
  totalAdminShare = round2(totalAdminShare);
  totalSettlementReserve = round2(totalSettlementReserve);

  // 4. Monthly Trend Breakdown for Chart (Requested Timeframe)
  const now = new Date();
  const count = Math.min(36, Math.max(3, Number(monthsCount) || 6));
  const monthMap: Record<string, {
    month: string;
    key: string;
    revenue: number;
    collections: number;
    collected: number;
    adminShare: number;
    employeeCommission: number;
    profit: number;
  }> = {};

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const displayMonth = d.toLocaleString('en-US', { month: 'short' });
    monthMap[key] = {
      month: displayMonth,
      key,
      revenue: 0,
      collections: 0,
      collected: 0,
      adminShare: 0,
      employeeCommission: 0,
      profit: 0,
    };
  }

  // Populate from all projects and payments for smooth trends
  for (const p of allProjects) {
    const d = new Date(p.startDate || p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) {
      const grossVal = fromDecimal(p.projectValue);
      const discountPercent = Number(p.discountPercent) || 0;
      const discountAmount = p.discountAmount
        ? fromDecimal(p.discountAmount)
        : round2((grossVal * discountPercent) / 100);
      const netVal = Math.max(0, round2(grossVal - discountAmount));
      monthMap[key].revenue = round2(monthMap[key].revenue + netVal);
    }
  }

  for (const pm of allPayments) {
    const d = new Date(pm.paymentDate || pm.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) {
      const amt = fromDecimal(pm.amount);
      monthMap[key].collections = round2(monthMap[key].collections + amt);
      monthMap[key].collected = round2(monthMap[key].collected + amt);
    }
  }

  for (const c of allCommissions) {
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) {
      const adm = fromDecimal(c.adminAmount);
      monthMap[key].adminShare = round2(monthMap[key].adminShare + adm);
      monthMap[key].employeeCommission = round2(monthMap[key].employeeCommission + fromDecimal(c.employeeAmount));
      monthMap[key].profit = round2(monthMap[key].profit + adm);
    }
  }

  const monthlyTrends = Object.values(monthMap);

  // 5. Available Months List for Dropdown
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

  // 6. Dynamic Commission Distribution
  const totalComm = totalBrokerAllocation + totalEmployeeAllocation + totalOfficeAllocation + totalAdminShare + totalSettlementReserve;
  const distribution = totalComm > 0 ? [
    { name: 'Broker Fee', value: round2((totalBrokerAllocation / totalComm) * 100), amount: totalBrokerAllocation, color: '#A855F7' },
    { name: 'Employee Pool', value: round2((totalEmployeeAllocation / totalComm) * 100), amount: totalEmployeeAllocation, color: '#FF5A1F' },
    { name: 'Office Expense', value: round2((totalOfficeAllocation / totalComm) * 100), amount: totalOfficeAllocation, color: '#3B82F6' },
    { name: 'Admin Share', value: round2((totalAdminShare / totalComm) * 100), amount: totalAdminShare, color: '#10B981' },
    { name: 'Reserve Fund', value: round2((totalSettlementReserve / totalComm) * 100), amount: totalSettlementReserve, color: '#F59E0B' },
  ] : [
    { name: 'Broker Fee', value: 0, amount: 0, color: '#A855F7' },
    { name: 'Employee Pool', value: 0, amount: 0, color: '#FF5A1F' },
    { name: 'Office Expense', value: 0, amount: 0, color: '#3B82F6' },
    { name: 'Admin Share', value: 0, amount: 0, color: '#10B981' },
    { name: 'Reserve Fund', value: 0, amount: 0, color: '#F59E0B' },
  ];

  // 7. Project Status Distribution
  const statusDistribution: Record<string, number> = {
    confirmed: 0,
    in_progress: 0,
    review: 0,
    completed: 0,
    delivered: 0,
  };
  for (const p of kpiProjects) {
    if (statusDistribution[p.status] !== undefined) {
      statusDistribution[p.status]++;
    }
  }

  // 8. Action Items
  const pendingWorkLogsCount = await WorkLog.countDocuments({ status: 'submitted' });
  const pendingSettlementsCount = await Settlement.countDocuments({ status: 'draft' });

  return {
    kpis: {
      totalProjectValue,
      totalReceived,
      outstandingAmount,
      totalEmployeeAllocation,
      totalOfficeAllocation,
      totalAdminShare,
      totalSettlementReserve,
      totalProjectsCount: kpiProjects.length,
      allTimeProjectsCount: allProjects.length,
      pendingWorkLogsCount,
      pendingSettlementsCount,
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
