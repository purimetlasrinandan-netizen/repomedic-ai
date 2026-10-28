import React, { useState } from 'react';
import { Copy, Check, Download, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { SuggestedFix } from '../types';

interface DiffViewerProps {
  fix: SuggestedFix;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ fix }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'diff' | 'side-by-side'>('diff');

  const handleCopyPatch = () => {
    navigator.clipboard.writeText(fix.diff || fix.proposed_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPatch = () => {
    const patchContent = fix.diff || `--- original\n+++ proposed\n${fix.proposed_code}`;
    const blob = new Blob([patchContent], { type: 'text/x-diff' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repomedic-fix-${Date.now()}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const diffLines = (fix.diff || '').split('\n');

  return (
    <div className="bg-medic-darkest rounded-xl border border-medic-border overflow-hidden">
      {/* Diff Header Bar */}
      <div className="px-4 py-3 bg-medic-darker border-b border-medic-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-slate-200">Proposed Correction Patch</span>
          <div className="flex items-center rounded-lg bg-medic-card border border-medic-border p-0.5 text-xs">
            <button
              onClick={() => setViewMode('diff')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'diff' ? 'bg-electric-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unified Diff
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'side-by-side' ? 'bg-electric-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPatch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medic-card hover:bg-medic-dark border border-medic-border text-xs text-slate-200 font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Patch' : 'Copy Patch'}</span>
          </button>
          <button
            onClick={handleDownloadPatch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-electric-600/20 hover:bg-electric-600/30 border border-electric-500/40 text-xs text-electric-300 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .patch</span>
          </button>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-900/40 flex items-center gap-2 text-xs text-indigo-300">
        <ShieldCheck className="w-4 h-4 text-cyanaccent-400 shrink-0" />
        <span>
          <strong>Safety Policy:</strong> Proposed patches are suggestions for review. RepoMedic AI never mutates your code or automatically commits to Git.
        </span>
      </div>

      {/* Code Display Area */}
      {viewMode === 'diff' ? (
        <div className="p-4 font-mono text-xs overflow-x-auto max-h-96">
          {diffLines.length > 0 && diffLines.some((l) => l.startsWith('+') || l.startsWith('-')) ? (
            diffLines.map((line, idx) => {
              const isAdd = line.startsWith('+') && !line.startsWith('+++');
              const isDel = line.startsWith('-') && !line.startsWith('---');
              const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');

              return (
                <div
                  key={idx}
                  className={`py-0.5 px-2 whitespace-pre rounded ${
                    isAdd
                      ? 'bg-emerald-950/50 text-emerald-300 font-semibold border-l-2 border-emerald-500'
                      : isDel
                      ? 'bg-rose-950/50 text-rose-300 font-semibold border-l-2 border-rose-500 line-through opacity-80'
                      : isHeader
                      ? 'text-cyanaccent-400 font-bold bg-medic-darker/60 my-1'
                      : 'text-slate-300'
                  }`}
                >
                  {line || ' '}
                </div>
              );
            })
          ) : (
            <div className="text-slate-400 space-y-2">
              <div className="text-emerald-400 font-semibold mb-1">Proposed Code:</div>
              <pre className="p-3 bg-medic-card rounded-lg text-slate-200 overflow-x-auto">
                {fix.proposed_code}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-medic-border p-4 font-mono text-xs max-h-96 overflow-y-auto">
          <div className="pr-3">
            <div className="text-[11px] font-sans font-semibold text-rose-400 uppercase tracking-wider mb-2">
              Original Code
            </div>
            <pre className="p-3 bg-rose-950/20 rounded-lg text-rose-200 whitespace-pre-wrap overflow-x-auto border border-rose-900/30">
              {fix.original_code || '// Original snippet not loaded'}
            </pre>
          </div>
          <div className="pl-3">
            <div className="text-[11px] font-sans font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              Proposed Replacement
            </div>
            <pre className="p-3 bg-emerald-950/20 rounded-lg text-emerald-200 whitespace-pre-wrap overflow-x-auto border border-emerald-900/30">
              {fix.proposed_code}
            </pre>
          </div>
        </div>
      )}

      {/* Analysis Details Panel */}
      <div className="p-4 bg-medic-darker/60 border-t border-medic-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="font-semibold text-slate-300 block mb-1">Explanation of Changes:</span>
          <p className="text-slate-400 leading-relaxed">{fix.explanation}</p>
        </div>

        <div>
          <span className="font-semibold text-slate-300 block mb-1">Potential Side Effects:</span>
          <ul className="list-disc list-inside text-slate-400 space-y-0.5">
            {fix.potential_side_effects.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <span className="font-semibold text-slate-300 block mb-1">Testing Recommendations:</span>
          <div className="flex flex-wrap gap-2">
            {fix.testing_recommendations.map((rec, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded bg-medic-dark border border-medic-border text-slate-300 font-mono text-[11px]"
              >
                {rec}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
