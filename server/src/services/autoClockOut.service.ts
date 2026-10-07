import { Attendance } from '../models/Attendance.js';
import { AttendanceSettings } from '../models/AttendanceSettings.js';
import { createNotification } from './notification.service.js';

const IST_OFFSET_MS = 330 * 60 * 1000;
const HALF_DAY_CLOCK_OUT = { hour: 13, minute: 0 }; // 1:00 PM IST
const CHECK_INTERVAL_MS = 60 * 1000;

export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Returns the instant for HH:mm IST on the IST calendar day containing `ref`
function istTimeOnDayOf(ref: Date, hour: number, minute: number, addDays = 0): Date {
  const ist = new Date(ref.getTime() + IST_OFFSET_MS);
  const utcMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + addDays, hour, minute);
  return new Date(utcMs - IST_OFFSET_MS);
}

export function formatIstTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

export async function getAttendanceSettings() {
  const settings = await AttendanceSettings.findById('default').lean();
  return {
    autoClockOutEnabled: settings?.autoClockOutEnabled ?? false,
    autoClockOutTime: settings?.autoClockOutTime ?? '19:00',
  };
}

let running = false;

export async function runAutoClockOut(now: Date = new Date()): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const { autoClockOutEnabled, autoClockOutTime } = await getAttendanceSettings();
    const match = TIME_PATTERN.exec(autoClockOutTime);
    if (!autoClockOutEnabled || !match) return 0;
    const [cutHour, cutMinute] = [Number(match[1]), Number(match[2])];

    const open = await Attendance.find({ clockInAt: { $ne: null }, clockOutAt: null })
      .populate('employeeId', 'fullName');

    const closedNames: string[] = [];
    for (const record of open) {
      const clockInAt = new Date(record.clockInAt!);
      let deadline = istTimeOnDayOf(clockInAt, cutHour, cutMinute);
      // Clocked in after that day's cut-off: give them until the next day's cut-off
      if (clockInAt >= deadline) deadline = istTimeOnDayOf(clockInAt, cutHour, cutMinute, 1);
      if (now < deadline) continue;

      const halfDayOut = istTimeOnDayOf(clockInAt, HALF_DAY_CLOCK_OUT.hour, HALF_DAY_CLOCK_OUT.minute);
      const clockOutAt = clockInAt > halfDayOut ? clockInAt : halfDayOut;
      const totalMinutes = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000));

      // Guarded on clockOutAt so a manual clock-out at the same moment always wins
      const result = await Attendance.updateOne(
        { _id: record._id, clockOutAt: null },
        {
          $set: {
            clockOutAt,
            totalMinutes,
            status: 'half_day',
            autoClockedOut: true,
            notes: `Auto clock-out: did not clock out by ${formatIstTime(deadline)}. Marked as half day.`,
          },
        }
      );
      if (result.modifiedCount > 0) {
        closedNames.push((record.employeeId as any)?.fullName || 'Staff Member');
      }
    }

    if (closedNames.length > 0) {
      createNotification({
        role: 'admin',
        type: 'attendance',
        title: 'Auto Clock-Out (Half Day)',
        message: `${closedNames.join(', ')} did not clock out in time and ${closedNames.length === 1 ? 'was' : 'were'} auto clocked-out as half day.`,
        link: '/admin/attendance',
        metadata: { count: closedNames.length },
      }).catch(() => {});
    }

    return closedNames.length;
  } finally {
    running = false;
  }
}

export function startAutoClockOutJob(): void {
  const tick = () => {
    runAutoClockOut().catch((err) => console.error('[Auto Clock-Out] Failed:', err?.message || err));
  };
  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}
