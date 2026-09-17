import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  XCircle,
  MessageSquare,
  User,
  Calendar,
  Clock,
  RotateCcw,
  ExternalLink,
  CheckCircle,
  MoreHorizontal,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomCalendarDropdown } from '../../components/work/CustomCalendarDropdown';
import { EmptyState } from '../../components/work/EmptyState';

interface ExtractedProject {
  projectId?: string;
  name: string;
  code?: string;
  status: 'completed' | 'in_progress';
}

function extractProjectsFromLog(log: any): ExtractedProject[] {
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
    const isDone = prj?.status === 'completed' || prj?.status === 'delivered' || log.status === 'approved';
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

function formatWorkDate(dateVal: any): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatWorkDuration(log: any): string {
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

export const AdminWorkLogs: React.FC = () => {
  const toast = useToast();
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);

  const fetchWorkLogs = async () => {
    try {
      setLoading(true);
      const [logsRes, empsRes] = await Promise.all([
        api.get('/admin/work-logs'),
        api.get('/admin/employees').catch(() => ({ data: { data: [] } })),
      ]);
      setWorkLogs(logsRes.data?.data || logsRes.data?.workLogs || []);
      setEmployees(empsRes.data?.data || empsRes.data?.employees || []);
    } catch (err) {
      console.error('Error fetching work logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkLogs();
  }, []);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, { label: string; designation?: string }>();
    employees.forEach((emp) => {
      const id = String(emp._id || emp.id || '');
      if (id) {
        map.set(id, {
          label: emp.fullName || emp.name || 'Staff Member',
          designation: emp.designation,
        });
      }
    });

    workLogs.forEach((log) => {
      if (log.employeeId && typeof log.employeeId === 'object') {
        const id = String(log.employeeId._id || log.employeeId.id || '');
        if (id && !map.has(id)) {
          map.set(id, {
            label: log.employeeId.fullName || log.employeeId.name || 'Staff Member',
            designation: log.employeeId.designation,
          });
        }
      }
    });

    return [
      { value: 'all', label: 'All employees' },
      ...Array.from(map.entries()).map(([value, info]) => ({
        value,
        label: info.label,
        sublabel: info.designation,
      })),
    ];
  }, [employees, workLogs]);

  const handleUpdateStatus = async (id: string, status: string) => {
    let reason = '';
    if (status === 'rejected' || status === 'changes_requested') {
      const input = prompt(
        status === 'rejected' ? 'Enter rejection reason:' : 'Enter change request notes:'
      );
      if (input === null) return;
      reason = input;
    }

    try {
      await api.patch(`/admin/work-logs/${id}/status`, {
        status,
        rejectionReason: reason || undefined,
        feedback: reason || undefined,
      });
      toast.success(`Work log ${status.replace('_', ' ')} successfully`);
      fetchWorkLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update work log status');
    }
  };

  const handleToggleProjectStatus = async (
    projectId: string | undefined,
    targetStatus: 'completed' | 'in_progress'
  ) => {
    if (!projectId) {
      toast.error('No project linked to this deliverable');
      return;
    }
    try {
      setUpdatingProjectId(projectId);
      await api.patch(`/admin/projects/${projectId}`, { status: targetStatus });
      toast.success(
        targetStatus === 'completed'
          ? 'Project marked as completed!'
          : 'Project reopened (in progress)'
      );
      fetchWorkLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    } finally {
      setUpdatingProjectId(null);
    }
  };

  const filtered = useMemo(() => {
    return workLogs.filter((log) => {
      const term = search.toLowerCase();
      const deliverables = extractProjectsFromLog(log);
      const matchesSearch =
        !term ||
        log.taskName?.toLowerCase().includes(term) ||
        (log.employeeId?.fullName || log.employeeId?.name || '')
          ?.toLowerCase()
          .includes(term) ||
        (log.projectId?.projectName || log.projectId?.title || '')
          ?.toLowerCase()
          .includes(term) ||
        deliverables.some(
          (d) =>
            d.name.toLowerCase().includes(term) ||
            (d.code && d.code.toLowerCase().includes(term))
        );

      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      const logEmpId =
        typeof log.employeeId === 'object' && log.employeeId !== null
          ? String(log.employeeId._id || log.employeeId.id || '')
          : String(log.employeeId || '');
      const matchesEmployee =
        employeeFilter === 'all' || logEmpId === String(employeeFilter);

      let matchesDate = true;
      if (dateFilter && dateFilter !== 'all') {
        const rawDate = log.logDate || log.workDate || log.createdAt;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const logYMD = `${year}-${month}-${day}`;
            const logYM = `${year}-${month}`;

            if (dateFilter.length === 7) {
              matchesDate = logYM === dateFilter;
            } else {
              matchesDate = logYMD === dateFilter;
            }
          }
        }
      }

      return matchesSearch && matchesStatus && matchesEmployee && matchesDate;
    });
  }, [workLogs, search, statusFilter, employeeFilter, dateFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Work logs</h1>
        <p className="text-xs text-zinc-400 mt-1">Review shift timesheets and monitor project deliverables.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search work logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <CustomCalendarDropdown
            value={dateFilter}
            onChange={setDateFilter}
            className="w-full sm:w-44"
          />
          <CustomSelect
            value={employeeFilter}
            onChange={setEmployeeFilter}
            className="w-full sm:w-52"
            icon={<User className="w-3.5 h-3.5" />}
            options={employeeOptions}
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-full sm:w-44"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'submitted', label: 'Submitted' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'changes_requested', label: 'Changes requested' },
            ]}
          />
        </div>
      </div>

      {/* Logs Display - Option 1: Ultra-Clean Minimal Card */}
      {loading ? (
        <div className="bg-[#090a0e] border border-white/[0.06] rounded-xl p-10 text-center text-zinc-500 font-mono text-xs">
          Loading work logs...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((log) => {
            const deliverables = extractProjectsFromLog(log);
            const empName =
              log.employeeId?.fullName ||
              log.employeeId?.name ||
              'Staff Member';
            const logDateStr = formatWorkDate(
              log.logDate || log.workDate || log.createdAt
            );
            const durationStr = formatWorkDuration(log);

            return (
              <div
                key={log._id}
                className="bg-[#0b0f17] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-sm"
              >
                {/* Header Bar matching screenshot */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                    {/* Date Item */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0 shadow-sm">
                        <Calendar className="w-4 h-4 text-[#FF5A1F]" />
                      </div>
                      <span className="font-bold text-white text-sm tracking-tight">{logDateStr}</span>
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-4 w-px bg-white/[0.12] hidden sm:block" />

                    {/* Employee Item */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0 shadow-sm">
                        <User className="w-4 h-4 text-[#FF5A1F]" />
                      </div>
                      <span className="font-bold text-white text-sm tracking-tight">{empName}</span>
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-4 w-px bg-white/[0.12] hidden sm:block" />

                    {/* Duration / Hours Item */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center shrink-0 shadow-sm">
                        <Clock className="w-4 h-4 text-[#FF5A1F]" />
                      </div>
                      <span className="font-bold text-white text-sm tracking-tight">{durationStr}</span>
                    </div>
                  </div>

                  {/* Right: [● Submitted] & Circular Action Buttons */}
                  <div className="flex items-center gap-2.5">
                    {/* Submitted Pill Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#131926] border border-white/[0.08] text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                      <span className="capitalize">{log.status?.replace('_', ' ')}</span>
                    </div>

                    {/* Circular Verification Action Buttons */}
                    <div className="flex items-center gap-1.5 pl-1">
                      {log.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(log._id, 'approved')}
                          title="Approve Timesheet"
                          className="w-8 h-8 rounded-full bg-[#FF5A1F] text-white border border-[#FF5A1F]/30 flex items-center justify-center cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {log.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(log._id, 'rejected')}
                          title="Reject Timesheet"
                          className="w-8 h-8 rounded-full bg-[#131926] hover:bg-red-500/15 text-zinc-400 hover:text-red-400 border border-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {log.status !== 'changes_requested' && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(log._id, 'changes_requested')
                          }
                          title="Request Revision"
                          className="w-8 h-8 rounded-full bg-[#131926] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-table matching screenshot: NO. | PROJECT | STATUS | ••• */}
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
          })}
        </div>
      ) : (
        <div className="bg-[#090a0e] border border-white/[0.06] rounded-xl p-8">
          <EmptyState
            type="workLogs"
            title="No work logs found"
            description="No work records match your search criteria. Adjust your filters to see more results."
          />
        </div>
      )}

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'work log' : 'work logs'}
      </div>
    </div>
  );
};
