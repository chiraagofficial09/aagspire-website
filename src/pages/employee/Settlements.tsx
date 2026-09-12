import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { ReceiptModal } from '../../components/work/ReceiptModal';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';

export const EmployeeSettlements: React.FC = () => {
  const toast = useToast();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSettlements = async () => {
      try {
        setLoading(true);
        const res = await api.get('/employee/settlements');
        setSettlements(res.data.data || []);
      } catch (err) {
        console.error('Error loading settlements', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettlements();
  }, []);

  const handleViewReceipt = async (settlementId: string) => {
    try {
      const res = await api.get(`/employee/receipts?settlementId=${settlementId}`);
      if (res.data.data?.length > 0) {
        setActiveReceipt(res.data.data[0]);
        setIsModalOpen(true);
      } else {
        toast.info('Payment voucher is being finalized by administration.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settlements</h1>
        <p className="text-xs text-zinc-400 mt-1">Monthly commission cycles, approved disbursements, and digital payment receipts.</p>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CYCLE MONTH</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">GROSS COMMISSION</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">NET DISBURSED</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                    Loading settlements...
                  </td>
                </tr>
              ) : settlements.length > 0 ? (
                settlements.map((s) => (
                  <tr key={s._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-white text-xs">
                      {s.settlementMonth}
                    </td>
                    <td className="py-4 px-6 font-mono text-zinc-300 text-xs">
                      {formatINR(s.totalEarned || 0)}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-white text-sm">
                      {formatINR(s.netPayable || 0)}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={s.status} type="settlement" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      {s.status === 'paid' && (
                        <button
                          onClick={() => handleViewReceipt(s._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#FF5A1F]" />
                          <span>Voucher →</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    No settlements on file yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {settlements.length} {settlements.length === 1 ? 'settlement' : 'settlements'}
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
