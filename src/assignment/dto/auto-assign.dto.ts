import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { ScheduleType } from '../../scheduling/enums/schedule-type.enum';

export class AutoAssignDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: ScheduleType })
  @IsEnum(ScheduleType)
  type!: ScheduleType;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: 'Fecha preferida; si no se envía, busca en los próximos 7 días',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  preferredDate?: Date;
}
