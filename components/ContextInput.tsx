import { useState } from 'react';
import { isValidUrl, extractDomain } from '../utils/urlDetection';

interface ContextInputProps {
  context: string;
  onContextChange: (context: string) => void;
  platform: string;
  onPlatformChange: (platform: string) => void;
}

export function ContextInput({
  context,
  onContextChange,
  platform,
  onPlatformChange
}: ContextInputProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [originalUrl, setOriginalUrl] = useState('');

  const handleContextChange = async (value: string) => {
    onContextChange(value);
    setExtractionError('');
    setShowManualEntry(false);

    // Check if the input looks like a URL
    if (isValidUrl(value)) {
      // Always attempt extraction - auth issues will be handled by the API
      await extractUrlContent(value);
    }
  };

  const extractUrlContent = async (url: string) => {
    setIsExtracting(true);
    setOriginalUrl(url);

    try {
      const response = await fetch('/api/extract-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        // Replace the URL with extracted content
        const extractedContext = `Content from ${data.source}:\n\n${data.content}`;
        onContextChange(extractedContext);
        setExtractionError('');
      } else {
        // Show error and prompt for manual entry
        setExtractionError(data.error);
        setShowManualEntry(true);
      }
    } catch (error) {
      setExtractionError('Failed to extract content from URL');
      setShowManualEntry(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualEntry = () => {
    onContextChange('');
    setShowManualEntry(false);
    setExtractionError('');
    setOriginalUrl('');
  };

  const retryExtraction = () => {
    if (originalUrl) {
      extractUrlContent(originalUrl);
    }
  };

  return (
    <div className="context-input-container">
      <label htmlFor="context">Additional Context</label>
      
      {isExtracting && (
        <div className="extraction-status">
          <span className="loading-spinner"></span>
          Extracting content from {extractDomain(originalUrl)}...
        </div>
      )}


      {extractionError && (
        <div className="extraction-error">
          <div className="error-message">
            ⚠️ {extractionError}
          </div>
          <div className="error-actions">
            <button 
              type="button" 
              onClick={retryExtraction}
              className="retry-button"
            >
              Try Again
            </button>
            <button 
              type="button" 
              onClick={handleManualEntry}
              className="manual-button"
            >
              Enter Content Manually
            </button>
          </div>
        </div>
      )}

      <textarea
        id="context"
        value={context}
        onChange={(e) => handleContextChange(e.target.value)}
        placeholder={
          showManualEntry 
            ? "Please paste the content here manually..."
            : "Paste a URL (LinkedIn job, company page, etc.) or the actual content..."
        }
        rows={6}
        className="context-textarea"
        disabled={isExtracting}
      />

      <div className="context-help">
        💡 <strong>Tip:</strong> You can paste a URL and we'll automatically extract the content, 
        or paste the actual text content for best results.
      </div>

      <div className="platform-select">
        <label htmlFor="platform">Platform (optional)</label>
        <select
          id="platform"
          value={platform}
          onChange={(e) => onPlatformChange(e.target.value)}
        >
          <option value="">Select platform...</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Gmail">Gmail</option>
          <option value="Slack">Slack</option>
          <option value="Email">Email</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
  );
}