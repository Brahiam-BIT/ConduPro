import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { ScheduleStatus } from '../enums/schedule-status.enum';
import { ScheduleType } from '../enums/schedule-type.enum';

class ScheduleUserSummaryDto {
  @Expose()
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty()
  firstName!: string;

  @Expose()
  @ApiProperty()
  lastName!: string;

  @Expose()
  @ApiProperty()
  email!: string;
}

class ScheduleVehicleSummaryDto {
  @Expose()
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty()
  plate!: string;

  @Expose()
  @ApiProperty()
  brand!: string;

  @Expose()
  @ApiProperty()
  model!: string;
}

class ScheduleClassroomSummaryDto {
  @Expose()
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty()
  name!: string;
}

export class ScheduleResponseDto {
  @Expose()
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ enum: ScheduleType })
  type!: ScheduleType;

  @Expose()
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @Expose()
  @ApiProperty({ format: 'uuid' })
  instructorId!: string;

  @Expose()
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  vehicleId!: string | null;

  @Expose()
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classroomId!: string | null;

  @Expose()
  @ApiProperty()
  startTime!: Date;

  @Expose()
  @ApiProperty()
  endTime!: Date;

  @Expose()
  @ApiProperty({ enum: ScheduleStatus })
  status!: ScheduleStatus;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;

  @Expose()
  @Type(() => ScheduleUserSummaryDto)
  @ApiPropertyOptional({ type: ScheduleUserSummaryDto })
  student?: ScheduleUserSummaryDto;

  @Expose()
  @Type(() => ScheduleUserSummaryDto)
  @ApiPropertyOptional({ type: ScheduleUserSummaryDto })
  instructor?: ScheduleUserSummaryDto;

  @Expose()
  @Type(() => ScheduleVehicleSummaryDto)
  @ApiPropertyOptional({ type: ScheduleVehicleSummaryDto })
  vehicle?: ScheduleVehicleSummaryDto | null;

  @Expose()
  @Type(() => ScheduleClassroomSummaryDto)
  @ApiPropertyOptional({ type: ScheduleClassroomSummaryDto })
  classroom?: ScheduleClassroomSummaryDto | null;
}
