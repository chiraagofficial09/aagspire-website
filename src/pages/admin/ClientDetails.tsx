import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  X,
  Download,
  ReceiptText,
  MoreHorizontal,
  Info,
  AlertCircle,
  Layers,
  FileCheck,
  Calendar,
  Clock,
  Wallet,
  Tag,
  Target,
  Plus,
  MinusCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';
import { formatINR, parseAmount } from '../../utils/formatters';
import { ClientReceiptModal } from '../../components/work/ClientReceiptModal';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';
import { useAlert } from '../../context/AlertContext';
import { StatusBadge } from '../../components/work/StatusBadge';

const getProjectNetValue = (p: any): number => parseAmount(p?.projectValue ?? p?.totalAmount ?? p);
const getPaymentAmount = (pm: any): number => parseAmount(pm?.amount ?? pm);

export const AdminClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { showConfirm } = useAlert();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Deductions state
  interface DeductionEntry {
    id: string;
    label: string;
    projectName: string;
    date: string;
    amount: number;
  }
  const [showDeductionCard, setShowDeductionCard] = useState(false);
  const [deductions, setDeductions] = useState<DeductionEntry[]>([]);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [deductionProjectName, setDeductionProjectName] = useState('');
  const [deductionDate, setDeductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [deductionAmount, setDeductionAmount] = useState('');

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(deductionAmount);
    if (!amt || amt <= 0) return;
    const finalProjectName = deductionProjectName.trim() || 'Project Deduction';

    const newEntry: DeductionEntry = {
      id: Date.now().toString(),
      label: finalProjectName,
      projectName: finalProjectName,
      date: deductionDate,
      amount: amt,
    };
    const updated = [...deductions, newEntry];
    setDeductions(updated);
    setShowDeductionCard(true);
    setDeductionProjectName('');
    setDeductionDate(new Date().toISOString().split('T')[0]);
    setDeductionAmount('');
    setIsDeductionModalOpen(false);

    if (id) {
      try {
        await api.put(`/admin/clients/${id}`, {
          deductions: updated.map((d) => ({
            projectName: d.projectName || d.label,
            date: d.date,
            amount: d.amount,
          })),
        });
        toast.success('Deduction added successfully');
      } catch (err) {
        console.error('Failed to persist deduction:', err);
        toast.error('Failed to save deduction to server');
      }
    }
  };

  const handleRemoveDeduction = async (entryId: string) => {
    const updated = deductions.filter((d) => d.id !== entryId);
    setDeductions(updated);
    if (id) {
      try {
        await api.put(`/admin/clients/${id}`, {
          deductions: updated.map((d) => ({
            projectName: d.projectName || d.label,
            date: d.date,
            amount: d.amount,
          })),
        });
        toast.success('Deduction removed');
      } catch (err) {
        console.error('Failed to remove deduction:', err);
        toast.error('Failed to remove deduction from server');
      }
    }
  };

  // Month-wise billing state
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedStatCard, setSelectedStatCard] = useState<number | null>(null);

  // Dropdown states
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const [activePaymentMenuId, setActivePaymentMenuId] = useState<string | null>(null);
  const paymentMenuRef = useRef<HTMLDivElement>(null);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const [editForm, setEditForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
      if (paymentMenuRef.current && !paymentMenuRef.current.contains(event.target as Node)) {
        setActivePaymentMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClient = async (monthOverride?: string) => {
    try {
      setLoading(true);
      const m = monthOverride !== undefined ? monthOverride : selectedMonth;
      const query = m && m !== 'all' ? `?month=${encodeURIComponent(m)}` : (m === 'all' ? '?month=all' : '');
      const res = await api.get(`/admin/clients/${id}${query}`);
      const c = res.data.data || res.data.client || res.data;
      setClient(c);
      if (c) {
        setEditForm({
          name: c.companyName || c.name || '',
          contactPerson: c.contactPerson || c.contactName || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          taxId: c.gstNumber || c.taxId || '',
        });
        if (Array.isArray(c.deductions)) {
          const loaded: DeductionEntry[] = c.deductions.map((d: any) => ({
            id: d._id ? String(d._id) : (d.id || `${Date.now()}-${Math.random()}`),
            projectName: d.projectName || d.label || 'Project Deduction',
            label: d.projectName || d.label || 'Project Deduction',
            date: d.date ? new Date(d.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            amount: Number(d.amount) || 0,
          }));
          setDeductions(loaded);
          if (loaded.length > 0) {
            setShowDeductionCard(true);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching client details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchClient();
  }, [id, selectedMonth]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/admin/clients/${id}`, {
        ...editForm,
        companyName: editForm.name,
        gstNumber: editForm.taxId,
      });
      toast.success('Client updated successfully');
      setIsEditModalOpen(false);
      fetchClient();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Client',
      message: `Are you sure you want to delete "${client.companyName || client.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/clients/${id}`);
      toast.success('Client deleted successfully');
      navigate('/admin/clients');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete client');
    }
  };

  const availableMonths: MonthOption[] = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    if (client) {
      (client.payments || []).forEach((p: any) => {
        const d = new Date(p.paymentDate || p.createdAt);
        if (!isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      });
      (client.projects || []).forEach((p: any) => {
        const d = new Date(p.createdAt || p.startDate);
        if (!isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      });
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
  }, [client, currentMonthKey, now]);

  const handleQuickDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const params = new URLSearchParams();
      if (selectedMonth && selectedMonth !== 'all') {
        params.append('month', selectedMonth);
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/clients/${id}/pdf${qs}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeCode = (client.clientCode || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
      const monthTag = selectedMonth && selectedMonth !== 'all' ? `_${selectedMonth}` : '';
      link.setAttribute('download', `Aagspire_Statement_${safeCode}${monthTag}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Client Statement PDF downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Month filtering bounds and label
  const isAllMonths = !selectedMonth || selectedMonth === 'all';

  const { startOfMonth, endOfMonth, selectedMonthLabel } = useMemo(() => {
    if (isAllMonths) {
      return { startOfMonth: null, endOfMonth: null, selectedMonthLabel: 'All Months' };
    }
    const [yr, mo] = selectedMonth.split('-').map(Number);
    const start = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
    const end = new Date(yr, mo, 0, 23, 59, 59, 999);
    const label = start.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    return { startOfMonth: start, endOfMonth: end, selectedMonthLabel: label };
  }, [selectedMonth, isAllMonths]);

  // Raw arrays from client
  const allProjects = useMemo(() => client?.projects || [], [client]);
  const allPayments = useMemo(() => client?.payments || [], [client]);

  // All-time totals for payment limits and validation
  const allTimeContractVal = useMemo(() => {
    return (
      Number(client?.totalContractValue || client?.financials?.totalBusinessValue || 0) ||
      allProjects.reduce((sum: number, p: any) => sum + getProjectNetValue(p), 0)
    );
  }, [client, allProjects]);

  const allTimePaidVal = useMemo(() => {
    return (
      Number(client?.totalPaid || client?.financials?.totalPaymentsReceived || 0) ||
      allPayments.reduce((sum: number, pm: any) => sum + getPaymentAmount(pm), 0)
    );
  }, [client, allPayments]);

  const allTimeRemainingDue = useMemo(() => {
    return Math.max(0, allTimeContractVal - allTimePaidVal);
  }, [allTimeContractVal, allTimePaidVal]);

  // Projects belonging specifically to the selected month (or all if All Months)
  const filteredProjects = useMemo(() => {
    if (isAllMonths || !startOfMonth || !endOfMonth) return allProjects;
    return allProjects.filter((p: any) => {
      const d = new Date(p.startDate || p.createdAt || 0);
      return !isNaN(d.getTime()) && d >= startOfMonth && d <= endOfMonth;
    });
  }, [allProjects, isAllMonths, startOfMonth, endOfMonth]);

  // Payments received specifically within the selected month
  const filteredPayments = useMemo(() => {
    if (isAllMonths || !startOfMonth || !endOfMonth) return allPayments;
    return allPayments.filter((pm: any) => {
      const d = new Date(pm.paymentDate || pm.createdAt);
      return !isNaN(d.getTime()) && d >= startOfMonth && d <= endOfMonth;
    });
  }, [allPayments, isAllMonths, startOfMonth, endOfMonth]);

  // Payments received cumulatively up to the end of the selected month
  const paymentsUpToMonth = useMemo(() => {
    if (isAllMonths || !endOfMonth) return allPayments;
    return allPayments.filter((pm: any) => {
      const d = new Date(pm.paymentDate || pm.createdAt);
      return !isNaN(d.getTime()) && d <= endOfMonth;
    });
  }, [allPayments, isAllMonths, endOfMonth]);

  // Month-wise display metrics using backend source of truth
  const finSummary = client?.financialSummary || client?.financials || {};
  const newProjectValue = Number(
    finSummary.newProjectValue !== undefined
      ? finSummary.newProjectValue
      : (isAllMonths ? allTimeContractVal : filteredProjects.reduce((sum: number, p: any) => sum + getProjectNetValue(p), 0))
  );
  const cashCollected = Number(
    finSummary.cashCollected !== undefined
      ? finSummary.cashCollected
      : (isAllMonths ? allTimePaidVal : filteredPayments.reduce((sum: number, pm: any) => sum + getPaymentAmount(pm), 0))
  );
  const currentMonthCollection = Number(finSummary.currentMonthCollection || 0);
  const previousOutstandingCollected = Number(finSummary.previousOutstandingCollected || 0);

  // Fallback cumulative opening receivable from all previous months if backend summary is still resolving
  const fallbackOpeningReceivable = useMemo(() => {
    if (isAllMonths || !startOfMonth) return 0;
    const totalValBefore = allProjects
      .filter((p: any) => {
        const d = new Date(p.startDate || p.createdAt || 0);
        return !isNaN(d.getTime()) && d < startOfMonth;
      })
      .reduce((sum: number, p: any) => sum + getProjectNetValue(p), 0);

    const totalPaidBefore = allPayments
      .filter((pm: any) => {
        const pmDate = new Date(pm.paymentDate || pm.createdAt || 0);
        return !isNaN(pmDate.getTime()) && pmDate < startOfMonth;
      })
      .reduce((s: number, pm: any) => s + getPaymentAmount(pm), 0);

    return Math.max(0, totalValBefore - totalPaidBefore);
  }, [allProjects, allPayments, isAllMonths, startOfMonth]);

  const openingReceivable = Number(
    finSummary.openingReceivable !== undefined
      ? finSummary.openingReceivable
      : fallbackOpeningReceivable
  );
  const closingReceivable = Number(
    finSummary.closingReceivable !== undefined
      ? finSummary.closingReceivable
      : (isAllMonths ? allTimeRemainingDue : Math.max(0, openingReceivable + newProjectValue - (currentMonthCollection + previousOutstandingCollected)))
  );

  const appliedCollections = Number(finSummary.appliedCollections ?? (currentMonthCollection + previousOutstandingCollected));
  const unappliedCash = Number(finSummary.unappliedCash || 0);
  const excessCash = Number(finSummary.excessCash || 0);

  const collectionRate = Number(
    finSummary.collectionRate !== undefined
      ? finSummary.collectionRate
      : (newProjectValue > 0 ? Math.round((currentMonthCollection / newProjectValue) * 100) : 0)
  );

  const hasPreviousCollections = Boolean(
    finSummary.hasPreviousCollections || previousOutstandingCollected > 0 || cashCollected > newProjectValue
  );
  const previousCollectionsMessage =
    finSummary.previousCollectionsMessage ||
    (hasPreviousCollections
      ? `₹${previousOutstandingCollected.toLocaleString('en-IN')} of ${selectedMonthLabel} collections came from projects booked in previous months.`
      : '');


  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = parseFloat(payAmount);
    if (!entered || entered <= 0) {
      toast.error('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (allTimeContractVal > 0 && allTimeRemainingDue <= 0) {
      toast.error('This client account is already fully paid. Cannot add further payments.');
      return;
    }
    if (allTimeContractVal > 0 && entered > allTimeRemainingDue) {
      toast.error(`Cannot record more than remaining client balance (${formatINR(allTimeRemainingDue)}).`);
      return;
    }

    try {
      setSubmittingPayment(true);
      await api.post('/admin/payments', {
        clientId: id,
        amount: entered,
        paymentMethod: payMethod,
        transactionReference: payRef,
        notes: payNotes,
        paymentDate: payDate,
      });
      toast.success('Payment recorded successfully for client.');
      setIsPayModalOpen(false);
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      fetchClient();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/payments/${paymentId}`);
      toast.success('Payment record deleted successfully.');
      fetchClient();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!client) {
    return <div className="p-8 text-center text-white/50 font-mono">Client not found.</div>;
  }

  const projects = filteredProjects;
  const payments = filteredPayments;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Breadcrumbs */}
      <div className="text-xs text-white/40 flex items-center gap-1.5 font-medium">
        <Link to="/admin/clients" className="hover:text-white/70 transition-colors">
          Clients
        </Link>
        <span>/</span>
        <span className="text-white/60">Client overview</span>
      </div>

      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            to="/admin/clients"
            className="w-10 h-10 rounded-xl bg-[#0c0d12] border border-white/[0.08] hover:bg-white/5 flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#FF5A1F] tracking-tight">
              {client.name || client.companyName}
            </h1>
            <p className="text-xs text-white/50 font-normal mt-0.5">
              {client.contactPerson || 'Direct Representative'} &bull; {client.email || 'No email provided'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Billing Month Selector */}
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
            className="w-36 sm:w-44"
          />

          {/* Combine Projects (Colorless) */}
          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0c0d12] border border-white/[0.08] hover:bg-white/5 text-white text-xs font-medium transition-all cursor-pointer"
          >
            <ReceiptText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Combine Projects</span>
          </button>

          {/* Record Payment (Colorless) */}
          <button
            type="button"
            onClick={() => {
              setPayAmount('');
              setPayRef('');
              setPayNotes('');
              setPayDate(new Date().toISOString().slice(0, 10));
              setPayMethod('bank_transfer');
              setIsPayModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#0c0d12] border border-white/[0.08] hover:bg-white/5 text-white text-xs font-medium transition-all cursor-pointer"
          >
            <span>Record Payment</span>
          </button>

          {/* Download Statement PDF (Orange CTA) */}
          <button
            type="button"
            onClick={handleQuickDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingPdf ? 'Generating...' : 'Download Statement PDF'}</span>
          </button>

          {/* Triple-dot menu for additional options */}
          <div className="relative" ref={headerMenuRef}>
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
              className="w-9 h-9 rounded-xl bg-[#0c0d12] border border-white/[0.08] hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isHeaderMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0e0f15] border border-white/[0.1] shadow-2xl py-1.5 z-40">
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Edit Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsReceiptModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <ReceiptText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Combine Projects</span>
                </button>
                <div className="my-1 border-t border-white/5" />
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    handleDelete();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Client</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notice if Unapplied Cash or Excess Cash exists */}
      {(unappliedCash > 0 || excessCash > 0) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {unappliedCash > 0 && `Unapplied Cash: ${formatINR(unappliedCash)} received without valid project link.`}
              {excessCash > 0 && ` Excess Cash: ${formatINR(excessCash)} exceeding contracted values.`}
              {' '}These amounts do not reduce project receivables until properly allocated.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30 shrink-0">
            Needs Review
          </span>
        </div>
      )}

      {/* Financial Overview Card */}
      <div className="rounded-2xl bg-[#0c0d12] border border-white/[0.06] p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-4 rounded-full bg-[#FF5A1F] shrink-0" />
            <h2 className="text-lg font-bold text-[#FF5A1F] tracking-tight">Financial Overview</h2>
          </div>
          {!showDeductionCard && (
            <button
              type="button"
              onClick={() => setShowDeductionCard(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10 hover:bg-[#FF5A1F]/20 hover:text-[#FF5A1F] hover:border-[#FF5A1F]/40 transition-colors cursor-pointer"
              title="Add Deductions Box"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-3.5">
          {/* Card 1: Total */}
          <div className="flex-1 p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/50">Total</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold tracking-tight text-[#FF5A1F]">
                {formatINR(newProjectValue)}
              </p>
            </div>
          </div>

          {/* Card 2: Done */}
          <div className="flex-1 p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/50">Previous Month Pending</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold tracking-tight text-[#FF5A1F]">
                {formatINR(openingReceivable)}
              </p>
            </div>
          </div>

          {/* Card 3: Done */}
          <div className="flex-1 p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/50">Money Received This Month</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold tracking-tight text-[#FF5A1F]">
                {formatINR(cashCollected)}
              </p>
            </div>
          </div>

          {/* Card 4: Pending */}
          <div className="flex-1 p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/50">Pending</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10">
                <Tag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold tracking-tight text-[#FF5A1F]">
                {formatINR(closingReceivable)}
              </p>
            </div>
          </div>

          {/* Card 5: Deductions (shown when showDeductionCard is true) */}
          {showDeductionCard && (
            <div className="flex-1 p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-white/50">Deductions</span>
                  {deductions.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDeductionCard(false)}
                      className="p-1 rounded text-white/30 hover:text-white/70 transition-colors"
                      title="Hide Deductions box"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeductionProjectName('');
                    setDeductionDate(new Date().toISOString().split('T')[0]);
                    setDeductionAmount('');
                    setIsDeductionModalOpen(true);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10 hover:bg-[#FF5A1F]/20 hover:text-[#FF5A1F] hover:border-[#FF5A1F]/40 transition-colors cursor-pointer"
                  title="Add deduction"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-3">
                <p className="text-xl font-bold tracking-tight text-[#FF5A1F]">
                  {formatINR(totalDeductions)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Deductions List (shown if card is shown and deductions exist) */}
        {showDeductionCard && deductions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-white/40 font-mono uppercase tracking-wider">Project Deductions</p>
              <button
                type="button"
                onClick={() => {
                  setDeductionProjectName('');
                  setDeductionDate(new Date().toISOString().split('T')[0]);
                  setDeductionAmount('');
                  setIsDeductionModalOpen(true);
                }}
                className="text-[11px] text-[#FF5A1F] hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add another
              </button>
            </div>
            <div className="space-y-1.5">
              {deductions.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.025] border border-white/5 text-xs">
                  <div className="flex items-center gap-3">
                    <MinusCircle className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                    <span className="text-white/80 font-medium">{d.projectName || d.label}</span>
                    <span className="text-white/40 font-mono">{new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#FF5A1F]">− {formatINR(d.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(d.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove deduction"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white/50">Net Receivable after deductions:</span>
                <span className="font-bold text-[#FF5A1F] text-sm">{formatINR(Math.max(0, closingReceivable - totalDeductions))}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Projects Card */}
      <div className="rounded-2xl bg-[#0c0d12] border border-white/[0.06] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-4 rounded-full bg-[#FF5A1F] shrink-0" />
            <h2 className="text-lg font-bold text-[#FF5A1F] tracking-tight">Projects</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#181920] border border-white/5 text-xs font-mono text-zinc-400">
              {filteredProjects.length}
            </span>
            {!isAllMonths && (
              <span className="text-xs text-zinc-500 hidden sm:inline">
                in {selectedMonthLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <ReceiptText className="w-3.5 h-3.5 text-[#FF5A1F]" />
            <span>Combine Projects ({filteredProjects.length})</span>
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="border-b border-white/[0.06] text-white/40 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 font-medium">PROJECT NAME</th>
                <th className="py-3 px-3 font-medium">STATUS</th>
                <th className="py-3 px-3 font-medium text-right sm:text-left">CONTRACT VALUE</th>
                <th className="py-3 px-3 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p: any) => (
                  <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <span className="font-medium text-white text-sm block">
                        {p.projectName || p.title}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={p.status || 'start_process'} type="project" />
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-white text-sm text-right sm:text-left">
                      {formatINR(p.projectValue ?? p.totalAmount)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        to={`/admin/projects/${p._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <span>View</span>
                        <span className="text-white/90">&rarr;</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-white/40 font-mono">
                    {isAllMonths ? (
                      'No projects found for this client.'
                    ) : (
                      <div className="space-y-1.5 font-sans">
                        <p className="text-zinc-400">No active projects found for {selectedMonthLabel}.</p>
                        <button
                          type="button"
                          onClick={() => setSelectedMonth('all')}
                          className="text-xs text-[#FF5A1F] hover:underline font-medium cursor-pointer"
                        >
                          View all projects across all months &rarr;
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Card */}
      <div className="rounded-2xl bg-[#0c0d12] border border-white/[0.06] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-[#FF5A1F] shrink-0" />
              <h2 className="text-lg font-bold text-[#FF5A1F] tracking-tight">Payment history</h2>
            </div>
            <p className="text-xs text-white/50 font-normal mt-0.5">
              {isAllMonths ? (
                <>
                  {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'} &bull; Total received {formatINR(cashCollected)}
                </>
              ) : (
                <>
                  {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'} in {selectedMonthLabel} &bull; Received {formatINR(cashCollected)}
                </>
              )}
            </p>
          </div>
          {!isAllMonths && (
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className="text-xs text-[#FF5A1F] hover:underline self-start sm:self-auto cursor-pointer"
            >
              Show all payment history
            </button>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="border-b border-white/[0.06] text-white/40 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 font-medium">DATE</th>
                <th className="py-3 px-3 font-medium">AMOUNT</th>
                <th className="py-3 px-3 font-medium">METHOD</th>
                <th className="py-3 px-3 font-medium">NOTES</th>
                <th className="py-3 px-3 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p: any) => {
                  const formattedDate = new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const methodDisplay = (p.paymentMethod || 'bank_transfer')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l: string) => l.toUpperCase());

                  const projObj = p.projectId;
                  const projTitle = projObj?.projectName || projObj?.title;
                  const projId = projObj?._id || (typeof projObj === 'string' ? projObj : null);

                  return (
                    <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3 font-mono text-white/80">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-[#FF5A1F]">
                        {formatINR(p.amount || 0)}
                      </td>
                      <td className="py-3.5 px-3 text-white/70">
                        {methodDisplay}
                      </td>
                      <td className="py-3.5 px-3 text-white/70 truncate max-w-[160px]">
                        {p.notes || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div
                          className="relative inline-block text-left"
                          ref={activePaymentMenuId === p._id ? paymentMenuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => setActivePaymentMenuId(activePaymentMenuId === p._id ? null : p._id)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {activePaymentMenuId === p._id && (
                            <div className="absolute right-0 mt-1 w-36 rounded-xl bg-[#0e0f15] border border-white/[0.1] shadow-2xl py-1 z-30">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePaymentMenuId(null);
                                  handleDeletePayment(p._id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/40 font-mono">
                    {isAllMonths ? (
                      'No client payments recorded yet. Click "Record Payment" to add one.'
                    ) : (
                      <div className="space-y-1.5 font-sans">
                        <p className="text-zinc-400">No client payments recorded in {selectedMonthLabel}.</p>
                        <button
                          type="button"
                          onClick={() => setSelectedMonth('all')}
                          className="text-xs text-[#FF5A1F] hover:underline font-medium cursor-pointer"
                        >
                          View all payment history &rarr;
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="premium-modal animate-modal-scale relative w-full max-w-md p-5 sm:p-6 space-y-4 text-white my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm">Edit Client Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded bg-white/5 text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Company / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Primary Contact Person</label>
                <input
                  type="text"
                  value={editForm.contactPerson}
                  onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 00000"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@brand.com"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-white/60 block mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={editForm.taxId}
                  onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Office Address</label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04810] font-medium cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Update Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Client Payment Modal */}
      {isPayModalOpen && (
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="premium-modal animate-modal-scale relative w-full max-w-md p-5 sm:p-6 space-y-4 text-white text-xs my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm">Record Client Payment</h3>
                <p className="text-[11px] text-white/40 font-mono">{client.name || client.companyName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded bg-white/5 text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contract Summary Box */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/50">TOTAL:</span>
                <span className="font-mono font-semibold text-white">{formatINR(allTimeContractVal)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/50">PAID:</span>
                <span className="font-mono text-white font-semibold">{formatINR(allTimePaidVal)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-white/5">
                <span className="text-white/70 font-medium">PENDING:</span>
                <span className="font-mono font-bold text-[#FF5A1F]">{formatINR(allTimeRemainingDue)}</span>
              </div>
              {allTimeContractVal > 0 && allTimeRemainingDue <= 0 && (
                <div className="text-[11px] text-emerald-400 font-medium pt-1">
                  ✓ This client account is fully settled.
                </div>
              )}
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-white/60 block">Amount (₹) *</label>
                  {allTimeRemainingDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(allTimeRemainingDue))}
                      className="text-[10px] text-[#FF5A1F] hover:underline font-mono"
                    >
                      Fill Max ({formatINR(allTimeRemainingDue)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max={allTimeRemainingDue > 0 ? allTimeRemainingDue : undefined}
                  step="any"
                  disabled={allTimeContractVal > 0 && allTimeRemainingDue <= 0}
                  placeholder={allTimeRemainingDue > 0 ? `Max: ${allTimeRemainingDue}` : 'Enter amount'}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className={`w-full px-3 py-2 bg-white/5 border rounded-xl text-white font-mono focus:outline-none ${
                    allTimeContractVal > 0 && Number(payAmount) > allTimeRemainingDue
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-white/10 focus:border-[#FF5A1F]'
                  }`}
                />
                {allTimeContractVal > 0 && Number(payAmount) > allTimeRemainingDue && (
                  <p className="text-[11px] text-red-400 mt-1 font-medium">
                    Payment cannot exceed remaining client balance of {formatINR(allTimeRemainingDue)}.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Receipt Date</label>
                  <CustomDatePicker
                    value={payDate}
                    onChange={(val) => setPayDate(val)}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Method</label>
                  <CustomSelect
                    value={payMethod}
                    onChange={(val) => setPayMethod(val)}
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Reference (UTR / Txn ID)</label>
                <input
                  type="text"
                  placeholder="Optional reference"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Advance, Installment, etc."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingPayment ||
                    (allTimeContractVal > 0 && allTimeRemainingDue <= 0) ||
                    (allTimeContractVal > 0 && Number(payAmount) > allTimeRemainingDue) ||
                    Number(payAmount) <= 0 ||
                    !payAmount
                  }
                  className="px-4 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all cursor-pointer shadow-sm"
                >
                  {submittingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Combine Projects & Receipt Modal */}
      {isReceiptModalOpen && (
        <ClientReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          client={client}
          projects={allProjects}
          onRefreshClient={fetchClient}
          initialMonth={selectedMonth}
          deductions={deductions}
        />
      )}

      {/* Add Deduction Modal */}
      {isDeductionModalOpen && (
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="premium-modal animate-modal-scale relative w-full max-w-sm p-5 sm:p-6 space-y-4 text-white text-xs my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm">Add Project Deduction</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeductionModalOpen(false)}
                className="p-1 rounded bg-white/5 text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDeduction} className="space-y-3">
              <div>
                <label className="text-white/60 block mb-1">Project Name *</label>
                <input
                  type="text"
                  placeholder="deduction label"
                  required
                  value={deductionProjectName}
                  onChange={(e) => setDeductionProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={deductionDate}
                    onChange={(e) => setDeductionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="0"
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsDeductionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] text-white font-medium cursor-pointer shadow-sm"
                >
                  Add Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
