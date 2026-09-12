import { Response } from 'express';
import { WorkLog } from '../models/WorkLog.js';
import { Project } from '../models/Project.js';
import { ProjectEmployee } from '../models/ProjectEmployee.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { round2 } from '../utils/decimalHelper.js';

export async function listWorkLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { employeeId, projectId, status } = req.query;
    const filter: any = {};

    // Role Security: Employee can only see their own logs
    if (req.user?.role === 'employee') {
      if (!req.employee) {
        res.json({ success: true, count: 0, workLogs: [], data: [] });
        return;
      }
      filter.employeeId = req.employee._id;
    } else {
      // Admin filter
      if (employeeId) filter.employeeId = employeeId;
    }

    if (projectId) filter.projectId = projectId;
    if (status && status !== 'all') filter.status = status;

    const workLogs = await WorkLog.find(filter)
      .populate('employeeId', 'fullName employeeCode designation')
      .populate('projectId', 'projectName projectCode')
      .populate('reviewedBy', 'name email')
      .sort({ workDate: -1, createdAt: -1 });

    const formatted = workLogs.map((log) => {
      const mins = log.totalMinutes || 0;
      return {
        ...log.toObject(),
        hoursWorked: round2(mins / 60),
        durationMinutes: mins,
        logDate: log.workDate,
      };
    });

    res.json({ success: true, count: formatted.length, workLogs: formatted, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createWorkLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { projectId, taskName, description, workDate, startTime, endTime, totalMinutes, status } = req.body;

    if (!projectId || !taskName) {
      res.status(400).json({ success: false, message: 'Project and task name are required.' });
      return;
    }

    const employeeId = req.employee?._id;
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee profile not linked.' });
      return;
    }

    // Verify employee is assigned to this project (via assignedEmployees or ProjectEmployee)
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    let isAssigned = project.assignedEmployees?.some(
      (e) => e.toString() === employeeId.toString()
    );
    if (!isAssigned) {
      const pe = await ProjectEmployee.findOne({ projectId: project._id, employeeId });
      if (pe) isAssigned = true;
    }

    if (!isAssigned) {
      res.status(403).json({
        success: false,
        message: 'You are not assigned to this project.',
      });
      return;
    }

    let calculatedMinutes = totalMinutes ? parseInt(totalMinutes, 10) : 0;
    if (!calculatedMinutes && (req.body.hoursWorked !== undefined || req.body.minutesWorked !== undefined)) {
      const h = parseInt(req.body.hoursWorked || '0', 10) || 0;
      const m = parseInt(req.body.minutesWorked || '0', 10) || 0;
      calculatedMinutes = (h * 60) + m;
    }
    if (!calculatedMinutes && startTime && endTime) {
      const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      calculatedMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
    }

    const workLog = await WorkLog.create({
      employeeId,
      projectId: project._id,
      workDate: workDate ? new Date(workDate) : new Date(),
      taskName,
      description,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      totalMinutes: calculatedMinutes,
      status: status === 'draft' ? 'draft' : 'submitted',
    });

    if (workLog.status === 'submitted') {
      const empName = req.employee?.fullName || 'Staff Member';
      createNotification({
        role: 'admin',
        type: 'work_log',
        title: 'New Work Log Submitted',
        message: `${empName} logged ${calculatedMinutes > 0 ? `${Math.floor(calculatedMinutes / 60)}h ${calculatedMinutes % 60}m` : 'time'} on "${taskName}" for ${project.projectName}.`,
        link: '/admin/work-logs',
        metadata: { workLogId: workLog._id, employeeId, projectId: project._id },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: status === 'draft' ? 'Work log saved as draft.' : 'Work log submitted for approval.',
      workLog,
      data: workLog,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateWorkLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const workLog = await WorkLog.findById(id);
    if (!workLog) {
      res.status(404).json({ success: false, message: 'Work log not found.' });
      return;
    }

    // Employee ownership check
    if (req.user?.role === 'employee') {
      if (workLog.employeeId.toString() !== req.employee?._id.toString()) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
      if (workLog.status === 'approved') {
        res.status(400).json({ success: false, message: 'Approved work logs cannot be modified.' });
        return;
      }
    }

    const isEmployee = req.user?.role === 'employee';
    const allowedFields = ['taskName', 'description', 'workDate', 'startTime', 'endTime', 'totalMinutes', 'status'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'status' && isEmployee) {
          // Employee can only transition between 'draft' and 'submitted'
          if (['draft', 'submitted'].includes(req.body.status)) {
            workLog.status = req.body.status;
          }
        } else {
          (workLog as any)[field] = req.body[field];
        }
      }
    });

    await workLog.save();
    res.json({ success: true, message: 'Work log updated.', workLog, data: workLog });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function reviewWorkLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body;

    if (!['approved', 'rejected', 'changes_requested'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be approved, rejected, or changes_requested.' });
      return;
    }

    const workLog = await WorkLog.findById(id).populate('employeeId', 'fullName employeeCode userId');
    if (!workLog) {
      res.status(404).json({ success: false, message: 'Work log not found.' });
      return;
    }

    workLog.status = status;
    workLog.adminComment = adminComment;
    workLog.reviewedBy = req.user!._id;
    workLog.reviewedAt = new Date();
    await workLog.save();

    await logAudit({
      userId: req.user!._id,
      action: `REVIEW_WORK_LOG_${status.toUpperCase()}`,
      entityType: 'WorkLog',
      entityId: workLog._id,
      newValue: { status, adminComment },
    });

    // Notify employee of review outcome
    const empUser = (workLog.employeeId as any)?.userId;
    if (empUser) {
      const statusTitle =
        status === 'approved'
          ? 'Work Log Approved'
          : status === 'rejected'
          ? 'Work Log Rejected'
          : 'Changes Requested on Work Log';
      createNotification({
        recipient: empUser,
        role: 'employee',
        type: 'work_log',
        title: statusTitle,
        message: `Your work log for "${workLog.taskName}" was ${status}${
          adminComment ? `: "${adminComment}"` : '.'
        }`,
        link: '/employee/work',
        metadata: { workLogId: workLog._id, status },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `Work log marked as ${status}.`,
      workLog,
      data: workLog,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteWorkLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const workLog = await WorkLog.findById(id);
    if (!workLog) {
      res.status(404).json({ success: false, message: 'Work log not found.' });
      return;
    }

    // Role check: employee can only delete their own draft/submitted work logs
    if (req.user?.role === 'employee') {
      if (workLog.employeeId.toString() !== req.employee?._id.toString()) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
      if (workLog.status === 'approved') {
        res.status(400).json({ success: false, message: 'Approved work logs cannot be deleted.' });
        return;
      }
    }

    const oldValue = workLog.toObject();
    await WorkLog.findByIdAndDelete(workLog._id);

    await logAudit({
      userId: req.user!._id,
      action: 'DELETE_WORK_LOG',
      entityType: 'WorkLog',
      entityId: workLog._id,
      oldValue,
    });

    res.json({ success: true, message: 'Work log deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
