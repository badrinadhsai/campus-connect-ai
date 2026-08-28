import React from 'react';
import { ComplaintStatus, ComplaintPriority } from '../../types';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, XCircle, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold'
  }[size];

  switch (status) {
    case 'Submitted':
      return (
        <span className={`inline-flex items-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Submitted
        </span>
      );
    case 'Verified':
      return (
        <span className={`inline-flex items-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          Verified
        </span>
      );
    case 'Under Review':
      return (
        <span className={`inline-flex items-center rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 ${sizeClasses}`}>
          <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
          Under Review
        </span>
      );
    case 'Assigned':
      return (
        <span className={`inline-flex items-center rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${sizeClasses}`}>
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
          Assigned
        </span>
      );
    case 'In Progress':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}>
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          In Progress
        </span>
      );
    case 'Resolved':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Resolved
        </span>
      );
    case 'Rejected':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Rejected
        </span>
      );
    case 'Closed':
      return (
        <span className={`inline-flex items-center rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
          Closed
        </span>
      );
    default:
      return null;
  }
};

interface PriorityBadgeProps {
  priority: ComplaintPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (priority) {
    case 'Critical':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse ${sizeClasses}`}>
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          CRITICAL
        </span>
      );
    case 'High':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 ${sizeClasses}`}>
          <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
          HIGH
        </span>
      );
    case 'Medium':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses}`}>
          MEDIUM
        </span>
      );
    case 'Low':
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 ${sizeClasses}`}>
          LOW
        </span>
      );
    default:
      return null;
  }
};
