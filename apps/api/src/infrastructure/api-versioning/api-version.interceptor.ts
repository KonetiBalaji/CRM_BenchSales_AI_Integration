import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_VERSION_KEY } from './api-version.decorator';

@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const version = this.reflector.get<string>(
      API_VERSION_KEY,
      context.getHandler(),
    );

    const response = context.switchToHttp().getResponse();

    if (version) {
      response.setHeader('X-API-Version', version);
    }

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object') {
          return {
            ...data,
            _meta: {
              version: version || '1.0',
              timestamp: new Date().toISOString(),
            },
          };
        }
        return data;
      }),
    );
  }
}
