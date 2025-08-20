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
      temperature: 0.1,
      max_tokens: 1000,
    });

    const result = completion.choices[0].message?.content;
    
    try {
      const parsedResult = JSON.parse(result || '{}');
      res.status(200).json(parsedResult);
    } catch (parseError) {
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
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}