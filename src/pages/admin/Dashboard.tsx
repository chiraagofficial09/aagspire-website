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
  ClipboardList,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  Info,
  Sliders,
  ArrowRight,
  PieChart as PieIcon,
  Calendar,
  Clock,
  Wallet,
  TrendingUp,
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
  Legend,
} from 'recharts';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/work/StatusBadge';
import { parseAmount, formatINR } from '../../utils/formatters';

// Format split percentage: whole numbers as 40%, fractional as 23.45%
const formatSplitPercent = (val: number | string | undefined): string => {
  const num = Number(val) || 0;
  return num % 1 === 0 ? `${num}%` : `${num.toFixed(2)}%`;
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

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // 100% Real Live KPIs from Database & Shared Financial Engine
  const kpis = data?.kpis || {};
  const finMetrics = data?.financialMetrics || {};
  const empFinance = data?.employeeFinance || {};
  const settlementFinance = data?.settlementReserve || {};

  // 6 Primary Financial Metrics
  const newProjectValue = Number(kpis.newProjectValue ?? finMetrics.newProjectValue ?? kpis.totalProjectValue ?? 0);
  const cashCollected = Number(kpis.cashCollected ?? finMetrics.cashCollected ?? kpis.totalReceived ?? 0);
  const currentMonthCollection = Number(kpis.currentMonthCollection ?? finMetrics.currentMonthCollection ?? 0);
  const previousOutstandingCollected = Number(kpis.previousOutstandingCollected ?? finMetrics.previousOutstandingCollected ?? 0);
  const openingReceivable = Number(kpis.openingReceivable ?? finMetrics.openingReceivable ?? 0);
  const closingReceivable = Number(kpis.closingReceivable ?? finMetrics.closingReceivable ?? kpis.outstandingAmount ?? 0);

  // Supporting Cash Accounting
  const appliedCollections = Number(kpis.appliedCollections ?? finMetrics.appliedCollections ?? 0);
  const unappliedCash = Number(kpis.unappliedCash ?? finMetrics.unappliedCash ?? 0);
  const excessCash = Number(kpis.excessCash ?? finMetrics.excessCash ?? 0);
  const collectionRate = Number(kpis.collectionRate ?? finMetrics.collectionRate ?? 0);

  // Informational banner condition
  const hasPreviousCollections = Boolean(kpis.hasPreviousCollections || previousOutstandingCollected > 0 || cashCollected > newProjectValue);
  const previousCollectionsMessage =
    kpis.previousCollectionsMessage ||
    finMetrics.previousCollectionsMessage ||
    (hasPreviousCollections
      ? `₹${previousOutstandingCollected.toLocaleString('en-IN')} of this month's collections came from projects booked in previous months.`
      : '');

  // Employee Finance Breakdown
  const expectedCommission = Number(empFinance.expectedCommission ?? kpis.expectedCommission ?? kpis.totalEmployeeAllocation ?? 0);
  const earnedCommission = Number(empFinance.earnedCommission ?? kpis.earnedCommission ?? 0);
  const employeePaid = Number(empFinance.employeePaid ?? kpis.employeePaid ?? 0);
  const employeePayable = Number(empFinance.employeePayable ?? kpis.employeePayable ?? Math.max(0, earnedCommission - employeePaid));
  const employeeAdvance = Number(empFinance.employeeAdvance ?? kpis.employeeAdvance ?? Math.max(0, employeePaid - earnedCommission));

  // Settlement Reserve (Project Reserve Fund - strictly NOT employee payout)
  const settlementReserveExpected = Number(settlementFinance.settlementReserveExpected ?? kpis.settlementReserveExpected ?? kpis.totalSettlementReserve ?? 0);
  const settlementReserveAccrued = Number(settlementFinance.settlementReserveAccrued ?? kpis.settlementReserveAccrued ?? 0);
  const settlementReserveRate = Number(settlementFinance.settlementReserveRate ?? kpis.settlementReserveRate ?? 5);

  const activeProjectsCount = Number(kpis.activeProjectsCount ?? kpis.totalProjectsCount ?? 0);

  // Real Database Monthly Trend Data (Shared source of truth)
  const rawTrends = data?.monthlyTrends || data?.monthlyChart || [];
  const chartData = rawTrends.length > 0
    ? rawTrends.map((t: any) => ({
        month: t.month,
        key: t.key,
        bookings: Number(t.bookings ?? t.revenue ?? 0),
        collections: Number(t.collections ?? t.collected ?? 0),
        currentMonthCollection: Number(t.currentMonthCollection ?? 0),
        previousOutstandingCollected: Number(t.previousOutstandingCollected ?? 0),
        openingReceivable: Number(t.openingReceivable ?? 0),
        closingReceivable: Number(t.closingReceivable ?? 0),
        appliedCollections: Number(t.appliedCollections ?? 0),
        unappliedCash: Number(t.unappliedCash ?? 0),
      }))
    : dynamicMonths.slice(0, 6).reverse().map((m) => ({
        month: m.split(' ')[0],
        bookings: 0,
        collections: 0,
        currentMonthCollection: 0,
        previousOutstandingCollected: 0,
        openingReceivable: 0,
        closingReceivable: 0,
        appliedCollections: 0,
        unappliedCash: 0,
      }));

  const hasAnyRevenue = chartData.some((d: any) => d.bookings > 0 || d.collections > 0);
  const maxBarRevenue = Math.max(...chartData.map((d: any) => Math.max(d.bookings, d.collections, d.closingReceivable, 100000)));

  // Real Commission Distribution from Database (White & Orange minimal palette)
  const splitColors: Record<string, string> = {
    employee: '#FF5A1F',
    admin: '#FFFFFF',
    office: '#94A3B8',
    broker: '#FB923C',
    settlement: '#64748B',
  };

  const rawDistribution = data?.distribution || [];
  const hasCommissionData = rawDistribution.some((d: any) => d.value > 0);
  const baseCommissionData = (hasCommissionData
    ? rawDistribution
    : [
        { name: 'Employee Pool', key: 'employee', value: 0, color: '#FF5A1F' },
        { name: 'Admin Share', key: 'admin', value: 0, color: '#FFFFFF' },
        { name: 'Office Expense', key: 'office', value: 0, color: '#94A3B8' },
        { name: 'Broker Fee', key: 'broker', value: 0, color: '#FB923C' },
        { name: 'Reserve Fund', key: 'settlement', value: 0, color: '#64748B' },
      ]
  ).map((item: any) => ({
    ...item,
    color: splitColors[item.key] || item.color || '#FF5A1F',
  }));

  // Reconcile individual slice values so they sum cleanly to 100%
  const rawCommSum = baseCommissionData.reduce((sum: number, c: any) => sum + (Number(c.value) || 0), 0);
  const commissionData = [...baseCommissionData];
  if (Math.abs(rawCommSum - 100) < 0.05 && rawCommSum !== 100 && commissionData.length > 0) {
    const diff = Math.round((100 - rawCommSum) * 100) / 100;
    let maxIdx = 0;
    for (let i = 1; i < commissionData.length; i++) {
      if ((commissionData[i].value || 0) > (commissionData[maxIdx].value || 0)) {
        maxIdx = i;
      }
    }
    commissionData[maxIdx] = {
      ...commissionData[maxIdx],
      value: Math.round(((commissionData[maxIdx].value || 0) + diff) * 100) / 100,
    };
  }

  const totalCommPercent = commissionData.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

  // 5-Tier Project Commission Allocations (Employee, Admin, Office, Broker, Reserve Fund)
  const employeeShareData = commissionData.find((c: any) => c.key === 'employee' || /employee/i.test(c.name)) || { name: 'Employee Share', value: 0, amount: 0 };
  const adminShareData = commissionData.find((c: any) => c.key === 'admin' || /admin/i.test(c.name)) || { name: 'Admin Share', value: 0, amount: 0 };
  const officeExpenseData = commissionData.find((c: any) => c.key === 'office' || /office/i.test(c.name)) || { name: 'Office Expense', value: 0, amount: 0 };
  const brokerShareData = commissionData.find((c: any) => c.key === 'broker' || /broker/i.test(c.name)) || { name: 'Broker Share', value: 0, amount: 0 };
  const reserveFundData = commissionData.find((c: any) => c.key === 'settlement' || /reserve|settlement/i.test(c.name)) || { name: 'Reserve Fund', value: settlementReserveRate || 0, amount: 0 };

  const employeeShareAmount = Number(employeeShareData.amount ?? kpis.totalEmployeeAllocation ?? 0);
  const adminShareAmount = Number(adminShareData.amount ?? kpis.totalAdminShare ?? 0);
  const officeExpenseAmount = Number(officeExpenseData.amount ?? kpis.totalOfficeAllocation ?? 0);
  const brokerShareAmount = Number(brokerShareData.amount ?? kpis.totalBrokerAllocation ?? 0);
  const reserveFundAmount = Number(reserveFundData.amount ?? settlementReserveExpected ?? kpis.totalSettlementReserve ?? 0);

  const employeeSharePercent = employeeShareData.value != null ? Number(employeeShareData.value) : (kpis.employeePercent ?? 40);
  const adminSharePercent = adminShareData.value != null ? Number(adminShareData.value) : (kpis.adminPercent ?? 35);
  const officeExpensePercent = officeExpenseData.value != null ? Number(officeExpenseData.value) : (kpis.officePercent ?? 10);
  const brokerSharePercent = brokerShareData.value != null ? Number(brokerShareData.value) : (kpis.brokerPercent ?? 10);
  const reserveFundPercent = reserveFundData.value != null ? Number(reserveFundData.value) : (settlementReserveRate || kpis.settlementPercent || 5);

  // Real Recent Projects from Database
  const recentProjects = (data?.recentProjects || []).map((p: any) => ({
    id: p._id,
    name: p.projectName || p.title || 'Untitled Project',
    client: p.clientId?.companyName || p.clientId?.name || 'Direct Client',
    value: parseAmount(p.projectValue ?? p.totalAmount ?? p.value),
    status: p.status || 'start_process',
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
    amount: parseAmount(p.amount),
    date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : 'Recent',
    initials: (p.clientId?.companyName || p.clientId?.name || 'CL').slice(0, 2).toUpperCase(),
  }));

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
            Projects, payments and pending amounts at a glance.
          </p>
        </div>

        {/* Right Header Toolbar: Month Filter & Admin Profile */}
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={setSelectedMonth}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
          />

          <div className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#0c0d12]">
            <div className="w-7 h-7 rounded-lg bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-center p-1 shadow-sm shrink-0">
              <img
                src="/favicon.svg"
                alt="Aagspire"
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/fire-logo.svg';
                }}
              />
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


      {/* Notice if Unapplied Cash or Excess Cash exists */}
      {(unappliedCash > 0 || excessCash > 0) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {unappliedCash > 0 && `Unapplied Cash: ${formatINR(unappliedCash)} received without valid project link.`}
              {excessCash > 0 && ` Excess Cash: ${formatINR(excessCash)} exceeding project contracted values.`}
              {' '}These amounts do not reduce project receivables until properly reviewed and allocated.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30 shrink-0">
            Needs Review
          </span>
        </div>
      )}

      {/* 2. PRIMARY FINANCIAL EQUATION OVERVIEW */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-3.5">
          {/* Card 1: New Projects */}
          <div className={`flex-1 p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-medium text-white/50">Total This month</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FF5A1F]">
                {formatINR(newProjectValue)}
              </div>
            </div>
          </div>

          {/* Card 2: Previous Month Due */}
          <div className={`flex-1 p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-medium text-white/50">Previous Month Pending</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FF5A1F]">
                {formatINR(openingReceivable)}
              </div>
            </div>
          </div>

          {/* Card 3: Money Received This Month */}
          <div className={`flex-1 p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-medium text-white/50">Money Received This Month</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FF5A1F]">
                {formatINR(cashCollected)}
              </div>
            </div>
          </div>

          {/* Card 4: Remaining Due */}
          <div className={`flex-1 p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-medium text-white/50">Total Pending</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-white/80 border border-white/10">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FF5A1F]">
                {formatINR(closingReceivable)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 ALLOCATION SHARE CARDS: 5-TIER PROJECT-VALUE-WEIGHTED COMMISSION SPLIT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 mt-4 sm:mt-5">
        {/* Card 1: EMPLOYEE SHARE */}
        <div className={`rounded-2xl ${isLight ? 'bg-white border border-slate-200' : 'bg-[#0e1017] border border-white/[0.06] hover:border-[#FF5A1F]/30'} p-4 sm:p-5 relative transition-colors flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Team Commission
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-[#FF5A1F] px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
              {formatSplitPercent(employeeSharePercent)}
            </span>
          </div>
          <div className="mt-3">
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF5A1F] tracking-tight font-sans">
                {formatINR(employeeShareAmount)}
              </span>
            </div>
         
          </div>
        </div>

        {/* Card 2: ADMIN SHARE */}
        <div className={`rounded-2xl ${isLight ? 'bg-white border border-slate-200' : 'bg-[#0e1017] border border-white/[0.06] hover:border-[#FF5A1F]/30'} p-4 sm:p-5 relative transition-colors flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              ADMIN SHARE
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-[#FF5A1F] px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
              {formatSplitPercent(adminSharePercent)}
            </span>
          </div>
          <div className="mt-3">
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF5A1F] tracking-tight font-sans">
                {formatINR(adminShareAmount)}
              </span>
            </div>
           
          </div>
        </div>

        {/* Card 3: OFFICE EXPENSE */}
        <div className={`rounded-2xl ${isLight ? 'bg-white border border-slate-200' : 'bg-[#0e1017] border border-white/[0.06] hover:border-[#FF5A1F]/30'} p-4 sm:p-5 relative transition-colors flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              OFFICE EXPENSE
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-[#FF5A1F] px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
              {formatSplitPercent(officeExpensePercent)}
            </span>
          </div>
          <div className="mt-3">
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF5A1F] tracking-tight font-sans">
                {formatINR(officeExpenseAmount)}
              </span>
            </div>
          
          </div>
        </div>

        {/* Card 4: BROKER SHARE */}
        <div className={`rounded-2xl ${isLight ? 'bg-white border border-slate-200' : 'bg-[#0e1017] border border-white/[0.06] hover:border-[#FF5A1F]/30'} p-4 sm:p-5 relative transition-colors flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              BROKER SHARE
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-[#FF5A1F] px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
              {formatSplitPercent(brokerSharePercent)}
            </span>
          </div>
          <div className="mt-3">
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF5A1F] tracking-tight font-sans">
                {formatINR(brokerShareAmount)}
              </span>
            </div>
          
          </div>
        </div>

        {/* Card 5: RESERVE FUND */}
        <div className={`rounded-2xl ${isLight ? 'bg-white border border-slate-200' : 'bg-[#0e1017] border border-white/[0.06] hover:border-[#FF5A1F]/30'} p-4 sm:p-5 relative transition-colors flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              RESERVE FUND
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-[#FF5A1F] px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
              {formatSplitPercent(reserveFundPercent)}
            </span>
          </div>
          <div className="mt-3">
            <div>
              <span className="text-xl sm:text-2xl font-extrabold text-[#FF5A1F] tracking-tight font-sans">
                {formatINR(reserveFundAmount)}
              </span>
            </div>
          
          </div>
        </div>
      </div>

      {/* 3. RECENT PROJECTS & PENDING APPROVALS (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column (7 cols): Recent Projects Table */}
        <div className={`lg:col-span-7 p-5 sm:p-6 rounded-2xl border transition-all duration-200 space-y-4 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold tracking-tight ${headingColor}`}>
              Recent Projects
            </h2>
            <Link to="/admin/projects" className="text-xs font-semibold text-ember hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[460px]">
              <thead className="border-b border-white/10 text-white/40 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="pb-2.5 pr-3 font-semibold">PROJECT NAME</th>
                  <th className="pb-2.5 px-3 font-semibold">CLIENT</th>
                  <th className="pb-2.5 px-3 font-semibold">VALUE</th>
                  <th className="pb-2.5 pl-3 font-semibold text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentProjects.length > 0 ? (
                  recentProjects.map((prj: any) => (
                    <tr key={prj.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3.5 pr-3 font-semibold truncate max-w-[170px]">
                        <span className={headingColor}>{prj.name}</span>
                      </td>
                      <td className={`py-3.5 px-3 truncate max-w-[140px] ${subtextColor}`}>
                        {prj.client}
                      </td>
                      <td className={`py-3.5 px-3 font-semibold font-mono ${headingColor}`}>
                        {formatINR(prj.value)}
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <StatusBadge status={prj.status} type="project" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs font-mono text-white/40">
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

        {/* Right Column (5 cols): Pending Approvals */}
        <div className={`lg:col-span-5 p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
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
            <div className="grid grid-cols-2 p-1 rounded-xl mb-4 border bg-white/5 border-white/10">
              <button
                onClick={() => setPendingTab('workLogs')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  pendingTab === 'workLogs'
                    ? 'bg-[#FF5A1F] text-white shadow-[0_0_12px_rgba(255,90,31,0.3)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Work Logs ({pendingWorkLogs.length})
              </button>
              <button
                onClick={() => setPendingTab('payments')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  pendingTab === 'payments'
                    ? 'bg-[#FF5A1F] text-white shadow-[0_0_12px_rgba(255,90,31,0.3)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Payments ({recentPayments.length})
              </button>
            </div>

            {/* Pending List Items */}
            <div className="space-y-3 min-h-[140px] flex flex-col justify-center">
              {pendingTab === 'workLogs' ? (
                pendingWorkLogs.length > 0 ? (
                  pendingWorkLogs.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all bg-white/[0.02] border-white/5 hover:border-white/10"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs shrink-0 text-white">
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

                      <div className="flex items-center gap-1.5 shrink-0">
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
                  <div className="py-8 text-center text-xs font-mono text-white/40">
                    No submitted timesheets awaiting approval.
                  </div>
                )
              ) : (
                recentPayments.length > 0 ? (
                  recentPayments.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all bg-white/[0.02] border-white/5 hover:border-white/10"
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
                  <div className="py-8 text-center text-xs font-mono text-white/40">
                    No client payments recorded yet.
                  </div>
                )
              )}
            </div>
          </div>

          <div className="pt-3 border-t text-[11px] font-mono text-center border-white/10 mt-3">
            <span className={subtextColor}>
              {pendingWorkLogs.length} pending work logs &bull; {recentPayments.length} recorded payments
            </span>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: 3 CHARTS & COMMISSION SPLIT COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Column 1: Commission Split (5-Tier Project Allocation) */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className={`text-sm font-bold tracking-tight ${headingColor}`}>
                  Commission Split
                </h2>
                <p className="text-[10px] font-mono text-zinc-400">5-Tier Project Allocation</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30">
                {totalCommPercent > 0 ? (Math.abs(totalCommPercent - 100) < 0.05 ? '100%' : formatSplitPercent(totalCommPercent)) : '100%'} Split
              </span>
            </div>

            {/* 5-Tier Allocation Donut */}
            <div className="min-h-44 w-full relative flex flex-col sm:flex-row items-center justify-between mt-3 gap-4">
              <div className="w-full sm:w-1/2 h-44 relative flex items-center justify-center shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={commissionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={62}
                      paddingAngle={hasCommissionData ? 2 : 0}
                      cornerRadius={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {commissionData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1017',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                      }}
                      formatter={(v: any) => [formatSplitPercent(v), 'Split']}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className={`text-base font-bold font-mono tracking-tight ${headingColor}`}>
                    {totalCommPercent > 0 ? (Math.abs(totalCommPercent - 100) < 0.05 ? '100%' : formatSplitPercent(totalCommPercent)) : '0%'}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-medium">
                    Split
                  </div>
                </div>
              </div>

              {/* Simple Minimalist Legend */}
              <div className="w-full sm:w-1/2 space-y-2.5 pl-0 sm:pl-3">
                {commissionData.map((item: any) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs py-0.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={`text-xs font-medium truncate ${subtextColor}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs text-white shrink-0 ml-2">
                      {formatSplitPercent(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 mt-2">
            <Link
              to="/admin/commissions"
              className="group flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-white/[0.02] hover:bg-ember/10 border border-white/10 hover:border-ember/30 text-xs font-semibold text-white/80 hover:text-ember transition-all"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-ember" />
                <span>Configure 5-Tier Allocation</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-ember group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Column 2: Bookings vs Cash Collection */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-sm font-bold tracking-tight ${headingColor}`}>
              Bookings vs Cash Collection
            </h2>
            <div className="flex items-center gap-2.5 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-ember">
                <span className="w-2 h-2 rounded-full bg-ember" /> Bookings
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash Collected
              </span>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={formatLakhs}
                  domain={[0, Math.ceil(maxBarRevenue * 1.2)]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: '#ffffff20',
                    borderRadius: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(val: any, name: any) => [
                    formatINR(val),
                    name === 'bookings' ? 'New Bookings' : 'Cash Collected',
                  ]}
                />
                <Bar dataKey="bookings" fill="#FF5A1F" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="collections" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column 3: Receivable Reconciliation */}
        <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-sm font-bold tracking-tight ${headingColor}`}>
              Receivable Reconciliation
            </h2>
            <div className="flex items-center gap-2.5 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-400" /> Opening
              </span>
              <span className="flex items-center gap-1 text-ember">
                <span className="w-2 h-2 rounded-full bg-ember" /> Closing
              </span>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClosingRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A1F" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF5A1F" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorOpeningRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A1A1AA" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#A1A1AA" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={formatLakhs}
                  domain={[0, Math.ceil(maxBarRevenue * 1.2)]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: '#ffffff20',
                    borderRadius: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(val: any, name: any) => [
                    formatINR(val),
                    name === 'closingReceivable' ? 'Closing Receivable' : 'Opening Receivable',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="openingReceivable"
                  stroke="#A1A1AA"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOpeningRec)"
                  name="openingReceivable"
                  activeDot={{ r: 4, stroke: '#A1A1AA', strokeWidth: 2, fill: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="closingReceivable"
                  stroke="#FF5A1F"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorClosingRec)"
                  name="closingReceivable"
                  activeDot={{ r: 5, stroke: '#FF5A1F', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
