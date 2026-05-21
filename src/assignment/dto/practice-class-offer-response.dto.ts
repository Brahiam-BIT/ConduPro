import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PracticeClassOfferResponseDto {
  @ApiProperty({ format: 'uuid' })
  instructorId!: string;

  @ApiProperty()
  instructorName!: string;

  @ApiProperty({ format: 'uuid' })
  licenseCategoryId!: string;

  @ApiProperty()
  licenseCategoryCode!: string;

  @ApiProperty()
  startAt!: Date;

  @ApiProperty()
  endAt!: Date;

  @ApiPropertyOptional({ description: 'Vehículo que se asignará al confirmar la reserva' })
  vehicleHint!: string | null;
}
