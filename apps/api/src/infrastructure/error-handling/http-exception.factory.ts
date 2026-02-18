/**
 * HTTP Exception Factory
 * Create standardized HTTP exceptions with proper error codes
 */

import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

export class HttpExceptionFactory {
  static badRequest(message: string, errors?: any[]): BadRequestException {
    return new BadRequestException({
      error: 'Bad Request',
      message,
      errors,
    });
  }

  static unauthorized(message: string = 'Unauthorized'): UnauthorizedException {
    return new UnauthorizedException({
      error: 'Unauthorized',
      message,
    });
  }

  static forbidden(message: string = 'Forbidden'): ForbiddenException {
    return new ForbiddenException({
      error: 'Forbidden',
      message,
    });
  }

  static notFound(resource: string, id?: string): NotFoundException {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    
    return new NotFoundException({
      error: 'Not Found',
      message,
    });
  }

  static conflict(message: string): ConflictException {
    return new ConflictException({
      error: 'Conflict',
      message,
    });
  }

  static internalServerError(message?: string): InternalServerErrorException {
    return new InternalServerErrorException({
      error: 'Internal Server Error',
      message: message || 'An unexpected error occurred',
    });
  }

  static serviceUnavailable(service: string): ServiceUnavailableException {
    return new ServiceUnavailableException({
      error: 'Service Unavailable',
      message: `${service} is currently unavailable`,
    });
  }

  static tenantMismatch(): ForbiddenException {
    return new ForbiddenException({
      error: 'Tenant Access Denied',
      message: 'You do not have access to this tenant resource',
    });
  }

  static rateLimitExceeded(retryAfter?: number): BadRequestException {
    return new BadRequestException({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter,
    });
  }

  static quotaExceeded(quota: string): BadRequestException {
    return new BadRequestException({
      error: 'Quota Exceeded',
      message: `Your ${quota} quota has been exceeded`,
    });
  }
}
