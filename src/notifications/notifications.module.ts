import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Schedule } from '../scheduling/entity/schedule.entity';
import { ScheduleReminderCron } from './cron/schedule-reminder.cron';
import { Notification } from './entity/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './repository/notification.repository';
import { EmailService } from './service/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Schedule])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRepository,
    EmailService,
    ScheduleReminderCron,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
