import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Star,
  GitFork,
  FileCode2,
  Cpu,
  Layers,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { RepositoryMetadata, FileMetadata, FileContentResponse } from '../types';
import { api } from '../services/api';
import { FileExplorer } from '../components/FileExplorer';
import { CodeViewer } from '../components/CodeViewer';

interface RepositoryOverviewProps {
  repo: RepositoryMetadata;
  onNavigateToTab: (tab: string) => void;
}

export const RepositoryOverview: React.FC<RepositoryOverviewProps> = ({
  repo,
  onNavigateToTab,
}) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // Load file list on mount
  useEffect(() => {
    let isMounted = true;
    const fetchFiles = async () => {
      setLoadingFiles(true);
      try {
        const res = await api.getRepositoryFiles(repo.id);
        if (isMounted) {
          setFiles(res.files);
          // Auto-select README.md or the first file if available
          const defaultFile = res.files.find((f) => f.path.toLowerCase() === 'readme.md') || res.files[0];
          if (defaultFile) {
            handleSelectFile(defaultFile.path);
          }
        }
      } catch (err: any) {
        console.error('Failed to load files:', err);
      } finally {
        if (isMounted) setLoadingFiles(false);
      }
    };

    fetchFiles();
    return () => {
      isMounted = false;
    };
  }, [repo.id]);

  const handleSelectFile = async (path: string) => {
    setSelectedPath(path);
    setLoadingContent(true);
    setContentError(null);
    try {
      const data = await api.getFileContent(repo.id, path);
      setFileContent(data);
    } catch (err: any) {
      setContentError(err.message || 'Failed to read file.');
      setFileContent(null);
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Top Metadata Header Card */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-electric-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-cyanaccent-400 font-semibold">{repo.owner} /</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">{repo.name}</h1>
              {repo.license && (
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-medic-dark text-slate-300 border border-medic-border font-mono">
                  {repo.license}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed mb-4">
              {repo.description || 'No description provided by repository.'}
            </p>

            {/* Badges / Stats Bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-medic-darkest border border-medic-border/70 text-slate-300">
                <GitBranch className="w-3.5 h-3.5 text-electric-400" />
                <span className="font-mono">{repo.default_branch}</span>
              </div>

              {repo.stars > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-medic-darkest border border-medic-border/70 text-amber-400">
                  <Star className="w-3.5 h-3.5" />
                  <span className="font-mono">{repo.stars.toLocaleString()}</span>
                </div>
              )}

              {repo.forks > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-medic-darkest border border-medic-border/70 text-slate-400">
                  <GitFork className="w-3.5 h-3.5" />
                  <span className="font-mono">{repo.forks.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-medic-darkest border border-medic-border/70 text-slate-300">
                <FileCode2 className="w-3.5 h-3.5 text-cyanaccent-400" />
                <span>
                  <strong className="text-white">{repo.files_indexed_count}</strong> indexed / {repo.total_files_discovered} total
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-medic-darkest border border-medic-border/70 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{Math.round(repo.total_size_bytes / 1024)} KB indexed</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={() => onNavigateToTab('ask')}
              className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-medium text-xs flex items-center gap-2 shadow-md shadow-electric-600/30 transition-colors"
            >
              <span>Ask Codebase</span>
            </button>
            <button
              onClick={() => onNavigateToTab('debug')}
              className="px-4 py-2 rounded-xl bg-medic-card hover:bg-medic-dark border border-medic-border text-slate-200 font-medium text-xs flex items-center gap-2 transition-colors"
            >
              <span>Bug Detective</span>
            </button>
            <button
              onClick={() => onNavigateToTab('contributor')}
              className="px-4 py-2 rounded-xl bg-medic-card hover:bg-medic-dark border border-medic-border text-slate-200 font-medium text-xs flex items-center gap-2 transition-colors"
            >
              <span>Contributor Guide</span>
            </button>
          </div>
        </div>

        {/* Structural Signals: Languages, Frameworks, Risks */}
        <div className="mt-6 pt-4 border-t border-medic-border/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Languages */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Primary Languages
            </span>
            <div className="flex flex-wrap gap-1.5">
              {repo.primary_languages.length > 0 ? (
                repo.primary_languages.map((lang, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-electric-500/10 border border-electric-500/20 text-electric-300 font-medium text-[11px]"
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">None detected</span>
              )}
            </div>
          </div>

          {/* Frameworks */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Detected Frameworks
            </span>
            <div className="flex flex-wrap gap-1.5">
              {repo.frameworks.length > 0 ? (
                repo.frameworks.map((fw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-cyanaccent-500/10 border border-cyanaccent-500/20 text-cyanaccent-300 font-medium text-[11px]"
                  >
                    {fw}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">Standard / Zero Frameworks</span>
              )}
            </div>
          </div>

          {/* Risk & Caution Areas */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Areas for Investigation
            </span>
            <div className="space-y-1">
              {repo.risk_areas.length > 0 ? (
                repo.risk_areas.map((risk, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-amber-300 text-[11px]">
                    <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{risk}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Standard repository structure</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Important Project Files */}
        {repo.important_files.length > 0 && (
          <div className="mt-4 pt-3 border-t border-medic-border/40 flex items-center gap-2 text-xs overflow-x-auto">
            <span className="text-slate-400 text-[11px] font-medium shrink-0">Important Files:</span>
            {repo.important_files.map((file) => (
              <button
                key={file}
                onClick={() => handleSelectFile(file)}
                className="px-2 py-0.5 rounded bg-medic-dark border border-medic-border hover:border-electric-500 text-slate-300 font-mono text-[10px] whitespace-nowrap transition-colors"
              >
                {file}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Workspace: File Explorer (Left) & Source Code Viewer (Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Searchable File Explorer */}
        <div className="md:col-span-4 h-full min-h-[300px]">
          {loadingFiles ? (
            <div className="h-full flex items-center justify-center bg-medic-darker rounded-xl border border-medic-border p-6 text-xs text-slate-500">
              Loading file index...
            </div>
          ) : (
            <FileExplorer
              files={files}
              selectedPath={selectedPath}
              onSelectFile={handleSelectFile}
            />
          )}
        </div>

        {/* Right Column: Source Code Viewer */}
        <div className="md:col-span-8 h-full min-h-[300px]">
          {loadingContent ? (
            <div className="h-full flex items-center justify-center bg-medic-darkest rounded-xl border border-medic-border p-6 text-xs text-slate-500">
              Loading source file content...
            </div>
          ) : contentError ? (
            <div className="h-full flex flex-col items-center justify-center bg-medic-darkest rounded-xl border border-medic-border p-6 text-xs text-rose-400">
              <AlertTriangle className="w-8 h-8 mb-2 text-rose-500" />
              <p>{contentError}</p>
            </div>
          ) : (
            <CodeViewer file={fileContent} />
          )}
        </div>
      </div>
    </div>
  );
};
