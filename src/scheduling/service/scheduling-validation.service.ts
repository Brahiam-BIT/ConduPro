import { BadRequestException, Injectable } from '@nestjs/common';

import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../users/entity/user.entity';
import {
  BUSINESS_HOUR_END,
  BUSINESS_HOUR_START,
  CLASS_DURATION_MS,
  MIN_ADVANCE_MS,
} from '../constants/scheduling.constants';
import { ScheduleType } from '../enums/schedule-type.enum';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { isWorkingDay } from '../utils/scheduling-time.util';

@Injectable()
export class SchedulingValidationService {
  resolveEndTime(startTime: Date, endTime?: Date): Date {
    if (endTime) {
      if (endTime <= startTime) {
        throw new BadRequestException('endTime debe ser posterior a startTime');
      }
      const durationMs = endTime.getTime() - startTime.getTime();
      if (durationMs !== CLASS_DURATION_MS) {
        throw new BadRequestException('La duración de la clase debe ser exactamente de 1 hora');
      }
      return endTime;
    }

    return new Date(startTime.getTime() + CLASS_DURATION_MS);
  }

  validateScheduleWindow(startTime: Date, endTime: Date): void {
    const now = new Date();

    if (!isWorkingDay(startTime)) {
      throw new BadRequestException(
        'Solo se puede agendar de lunes a sábado en horario comercial (7:00–19:00)',
      );
    }

    if (startTime.getTime() - now.getTime() < MIN_ADVANCE_MS) {
      throw new BadRequestException(
        'La clase debe agendarse con al menos 2 horas de anticipación',
      );
    }

    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;

    if (startHour < BUSINESS_HOUR_START || endHour > BUSINESS_HOUR_END) {
      throw new BadRequestException(
        `El horario debe estar entre ${BUSINESS_HOUR_START}:00 y ${BUSINESS_HOUR_END}:00`,
      );
    }
  }

  validateTypeResources(dto: CreateScheduleDto): void {
    if (dto.type === ScheduleType.PRACTICE) {
      if (!dto.vehicleId) {
        throw new BadRequestException('vehicleId es requerido para clases prácticas');
      }
      if (dto.classroomId) {
        throw new BadRequestException('classroomId no aplica para clases prácticas');
      }
      return;
    }

    if (!dto.classroomId) {
      throw new BadRequestException('classroomId es requerido para clases teóricas');
    }
    if (dto.vehicleId) {
      throw new BadRequestException('vehicleId no aplica para clases teóricas');
    }
  }

  validateParticipants(student: User, instructor: User): void {
    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('El participante estudiante debe tener rol STUDENT');
    }

    if (instructor.role !== UserRole.INSTRUCTOR) {
      throw new BadRequestException('El instructor debe tener rol INSTRUCTOR');
    }

    if (!student.isActive || !instructor.isActive) {
      throw new BadRequestException('Estudiante e instructor deben estar activos');
    }
  }
}
