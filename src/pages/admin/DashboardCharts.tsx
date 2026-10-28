import React from 'react';
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
import { formatINR } from '../../utils/formatters';

// recharts is only needed once 'Show All Data' is on, so the admin dashboard loads these lazily.

interface CommissionDonutProps {
  commissionData: Array<{ name: string; value: number; color: string }>;
  hasCommissionData: boolean;
  formatSplitPercent: (value: number | string | undefined) => string;
}

export const CommissionDonut: React.FC<CommissionDonutProps> = ({ commissionData, hasCommissionData, formatSplitPercent }) => (
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
        {commissionData.map((entry, index) => (
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
        formatter={(v) => [formatSplitPercent(v as number), 'Split']}
      />
    </PieChart>
  </ResponsiveContainer>
);

interface TrendChartProps {
  chartData: Array<Record<string, string | number>>;
  maxBarRevenue: number;
  formatLakhs: (value: number) => string;
}

export const BookingsChart: React.FC<TrendChartProps> = ({ chartData, maxBarRevenue, formatLakhs }) => (
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
        formatter={(val, name) => [
          formatINR(val as number),
          name === 'bookings' ? 'New Bookings' : 'Cash Collected',
        ]}
      />
      <Bar dataKey="bookings" fill="#FF5A1F" radius={[4, 4, 0, 0]} maxBarSize={22} />
      <Bar dataKey="collections" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={22} />
    </BarChart>
  </ResponsiveContainer>
);

export const ReceivableChart: React.FC<TrendChartProps> = ({ chartData, maxBarRevenue, formatLakhs }) => (
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
        formatter={(val, name) => [
          formatINR(val as number),
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
);
