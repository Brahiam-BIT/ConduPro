import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { AvailabilityClassType } from '../enums/availability-class-type.enum';
import { AvailabilityRecurrence } from '../enums/availability-recurrence.enum';

export class UserAvailabilitySlotDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: '1=lunes … 5=viernes' })
  @IsInt()
  @Min(1)
  @Max(5)
  dayOfWeek!: number;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Fecha concreta (solo ese día). Si se omite, aplica la recurrencia semanal.',
  })
  @IsOptional()
  @IsDateString()
  slotDate?: string | null;

  @ApiProperty({ minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;

  @ApiProperty({ enum: AvailabilityClassType, default: AvailabilityClassType.PRACTICE })
  @IsEnum(AvailabilityClassType)
  classType!: AvailabilityClassType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((o) => o.classType === AvailabilityClassType.THEORY)
  @IsUUID()
  theoryTopicId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  licenseCategoryId?: string | null;

  @ApiProperty({ enum: AvailabilityRecurrence, default: AvailabilityRecurrence.WEEKLY })
  @IsEnum(AvailabilityRecurrence)
  recurrence!: AvailabilityRecurrence;

  @ApiPropertyOptional({ minimum: 1, maximum: 4, nullable: true })
  @ValidateIf((o) => o.recurrence === AvailabilityRecurrence.MONTHLY_NTH)
  @IsInt()
  @Min(1)
  @Max(4)
  monthWeek?: number | null;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [UserAvailabilitySlotDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => UserAvailabilitySlotDto)
  slots!: UserAvailabilitySlotDto[];
}
