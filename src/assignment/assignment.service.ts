import { Injectable, NotFoundException } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import { AvailabilityClassType } from '../users/enums/availability-class-type.enum';
import { InstructorAvailabilitySlot } from '../users/entity/instructor-availability-slot.entity';
import { InstructorAvailabilityRepository } from '../users/repository/instructor-availability.repository';
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
  parseDateOnly,
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
    private readonly availabilityRepository: InstructorAvailabilityRepository,
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

    const searchDates = this.buildSearchDates(dto.preferredDate);

    const availabilityByInstructor = new Map<string, InstructorAvailabilitySlot[]>();
    for (const instructor of instructors) {
      availabilityByInstructor.set(
        instructor.id,
        await this.availabilityRepository.findByInstructor(instructor.id),
      );
    }

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
        const instructorSlots = availabilityByInstructor.get(instructor.id) ?? [];

        for (const slot of slots) {
          const matchingAvailability = this.matchInstructorAvailability(
            instructorSlots,
            date,
            slot.startTime.getHours(),
            dto.type,
          );
          if (instructorSlots.length > 0 && !matchingAvailability) {
            continue;
          }

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
              licenseCategoryId:
                matchingAvailability?.licenseCategoryId ?? licenseCategoryId ?? undefined,
              theoryTopicId: matchingAvailability?.theoryTopicId ?? undefined,
            };

            const schedule = await this.schedulingService.createConfirmed(createDto);
            return this.schedulingService.toResponseDto(schedule);
          }
        }
      }
    }

    const hasAnyAvailabilityGrid = [...availabilityByInstructor.values()].some(
      (rows) => rows.length > 0,
    );
    if (hasAnyAvailabilityGrid) {
      throw new NotFoundException(
        'Ningún instructor tiene franjas libres para este tipo de clase en las fechas buscadas. Revisa la disponibilidad semanal o elige otra fecha.',
      );
    }

    throw new NotFoundException(
      'No se encontró un hueco libre (instructores, vehículos/aulas o agenda ocupada). Prueba otra fecha o pide al instructor que configure su disponibilidad.',
    );
  }

  private buildSearchDates(preferredDate?: Date): Date[] {
    const fallbackStart = addMs(new Date(), 24 * 60 * 60 * 1000);
    const candidates = preferredDate
      ? [
          startOfDay(preferredDate),
          ...datesInRange(addMs(startOfDay(preferredDate), 24 * 60 * 60 * 1000), AUTO_ASSIGN_SEARCH_DAYS),
        ]
      : datesInRange(fallbackStart, AUTO_ASSIGN_SEARCH_DAYS);

    const seen = new Set<number>();
    return candidates.filter((day) => {
      const key = day.getTime();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Si el instructor no tiene grilla guardada, devuelve null (cualquier franja laboral vale).
   * Si tiene grilla, devuelve la franja que coincide o undefined si no ofrece esa hora/tipo.
   */
  private matchInstructorAvailability(
    rows: InstructorAvailabilitySlot[],
    date: Date,
    hour: number,
    type: ScheduleType,
  ): InstructorAvailabilitySlot | null | undefined {
    if (rows.length === 0) {
      return null;
    }

    const classType =
      type === ScheduleType.THEORY
        ? AvailabilityClassType.THEORY
        : AvailabilityClassType.PRACTICE;

    const dayStart = startOfDay(date).getTime();
    return rows.find((row) => {
      if (!row.available || row.hour !== hour || row.classType !== classType) {
        return false;
      }
      if (row.slotDate) {
        const slotDay = startOfDay(
          typeof row.slotDate === 'string' ? parseDateOnly(row.slotDate) : row.slotDate,
        );
        return slotDay.getTime() === dayStart;
      }
      return row.dayOfWeek === date.getDay();
    });
  }
}
