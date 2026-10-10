import React from 'react';

interface NeuBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'inset';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const NeuBadge: React.FC<NeuBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-0.5 text-xs';

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-50/90 dark:bg-blue-950/70 text-[#1E3A8A] dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/80 shadow-2xs';
      case 'success':
        return 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/80 shadow-2xs';
      case 'warning':
        return 'bg-amber-50/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/80 shadow-2xs';
      case 'danger':
        return 'bg-rose-50/90 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/90 dark:border-rose-800/80 shadow-2xs';
      case 'info':
        return 'bg-orange-50/90 dark:bg-orange-950/70 text-[#F97316] dark:text-orange-300 border border-orange-200/90 dark:border-orange-800/80 shadow-2xs';
      case 'inset':
        return 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono';
      case 'neutral':
      default:
        return 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700/90';
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case 'primary': return 'bg-[#1E3A8A] dark:bg-blue-400';
      case 'success': return 'bg-emerald-500 dark:bg-emerald-400';
      case 'warning': return 'bg-amber-500 dark:bg-amber-400';
      case 'danger': return 'bg-rose-500 dark:bg-rose-400';
      case 'info': return 'bg-[#F97316] dark:bg-orange-400';
      default: return 'bg-slate-400 dark:bg-slate-500';
    }
  };

  const shouldShowDot = dot ?? (variant === 'success' || variant === 'warning' || variant === 'danger');

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md tracking-tight ${sizeClasses} ${getVariantClasses()} ${className}`}
    >
      {shouldShowDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotColor()}`} />
      )}
      <span>{children}</span>
    </span>
  );
};
