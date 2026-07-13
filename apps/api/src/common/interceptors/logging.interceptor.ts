import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Emits a structured access-log line per request with method, path, status and
 * latency. Kept intentionally small; richer tracing/metrics can layer on later.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const elapsedMs =
          Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        this.logger.log(
          `${request.method} ${request.originalUrl} ${response.statusCode} ${elapsedMs.toFixed(1)}ms`,
        );
      }),
    );
  }
}
