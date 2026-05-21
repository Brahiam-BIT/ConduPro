import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Classroom } from '../entity/classroom.entity';

@Injectable()
export class ClassroomRepository {
  constructor(
    @InjectRepository(Classroom)
    private readonly repository: Repository<Classroom>,
  ) {}

  async findById(id: string): Promise<Classroom | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAvailable(): Promise<Classroom[]> {
    return this.repository.find({
      where: { isAvailable: true },
      order: { name: 'ASC' },
    });
  }
}
