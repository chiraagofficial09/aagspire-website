import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { WorkLogCard } from '../../components/work/WorkLogCard';
import { Pagination, PaginationInfo } from '../../components/work/Pagination';
import { useAlert } from '../../context/AlertContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const LOGS_PER_PAGE = 20;

export const AdminWorkLogs: React.FC = () => {
  const toast = useToast();
  const { showConfirm } = useAlert();
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlEmpId = searchParams.get('employeeId');
  const urlDate = searchParams.get('date');
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState(urlEmpId || 'all');
  const [dateFilter, setDateFilter] = useState(urlDate || 'all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (urlEmpId) setEmployeeFilter(urlEmpId);
    if (urlDate) setDateFilter(urlDate);
  }, [urlEmpId, urlDate]);

  const setPage = (next: number, replace = false) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next <= 1) params.delete('page');
      else params.set('page', String(next));
      return params;
    }, { replace });
  };

  // Changing a filter starts again from page 1. Compared with the previous values (not a
  // first-run flag) so a refreshed ?page= survives StrictMode's double effect run.
  const filterKey = `${debouncedSearch}|${statusFilter}|${employeeFilter}|${dateFilter}`;
  const lastFilters = useRef(filterKey);
  useEffect(() => {
    if (filterKey === lastFilters.current) return;
    lastFilters.current = filterKey;
    setPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Reloads the current page (after a review, delete or project status change)
  const fetchWorkLogs = () => setReloadKey((value) => value + 1);

  useEffect(() => {
    api.get('/admin/employees')
      .then((res) => setEmployees(res.data?.data || res.data?.employees || []))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true);
    api.get('/admin/work-logs', {
      params: {
        page,
        limit: LOGS_PER_PAGE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(employeeFilter !== 'all' ? { employeeId: employeeFilter } : {}),
        ...(dateFilter && dateFilter !== 'all' ? { date: dateFilter } : {}),
      },
    })
      .then((res) => {
        if (current !== requestId.current) return;
        const info: PaginationInfo | undefined = res.data.pagination;
        // A delete can empty the last page; step back instead of showing nothing
        if (info && page > info.totalPages) {
          setPage(info.totalPages, true);
          return;
        }
        setWorkLogs(res.data?.data || res.data?.workLogs || []);
        setPagination(info || null);
      })
      .catch((err) => {
        if (current === requestId.current) console.error('Error fetching work logs', err);
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterKey, reloadKey]);

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
      { value: 'all', label: 'All team members' },
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

  const handleDeleteWorkLog = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Work Log',
      message: 'Are you sure you want to delete this work log? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/work-logs/${id}`);
      toast.success('Work log deleted successfully');
      fetchWorkLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete work log');
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
      await api.patch(`/admin/projects/${projectId}`, { status: targetStatus });
      toast.success(
        targetStatus === 'delivered'
          ? 'Project marked as delivered!'
          : 'Project status updated to In Process'
      );
      fetchWorkLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    } finally {
      setUpdatingProjectId(null);
    }
  };

  // Search, status, team member and date filters all run on the server
  const filtered = workLogs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Work logs</h1>
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
      {loading && !pagination ? (
        <div className="bg-[#090a0e] border border-white/[0.06] rounded-xl p-10 text-center text-zinc-500 font-mono text-xs">
          Loading work logs...
        </div>
      ) : filtered.length > 0 ? (
        <div className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {filtered.map((log) => (
            <WorkLogCard
              key={log._id}
              log={log}
              showEmployee={true}
              onStatusUpdate={handleUpdateStatus}
              onDelete={handleDeleteWorkLog}
            />
          ))}
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

      {pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={(next) => {
            setPage(next);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          unit={['work log', 'work logs']}
          disabled={loading}
        />
      )}
    </div>
  );
};
