import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  /** Descriptive subtext below the value */
  subtext?: string;
  /** Change/trend label (e.g. "+12% vs last month") */
  change?: string;
  /** Trend direction for coloring the change indicator */
  changeType?: 'positive' | 'negative' | 'warning' | 'neutral';
  icon: LucideIcon;
  variant?: 'default' | 'ember' | 'emerald' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  change,
  changeType,
  icon: Icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: {
      border: 'border-white/10 hover:border-white/20',
      iconBg: 'bg-white/5 text-white/70',
      valueColor: 'text-white',
    },
    ember: {
      border: 'border-ember/30 hover:border-ember/60 shadow-[0_0_20px_rgba(255,90,31,0.08)]',
      iconBg: 'bg-ember/15 text-ember border border-ember/30',
      valueColor: 'text-white',
    },
    emerald: {
      border: 'border-white/10 hover:border-white/20',
      iconBg: 'bg-white/5 text-white/70',
      valueColor: 'text-white',
    },
    amber: {
      border: 'border-white/10 hover:border-white/20',
      iconBg: 'bg-white/5 text-white/70',
      valueColor: 'text-white',
    },
  };

  const changeStyles = {
    positive: { color: 'text-zinc-400', dot: 'bg-ember' },
    negative: { color: 'text-red-400', dot: 'bg-red-400' },
    warning: { color: 'text-zinc-400', dot: 'bg-ember/60' },
    neutral: { color: 'text-white/40', dot: 'bg-white/30' },
  };

  const style = variantStyles[variant];
  const changeCfg = changeType ? changeStyles[changeType] : null;

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-[#0c0e16] to-[#080a10] border p-5 transition-all duration-300 hover:translate-y-[-2px] ${style.border} group overflow-hidden`}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent ${
        variant === 'ember' ? 'via-ember/40' : variant === 'emerald' ? 'via-emerald-500/40' : variant === 'amber' ? 'via-amber-500/40' : 'via-white/10'
      } to-transparent`} />

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/40 truncate font-semibold">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${style.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className={`text-xl md:text-2xl font-extrabold tracking-tight tabular-nums ${style.valueColor}`}>
        {value}
      </div>

      {/* Change indicator with trend arrow */}
      {change && changeCfg && (
        <div className={`flex items-center gap-1.5 mt-2.5 ${changeCfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${changeCfg.dot}`} />
          <span className="text-[10px] font-mono truncate">{change}</span>
        </div>
      )}

      {/* Fallback subtext */}
      {!change && subtext && (
        <p className="text-[10px] font-mono text-white/35 mt-1.5 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
