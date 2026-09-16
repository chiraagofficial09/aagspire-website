import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getAdminDashboardMetrics } from '../services/analytics.service.js';
import { calculateEmployeeEarnings } from '../services/earnings.service.js';
import { Project } from '../models/Project.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { WorkLog } from '../models/WorkLog.js';
import { Attendance } from '../models/Attendance.js';
import { Receipt } from '../models/Receipt.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { round2, fromDecimal } from '../utils/decimalHelper.js';
import { getMonthDateRange } from '../utils/dateHelper.js';

export async function getAdminAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const monthsNum = req.query.months ? parseInt(req.query.months as string, 10) : 6;
    
    // Default to current month details unless 'all' is explicitly requested
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let targetMonth: string | undefined;
    if (req.query.month === 'all') {
      targetMonth = undefined; // all-time cumulative
    } else if (req.query.month) {
      targetMonth = req.query.month as string;
    } else {
      targetMonth = currentMonthKey; // Default to current month
    }

    const [metrics, rawRecentProjects, pendingWorkLogs, rawRecentPayments] = await Promise.all([
      getAdminDashboardMetrics(monthsNum, targetMonth),
      Project.find()
        .populate('clientId', 'name companyName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      WorkLog.find({ status: 'submitted' })
        .populate('employeeId', 'fullName employeeCode')
        .populate('projectId', 'projectName projectCode')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      ClientPayment.find()
        .populate('clientId', 'name companyName')
        .populate('projectId', 'projectName projectCode')
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const recentProjects = (rawRecentProjects || []).map((p: any) => ({
      ...p,
      projectValue: fromDecimal(p.projectValue),
      discountAmount: fromDecimal(p.discountAmount),
    }));

    const recentPayments = (rawRecentPayments || []).map((p: any) => ({
      ...p,
      amount: fromDecimal(p.amount),
    }));

    const fullData = {
      ...metrics,
      recentProjects,
      pendingWorkLogs,
      recentPayments,
    };

    res.json({
      success: true,
      data: fullData,
      ...fullData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEmployeeDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const employeeId = req.employee?._id;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee profile not linked.' });
      return;
    }

    const monthParam = req.query.month as string | undefined;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = monthParam === 'all' ? 'all' : (monthParam || currentMonthKey);

    const monthRange = getMonthDateRange(targetMonth);
    const startDate = monthRange?.startOfMonth;
    const endDate = monthRange?.endOfMonth;

    // 1. Personal Earnings Breakdown (month-filtered)
    const earnings = await calculateEmployeeEarnings(employeeId, targetMonth);

    // 2. Assigned Projects (support both Project.assignedEmployees and ProjectEmployee)
    const peRecords = await ProjectEmployee.find({ employeeId });
    const peProjectIds = peRecords.map((pe) => pe.projectId);

    const assignedProjectsDocs = await Project.find({
      $or: [
        { assignedEmployees: employeeId },
        { _id: { $in: peProjectIds } },
      ],
    })
      .populate('clientId', 'name companyName clientCode')
      .populate('assignedEmployees', 'fullName employeeCode designation')
      .sort({ createdAt: -1 });

    // Filter projects if specific month is requested (Option B: strict project date)
    const filteredProjectsDocs = assignedProjectsDocs.filter((p) => {
      if (!startDate || !endDate) return true;
      const projDate = p.startDate ? new Date(p.startDate) : new Date(p.createdAt);
      return projDate >= startDate && projDate <= endDate;
    });

    const enrichedAssignedProjects = filteredProjectsDocs.map((p) => {
      const pe = peRecords.find((r) => r.projectId?.toString() === p._id.toString());
      const share = pe ? (pe.sharePercent ?? (pe as any).sharePercentage ?? 100) : (p.assignedEmployees?.length ? Math.round(100 / p.assignedEmployees.length) : 100);
      const prjEarning = earnings.projects?.find(
        (ep) => ep.projectId?.toString() === p._id.toString()
      );
      const grossVal = fromDecimal(p.projectValue);
      const discountPercent = Number(p.discountPercent) || 0;
      const discountAmount = p.discountAmount
        ? fromDecimal(p.discountAmount)
        : round2((grossVal * discountPercent) / 100);
      const netVal = Math.max(0, round2(grossVal - discountAmount));
      const paymentsReceived = prjEarning?.paymentsReceived ?? 0;
      const balanceDue = prjEarning?.clientDebt !== undefined ? prjEarning.clientDebt : Math.max(0, round2(netVal - paymentsReceived));

      const poolTotal = prjEarning?.expectedCommission ?? 0;
      const poolPaid = prjEarning?.paidCommission ?? 0;
      const poolEarned = prjEarning?.earnedCommission ?? 0;
      const poolPending = Math.max(0, poolTotal - poolPaid);

      const pObj = typeof (p as any).toObject === 'function' ? (p as any).toObject() : p;
      return {
        ...pObj,
        id: p._id.toString(),
        title: p.projectName,
        projectName: p.projectName,
        sharePercent: share,
        sharePercentage: share,
        totalAmount: netVal,
        projectValue: netVal,
        grossProjectValue: grossVal,
        paymentsReceived,
        balanceDue,
        outstanding: balanceDue,
        clientDebt: balanceDue,
        earnedCommission: poolEarned,
        expectedCommission: poolTotal,
        paidCommission: poolPaid,
        pendingCommission: poolPending,
        poolTotal,
        poolPaid,
        poolPending,
        poolEarned,
        employeeCommission: {
          totalCommission: poolTotal,
          expectedCommission: poolTotal,
          earnedCommission: poolEarned,
          paidCommission: poolPaid,
          pendingCommission: poolPending,
          payableBalance: prjEarning?.payableBalance ?? 0,
        },
        employeeCategoryPercent: prjEarning?.employeeCategoryPercent ?? 40,
      };
    });

    // Delivered projects appear at the end (newly delivered first, first delivered at the very last end)
    enrichedAssignedProjects.sort((a, b) => {
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

    const activeProjects = enrichedAssignedProjects.filter((p) =>
      ['confirmed', 'in_progress', 'review'].includes(p.status)
    );
    const completedProjects = enrichedAssignedProjects.filter((p) =>
      ['completed', 'delivered'].includes(p.status)
    );

    // 3. Approved Hours & Logged Hours from WorkLog (filtered by month)
    const workLogQuery: any = { employeeId };
    if (startDate && endDate) {
      workLogQuery.$or = [
        { workDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ];
    }
    const approvedLogs = await WorkLog.find({ ...workLogQuery, status: 'approved' });
    const approvedMinutes = approvedLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0);
    const approvedHours = round2(approvedMinutes / 60);

    const allLogs = await WorkLog.find(workLogQuery);
    const totalMinutes = allLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0);
    const totalHours = round2(totalMinutes / 60);

    // 4. Today's Attendance & Clock Status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.findOne({ employeeId, date: today });

    // 5. Recent Work Logs (filtered by month)
    const recentWorkLogs = await WorkLog.find(workLogQuery)
      .populate('projectId', 'projectName projectCode')
      .sort({ workDate: -1, createdAt: -1 })
      .limit(5);

    const formattedWorkLogs = recentWorkLogs.map((log) => {
      const mins = log.totalMinutes || 0;
      const logObj = typeof (log as any).toObject === 'function' ? (log as any).toObject() : log;
      return {
        ...logObj,
        hoursWorked: round2(mins / 60),
        durationMinutes: mins,
        logDate: log.workDate,
      };
    });

    // 6. Recent Receipts (filtered by month)
    const receiptQuery: any = { employeeId };
    if (startDate && endDate) {
      receiptQuery.issuedAt = { $gte: startDate, $lte: endDate };
    }
    const recentReceipts = await Receipt.find(receiptQuery)
      .sort({ issuedAt: -1 })
      .limit(5);

    const kpis = {
      activeProjectsCount: activeProjects.length,
      completedProjectsCount: completedProjects.length,
      totalAssignedProjects: enrichedAssignedProjects.length,
      totalExpected: earnings.totalExpected,
      totalEarned: earnings.totalEarned,
      totalEarnedCommission: earnings.totalEarned,
      totalPaid: earnings.totalPaid,
      totalPayable: earnings.totalPayable,
      payableBalance: earnings.totalPayable,
      totalPending: earnings.totalPending,
      approvedHours,
      totalHours,
      todayWorkingMinutes: todayAttendance?.totalMinutes || 0,
      isClockedIn: Boolean(todayAttendance?.clockInAt && !todayAttendance?.clockOutAt),
      clockInAt: todayAttendance?.clockInAt || null,
      clockOutAt: todayAttendance?.clockOutAt || null,
    };

    const dashboardData = {
      kpis,
      earnings,
      activeProjects,
      assignedProjects: enrichedAssignedProjects,
      recentWorkLogs: formattedWorkLogs,
      recentReceipts,
      selectedMonth: targetMonth,
    };

    res.json({
      success: true,
      data: dashboardData,
      ...dashboardData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
