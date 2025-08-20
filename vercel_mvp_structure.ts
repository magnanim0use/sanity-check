message-sanity-check/
├── pages/
│   ├── index.tsx                    # Main React app
│   ├── _app.tsx                     # App wrapper
│   └── api/
│       └── sanity-check.ts          # Serverless function with OpenAI
├── components/
│   ├── MessageInput.tsx             # Message text area
│   ├── ContextInput.tsx             # Context input (URL or paste)
│   ├── SanityResults.tsx            # Results display
│   ├── LoadingSpinner.tsx           # Loading state
│   └── Layout.tsx                   # App layout
├── styles/
│   ├── globals.css                  # Global styles
│   └── components.css               # Component styles
├── types/
│   └── index.ts                     # TypeScript interfaces
├── utils/
│   └── prompts.ts                   # OpenAI prompts
├── public/
│   ├── favicon.ico
│   └── logo.png
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.local                       # OpenAI API key (gitignored)
├── .env.example                     # Example env file
├── .gitignore
├── vercel.json                      # Vercel config
└── README.md

# Key Files:

## pages/api/sanity-check.ts (Serverless Function)
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SANITY_CHECK_PROMPT = `
You are a communication sanity checker. Analyze messages for common mistakes:

1. ENTITY MISMATCHES: Company names, person names, job titles that don't match context
2. TONE ISSUES: Inappropriate formality for the situation
3. ATTACHMENT PROBLEMS: References attachments but context suggests none present
4. BASIC ERRORS: Grammar, spelling, unclear references

Respond in JSON format:
{
  "overallScore": 0-100,
  "hasIssues": boolean,
  "issues": [
    {
      "category": "entity_mismatch" | "tone" | "attachment" | "grammar" | "other",
      "severity": "high" | "medium" | "low",
      "problem": "what's wrong",
      "suggestion": "how to fix it",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "brief overall assessment"
}`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, context, platform } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SANITY_CHECK_PROMPT },
        { 
          role: "user", 
          content: `
MESSAGE TO CHECK:
"""
${message}
"""

CONTEXT:
- Platform: ${platform || 'Unknown'}
- Context: ${context || 'No additional context provided'}

Please analyze this message for any issues.`
        }
      ],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 1000,
    });

    const result = completion.choices[0].message?.content;
    
    try {
      const parsedResult = JSON.parse(result || '{}');
      res.status(200).json(parsedResult);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      res.status(200).json({
        overallScore: 50,
        hasIssues: false,
        issues: [],
        summary: "Analysis completed but results couldn't be parsed properly."
      });
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
```

## pages/index.tsx (Main App)
```tsx
import { useState } from 'react';
import { MessageInput } from '../components/MessageInput';
import { ContextInput } from '../components/ContextInput';
import { SanityResults } from '../components/SanityResults';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface SanityResult {
  overallScore: number;
  hasIssues: boolean;
  issues: Array<{
    category: string;
    severity: 'high' | 'medium' | 'low';
    problem: string;
    suggestion: string;
    confidence: number;
  }>;
  summary: string;
}

export default function Home() {
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [platform, setPlatform] = useState('');
  const [result, setResult] = useState<SanityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!message.trim()) {
      setError('Please enter a message to check');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/sanity-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          context: context.trim(),
          platform: platform.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check message');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to analyze message. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Message Sanity Check</h1>
        <p>Catch embarrassing mistakes before you hit send</p>
      </header>

      <main className="main">
        <MessageInput 
          value={message}
          onChange={setMessage}
          placeholder="Paste your message here..."
        />
        
        <ContextInput
          context={context}
          onContextChange={setContext}
          platform={platform}
          onPlatformChange={setPlatform}
        />

        <button 
          onClick={handleCheck} 
          disabled={loading || !message.trim()}
          className="check-button"
        >
          {loading ? 'Checking...' : 'Sanity Check'}
        </button>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {loading && <LoadingSpinner />}
        
        {result && <SanityResults result={result} />}
      </main>
    </div>
  );
}
```

## .env.local (Local Environment)
```
OPENAI_API_KEY=sk-your-api-key-here
```

## .env.example (Template for others)
```
OPENAI_API_KEY=your_openai_api_key_here
```

## package.json
```json
{
  "name": "message-sanity-check",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

## vercel.json (Optional config)
```json
{
  "functions": {
    "pages/api/sanity-check.js": {
      "maxDuration": 30
    }
  }
}
```

# Deployment Steps:

1. `npm install`
2. `cp .env.example .env.local` and add your OpenAI key
3. `npm run dev` to test locally
4. `vercel --prod` to deploy
5. Add OPENAI_API_KEY in Vercel dashboard environment variables

# Benefits:
- ✅ No database needed
- ✅ Serverless scales automatically  
- ✅ Your OpenAI key stays secure
- ✅ Fast deployment
- ✅ Free tier covers MVP usage
- ✅ Easy to add features later