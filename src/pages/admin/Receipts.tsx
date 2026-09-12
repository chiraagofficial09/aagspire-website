import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Eye,
} from 'lucide-react';
import { api } from '../../services/api';
import { ReceiptModal } from '../../components/work/ReceiptModal';
import { EmptyState } from '../../components/work/EmptyState';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';

export const AdminReceipts: React.FC = () => {
  const toast = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/receipts');
      setReceipts(res.data.data || []);
    } catch (err) {
      console.error('Error fetching receipts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleDownloadPdf = async (receipt: any) => {
    try {
      const response = await api.get(`/admin/receipts/${receipt._id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receipt.receiptNumber || 'Receipt'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading PDF', err);
      toast.error('Failed to download PDF');
    }
  };

  const filtered = receipts.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.receiptNumber?.toLowerCase().includes(term) ||
      r.employeeId?.name?.toLowerCase().includes(term) ||
      r.employeeId?.fullName?.toLowerCase().includes(term) ||
      r.employeeId?.employeeCode?.toLowerCase().includes(term) ||
      r.transactionReference?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Receipts</h1>
        <p className="text-xs text-zinc-400 mt-1">Verifiable payment vouchers and transaction receipts.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search receipts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">RECEIPT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">BENEFICIARY</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">AMOUNT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">METHOD / UTR</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DATE</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    Loading receipts...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((r) => (
                  <tr key={r._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-white text-xs">
                      {r.receiptNumber}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-white text-sm block">
                        {r.employeeId?.fullName || r.employeeId?.name || 'Staff Member'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-white text-sm">
                      {formatINR(r.amount || 0)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs text-white uppercase font-mono">{r.paymentMethod || 'Bank transfer'}</div>
                      <div className="text-xs text-zinc-500 font-mono">{r.transactionReference || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-zinc-400 text-xs font-mono">
                      {new Date(r.issuedAt || r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setActiveReceipt(r);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                          title="View Voucher"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(r)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState type="receipts" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'receipt' : 'receipts'}
      </div>

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isAdmin={true}
      />
    </div>
  );
};
