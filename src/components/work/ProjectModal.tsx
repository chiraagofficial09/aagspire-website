import React, { useState, useEffect } from 'react';
import { X, Users, Sliders, CheckCircle2, AlertTriangle, Star, Plus, Minus } from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { useToast } from './Toast';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { MultiSelect } from './MultiSelect';

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: any | null;
  clients: any[];
  employees: any[];
  onSuccess: (project?: any) => void;
  onClientAdded?: (client: any) => void;
  defaultClientId?: string;
  disableClientSelect?: boolean;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  project = null,
  clients,
  employees,
  onSuccess,
  onClientAdded,
  defaultClientId,
  disableClientSelect = false,
}) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [isDeductionOpen, setIsDeductionOpen] = useState(false);
  const [localClients, setLocalClients] = useState<any[]>(clients || []);

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showMoreClientFields, setShowMoreClientFields] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
  });

  useEffect(() => {
    setLocalClients(clients || []);
  }, [clients]);

  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    totalAmount: '',
    productionCost: '',
    productionCostNotes: '',
    assignedEmployees: [] as string[],
    startDate: '',
    endDate: '',
    status: 'start_process',
    description: '',
  });

  const [commissionSplit, setCommissionSplit] = useState({
    brokerPercent: 10,
    employeePercent: 40,
    officePercent: 10,
    adminPercent: 35,
    settlementPercent: 5,
  });

  const [savedNonStarSplit, setSavedNonStarSplit] = useState(commissionSplit);

  const hasStarEmployee = formData.assignedEmployees.some((empId: string) => {
    const emp = employees.find((e) => (e._id || e.id) === empId);
    return Boolean(emp?.isStar);
  });

  const handleAssignedEmployeesChange = (vals: string[]) => {
    const starSelected = vals.some((empId: string) => {
      const emp = employees.find((e) => (e._id || e.id) === empId);
      return Boolean(emp?.isStar);
    });

    if (vals.length === 0) {
      if (!hasStarEmployee && formData.assignedEmployees.length > 0) {
        setSavedNonStarSplit(commissionSplit);
      }
      setCommissionSplit({
        brokerPercent: 0,
        employeePercent: 0,
        officePercent: 0,
        adminPercent: 100,
        settlementPercent: 0,
      });
    } else if (starSelected) {
      if (!hasStarEmployee && formData.assignedEmployees.length > 0) {
        setSavedNonStarSplit(commissionSplit);
      }
      setCommissionSplit({
        brokerPercent: 0,
        employeePercent: 0,
        officePercent: 0,
        adminPercent: 100,
        settlementPercent: 0,
      });
    } else {
      setCommissionSplit(savedNonStarSplit || {
        brokerPercent: 10,
        employeePercent: 40,
        officePercent: 10,
        adminPercent: 35,
        settlementPercent: 5,
      });
    }

    setFormData((prev) => ({ ...prev, assignedEmployees: vals }));
  };

  useEffect(() => {
    if (!isOpen) return;

    if (project) {
      const clientId =
        typeof project.clientId === 'object' && project.clientId?._id
          ? project.clientId._id
          : typeof project.clientId === 'string'
          ? project.clientId
          : '';

      const assignedEmployees = (project.assignedEmployees || []).map((e: any) =>
        typeof e === 'object' && e?._id ? e._id : String(e)
      );

      const startDate = project.startDate
        ? new Date(project.startDate).toISOString().slice(0, 10)
        : '';

      const endDate = project.deadline
        ? new Date(project.deadline).toISOString().slice(0, 10)
        : project.endDate
        ? new Date(project.endDate).toISOString().slice(0, 10)
        : '';

      const val = project.projectValue ?? project.totalAmount ?? '';
      const prodCostVal = project.productionCost !== undefined && project.productionCost !== null && Number(project.productionCost) > 0
        ? String(project.productionCost)
        : '';
      const prodNotes = project.productionCostNotes || '';

      setIsDeductionOpen(Boolean(prodCostVal && Number(prodCostVal) > 0));

      setFormData({
        title: project.projectName || project.title || '',
        clientId,
        totalAmount: val !== '' && val !== null && val !== undefined ? String(val) : '',
        productionCost: prodCostVal,
        productionCostNotes: prodNotes,
        assignedEmployees,
        startDate,
        endDate,
        status: project.status || 'start_process',
        description: project.description || '',
      });

      const starSelected = assignedEmployees.some((empId: string) => {
        const emp = employees.find((e) => (e._id || e.id) === empId);
        return Boolean(emp?.isStar);
      });

      if (assignedEmployees.length === 0 || starSelected) {
        setCommissionSplit({
          brokerPercent: 0,
          employeePercent: 0,
          officePercent: 0,
          adminPercent: 100,
          settlementPercent: 0,
        });
      } else {
        const comm = project.commission || {};
        const loadedSplit = {
          brokerPercent: Number(comm.brokerPercent ?? comm.brokerPercentage ?? 10),
          employeePercent: Number(comm.employeePercent ?? comm.employeePercentage ?? 40),
          officePercent: Number(comm.officePercent ?? comm.officeExpensePercentage ?? 10),
          adminPercent: Number(comm.adminPercent ?? comm.adminSharePercentage ?? 35),
          settlementPercent: Number(comm.settlementPercent ?? comm.settlementReservePercentage ?? 5),
        };
        setCommissionSplit(loadedSplit);
        setSavedNonStarSplit(loadedSplit);
      }
    } else {
      setIsDeductionOpen(false);
      setFormData({
        title: '',
        clientId: defaultClientId || (clients && clients.length > 0 ? (clients[0]?._id || clients[0]?.id || '') : ''),
        totalAmount: '',
        productionCost: '',
        productionCostNotes: '',
        assignedEmployees: [],
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        status: 'start_process',
        description: '',
      });

      // No employees assigned initially: 100% Admin
      setCommissionSplit({
        brokerPercent: 0,
        employeePercent: 0,
        officePercent: 0,
        adminPercent: 100,
        settlementPercent: 0,
      });

      // 1. Instant load presets into savedNonStarSplit from local storage
      const cached = localStorage.getItem('default_project_commission_split');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setSavedNonStarSplit({
            brokerPercent: Number(parsed.brokerPercent ?? parsed.broker ?? 10),
            employeePercent: Number(parsed.employeePercent ?? parsed.employee ?? 40),
            officePercent: Number(parsed.officePercent ?? parsed.officeExpense ?? 10),
            adminPercent: Number(parsed.adminPercent ?? parsed.adminShare ?? 35),
            settlementPercent: Number(parsed.settlementPercent ?? parsed.settlementReserve ?? 5),
          });
        } catch (_) {
          setSavedNonStarSplit({ brokerPercent: 10, employeePercent: 40, officePercent: 10, adminPercent: 35, settlementPercent: 5 });
        }
      } else {
        setSavedNonStarSplit({ brokerPercent: 10, employeePercent: 40, officePercent: 10, adminPercent: 35, settlementPercent: 5 });
      }

      // 2. Fetch server default preset to ensure perfect synchronization
      api.get('/admin/commissions/presets/default')
        .then((res) => {
          if (res.data?.success && res.data?.preset) {
            const p = res.data.preset;
            const updated = {
              brokerPercent: Number(p.brokerPercent ?? 10),
              employeePercent: Number(p.employeePercent ?? 40),
              officePercent: Number(p.officePercent ?? 10),
              adminPercent: Number(p.adminPercent ?? 35),
              settlementPercent: Number(p.settlementPercent ?? 5),
            };
            setSavedNonStarSplit(updated);
            localStorage.setItem('default_project_commission_split', JSON.stringify(updated));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, project, clients, defaultClientId]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!formData.clientId) {
      toast.error('Please select a client');
      return;
    }

    const is100Admin = hasStarEmployee || formData.assignedEmployees.length === 0;
    const splitToUse = is100Admin
      ? {
          brokerPercent: 0,
          employeePercent: 0,
          officePercent: 0,
          adminPercent: 100,
          settlementPercent: 0,
        }
      : {
          brokerPercent: Number(commissionSplit.brokerPercent),
          employeePercent: Number(commissionSplit.employeePercent),
          officePercent: Number(commissionSplit.officePercent),
          adminPercent: Number(commissionSplit.adminPercent),
          settlementPercent: Number(commissionSplit.settlementPercent),
        };

    const splitSum =
      Number(splitToUse.brokerPercent) +
      Number(splitToUse.employeePercent) +
      Number(splitToUse.officePercent) +
      Number(splitToUse.adminPercent) +
      Number(splitToUse.settlementPercent);

    if (Math.abs(splitSum - 100) > 0.01) {
      toast.warning(`Commission split must equal 100.0%. Current sum: ${splitSum.toFixed(1)}%`);
      return;
    }

    try {
      setSubmitting(true);
      const grossVal = Number(formData.totalAmount) || 0;
      const prodCostVal = isDeductionOpen ? (Number(formData.productionCost) || 0) : 0;

      const payload = {
        projectName: formData.title.trim(),
        title: formData.title.trim(),
        clientId: formData.clientId,
        totalAmount: grossVal,
        projectValue: grossVal,
        productionCost: prodCostVal,
        productionCostNotes: isDeductionOpen && formData.productionCostNotes.trim() ? formData.productionCostNotes.trim() : undefined,
        discountPercent: 0,
        discountAmount: 0,
        assignedEmployees: formData.assignedEmployees,
        startDate: formData.startDate || undefined,
        deadline: formData.endDate || undefined,
        endDate: formData.endDate || undefined,
        status: formData.status,
        description: formData.description.trim(),
        commissionSplit: splitToUse,
      };

      if (project && project._id) {
        const res = await api.patch(`/admin/projects/${project._id}`, payload);
        toast.success('Project updated successfully');
        onSuccess(res.data.project || res.data.data || res.data);
      } else {
        const res = await api.post('/admin/projects', payload);
        // Persist used split so next added projects automatically default to this split
        localStorage.setItem(
          'default_project_commission_split',
          JSON.stringify({
            brokerPercent: Number(commissionSplit.brokerPercent),
            employeePercent: Number(commissionSplit.employeePercent),
            officePercent: Number(commissionSplit.officePercent),
            adminPercent: Number(commissionSplit.adminPercent),
            settlementPercent: Number(commissionSplit.settlementPercent),
          })
        );
        toast.success('Project created and assigned successfully');
        onSuccess(res.data.project || res.data.data || res.data);
      }

      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name.trim()) {
      toast.error('Client / Business name is required');
      return;
    }
    if (!newClientForm.phone.trim()) {
      toast.error('Contact Number is required');
      return;
    }
    try {
      setIsCreatingClient(true);
      const payload = {
        name: newClientForm.name.trim(),
        companyName: newClientForm.name.trim(),
        contactPerson: newClientForm.contactPerson.trim() || undefined,
        phone: newClientForm.phone.trim(),
        email: newClientForm.email.trim() || undefined,
        gstNumber: newClientForm.gstNumber.trim() || undefined,
        address: newClientForm.address.trim() || undefined,
      };
      const res = await api.post('/admin/clients', payload);
      const createdClient = res.data.client || res.data.data;

      // Update local clients list
      setLocalClients((prev) => [createdClient, ...prev]);
      // Immediately select newly created client
      setFormData((prev) => ({ ...prev, clientId: createdClient._id }));

      if (onClientAdded) {
        onClientAdded(createdClient);
      }

      toast.success(`Client "${createdClient.companyName || createdClient.name}" created and selected!`);
      setIsAddClientOpen(false);
      setNewClientForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstNumber: '',
        address: '',
      });
      setShowMoreClientFields(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create client');
    } finally {
      setIsCreatingClient(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-5 sm:p-8 space-y-5 text-white text-xs my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="font-bold text-base tracking-tight text-white">
              {project ? 'Edit Project' : 'New Project'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium">Project Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Jyotnar Brand Identity"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Client *</label>
              <CustomSelect
                value={formData.clientId}
                onChange={(val) => setFormData({ ...formData, clientId: val })}
                placeholder="Select client"
                options={localClients.map((c) => ({
                  value: c._id || c.id,
                  label: c.companyName || c.name || 'Client',
                }))}
                actionItem={
                  !disableClientSelect
                    ? {
                        label: 'Add New Client',
                        onClick: () => setIsAddClientOpen(true),
                      }
                    : undefined
                }
                disabled={disableClientSelect}
                usePortal={false}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-zinc-400 font-medium">Contract Value (₹) *</label>
              </div>
              <div className="flex items-stretch rounded-xl overflow-hidden border border-white/[0.08] focus-within:border-[#FF5A1F] transition-all bg-[#12131a]">
                <input
                  type="number"
                  required
                  placeholder="e.g. 450"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="flex-1 bg-transparent px-3.5 py-2.5 text-white font-mono placeholder-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (isDeductionOpen) {
                      setIsDeductionOpen(false);
                      setFormData((prev) => ({ ...prev, productionCost: '', productionCostNotes: '' }));
                    } else {
                      setIsDeductionOpen(true);
                    }
                  }}
                  title={isDeductionOpen ? 'Remove Material/Production Deduction' : 'Add Material / Production Deduction (Printing Charge, Frame, etc.)'}
                  className="px-3.5 flex items-center justify-center transition-colors cursor-pointer border-l border-white/[0.08] font-bold bg-[#FF5A1F] hover:bg-[#e04810] text-white"
                >
                  <Plus className={`w-4 h-4 transition-transform duration-200 ${isDeductionOpen ? 'rotate-45' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Material & Production Deduction Panel (e.g. Printing + Frame) */}
          {isDeductionOpen && (() => {
            const cVal = Number(formData.totalAmount) || 0;
            const pCost = Number(formData.productionCost) || 0;
            const netDesign = Math.max(0, cVal - pCost);
            return (
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#FF5A1F]/10 via-[#0a0b10] to-[#FF5A1F]/5 border border-[#FF5A1F]/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#FF5A1F]/20 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F]">
                      <Minus className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-white text-xs">Material / Production Deduction</span>
                      <span className="text-[11px] text-zinc-400 block sm:inline sm:ml-2">
                        (Printing Charge, Frame, Banner, etc.)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeductionOpen(false);
                      setFormData((prev) => ({ ...prev, productionCost: '', productionCostNotes: '' }));
                    }}
                    className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Remove deduction
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 text-[11px] font-medium">
                      Deduction Amount (₹) *
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 300"
                      value={formData.productionCost}
                      onChange={(e) => setFormData({ ...formData, productionCost: e.target.value })}
                      className="w-full px-3 py-2 bg-[#12131a] border border-white/[0.1] rounded-lg text-white font-mono text-xs focus:border-[#FF5A1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 text-[11px] font-medium">
                      Deduction Reason / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Printing Charge + Frame"
                      value={formData.productionCostNotes}
                      onChange={(e) => setFormData({ ...formData, productionCostNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-[#12131a] border border-white/[0.1] rounded-lg text-white text-xs focus:border-[#FF5A1F] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Real-time Math Calculation Strip */}
                <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono flex-wrap">
                    <span className="text-zinc-400">
                      Total: <strong className="text-white">{formatINR(cVal)}</strong>
                    </span>
                    <span className="text-zinc-600">-</span>
                    <span className="text-rose-400 font-semibold">
                      Deduction: <strong className="text-rose-300">-{formatINR(pCost)}</strong>
                    </span>
                    <span className="text-zinc-600">=</span>
                    <span className="text-[#FF5A1F] font-bold">
                      Design Price: <strong className="text-white underline decoration-[#FF5A1F]">{formatINR(netDesign)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Assigned Employees Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>Assign Team / Staff</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                Select one or more team members
              </span>
            </div>
            <MultiSelect
              values={formData.assignedEmployees}
              onChange={handleAssignedEmployeesChange}
              placeholder="Select team members to assign..."
              options={employees.map((emp) => ({
                value: emp._id,
                label: emp.fullName || emp.name,
                sublabel: emp.employeeCode ? `(${emp.employeeCode})` : undefined,
                isStar: Boolean(emp.isStar),
              }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Start Date</label>
              <CustomDatePicker
                value={formData.startDate}
                onChange={(val) => setFormData({ ...formData, startDate: val })}
                placeholder="Select start date"
                usePortal={false}
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Target End Date</label>
              <CustomDatePicker
                value={formData.endDate}
                onChange={(val) => setFormData({ ...formData, endDate: val })}
                placeholder="Select end date"
                usePortal={false}
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Status</label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
                options={[
                  { value: 'start_process', label: 'Start Process' },
                  { value: 'in_process', label: 'In Process' },
                  { value: 'in_changes', label: 'In Changes' },
                  { value: 'delivered', label: 'Delivered' },
                ]}
                usePortal={false}
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium">Description / Scope</label>
            <textarea
              rows={2}
              placeholder="Creative deliverables, production guidelines..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none resize-none"
            />
          </div>

          {/* Project-Specific 5-Tier Commission Split Configuration, Star Notice, or No Employees Notice */}
          {hasStarEmployee ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#FF5A1F]/10 via-[#0a0b10] to-[#FF5A1F]/5 border border-[#FF5A1F]/25 text-xs animate-fade-in space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FF5A1F]/20 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F]">
                    <Star className="w-3.5 h-3.5 fill-[#FF5A1F] text-[#FF5A1F]" />
                  </div>
                  <div>
                    <span className="font-semibold text-white text-xs">Star Team Member Assigned</span>
                    <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FF5A1F]/20 text-[#FF5A1F] font-bold border border-[#FF5A1F]/30">
                      100% Admin Share
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[#FF5A1F] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>100.0% / 100%</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 pl-8">
                Star team member selected. The commission split box is hidden, and 100% project share is assigned directly to Admin.
              </p>
            </div>
          ) : formData.assignedEmployees.length === 0 ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#FF5A1F]/10 via-[#0a0b10] to-[#FF5A1F]/5 border border-[#FF5A1F]/25 text-xs animate-fade-in space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FF5A1F]/20 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F]">
                    <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  </div>
                  <div>
                    <span className="font-semibold text-white text-xs">No Team Member Assigned</span>
                    <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FF5A1F]/20 text-[#FF5A1F] font-bold border border-[#FF5A1F]/30">
                      100% Admin Share
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[#FF5A1F] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>100.0% / 100%</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 pl-8">
                No team member assigned to this project. The commission split box is hidden, and 100% project share is assigned directly to Admin.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#07080c] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span className="font-semibold text-white text-xs">Project Commission Split (5-Tier)</span>
                </div>
                {(() => {
                  const curSum =
                    Number(commissionSplit.brokerPercent) +
                    Number(commissionSplit.employeePercent) +
                    Number(commissionSplit.officePercent) +
                    Number(commissionSplit.adminPercent) +
                    Number(commissionSplit.settlementPercent);
                  const isExact = Math.abs(curSum - 100) < 0.01;
                  return (
                    <span className={`text-[11px] font-mono flex items-center gap-1 ${isExact ? 'text-white font-bold' : 'text-zinc-400'}`}>
                      {isExact ? <CheckCircle2 className="w-3 h-3 text-[#FF5A1F]" /> : <AlertTriangle className="w-3 h-3 text-zinc-500" />}
                      <span>{curSum.toFixed(1)}% / 100%</span>
                    </span>
                  );
                })()}
              </div>

              {(() => {
                const cVal = Number(formData.totalAmount) || 0;
                const pCost = isDeductionOpen ? (Number(formData.productionCost) || 0) : 0;
                const netDesign = Math.max(0, cVal - pCost);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <label className="text-zinc-400 block text-[10px] mb-1 truncate">Employee %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={commissionSplit.employeePercent}
                        onChange={(e) =>
                          setCommissionSplit({ ...commissionSplit, employeePercent: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 bg-[#12131a] border border-white/[0.08] rounded-lg text-white font-mono text-xs focus:border-[#FF5A1F] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#FF5A1F] font-mono block mt-0.5 font-bold">
                        {formatINR((netDesign * (Number(commissionSplit.employeePercent) || 0)) / 100)}
                      </span>
                      {isDeductionOpen && pCost > 0 && (
                        <span className="text-[9px] text-zinc-500 font-mono block">
                          on {formatINR(netDesign)}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-zinc-400 block text-[10px] mb-1 truncate">Admin %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={commissionSplit.adminPercent}
                        onChange={(e) =>
                          setCommissionSplit({ ...commissionSplit, adminPercent: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 bg-[#12131a] border border-white/[0.08] rounded-lg text-white font-mono text-xs focus:border-[#FF5A1F] focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        {formatINR((netDesign * (Number(commissionSplit.adminPercent) || 0)) / 100)}
                      </span>
                    </div>

                    <div>
                      <label className="text-zinc-400 block text-[10px] mb-1 truncate">Office %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={commissionSplit.officePercent}
                        onChange={(e) =>
                          setCommissionSplit({ ...commissionSplit, officePercent: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 bg-[#12131a] border border-white/[0.08] rounded-lg text-white font-mono text-xs focus:border-[#FF5A1F] focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        {formatINR((netDesign * (Number(commissionSplit.officePercent) || 0)) / 100)}
                      </span>
                    </div>

                    <div>
                      <label className="text-zinc-400 block text-[10px] mb-1 truncate">Broker %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={commissionSplit.brokerPercent}
                        onChange={(e) =>
                          setCommissionSplit({ ...commissionSplit, brokerPercent: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 bg-[#12131a] border border-white/[0.08] rounded-lg text-white font-mono text-xs focus:border-[#FF5A1F] focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        {formatINR((netDesign * (Number(commissionSplit.brokerPercent) || 0)) / 100)}
                      </span>
                    </div>

                    <div>
                      <label className="text-zinc-400 block text-[10px] mb-1 truncate">Reserve %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={commissionSplit.settlementPercent}
                        onChange={(e) =>
                          setCommissionSplit({ ...commissionSplit, settlementPercent: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1.5 bg-[#12131a] border border-white/[0.08] rounded-lg text-white font-mono text-xs focus:border-[#FF5A1F] focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        {formatINR((netDesign * (Number(commissionSplit.settlementPercent) || 0)) / 100)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
            >
              {submitting ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Add Client Modal Overlay */}
      {isAddClientOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0d0e14] border border-[#FF5A1F]/30 rounded-2xl p-5 sm:p-6 space-y-4 text-white text-xs shadow-2xl shadow-[#FF5A1F]/10">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Add New Client</h4>
                  <p className="text-[11px] text-zinc-400">Quickly create and auto-select client</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClientOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateClient} className="space-y-3">
              <div>
                <label className="text-zinc-300 block mb-1 font-medium">
                  Client / Business Name <span className="text-[#FF5A1F]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Acme Studio or Rajesh Sharma"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#14151f] border border-white/[0.1] rounded-xl text-white placeholder-zinc-500 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={newClientForm.contactPerson}
                    onChange={(e) => setNewClientForm({ ...newClientForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-[#14151f] border border-white/[0.1] rounded-xl text-white placeholder-zinc-500 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1 font-medium">
                    Contact Number <span className="text-[#FF5A1F]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#14151f] border border-white/[0.1] rounded-xl text-white placeholder-zinc-500 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Optional More Details Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreClientFields((prev) => !prev)}
                  className="text-[11px] text-[#FF5A1F] hover:text-[#ff7442] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className={`w-3 h-3 transition-transform duration-200 ${showMoreClientFields ? 'rotate-45' : ''}`} />
                  <span>{showMoreClientFields ? 'Hide extra details' : 'More details (Email, GST, Address)'}</span>
                </button>

                {showMoreClientFields && (
                  <div className="mt-2.5 space-y-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-fade-in">
                    <div>
                      <label className="text-zinc-400 block mb-1 text-[11px]">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. contact@acme.com"
                        value={newClientForm.email}
                        onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14151f] border border-white/[0.1] rounded-xl text-white placeholder-zinc-500 focus:border-[#FF5A1F] focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1 text-[11px]">GST / Tax ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 24AAAAA0000A1Z5"
                        value={newClientForm.gstNumber}
                        onChange={(e) => setNewClientForm({ ...newClientForm, gstNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14151f] border border-white/[0.1] rounded-xl text-white placeholder-zinc-500 focus:border-[#FF5A1F] focus:outline-none text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1 text-[11px]">Address / City</label>
                      <input
                        type="text"
                        placeholder="e.g. Surat, Gujarat"
                        value={newClientForm.address}
                        onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14151f] border border-white/[0.1] rounded-xl text-white placeholder-zinc-500 focus:border-[#FF5A1F] focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddClientOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient || !newClientForm.name.trim() || !newClientForm.phone.trim()}
                  className="px-4 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#FF5A1F]/20"
                >
                  {isCreatingClient ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save & Select Client</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
