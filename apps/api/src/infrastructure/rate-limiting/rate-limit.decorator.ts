/**
 * Rate Limit Decorator
 * Apply rate limiting to controller methods
 */

import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export const RateLimit = (options: RateLimitOptions = {}) =>
  SetMetadata(RATE_LIMIT_KEY, options);

// Predefined decorators for common use cases
export const RateLimitStrict = () =>
  RateLimit({ windowMs: 60000, maxRequests: 10 });

export const RateLimitModerate = () =>
  RateLimit({ windowMs: 60000, maxRequests: 60 });

export const RateLimitRelaxed = () =>
  RateLimit({ windowMs: 60000, maxRequests: 300 });
