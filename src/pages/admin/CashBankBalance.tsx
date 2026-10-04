import { FinanceSummary } from '../../components/work/FinanceSummary';
import { FinanceMonthSelect } from '../../components/work/FinanceMonthSelect';
import { financeToday } from '../../utils/financeDate';
import { useState } from 'react';

export function AdminCashBankBalance() {
  const [selectedMonth, setSelectedMonth] = useState(() => financeToday().slice(0, 7));
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Cash &amp; Bank Balance</h1>
        <FinanceMonthSelect value={selectedMonth} onChange={setSelectedMonth} />
      </div>
      <FinanceSummary kind="closing" month={selectedMonth} />
    </div>
  );
}
