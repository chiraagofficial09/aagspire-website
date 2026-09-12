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

    const [metrics, recentProjects, pendingWorkLogs, recentPayments] = await Promise.all([
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

    // 1. Personal Earnings Breakdown
    const earnings = await calculateEmployeeEarnings(employeeId);

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

    const enrichedAssignedProjects = assignedProjectsDocs.map((p) => {
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

      return {
        ...p.toObject(),
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

    const activeProjects = enrichedAssignedProjects.filter((p) =>
      ['confirmed', 'in_progress', 'review'].includes(p.status)
    );
    const completedProjects = enrichedAssignedProjects.filter((p) =>
      ['completed', 'delivered'].includes(p.status)
    );

    // 3. Approved Hours & Logged Hours from WorkLog
    const approvedLogs = await WorkLog.find({ employeeId, status: 'approved' });
    const approvedMinutes = approvedLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0);
    const approvedHours = round2(approvedMinutes / 60);

    const allLogs = await WorkLog.find({ employeeId });
    const totalMinutes = allLogs.reduce((sum, log) => sum + (log.totalMinutes || 0), 0);
    const totalHours = round2(totalMinutes / 60);

    // 4. Today's Attendance & Clock Status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.findOne({ employeeId, date: today });

    // 5. Recent Work Logs
    const recentWorkLogs = await WorkLog.find({ employeeId })
      .populate('projectId', 'projectName projectCode')
      .sort({ workDate: -1, createdAt: -1 })
      .limit(5);

    const formattedWorkLogs = recentWorkLogs.map((log) => {
      const mins = log.totalMinutes || 0;
      return {
        ...log.toObject(),
        hoursWorked: round2(mins / 60),
        durationMinutes: mins,
        logDate: log.workDate,
      };
    });

    // 6. Recent Receipts
    const recentReceipts = await Receipt.find({ employeeId })
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
