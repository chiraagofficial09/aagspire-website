import React, { useState, useEffect } from 'react';
import {
  Download,
  Eye,
} from 'lucide-react';
import { api } from '../../services/api';
import { ReceiptModal } from '../../components/work/ReceiptModal';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';

export const EmployeeReceipts: React.FC = () => {
  const toast = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employee/receipts');
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
      const response = await api.get(`/employee/receipts/${receipt._id}/pdf`, {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Receipts</h1>
        <p className="text-xs text-zinc-400 mt-1">Download verifiable disbursement vouchers and certificates.</p>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">RECEIPT NUMBER</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">AMOUNT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">METHOD</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">UTR REF</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DATE</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    Loading payment vouchers...
                  </td>
                </tr>
              ) : receipts.length > 0 ? (
                receipts.map((r) => (
                  <tr key={r._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-white text-xs">
                      {r.receiptNumber}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-white text-sm">
                      {formatINR(r.amount || 0)}
                    </td>
                    <td className="py-4 px-6 uppercase font-mono text-zinc-300 text-xs">
                      {r.paymentMethod || 'Bank Transfer'}
                    </td>
                    <td className="py-4 px-6 font-mono text-zinc-400 text-xs">
                      {r.transactionReference || '-'}
                    </td>
                    <td className="py-4 px-6 font-mono text-zinc-400 text-xs">
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
                          title="View Digital Voucher"
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
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No payment vouchers on record yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {receipts.length} {receipts.length === 1 ? 'receipt' : 'receipts'}
      </div>

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isAdmin={false}
      />
    </div>
  );
};
