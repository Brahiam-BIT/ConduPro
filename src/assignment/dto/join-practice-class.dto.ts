import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class JoinPracticeClassDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  instructorId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  licenseCategoryId!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startAt!: string;
}
