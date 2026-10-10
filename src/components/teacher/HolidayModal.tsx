import React, { useState } from 'react';
import { Holiday } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuInput, NeuSelect, NeuTextarea } from '../common/NeuInput';
import { Trash2, Calendar, Sparkles } from 'lucide-react';

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: Holiday[];
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onDeleteHoliday: (id: string) => void;
  initialDate?: string;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  holidays,
  onAddHoliday,
  onDeleteHoliday,
  initialDate,
}) => {
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Holiday['type']>('school');
  const [description, setDescription] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    onAddHoliday({
      date,
      title: title.trim(),
      type,
      description: description.trim() || undefined,
    });

    setTitle('');
    setDescription('');
  };

  const typeOptions = [
    { value: 'national', label: '🇵🇭 National Regular / Special Holiday' },
    { value: 'school', label: '🎉 School Foundation / University Event' },
    { value: 'suspension', label: '⚡ Class Suspension (Weather / Incident)' },
    { value: 'break', label: '🍂 Academic Term / Midterm Break' },
  ];

  // Sort holidays chronologically
  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Academic Calendar & Holidays"
      subtitle="Manage official holidays, class suspensions, and university events"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Add Holiday Form */}
        <form onSubmit={handleAdd} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>Add Calendar Holiday / Suspension</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NeuInput
              label="Event / Holiday Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <NeuSelect
              label="Holiday Classification"
              options={typeOptions}
              value={type}
              onChange={(e) => setType(e.target.value as Holiday['type'])}
              required
            />
          </div>

          <NeuInput
            label="Holiday / Suspension Title"
            placeholder="e.g., Bonifacio Day, University Week, Typhoon Suspension"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <NeuTextarea
            label="Description or Memo Reference (Optional)"
            placeholder="e.g., As per Presidential Proclamation / CHED Advisory..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="flex justify-end pt-1">
            <NeuButton type="submit" variant="primary" size="sm" disabled={!title.trim() || !date}>
              + Add to Calendar
            </NeuButton>
          </div>
        </form>

        {/* Existing Holidays List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Configured Holidays & Calendar Events ({sortedHolidays.length})</span>
            </h4>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {sortedHolidays.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No holidays or events configured yet.
              </div>
            ) : (
              sortedHolidays.map((hol) => (
                <div
                  key={hol.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {hol.date}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          hol.type === 'national'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : hol.type === 'suspension'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : hol.type === 'break'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        {hol.type}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {hol.title}
                    </div>
                    {hol.description && (
                      <div className="text-[11px] text-slate-500 truncate">{hol.description}</div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteHoliday(hol.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                    title="Delete holiday"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <NeuButton variant="secondary" onClick={onClose}>
            Done
          </NeuButton>
        </div>
      </div>
    </NeuModal>
  );
};
