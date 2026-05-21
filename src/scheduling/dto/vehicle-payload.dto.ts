import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC-123' })
  @IsString()
  @IsNotEmpty()
  plate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @ApiProperty({ default: true })
  @Transform(({ obj }) => obj.available ?? obj.isAvailable ?? true)
  @IsBoolean()
  available!: boolean;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class VehicleListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 10;
}
