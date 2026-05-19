import { ForbiddenException, Injectable } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ScheduleStatus } from '../scheduling/enums/schedule-status.enum';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { Schedule } from '../scheduling/entity/schedule.entity';
import { UsersService } from '../users/users.service';
import { AvailabilityReportDto } from './dto/availability-report.dto';
import type { DateRangeQueryDto } from './dto/date-range-query.dto';
import { InstructorReportDto } from './dto/instructor-report.dto';
import { StudentReportDto } from './dto/student-report.dto';
import { SummaryReportDto } from './dto/summary-report.dto';
import { ReportsRepository } from './repository/reports.repository';
import {
  countWorkingDaysInRange,
  emptyStatusCounts,
  hoursPerWorkingDay,
  parseDateRange,
  roundTwo,
  scheduleDurationHours,
} from './utils/report-date.util';

const ALL_STATUSES = Object.values(ScheduleStatus);
const ALL_TYPES = Object.values(ScheduleType);

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly usersService: UsersService,
  ) {}

  async getSummary(query: DateRangeQueryDto, currentUser: JwtPayload): Promise<SummaryReportDto> {
    this.assertAdminOnly(currentUser);

    const range = parseDateRange(query.startDate, query.endDate);
    const schedules = await this.reportsRepository.findSchedulesInRange(range);
    const byStatus = this.countByStatus(schedules);
    const completedClasses = byStatus[ScheduleStatus.COMPLETED];
    const nonCancelled = schedules.filter((s) => s.status !== ScheduleStatus.CANCELLED).length;

    return {
      startDate: range.startDate,
      endDate: range.endDate,
      totalClasses: schedules.length,
      byStatus,
      completedClasses,
      completionRate: nonCancelled > 0 ? roundTwo((completedClasses / nonCancelled) * 100) : 0,
    };
  }

  async getInstructorReport(
    instructorId: string,
    query: DateRangeQueryDto,
    currentUser: JwtPayload,
  ): Promise<InstructorReportDto> {
    this.assertAdminOrSelf(currentUser, instructorId, UserRole.INSTRUCTOR);

    const instructor = await this.usersService.findByIdOrFail(instructorId);
    if (instructor.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException('El usuario indicado no es instructor');
    }

    const range = parseDateRange(query.startDate, query.endDate);
    const schedules = await this.reportsRepository.findSchedulesInRange(range, {
      instructorId,
    });

    const activeSchedules = schedules.filter((s) => s.status !== ScheduleStatus.CANCELLED);

    return {
      instructorId,
      instructorName: `${instructor.firstName} ${instructor.lastName}`,
      startDate: range.startDate,
      endDate: range.endDate,
      classesTaught: activeSchedules.length,
      hoursTaught: roundTwo(this.sumHours(activeSchedules)),
      averageRating: null,
      byStatus: this.countByStatus(schedules),
    };
  }

  async getStudentReport(
    studentId: string,
    query: DateRangeQueryDto,
    currentUser: JwtPayload,
  ): Promise<StudentReportDto> {
    this.assertAdminOrSelf(currentUser, studentId, UserRole.STUDENT);

    const student = await this.usersService.findByIdOrFail(studentId);
    if (student.role !== UserRole.STUDENT) {
      throw new ForbiddenException('El usuario indicado no es estudiante');
    }

    const range = parseDateRange(query.startDate, query.endDate);
    const schedules = await this.reportsRepository.findSchedulesInRange(range, {
      studentId,
    });

    const byStatus = this.countByStatus(schedules);
    const nonCancelled = schedules.filter((s) => s.status !== ScheduleStatus.CANCELLED);
    const completed = schedules.filter((s) => s.status === ScheduleStatus.COMPLETED);

    return {
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      startDate: range.startDate,
      endDate: range.endDate,
      classesTaken: nonCancelled.length,
      classesCompleted: completed.length,
      hoursAccumulated: roundTwo(this.sumHours(nonCancelled)),
      progressPercent:
        nonCancelled.length > 0
          ? roundTwo((completed.length / nonCancelled.length) * 100)
          : 0,
      byStatus,
      byType: this.countByType(schedules),
    };
  }

  async getAvailabilityReport(
    query: DateRangeQueryDto,
    currentUser: JwtPayload,
  ): Promise<AvailabilityReportDto> {
    this.assertAdminOnly(currentUser);

    const range = parseDateRange(query.startDate, query.endDate);
    const workingDays = countWorkingDaysInRange(range.rangeStart, range.rangeEnd);
    const dailyHours = hoursPerWorkingDay();
    const schedules = await this.reportsRepository.findSchedulesInRange(range);

    const bookedSchedules = schedules.filter(
      (s) =>
        s.status === ScheduleStatus.CONFIRMED || s.status === ScheduleStatus.COMPLETED,
    );

    const instructors = await this.reportsRepository.findActiveInstructors();
    const vehicles = await this.reportsRepository.findAvailableVehicles();

    const instructorRows = instructors.map((instructor) => {
      const instructorSchedules = bookedSchedules.filter(
        (s) => s.instructorId === instructor.id,
      );
      const bookedHours = this.sumHours(instructorSchedules);
      const availableHours = workingDays * dailyHours;

      return {
        id: instructor.id,
        label: `${instructor.firstName} ${instructor.lastName}`,
        availableHours,
        bookedHours: roundTwo(bookedHours),
        occupancyPercent:
          availableHours > 0 ? roundTwo((bookedHours / availableHours) * 100) : 0,
      };
    });

    const vehicleRows = vehicles.map((vehicle) => {
      const vehicleSchedules = bookedSchedules.filter((s) => s.vehicleId === vehicle.id);
      const bookedHours = this.sumHours(vehicleSchedules);
      const availableHours = workingDays * dailyHours;

      return {
        id: vehicle.id,
        label: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
        availableHours,
        bookedHours: roundTwo(bookedHours),
        occupancyPercent:
          availableHours > 0 ? roundTwo((bookedHours / availableHours) * 100) : 0,
      };
    });

    return {
      startDate: range.startDate,
      endDate: range.endDate,
      hoursPerWorkingDay: dailyHours,
      workingDaysInPeriod: workingDays,
      instructors: instructorRows,
      vehicles: vehicleRows,
    };
  }

  private countByStatus(schedules: Schedule[]): Record<ScheduleStatus, number> {
    const counts = emptyStatusCounts(ALL_STATUSES);
    for (const schedule of schedules) {
      counts[schedule.status] += 1;
    }
    return counts;
  }

  private countByType(schedules: Schedule[]): Record<ScheduleType, number> {
    const counts = emptyStatusCounts(ALL_TYPES);
    for (const schedule of schedules) {
      counts[schedule.type] += 1;
    }
    return counts;
  }

  private sumHours(schedules: Schedule[]): number {
    return schedules.reduce(
      (total, schedule) => total + scheduleDurationHours(schedule.startTime, schedule.endTime),
      0,
    );
  }

  private assertAdminOnly(user: JwtPayload): void {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden acceder a este reporte');
    }
  }

  private assertAdminOrSelf(
    user: JwtPayload,
    targetUserId: string,
    expectedRole: UserRole,
  ): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === expectedRole && user.sub === targetUserId) {
      return;
    }

    throw new ForbiddenException('No tiene permiso para ver este reporte');
  }
}
