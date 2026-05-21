import { ApiProperty } from '@nestjs/swagger';

export class AvailabilitySlotDto {
  @ApiProperty()
  startTime!: Date;

  @ApiProperty()
  endTime!: Date;
}

export class AvailabilityResponseDto {
  @ApiProperty({ example: '2026-05-20' })
  date!: string;

  @ApiProperty({ format: 'uuid' })
  instructorId!: string;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  slots!: AvailabilitySlotDto[];
}
