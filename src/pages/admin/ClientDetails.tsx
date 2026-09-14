import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { api } from '../../services/api';
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

  // Dropdown states
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const [activePaymentMenuId, setActivePaymentMenuId] = useState<string | null>(null);
  const paymentMenuRef = useRef<HTMLDivElement>(null);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payProjectId, setPayProjectId] = useState('');
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
  const percentPaid = totalContractVal > 0 ? Math.min(100, Math.round((totalPaidVal / totalContractVal) * 100)) : 0;

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
        projectId: payProjectId || (projects.length === 1 ? projects[0]._id : undefined),
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
      setPayProjectId('');
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
        <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!client) {
    return <div className="p-8 text-center text-white/50 font-mono">Client not found.</div>;
  }

  const projects = client.projects || [];
  const payments = client.payments || [];

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
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {client.name || client.companyName}
            </h1>
            <p className="text-xs text-white/50 font-normal mt-0.5">
              {client.contactPerson || 'Direct Representative'} &bull; {client.email || 'No email provided'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Statement PDF */}
          <button
            type="button"
            onClick={handleQuickDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0c0d12] border border-white/[0.08] hover:bg-white/5 text-white text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>{downloadingPdf ? 'Generating...' : 'Statement PDF'}</span>
          </button>

          {/* Record Payment (Orange CTA) */}
          <button
            type="button"
            onClick={() => {
              setPayAmount('');
              setPayRef('');
              setPayNotes('');
              setPayDate(new Date().toISOString().slice(0, 10));
              setPayMethod('bank_transfer');
              setPayProjectId(projects.length === 1 ? projects[0]._id : '');
              setIsPayModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <span>Record Payment</span>
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

      {/* Financial Overview Card */}
      <div className="rounded-2xl bg-[#0c0d12] border border-white/[0.06] p-6 sm:p-7 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <span className="text-xs text-white/50 block font-normal">Total contract</span>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {formatINR(totalContractVal)}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-white/50 block font-normal">Received</span>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {formatINR(totalPaidVal)}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-white/50 block font-normal">Outstanding</span>
            <p className="text-2xl sm:text-3xl font-bold text-[#FF5A1F] tracking-tight">
              {formatINR(remainingDueVal)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="w-full bg-[#181920] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FF5A1F] h-full rounded-full transition-all duration-500"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
          <p className="text-xs text-white/50 font-normal">
            {percentPaid}% payment received
          </p>
        </div>
      </div>

      {/* Projects Card */}
      <div className="rounded-2xl bg-[#0c0d12] border border-white/[0.06] p-6 space-y-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white tracking-tight">Projects</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-[#181920] border border-white/5 text-xs font-mono text-zinc-400">
            {projects.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-white/40 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 font-medium">PROJECT NAME</th>
                <th className="py-3 px-3 font-medium">STATUS</th>
                <th className="py-3 px-3 font-medium text-right sm:text-left">CONTRACT VALUE</th>
                <th className="py-3 px-3 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {projects.length > 0 ? (
                projects.map((p: any) => (
                  <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <span className="font-medium text-white text-sm block">
                        {p.projectName || p.title}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#181920] border border-white/5 text-xs text-zinc-300 font-medium capitalize">
                        {p.status || 'Signed'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-white text-sm text-right sm:text-left">
                      {formatINR(p.projectValue ?? p.totalAmount)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        to={`/admin/projects/${p._id}`}
                        className="text-[#FF5A1F] hover:underline font-medium inline-flex items-center gap-1 text-xs"
                      >
                        <span>View details</span>
                        <span>&rarr;</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-white/40 font-mono">
                    No projects found for this client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Card */}
      <div className="rounded-2xl bg-[#0c0d12] border border-white/[0.06] p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Payment history</h2>
          <p className="text-xs text-white/50 font-normal mt-0.5">
            {payments.length} {payments.length === 1 ? 'payment' : 'payments'} &bull; Total received {formatINR(totalPaidVal)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-white/40 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 font-medium">DATE</th>
                <th className="py-3 px-3 font-medium">AMOUNT</th>
                <th className="py-3 px-3 font-medium">METHOD</th>
                <th className="py-3 px-3 font-medium">REFERENCE</th>
                <th className="py-3 px-3 font-medium">PROJECT</th>
                <th className="py-3 px-3 font-medium">NOTES</th>
                <th className="py-3 px-3 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {payments.length > 0 ? (
                payments.map((p: any) => {
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
                      <td className="py-3.5 px-3 font-mono font-bold text-white">
                        {formatINR(p.amount || 0)}
                      </td>
                      <td className="py-3.5 px-3 text-white/70">
                        {methodDisplay}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-white/50">
                        {p.transactionReference || '—'}
                      </td>
                      <td className="py-3.5 px-3">
                        {projId ? (
                          <Link
                            to={`/admin/projects/${projId}`}
                            className="text-[#FF5A1F] hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <span>{projTitle || 'View Project'}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-white/40 font-mono italic">—</span>
                        )}
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
                  <td colSpan={7} className="py-8 text-center text-white/40 font-mono">
                    No client payments recorded yet. Click &quot;Record Payment&quot; to add one.
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
                  <label className="text-white/60 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
        <div className="premium-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="premium-modal animate-modal-scale relative w-full max-w-md p-6 space-y-4 text-white text-xs shadow-2xl">
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
                      className="text-[10px] text-[#FF5A1F] hover:underline font-mono"
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
                      : 'border-white/10 focus:border-[#FF5A1F]'
                  }`}
                />
                {totalContractVal > 0 && Number(payAmount) > remainingDueVal && (
                  <p className="text-[11px] text-red-400 mt-1 font-medium">
                    Payment cannot exceed remaining client balance of {formatINR(remainingDueVal)}.
                  </p>
                )}
              </div>

              {projects.length > 0 && (
                <div>
                  <label className="text-white/60 block mb-1">Attributed Deliverable / Project (Optional)</label>
                  <CustomSelect
                    value={payProjectId}
                    onChange={(val) => setPayProjectId(val)}
                    options={[
                      { value: '', label: 'General / Entire Client Account' },
                      ...projects.map((p: any) => ({
                        value: p._id,
                        label: `${p.projectName || p.title} (${formatINR(p.projectValue ?? p.totalAmount)})`,
                      })),
                    ]}
                  />
                </div>
              )}

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
                    (totalContractVal > 0 && remainingDueVal <= 0) ||
                    (totalContractVal > 0 && Number(payAmount) > remainingDueVal) ||
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
      <ClientReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        client={client}
        projects={projects}
      />
    </div>
  );
};
