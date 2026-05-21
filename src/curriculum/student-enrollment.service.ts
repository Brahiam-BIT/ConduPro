import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Schedule } from '../scheduling/entity/schedule.entity';
import { ScheduleStatus } from '../scheduling/enums/schedule-status.enum';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { UsersService } from '../users/users.service';
import {
  EnrollmentProgressDto,
  TheoryTopicProgressItemDto,
} from './dto/enrollment-progress.dto';
import { EnrollmentStatus } from './enums/enrollment-status.enum';
import { LicenseCategory } from './entity/license-category.entity';
import { StudentLicenseEnrollment } from './entity/student-license-enrollment.entity';
import { StudentTheoryTopicProgress } from './entity/student-theory-topic-progress.entity';
import { TheoryTopic } from './entity/theory-topic.entity';
import { CurriculumService } from './curriculum.service';

@Injectable()
export class StudentEnrollmentService {
  constructor(
    @InjectRepository(StudentLicenseEnrollment)
    private readonly enrollmentRepo: Repository<StudentLicenseEnrollment>,
    @InjectRepository(StudentTheoryTopicProgress)
    private readonly theoryProgressRepo: Repository<StudentTheoryTopicProgress>,
    @InjectRepository(LicenseCategory)
    private readonly categoryRepo: Repository<LicenseCategory>,
    @InjectRepository(TheoryTopic)
    private readonly topicRepo: Repository<TheoryTopic>,
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    private readonly usersService: UsersService,
    private readonly curriculumService: CurriculumService,
  ) {}

  async enroll(studentId: string, licenseCategoryId: string): Promise<EnrollmentProgressDto> {
    const student = await this.usersService.findByIdOrFail(studentId);
    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('Solo estudiantes pueden matricularse en una licencia');
    }

    await this.curriculumService.findCategory(licenseCategoryId);

    const existingActive = await this.enrollmentRepo.findOne({
      where: { studentId, licenseCategoryId, status: EnrollmentStatus.ACTIVE },
    });
    if (existingActive) {
      throw new ConflictException(
        'Este estudiante ya tiene una matrícula activa en esta licencia',
      );
    }

    const existingCompleted = await this.enrollmentRepo.findOne({
      where: { studentId, licenseCategoryId, status: EnrollmentStatus.COMPLETED },
    });
    if (existingCompleted) {
      throw new ConflictException('Este estudiante ya completó esta licencia');
    }

    const enrollment = this.enrollmentRepo.create({
      studentId,
      licenseCategoryId,
      status: EnrollmentStatus.ACTIVE,
    });
    const saved = await this.enrollmentRepo.save(enrollment);
    return this.buildProgressDto(saved.id);
  }

  async listForStudent(studentId: string, currentUser: JwtPayload): Promise<EnrollmentProgressDto[]> {
    this.assertStudentAccess(studentId, currentUser);
    const enrollments = await this.enrollmentRepo.find({
      where: {
        studentId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      order: { enrolledAt: 'DESC' },
    });
    return Promise.all(enrollments.map((e) => this.buildProgressDto(e.id)));
  }

  async listForAdmin(studentId?: string): Promise<EnrollmentProgressDto[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: {
        ...(studentId ? { studentId } : {}),
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
      order: { enrolledAt: 'DESC' },
      take: 100,
    });
    return Promise.all(enrollments.map((e) => this.buildProgressDto(e.id)));
  }

  async getProgress(
    enrollmentId: string,
    currentUser: JwtPayload,
  ): Promise<EnrollmentProgressDto> {
    const enrollment = await this.getEnrollmentOrFail(enrollmentId);
    this.assertStudentAccess(enrollment.studentId, currentUser);
    return this.buildProgressDto(enrollmentId);
  }

  async cancelEnrollment(enrollmentId: string, currentUser: JwtPayload): Promise<void> {
    const enrollment = await this.getEnrollmentOrFail(enrollmentId);
    this.assertStudentAccess(enrollment.studentId, currentUser);
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Solo se pueden cancelar matrículas activas');
    }
    enrollment.status = EnrollmentStatus.CANCELLED;
    await this.enrollmentRepo.save(enrollment);
  }

  /** @deprecated Tras cancelar, el estudiante puede volver a matricularse; siempre devuelve []. */
  async listBlockedCategoryIdsForStudent(_studentId: string): Promise<string[]> {
    return [];
  }

  async findActiveEnrollment(
    studentId: string,
    licenseCategoryId: string,
  ): Promise<StudentLicenseEnrollment | null> {
    return this.enrollmentRepo.findOne({
      where: { studentId, licenseCategoryId, status: EnrollmentStatus.ACTIVE },
    });
  }

  async resolvePrimaryActiveEnrollment(
    studentId: string,
    licenseCategoryId?: string,
  ): Promise<StudentLicenseEnrollment | null> {
    if (licenseCategoryId) {
      return this.findActiveEnrollment(studentId, licenseCategoryId);
    }
    return this.enrollmentRepo.findOne({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
      order: { enrolledAt: 'DESC' },
    });
  }

  async handleScheduleStatusChange(schedule: Schedule, newStatus: ScheduleStatus): Promise<void> {
    if (newStatus !== ScheduleStatus.COMPLETED) return;
    if (!schedule.licenseCategoryId) return;

    const enrollment = await this.findActiveEnrollment(
      schedule.studentId,
      schedule.licenseCategoryId,
    );
    if (!enrollment) return;

    if (schedule.type === ScheduleType.THEORY && schedule.theoryTopicId) {
      const existing = await this.theoryProgressRepo.findOne({
        where: {
          enrollmentId: enrollment.id,
          theoryTopicId: schedule.theoryTopicId,
        },
      });
      if (!existing) {
        await this.theoryProgressRepo.save(
          this.theoryProgressRepo.create({
            enrollmentId: enrollment.id,
            theoryTopicId: schedule.theoryTopicId,
            scheduleId: schedule.id,
          }),
        );
      }
    }

    await this.tryCompleteEnrollment(enrollment.id);
  }

  private async tryCompleteEnrollment(enrollmentId: string): Promise<void> {
    const progress = await this.buildProgressDto(enrollmentId);
    if (!progress.isLicenseComplete) return;

    const enrollment = await this.getEnrollmentOrFail(enrollmentId);
    if (enrollment.status !== EnrollmentStatus.ACTIVE) return;

    enrollment.status = EnrollmentStatus.COMPLETED;
    enrollment.completedAt = new Date();
    await this.enrollmentRepo.save(enrollment);
  }

  private async buildProgressDto(enrollmentId: string): Promise<EnrollmentProgressDto> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId },
      relations: { licenseCategory: { theoryTopics: true }, theoryProgress: true },
    });
    if (!enrollment) {
      throw new NotFoundException('Matrícula no encontrada');
    }

    const category = enrollment.licenseCategory;
    const activeTopics = (category.theoryTopics ?? []).filter((t) => t.isActive);
    const requiresAll = category.requiresAllTheoryTopics;
    const theoryRequired = requiresAll ? activeTopics.length : activeTopics.length;

    const completedTopicIds = new Set(
      (enrollment.theoryProgress ?? []).map((p) => p.theoryTopicId),
    );

    const theoryTopics: TheoryTopicProgressItemDto[] = activeTopics
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .map((topic) => {
        const progress = (enrollment.theoryProgress ?? []).find(
          (p) => p.theoryTopicId === topic.id,
        );
        return {
          id: topic.id,
          title: topic.title,
          sortOrder: topic.sortOrder,
          completed: completedTopicIds.has(topic.id),
          completedAt: progress?.completedAt ?? null,
        };
      });

    const theoryCompleted = theoryTopics.filter((t) => t.completed).length;
    const practiceRequired = category.requiredPracticeSessions;
    const practiceCompleted = await this.countCompletedPractice(
      enrollment.studentId,
      category.id,
      enrollment.enrolledAt,
    );

    const theoryPercent =
      theoryRequired > 0 ? Math.min(100, Math.round((theoryCompleted / theoryRequired) * 100)) : 100;
    const practicePercent =
      practiceRequired > 0
        ? Math.min(100, Math.round((practiceCompleted / practiceRequired) * 100))
        : practiceRequired === 0
          ? 100
          : 0;

    const theoryDone = theoryRequired === 0 || theoryCompleted >= theoryRequired;
    const practiceDone = practiceRequired === 0 || practiceCompleted >= practiceRequired;
    const isLicenseComplete = theoryDone && practiceDone;
    const overallPercent = Math.round((theoryPercent + practicePercent) / 2);

    const categoryDto = await this.curriculumService.findCategory(category.id);

    return {
      enrollmentId: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      licenseCategory: categoryDto,
      theoryRequired,
      theoryCompleted,
      practiceRequired,
      practiceCompleted,
      theoryPercent,
      practicePercent,
      overallPercent,
      isLicenseComplete,
      theoryTopics,
    };
  }

  private async countCompletedPractice(
    studentId: string,
    licenseCategoryId: string,
    enrolledAt: Date,
  ): Promise<number> {
    return this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.student_id = :studentId', { studentId })
      .andWhere('s.type = :type', { type: ScheduleType.PRACTICE })
      .andWhere('s.status = :status', { status: ScheduleStatus.COMPLETED })
      .andWhere('s.deleted_at IS NULL')
      .andWhere('s.start_time >= :enrolledAt', { enrolledAt })
      .andWhere('s.license_category_id = :licenseCategoryId', { licenseCategoryId })
      .getCount();
  }

  private async getEnrollmentOrFail(id: string): Promise<StudentLicenseEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id } });
    if (!enrollment) {
      throw new NotFoundException('Matrícula no encontrada');
    }
    return enrollment;
  }

  private assertStudentAccess(studentId: string, currentUser: JwtPayload): void {
    if (currentUser.role === UserRole.ADMIN) return;
    if (currentUser.role === UserRole.STUDENT && currentUser.sub === studentId) return;
    throw new ForbiddenException('Sin permisos para esta matrícula');
  }
}
