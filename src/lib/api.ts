/**
 * Enhanced API Client with Progressive Results Support for Code Quality Insight Backend
 */

const API_BASE_URL = 'https://jellyfish-app-xboz9.ondigitalocean.app'; // Backend URL - frontend runs on port 8080

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFile[];
  upload_dir: string;
  total_files: number;
}

// GitHub-specific interfaces
export interface GitHubAnalyzeRequest {
  repo_url: string;
  branch: string;
  agents: string[];
  detailed: boolean;
}

export interface GitHubValidationResponse {
  valid: boolean;
  owner?: string;
  repo_name?: string;
  full_name?: string;
  description?: string;
  language?: string;
  size_kb?: number;
  stars?: number;
  forks?: number;
  open_issues?: number;
  default_branch?: string;
  last_update?: string;
  is_private?: boolean;
  is_fork?: boolean;
  branches?: string[];
  error?: string;
}

export interface GitHubAnalysisResponse {
  success: boolean;
  job_id: string;
  repo_url: string;
  branch: string;
  files_analyzed: number;
  repo_stats: {
    total_files: number;
    total_lines: number;
    total_size_bytes: number;
    language_breakdown: Record<string, { files: number; lines: number }>;
  };
  temp_dir?: string; // IMPORTANT: Added for Q&A system
  progressive?: boolean; // NEW: Indicates progressive analysis support
}

// NEW: Progressive WebSocket message interface
export interface ProgressiveWebSocketMessage {
  type: 'progress' | 'partial_results' | 'final_results';
  job_id: string;
  progress?: number;
  message?: string;
  completed_files?: number;
  total_files?: number;
  results?: BackendAnalysisResult[];
  timestamp: string;
}

// NEW: Partial results response interface
export interface PartialResultsResponse {
  success: boolean;
  partial: boolean;
  completed_files: number;
  total_files: number;
  progress: number;
  job_id: string;
  results: BackendAnalysisResult[];
  github_metadata?: {
    repo_url?: string;
    branch?: string;
    stats?: any;
    analysis_type?: string;
    temp_dir?: string;
  };
}

// Backend API Response Types (matching the actual backend structure)
export interface IssueModel {
  severity: string;
  title: string;
  agent: string;
  file: string;
  line: number;
  description: string;
  fix: string;
}

export interface AgentPerformance {
  agent: string;
  issues: number;
  time: number;
  confidence: number;
  status: string;
}

export interface BackendAnalysisResult {
  file: string;
  language: string;
  lines: number;
  total_issues: number;
  processing_time: number;
  tokens_used: number;
  api_calls: number;
  completed_agents: string[];
  
  // Severity breakdown
  critical_issues: number; 
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  
  // Agent performance
  agent_performance: AgentPerformance[];
  agent_breakdown: Record<string, number>;
  
  // Detailed issues (top 20)
  detailed_issues: IssueModel[];
  
  // Additional metadata
  timestamp: string;
  job_id: string;
}

export interface BackendResultsResponse {
  success: boolean;
  job_id: string;
  results: BackendAnalysisResult[];
  total_files: number;
  completion_time: string;
  github_metadata?: {
    repo_url?: string;
    branch?: string;
    stats?: {
      total_files: number;
      total_lines: number;
      total_size_bytes: number;
      language_breakdown: Record<string, { files: number; lines: number }>;
    };
    analysis_type?: string;
    temp_dir?: string; // IMPORTANT: Added for Q&A system
  };
}

// Frontend display types (transformed from backend data)
export interface AnalysisResult {
  job_id: string;
  summary: {
    total_files: number;
    total_issues: number;
    severity_breakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    agent_breakdown: Record<string, number>;
    overall_score: number;
  };
  metrics: {
    security_score: number;
    performance_score: number;
    code_quality_score: number;
    documentation_score: number;
  };
  files: FileResult[];
  analysis_time: number;
  timestamp: string;
  github_metadata?: {
    repo_url?: string;
    branch?: string;
    stats?: any;
    analysis_type?: string;
    temp_dir?: string; // IMPORTANT: For Q&A system
  };
  // NEW: Progressive metadata
  isPartial?: boolean;
  lastUpdated?: string;
}

export interface FileResult {
  file: string;
  path: string;
  language: string;
  lines: number;
  issues: Issue[];
  issues_count: number;
}

export interface Issue {
  title: string;
  description: string;
  severity: string;
  agent: string;
  line: number;
  suggestion: string;
  file?: string;
}

export interface AnalysisStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  start_time: string;
  completion_time?: string;
}

export interface ChatResponse {
  success: boolean;
  response: {
    content: string;
    confidence: number;
    source: string;
    processing_time: number;
    follow_up_suggestions: string[];
    related_files: string[];
  };
  timestamp: string;
}

export interface ChatSession {
  success: boolean;
  session_id: string;
  message: string;
  codebase_info: {
    path: string;
    status: string;
    context?: string;
    github_repo?: string;
    branch?: string;
  };
}

// ENHANCED: Chat start request with GitHub support
export interface ChatStartRequest {
  upload_dir?: string;
  github_repo?: string;
  branch?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Upload files to backend
   */
  async uploadFiles(files: File[]): Promise<UploadResponse> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseURL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  /**
   * ENHANCED: Start analysis job with progressive support
   */
  async startAnalysis(filePaths: string[], jobId: string): Promise<{ 
    success: boolean; 
    job_id: string; 
    results_count?: number;
    progressive?: boolean; // NEW: Indicates if progressive mode is enabled
  }> {
    const response = await fetch(`${this.baseURL}/api/analyze/${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_paths: filePaths,
        detailed: true,
        rag: true,
        progressive: true, // NEW: Request progressive analysis
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Analysis failed to start');
    }

    return response.json();
  }

  /**
   * Validate GitHub repository URL
   */
  async validateGitHubRepository(repoUrl: string): Promise<GitHubValidationResponse> {
    const response = await fetch(`${this.baseURL}/api/github/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repo_url: repoUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'GitHub validation failed');
    }

    return response.json();
  }

  /**
   * Get repository branches
   */
  async getRepositoryBranches(owner: string, repo: string): Promise<{ success: boolean; branches: string[]; default_branch: string; error?: string }> {
    const response = await fetch(`${this.baseURL}/api/github/branches/${owner}/${repo}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch branches');
    }

    return response.json();
  }

  /**
   * ENHANCED: Analyze GitHub repository with progressive support
   */
  async analyzeGitHubRepository(request: GitHubAnalyzeRequest, jobId?: string): Promise<GitHubAnalysisResponse> {
    const response = await fetch(`${this.baseURL}/api/github/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        progressive: true, // NEW: Request progressive analysis
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'GitHub analysis failed');
    }

    return response.json();
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(jobId: string): Promise<AnalysisStatus> {
    const response = await fetch(`${this.baseURL}/api/status/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get status');
    }

    return response.json();
  }

  /**
   * NEW: Get partial results for progressive display
   */
  async getPartialResults(jobId: string): Promise<PartialResultsResponse> {
    const response = await fetch(`${this.baseURL}/api/partial-results/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get partial results');
    }

    return response.json();
  }

  /**
   * ENHANCED: Get analysis results and transform to frontend format
   */
  async getAnalysisResults(jobId: string): Promise<AnalysisResult> {
    const response = await fetch(`${this.baseURL}/api/results/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get results');
    }

    const backendData: BackendResultsResponse = await response.json();
    
    // Transform backend data to frontend format
    return this.transformBackendResults(backendData, false);
  }

  /**
   * ENHANCED: Transform backend results with progressive support
   */
  private transformBackendResults(backendData: BackendResultsResponse, isPartial: boolean = false): AnalysisResult {
    const results = backendData.results;
    
    // Calculate totals
    const totalFiles = results.length;
    const totalIssues = results.reduce((sum, file) => sum + file.total_issues, 0);
    
    // Separate critical from high issues
    const totalCriticalIssues = results.reduce((sum, file) => sum + file.critical_issues, 0);
    const totalHighIssues = results.reduce((sum, file) => sum + file.high_issues, 0);
    const totalMediumIssues = results.reduce((sum, file) => sum + file.medium_issues, 0);
    const totalLowIssues = results.reduce((sum, file) => sum + file.low_issues, 0);
    
    // FIXED: Aggregate agent breakdown across all files
    const agentBreakdown: Record<string, number> = {
      security: 0,
      performance: 0,
      complexity: 0,
      documentation: 0
    };
    
    // Sum up agent breakdowns from all files
    results.forEach(file => {
      if (file.agent_breakdown) {
        Object.entries(file.agent_breakdown).forEach(([agent, count]) => {
          const agentKey = agent.toLowerCase();
          if (agentKey in agentBreakdown) {
            agentBreakdown[agentKey] += count;
          }
        });
      }
    });
    
    console.log('[API Transform] Agent breakdown aggregated:', agentBreakdown);

    // Transform file results
    const files: FileResult[] = results.map(file => ({
      file: file.file,
      path: file.file,
      language: file.language,
      lines: file.lines,
      issues_count: file.total_issues,
      issues: file.detailed_issues.map(issue => ({
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        agent: issue.agent,
        line: issue.line,
        suggestion: issue.fix,
        file: issue.file
      }))
    }));

    // Calculate metrics based on aggregated data
    const securityIssues = agentBreakdown.security || 0;
    const performanceIssues = agentBreakdown.performance || 0;
    const complexityIssues = agentBreakdown.complexity || 0;
    const documentationIssues = agentBreakdown.documentation || 0;

    const transformedResult: AnalysisResult = {
      job_id: backendData.job_id,
      summary: {
        total_files: totalFiles,
        total_issues: totalIssues,
        severity_breakdown: {
          critical: totalCriticalIssues,
          high: totalHighIssues,
          medium: totalMediumIssues,
          low: totalLowIssues,
        },
        agent_breakdown: agentBreakdown, // Use aggregated breakdown
        overall_score: Math.max(0, 100 - (totalIssues * 2)),
      },
      metrics: {
        security_score: Math.max(0, 100 - (securityIssues * 5)),
        performance_score: Math.max(0, 100 - (performanceIssues * 4)),
        code_quality_score: Math.max(0, 100 - (complexityIssues * 3)),
        documentation_score: Math.max(0, 100 - (documentationIssues * 2)),
      },
      files,
      analysis_time: results.reduce((sum, file) => sum + file.processing_time, 0),
      timestamp: backendData.completion_time,
      github_metadata: backendData.github_metadata,
    };
    
    // Add progressive metadata if this is partial data
    if (isPartial) {
      transformedResult.isPartial = true;
      transformedResult.lastUpdated = new Date().toISOString();
    }
    
    console.log('[API Transform] Final result summary:', transformedResult.summary);
    
    return transformedResult;
  }

  /**
   * NEW: Transform partial results to AnalysisResult format
   */
  transformPartialResults(partialData: PartialResultsResponse): AnalysisResult | null {
    if (!partialData.results || partialData.results.length === 0) {
      return null;
    }

    // Create a mock BackendResultsResponse for transformation
    const mockBackendResponse: BackendResultsResponse = {
      success: true,
      job_id: partialData.job_id,
      results: partialData.results,
      total_files: partialData.completed_files,
      completion_time: new Date().toISOString(),
      github_metadata: partialData.github_metadata
    };

    return this.transformBackendResults(mockBackendResponse, true);
  }

  /**
   * ENHANCED: Create WebSocket connection for progressive real-time updates
   */
  createProgressiveWebSocket(
    jobId: string, 
    onMessage: (data: ProgressiveWebSocketMessage) => void, 
    onError?: (error: Event) => void
  ): WebSocket {
    const wsUrl = this.baseURL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/api/progress/${jobId}`);
    
    ws.onmessage = (event) => {
      try {
        const data: ProgressiveWebSocketMessage = JSON.parse(event.data);
        console.log('[API] Progressive WebSocket message:', data.type, data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse progressive WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Progressive WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    };

    ws.onclose = () => {
      console.log('Progressive WebSocket connection closed');
    };

    return ws;
  }

  /**
   * ENHANCED: Start chat session with GitHub support
   */
  async startChatSession(request?: ChatStartRequest): Promise<ChatSession> {
    console.log('[API] Starting chat session with request:', request);
    
    const body = request ? {
      upload_dir: request.upload_dir || '',
      github_repo: request.github_repo || '',
      branch: request.branch || ''
    } : { upload_dir: '' };

    const response = await fetch(`${this.baseURL}/api/chat/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start chat session');
    }

    return response.json();
  }

  /**
   * Send chat message
   */
  async sendChatMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        message: message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send message');
    }

    return response.json();
  }

  /**
   * DEPRECATED: Use createProgressiveWebSocket instead for better progressive support
   */
  createProgressWebSocket(jobId: string, onMessage: (data: any) => void, onError?: (error: Event) => void): WebSocket {
    console.warn('[API] createProgressWebSocket is deprecated. Use createProgressiveWebSocket for enhanced progressive support.');
    return this.createProgressiveWebSocket(jobId, onMessage, onError);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clean up GitHub temporary directory (optional cleanup)
   */
  async cleanupGitHubTempDir(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/github/cleanup/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Cleanup failed');
      }

      return response.json();
    } catch (error) {
      console.error('Cleanup failed:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types and client
export { ApiClient };