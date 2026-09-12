import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';
import { ProjectModal } from '../../components/work/ProjectModal';
import { EmptyState } from '../../components/work/EmptyState';

export const AdminProjects: React.FC = () => {
  const toast = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [prjRes, cliRes, empRes] = await Promise.all([
        api.get('/admin/projects'),
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
    fetchAll();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header - matching reference screenshot */}
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar - matching reference screenshot */}
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

      {/* Projects Table - matching reference screenshot */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">ASSIGNED TO</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                    Loading projects...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((prj) => {
                  const clientName = prj.clientId?.companyName || prj.clientId?.name || 'Jyotnar Natural Foods';

                  return (
                    <tr key={prj._id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white text-sm">
                          {prj.projectName || prj.title}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-zinc-300">{clientName}</span>
                      </td>
                      <td className="py-4 px-6">
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
                      <td className="py-4 px-6">
                        <StatusBadge status={prj.status || 'in_progress'} type="project" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          <Link
                            to={`/admin/projects/${prj._id}`}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors"
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
                                  setMenuPos({ top: rect.bottom + 4, left: rect.right - 128 });
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
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState
                      type="projects"
                      actionLabel="Create First Project"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed-position Dropdown Action Menu (rendered outside table to avoid overflow clipping) */}
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
              <span>Edit</span>
            </button>
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

      {/* Row count indicator matching reference */}
      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
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
