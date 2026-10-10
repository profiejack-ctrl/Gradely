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
  const baseClasses =
    'bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03),0_1px_2px_-1px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_2px_0_rgba(0,0,0,0.3)]';
  const interactiveClasses = interactive
    ? 'cursor-pointer hover:border-[#1E3A8A]/40 dark:hover:border-blue-500/40 hover:shadow-md dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200'
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
