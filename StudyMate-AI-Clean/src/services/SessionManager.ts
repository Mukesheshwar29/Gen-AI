// Session management for viva/exam preparation
export interface SessionQA {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  confidence: number;
  questionIntent: string;
  sources: Array<{
    documentId: string;
    relevance: number;
    sourceText?: string;
    section?: string;
    documentType?: string;
  }>;
  documentNames: string[];
}

export interface StudySession {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  qaHistory: SessionQA[];
  documentIds: string[];
  totalQuestions: number;
  averageConfidence: number;
}

export class SessionManager {
  private static instance: SessionManager;
  private currentSession: StudySession | null = null;
  private allSessions: StudySession[] = [];

  private constructor() {
    this.loadSessionsFromStorage();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Start a new study session
  startSession(sessionName?: string, documentIds: string[] = []): StudySession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      name: sessionName || `Study Session ${new Date().toLocaleDateString()}`,
      startTime: new Date(),
      qaHistory: [],
      documentIds,
      totalQuestions: 0,
      averageConfidence: 0
    };

    console.log('📚 Started new study session:', this.currentSession.name);
    this.saveSessionsToStorage();
    return this.currentSession;
  }

  // End the current session
  endSession(): StudySession | null {
    if (!this.currentSession) return null;

    this.currentSession.endTime = new Date();
    this.currentSession.averageConfidence = this.calculateAverageConfidence();
    
    this.allSessions.push({ ...this.currentSession });
    console.log('✅ Ended study session:', this.currentSession.name);
    
    const endedSession = { ...this.currentSession };
    this.currentSession = null;
    this.saveSessionsToStorage();
    
    return endedSession;
  }

  // Add Q&A to current session
  addQA(qa: Omit<SessionQA, 'id' | 'timestamp'>): void {
    if (!this.currentSession) {
      // Auto-start session if none exists
      this.startSession();
    }

    if (this.currentSession) {
      const qaWithId: SessionQA = {
        ...qa,
        id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      this.currentSession.qaHistory.push(qaWithId);
      this.currentSession.totalQuestions = this.currentSession.qaHistory.length;
      this.currentSession.averageConfidence = this.calculateAverageConfidence();

      console.log('📝 Added Q&A to session:', qaWithId.question.substring(0, 50) + '...');
      this.saveSessionsToStorage();
    }
  }

  // Get current session
  getCurrentSession(): StudySession | null {
    return this.currentSession;
  }

  // Get all sessions
  getAllSessions(): StudySession[] {
    return [...this.allSessions];
  }

  // Get session statistics
  getSessionStats(): {
    totalSessions: number;
    totalQuestions: number;
    averageQuestionsPerSession: number;
    averageConfidence: number;
  } {
    const totalSessions = this.allSessions.length + (this.currentSession ? 1 : 0);
    const allQAs = this.allSessions.flatMap(s => s.qaHistory);
    if (this.currentSession) {
      allQAs.push(...this.currentSession.qaHistory);
    }

    return {
      totalSessions,
      totalQuestions: allQAs.length,
      averageQuestionsPerSession: totalSessions > 0 ? allQAs.length / totalSessions : 0,
      averageConfidence: allQAs.length > 0 ? 
        allQAs.reduce((sum, qa) => sum + qa.confidence, 0) / allQAs.length : 0
    };
  }

  // Export session as text file
  exportSessionAsText(sessionId?: string): string {
    const session = sessionId 
      ? this.allSessions.find(s => s.id === sessionId) || this.currentSession
      : this.currentSession;

    if (!session) {
      throw new Error('No session found to export');
    }

    const lines: string[] = [];
    lines.push('='.repeat(60));
    lines.push(`STUDYMATE AI - VIVA PREPARATION SESSION`);
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Session: ${session.name}`);
    lines.push(`Started: ${session.startTime.toLocaleString()}`);
    if (session.endTime) {
      lines.push(`Ended: ${session.endTime.toLocaleString()}`);
      const duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000);
      lines.push(`Duration: ${duration} minutes`);
    }
    lines.push(`Total Questions: ${session.totalQuestions}`);
    lines.push(`Average Confidence: ${(session.averageConfidence * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('='.repeat(60));
    lines.push('QUESTIONS & ANSWERS');
    lines.push('='.repeat(60));
    lines.push('');

    session.qaHistory.forEach((qa, index) => {
      lines.push(`Q${index + 1}. ${qa.question}`);
      lines.push('');
      lines.push(`A${index + 1}. ${qa.answer}`);
      lines.push('');
      lines.push(`📊 Confidence: ${(qa.confidence * 100).toFixed(1)}% | Intent: ${qa.questionIntent} | Time: ${qa.timestamp.toLocaleTimeString()}`);
      
      if (qa.sources && qa.sources.length > 0) {
        lines.push('');
        lines.push('📚 Sources:');
        qa.sources.forEach((source, sourceIndex) => {
          const docName = qa.documentNames.find(name => name.includes(source.documentId)) || source.documentId;
          lines.push(`   ${sourceIndex + 1}. ${docName} (${(source.relevance * 100).toFixed(0)}% relevance)`);
          if (source.section) {
            lines.push(`      Section: ${source.section}`);
          }
        });
      }
      
      lines.push('');
      lines.push('-'.repeat(40));
      lines.push('');
    });

    lines.push('');
    lines.push('='.repeat(60));
    lines.push('Generated by StudyMate AI');
    lines.push(`Export Date: ${new Date().toLocaleString()}`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  // Download session as text file
  downloadSession(sessionId?: string, filename?: string): void {
    try {
      const content = this.exportSessionAsText(sessionId);
      const session = sessionId 
        ? this.allSessions.find(s => s.id === sessionId) || this.currentSession
        : this.currentSession;

      const defaultFilename = filename || 
        `StudyMate_${session?.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📥 Downloaded session:', defaultFilename);
    } catch (error) {
      console.error('Failed to download session:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateAverageConfidence(): number {
    if (!this.currentSession || this.currentSession.qaHistory.length === 0) return 0;
    
    const total = this.currentSession.qaHistory.reduce((sum, qa) => sum + qa.confidence, 0);
    return total / this.currentSession.qaHistory.length;
  }

  private saveSessionsToStorage(): void {
    try {
      const data = {
        currentSession: this.currentSession,
        allSessions: this.allSessions
      };
      localStorage.setItem('studymate_sessions', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save sessions to localStorage:', error);
    }
  }

  private loadSessionsFromStorage(): void {
    try {
      const data = localStorage.getItem('studymate_sessions');
      if (data) {
        const parsed = JSON.parse(data);
        this.allSessions = parsed.allSessions || [];
        
        // Restore current session if it exists and was recent (within 24 hours)
        if (parsed.currentSession) {
          const sessionAge = Date.now() - new Date(parsed.currentSession.startTime).getTime();
          if (sessionAge < 24 * 60 * 60 * 1000) { // 24 hours
            this.currentSession = {
              ...parsed.currentSession,
              startTime: new Date(parsed.currentSession.startTime),
              qaHistory: parsed.currentSession.qaHistory.map((qa: any) => ({
                ...qa,
                timestamp: new Date(qa.timestamp)
              }))
            };
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load sessions from localStorage:', error);
    }
  }

  // Clear all sessions (for testing/reset)
  clearAllSessions(): void {
    this.currentSession = null;
    this.allSessions = [];
    localStorage.removeItem('studymate_sessions');
    console.log('🗑️ Cleared all sessions');
  }
}
