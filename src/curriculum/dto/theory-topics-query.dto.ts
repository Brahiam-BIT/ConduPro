import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class TheoryTopicsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Filtrar por categoría. Si se omite, devuelve todos los temas (una sola petición para el panel admin).',
  })
  @IsOptional()
  @IsUUID()
  licenseCategoryId?: string;
}
