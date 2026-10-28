import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { ClockWidget } from '../../components/work/ClockWidget';
import { StatusBadge } from '../../components/work/StatusBadge';
import { EmptyState } from '../../components/work/EmptyState';
import type { PaginationInfo } from '../../components/work/Pagination';

const DAYS_PER_LOAD = 20;

export const EmployeeAttendance: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [summary, setSummary] = useState({ records: 0, totalHours: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  // page 1 replaces the list (first load, after clock in/out); later pages append to it
  const fetchAttendance = async (page = 1) => {
    const current = ++requestId.current;
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      const res = await api.get('/employee/attendance', { params: { page, limit: DAYS_PER_LOAD } });
      if (current !== requestId.current) return;
      const rows = res.data.data || [];
      setHistory((prev) => {
        if (page === 1) return rows;
        // A record added since the last load shifts rows by one; skip any already shown
        const seen = new Set(prev.map((row) => row._id));
        return [...prev, ...rows.filter((row: { _id: string }) => !seen.has(row._id))];
      });
      setPagination(res.data.pagination || null);
      setSummary({ records: res.data.summary?.records ?? 0, totalHours: res.data.summary?.totalHours ?? 0 });
    } catch (err) {
      if (current === requestId.current) console.error('Error fetching attendance', err);
    } finally {
      if (current === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const totalHours = summary.totalHours;
  const hasMore = Boolean(pagination && pagination.page < pagination.totalPages);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Attendance</h1>
        <p className="text-xs text-zinc-400 mt-1">Record your daily production shifts and track accumulated hours.</p>
      </div>

      <ClockWidget onStatusChange={() => fetchAttendance(1)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Logged Shift Hours</span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Days Attended</span>
          <p className="text-2xl font-bold font-mono text-white mt-1">{summary.records} Days</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[620px]">
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
                            hour12: true,
                            timeZone: 'Asia/Kolkata',
                          })
                        : '-'}
                    </td>
                    <td className="py-4 px-6 font-mono text-zinc-400 text-xs">
                      {h.clockOutTime
                        ? new Date(h.clockOutTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata',
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

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchAttendance((pagination?.page ?? 1) + 1)}
            disabled={loadingMore}
            className="px-5 py-2 rounded-xl border border-white/[0.08] bg-[#0d0e14] hover:bg-white/5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      <div className="text-xs text-zinc-500 px-1">
        Showing {history.length} of {summary.records} {summary.records === 1 ? 'Day' : 'Days'}
      </div>
    </div>
  );
};
