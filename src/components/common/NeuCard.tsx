import React from 'react';

interface NeuCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'raised' | 'raised-sm' | 'raised-lg' | 'inset' | 'flat';
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const NeuCard: React.FC<NeuCardProps> = ({
  children,
  className = '',
  onClick,
  interactive = false,
  ...props
}) => {
  const baseClasses = 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm';
  const interactiveClasses = interactive
    ? 'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200'
    : 'transition-colors duration-200';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
