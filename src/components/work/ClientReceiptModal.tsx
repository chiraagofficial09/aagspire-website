import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
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
import { MonthMultiSelect } from './MonthMultiSelect';
import { CustomDatePicker } from './CustomDatePicker';

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
  deductions?: any[];
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
  deductions = [],
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
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [projectDiscounts, setProjectDiscounts] = useState<Record<string, number>>({});
  const [projectSubProjects, setProjectSubProjects] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    (initialProjects || []).forEach((p: any) => {
      if (Array.isArray(p.subProjects) && p.subProjects.length > 0) {
        initial[p._id] = p.subProjects;
      } else if (p.description && typeof p.description === 'string' && p.description.trim()) {
        initial[p._id] = p.description.split('\n').map((s: string) => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
      }
    });
    return initial;
  });
  const [subProjectInputs, setSubProjectInputs] = useState<Record<string, string>>({});

  const handleProjectDiscountChange = (projectId: string, val: number) => {
    setProjectDiscounts((prev) => ({
      ...prev,
      [projectId]: Math.max(0, val),
    }));
  };

  const handleAddSubProject = (projectId: string) => {
    const raw = (subProjectInputs[projectId] || '').trim();
    if (!raw) return;
    const lines = raw.split('\n').map((s) => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
    if (lines.length === 0) return;
    const updated = [...(projectSubProjects[projectId] || []), ...lines];
    setProjectSubProjects((prev) => ({
      ...prev,
      [projectId]: updated,
    }));
    setSubProjectInputs((prev) => ({ ...prev, [projectId]: '' }));

    // Persist description to project in background
    api.put(`/admin/projects/${projectId}`, { description: updated.join('\n') }).catch((err) => {
      console.error('Failed to auto-save project description:', err);
    });
  };

  const handleRemoveSubProject = (projectId: string, index: number) => {
    const updated = (projectSubProjects[projectId] || []).filter((_, i) => i !== index);
    setProjectSubProjects((prev) => ({
      ...prev,
      [projectId]: updated,
    }));

    // Persist description to project in background
    api.put(`/admin/projects/${projectId}`, { description: updated.join('\n') }).catch((err) => {
      console.error('Failed to auto-save project description:', err);
    });
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
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() =>
    initialMonth ? [initialMonth] : [currentMonthKey]
  );

  useEffect(() => {
    if (initialMonth) setSelectedMonths([initialMonth]);
  }, [initialMonth]);

  const toggleMonth = (val: string) => {
    if (val === 'all') {
      setSelectedMonths(['all']);
      return;
    }
    setSelectedMonths((prev) => {
      const withoutAll = prev.filter((m) => m !== 'all');
      if (withoutAll.includes(val)) {
        const next = withoutAll.filter((m) => m !== val);
        return next.length > 0 ? next : [currentMonthKey];
      }
      return [...withoutAll, val];
    });
  };

  const removeMonth = (val: string) => {
    setSelectedMonths((prev) => {
      const next = prev.filter((m) => m !== val);
      return next.length > 0 ? next : [currentMonthKey];
    });
  };

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

  // Distribute general client payments across localProjects if not already allocated
  const enrichedProjects = useMemo(() => {
    const hasAnyPaid = (localProjects || []).some((p) => parseAmount(p.paidAmount) > 0);
    if (hasAnyPaid) return localProjects;

    const payments = (client?.payments || []) as any[];
    let unallocated = payments.reduce((sum, pm) => sum + parseAmount(pm.amount), 0);
    if (unallocated <= 0) {
      unallocated = parseAmount(
        client?.financialSummary?.cashCollected ??
        client?.financials?.cashCollected ??
        client?.financials?.totalPaymentsReceived ??
        client?.totalPaid
      );
    }

    if (unallocated <= 0) return localProjects;

    const sorted = [...(localProjects || [])].sort((a, b) => {
      const da = new Date(a.createdAt || a.startDate || 0).getTime();
      const db = new Date(b.createdAt || b.startDate || 0).getTime();
      return da - db;
    });

    const allocMap = new Map<string, number>();
    for (const p of sorted) {
      if (unallocated <= 0) break;
      const val = parseAmount(p.projectValue ?? p.totalAmount);
      const take = Math.min(unallocated, val);
      allocMap.set(p._id, take);
      unallocated -= take;
    }

    return (localProjects || []).map((p) => {
      const paid = allocMap.get(p._id) ?? parseAmount(p.paidAmount ?? p.paymentsReceived);
      const val = parseAmount(p.projectValue ?? p.totalAmount);
      return {
        ...p,
        paidAmount: paid,
        balance: Math.max(0, val - paid),
      };
    });
  }, [localProjects, client]);

  // Filter projects to only show deliverables from selected months (or all)
  const displayedProjects = useMemo(() => {
    if (selectedMonths.includes('all') || selectedMonths.length === 0) return enrichedProjects;

    const ranges = selectedMonths.map((key) => {
      const [y, m] = key.split('-').map(Number);
      return {
        start: new Date(y, m - 1, 1, 0, 0, 0, 0),
        end: new Date(y, m, 0, 23, 59, 59, 999),
      };
    });

    return enrichedProjects.filter((p) => {
      const pDate = new Date(p.startDate || p.createdAt || 0);
      if (isNaN(pDate.getTime())) return false;
      return ranges.some((r) => pDate >= r.start && pDate <= r.end);
    });
  }, [enrichedProjects, selectedMonths]);

  // Keep selected IDs synced with displayed projects when billing months change
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
      const [y, m] = (!selectedMonths.includes('all') && selectedMonths.length > 0)
        ? selectedMonths[0].split('-').map(Number)
        : [0, 0];
      const quickAddDate = (y && m)
        ? new Date(y, m, 0).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const res = await api.post('/admin/projects', {
        projectName: newProjectName.trim(),
        projectValue: val,
        clientId: client._id,
        status: 'start_process',
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
          status: newProj.status || 'start_process',
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
  const taxAmount = (subtotal * (Number(taxPercent) || 0)) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - (Number(discountAmount) || 0));

  const projectPaidSum = selectedProjects.reduce(
    (sum, p) => sum + parseAmount(p.paidAmount ?? p.paymentsReceived),
    0
  );

  const clientPaymentsTotal = useMemo(() => {
    const pms = (client?.payments || []) as any[];
    const directSum = pms.reduce((sum, pm) => sum + parseAmount(pm.amount), 0);
    const summaryPaid = parseAmount(
      client?.financialSummary?.cashCollected ??
      client?.financials?.cashCollected ??
      client?.financials?.totalPaymentsReceived ??
      client?.totalPaid
    );
    return Math.max(directSum, summaryPaid);
  }, [client]);

  const totalPaid = Math.min(
    grandTotal,
    projectPaidSum > 0 ? projectPaidSum : clientPaymentsTotal
  );

  const activeDeductions = useMemo(() => {
    let list: any[] = [];
    if (deductions && deductions.length > 0) {
      list = deductions;
    } else if (client?.deductions && Array.isArray(client.deductions) && client.deductions.length > 0) {
      list = client.deductions;
    }

    if (!selectedMonths.includes('all') && selectedMonths.length > 0) {
      return list.filter((d: any) => {
        if (!d.date) return false;
        const dStr = typeof d.date === 'string' ? d.date : new Date(d.date).toISOString().slice(0, 10);
        return selectedMonths.some((m) => dStr.startsWith(m));
      });
    }

    return list;
  }, [deductions, client?.deductions, selectedMonths]);

  const totalDeductions = useMemo(() => {
    return activeDeductions.reduce((sum: number, d: any) => sum + (parseAmount(d.amount) || 0), 0);
  }, [activeDeductions]);

  const netBalanceDue = Math.max(0, grandTotal - totalPaid - totalDeductions);

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
    (deductions || client?.deductions || []).forEach((d: any) => {
      if (d.date) {
        const dt = new Date(d.date);
        if (!isNaN(dt.getTime())) {
          monthsSet.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
        }
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
    if (selectedMonths.includes('all') || selectedMonths.length === 0) return null;

    const monthOptionsMap = new Map(billingMonthOptions.map((o) => [o.value, o.label]));

    if (selectedMonths.length === 1) {
      const [y, m] = selectedMonths[0].split('-').map(Number);
      if (!y || !m) return null;
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return {
        label: monthOptionsMap.get(selectedMonths[0]) || start.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        count: 1,
        isMultiple: false,
        period: `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      };
    }

    const sorted = [...selectedMonths].sort();
    const [firstY, firstM] = sorted[0].split('-').map(Number);
    const [lastY, lastM] = sorted[sorted.length - 1].split('-').map(Number);
    const firstStart = new Date(firstY, firstM - 1, 1);
    const lastEnd = new Date(lastY, lastM, 0);

    const labels = sorted
      .map((k) => {
        const [y, m] = k.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      })
      .join(', ');

    return {
      label: labels,
      count: selectedMonths.length,
      isMultiple: true,
      period: `${firstStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${lastEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    };
  }, [selectedMonths, billingMonthOptions]);

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
      if (!selectedMonths.includes('all') && selectedMonths.length > 0) {
        params.append('month', selectedMonths.join(','));
      }
      if (Object.keys(projectDiscounts).length > 0) {
        params.append('projectDiscounts', JSON.stringify(projectDiscounts));
      }
      if (activeDeductions.length > 0) {
        params.append('deductions', JSON.stringify(activeDeductions.map((d: any) => ({
          projectName: d.projectName || d.label || 'Project',
          amount: parseAmount(d.amount) || 0,
          date: d.date,
        }))));
      }
      if (Object.keys(projectSubProjects).length > 0) {
        params.append('projectDescriptions', JSON.stringify(projectSubProjects));
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
      if (!selectedMonths.includes('all') && selectedMonths.length > 0) {
        const sorted = [...selectedMonths].sort();
        const [y, m] = sorted[sorted.length - 1].split('-').map(Number);
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

  return (
    <div
      className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="premium-modal animate-modal-scale relative w-full max-w-4xl bg-[#0c0d12] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] text-white text-xs">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/[0.08] bg-[#090a0f] shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
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
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs w-full sm:w-auto">
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
              className="hidden sm:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
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
              <div className="bg-gradient-to-r from-[#FF5A1F]/10 via-[#12131a] to-[#12131a] border border-[#FF5A1F]/25 p-3.5 sm:p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white block">
                          Invoice Billing Months
                        </span>
                        {!selectedMonths.includes('all') && selectedMonths.length > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5A1F] text-white">
                            {selectedMonths.length} Months Combined
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <div className="w-56 sm:w-60">
                      <MonthMultiSelect
                        selectedMonths={selectedMonths}
                        onToggleMonth={toggleMonth}
                        onSelectAll={() => setSelectedMonths(['all'])}
                        options={billingMonthOptions}
                        placeholder="+ Add / Select Month"
                      />
                    </div>
                    {!selectedMonths.includes('all') ? (
                      <button
                        type="button"
                        onClick={() => setSelectedMonths(['all'])}
                        className="px-3 py-2 rounded-xl text-xs font-mono bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0 border border-white/10"
                      >
                        Show All
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedMonths([currentMonthKey])}
                        className="px-3 py-2 rounded-xl text-xs font-mono bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0 border border-white/10"
                      >
                        Current Month
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Month Chips / Badges */}
                {!selectedMonths.includes('all') && selectedMonths.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] text-white/40 font-medium">Included Months:</span>
                    {selectedMonths.map((mKey) => {
                      const opt = billingMonthOptions.find((o) => o.value === mKey);
                      const [y, m] = mKey.split('-').map(Number);
                      const label = opt ? opt.label : `${m}/${y}`;
                      return (
                        <span
                          key={mKey}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-[#FF5A1F] text-xs font-medium shadow-sm transition-all"
                        >
                          <Calendar className="w-3 h-3 text-[#FF5A1F]" />
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={() => removeMonth(mKey)}
                            title={`Remove ${label}`}
                            className="p-0.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    <span className="text-[11px] text-zinc-400 ml-1">
                      (Select more months from dropdown to combine 2-3 months into 1 bill)
                    </span>
                  </div>
                )}
              </div>

              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                <div>
                  <span className="text-xs text-white/80 font-medium block">
                    Choose Projects to Combine into one Invoice
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
                    const currentDiscount =
                      projectDiscounts[p._id] !== undefined
                        ? projectDiscounts[p._id]
                        : (parseAmount(p.discountAmount) || 0);

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
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <p className="text-sm font-bold text-white">{formatINR(pVal)}</p>
                          </div>
                        </div>

                        {/* Manual Discount & Sub-projects for this project */}
                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 pt-2.5 border-t border-white/10 space-y-3 text-xs"
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

                            {/* Sub-projects / Description section */}
                            <div className="pt-2 border-t border-white/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-white/60 font-medium text-[11.5px]">
                                  Sub-projects / Description:
                                </span>
                                {(projectSubProjects[p._id] || []).length > 0 && (
                                  <span className="text-[10px] font-mono text-[#FF5A1F] font-bold px-1.5 py-0.5 rounded bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
                                    {(projectSubProjects[p._id] || []).length} added
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Type sub-project / task (e.g. Logo Design) and press Enter..."
                                  value={subProjectInputs[p._id] || ''}
                                  onChange={(e) => setSubProjectInputs((prev) => ({ ...prev, [p._id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddSubProject(p._id);
                                    }
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-black/80 border border-white/15 rounded-lg text-white text-xs focus:border-[#FF5A1F] focus:outline-none placeholder:text-white/30"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSubProject(p._id)}
                                  className="px-3 py-1.5 rounded-lg bg-[#FF5A1F]/20 text-[#FF5A1F] hover:bg-[#FF5A1F] hover:text-white border border-[#FF5A1F]/30 text-xs font-semibold transition-all cursor-pointer shrink-0"
                                >
                                  + Add
                                </button>
                              </div>

                              {/* Added sub-projects list with orange bullets */}
                              {(projectSubProjects[p._id] || []).length > 0 && (
                                <div className="space-y-1 pt-0.5">
                                  {(projectSubProjects[p._id] || []).map((sub, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs group"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <span className="text-[#FF5A1F] font-black text-sm select-none leading-none">•</span>
                                        <span className="text-white/85 text-[11.5px] truncate">{sub}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSubProject(p._id, sIdx)}
                                        className="text-white/30 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                        title="Remove sub-project"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                      {!selectedMonths.includes('all') && (
                        <button
                          type="button"
                          onClick={() => setSelectedMonths(['all'])}
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
                    <CustomDatePicker
                      value={invoiceDate}
                      onChange={(val) => setInvoiceDate(val)}
                      placeholder="Select date"
                      required
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
                        <th className="py-2.5 pl-6 pr-3 sm:pl-8 sm:pr-3 w-28 sm:w-32 text-left whitespace-nowrap">PRICE (₹)</th>
                        <th className="py-2.5 pl-8 pr-3 sm:pl-10 sm:pr-3 w-28 sm:w-32 text-left whitespace-nowrap">DISCOUNT (₹)</th>
                        <th className="py-2.5 pl-12 pr-2 sm:pl-16 sm:pr-3 w-32 sm:w-36 text-left whitespace-nowrap">TOTAL (₹)</th>
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
                              <td className="py-3 px-3 text-[#71717A] align-top">{idx + 1}</td>
                              <td className="py-3 px-3 align-top">
                                <div className="font-semibold text-white">
                                  {p.projectName || p.title}
                                </div>
                                {(projectSubProjects[p._id] || []).length > 0 && (
                                  <ul className="mt-1.5 space-y-1">
                                    {(projectSubProjects[p._id] || []).map((sub: string, sIdx: number) => (
                                      <li key={sIdx} className="flex items-start gap-1.5 text-[11px] text-zinc-300 leading-tight">
                                        <span className="text-[#FF5A1F] font-bold text-xs select-none leading-none">•</span>
                                        <span>{sub}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                              <td className="py-3 pl-6 pr-3 sm:pl-8 sm:pr-3 font-bold text-white w-28 sm:w-32 text-left align-top">
                                {formatINR(pPrice)}
                              </td>
                              <td className="py-3 pl-8 pr-3 sm:pl-10 sm:pr-3 text-zinc-300 w-28 sm:w-32 text-left align-top">
                                {pDiscount > 0 ? `-${formatINR(pDiscount)}` : '₹0'}
                              </td>
                              <td className="py-3 pl-12 pr-2 sm:pl-16 sm:pr-3 font-bold text-white w-32 sm:w-36 text-left align-top">
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

                    {activeDeductions.length > 0 && activeDeductions.map((d: any, idx: number) => {
                      const dVal = parseAmount(d.amount) || 0;
                      if (dVal <= 0) return null;
                      const dName = d.projectName || d.label || 'Project';
                      return (
                        <div key={idx} className="flex justify-between items-start text-white/60 gap-4">
                          <span className="break-words flex-1 text-left">{dName.endsWith(':') ? dName : `${dName}:`}</span>
                          <span className="text-white font-bold whitespace-nowrap shrink-0 text-right">-{formatINR(dVal)}</span>
                        </div>
                      );
                    })}

                    {/* Total Card */}
                    <div className="p-3.5 rounded-xl bg-[#1F1008] border border-[#FF5A1F]/50 flex justify-between items-center text-sm font-bold mt-3 shadow-[0_0_20px_rgba(255,90,31,0.12)]">
                      <span className="text-white">Total:</span>
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
            <span className="text-white font-bold">{formatINR(grandTotal)}</span> &bull; Total:{' '}
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
