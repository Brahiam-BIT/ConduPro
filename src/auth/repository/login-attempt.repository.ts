import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoginAttempt } from '../entity/login-attempt.entity';

@Injectable()
export class LoginAttemptRepository {
  constructor(
    @InjectRepository(LoginAttempt)
    private readonly repository: Repository<LoginAttempt>,
  ) {}

  async findByEmailAndIp(email: string, ipAddress: string): Promise<LoginAttempt | null> {
    return this.repository.findOne({
      where: { email: email.toLowerCase(), ipAddress },
    });
  }

  async save(attempt: LoginAttempt): Promise<LoginAttempt> {
    return this.repository.save(attempt);
  }

  create(data: Partial<LoginAttempt>): LoginAttempt {
    return this.repository.create(data);
  }

  async reset(email: string, ipAddress: string): Promise<void> {
    const record = await this.findByEmailAndIp(email, ipAddress);
    if (!record) {
      return;
    }
    record.attempts = 0;
    record.lockedUntil = null;
    await this.save(record);
  }
}
