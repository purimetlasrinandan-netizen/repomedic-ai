import {
  RepositoryMetadata,
  FileMetadata,
  FileContentResponse,
  AskQuestionResponse,
  BugAnalysisResponse,
  ContributorGuideResponse,
  HistoryItem,
  SettingsResponse,
  AnalysisProgressStatus,
} from '../types';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = 'An error occurred while communicating with the server.';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `Request failed with status ${response.status} (${response.statusText})`;
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse<{ status: string; version: string; diagnostics: any }>(res);
  },

  async analyzeRepository(url: string, forceReindex: boolean = false) {
    const res = await fetch(`${API_BASE}/api/repositories/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, force_reindex: forceReindex }),
    });
    return handleResponse<{ repository_id: string; owner: string; name: string; status: string; message: string }>(res);
  },

  async getAnalysisStatus(repositoryId: string): Promise<AnalysisProgressStatus> {
    const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/status`);
    return handleResponse<AnalysisProgressStatus>(res);
  },

  async getRepository(repositoryId: string): Promise<RepositoryMetadata> {
    const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}`);
    return handleResponse<RepositoryMetadata>(res);
  },

  async getRepositoryFiles(repositoryId: string): Promise<{ repository_id: string; total_files: number; files: FileMetadata[] }> {
    const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/files`);
    return handleResponse<{ repository_id: string; total_files: number; files: FileMetadata[] }>(res);
  },

  async getFileContent(repositoryId: string, path: string): Promise<FileContentResponse> {
    const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/files/content?path=${encodeURIComponent(path)}`);
    return handleResponse<FileContentResponse>(res);
  },

  async askQuestion(repositoryId: string, question: string, maxSnippets: number = 5): Promise<AskQuestionResponse> {
    const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, max_snippets: maxSnippets }),
    });
    return handleResponse<AskQuestionResponse>(res);
  },

  async analyzeBug(
    repositoryId: string,
    errorMessage: string,
    stackTrace?: string,
    reproductionSteps?: string,
    suspectedFile?: string
  ): Promise<BugAnalysisResponse> {
    const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_message: errorMessage,
        stack_trace: stackTrace || null,
        reproduction_steps: reproductionSteps || null,
        suspected_file: suspectedFile || null,
      }),
    });
    return handleResponse<BugAnalysisResponse>(res);
  },

  async getContributorGuide(repositoryId: string): Promise<ContributorGuideResponse> {
    const res = await fetch(`${API_BASE}/api/repositories/${repositoryId}/contributor-guide`);
    return handleResponse<ContributorGuideResponse>(res);
  },

  async getHistory(): Promise<HistoryItem[]> {
    const res = await fetch(`${API_BASE}/api/history`);
    return handleResponse<HistoryItem[]>(res);
  },

  async deleteHistory(repositoryId: string): Promise<{ status: string; deleted_id: string }> {
    const res = await fetch(`${API_BASE}/api/history/${repositoryId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ status: string; deleted_id: string }>(res);
  },

  async clearHistory(): Promise<{ status: string; cleared_count: number }> {
    const res = await fetch(`${API_BASE}/api/history`, {
      method: 'DELETE',
    });
    return handleResponse<{ status: string; cleared_count: number }>(res);
  },

  async getSettings(): Promise<SettingsResponse> {
    const res = await fetch(`${API_BASE}/api/settings`);
    return handleResponse<SettingsResponse>(res);
  },

  async testOllama(): Promise<{ connected: boolean; available_models: string[]; model_available: boolean; configured_model: string }> {
    const res = await fetch(`${API_BASE}/api/settings/test-ollama`, {
      method: 'POST',
    });
    return handleResponse<{ connected: boolean; available_models: string[]; model_available: boolean; configured_model: string }>(res);
  },

  async getDemoRepositories(): Promise<{ built_in_fixture: any; curated_github_repos: any[] }> {
    const res = await fetch(`${API_BASE}/api/demo-repositories`);
    return handleResponse<{ built_in_fixture: any; curated_github_repos: any[] }>(res);
  },

  async loadSampleFixture(): Promise<{ status: string; repository_id: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/demo-repositories/load-sample`, {
      method: 'POST',
    });
    return handleResponse<{ status: string; repository_id: string; message: string }>(res);
  },
};
