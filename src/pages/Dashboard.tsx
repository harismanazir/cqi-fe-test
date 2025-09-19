import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Eye,
  Filter,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  Bug
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, AnalysisResult, AnalysisStatus, BackendAnalysisResult, Issue } from '@/lib/api';
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

// Enhanced Issue interface with file information
interface EnhancedIssue extends Issue {
  file: string;
  id: string; // For unique identification
}

const Dashboard = () => {
  // Existing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [partialResults, setPartialResults] = useState<BackendAnalysisResult[]>([]);
  const [completedFiles, setCompletedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [showPartialResults, setShowPartialResults] = useState(false);
  const [isProgressiveMode, setIsProgressiveMode] = useState(false);

  // New filtering and display state
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [issuesPerPage, setIssuesPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get job ID and context from URL params
  const jobId = searchParams.get('job_id');
  const uploadDir = searchParams.get('upload_dir');
  const githubRepo = searchParams.get('github_repo');
  const branch = searchParams.get('branch');
  const isGitHubAnalysis = Boolean(githubRepo);

  // Local storage handling
  const localStorageKey = 'dashboardLastContext';

  // Get all issues with enhanced information
  const getAllIssues = (): EnhancedIssue[] => {
    if (!analysisResults) return [];
    
    const allIssues: EnhancedIssue[] = [];
    analysisResults.files.forEach(file => {
      file.issues.forEach((issue, index) => {
        allIssues.push({
          ...issue,
          file: file.file,
          id: `${file.file}-${index}-${issue.line}`
        });
      });
    });
    
    return allIssues;
  };

  // Filter issues based on selected filters
  const getFilteredIssues = (): EnhancedIssue[] => {
    let issues = getAllIssues();

    // Filter by agent
    if (selectedAgent !== 'all') {
      issues = issues.filter(issue => issue.agent.toLowerCase() === selectedAgent);
    }

    // Filter by file
    if (selectedFile !== 'all') {
      issues = issues.filter(issue => issue.file === selectedFile);
    }

    // Filter by severity
    if (selectedSeverity !== 'all') {
      issues = issues.filter(issue => issue.severity.toLowerCase() === selectedSeverity);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      issues = issues.filter(issue => 
        issue.title.toLowerCase().includes(term) ||
        issue.description.toLowerCase().includes(term) ||
        issue.suggestion.toLowerCase().includes(term) ||
        issue.file.toLowerCase().includes(term)
      );
    }

    // Sort by severity and then by file
    const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return issues.sort((a, b) => {
      const severityDiff = (severityOrder[b.severity.toLowerCase() as keyof typeof severityOrder] || 0) - 
                          (severityOrder[a.severity.toLowerCase() as keyof typeof severityOrder] || 0);
      if (severityDiff !== 0) return severityDiff;
      return a.file.localeCompare(b.file);
    });
  };

  // Get unique values for filters
  const getUniqueFiles = (): string[] => {
    if (!analysisResults) return [];
    return [...new Set(analysisResults.files.map(f => f.file))].sort();
  };

  const getUniqueAgents = (): string[] => {
    return ['security', 'performance', 'complexity', 'documentation'];
  };

  const getUniqueSeverities = (): string[] => {
    return ['critical', 'high', 'medium', 'low'];
  };

  // Pagination
  const filteredIssues = getFilteredIssues();
  const totalPages = Math.ceil(filteredIssues.length / issuesPerPage);
  const startIndex = (currentPage - 1) * issuesPerPage;
  const paginatedIssues = filteredIssues.slice(startIndex, startIndex + issuesPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAgent, selectedFile, selectedSeverity, searchTerm]);

  // Existing useEffects for monitoring analysis...
  useEffect(() => {
    const loadSavedContext = () => {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
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
          localStorage.removeItem(localStorageKey);
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

  const getAgentIcon = (agent: string) => {
    const icons = {
      'security': Shield,
      'performance': Zap,
      'complexity': BarChart3,
      'documentation': FileSearch
    };
    const IconComponent = icons[agent.toLowerCase() as keyof typeof icons] || Bug;
    return <IconComponent className="w-4 h-4" />;
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

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-600" />;
      case 'low': return <Info className="w-4 h-4 text-green-600" />;
      default: return <Bug className="w-4 h-4 text-gray-600" />;
    }
  };

  const toggleIssueExpansion = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const clearAllFilters = () => {
    setSelectedAgent('all');
    setSelectedFile('all');
    setSelectedSeverity('all');
    setSearchTerm('');
  };

  // Prepare chart data (existing logic)
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

  // Local storage utilities
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
      {jobId && (
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      )}
      
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

          {/* File Progress List */}
          <FileProgressList />

          {/* RESULTS SECTION */}
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

              {/* Tabbed Interface */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="detailed">Detailed Issues ({filteredIssues.length})</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <div className="grid lg:grid-cols-3 gap-6">
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
                </TabsContent>

                {/* DETAILED ISSUES TAB */}
                <TabsContent value="detailed" className="space-y-6">
                  {getAllIssues().length > 0 ? (
                    <>
                      {/* Filters */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filter Issues ({filteredIssues.length} of {getAllIssues().length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Search */}
                            <div className="lg:col-span-2">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                  placeholder="Search issues..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                            </div>

                            {/* Agent Filter */}
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                              <SelectTrigger>
                                <SelectValue placeholder="All Agents" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Agents</SelectItem>
                                {getUniqueAgents().map(agent => (
                                  <SelectItem key={agent} value={agent}>
                                    <div className="flex items-center gap-2">
                                      {getAgentIcon(agent)}
                                      {agent.charAt(0).toUpperCase() + agent.slice(1)}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* File Filter */}
                            <Select value={selectedFile} onValueChange={setSelectedFile}>
                              <SelectTrigger>
                                <SelectValue placeholder="All Files" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Files</SelectItem>
                                {getUniqueFiles().map(file => (
                                  <SelectItem key={file} value={file}>
                                    {file}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Severity Filter */}
                            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                              <SelectTrigger>
                                <SelectValue placeholder="All Severities" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Severities</SelectItem>
                                {getUniqueSeverities().map(severity => (
                                  <SelectItem key={severity} value={severity}>
                                    <div className="flex items-center gap-2">
                                      {getSeverityIcon(severity)}
                                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Active filters display */}
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            {selectedAgent !== 'all' && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                {getAgentIcon(selectedAgent)}
                                {selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => setSelectedAgent('all')}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            )}
                            {selectedFile !== 'all' && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <FileCode className="w-3 h-3" />
                                {selectedFile}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => setSelectedFile('all')}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            )}
                            {selectedSeverity !== 'all' && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                {getSeverityIcon(selectedSeverity)}
                                {selectedSeverity.charAt(0).toUpperCase() + selectedSeverity.slice(1)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => setSelectedSeverity('all')}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            )}
                            {searchTerm && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Search className="w-3 h-3" />
                                "{searchTerm}"
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => setSearchTerm('')}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Badge>
                            )}
                            {(selectedAgent !== 'all' || selectedFile !== 'all' || selectedSeverity !== 'all' || searchTerm) && (
                              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                                Clear All Filters
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Issues List */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" />
                              Detailed Issues ({filteredIssues.length})
                            </span>
                            <div className="flex items-center gap-2">
                              <Select value={issuesPerPage.toString()} onValueChange={(value) => setIssuesPerPage(parseInt(value))}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10 per page</SelectItem>
                                  <SelectItem value="20">20 per page</SelectItem>
                                  <SelectItem value="50">50 per page</SelectItem>
                                  <SelectItem value="100">100 per page</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {filteredIssues.length > 0 ? (
                            <>
                              <div className="space-y-4">
                                {paginatedIssues.map((issue, index) => (
                                  <div key={issue.id} className="border rounded-lg">
                                    <div 
                                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                      onClick={() => toggleIssueExpansion(issue.id)}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                          <div className="flex items-center gap-2">
                                            {expandedIssues.has(issue.id) ? (
                                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                              {startIndex + index + 1}
                                            </span>
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <h4 className="font-semibold text-sm">{issue.title}</h4>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-xs ${getSeverityTextColor(issue.severity)}`}>
                                                  {getSeverityIcon(issue.severity)}
                                                  {issue.severity.toUpperCase()}
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                                  {getAgentIcon(issue.agent)}
                                                  {issue.agent}
                                                </Badge>
                                              </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                              {issue.description}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                              <span className="flex items-center gap-1">
                                                <FileCode className="w-3 h-3" />
                                                {issue.file}
                                              </span>
                                              <span>Line {issue.line}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {expandedIssues.has(issue.id) && (
                                      <div className="px-4 pb-4 border-t bg-muted/20">
                                        <div className="mt-4 space-y-3">
                                          <div>
                                            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                                              <Info className="w-4 h-4 text-blue-600" />
                                              Full Description
                                            </h5>
                                            <p className="text-sm text-muted-foreground bg-white p-3 rounded border">
                                              {issue.description}
                                            </p>
                                          </div>
                                          
                                          {issue.suggestion && (
                                            <div>
                                              <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                                                💡 Suggested Fix
                                              </h5>
                                              <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                                                <p className="text-sm text-blue-700">{issue.suggestion}</p>
                                              </div>
                                            </div>
                                          )}
                                          
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground">File</p>
                                              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                                                {issue.file}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground">Line</p>
                                              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                                                {issue.line}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground">Agent</p>
                                              <Badge variant="secondary" className="text-xs mt-1 flex items-center gap-1 w-fit">
                                                {getAgentIcon(issue.agent)}
                                                {issue.agent}
                                              </Badge>
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground">Severity</p>
                                              <Badge variant="outline" className={`text-xs mt-1 flex items-center gap-1 w-fit ${getSeverityTextColor(issue.severity)}`}>
                                                {getSeverityIcon(issue.severity)}
                                                {issue.severity.toUpperCase()}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Pagination */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                  <p className="text-sm text-muted-foreground">
                                    Showing {startIndex + 1} to {Math.min(startIndex + issuesPerPage, filteredIssues.length)} of {filteredIssues.length} issues
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                      disabled={currentPage === 1}
                                    >
                                      Previous
                                    </Button>
                                    <span className="text-sm px-3 py-1 bg-muted rounded">
                                      Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                      disabled={currentPage === totalPages}
                                    >
                                      Next
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-12">
                              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                              <p className="text-muted-foreground">
                                {(selectedAgent !== 'all' || selectedFile !== 'all' || selectedSeverity !== 'all' || searchTerm) 
                                  ? 'No issues match your current filters.' 
                                  : 'Your code analysis completed successfully with no issues detected.'}
                              </p>
                              {(selectedAgent !== 'all' || selectedFile !== 'all' || selectedSeverity !== 'all' || searchTerm) && (
                                <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                                  Clear All Filters
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card className="p-12 text-center">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Issues Found!</h3>
                      <p className="text-muted-foreground">
                        Your code analysis completed successfully with no issues detected.
                      </p>
                    </Card>
                  )}
                </TabsContent>

                {/* FILES TAB */}
                <TabsContent value="files" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCode className="w-5 h-5" />
                        Analyzed Files Summary ({analysisResults.files.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResults.files.map((file, index) => (
                          <div key={index} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileCode className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{file.file}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {file.language} • {file.lines} lines
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant={file.issues_count > 0 ? "destructive" : "outline"}
                                  className="text-sm"
                                >
                                  {file.issues_count} {file.issues_count === 1 ? 'issue' : 'issues'}
                                </Badge>
                                {file.issues_count === 0 && (
                                  <CheckCircle className="w-5 h-5 text-success" />
                                )}
                              </div>
                            </div>
                            
                            {file.issues_count > 0 && (
                              <div className="border-t pt-3">
                                <h4 className="font-medium text-sm mb-2">Issues in this file:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                  <div className="p-2 rounded bg-red-50">
                                    <p className="text-sm font-medium text-red-700">Security</p>
                                    <p className="text-lg font-bold text-red-600">
                                      {file.issues.filter(i => i.agent.toLowerCase() === 'security').length}
                                    </p>
                                  </div>
                                  <div className="p-2 rounded bg-orange-50">
                                    <p className="text-sm font-medium text-orange-700">Performance</p>
                                    <p className="text-lg font-bold text-orange-600">
                                      {file.issues.filter(i => i.agent.toLowerCase() === 'performance').length}
                                    </p>
                                  </div>
                                  <div className="p-2 rounded bg-blue-50">
                                    <p className="text-sm font-medium text-blue-700">Complexity</p>
                                    <p className="text-lg font-bold text-blue-600">
                                      {file.issues.filter(i => i.agent.toLowerCase() === 'complexity').length}
                                    </p>
                                  </div>
                                  <div className="p-2 rounded bg-green-50">
                                    <p className="text-sm font-medium text-green-700">Documentation</p>
                                    <p className="text-lg font-bold text-green-600">
                                      {file.issues.filter(i => i.agent.toLowerCase() === 'documentation').length}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Show severity breakdown for this file */}
                                <div className="mt-3 flex items-center gap-2">
                                  <span className="text-sm font-medium">Severity:</span>
                                  {['critical', 'high', 'medium', 'low'].map(severity => {
                                    const count = file.issues.filter(i => i.severity.toLowerCase() === severity).length;
                                    if (count === 0) return null;
                                    return (
                                      <Badge 
                                        key={severity} 
                                        variant="outline" 
                                        className={`text-xs ${getSeverityTextColor(severity)}`}
                                      >
                                        {severity}: {count}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
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
                <Button onClick={() => navigate('/')} variant="default">
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