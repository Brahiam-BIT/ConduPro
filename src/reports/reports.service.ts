import { ForbiddenException, Injectable } from '@nestjs/common';

import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ScheduleStatus } from '../scheduling/enums/schedule-status.enum';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { Schedule } from '../scheduling/entity/schedule.entity';
import { VehicleRepository } from '../scheduling/repository/vehicle.repository';
import { UsersRepository } from '../users/repository/users.repository';
import { UsersService } from '../users/users.service';
import {
  AdminReportSummaryDto,
  DashboardKpisDto,
  InstructorReportRowDto,
  SchedulesByDayPointDto,
} from './dto/admin-dashboard.dto';
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
    private readonly usersRepository: UsersRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async getKpis(currentUser: JwtPayload): Promise<DashboardKpisDto> {
    this.assertAdminOnly(currentUser);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const range = parseDateRange(
      monthStart.toISOString().slice(0, 10),
      monthEnd.toISOString().slice(0, 10),
    );
    const monthSchedules = await this.reportsRepository.findSchedulesInRange(range);
    const byStatus = this.countByStatus(monthSchedules);
    const completed = byStatus[ScheduleStatus.COMPLETED];
    const nonCancelled = monthSchedules.filter(
      (s) => s.status !== ScheduleStatus.CANCELLED,
    ).length;

    return {
      activeUsers: await this.usersRepository.countActive(),
      monthSchedules: monthSchedules.length,
      completionRate:
        nonCancelled > 0 ? roundTwo((completed / nonCancelled) * 100) : 0,
      activeVehicles: await this.vehicleRepository.countAvailable(),
    };
  }

  async getSchedulesByDay(
    query: DateRangeQueryDto,
    currentUser: JwtPayload,
  ): Promise<SchedulesByDayPointDto[]> {
    this.assertAdminOnly(currentUser);

    const range = parseDateRange(query.startDate, query.endDate);
    const schedules = await this.reportsRepository.findSchedulesInRange(range);
    const byDay = new Map<string, { scheduled: number; completed: number }>();

    for (const schedule of schedules) {
      const date = schedule.startTime.toISOString().slice(0, 10);
      const entry = byDay.get(date) ?? { scheduled: 0, completed: 0 };
      if (schedule.status !== ScheduleStatus.CANCELLED) {
        entry.scheduled += 1;
      }
      if (schedule.status === ScheduleStatus.COMPLETED) {
        entry.completed += 1;
      }
      byDay.set(date, entry);
    }

    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        scheduled: counts.scheduled,
        completed: counts.completed,
      }));
  }

  async getByInstructor(
    query: DateRangeQueryDto,
    currentUser: JwtPayload,
  ): Promise<InstructorReportRowDto[]> {
    this.assertAdminOnly(currentUser);

    const range = parseDateRange(query.startDate, query.endDate);
    const schedules = await this.reportsRepository.findSchedulesInRange(range);
    const instructors = await this.reportsRepository.findActiveInstructors();

    return instructors.map((instructor) => {
      const instructorSchedules = schedules.filter((s) => s.instructorId === instructor.id);
      const active = instructorSchedules.filter((s) => s.status !== ScheduleStatus.CANCELLED);
      const completed = instructorSchedules.filter(
        (s) => s.status === ScheduleStatus.COMPLETED,
      );

      return {
        instructorId: instructor.id,
        instructorName: `${instructor.firstName} ${instructor.lastName}`,
        totalClasses: active.length,
        totalHours: roundTwo(this.sumHours(active)),
        completionRate:
          active.length > 0 ? roundTwo((completed.length / active.length) * 100) : 0,
      };
    });
  }

  async getAdminSummary(
    query: DateRangeQueryDto,
    currentUser: JwtPayload,
  ): Promise<AdminReportSummaryDto> {
    this.assertAdminOnly(currentUser);

    const range = parseDateRange(query.startDate, query.endDate);
    const schedules = await this.reportsRepository.findSchedulesInRange(range);
    const byStatus = this.countByStatus(schedules);
    const byType = this.countByType(schedules);
    const completed = byStatus[ScheduleStatus.COMPLETED];
    const cancelled = byStatus[ScheduleStatus.CANCELLED];
    const nonCancelled = schedules.filter((s) => s.status !== ScheduleStatus.CANCELLED).length;

    return {
      totalSchedules: schedules.length,
      completed,
      cancelled,
      attendanceRate:
        nonCancelled > 0 ? roundTwo((completed / nonCancelled) * 100) : 0,
      theoryCount: byType[ScheduleType.THEORY],
      practiceCount: byType[ScheduleType.PRACTICE],
    };
  }

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
