import React from 'react';
import {
  Stethoscope,
  PlusCircle,
  LayoutDashboard,
  MessageSquareCode,
  Bug,
  BookOpenCheck,
  History,
  Settings as SettingsIcon,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { RepositoryMetadata } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeRepo: RepositoryMetadata | null;
  onNewAnalysis: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeRepo,
  onNewAnalysis,
}) => {
  const navItems = [
    { id: 'overview', label: 'Repository Overview', icon: LayoutDashboard, requiresRepo: true },
    { id: 'ask', label: 'Ask Your Codebase', icon: MessageSquareCode, requiresRepo: true },
    { id: 'debug', label: 'Bug Detective', icon: Bug, requiresRepo: true },
    { id: 'contributor', label: 'Contributor Guide', icon: BookOpenCheck, requiresRepo: true },
    { id: 'history', label: 'Analysis History', icon: History, requiresRepo: false },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, requiresRepo: false },
  ];

  return (
    <aside className="w-64 bg-medic-darker border-r border-medic-border flex flex-col h-screen select-none">
      {/* Brand Logo & Name */}
      <div className="p-4 border-b border-medic-border flex items-center justify-between">
        <div
          onClick={() => setCurrentTab('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500 via-indigo-600 to-cyanaccent-500 flex items-center justify-center shadow-lg shadow-electric-500/20 group-hover:scale-105 transition-transform duration-200">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-base">RepoMedic</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-electric-500/20 text-electric-400 border border-electric-500/30">AI</span>
            </div>
            <p className="text-[11px] text-medic-muted font-medium">Codebase Doctor</p>
          </div>
        </div>
      </div>

      {/* Primary CTA: New Analysis */}
      <div className="p-3">
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-medium text-sm transition-all duration-150 shadow-md shadow-electric-600/30 active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Active Repository Card */}
      {activeRepo && (
        <div className="px-3 pb-3">
          <div className="p-2.5 rounded-lg bg-medic-card border border-medic-border/70 text-xs">
            <div className="flex items-center justify-between text-medic-muted mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyanaccent-400">Active Target</span>
              <span className="flex items-center gap-1 text-[11px]">
                <GitBranch className="w-3 h-3 text-electric-400" />
                {activeRepo.default_branch}
              </span>
            </div>
            <div className="font-semibold text-slate-100 truncate" title={`${activeRepo.owner}/${activeRepo.name}`}>
              {activeRepo.owner}/{activeRepo.name}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-medic-muted border-t border-medic-border/40 pt-1.5">
              <span>{activeRepo.files_indexed_count} files</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Indexed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-2 py-1.5 text-[11px] font-medium text-medic-muted uppercase tracking-wider">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isDisabled = item.requiresRepo && !activeRepo;

          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-electric-500/15 text-electric-400 border border-electric-500/30'
                  : isDisabled
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : 'text-slate-300 hover:text-white hover:bg-medic-dark'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-electric-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-electric-400" />}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-medic-border bg-medic-darkest/50">
        <div className="flex items-center justify-between text-[11px] text-medic-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyanaccent-400" />
            <span>Open-Weight RAG</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
