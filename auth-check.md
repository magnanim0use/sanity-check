Create an enhanced URL detection and guidance system for the message sanity check app. I need you to:

1. **Update the URL detection utility** (utils/urlDetection.ts):

   - Add a list of protected/authenticated domains (Gmail, Facebook, LinkedIn messages, Slack, Teams, etc.)
   - Create an `isProtectedUrl()` function that detects these domains
   - Create a `detectPlatform()` function that identifies the specific platform
   - Create a `getPlatformGuidance()` function that returns user-friendly guidance for each platform

2. **Enhance the ContextInput component** (components/ContextInput.tsx):

   - Add state for URL analysis and platform detection
   - When a protected URL is detected, show a guidance panel instead of attempting extraction
   - Display platform-specific icons and instructions
   - Add a "Copy Content Manually" guidance section with platform-specific tips
   - Prevent the extraction API call for protected URLs

3. **Update the extract-url API** (pages/api/extract-url.ts):

   - Add early detection of protected URLs before attempting fetch
   - Return appropriate error responses for protected content
   - Add better error categorization (protected vs network vs parsing errors)

4. **Add styling** for the new guidance components:
   - Auth guidance panel styling
   - Platform-specific icons/colors
   - Clear visual hierarchy for instructions
   - Responsive design for the guidance cards

The protected domains should include:

- mail.google.com, gmail.com
- facebook.com, m.facebook.com
- linkedin.com/messaging, linkedin.com/feed
- slack.com/messages, app.slack.com
- teams.microsoft.com
- discord.com/channels
- twitter.com/messages

For each platform, provide specific guidance like:

- Gmail: "Copy the email thread content including sender, subject, and message body"
- LinkedIn messages: "Copy the conversation text from your LinkedIn messaging"
- Facebook: "Copy the post content or message thread text"
- Slack: "Copy the message thread from your Slack workspace"

Make the UX feel helpful and educational rather than like an error or limitation.
