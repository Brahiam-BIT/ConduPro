import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class DateRangeQueryDto {
  @ApiProperty({ example: '2026-05-01', description: 'Fecha inicio (YYYY-MM-DD)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-05-31', description: 'Fecha fin (YYYY-MM-DD)' })
  @IsDateString()
  endDate!: string;
}
