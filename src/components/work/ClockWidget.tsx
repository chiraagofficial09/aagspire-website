import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Clock, LogIn, LogOut, CheckCircle2, ArrowRight, FileText, X, AlertCircle, Loader2 } from 'lucide-react';

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

  // Clock Out Work Log Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [taskName, setTaskName] = useState('Daily Shift Work');
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [descError, setDescError] = useState('');

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
    setWorkDescription('');
    setTaskName('Daily Shift Work');
    setDescError('');
    setIsModalOpen(true);
    if (projects.length === 0) {
      api.get('/employee/projects')
        .then((res) => {
          setProjects(res.data.data || res.data.projects || []);
        })
        .catch(() => {});
    }
  };

  const handleSubmitClockOut = async () => {
    if (!workDescription.trim()) {
      setDescError('Please describe the work you accomplished today before clocking out.');
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/employee/attendance/clock-out', {
        workDescription: workDescription.trim(),
        taskName: taskName.trim() || 'Daily Shift Work',
        projectId: selectedProject || undefined,
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

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
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
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Clock Out &amp; Log Work</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Describe what you did today to add it directly to logs</p>
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

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Work Description */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                What did you work on today? <span className="text-[#FF5A1F]">*</span>
              </label>
              <textarea
                rows={4}
                value={workDescription}
                onChange={(e) => {
                  setWorkDescription(e.target.value);
                  if (descError) setDescError('');
                }}
                placeholder="Describe tasks completed, revisions done, assets created, meetings attended..."
                className={`w-full bg-[#08090d] border ${descError ? 'border-red-500/50' : 'border-white/[0.08]'} rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]/50 transition-colors resize-none`}
              />
              {descError && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{descError}</span>
                </p>
              )}
            </div>

            {/* Task Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Task Name / Summary (Optional)
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Daily Shift Work, Video Editing, Revisions"
                className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
              />
            </div>

            {/* Assigned Project (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Related Project (Optional)
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5A1F]/50 transition-colors cursor-pointer"
              >
                <option value="">General Work / No Specific Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id} className="bg-[#0e1017] text-white">
                    {p.projectName || p.title} {p.projectCode ? `(${p.projectCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
