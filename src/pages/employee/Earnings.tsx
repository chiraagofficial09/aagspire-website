import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { EmptyState } from '../../components/work/EmptyState';

export const EmployeeEarnings: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const res = await api.get('/employee/earnings');
        setData(res.data.data);
      } catch (err) {
        console.error('Error fetching earnings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || data?.earnings?.summary || data?.earnings || data || {};
  const breakdown = data?.projectBreakdown || data?.projects || data?.earnings?.projects || data?.earnings?.projectBreakdown || [];

  const totalCommission = summary.totalEarnedCommission ?? summary.totalEarned ?? 0;
  const totalPaid = summary.totalPaid ?? 0;
  const netPayable = summary.payableBalance ?? summary.totalPayable ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Earnings</h1>
        <p className="text-xs text-zinc-400 mt-1">Commission shares, payment milestones, and disbursed payouts.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Commission</span>
          <div className="text-2xl font-bold text-white font-mono mt-2">{formatINR(totalCommission)}</div>
          <span className="text-xs text-zinc-500 mt-1 block">Proportional to receipts</span>
        </div>

        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Paid Out</span>
          <div className="text-2xl font-bold text-white font-mono mt-2">{formatINR(totalPaid)}</div>
          <span className="text-xs text-zinc-500 mt-1 block">Disbursed via vouchers</span>
        </div>

        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Net Payable</span>
          <div className="text-2xl font-bold text-[#FF5A1F] font-mono mt-2">{formatINR(netPayable)}</div>
          <span className="text-xs text-zinc-500 mt-1 block">Pending next cycle</span>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL COMMISSION</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PAID OUT</th>
                <th className="py-4 px-6 text-right text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">NET PAYABLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {breakdown.length > 0 ? (
                breakdown.map((item: any, idx: number) => {
                  const prjName = item.projectName || item.title || 'Project';
                  const earned = item.earnedCommission ?? item.totalCommission ?? 0;
                  const paid = item.paidAmount ?? item.paidCommission ?? 0;
                  const payable = item.payableBalance ?? item.netPayable ?? 0;

                  return (
                    <tr key={item._id || idx} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-white text-sm block">{prjName}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-white">
                        {formatINR(earned)}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-zinc-500">
                        {formatINR(paid)}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-[#FF5A1F] text-right text-sm">
                        {formatINR(payable)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8">
                    <EmptyState type="earnings" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
