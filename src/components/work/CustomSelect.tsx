import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface CustomSelectProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  icon?: React.ReactNode;
  actionItem?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  usePortal?: boolean;
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  required = false,
  name,
  id,
  icon,
  actionItem,
  usePortal = true,
}: CustomSelectProps<T>) {
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
    maxHeight: 240,
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const hasSelectedValue = selectedOption !== undefined && selectedOption.value !== '' && selectedOption.value !== 'all';

  // Compute position relative to viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger button is scrolled completely off-screen, close dropdown
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const menuMaxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip upwards if space below is too small and space above is larger
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

    const width = Math.max(rect.width, 140);
    let left = rect.left;

    // Viewport margin clamping
    const margin = 8;
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }
    if (left < margin) left = margin;

    const maxHeight = Math.max(
      100,
      Math.min(menuMaxHeight, (openUp ? spaceAbove : spaceBelow) - 16)
    );

    const top = openUp ? rect.top - 6 : rect.bottom + 6;

    setCoords({
      top,
      left,
      width: rect.width,
      openUp,
      maxHeight,
    });
  }, []);

  // Update position when opened
  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Listen to scroll, resize, escape, and outside click when open
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

    // Use capture for scroll to track scrolling in parent tables/modals
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

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}
    >
      {/* Hidden input for native form accessibility */}
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={value ?? ''}
          required={required}
        />
      )}

      {/* Dropdown Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left cursor-pointer shadow-sm select-none border transition-all ${
          isOpen
            ? 'border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 bg-[#151620]'
            : 'border-white/[0.08] hover:border-white/[0.2] bg-[#0c0d12] hover:bg-[#14151e]'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && (
            <span
              className={`shrink-0 transition-colors ${
                isOpen || hasSelectedValue ? 'text-[#FF5A1F]' : 'text-zinc-400'
              }`}
            >
              {icon}
            </span>
          )}
          <span
            className={`truncate font-semibold ${
              selectedOption && selectedOption.value !== ''
                ? 'text-white'
                : 'text-zinc-400'
            }`}
          >
            {displayLabel}
          </span>
          {selectedOption?.sublabel && (
            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
              {selectedOption.sublabel}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF5A1F]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu — Supports both portal-rendered (for tables) and inline absolute (glued to modal while scrolling) */}
      {isOpen &&
        (() => {
          const menuContent = (
            <div
              ref={menuRef}
              role="listbox"
              style={
                usePortal
                  ? {
                      position: 'fixed',
                      top: `${coords.top}px`,
                      left: `${coords.left}px`,
                      width: `${coords.width}px`,
                      minWidth: '140px',
                      maxHeight: `${coords.maxHeight}px`,
                      transform: coords.openUp ? 'translateY(-100%)' : undefined,
                      zIndex: 99999,
                    }
                  : {
                      maxHeight: `${coords.maxHeight}px`,
                    }
              }
              className={`${
                usePortal
                  ? ''
                  : `absolute left-0 w-full min-w-[160px] ${
                      coords.openUp ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
                    } z-50`
              } rounded-2xl bg-[#0c0d12] border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.98)] overflow-hidden select-none animate-in fade-in duration-100 ${menuClassName}`}
            >
              {actionItem && (
                <div className="p-1.5 border-b border-white/[0.08] bg-[#0c0d12]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      actionItem.onClick();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-2 text-[#FF5A1F] hover:bg-[#FF5A1F]/15 font-semibold transition-colors hover:text-white group"
                  >
                    <span className="w-5 h-5 rounded-md bg-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F] group-hover:bg-[#FF5A1F] group-hover:text-white transition-colors shrink-0">
                      {actionItem.icon || <Plus className="w-3 h-3" />}
                    </span>
                    <span>{actionItem.label.replace(/^\+\s*/, '')}</span>
                  </button>
                </div>
              )}
              <div
                style={{ maxHeight: actionItem ? `${coords.maxHeight - 48}px` : `${coords.maxHeight}px` }}
                className="overflow-y-auto custom-scrollbar p-1.5"
              >
                {options.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors select-none ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed text-zinc-600'
                          : isSelected
                          ? 'bg-[#FF5A1F] text-white shadow-sm font-semibold'
                          : 'bg-transparent text-zinc-300 hover:bg-white/[0.06] hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span
                            className={`text-[10px] font-mono shrink-0 ${
                              isSelected ? 'text-white/80' : 'text-zinc-500'
                            }`}
                          >
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );

          return usePortal ? createPortal(menuContent, document.body) : menuContent;
        })()}
    </div>
  );
}
