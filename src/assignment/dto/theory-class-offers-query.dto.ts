import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class TheoryClassOffersQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtrar por licencia matriculada' })
  @IsOptional()
  @IsUUID()
  licenseCategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtrar por tema teórico' })
  @IsOptional()
  @IsUUID()
  theoryTopicId?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Primera fecha a buscar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ default: 14, minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}
