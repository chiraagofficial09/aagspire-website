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
import { WorkLogCard, extractProjectsFromLog, ExtractedProject } from '../../components/work/WorkLogCard';
import { useAlert } from '../../context/AlertContext';

export const AdminWorkLogs: React.FC = () => {
  const toast = useToast();
  const { showConfirm } = useAlert();
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
          (d: ExtractedProject) =>
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
      {loading ? (
        <div className="bg-[#090a0e] border border-white/[0.06] rounded-xl p-10 text-center text-zinc-500 font-mono text-xs">
          Loading work logs...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
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

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'work log' : 'work logs'}
      </div>
    </div>
  );
};
