import { useMemo } from 'react';
import { MonthSelectDropdown } from './MonthSelectDropdown';
import { financeToday } from '../../utils/financeDate';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function FinanceMonthSelect({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  const currentMonth = financeToday().slice(0, 7);
  const availableMonths = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const options = [];
    for (let offset = 0; offset < 12; offset++) {
      const index = year * 12 + month - 1 - offset;
      const y = Math.floor(index / 12);
      const m = index % 12;
      options.push({ key: String(y) + '-' + String(m + 1).padStart(2, '0'), label: monthNames[m] + ' ' + y });
    }
    return options;
  }, [currentMonth]);

  return <MonthSelectDropdown value={value} onChange={onChange} availableMonths={availableMonths} className="!w-44 max-w-full" />;
}
