import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { CustomCalendarDropdown } from '../../components/work/CustomCalendarDropdown';
import { EmptyState } from '../../components/work/EmptyState';

export const AdminAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/attendance');
      setAttendance(res.data.data || res.data.attendance || []);
    } catch (err) {
      console.error('Error fetching attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const filtered = attendance.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (item.employeeId?.fullName || item.employeeId?.name || '')?.toLowerCase().includes(term) ||
      item.employeeId?.employeeCode?.toLowerCase().includes(term);
    const matchesDate = !dateFilter || dateFilter === 'all' || item.date?.startsWith(dateFilter);
    return matchesSearch && matchesDate;
  });

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach((item) => {
      const raw = item.date || item.createdAt || '';
      let dateKey = 'Unknown Date';
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(item);
    });

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return b.localeCompare(a); // Latest date first
    });

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return sortedKeys.map((key) => {
      let label = key;
      let sublabel = '';
      if (key !== 'Unknown Date') {
        const [y, m, d] = key.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayName = days[dateObj.getDay()];
        const formattedStr = `${d} ${months[m - 1]} ${y}`;
        if (key === todayKey) {
          label = `Today`;
          sublabel = `${dayName} · ${formattedStr}`;
        } else if (key === yesterdayKey) {
          label = `Yesterday`;
          sublabel = `${dayName} · ${formattedStr}`;
        } else {
          label = formattedStr;
          sublabel = dayName;
        }
      }

      return {
        dateKey: key,
        label,
        sublabel,
        records: map.get(key)!,
      };
    });
  }, [filtered]);

  const formatTime = (ts: string | undefined) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  const formatHours = (item: any) => {
    if (item.totalMinutes) {
      const h = Math.floor(item.totalMinutes / 60);
      const m = item.totalMinutes % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    if (item.totalHours) return `${Number(item.totalHours).toFixed(1)}h`;
    return '—';
  };

  const handleCheckWork = (item: any) => {
    const empId = item.employeeId?._id || item.employeeId;
    const dateStr = item.date?.split('T')[0] || '';
    // Navigate to work logs filtered by employee
    if (empId) {
      navigate(`/admin/work-logs?employeeId=${empId}${dateStr ? `&date=${dateStr}` : ''}`);
    } else {
      navigate('/admin/work-logs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#FF5A1F]">Attendance</h1>
        <p className="text-xs text-zinc-400 mt-1">Track team member clock-in and clock-out activity by date.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by team member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <CustomCalendarDropdown
            value={dateFilter || 'all'}
            onChange={(val) => setDateFilter(val === 'all' ? '' : val)}
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-12 text-center text-zinc-500 font-mono text-xs">
          Loading attendance records...
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl py-8">
          <EmptyState type="attendance" />
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div
              key={group.dateKey}
              className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Date Header */}
              <div className="bg-[#0c0e15] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-[#FF5A1F]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{group.label}</p>
                    {group.sublabel && (
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{group.sublabel}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F] text-xs font-semibold font-mono">
                    {group.records.length} {group.records.length === 1 ? 'team member' : 'team members'}
                  </span>
                </div>
              </div>

              {/* Attendance Table for this date */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                      <th className="py-3 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">NAME</th>
                      <th className="py-3 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          CLOCK IN
                        </div>
                      </th>
                      <th className="py-3 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          CLOCK OUT
                        </div>
                      </th>
                      <th className="py-3 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL HOURS</th>
                      <th className="py-3 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">WORK LOG</th>
                      <th className="py-3 px-6 text-right text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {group.records.map((item) => {
                      const clockIn = formatTime(item.clockInAt || item.clockInTime);
                      const rawClockOut = item.clockOutAt || item.clockOutTime;
                      const clockOut = rawClockOut
                        ? formatTime(rawClockOut)
                        : (item.clockInAt || item.clockInTime)
                        ? 'In Session'
                        : '—';
                      const isInSession = !rawClockOut && (item.clockInAt || item.clockInTime);

                      return (
                        <tr key={item._id} className="hover:bg-white/[0.015] transition-colors">
                          {/* Name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-[#FF5A1F]/15 flex items-center justify-center text-[#FF5A1F] font-bold text-[10px] shrink-0">
                                {(item.employeeId?.fullName || item.employeeId?.name || 'S')?.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white text-sm">
                                {item.employeeId?.fullName || item.employeeId?.name || 'Staff Member'}
                              </span>
                            </div>
                          </td>

                          {/* Clock In */}
                          <td className="py-4 px-6 font-mono text-white font-medium text-xs">
                            {clockIn}
                          </td>

                          {/* Clock Out */}
                          <td className="py-4 px-6 font-mono text-xs">
                            {isInSession ? (
                              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                In Session
                              </span>
                            ) : (
                              <span className="text-zinc-400">{clockOut}</span>
                            )}
                          </td>

                          {/* Total Hours */}
                          <td className="py-4 px-6 font-mono text-sm font-bold text-white">
                            {formatHours(item)}
                          </td>

                          {/* Work Log / Note */}
                          <td className="py-4 px-6 text-xs text-zinc-400 max-w-[200px]">
                            {item.notes ? (
                              <span className="line-clamp-2" title={item.notes}>{item.notes}</span>
                            ) : (
                              <span className="text-zinc-600 italic">No note</span>
                            )}
                          </td>

                          {/* Check Work Button */}
                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleCheckWork(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Check Work</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'record' : 'records'} across {grouped.length} {grouped.length === 1 ? 'day' : 'days'}
      </div>
    </div>
  );
};
