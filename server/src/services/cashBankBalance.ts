// Business dates are always interpreted in India, independent of the server timezone.
export const FINANCE_TIMEZONE = 'Asia/Kolkata';
export function financeMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: FINANCE_TIMEZONE, year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}

export function financeMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 1900) throw new Error('Invalid month; use YYYY-MM');
  const [year, m] = month.split('-').map(Number);
  const offset = 330 * 60 * 1000;
  return { start: new Date(Date.UTC(year, m - 1, 1) - offset), end: new Date(Date.UTC(year, m, 1) - offset) };
}

export function validMoney(value: unknown): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const text = String(value);
  return /^\d+(\.\d{1,2})?$/.test(text) && Number(text) > 0 && Number(text) <= 1_000_000_000_000;
}

export function validFinanceDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return false;
  const day = value.slice(0, 10);
  const date = new Date(day);
  return Number.isFinite(new Date(value).getTime()) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export function financeBucket(method: unknown): 'bank' | 'cash' | 'unclassified' {
  if (method === 'cash') return 'cash';
  return ['bank_transfer', 'upi', 'cheque'].includes(String(method)) ? 'bank' : 'unclassified';
}

export interface FinanceRow { month: string; method?: string; amount: string; count: number }
type Cents = { bank: bigint; cash: bigint; unclassified: bigint };
const empty = (): Cents => ({ bank: 0n, cash: 0n, unclassified: 0n });
function cents(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error('Invalid stored financial amount');
  const fraction = (match[3] || '').padEnd(3, '0');
  const absolute = BigInt(match[2]) * 100n + BigInt(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1n : 0n);
  return match[1] ? -absolute : absolute;
}
function serialize(values: Cents) {
  const number = (n: bigint) => {
    if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Financial total exceeds supported precision');
    return Number(n) / 100;
  };
  return { bank: number(values.bank), cash: number(values.cash), unclassified: number(values.unclassified), total: number(values.bank + values.cash + values.unclassified) };
}

// Recompute from the ledger: no rollover job, snapshots, or duplicate opening entries.
export function buildCashBankSummary(payments: FinanceRow[], expenses: FinanceRow[], month: string) {
  if (month !== 'all') financeMonthRange(month);
  const received = empty(), spent = empty(), opening = empty();
  let unclassifiedCount = 0;
  for (const [rows, sign, monthly] of [[payments, 1n, received], [expenses, -1n, spent]] as const) {
    for (const row of rows) {
      if (month !== 'all' && row.month > month) continue;
      const bucket = financeBucket(row.method);
      const amount = cents(row.amount);
      if (bucket === 'unclassified') unclassifiedCount += row.count;
      if (month === 'all' || row.month === month) monthly[bucket] += amount;
      else opening[bucket] += sign * amount;
    }
  }
  const closing = empty();
  for (const key of ['bank', 'cash', 'unclassified'] as const) closing[key] = opening[key] + received[key] - spent[key];
  return { month, received: serialize(received), expenses: serialize(spent), opening: serialize(opening), closing: serialize(closing), unclassifiedCount };
}
