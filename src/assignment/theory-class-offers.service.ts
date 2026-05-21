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
import { StudentTheoryTopicProgress } from '../curriculum/entity/student-theory-topic-progress.entity';
import { TheoryTopic } from '../curriculum/entity/theory-topic.entity';
import { CreateScheduleDto } from '../scheduling/dto/create-schedule.dto';
import { ScheduleResponseDto } from '../scheduling/dto/schedule-response.dto';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { ClassroomRepository } from '../scheduling/repository/classroom.repository';
import { ScheduleRepository } from '../scheduling/repository/schedule.repository';
import { SchedulingService } from '../scheduling/scheduling.service';
import { SchedulingValidationService } from '../scheduling/service/scheduling-validation.service';
import {
  addMs,
  buildSlotStart,
  datesInRange,
  parseDateOnly,
  startOfDay,
} from '../scheduling/utils/scheduling-time.util';
import { TheoryClassOfferResponseDto } from './dto/theory-class-offer-response.dto';
import { TheoryClassOffersQueryDto } from './dto/theory-class-offers-query.dto';
import { JoinTheoryClassDto } from './dto/join-theory-class.dto';

const DEFAULT_SEARCH_DAYS = 14;

@Injectable()
export class TheoryClassOffersService {
  constructor(
    @InjectRepository(InstructorAvailabilitySlot)
    private readonly availabilityRepo: Repository<InstructorAvailabilitySlot>,
    @InjectRepository(StudentLicenseEnrollment)
    private readonly enrollmentRepo: Repository<StudentLicenseEnrollment>,
    @InjectRepository(StudentTheoryTopicProgress)
    private readonly theoryProgressRepo: Repository<StudentTheoryTopicProgress>,
    @InjectRepository(TheoryTopic)
    private readonly topicRepo: Repository<TheoryTopic>,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly classroomRepository: ClassroomRepository,
    private readonly schedulingService: SchedulingService,
    private readonly validationService: SchedulingValidationService,
    private readonly usersService: UsersService,
  ) {}

  async listOffers(
    studentId: string,
    query: TheoryClassOffersQueryDto,
  ): Promise<TheoryClassOfferResponseDto[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
    });

    if (enrollments.length === 0) {
      return [];
    }

    let licenseIds = enrollments.map((e) => e.licenseCategoryId);
    if (query.licenseCategoryId) {
      if (!licenseIds.includes(query.licenseCategoryId)) {
        throw new ForbiddenException('No tienes matrícula activa en esta licencia');
      }
      licenseIds = [query.licenseCategoryId];
    }

    const completedTopicIds = await this.completedTopicIdsForStudent(studentId, licenseIds);

    const topics = await this.topicRepo.find({
      where: {
        licenseCategoryId: In(licenseIds),
        isActive: true,
        ...(query.theoryTopicId ? { id: query.theoryTopicId } : {}),
      },
      relations: { licenseCategory: true },
      order: { sortOrder: 'ASC' },
    });

    const pendingTopics = topics.filter((t) => !completedTopicIds.has(t.id));
    if (pendingTopics.length === 0) {
      return [];
    }

    const topicIds = pendingTopics.map((t) => t.id);
    const topicById = new Map(pendingTopics.map((t) => [t.id, t]));

    const availabilitySlots = await this.availabilityRepo.find({
      where: {
        available: true,
        classType: AvailabilityClassType.THEORY,
        licenseCategoryId: In(licenseIds),
        theoryTopicId: In(topicIds),
      },
      relations: { instructor: true, licenseCategory: true, theoryTopic: true },
    });

    if (availabilitySlots.length === 0) {
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

    const offers: TheoryClassOfferResponseDto[] = [];
    const seen = new Set<string>();

    for (const date of dates) {
      const jsDay = date.getDay();

      for (const slot of availabilitySlots) {
        if (!this.slotMatchesCalendarDate(slot, date)) continue;

        const topic = topicById.get(slot.theoryTopicId!);
        if (!topic) continue;

        const startTime = buildSlotStart(date, slot.hour);
        const endTime = addMs(startTime, 60 * 60 * 1000);

        try {
          this.validationService.validateScheduleWindow(startTime, endTime);
        } catch {
          continue;
        }

        const sessionKey = {
          instructorId: slot.instructorId,
          theoryTopicId: topic.id,
          startTime,
        };
        const dedupeKey = `${sessionKey.instructorId}|${topic.id}|${startTime.toISOString()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const sessionSchedules = await this.scheduleRepository.findByTheorySession(sessionKey);
        const enrolledCount = sessionSchedules.length;
        const capacity = topic.sessionCapacity;
        if (enrolledCount >= capacity) continue;

        const isEnrolled = sessionSchedules.some((s) => s.studentId === studentId);
        const classroom = sessionSchedules[0]?.classroom;

        if (
          enrolledCount === 0 &&
          (await this.scheduleRepository.hasInstructorPracticeOverlap(
            slot.instructorId,
            startTime,
            endTime,
          ))
        ) {
          continue;
        }

        offers.push({
          instructorId: slot.instructorId,
          instructorName: `${slot.instructor.firstName} ${slot.instructor.lastName}`.trim(),
          theoryTopicId: topic.id,
          theoryTopicTitle: topic.title,
          licenseCategoryId: topic.licenseCategoryId,
          licenseCategoryCode: topic.licenseCategory?.code ?? slot.licenseCategory?.code ?? '',
          startAt: startTime,
          endAt: endTime,
          classroomId: classroom?.id ?? null,
          classroomName: classroom?.name ?? 'Por asignar',
          capacity,
          enrolledCount,
          spotsLeft: capacity - enrolledCount,
          students: sessionSchedules.map((s) => ({
            id: s.student.id,
            firstName: s.student.firstName,
            lastName: s.student.lastName,
            assignedAt: s.createdAt,
          })),
          isEnrolled,
        });
      }
    }

    offers.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return offers;
  }

  async joinClass(studentId: string, dto: JoinTheoryClassDto): Promise<ScheduleResponseDto> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: {
        studentId,
        licenseCategoryId: dto.licenseCategoryId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('Debes tener matrícula activa en esta licencia');
    }

    const topic = await this.topicRepo.findOne({
      where: { id: dto.theoryTopicId, licenseCategoryId: dto.licenseCategoryId, isActive: true },
    });
    if (!topic) {
      throw new NotFoundException('Tema teórico no encontrado para esta licencia');
    }

    const completed = await this.theoryProgressRepo.findOne({
      where: {
        theoryTopicId: dto.theoryTopicId,
        enrollment: {
          studentId,
          licenseCategoryId: dto.licenseCategoryId,
        },
      },
      relations: { enrollment: true },
    });
    if (completed) {
      throw new BadRequestException('Ya completaste este tema teórico');
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
          classType: AvailabilityClassType.THEORY,
          theoryTopicId: dto.theoryTopicId,
          licenseCategoryId: dto.licenseCategoryId,
        },
        {
          instructorId: dto.instructorId,
          dayOfWeek: jsDay,
          hour,
          slotDate: IsNull(),
          available: true,
          classType: AvailabilityClassType.THEORY,
          theoryTopicId: dto.theoryTopicId,
          licenseCategoryId: dto.licenseCategoryId,
        },
      ],
    });
    if (!matchingSlot) {
      throw new BadRequestException(
        'El instructor no tiene disponibilidad para este tema en ese horario',
      );
    }

    const sessionKey = {
      instructorId: dto.instructorId,
      theoryTopicId: dto.theoryTopicId,
      startTime,
    };
    const sessionSchedules = await this.scheduleRepository.findByTheorySession(sessionKey);

    if (sessionSchedules.length >= topic.sessionCapacity) {
      throw new ConflictException('Esta clase ya no tiene cupos disponibles');
    }

    if (sessionSchedules.some((s) => s.studentId === studentId)) {
      throw new ConflictException('Ya estás inscrito en esta clase');
    }

    let classroomId = sessionSchedules[0]?.classroomId ?? null;
    if (!classroomId) {
      const classrooms = await this.classroomRepository.findAvailable();
      classroomId = classrooms[0]?.id ?? null;
      if (!classroomId) {
        throw new NotFoundException('No hay aulas disponibles');
      }
    }

    const conflicts = await this.scheduleRepository.findTheoryJoinConflicts({
      startTime,
      endTime,
      instructorId: dto.instructorId,
      studentId,
      theoryTopicId: dto.theoryTopicId,
      checkClassroomId: sessionSchedules.length > 0 ? null : classroomId,
    });

    if (conflicts.length > 0) {
      throw new ConflictException('Conflicto de horario con otra clase');
    }

    const createDto: CreateScheduleDto = {
      type: ScheduleType.THEORY,
      studentId,
      instructorId: dto.instructorId,
      startTime,
      endTime,
      classroomId,
      licenseCategoryId: dto.licenseCategoryId,
      theoryTopicId: dto.theoryTopicId,
    };

    const schedule = await this.schedulingService.createTheoryClassEnrollment(createDto);
    return this.schedulingService.toResponseDto(schedule);
  }

  /** Franja con fecha fija o plantilla semanal (legacy). */
  private slotMatchesCalendarDate(slot: InstructorAvailabilitySlot, date: Date): boolean {
    if (slot.slotDate) {
      const slotDay = startOfDay(parseDateOnly(slot.slotDate));
      return slotDay.getTime() === startOfDay(date).getTime();
    }
    return slot.dayOfWeek === date.getDay();
  }

  private async completedTopicIdsForStudent(
    studentId: string,
    licenseCategoryIds: string[],
  ): Promise<Set<string>> {
    const rows = await this.theoryProgressRepo
      .createQueryBuilder('p')
      .innerJoin('p.enrollment', 'enrollment')
      .where('enrollment.student_id = :studentId', { studentId })
      .andWhere('enrollment.license_category_id IN (:...licenseCategoryIds)', {
        licenseCategoryIds,
      })
      .getMany();
    return new Set(rows.map((r) => r.theoryTopicId));
  }

}
