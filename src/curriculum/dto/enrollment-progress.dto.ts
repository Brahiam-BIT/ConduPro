import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import { LicenseCategoryResponseDto } from './license-category-response.dto';

export class TheoryTopicProgressItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  completed!: boolean;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;
}

export class EnrollmentProgressDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  status!: EnrollmentStatus;

  @ApiProperty()
  enrolledAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ type: LicenseCategoryResponseDto })
  licenseCategory!: LicenseCategoryResponseDto;

  @ApiProperty()
  theoryRequired!: number;

  @ApiProperty()
  theoryCompleted!: number;

  @ApiProperty()
  practiceRequired!: number;

  @ApiProperty()
  practiceCompleted!: number;

  @ApiProperty()
  theoryPercent!: number;

  @ApiProperty()
  practicePercent!: number;

  @ApiProperty()
  overallPercent!: number;

  @ApiProperty()
  isLicenseComplete!: boolean;

  @ApiProperty({ type: [TheoryTopicProgressItemDto] })
  theoryTopics!: TheoryTopicProgressItemDto[];
}
