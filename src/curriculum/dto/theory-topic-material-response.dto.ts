import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TheoryTopicMaterialResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  theoryTopicId!: string;

  @ApiProperty()
  theoryTopicTitle!: string;

  @ApiProperty({ format: 'uuid' })
  licenseCategoryId!: string;

  @ApiProperty()
  licenseCategoryCode!: string;

  @ApiProperty({ format: 'uuid' })
  instructorId!: string;

  @ApiProperty()
  instructorName!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  originalFileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  fileSizeBytes!: number;

  @ApiProperty()
  createdAt!: Date;
}
