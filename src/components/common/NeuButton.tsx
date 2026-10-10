import React from 'react';

interface NeuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'inset' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  active?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const NeuButton: React.FC<NeuButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  active = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-base font-bold rounded-xl gap-2.5',
    icon: 'p-2 rounded-xl flex items-center justify-center',
  }[size];

  const getVariantClasses = () => {
    if (active) {
      return 'bg-orange-50 dark:bg-orange-950/60 text-[#F97316] dark:text-orange-400 border border-orange-200 dark:border-orange-800 font-bold';
    }

    switch (variant) {
      case 'primary':
        return 'bg-[#F97316] hover:bg-[#ea580c] active:bg-[#c2410c] text-white font-bold shadow-sm hover:shadow transition-all';
      case 'accent':
        return 'bg-[#1E3A8A] hover:bg-[#172554] active:bg-[#0f172a] text-white font-bold shadow-sm transition-all';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold shadow-sm transition-all';
      case 'success':
        return 'bg-[#22C55E] hover:bg-[#16a34a] active:bg-[#15803d] text-white font-bold shadow-sm transition-all';
      case 'icon':
      case 'secondary':
      case 'inset':
      default:
        return 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition-all';
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ${sizeClasses} ${getVariantClasses()} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
