import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class VehicleResponseDto {
  @Expose()
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty()
  plate!: string;

  @Expose()
  @ApiProperty()
  brand!: string;

  @Expose()
  @ApiProperty()
  model!: string;

  @Expose()
  @ApiProperty()
  year!: number;

  @Expose()
  @Transform(({ obj }) => obj.isAvailable ?? obj.available)
  @ApiProperty({ name: 'available' })
  available!: boolean;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @Transform(({ obj }) => obj.updatedAt ?? obj.createdAt)
  @ApiProperty()
  updatedAt!: Date;
}
