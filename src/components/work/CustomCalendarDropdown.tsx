import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';

export interface CustomCalendarDropdownProps {
  value: string; // 'all', 'YYYY-MM-DD', or 'YYYY-MM'
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatYMD = (year: number, month: number, day: number) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export const CustomCalendarDropdown: React.FC<CustomCalendarDropdownProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'All dates',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(
    () => formatYMD(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const yesterdayYMD = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return formatYMD(y.getFullYear(), y.getMonth(), y.getDate());
  }, []);

  const currentMonthYM = useMemo(
    () => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    [today]
  );

  // Parse initial view month/year based on value or today
  const initialYear = useMemo(() => {
    if (value && value !== 'all') {
      const parsed = parseInt(value.split('-')[0], 10);
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    return today.getFullYear();
  }, [value, today]);

  const initialMonth = useMemo(() => {
    if (value && value !== 'all') {
      const parts = value.split('-');
      if (parts.length >= 2) {
        const parsedM = parseInt(parts[1], 10) - 1;
        if (!isNaN(parsedM) && parsedM >= 0 && parsedM <= 11) return parsedM;
      }
    }
    return today.getMonth();
  }, [value, today]);

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Sync view month/year when dropdown opens or value changes
  useEffect(() => {
    if (value && value !== 'all') {
      const parts = value.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setViewYear(y);
          setViewMonth(m);
        }
      }
    }
  }, [value, isOpen]);

  // Close dropdown on click outside or Escape
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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calendar day cells calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      ymd: string;
    }> = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        dayNumber: d,
        isCurrentMonth: false,
        ymd: formatYMD(prevY, prevM, d),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        ymd: formatYMD(viewYear, viewMonth, d),
      });
    }

    // Next month leading days to complete grid (multiples of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          dayNumber: d,
          isCurrentMonth: false,
          ymd: formatYMD(nextY, nextM, d),
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Display label on trigger button
  const displayLabel = useMemo(() => {
    if (!value || value === 'all') return placeholder;
    if (value === todayYMD) return 'Today';
    if (value === yesterdayYMD) return 'Yesterday';
    if (value.length === 7) {
      const [y, m] = value.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }
    if (value.length === 10) {
      const [y, m, d] = value.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return value;
  }, [value, placeholder, todayYMD, yesterdayYMD]);

  const hasActiveFilter = Boolean(value && value !== 'all');

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs text-left cursor-pointer shadow-sm select-none border transition-all ${
          isOpen
            ? 'border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 bg-[#151620]'
            : 'border-white/[0.08] hover:border-white/[0.2] bg-[#0c0d12] hover:bg-[#14151e]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CalendarIcon
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isOpen || hasActiveFilter ? 'text-[#FF5A1F]' : 'text-zinc-400'
            }`}
          />
          <span
            className={`truncate font-semibold ${
              hasActiveFilter ? 'text-white' : 'text-zinc-400'
            }`}
          >
            {displayLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasActiveFilter && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('all');
              }}
              title="Clear date filter"
              className="p-0.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#FF5A1F]' : ''
            }`}
          />
        </div>
      </button>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 z-50 rounded-2xl bg-[#0c0d12] border border-white/[0.1] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.95)] w-72 select-none`}
        >
          {/* Quick Presets Bar */}
          <div className="grid grid-cols-4 gap-1 pb-2.5 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer ${
                value === 'all' || !value
                  ? 'bg-[#FF5A1F] text-white shadow-sm font-semibold'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayYMD);
                setIsOpen(false);
              }}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer ${
                value === todayYMD
                  ? 'bg-[#FF5A1F] text-white shadow-sm font-semibold'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(yesterdayYMD);
                setIsOpen(false);
              }}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer ${
                value === yesterdayYMD
                  ? 'bg-[#FF5A1F] text-white shadow-sm font-semibold'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(currentMonthYM);
                setIsOpen(false);
              }}
              className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-center cursor-pointer truncate ${
                value === currentMonthYM
                  ? 'bg-[#FF5A1F] text-white shadow-sm font-semibold'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Calendar Month Header */}
          <div className="flex items-center justify-between px-1 py-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-white tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center py-1 border-b border-white/[0.04]">
            {WEEKDAY_NAMES.map((day) => (
              <span key={day} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1.5">
            {calendarCells.map((cell) => {
              const isSelected = value === cell.ymd;
              const isToday = cell.ymd === todayYMD;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => {
                    onChange(cell.ymd);
                    setIsOpen(false);
                  }}
                  className={`h-7 w-full rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer font-medium select-none ${
                    isSelected
                      ? 'bg-[#FF5A1F] text-white font-bold shadow-md'
                      : cell.isCurrentMonth
                      ? 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                      : 'text-zinc-600 opacity-40 hover:opacity-80'
                  } ${isToday && !isSelected ? 'ring-1 ring-[#FF5A1F]/50 text-white font-semibold' : ''}`}
                >
                  {cell.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between px-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
                onChange(monthKey);
                setIsOpen(false);
              }}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Filter Entire {MONTH_NAMES[viewMonth].slice(0, 3)}
            </button>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className="text-[#FF5A1F] hover:underline font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
