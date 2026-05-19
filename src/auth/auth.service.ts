import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import {
  BCRYPT_SALT_ROUNDS,
  LOGIN_LOCKOUT_TTL_MS,
  MAX_LOGIN_ATTEMPTS,
} from '../common/constants/auth.constants';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import type { AppConfig } from '../config/configuration';
import { User } from '../users/entity/user.entity';
import { UsersService } from '../users/users.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginAttempt } from './entity/login-attempt.entity';
import { LoginAttemptRepository } from './repository/login-attempt.repository';
import { RefreshTokenRepository } from './repository/refresh-token.repository';
import { generateOpaqueToken, hashToken, parseDurationToMs } from './utils/token.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly loginAttemptRepository: LoginAttemptRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const email = dto.email.toLowerCase();

    if (await this.usersService.existsByEmail(email)) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      role: UserRole.STUDENT,
      isActive: true,
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto, ipAddress: string): Promise<AuthTokensDto> {
    const email = dto.email.toLowerCase();
    await this.assertNotLocked(email, ipAddress);

    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      await this.recordFailedAttempt(email, ipAddress);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Cuenta desactivada');
    }

    await this.loginAttemptRepository.reset(email, ipAddress);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.refreshTokenRepository.deleteById(stored.id);
      }
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = stored.user;
    if (!user.isActive) {
      throw new ForbiddenException('Cuenta desactivada');
    }

    await this.refreshTokenRepository.deleteById(stored.id);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (stored) {
      await this.refreshTokenRepository.deleteById(stored.id);
    }
  }

  async getProfile(userId: string): Promise<User> {
    return this.usersService.findByIdOrFail(userId);
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expiresIn,
    });

    const plainRefreshToken = generateOpaqueToken();
    const refreshExpiresMs = parseDurationToMs(jwtConfig.refreshExpiresIn);

    const refreshEntity = this.refreshTokenRepository.create({
      token: hashToken(plainRefreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    });
    await this.refreshTokenRepository.save(refreshEntity);

    return { accessToken, refreshToken: plainRefreshToken };
  }

  private async assertNotLocked(email: string, ipAddress: string): Promise<void> {
    const record = await this.loginAttemptRepository.findByEmailAndIp(email, ipAddress);

    if (record?.lockedUntil && record.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intente más tarde.',
      );
    }
  }

  private async recordFailedAttempt(email: string, ipAddress: string): Promise<void> {
    let record = await this.loginAttemptRepository.findByEmailAndIp(email, ipAddress);

    if (!record) {
      record = this.loginAttemptRepository.create({
        email,
        ipAddress,
        attempts: 0,
        lockedUntil: null,
      });
    }

    record.attempts += 1;

    if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_TTL_MS);
    }

    await this.loginAttemptRepository.save(record);
  }
}
