import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ClockWidget } from '../../components/work/ClockWidget';
import { StatusBadge } from '../../components/work/StatusBadge';
import { EmptyState } from '../../components/work/EmptyState';

export const EmployeeAttendance: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employee/attendance');
      setHistory(res.data.data || []);
    } catch (err) {
      console.error('Error fetching attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const totalHours = history.reduce((acc, item) => acc + (item.totalHours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Attendance</h1>
        <p className="text-xs text-zinc-400 mt-1">Record your daily production shifts and track accumulated hours.</p>
      </div>

      <ClockWidget onStatusChange={fetchAttendance} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Logged Shift Hours</span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Sessions Recorded</span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{history.length} sessions</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DATE</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLOCK IN</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">CLOCK OUT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DURATION</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">WORK LOG / NOTE</th>
                <th className="py-4 px-6 text-right text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    Loading attendance records...
                  </td>
                </tr>
              ) : history.length > 0 ? (
                history.map((h) => (
                  <tr key={h._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6 font-mono text-white font-medium text-xs">
                      {new Date(h.date || h.createdAt).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 font-mono text-white font-medium text-xs">
                      {h.clockInTime
                        ? new Date(h.clockInTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-4 px-6 font-mono text-zinc-400 text-xs">
                      {h.clockOutTime
                        ? new Date(h.clockOutTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : h.clockInTime
                        ? 'In session'
                        : '-'}
                    </td>
                    <td className="py-4 px-6 font-mono text-white text-xs font-medium">
                      {h.totalHours ? `${h.totalHours.toFixed(1)} hrs` : '-'}
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300 max-w-xs">
                      {h.notes ? (
                        <span className="line-clamp-2" title={h.notes}>
                          {h.notes}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <StatusBadge status={h.status || 'present'} type="attendance" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      type="attendance"
                      description="No attendance records found. Clock in using the widget above to begin recording."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {history.length} {history.length === 1 ? 'session' : 'sessions'}
      </div>
    </div>
  );
};
