import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export interface CustomDatePickerProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  minDate?: string;
  maxDate?: string;
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

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  disabled = false,
  required = false,
  name,
  id,
  minDate,
  maxDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(
    () => formatYMD(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  // Initialize view year & month from value if available, else today
  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      const y = parseInt(value.split('-')[0], 10);
      if (!isNaN(y) && y > 2000) return y;
    }
    return today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(m) && m >= 0 && m <= 11) return m;
      }
    }
    return today.getMonth();
  });

  // Sync view when value changes or when opened
  useEffect(() => {
    if (value) {
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

  // Click outside or escape to close
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

  // Generate calendar days grid
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      ymd: string;
      disabled?: boolean;
    }> = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const ymd = formatYMD(prevY, prevM, d);
      const isPastMin = minDate ? ymd < minDate : false;
      const isFutureMax = maxDate ? ymd > maxDate : false;
      cells.push({
        dayNumber: d,
        isCurrentMonth: false,
        ymd,
        disabled: isPastMin || isFutureMax,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const ymd = formatYMD(viewYear, viewMonth, d);
      const isPastMin = minDate ? ymd < minDate : false;
      const isFutureMax = maxDate ? ymd > maxDate : false;
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        ymd,
        disabled: isPastMin || isFutureMax,
      });
    }

    // Next month leading days to complete full grid row
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      for (let d = 1; d <= remaining; d++) {
        const ymd = formatYMD(nextY, nextM, d);
        const isPastMin = minDate ? ymd < minDate : false;
        const isFutureMax = maxDate ? ymd > maxDate : false;
        cells.push({
          dayNumber: d,
          isCurrentMonth: false,
          ymd,
          disabled: isPastMin || isFutureMax,
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth, minDate, maxDate]);

  // Formatted display label
  const displayLabel = useMemo(() => {
    if (!value) return placeholder;
    if (value === todayYMD) return 'Today';
    const parts = value.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    return value;
  }, [value, placeholder, todayYMD]);

  return (
    <div
      ref={dropdownRef}
      className={`relative select-none ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      {/* Hidden input for form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={value || ''}
          required={required}
        />
      )}

      {/* Trigger button styled like custom input / select */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs text-left cursor-pointer shadow-sm select-none border transition-all ${
          isOpen
            ? 'border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 bg-[#151620]'
            : 'border-white/[0.08] hover:border-white/[0.2] bg-[#0c0d12] hover:bg-[#14151e]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <CalendarIcon
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isOpen || value ? 'text-[#FF5A1F]' : 'text-zinc-500'
            }`}
          />
          <span
            className={`truncate font-medium ${
              value ? 'text-white' : 'text-zinc-500'
            }`}
          >
            {displayLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && !required && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title="Clear date"
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

      {/* Solid Dark Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 z-50 rounded-2xl bg-[#0c0d12] border border-white/[0.1] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.95)] w-72 select-none"
        >
          {/* Calendar Header with Prev / Next */}
          <div className="flex items-center justify-between px-1 py-1.5 mb-1">
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

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center py-1 border-b border-white/[0.04]">
            {WEEKDAY_NAMES.map((day) => (
              <span key={day} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 pt-2">
            {calendarCells.map((cell) => {
              const isSelected = value === cell.ymd;
              const isToday = cell.ymd === todayYMD;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  disabled={cell.disabled}
                  onClick={() => {
                    onChange(cell.ymd);
                    setIsOpen(false);
                  }}
                  className={`h-7 w-full rounded-lg text-xs flex items-center justify-center transition-all font-medium select-none ${
                    cell.disabled
                      ? 'opacity-20 cursor-not-allowed text-zinc-600'
                      : isSelected
                      ? 'bg-[#FF5A1F] text-white font-bold shadow-md cursor-pointer'
                      : cell.isCurrentMonth
                      ? 'text-zinc-200 hover:bg-white/[0.08] hover:text-white cursor-pointer'
                      : 'text-zinc-600 opacity-40 hover:opacity-80 cursor-pointer'
                  } ${isToday && !isSelected ? 'ring-1 ring-[#FF5A1F]/50 text-white font-semibold' : ''}`}
                >
                  {cell.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Bottom Quick Select Bar */}
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between px-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                onChange(todayYMD);
                setIsOpen(false);
              }}
              className="text-[#FF5A1F] hover:underline font-semibold cursor-pointer"
            >
              Today
            </button>

            {value && !required && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
