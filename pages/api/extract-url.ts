import { NextApiRequest, NextApiResponse } from 'next';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';
import { isGoogleUrl, isGmailUrl, extractGmailThreadId } from '../../utils/googleAuth';

// Helper function to detect login redirects
const isLoginRedirect = (url: string): boolean => {
  const loginPatterns = [
    '/login',
    '/signin',
    '/auth',
    '/authentication',
    '/sso',
    'accounts.google.com',
    'login.microsoftonline.com',
    'www.facebook.com/login',
    'linkedin.com/login',
    'slack.com/signin'
  ];
  
  const urlLower = url.toLowerCase();
  return loginPatterns.some(pattern => urlLower.includes(pattern));
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, accessToken } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Validate URL format
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Handle Google URLs with authentication
    if (isGoogleUrl(url)) {
      if (isGmailUrl(url)) {
        if (!accessToken) {
          return res.status(200).json({
            success: false,
            error: 'Google authentication required to access Gmail content',
            errorType: 'authentication_required',
            requiresGoogleAuth: true,
            suggestion: 'Please authenticate with Google to access this Gmail thread',
            shouldPromptForAuth: true,
          });
        }

        // Extract Gmail content using API
        const threadId = extractGmailThreadId(url);
        if (!threadId) {
          return res.status(200).json({
            success: false,
            error: 'Could not extract thread ID from Gmail URL',
            errorType: 'parsing',
            suggestion: 'Please copy and paste the email content manually',
            shouldPromptForManualEntry: true,
          });
        }

        try {
          const oauth2Client = new google.auth.OAuth2();
          oauth2Client.setCredentials({ access_token: accessToken });
          
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const thread = await gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full'
          });

          if (!thread.data.messages || thread.data.messages.length === 0) {
            throw new Error('No messages found in thread');
          }

          // Extract content from all messages in the thread
          let emailContent = '';
          for (const message of thread.data.messages) {
            if (message.payload) {
              const subject = message.payload.headers?.find(h => h.name === 'Subject')?.value || '';
              const from = message.payload.headers?.find(h => h.name === 'From')?.value || '';
              const date = message.payload.headers?.find(h => h.name === 'Date')?.value || '';
              
              emailContent += `From: ${from}\n`;
              emailContent += `Date: ${date}\n`;
              emailContent += `Subject: ${subject}\n\n`;

              // Extract body content
              const extractBody = (part: any): string => {
                if (part.body && part.body.data) {
                  return Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
                if (part.parts) {
                  return part.parts.map(extractBody).join('\n');
                }
                return '';
              };

              const body = extractBody(message.payload);
              emailContent += body + '\n\n---\n\n';
            }
          }

          return res.status(200).json({
            success: true,
            content: emailContent.trim(),
            source: 'Gmail',
            contentLength: emailContent.length
          });

        } catch (gmailError) {
          console.error('Gmail API error:', gmailError);
          return res.status(200).json({
            success: false,
            error: 'Failed to fetch Gmail content. Please check your authentication or try again.',
            errorType: 'gmail_api',
            suggestion: 'Try re-authenticating with Google or paste the email content manually',
            shouldPromptForManualEntry: true,
          });
        }
      } else {
        // Other Google URLs (Docs, Drive, etc.) - require auth but not implemented yet
        return res.status(200).json({
          success: false,
          error: 'This Google service is not yet supported',
          errorType: 'unsupported',
          suggestion: 'Please copy and paste the content manually',
          shouldPromptForManualEntry: true,
        });
      }
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

    // Handle authentication and authorization responses
    if (response.status === 401 || response.status === 403) {
      return res.status(200).json({
        success: false,
        error: 'This content requires authentication to access',
        errorType: 'authentication_required',
        suggestion: 'Please copy and paste the content manually',
        shouldPromptForManualEntry: true,
      });
    }

    if (response.status === 429) {
      return res.status(200).json({
        success: false,
        error: 'Rate limited by the website',
        errorType: 'rate_limited',
        suggestion: 'Please try again in a few minutes or paste content manually',
        shouldPromptForManualEntry: true,
      });
    }

    // Check for redirects to login pages
    const finalUrl = response.url;
    if (finalUrl !== url && isLoginRedirect(finalUrl)) {
      return res.status(200).json({
        success: false,
        error: 'This content requires login to access',
        errorType: 'login_redirect',
        suggestion: 'Please copy and paste the content manually',
        shouldPromptForManualEntry: true,
      });
    }

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
    let errorType = 'network';
    
    if ((error as Error).name === 'AbortError') {
      errorMessage = 'Request timed out - the page took too long to load';
      errorType = 'timeout';
    } else if ((error as Error).message.includes('HTTP')) {
      errorMessage = `Could not access the page: ${(error as Error).message}`;
      errorType = 'http';
    } else if ((error as Error).message.includes('Invalid URL')) {
      errorMessage = 'Please enter a valid URL starting with http:// or https://';
      errorType = 'invalid';
    } else if ((error as Error).message.includes('meaningful content')) {
      errorMessage = 'Could not find readable content on this page';
      errorType = 'parsing';
    }

    res.status(400).json({ 
      success: false,
      error: errorMessage,
      errorType,
      shouldPromptForManualEntry: true
    });
  }
}