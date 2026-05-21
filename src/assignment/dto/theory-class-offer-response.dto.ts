import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TheoryClassOfferStudentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  assignedAt!: Date;
}

export class TheoryClassOfferResponseDto {
  @ApiProperty({ format: 'uuid' })
  instructorId!: string;

  @ApiProperty()
  instructorName!: string;

  @ApiProperty({ format: 'uuid' })
  theoryTopicId!: string;

  @ApiProperty()
  theoryTopicTitle!: string;

  @ApiProperty({ format: 'uuid' })
  licenseCategoryId!: string;

  @ApiProperty()
  licenseCategoryCode!: string;

  @ApiProperty()
  startAt!: Date;

  @ApiProperty()
  endAt!: Date;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classroomId!: string | null;

  @ApiProperty()
  classroomName!: string;

  @ApiProperty()
  capacity!: number;

  @ApiProperty()
  enrolledCount!: number;

  @ApiProperty()
  spotsLeft!: number;

  @ApiProperty({ type: TheoryClassOfferStudentDto, isArray: true })
  students!: TheoryClassOfferStudentDto[];

  @ApiProperty({ description: 'El estudiante autenticado ya está inscrito en esta sesión' })
  isEnrolled!: boolean;
}
