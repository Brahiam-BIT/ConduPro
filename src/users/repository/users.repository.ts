import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../entity/user.entity';

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
}
