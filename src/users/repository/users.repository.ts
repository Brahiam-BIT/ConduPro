import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../entity/user.entity';

export interface UserListFilterParams {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  create(data: Partial<User>): User {
    return this.repository.create(data);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.repository.exists({ where: { email } });
  }

  async findActiveByRole(role: UserRole): Promise<User[]> {
    return this.repository.find({
      where: { role, isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
  }

  async findByFilters(params: UserListFilterParams): Promise<[User[], number]> {
    const qb = this.repository.createQueryBuilder('user');

    if (params.role) {
      qb.andWhere('user.role = :role', { role: params.role });
    }

    if (params.isActive !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive: params.isActive });
    }

    if (params.search?.trim()) {
      const term = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(user.email) LIKE :term', { term })
            .orWhere('LOWER(user.first_name) LIKE :term', { term })
            .orWhere('LOWER(user.last_name) LIKE :term', { term });
        }),
      );
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit);

    return qb.getManyAndCount();
  }

  async countActive(): Promise<number> {
    return this.repository.count({ where: { isActive: true } });
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.repository.count({ where: { role, isActive: true } });
  }
}
