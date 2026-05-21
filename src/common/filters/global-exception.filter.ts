import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const resolved = this.resolveException(exception);

    if (resolved.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${resolved.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode: resolved.statusCode,
      message: resolved.message,
      error: resolved.error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(resolved.statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { statusCode: status, message: response, error: exception.name };
      }

      const payload = response as { message?: string | string[]; error?: string };
      return {
        statusCode: status,
        message: payload.message ?? exception.message,
        error: payload.error ?? exception.name,
      };
    }

    if (exception instanceof QueryFailedError) {
      const pgCode = (exception.driverError as { code?: string })?.code;

      if (pgCode === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'El registro ya existe o viola una restricción única',
          error: 'Conflict',
        };
      }

      if (pgCode === '23503') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referencia inválida: el recurso relacionado no existe',
          error: 'Bad Request',
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
    };
  }
}
