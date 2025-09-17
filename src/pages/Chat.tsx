import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/Sidebar';
import { 
  Send, 
  Bot, 
  User, 
  Code, 
  Loader2, 
  MessageSquare,
  Lightbulb,
  Shield,
  Zap,
  FileSearch,
  Copy,
  RefreshCw,
  Github,
  GitBranch,
  FolderOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { apiClient, ChatResponse } from '@/lib/api';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  codeSnippet?: string;
  language?: string;
}

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  speed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({ 
  content, 
  onComplete, 
  speed = 15 
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!content) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedContent(content.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [content, speed, onComplete]);

  return (
    <div className="relative">
      {formatMessage(displayedContent)}
      {isTyping && (
        <span className="inline-block w-0.5 h-5 bg-blue-500 animate-pulse ml-1" />
      )}
    </div>
  );
};

// Enhanced markdown processing function
const processMarkdownContent = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentList.length > 0) {
      const ListComponent = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <ListComponent key={elements.length} className="my-3 ml-4 space-y-1">
          {currentList}
        </ListComponent>
      );
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      flushList();
      if (elements.length > 0) {
        elements.push(<div key={`space-${lineIndex}`} className="h-2" />);
      }
      return;
    }

    // Headers
    if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={lineIndex} className="text-base font-semibold mt-6 mb-3 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500 pl-3">
          {processInlineFormatting(trimmedLine.replace('### ', ''))}
        </h4>
      );
      return;
    }
    
    if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={lineIndex} className="text-lg font-semibold mt-6 mb-3 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 pl-3">
          {processInlineFormatting(trimmedLine.replace('## ', ''))}
        </h3>
      );
      return;
    }
    
    if (trimmedLine.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={lineIndex} className="text-xl font-bold mt-6 mb-4 text-blue-800 dark:text-blue-200 border-l-4 border-blue-700 pl-3">
          {processInlineFormatting(trimmedLine.replace('# ', ''))}
        </h2>
      );
      return;
    }

    // Bullet points
    if (trimmedLine.match(/^[-*•]\s/)) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      const content = trimmedLine.replace(/^[-*•]\s/, '');
      currentList.push(
        <li key={`ul-${lineIndex}`} className="flex items-start gap-2">
          <span className="text-blue-500 mt-1">•</span>
          <span>{processInlineFormatting(content)}</span>
        </li>
      );
      return;
    }

    // Numbered lists
    if (trimmedLine.match(/^\d+\.\s/)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      const content = trimmedLine.replace(/^\d+\.\s/, '');
      currentList.push(
        <li key={`ol-${lineIndex}`} className="flex items-start gap-2">
          <span className="text-blue-500 font-medium">{currentList.length + 1}.</span>
          <span>{processInlineFormatting(content)}</span>
        </li>
      );
      return;
    }

    // Regular paragraphs
    flushList();
    if (trimmedLine) {
      elements.push(
        <p key={lineIndex} className="mb-3 leading-relaxed">
          {processInlineFormatting(trimmedLine)}
        </p>
      );
    }
  });

  flushList(); // Flush any remaining list items
  return elements;
};

// Process inline formatting (bold, italic, etc.)
const processInlineFormatting = (text: string) => {
  // Handle bold text **text**
  let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>');
  
  // Handle italic text *text*
  processed = processed.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>');
  
  // Handle inline code `code` - IMPORTANT: Do this BEFORE file path processing
  processed = processed.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400">$1</code>');
  
  // FIXED: More specific file path regex that won't break long paths
  // Only match simple filenames like "file.txt", "component.tsx", etc., not full paths
  processed = processed.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z]{1,4})\b(?![^<]*>)/g, '<span class="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">$1</span>');
  
  return <span dangerouslySetInnerHTML={{ __html: processed }} />;
};

// Enhanced formatMessage function with proper styling
const formatMessage = (content: string) => {
  // Split content by code blocks first
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const parts = content.split(codeBlockRegex);
  
  return parts.map((part, index) => {
    if (index % 3 === 1) {
      // This is a language identifier
      return null;
    } else if (index % 3 === 2) {
      // This is code content
      const language = parts[index - 1] || 'code';
      return (
        <div key={index} className="my-4">
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-t-lg border">
            <Badge variant="outline" className="text-xs font-mono">
              {language}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(part)}
              className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-b-lg overflow-x-auto border border-t-0 font-mono text-sm">
            <code>{part}</code>
          </pre>
        </div>
      );
    } else {
      // Regular text content - enhanced markdown processing
      return (
        <div key={index} className="prose prose-sm max-w-none dark:prose-invert">
          {processMarkdownContent(part)}
        </div>
      );
    }
  });
};

// Enhanced Message Component
interface MessageProps {
  message: Message;
  isTyping?: boolean;
  onTypingComplete?: () => void;
}

const MessageComponent: React.FC<MessageProps> = ({ message, isTyping = false, onTypingComplete }) => {
  const [showActions, setShowActions] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard.",
    });
  };

  return (
    <div
      className={`flex gap-4 ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {message.role === 'assistant' && (
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div
        className={`max-w-4xl relative group ${
          message.role === 'user'
            ? 'bg-blue-500 text-white shadow-lg'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm'
        } rounded-2xl px-6 py-4`}
      >
        <div className={`text-sm leading-7 ${
          message.role === 'assistant' ? 'text-gray-800 dark:text-gray-200' : 'text-white'
        }`}>
          {isTyping && message.role === 'assistant' ? (
            <TypingMessage content={message.content} speed={15} onComplete={onTypingComplete} />
          ) : (
            formatMessage(message.content)
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 border-opacity-50">
          <span className="text-xs opacity-60">
            {message.timestamp.toLocaleTimeString()}
          </span>
          <div className={`flex items-center gap-2 transition-opacity duration-200 ${
            showActions ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(message.content)}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* Add regenerate functionality */}}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
      
      {message.role === 'user' && (
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
};

// Engaging loading messages component
const EngagingLoader: React.FC<{ codebaseType: 'github' | 'upload' | 'unknown' }> = ({ codebaseType }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const githubMessages = [
    "Connecting to GitHub repository...",
    "Establishing secure connection...",
    "Loading codebase structure...",
    "Just a moment more...",
    "Almost there...",
    "Connecting to knowledge base...",
    "Preparing AI analysis...",
    "Ready to chat!"
  ];

  const uploadMessages = [
    "Loading your uploaded files...",
    "Analyzing file structure...",
    "Building knowledge base...", 
    "Just a moment more...",
    "Almost there...",
    "Connecting to AI system...",
    "Preparing intelligent insights...",
    "Ready to chat!"
  ];

  const defaultMessages = [
    "Initializing chat session...",
    "Loading codebase context...",
    "Building knowledge base...",
    "Just a moment more...",
    "Almost there...",
    "Connecting AI system...",
    "Preparing insights...",
    "Ready to chat!"
  ];

  const messages = codebaseType === 'github' ? githubMessages 
                 : codebaseType === 'upload' ? uploadMessages 
                 : defaultMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev < messages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800); // Change message every 800ms

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex gap-4 justify-start">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 transition-all duration-300">
            {messages[currentMessageIndex]}
          </span>
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [codebaseContext, setCodebaseContext] = useState<{
    type: 'upload' | 'github' | 'unknown';
    path?: string;
    repo?: string;
    branch?: string;
    context?: string;
  }>({ type: 'unknown' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Get context from URL params
  const uploadDir = searchParams.get('upload_dir');
  const githubRepo = searchParams.get('github_repo');
  const branch = searchParams.get('branch');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
  const initializeChat = async () => {
    try {
      console.log('[Chat] Initializing chat session...');
      console.log('[Chat] URL params:', { uploadDir, githubRepo, branch });
      setIsInitializing(true);
      
      // Set codebase type early for loader
      if (githubRepo) {
        setCodebaseContext(prev => ({ ...prev, type: 'github' }));
      } else if (uploadDir) {
        setCodebaseContext(prev => ({ ...prev, type: 'upload' }));
      }
      
      // UNIFIED REQUEST: Both flows use upload_dir
      const request: any = {
        upload_dir: uploadDir || '',
        github_repo: githubRepo || '',  // For context only
        branch: branch || ''           // For context only
      };
      
      console.log('[Chat] Starting chat session with request:', request);
      
      const result = await apiClient.startChatSession(request);
      console.log('[Chat] Chat session started successfully:', result);
      
      setSessionId(result.session_id);
      
      // Update context state
      if (githubRepo) {
        setCodebaseContext({ 
          type: 'github', 
          repo: decodeURIComponent(githubRepo),
          branch: branch || 'main',
          context: result.codebase_info?.context
        });
      } else {
        setCodebaseContext({ 
          type: 'upload', 
          path: uploadDir,
          context: result.codebase_info?.context
        });
      }
      
      // Create context-aware welcome message
      const welcomeMessage = createWelcomeMessage(result);
      setMessages([welcomeMessage]);
      
      toast({
        title: "Chat Ready!",
        description: `Connected to ${result.codebase_info?.context || 'your codebase'}`,
      });
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // Set fallback welcome message on error
      const fallbackMessage = createFallbackWelcomeMessage();
      setMessages([fallbackMessage]);
      
      toast({
        title: "Connection Issue",
        description: "Using demo mode. Please refresh to try again.",
        variant: "destructive"
      });
      
      setSessionId('demo-session');
    } finally {
      setIsInitializing(false);
    }
  };

  initializeChat();
}, [uploadDir, githubRepo, branch, toast]);

  // Create context-aware welcome message - ENHANCED
  const createWelcomeMessage = (result: any): Message => {
    const codebaseInfo = result.codebase_info;
    let welcomeContent = '';

    if (codebaseInfo?.github_repo) {
      // GitHub repository context
      welcomeContent = `# AI Code Assistant Connected!

I've successfully connected to your **GitHub repository** and I'm ready to help you analyze your code.

## Your GitHub Repository:
- **Repository**: \`${codebaseInfo.github_repo}\`
- **Branch**: \`${codebaseInfo.branch || 'main'}\`
- **Status**: ${codebaseInfo.status}
- **Context**: ${codebaseInfo.context}

## What I can help you with:

- **Security Analysis**: Find vulnerabilities and security issues in your repository
- **Performance Optimization**: Identify bottlenecks and improvement opportunities  
- **Code Quality**: Review complexity, maintainability, and best practices
- **Documentation**: Check for missing docs and unclear code

Ask me anything about your GitHub repository! I have full context and can provide specific, actionable insights.`;
    } else if (codebaseInfo?.path && codebaseInfo.path !== '.') {
      // File upload context
      welcomeContent = `# AI Code Assistant Connected!

I've successfully connected to your uploaded codebase and I'm ready to help you analyze your code.

## Your Codebase:
- **Location**: \`${codebaseInfo.path}\`
- **Status**: ${codebaseInfo.status}
- **Context**: ${codebaseInfo.context}

## What I can help you with:

- **Security Analysis**: Find vulnerabilities and security issues
- **Performance Optimization**: Identify bottlenecks and improvement opportunities  
- **Code Quality**: Review complexity, maintainability, and best practices
- **Documentation**: Check for missing docs and unclear code

Ask me anything about your uploaded code! I have full context and can provide specific, actionable insights.`;
    } else {
      // Default context
      welcomeContent = `# AI Code Assistant Ready!

I'm connected to your codebase and ready to help you analyze your code.

## What I can help you with:

- **Security Analysis**: Find vulnerabilities and security issues
- **Performance Optimization**: Identify bottlenecks and improvement opportunities  
- **Code Quality**: Review complexity, maintainability, and best practices
- **Documentation**: Check for missing docs and unclear code

Ask me anything about your code! I have context and can provide specific, actionable insights.`;
    }

    return {
      id: 'welcome',
      content: welcomeContent,
      role: 'assistant',
      timestamp: new Date()
    };
  };

  // Create fallback welcome message for demo mode
  const createFallbackWelcomeMessage = (): Message => {
    return {
      id: 'welcome',
      content: `# AI Code Assistant (Demo Mode)

I'm here to help you analyze your codebase, but I'm currently running in demo mode due to a connection issue.

## What I can help you with:

- **Security Analysis**: Find vulnerabilities and security issues
- **Performance Optimization**: Identify bottlenecks and improvement opportunities  
- **Code Quality**: Review complexity, maintainability, and best practices
- **Documentation**: Check for missing docs and unclear code

Ask me anything about your code! I'll provide helpful responses using demo data.

**Note**: To access your actual codebase, please refresh the page and try again.`,
      role: 'assistant',
      timestamp: new Date()
    };
  };

  // Reduced to only 2 quick questions as requested
  const quickQuestions = [
    {
      icon: Shield,
      text: "Find security vulnerabilities in my code",
      color: "text-red-600 bg-red-50 border-red-200"
    },
    {
      icon: Zap,
      text: "How can I improve performance?",
      color: "text-orange-600 bg-orange-50 border-orange-200"
    }
  ];

  // Enhanced AI responses based on the analysis output format
  const getEnhancedResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Add context information to responses
    const contextInfo = codebaseContext.type === 'github' 
      ? `GitHub repository **${codebaseContext.repo}** (branch: ${codebaseContext.branch})`
      : codebaseContext.type === 'upload'
      ? `uploaded codebase from \`${codebaseContext.path}\``
      : 'your codebase';
    
    if (message.includes('security') || message.includes('vulnerabilit')) {
      return `## Security Analysis Results

Based on the **LangGraph multi-agent analysis** of ${contextInfo}, here are the key security findings:

### Critical/High Issues Found:

**Hardcoded Credentials Detected**
- **Location**: Line 13 in main configuration files
- **Risk Level**: **Critical**
- **Description**: API keys found directly in code files
- **Impact**: Exposure of sensitive credentials to version control

**Input Validation Issues**
- **Location**: Multiple endpoints and functions  
- **Risk Level**: **High**
- **Description**: Unvalidated user input detected
- **Impact**: Potential injection attacks (SQL, XSS, Command)

### Immediate Action Required:

1. **Move secrets to environment variables**
   \`\`\`python
   # Instead of:
   API_KEY = "sk-1234567890abcdef"
   
   # Use:
   import os
   API_KEY = os.getenv('API_KEY')
   \`\`\`

2. **Implement input validation**
3. **Add security scanning to CI/CD pipeline**

### Questions for you:
- Would you like me to show you how to fix the hardcoded credentials?
- Should I explain how to implement proper input validation?
- Do you want details about setting up automated security scanning?`;
    }
    
    if (message.includes('performance') || message.includes('optimize')) {
      return `## Performance Analysis Complete

The **LangGraph Performance Agent** identified several optimization opportunities in ${contextInfo}:

### High Impact Improvements:

**Inefficient String Operations**
- **Issue**: Multiple string concatenations detected
- **Impact**: 40-60% performance improvement possible
- **Solution**: Use f-strings or \`join()\` methods

\`\`\`python
# Instead of:
result = ""
for item in items:
    result += str(item) + ", "

# Use:
result = ", ".join(str(item) for item in items)
\`\`\`

**Unnecessary Object Creation**
- **Issue**: Heavy objects created repeatedly
- **Impact**: High memory usage and GC pressure
- **Solution**: Implement object pooling or caching

**I/O Bottlenecks**
- **Issue**: Blocking operations identified
- **Solution**: Implement async/await patterns

### Performance Metrics:
- **Current Processing Time**: ~19.14s
- **Optimization Potential**: Up to 50% improvement
- **Memory Usage**: Can be reduced by 30%

### Questions for you:
- Which optimization should we tackle first?
- Would you like code examples for async implementation?
- Should I analyze specific functions for performance?`;
    }
    
    if (message.includes('quality') || message.includes('review') || message.includes('complexity')) {
      return `## Code Quality Assessment

**LangGraph Multi-Agent Analysis Results** for ${contextInfo}:

### Overall Analysis:
- **Files Analyzed**: Multiple code files processed
- **Total Issues**: **21 issues** across all categories  
- **Processing Time**: 19.14 seconds
- **Confidence Level**: 85% average

### Issue Breakdown by Agent:

| Agent | Issues Found | Confidence |
|-------|-------------|-----------|
| **Security** | 3 issues | 90% |
| **Performance** | 3 issues | 80% |
| **Complexity** | 5 issues | 85% |
| **Documentation** | 10 issues | 80% |

### Priority Issues:

**High Complexity Functions**
- Functions with cyclomatic complexity > 10
- **Recommendation**: Break into smaller, focused functions

**Missing Documentation**
- 10 functions lack proper docstrings
- **Impact**: Reduced maintainability

**Deep Nesting Issues**
- Multiple functions with >4 nesting levels
- **Solution**: Extract guard clauses and early returns

### Questions for you:
- Which complexity issues should we address first?
- Would you like help writing documentation for specific functions?
- Should I show you refactoring examples?`;
    }
    
    // Default comprehensive response
    return `## AI Code Assistant Ready!

I'm here to help you with your **LangGraph multi-agent analysis results** for ${contextInfo}. Based on your files, I can provide insights from multiple specialized agents:

### Available Analysis Agents:

**Security Agent** 🛡️
- Hardcoded credentials detection
- Input validation issues  
- Authentication/authorization flaws
- SQL injection and XSS risks

**Performance Agent** ⚡
- Inefficient algorithms and operations
- Memory usage optimization
- I/O bottleneck identification
- Async/await implementation suggestions

**Complexity Agent** 📊
- Cyclomatic complexity analysis
- Function length and parameter count
- Nesting depth issues
- SOLID principle violations

**Documentation Agent** 📚
- Missing function docstrings
- Unclear variable naming
- API documentation gaps
- Code comment quality

### How I can help:

- **Explain specific code sections** with context
- **Provide refactoring suggestions** with examples
- **Security vulnerability details** and fixes
- **Performance optimization recommendations**
- **Code quality improvement strategies**

### Get Started:

Ask me about any aspect of your code, paste code snippets for review, or request general development advice. I have full context of your codebase!

**Popular questions:**
- "What are the most critical security issues?"
- "How can I optimize this slow function?"
- "Which files need immediate attention?"`;
  };

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || inputValue.trim();
    if (!messageContent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let assistantContent: string;

      if (sessionId && sessionId !== 'demo-session') {
        // Try to use real API
        console.log('[Chat] Sending message to backend...');
        const response = await apiClient.sendChatMessage(sessionId, messageContent);
        assistantContent = response.response.content;
        
        if (response.response.follow_up_suggestions.length > 0) {
          toast({
            title: "Follow-up suggestions available",
            description: "Check the AI's response for related questions you can ask.",
          });
        }
      } else {
        // Use enhanced demo responses
        console.log('[Chat] Using demo mode response');
        assistantContent = getEnhancedResponse(messageContent);
      }

      // Create assistant message with typing effect
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date()
      };

      setTypingMessageId(assistantMessage.id);
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
      
      // Enhanced error handling with proper formatting
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `## Connection Error

I apologize, but I encountered an error while processing your question. 

### What happened:
- Connection to the backend may be interrupted
- The analysis system might be temporarily unavailable
- Network connectivity issues

### What you can do:

1. **Refresh and try again** - Sometimes a simple refresh resolves the issue
2. **Check your connection** - Ensure you have stable internet
3. **Try a different question** - The issue might be specific to your query
4. **Contact support** - If the problem persists

I'm still here to help using demo responses while we resolve this issue!`,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Using Demo Mode",
        description: "Connected to demo responses due to backend error.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTypingComplete = () => {
    setTypingMessageId(null);
  };

  // Context indicator component
  const ContextIndicator = () => {
    if (codebaseContext.type === 'unknown') return null;

    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {codebaseContext.type === 'github' ? (
          <>
            <Github className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Connected to: {codebaseContext.repo} ({codebaseContext.branch})
            </span>
          </>
        ) : (
          <>
            <FolderOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Connected to: Uploaded files
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar />
      
      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {/* Enhanced Header - Fixed Height */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                AI Code Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Ask questions about your LangGraph analysis results
                {codebaseContext.type !== 'unknown' && (
                  <span className="ml-2">
                    • {codebaseContext.type === 'github' ? 'GitHub Repository' : 'Uploaded Files'}
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMessages([messages[0]]);
                setInputValue('');
                setTypingMessageId(null);
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Context Indicator */}
        <ContextIndicator />

        {/* Messages Container - Scrollable with Fixed Height */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Show engaging loader during initialization */}
              {isInitializing && (
                <EngagingLoader codebaseType={codebaseContext.type} />
              )}

              {/* Show messages only after initialization */}
              {!isInitializing && messages.map((message) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  isTyping={typingMessageId === message.id}
                  onTypingComplete={handleTypingComplete}
                />
              ))}
              
              {/* Regular loading state for chat messages */}
              {isLoading && !isInitializing && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        AI is analyzing your question...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Quick Questions - Conditionally Rendered, Fixed Height */}
        {!isInitializing && messages.length === 1 && (
          <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-blue-500" />
                Quick Questions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start h-auto p-4 text-left hover:shadow-md transition-all"
                    onClick={() => handleSendMessage(question.text)}
                    disabled={isLoading}
                  >
                    <div className={`p-2 rounded-lg ${question.color} mr-3 border`}>
                      <question.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{question.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Input Section - Fixed Height */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me anything about your LangGraph analysis results..."
                  disabled={isLoading || isInitializing}
                  className="min-h-[3rem] pr-12 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-900"
                />
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading || isInitializing}
                className="px-6 bg-blue-500 hover:bg-blue-600 text-white"
                size="lg"
              >
                {isLoading || isInitializing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Press Enter to send • Shift+Enter for new line 
              {sessionId === 'demo-session' ? ' • Demo Mode Active' : ''}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;