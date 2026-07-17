import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import {
  Observable,
  TimeoutError,
  throwError,
  timeout,
  catchError,
} from 'rxjs';

/**
 * Aborts any request that outlives `timeoutMs`, translating it into a
 * `408 Request Timeout`. Prevents slow or hung handlers from accumulating and
 * exhausting the event loop / connection pool under load.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((error: unknown) =>
        error instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException('Request timed out'))
          : throwError(() => error),
      ),
    );
  }
}
