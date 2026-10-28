import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { AnalysisProgressStatus } from '../types';

interface ProgressModalProps {
  progress: AnalysisProgressStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  progress,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !progress) return null;

  const isError = progress.is_error;
  const isComplete = progress.is_complete;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-medic-darker rounded-2xl border border-medic-border shadow-2xl p-6 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-electric-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyanaccent-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {isError ? (
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : isComplete ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-electric-500/20 text-electric-400 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-sm text-slate-100">
                {isError ? 'Analysis Failed' : isComplete ? 'Analysis Complete' : 'Analyzing Repository'}
              </h3>
              <p className="text-xs text-medic-muted font-mono">{progress.step}</p>
            </div>
          </div>

          {(isComplete || isError) && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-medic-dark transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-medic-darkest rounded-full h-2 mb-3 overflow-hidden border border-medic-border/50">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isError
                ? 'bg-rose-500'
                : isComplete
                ? 'bg-emerald-500 shadow-md shadow-emerald-500/30'
                : 'bg-gradient-to-r from-electric-500 to-cyanaccent-400 shadow-md shadow-electric-500/40'
            }`}
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          ></div>
        </div>

        {/* Status Message */}
        <div className="flex justify-between text-xs text-medic-muted mb-4">
          <span className="truncate pr-2">{progress.message}</span>
          <span className="font-mono font-medium text-slate-300 shrink-0">{progress.percentage}%</span>
        </div>

        {isError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs mb-4">
            {progress.error_message || 'An unexpected error occurred during repository indexing.'}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-medic-border/60">
          {isComplete && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-medium text-xs shadow-md shadow-electric-600/30 transition-colors"
            >
              Open Repository Dashboard
            </button>
          )}
          {isError && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-medic-card hover:bg-medic-dark border border-medic-border text-slate-200 font-medium text-xs transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
