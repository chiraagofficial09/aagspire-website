import React from 'react';

interface CommissionBarProps {
  broker: number;
  employee: number;
  officeExpense: number;
  adminShare: number;
  settlementReserve: number;
  totalAmount?: number;
  showLegend?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CommissionBar: React.FC<CommissionBarProps> = ({
  broker = 0,
  employee = 0,
  officeExpense = 0,
  adminShare = 0,
  settlementReserve = 0,
  totalAmount,
  showLegend = true,
  size = 'md',
}) => {
  const total = broker + employee + officeExpense + adminShare + settlementReserve;
  const isExact100 = Math.abs(total - 100) < 0.01;

  const slices = [
    { label: 'Employee Pool', pct: employee, color: 'bg-[#FF5A1F]', text: 'text-[#FF5A1F]', border: 'border-[#FF5A1F]/30' },
    { label: 'Admin Share', pct: adminShare, color: 'bg-white', text: 'text-white', border: 'border-white/30' },
    { label: 'Office Expense', pct: officeExpense, color: 'bg-white/70', text: 'text-zinc-200', border: 'border-white/20' },
    { label: 'Broker Fee', pct: broker, color: 'bg-white/40', text: 'text-zinc-400', border: 'border-white/10' },
    { label: 'Reserve Fund', pct: settlementReserve, color: 'bg-white/20', text: 'text-zinc-400', border: 'border-white/10' },
  ];

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-2.5' : 'h-2';

  return (
    <div className="w-full space-y-2">
      {/* Sleek Progress Bar */}
      <div className={`w-full ${heightClass} rounded-full bg-white/[0.06] flex overflow-hidden`}>
        {slices.map((slice, i) =>
          slice.pct > 0 ? (
            <div
              key={i}
              style={{ width: `${(slice.pct / (total || 100)) * 100}%` }}
              className={`${slice.color} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
              title={`${slice.label}: ${slice.pct}% ${totalAmount ? `(₹${((totalAmount * slice.pct) / 100).toLocaleString('en-IN')})` : ''}`}
            />
          ) : null
        )}
      </div>

      {!isExact100 && (
        <div className="text-[11px] font-mono text-[#FF5A1F] bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 px-2.5 py-1 rounded-lg">
          Current total is {total.toFixed(1)}% (Must equal strictly 100.0%)
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {slices.map((slice, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-[#0c0d12] border border-white/[0.05] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${slice.color} shrink-0`} />
                <span className="text-zinc-400 text-[11px] truncate">{slice.label}</span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className={`font-mono font-bold text-xs ${slice.text}`}>{slice.pct}%</span>
                {totalAmount !== undefined && (
                  <span className="font-mono text-[10px] text-zinc-400 truncate">
                    ₹{((totalAmount * slice.pct) / 100).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
