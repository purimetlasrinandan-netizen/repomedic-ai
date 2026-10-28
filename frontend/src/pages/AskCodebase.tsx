import React, { useState } from 'react';
import {
  Send,
  MessageSquareCode,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  FileText,
} from 'lucide-react';
import { RepositoryMetadata, AskQuestionResponse, CodeSnippet } from '../types';
import { api } from '../services/api';

interface AskCodebaseProps {
  repo: RepositoryMetadata;
  onOpenFileInViewer: (path: string) => void;
}

export const AskCodebase: React.FC<AskCodebaseProps> = ({
  repo,
  onOpenFileInViewer,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AskQuestionResponse[]>([]);

  const starterQuestions = [
    'Explain the architecture and main components of this repository.',
    'Where is authentication or credential verification implemented?',
    'Which files and functions handle API requests?',
    'Which files should a new contributor read first?',
    'Where should I implement a new feature or endpoint?',
  ];

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await api.askQuestion(repo.id, q);
      setHistory((prev) => [resp, ...prev]);
      if (!queryText) setQuestion('');
    } catch (err: any) {
      setError(err.message || 'Failed to query codebase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-electric-500/15 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <MessageSquareCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Ask Your Codebase</h1>
              <p className="text-xs text-medic-muted">
                Questions are answered using hybrid AST and keyword retrieval grounded strictly in indexed code.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-medic-darkest border border-medic-border text-slate-300">
            Target: {repo.name}
          </span>
        </div>

        {/* Question Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="mt-4 flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How does token expiration work, and which file implements it?"
              className="w-full bg-medic-darkest border border-medic-border rounded-xl pl-4 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-electric-500 transition-colors font-sans"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-6 py-3 rounded-xl bg-electric-600 hover:bg-electric-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 shadow-md shadow-electric-600/30 transition-all shrink-0"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                <span>Searching Code...</span>
              </>
            ) : (
              <>
                <span>Ask</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Suggestion Starter Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 text-[11px] font-medium mr-1">Suggested Questions:</span>
          {starterQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-medic-dark border border-medic-border/70 hover:border-electric-500/50 text-slate-300 hover:text-white transition-colors text-[11px] truncate max-w-xs"
              title={q}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Answers & Q&A Stream */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-medic-muted bg-medic-darker/40 rounded-2xl border border-medic-border/60">
            <MessageSquareCode className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="font-semibold text-sm text-slate-300 mb-1">No questions asked yet</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Ask anything about architecture, endpoints, data models, or specific functions. RepoMedic will locate the source files and answer with code citations.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <div
              key={idx}
              className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-medic-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-base text-slate-100">{item.question}</h3>
                </div>

                {/* Model Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-medic-darkest border border-medic-border text-cyanaccent-400">
                    {item.model_used || 'RepoMedic AI'}
                  </span>
                  {item.is_fallback && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      Deterministic Fallback
                    </span>
                  )}
                </div>
              </div>

              {/* Notice for fallback if applicable */}
              {item.is_fallback && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Ollama Inference Offline</p>
                    <p className="text-amber-400/90 leading-relaxed text-[11px]">
                      The answer below is directly extracted from indexed source code, AST symbols, and lexical matches. To enable natural-language open-weight synthesis, run <code className="bg-amber-900/50 px-1 py-0.5 rounded font-mono">ollama pull qwen2.5-coder:1.5b</code>.
                    </p>
                  </div>
                </div>
              )}

              {/* Main Answer Content */}
              <div className="text-xs text-slate-300 leading-relaxed space-y-3">
                <div className="whitespace-pre-wrap font-sans text-sm text-slate-200">
                  {item.answer}
                </div>
              </div>

              {/* Technical Details List */}
              {item.technical_details && item.technical_details.length > 0 && (
                <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border/60 text-xs space-y-1.5">
                  <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block">
                    Technical Evidence
                  </span>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {item.technical_details.map((detail, dIdx) => (
                      <li key={dIdx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clickable Referenced Files */}
              {item.referenced_files && item.referenced_files.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block mb-2">
                    Referenced Code Files (Click to View)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {item.referenced_files.map((file, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => onOpenFileInViewer(file)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medic-card hover:bg-medic-dark border border-medic-border text-cyanaccent-400 hover:text-cyanaccent-300 text-xs font-mono transition-colors"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{file}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Snippets Collapsible / Display */}
              {item.code_snippets && item.code_snippets.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block">
                    Retrieved Code Context ({item.code_snippets.length} snippets)
                  </span>
                  <div className="space-y-2">
                    {item.code_snippets.map((snip, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-xl bg-medic-darkest border border-medic-border overflow-hidden"
                      >
                        <div className="px-3 py-1.5 bg-medic-card/70 border-b border-medic-border/60 flex items-center justify-between text-xs font-mono">
                          <button
                            onClick={() => onOpenFileInViewer(snip.file_path)}
                            className="text-electric-400 hover:underline flex items-center gap-1"
                          >
                            <span>{snip.file_path}</span>
                            <span className="text-slate-500">
                              (L{snip.start_line}-{snip.end_line})
                            </span>
                          </button>
                          <span className="text-[10px] text-slate-500">
                            Relevance: {snip.relevance_score}
                          </span>
                        </div>
                        <pre className="p-3 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
                          {snip.code}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Next Steps */}
              {item.suggested_next_steps && item.suggested_next_steps.length > 0 && (
                <div className="pt-2 border-t border-medic-border/40">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Suggested Next Steps:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {item.suggested_next_steps.map((step, stIdx) => (
                      <div
                        key={stIdx}
                        className="flex items-center gap-1.5 text-xs text-slate-300 bg-medic-dark px-2.5 py-1 rounded border border-medic-border/60"
                      >
                        <ArrowRight className="w-3 h-3 text-cyanaccent-400" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
