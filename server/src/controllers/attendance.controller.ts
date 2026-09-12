import { Response } from 'express';
import mongoose from 'mongoose';
import { Attendance } from '../models/Attendance.js';
import { WorkLog } from '../models/WorkLog.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { round2 } from '../utils/decimalHelper.js';

function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTodayClockStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const employeeId = req.employee?._id;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee profile not found.' });
      return;
    }

    const today = getStartOfDay();
    const attendance = await Attendance.findOne({ employeeId, date: today });

    const isClockedIn = Boolean(attendance?.clockInAt && !attendance?.clockOutAt);

    res.json({
      success: true,
      attendance,
      isClockedIn,
      clockInAt: attendance?.clockInAt || null,
      clockOutAt: attendance?.clockOutAt || null,
      totalMinutes: attendance?.totalMinutes || 0,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function clockIn(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const employeeId = req.employee?._id;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee profile not found.' });
      return;
    }

    const today = getStartOfDay();
    let attendance = await Attendance.findOne({ employeeId, date: today });

    if (attendance?.clockInAt) {
      res.status(400).json({
        success: false,
        message: `Already clocked in today at ${new Date(attendance.clockInAt).toLocaleTimeString()}.`,
      });
      return;
    }

    const now = new Date();
    // Mark as late if after 10:30 AM
    const isLate = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 30);

    if (attendance) {
      attendance.clockInAt = now;
      attendance.status = isLate ? 'late' : 'present';
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employeeId,
        date: today,
        clockInAt: now,
        status: isLate ? 'late' : 'present',
      });
    }

    createNotification({
      role: 'admin',
      type: 'attendance',
      title: isLate ? 'Staff Clocked In (Late)' : 'Staff Clocked In',
      message: `${req.employee?.fullName || 'Staff Member'} clocked in at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      link: '/admin/attendance',
      metadata: { employeeId, date: today },
    }).catch(() => {});

    res.json({
      success: true,
      message: `Clocked in successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      attendance,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function clockOut(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const employeeId = req.employee?._id;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee profile not found.' });
      return;
    }

    const today = getStartOfDay();
    const attendance = await Attendance.findOne({ employeeId, date: today });

    if (!attendance || !attendance.clockInAt) {
      res.status(400).json({ success: false, message: 'You have not clocked in today yet.' });
      return;
    }

    if (attendance.clockOutAt) {
      res.status(400).json({
        success: false,
        message: `Already clocked out today at ${new Date(attendance.clockOutAt).toLocaleTimeString()}.`,
      });
      return;
    }

    const { workDescription, description, taskName, projectId } = req.body || {};
    const finalDescription = (workDescription || description || '').trim();
    const finalTaskName = (taskName || '').trim() || 'Daily Shift Work';

    const now = new Date();
    attendance.clockOutAt = now;

    // Calculate total minutes worked
    const diffMs = now.getTime() - new Date(attendance.clockInAt).getTime();
    attendance.totalMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

    // If worked less than 4 hours, mark as half day
    if (attendance.totalMinutes < 240 && attendance.status !== 'late') {
      attendance.status = 'half_day';
    }

    if (finalDescription) {
      attendance.notes = finalDescription;
    }

    await attendance.save();

    // Automatically create a WorkLog entry so it goes directly to logs
    let validProjectId: any = undefined;
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      validProjectId = projectId;
    }

    const createdWorkLog = await WorkLog.create({
      employeeId,
      projectId: validProjectId,
      workDate: today,
      taskName: finalTaskName,
      description: finalDescription || 'Daily shift completed.',
      startTime: attendance.clockInAt,
      endTime: now,
      totalMinutes: attendance.totalMinutes,
      status: 'submitted',
    });

    const hours = Math.floor(attendance.totalMinutes / 60);
    const mins = attendance.totalMinutes % 60;
    const durationStr = `${hours}h ${mins}m`;

    createNotification({
      role: 'admin',
      type: 'attendance',
      title: 'Staff Clocked Out & Logged Work',
      message: `${req.employee?.fullName || 'Staff Member'} clocked out (${durationStr}). Work: "${finalTaskName}"${finalDescription ? ` - ${finalDescription}` : ''}`,
      link: '/admin/work-logs',
      metadata: { employeeId, date: today, totalMinutes: attendance.totalMinutes, workLogId: createdWorkLog._id },
    }).catch(() => {});

    res.json({
      success: true,
      message: `Clocked out at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Total time: ${durationStr}. Work log recorded.`,
      attendance,
      workLog: createdWorkLog,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function listAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { employeeId, startDate, endDate, status } = req.query;
    const filter: any = {};

    // Role Security: Employee strictly views own attendance
    if (req.user?.role === 'employee') {
      if (!req.employee) {
        res.json({ success: true, count: 0, attendance: [] });
        return;
      }
      filter.employeeId = req.employee._id;
    } else {
      if (employeeId) filter.employeeId = employeeId;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = getStartOfDay(new Date(startDate as string));
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const records = await Attendance.find(filter)
      .populate('employeeId', 'fullName employeeCode designation')
      .sort({ date: -1 });

    const formatted = records.map((r: any) => ({
      ...r.toObject(),
      clockInTime: r.clockInAt,
      clockOutTime: r.clockOutAt,
      totalHours: r.totalMinutes ? round2(r.totalMinutes / 60) : 0,
    }));

    res.json({ success: true, count: formatted.length, attendance: formatted, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function manualAdjustAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { employeeId, date, clockInAt, clockOutAt, status, notes } = req.body;

    if (!employeeId || !date) {
      res.status(400).json({ success: false, message: 'Employee and date are required.' });
      return;
    }

    const day = getStartOfDay(new Date(date));
    let totalMinutes = 0;
    if (clockInAt && clockOutAt) {
      const diffMs = new Date(clockOutAt).getTime() - new Date(clockInAt).getTime();
      totalMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date: day },
      {
        clockInAt: clockInAt ? new Date(clockInAt) : undefined,
        clockOutAt: clockOutAt ? new Date(clockOutAt) : undefined,
        totalMinutes,
        status: status || 'present',
        notes,
      },
      { upsert: true, new: true }
    );

    await logAudit({
      userId: req.user!._id,
      action: 'MANUAL_ATTENDANCE_ADJUST',
      entityType: 'Attendance',
      entityId: attendance._id,
      newValue: { employeeId, date, status, totalMinutes },
    });

    res.json({ success: true, message: 'Attendance record updated.', attendance, data: attendance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
