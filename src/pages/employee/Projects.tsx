import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
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
    const deliveredAtVal = newStatus === 'delivered' ? nowIso : undefined;
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

  // Delivered projects are placed at the end of the list;
  // among delivered projects, newly delivered appears first, and the first delivered project stays at the very last end ("last ma last")
  const sortedProjects = [...filtered].sort((a, b) => {
    const prjA = a.projectId || a;
    const prjB = b.projectId || b;
    const aDelivered = (prjA.status || a.status || '').toLowerCase() === 'delivered';
    const bDelivered = (prjB.status || b.status || '').toLowerCase() === 'delivered';
    if (aDelivered && !bDelivered) return 1;
    if (!aDelivered && bDelivered) return -1;
    if (aDelivered && bDelivered) {
      const timeA = new Date(prjA.deliveredAt || a.deliveredAt || prjA.updatedAt || a.updatedAt || prjA.createdAt || a.createdAt || 0).getTime();
      const timeB = new Date(prjB.deliveredAt || b.deliveredAt || prjB.updatedAt || b.updatedAt || prjB.createdAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    }
    const timeA = new Date(prjA.createdAt || a.createdAt || 0).getTime();
    const timeB = new Date(prjB.createdAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Projects</h1>
        <p className="text-xs text-zinc-400 mt-1">Creative productions and briefs where you are an authorized contributor.</p>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'review', label: 'In review' },
              { value: 'completed', label: 'Completed' },
              { value: 'delivered', label: 'Delivered' },
            ]}
          />
        </div>
      </div>

      {/* Active Month Filter Notification Banner */}
      {selectedMonth !== 'all' && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#111218] border border-[#FF5A1F]/20 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
            <span className="text-zinc-300">
              Showing projects for <span className="font-semibold text-white">{selectedMonthLabel}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className="text-xs text-[#FF5A1F] hover:text-[#ff7847] hover:underline font-medium cursor-pointer"
          >
            Show All Months
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                    Loading assigned projects...
                  </td>
                </tr>
              ) : sortedProjects.length > 0 ? (
                sortedProjects.map((item) => {
                  const prj = item.projectId || item;
                  const pool = item.employeeCommission || {};
                  const poolTotal = pool.totalCommission ?? pool.expectedCommission ?? 0;

                  return (
                    <tr key={item._id || prj._id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-white text-sm block">{prj.title || prj.projectName}</span>
                      </td>
                      <td className="py-4 px-6 text-sm text-zinc-300">
                        {prj.clientId?.companyName || prj.clientId?.name || 'Client Production'}
                      </td>
                      <td className="py-4 px-6 font-mono text-sm font-semibold text-[#FF5A1F]">
                        {formatINR(poolTotal)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-36">
                          <CustomSelect
                            value={prj.status}
                            onChange={(val) => handleStatusChange(prj._id, val)}
                            options={[
                              { value: 'confirmed', label: 'Confirmed' },
                              { value: 'in_progress', label: 'In Progress' },
                              { value: 'review', label: 'In Review' },
                              { value: 'completed', label: 'Completed' },
                              { value: 'delivered', label: 'Delivered' },
                            ]}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/employee/projects/${prj._id}`}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
                        >
                          <span>View</span>
                          <span className="text-zinc-400">→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      type="projects"
                      title={selectedMonth !== 'all' ? `No assigned projects in ${selectedMonthLabel}` : "No assigned projects"}
                      description={
                        selectedMonth !== 'all'
                          ? "Try selecting another month or 'All Months' to view projects."
                          : "You will see projects listed here once you are assigned to production deliverables."
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {sortedProjects.length} {sortedProjects.length === 1 ? 'project' : 'projects'}
      </div>
    </div>
  );
};
