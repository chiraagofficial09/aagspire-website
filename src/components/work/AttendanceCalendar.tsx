import React, { useEffect, useId, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Info, Plus, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import {
  attendanceDateKey,
  attendanceToday,
  calendarMonthDays,
  monthBounds,
  shiftMonth,
  summarizeAttendance,
  type CalendarAttendance,
  type CalendarHoliday,
} from '../../utils/attendanceCalendar';

type AttendanceStatus = CalendarAttendance['status'];

// These colors belong only to this calendar; existing status badges stay unchanged.
const STATUS_STYLES: Record<AttendanceStatus, { label: string; short: string; cell: string; text: string; dot: string }> = {
  present: { label: 'Present', short: 'P', cell: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  absent: { label: 'Absent', short: 'A', cell: 'bg-red-500/10 border-red-500/25', text: 'text-red-400', dot: 'bg-red-400' },
  half_day: { label: 'Half Day', short: 'HD', cell: 'bg-amber-500/10 border-amber-500/25', text: 'text-amber-400', dot: 'bg-amber-400' },
  late: { label: 'Late', short: 'L', cell: 'bg-orange-500/10 border-orange-500/25', text: 'text-orange-400', dot: 'bg-orange-400' },
  leave: { label: 'Leave', short: 'LV', cell: 'bg-violet-500/10 border-violet-500/25', text: 'text-violet-400', dot: 'bg-violet-400' },
};
const STATUSES = Object.keys(STATUS_STYLES) as AttendanceStatus[];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarEmployee {
  _id: string;
  fullName?: string;
  name?: string;
  employeeCode?: string;
  status?: string;
  joiningDate?: string;
}

const NO_ATTENDANCE: CalendarAttendance[] = [];

function displayDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
}

function displayTime(value?: string): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '—';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

function displayDuration(record: CalendarAttendance): string {
  const minutes = record.totalMinutes ?? (record.totalHours === undefined ? undefined : Math.round(record.totalHours * 60));
  if (minutes === undefined || !Number.isFinite(minutes)) return '—';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export interface AttendanceCalendarProps {
  isAdmin?: boolean;
  refreshKey?: number;
  compact?: boolean;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  isAdmin = false,
  refreshKey = 0,
  compact = true,
}) => {
  const id = useId();
  const today = attendanceToday();
  const [month, setMonth] = useState(() => attendanceToday().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState('');
  const [employees, setEmployees] = useState<CalendarEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeesLoading, setEmployeesLoading] = useState(isAdmin);
  const [employeesError, setEmployeesError] = useState('');
  const [reload, setReload] = useState(0);
  const [employeeReload, setEmployeeReload] = useState(0);
  const [attendanceCache, setAttendanceCache] = useState<Record<string, CalendarAttendance[]>>({});
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState('');
  const [holidaySuccess, setHolidaySuccess] = useState('');
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const [ownJoiningDate, setOwnJoiningDate] = useState('');
  const role = isAdmin ? 'admin' : 'employee';
  const requestKey = `${role}:${employeeId}:${month}`;

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setEmployeesLoading(true);
    setEmployeesError('');
    api.get('/admin/employees').then((res) => {
      if (!active) return;
      const list: CalendarEmployee[] = res.data.data || [];
      setEmployees(list);
      setEmployeeId((previous) => list.some((employee) => employee._id === previous)
        ? previous : (list.find((employee) => employee.status === 'active') || list[0])?._id || '');
    }).catch(() => {
      if (active) setEmployeesError('Could not load employees. Please retry.');
    }).finally(() => {
      if (active) setEmployeesLoading(false);
    });
    return () => { active = false; };
  }, [isAdmin, employeeReload]);

  useEffect(() => {
    if (isAdmin) return;
    let active = true;
    api.get('/employee/profile').then((res) => {
      if (active) setOwnJoiningDate(res.data.data?.joiningDate || '');
    }).catch(() => { /* Without a joining date, absences are inferred for the whole month. */ });
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => {
    let active = true;
    setError(null);
    const isCached = Boolean(attendanceCache[requestKey]);
    if (!isCached) {
      setLoading(true);
    }
    const params = monthBounds(month);
    // A refresh after clock-in/out or a holiday change must read current data.
    const headers = { 'Cache-Control': 'no-cache' };
    Promise.all([
      isAdmin && !employeeId
        ? Promise.resolve(null)
        : api.get(`/${role}/attendance`, { params: { ...params, ...(isAdmin ? { employeeId } : {}) }, headers }),
      api.get(`/${role}/holidays`, { params, headers }),
    ]).then(([attendanceResponse, holidayResponse]) => {
      if (!active) return;
      const records: CalendarAttendance[] = attendanceResponse?.data.data || [];
      const filtered = records.filter((record) => attendanceDateKey(record.date).startsWith(`${month}-`));
      setAttendanceCache((prev) => ({ ...prev, [requestKey]: filtered }));
      setHolidays(holidayResponse?.data?.data || []);
      setHasLoadedOnce(true);
    }).catch(() => {
      if (active) {
        setError({ key: requestKey, message: 'Could not load the attendance calendar. Please retry.' });
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [month, employeeId, isAdmin, role, requestKey, refreshKey, reload]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setReload((value) => value + 1); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const currentAttendance = attendanceCache[requestKey] || NO_ATTENDANCE;
  const currentError = error?.key === requestKey ? error.message : '';
  const isInitialLoading = !hasLoadedOnce && (loading || employeesLoading);
  const isSwitchingEmployee = hasLoadedOnce && loading && !attendanceCache[requestKey];
  const isBusy = loading || isSwitchingEmployee;

  const recordsByDate = useMemo(() => new Map(
    currentAttendance.map((record) => [attendanceDateKey(record.date), record]),
  ), [currentAttendance]);
  const holidaysByDate = useMemo(() => new Map(
    holidays.map((holiday) => [holiday.date, holiday]),
  ), [holidays]);
  const days = useMemo(() => calendarMonthDays(month), [month]);
  const selectedEmployee = employees.find((employee) => employee._id === employeeId);
  const joiningDate = isAdmin ? selectedEmployee?.joiningDate : ownJoiningDate;
  // Missed working days have no saved record, so past non-Sunday, non-holiday days without one count as absent.
  const inferredAbsentDates = useMemo(() => {
    const dates = new Set<string>();
    if (isAdmin && !employeeId) return dates;
    const joinKey = joiningDate ? attendanceDateKey(joiningDate) : '';
    for (const day of days) {
      if (!day || day.isSunday || day.date >= today || (joinKey && day.date < joinKey)) continue;
      if (!recordsByDate.has(day.date) && !holidaysByDate.has(day.date)) dates.add(day.date);
    }
    return dates;
  }, [days, today, joiningDate, recordsByDate, holidaysByDate, isAdmin, employeeId]);
  const counts = useMemo(() => {
    const summary = summarizeAttendance(currentAttendance);
    summary.absent += inferredAbsentDates.size;
    return summary;
  }, [currentAttendance, inferredAbsentDates]);
  const selectedDay = days.find((day) => day?.date === selectedDate);
  const selectedRecord = recordsByDate.get(selectedDate);
  const selectedHoliday = holidaysByDate.get(selectedDate);
  const selectedInferredAbsent = inferredAbsentDates.has(selectedDate);
  const selectedStatus = selectedRecord ? STATUS_STYLES[selectedRecord.status] : selectedInferredAbsent ? STATUS_STYLES.absent : undefined;
  const selectedClockIn = selectedRecord?.clockInAt || selectedRecord?.clockInTime;
  const selectedClockOut = selectedRecord?.clockOutAt || selectedRecord?.clockOutTime;
  const inSession = Boolean(selectedClockIn && !selectedClockOut);

  const navigateMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    setSelectedDate('');
  };

  const saveHoliday = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingHoliday) return;
    if (!holidayDate || !holidayName.trim()) {
      setHolidayError('Choose a date and enter a holiday name.');
      return;
    }
    setSavingHoliday(true);
    setHolidayError('');
    setHolidaySuccess('');
    try {
      await api.post('/admin/holidays', { date: holidayDate, name: holidayName.trim() });
      setMonth(holidayDate.slice(0, 7));
      setSelectedDate(holidayDate);
      setReload((value) => value + 1);
      setHolidaySuccess(`${holidayName.trim()} added for ${displayDate(holidayDate, { day: 'numeric', month: 'short', year: 'numeric' })}.`);
      setShowHolidayForm(false);
      setHolidayName('');
    } catch (err: unknown) {
      const responseError = err as { response?: { data?: { message?: string } } };
      setHolidayError(responseError.response?.data?.message || 'Could not add the holiday. Please retry.');
    } finally {
      setSavingHoliday(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className={`rounded-2xl bg-[#0e1017] border border-white/[0.06] ${compact ? 'p-4 sm:p-5 space-y-3.5' : 'p-4 sm:p-6 space-y-5'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <h2 id={`${id}-title`} className="flex items-center gap-2 text-sm sm:text-base font-bold text-white tracking-tight">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" /> Attendance Calendar
            </h2>
            {/* Info Button with Hover Tooltip */}
            <div
              className="relative group/info inline-flex items-center"
              onMouseEnter={() => setShowStatusTooltip(true)}
              onMouseLeave={() => setShowStatusTooltip(false)}
            >
              <button
                type="button"
                aria-label="View attendance status totals"
                onClick={() => setShowStatusTooltip((prev) => !prev)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {/* Hover Tooltip Box */}
              <div
                role="tooltip"
                aria-label="Monthly attendance totals and color legend"
                className={`absolute left-0 top-full mt-1.5 z-50 ${
                  showStatusTooltip ? 'flex' : 'hidden'
                } group-hover/info:flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 rounded-xl bg-[#141622] border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.6)] backdrop-blur-md text-xs text-zinc-300 min-w-[280px] sm:min-w-[340px] pointer-events-none transition-all`}
              >
                {STATUSES.map((status) => (
                  <div key={status} className="flex items-center gap-1.5 whitespace-nowrap">
                    <span aria-hidden="true" className={`w-2 h-2 rounded-full ${STATUS_STYLES[status].dot}`} />
                    <span className="text-zinc-400">{STATUS_STYLES[status].label}</span>
                    <span className="font-bold text-white font-mono">{counts[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {!compact && (
            <p className="text-xs text-zinc-500 mt-1">{isAdmin ? 'Select a team member to view their monthly attendance.' : 'Your attendance at a glance, month by month.'}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button type="button" aria-expanded={showHolidayForm} aria-controls={`${id}-holiday-form`} onClick={() => {
              setShowHolidayForm((value) => !value);
              setHolidayDate(selectedDate || (today.startsWith(month) ? today : `${month}-01`));
              setHolidayError('');
              setHolidaySuccess('');
            }} disabled={savingHoliday} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold disabled:opacity-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Holiday
            </button>
          )}
          <button type="button" aria-label="Refresh attendance calendar" title="Refresh calendar" onClick={() => {
            setReload((value) => value + 1);
            if (employeesError) setEmployeeReload((value) => value + 1);
          }} disabled={isBusy} className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isAdmin && showHolidayForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Add an office holiday</p>
              <button
                type="button"
                aria-label="Close holiday form"
                disabled={savingHoliday}
                onClick={() => setShowHolidayForm(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">Visible to all employees. Sunday is already a weekly off.</p>
            <form id={`${id}-holiday-form`} onSubmit={saveHoliday} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${id}-holiday-date`} className="block text-xs text-zinc-400 mb-1.5">Date</label>
                  <CustomDatePicker triggerId={`${id}-holiday-date`} value={holidayDate} onChange={setHolidayDate} disabled={savingHoliday} required />
                </div>
                <div>
                  <label htmlFor={`${id}-holiday-name`} className="block text-xs text-zinc-400 mb-1.5">Holiday name</label>
                  <input id={`${id}-holiday-name`} value={holidayName} onChange={(event) => setHolidayName(event.target.value)} maxLength={100} required disabled={savingHoliday} placeholder="e.g. Diwali" className="w-full px-3 py-2.5 rounded-xl bg-[#0d0e14] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30" />
                </div>
              </div>
              {holidayError && <p role="alert" className="text-xs text-red-400">{holidayError}</p>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingHoliday}
                  onClick={() => setShowHolidayForm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="px-4 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-[0_2px_10px_rgba(255,90,31,0.3)]"
                >
                  {savingHoliday ? 'Saving…' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {holidaySuccess && <p role="status" className="text-xs text-[#FF5A1F] font-medium">{holidaySuccess}</p>}
      
      <div className={`flex flex-col ${compact ? 'gap-2.5' : 'sm:flex-row sm:items-end justify-between gap-4'}`}>
        {isAdmin && (
          <div className={compact ? 'w-full' : 'w-full sm:max-w-xs'}>
            <label htmlFor={`${id}-employee`} className="block text-[11px] sm:text-xs text-zinc-400 mb-1.5">Employee</label>
            <CustomSelect triggerId={`${id}-employee`} value={employeeId} onChange={(value) => { setEmployeeId(value); }} disabled={employeesLoading || !employees.length} placeholder={employeesLoading ? 'Loading employees…' : 'Select employee'} options={employees.map((employee) => ({
              value: employee._id, label: employee.fullName || employee.name || 'Team member',
            }))} />
          </div>
        )}
        <div className={`flex items-center justify-between ${compact ? 'py-1 border-y border-white/[0.04]' : 'flex-wrap gap-2 sm:ml-auto'}`}>
          <button type="button" onClick={() => navigateMonth(shiftMonth(month, -1))} aria-label="Previous attendance month" className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <p aria-live="polite" className="text-xs sm:text-sm font-semibold text-white">{displayDate(`${month}-01`, { month: 'long', year: 'numeric' })}</p>
          <button type="button" onClick={() => navigateMonth(shiftMonth(month, 1))} aria-label="Next attendance month" className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {employeesError && <p role="alert" className="text-xs text-red-400">{employeesError}</p>}
      {currentError ? (
        <div role="alert" className="py-8 text-center text-sm text-zinc-400">
          <p>{currentError}</p>
          <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-3 text-[#FF5A1F] font-semibold">Retry</button>
        </div>
      ) : isInitialLoading ? (
        <div role="status" className="py-12 text-center text-xs text-zinc-500">Loading attendance calendar…</div>
      ) : (
        <div className={`transition-opacity duration-200 ${isSwitchingEmployee ? 'opacity-60 pointer-events-none' : ''}`}>
          {isAdmin && !employeeId && !employeesLoading && !employeesError && <p className="text-xs text-zinc-500">No employees found. Office holidays are shown below.</p>}
          <div aria-label={`${displayDate(`${month}-01`, { month: 'long', year: 'numeric' })} attendance`}>
            <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] sm:text-xs font-medium text-zinc-500 py-0.5">
              {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) return <div key={`blank-${index}`} className={compact ? 'h-9 sm:h-10' : 'min-h-[76px]'} aria-hidden="true" />;
                const record = recordsByDate.get(day.date);
                const holiday = holidaysByDate.get(day.date);
                const style = record ? STATUS_STYLES[record.status] : inferredAbsentDates.has(day.date) ? STATUS_STYLES.absent : undefined;
                const offLabel = holiday?.name || (day.isSunday ? 'Sunday Off' : '');
                const session = record && (record.clockInAt || record.clockInTime) && !(record.clockOutAt || record.clockOutTime);
                const label = [displayDate(day.date, { day: 'numeric', month: 'long', year: 'numeric' }), style?.label || 'No attendance record', session ? 'In session' : '', holiday?.name, day.isSunday ? 'Sunday Off' : ''].filter(Boolean).join(', ');
                return (
                  <button key={day.date} type="button" aria-label={label} title={label} aria-pressed={selectedDate === day.date} aria-current={day.date === today ? 'date' : undefined} onClick={() => setSelectedDate(day.date)} className={`min-w-0 ${compact ? 'h-9 sm:h-10 p-1 rounded-lg' : 'min-h-[76px] sm:min-h-[94px] p-1.5 sm:p-3 rounded-lg sm:rounded-xl'} border text-left flex flex-col justify-between transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${style?.cell || 'bg-transparent border-white/[0.06]'} ${selectedDate === day.date ? 'ring-1 ring-white/70' : 'hover:ring-1 hover:ring-white/20'}`}>
                    <div className="flex items-center justify-between w-full">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-semibold ${day.date === today ? 'border border-white/70 text-white font-bold' : 'text-zinc-300'}`}>{day.day}</span>
                      {style && <span className={`text-[9px] font-bold ${style.text}`}>{compact ? style.short : <><span className="sm:hidden">{style.short}</span><span className="hidden sm:inline">{style.label}</span></>}</span>}
                    </div>
                    {compact ? (
                      <div className="flex items-center justify-between w-full mt-0.5">
                        {holiday ? (
                          <span className="text-[8px] text-purple-300 truncate max-w-[80%] leading-none" title={holiday.name}>{holiday.name}</span>
                        ) : day.isSunday ? (
                          <span className="text-[8px] text-zinc-500 leading-none">Off</span>
                        ) : <span />}
                        {session && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />}
                      </div>
                    ) : (
                      <>
                        {session && <span className="hidden sm:block text-[10px] text-zinc-400">In session</span>}
                        {offLabel && <span className="block w-full truncate text-[9px] sm:text-[10px] text-zinc-500 mt-auto">{offLabel}</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {!compact && (
            <p className="text-[11px] text-zinc-500">Sunday is a weekly off. Dates without attendance stay uncolored. Select a date for details.</p>
          )}
          {selectedDay && (
            <div aria-live="polite" className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-white">{displayDate(selectedDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{isAdmin && selectedEmployee ? ` · ${selectedEmployee.fullName || selectedEmployee.name || 'Team member'}` : ''}</h3>
                {selectedStatus && <span className={`text-xs font-semibold ${selectedStatus.text}`}>{selectedStatus.label}{inSession ? ' · In session' : ''}</span>}
              </div>
              {(selectedHoliday || selectedDay.isSunday) && <p className="text-xs text-zinc-400">{[selectedHoliday?.name, selectedDay.isSunday ? 'Sunday Off' : ''].filter(Boolean).join(' · ')}</p>}
              {selectedRecord ? (
                <>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div><dt className="text-zinc-500 text-[10px]">Clock in (IST)</dt><dd className="text-zinc-200 mt-0.5 font-mono">{displayTime(selectedClockIn)}</dd></div>
                    <div><dt className="text-zinc-500 text-[10px]">Clock out (IST)</dt><dd className="text-zinc-200 mt-0.5 font-mono">{inSession ? 'In session' : displayTime(selectedClockOut)}</dd></div>
                    <div><dt className="text-zinc-500 text-[10px]">Total hours</dt><dd className="text-zinc-200 mt-0.5 font-mono">{inSession ? 'In progress' : displayDuration(selectedRecord)}</dd></div>
                  </dl>
                  {selectedRecord.autoClockedOut && <p className="text-xs text-amber-400/90 font-medium">Automatically clocked out</p>}
                  {selectedRecord.notes && <p className="text-xs text-zinc-400 whitespace-pre-wrap break-words">{selectedRecord.notes}</p>}
                </>
              ) : <p className="text-xs text-zinc-500">{selectedInferredAbsent ? 'No clock-in on this working day.' : 'No attendance record for this date.'}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
