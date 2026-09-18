import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';

export interface ExtractedProject {
  projectId?: string;
  name: string;
  code?: string;
  status: 'completed' | 'in_progress';
}

export function extractProjectsFromLog(log: any): ExtractedProject[] {
  // 1. Direct projectsWorked array from backend
  if (Array.isArray(log.projectsWorked) && log.projectsWorked.length > 0) {
    return log.projectsWorked.map((p: any) => {
      const prjObj = p.projectId && typeof p.projectId === 'object' ? p.projectId : null;
      const rawStatus = prjObj?.status || p.status || 'in_progress';
      const isDone = rawStatus === 'completed' || rawStatus === 'delivered';
      return {
        projectId: prjObj?._id || p.projectId || undefined,
        name: p.projectName || prjObj?.projectName || 'Project Deliverable',
        code: p.projectCode || prjObj?.projectCode || '',
        status: isDone ? 'completed' : 'in_progress',
      };
    });
  }

  // 2. Parse from description if containing structured summary
  const desc = String(log.description || '');
  if (desc.includes('Completed:') || desc.includes('In Progress:')) {
    const list: ExtractedProject[] = [];
    desc.split('|').forEach((part) => {
      const trimmed = part.trim();
      if (trimmed.startsWith('Completed:')) {
        trimmed
          .replace('Completed:', '')
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .forEach((name) => list.push({ name, status: 'completed' }));
      } else if (trimmed.startsWith('In Progress:')) {
        trimmed
          .replace('In Progress:', '')
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .forEach((name) => list.push({ name, status: 'in_progress' }));
      }
    });
    if (list.length > 0) return list;
  }

  // 3. Fallback to primary projectId
  if (log.projectId) {
    const prj = typeof log.projectId === 'object' ? log.projectId : null;
    const isDone =
      prj?.status === 'completed' ||
      prj?.status === 'delivered' ||
      log.status === 'approved';
    return [
      {
        projectId: prj?._id || log.projectId,
        name: prj?.projectName || log.taskName || 'Assigned Project',
        code: prj?.projectCode || '',
        status: isDone ? 'completed' : 'in_progress',
      },
    ];
  }

  // 4. Default task
  return [
    {
      name: log.taskName || 'Daily Shift Work',
      status: log.status === 'approved' ? 'completed' : 'in_progress',
    },
  ];
}

export function formatWorkDate(dateVal: any): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'June',
    'July',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatWorkDuration(log: any): string {
  const mins =
    log.totalMinutes ||
    (log.hoursWorked !== undefined ? Math.round(Number(log.hoursWorked) * 60) : 0);
  if (!mins) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m < 10 ? '0' + m : m}m`;
}

export interface WorkLogCardProps {
  log: any;
  showEmployee?: boolean;
  onStatusUpdate?: (
    logId: string,
    status: 'approved' | 'rejected' | 'changes_requested'
  ) => void | Promise<void>;
}

export const WorkLogCard: React.FC<WorkLogCardProps> = ({
  log,
  showEmployee = false,
  onStatusUpdate,
}) => {
  const deliverables = extractProjectsFromLog(log);
  const empName =
    log.employeeId?.fullName || log.employeeId?.name || 'Staff Member';
  const logDateStr = formatWorkDate(
    log.logDate || log.workDate || log.createdAt
  );
  const durationStr = formatWorkDuration(log);
  const logId = log._id || log.id;

  return (
    <div className="bg-[#0b0f17] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          {/* Date Item */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0 shadow-sm">
              <Calendar className="w-4 h-4 text-[#FF5A1F]" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">
              {logDateStr}
            </span>
          </div>

          {/* Employee Item (if showEmployee) */}
          {showEmployee && (
            <>
              <div className="h-4 w-px bg-white/[0.12] hidden sm:block" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-4 h-4 text-[#FF5A1F]" />
                </div>
                <span className="font-bold text-white text-sm tracking-tight">
                  {empName}
                </span>
              </div>
            </>
          )}

          {/* Duration / Hours Item */}
          <div className="h-4 w-px bg-white/[0.12] hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-4 h-4 text-[#FF5A1F]" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">
              {durationStr}
            </span>
          </div>
        </div>

        {/* Right: Status Pill Badge & Moderation Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Status Pill Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              log.status === 'approved'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : log.status === 'rejected'
                ? 'bg-red-500/10 border-red-500/25 text-red-400'
                : log.status === 'changes_requested'
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                : 'bg-[#131926] border-white/[0.08] text-zinc-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                log.status === 'approved'
                  ? 'bg-emerald-400'
                  : log.status === 'rejected'
                  ? 'bg-red-400'
                  : log.status === 'changes_requested'
                  ? 'bg-amber-400'
                  : 'bg-zinc-400'
              }`}
            />
            <span className="capitalize">
              {log.status?.replace('_', ' ') || 'Submitted'}
            </span>
          </div>

          {/* Circular Verification Action Buttons */}
          {onStatusUpdate && (
            <div className="flex items-center gap-1.5 pl-1">
              {log.status !== 'approved' && (
                <button
                  onClick={() => onStatusUpdate(logId, 'approved')}
                  title="Approve Timesheet"
                  className="w-8 h-8 rounded-full bg-[#FF5A1F] hover:bg-[#e04810] text-white border border-[#FF5A1F]/30 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {log.status !== 'rejected' && (
                <button
                  onClick={() => onStatusUpdate(logId, 'rejected')}
                  title="Reject Timesheet"
                  className="w-8 h-8 rounded-full bg-[#131926] hover:bg-red-500/15 text-zinc-400 hover:text-red-400 border border-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
              {log.status !== 'changes_requested' && (
                <button
                  onClick={() => onStatusUpdate(logId, 'changes_requested')}
                  title="Request Revision"
                  className="w-8 h-8 rounded-full bg-[#131926] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deliverables sub-table: NO. | PROJECT | STATUS | ••• */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[480px]">
          <thead>
            <tr className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-12 text-zinc-400">NO.</th>
              <th className="py-2.5 px-3">PROJECT</th>
              <th className="py-2.5 px-3 text-right w-40">STATUS</th>
              <th className="py-2.5 px-3 w-10 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {deliverables.map((item, idx) => {
              const isCompleted = item.status === 'completed';

              return (
                <tr
                  key={idx}
                  className="hover:bg-white/[0.015] transition-colors"
                >
                  {/* NO. */}
                  <td className="py-3 px-3 font-normal text-zinc-400 text-xs">
                    {idx + 1}.
                  </td>

                  {/* PROJECT: Name only */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-white text-sm">
                      {item.name}
                    </span>
                  </td>

                  {/* STATUS (Pill badge with colored dot) */}
                  <td className="py-3 px-3 text-right">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
                        Pending
                      </span>
                    )}
                  </td>

                  {/* More Options (•••) */}
                  <td className="py-3 px-3 text-right">
                    {item.projectId ? (
                      <Link
                        to={`/admin/projects/${item.projectId}`}
                        title="View project details"
                        className="p-1 rounded text-zinc-500 hover:text-[#FF5A1F] transition-colors inline-block"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="p-1 text-zinc-600 inline-block">
                        <MoreHorizontal className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Additional Notes or Rejection Reason if present */}
      {(log.rejectionReason ||
        (log.description &&
          !log.description.includes('Completed:') &&
          !log.description.includes('In Progress:'))) && (
        <div className="px-4 py-2 border-t border-white/[0.03] text-[11px] text-zinc-500 space-y-0.5">
          {log.description &&
            !log.description.includes('Completed:') &&
            !log.description.includes('In Progress:') && (
              <p>{log.description}</p>
            )}
          {log.rejectionReason && (
            <p className="text-red-400 font-mono">
              Note: {log.rejectionReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
