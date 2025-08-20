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
    
    if ((error as Error).name === 'AbortError') {
      errorMessage = 'Request timed out - the page took too long to load';
    } else if ((error as Error).message.includes('HTTP')) {
      errorMessage = `Could not access the page: ${(error as Error).message}`;
    } else if ((error as Error).message.includes('Invalid URL')) {
      errorMessage = 'Please enter a valid URL starting with http:// or https://';
    }

    res.status(400).json({ 
      success: false,
      error: errorMessage,
      shouldPromptForManualEntry: true
    });
  }
}