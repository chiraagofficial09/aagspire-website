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
     
      {/* Meta Bar */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          

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

     
      
    </div>
  );
};
