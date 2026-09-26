import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, Check, Plus } from 'lucide-react';

export interface MonthMultiSelectOption {
  value: string;
  label: string;
}

export interface MonthMultiSelectProps {
  selectedMonths: string[];
  onToggleMonth: (monthKey: string) => void;
  onSelectAll: () => void;
  options: MonthMultiSelectOption[];
  placeholder?: string;
  className?: string;
}

export const MonthMultiSelect: React.FC<MonthMultiSelectProps> = ({
  selectedMonths,
  onToggleMonth,
  onSelectAll,
  options,
  placeholder = '+ Add / Select Month',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
    maxHeight: number;
  }>({
    top: 0,
    left: 0,
    width: 0,
    openUp: false,
    maxHeight: 300,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const menuMaxHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const width = Math.max(rect.width, 270);
    let left = rect.left;

    const margin = 8;
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }
    if (left < margin) left = margin;

    const maxHeight = Math.max(
      140,
      Math.min(menuMaxHeight, (openUp ? spaceAbove : spaceBelow) - 16)
    );

    const top = openUp ? rect.top - 6 : rect.bottom + 6;

    setCoords({
      top,
      left,
      width,
      openUp,
      maxHeight,
    });
  }, []);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  const allOption = options.find((o) => o.value === 'all');
  const monthOptions = options.filter((o) => o.value !== 'all');

  // Trigger label display
  let triggerLabel = placeholder;
  if (selectedMonths.includes('all')) {
    triggerLabel = 'All Months';
  } else if (selectedMonths.length === 1) {
    const single = monthOptions.find((o) => o.value === selectedMonths[0]);
    triggerLabel = single ? single.label : placeholder;
  } else if (selectedMonths.length > 1) {
    triggerLabel = `${selectedMonths.length} Months Combined`;
  }

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Dropdown Trigger Button with Orange Button Accent */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs text-left cursor-pointer shadow-sm select-none border transition-all ${
          isOpen
            ? 'border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 bg-[#151620]'
            : 'border-[#FF5A1F]/40 hover:border-[#FF5A1F] bg-[#0c0d12] hover:bg-[#14151e]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Orange square plus button in trigger */}
          <span className="w-5 h-5 rounded-md bg-[#FF5A1F] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Plus className="w-3 h-3 stroke-[3]" />
          </span>
          <span className="truncate font-semibold text-white">
            {triggerLabel}
          </span>
          {!selectedMonths.includes('all') && selectedMonths.length > 1 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FF5A1F] text-white shrink-0">
              {selectedMonths.length}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF5A1F]' : ''
          }`}
        />
      </button>

      {/* Portal Dropdown Menu */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              minWidth: '260px',
              maxHeight: `${coords.maxHeight}px`,
              transform: coords.openUp ? 'translateY(-100%)' : undefined,
              zIndex: 99999,
            }}
            className="rounded-2xl bg-[#0c0d12] border border-white/[0.12] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.98)] overflow-y-auto custom-scrollbar select-none animate-in fade-in duration-100 space-y-1"
          >
            {/* Header info */}
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-white/[0.08] mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Select Billing Months
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] font-bold">
                {selectedMonths.includes('all') ? 'All Months' : `${selectedMonths.length} Selected`}
              </span>
            </div>

            {/* All Months Option */}
            {allOption && (
              <button
                type="button"
                role="option"
                aria-selected={selectedMonths.includes('all')}
                onClick={onSelectAll}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-all select-none group ${
                  selectedMonths.includes('all')
                    ? 'bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-white font-semibold'
                    : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white font-medium border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar
                    className={`w-3.5 h-3.5 shrink-0 ${
                      selectedMonths.includes('all') ? 'text-[#FF5A1F]' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  <span className="truncate">{allOption.label}</span>
                </div>
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ml-2 transition-all cursor-pointer ${
                    selectedMonths.includes('all')
                      ? 'bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/30'
                      : 'bg-[#FF5A1F]/15 border border-[#FF5A1F]/40 text-[#FF5A1F] group-hover:bg-[#FF5A1F] group-hover:text-white shadow-xs'
                  }`}
                  title={selectedMonths.includes('all') ? 'All deliverables included' : 'Select all deliverables'}
                >
                  {selectedMonths.includes('all') ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </span>
              </button>
            )}

            <div className="my-1 border-t border-white/[0.06]" />

            {/* Month List with dedicated Orange Button for each month */}
            {monthOptions.map((opt) => {
              const isSelected = selectedMonths.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onToggleMonth(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-all select-none group ${
                    isSelected
                      ? 'bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isSelected ? 'text-[#FF5A1F]' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>

                  {/* Orange square button with + or ✓ */}
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ml-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF5A1F] text-white shadow-sm shadow-[#FF5A1F]/30 scale-105'
                        : 'bg-[#FF5A1F]/15 border border-[#FF5A1F]/40 text-[#FF5A1F] group-hover:bg-[#FF5A1F] group-hover:text-white group-hover:scale-105 shadow-xs'
                    }`}
                    title={isSelected ? 'Included in bill (click to remove)' : 'Click to add to bill'}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </span>
                </button>
              );
            })}

            {/* Bottom bar with summary and Done button */}
            <div className="pt-2 mt-1.5 border-t border-white/[0.08] flex items-center justify-between px-1">
              <span className="text-[11px] text-zinc-400 font-mono">
                {selectedMonths.includes('all')
                  ? 'All months combined'
                  : `${selectedMonths.length} month${selectedMonths.length > 1 ? 's' : ''} combined`}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg bg-[#FF5A1F] hover:bg-[#e04f1a] text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm shadow-[#FF5A1F]/20"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
