import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  @ApiOkResponse({
    description: 'Estado del servicio.',
    schema: {
      example: {
        status: 'ok',
        uptime: 12.345,
        timestamp: '2026-05-19T19:00:00.000Z',
      },
    },
  })
  check(): { status: 'ok'; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
