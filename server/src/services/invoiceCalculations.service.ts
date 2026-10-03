import { fromDecimal, round2 } from '../utils/decimalHelper.js';
import { getNetProjectValue } from './dashboardFinance.js';

/** Allocate only actual collections, capping each project at its net value. */
export function allocateInvoicePayments(projects: any[], payments: any[]): Map<string, number> {
  const ordered = [...projects].sort((a, b) => new Date(a.startDate || a.createdAt || 0).getTime() - new Date(b.startDate || b.createdAt || 0).getTime());
  const byId = new Map(ordered.map(p => [String(p._id), p]));
  const paid = new Map(ordered.map(p => [String(p._id), 0]));
  for (const payment of payments) {
    let remaining = Math.max(0, fromDecimal(payment.amount));
    const apply = (project: any) => {
      const id = String(project._id);
      const current = paid.get(id) || 0;
      const amount = Math.min(remaining, Math.max(0, round2(getNetProjectValue(project) - current)));
      paid.set(id, round2(current + amount));
      remaining = round2(remaining - amount);
    };
    const linked = byId.get(String(payment.projectId?._id || payment.projectId));
    if (linked) apply(linked);
    for (const project of ordered) {
      if (remaining <= 0) break;
      apply(project);
    }
  }
  return paid;
}
