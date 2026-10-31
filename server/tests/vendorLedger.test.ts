import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { clientReceivable } from '../src/services/clientReceivable.js';
import { computeVendorLedger, summarizeVendorLedger } from '../src/services/vendorLedger.service.js';

const id = () => new Types.ObjectId();
const work = (amount: number, date: string, extra: Record<string, unknown> = {}) => ({
  _id: id(), title: 'Banner', amount: Types.Decimal128.fromString(String(amount)), workDate: new Date(date), ...extra,
});
const payment = (amount: number, date: string, extra: Record<string, unknown> = {}) => ({
  _id: id(), amount: Types.Decimal128.fromString(String(amount)), paymentDate: new Date(date), ...extra,
});
const range = (start: string, end: string) => ({ startOfMonth: new Date(start), endOfMonth: new Date(end) });

test('standalone vendor: pending = total - paid, with previous month carried forward', () => {
  const works = [work(1000, '2026-09-10'), work(2000, '2026-10-05')];
  const payments = [payment(400, '2026-09-20'), payment(1500, '2026-10-15')];

  const all = summarizeVendorLedger(works, payments, false);
  assert.deepEqual([all.total, all.paid, all.pending, all.adjusted], [3000, 1900, 1100, 0]);

  const oct = summarizeVendorLedger(works, payments, false, range('2026-10-01', '2026-10-31T23:59:59'));
  assert.equal(oct.previousPending, 600);
  assert.equal(oct.total, 2000);
  assert.equal(oct.paid, 1500);
  assert.equal(oct.pending, 1100);
});

test('vendor who is also our client: unpaid amount is adjusted, so nothing stays pending', () => {
  const works = [work(2000, '2026-10-05')];
  const s = summarizeVendorLedger(works, [], true);
  assert.deepEqual([s.total, s.adjusted, s.paid, s.pending], [2000, 2000, 2000, 0]);

  // Client owes 5000, we owe them 2000 -> they pay only 3000
  const deductions = computeVendorLedger(works, [], true).rows.map((r) => ({ amount: r.adjusted, date: new Date('2026-10-05') }));
  const bal = clientReceivable([{ projectValue: 5000, startDate: new Date('2026-10-01') }], [], { deductions });
  assert.equal(bal.allTimeOutstanding, 3000);
});

test('cash paid to a linked vendor reduces the bill adjustment instead of double counting', () => {
  const works = [work(2000, '2026-10-05')];
  const { rows } = computeVendorLedger(works, [payment(500, '2026-10-06')], true);
  assert.deepEqual([rows[0].cashPaid, rows[0].adjusted, rows[0].pending], [500, 1500, 0]);
});

test('a project excluded from the bill stays pending for a linked vendor', () => {
  const works = [work(2000, '2026-10-05', { adjustInClientBill: false }), work(700, '2026-10-06')];
  const s = summarizeVendorLedger(works, [], true);
  assert.deepEqual([s.adjusted, s.pending], [700, 2000]);
});

test('payments go to their selected project first, then oldest first, extra is advance', () => {
  const a = work(1000, '2026-09-01');
  const b = work(1000, '2026-10-01');
  const { rows, advance } = computeVendorLedger([a, b], [payment(1500, '2026-10-02', { vendorWorkId: b._id }), payment(800, '2026-10-03')], false);
  const byId = new Map(rows.map((r) => [r.workId, r]));
  assert.equal(byId.get(String(b._id))!.cashPaid, 1000);
  assert.equal(byId.get(String(a._id))!.cashPaid, 1000);
  assert.equal(advance, 300);
});
