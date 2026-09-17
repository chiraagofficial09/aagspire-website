import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  ArrowRight,
  FolderKanban,
  X,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Search,
  Check,
} from 'lucide-react';

interface ClockWidgetProps {
  compact?: boolean;
  onStatusChange?: () => void;
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({ compact = false, onStatusChange }) => {
  const [loading, setLoading] = useState(true);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInAt, setClockInAt] = useState<string | null>(null);
  const [clockOutAt, setClockOutAt] = useState<string | null>(null);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Clock Out Multi-Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [projectStatusMap, setProjectStatusMap] = useState<Record<string, 'in_progress' | 'completed'>>({});
  const [projectSearch, setProjectSearch] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/employee/attendance/today');
      if (res.data.success) {
        setIsClockedIn(res.data.isClockedIn);
        setClockInAt(res.data.clockInAt);
        setClockOutAt(res.data.clockOutAt);
        setTotalMinutes(res.data.totalMinutes || 0);

        if (res.data.clockInAt && !res.data.clockOutAt) {
          const diffMs = Date.now() - new Date(res.data.clockInAt).getTime();
          setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (isClockedIn && clockInAt) {
        const diffMs = Date.now() - new Date(clockInAt).getTime();
        setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isClockedIn, clockInAt]);

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      await api.post('/employee/attendance/clock-in');
      await fetchStatus();
      onStatusChange?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clock in.');
    } finally {
      setActionLoading(false);
    }
  };

  const openClockOutModal = () => {
    setSelectedProjectIds([]);
    setProjectSearch('');
    setIsModalOpen(true);
    setLoadingProjects(true);
    api.get('/employee/projects')
      .then((res) => {
        const list = res.data.data || res.data.projects || [];
        setProjects(list);
        const map: Record<string, 'in_progress' | 'completed'> = {};
        list.forEach((p: any) => {
          map[p._id] = p.status === 'completed' ? 'completed' : 'in_progress';
        });
        setProjectStatusMap(map);
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  };

  const toggleProject = (id: string) => {
    if (selectedProjectIds.includes(id)) {
      setSelectedProjectIds(selectedProjectIds.filter((pid) => pid !== id));
    } else {
      setSelectedProjectIds([...selectedProjectIds, id]);
      if (!projectStatusMap[id]) {
        const p = projects.find((proj) => proj._id === id);
        setProjectStatusMap((prev) => ({
          ...prev,
          [id]: p?.status === 'completed' ? 'completed' : 'in_progress',
        }));
      }
    }
  };

  const handleStatusChange = (id: string, status: 'in_progress' | 'completed', e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectStatusMap((prev) => ({
      ...prev,
      [id]: status,
    }));
  };

  const handleSubmitClockOut = async () => {
    try {
      setActionLoading(true);
      const payloadProjects = selectedProjectIds.map((id) => ({
        projectId: id,
        status: projectStatusMap[id] || 'in_progress',
      }));

      await api.post('/employee/attendance/clock-out', {
        projects: payloadProjects,
        projectIds: selectedProjectIds,
      });
      setIsModalOpen(false);
      await fetchStatus();
      onStatusChange?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clock out.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        (p.projectName || p.title || '').toLowerCase().includes(q) ||
        (p.projectCode || '').toLowerCase().includes(q) ||
        (p.clientId?.companyName || p.clientId?.name || '').toLowerCase().includes(q)
    );
  }, [projects, projectSearch]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    } catch {
      return '--:--';
    }
  };

  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="relative w-full max-w-lg bg-[#0e1017] border border-white/[0.08] rounded-2xl p-6 shadow-2xl space-y-5 text-left font-sans animate-fade-in">
          {/* Modal Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF5A1F]/15 flex items-center justify-center text-[#FF5A1F] shrink-0">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Clock Out &amp; Log Work</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Select the projects you worked on today</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shift Timing Summary Pill */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Clocked In</span>
              <span className="text-xs font-mono font-medium text-zinc-300 mt-0.5 block">{formatTime(clockInAt)}</span>
            </div>
            <div className="border-x border-white/[0.05]">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Clock Out</span>
              <span className="text-xs font-mono font-medium text-white mt-0.5 block">{formatTime(new Date().toISOString())}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Duration</span>
              <span className="text-xs font-mono font-bold text-[#FF5A1F] mt-0.5 block">{Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m</span>
            </div>
          </div>

          {/* Projects Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300">
                Select Projects Worked On Today ({selectedProjectIds.length} selected)
              </label>
              {projects.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectIds(projects.map((p) => p._id))}
                    className="text-[#FF5A1F] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProjectIds([])}
                    className="text-zinc-400 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Search Box if more than 3 projects */}
            {projects.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search assigned projects..."
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]/50"
                />
              </div>
            )}

            {/* Projects List Container */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {loadingProjects ? (
                <div className="py-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF5A1F]" />
                  <span>Loading assigned projects...</span>
                </div>
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map((p) => {
                  const isSelected = selectedProjectIds.includes(p._id);
                  const currentStatus = projectStatusMap[p._id] || (p.status === 'completed' ? 'completed' : 'in_progress');

                  return (
                    <div
                      key={p._id}
                      onClick={() => toggleProject(p._id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/40'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#FF5A1F]" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {p.projectName || p.title}
                          </p>
                          
                        </div>
                      </div>

                      {/* Status Toggle buttons when project is selected */}
                      {isSelected ? (
                        <div className="flex items-center gap-1 shrink-0 bg-black/60 p-1 rounded-lg border border-white/10 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={(e) => handleStatusChange(p._id, 'in_progress', e)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                              currentStatus === 'in_progress'
                                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            In Progress
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleStatusChange(p._id, 'completed', e)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                              currentStatus === 'completed'
                                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Completed</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10.5px] font-mono text-zinc-500 uppercase px-2 py-0.5 rounded bg-white/[0.03] self-end sm:self-auto">
                          {p.status?.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  {projectSearch ? 'No matching projects found.' : 'No assigned projects found.'}
                </div>
              )}
            </div>

            {selectedProjectIds.length === 0 && (
              <p className="text-[11px] text-zinc-400 font-mono italic">
                * Note: If no projects are selected, this shift will be logged as general daily work.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitClockOut}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-bold shadow-[0_4px_20px_rgba(255,90,31,0.3)] transition-all cursor-pointer flex items-center gap-2 active:scale-98 disabled:opacity-60"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting &amp; Clocking Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Submit Log &amp; Clock Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="h-24 w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />;
  }

  // Compact Mode (for top navbar)
  if (compact) {
    return (
      <>
        {clockOutAt ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Clocked Out ({Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m)</span>
          </div>
        ) : isClockedIn ? (
          <button
            onClick={openClockOutModal}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-ember/15 hover:bg-ember/25 border border-ember/40 text-ember text-xs font-semibold cursor-pointer transition-all hover:scale-105"
          >
            <span className="w-2 h-2 rounded-full bg-ember animate-ping" />
            <span>Clocked In ({Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m) • Clock Out</span>
          </button>
        ) : (
          <button
            onClick={handleClockIn}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-ember to-ember-deep text-white text-xs font-bold shadow-[0_0_12px_rgba(255,90,31,0.4)] hover:shadow-[0_0_20px_rgba(255,90,31,0.7)] transition-all cursor-pointer hover:scale-105"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Clock In</span>
          </button>
        )}
        {renderModal()}
      </>
    );
  }

  // Card Mode (for employee dashboard and attendance page)
  const durationText = clockOutAt
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : isClockedIn
    ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`
    : '0h 0m';

  return (
    <>
      <div className="rounded-2xl bg-[#0e1017] border border-white/[0.06] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Icon and Title */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 rounded-full bg-[#FF5A1F]/15 flex items-center justify-center text-[#FF5A1F] shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Daily Attendance</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Track your work hours</p>
          </div>
        </div>

        {/* Middle: Clock In -> Clock Out */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <span className="text-xs text-zinc-400 block">Clock In</span>
            <span className="text-2xl font-bold text-white block mt-0.5 tracking-tight font-sans">
              {formatTime(clockInAt)}
            </span>
          </div>

          <div className="hidden sm:flex items-center text-zinc-600 px-2">
            <div className="w-10 sm:w-16 h-px bg-zinc-700 relative flex items-center justify-end">
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 -mr-1" />
            </div>
          </div>

          <div>
            <span className="text-xs text-zinc-400 block">Clock Out</span>
            <span className="text-2xl font-bold text-white block mt-0.5 tracking-tight font-sans">
              {formatTime(clockOutAt)}
            </span>
          </div>
        </div>

        {/* Duration & Live Status */}
        <div className="shrink-0">
          <span className="text-xs text-zinc-400 block">Duration</span>
          <span className="text-2xl font-bold text-[#FF5A1F] block mt-0.5 tracking-tight font-sans">
            {durationText}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {isClockedIn ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-zinc-300 font-medium">Active Shift</span>
              </>
            ) : clockOutAt ? (
              <>
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-400 font-medium">Shift Complete</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span className="text-xs text-zinc-500 font-medium">Not Clocked In</span>
              </>
            )}
          </div>
        </div>

        {/* Action Button on Right */}
        <div className="shrink-0 flex items-center">
          {isClockedIn ? (
            <button
              onClick={openClockOutModal}
              disabled={actionLoading}
              className="py-3 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white font-semibold text-sm flex items-center gap-2 shadow-[0_4px_20px_rgba(255,90,31,0.3)] transition-all cursor-pointer active:scale-98 disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              <span>Clock Out</span>
            </button>
          ) : clockOutAt ? (
            <div className="py-3 px-5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Shift Completed</span>
            </div>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="py-3 px-6 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white font-semibold text-sm flex items-center gap-2 shadow-[0_4px_20px_rgba(255,90,31,0.3)] transition-all cursor-pointer active:scale-98 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>Clock In</span>
            </button>
          )}
        </div>
      </div>
      {renderModal()}
    </>
  );
};
