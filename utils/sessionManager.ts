// Session management utilities

import { NextApiRequest } from 'next';

export interface ClientInfo {
  id: string;
  ip: string;
  userAgent?: string;
  fingerprint: string;
}

export function getClientId(req: NextApiRequest): string {
  // Get IP address with fallbacks for various proxy configurations
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  
  const ip = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] :
            cfConnectingIp ||
            (Array.isArray(realIp) ? realIp[0] : realIp) ||
            (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ||
            req.socket.remoteAddress ||
            'unknown';
  
  return ip.trim();
}

export function getClientInfo(req: NextApiRequest): ClientInfo {
  const ip = getClientId(req);
  const userAgent = Array.isArray(req.headers['user-agent']) 
    ? req.headers['user-agent'][0] 
    : req.headers['user-agent'];
  
  const fingerprint = createClientFingerprint(ip, userAgent);
  
  return {
    id: ip,
    ip,
    userAgent,
    fingerprint
  };
}

function createClientFingerprint(ip: string, userAgent?: string): string {
  const components = [ip, userAgent || ''].join('|');
  
  // Simple hash function (consider using crypto.createHash for production)
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  const localhostRegex = /^(127\.0\.0\.1|::1|localhost)$/i;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || localhostRegex.test(ip);
}