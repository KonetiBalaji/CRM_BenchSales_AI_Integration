/**
 * Global Exception Filter
 * Provides standardized error responses with proper logging and monitoring
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId?: string;
  tenantId?: string;
  timestamp: string;
  errors?: any[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error with full context
    this.logError(exception, errorResponse, request);

    // Send response
    response.status(errorResponse.status).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let errors: any[] | undefined;

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
        title = exception.message;
      } else if (typeof exceptionResponse === 'object') {
        const response = exceptionResponse as any;
        title = response.error || exception.message;
        detail = response.message || detail;
        errors = response.errors;
      }
    }
    // Handle Prisma errors
    else if (exception instanceof PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      title = prismaError.title;
      detail = prismaError.detail;
    }
    // Handle validation errors
    else if (this.isValidationError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      title = 'Validation Error';
      detail = 'The request contains invalid data';
      errors = (exception as any).errors;
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      detail = this.sanitizeErrorMessage(exception.message);
      title = exception.name;
    }

    return {
      type: this.getErrorType(status),
      title,
      status,
      detail,
      instance: request.url,
      traceId: request.headers['x-trace-id'] as string,
      tenantId: (request as any).user?.tenantId,
      timestamp: new Date().toISOString(),
      errors,
    };
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    status: number;
    title: string;
    detail: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          title: 'Unique Constraint Violation',
          detail: 'A record with this value already exists',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          title: 'Record Not Found',
          detail: 'The requested record does not exist',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Foreign Key Constraint Failed',
          detail: 'The referenced record does not exist',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Invalid Relationship',
          detail: 'The relation constraint failed',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          title: 'Database Error',
          detail: 'A database error occurred',
        };
    }
  }

  private isValidationError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      ('errors' in exception || exception.name === 'ValidationError')
    );
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    const sanitized = message
      .replace(/password[=:]\s*\S+/gi, 'password=***')
      .replace(/token[=:]\s*\S+/gi, 'token=***')
      .replace(/secret[=:]\s*\S+/gi, 'secret=***')
      .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=***');

    // In production, return generic message for unknown errors
    if (process.env.NODE_ENV === 'production') {
      return 'An error occurred while processing your request';
    }

    return sanitized;
  }

  private getErrorType(status: number): string {
    const types: Record<number, string> = {
      400: '/errors/bad-request',
      401: '/errors/unauthorized',
      403: '/errors/forbidden',
      404: '/errors/not-found',
      409: '/errors/conflict',
      422: '/errors/unprocessable-entity',
      429: '/errors/too-many-requests',
      500: '/errors/internal-server-error',
      502: '/errors/bad-gateway',
      503: '/errors/service-unavailable',
    };

    return types[status] || '/errors/unknown';
  }

  private logError(exception: unknown, errorResponse: ErrorResponse, request: Request) {
    const logContext = {
      error: errorResponse,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      user: (request as any).user?.sub,
      tenantId: (request as any).user?.tenantId,
    };

    if (errorResponse.status >= 500) {
      this.logger.error(
        `${errorResponse.title}: ${errorResponse.detail}`,
        exception instanceof Error ? exception.stack : undefined,
        logContext
      );
    } else if (errorResponse.status >= 400) {
      this.logger.warn(`${errorResponse.title}: ${errorResponse.detail}`, logContext);
    }
  }
}
