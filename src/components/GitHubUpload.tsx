import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Github, 
  GitBranch, 
  Star, 
  GitFork, 
  Calendar, 
  Code, 
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Info,
  X
} from 'lucide-react';
import { apiClient, GitHubValidationResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface GitHubUploadProps {
  onAnalysisStart?: (jobId: string, repoInfo: any) => void;
}

export const GitHubUpload: React.FC<GitHubUploadProps> = ({ onAnalysisStart }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [repoInfo, setRepoInfo] = useState<GitHubValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showProcessingNotice, setShowProcessingNotice] = useState(false);
  const [hasValidatedRepo, setHasValidatedRepo] = useState(false);
  const { toast } = useToast();

  const handleValidateRepo = async () => {
    if (!repoUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a GitHub repository URL",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    try {
      console.log('[GitHub] Validating repository:', repoUrl);
      const result = await apiClient.validateGitHubRepository(repoUrl);
      console.log('[GitHub] Validation result:', result);
      
      setRepoInfo(result);
      
      if (result.valid) {
        // Show processing notice when validation is successful
        setShowProcessingNotice(true);
        setHasValidatedRepo(true);
        
        setSelectedBranch(result.default_branch || 'main');
        toast({
          title: "Repository Found",
          description: `${result.full_name} is ready for analysis`,
        });
      } else {
        toast({
          title: "Repository Not Found",
          description: result.error || "Invalid repository URL",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('GitHub validation error:', error);
      setRepoInfo({ valid: false, error: error instanceof Error ? error.message : 'Validation failed' });
      toast({
        title: "Validation Failed",
        description: "Unable to validate repository. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

const handleAnalyzeRepo = async () => {
  if (!repoInfo?.valid) {
    toast({
      title: "Repository Not Validated",
      description: "Please validate the repository first",
      variant: "destructive"
    });
    return;
  }

  setIsAnalyzing(true);
  try {
    console.log('[GitHub] Starting analysis for:', repoUrl, 'branch:', selectedBranch);
    
    const result = await apiClient.analyzeGitHubRepository({
      repo_url: repoUrl,
      branch: selectedBranch,
      agents: ['security', 'performance', 'complexity', 'documentation'],
      detailed: true
    });
    
    console.log('[GitHub] Analysis started:', result);
    
    toast({
      title: "Analysis Started",
      description: `Analyzing ${result.files_analyzed} files from ${repoInfo.full_name}`,
    });

    // FIXED: Call parent callback with upload_dir from result
    if (onAnalysisStart) {
      onAnalysisStart(result.job_id, {
        full_name: repoInfo.full_name,
        branch: selectedBranch,
        repo_url: repoUrl,
        upload_dir: result.upload_dir,  // CRITICAL: Pass the temp directory as upload_dir
        source: 'github',
        ...result
      });
    }
    
  } catch (error) {
    console.error('GitHub analysis error:', error);
    toast({
      title: "Analysis Failed",
      description: error instanceof Error ? error.message : "Unable to start analysis",
      variant: "destructive"
    });
  } finally {
    setIsAnalyzing(false);
  }
};

  const formatFileSize = (sizeKb: number) => {
    if (sizeKb < 1024) return `${sizeKb} KB`;
    return `${(sizeKb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Processing Notice - Shows when repository is validated successfully */}
      {showProcessingNotice && hasValidatedRepo && repoInfo?.valid && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
              Processing Time Notice
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              Processing time scales with repository size and complexity. Large repositories 
              may experience extended analysis times. Thank you for your patience.
            </p>
          </div>
          <button
            onClick={() => setShowProcessingNotice(false)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Repository Info - Shows above input when validated */}
      {repoInfo && (
        <Card className={`${repoInfo.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-6">
            {repoInfo.valid ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                      <Github className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{repoInfo.full_name}</h3>
                      {repoInfo.description && (
                        <p className="text-sm text-muted-foreground">{repoInfo.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <Button variant="ghost" size="sm" onClick={() => window.open(`https://github.com/${repoInfo.full_name}`, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Repository Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {repoInfo.language && (
                    <div className="text-center p-3 rounded-lg bg-blue-50">
                      <Code className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs text-blue-600 font-medium">{repoInfo.language}</p>
                    </div>
                  )}
                  
                  {typeof repoInfo.stars === 'number' && (
                    <div className="text-center p-3 rounded-lg bg-yellow-50">
                      <Star className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                      <p className="text-xs text-yellow-600 font-medium">{repoInfo.stars}</p>
                    </div>
                  )}
                  
                  {typeof repoInfo.forks === 'number' && (
                    <div className="text-center p-3 rounded-lg bg-purple-50">
                      <GitFork className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-xs text-purple-600 font-medium">{repoInfo.forks}</p>
                    </div>
                  )}
                  
                  {repoInfo.size_kb && (
                    <div className="text-center p-3 rounded-lg bg-green-50">
                      <Globe className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xs text-green-600 font-medium">{formatFileSize(repoInfo.size_kb)}</p>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {repoInfo.default_branch && (
                    <Badge variant="outline">Default: {repoInfo.default_branch}</Badge>
                  )}
                  {repoInfo.is_fork && <Badge variant="outline">Fork</Badge>}
                  {repoInfo.is_private && <Badge variant="outline">Private</Badge>}
                  {repoInfo.last_update && (
                    <Badge variant="outline">Updated: {formatDate(repoInfo.last_update)}</Badge>
                  )}
                  {typeof repoInfo.open_issues === 'number' && repoInfo.open_issues > 0 && (
                    <Badge variant="outline">{repoInfo.open_issues} open issues</Badge>
                  )}
                </div>

                {/* Branch Selection - Moved here from input card */}
                {repoInfo.branches && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Branch</label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {repoInfo.branches.map((branch) => (
                          <SelectItem key={branch} value={branch}>
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4" />
                              {branch}
                              {branch === repoInfo.default_branch && (
                                <Badge variant="secondary" className="text-xs">default</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Analyze Button - Moved here from input card */}
                <Button
                  onClick={handleAnalyzeRepo}
                  disabled={isAnalyzing}
                  variant="hero"
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Analysis...
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4 mr-2" />
                      Analyze Repository
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Repository validation failed</p>
                  <p className="text-sm text-red-600">{repoInfo.error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GitHub URL Input */}
      <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Analyze GitHub Repository
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Repository URL</label>
            <div className="flex gap-2">
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                disabled={isValidating || isAnalyzing}
                className="flex-1"
              />
              <Button
                onClick={handleValidateRepo}
                disabled={isValidating || isAnalyzing || !repoUrl.trim()}
                variant="outline"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-2 flex items-center text-blue-800">
            <Github className="w-5 h-5 mr-2" />
            GitHub Analysis Tips
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Supports both public and private repositories (with proper access)</li>
            <li>• Automatically detects and analyzes code files</li>
            <li>• Choose specific branches for focused analysis</li>
            <li>• Get comprehensive security, performance, and quality insights</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};