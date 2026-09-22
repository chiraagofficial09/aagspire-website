import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Save,
  Building2,
  Users,
  Briefcase,
  Handshake,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';
import { CommissionBar } from '../../components/work/CommissionBar';
import { formatINR } from '../../utils/formatters';
import { CustomSelect, SelectOption } from '../../components/work/CustomSelect';

export const AdminCommissions: React.FC = () => {
  const toast = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);

  // Default split for all new projects
  const [defaultSplit, setDefaultSplit] = useState({
    broker: 10,
    employee: 40,
    officeExpense: 10,
    adminShare: 35,
    settlementReserve: 5,
  });

  // Selected project ID ('default_template' or project ID)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('default_template');

  const [splits, setSplits] = useState({
    broker: 10,
    employee: 40,
    officeExpense: 10,
    adminShare: 35,
    settlementReserve: 5,
  });

  const fetchDefaultPreset = async () => {
    try {
      // First check local storage for instant sync
      const cached = localStorage.getItem('default_project_commission_split');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const localObj = {
            broker: Number(parsed.brokerPercent ?? parsed.broker ?? 10),
            employee: Number(parsed.employeePercent ?? parsed.employee ?? 40),
            officeExpense: Number(parsed.officePercent ?? parsed.officeExpense ?? 10),
            adminShare: Number(parsed.adminPercent ?? parsed.adminShare ?? 35),
            settlementReserve: Number(parsed.settlementPercent ?? parsed.settlementReserve ?? 5),
          };
          setDefaultSplit(localObj);
          setSplits(localObj);
        } catch (_) {}
      }

      const res = await api.get('/admin/commissions/presets/default');
      if (res.data?.success && res.data?.preset) {
        const p = res.data.preset;
        const s = {
          broker: Number(p.brokerPercent ?? 10),
          employee: Number(p.employeePercent ?? 40),
          officeExpense: Number(p.officePercent ?? 10),
          adminShare: Number(p.adminPercent ?? 35),
          settlementReserve: Number(p.settlementPercent ?? 5),
        };
        setDefaultSplit(s);
        localStorage.setItem('default_project_commission_split', JSON.stringify(s));
        if (selectedProjectId === 'default_template') {
          setSplits(s);
        }
      }
    } catch (err) {
      console.warn('Could not fetch server default preset, using local cache', err);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/projects');
      const prjs = res.data.data || res.data.projects || [];
      setProjects(prjs);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaultPreset();
    fetchProjects();
  }, []);

  const selectProject = (proj: any, allPrjs?: any[]) => {
    if (!proj || proj === 'default_template') {
      setSelectedProjectId('default_template');
      setSplits(defaultSplit);
      return;
    }

    const currentList = allPrjs || projects;
    const target = currentList.find((p) => p._id === proj._id || p.id === proj.id || p._id === proj || p.id === proj) || proj;

    setSelectedProjectId(target._id || target.id);

    const comm = target.commission || {};
    setSplits({
      broker: Number(comm.brokerPercent ?? comm.brokerPercentage ?? defaultSplit.broker),
      employee: Number(comm.employeePercent ?? comm.employeePercentage ?? defaultSplit.employee),
      officeExpense: Number(comm.officePercent ?? comm.officeExpensePercentage ?? defaultSplit.officeExpense),
      adminShare: Number(comm.adminPercent ?? comm.adminSharePercentage ?? defaultSplit.adminShare),
      settlementReserve: Number(comm.settlementPercent ?? comm.settlementReservePercentage ?? defaultSplit.settlementReserve),
    });
  };

  const handleSelectChange = (projectId: string) => {
    if (projectId === 'default_template') {
      selectProject('default_template');
    } else {
      const p = projects.find((item) => item._id === projectId || item.id === projectId);
      if (p) selectProject(p);
    }
  };

  const totalSplitPercent =
    Number(splits.broker) +
    Number(splits.employee) +
    Number(splits.officeExpense) +
    Number(splits.adminShare) +
    Number(splits.settlementReserve);

  const isStrict100 = Math.abs(totalSplitPercent - 100) < 0.01;

  const currentProject = projects.find(
    (p) => p._id === selectedProjectId || p.id === selectedProjectId
  );

  const projectBudget = currentProject
    ? Number(currentProject.projectValue ?? currentProject.totalAmount ?? 0)
    : 0;

  const handleSaveCommission = async () => {
    if (!isStrict100) {
      toast.warning(`Commission splits must sum strictly to 100%. Current sum is ${totalSplitPercent.toFixed(1)}%`);
      return;
    }

    if (!currentProject) {
      toast.info('Select a project from the dropdown to save project-specific commission, or click "Save as Default for New Projects".');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        brokerPercentage: splits.broker,
        brokerPercent: splits.broker,
        employeePercentage: splits.employee,
        employeePercent: splits.employee,
        officeExpensePercentage: splits.officeExpense,
        officePercent: splits.officeExpense,
        adminSharePercentage: splits.adminShare,
        adminPercent: splits.adminShare,
        settlementReservePercentage: splits.settlementReserve,
        settlementPercent: splits.settlementReserve,
      };

      await api.put(`/admin/projects/${selectedProjectId}/commission`, payload);
      toast.success(`Commission split saved successfully for "${currentProject.projectName || 'Project'}"!`);

      // Refresh list to update matrix below
      const res = await api.get('/admin/projects');
      const updatedList = res.data.data || res.data.projects || [];
      setProjects(updatedList);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save commission structure');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsDefault = async () => {
    if (!isStrict100) {
      toast.warning(`Commission splits must sum strictly to 100%. Current sum is ${totalSplitPercent.toFixed(1)}%`);
      return;
    }

    try {
      setSavingDefault(true);
      const payload = {
        brokerPercent: splits.broker,
        employeePercent: splits.employee,
        officePercent: splits.officeExpense,
        adminPercent: splits.adminShare,
        settlementPercent: splits.settlementReserve,
      };

      await api.post('/admin/commissions/presets/default', payload);
      setDefaultSplit(splits);
      localStorage.setItem('default_project_commission_split', JSON.stringify(payload));
      toast.success('Default commission split saved! All new projects will now default to this split.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save default commission split');
    } finally {
      setSavingDefault(false);
    }
  };

  const projectOptions: SelectOption<string>[] = [
    { value: 'default_template', label: 'Default Split (Template for New Projects)' },
    ...projects.map((p) => ({
      value: String(p._id || p.id),
      label: `${p.projectName || p.title} (₹${Number(p.projectValue || p.totalAmount || 0).toLocaleString('en-IN')})`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F] flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-[#FF5A1F]" />
            <span>Commission Split Hub</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure the default commission split for all new projects, or customize splits for existing projects.
          </p>
        </div>
      </div>

      {/* Commission Configuration Card */}
      <div className="bg-[#08090d] border border-white/[0.08] rounded-2xl p-5 md:p-6 space-y-6 shadow-xl">
        {/* Project Selector & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                Target Project / Template
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-64 sm:w-80">
                  <CustomSelect
                    value={selectedProjectId}
                    onChange={(val) => handleSelectChange(val)}
                    options={projectOptions}
                    placeholder="Select Target Project"
                  />
                </div>

                {currentProject && (
                  <Link
                    to={`/admin/projects/${currentProject._id || currentProject.id}`}
                    className="text-[11px] text-[#FF5A1F] hover:underline flex items-center gap-1 font-medium ml-1"
                    title="View Project Details"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Show real project value only when a project is selected */}
            {currentProject && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-xs text-zinc-400 font-medium">Project Value:</span>
                <span className="text-xs font-mono font-bold text-white">{formatINR(projectBudget)}</span>
              </div>
            )}

            {/* Actions: Save as Default & Save for Project */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSaveAsDefault}
                disabled={savingDefault || !isStrict100}
                title="Save these percentages as the default template for all future new projects"
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer border ${
                  isStrict100
                    ? selectedProjectId === 'default_template'
                      ? 'bg-[#FF5A1F] hover:bg-[#e04810] text-white border-transparent shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.1] hover:border-[#FF5A1F]/50'
                    : 'bg-white/[0.02] text-zinc-500 border-transparent cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingDefault ? 'Saving Default...' : 'Save as Default for New Projects'}</span>
              </button>

              {currentProject && (
                <button
                  type="button"
                  onClick={handleSaveCommission}
                  disabled={saving || !isStrict100}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isStrict100
                      ? 'bg-[#FF5A1F] hover:bg-[#e04810] text-white'
                      : 'bg-white/10 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : `Save for ${currentProject?.projectName || 'Project'}`}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 100% Sum Verification Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0d12] border border-white/[0.06]">
          <div className="flex items-center gap-2">
            {isStrict100 ? (
              <CheckCircle2 className="w-4 h-4 text-[#FF5A1F] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span className="text-xs text-zinc-300">
              Split Total: <strong className={isStrict100 ? 'text-white font-mono font-bold' : 'text-zinc-400 font-mono'}>{totalSplitPercent.toFixed(1)}%</strong>
              {isStrict100 ? ' (100% Allocation)' : ' (Must equal exactly 100.0%)'}
            </span>
          </div>
          {currentProject ? (
            <span className="text-[11px] font-mono text-zinc-400">
              Project Value: <strong className="text-white font-bold">{formatINR(projectBudget)}</strong>
            </span>
          ) : (
            <span className="text-[11px] font-mono text-zinc-400">
              Target: <strong className="text-white font-medium">New Projects Default Template</strong>
            </span>
          )}
        </div>

        {/* Proportional Segmented Split Bar */}
        <div className="pt-1">
          <CommissionBar
            broker={splits.broker}
            employee={splits.employee}
            officeExpense={splits.officeExpense}
            adminShare={splits.adminShare}
            settlementReserve={splits.settlementReserve}
            totalAmount={currentProject ? projectBudget : undefined}
            showLegend={false}
            size="md"
          />
        </div>

        {/* 5 Interactive Allocation Tiers (Minimal Orange, White, Zinc) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          {[
            { key: 'employee', label: 'Employee Pool', icon: Users, dotColor: 'bg-[#FF5A1F]', sliderClass: 'accent-[#FF5A1F]' },
            { key: 'adminShare', label: 'Admin Share', icon: Briefcase, dotColor: 'bg-white', sliderClass: 'accent-[#FF5A1F]' },
            { key: 'officeExpense', label: 'Office & Debt', icon: Building2, dotColor: 'bg-zinc-300', sliderClass: 'accent-[#FF5A1F]' },
            { key: 'broker', label: 'Broker Fee', icon: Handshake, dotColor: 'bg-zinc-400', sliderClass: 'accent-[#FF5A1F]' },
            { key: 'settlementReserve', label: 'Settlement Reserve', icon: ShieldCheck, dotColor: 'bg-zinc-500', sliderClass: 'accent-[#FF5A1F]' },
          ].map((field) => {
            const splitPct = (splits as any)[field.key];
            const netAmount = currentProject ? (projectBudget * splitPct) / 100 : 0;
            const Icon = field.icon;

            return (
              <div
                key={field.key}
                className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] space-y-3 hover:border-white/15 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-zinc-300 font-semibold text-xs truncate">{field.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={splitPct}
                        onChange={(e) =>
                          setSplits({ ...splits, [field.key]: Number(e.target.value) })
                        }
                        className="w-14 px-1.5 py-0.5 rounded bg-black/50 border border-white/15 text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-[#FF5A1F]"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono">%</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={splitPct}
                    onChange={(e) =>
                      setSplits({ ...splits, [field.key]: Number(e.target.value) })
                    }
                    className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer ${field.sliderClass}`}
                  />
                </div>

                {currentProject && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">
                      Project Allocation
                    </span>
                    <div className="text-sm font-mono font-bold text-white mt-0.5">
                      {formatINR(netAmount)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ALL PROJECTS COMMISSION MATRIX TABLE */}
      <div className="bg-[#08090d] border border-white/[0.08] rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#FF5A1F]" />
              <span>Project Commission Split Matrix</span>
            </h2>
          
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 rounded-lg">
            {projects.length} Total Projects
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase">
                <th className="py-3 px-4 font-semibold">Project</th>
                <th className="py-3 px-4 font-semibold">Contract Value</th>
                <th className="py-3 px-4 font-semibold text-[#FF5A1F]">Team Share</th>
                <th className="py-3 px-4 font-semibold text-white">Admin Share</th>
                <th className="py-3 px-4 font-semibold text-zinc-300">Office Expense</th>
                <th className="py-3 px-4 font-semibold text-zinc-400">Broker Fee</th>
                <th className="py-3 px-4 font-semibold text-zinc-500">Reserve Fund</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-mono">
                    Loading projects...
                  </td>
                </tr>
              ) : projects.length > 0 ? (
                projects.map((p) => {
                  const comm = p.commission || {};
                  const val = Number(p.projectValue ?? p.totalAmount ?? 0);
                  const isSelected = (p._id || p.id) === selectedProjectId;

                  const empPct = comm.employeePercent ?? comm.employeePercentage ?? 40;
                  const admPct = comm.adminPercent ?? comm.adminSharePercentage ?? 35;
                  const offPct = comm.officePercent ?? comm.officeExpensePercentage ?? 10;
                  const brkPct = comm.brokerPercent ?? comm.brokerPercentage ?? 10;
                  const resPct = comm.settlementPercent ?? comm.settlementReservePercentage ?? 5;

                  const empAmt = (val * empPct) / 100;
                  const admAmt = (val * admPct) / 100;

                  return (
                    <tr
                      key={p._id || p.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-[#FF5A1F]/10 border-l-2 border-l-[#FF5A1F]'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-sm">
                          {p.projectName || p.title}
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {p.clientId?.companyName || p.clientId?.name || 'Client'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                        {formatINR(val)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#FF5A1F] text-xs">
                          {empPct}%
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 block">
                          {formatINR(empAmt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs">
                          {admPct}%
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 block">
                          {formatINR(admAmt)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300 text-xs">
                        {offPct}%
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400 text-xs">
                        {brkPct}%
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500 text-xs">
                        {resPct}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => selectProject(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FF5A1F] text-white font-semibold shadow-sm'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10'
                          }`}
                        >
                          {isSelected ? 'Editing' : 'Edit Split'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-mono">
                    No projects found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
