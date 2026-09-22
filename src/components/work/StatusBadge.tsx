import React from 'react';

type BadgeType =
  | 'project'
  | 'workLog'
  | 'attendance'
  | 'settlement'
  | 'payment'
  | 'priority'
  | 'role'
  | 'generic';

interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');

  const getBadgeStyle = (): { bg: string; text: string; dot: string; border: string; label: string } => {
    switch (normalized) {
      // ── NEW 4 PROJECT STATUSES (All strictly Orange) ───────────────
      case 'start_process':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/25', label: 'Start Process' };
      case 'in_process':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/25', label: 'In Process' };
      case 'in_changes':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/25', label: 'In Changes' };
      case 'delivered':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/25', label: 'Delivered' };

      // ── OTHER STATUS TYPES (non-project) ────────────────────────────
      case 'active':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/25', label: 'Active' };
      case 'in_progress':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/25', label: 'In Process' };
      case 'urgent':
      case 'high':
        return { bg: 'bg-[#FF5A1F]/15', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/30', label: normalized === 'urgent' ? 'Urgent' : 'High' };
      case 'admin':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/20', label: 'Admin' };
      case 'changes_requested':
        return { bg: 'bg-[#FF5A1F]/10', text: 'text-[#FF5A1F]', dot: 'bg-[#FF5A1F]', border: 'border-[#FF5A1F]/25', label: 'Changes Requested' };

      case 'completed':
      case 'approved':
      case 'paid':
      case 'present':
        return {
          bg: 'bg-white/10',
          text: 'text-white',
          dot: 'bg-[#FF5A1F]',
          border: 'border-white/15',
          label: normalized === 'paid' ? 'Paid' : normalized === 'approved' ? 'Approved' : normalized === 'present' ? 'Present' : 'Completed',
        };

      case 'review':
        return { bg: 'bg-white/5', text: 'text-zinc-200', dot: 'bg-white/60', border: 'border-white/10', label: 'In Review' };
      case 'confirmed':
      case 'signed':
        return { bg: 'bg-white/5', text: 'text-zinc-200', dot: 'bg-white/60', border: 'border-white/10', label: 'Signed' };
      case 'pending':
      case 'draft':
        return { bg: 'bg-white/5', text: 'text-zinc-300', dot: 'bg-zinc-400', border: 'border-white/10', label: normalized === 'draft' ? 'Draft' : 'Pending' };
      case 'calculated':
        return { bg: 'bg-white/5', text: 'text-zinc-300', dot: 'bg-zinc-400', border: 'border-white/10', label: 'Calculated' };
      case 'half_day':
        return { bg: 'bg-white/5', text: 'text-zinc-300', dot: 'bg-zinc-400', border: 'border-white/10', label: 'Half Day' };
      case 'holiday':
        return { bg: 'bg-white/5', text: 'text-zinc-300', dot: 'bg-zinc-400', border: 'border-white/10', label: 'Holiday' };

      case 'cancelled':
      case 'rejected':
      case 'failed':
      case 'absent':
        return {
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          dot: 'bg-red-400',
          border: 'border-red-500/20',
          label: normalized === 'absent' ? 'Absent' : normalized === 'rejected' ? 'Rejected' : normalized === 'cancelled' ? 'Cancelled' : 'Failed',
        };

      case 'employee':
        return { bg: 'bg-white/5', text: 'text-zinc-300', dot: 'bg-white/40', border: 'border-white/10', label: 'Team Member' };
      case 'medium':
        return { bg: 'bg-white/5', text: 'text-zinc-300', dot: 'bg-zinc-400', border: 'border-white/10', label: 'Medium' };
      case 'low':
      case 'lead':
        return { bg: 'bg-white/[0.03]', text: 'text-zinc-400', dot: 'bg-zinc-500', border: 'border-white/5', label: normalized === 'lead' ? 'Lead' : 'Low' };

      default: {
        const readable = status ? status.replace(/_/g, ' ') : 'Unknown';
        return {
          bg: 'bg-white/[0.03]',
          text: 'text-zinc-400',
          dot: 'bg-zinc-500',
          border: 'border-white/5',
          label: readable.charAt(0).toUpperCase() + readable.slice(1),
        };
      }
    }
  };

  const style = getBadgeStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
      <span>{style.label}</span>
    </span>
  );
};
