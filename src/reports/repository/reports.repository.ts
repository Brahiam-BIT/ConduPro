import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '../../common/enums/user-role.enum';
import { Vehicle } from '../../scheduling/entity/vehicle.entity';
import { Schedule } from '../../scheduling/entity/schedule.entity';
import { ScheduleStatus } from '../../scheduling/enums/schedule-status.enum';
import { User } from '../../users/entity/user.entity';
import type { DateRange } from '../utils/report-date.util';

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async findSchedulesInRange(range: DateRange, filters?: {
    instructorId?: string;
    studentId?: string;
  }): Promise<Schedule[]> {
    const qb = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.student', 'student')
      .leftJoinAndSelect('schedule.instructor', 'instructor')
      .leftJoinAndSelect('schedule.vehicle', 'vehicle')
      .where('schedule.deleted_at IS NULL')
      .andWhere('schedule.start_time BETWEEN :rangeStart AND :rangeEnd', {
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
      });

    if (filters?.instructorId) {
      qb.andWhere('schedule.instructor_id = :instructorId', {
        instructorId: filters.instructorId,
      });
    }

    if (filters?.studentId) {
      qb.andWhere('schedule.student_id = :studentId', { studentId: filters.studentId });
    }

    return qb.getMany();
  }

  async findActiveInstructors(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.INSTRUCTOR, isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
  }

  async findAvailableVehicles(): Promise<Vehicle[]> {
    return this.vehicleRepository.find({
      where: { isAvailable: true },
      order: { plate: 'ASC' },
    });
  }
}
