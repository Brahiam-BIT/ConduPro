import { Injectable, NotFoundException } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { CreateScheduleDto } from '../scheduling/dto/create-schedule.dto';
import { ScheduleResponseDto } from '../scheduling/dto/schedule-response.dto';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { AUTO_ASSIGN_SEARCH_DAYS } from '../scheduling/constants/scheduling.constants';
import { ClassroomRepository } from '../scheduling/repository/classroom.repository';
import { VehicleRepository } from '../scheduling/repository/vehicle.repository';
import { SchedulingService } from '../scheduling/scheduling.service';
import {
  addMs,
  datesInRange,
  generateBusinessSlotsForDate,
  startOfDay,
} from '../scheduling/utils/scheduling-time.util';
import { StudentEnrollmentService } from '../curriculum/student-enrollment.service';
import { AutoAssignDto } from './dto/auto-assign.dto';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly usersService: UsersService,
    private readonly vehicleRepository: VehicleRepository,
    private readonly classroomRepository: ClassroomRepository,
    private readonly enrollmentService: StudentEnrollmentService,
  ) {}

  async autoAssign(dto: AutoAssignDto): Promise<ScheduleResponseDto> {
    await this.usersService.findByIdOrFail(dto.studentId);

    let licenseCategoryId = dto.licenseCategoryId;
    if (!licenseCategoryId) {
      const enrollment = await this.enrollmentService.resolvePrimaryActiveEnrollment(
        dto.studentId,
      );
      licenseCategoryId = enrollment?.licenseCategoryId;
    }

    const instructors = await this.usersService.findActiveByRole(UserRole.INSTRUCTOR);
    if (instructors.length === 0) {
      throw new NotFoundException('No hay instructores disponibles');
    }

    const searchDates = dto.preferredDate
      ? [startOfDay(dto.preferredDate)]
      : datesInRange(addMs(new Date(), 24 * 60 * 60 * 1000), AUTO_ASSIGN_SEARCH_DAYS);

    const vehicles =
      dto.type === ScheduleType.PRACTICE ? await this.vehicleRepository.findAvailable() : [];
    const classrooms =
      dto.type === ScheduleType.THEORY ? await this.classroomRepository.findAvailable() : [];

    if (dto.type === ScheduleType.PRACTICE && vehicles.length === 0) {
      throw new NotFoundException('No hay vehículos disponibles');
    }

    if (dto.type === ScheduleType.THEORY && classrooms.length === 0) {
      throw new NotFoundException('No hay aulas disponibles');
    }

    for (const date of searchDates) {
      const slots = generateBusinessSlotsForDate(date);

      for (const instructor of instructors) {
        for (const slot of slots) {
          const resources =
            dto.type === ScheduleType.PRACTICE
              ? vehicles.map((v) => ({ vehicleId: v.id, classroomId: null as string | null }))
              : classrooms.map((c) => ({
                  vehicleId: null as string | null,
                  classroomId: c.id,
                }));

          for (const resource of resources) {
            const available = await this.schedulingService.isSlotAvailable({
              type: dto.type,
              studentId: dto.studentId,
              instructorId: instructor.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              vehicleId: resource.vehicleId,
              classroomId: resource.classroomId,
            });

            if (!available) {
              continue;
            }

            const createDto: CreateScheduleDto = {
              type: dto.type,
              studentId: dto.studentId,
              instructorId: instructor.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              vehicleId: resource.vehicleId ?? undefined,
              classroomId: resource.classroomId ?? undefined,
              licenseCategoryId: licenseCategoryId ?? undefined,
            };

            const schedule = await this.schedulingService.createConfirmed(createDto);
            return this.schedulingService.toResponseDto(schedule);
          }
        }
      }
    }

    throw new NotFoundException(
      'No se encontró disponibilidad para asignar la clase en los próximos días',
    );
  }
}
