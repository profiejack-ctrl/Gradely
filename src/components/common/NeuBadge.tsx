import React from 'react';

interface NeuBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'inset';
  size?: 'sm' | 'md';
  className?: string;
}

export const NeuBadge: React.FC<NeuBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-50 dark:bg-blue-950/60 text-[#1E3A8A] dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-[#15803d] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'danger':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      case 'info':
        return 'bg-orange-50 dark:bg-orange-950/60 text-[#F97316] dark:text-orange-300 border border-orange-200 dark:border-orange-800';
      case 'inset':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono';
      case 'neutral':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded-md tracking-tight ${sizeClasses} ${getVariantClasses()} ${className}`}
    >
      {children}
    </span>
  );
};
