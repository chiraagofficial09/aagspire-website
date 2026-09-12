import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  CheckSquare,
  Square,
  FileText,
  Building2,
  Receipt,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from './Toast';
import { formatINR, parseAmount } from '../../utils/formatters';
import { CustomSelect } from './CustomSelect';

interface ClientReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  projects: any[];
}

export const ClientReceiptModal: React.FC<ClientReceiptModalProps> = ({
  isOpen,
  onClose,
  client,
  projects,
}) => {
  const toast = useToast();
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Includes all approved deliverables and production revisions.');
  const INVOICE_INCREMENT_STEP = 3;

  const getInitialInvoiceNo = (code?: string): string => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aagspire_next_invoice_no');
      if (saved && saved.trim()) return saved.trim();
    }
    if (!code) return '10';
    const digits = code.match(/\d+/g);
    if (digits && digits.length > 0) {
      const last = digits[digits.length - 1];
      const parsed = parseInt(last, 10);
      return !isNaN(parsed) ? String(parsed) : last;
    }
    return '10';
  };

  const [invoiceNumber, setInvoiceNumber] = useState<string>(() =>
    getInitialInvoiceNo(client?.clientCode)
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

  const [activeTab, setActiveTab] = useState<'select' | 'preview'>('preview');
  const [downloading, setDownloading] = useState(false);

  // Fetch persistent invoice counter from MongoDB when modal opens
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      if (client?.lastInvoiceNumber) {
        setInvoiceNumber(client.lastInvoiceNumber);
      } else {
        api
          .get('/admin/clients/invoice-counter')
          .then((res) => {
            if (isMounted && res.data?.data?.currentNumber) {
              const dbNum = String(res.data.data.currentNumber);
              setInvoiceNumber(dbNum);
              if (typeof window !== 'undefined') {
                localStorage.setItem('aagspire_next_invoice_no', dbNum);
              }
            }
          })
          .catch((err) => {
            console.error('Failed to fetch invoice counter from DB:', err);
          });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, client?._id, client?.lastInvoiceNumber]);

  // Default select all client projects
  useEffect(() => {
    if (projects && projects.length > 0) {
      setSelectedProjectIds(projects.map((p) => p._id));
    }
  }, [projects]);

  if (!isOpen || !client) return null;

  const toggleProject = (id: string) => {
    if (selectedProjectIds.includes(id)) {
      setSelectedProjectIds(selectedProjectIds.filter((pId) => pId !== id));
    } else {
      setSelectedProjectIds([...selectedProjectIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedProjectIds(projects.map((p) => p._id));
  };

  const clearAll = () => {
    setSelectedProjectIds([]);
  };

  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p._id));

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

  const handleDownloadPdf = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Please select at least one project deliverable.');
      return;
    }
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      params.append('projectIds', selectedProjectIds.join(','));
      if (invoiceNumber) params.append('invoiceNumber', invoiceNumber);
      if (taxPercent) params.append('taxPercent', taxPercent.toString());
      if (discountAmount) params.append('discountAmount', discountAmount.toString());
      if (notes) params.append('notes', notes);

      const res = await api.get(`/admin/clients/${client._id}/pdf?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeInvoiceName = (invoiceNumber || getInitialInvoiceNo(client?.clientCode) || '001').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Aagspire_Invoice_${safeInvoiceName}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Check if this is a re-download of the same invoice
      const isSameInvoiceReDownload = Boolean(
        (client?.lastInvoiceNumber && client.lastInvoiceNumber.trim() === invoiceNumber.trim()) ||
        res.headers?.['x-invoice-already-issued'] === 'true'
      );

      if (isSameInvoiceReDownload) {
        // Same invoice: Do NOT increment! Keep the exact same invoice number
        toast.success(`Official invoice #${invoiceNumber} downloaded (Same invoice re-downloaded, sequence unchanged).`);
      } else {
        // New invoice: Auto-increment invoice number by +3 for the next invoice
        const curNum = parseInt((invoiceNumber || '10').replace(/\D/g, ''), 10) || 0;
        const nextNum = String(curNum + INVOICE_INCREMENT_STEP);
        handleSetInvoiceNumber(nextNum);
        toast.success(`Official invoice #${invoiceNumber} downloaded! Next invoice number auto-incremented to #${nextNum} (+3).`);
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-ember/15 text-ember border border-ember/25">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Combine Projects & Generate Client Invoice
              </h2>
              <p className="text-xs text-white/50">
                {client.companyName || client.name} &bull; {selectedProjects.length} deliverables selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('select')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'select' ? 'bg-ember text-white font-medium' : 'text-white/60 hover:text-white'
                }`}
              >
                Select Deliverables ({selectedProjects.length})
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'preview' ? 'bg-ember text-white font-medium' : 'text-white/60 hover:text-white'
                }`}
              >
                Invoice Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'select' ? (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">
                  Select which deliverables to combine into this invoice/receipt:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-ember hover:underline font-mono cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-white/20">&bull;</span>
                  <button
                    onClick={clearAll}
                    className="text-xs text-white/50 hover:text-white font-mono cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-2">
                {projects.map((p) => {
                  const isSelected = selectedProjectIds.includes(p._id);
                  const pVal = parseAmount(p.projectValue ?? p.totalAmount);
                  const pPaid = parseAmount(p.paidAmount ?? p.paymentsReceived);
                  const pBal = Math.max(0, pVal - pPaid);

                  return (
                    <div
                      key={p._id}
                      onClick={() => toggleProject(p._id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-ember/10 border-ember/40 text-white'
                          : 'bg-[#121212] border-white/5 text-white/60 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-ember flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-white/30 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-white">{p.projectName || p.title}</p>
                          <p className="text-[11px] font-mono text-white/40">
                            Status: <span className="capitalize text-white/70">{p.status?.replace('_', ' ')}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <p className="text-sm font-bold text-white">{formatINR(pVal)}</p>
                        <p className="text-[10px] text-white/40">
                          Paid: <span className="text-white font-medium">{formatINR(pPaid)}</span> &bull; Due: <span className="text-zinc-300 font-medium">{formatINR(pBal)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pricing Customization Box */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/10 space-y-4">
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
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white font-medium focus:border-ember focus:outline-none"
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
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 block mb-1">Deliverable Remarks / Notes</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-xl text-white focus:border-ember focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Official Receipt / Invoice Preview */
            <div className="receipt-printable space-y-6 bg-[#080808] border border-white/10 rounded-2xl p-6 sm:p-8 text-white shadow-inner">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                <div className="w-[155px] sm:w-[175px]">
                  <img
                    src="/Aagspire_1.svg"
                    alt="Aagspire"
                    className="w-full h-auto object-contain block"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/Aagspire_1.png';
                    }}
                  />
                </div>

                <div className="text-left sm:text-right">
                  <h1 className="text-4xl sm:text-5xl font-black text-[#FF5A1F] tracking-tight leading-none">
                    Invoice
                  </h1>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-[10px] text-white/40 uppercase block mb-1">Billed To / Client</span>
                  <h3 className="text-sm font-bold text-white">{client.companyName || client.name}</h3>
                  {client.contactPerson && <p className="text-xs text-white/50 mt-0.5">Attn: {client.contactPerson}</p>}
                  {/* {client.email && <p className="text-xs text-white/50">{client.email}</p>} */}
                </div>
                <div className="flex flex-col sm:items-end justify-center">
                  <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-2 text-xs">
                    <span className="text-white/40 text-left">Invoice No:</span>
                    <strong
                      onClick={() => {
                        const val = window.prompt('Enter Custom Invoice Number:', invoiceNumber);
                        if (val !== null && val.trim()) handleSetInvoiceNumber(val.trim());
                      }}
                      title="Click to edit Invoice Number"
                      className="text-white font-bold cursor-pointer hover:text-[#FF5A1F] transition-colors text-right justify-self-end"
                    >
                      {invoiceNumber || getInitialInvoiceNo(client?.clientCode)}
                    </strong>

                    <span className="text-white/40 text-left">Date:</span>
                    <span className="text-white text-right justify-self-end">
                      {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>

                    {client.gstNumber && (
                      <>
                        <span className="text-white/40 text-left">GSTIN:</span>
                        <span className="text-[#FF5A1F] font-bold text-right justify-self-end">{client.gstNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Table of Deliverables */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-white/40 text-[10px] uppercase bg-white/[0.02]">
                    <tr>
                      <th className="py-2.5 px-3">NO.</th>
                      <th className="py-2.5 px-3">Project</th>
                      <th className="py-2.5 px-3 text-right">Price (₹)</th>
                      <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedProjects.map((p, idx) => {
                      const pVal = parseAmount(p.grossProjectValue ?? p.projectValue ?? p.totalAmount);
                      const pDiscount = parseAmount(p.discountAmount) || (p.discountPercent ? (pVal * Number(p.discountPercent)) / 100 : 0);
                      const pBal = Math.max(0, pVal - pDiscount);
                      return (
                        <tr key={p._id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-3 text-white/40">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-white block">{p.projectName || p.title}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-white">
                            {formatINR(pVal)}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-300">
                            {pDiscount > 0 ? `-${formatINR(pDiscount)}` : '₹0'}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-300 font-medium">
                            {formatINR(pBal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Totals */}
              <div className="flex justify-end border-t border-white/10 pt-4">
                {/* Calculation Totals */}
                <div className="w-full sm:w-80 text-xs space-y-2">
                  <div className="flex justify-between text-white/60">
                    <span>Combined Subtotal:</span>
                    <span className="text-white font-bold">{formatINR(subtotal)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-white/60">
                      <span>GST ({taxPercent}%):</span>
                      <span className="text-white font-bold">+{formatINR(taxAmount)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-white/60">
                      <span className='text-xs text-zinc-400'>Extra Special Discount:</span>
                      <span className="text-zinc-300 font-bold">-{formatINR(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white/60">
                    <span>Paid Money:</span>
                    <span className="text-white font-bold">-{formatINR(totalPaid)}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-ember/15 border border-ember/30 flex justify-between items-center text-sm font-bold mt-2">
                    <span className="text-white">Balance Due:</span>
                    <span className="text-ember text-base">{formatINR(netBalanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {notes && (
                <div className="border-t border-white/10 pt-3 text-[11px] text-white/40">
                  <span className="text-white/60 font-semibold">Terms & Notes: </span>
                  {notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-[#0a0a0a]">
          <div className="text-xs text-white/50">
            {selectedProjects.length} deliverables &bull; Paid Money: <span className="text-white font-bold">{formatINR(totalPaid)}</span> &bull; Balance Due: <span className="text-ember font-bold">{formatINR(netBalanceDue)}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading || selectedProjects.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-ember to-ember-deep text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(255,90,31,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Generating PDF...' : 'Download Client Invoice (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
