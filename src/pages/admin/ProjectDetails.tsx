import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { CommissionBar } from '../../components/work/CommissionBar';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';
import { CustomSelect } from '../../components/work/CustomSelect';
import { ProjectModal } from '../../components/work/ProjectModal';
import { useAlert } from '../../context/AlertContext';

export const AdminProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { showConfirm } = useAlert();
  const [project, setProject] = useState<any>(null);
  const [commission, setCommission] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pRes, cRes, tRes, fRes, empRes, cliRes] = await Promise.all([
        api.get(`/admin/projects/${id}`),
        api.get(`/admin/projects/${id}/commission`).catch(() => ({ data: { data: null } })),
        api.get(`/admin/projects/${id}/team`),
        api.get(`/admin/projects/${id}/financials`),
        api.get('/admin/employees'),
        api.get('/admin/clients'),
      ]);

      const proj = pRes.data.data?.project || pRes.data.project || pRes.data.data;
      setProject(proj);

      const commData = cRes.data.data || cRes.data.commission || pRes.data.commission || pRes.data.data?.commission;
      if (commData) {
        setCommission(commData);
      }
      setTeam(tRes.data.data || []);
      setFinancials(fRes.data.data);
      setAllEmployees(empRes.data.data || []);
      setAllClients(cliRes.data.data || cliRes.data.clients || []);
    } catch (err) {
      console.error('Error fetching project data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.patch(`/admin/projects/${id}`, { status: newStatus });
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteProject = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project.projectName || project.title}"? All associated data will be permanently removed.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/projects/${id}`);
      toast.success('Project deleted successfully');
      navigate('/admin/projects');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-white/50 font-mono">Project not found.</div>;

  const teamMembers = team.length > 0
    ? team.map((m: any) => m.employeeId?.fullName || m.employeeId?.name).filter(Boolean)
    : (project.assignedEmployees || []).map((e: any) => e.fullName || e.name).filter(Boolean);
  const teamMemberDisplay = teamMembers.length > 0 ? teamMembers.join(', ') : 'Unassigned';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/projects"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div>
              <h1 className="text-xl font-bold text-[#FF5A1F] tracking-tight">{project.projectName || project.title}</h1>
            </div>
            <p className="text-xs text-white/50 font-mono">
              Client: {project.clientId?.companyName || project.clientId?.name || 'Internal'} &bull; Budget: {formatINR(project.projectValue ?? project.totalAmount)}
            </p>
          </div>
        </div>

        {/* Action Controls & Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Project</span>
          </button>

          <button
            onClick={handleDeleteProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-medium text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <span className="text-xs font-mono text-white/40 uppercase">Status:</span>
            <CustomSelect
              value={project.status}
              onChange={(val) => handleUpdateStatus(val)}
              className="w-36"
              options={[
                { value: 'start_process', label: 'Start Process' },
                { value: 'in_process', label: 'In Process' },
                { value: 'in_changes', label: 'In Changes' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tabs - Overview Only */}
      <div className="border-b border-white/10 flex items-center gap-6 text-xs font-mono">
        <button
          className="pb-3 border-b-2 border-ember text-white font-bold whitespace-nowrap cursor-default"
        >
          Overview
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card: START DATE, DELIVERY DEADLINE, CURRENT PHASE, Team Member */}
          <div className="premium-card p-6 rounded-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-white/40 block font-mono text-[10px] mb-1 uppercase">START DATE</span>
                <span className="font-mono text-white text-xs font-medium">
                  {new Date(project.startDate || Date.now()).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-white/40 block font-mono text-[10px] mb-1 uppercase">DELIVERY DEADLINE</span>
                <span className="font-mono text-white text-xs font-medium">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN') : 'Ongoing'}
                </span>
              </div>
              <div>
                <span className="text-white/40 block font-mono text-[10px] mb-1 uppercase">CURRENT PHASE</span>
                <StatusBadge status={project.status} type="project" />
              </div>
              <div>
                <span className="text-white/40 block font-mono text-[10px] mb-1">Team Member</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-white/10 text-white border-white/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
                  <span className="truncate max-w-[150px]">{teamMemberDisplay}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Current Commission Bar Preview */}
          <div className="premium-card p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Project Commission Allocation
            </h2>
            <CommissionBar
              broker={commission?.brokerPercentage ?? commission?.brokerPercent ?? 0}
              employee={commission?.employeePercentage ?? commission?.employeePercent ?? 0}
              officeExpense={commission?.officeExpensePercentage ?? commission?.officePercent ?? 0}
              adminShare={commission?.adminSharePercentage ?? commission?.adminPercent ?? 0}
              settlementReserve={commission?.settlementReservePercentage ?? commission?.settlementPercent ?? 0}
              totalAmount={project.projectValue !== undefined ? project.projectValue : project.totalAmount || 0}
            />
          </div>
        </div>

        {/* Financial Snapshot Sidebar */}
        <div className="space-y-4">
          <div className="premium-card p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-mono text-white/40 uppercase tracking-wider">Financial Snapshot</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Total Budget</span>
                <span className="font-mono font-bold text-white">
                  {formatINR(project.projectValue ?? project.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Client Collected</span>
                <span className="font-mono font-bold text-white">
                  ₹{(financials?.collectedAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Team Pool</span>
                <span className="font-mono font-bold text-ember">
                  ₹{(financials?.employeePoolTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Unified Project Modal */}
      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={project}
        clients={allClients}
        employees={allEmployees}
        onSuccess={() => fetchAll()}
      />
    </div>
  );
};
