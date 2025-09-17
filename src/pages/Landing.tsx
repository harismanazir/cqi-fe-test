import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { 
  Code, 
  Shield, 
  Zap, 
  BarChart3, 
  FileSearch, 
  CheckCircle, 
  ArrowRight,
  Star,
  Users,
  Clock,
  Github
} from 'lucide-react';

interface LandingProps {
  onAnalysisStart?: (jobId: string, metadata?: any) => void;
}

const Landing: React.FC<LandingProps> = ({ onAnalysisStart }) => {
  const features = [
    {
      icon: Shield,
      title: "Security Analysis",
      description: "Detect vulnerabilities and security issues in your codebase with advanced scanning algorithms."
    },
    {
      icon: Zap,
      title: "Performance Insights", 
      description: "Identify performance bottlenecks and optimization opportunities across your applications."
    },
    {
      icon: BarChart3,
      title: "Quality Metrics",
      description: "Comprehensive code quality scoring with detailed metrics and improvement suggestions."
    },
    {
      icon: FileSearch,
      title: "Smart Analysis",
      description: "AI-powered code review that understands context and provides actionable insights."
    }
  ];

  const stats = [
    { value: "50K+", label: "Files Analyzed", icon: Code },
    { value: "99.9%", label: "Accuracy Rate", icon: CheckCircle },
    { value: "500+", label: "Happy Developers", icon: Users },
    { value: "<2min", label: "Average Analysis", icon: Clock }
  ];

  const handleAnalysisStart = (jobId: string, metadata?: any) => {
    console.log('[Landing] Analysis started:', jobId, metadata);
    
    if (onAnalysisStart) {
      onAnalysisStart(jobId, metadata);
    } else {
      // Default behavior - navigate to dashboard
      const params = new URLSearchParams({ job_id: jobId });
      
      if (metadata?.upload_dir) {
        params.set('upload_dir', metadata.upload_dir);
      }
      
      if (metadata?.source === 'github') {
        params.set('github_repo', encodeURIComponent(metadata.full_name || ''));
        params.set('branch', metadata.branch || 'main');
      }
      
      // In a real app, you'd use navigate here
      console.log('[Landing] Would navigate to:', `/dashboard?${params.toString()}`);
      alert(`Analysis started! Job ID: ${jobId}\nWould navigate to dashboard...`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Atlan Code Intelligence</span>
          </div>
          {/* <Button variant="outline" className="hidden sm:flex">
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button> */}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        <div className="max-w-7xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Star className="w-4 h-4 mr-2" />
            Now with GitHub integration & AI-powered insights
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            <span className="text-gradient">Intelligent Code</span><br />
            Analysis Platform
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            Transform your development workflow with advanced code analysis, security scanning, 
            and performance insights. Analyze local files or GitHub repositories with AI-powered intelligence.
          </p>

          {/* File Upload Section with GitHub Integration */}
          <div className="max-w-2xl mx-auto mb-16">
            <FileUpload onAnalysisStart={handleAnalysisStart} />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="outline" size="lg" className="min-w-[200px]">
              View Sample Report
            </Button>
            <Button variant="ghost" size="lg" className="min-w-[200px] flex items-center gap-2">
              <Github className="w-5 h-5" />
              Browse Public Repos
            </Button>
          </div>
        </div>
      </section>

      {/* GitHub Integration Highlight */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-black text-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-6">
            <Github className="w-8 h-8 text-black" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">
            Seamless GitHub Integration
          </h2>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Analyze any GitHub repository instantly. Support for all branches, 
            automatic file detection, and comprehensive multi-agent analysis.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-lg bg-white/10 backdrop-blur-sm">
              <Code className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Smart Detection</h3>
              <p className="text-sm text-gray-300">Automatically identifies and analyzes code files across all supported languages</p>
            </div>
            <div className="p-6 rounded-lg bg-white/10 backdrop-blur-sm">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Security First</h3>
              <p className="text-sm text-gray-300">Comprehensive security scanning with vulnerability detection and remediation tips</p>
            </div>
            <div className="p-6 rounded-lg bg-white/10 backdrop-blur-sm">
              <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Quality Metrics</h3>
              <p className="text-sm text-gray-300">Detailed quality assessment with performance and complexity analysis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Powerful Analysis <span className="text-gradient">Features</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to maintain high-quality, secure, and performant code
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-large transition-all duration-300 border-border/50 hover:border-primary/20 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-lg mb-4 group-hover:animate-float">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to improve your code quality?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of developers who trust Atlan Code Intelligence
          </p>
          <Button variant="hero" size="xl" className="animate-glow">
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-primary rounded-md flex items-center justify-center">
              <Code className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gradient">Atlan Code Intelligence</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2024 Atlan Code Intelligence. Built with modern web technologies.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;