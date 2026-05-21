import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { PaginatedResponseDto } from '../dto/paginated-response.dto';
import type { ApiResponseEnvelope, PaginatedMeta } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponseEnvelope> {
    return next.handle().pipe(
      map((data: unknown) => {
        const timestamp = new Date().toISOString();

        if (data === undefined || data === null) {
          return { data: null, meta: {}, timestamp };
        }

        if (this.isPaginatedResponse(data)) {
          const meta: PaginatedMeta = {
            total: data.total,
            page: data.page,
            limit: data.limit,
          };
          return { data: data.data, meta, timestamp };
        }

        return { data, meta: {}, timestamp };
      }),
    );
  }

  private isPaginatedResponse(value: unknown): value is PaginatedResponseDto<unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as PaginatedResponseDto<unknown>;
    return (
      Array.isArray(candidate.data) &&
      typeof candidate.total === 'number' &&
      typeof candidate.page === 'number' &&
      typeof candidate.limit === 'number'
    );
  }
}
