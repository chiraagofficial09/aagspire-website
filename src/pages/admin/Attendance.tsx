import React, { useState, useEffect } from 'react';
import {
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { CustomCalendarDropdown } from '../../components/work/CustomCalendarDropdown';

export const AdminAttendance: React.FC = () => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Attendance</h1>
        <p className="text-xs text-zinc-400 mt-1">Track employee clock-in and clock-out activity.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search attendance..."
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

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">EMPLOYEE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DATE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLOCK IN</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLOCK OUT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TOTAL HOURS</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">WORK LOG / NOTE</th>
                <th className="py-4 px-6 text-right text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading attendance records...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-semibold text-white text-sm block">
                        {item.employeeId?.fullName || item.employeeId?.name || 'Staff Member'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-zinc-300 text-xs">
                      {new Date(item.date || item.createdAt).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 font-mono text-white font-medium text-xs">
                      {(item.clockInAt || item.clockInTime)
                        ? new Date(item.clockInAt || item.clockInTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-4 px-6 font-mono text-zinc-400 text-xs">
                      {(item.clockOutAt || item.clockOutTime)
                        ? new Date(item.clockOutAt || item.clockOutTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : (item.clockInAt || item.clockInTime)
                        ? 'In session'
                        : '-'}
                    </td>
                    <td className="py-4 px-6 font-mono text-white font-medium text-xs">
                      {item.totalMinutes ? `${Math.floor(item.totalMinutes / 60)}h ${item.totalMinutes % 60}m` : item.totalHours ? `${item.totalHours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300 max-w-xs">
                      {item.notes ? (
                        <span className="line-clamp-2" title={item.notes}>
                          {item.notes}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <StatusBadge status={item.status || 'present'} type="attendance" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
      </div>
    </div>
  );
};
