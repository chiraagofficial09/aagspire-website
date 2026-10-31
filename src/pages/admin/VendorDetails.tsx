import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Layers,
  Clock,
  Wallet,
  Hourglass,
  Link2,
  Phone,
  Mail,
  MapPin,
  FileText,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';
import { useAlert } from '../../context/AlertContext';
import { formatINR } from '../../utils/formatters';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';
import { vendorDisplayName } from './Vendors';

const today = () => new Date().toISOString().slice(0, 10);
const toDateInput = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : today());
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const inputClass =
  'w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none';

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
    <div className="relative w-full max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-5 sm:p-8 space-y-5 text-white text-xs my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <h3 className="font-bold text-base tracking-tight text-white">{title}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const AdminVendorDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { showConfirm } = useAlert();
  const [vendor, setVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  const [workModal, setWorkModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [workForm, setWorkForm] = useState({ title: '', amount: '', workDate: today(), description: '', adjustInClientBill: true });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: today(), paymentMethod: 'cash', vendorWorkId: '', notes: '' });

  const availableMonths: MonthOption[] = useMemo(() => {
    const out: MonthOption[] = [];
    for (let i = 0; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      });
    }
    return out;
  }, [now]);

  const fetchVendor = async (monthVal = selectedMonth) => {
    if (!id) return;
    try {
      const qs = monthVal && monthVal !== 'all' ? `?month=${monthVal}` : '';
      const res = await api.get(`/admin/vendors/${id}${qs}`);
      setVendor(res.data.data || res.data.vendor);
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('Vendor not found');
        navigate('/admin/vendors');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendor(selectedMonth);
  }, [id, selectedMonth]);

  const isLinked = Boolean(vendor?.clientId);
  const summary = vendor?.summary || {};

  const inSelectedMonth = (d?: string) => {
    if (selectedMonth === 'all' || !d) return true;
    const dt = new Date(d);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return key === selectedMonth;
  };
  const works: any[] = (vendor?.works || []).filter((w: any) => inSelectedMonth(w.workDate || w.createdAt));
  const payments: any[] = (vendor?.payments || []).filter((p: any) => inSelectedMonth(p.paymentDate || p.createdAt));

  const openAddWork = () => {
    setWorkForm({ title: '', amount: '', workDate: today(), description: '', adjustInClientBill: true });
    setWorkModal({ open: true, editing: null });
  };

  const openEditWork = (w: any) => {
    setWorkForm({
      title: w.title || '',
      amount: String(w.amount ?? ''),
      workDate: toDateInput(w.workDate),
      description: w.description || '',
      adjustInClientBill: w.adjustInClientBill !== false,
    });
    setWorkModal({ open: true, editing: w });
  };

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(workForm.amount);
    if (!workForm.title.trim() || !amount || amount <= 0) {
      toast.error('Project name and a valid amount are required');
      return;
    }
    try {
      setSubmitting(true);
      const payload = { ...workForm, title: workForm.title.trim(), amount };
      if (workModal.editing) {
        await api.patch(`/admin/vendors/${id}/works/${workModal.editing._id}`, payload);
        toast.success('Project updated');
      } else {
        await api.post(`/admin/vendors/${id}/works`, payload);
        toast.success('Project added');
      }
      setWorkModal({ open: false, editing: null });
      fetchVendor();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAdjust = async (w: any) => {
    try {
      await api.patch(`/admin/vendors/${id}/works/${w._id}`, { adjustInClientBill: w.adjustInClientBill === false });
      toast.success(w.adjustInClientBill === false ? 'Adjusted in client bill' : 'Removed from client bill');
      fetchVendor();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project');
    }
  };

  const handleDeleteWork = async (w: any) => {
    const confirmed = await showConfirm({
      title: 'Delete Project',
      message: `Delete "${w.title}"? Payments made for it will be applied to other projects.`,
      confirmText: 'Okay',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/vendors/${id}/works/${w._id}`);
      toast.success('Project deleted');
      fetchVendor();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const openAddPayment = () => {
    setPaymentForm({ amount: '', paymentDate: today(), paymentMethod: 'cash', vendorWorkId: '', notes: '' });
    setPaymentOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/admin/vendors/${id}/payments`, { ...paymentForm, amount, vendorWorkId: paymentForm.vendorWorkId || undefined });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      fetchVendor();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (p: any) => {
    const confirmed = await showConfirm({
      title: 'Delete Payment',
      message: `Delete payment of ${formatINR(p.amount)}?`,
      confirmText: 'Okay',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/vendors/${id}/payments/${p._id}`);
      toast.success('Payment deleted');
      fetchVendor();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete payment');
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-zinc-500 font-mono text-xs">Loading vendor...</div>;
  }
  if (!vendor) {
    return <div className="py-16 text-center text-zinc-500 font-mono text-xs">Vendor not found.</div>;
  }

  const linkedClient = vendor.linkedClient;
  const cards = [
    { label: 'Total', value: summary.total, icon: Layers },
    { label: 'Previous Month Pending', value: summary.previousPending, icon: Clock },
    { label: 'Paid', value: summary.paid, icon: Wallet, note: isLinked && summary.adjusted > 0 ? `${formatINR(summary.adjusted)} adjusted in bill` : '' },
    { label: 'Pending (To Pay)', value: summary.pending, icon: Hourglass },
  ];
  const contactRows = [
    { icon: User, value: vendor.contactPerson },
    { icon: Phone, value: vendor.phone },
    { icon: Mail, value: vendor.email },
    { icon: FileText, value: vendor.gstNumber },
    { icon: MapPin, value: vendor.address },
  ].filter((r) => r.value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link to="/admin/vendors" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Vendors
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F] break-words">{vendorDisplayName(vendor)}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-[11px] text-zinc-500 font-mono">{vendor.vendorCode}</span>
              {linkedClient && (
                <Link
                  to={`/admin/clients/${vendor.clientId}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30 hover:bg-[#FF5A1F]/25"
                  title="Open client"
                >
                  <Link2 className="w-3 h-3" /> CLIENT: {linkedClient.companyName || linkedClient.name}
                </Link>
              )}
            </div>
          </div>
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
            className="w-full sm:w-44"
          />
        </div>
      </div>

      {isLinked && (
        <div className="p-3.5 rounded-xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/25 text-xs text-zinc-300">
          This vendor is also our client. Unpaid project amounts are automatically deducted in their client bill (shown as
          "Vendor Adjustment"). Turn off "In bill" on a project to keep it as pending instead.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="p-4 rounded-xl border border-white/5 bg-[#0c0d12] flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-white/50">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-white/5 text-white/70 border-white/10 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-[#FF5A1F] break-words">{formatINR(value || 0)}</p>
            {note && <p className="text-[10px] text-zinc-500 mt-1">{note}</p>}
          </div>
        ))}
      </div>

      {summary.advance > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          Advance: {formatINR(summary.advance)} paid more than the total of all projects.
        </div>
      )}

      {/* Details */}
      <div className="rounded-2xl bg-[#0c0d12] border border-white/[0.06] p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-4 rounded-full bg-[#FF5A1F] shrink-0" />
          <h2 className="text-sm font-bold text-white tracking-tight">Vendor Details</h2>
        </div>
        {contactRows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {contactRows.map(({ icon: Icon, value }, i) => (
              <div key={i} className="flex items-start gap-2 text-zinc-300 min-w-0">
                <Icon className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <span className="break-words min-w-0">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No contact details added. Use Edit on the Vendors list to add them.</p>
        )}
        {vendor.notes && <p className="text-xs text-zinc-400 pt-1 border-t border-white/[0.04]">{vendor.notes}</p>}
      </div>

      {/* Projects */}
      <div className="rounded-2xl bg-[#08090d] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-4 rounded-full bg-[#FF5A1F] shrink-0" />
            <h2 className="text-sm font-bold text-white tracking-tight">Projects ({works.length})</h2>
          </div>
          <button
            onClick={openAddWork}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Project
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                <th className="py-3 pl-6 pr-4">Project</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Paid</th>
                {isLinked && <th className="py-3 px-4">In Bill</th>}
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 pl-4 pr-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {works.length > 0 ? (
                works.map((w) => (
                  <tr key={w._id} className="hover:bg-white/[0.015]">
                    <td className="py-3 pl-6 pr-4 max-w-[260px]">
                      <div className="font-semibold text-white break-words">{w.title}</div>
                      {w.description && <div className="text-[11px] text-zinc-500 mt-0.5 break-words">{w.description}</div>}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono whitespace-nowrap">{fmtDate(w.workDate)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#FF5A1F]">{formatINR(w.amount)}</td>
                    <td className="py-3 px-4 font-mono text-white/80">{formatINR(w.cashPaid)}</td>
                    {isLinked && (
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAdjust(w)}
                          title={w.adjustInClientBill === false ? 'Click to deduct in client bill' : 'Click to keep as pending instead'}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-mono cursor-pointer transition-colors ${
                            w.adjustInClientBill === false
                              ? 'border-white/10 text-zinc-500 hover:text-white'
                              : 'border-[#FF5A1F]/30 bg-[#FF5A1F]/10 text-[#FF5A1F]'
                          }`}
                        >
                          {w.adjustInClientBill === false ? 'Off' : `− ${formatINR(w.adjusted)}`}
                        </button>
                      </td>
                    )}
                    <td className="py-3 px-4 font-mono font-semibold text-white">{formatINR(w.pending)}</td>
                    <td className="py-3 pl-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditWork(w)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-white cursor-pointer"
                          title="Edit project"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWork(w)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isLinked ? 7 : 6} className="py-10 text-center text-zinc-500">
                    No projects for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-2xl bg-[#08090d] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-4 rounded-full bg-[#FF5A1F] shrink-0" />
            <h2 className="text-sm font-bold text-white tracking-tight">Payments Made ({payments.length})</h2>
          </div>
          <button
            onClick={openAddPayment}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Payment
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                <th className="py-3 pl-6 pr-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 pl-4 pr-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-white/[0.015]">
                    <td className="py-3 pl-6 pr-4 text-zinc-400 font-mono whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#FF5A1F]">{formatINR(p.amount)}</td>
                    <td className="py-3 px-4 text-zinc-300">
                      {PAYMENT_METHODS.find((m) => m.value === p.paymentMethod)?.label || p.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{p.vendorWorkId?.title || 'General'}</td>
                    <td className="py-3 px-4 text-zinc-500 max-w-[200px] break-words">{p.notes || '-'}</td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <button
                        onClick={() => handleDeletePayment(p)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 cursor-pointer"
                        title="Delete payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    No payments for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Project Modal */}
      {workModal.open && (
        <ModalShell title={workModal.editing ? 'Edit Project' : 'Add Project'} onClose={() => setWorkModal({ open: false, editing: null })}>
          <form onSubmit={handleSaveWork} className="space-y-4">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Project / Work *</label>
              <input
                type="text"
                required
                placeholder="e.g. Banner printing 10x4"
                value={workForm.title}
                onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0"
                  value={workForm.amount}
                  onChange={(e) => setWorkForm({ ...workForm, amount: e.target.value })}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Date *</label>
                <CustomDatePicker value={workForm.workDate} onChange={(val) => setWorkForm({ ...workForm, workDate: val })} />
              </div>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Description</label>
              <textarea
                rows={2}
                placeholder="Quantity, size, details..."
                value={workForm.description}
                onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })}
                className={`${inputClass} resize-none`}
              />
            </div>
            {isLinked && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#12131a] border border-white/[0.06] cursor-pointer">
                <input
                  type="checkbox"
                  checked={workForm.adjustInClientBill}
                  onChange={(e) => setWorkForm({ ...workForm, adjustInClientBill: e.target.checked })}
                  className="mt-0.5 accent-[#FF5A1F]"
                />
                <span className="text-zinc-300">
                  Deduct in client bill
                  <span className="block text-[11px] text-zinc-500 mt-0.5">
                    The unpaid amount is subtracted from what {linkedClient?.companyName || linkedClient?.name || 'this client'} owes us.
                  </span>
                </span>
              </label>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setWorkModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Saving...' : workModal.editing ? 'Update Project' : 'Save Project'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Add Payment Modal */}
      {paymentOpen && (
        <ModalShell title="Add Payment" onClose={() => setPaymentOpen(false)}>
          <form onSubmit={handleSavePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Date *</label>
                <CustomDatePicker
                  value={paymentForm.paymentDate}
                  onChange={(val) => setPaymentForm({ ...paymentForm, paymentDate: val })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Method</label>
                <CustomSelect
                  value={paymentForm.paymentMethod}
                  onChange={(val) => setPaymentForm({ ...paymentForm, paymentMethod: String(val) })}
                  options={PAYMENT_METHODS}
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">For Project</label>
                <CustomSelect
                  value={paymentForm.vendorWorkId}
                  onChange={(val) => setPaymentForm({ ...paymentForm, vendorWorkId: String(val) })}
                  options={[
                    { value: '', label: 'General (oldest first)' },
                    ...(vendor.works || []).map((w: any) => ({
                      value: String(w._id),
                      label: w.title,
                      sublabel: `Pending ${formatINR(w.pending + (w.adjusted || 0))}`,
                    })),
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Notes</label>
              <textarea
                rows={2}
                placeholder="Reference, UPI id..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className={`${inputClass} resize-none`}
              />
            </div>
            {isLinked && (
              <p className="text-[11px] text-zinc-500">
                Cash paid here reduces the adjustment in the client bill, so nothing is counted twice.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};
