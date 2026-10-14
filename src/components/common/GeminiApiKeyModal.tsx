import React, { useState, useEffect } from 'react';
import { NeuModal } from './NeuModal';
import { NeuButton } from './NeuButton';
import { NeuInput } from './NeuInput';
import { NeuBadge } from './NeuBadge';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  testGeminiApiKey,
  hasGeminiApiKey,
  DEFAULT_GEMINI_MODEL,
} from '../../services/geminiService';
import { Key, Sparkles, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onShowToast,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; model?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setTestResult(null);
    }
  }, [isOpen]);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter a Gemini API key to test.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(apiKey.trim());
      setTestResult(res);
      if (res.success) {
        onShowToast('Gemini API Verified', `Successfully connected via ${res.model || DEFAULT_GEMINI_MODEL}!`, 'success');
      } else {
        onShowToast('Connection Failed', res.message, 'error');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    onShowToast('API Key Saved', 'Gemini AI agent is now configured and ready to analyze syllabi.', 'success');
    if (onSaved) onSaved();
    onClose();
  };

  const isConfigured = hasGeminiApiKey();

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Gemini AI Configuration"
      subtitle="Connect your Google Gemini API key to enable AI Syllabus Analysis and Learning Plan generation"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Status Banner */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          isConfigured
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
            : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200'
        }`}>
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <div className="font-bold text-sm">
              {isConfigured ? 'Gemini AI Ready' : 'API Key Not Set'}
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">
              {isConfigured
                ? 'Your system is configured to generate full 18-week learning plans, weekly topics, and study notes.'
                : 'Enter your API key below. You can obtain a free API key from Google AI Studio.'}
            </p>
          </div>
        </div>

        {/* Input Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            Gemini API Key
          </label>
          <div className="relative">
            <NeuInput
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              leftIcon={<Key className="w-4 h-4 text-slate-400" />}
              className="font-mono text-xs pr-20"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Stored securely in your browser's private storage.</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1E3A8A] dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              Get Free Key <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Test Result Indicator */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        )}

        {/* Model Info Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F97316]" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">Default Model</span>
          </div>
          <NeuBadge variant="primary" size="sm">
            {DEFAULT_GEMINI_MODEL}
          </NeuBadge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
          <NeuButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTest}
            disabled={isTesting || !apiKey.trim()}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </NeuButton>

          <div className="flex items-center gap-2">
            <NeuButton type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </NeuButton>
            <NeuButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              Save Configuration
            </NeuButton>
          </div>
        </div>
      </div>
    </NeuModal>
  );
};
