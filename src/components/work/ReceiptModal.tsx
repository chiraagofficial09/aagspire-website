import React from 'react';
import { X, Download, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';

interface ReceiptModalProps {
  receipt: any;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  if (!isOpen || !receipt) return null;

  const receiptCode = receipt.receiptCode || receipt.receiptNumber || receipt.code || 'RCP-VOUCHER';
  const receiptData = receipt.receiptData || {};

  const handleDownloadPdf = async () => {
    try {
      const endpoint = isAdmin
        ? `/admin/receipts/${receipt._id}/pdf`
        : `/employee/receipts/${receipt._id}/pdf`;
      const response = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receiptCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const settlement = receipt.settlementId || {};
  const employee = receipt.employeeId || settlement.employeeId || {};
  const employeeName = receiptData.employeeName || employee.fullName || employee.name || 'Staff Member';
  const employeeCode = receiptData.employeeCode || employee.employeeCode || 'N/A';
  const designation = receiptData.designation || employee.designation || 'Creative Staff';

  const items = receiptData.items || settlement.items || receipt.breakdown || [];
  const finalPaidAmount = Number(receiptData.finalPaid ?? receiptData.finalPayable ?? receipt.amount ?? settlement.netPayable ?? 0);
  const paymentMethod = (receiptData.paymentMethod || receipt.paymentMethod || 'bank_transfer').toUpperCase().replace('_', ' ');
  const txnRef = receiptData.paymentReference || receipt.transactionReference || 'AUTOMATED RECORD';
  const issuedDate = new Date(receipt.issuedAt || receipt.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0d1017] border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 text-white my-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/50 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-ember" />
              OFFICIAL PAYMENT DISBURSEMENT VOUCHER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-ember to-ember-deep text-white hover:shadow-[0_0_20px_rgba(255,90,31,0.4)] text-xs font-semibold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Voucher Body */}
        <div className="p-6 rounded-xl bg-[#121622] border border-white/10 space-y-6 shadow-inner">
          {/* Top Brand & Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <img
                src="/Aagspire_Logo.png"
                alt="Aagspire"
                className="h-8 w-auto object-contain"
              />
              <span className="text-xs text-white/50 font-mono border-l border-white/10 pl-3">
                Disbursement Record
              </span>
            </div>
            <div className="sm:text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-ember" /> DISBURSED & VERIFIED
              </span>
              <p className="text-xs font-mono text-white/70 mt-1.5">
                Voucher: <span className="text-white font-bold">{receiptCode}</span>
              </p>
              <p className="text-[11px] font-mono text-white/40">
                Issued: {issuedDate}
              </p>
            </div>
          </div>

          {/* Employee & Bank Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#171c2b] border border-white/5 space-y-1.5">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">BENEFICIARY STAFF</span>
              <p className="font-bold text-sm text-white">{employeeName}</p>
              <p className="text-white/40 truncate">{designation}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#171c2b] border border-white/5 space-y-1.5">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">DISBURSEMENT CHANNEL</span>
              <p className="font-mono text-white font-bold">
                {paymentMethod}
              </p>
              <p className="text-white/70 font-mono">{txnRef}</p>
              <p className="text-white/40 font-mono">
                Settlement Ref: {receiptData.settlementCode || settlement.settlementCode || 'SETTLEMENT'}
              </p>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">SETTLEMENT ALLOCATION LINE ITEMS</span>
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/[0.03] text-white/40 font-mono uppercase text-[10px] border-b border-white/5">
                  <tr>
                    <th className="py-2.5 px-3.5">Milestone Project</th>
                    <th className="py-2.5 px-3.5">Details</th>
                    <th className="py-2.5 px-3.5 text-right">Settled Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.length > 0 ? (
                    items.map((item: any, idx: number) => {
                      const projTitle = item.projectName || item.projectId?.title || item.description || 'Creative Production';
                      const pCode = item.projectCode || item.projectId?.projectCode || '';
                      const amt = Number(item.earnedAmount ?? item.amount ?? item.payableAmount ?? 0);
                      return (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-3.5">
                            <p className="font-bold text-white">{projTitle}</p>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-white/60">
                            {item.description || 'Milestone Commission'}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-bold text-right text-white">
                            {formatINR(amt)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 px-3.5 text-center text-white/40 font-mono">
                        Consolidated Monthly Settlement Payout
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Box */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs text-white/70 uppercase font-mono tracking-wider">NET DISBURSED AMOUNT</span>
              <p className="text-[11px] text-white/40 font-mono">Reconciled with client discounts & adjustments</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-white">
                {formatINR(finalPaidAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] font-mono text-white/40 pt-1">
          <span>Aagspire Creative Management System</span>
          <span>Digitally authorized and verified document</span>
        </div>
      </div>
    </div>
  );
};
