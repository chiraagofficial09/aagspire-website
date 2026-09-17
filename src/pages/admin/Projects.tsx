import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  Sliders,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';
import { ProjectModal } from '../../components/work/ProjectModal';
import { EmptyState } from '../../components/work/EmptyState';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';

export const AdminProjects: React.FC = () => {
  const toast = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const fetchAll = async (monthVal = selectedMonth) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (monthVal && monthVal !== 'all') {
        params.append('month', monthVal);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const [prjRes, cliRes, empRes] = await Promise.all([
        api.get(`/admin/projects${qs}`),
        api.get('/admin/clients'),
        api.get('/admin/employees'),
      ]);
      setProjects(prjRes.data.data || prjRes.data.projects || []);
      setClients(cliRes.data.data || cliRes.data.clients || []);
      setEmployees(empRes.data.data || empRes.data.employees || []);
    } catch (err) {
      console.error('Error loading projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(selectedMonth);
  }, [selectedMonth]);

  // Close popup menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prj: any) => {
    setEditingProject(prj);
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    setActiveMenuId(null);
    if (!window.confirm(`Are you sure you want to delete "${name}"? All associated commissions, payments, and team links will be removed.`)) {
      return;
    }
    try {
      await api.delete(`/admin/projects/${id}`);
      toast.success('Project deleted successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    // Optimistic UI update
    const nowIso = new Date().toISOString();
    const isFinished = newStatus === 'delivered' || newStatus === 'completed';
    const deliveredAtVal = isFinished ? nowIso : undefined;
    setProjects((prev) =>
      prev.map((p) =>
        p._id === projectId
          ? {
              ...p,
              status: newStatus,
              updatedAt: nowIso,
              deliveredAt: deliveredAtVal,
            }
          : p
      )
    );
    try {
      await api.patch(`/admin/projects/${projectId}`, { status: newStatus });
      toast.success(`Project status updated to ${newStatus.replace('_', ' ')}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
      fetchAll();
    }
  };

  const filtered = projects.filter((p) => {
    const term = search.toLowerCase();
    const title = p.projectName || p.title || '';
    const clientName = p.clientId?.companyName || p.clientId?.name || '';
    const employeeMatch = (p.assignedEmployees || []).some((emp: any) => {
      const name = emp?.fullName || emp?.name || '';
      const code = emp?.employeeCode || '';
      return name.toLowerCase().includes(term) || code.toLowerCase().includes(term);
    });
    const matchesSearch =
      title.toLowerCase().includes(term) ||
      p.projectCode?.toLowerCase().includes(term) ||
      clientName.toLowerCase().includes(term) ||
      employeeMatch;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isCompletedOrDelivered = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'completed' || s === 'delivered';
  };

  // 1. Pending & In Progress Projects (shown at the very top)
  const pendingProjects = useMemo(() => {
    return filtered
      .filter((p) => !isCompletedOrDelivered(p.status))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [filtered]);

  // 2. Completed Projects grouped into Date Boxes (latest day on top, older below)
  const completedGroups = useMemo(() => {
    const completed = filtered.filter((p) => isCompletedOrDelivered(p.status));
    const groups = new Map<string, any[]>();

    completed.forEach((prj) => {
      const raw = prj.deliveredAt || prj.updatedAt || prj.createdAt;
      let dateKey = 'Unknown Date';
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(prj);
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
        const timeA = new Date(a.deliveredAt || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.deliveredAt || b.updatedAt || b.createdAt || 0).getTime();
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

  const shouldShowPendingSection = statusFilter === 'all' || !isCompletedOrDelivered(statusFilter);
  const shouldShowCompletedSection = statusFilter === 'all' || isCompletedOrDelivered(statusFilter);

  // Helper to render a project table row
  const renderProjectRow = (prj: any, rowNumber: number) => {
    const clientName = prj.clientId?.companyName || prj.clientId?.name || 'Jyotnar Natural Foods';

    return (
      <tr key={prj._id} className="hover:bg-white/[0.015] transition-colors">
        <td className="py-3.5 px-5 font-mono text-xs text-zinc-500 w-12">
          {rowNumber}
        </td>
        <td className="py-3.5 px-5">
          <div className="font-semibold text-white text-sm">
            {prj.projectName || prj.title}
          </div>
        </td>
        <td className="py-3.5 px-5">
          <span className="text-sm text-zinc-300">{clientName}</span>
        </td>
        <td className="py-3.5 px-5">
          {prj.assignedEmployees && prj.assignedEmployees.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
              {prj.assignedEmployees.map((emp: any) => (
                <span
                  key={emp._id || emp}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-200"
                  title={`${emp.fullName || emp.name} (${emp.employeeCode || 'EMP'})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
                  <span className="truncate max-w-[110px]">{emp.fullName || emp.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-zinc-500 italic">Unassigned</span>
          )}
        </td>
        <td className="py-3.5 px-5">
          <div className="w-36">
            <CustomSelect
              value={prj.status || 'in_progress'}
              onChange={(val) => handleStatusChange(prj._id, val)}
              options={[
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'In Review' },
                { value: 'completed', label: 'Completed' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'signed', label: 'Signed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </td>
        <td className="py-3.5 px-5 text-right w-28">
          <div className="flex items-center justify-end gap-2 relative">
            <Link
              to={`/admin/projects/${prj._id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
            >
              <span>View</span>
              <span className="text-zinc-400">→</span>
            </Link>

            <div className="relative">
              <button
                onClick={(e) => {
                  if (activeMenuId === prj._id) {
                    setActiveMenuId(null);
                  } else {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setMenuPos({
                      top: rect.bottom + 4,
                      left: Math.max(8, Math.min(window.innerWidth - 136, rect.right - 128)),
                    });
                    setActiveMenuId(prj._id);
                  }
                }}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Projects
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage creative production, client assignments, team allocations, and project statuses.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
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
              { value: 'in_progress', label: 'In progress' },
              { value: 'signed', label: 'Signed' },
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

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-12 text-center text-zinc-500 font-mono text-xs">
          Loading projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl py-8">
          <EmptyState
            type="projects"
            title={selectedMonth !== 'all' ? `No projects in ${selectedMonthLabel}` : undefined}
            description={
              selectedMonth !== 'all'
                ? "Try selecting another month or 'All Months' to view projects."
                : undefined
            }
            actionLabel={selectedMonth === 'all' ? 'Create First Project' : undefined}
            onAction={selectedMonth === 'all' ? openCreateModal : undefined}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: Pending & In Progress Projects (Always Top) */}
          {shouldShowPendingSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F] animate-pulse" />
                  <h2 className="text-sm font-semibold text-white">Pending & In Progress Projects</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F]">
                    {pendingProjects.length}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Active production</span>
              </div>

              {pendingProjects.length > 0 ? (
                <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[660px]">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase w-12">NO.</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">ASSIGNED TO</th>
                          <th className="py-3.5 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                          <th className="py-3.5 px-5 text-right w-28"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {pendingProjects.map((prj, idx) => renderProjectRow(prj, idx + 1))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 bg-[#08090d] border border-white/[0.06] rounded-2xl">
                  No pending or in-progress projects in this filter.
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
                  <h2 className="text-sm font-semibold text-white">Completed Projects</h2>
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
                          {group.projects.length} {group.projects.length === 1 ? 'project completed' : 'projects completed'}
                        </span>
                      </div>

                      {/* Projects inside the Date Box */}
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs min-w-[660px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase w-12">NO.</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">ASSIGNED TO</th>
                              <th className="py-3 px-5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                              <th className="py-3 px-5 text-right w-28"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {group.projects.map((prj, idx) => renderProjectRow(prj, idx + 1))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 bg-[#08090d] border border-white/[0.06] rounded-2xl">
                  No completed projects found in this filter.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fixed-position Dropdown Action Menu */}
      {activeMenuId && (() => {
        const activePrj = filtered.find((p) => p._id === activeMenuId);
        if (!activePrj) return null;
        return (
          <div
            ref={menuRef}
            className="fixed w-32 bg-[#12131a] border border-white/[0.08] rounded-xl shadow-xl py-1 z-50"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => openEditModal(activePrj)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-zinc-400" />
              <span>Edit Project</span>
            </button>
            <Link
              to={`/admin/commissions`}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-[#FF5A1F] hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-[#FF5A1F]" />
              <span>Commission Split</span>
            </Link>
            <button
              onClick={() => handleDelete(activePrj._id, activePrj.projectName || activePrj.title)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>Delete</span>
            </button>
          </div>
        );
      })()}

      {/* Row count indicator */}
      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'project total' : 'projects total'}
      </div>

      {/* Reusable Project Modal for Creating & Editing */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={editingProject}
        clients={clients}
        employees={employees}
        onSuccess={() => fetchAll()}
      />
    </div>
  );
};
