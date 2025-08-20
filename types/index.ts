export interface SanityResult {
  overallScore: number;
  hasIssues: boolean;
  issues: Array<{
    category: 'entity_mismatch' | 'tone' | 'attachment' | 'grammar' | 'other';
    severity: 'high' | 'medium' | 'low';
    problem: string;
    suggestion: string;
    confidence: number;
  }>;
  summary: string;
}