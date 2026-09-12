import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Users,
  Percent,
  FileCheck2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { CommissionBar } from '../../components/work/CommissionBar';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';
import { MultiSelect } from '../../components/work/MultiSelect';

export const AdminProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState<any>(null);
  const [commission, setCommission] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'commission'>('overview');

  // Modals
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [empShare, setEmpShare] = useState('100');
  const [empRole, setEmpRole] = useState('Lead Producer');

  // Project Edit Form
  const [editFormData, setEditFormData] = useState({
    projectName: '',
    clientId: '',
    projectValue: '',
    assignedEmployees: [] as string[],
    startDate: '',
    deadline: '',
    status: 'signed',
    description: '',
  });



  // Commission Edit Form
  const [commissionForm, setCommissionForm] = useState({
    brokerPercentage: 10,
    employeePercentage: 40,
    officeExpensePercentage: 20,
    adminSharePercentage: 25,
    settlementReservePercentage: 5,
  });

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
      if (proj) {
        const startStr = proj.startDate ? new Date(proj.startDate).toISOString().slice(0, 10) : '';
        const endVal = proj.deadline || proj.endDate;
        const endStr = endVal ? new Date(endVal).toISOString().slice(0, 10) : '';
        const empIds = (proj.assignedEmployees || []).map((e: any) => typeof e === 'object' && e ? e._id : e).filter(Boolean);
        setEditFormData({
          projectName: proj.projectName || proj.title || '',
          clientId: proj.clientId?._id || proj.clientId || '',
          projectValue: String(proj.projectValue !== undefined ? proj.projectValue : proj.totalAmount || ''),
          assignedEmployees: empIds,
          startDate: startStr,
          deadline: endStr,
          status: proj.status || 'signed',
          description: proj.description || '',
        });
      }

      const commData = cRes.data.data || cRes.data.commission || pRes.data.commission || pRes.data.data?.commission;
      if (commData) {
        setCommission(commData);
        setCommissionForm({
          brokerPercentage: commData.brokerPercentage ?? commData.brokerPercent ?? 10,
          employeePercentage: commData.employeePercentage ?? commData.employeePercent ?? 40,
          officeExpensePercentage: commData.officeExpensePercentage ?? commData.officePercent ?? 10,
          adminSharePercentage: commData.adminSharePercentage ?? commData.adminPercent ?? 35,
          settlementReservePercentage: commData.settlementReservePercentage ?? commData.settlementPercent ?? 5,
        });
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

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/admin/projects/${id}/team`, {
        employeeId: selectedEmp,
        sharePercentage: Number(empShare),
        sharePercent: Number(empShare),
        roleInProject: empRole,
      });
      setIsTeamModalOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign team member');
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('Remove this employee from the project team?')) return;
    try {
      await api.delete(`/admin/projects/${id}/team/${memberId}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove team member');
    }
  };

  const handleUpdateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    const sum =
      Number(commissionForm.brokerPercentage) +
      Number(commissionForm.employeePercentage) +
      Number(commissionForm.officeExpensePercentage) +
      Number(commissionForm.adminSharePercentage) +
      Number(commissionForm.settlementReservePercentage);

    if (Math.abs(sum - 100) > 0.01) {
      toast.warning(`Commission splits must sum strictly to 100%. Current sum: ${sum}%`);
      return;
    }

    try {
      await api.put(`/admin/projects/${id}/commission`, commissionForm);
      toast.success('Commission structure updated successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update commission');
    }
  };



  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingEdit(true);
      await api.patch(`/admin/projects/${id}`, {
        ...editFormData,
        projectValue: Number(editFormData.projectValue),
        totalAmount: Number(editFormData.projectValue),
        assignedEmployees: editFormData.assignedEmployees,
        deadline: editFormData.deadline || undefined,
        startDate: editFormData.startDate || undefined,
      });
      toast.success('Project details updated successfully');
      setIsEditModalOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to delete "${project.projectName || project.title}"? All associated data will be removed.`)) {
      return;
    }
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
              <h1 className="text-xl font-bold text-white tracking-tight">{project.projectName || project.title}</h1>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Project</span>
          </button>

          <button
            onClick={handleDeleteProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-medium text-xs transition-colors"
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
                { value: 'lead', label: 'Lead' },
                { value: 'signed', label: 'Signed' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'In Review' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 flex items-center gap-6 text-xs font-mono overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'team', label: `Creative Team (${team.length})` },
          { key: 'commission', label: '100% Commission Split' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'border-ember text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="premium-card p-6 rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Scope & Deliverables</h2>
              <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                {project.description || 'No detailed scope description provided.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="text-white/40 block font-mono text-[10px]">START DATE</span>
                  <span className="font-mono text-white">
                    {new Date(project.startDate || Date.now()).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block font-mono text-[10px]">DELIVERY DEADLINE</span>
                  <span className="font-mono text-white">
                    {project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN') : 'Ongoing'}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block font-mono text-[10px]">CURRENT PHASE</span>
                  <StatusBadge status={project.status} type="project" />
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

          {/* Quick Metrics sidebar */}
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
                  <span className="text-white/60">Employee Pool</span>
                  <span className="font-mono font-bold text-ember">
                    ₹{(financials?.employeePoolTotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-white/50 font-mono">
              Staff assigned share percentages must sum to 100% of the Employee Pool
            </p>
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember text-white text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Staff</span>
            </button>
          </div>

          <div className="premium-table-wrap">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-white/40 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Project Role</th>
                  <th className="py-3 px-4">Pool Share %</th>
                  <th className="py-3 px-4">Expected Commission</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {team.length > 0 ? (
                  team.map((m: any) => (
                    <tr key={m._id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">
                          {m.employeeId?.fullName || m.employeeId?.name || 'Staff Member'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/70">{m.roleInProject || 'Creator'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-ember">{m.sharePercentage ?? m.sharePercent}%</td>
                      <td className="py-3 px-4 font-mono text-white">
                        ₹
                        {(
                          ((((project.projectValue !== undefined ? project.projectValue : project.totalAmount) || 0) * (commission?.employeePercentage ?? commission?.employeePercent ?? 0)) / 100) *
                          (((m.sharePercentage ?? m.sharePercent) || 100) / 100)
                        ).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveTeamMember(m._id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/40 font-mono">
                      No team members assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission Structure Tab */}
      {activeTab === 'commission' && (
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">100% Five-Tier Commission Matrix</h2>
            <p className="text-xs text-white/50 font-mono">
              Broker + Employee Pool + Office Expense + Admin Share + Reserve = strictly 100.0%
            </p>
          </div>

          <form onSubmit={handleUpdateCommission} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="text-white/70 block mb-1">Broker Fee % (External Referral)</label>
                <input
                  type="number"
                  step="0.1"
                  value={commissionForm.brokerPercentage}
                  onChange={(e) =>
                    setCommissionForm({ ...commissionForm, brokerPercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white/70 block mb-1">Employee Pool % (Distributed to Staff)</label>
                <input
                  type="number"
                  step="0.1"
                  value={commissionForm.employeePercentage}
                  onChange={(e) =>
                    setCommissionForm({ ...commissionForm, employeePercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white/70 block mb-1">Office Expense % (Overheads & Infrastructure)</label>
                <input
                  type="number"
                  step="0.1"
                  value={commissionForm.officeExpensePercentage}
                  onChange={(e) =>
                    setCommissionForm({ ...commissionForm, officeExpensePercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white/70 block mb-1">Admin Share % (Company Net Margin)</label>
                <input
                  type="number"
                  step="0.1"
                  value={commissionForm.adminSharePercentage}
                  onChange={(e) =>
                    setCommissionForm({ ...commissionForm, adminSharePercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white/70 block mb-1">Settlement Reserve % (Contingency Buffer)</label>
                <input
                  type="number"
                  step="0.1"
                  value={commissionForm.settlementReservePercentage}
                  onChange={(e) =>
                    setCommissionForm({ ...commissionForm, settlementReservePercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>
            </div>

            <CommissionBar
              broker={commissionForm.brokerPercentage}
              employee={commissionForm.employeePercentage}
              officeExpense={commissionForm.officeExpensePercentage}
              adminShare={commissionForm.adminSharePercentage}
              settlementReserve={commissionForm.settlementReservePercentage}
              totalAmount={project.totalAmount}
            />

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-ember to-ember-deep text-white font-medium hover:shadow-[0_0_15px_rgba(255,90,31,0.4)] transition-all cursor-pointer"
            >
              Save Commission Structure
            </button>
          </form>
        </div>
      )}



      {/* Assign Team Modal */}
      {isTeamModalOpen && (
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="premium-modal animate-modal-scale relative w-full max-w-md p-6 space-y-4 text-white text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">Assign Staff to Project</h3>
              <button onClick={() => setIsTeamModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddTeamMember} className="space-y-3">
              <div>
                <label className="text-white/60 block mb-1">Select Employee *</label>
                <CustomSelect
                  value={selectedEmp}
                  onChange={(val) => setSelectedEmp(val)}
                  placeholder="Select Employee"
                  options={allEmployees.map((e) => ({
                    value: e._id,
                    label: e.name,
                    sublabel: e.designation || 'Staff',
                  }))}
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Role in Project</label>
                <input
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Share in Employee Pool % (e.g. 100 for sole editor)</label>
                <input
                  type="number"
                  required
                  value={empShare}
                  onChange={(e) => setEmpShare(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-ember text-white font-medium">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="font-bold text-base tracking-tight text-white">Edit Project</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jyotnar Brand Identity"
                  value={editFormData.projectName}
                  onChange={(e) => setEditFormData({ ...editFormData, projectName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Client *</label>
                  <CustomSelect
                    value={editFormData.clientId}
                    onChange={(val) => setEditFormData({ ...editFormData, clientId: val })}
                    placeholder="Select client"
                    options={allClients.map((c) => ({
                      value: c._id,
                      label: c.name || c.companyName,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Contract Value (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100000"
                    value={editFormData.projectValue}
                    onChange={(e) => setEditFormData({ ...editFormData, projectValue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Assigned Employees Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>Assign Team / Staff</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Select one or more employees
                  </span>
                </div>
                <MultiSelect
                  values={editFormData.assignedEmployees}
                  onChange={(vals) => setEditFormData({ ...editFormData, assignedEmployees: vals })}
                  placeholder="Select employees to assign..."
                  options={allEmployees.map((emp) => ({
                    value: emp._id,
                    label: emp.fullName || emp.name,
                    sublabel: emp.employeeCode ? `(${emp.employeeCode})` : undefined,
                  }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Start Date</label>
                  <CustomDatePicker
                    value={editFormData.startDate}
                    onChange={(val) => setEditFormData({ ...editFormData, startDate: val })}
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Target End Date</label>
                  <CustomDatePicker
                    value={editFormData.deadline}
                    onChange={(val) => setEditFormData({ ...editFormData, deadline: val })}
                    placeholder="Select end date"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Status</label>
                  <CustomSelect
                    value={editFormData.status}
                    onChange={(val) => setEditFormData({ ...editFormData, status: val })}
                    options={[
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'review', label: 'In Review' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'delivered', label: 'Delivered' },
                      { value: 'signed', label: 'Signed' },
                      { value: 'lead', label: 'Lead' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Description / Scope</label>
                <textarea
                  rows={2}
                  placeholder="Creative deliverables, production guidelines..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
                >
                  {submittingEdit ? 'Saving...' : 'Update Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
