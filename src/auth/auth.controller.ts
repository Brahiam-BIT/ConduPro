import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Registro de usuario (rol STUDENT por defecto)' })
  @ApiCreatedResponse({ type: AuthTokensDto })
  @ApiConflictResponse({ description: 'El correo ya está registrado' })
  async register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'auth-login': { limit: 5, ttl: 60_000 } })
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Inicio de sesión' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiForbiddenResponse({ description: 'Cuenta bloqueada o desactivada' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos (rate limit)' })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokensDto> {
    const ipAddress = this.resolveClientIp(req);
    return this.authService.login(dto, ipAddress);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Renovar access token (rota el refresh token)' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido o expirado' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  @ApiNoContentResponse({ description: 'Sesión cerrada' })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    if (dto.refreshToken?.trim()) {
      await this.authService.logout(dto.refreshToken);
    }
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  async me(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    const profile = await this.authService.getProfile(user.sub);
    return this.usersService.toResponseDto(profile);
  }

  private resolveClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
