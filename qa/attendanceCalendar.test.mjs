import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceDateKey,
  attendanceToday,
  calendarMonthDays,
  monthBounds,
  shiftMonth,
  summarizeAttendance,
} from '../src/utils/attendanceCalendar.ts';

test('attendance dates use India time across UTC and offset day boundaries', () => {
  assert.equal(attendanceDateKey('2026-10-01'), '2026-10-01');
  assert.equal(attendanceDateKey('2026-09-30T18:29:59.000Z'), '2026-09-30');
  assert.equal(attendanceDateKey('2026-09-30T18:30:00.000Z'), '2026-10-01');
  assert.equal(attendanceDateKey('2026-10-01T01:00:00+10:00'), '2026-09-30');
  assert.equal(attendanceDateKey('2026-09-30T23:00:00-04:00'), '2026-10-01');
  assert.equal(attendanceDateKey(new Date('2026-12-31T18:30:00Z')), '2027-01-01');
  assert.equal(attendanceDateKey('not a date'), '');
  assert.equal(attendanceDateKey('2026-02-29'), '');
  assert.equal(attendanceDateKey(new Date(Number.NaN)), '');
});

test('calendar and month bounds include leap days and complete weeks', () => {
  assert.deepEqual(monthBounds('2024-02'), { startDate: '2024-02-01', endDate: '2024-02-29' });
  assert.equal(monthBounds('2025-02').endDate, '2025-02-28');
  assert.equal(monthBounds('2026-12').endDate, '2026-12-31');
  const leapDays = calendarMonthDays('2024-02');
  assert.equal(leapDays.length, 35);
  assert.deepEqual(leapDays.slice(0, 4), [null, null, null, null]);
  assert.equal(leapDays.filter(Boolean).length, 29);
  assert.deepEqual(leapDays[32], { date: '2024-02-29', day: 29, isSunday: false });
  assert.deepEqual(leapDays.slice(-2), [null, null]);
  assert.equal(calendarMonthDays('2026-02').length, 28);
  assert.equal(calendarMonthDays('2026-08').length, 42);
});

test('only Sunday is a weekly off and no attendance statuses are inferred', () => {
  const days = calendarMonthDays('2026-10').filter(Boolean);
  assert.deepEqual(days.filter(day => day.isSunday).map(day => day.day), [4, 11, 18, 25]);
  assert.equal(days.find(day => day.date === '2026-10-03').isSunday, false);
  assert.equal(days.find(day => day.date === '2026-10-04').isSunday, true);
  assert.ok(days.every(day => !('status' in day)));
  assert.deepEqual(summarizeAttendance([]), { present: 0, absent: 0, half_day: 0, late: 0, leave: 0 });
});

test('month navigation crosses years without changing date bounds', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-10', -12), '2025-10');
  assert.equal(shiftMonth('2026-10', 0), '2026-10');
  assert.throws(() => calendarMonthDays('2026-13'), RangeError);
  assert.throws(() => monthBounds('2026-1'), RangeError);
  assert.throws(() => shiftMonth('2026-10', 0.5), RangeError);
});

test('summaries count saved statuses and retain late and half-day separately', () => {
  const records = ['present', 'present', 'absent', 'half_day', 'late', 'leave', 'unknown'].map((status, index) => ({
    _id: String(index),
    date: `2026-10-${String(index + 1).padStart(2, '0')}`,
    status,
  }));
  assert.deepEqual(summarizeAttendance(records), { present: 2, absent: 1, half_day: 1, late: 1, leave: 1 });
});

test('today is formatted in India time', () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const todayInIndia = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
  assert.equal(attendanceToday(), todayInIndia);
});
