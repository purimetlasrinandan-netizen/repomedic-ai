import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  FolderTree,
  Terminal,
  FileCode,
  Compass,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Layers,
  Settings as ConfigIcon,
  CheckCircle2,
} from 'lucide-react';
import { RepositoryMetadata, ContributorGuideResponse } from '../types';
import { api } from '../services/api';

interface ContributorGuideProps {
  repo: RepositoryMetadata;
  onOpenFileInViewer: (path: string) => void;
}

export const ContributorGuide: React.FC<ContributorGuideProps> = ({
  repo,
  onOpenFileInViewer,
}) => {
  const [guide, setGuide] = useState<ContributorGuideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchGuide = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getContributorGuide(repo.id);
        if (isMounted) setGuide(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to generate contributor guide.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGuide();
    return () => {
      isMounted = false;
    };
  }, [repo.id]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-medic-muted">
        <span className="w-8 h-8 rounded-full border-2 border-electric-500 border-t-transparent animate-spin mb-4"></span>
        <h3 className="font-semibold text-sm text-slate-200">Generating Contributor Guide...</h3>
        <p className="text-xs text-slate-500 mt-1">Analyzing README, routing blueprints, entry points, and directory map.</p>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-rose-400">
        <p className="font-semibold text-sm mb-2">{error || 'Could not load contributor guide.'}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Header Banner */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Contributor Assistant</h1>
            <p className="text-xs text-medic-muted">
              Orientation roadmap, entry points, build instructions, and onboarding guidance.
            </p>
          </div>
        </div>

        {/* Project Purpose & Architecture */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-medic-darkest rounded-xl border border-medic-border">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Project Purpose
            </span>
            <p className="text-slate-300 leading-relaxed">{guide.project_purpose}</p>
          </div>

          <div className="p-4 bg-medic-darkest rounded-xl border border-medic-border">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              High-Level Architecture
            </span>
            <p className="text-slate-300 leading-relaxed">{guide.high_level_architecture}</p>
          </div>
        </div>
      </div>

      {/* Beginner Start Files Card */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
          <Compass className="w-4 h-4 text-cyanaccent-400" />
          <span>Recommended Starting Files for New Contributors</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Read these key entry-points and configuration files first to understand the control flow:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {guide.beginner_start_files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => onOpenFileInViewer(file)}
              className="p-3 rounded-xl bg-medic-darkest hover:bg-medic-card border border-medic-border text-left flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <FileCode className="w-4 h-4 text-electric-400 shrink-0" />
                <span className="font-mono text-xs text-slate-200 group-hover:text-cyanaccent-400 transition-colors truncate">
                  {file}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Build and Test Instructions */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Build, Run & Test Commands</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Extracted directly from repository documentation and setup manifests:
        </p>

        <div className="space-y-2">
          {guide.build_and_run_instructions.map((cmd, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-medic-darkest border border-medic-border font-mono text-xs text-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-slate-600 select-none">$</span>
                <span className="text-emerald-300">{cmd}</span>
              </div>
              <button
                onClick={() => handleCopy(cmd, idx)}
                className="ml-3 p-1.5 rounded-lg bg-medic-dark hover:bg-medic-card text-slate-400 hover:text-white transition-colors shrink-0"
                title="Copy command"
              >
                {copiedIndex === idx ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* "Where Should I Start?" Interactive Questions */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-electric-400" />
          <span>Frequently Asked Contributor Questions</span>
        </h3>

        <div className="space-y-2">
          {guide.common_contributions.map((item, idx) => {
            const isExpanded = expandedQuestion === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-medic-darkest border border-medic-border overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white"
                >
                  <span>{item.question}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-electric-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-medic-border/40 text-xs text-slate-300 space-y-3">
                    <p className="leading-relaxed">{item.answer}</p>
                    {item.relevant_files.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-500">Related files:</span>
                        {item.relevant_files.map((file, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => onOpenFileInViewer(file)}
                            className="px-2 py-0.5 rounded bg-medic-card hover:bg-medic-dark border border-medic-border text-cyanaccent-400 font-mono text-[10px] transition-colors"
                          >
                            {file}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Directory Map & API Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Directory Map */}
        <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-cyanaccent-400" />
            <span>Important Directories</span>
          </h3>

          <div className="space-y-2">
            {guide.important_directories.map((dir, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-medic-darkest border border-medic-border text-xs">
                <div className="flex items-center gap-1.5 font-mono text-cyanaccent-400 font-semibold mb-1">
                  <span>{dir.path}/</span>
                </div>
                <p className="text-slate-400 text-[11px] mb-2">{dir.purpose}</p>
                {dir.key_files.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dir.key_files.map((kf, kIdx) => (
                      <span
                        key={kIdx}
                        className="px-1.5 py-0.5 rounded bg-medic-dark text-slate-400 font-mono text-[10px]"
                      >
                        {kf}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* API Routes & Configs */}
        <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-electric-400" />
            <span>Discovered API Endpoints & Configs</span>
          </h3>

          <div className="space-y-2">
            {guide.api_routes.length > 0 ? (
              guide.api_routes.map((rt, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-medic-darkest border border-medic-border text-xs font-mono text-slate-300"
                >
                  {rt}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 p-3 bg-medic-darkest rounded-xl border border-medic-border">
                No explicitly decorated HTTP routes detected in top files.
              </p>
            )}
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">Project Configurations:</span>
            <div className="flex flex-wrap gap-1.5">
              {guide.configuration_files.map((cfg, idx) => (
                <button
                  key={idx}
                  onClick={() => onOpenFileInViewer(cfg)}
                  className="px-2.5 py-1 rounded-lg bg-medic-darkest hover:bg-medic-dark border border-medic-border text-slate-300 font-mono text-xs transition-colors"
                >
                  {cfg}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
