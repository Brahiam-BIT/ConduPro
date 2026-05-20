import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CreateVehicleDto, UpdateVehicleDto, VehicleListQueryDto } from './dto/vehicle-payload.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { Vehicle } from './entity/vehicle.entity';
import { VehicleRepository } from './repository/vehicle.repository';

@Injectable()
export class VehiclesService {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  async findAll(query: VehicleListQueryDto): Promise<PaginatedResponseDto<VehicleResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [vehicles, total] = await this.vehicleRepository.findPaginated(page, limit);

    return {
      data: vehicles.map((v) => this.toResponseDto(v)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<VehicleResponseDto> {
    const vehicle = await this.getOrFail(id);
    return this.toResponseDto(vehicle);
  }

  async create(dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    const existing = await this.vehicleRepository.findByPlate(dto.plate);
    if (existing) {
      throw new ConflictException('La placa ya está registrada');
    }

    const vehicle = await this.vehicleRepository.save(
      this.vehicleRepository.create({
        plate: dto.plate,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        isAvailable: dto.available,
      }),
    );

    return this.toResponseDto(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleResponseDto> {
    const vehicle = await this.getOrFail(id);

    if (dto.plate && dto.plate !== vehicle.plate) {
      const existing = await this.vehicleRepository.findByPlate(dto.plate);
      if (existing) {
        throw new ConflictException('La placa ya está registrada');
      }
      vehicle.plate = dto.plate;
    }

    if (dto.brand !== undefined) vehicle.brand = dto.brand;
    if (dto.model !== undefined) vehicle.model = dto.model;
    if (dto.year !== undefined) vehicle.year = dto.year;
    if (dto.available !== undefined) vehicle.isAvailable = dto.available;

    const saved = await this.vehicleRepository.save(vehicle);
    return this.toResponseDto(saved);
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.vehicleRepository.delete(id);
  }

  async countAvailable(): Promise<number> {
    return this.vehicleRepository.countAvailable();
  }

  private async getOrFail(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  private toResponseDto(vehicle: Vehicle): VehicleResponseDto {
    return plainToInstance(
      VehicleResponseDto,
      { ...vehicle, available: vehicle.isAvailable, updatedAt: vehicle.createdAt },
      { excludeExtraneousValues: true },
    );
  }
}
