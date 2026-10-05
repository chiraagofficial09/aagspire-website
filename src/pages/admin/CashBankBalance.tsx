import { FinanceSummary } from '../../components/work/FinanceSummary';
import { FinanceMonthSelect } from '../../components/work/FinanceMonthSelect';
import { financeToday } from '../../utils/financeDate';
import { useState } from 'react';

export function AdminCashBankBalance() {
  const [selectedMonth, setSelectedMonth] = useState(() => financeToday().slice(0, 7));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Cash &amp; Bank Balance</h1>
          <p className="text-xs text-zinc-400 mt-1">Final closing balance across cash and bank accounts.</p>
        </div>
        <FinanceMonthSelect value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <FinanceSummary kind="closing" month={selectedMonth} />
    </div>
  );
}
