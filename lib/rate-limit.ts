/**
 * Simple in-memory rate limiting utility
 * 
 * This module provides rate limiting functionality to prevent abuse and brute force attacks.
 * For production environments, consider using Redis or a similar distributed cache.
 * 
 * @fileoverview Rate limiting implementation with configurable limits and time windows
 */

/**
 * Interface for storing rate limit entries
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory store for rate limit entries
 * In production, this should be replaced with Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Checks if a request should be allowed based on rate limiting rules
 * 
 * This function implements a sliding window rate limiter that tracks requests
 * per identifier (typically IP address or user ID) within a specified time window.
 * 
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param maxRequests - Maximum number of requests allowed within the time window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object containing rate limit status and metadata
 * 
 * @example
 * ```typescript
 * // Rate limit login attempts: 5 attempts per 5 minutes
 * const result = rateLimit('login:192.168.1.1', 5, 300000);
 * if (!result.allowed) {
 *   console.log('Rate limit exceeded. Try again at:', new Date(result.resetTime));
 * }
 * ```
 */
export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }
  
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Extracts the client IP address from request headers
 * 
 * This function attempts to get the real client IP address by checking
 * common proxy headers. It's designed to work with reverse proxies
 * and load balancers commonly used in production environments.
 * 
 * @param request - The incoming request object
 * @returns The client IP address or 'unknown' if not found
 * 
 * @example
 * ```typescript
 * const clientIP = getClientIP(request);
 * const rateLimitResult = rateLimit(`login:${clientIP}`, 5, 300000);
 * ```
 */
export function getClientIP(request: Request): string {
  // Try to get real IP from headers (for production with reverse proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default identifier
  return 'unknown';
}
