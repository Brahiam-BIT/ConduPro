import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';

import type { AppConfig } from '../../config/configuration';

/**
 * En desarrollo no aplica rate limit (evita 429 al navegar con React Query / HMR).
 * En producción delega en ThrottlerGuard con los límites de configuración.
 */
@Injectable()
export class DevThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ConstructorParameters<typeof ThrottlerGuard>[0],
    storageService: ConstructorParameters<typeof ThrottlerGuard>[1],
    reflector: ConstructorParameters<typeof ThrottlerGuard>[2],
    private readonly configService: ConfigService<AppConfig, true>,
  ) {
    super(options, storageService, reflector);
  }

  canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.configService.get('nodeEnv', { infer: true }) === 'development') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }
}
