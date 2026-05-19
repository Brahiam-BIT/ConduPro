import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { UserRole } from '../../common/enums/user-role.enum';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ example: 'student@condupro.com' })
  email!: string;

  @Expose()
  @ApiProperty({ example: 'Juan' })
  firstName!: string;

  @Expose()
  @ApiProperty({ example: 'Pérez' })
  lastName!: string;

  @Expose()
  @ApiProperty({ example: '+573001234567', nullable: true })
  phone!: string | null;

  @Expose()
  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
  role!: UserRole;

  @Expose()
  @ApiProperty({ example: true })
  isActive!: boolean;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
