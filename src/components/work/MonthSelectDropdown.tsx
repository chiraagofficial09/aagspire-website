import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export interface MonthOption {
  key: string;
  label: string;
}

interface MonthSelectDropdownProps {
  value: string;
  onChange: (monthKey: string) => void;
  availableMonths: MonthOption[];
  allMonthsLabel?: string;
  className?: string;
}

export const MonthSelectDropdown: React.FC<MonthSelectDropdownProps> = ({
  value,
  onChange,
  availableMonths,
  allMonthsLabel = 'All Months',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic current month key & label
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const currentMonthLabel = useMemo(
    () => now.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
    [now]
  );

  // Build the ordered options list:
  // 1. Current month first (at the very top)
  // 2. Preceding months sorted descending (most recent first)
  // 3. "All Months" placed at the very last
  const orderedOptions = useMemo(() => {
    const rawMonths = (availableMonths || []).filter((m) => m && m.key !== 'all');

    // Ensure current month is present
    const hasCurrent = rawMonths.some((m) => m.key === currentMonthKey);
    const monthsWithCurrent = hasCurrent
      ? rawMonths
      : [{ key: currentMonthKey, label: currentMonthLabel }, ...rawMonths];

    // Sort descending by month key (e.g. 2026-09, 2026-08, ...)
    const sortedMonths = [...monthsWithCurrent].sort((a, b) => b.key.localeCompare(a.key));

    return [
      ...sortedMonths,
      { key: 'all', label: allMonthsLabel },
    ];
  }, [availableMonths, currentMonthKey, currentMonthLabel, allMonthsLabel]);

  // Find label for trigger display
  const selectedOption = orderedOptions.find((opt) => opt.key === value);
  const displayLabel = selectedOption
    ? selectedOption.label
    : value === 'all'
    ? allMonthsLabel
    : value;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left w-44 sm:w-48 ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs text-left cursor-pointer shadow-sm select-none border transition-all ${
          isOpen
            ? 'border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 bg-[#151620]'
            : 'border-white/[0.08] hover:border-white/[0.2] bg-[#0c0d12] hover:bg-[#14151e]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isOpen || value !== 'all' ? 'text-[#FF5A1F]' : 'text-zinc-400'
            }`}
          />
          <span className="font-semibold text-white truncate">
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF5A1F]' : ''
          }`}
        />
      </button>

      {/* 100% Solid Non-Transparent Custom Rounded Menu Matching Trigger Width */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 w-full z-50 rounded-2xl bg-[#0c0d12] border border-white/[0.1] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] max-h-64 overflow-y-auto custom-scrollbar"
        >
          {orderedOptions.map((opt, idx) => {
            const isSelected = value === opt.key;
            const isAll = opt.key === 'all';

            return (
              <React.Fragment key={opt.key}>
                {/* Visual separator before 'All Months' at the bottom */}
                {isAll && idx > 0 && (
                  <div className="my-1.5 border-t border-white/[0.08]" />
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors select-none ${
                    isSelected
                      ? 'bg-[#FF5A1F] text-white shadow-sm font-semibold'
                      : 'bg-transparent text-zinc-300 hover:bg-white/[0.06] hover:text-white font-medium'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
