import React from 'react';

interface NeuProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NeuProgressBar: React.FC<NeuProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
  color,
  className = '',
  size = 'md',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  }[size];

  const getColorClass = () => {
    if (color) return color;
    if (percentage >= 90) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-indigo-600';
    if (percentage >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`${heightClasses} rounded-full transition-all duration-500 ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface NeuCircularGaugeProps {
  value: number;
  label?: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const NeuCircularGauge: React.FC<NeuCircularGaugeProps> = ({
  value,
  label,
  sublabel,
  size = 130,
  strokeWidth = 10,
  color,
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getStrokeColor = () => {
    if (color) return color;
    if (percentage >= 90) return '#10b981'; // Emerald
    if (percentage >= 75) return '#3b82f6'; // High-Tech Blue
    if (percentage >= 60) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 drop-shadow-xs"
        >
          {/* Track background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-100 dark:text-slate-800/80"
          />
          {/* Active progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {Math.round(value * 10) / 10}%
          </span>
          {label && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              {label}
            </span>
          )}
        </div>
      </div>
      {sublabel && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 text-center">
          {sublabel}
        </span>
      )}
    </div>
  );
};
