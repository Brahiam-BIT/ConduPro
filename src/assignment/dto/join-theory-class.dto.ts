import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';

export class JoinTheoryClassDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  instructorId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  theoryTopicId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  licenseCategoryId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startAt!: Date;
}
