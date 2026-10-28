import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  /** Noun for the paged unit, e.g. ['day', 'days'] or ['work log', 'work logs']. */
  unit: [string, string];
  disabled?: boolean;
}

// Page numbers to show: first, last, and a window around the current page, with gaps as null.
function pageWindow(page: number, totalPages: number): Array<number | null> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange, unit, disabled = false }) => {
  const { page, limit, total, totalPages } = pagination;
  if (total === 0) return null;
  const first = Math.min(total, (page - 1) * limit + 1);
  const last = Math.min(total, page * limit);
  const noun = total === 1 ? unit[0] : unit[1];
  const buttonBase = 'h-8 min-w-8 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav aria-label="Pagination" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
      <p className="text-xs text-zinc-500">
        Showing <span className="text-zinc-300 font-mono">{first}–{last}</span> of{' '}
        <span className="text-zinc-300 font-mono">{total}</span> {noun}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={`${buttonBase} flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 border border-white/[0.08]`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-zinc-600" aria-hidden="true">…</span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                disabled={disabled}
                onClick={() => p !== page && onPageChange(p)}
                className={`${buttonBase} font-mono ${
                  p === page
                    ? 'bg-[#FF5A1F] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-white/[0.08]'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            aria-label="Next page"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={`${buttonBase} flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 border border-white/[0.08]`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
};
