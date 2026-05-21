import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  licenseCategoryId!: string;
}

export class CreateMyEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  licenseCategoryId!: string;
}
