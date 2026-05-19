import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefreshToken } from '../entity/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  create(data: Partial<RefreshToken>): RefreshToken {
    return this.repository.create(data);
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    return this.repository.save(token);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: { token: tokenHash },
      relations: ['user'],
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async deleteByIdAndUserId(id: string, userId: string): Promise<void> {
    await this.repository.delete({ id, userId });
  }
}
