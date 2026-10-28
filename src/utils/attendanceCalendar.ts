export type CalendarAttendance = {
  _id: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'leave';
  clockInAt?: string;
  clockOutAt?: string;
  clockInTime?: string;
  clockOutTime?: string;
  totalMinutes?: number;
  totalHours?: number;
  notes?: string;
  autoClockedOut?: boolean;
};

export type CalendarHoliday = {
  _id: string;
  date: string;
  name: string;
};

const attendanceDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function attendanceDateKey(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = attendanceDateFormatter.formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

function firstOfMonth(month: string): Date {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError('Invalid calendar month');
  return new Date(`${month}-01T00:00:00.000Z`);
}

export function monthBounds(month: string): { startDate: string; endDate: string } {
  const end = firstOfMonth(month);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return { startDate: `${month}-01`, endDate: end.toISOString().slice(0, 10) };
}

export function calendarMonthDays(month: string): Array<{ date: string; day: number; isSunday: boolean } | null> {
  const first = firstOfMonth(month);
  const lastDay = Number(monthBounds(month).endDate.slice(-2));
  const days: Array<{ date: string; day: number; isSunday: boolean } | null> = Array(first.getUTCDay()).fill(null);

  for (let day = 1; day <= lastDay; day += 1) {
    days.push({
      date: `${month}-${String(day).padStart(2, '0')}`,
      day,
      isSunday: (first.getUTCDay() + day - 1) % 7 === 0,
    });
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function shiftMonth(month: string, amount: number): string {
  if (!Number.isInteger(amount)) throw new RangeError('Month offset must be an integer');
  const date = firstOfMonth(month);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

export function attendanceToday(): string {
  return attendanceDateKey(new Date());
}

export function summarizeAttendance(records: CalendarAttendance[]): Record<CalendarAttendance['status'], number> {
  const counts = { present: 0, absent: 0, half_day: 0, late: 0, leave: 0 };
  for (const record of records) {
    if (Object.prototype.hasOwnProperty.call(counts, record.status)) counts[record.status] += 1;
  }
  return counts;
}
