import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Coins,
  FileText,
  Clock,
  Folder,
  ArrowUpRight,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClockWidget } from '../../components/work/ClockWidget';
import { NotificationBell } from '../../components/work/NotificationBell';
import { formatINR } from '../../utils/formatters';
import { StatusBadge } from '../../components/work/StatusBadge';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employee/dashboard');
      const payload = res.data?.kpis
        ? res.data
        : res.data?.data?.kpis
        ? res.data.data
        : res.data?.data || res.data;
      setData(payload);
    } catch (err) {
      console.error('Error fetching employee dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const earnings = data?.earnings || {};
  const earningsProjects = earnings?.projects || [];
  const projects = data?.activeProjects || data?.assignedProjects || [];
  const recentLogs = data?.recentWorkLogs || [];

  const totalCommission = Number(
    kpis.totalExpected ??
    earnings.totalExpectedCommission ??
    earnings.totalExpected ??
    kpis.totalEarned ??
    0
  );
  const totalPaid = Number(kpis.totalPaid ?? earnings.totalPaid ?? 0);
  const totalEarned = Number(kpis.totalEarnedCommission ?? kpis.totalEarned ?? earnings.totalEarned ?? 0);
  const remainingBalance = Math.max(0, totalCommission - totalPaid);
  const netPayable = Number(kpis.payableBalance ?? kpis.totalPayable ?? earnings.totalPayable ?? Math.max(0, totalEarned - totalPaid));
  const assignedProjectsCount = kpis.activeProjectsCount ?? kpis.totalAssignedProjects ?? projects.length ?? 0;
  const approvedHours = kpis.approvedHours ?? 0;

  // Formatting user details for header
  const fullName = user?.name || 'Rahul J.';
  const firstName = fullName.split(' ')[0] || 'Rahul';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('') || 'RJ';

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-8">
      {/* Top Header Row matching mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Welcome greeting */}
        <div>
          <span className="text-xs sm:text-sm text-zinc-400 block font-normal">Welcome back,</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
            <span>{firstName}</span>
            <span>👋</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            Here's your workspace overview for today.
          </p>
        </div>

        {/* Right: Notifications, User profile & Date */}
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="text-left">
                <span className="block text-xs font-semibold text-white leading-tight">
                  {fullName}
                </span>
                <span className="block text-[10px] text-zinc-500 leading-tight capitalize">
                  {user?.role || 'Employee'}
                </span>
              </div>
            </div>
          </div>

          <span className="text-xs text-zinc-500 font-normal">
            {todayDateStr}
          </span>
        </div>
      </div>

      {/* Daily Attendance Card Widget */}
      <ClockWidget onStatusChange={fetchDashboard} />

      {/* 3 KPI Metric Cards: Total, Paid, Pending */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: TOTAL */}
        <div className="rounded-2xl bg-[#0e1017] border border-[#FF5A1F]/40 p-5 relative overflow-hidden shadow-[0_0_25px_rgba(255,90,31,0.06)]">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{assignedProjectsCount} projects</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-4">
            TOTAL
          </span>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              {formatINR(totalCommission)}
            </span>
          </div>
          <span className="text-xs text-zinc-500 block mt-1">
            {totalEarned > 0 && totalEarned !== totalCommission
              ? `Earned: ${formatINR(totalEarned)}`
              : 'Total commission'}
          </span>
        </div>

        {/* Card 2: PAID */}
        <div className="rounded-2xl bg-[#0e1017] border border-white/[0.06] p-5 relative">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-zinc-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-4">
            PAID
          </span>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              {formatINR(totalPaid)}
            </span>
          </div>
          <span className="text-xs text-zinc-500 block mt-1">Paid to you</span>
        </div>

        {/* Card 3: PENDING */}
        <div className="rounded-2xl bg-[#0e1017] border border-white/[0.06] p-5 relative">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-zinc-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            {approvedHours > 0 && (
              <span className="text-[10px] font-mono text-zinc-500">{approvedHours} hrs logged</span>
            )}
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-4">
            PENDING
          </span>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#FF5A1F] tracking-tight font-sans">
              {formatINR(remainingBalance)}
            </span>
          </div>
          <span className="text-xs text-zinc-500 block mt-1">
            {netPayable > 0
              ? `Ready to settle: ${formatINR(netPayable)}`
              : 'Pending balance'}
          </span>
        </div>
      </div>

      {/* Two Columns Grid: Assigned Projects & Recent Production Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Assigned Projects */}
        <div className="rounded-2xl bg-[#0e1017] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Folder className="w-5 h-5 text-zinc-300" />
              <h2 className="text-base font-bold text-white tracking-tight">Assigned Projects</h2>
            </div>
            <Link
              to="/employee/projects"
              className="text-xs font-semibold text-[#FF5A1F] hover:text-[#ff7543] transition-colors"
            >
              View All &rarr;
            </Link>
          </div>

          {/* Table Header: Consistent with Projects page */}
          <div className="grid grid-cols-12 px-3 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="col-span-3">PROJECT NAME</div>
            <div className="col-span-2 text-center">TOTAL</div>
            <div className="col-span-2 text-center">PAID</div>
            <div className="col-span-2 text-center">PENDING</div>
            <div className="col-span-2 text-center">STATUS</div>
            <div className="col-span-1 text-right">ACTION</div>
          </div>

          {/* Projects Rows */}
          <div className="space-y-2.5">
            {projects.length > 0 ? (
              projects.slice(0, 5).map((item: any) => {
                const prj = item.projectId || item;
                const projectName = prj.projectName || prj.title || 'Creative Task';
                const prjId = prj._id || item._id || item.id;
                const prjEarning = earningsProjects.find(
                  (ep: any) =>
                    ep.projectId?.toString() === prjId?.toString() ||
                    ep.id?.toString() === prjId?.toString() ||
                    ep.projectName?.toLowerCase() === projectName?.toLowerCase()
                );
                const poolTotal =
                  prjEarning?.expectedCommission ??
                  item.poolTotal ??
                  item.employeeCommission?.totalCommission ??
                  item.employeeCommission?.expectedCommission ??
                  item.expectedCommission ??
                  0;
                const poolPaid =
                  prjEarning?.paidCommission ??
                  item.poolPaid ??
                  item.employeeCommission?.paidCommission ??
                  item.paidCommission ??
                  0;
                const poolPending =
                  prjEarning != null
                    ? Math.max(0, (prjEarning.expectedCommission || 0) - (prjEarning.paidCommission || 0))
                    : item.poolPending ?? item.employeeCommission?.pendingCommission ?? Math.max(0, poolTotal - poolPaid);

                return (
                  <div
                    key={prjId}
                    className="grid grid-cols-12 items-center p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all"
                  >
                    <div className="col-span-3 min-w-0 pr-2">
                      <span className="font-semibold text-xs text-white block truncate" title={projectName}>
                        {projectName}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="font-mono text-xs font-semibold text-white">
                        {formatINR(poolTotal)}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="font-mono text-xs font-semibold text-white/80">
                        {formatINR(poolPaid)}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="font-mono text-xs font-bold text-[#FF5A1F]">
                        {formatINR(poolPending)}
                      </span>
                    </div>

                    <div className="col-span-2 flex justify-center">
                      <StatusBadge status={prj.status || item.status || 'in_progress'} type="project" />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <Link
                        to={`/employee/projects/${prjId}`}
                        className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="View project details"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                No active projects assigned yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Production Logs */}
        <div className="rounded-2xl bg-[#0e1017] border border-white/[0.06] p-6 space-y-4 flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-zinc-300" />
                <h2 className="text-base font-bold text-white tracking-tight">Recent Production Logs</h2>
              </div>
              <Link
                to="/employee/work"
                className="text-xs font-semibold text-[#FF5A1F] hover:text-[#ff7543] transition-colors"
              >
                Log Hours &rarr;
              </Link>
            </div>
          </div>

          {/* Body: Logs or Empty State */}
          {recentLogs.length > 0 ? (
            <div className="space-y-2.5 flex-1 mt-2">
              {recentLogs.slice(0, 4).map((log: any) => (
                <div
                  key={log._id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-white block truncate">
                      {log.taskName}
                    </span>
                    <span className="text-[11px] text-zinc-500 block truncate mt-0.5">
                      {log.projectId?.projectName || 'Project Task'} &bull; {log.hoursWorked ?? 0}h
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                    {log.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* Mockup Exact Empty State */
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-zinc-500 mb-3">
                <Clock className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-300">No production logs yet</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Your submitted work hours will appear here.
              </p>
              <Link
                to="/employee/work"
                className="mt-4 px-4 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_4px_15px_rgba(255,90,31,0.25)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Hours</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Page Footer matching mockup */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.04] text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-[#FF5A1F]" />
          <span>Work Create Grow</span>
        </div>
        <span>&copy; {new Date().getFullYear()} Aagspire. All rights reserved.</span>
      </div>
    </div>
  );
};
