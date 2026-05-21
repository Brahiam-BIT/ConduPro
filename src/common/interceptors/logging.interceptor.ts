import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startedAt;
          this.logger.log(`${method} ${originalUrl} ${response.statusCode} ${ms}ms`);
        },
        error: (error: { status?: number; message?: string }) => {
          const status = error.status ?? response.statusCode ?? 500;
          const ms = Date.now() - startedAt;
          this.logger.warn(`${method} ${originalUrl} ${status} ${ms}ms — ${error.message ?? 'error'}`);
        },
      }),
    );
  }
}
