Replace the hard-coded protected domains approach with dynamic auth error handling:

1. **Remove the protected domains logic** from urlDetection.ts:

   - Delete the protectedDomains array
   - Remove isProtectedUrl() function
   - Keep only the basic URL validation functions

2. **Update the extract-url API** (pages/api/extract-url.ts) to handle auth responses:

   - Attempt the fetch for any valid URL
   - Check response status codes specifically for auth issues
   - Handle these status codes specially:
     - 401 (Unauthorized)
     - 403 (Forbidden)
     - 429 (Rate Limited)
     - Any redirect to login pages (detect login URLs in response)
   - Return structured error responses that differentiate auth issues from other problems

3. **Enhance error handling** in the API response:

   ```javascript
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
       suggestion:
         'Please try again in a few minutes or paste content manually',
     });
   }
   ```
