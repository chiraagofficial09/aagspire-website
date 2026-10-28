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

  const indiaOffset = 330 * 60_000;
  const startOfMonth = new Date(Date.UTC(yr, mo - 1, 1) - indiaOffset);
  const endOfMonth = new Date(Date.UTC(yr, mo, 1) - indiaOffset - 1);

  return { startOfMonth, endOfMonth };
}

/**
 * Parses a date filter that is either a day ('YYYY-MM-DD') or a month ('YYYY-MM') into an
 * India-time range. Returns null for 'all', empty or invalid values.
 */
export function getDayOrMonthDateRange(value?: string | null): { start: Date; end: Date } | null {
  if (!value || value === 'all') return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) {
    const [yr, mo, d] = day.slice(1).map(Number);
    const utc = Date.UTC(yr, mo - 1, d);
    // Reject rollovers such as 2026-02-30
    if (new Date(utc).toISOString().slice(0, 10) !== value) return null;
    const indiaOffset = 330 * 60_000;
    return { start: new Date(utc - indiaOffset), end: new Date(utc + 86_400_000 - indiaOffset - 1) };
  }
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const month = getMonthDateRange(value);
  return month ? { start: month.startOfMonth, end: month.endOfMonth } : null;
}
