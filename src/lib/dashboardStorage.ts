// lib/dashboardStorage.ts - Simplified local storage only
export interface DashboardData {
  jobId: string;
  uploadDir?: string;
  githubRepo?: string;
  branch?: string;
  analysisResults: any;
  timestamp: string;
  isGitHubAnalysis: boolean;
}

export class DashboardStorage {
  private static readonly STORAGE_KEY = 'dashboard_data';
  private static readonly MAX_AGE_HOURS = 24; // Data expires after 24 hours

  /**
   * Save dashboard data to localStorage
   */
  static save(data: DashboardData): void {
    try {
      const storageData = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
      console.log('[DashboardStorage] Data saved to localStorage:', data.jobId);
    } catch (error) {
      console.error('[DashboardStorage] Failed to save:', error);
    }
  }

  /**
   * Load dashboard data from localStorage
   */
  static load(): DashboardData | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('[DashboardStorage] No data found in localStorage');
        return null;
      }
      
      const data = JSON.parse(stored) as DashboardData;
      
      // Check if data is still valid (not expired)
      if (!this.isDataValid(data)) {
        console.log('[DashboardStorage] Data expired, clearing...');
        this.clear();
        return null;
      }
      
      console.log('[DashboardStorage] Data loaded from localStorage:', data.jobId);
      return data;
    } catch (error) {
      console.error('[DashboardStorage] Failed to load:', error);
      this.clear(); // Clear corrupted data
      return null;
    }
  }

  /**
   * Clear dashboard data from localStorage
   */
  static clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('[DashboardStorage] Data cleared from localStorage');
    } catch (error) {
      console.error('[DashboardStorage] Failed to clear:', error);
    }
  }

  /**
   * Check if stored data exists and is still valid
   */
  static isValid(): boolean {
    const data = this.load();
    return data !== null;
  }

  /**
   * Check if data is within valid time range
   */
  private static isDataValid(data: DashboardData): boolean {
    if (!data.timestamp) return false;
    
    const dataTime = new Date(data.timestamp).getTime();
    const currentTime = new Date().getTime();
    const maxAge = this.MAX_AGE_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
    
    return (currentTime - dataTime) < maxAge;
  }

  /**
   * Get data age in minutes
   */
  static getDataAge(): number | null {
    const data = this.load();
    if (!data) return null;
    
    const dataTime = new Date(data.timestamp).getTime();
    const currentTime = new Date().getTime();
    return Math.floor((currentTime - dataTime) / (1000 * 60)); // Return age in minutes
  }

  /**
   * Update existing data with new analysis results
   */
  static updateResults(analysisResults: any): void {
    const existingData = this.load();
    if (existingData) {
      this.save({
        ...existingData,
        analysisResults,
        timestamp: new Date().toISOString()
      });
    }
  }
}