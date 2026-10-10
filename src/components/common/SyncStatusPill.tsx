import React, { useState, useEffect, useRef } from 'react';
import { syncEngine, SyncStatus } from '../../services/syncEngine';
import { useData } from '../../context/DataContext';
import {
  CloudOff,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  Trash2,
  DownloadCloud,
  UploadCloud,
} from 'lucide-react';

export const SyncStatusPill: React.FC = () => {
  const { pullFromCloud, pushAllToCloud } = useData();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [queueLength, setQueueLength] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribeStatus((status, qLen) => {
      setSyncStatus(status);
      setQueueLength(qLen);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setFeedbackMsg('Syncing changes with cloud...');
    await syncEngine.flushQueue();
    await pushAllToCloud();
    await pullFromCloud();
    setIsSyncing(false);
    setFeedbackMsg('All tables synchronized!');
    setTimeout(() => {
      setFeedbackMsg(null);
      setIsMenuOpen(false);
    }, 1200);
  };

  const handlePushAll = async () => {
    setIsSyncing(true);
    setFeedbackMsg('Seeding all local data to Supabase...');
    const res = await pushAllToCloud();
    setIsSyncing(false);
    if (res.success) {
      setFeedbackMsg('All tables uploaded to Supabase!');
    } else {
      setFeedbackMsg('Upload failed. Check tables schema.');
    }
    setTimeout(() => {
      setFeedbackMsg(null);
      setIsMenuOpen(false);
    }, 1500);
  };

  const handleClearQueue = () => {
    syncEngine.clearQueue();
    setFeedbackMsg('Pending queue cleared!');
    setTimeout(() => {
      setFeedbackMsg(null);
      setIsMenuOpen(false);
    }, 800);
  };

  const handlePullLatest = async () => {
    setIsSyncing(true);
    setFeedbackMsg('Pulling latest from Supabase...');
    await pullFromCloud();
    setIsSyncing(false);
    setFeedbackMsg('State refreshed from cloud!');
    setTimeout(() => {
      setFeedbackMsg(null);
      setIsMenuOpen(false);
    }, 1000);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Status Pill Button */}
      {syncStatus === 'local_only' ? (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all"
          title="Running in Localhost Offline Mode."
        >
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Local Mode</span>
        </button>
      ) : syncStatus === 'offline' ? (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-all shadow-xs"
        >
          <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Offline ({queueLength} Pending)</span>
        </button>
      ) : syncStatus === 'pending' ? (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{queueLength} Pending</span>
        </button>
      ) : syncStatus === 'syncing' || isSyncing ? (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </button>
      ) : (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Cloud Synced</span>
        </button>
      )}

      {/* Sync Management Popover */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl p-3 z-50 border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Database Sync Manager</div>
              <div className="text-[10px] text-slate-500">
                {feedbackMsg || (queueLength === 0 ? 'All changes saved in cloud' : `${queueLength} pending local change(s)`)}
              </div>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-emerald-500'
                  : syncStatus === 'local_only'
                  ? 'bg-slate-400'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
          </div>

          <div className="space-y-1">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold transition-colors text-left"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Now (Push Pending)</span>
            </button>

            <button
              onClick={handlePushAll}
              disabled={isSyncing}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold transition-colors text-left"
              title="Pushes all local users, sections, subjects, assessments, and attendance to Supabase"
            >
              <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
              <span>Seed Cloud with Local Data</span>
            </button>

            <button
              onClick={handlePullLatest}
              disabled={isSyncing}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors text-left"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pull Latest from Supabase</span>
            </button>

            {queueLength > 0 && (
              <button
                onClick={handleClearQueue}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Pending Queue ({queueLength})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
