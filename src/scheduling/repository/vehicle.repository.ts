import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Vehicle } from '../entity/vehicle.entity';

@Injectable()
export class VehicleRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repository: Repository<Vehicle>,
  ) {}

  async findById(id: string): Promise<Vehicle | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAvailable(): Promise<Vehicle[]> {
    return this.repository.find({
      where: { isAvailable: true },
      order: { plate: 'ASC' },
    });
  }
}
