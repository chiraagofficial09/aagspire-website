import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Printer,
  CheckSquare,
  Square,
  Receipt,
  Plus,
  ArrowRight,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { FaPhoneAlt, FaRegEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { api } from '../../services/api';
import { useToast } from './Toast';
import { formatINR, parseAmount } from '../../utils/formatters';
import { CustomSelect } from './CustomSelect';

const TERMS_LIST = [
  'All prices listed are average estimates and may vary based on project complexity, scope of work, and client requirements.',
  '2 revisions are included in the base price. Additional revisions will be chargeable.',
  'A 50% deposit is required to initiate the project.',
  'The final payment is due upon project completion and client approval.',
  'Late payments may incur interest charges.',
  'Clients are responsible for providing all necessary content for the project.',
  'We offer custom packages tailored to specific client needs and budgets.',
  'If the project is canceled by the client before completion, the client will be responsible for paying fees incurred up to the date of cancellation.',
  'Upon full payment, clients will receive ownership of the final project deliverables.',
  'Project delivery timeline will be discussed and finalized before project start. Delays caused by client-side (late content, feedback) may extend the timeline.',
  'Urgent or priority projects may incur an additional 25%–50% charge depending on the deadline.',
  'All printing designs (banner, visiting card, brochure, etc.) will be delivered in print-ready formats only.',
  'In digital designs, open/editable source files (such as PSD, AI, CDR, etc.) will not be provided.',
  'Final deliverables are for intended use only. Resale or redistribution without permission is not allowed.',
  'We reserve the right to showcase completed work in our portfolio and social media unless agreed otherwise.',
  'Final files will be delivered only after 100% payment clearance.',
];

interface ClientReceiptModalProps {
  isOpen?: boolean;
  onClose: () => void;
  client: any;
  projects: any[];
  onRefreshClient?: () => void;
  initialMonth?: string;
}

export function getNextInvoiceNumber(current?: string | number, step = 1): string {
  if (current === undefined || current === null || String(current).trim() === '') {
    return '001';
  }
  const str = String(current).trim();
  const match = str.match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) {
    return `${str}-001`;
  }
  const prefix = match[1];
  const digits = match[2];
  const suffix = match[3];
  const num = parseInt(digits, 10);
  const nextNum = Math.max(0, num + step);
  const padded = String(nextNum).padStart(digits.length, '0');
  return `${prefix}${padded}${suffix}`;
}

export const ClientReceiptModal: React.FC<ClientReceiptModalProps> = ({
  isOpen = true,
  onClose,
  client,
  projects: initialProjects = [],
  onRefreshClient,
  initialMonth,
}) => {
  const toast = useToast();
  const [localProjects, setLocalProjects] = useState<any[]>(initialProjects);

  // Sync local projects with incoming projects
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setLocalProjects(initialProjects);
    }
  }, [initialProjects]);

  // Default select all deliverables on mount
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() =>
    (initialProjects || []).map((p) => p._id)
  );

  // Always default to 'select' tab when opening from "Combine Projects" so user sees checkboxes
  const [activeTab, setActiveTab] = useState<'select' | 'preview'>('select');
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [projectDiscounts, setProjectDiscounts] = useState<Record<string, number>>({});

  const handleProjectDiscountChange = (projectId: string, val: number) => {
    setProjectDiscounts((prev) => ({
      ...prev,
      [projectId]: Math.max(0, val),
    }));
  };

  // Quick inline project creation form
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectValue, setNewProjectValue] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Month-wise billing state
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const [billingMonth, setBillingMonth] = useState<string>(initialMonth || currentMonthKey);

  useEffect(() => {
    if (initialMonth) setBillingMonth(initialMonth);
  }, [initialMonth]);

  const getInitialInvoiceNo = (code?: string, lastNo?: string): string => {
    if (lastNo && lastNo.trim()) {
      return getNextInvoiceNumber(lastNo.trim(), 1);
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aagspire_next_invoice_no');
      if (saved && saved.trim()) return saved.trim();
    }
    if (!code) return '001';
    const digits = code.match(/\d+/g);
    if (digits && digits.length > 0) {
      const last = digits[digits.length - 1];
      const parsed = parseInt(last, 10);
      return !isNaN(parsed) ? String(parsed).padStart(3, '0') : last;
    }
    return '001';
  };

  const [invoiceNumber, setInvoiceNumber] = useState<string>(() =>
    getInitialInvoiceNo(client?.clientCode, client?.lastInvoiceNumber)
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  const handleSetInvoiceNumber = (val: string) => {
    setInvoiceNumber(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aagspire_next_invoice_no', val);
    }
    // Sync to MongoDB database
    api
      .post('/admin/clients/invoice-counter', { currentNumber: val })
      .catch((err) => console.error('Failed to sync invoice counter to MongoDB:', err));
  };

  const [downloading, setDownloading] = useState(false);

  // Fetch persistent invoice counter from MongoDB when modal opens
  useEffect(() => {
    let isMounted = true;
    api
      .get('/admin/clients/invoice-counter')
      .then((res) => {
        if (!isMounted) return;
        const dbRaw = res.data?.data?.currentNumber;
        const dbNum = dbRaw !== undefined ? parseInt(String(dbRaw), 10) : NaN;

        // If client already had an invoice, next one must be at least lastInvoiceNumber + 1
        let candidate = '';
        if (client?.lastInvoiceNumber) {
          candidate = getNextInvoiceNumber(client.lastInvoiceNumber, 1);
        }

        const candidateNum = parseInt(candidate.replace(/\D/g, ''), 10);
        let chosen = candidate || '001';

        if (!isNaN(dbNum) && dbNum > 0) {
          if (isNaN(candidateNum) || dbNum >= candidateNum) {
            chosen = String(dbNum).padStart(3, '0');
          }
        }

        // Also check if localStorage has an even newer number
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('aagspire_next_invoice_no');
          if (saved && saved.trim()) {
            const savedNum = parseInt(saved.replace(/\D/g, ''), 10);
            const chosenNum = parseInt(chosen.replace(/\D/g, ''), 10);
            if (!isNaN(savedNum) && savedNum > chosenNum) {
              chosen = saved.trim();
            }
          }
        }

        setInvoiceNumber(chosen);
      })
      .catch((err) => {
        console.error('Failed to fetch invoice counter from DB:', err);
        if (client?.lastInvoiceNumber) {
          setInvoiceNumber(getNextInvoiceNumber(client.lastInvoiceNumber, 1));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [client?._id]);

  // Filter projects to only show this month's project which month is selected
  const displayedProjects = useMemo(() => {
    if (!billingMonth || billingMonth === 'all') return localProjects;
    const [y, m] = billingMonth.split('-').map(Number);
    if (!y || !m) return localProjects;
    const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

    return localProjects.filter((p) => {
      const pDate = new Date(p.startDate || p.createdAt || 0);
      return !isNaN(pDate.getTime()) && pDate >= startOfMonth && pDate <= endOfMonth;
    });
  }, [localProjects, billingMonth]);

  // Keep selected IDs synced with displayed projects when billing month changes
  useEffect(() => {
    setSelectedProjectIds(displayedProjects.map((p) => p._id));
  }, [displayedProjects]);

  if (!isOpen || !client) return null;

  const toggleProject = (id: string) => {
    if (selectedProjectIds.includes(id)) {
      setSelectedProjectIds(selectedProjectIds.filter((pId) => pId !== id));
    } else {
      setSelectedProjectIds([...selectedProjectIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedProjectIds(displayedProjects.map((p) => p._id));
  };

  const clearAll = () => {
    setSelectedProjectIds([]);
  };

  // Quick inline add project to client so user can combine multiple projects
  const handleQuickAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name.');
      return;
    }
    const val = parseFloat(newProjectValue);
    if (!val || val <= 0) {
      toast.error('Please enter a valid project value.');
      return;
    }

    try {
      setSavingProject(true);
      const [y, m] = (billingMonth && billingMonth !== 'all') ? billingMonth.split('-').map(Number) : [0, 0];
      const quickAddDate = (y && m)
        ? new Date(y, m, 0).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const res = await api.post('/admin/projects', {
        projectName: newProjectName.trim(),
        projectValue: val,
        clientId: client._id,
        status: 'in_progress',
        startDate: quickAddDate,
      });

      const newProj = res.data.data || res.data.project;
      if (newProj) {
        const formatted = {
          ...newProj,
          _id: newProj._id,
          projectName: newProj.projectName,
          projectValue: val,
          grossProjectValue: val,
          paidAmount: 0,
          balance: val,
          totalAmount: val,
          status: newProj.status || 'in_progress',
          startDate: quickAddDate,
          createdAt: quickAddDate,
        };
        setLocalProjects((prev) => [formatted, ...prev]);
        setSelectedProjectIds((prev) => [...prev, newProj._id]);
        toast.success(`Project "${newProj.projectName}" added and selected for combination.`);
        setNewProjectName('');
        setNewProjectValue('');
        setIsAddingProject(false);
        if (onRefreshClient) onRefreshClient();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add project');
    } finally {
      setSavingProject(false);
    }
  };

  const selectedProjects = displayedProjects.filter((p) => selectedProjectIds.includes(p._id));

  // Calculations
  const subtotal = selectedProjects.reduce(
    (sum, p) => sum + parseAmount(p.projectValue ?? p.totalAmount),
    0
  );
  const totalPaid = selectedProjects.reduce(
    (sum, p) => sum + parseAmount(p.paidAmount ?? p.paymentsReceived),
    0
  );
  const taxAmount = (subtotal * (Number(taxPercent) || 0)) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - (Number(discountAmount) || 0));
  const netBalanceDue = Math.max(0, grandTotal - totalPaid);

  const billingMonthOptions = useMemo(() => {
    const list = [{ value: 'all', label: 'All Months (All Deliverables)' }];
    const monthsSet = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    (localProjects || []).forEach((p) => {
      const d = new Date(p.startDate || p.createdAt);
      if (!isNaN(d.getTime())) {
        monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });

    Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .forEach((key) => {
        const [y, m] = key.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        list.push({
          value: key,
          label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        });
      });

    return list;
  }, [now, localProjects]);

  const billingMonthInfo = useMemo(() => {
    if (!billingMonth || billingMonth === 'all') return null;
    const [y, m] = billingMonth.split('-').map(Number);
    if (!y || !m) return null;
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return {
      label: start.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      endDate: end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      period: `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    };
  }, [billingMonth]);

  const handleDownloadPdf = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Please select at least one project deliverable.');
      return;
    }
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      const activeIds = selectedProjects.map((p) => p._id);
      params.append('projectIds', activeIds.join(','));
      if (invoiceNumber) params.append('invoiceNumber', invoiceNumber);
      if (invoiceDate) params.append('invoiceDate', invoiceDate);
      if (taxPercent) params.append('taxPercent', taxPercent.toString());
      if (discountAmount) params.append('discountAmount', discountAmount.toString());
      if (billingMonth && billingMonth !== 'all') params.append('month', billingMonth);
      if (Object.keys(projectDiscounts).length > 0) {
        params.append('projectDiscounts', JSON.stringify(projectDiscounts));
      }

      const res = await api.get(`/admin/clients/${client._id}/pdf?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec'];
      let targetDate = new Date();
      if (billingMonth && billingMonth !== 'all') {
        const [y, m] = billingMonth.split('-').map(Number);
        if (y && m) targetDate = new Date(y, m - 1, 1);
      } else if (invoiceDate) {
        const parsed = new Date(invoiceDate.includes('T') ? invoiceDate : `${invoiceDate}T00:00:00`);
        if (!isNaN(parsed.getTime())) targetDate = parsed;
      }
      const monthSlug = monthNames[targetDate.getMonth()];
      const yearSlug = targetDate.getFullYear();
      const fileName = `Aagspire_invoice_${monthSlug}_${yearSlug}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const downloadedNo = invoiceNumber || '001';
      const serverNext = res.headers?.['x-next-invoice-number'];
      const nextNum = serverNext || getNextInvoiceNumber(downloadedNo, 1);

      // Auto-advance invoice sequence on every download
      handleSetInvoiceNumber(nextNum);
      if (onRefreshClient) {
        onRefreshClient();
      }

      toast.success(
        `Official invoice #${downloadedNo} downloaded! Next invoice number auto-advanced to #${nextNum}.`
      );
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="premium-modal animate-modal-scale relative w-full max-w-4xl bg-[#0c0d12] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] text-white text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#090a0f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/25 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Combine Projects & Generate Client Invoice
              </h2>
              <p className="text-[11px] text-white/50 flex items-center gap-1.5 flex-wrap">
                <span>{client.companyName || client.name}</span>
                <span>&bull;</span>
                <span>
                  {selectedProjects.length} of {displayedProjects.length} deliverables selected
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('select')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${activeTab === 'select'
                    ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] text-white shadow-sm font-semibold'
                    : 'text-white/60 hover:text-white'
                  }`}
              >
                1. Select Deliverables ({selectedProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${activeTab === 'preview'
                    ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FF7A2F] text-white shadow-sm font-semibold'
                    : 'text-white/60 hover:text-white'
                  }`}
              >
                2. Invoice Preview
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {activeTab === 'select' ? (
            <div className="space-y-6">
              {/* Billing Month Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#FF5A1F]/10 via-[#12131a] to-[#12131a] border border-[#FF5A1F]/25 p-3.5 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Invoice Billing Month
                    </span>
                    <span className="text-[11px] text-white/50">
                      {billingMonthInfo
                        ? `Only showing project deliverables for ${billingMonthInfo.label}`
                        : 'Showing project deliverables across all months'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-60">
                    <CustomSelect<string>
                      value={billingMonth}
                      onChange={(val) => setBillingMonth(val)}
                      options={billingMonthOptions}
                      placeholder="Select Month"
                    />
                  </div>
                  {billingMonth !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setBillingMonth('all')}
                      className="px-3 py-2 rounded-xl text-xs font-mono bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0 border border-white/10"
                    >
                      Show All
                    </button>
                  )}
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                <div>
                  <span className="text-xs text-white/80 font-medium block">
                    Choose which project deliverables to combine into one invoice:
                  </span>
                  <span className="text-[11px] text-white/40">
                    Selected items will be consolidated into a single downloadable PDF statement.
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-[#FF5A1F] hover:underline font-mono cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-white/20">&bull;</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-white/50 hover:text-white font-mono cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-2.5">
                {displayedProjects.length > 0 ? (
                  displayedProjects.map((p) => {
                    const isSelected = selectedProjectIds.includes(p._id);
                    const pVal = parseAmount(p.projectValue ?? p.totalAmount);
                    const pPaid = parseAmount(p.paidAmount ?? p.paymentsReceived);
                    const pBal = Math.max(0, pVal - pPaid);
                    const pDateStr = p.startDate || p.createdAt;
                    const formattedDate = pDateStr
                      ? new Date(pDateStr).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                      : null;

                    const currentDiscount =
                      projectDiscounts[p._id] !== undefined
                        ? projectDiscounts[p._id]
                        : (parseAmount(p.discountAmount) || 0);
                    const grossPrice = pVal + currentDiscount;

                    return (
                      <div
                        key={p._id}
                        onClick={() => toggleProject(p._id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${isSelected
                            ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40 text-white shadow-sm'
                            : 'bg-[#12131a] border-white/5 text-white/60 hover:border-white/15'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-white/30 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {p.projectName || p.title}
                              </p>
                              <p className="text-[11px] font-mono text-white/40 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>
                                  Status:{' '}
                                  <span className="capitalize text-white/70">
                                    {p.status?.replace('_', ' ')}
                                  </span>
                                </span>
                                <span>&bull;</span>
                                <span>Code: {p.projectCode || '—'}</span>
                                {formattedDate && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-[#FF5A1F]/80">Date: {formattedDate}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <p className="text-sm font-bold text-white">{formatINR(pVal)}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              Paid: <span className="text-white font-medium">{formatINR(pPaid)}</span>{' '}
                              &bull; Due:{' '}
                              <span className="text-zinc-300 font-medium">{formatINR(pBal)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Manual Discount & Live Markup Preview for this project */}
                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-white/60 font-medium text-[11.5px]">Add Discount (₹):</span>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 font-mono text-xs">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={currentDiscount || ''}
                                  onChange={(e) => handleProjectDiscountChange(p._id, Number(e.target.value))}
                                  className="w-28 pl-6 pr-2.5 py-1 bg-black/80 border border-white/15 rounded-lg text-white font-mono text-xs focus:border-[#FF5A1F] focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Live calculation badges: Price, Discount, Total */}
                            <div className="flex items-center gap-2 font-mono text-[11px] bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/5">
                              <span className="text-white/50">
                                Price: <strong className="text-white font-bold">{formatINR(grossPrice)}</strong>
                              </span>
                              <span className="text-white/30">•</span>
                              <span className="text-white/50">
                                Disc: <strong className="text-[#FF5A1F] font-bold">{currentDiscount > 0 ? `-${formatINR(currentDiscount)}` : '₹0'}</strong>
                              </span>
                              <span className="text-white/30">•</span>
                              <span className="text-white/50">
                                Total: <strong className="text-emerald-400 font-bold">{formatINR(pVal)}</strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-white/50 font-mono text-xs space-y-3">
                    <p>
                      No deliverables found for{' '}
                      <span className="text-white font-semibold">
                        {billingMonthInfo ? billingMonthInfo.label : 'this selection'}
                      </span>
                      .
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {billingMonth !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setBillingMonth('all')}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-sans text-xs transition-colors cursor-pointer border border-white/10"
                        >
                          Show All Months
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAddingProject(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white font-sans text-xs transition-colors cursor-pointer shadow-sm"
                      >
                        + Add Deliverable for this Month
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Another Project to this Client (Quick Add to Combine) */}
              <div className="p-4 rounded-xl bg-[#111218] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#FF5A1F]" />
                    <span className="font-semibold text-white text-xs">
                      Need to combine another project / deliverable for this client?
                    </span>
                  </div>
                  {!isAddingProject && (
                    <button
                      type="button"
                      onClick={() => setIsAddingProject(true)}
                      className="px-3 py-1.5 rounded-lg bg-[#FF5A1F]/15 text-[#FF5A1F] hover:bg-[#FF5A1F]/25 border border-[#FF5A1F]/30 font-medium transition-colors cursor-pointer text-xs"
                    >
                      + Add New Deliverable
                    </button>
                  )}
                </div>

                {isAddingProject && (
                  <form
                    onSubmit={handleQuickAddProject}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10"
                  >
                    <div>
                      <label className="text-white/60 block mb-1">Deliverable / Project Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Brand Identity & UI Kit"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 block mb-1">Contract Value (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="e.g. 50000"
                        value={newProjectValue}
                        onChange={(e) => setNewProjectValue(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none text-xs"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        disabled={savingProject}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white font-semibold transition-all disabled:opacity-50 cursor-pointer text-xs"
                      >
                        {savingProject ? 'Saving...' : 'Add & Combine'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingProject(false)}
                        className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Pricing Customization Box */}
              <div className="p-4 rounded-xl bg-[#111218] border border-white/[0.08] space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Invoice Adjustments & Taxes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-white/60 block mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      placeholder="10"
                      onChange={(e) => handleSetInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white font-medium focus:border-[#FF5A1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 block mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white font-medium focus:border-[#FF5A1F] focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 block mb-1">GST / Tax Rate</label>
                    <CustomSelect<number>
                      value={taxPercent}
                      onChange={(val) => setTaxPercent(Number(val))}
                      options={[
                        { value: 0, label: '0% (No Tax)' },
                        { value: 5, label: '5% GST' },
                        { value: 12, label: '12% GST' },
                        { value: 18, label: '18% GST (Standard)' },
                        { value: 28, label: '28% GST' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-white/60 block mb-1">Special Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount || ''}
                      placeholder="0"
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Official Receipt / Invoice Preview - Page 1 */}
              <div className="receipt-printable space-y-6 bg-[#080808] border border-white/10 rounded-2xl p-6 sm:p-8 text-white shadow-inner">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <div className="w-[160px] sm:w-[190px]">
                    <img
                      src="/Aagspire%20Logo%20.svg"
                      alt="Aagspire"
                      className="w-full h-auto object-contain block"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/Aagspire_Logo.png';
                      }}
                    />
                  </div>

                  <div className="text-right">
                    <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-[#FF5A1F] via-[#FF7A2F] to-[#FFA05C] bg-clip-text text-transparent print:text-[#FF5A1F] tracking-tight leading-none">
                      Invoice
                    </h1>
                  </div>
                </div>

                {/* Billed To */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#111111] border border-[#202020]">
                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider block mb-1">
                      Billed To/Client
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {client.companyName || client.name}
                    </h3>
                    {client.contactPerson && (
                      <p className="text-xs text-[#71717A] mt-0.5">Attn: {client.contactPerson}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:items-end justify-center">
                    <div className="w-full sm:w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#71717A]">Invoice No:</span>
                        <strong
                          onClick={() => {
                            const val = window.prompt('Enter Custom Invoice Number:', invoiceNumber);
                            if (val !== null && val.trim()) handleSetInvoiceNumber(val.trim());
                          }}
                          title="Click to edit Invoice Number"
                          className="text-white font-bold cursor-pointer hover:text-[#FF5A1F] transition-colors"
                        >
                          {invoiceNumber || getInitialInvoiceNo(client?.clientCode, client?.lastInvoiceNumber) || '001'}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#71717A]">Invoice Date:</span>
                        <div className="relative group">
                          <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10 [color-scheme:dark]"
                            title="Click to set Invoice Date"
                          />
                          <span className="text-white font-medium cursor-pointer group-hover:text-[#FF5A1F] transition-colors">
                            {invoiceDate
                              ? new Date(invoiceDate + 'T00:00:00').toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                              : new Date().toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                          </span>
                        </div>
                      </div>

                      {client.gstNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-[#71717A]">GSTIN:</span>
                          <span className="font-bold bg-gradient-to-r from-[#FF5A1F] to-[#FFA05C] bg-clip-text text-transparent print:text-[#FF5A1F]">
                            {client.gstNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table of Deliverables */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#111111] text-[#71717A] text-[10.5px] uppercase font-bold tracking-wider rounded-lg">
                      <tr>
                        <th className="py-2.5 px-3 w-10">NO.</th>
                        <th className="py-2.5 px-3">PROJECT / DELIVERABLE</th>
                        <th className="py-2.5 pl-6 pr-3 sm:pl-8 sm:pr-3 w-28 sm:w-32 text-left">PRICE (₹)</th>
                        <th className="py-2.5 pl-8 pr-3 sm:pl-10 sm:pr-3 w-28 sm:w-32 text-left">DISCOUNT (₹)</th>
                        <th className="py-2.5 pl-12 pr-2 sm:pl-16 sm:pr-3 w-32 sm:w-36 text-left">TOTAL (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedProjects.length > 0 ? (
                        selectedProjects.map((p, idx) => {
                          const targetTotal = parseAmount(
                            p.projectValue ?? p.totalAmount
                          );
                          const pDiscount =
                            projectDiscounts[p._id] !== undefined
                              ? projectDiscounts[p._id]
                              : (parseAmount(p.discountAmount) || 0);
                          const pPrice = targetTotal + pDiscount;
                          const pTotal = targetTotal;
                          return (
                            <tr key={p._id} className="hover:bg-white/[0.01]">
                              <td className="py-3 px-3 text-[#71717A]">{idx + 1}</td>
                              <td className="py-3 px-3 font-semibold text-white">
                                {p.projectName || p.title}
                              </td>
                              <td className="py-3 pl-6 pr-3 sm:pl-8 sm:pr-3 font-bold text-white w-28 sm:w-32 text-left">
                                {formatINR(pPrice)}
                              </td>
                              <td className="py-3 pl-8 pr-3 sm:pl-10 sm:pr-3 text-zinc-300 w-28 sm:w-32 text-left">
                                {pDiscount > 0 ? `-${formatINR(pDiscount)}` : '₹0'}
                              </td>
                              <td className="py-3 pl-12 pr-2 sm:pl-16 sm:pr-3 font-bold text-white w-32 sm:w-36 text-left">
                                {formatINR(pTotal)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-white/40 font-mono">
                            No deliverables selected. Switch to Step 1 to check deliverables.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Divider between Table and Summary */}
                <div className="border-t border-white/10 pt-4" />

                {/* Summary Section matching reference screenshot */}
                <div className="flex justify-end pt-1">
                  <div className="w-full sm:w-[360px] space-y-2 text-xs pr-4">
                    <div className="flex justify-between items-center text-white/60">
                      <span>Combined Subtotal:</span>
                      <span className="text-white font-bold">{formatINR(subtotal)}</span>
                    </div>

                    {taxAmount > 0 && (
                      <div className="flex justify-between items-center text-white/60">
                        <span>GST ({taxPercent}%):</span>
                        <span className="text-white font-bold">+{formatINR(taxAmount)}</span>
                      </div>
                    )}

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-white/60">
                        <span className="text-zinc-400">Extra Special Discount:</span>
                        <span className="text-zinc-300 font-bold">-{formatINR(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-white/60">
                      <span>Paid Money:</span>
                      <span className="text-white font-bold">-{formatINR(totalPaid)}</span>
                    </div>

                    {/* Balance Due Card */}
                    <div className="p-3.5 rounded-xl bg-[#1F1008] border border-[#FF5A1F]/50 flex justify-between items-center text-sm font-bold mt-3 shadow-[0_0_20px_rgba(255,90,31,0.12)]">
                      <span className="text-white">Balance Due:</span>
                      <span className="text-base font-black bg-gradient-to-r from-[#FF5A1F] to-[#FFA05C] bg-clip-text text-transparent print:text-[#FF5A1F]">{formatINR(netBalanceDue)}</span>
                    </div>

                    {/* *T&C apply. */}
                    <div className="text-right text-[11px] font-mono text-zinc-500 tracking-wide pt-1 select-none">
                      *T&amp;C apply.
                    </div>
                  </div>
                </div>

                {/* Divider between Deliverables & Terms */}
                <div className="border-t border-white/10 my-6 pt-2" />

                {/* Title & Intro (Enlarged Header) */}
                <div className="space-y-1.5 pt-1">
                  <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#FF5A1F] via-[#FF7A2F] to-[#FFA05C] bg-clip-text text-transparent print:text-[#FF5A1F] tracking-tight uppercase font-mono">
                    Terms and Conditions
                  </h2>
                  
                </div>

                {/* 15 Terms in ONE SINGLE COLUMN */}
                <div className="space-y-3.5 pt-2">
                  {TERMS_LIST.map((term, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="bg-gradient-to-b from-[#FFA05C] to-[#FF5A1F] bg-clip-text text-transparent print:text-[#FF5A1F] shrink-0 font-bold text-sm leading-snug select-none">•</span>
                      <span className="text-[13px] sm:text-sm text-white/85 leading-relaxed flex-1">
                        {term}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Contact Us & Trust Section (Matching PDF 2-Card Design) */}
                <div className="space-y-4 pt-6">
                  {/* Top Header */}
                  

                  {/* 2 Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card 1: Phone / WhatsApp */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#111111] border border-white/10">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFA05C] via-[#FF5A1F] to-[#D84315] flex items-center justify-center shrink-0 select-none shadow-md shadow-[#FF5A1F]/20">
                        <FaPhoneAlt className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-wider block">
                          Phone / WhatsApp
                        </span>
                        <div className="text-xs font-bold text-white leading-tight mt-0.5">
                          +91 90812 50040
                        </div>
                        
                      </div>
                    </div>

                    {/* Card 2: Email */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#111111] border border-white/10">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFA05C] via-[#FF5A1F] to-[#D84315] flex items-center justify-center shrink-0 select-none shadow-md shadow-[#FF5A1F]/20">
                        <FaRegEnvelope className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-wider block">
                          Email
                        </span>
                        <a
                          href="mailto:aagspire@gmail.com"
                          className="text-xs font-bold text-white hover:text-[#FFA05C] transition-colors leading-tight mt-0.5 block truncate"
                        >
                          aagspire@gmail.com
                        </a>
                      </div>
                    </div>

                   
                  </div>

                 
                </div>

                {/* Continuous Invoice Footer */}
                <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[10.5px] text-white/40">
                  <span>Aagspire</span>
                  <span className="font-mono">End of Agreement</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#090a0f] shrink-0">
          <div className="text-xs text-white/50">
            {selectedProjects.length} deliverables combined &bull; Total Value:{' '}
            <span className="text-white font-bold">{formatINR(grandTotal)}</span> &bull; Balance Due:{' '}
            <span className="bg-gradient-to-r from-[#FF5A1F] to-[#FFA05C] bg-clip-text text-transparent print:text-[#FF5A1F] font-bold">{formatINR(netBalanceDue)}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {activeTab === 'select' ? (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                disabled={selectedProjects.length === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A1F] via-[#FF6E30] to-[#E04810] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#FF5A1F]/25"
              >
                <span>Proceed to Invoice Preview ({selectedProjects.length} selected)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('select')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Select</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading || selectedProjects.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF5A1F] via-[#FF6E30] to-[#E04810] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-[#FF5A1F]/25"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'Generating PDF...' : 'Download Client Invoice (PDF)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
