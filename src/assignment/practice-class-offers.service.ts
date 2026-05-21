import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { AvailabilityClassType } from '../users/enums/availability-class-type.enum';
import { InstructorAvailabilitySlot } from '../users/entity/instructor-availability-slot.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { EnrollmentStatus } from '../curriculum/enums/enrollment-status.enum';
import { StudentLicenseEnrollment } from '../curriculum/entity/student-license-enrollment.entity';
import { CreateScheduleDto } from '../scheduling/dto/create-schedule.dto';
import { ScheduleResponseDto } from '../scheduling/dto/schedule-response.dto';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { VehicleRepository } from '../scheduling/repository/vehicle.repository';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SchedulingValidationService } from '../scheduling/service/scheduling-validation.service';
import {
  addMs,
  buildSlotStart,
  datesInRange,
  parseDateOnly,
  startOfDay,
} from '../scheduling/utils/scheduling-time.util';
import { PracticeClassOfferResponseDto } from './dto/practice-class-offer-response.dto';
import { PracticeClassOffersQueryDto } from './dto/practice-class-offers-query.dto';
import { JoinPracticeClassDto } from './dto/join-practice-class.dto';

const DEFAULT_SEARCH_DAYS = 14;

@Injectable()
export class PracticeClassOffersService {
  constructor(
    @InjectRepository(InstructorAvailabilitySlot)
    private readonly availabilityRepo: Repository<InstructorAvailabilitySlot>,
    @InjectRepository(StudentLicenseEnrollment)
    private readonly enrollmentRepo: Repository<StudentLicenseEnrollment>,
    private readonly vehicleRepository: VehicleRepository,
    private readonly schedulingService: SchedulingService,
    private readonly validationService: SchedulingValidationService,
    private readonly usersService: UsersService,
  ) {}

  async listOffers(
    studentId: string,
    query: PracticeClassOffersQueryDto,
  ): Promise<PracticeClassOfferResponseDto[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
      relations: { licenseCategory: true },
    });

    if (enrollments.length === 0) {
      return [];
    }

    let licenseIds = enrollments.map((e) => e.licenseCategoryId);
    const licenseById = new Map(
      enrollments.map((e) => [e.licenseCategoryId, e.licenseCategory]),
    );

    if (query.licenseCategoryId) {
      if (!licenseIds.includes(query.licenseCategoryId)) {
        throw new ForbiddenException('No tienes matrícula activa en esta licencia');
      }
      licenseIds = [query.licenseCategoryId];
    }

    const availabilitySlots = await this.availabilityRepo.find({
      where: [
        {
          available: true,
          classType: AvailabilityClassType.PRACTICE,
          licenseCategoryId: In(licenseIds),
        },
        {
          available: true,
          classType: AvailabilityClassType.PRACTICE,
          licenseCategoryId: IsNull(),
        },
      ],
      relations: { instructor: true, licenseCategory: true },
    });

    if (availabilitySlots.length === 0) {
      return [];
    }

    const vehicles = await this.vehicleRepository.findAvailable();
    if (vehicles.length === 0) {
      return [];
    }

    const searchFrom = query.fromDate
      ? startOfDay(parseDateOnly(query.fromDate))
      : addMs(startOfDay(new Date()), 24 * 60 * 60 * 1000);
    const searchDays = query.days ?? DEFAULT_SEARCH_DAYS;
    const dates = datesInRange(searchFrom, searchDays).filter((d) => {
      const dow = d.getDay();
      return dow >= 1 && dow <= 5;
    });

    const offers: PracticeClassOfferResponseDto[] = [];
    const seen = new Set<string>();

    for (const date of dates) {
      const jsDay = date.getDay();

      for (const slot of availabilitySlots) {
        if (!this.slotMatchesCalendarDate(slot, date)) continue;

        const resolvedLicenseId =
          slot.licenseCategoryId && licenseIds.includes(slot.licenseCategoryId)
            ? slot.licenseCategoryId
            : licenseIds[0];

        if (
          slot.licenseCategoryId &&
          !licenseIds.includes(slot.licenseCategoryId)
        ) {
          continue;
        }

        const license = licenseById.get(resolvedLicenseId);
        if (!license) continue;

        const startTime = buildSlotStart(date, slot.hour);
        const endTime = addMs(startTime, 60 * 60 * 1000);

        try {
          this.validationService.validateScheduleWindow(startTime, endTime);
        } catch {
          continue;
        }

        const dedupeKey = `${slot.instructorId}|${resolvedLicenseId}|${startTime.toISOString()}`;
        if (seen.has(dedupeKey)) continue;

        let vehicleHint: string | null = null;
        let bookable = false;

        for (const vehicle of vehicles) {
          const available = await this.schedulingService.isSlotAvailable({
            type: ScheduleType.PRACTICE,
            studentId,
            instructorId: slot.instructorId,
            startTime,
            endTime,
            vehicleId: vehicle.id,
          });
          if (available) {
            bookable = true;
            vehicleHint = `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`;
            break;
          }
        }

        if (!bookable) continue;

        seen.add(dedupeKey);
        offers.push({
          instructorId: slot.instructorId,
          instructorName: `${slot.instructor.firstName} ${slot.instructor.lastName}`.trim(),
          licenseCategoryId: resolvedLicenseId,
          licenseCategoryCode: license.code,
          startAt: startTime,
          endAt: endTime,
          vehicleHint,
        });
      }
    }

    offers.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return offers;
  }

  async joinClass(studentId: string, dto: JoinPracticeClassDto): Promise<ScheduleResponseDto> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: {
        studentId,
        licenseCategoryId: dto.licenseCategoryId,
        status: EnrollmentStatus.ACTIVE,
      },
      relations: { licenseCategory: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('Debes tener matrícula activa en esta licencia');
    }

    const startTime = new Date(dto.startAt);
    const endTime = addMs(startTime, 60 * 60 * 1000);

    const instructor = await this.usersService.findByIdOrFail(dto.instructorId);
    if (instructor.role !== UserRole.INSTRUCTOR || !instructor.isActive) {
      throw new BadRequestException('Instructor no válido');
    }

    const jsDay = startTime.getDay();
    const hour = startTime.getHours();

    const slotDateStr = startTime.toISOString().slice(0, 10);
    const matchingSlot = await this.availabilityRepo.findOne({
      where: [
        {
          instructorId: dto.instructorId,
          slotDate: slotDateStr,
          hour,
          available: true,
          classType: AvailabilityClassType.PRACTICE,
          licenseCategoryId: dto.licenseCategoryId,
        },
        {
          instructorId: dto.instructorId,
          slotDate: slotDateStr,
          hour,
          available: true,
          classType: AvailabilityClassType.PRACTICE,
          licenseCategoryId: IsNull(),
        },
        {
          instructorId: dto.instructorId,
          dayOfWeek: jsDay,
          hour,
          slotDate: IsNull(),
          available: true,
          classType: AvailabilityClassType.PRACTICE,
          licenseCategoryId: dto.licenseCategoryId,
        },
        {
          instructorId: dto.instructorId,
          dayOfWeek: jsDay,
          hour,
          slotDate: IsNull(),
          available: true,
          classType: AvailabilityClassType.PRACTICE,
          licenseCategoryId: IsNull(),
        },
      ],
    });

    if (!matchingSlot) {
      throw new BadRequestException(
        'El instructor no tiene disponibilidad práctica en ese horario',
      );
    }

    const vehicles = await this.vehicleRepository.findAvailable();
    if (vehicles.length === 0) {
      throw new NotFoundException('No hay vehículos disponibles');
    }

    let vehicleId: string | null = null;
    for (const vehicle of vehicles) {
      const available = await this.schedulingService.isSlotAvailable({
        type: ScheduleType.PRACTICE,
        studentId,
        instructorId: dto.instructorId,
        startTime,
        endTime,
        vehicleId: vehicle.id,
      });
      if (available) {
        vehicleId = vehicle.id;
        break;
      }
    }

    if (!vehicleId) {
      throw new ConflictException('Ese horario ya no está disponible');
    }

    const createDto: CreateScheduleDto = {
      type: ScheduleType.PRACTICE,
      studentId,
      instructorId: dto.instructorId,
      startTime,
      endTime,
      vehicleId,
      licenseCategoryId: dto.licenseCategoryId,
    };

    const schedule = await this.schedulingService.createConfirmed(createDto);
    return this.schedulingService.toResponseDto(schedule);
  }

  private slotMatchesCalendarDate(slot: InstructorAvailabilitySlot, date: Date): boolean {
    if (slot.slotDate) {
      const slotDay = startOfDay(parseDateOnly(slot.slotDate));
      return slotDay.getTime() === startOfDay(date).getTime();
    }
    return slot.dayOfWeek === date.getDay();
  }
}
