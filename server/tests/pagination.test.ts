import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeRegex, paginationMeta, parsePagination, searchTerm } from '../src/utils/pagination.js';
import { getDayOrMonthDateRange } from '../src/utils/dateHelper.js';

test('pagination is opt-in so existing full-list callers are unchanged', () => {
  assert.equal(parsePagination({}), null);
  assert.equal(parsePagination({ limit: '10' }), null);
});

test('page and limit are clamped to safe bounds', () => {
  assert.deepEqual(parsePagination({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
  assert.deepEqual(parsePagination({ page: '0' }), { page: 1, limit: 25, skip: 0 });
  assert.deepEqual(parsePagination({ page: '-4', limit: '0' }), { page: 1, limit: 1, skip: 0 });
  assert.deepEqual(parsePagination({ page: 'abc', limit: '5000' }), { page: 1, limit: 100, skip: 0 });
  assert.deepEqual(parsePagination({ page: ['2'], limit: { $gt: 1 } }), { page: 1, limit: 25, skip: 0 });
  assert.deepEqual(parsePagination({ page: '2' }, { defaultLimit: 7, maxLimit: 31 }), { page: 2, limit: 7, skip: 7 });
});

test('pagination meta always reports at least one page', () => {
  assert.deepEqual(paginationMeta({ page: 1, limit: 10, skip: 0 }, 0), { page: 1, limit: 10, total: 0, totalPages: 1 });
  assert.deepEqual(paginationMeta({ page: 2, limit: 10, skip: 10 }, 21), { page: 2, limit: 10, total: 21, totalPages: 3 });
});

test('search text is matched literally, never as a regular expression', () => {
  const regex = new RegExp(escapeRegex('a.b*(c)[d]+?$^|\\'), 'i');
  assert.ok(regex.test('A.B*(C)[D]+?$^|\\'));
  assert.ok(!regex.test('axb'));
  assert.equal(searchTerm('  Asha  '), 'Asha');
  assert.equal(searchTerm(['Asha']), '');
  assert.equal(searchTerm({ $ne: '' }), '');
  assert.equal(searchTerm('x'.repeat(500)).length, 100);
});

test('day and month filters become India-time ranges', () => {
  const day = getDayOrMonthDateRange('2026-10-08')!;
  assert.equal(day.start.toISOString(), '2026-10-07T18:30:00.000Z');
  assert.equal(day.end.toISOString(), '2026-10-08T18:29:59.999Z');
  const month = getDayOrMonthDateRange('2026-02')!;
  assert.equal(month.start.toISOString(), '2026-01-31T18:30:00.000Z');
  assert.equal(month.end.toISOString(), '2026-02-28T18:29:59.999Z');
  for (const value of ['all', '', null, undefined, '2026-02-30', '2026-13', '2026-1-01', 'yesterday']) {
    assert.equal(getDayOrMonthDateRange(value as string), null, String(value));
  }
});
