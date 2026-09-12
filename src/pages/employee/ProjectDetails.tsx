import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Coins,
  Calendar,
  Clock,
  Plus,
  FileCheck2,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { formatINR } from '../../utils/formatters';
import { useToast } from '../../components/work/Toast';
import { CustomSelect } from '../../components/work/CustomSelect';

export const EmployeeProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [project, setProject] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [employeeCommission, setEmployeeCommission] = useState<any>(null);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employee/projects/${id}`);
      const payload = res.data.data || res.data;
      setProject(payload?.project || payload);
      setAssignment(payload?.assignment || null);
      setEmployeeCommission(payload?.employeeCommission || null);
      setWorkLogs(payload?.workLogs || []);
    } catch (err) {
      console.error('Error fetching project details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      await api.patch(`/employee/projects/${id}/status`, { status: newStatus });
      toast.success(`Project status updated to ${newStatus.replace('_', ' ')}`);
      setProject((prev: any) => ({ ...prev, status: newStatus }));
      fetchDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update project status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-white/50 font-mono">Project not found.</div>;

  const poolTotal =
    employeeCommission?.totalCommission ??
    employeeCommission?.expectedCommission ??
    assignment?.allocatedCommission ??
    0;
  const poolPaid = employeeCommission?.paidCommission ?? 0;
  const poolPending =
    employeeCommission?.pendingCommission ??
    Math.max(0, poolTotal - poolPaid);
  const poolEarned = employeeCommission?.earnedCommission ?? 0;
  const sharePercent = employeeCommission?.sharePercent ?? assignment?.sharePercent ?? assignment?.sharePercentage;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/employee/projects"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title text-2xl font-extrabold text-white tracking-tight">{project.projectName || project.title}</h1>
            </div>
            <p className="page-subtitle text-xs text-white/50 font-mono mt-0.5">
              Client: {project.clientId?.companyName || project.clientId?.name || 'Aagspire Partner'} &bull; Role: {employeeCommission?.roleInProject || assignment?.roleInProject || 'Creator'}
              {sharePercent != null && (
                <span> &bull; Your pool: {sharePercent}%</span>
              )}
            </p>
          </div>
        </div>

        {/* Project Status Selector for Employee */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-[#0d0e14] border border-white/[0.08] p-1.5 rounded-xl">
          <span className="text-[11px] font-mono uppercase text-zinc-400 pl-2">Status:</span>
          <div className="w-38">
            <CustomSelect
              value={project.status}
              onChange={handleStatusChange}
              disabled={updatingStatus}
              options={[
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'In Review' },
                { value: 'completed', label: 'Completed' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Your Commission Pool — own share only */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider font-mono">Your Commission Pool</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="premium-card p-4 rounded-2xl space-y-1 border-[#FF5A1F]/20">
            <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">TOTAL</span>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-white tracking-tight">
              {formatINR(poolTotal)}
            </p>
            <span className="text-[10px] text-zinc-500 block">
              {poolEarned > 0 && poolEarned !== poolTotal
                ? `Earned: ${formatINR(poolEarned)}`
                : 'Total commission'}
            </span>
          </div>

          <div className="premium-card p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">PAID</span>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-white tracking-tight">
              {formatINR(poolPaid)}
            </p>
            <span className="text-[10px] text-zinc-500 block">Paid to you</span>
          </div>

          <div className="premium-card p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold font-mono text-white/60 uppercase tracking-wider block">PENDING</span>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-[#FF5A1F] tracking-tight">
              {formatINR(poolPending)}
            </p>
            <span className="text-[10px] text-zinc-500 block">
              {(employeeCommission?.payableBalance ?? 0) > 0
                ? `Ready to settle: ${formatINR(employeeCommission.payableBalance)}`
                : 'Pending balance'}
            </span>
          </div>
        </div>
      </div>

      {/* Brief */}
      <div className="premium-card p-6 rounded-2xl space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono border-b border-white/10 pb-2">Creative Brief & Scope</h2>
        <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
          {project.description || 'No specific creative guidelines attached.'}
        </p>
      </div>

      {/* Timesheet Logs on this project */}
      <div className="premium-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            My Production Logs ({workLogs.length})
          </h2>
          <Link
            to="/employee/work"
            className="btn-premium btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Hours</span>
          </Link>
        </div>

        <div className="space-y-2.5">
          {workLogs.length > 0 ? (
            workLogs.map((log: any) => (
              <div
                key={log._id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:border-white/15 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{log.taskName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                      {log.hoursWorked}h
                    </span>
                  </div>
                  {log.description && <p className="text-[11px] text-white/40 mt-1">{log.description}</p>}
                </div>
                <StatusBadge status={log.status} type="workLog" />
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-white/40 font-mono text-xs">
              No timesheets recorded for this project yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
