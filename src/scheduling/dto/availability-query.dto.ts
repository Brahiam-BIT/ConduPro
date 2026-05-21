import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  instructorId!: string;

  @ApiProperty({ example: '2026-05-20', description: 'Fecha en formato YYYY-MM-DD' })
  @IsDateString()
  date!: string;
}
