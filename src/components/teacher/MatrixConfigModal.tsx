import React, { useState, useEffect } from 'react';
import { Subject, MatrixCategory, MatrixSubCategory } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { useData } from '../../context/DataContext';
import { validateMatrixTotal, validateSubCategoriesTotal, isProjectCategory } from '../../utils/gradeCalculator';
import {
  Plus,
  Trash2,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MatrixConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSave: (subjectId: string, matrix: MatrixCategory[], passingGrade: number, useTransmutation?: boolean) => void;
}

export const MatrixConfigModal: React.FC<MatrixConfigModalProps> = ({
  isOpen,
  onClose,
  subject,
  onSave,
}) => {
  const { matrixTemplates, saveMatrixTemplate, applyTemplateGlobally } = useData();

  const [categories, setCategories] = useState<MatrixCategory[]>([]);
  const [passingGrade, setPassingGrade] = useState<number>(75);
  const [useTransmutation, setUseTransmutation] = useState<boolean>(true);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // New category inputs
  const [newCatName, setNewCatName] = useState('');
  const [newCatWeight, setNewCatWeight] = useState<number>(10);

  // New subcategory inputs
  const [newSubName, setNewSubName] = useState('');
  const [newSubWeight, setNewSubWeight] = useState<number>(20);

  useEffect(() => {
    if (subject) {
      setCategories(JSON.parse(JSON.stringify(subject.matrix || [])));
      setPassingGrade(subject.passingGrade || 75);
      setUseTransmutation(subject.useTransmutation !== false);
      const firstWithSubs = subject.matrix.find((c) => c.subCategories && c.subCategories.length > 0);
      setExpandedCatId(firstWithSubs?.id || null);
    }
  }, [subject, isOpen]);

  if (!subject) return null;

  const { isValid, total, diff } = validateMatrixTotal(categories);

  const handleWeightChange = (id: string, weight: number) => {
    const cleanWeight = Math.max(0, Math.min(100, Math.round(weight)));
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, weight: cleanWeight } : cat))
    );
  };

  const handleSubWeightChange = (catId: string, subId: string, weight: number) => {
    const clean = Math.max(0, Math.min(100, Math.round(weight)));
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId && c.subCategories) {
          return {
            ...c,
            subCategories: c.subCategories.map((s) =>
              s.id === subId ? { ...s, weight: clean } : s
            ),
          };
        }
        return c;
      })
    );
  };

  const handleNameChange = (id: string, name: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat))
    );
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      alert('A subject must have at least one grading category.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDeleteSubCategory = (catId: string, subId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId && c.subCategories) {
          return {
            ...c,
            subCategories: c.subCategories.filter((s) => s.id !== subId),
          };
        }
        return c;
      })
    );
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const isProject = isProjectCategory({ name: newCatName.trim() });
    const newCat: MatrixCategory = {
      id: `cat-${Date.now().toString(36)}`,
      name: newCatName.trim(),
      weight: Number(newCatWeight) || 10,
      color: isProject ? 'indigo' : 'blue',
      description: `Custom assessment criteria for ${newCatName.trim()}`,
      isTransmutable: !isProject,
    };

    setCategories((prev) => [...prev, newCat]);
    setNewCatName('');
    setNewCatWeight(10);
  };

  const handleAddSubCategory = (catId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const newSub: MatrixSubCategory = {
      id: `sub-${Date.now().toString(36)}`,
      name: newSubName.trim(),
      weight: Number(newSubWeight) || 20,
    };

    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          const subs = c.subCategories || [];
          return { ...c, subCategories: [...subs, newSub] };
        }
        return c;
      })
    );
    setNewSubName('');
    setNewSubWeight(20);
  };

  const handleLoadTemplate = (tmplId: string) => {
    const tmpl = matrixTemplates.find((t) => t.id === tmplId);
    if (!tmpl) return;
    setCategories(JSON.parse(JSON.stringify(tmpl.matrix)));
    setPassingGrade(tmpl.passingGrade);
    if (tmpl.useTransmutation !== undefined) {
      setUseTransmutation(tmpl.useTransmutation);
    }
    const firstWithSubs = tmpl.matrix.find((c) => c.subCategories && c.subCategories.length > 0);
    setExpandedCatId(firstWithSubs?.id || null);
  };

  const handleSaveAsGlobal = () => {
    const name = prompt('Enter a name for this Global Matrix Template:', `${subject.name} Standard Matrix`);
    if (!name) return;

    const tmpl = saveMatrixTemplate({
      name: name.trim(),
      description: `Global template created from ${subject.name} (${subject.code}).`,
      passingGrade,
      matrix: categories,
      useTransmutation,
    });

    if (window.confirm(`Template "${tmpl.name}" saved! Do you also want to apply it to ALL subjects across all sections now?`)) {
      applyTemplateGlobally(tmpl.id);
    }
  };

  const handleAutoBalance = () => {
    if (categories.length === 0) return;
    const count = categories.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 % count;

    setCategories((prev) =>
      prev.map((cat, idx) => ({
        ...cat,
        weight: baseWeight + (idx < remainder ? 1 : 0),
      }))
    );
  };

  const handleSave = () => {
    if (!isValid) {
      alert(`The sum of weights must equal 100%. Currently it is ${total}%.`);
      return;
    }

    // Validate subcategories if any
    for (const cat of categories) {
      if (cat.subCategories && cat.subCategories.length > 0) {
        const subVal = validateSubCategoriesTotal(cat.subCategories);
        if (!subVal.isValid) {
          alert(
            `Subcategories for "${cat.name}" must sum to 100% of the category. Currently they sum to ${subVal.total}%.`
          );
          return;
        }
      }
    }

    onSave(subject.id, categories, passingGrade, useTransmutation);
    onClose();
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Grading Matrix Configurator"
      subtitle={`Customize assessment components & percentage weights for ${subject.name} (${subject.code})`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Load Preset / Global Template Selector */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Load Preset Global Template:
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              onChange={(e) => e.target.value && handleLoadTemplate(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium outline-none cursor-pointer w-full sm:w-auto text-slate-900 dark:text-slate-100"
              defaultValue=""
            >
              <option value="" disabled>Choose a template...</option>
              {matrixTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <NeuButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveAsGlobal}
              leftIcon={<Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              title="Save current configuration as a reusable global template"
            >
              Save as Global
            </NeuButton>
          </div>
        </div>

        {/* Real-time Weight Total Meter */}
        <div
          className={`p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 border ${
            isValid
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40'
              : 'border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Total Matrix Allocation:</span>
                <span
                  className={`text-sm font-bold ${
                    isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {total}%
                </span>
                <span className="text-slate-500">/ 100%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {isValid
                  ? 'All criteria are balanced perfectly to 100%.'
                  : diff > 0
                  ? `Need ${diff}% more weight to reach 100%.`
                  : `Exceeded 100% by ${Math.abs(diff)}%. Please adjust.`}
              </p>
            </div>
          </div>

          <NeuButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAutoBalance}
            leftIcon={<Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            title="Evenly distribute weights to 100%"
          >
            Auto-Balance
          </NeuButton>
        </div>

        {/* Categories List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assessment Categories & Sub-Components
            </h4>
            <span className="text-xs text-slate-400">
              {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {categories.map((cat, idx) => {
              const hasSubs = cat.subCategories && cat.subCategories.length > 0;
              const isExpanded = expandedCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                      <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center text-slate-500 shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => handleNameChange(cat.id, e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-900 dark:text-slate-100 flex-1 outline-none focus:border-indigo-600"
                        placeholder="Category Name"
                      />
                      {hasSubs && (
                        <button
                          type="button"
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 shrink-0 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-md"
                        >
                          <span>{cat.subCategories?.length} Sub-items</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {(() => {
                        const isProject = isProjectCategory(cat);
                        const transmutable = cat.isTransmutable !== undefined ? cat.isTransmutable : !isProject;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !transmutable;
                              setCategories((prev) =>
                                prev.map((c) => (c.id === cat.id ? { ...c, isTransmutable: nextVal } : c))
                              );
                            }}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-md border shrink-0 transition-all ${
                              transmutable
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                            }`}
                            title="Click to toggle between Transmutable (Annex A) and Fixed Grade"
                          >
                            {transmutable ? '⚡ Transmutable' : '📌 Fix Grade Only'}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Slider + numeric weight input */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={cat.weight}
                        onChange={(e) => handleWeightChange(cat.id, Number(e.target.value))}
                        className="w-24 accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={cat.weight}
                          onChange={(e) => handleWeightChange(cat.id, Number(e.target.value))}
                          className="w-8 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 text-right outline-none"
                        />
                        <span className="text-xs text-slate-400 font-bold">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Breakdown */}
                  {(isExpanded || hasSubs) && (
                    <div className="pl-4 sm:pl-6 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-2 pt-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Sub-Components of {cat.name}</span>
                        <span className="text-indigo-600 font-semibold">
                          Sum: {cat.subCategories?.reduce((s, i) => s + i.weight, 0) || 0}%
                        </span>
                      </div>

                      {cat.subCategories?.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {sub.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={sub.weight}
                              onChange={(e) =>
                                handleSubWeightChange(cat.id, sub.id, Number(e.target.value))
                              }
                              className="w-16 accent-indigo-600 cursor-pointer"
                            />
                            <span className="font-bold text-indigo-600 w-8 text-right">
                              {sub.weight}%
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubCategory(cat.id, sub.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Subcategory row */}
                      <form
                        onSubmit={(e) => handleAddSubCategory(cat.id, e)}
                        className="flex items-center gap-2 pt-1"
                      >
                        <input
                          type="text"
                          placeholder="Add sub-item (e.g. Quizzes, Attendance)..."
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-600"
                        />
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={newSubWeight}
                            onChange={(e) => setNewSubWeight(Number(e.target.value))}
                            className="w-7 bg-transparent text-xs font-bold text-right outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                        <NeuButton type="submit" variant="secondary" size="sm" disabled={!newSubName.trim()}>
                          Add
                        </NeuButton>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add New Category Form */}
        <form
          onSubmit={handleAddCategory}
          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-2.5"
        >
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Add new criteria (e.g. Class Standing, Oral Defense)..."
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-600 w-full"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg">
              <input
                type="number"
                min="1"
                max="100"
                value={newCatWeight}
                onChange={(e) => setNewCatWeight(Number(e.target.value))}
                className="w-8 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 text-right outline-none"
              />
              <span className="text-xs text-slate-400 font-bold">%</span>
            </div>
            <NeuButton
              type="submit"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              disabled={!newCatName.trim()}
            >
              Add Criteria
            </NeuButton>
          </div>
        </form>

        {/* Passing Grade Setting */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Passing Grade Threshold</div>
            <div className="text-xs text-slate-500">Minimum weighted percentage required to pass this course</div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
            <input
              type="number"
              min="50"
              max="95"
              value={passingGrade}
              onChange={(e) => setPassingGrade(Number(e.target.value) || 75)}
              className="w-10 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 text-center outline-none"
            />
            <span className="text-xs text-slate-400 font-bold">%</span>
          </div>
        </div>

        {/* Grade Transmutation Setting */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Grade Transmutation</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                useTransmutation
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                {useTransmutation ? '⚡ BCP Annex A (Active)' : 'Raw % (Disabled)'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 max-w-lg">
              {useTransmutation
                ? 'Official Bestlink College transmutation active (BCP Annex A): Maps raw scores on academic tasks (Class Standing & Exams) to collegiate grades (50% raw = 75 passing grade). Projects are fixed grades only (non-transmutable).'
                : 'Transmutation disabled: calculates periodic and semestral grades using raw unadjusted percentages (0-100%).'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUseTransmutation(!useTransmutation)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              useTransmutation ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                useTransmutation ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <NeuButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </NeuButton>
          <NeuButton
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={!isValid}
          >
            Save Matrix to Course
          </NeuButton>
        </div>
      </div>
    </NeuModal>
  );
};
