import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';

import { BCRYPT_SALT_ROUNDS } from '../common/constants/auth.constants';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UserAvailabilitySlotDto } from './dto/set-availability.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entity/user.entity';
import { UsersRepository } from './repository/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.usersRepository.existsByEmail(email);
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findActiveByRole(role: UserRole): Promise<User[]> {
    return this.usersRepository.findActiveByRole(role);
  }

  async findAll(query: UserListQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [users, total] = await this.usersRepository.findByFilters({
      search: query.search,
      role: query.role,
      isActive: query.isActive,
      page,
      limit,
    });

    return {
      data: users.map((u) => this.toResponseDto(u)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findByIdOrFail(id);
    return this.toResponseDto(user);
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const email = dto.email.toLowerCase();
    if (await this.existsByEmail(email)) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.create({
      email,
      password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      role: dto.role,
      isActive: true,
    });

    return this.toResponseDto(user);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findByIdOrFail(id);

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const email = dto.email.toLowerCase();
      if (await this.existsByEmail(email)) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }
      user.email = email;
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const saved = await this.usersRepository.save(user);
    return this.toResponseDto(saved);
  }

  async getAvailability(userId: string): Promise<UserAvailabilitySlotDto[]> {
    const user = await this.findByIdOrFail(userId);
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException('Solo instructores tienen disponibilidad semanal');
    }
    return [];
  }

  async setAvailability(
    userId: string,
    slots: UserAvailabilitySlotDto[],
  ): Promise<UserAvailabilitySlotDto[]> {
    const user = await this.findByIdOrFail(userId);
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException('Solo instructores tienen disponibilidad semanal');
    }
    return slots;
  }

  toResponseDto(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }
}
