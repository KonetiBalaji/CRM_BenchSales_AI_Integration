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
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logPerformance(method, url, duration, 'success');
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logPerformance(method, url, duration, 'error', error);
        },
      }),
    );
  }

  private logPerformance(
    method: string,
    url: string,
    duration: number,
    status: 'success' | 'error',
    error?: Error,
  ) {
    const logData = {
      method,
      url,
      duration,
      status,
    };

    if (duration > 1000) {
      this.logger.warn('Slow request detected', logData);
    } else if (duration > 5000) {
      this.logger.error('Very slow request detected', logData);
    }

    if (error) {
      this.logger.error('Request failed', { ...logData, error: error.message });
    }
  }
}
