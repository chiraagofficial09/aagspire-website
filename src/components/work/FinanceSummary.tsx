import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';

type Totals = { bank: number; cash: number; total: number; unclassified: number };
interface Summary {
  month: string;
  received: Totals;
  expenses: Totals;
  opening: Totals;
  closing: Totals;
  unclassifiedCount: number;
}

export function FinanceSummary({
  kind,
  month,
  revision = 0,
  onLoadingChange,
}: {
  kind: 'received' | 'expenses' | 'closing';
  month: string;
  revision?: number;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [loadedData, setData] = useState<Summary | null>(null);
  const data = loadedData?.month === month ? loadedData : null;
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    onLoadingChange?.(true);
    const fetchSummary = async () => {
      const request = ++sequence;
      try {
        const response = await api.get(`/admin/cash-bank-summary?month=${encodeURIComponent(month)}`, { headers: { 'Cache-Control': 'no-cache' } });
        if (active && request === sequence) {
          setData(response.data.data);
          setError(false);
          onLoadingChange?.(false);
        }
      } catch {
        if (active && request === sequence) {
          setData(null);
          setError(true);
          onLoadingChange?.(false);
        }
      }
    };
    setData(null);
    setError(false);
    void fetchSummary();
    // Refresh across midnight/month rollover and when returning to this tab.
    const timer = window.setInterval(() => { if (!document.hidden) void fetchSummary(); }, 60000);
    const onFocus = () => { void fetchSummary(); };
    const onVisible = () => { if (!document.hidden) void fetchSummary(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
  }, [month, revision, retry]);

  const labels = kind === 'received'
    ? ['Total Bank Received', 'Total Cash Received', 'Total Received']
    : kind === 'expenses'
      ? ['Total Bank Expense', 'Total Cash Expense', 'Total Expense']
      : ['Final Bank Balance', 'Final Cash Balance', 'Final Total Balance'];
  const monthLabel = month === 'all' ? 'All Months' : new Date(`${month}-01T00:00:00+05:30`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  return (
    <section className="space-y-3" aria-label="Monthly financial summary" aria-live="polite">
      <p className="text-xs text-zinc-400">{monthLabel}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['bank', 'cash', 'total'] as const).map((key, index) => (
          <div key={key} className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-5 space-y-3 min-w-0">
            <h2 className="text-xs font-semibold text-zinc-400">{labels[index]}</h2>
            {data ? (
              <p className="text-2xl font-bold text-[#FF5A1F] break-words">{formatINR(data[kind][key])}</p>
            ) : error ? (
              <p className="text-sm font-medium text-red-400">Unavailable</p>
            ) : (
              <div className="flex items-center gap-2.5 py-1">
                <div className="w-5 h-5 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
                <span className="text-xs font-mono text-zinc-500">Loading...</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">Could not load balances. <button className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
      {data && data.unclassifiedCount > 0 && <p className="text-xs text-amber-400">{data.unclassifiedCount} transaction(s) through this period have Other or missing payment mode. They are included in Total, but not Bank/Cash. {kind === 'closing' ? `Unclassified balance: ${formatINR(data.closing.unclassified)}.` : `Unclassified in selected period: ${formatINR(data[kind].unclassified)}.`} Review their payment modes to reconcile the split.</p>}
    </section>
  );
}
