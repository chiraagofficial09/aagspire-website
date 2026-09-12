import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Users } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  avatarText?: string;
}

export interface MultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  values = [],
  onChange,
  options = [],
  placeholder = 'Select employees to assign...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const toggleOption = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const removeValue = (val: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(values.filter((v) => v !== val));
  };

  const selectedOptions = options.filter((opt) => values.includes(opt.value));

  return (
    <div
      ref={dropdownRef}
      className={`relative select-none ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}
    >
      {/* Trigger Button */}
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
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Users
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isOpen || values.length > 0 ? 'text-[#FF5A1F]' : 'text-zinc-400'
            }`}
          />
          <span
            className={`truncate font-semibold ${
              values.length > 0 ? 'text-white' : 'text-zinc-400'
            }`}
          >
            {values.length === 0
              ? placeholder
              : values.length === 1
              ? selectedOptions[0]?.label || '1 selected'
              : `${values.length} employees assigned`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {values.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#FF5A1F]/20 text-[#FF5A1F] font-semibold border border-[#FF5A1F]/30">
              {values.length}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#FF5A1F]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Options Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 w-full z-50 rounded-2xl bg-[#0c0d12] border border-white/[0.1] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] max-h-60 overflow-y-auto custom-scrollbar"
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-4 text-center text-xs text-zinc-500 italic">
              No employees available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(opt.value)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors select-none mb-0.5 ${
                    isSelected
                      ? 'bg-[#FF5A1F] text-white shadow-sm font-semibold'
                      : 'bg-transparent text-zinc-300 hover:bg-white/[0.06] hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-white bg-white text-[#FF5A1F]'
                          : 'border-white/20 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#FF5A1F] stroke-[3]" />}
                    </div>
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
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Selected Employee Pills Display */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-[#0e0f16] border border-white/[0.08] text-xs text-zinc-200 shadow-sm animate-fade-in"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] shrink-0" />
              <span className="font-medium text-white">{opt.label}</span>
              {opt.sublabel && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  {opt.sublabel}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => removeValue(opt.value, e)}
                className="p-0.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
