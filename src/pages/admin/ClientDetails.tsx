import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  CreditCard,
  Mail,
  Phone,
  ArrowUpRight,
  Pencil,
  Trash2,
  X,
  Download,
  ReceiptText,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';
import { ClientReceiptModal } from '../../components/work/ClientReceiptModal';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';

export const AdminClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

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

  const fetchClient = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/clients/${id}`);
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
      }
    } catch (err) {
      console.error('Error fetching client details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchClient();
  }, [id]);

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
    if (!window.confirm(`Are you sure you want to delete "${client.companyName || client.name}"?`)) return;
    try {
      await api.delete(`/admin/clients/${id}`);
      toast.success('Client deleted successfully');
      navigate('/admin/clients');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete client');
    }
  };

  const handleQuickDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await api.get(`/admin/clients/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeCode = (client.clientCode || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `Aagspire_Statement_${safeCode}.pdf`);
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

  const totalContractVal = Number(client?.totalContractValue || client?.financials?.totalBusinessValue || 0);
  const totalPaidVal = Number(client?.totalPaid || client?.financials?.totalPaymentsReceived || 0);
  const remainingDueVal = Math.max(0, totalContractVal - totalPaidVal);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = parseFloat(payAmount);
    if (!entered || entered <= 0) {
      toast.error('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (totalContractVal > 0 && remainingDueVal <= 0) {
      toast.error('This client account is already fully paid. Cannot add further payments.');
      return;
    }
    if (totalContractVal > 0 && entered > remainingDueVal) {
      toast.error(`Cannot record more than remaining client balance (${formatINR(remainingDueVal)}).`);
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
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
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
        <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!client) {
    return <div className="p-8 text-center text-white/50 font-mono">Client not found.</div>;
  }

  const projects = client.projects || [];
  const payments = client.payments || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/clients"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{client.name || client.companyName}</h1>
            </div>
            <p className="text-xs text-white/50 font-mono">
              Rep: {client.contactPerson || 'Direct Representative'} &bull; {client.email || 'No email provided'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Client</span>
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-medium text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10 space-y-1">
          <span className="text-[11px] font-mono font-bold text-white/60 uppercase">TOTAL</span>
          <p className="text-xl font-bold font-mono text-white">
            {formatINR(client.totalContractValue || client.financials?.totalBusinessValue)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10 space-y-1">
          <span className="text-[11px] font-mono font-bold text-white/60 uppercase">PAID</span>
          <p className="text-xl font-bold font-mono text-white">
            {formatINR(client.totalPaid || client.financials?.totalPaymentsReceived)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10 space-y-1">
          <span className="text-[11px] font-mono font-bold text-white/60 uppercase">PENDING</span>
          <p className="text-xl font-bold font-mono text-ember">
            {formatINR((client.totalContractValue || client.financials?.totalBusinessValue || 0) - (client.totalPaid || client.financials?.totalPaymentsReceived || 0))}
          </p>
        </div>
      </div>

      <div className="premium-card rounded-2xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Contracted Projects & Deliverables</h2>
            <p className="text-xs font-mono text-white/40">{projects.length} deliverables contracted</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="btn-premium btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
            >
              <ReceiptText className="w-3.5 h-3.5 text-ember" />
              <span>Combine Projects</span>
            </button>
            <button
              onClick={handleQuickDownloadPdf}
              disabled={downloadingPdf}
              className="btn-premium btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? 'Generating...' : 'Download Statement PDF'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-white/40 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Project Title</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Contract Value</th>
                <th className="py-2.5 px-3 text-right">View Project</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.length > 0 ? (
                projects.map((p: any) => (
                  <tr key={p._id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white block">{p.projectName || p.title}</span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={p.status} type="project" />
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-white">
                      {formatINR(p.projectValue ?? p.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/admin/projects/${p._id}`}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white inline-flex"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-white/40 font-mono">
                    No projects found for this client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Payment History Section */}
      <div className="premium-card rounded-2xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Client Payment History</h2>
            <p className="text-xs font-mono text-white/40">
              {payments.length} payments recorded &bull; Total Received: {formatINR(totalPaidVal)}
            </p>
          </div>
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] text-white font-medium text-xs transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-white/40 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Receipt Date</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Reference / UTR</th>
                <th className="py-2.5 px-3">Attributed Deliverable</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.length > 0 ? (
                payments.map((p: any) => (
                  <tr key={p._id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono text-white/70">
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {formatINR(p.amount || 0)}
                    </td>
                    <td className="py-3 px-3 uppercase font-mono text-white/60 text-[11px]">
                      {p.paymentMethod?.replace('_', ' ') || 'Bank Transfer'}
                    </td>
                    <td className="py-3 px-3 font-mono text-white/50">
                      {p.transactionReference || '-'}
                    </td>
                    <td className="py-3 px-3">
                      {p.projectId ? (
                        <Link
                          to={`/admin/projects/${p.projectId._id || p.projectId}`}
                          className="text-ember hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <span>{p.projectId.projectName || p.projectId.title || 'View Project'}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-white/40 font-mono italic">Client Balance</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-white/50 truncate max-w-[150px]">
                      {p.notes || '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeletePayment(p._id)}
                        title="Delete Payment Entry"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/40 font-mono">
                    No client payments recorded yet. Click "Record Payment" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="premium-modal animate-modal-scale relative w-full max-w-md p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm">Edit Client Details</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded bg-white/5 text-white/60 hover:text-white">
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
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Primary Contact Person</label>
                <input
                  type="text"
                  value={editForm.contactPerson}
                  onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-white/60 block mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={editForm.taxId}
                  onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 block mb-1">Office Address</label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none resize-none"
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
                  className="px-4 py-1.5 rounded-lg bg-ember text-white hover:bg-ember-deep font-medium cursor-pointer"
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
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="premium-modal animate-modal-scale relative w-full max-w-md p-6 space-y-4 text-white text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm">Record Client Payment</h3>
                <p className="text-[11px] text-white/40 font-mono">{client.name || client.companyName}</p>
              </div>
              <button
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
                <span className="font-mono font-semibold text-white">{formatINR(totalContractVal)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/50">PAID:</span>
                <span className="font-mono text-white font-semibold">{formatINR(totalPaidVal)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-white/5">
                <span className="text-white/70 font-medium">PENDING:</span>
                <span className="font-mono font-bold text-[#FF5A1F]">{formatINR(remainingDueVal)}</span>
              </div>
              {totalContractVal > 0 && remainingDueVal <= 0 && (
                <div className="text-[11px] text-emerald-400 font-medium pt-1">
                  ✓ This client account is fully settled.
                </div>
              )}
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-white/60 block">Amount (₹) *</label>
                  {remainingDueVal > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(remainingDueVal))}
                      className="text-[10px] text-ember hover:underline font-mono"
                    >
                      Fill Max ({formatINR(remainingDueVal)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max={remainingDueVal > 0 ? remainingDueVal : undefined}
                  step="any"
                  disabled={totalContractVal > 0 && remainingDueVal <= 0}
                  placeholder={remainingDueVal > 0 ? `Max: ${remainingDueVal}` : 'Enter amount'}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className={`w-full px-3 py-2 bg-white/5 border rounded-xl text-white font-mono focus:outline-none ${
                    totalContractVal > 0 && Number(payAmount) > remainingDueVal
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-white/10 focus:border-ember'
                  }`}
                />
                {totalContractVal > 0 && Number(payAmount) > remainingDueVal && (
                  <p className="text-[11px] text-red-400 mt-1 font-medium">
                    Payment cannot exceed remaining client balance of {formatINR(remainingDueVal)}.
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
                  <label className="text-white/60 block mb-1">Payment Method</label>
                  <CustomSelect
                    value={payMethod}
                    onChange={(val) => setPayMethod(val)}
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'cash', label: 'Cash' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Transaction Ref / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UTR202609081234"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Advance, Installment, etc."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
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
                    (totalContractVal > 0 && remainingDueVal <= 0) ||
                    (totalContractVal > 0 && Number(payAmount) > remainingDueVal) ||
                    Number(payAmount) <= 0 ||
                    !payAmount
                  }
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all cursor-pointer shadow-sm"
                >
                  {submittingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Combine Projects & Receipt Modal */}
      <ClientReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        client={client}
        projects={projects}
      />
    </div>
  );
};
