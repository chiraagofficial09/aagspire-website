import assert from 'node:assert/strict';
import test from 'node:test';
import { Request, Response } from 'express';
import { Holiday, isValidHolidayDate } from '../src/models/Holiday.js';
import { createHoliday, listHolidays } from '../src/controllers/holiday.controller.js';

function response() {
  const result = { status: 200, body: undefined as any };
  const res = {
    status(code: number) { result.status = code; return this; },
    json(body: unknown) { result.body = body; return this; },
  } as Response;
  return { result, res };
}

test('holiday dates reject rollover, timestamps and malformed values while accepting leap days', () => {
  for (const date of ['2026-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-10-00', '2026-1-01', '2026-10-08T00:00:00Z', '0000-01-01', null, 20261008]) {
    assert.equal(isValidHolidayDate(date), false, String(date));
  }
  assert.equal(isValidHolidayDate('2028-02-29'), true);
  assert.equal(isValidHolidayDate('2026-10-08'), true);
  assert.ok(new Holiday({ date: '2026-02-29', name: 'Invalid day' }).validateSync());
  assert.ok(new Holiday({ date: '2026-10-08', name: '  ' }).validateSync());
});

test('holiday creation rejects bad dates and names before writing', async (t) => {
  const create = t.mock.method(Holiday, 'create', async () => { throw new Error('Unexpected database write'); });
  for (const body of [
    { date: '2026-02-29', name: 'Holiday' },
    { date: '2026-10-08', name: ' ' },
    { date: '2026-10-08', name: 123 },
    { date: '2026-10-08', name: 'a'.repeat(101) },
    undefined,
  ]) {
    const { result, res } = response();
    await createHoliday({ body } as Request, res);
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  }
  assert.equal(create.mock.callCount(), 0);
});

test('holiday creation saves only date and trimmed name, including Sunday holidays', async (t) => {
  const create = t.mock.method(Holiday, 'create', async (value: any) => ({ _id: 'holiday', ...value }));
  const { result, res } = response();
  await createHoliday({ body: { date: '2026-10-11', name: '  Festival  ', status: 'absent', employeeId: 'ignored' } } as Request, res);
  assert.equal(result.status, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], { date: '2026-10-11', name: 'Festival' });
  assert.deepEqual(result.body, { success: true, data: { _id: 'holiday', date: '2026-10-11', name: 'Festival' } });
});

test('duplicate date races return a readable conflict', async (t) => {
  t.mock.method(Holiday, 'create', async () => { throw { code: 11000 }; });
  const { result, res } = response();
  await createHoliday({ body: { date: '2026-10-08', name: 'Festival' } } as Request, res);
  assert.equal(result.status, 409);
  assert.match(result.body.message, /already exists/);
});

test('holiday listing rejects invalid and inverted ranges before querying', async (t) => {
  const find = t.mock.method(Holiday, 'find', () => { throw new Error('Unexpected database read'); });
  for (const query of [
    { startDate: '2026-02-29' },
    { endDate: '2026-13-01' },
    { startDate: ['2026-10-01'] },
    { endDate: { $ne: '2026-10-01' } },
    { startDate: '2026-11-01', endDate: '2026-10-01' },
  ]) {
    const { result, res } = response();
    await listHolidays({ query } as unknown as Request, res);
    assert.equal(result.status, 400);
  }
  assert.equal(find.mock.callCount(), 0);
});

test('holiday listing uses inclusive date-only bounds and returns chronological metadata', async (t) => {
  const holidays = [{ _id: 'holiday', date: '2026-10-31', name: 'Festival' }];
  const find = t.mock.method(Holiday, 'find', () => ({
    sort(order: unknown) {
      assert.deepEqual(order, { date: 1 });
      return { lean: async () => holidays };
    },
  }));
  const { result, res } = response();
  await listHolidays({ query: { startDate: '2026-10-01', endDate: '2026-10-31' } } as unknown as Request, res);
  assert.deepEqual(find.mock.calls[0].arguments[0], { date: { $gte: '2026-10-01', $lte: '2026-10-31' } });
  assert.deepEqual(result.body, { success: true, data: holidays });
});
