export interface MonthDateRange {
  startOfMonth: Date;
  endOfMonth: Date;
}

/**
 * Parses a YYYY-MM query parameter (e.g. '2026-09') into accurate start and end Date objects.
 * Returns null if month is invalid, undefined, or 'all'.
 */
export function getMonthDateRange(month?: string | null): MonthDateRange | null {
  if (!month || month === 'all') return null;

  const [yr, mo] = month.split('-').map(Number);
  if (!yr || !mo || isNaN(yr) || isNaN(mo) || mo < 1 || mo > 12) {
    return null;
  }

  const startOfMonth = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(yr, mo, 0, 23, 59, 59, 999);

  return { startOfMonth, endOfMonth };
}
