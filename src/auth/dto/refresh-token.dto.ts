import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token emitido en login o refresh anterior' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
