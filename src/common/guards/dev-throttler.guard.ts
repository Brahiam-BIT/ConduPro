import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate limit solo en POST /auth/login (fuerza bruta).
 * El resto de la API no se limita globalmente (el panel dispara decenas de GET en paralelo).
 */
@Injectable()
export class DevThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    if (nodeEnv !== 'production') {
      return Promise.resolve(true);
    }
    if (!this.isLoginRoute(context)) {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }

  private isLoginRoute(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path ?? req.url ?? '';
    return req.method === 'POST' && path.includes('/auth/login');
  }

  /** IP real del cliente (Nginx envía X-Forwarded-For). Sin esto, todos comparten un solo cupo. */
  protected getTracker(req: Request): Promise<string> {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return Promise.resolve(forwarded.split(',')[0].trim());
    }
    return Promise.resolve(req.ip ?? req.socket.remoteAddress ?? 'unknown');
  }
}
