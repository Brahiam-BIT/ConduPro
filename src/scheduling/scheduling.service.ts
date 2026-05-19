import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { UpdateScheduleStatusDto } from './dto/update-schedule-status.dto';
import { Schedule } from './entity/schedule.entity';
import { ScheduleStatus } from './enums/schedule-status.enum';
import { ScheduleType } from './enums/schedule-type.enum';
import { ClassroomRepository } from './repository/classroom.repository';
import { ScheduleRepository } from './repository/schedule.repository';
import { VehicleRepository } from './repository/vehicle.repository';
import { SchedulingValidationService } from './service/scheduling-validation.service';
import {
  generateBusinessSlotsForDate,
  parseDateOnly,
  startOfDay,
} from './utils/scheduling-time.util';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly classroomRepository: ClassroomRepository,
    private readonly validationService: SchedulingValidationService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    query: ScheduleQueryDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResponseDto<ScheduleResponseDto>> {
    const scopedQuery = this.applyRoleScope(query, currentUser);
    const page = scopedQuery.page ?? 1;
    const limit = scopedQuery.limit ?? 10;

    const [schedules, total] = await this.scheduleRepository.findByFilters({
      date: scopedQuery.date,
      instructorId: scopedQuery.instructorId,
      studentId: scopedQuery.studentId,
      status: scopedQuery.status,
      page,
      limit,
    });

    return {
      data: schedules.map((s) => this.toResponseDto(s)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, currentUser: JwtPayload): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleOrFail(id);
    this.assertCanAccess(schedule, currentUser);
    return this.toResponseDto(schedule);
  }

  async create(
    dto: CreateScheduleDto,
    currentUser: JwtPayload,
    status: ScheduleStatus = ScheduleStatus.PENDING,
  ): Promise<ScheduleResponseDto> {
    this.assertCanManageSchedules(currentUser);

    const schedule = await this.buildAndPersistSchedule(dto, status);
    return this.toResponseDto(schedule);
  }

  async updateStatus(
    id: string,
    dto: UpdateScheduleStatusDto,
    currentUser: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleOrFail(id);
    this.assertCanManageSchedule(schedule, currentUser);

    await this.scheduleRepository.updateStatus(id, dto.status);
    const updated = await this.getScheduleOrFail(id);
    return this.toResponseDto(updated);
  }

  async cancel(id: string, currentUser: JwtPayload): Promise<void> {
    const schedule = await this.getScheduleOrFail(id);
    this.assertCanManageSchedule(schedule, currentUser);

    await this.scheduleRepository.updateStatus(id, ScheduleStatus.CANCELLED);
    await this.scheduleRepository.softDelete(id);
  }

  async getAvailability(query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    const instructor = await this.usersService.findByIdOrFail(query.instructorId);
    if (instructor.role !== UserRole.INSTRUCTOR) {
      throw new BadRequestException('El usuario indicado no es instructor');
    }

    const date = parseDateOnly(query.date);
    const existing = await this.scheduleRepository.findInstructorSchedulesForDay(
      query.instructorId,
      date,
    );

    const allSlots = generateBusinessSlotsForDate(date);
    const freeSlots = allSlots.filter((slot) => {
      try {
        this.validationService.validateScheduleWindow(slot.startTime, slot.endTime);
      } catch {
        return false;
      }

      return !existing.some(
        (s) => s.startTime < slot.endTime && s.endTime > slot.startTime,
      );
    });

    return {
      date: query.date,
      instructorId: query.instructorId,
      slots: freeSlots,
    };
  }

  /**
   * Usado por AssignmentService para crear clases confirmadas automáticamente.
   */
  async createConfirmed(dto: CreateScheduleDto): Promise<Schedule> {
    return this.buildAndPersistSchedule(dto, ScheduleStatus.CONFIRMED);
  }

  async isSlotAvailable(params: {
    type: ScheduleType;
    studentId: string;
    instructorId: string;
    startTime: Date;
    endTime: Date;
    vehicleId?: string | null;
    classroomId?: string | null;
  }): Promise<boolean> {
    try {
      this.validationService.validateScheduleWindow(params.startTime, params.endTime);
    } catch {
      return false;
    }

    const conflicts = await this.scheduleRepository.findConflicts({
      startTime: params.startTime,
      endTime: params.endTime,
      instructorId: params.instructorId,
      studentId: params.studentId,
      vehicleId: params.vehicleId,
      classroomId: params.classroomId,
    });

    return conflicts.length === 0;
  }

  private async buildAndPersistSchedule(
    dto: CreateScheduleDto,
    status: ScheduleStatus,
  ): Promise<Schedule> {
    this.validationService.validateTypeResources(dto);

    const student = await this.usersService.findByIdOrFail(dto.studentId);
    const instructor = await this.usersService.findByIdOrFail(dto.instructorId);
    this.validationService.validateParticipants(student, instructor);

    const startTime = new Date(dto.startTime);
    const endTime = this.validationService.resolveEndTime(startTime, dto.endTime);
    this.validationService.validateScheduleWindow(startTime, endTime);

    const vehicleId = dto.type === ScheduleType.PRACTICE ? (dto.vehicleId ?? null) : null;
    const classroomId = dto.type === ScheduleType.THEORY ? (dto.classroomId ?? null) : null;

    if (vehicleId) {
      const vehicle = await this.vehicleRepository.findById(vehicleId);
      if (!vehicle || !vehicle.isAvailable) {
        throw new BadRequestException('Vehículo no disponible');
      }
    }

    if (classroomId) {
      const classroom = await this.classroomRepository.findById(classroomId);
      if (!classroom || !classroom.isAvailable) {
        throw new BadRequestException('Aula no disponible');
      }
    }

    const conflicts = await this.scheduleRepository.findConflicts({
      startTime,
      endTime,
      instructorId: dto.instructorId,
      studentId: dto.studentId,
      vehicleId,
      classroomId,
    });

    if (conflicts.length > 0) {
      throw new ConflictException('Conflicto de horario con otra clase existente');
    }

    const schedule = this.scheduleRepository.create({
      type: dto.type,
      studentId: dto.studentId,
      instructorId: dto.instructorId,
      vehicleId,
      classroomId,
      startTime,
      endTime,
      status,
      notes: dto.notes ?? null,
    });

    const saved = await this.scheduleRepository.save(schedule);
    return this.getScheduleOrFail(saved.id);
  }

  private async getScheduleOrFail(id: string): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) {
      throw new NotFoundException('Clase no encontrada');
    }
    return schedule;
  }

  private applyRoleScope(query: ScheduleQueryDto, user: JwtPayload): ScheduleQueryDto {
    if (user.role === UserRole.ADMIN) {
      return query;
    }

    if (user.role === UserRole.INSTRUCTOR) {
      return { ...query, instructorId: user.sub };
    }

    if (user.role === UserRole.STUDENT) {
      return { ...query, studentId: user.sub };
    }

    throw new ForbiddenException('Rol no autorizado');
  }

  private assertCanAccess(schedule: Schedule, user: JwtPayload): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.INSTRUCTOR && schedule.instructorId === user.sub) {
      return;
    }

    if (user.role === UserRole.STUDENT && schedule.studentId === user.sub) {
      return;
    }

    throw new ForbiddenException('No tiene permiso para ver esta clase');
  }

  private assertCanManageSchedules(user: JwtPayload): void {
    if (user.role === UserRole.ADMIN || user.role === UserRole.INSTRUCTOR) {
      return;
    }
    throw new ForbiddenException('Solo administradores o instructores pueden crear clases');
  }

  private assertCanManageSchedule(schedule: Schedule, user: JwtPayload): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.INSTRUCTOR && schedule.instructorId === user.sub) {
      return;
    }

    throw new ForbiddenException('No tiene permiso para modificar esta clase');
  }

  toResponseDto(schedule: Schedule): ScheduleResponseDto {
    const dto = plainToInstance(ScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });

    if (schedule.student) {
      dto.student = {
        id: schedule.student.id,
        firstName: schedule.student.firstName,
        lastName: schedule.student.lastName,
        email: schedule.student.email,
      };
    }

    if (schedule.instructor) {
      dto.instructor = {
        id: schedule.instructor.id,
        firstName: schedule.instructor.firstName,
        lastName: schedule.instructor.lastName,
        email: schedule.instructor.email,
      };
    }

    if (schedule.vehicle) {
      dto.vehicle = {
        id: schedule.vehicle.id,
        plate: schedule.vehicle.plate,
        brand: schedule.vehicle.brand,
        model: schedule.vehicle.model,
      };
    }

    if (schedule.classroom) {
      dto.classroom = {
        id: schedule.classroom.id,
        name: schedule.classroom.name,
      };
    }

    return dto;
  }
}
