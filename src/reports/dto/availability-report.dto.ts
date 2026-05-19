import { ApiProperty } from '@nestjs/swagger';

export class ResourceOccupancyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Carlos Méndez' })
  label!: string;

  @ApiProperty({ example: 48 })
  availableHours!: number;

  @ApiProperty({ example: 18 })
  bookedHours!: number;

  @ApiProperty({ example: 37.5 })
  occupancyPercent!: number;
}

export class AvailabilityReportDto {
  @ApiProperty({ example: '2026-05-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate!: string;

  @ApiProperty({ example: 12, description: 'Horas disponibles por día laboral (7:00–19:00)' })
  hoursPerWorkingDay!: number;

  @ApiProperty({ example: 26 })
  workingDaysInPeriod!: number;

  @ApiProperty({ type: [ResourceOccupancyDto] })
  instructors!: ResourceOccupancyDto[];

  @ApiProperty({ type: [ResourceOccupancyDto] })
  vehicles!: ResourceOccupancyDto[];
}
