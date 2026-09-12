import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';

export const AdminPayments: React.FC = () => {
  const toast = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state (Direct client payment)
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    transactionReference: '',
    notes: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [payRes, cliRes] = await Promise.all([
        api.get('/admin/payments'),
        api.get('/admin/clients'),
      ]);
      setPayments(payRes.data.data || payRes.data.payments || []);
      setClients(cliRes.data.data || cliRes.data.clients || []);
    } catch (err) {
      console.error('Error fetching payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const selClient = clients.find((c) => String(c._id) === String(formData.clientId));
  const contractVal = selClient
    ? Number(
        selClient.totalContractValue ??
        selClient.totalBusinessValue ??
        selClient.financials?.totalContractValue ??
        selClient.financials?.totalBusinessValue ??
        0
      )
    : 0;
  const receivedVal = selClient
    ? Number(
        selClient.totalPaid ??
        selClient.totalPaymentsReceived ??
        selClient.financials?.totalPaid ??
        selClient.financials?.totalPaymentsReceived ??
        0
      )
    : 0;
  const remainingDue = selClient
    ? Math.max(
        0,
        Math.round(
          (selClient.outstanding !== undefined
            ? selClient.outstanding
            : selClient.pendingPayment !== undefined
            ? selClient.pendingPayment
            : contractVal - receivedVal) * 100
        ) / 100
      )
    : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selClient) {
      toast.warning('Please select a valid client');
      return;
    }

    const entered = parseFloat(formData.amount);
    if (isNaN(entered) || entered <= 0) {
      toast.warning('Please enter a valid amount greater than 0');
      return;
    }

    if (contractVal > 0 && remainingDue <= 0) {
      toast.error('This client account is already fully settled. Cannot add further payments.');
      return;
    }

    if (contractVal > 0 && entered > remainingDue) {
      toast.error(`Payment cannot exceed remaining client balance of ${formatINR(remainingDue)} (Total Contract: ${formatINR(contractVal)}).`);
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/admin/payments', {
        ...formData,
        amount: entered,
        clientId: formData.clientId,
      });
      setIsModalOpen(false);
      setFormData({
        clientId: '',
        amount: '',
        paymentMethod: 'bank_transfer',
        transactionReference: '',
        notes: '',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
      toast.success('Payment recorded successfully for client');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this payment record? This action will adjust outstanding balances.')) return;
    try {
      await api.delete(`/admin/payments/${id}`);
      toast.success('Payment deleted successfully');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete payment');
    }
  };

  const filtered = payments.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.projectId?.projectName || p.projectId?.title || '')?.toLowerCase().includes(term) ||
      (p.clientId?.companyName || p.clientId?.name || '')?.toLowerCase().includes(term) ||
      p.transactionReference?.toLowerCase().includes(term)
    );
  });

  const totalCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Payments</h1>
          <p className="text-xs text-zinc-400 mt-1">Track client payments and invoice transactions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d0e14] border border-white/[0.08] self-start sm:self-auto">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Total:</span>
          <span className="text-xs font-semibold text-white font-mono">
            {formatINR(totalCollected)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLIENT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">AMOUNT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">METHOD / UTR</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DATE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">NOTES</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-white">
                        {p.clientId?.companyName || p.clientId?.name || 'Direct Client'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-white font-mono">
                        {formatINR(p.amount || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs text-white uppercase font-mono">{p.paymentMethod?.replace('_', ' ')}</div>
                      <div className="text-xs text-zinc-500 font-mono">{p.transactionReference || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-zinc-400 text-xs font-mono">
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-zinc-400 text-xs">
                      {p.notes || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status="paid" type="payment" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(p._id)}
                        title="Delete Payment"
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'payment' : 'payments'}
      </div>

      {/* Modal with direct client payment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="font-bold text-base tracking-tight text-white">Record Payment</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Client *</label>
                <CustomSelect
                  value={formData.clientId}
                  onChange={(val) => setFormData({ ...formData, clientId: val, amount: '' })}
                  placeholder="Select client"
                  options={clients.map((c) => {
                    const cVal = Number(
                      c.totalContractValue ??
                      c.totalBusinessValue ??
                      c.financials?.totalContractValue ??
                      c.financials?.totalBusinessValue ??
                      0
                    );
                    const rPaid = Number(
                      c.totalPaid ??
                      c.totalPaymentsReceived ??
                      c.financials?.totalPaid ??
                      c.financials?.totalPaymentsReceived ??
                      0
                    );
                    const rDue = Number(
                      c.outstanding !== undefined
                        ? c.outstanding
                        : c.pendingPayment !== undefined
                        ? c.pendingPayment
                        : Math.max(0, cVal - rPaid)
                    );
                    const displayName = c.companyName || c.name || 'Unnamed Client';
                    return {
                      value: c._id,
                      label: `${displayName} (${rDue > 0 ? `Remaining: ₹${rDue.toLocaleString('en-IN')}` : cVal > 0 ? 'Settled' : '₹0'})`,
                    };
                  })}
                />
              </div>

              {selClient && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">TOTAL:</span>
                    <span className="font-mono font-semibold text-white">{formatINR(contractVal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">PAID:</span>
                    <span className="font-mono text-white font-semibold">{formatINR(receivedVal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-white/5">
                    <span className="text-zinc-200 font-semibold">PENDING:</span>
                    <span className="font-mono font-bold text-base text-[#FF5A1F]">{formatINR(remainingDue)}</span>
                  </div>
                  {contractVal > 0 && remainingDue <= 0 && (
                    <div className="text-xs text-emerald-400 font-medium pt-1">
                      ✓ This client account is fully settled.
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-zinc-400 font-medium">Amount Received (₹) *</label>
                  {selClient && remainingDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: String(remainingDue) })}
                      className="text-[10px] text-[#FF5A1F] hover:underline font-mono cursor-pointer"
                    >
                      Fill Max ({formatINR(remainingDue)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max={selClient && remainingDue > 0 ? remainingDue : undefined}
                  step="any"
                  disabled={Boolean(selClient && contractVal > 0 && remainingDue <= 0)}
                  placeholder={selClient ? (remainingDue > 0 ? `Max allowed: ${remainingDue}` : '0') : "e.g. 50000"}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`w-full px-3.5 py-2.5 bg-[#12131a] border rounded-xl text-white font-mono focus:outline-none ${
                    selClient && contractVal > 0 && Number(formData.amount) > remainingDue ? 'border-red-500 focus:border-red-500' : 'border-white/[0.08] focus:border-[#FF5A1F]'
                  }`}
                />
                {selClient && contractVal > 0 && Number(formData.amount) > remainingDue && (
                  <p className="text-[11px] text-red-400 mt-1 font-medium">
                    Payment cannot exceed remaining client balance of {formatINR(remainingDue)}.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Payment Mode</label>
                  <CustomSelect
                    value={formData.paymentMethod}
                    onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS)' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'cash', label: 'Cash' },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Payment Date</label>
                  <CustomDatePicker
                    value={formData.paymentDate}
                    onChange={(val) => setFormData({ ...formData, paymentDate: val })}
                    placeholder="Select payment date"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Transaction Reference / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678"
                  value={formData.transactionReference}
                  onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional payment notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selClient ||
                    (contractVal > 0 && remainingDue <= 0) ||
                    (contractVal > 0 && Number(formData.amount) > remainingDue) ||
                    Number(formData.amount) <= 0 ||
                    !formData.amount
                  }
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
