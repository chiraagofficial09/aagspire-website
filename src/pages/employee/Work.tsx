import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';
import { CustomDatePicker } from '../../components/work/CustomDatePicker';

export const EmployeeWork: React.FC = () => {
  const toast = useToast();
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    projectId: '',
    taskName: '',
    hoursWorked: 2,
    minutesWorked: 0,
    logDate: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [wRes, pRes] = await Promise.all([
        api.get('/employee/work-logs'),
        api.get('/employee/projects'),
      ]);
      setWorkLogs(wRes.data.data || []);
      setProjects(pRes.data.data || []);
    } catch (err) {
      console.error('Error fetching work logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/employee/work-logs', {
        ...formData,
        hoursWorked: Number(formData.hoursWorked),
        minutesWorked: Number(formData.minutesWorked),
      });
      setIsModalOpen(false);
      setFormData({
        projectId: '',
        taskName: '',
        hoursWorked: 2,
        minutesWorked: 0,
        logDate: new Date().toISOString().slice(0, 10),
        description: '',
      });
      toast.success('Production hours submitted for verification');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit work log');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Work logs</h1>
          <p className="text-xs text-zinc-400 mt-1">Log billable creative hours, edit sessions, and track review status.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#FF5A1F] hover:bg-[#e04810] text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Work</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">TASK & NOTES</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">PROJECT</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DURATION</th>
                <th className="py-4 px-6 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">DATE LOGGED</th>
                <th className="py-4 px-6 text-right text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                    Loading timesheet logs...
                  </td>
                </tr>
              ) : workLogs.length > 0 ? (
                workLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-6 max-w-sm">
                      <span className="font-semibold text-white text-sm block">{log.taskName}</span>
                      {log.description && (
                        <span className="text-xs text-zinc-500 block line-clamp-1 mt-0.5">
                          {log.description}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-zinc-300">
                      {log.projectId?.title || log.projectId?.projectName || 'Project Task'}
                    </td>
                    <td className="py-4 px-6 font-mono text-sm font-semibold text-white">
                      {log.hoursWorked !== undefined ? `${log.hoursWorked}h` : log.totalMinutes ? `${Math.round(log.totalMinutes / 60)}h` : '0h'}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-zinc-400">
                      {new Date(log.logDate || log.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <StatusBadge status={log.status} type="workLog" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    No work logs found. Click &quot;Log Work&quot; to record your hours.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {workLogs.length} {workLogs.length === 1 ? 'log' : 'logs'}
      </div>

      {/* Modal with all features preserved */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5 text-white text-xs my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="font-bold text-base tracking-tight text-white">Log Production Work</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Assigned Project *</label>
                <CustomSelect
                  value={formData.projectId}
                  onChange={(val) => setFormData({ ...formData, projectId: val })}
                  placeholder="Select project"
                  options={projects.map((item) => {
                    const prj = item.projectId || item;
                    return {
                      value: prj._id,
                      label: prj.title || prj.projectName,
                    };
                  })}
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Task Deliverable *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Color grading, sound design, storyboard"
                  value={formData.taskName}
                  onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Hours Spent *</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    required
                    value={formData.hoursWorked}
                    onChange={(e) => setFormData({ ...formData, hoursWorked: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#12131a] border border-white/[0.08] rounded-xl text-white font-mono focus:border-[#FF5A1F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Date of Work</label>
                  <CustomDatePicker
                    value={formData.logDate}
                    onChange={(val) => setFormData({ ...formData, logDate: val })}
                    placeholder="Select date"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Description / Details</label>
                <textarea
                  rows={3}
                  placeholder="Describe your creative milestones..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12131a] border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:border-[#FF5A1F] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5A1F] hover:bg-[#e04810] text-white transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
