import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/work/Toast';
import {
  Layers,
  FileCheck,
  Tag,
  Target,
  Scissors,
  Users,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  Sliders,
  ArrowRight,
  PieChart as PieIcon,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { MonthSelectDropdown } from '../../components/work/MonthSelectDropdown';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';

// Format Indian Rupee currency: e.g. ₹ 12,50,000
const formatINR = (val: number | string | undefined): string => {
  const num = Number(val) || 0;
  return `₹ ${num.toLocaleString('en-IN')}`;
};

// Lakhs short formatter for axes: e.g. 5L, 10L, 20L
const formatLakhs = (val: number): string => {
  if (val === 0) return '0';
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return String(val);
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  // Fixed minimal obsidian dark theme
  const isLight = false;

  // State for data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic real months list & current month first
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dynamicMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  });

  const [pendingTab, setPendingTab] = useState<'workLogs' | 'payments'>('workLogs');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  const fetchDashboardData = async (monthVal?: string) => {
    try {
      setLoading(true);
      const m = monthVal !== undefined ? monthVal : selectedMonth;
      const query = m ? `?month=${encodeURIComponent(m)}` : '';
      const res = await api.get(`/admin/dashboard${query}`);
      setData(res.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const handleApproveWorkLog = async (id: string) => {
    try {
      await api.patch(`/admin/work-logs/${id}/status`, { status: 'approved' });
      toast.success('Work log approved successfully');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve work log');
    }
  };

  const handleRejectWorkLog = async (id: string) => {
    const feedback = prompt('Enter reason for rejection:');
    if (feedback === null) return;
    try {
      await api.patch(`/admin/work-logs/${id}/status`, {
        status: 'rejected',
        rejectionReason: feedback || 'Does not meet criteria',
      });
      toast.success('Work log marked as rejected');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject work log');
    }
  };

  // Dynamic greeting based on time of day
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // 100% Real Live KPIs from Database
  const kpis = data?.kpis || {};
  const totalProjectValue = Number(kpis.totalProjectValue || 0);
  const clientPaymentsReceived = Number(kpis.totalReceived || 0);
  const outstandingPayments = Number(kpis.outstandingAmount || 0);
  const employeeCommission = Number(kpis.totalEmployeeAllocation || 0);
  const officeExpense = Number(kpis.totalOfficeAllocation || 0);
  const adminShare = Number(kpis.totalAdminShare || 0);
  const settlementReserve = Number(kpis.totalSettlementReserve || 0);
  const activeProjectsCount = Number(kpis.totalProjectsCount || 0);

  // Real Database Monthly Trend Data (Last 6 Months)
  const rawTrends = data?.monthlyTrends || data?.monthlyChart || [];
  const chartData = rawTrends.length > 0
    ? rawTrends.map((t: any) => ({
        month: t.month,
        revenue: Number(t.revenue || 0),
        received: Number(t.collections || t.collected || 0),
        outstanding: Math.max(0, Number(t.revenue || 0) - Number(t.collections || t.collected || 0)),
      }))
    : dynamicMonths.slice(0, 6).reverse().map((m) => ({
        month: m.split(' ')[0],
        revenue: 0,
        received: 0,
        outstanding: 0,
      }));

  const hasAnyRevenue = chartData.some((d: any) => d.revenue > 0 || d.received > 0);
  const maxBarRevenue = Math.max(...chartData.map((d: any) => Math.max(d.revenue, d.received, 100000)));

  // Real Commission Distribution from Database
  const rawDistribution = data?.distribution || [];
  const hasCommissionData = rawDistribution.some((d: any) => d.value > 0);
  const commissionData = hasCommissionData
    ? rawDistribution
    : [
        { name: 'Employee Pool', value: 0, color: '#FF5A1F' },
        { name: 'Admin Share', value: 0, color: '#FFFFFF' },
        { name: 'Office Expense', value: 0, color: '#D4D4D8' },
        { name: 'Broker Fee', value: 0, color: '#A1A1AA' },
        { name: 'Reserve Fund', value: 0, color: '#71717A' },
      ];

  const totalCommPercent = commissionData.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

  // Real Recent Projects from Database
  const recentProjects = (data?.recentProjects || []).map((p: any) => ({
    id: p._id,
    name: p.projectName || p.title || 'Untitled Project',
    client: p.clientId?.companyName || p.clientId?.name || 'Direct Client',
    value: Number(p.projectValue || p.totalAmount || 0),
    status: p.status || 'in_progress',
  }));

  // Real Pending Approvals from Database
  const pendingWorkLogs = (data?.pendingWorkLogs || []).map((l: any) => ({
    id: l._id,
    name: l.employeeId?.fullName || l.employeeId?.name || 'Staff Member',
    project: l.projectId?.projectName || l.taskName || 'Assigned Task',
    hours: l.hoursWorked ? `${l.hoursWorked}h` : '',
    initials: (l.employeeId?.fullName || l.employeeId?.name || 'ST').slice(0, 2).toUpperCase(),
  }));

  const recentPayments = (data?.recentPayments || []).map((p: any) => ({
    id: p._id,
    name: p.clientId?.companyName || p.clientId?.name || 'Client',
    project: p.projectId?.projectName || p.notes || 'Project Payment',
    amount: Number(p.amount || 0),
    date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : 'Recent',
    initials: (p.clientId?.companyName || p.clientId?.name || 'CL').slice(0, 2).toUpperCase(),
  }));

  // Colors and theme helpers
  const cardBg = isLight
    ? 'bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
    : 'bg-gradient-to-b from-[#0e1017] to-[#08090d] border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.5)]';
  
  const headingColor = isLight ? 'text-slate-900' : 'text-white';
  const subtextColor = isLight ? 'text-slate-500' : 'text-white/50';


  const availableMonths = (data?.availableMonths && data.availableMonths.length > 0)
    ? data.availableMonths
    : dynamicMonths.map((label, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { key, label };
      });

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-ember border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-ember tracking-wider uppercase">Loading live metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Error Alert if any */}
      {error && (
        <div className="p-4 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b transition-colors duration-300 border-slate-200/80 dark:border-white/10">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2 ${headingColor}`}>
            <span>{greeting}, {user?.name ? user.name.split(' ')[0] : 'Admin'}</span>
            <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className={`text-sm mt-1 font-medium ${subtextColor}`}>
            Here's what's happening at Aagspire today.
          </p>
        </div>

        {/* Right Header Toolbar: Month Filter, Notifications & Admin Profile */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Month Filter Dropdown (Styled like CTA 'Vision' Selector) */}
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={setSelectedMonth}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
          />

          {/* Admin User Chip */}
          <div className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#0c0d12]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-ember to-ember-deep flex items-center justify-center font-bold text-xs text-white shadow-sm">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-xs font-bold text-white">
                {user?.name || 'Admin'}
              </div>
              <div className="text-[10px] font-mono text-[#FF5A1F] font-semibold tracking-wide uppercase">
                {user?.role === 'admin' ? 'Super Admin' : user?.role || 'Admin'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 8 KPI METRIC CARDS (2 rows of 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        
        {/* Card 1: Total Project Value */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
            <Layers className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {formatINR(totalProjectValue)}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Total Project Value
            </div>
          </div>
        </div>

        {/* Card 2: Client Payments Received */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {formatINR(clientPaymentsReceived)}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Client Payments Received
            </div>
          </div>
        </div>

        {/* Card 3: Outstanding Payments */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
            <Tag className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {formatINR(outstandingPayments)}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Outstanding Payments
            </div>
          </div>
        </div>

        {/* Card 4: Employee Commission */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-ember/10 text-ember border border-ember/20">
            <Target className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {formatINR(employeeCommission)}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Employee Commission
            </div>
          </div>
        </div>

        {/* Card 5: Office Expense */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
            <Scissors className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {formatINR(officeExpense)}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Office Expense
            </div>
          </div>
        </div>

        {/* Card 6: Admin Share */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
            <Users className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {formatINR(adminShare)}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Admin Share
            </div>
          </div>
        </div>

        {/* Card 7: Settlement Reserve */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {formatINR(settlementReserve)}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Settlement Reserve
            </div>
          </div>
        </div>

        {/* Card 8: Active Projects */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-ember/10 text-ember border border-ember/20">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-extrabold tracking-tight ${headingColor}`}>
              {activeProjectsCount}
            </div>
            <div className={`text-xs font-medium mt-1 ${subtextColor}`}>
              Active Projects
            </div>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE SECTION: DUAL CHARTS (Website Ember Colors) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Chart 1: Monthly Project Revenue (Bar Chart in Aagspire Ember Gradient) */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-base font-bold tracking-tight ${headingColor}`}>
                Monthly Project Revenue
              </h2>
              {!hasAnyRevenue && (
                <p className="text-[11px] font-mono text-slate-400 dark:text-white/40">
                  No contracted projects recorded yet
                </p>
              )}
            </div>
            <span className="text-xs font-mono text-ember font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Aagspire Analytics
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="emberBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5A1F" />
                    <stop offset="100%" stopColor="#FF7A45" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isLight ? '#f1f5f9' : '#ffffff10'}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 12, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11 }}
                  tickFormatter={formatLakhs}
                  domain={[0, Math.ceil(maxBarRevenue * 1.2)]}
                />
                <Tooltip
                  cursor={{ fill: isLight ? 'rgba(255,90,31,0.06)' : 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    backgroundColor: isLight ? '#ffffff' : '#181818',
                    borderColor: isLight ? '#e2e8f0' : '#ffffff20',
                    borderRadius: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    color: isLight ? '#0f172a' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(val: any) => [formatINR(val), 'Project Revenue']}
                />
                <Bar
                  dataKey="revenue"
                  fill="url(#emberBarGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Payments Received vs Outstanding (Area / Line Chart) */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className={`text-base font-bold tracking-tight ${headingColor}`}>
              Payments Received vs Outstanding
            </h2>
            {/* Custom Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-ember">
                <span className="w-2.5 h-2.5 rounded-full bg-ember" /> Received
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" /> Outstanding
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  {/* Received Area Gradient: Aagspire Ember Orange */}
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A1F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF5A1F" stopOpacity={0.01} />
                  </linearGradient>
                  {/* Outstanding Area Gradient: Monochrome Muted Zinc */}
                  <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A1A1AA" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#A1A1AA" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isLight ? '#f1f5f9' : '#ffffff10'}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 12, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11 }}
                  tickFormatter={formatLakhs}
                  domain={[0, Math.ceil(maxBarRevenue * 1.2)]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#ffffff' : '#181818',
                    borderColor: isLight ? '#e2e8f0' : '#ffffff20',
                    borderRadius: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    color: isLight ? '#0f172a' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(val: any, name: any) => [
                    formatINR(val),
                    name === 'received' ? 'Payments Received' : 'Outstanding Dues',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#FF5A1F"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                  name="received"
                  activeDot={{ r: 5, stroke: '#FF5A1F', strokeWidth: 2, fill: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="outstanding"
                  stroke="#A1A1AA"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutstanding)"
                  name="outstanding"
                  activeDot={{ r: 4, stroke: '#A1A1AA', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: 3 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Column 1 (4 cols): Commission Distribution Donut */}
        <div className={`lg:col-span-4 p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-ember/10 border border-ember/20 flex items-center justify-center text-ember shrink-0">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className={`text-sm font-bold tracking-tight ${headingColor}`}>
                    Commission Distribution
                  </h2>
                  <p className={`text-[11px] font-mono ${subtextColor}`}>5-Tier Multi-Tier Splits</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider bg-white/10 text-white border border-white/20">
                100% Balanced
              </span>
            </div>

            <div className="h-60 w-full relative flex items-center justify-between">
              <div className="w-1/2 h-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={commissionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={78}
                      paddingAngle={hasCommissionData ? 4 : 0}
                      cornerRadius={4}
                      dataKey="value"
                      stroke={isLight ? '#ffffff' : '#0e1017'}
                      strokeWidth={2}
                    >
                      {commissionData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0e1017',
                        borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                      }}
                      formatter={(v: any) => [`${v}%`, 'Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Centered Donut Label */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className={`text-xl font-extrabold tracking-tight font-mono ${headingColor}`}>
                    {totalCommPercent > 0 ? `${Math.round(totalCommPercent)}%` : '0%'}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-ember font-bold">
                    {hasCommissionData ? 'Total Pool' : 'No Data'}
                  </div>
                </div>
              </div>

              {/* Legend alongside donut */}
              <div className="w-1/2 space-y-2 pl-2">
                {commissionData.map((item: any) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border transition-all ${
                      isLight ? 'bg-slate-50/60 border-slate-100 hover:border-slate-200' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                      <span className={`text-[11px] font-medium truncate ${subtextColor}`}>
                        {item.name}
                      </span>
                    </span>
                    <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      isLight ? 'bg-white text-slate-900 border border-slate-200' : 'bg-white/5 text-white border border-white/10'
                    }`}>
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/10 mt-3">
            <Link
              to="/admin/commissions"
              className="group flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.02] hover:bg-ember/10 border border-slate-200 dark:border-white/10 hover:border-ember/30 text-xs font-semibold text-slate-700 dark:text-white/80 hover:text-ember transition-all"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-ember" />
                <span>Configure 5-Tier Presets</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 group-hover:text-ember group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Column 2 (5 cols): Recent Projects Table */}
        <div className={`lg:col-span-5 p-5 sm:p-6 rounded-2xl border transition-all duration-200 space-y-4 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold tracking-tight ${headingColor}`}>
              Recent Projects
            </h2>
            <Link to="/admin/projects" className="text-xs font-semibold text-ember hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                isLight ? 'border-slate-100 text-slate-400' : 'border-white/10 text-white/40 font-mono'
              }`}>
                <tr>
                  <th className="pb-2.5 font-semibold">Project Name</th>
                  <th className="pb-2.5 font-semibold">Client</th>
                  <th className="pb-2.5 font-semibold">Value</th>
                  <th className="pb-2.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
                {recentProjects.length > 0 ? (
                  recentProjects.map((prj: any) => (
                    <tr key={prj.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50/70' : 'hover:bg-white/[0.02]'}`}>
                      <td className="py-3 font-semibold truncate max-w-[130px]">
                        <span className={headingColor}>{prj.name}</span>
                      </td>
                      <td className={`py-3 truncate max-w-[110px] ${subtextColor}`}>
                        {prj.client}
                      </td>
                      <td className={`py-3 font-semibold font-mono ${headingColor}`}>
                        {formatINR(prj.value)}
                      </td>
                      <td className="py-3 text-right">
                        <StatusBadge status={prj.status} type="project" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs font-mono text-slate-400 dark:text-white/40">
                      No projects recorded in database yet.{' '}
                      <Link to="/admin/projects" className="text-ember hover:underline">
                        Create Project &rarr;
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3 (3.5 cols): Pending Approvals */}
        <div className={`lg:col-span-3 p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-base font-bold tracking-tight ${headingColor}`}>
                Pending Approvals
              </h2>
              <Link
                to={pendingTab === 'workLogs' ? '/admin/work-logs' : '/admin/payments'}
                className="text-xs font-semibold text-ember hover:underline"
              >
                View All
              </Link>
            </div>

            {/* Switchable Tabs: Work Logs vs Payments */}
            <div className={`grid grid-cols-2 p-1 rounded-xl mb-3 border ${
              isLight ? 'bg-slate-100/70 border-slate-200/60' : 'bg-white/5 border-white/10'
            }`}>
              <button
                onClick={() => setPendingTab('workLogs')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  pendingTab === 'workLogs'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-ember text-white shadow-[0_0_12px_rgba(255,90,31,0.4)]'
                    : subtextColor
                }`}
              >
                Work Logs ({pendingWorkLogs.length})
              </button>
              <button
                onClick={() => setPendingTab('payments')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  pendingTab === 'payments'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-ember text-white shadow-[0_0_12px_rgba(255,90,31,0.4)]'
                    : subtextColor
                }`}
              >
                Payments ({recentPayments.length})
              </button>
            </div>

            {/* Pending List Items */}
            <div className="space-y-3 mt-3">
              {pendingTab === 'workLogs' ? (
                pendingWorkLogs.length > 0 ? (
                  pendingWorkLogs.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                        isLight
                          ? 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-xs shrink-0 text-slate-700 dark:text-white">
                          {item.initials}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${headingColor}`}>
                            {item.name}
                          </div>
                          <div className={`text-[11px] truncate ${subtextColor}`}>
                            {item.project} {item.hours ? `• ${item.hours}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleApproveWorkLog(item.id)}
                          title="Approve"
                          className="p-1.5 rounded-lg bg-ember/15 hover:bg-ember/25 text-ember transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectWorkLog(item.id)}
                          title="Reject"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-slate-400 dark:text-white/40">
                    No submitted timesheets awaiting approval.
                  </div>
                )
              ) : (
                recentPayments.length > 0 ? (
                  recentPayments.map((p: any) => (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                        isLight
                          ? 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-ember/15 text-ember flex items-center justify-center font-bold text-xs shrink-0">
                          {p.initials}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${headingColor}`}>
                            {p.name}
                          </div>
                          <div className={`text-[11px] truncate ${subtextColor}`}>
                            {p.project} &bull; <span className="font-mono font-semibold text-white">{formatINR(p.amount)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {p.date}
                          </div>
                        </div>
                      </div>

                      <Link
                        to="/admin/payments"
                        title="View Payment Details"
                        className="p-1.5 rounded-lg bg-ember/10 hover:bg-ember/20 text-ember transition-colors shrink-0"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-slate-400 dark:text-white/40">
                    No client payments recorded yet.
                  </div>
                )
              )}
            </div>
          </div>

          <div className="pt-3 border-t text-[11px] font-mono text-center border-slate-100 dark:border-white/10 mt-3">
            <span className={subtextColor}>
              {pendingWorkLogs.length} pending work logs &bull; {recentPayments.length} recorded payments
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
