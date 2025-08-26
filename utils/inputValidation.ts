// Unified input validation for API endpoints

import { NextApiRequest, NextApiResponse } from 'next';
import { createSecurePrompt } from './promptSecurity';
import { checkRateLimit } from './rateLimit';
import { getClientId } from './sessionManager';

export interface ValidationConfig {
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  requireSecurityCheck?: boolean;
  maxFieldLength?: number;
  requiredFields?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
  httpStatus?: number;
  sanitizedInputs?: Record<string, string>;
  violations?: string[];
}

const DEFAULT_CONFIG: ValidationConfig = {
  rateLimitMax: 20,
  rateLimitWindowMs: 60000,
  requireSecurityCheck: true,
  maxFieldLength: 10000,
  requiredFields: []
};

export function validateApiInput(
  req: NextApiRequest,
  inputs: Record<string, any>,
  config: ValidationConfig = {}
): ValidationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const clientId = getClientId(req);

  // Rate limiting check
  const rateLimitResult = checkRateLimit(
    clientId, 
    finalConfig.rateLimitMax!, 
    finalConfig.rateLimitWindowMs!
  );
  
  if (!rateLimitResult.allowed) {
    return {
      isValid: false,
      error: 'Too many requests. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      httpStatus: 429
    };
  }

  // Check required fields
  for (const field of finalConfig.requiredFields || []) {
    if (!inputs[field] || (typeof inputs[field] === 'string' && !inputs[field].trim())) {
      return {
        isValid: false,
        error: `${field} is required`,
        errorCode: 'MISSING_REQUIRED_FIELD',
        httpStatus: 400
      };
    }
  }

  // Basic field validation
  const sanitizedInputs: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputs)) {
    if (value === null || value === undefined) {
      sanitizedInputs[key] = '';
      continue;
    }

    const stringValue = String(value);
    
    // Length validation
    if (stringValue.length > finalConfig.maxFieldLength!) {
      return {
        isValid: false,
        error: `${key} exceeds maximum length (${finalConfig.maxFieldLength} characters)`,
        errorCode: 'FIELD_TOO_LONG',
        httpStatus: 400
      };
    }

    // Basic type validation
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return {
        isValid: false,
        error: `${key} has invalid type`,
        errorCode: 'INVALID_FIELD_TYPE',
        httpStatus: 400
      };
    }

    sanitizedInputs[key] = stringValue;
  }

  // Security validation for prompt-sensitive fields
  if (finalConfig.requireSecurityCheck) {
    const securityCheck = createSecurePrompt(
      sanitizedInputs.message || '',
      sanitizedInputs.context || '',
      sanitizedInputs.platform || ''
    );

    if (!securityCheck.isSecure) {
      console.warn(`Security violation from ${clientId}:`, securityCheck.violations);
      return {
        isValid: false,
        error: 'Input contains potentially unsafe content',
        errorCode: 'SECURITY_VIOLATION',
        httpStatus: 400,
        violations: process.env.NODE_ENV === 'development' ? securityCheck.violations : undefined
      };
    }

    // Use sanitized inputs from security check
    if (securityCheck.sanitizedMessage !== undefined) {
      sanitizedInputs.message = securityCheck.sanitizedMessage;
    }
    if (securityCheck.sanitizedContext !== undefined) {
      sanitizedInputs.context = securityCheck.sanitizedContext;
    }
    if (securityCheck.sanitizedPlatform !== undefined) {
      sanitizedInputs.platform = securityCheck.sanitizedPlatform;
    }
  }

  return {
    isValid: true,
    sanitizedInputs
  };
}

export function handleValidationError(
  res: NextApiResponse, 
  result: ValidationResult
): void {
  const responseData: any = { 
    error: result.error,
    code: result.errorCode 
  };

  // Add additional data based on error type
  if (result.errorCode === 'RATE_LIMIT_EXCEEDED') {
    // Rate limit info could be added here if needed
  }
  
  if (result.violations && process.env.NODE_ENV === 'development') {
    responseData.violations = result.violations;
  }

  res.status(result.httpStatus || 400).json(responseData);
}

// Specialized validation for different endpoint types
export function validateSanityCheckInput(req: NextApiRequest, body: any): ValidationResult {
  return validateApiInput(req, body, {
    rateLimitMax: 20,
    rateLimitWindowMs: 60000,
    requireSecurityCheck: true,
    maxFieldLength: 10000,
    requiredFields: ['message']
  });
}

export function validateUrlExtractionInput(req: NextApiRequest, body: any): ValidationResult {
  return validateApiInput(req, body, {
    rateLimitMax: 30,
    rateLimitWindowMs: 60000,
    requireSecurityCheck: false, // URLs don't need prompt injection checks
    maxFieldLength: 2048,
    requiredFields: ['url']
  });
}

// Helper to validate URLs specifically
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Invalid protocol. Only HTTP and HTTPS are allowed.' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

