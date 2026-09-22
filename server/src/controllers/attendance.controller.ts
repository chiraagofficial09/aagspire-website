import { Response } from 'express';
import mongoose from 'mongoose';
import { Attendance } from '../models/Attendance.js';
import { WorkLog } from '../models/WorkLog.js';
import { Project } from '../models/Project.js';
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
        message: `Already clocked in today at ${new Date(attendance.clockInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}.`,
      });
      return;
    }

    const now = new Date();
    // Convert to IST for late check (server may not be in India)
    const istHour = parseInt(now.toLocaleString('en-IN', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }), 10);
    const istMinute = parseInt(now.toLocaleString('en-IN', { minute: '2-digit', timeZone: 'Asia/Kolkata' }), 10);
    // Mark as late if after 10:30 AM IST
    const isLate = istHour > 10 || (istHour === 10 && istMinute > 30);

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
      message: `${req.employee?.fullName || 'Staff Member'} clocked in at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}.`,
      link: '/admin/attendance',
      metadata: { employeeId, date: today },
    }).catch(() => {});

    res.json({
      success: true,
      message: `Clocked in successfully at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}.`,
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
        message: `Already clocked out today at ${new Date(attendance.clockOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}.`,
      });
      return;
    }

    const { projects, projectIds, workDescription, description, taskName, projectId } = req.body || {};

    const now = new Date();
    attendance.clockOutAt = now;

    // Calculate total minutes worked
    const diffMs = now.getTime() - new Date(attendance.clockInAt).getTime();
    attendance.totalMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

    // If worked less than 4 hours, mark as half day
    if (attendance.totalMinutes < 240 && attendance.status !== 'late') {
      attendance.status = 'half_day';
    }

    // Normalize multiple incoming projects
    let incomingProjects: { projectId: string; status?: string }[] = [];
    if (Array.isArray(projects) && projects.length > 0) {
      incomingProjects = projects
        .filter((p) => p && (p.projectId || p._id))
        .map((p) => ({
          projectId: String(p.projectId || p._id),
          status: (p.status === 'delivered' || p.status === 'completed') ? 'delivered' : (p.status || 'in_process'),
        }));
    } else if (Array.isArray(projectIds) && projectIds.length > 0) {
      incomingProjects = projectIds.map((id: string) => ({
        projectId: String(id),
        status: 'in_process',
      }));
    } else if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      incomingProjects = [{ projectId: String(projectId), status: 'in_process' }];
    }

    const updatedProjectsSummary: { id: any; name: string; code?: string; status: string }[] = [];

    for (const item of incomingProjects) {
      if (!mongoose.Types.ObjectId.isValid(item.projectId)) continue;
      const proj = await Project.findById(item.projectId);
      if (proj) {
        const oldStatus = proj.status;
        // Update project status
        if (item.status === 'delivered' || item.status === 'completed') {
          proj.status = 'delivered';
          proj.deliveredAt = new Date();
          await proj.save();

          await WorkLog.updateMany(
            { 'projectsWorked.projectId': proj._id },
            { $set: { 'projectsWorked.$[elem].status': 'delivered' } },
            { arrayFilters: [{ 'elem.projectId': proj._id }] }
          ).catch(() => {});
        } else if (['start_process', 'in_process', 'in_changes'].includes(item.status || '')) {
          if (proj.status !== 'delivered') {
            proj.status = item.status as any;
            await proj.save();
          }
        }

        if (oldStatus !== proj.status) {
          await logAudit({
            userId: req.user!._id,
            action: 'EMPLOYEE_UPDATE_PROJECT_STATUS',
            entityType: 'Project',
            entityId: proj._id,
            oldValue: { status: oldStatus },
            newValue: { status: proj.status },
          }).catch(() => {});
        }

        updatedProjectsSummary.push({
          id: proj._id,
          name: proj.projectName,
          code: proj.projectCode,
          status: (item.status === 'delivered' || item.status === 'completed') ? 'delivered' : (item.status || 'in_process'),
        });
      }
    }

    // Create ONE SINGLE consolidated WorkLog entry for this entire shift
    let singleTaskName = 'Daily Shift Work';
    let singleDescription = (workDescription || description || '').trim() || 'Daily shift completed.';
    let primaryProjectId: any = undefined;

    if (updatedProjectsSummary.length === 1) {
      const p = updatedProjectsSummary[0];
      singleTaskName = p.name;
      singleDescription = p.status === 'delivered' ? 'Project delivered.' : 'Ongoing project work (in process).';
      primaryProjectId = p.id;
    } else if (updatedProjectsSummary.length > 1) {
      singleTaskName = `Daily Shift Work (${updatedProjectsSummary.length} Projects)`;
      const deliveredList = updatedProjectsSummary.filter((p) => p.status === 'delivered').map((p) => p.name);
      const inProcessList = updatedProjectsSummary.filter((p) => p.status !== 'delivered').map((p) => p.name);
      const parts: string[] = [];
      if (deliveredList.length > 0) parts.push(`Delivered: ${deliveredList.join(', ')}`);
      if (inProcessList.length > 0) parts.push(`In Process: ${inProcessList.join(', ')}`);
      singleDescription = parts.join(' | ');
      primaryProjectId = undefined;
    }

    await WorkLog.create({
      employeeId,
      projectId: primaryProjectId,
      projectsWorked: updatedProjectsSummary.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        projectCode: p.code,
        status: p.status,
      })),
      workDate: today,
      taskName: singleTaskName,
      description: singleDescription,
      startTime: attendance.clockInAt,
      endTime: now,
      totalMinutes: attendance.totalMinutes,
      status: 'submitted',
    });

    attendance.notes = updatedProjectsSummary.length > 0
      ? `Projects: ${updatedProjectsSummary.map((p) => `${p.name} (${p.status})`).join(', ')}`
      : singleDescription;

    await attendance.save();

    const hours = Math.floor(attendance.totalMinutes / 60);
    const mins = attendance.totalMinutes % 60;
    const durationStr = `${hours}h ${mins}m`;
    const clockOutTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    let notifMessage = `${req.employee?.fullName || 'Staff Member'} clocked out at ${clockOutTime} (Total: ${durationStr}).`;
    if (updatedProjectsSummary.length > 0) {
      const completedList = updatedProjectsSummary.filter((p) => p.status === 'completed').map((p) => p.name);
      const inProgressList = updatedProjectsSummary.filter((p) => p.status !== 'completed').map((p) => p.name);
      const parts: string[] = [];
      if (completedList.length > 0) parts.push(`Completed: ${completedList.join(', ')}`);
      if (inProgressList.length > 0) parts.push(`In Progress: ${inProgressList.join(', ')}`);
      notifMessage += ` ${parts.join(' | ')}`;
    }

    createNotification({
      role: 'admin',
      type: 'attendance',
      title: 'Staff Clocked Out & Logged Work',
      message: notifMessage,
      link: '/admin/work-logs',
      metadata: { employeeId, date: today, totalMinutes: attendance.totalMinutes, clockOutTime },
    }).catch(() => {});

    res.json({
      success: true,
      message: `Clocked out at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}. Total time: ${durationStr}.`,
      attendance,
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
