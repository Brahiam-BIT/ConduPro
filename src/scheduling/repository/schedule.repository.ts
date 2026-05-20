import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ScheduleStatus } from '../enums/schedule-status.enum';
import { Schedule } from '../entity/schedule.entity';
import { endOfDay, startOfDay } from '../utils/scheduling-time.util';

export interface ScheduleConflictParams {
  startTime: Date;
  endTime: Date;
  instructorId: string;
  studentId: string;
  vehicleId?: string | null;
  classroomId?: string | null;
  excludeScheduleId?: string;
}

export interface ScheduleFilterParams {
  date?: string;
  instructorId?: string;
  studentId?: string;
  status?: ScheduleStatus;
  page: number;
  limit: number;
}

@Injectable()
export class ScheduleRepository {
  constructor(
    @InjectRepository(Schedule)
    private readonly repository: Repository<Schedule>,
  ) {}

  create(data: Partial<Schedule>): Schedule {
    return this.repository.create(data);
  }

  async save(schedule: Schedule): Promise<Schedule> {
    return this.repository.save(schedule);
  }

  async findById(id: string): Promise<Schedule | null> {
    return this.repository.findOne({
      where: { id },
      relations: [
        'student',
        'instructor',
        'vehicle',
        'classroom',
        'theoryTopic',
        'licenseCategory',
      ],
    });
  }

  async findByFilters(params: ScheduleFilterParams): Promise<[Schedule[], number]> {
    const qb = this.repository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.student', 'student')
      .leftJoinAndSelect('schedule.instructor', 'instructor')
      .leftJoinAndSelect('schedule.vehicle', 'vehicle')
      .leftJoinAndSelect('schedule.classroom', 'classroom')
      .leftJoinAndSelect('schedule.theoryTopic', 'theoryTopic')
      .leftJoinAndSelect('schedule.licenseCategory', 'licenseCategory')
      .where('schedule.deleted_at IS NULL');

    if (params.date) {
      const dayStart = startOfDay(new Date(params.date));
      const dayEnd = endOfDay(dayStart);
      qb.andWhere('schedule.start_time BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd });
    }

    if (params.instructorId) {
      qb.andWhere('schedule.instructor_id = :instructorId', {
        instructorId: params.instructorId,
      });
    }

    if (params.studentId) {
      qb.andWhere('schedule.student_id = :studentId', { studentId: params.studentId });
    }

    if (params.status) {
      qb.andWhere('schedule.status = :status', { status: params.status });
    }

    qb.orderBy('schedule.startTime', 'ASC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit);

    return qb.getManyAndCount();
  }

  async findInstructorSchedulesForDay(
    instructorId: string,
    date: Date,
    excludeScheduleId?: string,
  ): Promise<Schedule[]> {
    const qb = this.repository
      .createQueryBuilder('schedule')
      .where('schedule.instructor_id = :instructorId', { instructorId })
      .andWhere('schedule.deleted_at IS NULL')
      .andWhere('schedule.status != :cancelled', { cancelled: ScheduleStatus.CANCELLED })
      .andWhere('schedule.start_time BETWEEN :dayStart AND :dayEnd', {
        dayStart: startOfDay(date),
        dayEnd: endOfDay(date),
      });

    if (excludeScheduleId) {
      qb.andWhere('schedule.id != :excludeScheduleId', { excludeScheduleId });
    }

    return qb.getMany();
  }

  async findConflicts(params: ScheduleConflictParams): Promise<Schedule[]> {
    const qb = this.repository
      .createQueryBuilder('schedule')
      .where('schedule.deleted_at IS NULL')
      .andWhere('schedule.status != :cancelled', { cancelled: ScheduleStatus.CANCELLED })
      .andWhere('schedule.start_time < :endTime', { endTime: params.endTime })
      .andWhere('schedule.end_time > :startTime', { startTime: params.startTime });

    if (params.excludeScheduleId) {
      qb.andWhere('schedule.id != :excludeScheduleId', {
        excludeScheduleId: params.excludeScheduleId,
      });
    }

    const conflictConditions: string[] = [];
    const conflictParams: Record<string, string> = {
      instructorId: params.instructorId,
      studentId: params.studentId,
    };

    conflictConditions.push('schedule.instructor_id = :instructorId');
    conflictConditions.push('schedule.student_id = :studentId');

    if (params.vehicleId) {
      conflictConditions.push('schedule.vehicle_id = :vehicleId');
      conflictParams.vehicleId = params.vehicleId;
    }

    if (params.classroomId) {
      conflictConditions.push('schedule.classroom_id = :classroomId');
      conflictParams.classroomId = params.classroomId;
    }

    qb.andWhere(`(${conflictConditions.join(' OR ')})`, conflictParams);

    return qb.getMany();
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async updateStatus(id: string, status: ScheduleStatus): Promise<void> {
    await this.repository.update(id, { status });
  }

  async isResourceBusy(
    resource: 'vehicle' | 'classroom',
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeScheduleId?: string,
  ): Promise<boolean> {
    const column = resource === 'vehicle' ? 'vehicle_id' : 'classroom_id';

    const qb = this.repository
      .createQueryBuilder('schedule')
      .where(`schedule.${column} = :resourceId`, { resourceId })
      .andWhere('schedule.deleted_at IS NULL')
      .andWhere('schedule.status != :cancelled', { cancelled: ScheduleStatus.CANCELLED })
      .andWhere('schedule.start_time < :endTime', { endTime })
      .andWhere('schedule.end_time > :startTime', { startTime });

    if (excludeScheduleId) {
      qb.andWhere('schedule.id != :excludeScheduleId', { excludeScheduleId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
