import { ApiProperty } from '@nestjs/swagger';

/** Esquema de referencia para respuestas envueltas por ResponseInterceptor. */
export class ApiEnvelopeDto<T = unknown> {
  @ApiProperty({ description: 'Cuerpo de la respuesta' })
  data!: T;

  @ApiProperty({
    description: 'Metadatos (paginación u otros)',
    example: {},
  })
  meta!: Record<string, unknown>;

  @ApiProperty({ example: '2026-05-19T19:00:00.000Z' })
  timestamp!: string;
}
