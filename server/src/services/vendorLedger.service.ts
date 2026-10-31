import { Types } from 'mongoose';
import { Client } from '../models/Client.js';
import { Vendor } from '../models/Vendor.js';
import { VendorWork } from '../models/VendorWork.js';
import { VendorPayment } from '../models/VendorPayment.js';
import { fromDecimal, round2 } from '../utils/decimalHelper.js';

type DateRange = { startOfMonth: Date; endOfMonth: Date } | null;

type WorkLike = {
  _id: any;
  title?: string;
  amount: unknown;
  workDate?: Date | string;
  createdAt?: Date | string;
  adjustInClientBill?: boolean;
};

type PaymentLike = {
  _id: any;
  vendorWorkId?: any;
  amount: unknown;
  paymentDate?: Date | string;
  createdAt?: Date | string;
};

export interface VendorWorkLedgerRow {
  workId: string;
  amount: number;
  cashPaid: number;
  adjusted: number;
  pending: number;
}

const workDate = (w: WorkLike) => new Date(w.workDate || w.createdAt || 0);
const paymentDate = (p: PaymentLike) => new Date(p.paymentDate || p.createdAt || 0);
const inRange = (d: Date, range: DateRange) => !range || (d >= range.startOfMonth && d <= range.endOfMonth);
const beforeRange = (d: Date, range: DateRange) => Boolean(range && d < range.startOfMonth);

/**
 * Allocates cash payments to works (the linked work first, then oldest work first). For a vendor
 * linked to a client, whatever is still unpaid on a work is "adjusted" (deducted in the client's bill).
 */
export function computeVendorLedger(works: WorkLike[], payments: PaymentLike[], linkedToClient: boolean) {
  const sortedWorks = [...works].sort((a, b) => workDate(a).getTime() - workDate(b).getTime());
  const paidMap = new Map<string, number>();
  for (const w of sortedWorks) paidMap.set(String(w._id), 0);

  const sortedPayments = [...payments].sort((a, b) => paymentDate(a).getTime() - paymentDate(b).getTime());
  let advance = 0;
  for (const pm of sortedPayments) {
    let rem = fromDecimal(pm.amount);
    const take = (w: WorkLike) => {
      const id = String(w._id);
      const cur = paidMap.get(id) || 0;
      const amt = Math.min(rem, Math.max(0, round2(fromDecimal(w.amount) - cur)));
      if (amt > 0) {
        paidMap.set(id, round2(cur + amt));
        rem = round2(rem - amt);
      }
    };
    const linkedWorkId = pm.vendorWorkId ? String(pm.vendorWorkId._id || pm.vendorWorkId) : null;
    const linkedWork = linkedWorkId ? sortedWorks.find((w) => String(w._id) === linkedWorkId) : undefined;
    if (linkedWork) take(linkedWork);
    for (const w of sortedWorks) {
      if (rem <= 0) break;
      take(w);
    }
    advance = round2(advance + rem);
  }

  const rows: VendorWorkLedgerRow[] = sortedWorks.map((w) => {
    const amount = fromDecimal(w.amount);
    const cashPaid = paidMap.get(String(w._id)) || 0;
    const unpaid = Math.max(0, round2(amount - cashPaid));
    const adjusted = linkedToClient && w.adjustInClientBill !== false ? unpaid : 0;
    return { workId: String(w._id), amount, cashPaid, adjusted, pending: round2(unpaid - adjusted) };
  });

  return { rows, advance };
}

/**
 * Month-aware payable summary. Paid = cash paid + amounts adjusted in the client's bill.
 * Pending = previous month pending + total - paid.
 */
export function summarizeVendorLedger(
  works: WorkLike[],
  payments: PaymentLike[],
  linkedToClient: boolean,
  range: DateRange = null
) {
  const { rows, advance } = computeVendorLedger(works, payments, linkedToClient);
  const rowById = new Map(rows.map((r) => [r.workId, r]));

  let total = 0;
  let cashPaid = 0;
  let adjusted = 0;
  let worksBefore = 0;
  let settledBefore = 0;
  let worksCount = 0;

  for (const w of works) {
    const d = workDate(w);
    const row = rowById.get(String(w._id));
    const amount = fromDecimal(w.amount);
    if (inRange(d, range)) {
      total = round2(total + amount);
      adjusted = round2(adjusted + (row?.adjusted || 0));
      worksCount += 1;
    } else if (beforeRange(d, range)) {
      worksBefore = round2(worksBefore + amount);
      settledBefore = round2(settledBefore + (row?.adjusted || 0));
    }
  }
  for (const pm of payments) {
    const d = paymentDate(pm);
    const amt = fromDecimal(pm.amount);
    if (inRange(d, range)) cashPaid = round2(cashPaid + amt);
    else if (beforeRange(d, range)) settledBefore = round2(settledBefore + amt);
  }

  const previousPending = Math.max(0, round2(worksBefore - settledBefore));
  const paid = round2(cashPaid + adjusted);
  const pending = Math.max(0, round2(previousPending + total - paid));
  const allTimePending = Math.max(0, round2(rows.reduce((s, r) => s + r.pending, 0)));

  return { total, previousPending, paid, cashPaid, adjusted, pending, allTimePending, advance, worksCount, rows };
}

export const vendorDeductionLabel = (title: string) => `${title} (Vendor Adjustment)`;

/**
 * Rebuilds the auto-generated deductions of a vendor in its linked client's bill.
 * Must be called after any change to the vendor's link, works or payments.
 */
export async function syncVendorDeductions(vendorId: Types.ObjectId | string): Promise<void> {
  const vid = new Types.ObjectId(String(vendorId));
  const [vendor, works, payments] = await Promise.all([
    Vendor.findById(vid).lean(),
    VendorWork.find({ vendorId: vid }).lean(),
    VendorPayment.find({ vendorId: vid }).lean(),
  ]);

  // Clear from every client, so re-linking a vendor to another client never leaves stale entries behind
  await Client.updateMany({ 'deductions.vendorId': vid }, { $pull: { deductions: { vendorId: vid } } });

  if (!vendor || !vendor.clientId) return;

  const { rows } = computeVendorLedger(works, payments, true);
  const workById = new Map(works.map((w) => [String(w._id), w]));
  const entries = rows
    .filter((r) => r.adjusted > 0)
    .map((r) => {
      const w = workById.get(r.workId)!;
      return {
        projectName: vendorDeductionLabel(w.title),
        date: w.workDate || w.createdAt,
        amount: r.adjusted,
        source: 'vendor',
        vendorId: vid,
        vendorWorkId: w._id,
      };
    });

  if (entries.length > 0) {
    await Client.updateOne({ _id: vendor.clientId }, { $push: { deductions: { $each: entries } } });
  }
}
