import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';
import { EmptyState } from '../../components/work/EmptyState';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';

export const EmployeeProjects: React.FC = () => {
  const toast = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const availableMonths: MonthOption[] = useMemo(() => {
    const monthsSet = new Set<string>();
    for (let i = 0; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const [y, m] = key.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        return {
          key,
          label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        };
      });
  }, [now]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'All Months';
    const [yr, mo] = selectedMonth.split('-').map(Number);
    const d = new Date(yr, mo - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }, [selectedMonth]);

  const fetchProjects = async (monthVal = selectedMonth) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (monthVal && monthVal !== 'all') {
        params.append('month', monthVal);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/employee/projects${qs}`);
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Error fetching employee projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(selectedMonth);
  }, [selectedMonth]);

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    // Optimistic UI update
    const nowIso = new Date().toISOString();
    const isFinished = newStatus === 'delivered';
    const deliveredAtVal = isFinished ? nowIso : undefined;
    setProjects((prev) =>
      prev.map((item) => {
        const prj = item.projectId || item;
        const itemId = item._id || prj._id;
        if (itemId === projectId || prj._id === projectId) {
          if (item.projectId) {
            return {
              ...item,
              status: newStatus,
              updatedAt: nowIso,
              deliveredAt: deliveredAtVal,
              projectId: {
                ...item.projectId,
                status: newStatus,
                updatedAt: nowIso,
                deliveredAt: deliveredAtVal,
              },
            };
          }
          return {
            ...item,
            status: newStatus,
            updatedAt: nowIso,
            deliveredAt: deliveredAtVal,
          };
        }
        return item;
      })
    );

    try {
      await api.patch(`/employee/projects/${projectId}/status`, { status: newStatus });
      toast.success(`Project status updated to ${newStatus.replace('_', ' ')}`);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
      fetchProjects();
    }
  };

  const filtered = projects.filter((item) => {
    const term = search.toLowerCase();
    const prj = item.projectId || item;
    const matchesSearch =
      (prj.title || prj.projectName)?.toLowerCase().includes(term) ||
      prj.projectCode?.toLowerCase().includes(term) ||
      (prj.clientId?.name || prj.clientId?.companyName)?.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || prj.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isDelivered = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'delivered';
  };

  // 1. Pending & In Progress Projects (always at top)
  const pendingProjects = useMemo(() => {
    return filtered
      .filter((item) => !isDelivered((item.projectId || item).status))
      .sort((a, b) => {
        const prjA = a.projectId || a;
        const prjB = b.projectId || b;
        return new Date(prjB.createdAt || 0).getTime() - new Date(prjA.createdAt || 0).getTime();
      });
  }, [filtered]);

  // 2. Completed Projects grouped into Date Boxes
  const completedGroups = useMemo(() => {
    const completed = filtered.filter((item) =>
      isDelivered((item.projectId || item).status)
    );
    const groups = new Map<string, any[]>();

    completed.forEach((item) => {
      const prj = item.projectId || item;
      const raw =
        prj.deliveredAt ||
        item.deliveredAt ||
        prj.updatedAt ||
        item.updatedAt ||
        prj.createdAt ||
        item.createdAt;
      let dateKey = 'Unknown Date';
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(item);
    });

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return b.localeCompare(a); // Latest date first
    });

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

    return sortedKeys.map((key) => {
      let label = key;
      if (key !== 'Unknown Date') {
        const [y, m, d] = key.split('-').map(Number);
        const formattedStr = `${d} ${months[m - 1]} ${y}`;
        if (key === todayKey) {
          label = `Today · ${formattedStr}`;
        } else if (key === yesterdayKey) {
          label = `Yesterday · ${formattedStr}`;
        } else {
          label = formattedStr;
        }
      }
      const list = groups.get(key)!;
      list.sort((a, b) => {
        const prjA = a.projectId || a;
        const prjB = b.projectId || b;
        const timeA = new Date(
          prjA.deliveredAt || a.deliveredAt || prjA.updatedAt || a.updatedAt || prjA.createdAt || 0
        ).getTime();
        const timeB = new Date(
          prjB.deliveredAt || b.deliveredAt || prjB.updatedAt || b.updatedAt || prjB.createdAt || 0
        ).getTime();
        return timeB - timeA;
      });
      return {
        dateKey: key,
        dateLabel: label,
        projects: list,
      };
    });
  }, [filtered]);

  const completedTotalCount = useMemo(
    () => completedGroups.reduce((acc, g) => acc + g.projects.length, 0),
    [completedGroups]
  );

  const shouldShowPendingSection = statusFilter === 'all' || !isDelivered(statusFilter);
  const shouldShowCompletedSection = statusFilter === 'all' || isDelivered(statusFilter);

  // Helper to render an employee project row
  const renderProjectRow = (item: any, rowNumber: number) => {
    const prj = item.projectId || item;
    const pool = item.employeeCommission || {};
    const poolTotal = pool.totalCommission ?? pool.expectedCommission ?? 0;

    return (
      <tr key={item._id || prj._id} className="hover:bg-white/[0.015] transition-colors">
        <td className="py-3.5 px-5 font-mono text-xs text-zinc-500 w-12">
          {rowNumber}
        </td>
        <td className="py-3.5 px-5">
          <span className="font-semibold text-white text-sm block">
            {prj.title || prj.projectName}
          </span>
        </td>
        <td className="py-3.5 px-5 text-sm text-zinc-300">
          {prj.clientId?.companyName || prj.clientId?.name || 'Client Production'}
        </td>
        <td className="py-3.5 px-5 font-mono text-sm font-semibold text-[#FF5A1F]">
          {formatINR(poolTotal)}
        </td>
        <td className="py-3.5 px-5">
          <div className="w-36">
            <CustomSelect
              value={prj.status}
              onChange={(val) => handleStatusChange(prj._id, val)}
              options={[
                { value: 'start_process', label: 'Start Process' },
                { value: 'in_process', label: 'In Process' },
                { value: 'in_changes', label: 'In Changes' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          </div>
        </td>
        <td className="py-3.5 px-5 text-right w-24">
          <Link
            to={`/employee/projects/${prj._id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <span>View</span>
            <span className="text-white/90">→</span>
          </Link>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Projects</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Creative productions and briefs where you are an authorized contributor.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
            className="w-full sm:w-44"
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-full sm:w-44"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'start_process', label: 'Start Process' },
              { value: 'in_process', label: 'In Process' },
              { value: 'in_changes', label: 'In Changes' },
              { value: 'delivered', label: 'Delivered' },
            ]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-12 text-center text-zinc-500 font-mono text-xs">
          Loading assigned projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl py-8">
          <EmptyState
            type="projects"
            title={
              selectedMonth !== 'all'
                ? `No assigned projects in ${selectedMonthLabel}`
                : 'No assigned projects'
            }
            description={
              selectedMonth !== 'all'
                ? "Try selecting another month or 'All Months' to view projects."
                : 'You will see projects listed here once you are assigned to production deliverables.'
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: Pending & In Progress Projects (Top) */}
          {shouldShowPendingSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F] animate-pulse" />
                  <h2 className="text-sm font-semibold text-white">Pending & In Process Projects</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F]">
                    {pendingProjects.length}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Active assignments</span>
              </div>

              {pendingProjects.length > 0 ? (
                <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase w-12">NO.</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                          <th className="py-3.5 px-5 text-right w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {pendingProjects.map((item, idx) => renderProjectRow(item, idx + 1))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 bg-[#08090d] border border-white/[0.06] rounded-2xl">
                  No pending or in-process projects in this filter.
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Completed Projects Grouped by Date Boxes */}
          {shouldShowCompletedSection && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A1F]" />
                  <h2 className="text-sm font-semibold text-white">Delivered Projects</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F]">
                    {completedTotalCount}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Grouped by completion date</span>
              </div>

              {completedGroups.length > 0 ? (
                <div className="space-y-4">
                  {completedGroups.map((group) => (
                    <div
                      key={group.dateKey}
                      className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm"
                    >
                      {/* Date Box Header (Orange brand styling) */}
                      <div className="bg-[#0c1017] border-b border-white/[0.06] px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="px-3 py-1.5 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/25 text-[#FF5A1F] font-medium text-xs flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
                            <span>{group.dateLabel}</span>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-400 font-medium">
                          {group.projects.length} {group.projects.length === 1 ? 'project delivered' : 'projects delivered'}
                        </span>
                      </div>

                      {/* Projects inside the Date Box */}
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs min-w-[620px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase w-12">NO.</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                              <th className="py-3 px-5 text-right w-24"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {group.projects.map((item, idx) => renderProjectRow(item, idx + 1))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 bg-[#08090d] border border-white/[0.06] rounded-2xl">
                  No delivered projects found in this filter.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Row count indicator */}
      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'project total' : 'projects total'}
      </div>
    </div>
  );
};
