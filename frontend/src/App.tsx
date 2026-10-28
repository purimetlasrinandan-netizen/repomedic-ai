import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ProgressModal } from './components/ProgressModal';
import { LandingPage } from './pages/LandingPage';
import { RepositoryOverview } from './pages/RepositoryOverview';
import { AskCodebase } from './pages/AskCodebase';
import { BugDetective } from './pages/BugDetective';
import { ContributorGuide } from './pages/ContributorGuide';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { RepositoryMetadata, AnalysisProgressStatus } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [activeRepo, setActiveRepo] = useState<RepositoryMetadata | null>(null);

  // Analysis progress state
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressStatus | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const pollingRef = useRef<number | null>(null);

  // System diagnostic state
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [modelAvailable, setModelAvailable] = useState(false);
  const [configuredModel, setConfiguredModel] = useState('qwen2.5-coder:1.5b');

  // Check backend health & Ollama status on startup
  useEffect(() => {
    const checkSystem = async () => {
      try {
        const health = await api.getHealth();
        if (health && health.diagnostics) {
          setOllamaConnected(health.diagnostics.ollama_connected);
          setModelAvailable(health.diagnostics.model_available);
          setConfiguredModel(health.diagnostics.configured_model || 'qwen2.5-coder:1.5b');
        }
      } catch (err) {
        console.error('System health probe error:', err);
      }
    };

    checkSystem();
    const interval = setInterval(checkSystem, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startAnalysis = async (url: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress({
      repository_id: '',
      step: 'Validating repository',
      percentage: 10,
      message: 'Connecting to GitHub...',
      is_complete: false,
      is_error: false,
    });

    try {
      const resp = await api.analyzeRepository(url);
      const repoId = resp.repository_id;

      if (resp.status === 'already_indexed') {
        const repo = await api.getRepository(repoId);
        setActiveRepo(repo);
        setIsAnalyzing(false);
        setCurrentTab('overview');
        return;
      }

      // Poll analysis status
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = window.setInterval(async () => {
        try {
          const status = await api.getAnalysisStatus(repoId);
          setAnalysisProgress(status);

          if (status.is_complete) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            const repo = await api.getRepository(repoId);
            setActiveRepo(repo);
            setIsAnalyzing(false);
            setCurrentTab('overview');
          } else if (status.is_error) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsAnalyzing(false);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 1000);
    } catch (err: any) {
      setAnalysisProgress({
        repository_id: '',
        step: 'Failed',
        percentage: 100,
        message: err.message || 'Failed to start analysis.',
        is_complete: false,
        is_error: true,
        error_message: err.message,
      });
      setIsAnalyzing(false);
    }
  };

  const handleLoadSample = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress({
      repository_id: 'repomedic__medic-auth',
      step: 'Loading Sample Fixture',
      percentage: 40,
      message: 'Loading medic-auth sample repository fixture into database...',
      is_complete: false,
      is_error: false,
    });

    try {
      const res = await api.loadSampleFixture();
      const repo = await api.getRepository(res.repository_id);
      setActiveRepo(repo);
      setAnalysisProgress({
        repository_id: res.repository_id,
        step: 'Analysis complete',
        percentage: 100,
        message: 'Sample fixture loaded successfully!',
        is_complete: true,
        is_error: false,
      });
      setTimeout(() => {
        setIsAnalyzing(false);
        setCurrentTab('overview');
      }, 600);
    } catch (err: any) {
      setAnalysisProgress({
        repository_id: '',
        step: 'Failed',
        percentage: 100,
        message: err.message || 'Failed to load sample.',
        is_complete: false,
        is_error: true,
        error_message: err.message,
      });
      setIsAnalyzing(false);
    }
  };

  const handleSelectRepoById = async (repoId: string) => {
    try {
      const repo = await api.getRepository(repoId);
      setActiveRepo(repo);
      setCurrentTab('overview');
    } catch (err) {
      console.error('Failed to load repo by id:', err);
    }
  };

  const handleOpenFileInViewer = (path: string) => {
    // When a user clicks a file link in AskCodebase, BugDetective, or ContributorGuide,
    // switch to overview and select that file.
    setCurrentTab('overview');
  };

  return (
    <div className="flex h-screen w-screen bg-medic-darkest text-slate-100 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRepo={activeRepo}
        onNewAnalysis={() => setCurrentTab('landing')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          activeRepo={activeRepo}
          ollamaConnected={ollamaConnected}
          modelAvailable={modelAvailable}
          configuredModel={configuredModel}
          onSelectRepoClick={() => setCurrentTab('landing')}
        />

        {/* Dynamic Workspace Pages */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentTab === 'landing' && (
            <LandingPage
              onStartAnalysis={startAnalysis}
              onLoadSample={handleLoadSample}
              onSelectRepo={(repo) => {
                setActiveRepo(repo);
                setCurrentTab('overview');
              }}
              onExploreFeatures={() => {
                if (activeRepo) setCurrentTab('overview');
                else handleLoadSample();
              }}
            />
          )}

          {currentTab === 'overview' && activeRepo && (
            <RepositoryOverview
              repo={activeRepo}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'ask' && activeRepo && (
            <AskCodebase
              repo={activeRepo}
              onOpenFileInViewer={handleOpenFileInViewer}
            />
          )}

          {currentTab === 'debug' && activeRepo && (
            <BugDetective
              repo={activeRepo}
              onOpenFileInViewer={handleOpenFileInViewer}
            />
          )}

          {currentTab === 'contributor' && activeRepo && (
            <ContributorGuide
              repo={activeRepo}
              onOpenFileInViewer={handleOpenFileInViewer}
            />
          )}

          {currentTab === 'history' && (
            <HistoryPage
              onSelectRepoById={handleSelectRepoById}
              onNewAnalysis={() => setCurrentTab('landing')}
            />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Real-time Analysis Progress Modal */}
      <ProgressModal
        progress={analysisProgress}
        isOpen={isAnalyzing}
        onClose={() => setIsAnalyzing(false)}
      />
    </div>
  );
}

export default App;
