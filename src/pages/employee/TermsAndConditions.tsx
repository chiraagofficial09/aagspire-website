import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Calendar,
  Sparkles,
  Info,
  HelpCircle,
  Printer,
  FileCheck,
} from 'lucide-react';
import { api } from '../../services/api';

export const EmployeeTermsAndConditions: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTerms = async () => {
      setLoading(true);
      try {
        const res = await api.get('/employee/terms');
        if (res.data?.success && res.data?.data) {
          setContent(res.data.data.content || '');
          setLastUpdated(res.data.data.lastUpdated || null);
        }
      } catch (err: any) {
        console.error('Error fetching employee terms:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0d0e14] via-[#140b07] to-[#0d0e14] border border-[#FF5A1F]/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#FF5A1F]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F] text-xs font-semibold">
              <ScrollText className="w-3.5 h-3.5" />
              <span>Staff Portal Documentation</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Terms & Conditions
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Official operating policies, attendance ethics, deliverable guidelines, and confidentiality protocols for Aagspire team members.
            </p>
          </div>

          {/* Quick Print Button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Print Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Meta Bar */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Official studio agreement for all active staff members.</span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Last updated:{' '}
              {new Date(lastUpdated).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Main Document Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-[#08090d] border border-white/[0.06] rounded-2xl p-8">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F]/20 border-t-[#FF5A1F] animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Loading terms & conditions...</p>
        </div>
      ) : content ? (
        <article className="bg-[#08090d] border border-white/[0.06] rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div
            className="text-sm text-zinc-300 leading-relaxed rich-text-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      ) : (
        <div className="bg-[#08090d] border border-dashed border-white/10 rounded-2xl p-12 text-center space-y-3">
          <ScrollText className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No terms published</h3>
          <p className="text-xs text-zinc-400">
            Terms & conditions have not yet been published by administration.
          </p>
        </div>
      )}

      {/* Footer Info Notice */}
      <div className="p-5 rounded-2xl bg-[#08090d] border border-white/[0.06] flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F] shrink-0">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <span className="font-bold text-white block">Questions regarding these terms?</span>
          <span className="text-zinc-400">
            For questions about attendance, asset handling, or commissions, contact studio administration.
          </span>
        </div>
      </div>
    </div>
  );
};
