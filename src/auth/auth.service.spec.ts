import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entity/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginAttemptRepository } from './repository/login-attempt.repository';
import { RefreshToken } from './entity/refresh-token.entity';
import { RefreshTokenRepository } from './repository/refresh-token.repository';
import { hashToken } from './utils/token.util';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    existsByEmail: jest.fn(),
    create: jest.fn(),
    findByEmail: jest.fn(),
    findByIdOrFail: jest.fn(),
  };

  const refreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findByTokenHash: jest.fn(),
    deleteById: jest.fn(),
  };

  const loginAttemptRepository = {
    findByEmailAndIp: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    reset: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token-mock'),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt') {
        return {
          secret: 'test-secret-key-min-16-chars',
          refreshSecret: 'test-refresh-secret-key',
          expiresIn: '15m',
          refreshExpiresIn: '7d',
        };
      }
      return undefined;
    }),
  };

  const baseUser = (): User =>
    ({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'student@test.com',
      password: '',
      firstName: 'Ana',
      lastName: 'Test',
      phone: null,
      role: UserRole.STUDENT,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshTokens: [],
    }) as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        { provide: LoginAttemptRepository, useValue: loginAttemptRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);

    refreshTokenRepository.create.mockImplementation((data: Partial<RefreshToken>) => data);
    refreshTokenRepository.save.mockImplementation(async (data) => data);
    loginAttemptRepository.findByEmailAndIp.mockResolvedValue(null);
    loginAttemptRepository.create.mockImplementation((data) => ({
      id: 'attempt-id',
      email: data.email ?? '',
      ipAddress: data.ipAddress ?? '',
      attempts: data.attempts ?? 0,
      lockedUntil: data.lockedUntil ?? null,
    }));
    loginAttemptRepository.save.mockImplementation(async (data) => data);
  });

  describe('register', () => {
    it('debe registrar un usuario y retornar tokens', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      const user = baseUser();
      user.password = await bcrypt.hash('SecurePass123!', 12);
      usersService.create.mockResolvedValue(user);

      const result = await service.register({
        email: 'Student@Test.com',
        password: 'SecurePass123!',
        firstName: 'Ana',
        lastName: 'Test',
      });

      expect(result.accessToken).toBe('access-token-mock');
      expect(result.refreshToken).toBeDefined();
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'student@test.com',
          role: UserRole.STUDENT,
        }),
      );
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(
        service.register({
          email: 'student@test.com',
          password: 'SecurePass123!',
          firstName: 'Ana',
          lastName: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('debe autenticar con credenciales válidas', async () => {
      const user = baseUser();
      user.password = await bcrypt.hash('SecurePass123!', 12);
      usersService.findByEmail.mockResolvedValue(user);

      const result = await service.login(
        { email: 'student@test.com', password: 'SecurePass123!' },
        '127.0.0.1',
      );

      expect(result.accessToken).toBeDefined();
      expect(loginAttemptRepository.reset).toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException con credenciales inválidas', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'student@test.com', password: 'wrong' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginAttemptRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si la cuenta está bloqueada', async () => {
      loginAttemptRepository.findByEmailAndIp.mockResolvedValue({
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(
        service.login({ email: 'student@test.com', password: 'SecurePass123!' }, '127.0.0.1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('debe rotar el refresh token y emitir nuevos tokens', async () => {
      const plainRefresh = 'plain-refresh-token-value';
      const user = baseUser();
      user.isActive = true;

      refreshTokenRepository.findByTokenHash.mockResolvedValue({
        id: 'refresh-id',
        token: hashToken(plainRefresh),
        userId: user.id,
        user,
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      const result = await service.refresh(plainRefresh);

      expect(result.accessToken).toBe('access-token-mock');
      expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith('refresh-id');
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el refresh token es inválido', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('debe invalidar el refresh token existente', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue({ id: 'refresh-id' });

      await service.logout('some-refresh-token');

      expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith('refresh-id');
    });

    it('no debe fallar si el refresh token no existe', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.logout('unknown-token')).resolves.toBeUndefined();
    });
  });
});
