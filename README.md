# Message Sanity Check

A Next.js app that helps you catch embarrassing mistakes in your messages before you send them.

## Features

- AI-powered message analysis using OpenAI's GPT-4
- Detects entity mismatches, tone issues, attachment problems, and basic errors
- Works with various platforms (Email, Slack, Teams, LinkedIn, etc.)
- Clean, responsive UI with real-time feedback

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your OpenAI API key:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your OpenAI API key.

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

Deploy to Vercel:

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` and follow the prompts
3. Add your `OPENAI_API_KEY` in the Vercel dashboard environment variables

## How It Works

1. Enter the message you want to check
2. Optionally provide context (platform, recipient info, etc.)
3. Click "Sanity Check" to analyze your message
4. Review the results and suggestions

The app uses OpenAI's GPT-4 to analyze your message for common mistakes and provides actionable suggestions to improve it.