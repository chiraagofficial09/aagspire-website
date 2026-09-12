import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { ReceiptModal } from '../../components/work/ReceiptModal';
import { useToast } from '../../components/work/Toast';
import { formatINR } from '../../utils/formatters';
import { CustomSelect } from '../../components/work/CustomSelect';
import { EmptyState } from '../../components/work/EmptyState';

export const AdminSettlements: React.FC = () => {
  const toast = useToast();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [activeSettlement, setActiveSettlement] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Generate form
  const [selectedEmp, setSelectedEmp] = useState('');
  const [settlementMonth, setSettlementMonth] = useState(new Date().toISOString().slice(0, 7));
  const [adjustments, setAdjustments] = useState('');
  const [notes, setNotes] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Pay form
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const [sRes, eRes] = await Promise.all([
        api.get('/admin/settlements'),
        api.get('/admin/employees'),
      ]);
      setSettlements(sRes.data.data || sRes.data.settlements || []);
      setEmployees(eRes.data.data || eRes.data.employees || []);
    } catch (err) {
      console.error('Error fetching settlements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handlePreview = async () => {
    if (!selectedEmp) return;
    try {
      setPreviewLoading(true);
      const res = await api.get(
        `/admin/settlements/preview?employeeId=${selectedEmp}&month=${settlementMonth}`
      );
      setPreviewData(res.data.data || res.data.preview);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to preview settlement');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await api.post('/admin/settlements', {
        employeeId: selectedEmp,
        settlementMonth,
        adjustments: adjustments ? Number(adjustments) : 0,
        notes,
      });
      toast.success('Settlement cycle committed');
      setIsGenModalOpen(false);
      setPreviewData(null);
      setAdjustments('');
      setNotes('');
      fetchSettlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate settlement');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/admin/settlements/${id}/approve`);
      toast.success('Settlement approved for disbursement');
      fetchSettlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve settlement');
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSettlement) return;
    try {
      const res = await api.post(`/admin/settlements/${activeSettlement._id}/pay`, {
        paymentMethod: payMethod,
        transactionReference: payRef,
      });
      toast.success('Settlement disbursed and voucher issued');
      setIsPayModalOpen(false);
      fetchSettlements();
      if (res.data.data?.receipt || res.data.receipt) {
        setActiveReceipt(res.data.data?.receipt || res.data.receipt);
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete payout');
    }
  };

  const handleViewReceipt = async (settlementId: string) => {
    try {
      const res = await api.get(`/admin/receipts?settlementId=${settlementId}`);
      const rList = res.data.data || res.data.receipts || [];
      if (rList.length > 0) {
        setActiveReceipt(rList[0]);
        setIsReceiptModalOpen(true);
      } else {
        toast.info('No voucher found for this settlement yet');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settlement receipt');
    }
  };

  const totalDisbursed = settlements
    .filter((s) => s.status === 'paid')
    .reduce((acc, s) => acc + Number(s.finalPayable ?? s.netPayable ?? 0), 0);

  const pendingApprovals = settlements.filter(
    (s) => s.status === 'draft' || s.status === 'calculated' || s.status === 'approved'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Settlements</h1>
          <p className="text-xs text-zinc-400 mt-1">Payroll waterfall and employee commission disbursements.</p>
        </div>
        <button
          onClick={() => {
            setIsGenModalOpen(true);
            setPreviewData(null);
            setAdjustments('');
            setNotes('');
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Settlement</span>
        </button>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-[#08090d] p-5 rounded-2xl border border-white/[0.06]">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">Total Disbursed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-white font-mono">{formatINR(totalDisbursed)}</span>
            <span className="text-[11px] font-medium text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
              Verified
            </span>
          </div>
        </div>

        <div className="bg-[#08090d] p-5 rounded-2xl border border-white/[0.06]">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">Pending Cycles</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-bold text-ember font-mono">{pendingApprovals}</span>
            <span className="text-[11px] font-medium text-ember bg-ember/10 px-2.5 py-0.5 rounded-full border border-ember/20">
              Active
            </span>
          </div>
        </div>

        <div className="bg-[#08090d] p-5 rounded-2xl border border-white/[0.06]">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">Discount Protection</span>
          <div className="flex items-center gap-2 mt-2">
            <ShieldCheck className="w-4 h-4 text-[#FF5A1F]" />
            <span className="text-xs font-semibold text-zinc-200">
              Auto Pro-Rata Scaling
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            Client discounts automatically adjust staff pools & debt reserves.
          </p>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CYCLE MONTH</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">BENEFICIARY</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">GROSS EARNED</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">ADJUSTMENTS</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">NET PAYABLE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading settlements...
                  </td>
                </tr>
              ) : settlements.length > 0 ? (
                settlements.map((s) => {
                  const empName = s.employeeName || s.employee?.name || s.employeeId?.fullName || s.employeeId?.name || 'Staff Member';
                  const grossAmt = Number(s.grossEarned ?? s.totalEarned ?? 0);
                  const netAmt = Number(s.finalPayable ?? s.netPayable ?? 0);
                  const adjAmt = Number(s.adjustments || 0);
                  const isDraft = s.status === 'draft' || s.status === 'calculated';
                  const isApproved = s.status === 'approved';
                  const isPaid = s.status === 'paid';

                  return (
                    <tr key={s._id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-6 font-mono text-white font-medium text-xs">
                        {s.settlementMonth || (s.periodStart ? new Date(s.periodStart).toISOString().slice(0, 7) : 'Current')}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-white text-sm block">{empName}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-zinc-300 text-xs">
                        {formatINR(grossAmt)}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">
                        {adjAmt !== 0 ? (
                          <span className={adjAmt < 0 ? 'text-zinc-400' : 'text-white'}>
                            {adjAmt > 0 ? `+${formatINR(adjAmt)}` : formatINR(adjAmt)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-white text-sm">
                        {formatINR(netAmt)}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={s.status === 'calculated' ? 'draft' : s.status} type="settlement" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isDraft && (
                            <button
                              onClick={() => handleApprove(s._id)}
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/20 transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {isApproved && (
                            <button
                              onClick={() => {
                                setActiveSettlement(s);
                                setIsPayModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-ember hover:bg-ember-deep text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
                            >
                              Disburse
                            </button>
                          )}
                          {isPaid && (
                            <button
                              onClick={() => handleViewReceipt(s._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#FF5A1F]" />
                              <span>Voucher →</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      type="settlements"
                      actionLabel="Generate Settlement"
                      onAction={() => setIsGenModalOpen(true)}
                    />
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

      {/* Generate Settlement Cycle Modal */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="font-bold text-base tracking-tight text-white">Generate Settlement Cycle</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Calculates approved deliverables & pro-rata client discounts.</p>
              </div>
              <button
                onClick={() => setIsGenModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Select Beneficiary Staff *</label>
                  <CustomSelect
                    value={selectedEmp}
                    onChange={(val) => {
                      setSelectedEmp(val);
                      setPreviewData(null);
                    }}
                    placeholder="Select staff"
                    options={employees.map((e) => ({
                      value: e._id,
                      label: e.fullName || e.name,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Settlement Month *</label>
                  <input
                    type="month"
                    value={settlementMonth}
                    onChange={(e) => {
                      setSettlementMonth(e.target.value);
                      setPreviewData(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  disabled={!selectedEmp || previewLoading}
                  onClick={handlePreview}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5A1F]" />
                  <span>{previewLoading ? 'Calculating...' : 'Preview Waterfall Split'}</span>
                </button>
              </div>

              {/* Preview calculation box */}
              {previewData && (
                <div className="p-4 rounded-xl bg-[#0e0f16] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-semibold text-white">Waterfall Calculation Snapshot</span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {previewData.approvedWorkLogsCount ?? previewData.workLogsCount ?? 0} Approved Logs
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-black/40">
                      <span className="text-zinc-500 block text-[9px] uppercase">Gross Earned</span>
                      <span className="text-white font-bold">{formatINR(previewData.grossCommission || previewData.totalEarned || 0)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40">
                      <span className="text-zinc-400 block text-[9px] uppercase">Discount Adj</span>
                      <span className="text-zinc-300 font-bold">-{formatINR(previewData.discountDeduction || 0)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40">
                      <span className="text-zinc-500 block text-[9px] uppercase">Advance / Adj</span>
                      <span className="text-zinc-300 font-bold">{formatINR(previewData.advancesPaid || 0)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40">
                      <span className="text-white block text-[9px] uppercase">Net Payable</span>
                      <span className="text-white font-extrabold">{formatINR(previewData.netPayable || previewData.finalPayable || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Manual Adjustment (+ / - ₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={adjustments}
                    onChange={(e) => setAdjustments(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Settlement Notes / Memo</label>
                  <input
                    type="text"
                    placeholder="Bonus, performance incentive, deductions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsGenModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedEmp || generating}
                  onClick={handleGenerate}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer disabled:opacity-40"
                >
                  {generating ? 'Processing...' : 'Commit Settlement Cycle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Settlement Modal */}
      {isPayModalOpen && activeSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="font-bold text-base tracking-tight text-white">Disburse Settlement</h3>
                <span className="text-xs text-zinc-500 mt-0.5 block">
                  {activeSettlement.employeeName || activeSettlement.employeeId?.fullName}
                </span>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkPaid} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0e0f16] border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-400 text-xs">Net Amount to Disburse:</span>
                <span className="text-lg font-bold font-mono text-white">
                  {formatINR(activeSettlement.finalPayable ?? activeSettlement.netPayable ?? 0)}
                </span>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Disbursement Method *</label>
                <CustomSelect
                  value={payMethod}
                  onChange={(val) => setPayMethod(val)}
                  options={[
                    { value: 'bank_transfer', label: 'Direct Bank Transfer (NEFT/IMPS)' },
                    { value: 'upi', label: 'UPI Payout' },
                    { value: 'cheque', label: 'Company Cheque' },
                    { value: 'cash', label: 'Cash Voucher' },
                  ]}
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9872134567"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-ember hover:bg-ember-deep text-white transition-all shadow-sm cursor-pointer"
                >
                  Confirm Payout & Issue Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Voucher Modal */}
      {isReceiptModalOpen && activeReceipt && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          receipt={activeReceipt}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setActiveReceipt(null);
          }}
        />
      )}
    </div>
  );
};
