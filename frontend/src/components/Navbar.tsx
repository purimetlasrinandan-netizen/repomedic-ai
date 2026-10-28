import {
  Cpu,
  Activity,
  Layers,
  GitBranch,
} from 'lucide-react';
import { RepositoryMetadata } from '../types';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface NavbarProps {
  activeRepo: RepositoryMetadata | null;
  ollamaConnected: boolean;
  modelAvailable: boolean;
  configuredModel: string;
  onSelectRepoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRepo,
  ollamaConnected,
  modelAvailable,
  configuredModel,
  onSelectRepoClick,
}) => {
  return (
    <header className="h-14 border-b border-medic-border bg-medic-darker/80 backdrop-blur px-6 flex items-center justify-between z-10">
      {/* Left: Active Repo breadcrumb or quick search trigger */}
      <div className="flex items-center gap-3">
        {activeRepo ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-medic-muted font-medium">Repository:</span>
            <button
              onClick={onSelectRepoClick}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-medic-card border border-medic-border hover:border-electric-500/50 text-xs font-semibold text-slate-200 transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeRepo.owner}/{activeRepo.name}</span>
            </button>
            <span className="text-xs text-slate-500 font-mono">({activeRepo.primary_languages.slice(0, 2).join(', ') || 'Codebase'})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-medic-muted">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>No repository selected</span>
            <button
              onClick={onSelectRepoClick}
              className="text-xs text-electric-400 hover:text-electric-300 font-medium underline underline-offset-2 ml-1"
            >
              Analyze a repository
            </button>
          </div>
        )}
      </div>

      {/* Right: AI & System Status Badges */}
      <div className="flex items-center gap-3">
        {/* Ollama Status Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-medic-darkest border border-medic-border text-xs">
          <Cpu className="w-3.5 h-3.5 text-cyanaccent-400" />
          <span className="text-slate-400 font-mono text-[11px]">{configuredModel}</span>
          {ollamaConnected ? (
            modelAvailable ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium" title="Model not pulled. Run: ollama pull qwen2.5-coder:1.5b">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Model Unpulled
              </span>
            )
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium" title="Ollama not detected on localhost:11434. Running in deterministic code-analysis mode.">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              Offline
            </span>
          )}
        </div>

        {/* Backend Heartbeat */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-medic-darkest border border-medic-border/60 text-[11px] text-slate-400">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>API 200 OK</span>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-medic-dark transition-colors"
          title="GitHub"
        >
          <GithubIcon className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
};
