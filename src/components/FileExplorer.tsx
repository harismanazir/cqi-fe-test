import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Search,
  FileCode,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  score?: number;
  issues?: number;
  language?: string;
  lastModified?: string;
  size?: string;
}

interface FileExplorerProps {
  onFileSelect: (fileId: string | null) => void;
  selectedFile: string | null;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, selectedFile }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root', 'src']));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'issues' | 'high-score'>('all');

  const fileTree: FileNode = {
    id: 'root',
    name: 'project-root',
    type: 'folder',
    path: '/',
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        path: '/src',
        children: [
          {
            id: 'components',
            name: 'components',
            type: 'folder',
            path: '/src/components',
            children: [
              {
                id: 'auth',
                name: 'Auth.tsx',
                type: 'file',
                path: '/src/components/Auth.tsx',
                score: 87,
                issues: 3,
                language: 'typescript',
                lastModified: '2h ago',
                size: '2.3 KB'
              },
              {
                id: 'dashboard',
                name: 'Dashboard.tsx',
                type: 'file',
                path: '/src/components/Dashboard.tsx',
                score: 92,
                issues: 1,
                language: 'typescript',
                lastModified: '1h ago',
                size: '4.1 KB'
              },
              {
                id: 'sidebar',
                name: 'Sidebar.tsx',
                type: 'file',
                path: '/src/components/Sidebar.tsx',
                score: 76,
                issues: 8,
                language: 'typescript',
                lastModified: '3h ago',
                size: '1.8 KB'
              }
            ]
          },
          {
            id: 'services',
            name: 'services',
            type: 'folder',
            path: '/src/services',
            children: [
              {
                id: 'api',
                name: 'api.ts',
                type: 'file',
                path: '/src/services/api.ts',
                score: 94,
                issues: 0,
                language: 'typescript',
                lastModified: '5h ago',
                size: '3.2 KB'
              },
              {
                id: 'auth-service',
                name: 'auth.service.ts',
                type: 'file',
                path: '/src/services/auth.service.ts',
                score: 68,
                issues: 12,
                language: 'typescript',
                lastModified: '1d ago',
                size: '5.7 KB'
              }
            ]
          },
          {
            id: 'utils',
            name: 'utils',
            type: 'folder',
            path: '/src/utils',
            children: [
              {
                id: 'helpers',
                name: 'helpers.ts',
                type: 'file',
                path: '/src/utils/helpers.ts',
                score: 89,
                issues: 2,
                language: 'typescript',
                lastModified: '6h ago',
                size: '1.4 KB'
              }
            ]
          }
        ]
      },
      {
        id: 'package',
        name: 'package.json',
        type: 'file',
        path: '/package.json',
        score: 100,
        issues: 0,
        language: 'json',
        lastModified: '2d ago',
        size: '0.8 KB'
      }
    ]
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.id) ? ChevronDown : ChevronRight;
    }
    return FileCode;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-muted';
    if (score >= 90) return 'bg-success/10 border-success/20';
    if (score >= 80) return 'bg-warning/10 border-warning/20';
    return 'bg-destructive/10 border-destructive/20';
  };

  const shouldShowFile = (file: FileNode): boolean => {
    if (file.type === 'folder') return true;
    
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    if (filterBy === 'issues' && (!file.issues || file.issues === 0)) {
      return false;
    }
    
    if (filterBy === 'high-score' && (!file.score || file.score < 90)) {
      return false;
    }
    
    return true;
  };

  const renderFileNode = (node: FileNode, level: number = 0): React.ReactNode => {
    if (!shouldShowFile(node) && node.type === 'file') return null;
    
    const Icon = getFileIcon(node);
    const hasVisibleChildren = node.children?.some(child => 
      shouldShowFile(child) || (child.type === 'folder' && child.children?.some(shouldShowFile))
    );
    
    if (node.type === 'folder' && !hasVisibleChildren) return null;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
            selectedFile === node.id ? 'bg-primary/10 border border-primary/20' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.id);
            } else {
              onFileSelect(node.id);
            }
          }}
        >
          <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          
          <span className="flex-1 text-sm font-medium truncate">
            {node.name}
          </span>
          
          {node.type === 'file' && node.score && (
            <Badge 
              variant="outline" 
              className={`text-xs ${getScoreBg(node.score)} ${getScoreColor(node.score)}`}
            >
              {node.score}
            </Badge>
          )}
          
          {node.type === 'file' && node.issues && node.issues > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-warning" />
              <span className="text-xs text-warning">{node.issues}</span>
            </div>
          )}
          
          {node.type === 'file' && (!node.issues || node.issues === 0) && node.score && node.score >= 90 && (
            <CheckCircle className="w-3 h-3 text-success" />
          )}
        </div>
        
        {node.type === 'folder' && expandedFolders.has(node.id) && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary" />
          File Explorer
        </CardTitle>
        
        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterBy === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterBy('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={filterBy === 'issues' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterBy('issues')}
              className="text-xs"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Issues
            </Button>
            <Button
              variant={filterBy === 'high-score' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterBy('high-score')}
              className="text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              High Score
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 max-h-[600px] overflow-y-auto">
        <div className="p-4 space-y-1">
          {renderFileNode(fileTree)}
        </div>
      </CardContent>
      
      {/* File Details */}
      {selectedFile && (
        <div className="border-t border-border p-4 bg-muted/20">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-primary" />
            File Details
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Language:</span>
              <span>TypeScript</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>2.3 KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modified:</span>
              <span>2h ago</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Score:</span>
              <Badge variant="outline" className="text-xs">87/100</Badge>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};