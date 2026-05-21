import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * En desarrollo/test no aplica rate limit (evita 429 al navegar con React Query / HMR).
 * En producción delega en ThrottlerGuard con los límites de configuración.
 */
@Injectable()
export class DevThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    if (nodeEnv !== 'production') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }
}
