// src/lib/analysisState.ts
export interface AnalysisSession {
  id: string;
  slug: string;
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  metadata: {
    uploadDir?: string;
    githubRepo?: string;
    branch?: string;
    source: 'file_upload' | 'github';
    totalFiles?: number;
    fileCount?: number;
  };
  progress?: number;
  lastUpdated?: string;
}

export class AnalysisStateManager {
  private static readonly STORAGE_KEY = 'analysis_sessions';
  private static readonly CURRENT_SESSION_KEY = 'current_analysis_session';

  /**
   * Generate a unique slug for analysis session
   */
  static generateSlug(): string {
    const uuid = crypto.randomUUID();
    return `analysis-${uuid.split('-')[0]}-${Date.now().toString(36)}`;
  }

  /**
   * Save analysis session to localStorage
   */
  static saveSession(session: AnalysisSession): void {
    try {
      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = { ...session, lastUpdated: new Date().toISOString() };
      } else {
        sessions.push({ ...session, lastUpdated: new Date().toISOString() });
      }
      
      // Keep only last 50 sessions
      const limitedSessions = sessions.slice(-50);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedSessions));
      this.setCurrentSession(session.slug);
      
      console.log('[AnalysisState] Session saved:', session.slug);
    } catch (error) {
      console.error('[AnalysisState] Failed to save session:', error);
    }
  }

  /**
   * Get all analysis sessions from localStorage
   */
  static getAllSessions(): AnalysisSession[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[AnalysisState] Failed to load sessions:', error);
      return [];
    }
  }

  /**
   * Get analysis session by slug
   */
  static getSessionBySlug(slug: string): AnalysisSession | null {
    try {
      const sessions = this.getAllSessions();
      return sessions.find(s => s.slug === slug) || null;
    } catch (error) {
      console.error('[AnalysisState] Failed to get session by slug:', error);
      return null;
    }
  }

  /**
   * Update session status and progress
   */
  static updateSession(slug: string, updates: Partial<AnalysisSession>): void {
    try {
      const sessions = this.getAllSessions();
      const sessionIndex = sessions.findIndex(s => s.slug === slug);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex] = {
          ...sessions[sessionIndex],
          ...updates,
          lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        console.log('[AnalysisState] Session updated:', slug, updates);
      }
    } catch (error) {
      console.error('[AnalysisState] Failed to update session:', error);
    }
  }

  /**
   * Set current active session
   */
  static setCurrentSession(slug: string): void {
    try {
      localStorage.setItem(this.CURRENT_SESSION_KEY, slug);
    } catch (error) {
      console.error('[AnalysisState] Failed to set current session:', error);
    }
  }

  /**
   * Get current active session
   */
  static getCurrentSession(): string | null {
    try {
      return localStorage.getItem(this.CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('[AnalysisState] Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Remove old completed sessions (cleanup)
   */
  static cleanup(daysOld: number = 7): void {
    try {
      const sessions = this.getAllSessions();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const validSessions = sessions.filter(session => {
        const sessionDate = new Date(session.createdAt);
        return sessionDate > cutoffDate || session.status === 'processing';
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validSessions));
      console.log(`[AnalysisState] Cleaned up ${sessions.length - validSessions.length} old sessions`);
    } catch (error) {
      console.error('[AnalysisState] Failed to cleanup sessions:', error);
    }
  }

  /**
   * Create new analysis session
   */
  static createSession(jobId: string, metadata: AnalysisSession['metadata']): AnalysisSession {
    const slug = this.generateSlug();
    const session: AnalysisSession = {
      id: crypto.randomUUID(),
      slug,
      jobId,
      status: 'processing',
      createdAt: new Date().toISOString(),
      metadata,
      progress: 0
    };
    
    this.saveSession(session);
    return session;
  }
}