import React, { useState, useEffect, useId } from 'react';
import { Section, Subject, User } from '../../types';
import { NeuModal } from '../common/NeuModal';
import { NeuButton } from '../common/NeuButton';
import { NeuBadge } from '../common/NeuBadge';
import { NeuSelect } from '../common/NeuInput';
import { useData } from '../../context/DataContext';
import { parseStudentMasterlist, generateSampleStudentCSV, ParseMasterlistResult } from '../../utils/csvParser';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Download,
  Clipboard,
  CalendarCheck,
  Search,
  Sparkles,
} from 'lucide-react';

interface BulkStudentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  selectedSectionId?: string;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const SAMPLE_MASTERLIST_CSV = `student_id,student_name,Class Standing_Attendance_1,Class Standing_Attendance_2,Class Standing_Attendance_3,Class Standing_Attendance_4__,Class Standing_Attendance_5,Class Standing_Attendance_6,Class Standing_Attendance_7,Class Standing_Attendance_8,Class Standing_Attendance_9,Class Standing_Attendance_10,Class Standing_Written_Works_1,Class Standing_Written_Works_2,Class Standing_Written_Works_3,Class Standing_Written_Works_4,Class Standing_Written_Works_5,Class Standing_Written_Works_6,Class Standing_Written_Works_7,Class Standing_Written_Works_8,Class Standing_Written_Works_9,Class Standing_Written_Works_10,Class Standing_Task_1,Class Standing_Task_2,Class Standing_Task_3,Class Standing_Task_4,Class Standing_Task_5,Class Standing_Task_6,Class Standing_Task_7,Class Standing_Task_8,Class Standing_Task_9,Class Standing_Task_10,Project_Output_1,Project_Requirement_1,Examination_Final_Written_Examination,Examination_Final_Oral_Examiantion
-,overall,1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
22120613,"Aguirre, Joshua Pancho",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
22016894,"Arce, Jhon Raze Gasic",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230117475,"Barredo, Khian Lhei",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230115607,"Borcena, Rodel",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
250105374,"Borces, Martin Nando",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240109464,"Boyo, Justin",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
250104164,"Bullos, Clarence",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240113104,"Cipriano, Justyne Lawrenze",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240115655,"Corullo, Mark Zeus",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240104948,"Crisostomo, Josch",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230118721,"Daguio, Alvin",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
22014014,"De Leon, Dominique Harvey Vargas",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240117363,"Delgado, Elthon Gabriel",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
22121697,"Ebajan, Lowell Castante",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240104170,"Ebin, Maria Christina",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230117503,"Fuentes, Michael",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230115502,"Lansang, Ace",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
250103504,"Malla, Steven John",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240111756,"Maquinano, Nehemias",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230119834,"Mararac, Tyron",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
22016166,"Oriel, Roger Pacia",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
250106494,"Paglomutan, Lawrence",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240112211,"Palisbo, John Michael",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230115175,"Prado, Landon Gian",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240115738,"Resuello, Cyrrel",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230110494,"Sabado, Marlon",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240116143,"Sinier, Franchesca",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240116977,"Sol, Jerry",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240111016,"Tacasa, Princess Marinelle",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230107216,"Ventura, Dexter",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
240113791,"Villanueva, Ramon Arman",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,
230108992,"Villarin, Harvey",1,1,1,1,1,1,1,1,1,1,,,,,,,,,,,,,,,,,,,,,,,,`;

export const BulkStudentUploadModal: React.FC<BulkStudentUploadModalProps> = ({
  isOpen,
  onClose,
  sections,
  selectedSectionId,
  onShowToast,
}) => {
  const fileInputId = useId();
  const { bulkAddStudents, subjects, setAttendance } = useData();
  const [targetSectionId, setTargetSectionId] = useState<string>(
    selectedSectionId && selectedSectionId !== 'all' ? selectedSectionId : sections[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [csvText, setCsvText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParseMasterlistResult | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [syncAttendanceLogs, setSyncAttendanceLogs] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const targetSection = sections.find((s) => s.id === targetSectionId) || sections[0];
  const sectionSubjects: Subject[] = subjects.filter((s) => s.sectionId === targetSection?.id);

  useEffect(() => {
    if (isOpen) {
      const initialSec =
        selectedSectionId && selectedSectionId !== 'all'
          ? selectedSectionId
          : sections[0]?.id || '';
      setTargetSectionId(initialSec);
      if (csvText) {
        handleProcessCSV(csvText, initialSec);
      }
    }
  }, [isOpen, selectedSectionId, sections]);

  const handleProcessCSV = (rawContent: string, secId: string) => {
    setCsvText(rawContent);
    if (!rawContent.trim()) {
      setParsedData(null);
      return;
    }
    const result = parseStudentMasterlist(rawContent, secId);
    setParsedData(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessCSV(content, targetSectionId);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setActiveTab('paste');
    handleProcessCSV(SAMPLE_MASTERLIST_CSV, targetSectionId);
    onShowToast('Sample Masterlist Loaded', '32 student records ready for review.', 'info');
  };

  const handleDownloadTemplate = () => {
    const sample = generateSampleStudentCSV();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student_masterlist_template_${targetSection?.name || 'section'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Template Downloaded', 'student_masterlist_template.csv saved.', 'success');
  };

  const handleEnrollAll = () => {
    if (!parsedData || parsedData.students.length === 0) return;
    const effectiveSectionId = targetSectionId || sections[0]?.id || 'sec-1';

    // Build payload for batch addition
    const studentsToEnroll: Omit<User, 'id' | 'role'>[] = parsedData.students.map((stud) => ({
      name: stud.name,
      email: stud.email,
      studentNumber: stud.studentNumber,
      sectionId: effectiveSectionId,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(stud.name)}`,
    }));

    const enrolledList = bulkAddStudents(studentsToEnroll);

    // If attendance sync is enabled and attendance columns are present
    let attendanceRecordsLogged = 0;
    if (syncAttendanceLogs && parsedData.attendanceColumns.length > 0) {
      const targetSubj = selectedSubjectId
        ? subjects.find((s) => s.id === selectedSubjectId)
        : sectionSubjects[0];

      if (targetSubj) {
        // Generate mock session dates for the 10 attendance columns
        const today = new Date();
        parsedData.attendanceColumns.forEach((colName, colIdx) => {
          const sessionDate = new Date(today);
          sessionDate.setDate(today.getDate() - (parsedData.attendanceColumns.length - colIdx) * 2);
          const dateStr = sessionDate.toISOString().slice(0, 10);

          parsedData.students.forEach((stud) => {
            const enrolled = enrolledList.find((u) => u.studentNumber === stud.studentNumber);
            if (enrolled) {
              const val = stud.rawRecord[colName];
              if (val === '1' || /present|p/i.test(val)) {
                setAttendance(targetSubj.id, enrolled.id, dateStr, 'present', `Imported from ${colName}`);
                attendanceRecordsLogged++;
              }
            }
          });
        });
      }
    }

    onShowToast(
      'Bulk Enrollment Complete!',
      `Enrolled ${enrolledList.length} students into ${targetSection?.name || 'Section'}${
        attendanceRecordsLogged > 0 ? ` with ${attendanceRecordsLogged} attendance records.` : '.'
      }`,
      'success'
    );

    // Reset state & close
    setCsvText('');
    setParsedData(null);
    onClose();
  };

  const sectionOptions = sections.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.gradeLevelOrYear})`,
  }));

  const filteredPreviewStudents = parsedData
    ? parsedData.students.filter(
        (s) =>
          s.name.toLowerCase().includes(previewSearch.toLowerCase()) ||
          s.studentNumber.toLowerCase().includes(previewSearch.toLowerCase()) ||
          s.originalName.toLowerCase().includes(previewSearch.toLowerCase())
      )
    : [];

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Student Masterlist Upload"
      subtitle={`Import and enroll students in batch for ${targetSection?.name || 'classes'}`}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Section Picker & Quick Action Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Target Class / Section to Enroll:
            </label>
            <div className="max-w-xs">
              <NeuSelect
                options={sectionOptions}
                value={targetSectionId}
                onChange={(e) => {
                  setTargetSectionId(e.target.value);
                  if (csvText) {
                    handleProcessCSV(csvText, e.target.value);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <NeuButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            >
              CSV Template
            </NeuButton>

            <NeuButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLoadSample}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
            >
              Load Masterlist (32 Students)
            </NeuButton>
          </div>
        </div>

        {/* Input Method Tabs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Masterlist CSV File
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'paste'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste CSV / Raw Text
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors bg-white dark:bg-slate-900/50">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id={fileInputId}
              />
              <label htmlFor={fileInputId} className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Click to browse file
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400"> or drag and drop</span>
                </div>
                <p className="text-xs text-slate-400">Supports standard student masterlist CSV files</p>
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={csvText}
                onChange={(e) => handleProcessCSV(e.target.value, targetSectionId)}
                placeholder="Paste your CSV masterlist here (e.g. student_id,student_name,Class Standing_Attendance_1...)"
                rows={6}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 custom-scrollbar"
              />
            </div>
          )}
        </div>

        {/* Parsed Live Preview Section */}
        {parsedData && parsedData.students.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Header badges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{parsedData.students.length} Students Detected</span>
                </div>

                {parsedData.attendanceColumns.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>{parsedData.attendanceColumns.length} Attendance Sessions</span>
                  </div>
                )}

                <NeuBadge variant="primary" size="sm">
                  Section: {targetSection?.name || 'Class'}
                </NeuBadge>
              </div>

              {/* Search within preview */}
              <div className="w-full sm:w-56">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter preview..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-8 pr-3 py-1 rounded-lg text-xs outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Attendance sync toggle */}
            {parsedData.attendanceColumns.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncAttendanceLogs}
                    onChange={(e) => setSyncAttendanceLogs(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Import Attendance Records ({parsedData.attendanceColumns.length} Sessions)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Logs all attendance '1' entries as Present for the students in this section.
                    </p>
                  </div>
                </label>

                {sectionSubjects.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[11px] font-semibold text-slate-500">Course Subject:</span>
                    <select
                      value={selectedSubjectId || sectionSubjects[0]?.id}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium outline-none text-slate-900 dark:text-slate-100"
                    >
                      {sectionSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Preview Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Generated Email</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredPreviewStudents.map((stud, idx) => (
                    <tr key={stud.studentNumber || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {stud.studentNumber}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {stud.name}
                        {stud.originalName !== stud.name && (
                          <span className="text-[10px] text-slate-400 block font-normal font-mono">
                            {stud.originalName}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[180px]">{stud.email}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold font-mono text-[11px]">
                          {stud.attendanceCount} / {parsedData.attendanceColumns.length || 10}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            {parsedData && parsedData.students.length > 0 ? (
              <span>Ready to enroll <strong>{parsedData.students.length}</strong> students.</span>
            ) : (
              <span>Upload or paste a masterlist to preview.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <NeuButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </NeuButton>

            <NeuButton
              type="button"
              variant="primary"
              onClick={handleEnrollAll}
              disabled={!parsedData || parsedData.students.length === 0}
              leftIcon={<Users className="w-4 h-4 text-white" />}
            >
              Enroll {parsedData?.students.length || 0} Students
            </NeuButton>
          </div>
        </div>
      </div>
    </NeuModal>
  );
};
