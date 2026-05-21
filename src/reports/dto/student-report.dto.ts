import { ApiProperty } from '@nestjs/swagger';

import { ScheduleType } from '../../scheduling/enums/schedule-type.enum';
import { ScheduleStatus } from '../../scheduling/enums/schedule-status.enum';

export class StudentReportDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ example: 'Ana López' })
  studentName!: string;

  @ApiProperty({ example: '2026-05-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate!: string;

  @ApiProperty({ example: 18 })
  classesTaken!: number;

  @ApiProperty({ example: 12 })
  classesCompleted!: number;

  @ApiProperty({ example: 12, description: 'Horas acumuladas de clases no canceladas' })
  hoursAccumulated!: number;

  @ApiProperty({ example: 66.67, description: 'Avance: completadas / no canceladas (%)' })
  progressPercent!: number;

  @ApiProperty()
  byStatus!: Record<ScheduleStatus, number>;

  @ApiProperty({ example: { THEORY: 8, PRACTICE: 10 } })
  byType!: Record<ScheduleType, number>;
}
