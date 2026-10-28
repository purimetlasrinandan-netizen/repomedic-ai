import React, { useState, useMemo } from 'react';
import { Search, FileCode, Folder, ChevronRight, Filter } from 'lucide-react';
import { FileMetadata } from '../types';

interface FileExplorerProps {
  files: FileMetadata[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedPath,
  onSelectFile,
}) => {
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  const languages = useMemo(() => {
    const set = new Set(files.map((f) => f.language));
    return ['all', ...Array.from(set).sort()];
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const matchesSearch = f.path.toLowerCase().includes(search.toLowerCase());
      const matchesLang = selectedLanguage === 'all' || f.language === selectedLanguage;
      return matchesSearch && matchesLang;
    });
  }, [files, search, selectedLanguage]);

  return (
    <div className="h-full flex flex-col bg-medic-darker rounded-xl border border-medic-border overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-medic-border space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search files (e.g. main.py, auth)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-medic-darkest border border-medic-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-electric-500 transition-colors"
          />
        </div>

        {languages.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <Filter className="w-3 h-3 text-slate-500 shrink-0" />
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-electric-600 text-white font-medium'
                    : 'bg-medic-dark text-slate-400 hover:text-slate-200 border border-medic-border/60'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto divide-y divide-medic-border/40">
        {filteredFiles.length === 0 ? (
          <div className="p-6 text-center text-xs text-medic-muted">
            No matching files found.
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = selectedPath === file.path;
            const parts = file.path.split('/');
            const filename = parts.pop();
            const dir = parts.join('/');

            return (
              <button
                key={file.path}
                onClick={() => onSelectFile(file.path)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                  isSelected
                    ? 'bg-electric-500/15 border-l-2 border-electric-400 text-white'
                    : 'hover:bg-medic-card/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-electric-400' : 'text-slate-500'}`} />
                  <div className="truncate">
                    <span className="font-mono text-slate-200">{filename}</span>
                    {dir && (
                      <span className="text-[10px] text-slate-500 font-mono ml-1.5 truncate">
                        {dir}/
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {file.lines_count}L
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-medic-darkest border border-medic-border/60 text-cyanaccent-400 font-medium">
                    {file.language}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Count */}
      <div className="px-3 py-2 bg-medic-darkest border-t border-medic-border text-[11px] text-medic-muted flex justify-between">
        <span>Showing {filteredFiles.length} files</span>
        <span>Total: {files.length}</span>
      </div>
    </div>
  );
};
