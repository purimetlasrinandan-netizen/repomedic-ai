export interface RepositoryMetadata {
  id: string;
  owner: string;
  name: string;
  url: string;
  description?: string;
  default_branch: string;
  stars: number;
  forks: number;
  license?: string;
  primary_languages: string[];
  frameworks: string[];
  total_files_discovered: number;
  files_indexed_count: number;
  total_size_bytes: number;
  readme_summary?: string;
  important_files: string[];
  risk_areas: string[];
  analyzed_at: string;
  status: string;
}

export interface FileMetadata {
  path: string;
  size: number;
  language: string;
  lines_count: number;
  is_indexed: boolean;
}

export interface FileContentResponse {
  path: string;
  content: string;
  language: string;
  size: number;
  lines_count: number;
  is_truncated: boolean;
  total_lines: number;
}

export interface CodeSnippet {
  file_path: string;
  start_line: number;
  end_line: number;
  code: string;
  language: string;
  relevance_score: number;
}

export interface AskQuestionResponse {
  question: string;
  answer: string;
  explanation: string;
  technical_details: string[];
  referenced_files: string[];
  code_snippets: CodeSnippet[];
  suggested_next_steps: string[];
  confidence: string;
  grounded_in_code: boolean;
  model_used: string;
  is_fallback: boolean;
}

export interface SuggestedFix {
  original_code: string;
  proposed_code: string;
  explanation: string;
  files_affected: string[];
  potential_side_effects: string[];
  testing_recommendations: string[];
  diff: string;
}

export interface BugAnalysisResponse {
  bug_summary: string;
  potential_root_cause: string;
  evidence: string;
  relevant_files: string[];
  relevant_snippets: CodeSnippet[];
  suggested_fix: SuggestedFix;
  why_fix_works: string;
  how_to_verify: string[];
  confidence_and_limitations: string;
  is_ai_generated: boolean;
  model_used: string;
  is_fallback: boolean;
}

export interface DirectoryInfo {
  path: string;
  purpose: string;
  key_files: string[];
}

export interface ComponentInfo {
  name: string;
  file_path: string;
  description: string;
}

export interface CommonContributionQuestion {
  question: string;
  answer: string;
  relevant_files: string[];
}

export interface ContributorGuideResponse {
  repository_id: string;
  project_purpose: string;
  high_level_architecture: string;
  important_directories: DirectoryInfo[];
  entry_points: string[];
  main_components: ComponentInfo[];
  api_routes: string[];
  test_directories: string[];
  configuration_files: string[];
  build_and_run_instructions: string[];
  beginner_start_files: string[];
  common_contributions: CommonContributionQuestion[];
}

export interface HistoryItem {
  id: string;
  repository_id: string;
  owner: string;
  name: string;
  url: string;
  analyzed_at: string;
  status: string;
  files_count: number;
  primary_languages: string[];
  description?: string;
}

export interface SettingsResponse {
  backend_status: string;
  version: string;
  ollama_connected: boolean;
  ollama_base_url: string;
  configured_model: string;
  model_available: boolean;
  available_models: string[];
  embedding_model: string;
  max_repository_files: number;
  max_file_size_kb: number;
  max_total_content_mb: number;
  github_token_configured: boolean;
}

export interface AnalysisProgressStatus {
  repository_id: string;
  step: string;
  percentage: number;
  message: string;
  is_complete: boolean;
  is_error: boolean;
  error_message?: string;
}
