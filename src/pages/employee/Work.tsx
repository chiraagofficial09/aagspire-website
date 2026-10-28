import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  X,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Search,
  CheckCircle,
  MoreHorizontal,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';
import { EmptyState } from '../../components/work/EmptyState';
import type { PaginationInfo } from '../../components/work/Pagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const LOGS_PER_LOAD = 20;

export interface ExtractedProject {
  projectId?: string;
  name: string;
  code?: string;
  status: 'delivered' | 'in_process';
  rawStatus?: string;
}

function extractProjectsFromLog(log: any): ExtractedProject[] {
  // 1. Direct projectsWorked array from backend
  if (Array.isArray(log.projectsWorked) && log.projectsWorked.length > 0) {
    return log.projectsWorked.map((p: any) => {
      const prjObj = p.projectId && typeof p.projectId === 'object' ? p.projectId : null;
      const rawStatus = prjObj?.status || p.status || 'in_process';
      const isDone = rawStatus === 'delivered' || rawStatus === 'completed';
      return {
        projectId: prjObj?._id || p.projectId || undefined,
        name: p.projectName || prjObj?.projectName || 'Project Deliverable',
        code: p.projectCode || prjObj?.projectCode || '',
        status: isDone ? 'delivered' : 'in_process',
        rawStatus,
      };
    });
  }

  // 2. Parse from description if containing structured summary
  const desc = String(log.description || '');
  if (desc.includes('Delivered:') || desc.includes('Completed:') || desc.includes('In Process:') || desc.includes('In Progress:')) {
    const list: ExtractedProject[] = [];
    desc.split('|').forEach((part) => {
      const trimmed = part.trim();
      if (trimmed.startsWith('Delivered:') || trimmed.startsWith('Completed:')) {
        trimmed
          .replace('Delivered:', '')
          .replace('Completed:', '')
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .forEach((name) => list.push({ name, status: 'delivered', rawStatus: 'delivered' }));
      } else if (trimmed.startsWith('In Process:') || trimmed.startsWith('In Progress:')) {
        trimmed
          .replace('In Process:', '')
          .replace('In Progress:', '')
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .forEach((name) => list.push({ name, status: 'in_process', rawStatus: 'in_process' }));
      }
    });
    if (list.length > 0) return list;
  }

  // 3. Fallback to primary projectId
  if (log.projectId) {
    const prj = typeof log.projectId === 'object' ? log.projectId : null;
    const rawStatus = prj?.status || (log.status === 'approved' ? 'delivered' : 'in_process');
    const isDone = rawStatus === 'delivered' || rawStatus === 'completed' || log.status === 'approved';
    return [
      {
        projectId: prj?._id || log.projectId,
        name: prj?.projectName || log.taskName || 'Assigned Project',
        code: prj?.projectCode || '',
        status: isDone ? 'delivered' : 'in_process',
        rawStatus,
      },
    ];
  }

  // 4. Default task
  return [
    {
      name: log.taskName || 'Daily Shift Work',
      status: log.status === 'approved' ? 'delivered' : 'in_process',
      rawStatus: log.status === 'approved' ? 'delivered' : 'in_process',
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

export const EmployeeWork: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    taskName: '',
    hoursWorked: 2,
    minutesWorked: 0,
    logDate: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());
  const requestId = useRef(0);

  // page 1 replaces the list (filters changed, after a submit); later pages append to it
  const fetchLogs = async (page = 1) => {
    const current = ++requestId.current;
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      const res = await api.get('/employee/work-logs', {
        params: {
          page,
          limit: LOGS_PER_LOAD,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        },
      });
      if (current !== requestId.current) return;
      const rows = res.data.data || res.data.workLogs || [];
      setWorkLogs((prev) => {
        if (page === 1) return rows;
        // A log added since the last load shifts rows by one; skip any already shown
        const seen = new Set(prev.map((log) => log._id));
        return [...prev, ...rows.filter((log: { _id: string }) => !seen.has(log._id))];
      });
      setPagination(res.data.pagination || null);
    } catch (err) {
      if (current === requestId.current) console.error('Error fetching work logs', err);
    } finally {
      if (current === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const fetchProjects = () =>
    api.get('/employee/projects')
      .then((res) => setProjects(res.data.data || res.data.projects || []))
      .catch((err) => console.error('Error fetching projects', err));

  // After a submit or project status change, refresh both the logs and the project list
  const fetchAll = () => {
    fetchLogs(1);
    fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  const hasMore = Boolean(pagination && pagination.page < pagination.totalPages);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/employee/work-logs', {
        ...formData,
        hoursWorked: Number(formData.hoursWorked),
        minutesWorked: Number(formData.minutesWorked),
      });
      setIsModalOpen(false);
      setFormData({
        projectId: '',
        taskName: '',
        hoursWorked: 2,
        minutesWorked: 0,
        logDate: new Date().toISOString().slice(0, 10),
        description: '',
      });
      toast.success('Production hours submitted for verification');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit work log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleProjectStatus = async (
    projectId: string | undefined,
    targetStatus: 'delivered' | 'in_process'
  ) => {
    if (!projectId) {
      toast.error('No project linked to this deliverable');
      return;
    }
    try {
      setUpdatingProjectId(projectId);
      await api.patch(`/employee/projects/${projectId}/status`, { status: targetStatus });
      toast.success(
        targetStatus === 'delivered'
          ? 'Project marked as delivered!'
          : 'Project status updated to In Process'
      );
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    } finally {
      setUpdatingProjectId(null);
    }
  };

  // Search and status filters run on the server
  const filteredLogs = workLogs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Work logs</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Log billable creative hours, deliverable sessions, and track project status.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Work</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by project or task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <div className="w-full sm:w-48">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All log statuses' },
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
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const deliverables = extractProjectsFromLog(log);
            const empName =
              log.employeeId?.fullName ||
              log.employeeId?.name ||
              user?.name ||
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
                  {/* Left: [📅 17 Sept 2026] | [👤 chirag] | [⏱ 15m] */}
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

                  {/* Right: [● Submitted] Pill Badge */}
                  <div className="flex items-center gap-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#131926] border border-white/[0.08] text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                      <span className="capitalize">{log.status?.replace('_', ' ')}</span>
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
                      {deliverables.map((item, idx) => (
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
                            {item.status === 'delivered' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
                                Delivered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/25 capitalize">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
                                {item.rawStatus ? item.rawStatus.replace('_', ' ') : 'In Process'}
                              </span>
                            )}
                          </td>

                          {/* More Options (•••) */}
                          <td className="py-3 px-3 text-right">
                            {item.projectId ? (
                              <Link
                                to={`/employee/projects/${item.projectId}`}
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
                      ))}
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
            description="No work records match your search filter. Click 'Log Work' or Clock In to track hours."
          />
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchLogs((pagination?.page ?? 1) + 1)}
            disabled={loadingMore}
            className="px-5 py-2 rounded-xl border border-white/[0.08] bg-[#0d0e14] hover:bg-white/5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      <div className="text-xs text-zinc-500 px-1">
        Showing {filteredLogs.length} of {pagination?.total ?? filteredLogs.length} {(pagination?.total ?? filteredLogs.length) === 1 ? 'log' : 'logs'}
      </div>

      {/* Modal for manual logging with all features preserved */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-5 sm:p-8 space-y-5 text-white text-xs my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="font-bold text-base tracking-tight text-white">
                Log Production Work
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">
                  Assigned Project *
                </label>
                <CustomSelect
                  value={formData.projectId}
                  onChange={(val) => setFormData({ ...formData, projectId: val })}
                  placeholder="Select project"
                  options={projects.map((item) => {
                    const prj = item.projectId || item;
                    return {
                      value: prj._id,
                      label: prj.title || prj.projectName,
                    };
                  })}
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">
                  Task Deliverable *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Color grading, sound design, storyboard"
                  value={formData.taskName}
                  onChange={(e) =>
                    setFormData({ ...formData, taskName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">
                    Hours Spent *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    required
                    value={formData.hoursWorked}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hoursWorked: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">
                    Date of Work
                  </label>
                  <CustomDatePicker
                    value={formData.logDate}
                    onChange={(val) =>
                      setFormData({ ...formData, logDate: val })
                    }
                    placeholder="Select date"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">
                  Description / Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your creative milestones..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
