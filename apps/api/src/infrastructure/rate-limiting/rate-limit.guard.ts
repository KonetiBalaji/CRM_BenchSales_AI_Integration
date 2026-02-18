/**
 * Rate Limit Guard
 * Enforces rate limiting on protected routes
 */

import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';
import { EnhancedRateLimitService } from './enhanced-rate-limit.service';
import { HttpExceptionFactory } from '../error-handling/http-exception.factory';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: EnhancedRateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler()
    );

    if (!options) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = user?.tenantId;

    if (!tenantId) {
      return true; // Skip rate limiting for unauthenticated requests
    }

    // Check tenant-level rate limit
    const tenantLimit = await this.rateLimitService.checkTenantRateLimit(
      tenantId,
      user?.plan || 'FREE'
    );

    if (!tenantLimit.allowed) {
      this.setRateLimitHeaders(request, tenantLimit);
      throw HttpExceptionFactory.rateLimitExceeded(tenantLimit.retryAfter);
    }

    // Check endpoint-specific rate limit if configured
    const endpoint = request.route?.path;
    if (endpoint) {
      const endpointLimit = await this.rateLimitService.checkEndpointRateLimit(
        tenantId,
        endpoint
      );

      if (!endpointLimit.allowed) {
        this.setRateLimitHeaders(request, endpointLimit);
        throw HttpExceptionFactory.rateLimitExceeded(endpointLimit.retryAfter);
      }
    }

    // Set rate limit headers
    this.setRateLimitHeaders(request, tenantLimit);

    return true;
  }

  private setRateLimitHeaders(request: any, result: any) {
    const response = request.res;
    if (response) {
      response.setHeader('X-RateLimit-Limit', result.remaining + (result.allowed ? 1 : 0));
      response.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
      response.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());
      if (result.retryAfter) {
        response.setHeader('Retry-After', result.retryAfter);
      }
    }
  }
}
