import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Layers,
  Check,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from './Toast';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { MultiSelect } from './MultiSelect';

export interface BulkProjectRow {
  id: string;
  projectName: string;
  projectValue: string;
  assignedEmployees: string[];
  startDate?: string;
  deadline?: string;
  status?: string;
  productionCost?: string;
  productionCostNotes?: string;
  description?: string;
}

export interface BulkCreateProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: any[];
  employees: any[];
  onSuccess: (createdProjects: any[]) => void;
  defaultClientId?: string;
  onSwitchToSingle?: () => void;
}

const statusOptions = [
  { value: 'start_process', label: 'Start Process' },
  { value: 'in_process', label: 'In Process' },
  { value: 'in_changes', label: 'In Changes' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
];

export const BulkCreateProjectsModal: React.FC<BulkCreateProjectsModalProps> = ({
  isOpen,
  onClose,
  clients = [],
  employees = [],
  onSuccess,
  defaultClientId,
  onSwitchToSingle,
}) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Field Routing: Control whether each field is COMMON (shared) or PER PROJECT (separate rows)
  const [isCommonStaff, setIsCommonStaff] = useState<boolean>(false);
  const [isCommonDeadline, setIsCommonDeadline] = useState<boolean>(true);
  const [isCommonStatus, setIsCommonStatus] = useState<boolean>(true);
  const [isCommonStartDate, setIsCommonStartDate] = useState<boolean>(true);
  const [isCommonValue, setIsCommonValue] = useState<boolean>(false);
  const [isCommonDeduction, setIsCommonDeduction] = useState<boolean>(false);
  const [isCommonDescription, setIsCommonDescription] = useState<boolean>(false);

  // Values for Common fields
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return defaultClientId || (clients.length > 0 ? clients[0]._id || clients[0].id || '' : '');
  });
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [deadline, setDeadline] = useState<string>('');
  const [defaultStatus, setDefaultStatus] = useState<string>('start_process');
  const [commonStaff, setCommonStaff] = useState<string[]>([]);
  const [commonValue, setCommonValue] = useState<string>('5000');
  const [commonDeduction, setCommonDeduction] = useState<string>('');
  const [commonDeductionNotes, setCommonDeductionNotes] = useState<string>('');
  const [commonDescription, setCommonDescription] = useState<string>('');

  // Per-project extras toggles
  const [showRowDeduction, setShowRowDeduction] = useState<boolean>(false);
  const [showRowDescription, setShowRowDescription] = useState<boolean>(false);

  // Project Rows (Right Panel)
  const [rows, setRows] = useState<BulkProjectRow[]>([
    {
      id: 'row-1',
      projectName: '',
      projectValue: '',
      assignedEmployees: [],
      startDate: '',
      deadline: '',
      status: 'start_process',
      productionCost: '',
      productionCostNotes: '',
      description: '',
    },
    {
      id: 'row-2',
      projectName: '',
      projectValue: '',
      assignedEmployees: [],
      startDate: '',
      deadline: '',
      status: 'start_process',
      productionCost: '',
      productionCostNotes: '',
      description: '',
    },
    {
      id: 'row-3',
      projectName: '',
      projectValue: '',
      assignedEmployees: [],
      startDate: '',
      deadline: '',
      status: 'start_process',
      productionCost: '',
      productionCostNotes: '',
      description: '',
    },
  ]);

  // Commission split preset
  const [commissionSplit, setCommissionSplit] = useState({
    brokerPercent: 10,
    employeePercent: 40,
    officePercent: 10,
    adminPercent: 35,
    settlementPercent: 5,
  });

  // Keep client updated if defaultClientId changes or clients loaded
  useEffect(() => {
    if (defaultClientId) {
      setSelectedClientId(defaultClientId);
    } else if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0]._id || clients[0].id || '');
    }

    try {
      const saved = localStorage.getItem('default_project_commission_split');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.adminPercent === 'number') {
          setCommissionSplit(parsed);
        }
      }
    } catch (_) {}
  }, [defaultClientId, clients]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Staff options with clean labels (no codes)
  const staffOptions = useMemo(() => {
    return employees.map((emp) => ({
      value: emp._id || emp.id,
      label: emp.fullName || emp.name,
      isStar: Boolean(emp.isStar),
    }));
  }, [employees]);

  // Financial calculations
  const totalValue = useMemo(() => {
    if (isCommonValue) {
      const cVal = Number(commonValue) || 0;
      const valid = rows.filter((r) => r.projectName.trim()).length || rows.length;
      return cVal * valid;
    }
    return rows.reduce((acc, r) => acc + (Number(r.projectValue) || 0), 0);
  }, [rows, isCommonValue, commonValue]);

  // Row operations
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        projectName: '',
        projectValue: isCommonValue ? commonValue : '',
        assignedEmployees: isCommonStaff ? [...commonStaff] : [],
        startDate: '',
        deadline: '',
        status: defaultStatus || 'start_process',
        productionCost: '',
        productionCostNotes: '',
        description: '',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      toast.warning('At least one project is required');
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id: string, field: keyof BulkProjectRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Keyboard Enter handler
  const handleKeyDownInput = (
    e: React.KeyboardEvent,
    index: number,
    isTrigger: boolean = true
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isTrigger && index === rows.length - 1) {
        handleAddRow();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast.error('Client is required');
      return;
    }

    const validRows = rows.filter((r) => r.projectName.trim());

    if (validRows.length === 0) {
      toast.error('Please enter at least one project name');
      return;
    }

    if (isCommonValue) {
      const cVal = Number(commonValue);
      if (isNaN(cVal) || cVal < 0) {
        toast.error('Common project value must be a valid number >= 0');
        return;
      }
    }

    // Validation
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      if (!r.projectName.trim()) {
        toast.error(`Project #${i + 1} name is required`);
        return;
      }
      if (!isCommonValue) {
        const val = Number(r.projectValue);
        if (isNaN(val) || val < 0) {
          toast.error(`Project #${i + 1} value must be a valid number >= 0`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        clientId: selectedClientId,
        startDate: isCommonStartDate ? (startDate || undefined) : undefined,
        deadline: isCommonDeadline ? (deadline || undefined) : undefined,
        status: isCommonStatus ? (defaultStatus || 'start_process') : 'start_process',
        defaultCommissionSplit: commissionSplit,
        projects: validRows.map((r) => {
          const val = isCommonValue
            ? Number(commonValue) || 0
            : Number(r.projectValue) || 0;

          const assigned = isCommonStaff
            ? commonStaff
            : (r.assignedEmployees || []);

          const rowDeadline = isCommonDeadline
            ? (deadline || undefined)
            : (r.deadline || deadline || undefined);

          const rowStartDate = isCommonStartDate
            ? (startDate || undefined)
            : (r.startDate || startDate || undefined);

          const rowStatus = isCommonStatus
            ? (defaultStatus || 'start_process')
            : (r.status || defaultStatus || 'start_process');

          const prodCost = isCommonDeduction
            ? (Number(commonDeduction) || 0)
            : (showRowDeduction ? Number(r.productionCost) || 0 : 0);

          const prodNotes = isCommonDeduction
            ? (commonDeductionNotes?.trim() || undefined)
            : (showRowDeduction ? r.productionCostNotes?.trim() || undefined : undefined);

          const desc = isCommonDescription
            ? (commonDescription?.trim() || undefined)
            : (showRowDescription ? r.description?.trim() || undefined : undefined);

          return {
            projectName: r.projectName.trim(),
            title: r.projectName.trim(),
            projectValue: val,
            totalAmount: val,
            productionCost: prodCost > 0 ? prodCost : 0,
            productionCostNotes: prodNotes,
            assignedEmployees: assigned || [],
            description: desc,
            startDate: rowStartDate,
            deadline: rowDeadline,
            status: rowStatus,
          };
        }),
      };

      const res = await api.post('/admin/projects/bulk-create', payload);

      toast.success(`${validRows.length} project(s) created successfully!`);
      const created = res.data?.projects || res.data?.data || [];
      onSuccess(created);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create projects');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const validCount = rows.filter((r) => r.projectName.trim()).length || rows.length;

  // Configuration chips: lets user instantly toggle whether any field is Common vs Per-Project
  const fieldChips = [
    {
      id: 'staff',
      label: 'Staff',
      isCommon: isCommonStaff,
      onToggle: () => setIsCommonStaff(!isCommonStaff),
    },
    {
      id: 'deadline',
      label: 'Deadline',
      isCommon: isCommonDeadline,
      onToggle: () => setIsCommonDeadline(!isCommonDeadline),
    },
    {
      id: 'status',
      label: 'Status',
      isCommon: isCommonStatus,
      onToggle: () => setIsCommonStatus(!isCommonStatus),
    },
    {
      id: 'value',
      label: 'Fixed Value',
      isCommon: isCommonValue,
      onToggle: () => setIsCommonValue(!isCommonValue),
    },
    {
      id: 'startDate',
      label: 'Start Date',
      isCommon: isCommonStartDate,
      onToggle: () => setIsCommonStartDate(!isCommonStartDate),
    },
    {
      id: 'deduction',
      label: 'Deduction',
      isCommon: isCommonDeduction,
      onToggle: () => setIsCommonDeduction(!isCommonDeduction),
    },
    {
      id: 'description',
      label: 'Description',
      isCommon: isCommonDescription,
      onToggle: () => setIsCommonDescription(!isCommonDescription),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl xl:max-w-7xl bg-[#090a10] border border-white/[0.08] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.015] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">New Project</h2>
              <p className="text-[11px] text-zinc-500">Fast batch project creation for your clients</p>
            </div>
            {onSwitchToSingle && (
              <div className="inline-flex items-center h-8 sm:h-9 p-0.5 ml-1 sm:ml-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={onSwitchToSingle}
                  className="h-full px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  Single Project
                </button>
                <button
                  type="button"
                  className="h-full px-3 rounded-lg text-xs font-semibold bg-[#FF5A1F] text-white shadow-sm transition-all cursor-default"
                >
                  Multiple Projects
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Split Body Layout */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* LEFT COLUMN: COMMON SETTINGS (Clean, Minimal & Configurable) */}
          <div className="w-full md:w-72 lg:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#0c0d14] p-5 overflow-y-auto space-y-4">
            {/* Common Settings Header & Field Selector Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  Common Settings
                </span>
                <span className="text-[10px] text-zinc-500">
                  Shared fields
                </span>
              </div>

              {/* 1-Click Field Routing Chips: Choose Common vs Per-Project */}
              <div className="flex flex-wrap gap-1.5">
                {fieldChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={chip.onToggle}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                      chip.isCommon
                        ? 'bg-[#FF5A1F]/15 border-[#FF5A1F]/40 text-[#FF5A1F]'
                        : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                    title={
                      chip.isCommon
                        ? `${chip.label} is shared for all projects (click to configure per project)`
                        : `Click to make ${chip.label} common for all projects`
                    }
                  >
                    {chip.isCommon ? (
                      <Check className="w-3 h-3 text-[#FF5A1F]" />
                    ) : (
                      <Plus className="w-3 h-3 text-zinc-500" />
                    )}
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/[0.05]" />

            {/* Active Common Input Fields (Only render what is common!) */}
            <div className="space-y-3.5">
              {/* Client * (Always common for batch) */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">
                  Client *
                </label>
                <CustomSelect
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  placeholder="Select client"
                  className="w-full"
                  usePortal={true}
                  options={clients.map((c) => ({
                    value: c._id || c.id,
                    label: c.companyName || c.name || 'Unnamed Client',
                  }))}
                />
              </div>

              {/* Staff (When common) */}
              {isCommonStaff && (
                <div className="animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 font-medium">
                      Staff (All Projects)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCommonStaff(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Set staff individually in each project row"
                    >
                      Set per row →
                    </button>
                  </div>
                  <MultiSelect
                    values={commonStaff}
                    onChange={setCommonStaff}
                    placeholder="Select staff for all"
                    options={staffOptions}
                  />
                </div>
              )}

              {/* Value (When common) */}
              {isCommonValue && (
                <div className="animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 font-medium">
                      Fixed Value (₹) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCommonValue(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Enter value individually for each project row"
                    >
                      Set per row →
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="5000"
                      value={commonValue}
                      onChange={(e) => setCommonValue(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-[#141622] border border-white/[0.08] rounded-xl text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Deadline (When common) */}
              {isCommonDeadline && (
                <div className="animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 font-medium">
                      Deadline
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCommonDeadline(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Set deadline individually in each project row"
                    >
                      Set per row →
                    </button>
                  </div>
                  <CustomDatePicker
                    value={deadline}
                    onChange={(val) => setDeadline(val)}
                    placeholder="Optional deadline"
                    usePortal={true}
                  />
                </div>
              )}

              {/* Status (When common) */}
              {isCommonStatus && (
                <div className="animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 font-medium">
                      Status
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCommonStatus(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Set status individually in each project row"
                    >
                      Set per row →
                    </button>
                  </div>
                  <CustomSelect
                    value={defaultStatus}
                    onChange={setDefaultStatus}
                    placeholder="Start Process"
                    className="w-full"
                    usePortal={true}
                    options={statusOptions}
                  />
                </div>
              )}

              {/* Start Date (When common) */}
              {isCommonStartDate && (
                <div className="animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 font-medium">
                      Start Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCommonStartDate(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Set start date individually in each project row"
                    >
                      Set per row →
                    </button>
                  </div>
                  <CustomDatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="Today"
                    usePortal={true}
                  />
                </div>
              )}

              {/* Material Deduction (When common) */}
              {isCommonDeduction && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-xs text-zinc-400 font-medium">
                      Material Deduction
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCommonDeduction(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Set per row →
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="Deduction Amount (₹)"
                    min="0"
                    value={commonDeduction}
                    onChange={(e) => setCommonDeduction(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#141622] border border-white/[0.08] rounded-xl text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]"
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={commonDeductionNotes}
                    onChange={(e) => setCommonDeductionNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#141622] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>
              )}

              {/* Description (When common) */}
              {isCommonDescription && (
                <div className="animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-400 font-medium">
                      Description
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCommonDescription(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Set per row →
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Description for all projects..."
                    value={commonDescription}
                    onChange={(e) => setCommonDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#141622] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>
              )}
            </div>

            {/* Optional Per-Row Additions (When not common) */}
            {(!isCommonDeduction || !isCommonDescription) && (
              <div className="pt-2 border-t border-white/[0.05] space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  Row-level Fields
                </span>
                {!isCommonDeduction && (
                  <button
                    type="button"
                    onClick={() => setShowRowDeduction(!showRowDeduction)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                      showRowDeduction
                        ? 'bg-white/[0.04] border-[#FF5A1F]/40 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>+ Deductions per project</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        showRowDeduction ? 'bg-[#FF5A1F]' : 'bg-zinc-600'
                      }`}
                    />
                  </button>
                )}
                {!isCommonDescription && (
                  <button
                    type="button"
                    onClick={() => setShowRowDescription(!showRowDescription)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                      showRowDescription
                        ? 'bg-white/[0.04] border-[#FF5A1F]/40 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>+ Notes per project</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        showRowDescription ? 'bg-[#FF5A1F]' : 'bg-zinc-600'
                      }`}
                    />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PROJECTS LIST */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#090a10] overflow-hidden">
            {/* Sticky Header Bar: ALWAYS visible at top right, never scrolls away */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#090a10] shrink-0 z-20">
              <div className="flex items-center gap-3">
                <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  Projects ({rows.length})
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold shadow-md shadow-[#FF5A1F]/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project</span>
              </button>
            </div>

            {/* Scrollable Table Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-5 custom-scrollbar min-h-0">
              <div className="min-w-fit space-y-2.5">
                {/* Dynamic Sticky Column Headers (Desktop) */}
                <div className="hidden sm:flex items-center gap-2.5 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider min-w-fit sticky top-0 z-10 bg-[#090a10]">
                  <span className="w-7 text-center shrink-0">#</span>
                  <span className="min-w-[200px] flex-1">Project Name *</span>
                  {!isCommonValue && <span className="w-28 shrink-0">Value (₹) *</span>}
                  {!isCommonStaff && <span className="w-44 shrink-0">Staff</span>}
                  {!isCommonDeadline && <span className="w-36 shrink-0">Deadline</span>}
                  {!isCommonStatus && <span className="w-36 shrink-0">Status</span>}
                  {!isCommonStartDate && <span className="w-36 shrink-0">Start Date</span>}
                  <span className="w-8 shrink-0 text-center" />
                </div>

                {/* Projects Rows List */}
                <div className="space-y-2">
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    style={{ zIndex: (rows.length - index) * 10 }}
                    className="p-2 sm:p-2.5 rounded-2xl bg-[#0f111a] border border-white/[0.08] hover:border-white/[0.12] transition-all space-y-2 relative group w-full min-w-fit"
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      {/* 2-Digit Index */}
                      <span className="w-7 text-center font-mono text-xs font-bold text-zinc-400 shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      {/* Project Name (Always required) */}
                      <div className="min-w-[200px] flex-1">
                        <input
                          type="text"
                          placeholder="e.g. Logo Design, Reel Editing..."
                          value={row.projectName}
                          onKeyDown={(e) => handleKeyDownInput(e, index, isCommonValue)}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'projectName', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-[#141622] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] transition-colors"
                          required
                        />
                      </div>

                      {/* Contract Value: Only shown if NOT common */}
                      {!isCommonValue && (
                        <div className="w-28 shrink-0">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono">
                              ₹
                            </span>
                            <input
                              type="number"
                              placeholder="5000"
                              min="0"
                              value={row.projectValue}
                              onKeyDown={(e) => handleKeyDownInput(e, index, true)}
                              onChange={(e) =>
                                handleUpdateRow(row.id, 'projectValue', e.target.value)
                              }
                              className="w-full pl-7 pr-3 py-2 bg-[#141622] border border-white/[0.08] rounded-xl text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] transition-colors"
                              required
                            />
                          </div>
                        </div>
                      )}

                      {/* Staff: Only shown if NOT common */}
                      {!isCommonStaff && (
                        <div className="w-44 shrink-0">
                          <MultiSelect
                            values={row.assignedEmployees || []}
                            onChange={(vals) =>
                              handleUpdateRow(row.id, 'assignedEmployees', vals)
                            }
                            placeholder="Select staff"
                            options={staffOptions}
                          />
                        </div>
                      )}

                      {/* Deadline: Only shown if NOT common */}
                      {!isCommonDeadline && (
                        <div className="w-36 shrink-0">
                          <CustomDatePicker
                            value={row.deadline || ''}
                            onChange={(val) => handleUpdateRow(row.id, 'deadline', val)}
                            placeholder="Deadline"
                            usePortal={true}
                          />
                        </div>
                      )}

                      {/* Status: Only shown if NOT common */}
                      {!isCommonStatus && (
                        <div className="w-36 shrink-0">
                          <CustomSelect
                            value={row.status || 'start_process'}
                            onChange={(val) => handleUpdateRow(row.id, 'status', val)}
                            placeholder="Status"
                            className="w-full"
                            usePortal={true}
                            options={statusOptions}
                          />
                        </div>
                      )}

                      {/* Start Date: Only shown if NOT common */}
                      {!isCommonStartDate && (
                        <div className="w-36 shrink-0">
                          <CustomDatePicker
                            value={row.startDate || ''}
                            onChange={(val) => handleUpdateRow(row.id, 'startDate', val)}
                            placeholder="Start Date"
                            usePortal={true}
                          />
                        </div>
                      )}

                      {/* Trash Action */}
                      <div className="w-8 shrink-0 flex items-center justify-center">
                        {rows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-7" />
                        )}
                      </div>
                    </div>

                    {/* Optional Per-Row Material Deduction */}
                    {!isCommonDeduction && showRowDeduction && (
                      <div className="pt-1.5 border-t border-white/[0.04] flex items-center gap-2 pl-9 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 w-44 shrink-0">
                          <span className="text-zinc-500 text-[11px] shrink-0">Deduction:</span>
                          <input
                            type="number"
                            placeholder="₹ 0"
                            min="0"
                            value={row.productionCost || ''}
                            onChange={(e) =>
                              handleUpdateRow(row.id, 'productionCost', e.target.value)
                            }
                            className="w-full px-2 py-1 bg-[#141622] border border-white/[0.08] rounded-lg text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-[#FF5A1F]"
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={row.productionCostNotes || ''}
                            onChange={(e) =>
                              handleUpdateRow(row.id, 'productionCostNotes', e.target.value)
                            }
                            className="w-full px-2.5 py-1 bg-[#141622] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5A1F]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Optional Description */}
                    {!isCommonDescription && showRowDescription && (
                      <div className="pt-1.5 border-t border-white/[0.04] pl-9 animate-in fade-in duration-150">
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={row.description || ''}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'description', e.target.value)
                          }
                          className="w-full px-2.5 py-1 bg-[#141622] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5A1F]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] bg-[#0c0d14] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-zinc-400">
              {validCount} {validCount === 1 ? 'Project' : 'Projects'}
              {` • Total: ₹${totalValue.toLocaleString('en-IN')}`}
              {isCommonStaff && commonStaff.length > 0 && ` • ${commonStaff.length} Shared Staff`}
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || rows.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-lg shadow-[#FF5A1F]/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>
                {submitting
                  ? 'Creating...'
                  : `Create ${validCount} Projects`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
