import React, { useState } from 'react';
import {
  Bug,
  AlertTriangle,
  Play,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FileText,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { RepositoryMetadata, BugAnalysisResponse } from '../types';
import { api } from '../services/api';
import { DiffViewer } from '../components/DiffViewer';

interface BugDetectiveProps {
  repo: RepositoryMetadata;
  onOpenFileInViewer: (path: string) => void;
}

export const BugDetective: React.FC<BugDetectiveProps> = ({
  repo,
  onOpenFileInViewer,
}) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [stackTrace, setStackTrace] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [suspectedFile, setSuspectedFile] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<BugAnalysisResponse | null>(null);

  const handleLoadExample = () => {
    setErrorMessage("KeyError: 'user_id'");
    setStackTrace(`Traceback (most recent call last):
  File "src/main.py", line 26, in get_user_profile
    user: dict = Depends(get_current_user)
  File "src/auth.py", line 45, in get_current_user
    return service.verify_token(token_header)
  File "src/auth.py", line 32, in verify_token
    user_id = payload["user_id"]
KeyError: 'user_id'`);
    setReproductionSteps(
      '1. Client sends request to GET /api/v1/profile with token missing user_id claim.\n2. Service crashes with unhandled KeyError 500.'
    );
    setSuspectedFile('src/auth.py');
    setError(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorMessage.trim()) {
      setError('Please provide an error message or exception description.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await api.analyzeBug(
        repo.id,
        errorMessage.trim(),
        stackTrace.trim() || undefined,
        reproductionSteps.trim() || undefined,
        suspectedFile.trim() || undefined
      );
      setDiagnosis(resp);
    } catch (err: any) {
      setError(err.message || 'Bug investigation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Header */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">AI Bug Detective</h1>
              <p className="text-xs text-medic-muted">
                Analyze errors, correlate stack traces to indexed code, and inspect context-aware fix proposals.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadExample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medic-card hover:bg-medic-dark border border-medic-border text-xs text-cyanaccent-400 font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Example Error (KeyError)</span>
          </button>
        </div>

        {/* Bug Submission Form */}
        <form onSubmit={handleAnalyze} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Error Message */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <span>Error Message or Exception *</span>
              </label>
              <input
                type="text"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="e.g. KeyError: 'user_id' or TypeError: Cannot read properties of undefined"
                className="w-full bg-medic-darkest border border-medic-border rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono transition-colors"
                required
              />
            </div>

            {/* Suspected File (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Suspected File <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={suspectedFile}
                onChange={(e) => setSuspectedFile(e.target.value)}
                placeholder="e.g. src/auth.py"
                className="w-full bg-medic-darkest border border-medic-border rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Stack Trace */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Stack Trace <span className="text-slate-500 font-normal">(Optional, highly recommended)</span></span>
              <span className="text-[10px] text-slate-500">Auto-parses Python, JS/TS, Node stack frames</span>
            </label>
            <textarea
              rows={4}
              value={stackTrace}
              onChange={(e) => setStackTrace(e.target.value)}
              placeholder="Paste full error stack trace here..."
              className="w-full bg-medic-darkest border border-medic-border rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono transition-colors"
            />
          </div>

          {/* Reproduction Steps */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Reproduction Steps <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={reproductionSteps}
              onChange={(e) => setReproductionSteps(e.target.value)}
              placeholder="e.g. Call login endpoint with empty password payload"
              className="w-full bg-medic-darkest border border-medic-border rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !errorMessage.trim()}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                  <span>Investigating Code & Stack Trace...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Analyze Bug</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Investigation Results */}
      {diagnosis && (
        <div className="space-y-6">
          {/* Summary & Root Cause Card */}
          <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-medic-border/60">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold block mb-1">
                  Diagnosis Result
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">{diagnosis.bug_summary}</h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded text-[10px] font-mono bg-medic-darkest border border-medic-border text-cyanaccent-400">
                  {diagnosis.model_used || 'Static Bug Analyzer'}
                </span>
              </div>
            </div>

            {/* Root Cause & Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-medic-darkest border border-medic-border">
                <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Potential Root Cause</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{diagnosis.potential_root_cause}</p>
              </div>

              <div className="p-4 rounded-xl bg-medic-darkest border border-medic-border">
                <h4 className="text-xs font-semibold text-cyanaccent-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyanaccent-400" />
                  <span>Code Evidence</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{diagnosis.evidence}</p>
              </div>
            </div>

            {/* Relevant Files Badges */}
            {diagnosis.relevant_files && diagnosis.relevant_files.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Correlated Repository Files:
                </span>
                <div className="flex flex-wrap gap-2">
                  {diagnosis.relevant_files.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => onOpenFileInViewer(file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medic-card hover:bg-medic-dark border border-medic-border text-xs font-mono text-cyanaccent-400 hover:text-cyanaccent-300 transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{file}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Context-Aware Fix Suggestion & Diff Viewer */}
          {diagnosis.suggested_fix && (
            <div>
              <DiffViewer fix={diagnosis.suggested_fix} />
            </div>
          )}

          {/* Verification & Limitations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* How to Verify */}
            <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>How to Verify (Testing Steps)</span>
              </h4>
              <ul className="space-y-2">
                {diagnosis.how_to_verify.map((step, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-slate-500 font-mono font-bold">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confidence & Limitations */}
            <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 space-y-3">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Confidence & Limitations</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {diagnosis.confidence_and_limitations}
              </p>
              <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border text-[11px] text-slate-400">
                <strong>Disclaimer:</strong> This diagnosis is an automated static code analysis proposal. Always test patches in a sandbox before deploying.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
