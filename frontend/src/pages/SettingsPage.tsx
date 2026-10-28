import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Server,
  Activity,
  ShieldCheck,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { SettingsResponse } from '../types';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingOllama, setTestingOllama] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestOllama = async () => {
    setTestingOllama(true);
    try {
      await api.testOllama();
      await fetchSettings();
    } catch (err) {
      console.error('Ollama test error:', err);
    } finally {
      setTestingOllama(false);
    }
  };

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  if (loading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-medic-muted text-xs">
        <span className="w-6 h-6 rounded-full border-2 border-electric-500 border-t-transparent animate-spin mb-3"></span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Header Banner */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric-500/15 border border-electric-500/30 flex items-center justify-center text-electric-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">System & Model Configuration</h1>
            <p className="text-xs text-medic-muted">
              Backend runtime diagnostics, local Ollama connectivity, and repository safety limits.
            </p>
          </div>
        </div>

        <button
          onClick={handleTestOllama}
          disabled={testingOllama}
          className="px-4 py-2 rounded-xl bg-medic-card hover:bg-medic-dark border border-medic-border text-xs text-slate-200 font-medium flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyanaccent-400 ${testingOllama ? 'animate-spin' : ''}`} />
          <span>{testingOllama ? 'Probing Ollama...' : 'Test Connectivity'}</span>
        </button>
      </div>

      {/* Connectivity & Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Runtime Card */}
        <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-medic-border/60">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-slate-100">FastAPI Backend Service</h3>
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Healthy
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-medic-border/40">
              <span className="text-slate-400">Version:</span>
              <span className="font-mono text-slate-200">{settings.version}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-medic-border/40">
              <span className="text-slate-400">Database Engine:</span>
              <span className="font-mono text-slate-200">SQLite + aiosqlite (Async)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-medic-border/40">
              <span className="text-slate-400">GitHub Token:</span>
              <span className="font-mono text-slate-200">
                {settings.github_token_configured ? 'Configured (5,000 req/hr)' : 'Unauthenticated (60 req/hr)'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Retrieval Engine:</span>
              <span className="font-mono text-cyanaccent-400">Python AST + Multi-Language Regex</span>
            </div>
          </div>
        </div>

        {/* Ollama Open-Weight AI Model Card */}
        <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-medic-border/60">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyanaccent-400" />
              <h3 className="font-semibold text-sm text-slate-100">Ollama Local Inference</h3>
            </div>
            {settings.ollama_connected ? (
              settings.model_available ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Model Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Model Not Pulled
                </span>
              )
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Server Offline
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-medic-border/40">
              <span className="text-slate-400">Ollama Base URL:</span>
              <span className="font-mono text-slate-200">{settings.ollama_base_url}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-medic-border/40">
              <span className="text-slate-400">Configured Model:</span>
              <span className="font-mono text-electric-400 font-semibold">{settings.configured_model}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-medic-border/40">
              <span className="text-slate-400">Available Pulled Models:</span>
              <span className="font-mono text-slate-200">
                {settings.available_models.length > 0 ? settings.available_models.join(', ') : 'None pulled yet'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Fallback Mechanism:</span>
              <span className="text-slate-300">Deterministic grounded code extraction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety & Resource Limits Card */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-slate-100">Repository Analysis Safety Limits</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          To prevent denial-of-service, excessive memory consumption, or remote file abuse, RepoMedic enforces configurable safety boundaries on all public repositories:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Repo Files</span>
            <span className="text-lg font-bold text-slate-200">{settings.max_repository_files} files</span>
          </div>
          <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max File Size</span>
            <span className="text-lg font-bold text-slate-200">{settings.max_file_size_kb} KB</span>
          </div>
          <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Total Content</span>
            <span className="text-lg font-bold text-slate-200">{settings.max_total_content_mb} MB</span>
          </div>
        </div>
      </div>

      {/* Ollama Setup Instructions Guide */}
      <div className="bg-medic-darker rounded-2xl border border-medic-border p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyanaccent-400" />
          <h3 className="font-semibold text-sm text-slate-100">Local AI Setup Instructions (Ollama)</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          RepoMedic AI uses local, privacy-first open-weight models via Ollama. Follow these simple steps to enable generative AI inference on your machine:
        </p>

        <div className="space-y-3 text-xs">
          {/* Step 1 */}
          <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              1
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-200 mb-1">Install Ollama</p>
              <p className="text-slate-400 text-[11px] mb-2">
                Download and install Ollama from the official website (macOS, Windows, or Linux).
              </p>
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-cyanaccent-400 hover:underline font-mono"
              >
                <span>https://ollama.com/download</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              2
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-200 mb-1">Pull the Recommended Coding Model</p>
              <p className="text-slate-400 text-[11px] mb-2">
                We recommend <strong className="text-slate-200">Qwen2.5-Coder (1.5B)</strong> for fast, lightweight local execution on consumer hardware:
              </p>
              <div className="flex items-center justify-between p-2 rounded-lg bg-medic-card border border-medic-border font-mono text-[11px] text-cyanaccent-300">
                <span>ollama pull qwen2.5-coder:1.5b</span>
                <button
                  onClick={() => handleCopy('ollama pull qwen2.5-coder:1.5b')}
                  className="p-1 rounded hover:bg-medic-dark text-slate-400 hover:text-white"
                >
                  {copiedCmd === 'ollama pull qwen2.5-coder:1.5b' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-medic-darkest rounded-xl border border-medic-border flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-electric-500/20 text-electric-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              3
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-200 mb-1">Optional: Customize Model in .env</p>
              <p className="text-slate-400 text-[11px]">
                You can configure any Ollama model (e.g. <code className="text-electric-300 font-mono">qwen2.5-coder:7b</code>, <code className="text-electric-300 font-mono">deepseek-coder:6.7b</code>, or <code className="text-electric-300 font-mono">llama3:8b</code>) by setting <code className="text-electric-300 font-mono">OLLAMA_MODEL=...</code> in your <code className="text-slate-300 font-mono">backend/.env</code> file.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
