import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TheoryTopicResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  licenseCategoryId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  sessionCapacity!: number;

  @ApiPropertyOptional({ nullable: true })
  estimatedHours!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
