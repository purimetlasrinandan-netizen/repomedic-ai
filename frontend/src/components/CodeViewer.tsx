import React, { useState } from 'react';
import { Copy, Check, FileCode, AlertCircle, Download } from 'lucide-react';
import { FileContentResponse } from '../types';

interface CodeViewerProps {
  file: FileContentResponse | null;
  highlightLine?: number;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ file, highlightLine }) => {
  const [copied, setCopied] = useState(false);

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-medic-muted bg-medic-darker/50 rounded-xl border border-medic-border/60">
        <FileCode className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-400">Select a file from the explorer to view its contents</p>
        <p className="text-xs text-slate-500 mt-1">Source code is safely indexed with directory traversal defense</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'source_file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = file.content.split('\n');

  return (
    <div className="h-full flex flex-col bg-medic-darkest rounded-xl border border-medic-border overflow-hidden">
      {/* File Header Bar */}
      <div className="px-4 py-2.5 bg-medic-darker border-b border-medic-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs truncate">
          <FileCode className="w-4 h-4 text-electric-400 shrink-0" />
          <span className="font-mono font-medium text-slate-200 truncate">{file.path}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-medic-dark text-cyanaccent-400 border border-medic-border font-medium">
            {file.language}
          </span>
          <span className="text-[11px] text-medic-muted">
            {file.total_lines} lines ({Math.round(file.size / 1024)} KB)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-medic-card hover:bg-medic-dark border border-medic-border text-xs text-slate-300 hover:text-white transition-colors"
            title="Copy source code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-1 rounded bg-medic-card hover:bg-medic-dark border border-medic-border text-slate-300 hover:text-white transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Truncation Notice */}
      {file.is_truncated && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Large file truncated: displaying first {file.lines_count} of {file.total_lines} lines for performance.</span>
        </div>
      )}

      {/* Code Editor Body */}
      <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed">
        <div className="min-w-full inline-block">
          {lines.map((line, idx) => {
            const lineNum = idx + 1;
            const isHighlighted = highlightLine === lineNum;
            return (
              <div
                key={idx}
                className={`flex hover:bg-medic-card/50 ${
                  isHighlighted ? 'bg-electric-500/20 border-l-2 border-electric-400' : ''
                }`}
              >
                <div className="w-12 py-0.5 text-right pr-4 text-slate-600 select-none bg-medic-darkest/70 border-r border-medic-border/40 shrink-0">
                  {lineNum}
                </div>
                <div className="pl-4 pr-6 py-0.5 whitespace-pre text-slate-200 select-text overflow-x-visible">
                  {line || ' '}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
