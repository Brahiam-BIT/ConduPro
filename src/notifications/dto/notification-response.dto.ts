import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
  @Expose()
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @Expose()
  @ApiProperty()
  title!: string;

  @Expose()
  @ApiProperty()
  message!: string;

  @Expose()
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  scheduleId!: string | null;

  @Expose()
  @ApiProperty({ example: false })
  isRead!: boolean;

  @Expose()
  @ApiProperty()
  createdAt!: Date;
}
