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

  create(data: Partial<Vehicle>): Vehicle {
    return this.repository.create(data);
  }

  async save(vehicle: Vehicle): Promise<Vehicle> {
    return this.repository.save(vehicle);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    return this.repository.findOne({ where: { plate } });
  }

  async findPaginated(page: number, limit: number): Promise<[Vehicle[], number]> {
    return this.repository.findAndCount({
      order: { plate: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async countAvailable(): Promise<number> {
    return this.repository.count({ where: { isAvailable: true } });
  }
}
