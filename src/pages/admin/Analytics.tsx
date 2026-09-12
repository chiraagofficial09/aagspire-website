import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Layers,
  Calendar,
  Filter,
  RotateCcw,
  ChevronDown,
  X,
  Sparkles,
  ShieldCheck,
  Building,
  Users,
  Wallet,
  ArrowUpRight,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Check,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import { MonthSelectDropdown, MonthOption } from '../../components/work/MonthSelectDropdown';

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic current month key & initial state (current month first)
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    [now]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedRange, setSelectedRange] = useState<number>(6);

  // Generate fallback last 12 rolling months in case backend data is loading
  const fallbackMonths = useMemo(() => {
    const list: MonthOption[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      list.push({ key, label });
    }
    return list;
  }, [now]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedRange) params.append('months', String(selectedRange));
      if (selectedMonth) params.append('month', selectedMonth);
      const res = await api.get(`/admin/analytics/overview?${params.toString()}`);
      setData(res.data.data);
    } catch (err) {
      console.error('Error fetching analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth, selectedRange]);

  const availableMonths: MonthOption[] = useMemo(() => {
    const map = new Map<string, string>();
    // First, seed with all 12 rolling months so user always has every month available
    fallbackMonths.forEach((m) => map.set(m.key, m.label));
    // Merge any extra months from backend data
    if (data?.availableMonths && Array.isArray(data.availableMonths)) {
      data.availableMonths.forEach((m: any) => {
        if (m && m.key) map.set(m.key, m.label);
      });
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [data?.availableMonths, fallbackMonths]);

  const currentMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'All Time';
    const found = availableMonths.find((m) => m.key === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, availableMonths]);

  const rawMonthlyData = data?.monthlyTrend || data?.monthlyTrends || [];
  const monthlyData = rawMonthlyData.length > 0
    ? rawMonthlyData
    : ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((m) => ({ month: m, revenue: 0, collected: 0, profit: 0 }));

  const kpis = data?.kpis || {};
  const totalVal = Number(kpis.totalProjectValue || 0);
  const totalReceived = Number(kpis.totalReceived || 0);
  const outstandingAmount = Number(kpis.outstandingAmount !== undefined ? kpis.outstandingAmount : Math.max(0, totalVal - totalReceived));
  const totalStaffAlloc = Number(kpis.totalEmployeeAllocation || 0);
  const totalOfficeAlloc = Number(kpis.totalOfficeAllocation || 0);
  const totalAdminShare = Number(kpis.totalAdminShare || 0);
  const totalReserve = Number(kpis.totalSettlementReserve || 0);
  const projectsCount = Number(kpis.totalProjectsCount || 0);

  const totalRevenue = totalVal;
  const totalDeals = projectsCount;

  const grossMargin = totalVal > 0 ? (((totalVal - totalStaffAlloc) / totalVal) * 100).toFixed(1) + '%' : '0.0%';
  const adminMargin = totalVal > 0 ? ((totalAdminShare / totalVal) * 100).toFixed(1) + '%' : '0.0%';
  const collectionRate = totalVal > 0 ? ((totalReceived / totalVal) * 100).toFixed(1) + '%' : '0.0%';

  const distributionData = (data?.distribution && data.distribution.some((d: any) => d.value > 0))
    ? data.distribution
    : [
        { name: 'Broker Fee', value: 0, amount: 0, color: '#A1A1AA' },
        { name: 'Employee Pool', value: 0, amount: 0, color: '#FF5A1F' },
        { name: 'Office Expense', value: 0, amount: 0, color: '#D4D4D8' },
        { name: 'Admin Share', value: 0, amount: 0, color: '#FFFFFF' },
        { name: 'Reserve Fund', value: 0, amount: 0, color: '#71717A' },
      ];

  const totalCommPool = totalStaffAlloc + totalOfficeAlloc + totalAdminShare + totalReserve;

  const handleResetFilter = () => {
    setSelectedMonth(currentMonthKey);
    setSelectedRange(6);
  };

  const isFiltered = selectedMonth !== currentMonthKey || selectedRange !== 6;

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-[#FF5A1F] animate-spin" />
        <span className="text-xs font-mono text-zinc-400">Loading analytics metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar with Month and Timeframe Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Analytics</h1>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#FF5A1F]/30">
              Live Metrics
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Production revenue, cash collection, commission splits, and margins.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <MonthSelectDropdown
            value={selectedMonth}
            onChange={setSelectedMonth}
            availableMonths={availableMonths}
            allMonthsLabel="All Months"
          />

          {/* Timeframe Range Selector (Pills) */}
          <div className="flex items-center bg-[#08090d] p-0.5 rounded-xl border border-white/[0.08]">
            {[
              { label: '3M', value: 3 },
              { label: '6M', value: 6 },
              { label: '12M', value: 12 },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value)}
                className={`px-3 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                  selectedRange === range.value
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Reset Filters CTA if modified */}
          {isFiltered && (
            <button
              onClick={handleResetFilter}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] transition-colors"
              title="Reset Filters to Current Month"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Notification Pill - only show when user chooses a specific non-current month */}
      {selectedMonth !== currentMonthKey && selectedMonth !== 'all' && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
            <span className="text-zinc-300">
              Showing metrics filtered for <strong className="text-white font-semibold">{currentMonthLabel}</strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedMonth(currentMonthKey)}
            className="flex items-center gap-1 text-zinc-400 hover:text-white text-[11px] transition ml-2"
          >
            <span>Back to Current Month</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedMonth === 'all' && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>
              Showing cumulative <strong className="text-white font-semibold">All Time</strong> analytics
            </span>
          </div>
          <button
            onClick={() => setSelectedMonth(currentMonthKey)}
            className="text-xs text-[#FF5A1F] hover:underline font-medium ml-2"
          >
            Switch to Current Month
          </button>
        </div>
      )}

      {/* 2. Primary KPI Highlights (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Contracted Revenue */}
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Contracted Deals</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-3">
            {formatINR(totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-1.5">
            <span>{totalDeals} production deliverables</span>
            <span className="text-[11px] font-mono text-zinc-400">{currentMonthLabel}</span>
          </div>
        </div>

        {/* Card 2: Cash Collections */}
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Client Collections</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-3">
            {formatINR(totalReceived)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-1.5">
            <span>{collectionRate} collected</span>
            <span className="text-[11px] font-mono text-zinc-400">Realized cash</span>
          </div>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Outstanding Dues</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-3">
            {formatINR(outstandingAmount)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-1.5">
            <span>Uncollected balance</span>
            <span className="text-[11px] font-mono text-zinc-400">Invoiced</span>
          </div>
        </div>

        {/* Card 4: Admin Profit Share */}
        <div className="bg-[#08090d] border border-white/[0.06] p-5 rounded-2xl relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Admin Net Profit</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-3">
            {formatINR(totalAdminShare)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-1.5">
            <span>{adminMargin} net margin</span>
            <span className="text-[11px] font-mono text-zinc-400">Retained</span>
          </div>
        </div>
      </div>

      {/* 3. Secondary Performance & Margin Ratios (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Margin */}
        <div className="bg-[#08090d] border border-white/[0.06] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Gross Margin</span>
            <div className="text-lg font-bold text-white font-mono mt-1">{grossMargin}</div>
            <span className="text-[11px] text-zinc-500">After team payout</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-zinc-400 block">Team Pool</span>
            <span className="text-xs font-mono font-semibold text-zinc-300">{formatINR(totalStaffAlloc)}</span>
          </div>
        </div>

        {/* Office & Operations */}
        <div className="bg-[#08090d] border border-white/[0.06] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Office Expense</span>
            <div className="text-lg font-bold text-zinc-300 font-mono mt-1">{formatINR(totalOfficeAlloc)}</div>
            <span className="text-[11px] text-zinc-500">Infrastructure & software</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <Building className="w-4 h-4" />
          </div>
        </div>

        {/* Reserve Contingency Fund */}
        <div className="bg-[#08090d] border border-white/[0.06] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Reserve Buffer</span>
            <div className="text-lg font-bold text-zinc-300 font-mono mt-1">{formatINR(totalReserve)}</div>
            <span className="text-[11px] text-zinc-500">Contingency liquidity</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Team Allocation Share */}
        <div className="bg-[#08090d] border border-white/[0.06] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Staff Allocation</span>
            <div className="text-lg font-bold text-[#FF5A1F] font-mono mt-1">{formatINR(totalStaffAlloc)}</div>
            <span className="text-[11px] text-zinc-500">Talent commission pool</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F]">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 4. Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Growth Trajectory</span>
                <span className="text-[10px] font-mono font-normal text-zinc-400">({selectedRange} Months)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Contract valuation vs actual client collections inflow</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F]" />
                Contracted
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                Collected
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorContracted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A1F" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF5A1F" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="rgba(255,255,255,0.2)"
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  dy={5}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c0d12',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: any, name: any) => [
                    formatINR(value),
                    name === 'revenue' ? 'Contracted' : name === 'collected' || name === 'collections' ? 'Collected' : name,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Contracted"
                  stroke="#FF5A1F"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorContracted)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5-Tier Donut Breakdown */}
        <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight">Commission Split</h2>
              <span className="text-[11px] font-mono text-zinc-400">
                {selectedMonth !== 'all' ? currentMonthLabel : 'Total Pool'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">5-Tier capital allocation breakdown</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalCommPool > 0 ? distributionData : [{ name: 'No Commission Data', value: 100, color: 'rgba(255,255,255,0.06)' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={80}
                  paddingAngle={totalCommPool > 0 ? 4 : 0}
                  dataKey="value"
                >
                  {(totalCommPool > 0 ? distributionData : [{ color: 'rgba(255,255,255,0.06)' }]).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#08090d" strokeWidth={2} />
                  ))}
                </Pie>
                {totalCommPool > 0 && (
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c0d12',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value}% (${formatINR(item?.payload?.amount || 0)})`,
                      name,
                    ]}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-mono text-zinc-500">
                {totalCommPool > 0 ? 'Allocated' : 'Total Pool'}
              </span>
              <span className="text-xs font-mono font-bold text-white mt-0.5">
                {formatINR(totalCommPool)}
              </span>
            </div>
          </div>

          {/* Legend with Percentage and Rupee Amounts */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
            {distributionData.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <div className="flex items-center gap-2">
                  {item.amount > 0 && (
                    <span className="font-mono text-zinc-400 text-[11px]">
                      {formatINR(item.amount)}
                    </span>
                  )}
                  <span className="font-mono text-white font-medium">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Pipeline Distribution & Real Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Pipeline Lifecycle Card */}
        <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Project Pipeline</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Distribution across project lifecycle</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
              {totalDeals} Deliverables
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { key: 'confirmed', label: 'Confirmed', count: data?.statusDistribution?.confirmed || 0, color: 'bg-blue-500', barColor: '#3B82F6' },
              { key: 'in_progress', label: 'In Progress', count: data?.statusDistribution?.in_progress || 0, color: 'bg-[#FF5A1F]', barColor: '#FF5A1F' },
              { key: 'review', label: 'In Review', count: data?.statusDistribution?.review || 0, color: 'bg-amber-500', barColor: '#F59E0B' },
              { key: 'completed', label: 'Completed', count: data?.statusDistribution?.completed || 0, color: 'bg-emerald-500', barColor: '#10B981' },
              { key: 'delivered', label: 'Delivered', count: data?.statusDistribution?.delivered || 0, color: 'bg-purple-500', barColor: '#A855F7' },
            ].map((stage) => {
              const pct = totalDeals > 0 ? Math.round((stage.count / totalDeals) * 100) : 0;
              return (
                <div key={stage.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-300 font-medium">
                      <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                      {stage.label}
                    </span>
                    <span className="font-mono text-zinc-400 text-[11px]">
                      {stage.count} <span className="text-zinc-600">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: stage.barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Client Receipts */}
        <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Recent Inflows</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Latest realized client payment collections</p>
            </div>
            <TrendingUp className="w-4 h-4 text-white/50" />
          </div>

          <div className="space-y-2.5 pt-1">
            {(data?.recentPayments && data.recentPayments.length > 0) ? (
              data.recentPayments.slice(0, 4).map((pm: any) => (
                <div
                  key={pm._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-white truncate">
                      {pm.clientId?.companyName || pm.clientId?.name || 'Direct Client'}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {pm.projectId?.projectName || pm.notes || pm.paymentMethod?.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-white">
                      {formatINR(pm.amount)}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {pm.paymentDate ? new Date(pm.paymentDate).toLocaleDateString('en-IN') : 'Recent'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400">
                No recent payments recorded
              </div>
            )}
          </div>
        </div>

        {/* Recent Contract Deliverables */}
        <div className="bg-[#08090d] border border-white/[0.06] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Active Deliverables</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Recently registered production contracts</p>
            </div>
            <BarChart3 className="w-4 h-4 text-white/50" />
          </div>

          <div className="space-y-2.5 pt-1">
            {(data?.recentProjects && data.recentProjects.length > 0) ? (
              data.recentProjects.slice(0, 4).map((proj: any) => (
                <div
                  key={proj._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-white truncate">
                      {proj.projectName || 'Untitled Project'}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {proj.clientId?.companyName || proj.clientId?.name || proj.projectCode}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-white">
                      {formatINR(proj.projectValue)}
                    </div>
                    <span className="inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10 mt-0.5">
                      {proj.status ? proj.status.replace('_', ' ') : 'Active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400">
                No deliverables recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
