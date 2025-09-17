import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/Sidebar';
import { 
  Shield, 
  Zap, 
  BarChart3, 
  FileSearch,
  AlertTriangle,
  Clock,
  FileCode,
  CheckCircle,
  Code,
  MessageSquare,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Github,
  GitBranch,
  Globe,
  Loader2,
  Eye
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, AnalysisResult, AnalysisStatus, BackendAnalysisResult } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const Dashboard = () => {
  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [partialResults, setPartialResults] = useState<BackendAnalysisResult[]>([]);
  const [completedFiles, setCompletedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [showPartialResults, setShowPartialResults] = useState(false);
  const [isProgressiveMode, setIsProgressiveMode] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get job ID and context from URL params
  const jobId = searchParams.get('job_id');
  const uploadDir = searchParams.get('upload_dir');
  const githubRepo = searchParams.get('github_repo');
  const branch = searchParams.get('branch');
  const isGitHubAnalysis = Boolean(githubRepo);

  // --- LOCAL STORAGE HANDLING ---
  const localStorageKey = 'dashboardLastContext';

  // On mount: check localStorage and auto-redirect if needed
  useEffect(() => {
    const loadSavedContext = () => {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // If we have no jobId in URL but have saved context → redirect
          if (!jobId && parsed.lastJobId) {
            console.log('[Dashboard] Restoring from localStorage:', parsed);
            const params = new URLSearchParams();
            params.set('job_id', parsed.lastJobId);
            if (parsed.lastUploadDir) params.set('upload_dir', parsed.lastUploadDir);
            if (parsed.lastGithubRepo) params.set('github_repo', parsed.lastGithubRepo);
            if (parsed.lastBranch) params.set('branch', parsed.lastBranch);

            navigate(`/dashboard?${params.toString()}`, { replace: true });
          }
        } catch (e) {
          console.error('[Dashboard] Failed to parse localStorage context:', e);
          localStorage.removeItem(localStorageKey); // Clean bad data
        }
      }
    };

    loadSavedContext();
  }, [jobId, navigate]);

  // Main effect: Monitor analysis job
  useEffect(() => {
    if (!jobId) return;

    console.log('[Dashboard] Starting progressive monitoring for job:', jobId);

    let ws: WebSocket | null = null;
    let statusCheckInterval: NodeJS.Timeout | null = null;

    const startProgressiveMonitoring = async () => {
      try {
        const status = await apiClient.getAnalysisStatus(jobId);
        console.log('[Dashboard] Initial status:', status);
        updateAnalysisState(status);

        if (status.status === 'completed') {
          await loadFinalResults();
        } else if (status.status === 'processing') {
          setIsProgressiveMode(true);
          setShowPartialResults(true);
          setupProgressiveWebSocket();
          startProgressivePolling();
        }
      } catch (error) {
        console.error('Failed to start monitoring:', error);
        toast({
          title: "Monitoring Error",
          description: "Failed to connect to analysis status.",
          variant: "destructive"
        });
      }
    };

    const setupProgressiveWebSocket = () => {
      ws = apiClient.createProgressiveWebSocket(
        jobId,
        (data) => {
          if (data.type === 'progress') {
            setAnalysisProgress(data.progress || 0);
            setAnalysisMessage(data.message || '');
            setCompletedFiles(data.completed_files || 0);
            setTotalFiles(data.total_files || 0);
            setIsAnalyzing((data.progress || 0) < 100);
            if (data.message?.includes('✅') && (data.completed_files || 0) > completedFiles) {
              toast({
                title: "File Analyzed",
                description: data.message,
              });
            }
          } else if (data.type === 'partial_results' && data.results) {
            setPartialResults(data.results);
            setCompletedFiles(data.completed_files || 0);
            updatePartialDashboard(data.results);
          } else if (data.type === 'final_results') {
            setIsAnalyzing(false);
            setIsProgressiveMode(false);
            loadFinalResults();
          }
        },
        (error) => {
          console.error('Progressive WebSocket error:', error);
          startProgressivePolling();
        }
      );
    };

    const startProgressivePolling = () => {
      statusCheckInterval = setInterval(async () => {
        try {
          const partialResponse = await apiClient.getPartialResults(jobId);
          if (partialResponse.success && partialResponse.results.length > 0) {
            setPartialResults(partialResponse.results);
            setCompletedFiles(partialResponse.completed_files);
            setTotalFiles(partialResponse.total_files);
            updatePartialDashboard(partialResponse.results);
          }

          const status = await apiClient.getAnalysisStatus(jobId);
          updateAnalysisState(status);

          if (status.status === 'completed') {
            if (statusCheckInterval) clearInterval(statusCheckInterval);
            if (ws) ws.close();
            await loadFinalResults();
          } else if (status.status === 'failed') {
            if (statusCheckInterval) clearInterval(statusCheckInterval);
            if (ws) ws.close();
            setIsAnalyzing(false);
            setIsProgressiveMode(false);
          }
        } catch (error) {
          console.error('Progressive polling error:', error);
        }
      }, 3000);
    };

    const updateAnalysisState = (status: AnalysisStatus) => {
      setAnalysisProgress(status.progress);
      setAnalysisMessage(status.message);
      setIsAnalyzing(status.status === 'processing');
      if (status.status === 'failed') {
        toast({
          title: "Analysis Failed",
          description: status.message,
          variant: "destructive"
        });
      }
    };

    const updatePartialDashboard = (results: BackendAnalysisResult[]) => {
      if (results.length === 0) return;
      const partialAnalysisResult = transformPartialResults(results);
      setAnalysisResults(partialAnalysisResult);
    };

    const loadFinalResults = async () => {
      try {
        const results = await apiClient.getAnalysisResults(jobId);
        setAnalysisResults(results);
        setIsAnalyzing(false);
        setIsProgressiveMode(false);
        toast({
          title: "Analysis Complete!",
          description: isGitHubAnalysis 
            ? `GitHub repository analyzed: ${results.summary.total_issues} issues found`
            : `Analysis complete: ${results.summary.total_issues} issues found across ${results.summary.total_files} files.`,
        });

        // ✅ SAVE CONTEXT TO LOCALSTORAGE ON SUCCESS
        saveContextToLocalStorage(jobId, uploadDir, githubRepo, branch);
      } catch (error) {
        console.error('Failed to load final results:', error);
        toast({
          title: "Results Error",
          description: "Analysis completed but failed to load final results.",
          variant: "destructive"
        });
      }
    };

    startProgressiveMonitoring();

    return () => {
      if (ws) ws.close();
      if (statusCheckInterval) clearInterval(statusCheckInterval);
    };
  }, [jobId, toast, isGitHubAnalysis, uploadDir, githubRepo, branch]);

  // Transform partial results to AnalysisResult format
  const transformPartialResults = (results: BackendAnalysisResult[]): AnalysisResult => {
    const totalFiles = results.length;
    const totalIssues = results.reduce((sum, file) => sum + file.total_issues, 0);
    const totalCriticalIssues = results.reduce((sum, file) => sum + file.critical_issues, 0);
    const totalHighIssues = results.reduce((sum, file) => sum + file.high_issues, 0);
    const totalMediumIssues = results.reduce((sum, file) => sum + file.medium_issues, 0);
    const totalLowIssues = results.reduce((sum, file) => sum + file.low_issues, 0);

    const agentBreakdown: Record<string, number> = {
      security: 0,
      performance: 0,
      complexity: 0,
      documentation: 0
    };

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

    return {
      job_id: jobId!,
      summary: {
        total_files: totalFiles,
        total_issues: totalIssues,
        severity_breakdown: {
          critical: totalCriticalIssues,
          high: totalHighIssues,
          medium: totalMediumIssues,
          low: totalLowIssues,
        },
        agent_breakdown: agentBreakdown,
        overall_score: Math.max(0, 100 - (totalIssues * 2)),
      },
      metrics: {
        security_score: Math.max(0, 100 - (agentBreakdown.security * 5)),
        performance_score: Math.max(0, 100 - (agentBreakdown.performance * 4)),
        code_quality_score: Math.max(0, 100 - (agentBreakdown.complexity * 3)),
        documentation_score: Math.max(0, 100 - (agentBreakdown.documentation * 2)),
      },
      files: results.map(file => ({
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
      })),
      analysis_time: results.reduce((sum, file) => sum + file.processing_time, 0),
      timestamp: new Date().toISOString(),
    };
  };

  // Helper functions
  const getLanguageColor = (language: string): string => {
    const colors: { [key: string]: string } = {
      'javascript': '#F7DF1E',
      'python': '#3776AB',
      'typescript': '#3178C6',
      'java': '#ED8B00',
      'cpp': '#00599C',
      'csharp': '#239120',
      'go': '#00ADD8',
      'rust': '#000000',
      'php': '#777BB4',
      'ruby': '#CC342D',
      'unknown': '#6B7280'
    };
    return colors[language.toLowerCase()] || '#6B7280';
  };

  const getAgentColor = (agent: string): string => {
    const colors: { [key: string]: string } = {
      'security': '#EF4444',
      'performance': '#F59E0B',
      'complexity': '#3B82F6',
      'documentation': '#10B981'
    };
    return colors[agent.toLowerCase()] || '#6B7280';
  };

  const getSeverityTextColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-800 border-red-300 bg-red-100';
      case 'high': return 'text-red-600 border-red-200 bg-red-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'low': return 'text-green-600 border-green-200 bg-green-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  // Prepare chart data
  const languageData = analysisResults ? 
    Object.entries(
      analysisResults.files.reduce((acc, file) => {
        const lang = file.language || 'unknown';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([lang, count]) => ({
      name: lang.charAt(0).toUpperCase() + lang.slice(1),
      value: count,
      color: getLanguageColor(lang)
    })) : [];

  const severityData = analysisResults ? [
    { name: 'Critical', value: analysisResults.summary.severity_breakdown.critical, color: '#DC2626' },
    { name: 'High', value: analysisResults.summary.severity_breakdown.high, color: '#EF4444' },
    { name: 'Medium', value: analysisResults.summary.severity_breakdown.medium, color: '#F59E0B' },
    { name: 'Low', value: analysisResults.summary.severity_breakdown.low, color: '#10B981' },
  ] : [];

  const hasAnyIssues = severityData.some(item => item.value > 0);
  const chartSeverityData = severityData.filter(item => item.value > 0);

  const agentData = analysisResults ? 
    Object.entries(analysisResults.summary.agent_breakdown).map(([agent, count]) => ({
      name: agent.charAt(0).toUpperCase() + agent.slice(1),
      issues: count,
      color: getAgentColor(agent)
    })) : [];

  const topIssues = analysisResults ? 
    analysisResults.files
      .flatMap(file => file.issues.map(issue => ({
        ...issue,
        file: file.file
      })))
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.severity.toLowerCase() as keyof typeof severityOrder] || 0) - 
               (severityOrder[a.severity.toLowerCase() as keyof typeof severityOrder] || 0);
      })
      .slice(0, 10) : [];

  // Event handlers
  const handleStartChat = () => {
    const params = new URLSearchParams();
    if (uploadDir) params.set('upload_dir', uploadDir);
    if (isGitHubAnalysis && githubRepo) {
      params.set('github_repo', githubRepo);
      params.set('branch', branch || 'main');
    }
    navigate(`/chat/new?${params.toString()}`);
  };

  const handleRefresh = async () => {
    if (!jobId) return;
    try {
      if (isProgressiveMode) {
        const partialData = await apiClient.getPartialResults(jobId);
        if (partialData.success && partialData.results.length > 0) {
          setPartialResults(partialData.results);
          setCompletedFiles(partialData.completed_files);
          setTotalFiles(partialData.total_files);
          updatePartialDashboard(partialData.results);
        }
      } else {
        const results = await apiClient.getAnalysisResults(jobId);
        setAnalysisResults(results);
      }
      toast({
        title: "Results Refreshed",
        description: "Latest analysis results loaded.",
      });
    } catch (error) {
      console.error('Failed to refresh results:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh results.",
        variant: "destructive"
      });
    }
  };

  // Progressive Analysis Status Component
  const ProgressiveAnalysisStatus = () => {
    if (!isAnalyzing && !isProgressiveMode) return null;
    return (
      <Card className="mb-6 border-primary/20 shadow-glow animate-pulse-slow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 animate-spin text-primary" />
              {isGitHubAnalysis ? 'Analyzing GitHub Repository' : 'Running Progressive Analysis'}
              {isProgressiveMode && (
                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                  Live Updates
                </Badge>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {Math.round(analysisProgress)}% • {completedFiles}/{totalFiles} files
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPartialResults(!showPartialResults)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPartialResults ? 'Hide' : 'Show'} Live Results
              </Button>
            </div>
          </div>
          <Progress value={analysisProgress} className="mb-3 h-3" />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {analysisMessage || (isGitHubAnalysis 
                ? `Analyzing repository: ${githubRepo}...` 
                : "Multi-agent analysis in progress...")}
            </p>
            {partialResults.length > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {partialResults.reduce((sum, r) => sum + r.total_issues, 0)} issues found so far
              </Badge>
            )}
          </div>
          {totalFiles > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4 text-center">
              <div className="p-2 rounded-lg bg-red-50">
                <Shield className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-xs text-red-600 font-medium">Security</p>
                <p className="text-xs text-red-500">
                  {partialResults.reduce((sum, r) => sum + (r.agent_breakdown?.security || 0), 0)} issues
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-50">
                <Zap className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-xs text-orange-600 font-medium">Performance</p>
                <p className="text-xs text-orange-500">
                  {partialResults.reduce((sum, r) => sum + (r.agent_breakdown?.performance || 0), 0)} issues
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <BarChart3 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-blue-600 font-medium">Complexity</p>
                <p className="text-xs text-blue-500">
                  {partialResults.reduce((sum, r) => sum + (r.agent_breakdown?.complexity || 0), 0)} issues
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <FileSearch className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-green-600 font-medium">Documentation</p>
                <p className="text-xs text-green-500">
                  {partialResults.reduce((sum, r) => sum + (r.agent_breakdown?.documentation || 0), 0)} issues
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // File Progress List Component
  const FileProgressList = () => {
    if (!isProgressiveMode || partialResults.length === 0) return null;
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            File Analysis Progress ({completedFiles}/{totalFiles})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {partialResults.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">{file.file}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.language} • {file.lines} lines • {file.processing_time.toFixed(1)}s
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={file.total_issues > 0 ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {file.total_issues} issues
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    ✅ Complete
                  </Badge>
                </div>
              </div>
            ))}
            {isAnalyzing && completedFiles < totalFiles && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="font-medium text-sm">Analyzing next file...</p>
                    <p className="text-xs text-blue-600">{totalFiles - completedFiles} files remaining</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                  In Progress
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // GitHub Repository Header Component
  const GitHubRepoHeader = () => {
    if (!githubRepo && !analysisResults?.github_metadata?.repo_url) return null;
    const repoName = githubRepo || analysisResults?.github_metadata?.repo_url?.split('/').slice(-2).join('/');
    const repoUrl = analysisResults?.github_metadata?.repo_url || `https://github.com/${githubRepo}`;
    const repoStats = analysisResults?.github_metadata?.stats;
    return (
      <Card className="mb-6 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <Github className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {repoName}
                  <Button variant="ghost" size="sm" asChild>
                    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  GitHub Repository Analysis • Branch: {branch || 'main'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Github className="w-4 h-4 mr-1" />
              GitHub Integration
            </Badge>
          </div>
          {repoStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{repoStats.total_files}</p>
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <FileCode className="w-3 h-3" />
                  Files
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{repoStats.total_lines.toLocaleString()}</p>
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Code className="w-3 h-3" />
                  Lines of Code
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {(repoStats.total_size_bytes / 1024 / 1024).toFixed(1)}MB
                </p>
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Globe className="w-3 h-3" />
                  Repository Size
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(repoStats.language_breakdown).length}
                </p>
                <p className="text-xs text-gray-600">Languages</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // --- LOCAL STORAGE UTILITIES ---
  const saveContextToLocalStorage = (
    jobId: string,
    uploadDir: string | null,
    githubRepo: string | null,
    branch: string | null
  ) => {
    const context = {
      lastJobId: jobId,
      lastUploadDir: uploadDir || '',
      lastGithubRepo: githubRepo || '',
      lastBranch: branch || ''
    };
    localStorage.setItem('dashboardLastContext', JSON.stringify(context));
    console.log('[Dashboard] Saved context to localStorage:', context);
  };

  const clearDashboardContext = () => {
    localStorage.removeItem('dashboardLastContext');
    console.log('[Dashboard] Cleared localStorage context');
  };

  // --- RENDER LOGIC ---
  

  return (
    <div className="min-h-screen bg-background">
      <div className="flex w-full">
        <Sidebar />
        <main className="flex-1 p-6">
          
{/* Header */}
<div className="mb-8">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold text-gradient">
        {isProgressiveMode ? 'Live Code Analysis Dashboard' : 'Code Analysis Dashboard'}
      </h1>
      <p className="text-muted-foreground mt-1">
        {isGitHubAnalysis ? (
          <>
            <Github className="w-4 h-4 inline mr-1" />
            GitHub Repository Analysis • {githubRepo} ({branch || 'main'})
          </>
        ) : (
          <>LangGraph multi-agent analysis results</>
        )}
        {analysisResults && ` • ${analysisResults.summary.total_files} files analyzed`}
        {isProgressiveMode && ` • Live Updates Active`}
        {jobId && ` • Job ID: ${jobId.slice(0, 8)}...`}
        {!jobId && analysisResults && (
          <span className="text-blue-600 dark:text-blue-400 ml-2">(restored from browser)</span>
        )}
      </p>
    </div>
    <div className="flex items-center gap-3">
      {/* Refresh Button - Always available if we have a jobId */}
      {jobId && (
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      )}
      
      {/* Ask AI Button - Conditional Logic */}
      {analysisResults ? (
        <Button 
          onClick={handleStartChat} 
          variant="outline"
          disabled={isAnalyzing || isProgressiveMode}
          className={`${
            isAnalyzing || isProgressiveMode 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {isAnalyzing || isProgressiveMode ? 'Analysis in Progress...' : 'Ask AI'}
        </Button>
      ) : (
        <Button 
          variant="outline"
          disabled={true}
          className="opacity-50 cursor-not-allowed"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Ask AI
        </Button>
      )}
      
      {/* New Analysis Button */}
      <Button onClick={() => navigate('/')} variant="outline">
        <ArrowRight className="w-4 h-4 mr-2" />
        New Analysis
      </Button>
    </div>
  </div>
</div>
          {/* GitHub Repository Header */}
          <GitHubRepoHeader />

          {/* Progressive Analysis Status */}
          <ProgressiveAnalysisStatus />

          {/* File Progress List - Only show in progressive mode */}
          <FileProgressList />

          {/* RESULTS SECTION — Show ONLY if we have results */}
          {analysisResults && (
            <>
              {/* Live Banner */}
              {isProgressiveMode && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="font-medium text-blue-800">Live Analysis Results</p>
                        <p className="text-sm text-blue-600">
                          Results update automatically as each file completes analysis. 
                          {isAnalyzing ? ` ${totalFiles - completedFiles} files remaining.` : ' Analysis complete!'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-medium transition-all duration-300 border-green-200 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-green-100">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {Math.round(analysisResults.summary.overall_score)}%
                        {isProgressiveMode && (
                          <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        )}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      Overall Score {isProgressiveMode && '(Live)'}
                    </h3>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                      {Math.round(analysisResults.summary.overall_score)}/100
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-medium transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-blue-50">
                        <FileCode className="w-6 h-6 text-blue-600" />
                      </div>
                      <Badge variant="outline" className="text-blue-600">
                        {analysisResults.summary.total_files}
                        {isProgressiveMode && isAnalyzing && `/${totalFiles}`}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      Files {isProgressiveMode && isAnalyzing ? 'Completed' : 'Analyzed'}
                    </h3>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                      {analysisResults.summary.total_files}
                      {isProgressiveMode && isAnalyzing && (
                        <span className="text-lg text-muted-foreground">/{totalFiles}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-medium transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-orange-50">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                      </div>
                      <Badge variant="outline" className="text-orange-600">
                        {analysisResults.summary.total_issues}
                        {isProgressiveMode && (
                          <span className="ml-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                        )}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      Issues Found {isProgressiveMode && '(So Far)'}
                    </h3>
                    <div className="text-2xl font-bold text-orange-600 mt-1">
                      {analysisResults.summary.total_issues}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-medium transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-purple-50">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <Badge variant="outline" className="text-purple-600">
                        {Math.round(analysisResults.analysis_time)}s
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      {isProgressiveMode && isAnalyzing ? 'Time Elapsed' : 'Analysis Time'}
                    </h3>
                    <div className="text-2xl font-bold text-purple-600 mt-1">
                      {Math.round(analysisResults.analysis_time)}s
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Agent Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-medium transition-all duration-300 border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-red-50">
                        <Shield className="w-6 h-6 text-red-600" />
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        {analysisResults.summary.agent_breakdown?.security ?? 0}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Security Issues</h3>
                    <div className="text-2xl font-bold text-red-600 mt-1">
                      {analysisResults.summary.agent_breakdown?.security ?? 0}
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Score: {Math.round(analysisResults.metrics.security_score)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-medium transition-all duration-300 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-orange-50">
                        <Zap className="w-6 h-6 text-orange-600" />
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        {analysisResults.summary.agent_breakdown?.performance ?? 0}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Performance Issues</h3>
                    <div className="text-2xl font-bold text-orange-600 mt-1">
                      {analysisResults.summary.agent_breakdown?.performance ?? 0}
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Score: {Math.round(analysisResults.metrics.performance_score)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-medium transition-all duration-300 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-blue-50">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {analysisResults.summary.agent_breakdown?.complexity ?? 0}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Complexity Issues</h3>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                      {analysisResults.summary.agent_breakdown?.complexity ?? 0}
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Score: {Math.round(analysisResults.metrics.code_quality_score)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-medium transition-all duration-300 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-green-50">
                        <FileSearch className="w-6 h-6 text-green-600" />
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {analysisResults.summary.agent_breakdown?.documentation ?? 0}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Documentation Issues</h3>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                      {analysisResults.summary.agent_breakdown?.documentation ?? 0}
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Score: {Math.round(analysisResults.metrics.documentation_score)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Issue Severity Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      Issue Severity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasAnyIssues ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartSeverityData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {chartSeverityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex flex-col items-center justify-center text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold text-green-700 mb-2">No Issues Found!</h3>
                        <p className="text-sm text-green-600">
                          Your code analysis completed successfully with no issues detected.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          {severityData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <span className="text-green-600">{item.name}: 0</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Language Distribution */}
                {languageData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        Languages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={languageData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {languageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Agent Performance */}
                {agentData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Agent Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={agentData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="issues" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Top Issues */}
              {topIssues.length > 0 && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      Top Issues Found ({topIssues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topIssues.map((issue, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                {index + 1}
                              </span>
                              <div>
                                <h4 className="font-semibold text-sm mb-1">{issue.title}</h4>
                                <Badge variant="outline" className={`text-xs ${getSeverityTextColor(issue.severity)}`}>
                                  {issue.severity.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {issue.agent}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 ml-9">
                            {issue.description}
                          </p>
                          {issue.suggestion && (
                            <div className="ml-9 p-3 rounded-md bg-blue-50 border border-blue-200">
                              <p className="text-xs font-medium text-blue-800 mb-1">💡 Suggested Fix:</p>
                              <p className="text-xs text-blue-700">{issue.suggestion}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3 ml-9 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileCode className="w-3 h-3" />
                              {issue.file} (Line {issue.line})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Files Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    Analyzed Files Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResults.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileCode className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{file.file}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.language} • {file.lines} lines
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={file.issues_count > 0 ? "destructive" : "outline"}
                            className="text-xs"
                          >
                            {file.issues_count} {file.issues_count === 1 ? 'issue' : 'issues'}
                          </Badge>
                          {file.issues_count === 0 && (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Loading state while waiting for job data */}
          {jobId && !analysisResults && (
            <Card className="p-12 text-center border-blue-200 bg-blue-50">
              <div className="space-y-4">
                <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
                <h3 className="text-lg font-semibold text-blue-800">Loading Analysis...</h3>
                <p className="text-blue-700">
                  Fetching results for job: {jobId.slice(0, 8)}...
                </p>
              </div>
            </Card>
          )}

          {/* No job ID — show upload prompt */}
          {!jobId && (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <FileCode className="w-16 h-16 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No Analysis Job Found</h3>
                <p className="text-muted-foreground mb-4">
                  Upload some files or analyze a GitHub repository to see detailed results here.
                </p>
                <Button onClick={() => navigate('/')} variant="hero">
                  Start New Analysis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;