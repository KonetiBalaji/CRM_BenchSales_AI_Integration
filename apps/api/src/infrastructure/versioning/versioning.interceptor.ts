/**
 * API Versioning Interceptor
 * Handles API version negotiation and deprecation warnings
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class VersioningInterceptor implements NestInterceptor {
  private readonly logger = new Logger(VersioningInterceptor.name);

  // Track deprecated versions and their sunset dates
  private readonly deprecatedVersions: Record<string, { sunsetDate: Date; message: string }> = {
    'v0': {
      sunsetDate: new Date('2025-12-31'),
      message: 'API v0 is deprecated. Please migrate to v1. See docs.benchcrm.com/migration',
    },
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract API version from URL or header
    const apiVersion = this.extractApiVersion(request);

    // Check if version is deprecated
    const deprecation = this.deprecatedVersions[apiVersion];
    if (deprecation) {
      const daysUntilSunset = Math.ceil(
        (deprecation.sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Set deprecation headers
      response.setHeader('X-API-Deprecation', 'true');
      response.setHeader('X-API-Sunset-Date', deprecation.sunsetDate.toISOString());
      response.setHeader('X-API-Deprecation-Message', deprecation.message);
      response.setHeader('X-API-Days-Until-Sunset', daysUntilSunset.toString());

      this.logger.warn(
        `Deprecated API version ${apiVersion} accessed. Days until sunset: ${daysUntilSunset}`
      );
    }

    // Set current version header
    response.setHeader('X-API-Version', apiVersion || 'v1');

    return next.handle().pipe(
      tap(() => {
        // Log API usage metrics
        this.logger.debug(`API ${apiVersion} called: ${request.method} ${request.url}`);
      })
    );
  }

  private extractApiVersion(request: any): string {
    // Check URL path first (/api/v1/...)
    const urlMatch = request.url.match(/\/api\/(v\d+)\//);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Check custom header
    const headerVersion = request.headers['x-api-version'];
    if (headerVersion) {
      return headerVersion;
    }

    // Default to v1
    return 'v1';
  }
}
