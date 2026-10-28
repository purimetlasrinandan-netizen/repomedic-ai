import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  GitBranch,
  Calendar,
  FileCode,
  ArrowRight,
  Database,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { api } from '../services/api';

interface HistoryPageProps {
  onSelectRepoById: (repoId: string) => void;
  onNewAnalysis: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onSelectRepoById,
  onNewAnalysis,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (repoId: string) => {
    try {
      await api.deleteHistory(repoId);
      setHistory((prev) => prev.filter((item) => item.repository_id !== repoId));
      setActionSuccess('Repository removed from history.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete history item.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all analysis history? This will delete local SQLite indexes.')) {
      return;
    }
    try {
      await api.clearHistory();
      setHistory([]);
      setActionSuccess('All history cleared.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clear history.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Header Banner */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric-500/15 border border-electric-500/30 flex items-center justify-center text-electric-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Analysis History</h1>
            <p className="text-xs text-medic-muted">
              Locally persisted SQLite records of previously analyzed repositories.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/60 text-xs text-rose-300 font-medium transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
          <button
            onClick={onNewAnalysis}
            className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-medium text-xs flex items-center gap-2 shadow-md shadow-electric-600/30 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* History Items List */}
      <div className="flex-1 space-y-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-medic-muted">
            <span className="w-6 h-6 rounded-full border-2 border-electric-500 border-t-transparent animate-spin mb-3"></span>
            <p className="text-xs">Loading saved analyses...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center p-8 text-center text-medic-muted bg-medic-darker/40 rounded-2xl border border-medic-border/60">
            <Database className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No repositories analyzed yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Analyzed repositories are saved to your local SQLite database for quick reopening.
            </p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-medic-darker border border-medic-border hover:border-medic-border/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyanaccent-400">{item.owner} /</span>
                  <h3 className="font-bold text-base text-white">{item.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1 max-w-2xl">
                  {item.description || 'Public GitHub repository'}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-medic-muted pt-1">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    {item.files_count} files indexed
                  </span>

                  {item.analyzed_at && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(item.analyzed_at).toLocaleDateString()} {new Date(item.analyzed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}

                  {item.primary_languages.length > 0 && (
                    <div className="flex items-center gap-1">
                      {item.primary_languages.slice(0, 3).map((lang, lIdx) => (
                        <span key={lIdx} className="px-1.5 py-0.2 rounded bg-medic-dark text-[10px] text-slate-300 border border-medic-border">
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-medic-border/40">
                <button
                  onClick={() => onSelectRepoById(item.repository_id)}
                  className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-electric-600/30 transition-colors"
                >
                  <span>Reopen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.repository_id)}
                  className="p-2 rounded-xl bg-medic-darkest hover:bg-rose-950/40 border border-medic-border text-slate-400 hover:text-rose-400 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Local Storage Privacy Information */}
      <div className="p-4 bg-medic-darkest rounded-2xl border border-medic-border/60 text-xs text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyanaccent-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-slate-200">Local SQLite Storage Policy</h4>
          <p className="leading-relaxed text-[11px]">
            RepoMedic AI stores repository metadata, AST symbol maps, and indexed code in your local SQLite database (`repomedic.db`). No access tokens, private credentials, or telemetry are ever sent to external cloud databases. You can clear or delete any entry at any time using the trash buttons above.
          </p>
        </div>
      </div>
    </div>
  );
};
