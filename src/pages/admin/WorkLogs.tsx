import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  MessageSquare,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomCalendarDropdown } from '../../components/work/CustomCalendarDropdown';

export const AdminWorkLogs: React.FC = () => {
  const toast = useToast();
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');

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

  const filtered = workLogs.filter((log) => {
    const term = search.toLowerCase();
    const matchesSearch =
      log.taskName?.toLowerCase().includes(term) ||
      (log.employeeId?.fullName || log.employeeId?.name || '')?.toLowerCase().includes(term) ||
      (log.projectId?.projectName || log.projectId?.title || '')?.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const logEmpId = typeof log.employeeId === 'object' && log.employeeId !== null
      ? String(log.employeeId._id || log.employeeId.id || '')
      : String(log.employeeId || '');
    const matchesEmployee = employeeFilter === 'all' || logEmpId === String(employeeFilter);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Work logs</h1>
        <p className="text-xs text-zinc-400 mt-1">Review timesheets and track employee hours.</p>
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
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
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
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'changes_requested', label: 'Changes requested' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TASK</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">EMPLOYEE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">HOURS</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DATE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading work logs...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-semibold text-white text-sm">{log.taskName}</div>
                      {log.description && (
                        <div className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{log.description}</div>
                      )}
                      {log.rejectionReason && (
                        <div className="text-[11px] text-red-400 font-mono mt-1">
                          Note: {log.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-white block">
                        {log.employeeId?.fullName || log.employeeId?.name || 'Staff Member'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-zinc-300">
                        {log.projectId?.projectName || log.projectId?.title || 'Creative Task'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-medium text-white text-sm">
                      {log.hoursWorked !== undefined ? `${log.hoursWorked}h` : log.totalMinutes ? `${Math.round(log.totalMinutes / 60)}h` : '0h'}
                    </td>
                    <td className="py-4 px-6 text-zinc-400 text-xs font-mono">
                      {new Date(log.logDate || log.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={log.status} type="workLog" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {log.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(log._id, 'approved')}
                            title="Approve Timesheet"
                            className="p-1.5 rounded-lg bg-ember/15 hover:bg-ember/25 text-ember transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {log.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(log._id, 'rejected')}
                            title="Reject Timesheet"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {log.status !== 'changes_requested' && (
                          <button
                            onClick={() => handleUpdateStatus(log._id, 'changes_requested')}
                            title="Request Revision"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No work logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'work log' : 'work logs'}
      </div>
    </div>
  );
};
