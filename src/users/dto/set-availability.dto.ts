import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UserAvailabilitySlotDto {
  @ApiProperty({ minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [UserAvailabilitySlotDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => UserAvailabilitySlotDto)
  slots!: UserAvailabilitySlotDto[];
}
