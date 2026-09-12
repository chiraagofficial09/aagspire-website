import React, { useState } from 'react';
import {
  Download,
  Briefcase,
  CreditCard,
  Coins,
  FileCheck2,
  Clock,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/work/Toast';

export const AdminReports: React.FC = () => {
  const toast = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (type: string, filename: string) => {
    try {
      setDownloading(type);
      const res = await api.get(`/admin/reports/${type}/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Error exporting report', err);
      toast.error('Failed to export report');
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    {
      id: 'projects',
      title: 'Projects & Contracts',
      desc: 'Export all project contracts, status codes, client assignments, and budgets.',
      icon: Briefcase,
      filename: 'aagspire-projects-report',
    },
    {
      id: 'payments',
      title: 'Client Payments & Remittances',
      desc: 'All recorded payments, dates, methods, UTR transaction references, and invoices.',
      icon: CreditCard,
      filename: 'aagspire-payments-ledger',
    },
    {
      id: 'settlements',
      title: 'Staff Commission Settlements',
      desc: 'Comprehensive history of employee commission payouts, receipts, and net amounts.',
      icon: Coins,
      filename: 'aagspire-commission-settlements',
    },
    {
      id: 'work-logs',
      title: 'Timesheets & Production Logs',
      desc: 'Logged production tasks, working hours, employee links, and approval statuses.',
      icon: FileCheck2,
      filename: 'aagspire-timesheets-log',
    },
    {
      id: 'attendance',
      title: 'Staff Attendance Ledger',
      desc: 'Daily clock-in and clock-out timestamps, session durations, and statuses.',
      icon: Clock,
      filename: 'aagspire-attendance-report',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reports</h1>
        <p className="text-xs text-zinc-400 mt-1">Export financial data and audit spreadsheets in CSV format.</p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {reports.map((report) => {
          const Icon = report.icon;
          const isCurrent = downloading === report.id;
          return (
            <div
              key={report.id}
              className="p-6 rounded-2xl bg-[#08090d] border border-white/[0.06] flex flex-col justify-between space-y-4 hover:border-white/[0.12] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#FF5A1F]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">{report.title}</h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{report.desc}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">CSV Data File</span>
                <button
                  onClick={() => handleExport(report.id, report.filename)}
                  disabled={isCurrent}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'Exporting...' : 'Download CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
