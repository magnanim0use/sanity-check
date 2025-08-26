// Comprehensive prompt injection protection utilities

export interface SecurityValidationResult {
  isValid: boolean;
  violations: string[];
  sanitizedInput?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Common prompt injection patterns
const INJECTION_PATTERNS = [
  // Direct instruction hijacking
  /ignore\s+(previous|above|all|prior)\s+(instructions?|prompts?|rules?|commands?)/gi,
  /forget\s+(everything|all|previous|above)/gi,
  /new\s+(instructions?|task|role|system|prompt)/gi,
  /now\s+(you\s+are|act\s+as|pretend|ignore)/gi,
  
  // Role manipulation
  /you\s+are\s+(now|actually|really)\s+(a|an|the)/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an|the)/gi,
  /pretend\s+(you\s+are|to\s+be)/gi,
  /roleplay\s+as/gi,
  
  // System message injection
  /\[?\s*system\s*\]?\s*:/gi,
  /\[?\s*assistant\s*\]?\s*:/gi,
  /\[?\s*user\s*\]?\s*:/gi,
  /<\s*system\s*>/gi,
  /<\s*\/?\s*(system|assistant|user)\s*>/gi,
  
  // Prompt termination attempts
  /"""\s*\n\s*(ignore|forget|new|system)/gi,
  /```\s*\n\s*(ignore|forget|new|system)/gi,
  /---+\s*\n\s*(ignore|forget|new|system)/gi,
  
  // Jailbreak patterns
  /DAN\s+(mode|prompt)/gi,
  /developer\s+mode/gi,
  /debug\s+mode/gi,
  /simulation\s+mode/gi,
  /unrestricted\s+mode/gi,
  
  // Instruction override attempts
  /disregard\s+(previous|above|all|safety)/gi,
  /override\s+(safety|security|restrictions)/gi,
  /bypass\s+(safety|security|filters)/gi,
  /disable\s+(safety|security|filters)/gi,
  
  // Context escape attempts
  /break\s+out\s+of/gi,
  /escape\s+(the|this)\s+(context|prompt|system)/gi,
  /exit\s+(prompt|system|context)/gi,
  
  // Multi-language injection attempts
  /(traduire|traduzir|翻译|번역|翻訳)\s*[:：]/gi,
  
  // Encoded injection attempts
  /base64\s*[:：]/gi,
  /rot13\s*[:：]/gi,
  /hex\s*[:：]/gi,
  
  // Tool/function abuse
  /execute\s+(code|command|function)/gi,
  /run\s+(code|command|script)/gi,
  /eval\s*\(/gi,
];

// Suspicious character combinations that might indicate encoding
const SUSPICIOUS_PATTERNS = [
  /[^\x00-\x7F]{20,}/g, // Long non-ASCII sequences
  /&#x[0-9a-f]+;/gi, // HTML hex entities
  /\\u[0-9a-f]{4}/gi, // Unicode escape sequences
  /\\x[0-9a-f]{2}/gi, // Hex escape sequences
  /%[0-9a-f]{2}/gi, // URL encoded sequences
];

// Words that are commonly used in prompt injections
const HIGH_RISK_KEYWORDS = [
  'system', 'admin', 'root', 'debug', 'developer', 'override', 'bypass',
  'jailbreak', 'unrestricted', 'unlimited', 'disable', 'ignore', 'forget',
  'disregard', 'override', 'replace', 'substitute', 'new instructions',
  'act as', 'pretend', 'roleplay', 'simulate', 'emulate'
];

export function validateInput(input: string, fieldName: string = 'input'): SecurityValidationResult {
  const violations: string[] = [];
  let riskLevel: SecurityValidationResult['riskLevel'] = 'low';

  if (!input || typeof input !== 'string') {
    return {
      isValid: true,
      violations: [],
      riskLevel: 'low'
    };
  }

  // Check length limits
  if (input.length > 10000) {
    violations.push(`${fieldName} exceeds maximum length (10000 characters)`);
    riskLevel = 'medium';
  }

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      violations.push(`${fieldName} contains potential prompt injection pattern: ${pattern.source}`);
      riskLevel = 'high';
    }
  }

  // Check for suspicious encoding
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = input.match(pattern);
    if (matches && matches.length > 0) {
      violations.push(`${fieldName} contains suspicious encoding patterns`);
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }
  }

  // Check for high-risk keywords concentration
  const lowercaseInput = input.toLowerCase();
  const keywordMatches = HIGH_RISK_KEYWORDS.filter(keyword => 
    lowercaseInput.includes(keyword.toLowerCase())
  );
  
  if (keywordMatches.length >= 3) {
    violations.push(`${fieldName} contains multiple high-risk keywords: ${keywordMatches.join(', ')}`);
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
  }

  // Check for excessive special characters (potential obfuscation)
  const specialCharCount = (input.match(/[^\w\s.,!?;:()\[\]{}'"@#$%^&*+=|\\/<>-]/g) || []).length;
  if (specialCharCount > input.length * 0.1) {
    violations.push(`${fieldName} contains excessive special characters (possible obfuscation)`);
    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
  }

  // Check for multiple triple quotes/backticks (prompt termination attempts)
  const tripleQuoteCount = (input.match(/"""|```/g) || []).length;
  if (tripleQuoteCount >= 2) {
    violations.push(`${fieldName} contains multiple triple quotes/backticks (potential prompt escape)`);
    riskLevel = 'high';
  }

  // Check for XML/HTML-like tags that might be system prompts
  const xmlTagPattern = /<\/?[a-zA-Z][^>]*>/g;
  const xmlTags = input.match(xmlTagPattern) || [];
  if (xmlTags.length > 0) {
    const suspiciousTags = xmlTags.filter(tag => 
      /system|assistant|user|prompt|instruction/gi.test(tag)
    );
    if (suspiciousTags.length > 0) {
      violations.push(`${fieldName} contains suspicious XML/HTML tags: ${suspiciousTags.join(', ')}`);
      riskLevel = 'high';
    }
  }

  // Check for excessive repetition (potential DoS)
  const lines = input.split('\n');
  const repeatedLines = lines.filter((line, index) => 
    lines.indexOf(line) !== index && line.trim().length > 10
  );
  if (repeatedLines.length > lines.length * 0.5) {
    violations.push(`${fieldName} contains excessive repetition (potential DoS attempt)`);
    riskLevel = 'critical';
  }

  return {
    isValid: violations.length === 0,
    violations,
    riskLevel,
    sanitizedInput: sanitizeInput(input)
  };
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove potentially dangerous XML-like tags
    .replace(/<\/?(?:system|assistant|user|prompt|instruction)[^>]*>/gi, '[REMOVED_TAG]')
    // Remove triple quotes/backticks that could be used for prompt escape
    .replace(/```/g, '\'\'\'')
    .replace(/"""/g, '\'\'\'')
    // Normalize excessive whitespace
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/\s{10,}/g, ' ')
    // Remove some suspicious Unicode characters
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    // Limit length
    .slice(0, 10000)
    .trim();
}

export function createSecurePrompt(userMessage: string, context: string, platform: string): {
  isSecure: boolean;
  violations: string[];
  sanitizedMessage?: string;
  sanitizedContext?: string;
  sanitizedPlatform?: string;
} {
  const messageValidation = validateInput(userMessage, 'message');
  const contextValidation = validateInput(context, 'context');
  const platformValidation = validateInput(platform, 'platform');

  const allViolations = [
    ...messageValidation.violations,
    ...contextValidation.violations,
    ...platformValidation.violations
  ];

  const highestRiskLevel = [messageValidation, contextValidation, platformValidation]
    .map(v => v.riskLevel)
    .reduce((highest, current) => {
      const levels = { low: 1, medium: 2, high: 3, critical: 4 };
      return levels[current] > levels[highest] ? current : highest;
    }, 'low');

  const isSecure = allViolations.length === 0 && highestRiskLevel !== 'critical';

  return {
    isSecure,
    violations: allViolations,
    sanitizedMessage: messageValidation.sanitizedInput,
    sanitizedContext: contextValidation.sanitizedInput,
    sanitizedPlatform: platformValidation.sanitizedInput
  };
}

