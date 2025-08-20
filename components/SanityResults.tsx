import { SanityResult } from '../types';

interface SanityResultsProps {
  result: SanityResult;
}

export function SanityResults({ result }: SanityResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-bad';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return '';
    }
  };

  return (
    <div className="results-container">
      <div className="score-section">
        <h2>Overall Score</h2>
        <div className={`score ${getScoreColor(result.overallScore)}`}>
          {result.overallScore}/100
        </div>
        <p className="summary">{result.summary}</p>
      </div>

      {result.hasIssues && result.issues.length > 0 && (
        <div className="issues-section">
          <h3>Issues Found</h3>
          {result.issues.map((issue, index) => (
            <div key={index} className="issue-item">
              <div className="issue-header">
                <span className={`severity-badge ${getSeverityColor(issue.severity)}`}>
                  {issue.severity.toUpperCase()}
                </span>
                <span className="category-badge">
                  {issue.category.replace('_', ' ').toUpperCase()}
                </span>
                <span className="confidence">
                  {Math.round(issue.confidence * 100)}% confident
                </span>
              </div>
              <div className="issue-content">
                <p className="problem"><strong>Problem:</strong> {issue.problem}</p>
                <p className="suggestion"><strong>Suggestion:</strong> {issue.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!result.hasIssues && (
        <div className="no-issues">
          <h3>✅ No Issues Found</h3>
          <p>Your message looks good to go!</p>
        </div>
      )}
    </div>
  );
}