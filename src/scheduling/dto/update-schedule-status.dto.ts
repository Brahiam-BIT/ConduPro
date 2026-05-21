import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ScheduleStatus } from '../enums/schedule-status.enum';

export class UpdateScheduleStatusDto {
  @ApiProperty({ enum: ScheduleStatus })
  @IsEnum(ScheduleStatus)
  status!: ScheduleStatus;
}
