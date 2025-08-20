// pages/api/extract-url.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as cheerio from 'cheerio';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Validate URL format
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Fetch the page with timeout and user agent
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SanityCheck/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Use cheerio for better HTML parsing
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
    
    // Extract meaningful content with priority
    let content = '';
    
    // Try to get job posting specific content first
    const jobContent = $('.job-description, .job-details, .posting-description, [data-testid="job-description"]').text();
    if (jobContent && jobContent.length > 100) {
      content = jobContent;
    } else {
      // Fallback to main content areas
      const mainContent = $('main, .main-content, .content, article, .post-content').text();
      if (mainContent && mainContent.length > 100) {
        content = mainContent;
      } else {
        // Last resort - body text
        content = $('body').text();
      }
    }

    // Clean up the text
    const cleanContent = content
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Limit line breaks
      .trim();

    if (!cleanContent || cleanContent.length < 50) {
      throw new Error('Could not extract meaningful content from the page');
    }

    // Limit content size to avoid token limits
    const truncatedContent = cleanContent.slice(0, 4000);
    
    res.status(200).json({ 
      success: true,
      content: truncatedContent,
      source: urlObj.hostname,
      contentLength: cleanContent.length
    });

  } catch (error) {
    console.error('URL extraction error:', error);
    
    // Return structured error for frontend handling
    let errorMessage = 'Failed to extract content from URL';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out - the page took too long to load';
    } else if (error.message.includes('HTTP')) {
      errorMessage = `Could not access the page: ${error.message}`;
    } else if (error.message.includes('Invalid URL')) {
      errorMessage = 'Please enter a valid URL starting with http:// or https://';
    }

    res.status(400).json({ 
      success: false,
      error: errorMessage,
      shouldPromptForManualEntry: true
    });
  }
}

// utils/urlDetection.ts
export const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string.trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
};

// components/ContextInput.tsx
import { useState } from 'react';
import { isValidUrl, extractDomain } from '../utils/urlDetection';

interface ContextInputProps {
  context: string;
  onContextChange: (context: string) => void;
  platform: string;
  onPlatformChange: (platform: string) => void;
}

export const ContextInput: React.FC<ContextInputProps> = ({
  context,
  onContextChange,
  platform,
  onPlatformChange
}) => {
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
            ? "Please paste the page content here manually..."
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
};

// styles/components.css (additional styles)
.context-input-container {
  margin-bottom: 1.5rem;
}

.extraction-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #1565c0;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e3f2fd;
  border-top: 2px solid #1565c0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.extraction-error {
  background-color: #fff3e0;
  border: 1px solid #ffb74d;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #e65100;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
}

.retry-button, .manual-button {
  padding: 0.25rem 0.75rem;
  border: 1px solid #ff9800;
  background-color: #fff;
  color: #e65100;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.retry-button:hover, .manual-button:hover {
  background-color: #fff3e0;
}

.context-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 120px;
}

.context-textarea:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.context-help {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.platform-select {
  margin-top: 1rem;
}

.platform-select label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #333;
}

.platform-select select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

# Package.json additions:
{
  "dependencies": {
    // ... existing dependencies
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    // ... existing devDependencies
    "@types/cheerio": "^0.22.31"
  }
}