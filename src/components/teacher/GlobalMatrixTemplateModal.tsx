import React, { useState } from 'react';
import { useData, isDeprecatedTemplate } from '../../context/DataContext';
import { GradingMatrixTemplate, MatrixCategory, MatrixSubCategory } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { validateMatrixTotal, validateSubCategoriesTotal } from '../../utils/gradeCalculator';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GlobalMatrixTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const GlobalMatrixTemplateModal: React.FC<GlobalMatrixTemplateModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { matrixTemplates, saveMatrixTemplate, deleteMatrixTemplate, applyTemplateGlobally } = useData();

  const validTemplates = matrixTemplates.filter((t) => !isDeprecatedTemplate(t.name, t.id));

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    validTemplates[0]?.id || ''
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [categories, setCategories] = useState<MatrixCategory[]>([]);
  const [passingGrade, setPassingGrade] = useState(75);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // New category inputs
  const [newCatName, setNewCatName] = useState('');
  const [newCatWeight, setNewCatWeight] = useState(10);

  // New subcategory inputs
  const [newSubName, setNewSubName] = useState('');
  const [newSubWeight, setNewSubWeight] = useState(20);

  const activeTemplate =
    validTemplates.find((t) => t.id === selectedTemplateId) || validTemplates[0];

  const handleSelectTemplate = (tmpl: GradingMatrixTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setIsEditing(false);
    setEditingTemplateId(null);
    setExpandedCatId(null);
  };

  const handleStartEdit = (tmpl: GradingMatrixTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateDesc(tmpl.description || '');
    setCategories(JSON.parse(JSON.stringify(tmpl.matrix)));
    setPassingGrade(tmpl.passingGrade);
    setIsEditing(true);
    setExpandedCatId(tmpl.matrix.find((c) => c.subCategories && c.subCategories.length > 0)?.id || null);
  };

  const handleStartCreateNew = () => {
    setEditingTemplateId(null); // Explicitly null to create a brand new template!
    setTemplateName('New Grading Matrix Template');
    setTemplateDesc('Custom global grading formula.');
    setCategories([
      {
        id: `cat-${Date.now().toString(36)}-1`,
        name: 'Class Standing',
        weight: 50,
        color: 'emerald',
        subCategories: [
          { id: `sub-${Date.now().toString(36)}-1`, name: 'Quizzes / Outputs', weight: 100 },
        ],
      },
      { id: `cat-${Date.now().toString(36)}-2`, name: 'Periodic Examinations', weight: 50, color: 'rose' },
    ]);
    setPassingGrade(75);
    setIsEditing(true);
  };

  const handleApplyGlobally = (tmpl: GradingMatrixTemplate) => {
    if (
      window.confirm(
        `Are you sure you want to apply the "${tmpl.name}" matrix to ALL subjects across all sections? This will standardize grading calculations across the entire system.`
      )
    ) {
      applyTemplateGlobally(tmpl.id);
      onShowToast(
        'Matrix Applied Globally',
        `All active course subjects have been synchronized to "${tmpl.name}".`,
        'success'
      );
      onClose();
    }
  };

  // Top level category weight handler
  const handleWeightChange = (catId: string, weight: number) => {
    const clean = Math.max(0, Math.min(100, Math.round(weight)));
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, weight: clean } : c))
    );
  };

  // Subcategory weight handler
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

  // Add top-level category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat: MatrixCategory = {
      id: `cat-${Date.now().toString(36)}`,
      name: newCatName.trim(),
      weight: Number(newCatWeight) || 10,
      color: 'blue',
    };
    setCategories((prev) => [...prev, newCat]);
    setNewCatName('');
    setNewCatWeight(10);
  };

  // Add subcategory to category
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

  const handleDeleteCategory = (catId: string) => {
    if (categories.length <= 1) {
      alert('A grading template must have at least one category.');
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== catId));
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

  const handleSaveTemplate = () => {
    const { isValid, total } = validateMatrixTotal(categories);
    if (!isValid) {
      alert(`Main category weights must equal 100%. Currently they total ${total}%.`);
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

    const saved = saveMatrixTemplate(
      {
        name: templateName.trim(),
        description: templateDesc.trim(),
        passingGrade,
        matrix: categories,
      },
      editingTemplateId || undefined
    );

    setIsEditing(false);
    setEditingTemplateId(null);
    setSelectedTemplateId(saved.id);
    onShowToast('Global Template Saved', `"${saved.name}" has been saved.`, 'success');
  };

  const { isValid, total, diff } = validateMatrixTotal(categories);

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Global Grading Matrix Templates"
      subtitle="Standardize and apply grading criteria formulas across all subjects"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {validTemplates.map((tmpl) => {
              const isSelected = isEditing
                ? tmpl.id === editingTemplateId
                : tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {tmpl.name.split(' (')[0]}
                </button>
              );
            })}
          </div>

          <NeuButton
            variant="secondary"
            size="sm"
            onClick={handleStartCreateNew}
            leftIcon={<Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
          >
            Create New Template
          </NeuButton>
        </div>

        {/* Template Detail / Edit View */}
        {isEditing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
                  placeholder="e.g. Laboratory Standard"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Passing Threshold
                </label>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm">
                  <input
                    type="number"
                    min="50"
                    max="95"
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(Number(e.target.value) || 75)}
                    className="w-12 bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 text-center outline-none"
                  />
                  <span className="text-xs text-slate-500 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Total Balance Gauge */}
            <div
              className={`p-3.5 rounded-xl flex items-center justify-between border ${
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
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Total Matrix Sum: {total}% / 100%
                  </span>
                  <p className="text-slate-500">
                    {isValid ? 'Weights are balanced to 100%.' : `Difference: ${diff}%`}
                  </p>
                </div>
              </div>
            </div>

            {/* Categories & Subcategories Editor */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Matrix Categories & Sub-Components
              </h4>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const hasSubs = cat.subCategories && cat.subCategories.length > 0;
                  const isExpanded = expandedCatId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                    >
                      {/* Parent Category Row */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) =>
                              setCategories((prev) =>
                                prev.map((c) => (c.id === cat.id ? { ...c, name: e.target.value } : c))
                              )
                            }
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 flex-1"
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
                        </div>

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
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Subcategories Expansion */}
                      {(isExpanded || hasSubs) && (
                        <div className="pl-4 sm:pl-6 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-2 pt-2">
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

              {/* Add Top Category */}
              <form
                onSubmit={handleAddCategory}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5"
              >
                <input
                  type="text"
                  placeholder="Add main category (e.g. Class Standing, Exams, Projects)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-600"
                />
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newCatWeight}
                    onChange={(e) => setNewCatWeight(Number(e.target.value))}
                    className="w-8 bg-transparent text-xs font-bold text-right outline-none"
                  />
                  <span className="text-xs text-slate-400 font-bold">%</span>
                </div>
                <NeuButton type="submit" variant="secondary" size="sm" disabled={!newCatName.trim()}>
                  Add Category
                </NeuButton>
              </form>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <NeuButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditingTemplateId(null);
                }}
              >
                Cancel
              </NeuButton>
              <NeuButton type="button" variant="primary" onClick={handleSaveTemplate} disabled={!isValid}>
                Save Template
              </NeuButton>
            </div>
          </div>
        ) : (
          /* View Mode */
          activeTemplate ? (
            <div className="space-y-6">
              {/* Template Header Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {activeTemplate.name.split(' (')[0]}
                    </h3>
                    <NeuBadge variant="primary" size="sm">
                      Pass: {activeTemplate.passingGrade}%
                    </NeuBadge>
                    {activeTemplate.isDefault && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        Active Global Standard
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeTemplate.description || 'Global matrix grading formula.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                  <NeuButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete the "${activeTemplate.name}" template?`)) {
                        deleteMatrixTemplate(activeTemplate.id);
                        onShowToast('Template Deleted', `"${activeTemplate.name}" was removed.`, 'info');
                      }
                    }}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </NeuButton>

                  <NeuButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStartEdit(activeTemplate)}
                    leftIcon={<Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  >
                    Edit Weights
                  </NeuButton>

                  <NeuButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleApplyGlobally(activeTemplate)}
                    leftIcon={<Globe className="w-3.5 h-3.5 text-white" />}
                  >
                    Apply Globally
                  </NeuButton>
                </div>
              </div>

              {/* Matrix Breakdown Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {activeTemplate.matrix.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{cat.name}</span>
                      <NeuBadge variant="primary" size="sm">
                        {cat.weight}%
                      </NeuBadge>
                    </div>

                    {cat.subCategories && cat.subCategories.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-components:</div>
                        {cat.subCategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <span>{sub.name}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{sub.weight}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 py-1">
                        Direct assessment category with {cat.weight}% weight in final grade.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Global Application Banner */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Standardize All Courses
                    </h4>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      Synchronize this exact matrix calculation across all active subjects and sections.
                    </p>
                  </div>
                </div>

                <NeuButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleApplyGlobally(activeTemplate)}
                >
                  Apply to All Courses
                </NeuButton>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Global Templates Defined</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create your own customized grading matrix template or configure course matrices directly.
                </p>
              </div>
              <NeuButton variant="primary" size="sm" onClick={handleStartCreateNew} leftIcon={<Plus className="w-4 h-4" />}>
                Create Custom Template
              </NeuButton>
            </div>
          )
        )}
      </div>
    </NeuModal>
  );
};
