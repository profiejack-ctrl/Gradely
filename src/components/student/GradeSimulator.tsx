import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Subject, GRADING_PERIODS } from '../../types';
import { NeuCard } from '../common/NeuCard';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuCircularGauge } from '../common/NeuProgress';
import { calculateStudentSubjectPerformance, convertToGPA } from '../../utils/gradeCalculator';
import { getStudentEnrolledSubjects } from '../../utils/enrollmentUtils';
import { Calculator, Sparkles, RefreshCw, ArrowLeft, Target } from 'lucide-react';

interface GradeSimulatorProps {
  initialSubjectId?: string;
  onBack?: () => void;
}

type SimulationMode = 'periods' | 'categories';

export const GradeSimulator: React.FC<GradeSimulatorProps> = ({
  initialSubjectId,
  onBack,
}) => {
  const { currentUser } = useAuth();
  const { allUsers, subjects, assessments, scores, attendance } = useData();

  const student = (currentUser ? allUsers.find((u) => u.id === currentUser.id) : null) || currentUser;
  const enrolledSubjects = getStudentEnrolledSubjects(
    student,
    subjects,
    assessments,
    scores,
    attendance
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || enrolledSubjects[0]?.id || ''
  );

  useEffect(() => {
    if (initialSubjectId && enrolledSubjects.some((s) => s.id === initialSubjectId)) {
      setSelectedSubjectId(initialSubjectId);
    } else if (enrolledSubjects.length > 0 && !enrolledSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(enrolledSubjects[0].id);
    }
  }, [initialSubjectId, enrolledSubjects, selectedSubjectId]);

  const [simulationMode, setSimulationMode] = useState<SimulationMode>('periods');

  const currentSubject: Subject | undefined =
    enrolledSubjects.find((s) => s.id === selectedSubjectId) || enrolledSubjects[0];

  // Base actual performance
  const actualPerf = currentSubject && student
    ? calculateStudentSubjectPerformance(
        currentSubject,
        student,
        assessments,
        scores,
        attendance
      )
    : null;

  // Period scores simulation
  const [simulatedPeriodScores, setSimulatedPeriodScores] = useState<Record<string, number>>({
    prelim: 85,
    midterm: 85,
    finals: 85,
  });

  // Category percentage overrides simulation
  const [simulatedCategoryScores, setSimulatedCategoryScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (actualPerf) {
      setSimulatedPeriodScores({
        prelim: actualPerf.periods.prelim.grade || 85,
        midterm: actualPerf.periods.midterm.grade || 85,
        finals: actualPerf.periods.finals.grade || 85,
      });

      const initialCatMap: Record<string, number> = {};
      actualPerf.categories.forEach((c) => {
        initialCatMap[c.category.id] = c.rawPercentage;
      });
      setSimulatedCategoryScores(initialCatMap);
    }
  }, [selectedSubjectId, actualPerf?.subject.id]);

  if (!currentSubject || !actualPerf) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Subjects Available</h2>
      </div>
    );
  }

  // Calculate simulated final grade
  let simulatedFinal = 0;
  if (simulationMode === 'periods') {
    simulatedFinal =
      (simulatedPeriodScores.prelim || 0) * 0.3 +
      (simulatedPeriodScores.midterm || 0) * 0.3 +
      (simulatedPeriodScores.finals || 0) * 0.4;
  } else {
    currentSubject.matrix.forEach((cat) => {
      const rawVal =
        simulatedCategoryScores[cat.id] !== undefined
          ? simulatedCategoryScores[cat.id]
          : 85;
      simulatedFinal += (rawVal * cat.weight) / 100;
    });
  }

  const simulatedFinalGrade = Math.min(100, Math.max(0, Math.round(simulatedFinal * 10) / 10));
  const simulatedGPA = convertToGPA(simulatedFinalGrade);
  const isSimulatedPassing = simulatedFinalGrade >= currentSubject.passingGrade;

  const handlePeriodSliderChange = (periodKey: string, val: number) => {
    setSimulatedPeriodScores((prev) => ({
      ...prev,
      [periodKey]: val,
    }));
  };

  const handleCategorySliderChange = (catId: string, val: number) => {
    setSimulatedCategoryScores((prev) => ({
      ...prev,
      [catId]: val,
    }));
  };

  const handleResetToActual = () => {
    setSimulatedPeriodScores({
      prelim: actualPerf.periods.prelim.grade || 85,
      midterm: actualPerf.periods.midterm.grade || 85,
      finals: actualPerf.periods.finals.grade || 85,
    });

    const initialCatMap: Record<string, number> = {};
    actualPerf.categories.forEach((c) => {
      initialCatMap[c.category.id] = c.rawPercentage;
    });
    setSimulatedCategoryScores(initialCatMap);
  };

  const handleSetAll = (score: number) => {
    if (simulationMode === 'periods') {
      setSimulatedPeriodScores({
        prelim: score,
        midterm: score,
        finals: score,
      });
    } else {
      const map: Record<string, number> = {};
      currentSubject.matrix.forEach((c) => {
        map[c.id] = score;
      });
      setSimulatedCategoryScores(map);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <NeuButton variant="secondary" size="icon" onClick={onBack} title="Back">
                <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </NeuButton>
            )}
            <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              "What-If" Grade Simulator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Simulate your Prelim, Midterm, and Finals scores (30/30/40) to project your semestral final grade and GPA.
          </p>
        </div>

        {/* Subject picker */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none cursor-pointer w-full sm:w-auto"
          >
            {enrolledSubjects.map((s) => (
              <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900">
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto sm:max-w-md">
        <button
          onClick={() => setSimulationMode('periods')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
            simulationMode === 'periods'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          3-Quarter (30/30/40)
        </button>
        <button
          onClick={() => setSimulationMode('categories')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
            simulationMode === 'categories'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Matrix Categories
        </button>
      </div>

      {/* Simulator Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Projected Score Gauge & Comparison */}
        <NeuCard className="flex flex-col items-center justify-between p-6 text-center space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Projected Semestral Standing</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Passing Threshold: {currentSubject.passingGrade}%
            </p>
          </div>

          <NeuCircularGauge
            value={simulatedFinalGrade}
            label={simulatedFinalGrade >= 90 ? 'Honors' : isSimulatedPassing ? 'Passing' : 'Failed'}
            size={140}
          />

          <div className="space-y-2 w-full">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <span className="text-slate-500">Current Actual Semestral:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{actualPerf.finalGrade}%</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <span className="text-slate-500">Projected Difference:</span>
              <span
                className={`font-bold ${
                  simulatedFinalGrade >= actualPerf.finalGrade
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {simulatedFinalGrade >= actualPerf.finalGrade ? '+' : ''}
                {(simulatedFinalGrade - actualPerf.finalGrade).toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <span className="text-slate-500">Projected Grade Equiv:</span>
              <span className={`font-mono font-bold ${simulatedGPA <= 3.0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400 font-extrabold'}`}>
                {simulatedGPA.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-2 w-full">
            <NeuButton
              variant="secondary"
              size="sm"
              onClick={handleResetToActual}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
              className="w-full"
            >
              Reset to Current Grades
            </NeuButton>
          </div>
        </NeuCard>

        {/* Right: Sliders Interface */}
        <NeuCard className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {simulationMode === 'periods'
                  ? `Simulate Quarter Grades for ${currentSubject.name}`
                  : `Simulate Matrix Category Scores for ${currentSubject.name}`}
              </h3>
              <p className="text-xs text-slate-500">
                {simulationMode === 'periods'
                  ? 'Adjust Prelim (30%), Midterm (30%), and Finals (40%) to calculate semestral standing'
                  : 'Adjust individual category weights to see composite outcome'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <NeuButton variant="secondary" size="sm" onClick={() => handleSetAll(100)} className="flex-1 sm:flex-initial">
                100%
              </NeuButton>
              <NeuButton variant="secondary" size="sm" onClick={() => handleSetAll(85)} className="flex-1 sm:flex-initial">
                85%
              </NeuButton>
              <NeuButton variant="secondary" size="sm" onClick={() => handleSetAll(75)} className="flex-1 sm:flex-initial">
                75%
              </NeuButton>
            </div>
          </div>

          {/* Mode 1: Quarter Periods */}
          {simulationMode === 'periods' ? (
            <div className="space-y-3">
              {GRADING_PERIODS.map((p) => {
                const currentVal = simulatedPeriodScores[p.id] ?? 85;
                const weightedPts = Math.round(((currentVal * p.weight) / 100) * 10) / 10;

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {p.name}
                        </span>
                        <NeuBadge variant="neutral" size="sm">
                          {p.weight}% of Semestral Grade
                        </NeuBadge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Weighted Pts:</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          +{weightedPts}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentVal}
                        onChange={(e) => handlePeriodSliderChange(p.id, Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />

                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentVal}
                          onChange={(e) =>
                            handlePeriodSliderChange(
                              p.id,
                              Math.min(100, Math.max(0, Number(e.target.value)))
                            )
                          }
                          className="w-8 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 text-center outline-none"
                        />
                        <span className="text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode 2: Category Matrix */
            <div className="space-y-3">
              {currentSubject.matrix.map((cat) => {
                const currentVal =
                  simulatedCategoryScores[cat.id] !== undefined
                    ? simulatedCategoryScores[cat.id]
                    : 85;
                const weightedPts = Math.round(((currentVal * cat.weight) / 100) * 10) / 10;

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {cat.name}
                        </span>
                        <NeuBadge variant="neutral" size="sm">
                          {cat.weight}% of Total
                        </NeuBadge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Contribution:</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          +{weightedPts}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentVal}
                        onChange={(e) => handleCategorySliderChange(cat.id, Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />

                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentVal}
                          onChange={(e) =>
                            handleCategorySliderChange(
                              cat.id,
                              Math.min(100, Math.max(0, Number(e.target.value)))
                            )
                          }
                          className="w-8 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 text-center outline-none"
                        />
                        <span className="text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Strategy Tip */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Quarter Weight Strategy:</span> In a 3-quarter system,{' '}
              <span className="font-bold underline">Finals Period carries 40% weight</span> (vs 30% for Prelim and Midterm). Performing well in your Finals project and exam has the highest positive impact on your Semestral grade!
            </div>
          </div>
        </NeuCard>
      </div>
    </div>
  );
};
