import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const hasSelectedValue = selectedOption !== undefined && selectedOption.value !== '' && selectedOption.value !== 'all';

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

  return (
    <div
      ref={dropdownRef}
      className={`relative select-none ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}
    >
      {/* Hidden input for native form accessibility and requirement checking */}
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
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs text-left cursor-pointer shadow-sm select-none border transition-all ${
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

      {/* 100% Solid Non-Transparent Custom Rounded Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 top-full mt-1.5 w-full z-50 rounded-2xl bg-[#0c0d12] border border-white/[0.1] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] max-h-60 overflow-y-auto custom-scrollbar ${menuClassName}`}
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
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors select-none ${
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
      )}
    </div>
  );
}
