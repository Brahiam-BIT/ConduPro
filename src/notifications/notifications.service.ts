import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Schedule } from '../scheduling/entity/schedule.entity';
import { ScheduleStatus } from '../scheduling/enums/schedule-status.enum';
import { ScheduleType } from '../scheduling/enums/schedule-type.enum';
import { endOfDay, startOfDay } from '../scheduling/utils/scheduling-time.util';
import { User } from '../users/entity/user.entity';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationRepository } from './repository/notification.repository';
import { EmailService } from './service/email.service';
import {
  buildCancellationEmail,
  buildConfirmationEmail,
  buildReminderEmail,
  type ScheduleEmailContext,
} from './templates/email-templates';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly emailService: EmailService,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async findMine(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [notifications, total] = await this.notificationRepository.findByUser({
      userId,
      unreadOnly: query.unreadOnly,
      page,
      limit,
    });

    return {
      data: notifications.map((n) => this.toResponseDto(n)),
      total,
      page,
      limit,
    };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponseDto> {
    const existing = await this.notificationRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundException('Notificación no encontrada');
    }

    await this.notificationRepository.markAsRead(id, userId);
    const updated = await this.notificationRepository.findByIdAndUser(id, userId);
    return this.toResponseDto(updated!);
  }

  async notifyScheduleConfirmed(schedule: Schedule): Promise<void> {
    const loaded = await this.loadScheduleWithRelations(schedule.id);
    await Promise.all([
      this.deliverToUser(loaded, loaded.student, NotificationType.SCHEDULE_CONFIRMED, () =>
        buildConfirmationEmail(this.buildEmailContext(loaded, loaded.student)),
      ),
      this.deliverToUser(loaded, loaded.instructor, NotificationType.SCHEDULE_CONFIRMED, () =>
        buildConfirmationEmail(this.buildEmailContext(loaded, loaded.instructor)),
      ),
    ]);
  }

  async notifyScheduleCancelled(schedule: Schedule): Promise<void> {
    const loaded = await this.loadScheduleWithRelations(schedule.id);
    await Promise.all([
      this.deliverToUser(loaded, loaded.student, NotificationType.SCHEDULE_CANCELLED, () =>
        buildCancellationEmail(this.buildEmailContext(loaded, loaded.student)),
      ),
      this.deliverToUser(loaded, loaded.instructor, NotificationType.SCHEDULE_CANCELLED, () =>
        buildCancellationEmail(this.buildEmailContext(loaded, loaded.instructor)),
      ),
    ]);
  }

  async sendTomorrowReminders(): Promise<number> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayStart = startOfDay(tomorrow);
    const dayEnd = endOfDay(tomorrow);

    const schedules = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.student', 'student')
      .leftJoinAndSelect('schedule.instructor', 'instructor')
      .leftJoinAndSelect('schedule.vehicle', 'vehicle')
      .leftJoinAndSelect('schedule.classroom', 'classroom')
      .where('schedule.status = :status', { status: ScheduleStatus.CONFIRMED })
      .andWhere('schedule.deleted_at IS NULL')
      .andWhere('schedule.start_time BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd })
      .getMany();

    for (const schedule of schedules) {
      await Promise.all([
        this.deliverToUser(schedule, schedule.student, NotificationType.SCHEDULE_REMINDER, () =>
          buildReminderEmail(this.buildEmailContext(schedule, schedule.student)),
        ),
        this.deliverToUser(
          schedule,
          schedule.instructor,
          NotificationType.SCHEDULE_REMINDER,
          () => buildReminderEmail(this.buildEmailContext(schedule, schedule.instructor)),
        ),
      ]);
    }

    return schedules.length;
  }

  private async deliverToUser(
    schedule: Schedule,
    user: User,
    type: NotificationType,
    buildContent: () => { subject: string; html: string; text: string },
  ): Promise<void> {
    const content = buildContent();
    const titles: Record<NotificationType, string> = {
      [NotificationType.SCHEDULE_CONFIRMED]: 'Clase confirmada',
      [NotificationType.SCHEDULE_CANCELLED]: 'Clase cancelada',
      [NotificationType.SCHEDULE_REMINDER]: 'Recordatorio de clase',
    };

    const notification = this.notificationRepository.create({
      userId: user.id,
      type,
      title: titles[type],
      message: content.text,
      scheduleId: schedule.id,
      isRead: false,
    });
    await this.notificationRepository.save(notification);

    await this.emailService.send({ to: user.email, content });
  }

  private async loadScheduleWithRelations(id: string): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['student', 'instructor', 'vehicle', 'classroom'],
    });

    if (!schedule) {
      throw new NotFoundException('Clase no encontrada para notificación');
    }

    return schedule;
  }

  private buildEmailContext(schedule: Schedule, recipient: User): ScheduleEmailContext {
    const studentName = `${schedule.student.firstName} ${schedule.student.lastName}`;
    const instructorName = `${schedule.instructor.firstName} ${schedule.instructor.lastName}`;

    let locationDetail: string | undefined;
    if (schedule.type === ScheduleType.PRACTICE && schedule.vehicle) {
      locationDetail = `Vehículo: ${schedule.vehicle.brand} ${schedule.vehicle.model} (${schedule.vehicle.plate})`;
    }
    if (schedule.type === ScheduleType.THEORY && schedule.classroom) {
      locationDetail = `Aula: ${schedule.classroom.name}`;
    }

    return {
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      studentName,
      instructorName,
      type: schedule.type,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      locationDetail,
    };
  }

  private toResponseDto(notification: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    scheduleId: string | null;
    isRead: boolean;
    createdAt: Date;
  }): NotificationResponseDto {
    return plainToInstance(NotificationResponseDto, notification, {
      excludeExtraneousValues: true,
    });
  }
}
