import React from 'react';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface NeuSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function NeuSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: NeuSegmentedControlProps<T>) {
  const pyClass = size === 'sm' ? 'py-1 px-2.5 text-xs' : 'py-1.5 px-3 text-xs sm:text-sm';

  return (
    <div className={`bg-slate-100/90 dark:bg-[#090e1a] p-1 rounded-xl flex items-center gap-1 border border-slate-200/90 dark:border-slate-800 overflow-x-auto scrollbar-none touch-pan-x shadow-2xs ${className}`}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150 outline-none select-none whitespace-nowrap active:scale-[0.98] ${pyClass} ${
              isSelected
                ? 'bg-white dark:bg-[#0d1424] text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/70 dark:border-slate-750'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            {option.icon && <span className="text-current shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface NeuSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const NeuSwitch: React.FC<NeuSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <label className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>}
    </label>
  );
};
