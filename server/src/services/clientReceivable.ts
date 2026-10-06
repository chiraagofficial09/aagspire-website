import { fromDecimal, round2 } from '../utils/decimalHelper.js';

type BusinessDate = Date | string;
type ProjectValue = { projectValue: unknown; startDate?: BusinessDate; createdAt?: BusinessDate };
type PaymentValue = { amount: unknown; paymentDate?: BusinessDate; createdAt?: BusinessDate };
type Adjustment = { amount: unknown; date?: BusinessDate };
const monthKey = (date: Date) => new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 7);

/** Client balance in India time. Cash credits carry forward; unused write-offs do not. */
export function clientReceivable(projects: ProjectValue[], payments: PaymentValue[],
  client: { deductions?: Adjustment[]; badDebts?: Adjustment[] },
  range: { startOfMonth: Date; endOfMonth: Date } | null = null) {
  const entries = [
    ...projects.map(p => ({ date: p.startDate || p.createdAt, amount: fromDecimal(p.projectValue), kind: 'contracts' as const })),
    ...payments.map(p => ({ date: p.paymentDate || p.createdAt, amount: fromDecimal(p.amount), kind: 'payments' as const })),
    ...(client.deductions || []).map(d => ({ date: d.date, amount: fromDecimal(d.amount), kind: 'adjustments' as const })),
    ...(client.badDebts || []).map(d => ({ date: d.date, amount: fromDecimal(d.amount), kind: 'adjustments' as const })),
  ];
  const months = new Map<string, { contracts: number; payments: number; adjustments: number }>();
  for (const entry of entries) {
    const date = new Date(entry.date || 0);
    if (Number.isNaN(date.getTime()) || !Number.isFinite(entry.amount) || entry.amount < 0) continue;
    const month = monthKey(date);
    const bucket = months.get(month) || { contracts: 0, payments: 0, adjustments: 0 };
    bucket[entry.kind] += entry.amount;
    months.set(month, bucket);
  }
  const selectedMonth = range ? monthKey(range.startOfMonth) : null;
  let before = 0;
  let through = 0;
  let all = 0;
  for (const month of [...months.keys()].sort()) {
    const bucket = months.get(month)!;
    all = round2(all + bucket.contracts - bucket.payments);
    all = round2(all - Math.min(bucket.adjustments, Math.max(0, all)));
    if (!selectedMonth || month <= selectedMonth) through = all;
    if (selectedMonth && month < selectedMonth) before = all;
  }
  return {
    openingReceivable: Math.max(0, round2(before)),
    netClosingReceivable: Math.max(0, round2(through)),
    allTimeOutstanding: Math.max(0, round2(all)),
  };
}
