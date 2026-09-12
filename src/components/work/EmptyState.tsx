import React from 'react';
import {
  Briefcase,
  Users,
  FileCheck2,
  CreditCard,
  ReceiptText,
  Clock,
  Coins,
  BarChart3,
  Building2,
  LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  /** Context key to auto-select icon and messaging */
  type?:
    | 'projects'
    | 'employees'
    | 'clients'
    | 'workLogs'
    | 'attendance'
    | 'payments'
    | 'commissions'
    | 'settlements'
    | 'receipts'
    | 'analytics'
    | 'earnings'
    | 'generic';
  /** Override default title */
  title?: string;
  /** Override default description */
  description?: string;
  /** Optional CTA */
  actionLabel?: string;
  onAction?: () => void;
  /** Custom icon override */
  icon?: LucideIcon;
}

const typeConfig: Record<
  string,
  { icon: LucideIcon; title: string; description: string }
> = {
  projects: {
    icon: Briefcase,
    title: 'No projects yet',
    description: 'Create your first project to start tracking deliverables, timelines, and commissions.',
  },
  employees: {
    icon: Users,
    title: 'No team members',
    description: 'Add your first employee to begin managing staff, payroll, and commission allocations.',
  },
  clients: {
    icon: Building2,
    title: 'No clients registered',
    description: 'Register your first client to start managing projects and tracking payments.',
  },
  workLogs: {
    icon: FileCheck2,
    title: 'No timesheets submitted',
    description: 'Work logs will appear here once team members start logging their production hours.',
  },
  attendance: {
    icon: Clock,
    title: 'No attendance records',
    description: 'Attendance entries will populate as staff members clock in and out daily.',
  },
  payments: {
    icon: CreditCard,
    title: 'No payments recorded',
    description: 'Client milestone payments will be displayed here once they are collected and verified.',
  },
  commissions: {
    icon: Coins,
    title: 'No commission presets',
    description: 'Create reusable 5-tier commission templates to quickly configure new projects.',
  },
  settlements: {
    icon: Coins,
    title: 'No settlements generated',
    description: 'Generate your first employee settlement to process earned commission payouts.',
  },
  receipts: {
    icon: ReceiptText,
    title: 'No receipts issued',
    description: 'Official payment vouchers are generated automatically when settlements are disbursed.',
  },
  analytics: {
    icon: BarChart3,
    title: 'Insufficient data',
    description: 'Analytics dashboards require active projects and payments to generate meaningful insights.',
  },
  earnings: {
    icon: Coins,
    title: 'No earnings recorded',
    description: 'Your commission earnings will appear here once you are assigned to active projects.',
  },
  generic: {
    icon: Briefcase,
    title: 'Nothing here yet',
    description: 'Data will appear here once relevant records are created.',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  const config = typeConfig[type] || typeConfig.generic;
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDesc = description || config.description;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in">
      {/* Ghost Icon Container */}
      <div className="relative mb-8 animate-subtle-float">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-ember/5 blur-2xl scale-[2]" />
        {/* Icon circle */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.015] border border-white/[0.08] flex items-center justify-center shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]">
          <Icon className="w-8 h-8 text-white/20" strokeWidth={1.5} />
          {/* Decorative dot */}
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-ember/30 border border-ember/50 animate-live-pulse" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-base font-bold text-white/75 tracking-tight mb-2">
        {displayTitle}
      </h3>
      <p className="text-[11px] text-white/35 font-mono text-center max-w-sm leading-relaxed">
        {displayDesc}
      </p>

      {/* Optional CTA */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-8 btn-premium btn-primary text-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
