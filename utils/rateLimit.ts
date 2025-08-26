// Rate limiting utilities

interface RateLimitData {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limiting (use Redis in production)
const requestCounts = new Map<string, RateLimitData>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  clientId: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const clientData = requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    const resetTime = now + windowMs;
    requestCounts.set(clientId, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  if (clientData.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: clientData.resetTime,
    };
  }

  clientData.count++;
  return {
    allowed: true,
    remaining: maxRequests - clientData.count,
    resetTime: clientData.resetTime,
  };
}

export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [clientId, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(clientId);
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
