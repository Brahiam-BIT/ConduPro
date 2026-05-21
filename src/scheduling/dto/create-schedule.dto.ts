import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { ScheduleType } from '../enums/schedule-type.enum';

export class CreateScheduleDto {
  @ApiProperty({ enum: ScheduleType })
  @IsEnum(ScheduleType)
  type!: ScheduleType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  instructorId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Requerido si type = PRACTICE' })
  @ValidateIf((o: CreateScheduleDto) => o.type === ScheduleType.PRACTICE)
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Requerido si type = THEORY' })
  @ValidateIf((o: CreateScheduleDto) => o.type === ScheduleType.THEORY)
  @IsUUID()
  classroomId?: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-05-20T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Por defecto startTime + 1h',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Licencia a la que cuenta esta clase (progreso del estudiante)',
  })
  @IsOptional()
  @IsUUID()
  licenseCategoryId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Tema teórico (solo si type = THEORY)',
  })
  @ValidateIf((o: CreateScheduleDto) => o.type === ScheduleType.THEORY)
  @IsOptional()
  @IsUUID()
  theoryTopicId?: string;
}
