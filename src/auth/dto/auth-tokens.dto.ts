import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({ description: 'JWT de acceso (15 min)' })
  accessToken!: string;

  @ApiProperty({ description: 'Refresh token opaco (7 días)' })
  refreshToken!: string;
}
