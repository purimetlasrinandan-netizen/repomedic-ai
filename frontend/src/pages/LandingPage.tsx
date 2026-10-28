import React, { useState } from 'react';
import {
  Stethoscope,
  ArrowRight,
  Code2,
  Bug,
  BookOpen,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Search,
  CheckCircle2,
  FileCheck2,
  Database,
  Cpu,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { RepositoryMetadata } from '../types';

interface LandingPageProps {
  onStartAnalysis: (url: string) => void;
  onLoadSample: () => void;
  onSelectRepo: (repo: RepositoryMetadata) => void;
  onExploreFeatures: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartAnalysis,
  onLoadSample,
  onExploreFeatures,
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError('Please enter a public GitHub repository URL.');
      return;
    }
    if (!url.includes('github.com')) {
      setError('Only public GitHub repositories (https://github.com/owner/repository) are supported.');
      return;
    }
    onStartAnalysis(url.trim());
  };

  const handleQuickDemo = async () => {
    setLoadingSample(true);
    setError(null);
    try {
      await onLoadSample();
    } catch (err: any) {
      setError(err.message || 'Failed to load sample repository.');
    } finally {
      setLoadingSample(false);
    }
  };

  const features = [
    {
      icon: Code2,
      title: 'Repository Intelligence',
      description: 'AST-powered structure parsing, language identification, and automatic framework signature detection.',
      color: 'from-blue-500/20 to-indigo-500/20 text-indigo-400',
    },
    {
      icon: Search,
      title: 'Ask Your Codebase',
      description: 'Hybrid retrieval RAG answering queries strictly grounded in retrieved source code evidence.',
      color: 'from-electric-500/20 to-cyanaccent-500/20 text-electric-400',
    },
    {
      icon: Bug,
      title: 'AI Bug Detective',
      description: 'Parses stack traces, pinpoints offending lines, and identifies root causes with reproducible verification steps.',
      color: 'from-rose-500/20 to-amber-500/20 text-rose-400',
    },
    {
      icon: FileCheck2,
      title: 'Context-Aware Fix Suggestions',
      description: 'Inspect unified diffs, review potential side effects, and download patches without altering your original files.',
      color: 'from-emerald-500/20 to-cyanaccent-500/20 text-emerald-400',
    },
    {
      icon: BookOpen,
      title: 'Contributor Onboarding',
      description: 'Instant architecture summaries, entry-point file maps, API route lists, and build commands for newcomers.',
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400',
    },
    {
      icon: ShieldCheck,
      title: 'Evidence-Based Answers',
      description: 'Zero hallucinations: every answer cites actual files and line numbers with strict prompt injection defense.',
      color: 'from-cyanaccent-500/20 to-blue-500/20 text-cyanaccent-400',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Connect Repository',
      description: 'Paste any public GitHub repository URL or load our built-in sample.',
    },
    {
      step: '02',
      title: 'Safe AST Indexing',
      description: 'RepoMedic parses AST symbols, frameworks, and chunks code safely under size limits.',
    },
    {
      step: '03',
      title: 'Ask or Submit Bug',
      description: 'Pose natural language questions or paste error logs and stack traces.',
    },
    {
      step: '04',
      title: 'Grounded Diagnosis',
      description: 'Receive evidence-backed explanations, line citations, and patch proposals.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Section */}
      <section className="relative px-6 py-16 md:py-24 max-w-5xl mx-auto text-center">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-xs font-medium mb-6">
          <Stethoscope className="w-3.5 h-3.5" />
          <span>RepoMedic AI — Open-Source Code Doctor</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 leading-tight">
          Your Codebase. <span className="bg-gradient-to-r from-electric-400 via-indigo-300 to-cyanaccent-400 bg-clip-text text-transparent">Understood.</span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Analyze repositories, investigate bugs, and navigate unfamiliar codebases with an AI assistant grounded in your source code.
        </p>

        {/* Repository Input Form */}
        <div className="max-w-2xl mx-auto mb-6">
          <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row items-center gap-2 bg-medic-darker p-2 rounded-2xl border border-medic-border shadow-2xl focus-within:border-electric-500/80 transition-all">
            <div className="relative flex-1 w-full flex items-center pl-3">
              <Search className="w-5 h-5 text-slate-500 shrink-0 mr-2" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-electric-600/30 shrink-0"
            >
              <span>Analyze a Repository</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {error && (
            <p className="text-rose-400 text-xs mt-2 font-medium text-left px-2">
              {error}
            </p>
          )}
        </div>

        {/* Quick Demo Options */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span>Instant exploration:</span>
          <button
            onClick={handleQuickDemo}
            disabled={loadingSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-medic-card hover:bg-medic-dark border border-medic-border text-cyanaccent-400 font-medium transition-colors hover:border-cyanaccent-500/40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loadingSample ? 'Loading Demo Fixture...' : 'Load Sample Project (medic-auth)'}</span>
          </button>
          <button
            onClick={() => onStartAnalysis('https://github.com/pallets/flask')}
            className="px-2.5 py-1.5 rounded-lg bg-medic-darkest border border-medic-border/60 hover:border-slate-600 text-slate-300 font-mono transition-colors"
          >
            pallets/flask
          </button>
          <button
            onClick={() => onStartAnalysis('https://github.com/expressjs/express')}
            className="px-2.5 py-1.5 rounded-lg bg-medic-darkest border border-medic-border/60 hover:border-slate-600 text-slate-300 font-mono transition-colors"
          >
            expressjs/express
          </button>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="px-6 py-12 max-w-6xl mx-auto border-t border-medic-border/50">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Designed for Unfamiliar Codebases</h2>
          <p className="text-sm text-medic-muted">Every capability is built around real source code retrieval, not generative guessing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-medic-darker border border-medic-border hover:border-medic-border/90 hover:bg-medic-card/40 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base text-slate-100 mb-2">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Workflow */}
      <section className="px-6 py-14 max-w-5xl mx-auto border-t border-medic-border/50">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyanaccent-400">Workflow</span>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">How RepoMedic AI Operates</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-medic-darkest border border-medic-border/70 relative">
              <span className="font-mono text-2xl font-black text-electric-500/40 block mb-2">{st.step}</span>
              <h4 className="font-semibold text-sm text-slate-200 mb-1.5">{st.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{st.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-medic-border/60 bg-medic-darkest text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-electric-400" />
            <span className="font-semibold text-slate-300">RepoMedic AI</span>
            <span>— Open-Source Code Doctor</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="hover:text-slate-400 transition-colors cursor-pointer" onClick={onExploreFeatures}>
              Documentation
            </span>
            <span className="text-slate-600">|</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-400 transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-6 pt-4 border-t border-medic-border/30 text-[11px] text-slate-500">
          <strong>Notice:</strong> RepoMedic AI generates analyses and fix proposals based on retrieved repository content. AI-generated suggestions require developer verification before application.
        </div>
      </footer>
    </div>
  );
};
