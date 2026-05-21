import { ApiProperty } from '@nestjs/swagger';

export class DashboardKpisDto {
  @ApiProperty({ example: 42 })
  activeUsers!: number;

  @ApiProperty({ example: 120 })
  monthSchedules!: number;

  @ApiProperty({ example: 75.5 })
  completionRate!: number;

  @ApiProperty({ example: 3 })
  activeVehicles!: number;
}

export class SchedulesByDayPointDto {
  @ApiProperty({ example: '2026-05-20' })
  date!: string;

  @ApiProperty({ example: 8 })
  scheduled!: number;

  @ApiProperty({ example: 5 })
  completed!: number;
}

export class InstructorReportRowDto {
  @ApiProperty({ format: 'uuid' })
  instructorId!: string;

  @ApiProperty()
  instructorName!: string;

  @ApiProperty()
  totalClasses!: number;

  @ApiProperty()
  totalHours!: number;

  @ApiProperty()
  completionRate!: number;
}

export class AdminReportSummaryDto {
  @ApiProperty()
  totalSchedules!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  cancelled!: number;

  @ApiProperty()
  attendanceRate!: number;

  @ApiProperty()
  theoryCount!: number;

  @ApiProperty()
  practiceCount!: number;
}
