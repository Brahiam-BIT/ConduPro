import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ScheduleStatus } from '../../scheduling/enums/schedule-status.enum';

export class InstructorReportDto {
  @ApiProperty({ format: 'uuid' })
  instructorId!: string;

  @ApiProperty({ example: 'Carlos Méndez' })
  instructorName!: string;

  @ApiProperty({ example: '2026-05-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate!: string;

  @ApiProperty({ example: 24 })
  classesTaught!: number;

  @ApiProperty({ example: 24, description: 'Horas impartidas en el período' })
  hoursTaught!: number;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Requiere módulo de calificaciones (no implementado aún)',
  })
  averageRating!: number | null;

  @ApiProperty()
  byStatus!: Record<ScheduleStatus, number>;
}
