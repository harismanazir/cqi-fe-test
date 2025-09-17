import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitHubUpload } from './GitHubUpload';
import { 
  Upload, 
  File, 
  Folder, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileCode,
  Archive,
  Loader2,
  Github,
  HardDrive,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient, UploadedFile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UploadedFileUI {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  path?: string;
}

interface FileUploadProps {
  onAnalysisStart?: (jobId: string, metadata?: any) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onAnalysisStart }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadedFileUI[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDir, setUploadDir] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [showProcessingNotice, setShowProcessingNotice] = useState(false);
  const [hasStartedUpload, setHasStartedUpload] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = async (fileList: File[]) => {
    try {
      console.log('[FileUpload] Starting file upload process...');
      
      // Show processing notice when upload starts
      setShowProcessingNotice(true);
      setHasStartedUpload(true);
      
      const newFiles: UploadedFileUI[] = fileList.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0
      }));

      setFiles(prev => [...prev, ...newFiles]);
      setIsUploading(true);

      // ✅ FIXED: Synchronized progress simulation
      let globalProgress = 0;
      const progressInterval = setInterval(() => {
        globalProgress += Math.random() * 15 + 10; // More consistent increments (10-25%)
        
        if (globalProgress >= 95) {
          globalProgress = 95; // Stop at 95% until real upload completes
          clearInterval(progressInterval);
        }
        
        // Update all files with the same progress
        setFiles(prev => prev.map(file => {
          if (newFiles.some(nf => nf.id === file.id) && file.status === 'uploading') {
            return { ...file, progress: Math.min(globalProgress, 95) };
          }
          return file;
        }));
      }, 300); // Slightly slower, more realistic

      // Upload files to backend using real API
      console.log('[FileUpload] Calling API uploadFiles...');
      const result = await apiClient.uploadFiles(fileList);
      console.log('[FileUpload] Upload response:', result);
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // ✅ FIXED: Handle ZIP extraction properly
      let completedFiles: UploadedFileUI[];
      
      const hasZipFiles = fileList.some(file => file.name.endsWith('.zip'));
      
      if (hasZipFiles) {
        // ZIP files were uploaded - use extracted files from backend
        console.log('[FileUpload] ZIP detected, using extracted files from backend');
        console.log('[FileUpload] Backend returned files:', result.files);
        
        completedFiles = result.files.map(backendFile => ({
          id: Math.random().toString(36).substr(2, 9),
          name: backendFile.name,        // ✅ Extracted file name
          size: backendFile.size,        // ✅ Extracted file size  
          type: backendFile.type,        // ✅ "code" type
          status: 'completed' as const,
          progress: 100,
          path: backendFile.path         // ✅ Extracted file path for analysis
        }));
        
        console.log('[FileUpload] Completed files after ZIP extraction:', completedFiles);
        
        // Smooth transition to 100% for all files before replacing
        setFiles(prev => prev.map(file => {
          if (newFiles.some(nf => nf.id === file.id)) {
            return { ...file, progress: 100, status: 'completed' };
          }
          return file;
        }));
        
        // Replace with extracted files after a short delay for smooth UX
        setTimeout(() => {
          setFiles(completedFiles);
        }, 500);
        
      } else {
        // Regular files - map normally with synchronized completion
        console.log('[FileUpload] Regular files, mapping normally');
        completedFiles = result.files.map((backendFile, index) => ({
          ...newFiles[index],
          status: 'completed' as const,
          progress: 100,
          path: backendFile.path
        }));
        
        // Update all files to 100% simultaneously
        setFiles(prev => {
          const updated = [...prev];
          completedFiles.forEach((completedFile, index) => {
            const fileIndex = updated.findIndex(f => f.id === newFiles[index].id);
            if (fileIndex !== -1) {
              updated[fileIndex] = completedFile;
            }
          });
          return updated;
        });
      }

      setUploadDir(result.upload_dir);
      setIsUploading(false);

      const fileCount = completedFiles.length;
      const fileType = hasZipFiles ? 'extracted from ZIP' : 'uploaded';

      toast({
        title: "Upload Successful!",
        description: `${fileCount} files ${fileType} successfully.`,
      });

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Mark all new files as error with synchronized update
      setFiles(prev => prev.map(file => 
        newFiles.some(nf => nf.id === file.id) 
          ? { ...file, status: 'error', progress: 0 }
          : file
      ));
      
      setIsUploading(false);

      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    }
  };

  const handleAnalyze = async () => {
    try {
      console.log('[FileUpload] Starting analysis...');
      
      const filePaths = files
        .filter(file => file.status === 'completed' && file.path)
        .map(file => file.path!);

      console.log('[FileUpload] File paths for analysis:', filePaths);

      if (filePaths.length === 0) {
        toast({
          title: "No Files Ready",
          description: "Please upload files before starting analysis.",
          variant: "destructive"
        });
        return;
      }

      setIsAnalyzing(true);
      
      // Generate job ID
      const jobId = crypto.randomUUID();
      console.log('[FileUpload] Generated job ID:', jobId);
      
      // Start analysis using real API
      const result = await apiClient.startAnalysis(filePaths, jobId);
      console.log('[FileUpload] Analysis started:', result);
      
      toast({
        title: "Analysis Started!",
        description: "Redirecting to dashboard to monitor progress...",
      });

      // Navigate to dashboard immediately
      const params = new URLSearchParams({
        job_id: jobId,
        upload_dir: uploadDir
      });
      
      navigate(`/dashboard?${params.toString()}`);
      
      // Call parent callback if provided
      if (onAnalysisStart) {
        onAnalysisStart(jobId, {
          upload_dir: uploadDir,
          file_count: filePaths.length,
          source: 'file_upload'
        });
      }
      
    } catch (error) {
      console.error('Analysis failed to start:', error);
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to start analysis",
        variant: "destructive"
      });
    }
  };

  const handleGitHubAnalysisStart = (jobId: string, repoInfo: any) => {
    console.log('[FileUpload] GitHub analysis started:', jobId, repoInfo);
    
    // Show processing notice when GitHub analysis starts
    setShowProcessingNotice(true);
    setHasStartedUpload(true);
    
    // Navigate using upload_dir for both flows
    const params = new URLSearchParams({
      job_id: jobId,
      upload_dir: repoInfo.upload_dir || '',  // CRITICAL: Pass upload_dir
      // Keep GitHub metadata for display purposes
      github_repo: encodeURIComponent(repoInfo.full_name || repoInfo.repo_url || ''),
      branch: repoInfo.branch || 'main'
    });
    
    console.log('[FileUpload] Navigating with params:', params.toString());
    
    navigate(`/dashboard?${params.toString()}`);
    
    // Call parent callback if provided
    if (onAnalysisStart) {
      onAnalysisStart(jobId, {
        ...repoInfo,
        source: 'github'
      });
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go'].includes(extension || '')) {
      return FileCode;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return Archive;
    }
    return File;
  };

  // Updated conditions for better state management
  const hasCompletedFiles = files.some(file => file.status === 'completed');
  const allFilesCompleted = files.length > 0 && files.every(file => file.status === 'completed');
  const hasFailedFiles = files.some(file => file.status === 'error');
  const hasUploadingFiles = files.some(file => file.status === 'uploading');

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Processing Notice - Shows when upload/analysis starts */}
      {showProcessingNotice && hasStartedUpload && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
              Processing Time Notice
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              Processing time scales with file count and complexity. Large repositories 
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="github" className="flex items-center gap-2">
            <Github className="w-4 h-4" />
            GitHub Repository
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="space-y-6">
          {/* File Upload Area */}
          <Card 
            className={`transition-all duration-300 border-2 border-dashed cursor-pointer group hover:shadow-medium ${
              isDragOver 
                ? 'border-primary bg-primary/5 shadow-glow' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <CardContent className="p-12 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 transition-all duration-300 ${
                isDragOver ? 'bg-primary text-white animate-bounce' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
              }`}>
                <Upload className="w-10 h-10" />
              </div>
              
              <h3 className="text-xl font-semibold mb-2">
                {isDragOver ? 'Drop files here' : 'Upload your code files'}
              </h3>
              
              <p className="text-muted-foreground mb-6">
                Drag and drop files, folders, or click to browse
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground mb-6">
                <span className="px-3 py-1 bg-secondary rounded-full">.js</span>
                <span className="px-3 py-1 bg-secondary rounded-full">.ts</span>
                <span className="px-3 py-1 bg-secondary rounded-full">.py</span>
                <span className="px-3 py-1 bg-secondary rounded-full">.java</span>
                <span className="px-3 py-1 bg-secondary rounded-full">.zip</span>
                <span className="px-3 py-1 bg-secondary rounded-full">+more</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="hero" size="lg" className="group-hover:animate-glow" disabled={isUploading}>
                  <Folder className="w-5 h-5 mr-2" />
                  Choose Files
                </Button>
                <Button variant="outline" size="lg" disabled={isUploading}>
                  <Archive className="w-5 h-5 mr-2" />
                  Upload ZIP
                </Button>
              </div>
              
              <input
                id="file-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInput}
                accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.zip,.rar,.7z"
                disabled={isUploading}
              />
            </CardContent>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">
                    {files.some(f => f.name.endsWith('.zip') || f.type === 'code') ? 'Code Files' : 'Uploaded Files'} ({files.length})
                  </h4>
                  {allFilesCompleted && (
                    <Button 
                      onClick={handleAnalyze}
                      variant="hero"
                      size="sm"
                      disabled={isUploading || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze Code'
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Global Upload Progress */}
                {hasUploadingFiles && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">Upload Progress</span>
                      <span className="text-sm text-blue-600">
                        {Math.round(files.find(f => f.status === 'uploading')?.progress || 0)}%
                      </span>
                    </div>
                    <Progress 
                      value={files.find(f => f.status === 'uploading')?.progress || 0} 
                      className="h-2"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  {files.map((file) => {
                    const FileIcon = getFileIcon(file.name);
                    return (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileIcon className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <div className="flex items-center gap-2">
                              {file.status === 'completed' && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                              {file.status === 'error' && (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                              {file.status === 'uploading' && (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(file.id);
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                disabled={isUploading}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Progress value={file.progress} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          
                          {file.status === 'error' && (
                            <p className="text-xs text-red-600 mt-1">Upload failed</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Status Messages */}
                {hasUploadingFiles && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                      Uploading files... Please wait.
                    </p>
                  </div>
                )}

                {hasFailedFiles && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      Some files failed to upload. Remove them and try again, or proceed with the successful uploads.
                    </p>
                  </div>
                )}

                {allFilesCompleted && files.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      All files ready for analysis! Click "Analyze Code" to start.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="github" className="space-y-6">
          <GitHubUpload onAnalysisStart={handleGitHubAnalysisStart} />
        </TabsContent>
      </Tabs>

      {/* Quick Start Tips */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-2 flex items-center">
            <CheckCircle className="w-5 h-5 text-primary mr-2" />
            Quick Start Tips
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Upload individual files or entire project folders</li>
            <li>• Analyze GitHub repositories directly with branch selection</li>
            <li>• ZIP files are automatically extracted and analyzed</li>
            <li>• Get instant security, performance, and quality insights</li>
            <li>• Ask questions about your code with AI-powered chat</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};