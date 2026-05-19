import { ApiProperty } from '@nestjs/swagger';

import { ScheduleStatus } from '../../scheduling/enums/schedule-status.enum';

export class SummaryReportDto {
  @ApiProperty({ example: '2026-05-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate!: string;

  @ApiProperty({ example: 120 })
  totalClasses!: number;

  @ApiProperty({
    example: { PENDING: 10, CONFIRMED: 40, COMPLETED: 60, CANCELLED: 10 },
  })
  byStatus!: Record<ScheduleStatus, number>;

  @ApiProperty({ example: 60 })
  completedClasses!: number;

  @ApiProperty({ example: 66.67, description: 'Porcentaje de clases completadas sobre las no canceladas' })
  completionRate!: number;
}
